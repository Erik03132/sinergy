---
description: Инициализация нового проекта из шаблона nextjs-starter
---
### Шаг 1: Клонирование шаблона
// turbo
1. На GitHub нажать "Use this template" → создать новый репозиторий
2. `git clone https://github.com/YOUR_USERNAME/NEW_PROJECT_NAME.git`
3. `cd NEW_PROJECT_NAME`

### Шаг 2: Установка зависимостей
// turbo
4. `npm install`

### Шаг 3: Настройка окружения
5. `cp .env.template .env.local`
6. Заполнить переменные в `.env.local` (Supabase URL/Key, AI ключи)

### Шаг 4: Проверка
// turbo
7. `npm run dev` — приложение запускается на localhost:3000
8. `npm run pre-deploy` — lint + types + build + test проходят

### Шаг 5: Импорт в Vercel
9. Vercel → Import Git Repository → выбрать новый репозиторий
10. В Vercel Dashboard → Settings → Environment Variables → вставить env
11. Deploy ✅

### Шаг 6: Стилизация (после удачного деплоя)
12. Выбрать стиль из `STYLE_BANK.md` или создать через Stitch
13. Применить CSS переменные темы в `src/app/globals.css`
