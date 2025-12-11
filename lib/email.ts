import nodemailer from 'nodemailer'
import type { UserSettings } from './storage'
import { fetchFromCloudinary } from './cloudinary'

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

  // Process attachments: fetch URLs as buffers, keep local paths as-is
  const processedAttachments = await Promise.all(
    (attachments || []).map(async (att) => {
      if (att.path && att.path.startsWith('http')) {
        // URL: fetch and convert to buffer
        try {
          console.log(`📎 Fetching attachment from URL: ${att.path}`)
          let buffer: Buffer
          
          if (att.path.includes('cloudinary')) {
            // Use authenticated Cloudinary fetch
            buffer = await fetchFromCloudinary(att.path)
          } else {
            // Generic HTTP fetch
            const response = await fetch(att.path)
            if (!response.ok) {
              throw new Error(`Failed to fetch attachment: ${response.status} ${response.statusText}`)
            }
            buffer = Buffer.from(await response.arrayBuffer())
          }
          
          return {
            filename: att.filename,
            content: buffer,
          }
        } catch (err) {
          console.error(`❌ Failed to fetch attachment from ${att.path}:`, err)
          throw err
        }
      } else {
        // Local file or buffer: use as-is
        return {
          filename: att.filename,
          ...(att.path ? { path: att.path } : {}),
          ...(att.content ? { content: att.content } : {}),
        }
      }
    })
  )

  const mailOptions = {
    from: `"${settings.fromName}" <${settings.fromEmail}>`,
    to,
    subject,
    html: body.replace(/\n/g, '<br>'),
    attachments: processedAttachments,
  }

  await transporter.sendMail(mailOptions)
}

