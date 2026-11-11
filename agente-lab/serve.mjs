// A static server for the lab, with the headers the compiler needs (cross-origin isolation).
//   /agente/  the site's files (fetch-site.mjs)      /wllama/  the inference engine (npm)
//   /model/   GGUF files (AGENTE_MODELS, default ./models)      /lab/  this folder
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, normalize } from 'node:path';

const here = new URL('./', import.meta.url).pathname;
const ROOTS = {
	'/agente/': `${here}site/agente/`,
	'/wllama/': `${here}node_modules/@wllama/wllama/esm/`,
	'/model/': `${(process.env.AGENTE_MODELS ?? `${here}models`).replace(/\/$/, '')}/`,
	'/lab/': here,
};
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.wasm': 'application/wasm', '.json': 'application/json' };

export function startServer(port = 8766) {
	const server = createServer((req, res) => {
		const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
		const root = Object.keys(ROOTS).find((r) => path.startsWith(r));
		const file = root && normalize(ROOTS[root] + path.slice(root.length));
		if (!file || !file.startsWith(ROOTS[root]) || !existsSync(file) || statSync(file).isDirectory()) return res.writeHead(404).end();
		res.writeHead(200, {
			'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
			'Content-Length': statSync(file).size,
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp',
			'Cross-Origin-Resource-Policy': 'same-origin',
		});
		createReadStream(file).pipe(res);
	});
	return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok({ origin: `http://127.0.0.1:${port}`, close: () => server.close() })));
}

if (import.meta.url === `file://${process.argv[1]}`) console.log((await startServer()).origin);
