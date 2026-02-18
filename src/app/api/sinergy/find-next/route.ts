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

// Comprehensive Banned Patterns
const BANNED_PATTERNS = [
    'micro-crm', 'all-in-one', 'aggregator', 'dashboard', 'platform',
    'saas для', 'универсальный', 'маркетплейс', 'интеграция', 'автоматизация процессов',
    'сервис учета', 'система управления', 'онлайн-конструктор',
    'микро-crm', 'мини-crm', 'crm-система', 'витрина', 'каталог', 'портал'
]

// Modern Tech Catalysts for "Evolution" mode
const EVOLUTION_CATALYSTS = [
    { title: 'RAG (Retrieval-Augmented Generation)', description: 'Внедрение базы знаний для ИИ на основе ваших данных.' },
    { title: 'AI Agent / Chatbot', description: 'Автономный помощник, выполняющий действия вместо пользователя.' },
    { title: 'Dynamic Landing Generator', description: 'Автоматическое создание продающих страниц под каждый сегмент.' },
    { title: 'Vector Database Integration', description: 'Поиск по смыслу и ассоциациям в больших массивах данных.' },
    { title: 'Conversational UI', description: 'Интерфейс на естественном языке вместо кнопок и форм.' },
    { title: 'Automated Multi-step Workflows', description: 'Сквозная автоматизация цепочки действий через Zapier/Make.' },
    { title: 'Personalized AI Content', description: 'Генерация уникального контента под каждого конкретного клиента.' }
]

function pickRandomPairs<T>(items: T[], pairCount: number): Array<[T, T]> {
    const n = items.length
    const pairs: Array<[T, T]> = []
    if (n < 2) return pairs

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
            return NextResponse.json({ status: 'error', error: error.message } as any, { status: 500 })
        }

        if (!ideas || ideas.length === 0) {
            return NextResponse.json({ status: 'no_more_synergy' } as SynergyResult)
        }

        const isEvolutionMode = Math.random() > 0.5;
        let a: Idea;
        let b: any;
        let modeTitle = "Hybrid Synthesis";
        let finalScore = 0;
        let scoreBreakdown = {};

        if (isEvolutionMode || ideas.length < 2) {
            modeTitle = "Strategic Evolution";
            a = ideas[Math.floor(Math.random() * ideas.length)];
            b = EVOLUTION_CATALYSTS[Math.floor(Math.random() * EVOLUTION_CATALYSTS.length)];
            finalScore = 8 + Math.random() * 2; // Evolution is usually high value
        } else {
            modeTitle = "Hybrid Synthesis";
            const CANDIDATE_PAIRS = Math.min(160, Math.max(60, ideas.length * 8))
            const candidates = pickRandomPairs<Idea>(ideas, CANDIDATE_PAIRS)
            const scored = candidates
                .map(([x, y]) => {
                    if (!sanityCheck(x, y)) return null
                    const { score: synergyScore, breakdown } = calculateSynergyScore(x, y)
                    const creativity = calculatePairCreativityScore(x, y)
                    return { x, y, total: synergyScore + creativity, synergyScore, creativity, breakdown }
                })
                .filter(Boolean) as any[]

            if (scored.length === 0) {
                a = ideas[0];
                b = ideas[1];
                finalScore = 5;
            } else {
                scored.sort((x, y) => y.total - x.total)
                const TOP_SLICE = Math.min(12, scored.length)
                const pick = scored[Math.floor(Math.random() * TOP_SLICE)]
                a = pick.x
                b = pick.y
                finalScore = pick.total
                scoreBreakdown = pick.breakdown
            }
        }

        let synthesisResult: any = null
        let attempts_count = 0
        const max_attempts = 2

        while (attempts_count < max_attempts) {
            const synthesisPrompt = `
            ROLE: You are a radical innovation strategist.
            MODE: ${modeTitle}
            
            GOAL: ${modeTitle === "Strategic Evolution"
                    ? `Take an existing idea (A) and EVOLVE it by injecting a specific Tech Catalyst (B) to create a premium, state-of-the-art product.`
                    : `Create a NON-OBVIOUS product from components (A) and (B).`}
            
            COMPONENTS:
            Idea A: ${a.title} — ${a.description}
            ${modeTitle === "Strategic Evolution" ? `Tech Catalyst B` : `Idea B`}: ${b.title} — ${b.description}
            
            HARD BANS:
            - NO "CRM", "Micro-CRM", "Platform", "All-in-one", "Aggregator", "Dashboard", "Marketplace".
            
            REQUIREMENTS:
            - Describe a RIGID ARTIFACT / MECHANISM (e.g. "A physical talisman", "A bot that calls you", "A headless API").
            - NOT an abstract service.
            - Specific User and Specific Scene.
            - "The Glue": How exactly B upgrades A (be specific).
            
            OUTPUT FORMAT (JSON ONLY, RUSSIAN):
            {
              "synergy_title": "Metaphorical Equation (3-7 words)",
              "synergy_description": "2-3 sentences description",
              "logic_chain": "1 sentence: Why this is a breakthrough.",
              "thinking_models": {
                "medici_effect": "Integration point",
                "scamper": "Transformation used",
                "analogy_bridge": "Metaphor",
                "inversion": "Old process destroyed"
              },
              "contrarian_bet": "The unpopular truth.",
              "blue_ocean_wedge": "Narrow wedge entry point.",
              "anti_generic_guard": "Why this is NOT a CRM/Platform."
            }`

            const response = await askGemini(synthesisPrompt)

            try {
                const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
                const parsed = JSON.parse(cleaned)

                if (!isAntiPattern(parsed, BANNED_PATTERNS)) {
                    synthesisResult = parsed
                    break
                }
            } catch (e) {
                console.error('JSON Parse error', e)
            }
            attempts_count++
        }

        if (!synthesisResult) {
            return NextResponse.json({ status: 'error', error: 'Generation failed' } as any, { status: 500 })
        }

        await supabase.from('synergies').insert({
            idea_a_id: a.id,
            idea_b_id: modeTitle === "Strategic Evolution" ? null : b.id,
            synergy_title: synthesisResult.synergy_title,
            synergy_description: synthesisResult.synergy_description,
            logic_chain: synthesisResult.logic_chain,
            score: finalScore
        })

        return NextResponse.json({
            status: 'success',
            synergy_status: 'synergy_found',
            synergy_title: synthesisResult.synergy_title,
            synergy_description: synthesisResult.synergy_description,
            logic_chain: synthesisResult.logic_chain,
            thinking_models: synthesisResult.thinking_models,
            contrarian_bet: synthesisResult.contrarian_bet,
            blue_ocean_wedge: synthesisResult.blue_ocean_wedge,
            components: [a, b],
            synergy_score: Math.round(finalScore)
        })

    } catch (error: any) {
        console.error('Error in route:', error)
        return NextResponse.json({ status: 'error', error: error?.message ?? 'unknown_error' } as any, { status: 500 })
    }
}
