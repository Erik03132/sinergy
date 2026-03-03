import { getRecentTelegramPosts } from './src/lib/sinergy/telegram.js';

async function main() {
    const posts = await getRecentTelegramPosts('bugfeature');
    console.log(JSON.stringify(posts, null, 2));
}

main().catch(console.error);
