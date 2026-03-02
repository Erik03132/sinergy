import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { fetchAndStoreFeed } from '@/lib/sinergy/discovery'

/**
 * Объединенный поиск: Глобальный AI + Мониторинг отобранных каналов
 */
export async function POST() {
    const supabase = await createClient();
    console.log('[Refresh API] Manual trigger started');

    // Сразу пишем лог "старта", чтобы видеть в БД, что процесс пошел
    await supabase.from('cron_logs').insert({
        name: 'daily-feed',
        status: 'processing',
        message: 'Manual refresh started...'
    });

    try {
        const count = await fetchAndStoreFeed();

        // Логируем ручное обновление, чтобы UI увидел новую дату
        await supabase.from('cron_logs').insert({
            name: 'daily-feed',
            status: 'success',
            item_count: count,
            message: `Manual refresh added ${count} items.`
        });

        return NextResponse.json({ success: true, count });
    } catch (error: any) {
        console.error('Refresh API Critical Error:', error.message);

        await supabase.from('cron_logs').insert({
            name: 'daily-feed',
            status: 'error',
            message: `Manual refresh failed: ${error.message}`
        });

        return NextResponse.json({ error: 'Refresh failed' }, { status: 500 });
    }
}
