/**
 * Google Gemini API клиент + Multi-Provider Fallback (The "Brain")
 * Документация: https://ai.google.dev
 */

import { askMoonshot } from './moonshot'
import { askDeepSeek } from './deepseek'
import { askOpenRouter } from './openrouter'

interface GeminiMessage {
    role: 'user' | 'model'
    parts: Array<{ text: string }>
}

interface GeminiResponse {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>
}

const MODELS = [
    'gemini-2.0-flash',       // Primary: Fastest & most reliable
    'gemini-2.0-flash-lite',  // Fallback 1: Lightweight
    'openrouter',             // Fallback 2: High availability
    'moonshot',               // Fallback 3: Moonshot (Kimi) - valid key available
    'deepseek'                // Fallback 4: DeepSeek
]

async function fetchGemini(model: string, apiKey: string, prompt: string, search: boolean = false) {
    const body: any = {
        contents: [{ role: 'user' as const, parts: [{ text: prompt }] }],
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
    ].filter(Boolean) as string[];

    const { search = false } = options
    const errors: string[] = []

    // We try models in sequence
    for (const model of MODELS) {
        try {
            // Handle Gemini Models with Key cycling
            if (model.startsWith('gemini')) {
                if (keys.length === 0) continue;

                for (const key of keys) {
                    console.log(`🤖 Using Gemini (${model})${search ? ' + Search' : ''} [Key: ${key.slice(-4)}]...`)
                    const response = await fetchGemini(model, key, prompt, search)

                    if (response.ok) {
                        const data: GeminiResponse = await response.json()
                        return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
                    }

                    const errText = await response.text()
                    console.warn(`⚠️ Gemini ${model} key ${key.slice(-4)} failed (${response.status}):`, errText)

                    // If rate limited or 400 (Bad Gateway/Key) - try next key
                    if (response.status === 429 || response.status === 503 || response.status === 400) {
                        continue;
                    }
                }
                // If both keys failed for this model, continue to next model/provider
                continue;
            }

            // Handle OpenRouter
            else if (model === 'openrouter') {
                try {
                    return await askOpenRouter(prompt)
                } catch (e: any) {
                    console.warn('OpenRouter failed:', e.message)
                    errors.push(`[openrouter] ${e.message}`)
                    continue
                }
            }

            // Handle Moonshot (Kimi) - valid MOONSHOT_API_KEY in env
            else if (model === 'moonshot') {
                try {
                    return await askMoonshot(prompt)
                } catch (e: any) {
                    console.warn('Moonshot failed:', e.message)
                    errors.push(`[moonshot] ${e.message}`)
                    continue
                }
            }

            // Handle DeepSeek
            else if (model === 'deepseek') {
                try {
                    return await askDeepSeek(prompt)
                } catch (e: any) {
                    console.warn('DeepSeek failed:', e.message)
                    errors.push(`[deepseek] ${e.message}`)
                    continue
                }
            }

        } catch (e: any) {
            console.error(`❌ Provider error (${model}):`, e)
            errors.push(`[${model}] ${e?.message || 'Unknown error'}`)
            await delay(100)
        }
    }

    throw new Error(`AI Offline. Details: ${errors.join(' | ')}`)
}
