import { NextRequest, NextResponse } from 'next/server'
import { getSettings } from '@/lib/storage'
import { generateCoverLetter } from '@/lib/ai'
import { enhanceResumePDF } from '@/lib/pdf'
import { sendEmail } from '@/lib/email'
import { deleteFromCloudinary } from '@/lib/cloudinary'

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

    if (!finalCoverLetter) {
      // Step 1: Generate cover letter using AI
      console.log('Generating cover letter...')
      finalCoverLetter = await generateCoverLetter(jobDescription)
    }

    if (!finalResumeUrl) {
      // Step 2: Enhance resume PDF and upload to Cloudinary
      console.log('Enhancing resume...')
      const enhancedResume = await enhanceResumePDF(jobDescription)
      finalResumeUrl = enhancedResume.url
    }

    // Step 3: Download enhanced resume for email attachment
    const resumeResponse = await fetch(finalResumeUrl)
    if (!resumeResponse.ok) {
      throw new Error('Failed to fetch enhanced resume')
    }
    const resumeBuffer = await resumeResponse.arrayBuffer()

    // Step 4: Send email with enhanced resume
    console.log('Sending email...')
    const emailSubject = subject || `Application for Position - ${new Date().toLocaleDateString()}`
    
    await sendEmail(
      settings,
      recruiterEmail,
      emailSubject,
      finalCoverLetter,
      [
        {
          filename: 'resume.pdf',
          content: Buffer.from(resumeBuffer),
        },
      ]
    )

    // Clean up enhanced resume from Cloudinary after sending (optional)
    if (enhancedResumePublicId) {
      // await deleteFromCloudinary(enhancedResumePublicId)
    }

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

