/**
 * Direct test of discovery cycle and supabase insert
 * Run: npx tsx scripts/test_discovery_local.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { getHNShow, getHNStories, getHNBest } from '../src/lib/sinergy/hackernews'
import { getProductHuntTrending } from '../src/lib/sinergy/producthunt'
import { getDevToStartupPosts } from '../src/lib/sinergy/devto'
import { getAllAsianStartups } from '../src/lib/sinergy/asia-startups'
import { getAllRSSFeeds } from '../src/lib/sinergy/rss-sources'
import { getGitHubTrendingAll } from '../src/lib/sinergy/github-trending'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lufkysfjrdzfaxjbnkhi.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1Zmt5c2ZqcmR6ZmF4amJua2hpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODkxMDQsImV4cCI6MjA4NjE2NTEwNH0.E9beMe5kx_C5DLsinrhFpdRgNSYd5J2z_p4ACCNoFeE'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function testSources() {
  console.log('\n=== 1. TESTING SOURCES ===')
  const sources = [
    ['Product Hunt', () => getProductHuntTrending()],
    ['HN Show', () => getHNShow(5)],
    ['HN New', () => getHNStories(5)],
    ['GitHub', () => getGitHubTrendingAll()],
    ['Dev.to', () => getDevToStartupPosts()],
    ['Asia', () => getAllAsianStartups()],
    ['RSS Feeds', () => getAllRSSFeeds()],
  ]

  let totalItems = 0
  for (const [name, fn] of sources) {
    try {
      const items = await fn()
      console.log(`  ${name}: ${items.length} items`)
      totalItems += items.length
    } catch (e: any) {
      console.log(`  ${name}: FAIL - ${e.message.slice(0, 80)}`)
    }
  }
  console.log(`  TOTAL: ${totalItems} raw items`)
  return totalItems
}

async function testInsert() {
  console.log('\n=== 2. TESTING SUPABASE INSERT ===')
  
  const testId = Date.now()
  const testItem = {
    source: 'user',
    title: `TEST: Discovery Cycle ${testId}`,
    description: `Test item for debugging discovery zero issue ${testId}`,
    vertical: 'News',
    core_tech: [],
    target_audience: 'TBD',
    business_model: 'TBD',
    pain_point: [],
    temporal_marker: '2026-07-30',
    metadata: {
      type: 'test',
      original_source: 'test',
      original_url: `https://test.com/${testId}`,
      is_synergy: false,
      auto_discovered: true
    }
  }

  console.log('  Insert payload:', JSON.stringify(testItem, null, 2).slice(0, 300))

  const { data, error } = await supabase.from('ideas').insert(testItem).select()
  if (error) {
    console.log(`  ❌ INSERT FAILED: ${error.message}`)
    console.log(`  Details: ${JSON.stringify(error)}`)
    return false
  }
  
  console.log(`  ✅ Insert OK, id: ${data?.[0]?.id}`)
  
  // Cleanup
  if (data?.[0]?.id) {
    await supabase.from('ideas').delete().eq('id', data[0].id)
    console.log('  ✅ Cleanup OK')
  }
  return true
}

async function main() {
  // Step 1: Test DB connection
  console.log('=== 0. TESTING DB CONNECTION ===')
  const { data: dbTest, error: dbError } = await supabase.from('ideas').select('id').limit(1)
  if (dbError) {
    console.log(`  ❌ DB connection failed: ${dbError.message}`)
    process.exit(1)
  }
  console.log('  ✅ DB connected, test query OK')

  // Step 2: Test sources
  const totalItems = await testSources()
  if (totalItems === 0) {
    console.log('\n❌ ALL SOURCES RETURNED 0 ITEMS - network issue?')
  }

  // Step 3: Test insert
  const insertOk = await testInsert()
  if (!insertOk) {
    console.log('\n❌ INSERT FAILED - this is likely why discovery returns 0')
    console.log('  Check: source constraint, missing columns, RLS policy')
  }

  console.log('\n=== DONE ===')
}

main()
