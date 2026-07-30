export interface HNStory {
  id: number
  title: string
  url?: string
  score: number
  by: string
  descendants: number
  time: number
  text?: string
}

const HN_BASE = 'https://hacker-news.firebaseio.com/v0'

async function fetchItem(id: number): Promise<HNStory | null> {
  try {
    const res = await fetch(`${HN_BASE}/item/${id}.json`, {
      headers: { 'User-Agent': 'Sinergy/1.0' }
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function getHNStories(limit: number = 30): Promise<HNStory[]> {
  const res = await fetch(`${HN_BASE}/newstories.json`, {
    headers: { 'User-Agent': 'Sinergy/1.0' }
  })
  if (!res.ok) throw new Error(`HN API error: ${res.status}`)
  const ids: number[] = await res.json()
  const batch = ids.slice(0, limit)
  const items = await Promise.all(batch.map(fetchItem))
  return items.filter((s): s is HNStory => s !== null && !!s.title && (!!s.url || !!s.text))
}

export async function getHNBest(limit: number = 20): Promise<HNStory[]> {
  const res = await fetch(`${HN_BASE}/beststories.json`, {
    headers: { 'User-Agent': 'Sinergy/1.0' }
  })
  if (!res.ok) throw new Error(`HN API error: ${res.status}`)
  const ids: number[] = await res.json()
  const batch = ids.slice(0, limit)
  const items = await Promise.all(batch.map(fetchItem))
  return items.filter((s): s is HNStory => s !== null && !!s.title && (!!s.url || !!s.text))
}

export async function getHNShow(limit: number = 30, signal?: AbortSignal): Promise<HNStory[]> {
  const res = await fetch(`${HN_BASE}/showstories.json`, {
    headers: { 'User-Agent': 'Sinergy/1.0' },
    signal
  })
  if (!res.ok) throw new Error(`HN API error: ${res.status}`)
  const ids: number[] = await res.json()
  const batch = ids.slice(0, limit)
  const items = await Promise.all(batch.map(id => fetchItem(id)))
  return items.filter((s): s is HNStory => s !== null && !!s.title && (!!s.url || !!s.text))
}
