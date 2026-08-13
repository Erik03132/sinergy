/**
 * OmniRoute клиент — локальный :20128 (провайдер OpenCode, тариф Go).
 * Primary: oc/deepseek-v4-flash-free (бесплатная модель DeepSeek Flash).
 * Fallback: прямой OpenRouter с бесплатными моделями (ключ из env).
 * Адрес OmniRoute берётся из OMNIROUTE_URL (по умолчанию — локальный).
 */

import { askOpenRouter } from './openrouter'

const OMNIROUTE_URL = process.env.OMNIROUTE_URL || 'http://localhost:20128/v1/chat/completions'

const OMNI_MODELS = ['oc/deepseek-v4-flash-free']

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

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

export async function askOmni(prompt: string, system?: string): Promise<string> {
  const messages = [
    ...(system ? [{ role: 'system' as const, content: system }] : []),
    { role: 'user', content: prompt },
  ]

  // Primary: OmniRoute → провайдер OpenCode (DeepSeek Flash)
  // При 429 повторы бесполезны (лимит не сбрасывается за секунды) — сразу уходим в fallback
  for (const model of OMNI_MODELS) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 60000)
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
  return await askOpenRouter(prompt)
}
