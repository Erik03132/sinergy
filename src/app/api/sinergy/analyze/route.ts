
import { askGemini } from '@/lib/ai/gemini'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { DetailedAnalysis } from '@/types/sinergy'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { ideaId, title, description, additionalContext } = body

        if (!ideaId || !title || !description) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const supabase = await createClient()

        // 1. Server-side Cache Check
        // If we already have an analysis and NO additional context (refinement), return it directly
        const { data: existingIdea } = await supabase
            .from('ideas')
            .select('metadata')
            .eq('id', ideaId)
            .single()

        if (existingIdea?.metadata?.analysis && !additionalContext) {
            console.log(`📦 Returning cached analysis for idea ${ideaId}`)
            return NextResponse.json(existingIdea.metadata.analysis)
        }

        const prompt = `
            You are a Senior Startup Analyst. Conduct a deep analysis of this product idea:
            
            Title: "${title}"
            Description: "${description}"
            ${additionalContext ? `USER ADDITIONAL THOUGHTS/CONTEXT: "${additionalContext}"` : ''}

            Provide a detailed report in JSON format with the following structure:
            {
                "market": {
                    "tam": "Total Addressable Market size and rationale",
                    "sam": "Serviceable Available Market estimate",
                    "som": "Serviceable Obtainable Market estimate",
                    "description": "Market trends and dynamics analysis"
                },
                "competitors": [
                    {
                        "name": "Competitor Name",
                        "url": "Website URL (if known, or 'N/A')",
                        "strength": "Key advantage",
                        "weakness": "Key vulnerability"
                    }
                ],
                "swot": {
                    "strengths": ["Item 1", "Item 2"],
                    "weaknesses": ["Item 1", "Item 2"],
                    "opportunities": ["Item 1", "Item 2"],
                    "threats": ["Item 1", "Item 2"]
                },
                "roadmap": [
                    {
                        "phase": "MVP / Phase 1",
                        "duration": "e.g., 3 months",
                        "steps": ["Step 1", "Step 2", "Step 3"]
                    },
                    {
                        "phase": "Growth / Phase 2",
                        "duration": "e.g., 6 months",
                        "steps": ["Step 1", "Step 2", "Step 3"]
                    }
                ]
            }

            IMPORTANT:
            1. Output MUST be valid JSON.
            2. Language: RUSSIAN (Русский).
            3. Be realistic and critical. Avoid fluff.
        `

        console.log(`🧠 Analyzing idea ${ideaId}...`)
        const responseRaw = await askGemini(prompt)
        const cleanJson = responseRaw.replace(/```json/g, '').replace(/```/g, '').trim()

        let analysisData: Omit<DetailedAnalysis, 'status'>
        try {
            analysisData = JSON.parse(cleanJson)
        } catch (e) {
            console.error('Failed to parse analysis JSON:', cleanJson)
            return NextResponse.json({ error: 'Failed to generate analysis' }, { status: 500 })
        }

        const analysisWithStatus: DetailedAnalysis = {
            status: 'completed',
            ...analysisData
        }

        // 3. Save to Supabase (only if updated or new)
        const updatedMetadata = {
            ...(existingIdea?.metadata || {}),
            analysis: analysisWithStatus
        }

        const { error: updateError } = await supabase
            .from('ideas')
            .update({ metadata: updatedMetadata })
            .eq('id', ideaId)

        if (updateError) {
            console.error('Failed to save analysis to DB:', updateError)
        }

        return NextResponse.json(analysisWithStatus)

    } catch (error) {
        console.error('Analysis API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
