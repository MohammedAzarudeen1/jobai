import { NextRequest, NextResponse } from 'next/server'
import { getSettings } from '@/lib/storage'

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

// In a real app, this would be stored in a database
// For now, we'll use a simple in-memory store
let automationSchedules: AutomationSchedule[] = []

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      schedules: automationSchedules
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, schedule } = await request.json()

    switch (action) {
      case 'create':
        return await createSchedule(schedule)
      case 'update':
        return await updateSchedule(schedule)
      case 'delete':
        return await deleteSchedule(schedule.id)
      case 'run':
        return await runSchedule(schedule.id)
      case 'toggle':
        return await toggleSchedule(schedule.id)
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Schedule automation error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Schedule operation failed'
    }, { status: 500 })
  }
}

async function createSchedule(scheduleData: Partial<AutomationSchedule>) {
  const newSchedule: AutomationSchedule = {
    id: `schedule-${Date.now()}`,
    name: scheduleData.name || 'Untitled Schedule',
    keywords: scheduleData.keywords || [],
    location: scheduleData.location || '',
    minMatchScore: scheduleData.minMatchScore || 70,
    maxApplicationsPerRun: scheduleData.maxApplicationsPerRun || 5,
    frequency: scheduleData.frequency || 'daily',
    enabled: scheduleData.enabled ?? true,
    totalApplicationsSent: 0,
    customMessage: scheduleData.customMessage || '',
    nextRun: calculateNextRun(scheduleData.frequency || 'daily')
  }

  automationSchedules.push(newSchedule)

  console.log(`📅 Created automation schedule: ${newSchedule.name}`)

  return NextResponse.json({
    success: true,
    schedule: newSchedule,
    message: 'Schedule created successfully'
  })
}

async function updateSchedule(scheduleData: AutomationSchedule) {
  const index = automationSchedules.findIndex(s => s.id === scheduleData.id)
  
  if (index === -1) {
    return NextResponse.json({
      success: false,
      error: 'Schedule not found'
    }, { status: 404 })
  }

  automationSchedules[index] = {
    ...scheduleData,
    nextRun: calculateNextRun(scheduleData.frequency)
  }

  return NextResponse.json({
    success: true,
    schedule: automationSchedules[index],
    message: 'Schedule updated successfully'
  })
}

async function deleteSchedule(scheduleId: string) {
  const index = automationSchedules.findIndex(s => s.id === scheduleId)
  
  if (index === -1) {
    return NextResponse.json({
      success: false,
      error: 'Schedule not found'
    }, { status: 404 })
  }

  const deletedSchedule = automationSchedules.splice(index, 1)[0]

  return NextResponse.json({
    success: true,
    message: `Schedule "${deletedSchedule.name}" deleted successfully`
  })
}

async function toggleSchedule(scheduleId: string) {
  const schedule = automationSchedules.find(s => s.id === scheduleId)
  
  if (!schedule) {
    return NextResponse.json({
      success: false,
      error: 'Schedule not found'
    }, { status: 404 })
  }

  schedule.enabled = !schedule.enabled
  
  if (schedule.enabled) {
    schedule.nextRun = calculateNextRun(schedule.frequency)
  }

  return NextResponse.json({
    success: true,
    schedule,
    message: `Schedule ${schedule.enabled ? 'enabled' : 'disabled'}`
  })
}

async function runSchedule(scheduleId: string) {
  const schedule = automationSchedules.find(s => s.id === scheduleId)
  
  if (!schedule) {
    return NextResponse.json({
      success: false,
      error: 'Schedule not found'
    }, { status: 404 })
  }

  try {
    console.log(`🚀 Running scheduled automation: ${schedule.name}`)

    // Step 1: Search for jobs
    const searchResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auto-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keywords: schedule.keywords.join(' '),
        location: schedule.location
      })
    })

    const searchData = await searchResponse.json()
    
    if (!searchData.success) {
      throw new Error(`Job search failed: ${searchData.error}`)
    }

    // Step 2: Filter jobs with emails
    const jobsWithEmails = searchData.jobs.filter((job: any) => job.email)
    
    if (jobsWithEmails.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No jobs with contact emails found',
        results: { totalProcessed: 0, successful: 0 }
      })
    }

    // Step 3: Apply to jobs in bulk
    const bulkResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auto-apply-bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobs: jobsWithEmails.slice(0, schedule.maxApplicationsPerRun),
        minMatchScore: schedule.minMatchScore,
        maxApplications: schedule.maxApplicationsPerRun,
        customMessage: schedule.customMessage
      })
    })

    const bulkData = await bulkResponse.json()
    
    if (!bulkData.success) {
      throw new Error(`Bulk application failed: ${bulkData.error}`)
    }

    // Update schedule stats
    schedule.lastRun = new Date()
    schedule.nextRun = calculateNextRun(schedule.frequency)
    schedule.totalApplicationsSent += bulkData.summary.successful

    console.log(`✅ Scheduled automation completed: ${bulkData.summary.successful} applications sent`)

    return NextResponse.json({
      success: true,
      message: `Automation completed: ${bulkData.summary.successful} applications sent`,
      results: bulkData.summary,
      schedule
    })

  } catch (error: any) {
    console.error(`❌ Scheduled automation failed for ${schedule.name}:`, error)
    
    schedule.lastRun = new Date()
    schedule.nextRun = calculateNextRun(schedule.frequency)

    return NextResponse.json({
      success: false,
      error: error.message,
      schedule
    }, { status: 500 })
  }
}

function calculateNextRun(frequency: string): Date {
  const now = new Date()
  
  switch (frequency) {
    case 'hourly':
      return new Date(now.getTime() + 60 * 60 * 1000) // 1 hour
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000) // Default to daily
  }
}