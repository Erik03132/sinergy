
import { askGemini } from '@/lib/ai/gemini'
import { askPerplexity } from '@/lib/ai/perplexity'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const validateSchema = z.object({
    ideaAId: z.string().uuid(),
    ideaBId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { ideaAId, ideaBId } = validateSchema.parse(body)

        const supabase = await createClient()

        // Fetch full idea details
        const { data: ideas, error } = await supabase
            .from('ideas')
            .select('*')
            .in('id', [ideaAId, ideaBId])

        if (error || !ideas || ideas.length !== 2) {
            return NextResponse.json({ error: 'Ideas not found' }, { status: 404 })
        }

        const [ideaA, ideaB] = ideas
        const combinedQuery = `Competitors for ${ideaA.title} (${ideaA.description}) and ${ideaB.title} (${ideaB.description}) startup synergy`

        // 1. Research with Perplexity
        const perplexityPrompt = `
            Research existing startups or products that combine:
            1. ${ideaA.title}: ${ideaA.description}
            2. ${ideaB.title}: ${ideaB.description}

            Find:
            - Direct competitors or similar products
            - Market trend (growing, stable, declining) for this intersection
            - Typical budget for MVP in this space
            - Any major legal restrictions (especially if HealthTech/FinTech)

            Return a detailed summary.
        `

        const researchData = await askPerplexity([
            { role: 'system', content: 'You are a market researcher.' },
            { role: 'user', content: perplexityPrompt }
        ])

        // 2. Synthesize with Gemini
        const synthesisPrompt = `
            You are a Venture Capital Analyst. based on this research data:
            "${researchData}"

            Analyze the combination of:
            - Idea A: ${ideaA.title}
            - Idea B: ${ideaB.title}

            Return a JSON object with this exact structure:
            {
                "status": "validation_done",
                "competition": {
                    "level": "low" | "medium" | "high",
                    "examples": [ { "name": "Name", "url": "URL or 'N/A'" } ] // max 3
                },
                "budget": {
                    "range": "string (e.g. 45000-65000)",
                    "comment": "short explanation"
                },
                "mvp_timeline": {
                    "months": number,
                    "comment": "short explanation"
                },
                "trend": {
                    "direction": "growing" | "flat" | "declining",
                    "comment": "short explanation"
                },
                "legal": {
                    "risk": "low" | "medium" | "high",
                    "comment": "short explanation"
                }
            }

            IMPORTANT: Valid JSON only. No markdown.
        `

        const synthesisRaw = await askGemini(synthesisPrompt)
        const cleanJson = synthesisRaw.replace(/```json/g, '').replace(/```/g, '').trim()

        let validationResult
        try {
            validationResult = JSON.parse(cleanJson)
        } catch (e) {
            console.error('Failed to parse validation result:', cleanJson)
            return NextResponse.json({ error: 'Validation parsing failed' }, { status: 500 })
        }

        return NextResponse.json(validationResult)

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 })
        }
        console.error('Validation API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
