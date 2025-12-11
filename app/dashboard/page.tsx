'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import SettingsForm from '@/components/SettingsForm'
import JobApplicationForm from '@/components/JobApplicationForm'
import JobSearchForm from '@/components/JobSearchForm'
import AutoApplyForm from '@/components/AutoApplyForm'

function DashboardContent() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'settings' | 'apply' | 'search' | 'auto'>('settings')
  const [settings, setSettings] = useState<any>(null)

  const searchParams = useSearchParams()

  const [initialData, setInitialData] = useState({
    description: '',
    email: '',
    subject: ''
  })

  useEffect(() => {
    setMounted(true)
    // Load settings
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.success) setSettings(data.settings)
      })
      .catch(err => console.error('Error loading settings:', err))

    // Handle Image Analysis Result (Screenshot flow)
    const analysisId = searchParams.get('analysisId')
    if (analysisId) {
      // Fetch the cached result
      fetch(`/api/get-analysis?id=${analysisId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setInitialData({
              description: data.description || '',
              email: data.emails?.[0] || '',
              subject: 'Application for role (from screenshot)'
            })
            setActiveTab('apply')

            // Trigger Tailor Resume Notification (Simulated for now)
            // "I see you used a screenshot. Want to tailor your resume?"
            // This logic lives in JobApplicationForm or here.
          }
        })
        .catch(err => console.error('Error fetching analysis:', err))
      return
    }

    // Check for incoming job data from extension (Text flow)
    const desc = searchParams.get('desc')
    if (desc) {
      setInitialData({
        description: desc,
        email: searchParams.get('email') || '',
        subject: searchParams.get('subject') || ''
      })
      setActiveTab('apply')
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link href="/" className="flex items-center text-xl font-bold text-gray-900 dark:text-white">
                JobAI
              </Link>
            </div>
            <div className="flex space-x-4 items-center">
              <button
                onClick={() => setActiveTab('search')}
                className={`px-4 py-2 rounded-md font-medium transition ${activeTab === 'search'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                Find Jobs
              </button>
              <button
                onClick={() => setActiveTab('auto')}
                className={`px-4 py-2 rounded-md font-medium transition ${activeTab === 'auto'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                ⚡ Auto-Apply
              </button>
              <button
                onClick={() => setActiveTab('apply')}
                className={`px-4 py-2 rounded-md font-medium transition ${activeTab === 'apply'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                Apply
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 rounded-md font-medium transition ${activeTab === 'settings'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {mounted && activeTab === 'settings' && <SettingsForm settings={settings} onSettingsUpdate={setSettings} />}
        {mounted && activeTab === 'apply' && <JobApplicationForm settings={settings} initialData={initialData} />}
        {mounted && activeTab === 'search' && <JobSearchForm />}
        {mounted && activeTab === 'auto' && <AutoApplyForm settings={settings} />}
      </main>
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}

