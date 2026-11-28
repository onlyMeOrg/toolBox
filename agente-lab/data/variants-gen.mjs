// Writes the proven variants of the recipe notebook, in headless Chromium with the site's compiler.
//   node data/variants-gen.mjs [--per 14] [--salt 1] [--only template,template] [--out data/out/variants.jsonl]
// Needs `npm run site` first. One JSON object per line: { id, template, ask, idea, code }.
// Exit code 1 when a variant fails its own proof (a variant that draws a measured picture is only dropped).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadPlaywright } from '../browser.mjs';
import { startServer } from '../serve.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const query = new URLSearchParams();
for (const name of ['per', 'salt', 'only']) if (opt(name)) query.set(name, opt(name));
const out = opt('out', 'data/out/variants.jsonl');

const server = await startServer(+opt('port', '8767'));
const browser = await loadPlaywright().chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('page error:', e.message));
page.on('console', (m) => { if (m.text().startsWith('DROP')) console.log(m.text().slice(0, 700)); });
await page.goto(`${server.origin}/lab/data/variants.html?${query}`);
await page.waitForFunction(() => window.R?.done, null, { timeout: 3 * 3600_000 });
const R = await page.evaluate(() => window.R);
await browser.close();
server.close();

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, R.rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
const count = (rows) => Object.fromEntries(Object.entries(Object.groupBy(rows, (r) => r.template ?? r.id.split(':')[0].slice(2))).map(([k, v]) => [k, v.length]));
const measured = R.dropped.filter((d) => d.why.startsWith('draws a picture'));
const summary = { toolchain: R.toolchain, variants: R.rows.length, byTemplate: count(R.rows), droppedAsMeasured: measured, failed: R.dropped.filter((d) => !measured.includes(d)) };
writeFileSync(out.replace(/\.jsonl$/, '.summary.json'), JSON.stringify(summary, null, '\t') + '\n');
console.log(JSON.stringify({ ...summary, byTemplate: undefined, perTemplate: Object.values(summary.byTemplate).join(' ') }, null, 1));
process.exit(summary.failed.length ? 1 : 0);
