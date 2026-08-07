import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const { id } = await request.json()

        if (!id) {
            return NextResponse.json({ error: 'Требуется ID' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('ideas')
            .delete()
            .eq('id', id)
            .select()

        if (error) {
            console.error('Supabase Delete Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!data || data.length === 0) {
            console.warn(`Delete operation returned 0 rows for ID: ${id}. Possible causes: Item not found, already deleted, or RLS restriction.`)
            // We return 200 OK with count 0 to UI so it can remove it from view anyway? 
            // No, UI expects success. Let's return 404 so UI knows it "wasn't there". 
            // OR if user sees it, it means UI is stale.
            return NextResponse.json({ error: 'Элемент не найден или уже удалён' }, { status: 404 })
        }

        return NextResponse.json({ status: 'success', count: data.length })

    } catch (error: any) {
        console.error('Error deleting idea:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
