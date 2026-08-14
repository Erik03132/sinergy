/**
 * OmniRoute клиент — VPS :20128 (провайдер OpenCode, тариф Go).
 * Primary: бесплатный каскад free-cascade (авто-роутинг по free-моделям).
 * Fallback: auto/best-free → auto/cheap → oc/deepseek-v4-flash-free → прямой OpenRouter.
 * Адрес OmniRoute берётся из OMNIROUTE_URL (по умолчанию — локальный).
 */

import { askOpenRouter } from './openrouter'

const OMNIROUTE_URL = process.env.OMNIROUTE_URL || 'http://localhost:20128/v1/chat/completions'

// Бесплатные модели VPS, проверены 14.08.2026 (все отвечают 200 через US-прокси)
const OMNI_MODELS = ['free-cascade', 'auto/best-free', 'auto/cheap', 'auto/fast', 'oc/deepseek-v4-flash-free']

const VPS_TIMEOUT_MS = 15000
const VPS_HEALTHCHECK_MS = 5000

async function tryModel(
  model: string,
  messages: { role: string; content: string }[],
  signal: AbortSignal
): Promise<string> {
  const response = await fetch(OMNIROUTE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 8192,
      stream: false,
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

// VPS OmniRoute может быть недоступен из некоторых окружений (напр. Vercel,
// где firewall блокирует IP). Быстрый healthcheck чтобы не висеть по 60s на каждой модели.
// Результат кешируется на 60s в рамках процесса (Vercel serverless — один блендер = один процесс).
let vpsAvailability: boolean | null = null
let vpsCheckedAt = 0

async function isVpsAvailable(): Promise<boolean> {
  const now = Date.now()
  if (vpsAvailability !== null && now - vpsCheckedAt < 60000) return vpsAvailability

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), VPS_HEALTHCHECK_MS)
  try {
    // Лёгкий GET: если соединение установлено (даже 404/405) — хост жив.
    // При silent drop (firewall) — таймаут → считаем недоступным.
    const response = await fetch(OMNIROUTE_URL, { method: 'GET', signal: controller.signal })
    vpsAvailability = true
    return true
  } catch {
    vpsAvailability = false
    return false
  } finally {
    vpsCheckedAt = now
    clearTimeout(timer)
  }
}

export async function askOmni(prompt: string, system?: string): Promise<string> {
  const messages = [
    ...(system ? [{ role: 'system' as const, content: system }] : []),
    { role: 'user', content: prompt },
  ]

  // Primary: OmniRoute → провайдер OpenCode (DeepSeek Flash)
  // При 429 повторы бесполезны (лимит не сбрасывается за секунды) — сразу уходим в fallback
  if (await isVpsAvailable()) {
    for (const model of OMNI_MODELS) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), VPS_TIMEOUT_MS)
      try {
        console.log(`🔄 OmniRoute (${model})...`)
        const result = await tryModel(model, messages, controller.signal)
        return result
      } catch (e: any) {
        const isRateLimit = /429|rate|limit/i.test(e.message)
        console.warn(`⚠️ OmniRoute ${model}: ${e.message}${isRateLimit ? ' (rate-limited → OpenRouter)' : ''}`)
      } finally {
        clearTimeout(timer)
      }
    }
    console.warn('OmniRoute exhausted, falling back to OpenRouter free...')
  } else {
    console.warn('⚠️ VPS OmniRoute недоступен, сразу OpenRouter free...')
  }

  return await askOpenRouter(prompt)
}
