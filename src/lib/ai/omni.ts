/**
 * OmniRoute клиент — VPS :20128 (провайдер OpenCode, тариф Go).
 * Primary: бесплатный каскад free-cascade (авто-роутинг по free-моделям).
 * Fallback: auto/best-free → auto/cheap → oc/deepseek-v4-flash-free → прямой OpenRouter.
 * Адрес OmniRoute берётся из OMNIROUTE_URL (по умолчанию — локальный).
 */

import { askOpenRouter } from './openrouter'

const OMNIROUTE_URL = process.env.OMNIROUTE_URL || 'http://localhost:20128/v1/chat/completions'

// ⚠️ ВЛАДЕЛЕЦ ЗАПРЕТИЛ МЕНЯТЬ КОМБО БЕЗ ЕГО ЯВНОЙ КОМАНДЫ (16.08.2026).
// Единственное разрешённое комбо: auto/free-coding на VPS OmniRoute
// (OpenCode Zen free weights 1-5 → OpenRouter :free weights 6-20, стратегия priority).
// Встроенные пулы auto/fast, auto/best-free, auto/cheap, free-cascade ЗАПРЕЩЕНЫ —
// они резолвятся в ПЛАТНЫЕ модели OpenRouter и падают с "Insufficient credits".
const OMNI_MODELS = ['auto/free-coding', 'oc/deepseek-v4-flash-free']

// Каскад auto/free-coding использует reasoning-модели (hy3-free, nemotron-free):
// TTFT 5-15s — короткий таймаут обрывает валидные ответы.
// 2 модели × 20s = 40s worst case до fallback на OpenRouter.
const VPS_TIMEOUT_MS = 20000

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
