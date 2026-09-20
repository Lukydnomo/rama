# Permissões

Quem alcança o quê, e onde isso é decidido.

## A regra que vale para tudo

**A identidade vem da SESSÃO. As relações vêm do BANCO.**

Nada que o navegador afirme sobre si mesmo entra numa decisão de autorização.
Não existe `ehMestre` vindo do corpo da requisição, nem `role` que o cliente
escolhe, nem `ownerId` aceito de quem enviou. O servidor deriva o usuário do
token e consulta as relações na planilha.

Esconder um botão é conveniência visual. Recusar é no Apps Script.

---

## Os papéis

| Papel | Como se torna | O que alcança |
|---|---|---|
| **dono** | criou o personagem | tudo da própria ficha |
| **mestre** | criou a campanha, ou foi promovido a mestre nela | lê e edita as fichas **vinculadas àquela campanha**, vê todas as rolagens, administra documentos, notas e combates |
| **jogador** | foi convidado para a campanha | entra na campanha, vê o que foi liberado, edita a própria ficha e os recursos dos próprios personagens na mesa; vê os recursos dos outros, se o mestre não os esconder |
| **espectador** | a campanha é pública e ele não é membro | vê que a campanha existe, e o que for efetivamente público |
| **de fora** | nada disso | a campanha privada não existe para ele |

Ser mestre da Campanha A não dá nada na Campanha B. O papel é sempre por
campanha.

---

## O que ser mestre NÃO dá

Três coisas, e são deliberadas:

1. **Virar dono de ficha alguma.** O `ownerId` nunca muda, nem quando enviado
   de propósito numa gravação.
2. **Apagar o personagem de outra pessoa.** Excluir e duplicar exigem ser dono.
3. **Abrir o catálogo Homebrew privado do jogador.**

> **Catálogo e conteúdo já anexado à ficha são coisas diferentes.**
> O mestre lê a cópia da habilidade que está DENTRO da ficha — ela faz parte
> daquele personagem. A biblioteca privada de onde ela saiu continua fechada.

---

## Acesso a personagem

Duas portas, e só duas:

```
1. é seu                                    → acesso total
2. é de um jogador, está vinculado a uma
   campanha, e quem pede é mestre DAQUELA
   campanha                                 → ler e editar a ficha
```

A segunda porta confere o vínculo **no banco**. Não basta o pedido trazer um
`campanhaId`: a função lê o `campanhaId` do próprio personagem e confere o papel
de quem pediu naquela campanha.

Um personagem que não está em campanha nenhuma só é alcançado pelo dono.

**Um personagem só entra numa campanha se o dono dele for membro dela.** Sem
isso, um mestre que descobrisse um id qualquer poderia arrastar a ficha de
qualquer conta para dentro da mesa e ganhar permissão de edição sobre ela.

---

## Visibilidade

### Campanha

| | Quem encontra | O que isso abre |
|---|---|---|
| **privada** | mestre e convidados | nada para quem está de fora |
| **pública** | qualquer agente autenticado | a existência e a descrição. **Nada mais.** |

Ser pública **não** torna o conteúdo público. Personagens, rolagens,
documentos, notas e combates continuam restritos a quem o mestre escolher. O
espectador não recebe nem a lista de membros.

### Capa da campanha

Segue a campanha: quem a alcança vê a capa — membros sempre, espectador só em
campanha pública. `ler_capa_campanha` passa por `contextoDaCampanha` de novo, então
quem está de fora de uma campanha privada não baixa a imagem nem pedindo pelo id.
Gravar, trocar e remover são só do mestre (`exigirMestre`).

### Personagens da mesa

Os cartões da aba Personagens (`listar_personagens_campanha`):

| quem pede | recebe |
|---|---|
| mestre | todos os personagens da mesa, com os dados de cálculo |
| dono | os próprios personagens (todos eles) com os dados de cálculo |
| outro jogador | identificação e os recursos atuais e máximos, **só leitura** — ou só a identificação, com **Esconder status dos jogadores** ligada |
| espectador | lista vazia |

**Ver o resumo não é abrir a ficha.** Nenhuma resposta ao outro jogador traz
escolhas, inventário, anotações ou o bloco de cálculo. `podeEditarRecursos` e
`podeAbrirFicha` são só rótulos: `ajustar_personagem` e `ler_personagem` continuam
com as duas portas de sempre, então trocar o id na URL da ficha ou chamar a API
direto responde `nao_encontrado`.

**Esconder status dos jogadores** é do mestre: `salvar_campanha` começa por
`exigirMestre`, e um jogador que mande `ocultarStatusJogadores` recebe
`sem_permissao`. Ligada, os recursos dos personagens dos outros **não entram na
resposta** — nem nos cartões, nem na lista do combate. Não há número, barra,
percentual, dica ou atributo HTML para esconder, porque eles não chegam. O mestre
continua vendo tudo; o jogador, os próprios. O que alguém já recebeu antes de a
chave ser ligada não tem como ser apagado.

O **resumo** que o outro jogador vê numa ficha de Ordem (o máximo de PV, PE e
Sanidade) é gravado por quem pode editar a ficha inteira — dono ou mestre — dentro
dela. O dono conseguiria mostrar um máximo inventado, e conseguiria do mesmo jeito
editando a própria ficha; o servidor valida a forma.

### Homebrew

| | Quem lista e usa | Quem edita e apaga |
|---|---|---|
| **privado** | só o dono | só o dono |
| **público** | qualquer agente, como modelo | **só o dono** |

Registro gravado antes da v2 tem a célula de visibilidade vazia, e vazio é lido
como **privado**. Nenhuma biblioteca que já existia virou pública sozinha.

Tentar editar um registro público de outra conta não atualiza o original: cria
um registro novo sob quem pediu.

As **bibliotecas da ficha** (`listar_homebrew` com `tipos`) não mudam nada disso:
a do inventário pede os tipos de item e a da aba Rituais pede `ritual`, e o
servidor devolve só o que esta conta alcança — os próprios, privados ou não, e os
públicos de outras contas. Conteúdo privado de outra conta **não é carregado** para
depois ser escondido na tela, e o que é de outro tipo não chega: habilidade e
criatura não viram item, e item não vira ritual.

### Documentos

Cada documento carrega a lista de quem pode vê-lo.

**Lista vazia significa NINGUÉM além do mestre** — nunca "todos". Um jogador sem
permissão não recebe título, descrição, imagem nem a existência do documento: a
linha não entra na resposta.

A imagem é pedida à parte e a permissão é conferida **de novo** ali, porque quem
descobrisse o id de um documento restrito tentaria baixá-la por fora da listagem.

### Rolagens

A visibilidade **não vem do cliente**. O servidor decide:

- rolagem de jogador é sempre pública dentro da mesa;
- rolagem do mestre segue a configuração atual da campanha.

Assim um navegador adulterado não consegue nem esconder o próprio resultado nem
revelar o que o mestre escondeu. Rolagem oculta **não chega ao navegador do
jogador** — não é `display: none`.

### Combates

Quatro decisões, e nenhuma decide pela outra:

| decisão | quem | onde é conferida |
|---|---|---|
| ver o combate | quem o mestre escolheu em **Quem pode ver** | `podeVerCombate` |
| ver os recursos dos personagens na lista | a regra dos cartões (e a chave de ocultação) | `recursosParaCombate` |
| abrir a ficha de um personagem | dono ou mestre da campanha, sempre | `personagemAcessivel` |
| administrar (turno, iniciativa, vida de criatura, participantes, quem vê) | só o mestre | `exigirMestre` em `atualizar_combate`, `salvar_combate` e `excluir_combate` |

Quem tem acesso recebe a lista, a ordem de iniciativa, a rodada e de quem é a vez —
e **não** a ficha interna das criaturas, o id do modelo na biblioteca nem a lista de
quem pode ver.

O painel lateral com a ficha do participante é do mestre. Personagem abre pela
ficha de sempre (`ler_personagem`, as mesmas duas portas); criatura mostra o
snapshot que só o mestre recebe. O jogador não tem essa interface, e o servidor não
lhe manda nada que a alimentasse.

### Notas do mestre

Privadas, sem exceção. Toda ação de nota começa exigindo mestre, e não existe
variação "para jogador" dessas funções — a forma mais segura de nunca vazar uma
nota é não haver caminho de código que a devolva a quem não é mestre.

---

## Onde isso está no código

Tudo em `backend/Codigo.gs` e `backend/Campanhas.gs`. O `backend/Dados.gs`
não decide permissão nenhuma — ele não sabe quem está pedindo:

| Função | Responde |
|---|---|
| `papelNaCampanha(campanha, usuario)` | qual o papel real, do banco |
| `contextoDaCampanha(id, usuario)` | o papel, ou `nao_encontrado` |
| `exigirMestre(id, usuario)` | primeira linha de toda ação administrativa |
| `personagemAcessivel(id, usuario, {exigeDono})` | as duas portas do personagem |
| `homebrewAlcancavel(registro, usuario)` | seu, ou público |
| `podeVerDocumento(doc, ctx, usuario)` | está na lista, ou é mestre |
| `podeVerCombate(combate, ctx, usuario)` | idem |
| `acaoListarPersonagensCampanha` | o que cada cartão leva, por papel e pela ocultação |
| `recursosParaCombate(ctx, usuario, ids)` | os recursos que a lista do combate pode mostrar |
| `papelParaMarcas(campanhaId, usuario, marcas)` | se a pessoa recebe as marcas da sincronização (nunca dado) |

**`nao_encontrado` também cobre "existe, mas não é seu".** Distinguir os dois
confirmaria que aquele id existe — o mesmo motivo pelo qual o login errado não
diz se foi o usuário ou a senha.

---

## O lote não é uma porta lateral

Desde a v2.1.0 existe a ação `lote`, que junta várias **leituras** numa
requisição só. Ela reduz viagens ao Apps Script; não reduz conferências.

- cada sub-ação chama a **mesma função** que chamaria se viesse sozinha, com
  o usuário derivado da sessão;
- a sessão é validada **uma vez, na entrada**, antes de o servidor olhar o que
  foi pedido. Token inválido recusa o lote inteiro e nenhuma sub-ação roda;
- a lista de ações aceitas é fechada e só tem leitura. Gravação dentro de um
  lote responde `acao_desconhecida`.

Pedir dentro de um lote a ficha de outra conta é recusado pela mesma linha de
código que recusaria o pedido avulso — e há teste para exatamente isso.

---

## O cache não autoriza

A sessão fica em cache por 120 segundos, numa chave derivada do **hash do
token**: formar essa chave exige ter o token, então não existe caminho para
ler a entrada de outra pessoa. O que vai para lá é id, usuário, nome e datas
— nunca `hashSenha`, `salt`, token ou o pepper.

O que continua sendo conferido a cada requisição, venha o dado de onde vier:

- a sessão estar ativa;
- o prazo não ter vencido, contra o relógio de **agora**;
- a conta não estar desativada.

**Revogação continua imediata.** Sair da conta apaga a entrada; trocar a senha
e desativar o usuário avançam a época, e toda entrada carimbada com a época
anterior deixa de valer na hora. O `CacheService` não permite listar nem apagar
por prefixo, então avançar a época é a operação que existe para isso.

**O que o cache não cobre:** marcar `ativo = false` na linha da aba SESSOES
direto na planilha, com a mão. Isso leva até 120 segundos para valer.

**Nenhum dado de campanha é autorizado pelo cache.** Tirar alguém da mesa tira o
acesso a qualquer conteúdo na requisição seguinte, sem janela nenhuma — e há teste
para isso.

A única coisa de campanha em cache é o que a atualização automática precisa
(`sincronizar_campanha`):

- as **marcas** de cada parte — carimbos de tempo com um trecho aleatório, sem
  conteúdo nenhum. Saber que "os combates mudaram" não revela o combate;
- o **papel** de quem pergunta, por até 5 minutos, numa chave que inclui a época e
  as marcas de `membros` e `campanha`. Entrar, sair ou mudar a visibilidade troca
  essas marcas, a chave muda e o papel é conferido de novo na planilha. Esse papel
  só decide se a pessoa recebe marcas; toda busca de conteúdo passa pela
  conferência completa. No pior caso — o cache falhar justo na gravação que tirou a
  pessoa da mesa —, ela ainda recebe marcas por até 5 minutos, e nada além delas.

---

## O que os testes conferem

`deno run --allow-read testes/executar-backend.js` — 447 verificações, entrando
por `doPost` como uma requisição de verdade. Entre elas:

- A não lê nem grava no personagem de B trocando o id
- A não abre a criatura privada de B; abre a pública, mas não a edita nem apaga
- registro anterior à v2 continua privado
- campanha privada não aparece nem abre para quem está de fora
- espectador de campanha pública não administra, não vê a mesa, não registra rolagem
- jogador não salva configurações, não gerencia participantes, não limpa histórico
- mandar `papel: "mestre"` no corpo **não** promove ninguém
- o mestre abre e edita a ficha vinculada, respeitando a revisão
- o mestre **não** apaga, **não** duplica e **não** vira dono da ficha
- mestre de outra campanha não alcança o personagem
- o mestre não puxa para a mesa a ficha de quem não participa
- jogador não consegue marcar a própria rolagem como oculta
- rolagem oculta do mestre não chega ao jogador, nem o nome dela
- documento sem ninguém autorizado não vaza título nem descrição
- dar permissão a quem não é da campanha não funciona
- nota do mestre não vaza em NENHUMA resposta do jogador
- o jogador não recebe a ficha interna das criaturas do combate
- o diretório de usuários devolve só id, usuário, nome e avatar
- gravação dentro de um lote é recusada, e nada é criado
- pedido pela ficha alheia dentro de um lote é recusado
- lote com token inválido não roda nenhuma sub-ação
- sair da conta, trocar a senha e desativar o usuário derrubam a sessão em cache na hora
- sessão vencida é recusada mesmo estando em cache
- tirar alguém da campanha tira o acesso na requisição seguinte
- sem a trava, a gravação responde `ocupado` e nada é gravado pela metade
- o jogador vê os recursos do personagem alheio, sem escolhas, inventário nem
  permissão de editar ou abrir a ficha
- o jogador **não** ajusta recurso nem status alheio pela API, nem abre a ficha
  alheia pelo id
- o jogador **não** liga "Esconder status dos jogadores"
- com a ocultação ligada, os recursos alheios nem chegam — nos cartões e no combate
  —, e o jogador continua vendo os próprios
- outro jogador não grava o resumo de recursos de personagem alheio; resumo sobre
  revisão velha é recusado
- o jogador não grava nem remove a capa; quem está fora de campanha privada não a
  lê pelo id; imagem maior que a célula é recusada, nunca aparada
- quem não é da campanha privada não recebe marcas, o espectador recebe só as de
  fora, e a jogadora tirada da mesa deixa de recebê-las na pergunta seguinte
- a jogadora não opera o combate; lote com uma operação inválida não aplica nada;
  o mesmo `opId` repetido não é aplicado duas vezes
- (v2.16) `ler_fotos`, `ler_avatares` e `ler_capas` devolvem imagem só de quem a
  conta alcança: o dono do personagem e quem joga na mesma mesa que ele (espectador
  não); conta ativa, no caso do avatar; campanha que a conta alcança, no caso da
  capa. Quem não alcança não recebe aquela chave na resposta —
  e a resposta não distingue "não tem imagem" de "não pode ver"
- (v2.16) a projeção do painel (coluna `resumo`) não muda regra nenhuma: ela é
  recortada das MESMAS funções que montavam o cartão, e quem pode ver cada campo
  continua sendo decidido a cada listagem, pelo papel de quem pede
- (v2.15) outra conta não lê, ajusta, duplica, exclui nem sobrescreve uma ficha em
  blocos — nem pelo lote; não existe ação que leia blocos, gerações ou manifestos
  direto, e as ferramentas de diagnóstico, restauração e limpeza (`diagnosticarPersonagem`,
  `restaurarGeracaoAnterior`, `limparBlocosOrfaos`) não estão no roteamento — só
  rodam no editor do Apps Script. Conhecer o id de um personagem ou de uma geração
  não abre nada: tudo passa pela conferência de acesso do personagem
