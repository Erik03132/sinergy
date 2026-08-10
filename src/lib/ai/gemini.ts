/**
 * AI клиент с каскадным fallback.
 * Primary: OmniRoute VPS (бесплатные модели, авто-роутинг)
 * Fallback: Gemini 2.0 Flash → Flash Lite (требует GEMINI_API_KEY)
 */

import { askOmni } from './omni'

interface GeminiResponse {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>
}

const GEMINI_MODELS = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
]

async function fetchGemini(model: string, apiKey: string, prompt: string, search: boolean = false) {
    const body: Record<string, unknown> = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }

    if (search && model.startsWith('gemini')) {
        body.tools = [{ google_search_retrieval: {} }]
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000)

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

export async function askGemini(prompt: string, options: { search?: boolean } = {}): Promise<string> {
    const { search = false } = options
    const errors: string[] = []

    // Search-grounded запросы идут напрямую в Gemini (OmniRoute не поддерживает grounding)
    if (search) {
        const keys = [
            process.env.GEMINI_API_KEY,
            process.env.GEMINI_API_KEY_SECONDARY,
        ].filter(Boolean) as string[]

        if (keys.length === 0) {
            throw new Error('AI search недоступен: не задан GEMINI_API_KEY')
        }

        for (const model of GEMINI_MODELS) {
            for (const key of keys) {
                try {
                    console.log(`🔍 Gemini ${model} + Search [Key: ...${key.slice(-4)}]`)
                    const response = await fetchGemini(model, key, prompt, true)

                    if (response.ok) {
                        const data: GeminiResponse = await response.json()
                        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
                        if (text) return text
                    }

                    const errText = await response.text()
                    console.warn(`⚠️ Gemini ${model} [${key.slice(-4)}] failed (${response.status}): ${errText.slice(0, 200)}`)
                } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : String(e)
                    errors.push(`[gemini:${model}] ${msg}`)
                }
            }
        }

        throw new Error('AI search временно недоступен. Все Gemini-ключи не ответили.')
    }

    // Primary: OmniRoute (бесплатные модели через VPS)
    try {
        console.log('🔄 OmniRoute (primary)...')
        return await askOmni(prompt)
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        console.warn('⚠️ OmniRoute failed:', msg)
        errors.push(`[omni] ${msg}`)
    }

    // Fallback: Gemini
    const keys = [
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_API_KEY_SECONDARY,
    ].filter(Boolean) as string[]

    if (keys.length > 0) {
        for (const model of GEMINI_MODELS) {
            for (const key of keys) {
                try {
                    console.log(`🤖 Gemini ${model} [Key: ...${key.slice(-4)}]`)
                    const response = await fetchGemini(model, key, prompt, false)

                    if (response.ok) {
                        const data: GeminiResponse = await response.json()
                        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
                        if (text) return text
                    }

                    const errText = await response.text()
                    console.warn(`⚠️ Gemini ${model} [${key.slice(-4)}] failed (${response.status}): ${errText.slice(0, 200)}`)
                    errors.push(`[gemini:${model}] HTTP ${response.status}`)
                } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : String(e)
                    errors.push(`[gemini:${model}] ${msg}`)
                }
            }
        }
    }

    throw new Error('AI временно недоступен. Все провайдеры не ответили. Попробуйте позже.')
}
