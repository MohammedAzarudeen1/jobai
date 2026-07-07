import { getGoogleProvider, tryGenerateWithGoogleModels } from './ai'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { uploadToCloudinary } from './cloudinary'

const execAsync = promisify(exec)

export interface MatchAnalysis {
  strongMatches: string[]
  gapsToBridge: string[]
  hardGaps: string[]
}

export async function analyzeMatchForLatex(
  jobDescription: string,
  baseTemplate: string
): Promise<MatchAnalysis> {
  console.log('\n🧠 [AI-AGENT] TASK: LATEX MATCH ANALYSIS')
  const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
  const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''

  const prompt = `You are an expert technical recruiter and career coach.
Analyze the fit between the candidate's base resume template and the job description.

Job Description:
${jobDescription.substring(0, 3000)}

Candidate's Base Resume (LaTeX format, extract skills/experience from this):
${baseTemplate.substring(0, 3000)}

Provide an honest assessment. Return a JSON object with EXACTLY these keys:
- "strongMatches": array of strings (Skills and experience the candidate possesses that exactly match the JD)
- "gapsToBridge": array of strings (Areas where candidate has adjacent experience that can be positioned well)
- "hardGaps": array of strings (Honest gaps: requirements in the JD that the candidate completely lacks)

Return ONLY valid JSON, no markdown formatting or extra text.`

  try {
    if (GOOGLE_API_KEY) {
      const google = await getGoogleProvider()
      const { generateText } = await import('ai')
      const candidates = [
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-1.5-flash',
      ]
      const { result } = await tryGenerateWithGoogleModels(google, generateText, candidates, { prompt, temperature: 0.1 })
      const text = result.text.match(/\{[\s\S]*\}/)?.[0] || '{"strongMatches":[],"gapsToBridge":[],"hardGaps":[]}'
      return JSON.parse(text) as MatchAnalysis
    } else if (GROQ_API_KEY) {
      const { groq } = await import('@ai-sdk/groq')
      const { generateText } = await import('ai')
      const result = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        prompt: prompt,
        temperature: 0.1,
      })
      const text = result.text.match(/\{[\s\S]*\}/)?.[0] || '{"strongMatches":[],"gapsToBridge":[],"hardGaps":[]}'
      return JSON.parse(text) as MatchAnalysis
    }
    
    // Fallback if no API keys
    return { strongMatches: ['Template matching'], gapsToBridge: ['Needs API keys'], hardGaps: ['No AI keys configured'] }
  } catch (e) {
    console.error("Match Analysis Failed", e)
    return { strongMatches: [], gapsToBridge: [], hardGaps: [] }
  }
}

export async function generateTailoredLatex(
  jobDescription: string,
  baseTemplate: string,
  analysis: MatchAnalysis,
  userFeedback?: string
): Promise<string> {
  console.log('\n📝 [AI-AGENT] TASK: GENERATE TAILORED LATEX')
  const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
  const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''

  const prompt = `You are an expert LaTeX resume writer. Your task is to fill in the provided base LaTeX resume template specifically for the given Job Description.

Job Description:
${jobDescription.substring(0, 3000)}

Match Analysis (Use this to guide your wording):
- Strong Matches: ${analysis.strongMatches.join(', ')}
- Gaps to Bridge: ${analysis.gapsToBridge.join(', ')}
- Hard Gaps: ${analysis.hardGaps.join(', ')}

${userFeedback ? `\nUSER FEEDBACK FOR REVISION:\nThe user wants changes to the previous generation: "${userFeedback}"\nEnsure you apply this feedback exactly.\n` : ''}

Base LaTeX Template:
\`\`\`latex
${baseTemplate}
\`\`\`

INSTRUCTIONS & STRICT RULES:
1. Output the ENTIRE updated LaTeX file. Do not truncate or skip sections. Return ONLY the raw LaTeX code (no \`\`\`latex wrappers). Start immediately with \\documentclass.
2. EXACT JD MATCHING: Front-load missing keywords in the Summary. Put the most important JD keywords in bullet #1 of experience. Repeat critical keywords across Summary, Skills, and Bullets.
3. WORD-FOR-WORD BULLETS: Copy responsibility phrases word-for-word from the JD into the bullets where applicable. Label skills rows to match JD sections (Required, Preferred, Good to Have). Use the same role title from the JD.
4. SMART BRIDGING: Bridge partial gaps honestly (e.g. if JD wants MySQL and candidate has Prisma, bridge it; if JD wants Python and candidate has Node, note Node covers backend; if only GraphQL exposure, mention it honestly).
5. CONDITIONAL PROJECT REPLACEMENT: IF the Job Description is heavily related to React Native, Mobile Development, or Mobile APKs, you MUST replace 2 of the candidate's existing projects in the template with the "Lobbi Player App" project. Use these exact details to formulate the bullets:
   - Built a cross-platform iOS & Android app with React Native 0.81 / Expo SDK 54 and file-based expo-router (50+ screens).
   - Implemented secure JWT authentication with phone-OTP, proactive token refresh, and a queued 401 retry Axios interceptor.
   - Engineered real-time chat over native WebSockets supporting 1:1 & group messaging, voice notes, and media.
   - Developed an end-to-end venue booking & payments flow integrating Cashfree gateway with slot locking and QR check-in.
   - Architected a modular 40-service API layer with in-memory caching and route prefetching for instant first paint.
   - Built matchmaking, AI team balancing, live match scoring, and tournaments with brackets.
   - Integrated Firebase Cloud Messaging (FCM) push notifications with deep-link routing.
   - Implemented a player rating system with SHA-256 hash-chained match history for tamper-evident integrity.
6. FORMATTING: Always ensure exactly 1 page length. Ensure the Education section remains fully visible. Ensure clean LaTeX compilation with no errors.
7. DEFAULT DATES: Use "Jan 2024 -- Present" (2+ years) by default. Only use "Jun 2023 -- Present" (3 years) if the user explicitly requested it.
8. PROJECT COUNTS: Never write "15+" projects -- use "multiple production" instead.
9. NEVER FABRICATE: Won't add technologies (like Python, Java, K8s) if not in the profile. Won't invent certifications or degrees. Won't claim expertise if it's only exposure. Won't overclaim experience years.
10. PREAMBLE: Do NOT change the preamble (margins, packages, layout) unless strictly necessary to fit it into 1 page.
11. HARD GAPS: Never ignore hard gaps. Don't invent skills to fill them.

Return ONLY the raw LaTeX code. Do NOT wrap it in markdown \`\`\`latex blocks.`

  try {
    let resultText = ''
    if (GROQ_API_KEY) {
      const { groq } = await import('@ai-sdk/groq')
      const { generateText } = await import('ai')
      const result = await generateText({
        model: groq('llama-3.3-70b-versatile'),
        prompt: prompt,
        temperature: 0.3,
      })
      resultText = result.text
    } else if (GOOGLE_API_KEY) {
      const google = await getGoogleProvider()
      const { generateText } = await import('ai')
      const candidates = [
        'gemini-2.5-pro',
        'gemini-1.5-pro',
        'gemini-2.5-flash'
      ]
      const { result } = await tryGenerateWithGoogleModels(google, generateText, candidates, { prompt, temperature: 0.3 })
      resultText = result.text
    } else {
      return baseTemplate // fallback
    }

    // Clean up if the AI still wrapped it in markdown
    let cleanLatex = resultText.trim()
    if (cleanLatex.startsWith('```latex')) {
      cleanLatex = cleanLatex.replace(/^```latex/, '')
      cleanLatex = cleanLatex.replace(/```$/, '')
    } else if (cleanLatex.startsWith('```')) {
      cleanLatex = cleanLatex.replace(/^```/, '')
      cleanLatex = cleanLatex.replace(/```$/, '')
    }
    
    return cleanLatex.trim()
  } catch (e) {
    console.error("LaTeX Generation Failed", e)
    throw e
  }
}

export async function compileLatexToPdf(latexString: string): Promise<{ url: string, publicId: string }> {
  console.log('\n⚙️ [AI-AGENT] TASK: COMPILE LATEX TO PDF')
  
  // Create a temporary directory
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jobai-latex-'))
  const texPath = path.join(tmpDir, 'resume.tex')
  const pdfPath = path.join(tmpDir, 'resume.pdf')
  
  try {
    // Write the .tex file
    await fs.writeFile(texPath, latexString, 'utf8')
    console.log(`Wrote temporary .tex file to ${texPath}`)

    // Run pdflatex
    // -interaction=nonstopmode prevents it from hanging on errors
    console.log('Running pdflatex...')
    try {
      await execAsync(`pdflatex -interaction=nonstopmode -output-directory="${tmpDir}" "${texPath}"`)
    } catch (execError: any) {
      // pdflatex often exits with code 1 if there are minor warnings/errors, but still generates a PDF.
      // We will check if the PDF exists before completely failing.
      console.warn("pdflatex returned an error code, checking if PDF was still created...", execError.message)
    }

    // Verify PDF was created
    try {
      await fs.access(pdfPath)
    } catch {
      throw new Error("PDF compilation failed. No output file was generated. Your LaTeX template might have fatal syntax errors.")
    }

    // Read the generated PDF
    const pdfBuffer = await fs.readFile(pdfPath)
    console.log('PDF generated successfully, uploading to Cloudinary...')

    // Upload to Cloudinary to get a permanent URL
    const result = await uploadToCloudinary(pdfBuffer, 'jobai-tailored-resumes')
    console.log(`Uploaded generated PDF to ${result.url}`)
    
    return result
  } finally {
    // Clean up temporary files
    try {
      await fs.rm(tmpDir, { recursive: true, force: true })
      console.log(`Cleaned up temporary directory ${tmpDir}`)
    } catch (cleanupError) {
      console.error(`Failed to clean up temp directory ${tmpDir}:`, cleanupError)
    }
  }
}
