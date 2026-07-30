import { NextResponse } from 'next/server'
import { fetchAndStoreFeed } from '@/lib/sinergy/discovery'

export const dynamic = 'force-dynamic'

export async function POST() {
    try {
        const { count, errors } = await fetchAndStoreFeed()

        return NextResponse.json({
            success: true,
            count,
            errors: errors.slice(0, 20)
        })
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error?.message || 'Unknown error'
        }, { status: 500 })
    }
}
