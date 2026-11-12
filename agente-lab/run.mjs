// Runs the agent's loop over the measuring set in headless Chromium and writes the result.
//   node run.mjs --model qwen2.5-coder-0.5b-instruct-q4_0.gguf [--calls 3] [--only id,id]
//                [--shard 0/4] [--seed 1 --temp 0.3] [--few] [--out results/name.json]
// The model is a GGUF file in ./models (or AGENTE_MODELS). Needs `npm install` and `npm run site`.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadPlaywright } from './browser.mjs';
import { startServer } from './serve.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);
const model = opt('model');
const models = (process.env.AGENTE_MODELS ?? new URL('./models', import.meta.url).pathname).replace(/\/$/, '');
if (!model || !existsSync(`${models}/${model}`)) {
	console.error(`model not found: ${models}/${model ?? '<--model file.gguf>'}\nFor the base model:\n  curl -L -o ${models}/qwen2.5-coder-0.5b-instruct-q4_0.gguf https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-0.5b-instruct-q4_0.gguf`);
	process.exit(2);
}
const query = new URLSearchParams({ model, calls: opt('calls', '3') });
if (opt('only')) query.set('only', opt('only'));
if (opt('shard')) query.set('shard', opt('shard'));
if (opt('seed')) query.set('seed', opt('seed'));
if (opt('temp')) query.set('temp', opt('temp'));
if (args.includes('--few')) query.set('few', '1');
const out = opt('out', `results/${model.replace(/\.gguf$/, '')}${opt('shard') ? `-${opt('shard').replace('/', 'of')}` : ''}.json`);

const server = await startServer();
const browser = await loadPlaywright().chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('page error:', e.message));
page.on('console', (m) => { if (/ \| (pass|compile|test|run|wrong) \| /.test(m.text())) console.log(m.text().slice(0, 200)); });
await page.goto(`${server.origin}/lab/lab.html?${query}`);
await page.waitForFunction(() => window.R?.done, null, { timeout: 6 * 3600_000 });
const R = await page.evaluate(() => window.R);
await browser.close();
server.close();

const gens = R.tasks.flatMap((t) => t.steps.filter((s) => s.genMs));
const tokens = gens.reduce((n, s) => n + (s.tokens ?? 0), 0);
const seconds = gens.reduce((n, s) => n + s.genMs, 0) / 1000;
const count = (f) => R.tasks.filter(f).length;
const summary = {
	model, calls: +query.get('calls'), seed: +(query.get('seed') ?? 0), temp: +(query.get('temp') ?? 0), few: query.has('few'), shard: query.get('shard') ?? '0/1',
	tasks: R.tasks.length, pass: count((t) => t.pass), firstTry: count((t) => t.pass && t.modelCalls === 1 && t.autofixes === 0),
	passFn: count((t) => t.pass && t.kind === 'fn'), fn: count((t) => t.kind === 'fn'),
	passTile: count((t) => t.pass && t.kind === 'tile'), tile: count((t) => t.kind === 'tile'),
	tokensPerSecond: +(tokens / seconds).toFixed(1), secondsPerTask: +(seconds / R.tasks.length).toFixed(1), loadMs: Math.round(R.loadMs),
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ summary, tasks: R.tasks }, null, '\t') + '\n');
console.log(JSON.stringify(summary));
console.log(`passed ${summary.pass} of ${summary.tasks} (fn ${summary.passFn}/${summary.fn}, tile ${summary.passTile}/${summary.tile}); written to ${out}`);
