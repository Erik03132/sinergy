import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request) {
    try {
        // Use Admin Client to bypass RLS policies
        const supabase = createAdminClient()
        const { id } = await request.json()

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 })
        }

        // Hard delete for now, or soft delete if we add deleted_at col later
        const { data, error } = await supabase
            .from('ideas')
            .delete()
            .eq('id', id)
            .select()

        if (error) {
            throw error
        }

        if (!data || data.length === 0) {
            console.warn(`Delete operation returned 0 rows for ID: ${id}. Possible causes: Item not found, already deleted, or RLS restriction.`)
            // We return 200 OK with count 0 to UI so it can remove it from view anyway? 
            // No, UI expects success. Let's return 404 so UI knows it "wasn't there". 
            // OR if user sees it, it means UI is stale.
            return NextResponse.json({ error: 'Item not found or already deleted' }, { status: 404 })
        }

        return NextResponse.json({ status: 'success', count: data.length })

    } catch (error: any) {
        console.error('Error deleting idea:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
