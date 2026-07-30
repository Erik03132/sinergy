import * as cheerio from 'cheerio';

export interface PHProduct {
  title: string
  tagline: string
  url: string
}

export async function getProductHuntTrending(signal?: AbortSignal): Promise<PHProduct[]> {
  try {
    const res = await fetch('https://www.producthunt.com/feed', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/xml',
      },
      signal
    })
    if (!res.ok) return []
    const xml = await res.text()
    const $ = cheerio.load(xml, { xmlMode: true })
    const posts: PHProduct[] = []

    $('entry').each((_, el) => {
      const $el = $(el)
      const title = $el.find('title').text().trim()
      const content = $el.find('content').text().trim()
      const link = $el.find('link').attr('href') || ''

      if (title && link) {
        const tagline = content.replace(/<[^>]+>/g, '').split('.')[0]?.trim() || title
        posts.push({ title, tagline, url: link })
      }
    })

    return posts.slice(0, 15)
  } catch {
    return []
  }
}
