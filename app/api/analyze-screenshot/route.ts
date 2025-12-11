import { NextRequest, NextResponse } from 'next/server'
import { createWorker } from 'tesseract.js'
import { analysisCache } from '@/lib/analysisCache'
import path from 'path'
import fs from 'fs'

export async function POST(request: NextRequest) {
    try {
        const { image } = await request.json() // Base64 image

        if (!image) {
            return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 })
        }

        console.log('📸 Received screenshot for analysis...')

        // Decode base64 
        const base64Data = image.replace(/^data:image\/jpeg;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        // Use Tesseract.js for OCR
        const worker = await createWorker('eng');
        const ret = await worker.recognize(buffer);
        const text = ret.data.text;
        await worker.terminate();

        console.log('✅ OCR Text Length:', text.length)

        // Extract basic info using Regex (AI would be better, but we do basic first)
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
        const emails = text.match(emailRegex) || []

        const resultId = Math.random().toString(36).substring(7)

        const analysisData = {
            id: resultId,
            description: text, // The full text from the screenshot
            emails: emails,
            createdAt: new Date().toISOString()
        }

        // Store in cache
        analysisCache.set(resultId, analysisData)

        return NextResponse.json({
            success: true,
            id: resultId,
            textLength: text.length
        })

    } catch (error: any) {
        console.error('OCR Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
