# Imagens das criaturas do catálogo

Cada criatura do catálogo oficial (`js/ordem/criaturas-dados.js`) tem uma pasta
aqui, com **duas imagens provisórias** — uma silhueta com o nome da criatura:

| Arquivo       | Formato                         | Onde aparece                                        |
|---------------|---------------------------------|-----------------------------------------------------|
| `retrato.png` | quadrada (1:1), 512×512 sugerido | lista da biblioteca, cabeçalho da ficha, painel do turno no combate, cartão do aliado |
| `corpo.png`   | corpo inteiro, **qualquer tamanho** | botão "Corpo inteiro" da ficha                      |

## Onde fica cada criatura

A pasta sai do id da criatura, sem o `criatura.`:

```
op.criatura.zumbi-de-sangue         → assets/criaturas/op/zumbi-de-sangue/
sah.criatura.memento-mori           → assets/criaturas/sah/memento-mori/
op.criatura.o-anfitriao.amphitruo   → assets/criaturas/op/o-anfitriao.amphitruo/
as1.criatura.apostolo-do-sangue     → assets/criaturas/as1/apostolo-do-sangue/
```

`op` é o livro básico (Ordem Paranormal RPG); `sah`, Sobrevivendo ao Horror;
`as1`, Arquivos Secretos 1; `as2`, Arquivos Secretos 2 (os perfis "como aliado"
têm pasta própria, com `-aliado` no fim; as formas transformadas, não — são a
mesma criatura).
As facetas do Anfitrião são variantes e têm pasta própria.

## Como trocar

Substitua o arquivo **mantendo o nome** (`retrato.png` ou `corpo.png`). Nada no
código precisa mudar. Prefira PNG ou converta para PNG; o retrato fica melhor
em 1:1 — ele é mostrado num quadrado, e o que sobrar é cortado ao centro.

Use apenas imagens que você tem direito de publicar: tudo nesta pasta vai para
o site, e o site é público.

## Como gerar de novo

As provisórias foram geradas por script, uma vez. Apagar uma pasta não quebra
nada — a ficha só deixa de mostrar a imagem (o carregamento falha em silêncio).
