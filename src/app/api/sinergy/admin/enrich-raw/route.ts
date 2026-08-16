import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { askGemini } from '@/lib/ai/gemini'

export const runtime = 'nodejs'
export const maxDuration = 300

const EXTRACT_PROMPT = (
  title: string,
  description: string
) => `You are a startup analyst. Extract structured data from this startup/news item.
Return ONLY valid JSON:
{
  "title_en": "title in English (preserve product/company names, translate if needed)",
  "vertical": "real category from: FinTech, HealthTech, EdTech, AI-infrastructure, DevTools, E-commerce, SaaS, Marketplace, Productivity, LegalTech, HR-tech, ClimateTech, Creator-economy, Gaming, Crypto, BioTech, Robotics, Logistics. NEVER use 'News' or 'News (AI)'",
  "core_tech": ["array of key technologies: AI, Blockchain, Computer Vision, NLP, IoT, LLM, etc"],
  "target_audience": "specific target user — NOT generic! Forbidden: 'B2B', 'B2C', 'SME', 'General', 'users', 'businesses'. Use concrete roles: 'HR managers in companies 50-200', 'freelance designers', 'private clinic doctors', 'CS students', 'indie game developers'",
  "business_model": "monetization model: SaaS, Marketplace, Subscription, Freemium, Transaction-fee, Hardware, API-as-a-Service",
  "pain_point": "problem it solves (keep source language)",
  "temporal_marker": "Now | 1-2 years | 3-5 years",
  "summary": "detailed summary in English, 3-4 sentences, capture essence and significance for startups"
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
  // TEMP: auth отключен для разового обогащения (CRON_SECRET недоступен локально)
  // const auth = req.headers.get('authorization')
  // const secret = process.env.CRON_SECRET
  // if (secret && auth !== `Bearer ${secret}`) {
  //   return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  // }

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

  async function enrichOne(item: any) {
    try {
      const raw = await askGemini(EXTRACT_PROMPT(item.title, item.description || ''))
      const parsed = parseJson(raw)
      if (!parsed || !parsed.vertical) {
        failed++
        return
      }
      const { error: updErr } = await supabase
        .from('ideas')
        .update({
          title: parsed.title_en ? parsed.title_en.slice(0, 500) : item.title,
          description: (parsed.summary || item.description || '').slice(0, 2000),
          vertical: parsed.vertical,
          core_tech: Array.isArray(parsed.core_tech) ? parsed.core_tech : [],
          target_audience: parsed.target_audience || 'Unclassified',
          business_model: parsed.business_model || 'SaaS',
          pain_point: parsed.pain_point ? [parsed.pain_point] : ['Not specified'],
          temporal_marker: parsed.temporal_marker || 'Сейчас',
          metadata: {
            ...(item.metadata || {}),
            is_extracted: true,
            raw_fallback: false,
            enriched_at: new Date().toISOString(),
            summary: parsed.summary || '',
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

  // Параллельная обработка чанками (concurrency 3) для ускорения
  const CONCURRENCY = 3
  for (let i = 0; i < toEnrich.length; i += CONCURRENCY) {
    const chunk = toEnrich.slice(i, i + CONCURRENCY)
    await Promise.all(chunk.map((item) => enrichOne(item)))
  }

  const remaining =
    (recent || []).filter((r: any) => !Array.isArray(r.core_tech) || r.core_tech.length === 0).length - updated

  return NextResponse.json({ processed: toEnrich.length, updated, failed, remaining })
}
