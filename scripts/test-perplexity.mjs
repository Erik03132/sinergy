
import fs from 'fs';
import path from 'path';

async function testPerplexity() {
    console.log('--- Testing Perplexity API Key ---');

    let apiKey = process.env.PERPLEXITY_API_KEY;

    // Manually read .env.local if not loaded
    if (!apiKey) {
        try {
            const envPath = path.resolve('.env.local');
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const match = envContent.match(/PERPLEXITY_API_KEY=(.*)/);
            if (match) {
                apiKey = match[1].trim();
            }
        } catch (e) {
            console.log('⚠️ Could not read .env.local directly');
        }
    }

    if (!apiKey) {
        console.error('❌ KEY MISSING: PERPLEXITY_API_KEY not found');
        return;
    }

    // Mask key for safety
    const maskedKey = apiKey.slice(0, 8) + '...' + apiKey.slice(-4);
    console.log(`🔑 Key found: ${maskedKey}`);
    console.log(`📏 Length: ${apiKey.length}`);

    // Check for invisible characters
    if (apiKey.match(/\s/)) {
        console.error('⚠️ WARNING: Key contains whitespace characters!');
    }

    const payload = {
        model: 'sonar-pro',
        messages: [
            { role: "system", content: "Test system prompt." },
            { role: "user", content: "Test user prompt." }
        ]
    };

    console.log('📤 Sending request to sonar-pro...');

    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error(`❌ API ERROR: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.log('Response Body:', text);
            return;
        }

        const data = await response.json();
        console.log('✅ Success! Answer:', data.choices[0].message.content);

    } catch (e) {
        console.error('❌ Network Error:', e.cause || e.message);
    }
}

testPerplexity();
