import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        // Use Admin Client to see ALL data regardless of RLS
        const supabase = createAdminClient()

        // Fetch all ideas
        const { data: allIdeas } = await supabase
            .from('ideas')
            .select('id, title, source, created_at, metadata')
            .order('created_at', { ascending: false })

        if (!allIdeas) return NextResponse.json({ message: 'No ideas found' })

        const seen = new Set()
        const duplicates = []

        for (const idea of allIdeas) {
            // Unique key: Title + Source (or just Title for strict dedup?)
            // Let's use Title for now as the main unique factor for user feed items
            const key = idea.title.trim().toLowerCase()

            if (seen.has(key)) {
                duplicates.push(idea.id)
            } else {
                seen.add(key)
            }
        }

        if (duplicates.length > 0) {
            const { error } = await supabase
                .from('ideas')
                .delete()
                .in('id', duplicates)

            if (error) throw error
        }

        return NextResponse.json({
            success: true,
            deleted_count: duplicates.length,
            deleted_ids: duplicates
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
