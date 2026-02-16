/**
 * Google Gemini API клиент
 * Документация: https://ai.google.dev
 */

interface GeminiMessage {
    role: 'user' | 'model'
    parts: Array<{ text: string }>
}

interface GeminiResponse {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>
}

export async function askGemini(prompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY не задан')

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user' as const, parts: [{ text: prompt }] }] satisfies GeminiMessage[],
            }),
        }
    )

    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
    }

    const data: GeminiResponse = await response.json()
    return data.candidates[0].content.parts[0].text
}
