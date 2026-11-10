# agente-toolchain

O compilador de Rust que roda no navegador em [outropedro.com.br/agente/](https://outropedro.com.br/agente/):
o `rustc` (com o Cranelift gerando o código), a biblioteca padrão e o linker
[wild](https://github.com/wild-linker/wild), compilados para WebAssembly.

Esta pasta não tem código do compilador. Ela tem a receita: um workflow
(`.github/workflows/agente-toolchain.yml`) que constrói os binários a partir de fontes fixadas e os
publica numa release deste repositório, com a tag `toolchain-<data do nightly>-<commit da receita>`.

## De onde vem

A cadeia é a do projeto [rust-playground-inbrowser](https://github.com/ryancbuckley/rust-playground-inbrowser),
de Ryan Buckley (Apache-2.0). Os scripts dele buscam o `rust-lang/rust` e o `wild` em commits exatos,
aplicam os patches do projeto e compilam. O workflow daqui roda esses scripts num commit fixado do
projeto, sem alterá-los, e empacota o resultado.

## O que sai numa release

| Arquivo | O que é |
|---|---|
| `rustc.wasm.gz` | o compilador, com Clippy e rustfmt embutidos |
| `wild.wasm.gz` | o linker |
| `sysroot.bundle` | a biblioteca padrão e o runtime C para `wasm32-wasip1-threads` |
| `licenses.html` | os avisos de licença de tudo o que os três carregam |
| `SHA256SUMS` | o hash de cada arquivo |

O site baixa a release no build dele e confere o hash de cada arquivo contra o que está fixado no
repositório do site.

## Como rodar

Em Actions, `Toolchain do agente`, `Run workflow`. Leva cerca de 40 minutos em 4 núcleos e usa perto de
14 GB de disco. O resumo da execução imprime o bloco para colar no `src/data/site.json` do site.

Para atualizar o compilador, troque os commits em `env` no workflow.

O compilador e o linker saem idênticos byte a byte em duas máquinas Linux x86_64 (conferido uma vez:
um build local e o do GitHub deram o mesmo sha256). A biblioteca padrão empacotada difere em algumas
centenas de bytes entre builds. Por isso o site fixa o hash de cada arquivo da release que usa.

Dentro do GitHub Actions, o passo do `rustc` roda sem as variáveis `GITHUB_ACTIONS` e `CI`: com elas o
bootstrap do Rust age como no CI do próprio Rust e procura um LLVM pronto que não existe.

## Licenças

Os binários publicados carregam código de centenas de projetos abertos (Rust, Cranelift, wild,
wasi-libc e outros), quase todos sob MIT ou Apache-2.0; `licenses.html` lista cada um, gerado pelo
`toolchain-licenses.py` com o gerador do próprio projeto de referência.
