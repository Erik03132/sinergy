
import { askGemini } from '@/lib/ai/gemini'
import { createClient } from '@/lib/supabase/server'
import { processManualUrl } from "./source-processor";

/**
 * Переносит старые новости в "Глубокий архив" (History), 
 * чтобы лента не тормозила, но Блендер мог их использовать.
 */
async function cleanupOldNews(supabase: any) {
    const LIMIT = 100;
    const { data: news } = await supabase
        .from('ideas')
        .select('id')
        .eq('vertical', 'News')
        .order('created_at', { ascending: false });

    if (news && news.length > LIMIT) {
        const toArchive = news.slice(LIMIT).map((n: any) => n.id);
        console.log(`[Cleanup] Moving ${toArchive.length} old ideas to History...`);
        await supabase.from('ideas').update({ vertical: 'History' }).in('id', toArchive);
    }
}

async function getRowCount(supabase: any) {
    const { count } = await supabase.from('ideas').select('*', { count: 'exact', head: true });
    return count || 0;
}

/**
 * Основной цикл поиска: Глобальный AI + Сканирование каналов.
 * Возвращает количество добавленных элементов.
 */
export async function fetchAndStoreFeed() {
    console.log("[Discovery] Starting Cycle...");
    const supabase = await createClient();
    const beforeCount = await getRowCount(supabase);

    // 1. GLOBAL AI DISCOVERY
    const discoveryPrompt = `
        Search your internal knowledge for 10 RECENT (this month) startup launches, AI tools, or micro-SaaS case studies.
        Focus on projects from ProductHunt, IndieHackers, or Reddit.
        Target: innovative apps with budget <$100k.
        Output MUST be Valid JSON Array: 
        [{ "title": "Заголовок", "summary": "Детальное описание (3-5 предложений) о пользе и монетизации", "url": "...", "source": "Indie Hackers" }]
        ALL TEXT IN RUSSIAN.
    `;

    try {
        const raw = await askGemini(discoveryPrompt, { search: false });
        const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = clean.match(/\[[\s\S]*\]/);
        const newsItems = JSON.parse(jsonMatch ? jsonMatch[0] : clean);

        if (newsItems && newsItems.length > 0) {
            const { data: recent } = await supabase.from('ideas').select('original_url, title').limit(50);
            const existingUrls = new Set(recent?.map(e => e.original_url));
            const seenTitles = new Set(recent?.map(e => e.title));

            const inserts = newsItems
                .filter((item: any) => item.url && !existingUrls.has(item.url) && !seenTitles.has(item.title))
                .map((item: any) => ({
                    source: 'automatic',
                    title: item.title,
                    description: item.summary,
                    vertical: 'News',
                    original_url: item.url,
                    is_synergy: false,
                    temporal_marker: new Date().toISOString().split('T')[0],
                    metadata: { type: 'global_search', original_source: item.source }
                }));

            if (inserts.length > 0) await supabase.from('ideas').insert(inserts);
        }
    } catch (e) {
        console.warn("[Discovery] Global search failed", e);
    }

    // 2. CHANNEL MONITORING
    try {
        const { data: channels } = await supabase.from('channels').select('*');
        if (channels && channels.length > 0) {
            const scanQueue = channels.sort(() => 0.5 - Math.random()).slice(0, 3);
            for (const ch of scanQueue) {
                try {
                    await processManualUrl(ch.url);
                    await supabase.from('channels').update({ last_scanned_at: new Date().toISOString() }).eq('id', ch.id);
                } catch (chErr) {
                    console.error(`Failed channel ${ch.url}:`, chErr);
                }
            }
        }
    } catch (e) {
        console.error("[Discovery] Channel scan error:", e);
    }

    // 3. CLEANUP
    await cleanupOldNews(supabase);

    const afterCount = await getRowCount(supabase);
    const totalAdded = Math.max(0, afterCount - beforeCount);
    console.log(`[Discovery] Cycle finished. Added: ${totalAdded}`);
    return totalAdded;
}
