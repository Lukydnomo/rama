# Fontes

A identidade do R.A.M.A. usa a família **PixelMplus**, de itouhiro
(<https://itouhiro.hatenablog.com/entry/20130602/font>), distribuída sob a
licença M+ FONT LICENSE.

**Os arquivos não acompanham este repositório.** Enquanto eles não estiverem
aqui, o sistema cai na monoespaçada do sistema operacional — tudo continua
funcionando, só muda a letra.

## O que colocar aqui

Baixe o pacote PixelMplus e coloque nesta pasta, com **exatamente** estes nomes:

| Arquivo                        | Onde é usado                                  |
|--------------------------------|-----------------------------------------------|
| `PixelMplus12-Regular.woff2`   | texto normal, campos, fichas, navegação       |
| `PixelMplus12-Bold.woff2`      | títulos, números principais, o que decide     |
| `PixelMplus10-Regular.woff2`   | rótulos pequenos, datas, informação secundária|
| `PixelMplus10-Bold.woff2`      | rótulos pequenos importantes                  |

O `css/base.css` também aceita `.ttf` com os mesmos nomes, como segunda opção —
útil porque o pacote original vem em TTF. Converter para WOFF2 vale a pena: o
arquivo fica cerca de quatro vezes menor.

Se você renomear os arquivos, ajuste os quatro blocos `@font-face` no
`css/base.css`. **Não** renomeie outra fonte para PixelMplus: o sistema ficaria
mentindo sobre a própria identidade e a grade de 12px não bateria.
