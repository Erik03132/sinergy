import { askGemini } from '@/lib/ai/gemini'
import { createClient } from '@/lib/supabase/server'
import {
    calculateSynergyScore,
    calculatePairCreativityScore,
    sanityCheck,
    isAntiPattern
} from '@/lib/sinergy/scoring'
import { Idea, SynergyResult } from '@/types/sinergy'
import { NextResponse } from 'next/server'

// Comprehensive Banned Patterns (Kimi + Claude + Grok)
const BANNED_PATTERNS = [
    'micro-crm', 'all-in-one', 'aggregator', 'dashboard', 'platform',
    'saas для', 'универсальный', 'маркетплейс', 'интеграция', 'автоматизация процессов',
    'сервис учета', 'система управления', 'онлайн-конструктор',
    'микро-crm', 'мини-crm', 'crm-система', 'витрина', 'каталог', 'портал'
]

function pickRandomPairs<T>(items: T[], pairCount: number): Array<[T, T]> {
    const n = items.length
    const pairs: Array<[T, T]> = []
    if (n < 2) return pairs

    // Sample with replacement on indices, but enforce i != j
    for (let k = 0; k < pairCount; k++) {
        const i = Math.floor(Math.random() * n)
        let j = Math.floor(Math.random() * n)
        if (n > 1) {
            while (j === i) j = Math.floor(Math.random() * n)
        }
        pairs.push([items[i], items[j]])
    }
    return pairs
}

export async function POST() {
    try {
        const supabase = await createClient()
        const { data: ideas, error } = await supabase.from('ideas').select('*')

        if (error) {
            return NextResponse.json(
                { status: 'error', error: error.message } as any,
                { status: 500 }
            )
        }

        if (!ideas || ideas.length < 2) {
            return NextResponse.json({ status: 'no_more_synergy' } as SynergyResult)
        }

        // 1) Sample candidate pairs to avoid O(n^2) and to increase variety.
        // Tune these numbers based on your table size.
        const CANDIDATE_PAIRS = Math.min(160, Math.max(60, ideas.length * 8))
        const candidates = pickRandomPairs<Idea>(ideas, CANDIDATE_PAIRS)

        // 2) Score all candidates and pick via "stochastic top-k" (anti-greedy).
        const scored = candidates
            .map(([a, b]) => {
                if (!sanityCheck(a, b)) return null

                const { score: synergyScore, breakdown } = calculateSynergyScore(a, b)
                const creativity = calculatePairCreativityScore(a, b)

                // Encourage some baseline synergy, but don't require perfect compatibility.
                const total = synergyScore + creativity

                return {
                    a,
                    b,
                    synergyScore,
                    creativity,
                    total,
                    breakdown,
                }
            })
            .filter(Boolean) as Array<{
                a: Idea
                b: Idea
                synergyScore: number
                creativity: number
                total: number
                breakdown: any
            }>

        if (scored.length === 0) {
            return NextResponse.json({ status: 'no_more_synergy' } as SynergyResult)
        }

        // Sort by total desc, then pick randomly from top slice for diversity.
        scored.sort((x, y) => y.total - x.total)

        const TOP_SLICE = Math.min(12, scored.length)
        const pick = scored[Math.floor(Math.random() * TOP_SLICE)]
        const a = pick.a
        const b = pick.b

        // 3) Radical Synthesis Prompt (The "Grok" Approach)

        let synthesisResult: any = null
        let attempts_count = 0
        const max_attempts = 2

        while (attempts_count < max_attempts) {
            const synthesisPrompt = `
            ROLE: You are a radical innovation strategist (Radical Product Thinking).
            GOAL: Create a NON-OBVIOUS product from components.
            
            COMPONENTS:
            Idea A: ${a.title} — ${a.description} [${a.vertical}]
            Idea B: ${b.title} — ${b.description} [${b.vertical}]
            
            HARD BANS (Forbidden Patterns):
            - NO "CRM", "Micro-CRM", "Platform", "All-in-one", "Aggregator", "Dashboard", "Marketplace".
            - NO "Another tool for managing X".
            - Exception: context only ("This is the Anti-CRM").
            
            REQUIREMENTS (Concreteness):
            - Describe a RIGID ARTIFACT / RITUAL / MECHANISM (e.g. "A physical talisman", "A 15-minute bot call", "A disposable checklist").
            - NOT an abstract service.
            - Specific User (One Role).
            - Specific Scene (One Situation).
            - "Blue Ocean Wedge": The narrowest entry point that makes competition irrelevant.
            - "Contrarian Bet": A belief 99% disagree with, but this product proves true.
            
            THINKING MODELS (Apply ALL 4):
            1. The Medici Effect: Find an intersection via a 3rd domain (Art/Biology/Physics/Games).
            2. SCAMPER: Pick 2 ops (Substitute/Combine/Adapt/Modify/Eliminate/Reverse).
            3. Analogy Bridge: "It's like [Non-SaaS Thing] for [User]".
            4. Inversion: "Instead of X, we do Y".
            
            OUTPUT FORMAT (JSON ONLY, RUSSIAN):
            {
              "synergy_title": "Metaphorical Equation (3-7 words, e.g. 'Tamagotchi for Enterprise')",
              "synergy_description": "2-3 sentences: What is the Artifact? Who uses it? What is the Ritual? (Concrete details)",
              "logic_chain": "1 sentence: The lateral leap explanation.",
              "thinking_models": {
                "medici_effect": "1 line",
                "scamper": "2 lines",
                "analogy_bridge": "1 line",
                "inversion": "1 line"
              },
              "contrarian_bet": "The unpopular truth this product is based on.",
              "blue_ocean_wedge": "The narrow wedge entry point.",
              "anti_generic_guard": "Why this is NOT a CRM/Platform."
            }
        `

            const response = await askGemini(synthesisPrompt)

            try {
                const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
                const parsed = JSON.parse(cleaned)

                if (!isAntiPattern(parsed, BANNED_PATTERNS)) {
                    synthesisResult = parsed
                    break
                } else {
                    console.warn('Generated output contained banned concepts. Retrying...')
                }
            } catch (e) {
                console.error('JSON Parse error', e)
            }
            attempts_count++
        }

        if (!synthesisResult) {
            return NextResponse.json({ status: 'generation_failed' } as SynergyResult)
        }

        // Insert synergy record to DB
        await supabase.from('synergies').insert({
            idea_a_id: a.id,
            idea_b_id: b.id,
            synergy_title: synthesisResult.synergy_title,
            synergy_description: synthesisResult.synergy_description,
            logic_chain: synthesisResult.logic_chain,
            score: pick.total,
            // Store extra metadata if your schema supports it (e.g. in a JSONB column 'metadata')
            // For now, these are just returned to frontend
        })

        return NextResponse.json({
            status: 'success',
            synergy_status: 'synergy_found', // Legacy compat
            synergy_title: synthesisResult.synergy_title,
            synergy_description: synthesisResult.synergy_description,
            logic_chain: synthesisResult.logic_chain,
            // New fields from Grok logic
            thinking_models: synthesisResult.thinking_models,
            contrarian_bet: synthesisResult.contrarian_bet,
            blue_ocean_wedge: synthesisResult.blue_ocean_wedge,

            // Legacy structure for frontend
            components: [a, b],
            synergy_score: pick.total,

            // Debug info
            debug: {
                strategy: 'radical_creativity',
                scores: {
                    synergy: pick.synergyScore,
                    creativity: pick.creativity,
                    total: pick.total
                }
            }
        } as any)

    } catch (error: any) {
        console.error('Error in route:', error)
        return NextResponse.json(
            { status: 'error', error: error?.message ?? 'unknown_error' } as any,
            { status: 500 }
        )
    }
}
