
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Загрузка переменных окружения
if (fs.existsSync('.env.local')) {
    const env = fs.readFileSync('.env.local', 'utf-8');
    env.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) process.env[key.trim()] = value.trim().replace(/['\"]/g, '');
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Ошибка: Отсутствуют ключи Supabase в окружении.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHealth() {
    console.log('🔍 Проверка здоровья крон-задач...');

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: logs, error } = await supabase
        .from('cron_logs')
        .select('*')
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false });

    if (error) {
        if (error.message.includes('relation "cron_logs" does not exist')) {
            console.warn('⚠️  Таблица "cron_logs" еще не создана. Пожалуйста, выполните SQL-скрипт из README.');
            process.exit(0); // Считаем "ок", если система еще не внедрена полностью
        }
        console.error('❌ Ошибка при запросе логов:', error.message);
        process.exit(1);
    }

    if (!logs || logs.length === 0) {
        console.warn('⚠️  Внимание: За последние 24 часа не зафиксировано ни одного запуска крона.');
        // Можно оставить предупреждением или ошибкой
        process.exit(0);
    }

    const dailyFeedLogs = logs.filter(l => l.name === 'daily-feed');
    const lastRun = dailyFeedLogs[0];

    if (!lastRun) {
        console.error('❌ Ошибка: Крон "daily-feed" не запускался за последние сутки!');
        process.exit(1);
    }

    if (lastRun.status === 'error') {
        console.error(`❌ Ошибка: Последний запуск крона завершился неудачей: ${lastRun.message}`);
        process.exit(1);
    }

    console.log(`✅ Крон "daily-feed" работает исправно. Последний запуск: ${new Date(lastRun.created_at).toLocaleString('ru-RU')}`);
    process.exit(0);
}

checkHealth().catch(err => {
    console.error('💥 Критическая ошибка скрипта:', err);
    process.exit(1);
});
