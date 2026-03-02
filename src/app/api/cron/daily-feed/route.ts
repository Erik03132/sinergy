
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { fetchAndStoreFeed } from '@/lib/sinergy/discovery'

export const dynamic = 'force-dynamic'

/**
 * Крон-задача для автоматического обновления ленты.
 * Настроена в vercel.json
 */
export async function GET(req: Request) {
    // Проверка секрета для защиты от посторонних вызовов
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 })
    }

    const supabase = await createClient()
    console.log('[Cron] Starting Daily Feed Update...')

    try {
        const addedCount = await fetchAndStoreFeed()

        // Логируем успех
        await supabase.from('cron_logs').insert({
            name: 'daily-feed',
            status: 'success',
            item_count: addedCount,
            message: `Automated scan finished. Added ${addedCount} items.`
        })

        return NextResponse.json({ success: true, added: addedCount })

    } catch (error: any) {
        console.error('[Cron Error]', error.message)

        // Логируем ошибку
        await supabase.from('cron_logs').insert({
            name: 'daily-feed',
            status: 'error',
            message: error.message
        })

        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
