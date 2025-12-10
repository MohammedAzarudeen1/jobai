import { NextRequest, NextResponse } from 'next/server'
import { getSettings, saveSettings } from '@/lib/storage'
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('resume') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'Only PDF files are allowed' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Cloudinary
    const { url, publicId } = await uploadToCloudinary(buffer, 'jobai-resumes')

    // Get existing settings
    const existingSettings = await getSettings()
    
    // Delete old resume from Cloudinary if exists
    if (existingSettings?.resumePublicId) {
      try {
        await deleteFromCloudinary(existingSettings.resumePublicId)
      } catch (error) {
        console.error('Error deleting old resume:', error)
        // Continue even if deletion fails
      }
    }

    // Update settings with new resume URL
    const settings = existingSettings || {
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      fromEmail: '',
      fromName: '',
    }
    
    settings.resumeUrl = url
    settings.resumePublicId = publicId
    await saveSettings(settings)

    return NextResponse.json({
      success: true,
      message: 'Resume uploaded successfully',
      resumeUrl: url,
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload resume' },
      { status: 500 }
    )
  }
}

