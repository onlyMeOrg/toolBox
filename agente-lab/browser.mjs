// Playwright is not a dependency: resolved from a local install or, failing that, the global one
// (npm install -g playwright && npx playwright install chromium).
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

export function loadPlaywright() {
	try {
		return createRequire(import.meta.url)('playwright');
	} catch {
		const globalRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
		return createRequire(`${globalRoot}/x.js`)('playwright');
	}
}
