// AI service for generating emails and enhancing resumes
// Using Vercel AI SDK with Groq + Google Generative AI providers

const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''
const GOOGLE_BASE_URL = process.env.GOOGLE_GENERATIVE_AI_BASE_URL || ''
const GROQ_API_KEY = process.env.GROQ_API_KEY || ''

// Lazily create/init the Google provider so we can inject apiKey/baseURL
let _googleFactory: any = null
async function getGoogleProvider() {
  if (_googleFactory) return _googleFactory
  try {
    const mod = await import('@ai-sdk/google')
    if (mod.createGoogleGenerativeAI) {
      _googleFactory = mod.createGoogleGenerativeAI({
        apiKey: GOOGLE_API_KEY || undefined,
        baseURL: GOOGLE_BASE_URL || undefined,
      })
    } else if (mod.google) {
      // fallback to the exported preconfigured instance
      _googleFactory = mod.google
    } else {
      throw new Error('No google export found in @ai-sdk/google')
    }
    console.log('🔧 [AI-AGENT] Google provider initialized', GOOGLE_API_KEY ? 'with API key' : 'without API key')
    return _googleFactory
  } catch (e) {
    console.error('❌ [AI-AGENT] Failed to initialize Google provider', e)
    throw e
  }
}

// Try multiple model IDs with generateText and return the first successful response.
async function tryGenerateWithGoogleModels(google: any, generateText: any, modelIds: string[], requestOpts: any) {
  for (const id of modelIds) {
    try {
      console.log(`🔁 [AI-AGENT] Trying Google model: ${id}`)
      const result = await generateText({ model: google(id), ...requestOpts })
      return { result, modelId: id }
    } catch (e: any) {
      const status = e?.statusCode || e?.data?.status || null
      const body = e?.responseBody || e?.message || ''
      console.warn(`⚠️ [AI-AGENT] Model ${id} failed: ${body?.toString?.() || body}`)
      // If model not found for this API version, try the next candidate.
      const notFound = status === 404 || /not found/i.test(body)
      if (!notFound) {
        // Non-404 errors should be surfaced.
        throw e
      }
      // else continue to next model
    }
  }
  throw new Error('No compatible Google model found from candidates')
}



// NEW: Generate both cover letter AND email subject in ONE AI call (optimized)
export async function generateCoverLetterAndSubject(
  jobDescription: string,
  resumeText?: string
): Promise<{ coverLetter: string; subject: string }> {
  console.log('\n🤖 [AI-AGENT] COMBINED TASK: COVER LETTER + EMAIL SUBJECT (Single AI Call)')

  const combinedPrompt = `You are an expert job application writer. Generate BOTH a professional cover letter AND an email subject line for a job application.

Job Description:
${jobDescription}

Applicant's Resume/Background (TRUE SOURCE OF TRUTH):
${resumeText || 'No resume provided.'}

OUTPUT FORMAT (MUST FOLLOW EXACTLY):
---SUBJECT---
[Professional email subject line, under 60 characters]
---LETTER---
[Professional cover letter with:
- Professional Salutation
- Opening: Strong hook aligning resume to job
- Body: Map ACTUAL resume skills to job requirements
- Closing: Professional sign-off]

RULES:
1. ONLY claim skills in the resume
2. Do NOT mention missing skills directly
3. Frame everything positively
4. Do NOT hallucinate experience`

  try {
    let result: any = null
    let modelId = 'unknown'

    if (GROQ_API_KEY) {
      console.log('✅ [AI-AGENT] Using GROQ for combined generation (fast)')
      const { groq } = await import('@ai-sdk/groq')
      const { generateText } = await import('ai')
      result = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        prompt: combinedPrompt,
        temperature: 0.6,
      })
      modelId = 'groq-llama'
    } else if (GOOGLE_API_KEY) {
      console.log('✅ [AI-AGENT] Using GEMINI for combined generation (fallback)')
      const google = await getGoogleProvider()
      const { generateText } = await import('ai')
      const candidates = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash-latest', 'gemini-1.5-flash']
      const response = await tryGenerateWithGoogleModels(google, generateText, candidates, { prompt: combinedPrompt, temperature: 0.6 })
      result = response.result
      modelId = response.modelId
    } else {
      console.warn('⚠️ [AI-AGENT] No AI keys. Using template fallback.')
      return {
        coverLetter: generateTemplateBased(jobDescription, resumeText),
        subject: `Application for Position - ${new Date().toLocaleDateString()}`
      }
    }

    // Parse the response
    const text = result.text || ''
    const subjectMatch = text.match(/---SUBJECT---([\s\S]*?)---LETTER---/)
    const letterMatch = text.match(/---LETTER---([\s\S]*?)$/)

    const subject = subjectMatch ? subjectMatch[1].trim() : `Application for Position - ${new Date().toLocaleDateString()}`
    const coverLetter = letterMatch ? letterMatch[1].trim() : generateTemplateBased(jobDescription, resumeText)

    console.log(`🔹 [AI-AGENT] Combined generation succeeded with model ${modelId}`)
    console.log(`   Subject: "${subject}"`)
    console.log(`   Letter length: ${coverLetter.length} chars`)

    return {
      coverLetter,
      subject
    }
  } catch (error) {
    console.error('❌ [AI-AGENT] Combined generation failed:', error)
    return {
      coverLetter: generateTemplateBased(jobDescription, resumeText),
      subject: `Application for Position - ${new Date().toLocaleDateString()}`
    }
  }
}

// NEW: Use Gemini Vision to read PDF
export async function parseResumeWithGemini(pdfUrl: string): Promise<string> {
  console.log('\n👓 [AI-AGENT] TASK: READ RESUME PDF')

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.warn("⚠️ [AI-AGENT] SKIPPED: No Google Key for Vision.")
    return ""
  }

  try {
    console.log('🔎 [AI-AGENT] Sending PDF to Gemini Vision...')
    const google = await getGoogleProvider()
    const { generateText } = await import('ai')

    // Try candidate models in order until one supports file/generateContent
    const pdfRequest = {
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Transcribe this resume exactly. Output the full plain text content. Do not summarize.' },
            { type: 'file', data: pdfUrl, mediaType: 'application/pdf' }
          ]
        }
      ]
    }

    const candidates = [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash'
    ]

    try {
      const { result, modelId } = await tryGenerateWithGoogleModels(google, generateText, candidates, pdfRequest)
      console.log(`✅ [AI-AGENT] SUCCESS: Gemini (${modelId}) extracted ${result.text?.length || 0} characters.`)
      return result.text || ''
    } catch (e) {
      console.error("❌ [AI-AGENT] GEMINI VISION FAILED:", e)
      return ""
    }
  } catch (e) {
    console.error("❌ [AI-AGENT] GEMINI VISION FAILED:", e)
    return ""
  }
}

function generateTemplateBased(
  jobDescription: string,
  resumeText?: string
): string {
  console.log('📄 Generating template-based cover letter...')
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
  const commonSkills = ['javascript', 'python', 'react', 'node', 'typescript', 'sql', 'aws', 'docker', 'kubernetes', 'agile', 'scrum', 'leadership', 'management', 'communication', 'problem solving']
  const lowerText = text.toLowerCase()
  return commonSkills.filter(skill => lowerText.includes(skill))
}

export type MatchResult = {
  score: number;
  reasoning: string;
  missingSkills: string[];
}

export async function getEmbedding(text: string): Promise<number[]> {
  const { embed } = await import('ai')
  const google = await getGoogleProvider()
  const { embedding } = await embed({
    model: google.textEmbedding('text-embedding-004'),
    value: text.replace(/\n/g, ' '),
  })
  return embedding
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0)
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0))
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0))
  return dotProduct / (magnitudeA * magnitudeB)
}

export async function analyzeJobMatch(
  resumeText: string,
  jobDescription: string
): Promise<MatchResult> {
  console.log('\n🧠 [AI-AGENT] TASK: ANALYZE JOB MATCH')
  const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
  const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''

  let semanticScore = 0;
  let useEmbeddings = false;

  if (GOOGLE_API_KEY) {
    try {
      console.log('🔹 [AI-AGENT] Sub-task: Generate Embeddings (Gemini Text-Embedding-004)')
      const [resumeVector, jobVector] = await Promise.all([
        getEmbedding(resumeText),
        getEmbedding(jobDescription)
      ])
      const similarity = cosineSimilarity(resumeVector, jobVector);
      semanticScore = Math.round(similarity * 100);
      useEmbeddings = true;
      console.log(`   Result: ${semanticScore}% Semantic Match`)
    } catch (e) {
      console.error("   Failed to generate embeddings:", e)
    }
  }

  if (!GROQ_API_KEY && !GOOGLE_API_KEY) {
    console.warn('⚠️ [AI-AGENT] No Keys. Returning Mock Data.')
    return { score: 75, reasoning: "Mock Analysis (No API Key)", missingSkills: ['Unknown'] }
  }

  const { groq } = await import('@ai-sdk/groq')
  const google = await getGoogleProvider()
  const { generateText } = await import('ai')

  const prompt = `Analyze the fit between the candidate's resume and the job description.
  
  Job Description:
  ${jobDescription.substring(0, 2000)}

  Resume Summary:
  ${resumeText.substring(0, 1000)}

  ${useEmbeddings ? `NOTE: The Semantic Embedding Similarity score is ${semanticScore}%. usage this as a baseline.` : ''}

  Return a JSON object with:
  - score: number (0-100) ${useEmbeddings ? '(Weigh the Semantic Score lightly against your own reasoning)' : ''}
  - reasoning: string (brief explanation)
  - missingSkills: string[] (list of up to 3 missing key skills)
  
  Return ONLY the valid JSON.`

  const providerName = GOOGLE_API_KEY ? 'GEMINI (Flash)' : 'GROQ (Llama-3)';
  console.log(`🔹 [AI-AGENT] Sub-task: Logic/Reasoning -> Provider: ${providerName}`)

  try {
    if (GOOGLE_API_KEY) {
      const candidates = [
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash'
      ]
      const { result, modelId } = await tryGenerateWithGoogleModels(google, generateText, candidates, { prompt, temperature: 0.1 })
      console.log(`🔹 [AI-AGENT] Analysis used model ${modelId}`)
      const text = result.text.match(/\{[\s\S]*\}/)?.[0] || '{}'
      return JSON.parse(text) as MatchResult
    } else {
      const result = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        prompt: prompt,
        temperature: 0.1,
      })
      const text = result.text.match(/\{[\s\S]*\}/)?.[0] || '{}'
      return JSON.parse(text) as MatchResult
    }
  } catch (e) {
    console.error("Match Analysis Failed", e)
    return { score: semanticScore || 0, reasoning: "Error", missingSkills: [] }
  }
}
