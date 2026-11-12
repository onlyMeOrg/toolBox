# Código de terceiros nos dados de treino

`data/imported.mjs` é escrito por `data/import.mjs` a partir de dois repositórios, ambos sob a licença
MIT. Cada programa guarda no campo `source` o repositório, o commit e o caminho de onde veio. O código
das soluções e dos testes está como na origem, a não ser por: comentários retirados das soluções do
TheAlgorithms, `#[ignore]` retirado dos testes do Exercism, e os testes postos num módulo ao lado do
código. Os enunciados são resumos do texto de cada exercício ou do comentário da função.

## exercism/rust

https://github.com/exercism/rust, commit `523fff27328e9b85085cd7eb7bd6ac36af730433`

    MIT License

    Copyright (c) 2021 Exercism

## TheAlgorithms/Rust

https://github.com/TheAlgorithms/Rust, commit `fed66cb0c74c4a939ec5163648458a8c2b46fd4c`

    MIT License

    Copyright (c) 2019 The Algorithms

## Texto da licença MIT (vale para os dois)

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
