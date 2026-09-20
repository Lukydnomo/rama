# Desempenho

Como o R.A.M.A. gasta tempo, o que foi feito a respeito, e como medir de
verdade.

---

## O que custa caro aqui

Três coisas, em ordem de peso:

**1. A viagem até o Apps Script.** Cada requisição do navegador ao
`/exec` paga o custo de o Google preparar uma execução. Ele é
razoavelmente fixo e não depende do que foi pedido. Quatro requisições
para desenhar uma tela pagam esse custo quatro vezes — e se o script
estiver dormindo, a primeira paga muito mais.

**2. A chamada ao serviço do Sheets.** Cada `getValues()` e cada
`setValues()` é uma chamada de rede de dentro do Apps Script para a
planilha. Vinte chamadas pequenas costumam sair mais caro do que uma
grande, e é por isso que a recomendação da documentação do Apps Script é
sempre agrupar.

**3. O volume que atravessa.** Uma ficha tem milhares de caracteres —
dezenas de milhares numa ficha grande. Ler quinhentas dessas para achar
uma é caro mesmo sendo uma chamada só.

Otimizar aqui é reduzir os três — e às vezes um deles briga com o outro,
como está explicado em `lerCelulas()` no `backend/Dados.gs`.

---

## A ficha em blocos (v2.15)

Desde a v2.15 a ficha mora em blocos (ver [DATABASE.md](DATABASE.md)), e isso
custa chamadas: a gravação escreve os blocos, lê de volta para conferir, publica
o manifesto e limpa a geração velha; a leitura varre as colunas curtas da aba de
blocos e lê só as linhas daquela ficha.

Contado pelo `testes/medir.js`, na mesma mesa de 20 contas e fichas pequenas
(chamadas ao Sheets e dados que atravessam — **não é tempo**):

| operação | v2.14 | v2.15 | v2.16 |
|---|---|---|---|
| `ler_personagem` | 5 | 9 | 7 |
| `salvar_personagem` | 13 | 20 | 17 |
| `ajustar_personagem` | 9 | 17 | 14 |
| `listar_personagens` | 14 | 14 | 14 |
| lote de abrir campanha | 27 | 33 | 25 |

A listagem de personagens não mudou: ela lê as colunas curtas e nunca toca na aba
de blocos (há teste para isso). O preço está na gravação e na abertura de UMA ficha
— e é o preço de conferir cada gravação antes de publicar e cada leitura antes de
entregar. Quatro coisas o mantêm baixo:

- os blocos de uma geração nascem lado a lado, então ler ou conferir uma ficha
  inteira é uma chamada, seja de 1 bloco ou de 20;
- desde a v2.16 o manifesto diz ONDE a geração está: ler é ir direto lá, sem
  varrer a aba, e gravar é conferir uma faixa em vez de varrê-la;
- a gravação escreve sobre a faixa que já não servia para nada, então a aba não
  cresce e ninguém é deslocado;
- a grade da aba só é consultada quando a gravação não cabe nela, e aí cresce com
  folga de 200 linhas.

Numa ficha grande o que cresce é o VOLUME, não o número de chamadas: uma ficha de
300 mil caracteres são 7 blocos, escritos numa chamada e conferidos noutra. Cada
salvamento automático envia e regrava a ficha inteira — por isso o limite
operacional `LIMITE_TOTAL_FICHA` (1 milhão de caracteres), explicado em
[DATABASE.md](DATABASE.md#limites).

## A v2.16: medir primeiro, depois cortar

A v2.16 começou com uma instrumentação e terminou com quatro cortes. A ordem
importa: cada corte abaixo saiu de um número, não de um palpite.

### Onde estava o peso

Medido com `testes/medir.js` sobre a v2.15, numa mesa de 20 contas, 61 fichas com
foto, três campanhas e 1 500 rolagens:

| operação | dados da planilha | resposta |
|---|---|---|
| painel da mesa (8 fichas) | 525 KB | 124 KB |
| "Meus personagens" | 778 KB | 60 KB |
| uma página do histórico | 254 KB | 7,7 KB |
| abrir a campanha (lote) | 558 KB | 155 KB |
| editor de participantes | 64 KB | 61 KB |

Três causas, nessa ordem de tamanho: **ficha remontada para desenhar cartão**,
**imagem viajando dentro de listagem** e **varredura da aba inteira para mostrar
uma página**.

### Os quatro cortes

**1. O cartão parou de abrir a ficha.** A projeção (coluna `resumo`, ver
[DATABASE.md](DATABASE.md)) guarda o recorte que o painel desenha, gravado na
mesma escrita de uma linha que publica o manifesto. Com ela em dia, listar a mesa
não remonta ficha nenhuma nem lê um bloco sequer — e há teste que confere
exatamente isso, pelo contador do próprio backend.

**2. A imagem virou uma versão.** Listagens mandam `fotoVersao` / `avatarVersao` —
a data da última gravação —, e o navegador pede as imagens em lote (`ler_fotos`,
`ler_avatares`), só as que ainda não tem, priorizando os cartões à vista. O que
chega fica guardado no aparelho por versão: trocar de tela, voltar no dia seguinte
ou recarregar a página não baixa de novo. Imagem trocada muda a versão, muda a
chave, e é buscada — sem invalidação manual em lugar nenhum.

**3. O bloco passou a ser achado direto.** O manifesto guarda onde a geração foi
escrita, e a leitura vai lá — conferindo tudo o que já conferia. Para a pista não
envelhecer, a gravação deixou de apagar linhas (ver "O localizador" em
[DATABASE.md](DATABASE.md)).

**4. O histórico virou cursor.** Um índice de uma coluna acha as linhas da
campanha; a página lê só o que vai mostrar; a próxima é pedida por cursor, não por
posição.

E duas economias menores que apareceram na mesma medição: o diretório de contas
(id → nome), que quatro telas montavam varrendo a aba `USUARIOS`, passou a ser uma
entrada de cache de cinco minutos; e abrir uma campanha parou de carregar a mesa
antecipadamente — a primeira aba é a Visão geral, que mostra participantes, não
fichas. Quem abre a aba Personagens (ou Combate, ou Notas) é quem paga por ela.

### Antes e depois

Mesmo cenário, v2.15 → v2.16. Chamadas ao Sheets, dados que atravessam entre o
Sheets e o script, e tamanho da resposta:

| operação | chamadas | da planilha | resposta |
|---|---|---|---|
| painel da mesa — 8 fichas | 20 → 13 | 525 KB → 27 KB | 124 KB → 6,6 KB |
| painel da mesa — 2 fichas | 20 → 13 | 116 KB → 16 KB | 31 KB → 1,7 KB |
| "Meus personagens" | 14 → 14 | 778 KB → 16 KB | 60 KB → 1,1 KB |
| abrir a campanha (lote) | 33 → 25 | 558 KB → 35 KB | 155 KB → 14,5 KB |
| editor de participantes | 9 → 6 | 64 KB → 1,2 KB | 61 KB → 2,5 KB |
| ler a campanha (mestre) | 17 → 14 | 30 KB → 2,7 KB | 25 KB → 1,8 KB |
| histórico — 1ª página de 1 500 | 13 → 13 | 254 KB → 65 KB | 7,7 KB |
| histórico — 10ª página | 12 → 9 | 254 KB → 82 KB | 7,7 KB |
| abrir uma ficha pequena | 9 → 7 | 24,6 KB → 18,4 KB | 7,9 KB |
| abrir uma ficha de 300 KB | 9 → 7 | 303 KB → 297 KB | 286 KB |
| salvar uma ficha pequena | 20 → 17 | 35,5 KB → 30,1 KB | — |
| salvar uma ficha de 300 KB | 13 → 10 | 591 KB → 586 KB | — |
| ajuste rápido do mestre | 17 → 14 | 42,6 KB → 36,5 KB | — |
| pergunta da sincronização | 4 → 4 | 402 B | 205 B |

As imagens passaram a ter um custo próprio, que antes estava escondido dentro das
listagens: `ler_fotos` de 8 cartões são 12 chamadas e 118 KB de resposta — uma vez,
não a cada abertura de tela nem a cada atualização automática.

O salvamento **não** ficou mais lento: ele perdeu a varredura da aba de blocos e
ganhou uma conferência de faixa, que é menor. E a leitura de uma ficha grande
continua custando o tamanho dela — isso é o conteúdo, não o caminho.

## A trava, que é o limite estrutural

O `LockService` do Apps Script oferece trava do **script inteiro**. Não
existe trava por linha, por aba ou por registro — a plataforma não tem
isso, e fingir que tem seria pior do que não ter.

Consequência direta: **toda gravação do sistema é uma fila única.** Com
vinte pessoas jogando, as gravações não acontecem em paralelo; elas se
enfileiram.

O que dá para fazer, e foi feito, é encurtar o tempo de cada uma dentro
da fila:

- o que dá para preparar antes de entrar é preparado antes: serializar
  JSON, medir tamanho, validar formato;
- as leituras de dentro da região crítica passaram a levar só as colunas
  necessárias;
- a limpeza de sessões vencidas saiu do caminho do login.

O que **não** dá para fazer sem trocar de banco: gravações realmente
simultâneas. Se a mesa crescer a ponto de a fila incomodar, o limite não
é do código — é do Sheets como banco.

---

## Coluna leve e coluna pesada

Toda aba tem colunas curtas — id, dono, nome, datas — e normalmente uma
que carrega o peso: o conteúdo da ficha (em blocos desde a v2.15), a
imagem em base64, o `dadosJson`.

O `backend/Dados.gs` separa as duas:

| função | o que lê | para quê |
|---|---|---|
| `lerLeves()` | só as colunas curtas, todas as linhas | listar, filtrar, contar, achar |
| `lerLinha()` | uma linha inteira | quando já se sabe qual |
| `lerCelulas()` | uma coluna pesada, das linhas escolhidas | buscar o conteúdo do que passou no filtro |
| `lerColuna()` | uma coluna, todas as linhas | conferir se um valor já existe |
| `lerTudo()` | tudo | quando realmente se precisa de tudo |

Registros de `lerLeves()` vêm marcados e **não podem ser gravados de
volta** — escrever um registro sem as colunas pesadas apagaria o
conteúdo. A camada recusa, e há teste para isso.

---

## O que o cache guarda, e o que ele nunca decide

| o quê | onde | validade | como se invalida |
|---|---|---|---|
| leituras da requisição | memória da execução | a requisição | morre com ela; a trava a esvazia ao ser obtida |
| sessão | `CacheService`, chave derivada do token | 120 s | sair da conta apaga; trocar senha e desativar avançam a época |
| cabeçalhos das abas | `CacheService`, uma entrada para todas | 6 h | `setupRama()` avança a época |
| rolagem já registrada | `CacheService`, chave = id da rolagem | 30 min | atalho apenas; a planilha continua conferindo |
| marcas da mesa | `CacheService`, uma chave por parte de cada campanha | 6 h, regravadas com o mesmo valor a cada 4 h | toda gravação da parte troca a marca; marca perdida vira uma reserva que muda a cada minuto |
| papel para as marcas | `CacheService`, chave = época + campanha + conta + marcas de `membros` e `campanha` | 5 min | mudar membros, visibilidade ou nome troca a chave; `setupRama()` avança a época |
| diretório de contas (v2.16) | `CacheService`, chave = época; guarda id → usuário, nome e ativo — nada além | 5 min | a época (senha, conta desativada, participantes); trocar o próprio nome apaga a entrada na hora |
| imagens já baixadas (v2.16) | `localStorage` do navegador, chave = tipo + id + **versão** | enquanto couber, com descarte do mais velho | a versão muda quando a imagem muda; espaço cheio ou modo privado só fazem pedir de novo |

Três limites que valem sem exceção:

1. **O cache nunca é a única fonte.** Se vier vazio, o caminho da
   planilha existe e funciona. O Google descarta entradas quando quer.
2. **Nada privado numa chave que outra pessoa consiga formar.** A chave
   da sessão é o hash do token: só quem tem a sessão consegue montá-la.
3. **Cache não substitui persistência, controle de concorrência nem
   idempotência.** Ele acelera; não decide.

As marcas e o papel para as marcas não carregam dado nenhum: dizem só *que*
uma parte da campanha mudou e *se* a pessoa pode ser avisada disso. O conteúdo
é sempre buscado pelo caminho normal, com a conferência completa.

### A época

Um número em Script Properties (`RAMA_EPOCA`), carimbado em toda entrada
que dependa de identidade ou de estrutura. O `CacheService` não deixa
listar nem apagar por prefixo, então não há como achar as entradas de
uma conta específica. Avançar a época invalida as de todo mundo de uma
vez.

É grosseiro e é raro. O preço de errar para este lado é uma leitura a
mais.

**O que a época derruba na hora:** sair da conta, trocar senha,
desativar usuário, rodar `setupRama()`.

**O que ela não cobre:** marcar `ativo = false` na linha da aba SESSOES
direto na planilha, com a mão. Isso leva até 120 segundos para valer.

---

## Os catálogos de itens e de rituais, que não passam pelo servidor

Os catálogos de Ordem Paranormal (`js/ordem/itens-dados.js`, 244 entradas, e
`js/ordem/rituais-dados.js`, 98 rituais) são arquivos estáticos, servidos pelo
GitHub Pages e guardados no cache do navegador. Eles **não** entram em nenhuma
página: cada um é carregado na primeira vez que alguém abre a janela "Da
biblioteca" correspondente, por um `<script>` injetado na hora. Uma falha de rede
não fica guardada — a próxima tentativa carrega de novo, e abrir a biblioteca de
itens não baixa a de rituais.

Três consequências que interessam ao custo:

1. **Abrir a ficha não paga por eles.** Quem nunca abre a biblioteca nunca a
   baixa.
2. **A planilha nunca os vê.** O item ou ritual adicionado guarda a própria cópia
   (nome, números, descrição resumida, versões e a referência do livro); a ficha
   gravada não leva catálogo nenhum, e `listar_homebrew` não é chamada na origem
   oficial.
3. **A lista é montada por partes.** Os detalhes de um resultado só são
   construídos quando alguém o abre — 244 itens ou 98 rituais com descrição,
   efeitos, versões e regras de cada um seriam DOM demais para montar de uma vez
   no celular.

---

## A atualização automática, e quanto ela custa

Desde a v2.12 a campanha aberta se atualiza sozinha (`js/sincronia.js`). O
Apps Script não mantém conexão aberta, então o navegador **pergunta**: não é
tempo real, e a documentação não deve prometer que é.

**A pergunta é barata de propósito.** `sincronizar_campanha` lê as marcas da
campanha (uma leitura de cache com sete chaves) e o papel de quem pergunta
(outra leitura de cache). Não lê planilha e não pega a trava, então não entra na
fila das gravações. Só quando uma marca mudou a página busca **aquela** parte,
pelo caminho normal.

| situação | intervalo |
|---|---|
| aba Personagens ou Combate aberta | ~8 s |
| outras abas da campanha | ~20 s |
| página escondida | nenhuma pergunta; ao voltar, uma na hora |
| falha | dobra a cada falha, até 60 s |

Todos com ±10% de variação, para as perguntas de uma mesa não coincidirem.

**Latência esperada** de uma mudança feita por outra pessoa: intervalo + resposta
das marcas + busca da parte — de 2 a 15 s nas abas de mesa, até ~25 s nas outras,
mais quando o script está dormindo. **Estes números são estimativa a partir dos
intervalos, não medição**: o simulador não tem latência de rede.

**Carga estimada.** Vinte pessoas nas abas de mesa fazem cerca de 2,5 perguntas por
segundo. O que pesa em cada uma não é o cache, é o item 1 do começo deste
documento: cada pergunta é uma execução do Apps Script, com o custo de preparação e
as cotas da conta que publicou o backend. As leituras de planilha acontecem só
depois de uma gravação, e só da parte gravada — numa mesa parada, nenhuma.

Para trocar latência por menos execuções, aumente `INTERVALO_ATIVO` e
`INTERVALO_CALMO` em `js/sincronia.js`.

---

## O que foi medido, e o que isso vale

```bash
deno run --allow-read testes/medir.js
deno run --allow-read --allow-write testes/medir.js --json depois.json
deno run --allow-read testes/medir.js --comparar antes.json
deno run --allow-read testes/medir.js --backend caminho/da/versao/antiga
```

Monta uma mesa de vinte contas, 61 fichas com foto (uma delas de 300 KB, em
vários blocos), avatares, três campanhas de tamanhos diferentes e mil e quinhentas
rolagens, e conta o que cada operação custa. Os cenários incluem cache vazio e
aquecido, ficha pequena e grande, mesa de dois e de oito personagens.

`--backend` carrega os `.gs` de outra pasta: é assim que as duas versões são
medidas sobre exatamente o mesmo conjunto de dados. `--comparar` põe as duas
medições lado a lado, casadas pelo rótulo — um cenário que só existe de um lado
aparece como "(novo)", para renomear um cenário não parecer melhoria.

A comparação v2.15 → v2.16 está em "A v2.16: medir primeiro, depois cortar",
acima.

Comparação entre a v2.0.0 e a v2.1.0, no mesmo cenário:

| operação | chamadas ao Sheets | dados da planilha |
|---|---|---|
| conferir sessão | 12 → 5 | 8,0 KB → 782 B |
| tela inicial | 32 → 13 | 521 KB → 22 KB |
| lista de personagens | 32 → 14 | 1.368 KB → 59 KB |
| abrir ficha | 12 → 5 | 477 KB → 17 KB |
| ler foto | 16 → 9 | 1.363 KB → 36 KB |
| painel da mesa | 24 → 16 | 1.367 KB → 510 KB |
| histórico, uma página de 1.500 | 20 → 12 | 347 KB → 254 KB |
| salvar ficha | 23 → 13 | 487 KB → 27 KB |
| botão do painel do mestre | 19 → 9 | 485 KB → 25 KB |
| registrar rolagem | 27 → 16 | 815 KB → 40 KB |
| salvar foto | 19 → 9 | 1.377 KB → 36 KB |
| **soma do cenário** | **382 → 240** | **9.539 KB → 1.886 KB** |

E o que o lote faz com o número de **requisições ao Apps Script**,
verificado no navegador contra o backend rodando de verdade:

| tela | antes | depois |
|---|---|---|
| abrir uma ficha | 4 | 1 |
| abrir uma campanha | 3 | 1 |
| seis cliques rápidos no botão do mestre | 6 | 1 |

Contra um Apps Script que ainda não conhece a ação `lote`, essas telas voltam
sozinhas ao número antigo de requisições. O lote é otimização, não requisito, e
`testes/executar-frontend.js` tranca isso.

### O que estes números NÃO são

**Não são tempo.** A planilha do medidor é um array em memória e
responde em microssegundos. Latência de rede, fila do `LockService` e
cota de execução simultânea não existem lá.

**Não são capacidade validada.** Nada aqui prova que o sistema aguenta
vinte pessoas. Prova que ele pede menos e carrega menos do que pedia
antes, o que é uma propriedade do código e não do ambiente.

**Não são porcentagem de melhoria sentida.** Menos chamadas e menos
dados levam a menos tempo, mas a relação não é proporcional e depende do
dia do Google.

### O que continua sem validação

**O backend nunca rodou numa implantação real do Apps Script.** Ele roda
no simulador de `testes/apps-script-simulado.js`, que é fiel no que
importa — criptografia de verdade, entrada por `doPost`, limites do
`CacheService` — mas não é o Google.

---

## A instrumentação, e como ligá-la

O backend conta o que faz, sempre: chamadas ao Sheets, células, fichas remontadas,
blocos lidos, projeções aproveitadas, acertos de cache, tempo esperando a trava e
tempo com ela. Contar custa somas de inteiros numa memória que morre com a
resposta.

O que o interruptor liga é o REGISTRO disso:

```js
ligarDiagnostico()     // no editor do Apps Script
desligarDiagnostico()
```

Com ele ligado, cada requisição escreve uma linha no log do Apps Script
(Execuções → registros) e devolve o mesmo no campo `diag` da resposta:

```
R.A.M.A. perf {"acao":"listar_personagens_campanha","ms":812,"sessaoMs":34,
"travaMs":0,"presaMs":0,"sheets":13,"leituras":5,"escritas":0,"celulas":1840,
"cache":"3/4","fichas":0,"blocos":0,"resumos":"8/8","resposta":6612}
```

| campo | o que é |
|---|---|
| `ms` | o tempo do servidor: da entrada do `doPost` até a resposta ficar pronta |
| `sessaoMs` | quanto disso foi conferir quem está pedindo |
| `travaMs` / `presaMs` | esperando a trava / segurando a trava |
| `sheets` | viagens ao serviço do Sheets, com `leituras` e `escritas` |
| `celulas` | células que atravessaram numa direção ou na outra |
| `cache` | acertos / consultas ao `CacheService` |
| `fichas` | fichas remontadas — o número que o painel da mesa existe para manter em zero |
| `blocos` | blocos de ficha lidos |
| `resumos` | projeções aproveitadas / total |
| `resposta` | caracteres da resposta |

Três coisas que ela não faz, de propósito: **não grava nada na planilha** (uma
linha por requisição numa aba seria uma escrita por leitura), **não registra
token, senha, id de conta, nome nem conteúdo de ficha**, e **não muda decisão
nenhuma** — ligada ou desligada, a resposta é a mesma fora do campo `diag`.

### Do lado do navegador

`js/rede.js` mede a viagem inteira e, quando a resposta traz `diag.ms`, desconta:

```js
RAMARede.medicoes()
// { viagens: 12, totalMedioMs: 940, servidorMedioMs: 310, redeMediaMs: 630,
//   ultimas: [ { acao, totalMs, servidorMs, redeMs, sheets, celulas, fichas } ] }
```

Com `localStorage.setItem("rama.diag", "1")`, cada viagem também vira uma linha no
console. Tudo fica na memória da página, nas últimas cinquenta viagens; nada sai do
navegador.

É essa diferença que separa "o Apps Script está lento" de "a viagem até ele está
lenta" — e só quem está nas duas pontas consegue separar.

---

## Medir de verdade, numa implantação

Isto exige uma implantação **de teste**, separada da que a mesa usa.
Nunca meça carga na produção.

### 1. Uma cópia para medir

- duplique a planilha (Arquivo → Fazer uma cópia);
- crie um projeto novo no Apps Script com os três `.gs`;
- aponte `RAMA_PLANILHA_ID` para a cópia;
- rode `setupRama()` e `gerarPepper()`;
- crie contas de teste com `criarUsuario()`;
- publique como app da Web e anote a URL `/exec`.

### 2. Encher com dados

Rode isto no editor do Apps Script, ajustando os números. Ele usa as
funções do próprio backend. As fichas nascem no **formato antigo**
(inteiras em `fichaJson`), que continua sendo lido; para medir fichas em
blocos, salve cada uma uma vez pelo site depois de criá-las — ou crie-as
pelo próprio site.

```javascript
function encherParaMedir() {
  var conta = acharPor(ABAS.USUARIOS, 'usuario', 'teste');
  for (var i = 0; i < 40; i++) {
    inserir(ABAS.PERSONAGENS, {
      id: novoId(), ownerId: conta.id, nome: 'Ficha ' + i,
      campanhaId: '', classe: 'Combatente', origem: 'Militar',
      criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(),
      rev: 1, fichaJson: JSON.stringify({ nome: 'Ficha ' + i, pericias: [], status: [] }),
    });
  }
}
```

### 3. Cronometrar do lado do servidor

O jeito mais direto é medir dentro do próprio Apps Script, onde não há
latência de rede no meio:

```javascript
function cronometrar() {
  var alvos = [
    ['listar_personagens', {}],
    ['resumo', {}],
    ['ler_personagem', { personagemId: 'COLE_UM_ID' }],
  ];
  var token = 'COLE_UM_TOKEN_DE_TESTE';

  alvos.forEach(function (par) {
    reiniciarExecucao();
    var inicio = Date.now();
    doPost({ postData: { contents: JSON.stringify(
      Object.assign({ acao: par[0], token: token }, par[1])) } });
    console.log(par[0] + ': ' + (Date.now() - inicio) + ' ms');
  });
}
```

Rode **três vezes** e use a última. A primeira paga o arranque do
contêiner e não representa o uso normal.

### 4. Cronometrar do lado do navegador

Abra o console em qualquer tela do R.A.M.A. logado na implantação de
teste:

```javascript
async function medir(nome, fn, vezes = 5) {
  const t = [];
  for (let i = 0; i < vezes; i++) {
    const a = performance.now();
    await fn();
    t.push(Math.round(performance.now() - a));
  }
  console.log(nome, t, 'mediana', t.sort((x, y) => x - y)[Math.floor(vezes / 2)] + ' ms');
}

await medir('listar personagens', () => RAMAApi.listarPersonagens());
await medir('abrir ficha (lote)', () => RAMAApi.lote([
  { acao: 'ler_personagem', personagemId: 'COLE_UM_ID' },
  { acao: 'ler_foto', personagemId: 'COLE_UM_ID' },
  { acao: 'listar_campanhas' },
]));
```

Isto inclui a rede e o arranque, que é o que a pessoa sente. Descarte a
primeira medição de cada série.

### 5. Simular vinte pessoas

Duas coisas diferentes, e confundi-las é o erro clássico:

**Vinte pessoas usando** não são vinte requisições simultâneas. Uma mesa
de RPG tem rajadas — todo mundo abre a ficha no começo da sessão — e
longos intervalos em que quase nada acontece. O pico realista é uma
dezena de requisições no mesmo segundo, algumas vezes por sessão.

**Vinte execuções simultâneas** é outra coisa, e o Apps Script tem cota
para isso. Uma implantação "executar como eu" com "qualquer pessoa" tem
limite de execuções simultâneas por usuário do script — quando ele é
atingido, a resposta é um erro, não uma fila.

Para provocar a rajada, do console de uma aba logada:

```javascript
const inicio = performance.now();
const r = await Promise.all(
  Array.from({ length: 12 }, () => RAMAApi.listarPersonagens())
);
console.log(Math.round(performance.now() - inicio) + ' ms',
            r.filter(x => x.ok).length + '/12 ok');
```

Note que a deduplicação em voo do `js/api.js` juntaria pedidos idênticos.
Para medir concorrência real, varie o pedido — por exemplo, alterne
entre `listarPersonagens`, `resumo` e `listarCampanhas`.

**Nunca rode isto contra a implantação que a mesa usa.**

### 6. Medir a fila da trava

Grave em duas abas ao mesmo tempo e veja quanto a segunda espera:

```javascript
const inicio = performance.now();
const r = await Promise.all([
  RAMAApi.salvarFoto('ID_A', 'data:image/png;base64,AAAA'),
  RAMAApi.salvarFoto('ID_B', 'data:image/png;base64,AAAA'),
]);
console.log(Math.round(performance.now() - inicio) + ' ms', r.map(x => x.ok));
```

Se alguma responder `ocupado`, a trava não foi obtida em 25 segundos —
o sinal de que a fila está longa demais.

---

## Se ainda estiver lento

Em ordem de esforço:

1. **Limpar o histórico de rolagens.** A varredura da aba
   `CAMPANHA_ROLAGENS` cresce com o tamanho dela, não com o da página. O
   botão "Limpar" existe para isso.

2. **Reduzir `LADO_FOTO` em `js/config.js`.** Fotos menores são a maior
   economia disponível sem mexer em código.

3. **Ligar o serviço avançado do Sheets.** A API `Sheets.Spreadsheets.
   Values.batchGet` lê várias faixas numa chamada só, o que resolveria
   o dilema do `lerCelulas()`. É gratuito, mas exige habilitar o serviço
   no editor e passa a ser um passo a mais na instalação. Não foi
   adotado por isso; a decisão está registrada aqui para ser revista com
   dados.

4. **Aumentar `TEMPO_LIMITE_MS`.** Não deixa nada mais rápido; só evita
   que o navegador desista de uma resposta que ia chegar.

5. **Espaçar a atualização automática.** `INTERVALO_ATIVO` e
   `INTERVALO_CALMO` em `js/sincronia.js`: menos execuções do Apps Script,
   mudanças dos outros chegando mais devagar.
