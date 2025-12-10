import { NextRequest, NextResponse } from 'next/server'
import { getSettings } from '@/lib/storage'
import { generateCoverLetter } from '@/lib/ai'
import { enhanceResumePDF } from '@/lib/pdf'

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

    // Step 1: Generate cover letter using AI
    console.log('Generating cover letter for preview...')
    const coverLetter = await generateCoverLetter(jobDescription)

    // Step 2: Enhance resume PDF and upload to Cloudinary
    console.log('Enhancing resume for preview...')
    const enhancedResume = await enhanceResumePDF(jobDescription)

    const emailSubject = subject || `Application for Position - ${new Date().toLocaleDateString()}`

    return NextResponse.json({
      success: true,
      coverLetter,
      enhancedResumeUrl: enhancedResume.url,
      enhancedResumePublicId: enhancedResume.publicId,
      emailSubject,
    })
  } catch (error: any) {
    console.error('Preview job error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate preview' },
      { status: 500 }
    )
  }
}

