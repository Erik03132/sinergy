
import { askGemini } from '@/lib/ai/gemini'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Idea } from '@/types/sinergy'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Node.js runtime for full support of admin client and complex AI prompts
export const runtime = 'nodejs'

const classifySchema = z.object({
    title: z.string().min(1, "Название не может быть пустым"),
    description: z.string().min(1, "Описание не может быть пустым"),
    is_favorite: z.boolean().optional().default(false),
    source: z.enum(['user', 'synergy']).optional().default('user'),
    vertical: z.string().optional(),
    core_tech: z.array(z.string()).optional(),
    target_audience: z.string().optional(),
    business_model: z.string().optional(),
})

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const parsed = classifySchema.parse(body)
        const { title, description, is_favorite, source } = parsed

        let classification

        // If pre-classified (e.g. from Blender), skip AI
        if (parsed.vertical && parsed.core_tech) {
            classification = {
                vertical: parsed.vertical,
                core_tech: parsed.core_tech,
                target_audience: parsed.target_audience || 'General',
                business_model: parsed.business_model || 'TBD',
                pain_point: ['(Pre-classified)'],
                temporal_marker: 'Now',
                budget_estimate: null,
                tags: ['synergy'],
            }
        } else {
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

            try {
                const classificationRaw = await askGemini(prompt)
                const cleanJson = classificationRaw.replace(/```json/g, '').replace(/```/g, '').trim()
                classification = JSON.parse(cleanJson)

                // Sanitize fields for DB constraints
                const validBudgets = ['0-25k', '25k-50k', '50k-100k']
                if (classification.budget_estimate && !validBudgets.includes(classification.budget_estimate)) {
                    classification.budget_estimate = null
                }

                const validVerticals = ['HealthTech', 'EdTech', 'FinTech', 'ProductivityTools', 'AI-infrastructure', 'CleanTech', 'Logistics', 'Entertainment', 'Other']
                if (classification.vertical && !validVerticals.includes(classification.vertical)) {
                    classification.vertical = 'Other'
                }

                // Ensure array fields are actually arrays to satisfy DB schema
                classification.core_tech = Array.isArray(classification.core_tech) ? classification.core_tech.map(String) : []
                classification.pain_point = Array.isArray(classification.pain_point) ? classification.pain_point.map(String) : []
                classification.tags = Array.isArray(classification.tags) ? classification.tags.map(String) : []

            } catch (aiError) {
                console.warn('Gemini classification failed, using fallback:', aiError)
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
        }

        let supabase = createAdminClient()

        if (!supabase) {
            console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY is missing. Falling back to standard client. Note: This may fail if RLS policies are strict.')
            supabase = await createClient()
        }

        if (!supabase) {
            return NextResponse.json({ error: 'Database configuration error (No Client Available)' }, { status: 500 })
        }

        // Check for duplicates
        const { data: existing } = await supabase
            .from('ideas')
            .select('id')
            .eq('title', title)
            .eq('source', source || 'user')
            .maybeSingle()

        if (existing) {
            console.log(`ℹ️ Idea already exists: ${existing.id}`)
            return NextResponse.json(existing) // Return existing instead of creating new
        }

        const newIdea = {
            source: source || 'user',
            title,
            description,
            is_favorite,
            ...classification,
        }

        console.log(`💾 Saving new idea to database...`)
        const { data, error } = await supabase
            .from('ideas')
            .insert(newIdea)
            .select()
            .single()

        if (error) {
            console.error('❌ Supabase error:', error)
            return NextResponse.json({ error: `Failed to save idea: ${error.message}` }, { status: 500 })
        }

        console.log(`✅ Idea saved successfully: ${data.id}`)
        return NextResponse.json(data)
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            const msg = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
            return NextResponse.json({ error: `Ошибка валидации: ${msg}` }, { status: 400 })
        }
        console.error('API Error:', error)
        // Expose error message for easier debugging in production
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message || 'Unknown error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 })
    }
}
