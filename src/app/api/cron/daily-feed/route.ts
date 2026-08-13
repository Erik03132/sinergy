import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { fetchAndStoreFeed } from '@/lib/sinergy/discovery'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Крон-задача для автоматического обновления ленты.
 * Настроена в vercel.json
 */
export async function GET(req: Request) {
  // Проверка секрета для защиты от посторонних вызовов
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Не авторизован', { status: 401 })
  }

  const supabase = await createClient()
  console.log('[Cron] Starting Daily Feed Update...')

  try {
    const { count } = await fetchAndStoreFeed()

    await supabase.from('cron_logs').insert({
      name: 'daily-feed',
      status: 'success',
      item_count: count,
      message: `Automated scan finished. Added ${count} items.`,
    })

    return NextResponse.json({ success: true, added: count })
  } catch (error: any) {
    console.error('[Cron Error]', error.message)

    // Логируем ошибку
    await supabase.from('cron_logs').insert({
      name: 'daily-feed',
      status: 'error',
      message: error.message,
    })

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
