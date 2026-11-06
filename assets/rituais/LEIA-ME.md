# Símbolos dos rituais do catálogo

Cada ritual do catálogo oficial de Ordem Paranormal (`js/ordem/rituais-dados.js`)
tem uma pasta aqui, com um arquivo **`simbolo.png`**. Hoje todos são
**provisórios** — o mesmo selo neutro (dois anéis, triângulo e olho) — para você
trocar pela arte de cada ritual sem mexer no código.

| Arquivo          | Formato                                        | Onde aparece |
|------------------|------------------------------------------------|--------------|
| `simbolo.png`    | quadrado, **100 × 100 px**, fundo transparente | miniatura ao lado do nome (biblioteca de rituais, aba Rituais da ficha, Homebrew) e o símbolo maior junto aos dados de conjuração, na consulta aberta |
| `provisorio.png` | o mesmo formato                                | ritual sem vínculo com o catálogo (criado do zero) e qualquer símbolo que não carregar |

## Onde fica cada ritual

A pasta sai do **id** do ritual, sem o `ritual.`, usando o **prefixo do id** (que
nem sempre é a fonte mostrada na tela):

```
op.ritual.cicatrizacao          → assets/rituais/op/cicatrizacao/simbolo.png
op.ritual.amaldicoar-arma       → assets/rituais/op/amaldicoar-arma/simbolo.png
sah.ritual.<nome>               → assets/rituais/sah/<nome>/simbolo.png
as2.ritual.<nome>               → assets/rituais/as2/<nome>/simbolo.png
```

`op` é o livro básico; `sah`, Sobrevivendo ao Horror; `as1`, `as2`, `as4`, `as6`
e `as7`, os Arquivos Secretos. Para achar o id de um ritual, procure o nome dele
em `js/ordem/rituais-dados.js` (campo `id`).

## Como trocar

1. Abra a pasta do ritual (veja acima).
2. Substitua `simbolo.png` **mantendo o nome**. Nada no código precisa mudar.

Recomendações:

- **PNG quadrado com fundo transparente**; 100 × 100 é o tamanho de referência
  (pode ser maior, como 200 × 200 ou 512 × 512 — a tela reduz sem recortar nem
  deformar; formatos não quadrados ficam inteiros, com sobra nas bordas).
- O símbolo é mostrado sobre uma **placa escura**, igual nos temas claro e
  escuro: prefira traço claro ou colorido.
- Use apenas imagens que você tem direito de publicar: tudo nesta pasta vai para
  o site, e o site é público.

## Quem ganha o símbolo

- **Biblioteca de rituais**: pelo `id` da entrada do catálogo.
- **Ficha**: pelo `origemCatalogoId` do ritual — rituais oficiais já salvos
  ganham o símbolo sozinhos, sem conversão.
- **Cópias via Homebrew**: quando a origem é conhecida, a cópia guarda só o
  vínculo visual (`simboloCatalogoId`), sem mudar as regras de aquisição.
- **Rituais criados do zero**: `provisorio.png`.

## Gerar os provisórios de novo

```bash
deno run --allow-read --allow-write testes/gerar-simbolos-rituais.js
```

Cria a pasta e o `simbolo.png` provisório **só dos rituais que ainda não têm
arquivo** (por exemplo, depois de um ritual novo entrar no catálogo) e o
`provisorio.png`, se faltar. As artes que você já trocou não são tocadas. Apagar
um `simbolo.png` não quebra nada: a tela mostra o provisório compartilhado.
