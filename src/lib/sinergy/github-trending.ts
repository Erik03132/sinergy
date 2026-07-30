export interface TrendingRepo {
  title: string
  description: string
  url: string
  language: string
  stars: number
  forks: number
}

export async function getGitHubTrending(language: string = 'typescript', since: 'daily' | 'weekly' = 'daily'): Promise<TrendingRepo[]> {
  try {
    const res = await fetch(
      `https://api.github.com/search/repositories?q=created:>${daysAgo(since)}+language:${language}&sort=stars&order=desc&per_page=10`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Sinergy/1.0'
        }
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.items || []).map((r: any) => ({
      title: r.name,
      description: r.description || '',
      url: r.html_url,
      language: r.language || language,
      stars: r.stargazers_count,
      forks: r.forks_count
    }))
  } catch {
    return []
  }
}

export async function getGitHubTrendingAll(): Promise<TrendingRepo[]> {
  const langs = ['typescript', 'python', 'javascript', 'go', 'rust', 'swift']
  const results = await Promise.all(langs.map(l => getGitHubTrending(l, 'daily')))
  const flat = results.flat()
  const seen = new Set<string>()
  return flat.filter(r => {
    if (seen.has(r.title)) return false
    seen.add(r.title)
    return true
  })
}

function daysAgo(since: 'daily' | 'weekly'): string {
  const d = new Date()
  d.setDate(d.getDate() - (since === 'daily' ? 1 : 7))
  return d.toISOString().split('T')[0]
}
