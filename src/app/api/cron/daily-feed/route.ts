
import { askGemini } from '@/lib/ai/gemini'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const prompt = `
            Search the web for 10 DISTINCT, NEW (last 24-48 hours) startup ideas, micro-SaaS projects, or business case studies with a budget under $100k.
            Search ProductHunt, IndieHackers, and Reddit (r/SaaS).

            Format the output as a JSON Array of objects with these fields:
            - title: Catchy title (Russian)
            - summary: 2-3 sentences description (Russian)
            - source: Source name (e.g. "Product Hunt")
            - url: URL to source (MANDATORY)
            - budget: Estimated budget string (e.g. "$500", "$10k")

            IMPORTANT: 
            1. Output ONLY valid JSON array.
            2. ALL TEXT (title, summary) MUST BE IN RUSSIAN.
            3. REAL URLs ARE CRITICAL.
        `

        const responseRaw = await askGemini(prompt, { search: true })

        let newsItems = []
        // Strict JSON cleanup
        const clean = responseRaw.replace(/```json/g, '').replace(/```/g, '').trim()

        // Attempt to extract JSON array if mixed with text
        const jsonMatch = clean.match(/\[[\s\S]*\]/)
        const jsonString = jsonMatch ? jsonMatch[0] : clean

        try {
            newsItems = JSON.parse(jsonString)
        } catch (e) {
            console.error('Failed to parse Gemini JSON. Raw response:', responseRaw)
            throw new Error('Invalid JSON format from AI')
        }

        const supabase = await createClient()
        const inserts = newsItems.map((item: any) => ({
            source: 'perplexity',
            title: item.title,
            description: `${item.summary} (Источник: ${item.source}, Бюджет: ${item.budget})`,
            vertical: 'News',
            original_url: item.url,
            is_synergy: false,
            core_tech: [],
            target_audience: 'General',
            business_model: 'Startup',
            pain_point: [],
            temporal_marker: new Date().toISOString().split('T')[0],
        }))

        // Check for existing URLs to prevent duplicates
        const urls = newsItems.map((i: any) => i.url).filter((u: string) => u && u !== 'N/A')

        let finalInserts = inserts
        if (urls.length > 0) {
            const { data: existing } = await supabase
                .from('ideas')
                .select('original_url')
                .in('original_url', urls)

            const existingUrls = new Set(existing?.map(e => e.original_url))

            finalInserts = inserts.filter((item: any) =>
                !item.original_url || item.original_url === 'N/A' || !existingUrls.has(item.original_url)
            )
        }

        if (finalInserts.length > 0) {
            const { error } = await supabase.from('ideas').insert(finalInserts)
            if (error) throw error
        }

        // Log success
        await supabase.from('cron_logs').insert({
            name: 'daily-feed',
            status: 'success',
            item_count: finalInserts.length
        })

        return NextResponse.json({ success: true, count: finalInserts.length })

    } catch (error: any) {
        console.error('Cron Error:', error)

        // Log error to DB if possible
        try {
            const supabase = await createClient()
            await supabase.from('cron_logs').insert({
                name: 'daily-feed',
                status: 'error',
                message: error.message || 'Unknown error'
            })
        } catch (logError) {
            console.error('Failed to log cron error:', logError)
        }

        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
