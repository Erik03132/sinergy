export interface AsianStartup {
  title: string
  description: string
  url: string
  source: string
}

export async function getTechInAsia(): Promise<AsianStartup[]> {
  try {
    const res = await fetch('https://www.techinasia.com/wp-json/techinasia/v2/posts?per_page=10', {
      headers: { 'User-Agent': 'Sinergy/1.0', 'Accept': 'application/json' }
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data || []).map((p: any) => ({
      title: p.title?.rendered || '',
      description: (p.excerpt?.rendered || '').replace(/<[^>]+>/g, '').slice(0, 500),
      url: p.link || '',
      source: 'TechInAsia',
    }))
  } catch {
    return []
  }
}

export async function getPandaily(): Promise<AsianStartup[]> {
  try {
    const res = await fetch('https://pandaily.com/wp-json/wp/v2/posts?per_page=10', {
      headers: { 'User-Agent': 'Sinergy/1.0', 'Accept': 'application/json' }
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data || []).map((p: any) => ({
      title: p.title?.rendered || '',
      description: (p.excerpt?.rendered || '').replace(/<[^>]+>/g, '').slice(0, 500),
      url: p.link || '',
      source: 'Pandaily',
    }))
  } catch {
    return []
  }
}

export async function getKr36(): Promise<AsianStartup[]> {
  try {
    const res = await fetch('https://36kr.com/api/newsflash?per_page=10', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    })
    if (!res.ok) return []
    const data = await res.json()
    const items = data.data?.items || []
    return items.map((p: any) => ({
      title: p.title || p.content || '',
      description: (p.content || '').slice(0, 500),
      url: p.url || `https://36kr.com/p/${p.id}`,
      source: '36kr',
    }))
  } catch {
    return []
  }
}

export async function getAllAsianStartups(): Promise<AsianStartup[]> {
  const [tia, pd, kr] = await Promise.all([
    getTechInAsia(),
    getPandaily(),
    getKr36(),
  ])
  return [...tia, ...pd, ...kr]
}
