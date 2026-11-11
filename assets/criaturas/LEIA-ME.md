# Imagens das criaturas do catálogo

Cada criatura do catálogo oficial (`js/ordem/criaturas-dados.js`) tem uma pasta
aqui, com **duas imagens** (WebP; algumas continuam em PNG, veja abaixo):

| Arquivo       | Formato                         | Onde aparece                                        |
|---------------|---------------------------------|-----------------------------------------------------|
| `retrato.webp` | quadrada (1:1), 512×512 sugerido | lista da biblioteca, cabeçalho da ficha, painel do turno no combate, cartão do aliado |
| `corpo.webp`  | corpo inteiro, **qualquer tamanho** | botão "Corpo inteiro" da ficha                      |

## Onde fica cada criatura

A pasta sai do id da criatura, sem o `criatura.`:

```
op.criatura.zumbi-de-sangue         → assets/criaturas/op/zumbi-de-sangue/
sah.criatura.memento-mori           → assets/criaturas/sah/memento-mori/
op.criatura.o-anfitriao.amphitruo   → assets/criaturas/op/o-anfitriao.amphitruo/
as1.criatura.apostolo-do-sangue     → assets/criaturas/as1/apostolo-do-sangue/
```

`op` é o livro básico (Ordem Paranormal RPG); `sah`, Sobrevivendo ao Horror;
`as1`, Arquivos Secretos 1; `as2`, Arquivos Secretos 2; `as3`, Arquivos Secretos 3;
`as4`, Arquivos Secretos 4 (os estágios do Simulacro não têm pasta: são a mesma criatura)
`as5`, Arquivos Secretos 5 (as variações do hospedeiro têm pasta própria; a forma monstruosa
dos doppelgangers, não)
`as6`, Arquivos Secretos 6; `as7`, Arquivos Secretos 7 (O Verdadeiro Raziel tem pasta própria;
os patamares da Apóstata, não — são formas da mesma criatura)
(os perfis "como aliado" têm pasta própria, com `-aliado` no fim, e os animais
treinados do AS3, com `-animal`; as formas transformadas e a Hora do Show, não —
são a mesma criatura).
As facetas do Anfitrião são variantes e têm pasta própria.

## Como trocar

Substitua o arquivo **mantendo o nome** (`retrato` ou `corpo`, em `.webp` ou
`.png`) e siga "Formato: WebP primeiro", abaixo. O retrato fica melhor em 1:1 —
ele é mostrado num quadrado (64 px na lista), e o que sobrar é cortado ao centro.

## Formato: WebP primeiro

Desde a v7.2 as imagens daqui são **WebP**. Para trocar uma arte, você pode
soltar um PNG com o nome certo e depois rodar, na raiz do projeto:

```bash
python testes/otimizar-imagens.py --aplicar assets/criaturas
deno run --allow-read --allow-write testes/gerar-mapa-imagens.js
```

O primeiro converte para WebP quando compensa (WebP sem perda; se ele economizar menos de 30%, qualidade 90 ou 85 comparada no tamanho de exibição, e só se cair mais 10%. Fica PNG quando o PNG é menor — hoje, 108 imagens já otimizadas em PNG) e apaga o PNG
trocado; o segundo atualiza o mapa das imagens que continuam em PNG, para o site
pedir cada uma pelo caminho certo na primeira tentativa. Se você já tiver um
WebP, salve direto com o nome em `.webp` e rode só o segundo. Nunca deixe o
`.webp` e o `.png` do mesmo arquivo juntos: vale o `.webp`.


Use apenas imagens que você tem direito de publicar: tudo nesta pasta vai para
o site, e o site é público.

## Como gerar de novo

As provisórias foram geradas por script, uma vez. Apagar uma pasta não quebra
nada — a ficha só deixa de mostrar a imagem (o carregamento falha em silêncio).
