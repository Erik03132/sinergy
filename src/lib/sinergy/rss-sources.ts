import * as cheerio from 'cheerio'

export interface RSSItem {
  title: string
  description: string
  url: string
  source: string
}

interface RSSFeed {
  name: string
  url: string
  region: string
}

const FEEDS: RSSFeed[] = [
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', region: 'US' },
  { name: 'YourStory', url: 'https://yourstory.com/feed', region: 'India' },
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/', region: 'US' },
  { name: 'Sifted', url: 'https://sifted.eu/feed', region: 'EU' },
]

function parseFeed(xml: string, sourceName: string): RSSItem[] {
  const items: RSSItem[] = []
  const $ = cheerio.load(xml, { xmlMode: true })

  $('item').each((_, el) => {
    const $el = $(el)
    const title = $el.find('title').text().trim()
    const desc = $el
      .find('description')
      .text()
      .trim()
      .replace(/<[^>]+>/g, '')
      .slice(0, 500)
    const link = $el.find('link').text().trim() || $el.find('link[href]').attr('href') || ''
    const url = link.startsWith('http') ? link : ''
    if (title && url) items.push({ title, description: desc, url, source: sourceName })
  })

  $('entry').each((_, el) => {
    const $el = $(el)
    const title = $el.find('title').text().trim()
    const content = $el
      .find('content')
      .text()
      .trim()
      .replace(/<[^>]+>/g, '')
      .slice(0, 500)
    const summary = $el
      .find('summary')
      .text()
      .trim()
      .replace(/<[^>]+>/g, '')
      .slice(0, 500)
    const link = $el.find('link[href]').attr('href') || ''
    const url = link.startsWith('http') ? link : ''
    if (title && url) items.push({ title, description: content || summary, url, source: sourceName })
  })

  return items
}

export async function getAllRSSFeeds(): Promise<RSSItem[]> {
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const xml = await res.text()
      return parseFeed(xml, feed.name)
    })
  )

  const all: RSSItem[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value)
  }
  return all
}
