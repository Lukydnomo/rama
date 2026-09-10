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
| **jogador** | foi convidado para a campanha | entra na campanha, vê o que foi liberado, edita a própria ficha |
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

### Homebrew

| | Quem lista e usa | Quem edita e apaga |
|---|---|---|
| **privado** | só o dono | só o dono |
| **público** | qualquer agente, como modelo | **só o dono** |

Registro gravado antes da v2 tem a célula de visibilidade vazia, e vazio é lido
como **privado**. Nenhuma biblioteca que já existia virou pública sozinha.

Tentar editar um registro público de outra conta não atualiza o original: cria
um registro novo sob quem pediu.

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

O mestre escolhe quem vê cada combate. Quem tem acesso recebe a lista e a ordem
de iniciativa — e **não** a ficha interna das criaturas nem o id do modelo na
biblioteca.

### Notas do mestre

Privadas, sem exceção. Toda ação de nota começa exigindo mestre, e não existe
variação "para jogador" dessas funções — a forma mais segura de nunca vazar uma
nota é não haver caminho de código que a devolva a quem não é mestre.

---

## Onde isso está no código

Tudo em `backend/Codigo.gs` e `backend/Campanhas.gs`:

| Função | Responde |
|---|---|
| `papelNaCampanha(campanha, usuario)` | qual o papel real, do banco |
| `contextoDaCampanha(id, usuario)` | o papel, ou `nao_encontrado` |
| `exigirMestre(id, usuario)` | primeira linha de toda ação administrativa |
| `personagemAcessivel(id, usuario, {exigeDono})` | as duas portas do personagem |
| `homebrewAlcancavel(registro, usuario)` | seu, ou público |
| `podeVerDocumento(doc, ctx, usuario)` | está na lista, ou é mestre |
| `podeVerCombate(combate, ctx, usuario)` | idem |

**`nao_encontrado` também cobre "existe, mas não é seu".** Distinguir os dois
confirmaria que aquele id existe — o mesmo motivo pelo qual o login errado não
diz se foi o usuário ou a senha.

---

## O que os testes conferem

`deno run --allow-read testes/executar-backend.js` — 118 verificações, entrando
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
