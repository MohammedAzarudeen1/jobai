import connectDB from './mongodb'
import UserSettings, { IUserSettings } from './models/UserSettings'
import { encrypt, decrypt, isEncrypted } from './encryption'

export interface UserSettings {
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  fromEmail: string
  fromName: string
  resumeUrl?: string
  resumePublicId?: string
}

export async function getSettings(): Promise<UserSettings | null> {
  try {
    await connectDB()
    const settings = await UserSettings.findOne({ userId: 'default' })
    
    if (!settings) {
      return null
    }

    // Decrypt the password
    let decryptedPassword = ''
    if (settings.smtpPassword) {
      decryptedPassword = decrypt(settings.smtpPassword)
      // If decryption failed (empty string returned) and it was encrypted, 
      // the encryption key likely changed - user needs to re-enter password
      if (!decryptedPassword && isEncrypted(settings.smtpPassword)) {
        console.warn('Password decryption failed - encryption key may have changed. User needs to re-enter password.')
      }
    }

    return {
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser,
      smtpPassword: decryptedPassword,
      fromEmail: settings.fromEmail,
      fromName: settings.fromName,
      resumeUrl: settings.resumeUrl,
      resumePublicId: settings.resumePublicId,
    }
  } catch (error) {
    console.error('Error reading settings:', error)
    return null
  }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  try {
    await connectDB()
    
    // Get existing settings to check if password is already encrypted
    const existing = await UserSettings.findOne({ userId: 'default' })
    
    // Only encrypt if password is provided and not already encrypted
    let encryptedPassword = ''
    if (settings.smtpPassword) {
      // Check if it's already in encrypted format
      if (isEncrypted(settings.smtpPassword)) {
        // Already encrypted, use as-is
        encryptedPassword = settings.smtpPassword
      } else {
        // Encrypt the new password
        encryptedPassword = encrypt(settings.smtpPassword)
      }
    } else if (existing?.smtpPassword) {
      // No new password provided, keep existing encrypted password
      encryptedPassword = existing.smtpPassword
    }
    
    await UserSettings.findOneAndUpdate(
      { userId: 'default' },
      {
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpPassword: encryptedPassword,
        fromEmail: settings.fromEmail,
        fromName: settings.fromName,
        resumeUrl: settings.resumeUrl,
        resumePublicId: settings.resumePublicId,
      },
      { upsert: true, new: true }
    )
  } catch (error) {
    console.error('Error saving settings:', error)
    throw error
  }
}

export async function getResumeUrl(): Promise<string | null> {
  const settings = await getSettings()
  return settings?.resumeUrl || null
}

