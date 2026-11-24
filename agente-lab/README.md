# agente-lab

O laboratório do agente de [outropedro.com.br/agente/](https://outropedro.com.br/agente/): um conjunto
de medição e o laço do agente, rodando num Chromium sem tela com o mesmo compilador de Rust que a
página usa. Serve para dar um número a cada versão do modelo e do laço.

O laço é o que a página vai rodar: o modelo escreve, o `rustc` de verdade compila (em WebAssembly, no
navegador), as correções que o próprio compilador sugere são aplicadas por código, o modelo conserta o
que sobrar, e um teste escondido decide.

## O conjunto de medição

`tasks.mjs`, versão 1: 41 tarefas fáceis, cada uma com uma solução de referência.

- 32 de função (`kind: "fn"`): o pedido descreve uma função; um `#[test]` escondido é acrescentado ao
  arquivo e rodado.
- 9 de tile (`kind: "tile"`): o pedido descreve uma imagem; o programa roda três quadros num canvas de
  64×48 e os pixels são conferidos.

Regra: nenhuma tarefa daqui entra em dado de treino.

`npm run verify` prova que as 41 referências passam com o compilador de verdade. Se uma tarefa nova
não passa com a própria referência, a tarefa está errada.

## Como rodar

Precisa de Node 22 ou mais novo e do Playwright com o Chromium (instalado aqui ou globalmente:
`npm install -g playwright && npx playwright install chromium`).

```sh
npm install        # o motor de inferência (wllama)
npm run site       # baixa do site o worker de build, o núcleo WASI e o compilador (58 MB)
npm run verify     # as 41 referências passam?
mkdir -p models && curl -L -o models/qwen2.5-coder-0.5b-instruct-q4_0.gguf \
  https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-0.5b-instruct-q4_0.gguf
node run.mjs --model qwen2.5-coder-0.5b-instruct-q4_0.gguf
```

Opções do `run.mjs`: `--calls N` (chamadas ao modelo por tarefa, padrão 3), `--only id,id`,
`--few` (dois exemplos resolvidos de tarefas parecidas antes do pedido), `--shard i/n` (uma de n
fatias do conjunto, para repartir a medição entre máquinas) e `--out arquivo.json`.

`AGENTE_SITE=https://…` no `npm run site` aponta para outra publicação do site (uma prévia).
`AGENTE_MODELS=pasta` diz onde estão os arquivos GGUF.

## O que sai

Um JSON em `results/` com o resumo (acertos, acertos de primeira, por tipo de tarefa, tokens por
segundo, segundos por tarefa) e, para cada tarefa, cada passo do laço com o código gerado.

## Limites

- Sem placa de vídeo no Chromium sem tela, a inferência roda em CPU: cerca de 5 a 7 tokens por
  segundo com o modelo de 0,5 bilhão em 4 threads. As 41 tarefas levam de meia hora a uma hora e meia.
- As tarefas são fáceis de propósito. Passar nelas não quer dizer que o agente é útil; não passar
  quer dizer que não é.
- Os arquivos do site (`site/`) e os modelos (`models/`) não entram no repositório.

## De onde vem cada peça

O worker de build e o núcleo WASI são os do site, baixados em produção; a cadeia é a do projeto
[rust-playground-inbrowser](https://github.com/ryancbuckley/rust-playground-inbrowser) (Apache-2.0), e o
compilador é o construído pela receita em [`../agente-toolchain/`](../agente-toolchain/). A
inferência é o [wllama](https://github.com/ngxson/wllama) (MIT).

## Dados de treino por mutação (`data/`)

**Programas de fora.** `node data/import.mjs --exercism <clone> --algorithms <clone>` traz programas com
testes do Exercism (trilha de Rust) e do TheAlgorithms/Rust, os dois MIT (`NOTICE.md`): só biblioteca
padrão, até 60 linhas, API pública pequena, e nada que seja uma tarefa da medição com outro nome. O
compilador prova cada um antes de usar; os que não passam ficam de fora (`seedsFailing` no resumo).

`npm run data` gera pares de erro e correção sem modelo nenhum: parte de programas corretos
(`data/seeds.mjs`: 96 nossas, 70 de função com teste e 26 de tile, mais as de fora em
`data/imported.mjs`, ver abaixo), quebra cada um num lugar por vez
(`data/mutate.mjs`, 33 operadores: um `mut` que falta, um tipo trocado, um método que não existe em
Rust, uma comparação invertida…) e passa cada mutante pelo compilador de verdade, o mesmo da página.

- Não compila: vira um par com o arquivo quebrado, os erros do compilador (no mesmo texto que o laço
  mostra ao modelo) e o arquivo correto.
- Compila e falha no teste da semente: vira um par de "resultado errado".
- Continua passando, ou o erro cai no teste escondido (assinatura trocada): descartado.

Cada par diz se as correções do próprio compilador já devolvem o arquivo original (`autofix`:
`sure`, `maybe`, `other`, `none`); o laço aplica essas sem o modelo, então o treino deve pesar mais os
outros.

Resultado de 2026-11-11 (`data/out/pairs.jsonl`, resumo em `pairs.summary.json`): 526 pares em 3 min
50 s, 423 de compilação e 103 de teste. Dos 423, a correção sugerida pelo compilador refaz o original
em 258 (61 %).

Limites conhecidos:

- **As sementes nunca são tarefas de medição.** `gen.mjs` recusa rodar se uma semente define uma
  função que existe em `tasks.mjs`. Ao criar tarefa ou semente, mantenha os dois conjuntos separados.
- **Os pares de teste dizem pouco.** A saída do teste hoje é só "the program trapped (unreachable)":
  a mensagem do `assert` (esquerda e direita) não chega. Melhorar isso é trabalho no worker do site.
- São erros de um lugar só, em programas pequenos e parecidos. Servem de primeiro degrau, não
  substituem erros reais de quem usa.

