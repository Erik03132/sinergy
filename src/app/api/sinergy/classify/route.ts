
import { askGemini } from '@/lib/ai/gemini'
import { createClient } from '@/lib/supabase/server'
import { Idea } from '@/types/sinergy'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const classifySchema = z.object({
    title: z.string().min(3),
    description: z.string().min(10),
    is_favorite: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { title, description, is_favorite } = classifySchema.parse(body)

        // Updated prompt for Russian handling
        const prompt = `
            You are a startup idea classifier. Analyze the following idea:
            Title: "${title}"
            Description: "${description}"

            Provide a JSON response with the following fields:
            - vertical: One of ['HealthTech', 'EdTech', 'FinTech', 'ProductivityTools', 'AI-infrastructure', 'CleanTech', 'Logistics', 'Entertainment', 'Other']
            - core_tech: Array of strings (e.g., ['LLM', 'IoT', 'Blockchain', 'AR/VR', 'No-code'])
            - target_audience: String (e.g., 'B2B', 'B2C', 'B2B2C', 'SME')
            - business_model: String (e.g., 'SaaS', 'Marketplace', 'Subscription', 'Advertising')
            - pain_point: Array of strings describing the problem IN RUSSIAN
            - temporal_marker: String (e.g., 'Now', 'Future', '2025-Q1')
            - budget_estimate: One of ['0-25k', '25k-50k', '50k-100k'] or null if hard to estimate
            - tags: Array of keywords (e.g., 'low_code_friendly', 'mobile_first', 'privacy_focused')

            IMPORTANT: 
            1. Return ONLY valid JSON, no markdown code blocks.
            2. If 'pain_point' or descriptions need generation, output them in RUSSIAN.
        `


        let classification
        try {
            const classificationRaw = await askGemini(prompt)
            const cleanJson = classificationRaw.replace(/```json/g, '').replace(/```/g, '').trim()
            classification = JSON.parse(cleanJson)
        } catch (aiError) {
            console.warn('Gemini classification failed, using fallback:', aiError)
            // Fallback to default/empty classification so idea is still saved
            classification = {
                vertical: 'Other',
                core_tech: [],
                target_audience: 'General',
                business_model: 'TBD',
                pain_point: ['(AI classification failed)'],
                temporal_marker: 'Now',
                budget_estimate: null,
                tags: ['uncategorized'],
            }
        }

        const supabase = await createClient()

        // Check for duplicates
        const { data: existing } = await supabase
            .from('ideas')
            .select('id')
            .eq('title', title)
            .eq('source', 'user')
            .single()

        if (existing) {
            return NextResponse.json(existing) // Return existing instead of creating new
        }

        const newIdea = {
            source: 'user',
            title,
            description,
            is_favorite,
            ...classification,
        }

        const { data, error } = await supabase
            .from('ideas')
            .insert(newIdea)
            .select()
            .single()

        if (error) {
            console.error('Supabase error:', error)
            return NextResponse.json({ error: 'Failed to save idea' }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('Validation Error:', error.errors)
            return NextResponse.json({ error: error.errors }, { status: 400 })
        }
        console.error('API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
