
/**
 * Kimi (Moonshot AI) API клиент
 * Документация: https://platform.moonshot.cn/docs
 * Интерфейс совместим с OpenAI
 */

interface Message {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export async function askKimi(prompt: string, systemPrompt: string = "You are a helpful assistant."): Promise<string> {
    const apiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY
    if (!apiKey) throw new Error('MOONSHOT_API_KEY не задан')

    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "moonshot-v1-8k", // Стандартная модель, можно поменять на 32k/128k
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            temperature: 0.3
        })
    })

    if (!response.ok) {
        const err = await response.text()
        console.error('Kimi API Error:', err)
        throw new Error(`Kimi API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
}
