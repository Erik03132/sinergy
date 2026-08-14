export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET() {
  const url = process.env.OMNIROUTE_URL || 'http://localhost:20128/v1/chat/completions'
  const results: Record<string, unknown> = { url }

  // GET — проверяет, открыт ли порт (даже 404/405 = хост жив)
  try {
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), 8000)
    const r = await fetch(url, { method: 'GET', signal: c.signal })
    clearTimeout(t)
    results.get = { ok: r.ok, status: r.status }
  } catch (e) {
    results.get = { error: String(e) }
  }

  // POST ping — проверяет, отвечает ли сам LLM-сервис (Open Code) из Vercel
  try {
    const c = new AbortController()
    const t = setTimeout(() => c.abort(), 15000)
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'auto/fast',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
      }),
      signal: c.signal,
    })
    clearTimeout(t)
    const txt = await r.text()
    results.post = { ok: r.ok, status: r.status, len: txt.length }
  } catch (e) {
    results.post = { error: String(e) }
  }

  return Response.json(results)
}
