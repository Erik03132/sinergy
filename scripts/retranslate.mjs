/**
 * Скрипт для ретрансляции существующих идей в БД.
 * Запуск: node --loader ts-node/esm scripts/retranslate.mjs
 * Или: npx tsx scripts/retranslate.mjs
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function retranslateAll() {
  // Fetch all items
  const { data: items, error } = await supabase
    .from('ideas')
    .select('id, title, description, metadata')
    .limit(500)

  if (error) {
    console.error('Fetch error:', error)
    return
  }

  console.log(`Found ${items.length} items`)

  // Filter only items with English titles (no Cyrillic chars)
  const english = items.filter(it => {
    if (!it.title) return false
    const hasCyrillic = /[А-Яа-яЁё]/.test(it.title)
    const hasLatin = /[A-Za-z]/.test(it.title)
    return hasLatin && !hasCyrillic
  })

  console.log(`${english.length} items need translation`)

  if (english.length === 0) {
    console.log('No English items found')
    return
  }

  // Translate via Gemini
  const GEMINI_KEY = process.env.GEMINI_API_KEY
  if (!GEMINI_KEY) {
    console.error('GEMINI_API_KEY not set')
    return
  }

  let updated = 0
  for (const item of english) {
    try {
      const prompt = `Переведи заголовок и описание стартапа на русский язык. Сохрани термины и названия продуктов.
Верни ТОЛЬКО JSON: {"title_ru":"...","description_ru":"..."}

title: ${item.title}
description: ${item.description || item.title}`

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3 }
          })
        }
      )

      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        const newTitle = parsed.title_ru || item.title
        const newDesc = parsed.description_ru || item.description

        if (newTitle !== item.title) {
          await supabase.from('ideas').update({
            title: newTitle.slice(0, 500),
            description: newDesc.slice(0, 2000),
            metadata: { ...(item.metadata || {}), retranslated: true }
          }).eq('id', item.id)

          updated++
          console.log(`[${updated}/${english.length}] ${item.title.slice(0, 50)} → ${newTitle.slice(0, 50)}`)
        }
      }
    } catch (e) {
      console.error(`Failed: ${item.title.slice(0, 30)}:`, e?.message || e)
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`Done! Updated ${updated}/${english.length} items`)
}

retranslateAll()
