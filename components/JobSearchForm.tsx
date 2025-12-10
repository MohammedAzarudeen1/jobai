'use client'

import { useState } from 'react'

export default function JobSearchForm() {
    const [searchParams, setSearchParams] = useState({
        keywords: 'react',
        location: 'chennai',
        timeFilter: 'past-24h'
    })

    const handleSearch = () => {
        // Construct LinkedIn search URL directly
        const linkedInUrl = `https://www.linkedin.com/search/results/content/?datePosted="${searchParams.timeFilter}"&keywords=${encodeURIComponent(searchParams.keywords + ' ' + searchParams.location)}&sid=MIG`
        window.open(linkedInUrl, '_blank')
    }

    const handleGoogleSearch = () => {
        // Construct Google search URL for LinkedIn jobs
        const query = `site:linkedin.com/jobs "${searchParams.keywords}" ${searchParams.location}`
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`
        window.open(googleUrl, '_blank')
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Find Jobs</h2>

            <div className="space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🚀 Free Automation Workflow</h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                        1. Search for jobs below (LinkedIn or Google).<br />
                        2. Use the <strong>JobAI Chrome Extension</strong> to clip the job and auto-fill the application!
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Job Title / Keywords
                        </label>
                        <input
                            type="text"
                            value={searchParams.keywords}
                            onChange={(e) => setSearchParams({ ...searchParams, keywords: e.target.value })}
                            placeholder="e.g., React Developer, Data Analyst"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Location
                        </label>
                        <input
                            type="text"
                            value={searchParams.location}
                            onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
                            placeholder="e.g., Chennai, Bangalore, Remote"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Posted Within
                        </label>
                        <select
                            value={searchParams.timeFilter}
                            onChange={(e) => setSearchParams({ ...searchParams, timeFilter: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="past-24h">Past 24 hours</option>
                            <option value="past-week">Past week</option>
                            <option value="past-month">Past month</option>
                            <option value="">Any time</option>
                        </select>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <button
                            onClick={handleSearch}
                            className="flex items-center justify-center gap-2 p-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
                        >
                            <span className="text-2xl">🔗</span>
                            <div className="text-left">
                                <div className="font-bold">Search on LinkedIn</div>
                                <div className="text-xs opacity-90">Direct search</div>
                            </div>
                        </button>

                        <button
                            onClick={handleGoogleSearch}
                            className="flex items-center justify-center gap-2 p-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
                        >
                            <span className="text-2xl">🔍</span>
                            <div className="text-left">
                                <div className="font-bold">Search via Google</div>
                                <div className="text-xs opacity-90">LinkedIn jobs only</div>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="text-center">
                        <div className="text-3xl mb-2">🧩</div>
                        <div className="font-semibold text-gray-900 dark:text-white">Chrome Extension</div>
                        <div className="text-sm text-gray-500">Load from: chrome-extension/ folder</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
