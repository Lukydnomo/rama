# Ordem Paranormal — matriz de regras

O que o R.A.M.A. implementa das regras de Ordem Paranormal, de onde cada
regra veio e como ela se comporta.

**Fontes.** `OPRPG` = *Ordem Paranormal RPG — Livro de Regras*, v1.1, Jambô,
2022. `SAH` = *Sobrevivendo ao Horror*, v1.2, Jambô, 2024. As páginas citadas
são as do livro, não as do PDF.

**Regra de ouro deste documento.** Nada aqui foi deduzido de memória nem
preenchido por analogia. O que não foi encontrado nos dois livros, ou o que o
livro deixa ambíguo, está na seção **Lacunas e interpretações**, no fim — com a
leitura que o R.A.M.A. adotou escrita por extenso.

---

## Estado de implementação

| símbolo | significado |
|---|---|
| **A** | automatizado: o R.A.M.A. calcula, valida ou aplica sozinho |
| **P** | parcial: parte do efeito entra na conta; o resto é anotação |
| **I** | informativo: o texto está no catálogo, sem efeito mecânico |
| **—** | não implementado nesta entrega |

---

## Onde cada coisa mora no código

| arquivo | o que guarda |
|---|---|
| `js/ordem/catalogo.js` | atributos, perícias, classes, progressão por classe, trilhas, origens, patentes, elementos |
| `js/ordem/poderes.js` | poderes de classe, poderes gerais, poderes paranormais, habilidades de trilha, habilidades automáticas e alterações por NEX |
| `js/ordem/progressao.js` | o motor de escolhas: vagas, requisitos, pendências, efeitos, afinidade — e a única porta que grava uma aquisição de ritual (`confirmarAquisicao`) |
| `js/ordem/aprendizado.js` | o que a classe e a trilha concedem em RITUAIS: quantos, de que círculo, guardados onde — e a regra de cada aquisição (`avaliarContraRegra`) |
| `js/ordem/inventario.js` | espaços, quantidade, categoria, grupo e o resto dos dados de um item (como a arma ataca, tipo de proteção, modificações aplicadas) |
| `js/ordem/itens-dados.js` | o catálogo de itens dos dois livros, como dado — carregado sob demanda |
| `js/ordem/itens.js` | o catálogo de itens arrumado: busca, filtros, apresentação, a cópia que vira item de ficha e as regras de aplicação de modificações e maldições |
| `js/ordem/rituais-dados.js` | o catálogo de rituais dos dois livros, como dado — carregado sob demanda |
| `js/ordem/rituais.js` | o catálogo de rituais arrumado: busca, filtros, apresentação, a cópia que vira ritual de ficha, o bloco `ordem` do ritual e os avisos da ficha |
| `js/paginas/ficha-inventario-biblioteca.js` | a janela "Da biblioteca" do inventário |
| `js/paginas/ficha-rituais-biblioteca.js` | a janela "Da biblioteca" da aba Rituais — a mesma janela, presa a uma aquisição, na Progressão e em Aprender Ritual |
| `js/ordem/regras.js` | todas as contas, com a composição de cada número |
| `js/ordem/opcionais.js` | as regras opcionais, uma chave para cada |
| `js/ordem/condicoes.js` | morrendo, enlouquecendo, inconsciente, perturbado e os contadores da mesa: a contagem de inícios de turno por cena e as ações com origem nos recursos (dano, cura, dano mental, gastar, recuperar) |
| `js/organizar.js` | o que muda de lugar quando alguém reorganiza uma lista — com filtro, em pastas, entre as habilidades das regras —, o agrupamento dos rituais por círculo e elemento e a ordem das perícias |
| `js/arrastar.js` | o gesto de arrastar e soltar, igual nas cinco abas: alça, prévia, destino, recusa com motivo, cancelamento, rolagem perto da borda e teclado |
| `js/ordem/biblioteca.js` | o catálogo de poderes arrumado para consulta na janela "Da biblioteca" |
| `js/ordem/personalizacao.js` | versões personalizadas e exclusão de habilidades oficiais, por aquisição |
| `js/paginas/ordem-escolhas.js` | as janelas de escolha, iguais na criação e na ficha |

O catálogo de poderes só é carregado nas páginas que calculam a ficha de Ordem
(a ficha e a lista de personagens, onde fica a criação). É um arquivo estático,
guardado em cache pelo navegador, e nunca vai junto na gravação da ficha: a
ficha guarda só a chave de cada escolha.

---

## Progressão: de pendência a escolha

### O modelo

Cada decisão que a progressão abre é uma **vaga** com id estável. O id diz de
onde a vaga veio, nunca o texto mostrado:

| id | vaga |
|---|---|
| `d3.poderClasse` | poder de classe do 3º degrau (NEX 15%, ou nível 3) |
| `d10.atributo` | aumento de atributo do 10º degrau |
| `d10.versatilidade` | versatilidade do 10º degrau |
| `d7.grauTreinamento` | grau de treinamento do 7º degrau |
| `d1.perito` | as duas perícias de Perito (especialista) |
| `d2.trilha` | a escolha da trilha |
| `b.aFavorita` | a opção interna de uma habilidade automática |
| `b.origem.engenheiro` | a opção interna de um poder de origem |
| `x25.transcender` | NEX de exposição 25%, com NEX & Experiência |
| `x25.alteracao` | a alteração de NEX 25%, com NEX & Experiência |
| `afinidade` | a afinidade elemental |
| `d1.rituaisIniciais` | os três rituais de 1º círculo do ocultista |
| `d4.ritualClasse` | o ritual daquele avanço de NEX (um por degrau) |
| `d2.saberAmpliado` | o ritual que Saber Ampliado concede naquele círculo |
| `d8.grimorio` | os rituais do grimório de Graduado |
| `d20.conhecendoOMedo` | o ritual que a trilha concede pelo nome |

"Degrau" é o passo de progressão: NEX 5% é o 1º, NEX 99% é o 20º. Com NEX &
Experiência, o degrau é o nível. Por isso o id não fala em NEX: ligar ou
desligar a regra não renomeia nenhuma escolha.

A decisão tomada é um **registro** em `ordem.escolhas` (ver
[CHARACTER_SCHEMA.md](CHARACTER_SCHEMA.md)). Resolver uma vaga nunca quita
outra parecida de outro degrau, porque cada registro aponta para uma vaga só.

### Três tipos de benefício

| tipo | exemplo | vira pendência? |
|---|---|---|
| automático | Ataque Especial; os poderes da trilha escolhida em NEX 40%, 65% e 99% | nunca |
| escolhido | poder de classe, aumento de atributo, grau de treinamento, versatilidade | até ser escolhido |
| com opções internas | A Favorita (a arma), Resistir a Elemento (o elemento) | até a opção ser preenchida |
| concessão de ritual | os três iniciais, o ritual de cada avanço, Saber Ampliado, o grimório | até a quantidade estar completa |
| ritual concedido pelo nome | "Você aprende o ritual Presença do Medo" | até a cópia estar na aba Rituais |

Uma concessão de ritual é **contada**: a pendência diz quantos rituais ela
permite, quantos já foram escolhidos e quantos faltam. Escolher menos do que ela
dá é permitido — a pendência fica aberta com o resto, e quem joga volta depois.

Um ritual **concedido pelo nome** não é escolha: o R.A.M.A. não o insere sozinho
porque adicionar um ritual é escrever na ficha, mas o caminho é um botão só, e o
cartão diz "automática".

As habilidades de trilha **não** são vagas de escolha: "Você recebe um novo
poder da trilha escolhida em NEX 40%, 65% e 99%" (OPRPG p.24, 28, 33). Até a
v2.3 elas apareciam como pendência permanente; agora chegam sozinhas.

### Efeitos são calculados, nunca gravados

O aumento de atributo não soma 1 no atributo gravado; o Grau de Treinamento não
troca "treinado" por "veterano" na perícia gravada. `ordem.atributos` e
`ordem.pericias` guardam o que foi escolhido na criação (e o que a mesa ajustou à
mão). O que as escolhas de progressão fazem é recalculado a cada leitura, na
ordem dos degraus. Consequências:

- recarregar ou recalcular **nunca** concede de novo o mesmo benefício;
- trocar uma escolha tira **só** o que ela dava, e os ajustes da mesa ficam;
- a ficha mostra os dois valores: o da ficha e o efetivo, com a conta aberta.

### Requisitos são conferidos na etapa

Um poder escolhido em NEX 15% é conferido contra o personagem de NEX 15%:
atributos, graus e poderes que ele tinha **ali**. Uma escolha que deixa de
cumprir requisito — porque uma anterior foi trocada, ou a mesa mexeu num
atributo — **não é apagada**: fica marcada, com o motivo, e os efeitos dela
ficam suspensos. A mesa pode mantê-la mesmo assim ("Manter mesmo assim"); os
problemas continuam listados.

Baixar o NEX também não apaga nada: as escolhas das etapas acima ficam
guardadas, sem efeito, e voltam a valer se o personagem chegar lá de novo.

### O que cada vaga aceita

| vaga | regra | fonte | est. |
|---|---|---|---|
| Trilha | uma trilha da classe; Médico de Campo exige Medicina | OPRPG p.24, 28, 31, 33 | **A** |
| Poder de classe | poder da classe ou, pelo SAH, poder geral | OPRPG p.24, 29, 33; SAH p.33 | **A** |
| Poder de classe do Possuído | não há escolha: vira Transcender | SAH p.28 | **A** |
| Aumento de atributo | +1, sem passar de 5 por esta via | OPRPG p.26 | **A** |
| Ponto de Intelecto | cada ponto de Intelecto aumentado treina uma perícia | OPRPG p.15 | **A** |
| Grau de treinamento | 2 + Int (combatente), 5 + Int (especialista), 3 + Int (ocultista) perícias treinadas sobem um grau; veterano a partir de NEX 35%, expert a partir de 70% | OPRPG p.26, 30, 34 | **A** |
| Versatilidade | um poder de classe ou o primeiro poder de outra trilha da classe | OPRPG p.26, 30, 34 | **A** |
| Perito | duas perícias treinadas, exceto Luta e Pontaria | OPRPG p.28 | **A** |
| Transcender | um poder paranormal; não ganha a Sanidade daquele aumento de NEX | OPRPG p.26, 114 | **A** |
| Treinamento em Perícia | duas perícias: treina, ou sobe para veterano a partir de NEX 35% e expert a partir de 70% | OPRPG p.26 | **A** |
| Traços do Outro Lado (Cultista Arrependido) | um poder paranormal | OPRPG p.18 | **A** |
| Ferramentas Favoritas (Engenheiro) | um item, exceto armas, conta uma categoria abaixo | OPRPG p.18 | **A** |
| Perícias do Amnésico | duas perícias, escolhidas na criação | OPRPG p.16 | **A** |
| Rituais iniciais | três rituais de 1º círculo, na criação do ocultista | OPRPG p.32 | **A** |
| Ritual de ocultista | um ritual de qualquer círculo que a classe lance NAQUELE degrau | OPRPG p.32 | **A** |
| Saber Ampliado | um ritual de 1º círculo, mais um daquele círculo a cada círculo novo | OPRPG p.35 | **A** |
| Grimório Ritualístico | rituais de 1º ou 2º círculo iguais ao Intelecto, mais um por círculo novo (opcional) | OPRPG p.35 | **A** |
| Aprender Ritual | um ritual de 1º círculo; 2º a partir de NEX 45%, 3º a partir de 75% | OPRPG p.114 | **A** |

**O Possuído não escolhe poder de ocultista.** "Sempre que receber um novo poder
de ocultista, em vez disso você recebe o poder Transcender" (Poder Não Desejado,
SAH p.28). A habilidade chega em NEX 10%, antes do primeiro poder de ocultista
(NEX 15%), então a troca vale para as seis vagas — e para o poder de ocultista da
Versatilidade (OPRPG p.34), que é a mesma coisa por outra porta. Essas vagas só
aceitam Transcender, e a tela mostra Transcender sozinho, sem busca nem filtro.
Poder geral entra na troca porque o Sobrevivendo ao Horror o define como poder de
todas as classes (p.33): recebê-lo é receber um poder de ocultista.

O que **não** é poder de ocultista continua livre: o primeiro poder de outra
trilha (na Versatilidade e em Ele Me Ensina), poder de outra classe e poder
paranormal. E o Transcender recebido pela troca custa a Sanidade daquele aumento
de NEX, como qualquer Transcender (OPRPG p.26).

Uma escolha antiga que não seja Transcender — uma ficha feita antes, ou uma troca
de trilha — **não é apagada**: fica marcada, com o motivo, os efeitos ficam
suspensos, e a mesa pode mantê-la com "Manter mesmo assim".

### Repetição

"A menos que o texto indique o contrário, só pode escolher cada poder uma vez"
(OPRPG p.114). O motor recusa a repetição e diz por quê. São repetíveis
Transcender, Treinamento em Perícia e Aprender Ritual; Foco em Perícia repete
só para perícias diferentes.

Com afinidade, um poder paranormal **do elemento da afinidade** pode ser
escolhido uma segunda vez. A segunda escolha dá **só** o que a linha "Afinidade"
acrescenta: Espreitar da Besta passa de +5 para +10 em Furtividade, não para
+15.

---

## Poderes e habilidades — cobertura

Todas as entradas trazem nome, resumo próprio, requisitos estruturados, livro e
página, e a marca honesta de automação.

| grupo | total | livro básico | SAH | **A** | **P** | **I** |
|---|---|---|---|---|---|---|
| Poderes de classe | 76 | 45 | 31 | 8 | 5 | 63 |
| Poderes gerais | 34 | — | 34 | 7 | 22 | 5 |
| Poderes paranormais | 30 | 22 | 8 | 6 | 2 | 22 |
| Habilidades de trilha (24 trilhas) | 96 | 60 | 36 | 6 | 20 | 70 |
| Habilidades automáticas de classe | 5 | 5 | — | — | — | 5 |
| Alterações por NEX (NEX & Experiência) | 2 | — | 2 | 2 | — | — |

**Por que tantos "I".** A maior parte dos poderes do jogo depende de gastar PE
numa cena, de uma rolagem específica ou de decisão do mestre (Golpe Pesado,
Ataque Furtivo, Surto Temporal). Marcar isso como automatizado seria mentir
sobre o que a ficha faz. Esses poderes aparecem na ficha, com o texto, e quem
joga aplica na hora.

### Efeitos que entram na conta

| efeito | exemplos |
|---|---|
| PV por degrau | Casca Grossa, Vitalidade Reforçada; Sangue de Ferro (por NEX de exposição) |
| PE por degrau, fixo ou por atributo | Potencial Aprimorado, Vontade Inabalável, Personalidade Esotérica, A Força do Saber |
| Sanidade perdida | Transcender como poder de classe |
| Defesa | Reflexos Defensivos, Precognição |
| Bônus em perícia | Sensitivo, Visão do Oculto, Iniciativa Aprimorada, Gatuno, O Sorriso, Espreitar da Besta |
| Treinamento ou +2 | os poderes gerais "treinado em X, ou +2 se já for"; Carteirada, Rastrear o Paranormal |
| Grau de perícia | Grau de Treinamento, Treinamento em Perícia, Poder da Fé (veterano em Religião) |
| Atributo | A Força do Saber (+1 Int), Ser Assustador (−1 Pre), Ser Aterrorizante (por elemento) |
| Atributo-base de perícia | A Força do Saber, Racionalidade Inflexível |
| Deslocamento | Atlético, Correria Desesperada |
| Capacidade de carga | Inventário Otimizado, Inventário Organizado, Mochileiro, Mascate |
| Categoria e espaço de item | A Favorita, Mochila de Utilidades, Remendão, Ferramentas Paranormais, Ferramentas Favoritas |
| Resistências | Resistir a Elemento, Inabalável, Eu Já Sabia; testes: Reflexos Defensivos, Precognição, Mente Sã |
| Proficiências | Armamento Pesado, Proteção Pesada, Balística Avançada, Ninja Urbano, Mira de Elite |
| Poder aninhado | Transcender, Expansão de Conhecimento, Especialista Diletante, Flashback, Ele Me Ensina |

Exemplos dos livros conferidos em teste: Potencial Aprimorado em NEX 30% dá 6 PE
e em NEX 35% dá 7 (OPRPG p.115); Sangue de Ferro em NEX 50% dá 20 PV (OPRPG
p.116); Técnico com Força 1 e Intelecto 3 carrega 20 espaços (OPRPG p.31); Morte 2
exige dois poderes de Morte antes (OPRPG p.114).

### Biblioteca oficial na aba Habilidades

No modo edição da ficha de Ordem, o botão **Da biblioteca** abre duas origens:
**Ordem Paranormal** (os livros) e **Homebrew** (a biblioteca da conta e o que
outras contas publicaram). Na ficha universal a janela continua só com a
Homebrew.

Nos livros há cinco abas, e a da classe da ficha abre primeiro:

| aba | o que mostra |
|---|---|
| Combatente, Especialista, Ocultista | habilidades de classe (com os estágios por NEX), poderes da classe e uma seção por trilha, livro básico e SAH |
| Poderes gerais | os poderes gerais do SAH e os quatro poderes de classe que o SAH tornou gerais |
| Poderes paranormais | um grupo por elemento, mais os sem elemento fixo |

Cada cartão traz origem, livro, resumo, afinidade, pré-requisitos e página; a
busca ignora acento e caixa. Uma habilidade que já está na ficha ganha a marca
"já vem pelas regras" ou "já na ficha", e trazê-la de novo pede confirmação.

**Trazer daqui é copiar texto.** Entra na árvore de habilidades uma habilidade
comum (nome, origem, resumo, estágios, afinidade, pré-requisitos e página), que
pode ser editada, movida ou removida como qualquer outra. Nenhum efeito entra na
conta por esse caminho, e os requisitos não são conferidos: quem soma PV, Defesa
ou treinamento é a escolha na aba **Progressão**, que sabe em que etapa o poder
entrou. A cópia não leva a `nota` de automação do catálogo, porque ela descreve o
que a ficha calcula, e a cópia não calcula nada.

### Editar e excluir habilidades oficiais da ficha

No modo edição, cada habilidade oficial da aba Habilidades (automática de classe,
de trilha, poder escolhido) tem um menu.

**Editar** abre o mesmo formulário das habilidades criadas à mão, já preenchido,
com um aviso de que será criada uma versão personalizada **só desta ficha**. Nome,
texto, origem, cor de contorno, negrito e etiqueta podem mudar. Cancelar não cria
nada. Salvar faz a lista mostrar a versão personalizada **no lugar** da oficial —
nunca as duas. O catálogo e as outras fichas não mudam.

A personalização se prende à **aquisição** pelo id estável (etapa + chave; ver
`docs/CHARACTER_SCHEMA.md`), não ao nome: sobrevive a recalcular, recarregar e
evoluir o personagem, não reabre nem consome escolha, e cada ocorrência de um
poder repetido é personalizada à parte.

**Automação.** O formulário diz se o original tem efeito na conta. Mudar a
apresentação não mexe nele, e **um texto novo não cria mecânica nova** — o
R.A.M.A. não interpreta texto livre. Quando o original tem efeitos, há uma marca
explícita para desativá-los naquela ocorrência: sai da conta só o que vem daquela
aquisição (os +2 de Defesa de Reflexos Defensivos, o PV por NEX de Casca Grossa),
e o resto — outros poderes, ajustes manuais, temporários — fica. O R.A.M.A. não
tem editor de efeitos estruturados para Homebrew, então esta versão não oferece
trocar um efeito por outro.

**Salvar na minha biblioteca Homebrew** grava a versão como habilidade
**privada**. A ficha continua com a própria cópia: editar o registro da biblioteca
depois não muda a ficha. Salvar de novo atualiza o mesmo registro.

**Restaurar versão oficial** pede confirmação e apaga a personalização daquela
ocorrência. A habilidade volta ao texto **atual** do catálogo do R.A.M.A. — nenhum
snapshot do original é guardado — e os efeitos voltam a valer.

**Excluir** depende de como a habilidade chegou, e a confirmação diz qual é:

| habilidade | o que excluir faz |
|---|---|
| escolhida numa etapa (poder de classe, Transcender, versatilidade…) | desfaz a escolha: a etapa volta a ficar pendente na Progressão, os efeitos saem, e o que veio junto na mesma escolha sai também. A personalização dela é apagada. |
| automática (de classe, de trilha, com opção interna, alteração por NEX) | tira da lista e da conta, sem apagar: fica em "Habilidades oficiais excluídas", no fim da lista, e pode ser restaurada — com a personalização, se houver. |

Se a aquisição some (classe, trilha ou escolha trocada), a personalização aparece
no fim da lista como **sem aquisição**, sem conceder nada, com as opções de
transformá-la em habilidade comum ou excluí-la. Se a mesma aquisição voltar, ela
volta a valer sozinha.

### Ordem das listas e arrastar (v2.19)

Na ficha de Ordem, as abas Habilidades, Rituais e Inventário têm uma barra
**Ordenar** no topo da lista, fora e dentro do modo edição:

- **Personalizada** — a ordem guardada. É a única que se muda à mão: arrastando
  pela alça (⠿), com ↑ e ↓ no teclado quando a alça tem o foco, ou por **Subir** e
  **Descer**, no menu de cada um.
- **Ordem de adição** — do mais antigo ao mais novo. O que entrou antes da v2.7
  não tem data e vem no topo, na ordem guardada; habilidades automáticas das
  regras também. Um poder escolhido conta a partir de quando a escolha foi feita.
- **A–Z** e **Z–A** — pelo nome que aparece no cartão (o da versão personalizada,
  quando houver), sem diferença de acento ou maiúscula. Na aba Habilidades, as das
  regras e as criadas à mão formam uma lista só, com as pastas antes.

Num modo automático, a alça some e a barra oferece **Usar ordem personalizada**:
um arraste aceito para depois ser desfeito pela ordem automática seria pior que
nenhum. Trocar de modo nunca apaga a ordem personalizada guardada — ela volta
como estava. O modo fica gravado na ficha (`ordem.organizacao`) e nenhuma conta o
lê. Personalizações e habilidades excluídas continuam no fim da lista, em
qualquer modo.

**O gesto.** Uma implementação só (`js/arrastar.js`) serve às cinco abas que se
reorganizam — habilidades, rituais, inventário, perícias e anotações. A alça é a
única parte que começa um arraste: o resto do cartão continua abrindo, rolando
dado e, no celular, rolando a página. Durante o arraste só a prévia muda — o
cartão levado aparece ao lado do ponteiro, a origem fica apagada e uma linha
mostra onde ele vai cair (ou a pasta de destino fica marcada). Um destino
recusado aparece recusado **enquanto** se arrasta, com o motivo, e soltar ali não
muda nada. Esc, o cancelamento do sistema e soltar fora de uma lista cancelam;
perto da borda de cima ou de baixo a página rola sozinha; e o clique que o
navegador dispara no fim do gesto é engolido, para nada abrir por engano. A ficha
muda uma vez, ao soltar, e é gravada pelo salvador de sempre.

**Com filtro.** No inventário, com uma categoria filtrada, a posição é contada
entre os **visíveis**: o item vai para logo antes do vizinho visível que fica
depois dele, e os ocultos não trocam de ordem entre si nem de categoria.

**Pastas das habilidades.** Soltar no nome de uma pasta põe dentro dela; soltar
entre os itens de uma pasta, naquele ponto. Uma pasta não entra em si mesma nem
numa pasta que está dentro dela, e nenhum movimento deixa a árvore mais funda do
que o modelo guarda — os três são recusados com o motivo. As habilidades das
regras também vão para as pastas, e a posição delas é **preferência de
apresentação** (`organizacao.habilidades.lugares` e `ordem`): a aquisição, o texto,
a versão personalizada e a exclusão não mudam, e nada vira Homebrew. Uma pasta
apagada devolve as habilidades das regras que estavam nela para a raiz, sem
apagar a preferência.

**Rituais.** A **Ordem base** (as quatro de cima) ganha dois critérios
independentes, **Círculo** e **Elemento**, ligados e desligados em separado. Com
os dois, um seletor de **Prioridade** diz qual agrupa primeiro — "Círculo, depois
elemento" é o padrão. Dentro de cada grupo, a ordem base desempata, então nada
pula de lugar entre um desenho e outro. O círculo vem só dos dados do ritual
(`ritual.ordem.circulo`), em ordem numérica, nunca do nome. O elemento vem dos
dados; na falta deles, do campo Elemento quando o texto é o nome de um elemento;
um texto que não é elemento (Homebrew) forma o próprio grupo, depois dos do
livro; e o que não tem nada vai para "Círculo não informado" ou "Elemento não
informado", no fim. Um ritual aparece uma vez só, mesmo com dois elementos no
texto. Conhecidos, Grimório e Registros continuam separados, e os grupos ficam
dentro de cada um: arrastar muda só a ordem dentro do grupo — trocar de lugar
seria mudar o aprendizado, e isso tem regra própria no menu do ritual.

**Perícias.** Ordem alfabética (o padrão, e a de toda ficha antiga), maior bônus
primeiro, menor bônus primeiro ou personalizada. O bônus comparado é o **total que
a linha mostra** — o mesmo cálculo da coluna Total (`bonusDePericia`), com
treinamento, extra e os outros modificadores —, nunca o grau sozinho nem os dados
do atributo. Empates, pelo nome. A personalizada guarda as chaves das perícias
(`organizacao.pericias.ordem`) e começa, na primeira vez, da ordem que estava na
tela. Editar o extra não move a linha a cada tecla: a lista se reorganiza quando
a edição é confirmada, com o foco no mesmo campo (Enter) ou onde a pessoa foi.

**Anotações.** Arrastar funciona também fora do modo edição, para quem pode editar
a ficha — organizar as notas faz parte de anotar. Uma nota muda de pasta
(soltando no nome dela ou entre as notas de lá), sai da pasta (soltando entre as
sem pasta) ou muda de lugar; as pastas mudam de ordem entre si e não entram umas
nas outras. É sempre a mesma nota: id, título, conteúdo e datas.

---

## Afinidade

| regra | fonte | comportamento | est. |
|---|---|---|---|
| Em NEX 50% o personagem se conecta a um elemento: Conhecimento, Energia, Morte ou Sangue | OPRPG p.110, 114 | a escolha abre sozinha uma vez ao abrir a ficha; fica pendente na Progressão | **A** |
| Com nível e NEX separados, o gatilho é o NEX de exposição | SAH p.98 | o gatilho olha `ordem.nex`, nunca o nível | **A** |
| A conexão não tem efeito imediato; a afinidade se desenvolve na primeira vez que transcender depois | OPRPG p.110, 114 | a ficha separa "conexão" de "afinidade desenvolvida" | **A** |
| Com afinidade, poder paranormal do elemento pode ser escolhido de novo | OPRPG p.114 | aplicado com a linha Afinidade | **A** |
| Rituais sem componentes, +2 dados contra o próprio elemento e −2 contra o opressor | OPRPG p.114 | mostrado na escolha e na ficha | **I** |
| A trilha Monstruoso prende a afinidade ao elemento de Ser Amaldiçoado | SAH p.17 | aviso na ficha; nada é trocado sozinho | **A** |

**Requisitos do projeto que o livro não tem, e como convivem com ele:**

- **"Decidir depois".** O livro diz que a conexão é automática. O R.A.M.A.
  permite adiar: a decisão fica guardada como `adiada`, a janela não reabre, e a
  pendência continua na Progressão. Enquanto não houver elemento, nenhum efeito
  de afinidade é aplicado.
- **"Outro" (Homebrew).** Não existe no livro. Exige nome; nenhum efeito de outro
  elemento é atribuído a ele, e nenhum poder do catálogo repete por ele.
- **Revisar a afinidade.** O livro diz que "uma vez feita, esta escolha não pode
  ser alterada" (OPRPG p.110). O R.A.M.A. permite revisar no modo edição, como
  decisão da mesa, com o aviso do livro na tela e a lista do que deixa de valer.
  As segundas escolhas de poderes do elemento antigo ficam marcadas, não apagadas.

---

## Patente

**OPRPG p.51-53.** Tabela 3.1.

| PP | patente | crédito | cat. I | II | III | IV |
|---|---|---|---|---|---|---|
| 0 | Recruta | Baixo | 2 | — | — | — |
| 20 | Operador | Médio | 3 | 1 | — | — |
| 50 | Agente especial | Médio | 3 | 2 | 1 | — |
| 100 | Oficial de operações | Alto | 3 | 3 | 2 | 1 |
| 200 | Agente de elite | Ilimitado | 3 | 3 | 3 | 2 |

### A chave "Aplicar regras de patente"

Fica na aba Regras, em "Configuração da ficha". **Ligada é o padrão**, e é o
comportamento de toda ficha gravada antes desta chave existir.

| com a chave ligada | com a chave desligada |
|---|---|
| a patente sai dos pontos de prestígio | a patente não é calculada; os PP ficam guardados |
| o limite de crédito é calculado, com Patrocinador da Ordem | o limite de crédito não é calculado |
| os limites por categoria são os da Tabela 3.1 | os limites por categoria são os definidos pela mesa, no modo edição |

Desligar pela primeira vez começa os limites manuais iguais aos da patente
atual, para nada mudar de uma hora para a outra. Os limites manuais ficam
guardados à parte: religar a patente não os apaga, e desligar de novo os traz de
volta. Alternar a chave nunca apaga item.

**Sem limite não é zero.** No formato guardado, `null` é "sem limite" e `0` é
"nenhum item permitido". Na Tabela 3.1, "—" é zero. Categoria 0 é sempre sem
limite quando a patente é aplicada: "Você pode escolher quantos itens quiser de
categoria 0" (OPRPG p.53).

### Contagem

| regra | fonte | comportamento | est. |
|---|---|---|---|
| Patente derivada dos PP, e rebaixamento ao perder | OPRPG p.51 | calculado | **A** |
| Limite de itens por categoria | OPRPG p.53 | contado contra o inventário, com aviso por categoria | **A** |
| Cada unidade conta como um item | OPRPG p.53 | três granadas de categoria I são três itens de categoria I | **A** |
| Categoria reduzida por habilidade | OPRPG p.18, 26, 29, 31, 33 | a categoria efetiva é a que conta | **A** |
| Item sem categoria informada | — | não conta em nenhum limite e aparece listado para classificar | **A** |
| Pontos de prestígio por missão (Tabela 3.2) | OPRPG p.53 | sem automação de missão | **I** |

---

## Carga e capacidade

**OPRPG p.53.** Espaço de inventário **não é peso**: a ficha de Ordem nunca olha
para o campo de peso da ficha universal, e nenhum dos dois é convertido no outro.

| regra | fonte | comportamento | est. |
|---|---|---|---|
| 5 espaços por ponto de Força; Força 0 carrega 2 | OPRPG p.53 | calculado com composição | **A** |
| Um item ocupa 1 espaço por padrão | OPRPG p.53 | item sem espaço informado usa 1, marcado como "padrão" | **A** |
| Espaços × quantidade | OPRPG p.53 | cada item guarda espaços por unidade e quantidade | **A** |
| A mochila não ocupa espaço | OPRPG p.53 | item do tipo mochila vale 0 por padrão | **A** |
| Mochila Militar: +2 de capacidade | OPRPG p.66 | campo "aumenta a capacidade" do item, contado uma vez por item | **A** |
| Sobrecarregado: −5 Defesa, −5 perícias de carga, −3m | OPRPG p.53 | aplicado com a capacidade final | **A** |
| Máximo absoluto = dobro da capacidade | OPRPG p.53 | avisado | **A** |
| Inventário Otimizado: Força + Intelecto | OPRPG p.31 | calculado | **A** |
| Inventário Organizado: +Intelecto; meio espaço vira um quarto | SAH p.34 | calculado | **A** |
| Mochila de Utilidades: um item ocupa 1 espaço a menos | OPRPG p.29 | uma unidade do item escolhido, nunca abaixo de 0 | **A** |
| Mochileiro, Mascate: +5 | SAH p.14, 25 | calculado | **A** |
| Carregar uma pessoa: 10 espaços | OPRPG p.53 | lançado como item pela mesa | **I** |

### Ajuste temporário de capacidade

Um número com sinal, no modo edição, no painel "Carga e capacidade" da aba
Inventário:

```
capacidade calculada + ajuste temporário = capacidade final
```

- `+5` aumenta, `-2` reduz, `0` mantém a calculada;
- muda só a capacidade: não mexe na carga dos itens, na Força nem nos limites por
  categoria;
- fica até alguém mudá-lo ou tirá-lo — nenhuma duração é inventada;
- vai de −99 a +99; fora disso a tela recusa e explica, sem apagar o digitado;
- se levaria a capacidade abaixo de zero, a final fica em 0 e a tela diz isso por
  extenso.

A mesma conta alimenta o bloco superior, o painel de carga do inventário e as
penalidades de sobrecarga.

### Valores efetivos de cada item

`R.itensEfetivos(ficha, inventario)` é a **única origem** do que a tela mostra de
um item: categoria original e efetiva, espaços por unidade (original e efetivo),
quantidade, ocupação total da pilha (original e efetiva) e os modificadores com a
fonte de cada um. Ela sai das mesmas duas contas que a carga
(`ocupacaoDoInventario`) e os limites por categoria (`usoPorCategoria`) usam —
cabeçalho do cartão, detalhes, carga total e patente não têm como divergir.

- O **cabeçalho** do cartão mostra os valores **efetivos**: `Categoria: I ·
  Espaços: 0`. Com mais de uma unidade, os nomes se separam: `Espaços por unidade`,
  `Quantidade` e `Ocupa` (a pilha inteira).
- Os **detalhes** mostram a transformação e a fonte: `Categoria: II → I — Mochila
  de Utilidades`, `Ocupa no total: 1 → 0 — Mochila de Utilidades: −1 espaço`.
- Mochila de Utilidades tira 1 espaço de **uma** unidade: uma pilha de 3 itens de
  1 espaço ocupa 2, e o espaço por unidade continua 1.
- Zero é resultado válido e nunca é trocado pelo valor-base.
- Nada efetivo é gravado: o item guarda só os valores-base, e remover o
  modificador devolve a categoria e os espaços originais.

### Proteção em uso

Uma proteção (item do tipo proteção) só soma na Defesa quando está **em uso**. O
cartão da proteção mostra o estado com o cartão fechado — "Em uso: soma +5 na
Defesa" ou "Guardada: não soma na Defesa" — e o botão **Usar**/**Em uso** troca.

- **Uma proteção vestida em uso por vez**: usar uma tira as outras de uso.
- **O escudo é um lugar próprio** (`ordem.protecao.tipo: "escudo"`) e **acumula**
  com a proteção vestida: "Precisa ser empunhado em uma mão e fornece Defesa +2"
  (OPRPG p. 62). Proteção leve + escudo em uso somam +7, e a composição mostra as
  duas parcelas. Um escudo por vez, também.
- **Proteção pesada em uso** impõe −5 nas perícias que sofrem penalidade de carga
  (OPRPG p. 62). A penalidade entra na composição da perícia, com o nome da
  proteção, e soma com a da sobrecarga, que é outra regra.
- **As modificações da proteção entram na Defesa**: Reforçada soma +2 (e +1
  espaço); Blindada e Antibombas somam espaço e resistências que ficam no controle
  manual. As parcelas aparecem com o nome da modificação.
- A **quantidade não multiplica**: duas proteções leves na ficha são +5, não +10.
- A composição da Defesa mostra a parcela com o nome da proteção. Sem nenhuma em
  uso, ela explica por que a proteção do inventário não entrou.
- Se duas vierem marcadas (dois aparelhos, um arquivo importado), vale a de maior
  Defesa e a composição avisa.
- Editar a proteção não a tira de uso; duplicar ou trazer da biblioteca cria uma
  cópia guardada. O estado fica em `ordem.emUso` do item.

A ficha universal não muda: lá as armaduras continuam somando um número mostrado
ao lado, sem aplicar sozinhas.

## Biblioteca de itens

**OPRPG p. 53–67 e 144–151; SAH p. 37–45 e 55–61.** No modo edição do inventário
da ficha de Ordem, o botão **Da biblioteca** abre duas origens: **Ordem
Paranormal** (o catálogo dos dois livros) e **Homebrew** (os itens da conta e os
que outras contas publicaram, filtrados no servidor). Na ficha universal a janela
continua só com a Homebrew. Criar item à mão continua igual.

O catálogo é **dado**, separado da tela: `js/ordem/itens-dados.js` só é carregado
na primeira vez que alguém abre a janela, fica congelado na memória
(`Object.freeze`) e **nunca vai junto na gravação da ficha**.

### Organização

| aba | seções |
|---|---|
| Armas | armas simples, táticas, pesadas e as modificações para armas |
| Munições | munições e as modificações para munições |
| Proteções | proteções e as modificações para proteções |
| Geral | acessórios, explosivos, itens operacionais, itens paranormais e as modificações |
| Itens Amaldiçoados | itens amaldiçoados e as maldições para armas, proteções e acessórios |

A **categoria de navegação** (a aba) e a **categoria de equipamento** (0, I, II,
III, IV) são campos diferentes: a aba organiza a busca, a categoria conta contra o
limite da patente. Filtros de fonte, tipo de equipamento, categoria e elemento; a
busca ignora acento e caixa e procura também pelos nomes alternativos que as
tabelas usam.

### Cobertura, entrada por entrada

| seção | livro básico | SAH | conteúdo |
|---|---|---|---|
| Armas simples | 12 | 3 | Arco, Bastão, Besta, Cajado, Faca, Fuzil de caça, Lança, Machete, Martelo, Pistola, Punhal, Revólver · **SAH:** Estilingue, Pregador pneumático, Revólver compacto |
| Armas táticas | 19 | 8 | Acha, Arco composto, Balestra, Corrente, Espada, Espingarda, Florete, Fuzil de assalto, Fuzil de precisão, Gadanho, Katana, Machadinha, Machado, Marreta, Maça, Montante, Motosserra, Nunchaku, Submetralhadora · **SAH:** Baioneta, Bastão policial, Espingarda de cano duplo, Faca tática, Gancho de carne, Picareta, Pistola pesada, Shuriken |
| Armas pesadas | 3 | 0 | Bazuca, Lança-chamas, Metralhadora |
| Modificações para armas | 13 | 1 | Alongada, Calibre grosso, Certeira, Compensador, Cruel, Discreta, Ferrolho automático, Mira laser, Mira telescópica, Perigosa, Silenciador, Tática, Visão de calor · **SAH:** Carregador rápido |
| Munições | 8 | 1 | Balas curtas, Balas longas, Cargas para pistola sinalizadora, Cartuchos, Combustível, Dardos para pistola de dardos, Flechas, Foguete · **SAH:** Bolinhas de estilingue |
| Modificações para munições | 2 | 0 | Dum dum, Explosiva |
| Proteções | 3 | 0 | Escudo, Proteção leve, Proteção pesada |
| Modificações para proteções | 4 | 0 | Antibombas, Blindada, Discreta, Reforçada |
| Acessórios | 3 | 7 | Kit de perícia, Utensílio, Vestimenta · **SAH:** Amuleto sagrado, Celular, Chave de fenda universal, Chaves, Documentos falsos, Manual operacional, Notebook |
| Explosivos | 5 | 5 | Granada de atordoamento, Granada de fragmentação, Granada de fumaça, Granada incendiária, Mina antipessoal · **SAH:** Dinamite, Explosivo plástico, Galão vermelho, Granada de gás sonífero, Granada de PEM |
| Itens operacionais | 19 | 24 | Algemas, Arpéu, Bandoleira, Binóculos, Bloqueador de sinal, Cicatrizante, Corda, Equipamento de sobrevivência, Lanterna tática, Mochila militar, Máscara de gás, Pistola de dardos, Pistola sinalizadora, Pé de cabra, Soqueira, Spray de pimenta, Taser, Traje hazmat, Óculos de visão térmica · **SAH:** Alarme de movimento, Alimento energético, Anti-inflamatório, Antibiótico, Antiemético, Antihistamínico, Antitérmico, Antídoto, Aplicador de medicamentos, Braçadeira reforçada, Broncodilatador, Coagulante, Coldre saque rápido, Cão adestrado, Equipamento de escuta, Estrepes (saco), Faixa de pregos, Isqueiro, Paraquedas, Pá, Traje de mergulho, Traje espacial, Óculos de visão noturna, Óculos escuros |
| Itens paranormais | 7 | 9 | Amarras de (elemento), Componentes ritualísticos de (elemento), Câmera de aura paranormal, Emissor de pulsos paranormais, Escuta de ruídos paranormais, Medidor de estabilidade da membrana, Scanner de manifestação paranormal de (elemento) · **SAH:** Catalisador ritualístico ampliador, Catalisador ritualístico perturbador, Catalisador ritualístico potencializador, Catalisador ritualístico prolongador, Ligação direta infernal, Medidor de condição vertebral, Pen drive selado, Pé de morto, Valete da salvação |
| Modificações para acessórios e itens paranormais | 4 | 2 | Aprimorado, Discreto, Função adicional, Instrumental · **SAH:** Bateria potente, Lente de revelação |
| Itens amaldiçoados | 28 | 19 | Amarras mortais, Anéis do elo mental, Arcabuz dos Moretti, Bateria reversa, Casaco de lodo, Coletora, Coração pulsante, Coroa de espinhos, Crânio espiral, Dedo decepado, Frasco de lodo, Frasco de vitalidade, Jaqueta de Veríssimo, Lanterna reveladora, Munição jurada, Máscara das pessoas nas sombras, Peitoral da segunda chance, Pergaminho da pertinácia, Punhos enraivecidos, Pérola de sangue, Relógio de Arnaldo, Selo paranormal, Seringa de transfiguração, Talismã da sorte, Teclado de conexão neural, Tela do pesadelo, Veículo energizado, Vislumbre do fim · **SAH:** A Primeira Adaga, Ampulheta do tempo sofrido, Arreio neural, Centrifugador existencial, Conector de membros, Câmera obscura, Dose d’A Praga, Enxame fantasmagórico, Espelho refletor, Fuzil alheio, Injeção de Lodo, Instantâneo mortal, Mandíbula agonizante, Projétil de Lodo, curto, Projétil de Lodo, longo, Repositório do fracasso, Retalho tenebroso, Rádio chiador, Tábula do saber custoso |
| Maldições para armas | 12 | 0 | Antielemento, Consumidora, Empuxo, Energética, Erosiva, Lancinante, Predadora, Repulsora, Ritualística, Sanguinária, Senciente, Vibrante |
| Maldições para proteções | 10 | 0 | Abascanta, Cinética, Letárgica, Lépida, Profética, Regenerativa, Repulsiva, Sombria, Sádica, Voltaica |
| Maldições para acessórios | 13 | 0 | Carisma, Conjuração, Defesa, Destreza, Disposição, Escudo mental, Esforço adicional, Potência, Proteção elemental, Pujança, Reflexão, Sagacidade, Vitalidade |

Total: **244 entradas** — 183 itens e 61 melhorias (26 modificações e 35
maldições).

**O que não entrou, e por quê.** Coronhada, armas improvisadas e ataques
desarmados (OPRPG p. 59) são regras de ataque, não itens; a contagem de munição
(OPRPG p. 174) é regra opcional e aparece como nota nas munições e nas armas de
fogo; a fabricação em campo (SAH p. 94) é um procedimento de mesa. Rituais têm
catálogo próprio, que não existe nesta entrega.

### Divergências entre os materiais

Cada uma está registrada na própria entrada, no campo `notas`, e aparece na janela
como "Nota:".

| conteúdo | divergência | o que o catálogo faz |
|---|---|---|
| Picareta | o livro básico manda usar as estatísticas da marreta (p. 59); o SAH dá estatísticas próprias (Tabela 1.4) | duas entradas separadas, cada uma com a sua fonte; nada é misturado |
| Discreta (arma) | a Tabela 3.5 dá +10 em ocultar para corpo a corpo e disparo, e +5 com −1 espaço para armas de fogo; o texto da p. 60 dá +5 e −1 espaço para qualquer arma | segue o texto, e registra a divergência |
| Tática (arma) | aparece nas duas listas da Tabela 3.5 | uma entrada só, aplicável aos três tipos |
| Cajado | a tabela traz o dano como "1d6/1d6" | dano 1d6, com a nota de que as duas pontas causam o mesmo |
| Tábula do saber custoso | a Tabela 1.6 chama de "Tablet do saber custoso" | usa o nome da descrição e acha pelos dois |
| Câmera de aura paranormal | a Tabela 3.10 escreve "Câmara" | usa "Câmera" e acha pelos dois |
| Motosserra | tabela e descrição escrevem "Motoserra" | usa "Motosserra" e acha pelos dois |
| Paraquedas, traje de mergulho, traje espacial | a Tabela 1.5 escreve a categoria em arábico (1, 1, 2) | lidos como I, I e II |
| Fuzil alheio | o SAH o descreve como fuzil de precisão com mira telescópica e mira laser | aplica só o que o texto descreve: 2d10, 19/x3, alcance extremo e margem 17 |
| Mochila militar | a Tabela 3.8 traz "*" em espaços | 0 espaços, como diz a descrição |
| Cão adestrado | a Tabela 1.5 traz "–" em espaços | 0 espaços: um aliado não ocupa inventário |

### O que a ficha faz com o item adicionado

Adicionar cria uma **cópia independente**, com id próprio e `origemCatalogoId`
como rastro. Editar a cópia não muda o catálogo nem as outras cópias; corrigir o
catálogo numa versão futura não muda o que já está na ficha.

| campo do catálogo | onde entra na ficha | est. |
|---|---|---|
| categoria (0 a IV) | `ordem.categoria`, contra o limite da patente | **A** |
| espaços por unidade | `ordem.espacos`, na carga | **A** |
| quantidade escolhida | `ordem.quantidade` (munição, consumível, granada, catalisador, medicamento) | **A** |
| dano, crítico e multiplicador | campos da arma, nos botões Ataque e Dano | **A** |
| perícia de ataque | `ordem.pericia`: Luta em corpo a corpo, Pontaria no resto (OPRPG p. 54) | **A** |
| atributo somado ao dano | Força em corpo a corpo e arremesso; o maior entre Força e Agilidade em arma ágil; nada em disparo e fogo (p. 54, 59) | **A** |
| arma ágil no teste de ataque | usa Agilidade quando ela é maior (p. 59) | **A** |
| penalidade de dados da arma | motosserra: −1 dado no teste | **A** |
| bônus de ataque da própria arma | Arcabuz dos Moretti: +2 | **A** |
| dano alternativo | botão próprio: duas mãos, dois canos, baioneta fixada | **A** |
| dano por 1d6 | Arcabuz dos Moretti: o botão Dano rola 1d6 e usa a linha sorteada | **A** |
| alcance | mostrado, e aumentado pelas modificações que o aumentam | **P** |
| Defesa da proteção | `defesa` do item, somada **quando em uso** | **A** |
| tipo de proteção | leve, pesada ou escudo: escudo acumula, pesada penaliza perícias de carga | **A** |
| capacidade de carga do item | `ordem.capacidade` (Mochila Militar +2) | **A** |
| proficiência exigida | comparada com as da ficha; vira **aviso**, nunca penalidade automática | **I** |
| patente e itens amaldiçoados | aviso quando a patente ainda não os libera (p. 144) | **I** |
| preço da maldição | painel com o custo de cada elemento; a Sanidade não é descontada | **I** |
| efeitos com custo, ação ou condição | texto na descrição da cópia | **I** |
| resistência a dano da proteção pesada | texto | **I** |
| contagem de munição (regra opcional) | nota na munição e na arma de fogo | **I** |

Adicionar **não** equipa: proteção entra guardada, e nenhum efeito que dependa de
uso, escolha ou condição é ligado. A ficha não desconta munição — a unidade é o
pacote (ou a caixa), e nada é convertido em número de projéteis.

### Modificações e maldições

Elas **não são itens** e não entram no inventário: aplicadas a um item, viram uma
entrada em `ordem.modificacoes` dele, com os números que as regras usam copiados
na hora.

| regra | fonte | comportamento | est. |
|---|---|---|---|
| Cada modificação aumenta a categoria do item em I | OPRPG p. 60 | somado na categoria efetiva | **A** |
| A primeira maldição aumenta em II; as seguintes, em I | OPRPG p. 144 | somado na categoria efetiva | **A** |
| Modificações e maldições iguais não se acumulam | OPRPG p. 60, 144 | recusado, com o motivo | **A** |
| Só no tipo de item que o livro indica | OPRPG p. 60-64, 144-151 | recusado quando o tipo é conhecido e não bate; item à mão sem tipo aplica com aviso | **A** |
| Reforçada e Discreta não combinam | OPRPG p. 62 | recusado | **A** |
| Ferrolho automático exige arma não automática | OPRPG p. 60 | recusado | **A** |
| Maldições de elementos opressores não convivem | OPRPG p. 144 | recusado, dizendo quais | **A** |
| Aprimorado repete com Função adicional | OPRPG p. 64 | permitido uma segunda vez | **A** |
| +2 no ataque, +2 no dano, +1 dado de dano, margem, alcance, espaço, Defesa | OPRPG p. 60-62 | somados nos botões e nas contas | **A** |
| Predadora dobra a margem antes de qualquer aumento | OPRPG p. 146 | calculado (fuzil de caça predador: 17) | **A** |
| Cada maldição dá +10 PV e +10 RD ao item | OPRPG p. 145 | texto | **I** |
| Categorias acima de IV | OPRPG p. 53 | o item sai dos limites e a ficha avisa | **A** |
| Dum dum e Explosiva (munição) | OPRPG p. 60 | aplicadas ao pacote; o efeito na arma é controle manual, porque a ficha não liga munição a arma | **I** |
| Lente de revelação | SAH p. 45 | o livro não diz o acréscimo de categoria: o catálogo não soma nada | **I** |

Remover uma modificação devolve os valores originais na leitura seguinte: nada
efetivo é gravado.

---

## Atributos

| regra | fonte | comportamento | est. |
|---|---|---|---|
| Cinco atributos: Agilidade, Força, Intelecto, Presença, Vigor | OPRPG p.14 | campos fixos da ficha de Ordem | **A** |
| Todos começam em 1; 4 pontos para distribuir | OPRPG p.14 | a criação guiada distribui e confere o saldo | **A** |
| Pode reduzir **um** atributo a 0 para ganhar +1 ponto | OPRPG p.14 | permitido uma vez; a criação avisa se for usado de novo | **A** |
| Máximo inicial 3 | OPRPG p.14 | a criação recusa 4+ na distribuição inicial | **A** |
| Teste rola Nd20 e pega o maior; atributo 0 rola 2d20 e pega o menor | OPRPG p.14, p.40 | o motor de dados já fazia isso (`NdX` e `-NdX`) | **A** |
| Aumento de atributo em NEX 20%, 50%, 80% e 95%, teto 5 | OPRPG p.26 | vaga de escolha; o teto é conferido | **A** |
| Vigor aumentado sobe os PV **retroativamente** | OPRPG p.15 | o PV é recalculado do zero a cada mudança | **A** |

## Perícias

As 28 perícias, com atributo-base, exigência de treinamento, penalidade de
carga e kit. **OPRPG p.41-49.**

Atributo-base conferido nos títulos de cada perícia (p.41-49), que é a fonte
autoritativa. A Tabela 2.1 (p.40) foi descartada como referência primária
porque a extração de texto do PDF embaralha as colunas dela.

### Bloqueio, Esquiva e bônus extras

- **Bloqueio** = bônus de Fortitude + bônus extra de Bloqueio.
- **Esquiva** = Defesa final + bônus de Reflexos + bônus extra de Esquiva.
- **Defesa** = cálculo de sempre + bônus extra de Defesa.

"Bônus da perícia" é o número que soma na rolagem — grau, poderes, penalidade de
carga, ajustes da mesa e o bônus extra da perícia —, **sem** os dados do atributo.
É o mesmo `bonusDePericia` da rolagem: o extra de Fortitude chega ao Bloqueio porque
já está em Fortitude, e não é somado de novo. A Esquiva usa a Defesa como ela sai
do cálculo, em **uma** parcela ("Defesa final"); as parcelas da Defesa não se repetem.

O bônus em testes de resistência (Reflexos Defensivos, Mente Sã…) é condicional —
vale quando a perícia é usada para resistir — e **não** entra no Bloqueio nem na
Esquiva, do mesmo jeito que não entra no bônus geral dessas perícias.

Os três valores abrem a composição ao clicar. Dentro dela há o campo **Bônus extra**
(−99 a +99, positivo, negativo ou zero), com **Aplicar** e **Zerar**. Ele funciona
no modo normal para quem pode editar a ficha, aparece como parcela própria na conta,
fica guardado em `ordem.bonusExtra` até alguém mudar e não mexe em atributo,
equipamento nem valor-base. Os cartões do painel da campanha mostram os mesmos três
números.

### Ajustes de cada perícia

No modo edição, cada perícia tem:

- **Atributo**: qualquer um dos cinco. A escolha muda os dados da rolagem (é o
  atributo que `dadoDePericia` usa) e fica em `ordem.periciasAjustes`; o catálogo e
  as outras fichas não mudam. **Restaurar atributo padrão** volta ao do catálogo — ou
  ao que um poder define, como A Força do Saber. Trocar o atributo não muda o grau nem
  soma o valor do atributo ao bônus.
- **Extra**: um bônus fixo da perícia (−99 a +99). Entra no total, na rolagem e na
  composição ("Bônus extra"), e reflete em Bloqueio (Fortitude) e Esquiva (Reflexos).
  Não muda o grau.

A tabela mostra, alinhados: perícia, atributo, grau, treino (o bônus do grau), extra,
total e rolagem, com as marcas de carga e kit. Quando o total tem outros modificadores
(poderes, carga, ajustes), ele ganha um asterisco e a composição explica. Os graus
treinado, veterano e expert usam a mesma cor (#402A7E) no nome e no bônus do grau, e
a subida aparece no peso da letra: treinado só a cor, veterano em negrito, expert em
negrito e itálico. O nome continua escrito, e o estilo depende só do grau, nunca do
total.

| perícia | atrib. | só treinada | carga | kit |
|---|---|---|---|---|
| Acrobacia | AGI | — | sim | — |
| Adestramento | PRE | sim | — | — |
| Artes | PRE | sim | — | — |
| Atletismo | FOR | — | — | — |
| Atualidades | INT | — | — | — |
| Ciências | INT | sim | — | — |
| Crime | AGI | sim | sim | sim |
| Diplomacia | PRE | — | — | — |
| Enganação | PRE | — | — | sim |
| Fortitude | VIG | — | — | — |
| Furtividade | AGI | — | sim | — |
| Iniciativa | AGI | — | — | — |
| Intimidação | PRE | — | — | — |
| Intuição | PRE | — | — | — |
| Investigação | INT | — | — | — |
| Luta | FOR | — | — | — |
| Medicina | INT | — | — | sim |
| Ocultismo | INT | sim | — | — |
| Percepção | PRE | — | — | — |
| Pilotagem | AGI | sim | — | — |
| Pontaria | AGI | — | — | — |
| Profissão | INT | sim | — | — |
| Reflexos | AGI | — | — | — |
| Religião | PRE | sim | — | — |
| Sobrevivência | INT | — | — | — |
| Tática | INT | sim | — | — |
| Tecnologia | INT | sim | — | sim |
| Vontade | PRE | — | — | — |

| regra | fonte | comportamento | est. |
|---|---|---|---|
| Bônus por grau: destreinado 0, treinado +5, veterano +10, expert +15 | OPRPG p.40 | calculado e mostrado com a composição | **A** |
| Perícias treinadas = origem (2) + classe + Intelecto | OPRPG p.39 | a criação conta o saldo e impede passar | **A** |
| Perícia repetida entre origem e classe: escolhe outra | OPRPG p.22 | a criação detecta e pede a substituta | **A** |
| Grau da ficha e grau efetivo | — | o seletor do modo edição muda o grau da ficha; o efetivo soma as escolhas de progressão e aparece ao lado | **A** |
| Perícia com carga aplica a penalidade de carga total | OPRPG p.40 | aplicado quando sobrecarregado | **A** |
| Bônus em testes de resistência | OPRPG p.25, 114 | mostrado à parte, não somado ao bônus geral de Fortitude, Reflexos e Vontade | **P** |
| Sem o kit exigido, −5 no teste | OPRPG p.40 | informado na perícia; não há controle de posse de kit | **I** |

A rolagem de perícia usa o motor central (`dependente`) e o mostrador de sempre,
que também sobe para o histórico da campanha. As parcelas do bônus aparecem
abertas no resultado.

## Classes

**OPRPG p.24-35.** Valores iniciais valem em NEX 5%; a partir daí, cada 5% de
NEX soma o valor "por NEX".

| classe | PV inicial | PV/NEX | PE inicial | PE/NEX | SAN inicial | SAN/NEX |
|---|---|---|---|---|---|---|
| Combatente | 20 + Vigor | 4 + Vigor | 2 + Presença | 2 + Presença | 12 | 3 |
| Especialista | 16 + Vigor | 3 + Vigor | 3 + Presença | 3 + Presença | 16 | 4 |
| Ocultista | 12 + Vigor | 2 + Vigor | 4 + Presença | 4 + Presença | 20 | 5 |

| classe | perícias treinadas | proficiências |
|---|---|---|
| Combatente | Luta **ou** Pontaria, Fortitude **ou** Reflexos, mais 1 + Intelecto | armas simples, armas táticas, proteções leves |
| Especialista | 7 + Intelecto | armas simples, proteções leves |
| Ocultista | Ocultismo e Vontade, mais 3 + Intelecto | armas simples |

```
passos   = NEX / 5                      (NEX 5% → 1, NEX 99% → 20)
PV       = PVinicial + (passos − 1) × (PVporNex)
PE       = PEinicial + (passos − 1) × (PEporNex)
SAN      = SANinicial + (passos − 1) × (SANporNex)
```

## NEX

| regra | fonte | comportamento | est. |
|---|---|---|---|
| Começa em 5%; sobe 5% por missão concluída | OPRPG p.23 | campo em passos de 5%, de 5% a 99% | **A** |
| Limite de PE por turno = tabela 1.2 | OPRPG p.23 | calculado: NEX 5%→1 … 95%→19, 99%→20 | **A** |
| Sempre pode usar uma habilidade no custo mínimo, mesmo acima do limite | OPRPG p.23 | informado junto do limite | **I** |
| NEX 100% só por desconjuração | OPRPG p.23 | teto de 99% na ficha | **A** |

## Estatísticas derivadas

| regra | fonte | comportamento | est. |
|---|---|---|---|
| Defesa = 10 + Agilidade + modificadores | OPRPG p.36 | calculado com composição visível | **A** |
| Proteção soma a Defesa cadastrada no item | OPRPG | só a proteção **em uso**, uma vez (a quantidade não multiplica) | **A** |
| Bloqueio = bônus de Fortitude | — | calculado com composição; + bônus extra de Bloqueio | **A** |
| Esquiva = Defesa + bônus de Reflexos | — | calculado com composição; usa a Defesa final; + bônus extra de Esquiva | **A** |
| Deslocamento padrão 9m | OPRPG p.36 | calculado; −3m sobrecarregado | **A** |
| Força soma no dano corpo a corpo e de arremesso | OPRPG p.15 | somado na rolagem de dano da ficha universal | **I** |

## Condições contadas por turno (v2.19)

Morrendo e enlouquecendo são regras de dano e de **Insanidade & Loucura**, OPRPG
p.88: ser reduzido a 0 PV deixa **inconsciente** e **morrendo**; iniciar três
turnos morrendo na mesma cena — não necessariamente consecutivos — mata. A
inconsciência termina com qualquer efeito que cure pelo menos 1 PV; morrendo, só
com Medicina (DT 20) ou efeitos específicos. Sanidade reduzida a 0 deixa
**enlouquecendo**; três inícios de turno enlouquecendo na mesma cena deixam o
personagem **insano** — um NPC sob controle do mestre. Enlouquecendo termina com
Diplomacia (DT 20) ou com qualquer efeito que cure pelo menos 1 de Sanidade.

| regra | fonte | comportamento | est. |
|---|---|---|---|
| 0 PV por dano → inconsciente e morrendo | OPRPG p.88 | pela ação **Dano** do PV | **A** |
| curar 1 PV encerra a inconsciência, não o morrendo | OPRPG p.88 | pela ação **Cura** do PV; morrendo continua, com o lembrete de Medicina | **A** |
| morrendo termina com Medicina (DT 20) ou efeito | OPRPG p.88 | **Encerrar**, à mão: a ficha não rola o teste | **P** |
| 0 SAN por dano mental → enlouquecendo | OPRPG p.88 | pela ação **Dano mental** da SAN | **A** |
| curar 1 SAN encerra enlouquecendo | OPRPG p.88 | pela ação **Recuperar** da SAN | **A** |
| Diplomacia (DT 20) encerra enlouquecendo | OPRPG p.88 | **Encerrar**, à mão | **P** |
| três inícios de turno na mesma cena | OPRPG p.88 | contagem por cena, com o resultado da regra no limite | **A** |
| inícios de turno pelo combate | OPRPG p.88 | só o início do turno do próprio personagem, no combate da campanha | **A** |
| Loucura Não Letal | OPRPG p.175 | citada no resultado; a ficha não a aplica | **I** |
| Machucado e Lesões | OPRPG p.88 e 174 | não marcados | **—** |

**Três coisas separadas.** O valor do recurso (`ordem.recursos`), a condição ativa
(`ordem.condicoes.<condição>.ativa`) e a contagem da cena (os eventos de início de
turno, `eventos`) são guardados cada um no seu lugar, e nenhum é deduzido de "PV
ou SAN é 0": uma ficha aberta com PV 0 não passa a morrer sozinha. As condições
mudam por três caminhos, e só por eles:

- as **ações com origem**, ao lado de cada recurso — Dano e Cura no PV; Dano mental e
  Recuperar na SAN; Gastar e Recuperar nos PE; Gastar, Dano mental e Recuperar nos
  PD. São elas que aplicam o que a regra liga àquela origem;
- os **controles da condição** — ficar morrendo/enlouquecendo, encerrar, "+1 início
  de turno", "−1 corrigir", "Nova cena";
- o **combate da campanha**, que soma inícios de turno (abaixo).

O número digitado no recurso continua sendo **ajuste manual**: muda o valor e mais
nada — sem origem, não há como saber se foi dano, custo ou correção. Quando o PV
ou a SAN chegam a 0 assim, a ficha sugere a condição, sem aplicá-la.

**A contagem.** Cada início de turno é um evento (`manual` ou `combate`) gravado
na cena atual: "Morrendo: 2 de 3 nesta cena", com marcadores. Encerrar a condição
interrompe a contagem enquanto ela estiver encerrada, mas **não apaga** os turnos
da cena: se ela voltar na mesma cena, a conta continua de onde estava. "+1" só
conta com a condição ativa e não passa do limite; "−1" tira o último da cena — e,
se ele veio do combate, o id fica descartado, para o mesmo turno não voltar a
contar. "Nova cena" zera a contagem e mantém as condições ativas: morrendo não
termina com a cena. No limite, a ficha mostra o resultado da regra — "o
personagem morre", "vira um NPC sob controle do mestre" — e **nada** mais
acontece: a ficha não é apagada, não muda de dono e não perde permissões. Nenhum
teste é rolado por um clique num marcador.

**O combate da campanha.** Com "Contar pelos turnos do combate" ligado (o
padrão), quem conta é o servidor, no mesmo lote que muda o turno
(`backend/Campanhas.gs`, "CONDIÇÕES E TURNOS"):

- conta só o **início do turno do personagem** afetado: o turno de outro
  participante não conta, e a rodada também não;
- cada início é um evento com id `cb:<combate>:<rodada>:<participante>`. O mesmo
  turno é o mesmo evento: mestre e jogador vendo a mesma mesa, duas abas, uma
  recarga ou um lote repetido pela rede não contam duas vezes;
- **Voltar turno** retira o evento do turno desfeito, e só ele: o que foi feito na
  ficha depois — uma condição encerrada, um "+1" ou um "−1" à mão — fica. Quem
  recebe a vez de volta não conta de novo: o início dele já tinha contado, ou não
  contava;
- **encerrar o combate não zera nada**: cena e combate são coisas diferentes, e
  outro combate na mesma cena continua a contagem;
- só a ficha que ainda está na campanha do combate é gravada. A ficha sobe uma
  revisão, como em qualquer gravação; quem está com ela aberta concilia os eventos
  pela união dos ids (`js/sync.js`). Uma ficha que não se monta não é tocada, e o
  mestre recebe o aviso para contar à mão.

Não há temporizador: nada conta porque o tempo passou.

**Visibilidade.** O painel da campanha e a lista do combate mostram as condições
ativas (e as encerradas que ainda têm turnos na cena) com a contagem, e só isso —
nunca os eventos. Seguem a regra dos recursos: com "Esconder status dos
jogadores", outros jogadores não as recebem.

### Jogando sem Sanidade: pontos de determinação

Com a regra ligada (SAH p.104-105), Sanidade e pontos de esforço viram um
recurso só, os **pontos de determinação** (PD):

| classe | PD iniciais | a cada novo NEX |
|---|---|---|
| Combatente | 6 + Pre | 3 + Pre |
| Especialista | 8 + Pre | 4 + Pre |
| Ocultista | 10 + Pre | 5 + Pre |
| Sobrevivente | 4 + Pre | 2 por estágio (a classe não está no R.A.M.A.) |

- o que soma PE soma PD (Dedicação, do Universitário, por exemplo); o que soma
  Sanidade, não — a regra manda ignorar as referências a Sanidade;
- efeitos que gastam PE gastam PD, e o limite de PE por turno vale para PD;
- **gastar PD não causa condição nenhuma** (SAH p.105): Gastar só tira pontos;
- **Dano mental** maior que os PD atuais deixa **enlouquecendo**; dano mental que
  deixa os PD abaixo da metade do total deixa **perturbado**. Recuperar pelo menos
  1 PD encerra enlouquecendo; voltar à metade ou mais encerra perturbado;
- o painel da mesa e a lista do combate mostram PV e PD.

**Os valores antigos ficam.** Ligar a regra não converte nada: os PE e a SAN
gastos continuam guardados (`recursos.pe` e `recursos.san`) e voltam como estavam
ao desligá-la. Os PD começam cheios na primeira vez e depois guardam o próprio
valor (`recursos.pd`). Somar PE e SAN, ou pegar o menor dos dois, seria inventar
uma conversão que o livro não dá.

**O que não é automático.** Reduzir os dados de dano mental das criaturas (um
passo por dado, metade dos dados), as visões de Medo, O Custo do Paranormal em
PD e as ações de interlúdio (dormir recupera só PV; relaxar recupera PD; prato
favorito dá 2 PD temporários) ficam com a mesa: a ficha não rola esses dados nem
tem interlúdio.

### Exaustão e desmaio: contadores da mesa

Nenhum dos dois livros tem uma contagem de exaustão ou de desmaio por PD (ou PE)
chegar a 0. Então eles são **contadores da mesa**, e a ficha diz isso em cada um:

- começam **desligados**, e ninguém é afetado até a mesa ligar;
- a mesa escolhe o limite (de 1 a 20 inícios de turno, ou nenhum) e como o
  contador fica ativo — **só à mão**, ou quando os PE/PD chegam a 0 por **gasto ou
  dano** (um ajuste manual não diz a origem e não ativa nada);
- a consequência é um texto da mesa; nenhuma consequência é aplicada;
- contam inícios de turno como morrendo — à mão e pelo combate —, cada um na sua
  lista. Exaustão, inconsciência e enlouquecendo são coisas separadas.

"Fatigado" e "exausto" existem no livro como condições de outros efeitos
(OPRPG p.310), e "inconsciente" é o que o 0 PV causa — nenhum deles tem prazo em
turnos. O R.A.M.A. não inventa um prazo de três turnos para eles.


## Origens

**OPRPG p.16-21.** As 26 origens, cada uma com duas perícias treinadas e um
poder.

| origem | poder | efeito | est. |
|---|---|---|---|
| Desgarrado | Calejado | +1 PV por 5% de NEX | **A** |
| Vítima | Cicatrizes Psicológicas | +1 Sanidade por 5% de NEX | **A** |
| Policial | Patrulha | +2 em Defesa | **A** |
| Teórico da Conspiração | Eu Já Sabia | resistência a dano mental = Intelecto | **A** |
| Universitário | Dedicação | +1 PE, +1 PE a cada NEX ímpar; limite de PE por turno +1 | **A** |
| Magnata | Patrocinador da Ordem | limite de crédito um acima (com a patente aplicada) | **A** |
| Cultista Arrependido | Traços do Outro Lado | um poder paranormal (vaga de escolha); **metade** da Sanidade | **A** |
| Engenheiro | Ferramentas Favoritas | um item, exceto armas, uma categoria abaixo (vaga de escolha) | **A** |
| Lutador | Mão Pesada | +2 no dano corpo a corpo | **I** |
| Militar | Para Bellum | +2 no dano com armas de fogo | **I** |
| Amnésico | Vislumbres do Passado | as duas perícias são escolhidas na criação | **P** |

As demais origens têm poderes condicionais, por cena ou por missão, e estão no
catálogo como **I**.

## Rituais

**OPRPG p. 117–143; SAH p. 48–56.** A aba Rituais é a mesma nas duas fichas —
universal e de Ordem —, com rótulos configuráveis. O que a camada de Ordem
acrescenta é o catálogo oficial, o custo em PE e os avisos da ficha.

| regra | fonte | comportamento | est. |
|---|---|---|---|
| Círculos 1º a 4º, elementos, execução, alcance, alvo/área/efeito, duração, resistência | OPRPG p.117-121 | campos do ritual, preenchidos pelo catálogo | **A** |
| Círculo máximo por classe e NEX (ocultista: 1º em 5%, 2º em 25%, 3º em 55%, 4º em 85%) | OPRPG p.33 | calculado, e avisado ao consultar um ritual | **A** |
| Custo: 1º=1 PE, 2º=3 PE, 3º=6 PE, 4º=10 PE (Tabela 5.2) | OPRPG p.119 | no catálogo, no cartão do ritual e no bloco `ordem` | **A** |
| Formas avançadas aumentam o custo | OPRPG p.121 | acréscimo e total calculados — o básico nunca é somado duas vezes | **A** |
| O limite de PE por turno limita o custo total | OPRPG p.121 | avisado ao consultar o ritual | **I** |
| DT de resistência = 10 + nível de exposição + Presença | OPRPG p.121 | calculada (`dtDeResistencia`) | **A** |
| Requisitos das formas avançadas (círculo mínimo, afinidade) | OPRPG p.121 | texto, e avisos comparando com a ficha | **I** |
| Custo do Paranormal: Ocultismo DT 20 + PE | OPRPG p.121 | texto em todo ritual que não é de Medo | **I** |
| Invocando o Medo: só Marcados, Sanidade permanente por conjuração | OPRPG p.121 | texto e aviso na ficha | **I** |
| Componentes, gestos, concentração, condições ruins e terríveis | OPRPG p.119 | texto | **I** |
| Limite de rituais conhecidos = Intelecto, e só para Aprender Ritual | OPRPG p.119 | contado ("usados de total", na aba Rituais e na Progressão) e conferido na escolha: o Aprender Ritual que passaria do limite é recusado, com o Intelecto daquela etapa no motivo | **A** |
| Aprender Ritual: círculo por NEX de exposição (1º; 2º a partir de 45%; 3º a partir de 75%) | OPRPG p.114 | escolhido pela biblioteca dentro da escolha do poder, conferido no NEX de exposição da etapa | **A** |
| Aprender Ritual: "pode substituir um ritual que já conhece por outro" | OPRPG p.114 | troca opcional na mesma escolha; ver lacuna 13 | **A** |
| Aprender Ritual: "quantas vezes quiser, mas está sujeito ao limite" | OPRPG p.114 | repetível; cada escolha conta 1 no limite | **A** |
| Aprender Ritual "conta como um poder do elemento do ritual escolhido" | OPRPG p.114 | o elemento vem do ritual; outro elemento é recusado, com o motivo | **A** |
| Três rituais iniciais de 1º círculo (ocultista) | OPRPG p.32 | concessão na criação | **A** |
| Um ritual a cada avanço de NEX, de qualquer círculo que possa lançar | OPRPG p.32 | uma concessão por degrau, com o círculo daquele degrau | **A** |
| Saber Ampliado e Grimório Ritualístico (Graduado) | OPRPG p.35 | concessões próprias, com quantidade e círculo próprios | **A** |
| Rituais Eficientes: +5 na DT de resistir aos seus rituais (Graduado) | OPRPG p.35 | entra na DT calculada | **A** |
| Rituais que uma trilha concede pelo nome (Canalizar o Medo, Lâmina Maldita…) | OPRPG p.34-35; SAH p.20 | concessão automática, com o botão de trazer a cópia | **A** |
| Limite por aprendizado lento | SAH p.113 | o ritual por avanço vem só nos degraus ímpares; ver **Regras opcionais** | **A** |
| Limite por aprendizado em campo: estudo com ação de interlúdio e Ocultismo DT 20/25/30/35 | SAH p.113 | nenhum ritual por avanço; o estudo é REGISTRADO com a confirmação da mesa e vira aquisição. O teste e a ação de interlúdio ficam com a mesa | **P** |
| Conjurando Rituais Desconhecidos | SAH p.117 | aviso junto dos registros: tentar conjurar não é aprender | **I** |
| Conjurar: gastar PE, testar resistência, aplicar condição | OPRPG p.119-121 | **não automatizado**: a ficha mostra os números e rola o que a versão tem | **I** |

**Registrar um ritual na ficha não é aprender nem conjurar.** Trazer da biblioteca
cria o registro com campos e versões preenchidos; não gasta PE, não rola dado, não
aplica efeito e **não resolve pendência de progressão** — aprender continua sendo
uma aquisição, que valida a elegibilidade dela.

### O aprendizado como progressão

Desde a v2.17, o que a classe e a trilha concedem em rituais é **progressão**, com
o mesmo modelo do resto: uma vaga por concessão, id estável, registro por vaga e
nada gravado que não tenha sido decidido.

| de onde vem | quantos | círculo | onde fica | conta no limite? |
|---|---|---|---|---|
| Escolhido pelo Outro Lado, na criação | 3 | 1º | conhecido | não |
| Escolhido pelo Outro Lado, a cada avanço | 1 por degrau | qualquer um que a classe lance **naquele degrau** | conhecido | não |
| Saber Ampliado (Graduado, NEX 10%) | 1 + 1 a cada círculo novo | 1º; depois, o círculo que acabou de abrir | conhecido | não |
| Grimório Ritualístico (Graduado, NEX 40%) | Intelecto + 1 opcional por círculo novo | 1º ou 2º; depois, o círculo novo | **grimório** | não |
| Aprender Ritual (poder paranormal) | 1 por escolha, repetível | 1º; 2º a partir de NEX 45%; 3º a partir de 75% — NEX de **exposição** | conhecido | **sim** |
| Trilha que concede pelo nome | 1, fixo | o do ritual | conhecido | não |
| Estudo em campo (só com a regra B, SAH p.113) | sem limite de quantidade | os que a classe lança **no estudo** | conhecido | não |
| Concessão da mesa (v2.18) | à mão, um por registro | qualquer — é exceção declarada | conhecido, marcado como exceção | não |

**Quatro estados, e não quatro etiquetas (v2.18).** A aba Rituais separa:

- **Conhecido** — alguma aquisição acima reivindica o ritual. Conjurar é gastar o
  PE do círculo.
- **Grimório** — reivindicado pelo Grimório Ritualístico. Para conjurar, é preciso
  empunhar o grimório e gastar uma ação completa folheando (OPRPG p.35).
- **Registro, sem aquisição** — está na ficha para consulta e **não** é conhecido:
  anotação da mesa, fonte achada e ainda não estudada, ficha anterior à v2.17. O
  menu oferece as saídas explícitas (prender a uma aquisição aberta, registrar o
  estudo em campo, registrar como concessão da mesa) — o R.A.M.A. nunca decide
  qual é, e nunca pelo nome.
- **Substituído** — trocado por Aprender Ritual (ver lacuna 13): continua na
  ficha, deixa de ser conhecido e pode ser aprendido de novo por outra aquisição.

**Uma regra por aquisição, e uma função que a confere.** Cada aquisição carrega a
regra dela — a concessão (círculos e elemento do degrau que a abriu), Aprender
Ritual (o círculo máximo do NEX de exposição daquela etapa), o estudo em campo (o
círculo que a classe lança no estudo), a mesa (nada limita). `avaliarContraRegra`,
em `js/ordem/aprendizado.js`, é a ÚNICA função que responde "este ritual cabe?", e
é chamada por três lugares que antes teriam cada um a sua conta: a biblioteca (para
dizer Disponível ou Indisponível, com o motivo), a gravação (que recusa) e cada
leitura da ficha (que mostra o problema de uma escolha que deixou de caber).
`contextoDeAquisicao`, em `progressao.js`, reúne para a tela o resto: de onde veio,
em que etapa, quantos rituais dá, quantos já foram escolhidos, que limite vale, se
exige confirmação e por que um ritual está ocupado.

**O círculo é conferido na ETAPA que concedeu.** Uma concessão de NEX 20% aceita
1º círculo mesmo num personagem de NEX 99% — o livro não dá acesso retroativo, e
resolver uma pendência antiga não empresta o alcance de hoje.

**O grimório é outro lugar, não outra etiqueta.** Os rituais dele aparecem numa
seção própria da aba Rituais, com a condição de uso escrita: para conjurar, é
preciso empunhar o grimório e gastar uma ação completa folheando; ele ocupa 1
espaço no inventário e, perdido, é replicado com duas ações de interlúdio (OPRPG
p.35).

**O limite por Intelecto conta só Aprender Ritual.** "Ocultistas aprendem rituais
através de suas habilidades de classe. Esses rituais não contam no limite" (OPRPG
p.119). A aba Rituais mostra a conta separada.

**Um ritual da ficha ocupa uma aquisição só.** O vínculo é com o id do ritual, e a
aquisição mais antiga reivindica primeiro; a segunda que tentar aparece com o
motivo, sem apagar nada. Na biblioteca, um ritual já reivindicado aparece como
indisponível ("já é o ritual de Saber Ampliado (NEX 10%), e um ritual não quita
duas aquisições"). Um ritual sem aquisição continua legítimo, como **registro**, e
o menu do cartão oferece prendê-lo a uma aquisição aberta que o aceite, **sem
criar outra cópia**.

**Trocar trilha, classe, NEX ou regra não apaga ritual.** A concessão some da
progressão, o registro dela fica guardado com o motivo, e os rituais continuam na
ficha, agora como registro. Se a concessão voltar, o vínculo volta sozinho. O
mesmo vale para o estudo em campo e a concessão da mesa: com a regra desligada, ou
registrados numa etapa que a ficha não alcança mais (o NEX foi corrigido para
baixo), eles ficam guardados sem efeito e voltam a valer sozinhos. Recalcular
nunca concede nada de novo: a progressão é refeita a partir das decisões gravadas,
a cada leitura.

**A mesa pode abrir exceção, de duas formas — e nenhuma é atalho.** Numa concessão,
um ritual fora da regra é recusado, mas "Manter mesmo assim" o aceita, marcado
como exceção, com o motivo continuando escrito (a mesma porta das outras escolhas
de progressão). Fora da progressão, **Registrar como concessão da mesa** faz o
ritual ser conhecido, marcado como exceção — e isso **não resolve pendência
nenhuma**: a concessão continua aberta, esperando o ritual dela.

### Gravar é uma operação só (v2.18)

Toda aquisição de ritual passa por `confirmarAquisicao`, em `progressao.js` — a
biblioteca, a janela de escolha (Transcender, Versatilidade, criação guiada), o
assistente de associação e o menu do cartão:

1. aplica as operações numa **cópia** do bloco de Ordem;
2. recalcula a progressão inteira com os rituais que existiriam, inclusive as
   cópias novas que ainda não estão na ficha;
3. recusa, com o motivo, se alguma operação não ficou válida — escolha
   incompleta, ritual fora da regra, limite por Intelecto estourado, ritual de
   outra aquisição, estudo sem confirmação;
4. só então troca, de uma vez, `escolhas` e `registrosDeRitual`, e põe na ficha as
   cópias novas que ficaram com aquisição.

Não existe gravação pela metade: ou tudo entra, ou nada. Não sobra ritual
adicionado sem a aquisição, poder sem o ritual obrigatório nem pendência marcada
como resolvida sem escolha válida. Uma escolha inválida **não** vira "registro
manual" em silêncio: a janela diz "Não foi gravado" e o motivo. Repetir a mesma
confirmação — clique duplo, reabrir a janela, recalcular, a mesma requisição de
novo — não duplica: um ritual com id que já está na ficha não entra outra vez, uma
vaga é decidida por inteiro, e um segundo registro para o mesmo ritual é recusado
porque ele já tem aquisição.

Até a confirmação, tudo é **provisório**: a seleção da biblioteca e as cópias
montadas vivem na janela (`sessao.novos`). Cancelar, fechar ou Esc descartam só
isso. A gravação da ficha continua a de sempre — uma alteração, o salvador com a
revisão e o controle de conflito, e a proteção de tamanho do armazenamento em
blocos.

**E o servidor?** O Apps Script guarda a ficha como dado opaco: confere a sessão,
o dono, a revisão e o tamanho em toda gravação, mas não conhece as regras de Ordem
— não conhecia antes desta versão, e não passou a conhecer. O que protege a ficha
contra uma aquisição inválida que chegue por fora da tela (um arquivo importado,
um pedido montado à mão) é a leitura: toda leitura reavalia cada aquisição com a
mesma `avaliarContraRegra`, mostra o problema e **não conta** o ritual como
conhecido — nada é concedido por ter sido gravado.

### Biblioteca de rituais

No modo edição da aba Rituais, **Da biblioteca** abre duas origens: **Ordem
Paranormal** (o catálogo dos dois livros) e **Homebrew** (os rituais da conta e os
que outras contas publicaram, filtrados no servidor). Na ficha universal, só a
Homebrew. Criar ritual à mão continua igual.

**A mesma janela resolve uma aquisição (v2.17; refeita na v2.18).** Aberta pela
Progressão, pela criação guiada, pela aba Rituais ("Escolher rituais", "Registrar
estudo em campo") ou por Aprender Ritual dentro de Transcender, ela recebe o
contexto da aquisição e mostra:

- no topo, de onde o benefício veio, em que etapa, a regra (círculo, elemento,
  limite por Intelecto) com a página do livro, os rituais **já nesta concessão**
  (com Tirar/Manter) e os rituais **já na ficha, sem aquisição**, que podem
  ocupá-la sem virar cópia;
- em cada ritual, um controle próprio, AO LADO do botão que abre os detalhes — o
  resultado nunca é um botão com botões dentro: **Disponível**, **Selecionado** ou
  **Indisponível**, com o motivo por extenso ("Esta concessão aceita 1º círculo;
  este ritual é de 2º", "já é o ritual de…", "tire um antes de pôr outro");
- no rodapé, a conta ("Escolhidos: 2 de 3 · faltam 1 (a confirmar)");
- antes de gravar, o **resumo**: cada ritual, se é cópia nova (Ordem Paranormal ou
  Homebrew) ou um que já está na ficha, e a que aquisição ele fica preso.

Abrir os detalhes não seleciona, e selecionar não muda busca, filtros nem a
posição da lista. "Só os que cabem nesta aquisição" começa ligado e mostra quantos
cabem; desligado, o resto aparece com o motivo. A origem começa em Ordem
Paranormal, com a Homebrew a um clique — as permissões da Homebrew são as de
sempre, filtradas no servidor. Cancelar, fechar ou Esc descartam a seleção e
devolvem o foco a quem abriu; nada vai para a ficha antes de Confirmar. Busca,
filtros, prévia, fontes e versões são os mesmos da janela comum: nada foi
duplicado para isto.

Aberta pela aba Rituais sem aquisição, a janela continua a de antes: **Adicionar à
ficha** traz a cópia como **registro**, na hora, e diz que nenhum PE foi gasto e
que registrar não resolve pendência.

**Por que o seletor aparecia cinza e apertado (corrigido na v2.18).** Os estilos da
biblioteca (`.bib-*`) moravam em `css/ficha.css`, que só a página da ficha carrega.
A v2.17 passou a abrir a janela também na lista de personagens, na criação guiada
— e lá a janela chegava sem estilo nenhum: o botão de cada resultado com o fundo
cinza padrão do navegador e o nome, o círculo e o custo espremidos numa linha. Na
ficha, onde o estilo existia, a lista tinha rolagem própria (cerca de metade da
altura da tela) dentro da janela, que também rola. Os
estilos foram para `css/componentes.css`, que toda página carrega; dentro de uma
janela a lista não rola mais sozinha (uma rolagem só, a da janela); e o teste do
navegador abre a janela **sem** `ficha.css` para travar isso.

O catálogo é dado, separado da tela: `js/ordem/rituais-dados.js` só é carregado na
primeira vez que a janela abre, fica congelado na memória e **nunca vai junto na
gravação da ficha**.

Os filtros são os do material: **elemento** (Conhecimento, Energia, Morte, Sangue
e Medo, mais "Todos"), **círculo** (1º ao 4º, mais "Todos") e **livro**, que só
aparece porque há conteúdo de duas fontes. Cada filtro mostra quantos resultados
tem, contando com os outros filtros já aplicados; a busca ignora acento e caixa, e
os filtros e a posição da lista continuam onde estavam depois de adicionar um
ritual. Não existe filtro "Varia": nenhum ritual do material precisa dele —
Amaldiçoar Arma pertence a quatro elementos e aparece em cada um.

### Transcender → Aprender Ritual (v2.18)

O texto inteiro do poder (OPRPG p.114): aprende e pode conjurar um ritual de 1º
círculo à escolha; "além disso, você pode substituir um ritual que já conhece por
outro"; a partir de 45% de NEX, um ritual de até 2º círculo, e a partir de 75%, de
até 3º; "pode escolher esse poder quantas vezes quiser, mas está sujeito ao limite
de rituais conhecidos"; e "conta como um poder do elemento do ritual escolhido". O
limite é o Intelecto, e só este aprendizado conta nele (OPRPG p.119).

O fluxo, em qualquer classe:

1. Progressão → a vaga de poder (ou, com NEX & Experiência, a oportunidade de
   Transcender da exposição) → **Transcender** → **Aprender Ritual**.
2. A janela mostra a regra da etapa: "Um ritual de até 1º círculo — o que Aprender
   Ritual alcança com NEX de exposição 15%… Conta no limite: 0 de 3 antes desta
   escolha." Com o limite esgotado, o aviso aparece antes de escolher.
3. **Escolher na biblioteca** abre a biblioteca de rituais no contexto do poder
   (Ordem Paranormal e Homebrew), com os rituais da ficha sem aquisição no topo. O
   que passa do círculo, estoura o limite ou já é de outra aquisição aparece
   indisponível, com o motivo.
4. **Usar este ritual** volta para a escolha. Uma cópia nova fica **pendente**
   ("entra na aba Rituais só quando esta escolha for confirmada"); um ritual que
   já estava na ficha é usado como está, sem cópia. O elemento do poder passa a
   ser o do ritual, e os outros ficam indisponíveis, com o motivo.
5. Opcional: **Substituir um ritual conhecido** — escolhe o que sai (entre os
   conhecidos ANTES desta etapa, fora do grimório) e o que entra, pela biblioteca,
   no contexto da aquisição do que sai.
6. O rodapé resume o que vai acontecer; **Confirmar** grava a escolha e a cópia
   juntas, por `confirmarAquisicao`. Cancelar não deixa nada: nem ritual, nem
   poder.

A biblioteca, aqui, **devolve** o ritual escolhido e não grava nada — e a
devolução não é um atalho: a escolha inteira é conferida de novo na gravação e em
toda leitura, com a mesma regra. Um ritual devolvido que não coubesse seria
recusado ali, e não viraria registro manual.

**O marco é o que concedeu.** O círculo de Aprender Ritual é o do NEX de exposição
da etapa em que ele foi escolhido, e o limite é o Intelecto daquela etapa. Com NEX
& Experiência, Transcender deixa de ser poder de classe, e Aprender Ritual continua
olhando para o NEX de exposição — é poder paranormal (SAH p.98): um especialista
de nível 3 com exposição 50% alcança o 2º círculo; na oportunidade de exposição
25%, só o 1º.

### Cobertura, ritual por ritual

| elemento | 1º / 2º / 3º / 4º | livro básico | SAH | rituais |
|---|---|---|---|---|
| Conhecimento | 8 / 6 / 5 / 4 | 19 | 4 | Alterar Memória, Amaldiçoar Arma, Aprimorar Mente, Aurora da Verdade*, Compreensão Paranormal, Contato Paranormal, Controle Mental, Desfazer Sinapses*, Detecção de Ameaças, Enfeitiçar, Esconder dos Olhos, Inexistir, Invadir Mente, Localização, Mergulho Mental, Ouvir os Sussurros, Perturbação, Possessão, Pronunciar Sigilo*, Relembrar Fragmento*, Tecer Ilusão, Terceiro Olho, Vidência |
| Energia | 8 / 6 / 6 / 3 | 19 | 4 | Alterar Destino, Amaldiçoar Arma, Amaldiçoar Tecnologia, Chamas do Caos, Coincidência Forçada, Contenção Fantasmagórica, Convocação Instantânea, Deflagração de Energia, Dissonância Acústica, Eletrocussão, Embaralhar, Luz, Milagre Ionizante*, Mutar*, Overclock*, Polarização Caótica, Salto Fantasma, Sopro do Caos, Tela de Ruído, Teletransporte, Transfigurar Terra, Transfigurar Água, Tremeluzir* |
| Morte | 8 / 6 / 5 / 4 | 19 | 4 | Amaldiçoar Arma, Apagar as Luzes*, Cicatrização, Consumir Manancial, Convocar o Algoz, Decadência, Definhar, Desacelerar Impacto, Distorção Temporal, Eco Espiral, Espirais da Perdição, Fedor Pútrido*, Fim Inevitável, Língua Morta*, Miasma Entrópico, Nuvem de Cinzas, Paradoxo, Poeira da Podridão, Singularidade Temporal*, Tentáculos de Lodo, Velocidade Mortal, Zerar Entropia, Âncora Temporal |
| Sangue | 8 / 6 / 5 / 4 | 19 | 4 | Amaldiçoar Arma, Aprimorar Físico, Arma Atroz, Armadura de Sangue, Capturar o Coração, Corpo Adaptado, Descarnar, Distorcer Aparência, Esfolar*, Ferver Sangue, Flagelo de Sangue, Forma Monstruosa, Fortalecimento Sensorial, Hemofagia, Invólucro de Carne, Martírio de Sangue*, Odor da Caçada*, Purgatório, Sede de Adrenalina*, Transfusão Vital, Vomitar Pestes, Vínculo de Sangue, Ódio Incontrolável |
| Medo | 1 / 2 / 1 / 5 | 9 | 0 | Canalizar o Medo, Cinerária, Conhecendo o Medo, Dissipar Ritual, Lâmina do Medo, Medo Tangível, Presença do Medo, Proteção contra Rituais, Rejeitar Névoa |

Total: **98 rituais** — 82 do livro básico (toda a Lista de Rituais, p. 122–143) e
16 do Sobrevivendo ao Horror (Novos Rituais, p. 48–56). Os marcados com `*` são do
SAH. Amaldiçoar Arma conta em quatro elementos, e é por isso que a soma por
elemento passa de 98.

### O que a ficha faz com o ritual adicionado

| campo do catálogo | onde entra na ficha | est. |
|---|---|---|
| círculo, elemento, execução, alcance, alvo/área/efeito, duração, resistência | os campos do ritual, com os rótulos da seção | **A** |
| resumo, efeitos, formas avançadas, regras e a fonte | a descrição da cópia, em redação própria | **A** |
| custo em PE da forma básica | `ordem.custo` (o do círculo) e a linha "Custo" do cartão | **A** |
| custo adicional de cada versão | `versoes[].custo`, com o total calculado | **A** |
| requisito e alterações de cada versão | `versoes[].requisito` e `alteracoes`, mostrados no cartão | **I** |
| expressão de dano | `versoes[].dano` + `danoExtra`, no botão de rolagem | **A** |
| cura e outras rolagens | `versoes[].rolagens`, com tipo e rótulo próprios | **A** |
| elemento e círculo como número | o bloco `ordem`, que alimenta os avisos | **A** |
| escolha do elemento (Amaldiçoar Arma) | pedida ao adicionar e gravada no ritual | **A** |
| efeitos com condição, teste, ação ou custo extra | texto na descrição | **I** |

Dos 98 rituais, **37 têm alguma expressão de dados** (dano, cura ou outra rolagem)
e 61 não têm nenhuma — e para esses a ficha não inventa botão. As rolagens saem
pelo motor de dados da ficha e pelo mostrador de sempre, que entrega a rolagem ao
histórico da campanha com a chave de idempotência: uma falha de envio não rola de
novo nem duplica a linha.

### Divergências e lacunas do capítulo de rituais

Cada uma está na própria entrada, em `notas`, e aparece na janela como "Nota:".

| conteúdo | divergência | o que o catálogo faz |
|---|---|---|
| Milagre Ionizante (SAH) | impresso como "ENERGIA 3", num capítulo em que cada elemento tem um ritual de cada círculo (Energia fica com dois de 3º e nenhum de 4º) | mantém o 3º círculo impresso |
| Deflagração de Energia | o livro não informa a duração | o campo fica vazio, com nota |
| Deflagração de Energia | dano "3d10 x 10" | a rolagem entrega os 3d10 e a multiplicação fica com quem joga — o motor não multiplica expressões |
| Eco Espiral | o dano é igual ao que o alvo sofreu na rodada | sem expressão para rolar, com nota |
| Transfusão Vital | a quantidade transferida é escolhida na hora (até 30, 50 ou 100 PV) | sem expressão para rolar, com nota |
| Espirais da Perdição | a forma discente e a verdadeira imprimem a mesma penalidade (−2 dados) | registra as duas como estão, com nota |
| Coincidência Forçada, Desacelerar Impacto, Descarnar | a linha do livro diz "Alvos" (plural) | entra no campo `alvo`, como nos outros |
| Dissipar Ritual | "Alvo ou Área" | preenche os dois campos, com nota |
| Purgatório | "Alvo: área de 6 m de raio" | o valor é uma área e está em `area`, com nota |

## Regras opcionais

Todas do **SAH**, capítulo 2, "Novas Regras Opcionais" (p.98-123). Começam
**desativadas**, como manda o próprio livro.

| regra | fonte | efeito na ficha | est. |
|---|---|---|---|
| NEX & Experiência (separar nível e NEX) | SAH p.98-103 | ver seção própria | **A** |
| Jogando sem Sanidade | SAH p.104-105 | pontos de determinação (PD) no lugar de PE e SAN — ver [Jogando sem Sanidade: pontos de determinação](#jogando-sem-sanidade-pontos-de-determinação) | **P** |
| Ferimentos Debilitantes | SAH p.105 | registro de ferimentos | **P** |
| Jogando sem Mapa | SAH p.106 | não afeta a ficha | **I** |
| Evolução por Patentes | SAH p.108-112 | progressão por patente em vez de NEX | **P** |
| Limite de rituais por aprendizado lento (A) | SAH p.113 | o ritual por avanço vem só nos degraus ímpares | **A** |
| Limite de rituais por aprendizado em campo (B) | SAH p.113 | nenhum ritual por avanço; o estudo é registrado com a confirmação da mesa e vira aquisição | **P** |
| Conjuração Complexa | SAH p.114-116 | campos a mais no ritual | **P** |
| Aprender um ritual sobe o NEX pelo círculo dele (parte de NEX & Experiência) | SAH p.99 | avisado; o NEX é ajustado pela mesa | **I** |
| Conjurando Rituais Desconhecidos | SAH p.117 | aviso junto dos registros da aba Rituais; não muda conta nenhuma | **I** |
| Desastres Paranormais | SAH p.117-118 | não afeta a ficha | **I** |
| Combate Narrativo | SAH p.119-123 | não afeta a ficha | **I** |

A chave "Aplicar regras de patente" **não** é uma destas regras: é configuração
da ficha, e começa ligada.

### Na criação guiada

As regras marcadas `progressao: true` em `js/ordem/opcionais.js` — **NEX &
Experiência** e **Evolução por Patentes**, as que trocam o trilho de progressão —
aparecem na etapa **Revisão**, entre o resumo e "Falta decidir". Elas mudam quais
pendências existem (com NEX & Experiência surgem, por exemplo, `x25.alteracao` e
`x25.transcender`), então a pergunta vem antes de a pessoa resolver a progressão.
As outras regras continuam só na aba Regras da ficha.

- É a mesma chave (`ordem.opcionais`) e vai gravada na ficha criada, com a mesma
  incompatibilidade entre as duas.
- **No rascunho**, ligar NEX & Experiência põe o nível no equivalente ao NEX
  escolhido (NEX 25% → nível 5) e mantém o NEX como exposição; o cartão mostra
  **Nível de experiência** e **NEX por exposição** para ajustar, e a etapa Conceito
  passa a pedir os dois. Desligar devolve ao NEX o equivalente ao nível (nível 7 →
  NEX 35%): o personagem fica no mesmo degrau. A aba Regras da ficha **não**
  converte ao desligar — lá o NEX guardado é preservado.
- Com alguma decisão já tomada na revisão, mudar a regra pede confirmação. Nada é
  apagado; o que ficar numa etapa não alcançada fica guardado, sem efeito.
- Evolução por Patentes ainda não tem a tabela estruturada (**P**): o cartão avisa
  que ligar não muda as pendências.

### NEX & Experiência, em detalhe

**SAH p.98-103.**

- **Nível de experiência** manda em Benefícios por NEX, pré-requisitos de
  habilidades de classe (exceto poderes paranormais) e efeitos de origens e
  habilidades baseados em NEX. **1 nível = 5% de NEX.** As vagas de classe
  (`d3.poderClasse` e companhia) seguem o nível.
- **NEX** mede só a exposição. Continua valendo para afinidade elemental,
  efeitos de poderes paranormais ("+1 PE por NEX" de Potencial Aprimorado olha o
  NEX) e imunidade à Presença Perturbadora.
- **Transcender** deixa de ser poder de classe e não afeta a Sanidade. Com a
  regra ligada, Transcender some da lista de poderes de classe (com o motivo), e
  a exposição abre uma oportunidade opcional em cada valor de NEX com alteração:
  25%, 35%, 50%, 60%, 75% e 90% (`x25.transcender`). Dá para recusar.
- **Alterações gerais.** NEX 25%: Ocultismo sem treino, +2 se treinado, e −5 numa
  perícia entre Diplomacia, Enganação e Intimidação. NEX 35%: um atributo
  (exceto Presença) somado aos PE e −5 numa perícia entre Atletismo, Fortitude e
  Reflexos. As duas viram vagas com escolha e entram na conta.
- **Alterações por elemento** (NEX 60%, 75% e 90%) são descritivas, com
  penalidades em dados, rituais e efeitos de cena: **—**, não automatizadas.
- Ligar a regra numa ficha com Transcender já escolhido como poder de classe
  marca essa escolha como problema — sem apagar. Desligar faz ela voltar a valer.

Exemplos do livro que viraram teste: Proteção Pesada exige NEX 30% → nível 6;
Calejado dá +1 PV por nível.

### As regras opcionais e o aprendizado de rituais (v2.18)

"Os Limites da Compreensão Humana" (SAH p.113) apresenta **duas** regras, A e B,
para o mesmo problema — a raridade dos rituais. As outras regras abaixo tocam no
aprendizado por outro lado. Para cada uma: o que muda, o que o R.A.M.A. faz e
onde o livro não diz.

**A — Limite por aprendizado lento** (`limitesCompreensao`).

- *O que muda:* os três rituais iniciais continuam; o ritual de Escolhido pelo
  Outro Lado vem "sempre que atinge um NEX ímpar (NEX 15%, 25%, 35% etc.), e não a
  cada novo NEX".
- *Concessões afetadas:* as de avanço (`d<degrau>.ritualClasse`) dos degraus pares
  deixam de existir. O que já tinha sido escolhido nelas fica guardado, sem
  efeito — os rituais viram registro —, e volta se a regra for desligada.
- *Graduado:* não muda (lacuna 25). *Transcender e Aprender Ritual:* não mudam.
- *Nível separado:* "o ocultista aprende um novo ritual a cada nível ímpar" — o
  degrau é o nível (lacuna 12).
- *Depende da campanha:* não.

**B — Limite por aprendizado em campo** (`aprendizadoEmCampo`).

- *O que muda:* os três iniciais continuam, e nenhum ritual vem ao avançar "de NEX
  (ou nível de experiência)". Novos rituais são encontrados em jogo e aprendidos
  por estudo: uma ação de interlúdio e Ocultismo DT 20, 25, 30 ou 35 pelo círculo;
  falhou, pode tentar de novo com outra ação; "qualquer quantidade de rituais
  dessa forma, mas só […] de círculos aos quais tenha acesso". Um selo paranormal
  (OPRPG p.151) também serve, e é destruído qualquer que seja o resultado.
- *Concessões afetadas:* todas as de avanço somem (guardadas, como em A).
- *Graduado:* não muda (lacuna 25). *Transcender e Aprender Ritual:* não mudam — o
  estudo não conta no limite por Intelecto, que é só de Aprender Ritual (OPRPG
  p.119), e o livro diz "qualquer quantidade".
- *Nível separado:* o acesso a círculo é de Escolhido pelo Outro Lado, benefício
  de classe — segue o nível.
- *Depende da campanha:* **sim.** Achar a fonte e passar no teste são
  acontecimentos da mesa, e selecionar um ritual na biblioteca não prova nenhum
  dos dois. **Registrar estudo em campo** (aba Rituais) pede a fonte (composição
  ou registro, objeto amaldiçoado, selo), uma nota e a confirmação explícita de que
  a fonte foi achada e o teste passou; sem ela, a gravação recusa. O R.A.M.A.
  mostra a DT, mas não rola o teste nem gasta a ação. O círculo é conferido no
  degrau do estudo, que fica gravado; só ocultistas estudam.

**NEX & Experiência** (`nexExperiencia`, SAH p.98-99).

- *O que muda:* as concessões de classe e de trilha (iniciais, avanço, Graduado)
  seguem o **nível**; Aprender Ritual segue o NEX de **exposição**. Transcender
  deixa de ser poder de classe e vira oportunidade opcional nas alterações de
  exposição (`x25.transcender`…).
- "Sempre que o personagem aprende um ritual, seu NEX aumenta em um valor igual ao
  círculo do ritual (isso inclui os rituais iniciais)" (p.99): avisado, não
  aplicado (lacuna 24).
- *Convive com* A e B — as duas a citam.

**Evolução por Patentes** (`evolucaoPatentes`, SAH p.108-112).

- *O que o livro diz:* o ocultista "começa com três rituais de 1º círculo. Sempre
  [que] avança de patente, aprende dois rituais de qualquer círculo que possa
  lançar. Esses rituais não contam no seu limite"; o 2º círculo vem como agente
  especial, o 3º como oficial de operações e o 4º como agente de elite (p.112).
- *O que o R.A.M.A. faz:* **não calcula.** O trilho por patente não está
  estruturado (ver a regra na tabela acima): com ela ligada, as concessões
  continuam seguindo NEX ou nível, e a aba Rituais e a Progressão avisam com os
  números do livro. A diferença fica com a mesa — por exemplo, com **Registrar
  como concessão da mesa**. Ver lacuna 23.

**Conjurando Rituais Desconhecidos** (`rituaisDesconhecidos`, SAH p.117).

- Não é aprendizado: permite **tentar** conjurar um ritual que não se conhece —
  exige treino em Ocultismo e informação básica (ter visto a conjuração, um texto,
  uma gravação), a critério do mestre, e segue os passos da Conjuração Complexa,
  com DT +5 e desastre paranormal na falha.
- Com a regra ligada, a seção de registros da aba Rituais avisa disso e repete que
  tentar não é aprender. O registro continua não conhecido.

**Conjuração Complexa** (SAH p.114-116) muda como se conjura, não o que se aprende.
O "acesso a um círculo adicional" dela vale para os aprimoramentos da conjuração —
o R.A.M.A. não o usa para liberar círculo de aprendizado.

**Quem convive com quem.** A e B se excluem: dizem coisas opostas sobre o ritual
por avanço, e a tela não deixa ligar as duas. A e B convivem com NEX & Experiência
(o texto das duas prevê o nível). Evolução por Patentes e NEX & Experiência são
incompatíveis no R.A.M.A. desde antes desta versão (lacuna 27). Conjurando Rituais
Desconhecidos e Conjuração Complexa convivem com todas.

**Ligar e desligar não apaga.** Qualquer uma dessas trocas recalcula as pendências
na hora: concessões que somem guardam as escolhas, sem efeito; estudos em campo
com a regra desligada ficam guardados, com o motivo, e voltam ao religar. Os
rituais continuam na ficha.

## Sobrevivendo ao Horror — conteúdo de personagem

| conteúdo | fonte | est. |
|---|---|---|
| Novos poderes de Combatente, Especialista e Ocultista (31) | SAH p.14-27 | **A** no catálogo e nas escolhas; efeitos conforme a tabela de cobertura |
| Novas trilhas (9) | SAH p.15-29 | **A** no catálogo e nas escolhas |
| Poderes gerais (34) | SAH p.33-36 | **A** no catálogo e nas escolhas |
| Poderes paranormais (8) | SAH p.46-47 | **A** no catálogo e nas escolhas |
| Novas origens | SAH p.7-13 | — |
| Nova classe: Sobrevivente | SAH p.30-32 | — |
| Equipamentos e itens amaldiçoados (Tabelas 1.4, 1.5 e 1.6) | SAH p.37-45, 55-61 | **A** no catálogo de itens; efeitos conforme a matriz da [Biblioteca de itens](#biblioteca-de-itens) |
| Novos rituais (16, um por elemento e círculo) | SAH p.48-56 | **A** no catálogo de rituais |
| Fabricação em campo | SAH p.94 | — |

---

## Lacunas e interpretações

Registradas em vez de preenchidas por dedução. Onde o livro deixa uma leitura
aberta, a adotada está escrita — e é a que os testes travam.

1. **DT de resistência a rituais.** A fórmula do capítulo de rituais (OPRPG p.121)
   está implementada: 10 + nível de exposição + Presença, mostrada ao consultar um
   ritual na biblioteca. A DT de outras habilidades (p.78) continua não
   estruturada.

2. **Tabela de PV/PE/SAN por NEX.** O livro dá o valor inicial e o incremento por
   nível de exposição, mas não uma tabela fechada para conferir linha a linha.

3. **Tabela 2.1 de perícias (OPRPG p.40).** A extração de texto embaralha as
   colunas; os atributos-base foram tirados dos títulos das perícias.

4. **Resistir a <Elemento>.** O nome com o elemento entre sinais sugere um poder
   por elemento, mas o texto não diz se ele pode ser escolhido para elementos
   diferentes. O R.A.M.A. trata cada elemento como escolha distinta (Resistir a
   Morte e Resistir a Sangue podem coexistir) e só permite repetir o **mesmo**
   elemento pela afinidade, para chegar a 20.

5. **Segunda escolha no mesmo transcender que desenvolve a afinidade.** "Na
   primeira vez que transcender após isso, irá desenvolver afinidade" (OPRPG
   p.114) não diz se o poder recebido nesse mesmo transcender já pode ser a
   segunda escolha. O R.A.M.A. permite — proibir seria inventar requisito.

6. **Ordem das escolhas com nível e NEX separados.** Com a regra, as vagas de
   nível e as de exposição não têm uma ordem cronológica gravada. O motor as
   intercala pelo degrau equivalente (1 nível = 5% de NEX) para conferir requisitos
   como "Morte 2".

7. **Transcender e Cultista Arrependido.** Com "metade da Sanidade normal para
   sua classe", a Sanidade não ganha por Transcender é descontada antes de dividir
   ao meio.

8. **Ele Me Ensina (Possuído, SAH p.28).** "Escolha entre transcender ou..." é
   tratado como receber um poder paranormal, **sem** o custo em Sanidade do poder de
   classe Transcender, que o texto não repete.

9. **Mochila de Utilidades com quantidade.** "Um item [...] ocupa 1 espaço a menos":
   aplicado a uma unidade do item escolhido, não a cada unidade.

10. **Mochila Militar com quantidade.** O aumento de capacidade conta uma vez por
    item, não por unidade.

11. **Profissão com especialidade.** Parapsicólogo exige Profissão (psicólogo) e
    Mascate treina Profissão (armeiro, engenheiro ou químico). O R.A.M.A. tem uma
    perícia Profissão só: o requisito confere o treinamento em Profissão, e a
    especialidade fica com a mesa.

12. **"NEX ímpar", no limite por aprendizado lento.** "Um ocultista começa com
    três rituais de 1º círculo, mas aprende um novo ritual sempre que atinge um NEX
    ímpar (NEX 15%, 25%, 35% etc.), e não a cada novo NEX. Se estiver usando a
    regra opcional de Nível de Experiência, o ocultista aprende um novo ritual a
    cada nível ímpar" (SAH p.113). O R.A.M.A. lê **degrau ímpar**, que é o que faz
    as duas metades da frase coincidirem: NEX 15% é o 3º degrau e o nível 3, NEX
    25% é o 5º e o nível 5. A única divergência entre as duas leituras é NEX 99%,
    que é ímpar como número e é o 20º degrau: pela leitura do R.A.M.A. ele não dá
    ritual. A mesa que quiser o contrário resolve com uma concessão à mão.

13. **O que "substituir um ritual que já conhece" alcança (refeita na v2.18).**
    Aprender Ritual permite a troca (OPRPG p.114) e não diz que regra segue o
    ritual que ENTRA, nem se o que sai pode ser do grimório. O R.A.M.A. lê que o
    que entra **toma o lugar** do que sai: herda a aquisição dele e é conferido
    pela regra dela — o círculo daquela concessão, o do Aprender Ritual daquela
    etapa, e o limite por Intelecto, se o que saiu contava nele. O que sai é um
    ritual **conhecido antes desta etapa**; o do grimório fica de fora, porque o
    grimório guarda o que a mente não guarda (OPRPG p.35). O que entra não pode
    ser o mesmo que sai, nem o que este Aprender Ritual ensina, nem um ritual de
    outra aquisição. O ritual substituído continua na ficha, deixa de ser
    conhecido e pode ser aprendido de novo por outra aquisição. A troca é
    opcional e é feita na própria escolha do poder, com as duas pontas
    obrigatórias: metade de uma troca não é aceita. A v2.17 guardava só o que
    saía (`substituido`), sem o que entrava; esse registro é mostrado como nota e
    não vale como troca. É a ÚNICA substituição que as regras dão — trocar uma
    escolha na Progressão é corrigir a ficha, e aparece como correção.

14. **Monstruoso usa a Progressão de NEX mesmo sem a regra** (SAH p.17). A trilha
    está no catálogo com os efeitos permanentes de atributo; as alterações da
    Progressão de NEX para essa trilha sem a regra ligada não são aplicadas.

15. **Possuído: Poder Não Desejado com NEX & Experiência.** A troca de todo poder
    de ocultista por Transcender é aplicada pela ficha (SAH p.28). Com a regra
    opcional ligada, porém, Transcender deixa de ser poder de classe (SAH p.98) e
    não sobra poder para receber no lugar: o livro não resolve o encontro das duas
    regras, e o R.A.M.A. deixa a vaga livre, com a troca por conta da mesa. Os
    pontos de possessão também ficam com a mesa — não são um recurso da ficha.

16. **Escudo junto de proteção.** "Precisa ser empunhado em uma mão e fornece
    Defesa +2" (OPRPG p. 62) não diz explicitamente que ele soma com a proteção
    vestida. O R.A.M.A. soma: são equipamentos diferentes, em lugares diferentes,
    e a tabela dá Defesa própria ao escudo.

17. **Categoria de item que o livro não informa.** O medidor de estabilidade da
    membrana (OPRPG p. 67) está descrito, mas não na Tabela 3.10. A entrada fica
    **sem** categoria — nada é deduzido — e o item entra listado para a mesa
    classificar, com os espaços no padrão do livro.

18. **Selo paranormal.** "A categoria de um selo é igual ao círculo do ritual
    contido nele" (OPRPG p. 151): a janela pede o círculo ao adicionar e grava a
    categoria correspondente.

19. **Itens amaldiçoados sem estatísticas de arma.** A Primeira Adaga (SAH) e a
    Coletora (OPRPG) são descritas como arma, mas sem dano, margem ou
    multiplicador. O catálogo não inventa números: a nota diz de onde a mesa pode
    tirá-los (o punhal, no caso da Coletora).

20. **Munição não é contagem de projéteis.** A unidade é o pacote, o tanque, o
    foguete ou a caixa, como o livro descreve (OPRPG p. 60). A quantidade do item
    é de pacotes, e a duração em cenas — ou a contagem opcional de 20 ataques por
    pacote (p. 174) — fica no controle manual.

21. **Modificações de munição.** Dum dum e Explosiva mudam o crítico e o dano da
    arma que usar aquela munição (OPRPG p. 60). A ficha não liga munição a arma —
    o campo "Munição" da arma é texto —, então elas são aplicadas ao pacote e o
    efeito na arma fica no controle manual.

22. **Proficiência da arma é aviso.** A penalidade de −2 dados por falta de
    proficiência (OPRPG p. 54) não entra sozinha: as proficiências de poderes vêm
    em texto ("armas táticas exceto de fogo", "armas de fogo que usam balas
    longas") e a mesa pode ter decidido outra coisa. A ficha compara e avisa.

23. **Evolução por Patentes e os rituais.** A tabela do ocultista por patente
    (SAH p.112) dá três rituais iniciais e **dois** a cada nova patente, com os
    círculos por patente. A regra opcional de patentes ainda não tem o trilho de
    progressão estruturado no R.A.M.A. (ver a entrada dela acima), então as
    concessões de ritual continuam seguindo os degraus de NEX ou de nível
    enquanto ela estiver ligada — com o aviso, e os números do livro, na aba
    Rituais e na Progressão. A ficha não inventa a tabela. O livro também não
    diz: como A e B, escritas para NEX e nível, se aplicam por patente; e se
    Aprender Ritual, com patentes, olha o limite de PD (a p.109 manda usá-lo como
    nível só para "habilidades de origem e classe", e Aprender Ritual é poder
    paranormal). Ficam com a mesa até o trilho existir.

24. **Aprender um ritual sobe o NEX.** Com NEX & Experiência, "sempre que o
    personagem aprende um ritual, seu NEX aumenta em um valor igual ao círculo do
    ritual (isso inclui os rituais iniciais)" (SAH p.99). O R.A.M.A. **não** mexe
    no NEX sozinho: o NEX é um campo da mesa, e subi-lo a cada aprendizado faria
    recalcular a ficha conceder progressão. O aviso aparece na aba Rituais.

25. **Graduado com as regras de SAH p.113.** A e B falam do ritual que o
    ocultista aprende "por sua habilidade Escolhido pelo Outro Lado". Não citam
    Saber Ampliado nem o Grimório Ritualístico, que são habilidades da trilha, com
    gatilho próprio ("toda vez que ganha acesso a um novo círculo", OPRPG p.35).
    O R.A.M.A. não os altera com nenhuma das duas regras — reduzi-los seria
    estender a regra além do texto. A mesa que quiser o contrário resolve com a
    exceção.

26. **O estudo em campo, por dentro.** A regra B diz "aprendidos por meio de
    estudo ou maldição", e o parágrafo "Estudando Rituais" (SAH p.113) descreve a
    fonte como "uma composição descrevendo seu processo completo e seu símbolo,
    ou um objeto amaldiçoado pela essência desse ritual" — mais o selo
    paranormal. O R.A.M.A. registra essas três fontes. "Círculos aos quais tenha
    acesso" é conferido no degrau do estudo, gravado com ele, e não no de hoje. Um
    estudo registrado numa etapa que a ficha não alcança mais (o NEX foi corrigido
    para baixo) fica guardado, sem efeito, como uma escolha acima do NEX atual.

27. **Evolução por Patentes junto de NEX & Experiência.** O texto de patentes a
    chama de "uma variante da regra de Nível de Experiência e Nível de Exposição"
    (SAH p.109), e as duas trocam o trilho de progressão; a lista de estilos de
    jogo da ficha de série, no fim do livro, sugere as duas no "Foco em Horror".
    O R.A.M.A. as trata como incompatíveis desde que as duas chaves existem: sem
    o trilho de patentes estruturado, não há como aplicar as duas ao mesmo tempo
    sem inventar a combinação.

28. **Morrendo no apêndice de condições.** O apêndice diz que o personagem morre
    se "ficar mais de três rodadas" morrendo e que a condição termina se ele
    "voltar a ter pelo menos 1 PV" (OPRPG p.310-311). O capítulo de regras diz
    três **inícios de turno** na mesma cena, e que curar 1 PV encerra só a
    inconsciência — morrendo exige Medicina ou um efeito específico (p.88). O
    R.A.M.A. segue a p.88, que é a regra detalhada, com exemplo.

29. **Perturbado com PD.** "Fica perturbado quando, após sofrer dano mental, seus
    PD resultantes são menores que a metade" (SAH p.104) não diz quando deixa de
    estar. Como na Sanidade ("se estiver com menos da metade", OPRPG p.88), o
    R.A.M.A. o encerra quando os PD voltam à metade ou mais, e deixa o botão
    Encerrar à mão. Sem a regra, perturbado é só a leitura da SAN abaixo da
    metade, e a ficha não o marca como condição.

30. **"Essa condição pode ser removida se o personagem recuperar pelo menos 1
    PD"** (SAH p.105) vem logo depois de enlouquecendo, e o R.A.M.A. a lê como
    enlouquecendo — perturbado tem o próprio limiar.

31. **Quem conta o início de turno sem o combate.** Fora do combate da campanha,
    a contagem é à mão: "+1 início de turno". Se mestre e jogador apertarem os dois
    pelo mesmo turno, são duas correções explícitas, e a ficha mostra as duas — o
    "−1" desfaz. Só o que vem do combate tem identidade de turno e não duplica.

32. **Voltar o turno depois de uma correção.** Se um início de turno do combate
    foi tirado à mão ("−1"), voltar e avançar o turno não o conta de novo: o id
    fica descartado. Uma "Nova cena" esquece os descartes, junto com a contagem.

33. **Exaustão e desmaio.** Não são regras do livro com contagem por turno — ver
    [Exaustão e desmaio: contadores da mesa](#exaustão-e-desmaio-contadores-da-mesa).
    O limite, a ativação e a consequência são da mesa.
