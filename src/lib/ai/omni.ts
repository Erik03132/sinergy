import { HttpsProxyAgent } from 'https-proxy-agent'

const OMNI_URL = process.env.OMNI_URL || 'http://217.149.23.113:20128/v1'
const OMNI_MODEL = process.env.OMNI_MODEL || 'auto/free-coding'

const PROXY_URL = process.env.HTTP_PROXY || 'http://Q3NeJXTY:dsBaWh2L@172.120.21.141:64468'

async function fetchViaProxy(url: string, body: object, signal: AbortSignal): Promise<string> {
  const agent = new HttpsProxyAgent(PROXY_URL)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
    dispatcher: agent as any,
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

async function fetchDirect(url: string, body: object, signal: AbortSignal): Promise<string> {
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

  const messages = [
    ...(system ? [{ role: 'system' as const, content: system }] : []),
    { role: 'user', content: prompt },
  ]

  try {
    // 1. DeepSeek via US proxy
    const dsKey = process.env.DEEPSEEK_API_KEY
    if (dsKey) {
      try {
        return await fetchViaProxy('https://api.deepseek.com/v1/chat/completions', {
          model: 'deepseek-chat',
          messages,
          temperature: 0.3,
        }, controller.signal)
      } catch (e: any) {
        console.warn(`DeepSeek failed: ${e.message}`)
      }
    }

    // 2. OmniRoute (VPS, free models, may need proxy depending on model)
    try {
      return await fetchDirect(`${OMNI_URL}/chat/completions`, {
        model: OMNI_MODEL,
        messages,
        temperature: 0.3,
      }, controller.signal)
    } catch (e: any) {
      console.warn(`OmniRoute failed: ${e.message}`)
    }

    throw new Error('All AI providers failed')
  } finally {
    clearTimeout(timer)
  }
}
