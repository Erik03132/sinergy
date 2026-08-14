export const runtime = 'nodejs'
export const maxDuration = 60

const OMNI_MODELS = ['free-cascade', 'auto/best-free', 'auto/cheap', 'auto/fast', 'oc/deepseek-v4-flash-free']

export async function GET() {
  const url = process.env.OMNIROUTE_URL || 'http://localhost:20128/v1/chat/completions'
  const results: Record<string, unknown> = { url }

  for (const model of OMNI_MODELS) {
    const start = Date.now()
    try {
      const c = new AbortController()
      const t = setTimeout(() => c.abort(), 20000)
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 10,
        }),
        signal: c.signal,
      })
      clearTimeout(t)
      const txt = await r.text()
      results[model] = { ok: r.ok, status: r.status, ms: Date.now() - start, len: txt.length }
    } catch (e) {
      results[model] = { error: String(e), ms: Date.now() - start }
    }
  }

  return Response.json(results)
}
