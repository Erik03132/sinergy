import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { runBlender, saveSynergy, AgentMode } from '@/lib/sinergy/agents/orchestrator'
import { SynergyResult } from '@/types/sinergy'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    const mode: AgentMode = body.mode || 'full'

    const { data: ideas, error } = await supabase
      .from('ideas')
      .select('*')
      .not('vertical', 'is', null)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      return NextResponse.json({ status: 'error', error: error.message } as any, { status: 500 })
    }
    if (!ideas || ideas.length < 2) {
      return NextResponse.json({ status: 'no_more_synergy' } as any)
    }

    const results = await runBlender(ideas, { mode })

    if (results.length === 0 || results[0].status === 'no_more_synergy') {
      return NextResponse.json({ status: 'no_more_synergy' } as SynergyResult)
    }

    const result = results[0]
    const a = result.components?.[0]
    const b = result.components?.[1]
    const idea_id = a && b ? await saveSynergy(supabase, result, a, b, result.scores, result.mode || 'det') : null

    return NextResponse.json({
      status: 'synergy_found',
      mode: result.mode,
      idea_id,
      synergy_title: result.synergy_title,
      synergy_description: result.synergy_description,
      mvp_scenario: result.mvp_scenario,
      logic_chain: result.logic_chain,
      classification: result.classification,
      thinking_models: result.thinking_models,
      defensibility: result.defensibility,
      ai_trend_forecast: result.ai_trend_forecast,
      contrarian_bet: result.contrarian_bet,
      anti_pattern_check: result.anti_pattern_check,
      scores: result.scores,
      components: result.components,
      synergy_score: result.synergy_score,
    } as any)
  } catch (error: any) {
    console.error('Error in route:', error)
    return NextResponse.json({ status: 'error', error: error?.message ?? 'unknown_error' } as any, { status: 500 })
  }
}
