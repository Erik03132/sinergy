
import { askGemini } from '@/lib/ai/gemini'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Shared logic for fetching feed (used by Cron and Manual Trigger)
async function fetchAndStoreFeed() {
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

    const responseRaw = await askGemini(prompt)

    let newsItems = []
    // Strict JSON cleanup
    const clean = responseRaw.replace(/```json/g, '').replace(/```/g, '').trim()

    // Attempt to extract JSON array if mixed with text
    const jsonMatch = clean.match(/\[.*\]/s)
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

    if (urls.length > 0) {
        const { data: existing } = await supabase
            .from('ideas')
            .select('original_url')
            .in('original_url', urls)

        const existingUrls = new Set(existing?.map(e => e.original_url))

        // Filter inserts
        const uniqueInserts = inserts.filter((item: any) =>
            !item.original_url || item.original_url === 'N/A' || !existingUrls.has(item.original_url)
        )

        if (uniqueInserts.length > 0) {
            const { error } = await supabase.from('ideas').insert(uniqueInserts)
            if (error) throw error
            return uniqueInserts.length
        }
        return 0
    }

    const { error } = await supabase.from('ideas').insert(inserts)
    if (error) throw error

    return inserts.length
}

// POST endpoint for Manual Trigger from Frontend
export async function POST() {
    try {
        const count = await fetchAndStoreFeed()
        return NextResponse.json({ success: true, count })
    } catch (error) {
        console.error('Manual Feed Error Details:', error)
        if (error instanceof Error) {
            console.error('Message:', error.message)
            console.error('Stack:', error.stack)
        }
        return NextResponse.json({ error: 'Failed to update feed' }, { status: 500 })
    }
}
