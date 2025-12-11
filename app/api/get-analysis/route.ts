import { NextRequest, NextResponse } from 'next/server'
import { analysisCache } from '@/lib/analysisCache'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 })
    }

    const data = analysisCache.get(id)

    if (!data) {
        return NextResponse.json({ success: false, error: 'Analysis not found' }, { status: 404 })
    }

    return NextResponse.json({
        success: true,
        ...data
    })
}
