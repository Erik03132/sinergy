/**
 * Optimist Agent — AI-powered growth analysis.
 * Primary: Gemini/OpenRouter for blue ocean, knowledge transfer, contrarian bets.
 * Fallback: deterministic scoring from scoring.ts (zero cost).
 */

import { Idea } from '@/types/sinergy'
import { askGemini } from '@/lib/ai/gemini'
import { calculateBlueOceanPotential, calculateKnowledgeTransferScore, calculatePairCreativityScore } from '../scoring'

export interface OptimistOutput {
  blue_ocean_analysis: string
  contrarian_bet: string
  ai_trend_forecast: string
  scores: {
    blue_ocean: number
    knowledge_transfer: number
    creativity: number
  }
}

export async function optimistAnalyze(a: Idea, b: Idea): Promise<OptimistOutput> {
  const blueOceanScore = Math.round(calculateBlueOceanPotential(a, b) * 10) / 10
  const ktScore = Math.round(calculateKnowledgeTransferScore(a, b) * 10) / 10
  const creativityScore = Math.round(calculatePairCreativityScore(a, b) * 10) / 10

  const deterministic: OptimistOutput = {
    blue_ocean_analysis: generateDeterministicBlueOcean(a, b, blueOceanScore),
    contrarian_bet: generateDeterministicContrarian(a, b),
    ai_trend_forecast: generateDeterministicAITrend(a, b),
    scores: { blue_ocean: blueOceanScore, knowledge_transfer: ktScore, creativity: creativityScore },
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY
    if (!apiKey) return deterministic

    const prompt = `You are a growth strategist. Evaluate the synergy of two structured startups:

STARTUP A:
- Product: ${a.title}
- Description: ${a.description?.slice(0, 300) || '-'}
- Audience: ${a.target_audience || '-'}
- Technology: ${a.core_tech?.join(', ') || '-'}
- Monetization: ${a.business_model || '-'}
- Problem: ${a.pain_point?.[0] || '-'}

STARTUP B:
- Product: ${b.title}
- Description: ${b.description?.slice(0, 300) || '-'}
- Audience: ${b.target_audience || '-'}
- Technology: ${b.core_tech?.join(', ') || '-'}
- Monetization: ${b.business_model || '-'}
- Problem: ${b.pain_point?.[0] || '-'}

Deterministic estimates: Blue Ocean ${blueOceanScore}/10, Knowledge Transfer ${ktScore}/10, Creativity ${creativityScore}/10

Answer in JSON:
{
  "blue_ocean_analysis": "3-4 sentences: how open is the market at the intersection? Who are the main competitors?",
  "contrarian_bet": "1 sentence: what unpopular belief backs this product?",
  "ai_trend_forecast": "2-3 sentences: how will AI change this market in 5 years?"
}

Be specific, no generic phrases.`

    const raw = await askGemini(prompt, { search: false })
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return deterministic

    const ai = JSON.parse(jsonMatch[0])
    return {
      blue_ocean_analysis: ai.blue_ocean_analysis || deterministic.blue_ocean_analysis,
      contrarian_bet: ai.contrarian_bet || deterministic.contrarian_bet,
      ai_trend_forecast: ai.ai_trend_forecast || deterministic.ai_trend_forecast,
      scores: deterministic.scores,
    }
  } catch {
    return deterministic
  }
}

function generateDeterministicBlueOcean(a: Idea, b: Idea, score: number): string {
  if (score >= 7)
    return `Strong Blue Ocean potential. Combining "${a.vertical || 'A'}" and "${b.vertical || 'B'}" creates a new market without direct competition. Key: ${a.business_model || 'model A'} + ${b.business_model || 'model B'}.`
  if (score >= 4)
    return `Moderate Blue Ocean. Main value: automating manual integration between domains. Recommendation: focus on a niche customer.`
  return `Low Blue Ocean. Market is competitive. Recommendation: differentiate via ${a.core_tech?.[0] || 'unique technology'} or a hyper-niche audience.`
}

function generateDeterministicContrarian(a: Idea, b: Idea): string {
  return `The market treats ${extractDomainLabel(a)} and ${extractDomainLabel(b)} as separate categories. We believe their intersection is an undervalued first-mover opportunity.`
}

function generateDeterministicAITrend(a: Idea, b: Idea): string {
  return `AI will strengthen the product core: automating ${extractDomainLabel(a)} and ${extractDomainLabel(b)} becomes commodity. The survivor builds a data moat on user data.`
}

function extractDomainLabel(idea: Idea): string {
  return idea.target_audience?.substring(0, 30) || idea.vertical?.substring(0, 30) || 'домена'
}
