
// Qwen often uses DashScope API format
interface QwenMessage {
    role: 'user' | 'system' | 'assistant';
    content: string;
}

interface QwenResponse {
    output: {
        text: string;
    };
    usage: any;
}

export async function askQwen(prompt: string): Promise<string> {
    const apiKey = process.env.QWEN_API_KEY // DASHSCOPE_API_KEY
    if (!apiKey) throw new Error('QWEN_API_KEY missing')

    try {
        const response = await fetch('https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'qwen-turbo',
                input: {
                    messages: [
                        { role: 'system', content: 'You are a helpful startup analyst. Output JSON.' },
                        { role: 'user', content: prompt }
                    ]
                },
                parameters: {
                    result_format: 'message'
                }
            })
        })

        if (!response.ok) {
            const err = await response.text()
            throw new Error(`Qwen API error: ${response.status} - ${err}`)
        }

        const data: any = await response.json()
        return data.output.choices[0].message.content
    } catch (error) {
        console.error('Qwen Call Failed:', error)
        throw error
    }
}
