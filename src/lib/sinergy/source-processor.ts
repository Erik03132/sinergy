
import { createClient } from "../supabase/server";
import { askGemini } from "../ai/gemini";
import { translateBatch } from "../ai/translate";
import { extractTelegramInfo, getRecentTelegramPosts } from "./telegram";
import * as cheerio from 'cheerio';
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
function shortHash(input: string, length: number = 8): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, length);
}

export async function registerSource(details: any, type: 'telegram' | 'web') {
    const supabase = await createClient();

    // Быстрый фильтр (Уже парсили этот URL?)
    if (details.url) {
        const { data: urlCheck } = await supabase
            .from('ideas')
            .select('id')
            .eq('original_url', details.url)
            .limit(1);

        if (urlCheck && urlCheck.length > 0) {
            console.log(`[Processor] URL already processed, skipping: ${details.url}`);
            return;
        }
    }

    // AI Analysis - Многошаговый "фильтр идей" (Семантический подход)
    const content = details.text || details.title || "";

    // 1. Быстрый фильтр (Анти-шум по ключевым словам)
    if (isContentBanned(content)) {
        console.log(`[Processor] Source text is BANNED, skipping AI call for: ${details.url.substring(0, 30)}...`);
        return;
    }

    // 2. Семантический классификатор и извлечение "Якорей" (Target Audience, Pain Point, Solution, Monetization)
    const prompt = `
        Действуй как семантический классификатор и аналитик стартап-идей. 
        Твоя задача — проанализировать текст и извлечь структурированные данные о стартапах/продуктах.
        
        КРИТЕРИИ "НАСТОЯЩЕЙ ИДЕИ / СТАРТАПА":
        Документ является стартапом/идеей, только если четко прослеживаются минимум 2-3 якоря:
        - Аудитория (кто платит / кто использует).
        - Боль/Проблема (с чем борются: экономия времени, рост конверсии).
        - Решение (SaaS, платформа, приложение, маркетплейс).
        - Монетизация (B2B, подписка, комиссия).
        
        Если в тексте просто "новости", "советы по жизни", "анонс обновления" — это НЕ ИДЕЯ.
        
        ОБЯЗАТЕЛЬНО: Если в переданном тексте упоминается несколько разных независимых стартапов или бизнес-идей (например, это подборка "Топ-5 идей" или "10 лучших стартапов"), ТЫ ДОЛЖЕН создать отдельный JSON-объект для КАЖДОЙ идеи в массиве. Не объединяй их в один общий пост.
        
        ВЫХОДНОЙ ФОРМАТ СТРОГО JSON (МАССИВ ОБЪЕКТОВ):
        [
          {
            "title": "Название стартапа / Краткая суть идеи",
            "summary": "Подробное описание решения и ценности (3-5 предложений)",
            "target_audience": "Кто целевая аудитория (например: малый B2B, маркетологи)",
            "pain_point": "Какую конкретно проблему решает",
            "business_model": "Модель монетизации (SaaS, Marketplace, Subscription, API, Ads)",
            "core_tech": "Ключевая технология (AI, Blockchain, No-code и т.д.)",
            "score": <число от 0 до 10, где 10 - идеальный стартап, 0 - просто статья/новость/вода>
          }
        ]
        
        Если текст — полная "вода" (анонс стрима, законы РФ, мотивация), возвращай [].
        ВСЕ ТЕКСТЫ В JSON ДОЛЖНЫ БЫТЬ НА РУССКОМ ЯЗЫКЕ.
        
        ТЕКСТ ДЛЯ АНАЛИЗА:
        """\${content.substring(0, 10000)}"""
    `;

    let extractedIdeas: any[] = [];
    try {
        const raw = await askGemini(prompt);
        console.log(`[Processor] Raw AI Response for ${details.url.substring(0, 30)}...:`, raw.substring(0, 200));

        // Очистка от markdown блоков и лишнего текста
        const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = clean.match(/\\[[\\s\\S]*\\]/);
        extractedIdeas = JSON.parse(jsonMatch ? jsonMatch[0] : (clean || "[]"));

        // 3. Фильтрация "score" (Семантический ранжировщик) и финальный санитарный чек
        extractedIdeas = extractedIdeas.filter((idea: any) => {
            const textToCheck = `${idea.title} ${idea.summary}`.toLowerCase();
            const badKeyword = isContentBanned(textToCheck);
            const scoreOk = typeof idea.score === 'number' && idea.score >= 6; // Порог идеевости

            if (!scoreOk) console.log(`[Filter] Rejected due to low semantics score (${idea.score}): ${idea.title}`);
            if (badKeyword) console.log(`[Filter] Rejected by keyword constraint: ${idea.title}`);

            return !badKeyword && scoreOk;
        });

        console.log(`[Processor] Extracted ${extractedIdeas.length} ideas after semantic filtering.`);
    } catch (e: any) {
        console.warn("[Processor] AI extraction failed or returned empty:", e.message);
        extractedIdeas = [];
    }

    if (!Array.isArray(extractedIdeas)) extractedIdeas = [extractedIdeas];

    // Гарантированный перевод: если Gemini вернул английский — переводим
    if (extractedIdeas.length > 0) {
      try {
        const toTranslate = extractedIdeas.map((idea: any) => ({
          title: idea.title,
          description: idea.summary || idea.title,
        }))
        const translated = await translateBatch(toTranslate)
        for (let idx = 0; idx < extractedIdeas.length; idx++) {
          if (translated[idx]?.title) extractedIdeas[idx].title = translated[idx].title
          if (translated[idx]?.description) extractedIdeas[idx].summary = translated[idx].description
        }
        console.log(`[Processor] Translated ${extractedIdeas.length} ideas to Russian`)
      } catch (e: any) {
        console.warn(`[Processor] Translation failed, using originals: ${e.message}`)
      }
    }

    for (const idea of extractedIdeas) {
        if (!idea.title || !idea.summary) continue;

        // Создаем уникальный ID 
        const ideaHash = shortHash(idea.title, 8);
        const externalId = type === 'telegram' ?
            `${details.channelHandle}_${details.id}_${ideaHash}` :
            `${shortHash(details.url, 15)}_${ideaHash}`;

        // Проверка на дубликаты
        const { data: existing } = await supabase
            .from('ideas')
            .select('id')
            .eq('title', idea.title.trim())
            .limit(1);

        if (existing && existing.length > 0) {
            console.log(`[Processor] Idea already exists: ${idea.title}`);
            continue;
        }

        const insertData = {
            source: 'automatic',
            title: idea.title,
            description: idea.summary,
            vertical: idea.vertical || 'Новости',
            original_url: details.url,
            is_synergy: false,
            core_tech: idea.core_tech ? [idea.core_tech] : [],
            target_audience: idea.target_audience || 'Общая',
            business_model: idea.business_model || 'Стартап',
            pain_point: idea.pain_point ? [idea.pain_point] : [],
            temporal_marker: new Date().toISOString().split('T')[0],
            metadata: {
                external_id: externalId,
                type: type,
                author: details.channelTitle || details.channelHandle || 'Веб-источник',
                thumbnail: details.imageUrl || null,
                is_extracted: true,
                scanned_at: new Date().toISOString(),
                is_auto: true,
                semantic_score: idea.score
            }
        };

        const { error } = await supabase.from('ideas').insert(insertData);
        if (!error) console.log(`[Processor] Saved Concept: ${idea.title} (Score: ${idea.score})`);
        else console.error("[Processor] Saving error:", error.message);
    }
}

export async function extractAndSaveBatch(
  items: { title: string; description: string; url: string; sourceName: string }[]
): Promise<number> {
  let saved = 0
  for (const item of items) {
    try {
      await registerSource({
        id: shortHash(item.url, 20),
        title: item.title,
        text: item.description || item.title,
        url: item.url,
        channelHandle: item.sourceName,
        channelTitle: item.title,
      }, 'web')
      saved++
    } catch (e: any) {
      console.error(`[extractAndSaveBatch] Failed for "${item.title.slice(0,50)}": ${e.message}`)
    }
  }
  return saved
}

export async function processManualUrl(url: string, query?: string) {
    if (!url) return;

    // 1. Telegram Case
    const tgInfo = extractTelegramInfo(url);
    if (tgInfo && !tgInfo.messageId) {
        console.log(`[Processor] Handling Telegram: ${url} (Query: ${query || 'None'})`);
        const posts = await getRecentTelegramPosts(tgInfo.handle, 5, query);
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
            const $ = cheerio.load(html);

            $('script, style, nav, footer, header').remove();
            const pageTitle = $('title').text().trim() || url;
            const bodyContent = $('body').text().replace(/\s+/g, ' ').substring(0, 8000);

            const sourceDetails = {
                id: shortHash(url, 20),
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
