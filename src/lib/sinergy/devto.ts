export interface DevToArticle {
  title: string
  description: string
  url: string
  tags: string[]
  user: string
  positive_reactions: number
  comments: number
}

export async function getDevToStartupPosts(signal?: AbortSignal): Promise<DevToArticle[]> {
  const tags = ['startup', 'saas', 'indiehackers']
  const results: DevToArticle[] = []

  for (const tag of tags) {
    try {
      const res = await fetch(`https://dev.to/api/articles?tag=${tag}&per_page=5`, {
        headers: { 'User-Agent': 'Sinergy/1.0' },
        signal
      })
      if (!res.ok) continue
      const articles: any[] = await res.json()
      for (const a of articles) {
        results.push({
          title: a.title,
          description: a.description || '',
          url: a.url,
          tags: a.tag_list || [],
          user: a.user?.name || 'Unknown',
          positive_reactions: a.positive_reactions_count || 0,
          comments: a.comments_count || 0,
        })
      }
    } catch { }
  }

  return results
}
