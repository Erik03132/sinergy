import { NextRequest, NextResponse } from 'next/server'
import { fetchAndStoreFeed, retranslateExisting } from '@/lib/sinergy/discovery'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const retranslate = searchParams.get('retranslate') === 'true'

        if (retranslate) {
            const { updated, errors } = await retranslateExisting()
            return NextResponse.json({
                success: true,
                updated,
                errors: errors.slice(0, 20)
            })
        }

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
