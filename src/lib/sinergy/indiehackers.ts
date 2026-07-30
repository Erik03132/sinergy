import * as cheerio from 'cheerio'

export interface IHPost {
  title: string
  description: string
  url: string
}

export async function getIndieHackersPosts(signal?: AbortSignal): Promise<IHPost[]> {
  try {
    const res = await fetch('https://www.indiehackers.com/rss.xml', {
      signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    })
    if (!res.ok) return []
    const xml = await res.text()
    const $ = cheerio.load(xml, { xmlMode: true })
    const items: IHPost[] = []
    $('item').each((_, el) => {
      const $el = $(el)
      const title = $el.find('title').text().trim()
      const desc = $el.find('description').text().trim().replace(/<[^>]+>/g, '').slice(0, 500)
      const link = $el.find('link').text().trim()
      if (title && link) items.push({ title, description: desc, url: link })
    })
    return items.slice(0, 15)
  } catch {
    return []
  }
}
