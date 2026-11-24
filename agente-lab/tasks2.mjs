// Measuring set 2 for the agent: tiles that need a concept (distance, mixing, motion, a formula from
// physics) or two of them together. Kept apart from set 1 so the two can be read separately.
// Never used as training data, and no recipe of recipes.mjs may draw one of these pictures
// (verify.html runs every recipe and every tile seed against every check here).
// `times` are the frames run before the pixels are checked (the last one is the picture judged).
import { tile, at, is } from './tasks.mjs';

const K = [0, 0, 0], W = [255, 255, 255];
const all = (px, w, list) => list.every(([x, y, c, tol]) => is(at(px, w, x, y), ...c, tol));
const t2 = (id, needs, ask, points, body, times) => ({ ...tile(id, ask, (px, w) => all(px, w, points), body), set: 2, needs, ...(times ? { times } : {}) });
const gray = `            pixels[i] = level;\n            pixels[i + 1] = level;\n            pixels[i + 2] = level;\n            pixels[i + 3] = 255;\n`;

export const TASKS2 = [
  t2('disc_corner', 'one', 'Write a tile program that draws a filled red (255, 0, 0) disc of radius 12 centred on the top-left corner (0, 0), so only a quarter of it shows, on a white background. Alpha is 255.',
    [[0, 0, [255, 0, 0]], [11, 0, [255, 0, 0]], [0, 11, [255, 0, 0]], [8, 8, [255, 0, 0]], [10, 10, W], [14, 0, W], [40, 30, W]],
    `            let inside = x * x + y * y <= 144;\n            pixels[i] = 255;\n            pixels[i + 1] = if inside { 0 } else { 255 };\n            pixels[i + 2] = if inside { 0 } else { 255 };\n            pixels[i + 3] = 255;\n`),
  t2('ring', 'one', 'Write a tile program that draws a yellow (255, 255, 0) ring on a black background: a pixel is yellow when its distance to the centre (width / 2, height / 2) is at least 10 and at most 14. Alpha is 255.',
    [[44, 24, [255, 255, 0]], [32, 12, [255, 255, 0]], [40, 32, [255, 255, 0]], [32, 24, K], [39, 24, K], [49, 24, K], [0, 0, K]],
    `            let dx = x as i64 - (width / 2) as i64;\n            let dy = y as i64 - (height / 2) as i64;\n            let d2 = dx * dx + dy * dy;\n            let level = if d2 >= 100 && d2 <= 196 { 255 } else { 0 };\n            pixels[i] = level;\n            pixels[i + 1] = level;\n            pixels[i + 2] = 0;\n            pixels[i + 3] = 255;\n`),
  t2('two_discs', 'two', 'Write a tile program with a white background and two filled discs of radius 8: a blue (0, 0, 255) one centred at (16, 24) and a red (255, 0, 0) one centred at (48, 24). Alpha is 255.',
    [[16, 24, [0, 0, 255]], [22, 24, [0, 0, 255]], [48, 24, [255, 0, 0]], [48, 18, [255, 0, 0]], [32, 24, W], [16, 36, W], [0, 0, W]],
    `            let dy = y as i64 - 24;\n            let da = x as i64 - 16;\n            let db = x as i64 - 48;\n            let (r, g, b) = if da * da + dy * dy <= 64 {\n                (0, 0, 255)\n            } else if db * db + dy * dy <= 64 {\n                (255, 0, 0)\n            } else {\n                (255, 255, 255)\n            };\n            pixels[i] = r;\n            pixels[i + 1] = g;\n            pixels[i + 2] = b;\n            pixels[i + 3] = 255;\n`),
  t2('hgrad2', 'one', 'Write a tile program that fills the canvas with a horizontal gradient from pure blue (0, 0, 255) at the left edge to pure yellow (255, 255, 0) at the right edge, mixing the two colours linearly. Alpha is 255.',
    [[0, 5, [0, 0, 255]], [63, 40, [255, 255, 0]], [32, 20, [129, 129, 126], 14], [16, 20, [64, 64, 191], 14]],
    `            let k = (x * 255 / (width - 1)) as u8;\n            pixels[i] = k;\n            pixels[i + 1] = k;\n            pixels[i + 2] = 255 - k;\n            pixels[i + 3] = 255;\n`),
  t2('box', 'one', 'Write a tile program that draws a green (0, 255, 0) rectangle on a black background: a pixel is green when x is from 10 to 29 and y is from 5 to 14, both inclusive. Alpha is 255.',
    [[10, 5, [0, 255, 0]], [29, 14, [0, 255, 0]], [20, 10, [0, 255, 0]], [9, 5, K], [30, 14, K], [10, 4, K], [20, 15, K]],
    `            let inside = x >= 10 && x <= 29 && y >= 5 && y <= 14;\n            pixels[i] = 0;\n            pixels[i + 1] = if inside { 255 } else { 0 };\n            pixels[i + 2] = 0;\n            pixels[i + 3] = 255;\n`),
  t2('dstripes', 'one', 'Write a tile program that draws diagonal stripes: a pixel is magenta (255, 0, 255) when ((x + y) / 4) is even, and black when it is odd. Alpha is 255.',
    [[0, 0, [255, 0, 255]], [3, 0, [255, 0, 255]], [4, 0, K], [0, 4, K], [2, 2, K], [4, 4, [255, 0, 255]], [7, 0, K], [8, 0, [255, 0, 255]]],
    `            let level = if ((x + y) / 4) % 2 == 0 { 255 } else { 0 };\n            pixels[i] = level;\n            pixels[i + 1] = 0;\n            pixels[i + 2] = level;\n            pixels[i + 3] = 255;\n`),
  t2('mover', 'one', 'Write a tile program with a black background and one red (255, 0, 0) column, 1 pixel wide, that moves to the right with time: the column is at x = (t_ms / 30) % width. Alpha is 255.',
    [[33, 0, [255, 0, 0]], [33, 47, [255, 0, 0]], [32, 10, K], [34, 10, K], [0, 0, K], [1, 5, K]],
    `            let col = (t_ms as usize / 30) % width;\n            pixels[i] = if x == col { 255 } else { 0 };\n            pixels[i + 1] = 0;\n            pixels[i + 2] = 0;\n            pixels[i + 3] = 255;\n`, [0, 300, 990]),
  t2('bouncer', 'two', 'Write a tile program with a black background and one white row that moves down and bounces back up: with p = (t_ms / 10) % 94, the row is at y = p when p is less than 48, and at y = 94 - p otherwise. Alpha is 255.',
    [[0, 34, W], [63, 34, W], [5, 33, K], [5, 35, K], [5, 12, K], [5, 47, K]],
    `            let p = (t_ms as usize / 10) % 94;\n            let row = if p < 48 { p } else { 94 - p };\n            let level = if y == row { 255 } else { 0 };\n` + gray, [0, 300, 600]),
  t2('fall', 'two', 'Write a tile program that shows a white ball falling under gravity on a black background: a filled disc of radius 3 whose centre is at x = width / 2 and y = 3 + 20 * s * s, where s is the time in seconds (t_ms / 1000, as f32). Alpha is 255.',
    [[32, 23, W], [32, 21, W], [34, 23, W], [32, 3, K], [32, 30, K], [37, 23, K], [0, 0, K]],
    `            let s = t_ms as f32 / 1000.0;\n            let dx = x as f32 - (width / 2) as f32;\n            let dy = y as f32 - (3.0 + 20.0 * s * s);\n            let level = if dx * dx + dy * dy <= 9.0 { 255 } else { 0 };\n` + gray, [0, 500, 1000]),
  t2('swing', 'two', 'Write a tile program that shows a white filled disc of radius 4 on a black background, swinging left and right: its centre is at y = height / 2 and x = width / 2 + 20 * cos(t_ms / 500), computed in f32. Alpha is 255.',
    [[12, 24, W], [14, 24, W], [12, 21, W], [52, 24, K], [32, 24, K], [19, 24, K]],
    `            let cx = (width / 2) as f32 + 20.0 * (t_ms as f32 / 500.0).cos();\n            let dx = x as f32 - cx;\n            let dy = y as f32 - (height / 2) as f32;\n            let level = if dx * dx + dy * dy <= 16.0 { 255 } else { 0 };\n` + gray, [0, 800, 1571]),
  t2('wedge', 'one', 'Write a tile program that draws an orange (255, 128, 0) wedge on a black background, measured from the centre: with dx = x - width / 2 and dy = y - height / 2 (signed numbers), a pixel is orange when dy is at least 0 and dy is at most dx. Alpha is 255.',
    [[32, 24, [255, 128, 0]], [50, 24, [255, 128, 0]], [50, 30, [255, 128, 0]], [45, 37, [255, 128, 0]], [45, 38, K], [50, 23, K], [20, 30, K], [10, 24, K]],
    `            let dx = x as i64 - (width / 2) as i64;\n            let dy = y as i64 - (height / 2) as i64;\n            let inside = dy >= 0 && dy <= dx;\n            pixels[i] = if inside { 255 } else { 0 };\n            pixels[i + 1] = if inside { 128 } else { 0 };\n            pixels[i + 2] = 0;\n            pixels[i + 3] = 255;\n`),
  t2('parabola', 'one', 'Write a tile program that draws a white curve on a black background: for each column x, with d = x - 32 as a signed number, the curve is at row d * d / 24; a pixel is white when its y equals that row. Alpha is 255.',
    [[32, 0, W], [8, 24, W], [56, 24, W], [20, 6, W], [0, 42, W], [20, 7, K], [32, 10, K], [8, 23, K]],
    `            let d = x as i64 - 32;\n            let level = if y as i64 == d * d / 24 { 255 } else { 0 };\n` + gray),
  t2('blend', 'two', 'Write a tile program with two layers. Background: a horizontal gray gradient, level = x * 255 / (width - 1). On top: a filled disc of radius 10 centred at (width / 2, height / 2), pure red at half opacity, so inside the disc each channel is the average of the background level and the red colour (255, 0, 0). Alpha is 255.',
    [[32, 24, [192, 64, 64], 8], [40, 24, [208, 80, 80], 8], [0, 0, K, 4], [63, 10, W, 4], [32, 5, [129, 129, 129], 6]],
    `            let level = x * 255 / (width - 1);\n            let dx = x as i64 - (width / 2) as i64;\n            let dy = y as i64 - (height / 2) as i64;\n            let inside = dx * dx + dy * dy <= 100;\n            pixels[i] = if inside { ((level + 255) / 2) as u8 } else { level as u8 };\n            pixels[i + 1] = if inside { (level / 2) as u8 } else { level as u8 };\n            pixels[i + 2] = if inside { (level / 2) as u8 } else { level as u8 };\n            pixels[i + 3] = 255;\n`),
  t2('sine_bands', 'one', 'Write a tile program that draws horizontal bands whose brightness follows a sine of the row: red, green and blue are all 128 + 127 * sin(y / 4), with y as f32. Alpha is 255.',
    [[5, 0, [128, 128, 128], 4], [60, 6, [254, 254, 254], 4], [5, 19, [1, 1, 1], 4], [30, 13, [114, 114, 114], 4]],
    `            let level = (128.0 + 127.0 * (y as f32 / 4.0).sin()) as u8;\n` + gray),
  t2('dashed', 'two', 'Write a tile program with a black background and a white dashed horizontal line on the row y = height / 2: on that row a pixel is white when (x / 4) is even. Alpha is 255.',
    [[0, 24, W], [3, 24, W], [4, 24, K], [8, 24, W], [8, 23, K], [8, 25, K], [0, 0, K]],
    `            let level = if y == height / 2 && (x / 4) % 2 == 0 { 255 } else { 0 };\n` + gray),
];
