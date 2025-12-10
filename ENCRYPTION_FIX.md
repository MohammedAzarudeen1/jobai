# Encryption Key Issue - Fix Required

## Problem

You're seeing decryption errors because the encryption key is being generated randomly on each server restart. This means:
- Passwords encrypted with one key can't be decrypted with a different key
- Each time you restart the server, the key changes
- Previously saved passwords become unusable

## Solution

**You MUST set a fixed encryption key in your `.env.local` file:**

1. Generate a secure encryption key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Add it to your `.env.local`:
   ```env
   ENCRYPTION_KEY=your-generated-64-character-hex-string-here
   ```

3. **Important**: After setting the key, you'll need to:
   - Re-enter your SMTP password in the settings
   - Save the settings again
   - This will encrypt it with the new fixed key

## What Was Fixed

1. **Better error handling**: Decryption now returns empty string instead of failing silently
2. **Prevents double encryption**: Checks if password is already encrypted before encrypting again
3. **Preserves existing passwords**: If no new password is provided, keeps the existing encrypted password
4. **Better warnings**: Logs warnings when decryption fails

## Current Status

- ✅ Encryption/decryption functions improved
- ✅ Double encryption prevention added
- ✅ Better error handling
- ⚠️ **You still need to set ENCRYPTION_KEY in .env.local**
- ⚠️ **You may need to re-enter your SMTP password after setting the key**

## Next Steps

1. Generate and set `ENCRYPTION_KEY` in `.env.local`
2. Restart your dev server
3. Go to Settings and re-enter your SMTP password
4. Save settings
5. Test email should now work

