
import { createClient } from "../supabase/server";
import { askGemini } from "../ai/gemini";
import { extractTelegramInfo, getRecentTelegramPosts } from "./telegram";
import { BANNED_KEYWORDS } from "./constants";

export async function registerChannel(details: { title: string; url: string; sourceType: 'telegram' | 'web' }) {
    const supabase = await createClient();
    try {
        await supabase.from('channels').upsert({
            title: details.title,
            url: details.url,
            source_type: details.sourceType,
            last_scanned_at: new Date().toISOString()
        }, { onConflict: 'url' });
    } catch (e: any) {
        console.warn("[Register Channel] Failed:", e.message);
    }
}


export function isContentBanned(text: string): boolean {
    const lower = text.toLowerCase();
    const trigger = BANNED_KEYWORDS.find(kw => lower.includes(kw));
    if (trigger) {
        console.log(`[BANNED] Triggered by "${trigger}" in text: ${text.substring(0, 50)}...`);
        return true;
    }
    return false;
}

/**
 * Атомарное извлечение идей. 
 * Из одного источника (статьи/поста) теперь может быть создано НЕСКОЛЬКО карточек.
 */
async function registerSource(details: any, type: 'telegram' | 'web') {
    const supabase = await createClient();

    // AI Analysis - Агрессивный поиск МНОЖЕСТВА идей внутри текста
    const content = details.text || details.title || "";

    // Пре-фильтрация (экономим токены, если там явно мусор)
    if (isContentBanned(content)) {
        console.log(`[Processor] Source text is BANNED, skipping AI call for: ${details.url.substring(0, 30)}...`);
        return;
    }

    const prompt = `
        Действуй как профессиональный ИИ-аналитик стартапов и венчурный скаут. 
        Твоя задача: найти ПРИКЛАДНЫЕ бизнес-идеи, конкретные стартапы или новые инструменты.
        
        СТРОГИЕ ПРАВИЛА ФИЛЬТРАЦИИ (ЕСЛИ ЭТО ЕСТЬ — ВЕРНИ ПУСТОЙ МАССИВ []):
        1. ЗАПРЕЩЕНО (ИСКЛЮЧАЙ СРАЗУ, ЭТО "МУСОР"): 
           - Новости законодательства, налоги, изменения в УК/КоАП, маркировка товаров.
           - Меры господдержки (гранты, субсидии, льготы Минфина, выплаты, центры "Мой Бизнес").
           - "Малый бизнес", "МСП" в контексте стандартных новостей РФ или госпомощи.
           - Анонсы вебинаров, конференций, стримов, встреч, воркшопов, бизнес-завтраков.
           - Общие советы по бизнесу (как нанимать, как мотивировать, психология, лидерство).
           - Статьи-мнения о рынке вообще («Что будет с рынком в 2026 году»).
           - Обзоры новостей за неделю/день без фокуса на конкретном IT-продукте.
 
        2. ЧТО МЫ ИЩЕМ (ТОЛЬКО ЭТО РАЗРЕШЕНО):
           - Конкретные IT-продукты, полезные SaaS, мобильные приложения, AI-инструменты.
           - Описание НОВОГО способа заработать или кейс автоматизации с бюджетом <$100k.
           - AI-агенты, утилиты для разработчиков, плагины, расширения.
           - Новые фичи в технологических гигантах, влияющие на рынок инструментов.
        
        3. ТОЛЬКО КОНКРЕТИКА: 
           - Название (Title) должно быть названием продукта или конкретным кейсом. 
           - Описание (Summary) должно отвечать на вопрос: "Как это использовать для бизнеса или заработка?".
        
        ЕСЛИ ТЕКСТ СОДЕРЖИТ ВЕБИНАР, НОВОСТИ ЗАКОНОВ ИЛИ ГОСПОДДЕРЖКУ — ВЕРНИ ПУСТОЙ МАССИВ []. 
        ЛУЧШЕ НИЧЕГО НЕ ВЕРНУТЬ, ЧЕМ ВЕРНУТЬ "ВОДУ".
        
        ТЕКСТ:
        """${content.substring(0, 8000)}"""
    `;

    let extractedIdeas: any[] = [];
    try {
        const raw = await askGemini(prompt);
        console.log(`[Processor] Raw AI Response for ${details.url.substring(0, 30)}...:`, raw.substring(0, 200));

        // Очистка от markdown блоков и лишнего текста
        const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = clean.match(/\[[\s\S]*\]/);
        extractedIdeas = JSON.parse(jsonMatch ? jsonMatch[0] : (clean || "[]"));

        // Дополнительная фильтрация после AI на случай если он проигнорировал системные инструкции
        extractedIdeas = extractedIdeas.filter(idea => {
            const textToCheck = `${idea.title} ${idea.summary}`.toLowerCase();
            return !isContentBanned(textToCheck);
        });

        console.log(`[Processor] Extracted ${extractedIdeas.length} ideas after filtering.`);
    } catch (e: any) {
        console.warn("[Processor] AI extraction failed or returned empty:", e.message);
        extractedIdeas = [];
    }

    if (!Array.isArray(extractedIdeas)) extractedIdeas = [extractedIdeas];

    for (const idea of extractedIdeas) {
        if (!idea.title || !idea.summary) continue;

        // Создаем уникальный ID для каждой идеи внутри одного URL (на основе заголовка)
        const ideaHash = Buffer.from(idea.title).toString('base64').substring(0, 8);
        const externalId = type === 'telegram' ?
            `${details.channelHandle}_${details.id}_${ideaHash}` :
            `${Buffer.from(details.url).toString('base64').substring(0, 15)}_${ideaHash}`;

        // Проверка на дубликаты именно по заголовку в базе
        const { data: existing } = await supabase
            .from('ideas')
            .select('id')
            .eq('title', idea.title)
            .maybeSingle();

        if (existing) {
            console.log(`[Processor] Idea already exists: ${idea.title}`);
            continue;
        }

        const insertData = {
            source: 'automatic',
            title: idea.title,
            description: idea.summary,
            vertical: 'News',
            original_url: details.url,
            is_synergy: false,
            core_tech: [],
            target_audience: 'General',
            business_model: 'Startup',
            pain_point: [],
            temporal_marker: new Date().toISOString().split('T')[0],
            metadata: {
                external_id: externalId,
                type: type,
                author: details.channelTitle || details.channelHandle || 'Web Source',
                thumbnail: details.imageUrl || null,
                is_extracted: true,
                scanned_at: new Date().toISOString(),
                is_auto: true
            }
        };


        const { error } = await supabase.from('ideas').insert(insertData);
        if (!error) console.log(`[Processor] Extracted & Saved: ${idea.title}`);
    }
}

export async function processManualUrl(url: string) {
    if (!url) return;

    // 1. Telegram Case
    const tgInfo = extractTelegramInfo(url);
    if (tgInfo && !tgInfo.messageId) {
        console.log(`[Processor] Handling Telegram: ${url}`);
        const posts = await getRecentTelegramPosts(tgInfo.handle, 5);
        if (posts.length > 0) {
            for (const p of posts) await registerSource(p, 'telegram');
            await registerChannel({ title: tgInfo.handle, url, sourceType: 'telegram' });
            return;
        }
    }

    // 2. Generic Web Case
    if (url.startsWith('http')) {
        console.log(`[Processor] Scoping Web Site: ${url}`);
        try {
            const response = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
            });
            if (!response.ok) return;

            const html = await response.text();
            const cheerio = await import('cheerio') as any;
            const $ = cheerio.load(html);

            $('script, style, nav, footer, header').remove();
            const pageTitle = $('title').text().trim() || url;
            const bodyContent = $('body').text().replace(/\s+/g, ' ').substring(0, 8000);

            const sourceDetails = {
                id: Buffer.from(url).toString('base64').substring(0, 20),
                title: pageTitle,
                text: `URL info: ${url}\n\nContent: ${bodyContent}`,
                url: url,
                channelHandle: new URL(url).hostname,
                channelTitle: pageTitle
            };

            await registerSource(sourceDetails, 'web');
            await registerChannel({ title: new URL(url).hostname, url, sourceType: 'web' });

        } catch (e: any) {
            console.error(`[WebScraper] Failed ${url}:`, e.message);
        }
    }
}
