
import { askGemini } from '@/lib/ai/gemini'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { DetailedAnalysis } from '@/types/sinergy'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { ideaId, title, description } = body

        if (!ideaId || !title || !description) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const prompt = `
            You are a Senior Startup Analyst. Conduct a deep analysis of this product idea:
            
            Title: "${title}"
            Description: "${description}"

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

        // Save to Supabase (in metadata or analysis column if it exists, or just in metadata)
        const supabase = await createClient()

        // We'll store it in a 'metadata' jsonb column for now, under 'analysis' key
        // First fetch existing metadata
        const { data: existingIdea } = await supabase
            .from('ideas')
            .select('metadata')
            .eq('id', ideaId)
            .single()

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
            // We still return the data to the frontend so the user sees it
        }

        return NextResponse.json(analysisWithStatus)

    } catch (error) {
        console.error('Analysis API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
