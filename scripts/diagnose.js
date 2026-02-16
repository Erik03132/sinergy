
const fs = require('fs');
const path = require('path');

async function diagnose() {
    console.log('🔍 Starting Diagnostic...');

    // 1. Check .env.local
    let envContent = '';
    try {
        const envPath = path.resolve('.env.local');
        if (fs.existsSync(envPath)) {
            console.log('✅ .env.local found');
            envContent = fs.readFileSync(envPath, 'utf-8');
        } else {
            console.error('❌ .env.local NOT found in ' + process.cwd());
            return;
        }
    } catch (e) {
        console.error('❌ Error reading .env.local:', e.message);
        return;
    }

    // 2. Parse Env
    const env = {};
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            env[key] = value;
        }
    });

    // 3. Validate specific keys
    const supUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
    const pplxKey = env['PERPLEXITY_API_KEY'];

    console.log('\n--- Environment Check ---');

    if (supUrl) {
        console.log(`✅ Supabase URL found: ${supUrl}`);
        if (!supUrl.startsWith('https://')) {
            console.error('⚠️ Supabase URL does not start with https://');
        }
    } else {
        console.error('❌ NEXT_PUBLIC_SUPABASE_URL is missing');
    }

    if (pplxKey) {
        console.log(`✅ Perplexity Key found: ${pplxKey.slice(0, 5)}...`);
    } else {
        console.error('❌ PERPLEXITY_API_KEY is missing');
    }

    // 4. Network Check
    console.log('\n--- Network Check ---');

    if (supUrl) {
        try {
            console.log(`Testing connection to Supabase (${supUrl})...`);
            const res = await fetch(supUrl);
            console.log(`✅ Supabase Connect: ${res.status} ${res.statusText}`);
        } catch (e) {
            console.error(`❌ Supabase Connect Failed:`, e.message);
            if (e.cause) console.error('   Cause:', e.cause);
        }
    }

    try {
        console.log(`Testing connection to Perplexity API...`);
        const res = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${pplxKey || 'test'}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'sonar-pro',
                messages: [{ role: 'user', content: 'Ping' }]
            })
        });

        if (res.ok) {
            console.log(`✅ Perplexity API: Success (200 OK)`);
        } else {
            console.log(`❌ Perplexity API Error: ${res.status} ${res.statusText}`);
            // 401 is expected if key is wrong, but confirms network works
        }
    } catch (e) {
        console.error(`❌ Perplexity Connect Failed:`, e.message);
        if (e.cause) console.error('   Cause:', e.cause);
    }
}

diagnose();
