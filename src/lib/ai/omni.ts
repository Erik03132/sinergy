import { SocksProxyAgent } from 'socks-proxy-agent'

const PROXY_URL = process.env.HTTP_PROXY || 'socks5h://Q3NeJXTY:dsBaWh2L@172.120.21.141:64469'

const OR_MODELS = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'openrouter/free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'cohere/north-mini-code:free',
  'openai/gpt-oss-20b:free',
]

const API_KEY = process.env.OPENROUTER_API_KEY

async function fetchViaProxy(url: string, body: object, signal: AbortSignal): Promise<string> {
  const agent = new SocksProxyAgent(PROXY_URL)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
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

export async function askOmni(prompt: string, system?: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60000)

  const messages = [
    ...(system ? [{ role: 'system' as const, content: system }] : []),
    { role: 'user', content: prompt },
  ]

  try {
    for (const model of OR_MODELS) {
      try {
        return await fetchViaProxy('https://openrouter.ai/api/v1/chat/completions', {
          model,
          messages,
          temperature: 0.3,
        }, controller.signal)
      } catch (e: any) {
        console.warn(`OR ${model} failed: ${e.message}`)
      }
    }

    throw new Error('All OpenRouter models failed')
  } finally {
    clearTimeout(timer)
  }
}
