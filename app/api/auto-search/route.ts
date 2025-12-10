import { NextRequest, NextResponse } from 'next/server'

interface JobPost {
    id: string
    title: string
    author: string
    company: string
    description: string
    url: string
    email: string | null
    posted: string
    status: 'ready' | 'no_email'
}

export async function POST(request: NextRequest) {
    try {
        const { keywords, location } = await request.json()

        if (!keywords) {
            return NextResponse.json({
                success: false,
                error: 'Keywords are required'
            }, { status: 400 })
        }

        const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY

        // Demo Mode logic (keep as is)
        if (!RAPIDAPI_KEY) {
            console.log('⚠️ No RAPIDAPI_KEY - returning demo data')
            // ... demo data ...
            const demoJobs: JobPost[] = [
                {
                    id: 'demo-1',
                    title: `Hiring: ${keywords} Developer`,
                    author: 'HR Manager',
                    company: 'Tech Solutions Ltd',
                    description: `Looking for experienced ${keywords} developers in ${location || 'India'}. 
          🔹 Experience: 2-5 years
          🔹 Location: ${location || 'Remote'}
          📧 Apply: careers@techsolutions.com`,
                    url: 'https://linkedin.com/posts/demo1',
                    email: 'careers@techsolutions.com',
                    posted: '2 hours ago',
                    status: 'ready'
                },
                {
                    id: 'demo-2',
                    title: `Urgent Requirement - ${keywords}`,
                    author: 'Recruiter',
                    company: 'InfoTech Pvt Ltd',
                    description: `We are hiring ${keywords} professionals!
          📍 Location: ${location || 'Chennai/Bangalore'}
          💼 Experience: 3+ years
          ✉️ Send resume to: jobs@infotech.in`,
                    url: 'https://linkedin.com/posts/demo2',
                    email: 'jobs@infotech.in',
                    posted: '5 hours ago',
                    status: 'ready'
                },
                {
                    id: 'demo-3',
                    title: `${keywords} Opening - Fresh/Experienced`,
                    author: 'Talent Acquisition',
                    company: 'Global Systems',
                    description: `Multiple openings for ${keywords}!
          🏢 Company: Global Systems
          📍 ${location || 'Multiple locations'}
          📧 hr@globalsystems.com`,
                    url: 'https://linkedin.com/posts/demo3',
                    email: 'hr@globalsystems.com',
                    posted: '1 day ago',
                    status: 'ready'
                }
            ]

            return NextResponse.json({
                success: true,
                isDemo: true,
                message: '📌 Demo mode - Add RAPIDAPI_KEY to .env.local for real LinkedIn search',
                totalFound: demoJobs.length,
                withEmails: demoJobs.filter(j => j.email).length,
                jobs: demoJobs
            })
        }

        // Real API call to LinkedIn Data API (search-jobs endpoint)
        // The previous endpoint /search-posts returned 404. Switching to /search-jobs
        console.log(`🔍 Searching LinkedIn Jobs for: ${keywords} in ${location || 'anywhere'}`)

        // Construct query parameters
        const params = new URLSearchParams()
        params.append('keywords', keywords)
        if (location) {
            params.append('locationId', '92000000') // 'Worldwide' as fallback if location isn't a GeoUR? 
            // Actually, many APIs take a string location or require a mapping. 
            // Let's try passing 'location' as text first if the API supports it, possibly as 'location'.
            // If not, we might need to search for a location ID first. 
            // For now, let's try combining it into keywords if we can't find a location param documentation.
            // But typically /search-jobs has a location param.
            // Let's stick to 'keywords' having both if we are unsure, OR try 'location' param.
            // The search result said "location" parameter exists.
            params.append('location', location)
        }
        params.append('datePosted', 'past24Hours')
        params.append('sort', 'mostRecent')

        const response = await fetch(
            `https://linkedin-data-api.p.rapidapi.com/search-jobs?${params.toString()}`,
            {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': RAPIDAPI_KEY,
                    'x-rapidapi-host': 'linkedin-data-api.p.rapidapi.com'
                }
            }
        )

        if (!response.ok) {
            const errorText = await response.text()
            console.error('LinkedIn API error:', response.status, response.statusText, errorText)
            return NextResponse.json({
                success: false,
                error: `LinkedIn API error: ${response.status} ${response.statusText} - ${errorText}`
            }, { status: response.status })
        }

        const data = await response.json()

        console.log(`📋 LinkedIn API response:`, JSON.stringify(data).substring(0, 500))

        // Extract jobs from response (adjusting for potential response structure)
        // Common structures: data[], items[], jobs[]
        const jobResults = data.data || data.items || data.jobs || []

        if (!jobResults.length) {
            return NextResponse.json({
                success: true,
                totalFound: 0,
                withEmails: 0,
                jobs: [],
                message: 'No jobs found for this search.'
            })
        }

        // Process jobs and extract emails (emails are rarely in job summaries, but we scan anyway)
        // Note: To get emails, we usually need to fetch job details. For now, we scrape the summary.
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

        const jobs: JobPost[] = jobResults.map((job: any, index: number) => {
            const text = job.description || job.snippet || ''
            const emails = text.match(emailRegex) || []

            return {
                id: job.id || job.urn || `job-${index}`,
                title: job.title || 'Job Title',
                author: job.company?.name || job.company || 'Unknown Company', // Mapping company name to author for consistent UI
                company: job.company?.name || job.company || 'Unknown Company',
                description: text.substring(0, 500),
                url: job.url || job.link || `https://www.linkedin.com/jobs/view/${job.id}`,
                email: emails[0] || null,
                posted: job.postedDate || job.date || 'Recently',
                status: emails[0] ? 'ready' as const : 'no_email' as const
            }
        })

        const jobsWithEmails = jobs.filter(j => j.email)

        console.log(`✅ Found ${jobs.length} jobs, ${jobsWithEmails.length} with emails`)

        return NextResponse.json({
            success: true,
            totalFound: jobs.length,
            withEmails: jobsWithEmails.length,
            jobs
        })

    } catch (error: any) {
        console.error('Auto search error:', error)
        return NextResponse.json({
            success: false,
            error: error.message || 'Search failed'
        }, { status: 500 })
    }
}
