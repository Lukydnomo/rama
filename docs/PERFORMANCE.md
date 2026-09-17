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

**3. O volume que atravessa.** Uma célula com a ficha inteira tem
milhares de caracteres. Ler quinhentas dessas para achar uma é caro
mesmo sendo uma chamada só.

Otimizar aqui é reduzir os três — e às vezes um deles briga com o outro,
como está explicado em `lerCelulas()` no `backend/Dados.gs`.

---

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
que carrega o peso: o `fichaJson`, a imagem em base64, o `dadosJson`.

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
```

Monta uma mesa de vinte contas, sessenta fichas com foto, três campanhas
e mil e quinhentas rolagens, e conta o que cada operação custa.

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
funções do próprio backend, então o que ele cria é indistinguível do que
o sistema cria.

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
