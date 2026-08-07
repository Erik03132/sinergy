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
        scores: { blue_ocean: blueOceanScore, knowledge_transfer: ktScore, creativity: creativityScore }
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY
        if (!apiKey) return deterministic

        const prompt = `Ты — growth-стратег. Оцени синергию двух структурированных стартапов:

СТАРТАП A:
- Продукт: ${a.title}
- Описание: ${a.description?.slice(0, 300) || '-'}
- Аудитория: ${a.target_audience || '-'}
- Технология: ${a.core_tech?.join(', ') || '-'}
- Монетизация: ${a.business_model || '-'}
- Проблема: ${a.pain_point?.[0] || '-'}

СТАРТАП B:
- Продукт: ${b.title}
- Описание: ${b.description?.slice(0, 300) || '-'}
- Аудитория: ${b.target_audience || '-'}
- Технология: ${b.core_tech?.join(', ') || '-'}
- Монетизация: ${b.business_model || '-'}
- Проблема: ${b.pain_point?.[0] || '-'}

Детерминированные оценки: Blue Ocean ${blueOceanScore}/10, Knowledge Transfer ${ktScore}/10, Creativity ${creativityScore}/10

Ответь JSON:
{
  "blue_ocean_analysis": "3-4 предложения: насколько свободен рынок на стыке? Кто основные конкуренты?",
  "contrarian_bet": "1 предложение: какое непопулярное мнение стоит за этим продуктом?",
  "ai_trend_forecast": "2-3 предложения: как ИИ изменит этот рынок через 5 лет?"
}

Язык: РУССКИЙ. Будь конкретным, не общими фразами.`

        const raw = await askGemini(prompt, { search: false })
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (!jsonMatch) return deterministic

        const ai = JSON.parse(jsonMatch[0])
        return {
            blue_ocean_analysis: ai.blue_ocean_analysis || deterministic.blue_ocean_analysis,
            contrarian_bet: ai.contrarian_bet || deterministic.contrarian_bet,
            ai_trend_forecast: ai.ai_trend_forecast || deterministic.ai_trend_forecast,
            scores: deterministic.scores
        }
    } catch {
        return deterministic
    }
}

function generateDeterministicBlueOcean(a: Idea, b: Idea, score: number): string {
    if (score >= 7) return `Сильный Blue Ocean потенциал. Объединение «${a.vertical || 'A'}» и «${b.vertical || 'B'}» создаёт новый рынок без прямой конкуренции. Ключ: ${a.business_model || 'модель A'} + ${b.business_model || 'модель B'}.`
    if (score >= 4) return `Умеренный Blue Ocean. Основная ценность — автоматизация ручной интеграции между доменами. Рекомендация: фокус на нишевого клиента.`
    return `Низкий Blue Ocean. Рынок конкурентен. Рекомендация: дифференциация через ${a.core_tech?.[0] || 'уникальную технологию'} или гипер-нишевую аудиторию.`
}

function generateDeterministicContrarian(a: Idea, b: Idea): string {
    return `Рынок считает, что ${extractDomainLabel(a)} и ${extractDomainLabel(b)} — разные категории. Мы считаем, что их пересечение — недооценённая возможность для first-mover advantage.`
}

function generateDeterministicAITrend(a: Idea, b: Idea): string {
    return `ИИ усилит ядро продукта: автоматизация ${extractDomainLabel(a)} и ${extractDomainLabel(b)} станет commodity. Выживет тот, кто построит data moat на пользовательских данных.`
}

function extractDomainLabel(idea: Idea): string {
    return idea.target_audience?.substring(0, 30) || idea.vertical?.substring(0, 30) || 'домена'
}
