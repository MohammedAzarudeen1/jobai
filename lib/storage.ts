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
  resumeText?: string
  resumeTextCachedAt?: Date
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
      resumeText: settings.resumeText,
      resumeTextCachedAt: settings.resumeTextCachedAt,
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
    
    // Check if resume URL changed (new resume uploaded)
    const resumeUrlChanged = existing?.resumeUrl !== settings.resumeUrl
    
    // If resume changed, clear the cache so it will be re-parsed on next preview
    const updateData: any = {
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser,
      smtpPassword: encryptedPassword,
      fromEmail: settings.fromEmail,
      fromName: settings.fromName,
      resumeUrl: settings.resumeUrl,
      resumePublicId: settings.resumePublicId,
    }
    
    if (resumeUrlChanged) {
      console.log('📝 Resume URL changed - clearing cached resume text')
      updateData.resumeText = ''  // Clear cache
      updateData.resumeTextCachedAt = null  // Clear timestamp
    }
    
    await UserSettings.findOneAndUpdate(
      { userId: 'default' },
      updateData,
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

export async function cacheResumeText(resumeText: string): Promise<void> {
  try {
    await connectDB()
    await UserSettings.findOneAndUpdate(
      { userId: 'default' },
      {
        resumeText: resumeText,
        resumeTextCachedAt: new Date(),
      },
      { upsert: true, new: true }
    )
  } catch (error) {
    console.error('Error caching resume text:', error)
    // Don't throw - caching is optional
  }
}

