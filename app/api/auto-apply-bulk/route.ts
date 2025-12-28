import { NextRequest, NextResponse } from 'next/server'
import { getSettings, getResumeUrl } from '@/lib/storage'
import { extractTextFromPDF } from '@/lib/pdf'
import { analyzeJobMatch, generateCoverLetterAndSubject } from '@/lib/ai'
import { enhanceResumePDF } from '@/lib/pdf'
import { sendEmail } from '@/lib/email'

interface BulkJob {
  id: string
  title: string
  description: string
  email: string
  url: string
  company?: string
}

interface ApplicationResult {
  jobId: string
  success: boolean
  error?: string
  matchScore?: number
  emailSent?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { 
      jobs, 
      minMatchScore = 60, 
      maxApplications = 10,
      delayBetweenApplications = 3000,
      customMessage = ''
    } = await request.json()

    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Jobs array is required'
      }, { status: 400 })
    }

    // Get user settings and resume
    const settings = await getSettings()
    if (!settings?.smtpHost) {
      return NextResponse.json({
        success: false,
        error: 'Email settings not configured'
      }, { status: 400 })
    }

    const resumeUrl = await getResumeUrl()
    if (!resumeUrl) {
      return NextResponse.json({
        success: false,
        error: 'Resume not found'
      }, { status: 400 })
    }

    // Extract resume text once for all applications
    console.log('📄 Extracting resume text for bulk analysis...')
    const resumeText = await extractTextFromPDF(resumeUrl)
    if (!resumeText) {
      return NextResponse.json({
        success: false,
        error: 'Failed to extract resume text'
      }, { status: 500 })
    }

    const results: ApplicationResult[] = []
    let applicationsProcessed = 0
    let successfulApplications = 0

    console.log(`🚀 Starting bulk application process for ${jobs.length} jobs`)
    console.log(`📊 Filters: Min match score: ${minMatchScore}%, Max applications: ${maxApplications}`)

    for (const job of jobs) {
      if (applicationsProcessed >= maxApplications) {
        console.log(`⏹️ Reached maximum applications limit (${maxApplications})`)
        break
      }

      try {
        console.log(`\n🔍 Processing job ${applicationsProcessed + 1}/${Math.min(jobs.length, maxApplications)}: ${job.title}`)

        // Step 1: Analyze job match
        console.log('  📊 Analyzing job match...')
        const matchResult = await analyzeJobMatch(resumeText, job.description)
        
        if (matchResult.score < minMatchScore) {
          console.log(`  ❌ Skipping - Match score ${matchResult.score}% below threshold ${minMatchScore}%`)
          results.push({
            jobId: job.id,
            success: false,
            error: `Match score ${matchResult.score}% below threshold`,
            matchScore: matchResult.score
          })
          continue
        }

        console.log(`  ✅ Good match - Score: ${matchResult.score}%`)

        // Step 2: Generate personalized cover letter and subject
        console.log('  ✍️ Generating personalized application...')
        const { coverLetter, subject } = await generateCoverLetterAndSubject(
          job.description, 
          resumeText
        )

        // Add custom message if provided
        const finalCoverLetter = customMessage 
          ? `${customMessage}\n\n${coverLetter}`
          : coverLetter

        // Step 3: Enhance resume for this specific job
        console.log('  📝 Enhancing resume...')
        let enhancedResumeUrl = resumeUrl
        try {
          const enhancedResume = await enhanceResumePDF(job.description)
          enhancedResumeUrl = enhancedResume.url
        } catch (e) {
          console.log('  ⚠️ Resume enhancement failed, using original')
        }

        // Step 4: Send application email
        console.log(`  📧 Sending application to ${job.email}...`)
        await sendEmail(
          settings,
          job.email,
          subject,
          finalCoverLetter,
          [
            {
              filename: 'resume.pdf',
              path: enhancedResumeUrl,
            },
          ]
        )

        console.log('  ✅ Application sent successfully!')
        
        results.push({
          jobId: job.id,
          success: true,
          matchScore: matchResult.score,
          emailSent: true
        })

        successfulApplications++
        applicationsProcessed++

        // Delay between applications to avoid spam detection
        if (applicationsProcessed < Math.min(jobs.length, maxApplications)) {
          console.log(`  ⏱️ Waiting ${delayBetweenApplications}ms before next application...`)
          await new Promise(resolve => setTimeout(resolve, delayBetweenApplications))
        }

      } catch (error: any) {
        console.error(`  ❌ Failed to process job ${job.id}:`, error.message)
        results.push({
          jobId: job.id,
          success: false,
          error: error.message,
          emailSent: false
        })
        applicationsProcessed++
      }
    }

    console.log(`\n🎉 Bulk application completed!`)
    console.log(`📊 Results: ${successfulApplications}/${applicationsProcessed} successful applications`)

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${successfulApplications} applications out of ${applicationsProcessed} processed`,
      results,
      summary: {
        totalProcessed: applicationsProcessed,
        successful: successfulApplications,
        failed: applicationsProcessed - successfulApplications,
        skipped: jobs.length - applicationsProcessed
      }
    })

  } catch (error: any) {
    console.error('Bulk application error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Bulk application failed'
    }, { status: 500 })
  }
}