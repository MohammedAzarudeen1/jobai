'use client'

import { useEffect, useState } from 'react'

export default function AutomationScheduler() {
  const [isRunning, setIsRunning] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [nextCheck, setNextCheck] = useState<Date | null>(null)
  const [status, setStatus] = useState<string>('Stopped')

  useEffect(() => {
    let interval: NodeJS.Timeout

    const runScheduler = async () => {
      if (!isRunning) return

      try {
        setStatus('Checking schedules...')
        setLastCheck(new Date())

        const response = await fetch('/api/cron', {
          method: 'GET'
        })

        const data = await response.json()
        
        if (data.success) {
          setStatus(`✅ Last check: ${data.ranCount} schedules ran`)
        } else {
          setStatus(`❌ Error: ${data.error}`)
        }

        // Schedule next check in 5 minutes
        const next = new Date(Date.now() + 5 * 60 * 1000)
        setNextCheck(next)

      } catch (error: any) {
        setStatus(`❌ Connection error: ${error.message}`)
        console.error('Scheduler error:', error)
      }
    }

    if (isRunning) {
      // Run immediately
      runScheduler()
      
      // Then run every 5 minutes
      interval = setInterval(runScheduler, 5 * 60 * 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning])

  const toggleScheduler = () => {
    setIsRunning(!isRunning)
    if (!isRunning) {
      setStatus('Starting scheduler...')
    } else {
      setStatus('Stopped')
      setNextCheck(null)
    }
  }

  const runNow = async () => {
    try {
      setStatus('Running manual check...')
      
      const response = await fetch('/api/cron', {
        method: 'POST'
      })

      const data = await response.json()
      
      if (data.success) {
        setStatus(`✅ Manual run: ${data.ranCount} schedules executed`)
        setLastCheck(new Date())
      } else {
        setStatus(`❌ Manual run failed: ${data.error}`)
      }
    } catch (error: any) {
      setStatus(`❌ Manual run error: ${error.message}`)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-purple-500">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          🤖 Automation Scheduler
          <span className={`px-2 py-1 rounded text-xs ${
            isRunning ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'
          }`}>
            {isRunning ? 'Running' : 'Stopped'}
          </span>
        </h3>
        <div className="flex gap-2">
          <button
            onClick={runNow}
            disabled={status.includes('Running') || status.includes('Checking')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50 transition"
          >
            Run Now
          </button>
          <button
            onClick={toggleScheduler}
            className={`px-3 py-1 rounded text-sm transition ${
              isRunning 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isRunning ? 'Stop' : 'Start'}
          </button>
        </div>
      </div>
      
      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
        <div>Status: {status}</div>
        {lastCheck && (
          <div>Last Check: {lastCheck.toLocaleTimeString()}</div>
        )}
        {nextCheck && (
          <div>Next Check: {nextCheck.toLocaleTimeString()}</div>
        )}
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        💡 In development mode, this runs every 5 minutes. In production, use Vercel Cron or similar.
      </div>
    </div>
  )
}