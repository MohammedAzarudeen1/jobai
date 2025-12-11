'use client'

import { useState } from 'react'

interface PreviewModalProps {
  isOpen: boolean
  onClose: () => void
  coverLetter: string
  enhancedResumeUrl: string
  emailSubject: string
  recruiterEmail: string
  onSend: () => void
  sending: boolean
}

export default function PreviewModal({
  isOpen,
  onClose,
  coverLetter,
  enhancedResumeUrl,
  emailSubject,
  recruiterEmail,
  onSend,
  sending,
}: PreviewModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Preview Application</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Email Details */}
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Email Details</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">To:</span> {recruiterEmail}</p>
              <p><span className="font-medium">Subject:</span> {emailSubject}</p>
            </div>
          </div>

          {/* Cover Letter Preview */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Cover Letter</h3>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 dark:text-gray-200">
                {coverLetter}
              </pre>
            </div>
          </div>

          {/* Resume Preview */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Enhanced Resume</h3>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
              <object
                data={enhancedResumeUrl}
                type="application/pdf"
                className="w-full h-96 border-0 rounded"
              >
                <div className="flex flex-col items-center justify-center h-full bg-gray-100 text-gray-500">
                  <p>Preview not supported in this browser.</p>
                  <a href={enhancedResumeUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    Click here to view PDF
                  </a>
                </div>
              </object>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Resume has been enhanced for this position
                </p>
                <a
                  href={enhancedResumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                >
                  Open in new tab
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onSend}
            disabled={sending}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send Application'}
          </button>
        </div>
      </div>
    </div>
  )
}

