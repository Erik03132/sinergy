
import fs from 'fs';
import path from 'path';

async function testSynergyPrompt() {
    console.log('--- Testing Synergy Prompt with Gemini 2.0 Flash (Fetch) ---');

    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.log('❌ GEMINI_API_KEY not provided in env');
        return;
    }

    const synthesisPrompt = `
        You are a creative product manager. I found a potential synergy between two ideas.

        Idea A: Smart Garden (IoT sensors for plants, auto-watering)
        Idea B: Cooking Master Class (Video subscription for advanced cooking)

        Task:
        1. Create a "Logic Chain" explaining why they fit together (in Russian).
        2. Formulate a "Product Hypothesis" - a concrete new product idea (in Russian).

        Return JSON:
        {
            "logic_chain": "...",
            "hypothesis": "..."
        }
        OUTPUT IN RUSSIAN LANGUAGE ONLY.
    `;

    try {
        console.log('📤 Sending prompt...');

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: synthesisPrompt }] }],
                }),
            }
        );

        if (!response.ok) {
            console.error(`❌ API ERROR: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.log('Response Body:', text);
            return;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        console.log('✅ Response received:');
        console.log(text);

        if (text) {
            // Basic JSON validation
            const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            JSON.parse(cleanJson);
            console.log('✅ Valid JSON');
        } else {
            console.log('⚠️ No text in response');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testSynergyPrompt();
