
import fs from 'fs';
import path from 'path';

async function testKimi() {
    console.log('--- Testing Kimi API Key ---');

    let apiKey = process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY;

    // Manually read .env.local if not loaded
    if (!apiKey) {
        try {
            const envPath = path.resolve('.env.local');
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const match = envContent.match(/(?:MOONSHOT|KIMI)_API_KEY=(.*)/);
            if (match) {
                apiKey = match[1].trim();
            }
        } catch (e) {
            console.log('⚠️ Could not read .env.local directly');
        }
    }

    if (!apiKey) {
        console.error('❌ KEY MISSING: MOONSHOT_API_KEY not found');
        return;
    }

    // Mask key for safety
    const maskedKey = apiKey.slice(0, 8) + '...' + apiKey.slice(-4);
    console.log(`🔑 Key found: ${maskedKey}`);
    console.log(`📏 Length: ${apiKey.length} (Expected ~51 for standard sk- keys)`);

    try {
        const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "moonshot-v1-8k",
                messages: [
                    { role: "system", content: "You are a test." },
                    { role: "user", content: "Say OK." }
                ],
            })
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

testKimi();
