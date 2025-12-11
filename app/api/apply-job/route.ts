import { NextRequest, NextResponse } from 'next/server'
import { getSettings } from '@/lib/storage'
import { generateCoverLetterAndSubject } from '@/lib/ai'
import { enhanceResumePDF } from '@/lib/pdf'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobDescription, recruiterEmail, subject, enhancedResumeUrl, enhancedResumePublicId, coverLetter } = body

    if (!jobDescription || !recruiterEmail) {
      return NextResponse.json(
        { success: false, error: 'Job description and recruiter email are required' },
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

    // Use provided cover letter and resume URL if available (from preview), otherwise generate
    let finalCoverLetter = coverLetter
    let finalResumeUrl = enhancedResumeUrl
    let emailSubject = subject

    if (!finalCoverLetter || !emailSubject) {
      // OPTIMIZED: Generate both in ONE AI call if either is missing
      console.log('Generating cover letter and subject in single AI call...')
      const { coverLetter: generatedLetter, subject: generatedSubject } = await generateCoverLetterAndSubject(jobDescription)
      if (!finalCoverLetter) finalCoverLetter = generatedLetter
      if (!emailSubject) emailSubject = generatedSubject
    }

    if (!finalResumeUrl) {
      // Step 2: Enhance resume PDF and upload to Cloudinary (if not already done)
      console.log('Enhancing resume...')
      try {
        const enhancedResume = await enhanceResumePDF(jobDescription)
        finalResumeUrl = enhancedResume.url
      } catch (e) {
        console.error("Resume enhancement failed, using original.", e)
        finalResumeUrl = settings.resumeUrl
      }
    }

    // Step 3: Send email with enhanced resume URL (Stream directly)
    console.log(`Sending email with resume from: ${finalResumeUrl}`)
    await sendEmail(
      settings,
      recruiterEmail,
      emailSubject,
      finalCoverLetter,
      [
        {
          filename: 'resume.pdf',
          path: finalResumeUrl,
        },
      ]
    )

    return NextResponse.json({
      success: true,
      message: 'Application sent successfully',
    })
  } catch (error: any) {
    console.error('Apply job error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send application' },
      { status: 500 }
    )
  }
}
