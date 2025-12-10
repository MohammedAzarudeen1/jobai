import nodemailer from 'nodemailer'
import type { UserSettings } from './storage'

export async function sendEmail(
  settings: UserSettings,
  to: string,
  subject: string,
  body: string,
  attachments?: Array<{ filename: string; path?: string; content?: Buffer }>
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPassword,
    },
  })

  const mailOptions = {
    from: `"${settings.fromName}" <${settings.fromEmail}>`,
    to,
    subject,
    html: body.replace(/\n/g, '<br>'),
    attachments: attachments?.map(att => ({
      filename: att.filename,
      ...(att.path ? { path: att.path } : {}),
      ...(att.content ? { content: att.content } : {}),
    })) || [],
  }

  await transporter.sendMail(mailOptions)
}

