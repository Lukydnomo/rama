# Campanhas, combate e histórico

O que a campanha guarda, onde cada coisa mora e por quê.

Permissões estão em [PERMISSIONS.md](PERMISSIONS.md); este documento trata da
estrutura.

---

## As abas da campanha

Montadas em `js/paginas/campanha.js`. As duas últimas só existem para o mestre —
não são renderizadas desabilitadas, simplesmente não entram na lista.

| Aba | Quem vê | O que faz |
|---|---|---|
| Visão geral | todos | capa da campanha com o nome, mesa, avisos (rolagens do mestre ocultas, status escondidos) |
| Personagens | membros | grade de cartões: recursos com barra; o mestre ajusta os de todos, o jogador os dos próprios personagens; chave **Esconder status dos jogadores** (mestre) |
| Rolagens | membros | histórico paginado; rolagem livre só para o mestre |
| Documentos | membros | só os documentos liberados para você |
| Combate | membros | só os combates liberados para você: ordem, rodada e turno; ficha do participante selecionado (só o mestre) |
| Notas | **mestre** | anotações privadas, gerais ou por personagem |
| Configurações | **mestre** | nome, visibilidade, participantes, rolagens ocultas |

O espectador de campanha pública não tem abas: vê o nome, a capa e a descrição.

A campanha aberta **se atualiza sozinha** — ver
[Atualização automática](#atualização-automática). O antigo bloco "Panorama" (as
contagens da Visão geral) saiu na v2.12: a identificação e a mesa já diziam o que
ele dizia.

---

## O banco

Tabelas próprias, e a razão de nenhuma delas caber no `dadosJson` da
campanha: rolagens crescem sem fim, documentos e a capa carregam imagem, notas e
combates têm permissão própria e são editados de forma independente. Enfiados num só
JSON, abrir a campanha baixaria tudo e uma nota nova reescreveria o histórico
inteiro.

| Aba | Guarda |
|---|---|
| `CAMPANHA_MEMBROS` | `id, campanhaId, userId, papel, criadoEm` |
| `CAMPANHA_ROLAGENS` | `id, campanhaId, autorUserId, personagemId, tipo, nome, visibilidade, criadoEm, dadosJson` |
| `CAMPANHA_DOCUMENTOS` | `id, campanhaId, nome, descricao, visiveisJson, criadoEm, atualizadoEm, rev` |
| `CAMPANHA_DOCUMENTOS_IMAGENS` | `documentoId, campanhaId, imagem, atualizadoEm` |
| `CAMPANHA_NOTAS` | `id, campanhaId, personagemId, pasta, titulo, criadoEm, atualizadoEm, conteudo` |
| `CAMPANHA_COMBATES` | `id, campanhaId, nome, estado, visiveisJson, criadoEm, atualizadoEm, rev, dadosJson` |
| `CAMPANHA_CAPAS` (v2.12) | `campanhaId, atualizadoEm, largura, altura, imagem` |

`CAMPANHAS` ganhou a coluna `visibilidade`. `HOMEBREW` também. O `dadosJson` da
campanha guarda, além da descrição e de `rolagensMestreOcultas`, a chave
`ocultarStatusJogadores` (v2.12) — um booleano, nunca uma imagem.

**O vínculo personagem↔campanha continua morando no personagem** (`campanhaId`),
e só nele. Guardar dos dois lados exigiria manter dois lugares em sincronia, e a
primeira gravação que falhasse deixaria um personagem numa campanha que não sabe
dele. A coluna `campanhaId` é a que vale: é ela que decide permissão, e desde a
v2.15 a leitura da ficha a coloca dentro do que sai para o navegador.
`criar_personagem` e `salvar_personagem` gravam o valor aceito nos dois lugares;
`vincular_personagem`, `salvar_participantes` e `excluir_campanha` gravam só a
coluna — a ficha, que pode ter centenas de milhares de caracteres, não é lida nem
reescrita para mudar de mesa.

**Três caminhos põem um personagem numa campanha**, todos conferidos no servidor:

| onde | quem | ação |
|---|---|---|
| criação da ficha (universal ou Ordem) | o dono | `criar_personagem` |
| seletor **Campanha** no modo edição da ficha — universal (aba Geral, identidade) e Ordem (aba Geral, painel Identidade) | o dono | `salvar_personagem` |
| **+ Adicionar personagem** na aba Personagens da campanha | o dono, mestre ou jogador da campanha | `vincular_personagem` |

Em todos, a conta dona precisa ser mestre ou jogadora da campanha; espectador não
põe personagem. O seletor da ficha só oferece essas campanhas. **Só o dono troca a
campanha de uma ficha**: o mestre que abre a ficha de um jogador vê o campo travado,
e `salvar_personagem` feito por quem não é dono mantém a campanha que estava — sem
isso, um mestre levaria a ficha do jogador para outra mesa dele. Tirar da campanha
é do dono (ficha, ou menu do cartão) ou do mestre (menu do cartão).

**Membros usam ID de usuário, nunca nome ou username.** Renomear uma conta não
pode dar nem tirar acesso de ninguém.

---

## Capa da campanha

Uma imagem por campanha, numa faixa 3:1 no topo da Visão geral, com o nome da
campanha e o papel de quem olha escritos por cima — a imagem nunca é a única
identificação.

**Fora do `dadosJson`.** A imagem mora em `CAMPANHA_CAPAS`, uma linha por
campanha. Dentro do JSON da campanha, salvar a descrição ou ligar uma chave
reenviaria a imagem inteira. As quatro primeiras colunas são leves: `ler_campanha`
diz se há capa, de que tamanho e de quando sem ler a imagem, e a imagem vem à
parte, por `ler_capa_campanha`. A página a guarda na memória pela data: trocar de
aba não a baixa de novo.

**O fluxo do mestre:**

1. **+ Adicionar capa** (ou **Trocar capa**) escolhe o arquivo. `js/imagem.js`
   confere tipo e tamanho e abre a imagem com as mesmas peças da foto de
   personagem.
2. Uma janela mostra a **prévia exata** do que vai ser gravado. O recorte se ajusta
   com aproximação e posição horizontal e vertical — pelos controles, arrastando a
   prévia ou com as setas do teclado (Shift anda mais). Nada sobe antes de
   **Salvar capa**; **Cancelar** não grava nada.
3. Ao salvar, sobe só o recorte: até 1500 × 500 px, comprimido (WebP ou JPEG, o que
   couber) até 40.000 caracteres, reduzindo aos poucos se preciso. Se nem assim
   couber, o envio é recusado com o motivo — nunca truncado. O servidor confere de
   novo: formato `data:image/(webp|jpeg|png)`, dimensões de 1 a 4096 px e o limite
   da célula (`dados_grandes`).
4. **Remover** pede confirmação e apaga a linha.

A imagem chega na proporção da faixa, então a ocupa sem distorcer e sem cortar nada
que o mestre não tenha visto na prévia. O botão mostra "Enviando imagem…" enquanto
a planilha trabalha; uma falha de rede oferece **Tentar de novo** com o mesmo
recorte.

**Quem faz o quê.** Só o mestre grava, troca ou remove (`exigirMestre`). Ler passa
por `contextoDaCampanha`: a capa de campanha privada não sai para quem está de
fora, nem pedindo `ler_capa_campanha` direto pelo id; a de campanha pública aparece
para o espectador, como o nome e a descrição. Campanha sem capa — todas as
anteriores à v2.12 — mostra ao mestre um convite para adicionar e, aos outros,
nada.

---

## Atualização automática

Quem está com a campanha aberta vê o que os outros mudaram — recursos,
iniciativas, rodada e turno, participantes, quem pode ver, a capa, documentos e
rolagens — **sem recarregar a página**. Não é tempo real: o Apps Script não mantém
conexão aberta, então o navegador pergunta de tempos em tempos
(`js/sincronia.js`).

### A pergunta é leve

`sincronizar_campanha` não traz dado nenhum: traz as **marcas** de cada parte da
campanha (`campanha`, `membros`, `personagens`, `combates`, `documentos`,
`rolagens`). Uma marca é um carimbo curto no `CacheService` (tempo + trecho
aleatório), trocado por toda gravação que muda aquela parte; o servidor as lê do
cache, sem tocar na planilha. Quando uma marca muda, a página busca **só aquela
parte**, pelo caminho normal e com todas as conferências de permissão. Saber que
"os combates mudaram" não revela o combate.

| gravação | marca que muda |
|---|---|
| nome, descrição, visibilidade, rolagens ocultas, capa | `campanha` (+ `membros` se a visibilidade mudou) |
| **Esconder status dos jogadores** | `campanha`, `personagens`, `combates` |
| participantes | todas |
| ficha salva, ajuste rápido, resumo de recursos, vincular/desvincular, excluir ficha | `personagens`, `combates` |
| criar ou duplicar ficha já numa campanha, foto | `personagens` |
| combate criado, gravado, operado ou excluído | `combates` |
| documento criado, editado, excluído, imagem trocada | `documentos` |
| rolagem registrada, histórico limpo | `rolagens` |

O papel de quem pergunta é conferido na planilha e guardado por até 5 minutos numa
chave que inclui as marcas de `membros` e `campanha`: entrar, sair ou mudar a
visibilidade troca a marca, e o papel é conferido de novo na pergunta seguinte.
Esse papel em cache só decide se a pessoa recebe marcas — nunca dado.

Se o cache perder uma marca (o Google descarta entradas quando quer, e nenhuma dura
mais de 6 horas), ela vira uma marca de reserva que muda a cada minuto: o pior caso
é buscar a parte de novo uma vez por minuto até a próxima gravação, nunca perder
uma mudança. Marcas presentes são regravadas com o mesmo valor a cada 4 horas, para
mesa parada não cair nesse passo à toa.

### O ritmo, e a latência de verdade

| situação | intervalo entre perguntas |
|---|---|
| aba **Personagens** ou **Combate** aberta | ~8 s |
| outras abas | ~20 s |
| página escondida (outra aba do navegador, tela bloqueada) | não pergunta; ao voltar, pergunta na hora |
| falha | a espera dobra a cada falha, até 1 minuto; volta ao normal na primeira resposta boa |

Cada espera varia ±10%, para vinte navegadores da mesma mesa não perguntarem no
mesmo instante. Trocar de aba da campanha pergunta na hora. Quem é tirado da
campanha ou perde a sessão para de perguntar.

**Latência esperada** de uma mudança feita por outra pessoa: o intervalo (até ~8 s
nas abas de mesa, ~20 s nas outras) + a resposta das marcas (normalmente menos de
2 s) + a busca da parte que mudou (1 a 3 s). Na prática, **de 2 a 15 segundos nas
abas de mesa e até ~25 segundos nas outras** — mais quando o Apps Script está
"acordando". Quem fez a mudança vê na hora; quem só olha, nesse intervalo.

**Carga.** Com vinte pessoas nas abas de mesa, são cerca de 2,5 perguntas por
segundo, cada uma uma leitura de cache. As leituras de planilha só acontecem quando
algo mudou, e só da parte que mudou. As perguntas contam na cota de execuções do
Apps Script da conta que publicou o backend (ver [PERFORMANCE.md](PERFORMANCE.md)).

### O que cada aba faz com a mudança

Toda busca provocada pela sincronização é de **segundo plano**: acende só o selo
"Atualizando…", nunca uma tela de carregamento, e uma falha nela não troca o que
está na tela por um erro.

| aba | ao chegar mudança |
|---|---|
| Visão geral | redesenha capa, mesa e avisos |
| Personagens | atualiza cartão por cartão; recurso sendo digitado ou com gravação pendente não é tocado; cartões novos entram, os que saíram somem; a ocultação ligada ou desligada tira ou devolve os números dos cartões alheios |
| Rolagens | busca de novo do começo, do tamanho do que já estava aberto (até 200 linhas) |
| Documentos | busca a lista; documento que não mudou continua com o mesmo cartão (aberto como estava, sem baixar a imagem de novo); o que deixou de ser liberado some |
| Combate | cada combate passa pela fila dele (ver [Conflitos e falhas](#conflitos-e-falhas)): o que chegou é conciliado com o que está pendente antes do próximo envio; a linha não foge de baixo de uma iniciativa sendo digitada; a ficha aberta no painel lateral recarrega só se não houver nada pendente nela nem campo em edição |
| Configurações | avisa que a campanha mudou em outro lugar, sem apagar o formulário |

**Perder o acesso** (ser tirado de uma campanha privada, campanha excluída) troca a
tela por um aviso e descarta da memória da página o que era da campanha, inclusive
as filas de combate: a sincronização não devolve dado que deixou de ser permitido.
Tirado de uma campanha pública, a pessoa vira espectadora ali mesmo. Trocar de
papel (jogador ↔ mestre) redesenha as abas. O que a pessoa já viu na tela antes
disso não tem como ser "desvisto".

---

## Carregamento e gravação

Toda ida à planilha passa por `RAMAApi.post` (`js/api.js`), que anuncia o início e o
fim de cada operação (`RAMAApi.aoOperar`, e o evento `rama:operacao` no
`document`). Nenhuma espera fica muda:

- **Barra de atividade** — uma faixa fina no topo acende no instante em que começa
  qualquer operação de primeiro plano e apaga quando a última termina.
- **Selo "Atualizando…"** — discreto, no canto, só para as de segundo plano
  (sincronização automática e as buscas que ela provoca).
- **O controle que disparou** mostra o próprio estado com
  `RAMAUI.ocupar(botao, fn, { rotulo, regiao })`: fica desabilitado e `aria-busy`, o
  texto vira "Salvando…", "Enviando imagem…", "Removendo…" — com o nome da ação
  preservado no rótulo acessível e a largura travada —, e um segundo clique não
  repete a ação. Termine bem, mal ou com exceção, o botão volta como estava. Os
  botões das janelas (`RAMAUI.modal`) fazem isso sozinhos quando a ação devolve uma
  promessa ("Salvar" → "Salvando…", "Excluir" → "Excluindo…").
- **Falha passageira** (sem conexão, prazo, servidor ocupado) ganha no aviso o botão
  **Tentar de novo**. Recusa de permissão ou de dados não ganha: repetir não muda a
  resposta.

Controles que aceitam alterações seguidas — ajuste rápido de recursos, iniciativa,
vida de criatura — **não** ficam ocupados: o próximo clique é outra intenção, não
repetição. Eles têm fila (`js/fila.js` nos cartões, `js/combate-fila.js` no
combate), com estado próprio: "Salvando…", "Alterações pendentes", "Tentando de
novo…".

---

## Histórico de rolagens

### Um funil só

O sistema já tinha um ponto por onde toda rolagem passava para ser MOSTRADA:
`RAMARolagens.mostrar()`. O histórico se pendurou nesse mesmo ponto.

```
ação rolável
      ↓
motor de dados (rola UMA vez)
      ↓
resultado ──┬── RAMARolagens.mostrar()   → aparece na tela
            └── RAMAHistorico.registrar() → sobe, se houver campanha
```

É por isso que `ficha-pericias.js`, `ficha-geral.js` e `ficha-inventario.js` não
têm uma linha de código de histórico. Espalhar isso por quatro arquivos
garantiria que o quinto esquecesse.

### A rolagem acontece uma vez

O resultado já existe quando chega ao `js/historico.js`. Se a gravação falhar, o
que se repete é o **envio** — nunca o sorteio. O número que a mesa viu é o número
que vai para o histórico.

Cada rolagem carrega um `id` gerado no momento em que aconteceu. Esse id
acompanha todas as retentativas, e é ele que faz o servidor reconhecer a segunda
chegada como repetição em vez de criar uma segunda linha. **Gerar um id novo ao
repetir seria o mesmo que rolar de novo, com um disfarce.**

### Paginação

O histórico cresce sem teto. `listar_rolagens` aceita `pulo` e `limite` (padrão
50, máximo 200), e a tela pede mais quando precisa. Baixar a tabela inteira para
desenhar as últimas vinte linhas seria pagar caro por nada.

O mestre pode limpar o histórico da própria campanha, com confirmação.

---

## Combate

Tela em `js/paginas/campanha-combate.js`; regras de ordem, turno e rodada em
`js/combate-turnos.js` (repetidas no servidor, em `backend/Campanhas.gs`); fila de
alterações em `js/combate-fila.js`.

### Fica salvo

Na planilha, não na memória da aba. Recarregar a página, fechar o navegador ou
abrir em outro computador encontra o combate onde ele estava — participantes,
iniciativas, vida das criaturas, estado, rodada e de quem é a vez.

### Criaturas entram como snapshot

Ao acrescentar uma criatura ao combate, o sistema copia a mini ficha dela para
dentro do combate. Editar o modelo na biblioteca depois **não** muda combate
nenhum já montado.

Cada ocorrência tem id próprio: "Existido #1" e "Existido #2" vêm do mesmo
modelo e têm estados independentes. `origemId` fica como rastro histórico — o
combate nunca o consulta para desenhar nada.

### Iniciativa

**É digitada, não sorteada.** O sistema só ordena, do maior para o menor, e a
ordenação é estável: quem empata mantém a posição relativa em vez de pular de
lugar a cada digitação.

```
[ 22 ] Michael
[ 18 ] Existido #1
[ 14 ] Gina
[  7 ] Cultista
```

Não existe rolagem automática de iniciativa, grid, distância, condição oficial,
ação por turno nem duração de efeito. Nada disso foi especificado, e o sistema não
inventa regra. O que existe é a **vez**: rodada e participante do turno.

### Estados

`preparando` → `ativo` → `encerrado`, só nessa direção. Não há subsistema de regras
por trás deles: iniciar liga o turno, encerrar desliga.

### Turnos e rodadas

O turno é **de um participante, guardado pelo ID** — nunca pela posição. Por isso
mudar uma iniciativa no meio da rodada muda a ordem, mas não passa a vez de
ninguém. Só o mestre passa ou volta o turno; o jogador com acesso ao combate vê a
rodada e de quem é a vez, destacada na lista e anunciada ao leitor de tela.

| situação | o que acontece |
|---|---|
| **Iniciar combate** | rodada 1, turno do primeiro da ordem (ou de ninguém, num combate sem participantes) |
| **Próximo turno** | o seguinte na ordem; depois do último, volta ao primeiro e a rodada sobe 1 |
| **Voltar turno** | o anterior; do primeiro, vai ao último da rodada anterior. Na rodada 1, com o primeiro da ordem, não há para onde voltar: o botão fica desabilitado e nada muda |
| um participante só | próximo e voltar só mudam a rodada |
| acrescentar participante | entra na ordem pela iniciativa; o turno continua com quem estava. Se ninguém tinha o turno (combate vazio), vai para o primeiro da ordem |
| remover quem tem o turno | o turno passa para quem vinha depois; se ele era o último, para o primeiro, e a rodada sobe |
| remover outro participante | nada muda na vez |
| reordenar (mudar iniciativa) | muda quem vem depois; o turno atual não muda |
| sem participantes | não há turno; próximo e voltar ficam desabilitados |
| **Encerrar** | a rodada fica registrada e ninguém tem o turno; encerrado não volta a andar nem a ficar em preparação |

As regras moram em dois lugares de propósito: `js/combate-turnos.js`, para a tela
mostrar a vez nova no clique, e `backend/Campanhas.gs` ("Turnos e rodadas"), que é
quem grava. `testes/executar-backend.js` roda 400 combates sorteados nas duas
implementações e exige o mesmo resultado; se uma mudar, a outra tem de mudar junto.

**Seleção não é turno.** Clicar no nome de um participante o **seleciona** para
consulta no painel lateral. Selecionar nunca passa a vez; só **Próximo turno** e
**Voltar turno** passam.

### Operações em lote e a fila

Antes da v2.12, cada iniciativa digitada gravava o combate inteiro meio segundo
depois, com a revisão que a tela conhecia. Três iniciativas num ritmo normal
disparavam duas gravações com a mesma revisão: a segunda voltava como conflito, a
tela recarregava tudo e engolia a terceira, ainda sendo digitada. Iniciar e
encerrar agendavam um recarregamento "700 ms depois", que podia chegar antes da
gravação terminar.

Agora a tela manda **operações** (`atualizar_combate`) por uma **fila por combate**:

| tipo | exemplos | quando sobe |
|---|---|---|
| **campos** | iniciativa, vida de criatura | depois de ~5 s sem nova iniciativa (~1,2 s para vida); vale o último valor de cada campo |
| **pontuais** | turno, iniciar, encerrar, acrescentar, remover, renomear, quem pode ver | logo, em ordem, depois do que já estiver no ar |

- A tela mostra os números novos na hora: a vista é o estado confirmado pelo
  servidor com o que está no ar e o que está pendente aplicado por cima.
- A barra do combate diz **"Alterações pendentes (n) · salvando em 4 s"** com o
  botão **Salvar agora**; durante o envio, **"Salvando…"** e quantas alterações
  esperam o próximo lote.
- Os campos continuam editáveis enquanto há pendências e durante o envio.
- **Um lote no ar por vez.** O que for editado durante o envio forma o próximo lote,
  que só sai com a revisão que a resposta trouxe. Duas gravações da mesma fila
  nunca saem com a mesma revisão, e uma resposta velha nunca apaga um valor mais
  novo.
- Enquanto houver iniciativa ou vida digitada e ainda não enviada, **Próximo
  turno**, **Voltar turno**, **Iniciar**, **Encerrar** e remover ficam desabilitados,
  com o motivo — o lote pendente muda a ordem em que eles se baseiam. "Salvar
  agora" libera.
- **Sair sem perder:** trocar de aba da campanha e esconder a página (trocar de aba
  do navegador, bloquear a tela) mandam o pendente na hora; fechar ou recarregar a
  página com algo pendente pede confirmação do navegador.
- Nenhum recarregamento com tempo fixo: a tela espera a resposta do servidor.

### Conflitos e falhas

Três proteções no servidor, e nenhuma substitui a outra:

| proteção | o que faz |
|---|---|
| `rev` | o lote diz sobre qual revisão foi montado. Se o combate mudou em outro lugar, a resposta é `conflito` **com o estado atual** |
| `opId` | cada lote tem um identificador, guardado com o combate (os últimos 40). O mesmo lote chegando de novo — a resposta se perdeu e a tela repetiu — é reconhecido antes da revisão e **não** é aplicado duas vezes: um "próximo turno" repetido pela rede não pula dois turnos |
| trava | duas gravações nunca se intercalam na planilha |

O lote é **atômico**: uma operação inválida recusa o lote inteiro (`dados_invalidos`,
com o índice dela), e nada dele é aplicado.

**Falha de rede** (sem conexão, prazo, servidor ocupado): a fila repete o **mesmo**
lote, com o **mesmo** `opId` e a **mesma** revisão, esperando ~2, 5, 10, 20 e 30 s
(com uma pequena variação aleatória). Depois de 6 tentativas para de insistir
sozinha; nada se perde, e a barra oferece **Tentar agora**. As alterações ficam
guardadas **na memória da aba** — não há persistência local: fechar a aba com algo
pendente perde o pendente (por isso o navegador pede confirmação).

**Conflito real** (outro mestre, outra aba, outro aparelho): cada alteração é
comparada com o valor que ela tinha **antes** de ser feita.

| o servidor tem… | a alteração |
|---|---|
| o valor de antes | é independente: reaplicada sobre o estado novo, sem perguntar |
| o valor desejado | já está lá: descartada |
| **outro** valor | a outra pessoa mexeu no mesmo campo: uma janela mostra "Antes", "Manter o meu" e "Usar o da outra pessoa", e a pessoa decide. Sem escolha, fica o da outra pessoa |
| participante não existe mais | descartada, com aviso |

Turno, iniciar e encerrar só são reaplicados se o turno e o estado ainda forem os de
quando o clique aconteceu; senão caem com aviso — avançar um turno que outro mestre
já avançou pularia alguém. Renomear e quem pode ver seguem a mesma regra. Mais de 5
conflitos seguidos param a fila com as alterações guardadas e o botão **Salvar
agora**. Nada disso recarrega a página nem sobrescreve em silêncio.

A atualização que chega pela sincronização passa pela **mesma** comparação antes de
o próximo lote sair; sem isso, o lote seguinte levaria a revisão nova e
sobrescreveria em silêncio a mudança que acabou de chegar.

### Quem pode ver

Quatro decisões separadas, cada uma no seu lugar:

| decisão | onde | quem decide |
|---|---|---|
| ver o combate | **Quem pode ver**, nos controles abaixo da lista do combate | mestre, por combate |
| ver os recursos dos personagens na lista | chave **Esconder status dos jogadores**, aba Personagens | mestre, para a campanha inteira |
| abrir a ficha de um personagem | dono ou mestre, sempre (`ler_personagem`) | ninguém muda isso por aqui |
| administrar o combate (turno, iniciativa, participantes) | só o mestre (`exigirMestre` em toda operação) | — |

O jogador com acesso recebe nome, estado, rodada, turno e, de cada participante,
id, tipo, nome, iniciativa e o id do personagem — e os recursos atuais e máximos dos
personagens que ele pode ver (os próprios sempre; os dos outros, só com a ocultação
desligada). **Nunca** o snapshot das criaturas, o id do modelo na biblioteca nem a
lista de quem pode ver.

### Painel lateral do mestre

No desktop, o combate do mestre tem duas colunas: a lista e, ao lado, a ficha do
participante **selecionado**. Em telas de até 900 px, a ficha abre numa gaveta.

- **Personagem:** a própria ficha, em `ficha/?id=…&painel=1` dentro do painel —
  os mesmos arquivos, o mesmo salvamento com revisão e o mesmo histórico de
  rolagens, sem a casca do site. Não é uma segunda implementação. A permissão é a de
  sempre: `ler_personagem` só entrega a ficha ao dono ou ao mestre da campanha
  dela. Trocar de participante com algo por salvar na ficha tenta salvar antes e,
  se não der, pergunta. Quando a ficha salva, ela avisa a página de fora
  (`postMessage`, mesma origem), a sincronização pergunta na hora e a lista traz os
  números novos; quando a sincronização traz uma versão nova da ficha, ela recarrega
  só se não houver nada pendente nem campo em edição. **Página inteira** abre a
  ficha numa aba nova.
- **Criatura:** a instância **deste** combate (o snapshot): status, atributos,
  perícias, ataques, habilidades e descrição. Mudar a vida mexe só nesta
  ocorrência, pela fila do combate (`criatura_status`) — o modelo na biblioteca e
  as outras cópias não mudam. As rolagens usam o mesmo motor e o mesmo mostrador das
  fichas e sobem ao histórico pelo mesmo funil, como rolagem do mestre (seguindo a
  configuração de rolagens ocultas).

O jogador não tem painel: a tela nem monta o controle, e o servidor não manda a ele
ficha de criatura nem de personagem alheio.

### Combates antigos

Nenhuma migração é necessária, e nada é apagado.

- Combate **em preparação ou encerrado** sem turno guardado: sem turno (encerrado
  guarda rodada 0).
- Combate **em andamento** sem turno guardado: rodada 1, turno do primeiro da ordem.
  Não há histórico anterior a reconstruir, e nada é inventado. O estado é calculado
  na leitura e gravado na primeira operação.
- `salvar_combate` (a gravação completa, usada para criar e pelas versões anteriores
  do site) continua funcionando e **preserva** o turno e os `opId` guardados — quem
  não os conhece não os apaga.

---

## Criaturas

Modelo em `js/criaturas.js`, editor em `js/paginas/homebrew-criatura.js`.

Ela **reusa** os conceitos que já existem — atributo com valor e dado separados,
perícia como rolagem dependente, ataque com dano e crítico, habilidade igual à da
ficha — mas **não herda a ficha inteira**: uma criatura com três perícias tem três
perícias, e não as 28 padrão.

```jsonc
{
  "tipo": "criatura",
  "nome": "Existido",
  "visibilidade": "privado",
  "categoria": "",
  "descricao": "",
  "status":      [ { "id", "nome", "atual", "maximo" } ],
  "atributos":   [ { "id", "nome", "sigla", "valor", "dado" } ],
  "pericias":    [ { "id", "nome", "atributoId", "bonus", "bonusTemporario" } ],
  "ataques":     [ { "id", "nome", "periciaId", "dado", "dano", "danoExtra",
                     "critico", "multiplicador", "descricao" } ],
  "habilidades": [ /* mesmo schema de habilidade da ficha */ ]
}
```

A imagem mora fora, em `CRIATURAS_IMAGENS` — mesma razão da foto de personagem.

Vida e Esforço nascem como **sugestão**, não como regra: são dois status
comuns, removíveis e renomeáveis como qualquer outro. Nada é calculado.

---

## Painel da mesa (aba Personagens)

Uma grade de cartões compactos (`js/paginas/campanha-personagens.js`) que se
ajusta à largura — vários por linha no desktop, um por linha no celular, sem
rolagem horizontal. Cada cartão: foto (ou iniciais), nome (cortado com
reticências, completo no título e nos rótulos de acessibilidade), classe e trilha,
jogador, NEX ou nível; atributos só para consulta; barras de recurso; estatísticas;
**Abrir ficha** no rodapé — só onde a pessoa pode abrir; e **Tirar da campanha** num
menu separado dos recursos — em todos os cartões para o mestre, e no próprio
personagem para o dono. O que cada um recebe está em [Quem vê o quê](#quem-vê-o-quê).

**+ Adicionar personagem** fica na barra da aba (ao lado de **Atualizar**) e no
aviso de mesa vazia, para mestre e jogadores. Abre uma janela com os personagens
**da própria conta** que ainda não estão nesta campanha — a lista vem de
`listar_personagens`, que só devolve fichas de quem pede —, com busca a partir de
seis, e um botão **Adicionar** por linha. Um personagem que está em outra campanha
aparece com o aviso "sai de lá ao entrar aqui". Cada clique chama
`vincular_personagem`; o cartão entra na grade na hora (ou a grade nasce, se a
mesa estava vazia) e a janela continua aberta para adicionar outros. O mestre não
vê ali as fichas dos jogadores: cada conta adiciona as suas. Listar fichas de
outra conta que ainda não estão na mesa daria ao mestre um alcance que ele não
tem.

**O que cada cartão mostra** sai de `js/campanha-painel.js`, sem fórmula própria.
Para os números serem os da ficha, `campanha/index.html` carrega o motor de Ordem
inteiro, na mesma ordem da ficha: `catalogo`, **`poderes`**, `opcionais`,
`inventario`, `personalizacao`, `progressao`, `regras`. Sem `poderes.js` o cálculo
não quebra — ele ignora a progressão e mostra valores base (foi o defeito da
v2.11.1); `testes/executar-frontend.js` confere isso lendo o HTML.

| ficha | recursos | atributos | estatísticas |
|---|---|---|---|
| Ordem | PV, PE e Sanidade (sem Sanidade com "Jogando sem Sanidade"), atual e máximo calculados por `RAMAOrdemRegras.calcular` | efetivos | Defesa, Bloqueio, Esquiva, PE por turno, deslocamento — com os bônus extras |
| Universal | os status configurados na ficha, com os nomes dela | os configurados | nenhuma — nada de Ordem é imposto |

Bloqueio e Esquiva vêm do mesmo cálculo da ficha. A barra limita só a
LARGURA ao espaço dela: o número mostrado é o de verdade (zerado, negativo ou acima
do máximo). A cor de cada recurso vem acompanhada do nome escrito.

### Quem vê o quê

Decidido no servidor, em `listar_personagens_campanha`; a tela só desenha o que
chegou.

| quem olha | o que recebe |
|---|---|
| mestre | todos os personagens por inteiro: dados de cálculo, recursos com ajuste rápido, atributos, estatísticas, **Abrir ficha** e **Tirar da campanha** |
| dono | o mesmo, dos próprios personagens — de todos eles, se tiver mais de um na mesa |
| outro jogador | identificação (nome, foto, classe e trilha, NEX ou nível, jogador), os atributos de uma ficha universal e os recursos **atuais e máximos, só leitura** — PV, PE e SAN numa ficha de Ordem, os status configurados numa universal. Sem estatísticas, escolhas, inventário, controles nem **Abrir ficha** |
| outro jogador, com a ocultação ligada | só a identificação (e os atributos da universal); o cartão diz "Status ocultos pelo mestre." |
| espectador | nada: a mesa não é dele |

**Ver o resumo não abre a ficha.** `podeAbrirFicha`, `podeEditarRecursos` e
`recursosVisiveis` são rótulos para a tela. `ler_personagem` e `ajustar_personagem`
continuam recusando quem não é dono nem mestre: trocar o id na URL da ficha ou
chamar a API direto não passa.

### Esconder status dos jogadores

Chave do mestre na barra da aba Personagens, guardada na campanha
(`ocultarStatusJogadores`, por `salvar_campanha`, que só o mestre passa — um jogador
que mande o campo recebe `sem_permissao`).

- **Desligada** (padrão, e o estado de toda campanha anterior à v2.12): cada jogador
  vê os recursos de todos os personagens da mesa e edita só os próprios.
- **Ligada:** cada jogador vê e edita os recursos só dos próprios personagens. O
  mestre continua vendo todos.

Ligada, o servidor **não manda** ao jogador os recursos dos personagens dos outros —
nem nos cartões, nem na lista do combate (`listar_combates`). Não há barra, número,
percentual, dica nem atributo HTML para esconder, porque eles não chegam. Mudar a
chave troca as marcas de `campanha`, `personagens` e `combates`: quem está com a
campanha aberta recebe as listas novas na próxima pergunta da sincronização, já sem
o que deixou de ser permitido (ou com o que voltou a ser). A Visão geral mostra um
aviso a todos enquanto ela estiver ligada. O que alguém já viu antes de a chave ser
ligada não tem como ser apagado.

### O resumo de recursos das fichas de Ordem

O máximo de PV, PE e Sanidade sai de classe, trilha, escolhas e poderes — o build
inteiro —, e o motor de regras mora no navegador. Para o outro jogador ver o máximo
sem receber a ficha, quem já pode ver a ficha inteira (dono ou mestre) calcula e
guarda esse máximo dentro dela, em `resumoRecursos` `{ versao, pv, pe, san }` (`san`
nula com "Jogando sem Sanidade"):

- toda gravação de ficha de Ordem (a ficha e a criação) manda o resumo junto;
- quando a aba Personagens desenha o cartão de quem pode ver a ficha, compara o
  resumo guardado com o cálculo e, se ficou para trás (ficha salva por uma versão
  antiga do site, por exemplo), regrava em segundo plano com
  `atualizar_resumo_personagem` — com a revisão da ficha, para um painel velho não
  gravar um máximo velho por cima do novo. A revisão não sobe: o resumo é derivado,
  e subir a revisão poria em conflito a ficha aberta em outro aparelho.

O **atual** não entra no resumo: o servidor o lê de `ordem.recursos` na hora (nunca
tocado vale o máximo), e é ali que o ajuste rápido grava — um −1 de vida aparece para
a mesa sem ninguém recalcular nada. Enquanto uma ficha de Ordem não tiver resumo (a
de uma ficha importada, ou de quem não salvou a ficha nem abriu esta aba desde a
v2.12), o cartão alheio diz que os recursos aparecem quando o dono ou o mestre abrir
esta aba ou salvar a ficha. Uma gravação vinda de uma versão antiga do site, sem
resumo, mantém o que estava.

Confiança: o dono conseguiria mostrar à mesa um máximo inventado — e conseguiria do
mesmo jeito editando a própria ficha. O servidor valida a forma (inteiros de −999 a
99.999).

### Ajuste rápido

`[−]`, `[+]` e o número, que abre um campo: Enter ou ✓ confirma,
Esc ou × cancela. Vazio, texto, decimal ou fora dos limites da ficha é recusado com
o motivo — nunca vira zero. Os limites são os da ficha completa (Ordem: −99 até o
máximo; universal: −9999 até o máximo, sem teto quando ele é 0). Só o valor atual
muda: máximos, atributos e valores-base não.

A mudança aparece na hora (a barra fica tracejada até o servidor confirmar) e entra
na fila de `js/fila.js`: cliques seguidos viram um envio com o valor final, e o
cartão mostra "Salvando…", "Salvo", "Tentando de novo…" ou o erro. Num conflito de
revisão, a fila busca a listagem de novo e **só reenvia se aquele recurso continua
com o valor de quando o ajuste começou**; se outra pessoa (o dono na ficha, o mestre
no painel) acabou de mexer nele, o ajuste não passa por cima e a tela avisa. Buscar
a listagem — pelo botão **Atualizar** ou pela sincronização automática — atualiza
os cartões no lugar, sem tocar num recurso sendo digitado ou com gravação pendente.

## Ajuste rápido de status

Os botões `[-]` e `[+]` do painel da mesa poderiam reusar `salvar_personagem`,
mas isso obrigaria a baixar a ficha inteira, mudar um número e devolver tudo — e
duas pessoas mexendo em personagens diferentes disputariam a mesma gravação
enorme.

`ajustar_personagem` faz a alteração cirúrgica: um campo, por id, **com a
revisão conferida do mesmo jeito**. Não é um caminho paralelo mais frouxo — é o
mesmo controle de concorrência sobre um payload menor.

O servidor valida o alvo (`status`, `atributo` ou `recurso`), o campo (lista
fechada) e o valor — que precisa ser um número de verdade: vazio, `null` ou texto é
recusado, e não vira 0. Um campo fora da lista, ou um alvo inventado, é recusado.

`recurso` é da ficha de Ordem: `itemId` é `pv`, `pe` ou `san`, o campo é só
`atual`, o piso é −99 (o da ficha) e o valor vai para `ordem.recursos`. O máximo é
calculado pelas regras e nunca é gravado. Numa ficha universal, `recurso` é
recusado.

Com `campanhaId` no pedido, o servidor confere também que o personagem continua
vinculado àquela campanha — um cartão aberto há uma hora não mexe numa ficha que
já saiu da mesa. A permissão continua a de sempre: dono, ou mestre da campanha em
que o personagem está.

Desde a v2.15 o pedido continua pequeno, mas o servidor lê a ficha inteira em
blocos, conferida, e a grava de novo como uma geração nova — o conteúdo é um só.
Uma ficha que não se monta não é ajustada, e o cartão dela aparece marcado ("a ficha
deste personagem não se montou por inteiro"), sem números nem botões. Cada ajuste
leva um id de operação: se a resposta se perde, a fila repete o MESMO ajuste antes
do clique seguinte, e o servidor o reconhece em vez de acusar conflito com ele.

---

## Documentos e imagens

O pipeline de imagem do sistema comprime no navegador antes de subir. Para
documentos ele é chamado com `{ lado: 1024, quadrado: false }`: uma planta baixa
recortada em quadrado de 256px não serviria para nada.

A imagem vai para uma tabela própria, separada dos metadados, porque ela é o
campo mais pesado e o que menos muda — e porque a permissão precisa ser
conferida de novo na hora de entregá-la.

O servidor recusa acima do limite de célula com `dados_grandes` em vez de
truncar. **Conteúdo truncado em silêncio é pior do que uma recusa.**
