/**
 * Perplexity API клиент (Sonar Pro)
 * Документация: https://docs.perplexity.ai
 */

interface PerplexityMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

interface PerplexityResponse {
    choices: Array<{ message: { content: string } }>
}

export async function askPerplexity(messages: PerplexityMessage[]): Promise<string> {
    const apiKey = process.env.PERPLEXITY_API_KEY
    if (!apiKey) throw new Error('PERPLEXITY_API_KEY не задан')

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'sonar-pro',
            messages,
        }),
    })

    if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`)
    }

    const data: PerplexityResponse = await response.json()
    return data.choices[0].message.content
}
