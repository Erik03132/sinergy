interface OpenRouterMessage {
  role: 'user' | 'system' | 'assistant'
  content: string
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

// Актуальные бесплатные модели OpenRouter (проверены 13-15.08.2026: nemotron отвечает 200,
// gpt-oss-20b:free даёт 429). nemotron — самый надёжный, ставим первым.
const OR_MODELS = [
  'nvidia/nemotron-3-ultra-550b-a55b:free', // 1M контекст, самая мощная бесплатная
  'openai/gpt-oss-20b:free', // OpenAI OSS 20B (часто 429 — запасной)
  'google/gemma-4-26b-a4b-it:free', // Google Gemma 4 26B
  'cohere/north-mini-code:free', // Cohere North Mini
  'inclusionai/ling-3.0-tiny:free', // Ling 3.0 Tiny
  'openrouter/free', // Автоматический роутер по всем бесплатным
]

export async function askOpenRouter(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY missing')

  // Try the first available model that works
  for (const model of OR_MODELS) {
    try {
      console.log(`🦄 Asking OpenRouter (${model})...`)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000)

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Sinergy Startup Analyzer',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: 'You are a helpful startup analyst. Output valid JSON in Russian.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const err = await response.text()
        console.warn(`OpenRouter model ${model} failed (${response.status}): ${err}`)
        continue
      }

      const data = await response.json()
      const content = data?.choices?.[0]?.message?.content
      if (content) return content

      console.warn(`OpenRouter model ${model} вернул пустой ответ:`, JSON.stringify(data).slice(0, 200))
      continue
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`OpenRouter error with ${model}: ${msg}`)
    }
  }

  throw new Error('All OpenRouter models failed')
}
