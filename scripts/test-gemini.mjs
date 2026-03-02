
import fs from 'fs';
import path from 'path';

async function testGemini() {
    console.log('--- Listing Available Gemini Models ---');

    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        // ... (env reading logic omitted for brevity as passed via env var) ...
        apiKey = process.argv[2] || process.env.GEMINI_API_KEY;
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
        console.log('✅ Models:', data.models?.map(m => m.name) || []);

    } catch (e) {
        console.error('❌ Network Error:', e.message);
    }
}

testGemini();
