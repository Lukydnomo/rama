# Desempenho

## v2.46 — menos trabalho na tela, no salvamento, entre abas e no Sheets

Cinco frentes, cada uma medida antes e depois **no mesmo cenário**. A referência
"antes" é a v2.45.0 (commit `ede1b1a`), guardada com `git archive` e servida ou
carregada lado a lado com a atual. Três tipos de número aparecem abaixo, e eles não
se misturam:

- **contagem do simulador** (`testes/medir.js`, `testes/executar-coordenacao.js`,
  `testes/medir-salvamento.js`): viagens ao Sheets, células, envios, perguntas.
  Propriedade do código, não do ambiente — o simulador não tem latência;
- **navegador local** (`testes/medir-interface.js` contra `testes/servidor-local.js`):
  redesenhos, nós de DOM inseridos e milissegundos de JavaScript nesta máquina, com o
  backend simulado. Tempos variam entre máquinas e execuções;
- **implantação**: nenhum número desta seção veio de uma implantação real do Apps
  Script. O roteiro para medir lá está em "Validar numa implantação", abaixo.

Menos viagens num simulador não são, por si, a mesma porcentagem de tempo a menos no
Google.

### 1. Atualizar só o que mudou (js/paginas/ficha.js)

A ficha passou a ser desenhada em cinco **regiões** — topo, avisos, bloco superior,
tira de abas e seção aberta —, cada uma num invólucro `display: contents` (a caixa
visual é a mesma). `desenhar()` monta as cinco e continua sendo o caminho das mudanças
estruturais (modo, tipo, permissões, versão nova do servidor, módulos). `atualizar()`
troca só as regiões pedidas:

| mudança | regiões refeitas |
|---|---|
| trocar de seção | abas + seção |
| recurso, condição, efeito, cena, ação de recurso (estado de jogo) | bloco + seção — a seção é poupada quando não depende disso (Anotações) |
| `ctx.redesenhar()` das seções | bloco + abas + seção (o rótulo de Rituais e os módulos mudam a tira) |
| nome, campanha | `atualizarTitulo()`, no lugar |

O bloco superior é a menor unidade que se refaz: atributos podem depender de condições
(dados de teste), e granular mais exigiria uma segunda implementação das regras para
saber o que mudou. Foco, seleção, texto ainda não confirmado e recolhíveis abertos são
lembrados e devolvidos — no desenho completo também (antes, um redesenho fechava o que
estava aberto). Campos sem `data-foco` são achados pela posição (região, tipo, rótulo e
ordem entre os iguais), porque `UI.campo` gera um `id` novo a cada desenho.

Ficha de Ordem do Jeff (retrato do CRIS + 5 itens, 8 rituais, condições ativas),
dona, aba na frente, 3 repetições, mesma máquina, v2.45 → v2.46:

| cenário | redesenhos completos | nós inseridos | ms (JS) | gravações |
|---|---|---|---|---|
| ajuste manual + e − no PV | 0 → 0 | 402 → 402 | 10,5 → 13,1 | 1 → 0 |
| Dano e Cura no PV | 6 → 0 | 1593 → 1359 | 45 → 34 | 1 → 1 |
| Nova cena (com a confirmação) | 3 → 0 | 780 → 663 | 10,5 → 9,9 | 1 → 1 |
| Dano e Cura com Perícias aberta | 9 → 0 | 7026 → 6141 | 133 → 113 | 1 → 1 |
| Dano e Cura com Anotações aberta | 9 → 0 | 2679 → 1398 | 59 → 42 | 1 → 1 |
| trocar 3 abas | 9 → 0 | 5628 → 3675 | 95 → 56 | 0 → 0 |

Conferido no navegador: depois de várias atualizações parciais, o texto da ficha é
idêntico ao de um desenho completo do mesmo estado (cinco abas); recolhíveis abertos
continuam abertos (na v2.45 fechavam); a rolagem fica; o campo em edição mantém foco,
seleção e texto não confirmado; o modo Leitor sai só de leitura nas regiões trocadas;
página inteira e painel da campanha (`?painel=1`).

### 2. Um cálculo por ciclo (js/ordem/regras.js, js/ordem/progressao.js)

O estado da progressão tinha um cache por **assinatura** — um `JSON.stringify` de
metade da ficha a cada pergunta. Um desenho perguntava centenas de vezes (cada
atributo, cada perícia, cada modificador). Agora `RAMAOrdemRegras.ciclo(fn)` abre um
ciclo de cálculo em volta de cada desenho: dentro dele, o estado da progressão, a lista
de modificadores e `calcular()` são feitos uma vez para a mesma ficha e reaproveitados
pela **identidade** e por uma marca de referências e números (nada serializado). O
ciclo acaba com o desenho — então nunca há valor de antes de uma mudança local, salva
ou não, e não há invalidação para lembrar. Fora de um ciclo, nada muda.

| medida (Deno, carga de um desenho com a aba Perícias) | sem ciclo | com ciclo |
|---|---|---|
| tempo | ~3,5 ms | ~0,8 ms |
| `JSON.stringify` | 624 | 4 |

No navegador, o mesmo desenho reaproveita a progressão centenas de vezes por
atualização (`RAMAMedicao`: `progressao.reaproveitada`). `testes/executar-cris.js`
confere, nas fichas reais do Jeff e da Gina, que valores e composições são idênticos
dentro e fora do ciclo, e que uma lista ou um recurso trocado no meio do ciclo é
recalculado.

### 3. O salvamento (js/salvar.js, js/config.js)

| o quê | antes | agora |
|---|---|---|
| espera para juntar alterações | 400 ms | 800 ms (`DEBOUNCE_MS`) |
| prazo máximo desde a 1ª alteração pendente | nenhum (digitar sem parar adiava para sempre) | 4 s (`DEBOUNCE_MAXIMO_MS`) |
| alteração durante uma gravação | subia imediatamente depois dela | espera a vez, com o mesmo prazo |
| conteúdo igual ao que o servidor tem (só `atualizadoEm` mudou) | gravava | não grava; volta a "Salvo" |
| cópia do que vai | `structuredClone` | a mesma serialização da comparação |

`testes/medir-salvamento.js` roda o salvar.js de verdade (e o da v2.45) com relógio
virtual, servidor de 900 ms e sequências fixas:

| sequência | v2.45 | 800 ms + 4 s (v2.46) | latência média → máxima (v2.46) |
|---|---|---|---|
| digitar uma anotação, com pausas (98 teclas) | 22 envios | 9 | 1,5 s → 4,0 s |
| texto contínuo, 12 s sem parar | 1 (12,3 s pendente) | 3 | 2,1 s → 4,0 s |
| 8 cliques no recurso, a cada 600 ms | 6 | 2 | 2,1 s → 4,0 s |
| 8 cliques rápidos, a cada 250 ms | 1 | 1 | 1,7 s → 2,6 s |
| 6 campos, a cada 2–3 s | 6 | 6 | 0,8 s → 0,8 s |
| marcar e desmarcar | 1 | 0 | — |
| **total** | **37** | **21** | |

1000 ms juntaria um pouco mais (19), com cada campo isolado esperando 1 s; 800 ms foi o
equilíbrio. "Salvar agora", fechar a aba, esconder a página e aplicar um tema continuam
chamando `agora()`, sem espera. A ficha inteira vai a cada envio, então juntar nunca
funde ações: dois gastos registrados viram um envio com os dois registros. Revisão,
conciliação, repetição com o mesmo id de operação, indicadores e o aviso de saída com
pendência não mudaram (`testes/executar-frontend.js`).

### 4. Entre abas do mesmo navegador (js/coordenacao.js)

`BroadcastChannel` divide o resultado de **leituras equivalentes** — a pergunta da
sincronização da campanha (`sinc:<campanha>`) e a vigia da ficha compartilhada
(`acesso:<personagem>`):

- antes de perguntar, a aba usa a resposta de outra se ela for mais nova que 90% do
  próprio intervalo;
- se outra aba anunciou que está perguntando, espera a resposta dela (até 6 s);
- senão, anuncia, pergunta e espalha — e as outras recebem na hora, como se fosse a
  própria resposta (mesma comparação de marcas, mesmo `aoMudar`).

Não há líder a eleger: quem chega primeiro pergunta; se essa aba fecha, suspende, perde
a rede ou falha (falha avisa as outras), a espera vence e cada aba volta a perguntar.
Toda mensagem leva a conta; resposta de outra conta é ignorada, e trocar de sessão (o
token no `localStorage`) apaga o que estava guardado. Uma resposta que voava quando a
conta trocou não é espalhada; uma resposta de uma pergunta mais velha não passa por cima
da mais nova. Nenhuma credencial vai pelo canal, e nenhuma gravação é coordenada. A
pausa com a página escondida e a espera crescente depois de falhas continuam iguais.
Sem `BroadcastChannel`, cada aba pergunta sozinha.

| medida | sem coordenação | com |
|---|---|---|
| simulador, 3 abas, intervalo de 150 ms, 1,5 s | 23–24 perguntas | 12–13 |
| navegador local, 2 cópias ativas da campanha (iframes), 60 s, aba Personagens | 14 (v2.45) | 8 |
| navegador local, 2 cópias ativas da ficha compartilhada (Editora), 60 s | ~4,8 esperadas | 3 |

No navegador, uma rolagem registrada pelo mestre apareceu nas **duas** cópias no mesmo
instante (6,9 s) a partir de uma única pergunta, cada uma buscou e exibiu, e nenhuma a
registrou de novo. Observação: o navegador embutido do app congela os timers de uma aba
de fundo depois de ~25 s (embora ela se declare visível) — por isso a medição usa duas
cópias na mesma aba.

### 5. Leituras do Google Sheets (backend/Dados.gs, Codigo.gs, Campanhas.gs)

**Cortes que valem sempre** (sem configuração nenhuma):

- linha completa lida uma vez por execução — `ler_personagem` e `ler_foto` no mesmo
  lote leem a linha da ficha uma vez;
- o salvamento do dono só confere a campanha quando ela **muda** (vincular confere, e
  sair da mesa ou excluir a campanha já limpa o vínculo);
- a linha do índice de pastas não é procurada a cada gravação: uma marca no cache diz
  que ela existe (sem a marca, a varredura volta; com a marca errada, a listagem recria
  a linha, como sempre);
- a quantidade de compartilhamentos de cada ficha fica no cache: "0" pula a varredura
  de `PERSONAGENS_ACESSOS`. Ela só pode errar para o lado de negar — conceder grava a
  contagem nova na mesma requisição, e uma contagem velha maior só faz varrer;
- a pergunta de acesso (`acesso_personagem`) lê só as colunas leves.

**O caminho opcional com o serviço avançado** (`Sheets.Spreadsheets.Values.batchGet`):
várias faixas, de abas diferentes, numa viagem, com faixa aberta no fim (sem
`getLastRow`). Cada ação diz quais abas vai varrer (`abasDaAcao` em Codigo.gs) e elas
vêm juntas; o lote une as de todas as sub-ações; cabeçalhos que o cache não tem vêm
numa primeira viagem para todas as abas; leituras espalhadas (`lerCelulas`,
`lerLinhas`) viram uma viagem; gravações pré-carregam dentro da trava (que esvazia a
memória ao ser obtida). Ver "Leituras em lote" abaixo para ligar.

Conferido nos dois caminhos: **a suíte inteira do backend passa com o serviço desligado
e ligado** (`executar-backend.js` e `executar-backend.js --servico-avancado`, 1467
verificações cada), e `testes/lote-backend.js` confere registro a registro (células
vazias no fim, zero e falso, colunas extras, linhas espalhadas, conteúdo grande,
cabeçalhos montados pelo lote) e as voltas ao caminho padrão (erro passageiro, API
desabilitada, faixas a menos ou trocadas, data que não é ISO, `RAMA_SHEETS_API = 0`).

Viagens ao Sheets, `testes/medir.js`, mesma mesa (20 contas, 61 fichas, 1 500 rolagens,
uma ficha compartilhada), respostas com o MESMO tamanho nas três colunas:

| operação | v2.45 | v2.46 padrão | v2.46 com lote |
|---|---|---|---|
| resumo (tela inicial) | 13 | 13 | 5 |
| listar_personagens | 19 | 19 | 2 |
| ler_personagem (ficha pequena) | 10 | 10 | 4 |
| ler_personagem (Editor, ficha compartilhada) | 19 | 19 | 8 |
| acesso_personagem (a vigia) | 14 | 13 | 3 |
| listar_compartilhados_comigo | 17 | 17 | 5 |
| listar_campanhas | 10 | 10 | 4 |
| ler_campanha (mestre) | 18 | 18 | 3 |
| listar_personagens_campanha — 8 fichas | 13 | 13 | 5 |
| listar_personagens_campanha — cache vazio | 24 | 24 | 8 |
| salvar_personagem (ficha pequena) | 22 | 11 | 10 |
| salvar_personagem (ficha de 300 KB) | 15 | 11 | 10 |
| ajustar_personagem (botão do mestre) | 17 | 14 | 10 |
| ler_fotos (8 cartões) | 16 | 16 | 5 |
| LOTE abrir ficha | 28 | 24 | 8 |
| LOTE abrir ficha compartilhada | 31 | 30 | 9 |
| LOTE abrir campanha | 30 | 29 | 7 |
| recusa a ficha alheia | 20 | 17 | 4 |
| **soma dos 33 cenários** | **470** | **442** | **218** |

Os dados que atravessam entre o Sheets e o script praticamente não mudam (2 233 KB →
2 214 KB → 2 244 KB): o lote pode trazer uma aba que a ação acabou não usando — custa
células, nunca uma decisão.

**O que não mudou de propósito:** a trava continua obtida antes das conferências de
revisão, autorização e integridade dos blocos, e o manifesto continua sendo publicado
do mesmo jeito; a pré-carga entra DEPOIS de obter a trava, então o tempo segurando a
trava cai porque há menos viagens, não porque alguma verificação saiu dela.

### Leituras em lote — como ligar (opcional)

1. No editor do Apps Script: **Serviços** (o "+" ao lado de "Serviços") → **Google
   Sheets API** → versão **v4** → identificador **`Sheets`** → **Adicionar**. Isso
   acrescenta ao `appsscript.json`:
   ```json
   "dependencies": { "enabledAdvancedServices": [
     { "userSymbol": "Sheets", "serviceId": "sheets", "version": "v4" } ] }
   ```
   O `backend/appsscript.json` do repositório fica com `"dependencies": {}` de
   propósito — o serviço é opcional. Colar aquele arquivo por cima do manifesto
   depois de ligar o serviço o desliga (e tudo continua funcionando).
2. Crie uma versão nova da implantação (Implantar → Gerenciar implantações → editar →
   Nova versão). O manifesto já declara o escopo `spreadsheets`, que é o que o
   `batchGet` usa; se o Google ainda assim pedir autorização, autorize com a conta
   que publica.
3. Para desligar sem tirar o serviço: Script Properties → `RAMA_SHEETS_API` = `0`.

**Desligado ou ausente:** `Sheets` não existe no script e toda leitura segue por
`getValues`, como na v2.45 (com os cortes que valem sempre). **Falhando:** o erro vai
para o log — `console.error` quando é configuração ou autorização (API não liberada no
projeto, permissão), `console.warn` quando é passageiro — e a requisição inteira volta
ao caminho padrão. **Cota:** a API do Sheets tem limite de leituras por minuto, por
projeto e por usuário — e o app da Web roda como quem publica, então todas as
requisições da mesa contam para a mesma conta. Uma mesa muito movimentada pode
estourar esse limite; aí o lote falha com aviso (`loteFalhou: 1`) e a requisição
segue pelo `getValues`, mais lenta, mas certa. Se isso aparecer com frequência no
log, `RAMA_SHEETS_API` = `0`. Datas: o R.A.M.A. grava datas como texto ISO ou milissegundos; uma
célula que a planilha tenha transformado em data faz aquela faixa voltar ao
`getValues` (que devolve um objeto Date), para o resultado ser o mesmo.

### Validar numa implantação

Numa implantação **de teste** (nunca na que a mesa usa):

1. Atualize os três `.gs` e crie uma versão nova da implantação.
2. No editor, rode `ligarDiagnostico()`.
3. Abra a página Personagens e uma ficha. Em **Execuções**, cada requisição tem uma
   linha `R.A.M.A. perf {…}`. Sem o serviço avançado: `lotes: 0`. Com ele: `lotes ≥ 1`,
   `preCarregadas` com as abas trazidas e `sheets` menor para `listar_personagens`,
   `ler_personagem` e o `lote` da abertura da ficha. `loteFalhou: 1` quer dizer que o
   lote falhou e a requisição voltou ao caminho padrão — o motivo está no log logo acima.
4. Compare o `ms` de três aberturas seguidas com e sem o serviço (Script Properties
   `RAMA_SHEETS_API` = `0` desliga sem mexer na implantação). Descarte a primeira de
   cada série (arranque do contêiner).
5. No navegador, `RAMARede.medicoes()` separa o tempo do servidor do da rede, e
   `RAMAMedicao.ver()` mostra redesenhos, cálculos reaproveitados, envios poupados e
   perguntas divididas entre abas.
6. Rode `desligarDiagnostico()` ao terminar.

### As ferramentas

```bash
deno run --allow-read testes/medir.js [--servico-avancado] [--backend pasta] [--rastro "rótulo"] [--json saida.json] [--comparar antes.json]
deno run --allow-read testes/medir-salvamento.js [--anterior caminho/do/salvar.js]
deno run --allow-read testes/executar-coordenacao.js
deno run --allow-read --allow-env testes/executar-backend.js [--servico-avancado]
deno run --allow-read --allow-net --allow-env testes/servidor-local.js [--porta 8124] [--backend pasta] [--site pasta]
```

`testes/servidor-local.js` serve o site com o backend no simulador, contas e fichas
sintéticas (a de Ordem vem do retrato do Jeff, por `testes/medicao-fichas.js`) e os
contadores do backend em `/__backend`. Na página da ficha:

```js
const m = await import("/testes/medir-interface.js");
await m.medirFicha({ repeticoes: 3 });
```

---

## Histórico — medições das versões anteriores

As seções abaixo são das versões em que foram feitas e ficam como registro. Os números
delas não foram refeitos.

## Criaturas — v2.28

- O catálogo de criaturas (~210 KB) não vem com nenhuma página: carrega na primeira
  abertura da biblioteca e fica congelado na memória. Nunca vai numa gravação.
- A lista do Homebrew na biblioteca pede `resumo`: nome, VD, elementos, PV — a
  ficha inteira só ao escolher. A lista desenha 60 linhas por vez ("Mostrar mais").
- Os retratos da lista carregam com `loading="lazy"`; as imagens provisórias têm
  1–2 KB cada.
- Combates grandes vão para blocos em vez de serem recusados; a leitura de vários
  combates junta todos os blocos numa leitura só.

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
| linhas e colunas lidas (v2.46) | memória da execução | a requisição | a trava as esvazia ao ser obtida; gravar na aba as esquece |
| linha do índice existe (v2.46) | `CacheService`, chave = id do personagem | 6 h | excluir o personagem apaga; sem a marca, a varredura volta |
| quantos compartilhamentos (v2.46) | `CacheService`, chave = época + id do personagem | 6 h | salvar compartilhamentos e excluir gravam a contagem nova na mesma requisição; só erra para o lado de negar |
| ciclo de cálculo (v2.46) | memória do navegador, um desenho | o desenho | acaba com o desenho |
| respostas entre abas (v2.46) | memória de cada aba, por chave e conta | a validade que cada aba pede | trocar de sessão apaga; resposta de outra conta é ignorada |

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
| `lotes` | (v2.46) leituras em lote pelo serviço avançado — cada uma conta também como uma viagem em `sheets` |
| `preCarregadas` | (v2.46) abas trazidas inteiras pelos lotes |
| `loteFalhou` | (v2.46) 1 quando o lote falhou e a requisição voltou ao `getValues`; o motivo está no log |
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

3. **Ligar o serviço avançado do Sheets.** Desde a v2.46 o backend usa
   `Sheets.Spreadsheets.Values.batchGet` quando o serviço está habilitado —
   ver "Leituras em lote — como ligar", no topo. Sem ele, tudo funciona pelo
   caminho padrão.

4. **Aumentar `TEMPO_LIMITE_MS`.** Não deixa nada mais rápido; só evita
   que o navegador desista de uma resposta que ia chegar.

5. **Espaçar a atualização automática.** `INTERVALO_ATIVO` e
   `INTERVALO_CALMO` em `js/sincronia.js`: menos execuções do Apps Script,
   mudanças dos outros chegando mais devagar.
