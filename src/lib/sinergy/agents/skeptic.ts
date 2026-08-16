/**
 * Skeptic Agent — AI-powered validation.
 * Проверяет синергию на жизнеспособность: риски, anti-patterns, конкуренты.
 * Fallback: детерминированные проверки (banned keywords, sanity check, anti-patterns).
 */

import { Idea } from '@/types/sinergy'
import { askGemini } from '@/lib/ai/gemini'
import { sanityCheck, isAntiPattern } from '../scoring'
import { SYNERGY_BANNED_PATTERNS } from '../constants'

export interface SkepticOutput {
  is_viable: boolean
  risks: string[]
  anti_pattern_check: string
  competitors_note: string
  failure_probability: 'low' | 'medium' | 'high'
}

export async function skepticValidate(
  a: Idea,
  b: Idea,
  synergyTitle: string,
  synergyDesc: string
): Promise<SkepticOutput> {
  const deterministic: SkepticOutput = {
    is_viable: true,
    risks: generateDeterministicRisks(a, b),
    anti_pattern_check: generateAntiPatternCheck(synergyTitle, synergyDesc),
    competitors_note: generateDeterministicCompetitors(a, b),
    failure_probability: 'medium',
  }

  if (!sanityCheck(a, b)) {
    return { ...deterministic, is_viable: false }
  }

  if (
    isAntiPattern(
      { synergy_title: synergyTitle, synergy_description: synergyDesc, logic_chain: '' },
      SYNERGY_BANNED_PATTERNS
    )
  ) {
    return {
      ...deterministic,
      is_viable: false,
      anti_pattern_check: 'Обнаружен антипаттерн: продукт звучит как общая платформа/агрегатор.',
    }
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY
    if (!apiKey) return deterministic

    const prompt = `You are a skeptical investor. Find REAL reasons why this startup synergy will NOT work:

STARTUP A:
- Product: ${a.title}
- Audience: ${a.target_audience || '-'}
- Technology: ${a.core_tech?.join(', ') || '-'}
- Monetization: ${a.business_model || '-'}
- Problem: ${a.pain_point?.[0] || '-'}

STARTUP B:
- Product: ${b.title}
- Audience: ${b.target_audience || '-'}
- Technology: ${b.core_tech?.join(', ') || '-'}
- Monetization: ${b.business_model || '-'}
- Problem: ${b.pain_point?.[0] || '-'}

Synergy: "${synergyTitle}" — ${synergyDesc}

Find SPECIFIC risks:
1. Market risk: is the market too small? Who tried this and failed?
2. Execution risk: what is the hardest part technically/organizationally?
3. Adoption risk: why won't users switch from current solutions?
4. Competitor risk: which big player can kill this product with one feature?

Answer in JSON:
{
  "is_viable": true/false,
  "risks": ["specific risk 1", "specific risk 2", "specific risk 3"],
  "anti_pattern_check": "1 sentence: is this a real new product or just buzzwords?",
  "competitors_note": "1 sentence: who specifically can kill this product?",
  "failure_probability": "low|medium|high"
}

Be harsh and specific. No generic warnings.`

    const raw = await askGemini(prompt, { search: false })
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return deterministic

    const ai = JSON.parse(jsonMatch[0])
    return {
      is_viable: ai.is_viable !== false,
      risks: Array.isArray(ai.risks) ? ai.risks : deterministic.risks,
      anti_pattern_check: ai.anti_pattern_check || deterministic.anti_pattern_check,
      competitors_note: ai.competitors_note || deterministic.competitors_note,
      failure_probability: ai.failure_probability || deterministic.failure_probability,
    }
  } catch {
    return deterministic
  }
}

function generateDeterministicRisks(a: Idea, b: Idea): string[] {
  const risks: string[] = []
  const audA = a.target_audience?.toLowerCase() || ''
  const audB = b.target_audience?.toLowerCase() || ''

  if (audA && audB && audA === audB) {
    risks.push('Both ideas target the same audience — narrow market')
  } else if (audA && audB && audA !== audB) {
    risks.push('Different audiences — go-to-market complexity')
  }

  if (!a.core_tech?.length || !b.core_tech?.length) {
    risks.push('Key technologies missing — feasibility risk')
  }

  if (a.business_model === 'Marketplace' && b.business_model === 'Marketplace') {
    risks.push('Marketplace + marketplace = cold start for a two-sided market')
  }

  if (risks.length === 0) {
    risks.push('Requires deeper dive: not enough data for deterministic assessment')
  }

  return risks
}

function generateAntiPatternCheck(title: string, desc: string): string {
  const lower = `${title} ${desc}`.toLowerCase()
  const bad = [
    'платформа',
    'агрегатор',
    'универсальный',
    'дашборд',
    'экосистема',
    'platform',
    'aggregator',
    'universal',
    'dashboard',
    'ecosystem',
  ]
  const found = bad.filter((w) => lower.includes(w))
  if (found.length > 0) {
    return `Suspicious patterns detected: ${found.join(', ')}. Make sure the product solves a specific problem.`
  }
  return 'Anti-pattern check passed: the product looks specific, not an abstract platform.'
}

function generateDeterministicCompetitors(a: Idea, b: Idea): string {
  const vertA = a.vertical?.toLowerCase() || ''
  const vertB = b.vertical?.toLowerCase() || ''
  if (vertA && vertB && vertA !== vertB) {
    return `No direct competitors at the intersection of ${vertA} and ${vertB} yet. Possible competition from niche players in each domain.`
  }
  return 'Market requires more detailed competitor analysis. Manual search recommended.'
}
