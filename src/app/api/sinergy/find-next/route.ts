
import { askGemini } from '@/lib/ai/gemini'
import { createClient } from '@/lib/supabase/server'
import { calculateSynergyScore, isVerticalCompatible, sanityCheck } from '@/lib/sinergy/scoring'
import { Idea, SynergyResult } from '@/types/sinergy'
import { NextResponse } from 'next/server'

export async function POST() {
    try {
        const supabase = await createClient()
        const { data: ideas } = await supabase.from('ideas').select('*')

        if (!ideas || ideas.length < 2) {
            return NextResponse.json({ status: 'no_more_synergy' } as SynergyResult)
        }

        let bestPair: [Idea, Idea] | null = null
        let bestScore = -1

        // Randomize start index to vary results
        const startIdx = Math.floor(Math.random() * (ideas.length - 1))

        const debug_info: string[] = []

        // Loop through ALL ideas logic
        for (let offset = 0; offset < ideas.length; offset++) {
            const i = (startIdx + offset) % ideas.length

            for (let j = 0; j < ideas.length; j++) {
                if (i === j) continue

                const ideaA = ideas[i]
                const ideaB = ideas[j]

                if (!isVerticalCompatible(ideaA, ideaB)) {
                    if (debug_info.length < 5) debug_info.push(`Incompatible Vertical: ${ideaA.vertical} vs ${ideaB.vertical}`)
                    continue
                }
                if (!sanityCheck(ideaA, ideaB)) {
                    if (debug_info.length < 5) debug_info.push(`Sanity Check Failed: ${ideaA.title} + ${ideaB.title}`)
                    continue
                }

                const { score } = calculateSynergyScore(ideaA, ideaB)

                if (score > bestScore && score > 5) {
                    bestScore = score
                    bestPair = [ideaA, ideaB]
                    // Greedily take good enough synergy for variety
                    if (Math.random() > 0.7) break
                }
            }
            if (bestPair && Math.random() > 0.5) break
        }

        if (!bestPair) {
            return NextResponse.json({ status: 'no_more_synergy' } as SynergyResult)
        }

        const [a, b] = bestPair

        // Updated prompt for Russian Output
        const synthesisPrompt = `
            You are a creative product manager. I found a potential synergy between two ideas.

            Idea A: ${a.title} (${a.description})
            Idea B: ${b.title} (${b.description})

            Task:
            1. Create a "Logic Chain" explaining why they fit together (in Russian).
            2. Formulate a "Product Hypothesis" - a concrete new product idea (in Russian).

            Return JSON:
            {
                "synergy_title": "Short catchy name (3-6 words)",
                "synergy_description": "Detailed product hypothesis (2-3 sentences)",
                "logic_chain": "Why this works (1 sentence)"
            }
            OUTPUT IN RUSSIAN LANGUAGE ONLY.
        `

        const synthesisRaw = await askGemini(synthesisPrompt)
        const cleanJson = synthesisRaw.replace(/```json/g, '').replace(/```/g, '').trim()
        const synthesis = JSON.parse(cleanJson)

        return NextResponse.json({
            status: 'synergy_found',
            score: bestScore,
            synergy_score: bestScore,
            components: bestPair,
            ...synthesis
        } as SynergyResult)

    } catch (error) {
        console.error(error)
        return NextResponse.json({ status: 'error' } as SynergyResult, { status: 500 })
    }
}
