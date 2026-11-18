"""First fine-tuning of the agent's base model, on CPU: LoRA by backpropagation over the examples of
data/out/examples.jsonl (data/examples.mjs). The loss counts only the answer, never the prompt.

    python train/train.py --out runs/v1 [--epochs 1] [--lr 1e-4] [--rank 16] [--limit N]

Writes the adapter, a merged model ready for llama.cpp's convert_hf_to_gguf.py, and log.json with
the loss on seeds kept out of training, before and after. Needs torch, transformers and peft.
"""
import argparse, json, random, time
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
args = parser.parse_args()
random.seed(args.seed)
torch.manual_seed(args.seed)

rows = [json.loads(line) for line in open(args.examples, encoding="utf8")]
seeds = sorted({r["seed"] for r in rows})
held = set(seeds[5::11])  # whole seeds kept out: their loss says whether it learns or memorises
# How often each kind is seen. Writing comes three times (few examples, and the tile contract is
# new to the model); repairs the compiler already makes by itself come one time in three.
def copies(r):
    if r["kind"] == "write":
        return 3
    if r.get("autofix") in ("sure", "maybe"):
        return 1 if random.random() < 1 / 3 else 0
    if r.get("stage") == "test":
        return 1 if random.random() < 1 / 2 else 0
    return 1

train = [r for r in rows if r["seed"] not in held for _ in range(copies(r))]
check = [r for r in rows if r["seed"] in held and (r["kind"] == "write" or r.get("autofix") in ("none", "other"))]

tok = AutoTokenizer.from_pretrained(BASE)
def encode(r):
    prompt = tok(r["prompt"], add_special_tokens=False).input_ids
    answer = tok(r["answer"], add_special_tokens=False).input_ids
    ids = (prompt + answer)[-args.max_tokens:] if len(prompt) + len(answer) > args.max_tokens else prompt + answer
    labels = ([-100] * len(prompt) + answer)[-len(ids):]
    return torch.tensor([ids]), torch.tensor([labels])

model = AutoModelForCausalLM.from_pretrained(BASE, torch_dtype=torch.float32)
model = get_peft_model(model, LoraConfig(r=args.rank, lora_alpha=2 * args.rank, lora_dropout=0.05, target_modules=MODULES, task_type="CAUSAL_LM"))
trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)

def held_loss():
    model.eval()
    total = 0.0
    with torch.no_grad():
        for r in check:
            ids, labels = encode(r)
            total += model(input_ids=ids, labels=labels).loss.item()
    model.train()
    return total / max(1, len(check))

log = {"base": BASE, "rank": args.rank, "lr": args.lr, "epochs": args.epochs, "trainable": trainable,
       "examples": len(train), "heldSeeds": sorted(held), "heldExamples": len(check), "threads": torch.get_num_threads(), "steps": []}
print(json.dumps({k: v for k, v in log.items() if k != "steps"}), flush=True)
log["heldBefore"] = held_loss()
print("held-out loss before", round(log["heldBefore"], 4), flush=True)

steps = args.epochs * len(train)
opt = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=args.lr, weight_decay=0.0)
sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: min(1.0, (s + 1) / 20) * max(0.05, 1 - s / steps))
start = time.time()
step = 0
running = None
model.train()
for epoch in range(args.epochs):
    random.shuffle(train)
    for r in train:
        ids, labels = encode(r)
        loss = model(input_ids=ids, labels=labels).loss
        loss.backward()
        torch.nn.utils.clip_grad_norm_([p for p in model.parameters() if p.requires_grad], 1.0)
        opt.step(); sched.step(); opt.zero_grad()
        step += 1
        running = loss.item() if running is None else 0.95 * running + 0.05 * loss.item()
        if step % 20 == 0 or step == 1:
            log["steps"].append({"step": step, "loss": round(running, 4), "seconds": round(time.time() - start)})
            print(f"step {step}/{steps} loss {running:.4f} {time.time() - start:.0f} s", flush=True)
        if args.limit and step >= args.limit:
            break
    if args.limit and step >= args.limit:
        break

log["heldAfter"] = held_loss()
log["seconds"] = round(time.time() - start)
print("held-out loss after", round(log["heldAfter"], 4), flush=True)
out = Path(args.out)
out.mkdir(parents=True, exist_ok=True)
model.save_pretrained(out / "adapter")
merged = model.merge_and_unload()
merged.save_pretrained(out / "merged")
tok.save_pretrained(out / "merged")
(out / "log.json").write_text(json.dumps(log, indent="\t") + "\n")
print("written to", out)
