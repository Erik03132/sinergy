/**
 * Google Gemini API клиент + Multi-Provider Fallback (The "Brain")
 * Документация: https://ai.google.dev
 */

import { askMoonshot } from './moonshot'
import { askDeepSeek } from './deepseek'
import { askOpenRouter } from './openrouter'
// import { askQwen } from './qwen'

interface GeminiMessage {
    role: 'user' | 'model'
    parts: Array<{ text: string }>
}

interface GeminiResponse {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>
}

const MODELS = [
    'gemini-2.0-flash',       // Primary: Fastest & most reliable
    'openrouter',             // Fallback 1: High availability
    'gemini-2.0-flash-lite',  // Fallback 2: Lightweight
    'deepseek'                // Fallback 3
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
    const geminiKey = process.env.GEMINI_API_KEY
    const { search = false } = options

    // We try models in sequence
    for (const model of MODELS) {
        try {
            console.log(`🤖 Asking AI (${model})${search ? ' with search' : ''}...`)

            // Handle Gemini Models
            if (model.startsWith('gemini')) {
                if (!geminiKey) continue
                const response = await fetchGemini(model, geminiKey, prompt, search)

                if (response.ok) {
                    const data: GeminiResponse = await response.json()
                    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
                }

                // If rate limited, wait and try next
                if (response.status === 429 || response.status === 503 || response.status === 404) {
                    console.warn(`⚠️ ${model} issue (${response.status}). Switching provider...`)
                    await delay(100)
                    continue
                }
            }

            // Handle OpenRouter
            else if (model === 'openrouter') {
                try {
                    return await askOpenRouter(prompt)
                } catch (e) {
                    console.warn('OpenRouter failed, trying next...')
                    continue
                }
            }

            // Handle DeepSeek
            else if (model === 'deepseek') {
                try {
                    return await askDeepSeek(prompt)
                } catch (e) {
                    console.warn('DeepSeek failed, trying next...')
                    continue
                }
            }

        } catch (e) {
            console.error(`❌ Provider error (${model}):`, e)
            await delay(100)
        }
    }

    throw new Error('All AI providers failed. Current load is too high.')
}
