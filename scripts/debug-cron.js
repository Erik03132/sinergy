
const https = require('https');
const fs = require('fs');

async function run() {
    try {
        const envContent = fs.readFileSync('.env.local', 'utf-8');
        const env = {};
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) env[key.trim()] = value.trim().replace(/['\"]/g, '');
        });

        const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/cron_logs?select=*&order=created_at.desc&limit=5`;
        const options = {
            headers: {
                'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log('--- CRON LOGS ---');
                console.log(data);
                process.exit(0);
            });
        }).on('error', (err) => {
            console.error('Error:', err.message);
            process.exit(1);
        });
    } catch (e) {
        console.error('Script error:', e.message);
        process.exit(1);
    }
}

run();
