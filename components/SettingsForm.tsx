'use client'

import { useState, useRef, useEffect } from 'react'

interface SettingsFormProps {
  settings: any
  onSettingsUpdate: (settings: any) => void
}

export default function SettingsForm({ settings, onSettingsUpdate }: SettingsFormProps) {
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '', // Always start empty for security
    fromEmail: '',
    fromName: '',
    baseLatexTemplate: '',
  })
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync formData when settings are loaded (client-side only)
  // Only sync on initial mount, not on every settings update to preserve user input
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (settings && !initialized) {
      setFormData({
        smtpHost: settings.smtpHost || '',
        smtpPort: settings.smtpPort?.toString() || '587',
        smtpUser: settings.smtpUser || '',
        smtpPassword: '', // Always keep password empty for security
        fromEmail: settings.fromEmail || '',
        fromName: settings.fromName || '',
        baseLatexTemplate: settings.baseLatexTemplate || '',
      })
      setInitialized(true)
    }
  }, [settings, initialized])
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0])
    }
  }

  const handleResumeUpload = async () => {
    if (!resumeFile) {
      setMessage({ type: 'error', text: 'Please select a resume file' })
      return
    }

    setUploading(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('resume', resumeFile)

    try {
      const response = await fetch('/api/upload-resume', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Resume uploaded successfully!' })
        setResumeFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to upload resume' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error uploading resume' })
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
        onSettingsUpdate(data.settings)
        // Clear password field after saving for security
        setFormData(prev => ({ ...prev, smtpPassword: '' }))
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving settings' })
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Please enter a test email address' })
      return
    }

    // Test email uses saved settings from database, not form data
    // This way the password doesn't need to be in the form
    if (!settings?.smtpHost || !settings?.smtpUser) {
      setMessage({ type: 'error', text: 'Please save your SMTP settings first before testing email' })
      return
    }

    setTesting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testEmail }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: data.message || 'Test email sent successfully!' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send test email' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error sending test email' })
    } finally {
      setTesting(false)
    }
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Dashboard Settings</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Dashboard Settings</h2>

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

      <div className="space-y-8">
        {/* Email Settings */}
        <div>
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Email Configuration (SMTP)</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                SMTP Host
              </label>
              <input
                type="text"
                name="smtpHost"
                value={formData.smtpHost}
                onChange={handleInputChange}
                placeholder="smtp.gmail.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                SMTP Port
              </label>
              <input
                type="number"
                name="smtpPort"
                value={formData.smtpPort}
                onChange={handleInputChange}
                placeholder="587"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                SMTP Username/Email
              </label>
              <input
                type="email"
                name="smtpUser"
                value={formData.smtpUser}
                onChange={handleInputChange}
                placeholder="your-email@gmail.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                SMTP Password (App Password)
              </label>
              <input
                type="password"
                name="smtpPassword"
                value={formData.smtpPassword}
                onChange={handleInputChange}
                placeholder="Your app password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                For Gmail, use an App Password. Enable 2FA and generate one in your Google Account settings.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From Email
              </label>
              <input
                type="email"
                name="fromEmail"
                value={formData.fromEmail}
                onChange={handleInputChange}
                placeholder="your-email@gmail.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From Name
              </label>
              <input
                type="text"
                name="fromName"
                value={formData.fromName}
                onChange={handleInputChange}
                placeholder="Your Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Base Resume Template (LaTeX)
              </label>
              <textarea
                name="baseLatexTemplate"
                value={formData.baseLatexTemplate}
                onChange={handleTextAreaChange}
                placeholder="\documentclass{article}..."
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Paste your raw LaTeX resume template here. The AI will fill it dynamically.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Email Settings'}
              </button>
            </div>
          </form>

          {/* Test Email Section */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Test Email Configuration</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Test Email Address
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Enter an email address to test your SMTP configuration. Make sure to save your settings first.
                </p>
              </div>
              <button
                onClick={handleTestEmail}
                disabled={testing || !testEmail || !settings?.smtpHost}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition disabled:opacity-50"
              >
                {testing ? 'Sending Test Email...' : 'Send Test Email'}
              </button>
            </div>
          </div>
        </div>

        {/* Resume Upload */}
        <div>
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Resume Upload</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Upload Resume (PDF)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            {settings?.resumeUrl && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Current resume uploaded successfully
                <br />
                <a
                  href={settings.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View Resume
                </a>
              </p>
            )}
            <button
              onClick={handleResumeUpload}
              disabled={uploading || !resumeFile}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload Resume'}
            </button>
          </div>
        </div>
      </div>
      {/* Premium Loader Overlay */}
      {(uploading || testing || saving) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 border border-gray-100 dark:border-gray-700">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 border-4 border-blue-100 dark:border-gray-700 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-2xl">
                {uploading ? '📄' : testing ? '📧' : '💾'}
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
              {uploading ? 'Uploading Resume' : testing ? 'Sending Test Email' : 'Saving Settings'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center animate-pulse text-sm">
              {uploading ? 'Our AI is extracting text from your resume to enhance your applications...' : 'Please wait a moment while we process your request...'}
            </p>
            <div className="mt-8 w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full animate-[loading_2s_ease-in-out_infinite] w-1/3 rounded-full"></div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  )
}

