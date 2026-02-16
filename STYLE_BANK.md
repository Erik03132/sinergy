# STYLE_BANK — Библиотека стилей

Каталог готовых тем для быстрого применения к проекту.
Стиль применяется **после первого удачного деплоя**.

---

## Как использовать

1. Выберите стиль ниже
2. Скопируйте CSS переменные в `src/app/globals.css`
3. Или создайте свой дизайн через Stitch MCP

---

## 1. Obsidian Dark

Тёмный премиальный стиль с glassmorphism.

```css
:root {
  --background: #0a0a0f;
  --foreground: #e0e0e0;
  --primary: #ff8a00;
  --primary-hover: #ff9a20;
  --card-bg: rgba(255, 255, 255, 0.05);
  --card-border: rgba(255, 255, 255, 0.08);
  --muted: #6b7280;
}
```

---

## 2. Clean Light

Минималистичный светлый стиль.

```css
:root {
  --background: #ffffff;
  --foreground: #111827;
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --card-bg: #f9fafb;
  --card-border: #e5e7eb;
  --muted: #9ca3af;
}
```

---

## 3. Neon Cyber

Яркий киберпанк с неоновыми акцентами.

```css
:root {
  --background: #0d0d0d;
  --foreground: #00ff88;
  --primary: #00ff88;
  --primary-hover: #00cc6a;
  --card-bg: rgba(0, 255, 136, 0.05);
  --card-border: rgba(0, 255, 136, 0.15);
  --muted: #4a5568;
}
```

---

## 4. Ocean Calm

Спокойные голубые тона.

```css
:root {
  --background: #f0f9ff;
  --foreground: #0c4a6e;
  --primary: #0ea5e9;
  --primary-hover: #0284c7;
  --card-bg: #e0f2fe;
  --card-border: #bae6fd;
  --muted: #64748b;
}
```

---

## 5. Sunset Warm

Тёплые тона заката.

```css
:root {
  --background: #fffbeb;
  --foreground: #78350f;
  --primary: #f59e0b;
  --primary-hover: #d97706;
  --card-bg: #fef3c7;
  --card-border: #fcd34d;
  --muted: #92400e;
}
```

---

## Добавление нового стиля

Скопируйте шаблон ниже и добавьте в конец файла:

```markdown
## N. Название стиля

Описание.

\`\`\`css
:root {
  --background: ;
  --foreground: ;
  --primary: ;
  --primary-hover: ;
  --card-bg: ;
  --card-border: ;
  --muted: ;
}
\`\`\`
```
