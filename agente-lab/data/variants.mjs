// Training data from the recipe notebook (../recipes.mjs): each idea becomes a template that writes
// many small tile programs with other numbers, colours, places and wordings. A variant carries the
// request, the idea in one sentence (it goes into the answer as a comment), the body of the loop
// and a reference picture computed here in JavaScript, pixel by pixel. variants.html builds every
// variant with the real compiler, runs it at two canvas sizes and compares the whole picture with
// the reference; a variant that draws a picture of the measuring sets is thrown away.
// Left out on purpose: a disc that moves (the measuring set 2 asks for motion and a shape together,
// and that combination is meant to stay unseen).
//   variants(per) → [{ id, template, ask, idea, body, code, ref(x, y, t, w, h) → [r, g, b], times, slack }]
import { TILE_HEAD, TILE_TAIL } from '../tasks.mjs';

const mulberry = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const COLOURS = [['black', [0, 0, 0]], ['white', [255, 255, 255]], ['red', [255, 0, 0]], ['green', [0, 255, 0]], ['blue', [0, 0, 255]], ['yellow', [255, 255, 0]], ['cyan', [0, 255, 255]], ['magenta', [255, 0, 255]],
	['orange', [255, 128, 0]], ['gray', [128, 128, 128]], ['dark gray', [40, 40, 40]], ['purple', [128, 0, 255]], ['pink', [255, 128, 192]], ['teal', [0, 128, 128]], ['navy', [0, 0, 96]], ['brown', [120, 72, 24]], ['light blue', [0, 200, 255]], ['lime', [160, 255, 0]]];
const MASKS = [['gray', [1, 1, 1]], ['red', [1, 0, 0]], ['green', [0, 1, 0]], ['blue', [0, 0, 1]], ['yellow', [1, 1, 0]], ['cyan', [0, 1, 1]], ['magenta', [1, 0, 1]]];
const CH = ['red', 'green', 'blue'];
const tools = (next) => {
	const R = { next, int: (a, b) => a + Math.floor(next() * (b - a + 1)), of: (list) => list[Math.floor(next() * list.length)], chance: (p) => next() < p };
	R.colour = () => R.of(COLOURS);
	R.two = () => { const a = R.colour(); let b = R.colour(); while (b === a) b = R.colour(); return [a, b]; };
	R.three = () => { const [a, b] = R.two(); let c = R.colour(); while (c === a || c === b) c = R.colour(); return [a, b, c]; };
	// How a colour is said: mostly with its numbers; the eight plain ones sometimes by name alone.
	R.nm = (c) => (COLOURS.indexOf(c) < 8 && R.chance(0.3) ? c[0] : `${c[0]} (${c[1].join(', ')})`);
	R.mask = () => R.of(MASKS);
	return R;
};

const L = (...lines) => lines.map((l) => `            ${l}\n`).join('');
const A = 'pixels[i + 3] = 255;';
const set = (r, g, b) => L(`pixels[i] = ${r};`, `pixels[i + 1] = ${g};`, `pixels[i + 2] = ${b};`, A);
// Two colours chosen by a condition, written in one of three ways.
const paint = (R, cond, a, b) => {
	const s = R.int(0, 2);
	if (s === 0) return set(...a.map((v, n) => (v === b[n] ? v : `if ${cond} { ${v} } else { ${b[n]} }`)));
	if (s === 1) return L(`let (r, g, b) = if ${cond} { (${a.join(', ')}) } else { (${b.join(', ')}) };`) + set('r', 'g', 'b');
	return L(`let colour: [u8; 3] = if ${cond} { [${a.join(', ')}] } else { [${b.join(', ')}] };`, 'pixels[i..i + 3].copy_from_slice(&colour);', A);
};
// A level written to the channels of a mask; the others stay 0.
const level = (m) => set(...m[1].map((on) => (on ? 'level' : 0)));
const levelSay = (m, what) => (m[0] === 'gray' ? `red, green and blue are all ${what}` : `${CH.filter((_, n) => m[1][n]).join(' and ')} ${m[1].filter(Boolean).length > 1 ? 'are' : 'is'} ${what}, and the other channels are 0`);
const lv = (m, v) => m[1].map((on) => (on ? v : 0));
const u8 = (v) => Math.max(0, Math.min(255, Math.trunc(v)));
const f = (n) => (Number.isInteger(n) ? `${n}.0` : `${n}`);
const noise = (x, y) => { let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) >>> 0; n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0; return n >>> 24; };
const NOISE = L('let mut n = (x as u32).wrapping_mul(374761393).wrapping_add((y as u32).wrapping_mul(668265263));', 'n = (n ^ (n >> 13)).wrapping_mul(1274126177);');
// A centre: a point given in numbers, or the middle of the canvas.
const centre = (R) => (R.chance(0.5)
	? (([cx, cy]) => ({ say: `(${cx}, ${cy})`, dx: `x as i64 - ${cx}`, dy: `y as i64 - ${cy}`, fx: `x as f32 - ${f(cx)}`, fy: `y as f32 - ${f(cy)}`, at: () => [cx, cy] }))([R.int(8, 55), R.int(6, 33)])
	: { say: R.of(['the centre of the canvas (width / 2, height / 2)', 'the centre (width / 2, height / 2)']), dx: 'x as i64 - (width / 2) as i64', dy: 'y as i64 - (height / 2) as i64', fx: 'x as f32 - (width / 2) as f32', fy: 'y as f32 - (height / 2) as f32', at: (w, h) => [w >> 1, h >> 1] });

const T = {
	fill(R) { const c = R.colour(); return { core: `fills the whole canvas with ${R.nm(c)}`, idea: 'One colour everywhere: the same bytes for every pixel.', body: set(...c[1]), ref: () => c[1] }; },
	split(R) {
		const [a, b] = R.two(), n = R.int(2, 4), v = R.chance(0.5), far = R.chance(0.3);
		const part = n === 2 ? 'half' : n === 3 ? 'third' : 'quarter', side = v ? (far ? 'right' : 'left') : (far ? 'bottom' : 'top'), [p, size] = v ? ['x', 'width'] : ['y', 'height'];
		const cond = far ? `${p} >= ${size} - ${size} / ${n}` : `${p} < ${size} / ${n}`;
		return { core: `paints the ${side} ${part} of the canvas ${R.nm(a)} and the rest ${R.nm(b)}`, idea: `A part of the canvas: compare ${p} with a fraction of the ${size}.`, body: paint(R, cond, a[1], b[1]),
			ref: (x, y, t, w, h) => { const q = v ? x : y, s = v ? w : h, k = Math.floor(s / n); return (far ? q >= s - k : q < k) ? a[1] : b[1]; } };
	},
	tick(R) {
		const k = R.of([1, 2, 3, 4, 5, 8, 10]), m = R.mask(), what = k === 1 ? 't_ms modulo 256' : `(t_ms / ${k}) modulo 256`;
		return { core: `fills the whole canvas with one level that depends on time: ${levelSay(m, what)}`, idea: 'A value that cycles with time: divide t_ms to slow it down, modulo 256 keeps it in a byte.',
			body: L(`let level = (${k === 1 ? 't_ms' : `t_ms / ${k}`} % 256) as u8;`) + level(m), ref: (x, y, t) => lv(m, Math.floor(t / k) % 256), times: [0, 130 * k, 700 * k + 7] };
	},
	disc(R) {
		const [a, b] = R.two(), c = centre(R), r = R.int(3, 15);
		return { core: `draws a filled ${R.nm(a)} ${R.of(['disc', 'circle'])} of radius ${r} centred at ${c.say} on a ${R.nm(b)} background`, idea: 'Inside a circle: compare the squared distance to the centre with the squared radius, in signed numbers.',
			body: L(`let dx = ${c.dx};`, `let dy = ${c.dy};`, `let inside = dx * dx + dy * dy <= ${R.chance(0.5) ? `${r} * ${r}` : r * r};`) + paint(R, 'inside', a[1], b[1]),
			ref: (x, y, t, w, h) => { const [cx, cy] = c.at(w, h); return (x - cx) ** 2 + (y - cy) ** 2 <= r * r ? a[1] : b[1]; } };
	},
	ring(R) {
		const [a, b] = R.two(), c = centre(R), r1 = R.int(3, 10), r2 = r1 + R.int(2, 6);
		const say = R.chance(0.5) ? `draws a ${R.nm(a)} ring around ${c.say}, from radius ${r1} to radius ${r2}, on a ${R.nm(b)} background` : `draws a ${R.nm(a)} ring on a ${R.nm(b)} background: a pixel is in the ring when its distance to ${c.say} is at least ${r1} and at most ${r2}`;
		return { core: say, idea: 'A ring lies between two circles: test the squared distance against both squared radii.',
			body: L(`let dx = ${c.dx};`, `let dy = ${c.dy};`, 'let d2 = dx * dx + dy * dy;', `let ring = d2 >= ${r1} * ${r1} && d2 <= ${r2} * ${r2};`) + paint(R, 'ring', a[1], b[1]),
			ref: (x, y, t, w, h) => { const [cx, cy] = c.at(w, h), d2 = (x - cx) ** 2 + (y - cy) ** 2; return d2 >= r1 * r1 && d2 <= r2 * r2 ? a[1] : b[1]; } };
	},
	glow(R) {
		const c = centre(R), k = R.int(3, 12), m = R.mask();
		return { core: `draws a soft glow around ${c.say}: with d the distance to that point, ${levelSay(m, `255 minus ${k} times d, never below 0`)}`, idea: 'Brightness that falls with distance: the real distance needs sqrt in f32; max keeps it from going below 0.',
			body: L(`let dx = ${c.fx};`, `let dy = ${c.fy};`, `let level = (255.0 - ${f(k)} * (dx * dx + dy * dy).sqrt()).max(0.0) as u8;`) + level(m), tol: 2,
			ref: (x, y, t, w, h) => { const [cx, cy] = c.at(w, h); return lv(m, u8(Math.max(0, 255 - k * Math.hypot(x - cx, y - cy)))); } };
	},
	lerp(R) {
		const [a, b] = R.two(), v = R.chance(0.5), [p, size, from, to] = v ? ['y', 'height', 'top', 'bottom'] : ['x', 'width', 'left edge', 'right edge'];
		return { core: `fills the canvas with a ${v ? 'vertical' : 'horizontal'} gradient from ${R.nm(a)} at the ${from} to ${R.nm(b)} at the ${to}, mixing the two colours linearly`, idea: 'Mixing two colours: with a weight k from 0 to 255, each channel is (a * (255 - k) + b * k) / 255.',
			body: L(`let a = [${a[1][0]}usize, ${a[1][1]}, ${a[1][2]}];`, `let b = [${b[1][0]}usize, ${b[1][1]}, ${b[1][2]}];`, `let k = ${p} * 255 / (${size} - 1);`, 'for c in 0..3 {', '    pixels[i + c] = ((a[c] * (255 - k) + b[c] * k) / 255) as u8;', '}', A),
			ref: (x, y, t, w, h) => { const k = Math.floor((v ? y : x) * 255 / ((v ? h : w) - 1)); return a[1].map((q, n) => Math.floor((q * (255 - k) + b[1][n] * k) / 255)); } };
	},
	uv(R) {
		const order = R.of([[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]), k = R.of([0, 128, 255]);   // which channel follows u, which v, which is constant
		const exprs = [], say = `paints each pixel with ${CH[order[0]]} growing from 0 at the left edge to 255 at the right edge and ${CH[order[1]]} growing from 0 at the top to 255 at the bottom; ${CH[order[2]]} is ${k}`;
		exprs[order[0]] = '(u * 255.0) as u8'; exprs[order[1]] = '(v * 255.0) as u8'; exprs[order[2]] = k;
		return { core: say, idea: 'Coordinates from 0 to 1: divide x by (width - 1) and y by (height - 1) in f32, and the picture fits any canvas size.',
			body: L('let u = x as f32 / (width - 1) as f32;', 'let v = y as f32 / (height - 1) as f32;') + set(...exprs), tol: 2,
			ref: (x, y, t, w, h) => { const o = []; o[order[0]] = u8(x / (w - 1) * 255); o[order[1]] = u8(y / (h - 1) * 255); o[order[2]] = k; return o; } };
	},
	cells(R) {
		const [a, b] = R.two(), s = R.of([4, 5, 6, 8, 10, 12, 16]);
		const say = R.chance(0.5) ? `draws a checkerboard of ${s}x${s} pixel squares, ${R.nm(a)} and ${R.nm(b)}, with a ${a[0]} square in the top-left corner` : `draws cells of ${s} by ${s} pixels, ${R.nm(a)} where column + row is even and ${R.nm(b)} elsewhere`;
		return { core: say, idea: 'Cells of a grid: integer division gives the column (x / size) and the row (y / size); colour by whether their sum is even.',
			body: L(`let even = (x / ${s} + y / ${s}) % 2 == 0;`) + paint(R, 'even', a[1], b[1]), ref: (x, y) => ((Math.floor(x / s) + Math.floor(y / s)) % 2 === 0 ? a[1] : b[1]) };
	},
	stripes(R) {
		const [a, b] = R.two(), v = R.chance(0.5), p = v ? 'x' : 'y', kind = v ? 'vertical' : 'horizontal', dim = v ? 'wide' : 'tall', first = v ? 'at the left' : 'at the top';
		if (R.chance(0.5)) { const n = R.int(2, 9); return { core: `draws ${kind} stripes ${n} pixels ${dim}, alternating ${R.nm(a)} and ${R.nm(b)}, with a ${a[0]} stripe ${first}`, idea: 'Stripes: integer division numbers the stripes, and the parity of that number chooses the colour.',
			body: L(`let first = (${p} / ${n}) % 2 == 0;`) + paint(R, 'first', a[1], b[1]), ref: (x, y) => (Math.floor((v ? x : y) / n) % 2 === 0 ? a[1] : b[1]) }; }
		const per = R.int(5, 14), on = R.int(1, per - 2);
		return { core: `draws ${kind} bars that repeat every ${per} pixels: ${on} ${on === 1 ? 'pixel' : 'pixels'} of ${R.nm(a)}, then ${per - on} of ${R.nm(b)}`, idea: 'Repeating with modulo: the remainder is the place inside one repetition; compare it with the length of the part that is on.',
			body: L(`let on = ${p} % ${per} < ${on};`) + paint(R, 'on', a[1], b[1]), ref: (x, y) => ((v ? x : y) % per < on ? a[1] : b[1]) };
	},
	slant(R) {
		const [a, b] = R.two(), form = R.int(0, 2);
		if (form === 0) { const per = R.of([6, 8, 10, 12, 16]), on = R.int(2, per - 2); return { core: `draws slanted bands: a pixel is ${R.nm(a)} when (x - y) modulo ${per} is less than ${on}, and ${R.nm(b)} otherwise (the modulo is never negative)`, idea: 'Slanted bands: use x - y as the coordinate; rem_euclid keeps the remainder positive when the difference is negative.',
			body: L(`let on = (x as i64 - y as i64).rem_euclid(${per}) < ${on};`) + paint(R, 'on', a[1], b[1]), ref: (x, y) => ((((x - y) % per) + per) % per < on ? a[1] : b[1]) }; }
		if (form === 1) { const per = R.of([6, 8, 10, 12, 16]), on = R.int(2, per - 2); return { core: `draws slanted bands: a pixel is ${R.nm(a)} when (x + y) modulo ${per} is less than ${on}, and ${R.nm(b)} otherwise`, idea: 'Slanted bands: use the sum x + y as the coordinate, then repeat it with modulo.',
			body: L(`let on = (x + y) % ${per} < ${on};`) + paint(R, 'on', a[1], b[1]), ref: (x, y) => ((x + y) % per < on ? a[1] : b[1]) }; }
		const n = R.int(2, 8);
		return { core: `draws diagonal stripes: a pixel is ${R.nm(a)} when ((x + y) / ${n}) is even, and ${R.nm(b)} when it is odd`, idea: 'Diagonal stripes: divide the sum x + y by the stripe width, and the parity chooses the colour.',
			body: L(`let even = ((x + y) / ${n}) % 2 == 0;`) + paint(R, 'even', a[1], b[1]), ref: (x, y) => (Math.floor((x + y) / n) % 2 === 0 ? a[1] : b[1]) };
	},
	rect(R) {
		const [a, b] = R.two(), x0 = R.int(2, 40), x1 = x0 + R.int(4, 20), y0 = R.int(2, 24), y1 = y0 + R.int(3, 12);
		const cond = R.chance(0.5) ? `(${x0}..${x1 + 1}).contains(&x) && (${y0}..${y1 + 1}).contains(&y)` : `x >= ${x0} && x <= ${x1} && y >= ${y0} && y <= ${y1}`;
		const say = R.chance(0.5) ? `draws a ${R.nm(a)} rectangle on a ${R.nm(b)} background: a pixel is inside when x is from ${x0} to ${x1} and y is from ${y0} to ${y1}, both inclusive` : `draws a ${R.nm(a)} rectangle, x from ${x0} to ${x1} and y from ${y0} to ${y1} (inclusive), on a ${R.nm(b)} background`;
		return { core: say, idea: 'Inside a rectangle: x in one range and y in another.', body: L(`let inside = ${cond};`) + paint(R, 'inside', a[1], b[1]), ref: (x, y) => (x >= x0 && x <= x1 && y >= y0 && y <= y1 ? a[1] : b[1]) };
	},
	frame(R) {
		const [a, b] = R.two(), th = R.int(1, 5);
		if (R.chance(0.5)) return { core: `draws a ${R.nm(a)} border ${th} ${th === 1 ? 'pixel' : 'pixels'} thick around the edge of the canvas; everything inside is ${R.nm(b)}`, idea: 'A border: the pixel is near one of the four edges of the canvas.',
			body: L(`let edge = x < ${th} || y < ${th} || x >= width - ${th} || y >= height - ${th};`) + paint(R, 'edge', a[1], b[1]), ref: (x, y, t, w, h) => (x < th || y < th || x >= w - th || y >= h - th ? a[1] : b[1]) };
		const x0 = R.int(2, 20), x1 = x0 + R.int(14, 36), y0 = R.int(2, 10), y1 = y0 + R.int(14, 24);
		return { core: `draws the outline, ${th} ${th === 1 ? 'pixel' : 'pixels'} thick, of the rectangle that goes from (${x0}, ${y0}) to (${x1}, ${y1}), in ${R.nm(a)} on ${R.nm(b)}`, idea: 'An outline is the outer shape minus the inner shape: inside the big one and not inside the smaller one.',
			body: L(`let outer = (${x0}..${x1 + 1}).contains(&x) && (${y0}..${y1 + 1}).contains(&y);`, `let inner = (${x0 + th}..${x1 + 1 - th}).contains(&x) && (${y0 + th}..${y1 + 1 - th}).contains(&y);`, 'let on = outer && !inner;') + paint(R, 'on', a[1], b[1]),
			ref: (x, y) => { const o = x >= x0 && x <= x1 && y >= y0 && y <= y1, n = x >= x0 + th && x <= x1 - th && y >= y0 + th && y <= y1 - th; return o && !n ? a[1] : b[1]; } };
	},
	side(R) {
		const [a, b] = R.two();
		if (R.chance(0.5)) { const ax = R.int(0, 20), ay = R.int(0, 39), bx = R.int(40, 63), by = R.int(0, 39); return { core: `splits the canvas with the line from (${ax}, ${ay}) to (${bx}, ${by}): a pixel is ${R.nm(a)} when (${bx} - ${ax}) * (y - ${ay}) - (${by} - ${ay}) * (x - ${ax}) is greater than 0, and ${R.nm(b)} otherwise`, idea: 'Which side of a line: the sign of (bx - ax) * (y - ay) - (by - ay) * (x - ax), in signed numbers.',
			body: L(`let (ax, ay, bx, by) = (${ax}i64, ${ay}i64, ${bx}i64, ${by}i64);`, 'let side = (bx - ax) * (y as i64 - ay) - (by - ay) * (x as i64 - ax);') + paint(R, 'side > 0', a[1], b[1]), ref: (x, y) => ((bx - ax) * (y - ay) - (by - ay) * (x - ax) > 0 ? a[1] : b[1]) }; }
		const n = R.int(1, 3), d = R.int(n + 1, 5), c = R.int(0, 12), below = R.chance(0.5);
		return { core: `paints ${R.nm(a)} the pixels ${below ? 'below' : 'above'} the line y = x * ${n} / ${d} + ${c} (that is, where y is ${below ? 'greater' : 'less'} than that value) and ${R.nm(b)} the others`, idea: 'Above or below a line: compute the row of the line for this column and compare y with it.',
			body: L(`let line = x * ${n} / ${d} + ${c};`) + paint(R, below ? 'y > line' : 'y < line', a[1], b[1]), ref: (x, y) => { const l = Math.floor(x * n / d) + c; return (below ? y > l : y < l) ? a[1] : b[1]; } };
	},
	plot(R) {
		const [a, b] = R.two(), th = R.int(0, 2), when = th === 0 ? 'when its y equals that row' : `when its y is within ${th} of that row`, on = `let on = (y as i64 - curve).abs() <= ${th};`;
		const idea = 'Plotting y = f(x): compute the row of the curve for each column and compare the pixel\'s row with it; the allowed difference is the thickness.';
		if (R.chance(0.5)) { const n = R.int(1, 3), d = R.int(1, 4), c = R.int(1, 15); return { core: `draws a ${R.nm(a)} line on a ${R.nm(b)} background: for each column x the line is at row x * ${n} / ${d} + ${c}; a pixel is ${a[0]} ${when}`, idea,
			body: L(`let curve = x as i64 * ${n} / ${d} + ${c};`, on) + paint(R, 'on', a[1], b[1]), ref: (x, y) => (Math.abs(y - (Math.floor(x * n / d) + c)) <= th ? a[1] : b[1]) }; }
		const cx = R.int(20, 44), k = R.of([8, 12, 16, 20, 32, 40]), c = R.int(1, 10);
		return { core: `draws a ${R.nm(a)} curve on a ${R.nm(b)} background: for each column x, with d = x - ${cx} as a signed number, the curve is at row d * d / ${k} + ${c}; a pixel is ${a[0]} ${when}`, idea,
			body: L(`let d = x as i64 - ${cx};`, `let curve = d * d / ${k} + ${c};`, on) + paint(R, 'on', a[1], b[1]), ref: (x, y) => (Math.abs(y - (Math.floor((x - cx) ** 2 / k) + c)) <= th ? a[1] : b[1]) };
	},
	wave(R) {
		const m = R.mask(), v = R.chance(0.5), p = v ? 'y' : 'x', bands = v ? 'horizontal bands' : 'vertical bands', along = v ? 'row' : 'column';
		if (R.chance(0.5)) { const per = R.of([8, 12, 16, 24, 32, 48]); return { core: `draws ${bands} whose level follows a sine of the ${along} with a period of ${per} pixels: ${levelSay(m, `128 + 127 * sin(2π * ${p} / ${per})`)}`, idea: 'A wave as a level: the angle is TAU times the position over the period; 128 + 127 * sin keeps the result inside a byte.',
			body: L(`let angle = std::f32::consts::TAU * ${p} as f32 / ${f(per)};`, 'let level = (128.0 + 127.0 * angle.sin()) as u8;') + level(m), tol: 2, ref: (x, y) => lv(m, u8(128 + 127 * Math.sin(2 * Math.PI * (v ? y : x) / per))) }; }
		const k = R.int(2, 9), fn = R.of(['sin', 'cos']);
		return { core: `draws ${bands} whose level follows a ${fn === 'sin' ? 'sine' : 'cosine'} of the ${along}: ${levelSay(m, `128 + 127 * ${fn}(${p} / ${k}), with ${p} as f32`)}`, idea: 'A wave as a level: 128 + 127 * sin (or cos) of a scaled coordinate stays inside a byte.',
			body: L(`let level = (128.0 + 127.0 * (${p} as f32 / ${f(k)}).${fn}()) as u8;`) + level(m), tol: 2, ref: (x, y) => lv(m, u8(128 + 127 * Math[fn]((v ? y : x) / k))) };
	},
	move(R) {
		const [a, b] = R.two(), v = R.chance(0.5), ms = R.of([5, 10, 15, 20, 25, 30, 40]), wide = R.int(1, 5), [p, size, what, way] = v ? ['x', 'width', 'column', 'to the right'] : ['y', 'height', 'row', 'down'];
		const say = wide === 1 ? `has a ${R.nm(b)} background and one ${R.nm(a)} ${what}, 1 pixel wide, that moves ${way} with time: the ${what} is at ${p} = (t_ms / ${ms}) % ${size}`
			: `has a ${R.nm(b)} background and a ${R.nm(a)} bar ${wide} pixels ${v ? 'wide' : 'tall'} that moves ${way}, one pixel every ${ms} milliseconds, and starts again when it leaves: it covers ${p} from (t_ms / ${ms}) % ${size} to that plus ${wide - 1}`;
		return { core: say, idea: 'Motion from time: a position is t_ms divided by the milliseconds per pixel; modulo the size makes it start again.',
			body: L(`let start = (t_ms as usize / ${ms}) % ${size};`, wide === 1 ? `let on = ${p} == start;` : `let on = ${p} >= start && ${p} < start + ${wide};`) + paint(R, 'on', a[1], b[1]),
			ref: (x, y, t, w, h) => { const s = Math.floor(t / ms) % (v ? w : h), q = v ? x : y; return q >= s && q < s + wide ? a[1] : b[1]; }, times: [0, ms * 10, ms * 27 + 3] };
	},
	bounce(R) {
		const [a, b] = R.two(), v = R.chance(0.5), ms = R.of([4, 5, 8, 10, 12, 20]), [p, size, what, ends] = v ? ['x', 'width', 'column', 'from the left edge to the right edge and back'] : ['y', 'height', 'row', 'from the top to the bottom and back'];
		return { core: `has a ${R.nm(b)} background and one ${R.nm(a)} ${what} that goes ${ends}, one pixel every ${ms} milliseconds`, idea: 'Back and forth: count along twice the span with modulo, and fold the second half back.',
			body: L(`let span = ${size} - 1;`, `let p = (t_ms as usize / ${ms}) % (2 * span);`, 'let place = if p <= span { p } else { 2 * span - p };') + paint(R, `${p} == place`, a[1], b[1]),
			ref: (x, y, t, w, h) => { const span = (v ? w : h) - 1, q = Math.floor(t / ms) % (2 * span); return (v ? x : y) === (q <= span ? q : 2 * span - q) ? a[1] : b[1]; }, times: [0, ms * 30, ms * 100] };
	},
	fall(R) {
		const [a, b] = R.two(), s = R.int(3, 6), x0 = R.int(4, 50), g = R.of([40, 60, 80, 100]);
		if (R.chance(0.5)) { const v0 = R.of([40, 50, 60, 70]); return { core: `shows a ${R.nm(a)} square of ${s} by ${s} pixels on a ${R.nm(b)} background, thrown up from the bottom at ${v0} pixels per second under a gravity of ${g} pixels per second squared: with s the time in seconds, it has risen ${v0} * s - ${g} * s * s / 2; its left side is at x = ${x0}`, idea: 'A throw under gravity: the height is speed * s - gravity * s * s / 2, with s the time in seconds as f32.',
			body: L('let s = t_ms as f32 / 1000.0;', `let top = (height - ${s}) as f32 - (${f(v0)} * s - ${f(g)} * s * s / 2.0);`, `let on = x >= ${x0} && x < ${x0 + s} && y as f32 >= top && (y as f32) < top + ${f(s)};`) + paint(R, 'on', a[1], b[1]), slack: 2 * s + 2,
			ref: (x, y, t, w, h) => { const q = t / 1000, top = h - s - (v0 * q - g * q * q / 2); return x >= x0 && x < x0 + s && y >= top && y < top + s ? a[1] : b[1]; }, times: [0, 300, 700] }; }
		const y0 = R.int(1, 6);
		return { core: `shows a ${R.nm(a)} square of ${s} by ${s} pixels falling on a ${R.nm(b)} background: its left side is at x = ${x0} and its top is at y = ${y0} + ${g / 2} * s * s, where s is the time in seconds (t_ms / 1000, as f32)`, idea: 'A fall under gravity: the distance fallen grows with the square of the time in seconds.',
			body: L('let s = t_ms as f32 / 1000.0;', `let top = ${f(y0)} + ${f(g / 2)} * s * s;`, `let on = x >= ${x0} && x < ${x0 + s} && y as f32 >= top && (y as f32) < top + ${f(s)};`) + paint(R, 'on', a[1], b[1]), slack: 2 * s + 2,
			ref: (x, y, t) => { const q = t / 1000, top = y0 + g / 2 * q * q; return x >= x0 && x < x0 + s && y >= top && y < top + s ? a[1] : b[1]; }, times: [0, 300, 700] };
	},
	swing(R) {
		const [a, b] = R.two(), v = R.chance(0.5), amp = R.int(6, 16), k = R.of([200, 300, 400, 500, 800]), fn = R.of(['sin', 'cos']), [p, size, what, way] = v ? ['x', 'width', 'column', 'left and right'] : ['y', 'height', 'row', 'up and down'];
		return { core: `has a ${R.nm(b)} background and one ${R.nm(a)} ${what} that swings ${way} around the middle: its ${p} is ${size} / 2 + ${amp} * ${fn}(t_ms / ${k}), computed in f32 and rounded`, idea: 'Swinging around a centre: the centre plus an amplitude times sin (or cos) of the time.',
			body: L(`let place = (${size} as f32 / 2.0 + ${f(amp)} * (t_ms as f32 / ${f(k)}).${fn}()).round() as usize;`) + paint(R, `${p} == place`, a[1], b[1]),
			ref: (x, y, t, w, h) => ((v ? x : y) === Math.round((v ? w : h) / 2 + amp * Math[fn](t / k)) ? a[1] : b[1]), times: [0, Math.round(k * 0.7), Math.round(k * 2.3)] };
	},
	wheel(R) {
		const [a, b] = R.two(), n = R.of([4, 6, 8, 10, 12]);
		return { core: `draws a wheel of ${n} equal sectors around the centre (width / 2, height / 2), alternately ${R.nm(a)} and ${R.nm(b)}: the sector number is (atan2(dy, dx) + π) divided by (2π / ${n}), and even sectors are ${a[0]}`, idea: 'The angle around a centre: atan2(dy, dx) goes from -π to π; add π and divide by the size of a sector to number the sectors.',
			body: L('let dx = x as f32 - (width / 2) as f32;', 'let dy = y as f32 - (height / 2) as f32;', `let sector = ((dy.atan2(dx) + std::f32::consts::PI) / (std::f32::consts::TAU / ${f(n)})) as usize;`) + paint(R, 'sector % 2 == 0', a[1], b[1]), slack: 70,
			ref: (x, y, t, w, h) => (Math.trunc((Math.atan2(y - (h >> 1), x - (w >> 1)) + Math.PI) / (2 * Math.PI / n)) % 2 === 0 ? a[1] : b[1]) };
	},
	noise(R) {
		const say = 'computed from x and y alone with an integer hash, so it is the same on every frame';
		if (R.chance(0.5)) { const m = R.mask(); return { core: `fills the canvas with ${m[0]} noise, ${say}`, idea: 'Cheap noise: mix x and y with wrapping multiplications by large odd numbers and keep the top byte.',
			body: NOISE + L('let level = (n >> 24) as u8;') + level(m), ref: (x, y) => lv(m, noise(x, y)) }; }
		const [a, b] = R.two(), cut = R.of([32, 64, 128, 192]);
		return { core: `scatters ${R.nm(a)} pixels on a ${R.nm(b)} background with noise ${say}: a pixel is ${a[0]} when the noise byte is below ${cut}`, idea: 'Cheap noise: mix x and y with wrapping multiplications by large odd numbers, keep the top byte and compare it with a threshold.',
			body: NOISE + paint(R, `(n >> 24) < ${cut}`, a[1], b[1]), ref: (x, y) => (noise(x, y) < cut ? a[1] : b[1]) };
	},
	mirror(R) {
		const m = R.mask(), v = R.chance(0.5), k = R.int(3, 9), [p, size, sides] = v ? ['x', 'width', 'both side edges'] : ['y', 'height', 'the top and the bottom'];
		return { core: `paints a level that grows from ${sides} towards the middle: with d the distance to the nearest of the two edges, ${levelSay(m, `${k} times d, never above 255`)}`, idea: 'Symmetry by folding: the distance to the nearest of two opposite edges is the smaller of the two distances.',
			body: L(`let d = ${p}.min(${size} - 1 - ${p});`, `let level = (d * ${k}).min(255) as u8;`) + level(m), ref: (x, y, t, w, h) => { const q = v ? x : y, s = v ? w : h; return lv(m, Math.min(255, Math.min(q, s - 1 - q) * k)); } };
	},
	over(R) {
		const top = R.colour(), pct = R.of([25, 40, 50, 60, 75]), alpha = Math.round(pct * 255 / 100), bw = R.of([4, 6, 8, 10]), v = R.chance(0.5), x0 = R.int(4, 30), x1 = x0 + R.int(10, 28), y0 = R.int(3, 14), y1 = y0 + R.int(8, 20);
		return { core: `has two layers. Background: ${v ? 'vertical' : 'horizontal'} bars ${bw} pixels ${v ? 'wide' : 'tall'}, white then black. On top: a ${R.nm(top)} rectangle, x from ${x0} to ${x1} and y from ${y0} to ${y1} (inclusive), at ${pct}% opacity (alpha ${alpha} of 255), so inside it each channel is (top * ${alpha} + background * ${255 - alpha}) / 255`, idea: 'A layer with opacity: each channel is (top * alpha + bottom * (255 - alpha)) / 255; alpha 0 leaves the bottom as it is.',
			body: L(`let bottom = if (${v ? 'x' : 'y'} / ${bw}) % 2 == 0 { 255usize } else { 0 };`, `let top = [${top[1][0]}usize, ${top[1][1]}, ${top[1][2]}];`, `let alpha = if (${x0}..${x1 + 1}).contains(&x) && (${y0}..${y1 + 1}).contains(&y) { ${alpha} } else { 0 };`, 'for c in 0..3 {', '    pixels[i + c] = ((top[c] * alpha + bottom * (255 - alpha)) / 255) as u8;', '}', A),
			ref: (x, y) => { const bot = Math.floor((v ? x : y) / bw) % 2 === 0 ? 255 : 0, al = x >= x0 && x <= x1 && y >= y0 && y <= y1 ? alpha : 0; return top[1].map((q) => Math.floor((q * al + bot * (255 - al)) / 255)); } };
	},
	metric(R) {
		const [a, b, c3] = R.three(), s = R.int(5, 16), head = L('let dx = (x as i64 - (width / 2) as i64).abs();', 'let dy = (y as i64 - (height / 2) as i64).abs();'), form = R.int(0, 2);
		if (form === 0) return { core: `draws a ${R.nm(a)} diamond around the centre (width / 2, height / 2) on a ${R.nm(b)} background: a pixel is inside when |dx| + |dy| is at most ${s}`, idea: 'A diamond: the sum of the two absolute differences to the centre is the distance.',
			body: head + paint(R, `dx + dy <= ${s}`, a[1], b[1]), ref: (x, y, t, w, h) => (Math.abs(x - (w >> 1)) + Math.abs(y - (h >> 1)) <= s ? a[1] : b[1]) };
		if (form === 1) return { core: `draws a ${R.nm(a)} square of half-side ${s} around the centre (width / 2, height / 2) on a ${R.nm(b)} background: a pixel is inside when the larger of |dx| and |dy| is at most ${s}`, idea: 'A square around a centre: the larger of the two absolute differences is the distance.',
			body: head + paint(R, `dx.max(dy) <= ${s}`, a[1], b[1]), ref: (x, y, t, w, h) => (Math.max(Math.abs(x - (w >> 1)), Math.abs(y - (h >> 1))) <= s ? a[1] : b[1]) };
		return { core: `draws, around the centre (width / 2, height / 2), a ${R.nm(b)} square of half-side ${s} with a ${R.nm(a)} diamond of the same reach inside it (|dx| + |dy| at most ${s}), on ${R.nm(c3)}`, idea: 'Squares and diamonds from other distances: max of the absolute differences gives a square, their sum a diamond.',
			body: head + L(`let (r, g, b) = if dx + dy <= ${s} { (${a[1].join(', ')}) } else if dx.max(dy) <= ${s} { (${b[1].join(', ')}) } else { (${c3[1].join(', ')}) };`) + set('r', 'g', 'b'),
			ref: (x, y, t, w, h) => { const dx = Math.abs(x - (w >> 1)), dy = Math.abs(y - (h >> 1)); return dx + dy <= s ? a[1] : Math.max(dx, dy) <= s ? b[1] : c3[1]; } };
	},
	layers(R) {
		const [a, b, c3] = R.three(), cx = R.int(12, 50), cy = R.int(10, 30), r = R.int(5, 11), x0 = R.int(4, 34), x1 = x0 + R.int(10, 24), y0 = R.int(3, 20), y1 = y0 + R.int(6, 14), discFirst = R.chance(0.5);
		const disc = `dx * dx + dy * dy <= ${r * r}`, rect = `(${x0}..${x1 + 1}).contains(&x) && (${y0}..${y1 + 1}).contains(&y)`, [c1, c2] = discFirst ? [disc, rect] : [rect, disc];
		const dSay = `a ${R.nm(a)} disc of radius ${r} at (${cx}, ${cy})`, rSay = `a ${R.nm(b)} rectangle, x from ${x0} to ${x1} and y from ${y0} to ${y1}`;
		return { core: `draws, on ${R.nm(c3)}, ${discFirst ? dSay : rSay} in front of ${discFirst ? rSay : dSay}`, idea: 'Several shapes: test them from front to back in one if / else if chain; the first that matches gives the colour.',
			body: L(`let dx = x as i64 - ${cx};`, `let dy = y as i64 - ${cy};`, `let (r, g, b) = if ${c1} {`, `    (${(discFirst ? a : b)[1].join(', ')})`, `} else if ${c2} {`, `    (${(discFirst ? b : a)[1].join(', ')})`, '} else {', `    (${c3[1].join(', ')})`, '};') + set('r', 'g', 'b'),
			ref: (x, y) => { const d = (x - cx) ** 2 + (y - cy) ** 2 <= r * r, q = x >= x0 && x <= x1 && y >= y0 && y <= y1; return discFirst ? (d ? a[1] : q ? b[1] : c3[1]) : (q ? b[1] : d ? a[1] : c3[1]); } };
	},
	fade(R) {
		const m = R.mask(), k = R.int(1, 6), down = R.chance(0.4), what = k === 1 ? 't_ms' : `t_ms / ${k}`;
		return { core: down ? `fades the whole canvas out with time: ${levelSay(m, `255 minus ${what}, and stay at 0 once it gets there`)}` : `fades the whole canvas in with time: ${levelSay(m, `${what}, and stay at 255 once it gets there`)}`, idea: 'Keeping a value in range: min stops a growing value at its ceiling before it is turned into a byte.',
			body: L(down ? `let level = (255 - (${what}).min(255)) as u8;` : `let level = (${what}).min(255) as u8;`) + level(m), ref: (x, y, t) => { const q = Math.min(255, Math.floor(t / k)); return lv(m, down ? 255 - q : q); }, times: [0, 90 * k, 400 * k] };
	},
};

const WRAP = [(c) => `Write a tile program that ${c}. Alpha is 255.`, (c) => `Write a tile program that ${c}. Alpha is 255.`, (c) => `Write a tile program that ${c}.`, (c) => `Make a tile that ${c}. Alpha is always 255.`];
export const TEMPLATES = Object.keys(T);
/** `per` variants of every template, always the same ones for the same `per` and `salt`. */
export function variants(per = 14, salt = 1) {
	const out = [];
	for (const name of TEMPLATES) {
		const seen = new Set();
		for (let n = 0, tries = 0; n < per && tries < per * 20; tries++) {
			const R = tools(mulberry(hash(`${name}:${salt}:${tries}`)));
			const v = T[name](R), ask = R.of(WRAP)(v.core);
			if (seen.has(ask)) continue;
			seen.add(ask);
			const body = L(`// ${v.idea}`) + v.body;
			out.push({ id: `v_${name}:${n}`, template: name, ask, idea: v.idea, body, code: TILE_HEAD + body + TILE_TAIL, ref: v.ref, times: v.times ?? [0, 33], tol: v.tol ?? 0, slack: v.slack ?? 0 });
			n++;
		}
	}
	return out;
}
