
import { askPerplexity } from '@/lib/ai/perplexity'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const prompt = `
            Find 10 DISTINCT, NEW (last 24-48 hours) startup ideas, micro-SaaS projects, or business case studies with a budget under $100k.
            Search sources like IndieHackers, ProductHunt, Reddit (r/SaaS, r/Entrepreneur), Twitter, and TechCrunch.

            Format the output as a JSON Array of objects with these fields:
            - title: Catchy title (Russian)
            - summary: 2-3 sentences description (Russian)
            - source: Source name (e.g. "Product Hunt")
            - url: URL to source (or 'N/A')
            - budget: Estimated budget string (e.g. "$500", "$10k")

            IMPORTANT: 
            1. Output ONLY valid JSON array.
            2. ALL TEXT (title, summary) MUST BE IN RUSSIAN.
        `

        const responseRaw = await askPerplexity([{ role: 'user', content: prompt }])
        const clean = responseRaw.replace(/```json/g, '').replace(/```/g, '').trim()
        const newsItems = JSON.parse(clean)

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

        await supabase.from('ideas').insert(inserts)
        return NextResponse.json({ success: true, count: inserts.length })

    } catch (error) {
        console.error('Cron Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
