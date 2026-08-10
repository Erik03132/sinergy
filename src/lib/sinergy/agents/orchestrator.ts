/**
 * Orchestrator — координатор Multi-Agent Blender.
 *
 * Pipeline:
 * 1. Загружает идеи из БД
 * 2. Скорит пары детерминированно → выбирает топ
 * 3. Запускает Builder (всегда), Optimist + Skeptic (параллельно, опционально)
 * 4. Склеивает результаты → SynergyResult[]
 * 5. Сохраняет в БД
 */

import { Idea, SynergyResult } from '@/types/sinergy'
import { createClient } from '@/lib/supabase/server'
import { calculateConsensusSynergyScore, calculatePairCreativityScore, sanityCheck } from '../scoring'
import { builderBuild, BuilderResult } from './builder'
import { optimistAnalyze, OptimistOutput } from './optimist'
import { skepticValidate, SkepticOutput } from './skeptic'

const EVOLUTION_CATALYSTS = [
    { title: 'ИИ-агент с долговременной памятью (RAG)', description: 'ИИ-агент с долговременной памятью и контекстом пользователя.', maturity: 8, synergy_domains: ['EdTech', 'HealthTech', 'LegalTech', 'ProductivityTools'] },
    { title: 'Мультимодальный ИИ (Зрение + Текст + Голос)', description: 'Обработка изображений, текста и голоса в едином потоке.', maturity: 7, synergy_domains: ['Healthcare', 'Education', 'E-commerce', 'Entertainment'] },
    { title: 'Автономная оркестрация бизнес-процессов', description: 'Самообучающаяся автоматизация бизнес-процессов через API.', maturity: 6, synergy_domains: ['FinTech', 'Operations', 'HR', 'Logistics'] },
    { title: 'Движок персонализации в реальном времени', description: 'Динамическая адаптация UX на основе поведенческих паттернов.', maturity: 8, synergy_domains: ['E-commerce', 'Media', 'SaaS', 'Marketing'] },
    { title: 'Слой доверия на блокчейне', description: 'Верифицируемая история изменений для критичных данных.', maturity: 5, synergy_domains: ['Healthcare', 'Supply Chain', 'Legal', 'FinTech'] },
    { title: 'Предиктивная аналитика с каузальным ИИ', description: 'Не только прогноз, но и объяснение причинно-следственных связей.', maturity: 6, synergy_domains: ['FinTech', 'Marketing', 'Operations', 'Analytics'] }
]

interface PairCandidate {
    a: Idea
    b: Idea
    score: number
}

function pickRandom<T>(items: T[], count: number): T[] {
    const shuffled = [...items].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
}

/**
 * Заменяет random pair selection на детерминированный скоринг + diversity.
 * Pipeline:
 * 1. Скорит до 2000 случайных пар (фильтр по sanity + score > 3)
 * 2. Из топ-50 добавляет diversity: не более 1 пары на идею, стратификация по вертикалям
 * 3. Эволюционные катализаторы (30% случаев) — для свежих идей
 */
function selectPairs(ideas: Idea[], pairCount: number = 80): PairCandidate[] {
    // Предпочитаем структурированные идеи
    const structured = ideas.filter(i =>
        i.core_tech?.length > 0 && i.business_model && i.business_model !== 'TBD'
    )
    const pool = structured.length >= 4 ? structured : ideas
    const n = pool.length
    if (n < 2) return []

    // 30% chance: стратегическая эволюция (идея + технологический катализатор)
    if (Math.random() < 0.3) {
        const a = pickRandom(pool, 1)[0]
        const compatible = EVOLUTION_CATALYSTS.filter(c =>
            c.synergy_domains.some(d => a.vertical?.includes(d))
        )
        const catalyst = compatible.length > 0 ? compatible[Math.floor(Math.random() * compatible.length)] : EVOLUTION_CATALYSTS[Math.floor(Math.random() * EVOLUTION_CATALYSTS.length)]
        const b: any = {
            ...catalyst,
            id: `catalyst-${catalyst.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            core_tech: ['AI', 'Cloud', 'API'],
            business_model: 'Технологическое усиление',
            vertical: catalyst.synergy_domains[0] || 'AI-infrastructure',
            target_audience: 'Технологические компании',
            pain_point: ['Нужен катализатор инноваций'],
            created_at: new Date().toISOString(),
            source: 'synergy',
            temporal_marker: 'Сейчас',
            description: catalyst.description
        }
        return [{ a, b, score: 5 + catalyst.maturity * 0.5 }]
    }

    // Step 1: Score up to 2000 random pairs → collect top pass
    const maxScoreAttempts = 2000
    const scoredPairs: PairCandidate[] = []

    for (let attempt = 0; attempt < maxScoreAttempts; attempt++) {
        const i = Math.floor(Math.random() * n)
        let j = Math.floor(Math.random() * n)
        if (n > 1) while (j === i) j = Math.floor(Math.random() * n)
        const a = pool[i]
        const b = pool[j]

        if (!sanityCheck(a, b)) continue

        const score = calculateConsensusSynergyScore(a, b)
        if (score > 3) {
            scoredPairs.push({ a, b, score })
        }
    }

    if (scoredPairs.length === 0) return []

    // Step 2: Sort by score → take top 50
    scoredPairs.sort((x, y) => y.score - x.score)
    const top50 = scoredPairs.slice(0, 50)

    // Step 3: Diversity filter — maximize variety
    const usedIdeaIds = new Set<string>()
    const selected: PairCandidate[] = []

    for (const pair of top50) {
        if (selected.length >= 10) break
        if (usedIdeaIds.has(pair.a.id) || usedIdeaIds.has(pair.b.id)) continue
        usedIdeaIds.add(pair.a.id)
        usedIdeaIds.add(pair.b.id)
        selected.push(pair)
    }

    // If not enough diverse pairs, add remaining top scorers
    if (selected.length < 5) {
        for (const pair of top50) {
            if (selected.length >= 10) break
            if (selected.some(p => p.a.id === pair.a.id || p.b.id === pair.b.id || p.a.id === pair.b.id || p.b.id === pair.a.id)) continue
            selected.push(pair)
        }
    }

    return selected
}

export type AgentMode = 'full' | 'det-only'

export interface OrchestratorOptions {
    mode?: AgentMode
    pairCount?: number
}

export async function runBlender(ideas: Idea[], options: OrchestratorOptions = {}): Promise<SynergyResult[]> {
    const mode: AgentMode = options.mode || 'full'
    const pairs = selectPairs(ideas, options.pairCount || 80)

    if (pairs.length === 0) {
        return [{
            status: 'no_more_synergy',
        } as any as SynergyResult]
    }

    const results: SynergyResult[] = []

    for (const pair of pairs) {
        const { a, b, score } = pair

        // 1. Builder ALWAYS runs (AI-powered primary, deterministic fallback)
        const built = await builderBuild(a, b)
        if (!built) continue

        // 2. Run Optimist + Skeptic in parallel (if AI available)
        let optimistOutput: OptimistOutput | null = null
        let skepticOutput: SkepticOutput | null = null

        if (mode === 'full') {
            [optimistOutput, skepticOutput] = await Promise.all([
                optimistAnalyze(a, b).catch(() => null),
                skepticValidate(a, b, built.synergy_title, built.synergy_description).catch(() => null)
            ])
        }

        // 3. Merge into SynergyResult
        const result: any = {
            status: 'synergy_found' as const,
            mode: b.id?.startsWith('catalyst-') ? 'Стратегическая эволюция' : 'Гибридный синтез',
            idea_id: undefined,
            synergy_title: built.synergy_title,
            synergy_description: built.synergy_description,
            mvp_scenario: built.mvp_scenario,
            logic_chain: built.logic_chain,
            classification: built.classification,
            thinking_models: {
                ...built.thinking_models,
                medici_effect: `Пересечение доменов: ${a.vertical || 'A'} × ${b.vertical || 'B'} создаёт эффект Медичи.`,
                analogy_bridge: `${a.title} как аналог ${b.title}: перенос бизнес-модели на новую аудиторию.`,
                inversion: `Что если не ${a.business_model || 'продавать'}, а ${b.business_model || 'отдавать'}?`
            },
            defensibility: built.defensibility,
            scores: {
                total: built.scores.total,
                blue_ocean: optimistOutput?.scores.blue_ocean ?? built.scores.blue_ocean,
                knowledge_transfer: optimistOutput?.scores.knowledge_transfer ?? built.scores.knowledge_transfer
            },
            synergy_score: Math.round(built.scores.total),
            components: [a, b as any],

            // Enriched by agents (if available)
            ai_trend_forecast: optimistOutput?.ai_trend_forecast || built.ai_trend_forecast,
            contrarian_bet: optimistOutput?.contrarian_bet || built.contrarian_bet,
            anti_pattern_check: skepticOutput?.anti_pattern_check || built.anti_pattern_check,
        }

        if (skepticOutput && !skepticOutput.is_viable) {
            result.status = 'no_more_synergy' as const
            continue
        }

        results.push(result)
    }

    return results
}

export async function saveSynergy(supabase: any, result: SynergyResult, a: Idea, b: Idea, scores: any, mode: string) {
    if (!result.synergy_title) return null

    await supabase.from('synergies').insert({
        idea_a_id: a.id,
        idea_b_id: b.id?.startsWith('catalyst-') ? null : b.id,
        synergy_title: result.synergy_title,
        synergy_description: result.synergy_description,
        logic_chain: result.logic_chain,
        score: scores?.total || 5,
        metadata: {
            mode,
            thinking_models: result.thinking_models,
            scores,
            defensibility: result.defensibility,
            mvp_scenario: result.mvp_scenario,
            ai_trend_forecast: result.ai_trend_forecast
        }
    })

        const newIdea = {
            source: 'synergy',
            source_type: 'synergy',
            title: result.synergy_title,
            description: result.synergy_description || '',
            is_favorite: false,
            is_synergy: true,
            vertical: result.classification?.vertical || 'Другое',
            core_tech: result.classification?.core_tech || [],
            target_audience: result.classification?.target_audience || 'Общая',
            business_model: result.classification?.business_model || 'SaaS',
            pain_point: ['Синтезировано блендером'],
            temporal_marker: 'Сейчас',
        metadata: {
            logic_chain: result.logic_chain,
            score: scores?.total,
            mode,
            components: [a, b],
            is_auto_saved: true,
            ai_trend_forecast: result.ai_trend_forecast
        }
    }

    const { data: saved } = await supabase.from('ideas').insert(newIdea).select('id').single().catch(() => ({ data: null }))
    return saved?.id || null
}
