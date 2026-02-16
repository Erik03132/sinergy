---
description: Проверка перед деплоем на Vercel
---
// turbo-all
1. `npm run lint` — ESLint проверка (0 errors)
2. `npm run type-check` — TypeScript компиляция (0 errors)
3. `npm run build` — Next.js сборка (exit 0)
4. `npm test` — Vitest тесты (все зелёные)
5. Если всё ОК — `git add -A && git commit && git push origin main`
