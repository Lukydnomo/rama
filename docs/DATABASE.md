# O banco

Uma planilha do Google, treze abas. Criadas e mantidas por `setupRama()` — não
monte nada à mão.

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
| `fichaJson`    | a ficha inteira — ver CHARACTER_SCHEMA.md     |

As colunas de espelho existem para a listagem não precisar abrir e interpretar
o JSON de trinta fichas só para escrever trinta nomes. Elas são reescritas a
partir do JSON em toda gravação, então não têm como divergir.

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
| `dadosJson`    | `{ descricao, rolagensMestreOcultas }` |

O que cresce, tem permissão própria ou carrega imagem NÃO fica aqui: mora em
tabela própria. Ver `CAMPANHA_MEMBROS` e as demais, abaixo.

**O vínculo personagem↔campanha mora no personagem** (`campanhaId`), e só nele.
Guardar dos dois lados exigiria manter dois lugares em sincronia, e a primeira
gravação que falhasse deixaria um personagem numa campanha que não sabe dele.

## As tabelas da campanha

Seis, e nenhuma delas cabia no `dadosJson`: rolagens crescem sem fim, documentos
carregam imagem, notas e combates têm permissão própria e são editados de forma
independente. Enfiados num só JSON, abrir a campanha baixaria tudo e uma nota
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
campo mais pesado e o que menos muda.

### CAMPANHA_NOTAS

`id · campanhaId · personagemId · pasta · titulo · criadoEm · atualizadoEm · conteudo`

Privadas do mestre. Nenhuma resposta destinada a jogador toca nesta aba.

### CAMPANHA_COMBATES

`id · campanhaId · nome · estado · visiveisJson · criadoEm · atualizadoEm · rev · dadosJson`

`dadosJson` guarda `{ participantes }`. Cada criatura entra como **snapshot**
com id próprio, então duas ocorrências do mesmo modelo têm estados
independentes.

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

Um não substitui o outro. Sem trava, duas gravações simultâneas podem corromper
a linha; sem `rev`, a segunda apaga em silêncio o trabalho da primeira mesmo
tendo esperado a vez.

## Limites

Uma célula do Sheets aceita 50 000 caracteres. O servidor recusa acima de
**45 000** com `dados_grandes`, deixando margem — e recusar é melhor do que
truncar, que perderia dados sem avisar.
