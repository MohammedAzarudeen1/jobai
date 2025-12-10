import { NextRequest, NextResponse } from 'next/server'
import { getSettings, saveSettings, type UserSettings } from '@/lib/storage'

export async function GET() {
  try {
    const settings = await getSettings()
    // Don't return the password in the response for security
    if (settings) {
      const { smtpPassword, ...safeSettings } = settings
      return NextResponse.json({ success: true, settings: safeSettings })
    }
    return NextResponse.json({ success: true, settings: null })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to load settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Get existing settings to preserve resume URL
    const existingSettings = await getSettings()
    
    const settings: UserSettings = {
      smtpHost: body.smtpHost,
      smtpPort: parseInt(body.smtpPort, 10),
      smtpUser: body.smtpUser,
      // Only update password if a new one is provided
      // If empty, saveSettings will preserve the existing encrypted password
      smtpPassword: body.smtpPassword || '',
      fromEmail: body.fromEmail,
      fromName: body.fromName,
      // Preserve existing resume URL if not provided
      resumeUrl: body.resumeUrl || existingSettings?.resumeUrl,
      resumePublicId: body.resumePublicId || existingSettings?.resumePublicId,
    }

    await saveSettings(settings)

    // Reload settings to get the updated values
    const updatedSettings = await getSettings()
    
    // Don't return password in response
    if (updatedSettings) {
      const { smtpPassword, ...safeSettings } = updatedSettings
      return NextResponse.json({ success: true, settings: safeSettings })
    }
    
    return NextResponse.json({ success: true, settings: null })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save settings' },
      { status: 500 }
    )
  }
}

