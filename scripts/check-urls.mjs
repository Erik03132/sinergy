
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

// Load .env.local manually
const env = dotenv.parse(fs.readFileSync('.env.local'))

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function checkData() {
    const { data, error } = await supabase
        .from('ideas')
        .select('id, title, original_url, source, vertical')
        .eq('source', 'perplexity')
        .eq('vertical', 'News')
        .order('created_at', { ascending: false })
        .limit(10)

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('Latest 10 News Items:')
    data.forEach(item => {
        console.log(`- [${item.id}] ${item.title.substring(0, 50)}... | URL: "${item.original_url}"`)
    })
}

checkData()
