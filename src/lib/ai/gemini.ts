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
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'openrouter', // OpenRouter acts as a massive fallback aggregator
    'moonshot',
    'deepseek'
]

async function fetchGemini(model: string, apiKey: string, prompt: string) {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user' as const, parts: [{ text: prompt }] }] satisfies GeminiMessage[],
            }),
        }
    )
    return response
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function askGemini(prompt: string): Promise<string> {
    const geminiKey = process.env.GEMINI_API_KEY

    // We try models in sequence
    for (const model of MODELS) {
        try {
            console.log(`🤖 Asking AI (${model})...`)

            // Handle Gemini Models
            if (model.startsWith('gemini')) {
                if (!geminiKey) continue
                const response = await fetchGemini(model, geminiKey, prompt)

                if (response.ok) {
                    const data: GeminiResponse = await response.json()
                    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
                }

                // If rate limited, wait and try next
                if (response.status === 429 || response.status === 503 || response.status === 404) {
                    console.warn(`⚠️ ${model} issue (${response.status}). Switching provider...`)
                    await delay(500)
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

            // Handle Moonshot (Kimi)
            else if (model === 'moonshot') {
                try {
                    return await askMoonshot(prompt)
                } catch (e) {
                    console.warn('Moonshot failed, trying next...')
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
            await delay(500)
        }
    }

    throw new Error('All AI providers failed. Current load is too high.')
}
