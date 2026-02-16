# Правила проекта

## Язык
- Общение: **русский**
- Комментарии в коде: русский
- Переменные и функции: английский

## TypeScript
- `catch (error: unknown)` — **НИКОГДА** `any`
- Неиспользуемые параметры: префикс `_` (напр. `_request`)
- Строгий `tsconfig.json` с `strict: true`
- Каждый компонент/модуль имеет типизированные props/interfaces

## Next.js
- Шрифты: **только** через `next/font`, никогда через `<link>` в `<head>`
- Изображения: **только** через `next/image`
- Server Components по умолчанию, `'use client'` только когда необходимо
- Route Handlers: `export async function POST(_request: Request)` если request не используется

## Качество кода
- Перед коммитом: `npm run lint && npm run type-check` (автоматически через Husky)
- Перед деплоем: `npm run pre-deploy` (lint + types + build + test)
- Функции < 20 строк, один уровень ответственности
- Никаких `console.log` в production коде (только `console.error`)

## Git
- Conventional commits: `fix:`, `feat:`, `chore:`, `docs:`
- Ветки: `main` (прод), `dev` (разработка), `feat/xxx` (фичи)

## Деплой
- Vercel подключается к проекту-копии (не к шаблону)
- Все env через `.env.template` + Vercel Dashboard
- CI через GitHub Actions (lint → types → build → test)
