
import { BANNED_KEYWORDS } from "./src/lib/sinergy/constants";
import { askGemini } from "./src/lib/ai/gemini";
import dotenv from 'dotenv';
import fs from 'fs';

// Load .env.local
const env = dotenv.parse(fs.readFileSync('.env.local'));
Object.assign(process.env, env);

async function testFilter() {
    console.log("--- Testing Content Filtering ---");

    const testCases = [
        {
            name: "Banned: Webinar",
            text: "Приглашаем на бесплатный вебинар по налогам в 2026 году. Спикер расскажет про изменения в УСН и ПСН.",
            shouldBeBanned: true
        },
        {
            name: "Banned: Small Business Taxes",
            text: "Меры поддержки для малого и среднего бизнеса. Минфин предложил изменения по НДС для общепита на УСН.",
            shouldBeBanned: true
        },
        {
            name: "Allowed: AI Startup",
            text: "Стартап Plurio привлек $3.5 млн на разработку AI-агентов для маркетинга. Сервис автоматизирует рутинные задачи в Google Ads и TikTok.",
            shouldBeBanned: false
        },
        {
            name: "Allowed: Tech Feature",
            text: "Apple Intelligence теперь доступен в iPhone 15 Pro. Новые функции включают суммаризацию уведомлений и умный поиск по фото.",
            shouldBeBanned: false
        }
    ];

    function isContentBanned(text) {
        const lower = text.toLowerCase();
        return BANNED_KEYWORDS.some(kw => lower.includes(kw));
    }

    for (const test of testCases) {
        const isBanned = isContentBanned(test.text);
        console.log(`\nTest Case: ${test.name}`);
        console.log(`Content: ${test.text.substring(0, 50)}...`);
        console.log(`Result: ${isBanned ? "❌ BANNED" : "✅ ALLOWED"}`);

        if (isBanned === test.shouldBeBanned) {
            console.log("Status: PASS");
        } else {
            console.log("Status: FAIL");
        }

        if (!isBanned) {
            console.log("Calling AI for extraction check...");
            const prompt = `
                Действуй как профессиональный ИИ-аналитик стартапов. 
                Найди ПРИКЛАДНЫЕ бизнес-идеи или инструменты.
                СТРОГИЕ ПРАВИЛА: Исключай вебинары, налоги, общие советы.
                Если это полезный сервис/инструмент - верни JSON массив [{title, summary}].
                Если мусор - верни [].
                ТЕКСТ: "${test.text}"
            `;
            try {
                const response = await askGemini(prompt);
                console.log("AI Response:", response.trim());
            } catch (e) {
                console.error("AI Error:", e.message);
            }
        }
    }
}

testFilter();
