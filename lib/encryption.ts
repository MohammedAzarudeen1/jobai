import crypto from 'crypto'

// Get encryption key from environment variable or generate a default one
// In production, you MUST set ENCRYPTION_KEY in your .env.local
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')
const ALGORITHM = 'aes-256-gcm'

// Ensure the key is 32 bytes (64 hex characters)
function getKey(): Buffer {
  let key = ENCRYPTION_KEY
  if (key.length < 64) {
    // Pad or hash to get 32 bytes
    key = crypto.createHash('sha256').update(key).digest('hex')
  }
  return Buffer.from(key.substring(0, 64), 'hex')
}

export function encrypt(text: string): string {
  try {
    const key = getKey()
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    // Combine iv, authTag, and encrypted data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) {
    return ''
  }

  try {
    const key = getKey()
    const parts = encryptedText.split(':')
    
    // If it's not in the encrypted format (iv:authTag:encrypted), assume it's unencrypted
    if (parts.length !== 3) {
      // Check if it looks like it might be encrypted (has colons but wrong format)
      // If it doesn't have the expected format, return as-is (might be plain text from before encryption was added)
      return encryptedText
    }
    
    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    // If decryption fails, the encryption key might have changed
    // Log a warning but don't throw - return empty string so user knows to re-enter password
    console.warn('Decryption failed - password may need to be re-entered. This can happen if ENCRYPTION_KEY changed.')
    return '' // Return empty to force user to re-enter password
  }
}

// Check if a string is already encrypted
export function isEncrypted(text: string): boolean {
  if (!text) return false
  const parts = text.split(':')
  return parts.length === 3 && parts[0].length === 32 && parts[1].length === 32
}

