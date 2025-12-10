'use client'

import { useState, useEffect } from 'react'
import PreviewModal from './PreviewModal'
import { extractEmails } from '@/lib/utils'

interface JobApplicationFormProps {
  settings: any
  initialData?: {
    description: string
    email: string
    subject: string
  }
}

export default function JobApplicationForm({ settings, initialData }: JobApplicationFormProps) {
  const [formData, setFormData] = useState({
    jobDescription: initialData?.description || '',
    recruiterEmail: initialData?.email || '',
    subject: initialData?.subject || '',
  })

  // Update form if initialData changes (e.g. navigation)
  useEffect(() => {
    if (initialData && (initialData.description || initialData.email)) {
      setFormData(prev => ({
        ...prev,
        jobDescription: initialData.description || prev.jobDescription,
        recruiterEmail: initialData.email || prev.recruiterEmail,
        subject: initialData.subject || prev.subject
      }))
    }
  }, [initialData])

  const [submitting, setSubmitting] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [previewData, setPreviewData] = useState<{
    coverLetter: string
    enhancedResumeUrl: string
    enhancedResumePublicId: string
    emailSubject: string
  } | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleDescriptionBlur = () => {
    if (!formData.jobDescription) return

    // Only extract if email is empty
    const emails = extractEmails(formData.jobDescription)
    if (emails.length > 0 && !formData.recruiterEmail) {
      setFormData(prev => ({
        ...prev,
        recruiterEmail: emails[0]
      }))
      setMessage({
        type: 'success',
        text: `Found and added recruiter email: ${emails[0]}`,
      })
    }
  }

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!settings || !settings.smtpHost) {
      setMessage({
        type: 'error',
        text: 'Please configure your email settings first in the Settings tab.',
      })
      return
    }

    if (!settings.resumeUrl) {
      setMessage({
        type: 'error',
        text: 'Please upload your resume first in the Settings tab.',
      })
      return
    }

    if (!formData.jobDescription) {
      setMessage({
        type: 'error',
        text: 'Please enter a job description.',
      })
      return
    }

    if (!formData.recruiterEmail) {
      setMessage({
        type: 'error',
        text: 'Please enter the recruiter email address.',
      })
      return
    }

    setPreviewing(true)
    setMessage(null)

    try {
      const response = await fetch('/api/preview-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobDescription: formData.jobDescription,
          subject: formData.subject,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setPreviewData({
          coverLetter: data.coverLetter,
          enhancedResumeUrl: data.enhancedResumeUrl,
          enhancedResumePublicId: data.enhancedResumePublicId,
          emailSubject: data.emailSubject,
        })
        setShowPreview(true)
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to generate preview',
        })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error generating preview',
      })
    } finally {
      setPreviewing(false)
    }
  }

  const handleSend = async () => {
    if (!previewData) return

    setSending(true)
    setMessage(null)

    try {
      const response = await fetch('/api/apply-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          coverLetter: previewData.coverLetter,
          enhancedResumeUrl: previewData.enhancedResumeUrl,
          enhancedResumePublicId: previewData.enhancedResumePublicId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({
          type: 'success',
          text: `Email sent successfully to ${formData.recruiterEmail}!`,
        })
        setFormData({
          jobDescription: '',
          recruiterEmail: '',
          subject: '',
        })
        setShowPreview(false)
        setPreviewData(null)
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to send application',
        })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error sending application',
      })
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Redirect to preview instead of direct send
    await handlePreview(e)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Apply to Job
      </h2>

      {message && (
        <div
          className={`mb-4 p-4 rounded ${message.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Recruiter Email
          </label>
          <input
            type="email"
            name="recruiterEmail"
            value={formData.recruiterEmail}
            onChange={handleInputChange}
            placeholder="recruiter@company.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email Subject (Optional)
          </label>
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleInputChange}
            placeholder="Application for [Position Name]"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Job Description
          </label>
          <textarea
            name="jobDescription"
            value={formData.jobDescription}
            onChange={handleInputChange}
            onBlur={handleDescriptionBlur}
            placeholder="Paste the job description here... (Recruiter email will be auto-extracted if found)"
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            required
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={previewing || submitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-md transition disabled:opacity-50"
          >
            {previewing ? 'Generating Preview...' : 'Preview Application'}
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-md">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>What happens when you click Preview:</strong>
          <br />
          1. AI will generate a personalized cover letter based on the job description
          <br />
          2. Your resume will be enhanced and customized for this position
          <br />
          3. You can review everything before sending
          <br />
          4. Click "Send Application" in the preview to send the email
        </p>
      </div>

      {/* Preview Modal */}
      {previewData && (
        <PreviewModal
          isOpen={showPreview}
          onClose={() => {
            setShowPreview(false)
            setPreviewData(null)
          }}
          coverLetter={previewData.coverLetter}
          enhancedResumeUrl={previewData.enhancedResumeUrl}
          emailSubject={previewData.emailSubject}
          recruiterEmail={formData.recruiterEmail}
          onSend={handleSend}
          sending={sending}
        />
      )}
    </div>
  )
}
