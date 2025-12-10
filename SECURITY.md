# Security Features

## Password Encryption

The app uses **AES-256-GCM encryption** to securely store SMTP passwords in MongoDB. This ensures that even if your database is compromised, passwords remain encrypted.

### How It Works

1. **Encryption**: When you save your SMTP password, it's encrypted using AES-256-GCM before being stored in MongoDB
2. **Decryption**: When the app needs to use the password (e.g., to send emails), it's automatically decrypted
3. **Key Management**: The encryption key is stored in the `ENCRYPTION_KEY` environment variable

### Setting Up Encryption Key

**Important**: For production use, you MUST set a custom encryption key in your `.env.local`:

```env
ENCRYPTION_KEY=your-very-long-random-string-at-least-64-characters
```

You can generate a secure key using:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 32
```

**Warning**: 
- If you change the encryption key, all existing encrypted passwords will become unreadable
- Keep your encryption key secure and never commit it to version control
- The key should be at least 64 characters (32 bytes in hex)

### Default Behavior

If no `ENCRYPTION_KEY` is set, the app will generate a random key on startup. However, this means:
- The key will be different each time the app restarts
- Previously encrypted passwords cannot be decrypted
- **This is only suitable for development/testing**

## Password Storage

- Passwords are **never** returned in API responses
- The password field in the UI shows a placeholder when a password is already saved
- You only need to re-enter the password if you want to change it
- Passwords are encrypted before being saved to MongoDB

## Test Email Feature

The test email feature allows you to verify your SMTP configuration before sending actual job applications:

1. Configure your SMTP settings
2. Save the settings
3. Enter a test email address
4. Click "Send Test Email"
5. Check your inbox to confirm the email was received

This helps ensure your email configuration is correct before sending important job applications.

## Best Practices

1. **Use App Passwords**: For Gmail and other providers, use App Passwords instead of your main account password
2. **Keep Encryption Key Secure**: Store your `ENCRYPTION_KEY` in a secure location
3. **Regular Updates**: Update your SMTP password if you suspect it may be compromised
4. **Test Before Use**: Always use the test email feature to verify your configuration

## Security Notes

- The encryption uses industry-standard AES-256-GCM
- Each encryption uses a unique initialization vector (IV)
- Authentication tags prevent tampering
- Passwords are never logged or exposed in error messages

