
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function checkDb() {
    console.log('--- Checking DB Ideas Count ---');

    let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        try {
            const envPath = path.resolve('.env.local');
            if (fs.existsSync(envPath)) {
                const envContent = fs.readFileSync(envPath, 'utf-8');

                const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
                if (urlMatch) url = urlMatch[1].trim().replace(/["']/g, '');

                const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
                if (keyMatch) key = keyMatch[1].trim().replace(/["']/g, '');
            }
        } catch (e) {
            console.log('⚠️ Could not read .env.local');
        }
    }

    if (!url || !key) {
        console.error('❌ Missing credentials');
        return;
    }

    const supabase = createClient(url, key);

    const { count, error } = await supabase
        .from('ideas')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('❌ Supabase Error:', error.message);
        return;
    }

    console.log(`✅ Ideas in DB: ${count}`);

    if (count < 2) {
        console.log('⚠️ Not enough ideas for synergy (need at least 2).');
    } else {
        console.log('👍 Minimal count met.');
    }
}

checkDb();
