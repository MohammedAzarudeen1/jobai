import { NextRequest, NextResponse } from 'next/server'

// This endpoint can be called by external cron services (like Vercel Cron, GitHub Actions, etc.)
// or by a simple setInterval in the client for development

export async function GET(request: NextRequest) {
  try {
    console.log('🕐 Running scheduled automation check...')

    // Get all schedules
    const schedulesResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/schedule-automation`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    const schedulesData = await schedulesResponse.json()
    
    if (!schedulesData.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to load schedules'
      }, { status: 500 })
    }

    const schedules = schedulesData.schedules
    const now = new Date()
    let ranCount = 0
    const results = []

    console.log(`📋 Checking ${schedules.length} schedules...`)

    for (const schedule of schedules) {
      if (!schedule.enabled) {
        console.log(`⏭️ Skipping disabled schedule: ${schedule.name}`)
        continue
      }

      if (!schedule.nextRun) {
        console.log(`⏭️ Skipping schedule without next run time: ${schedule.name}`)
        continue
      }

      const nextRun = new Date(schedule.nextRun)
      
      if (now >= nextRun) {
        console.log(`🚀 Running scheduled automation: ${schedule.name}`)
        
        try {
          const runResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/schedule-automation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'run',
              schedule: { id: schedule.id }
            })
          })

          const runData = await runResponse.json()
          
          results.push({
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            success: runData.success,
            message: runData.message,
            error: runData.error
          })

          if (runData.success) {
            ranCount++
            console.log(`✅ Successfully ran: ${schedule.name}`)
          } else {
            console.error(`❌ Failed to run: ${schedule.name} - ${runData.error}`)
          }

        } catch (error: any) {
          console.error(`❌ Error running schedule ${schedule.name}:`, error)
          results.push({
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            success: false,
            error: error.message
          })
        }
      } else {
        console.log(`⏰ Schedule "${schedule.name}" not due yet. Next run: ${nextRun.toLocaleString()}`)
      }
    }

    console.log(`🎉 Cron check completed. Ran ${ranCount} schedules.`)

    return NextResponse.json({
      success: true,
      message: `Cron check completed. Ran ${ranCount} out of ${schedules.length} schedules.`,
      ranCount,
      totalSchedules: schedules.length,
      results
    })

  } catch (error: any) {
    console.error('❌ Cron job error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Cron job failed'
    }, { status: 500 })
  }
}

// For development: POST endpoint to manually trigger cron
export async function POST(request: NextRequest) {
  console.log('🔧 Manual cron trigger requested')
  return GET(request)
}