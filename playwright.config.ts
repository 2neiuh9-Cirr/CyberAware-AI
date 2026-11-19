import { defineConfig } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const port = Number(process.env.E2E_PORT) || 4187;
const baseURL = `http://127.0.0.1:${port}`;
const pointerFile = path.join(process.cwd(), '.e2e-temp-path');
let dataDir: string;

// Test workers are separate processes, so share the random temp location via a
// short-lived pointer file instead of relying on worker environment inheritance.
if (existsSync(pointerFile)) {
  dataDir = readFileSync(pointerFile, 'utf8').trim();
} else {
  dataDir = path.join(tmpdir(), `cyberaware-playwright-${process.pid}-${randomUUID()}`);
  writeFileSync(pointerFile, dataDir, { encoding: 'utf8', flag: 'wx' });
}
if (!path.basename(dataDir).startsWith('cyberaware-playwright-')) {
  throw new Error('Invalid E2E temp path pointer.');
}
process.env.E2E_DATA_DIR = dataDir;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  outputDir: path.join(dataDir, 'artifacts'),
  reporter: 'list',
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL,
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node --import tsx scripts/e2e-server.ts',
    url: `${baseURL}/api/health`,
    timeout: 60_000,
    reuseExistingServer: false,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    env: {
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: String(port),
      APP_URL: baseURL,
      AUTH_DATA_DIR: dataDir,
      E2E_DATA_DIR: dataDir,
      AUTH_JWT_SECRET: 'cyberaware-playwright-isolated-secret-2026',
      GEMINI_API_KEY: '',
      SAFE_BROWSING_API_KEY: '',
      SMTP_HOST: '',
      SMTP_USER: '',
      SMTP_PASSWORD: '',
      SMTP_FROM: '',
    },
  },
});
