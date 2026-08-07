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

export async function skepticValidate(a: Idea, b: Idea, synergyTitle: string, synergyDesc: string): Promise<SkepticOutput> {
    const deterministic: SkepticOutput = {
        is_viable: true,
        risks: generateDeterministicRisks(a, b),
        anti_pattern_check: generateAntiPatternCheck(synergyTitle, synergyDesc),
        competitors_note: generateDeterministicCompetitors(a, b),
        failure_probability: 'medium'
    }

    if (!sanityCheck(a, b)) {
        return { ...deterministic, is_viable: false }
    }

    if (isAntiPattern({ synergy_title: synergyTitle, synergy_description: synergyDesc, logic_chain: '' }, SYNERGY_BANNED_PATTERNS)) {
        return {
            ...deterministic,
            is_viable: false,
            anti_pattern_check: 'Обнаружен антипаттерн: продукт звучит как общая платформа/агрегатор.'
        }
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY
        if (!apiKey) return deterministic

        const prompt = `You are a Startup Validator (Skeptic). Your job is to find reasons why this synergy WON'T work.

Component A: ${a.title} — ${a.description}
Component B: ${b.title} — ${b.description}
Proposed Synergy: "${synergyTitle}" — ${synergyDesc}

Respond with valid JSON only:
{
  "is_viable": true/false,
  "risks": ["risk 1", "risk 2", "risk 3"],
  "anti_pattern_check": "1 sentence: is this actually novel or just buzzwords?",
  "competitors_note": "1 sentence: who would kill this product?",
  "failure_probability": "low|medium|high"
}

Be CRITICAL. Find real problems. Language: RUSSIAN.`

        const raw = await askGemini(prompt, { search: false })
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (!jsonMatch) return deterministic

        const ai = JSON.parse(jsonMatch[0])
        return {
            is_viable: ai.is_viable !== false,
            risks: Array.isArray(ai.risks) ? ai.risks : deterministic.risks,
            anti_pattern_check: ai.anti_pattern_check || deterministic.anti_pattern_check,
            competitors_note: ai.competitors_note || deterministic.competitors_note,
            failure_probability: ai.failure_probability || deterministic.failure_probability
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
        risks.push('Обе идеи нацелены на одну аудиторию — узкий рынок')
    } else if (audA && audB && audA !== audB) {
        risks.push('Разные аудитории — сложность go-to-market')
    }

    if (!a.core_tech?.length || !b.core_tech?.length) {
        risks.push('Не указаны ключевые технологии — риск нереализуемости')
    }

    if (a.business_model === 'Marketplace' && b.business_model === 'Marketplace') {
        risks.push('Маркетплейс + маркетплейс = холодный старт для двустороннего рынка')
    }

    if (risks.length === 0) {
        risks.push('Требуется deeper dive: не хватает данных для детерминированной оценки')
    }

    return risks
}

function generateAntiPatternCheck(title: string, desc: string): string {
    const lower = `${title} ${desc}`.toLowerCase()
    const bad = ['платформа', 'агрегатор', 'универсальный', 'дашборд', 'экосистема']
    const found = bad.filter(w => lower.includes(w))
    if (found.length > 0) {
        return `Обнаружены подозрительные паттерны: ${found.join(', ')}. Убедитесь, что продукт решает конкретную задачу.`
    }
    return 'Проверка на антипаттерн пройдена: продукт выглядит конкретным, а не абстрактной платформой.'
}

function generateDeterministicCompetitors(a: Idea, b: Idea): string {
    const vertA = a.vertical?.toLowerCase() || ''
    const vertB = b.vertical?.toLowerCase() || ''
    if (vertA && vertB && vertA !== vertB) {
        return `Прямых конкурентов на стыке ${vertA} и ${vertB} пока нет. Возможна конкуренция с узкими игроками в каждом домене.`
    }
    return 'Рынок требует более детального анализа конкурентов. Рекомендуется провести ручной search.'
}
