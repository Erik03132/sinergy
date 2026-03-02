
// Removed firebase admin
// const { initializeApp, cert } = require('firebase-admin/app');
// const { getFirestore } = require('firebase-admin/firestore');
const cheerio = require('cheerio');
const fetch = require('node-fetch');

// Hardcode a check for a known public channel to test scraping logic INDEPENDENT of Firebase
async function testTelegramScraping(handle) {
    console.log(`\n--- Testing Telegram Scraping for @${handle} ---`);
    const url = `https://t.me/s/${handle}`;
    try {
        console.log(`Fetching ${url}...`);
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            console.error(`Failed to fetch: ${response.status} ${response.statusText}`);
            return;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const posts = $('.tgme_widget_message_wrap');
        console.log(`Found ${posts.length} post elements.`);

        if (posts.length > 0) {
            const lastPost = posts.last();
            const text = lastPost.find('.tgme_widget_message_text').text().trim().substring(0, 50);
            const time = lastPost.find('time').attr('datetime');
            console.log(`Latest Post: "${text}..." at ${time}`);
        } else {
            console.log("No posts found via selectors. HTML structure might have changed.");
            console.log("HTML Preview:", html.substring(0, 500));
        }
    } catch (e) {
        console.error("Scraping Error:", e);
    }
}

// Check what is actually in the DB
async function checkDbChannels() {
    // We can't easily init firebase-admin without a cert file in this environment usually,
    // but the user might have credentials set up or we can skip this if we can't.
    // However, the SCRAPING test above is the most critical to verify "why no news".
    // If we can't scrape, DB doesn't matter.
    console.log("Skipping DB check for now to focus on scraping logic verification.");
}

async function main() {
    await testTelegramScraping('vibecoding_tg'); // Use a known active channel
    await testTelegramScraping('bugfeature');
}

main();
