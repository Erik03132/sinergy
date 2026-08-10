/**
 * OmniRoute клиент — VPS 217.149.23.113:20128.
 * OpenAI-совместимый API, авто-роутинг OpenRouter/free/cheap.
 * Без прокси (российский сервер — ADR-002).
 */

const OMNIROUTE_URL = 'http://217.149.23.113:20128/v1/chat/completions'

const FREE_MODELS = [
  'deepseek/deepseek-chat',
  'google/gemini-2.0-flash-001',
  'openai/gpt-4o-mini',
]

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function tryModel(model: string, messages: { role: string; content: string }[], signal: AbortSignal): Promise<string> {
  const response = await fetch(OMNIROUTE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 2048,
    }),
    signal,
  })

  if (!response.ok) {
    const err = await response.text().catch(() => '')
    throw new Error(`${response.status}: ${err.slice(0, 200)}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (content) return content

  throw new Error('empty response')
}

export async function askOmni(prompt: string, system?: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 120000)

  const messages = [
    ...(system ? [{ role: 'system' as const, content: system }] : []),
    { role: 'user', content: prompt },
  ]

  try {
    if (!process.env.OMNIROUTE_URL && !process.env.OPENROUTER_API_KEY) {
      throw new Error('OmniRoute URL and OpenRouter key not set')
    }

    for (let pass = 0; pass < 3; pass++) {
      for (const model of FREE_MODELS) {
        try {
          console.log(`🔄 OmniRoute (${model})...`)
          const result = await tryModel(model, messages, controller.signal)
          return result
        } catch (e: any) {
          const isRateLimit = /429|rate|limit/i.test(e.message)
          console.warn(`⚠️ OmniRoute ${model}: ${e.message}${isRateLimit ? ' (rate-limited)' : ''}`)
          if (isRateLimit) await sleep(2000)
        }
      }
      console.warn(`OmniRoute pass ${pass + 1} exhausted, retrying...`)
      await sleep(3000)
    }

    throw new Error('All OmniRoute models exhausted')
  } finally {
    clearTimeout(timer)
  }
}
