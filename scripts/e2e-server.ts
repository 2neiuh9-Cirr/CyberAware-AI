import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const dataDir = process.env.E2E_DATA_DIR;
if (!dataDir) throw new Error('E2E_DATA_DIR is required; refusing to start without isolated test data.');

const resolvedDataDir = path.resolve(dataDir);
const tempRoot = `${path.resolve(tmpdir())}${path.sep}`;
if (!resolvedDataDir.startsWith(tempRoot) || !path.basename(resolvedDataDir).startsWith('cyberaware-playwright-')) {
  throw new Error(`Refusing to use a non-temporary E2E data directory: ${resolvedDataDir}`);
}

mkdirSync(resolvedDataDir, { recursive: true });
process.env.AUTH_DATA_DIR = resolvedDataDir;
process.env.AUTH_JWT_SECRET ||= 'cyberaware-playwright-isolated-secret-2026';
process.env.NODE_ENV = 'development';
process.env.SMTP_HOST = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASSWORD = '';
process.env.SMTP_FROM = '';
process.env.GEMINI_API_KEY = '';
process.env.SAFE_BROWSING_API_KEY = '';

const adminEmail = 'e2e-admin@example.test';
const adminPassword = 'E2eAdmin!2026';
const { db, hashPassword } = await import('../backend/auth');
db.prepare(`INSERT INTO users (id,name,email,password_hash,password_version,role,level,avatar,created_at,email_verified)
  VALUES (?,?,?,?,?,?,?,?,?,1)`)
  .run(randomUUID(), 'E2E Admin', adminEmail, hashPassword(adminPassword), 0, 'admin', 'Quản trị viên', 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22%3E%3C/svg%3E', Date.now());

let appServer: Awaited<ReturnType<(typeof import('../server'))['startServer']>> | undefined;
let shuttingDown = false;

function removeTemporaryData() {
  if (existsSync(resolvedDataDir)) rmSync(resolvedDataDir, { recursive: true, force: true });
}

async function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  try {
    if (appServer?.listening) {
      appServer.closeAllConnections();
      await new Promise<void>((resolve, reject) => appServer!.close(error => error ? reject(error) : resolve()));
    }
    db.close();
    removeTemporaryData();
    process.exit(exitCode);
  } catch (error) {
    console.error('E2E server cleanup failed:', error);
    process.exit(1);
  }
}

try {
  const { startServer } = await import('../server');
  appServer = await startServer();
  console.log(`E2E-only app ready at ${process.env.APP_URL}; disposable database: ${resolvedDataDir}`);
  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
} catch (error) {
  db.close();
  removeTemporaryData();
  throw error;
}
