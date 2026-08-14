import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { askGemini } from '@/lib/ai/gemini'

export const runtime = 'nodejs'
export const maxDuration = 300

const EXTRACT_PROMPT = (
  title: string,
  description: string
) => `Ты — аналитик стартапов. Извлеки структуру из новости/стартапа.
Верни ТОЛЬКО валидный JSON без пояснений:
{
  "vertical": "реальная категория из списка: FinTech, HealthTech, EdTech, AI-infrastructure, DevTools, E-commerce, SaaS, Marketplace, Productivity, LegalTech, HR-tech, ClimateTech, Creator-economy, Gaming, Crypto, BioTech, Robotics, Logistics. НЕ используй 'News'/'News (AI)'",
  "core_tech": ["массив ключевых технологий, напр. AI, Blockchain, Computer Vision, NLP, IoT"],
  "target_audience": "кто целевой пользователь (кратко)",
  "business_model": "модель монетизации: SaaS, Marketplace, Subscription, Freemium, B2B, B2C, Transaction-fee, Hardware",
  "pain_point": "какую проблему решает (кратко)",
  "temporal_marker": "Сейчас | 1-2 года | 3-5 лет"
}

title: ${title}
description: ${description || title}`

function parseJson(raw: string): any | null {
  try {
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return null
    return JSON.parse(m[0])
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 30)

  const supabase = await createClient()

  const { data: recent, error } = await supabase
    .from('ideas')
    .select('id, title, description, core_tech, metadata')
    .eq('source', 'automatic')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const toEnrich = (recent || [])
    .filter((r: any) => !Array.isArray(r.core_tech) || r.core_tech.length === 0)
    .slice(0, limit)

  let updated = 0
  let failed = 0

  for (const item of toEnrich) {
    try {
      const raw = await askGemini(EXTRACT_PROMPT(item.title, item.description || ''))
      const parsed = parseJson(raw)
      if (!parsed || !parsed.vertical) {
        failed++
        continue
      }
      const { error: updErr } = await supabase
        .from('ideas')
        .update({
          vertical: parsed.vertical,
          core_tech: Array.isArray(parsed.core_tech) ? parsed.core_tech : [],
          target_audience: parsed.target_audience || 'Общая',
          business_model: parsed.business_model || 'SaaS',
          pain_point: parsed.pain_point ? [parsed.pain_point] : ['Не указано'],
          temporal_marker: parsed.temporal_marker || 'Сейчас',
          metadata: {
            ...(item.metadata || {}),
            is_extracted: true,
            raw_fallback: false,
            enriched_at: new Date().toISOString(),
          },
        })
        .eq('id', item.id)

      if (updErr) failed++
      else updated++
    } catch (e: any) {
      failed++
      console.error('enrich item failed:', e?.message)
    }
  }

  const remaining =
    (recent || []).filter((r: any) => !Array.isArray(r.core_tech) || r.core_tech.length === 0).length - updated

  return NextResponse.json({ processed: toEnrich.length, updated, failed, remaining })
}
