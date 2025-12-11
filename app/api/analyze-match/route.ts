import { NextRequest, NextResponse } from 'next/server'
import { getResumeUrl } from '@/lib/storage'
import { extractTextFromPDF } from '@/lib/pdf'
import { analyzeJobMatch } from '@/lib/ai'

export async function POST(request: NextRequest) {
    try {
        const { jobDescription } = await request.json()

        if (!jobDescription) {
            return NextResponse.json({
                success: false,
                error: 'Job description is required'
            }, { status: 400 })
        }

        // 1. Get Resume URL
        const resumeUrl = await getResumeUrl()
        if (!resumeUrl) {
            return NextResponse.json({
                success: false,
                error: 'Resume not found. Please upload a resume in Settings.'
            }, { status: 404 })
        }

        // 2. Extract Text from Resume
        // Cache this? For now, we extract every time (less efficient but simpler).
        // Optimization: In a real app, store extracted text in DB when uploading resume.
        const resumeText = await extractTextFromPDF(resumeUrl)

        if (!resumeText) {
            return NextResponse.json({
                success: false,
                error: 'Failed to extract text from resume PDF.'
            }, { status: 500 })
        }

        // 3. Analyze Match
        const matchResult = await analyzeJobMatch(resumeText, jobDescription)

        return NextResponse.json({
            success: true,
            ...matchResult
        })

    } catch (error: any) {
        console.error('Match analysis error:', error)
        return NextResponse.json({
            success: false,
            error: error.message || 'Analysis failed'
        }, { status: 500 })
    }
}
