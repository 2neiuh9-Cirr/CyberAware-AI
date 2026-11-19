import { existsSync, readFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export default async function globalTeardown() {
  const pointerFile = path.join(process.cwd(), '.e2e-temp-path');
  if (!existsSync(pointerFile)) return;
  const dataDir = readFileSync(pointerFile, 'utf8').trim();

  const resolved = path.resolve(dataDir);
  const tempRoot = `${path.resolve(tmpdir())}${path.sep}`;
  if (!resolved.startsWith(tempRoot) || !path.basename(resolved).startsWith('cyberaware-playwright-')) {
    throw new Error(`Refusing to remove a non-E2E directory: ${resolved}`);
  }

  let cleanupDeferred = false;
  for (let attempt = 0; attempt < 8 && existsSync(resolved); attempt++) {
    try {
      rmSync(resolved, { recursive: true, force: true });
    } catch (error) {
      if (attempt === 7) {
        cleanupDeferred = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  // On Windows the web server can still hold SQLite/WAL handles until Playwright
  // stops it just after global teardown. Its SIGTERM handler performs the same
  // guarded cleanup; don't turn a normal handle-ordering race into a test error.
  if (cleanupDeferred) console.warn(`E2E temp cleanup will finish when the isolated server exits: ${resolved}`);
  if (existsSync(pointerFile)) unlinkSync(pointerFile);
}
