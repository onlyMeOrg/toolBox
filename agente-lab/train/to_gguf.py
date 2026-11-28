"""Puts fine-tuned weights into a GGUF file, using the base model's GGUF as the mould.

    python train/to_gguf.py --base models/qwen2.5-coder-0.5b-instruct-q4_0.gguf --merged runs/v1/merged --out models/v1-q4_0.gguf
    python train/to_gguf.py --base … --merged Qwen/Qwen2.5-Coder-0.5B-Instruct --out models/base-plain-q4_0.gguf

The metadata and the tokenizer are copied from the base file; every tensor is taken from the
Hugging Face model and stored in the type the base file has it (Q4_0 stays Q4_0). It only needs the
`gguf` package, no llama.cpp build.

Every tensor, not only the ones the adapter changes: the official GGUF files of this model are made
from AWQ weights, whose norms and matrices are rescaled together, so mixing them with plain matrices
gives a model that writes garbage. For the same reason, a fine-tuned file is to be compared with the
base model written by this same script (the second command), not with the official file.
"""
import argparse

import torch
from gguf import GGMLQuantizationType, GGUFReader, GGUFValueType, GGUFWriter, quants
from transformers import AutoModelForCausalLM

# GGUF name → Hugging Face name, inside a block and outside.
BLOCK = {"attn_q": "self_attn.q_proj", "attn_k": "self_attn.k_proj", "attn_v": "self_attn.v_proj", "attn_output": "self_attn.o_proj",
         "ffn_gate": "mlp.gate_proj", "ffn_up": "mlp.up_proj", "ffn_down": "mlp.down_proj",
         "attn_norm": "input_layernorm", "ffn_norm": "post_attention_layernorm"}
TOP = {"token_embd.weight": "model.embed_tokens.weight", "output.weight": "lm_head.weight", "output_norm.weight": "model.norm.weight"}

parser = argparse.ArgumentParser()
parser.add_argument("--base", required=True)
parser.add_argument("--merged", required=True, help="a folder written by train.py, or a Hugging Face model name")
parser.add_argument("--out", required=True)
parser.add_argument("--adapter", help="an adapter folder written by train.py, merged in memory into --merged (then a model name): no 1.9 GB folder needed")
parser.add_argument("--type", help="store the matrices the base file has in Q4_0 in this type instead (Q8_0, F16): to see what the 4 bits cost")
args = parser.parse_args()

reader = GGUFReader(args.base)
model = AutoModelForCausalLM.from_pretrained(args.merged, dtype=torch.float32)
if args.adapter:
    from peft import PeftModel
    model = PeftModel.from_pretrained(model, args.adapter).merge_and_unload()
weights = model.state_dict()

def source(name):
    """The Hugging Face tensor for a GGUF tensor."""
    if name in TOP:
        return weights[TOP[name]].numpy()
    _, block, part, kind = name.split(".")
    return weights[f"model.layers.{block}.{BLOCK[part]}.{kind}"].numpy()

writer = GGUFWriter(args.out, arch=reader.fields["general.architecture"].contents())
for name, field in reader.fields.items():
    if name.startswith("GGUF.") or name == "general.architecture":
        continue
    kind = field.types[0]
    writer.add_key_value(name, field.contents(), kind, sub_type=field.types[-1] if kind == GGUFValueType.ARRAY else None)
for tensor in reader.tensors:
    matrix = source(tensor.name)
    kind = tensor.tensor_type
    if args.type and kind == GGMLQuantizationType.Q4_0:
        kind = GGMLQuantizationType[args.type]
    data = quants.quantize(matrix, kind)
    assert args.type or data.shape == tensor.data.shape, tensor.name
    writer.add_tensor(tensor.name, data, raw_dtype=kind)
writer.write_header_to_file()
writer.write_kv_data_to_file()
writer.write_tensors_to_file()
writer.close()
print(f"{args.out}: {len(reader.tensors)} tensors")
