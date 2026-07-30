const OMNI_URL = process.env.OMNI_URL || 'http://217.149.23.113:20128/v1'
const OMNI_MODEL = process.env.OMNI_MODEL || 'deepseek/deepseek-chat'

export async function askOmni(prompt: string, system?: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)

  try {
    const res = await fetch(`${OMNI_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OMNI_MODEL,
        messages: [
          ...(system ? [{ role: 'system' as const, content: system }] : []),
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const err = await res.text().catch(() => '')
      throw new Error(`Omni ${res.status}: ${err.slice(0, 200)}`)
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) throw new Error('Omni: empty response')
    return content
  } finally {
    clearTimeout(timer)
  }
}
