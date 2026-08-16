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
import {
  calculateConsensusSynergyScore,
  calculatePairCreativityScore,
  calculateBlueOceanPotential,
  calculateKnowledgeTransferScore,
  sanityCheck,
  isAntiPattern,
  isTechSynergistic,
} from '../scoring'
import { SYNERGY_BANNED_PATTERNS } from '../constants'
import { builderBuild, BuilderResult } from './builder'
import { optimistAnalyze, OptimistOutput } from './optimist'
import { skepticValidate, SkepticOutput } from './skeptic'

const EVOLUTION_CATALYSTS = [
  {
    title: 'ИИ-агент с долговременной памятью (RAG)',
    description: 'ИИ-агент с долговременной памятью и контекстом пользователя.',
    maturity: 8,
    synergy_domains: ['EdTech', 'HealthTech', 'LegalTech', 'ProductivityTools'],
  },
  {
    title: 'Мультимодальный ИИ (Зрение + Текст + Голос)',
    description: 'Обработка изображений, текста и голоса в едином потоке.',
    maturity: 7,
    synergy_domains: ['Healthcare', 'Education', 'E-commerce', 'Entertainment'],
  },
  {
    title: 'Автономная оркестрация бизнес-процессов',
    description: 'Самообучающаяся автоматизация бизнес-процессов через API.',
    maturity: 6,
    synergy_domains: ['FinTech', 'Operations', 'HR', 'Logistics'],
  },
  {
    title: 'Движок персонализации в реальном времени',
    description: 'Динамическая адаптация UX на основе поведенческих паттернов.',
    maturity: 8,
    synergy_domains: ['E-commerce', 'Media', 'SaaS', 'Marketing'],
  },
  {
    title: 'Слой доверия на блокчейне',
    description: 'Верифицируемая история изменений для критичных данных.',
    maturity: 5,
    synergy_domains: ['Healthcare', 'Supply Chain', 'Legal', 'FinTech'],
  },
  {
    title: 'Предиктивная аналитика с каузальным ИИ',
    description: 'Не только прогноз, но и объяснение причинно-следственных связей.',
    maturity: 6,
    synergy_domains: ['FinTech', 'Marketing', 'Operations', 'Analytics'],
  },
]

interface PairCandidate {
  a: Idea
  b: Idea
  score: number
}

function pickRandom<T>(items: T[], count: number): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, count)
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
  const structured = ideas.filter((i) => i.core_tech?.length > 0 && i.business_model && i.business_model !== 'TBD')
  const pool = structured.length >= 4 ? structured : ideas
  const n = pool.length
  if (n < 2) return []

  // 30% chance: стратегическая эволюция (идея + технологический катализатор)
  if (Math.random() < 0.3) {
    const a = pickRandom(pool, 1)[0]
    const compatible = EVOLUTION_CATALYSTS.filter((c) => c.synergy_domains.some((d) => a.vertical?.includes(d)))
    const catalyst =
      compatible.length > 0
        ? compatible[Math.floor(Math.random() * compatible.length)]
        : EVOLUTION_CATALYSTS[Math.floor(Math.random() * EVOLUTION_CATALYSTS.length)]
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
      description: catalyst.description,
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
    if (!isTechSynergistic(pool[i].core_tech || [], pool[j].core_tech || [])) continue

    const score = calculateConsensusSynergyScore(a, b)
    if (score >= 4.0) {
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
    if (selected.length >= 3) break
    if (usedIdeaIds.has(pair.a.id) || usedIdeaIds.has(pair.b.id)) continue
    usedIdeaIds.add(pair.a.id)
    usedIdeaIds.add(pair.b.id)
    selected.push(pair)
  }

  // If not enough diverse pairs, add remaining top scorers
  if (selected.length < 3) {
    for (const pair of top50) {
      if (selected.length >= 3) break
      if (
        selected.some(
          (p) => p.a.id === pair.a.id || p.b.id === pair.b.id || p.a.id === pair.b.id || p.b.id === pair.a.id
        )
      )
        continue
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
    return [
      {
        status: 'no_more_synergy',
      } as any as SynergyResult,
    ]
  }

  const results: SynergyResult[] = []

  for (const pair of pairs) {
    const { a, b, score } = pair
    console.log(`[blender] pair: "${a.title?.slice(0, 40)}" × "${b.title?.slice(0, 40)}" (score ${score.toFixed(1)})`)

    // 1. Builder ALWAYS runs (AI-powered primary, deterministic fallback)
    const built = await builderBuild(a, b)
    if (!built) {
      console.log('[blender] reject: builder returned null')
      continue
    }

    // Anti-pattern gate — always, regardless of mode.
    // Title-only: 'platform'/'integration' are legit words in English prose,
    // banning them in descriptions kills every real product ("EnerGenius AI Ops").
    if (
      isAntiPattern(
        { synergy_title: built.synergy_title, synergy_description: '', logic_chain: '' },
        SYNERGY_BANNED_PATTERNS
      )
    ) {
      console.log(`[blender] reject: anti-pattern in "${built.synergy_title?.slice(0, 60)}"`)
      continue
    }

    // 2. Run Optimist + Skeptic in parallel (if AI available)
    let optimistOutput: OptimistOutput | null = null
    let skepticOutput: SkepticOutput | null = null

    if (mode === 'full') {
      ;[optimistOutput, skepticOutput] = await Promise.all([
        optimistAnalyze(a, b).catch(() => null),
        skepticValidate(a, b, built.synergy_title, built.synergy_description).catch(() => null),
      ])
    }

    // 3. Independent deterministic score (not self-graded by AI generator)
    const detScore = calculateConsensusSynergyScore(a, b)
    const blueOceanScore = Math.round(calculateBlueOceanPotential(a, b) * 10) / 10
    const ktScore = Math.round(calculateKnowledgeTransferScore(a, b) * 10) / 10
    const skepticMultiplier = skepticOutput
      ? skepticOutput.is_viable
        ? 1.0
        : skepticOutput.failure_probability === 'high'
          ? 0.5
          : 0.6
      : mode === 'full'
        ? 1.0
        : 0.7 // det-only without skeptic → 0.7 penalty
    const finalTotal = Math.round(detScore * skepticMultiplier * 10) / 10

    // 4. Merge into SynergyResult
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
        medici_effect: `Domain intersection: ${a.vertical || 'A'} × ${b.vertical || 'B'} creates the Medici effect.`,
        analogy_bridge: `${a.title} as an analog of ${b.title}: transferring the business model to a new audience.`,
        inversion: `What if instead of ${a.business_model || 'selling'}, you ${b.business_model || 'give it away'}?`,
      },
      defensibility: built.defensibility,
      scores: {
        total: finalTotal,
        blue_ocean: blueOceanScore,
        knowledge_transfer: ktScore,
      },
      synergy_score: Math.round(finalTotal),
      components: [a, b as any],

      // Enriched by agents (if available)
      ai_trend_forecast: optimistOutput?.ai_trend_forecast || built.ai_trend_forecast,
      contrarian_bet: optimistOutput?.contrarian_bet || built.contrarian_bet,
      anti_pattern_check: skepticOutput?.anti_pattern_check || built.anti_pattern_check,
    }

    // Hard-skip only on HIGH failure probability; medium rejections shown with score penalty.
    // LLM skeptics are systematically harsh — every idea has some risk.
    if (skepticOutput && !skepticOutput.is_viable && skepticOutput.failure_probability === 'high') {
      console.log(`[blender] reject: skeptic high risk: ${skepticOutput.risks?.[0]?.slice(0, 100)}`)
      result.status = 'no_more_synergy' as const
      continue
    }

    results.push(result)

    // Достаточно одной синергии за вызов (route.ts берёт results[0]).
    // Прерываем цикл, чтобы не делать десятки LLM-вызовов и не превышать лимит Vercel.
    if (results.length >= 1) break
  }

  return results
}

export async function saveSynergy(supabase: any, result: SynergyResult, a: Idea, b: Idea, scores: any, mode: string) {
  if (!result.synergy_title) return null

  // Save only to synergies table — idea is materialized on user favorite (not auto-saved)
  const { error: synError } = await supabase.from('synergies').insert({
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
      ai_trend_forecast: result.ai_trend_forecast,
    },
  })
  if (synError) console.error('[saveSynergy] synergies insert error:', synError.message)

  return null
}
