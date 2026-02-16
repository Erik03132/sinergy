/**
 * 🛡️ Dependency Safety Check
 * 
 * This script scans your source code for imports and verifies they exist in package.json.
 * It's a "Safety Net" to prevent Vercel build failures due to missing libraries.
 * 
 * Usage: node scripts/check-dependencies.mjs
 */

import fs from 'fs';
import path from 'path';

const SRC_DIR = './src';
const PACKAGE_JSON = './package.json';

// 1. Read package.json
console.log('🔍 Reading package.json...');
if (!fs.existsSync(PACKAGE_JSON)) {
    console.error('❌ package.json not found!');
    process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
const dependencies = new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
    // Standard Node.js built-ins to ignore
    'fs', 'path', 'crypto', 'util', 'events', 'http', 'https', 'net', 'os', 'child_process'
]);

// 2. Scan files for imports
const imports = new Set();

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            scanDir(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');

            // Strip comments to avoid false positives (e.g. // logic from 'News')
            content = content.replace(/\/\/.*/g, ''); // Single-line
            content = content.replace(/\/\*[\s\S]*?\*\//g, ''); // Multi-line

            // Regex to find "import ... from 'package'"
            // and "import('package')"
            const importRegex = /from\s+['"]([^'"]+)['"]/g;
            const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;
            const requireRegex = /require\(['"]([^'"]+)['"]\)/g;

            let match;
            while ((match = importRegex.exec(content)) !== null) addImport(match[1]);
            while ((match = dynamicImportRegex.exec(content)) !== null) addImport(match[1]);
            while ((match = requireRegex.exec(content)) !== null) addImport(match[1]);
        }
    }
}

function addImport(imp) {
    if (imp.startsWith('.')) return; // Ignore local imports
    if (imp.startsWith('@/')) return; // Ignore aliases
    if (imp.startsWith('/')) return; // Ignore absolute paths (rare)

    // Handle scoped packages (e.g. @supabase/ssr -> @supabase/ssr)
    // Handle deep imports (e.g. lodash/merge -> lodash)
    let pkgName = imp;
    if (imp.startsWith('@')) {
        const parts = imp.split('/');
        if (parts.length >= 2) pkgName = `${parts[0]}/${parts[1]}`;
    } else {
        pkgName = imp.split('/')[0];
    }

    imports.add(pkgName);
}

console.log(`📂 Scanning ${SRC_DIR} for imports...`);
scanDir(SRC_DIR);

// 3. Compare
const missing = [];
for (const imp of imports) {
    if (!dependencies.has(imp)) {
        missing.push(imp);
    }
}

// 4. Report
if (missing.length > 0) {
    console.error('\n🚨 SAFETY CHECK FAILED! Missing dependencies found:');
    console.error('These libraries are imported in code but NOT in package.json:');
    missing.forEach(m => console.error(`   - ${m}`));
    console.error('\n👉 Fix: Run "npm install ' + missing.join(' ') + '"');
    process.exit(1);
} else {
    console.log('\n✅ Dependency Check Passed! All imported libraries are present.');
    process.exit(0);
}
