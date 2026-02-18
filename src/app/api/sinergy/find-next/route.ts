import { askGemini } from '@/lib/ai/gemini'
import { createClient } from '@/lib/supabase/server'
import {
    calculateConsensusSynergyScore,
    calculatePairCreativityScore,
    calculateBlueOceanPotential,
    calculateKnowledgeTransferScore,
    sanityCheck,
    isAntiPattern
} from '@/lib/sinergy/scoring'
import { Idea, SynergyResult } from '@/types/sinergy'
import { NextResponse } from 'next/server'

// Comprehensive Banned Patterns from user's request
const BANNED_PATTERNS = [
    'all-in-one', 'aggregator', 'dashboard', 'platform', 'portal', 'витрина', 'каталог',
    'micro-crm', 'мини-crm', 'crm-система', 'маркетплейс',
    'saas для', 'универсальный', 'сервис учета', 'система управления',
    'онлайн-конструктор', 'интеграция', 'автоматизация процессов'
]

// Advanced Catalysts with Domain Affinity
const EVOLUTION_CATALYSTS = [
    {
        title: 'Agentic RAG with Memory',
        description: 'ИИ-агент с долговременной памятью и контекстом пользователя.',
        maturity: 8,
        synergy_domains: ['EdTech', 'HealthTech', 'LegalTech', 'ProductivityTools']
    },
    {
        title: 'Multi-Modal AI (Vision + Text + Voice)',
        description: 'Обработка изображений, текста и голоса в едином потоке.',
        maturity: 7,
        synergy_domains: ['Healthcare', 'Education', 'E-commerce', 'Entertainment']
    },
    {
        title: 'Autonomous Workflow Orchestration',
        description: 'Самообучающаяся автоматизация бизнес-процессов через API.',
        maturity: 6,
        synergy_domains: ['FinTech', 'Operations', 'HR', 'Logistics']
    },
    {
        title: 'Real-Time Personalization Engine',
        description: 'Динамическая адаптация UX на основе поведенческих паттернов.',
        maturity: 8,
        synergy_domains: ['E-commerce', 'Media', 'SaaS', 'Marketing']
    },
    {
        title: 'Blockchain-based Trust Layer',
        description: 'Верифицируемая история изменений для критичных данных.',
        maturity: 5,
        synergy_domains: ['Healthcare', 'Supply Chain', 'Legal', 'FinTech']
    },
    {
        title: 'Predictive Analytics with Causal AI',
        description: 'Не только прогноз, но и объяснение причинно-следственных связей.',
        maturity: 6,
        synergy_domains: ['FinTech', 'Marketing', 'Operations', 'Analytics']
    }
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

        // Adaptive mode selection
        const isEvolutionMode = ideas.length < 3 || Math.random() > 0.4;
        let a: Idea;
        let b: any;
        let modeTitle = "";
        let scores = { total: 0, blue_ocean: 0, knowledge_transfer: 0 };

        if (isEvolutionMode) {
            modeTitle = "Strategic Evolution";
            a = ideas[Math.floor(Math.random() * ideas.length)];

            // Smart catalyst selection
            const compatibleCatalysts = EVOLUTION_CATALYSTS.filter(cat =>
                cat.synergy_domains.some(domain => a.vertical?.includes(domain))
            );

            const catalyst = compatibleCatalysts.length > 0
                ? compatibleCatalysts[Math.floor(Math.random() * compatibleCatalysts.length)]
                : EVOLUTION_CATALYSTS[Math.floor(Math.random() * EVOLUTION_CATALYSTS.length)];

            b = {
                ...catalyst,
                id: `catalyst-${catalyst.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
                core_tech: ['AI', 'Cloud', 'API'],
                business_model: 'Technology Enhancement'
            };

            const domainMatch = catalyst.synergy_domains.includes(a.vertical || "") ? 2 : 0;
            scores.total = (catalyst.maturity * 0.8) + domainMatch + (Math.random() * 1.5);
            scores.knowledge_transfer = catalyst.maturity;
            scores.blue_ocean = 5 + Math.random() * 3;
        } else {
            modeTitle = "Hybrid Synthesis";
            const CANDIDATE_PAIRS = 120;
            const candidates = pickRandomPairs<Idea>(ideas, CANDIDATE_PAIRS)
            const scored = candidates
                .map(([x, y]) => {
                    if (!sanityCheck(x, y)) return null
                    const consensus = calculateConsensusSynergyScore(x, y)
                    const creativity = calculatePairCreativityScore(x, y)
                    const blueOcean = calculateBlueOceanPotential(x, y)
                    const knowledgeTransfer = calculateKnowledgeTransferScore(x, y)

                    return {
                        x, y,
                        total: (consensus * 0.35) + (creativity * 0.25) + (blueOcean * 0.25) + (knowledgeTransfer * 0.15),
                        consensus, creativity, blueOcean, knowledgeTransfer
                    }
                })
                .filter(Boolean) as any[]

            if (scored.length === 0) {
                a = ideas[Math.floor(Math.random() * ideas.length)];
                b = ideas[Math.floor(Math.random() * ideas.length)];
                while (a.id === b.id) b = ideas[Math.floor(Math.random() * ideas.length)];
                scores = { total: 5, blue_ocean: 3, knowledge_transfer: 3 };
            } else {
                scored.sort((x, y) => y.total - x.total)
                const TOP_SLICE = Math.min(3, scored.length)
                const pick = scored[Math.floor(Math.random() * TOP_SLICE)]
                a = pick.x
                b = pick.y
                scores = {
                    total: pick.total,
                    blue_ocean: pick.blueOcean,
                    knowledge_transfer: pick.knowledgeTransfer
                }
            }
        }

        const synthesisPrompt = `
            ROLE: You are a radical innovation strategist combining Blue Ocean Strategy, Knowledge-Based View, and Synergy Analysis.
            MODE: ${modeTitle}
            
            CONTEXT:
            Component A: ${a.title} — ${a.description}
            Domain A: ${a.vertical} | Tech: ${a.core_tech?.join(', ')} | Audience: ${a.target_audience}
            
            ${modeTitle === "Strategic Evolution" ? `Tech Catalyst B` : `Component B`}: ${b.title} — ${b.description}
            ${modeTitle !== "Strategic Evolution" ? `Domain B: ${b.vertical} | Tech: ${b.core_tech?.join(', ')} | Audience: ${b.target_audience}` : ''}
            
            STRATEGIC FRAMEWORKS TO APPLY:
            1. Blue Ocean Strategy: Eliminate-Reduce-Raise-Create framework. Identify what to eliminate from red ocean competition.
            2. Knowledge-Based View: How unique knowledge/capabilities transfer between A and B creates defensible competitive advantage.
            3. SCAMPER (Substitute, Combine, Adapt, Modify, Put to other use, Eliminate, Reverse).
            
            SCORING CONTEXT:
            Synergy Score: ${Math.round(scores.total)}/10
            Blue Ocean Potential: ${Math.round(scores.blue_ocean)}/10
            Knowledge Transfer: ${Math.round(scores.knowledge_transfer)}/10
            
            HARD CONSTRAINTS:
            ❌ BANNED: ${BANNED_PATTERNS.join(', ')}
            ❌ NO abstract "platforms", "ecosystems", "aggregators"
            ❌ NO "Uber for X", "Tinder for Y" analogies
            ✅ REQUIRED: Конкретный механизм работы с техническими деталями (на Русском)
            ✅ REQUIRED: Ясная ценность для конкретного сегмента клиентов
            ✅ REQUIRED: Защищаемое конкурентное преимущество (network effect, data moat, или unique tech)
            
            QUALITY CHECKLIST:
            - Проходит ли "бабушкин тест"?
            - Есть ли конкретный "jobs to be done" для клиента?
            - Можно ли построить MVP за 3 месяца с бюджетом $50K?
            
            Language: RUSSIAN (Русский). Output technical terms in English when appropriate.

            OUTPUT FORMAT (Strict JSON, NO markdown):
            {
              "synergy_title": "String (Product Name)",
              "synergy_description": "2-3 sentences: what, how, who",
              "mvp_scenario": "What to launch in 3 months",
              "logic_chain": "A + B = C, because...",
              "classification": { 
                "vertical": "Specific niche", 
                "core_tech": ["tech 1", "tech 2"],
                "target_audience": "Detailed segment",
                "business_model": "Monetization model"
              },
              "thinking_models": { 
                "blue_ocean_errc": "ERRC analysis",
                "knowledge_transfer": "KBV analysis",
                "scamper": "SCAMPER application",
                "jobs_to_be_done": "JTBD analysis"
              },
              "defensibility": {
                "competitive_moat": "How to prevent copying",
                "unfair_advantage": "Unique advantage"
              },
              "contrarian_bet": "Unpopular opinion behind the product",
              "anti_pattern_check": "Confirmation it is NOT generic"
            }`

        const response = await askGemini(synthesisPrompt)
        let synthesisResult: any = null

        try {
            const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            synthesisResult = JSON.parse(cleaned)
        } catch (e) {
            console.error('JSON Parse error', e)
        }

        if (!synthesisResult) {
            return NextResponse.json({ status: 'error', error: 'Generation failed' } as any, { status: 500 })
        }

        // Save to temporary synergies log
        await supabase.from('synergies').insert({
            idea_a_id: a.id,
            idea_b_id: modeTitle === "Strategic Evolution" ? null : b.id,
            synergy_title: synthesisResult.synergy_title,
            synergy_description: synthesisResult.synergy_description,
            logic_chain: synthesisResult.logic_chain,
            score: scores.total,
            metadata: {
                mode: modeTitle,
                thinking_models: synthesisResult.thinking_models,
                contrarian_bet: synthesisResult.contrarian_bet,
                scores: scores,
                defensibility: synthesisResult.defensibility,
                mvp_scenario: synthesisResult.mvp_scenario
            }
        })

        return NextResponse.json({
            status: 'success',
            synergy_status: 'synergy_found',
            mode: modeTitle,
            ...synthesisResult,
            scores: {
                total: Math.round(scores.total * 10) / 10,
                blue_ocean: Math.round(scores.blue_ocean * 10) / 10,
                knowledge_transfer: Math.round(scores.knowledge_transfer * 10) / 10
            },
            components: [a, b],
            synergy_score: Math.round(scores.total)
        })

    } catch (error: any) {
        console.error('Error in route:', error)
        return NextResponse.json({ status: 'error', error: error?.message ?? 'unknown_error' } as any, { status: 500 })
    }
}
