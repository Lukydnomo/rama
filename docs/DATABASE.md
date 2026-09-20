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
| `resumo`       | a **projeção** do painel da mesa (v2.16); vazio quer dizer "não tenho" |

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

`armazenamento` e `resumo` ficam depois de `fichaJson` de propósito: numa planilha
atualizada o `setupRama()` as acrescenta no fim, e declaradas no mesmo lugar as duas
ordens coincidem. Nenhuma das duas está entre as colunas leves — a listagem de
personagens não lê nem uma nem outra.

### `resumo`: a projeção do painel (v2.16)

O painel da mesa desenha cartões: nome, foto, recursos, e — numa ficha de Ordem —
os dados de entrada do cálculo de PV, PE e Sanidade. Até a v2.15 ele remontava a
ficha INTEIRA de cada personagem para isso e jogava fora quase tudo o que leu. Numa
mesa de oito fichas com anotações de verdade, meio megabyte atravessava o serviço
do Sheets para desenhar oito caixinhas.

A projeção é esse recorte, gravado:

```jsonc
{
  "v": 1,                       // versão do formato da projeção
  "tipo": "ordem",              // ou "universal"
  "ordem": { … },               // o bloco de Ordem do painel, sem textos longos
  "itens": [ … ],               // id, tipo, nome, defesa e bloco de Ordem de cada item
  "resumoRecursos": { … },      // { pv, pe, san } validado
  "atributos": [ … ],           // ficha universal
  "status": [ … ],              // ficha universal
  "geracao": "g-…",             // a geração da ficha de onde ela saiu
  "rev": 12                     // a revisão da linha quando ela foi escrita
}
```

**Ela não calcula nada.** O máximo de PV/PE/Sanidade de uma ficha de Ordem sai do
motor de regras, que mora no navegador (`js/ordem/regras.js`). A projeção guarda as
mesmas ENTRADAS que a v2.15 mandava para o painel, montadas pelas MESMAS funções
(`ordemParaPainel`, `itensParaPainel`, `resumoRecursos`). Não existe uma segunda
fórmula no servidor: existe o mesmo recorte, gravado em vez de recalculado.

**Quando ela vale.** Enquanto a `rev` dela for a da linha — e a `rev` está entre as
colunas leves, então conferir isso não custa leitura nenhuma. Quando não bate, a
`geracao` decide: há gravações que sobem a revisão sem tocar no conteúdo (entrar e
sair de uma mesa), e nessas a projeção continua valendo. Não valendo — ficha ainda
no formato antigo, coluna vazia, projeção de outra versão do formato, gravação feita
por um backend que não conhece a coluna —, o painel remonta AQUELA ficha e monta o
cartão como sempre fez.

**Ela entra na mesma gravação de uma linha que publica o manifesto.** Conteúdo,
manifesto e projeção nunca ficam de versões diferentes, porque são a mesma escrita —
e essa escrita só acontece depois de a geração nova ter sido conferida.

**Listar nunca grava para consertar projeção.** Uma tela de leitura que grava é uma
tela de leitura que disputa a trava. A próxima gravação da ficha resolve sozinha, e
`reconstruirResumos()` resolve em lote (ver "Recuperação").

A projeção é derivada e recuperável: perder a coluna inteira custa desempenho,
nunca dado. A ficha continua sendo a fonte.

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
  "local": { "linha": 214, "blocos": 4 },   // onde ela foi escrita (v2.16) — pista, não prova
  "anterior": { "geracao": "g-…", "blocos": 3, "tamanho": 131002, "hash": "sha256:…",
                "rev": 8, "gravadoEm": "…", "local": { … } },      // o ponto de volta
  "reutilizavel": { "geracao": "g-…", "local": { … } }             // a faixa livre (v2.16)
}
```

`rev` continua sendo a revisão **lógica** da ficha — a que o navegador manda e o
conflito confere. A geração é só a identidade física do conteúdo: ela muda sem a
revisão mudar (o resumo de recursos, que é derivado) e a revisão muda sem a geração
mudar (o vínculo de campanha, que é coluna).

### O localizador, e por que a gravação não apaga mais linhas (v2.16)

Até a v2.15, achar os blocos de uma ficha custava uma varredura das seis colunas
curtas da aba INTEIRA — todas as fichas, todas as gerações — para ficar com duas
linhas. Numa planilha com centenas de personagens isso era o custo dominante de
abrir uma ficha.

Agora o manifesto guarda `local: { linha, blocos }`, e a leitura vai direto nessas
linhas, numa chamada. **É pista, não prova:** ela confere tudo o que já conferia —
personagem, geração, posição, marcadores, tamanho e SHA-256 do texto inteiro — e,
se a pista falhar, acha os blocos pelo índice de duas colunas (personagem +
geração). Nenhum checksum, nenhuma conferência de completude e nenhuma retentativa
foram removidos para isto caber.

Um número de linha só envelhece quando alguém APAGA uma linha acima dele. Então a
gravação parou de apagar: ela deixa a faixa descartada **em branco** e, quando o
tamanho permite, escreve a geração nova exatamente nela. Três faixas ficam vivas
por ficha, e cada uma tem um papel:

| faixa | quem aponta para ela | pode ser escrita? |
|---|---|---|
| a que vale | o manifesto | não |
| a anterior | `manifesto.anterior` — ponto de volta e leitura em andamento | não |
| a reutilizável | `manifesto.reutilizavel` — ninguém | **sim**: é onde a próxima gravação escreve |

Escrever sobre a reutilizável, e não sobre a anterior, é o que faz uma gravação que
morre no meio não destruir o ponto de volta: o estrago cai sempre numa faixa que já
não servia para nada. E é o que impede a aba de crescer — um personagem salvo cem
vezes roda entre as mesmas três faixas, sem apagar linha nenhuma e sem deslocar o
localizador de ninguém.

Apagar de verdade ficou para a manutenção do editor (`limparBlocosOrfaos()`), que
roda raramente. Depois dela, a primeira leitura de cada ficha cai no índice — que é
o caminho correto, só mais lento — e a gravação seguinte grava a pista nova.

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
| 2 | decide ONDE escrever: confere a faixa reutilizável (uma chamada, colunas curtas). Sem pista boa, decide pelo índice o que é lixo deste personagem | nada foi escrito |
| 3 | escreve a geração nova — na faixa reutilizável, ou no fim da aba se não couber | a faixa reutilizável fica com lixo; a que vale e a anterior continuam inteiras |
| 4 | lê essas linhas de volta e confere o texto inteiro, caractere por caractere | idem, e a resposta é `armazenamento_falhou` |
| 5 | grava a linha do personagem: manifesto novo (com o localizador), projeção, aviso, revisão, nome, classe, origem, campanha — **uma** gravação de uma linha | idem: é esta gravação que troca de versão, e ela entra inteira ou não entra |
| 6 | deixa EM BRANCO o que sobrou da faixa reaproveitada (ou o lixo que o índice apontou) | sobra espaço ocupado, que a próxima gravação ou `limparBlocosOrfaos()` recolhe |
| 7 | `SpreadsheetApp.flush()` antes de soltar a trava e de responder | a resposta é erro — nunca "salvo" |

O Sheets não tem transação: várias escritas não viram uma. A segurança vem da ordem
(nada que alguém aponte é tocado antes de a versão nova estar provada) e da troca de
uma linha só no passo 5.

Uma gravação que morre entre 3 e 5 leva junto a faixa reutilizável — e só ela. A que
vale e o ponto de volta ficam. A gravação seguinte percebe que a pista não confere e
recomeça pelo índice.

### Ler

A leitura vai direto às linhas que o localizador aponta (v2.16) — uma chamada — e,
sem ele ou com ele errado, acha as linhas pelo índice de duas colunas curtas
(personagem + geração), que nunca traz o conteúdo de outras fichas. Em qualquer dos
dois caminhos ela confere tudo **antes** de interpretar o JSON:

- cada linha é mesmo deste personagem e desta geração;
- cada posição de 0 a `blocos − 1` aparece uma vez (uma cópia idêntica é tolerada;
  duas diferentes, não);
- marcadores e tamanho de cada bloco batem;
- o texto remontado tem o tamanho e o SHA-256 do manifesto.

A leitura corre fora da trava. Se uma gravação trocar a geração no meio, a leitura
percebe (linha fora do lugar, bloco ausente), lê a linha do personagem de novo e
tenta com o manifesto novo, até três vezes. Uma falha que continua com o mesmo
manifesto é defeito de verdade. Desde a v2.16 a gravação não desloca mais linha
nenhuma, então esse caminho ficou raro: ele cobre a manutenção
(`limparBlocosOrfaos()`), que é a única coisa que apaga linhas.

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

Cada gravação deixa em branco o que sobrou da própria ficha (passo 6), sem apagar
linha nenhuma. Excluir um personagem esvazia todas as gerações dele, e só dele.

`limparBlocosOrfaos()`, rodada à mão no editor, é a faxina: ela APAGA as linhas que
nenhuma ficha aponta (uma exclusão cuja limpeza falhou, uma criação que parou antes
da linha) e as linhas em branco que as gravações deixaram para trás. Nunca toca na
geração ativa, na anterior nem na reutilizável de ninguém, nem nos blocos de uma
ficha cujo manifesto esta versão não entende, e espera dez minutos antes de apagar
blocos de um personagem que não existe. Como ela apaga, ela DESLOCA: depois dela os
localizadores apontam para o lugar errado, a leitura cai no índice (e devolve a
ficha inteira do mesmo jeito) e a gravação seguinte grava a pista nova.

`conferirInstalacao()` avisa quando há blocos sem dono e quando há muita linha em
branco.

### Recuperação

Rodadas à mão no editor do Apps Script (nenhuma está no roteamento):

- `diagnosticarPersonagem(id)` — formato, manifesto, revisão do manifesto contra a da
  linha, e a conferência da geração ativa e da anterior (CONFERE / NÃO CONFERE, com o
  motivo). Não imprime o conteúdo da ficha.
- `restaurarGeracaoAnterior(id)` — confere a geração anterior inteira e a faz voltar
  a valer; a revisão sobe, a geração que valia vira a "anterior" sem ser apagada, e a
  projeção do painel é refeita a partir do conteúdo restaurado. Com a geração ativa
  conferindo, recusa — a menos que se passe `true` como segundo argumento, para
  desfazer a última gravação de propósito.
- `reconstruirResumos([quantos])` — refaz a projeção do painel das fichas que
  estiverem sem ela, em lotes de 25 por chamada, com ponto de retomada: chamar de
  novo continua de onde parou, e o relatório diz quantas faltam. Escreve SÓ a coluna
  `resumo` — nem manifesto, nem blocos, nem revisão. Nada disto é obrigatório: uma
  ficha sem projeção só faz o painel remontá-la, e a primeira gravação dela já
  resolve.
- `ligarDiagnostico()` / `desligarDiagnostico()` — a medição por requisição (ver
  [PERFORMANCE.md](PERFORMANCE.md)).

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

**A aba que mais cresce, e a página que não cresce com ela (v2.16).** Até a v2.15
cada página do histórico varria as oito colunas curtas da aba INTEIRA — 1 500
rolagens para mostrar 25 —, ordenava tudo e fatiava. O custo era o do histórico,
não o da página.

Agora são duas coisas: um índice, que é UMA chamada lendo UMA coluna
(`campanhaId`) e devolve os números de linha desta campanha em ordem cronológica —
porque rolagem só entra no fim da aba, nunca no meio —, e a página, que lê do fim
do índice para trás só as linhas que ela vai mostrar, mais uma margem para o que a
filtragem descartar.

A página seguinte é pedida por **cursor**, não por posição: o servidor devolve
`proximo`, e mandá-lo de volta continua de onde parou. O cursor carrega a data, a
linha e o id da última rolagem entregue, e quem localiza é o **id** — assim uma
rolagem nova no topo não empurra a paginação, e limpar o histórico de outra
campanha (que desloca as linhas desta) não repete nem pula nada. A primeira página
lê uma coluna; as seguintes leem duas vizinhas (`id` e `campanhaId`), que é o preço
de achar o cursor sem varrer.

Se o id não estiver mais lá — o histórico foi limpo entre uma página e outra —,
sobra a pista da linha, com a data conferindo. No pior caso uma rolagem já mostrada
aparece de novo e a tela a reconhece pelo id; rolagem mais antiga não some.

O **total exato** deixou de ser calculado: contar o que uma pessoa pode ver exige
aplicar a filtragem de ocultas em todas as linhas, que é a varredura que esta
mudança existe para não fazer. A tela mostra "Carregar mais" em vez de "N
restantes".

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
carrega o peso: a imagem em base64, o conteúdo de um bloco, o `dadosJson`. O campo
`leves` de cada definição diz quantas colunas do começo são as curtas, e `pesadas`
diz quais são as caras de verdade (v2.16).

A diferença entre as duas listas importa numa decisão só, mas é a que mais pesou:
para ler uma coluna de um punhado de linhas espalhadas, vale mais uma faixa que
arrasta as linhas do meio ou uma chamada por linha? A conta usa o preço de uma
célula desperdiçada — e uma célula com 15 KB de imagem não vale o mesmo que uma
com uma data. Sem essa distinção, a tela "Meus personagens" arrastava as sessenta
fotos da planilha para mostrar as quatro do dono.

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
| **linha que não se mexe** | um número de linha guardado (o localizador de blocos, o índice do histórico) apontando para outra coisa depois que alguém apagou uma linha acima. A gravação de ficha deixa em branco em vez de apagar (v2.16); quem apaga é a manutenção, e toda pista é conferida antes de ser usada |

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

A **projeção** do painel (`resumo`, v2.16) mora numa célula e tem teto próprio:
40 000 caracteres. Uma projeção real fica muito abaixo disso — ela já deixa os
textos longos de fora —, mas se passar, a coluna guarda só um marcador e o painel
remonta aquela ficha. Nada é cortado, e a ficha não é afetada.

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
