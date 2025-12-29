import { NextRequest, NextResponse } from 'next/server'
import { createWorker } from 'tesseract.js'
import { analysisCache } from '@/lib/analysisCache'
import { analyzeJobScreenshotWithGemini } from '@/lib/ai'

export async function POST(request: NextRequest) {
    try {
        const { image } = await request.json() // Base64 image

        if (!image) {
            return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 })
        }

        console.log('📸 [API] Analyzing screenshot with AI...')

        // Fetch resume text for better analysis (if available)
        const { getSettings } = await import('@/lib/storage')
        const settings = await getSettings()
        const resumeText = settings?.resumeText || ""

        let description = ""
        let emails: string[] = []
        let coverLetter = ""
        let subject = ""
        let method = "Gemini Vision"

        try {
            // 1. Primary Method: Gemini Vision (Context Aware Extraction)
            const aiResult = await analyzeJobScreenshotWithGemini(image)
            description = aiResult.description
            emails = aiResult.emails

            // Fallback check: if Gemini returned empty, try OCR
            if (!description || description.length < 50) {
                throw new Error("Gemini returned insufficient text")
            }
        } catch (e) {
            console.warn('⚠️ [API] Gemini Vision extraction failed or gave poor result, falling back to OCR...', e)
            method = "Tesseract OCR (Fallback)"

            // 2. Fallback Method: Tesseract.js (Basic OCR)
            const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const worker = await createWorker('eng');
            const ret = await worker.recognize(buffer);
            description = ret.data.text;
            await worker.terminate();

            // Basic regex for emails in fallback mode
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
            emails = description.match(emailRegex) || []
        }

        console.log(`✅ [API] Extraction finished using ${method}. Text Length: ${description.length}`)

        // 3. Writing Part: Use Groq (via generateCoverLetterAndSubject) for fast, high-quality generation
        if (resumeText && description) {
            console.log('✍️ [API] Generating cover letter and subject via Groq...')
            const { generateCoverLetterAndSubject } = await import('@/lib/ai')
            const generation = await generateCoverLetterAndSubject(description, resumeText)
            coverLetter = generation.coverLetter
            subject = generation.subject
        }

        const resultId = Math.random().toString(36).substring(7)

        const analysisData = {
            id: resultId,
            description: description,
            emails: emails,
            coverLetter: coverLetter,
            subject: subject,
            createdAt: new Date().toISOString(),
            method: method
        }

        // Store in cache
        analysisCache.set(resultId, analysisData)

        return NextResponse.json({
            success: true,
            id: resultId,
            data: analysisData
        })

    } catch (error: any) {
        console.error('Screenshot Analysis Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
