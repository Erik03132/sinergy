
import { createClient } from '@/lib/supabase/server'
import { processManualUrl } from "./source-processor";
import { getHNShow } from "./hackernews";
import { getProductHuntTrending } from "./producthunt";
import { getDevToStartupPosts } from "./devto";

export interface DiscoveryResult {
    count: number
    errors: string[]
}

const errors: string[] = []
const err = (msg: string) => { errors.push(msg); console.error(msg) }

const FETCH_TIMEOUT = 6000

async function fetchWithTimeout<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    return await fn(controller.signal)
  } finally {
    clearTimeout(timer)
  }
}

function shortHash(input: string, length: number = 8): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, length);
}

async function processSource(
    supabase: any,
    sourceName: string,
    fetcher: (signal: AbortSignal) => Promise<any[]>,
    mapper: (item: any) => { title: string; description: string; url: string; source: string }
): Promise<number> {
    try {
        err(`[${sourceName}] fetch start`)
        const raw = await fetchWithTimeout(fetcher)
        err(`[${sourceName}] fetch ok: ${raw?.length || 0} items`)

        if (!raw || raw.length === 0) {
            err(`[${sourceName}] empty response`)
            return 0
        }

        const items = raw.map(mapper).filter((i: any) => i.title && i.url)
        err(`[${sourceName}] mapped: ${items.length} items`)
        if (items.length === 0) return 0

        const { data: recent, error: selectErr } = await supabase.from('ideas')
            .select('title, metadata')
            .order('created_at', { ascending: false })
            .limit(200);
        if (selectErr) {
            err(`[${sourceName}] DB select error: ${selectErr.message}`)
            return 0
        }
        err(`[${sourceName}] DB got ${recent?.length || 0} existing`)

        const seenTitles = new Set(recent?.map((e: any) => e.title));
        const seenUrls = new Set(
            recent?.map((e: any) => e.metadata?.original_url).filter(Boolean)
        );
        const { isContentBanned } = await import("./source-processor");

        const newItems = items.filter((item: any) => {
            if (seenTitles.has(item.title)) return false
            if (seenUrls.has(item.url)) return false
            if (isContentBanned(`${item.title} ${item.description || ''}`.toLowerCase())) return false
            return true
        });
        err(`[${sourceName}] after dedup: ${newItems.length}`)

        if (newItems.length === 0) return 0

        let saved = 0;
        for (const item of newItems) {
            try {
                const { error: insertErr } = await supabase.from('ideas').insert({
                    source: 'user',
                    title: item.title.slice(0, 500),
                    description: (item.description || item.title).slice(0, 2000),
                    vertical: 'News',
                    core_tech: [],
                    target_audience: 'TBD',
                    business_model: 'TBD',
                    pain_point: [],
                    temporal_marker: new Date().toISOString().split('T')[0],
                    metadata: {
                        type: sourceName.toLowerCase(),
                        original_source: item.source,
                        original_url: item.url,
                        unique_id: shortHash(item.url, 8),
                        auto_discovered: true
                    }
                })
                if (insertErr) {
                    err(`[${sourceName}] insert err for "${item.title.slice(0, 30)}": ${insertErr.message}`)
                } else {
                    saved++
                }
            } catch (e: any) {
                err(`[${sourceName}] insert ex: ${e?.message || e}`)
            }
        }

        err(`[${sourceName}] saved ${saved}/${newItems.length}`)
        return saved
    } catch (e: any) {
        err(`[${sourceName}] crash: ${e?.message || e}`)
        return 0
    }
}

export async function fetchAndStoreFeed(): Promise<DiscoveryResult> {
    errors.length = 0
    const supabase = await createClient()
    let total = 0

    for (const [name, fetch, map] of [
        ['HN', (s: AbortSignal) => getHNShow(15, s), (i: any) => ({ title: i.title, description: i.text || i.title, url: i.url || `https://news.ycombinator.com/item?id=${i.id}`, source: 'HN' })],
        ['PH', (s: AbortSignal) => getProductHuntTrending(s), (i: any) => ({ title: i.title, description: i.tagline, url: i.url, source: 'PH' })],
        ['DevTo', (s: AbortSignal) => getDevToStartupPosts(s), (i: any) => ({ title: i.title, description: i.description, url: i.url, source: 'DevTo' })],
    ] as const) {
        const c = await processSource(supabase, name, fetch, map as any)
        total += c
    }

    try {
        const { data: channels } = await supabase.from('channels').select('*').limit(1)
        if (channels?.[0]) {
            await processManualUrl(channels[0].url, 'стартап')
        }
    } catch (e: any) {
        err(`channel: ${e?.message || e}`)
    }

    err(`total saved: ${total}`)
    return { count: total, errors: [...errors] }
}
