export type VerticalValue = 'News' | 'News (AI)' | string

const AI_BUSINESS_TERMS = [
  'ai',
  ' llm',
  'gpt',
  'chatgpt',
  'claude',
  'gemini',
  'copilot',
  'machine learning',
  'neural',
  'нейросет',
  'нейронн',
  'агент',
  'автоматиз',
  'генеративн',
  'rag',
  'fine-tuning',
  'инференс',
  'компьютерное зрение',
  'computer vision',
  'voice ai',
  'голосовой',
  'ml ',
  ' deep',
  'stt',
  'tts',
  'vision',
  'aided',
  'llm оп',
  'ai-',
]

export function detectAiBusiness(text: string): boolean {
  const lower = ` ${text.toLowerCase()} `
  return AI_BUSINESS_TERMS.some((t) => lower.includes(t))
}

export function normalizeVertical(v: string | undefined | null): string {
  if (!v) return 'News'
  const mapped: Record<string, string> = {
    Новости: 'News',
    News: 'News',
    'News (AI)': 'News (AI)',
    новости: 'News',
    ai: 'News (AI)',
  }
  return mapped[v] || v
}

export function resolveNewsVertical(title: string, description: string): string {
  if (detectAiBusiness(`${title} ${description}`)) return 'News (AI)'
  return 'News'
}
