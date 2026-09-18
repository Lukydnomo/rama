# O banco

Uma planilha do Google, dezesseis abas. Criadas e mantidas por `setupRama()` — não
monte nada à mão.

> **Atualizando para a v2.15:** rode `setupRama()` de novo. Ele cria a aba
> `PERSONAGENS_BLOCOS`, acrescenta a coluna `armazenamento` no fim de `PERSONAGENS`
> e marca o conteúdo dos blocos como texto puro — e **não converte ficha nenhuma**.
> Toda ficha antiga continua no formato antigo e abre normalmente; cada uma passa
> para blocos sozinha, na próxima gravação que der certo. Rodar duas vezes dá o
> mesmo resultado, e nenhuma aba, linha ou coluna existente é apagada ou movida. O
> relatório do setup diz quantas fichas já estão em blocos. Antes de voltar a uma
> versão anterior do backend, leia "Voltar a uma versão anterior", no fim de
> [A ficha em blocos](#personagens_blocos--a-ficha-em-blocos).

> **Atualizando para a v2.12:** rode `setupRama()` de novo. Ele cria a aba
> `CAMPANHA_CAPAS` e **não toca em nada que já existe** — nenhuma aba é recriada,
> nenhuma linha é apagada, nenhuma coluna muda de lugar. Rodar duas vezes dá o
> mesmo resultado. Campanhas, combates e fichas antigos não precisam de migração:
> o que falta (capa, turno, resumo de recursos, a chave de ocultação) é lido como
> ausente e preenchido na primeira gravação.

> **Atualizando da v1 para a v2:** rode `setupRama()` de novo. Ele cria as seis
> abas novas, acrescenta a coluna `visibilidade` em `HOMEBREW` e `CAMPANHAS`, e
> **não toca em nada que já existe**. Coluna nova entra no fim e fica vazia nas
> linhas antigas; vazio é lido como `privado`.

## Duas decisões que explicam o formato

**Colunas para o que se procura; JSON para o que se lê inteiro.**
Uma ficha é sempre lida por completo e nunca consultada por campo. Já o nome, a
campanha e a data aparecem na listagem sem ninguém abrir a ficha. Por isso
esses saem para colunas próprias e o resto vira `fichaJson`.

**Nada de uma coluna por perícia.** A ficha é extensível: o usuário cria status
e perícias novos. Uma coluna por campo viraria centenas de colunas e uma
migração a cada personagem que inventasse "Carga Paranormal".

**Todo registro tem id permanente e independente do nome.** Nunca use a posição
na planilha, o índice de um array ou o nome como identificador — renomear
quebraria toda referência.

---

## USUARIOS

| Coluna         | Conteúdo                                                    |
|----------------|-------------------------------------------------------------|
| `id`           | UUID, permanente. É o `ownerId` de tudo que a pessoa cria   |
| `usuario`      | login, minúsculas, único                                     |
| `nome`         | como aparece na interface                                    |
| `hashSenha`    | 64 hex — PBKDF2-HMAC-SHA256, 32 bytes                        |
| `salt`         | 32 hex, um por usuário                                       |
| `iteracoes`    | quantas voltas geraram aquele hash                           |
| `ativo`        | `true` / `false`                                             |
| `criadoEm`     | ISO 8601                                                     |
| `atualizadoEm` | ISO 8601                                                     |

O `iteracoes` é gravado **por linha**, e não lido de uma configuração global, para
o custo poder subir no futuro sem invalidar as senhas já cadastradas: cada uma
é conferida com o número que a gerou.

O *pepper* **não está aqui**. Ele vive nas Script Properties, e é isso que faz
uma cópia vazada da planilha continuar inútil para quem quer testar senhas.

## SESSOES

| Coluna            | Conteúdo                                        |
|-------------------|-------------------------------------------------|
| `tokenHash`       | SHA-256 do token — **o token nunca é guardado** |
| `userId`          | dono da sessão                                  |
| `criadoEm`        | epoch ms                                        |
| `ultimaAtividade` | epoch ms                                        |
| `expiraEm`        | epoch ms                                        |
| `ativo`           | `true` / `false`                                |
| `agente`          | texto livre, para reconhecer o aparelho         |

Guardar o hash e não o token segue o mesmo raciocínio da senha: quem ler a
planilha vê 64 caracteres que não entram em lugar nenhum.

A atividade é renovada no máximo **uma vez por hora**. Gravar a cada requisição
dobraria as escritas e disputaria a trava com o salvamento da ficha, para
ganhar uma precisão que ninguém usa.

Sessões vencidas ou encerradas há mais de 30 dias são removidas a cada login —
validar sessão lê a aba inteira, e uma aba que só cresce deixa o login mais
lento a cada entrada.

## PERFIS

| Coluna             | Conteúdo                          |
|--------------------|-----------------------------------|
| `userId`           | chave                             |
| `avatar`           | data URL da miniatura             |
| `preferenciasJson` | reservado                         |
| `atualizadoEm`     | ISO 8601                          |

Separado de `USUARIOS` de propósito: o avatar tem dezenas de milhares de
caracteres, e a aba de usuários é lida em **todo** login e em **toda**
validação de sessão. Junto, cada requisição arrastaria a imagem.

## PERSONAGENS

| Coluna         | Conteúdo                                      |
|----------------|-----------------------------------------------|
| `id`           | UUID                                          |
| `ownerId`      | derivado da sessão, **nunca do pedido**       |
| `nome`         | espelho, para a listagem                      |
| `campanhaId`   | espelho; só aceito se a campanha for da conta |
| `classe`       | espelho                                       |
| `origem`       | espelho                                       |
| `criadoEm`     | ISO 8601                                      |
| `atualizadoEm` | ISO 8601                                      |
| `rev`          | inteiro, sobe a cada gravação                 |
| `fichaJson`    | formato antigo: a ficha inteira — ver CHARACTER_SCHEMA.md. Em blocos: só um aviso para servidor antigo |
| `armazenamento`| vazio no formato antigo; em blocos, o **manifesto** (v2.15) |

A ficha — em `fichaJson` ou nos blocos — é a mesma, descrita em
[CHARACTER_SCHEMA.md](CHARACTER_SCHEMA.md). Numa ficha de Ordem ela leva também
`resumoRecursos` `{ versao, pv, pe, san }` (v2.12): o máximo de PV, PE e Sanidade
calculado por quem pode editar a ficha, para a mesa ver sem receber a ficha. Ele é
derivado — gravá-lo por `atualizar_resumo_personagem` não sobe o `rev`. Ver "Painel
da mesa" em [CAMPAIGNS.md](CAMPAIGNS.md).

As colunas de espelho existem para a listagem não precisar abrir e interpretar
a ficha de trinta personagens só para escrever trinta nomes. Nome, classe e origem
são reescritos a partir da ficha em toda gravação, e entram na MESMA gravação de
linha que troca o conteúdo — não têm como divergir.

**A coluna `campanhaId` é a que vale (v2.15).** É ela que decide permissão, e a
leitura da ficha a coloca dentro do que sai para o navegador. Tirar um jogador da
mesa (`salvar_participantes`, `excluir_campanha`) limpa só a coluna, e
`vincular_personagem` também só grava colunas — nenhum dos três relê ou reescreve a
ficha. Uma ficha antiga com outra campanha escrita dentro do JSON abre dizendo a da
coluna, e a próxima gravação a corrige lá dentro.

`armazenamento` fica depois de `fichaJson` de propósito: numa planilha atualizada o
`setupRama()` a acrescenta no fim, e declarada no mesmo lugar as duas ordens
coincidem. Ela NÃO está entre as colunas leves — a listagem de personagens não a
lê.

## PERSONAGENS_FOTOS

| Coluna         | Conteúdo                              |
|----------------|---------------------------------------|
| `personagemId` | chave                                 |
| `ownerId`      | repetido aqui, de propósito           |
| `imagem`       | data URL, ~256 px, comprimida         |
| `atualizadoEm` | ISO 8601                              |

**Por que a foto mora fora da ficha:** ela é o campo mais pesado e o que menos
muda. Dentro do `fichaJson`, cada tecla digitada numa anotação reenviaria a
imagem inteira — e a célula tem limite.

O `ownerId` é repetido para a conferência de permissão não precisar consultar a
aba de personagens antes de decidir.

## PERSONAGENS_BLOCOS — a ficha em blocos

| Coluna         | Conteúdo                                                      |
|----------------|---------------------------------------------------------------|
| `personagemId` | de quem é o bloco                                             |
| `geracao`      | a gravação a que o bloco pertence (`g-` + UUID)               |
| `indice`       | a posição do bloco, a partir de 0                             |
| `total`        | quantos blocos a geração tem                                  |
| `tamanho`      | quantos caracteres da ficha o bloco carrega                   |
| `criadoEm`     | ISO 8601                                                      |
| `conteudo`     | `RB\|` + um pedaço do JSON da ficha + `\|RB`                   |

**Por que existe.** Até a v2.14 a ficha inteira ficava numa célula, `fichaJson`, e
uma célula do Google aceita 50 000 caracteres. Uma ficha com muitas anotações,
rituais e habilidades passava disso e **deixava de salvar** — o servidor recusava
com `dados_grandes`, e o site tentava de novo para sempre. Aumentar o limite não
resolve (o teto é do Google), e comprimir só adia (texto cresce). Desde a v2.15 a
ficha é guardada em quantos blocos forem precisos, cada um abaixo do limite seguro
da célula (`MAX_CELULA`, 45 000 caracteres, com os marcadores).

**Geração.** Os blocos de uma gravação formam uma geração, escrita de uma vez e
**nunca alterada depois**. Gravar de novo é escrever uma geração nova. É isso que
deixa a versão anterior sempre inteira enquanto a nova ainda não foi confirmada.

**O manifesto** mora na coluna `armazenamento` de `PERSONAGENS` e diz qual geração
vale e como conferi-la:

```jsonc
{
  "formato": "blocos", "versao": 1,
  "geracao": "g-…",               // a geração que vale
  "blocos": 4,                    // quantos blocos ela tem
  "tamanho": 137915,              // caracteres do texto inteiro
  "hash": "sha256:…",             // SHA-256 do texto inteiro, em UTF-8
  "rev": 9,                       // a revisão da linha quando o manifesto foi escrito
  "operacao": "op-…",             // o id da última gravação que subiu a revisão
  "gravadoEm": "2026-09-18T…",
  "anterior": { "geracao": "g-…", "blocos": 3, "tamanho": 131002,
                "hash": "sha256:…", "rev": 8, "gravadoEm": "…" }   // o ponto de volta
}
```

`rev` continua sendo a revisão **lógica** da ficha — a que o navegador manda e o
conflito confere. A geração é só a identidade física do conteúdo: ela muda sem a
revisão mudar (o resumo de recursos, que é derivado) e a revisão muda sem a geração
mudar (o vínculo de campanha, que é coluna).

### Formato antigo e blocos: o marcador

| `armazenamento` | onde está a ficha | `fichaJson` guarda |
|---|---|---|
| vazio | formato antigo, em `fichaJson` | a ficha inteira |
| manifesto `formato: "blocos"`, `versao: 1` | nos blocos da geração do manifesto | um **aviso** (abaixo) |
| qualquer outra coisa | desconhecido: nada é lido **nem gravado por cima** | — |

O aviso em `fichaJson` é um JSON pequeno com `_armazenamento: "blocos"`,
`schemaVersion: 999999` e um nome que diz o que houve. Ele existe para uma versão
**antiga** do servidor, que leria a célula como a ficha inteira: vazia, ela
apareceria como uma ficha em branco; com o aviso, o site recusa abrir para edição
(é uma ficha "de versão mais nova"). O aviso nunca é lido como ficha pelo servidor
atual — sem manifesto ao lado, a leitura responde `ficha_ilegivel`.

### Gravar

Tudo dentro da trava, e nesta ordem:

| passo | o que acontece | se parar aqui |
|---|---|---|
| 1 | confere sessão, acesso, revisão e tamanho | nada foi escrito |
| 2 | decide o que a limpeza vai levar: as gerações deste personagem menos a que vale | nada foi escrito |
| 3 | escreve a geração nova em linhas NOVAS, no fim da aba, numa chamada | sobram linhas que nenhum manifesto aponta — lixo, não estrago; a ficha continua na versão anterior |
| 4 | lê essas linhas de volta e confere o texto inteiro, caractere por caractere | idem, e a resposta é `armazenamento_falhou` |
| 5 | grava a linha do personagem: manifesto novo, aviso, revisão, nome, classe, origem, campanha — **uma** gravação de uma linha | idem: é esta gravação que troca de versão, e ela entra inteira ou não entra |
| 6 | apaga as gerações decididas no passo 2 | sobra uma geração a mais, que a próxima gravação recolhe |
| 7 | `SpreadsheetApp.flush()` antes de soltar a trava e de responder | a resposta é erro — nunca "salvo" |

O Sheets não tem transação: várias escritas não viram uma. A segurança vem da ordem
(nada existente é tocado antes de a versão nova estar provada) e da troca de uma
linha só no passo 5. Ficam guardadas **duas** gerações por ficha: a que vale e a
imediatamente anterior — para uma leitura que tenha começado antes da troca e como
ponto de volta de `restaurarGeracaoAnterior()`.

### Ler

A leitura acha as linhas da geração do manifesto com uma varredura das seis
colunas curtas da aba (nunca o conteúdo de outras fichas), lê o conteúdo só dessas
linhas — os blocos de uma geração nascem lado a lado, então costuma ser uma chamada
— e confere tudo **antes** de interpretar o JSON:

- cada linha é mesmo deste personagem e desta geração;
- cada posição de 0 a `blocos − 1` aparece uma vez (uma cópia idêntica é tolerada;
  duas diferentes, não);
- marcadores e tamanho de cada bloco batem;
- o texto remontado tem o tamanho e o SHA-256 do manifesto.

A leitura corre fora da trava. Se uma gravação trocar a geração no meio — e a
limpeza apagar ou deslocar linhas —, a leitura percebe (linha fora do lugar, bloco
ausente), lê a linha do personagem de novo e tenta com o manifesto novo, até três
vezes. Uma falha que continua com o mesmo manifesto é defeito de verdade.

**Ler nunca devolve ficha vazia.** Bloco ausente, bloco trocado, texto que não
confere, JSON inválido — no formato antigo ou em blocos — respondem `ficha_ilegivel`
com o `motivo` (`bloco_ausente`, `bloco_duplicado`, `integridade`, `json`, `vazia`,
`manifesto_ausente`, `manifesto_ilegivel`, `formato_desconhecido`). Até a v2.14, JSON
corrompido virava ficha em branco — e ficha em branco na tela é ficha que alguém
edita e salva por cima da original. Nenhuma gravação parcial (ajuste do mestre,
resumo, duplicação) toca numa ficha que não se montou.

### Uma resposta perdida não aplica duas vezes

Cada gravação de ficha leva um `operacaoId`. Quando a resposta não chega (prazo,
rede), o navegador repete o **mesmo** pedido — mesma ficha, mesma revisão, mesmo id.
O manifesto guarda o id da última gravação que subiu a revisão e a revisão que ela
produziu: se os dois batem, a gravação já está aplicada, e o servidor responde
`{ ok: true, repetida: true }` sem aplicar de novo — em vez de acusar conflito com a
própria gravação. Criar e duplicar guardam o id no manifesto do personagem criado (e,
por dez minutos, no cache): a mesma criação chegando de novo devolve o personagem
que a primeira criou.

### A migração

Não há migração em massa. `setupRama()` cria a aba e a coluna e não toca em ficha
nenhuma. Uma ficha no formato antigo é lida como sempre foi e passa para blocos na
**primeira gravação que der certo** — a ficha salva, o ajuste do mestre, o resumo
de recursos. Até lá nada muda para ela. Planilha sem o setup desta versão: as fichas
antigas abrem; salvar responde `instalacao_incompleta`, sem gravar nada.

### A limpeza

Cada gravação apaga as gerações velhas da própria ficha (passo 6). Excluir um
personagem apaga todas as gerações dele, e só dele. O que sobra — uma exclusão cuja
limpeza falhou, uma criação que parou antes da linha — é recolhido por
`limparBlocosOrfaos()`, rodada à mão no editor: ela nunca apaga a geração ativa nem a
anterior de ninguém, nem os blocos de uma ficha cujo manifesto esta versão não
entende, e espera dez minutos antes de apagar blocos de um personagem que não existe.
`conferirInstalacao()` avisa quando há blocos sem dono.

### Recuperação

Rodadas à mão no editor do Apps Script (nenhuma está no roteamento):

- `diagnosticarPersonagem(id)` — formato, manifesto, revisão do manifesto contra a da
  linha, e a conferência da geração ativa e da anterior (CONFERE / NÃO CONFERE, com o
  motivo). Não imprime o conteúdo da ficha.
- `restaurarGeracaoAnterior(id)` — confere a geração anterior inteira e a faz voltar
  a valer; a revisão sobe e a geração que valia vira a "anterior", sem ser apagada.
  Com a geração ativa conferindo, recusa — a menos que se passe `true` como segundo
  argumento, para desfazer a última gravação de propósito.

Se nem a anterior conferir: a cópia exportada da ficha (Opções da ficha → Exportar
ficha → Baixar arquivo, importável no Perfil) ou o histórico de versões da planilha
no Google Drive.

### Voltar a uma versão anterior do backend

Uma implantação **anterior à v2.15** não entende blocos. Com ela:

- fichas no formato antigo continuam funcionando normalmente;
- fichas em blocos aparecem como o **aviso**: o site recusa abrir para edição. Um
  site anterior a esse cuidado mostraria uma ficha com o nome "⚠ … — atualize o
  servidor";
- uma gravação feita assim mesmo por um servidor antigo só reescreve a linha até
  `fichaJson`: o manifesto (`armazenamento`, depois dela) e os blocos ficam intactos,
  e voltam a valer quando a v2.15 for implantada de novo. O que se escreveu por cima
  do aviso nessa janela se perde (era edição do aviso, não da ficha), o nome da
  listagem fica o do aviso até a próxima gravação, e `diagnosticarPersonagem` aponta
  a revisão do manifesto diferente da coluna.

Isso foi conferido rodando o backend **real** da v2.14 sobre a mesma planilha
simulada: gravar pela v2.14 e reimplantar a v2.15 devolve a ficha idêntica. E só é
verdade porque o mapa de colunas guardado no cache leva a assinatura do esquema
(ver "Por que os cabeçalhos ficam em cache" em `Dados.gs`): sem ela, a v2.14 usaria
o mapa da v2.15 — onze colunas — e gravaria vazio no manifesto.

Por isso: **não volte a implantação sem necessidade**. Se precisar, volte e
reimplante a v2.15 o quanto antes. Para desfazer a v2.15 de verdade seria preciso
converter as fichas em blocos de volta para `fichaJson` — o que só cabe para as
fichas abaixo de 45 000 caracteres, justamente as que não precisavam de blocos.

### Permissões

Nenhuma ação lê ou recebe blocos, gerações ou manifestos. Tudo passa pela mesma
conferência de acesso do personagem (`personagemAcessivel`): conhecer o id de um
personagem ou de uma geração não abre nada. As ferramentas de diagnóstico,
restauração e limpeza só rodam no editor do Apps Script.

## HOMEBREW

| Coluna         | Conteúdo                                   |
|----------------|--------------------------------------------|
| `id`           | UUID                                       |
| `ownerId`      | da sessão                                  |
| `tipo`         | `item` / `arma` / `armadura` / `mochila` / `criatura` / `habilidade` |
| `visibilidade` | `privado` (padrão) / `publico` — vazio é privado |
| `nome`         | espelho, para busca e ordenação            |
| `criadoEm`     | ISO 8601                                   |
| `atualizadoEm` | ISO 8601                                   |
| `rev`          | inteiro                                    |
| `dadosJson`    | o item completo                            |

A relação com o inventário de uma ficha é de **modelo e cópia**, nunca de
vínculo vivo: o item na ficha guarda `origemHomebrewId` só como rastro. Editar o
modelo aqui não muda, semanas depois, a espada de um personagem em jogo.

## CAMPANHAS

| Coluna         | Conteúdo                       |
|----------------|--------------------------------|
| `id`           | UUID                           |
| `ownerId`      | da sessão                      |
| `nome`         | espelho                        |
| `criadoEm`     | ISO 8601                       |
| `atualizadoEm` | ISO 8601                       |
| `visibilidade` | `privado` (padrão) / `publico` |
| `rev`          | inteiro                        |
| `dadosJson`    | `{ descricao, rolagensMestreOcultas, ocultarStatusJogadores }` |

O que cresce, tem permissão própria ou carrega imagem NÃO fica aqui: mora em
tabela própria. Ver `CAMPANHA_MEMBROS` e as demais, abaixo.

**O vínculo personagem↔campanha mora no personagem** (`campanhaId`), e só nele.
Guardar dos dois lados exigiria manter dois lugares em sincronia, e a primeira
gravação que falhasse deixaria um personagem numa campanha que não sabe dele.

## As tabelas da campanha

Sete, e nenhuma delas cabia no `dadosJson`: rolagens crescem sem fim, documentos
e a capa carregam imagem, notas e combates têm permissão própria e são editados de
forma independente. Enfiados num só JSON, abrir a campanha baixaria tudo e uma nota
nova reescreveria o histórico inteiro.

### CAMPANHA_MEMBROS

`id · campanhaId · userId · papel · criadoEm`

O vínculo entre conta e campanha, **por ID permanente**. Nunca por nome ou
username: renomear uma conta não pode dar nem tirar acesso de ninguém.

O criador não tem linha aqui — ele é mestre por ser dono da campanha. Uma
campanha recém-criada não teria nenhuma linha, e o dono ficaria trancado para
fora da própria mesa.

### CAMPANHA_ROLAGENS

`id · campanhaId · autorUserId · personagemId · tipo · nome · visibilidade · criadoEm · dadosJson`

O `id` vem do CLIENTE e é a chave de idempotência: uma retentativa de rede
encontra a linha que já existe e não cria a segunda. `visibilidade` é decidida
no servidor, nunca aceita do pedido.

### CAMPANHA_DOCUMENTOS + CAMPANHA_DOCUMENTOS_IMAGENS

`id · campanhaId · nome · descricao · visiveisJson · criadoEm · atualizadoEm · rev`
`documentoId · campanhaId · imagem · atualizadoEm`

`visiveisJson` é um array de ids de usuário. **Array vazio significa ninguém
além do mestre** — nunca "todos". A imagem fica em tabela separada porque é o
campo mais pesado e o que menos muda. Trocar a imagem atualiza também o
`atualizadoEm` do documento (não o `rev`): é por ele que a aba Documentos sabe que
precisa baixar a imagem de novo.

### CAMPANHA_NOTAS

`id · campanhaId · personagemId · pasta · titulo · criadoEm · atualizadoEm · conteudo`

Privadas do mestre. Nenhuma resposta destinada a jogador toca nesta aba.

### CAMPANHA_COMBATES

`id · campanhaId · nome · estado · visiveisJson · criadoEm · atualizadoEm · rev · dadosJson`

`dadosJson` guarda `{ participantes, turno, ops }`:

- `participantes` — cada criatura entra como **snapshot** com id próprio, então duas
  ocorrências do mesmo modelo têm estados independentes;
- `turno` — `{ rodada, ativoId }`, o turno pelo **id** do participante (v2.12).
  Ausente num combate antigo: em andamento vale rodada 1 e o primeiro da ordem;
- `ops` — os `{ id, rev }` dos últimos 40 lotes aplicados por `atualizar_combate`,
  para reconhecer um lote repetido (v2.12).

`salvar_combate` (a gravação completa) preserva `turno` e `ops` que já estavam lá.

### CAMPANHA_CAPAS

`campanhaId · atualizadoEm · largura · altura · imagem`

A capa da campanha (v2.12), uma linha por campanha. Fora do `dadosJson` pela mesma
razão da foto de personagem: dentro do JSON, salvar a descrição reenviaria a imagem
inteira. As quatro primeiras colunas são leves — dá para saber se há capa, de que
tamanho e de quando sem ler a imagem. `imagem` é uma data URL WebP, JPEG ou PNG que
cabe na célula; acima disso a gravação é recusada, nunca truncada. Excluir a
campanha apaga a linha.

### CRIATURAS_IMAGENS

`criaturaId · ownerId · imagem · atualizadoEm`

Mesma razão da foto de personagem: imagem fora do JSON que é reenviado a cada
edição.

---

## O cabeçalho manda, não a posição

As posições das colunas saem do **cabeçalho real da aba**, não da ordem em
que o código as declara. Isso não é preciosismo: o `setupRama()` acrescenta
coluna nova no **fim** da aba, porque é a única forma de não mover dado de
lugar — mas o código pode declarar essa mesma coluna no meio da lista.

Foi o que aconteceu com `visibilidade`, acrescentada na v2 ao HOMEBREW e às
CAMPANHAS. Numa planilha criada já na v2, a ordem física e a declarada
coincidem. Numa planilha que veio da v1, não coincidem — e ler por posição
devolveria uma coluna pelo valor de outra.

### Duas gramáticas na mesma aba

Numa planilha atualizada da v1 para a v2, a aba pode ter linhas de duas
formas:

| origem da linha | como ela está |
|---|---|
| gravada pela v1 | segue o cabeçalho, com a coluna nova vazia no fim |
| gravada pela v2 | segue a ordem declarada, com a coluna nova no meio |

Nenhuma leitura única serve para as duas. Desde a v2.1.0, cada linha diz de
qual forma ela é, e o sinal é o JSON: numa aba dessas há sempre uma coluna que
guarda um objeto serializado, e um objeto serializado começa com chave. A
célula que estiver com o JSON revela qual leitura vale para aquela linha.

**Nada é movido.** A escolha é de leitura. A primeira gravação numa linha da
v2 reescreve todas as colunas pelo cabeçalho, e ela passa a ser uma linha
normal — o conserto é progressivo e nunca precisa de uma passagem que
reorganize a planilha inteira.

### Quando o nome não está lá

Ler pelo nome resolve a aba desalinhada e cria um problema novo: se o
cabeçalho não tiver o nome exato, a coluna passaria a ser lida como **vazia**.
Numa aba `USUARIOS` sem `hashSenha` no cabeçalho, toda senha do mundo estaria
errada, e a tela diria "usuário ou senha incorretos" para sempre, sem nenhuma
pista de que o problema é a planilha. Foi um defeito real da v2.1.0, corrigido
na v2.3.1.

A regra completa, desde a v2.3.1:

| situação | o que acontece |
|---|---|
| o nome está no cabeçalho | manda o nome, em qualquer posição |
| o nome sumiu, e a posição declarada está livre | lê pela posição declarada |
| o nome sumiu, e a posição declarada é de outra coluna declarada | a coluna fica ilegível |

A rede nunca lê a coluna do vizinho: ler o valor errado é pior do que ler
vazio. `conferirInstalacao()` lista as duas últimas situações aba por aba — as
recuperadas como aviso, as ilegíveis como problema.

Uma coluna ilegível em `USUARIOS` faz o `login` recusar com
`instalacao_incompleta` em vez de `credenciais`. O aviso sai antes de procurar
a conta, então ele não revela se aquele usuário existe.

### Se você mexer nas colunas à mão

Rode `setupRama()` depois. Ele avança a época, que joga fora os cabeçalhos
guardados em cache. Sem isso, o sistema continua trabalhando com o desenho
anterior por até seis horas.

---

## Coluna leve e coluna pesada

Toda aba tem colunas curtas — id, dono, nome, datas — e normalmente uma que
carrega o peso: o `fichaJson`, a imagem em base64, o `dadosJson`. O campo
`leves` de cada definição diz quantas colunas do começo são as curtas.

Com isso dá para varrer uma aba inteira sem tocar no peso: descobrir **quais**
registros interessam custa pouco, e só então o conteúdo dos escolhidos é
buscado.

Registros lidos assim vêm marcados e **não podem ser gravados de volta** —
escrever um registro sem as colunas pesadas apagaria o conteúdo de alguém. A
camada recusa, e há teste para isso.

Detalhes em [PERFORMANCE.md](PERFORMANCE.md).

---

## Datas

No banco, sempre ISO 8601 em UTC (`2026-09-03T16:30:00.000Z`), exceto os
carimbos de sessão, que são epoch em milissegundos porque só servem para
comparar. A interface converte para o horário local de quem está olhando e
mostra `03/09/2026 13:30`.

Nunca grave data já formatada como valor principal: `03/09/26` não diz o
século, nem o fuso, e não ordena.

## Concorrência

Dois mecanismos, para dois problemas:

| | O que resolve |
|---|---|
| **LockService** | duas execuções do script escrevendo ao mesmo tempo e embaralhando linhas |
| **`rev`** | alguém salvando por cima de uma versão que já mudou |
| **id da operação** | a mesma gravação chegando duas vezes porque a resposta se perdeu — o `id` da rolagem em `CAMPANHA_ROLAGENS`, o `opId` do lote em `CAMPANHA_COMBATES`, o `operacaoId` da ficha no manifesto (v2.15) |
| **`SpreadsheetApp.flush()`** | a trava solta com escritas ainda no buffer do Apps Script, e a próxima execução lendo a planilha sem elas (v2.15) |

Nenhum substitui os outros. Sem trava, duas gravações simultâneas podem corromper
a linha; sem `rev`, a segunda apaga em silêncio o trabalho da primeira mesmo
tendo esperado a vez; sem o id da operação, repetir um envio pela rede rolaria de
novo ou passaria dois turnos.

## Limites

Três números diferentes, centralizados em `backend/Dados.gs`:

| limite | quanto | o que protege |
|---|---|---|
| `MAX_CELULA` | 45 000 caracteres | **uma célula.** O Google aceita 50 000; 45 000 deixa margem. Vale para cada bloco de ficha e para todo campo que ainda mora numa célula só. Acima dele o servidor recusa com `dados_grandes` — recusar é melhor do que truncar, que perderia dados sem avisar. |
| `LIMITE_TOTAL_FICHA` | 1 000 000 caracteres | **uma ficha inteira.** Não é teto do Google (são 23 blocos). É o ponto a partir do qual cada salvamento automático — que envia e regrava a ficha inteira — segura a trava de todo o sistema por segundos, e numa mesa de vinte pessoas a gravação de uma vira espera para as outras. Acima dele: `ficha_grande_demais`, com o tamanho e o limite; nada é gravado, e o site mantém tudo na tela, oferece exportar e não fica tentando de novo sozinho. Quem precisar de mais muda o número — o site não guarda cópia dele. |
| requisição e execução | 6 min por execução no Apps Script | uma ficha dentro do limite acima fica muito longe dos dois. |

Uma ficha deixou de ter o limite de uma célula (v2.15). Os campos de dentro da
ficha continuam com os limites próprios do modelo, em `js/ficha.js` — uma anotação
tem até 20 000 caracteres, a descrição de um ritual até 8 000, a de um item até
2 000; a ficha cresce com mais anotações, rituais e habilidades, não com um campo
só. Esses limites não são do armazenamento.

### Os outros campos grandes

Conferidos na v2.15. Todos recusam acima de `MAX_CELULA` em vez de cortar; nenhum
foi migrado — a camada de blocos (`gravarGeracao` / `lerGeracoes` em `Dados.gs`)
recebe a aba de blocos como parâmetro e pode ser usada por outro deles quando
precisar, com uma aba `_BLOCOS` própria.

| campo | o que guarda | risco de passar do limite |
|---|---|---|
| `CAMPANHA_COMBATES.dadosJson` | participantes (até 200, criaturas com o snapshot inteiro), turno e os últimos 40 `opId` | **médio** — um combate com muitas criaturas de ficha longa. É o próximo candidato aos blocos |
| `CAMPANHA_NOTAS.conteudo` | uma nota do mestre | médio — nota muito longa; dá para dividir em duas |
| `HOMEBREW.dadosJson` | um item, criatura, habilidade ou ritual | baixo — só uma criatura com textos enormes |
| imagens (`PERFIS.avatar`, `PERSONAGENS_FOTOS`, `CRIATURAS_IMAGENS`, `CAMPANHA_DOCUMENTOS_IMAGENS`, `CAMPANHA_CAPAS`) | data URL comprimida no navegador | baixo — o navegador reduz antes de enviar |
| `CAMPANHAS.dadosJson`, `CAMPANHA_ROLAGENS.dadosJson`, `visiveisJson`, `preferenciasJson` | configuração, uma rolagem, listas de ids | nenhum na prática |
