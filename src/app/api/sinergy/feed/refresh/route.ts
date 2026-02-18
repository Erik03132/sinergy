
import { askGemini } from '@/lib/ai/gemini'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isSimilar } from '@/lib/utils/string-similarity'

// Shared logic for fetching feed (used by Cron and Manual Trigger)
async function fetchAndStoreFeed() {
    const prompt = `
        Search the web for 10 DISTINCT, NEW (last 24-48 hours) startup ideas, micro-SaaS projects, or business case studies with a budget under $100k.
        Look for announcements on ProductHunt, IndieHackers, and Reddit (r/SaaS).

        Format the output as a JSON Array of objects with these fields:
        - title: Catchy title (Russian)
        - summary: 2-3 sentences description (Russian)
        - source: Source name (e.g. "Product Hunt")
        - url: URL to source (MANDATORY, must be real)
        - budget: Estimated budget string (e.g. "$500", "$10k")

        IMPORTANT: 
        1. Output ONLY valid JSON array.
        2. ALL TEXT (title, summary) MUST BE IN RUSSIAN.
        3. REAL URLs are CRITICAL.
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

    // Enhanced Deduplication

    // 1. Fetch recent history (last 100 items) to compare against
    const { data: recentHistory } = await supabase
        .from('ideas')
        .select('original_url, title')
        .eq('source', 'perplexity')
        .order('created_at', { ascending: false })
        .limit(100)

    const existingUrls = new Set(recentHistory?.map(e => e.original_url).filter(u => u && u !== 'N/A'))
    const existingTitles = recentHistory?.map(e => e.title) || []

    // Helper to check title uniqueness
    const isTitleUnique = (newTitle: string) => {
        // Check for exact match
        if (existingTitles.includes(newTitle)) return false
        // Check for fuzzy match using Levenshtein distance
        // Importing here to keep it self-contained if we don't want a separate lib file, 
        // but cleaner to use the lib file we just created.
        // Assuming we import `isSimilar` at the top.
        return !existingTitles.some(existing => isSimilar(newTitle, existing))
    }

    // Track titles we've seen in this run (both from DB and processed inserts)
    const seenTitles = new Set(existingTitles)

    const uniqueInserts = inserts.filter((item: any) => {
        // 1. URL Check
        if (item.original_url && item.original_url !== 'N/A' && existingUrls.has(item.original_url)) {
            console.log(`Duplicate URL found: ${item.original_url}`)
            return false
        }

        // 2. Title/Fuzzy Check
        // Check against ANY seen title (DB or previous in this batch)
        let isDuplicate = false
        // Exact match check
        if (seenTitles.has(item.title)) {
            isDuplicate = true
        } else {
            // Fuzzy check against all seen titles
            // (Note: This gets slower as seenTitles grows, but for <100 items it's fine)
            for (const seenTitle of Array.from(seenTitles)) {
                if (isSimilar(item.title, seenTitle)) {
                    isDuplicate = true
                    break
                }
            }
        }

        if (isDuplicate) {
            console.log(`Duplicate Title found: ${item.title}`)
            return false
        }

        // If unique, add to seen set so subsequent items in this batch are checked against it
        seenTitles.add(item.title)
        return true
    })

    if (uniqueInserts.length > 0) {
        const { error } = await supabase.from('ideas').insert(uniqueInserts)
        if (error) throw error
        return uniqueInserts.length
    }

    return 0
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
