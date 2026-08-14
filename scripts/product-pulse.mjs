/**
 * CE-4: Product Pulse — еженедельный отчёт «что реально используют пользователи».
 * Данные: ideas (кол-во, по вертикалям, за неделю), channels, synergy.
 *
 * Использование:
 *   node scripts/product-pulse.mjs               # неделя
 *   node scripts/product-pulse.mjs --days 30     # 30 дней
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv() {
    let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    for (const envPath of ['.env.local', '.env.production', '.env']) {
        if (url && key) break;
        if (!fs.existsSync(envPath)) continue;
        const content = fs.readFileSync(envPath, 'utf-8');
        if (!url) {
            const m = content.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
            if (m) url = m[1].trim().replace(/["']/g, '');
        }
        if (!key) {
            const m = content.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
            if (m) key = m[1].trim().replace(/["']/g, '');
        }
    }
    return { url, key };
}

async function productPulse(days = 7) {
    const { url, key } = loadEnv();
    if (!url || !key) {
        console.error('❌ Missing Supabase credentials');
        return;
    }
    const supabase = createClient(url, key);
    const since = new Date(Date.now() - days * 86400_000).toISOString();

    console.log(`\n=== PRODUCT PULSE — последние ${days} дней ===\n`);

    // 1. Всего идей
    const { count: totalIdeas } = await supabase
        .from('ideas').select('*', { count: 'exact', head: true });
    console.log(`📈 Идей всего: ${totalIdeas ?? 0}`);

    // 2. Новые идеи за период
    const { count: newIdeas } = await supabase
        .from('ideas').select('*', { count: 'exact', head: true })
        .gte('created_at', since);
    console.log(`🆕 Новых идей за ${days}д: ${newIdeas ?? 0}`);

    // 3. По вертикалям
    const { data: byVertical } = await supabase
        .from('ideas').select('vertical');
    if (byVertical && byVertical.length > 0) {
        const counts = {};
        for (const i of byVertical) {
            const v = i.vertical || 'General';
            counts[v] = (counts[v] || 0) + 1;
        }
        console.log('\n🏷 Вертикали:');
        for (const [v, c] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
            console.log(`   ${v}: ${c}`);
        }
    }

    // 4. Синергии
    const { count: synergies } = await supabase
        .from('synergies').select('*', { count: 'exact', head: true });
    console.log(`\n🔗 Синергий сгенерировано: ${synergies ?? 0}`);

    // 5. Идеи с анализом (metadata.analysis) — «прошли вердикт»
    const { data: withAnalysis } = await supabase
        .from('ideas').select('metadata').not('metadata', 'is', null);
    const analyzed = (withAnalysis || []).filter(i => i.metadata?.analysis).length;
    console.log(`🧠 Идей с анализом (вердикт): ${analyzed}/${totalIdeas ?? 0} ` +
        `(${totalIdeas ? Math.round(analyzed / totalIdeas * 100) : 0}%)`);

    // 6. Избранные
    const { count: favorites } = await supabase
        .from('ideas').select('*', { count: 'exact', head: true })
        .eq('is_favorite', true);
    console.log(`⭐ Избранных: ${favorites ?? 0}`);

    console.log('\n=== PULSE OK ===\n');
}

const daysArg = process.argv.indexOf('--days');
const days = daysArg > -1 ? parseInt(process.argv[daysArg + 1], 10) : 7;
productPulse(days);
