// Brings Rust programs with tests from outside sources into the seed format:
//   node data/import.mjs --exercism <clone of exercism/rust> --algorithms <clone of TheAlgorithms/Rust>
//   →  data/imported.mjs  (export const IMPORTED = [{ id, kind: "fn", ask, code, testsModule, source }])
// Both sources are MIT (see ../NOTICE.md). Each seed keeps where it came from: repository, commit, path.
//
// Only what the page's compiler can prove and a small model can learn from: std only, public API of
// plain functions, short. Whether a seed really passes its tests is decided later by gen.mjs, which
// drops the ones that do not. Anything that looks like a task of the measuring set is left out here.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const args = process.argv.slice(2);
const opt = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : null);
const MAX_LINES = 60, MAX_TEST_CHARS = 6000;

const tasks = readFileSync(new URL('../tasks.mjs', import.meta.url), 'utf8');
const taskFns = new Set([...tasks.matchAll(/pub fn ([a-z_0-9]+)/g)].map((m) => m[1]));
const taskIds = new Set([...tasks.matchAll(/id: '([a-z_0-9]+)'/g)].map((m) => m[1].replace(/_/g, '')));
// Classic exercises that are a task of the measuring set under another name.
const SAME_AS_A_TASK = /^(leap|collatz_?conjecture|fizz_?buzz|anagram|raindrops|run_?length_?encoding|roman_?numerals|rotational_?cipher|caesar.*|matching_?brackets|binary_?search|sieve|prime.*|fibonacci.*|palindrome.*|gcd.*|greatest_common_divisor|lcm.*|factorial.*|word_?count|reverse_?string|kadane.*|maximum_subarray|merge_sort.*|median.*|transpose|.*sum_of_digits.*|digit_sum|decimal_to_binary|.*to_binary.*)$/;
const clashes = (id, code) => id === 'pangram' || SAME_AS_A_TASK.test(id) || taskIds.has(id.replace(/_/g, '')) || [...code.matchAll(/\bfn ([a-z_0-9]+)/g)].some((m) => taskFns.has(m[1]));

const commit = (repo) => execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const signatures = (code) => [...code.matchAll(/^(?:    )?pub (?:const )?fn [^{;]+?(?=\s*(?:where\b[^{]*)?\{)|^(?:#\[derive[^\n]*\n)?pub (?:struct|enum) [^{;]*(?:\{[^}]{0,300}\}|\([^)]{0,120}\);|;)|^impl[^{\n]* for [^{\n]+(?= \{)/gm)].map((m) => m[0].replace(/\s+/g, ' ').trim());
const plain = (code) => !/^\s*(?:pub )?(?:extern crate|mod \w+;|macro_rules!)|^\s*use (?!std::|core::|alloc::)|\bcrate::|unsafe /m.test(code);
const short = (code) => code.split('\n').length <= MAX_LINES;
const tidy = (text) => text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim() + '\n';

const out = [], skipped = {};
const skip = (why) => { skipped[why] = (skipped[why] ?? 0) + 1; };

function exercism(repo) {
	const at = commit(repo), root = join(repo, 'exercises/practice');
	for (const slug of readdirSync(root).sort()) {
		const dir = join(root, slug), id = slug.replace(/-/g, '_');
		const example = join(dir, '.meta/example.rs'), testDir = join(dir, 'tests');
		if (!existsSync(example) || !existsSync(testDir)) { skip('no example or tests'); continue; }
		if (/^\[dependencies\]\s*\n\s*[a-z]/m.test(readFileSync(join(dir, 'Cargo.toml'), 'utf8'))) { skip('needs a crate'); continue; }
		const code = tidy(readFileSync(example, 'utf8'));
		const sigs = signatures(code);
		if (!plain(code)) { skip('not std only'); continue; }
		if (sigs.length === 0 || sigs.length > 8 || /^pub (?:trait|type)|^(?:pub )?mod /m.test(code)) { skip('public API too wide'); continue; }
		if (!short(code)) { skip('long'); continue; }
		if (clashes(id, code)) { skip('same as a task'); continue; }
		const testFiles = readdirSync(testDir).filter((f) => f.endsWith('.rs'));
		if (testFiles.length !== 1) { skip('several test files'); continue; }
		let tests = readFileSync(join(testDir, testFiles[0]), 'utf8');
		if (tests.length > MAX_TEST_CHARS || !plain(tests.replace(new RegExp(`^use ${id}::[^;]*;`, 'gm'), ''))) { skip('tests long or not plain'); continue; }
		tests = tests.replace(new RegExp(`^use ${id}::[^;]*;\\n`, 'gm'), '').replace(/^#\[ignore\]\n/gm, '').replace(new RegExp(`\\b${id}::`, 'g'), '');
		const docs = join(dir, '.docs/instructions.md');
		const text = existsSync(docs) ? readFileSync(docs, 'utf8').replace(/^#.*$/gm, '').replace(/```[\s\S]*?```/g, '').replace(/\[([^\]]+)\]\[[^\]]*\]|\[([^\]]+)\]\([^)]*\)/g, '$1$2').split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean) : [];
		let about = '';
		for (const p of text) { if ((about + ' ' + p).length > 600) break; about += (about ? ' ' : '') + p; }
		if (!about) { skip('no instructions'); continue; }
		out.push({
			id: `ex_${id}`, kind: 'fn', ask: `Write ${sigs.map((s) => `\`${s}\``).join(', ')}. ${about}`, code,
			testsModule: `#[cfg(test)]\nmod hidden_tests {\n    use super::*;\n\n${tidy(tests).replace(/^(?=.)/gm, '    ')}}\n`,
			source: { repo: 'exercism/rust', commit: at, path: `exercises/practice/${slug}`, license: 'MIT' },
		});
	}
}

function algorithms(repo) {
	const at = commit(repo), root = join(repo, 'src');
	const walk = (dir) => readdirSync(dir).sort().flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.rs') && f !== 'mod.rs' && f !== 'lib.rs' ? [p] : []; });
	for (const file of walk(root)) {
		const path = relative(repo, file), name = file.split('/').pop().replace(/\.rs$/, ''), area = path.split('/')[1];
		const text = readFileSync(file, 'utf8').replace(/\r/g, '');
		const cut = text.search(/^#\[cfg\(test\)\]\s*\nmod \w+ \{/m);
		if (cut < 0) { skip('no tests'); continue; }
		const code = tidy(text.slice(0, cut)), tests = text.slice(cut);
		const sigs = signatures(code);
		if (!plain(code) || !plain(tests.replace(/^\s*use super::[^;]*;/gm, '').replace(/macro_rules!/g, ''))) { skip('not std only'); continue; }
		if (sigs.length === 0 || sigs.length > 5 || /^pub (?:trait|type)|^(?:pub )?mod /m.test(code)) { skip('public API too wide'); continue; }
		if (!short(code) || tests.length > MAX_TEST_CHARS) { skip('long'); continue; }
		if (/\b(?:rand|thread_rng|Instant|SystemTime|std::(?:fs|io|net|thread|process|env))\b/.test(text)) { skip('needs the system'); continue; }
		if (clashes(name, code)) { skip('same as a task'); continue; }
		// What the function is for: its own doc comment, or the file's, kept short.
		const doc = [...code.matchAll(/((?:^\/\/[\/!][^\n]*\n)+)/gm)].map((m) => m[1].replace(/^\/\/[\/!] ?/gm, '').replace(/\s+/g, ' ').trim()).filter((d) => d.length > 30)[0];
		if (!doc) { skip('no description'); continue; }
		const bare = tidy(code.replace(/^[ \t]*\/\/[^\n]*\n/gm, ''));
		if (!tests.includes('use super::')) { skip('tests not on the file'); continue; }
		out.push({
			id: `al_${name}`, kind: 'fn', ask: `Write ${sigs.map((s) => `\`${s}\``).join(', ')} (${area.replace(/_/g, ' ')}: ${name.replace(/_/g, ' ')}). ${doc.slice(0, 500)}`, code: bare,
			testsModule: tidy(tests),
			source: { repo: 'TheAlgorithms/Rust', commit: at, path, license: 'MIT' },
		});
	}
}

if (opt('exercism')) exercism(opt('exercism'));
if (opt('algorithms')) algorithms(opt('algorithms'));
writeFileSync(new URL('./imported.mjs', import.meta.url), `// Written by import.mjs from outside sources (MIT; see ../NOTICE.md). Do not edit by hand.\nexport const IMPORTED = ${JSON.stringify(out, null, '\t')};\n`);
console.log(`${out.length} seeds imported (${out.filter((s) => s.id.startsWith('ex_')).length} Exercism, ${out.filter((s) => s.id.startsWith('al_')).length} TheAlgorithms); skipped:`, skipped);
