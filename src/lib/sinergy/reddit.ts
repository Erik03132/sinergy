export interface RedditPost {
  title: string
  selftext: string
  url: string
  subreddit: string
  score: number
  num_comments: number
  permalink: string
  created_utc: number
}

const SUBREDDITS = [
  'startups',
  'SaaS',
  'EntrepreneurRideAlong',
  'SideProject',
  'microsaas',
  'SaaSy',
  'indiehackers',
  'SmallBusiness',
  'alphaandbetausers',
]

export async function getRedditStartupPosts(limitPerSub: number = 5, signal?: AbortSignal): Promise<RedditPost[]> {
  const results: RedditPost[] = []

  const fetches = SUBREDDITS.map(async (sub) => {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=${limitPerSub}`, {
        signal,
        headers: {
          'User-Agent': 'Sinergy/1.0 (startup discovery)',
          'Accept': 'application/json',
        }
      })
      if (!res.ok) return

      const data = await res.json()

      for (const child of data.data?.children || []) {
        const p = child.data
        if (p.stickied) continue

        results.push({
          title: p.title,
          selftext: (p.selftext || '').slice(0, 1000),
          url: p.url.startsWith('/r/')
            ? `https://www.reddit.com${p.permalink}`
            : (p.url.startsWith('http') ? p.url : `https://www.reddit.com${p.permalink}`),
          subreddit: p.subreddit,
          score: p.score,
          num_comments: p.num_comments,
          permalink: `https://www.reddit.com${p.permalink}`,
          created_utc: p.created_utc,
        })
      }
    } catch { }
  })

  await Promise.allSettled(fetches)
  return results
}
