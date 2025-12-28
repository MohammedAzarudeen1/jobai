import { NextRequest, NextResponse } from 'next/server'

interface JobResult {
  title: string
  snippet: string
  description: string
  url: string
  email: string | null
  status: 'ready' | 'no_email'
  author?: string
  company?: string
}

// Multiple job search sources for better coverage
async function searchGoogleJobs(keywords: string, location: string): Promise<JobResult[]> {
  try {
    // Google Custom Search for LinkedIn jobs
    const query = `site:linkedin.com/posts OR site:linkedin.com/jobs "${keywords}" ${location} email`
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_SEARCH_API_KEY}&cx=${process.env.GOOGLE_SEARCH_CX}&q=${encodeURIComponent(query)}&num=10`
    
    if (!process.env.GOOGLE_SEARCH_API_KEY) {
      console.log('🔍 No Google Search API key, using demo data')
      return generateDemoJobs(keywords, location)
    }

    const response = await fetch(searchUrl)
    const data = await response.json()
    
    if (!data.items) return []

    return data.items.map((item: any, index: number) => {
      const emailMatch = item.snippet?.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
      const email = emailMatch ? emailMatch[0] : null
      
      return {
        title: item.title || `${keywords} Position`,
        snippet: item.snippet || '',
        description: item.snippet || '',
        url: item.link,
        email,
        status: email ? 'ready' : 'no_email',
        company: extractCompanyFromTitle(item.title)
      }
    })
  } catch (error) {
    console.error('Google search failed:', error)
    return generateDemoJobs(keywords, location)
  }
}

async function searchRapidAPIJobs(keywords: string, location: string): Promise<JobResult[]> {
  try {
    if (!process.env.RAPIDAPI_KEY) {
      console.log('🔍 No RapidAPI key, skipping LinkedIn API search')
      return []
    }

    const options = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'linkedin-data-api.p.rapidapi.com'
      }
    }

    const url = `https://linkedin-data-api.p.rapidapi.com/search-jobs?keywords=${encodeURIComponent(keywords)}&locationId=${encodeURIComponent(location)}&sort=recent&start=0`
    
    const response = await fetch(url, options)
    const data = await response.json()
    
    if (!data.data) return []

    return data.data.map((job: any) => {
      const emailMatch = job.description?.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
      const email = emailMatch ? emailMatch[0] : null
      
      return {
        title: job.title || '',
        snippet: job.description?.substring(0, 200) || '',
        description: job.description || '',
        url: job.url || '',
        email,
        status: email ? 'ready' : 'no_email',
        company: job.company?.name || ''
      }
    })
  } catch (error) {
    console.error('RapidAPI search failed:', error)
    return []
  }
}

// Scrape job boards (Indeed, Glassdoor, etc.)
async function searchJobBoards(keywords: string, location: string): Promise<JobResult[]> {
  try {
    // This would integrate with job board APIs or scraping services
    // For now, return empty array - can be extended later
    console.log('🔍 Job board search not implemented yet')
    return []
  } catch (error) {
    console.error('Job board search failed:', error)
    return []
  }
}

function generateDemoJobs(keywords: string, location: string): JobResult[] {
  const companies = ['TechCorp', 'InnovateLabs', 'DataSystems', 'CloudTech', 'StartupXYZ']
  const emails = ['hr@techcorp.com', 'careers@innovatelabs.com', 'jobs@datasystems.com', 'hiring@cloudtech.com', 'recruit@startupxyz.com']
  
  return Array.from({ length: 5 }, (_, i) => ({
    title: `${keywords} Developer - ${companies[i]}`,
    snippet: `We are looking for a skilled ${keywords} developer to join our team in ${location}. Great opportunity for growth and learning.`,
    description: `Job Description: We are seeking a talented ${keywords} developer to work on exciting projects. Requirements include experience with modern technologies and strong problem-solving skills. Contact us at ${emails[i]} to apply.`,
    url: `https://example.com/job-${i + 1}`,
    email: Math.random() > 0.3 ? emails[i] : null, // 70% chance of having email
    status: Math.random() > 0.3 ? 'ready' : 'no_email',
    company: companies[i]
  }))
}

function extractCompanyFromTitle(title: string): string {
  // Extract company name from job title
  const patterns = [
    /at (.+?)(?:\s*-|\s*\||\s*$)/i,
    /- (.+?)(?:\s*-|\s*\||\s*$)/i,
    /\| (.+?)(?:\s*-|\s*\||\s*$)/i
  ]
  
  for (const pattern of patterns) {
    const match = title.match(pattern)
    if (match) return match[1].trim()
  }
  
  return ''
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

    console.log(`🔍 Searching for jobs: "${keywords}" in "${location || 'Any location'}"`)

    // Search multiple sources in parallel
    const [googleJobs, rapidAPIJobs, jobBoardJobs] = await Promise.all([
      searchGoogleJobs(keywords, location || ''),
      searchRapidAPIJobs(keywords, location || ''),
      searchJobBoards(keywords, location || '')
    ])

    // Combine and deduplicate results
    const allJobs = [...googleJobs, ...rapidAPIJobs, ...jobBoardJobs]
    const uniqueJobs = allJobs.filter((job, index, self) => 
      index === self.findIndex(j => j.url === job.url || (j.title === job.title && j.company === job.company))
    )

    // Sort by relevance (jobs with emails first, then by title match)
    uniqueJobs.sort((a, b) => {
      if (a.email && !b.email) return -1
      if (!a.email && b.email) return 1
      
      const aRelevance = a.title.toLowerCase().includes(keywords.toLowerCase()) ? 1 : 0
      const bRelevance = b.title.toLowerCase().includes(keywords.toLowerCase()) ? 1 : 0
      return bRelevance - aRelevance
    })

    const withEmails = uniqueJobs.filter(job => job.email).length
    const totalFound = uniqueJobs.length

    console.log(`✅ Found ${totalFound} jobs, ${withEmails} with contact emails`)

    return NextResponse.json({
      success: true,
      jobs: uniqueJobs,
      totalFound,
      withEmails,
      sources: {
        google: googleJobs.length,
        rapidapi: rapidAPIJobs.length,
        jobboards: jobBoardJobs.length
      }
    })

  } catch (error: any) {
    console.error('Auto-search error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Search failed'
    }, { status: 500 })
  }
}