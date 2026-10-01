# R.A.M.A.

**Rede de Arquivamento Multiversal de Agentes** — sistema pessoal de fichas de
RPG: personagens, rolagens, inventário, homebrew e anotações.

Site estático no GitHub Pages, backend em Google Apps Script, dados numa
planilha do Google. Sem build, sem npm, sem servidor próprio.

```
Navegador  ──POST JSON──►  Apps Script (app da Web)  ──►  Google Sheets
(GitHub Pages)                  toda a segurança            fonte da verdade
```

A planilha é a **fonte da verdade**. `localStorage` guarda só a sessão e
preferências de tela — nunca é tratado como banco.

---

## Estrutura

```
/
  index.html            Home: apresentação do sistema e por onde começar
  personagens/          lista de personagens
  campanhas/            lista de campanhas
  campanha/             uma campanha (?id=...)
  homebrew/             biblioteca de itens
  perfil/               conta, exibição e importação
  ficha/                a ficha (?id=...)
  testes/               casos de teste, no navegador e no terminal

  css/
    tokens.css          cor (paleta clara e escura), espaço, traço, tempo — os valores literais
    base.css            reset, @font-face, tipografia, véu de CRT
    componentes.css     botão, campo, painel, cartão, modal, aviso…
    layout.css          cabeçalho, navegação, listas, rodapé
    ficha.css           só o que é exclusivo da ficha

  js/
    config.js           ÚNICO arquivo a editar ao publicar
    util.js             ids, datas, números, DOM, comparação canônica
    rede.js             transporte: POST, prazos, retentativas
    api.js              uma função por ação do servidor
    auth.js             sessão, portão de entrada, guarda de página
    tema.js             tema claro/escuro: preferência da conta → tema na tela (no <head>)
    dados.js            motor de dados — o único Math.random do sistema
    ficha.js            modelo da ficha, padrões e normalização
    validacao.js        validação central, incluindo importação
    sync.js             conciliação de três vias e tela de conflito
    salvar.js           debounce, fila, backoff, revisão
    imagem.js           recorte, redução e compressão de foto
    importar.js         janela de importação com prévia
    ui.js               avisos, janelas, menus, indicadores, recolhível
    app.js              casca: cabeçalho, navegação, preferências, changelog
    versao.js           FONTE ÚNICA da versão e do changelog
    habilidades.js      modelo e árvore recursiva de habilidades
    organizar.js        o que muda de lugar ao reorganizar uma lista (filtro, pastas, grupos)
    sistemas.js         o registro dos sistemas de RPG (Ordem Paranormal, Universal…)
    personagens-organizacao.js  pasta aberta, busca, sistema e agrupamento da página Personagens
    arrastar.js         o gesto de arrastar e soltar, o mesmo nas cinco abas
    criaturas.js        mini ficha de criatura
    fila.js             fila de gravação por entidade
    campanha-painel.js  o que cada cartão do painel da mesa mostra (sem fórmula própria)
    sincronia.js        atualização automática da campanha: marcas, ritmo, espera
    combate-turnos.js   ordem, turno e rodada do combate (as mesmas regras do servidor)
    combate-fila.js     fila de alterações de um combate: lote, repetição, conflito
    ordem/              as regras de Ordem Paranormal, em camada própria
      catalogo.js       origens, classes, trilhas, perícias e patentes
      poderes.js        poderes de classe, gerais, paranormais e de trilha
      progressao.js     vagas de escolha, requisitos, pendências e efeitos
      inventario.js     espaços, quantidade, categoria e dados de item
      personalizacao.js versões personalizadas e exclusão de habilidades oficiais
      biblioteca.js     o catálogo de poderes arrumado para "Da biblioteca"
      itens-dados.js    o catálogo de itens dos dois livros (carregado sob demanda)
      itens.js          busca, filtros e a cópia de uma entrada para a ficha
      rituais-dados.js  o catálogo de rituais dos dois livros (sob demanda)
      rituais.js        busca, filtros, a cópia para a ficha e os avisos dela
      regras.js         os cálculos, com a composição de cada número
      opcionais.js      as regras opcionais, uma chave para cada
      condicoes.js      morrendo, enlouquecendo e contadores da mesa, por início de turno
    historico.js        rolagem → histórico da campanha, num funil só
    paginas/            um arquivo por tela

  backend/
    Dados.gs            esquema das abas e acesso ao Sheets
    Codigo.gs           núcleo: sessão, personagens, homebrew, perfil
    Campanhas.gs        campanhas, rolagens, documentos, notas, combates
    appsscript.json     manifesto do projeto

  docs/
    DATABASE.md         abas, colunas e o porquê de cada uma
    API.md              todas as ações, entradas e saídas
    CHARACTER_SCHEMA.md o formato da ficha, campo a campo
    PERMISSIONS.md      quem alcança o quê, e onde isso é decidido
    CAMPAIGNS.md        campanhas, combate, histórico e criaturas
    PERFORMANCE.md      o que custa caro, o que foi feito e como medir
    ORDEM-REGRAS.md     matriz de regras de Ordem: fonte, página e lacunas
```

---

## Como rodar localmente

Não há build. Sirva a pasta por HTTP — **debaixo de um subdiretório**, para um
caminho absoluto esquecido quebrar aqui e não na publicação:

```bash
python -m http.server 8099 --directory ..
```

E abra `http://localhost:8099/rama/`.

`file://` também abre, mas o `localStorage` fica instável — prefira HTTP.

### Testes

Há conjuntos de testes no terminal e páginas específicas no navegador.

**Fechamento de janelas** — abra `testes/janelas.html`. Confere a confirmação de
clique fora, a preservação dos campos ao voltar, janelas sobrepostas, foco,
rolagem e o fechamento por uma ação que termina enquanto a pergunta está aberta.
Os testes usam a interface real, sem acessar o backend.

**Modelo e motor de dados** — 2264 verificações. No navegador, abra `testes/`;
no terminal:

```bash
deno run --allow-read testes/executar.js
```

Cobrem expressões de dado válidas e inválidas, dado principal, perícia, dano,
crítico, a ficha padrão, peso do inventário, habilidades e a árvore recursiva,
rituais, versões de ritual com dano, rótulos compartilhados, categorias,
migração de ficha antiga, importação e versionamento. E a camada de Ordem
Paranormal: catálogo, fórmulas conferidas contra exemplos dos livros,
recálculo que não acumula bônus nem restaura recurso gasto, regras opcionais e
a separação entre nível e NEX; o motor de progressão — cada tipo de pendência,
requisitos e repetição, concessão automática sem duplicação, revisão com
dependências, afinidade (inclusive adiada e Homebrew), patente com limites
manuais, carga por quantidade e o ajuste temporário de capacidade. E o Possuído,
que não escolhe poder de ocultista: as vagas só aceitam Transcender, a escolha
antiga não é apagada e a regra opcional NEX & Experiência devolve a vaga.

E o catálogo de itens: as 244 entradas conferidas contra as tabelas dos livros
(categoria, espaços, dano, crítico, alcance, tipo de dano), busca e filtros, a
cópia de cada tipo de item para a ficha com os campos mecânicos preenchidos,
snapshot independente com catálogo congelado, ataque e dano de arma (ágil,
atributo no dano, penalidade de dados, margem dobrada por Predadora, tabela de
1d6), proteção e escudo na Defesa, penalidade da proteção pesada, modificações e
maldições (acréscimo de categoria, não acumulação, incompatibilidade, oposição de
elementos, remoção que devolve o valor-base) e a ficha atravessando salvar,
exportar e importar com tudo isso.

E o aprendizado de rituais (v2.17): os três rituais iniciais do ocultista e o
ritual de cada avanço de NEX, com o círculo conferido na ETAPA que concedeu — uma
concessão de NEX 20% continua só de 1º círculo num personagem de NEX 99%; Saber
Ampliado e o grimório de Graduado, cada um com a quantidade e o círculo que o
livro dá (o grimório com "rituais iguais ao Intelecto", contado no Intelecto
daquela etapa); escolher pela metade e voltar depois; um ritual ocupando uma
concessão só; recalcular, salvar, reabrir, exportar e importar sem conceder de
novo nem duplicar ritual nenhum; trocar trilha, classe ou NEX guardando a escolha
em vez de apagar o ritual; o limite por Intelecto contando só Aprender Ritual; as
duas variantes de SAH p.113; nível e NEX separados mandando cada um no que é seu;
associar um ritual antigo sem criar outra cópia; os rituais que uma trilha concede
pelo nome, conferidos um a um contra o catálogo; e a exceção da mesa, que entra
marcada e com o motivo escrito.

E o aprendizado revisto na v2.18: o contexto de cada aquisição (de onde veio, a
regra, o limite, por que um ritual está ocupado); a gravação como operação única,
que aplica numa cópia, confere e só então troca — nada pela metade, nada em
dobro ao repetir, nenhuma cópia sem aquisição; Transcender → Aprender Ritual em
combatente, especialista e ocultista, com o círculo pelo NEX de exposição da
etapa, o limite por Intelecto, o ritual de outra aquisição recusado, o ritual da
ficha usado sem cópia, o elemento do poder vindo do ritual e o caminho
Versatilidade → Transcender → Aprender Ritual sobrevivendo a salvar e reabrir; a
troca que o poder permite (as duas pontas, a regra de quem sai, o grimório de
fora); o estudo em campo que precisa de confirmação e guarda o degrau; a
concessão da mesa que não resolve pendência; Homebrew e ritual escrito à mão;
fichas antigas e arquivos (a troca pela metade da v2.17, registros exportados e
importados, lista embaralhada sem palpite); e ligar e desligar regras sem apagar
nada. Cada garantia nova foi conferida também por mutação: 26 alterações
propositais no código, todas pegas pelos testes.

E as condições e a organização da v2.19: morrendo e enlouquecendo pela regra de
OPRPG p.88 — três inícios de turno na mesma cena, não consecutivos; curar 1 PV que
encerra a inconsciência e não o morrendo; encerrar que não apaga a contagem e o
retorno que a continua; "+1" com a condição inativa ou no limite recusado; "−1"
que descarta o turno do combate; cena nova que zera a conta e mantém a condição —;
Jogando sem Sanidade com os PD de cada classe, o que soma PE somando PD, gastar
PD sem condição nenhuma, dano mental maior que os PD (enlouquecendo) e abaixo da
metade (perturbado), e PE e SAN guardados sem conversão ao ligar e desligar a
regra; contadores da mesa desligados por padrão, sem prazo inventado, ativados só
por gasto ou dano com origem; os rituais por círculo e por elemento, separados e
juntos, nas duas prioridades, com Homebrew, dados ausentes e um ritual com dois
elementos aparecendo uma vez só; as perícias pelo total, com negativos e empates;
a ordem personalizada que sobrevive à troca de modo; mover com filtro sem
embaralhar os ocultos; pastas sem ciclo e sem passar da profundidade; notas
mudando de pasta sem duplicar na conciliação; reordenar aqui sem atropelar o PV
ou a nota editados lá; e exportar e importar levando condições e o lugar das
habilidades das regras.

E o catálogo de rituais: os 98 rituais conferidos contra os dois livros (elemento,
círculo, execução, alcance, alvo/área/efeito, duração, resistência, página e o
custo de cada versão), busca e filtros combinados, a cópia que vira ritual de ficha
com campos e versões preenchidos, custo adicional que nunca vira custo total duas
vezes, cura que não é tratada como dano, ritual sem dado que não ganha expressão
nenhuma, avisos da ficha (círculo, limite de PE, afinidade, Sanidade do Medo) que
avisam sem bloquear, adicionar que não resolve pendência de progressão, a migração
do texto de "Efeito" para "Descrição" numa ficha antiga e a ficha atravessando
salvar, exportar e importar.

**Permissões, concorrência e armazenamento do backend** — 1075 verificações:

```bash
deno run --allow-read testes/executar-backend.js
```

Carregam os três arquivos do Apps Script num simulador da plataforma
(`testes/apps-script-simulado.js`) e entram por `doPost`, como uma requisição de
verdade. É onde se confirma que um usuário não alcança o que não é dele —
inclusive mandando o pedido direto, sem passar pela interface. Cobrem também
revisão conflitante, gravação repetida, cache ausente, revogação de sessão,
contenção da trava e planilha com as colunas fora de ordem — e, da campanha, a
capa, o que cada jogador recebe nos cartões e no combate (com e sem "Esconder
status dos jogadores"), o resumo de recursos, as marcas da atualização automática,
as operações em lote do combate (repetição pelo `opId`, conflito, lote atômico) e
as regras de turno e rodada, rodadas também contra a cópia do navegador em 400
combates sorteados. E a listagem das bibliotecas da ficha: só o que a conta
alcança, sem o privado de outra conta, sem habilidade nem criatura entre os itens
— inclusive a habilidade antiga gravada com a coluna `item` — e o tipo `ritual`
com o mesmo tratamento.

E a ficha em blocos (v2.15), com um simulador que faz o que o Google faz — célula
acima de 50 000 caracteres recusada, texto que vira fórmula ou número, meio emoji
que vira "�", grade de linhas que estoura: fichas de 44 mil a 1 milhão de
caracteres salvas, reabertas e comparadas caractere por caractere; os limites
exatos entre blocos, com emoji partido na borda; acentos, aspas, barras, quebras
de linha, `=SOMA()`, blocos só de dígitos; ficha antiga lida e migrada na gravação,
setup que não converte nada e roda duas vezes; doze gravações que não acumulam;
falha ao gravar os blocos, na conferência, na publicação e no envio final (flush)
deixando a versão anterior inteira; resposta perdida que não aplica duas vezes
(salvar, criar, duplicar, ajustar); bloco ausente, duplicado, corrompido ou sem
marcador virando erro — nunca ficha vazia —, com diagnóstico e restauração da
geração anterior; leitura concorrente com uma gravação que desloca as linhas;
ajuste rápido do mestre, vínculo, cartões, combate, duplicação, importação,
exportação e exclusão numa ficha grande; limpeza de órfãos; o cache de cabeçalhos
que não passa de uma versão para outra; e outra conta sem alcançar nada disso.

E o que a v2.16 mudou para ser mais barato, cada garantia com o seu caso: o painel
da mesa que não remonta ficha nenhuma nem lê um bloco (conferido pelo contador do
próprio backend) e devolve o cartão idêntico ao que a ficha daria; a projeção
recusada quando é de outra gravação, de outra versão do formato ou grande demais;
toda gravação que mexe no painel mantendo-a em dia — salvar, ajuste rápido, resumo
de recursos, entrar e sair da mesa, duplicar, restaurar; listar que nunca grava
para consertá-la; o localizador de blocos que não deixa uma pista velha gravar por
cima dos blocos de outra ficha; a gravação que não desloca os blocos de ninguém,
nem quando a ficha encolhe; o histórico por cursor sem repetir nem pular, com
rolagem nova no topo, com id fora da ordem das linhas, com as linhas deslocadas
por uma limpeza de outra campanha e com o id do cursor apagado; as imagens em lote
com a regra de quem pode ver; o diretório de contas que não guarda segredo e
esquece o nome trocado na hora; e o diagnóstico que fica de fora da resposta quando
está desligado.

E a contagem de turnos da v2.19, pelo `doPost` do combate: o início do turno do
personagem contado uma vez, e o de outro participante nunca; turnos não
consecutivos na mesma cena; o lote repetido, a outra aba do mestre com revisão
velha e a jogadora tentando passar o turno sem contar nada; voltar turno tirando
só o início desfeito, sem desfazer o que a jogadora fez depois e sem contar de
novo quem recebe a vez; o turno descartado à mão que não volta; o limite; a
integração desligada; a ficha antiga sem condições, a ficha fora da campanha e a
ficha ilegível (o turno anda e o mestre é avisado); encerrar o combate sem zerar a
cena, e outro combate na mesma cena continuando a conta; as condições alheias
seguindo "Esconder status dos jogadores" nos cartões e no combate, sem eventos; e
o PD no resumo, no painel e no ajuste rápido. As regras de contagem do servidor e
as do navegador rodam os mesmos 300 casos sorteados e dão o mesmo resultado.

**Transporte do frontend e carga das páginas** — 228 verificações:

```bash
deno run --allow-read testes/executar-frontend.js
```

O site e o Apps Script são publicados separadamente e podem estar em versões
diferentes. Estes testes trancam as duas regras que valem nesse intervalo: o
lote é otimização e não requisito, e o portão de login só aparece quando o
problema é mesmo a sessão.

Também leem a lista de scripts do HTML de cada página que calcula ficha de
Ordem e conferem que o motor está inteiro (`js/ordem/poderes.js` antes de
`progressao.js` e `regras.js`) — e que o cartão da campanha calcula os mesmos
números que a ficha. Sem os poderes, o cálculo volta ao valor base em silêncio.

E, com relógio e servidor falsos: o anúncio de toda operação (barra de atividade,
segundo plano), a fila do combate (espera de ~5 s, um lote no ar por vez, edição
durante o envio, repetição com o mesmo `opId` depois de prazo, conflito
independente reaplicado, conflito no mesmo campo decidido pela pessoa, resposta
velha que não apaga valor novo) e a sincronização (ritmo, pausa com a página
escondida, espera crescente, perda de acesso). E o catálogo de itens carregado sob
demanda: um script só, falha que rejeita e não fica guardada, nova tentativa que
carrega, e nenhuma página levando o catálogo junto.

E as imagens sob demanda (v2.16): três cartões que pedem numa viagem só, o que já
chegou não sendo pedido de novo nem depois de trocar de página, versão nova sendo
buscada, personagem sem foto que não vira pedido repetido, falha que não fica
guardada e trinta cartões virando duas viagens em vez de trinta. E a medição da
viagem: o tempo do servidor separado do tempo de rede, e a viagem continuando
medida quando o servidor não manda números.

**Tema claro e escuro** — 52 verificações:

```bash
deno run --allow-read testes/executar-tema.js
```

Preferência → tema efetivo (com e sem `prefers-color-scheme`), o aparelho trocando
de tema com o site aberto, o cache por conta, a troca de conta sem herdar o tema,
a sessão trazendo o tema salvo em outro aparelho, a falha de rede sem falso
"salvo", alternâncias rápidas (um pedido por vez, só o último valor, resposta
velha sem passar por cima) e outra aba da mesma conta. O lado do servidor —
remendo sem apagar as outras preferências, valores recusados, conta tirada da
sessão — está na suíte do backend (`testes/tema-backend.js`).

**Pastas e sistemas na página Personagens** — 35 verificações:

```bash
deno run --allow-read testes/executar-pastas.js
```

O registro de sistemas (`js/sistemas.js`: conhecidos, ficha antiga sem
`tipoFicha` tratada como universal, identificador desconhecido preservado) e a
conta da listagem (`js/personagens-organizacao.js`): Todos, Sem pasta e uma pasta;
busca e sistema dentro da seleção; agrupar por sistema; os estados vazios; e nada
mudando de pasta por filtrar ou agrupar. O lado do servidor — criar (sem duplicar
na repetição), renomear sem quebrar vínculos, mover e retirar, excluir pasta sem
excluir personagem, duplicar na mesma pasta, salvar a ficha sem trazer a pasta
antiga de volta, conta contra conta (inclusive mestre de mesa), fichas anteriores
ao índice e a listagem sem abrir fichas — está em `testes/pastas-backend.js`.

E a gravação da ficha em blocos do lado do navegador: a resposta que se perde faz
o salvador repetir o MESMO pedido (mesma ficha, revisão e id de operação), a edição
feita no meio-tempo sobe no pedido seguinte, "Salvo" só depois da confirmação, erro
que repetir não resolve (ficha acima do limite, ficha ilegível) para de insistir
sem perder nada, e a fila do mestre repete o ajuste que falhou antes do clique
seguinte — sem descartá-lo. E as mensagens: nenhuma manda apagar habilidades,
rituais ou anotações.

**As janelas "Da biblioteca" no navegador** — 171 verificações (173 em largura de
celular). Sirva a pasta por HTTP e abra `testes/biblioteca.html`: as janelas de
verdade abrem com uma ficha de teste e o roteiro confere, nas duas bibliotecas, as
origens, busca e filtros, detalhes sob demanda, inclusão de cada tipo (com
quantidade, escolha e sem duplicar por clique duplo), aplicação de modificação pelo
menu do item, versões de ritual com custo adicional e total, adicionar que não
gasta PE nem rola dado, os estados de erro e de biblioteca vazia, o teclado (setas
nas abas, Esc, foco de volta) e o layout na largura da janela — abra num tamanho de
celular para conferir a versão estreita. A Homebrew é simulada nessa página; as
permissões dela são testadas no backend.

E, desde a v2.18, a biblioteca de rituais presa a uma aquisição: a janela de pé
**sem** `css/ficha.css` (como na criação guiada), sem rolagem dentro de rolagem; a
escolha provisória de uma concessão (a conta no rodapé, o estado de cada ritual
com o motivo, detalhes que não selecionam, clique duplo que não alterna duas
vezes, cancelar que descarta, o resumo antes de gravar, confirmar que grava uma
vez só); e Transcender → Aprender Ritual de ponta a ponta — a biblioteca no
contexto do poder, a cópia pendente que só entra ao confirmar, o elemento vindo
do ritual, cancelar sem deixar ritual nem poder, e confirmar sem duplicar.

**Arrastar e soltar no navegador** — 126 verificações (131 em largura de celular,
com toque). Sirva a pasta por HTTP e abra `testes/arrastar.html`: as cinco abas de
verdade — habilidades, rituais, inventário, perícias e anotações — abrem com uma
ficha de Ordem de teste, e o roteiro arrasta com eventos de ponteiro de mouse e de
toque e move pelo teclado. Confere a prévia sem gravação no meio, a gravação uma
vez ao soltar, o destino recusado com o motivo (pasta dentro de si mesma ou de uma
subpasta, ritual trocando de lugar ou de grupo, pasta entre as notas), Esc e o
cancelamento do sistema, a rolagem perto das bordas, o clique depois do arraste
que não abre nada, o limiar que separa toque de arraste, o filtro do inventário
sem mexer nos ocultos, a habilidade das regras numa pasta sem virar Homebrew, os
critérios dos rituais, as perícias pelo total com o foco preservado ao editar, as
notas organizadas fora do modo edição, gravar e reabrir a ficha com a mesma ordem,
a conciliação com o outro aparelho e a ficha universal, que ganha o gesto sem
ganhar regra de Ordem. Com `?parar=1` a página abre sem rodar, para
investigar à mão.

Cada garantia nova da v2.19 foi conferida também por mutação: 55 alterações
propositais nas três suítes do terminal e 6 no gesto de arrastar, pela página do
navegador. Todas as do terminal foram pegas; das do gesto, cinco — a sexta é
equivalente: tirar a guarda de clique da alça não muda nada, porque a alça é um
botão, e um botão dentro do resumo de um cartão não o abre.

**Custo das operações** — não é teste, é medição:

```bash
deno run --allow-read testes/medir.js
```

Ver [docs/PERFORMANCE.md](docs/PERFORMANCE.md) para o que esses números podem e
não podem dizer.

---

## Configurar do zero

### 1. Criar a planilha

Crie uma planilha nova no Google Drive. Copie o id da URL:

```
https://docs.google.com/spreadsheets/d/ISTO_AQUI_E_O_ID/edit
```

Não precisa criar aba nenhuma à mão — o passo 3 faz isso.

### 2. Criar o Apps Script

Em <https://script.google.com>, crie um projeto novo.

São **três arquivos**, e os três precisam existir:

1. cole `backend/Codigo.gs` no editor, substituindo o `Codigo.gs` padrão;
2. crie um arquivo chamado **`Campanhas`** (o botão `+` ao lado de
   Arquivos) e cole `backend/Campanhas.gs` nele;
3. crie um arquivo chamado **`Dados`** e cole `backend/Dados.gs` nele.

> O Apps Script lê todos os `.gs` no mesmo escopo e iça as declarações de
> função entre arquivos, então a ordem em que eles aparecem não importa.
> São três por manutenção — separar arquivos não deixa nada mais rápido.
>
> Faltando o `Dados.gs`, o sistema não tem como ler nada, e toda ação
> responde `instalacao_incompleta` em vez de uma pilha de execução.
> `conferirInstalacao()` diz qual arquivo está faltando.

Em **Configurações do projeto**, marque "Mostrar arquivo de manifesto
appsscript.json" e cole o conteúdo de `backend/appsscript.json`.

Ainda em Configurações do projeto → **Propriedades do script**, adicione:

| Propriedade        | Valor                                            |
|--------------------|--------------------------------------------------|
| `RAMA_PLANILHA_ID` | o id copiado no passo 1                          |
| `RAMA_ITERACOES`   | `10000` (opcional — veja "Senhas" abaixo)        |

O `RAMA_PEPPER` **não** se preenche à mão: o passo 3 gera.

### 3. Preparar o banco

No editor do Apps Script, rode estas funções, nesta ordem, pelo seletor de
função (autorize o acesso quando o Google pedir):

1. **`setupRama()`** — cria as abas e os cabeçalhos.
   Pode rodar quantas vezes quiser: não apaga nada e não sobrescreve aba já
   configurada. Quando uma versão futura acrescentar colunas, é ela que as
   acrescenta.

2. **`gerarPepper()`** — cria o segredo do servidor, **uma única vez**.
   Trocar o pepper depois invalida todas as senhas já cadastradas.

3. **`criarPrimeiroUsuario()`** — abra a função, troque o usuário, o nome e a
   senha pelos seus, salve e rode.
   **Depois apague a senha do editor.**

4. **`conferirInstalacao()`** — diz o que ainda falta, se faltar algo. Também
   confere, aba por aba, se o cabeçalho ainda tem todas as colunas que o
   código procura.

5. **`diagnosticarLogin("usuario")`** — só quando um login certo for recusado.
   Diz se o pepper existe, se a conta foi encontrada e está ativa, se o
   cabeçalho de `USUARIOS` está são e se a derivação da senha roda. Não
   imprime hash, sal nem pepper, e não conta qual foi a senha testada.

### 4. Publicar o app da Web

**Implantar → Nova implantação → Tipo: App da Web**

| Campo            | Valor              |
|------------------|--------------------|
| Executar como    | **Eu**             |
| Quem tem acesso  | **Qualquer pessoa**|

Copie a URL que termina em `/exec`.

> "Qualquer pessoa" libera o **endereço**, não os dados. Sem token válido toda
> ação responde erro. É o que permite um site no GitHub Pages conversar com o
> script sem exigir login do Google de cada pessoa.

### 5. Apontar o frontend

Em `js/config.js`:

```js
window.RAMA_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfy.../exec",
  ...
};
```

É o único arquivo do frontend que muda. Nunca coloque aqui senha, hash, sal, id
de planilha ou qualquer segredo — este arquivo é público.

### 6. Testar a conexão

Abra o site, entre, vá em **Perfil → Testar conexão**. Ele mostra o tempo de
resposta e o nome da planilha.

---

## Publicar no GitHub Pages

1. Suba os arquivos para o repositório.
2. **Settings → Pages → Source: Deploy from a branch**, branch `main`, pasta `/`.
3. O site sai em `https://SEU-USUARIO.github.io/rama/`.

Todos os caminhos do projeto são relativos e a raiz é descoberta a partir do
próprio `<script src>`, então funciona debaixo de subpasta sem ajuste.

**A pasta `backend/` vai junto, e isso é intencional**: o `Codigo.gs` não contém
segredo nenhum — ele os lê das Script Properties. Publicá-lo não expõe nada.

### Atualizar o backend

**v2.24.1 — PULSO:** GIFs mantêm a animação em todos os seletores de imagem:
personagens, criaturas, aliados, avatar, documentos e capa da campanha. Publique
o site e atualize `Campanhas.gs` na implantação do Apps Script para aceitar capas
GIF. Sem novas abas/colunas ou mudança do schema 14.

O GIF é guardado integralmente: até **29.982 bytes** (aprox. 29 KB), para caber nos
40.000 caracteres do processamento atual. GIFs maiores são recusados com aviso,
sem substituir a imagem anterior. Não há compressão animada automática. Fotos
estáticas mantêm compressão/recorte; GIFs conservam dimensões e animação originais
e são enquadrados pela exibição. Capas GIF usam centro da imagem, sem editor de
recorte, e aceitam até 4096 px em cada dimensão.

Teste em `testes/imagens.html` ou com
`node testes/imagens-interface.mjs /caminho/do/pacote/playwright` (opcionalmente
`RAMA_CHROME` indicando um Chrome instalado). A suíte do backend também verifica
os bytes dos GIFs após gravar/ler todos os tipos de imagem e as permissões.

**v2.24.0 — CONFLUÊNCIA:** módulos configuráveis na universal, novas universais
sem perícias, nome de Ordem editável e Aliados nos dois modelos. Schema 14:
fichas antigas mantêm os módulos habilitados e todos os dados existentes.

Publique os arquivos do site e atualize **`backend/Campanhas.gs`** no Apps Script,
criando uma nova versão da implantação existente, para o combate consultar nomes
atuais. Sem novas abas/colunas; não é necessário rodar `setupRama()` se a instalação
já estava na v2.23. Não foi feita publicação automática.

Aliados usam o modelo/editor de criaturas, imagens comprimidas e blocos da ficha,
com revisão e conciliação. Cópias são independentes; o original privado alheio
continua bloqueado no servidor. Não há entrada automática no combate. O limite
existente de 1.000.000 de caracteres por ficha inclui aliados/imagens; erros não truncam dados.

As suítes existentes incluem os casos novos. Teste de interface com Playwright:

```sh
node testes/aliados-interface.mjs /caminho/do/pacote/playwright
```

`RAMA_CHROME` pode indicar um executável instalado. O teste intercepta a API e
usa dados fictícios, sem acessar o Apps Script real. Exercita os dois modelos
em 1280 e 390 px. O simulador cobre autorização, revisão, imagens maiores que uma
célula e nomes no combate. Esses testes não substituem conferir a implantação Google.

Verificação local desta entrega (01/10/2026, v2.26): **2.275** verificações de
modelos, **1.075** do backend simulado, **228** de transporte/fila, **52** do tema e
**35** das pastas, no Deno; no navegador, com o servidor simulado e dados fictícios,
`testes/` (2.275), bibliotecas (171), arrastar (126), janelas (21) e imagens (19),
todas passando. A página Personagens foi exercitada em 1024 e 375 px, nos dois
temas: criar, renomear e excluir pasta, mover por arraste e pela lista, retirar,
duplicar, combinar pasta, busca, sistema e agrupamento, recarregar, outra conta,
falha de rede e operação lenta. Nenhuma planilha real foi alterada; isso não
substitui conferir a implantação Google.

Cole a versão nova no editor do Apps Script e faça **Implantar → Gerenciar
implantações → editar (lápis) → Versão: Nova versão**. Editar a implantação
existente mantém a mesma URL; criar uma implantação nova gera outra URL e
exigiria mexer no `config.js`.

Se a atualização acrescentar abas ou colunas, rode `setupRama()` de novo. Ele
cria só o que falta e nunca apaga o que existe.

**Atualizando para a v2.15 (a ficha em blocos)**, nesta ordem:

1. cole os três `.gs` novos no editor do Apps Script;
2. rode **`setupRama()`** — cria a aba `PERSONAGENS_BLOCOS`, a coluna
   `armazenamento` no fim de `PERSONAGENS` e o formato texto do conteúdo dos
   blocos. Não converte ficha nenhuma: cada ficha passa para blocos sozinha, na
   próxima gravação. O relatório diz quantas já estão em blocos;
3. rode `conferirInstalacao()` — tem de terminar sem pendências;
4. **Implantar → Gerenciar implantações → editar → Versão: Nova versão**;
5. publique o site.

**Atualizando para a v2.16 (o painel sem abrir ficha)**, na mesma ordem: cole os
três `.gs`, rode **`setupRama()`** (que acrescenta a coluna `resumo` em
`PERSONAGENS`), rode `conferirInstalacao()`, crie a **Nova versão** da implantação
e publique o site. Nenhuma ficha é convertida: cada uma ganha a projeção do painel
na próxima gravação, e até lá o painel a remonta como fazia antes. Para resolver em
lote, sem esperar, rode `reconstruirResumos()` quantas vezes ele pedir — ele
trabalha em lotes de 25 e diz quantas faltam.

O site e o servidor desta versão mudam juntos duas respostas: as listagens passam a
mandar a VERSÃO da foto e do avatar em vez da imagem, e o histórico pagina por
cursor. Um site antigo contra o servidor novo mostra as iniciais no lugar das fotos
e um "Carregar mais" que repete a primeira página; um site novo contra o servidor
antigo mostra as fotos normalmente (ele as manda embutidas) e pagina como antes.
Publicar os dois na mesma janela evita as duas coisas.

**Atualizando para a v2.17 (o aprendizado de rituais): só o site.** Esta versão
não toca no backend — nenhum `.gs` mudou, não há `setupRama()` a rodar e não há
implantação nova a criar. O que ela acrescenta mora na ficha, dentro de
`ordem.escolhas`, e o servidor guarda isso como já guardava o resto. Um site
antigo abrindo uma ficha da v2.17 mostra os rituais e ignora os vínculos, sem
apagá-los; nenhuma ficha é convertida e o `schemaVersion` não muda.

**Atualizando para a v2.18 (o seletor de rituais e as aquisições): só o site.**
Nenhum `.gs` mudou, não há `setupRama()` a rodar nem implantação nova a criar. O
`schemaVersion` sobe de 8 para 9 **sem converter nada**: uma ficha 8 abre igual, e
passa a 9 na próxima gravação. A subida existe porque a v2.18 guarda um campo novo
no bloco de Ordem (`registrosDeRitual`) e uma troca de Aprender Ritual mais funda do
que a v2.17 lia — uma aba ainda aberta na versão anterior descartaria os dois ao
gravar. Com o schema 9, essa aba recusa a ficha e pede para recarregar; nada se
perde. Depois de publicar, peça a quem estiver com a ficha aberta para recarregar
a página.

**Atualizando para a v2.26 (pastas e sistemas em Personagens): backend, planilha e
site.** Mudaram `Dados.gs` (duas abas novas) e `Codigo.gs` (as ações `criar_pasta`,
`renomear_pasta`, `excluir_pasta`, `mover_personagem` e o sistema e a pasta na
listagem). Cole os três `.gs` no editor, **rode `setupRama()`** — ele cria as abas
`PASTAS` e `PERSONAGENS_ORGANIZACAO` sem tocar nas outras —, faça **Implantar →
Gerenciar implantações → editar (lápis) → Versão: Nova versão** e publique o site.
Nenhuma ficha é convertida: todas começam em "Sem pasta", e o sistema de cada uma é
lido uma vez e anotado no índice na primeira listagem da conta (até 25 por
listagem). Para fazer isso de uma vez, rode `indexarPersonagens()` no editor
(opcional, repetível). Com o site novo e o backend antigo, a lista aparece completa,
sem pastas, com um aviso; sem o `setupRama()`, a lista mostra os sistemas e avisa
que as pastas dependem da planilha.

**Atualizando para a v2.25 (tema claro e escuro): backend e site.** Mudou
`Codigo.gs`: o login e a `sessao` passam a devolver `agente.preferencias.tema`, e o
`salvar_perfil` grava preferências por remendo, com validação. **Sem aba nem coluna
nova** — o tema mora em `PERFIS.preferenciasJson`, que já existia, e **não é preciso
rodar `setupRama()`**. Cole os três `.gs` no editor, faça **Implantar → Gerenciar
implantações → editar (lápis) → Versão: Nova versão** (a URL continua a mesma) e
publique o site. Com o site novo e o backend antigo, o tema segue o aparelho e a
escolha no Perfil avisa que não foi salva na conta — nada se perde.

**Atualizando para a v2.23 (origens do Sobrevivendo ao Horror): só o site.** O
backend não mudou. Publique o site e peça a quem estiver com uma ficha aberta para
recarregar (o schema subiu para 13).

**Atualizando para a v2.21 (Mundano e Sobrevivente): backend e site.** Mudou
`Campanhas.gs`: o resumo que os colegas recebem traz o estágio do Sobrevivente.
Sem aba nem coluna nova — **não é preciso rodar `setupRama()`**. Cole os três
`.gs`, crie uma **nova versão** da implantação, publique o site e peça a quem
estiver com uma ficha aberta para recarregar (o schema subiu para 12).

**Atualizando para a v2.20 (efeitos, munição e componentes): backend e site.**
Mudou `Campanhas.gs`: as ações `efeito_personagem` (aplicar, renovar e encerrar
condições e efeitos, com a permissão conferida no servidor) e `ler_imagem_do_turno`,
a contagem da duração dos efeitos pelos turnos do combate e a opção de vida das
criaturas. Não há aba nem coluna nova — **não é preciso rodar `setupRama()`**. Cole os
três `.gs`, crie uma **nova versão** da implantação, publique o site e peça a quem
estiver com uma ficha aberta para recarregar (o schema subiu para 11; uma aba antiga
recusa a ficha em vez de descartar os campos novos).

**Atualizando para a v2.19 (condições e organização): backend e site.** Mudaram
`Codigo.gs` e `Campanhas.gs`: o lote do combate passa a contar o início de turno
nas fichas, o resumo de recursos aceita PD e o ajuste rápido também. Não há aba nem
coluna nova, então **não é preciso rodar `setupRama()`**:

1. cole os três `.gs` (sempre juntos) no editor do Apps Script;
2. **Implantar → Gerenciar implantações → editar → Versão: Nova versão**;
3. publique o site;
4. peça a quem estiver com uma ficha aberta para recarregar a página.

O `schemaVersion` sobe de 9 para 10 **sem converter nada** (o bloco de Ordem ganhou
`condicoes`, `recursos.pd` e preferências novas de organização): uma ficha 9 abre
igual e passa a 10 na próxima gravação, e uma aba ainda na v2.18 recusa a ficha em
vez de descartar os campos novos. Um site antigo diante do servidor novo continua
funcionando — só não manda condição nenhuma para contar. O site novo diante do
servidor antigo grava as fichas, mas o combate não conta turnos, o resumo com PD
não é aceito (o painel fica com o anterior) e o ajuste rápido de PD é recusado —
por isso o servidor vai primeiro.

Sem o passo 2 da v2.15, as fichas antigas continuam abrindo, mas nenhuma ficha salva
(`instalacao_incompleta`) — nada é gravado pela metade. **Não volte a implantação
para uma versão anterior à v2.15** sem necessidade: a versão antiga não sabe abrir
as fichas que já estão em blocos (o site mostra que o servidor precisa ser
atualizado). O manifesto e os blocos sobrevivem à volta, e reimplantar a v2.15
devolve tudo — ver "Voltar a uma versão anterior do backend" em
[docs/DATABASE.md](docs/DATABASE.md). Para diagnosticar ou recuperar uma ficha:
`diagnosticarPersonagem(id)`, `restaurarGeracaoAnterior(id)`,
`reconstruirResumos()` e `limparBlocosOrfaos()`, no editor. Para medir o que está
custando caro numa implantação de verdade, `ligarDiagnostico()` e
`desligarDiagnostico()` — ver [docs/PERFORMANCE.md](docs/PERFORMANCE.md).

Troque sempre **os três `.gs` juntos** (`Dados.gs`, `Codigo.gs`, `Campanhas.gs`):
eles se chamam entre si, e um arquivo de uma versão com os outros de outra pode
responder `instalacao_incompleta` ou pior. Publique o site **depois** da nova
versão do Apps Script: um site novo diante de um backend velho perde as ações que
ainda não existem lá.

---

## Senhas

Ficam **só** no Apps Script, e nunca em texto:

- derivadas com PBKDF2-HMAC-SHA256, sal por usuário e um *pepper* do servidor;
- o pepper vive nas Script Properties, **fora da planilha** — quem conseguir uma
  cópia do arquivo ainda não consegue testar senhas;
- a comparação é de tempo constante;
- oito tentativas erradas bloqueiam o usuário por 15 minutos.

`RAMA_ITERACOES` controla o custo. Rode **`medirDerivacao()`** para ver quanto
tempo o seu projeto leva; algo entre 300 ms e 1,5 s é um bom alvo. Menos protege
pouco, mais irrita quem entra.

Para trocar uma senha: `trocarSenha('usuario', 'nova-senha')` no editor — ela
encerra as sessões daquele usuário junto. Apague a senha do editor depois.

Para acrescentar alguém: `criarUsuario('login', 'Nome', 'senha')`.

---

## Fontes

A identidade usa a família **PixelMplus**, que tem licença própria e **não
acompanha este repositório**. Sem ela o sistema cai na monoespaçada do sistema
operacional e continua inteiro — só muda a letra.

Para instalar, veja `assets/fonts/LEIA-ME.md`.

---

## Como o sistema se comporta

**Janelas.** Clicar no fundo, fora de uma janela, abre a confirmação "Fechar
janela?". "Voltar à janela" preserva o preenchimento; "Fechar janela" confirma o
fechamento e descarta o que ainda não foi salvo. A confirmação não fecha ao clicar
fora dela. Janelas que já exigem uma decisão continuam ignorando cliques no fundo.
Os botões de fechar/cancelar, a tecla Esc e o fechamento após salvar mantêm o
comportamento anterior. A proteção é compartilhada pelos formulários do site.

**Pastas e sistemas (Personagens).** Cada conta organiza os seus personagens em
pastas próprias — uma ficha em no máximo uma pasta, e uma pasta pode misturar
sistemas. "Todos os personagens" mostra tudo, "Sem pasta" só o que não está
organizado, e abrir uma pasta restringe a lista a ela. Busca e filtro de sistema
atuam sobre o que está aberto; "Agrupar por sistema" só arruma o resultado em
grupos. Para mover: arraste o cartão pela alça (⠿) até uma pasta, ou toque na
alça / use "Mover para pasta…" no menu (teclado e celular). O cartão fica
"Movendo…" até o servidor confirmar. Excluir a pasta manda os personagens dela
para "Sem pasta", com confirmação; excluir personagem continua sendo outra ação.
A pasta aberta, o filtro e o agrupamento ficam no endereço da página.

**Tema.** O padrão segue o tema do aparelho (`prefers-color-scheme`) e acompanha a
troca com o site aberto; aparelho que não informa fica no claro. Em **Perfil →
Exibição → Tema** dá para escolher Sistema, Claro ou Escuro: a tela troca na hora,
sem recarregar nem perder o que estiver sendo editado, e a escolha vai para a
conta (vale em qualquer aparelho). A linha embaixo diz "Salvando…", "Salvo na
conta" ou que não foi possível salvar, com "Tentar de novo". Sem conta — no login,
por exemplo — vale o do aparelho; trocar de conta nunca herda o tema da anterior.
`js/tema.js` roda no `<head>`, antes do CSS, para a página não piscar no tema
errado. As duas paletas moram em `css/tokens.css`; fotos, capas, criaturas e cores
escolhidas por quem joga não são invertidas nem reescritas.

**Salvamento.** A tela muda na hora; o envio vai atrás, juntando alterações
seguidas num só POST (400 ms). Só uma gravação voa por vez — o que chegar
durante o voo entra na fila. O indicador diz sempre onde as coisas estão:
`Salvo`, `Salvando…`, `Alterações pendentes`, `Sem conexão`, `Erro ao salvar`,
`Conflito`.

**Conflito.** Cada registro tem uma revisão. Se ela mudou no servidor, a
gravação é recusada e o estado atual volta junto. O sistema compara três
versões — a última confirmada, a desta tela e a do servidor — e junta sozinho
tudo o que não se cruzou. Só o que os dois lados mudaram vira pergunta, com os
dois valores lado a lado. **Nada do que foi digitado desaparece.**

**Rede.** Leitura pode ser repetida (com espera crescente); gravação não, para
não duplicar registro. "Sem internet" e "o servidor recusou" são mensagens
diferentes, porque são problemas diferentes.

**Permissão.** O servidor confere o dono em **toda** leitura e **toda**
gravação. O `ownerId` nunca vem do pedido: é derivado da sessão. Trocar o id no
console não abre o registro de outra conta.

---

## Limitações conhecidas

- **O histórico de rolagens é lido inteiro do lado do servidor** antes de ser
  paginado. Para uma mesa isso é irrelevante; para dezenas de milhares de
  linhas, o mestre precisará limpar o histórico de vez em quando.
- **Um mestre só por campanha na interface.** O banco já guarda o papel por
  membro e aceita mais de um mestre, mas a tela não oferece promover ninguém.
- **Combate tem turno e rodada, e as condições contadas por turno.** Morrendo,
  enlouquecendo e a duração dos efeitos aplicados contam pelos turnos (v2.19,
  v2.20); não há grid, distância nem ações por turno.
- **Quando o jogador aplica um efeito pela própria ficha (v2.20)**, o momento da
  aplicação é o relógio do aparelho dele — é o que decide se o fim do turno em
  andamento conta. Pelo painel do mestre, o momento é o do servidor.
- **Duas recargas simultâneas da mesma arma em dois aparelhos (v2.20)** somam as
  duas: a carregada pode passar da capacidade até alguém ajustar. Disparos e
  gastos simultâneos somam corretamente.
- **Efeitos com teste ou decisão da mesa não rolam sozinhos (v2.20).** Sangrando,
  Em Chamas, Confuso e afins mostram a ação e o botão para rolar; quem joga
  decide. Efeitos de rituais estruturados são cinco (ver docs/ORDEM-REGRAS.md);
  os outros entram como efeito da mesa, com os modificadores escritos à mão.
- **A atualização automática não é tempo real.** O navegador pergunta a cada ~8 s
  nas abas Personagens e Combate e a cada ~20 s nas outras: a mudança de outra
  pessoa chega em 2 a 15 s (até ~25 s fora das abas de mesa), mais quando o Apps
  Script está acordando. Cada pergunta é uma execução do Apps Script.
- **Alterações pendentes do combate vivem na memória da aba.** Uma falha de rede
  não as perde, mas fechar a aba antes de elas subirem perde — por isso o
  navegador pede confirmação.
- **O máximo de PV, PE e SAN que os outros jogadores veem é calculado no navegador
  do dono ou do mestre**, porque o motor de regras não roda no Apps Script. Uma
  ficha importada, ou não salva desde a v2.12, aparece sem números para os outros
  até o dono ou o mestre abrir a aba Personagens ou salvar a ficha.
- **O painel lateral do combate carrega a página da ficha** dentro da aba (mesma
  origem). É a ficha de verdade, com o mesmo salvamento — e o mesmo tempo de
  abertura de uma ficha.
- **Uma ficha tem limite total de 1 milhão de caracteres de JSON** (v2.15; antes,
  45 000, o de uma célula). É um limite de operação, não do Google: cada salvamento
  automático envia e regrava a ficha inteira, e numa ficha enorme isso segura a
  trava do sistema por segundos. Acima dele o servidor recusa com
  `ficha_grande_demais`, dizendo o tamanho e o limite; nada se perde na tela, e o
  site oferece exportar. O número fica em `LIMITE_TOTAL_FICHA`, em
  `backend/Dados.gs`.
- **Os campos da ficha continuam com limite próprio**, que não é do armazenamento:
  uma anotação tem até 20 000 caracteres, a descrição de um ritual até 8 000, a de
  um item até 2 000 (`js/ficha.js`). A ficha cresce com mais anotações, rituais e
  habilidades. Um valor maior do que isso que chegue por fora da tela — um arquivo
  importado editado à mão — é cortado ao abrir, e espaços e quebras de linha nas
  pontas de um texto são aparados. O servidor guarda e devolve exatamente o que
  recebeu; quem corta é a normalização da ficha no navegador (`U.aparar`).
- **Salvar e abrir uma ficha custam mais chamadas à planilha do que na v2.14**
  (salvar: 13 → 17; abrir: 5 → 7, contados no simulador) — o preço de conferir
  cada gravação e cada leitura. A v2.16 devolveu parte disso com o localizador de
  blocos. Ver [docs/PERFORMANCE.md](docs/PERFORMANCE.md).
- **As imagens passaram a ter custo próprio (v2.16)**: elas saíram das listagens e
  são pedidas em lote, só quando faltam. Quem abre a mesa pela primeira vez num
  aparelho baixa as fotos uma vez; depois disso, não baixa mais enquanto elas não
  mudarem. O armazenamento do navegador é por aparelho e pode ser descartado por
  ele a qualquer momento — o efeito é baixar de novo, nunca perder dado.
- **O histórico cobra uma coluna por página (v2.16)**: achar as rolagens de uma
  campanha custa ler a coluna `campanhaId` da aba inteira (uma chamada). Com
  dezenas de milhares de rolagens isso volta a pesar, e aí a saída continua sendo
  o botão "Limpar" do mestre — ou um índice persistido, que não cabia nesta
  entrega.
- **Outros campos grandes ainda moram numa célula**: o combate (com o snapshot de
  cada criatura), a nota do mestre, o homebrew e as imagens. Todos recusam acima
  do limite em vez de cortar; o combate é o que mais pode crescer. Ver "Os outros
  campos grandes" em [docs/DATABASE.md](docs/DATABASE.md).
- **Fotos estáticas são miniaturas** de 256 px, comprimidas no navegador.
  GIFs preservam o arquivo animado original e precisam ter até 29.982 bytes.
- **Sem histórico de alterações.** Há `criadoEm` e `atualizadoEm`; o schema está
  preparado para auditoria, mas ela não foi construída.
- **O freio de tentativas usa CacheService**, que é volátil. Ele cumpre a janela
  de 15 minutos, mas não sobrevive a uma reinicialização do projeto.
- **Histórico de rolagens vive só na aba** e não sobe para a planilha.
- **A biblioteca Homebrew não versiona.** Editar um modelo não muda as fichas
  que já o usam — isso é de propósito —, mas também não há como ver o que mudou.
- **O catálogo de itens preenche campos, não interpreta efeitos.** Dano, crítico,
  categoria, espaços, Defesa e as modificações entram nas contas; efeitos com
  custo em PE, ação, condição ou escolha ficam no texto do item, para a mesa
  aplicar. A ficha não desconta munição, não liga munição a arma (Dum dum e
  Explosiva ficam no pacote) e não aplica sozinha a penalidade por falta de
  proficiência — ela avisa. O que é automático e o que é manual está entrada por
  entrada em [docs/ORDEM-REGRAS.md](docs/ORDEM-REGRAS.md).
- **O catálogo de rituais também não conjura.** Adicionar preenche campos e
  versões e rola o que a versão tem (dano, cura, outros dados), com o custo em PE
  escrito — mas a ficha não gasta PE, não faz teste de resistência, não aplica
  condição e não desconta Sanidade. Registrar um ritual não resolve pendência de
  progressão: aprender continua sendo a escolha na aba Progressão.
- **O aprendizado de rituais é do ocultista (v2.17).** Quem concede rituais por
  progressão é a classe Ocultista e as trilhas dela — mais os rituais que algumas
  trilhas dão pelo nome, em qualquer classe. Outras classes só aprendem pelo poder
  paranormal Aprender Ritual, que é o único aprendizado que conta no limite por
  Intelecto.
- **As regras de aprendizado são conferidas no navegador (v2.18).** A tela, a
  gravação e toda leitura usam a mesma função; o Apps Script continua conferindo
  sessão, dono, revisão e tamanho, e guarda a ficha sem conhecer regra de Ordem.
  Uma aquisição inválida que chegue por fora da tela (arquivo editado à mão) não é
  recusada pelo servidor — ela aparece na Progressão com o motivo e não conta como
  aprendida.
- **O estudo em campo é registrado, não jogado.** Com a regra B de SAH p.113, a
  ficha mostra a DT e pede a confirmação da mesa, mas não rola o teste de
  Ocultismo nem gasta a ação de interlúdio.
- **Graduado não muda com os limites de SAH p.113.** As duas regras falam do
  ritual de Escolhido pelo Outro Lado; Saber Ampliado e o grimório seguem o texto
  da trilha. É leitura registrada em `docs/ORDEM-REGRAS.md` (lacuna 25).
- **Evolução por Patentes não muda as concessões de ritual.** A tabela do
  ocultista por patente (Sobrevivendo ao Horror, p. 112) dá dois rituais por
  patente, e essa regra opcional ainda não tem o trilho de progressão estruturado:
  com ela ligada, as concessões continuam seguindo os degraus de NEX ou de nível.
  Ver `docs/ORDEM-REGRAS.md`.
- **Aprender um ritual não mexe no NEX.** Com NEX & Experiência, o livro soma o
  círculo do ritual ao NEX de exposição (SAH p. 99). O R.A.M.A. avisa e deixa o
  ajuste com a mesa: subir um campo da ficha a cada leitura faria recalcular
  conceder progressão.
- **As condições não rolam testes (v2.19).** Medicina contra morrendo e
  Diplomacia contra enlouquecendo são rolados por quem joga; a ficha encerra a
  condição quando alguém aperta Encerrar. No limite, ela mostra o resultado da
  regra — e não apaga a ficha nem transfere nada. Loucura Não Letal (OPRPG p.175)
  é citada, não aplicada; machucado e lesões não são marcados.
- **Fora do combate, a contagem é à mão (v2.19).** Só o combate da campanha tem
  identidade de turno. Se mestre e jogador apertarem "+1 início de turno" pelo
  mesmo turno, a ficha registra os dois — o "−1" corrige. O servidor não confere
  regra de condição: ele conta o turno do combate e guarda o que a ficha manda.
- **Jogando sem Sanidade é parcial (v2.19).** PD substituem PE e SAN nas contas,
  nos custos e nas condições; a redução dos dados de dano mental das criaturas,
  as visões de Medo, O Custo do Paranormal em PD e as ações de interlúdio ficam
  com a mesa. O Mundano não tem tabela de PD no livro: a ficha fica com base 0 e
  diz por quê (v2.21).
- **Mundano e Sobrevivente (v2.21).** O Empenho é oferecido no resultado do teste
  (depois do dado); o trauma de Cicatrizado é um lembrete, e a mesa decide quando ele
  vale; a combinação com NEX & Experiência e com Jogando sem Sanidade depois da
  transição segue leituras documentadas em docs/ORDEM-REGRAS.md, porque o livro não
  a trata. A lista de personagens mostra a classe, sem o estágio.
- **Na ficha universal, arrastar vale para habilidades, rituais e anotações
  (v2.19).** O inventário dela continua com as armas primeiro, e as perícias não
  ganharam ordem nova: a ordem por bônus é da ficha de Ordem, que é a que tem o
  total calculado. A página de testes confere o gesto com eventos de ponteiro e
  teclado — o mesmo caminho do navegador —, mas não substitui experimentar num
  celular de verdade.
- **"Os Limites da Compreensão Humana" mudou de significado na v2.17.** Até a
  v2.16 essa chave descrevia um teto de perícias, que não é a regra dessa página
  do livro; ela agora é o limite de rituais por aprendizado lento, e ganhou uma
  irmã para o aprendizado em campo. Uma ficha que já tinha a chave ligada não
  recebia nada antes e passa a receber a regra certa.

## Próximos passos sugeridos

1. Auditoria: quem mudou o quê e quando, aproveitando o `rev` que já existe.
2. Promover um segundo mestre pela interface (o banco já suporta).
3. Aplicativo instalável (Service Worker) para a ficha abrir sem rede.
4. Outras condições e efeitos temporários (machucado, lesões, fatigado, duração
   de efeitos), que hoje moram no bônus temporário e no texto.
5. Guardar no navegador as alterações pendentes do combate, para sobreviverem a
   fechar a aba (revalidadas contra o servidor ao voltar).

---

## Versionamento

**A versão do sistema vive só em `js/versao.js`**, e é sempre o primeiro
registro do `CHANGELOG`. O rodapé lê dali; clicar nele abre o histórico.

Três números diferentes, que não se misturam:

| | Onde | O que é |
|---|---|---|
| versão do aplicativo | `js/versao.js` | o que a pessoa vê: v2.0.0 |
| `schemaVersion` | `js/ficha.js` | o formato da FICHA |
| `versaoFormato` | `js/config.js` | o formato dos arquivos de importação |

A cada entrega: um registro novo no topo, com codinome inédito e a data real.
PATCH para correções, MINOR para funcionalidades, MAJOR para mudança de fase —
e os números de baixo zeram ao subir. As regras completas estão comentadas no
próprio `js/versao.js`.

---

## O primeiro acesso é lento — e isso é normal

O Apps Script **hiberna**. Depois de um tempo parado, a primeira chamada precisa
subir o contêiner de execução no Google, e isso pode passar de meio minuto. As
seguintes respondem na hora. É o motivo de "só a primeira vez dá erro".

O R.A.M.A. lida com isso sozinho:

- **A primeira tentativa tem prazo curto de propósito** (12 s). Se o servidor
  estiver dormindo, ela vai estourar de qualquer jeito — e abortar o pedido
  **não cancela a execução do lado do Google**, que continua e acaba de acordar
  o contêiner. A tentativa seguinte, com prazo maior, encontra tudo quente.
- **Leituras e gravações idempotentes repetem sozinhas** quando o prazo estoura.
  Só as ações que criam registro é que não repetem — repetir `criar_personagem`
  criaria dois personagens.
- **A tela de entrada acorda o servidor enquanto você digita a senha**, com um
  ping disparado assim que ela aparece. Os segundos de arranque acontecem
  durante a digitação.
- Se a espera passar da primeira tentativa, a tela de carregamento **explica**
  que o servidor está acordando, em vez de ficar com uma barra andando sem dizer
  nada.

Se mesmo assim o erro aparecer com frequência, há dois ajustes:

1. **`TEMPO_LIMITE_MS` em `js/config.js`** — aumente (o padrão é 30 000 ms por
   tentativa).
2. **`RAMA_ITERACOES` nas Script Properties** — este afeta só o *login*. Rode
   `medirDerivacao()` no editor do Apps Script: se as iterações estiverem
   levando muitos segundos, o login soma esse tempo ao arranque. Um alvo
   razoável é de 300 ms a 1,5 s.
