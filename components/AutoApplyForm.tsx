'use client'

import { useState } from 'react'

interface Job {
    id: string
    title: string
    snippet: string
    description: string
    url: string
    email: string | null
    status: 'ready' | 'no_email' | 'applying' | 'sent' | 'failed'
    // AI Match fields
    matchScore?: number
    matchReasoning?: string
    missingSkills?: string[]
    // Display fields
    author?: string
    company?: string
}

export default function AutoApplyForm({ settings }: { settings: any }) {
    const [searchParams, setSearchParams] = useState({
        keywords: '',
        location: '',
    })
    const [jobs, setJobs] = useState<Job[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [isApplying, setIsApplying] = useState(false)
    const [progress, setProgress] = useState({ current: 0, total: 0 })
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

    const [isAnalyzing, setIsAnalyzing] = useState(false)

    // Search for jobs using our API
    const handleSearch = async () => {
        if (!searchParams.keywords) {
            setMessage({ type: 'error', text: 'Please enter keywords to search' })
            return
        }

        setIsSearching(true)
        setMessage({ type: 'info', text: '🔍 Searching for job posts...' })
        setJobs([])

        try {
            const response = await fetch('/api/auto-search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchParams)
            })

            const data = await response.json()

            if (data.success) {
                const jobsWithIds = data.jobs.map((job: any, i: number) => ({
                    ...job,
                    id: `job-${i}-${Date.now()}`,
                    description: job.snippet || job.description
                }))
                setJobs(jobsWithIds)
                setMessage({
                    type: 'success',
                    text: `Found ${data.totalFound} jobs! ${data.withEmails} have emails ready to apply.`
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

    // Analyze job matches
    const handleAnalyzeMatches = async () => {
        if (jobs.length === 0) return

        setIsAnalyzing(true)
        setMessage({ type: 'info', text: '🧠 Analyzing job matches with AI...' })

        // Process in batches or sequentially to avoid hitting rate limits?
        // Parallel for speed, but maybe limited concurrency. Let's do sequential for safety for now.

        let processed = 0
        const jobsToAnalyze = jobs.filter(j => !j.matchScore) // Only analyze ones not yet done

        if (jobsToAnalyze.length === 0) {
            setMessage({ type: 'info', text: '✅ All jobs already analyzed.' })
            setIsAnalyzing(false)
            return
        }

        for (const job of jobsToAnalyze) {
            try {
                // Update specific job to show loading state if desired (optional)

                const response = await fetch('/api/analyze-match', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jobDescription: job.description
                    })
                })

                const result = await response.json()

                if (result.success) {
                    setJobs(prev => prev.map(j =>
                        j.id === job.id ? {
                            ...j,
                            matchScore: result.score,
                            matchReasoning: result.reasoning,
                            missingSkills: result.missingSkills
                        } : j
                    ))
                }
            } catch (e) {
                console.error('Analysis error for job', job.id, e)
            }

            processed++
            setProgress({ current: processed, total: jobsToAnalyze.length })
        }

        setIsAnalyzing(false)
        setMessage({ type: 'success', text: '✅ AI Analysis Complete!' })
    }

    // Apply to all jobs with emails
    const handleApplyAll = async () => {
        const readyJobs = jobs.filter(j => j.status === 'ready' && j.email)

        if (readyJobs.length === 0) {
            setMessage({ type: 'error', text: 'No jobs with emails to apply to!' })
            return
        }

        if (!settings?.smtpHost) {
            setMessage({ type: 'error', text: 'Please configure your email settings in Settings tab first!' })
            return
        }

        if (!settings?.resumeUrl) {
            setMessage({ type: 'error', text: 'Please upload your resume in Settings tab first!' })
            return
        }

        const confirmed = window.confirm(
            `🚀 AUTO-APPLY to ${readyJobs.length} jobs?\n\n` +
            `This will:\n` +
            `• Generate AI cover letter for each job\n` +
            `• Send email with your resume attached\n\n` +
            `Continue?`
        )
        if (!confirmed) return

        setIsApplying(true)
        setProgress({ current: 0, total: readyJobs.length })
        let sentCount = 0

        for (let i = 0; i < readyJobs.length; i++) {
            const job = readyJobs[i]
            setProgress({ current: i + 1, total: readyJobs.length })
            setMessage({ type: 'info', text: `📧 Applying ${i + 1}/${readyJobs.length}: ${job.email}` })

            // Update status to applying
            setJobs(prev => prev.map(j =>
                j.id === job.id ? { ...j, status: 'applying' as const } : j
            ))

            try {
                const response = await fetch('/api/apply-job', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jobDescription: job.description || job.snippet,
                        recruiterEmail: job.email,
                        subject: `Application for ${job.title}`
                    })
                })

                const data = await response.json()

                if (data.success) {
                    sentCount++
                    setJobs(prev => prev.map(j =>
                        j.id === job.id ? { ...j, status: 'sent' as const } : j
                    ))
                } else {
                    setJobs(prev => prev.map(j =>
                        j.id === job.id ? { ...j, status: 'failed' as const } : j
                    ))
                }

                // Delay between applications to avoid spam detection
                await new Promise(r => setTimeout(r, 3000))
            } catch (error) {
                setJobs(prev => prev.map(j =>
                    j.id === job.id ? { ...j, status: 'failed' as const } : j
                ))
            }
        }

        setIsApplying(false)
        setMessage({
            type: 'success',
            text: `✅ Done! Sent ${sentCount}/${readyJobs.length} applications successfully!`
        })
    }

    const readyCount = jobs.filter(j => j.status === 'ready').length
    const sentCount = jobs.filter(j => j.status === 'sent').length
    const failedCount = jobs.filter(j => j.status === 'failed').length

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                🤖 Auto-Apply (No Extension Needed!)
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
                Search → Find Jobs → Auto-Send Applications
            </p>

            {message && (
                <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                    message.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Search Section */}
            <div className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-semibold text-gray-900 dark:text-white">Step 1: Search for Jobs</h3>
                <div className="grid gap-4 md:grid-cols-2">
                    <input
                        type="text"
                        value={searchParams.keywords}
                        onChange={(e) => setSearchParams({ ...searchParams, keywords: e.target.value })}
                        placeholder="Job title (e.g., React Developer)"
                        className="px-4 py-3 border border-gray-300 rounded-lg dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    />
                    <input
                        type="text"
                        value={searchParams.location}
                        onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
                        placeholder="Location (e.g., Chennai)"
                        className="px-4 py-3 border border-gray-300 rounded-lg dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition"
                >
                    {isSearching ? '🔍 Searching LinkedIn...' : '🔍 Search Jobs'}
                </button>
            </div>

            {/* Results Section */}
            {jobs.length > 0 && (
                <div className="mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            Step 2: Review & Apply ({readyCount} ready, {sentCount} sent)
                        </h3>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button
                                onClick={handleAnalyzeMatches}
                                disabled={isAnalyzing || jobs.length === 0}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 transition flex-1 md:flex-none"
                            >
                                {isAnalyzing ? `🧠 Analyzing...` : `🧠 Analyze Matches`}
                            </button>
                            <button
                                onClick={handleApplyAll}
                                disabled={isApplying || readyCount === 0}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg disabled:opacity-50 transition flex-1 md:flex-none"
                            >
                                {isApplying
                                    ? `⏳ Applying ${progress.current}/${progress.total}...`
                                    : `⚡ Auto-Apply to ${readyCount} Jobs`}
                            </button>
                        </div>
                    </div>

                    {/* Progress bar */}
                    {(isApplying || isAnalyzing) && (
                        <div className="mb-4">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className={`${isAnalyzing ? 'bg-purple-600' : 'bg-green-600'} h-2 rounded-full transition-all`}
                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {jobs.map(job => (
                            <div key={job.id} className={`p-4 rounded-lg border ${job.status === 'sent' ? 'bg-green-50 border-green-300 dark:bg-green-900/30' :
                                job.status === 'failed' ? 'bg-red-50 border-red-300 dark:bg-red-900/30' :
                                    job.status === 'applying' ? 'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/30' :
                                        job.status === 'ready' ? 'bg-white border-gray-200 dark:bg-gray-700' :
                                            'bg-gray-50 border-gray-200 dark:bg-gray-800'
                                }`}>
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <div className="font-bold text-gray-900 dark:text-white text-lg">{job.title}</div>
                                            {job.matchScore !== undefined && (
                                                <div className={`px-2 py-1 rounded text-xs font-bold ${job.matchScore > 80 ? 'bg-green-100 text-green-800 border border-green-500' :
                                                    job.matchScore > 50 ? 'bg-yellow-100 text-yellow-800 border border-yellow-500' :
                                                        'bg-red-100 text-red-800 border border-red-500'
                                                    }`}>
                                                    Matches: {job.matchScore}%
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{job.author || job.company}</div>

                                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                            {job.snippet || job.description}
                                        </div>

                                        {job.matchReasoning && (
                                            <div className="mt-2 text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 p-2 rounded border border-purple-100 dark:border-purple-800">
                                                <strong>AI Analysis:</strong> {job.matchReasoning}
                                                {job.missingSkills && job.missingSkills.length > 0 && (
                                                    <div className="mt-1">
                                                        <strong>Missing:</strong> {job.missingSkills.join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="text-sm mt-3 flex items-center gap-4">
                                            {job.email ? (
                                                <span className="text-green-600 dark:text-green-400 font-medium">📧 {job.email}</span>
                                            ) : (
                                                <span className="text-gray-400">❌ No email found</span>
                                            )}
                                            <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs">
                                                View Post ↗
                                            </a>
                                        </div>
                                    </div>

                                    <span className={`px-3 py-1 rounded-full text-xs font-medium self-start md:self-center ${job.status === 'sent' ? 'bg-green-200 text-green-800' :
                                        job.status === 'failed' ? 'bg-red-200 text-red-800' :
                                            job.status === 'applying' ? 'bg-yellow-200 text-yellow-800' :
                                                job.status === 'ready' ? 'bg-blue-200 text-blue-800' :
                                                    'bg-gray-200 text-gray-600'
                                        }`}>
                                        {job.status === 'sent' ? '✅ Sent' :
                                            job.status === 'failed' ? '❌ Failed' :
                                                job.status === 'applying' ? '⏳ Sending...' :
                                                    job.status === 'ready' ? '🟢 Ready' :
                                                        '⚪ No Email'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <h4 className="font-bold text-purple-800 dark:text-purple-200 mb-2">How it works:</h4>
                <ol className="list-decimal ml-4 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                    <li><strong>Search:</strong> Enter job keywords and location</li>
                    <li><strong>Find:</strong> AI searches Google for LinkedIn job posts</li>
                    <li><strong>Analyze:</strong> Click "Analyze Matches" to see how well you fit</li>
                    <li><strong>Apply:</strong> Click "Auto-Apply" to send to all at once!</li>
                </ol>
                <p className="text-xs text-gray-500 mt-3">
                    ⚠️ Make sure you have configured Settings (SMTP email + Resume) before applying.
                </p>
            </div>
        </div>
    )
}
