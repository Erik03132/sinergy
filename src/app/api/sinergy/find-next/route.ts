
import { askGemini } from '@/lib/ai/gemini'
import { createClient } from '@/lib/supabase/server'
import { calculateCreativeTensionScore, hasCreativeFriction, isAntiPattern, calculateSurpriseFactor } from '@/lib/sinergy/scoring'
import { Idea, SynergyResult } from '@/types/sinergy'
import { NextResponse } from 'next/server'

const BANNED_PATTERNS = [
    'micro-crm', 'all-in-one', 'aggregator', 'dashboard', 'platform',
    'saas для', 'универсальный', 'маркетплейс', 'интеграция', 'автоматизация процессов',
    'сервис учета', 'система управления', 'онлайн-конструктор'
]

export async function POST() {
    try {
        const supabase = await createClient()
        const { data: ideas } = await supabase.from('ideas').select('*')

        if (!ideas || ideas.length < 2) {
            return NextResponse.json({ status: 'no_more_synergy' } as SynergyResult)
        }

        // Собираем кандидатов с "творческим трением" вместо совместимости
        const candidates: Array<{
            pair: [Idea, Idea];
            tensionScore: number;
            surpriseFactor: number;
            frictionType: string;
        }> = []

        // Увеличиваем количество попыток для поиска неожиданных комбинаций
        const attempts = Math.min(ideas.length * 3, 150)

        for (let i = 0; i < attempts; i++) {
            const idxA = Math.floor(Math.random() * ideas.length)
            const idxB = Math.floor(Math.random() * ideas.length)

            if (idxA === idxB) continue

            const ideaA = ideas[idxA]
            const ideaB = ideas[idxB]

            // Проверяем есть ли "трение" (контраст) между идеями
            const friction = hasCreativeFriction(ideaA, ideaB)
            if (!friction.hasFriction) continue

            // Вычисляем силу "неожиданности" комбинации
            const surpriseFactor = calculateSurpriseFactor(ideaA, ideaB)

            // Вычисляем творческий потенциал через методы lateral thinking
            const tensionScore = calculateCreativeTensionScore(ideaA, ideaB)

            // Отбираем только комбинации с высоким потенциалом сюрприза
            if (surpriseFactor > 0.6 && tensionScore > 4) {
                candidates.push({
                    pair: [ideaA, ideaB],
                    tensionScore,
                    surpriseFactor,
                    frictionType: friction.frictionType
                })
            }
        }

        // Если не нашли "дерзких" комбинаций, берем случайные с минимальным порогом
        if (candidates.length === 0) {
            return NextResponse.json({ status: 'no_more_synergy' } as SynergyResult)
        }

        // Сортируем по surpriseFactor * tensionScore для максимальной креативности
        candidates.sort((a, b) =>
            (b.surpriseFactor * b.tensionScore) - (a.surpriseFactor * a.tensionScore)
        )

        // Выбираем из топ-5 случайно, чтобы избежать повторов
        const topCandidates = candidates.slice(0, Math.min(5, candidates.length))
        const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)]

        const [a, b] = selected.pair

        // Проверяем результат на анти-паттерны после генерации
        let synthesisResult: any = null
        let attempts_count = 0
        const max_attempts = 3

        while (attempts_count < max_attempts) {
            const synthesisPrompt = `
                You are a radical innovation strategist trained in lateral thinking, analogical reasoning, and contrarian product design.
                
                CRITICAL CONSTRAINTS - NEVER VIOLATE:
                - FORBIDDEN WORDS (never use these): ${BANNED_PATTERNS.join(', ')}
                - If you catch yourself suggesting a "CRM", "Platform", or "Aggregator" - start over immediately
                - The result must be WEIRD, SPECIFIC, and COUNTER-INTUITIVE
                
                INPUT IDEAS:
                Idea A: "${a.title}" - ${a.description}
                [Vertical: ${a.vertical || 'unknown'}, Tech: ${a.tech_stack?.join(', ') || 'unknown'}]
                
                Idea B: "${b.title}" - ${b.description}
                [Vertical: ${b.vertical || 'unknown'}, Tech: ${b.tech_stack?.join(', ') || 'unknown'}]
                
                CREATIVE METHOD (apply ALL of these):
                
                1. THE MEDICI EFFECT: These ideas come from different worlds. Find the intersection that NOBODY sees.
                   - Ask: "What would happen if [Idea A's core mechanism] invaded [Idea B's domain]?"
                
                2. SCAMPER TECHNIQUE (pick 2 random):
                   - Substitute: What component of A could replace something in B?
                   - Combine: What if A and B happened simultaneously in one experience?
                   - Adapt: How would B work if it followed A's fundamental constraint?
                   - Magnify: What if A's main feature became 10x more extreme in B's context?
                   - Put to other use: How would B use A's "waste" or byproduct?
                   - Eliminate: What if you removed B's main assumption using A's approach?
                   - Reverse: What if B solved the OPPOSITE problem using A's method?
                
                3. ANALOGICAL TRANSFER: Find an analogy from biology, arts, or physics that connects A and B.
                   Example: "Like a lichen (fungus + algae), this is a symbiotic..."
                
                4. CONTRARIAN BET: What do 99% of founders believe about ${b.vertical}? Invert that belief using ${a.vertical}.
                
                5. BLUE OCEAN STRATEGY: Create new market space by eliminating/reducing/raising/creating factors:
                   - Eliminate: What industry standard does this remove?
                   - Raise: What factor should be 10x better than industry?
                   - Reduce: What pain point becomes almost irrelevant?
                   - Create: What entirely new factor emerges from this fusion?
                
                OUTPUT FORMAT (JSON):
                {
                    "synergy_title": "Specific, evocative name (3-4 words, NO generic terms like 'Solution', 'Platform', 'System')",
                    "synergy_description": "One paragraph describing: (1) The unexpected insight, (2) The specific mechanism, (3) Who pays and why. Use concrete details, not abstractions. Mention a specific technology, material, or behavior.",
                    "logic_chain": "Single sentence explaining the lateral thinking leap using 'X is like Y for Z' format or biological/physical analogy",
                    "creative_method": "Name of primary method used (SCAMPER-X, Medici, Analogy-Y, Contrarian, BlueOcean)",
                    "anti_pattern_check": "Confirm: This is NOT a CRM, dashboard, aggregator, or all-in-one tool"
                }
                
                OUTPUT IN RUSSIAN ONLY. Be bold, specific, and slightly provocative.
                Current friction type detected: ${selected.frictionType}
            `

            const response = await askGemini(synthesisPrompt)

            try {
                const jsonMatch = response.match(/\{[\s\S]*\}/)
                const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null

                if (parsed && !isAntiPattern(parsed, BANNED_PATTERNS)) {
                    synthesisResult = parsed
                    break
                }
            } catch (e) {
                // Parse error, retry
            }

            attempts_count++
        }

        if (!synthesisResult) {
            return NextResponse.json({ status: 'generation_failed' } as SynergyResult)
        }

        return NextResponse.json({
            status: 'success',
            idea_a: a,
            idea_b: b,
            synergy_title: synthesisResult.synergy_title,
            synergy_description: synthesisResult.synergy_description,
            logic_chain: synthesisResult.logic_chain,
            creative_method: synthesisResult.creative_method,
            tension_score: selected.tensionScore,
            surprise_factor: selected.surpriseFactor,
            friction_type: selected.frictionType,
            // Keep types compatible
            hypothesis: synthesisResult.synergy_description,
            components: [a, b],
            synergy_score: selected.tensionScore
        } as SynergyResult)

    } catch (error) {
        console.error('Error in find-next:', error)
        return NextResponse.json(
            { status: 'error', message: 'Internal server error' },
            { status: 500 }
        )
    }
}
