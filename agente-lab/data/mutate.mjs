// Breaks a correct program in known ways, one place at a time. Pure and deterministic: the same seed
// program gives the same mutants. Whether a mutant is really broken, and what the compiler says about
// it, is decided by the real compiler (gen.html), never here.
//
// Two families: "compile" (the kind of slip that stops the build: a missing `mut`, a wrong type, a
// method that does not exist) and "logic" (it builds and gives wrong results: an off-by-one, a flipped
// comparison). The method names in `wrong_method` are the ones a model brings from other languages.

/** Every site where `pattern` matches, replaced one at a time. `to` is a string or a function of the match. */
function sites(source, pattern, to) {
	const out = [];
	for (const m of source.matchAll(pattern)) {
		const replacement = typeof to === 'function' ? to(m) : to;
		if (replacement === null || replacement === m[0]) continue;
		out.push(source.slice(0, m.index) + replacement + source.slice(m.index + m[0].length));
	}
	return out;
}

const WRONG_METHODS = [
	['.len()', '.length()'], ['.push(', '.append('], ['.push_str(', '.add('], ['.chars()', '.characters()'],
	['.to_uppercase()', '.upper()'], ['.to_lowercase()', '.lower()'], ['.is_empty()', '.empty()'],
	['.split_whitespace()', '.split()'], ['.trim()', '.strip()'], ['.iter()', '.items()'], ['.contains(', '.includes('],
	['.to_string()', '.toString()'], ['.reverse()', '.reversed()'], ['.unwrap_or(', '.get_or('], ['.min(', '.minimum('],
	['.enumerate()', '.indexed()'], ['.collect()', '.to_vec()'], ['.abs()', '.absolute()'], ['.sqrt()', '.root()'],
];
const TYPE_SWAPS = [['usize', 'u32'], ['u32', 'usize'], ['i32', 'i64'], ['u64', 'u32'], ['f64', 'f32'], ['i64', 'i32'], ['u8', 'u32']];

export const OPERATORS = {
	// ---- compile
	drop_mut: (s) => sites(s, /\blet mut /g, 'let '),
	drop_mut_ref: (s) => sites(s, /&mut self/g, '&self'),
	drop_cast: (s) => sites(s, / as (?:usize|u8|u32|u64|u128|i32|i64|f64)\b/g, ''),
	swap_type: (s) => TYPE_SWAPS.flatMap(([a, b]) => sites(s, new RegExp(`(?<=[:>] ?(?:&(?:mut )?\\[?|Vec<|Option<\\(?)?)\\b${a}\\b`, 'g'), b)),
	drop_to_string: (s) => sites(s, /\.to_string\(\)|\.to_owned\(\)|\.to_vec\(\)/g, ''),
	drop_copied: (s) => sites(s, /\.copied\(\)|\.cloned\(\)|\.clone\(\)/g, ''),
	drop_deref: (s) => sites(s, /(?<=[=(,+] ?)\*(?=[a-z_])/g, ''),
	drop_ref_pattern: (s) => sites(s, /\bfor &(?=[a-z_])/g, 'for '),
	drop_unwrap: (s) => sites(s, /\.unwrap\(\)/g, ''),
	drop_question: (s) => sites(s, /(?<=\))\?(?=[;.])/g, ''),
	drop_some: (s) => sites(s, /\b(?:Some|Ok)\(([^()]*(?:\([^()]*\))?[^()]*)\)(?=\n|;)/g, (m) => m[1]),
	add_some: (s) => sites(s, /\breturn (?!None|Some|Ok|Err)([a-z_]+);/g, (m) => `return Some(${m[1]});`),
	misspell: (s) => {
		const names = [...new Set([...s.matchAll(/\blet (?:mut )?([a-z_]{3,})\b/g)].map((m) => m[1]))];
		return names.flatMap((name) => {
			const uses = [...s.matchAll(new RegExp(`\\b${name}\\b`, 'g'))].slice(1);
			return uses.slice(0, 1).map((m) => s.slice(0, m.index) + name.slice(0, -1) + s.slice(m.index + name.length));
		});
	},
	drop_use: (s) => sites(s, /^use std::[^\n]*;\n\n?/gm, ''),
	drop_return_type: (s) => sites(s, /(?<=\)) -> [^{\n]+(?= \{)/g, ''),
	drop_semicolon: (s) => sites(s, /(?<=^ +let [^\n]*);$/gm, ''),
	drop_brace: (s) => sites(s, /\n\}\n$/g, '\n'),
	wrong_method: (s) => WRONG_METHODS.flatMap(([a, b]) => { const i = s.indexOf(a); return i < 0 ? [] : [s.slice(0, i) + b + s.slice(i + a.length)]; }),
	int_for_float: (s) => sites(s, /\b(\d+)\.0\b/g, (m) => m[1]),
	str_for_string: (s) => sites(s, /-> String(?= \{)/g, '-> &str'),
	string_for_str: (s) => sites(s, /(?<=: )&str\b/g, 'String'),
	old_no_mangle: (s) => sites(s, /#\[unsafe\(no_mangle\)\]/g, '#[no_mangle]'),
	drop_extern: (s) => sites(s, /pub extern "C" fn/g, 'pub fn'),
	drop_lock: (s) => sites(s, /\.lock\(\)\.unwrap\(\)/g, ''),
	drop_impl_generic: (s) => sites(s, /\bimpl<T> /g, 'impl '),
	drop_self: (s) => sites(s, /\bself\.(?=[a-z_]+\b(?!\())/g, ''),
	immutable_param: (s) => sites(s, /: &mut \[/g, ': &['),
	// ---- logic
	range_from_one: (s) => sites(s, /\b0\.\.(?!=)/g, '1..'),
	range_inclusive: (s) => sites(s, /(?<=\d|\w)\.\.(?=[a-z(])/g, '..='),
	flip_comparison: (s) => sites(s, / (<=|>=|<|>|==|!=) /g, (m) => ` ${{ '<': '<=', '<=': '<', '>': '>=', '>=': '>', '==': '!=', '!=': '==' }[m[1]]} `),
	swap_operator: (s) => sites(s, / (\+|-|\*|&&|\|\|)(=?) /g, (m) => ` ${{ '+': '-', '-': '+', '*': '+', '&&': '||', '||': '&&' }[m[1]]}${m[2]} `),
	change_constant: (s) => sites(s, /(?<== )(0|1)(?=;|u64;|usize;|\.0;)/g, (m) => (m[1] === '0' ? '1' : '0')),
	swap_branches: (s) => sites(s, /\btrue\b|\bfalse\b/g, (m) => (m[0] === 'true' ? 'false' : 'true')),
};

/** A small deterministic generator (mulberry32), seeded from a text. */
export function rng(text) {
	let h = 1779033703 ^ text.length;
	for (let i = 0; i < text.length; i++) { h = Math.imul(h ^ text.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
	let a = h >>> 0;
	return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Up to `perOperator` mutants of each operator, without repeats: [{ op, code }]. */
export function mutants(id, source, perOperator = 2) {
	const seen = new Set([source]);
	const out = [];
	for (const [op, make] of Object.entries(OPERATORS)) {
		const random = rng(`${id}:${op}`);
		const all = make(source).filter((code) => code !== source);
		for (let n = 0; n < perOperator && all.length > 0; n++) {
			const [code] = all.splice(Math.floor(random() * all.length), 1);
			if (seen.has(code)) continue;
			seen.add(code);
			out.push({ op, code });
		}
	}
	return out;
}
