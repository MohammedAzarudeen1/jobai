// AI service for generating emails and enhancing resumes
// Using Vercel AI SDK with Groq provider
// Documentation: https://ai-sdk.dev/providers/ai-sdk-providers/groq

const GROQ_API_KEY = process.env.GROQ_API_KEY || ''

// Fallback to a simple template-based approach if no API key
export async function generateCoverLetter(
  jobDescription: string,
  resumeText?: string
): Promise<string> {
  // Try Groq AI first
  if (GROQ_API_KEY) {
    console.log('✅ Groq API key detected - Using AI generation')
    console.log('🤖 Model: llama-3.3-70b-versatile')
    try {
      const result = await generateWithGroq(jobDescription, resumeText)
      console.log('✅ Cover letter generated successfully via Groq AI')
      return result
    } catch (error) {
      console.error('❌ Groq AI error:', error)
      console.log('⚠️ Falling back to template-based generation')
    }
  } else {
    console.log('⚠️ No Groq API key found - Using template-based generation')
  }

  // Fallback to template-based generation
  return generateTemplateBased(jobDescription, resumeText)
}

async function generateWithGroq(
  jobDescription: string,
  resumeText?: string
): Promise<string> {
  console.log('🔄 Initializing Groq AI SDK...')
  const { groq } = await import('@ai-sdk/groq')
  const { generateText } = await import('ai')

  const prompt = `Write a professional cover letter for a job application. Make it compelling, personalized, and highlight relevant skills and experience.

Job Description:
${jobDescription}

${resumeText ? `\nApplicant's Background:\n${resumeText.substring(0, 1000)}` : ''}

Write a professional cover letter that:
- Addresses the hiring manager professionally
- Highlights relevant skills and experience from the job description
- Shows enthusiasm for the position
- Is concise but comprehensive (3-4 paragraphs)
- Ends with a professional closing`

  console.log('📝 Prompt length:', prompt.length, 'characters')
  console.log('🎯 Temperature: 0.7, Max Tokens: 800')

  try {
    console.log('🚀 Sending request to Groq API...')
    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'), // Latest Llama 3.3 model (llama-3.1-70b-versatile was decommissioned)
      // Alternative models: 'gemma2-9b-it', 'mixtral-8x7b-32768', 'llama-3.1-8b-versatile'
      system: 'You are a professional career advisor helping write compelling cover letters for job applications.',
      prompt,
      temperature: 0.7,
      maxTokens: 800,
    })

    console.log('📊 Generation stats:')
    console.log('  - Response length:', result.text?.length || 0, 'characters')
    console.log('  - Tokens used:', result.usage?.totalTokens || 'N/A')
    console.log('  - Prompt tokens:', result.usage?.promptTokens || 'N/A')
    console.log('  - Completion tokens:', result.usage?.completionTokens || 'N/A')

    return result.text || generateTemplateBased(jobDescription, resumeText)
  } catch (error) {
    console.error('❌ Groq generation error:', error)
    console.log('⚠️ Returning template-based fallback')
    return generateTemplateBased(jobDescription, resumeText)
  }
}

function generateTemplateBased(
  jobDescription: string,
  resumeText?: string
): string {
  console.log('📄 Generating template-based cover letter...')

  // Extract key requirements from job description
  const keywords = extractKeywords(jobDescription)
  console.log('🔍 Extracted keywords:', keywords.length > 0 ? keywords.slice(0, 3).join(', ') : 'none')

  const letter = `Dear Hiring Manager,

I am writing to express my interest in the position you have posted. After reviewing the job description, I am excited about the opportunity to contribute to your team.

${keywords.length > 0 ? `I believe my experience aligns well with the requirements you've outlined, particularly in ${keywords.slice(0, 3).join(', ')}.` : 'I believe my experience and skills make me a strong candidate for this role.'}

${resumeText ? 'My background includes relevant experience that I believe would be valuable to your organization. I have attached my resume for your review.' : 'I have attached my resume for your review.'}

I am enthusiastic about the possibility of joining your team and would welcome the opportunity to discuss how my skills and experience can contribute to your organization's success.

Thank you for considering my application. I look forward to hearing from you.

Best regards,
[Your Name]`

  console.log('✅ Template-based cover letter generated')
  return letter
}

function extractKeywords(text: string): string[] {
  const commonSkills = [
    'javascript',
    'python',
    'react',
    'node',
    'typescript',
    'sql',
    'aws',
    'docker',
    'kubernetes',
    'agile',
    'scrum',
    'leadership',
    'management',
    'communication',
    'problem solving',
  ]

  const lowerText = text.toLowerCase()
  return commonSkills.filter(skill => lowerText.includes(skill))
}

export async function enhanceResumeText(
  resumeText: string,
  jobDescription: string
): Promise<string> {
  // For now, return the original text
  // In a full implementation, this would use AI to enhance the resume
  // based on job requirements
  return resumeText
}

// Generates likely email formats for a company using simple heuristics
export async function guessEmailStrategies(companyName: string): Promise<string[]> {
  const commonFormats = [
    `careers@${companyName.toLowerCase().replace(/\s/g, '')}.com`,
    `jobs@${companyName.toLowerCase().replace(/\s/g, '')}.com`,
    `hiring@${companyName.toLowerCase().replace(/\s/g, '')}.com`,
    `recruiting@${companyName.toLowerCase().replace(/\s/g, '')}.com`,
    `hr@${companyName.toLowerCase().replace(/\s/g, '')}.com`
  ]
  return commonFormats
}

export type MatchResult = {
  score: number;
  reasoning: string;
  missingSkills: string[];
}

export async function analyzeJobMatch(
  resumeText: string,
  jobDescription: string
): Promise<MatchResult> {
  const GROQ_API_KEY = process.env.GROQ_API_KEY || ''

  // If no Groq key, return mock result
  if (!GROQ_API_KEY) {
    return {
      score: 75,
      reasoning: "Good match based on keyword overlap (Mock Analysis - Add API Key for real AI analysis)",
      missingSkills: ['Unknown (AI unavailable)']
    }
  }

  const { groq } = await import('@ai-sdk/groq')
  const { generateText } = await import('ai')

  const prompt = `Analyze the fit between the candidate's resume and the job description.
  
  Job Description:
  ${jobDescription.substring(0, 2000)}

  Resume Summary:
  ${resumeText.substring(0, 1000)}

  Return a JSON object with:
  - score: number (0-100)
  - reasoning: string (brief explanation)
  - missingSkills: string[] (list of up to 3 missing key skills)
  
  Return ONLY the valid JSON.`

  try {
    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt: prompt,
      temperature: 0.1, // Low temp for consistent JSON
    })

    const text = result.text.match(/\{[\s\S]*\}/)?.[0] || '{}'
    return JSON.parse(text) as MatchResult
  } catch (e) {
    console.error("Match analysis failed", e)
    return {
      score: 0,
      reasoning: "Failed to analyze match",
      missingSkills: []
    }
  }
}


