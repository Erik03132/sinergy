import https from 'https'
import { HttpsProxyAgent } from 'https-proxy-agent'

const PROXY_URL = process.env.HTTP_PROXY || 'http://Q3NeJXTY:dsBaWh2L@172.120.21.141:64468'

const OR_MODELS = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'openrouter/free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'cohere/north-mini-code:free',
  'openai/gpt-oss-20b:free',
]

function request(url: string, body: object, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const agent = new HttpsProxyAgent(PROXY_URL)

    const req = https.request({
      hostname: u.hostname,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      agent,
      signal,
    }, (res) => {
      let data = ''
      res.on('data', (chunk: string) => data += chunk)
      res.on('end', () => {
        if (!res.statusCode || res.statusCode >= 400) {
          reject(new Error(`${res.statusCode}: ${data.slice(0, 200)}`))
        } else {
          try {
            const parsed = JSON.parse(data)
            const content = parsed?.choices?.[0]?.message?.content
            if (content) resolve(content)
            else reject(new Error('empty response'))
          } catch (e) {
            reject(new Error(`parse error: ${data.slice(0, 200)}`))
          }
        }
      })
    })

    req.on('error', reject)
    req.write(JSON.stringify(body))
    req.end()
  })
}

export async function askOmni(prompt: string, system?: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 90000)

  const messages = [
    ...(system ? [{ role: 'system' as const, content: system }] : []),
    { role: 'user', content: prompt },
  ]

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

  try {
    if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not set')

    // 3 pass с задержкой между попытками (rate-limit на free моделях)
    for (let pass = 0; pass < 3; pass++) {
      for (const model of OR_MODELS) {
        try {
          return await request('https://openrouter.ai/api/v1/chat/completions', {
            model,
            messages,
            temperature: 0.3,
          }, controller.signal)
        } catch (e: any) {
          const isRateLimit = /429|rate|limit/i.test(e.message)
          console.warn(`OR ${model} failed: ${e.message}${isRateLimit ? ' (rate-limited)' : ''}`)
          if (isRateLimit) await sleep(1500)
        }
      }
      console.warn(`Pass ${pass + 1} exhausted, retrying...`)
      await sleep(2000)
    }

    throw new Error('All OpenRouter models failed')
  } finally {
    clearTimeout(timer)
  }
}
