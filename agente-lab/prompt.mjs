// The words the agent's loop says to the model. One place, so the measuring loop (lab.html) and the
// training examples (data/examples.mjs) can never drift apart.
export const SYS = 'You are an expert Rust programmer. You write one complete Rust library file (edition 2024, standard library only, no external crates, no fn main, no tests).';
export const TILE_NOTE = '\nIt is a "tile" program: the host calls init once and frame every frame; frame returns the RGBA pixels. Complete the file that is started for you: write the body of the loop (set pixels[i], pixels[i + 1], pixels[i + 2] and pixels[i + 3]), close the loops, and end frame with `pixels.as_ptr()`.';
/** What went wrong, by the stage that stopped the attempt; `detail` is the compiler's errors or the run's output. */
export const whyText = (stage, detail) => stage === 'compile' ? `It does not compile:\n${detail}` : stage === 'test' ? `It compiles, but it gives wrong results:\n${detail}` : stage === 'run' ? `It compiles, but it fails when it runs: ${detail}` : 'It compiles and runs, but the picture is not what was asked.';
export const repairUser = (ask, code, why) => `${ask}\n\nThis attempt is wrong:\n\`\`\`rust\n${code}\`\`\`\n${why}\n\nWrite the whole corrected file.`;
export const chatml = (user, prefill) => `<|im_start|>system\n${SYS}<|im_end|>\n<|im_start|>user\n${user}<|im_end|>\n<|im_start|>assistant\n\`\`\`rust\n${prefill}`;
