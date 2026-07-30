const OMNI_URL = process.env.OMNI_URL || 'http://217.149.23.113:20128/v1'
const OMNI_MODEL = process.env.OMNI_MODEL || 'auto/free-coding'

async function fetchChat(url: string, body: object, signal: AbortSignal): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`${res.status}: ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('empty response')
  return content
}

export async function askOmni(prompt: string, system?: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)

  try {
    // 1. Try OmniRoute
    try {
      return await fetchChat(`${OMNI_URL}/chat/completions`, {
        model: OMNI_MODEL,
        messages: [
          ...(system ? [{ role: 'system' as const, content: system }] : []),
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }, controller.signal)
    } catch (e: any) {
      console.warn(`OmniRoute failed: ${e.message}, trying DeepSeek...`)
    }

    // 2. Fallback: DeepSeek directly (works in Russia)
    const dsKey = process.env.DEEPSEEK_API_KEY
    if (dsKey) {
      return await fetchChat('https://api.deepseek.com/v1/chat/completions', {
        model: 'deepseek-chat',
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }, controller.signal)
    }

    throw new Error('All AI providers failed')
  } finally {
    clearTimeout(timer)
  }
}
