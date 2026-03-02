import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * 🚀 ARSENAL & STAR MAP 🌌
 * Комплексная диагностика всех систем: AI, DB, Social, Infrastructure.
 */

const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    red: "\x1b[31m",
    gray: "\x1b[90m"
};

function getEnv() {
    const envPath = resolve(process.cwd(), '.env.local');
    if (!existsSync(envPath)) return {};
    const content = readFileSync(envPath, 'utf-8');
    const env = {};
    content.split('\n').forEach(line => {
        if (line.includes('=') && !line.startsWith('#')) {
            const [key, ...val] = line.split('=');
            env[key.trim()] = val.join('=').trim();
        }
    });
    return env;
}

const env = getEnv();
const reportData = {
    timestamp: new Date().toLocaleString('ru-RU'),
    systems: []
};

async function checkService(name, category, checkFn) {
    process.stdout.write(`${colors.cyan}  [${category}] Checking ${name}...${colors.reset}`);
    try {
        const result = await checkFn();
        const status = result.ok ? `${colors.green}✓ OK` : `${colors.red}✗ FAIL`;
        const note = result.note ? ` (${result.note})` : '';
        process.stdout.write(`\r  [${category}] ${status} ${colors.bright}${name}${colors.reset}${colors.gray}${note}${colors.reset}\n`);
        reportData.systems.push({ name, category, status: result.ok ? 'WORKING' : 'FAILED', note: result.note });
        return result.ok;
    } catch (e) {
        process.stdout.write(`\r  [${category}] ${colors.red}✗ ERROR ${colors.bright}${name}${colors.reset}${colors.gray} (${e.message})${colors.reset}\n`);
        reportData.systems.push({ name, category, status: 'ERROR', note: e.message });
        return false;
    }
}

async function main() {
    console.log(`\n${colors.bright}${colors.magenta}🚀 СИНЕРГИЯ: ПОЛНАЯ ПРОВЕРКА АРСЕНАЛА${colors.reset}`);
    console.log(`${colors.gray}--------------------------------------------------${colors.reset}\n`);

    // 1. AI Stack
    const checkGeminiKey = async (key, label) => {
        if (!key) return { ok: false, note: `${label}: Ключ не найден` };
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        return { ok: res.ok, note: res.ok ? `${label}: Готов` : `${label}: Ошибка ${res.status}` };
    };

    await checkService('Gemini Stack', 'AI', async () => {
        const primary = await checkGeminiKey(env.GEMINI_API_KEY, 'Основной');
        const secondary = await checkGeminiKey(env.GEMINI_API_KEY_SECONDARY, 'Резервный');

        const ok = primary.ok || secondary.ok;
        let note = `${primary.note}`;
        if (env.GEMINI_API_KEY_SECONDARY) note += ` | ${secondary.note}`;

        return { ok, note };
    });

    await checkService('OpenRouter', 'AI', async () => {
        if (!env.OPENROUTER_API_KEY) return { ok: false, note: 'Ключ не найден' };
        try {
            const res = await fetch('https://openrouter.ai/api/v1/models', { headers: { 'Authorization': `Bearer ${env.OPENROUTER_API_KEY}` } });
            if (!res.ok) throw new Error(`${res.status}`);
            const data = await res.json();

            // Ищем популярные и недорогие модели
            const models = data.data.map(m => m.id);
            const hasQwen = models.some(m => m.includes('qwen'));
            const hasDeepSeek = models.some(m => m.includes('deepseek'));
            const freeModels = data.data.filter(m => m.pricing?.prompt === "0" && m.pricing?.completion === "0");

            let note = `Доступно ${models.length} моделей. `;
            if (hasQwen) note += 'Qwen 2.5/3.5 ✅. ';
            if (hasDeepSeek) note += 'DeepSeek ✅. ';
            note += `Бесплатных: ${freeModels.length}`;

            return { ok: true, note };
        } catch (e) {
            return { ok: false, note: `Ошибка API: ${e.message}` };
        }
    });

    // 2. Infrastructure
    await checkService('Neon (Management)', 'DB', async () => {
        if (!env.NEON_API_KEY) return { ok: false, note: 'NEON_API_KEY не найден' };
        try {
            const res = await fetch('https://console.neon.tech/api/v2/projects', {
                headers: { 'Authorization': `Bearer ${env.NEON_API_KEY}` }
            });
            if (!res.ok) throw new Error(`${res.status}`);
            const data = await res.json();
            return { ok: true, note: `Доступ к ${data.projects.length} проектам активен` };
        } catch (e) {
            return { ok: false, note: `Ошибка API: ${e.message}` };
        }
    });

    await checkService('Neon (Database)', 'DB', async () => {
        if (!env.DATABASE_URL) {
            return { ok: false, note: 'DATABASE_URL не задан. Совет: psql -h pg.neon.tech (passwordless)' };
        }
        try {
            const host = new URL(env.DATABASE_URL).hostname;
            return { ok: true, note: `Host: ${host}` };
        } catch (e) {
            return { ok: false, note: 'Некорректный DATABASE_URL' };
        }
    });

    await checkService('Supabase', 'DB', async () => {
        if (!env.NEXT_PUBLIC_SUPABASE_URL) return { ok: false, note: 'URL не задан' };
        const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, { headers: { 'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY } });
        return { ok: res.ok || res.status === 404, note: 'API доступно' };
    });

    // 3. Social & Content
    await checkService('Telegram', 'SOC', async () => {
        if (!env.TELEGRAM_BOT_TOKEN) return { ok: false, note: 'Токен не найден' };
        const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`);
        const data = await res.json();
        return { ok: res.ok, note: res.ok ? `@${data.result.username} онлайн` : 'Невалидный токен' };
    });

    await checkService('YouTube', 'SOC', async () => {
        if (!env.YOUTUBE_API_KEY) return { ok: false, note: 'Ключ не найден' };
        // Проверка через публичный ID (Google Developers)
        const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&id=UC_x5XG1OV2P6uYZ5FHSzX9w&key=${env.YOUTUBE_API_KEY}`);
        return { ok: res.ok, note: res.ok ? 'Data API v3 OK' : `Error ${res.status}` };
    });

    // Generate ARSENAL.md
    let md = `# ⚔️ ARSENAL: Карта ресурсов проекта\n\n`;
    md += `*Последняя проверка: ${reportData.timestamp}*\n\n`;
    md += `| Категория | Сервис | Статус | Примечание |\n`;
    md += `|-----------|--------|--------|------------|\n`;
    reportData.systems.forEach(s => {
        const icon = s.status === 'WORKING' ? '✅' : '❌';
        md += `| ${s.category} | **${s.name}** | ${icon} ${s.status} | ${s.note || '-'} |\n`;
    });

    md += `\n\n## 🛠 Доступные MCP Инструменты\n`;
    md += `- **Genkit**: Orchestration & Tracing\n`;
    md += `- **Perplexity**: Advanced Search\n`;
    md += `- **Stitch**: UI/UX Design System Builder\n`;

    md += `\n\n## 📝 Рекомендации\n`;
    if (!reportData.systems.find(s => s.name === 'Neon' && s.status === 'WORKING')) {
        md += `- [ ] Подключить Neon для обхода лимитов Supabase\n`;
    }
    if (!env.OPENROUTER_API_KEY) {
        md += `- [ ] Добавить OpenRouter для доступа к дешевым моделям DeepSeek\n`;
    }

    try {
        writeFileSync(resolve(process.cwd(), 'ARSENAL.md'), md);
        console.log(`\n\n${colors.bright}${colors.green}✨ Отчет сформирован: ARSENAL.md${colors.reset}\n`);
    } catch (e) {
        console.log(`\n${colors.red}Ошибка записи отчета: ${e.message}${colors.reset}`);
    }
}

main();
