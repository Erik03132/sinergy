import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    const logs: string[] = []
    const push = (msg: string) => { logs.push(msg); console.log(msg) }

    // 1. Проверка HTTP-запроса
    push('=== DIAGNOSE START ===')
    push(`DEEPSEEK_KEY: ${process.env.DEEPSEEK_API_KEY ? 'SET (' + process.env.DEEPSEEK_API_KEY.slice(0, 8) + '...)' : 'NOT SET'}`)
    push(`OPENROUTER_KEY: ${process.env.OPENROUTER_API_KEY ? 'SET (' + process.env.OPENROUTER_API_KEY.slice(0, 8) + '...)' : 'NOT SET'}`)

    // 1a. Прямой тест OpenRouter через прокси
    push('--- OR PROXY TEST ---')
    try {
        const https = await import('https')
        const { HttpsProxyAgent } = await import('https-proxy-agent')
        const agent = new HttpsProxyAgent('http://Q3NeJXTY:dsBaWh2L@172.120.21.141:64468')
        const models = [
            'nvidia/nemotron-3-ultra-550b-a55b:free',
            'openrouter/free',
            'google/gemma-4-31b-it:free',
            'cohere/north-mini-code:free',
            'openai/gpt-oss-20b:free',
            'google/gemma-4-26b-a4b-it:free',
            'anthropic/claude-sonnet-4-20250514',
        ]
        for (const model of models) {
            const result = await new Promise<string>((resolve) => {
                const req = https.default.request({
                    hostname: 'openrouter.ai',
                    path: '/api/v1/chat/completions',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    },
                    agent,
                    timeout: 20000,
                }, (res) => {
                    let data = ''
                    res.on('data', (c) => data += c)
                    res.on('end', () => resolve(`${res.statusCode}`))
                })
                req.on('error', (e) => resolve(`ERROR: ${e.message}`))
                req.on('timeout', () => { req.destroy(); resolve('TIMEOUT') })
                req.write(JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: 'hi' }],
                    max_tokens: 5,
                }))
                req.end()
            })
            push(`OR ${model}: ${result}`)
        }
    } catch (e: any) {
        push(`OR PROXY EX: ${e?.message || e}`)
    }
    try {
        const c = new AbortController()
        const t = setTimeout(() => c.abort(), 5000)
        const r = await fetch('https://hacker-news.firebaseio.com/v0/showstories.json', { signal: c.signal })
        clearTimeout(t)
        const ids = await r.json()
        push(`HN API OK: got ${ids.length} IDs`)
    } catch (e: any) {
        push(`HN API FAIL: ${e?.message || e}`)
    }

    // 2. Проверка DB и insert
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data, error } = await supabase.from('ideas').select('id').limit(1)
        if (error) {
            push(`DB SELECT FAIL: ${error.message}`)
        } else {
            push(`DB SELECT OK: ${data?.length || 0} rows found`)
        }

        const testItem = {
            source: 'user',
            title: 'DIAGNOSE: HN test ' + Date.now(),
            description: 'Diagnostic item',
            vertical: 'News',
            core_tech: [],
            target_audience: 'TBD',
            business_model: 'TBD',
            pain_point: [],
            temporal_marker: new Date().toISOString().split('T')[0],
            metadata: { type: 'diagnose', original_url: `https://test.com/diag`, auto_discovered: true }
        }

        const { data: ins, error: insErr } = await supabase.from('ideas').insert(testItem).select()
        if (insErr) {
            push(`DB INSERT FAIL: ${insErr.message}`)
            push(`Details: ${JSON.stringify(insErr)}`)
        } else {
            push(`DB INSERT OK: id=${ins?.[0]?.id}`)
            await supabase.from('ideas').delete().eq('id', ins![0].id)
            push('DB CLEANUP OK')
        }
    } catch (e: any) {
        push(`DB EXCEPTION: ${e?.message || e}`)
    }

    push('=== DIAGNOSE END ===')
    return NextResponse.json({ logs })
}
