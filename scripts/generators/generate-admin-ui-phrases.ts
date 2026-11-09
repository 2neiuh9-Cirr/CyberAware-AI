import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Keep the cloud translation allowlist limited to phrases present in the
// administrator UI source. Database values and form entries never enter it.
const files = readdirSync('src/modules/admin').filter(name => name.endsWith('.tsx')).map(name => join('src/modules/admin', name));
files.push('src/components/layout/AdminLayout.tsx');
const phrases = new Set<string>();
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const candidates = [...source.matchAll(/>([^<>]+)</g), ...source.matchAll(/(['"])([^'"\r\n]+)\1/g)];
  for (const match of candidates) {
    const value = (match[2] || match[1]).replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    if (value.length >= 2 && value.length <= 1800 && !/[{};<>]|className|=>|===|\?\.|\)\s*:|const |useState|user\.|\breturn\b|\[\]/.test(value) && /[\u00c0-\u1ef9\u0111\u0110]/u.test(value)) phrases.add(value);
  }
}
writeFileSync('src/site/adminUiPhrases.ts', `// Generated from administrator UI source by scripts/generators/generate-admin-ui-phrases.ts.\nexport const adminUiPhrases = ${JSON.stringify([...phrases].sort(), null, 2)} as const;\n`);
