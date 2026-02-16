# nextjs-starter

Универсальный шаблон Next.js для быстрого старта проектов.

## Что включено

- **Next.js 15** + TypeScript + App Router
- **Supabase** — auth, база данных, middleware
- **AI** — Perplexity (Sonar Pro), Gemini
- **Email** — Resend
- **Линтинг** — ESLint (strict: `no-any`, `no-unused-vars`), Prettier
- **Husky** — pre-commit проверка кода
- **CI/CD** — GitHub Actions (lint → types → build → test)
- **Vitest** — тестирование
- **STYLE_BANK** — каталог готовых тем
- **CLAUDE.md** — правила для AI агента

## Быстрый старт

```bash
# 1. На GitHub: Use this template → создать новый репозиторий
# 2. Клонировать
git clone https://github.com/YOUR_USER/YOUR_PROJECT.git
cd YOUR_PROJECT

# 3. Установить зависимости
npm install

# 4. Настроить окружение
cp .env.template .env.local
# Заполнить переменные в .env.local

# 5. Запустить
npm run dev
```

## Скрипты

| Команда | Что делает |
|---------|------------|
| `npm run dev` | Dev-сервер + проверка env |
| `npm run build` | Production сборка |
| `npm run lint` | ESLint проверка |
| `npm run type-check` | TypeScript компиляция |
| `npm test` | Vitest тесты |
| `npm run pre-deploy` | Полная проверка перед деплоем |

## Деплой на Vercel

1. Vercel → Import Git Repository
2. Settings → Environment Variables → добавить из `.env.template`
3. Deploy ✅

## Стилизация

После успешного деплоя выберите стиль из `STYLE_BANK.md` или создайте свой через Stitch MCP.
