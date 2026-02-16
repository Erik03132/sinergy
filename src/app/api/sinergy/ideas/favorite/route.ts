import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { id, is_favorite } = await request.json()

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('ideas')
            .update({ is_favorite: is_favorite })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            throw error
        }

        return NextResponse.json({ status: 'success', data })

    } catch (error: any) {
        console.error('Error toggling favorite:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
