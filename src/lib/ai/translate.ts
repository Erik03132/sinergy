import { askOmni } from './omni'

interface Translatable {
  title: string
  description: string
}

interface TranslatedResult {
  title_ru: string
  description_ru: string
  summary_ru: string
}

const CHUNK_SIZE = 8

export async function translateBatch(
  items: Translatable[],
  sourceLang: string = 'английского',
  targetLang: string = 'русский'
): Promise<(Translatable & { summary?: string })[]> {
  if (items.length === 0) return []

  const result: (Translatable & { summary?: string })[] = new Array(items.length)
  const chunks = Math.ceil(items.length / CHUNK_SIZE)

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE)
    const translated = await translateChunk(chunk, sourceLang, targetLang)
    for (let j = 0; j < chunk.length; j++) {
      result[i + j] = translated[j] || chunk[j]
    }
    console.log(`translated chunk ${i / CHUNK_SIZE + 1}/${chunks}`)
  }
  return result
}

async function translateChunk(
  items: Translatable[],
  sourceLang: string,
  targetLang: string
): Promise<(Translatable & { summary?: string })[]> {
  const prompt = `Переведи следующие ${items.length} заголовков и описаний стартапов с ${sourceLang} на ${targetLang}.
Для каждого элемента также напиши краткое саммари (2-3 предложения) на ${targetLang}, объясняющее суть проекта простыми словами.
Сохрани смысл, термины (tech-стек, названия продуктов/компаний) и форматирование.

Верни ТОЛЬКО JSON-массив, каждый элемент: {"title_ru":"...","description_ru":"...","summary_ru":"..."}
Никакого объяснения, только JSON.

Тексты для перевода:
${items.map((item, i) => `[${i}]
title: ${item.title}
description: ${item.description || '-'}`).join('\n\n')}`

  const raw = await askOmni(prompt, 'Ты переводишь заголовки и описания стартапов. Отвечай только JSON.')
  return parseResponse(raw, items)
}

function parseResponse(raw: string, items: Translatable[]): (Translatable & { summary?: string })[] {
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim()

  let parsed: TranslatedResult[]
  try {
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/)
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned)
  } catch (e) {
    console.warn(`translateBatch: JSON parse error: ${e?.message || e}`)
    return items
  }

  if (!Array.isArray(parsed) || parsed.length !== items.length) {
    console.warn(`translateBatch: expected ${items.length} items, got ${parsed?.length}, falling back to originals`)
    return items
  }

  return items.map((orig, i) => ({
    title: parsed[i]?.title_ru || orig.title,
    description: parsed[i]?.description_ru || orig.description,
    summary: parsed[i]?.summary_ru || undefined,
  }))
}
