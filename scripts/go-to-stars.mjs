
import fetch from 'node-fetch';

const GEMINI_API_KEY = 'AIzaSyCZ02Q-WYegeSWdsb70LOLbOaeSrG5hgCM'; // Hardcoded for this script only

async function checkGemini() {
    console.log('\n--- 💎 Checking Google Gemini Models ---');

    if (!GEMINI_API_KEY) {
        console.log('❌ GEMINI_API_KEY not found');
        return;
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.log(`❌ Gemini API Error: ${response.status} ${response.statusText}`);
            const errorText = await response.text();
            console.log(errorText);
            return;
        }

        const data = await response.json();
        console.log('✅ Gemini API Connection: Success!');
        console.log('   Available Models:');
        data.models.forEach(m => {
            // Filter only for generateContent supported models
            if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                console.log(`   - ${m.name.split('/').pop()}`);
            }
        });

    } catch (error) {
        console.log('❌ Gemini Check Failed:', error.message);
    }
}

async function main() {
    console.log('🚀 GO TO STARS: Model Lister 🚀');
    await checkGemini();
    console.log('\n✨ Done ✨');
}

main();
