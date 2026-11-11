// Turns the seeds and the mutation pairs into training examples, in the exact words of the loop:
//   node data/examples.mjs  →  data/out/examples.jsonl
// One object per line: { id, kind: "write" | "repair", stage, autofix, prompt, answer }. `prompt` is the
// text the model is given (ChatML, ending inside the opened code block, with the tile's head already
// written); `answer` is what it should continue with. Only seeds that produced pairs are known to be
// proven, so run gen.mjs first.
import { readFileSync, writeFileSync } from 'node:fs';
import { TILE_HEAD } from '../tasks.mjs';
import { TILE_NOTE, chatml, repairUser, whyText } from '../prompt.mjs';
import { SEEDS } from './seeds.mjs';

const END = '```<|im_end|>';
const split = (kind, code) => (kind === 'tile' ? [TILE_HEAD, code.slice(TILE_HEAD.length)] : ['', code]);
const ask = (seed) => seed.ask + (seed.kind === 'tile' ? TILE_NOTE : '');
const byId = new Map(SEEDS.map((s) => [s.id, s]));
const out = [];
for (const seed of SEEDS) {
	const [head, rest] = split(seed.kind, seed.code);
	out.push({ id: `${seed.id}:write`, seed: seed.id, kind: 'write', prompt: chatml(ask(seed), head), answer: rest + END });
}
const pairs = readFileSync(new URL('./out/pairs.jsonl', import.meta.url), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
for (const pair of pairs) {
	const seed = byId.get(pair.seed);
	const [head, rest] = split(seed.kind, pair.fixed);
	out.push({ id: pair.id, seed: pair.seed, kind: 'repair', stage: pair.stage, autofix: pair.autofix, prompt: chatml(repairUser(ask(seed), pair.broken, whyText(pair.stage, pair.why)), head), answer: rest + END });
}
writeFileSync(new URL('./out/examples.jsonl', import.meta.url), out.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(`${out.length} examples (${SEEDS.length} write, ${pairs.length} repair)`);
