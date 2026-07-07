'use client'

import { useState, useEffect } from 'react'

export interface MatchAnalysis {
  strongMatches: string[]
  gapsToBridge: string[]
  hardGaps: string[]
}

export interface PreviewData {
  coverLetter: string
  emailSubject: string
  resumeUrl: string
  tailoredLatex: string
  analysis: MatchAnalysis
  resumePublicId: string
}

interface PreviewModalProps {
  isOpen: boolean
  onClose: () => void
  data: PreviewData
  recruiterEmail?: string
  applicationMode: 'email' | 'manual'
  onFinalize: (finalCoverLetter: string) => void
  onRegenerate: (feedback: string) => void
  working: boolean
}

export default function PreviewModal({
  isOpen,
  onClose,
  data,
  recruiterEmail,
  applicationMode,
  onFinalize,
  onRegenerate,
  working,
}: PreviewModalProps) {
  const [editedCoverLetter, setEditedCoverLetter] = useState(data.coverLetter)
  const [feedback, setFeedback] = useState('')
  const [activeTab, setActiveTab] = useState<'analysis' | 'coverLetter' | 'resume' | 'latex'>('analysis')

  useEffect(() => {
    setEditedCoverLetter(data.coverLetter)
  }, [data.coverLetter])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Review & Refine Application</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {applicationMode === 'email' ? 'Review before sending email.' : 'Review before downloading for manual apply.'}
            </p>
          </div>
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
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar (Analysis & Tabs) */}
          <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-900 overflow-y-auto p-4 space-y-6">
            
            {/* Tabs for right pane */}
            <div className="flex flex-col space-y-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">View</h3>
              <button onClick={() => setActiveTab('analysis')} className={`text-left px-4 py-2 rounded-md transition ${activeTab === 'analysis' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>📊 Match Analysis</button>
              <button onClick={() => setActiveTab('coverLetter')} className={`text-left px-4 py-2 rounded-md transition ${activeTab === 'coverLetter' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>✉️ Cover Letter</button>
              <button onClick={() => setActiveTab('resume')} className={`text-left px-4 py-2 rounded-md transition ${activeTab === 'resume' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>📄 Compiled Resume PDF</button>
              <button onClick={() => setActiveTab('latex')} className={`text-left px-4 py-2 rounded-md transition ${activeTab === 'latex' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>💻 Raw LaTeX Code</button>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Iterate & Refine</h3>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="E.g., Make the summary shorter, emphasize React more..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                rows={4}
              />
              <button
                onClick={() => onRegenerate(feedback)}
                disabled={working || !feedback}
                className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition disabled:opacity-50"
              >
                {working ? 'Regenerating...' : '🔄 Ask AI to Regenerate'}
              </button>
            </div>

          </div>

          {/* Right Pane (Main Content) */}
          <div className="w-2/3 bg-white dark:bg-gray-800 p-6 overflow-y-auto">
            
            {activeTab === 'analysis' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white border-b pb-2">JD Match Analysis</h3>
                
                <div>
                  <h4 className="text-green-600 dark:text-green-400 font-semibold flex items-center gap-2 text-lg">
                    <span>✅</span> Strong Matches
                  </h4>
                  <ul className="mt-2 list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                    {data.analysis.strongMatches.map((m, i) => <li key={i}>{m}</li>)}
                    {data.analysis.strongMatches.length === 0 && <li className="text-gray-500 italic">None identified.</li>}
                  </ul>
                </div>

                <div>
                  <h4 className="text-yellow-600 dark:text-yellow-500 font-semibold flex items-center gap-2 text-lg">
                    <span>⚠️</span> Gaps to Bridge (Adjacent skills)
                  </h4>
                  <ul className="mt-2 list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                    {data.analysis.gapsToBridge.map((m, i) => <li key={i}>{m}</li>)}
                    {data.analysis.gapsToBridge.length === 0 && <li className="text-gray-500 italic">None identified.</li>}
                  </ul>
                </div>

                <div>
                  <h4 className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-2 text-lg">
                    <span>🔴</span> Honest Hard Gaps
                  </h4>
                  <ul className="mt-2 list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                    {data.analysis.hardGaps.map((m, i) => <li key={i}>{m}</li>)}
                    {data.analysis.hardGaps.length === 0 && <li className="text-gray-500 italic">None identified. You are a perfect fit!</li>}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'coverLetter' && (
              <div className="flex flex-col h-full">
                {applicationMode === 'email' && (
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg mb-4">
                    <p className="text-sm"><span className="font-medium text-gray-900 dark:text-white">To:</span> {recruiterEmail}</p>
                    <p className="text-sm mt-1"><span className="font-medium text-gray-900 dark:text-white">Subject:</span> {data.emailSubject}</p>
                  </div>
                )}
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Generated Cover Letter</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">You can edit this manually</span>
                </div>
                <textarea
                  value={editedCoverLetter}
                  onChange={(e) => setEditedCoverLetter(e.target.value)}
                  className="flex-1 w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm font-sans text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none min-h-[400px]"
                />
              </div>
            )}

            {activeTab === 'resume' && (
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Generated PDF Resume</h3>
                  <a href={data.resumeUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">Open in new tab ↗</a>
                </div>
                {/* Embed PDF. If it fails, fallback to link */}
                <object data={data.resumeUrl} type="application/pdf" className="flex-1 w-full h-full rounded-lg border border-gray-200 dark:border-gray-700">
                  <p>Unable to display PDF. <a href={data.resumeUrl} target="_blank" rel="noreferrer">Download instead</a>.</p>
                </object>
              </div>
            )}

            {activeTab === 'latex' && (
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Raw LaTeX Generated</h3>
                  <button 
                    onClick={() => navigator.clipboard.writeText(data.tailoredLatex)}
                    className="text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded"
                  >
                    Copy All
                  </button>
                </div>
                <pre className="flex-1 w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-xs font-mono text-gray-800 dark:text-gray-200 overflow-auto">
                  {data.tailoredLatex}
                </pre>
              </div>
            )}

          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            disabled={working}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md transition disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button
            onClick={() => onFinalize(editedCoverLetter)}
            disabled={working}
            className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md transition disabled:opacity-50 text-lg shadow-md"
          >
            {working ? 'Processing...' : applicationMode === 'email' ? '🚀 Send Application' : '💾 Complete & Prepare Download'}
          </button>
        </div>
      </div>
    </div>
  )
}
