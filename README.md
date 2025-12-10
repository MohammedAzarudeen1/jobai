# JobAI - AI-Powered Job Application Assistant

A full-stack Next.js application that automates job applications by generating personalized cover letters using AI and sending them with enhanced resumes via your SMTP email settings.

## Features

- **Email Configuration**: Set up your SMTP settings (Gmail App Password, etc.)
- **Resume Upload**: Upload your resume in PDF format
- **AI-Powered Email Generation**: Automatically generates personalized cover letters based on job descriptions
- **Resume Enhancement**: Enhances your resume PDF for each application
- **Automated Sending**: Sends emails directly to recruiters using your SMTP settings

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB database (MongoDB Atlas recommended for free tier)
- Cloudinary account (free tier available)
- Groq AI API key (free tier available)
- An email account with SMTP access (Gmail App Password recommended)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env.local`:
```env
# MongoDB Connection String
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/jobai?retryWrites=true&w=majority

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Groq AI API Key
GROQ_API_KEY=your_groq_api_key
```

**Getting API Keys:**
- **MongoDB**: Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier available)
- **Cloudinary**: Sign up at [Cloudinary](https://cloudinary.com/) (free tier available)
- **Groq**: Sign up at [Groq Console](https://console.groq.com/) (free tier available)

Note: The app works without Groq API key using a template-based fallback, but AI generation works much better with the API key.

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Configure Settings**:
   - Go to the Dashboard
   - Click on "Settings" tab
   - Enter your SMTP configuration:
     - SMTP Host (e.g., `smtp.gmail.com`)
     - SMTP Port (e.g., `587` for Gmail)
     - SMTP Username/Email
     - SMTP Password (App Password for Gmail)
     - From Email and Name
   - Upload your resume PDF

2. **Apply to Jobs**:
   - Click on "Apply to Job" tab
   - Enter the recruiter's email
   - Paste the job description
   - (Optional) Add a custom email subject
   - Click "Generate & Send Application"
   - The app will:
     - Generate a personalized cover letter
     - Enhance your resume
     - Send the email with the resume attachment

## Gmail Setup

To use Gmail SMTP:

1. Enable 2-Factor Authentication on your Google Account
2. Go to [Google Account Settings](https://myaccount.google.com/)
3. Navigate to Security → 2-Step Verification → App passwords
4. Generate an App Password for "Mail"
5. Use this App Password as your SMTP Password in the settings

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **MongoDB** - Database for user settings
- **Cloudinary** - Cloud storage for resume files
- **Vercel AI SDK** - Unified AI SDK with Groq provider
- **Groq AI** - Fast AI text generation (free tier available)
- **Nodemailer** - Email sending
- **PDF-lib** - PDF manipulation

## Project Structure

```
jobai/
├── app/
│   ├── api/
│   │   ├── settings/      # Settings management API
│   │   ├── upload-resume/ # Resume upload API
│   │   └── apply-job/     # Job application API
│   ├── dashboard/         # Dashboard page
│   └── page.tsx           # Home page
├── components/
│   ├── SettingsForm.tsx   # Settings form component
│   └── JobApplicationForm.tsx # Job application form
├── lib/
│   ├── mongodb.ts         # MongoDB connection
│   ├── models/
│   │   └── UserSettings.ts # MongoDB schema
│   ├── cloudinary.ts      # Cloudinary file storage
│   ├── storage.ts         # MongoDB-based storage
│   ├── ai.ts              # Groq AI generation logic
│   ├── email.ts           # Email sending
│   └── pdf.ts             # PDF manipulation
```

## Notes

- Settings are stored in MongoDB (cloud database)
- Resumes are stored in Cloudinary (cloud storage)
- The app uses **Vercel AI SDK** with **Groq provider** for fast, free AI text generation
- Uses `llama-3.1-70b-versatile` model by default (can be changed in `lib/ai.ts`)
- Without Groq API key, it falls back to template-based email generation
- Enhanced resumes are uploaded to Cloudinary and can be cleaned up after sending
- See [GROQ_INTEGRATION.md](./GROQ_INTEGRATION.md) for model options and advanced features

## License

MIT

