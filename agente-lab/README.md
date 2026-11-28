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

`tasks2.mjs`, conjunto 2 (2026-11-24): 15 tiles a mais, medidos à parte dos 41. Nove pedem um conceito
só (`needs: 'one'`) e seis pedem dois juntos (`needs: 'two'`, por exemplo uma bola que cai: distância
mais a fórmula da queda). Alguns conferem o movimento em tempos próprios (`times`).

`npm run verify` prova que todas as referências passam com o compilador de verdade (tarefas dos dois
conjuntos, receitas e, com `--seeds`, os tiles-semente: 113 de 113). Se uma tarefa nova não passa com a
própria referência, a tarefa está errada.

## O caderno de receitas (`recipes.mjs`)

31 programas pequenos, cada um demonstrando uma ideia dita em uma frase (distância a um ponto, mistura
de duas cores, células, movimento pelo tempo, queda sob gravidade, oscilação, ângulo em torno de um
centro, camadas com opacidade...): 24 de tile e 7 de função. `pick(pedido, tipo, k)` escolhe as `k`
mais próximas do pedido por palavras em comum (peso por raridade da palavra), sem modelo. Com
`--recipes K` elas entram no pedido antes da tarefa.

Regras: uma receita nunca desenha uma figura da régua nem tem o nome de uma função medida. O
`verify` roda cada receita contra a conferência de cada tile dos dois conjuntos e falha se alguma
passar. Várias receitas são vizinhas de tarefas do conjunto 1 (disco e `circle`, células e `checker`),
com outros números e cores: adaptar a ideia é o uso pretendido, e por isso existem as tarefas de dois
conceitos.

Primeira medição (modelo base, sem treino): as receitas no pedido não mudaram a nota. Números em
`results/receitas/` e a leitura em `docs/agente-rust-wasm.md` do site.

## Como rodar

Precisa de Node 22 ou mais novo e do Playwright com o Chromium (instalado aqui ou globalmente:
`npm install -g playwright && npx playwright install chromium`).

```sh
npm install        # o motor de inferência (wllama)
npm run site       # baixa do site o worker de build, o núcleo WASI e o compilador (58 MB)
npm run verify     # as referências passam?
mkdir -p models && curl -L -o models/qwen2.5-coder-0.5b-instruct-q4_0.gguf \
  https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-0.5b-instruct-q4_0.gguf
node run.mjs --model qwen2.5-coder-0.5b-instruct-q4_0.gguf
```

Opções do `run.mjs`: `--calls N` (chamadas ao modelo por tarefa, padrão 3), `--only id,id`,
`--few` (dois exemplos resolvidos de tarefas parecidas antes do pedido), `--recipes K` (K receitas
do caderno antes do pedido), `--set 1|2|all` (qual conjunto; padrão 1), `--kind fn|tile`, `--seed N`,
`--temp T`, `--shard i/n` (uma de n fatias do conjunto, para repartir a medição entre máquinas) e
`--out arquivo.json`.

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

## Treinar na sua máquina (`train/`)

O treino é um ajuste pequeno (LoRA) do Qwen2.5-Coder-0.5B, feito só com CPU. Não precisa de Node,
de navegador nem de placa de vídeo: os exemplos já estão no repositório (`data/out/examples.jsonl`).
Precisa de Python 3.11 ou mais novo, uns 6 GB de memória livre e 4 GB de disco (o modelo de base,
1 GB, é baixado do Hugging Face na primeira vez).

macOS ou Linux:

```sh
cd agente-lab
python3 -m venv .venv && . .venv/bin/activate
pip install -r train/requirements.txt
python train/train.py --out runs/teste --limit 20          # ensaio de dois minutos
python train/train.py --out runs/v5 --write-copies 1 --repairs 250
python train/train.py --out runs/v5 --write-copies 1 --repairs 250 --resume   # se parou no meio
```

Windows 11 (PowerShell):

```powershell
cd agente-lab
py -m venv .venv; .venv\Scripts\Activate.ps1
pip install -r train\requirements.txt
python train\train.py --out runs\teste --limit 20
python train\train.py --out runs\v5 --write-copies 1 --repairs 250
```

O que sai em `runs/<nome>/`: `adapter/` (o ajuste, 34 MB), `merged/` (o modelo inteiro, 1,9 GB) e
`log.json` (a perda passo a passo e nos exemplos guardados de fora, antes e depois).

Para o modelo virar o arquivo que a página e a medição usam (GGUF, 4 bits):

```sh
python train/to_gguf.py --base models/qwen2.5-coder-0.5b-instruct-q4_0.gguf --merged runs/v5/merged --out models/v5-q4_0.gguf
node run.mjs --model v5-q4_0.gguf --calls 1 --temp 0.3 --seed 1 --set all    # ver "Como rodar"
```

O que foi medido e o que não foi:

- Medido: Linux, 4 núcleos, sem GPU: 4 a 6 segundos por passo, 50 minutos para 750 exemplos.
- **Não testado: macOS e Windows.** As bibliotecas existem para os dois e o código não usa nada
  específico de sistema, mas nenhum treino rodou neles ainda. O primeiro ensaio (`--limit 20`) é o
  teste.
- Num Mac da série M, `--device mps` usa a GPU do aparelho e deve ser bem mais rápido que a CPU.
  Também não testado: rode o ensaio de 20 passos com e sem ele e compare os segundos por passo e a
  perda. Se alguma operação faltar, `PYTORCH_ENABLE_MPS_FALLBACK=1` antes do comando faz essa parte
  voltar para a CPU.
- **O treino continua de onde parou.** A cada 25 passos (`--save-every`) ele grava
  `runs/<nome>/checkpoint.pt` (uns 100 MB, apagado ao terminar), e também ao receber Ctrl+C. O mesmo
  comando com `--resume` no fim continua dali; se as opções ou os exemplos mudaram, ele recusa em vez
  de misturar. Conferido em CPU: parar no passo 3 e continuar até o 6 deu exatamente os mesmos pesos
  que rodar os 6 direto (diferença 0). Se a máquina desligar sem aviso, perdem-se no máximo os
  passos desde a última gravação. Com `--device mps` a continuação funciona, mas a igualdade exata
  não foi conferida.
- Aparelhos diferentes dão pesos um pouco diferentes (a ordem das contas em ponto flutuante muda).
  Para comparar dois modelos, o que vale é a medição com três sementes, não a perda.

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

### Variações das receitas (`data/variants.mjs`)

`node data/variants-gen.mjs --per 14` transforma o caderno de receitas em exemplos de escrita de
tiles. São 27 moldes (um por ideia: disco, anel, mistura de cores, células, faixas, movimento, queda,
balanço, ângulo, ruído, camadas...), e cada molde escreve programas com outros números, cores,
posições e jeitos de pedir. A resposta começa com a ideia em uma frase, como comentário.

A prova de cada variação: o compilador de verdade constrói o programa, ele roda em dois tamanhos de
canvas (64×48 e 80×40) e em cada um dos seus tempos, e a imagem inteira é comparada, pixel a pixel,
com uma referência calculada em JavaScript pelo mesmo molde. Uma variação que passe na conferência de
algum tile da régua é descartada. Resultado de 2026-11-28: 370 de 378 ficam (`data/out/variants.jsonl`),
nenhuma falhou na própria prova, oito descartadas por passarem numa conferência da régua (quase
todas na do `solid`, que olha poucos pontos).

Fica de fora de propósito: um disco que se move. O conjunto 2 pede movimento e forma juntos, e essa
combinação deve continuar nunca vista no treino.

`data/examples.mjs` junta as variações aos outros exemplos; no `train.py`, uma em cada sete de cada
molde fica fora do treino, para acompanhar a perda (`--write-copies` e `--repairs` regulam o resto
da mistura).

Limites conhecidos:

- **As sementes nunca são tarefas de medição.** `gen.mjs` recusa rodar se uma semente define uma
  função que existe em `tasks.mjs`. Ao criar tarefa ou semente, mantenha os dois conjuntos separados.
- **Os pares de teste dizem pouco.** A saída do teste hoje é só "the program trapped (unreachable)":
  a mensagem do `assert` (esquerda e direita) não chega. Melhorar isso é trabalho no worker do site.
- São erros de um lugar só, em programas pequenos e parecidos. Servem de primeiro degrau, não
  substituem erros reais de quem usa.

