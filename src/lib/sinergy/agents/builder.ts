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

const FALLBACK_BUILDER_PROMPT = `Ты — фаундер-визионер. Придумай КОНКРЕТНЫЙ НОВЫЙ СТАРТАП-ПРОДУКТ на стыке двух идей:

ИДЕЯ A:
Название: {titleA}
Описание: {descA}
Аудитория: {audienceA}
Технология: {techA}
Монетизация: {bizA}
Проблема: {painA}

ИДЕЯ B:
Название: {titleB}
Описание: {descB}
Аудитория: {audienceB}
Технология: {techB}
Монетизация: {bizB}
Проблема: {painB}

Создай НОВЫЙ ПРОДУКТ, который не существует, но МОГ бы существовать. Это должен быть конкретный SaaS/платформа/приложение с названием, аудиторией и бизнес-моделью.

Верни ТОЛЬКО JSON:
{
  "product_name": "конкретное название продукта",
  "elevator_pitch": "одно предложение-питч",
  "description": "3-5 предложений: что делает продукт, для кого, как решает проблему",
  "target_audience": "конкретная аудитория (не B2B, а например HR-менеджеры в компаниях 50-200)",
  "monetization": "конкретная модель заработка",
  "vertical": "вертикаль (FinTech, EdTech, HealthTech, SaaS, etc)",
  "core_tech": ["технология1", "технология2"],
  "mvp_scope": "что в MVP за 3 месяца",
  "logic_chain": "почему A+B дают именно этот продукт",
  "moat": "конкурентное преимущество (сетевой эффект, data moat, switching cost)",
  "unfair_advantage": "почему инкумбенты не сделают это за неделю",
  "ai_trend": "как ИИ повлияет на этот рынок через 5 лет",
  "contrarian_bet": "какое непопулярное мнение лежит в основе продукта",
  "anti_pattern_check": "почему это НЕ просто агрегатор/платформа/дашборд",
  "scores": {
    "total": <0-10>,
    "blue_ocean": <0-10>,
    "knowledge_transfer": <0-10>
  }
}

Язык: РУССКИЙ. Название продукта может быть на английском. Будь конкретным!`

function deterministicFallback(a: Idea, b: Idea, score: number): BuilderResult {
    const tech = combineTech(a, b)
    const vertical = a.vertical !== b.vertical && a.vertical && b.vertical
        ? `${a.vertical} × ${b.vertical}`
        : a.vertical || b.vertical || 'Технологии'

    const audA = a.target_audience || 'пользователи'
    const audB = b.target_audience || 'клиенты'

    return {
        synergy_title: `Стартап на стыке: ${a.title?.split(' ').slice(0, 3).join(' ') || 'Идея A'} + ${b.title?.split(' ').slice(0, 3).join(' ') || 'Идея B'}`,
        synergy_description: `Новый продукт, объединяющий подход «${a.title}» с технологией «${b.title}». Решает задачу ${a.pain_point?.[0] || 'аудитории'} через ${tech.join('+') || 'интеграцию'}.`,
        mvp_scenario: `Месяц 1: прототип для ${audA}. Месяц 2: интеграция с ${tech[0] || 'API'}. Месяц 3: пилот с 50 пользователями.`,
        logic_chain: `${a.title} валидирует спрос у ${audA}. ${b.title} даёт технологию ${tech.join(', ')}. Вместе: продукт, который закрывает боль «${a.pain_point?.[0] || 'X'}» для «${audB}».`,
        classification: {
            vertical,
            core_tech: tech.length > 0 ? tech : ['AI'],
            target_audience: `${audA} + ${audB}`,
            business_model: a.business_model || b.business_model || 'SaaS'
        },
        thinking_models: {
            blue_ocean_errc: `Eliminate: посредники между ${audA} и ${audB}. Create: прямой продукт.`,
            knowledge_transfer: `Экспертиза из ${a.vertical || 'домена A'} переносится в ${b.vertical || 'домен B'}.`,
            scamper: `Combine: ${audA} × ${audB}. Adapt: ${a.business_model || 'модель A'} → ${b.business_model || 'модель B'}.`,
            jobs_to_be_done: `Пользователь хочет «${a.pain_point?.[0] || 'X'}» и «${b.pain_point?.[0] || 'Y'}» — одним продуктом.`
        },
        defensibility: {
            competitive_moat: `Сетевой эффект: каждый новый пользователь усиливает ценность для ${audA} и ${audB}.`,
            unfair_advantage: `Уникальная комбинация ${tech.join('+')} на стыке ${a.vertical || 'A'} и ${b.vertical || 'B'}.`
        },
        ai_trend_forecast: `ИИ автоматизирует рутину в этом сегменте. Выиграет тот, кто построит data moat.`,
        contrarian_bet: `Рынок считает ${a.vertical || 'A'} и ${b.vertical || 'B'} разными рынками. Мы считаем — это один недооценённый рынок.`,
        anti_pattern_check: `Продукт решает конкретную задачу: «${a.pain_point?.[0] || 'X'} + ${b.pain_point?.[0] || 'Y'}» — не платформа, не агрегатор.`,
        scores: {
            total: Math.round(score * 10) / 10,
            blue_ocean: Math.round(Math.min(score * 0.8 + 2, 10)),
            knowledge_transfer: Math.round(Math.min(score * 0.7 + 3, 10))
        }
    }
}

export async function builderBuild(a: Idea, b: Idea): Promise<BuilderResult | null> {
    if (!sanityCheck(a, b)) return null

    const score = calculateConsensusSynergyScore(a, b)
    const tech = combineTech(a, b)

    try {
        // OmniRoute VPS — всегда доступен, ключи не нужны

        const prompt = FALLBACK_BUILDER_PROMPT
            .replace('{titleA}', a.title || '')
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
            synergy_description: ai.description || ai.elevator_pitch || deterministicFallback(a, b, score).synergy_description,
            mvp_scenario: ai.mvp_scope || deterministicFallback(a, b, score).mvp_scenario,
            logic_chain: ai.logic_chain || deterministicFallback(a, b, score).logic_chain,
            classification: {
                vertical: ai.vertical || a.vertical || b.vertical || 'Технологии',
                core_tech: ai.core_tech || combineTech(a, b),
                target_audience: ai.target_audience || `${a.target_audience || ''} + ${b.target_audience || ''}`,
                business_model: ai.monetization || a.business_model || b.business_model || 'SaaS'
            },
            thinking_models: {
                blue_ocean_errc: deterministicFallback(a, b, score).thinking_models.blue_ocean_errc,
                knowledge_transfer: deterministicFallback(a, b, score).thinking_models.knowledge_transfer,
                scamper: deterministicFallback(a, b, score).thinking_models.scamper,
                jobs_to_be_done: deterministicFallback(a, b, score).thinking_models.jobs_to_be_done
            },
            defensibility: {
                competitive_moat: ai.moat || deterministicFallback(a, b, score).defensibility.competitive_moat,
                unfair_advantage: ai.unfair_advantage || deterministicFallback(a, b, score).defensibility.unfair_advantage
            },
            ai_trend_forecast: ai.ai_trend || deterministicFallback(a, b, score).ai_trend_forecast,
            contrarian_bet: ai.contrarian_bet || deterministicFallback(a, b, score).contrarian_bet,
            anti_pattern_check: ai.anti_pattern_check || deterministicFallback(a, b, score).anti_pattern_check,
            scores: {
                total: ai.scores?.total || deterministicFallback(a, b, score).scores.total,
                blue_ocean: ai.scores?.blue_ocean || deterministicFallback(a, b, score).scores.blue_ocean,
                knowledge_transfer: ai.scores?.knowledge_transfer || deterministicFallback(a, b, score).scores.knowledge_transfer
            }
        }
    } catch {
        return deterministicFallback(a, b, score)
    }
}
