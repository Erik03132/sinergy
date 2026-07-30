import * as cheerio from 'cheerio'

export interface TCEntry {
  title: string
  description: string
  url: string
}

export async function getTechCrunchStartupPosts(signal?: AbortSignal): Promise<TCEntry[]> {
  try {
    const res = await fetch('https://techcrunch.com/startups/feed/', {
      signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    })
    if (!res.ok) {
      const fallback = await fetch('https://techcrunch.com/feed/', { signal })
      if (!fallback.ok) return []
      const xml = await fallback.text()
      return parseFeed(xml)
    }
    const xml = await res.text()
    return parseFeed(xml)
  } catch {
    return []
  }
}

function parseFeed(xml: string): TCEntry[] {
  const items: TCEntry[] = []
  const $ = cheerio.load(xml, { xmlMode: true })
  $('item').each((_, el) => {
    const $el = $(el)
    const title = $el.find('title').text().trim()
    const desc = $el.find('description').text().trim().replace(/<[^>]+>/g, '').slice(0, 500)
    const link = $el.find('link').text().trim()
    if (title && link) items.push({ title, description: desc, url: link })
  })
  return items.slice(0, 10)
}
