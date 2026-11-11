// Proves that every reference solution of the measuring set passes with the real toolchain, in
// headless Chromium. Exit code 1 if any fails. Needs `npm run site` first.
import { loadPlaywright } from './browser.mjs';
import { startServer } from './serve.mjs';

const server = await startServer();
const browser = await loadPlaywright().chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('page error:', e.message));
await page.goto(`${server.origin}/lab/verify.html`);
await page.waitForFunction(() => window.R?.done, null, { timeout: 900_000 });
const rows = await page.evaluate(() => window.R.rows);
for (const r of rows) if (!r.ok) console.log(`FAIL ${r.id}\n${r.why}`);
const passing = rows.filter((r) => r.ok).length;
console.log(`references passing: ${passing} of ${rows.length}`);
await browser.close();
server.close();
process.exit(passing === rows.length ? 0 : 1);
