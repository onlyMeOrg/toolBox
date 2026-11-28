"""First fine-tuning of the agent's base model, on CPU: LoRA by backpropagation over the examples of
data/out/examples.jsonl (data/examples.mjs). The loss counts only the answer, never the prompt.

    python train/train.py --out runs/v1 [--epochs 1] [--lr 1e-4] [--rank 16] [--limit N] [--device cpu|mps|cuda]

Writes the adapter, a merged model ready for llama.cpp's convert_hf_to_gguf.py, and log.json with
the loss on seeds kept out of training, before and after. A checkpoint is written every --save-every
steps (and on Ctrl+C); the same command with --resume continues from it. Needs torch, transformers and peft.
"""
import argparse, hashlib, json, os, random, time
from pathlib import Path

import torch
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM, AutoTokenizer

BASE = "Qwen/Qwen2.5-Coder-0.5B-Instruct"
MODULES = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]

parser = argparse.ArgumentParser()
parser.add_argument("--examples", default="data/out/examples.jsonl")
parser.add_argument("--out", required=True)
parser.add_argument("--epochs", type=int, default=1)
parser.add_argument("--lr", type=float, default=1e-4)
parser.add_argument("--rank", type=int, default=16)
parser.add_argument("--max-tokens", type=int, default=1100)
parser.add_argument("--limit", type=int, default=0, help="stop after this many steps (a smoke run)")
parser.add_argument("--seed", type=int, default=1)
parser.add_argument("--device", default="cpu", help="cpu (the measured path), mps (Apple Silicon) or cuda")
parser.add_argument("--save-every", type=int, default=25, help="write a checkpoint every this many steps (0 = never)")
parser.add_argument("--resume", action="store_true", help="continue from the checkpoint in --out, with the same options")
parser.add_argument("--stop-at", type=int, default=0, help="stop after this step as Ctrl+C would (to try --resume)")
parser.add_argument("--threads", type=int, default=0, help="CPU threads (0 = what torch chooses)")
parser.add_argument("--write-copies", type=int, default=3, help="how many times a seed's write example is seen")
parser.add_argument("--repairs", type=int, default=0, help="keep at most this many repair examples (0 = all that the sampling keeps)")
args = parser.parse_args()
random.seed(args.seed)
if args.threads:
    torch.set_num_threads(args.threads)
device = torch.device(args.device)
torch.manual_seed(args.seed)

rows = [json.loads(line) for line in open(args.examples, encoding="utf8")]
seeds = sorted({r["seed"] for r in rows if not r.get("variant")})
held = set(seeds[5::11])  # whole seeds kept out: their loss says whether it learns or memorises
# Variants of the recipe notebook: one in seven of each template is kept out instead (index 6 and 13).
held_variant = lambda r: r.get("variant") and int(r["id"].split(":")[1]) % 7 == 6
# How often each kind is seen. Writing comes three times (few examples, and the tile contract is
# new to the model); repairs the compiler already makes by itself come one time in three.
def copies(r):
    if r.get("variant"):
        return 1
    if r["kind"] == "write":
        return args.write_copies
    if r.get("autofix") in ("sure", "maybe"):
        return 1 if random.random() < 1 / 3 else 0
    if r.get("stage") == "test":
        return 1 if random.random() < 1 / 2 else 0
    return 1

train = [r for r in rows if r["seed"] not in held and not held_variant(r) for _ in range(copies(r))]
if args.repairs:
    repairs = [r for r in train if r["kind"] == "repair"]
    random.shuffle(repairs)
    train = [r for r in train if r["kind"] != "repair"] + repairs[:args.repairs]
check = [r for r in rows if r["seed"] in held and (r["kind"] == "write" or r.get("autofix") in ("none", "other"))]
check_variants = [r for r in rows if held_variant(r)]

tok = AutoTokenizer.from_pretrained(BASE)
def encode(r):
    prompt = tok(r["prompt"], add_special_tokens=False).input_ids
    answer = tok(r["answer"], add_special_tokens=False).input_ids
    ids = (prompt + answer)[-args.max_tokens:] if len(prompt) + len(answer) > args.max_tokens else prompt + answer
    labels = ([-100] * len(prompt) + answer)[-len(ids):]
    return torch.tensor([ids], device=device), torch.tensor([labels], device=device)

model = AutoModelForCausalLM.from_pretrained(BASE, torch_dtype=torch.float32)
model = get_peft_model(model, LoraConfig(r=args.rank, lora_alpha=2 * args.rank, lora_dropout=0.05, target_modules=MODULES, task_type="CAUSAL_LM"))
model.to(device)
trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)

def held_loss(rows=None):
    rows = check if rows is None else rows
    model.eval()
    total = 0.0
    with torch.no_grad():
        for r in rows:
            ids, labels = encode(r)
            total += model(input_ids=ids, labels=labels).loss.item()
    model.train()
    return total / max(1, len(rows))

# The order of the whole run is decided before the first step, so a run that stops can continue.
order = []
for epoch in range(args.epochs):
    random.shuffle(train)
    order += train
steps = len(order)
out = Path(args.out)
ckpt = out / "checkpoint.pt"
# What must be equal for a checkpoint to be continued: the options that shape the run and the exact order of the examples.
key = hashlib.sha256(json.dumps([BASE, args.rank, args.lr, args.epochs, args.max_tokens, args.seed, [r["id"] for r in order]]).encode()).hexdigest()
opt = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=args.lr, weight_decay=0.0)
sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: min(1.0, (s + 1) / 20) * max(0.05, 1 - s / steps))
adapter = lambda: {n: p.detach().cpu() for n, p in model.named_parameters() if p.requires_grad}

log = {"base": BASE, "rank": args.rank, "lr": args.lr, "epochs": args.epochs, "trainable": trainable,
       "examples": len(train), "variants": sum(1 for r in train if r.get("variant")), "repairs": sum(1 for r in train if r["kind"] == "repair"), "heldVariants": len(check_variants), "heldSeeds": sorted(held), "heldExamples": len(check), "device": args.device, "threads": torch.get_num_threads(), "steps": []}
step = 0
running = None
spent = 0.0  # seconds of training before this session
if args.resume:
    if not ckpt.exists():
        raise SystemExit(f"--resume: there is no checkpoint in {out}")
    saved = torch.load(ckpt, map_location="cpu", weights_only=False)
    if saved["key"] != key:
        raise SystemExit("--resume: the checkpoint was made with other options or other examples; use the same command, or start again without --resume")
    with torch.no_grad():
        for n, p in model.named_parameters():
            if p.requires_grad:
                p.copy_(saved["adapter"][n])
    opt.load_state_dict(saved["opt"])
    sched.load_state_dict(saved["sched"])
    torch.set_rng_state(saved["rng"])
    step, running, spent, log = saved["step"], saved["running"], saved["seconds"], saved["log"]
    log["resumed"] = log.get("resumed", []) + [step]
    print(f"continuing from step {step}/{steps}", flush=True)
else:
    print(json.dumps({k: v for k, v in log.items() if k != "steps"}), flush=True)
    log["heldBefore"] = held_loss()
    log["heldVariantsBefore"] = held_loss(check_variants)
    print("held-out loss before", round(log["heldBefore"], 4), "variants", round(log["heldVariantsBefore"], 4), flush=True)

start = time.time()
def save():
    out.mkdir(parents=True, exist_ok=True)
    tmp = out / "checkpoint.pt.tmp"
    torch.save({"key": key, "step": step, "running": running, "seconds": spent + time.time() - start, "log": log,
                "adapter": adapter(), "opt": opt.state_dict(), "sched": sched.state_dict(), "rng": torch.get_rng_state()}, tmp)
    os.replace(tmp, ckpt)  # never leaves half a file behind

model.train()
last = min(steps, args.limit) if args.limit else steps
try:
    while step < last:
        ids, labels = encode(order[step])
        loss = model(input_ids=ids, labels=labels).loss
        loss.backward()
        torch.nn.utils.clip_grad_norm_([p for p in model.parameters() if p.requires_grad], 1.0)
        opt.step(); sched.step(); opt.zero_grad()
        step += 1
        running = loss.item() if running is None else 0.95 * running + 0.05 * loss.item()
        if step % 20 == 0 or step == 1:
            log["steps"].append({"step": step, "loss": round(running, 4), "seconds": round(spent + time.time() - start)})
            print(f"step {step}/{steps} loss {running:.4f} {spent + time.time() - start:.0f} s", flush=True)
        if args.save_every and step % args.save_every == 0 and step < last:
            save()
        if step == args.stop_at:
            raise KeyboardInterrupt
except KeyboardInterrupt:
    # Ctrl+C between two steps loses nothing; in the middle of one, that step is done again.
    opt.zero_grad()
    save()
    raise SystemExit(f"stopped at step {step}/{steps}; the same command with --resume continues")

log["heldAfter"] = held_loss()
log["heldVariantsAfter"] = held_loss(check_variants)
log["seconds"] = round(spent + time.time() - start)
print("held-out loss after", round(log["heldAfter"], 4), "variants", round(log["heldVariantsAfter"], 4), flush=True)
out.mkdir(parents=True, exist_ok=True)
model.save_pretrained(out / "adapter")
merged = model.merge_and_unload().to("cpu")
merged.save_pretrained(out / "merged")
tok.save_pretrained(out / "merged")
(out / "log.json").write_text(json.dumps(log, indent="\t") + "\n")
ckpt.unlink(missing_ok=True)
print("written to", out)
