/**
 * Проверка переменных окружения при запуске dev-сервера
 * Предупреждает о пропущенных переменных из .env.template
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const templatePath = resolve(process.cwd(), '.env.template')
const localPath = resolve(process.cwd(), '.env.local')

if (!existsSync(localPath)) {
    console.error('\n⚠️  Файл .env.local не найден!')
    console.error('   Скопируйте шаблон: cp .env.template .env.local')
    console.error('   Заполните переменные и запустите снова.\n')
    process.exit(1)
}

const template = readFileSync(templatePath, 'utf-8')
const local = readFileSync(localPath, 'utf-8')

const requiredVars = template
    .split('\n')
    .filter((line) => line.includes('=') && !line.startsWith('#'))
    .map((line) => line.split('=')[0].trim())

const localVars = new Set(
    local
        .split('\n')
        .filter((line) => line.includes('=') && !line.startsWith('#'))
        .map((line) => line.split('=')[0].trim())
)

const missing = requiredVars.filter((v) => !localVars.has(v))

if (missing.length > 0) {
    console.warn('\n⚠️  Пропущенные переменные в .env.local:')
    missing.forEach((v) => console.warn(`   - ${v}`))
    console.warn('   Заполните их для корректной работы.\n')
}
