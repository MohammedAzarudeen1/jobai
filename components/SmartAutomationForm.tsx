'use client'

import { useState, useEffect } from 'react'
import AutomationScheduler from './AutomationScheduler'

interface AutomationSchedule {
  id: string
  name: string
  keywords: string[]
  location: string
  minMatchScore: number
  maxApplicationsPerRun: number
  frequency: 'daily' | 'weekly' | 'hourly'
  enabled: boolean
  lastRun?: Date
  nextRun?: Date
  totalApplicationsSent: number
  customMessage?: string
}

interface Job {
  id: string
  title: string
  snippet: string
  description: string
  url: string
  email: string | null
  status: 'ready' | 'no_email' | 'applying' | 'sent' | 'failed'
  matchScore?: number
  matchReasoning?: string
  company?: string
}

export default function SmartAutomationForm({ settings }: { settings: any }) {
  const [activeTab, setActiveTab] = useState<'instant' | 'scheduled'>('instant')
  
  // Instant automation state
  const [searchParams, setSearchParams] = useState({
    keywords: '',
    location: '',
    minMatchScore: 70,
    maxApplications: 10,
    customMessage: ''
  })
  const [jobs, setJobs] = useState<Job[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  
  // Scheduled automation state
  const [schedules, setSchedules] = useState<AutomationSchedule[]>([])
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    keywords: '',
    location: '',
    minMatchScore: 70,
    maxApplicationsPerRun: 5,
    frequency: 'daily' as const,
    customMessage: ''
  })
  
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  // Load schedules on component mount
  useEffect(() => {
    loadSchedules()
  }, [])

  const loadSchedules = async () => {
    try {
      const response = await fetch('/api/schedule-automation')
      const data = await response.json()
      if (data.success) {
        setSchedules(data.schedules)
      }
    } catch (error) {
      console.error('Failed to load schedules:', error)
    }
  }

  // Instant automation functions
  const handleSmartSearch = async () => {
    if (!searchParams.keywords) {
      setMessage({ type: 'error', text: 'Please enter keywords to search' })
      return
    }

    setIsSearching(true)
    setMessage({ type: 'info', text: '🔍 Searching multiple job sources...' })
    setJobs([])

    try {
      const response = await fetch('/api/auto-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: searchParams.keywords,
          location: searchParams.location
        })
      })

      const data = await response.json()

      if (data.success) {
        const jobsWithIds = data.jobs.map((job: any, i: number) => ({
          ...job,
          id: `job-${i}-${Date.now()}`,
          status: job.email ? 'ready' : 'no_email'
        }))
        setJobs(jobsWithIds)
        setMessage({
          type: 'success',
          text: `Found ${data.totalFound} jobs from ${Object.values(data.sources).reduce((a: any, b: any) => a + b, 0)} sources! ${data.withEmails} have emails.`
        })
      } else {
        setMessage({ type: 'error', text: data.error || 'Search failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Search failed. Please try again.' })
    } finally {
      setIsSearching(false)
    }
  }

  const handleSmartApply = async () => {
    const readyJobs = jobs.filter(j => j.status === 'ready' && j.email)

    if (readyJobs.length === 0) {
      setMessage({ type: 'error', text: 'No jobs with emails to apply to!' })
      return
    }

    if (!settings?.smtpHost || !settings?.resumeUrl) {
      setMessage({ type: 'error', text: 'Please configure email settings and upload resume first!' })
      return
    }

    const confirmed = window.confirm(
      `🤖 SMART AUTO-APPLY to up to ${Math.min(readyJobs.length, searchParams.maxApplications)} jobs?\n\n` +
      `This will:\n` +
      `• Analyze each job match (min ${searchParams.minMatchScore}% score)\n` +
      `• Generate personalized cover letters\n` +
      `• Send applications automatically\n\n` +
      `Continue?`
    )
    if (!confirmed) return

    setIsApplying(true)
    setMessage({ type: 'info', text: '🤖 Starting smart bulk application...' })

    try {
      const response = await fetch('/api/auto-apply-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobs: readyJobs,
          minMatchScore: searchParams.minMatchScore,
          maxApplications: searchParams.maxApplications,
          customMessage: searchParams.customMessage
        })
      })

      const data = await response.json()

      if (data.success) {
        // Update job statuses based on results
        setJobs(prev => prev.map(job => {
          const result = data.results.find((r: any) => r.jobId === job.id)
          if (result) {
            return {
              ...job,
              status: result.success ? 'sent' : 'failed',
              matchScore: result.matchScore
            }
          }
          return job
        }))

        setMessage({
          type: 'success',
          text: `🎉 Smart application completed! ${data.summary.successful}/${data.summary.totalProcessed} applications sent successfully.`
        })
      } else {
        setMessage({ type: 'error', text: data.error || 'Bulk application failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Application failed. Please try again.' })
    } finally {
      setIsApplying(false)
    }
  }

  // Scheduled automation functions
  const handleCreateSchedule = async () => {
    if (!newSchedule.name || !newSchedule.keywords) {
      setMessage({ type: 'error', text: 'Please fill in schedule name and keywords' })
      return
    }

    try {
      const response = await fetch('/api/schedule-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          schedule: {
            ...newSchedule,
            keywords: newSchedule.keywords.split(',').map(k => k.trim())
          }
        })
      })

      const data = await response.json()

      if (data.success) {
        setSchedules(prev => [...prev, data.schedule])
        setNewSchedule({
          name: '',
          keywords: '',
          location: '',
          minMatchScore: 70,
          maxApplicationsPerRun: 5,
          frequency: 'daily',
          customMessage: ''
        })
        setShowScheduleForm(false)
        setMessage({ type: 'success', text: 'Schedule created successfully!' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create schedule' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create schedule' })
    }
  }

  const handleToggleSchedule = async (scheduleId: string) => {
    try {
      const response = await fetch('/api/schedule-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle',
          schedule: { id: scheduleId }
        })
      })

      const data = await response.json()

      if (data.success) {
        setSchedules(prev => prev.map(s => 
          s.id === scheduleId ? data.schedule : s
        ))
        setMessage({ type: 'success', text: data.message })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to toggle schedule' })
    }
  }

  const handleRunSchedule = async (scheduleId: string) => {
    try {
      setMessage({ type: 'info', text: 'Running scheduled automation...' })
      
      const response = await fetch('/api/schedule-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run',
          schedule: { id: scheduleId }
        })
      })

      const data = await response.json()

      if (data.success) {
        setSchedules(prev => prev.map(s => 
          s.id === scheduleId ? data.schedule : s
        ))
        setMessage({ type: 'success', text: data.message })
      } else {
        setMessage({ type: 'error', text: data.error || 'Schedule run failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to run schedule' })
    }
  }

  const readyCount = jobs.filter(j => j.status === 'ready').length
  const sentCount = jobs.filter(j => j.status === 'sent').length

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
        🤖 Smart Job Automation
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Intelligent job hunting with AI-powered matching and bulk applications
      </p>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
          message.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' :
          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('instant')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'instant'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ⚡ Instant Automation
        </button>
        <button
          onClick={() => setActiveTab('scheduled')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'scheduled'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📅 Scheduled Automation
        </button>
      </div>

      {activeTab === 'instant' && (
        <div className="space-y-6">
          {/* Search Configuration */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Smart Search & Apply</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="text"
                value={searchParams.keywords}
                onChange={(e) => setSearchParams({ ...searchParams, keywords: e.target.value })}
                placeholder="Job keywords (e.g., React Developer, Python Engineer)"
                className="px-4 py-3 border border-gray-300 rounded-lg dark:bg-gray-600 dark:border-gray-500 dark:text-white"
              />
              <input
                type="text"
                value={searchParams.location}
                onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
                placeholder="Location (optional)"
                className="px-4 py-3 border border-gray-300 rounded-lg dark:bg-gray-600 dark:border-gray-500 dark:text-white"
              />
            </div>
            
            <div className="grid gap-4 md:grid-cols-3 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Min Match Score: {searchParams.minMatchScore}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={searchParams.minMatchScore}
                  onChange={(e) => setSearchParams({ ...searchParams, minMatchScore: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Applications: {searchParams.maxApplications}
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={searchParams.maxApplications}
                  onChange={(e) => setSearchParams({ ...searchParams, maxApplications: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Custom Message (optional)
              </label>
              <textarea
                value={searchParams.customMessage}
                onChange={(e) => setSearchParams({ ...searchParams, customMessage: e.target.value })}
                placeholder="Add a personal touch to all applications..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                rows={2}
              />
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSmartSearch}
                disabled={isSearching}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition"
              >
                {isSearching ? '🔍 Searching...' : '🔍 Smart Search'}
              </button>
              <button
                onClick={handleSmartApply}
                disabled={isApplying || readyCount === 0}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition"
              >
                {isApplying ? '🤖 Applying...' : `🤖 Smart Apply (${readyCount})`}
              </button>
            </div>
          </div>

          {/* Job Results */}
          {jobs.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Found Jobs ({readyCount} ready, {sentCount} sent)
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {jobs.slice(0, 10).map(job => (
                  <div key={job.id} className={`p-4 rounded-lg border ${
                    job.status === 'sent' ? 'bg-green-50 border-green-300' :
                    job.status === 'failed' ? 'bg-red-50 border-red-300' :
                    job.status === 'ready' ? 'bg-white border-gray-200' :
                    'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-bold text-gray-900">{job.title}</div>
                        <div className="text-sm text-gray-600">{job.company}</div>
                        <div className="text-sm text-gray-500 mt-1">{job.snippet}</div>
                        {job.email && (
                          <div className="text-sm text-green-600 mt-2">📧 {job.email}</div>
                        )}
                        {job.matchScore && (
                          <div className="text-xs text-purple-600 mt-1">
                            Match Score: {job.matchScore}%
                          </div>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        job.status === 'sent' ? 'bg-green-200 text-green-800' :
                        job.status === 'failed' ? 'bg-red-200 text-red-800' :
                        job.status === 'ready' ? 'bg-blue-200 text-blue-800' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {job.status === 'sent' ? '✅ Sent' :
                         job.status === 'failed' ? '❌ Failed' :
                         job.status === 'ready' ? '🟢 Ready' :
                         '⚪ No Email'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'scheduled' && (
        <div className="space-y-6">
          {/* Automation Scheduler */}
          <AutomationScheduler />
          
          {/* Create Schedule Button */}
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 dark:text-white">Automation Schedules</h3>
            <button
              onClick={() => setShowScheduleForm(!showScheduleForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              {showScheduleForm ? 'Cancel' : '+ New Schedule'}
            </button>
          </div>

          {/* Schedule Form */}
          {showScheduleForm && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Create Automation Schedule</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="text"
                  value={newSchedule.name}
                  onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                  placeholder="Schedule name (e.g., Daily React Jobs)"
                  className="px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                />
                <input
                  type="text"
                  value={newSchedule.keywords}
                  onChange={(e) => setNewSchedule({ ...newSchedule, keywords: e.target.value })}
                  placeholder="Keywords (comma-separated)"
                  className="px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                />
                <input
                  type="text"
                  value={newSchedule.location}
                  onChange={(e) => setNewSchedule({ ...newSchedule, location: e.target.value })}
                  placeholder="Location (optional)"
                  className="px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                />
                <select
                  value={newSchedule.frequency}
                  onChange={(e) => setNewSchedule({ ...newSchedule, frequency: e.target.value as any })}
                  className="px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                >
                  <option value="hourly">Every Hour</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Min Match Score: {newSchedule.minMatchScore}%
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    value={newSchedule.minMatchScore}
                    onChange={(e) => setNewSchedule({ ...newSchedule, minMatchScore: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Apps per Run: {newSchedule.maxApplicationsPerRun}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={newSchedule.maxApplicationsPerRun}
                    onChange={(e) => setNewSchedule({ ...newSchedule, maxApplicationsPerRun: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="mt-4">
                <textarea
                  value={newSchedule.customMessage}
                  onChange={(e) => setNewSchedule({ ...newSchedule, customMessage: e.target.value })}
                  placeholder="Custom message for all applications..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  rows={2}
                />
              </div>

              <button
                onClick={handleCreateSchedule}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg mt-4 transition"
              >
                Create Schedule
              </button>
            </div>
          )}

          {/* Existing Schedules */}
          <div className="space-y-4">
            {schedules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No automation schedules yet. Create one to get started!
              </div>
            ) : (
              schedules.map(schedule => (
                <div key={schedule.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 dark:text-white">{schedule.name}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${
                          schedule.enabled ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {schedule.enabled ? '🟢 Active' : '⚪ Paused'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Keywords: {schedule.keywords.join(', ')} | {schedule.location || 'Any location'}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Frequency: {schedule.frequency} | Min Score: {schedule.minMatchScore}% | Max Apps: {schedule.maxApplicationsPerRun}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Total Sent: {schedule.totalApplicationsSent} | Next Run: {schedule.nextRun ? new Date(schedule.nextRun).toLocaleString() : 'Not scheduled'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRunSchedule(schedule.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition"
                      >
                        Run Now
                      </button>
                      <button
                        onClick={() => handleToggleSchedule(schedule.id)}
                        className={`px-3 py-1 rounded text-sm transition ${
                          schedule.enabled 
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {schedule.enabled ? 'Pause' : 'Enable'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-2">🤖 Smart Automation Features:</h4>
        <ul className="list-disc ml-4 text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <li><strong>Multi-Source Search:</strong> Searches Google, LinkedIn API, and job boards</li>
          <li><strong>AI Matching:</strong> Only applies to jobs that match your skills (configurable threshold)</li>
          <li><strong>Personalized Applications:</strong> Generates unique cover letters for each job</li>
          <li><strong>Smart Scheduling:</strong> Set it and forget it - runs automatically</li>
          <li><strong>Bulk Processing:</strong> Apply to multiple jobs with one click</li>
        </ul>
      </div>
    </div>
  )
}