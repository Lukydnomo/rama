# A API

Um endereço só, sempre `POST`, sempre JSON. A operação vai no campo `acao`.

```js
RAMAApi.post({ acao: "ler_personagem", personagemId: "..." })
```

O `token` é acrescentado pela camada de API — nenhuma tela o manipula.

Um segundo argumento, opcional, marca a operação como de **segundo plano**:

```js
RAMAApi.post({ acao: "listar_combates", campanhaId: "..." }, { segundoPlano: true })
```

É o que a atualização automática da campanha usa. Toda operação, de primeiro ou de
segundo plano, é anunciada quando começa e quando termina (`RAMAApi.aoOperar(fn)`,
ou o evento `rama:operacao` no `document`, com `{ fase, operacao: { acao, tipo,
segundoPlano }, ok, erro, resumo }`); é disso que vivem a barra de atividade e o selo
"Atualizando…". Ver "Carregamento e gravação" em [CAMPAIGNS.md](CAMPAIGNS.md).

## O transporte

```
POST https://script.google.com/macros/s/.../exec
Content-Type: text/plain;charset=utf-8
```

**O tipo de conteúdo é `text/plain` de propósito.** Com `application/json` o
navegador manda um `OPTIONS` de verificação antes, e o Apps Script não responde
a `OPTIONS` — a requisição morreria no preflight. O corpo continua sendo JSON;
só o cabeçalho é que finge outra coisa.

## As respostas

Sucesso:

```json
{ "ok": true, "dados": ... }
```

Com revisão (leitura e gravação de registro versionado):

```json
{ "ok": true, "rev": 14, "dados": { } }
```

Erro:

```json
{ "ok": false, "erro": "codigo" }
```

Conflito — o único erro que traz dados junto, porque quem chamou precisa deles
para conciliar:

```json
{ "ok": false, "erro": "conflito", "rev": 13, "dados": { } }
```

**Nunca** volta HTML como resposta normal. Se voltar (o Apps Script devolve uma
página de erro quando estoura), o `rede.js` reconhece pelo que é e converte em
`servidor_falhou` com o texto no console — jamais em "sua internet caiu".

---

## Códigos de erro

| Código             | O que aconteceu                                      |
|--------------------|------------------------------------------------------|
| `sem_configuracao` | `API_URL` não preenchida no `config.js` (só local)   |
| `sem_conexao`      | a requisição não saiu deste aparelho (só local)      |
| `prazo`            | o servidor não respondeu a tempo (só local)          |
| `servidor_falhou`  | resposta inesperada, sem JSON                        |
| `acao_desconhecida`| o campo `acao` não existe                            |
| `dados_invalidos`  | o corpo não passou na validação                      |
| `dados_grandes`    | o JSON não cabe numa célula                          |
| `sem_token`        | não veio token                                       |
| `sessao`           | token não reconhecido ou encerrado                   |
| `expirada`         | sessão vencida                                       |
| `inativo`          | conta desativada                                     |
| `credenciais`      | usuário ou senha errados                             |
| `bloqueado`        | tentativas demais; vem com `minutos`                 |
| `nao_encontrado`   | não existe **ou não é seu**                          |
| `conflito`         | a revisão mudou; vem com `rev` e `dados`             |
| `ocupado`          | a trava não foi obtida em 25 s                       |
| `sem_permissao`    | você alcança a campanha, mas não esta ação nela      |
| `instalacao_incompleta` | falta um dos três `.gs`, ou o cabeçalho de uma aba ficou ilegível |

> **`nao_encontrado` também cobre "existe, mas é de outra conta".** Distinguir os
> dois confirmaria que aquele id existe — o mesmo motivo pelo qual login errado
> não diz se foi o usuário ou a senha.

---

## Leitura e gravação

Leitura é idempotente e pode ser repetida quando o Apps Script tropeça no
próprio redirecionamento (404 e 5xx passageiros). Gravação **não** pode:
repetir `criar_personagem` cria dois personagens.

A lista de leituras é explícita no `api.js`, e não deduzida do nome da ação —
nome é fácil de errar, lista é fácil de conferir.

```
ping · sessao · resumo · listar_personagens · ler_personagem · ler_foto
listar_homebrew · ler_homebrew · ler_imagem_criatura
listar_campanhas · ler_campanha · listar_usuarios · sincronizar_campanha
listar_personagens_campanha · listar_rolagens · listar_documentos
ler_imagem_documento · listar_notas_mestre · listar_combates · ler_perfil
ler_capa_campanha
```

Algumas GRAVAÇÕES também entram na lista, porque SUBSTITUEM um valor em vez de
criar registro — repetir não cria nada:

```
salvar_foto · salvar_perfil · salvar_imagem_criatura · salvar_imagem_documento
salvar_capa_campanha
```

E `lote`, que só carrega leitura.

E três casos especiais, que só estão aqui por causa de uma chave:

- `registrar_rolagem` carrega um id próprio, e o servidor reconhece a segunda
  chegada como repetição. **Sem essa chave ela não poderia estar aqui.**
- `atualizar_combate` carrega um `opId` por lote, guardado com o combate: o mesmo
  lote chegando de novo responde `repetida: true` e **não** é aplicado outra vez.
- `atualizar_resumo_personagem` substitui um valor derivado, e só se a revisão da
  ficha ainda for a mesma: repetir grava o mesmo número ou é recusado por revisão.

---

## Ações

### Sessão

#### `ping` — pública
Sem entrada. Devolve `{ servico, planilha, quando }`. Serve para testar a
publicação.

#### `login` — pública
```js
{ acao: "login", usuario: "agente", senha: "..." }
→ { ok: true, token: "...", agente: { id, usuario, nome, avatar } }
→ { ok: false, erro: "credenciais", restam: 6 }
→ { ok: false, erro: "bloqueado", minutos: 15 }
→ { ok: false, erro: "instalacao_incompleta" }
```
O `instalacao_incompleta` aqui quer dizer que a aba `USUARIOS` perdeu uma
coluna essencial do cabeçalho e ela volta vazia — nenhuma senha conferiria.
Ele sai **antes** de procurar a conta, para não revelar se o usuário existe.
Rode `conferirInstalacao()` no editor do Apps Script para ver qual aba é.

A senha viaja uma vez e não volta nunca. O que fica no navegador é o token.

#### `sessao`
Confere o token e devolve o agente. **É a única resposta que vale**: um token
presente no `localStorage` não prova nada.

#### `logout`
Encerra a sessão do token enviado.

#### `lote`
Várias leituras numa requisição só.

```js
{ acao: "lote", token: "...", pedidos: [
    { acao: "sessao" },
    { acao: "ler_personagem", personagemId: "..." },
    { acao: "ler_foto", personagemId: "..." },
] }
→ { ok: true, dados: { respostas: [ {...}, {...}, {...} ] } }
```

`respostas` tem o mesmo tamanho de `pedidos` e vem na mesma ordem. Cada
resposta é exatamente a que a ação devolveria sozinha, mais um campo `acao`.

**O ganho é de latência, não de planilha.** Cada chamada ao Apps Script paga o
custo de preparar uma execução; abrir uma ficha pedia quatro chamadas em duas
ondas e passou a pedir uma.

Quatro coisas que valem sempre:

- **só leitura.** A lista de ações aceitas é fechada no servidor. Gravação
  dentro de um lote responde `acao_desconhecida` — repetir um lote (ele é
  idempotente) repetiria a gravação, e uma falha no meio deixaria metade
  aplicada, sem transação para desfazer;
- **a permissão não afrouxa.** Cada sub-ação chama a mesma função que
  chamaria sozinha, com o usuário da sessão. Pedir a ficha de outra conta
  dentro de um lote é recusado pela mesma linha de código;
- **a sessão é validada uma vez, antes de tudo.** Token inválido recusa o
  lote inteiro e nenhuma sub-ação chega a rodar;
- **no máximo 8 pedidos.** Acima disso, `dados_invalidos`.

Uma sub-ação que falha não derruba as outras: ela devolve o próprio erro na
posição dela.

**O lote é otimização, não requisito.** O site e o Apps Script são publicados
separadamente e podem estar em versões diferentes. Um servidor que ainda não
conhece esta ação responde `acao_desconhecida`, e o cliente volta a pedir uma
coisa de cada vez — a tela demora mais e nada quebra. Qualquer código novo que
dependa do lote precisa continuar funcionando sem ele.

---

### Panorama

#### `resumo`
```js
→ { ok: true, dados: {
      contagens: { personagens, campanhas, homebrew },
      recentes: [ { tipo, id, nome, campanha?, subtipo?, atualizadoEm } ]
   } }
```
Uma chamada só para contagens e últimos registros. A Home deixou de usá-la na
v2.4.1, quando passou a ser uma página de apresentação sem consulta ao
servidor. A ação continua no backend: tirá-la exigiria uma nova implantação
do Apps Script sem ganho nenhum, e ela não expõe nada além do que é da
própria conta.

---

### Personagens

#### `listar_personagens`
Devolve o **cabeçalho** de cada ficha — nome, campanha, classe, origem, datas,
`rev` e a foto — nunca o `fichaJson`. Trinta fichas completas para desenhar
trinta nomes seriam megabytes por tela.

#### `ler_personagem`
```js
{ acao: "ler_personagem", personagemId: "..." }
→ { ok: true, rev: 12, dados: { ...ficha } }
```

#### `criar_personagem`
```js
{ acao: "criar_personagem", dados: { ...ficha } }
→ { ok: true, rev: 1, dados: { id: "..." } }
```
`ownerId` e `id` que venham no corpo são **descartados**. O dono sai da sessão;
o id nasce no servidor. `campanhaId` só vale se a conta for mestre ou jogadora
daquela campanha; senão vira vazio — na coluna e dentro da ficha guardada.

`dados.resumoRecursos` (ficha de Ordem): `{ pv, pe, san }`, o máximo calculado pelas
regras no navegador, para a mesa ver sem receber a ficha — ver
`atualizar_resumo_personagem`. Validado no servidor; forma inválida é descartada, e
ficha universal não guarda resumo.

#### `salvar_personagem`
```js
{ acao: "salvar_personagem", personagemId: "...", rev: 12, dados: { ...ficha } }
→ { ok: true, rev: 13 }
→ { ok: false, erro: "conflito", rev: 13, dados: { ...estadoDoServidor } }
```
Se a revisão no servidor ainda for 12, grava e sobe para 13. Se já estiver em
13, **recusa** e devolve o estado atual. Sobrescrever em silêncio seria mais
simples de programar e apagaria o trabalho de alguém sem ninguém perceber.

`dados.campanhaId`: do **dono**, vale se ele for mestre ou jogador da campanha
(senão vira vazio). De quem **não é dono** (o mestre editando a ficha de um
jogador) é ignorado — a campanha continua a que estava. Nos dois casos a campanha
que ficou valendo é gravada também dentro da ficha, para coluna e ficha não
discordarem.

`dados.resumoRecursos` vale como em `criar_personagem`. Uma gravação sem resumo —
de uma versão do site que não o calculava — mantém o que já estava.

#### `excluir_personagem`
Remove a ficha e a foto.

#### `duplicar_personagem`
Copia ficha e foto num registro novo, com `rev` 1 e " (cópia)" no nome.

---

### Fotos

#### `ler_foto` / `salvar_foto`
```js
{ acao: "salvar_foto", personagemId: "...", imagem: "data:image/webp;base64,..." }
```
Só aceita data URL de imagem, dentro do limite de célula. A foto anda **fora**
do `fichaJson` para não subir junto a cada tecla digitada numa anotação.

---

### Homebrew

#### `listar_homebrew`
Todos os modelos da conta, com o conteúdo — são registros pequenos.

#### `salvar_homebrew`
```js
{ acao: "salvar_homebrew", dados: { id?, tipo, nome, ... } }
→ { ok: true, dados: { id }, rev }
```
Cria ou atualiza conforme o `id` vier — e conforme ele ser mesmo da conta. Um id
de outra pessoa **não** vira atualização: vira registro novo, sob quem pediu.

`tipo` aceita `item`, `arma`, `armadura`, `mochila`, `criatura` e `habilidade`;
qualquer outro vira `item`. Até a v2.4.2 `habilidade` não estava na lista, e as
habilidades enviadas à biblioteca ficaram com a coluna `tipo = item`. Elas não são
reescritas: `listar_homebrew` e `ler_homebrew` leem o tipo do conteúdo guardado
(que sempre disse `habilidade`), e o próximo salvamento do registro corrige a
coluna.

#### `excluir_homebrew`
Não afeta as fichas que já usam uma cópia daquele modelo.

---

### Campanhas

`listar_campanhas`, `ler_campanha`, `criar_campanha`,
`salvar_campanha` (com `rev`), `excluir_campanha`, e as demais em
[Ações de campanha](#ações-de-campanha).

Excluir uma campanha **não** apaga personagens: ela é um agrupamento, e apagar o
agrupamento não pode apagar o que estava agrupado. Os personagens ficam sem
campanha.

---

### Perfil

#### `ler_perfil`
```js
→ { ok: true, dados: { id, usuario, nome, avatar, criadoEm, preferencias } }
```

#### `salvar_perfil`
```js
{ acao: "salvar_perfil", dados: { nome?, avatar?, preferencias? } }
```
Só os campos enviados mudam. **Não existe troca de senha por aqui** — senha é
assunto exclusivo do editor do Apps Script.

---

## Ações de campanha

Todas em `backend/Campanhas.gs`. A primeira linha de cada uma é
`contextoDaCampanha()` ou `exigirMestre()` — não existe caminho que pule isso.

| Ação | Quem | Observação |
|---|---|---|
| `listar_campanhas` | qualquer | as suas, as que joga, e as públicas |
| `ler_campanha` | membro ou espectador | espectador não recebe a lista de membros; traz `rolagensMestreOcultas`, `ocultarStatusJogadores`, `capa` (só se existe, tamanho e data) e `marcas` |
| `sincronizar_campanha` | membro ou espectador | só as marcas de cada parte, lidas do cache (espectador: `campanha` e `membros`) |
| `criar_campanha` | qualquer | nasce privada |
| `salvar_campanha` | mestre | com `rev`; aceita `ocultarStatusJogadores` e devolve o valor gravado |
| `excluir_campanha` | **criador** | leva membros, rolagens, documentos, notas, combates e a capa; fichas ficam só sem campanha |
| `ler_capa_campanha` | membro ou espectador | a imagem da capa; acesso conferido de novo; aceita no `lote` |
| `salvar_capa_campanha` | mestre | substitui; `imagem` vazia remove |
| `listar_usuarios` | qualquer | diretório mínimo: id, usuario, nome, avatar |
| `salvar_participantes` | mestre | ids de usuário; quem sai leva os personagens junto |
| `listar_personagens_campanha` | membro | identificação para todos; recursos atuais e máximos dos outros só com a ocultação desligada; dados de cálculo e `resumoRecursos` só para mestre e dono; nunca a ficha inteira. Espectador recebe lista vazia |
| `atualizar_resumo_personagem` | dono ou mestre | máximo de PV, PE e SAN de ficha de Ordem, **com `rev`**; a revisão não sobe |
| `vincular_personagem` | dono ou mestre | só entra ficha de quem é mestre ou jogador da campanha; tira da campanha anterior; é o que o botão "Adicionar personagem" usa |
| `ajustar_personagem` | dono ou mestre | um campo, por id, **com `rev`** |
| `registrar_rolagem` | membro | idempotente pelo `rolagemId` |
| `listar_rolagens` | membro | paginado; oculta do mestre não sai para jogador |
| `limpar_rolagens` | mestre | só daquela campanha |
| `listar_documentos` | membro | filtrado no servidor |
| `salvar_documento` / `excluir_documento` | mestre | `visiveis` só aceita membros |
| `ler_imagem_documento` | quem pode ver o documento | permissão conferida de novo |
| `salvar_imagem_documento` | mestre | |
| `listar_notas_mestre` / `salvar_nota_mestre` / `excluir_nota_mestre` | **mestre** | não existe variação para jogador |
| `listar_combates` | membro autorizado | com `turno`; jogador não recebe o snapshot das criaturas nem `visiveis`; recursos de personagem pela regra dos cartões |
| `salvar_combate` / `excluir_combate` | mestre | com `rev`; `salvar_combate` cria e é o caminho das versões anteriores do site — preserva turno e `opId` guardados |
| `atualizar_combate` | mestre | lote de operações, **com `rev` e `opId`**; tudo ou nada |

### `ajustar_personagem`

```js
{ acao: "ajustar_personagem", personagemId, rev, campanhaId?,
  alvo: "status" | "atributo" | "recurso", itemId, campo, valor }
```

`campo` só aceita `atual` e `maximo` para status, `valor` para atributo e `atual`
para recurso (ficha de Ordem; `itemId` é `pv`, `pe` ou `san`, piso −99). `valor`
precisa ser número — vazio, `null` ou texto responde `dados_invalidos` em vez de
virar 0. Com `campanhaId`, o personagem precisa continuar vinculado a ela
(`nao_encontrado` se não estiver). Alvo ou campo fora dessa lista responde
`dados_invalidos`. **Não é um caminho
paralelo mais frouxo** — é o mesmo controle de revisão sobre um payload menor.

### `registrar_rolagem`

```js
{ acao: "registrar_rolagem", campanhaId, rolagemId, personagemId, tipo, nome, dados }
```

O `rolagemId` é gerado por quem rolou. **Nunca gere um id novo ao repetir o
envio**: é ele que impede a mesma rolagem de virar duas linhas. A resposta traz
`repetida: true` quando o servidor reconhece a segunda chegada.

A `visibilidade` **não é aceita do cliente**. Rolagem de jogador é sempre
pública na mesa; a do mestre segue a configuração da campanha.

### `sincronizar_campanha`

```js
{ acao: "sincronizar_campanha", campanhaId }
→ { ok: true, dados: { papel: "jogador", mestre: false,
      marcas: { campanha, membros, personagens, combates, documentos, rolagens } } }
→ { ok: false, erro: "nao_encontrado" }   // esta conta não alcança mais a campanha
```

A pergunta leve da atualização automática. As marcas são carimbos opacos: compare
com as anteriores e, na parte que mudou, busque pelo caminho normal
(`ler_campanha`, `listar_personagens_campanha`, `listar_combates`,
`listar_documentos`, `listar_rolagens`). Com as marcas e o papel no cache, nenhuma
aba da planilha é lida. Uma marca que o cache perdeu vira `r` + o minuto atual — a
parte é buscada de novo no máximo uma vez por minuto até a próxima gravação. Ver
[CAMPAIGNS.md](CAMPAIGNS.md#atualização-automática).

### `ler_capa_campanha` / `salvar_capa_campanha`

```js
{ acao: "ler_capa_campanha", campanhaId }
→ { ok: true, dados: { imagem: "data:image/webp;base64,...", atualizadoEm, largura, altura } }
   // sem capa: imagem "", largura 0, altura 0

{ acao: "salvar_capa_campanha", campanhaId, imagem: "data:image/webp;base64,...", largura: 1500, altura: 500 }
→ { ok: true, dados: { existe: true, atualizadoEm, largura, altura } }

{ acao: "salvar_capa_campanha", campanhaId, imagem: "" }
→ { ok: true, dados: { existe: false } }
```

`imagem` precisa ser `data:image/(webp|jpeg|png);base64,…`, com `largura` e `altura`
inteiras de 1 a 4096. Acima do limite da célula responde `dados_grandes` — nunca é
truncada. Só o mestre grava. A leitura passa por `contextoDaCampanha`: a capa de
campanha privada não sai para quem está de fora, nem pelo id direto. `ler_campanha`
diz se há capa (`capa: { existe, atualizadoEm, largura, altura }`) sem trazer a
imagem.

### `listar_personagens_campanha`

```js
{ acao: "listar_personagens_campanha", campanhaId }
→ { ok: true, config: { ocultarStatusJogadores: false }, dados: [ {
      id, nome, tipoFicha: "ordem" | "universal", classe, origem, ownerId, dono, foto, rev,
      souDono, detalhado, podeEditarRecursos, podeAbrirFicha, recursosVisiveis,

      // Ordem — mestre ou dono (detalhado):
      ordem: { ...dados de cálculo }, inventario: { itens }, resumoRecursos,
      // Ordem — outro jogador:
      ordem: { classe, trilha, nex, nivel, opcionais: { nexExperiencia } },
      recursos: [ { chave: "pv", rotulo: "PV", atual: 18, maximo: 32 } ],  // ou recursosPendentes: true
      // Universal:
      atributos: [ { id, nome, sigla, valor, dado } ],
      status: [ { id, nome, atual, maximo } ],
   } ] }
```

Com `recursosVisiveis: false` (ocultação ligada, personagem de outra conta),
`recursos` e `status` **não vêm** — não há o que esconder na tela.
`recursosPendentes: true` quer dizer que a ficha de Ordem ainda não tem resumo
guardado. `podeEditarRecursos`, `podeAbrirFicha` e `recursosVisiveis` são rótulos
para a tela: `ajustar_personagem` e `ler_personagem` conferem de novo.

### `atualizar_resumo_personagem`

```js
{ acao: "atualizar_resumo_personagem", personagemId, rev: 7, resumo: { pv: 32, pe: 9, san: null } }
→ { ok: true, rev: 7, dados: { mudou: true } }
→ { ok: false, erro: "conflito", rev: 8 }
```

Só ficha de Ordem (`dados_invalidos` na universal), só dono ou mestre da campanha
da ficha, revisão obrigatória. Grava o resumo dentro do `fichaJson` **sem subir a
revisão** — o resumo é derivado, e subir a revisão poria em conflito a ficha aberta
em outro aparelho. Inteiros de −999 a 99.999; `san` pode ser `null` ("Jogando sem
Sanidade"). O atual de cada recurso não entra: ele é lido de `ordem.recursos` na
hora.

### `listar_combates`

```js
{ acao: "listar_combates", campanhaId }
→ { ok: true, dados: [ {
      id, nome, estado: "preparando" | "ativo" | "encerrado", rev, criadoEm, atualizadoEm,
      turno: { rodada: 2, ativoId: "pt-..." },
      participantes: [ { id, tipo, nome, ordem, personagemId, recursos?, recursosPendentes? } ],
      visiveis: [ ...ids ]   // só para o mestre
   } ] }
```

O mestre recebe cada participante inteiro (a criatura com `snapshot` e `origemId`).
O jogador recebe de cada um só `id`, `tipo`, `nome`, `ordem` e `personagemId` (nulo
em criatura) e, em personagem, `recursos` pela regra dos cartões: os dos próprios
personagens sempre, os dos outros só com a ocultação desligada. Um combate em
andamento sem turno guardado (anterior à v2.12) vem com rodada 1 e o primeiro da
ordem.

### `atualizar_combate`

```js
{ acao: "atualizar_combate", campanhaId, combateId, rev: 14, opId: "lote-3f9c2a1b",
  ops: [
    { tipo: "iniciativa", participanteId: "pt-lia", valor: 18 },
    { tipo: "turno", direcao: "proximo" }
  ] }
→ { ok: true, rev: 15, avisos: [], dados: { ...combate como o mestre vê } }
→ { ok: true, repetida: true, rev: 15, dados: { ... } }                 // o mesmo opId de novo
→ { ok: false, erro: "conflito", rev: 15, dados: { ...estado atual } }  // o combate mudou
→ { ok: false, erro: "dados_invalidos", indice: 1, motivo: "estado" }
```

| operação | campos | regra |
|---|---|---|
| `iniciativa` | `participanteId`, `valor` | número de verdade (texto é recusado), até ±9999 |
| `criatura_status` | `participanteId`, `statusId`, `valor` | só criatura; muda o snapshot **deste** combate, de 0 ao máximo (sem máximo, até 999.999) |
| `turno` | `direcao`: `"proximo"` ou `"anterior"` | só com o combate `ativo`; voltar do primeiro turno da rodada 1 não muda nada e devolve o aviso `{ aviso: "inicio" }` |
| `estado` | `valor`: `"ativo"` ou `"encerrado"` | só `preparando → ativo → encerrado`; iniciar põe rodada 1 e o primeiro da ordem; pedir o estado atual não é erro |
| `adicionar` | `participantes` | personagem só da mesa e sem repetir; criatura entra como snapshot; até 200 no combate |
| `remover` | `participanteId` | tirar quem tem o turno passa a vez a quem vinha depois; tirar quem já saiu não é erro |
| `renomear` | `nome` | até 120 caracteres, não vazio |
| `visiveis` | `lista` | ids de usuário; quem não é da mesa é descartado |

- `opId`: 8 a 80 caracteres `[A-Za-z0-9_-]`, **o mesmo em toda repetição** do
  lote. O servidor guarda os 40 últimos com o combate e confere o `opId` **antes**
  da revisão: o lote que já entrou subiu a revisão, e a segunda chegada dele
  pareceria um conflito.
- Até 100 operações por lote, aplicadas em ordem e **todas ou nenhuma**.
- Só o mestre (`exigirMestre`).

As regras de turno estão em [CAMPAIGNS.md](CAMPAIGNS.md#turnos-e-rodadas).

---

## Segurança — o contrato

O frontend roda no navegador de outra pessoa. Pode ser lido inteiro, alterado
pelo console e chamado por fora da interface. Então:

1. **O `ownerId` nunca vem do pedido.** É derivado da sessão, no servidor.
2. **Toda leitura e toda gravação conferem o dono**, mesmo que a tela já tivesse
   escondido o botão. Esconder é conveniência visual; recusar é no servidor.
3. **Trocar o id no pedido não abre o registro de outra conta.**
4. **Token expirado ou inexistente não funciona**, e a resposta é a mesma nos
   dois casos.
5. **A senha existe só no Apps Script.** O navegador guarda o token de sessão e
   os dados públicos do perfil — nunca senha, hash, sal ou segredo.
6. **Estar logado na tela não é autorização.** Se este frontend inteiro fosse
   adulterado, o servidor continuaria recusando o que precisa recusar.
7. **Papel de campanha vem do banco.** Mandar `papel: "mestre"` ou
   `ehMestre: true` no corpo não promove ninguém.
8. **Ser mestre dá acesso à FICHA vinculada, não à conta.** O `ownerId` nunca
   muda, e apagar ou duplicar o personagem de outra pessoa continua fora de
   alcance.
9. **O que a pessoa não pode ver não sai do servidor.** Recursos escondidos pelo
   mestre, snapshot de criatura, notas, documentos não liberados e rolagens ocultas
   não chegam ao navegador — `display: none` nunca é a proteção.

Essas nove linhas são o que os testes de segurança conferem, entre as 447
verificações de `testes/executar-backend.js`. A matriz completa está em
[PERMISSIONS.md](PERMISSIONS.md).
