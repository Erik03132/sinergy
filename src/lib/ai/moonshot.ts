
interface MoonshotMessage {
    role: 'user' | 'system' | 'assistant';
    content: string;
}

interface MoonshotResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

export async function askMoonshot(prompt: string): Promise<string> {
    const apiKey = process.env.MOONSHOT_API_KEY
    if (!apiKey) throw new Error('MOONSHOT_API_KEY missing')

    try {
        const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'moonshot-v1-8k', // Standard model
                messages: [
                    { role: 'system', content: 'You are a helpful startup analyst. Output JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3
            })
        })

        if (!response.ok) {
            const err = await response.text()
            throw new Error(`Moonshot API error: ${response.status} - ${err}`)
        }

        const data: MoonshotResponse = await response.json()
        return data.choices[0].message.content
    } catch (error) {
        console.error('Moonshot Call Failed:', error)
        throw error
    }
}
