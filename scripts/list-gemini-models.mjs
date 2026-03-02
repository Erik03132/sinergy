
import fs from 'fs';
import path from 'path';

async function listModels() {
    console.log('--- Listing Gemini Models ---');

    let apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        try {
            const envPath = path.resolve('.env.local');
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const match = envContent.match(/GEMINI_API_KEY=(.*)/);
            if (match) {
                apiKey = match[1].trim();
            }
        } catch (e) {
            console.log('⚠️ Could not read .env.local directly');
        }
    }

    if (!apiKey) {
        console.error('❌ KEY MISSING');
        return;
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
            { method: 'GET' }
        );

        if (!response.ok) {
            console.error(`❌ API ERROR: ${response.status} ${response.statusText}`);
            console.log(await response.text());
            return;
        }

        const data = await response.json();
        const models = data.models || [];

        console.log(`✅ Found ${models.length} models:`);
        models.forEach(m => {
            if (m.name.includes('gemini') || m.name.includes('flash')) {
                console.log(`- ${m.name} (${m.displayName})`);
            }
        });

    } catch (e) {
        console.error('❌ Network Error:', e.cause || e.message);
    }
}

listModels();
