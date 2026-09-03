# A API

Um endereço só, sempre `POST`, sempre JSON. A operação vai no campo `acao`.

```js
RAMAApi.post({ acao: "ler_personagem", personagemId: "..." })
```

O `token` é acrescentado pela camada de API — nenhuma tela o manipula.

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
listar_homebrew · listar_campanhas · ler_campanha · ler_perfil
```

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
```
A senha viaja uma vez e não volta nunca. O que fica no navegador é o token.

#### `sessao`
Confere o token e devolve o agente. **É a única resposta que vale**: um token
presente no `localStorage` não prova nada.

#### `logout`
Encerra a sessão do token enviado.

---

### Panorama

#### `resumo`
```js
→ { ok: true, dados: {
      contagens: { personagens, campanhas, homebrew },
      recentes: [ { tipo, id, nome, campanha?, subtipo?, atualizadoEm } ]
   } }
```
Uma chamada só para a Home inteira. Três chamadas para escrever três números
pagariam três vezes a lentidão do Apps Script.

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
o id nasce no servidor.

#### `salvar_personagem`
```js
{ acao: "salvar_personagem", personagemId: "...", rev: 12, dados: { ...ficha } }
→ { ok: true, rev: 13 }
→ { ok: false, erro: "conflito", rev: 13, dados: { ...estadoDoServidor } }
```
Se a revisão no servidor ainda for 12, grava e sobe para 13. Se já estiver em
13, **recusa** e devolve o estado atual. Sobrescrever em silêncio seria mais
simples de programar e apagaria o trabalho de alguém sem ninguém perceber.

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

#### `excluir_homebrew`
Não afeta as fichas que já usam uma cópia daquele modelo.

---

### Campanhas

`listar_campanhas`, `ler_campanha`, `criar_campanha`,
`salvar_campanha` (com `rev`), `excluir_campanha`.

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

Essas seis linhas são o que os testes de segurança conferem.
