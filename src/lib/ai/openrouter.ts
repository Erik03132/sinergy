
interface OpenRouterMessage {
    role: 'user' | 'system' | 'assistant';
    content: string;
}

interface OpenRouterResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

// List of reliable models on OpenRouter
const OR_MODELS = [
    'google/gemini-2.0-flash-001',       // Very cheap/free
    'google/gemini-2.0-flash-lite-preview-02-05:free', // Try specific free ID if it exists, but fallback to others
    'deepseek/deepseek-chat',            // Cheap
    'qwen/qwen-2.5-72b-instruct',        // High quality
    'mistralai/mistral-7b-instruct',     // Standard
    'meta-llama/llama-3-8b-instruct:free' // Llama 3 free
]

export async function askOpenRouter(prompt: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('OPENROUTER_API_KEY missing')

    // Try the first available model that works
    for (const model of OR_MODELS) {
        try {
            console.log(`🦄 Asking OpenRouter (${model})...`)
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                    'X-Title': 'Sinergy Startup Analyzer'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: 'You are a helpful startup analyst. Output valid JSON in Russian.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3
                })
            })

            if (!response.ok) {
                const err = await response.text()
                console.warn(`OpenRouter model ${model} failed (${response.status}): ${err}`)
                continue // Try next model
            }

            const data: OpenRouterResponse = await response.json()
            return data.choices[0].message.content
        } catch (error) {
            console.error(`OpenRouter error with ${model}:`, error)
        }
    }

    throw new Error('All OpenRouter models failed')
}
