# Quick Start Guide

## Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set up Environment Variables**
   Create a `.env.local` file in the root directory:
   ```env
   # MongoDB Connection String
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/jobai?retryWrites=true&w=majority
   
   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   
   # Groq AI API Key
   GROQ_API_KEY=your_groq_api_key
   
   # Encryption Key (IMPORTANT for production)
   # Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ENCRYPTION_KEY=your-64-character-hex-string-here
   ```

3. **Get API Keys**
   
   **MongoDB Atlas (Free):**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free cluster
   - Create a database user
   - Whitelist your IP (or use 0.0.0.0/0 for development)
   - Get connection string and replace username/password
   
   **Cloudinary (Free):**
   - Go to [Cloudinary](https://cloudinary.com/)
   - Sign up for free account
   - Copy Cloud Name, API Key, and API Secret from dashboard
   
   **Groq AI (Free):**
   - Go to [Groq Console](https://console.groq.com/)
   - Sign up and create an API key
   - Copy the API key

4. **Run the Development Server**
   ```bash
   npm run dev
   ```

5. **Open the App**
   Navigate to [http://localhost:3000](http://localhost:3000)

## First Time Setup

1. Go to Dashboard → Settings
2. Configure your SMTP settings:
   - **SMTP Host**: `smtp.gmail.com` (for Gmail)
   - **SMTP Port**: `587`
   - **SMTP User**: Your email address
   - **SMTP Password**: Your Gmail App Password (not your regular password)
   - **From Email**: Your email address
   - **From Name**: Your name
3. Upload your resume (PDF format) - it will be stored in Cloudinary
4. Save settings

## Using the App

1. Go to Dashboard → Apply to Job
2. Enter the recruiter's email
3. Paste the job description
4. (Optional) Add a custom email subject
5. Click "Generate & Send Application"

The app will:
- Generate a personalized cover letter using Groq AI
- Enhance your resume for the position
- Upload enhanced resume to Cloudinary
- Send the email with the resume attachment to the recruiter

## Gmail App Password Setup

1. Enable 2-Factor Authentication on your Google Account
2. Go to [Google Account Settings](https://myaccount.google.com/)
3. Security → 2-Step Verification → App passwords
4. Select "Mail" and your device
5. Copy the generated 16-character password
6. Use this password in the SMTP Password field

## Troubleshooting

- **MongoDB connection errors**: Check your connection string and ensure your IP is whitelisted
- **Cloudinary upload fails**: Verify your API credentials in `.env.local`
- **Groq AI not working**: Check your API key or the app will use template-based generation
- **Email not sending**: Check your SMTP settings and ensure you're using an App Password for Gmail
- **Resume upload fails**: Ensure the file is a PDF and under 10MB
