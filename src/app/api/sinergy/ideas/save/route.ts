import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { idea } = await request.json()

        if (!idea) {
            return NextResponse.json({ error: 'Data required' }, { status: 400 })
        }

        // Clone the idea with a new source to mark it as "User Saved"
        // keeping the original ID in metadata for reference logic if needed
        const { data, error } = await supabase.from('ideas').insert({
            title: idea.title,
            description: idea.description,
            // Change source to 'saved_news' so it shows up in Archive query
            source: 'saved_news',
            vertical: idea.vertical,
            core_tech: idea.core_tech,
            target_audience: idea.target_audience,
            business_model: idea.business_model || 'Unknown',
            pain_point: idea.pain_point || [],
            temporal_marker: 'Saved from Feed',
            original_url: idea.original_url,
            is_synergy: false,
            // Store lineage
            metadata: {
                ...idea.metadata,
                original_source: 'perplexity_feed',
                original_id: idea.id
            }
        }).select().single()

        if (error) {
            throw error
        }

        return NextResponse.json({ status: 'success', data })

    } catch (error: any) {
        console.error('Error saving idea:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
