# Símbolos dos rituais do catálogo

Cada ritual do catálogo oficial de Ordem Paranormal (`js/ordem/rituais-dados.js`)
tem uma pasta aqui, com um arquivo **`simbolo.webp`**. Hoje todos são
**provisórios** — o mesmo selo neutro (dois anéis, triângulo e olho) — para você
trocar pela arte de cada ritual sem mexer no código.

| Arquivo          | Formato                                        | Onde aparece |
|------------------|------------------------------------------------|--------------|
| `simbolo.webp`   | quadrado, **100 × 100 ou 1000 × 1000 px**, fundo transparente (WebP sem perda) | miniatura ao lado do nome (biblioteca de rituais, aba Rituais da ficha, Homebrew) e o símbolo maior junto aos dados de conjuração, na consulta aberta |
| `provisorio.webp` | o mesmo formato                                | ritual sem vínculo com o catálogo (criado do zero) e qualquer símbolo que não carregar |

## Onde fica cada ritual

A pasta sai do **id** do ritual, sem o `ritual.`, usando o **prefixo do id** (que
nem sempre é a fonte mostrada na tela):

```
op.ritual.cicatrizacao          → assets/rituais/op/cicatrizacao/simbolo.webp
op.ritual.amaldicoar-arma       → assets/rituais/op/amaldicoar-arma/simbolo.webp
sah.ritual.<nome>               → assets/rituais/sah/<nome>/simbolo.webp
as2.ritual.<nome>               → assets/rituais/as2/<nome>/simbolo.webp
```

`op` é o livro básico; `sah`, Sobrevivendo ao Horror; `as1`, `as2`, `as4`, `as6`
e `as7`, os Arquivos Secretos. Para achar o id de um ritual, procure o nome dele
em `js/ordem/rituais-dados.js` (campo `id`).

## Como trocar

1. Abra a pasta do ritual (veja acima).
2. Substitua `simbolo.webp` **mantendo o nome** — ou solte um `simbolo.png` e
   siga "Formato: WebP primeiro", abaixo. Nada no código precisa mudar.

Recomendações:

- **Quadrado com fundo transparente, em 100 × 100 ou 1000 × 1000 px** (WebP; PNG é convertido). Os
  provisórios são 100 × 100; 1000 × 1000 serve para arte em alta resolução. A
  tela reduz os dois sem recortar nem deformar, e só baixa a imagem quando ela
  aparece. O teste `testes/executar-simbolos-rituais.js` acusa outros tamanhos.
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
- **Rituais criados do zero**: `provisorio.webp`. Ele também é o reserva de
  qualquer símbolo que não carregar.

## Gerar os provisórios de novo

```bash
deno run --allow-read --allow-write testes/gerar-simbolos-rituais.js
```

Cria a pasta e o símbolo provisório — uma cópia do `provisorio.webp` — **só dos
rituais que ainda não têm `simbolo.webp` nem `simbolo.png`** (por exemplo,
depois de um ritual novo entrar no catálogo). As artes que você já trocou não são
tocadas. Se o `provisorio.webp` sumir, o script o redesenha como
`provisorio.png`: converta com `otimizar-imagens.py` e rode o script de novo.
Depois de criar, rode `gerar-mapa-imagens.js`. Apagar um símbolo não quebra
nada: a tela mostra o provisório compartilhado.

## Formato: WebP primeiro

Desde a v7.2 as imagens daqui são **WebP**. Para trocar uma arte, você pode
soltar um PNG com o nome certo e depois rodar, na raiz do projeto:

```bash
python testes/otimizar-imagens.py --aplicar assets/rituais
deno run --allow-read --allow-write testes/gerar-mapa-imagens.js
```

O primeiro converte para WebP quando compensa (símbolos: WebP sem perda, idêntico pixel a pixel) e apaga o PNG
trocado; o segundo atualiza o mapa das imagens que continuam em PNG, para o site
pedir cada uma pelo caminho certo na primeira tentativa. Se você já tiver um
WebP, salve direto com o nome em `.webp` e rode só o segundo. Nunca deixe o
`.webp` e o `.png` do mesmo arquivo juntos: vale o `.webp`.

