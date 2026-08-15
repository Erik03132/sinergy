/**
 * OmniRoute клиент — VPS :20128 (провайдер OpenCode, тариф Go).
 * Primary: бесплатный каскад free-cascade (авто-роутинг по free-моделям).
 * Fallback: auto/best-free → auto/cheap → oc/deepseek-v4-flash-free → прямой OpenRouter.
 * Адрес OmniRoute берётся из OMNIROUTE_URL (по умолчанию — локальный).
 */

import { askOpenRouter } from './openrouter'

const OMNIROUTE_URL = process.env.OMNIROUTE_URL || 'http://localhost:20128/v1/chat/completions'

// Бесплатные модели VPS, проверены 14-15.08.2026. auto/fast — самый быстрый (1.5s),
// free-cascade часто перегружен (до 30s+). Порядок: от быстрого к медленному.
const OMNI_MODELS = ['auto/fast', 'auto/best-free', 'auto/cheap', 'free-cascade', 'oc/deepseek-v4-flash-free']

// VPS OmniRoute (провайдер OpenCode) нестабилен из Vercel: часто hangs/empty до 30s+.
// Короткий таймаут (4s) — быстро уходим в fallback на OpenRouter (nemotron ~3s).
// Сумма VPS-таймаутов (5 моделей × 4s = 20s) + OpenRouter (3s) = 23s < 60s лимита Vercel.
const VPS_TIMEOUT_MS = 4000

// Каскад из ДВУХ провайдеров (по запросу 15.08):
// 1) VPS OmniRoute — провайдер OpenCode (тариф Zen, бесплатные модели: free-cascade, auto/fast...)
// 2) OpenRouter (наш OPENROUTER_API_KEY) — бесплатные модели (nemotron, gpt-oss-20b:free...)
// VPS primary; при сбое всех VPS-моделей (в т.ч. Insufficient credits у провайдера) —
// автоматический fallback на OpenRouter free (см. конец askOmni).
// Выключается только при явном OMNIROUTE_ENABLED=false (например, если VPS временно мёртв).
const OMNIROUTE_ENABLED = process.env.OMNIROUTE_ENABLED !== 'false'

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
      max_tokens: 2048,
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

export async function askOmni(prompt: string, system?: string): Promise<string> {
  const messages = [
    ...(system ? [{ role: 'system' as const, content: system }] : []),
    { role: 'user', content: prompt },
  ]

  // Primary: OmniRoute → провайдер OpenCode (DeepSeek Flash)
  // При 429 повторы бесполезны (лимит не сбрасывается за секунды) — сразу уходим в fallback
  if (OMNIROUTE_ENABLED) {
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
    console.warn('⚠️ VPS OmniRoute отключён (OMNIROUTE_ENABLED=false), OpenRouter free...')
  }

  return await askOpenRouter(prompt)
}
