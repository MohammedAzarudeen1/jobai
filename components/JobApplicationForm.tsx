'use client'

import { useState, useEffect } from 'react'
import PreviewModal, { PreviewData } from './PreviewModal'
import { extractEmails } from '@/lib/utils'

interface JobApplicationFormProps {
  settings: any
  initialData?: {
    description: string
    email: string
    subject: string
    coverLetter?: string
  }
}

export default function JobApplicationForm({ settings, initialData }: JobApplicationFormProps) {
  const [applicationMode, setApplicationMode] = useState<'email' | 'manual'>('email')
  const [formData, setFormData] = useState({
    jobDescription: initialData?.description || '',
    recruiterEmail: initialData?.email || '',
    subject: initialData?.subject || '',
  })

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        jobDescription: initialData.description || prev.jobDescription,
        recruiterEmail: initialData.email || prev.recruiterEmail,
        subject: initialData.subject || prev.subject
      }))
    }
  }, [initialData])

  const [previewing, setPreviewing] = useState(false)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [completedManualLink, setCompletedManualLink] = useState<{ pdfUrl: string, coverLetter: string } | null>(null)

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

    const emails = extractEmails(formData.jobDescription)
    if (emails.length > 0 && !formData.recruiterEmail) {
      setFormData(prev => ({
        ...prev,
        recruiterEmail: emails[0]
      }))
      if (applicationMode === 'email') {
        setMessage({
          type: 'success',
          text: `Found and added recruiter email: ${emails[0]}`,
        })
      }
    }
  }

  const generatePreview = async (feedback?: string) => {
    if (applicationMode === 'email' && (!settings || !settings.smtpHost)) {
      setMessage({ type: 'error', text: 'Please configure your email settings first.' })
      return
    }

    if (!settings || !settings.baseLatexTemplate) {
      setMessage({ type: 'error', text: 'Please save a Base LaTeX Template in the Settings tab first.' })
      return
    }

    if (!formData.jobDescription) {
      setMessage({ type: 'error', text: 'Please enter a job description.' })
      return
    }

    if (applicationMode === 'email' && !formData.recruiterEmail) {
      setMessage({ type: 'error', text: 'Please enter the recruiter email address.' })
      return
    }

    // Use previewing for initial generation, working for regeneration
    if (feedback) setWorking(true)
    else setPreviewing(true)
    
    setMessage(null)

    try {
      const response = await fetch('/api/generate-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: formData.jobDescription,
          userFeedback: feedback,
          existingAnalysis: previewData?.analysis // Pass existing analysis so it doesn't re-run
        }),
      })

      const data = await response.json()

      if (data.success) {
        setPreviewData({
          coverLetter: data.coverLetter,
          emailSubject: data.subject || formData.subject || 'Application',
          resumeUrl: data.resumeUrl,
          resumePublicId: data.resumePublicId,
          tailoredLatex: data.tailoredLatex,
          analysis: data.analysis
        })
        setShowPreview(true)
        if (feedback) {
          setMessage({ type: 'success', text: 'Regenerated successfully based on your feedback!' })
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to generate preview' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error generating preview' })
    } finally {
      setPreviewing(false)
      setWorking(false)
    }
  }

  const handleFinalize = async (finalCoverLetter: string) => {
    if (!previewData) return

    setWorking(true)
    setMessage(null)

    if (applicationMode === 'manual') {
      // Manual apply: Just close modal and provide the links
      setCompletedManualLink({
        pdfUrl: previewData.resumeUrl,
        coverLetter: finalCoverLetter
      })
      setShowPreview(false)
      setPreviewData(null)
      setMessage({ type: 'success', text: 'Generation complete! You can download your assets below.' })
      setWorking(false)
      return
    }

    // Email Mode: Actually send the email
    try {
      const response = await fetch('/api/apply-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: formData.jobDescription,
          recruiterEmail: formData.recruiterEmail,
          subject: previewData.emailSubject,
          coverLetter: finalCoverLetter,
          enhancedResumeUrl: previewData.resumeUrl,
          enhancedResumePublicId: previewData.resumePublicId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({
          type: 'success',
          text: `Application sent successfully to ${formData.recruiterEmail}!`,
        })
        setFormData({ jobDescription: '', recruiterEmail: '', subject: '' })
        setShowPreview(false)
        setPreviewData(null)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send application' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error sending application' })
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
      <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Start Application</h2>
        
        {/* Application Mode Selector */}
        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setApplicationMode('email')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              applicationMode === 'email'
                ? 'bg-white dark:bg-gray-800 shadow text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            📧 Send via Email
          </button>
          <button
            type="button"
            onClick={() => setApplicationMode('manual')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              applicationMode === 'manual'
                ? 'bg-white dark:bg-gray-800 shadow text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            💻 Manual Apply
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Manual Apply Completed Results */}
      {completedManualLink && applicationMode === 'manual' && (
        <div className="mb-6 p-6 border-2 border-green-500 rounded-lg bg-green-50 dark:bg-green-900/20">
          <h3 className="text-xl font-bold text-green-800 dark:text-green-300 mb-4">🎉 Application Assets Ready!</h3>
          <div className="flex gap-4">
            <a 
              href={completedManualLink.pdfUrl} 
              target="_blank" 
              rel="noreferrer"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded text-center transition"
            >
              📥 Download Custom PDF Resume
            </a>
            <button 
              onClick={() => navigator.clipboard.writeText(completedManualLink.coverLetter)}
              className="flex-1 bg-white border-2 border-green-600 text-green-700 hover:bg-green-50 font-bold py-3 px-4 rounded text-center transition"
            >
              📋 Copy Cover Letter
            </button>
          </div>
          <button 
            onClick={() => setCompletedManualLink(null)}
            className="mt-4 text-sm text-gray-500 underline text-center w-full block"
          >
            Start another application
          </button>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); generatePreview(); }} className="space-y-4">
        
        {applicationMode === 'email' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Recruiter Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="recruiterEmail"
                value={formData.recruiterEmail}
                onChange={handleInputChange}
                placeholder="recruiter@company.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required={applicationMode === 'email'}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Job Description <span className="text-red-500">*</span>
          </label>
          <textarea
            name="jobDescription"
            value={formData.jobDescription}
            onChange={handleInputChange}
            onBlur={handleDescriptionBlur}
            placeholder="Paste the full job description here... The AI will match your resume against it."
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            required
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="submit"
            disabled={previewing}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50 text-center shadow-lg"
          >
            {previewing ? 'Analyzing JD & Compiling LaTeX...' : '🔍 Analyze & Generate Application'}
          </button>
        </div>
      </form>

      {/* Loading Overlay for initial generation */}
      {previewing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-md w-full mx-4">
            <div className="text-4xl mb-4 animate-bounce">🤖</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              AI Analyzing Profile & Compiling LaTeX...
            </h3>
            <p className="text-gray-500 text-center text-sm">
              Finding gaps, injecting keywords, and running pdflatex. This might take a few seconds.
            </p>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewData && (
        <PreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          data={previewData}
          recruiterEmail={formData.recruiterEmail}
          applicationMode={applicationMode}
          onFinalize={handleFinalize}
          onRegenerate={generatePreview}
          working={working}
        />
      )}
    </div>
  )
}
