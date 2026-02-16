
interface DeepSeekMessage {
    role: 'user' | 'system' | 'assistant';
    content: string;
}

interface DeepSeekResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

export async function askDeepSeek(prompt: string): Promise<string> {
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) throw new Error('DEEPSEEK_API_KEY missing')

    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: 'You are a helpful startup analyst. Output JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3
            })
        })

        if (!response.ok) {
            const err = await response.text()
            throw new Error(`DeepSeek API error: ${response.status} - ${err}`)
        }

        const data: DeepSeekResponse = await response.json()
        return data.choices[0].message.content
    } catch (error) {
        console.error('DeepSeek Call Failed:', error)
        throw error
    }
}
