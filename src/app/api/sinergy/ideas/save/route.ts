import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { resolveNewsVertical, normalizeVertical } from '@/lib/sinergy/vertical'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { idea } = await request.json()

    if (!idea) {
      return NextResponse.json({ error: 'Данные обязательны' }, { status: 400 })
    }

    // Check for duplicates
    const { data: existing } = await supabase
      .from('ideas')
      .select('id')
      .eq('source', 'user') // Use valid enum 'user'
      .eq('metadata->>original_id', idea.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ status: 'already_saved', data: existing })
    }

    // Clone the idea with a new source to mark it as "User Saved"
    const { data, error } = await supabase
      .from('ideas')
      .insert({
        title: idea.title || 'Без названия',
        description: idea.description || '',
        source: 'user',
        vertical:
          idea.vertical && normalizeVertical(idea.vertical).startsWith('News')
            ? normalizeVertical(idea.vertical)
            : resolveNewsVertical(idea.title || '', idea.description || ''),
        core_tech: idea.core_tech || [],
        target_audience: idea.target_audience || 'Общая',
        business_model: idea.business_model || 'Не указана',
        pain_point: idea.pain_point || [],
        temporal_marker: 'Сохранено из ленты',
        original_url: idea.original_url || 'N/A',
        is_synergy: false,
        // Store lineage
        metadata: {
          ...(idea.metadata || {}),
          original_source: idea.source || 'perplexity_feed',
          original_id: idea.id,
        },
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase Archive Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ status: 'success', data })
  } catch (error: any) {
    console.error('Error saving idea:', error)
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 })
  }
}
