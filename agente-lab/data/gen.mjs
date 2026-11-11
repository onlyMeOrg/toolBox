// Generates the training pairs by mutation, in headless Chromium with the site's compiler.
//   node data/gen.mjs [--only id,id] [--shard 0/4] [--per 2] [--out data/out/pairs.jsonl]
// Needs `npm run site` first. Writes one JSON object per line and prints a summary.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadPlaywright } from '../browser.mjs';
import { startServer } from '../serve.mjs';
import { SEEDS } from './seeds.mjs';

// The measuring set never enters the training data: no seed may define a function of a task.
const tasks = readFileSync(new URL('../tasks.mjs', import.meta.url), 'utf8');
const taskFns = new Set([...tasks.matchAll(/pub fn ([a-z_0-9]+)/g)].map((m) => m[1]));
const clash = SEEDS.filter((s) => s.kind === 'fn').flatMap((s) => [...s.code.matchAll(/pub fn ([a-z_0-9]+)/g)].map((m) => m[1]).filter((name) => taskFns.has(name) && !['new', 'len', 'is_empty'].includes(name)).map((name) => `${s.id}: ${name}`));
if (clash.length) { console.error(`seeds that repeat a function of the measuring set:\n${clash.join('\n')}`); process.exit(2); }

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const query = new URLSearchParams();
for (const name of ['only', 'shard', 'per']) if (opt(name)) query.set(name, opt(name));
const out = opt('out', 'data/out/pairs.jsonl');

const server = await startServer(+opt('port', '8766'));
const browser = await loadPlaywright().chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('page error:', e.message));
page.on('console', (m) => { if (/^(SEED FAILS|crash) /.test(m.text())) console.log(m.text().slice(0, 400)); });
await page.goto(`${server.origin}/lab/data/gen.html?${query}`);
await page.waitForFunction(() => window.R?.done, null, { timeout: 6 * 3600_000 });
const R = await page.evaluate(() => window.R);
await browser.close();
server.close();

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, R.rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
const tally = (key) => Object.fromEntries(Object.entries(Object.groupBy(R.rows, (r) => r[key] ?? '-')).map(([k, v]) => [k, v.length]).sort((a, b) => b[1] - a[1]));
const summary = {
	toolchain: R.toolchain, seeds: R.seeds.length, seedsFailing: R.seeds.filter((s) => !s.ok).map((s) => s.id),
	pairs: R.rows.length, byStage: tally('stage'), byAutofix: tally('autofix'), byOperator: tally('op'),
	byErrorCode: Object.fromEntries(Object.entries(R.rows.flatMap((r) => r.codes ?? []).reduce((n, c) => ({ ...n, [c]: (n[c] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1])),
	dropped: R.dropped,
};
writeFileSync(out.replace(/\.jsonl$/, '.summary.json'), JSON.stringify(summary, null, '\t') + '\n');
console.log(JSON.stringify(summary, null, 1));
process.exit(summary.seedsFailing.length ? 1 : 0);
