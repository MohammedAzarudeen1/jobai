import { NextRequest, NextResponse } from 'next/server'
import { getSettings, cacheResumeText } from '@/lib/storage'
import { generateCoverLetterAndSubject } from '@/lib/ai'
import { extractTextFromPDF } from '@/lib/pdf'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobDescription, subject } = body

    if (!jobDescription) {
      return NextResponse.json(
        { success: false, error: 'Job description is required' },
        { status: 400 }
      )
    }

    // Get user settings
    const settings = await getSettings()
    if (!settings || !settings.smtpHost) {
      return NextResponse.json(
        { success: false, error: 'Email settings not configured' },
        { status: 400 }
      )
    }

    if (!settings.resumeUrl) {
      return NextResponse.json(
        { success: false, error: 'Resume not found. Please upload a resume first.' },
        { status: 400 }
      )
    }

    // Step 0: Extract Text from Resume (Hybrid: Gemini Vision First) - WITH SMART CACHING
    console.log('Checking for cached resume text...')
    let resumeText = ''
    
    // Check if we have valid cached resume text (will be cleared when resume is updated in settings)
    if (settings.resumeText && settings.resumeText.length > 50) {
      console.log('✅ Using cached resume text - no AI reading needed!')
      console.log(`   Cache size: ${settings.resumeText.length} characters`)
      console.log(`   Cached at: ${settings.resumeTextCachedAt?.toLocaleString()}`)
      resumeText = settings.resumeText
    } else {
      // Cache miss - need to extract resume text (first preview OR new resume uploaded)
      console.log('📖 No valid cached resume. Extracting from resume...')
      try {
        // 1. Try Gemini Vision (Best for accuracy/scanned)
        if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
          // Dynamic import to avoid circular dep issues if any, or just valid import
          const { parseResumeWithGemini } = await import('@/lib/ai')
          console.log('🤖 Sending resume to Gemini Vision...')
          resumeText = await parseResumeWithGemini(settings.resumeUrl)
        }

        // 2. Fallback to Local Parser if Gemini returned empty or failed
        if (!resumeText || resumeText.length < 50) {
          if (resumeText === "") console.log("⚠️ Gemini extraction skipped or empty. Using local parser.")
          console.log('📄 Parsing resume with local PDF parser...')
          resumeText = await extractTextFromPDF(settings.resumeUrl)
        }

        console.log(`✅ Extracted ${resumeText.length} characters from resume.`)
        
        // Cache the resume text for future previews
        await cacheResumeText(resumeText)
        console.log('💾 Cached resume text for faster future previews')
      } catch (e) {
        console.error('❌ Failed to extract resume text:', e)
        // Proceed without text (fallback generic letter)
      }
    }

    // Step 1: Generate cover letter AND subject in ONE AI call (Optimized!)
    console.log('Generating cover letter and subject in single AI call for preview...')
    const { coverLetter, subject: generatedSubject } = await generateCoverLetterAndSubject(jobDescription, resumeText)

    const emailSubject = subject || generatedSubject

    return NextResponse.json({
      success: true,
      coverLetter,
      emailSubject,
      resumeTextLength: resumeText.length // Debug info
    })
  } catch (error: any) {
    console.error('Preview job error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate preview' },
      { status: 500 }
    )
  }
}

