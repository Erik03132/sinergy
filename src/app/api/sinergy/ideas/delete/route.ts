import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const { id } = await request.json()

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 })
        }

        // Hard delete for now, or soft delete if we add deleted_at col later
        const { error } = await supabase
            .from('ideas')
            .delete()
            .eq('id', id)

        if (error) {
            throw error
        }

        return NextResponse.json({ status: 'success' })

    } catch (error: any) {
        console.error('Error deleting idea:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
