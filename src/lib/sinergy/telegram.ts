
import * as cheerio from 'cheerio';

export interface TelegramPostDetails {
    id: string;
    channelTitle: string;
    channelHandle: string;
    text: string;
    publishedAt: string;
    url: string;
    imageUrl?: string;
}

export function extractTelegramInfo(url: string): { handle: string; messageId?: string } | null {
    if (url.startsWith("@")) return { handle: url.substring(1) };
    const regex = /t\.me\/(s\/)?([a-zA-Z0-9_]{5,})(\/(\d+))?/;
    const match = url.match(regex);
    if (match) {
        return {
            handle: match[2],
            messageId: match[4] || undefined
        };
    }
    return null;
}

export async function getRecentTelegramPosts(handle: string, limit: number = 10): Promise<TelegramPostDetails[]> {
    const url = `https://t.me/s/${handle}`;
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });
        if (!response.ok) throw new Error(`Telegram failed: ${response.statusText}`);
        const html = await response.text();
        const $ = cheerio.load(html);
        const posts: TelegramPostDetails[] = [];
        const channelTitle = $('.tgme_channel_info_header_title').text().trim() || handle;

        $('.tgme_widget_message_wrap').slice(-limit).each((_, element) => {
            const $post = $(element);

            // Avoid service messages
            if ($post.find('.tgme_widget_message_service').length > 0) return;

            const messageId = $post.find('.tgme_widget_message').attr('data-post')?.split('/')[1] || '';
            if (!messageId) return;

            const $textContainer = $post.find('.tgme_widget_message_text.js-message_text');
            if ($textContainer.length === 0) return; // Skip media-only or empty posts

            const text = $textContainer.text().trim();
            if (text.length < 20) return; // Skip too short messages

            const date = $post.find('time').attr('datetime') || new Date().toISOString();
            const postUrl = `https://t.me/${handle}/${messageId}`;
            const photoEl = $post.find('.tgme_widget_message_photo_wrap');
            let imageUrl: string | undefined = photoEl.attr('style')?.match(/url\(['"]?([^'"]+)['"]?\)/)?.[1];

            posts.push({ id: messageId, channelTitle, channelHandle: handle, text, publishedAt: date, url: postUrl, imageUrl });
        });

        console.log(`[Telegram] Scraped ${posts.length} posts from @${handle}`);
        return posts.reverse();
    } catch (e) {
        console.error(`[Telegram] Error scraping @${handle}:`, e);
        return [];
    }
}

