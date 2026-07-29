/**
 * AI клиент с каскадным fallback.
 * Primary: OpenRouter (DeepSeek V3, дешёвый)  →  Fallback: Gemini (если ключ есть)
 */

import { askOpenRouter } from './openrouter'

interface GeminiResponse {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>
}

const MODELS = [
    'openrouter',             // Primary: OpenRouter (DeepSeek V3, $0)
    'gemini-2.0-flash',       // Fallback 1: Gemini (если ключ есть)
    'gemini-2.0-flash-lite',  // Fallback 2: Lightweight
]

async function fetchGemini(model: string, apiKey: string, prompt: string, search: boolean = false) {
    const body: Record<string, unknown> = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }

    if (search && model.startsWith('gemini')) {
        body.tools = [{ google_search_retrieval: {} }]
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000) // 25s timeout

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal
            }
        )
        return response
    } finally {
        clearTimeout(timeoutId)
    }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function askGemini(prompt: string, options: { search?: boolean } = {}): Promise<string> {
    const keys = [
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_API_KEY_SECONDARY
    ].filter(Boolean) as string[]

    const { search = false } = options
    const errors: string[] = []

    for (const model of MODELS) {
        try {
            // --- Gemini (Google) ---
            if (model.startsWith('gemini')) {
                if (keys.length === 0) {
                    errors.push('[gemini] GEMINI_API_KEY не задан')
                    continue
                }

                for (const key of keys) {
                    console.log(`🤖 Gemini (${model})${search ? ' + Search' : ''} [Key: ...${key.slice(-4)}]`)
                    const response = await fetchGemini(model, key, prompt, search)

                    if (response.ok) {
                        const data: GeminiResponse = await response.json()
                        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
                        if (text) return text
                    }

                    const errText = await response.text()
                    console.warn(`⚠️ Gemini ${model} [${key.slice(-4)}] failed (${response.status}):`, errText)
                    errors.push(`[gemini:${model}] HTTP ${response.status}`)
                }
                continue
            }

            // --- OpenRouter ---
            if (model === 'openrouter') {
                if (!process.env.OPENROUTER_API_KEY) {
                    console.log('⏭ OpenRouter: ключ не задан, пропускаем')
                    continue
                }
                try {
                    console.log('🤖 OpenRouter...')
                    return await askOpenRouter(prompt)
                } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : String(e)
                    console.warn('⚠️ OpenRouter failed:', msg)
                    errors.push(`[openrouter] ${msg}`)
                }
                continue
            }

        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e)
            console.error(`❌ Провайдер (${model}) крашнулся:`, msg)
            errors.push(`[${model}] ${msg}`)
            await delay(100)
        }
    }

    // Формируем понятное сообщение об ошибке
    const hasGeminiKey = keys.length > 0
    if (!hasGeminiKey) {
        throw new Error('AI недоступен: не задан GEMINI_API_KEY. Обратитесь к администратору.')
    }

    throw new Error('AI временно недоступен. Все провайдеры не ответили. Попробуйте позже.')
}
