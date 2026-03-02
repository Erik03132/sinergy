---
description: Validates the project (Lint, Typecheck, Build) before pushing to GitHub/Vercel to prevent slow feedback loops.
---

# Pre-Deploy Verification

1. **Clear Cache (Optional but recommended for EPERM issues)**
   - If you encounter `EPERM` errors with `.next` or `node_modules`, run:
   ```bash
   rm -rf .next
   ```

2. **Type Check & Lint + Cron Health**
   - Проверяет TypeScript, ошибки стиля и работоспособность кронов.
   ```bash
   npm run lint && node scripts/check-cron-health.mjs
   ```

3. **Production Build Simulation**
   - Simulates the exact Vercel build process. If this fails, Vercel will fail.
   ```bash
   npm run build
   ```

4. **Git Push (Only if above steps pass)**
   ```bash
   git push
   ```

> **Note:** If `npm run build` fails locally, DO NOT PUSH. Fix the errors first.
