# O banco

Uma planilha do Google, sete abas. Criadas e mantidas por `setupRama()` — não
monte nada à mão.

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
| `tipo`         | `item` / `arma` / `armadura` / `mochila`   |
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
| `rev`          | inteiro                        |
| `dadosJson`    | hoje só `{ descricao }`        |

O `dadosJson` está quase vazio de propósito: quando a mesa souber o que uma
campanha precisa ter, cresce ali dentro, sem mexer na planilha.

**O vínculo personagem↔campanha mora no personagem** (`campanhaId`), e só nele.
Guardar dos dois lados exigiria manter dois lugares em sincronia, e a primeira
gravação que falhasse deixaria um personagem numa campanha que não sabe dele.

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
