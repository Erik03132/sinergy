import { createClient } from '@/lib/supabase/server'
import { processManualUrl, saveRawItems } from './source-processor'
import { getHNShow } from './hackernews'
import { getProductHuntTrending } from './producthunt'
import { getDevToStartupPosts } from './devto'
import { getRedditStartupPosts } from './reddit'
import { getIndieHackersPosts } from './indiehackers'
import { getTechCrunchStartupPosts } from './techcrunch'
import { getAllRSSFeeds } from './rss-sources'
import { askGemini } from '@/lib/ai/gemini'
import { translateBatch } from '@/lib/ai/translate'
import { resolveNewsVertical } from './vertical'

export interface DiscoveryResult {
  count: number
  errors: string[]
}

const errors: string[] = []
const err = (msg: string) => {
  errors.push(msg)
  console.error(msg)
}

const FETCH_TIMEOUT = 5000

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
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36).substring(0, length)
}

interface SourceDefinition {
  name: string
  fetcher: (signal: AbortSignal) => Promise<any[]>
  mapper: (item: any) => {
    title: string
    description: string
    url: string
    source: string
    score?: number
    publishedAt?: number | string
  }
}

const FRESHNESS_DAYS = 3

function isFresh(publishedAt?: number | string): boolean {
  if (!publishedAt) return true
  const ts = typeof publishedAt === 'string' ? Date.parse(publishedAt) : publishedAt * 1000
  if (isNaN(ts)) return true
  const cutoff = Date.now() - FRESHNESS_DAYS * 24 * 60 * 60 * 1000
  return ts >= cutoff
}

const QUALITY_GATES: Record<string, { minScore?: number; minReactions?: number }> = {
  HN: { minScore: 50 },
  Reddit: { minScore: 15 },
  DevTo: { minReactions: 5 },
}

const SOURCES: SourceDefinition[] = [
  {
    name: 'RSS',
    fetcher: () => getAllRSSFeeds(),
    mapper: (i) => ({ title: i.title, description: i.description || i.title, url: i.url, source: `RSS/${i.source}` }),
  },
  {
    name: 'HN',
    fetcher: (s) => getHNShow(15, s),
    mapper: (i) => ({
      title: i.title,
      description: i.text || i.title,
      url: i.url || `https://news.ycombinator.com/item?id=${i.id}`,
      source: 'HN',
      score: i.score,
      publishedAt: i.time,
    }),
  },
  {
    name: 'PH',
    fetcher: (s) => getProductHuntTrending(s),
    mapper: (i) => ({ title: i.title, description: i.tagline, url: i.url, source: 'PH' }),
  },
  {
    name: 'DevTo',
    fetcher: (s) => getDevToStartupPosts(s),
    mapper: (i) => ({
      title: i.title,
      description: i.description,
      url: i.url,
      source: 'DevTo',
      score: i.positive_reactions,
      publishedAt: i.published_at,
    }),
  },
  {
    name: 'Reddit',
    fetcher: async (s) => getRedditStartupPosts(5, s),
    mapper: (i) => ({
      title: i.title,
      description: i.selftext?.slice(0, 500),
      url: i.url,
      source: `r/${i.subreddit}`,
      score: i.score,
      publishedAt: i.created_utc,
    }),
  },
  {
    name: 'IH',
    fetcher: (s) => getIndieHackersPosts(s),
    mapper: (i) => ({ title: i.title, description: i.description?.slice(0, 500), url: i.url, source: 'IH' }),
  },
  {
    name: 'TC',
    fetcher: (s) => getTechCrunchStartupPosts(s),
    mapper: (i) => ({ title: i.title, description: i.description?.slice(0, 500), url: i.url, source: 'TC' }),
  },
]

interface PendingItem {
  title: string
  description: string
  url: string
  source: string
  sourceName: string
}

async function collectSource(
  supabase: any,
  sourceName: string,
  fetcher: (signal: AbortSignal) => Promise<any[]>,
  mapper: (item: any) => {
    title: string
    description: string
    url: string
    source: string
    score?: number
    publishedAt?: number | string
  }
): Promise<PendingItem[]> {
  try {
    err(`[${sourceName}] fetch start`)
    const raw = await fetchWithTimeout(fetcher)
    err(`[${sourceName}] fetch ok: ${raw?.length || 0} items`)

    if (!raw || raw.length === 0) {
      err(`[${sourceName}] empty response`)
      return []
    }

    const gate = QUALITY_GATES[sourceName]
    const items = raw.map(mapper).filter((i: any) => {
      if (!i.title || !i.url) return false
      const fresh = isFresh(i.publishedAt)
      const meetsQuality = gate ? (i.score ?? 0) >= (gate.minScore ?? gate.minReactions ?? 0) : true
      if (!fresh && !meetsQuality) return false
      return true
    })
    err(`[${sourceName}] mapped: ${items.length} items (quality+freshness)`)
    if (items.length === 0) return []

    const { data: recent, error: selectErr } = await supabase
      .from('ideas')
      .select('title, metadata')
      .order('created_at', { ascending: false })
      .limit(500)
    if (selectErr) {
      err(`[${sourceName}] DB select error: ${selectErr.message}`)
      return []
    }

    const seenTitles = new Set(recent?.map((e: any) => e.title))
    const seenUrls = new Set(recent?.map((e: any) => e.metadata?.original_url).filter(Boolean))
    const { isContentBanned } = await import('./source-processor')

    const newItems = items.filter((item: any) => {
      if (seenTitles.has(item.title)) return false
      if (seenUrls.has(item.url)) return false
      if (isContentBanned(`${item.title} ${item.description || ''}`.toLowerCase())) return false
      return true
    })
    err(`[${sourceName}] after dedup: ${newItems.length}`)

    return newItems.map((i: any) => ({ ...i, sourceName }))
  } catch (e: any) {
    err(`[${sourceName}] crash: ${e?.message || e}`)
    return []
  }
}

export async function fetchAndStoreFeed(): Promise<DiscoveryResult> {
  errors.length = 0
  const supabase = await createClient()

  // 1. Collect all items from all sources in parallel
  const collected: PendingItem[] = []
  const sourceResults = await Promise.allSettled(
    SOURCES.map(({ name, fetcher, mapper }) => collectSource(supabase, name, fetcher, mapper as any))
  )
  for (const r of sourceResults) {
    if (r.status === 'fulfilled') collected.push(...r.value)
    else err(`source crash: ${r.reason?.message || r.reason}`)
  }
  err(`collected ${collected.length} new items total`)

  // 2. Критический путь: сохраняем сырые новости сразу (без LLM),
  //    чтобы фид обновлялся даже при 429/таймаутах AI
  let total = 0
  if (collected.length > 0) {
    total = await saveRawItems(
      collected.map((i) => ({
        title: i.title,
        description: i.description || i.title,
        url: i.url,
        sourceName: i.source || i.sourceName,
      }))
    )
    err(`raw saved: ${total} items`)
  }

  // 3. Best-effort обогащение (перевод + структура), ограничено дедлайном,
  //    чтобы не блокировать cron при недоступном LLM
  if (collected.length > 0) {
    try {
      await enrichRawItems(
        collected.map((i) => ({
          title: i.title,
          description: i.description || i.title,
          url: i.url,
          sourceName: i.source || i.sourceName,
        }))
      )
    } catch (e: any) {
      err(`enrichment skipped: ${e?.message || e}`)
    }
  }

  // 4. Channel sources
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

const ENRICH_DEADLINE_MS = 120000

/**
 * Обогащение сырых новостей: перевод на русский + AI-структура.
 * Обновляет уже сохранённые raw-строки (не вставляет новые).
 * Работает до дедлайна; при недоступности LLM просто завершается.
 */
async function enrichRawItems(
  items: { title: string; description: string; url: string; sourceName: string }[]
): Promise<void> {
  const supabase = await createClient()
  const CONCURRENCY = 2
  let cursor = 0
  const deadline = Date.now() + ENRICH_DEADLINE_MS

  async function worker() {
    while (cursor < items.length) {
      const item = items[cursor++]
      if (Date.now() > deadline) return
      try {
        const { data: rows } = await supabase.from('ideas').select('id, metadata').eq('original_url', item.url).limit(1)
        if (!rows || rows.length === 0) continue
        if (rows[0].metadata?.is_extracted) continue

        const prompt = `Переведи заголовок и описание стартапа/новости на русский язык. Сохрани термины и названия продуктов. Верни ТОЛЬКО JSON: {"title_ru":"...","description_ru":"..."}

title: ${item.title}
description: ${item.description || item.title}`
        let title = item.title
        let description = item.description || item.title
        try {
          const raw = await askGemini(prompt)
          const json = raw.match(/\{[\s\S]*\}/)
          if (json) {
            const parsed = JSON.parse(json[0])
            if (parsed.title_ru) title = parsed.title_ru
            if (parsed.description_ru) description = parsed.description_ru
          }
        } catch (e: any) {
          err(`enrich translate failed for ${item.title.slice(0, 40)}: ${e?.message}`)
        }

        await supabase
          .from('ideas')
          .update({
            title: title.slice(0, 500),
            description: description.slice(0, 2000),
            vertical: resolveNewsVertical(title, description),
            metadata: {
              ...(rows[0].metadata || {}),
              is_extracted: true,
              raw_fallback: false,
              enriched_at: new Date().toISOString(),
            },
          })
          .eq('id', rows[0].id)
      } catch (e: any) {
        err(`enrich failed for ${item.title.slice(0, 40)}: ${e?.message}`)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker()))
}

async function translateSingleGemini(
  title: string,
  description: string
): Promise<{ title: string; description: string } | null> {
  try {
    const prompt = `Переведи заголовок и описание стартапа на русский язык. Сохрани термины и названия продуктов.
Верни ТОЛЬКО JSON: {"title_ru":"...","description_ru":"..."}

title: ${title}
description: ${description || title}`
    const raw = await askGemini(prompt)
    const json = raw.match(/\{[\s\S]*\}/)
    if (json) {
      const parsed = JSON.parse(json[0])
      return { title: parsed.title_ru || title, description: parsed.description_ru || description }
    }
  } catch (e: any) {
    err(`gemini single translate failed: ${e?.message || e}`)
  }
  return null
}

async function translateSingleGeminiBatch(
  items: { title: string; description: string }[]
): Promise<Record<string, { title: string; description: string }> | null> {
  if (items.length === 0) return {}
  try {
    const prompt = `Переведи следующие ${items.length} заголовков и описаний стартапов с английского на русский.
Сохрани термины и названия продуктов.
Верни ТОЛЬКО JSON-объект: {"original_title": {"title_ru":"...","description_ru":"..."}}

${items.map((item, i) => `[${i}] title: ${item.title}\ndescription: ${item.description || item.title}`).join('\n\n')}`
    const raw = await askGemini(prompt)
    const json = raw.match(/\{[\s\S]*\}/)
    if (!json) return null
    const parsed = JSON.parse(json[0])
    const result: Record<string, { title: string; description: string }> = {}
    for (const item of items) {
      if (parsed[item.title]) {
        result[item.title] = {
          title: parsed[item.title].title_ru || item.title,
          description: parsed[item.title].description_ru || item.description,
        }
      }
    }
    return result
  } catch (e: any) {
    err(`gemini batch translate failed: ${e?.message || e}`)
    return null
  }
}

export async function retranslateExisting(): Promise<{ updated: number; errors: string[] }> {
  errors.length = 0
  const supabase = await createClient()

  const { data: recent, error: selectErr } = await supabase
    .from('ideas')
    .select('id, title, description, metadata')
    .in('source', ['user', 'automatic'])
    .order('created_at', { ascending: false })
    .limit(200)

  if (selectErr) {
    err(`retranslate select error: ${selectErr.message}`)
    return { updated: 0, errors: [...errors] }
  }
  if (!recent || recent.length === 0) {
    err('retranslate: no items to translate')
    return { updated: 0, errors: [...errors] }
  }

  err(`retranslate: ${recent.length} items to process`)

  try {
    const translated = await translateBatch(
      recent.map((r: any) => ({ title: r.title, description: r.description || r.title }))
    )

    let updated = 0

    const unchanged = recent
      .map((item, i) => ({ item, translated: translated[i], idx: i }))
      .filter(({ item, translated: t }) => !t || t.title === item.title)

    if (unchanged.length > 0) {
      err(`${unchanged.length} items need Gemini retry`)
      const geminiRes = await translateSingleGeminiBatch(
        unchanged.map(({ item }) => ({ title: item.title, description: item.description || item.title }))
      )
      if (geminiRes) {
        for (const { item, idx } of unchanged) {
          if (geminiRes[item.title] && geminiRes[item.title].title !== item.title) {
            translated[idx] = geminiRes[item.title] as any
          }
        }
      }
    }

    for (let i = 0; i < recent.length; i++) {
      const item = recent[i]
      const t = translated[i]

      if (!t || t.title === item.title) continue

      const meta = item.metadata || {}
      const { error: updateErr } = await supabase
        .from('ideas')
        .update({
          title: t.title?.slice(0, 500) || item.title,
          description: (t.description || t.title || item.description)?.slice(0, 2000),
          metadata: { ...meta, summary: t.summary || meta.summary, retranslated: true },
        })
        .eq('id', item.id)

      if (updateErr) {
        err(`retranslate update err for ${item.id}: ${updateErr.message}`)
      } else {
        updated++
      }
    }

    err(`retranslate: updated ${updated}/${recent.length}`)
    return { updated, errors: [...errors] }
  } catch (e: any) {
    err(`retranslate batch failed, trying Gemini batch: ${e?.message || e}`)

    let updated = 0
    const geminiRes = await translateSingleGeminiBatch(
      recent.map((r: any) => ({ title: r.title, description: r.description || r.title }))
    )
    if (geminiRes) {
      for (const item of recent) {
        const result = geminiRes[item.title]
        if (!result || result.title === item.title) continue

        const meta = item.metadata || {}
        const { error: updateErr } = await supabase
          .from('ideas')
          .update({
            title: result.title.slice(0, 500),
            description: (result.description || result.title).slice(0, 2000),
            metadata: { ...meta, retranslated: true },
          })
          .eq('id', item.id)

        if (updateErr) {
          err(`retranslate per-item err for ${item.id}: ${updateErr.message}`)
        } else {
          updated++
        }
      }
    }

    err(`retranslate Gemini: updated ${updated}/${recent.length}`)
    return { updated, errors: [...errors] }
  }
}
