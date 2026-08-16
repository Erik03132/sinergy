/**
 * Builder Agent — AI-генератор стартап-продуктов.
 * Primary: Gemini создаёт конкретный продукт на стыке двух идей.
 * Fallback: детерминированный синтез с шаблонами.
 */

import { Idea, SynergyResult } from '@/types/sinergy'
import { askGemini } from '@/lib/ai/gemini'
import { sanityCheck, calculateConsensusSynergyScore } from '../scoring'

function combineTech(a: Idea, b: Idea): string[] {
  const set = new Set([...(a.core_tech || []), ...(b.core_tech || [])])
  return [...set].slice(0, 4)
}

export interface BuilderResult {
  synergy_title: string
  synergy_description: string
  mvp_scenario: string
  logic_chain: string
  classification: {
    vertical: string
    core_tech: string[]
    target_audience: string
    business_model: string
  }
  thinking_models: {
    blue_ocean_errc: string
    knowledge_transfer: string
    scamper: string
    jobs_to_be_done: string
  }
  defensibility: {
    competitive_moat: string
    unfair_advantage: string
  }
  ai_trend_forecast: string
  contrarian_bet: string
  anti_pattern_check: string
  scores: {
    total: number
    blue_ocean: number
    knowledge_transfer: number
  }
}

const FALLBACK_BUILDER_PROMPT = `You are a visionary founder. Create a SPECIFIC NEW STARTUP PRODUCT at the intersection of two ideas:

IDEA A:
Title: {titleA}
Description: {descA}
Audience: {audienceA}
Technology: {techA}
Monetization: {bizA}
Problem: {painA}

IDEA B:
Title: {titleB}
Description: {descB}
Audience: {audienceB}
Technology: {techB}
Monetization: {bizB}
Problem: {painB}

Create a NEW PRODUCT that doesn't exist yet but COULD exist. It must be a specific SaaS/platform/app with a name, target audience, and business model. The product must have a concrete wedge — ONE primary use case that justifies the MVP.

Return ONLY JSON:
{
  "product_name": "specific product name (English)",
  "elevator_pitch": "one-sentence pitch",
  "description": "3-5 sentences: what it does, for whom, how it solves the problem",
  "target_audience": "specific audience — NOT generic! Forbidden: 'B2B', 'B2C', 'SME', 'General'. Use: 'HR managers in companies 50-200', 'freelance UX designers', 'private clinic dermatologists'",
  "monetization": "specific revenue model",
  "vertical": "vertical (FinTech, EdTech, HealthTech, SaaS, DevTools, etc)",
  "core_tech": ["technology1", "technology2"],
  "mvp_scope": "what to build in a 3-month MVP — specific features, not buzzwords",
  "logic_chain": "why A+B produces exactly this product — what concrete mechanism transfers from A to B",
  "moat": "competitive advantage (network effect, data moat, switching cost, regulatory, etc)",
  "unfair_advantage": "why incumbents can't replicate this in a week",
  "ai_trend": "how AI will impact this market in 5 years",
  "contrarian_bet": "what unpopular belief underpins this product",
  "anti_pattern_check": "why this is NOT just another aggregator/platform/dashboard",
  "scores": {
    "total": <0-10>,
    "blue_ocean": <0-10>,
    "knowledge_transfer": <0-10>
  }
}

Be SPECIFIC. No buzzwords without concrete details. Every claim must reference a real mechanism or user behavior.`

function deterministicFallback(a: Idea, b: Idea, score: number): BuilderResult {
  const tech = combineTech(a, b)
  const vertical =
    a.vertical !== b.vertical && a.vertical && b.vertical
      ? `${a.vertical} × ${b.vertical}`
      : a.vertical || b.vertical || 'Технологии'

  const audA = a.target_audience || 'пользователи'
  const audB = b.target_audience || 'клиенты'

  return {
    synergy_title: `${a.title?.split(' ').slice(0, 3).join(' ') || 'Idea A'} × ${b.title?.split(' ').slice(0, 3).join(' ') || 'Idea B'}`,
    synergy_description: `A new product combining the approach of "${a.title}" with the technology of "${b.title}". Solves ${a.pain_point?.[0] || 'a key problem'} through ${tech.join(' + ') || 'integration'}.`,
    mvp_scenario: `Month 1: prototype for ${audA}. Month 2: integrate with ${tech[0] || 'API'}. Month 3: pilot with 50 users.`,
    logic_chain: `${a.title} validates demand from ${audA}. ${b.title} provides the technology (${tech.join(', ')}). Together: a product that addresses "${a.pain_point?.[0] || 'X'}" for ${audB}.`,
    classification: {
      vertical,
      core_tech: tech.length > 0 ? tech : ['AI'],
      target_audience: `${audA} + ${audB}`,
      business_model: a.business_model || b.business_model || 'SaaS',
    },
    thinking_models: {
      blue_ocean_errc: `Eliminate: intermediaries between ${audA} and ${audB}. Create: direct product.`,
      knowledge_transfer: `Expertise from ${a.vertical || 'domain A'} transfers into ${b.vertical || 'domain B'}.`,
      scamper: `Combine: ${audA} × ${audB}. Adapt: ${a.business_model || 'model A'} → ${b.business_model || 'model B'}.`,
      jobs_to_be_done: `User needs "${a.pain_point?.[0] || 'X'}" and "${b.pain_point?.[0] || 'Y'}" — in one product.`,
    },
    defensibility: {
      competitive_moat: `Network effect: each new user increases value for both ${audA} and ${audB}.`,
      unfair_advantage: `Unique combination of ${tech.join(' + ')} at the intersection of ${a.vertical || 'A'} and ${b.vertical || 'B'}.`,
    },
    ai_trend_forecast: `AI will automate routine in this segment. The winner builds a data moat on user behavior.`,
    contrarian_bet: `The market treats ${a.vertical || 'A'} and ${b.vertical || 'B'} as separate categories. We believe their intersection is an undervalued opportunity.`,
    anti_pattern_check: `Product solves a specific problem: "${a.pain_point?.[0] || 'X'} + ${b.pain_point?.[0] || 'Y'}" — not a platform, not an aggregator.`,
    scores: {
      total: Math.round(score * 10) / 10,
      blue_ocean: Math.round(Math.min(score * 0.8 + 2, 10)),
      knowledge_transfer: Math.round(Math.min(score * 0.7 + 3, 10)),
    },
  }
}

export async function builderBuild(a: Idea, b: Idea): Promise<BuilderResult | null> {
  if (!sanityCheck(a, b)) return null

  const score = calculateConsensusSynergyScore(a, b)
  const tech = combineTech(a, b)

  try {
    // OmniRoute VPS — всегда доступен, ключи не нужны

    const prompt = FALLBACK_BUILDER_PROMPT.replace('{titleA}', a.title || '')
      .replace('{descA}', (a.description || '').slice(0, 500))
      .replace('{audienceA}', a.target_audience || 'не указана')
      .replace('{techA}', (a.core_tech || []).join(', ') || 'не указана')
      .replace('{bizA}', a.business_model || 'не указана')
      .replace('{painA}', (a.pain_point || [])[0] || 'не указана')
      .replace('{titleB}', b.title || '')
      .replace('{descB}', (b.description || '').slice(0, 500))
      .replace('{audienceB}', b.target_audience || 'не указана')
      .replace('{techB}', (b.core_tech || []).join(', ') || 'не указана')
      .replace('{bizB}', b.business_model || 'не указана')
      .replace('{painB}', (b.pain_point || [])[0] || 'не указана')

    const raw = await askGemini(prompt)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return deterministicFallback(a, b, score)

    const ai = JSON.parse(jsonMatch[0])

    return {
      synergy_title: ai.product_name || deterministicFallback(a, b, score).synergy_title,
      synergy_description:
        ai.description || ai.elevator_pitch || deterministicFallback(a, b, score).synergy_description,
      mvp_scenario: ai.mvp_scope || deterministicFallback(a, b, score).mvp_scenario,
      logic_chain: ai.logic_chain || deterministicFallback(a, b, score).logic_chain,
      classification: {
        vertical: ai.vertical || a.vertical || b.vertical || 'Технологии',
        core_tech: ai.core_tech || combineTech(a, b),
        target_audience: ai.target_audience || `${a.target_audience || ''} + ${b.target_audience || ''}`,
        business_model: ai.monetization || a.business_model || b.business_model || 'SaaS',
      },
      thinking_models: {
        blue_ocean_errc: deterministicFallback(a, b, score).thinking_models.blue_ocean_errc,
        knowledge_transfer: deterministicFallback(a, b, score).thinking_models.knowledge_transfer,
        scamper: deterministicFallback(a, b, score).thinking_models.scamper,
        jobs_to_be_done: deterministicFallback(a, b, score).thinking_models.jobs_to_be_done,
      },
      defensibility: {
        competitive_moat: ai.moat || deterministicFallback(a, b, score).defensibility.competitive_moat,
        unfair_advantage: ai.unfair_advantage || deterministicFallback(a, b, score).defensibility.unfair_advantage,
      },
      ai_trend_forecast: ai.ai_trend || deterministicFallback(a, b, score).ai_trend_forecast,
      contrarian_bet: ai.contrarian_bet || deterministicFallback(a, b, score).contrarian_bet,
      anti_pattern_check: ai.anti_pattern_check || deterministicFallback(a, b, score).anti_pattern_check,
      scores: {
        total: ai.scores?.total || deterministicFallback(a, b, score).scores.total,
        blue_ocean: ai.scores?.blue_ocean || deterministicFallback(a, b, score).scores.blue_ocean,
        knowledge_transfer:
          ai.scores?.knowledge_transfer || deterministicFallback(a, b, score).scores.knowledge_transfer,
      },
    }
  } catch {
    return deterministicFallback(a, b, score)
  }
}
