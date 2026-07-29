/**
 * Builder Agent — детерминированный генератор MVP.
 * Работает без AI. Всегда возвращает корректный результат.
 * Собирает базовую структуру синергии из двух идей.
 */

import { Idea, SynergyResult } from '@/types/sinergy'
import { isTechSynergistic, sanityCheck, calculateConsensusSynergyScore } from '../scoring'
import { SYNERGY_BANNED_PATTERNS } from '../constants'

function extractDomain(idea: Idea): string[] {
    const parts: string[] = []
    if (idea.vertical) parts.push(idea.vertical)
    if (idea.business_model) parts.push(idea.business_model)
    if (idea.target_audience?.length) parts.push(idea.target_audience.substring(0, 40))
    return parts
}

function combineTech(a: Idea, b: Idea): string[] {
    const set = new Set([...(a.core_tech || []), ...(b.core_tech || [])])
    return [...set].slice(0, 4)
}

function generateMVP(a: Idea, b: Idea, tech: string[]): string {
    const primaryTech = tech[0] || 'API'
    const fallbackTech = tech[1] || primaryTech
    const audA = a.target_audience || 'клиенты A'
    const audB = b.target_audience || 'клиенты B'
    return `За 3 месяца: интегрировать ${primaryTech} из «${a.title}» с ${fallbackTech} из «${b.title}». Собрать MVP с ядром: ${audA} + ${audB}. Запустить закрытое тестирование на 50 пользователях. Метрика: конверсия в repeat use >30%.`
}

function generateLogicChain(a: Idea, b: Idea): string {
    return `${a.title} даёт ${a.business_model || 'спрос'}. ${b.title} усиливает через ${b.core_tech?.join(', ') || 'технологию'}. Результат: продукт, где ${a.target_audience || 'клиенты'} получают решение быстрее/дешевле.`
}

function generateDefensibility(a: Idea, b: Idea): { competitive_moat: string; unfair_advantage: string } {
    const techOverlap = combineTech(a, b).length > 1 ? 'уникальная комбинация технологий' : 'первый на рынке'
    return {
        competitive_moat: `Сетевой эффект: ${a.title} × ${b.title} растёт с каждым пользователем. Плюс ${techOverlap}.`,
        unfair_advantage: `Никто не комбинирует ${extractDomain(a)[0] || 'нишу A'} с ${extractDomain(b)[0] || 'нишей B'} так, как мы.`
    }
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

export function builderBuild(a: Idea, b: Idea): BuilderResult | null {
    if (!sanityCheck(a, b)) return null

    const tech = combineTech(a, b)
    const domains = [...new Set([...(extractDomain(a)), ...(extractDomain(b))])]
    const vertical = a.vertical !== b.vertical
        ? `${a.vertical} × ${b.vertical}`
        : a.vertical || 'ProductivityTools'

    const score = calculateConsensusSynergyScore(a, b)
    const titles = [a.title, b.title].filter(Boolean)
    const synergyTitle = titles.length >= 2
        ? `${titles[0].split(' ').slice(0, 2).join(' ')} × ${titles[1].split(' ').slice(0, 2).join(' ')}`
        : 'Новая синергия'

    const synergyDesc = `Синтез «${a.title}» и «${b.title}». Используем ${tech.join(', ') || 'ключевые технологии'} для создания продукта, решающего задачи ${a.target_audience || 'аудитории A'} и ${b.target_audience || 'аудитории B'}.`

    const errc = a.business_model !== b.business_model
        ? `Eliminate: ручная интеграция между ${extractDomain(a)[0] || 'A'} и ${extractDomain(b)[0] || 'B'}. Create: автоматическое объединение.`
        : `Eliminate: посредники. Raise: скорость. Reduce: стоимость. Create: новый гибрид.`

    const kt = `Экспертиза из ${extractDomain(a)[0] || 'домена A'} переносится в ${extractDomain(b)[0] || 'домен B'} через ${tech[0] || 'общую технологию'}.`

    const scamper = `Combine: ${titles[0] || 'A'} + ${titles[1] || 'B'}. Adapt: применить бизнес-модель ${a.business_model || 'A'} к аудитории ${b.target_audience || 'B'}.`

    const jtbd = `Клиент хочет «${a.pain_point?.[0] || 'решить проблему'}» и «${b.pain_point?.[0] || 'закрыть потребность'}» → одним продуктом.`

    const aiForecast = `Через 5 лет ИИ автоматизирует рутину в этом сегменте. Продукт выиграет, если станет data-платформой, а не просто инструментом. Риск: если ИИ-заменитель войдёт раньше.`

    const contrarian = `Рынок считает, что ${extractDomain(a)[0] || 'A'} и ${extractDomain(b)[0] || 'B'} — разные рынки. Мы считаем, что их пересечение — новый blue ocean.`

    const antiPattern = `Продукт решает конкретную задачу: «${a.pain_point?.[0] || 'проблема A'} + ${b.pain_point?.[0] || 'проблема B'}». Не платформа, не агрегатор.`

    return {
        synergy_title: synergyTitle,
        synergy_description: synergyDesc,
        mvp_scenario: generateMVP(a, b, tech),
        logic_chain: generateLogicChain(a, b),
        classification: {
            vertical,
            core_tech: tech,
            target_audience: `${a.target_audience || 'Аудитория A'} + ${b.target_audience || 'Аудитория B'}`,
            business_model: a.business_model || b.business_model || 'SaaS'
        },
        thinking_models: { blue_ocean_errc: errc, knowledge_transfer: kt, scamper, jobs_to_be_done: jtbd },
        defensibility: generateDefensibility(a, b),
        ai_trend_forecast: aiForecast,
        contrarian_bet: contrarian,
        anti_pattern_check: antiPattern,
        scores: {
            total: Math.round(score * 10) / 10,
            blue_ocean: Math.round(Math.min(score * 0.8 + 2, 10)),
            knowledge_transfer: Math.round(Math.min(score * 0.7 + 3, 10))
        }
    }
}
