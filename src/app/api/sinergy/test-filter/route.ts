import { BANNED_KEYWORDS } from "@/lib/sinergy/constants";
import { askGemini } from "@/lib/ai/gemini";
import { NextResponse } from "next/server";

export async function GET() {
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
        }
    ];

    const results = [];

    function isContentBanned(text: string): boolean {
        const lower = text.toLowerCase();
        return BANNED_KEYWORDS.some(kw => lower.includes(kw));
    }

    for (const test of testCases) {
        const isBanned = isContentBanned(test.text);
        let aiExtracted = null;

        if (!isBanned) {
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
                aiExtracted = response;
            } catch (e: any) {
                aiExtracted = "Error: " + e.message;
            }
        }

        results.push({
            name: test.name,
            text: test.text,
            isBanned,
            shouldBeBanned: test.shouldBeBanned,
            pass: isBanned === test.shouldBeBanned,
            aiExtracted
        });
    }

    return NextResponse.json({ results });
}
