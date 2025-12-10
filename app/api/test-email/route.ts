import { NextRequest, NextResponse } from 'next/server'
import { getSettings } from '@/lib/storage'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testEmail } = body

    if (!testEmail) {
      return NextResponse.json(
        { success: false, error: 'Test email address is required' },
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

    // Send test email
    const testSubject = 'JobAI - Test Email'
    const testBody = `This is a test email from JobAI.

If you received this email, your SMTP settings are configured correctly!

Email Settings:
- SMTP Host: ${settings.smtpHost}
- SMTP Port: ${settings.smtpPort}
- From Email: ${settings.fromEmail}
- From Name: ${settings.fromName}

You can now use JobAI to send job applications.

Best regards,
JobAI Team`

    try {
      await sendEmail(
        settings,
        testEmail,
        testSubject,
        testBody
      )

      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${testEmail}! Please check your inbox.`,
      })
    } catch (emailError: any) {
      console.error('Email sending error:', emailError)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to send test email: ${emailError.message || 'Unknown error'}`,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send test email' },
      { status: 500 }
    )
  }
}

