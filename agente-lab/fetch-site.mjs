// Brings what outropedro.com.br/agente/ serves (the build worker, the WASI kernel and the Rust
// toolchain) into ./site/agente/, so the lab compiles with exactly what the page ships.
// AGENTE_SITE=https://… points at another deployment (a preview). Files already here are kept.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SITE = (process.env.AGENTE_SITE ?? 'https://outropedro.com.br').replace(/\/$/, '');
const OUT = new URL('./site/agente/', import.meta.url).pathname;

async function get(path, keep = true) {
	const file = join(OUT, path);
	if (keep && existsSync(file)) return file;
	const res = await fetch(`${SITE}/agente/${path}`, { signal: AbortSignal.timeout(300_000) });
	if (!res.ok) throw new Error(`${path}: ${res.status} ${res.statusText}`);
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, new Uint8Array(await res.arrayBuffer()));
	return file;
}

for (const f of ['build-worker.js', 'kernel/kernel.js', 'kernel/fs.js', 'kernel/thread-worker.js', 'kernel/browser-host.js', 'kernel/LICENSE']) await get(f, false);
const current = await (await fetch(`${SITE}/agente/toolchain/current.json`)).json();
mkdirSync(join(OUT, 'toolchain'), { recursive: true });
writeFileSync(join(OUT, 'toolchain/current.json'), JSON.stringify(current));
const manifest = await (await fetch(`${SITE}/agente/toolchain/${current.tag}/manifest.json`)).json();
mkdirSync(join(OUT, 'toolchain', current.tag), { recursive: true });
writeFileSync(join(OUT, 'toolchain', current.tag, 'manifest.json'), JSON.stringify(manifest));
for (const file of Object.values(manifest.files)) for (const part of file.parts) await get(`toolchain/${current.tag}/${part}`);
console.log(`site files in ${OUT} (toolchain ${current.tag}, ${(manifest.bytes / 1e6).toFixed(1)} MB)`);
