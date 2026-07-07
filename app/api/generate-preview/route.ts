import { NextRequest, NextResponse } from 'next/server'
import { getSettings } from '@/lib/storage'
import { generateCoverLetterAndSubject } from '@/lib/ai'
import { analyzeMatchForLatex, generateTailoredLatex, compileLatexToPdf } from '@/lib/latex'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobDescription, userFeedback, existingAnalysis } = body

    if (!jobDescription) {
      return NextResponse.json(
        { success: false, error: 'Job description is required' },
        { status: 400 }
      )
    }

    // Get user settings for the template
    const settings = await getSettings()
    if (!settings || !settings.baseLatexTemplate) {
      return NextResponse.json(
        { success: false, error: 'Base LaTeX template not found. Please save it in your Settings.' },
        { status: 400 }
      )
    }

    // 1. Analyze Match (only if not already done, to save time on regenerations)
    let analysis = existingAnalysis
    if (!analysis) {
      analysis = await analyzeMatchForLatex(jobDescription, settings.baseLatexTemplate)
    }

    // 2. Generate Cover Letter (if not regenerating, or optionally regenerate)
    // We will generate the cover letter every time for simplicity if they asked for feedback
    const coverLetterPrompt = userFeedback ? `${jobDescription}\n\nUSER FEEDBACK: ${userFeedback}` : jobDescription
    const { coverLetter, subject } = await generateCoverLetterAndSubject(coverLetterPrompt, settings.baseLatexTemplate)

    // 3. Generate LaTeX
    const tailoredLatex = await generateTailoredLatex(
      jobDescription,
      settings.baseLatexTemplate,
      analysis,
      userFeedback
    )

    // 4. Compile PDF
    const { url, publicId } = await compileLatexToPdf(tailoredLatex)

    return NextResponse.json({
      success: true,
      analysis,
      coverLetter,
      subject,
      tailoredLatex,
      resumeUrl: url,
      resumePublicId: publicId
    })
  } catch (error: any) {
    console.error('Preview generation error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate preview' },
      { status: 500 }
    )
  }
}
