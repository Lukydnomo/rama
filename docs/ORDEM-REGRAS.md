# Ordem Paranormal — matriz de regras

O que o R.A.M.A. implementa das regras de Ordem Paranormal, de onde cada
regra veio e como ela se comporta.

**Fontes.** `OPRPG` = *Ordem Paranormal RPG — Livro de Regras*, v1.1, Jambô,
2022. `SAH` = *Sobrevivendo ao Horror*, v1.2, Jambô, 2024. `AS1` = *Arquivos
Secretos 1*, v1.1, pacote de conteúdo oficial, Jambô. As páginas citadas são as
do livro, não as do PDF.

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
| `js/ordem/condicoes.js` | morrendo, enlouquecendo, inconsciente, perturbado: a contagem de inícios de turno por cena e as ações com origem nos recursos (dano, cura, dano mental, gastar, recuperar) |
| `js/ordem/efeitos.js` | a biblioteca de condições do livro, os efeitos de rituais, as aplicações (duração, turnos, repetição, imunidade) e o cálculo dos modificadores com as regras de acúmulo |
| `js/ordem/consumo.js` | munição (carregada, reserva, recarga, rajada) e componentes ritualísticos, com o registro de consumo por id |
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

### Origens do Sobrevivendo ao Horror (v2.23)

As 20 origens do SAH (p. 7-13, Tabela 1.1) estão no mesmo catálogo das 26 do
livro básico — as 10 "da comunidade" também, porque o livro as publica (o crédito
fica em `comunidade`). Valem para qualquer classe e não pedem regra opcional
nenhuma. A criação, a troca de origem, a biblioteca (Origens), o Flashback e o
cartão em Habilidades leem o mesmo catálogo.

**Perícias.** Profetizado tem Vontade **e** mais uma à escolha, ligada à
premonição (a mesa confere) — fixa e escolhida somam. O que a origem treinou fica
em `ordem.periciasDaOrigem`; é por isso que trocar a origem sabe o que tirar.
Repetição com a classe: "escolha outra", como sempre.

**Profissão.** A ficha tem uma perícia Profissão; a origem diz a especialidade
(cozinheiro, engenheiro, psicólogo — e o Chef do livro básico, cozinheiro). A linha
mostra "Profissão (cozinheiro)", e o treinamento vale para as especialidades
listadas — a da origem e as anotadas à mão no modo edição —, não para todas.

**O que entra na conta (permanente):**

| origem | efeito |
|---|---|
| Diplomata | +2 em Diplomacia |
| Experimento | resistência a dano 2 (todos os tipos); +2 na perícia escolhida, que precisa ser **originalmente** de Força, Agilidade ou Vigor (o atributo do catálogo — trocar o da ficha não contorna); –1 **dado** em Diplomacia |
| Mergulhador | +5 PV |
| Profetizado | +2 em Vontade |
| Amigo dos Animais | +2 (aliado) na perícia escolhida, enquanto o companheiro estiver vivo |

**Por clique, no resultado do teste** — oferecido só nas perícias do poder, com a
condição dita antes de gastar: Explorador, Fotógrafo, Legista, Motorista e Repórter
(2 PE: +5 no mesmo teste), Mateiro (2 PE: rola de novo e fica com o melhor).
Trocas de perícia numa situação: Terapia (Profissão (psicólogo) no lugar de
Diplomacia), Encontrar a Verdade (Investigação no lugar de Diplomacia, para
persuadir) e cosplay (Artes no lugar de Enganação, para disfarce) — oferecidas no
resultado da perícia original; nada troca as rolagens da ficha de vez.

**Por controles no cartão da origem**, com estado gravado em
`ordem.estadoDasOrigens` (por origem; recarregar não reinicia):

- Companheiro Animal: a morte do companheiro — perder 10 de Sanidade permanente
  (como ajuste visível) e ficar perturbado, cada um marcado; com Jogando sem
  Sanidade, a referência a Sanidade é ignorada. Os marcos de NEX 35% e 70% (tipo e
  habilidade de aliado) são mostrados e aplicados pela mesa.
- Acostumado ao Extremo: custo 1 PE, +1 por uso na mesma cena, contado.
- Fome do Outro Lado: ingrediente (item de categoria I, 0,5 espaço), preparo (o
  teste é do mestre, com resultado oculto — a ficha não rola nem mostra), prato e
  refeição separados. Só **comer** aplica: RD 10 ou vulnerabilidade até o fim da
  próxima cena (conforme o mestre informar), –1 de Sanidade permanente por refeição
  e, com NEX & Experiência, +3% de NEX por parte de criatura diferente.
- Poder da Amizade: "+2 com o amigo por perto" é um efeito ligado e encerrado por
  clique; a morte do amigo tira 1 PE por 5% de NEX até "Fim da missão".
- Cosplay: +2 nas perícias que a mesa aceitar para a fantasia, como efeito.
- Conhecimento Oculto: a criatura identificada fica registrada como efeito "até o
  fim da missão"; o +2 vale só contra ela e é somado no teste contra ela.
- Invenção Paranormal: o ritual (1º círculo) é escolhido no catálogo e fica preso
  ao invento — **não é aprendido**, não entra na aba Rituais, não conta em limite.
  Ativar rola Profissão (engenheiro) contra DT 15 +5 por ativação na missão; falhar
  enguiça até a manutenção (interlúdio), que volta a DT a 15; "Nova missão" zera.
- A Culpa é das Estrelas: 1 PE e 1d6 no início da cena, uma vez por cena; acertar dá
  +2 em testes de perícia até o fim da cena (efeito). Errar pede mais um número na
  próxima vez; acertar volta a quantidade a 1 — o R.A.M.A. volta ao número escolhido
  na Progressão (leitura: o livro não diz qual número fica).
- Luta ou Fuga: +2 PE temporários, em parcela própria, até o fim da cena, quando a
  mesa reconhece a referência. A premonição é o que o personagem sabe; detalhes
  secretos ficam com o mestre, fora da ficha.
- Terapia: 2 PE e o teste de Profissão (psicólogo) no lugar da resistência falha.

**Só texto (a mesa aplica):** Luto Habitual (metade do dano mental), O Inteligentão
(a ação de interlúdio ler), Mapa Celeste e Manual do Sobrevivente fora do teste,
Conexões (a troca pelo contato), Fôlego de Nadador (fôlego e natação).

**Flashback** dá só o poder: os efeitos fixos entram; perícias e o que depende de
uma escolha da origem (o +2 da Mutação, o companheiro) não vêm.

### O poder da origem na aba Habilidades (v2.22)

O poder da origem da ficha aparece sozinho na aba Habilidades, como os outros
cartões das regras: nome, "Origem · <nome>", descrição, marca de automação do
catálogo, página e — quando a origem tem opção interna — a escolha feita ou "escolha
pendente na Progressão". Ele aparece mesmo sem classe escolhida. O id do cartão é
`orig|<chave da origem>`: trocar a origem troca o cartão, e recarregar não cria
cópia. O cartão é **apresentação**: o efeito numérico continua vindo do catálogo de
origens na camada de cálculo, e a opção continua sendo decidida na Progressão —
personalizar ou excluir o cartão não mexe na conta. Poderes de outras origens
recebidos por Flashback continuam como aquisições próprias. A aba Geral mantém o
campo Origem e não mostra mais o bloco do poder.

### Biblioteca oficial na aba Habilidades

No modo edição da ficha de Ordem, o botão **Da biblioteca** abre duas origens:
**Ordem Paranormal** (os livros) e **Homebrew** (a biblioteca da conta e o que
outras contas publicaram). Na ficha universal a janela continua só com a
Homebrew.

Nos livros há oito abas, e a da classe da ficha abre primeiro:

| aba | o que mostra |
|---|---|
| Mundano, Sobrevivente | Empenho, as trilhas por estágio, Cicatrizado e o treinamento que vira agente |
| Origens | o poder de cada origem do catálogo (as 26 do livro básico e as 20 do SAH, em duas seções), com a origem ao lado; a busca acha pelo nome do poder e pelo da origem. Trazer um deles copia o texto e **não** troca a origem nem concede o benefício — a janela pede confirmação dizendo isso |
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

## Ficha importada (v2.34)

Uma ficha que veio do CRIS (Perfil → **Importar do CRIS**) chega com o estado
atual e sem a história de como chegou lá. O R.A.M.A. não inventa essa história.

### O marco

`ordem.importacao.marco` guarda NEX, nível ou estágio no momento da leitura
(`modo`: `nex`; `nivel` com NEX & Experiência; `estagio` para Sobrevivente).
Atributos e graus de perícia gravados são o estado **no marco**.

- **Etapas até o marco** sem registro viram *histórico indisponível*
  (`historicoImportado` no estado da progressão): não pedem escolha, não somam
  efeito e não abrem vaga. A trilha e a afinidade ficam fora dessa regra: a
  trilha é decidida na importação (sugerida pelas habilidades e confirmada pela
  pessoa) e a afinidade continua pendente quando cabe.
- **Aquisições importadas** (`representacao: "importada"`) entram no percurso
  com `via: "importacao"` e os efeitos de conta (PV, PE, Defesa…), **sem** os
  efeitos que o retrato já contém (treinar perícia, grau, atributo). As que as
  camadas das regras já dão — automáticas da classe, poder da origem,
  habilidades da trilha confirmada — ficam de lado (`importadasDeLado`): um
  benefício nunca conta duas vezes. `"item"` não tem efeito fora do item;
  `"texto"` é só a habilidade descrita na pasta *Importado do CRIS*.
- **Rituais importados** (`importacao.rituais`) são conhecidos, com aquisição
  "histórico indisponível": não ocupam vaga, não reabrem concessões e não
  contam no limite de Aprender Ritual. As concessões de etapas históricas não
  aparecem como "0 de 0".
- **Acima do marco** a progressão segue normal: NEX 45% numa ficha de NEX 40%
  pede só o que a etapa nova dá.
- **Abaixo do marco** NEX, nível e estágio não descem: a tela recusa com o
  motivo. A progressão continua funcionando acima dele.
- Sem `ordem.importacao`, nada disso existe: fichas antigas não mudam.

### Calcular, comparar, ajustar só o resíduo

Item reconhecido nasce da base do catálogo; as modificações reconhecidas são
aplicadas pelo catálogo; o motor calcula; só a diferença para o valor observado
vira `ordem.ajustesImportados`, com motivo. O mesmo vale para a ficha: perícias
(`ordem.ajustes`, alvo `pericia:<chave>`), máximos de PV/PE/SAN/PD (decisão na
revisão; o padrão mantém o número do CRIS), Defesa/bloqueio/esquiva
(`bonusExtra`), deslocamento e limite de PE. Os recursos atuais entram depois
dos máximos finais, zero incluído — sem descanso e sem completar.

### A conferência (v2.34.2)

Cada valor que o CRIS mostra vira uma linha da conferência, agrupada por
assunto (identidade, atributos, recursos, defesas, perícias, carga, itens,
ataques, rituais, poderes, contagens). A linha guarda o valor do CRIS, o que o
R.A.M.A. calcula com o que foi reconhecido (antes de ajuste) e sabe reler o
próprio valor numa ficha. No fim da conversão ela é relida três vezes: na
ficha preparada, na ficha **normalizada** (a que `criar_personagem` grava) e
depois de **exportar e importar** o arquivo. A situação de cada linha:

| Situação | Quando |
|---|---|
| Igual | a ficha criada mostra o mesmo valor do CRIS |
| Ajustado | igual ao CRIS por um ajuste importado, com motivo |
| Regra do R.A.M.A. | diferente do CRIS por uma regra automatizada ou por decisão da revisão |
| Para conferir | valor de conferência, sem ajuste (carga, trilha, poderes) |
| Divergente | o valor muda no caminho, ou devia bater com o CRIS e não bate |

Divergência vira aviso de revisão (exige marcar "Revisei" antes de criar). A
suíte `testes/executar-cris.js` exige zero divergência nos casos reais.

### Diferenças mecânicas conhecidas (CRIS × R.A.M.A.)

| Ponto | CRIS | R.A.M.A. | Na importação |
|---|---|---|---|
| Crítico | repete a expressão inteira (constantes inclusive) | multiplica os dados (e o extra marcado) | fica a regra do R.A.M.A.; a fórmula do CRIS vai para `criticos` e para a revisão |
| Bônus de perícia | `bonus` já inclui o treino | treino + efeitos | o treino não é somado de novo; outros bônus do CRIS viram ajuste |
| Efeito automatizado (ex.: Sensitivo) | não soma | soma | segue o R.A.M.A.; a revisão permite manter o total do CRIS |
| Traços do Outro Lado | SAN cheia | metade da SAN da classe | revisão; o padrão mantém o máximo do CRIS (ajuste) |
| Golpe Pesado | +1 dado na arma | descrito | +1 dado como ajuste da arma, com motivo |
| Maldição Defesa de acessório | soma na Defesa | descrita | bônus extra de Defesa com motivo |
| Mochila e carga | mochila como espaço negativo; sobrecarga sem penalidade | Mochila Militar soma capacidade; sobrecarga tira 5 da Defesa e das perícias de carga e 3 m de deslocamento | decisão “carga”: o padrão mantém o estado do CRIS com um ajuste de capacidade; seguindo o R.A.M.A., a penalidade fica e nunca é desfeita por ajuste |
| Limites de categoria da patente | não confere | avisa | aviso na revisão; nada é removido |
| `nexString` | texto livre | — | não manda no NEX; com NEX & Experiência é a exposição |
| NEX & Experiência | o progresso continua em `nex` como porcentagem (“55%”) | nível | “55%” é o nível 11 (99% é o 20); número puro é lido como nível |
| Proteção pesada em uso | sem penalidade | −5 nas perícias de carga | entra na decisão das perícias com efeito automático |
| Atual acima do máximo | permitido | — | o excedente de PV, PE ou SAN vira pontos temporários |
| Nome com elemento (“Resistir a Sangue”), ritual com sufixo (“– Grimório”), “Componentes Ritualísticos de Sangue” | texto | catálogo com escolha | reconhecidos com a escolha; componentes de vários elementos numa linha só ficam personalizados |
| `isPdOn` | liga PD | "Jogando sem Sanidade" | só esse campo liga a regra; conteúdo do SaH não liga nada |
| Bônus escrito no nome do item | texto | — | não vira efeito; o total observado da perícia entra como ajuste |

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

Fica na aba Regras, na gaveta "Configurações da ficha" (com NEX & Experiência e
Jogando sem Sanidade). **Ligada é o padrão**, e é o comportamento de toda ficha
gravada antes desta chave existir.

A aba Regras (v2.39) tem três gavetas que abrem e fecham pela etiqueta —
Configurações da ficha, Regras opcionais e Regras de mesa — com o resumo
"N regras · M ligadas" à vista mesmo fechadas. Dentro, cada regra é um cartão
compacto em grade, como os itens do inventário: fechado, mostra o nome, o resumo
e a chave (que liga sem abrir o cartão); aberto, o efeito, a automação, a fonte,
os avisos e os parâmetros. O que está aberto fica aberto quando uma chave
redesenha a aba (memória da página). No modo edição, com a patente desligada, o
cartão da patente já vem aberto nos limites por categoria.

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

## Mundano e Sobrevivente (v2.21)

Duas classes de **pessoas comuns**, distintas entre si e das três de agente.
Ninguém vira uma delas por estar em NEX 0%: um combatente com NEX de exposição 0%
(NEX & Experiência) continua combatente. Classe, NEX, nível e estágio são quatro
informações diferentes — `R.faseDe(ordem)` diz em que fase a ficha está.

| | Mundano (OPRPG p. 171-172) | Sobrevivente (SAH p. 30-32) |
|---|---|---|
| NEX | 0% (nível 0 com NEX & Experiência) | 0% (nível 0), evolui em **estágios 1 a 5** |
| PV | 8 + Vigor | 8 + Vigor; **+2 fixos** por novo estágio |
| PE | 1 + Presença | 2 + Presença; **+1 fixo** por estágio |
| Sanidade | 8 | 8; **+2 fixos** por estágio |
| PD (Jogando sem Sanidade) | sem tabela no livro — base 0 | 4 + Presença; +2 por estágio (SAH p. 104) |
| Perícias | 1 + Intelecto (a origem à parte) | 1 + Intelecto, e o que os benefícios derem |
| Proficiências | armas simples | armas simples |
| Habilidade | Empenho | Empenho; trilha no 2º e 4º estágio; +1 atributo no 3º; Cicatrizado no 5º |
| Limite de PE | 1 (ver abaixo) | sempre 1, com a exceção do custo mínimo |
| Atributos na criação | começam em 1, **3 pontos**, um pode ir a 0 por +1, teto 3 | igual |
| Equipamento | sem patente: 1 item de categoria I e itens de categoria 0 que a origem permita | igual |

- Os incrementos por estágio são **fixos**: Vigor e Presença não se somam de novo.
- **Empenho**: no resultado de um teste de perícia, a ficha oferece "Empenho: +2
  (1 PE)". Usar gasta 1 PE (ou PD) e mostra o **mesmo** teste com +2 — não rola de
  novo e não vira bônus permanente em perícia nenhuma. A ficha oferece depois de
  ver o dado; se a mesa exige declarar antes, é só não usar depois.
- **Limite de PE do Mundano**: o livro não dá limite para NEX 0%. O R.A.M.A. usa 1,
  o custo do Empenho (a única habilidade dele), e a ficha diz que é leitura.
- **Patente**: nenhuma — nem Recruta, nem "patente de mundano". Com "Aplicar regras
  de patente" ligada, o limite é o da regra comum (1 item de categoria I); desligada,
  valem os limites manuais, como em qualquer ficha. O que a origem permite é da mesa.
- **Evolução por Patentes** ligada não substitui os estágios: a ficha avisa.

### Trilhas do Sobrevivente (SAH p. 31-32)

| trilha | 2º estágio | 4º estágio |
|---|---|---|
| Durão | +4 PV; e +2 PV ao subir para o 3º | Pancada Forte (1 PE: +1 dado no ataque) |
| Esperto | treinado em uma perícia adicional (nova) | Entendido: duas perícias treinadas, exceto Luta e Pontaria (1 PE: +1d4) |
| Esotérico | sentir energias paranormais (ação padrão, 1 PE) | Iniciado: aprende e conjura um ritual de 1º círculo |

- A trilha é uma escolha registrada (`s2.trilha`); as habilidades com opção viram
  vagas (`b.esperto`, `b.entendido`, `b.cicatrizado`), e as outras chegam sozinhas.
- **Iniciado** abre a concessão `s4.iniciado`: 1 ritual de 1º círculo, pela
  biblioteca e pelo modelo de aquisição de sempre, **mesmo em NEX 0%**. Não libera
  outro ritual nem outro círculo. O ritual fica preso a "Iniciado".
- **Aumento de atributo do 3º estágio** (`s3.atributo`): +1, teto **3**. Vigor sobe
  os PV, Presença os PE, Intelecto treina uma perícia nova.
- **Cicatrizado**: escolha do elemento e do perigo; o trauma (–1 dado em resistência
  contra ele) é lembrete — a mesa reconhece quando vale. Uma vez **por sessão** (não
  por cena), como reação: sacrificar 1 PV para ignorar um dano mental ou um gasto de
  PE, ou 1 PE para reduzir um dano físico à metade. O sacrifício é gravado
  (`ordem.sacrificios`), aparece na composição do máximo como "Cicatrizado ·
  sacrifício permanente" e nunca some ao recalcular. A sessão tem marcador próprio
  ("Nova sessão de jogo"), separado da cena das condições.

### Virar agente — duas transições diferentes

**Mundano — "Atingindo NEX 5%" (OPRPG p. 172).** Depois do treinamento, 1 ponto
de atributo (sem passar de 3) e os ganhos da classe: combatente +12 PV, +1 PE, +4
SAN; especialista +8 PV, +2 PE, +8 SAN; ocultista +4 PV, +3 PE, +12 SAN; as perícias,
proficiências e habilidades da classe. Somado ao Mundano, dá **exatamente** um
agente novato.

**Sobrevivente — "Treinamento Especial" (SAH p. 32).** Depende da história; toma o
lugar da **próxima** subida de estágio (esse estágio não é concedido); ganhos
menores e **sem** ponto de atributo: combatente +8 PV; especialista +4 PV, +1 PE, +4
SAN; ocultista +2 PE, +8 SAN. Mantém tudo o que já tinha — e as substituições do
livro: virando combatente, Pancada Forte sai e **Ataque Especial custa −1 PE**;
virando especialista, Entendido sai e **Perito custa −1 PE**; virando ocultista, o
ritual de Iniciado **se soma** aos três de Escolhido pelo Outro Lado.

- A transição é uma janela com a classe, o resumo (máximos antes e depois, o que
  fica, o que vai faltar decidir, substituições e avisos) e a confirmação. Cancelar
  não aplica nada. Ela grava **só** a trajetória (`ordem.trajetoria`: de, para,
  estágio, data); os ganhos são recalculados dela, e por isso reabrir ou salvar de
  novo não os concede outra vez. O id da operação evita aplicar duas vezes.
- As escolhas da transição (`t.treinamento` — as perícias; `t.atributo` — o ponto
  do Mundano) ficam em "Falta decidir".
- **Recursos atuais não são restaurados**: os que estavam cheios ficam no máximo de
  antes; o máximo sobe, e quem estava ferido continua ferido.
- A classe nova começa sem trilha de agente, em NEX 5% (ou nível 1, com NEX &
  Experiência — a exposição não muda).
- **Empenho**: fica com quem veio de Sobrevivente ("mantém todas as habilidades").
  O texto do Mundano não diz que ele fica, e a ficha não o mantém; a mesa pode
  anotá-lo.
- **PD depois da transição**: vindo de Sobrevivente, os PD dele mais o ganho de PE da
  transição (o que soma PE soma PD, SAH p. 104); vindo de Mundano, que não tem tabela
  de PD, os PD da classe nova, como num agente novato. As duas leituras são do
  R.A.M.A.; o livro não trata a combinação.
- Trocar a classe à mão depois da transição deixa a trajetória guardada, sem
  efeito, e a ficha avisa.

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
| Sobrevivente | 4 + Pre | 2 por estágio (fixo) |
| Mundano | — | o livro não traz tabela: base 0, e a ficha diz por quê |

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

### Exaustão e desmaio: não são contadores (v2.20)

Os contadores da mesa de exaustão e desmaio da v2.19 vieram de um mal-entendido
e saíram na v2.20. O pedido era acompanhar **Enlouquecendo** quando a ficha usa
Determinação: Enlouquecendo é um contador só, ligado à Sanidade ou aos PD
conforme "Jogando sem Sanidade". Pelos gatilhos de SAH p. 104-105, dano mental
maior que os PD atuais deixa enlouquecendo; **gastar** PD para pagar uma
habilidade ou ritual não ativa nada. Fichas antigas perdem os contadores ao ler,
sem que os turnos deles virem turnos de enlouquecendo. Exausto e Inconsciente
continuam como condições do livro, na biblioteca.

### Condições e efeitos aplicados (v2.20)

**A biblioteca.** As 38 condições do apêndice (OPRPG p. 310-311), com texto
próprio, categoria (medo, paralisia, mental, sentidos, fadiga), modificadores,
condições que trazem junto, repetição e página. Sobrevivendo ao Horror não cria
condição nova com nome. Machucado e Perturbado vêm dos recursos atuais (metade
dos PV ou da Sanidade). Morrendo, Enlouquecendo, Inconsciente e Perturbado usam o
contador próprio da ficha: aplicá-los pela biblioteca liga esse contador.

**Morrendo: p. 88 contra o apêndice.** O apêndice resume morrendo de forma
diferente do capítulo de regras (p. 88). A ficha segue a p. 88 (três inícios de
turno na mesma cena, não necessariamente seguidos); a biblioteca só aponta para
ela, e o catálogo nunca substitui essa lógica.

**Acúmulo (p. 312-313).** A mesma condição, ou condições com o mesmo efeito, não
somam: vale a mais severa. Efeitos de rituais, de itens e de aliados não somam
entre si — vale o maior bônus e a pior penalidade de cada tipo. Fontes de tipos
diferentes somam. O que ficou de fora aparece na explicação, "não acumula".
Armadura de Sangue, que o livro deixa acumular, é marcada como tal.

**Dados.** "−O" é um dado a menos. Com menos de um dado, rola-se 2 − n e fica o
pior (atributo 0: dois dados, o pior — p. 75; cada dado a menos abaixo disso, mais
um — p. 9).

**Condições que trazem outras.** Agarrado traz Desprevenido e Imóvel; Exausto
traz Debilitado, Lento e Vulnerável, e assim por diante. As derivadas são
calculadas, nunca guardadas: encerrar uma fonte não tira a derivada que outra
fonte ainda causa. Imunidade (por condição ou categoria) recusa a aplicação
direta e anula a derivada.

**Repetição.** "Ficar abalado de novo deixa apavorado" é oferecido na hora, nunca
aplicado sozinho. Quando chega a Inconsciente, liga o contador da ficha.

**Contexto.** Efeitos que valem só corpo a corpo ou à distância (Caído, Ódio
Incontrolável) entram só no ataque ou no dano daquele tipo; na Defesa, ficam como
aviso ("contra corpo a corpo: −5"), porque a Defesa geral não sabe quem ataca.
Restrições (só armas leves, não pode agir) e ações (Sangrando: Vigor DT 20)
aparecem na ficha e nas rolagens; nenhuma decisão narrativa ou rolagem é feita
sozinha.

**Duração.** Cena (encerra na Nova cena), turnos, até ser removido ou especial
(acompanhada à mão). Em turnos: de quem (o afetado ou outro participante), início
ou fim. Aplicar durante um turno não gasta aquele turno: o fim de um turno que
começou antes da aplicação não conta. Pelo combate, cada turno conta uma vez por
id; voltar turno retira o início desfeito e o fim do turno que volta a valer.

**Rituais com efeito estruturado.** Coincidência Forçada (+2 em testes de perícia;
Verdadeiro +5 — p. 126), Armadura de Sangue, Embaralhar, Ódio Incontrolável e Forma
Monstruosa. O +2 é bônus em **testes** de perícia: entra no total, nos ataques e
nas rolagens, e não em números derivados como a Esquiva. Um efeito lançado por
outro personagem é registrado pelo alvo (na própria ficha) ou pelo mestre.

### Contagem de munição (regra opcional, OPRPG p. 174)

Cada pacote dá munição para 20 ataques (foguete: 1; dardos: 2). Armas de fogo
têm capacidade (pistola 12, revólver 6, fuzil de caça 4, submetralhadora 20,
espingarda 6, fuzil de assalto 30, fuzil de precisão 1, metralhadora 50; SAH p. 38:
pistola pesada 10, revólver compacto 5, espingarda de cano duplo 2). Recarregar é
ação de movimento. A reserva é o próprio item de munição; o que está carregado já
saiu dela — um saldo só. Rajada (armas automáticas, p. 59): 10 balas, −1 dado no
ataque (o Compensador anula) e, com esta regra, +2 dados de dano em vez de +1.
Espingarda de cano duplo: os dois canos gastam 2 cartuchos, −1 dado no ataque,
dano 6d6. O gasto pertence ao ataque confirmado, acerte ou erre; rolar o dano
depois não gasta.

### Componentes ritualísticos (regra opcional, OPRPG p. 119)

Pelo livro, conjurar exige componentes do elemento do ritual, exceto Medo; a
afinidade dispensa os do seu elemento (p. 114). Os componentes **não se gastam**
ao conjurar. Dispensas: Selo paranormal (p. 151), acólito (p. 171), Camuflar
Ocultismo (+2 PE, p. 33), Improvisar Componentes (p. 34). Catalisadores se gastam
(SAH p. 44); com Conjuração Complexa, entregar os componentes à entidade os gasta
em troca de +1 dado (SAH p. 115). **Contar usos** (quantidade e gasto por uso) é
regra da mesa, marcada como tal. Falta de componente é aviso, nunca bloqueio.
"Usar ritual" mostra o custo em PE ou PD e tudo o que será gasto antes de
confirmar; consultar, aprender ou adicionar um ritual nunca gasta nada.

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

**O cartão (v2.32).** Sob o nome, marcas de círculo e elemento (uma por
elemento nos rituais de vários elementos). Abaixo do resumo, sempre à vista
mesmo fechado, a faixa com “Usar ritual” e as rolagens agrupadas por versão
(dano, cura, PV temporários e outras). Aberto, em regiões: a grade de conjuração
(execução, alcance, alvo, área, efeito, duração, resistência, custo básico e DT,
só o que está preenchido, com os rótulos da ficha), o efeito como texto de leitura
(parágrafos, quebras e listas preservados), um bloco por forma avançada (custo
adicional e total, requisito, alterações e rolagens — só as que têm conteúdo) e o
complemento (aprendizado à vista; regras, notas e fonte recolhíveis). As cópias
anteriores à v2.32 guardam o texto inteiro: só some o parágrafo que é, linha por
linha, exatamente o que a própria ficha gerava para as formas avançadas daquele
ritual (montado com os dados dele); nada é cortado por palavra.

| campo do catálogo | onde entra na ficha | est. |
|---|---|---|
| círculo, elemento, execução, alcance, alvo/área/efeito, duração, resistência | os campos do ritual, com os rótulos da seção | **A** |
| resumo e efeitos | a descrição da cópia (só o efeito, v2.32), em redação própria | **A** |
| formas avançadas | `versoes` (custo, requisito, alterações, rolagens) — o cartão as mostra em blocos, sem repetir na descrição | **A** |
| regras gerais, notas, divergências e a fonte | `complemento` (v2.32), uma região à parte, recolhível quando é longa | **A** |
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

### Regras opcionais dos Arquivos Secretos (v2.31)

| regra | chave | fonte | o que controla | est. |
|---|---|---|---|---|
| Reter Ritual | `reterRitual` | AS1 p. 58–59 | ver a seção do AS1 | **P** |
| Transcender com Itens | `transcenderComItens` | AS1 p. 56–57 | ver a seção do AS1 | **A** |
| Poderes de Intenção | `poderesDeIntencao` | AS2 p. 94–95 | contato com a Coroa, concessões, gatilhos, usos, efeitos ativos e os modificadores deles (RD, dano, margem) | **P** |
| Formas Supremas | `formasSupremas` | AS2 p. 96–97 | configurar, ativar, manter e desativar a forma; os +20 PV, +10 PE e +10 Defesa | **P** |
| Participação no Hexatombe | `participacaoHexatombe` | AS2 p. 4–24 | dia, desertor, fome, sede, castigos e recompensas na ficha: os lançamentos (PV/PE máximos, PV pela metade, testes, dados, dano, RD) e a seção Hexatombe | **P** |
| Aliados em Perigo | `aliadosEmPerigo` | AS2 p. 24 | o “Uso arriscado (1d6)” de cada aliado | **A** |

Todas começam desligadas, também numa ficha antiga sem escolha gravada. Valem
uma independente da outra: Intenção e forma suprema não pedem o Hexatombe, e a
participação não liga as outras duas.

**A decisão é uma só** (`RAMAOrdemArquivo2.regraLigada`, que lê
`ordem.opcionais`): a seção da aba Habilidades, as contas de `regras.js`
(`efeitosDaIntencao`, `formaAtiva`, `lancamentosValendo` — PV, PE, Defesa, RD,
testes, dano e crítico), as ações (conceder, usar, ativar, manter, lançar,
arriscar) e o requisito do poder de Intenção (`comRegra`). A existência dos campos
normalizados, o carregamento do módulo ou estar numa campanha com o modo Hexatombe
**não** ligam nada.

**Desligar com efeito ativo** (`suspenderRegra`, chamado por `OP.definir`):
Intenção encerra os efeitos ativos (gatilhos, usos e ferimentos ficam); a forma
suprema ativa sai sem custo e sem “morrendo”, tirando os +20 PV e +10 PE dos
atuais guardados, com registro `suspender` no histórico; o Hexatombe só suspende
os lançamentos. Religar não reativa forma nem efeito, não cobra custo antigo e não
concede de novo — os mesmos lançamentos voltam a valer, sem duplicar.

**Campanha:** `lancar_hexatombe` recusa lançamentos novos numa ficha sem
`participacaoHexatombe` (`recusados`, `motivo: "participacao_desligada"`); a aba
Hexatombe os mantém pendentes com o rótulo “suspenso: a ficha não liga
Participação no Hexatombe” e os reenvia quando a ficha ligar. Desfazer passa sempre.

**Fichas da v2.30.0:** os dados ficam como estavam (contato, poderes, forma,
histórico, lançamentos) e **sem efeito** até quem cuida da ficha ligar a regra na
aba Regras — que avisa quando há dados guardados. Ligar volta a aplicá-los como
estavam; nada é deduzido dos campos.

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

## Criaturas (v2.28)

Fonte: OPRPG p. 178–289 (Sangue, Morte, Conhecimento, Energia, Medo e Ameaças da
Realidade) e SAH p. 125–165 e 192–218 (ameaças paranormais, novas ameaças da
Realidade e as fichas das duas missões). Dados em `js/ordem/criaturas-dados.js`,
conferidos por `testes/executar-criaturas.js`.

| | Livro básico | Sobrevivendo ao Horror |
|---|---|---|
| paranormais | 49 (+ 5 facetas do Anfitrião como variantes) | 13 (com O Terminal) |
| pessoas | 11 | 11 (com Amanda/Antonella e o Vigia Ensandecido) |
| animais | 7 | 8 |
| **total** | **67 + 5** | **32** |

Fora do catálogo, de propósito: a ficha de exemplo do Marcado (SAH p. 132, exemplo
de regra), o modelo de espectro (SAH p. 131, receita que depende da ficha de um
Marcado — o catálogo traz a ficha de exemplo publicada na p. 133) e perigos e
armadilhas, que não são criaturas.

**Automatizado:** teste de cada estatística, atributo e perícia pela expressão
publicada; ataques um a um pela quantidade do livro, com crítico pelo natural e
pela margem; dano em partes com o total por tipo; dano mental da Presença;
rolagens de habilidades e ações; contadores de uso, fases e marcadores por
ocorrência; a vista do Enigma resolvido e das fases quando o livro dá números.

**Fica com o mestre (consulta):** alvos, áreas e alcance; aplicar dano, cura,
resistências, vulnerabilidades e condições; testes de resistência dos alvos;
agarrar e manobras; quando um uso "por cena" volta; efeitos sem número no livro;
Enigmas sem alteração numérica (marcar como resolvido só registra).

**Leituras e pendências do livro** (cada uma também é nota na ficha):

- Perturbado de Energia: teste de agarrar impresso "4d+10", lido como 4d20+10.
- Amigo Imaginário: Fortitude do Frenesi impressa "5D+30", lida como 5d20+30; a
  Presença não informa NEX de imunidade.
- Sempiternal: machucado impresso 445 (a metade de 990 seria 495), mantido.
- Tempestuoso: deslocamento impresso 24 m | 12 quadrados, mantido.
- Viajante: linha da Presença impressa "NEX 60%", sem o "+ é imune" das outras; mantida como impressa.
- O Anfitrião: PV impressos "01413", lidos como 1413; a ficha lista imunidade a
  dano e as facetas têm resistência a dano 20 — o mestre decide como convivem.
- Degolificada: o texto chama a forma de Sangue de "devoradora" e a legenda, de
  "devorada"; o catálogo usa "devoradora".
- Espectro Inesquecido (exemplo): Aterrorizar impresso com 2d8 e DT 15, enquanto a
  Tabela 3.1 indica 6d8 e DT 35 para VD 220; mantido como publicado.
- Religioso: o bônus da Voz Guia está impresso como "+" e um ornamento, sem valor;
  não é rolado nem aplicado.
- Memento Mori: garras com 5d20 embora AGI e FOR sejam 1, mantido.
- O Terminal: Reflexos "veja texto" (falha automaticamente) e deslocamento impresso
  apesar de não se mover; o texto da missão remete à p. 217, a ficha está na 218.
- Crítico de dano em várias partes: só os dados da primeira parte multiplicam
  (interpretação do R.A.M.A., igual ao "dano extra" das armas).

## Arquivos Secretos 1 (v2.29)

Fonte: `AS1` = *Arquivos Secretos 1*, v1.1, pacote de conteúdo oficial (Jambô).
As páginas são as impressas. Os textos do catálogo são resumos próprios, com os
números, testes e condições do livro. O livro entra no registro único de livros
(`C.LIVROS`, `js/ordem/catalogo.js`): busca, filtros de fonte, seletores e
bibliotecas o mostram como "Arquivos Secretos 1" ao lado do livro básico e do
Sobrevivendo ao Horror.

### Inventário, item por item

| conteúdo | página | destino no R.A.M.A. | estado |
|---|---|---|---|
| Origem Ferido por Ritual | 43 | `C.ORIGENS` (feridoPorRitual): Ocultismo fixa + 1 perícia restrita a Fortitude/Vontade/Reflexos (`periciasOpcoes`), elemento escolhido na vaga `b.origem.feridoPorRitual`; a Progressão confere a perícia do elemento (`periciaPorElemento`) | **A** |
| Mácula Ritualística | 43 | concessão de ritual `b.origem.macula` (1 ritual de 1º círculo do elemento, fora do limite, desde a origem, para qualquer classe); “Usar ritual” oferece conjurar sem o PE do círculo uma vez por cena (`estadoDasOrigens.feridoPorRitual.cena`); o –1 dado contra o elemento aparece no cartão da origem | **P** (o –1 dado é do teste da cena) |
| Origem Transtornado Arrependido / Sofrimento de Sangue | 43 | efeito `resistenciaMentalPorSangue`: RD mental 2 + 1 a cada dois rituais de Sangue conhecidos ou poderes paranormais de Sangue (`R.quantosDeSangue`) | **P** (a piora do descanso é da mesa: a ficha não tem condição de descanso) |
| Blindar a Mente (novo uso de Ocultismo) | 43 | não implementado por decisão do projeto: usos novos de perícia ficam com a mesa | — |
| Ritual Intenso | 44 | efeito `rolagemDeRitual` (Pre): soma nas rolagens de dano e cura da aba Rituais. Ritual Potente (OPRPG) segue informativo | **A** |
| Saúde Sobrenatural | 44 | botão no cartão: 3 PE, uso da cena, Pre × 10 PV temporários (`temporariosDeCena`, a mesma fonte não acumula) | **A** |
| Acostumado à Maldição de \<Elemento\> | 44 | poder com opção de elemento (sem Medo) e requisito `conjurarRitual` 2º círculo do elemento | **I** (a Sanidade não perdida é do teste) |
| Reter Ritual de Combate | 44 | requisito `comRegra: reterRitual`; botão “Mudar para cena” nos rituais retidos (1 PE quando é para não perder o foco) | **P** |
| Trilha Maledictólogo (NEX 10/40/65/99) | 45 | `C.TRILHAS` + 4 habilidades; Identificação Macabra (+1d10 por 1 PE no resultado de Ocultismo); Compreensão de Maldições (aquisição de ritual `maldicao`, fora do limite, confirmada; e transferir maldições ou tatuar pelo menu do item); Reproduzir Maldição (memorizar e aplicar até o fim da missão, com o limite IV); Maldição Suprema (–3 categorias na conta) | **P** (testes, PE e Sanidade da mesa: a tela pergunta e lembra) |
| \<Habilidade\> Aprimorada | 46 | poder geral repetível por alvo, até 2× no mesmo (`repeticaoMaxima`); a DT do ritual de mesmo nome na aba Rituais soma +2 (+5 com duas) | **P** (DT de habilidades é da mesa) |
| Instintos Urbanos | 46 | treinar Crime ou +2 | **P** |
| Cicatrizes Expostas | 46 | requisito declarado (`declaracao`) e opção de texto; botão aplica o efeito de cena (–1 dado em Vontade); o +1d8 é somado na rolagem | **P** |
| Curiosidade Oculta | 46 | treinar Ocultismo ou +2; no resultado de Vontade, 2 PE trocam por Ocultismo | **A** |
| Especialista Esotérico | 46 | requisitos Int 3, 2º círculo e Domínio Esotérico | **I** |
| Ferro Maculado | 47 | poder paranormal de Sangue (afinidade d8) | **I** |
| Placas Sanguinolentas | 47 | requisito “conjurar ritual de Sangue”; “Usar ritual” de Sangue aplica +círculo na Defesa (+2 com afinidade) até o próximo turno | **A** |
| Sangue Corrosivo | 47 | botão: 1 PE e o estado até o fim da cena (1d10 / 2d10) | **P** |
| Sangue Prazeroso | 47 | `resistenciaDanoMachucado`: RD 5 com PV na metade ou menos; afinidade: 20 PV temporários uma vez por cena, pelo botão | **A** |
| Rituais de vários elementos | 49 | `todosOsElementos` no catálogo e na cópia; aprender exige afinidade com pelo menos um (`A.requisitosDoRitual`), em toda aquisição que não seja da mesa | **A** |
| Passagem de Conhecimento | 48 | ritual de 2º círculo de Sangue e Conhecimento, com Discente (+3) e Verdadeiro (+7) | **I** (efeito narrativo) |
| Passagem de Conhecimento Expandido | 50–51 | ritual de 4º círculo; aprender exige conhecer o ritual base (`requisitoRitual`); as rolagens 1d4 e 1d6+3 ficam na faixa de rolagens | **I** |
| Itens paranormais: Amuleto Sinalizador, Agrupador Ritualístico, Rubra | 54 | catálogo de itens (aba Geral, Itens paranormais); Rubra: “Usar uma dose” gasta a dose, aplica +5 (For, Agi, Vig) e 10 PV temporários, conta os usos (`contadores.rubra`) e mostra a DT de Vontade (15 + 2 por uso) | Amuleto e Agrupador **I**; Rubra **P** |
| Itens amaldiçoados de Sangue: Arpão do Pescador, Combustível de Sangue, Marreta Transtornada | 55 | catálogo (aba Itens Amaldiçoados); armas com `danoExtra`/`tipoDanoExtra` (fora do crítico) | Arpão e Marreta **P** (lento, ossos e 1d6 PV são da cena); Combustível **I** |
| Transcender com Itens (regra opcional) | 56–57 | chave `transcenderComItens`, desligada: vagas `t1…t4.transcenderItem` por intervalo de NEX alcançado; item amaldiçoado do inventário + poder do mesmo elemento, com requisitos; o item consta como mundano (`E.itensTranscendidos`) | **A** (a cena é da mesa) |
| Reter Ritual (regra opcional) | 58–59 | chave `reterRitual`, desligada: opção Reter em rituais de duração cena (gasta, prende no máximo, –1 SAN), painel de retidos com “Deixar de reter” e “Liberar com calma” (DT 20 + custo), aviso de perda de foco (atordoado, exausto, pasmo); com Conjuração Complexa, a nota de Preparando Rituais | **P** (perder o foco avisa e tira com um clique; não tira sozinho) |
| Ameaças e aliada | 19–39, 53, 68–71 | 12 fichas no bestiário (`as1.criatura.*`): Assecla, Investido, Apóstolo do Sangue, Giovanni Opspor, Mosto, Tarrafa, Carrara, Nando Salles, Anulado, Cleo Brisa, Cristino e Agatha Volkomenn (aliada, OPRPG p. 170) — biblioteca, combate, aliados, cópia para o Homebrew | **A** (como v2.28) |
| Gerador de Transtornados | 23 | ferramenta na biblioteca de criaturas (`OC.gerarTranstornado`): 1d10 perfil, 2d6 traços, 2d20 aparência | **A** |
| Missões, contos e a aventura (p. 8–18, 40–41, 60–71) | — | narrativa: nada mecânico além das fichas acima | — |

### O que a ficha guarda de novo

`ordem.temporariosDeCena`, `ordem.retencoes`, `ordem.maldicoesMemorizadas`,
`ordem.contadores` e `estadoDasOrigens.feridoPorRitual` — todos normalizados em
`R.normalizar`, com ficha antiga abrindo com listas vazias. No inventário:
`ordem.tatuagem`, e nas maldições `temporaria: "missao"` e `transferidaDe`. Nas
cópias de ritual: `ordem.elementos` + `ordem.todosOsElementos`. Nas armas:
`arma.tipoDanoExtra`. Registros de ritual ganharam o tipo `maldicao`. Nada disso
muda o backend: o bloco `ordem` vai inteiro no JSON da ficha.

## Arquivos Secretos 2 (v2.30)

Fonte: `AS2` = *Arquivos Secretos 2*, v1.0, pacote de conteúdo oficial (Jambô) —
o Hexatombe. Páginas impressas. Resumos próprios, com os números, testes e
condições do livro. O livro entra no registro único (`C.LIVROS`, edição v1.0):
busca, filtros, seletores e bibliotecas o mostram como "Arquivos Secretos 2".
Estado: **A** automatizado · **P** parcial (a tela registra e cobra, a mesa
decide o resto) · **I** informativo · **—** fora por decisão ou narrativa.

### Inventário, item por item

| conteúdo | página | destino no R.A.M.A. | estado |
|---|---|---|---|
| Regras de Hexatombe: estigmas, sacrifícios, desertores, dias e fases, base, recursos, jornada, procura, encontros, intenções, Lua de Sangue | 4–24 | modo de campanha (aba Hexatombe, `js/ordem/hexatombe.js` + `CAMPANHA_HEXATOMBE`) — ver abaixo | **P** |
| Aliados em Perigo (regra opcional) | 24 | chave `aliadosEmPerigo` (desligada); “Uso arriscado (1d6)” em cada aliado; ferimentos por cena; o 2º deixa a morte pendente até a mesa confirmar (`A2.arriscarAliado`, `aliado.perigo`) | **A** (decidir se a situação é arriscada é da mesa) |
| Ameaças do Hexatombe: arara-vermelha, arara-devorada, arara-infernal, jaguatirica, felino-devorado, felino-infernal | 26–32 | bestiário (`as2.criatura.*`); Quibungo e zumbis de Sangue citados já estavam no catálogo | **A** (como v2.28) |
| Mascarados: Jonas Aguiar, Dalmo Magno, Park Jae-Yoon, Kemi, Labirinto | 39–64 | bestiário, cada um com a forma da intenção assassina (Mutilador Noturno, Colosso, X, Fantasma, a forma de Labirinto) na MESMA ficha (`ordem.formas`) | **A** |
| Agentes: Jasper, Lena Viegas, Maria, Remi, Tuco | 70–86 | bestiário | **A** |
| Juan Davo e Juan Diabólico | 91–92 | bestiário, forma na mesma ficha | **A** |
| Perfis “como aliado” (11) | 41–93 | bestiário (`as2.criatura.<nome>-aliado`): benefícios, sem PV/PE, com `ficha` apontando a ameaça; o painel mostra “Como aliado”. Agatha (AS1) passou a usar o mesmo cartão | **I** (os benefícios são aplicados pela mesa) |
| Predador Perfeito | 41 | combatente; requisitos veterano em Luta ou Pontaria e em Sobrevivência; botão gasta 5 PE | **P** |
| Golpes de Arena | 47 | combatente; treinado em Luta; botão gasta 2 PE | **P** |
| Marteladas | 87 | combatente; For 2, Luta, Artista Marcial; 3 PE: três testes só para o crítico, três danos desarmados somados num dano só, Fortitude DT For | **A** |
| Assassinato Furtivo | 53 | especialista; +1d6 no furtivo; 2 PE trocam d6 por d8 | **P** |
| Especialista em Matar | 59 | especialista; patamares por NEX (2/3/4/5 PE), cada +4 escolhido para ataque ou dano antes de rolar (`A2.planoDeEspecialistaEmMatar`) | **A** |
| Dominar Habilidade Ritualística | 75 | ocultista; Int 3, Ocultismo, conjurar; opção `habilidadeDeTrilha` (NEX da etapa ≥ o da habilidade, dependências exigidas, não a da própria trilha); até 3, uma por habilidade; a habilidade entra como adquirida com efeitos e concessões | **A** |
| Liturgia de Fortalecimento Ritualístico | 93 | ocultista; Int e Pre 2; 2 PE no interlúdio: +2 na DT do ritual até o próximo interlúdio | **A** |
| Revidar Violento, Corpo Fechado, Esquiva Tática | 41, 47, 53 | gerais; a segunda reação de defesa só do tipo dito | **I** |
| Palpite Confiante | 59 | geral; 1 PE soma o Intelecto no resultado de perícia de Int ou Pre | **A** |
| Especialista em Correntes (dois poderes com o mesmo nome) | 70 | `especialistaEmCorrentes` e `especialistaEmCorrentesPuxar` | **I** |
| Prática com Materiais Ritualísticos | 74 | geral | **I** |
| Estágio Terminal | 78 | geral; botão só machucado, 2 PE | **P** |
| Kian Vai Nos Salvar | 78 | geral; marca da cena | **I** |
| Tratamento de Emergência | 79 | geral; 2 PE, 2d10+10 PV temporários, um por alvo por cena | **P** |
| Arte da Música Macabra | 83 | geral; o efeito em si mesmo fica guardado como “o próximo dano/ataque/teste/alcance” (`ordem.pendentes`) e é gasto uma vez | **P** |
| Sintonização Mental com Arma / com Proteção | 83 | gerais; 3 PE no interlúdio; o atributo escolhido vale até o início do próximo interlúdio (`ordem.sintonizacoes`); na proteção, a Defesa troca a Agilidade | **A** |
| Movimentação Tática, Sentido Tático (geral) | 87 | gerais (`sentidoTaticoMilitar`, para não colidir com o poder de combatente do livro básico) | **I** |
| Predador de Sangue, Pressão Atmosférica, Zona dos Sussurros, Disparo da Morte, Engolir Sangue | 41–93 | paranormais com afinidade; listas e limites no cartão (vítimas, zonas, um atordoamento por alvo por cena), Engolir Sangue cura e tira SAN | **P** |
| Poderes de Intenção: Desejo Diabólico, Filho da Dor, Novo Caminho, O Sabor do Silêncio, Sede de Vingança | 94–95 | `PODERES_INTENCAO`, requisito “contato com a Coroa de Espinhos” registrado; gatilho (contado, por ação ou confirmado), uso, efeito ativo, por cena e na mesma cena; Filho da Dor conta ferimentos de 5+ e liga RD 25 com −5 PV por turno; O Sabor do Silêncio soma +1d8 e +2 de margem na cena | **P** |
| As Máscaras na Sua Mesa (forma alternativa) | 96–97 | `ordem.formaSuprema`: configuração, aprovação da mesa, ação de movimento, 6 SAN + 2 por rodada, +20 PV, +10 PE e +10 Defesa, desativar com menos de 20 PV deixa em 0 e morrendo; com Jogando sem Sanidade, a mesa escolhe ignorar o custo ou pagar em PD antes da 1ª ativação; as “sugestões” são texto | **P** |
| Rituais Mapa Sanguíneo, Labirinto Mental, Capturar Momento, Rajada Caótica | 65–67 | catálogo de rituais (`as2.ritual.*`), 2º círculo; divergências em `divergencias` (abaixo) | **A** |
| Água, Comida, Sucata | 20 | itens de recurso (cat. 0, 1 espaço), “Consumir uma unidade” | **P** |
| Bandagem, Dose de Álcool, Incenso, Pedra de Amolar, Bússola, Caixa de Ferramentas, Kit de Escalada | 21 | itens; bandagem 2d4+2 e remove sangrando (com álcool, 2d8+2 e gasta a dose); incenso 1d4 PE uma vez por dia; pedra de amolar +1d4 na primeira cena em que a arma for usada; utensílios +2 | **P** |
| Catalisador Sofisticado e Horrorizado | 75 | 3d6 por cena, 1d6 por ritual no momento de conjurar (dano, cura ou DT) (`ordem.reservas`) | **A** |
| Machado do Mutilador, Elmo e Manoplas do Colosso, Punhal X, Sniper Fantasma, A Antena, Faca Predadora | 41–93 | itens amaldiçoados; dano extra que multiplica no crítico (Machado), sangramentos cumulativos, RD do elmo, cegueira uma vez por alvo por cena, morte em 2 turnos (Sniper), A Antena (+3 na DT empunhada, um ritual contido e libertado sem ações nem PE), Faca Predadora (2 PE, 2d10 PV, excesso em temporários) | **P** |
| Armas acopláveis | 71 | par marcado no inventário; acoplar/separar (ação de movimento); a principal ataca com duas mãos, categoria +I, +1 dado, +1 na margem ou no multiplicador (escolhido ao criar), espaços dobram; a outra metade não ataca enquanto acoplada; vale com Combater com Duas Armas | **A** |
| Inquérito Mensal (esclarecimentos) | 104 | Reter Ritual: a perda de foco depende da natureza do efeito e da mesa — a ficha avisa, não cancela sozinha | **I** |
| Contos, biografias, mural e trilha sonora | — | narrativa | — |

### O modo Hexatombe na campanha

Ligado pelo mestre na aba **Hexatombe**; o jogador só vê a aba com o modo ativo.
Cada operação é uma função pura de `js/ordem/hexatombe.js`, aplicada numa cópia
do estado; os lançamentos de ficha vão primeiro (`lancar_hexatombe`), e o estado
é gravado com `rev` e `opId` (`salvar_hexatombe`).

- **Dias e fases.** Seis dias; preparação, execução e conclusão são sugestões, e o
  mestre troca a fase livremente. Avançar o dia só muda o dia, a fase e a produção
  da base (filtro: 6 águas; geladeira: 6 comidas — uma vez por dia). Avisa, sem
  resolver: dia sem sacrifício válido (o fracasso é marcado pela mesa) e quem ficou
  sem consumo registrado.
- **Sacrifícios e estigmas.** O primeiro sacrifício morto à noite é o do dia:
  desbloqueia a intenção do estigma, castiga os desertores que já existiam
  (−1d10 PV máximos e atuais e −1 em testes, até 6 vezes; Fortitude DT 20 avisada)
  e só então a equipe que perdeu o sacrifício vira desertora (−1 dado em testes,
  PV máximos pela metade). Um segundo na mesma noite, ou morto de dia, passa o
  estigma a quem matou; se quem matou não pode herdar, ou foi suicídio ou
  acidente, fica uma pendência “a Coroa escolhe”.
- **Desertores.** Quem sai da arena é desertor até voltar (os lançamentos são
  desfeitos); quem perdeu o sacrifício, para sempre. Na sexta noite, sem o
  sacrifício final, os desertores definham (confirmado pela mesa); com ele, a tela
  confere os seis presentes e lembra a regra VI.
- **Consumo.** Até a conclusão, cada participante registra água e comida (sai do
  estoque da equipe). Menos de 1: −10 PV ou PE máximos a partir do dia seguinte.
  2 ou mais recupera o déficit mais antigo ainda aberto (o lançamento é desfeito;
  desfazer o consumo o refaz). Fome e sede do livro básico (p. 292) continuam à
  parte.
- **Base.** Limpeza antes de tudo; teste contra DT 20: passou, faz e gasta;
  falhou, nada; falhou por 5 ou mais, gasta a sucata. Melhorias de recurso
  especial (enfermaria, biblioteca, sala de música, adega, garagem) são
  instaladas pela mesa. Camas: descanso normal (senão precário).
- **Exploração.** Áreas e caminhos; caminho já percorrido dispensa o teste. O teste
  de jornada é informado pela mesa (passou/falhou); falhar não impede de chegar e
  sorteia a consequência (1d6). Perícia que não Sobrevivência: uma vez no
  Hexatombe, por personagem. Procurar recursos: um teste por personagem em cada
  local; 15+, 20+ e 25+ abrem as colunas (1d12); o achado vai para o estoque.
- **Encontros.** As quatro tabelas (noturno/diurno, base/exploração), rolagem ou
  valor escolhido, registradas no diário do mestre.
- **Intenções.** Só com o estigma desbloqueado e uma vez por participante; a
  recompensa vira lançamento na ficha vinculada: Rancor +5 de dano, Obsessão RD 5,
  Prazer +10 PV máx., Orgulho +10 PE máx.; Desejo e Culpa entram como registro.
- **Lançamentos na ficha.** Id estável `hx.<regra>.<participante>.<marca>`;
  repetir não lança de novo; desfazer marca; “refazer” devolve o mesmo. Os que
  não chegaram ficam pendentes no estado e são reenviados.
- **O que o jogador recebe** (filtrado no servidor): dia, fase, sacrifícios
  realizados (dia e estigma), intenções desbloqueadas, mapa, a própria equipe
  (base, estoque, descanso, colegas) e, do próprio participante, consumo,
  déficits, castigos e intenções cumpridas. Equipe rival: só o nome. Nunca notas
  do mestre, pendências, lançamentos pendentes ou diário alheio.

### Formas de criatura e perfis de aliado

`ordem.formas` guarda as fichas publicadas da forma transformada; `ordem.pvBase`, os
PV da ficha de partida. A chave de ocorrência `forma` (a mesma regra no site e em
`definirNaInstanciaDaCriatura`) troca os PV máximos para os da ficha da forma e só
prende os atuais no novo máximo: **trocar de forma nunca restaura PV**. Estados,
usos, marcadores e anotação são da ocorrência e continuam. A vista mostra a ficha
da forma (estatísticas, perícias, habilidades e ações, com ids próprios). Uma
ocorrência nova começa na ficha de partida. Perfis `aliada` não têm PV nem PE.

### Divergências da publicação (texto publicado × leitura adotada)

- **Capturar Momento (p. 66):** o bloco repete o efeito de Mapa Sanguíneo; adotado o
  efeito da ficha de Labirinto (símbolo que capta imagens e sons), o único que fecha
  com as formas discente e verdadeira. Alvo, duração e resistência também lidos
  dessa forma (ver `divergencias` do ritual).
- **Rituais das formas de Labirinto e de Juan:** círculo impresso “???”; nenhum
  círculo foi deduzido do dano, e as ações de NPC não viram rituais de personagem.
- **Felino-infernal (p. 32):** o quadro saiu com o título “Arara-infernal”; PV 230
  com machucado 125; o texto cita “felino-infernal supremo”. Mantido como publicado.
- **Tuco (p. 86):** o primeiro ataque se chama “Foices Acorrentadas” e causa impacto;
  Imobilização Militar traz “teste +12” sem dados (sem rolagem pronta).
- **Juan (p. 91):** “Descansar Discente” é Descarnar; a forma diz “PPESSOA”.
- **Kemi como aliada:** a segunda habilidade repete o nome “Figura Influente”.
- **Remi como aliado:** chama os poderes de “Sintonia Mental”.
- **Poderes de Intenção nas fichas de NPC:** Novo Caminho como reação e como ação
  padrão; O Sabor do Silêncio como reação (p. 95: ação padrão); Sede de Vingança
  “uma vez por rodada” só na ficha; Filho da Dor sem a reação de desligar.
- **Arte da Música Macabra (p. 83):** frases soltas copiadas do Catalisador e sem
  pré-requisito; o R.A.M.A. ignora as frases e não inventa requisito.
- **Especialista em Correntes (p. 70):** dois poderes com o mesmo nome; separados
  pelo efeito.
- **Acoplável (p. 71):** o exemplo publicado (duas espadas 1d8/1d10 → 2d10, 19/x3)
  soma o dado sobre o dano de duas mãos e escolhe o multiplicador; a regra é a do
  texto (+1 dado do mesmo tipo e +1 na margem OU no multiplicador).
- **Jae-Yoon:** a pentágono dá Presença 1, apesar do perfil de influenciadora;
  mantido como publicado (ordem dos atributos no pentágono: AGI, FOR, PRE, VIG, INT).

### O que a ficha e a campanha guardam de novo

Na ficha: `ordem.intencao`, `ordem.formaSuprema`, `ordem.sintonizacoes`,
`ordem.pendentes`, `ordem.fortalecimentos`, `ordem.reservas`, `ordem.marcas` e
`ordem.hexatombe` (dia, lançamentos) — normalizados em `R.normalizar`, vazios numa
ficha antiga; nos itens, `ordem.acoplavel`, `ordem.antena`, `ordem.amolada`;
nos aliados, `perigo`. Na criatura: `ordem.formas`, `ordem.pvBase`, `ordem.aliada`,
`ordem.ficha` e `instancia.forma`; nos ataques, `multiplicaTudo`. Na campanha: a
linha de `CAMPANHA_HEXATOMBE`.

## Arquivos Secretos 3 (v2.33)

Fonte `AS3` (Arquivos Secretos 3, v1.0, Jambô), no registro único dos livros
(`C.LIVROS`) e nas listas próprias de cada módulo (itens, rituais, poderes,
criaturas, inventário, consumo, imagens e `ler_imagem_do_turno` no
`Campanhas.gs`). Páginas são as do livro. As regras ficam em
`js/ordem/arquivo3.js`; a tela, em `js/paginas/ficha-arquivo3.js`.

### Inventário do PDF

| Página | Conteúdo | Tipo | Onde entrou |
|---|---|---|---|
| 4–41 | PSIKOLERA: Alê (11), Caio (17), Eloy (23), Franco (29), Cindy (37), Caíto (41) | fichas de ameaça (pessoas) | catálogo de criaturas, categoria PSIKOLERA |
| 42–73 | Couraças: Ana (47), Argano (51), Chispa (57), Torvo (63), Escarlata (69), Miasma (73) | fichas de ameaça | categoria Couraças |
| 74–105 | Pássaros: Coruja (81), Corvo (88), Papagaio (92), Pomba (95), Harpia (101), Suellen (105) | fichas de ameaça | categoria Pássaros |
| 108 | Guardião da Tropa, Vitalidade Sofrida (combatente); Flagelo Bem Aproveitado, Recuperação Flagelante (ocultista); Ambidestria (geral) | poderes | `poderes.js` |
| 109 | Entrada Triunfal, Papinho Sedutor (gerais); Instrumento Elétrico de Combate (Energia), Conhecimento de Direção Precognitiva (Conhecimento) | poderes | `poderes.js` |
| 110–111 | Digno de Sacrifício; Arrogância Diabólica, Causar Culpa, Despertar Obsessão, Estimular Hedonismo, Fruto da Ambição, Ódio Suprimido | poderes de Sacrifício (categoria própria) | `PODERES_SACRIFICIO` |
| 112–115 | Paçoca, Garra do Harpia, Bloody Mary Batizada, Crânio Dominador, Gaiola do Corvo, Camiseta Psikolera, Dupla Obsessiva (maça e florete), Armaduras dos Couraças | itens | `itens-dados.js` (9 entradas) |
| 116–118 | Ana, Argano, Chispa, Escarlata, Torvo; Coruja, Harpia, Corvo, Papagaio, Pomba; Alê, Caio, Cindy, Eloy, Franco | perfis "como aliado" | `as3.criatura.<nome>-aliado` |
| 119 | Combatente Performático (Ensaio, Frase de Efeito, Mosh Pit, Rítmo Contagiante); regra Trilha Geral | trilha + regra opcional | `catalogo.js`, `poderes.js`, `trilhaGeral` |
| 120 | Batalhas de Intenções | regra opcional (ficha) | `batalhasDeIntencoes` |
| 121 | Trocas de Recursos; Tempo de Construção de Base | regras opcionais (campanha) | modo Hexatombe (`regrasAs3`) |
| 122–123 | Jogos do Circo (Acerte os Dardos, Máquina de Soco); Boas Recordações | regras opcionais (ficha) | `jogosDoCirco`, `boasRecordacoes` |
| 124 | Regras da Paixão; condições Apaixonado e Trêmulo | regra opcional + condições | `regrasDaPaixao`; Trêmulo citado em Silenciar (Cindy) |
| 125–131 | Veículos operacionais (categorias II, III, IV; moto dos Gaudérios Abutres; regalias; combustível; direção; danos; reparos) | regra opcional | `veiculosOperacionais` |
| 132–134 | Animais treinados: aliado (Serpente, Corvo, Gato) ou ficha de ameaça da realidade | regra opcional + perfis | `animaisTreinados`, `as3.criatura.<nome>-animal` |
| 138–141 | Mural dos agentes: como fazer a ficha de uma criatura; Valores Médios para Criaturas | orientação de Homebrew + tabela | editor de criaturas (referência) |

Rituais impressos nas fichas (Cicatrização, Proteção Sigilosa, Hemofagia,
Descarnar, Flagelo de Sangue, Aprimorar Físico/Mente, Esconder os Olhos,
Definhar, Tecer Ilusão) são AÇÕES da ameaça, com os números dela, e não entram
na biblioteca de rituais. As histórias (biografias) não entram.

### Automação, item por item

| O quê | Nível | Como |
|---|---|---|
| Vitalidade Sofrida | conta | troca a tabela de PV do combatente por 24 + Vig e 6 + Vig, retroativa, uma vez (efeito `tabelaDePv`); com NEX & Experiência, por nível; vindo de Mundano/Sobrevivente, só os degraus de agente usam 6 + Vig |
| Guardião da Tropa | parcial | botão gasta 2 PE; uso fica pendente até a mesa dizer o resultado; só "não venceu a Defesa / não afetou por completo" dá 1 SAN, uma vez por uso. Segunda aquisição: alcance curto |
| Flagelo Bem Aproveitado / Poder do Flagelo | conta | "Usar ritual" paga PE com PV (2 PV por PE; 1 com o poder); a ficha guarda os PV do flagelo |
| Recuperação Flagelante | parcial | recupera só os PV do flagelo, um uso por aquisição (até 3) por interlúdio |
| Ambidestria | parcial | escolhe duas armas e rola os dois ataques; –1d20 nos ataques até encerrar (próximo turno) ou a cena acabar; com Combater com Duas Armas, sem penalidade e armas de uma mão |
| Entrada Triunfal | parcial | uma vez por sessão (cronologia); +1d20 guardado para o próximo teste (nunca Furtividade) ou transferido |
| Papinho Sedutor | parcial | no resultado de teste de Presença, 1 PE dá +5 (só para seduzir); apaixonado é do alvo |
| Direção Precognitiva | parcial | no resultado de Percepção/Sobrevivência, +5 (+10 com afinidade), só para orientação |
| Instrumento Elétrico | parcial | cria a arma no inventário (Artes, Presença no dano, 2d8 Energia, 20/x2, cat. II, 2 espaços), proficiência só do dono; quebrar libera um novo instrumento; o que vale para armas é decisão registrada da mesa |
| Ensaio | conta | margem +1/+2/+3/+4 pelo NEX até o próximo interlúdio; uma vez por cena; quem ensaia junto registra na própria ficha |
| Frase de Efeito | conta | no crítico próprio, 2 PE e o dano usa o multiplicador novo; para aliado, mostra o multiplicador |
| Mosh Pit | parcial | no dano corpo a corpo, informa quantos cercam (contando você, como no exemplo) e soma até 5d6 |
| Rítmo Contagiante | conta | +5 na Defesa na cena; cada crítico próprio +1, contado pelo id da rolagem (recarregar não reconta) |
| Poderes de Sacrifício | parcial | concedidos pelo estigma (Digno registrado pela mesa); custo, DT Pre + 5, ramos e registro de uso; Ódio Suprimido com Fortitude e Reflexos separados e os danos das armas |
| Fruto da Ambição | parcial | escolhe poder ou ritual conhecido como gatilho; a forma é a de As Máscaras (AS2 p. 97), pela seção Forma suprema |
| Itens | conta/parcial | Camiseta (+2d8 Sangue machucado, vestida), Couraças (Defesa +1/semana até +20, RD, vulnerável a Morte, testes 6d6 refeitos por semana/missão), Paçoca (1/dia), Crânio (24 h = próximo dia), Gaiola (Lodo, 3d10 por rodada), Bloody Mary (2d4 mental) |
| Aliados do AS3 | conta/parcial | "acompanhando" liga os bônus fixos (Caio +1d20 Furtividade, Cindy +5, Eloy RD 5, Chispa +9 m, Pomba e Coruja "considerado treinado", animais +2); Argano e Ana somam no dano; Alê rola de novo (fica o melhor, 1/cena) e guarda 2d20 por missão (troca o d20 mais alto, mesmo menor); Eloy rola de novo os 1–2 (fica o novo); Cindy +2d8 por 2 PE; Torvo –1 PE em rituais de Sangue |
| Batalha de Intenções | parcial | +1d10 oferecido no dano contra o alvo; calculadora de dano sofrido divide por dois o que não vem dele |
| Boas Recordações | conta | foto: 1d4 no recurso escolhido; olhar: 1/missão, +1d6 num teste até o fim do dia |
| Paixão | conta | 1d8 PV e 1d8 PE (rolados separados) num laço por vez; perder o parceiro tira o bônus para sempre |
| Jogos do Circo | conta | dardos: 3 × Pontaria, pontos pela DT; soco: golpe e gasto antes de rolar, ×100, quebra com 18+ |
| Veículos | conta/parcial | instâncias de modelo; Defesa com a Agi de quem dirige; manobra pela DT; combustível em d6 (tanque furado: um dado já é 1); galão +2d6; dano massivo → 1d8; pontos vitais; reparos por DT; Arsenal 3/missão |
| Animais | parcial | VD pelo NEX (sem a redução das ameaças da realidade), aprovação do mestre, treino numa folga; a ficha vira um aliado da ficha pelo editor de criaturas |
| Valores médios | referência | escolhe a linha (VD fora da tabela mostra as vizinhas), forte/média/fraca por resistência, prévia e "aplicar os marcados"; ataque, dano e DT ficam como referência |
| Trocas de Recursos / Tempo de Construção | parcial | campanha: troca paga do estoque (1 ou 3 recursos, tipo exigido opcional), conteúdo só para a equipe e a mesa; obra de 7 dias −1 por pessoa (mín. 3), sucata no início, a mesa conclui |

### Cronologia da campanha

"Uma vez por dia", "24 horas", "por sessão", "a cada semana" e "por missão"
usam `ordem.arquivo3.cronologia` (missão, dia, semana, sessão), marcada à mão no
painel — nunca o relógio do computador. Nova missão e nova semana também
avançam o dia.

### Divergências da publicação e leituras adotadas

- **Hora do Show de Alê (p. 11)**: imprime Defesa 26 e 90 PV; a ficha tem 18 e 45
  (+10/+20 dariam 28 e 65). A forma usa os valores impressos, com nota.
- **Fichas mascaradas**: o livro não imprime; as ações da forma são as da ficha
  com +5 no ataque, +2 dados de dano e +5 na DT, como a Hora do Show lista.
- **"–2O"** (Argano) é o pior de dois d20 (`-2d20`), não um número negativo.
  "–2O" em Silêncio Fúnebre é penalidade de dois dados, em texto.
- **"CD20"** (Coruja, Corvo) lido como DT 20. **Descarnar** (Escarlata) imprime
  DT 29 para o primeiro teste e DT 23 nos rituais; mantido. **Definhar** (Corvo)
  imprime DT 15; mantido. **Hemofagia** (Ana) sem DT: a dos rituais (20), com nota.
- **"d10+5"** (Franco) lido como 1d10+5. Suellen imprime os atributos duas vezes,
  com os mesmos valores.
- **Caíto, Miasma e Suellen** estão nas seções das equipes; o livro não diz se
  são membros. Os poderes de sacrifício deles são versões de NPC (DT fixa).
- **Mosh Pit**: "para cada aliado cercando-o" com o exemplo de +4d6 para quatro
  seres (você, um aliado flanqueando e dois adjacentes): a ficha conta quem
  cerca, incluindo você.
- **Paixão**: "1d8 PV e PE" — rolados separadamente (a penalidade de apaixonado
  soma os dois). "Perde permanentemente a quantidade recebida": o bônus sai
  para sempre (atuais e máximos). Papinho Sedutor deixa apaixonado sem PV/PE:
  penalidade 0, a mesa ajusta.
- **Tempo de Construção**: o livro não diz se há teste nem quando a sucata sai;
  a ficha cobra a sucata no início e não pede teste. A obra só termina quando a
  mesa conclui (o Hexatombe dura 6 dias; obras longas passam disso).
- **Armaduras dos Couraças**: a –5 de proteção pesada (OPRPG p. 62) continua; o
  livro só diz que ela não pesa (0 espaços) e dispensa proficiência.
- **Dupla Obsessiva**: um item (categoria III, 2 espaços) com duas armas; o
  catálogo tem as duas, com 1 espaço cada e a nota da categoria do par.
- **Veículos**: "x espaços de carga (ou um total de y)" lido como carga com a
  lotação e total sem passageiros (20 por ser médio), conferido nos quatro.
- **Valores médios (p. 141)**: a linha de VD 30 foi conferida pela posição do
  texto na página (três linhas sob Recruta: 10, 20, 30); não há linha de 40 nem
  50, e a ficha não arredonda. A DT de efeitos salta de 31 (VD 240) para 37 (VD
  260) e os PV de 400 (VD 200) para 550 (VD 220): mantidos como impressos.
- **Animais**: a progressão de VD segue +20 a cada 5% de NEX a partir de 20%,
  até VD 340 em 95% e 360 em 99%.
- **Rítmo** é a grafia impressa ("Rítmo Contagiante"); mantida.

### O que a ficha e a campanha guardam de novo

Na ficha, `ordem.arquivo3` (normalizado em `R.normalizar`, vazio numa ficha
antiga; sem o módulo, passa como veio): cronologia, sacrifício, flagelo,
guardião, entrada, ensaio, rítmo, frase, ambidestria, instrumento, paixões,
recordações, batalha, circo, veículos, animais, aliados (acompanhando e
escolhas) e marcas de itens. `ordem.opcionais` ganha oito chaves. Na criatura:
`formas[].somaAtuais` e `especial` nas habilidades. Na campanha (estado do
Hexatombe): `regrasAs3`, `equipes[].obras` e `trocas`.

## Arquivos Secretos 4 (v2.38)

Fonte `AS4` (Arquivos Secretos 4, v1.0), no registro único dos livros
(`C.LIVROS`) e nas listas próprias de cada módulo (itens, rituais, poderes,
criaturas, imagens e `ler_imagem_do_turno` no `Campanhas.gs`). Páginas são as do
livro. As regras da ficha ficam em `js/ordem/arquivo4.js`; a tela, em
`js/paginas/ficha-arquivo4.js`. A regra opcional de Hacking é da campanha:
`js/ordem/hacking.js` (copiado dentro do `Campanhas.gs`) e
`js/paginas/campanha-hacking.js`.

### Inventário do PDF

| Página | Conteúdo | Tipo | Onde entrou |
|---|---|---|---|
| 2–5 | créditos, sumário | — | não entra |
| 5–23 | “Créditos.EXE”: missão solo em salas numeradas | missão solo (narrativa) | só referência; não vira ficha nem regra |
| 23–41 | O Anfitrião: aparições históricas (Roma, Silenius, Plautus…) | narrativa | só referência; nenhuma ficha inventada |
| 42–47 | A Produção: o culto, membros e os cinco perfis (Sistemáticos, Enigmáticos, Desordeiros, Frenéticos, Teatrais) | narrativa | referência; os perfis alimentam o gerador |
| 48 | Gerador de Produção do Anfitrião (1d10 perfil, dois d6 traços, dois d20 aparência) | tabela | biblioteca de criaturas, “Gerador de Produção do Anfitrião” |
| 49 | Exemplos de membros (Carlos, Mônica, Antônio, Mariana, Hilário) | narrativa | não viram ficha (sem estatística publicada) |
| 50–54 | práticas, rituais do culto, estrutura, missões com a Produção | narrativa / ganchos de aventura | só referência |
| 55 | Assistente de Produção (VD 40) | ficha de ameaça (pessoa) | `as4.criatura.assistente-de-producao` |
| 56 | Produtor (VD 80) | ficha de ameaça | `as4.criatura.produtor` |
| 57 | Diretor (VD 200) | ficha de ameaça | `as4.criatura.diretor` |
| 58–61 | Simulacro (Energia/Conhecimento) e a forma evolutiva troyan → krypto → vvorm → botnetz; Exorcismo Digital | criatura com estágios + procedimento | `as4.criatura.simulacro`, `formas` e `procedimentos` |
| 62–63 | créditos, “Sobre a matéria” | — | não entra |
| 64 | Influencer Paranormal, Caçador de Recompensas | origens | `catalogo.js` |
| 65 | Chuva de Balas, Combatente Esforçado, Treinamento Militarizado (combatente); Análise Conturbada, Profissão Perigo, Quase Novo (especialista) | poderes de classe | `poderes.js` |
| 66 | Explorador da Névoa, Sinestesia Paranormal, Terrores Noturnos (ocultista); Gororoba, Ruído Branco (gerais) | poderes | `poderes.js` |
| 67 | Uma Última Olhada (geral); Foco Gravitacional, Sobrepor Imprevisível, Traço de Inconsistência (Energia) | poderes | `poderes.js` |
| 68 | Backup (Energia, 2º círculo; discente e verdadeiro) | ritual | `as4.ritual.backup` |
| 69 | Granadeiro Blaster (Meus Bebês, Fogo Amigo, O Calor do Momento, Memória Muscular) | trilha de especialista | `catalogo.js`, `poderes.js` |
| 70 | Granada Ctrl+C Ctrl+V (amaldiçoada), granadas de gás lacrimogêneo e de tinta | itens | `itens-dados.js` |
| 71 | Lançador de granadas; modificações Adesiva, Dupla, Programada; o modelo 40 mm | item + modificações | `itens-dados.js` |
| 72–73 | Hacking: cena, PS, dados virtuais, cinco ações, Imprevistos Digitais | regra opcional (campanha) | aba Hacking da campanha |
| 74–75 | mural de cosplays e artes | — | não entra |
| 76–78 | Inquérito Mensal: ajudas contra o Apóstolo do Sangue e o nidere; a lógica das ajudas | consulta / preparo de cena | painel da criatura, “Inquérito Paranormal” |

**Fora do escopo, por pedido:** os usos novos de perícias que o suplemento
apresenta (como “Obter Informações”) **não** entram em descrição de perícia,
menu, ação, biblioteca ou automação. As ações próprias do Hacking são outra
coisa: existem só dentro de uma cena de hacking.

### Automação, item por item

| O quê | Nível | Como |
|---|---|---|
| Influencer Paranormal | parcial | “Registrar o Paranormal” (ação padrão, 2 PE, uma vez por cena) guarda criatura ou ritual da cena. +5 no resultado de Vontade, escolhendo a criatura registrada. Numa cena de interlúdio, memoriza um ritual registrado até o círculo do NEX (1º 5%, 2º 25%, 3º 55%, 4º 85%): fica no painel do AS4, abre “Usar ritual” e vale até o próximo interlúdio — não vira ritual aprendido |
| Caçador de Recompensas | parcial | +2 no resultado de Fortitude/Reflexos/Vontade (contra condição mental ou de medo, quem confirma). A falha marcada guarda +1d20 para o próximo teste, que não acumula e acaba no fim da cena |
| Chuva de Balas | conta | +10 por pacote de balas com a contagem de munição. No dano de arma de fogo, ANTES de rolar, pergunta quantos pacotes inteiros sacrificar (+2 dados cada); saem do inventário com `opId` — repetir não sacrifica de novo e recalcular não devolve munição |
| Combatente Esforçado | conta | +1 PE por degrau de NEX (com NEX & Experiência, por nível), retroativo |
| Treinamento Militarizado | parcial | exercitar-se no interlúdio (até o Vigor, até o fim da missão); +1d8 em teste de AGI/FOR/VIG ou no dano, um por rolagem (id da rolagem) |
| Análise Conturbada | parcial | escolhe quem aceita; 1d6 de cada um = bônus em Intelecto e Presença na cena e a mesma perda de SAN; na própria ficha vira efeito de cena e a SAN sai |
| Profissão Perigo | parcial | uma vez por missão; só itens que cabem na categoria e nos espaços; 4 PE, saída e entrada numa gravação só, com confirmação |
| Quase Novo | parcial | no interlúdio: +10 PV adicionais anotados no item e uma modificação temporária que sai sozinha no próximo interlúdio; permanentes e catálogo intactos |
| Explorador da Névoa | conta | 2 PE, uma vez por cena; o mestre informa a Membrana; danificada ou pior: −1 SAN e “Usar ritual” cobra 1 PE a menos na cena |
| Sinestesia Paranormal | conta | aceitar rola 1d6 de SAN e troca o atributo de dois pares de perícias (treino e vínculos ficam); encerrar devolve; de novo só no dia seguinte da cronologia |
| Terrores Noturnos | parcial | 1d100 por interlúdio; ≤ 50: −1d4 SAN, descanso precário (mesa) e um poder paranormal ou ritual de uso único até o próximo interlúdio |
| Gororoba · Ruído Branco · Uma Última Olhada | parcial | limites por interlúdio/cena; +1d6 no resultado de Investigação/Percepção; a informação e as rodadas são do mestre |
| Foco Gravitacional | conta | relação com o item (não muda o catálogo): guardado, uma unidade com 0 espaços; empunhar rola 25%; item destruído pede outro; até 3 com afinidade |
| Sobrepor Imprevisível | parcial | 2 PE, d20 (2d20 com afinidade, escolha); par soma, ímpar subtrai; o mestre reposiciona — ninguém age duas vezes |
| Traço de Inconsistência | parcial | gasta o PE; efeito da história — nenhuma foto, avatar ou arquivo é alterado |
| Meus Bebês | parcial | 1/2/3/4 explosivos autorais no início da missão (uma entrega por missão da cronologia; recarregar não entrega de novo), com autor e fora do limite de itens, ocupando espaço |
| Fogo Amigo | conta | conta como Perito em Explosivos (Intelecto na DT, exclui alvos); com Perito também adquirido, o Intelecto entra duas vezes e as exclusões dobram; área +6 m (raio, cone ou esfera, cada um como é) |
| O Calor do Momento | parcial | 4 PE, explosivo autoral “às pressas”; 25% de explodir na mão rolado no USO (inclusive no lançador), nunca na fabricação |
| Memória Muscular | conta | dobro dos DADOS de dano dos explosivos autorais (fixos não); empunhar como ação livre; uso como ação de movimento por 4 PE só para o autor |
| Granadas e explosivos | conta | “Usar explosivo”: DT 10 + limite de PE + atributo (+ Perito), área, resistência, efeito; gasta a unidade antes de rolar; nada é aplicado a ninguém sem a mesa escolher |
| Ctrl+C Ctrl+V | conta | d4 depois de cada explosão: par gera outra (dano próprio) até a quarta ou o primeiro ímpar; as cópias não são itens |
| Adesiva · Dupla · Programada | conta | Adesiva: contra um ser, ataque; acertando, falha automática na resistência. Dupla: o efeito de outra granada (nunca amaldiçoada). Programada: temporizador em turnos do jogo, explosão só quando a mesa confirma. +I na categoria; iguais não se acumulam |
| Lançador de granadas | conta | 6 granadas 40 mm, recarga de uma por ação de movimento, cada uma com as próprias modificações e autoria; contra um ser, ataque contra a Defesa e o alvo atingido sem teste de resistência; contra um ponto, sem ataque e todos na área testam; consome a granada escolhida; o modelo arremessável não entra |
| Backup | parcial | o cartão do ritual registra o chamariz (frase, aparência), troca de lugar (2d4 SAN), sentidos na cópia (cego, surdo e pasmo em Condições), dissipação com 6d6 na versão verdadeira; o chamariz é efeito ligado a quem conjurou, não uma segunda ficha |
| Ameaças da Produção | ficha | ataques, críticos e danos alternativos; rituais com DT e limite por conjuração, sem reserva de PE |
| Simulacro | ficha + ocorrência | estágios com VD 32/64/128/256, tamanho e atributos (Força “—”), deslocamento 0, DT roladas (4d10); trocar de estágio mexe só na ocorrência, troca os PV máximos e nunca cura |
| Exorcismo Digital | ocorrência | participantes (mínimo 2 treinados), requisitos marcados pelo mestre, teste estendido (3 sucessos antes de 3 falhas) com DT 4d10 rolada; o primeiro sucesso desativa Saltar; aprisionado e destruído são etapas diferentes |
| Gerador de Produção | consulta | 1d10, dois d6 e dois d20 independentes, sem somar; só texto |
| Inquérito Paranormal | consulta | as ajudas da p. 76–77 no painel da criatura; o mestre registra a que valer na ocorrência; o catálogo não muda |
| Hacking | regra opcional | ver abaixo |

### Hacking (p. 72–73)

Desligado por padrão em toda campanha; o mestre liga na aba Hacking, e só então
os jogadores veem a aba. Não tem ligação com o Hexatombe nem com a perícia
Tecnologia fora da cena. Cena = sistema-alvo + DT de Hackear (vira os PS). Cada
agente entra com o treino em Tecnologia e o Intelecto (= dados virtuais, d6).
Turno: até duas ações, conforme o treino — Procurar Brechas e Quebrar Códigos
(treinado), Cobrir Rastros e Programar Backdoor (veterano), Plantar Vírus
(expert). Os testes de Tecnologia são rolados na ficha e o total entra na tela;
os d6 virtuais são rolados na aba. PS zerados: acesso aos arquivos durante uma
cena; numa cena posterior, o processo inteiro de novo (backdoors e vírus
continuam no sistema). Fim da rodada: a tela sugere o imprevisto de cada agente
pelos 1 do último turno dele e o mestre confirma ou troca antes de aplicar
(Rastro detectado rola 2d6). A cena continua de uma sessão para outra.
**Nada aqui acessa dispositivo, rede ou arquivo de verdade.**

### Interpretações (o que o livro não diz)

- **Perfil 7–8 do gerador**: o cabeçalho vem cifrado na arte; o nome,
  Enigmáticos, é o da p. 47 (e Mariana, “enigmática”, na p. 49).
- **Gerador**: resultados repetidos ficam como saíram.
- **Fogo Amigo**: “valor adicionado” lido como o Intelecto de Perito em
  Explosivos na DT (OPRPG p. 30); nenhum bônus de resistência vira DT.
- **Granada de tinta**: a resistência evita vulnerável; o −2d20 em Furtividade é
  redução de dados, aplicada pela mesa. A duração da nuvem de gás não é dada e
  não é inventada.
- **Lançador**: onde a granada cai num erro é do mestre. Granadas mundanas
  oferecem o modelo 40 mm (as regras do livro básico valem para elas).
- **Explorador da Névoa**: sem duração no livro; o desconto vale na cena.
- **Backup discente**: o requisito publicado (2º círculo) foi mantido.
- **Simulacro**: machucado = metade dos PV do estágio; os PV atuais ficam ao
  trocar de estágio (o mestre ajusta), nunca curados em silêncio.
- **Exorcismo Digital**: a DT 4d10 é rolada a cada teste; o mestre pode manter
  a anterior.
- **Hacking**: 1→Dor nos pulsos … 4→Invasão detectada pela ordem impressa; com
  zero resultados 1, nada é sugerido; com Cobrir Rastros, contam os 1 que
  sobraram; “perde o progresso” = PS de volta ao máximo, dados mantidos; a DT de
  Procurar Brechas sobe por agente. A aba mostra essas leituras como
  interpretações, não como regra.

### O que a ficha e a campanha guardam de novo

Na ficha (schema 17), `ordem.arquivo4` (normalizado em `R.normalizar`, vazio numa
ficha antiga): registros do Influencer e ritual memorizado (retrato), bônus do
Caçador, exercícios, análises, Profissão Perigo, Explorador, Sinestesia,
Terrores, usos por cena/interlúdio, Foco Gravitacional, Sobrepor, entregas do
Granadeiro, chamariz do Backup, explosões e temporizadores. No item:
`ordem.autoral`, `ordem.foraDoLimite`, `ordem.modeloGranada`, `ordem.lancador`
(granadas carregadas com modificações e autoria) e `ordem.quaseNovo`; a
modificação temporária leva `temporaria: "interludio"`. Na criatura:
`procedimentos` no modelo e `instancia.procedimentos` na ocorrência; formas com
`tamanho` e `atributos`. Na campanha: a aba `CAMPANHA_HACKING`.

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

33. **Exaustão e desmaio.** Os contadores da v2.19 saíram na v2.20 — ver
    [Exaustão e desmaio: não são contadores](#exaustão-e-desmaio-não-são-contadores-v220).

34. **Requisito “pré-requisitos com todas as entidades” (AS1 p. 49).** Lido como:
    exigências que citam um elemento (uma concessão “de Conhecimento”, Aprender
    Ritual do elemento) aceitam o ritual por qualquer dos elementos dele. A
    exigência nova é a afinidade com pelo menos um, conferida em toda aquisição
    que não seja concessão da mesa.

35. **Discente de Passagem de Conhecimento (AS1 p. 48)** está impressa com “Requer
    2º círculo” num ritual que já é de 2º círculo. Mantida como impressa.

36. **“Conjurar ritual de Nº círculo” (AS1 p. 44-47)** é lido como conhecer, naquela
    etapa, um ritual de pelo menos esse círculo (e do elemento, quando pedido) —
    contando grimório e rituais de vários elementos em cada elemento.

37. **Ferido por Ritual (AS1 p. 43).** A perícia do elemento é a escolhida da
    origem, restrita a Fortitude, Vontade e Reflexos; a Progressão acusa se a do
    elemento não estiver treinada. A Mácula conta desde a origem (NEX 0%) para
    qualquer classe.

38. **Sofrimento de Sangue (AS1 p. 43).** Aprender Ritual não conta como poder de
    Sangue (o ritual que ele ensina já conta), e a segunda escolha de um poder pela
    afinidade não é outro poder.

39. **Saúde Sobrenatural e PV temporários.** “Não cumulativos com eles mesmos”: a
    mesma fonte substitui; fontes diferentes (Rubra, Sangue Prazeroso) somam. Os
    temporários entram no máximo e no atual e somem com a troca de cena, como os
    PE temporários do Profetizado.

40. **Reter Ritual (AS1 p. 58-59).** Retenção sem PE (Mácula) continua registrada.
    Perder o foco não é automático: a aba Rituais avisa e solta todos com um clique.
    Reter Ritual de Combate “muda para cena” tirando a retenção (o máximo volta) e
    lembrando que o efeito dura até o fim da cena.

41. **Transcender com Itens (AS1 p. 56-57).** A vaga de cada intervalo mora no
    começo dele (0%, 26%, 51%, 76% de exposição): é lá que os requisitos do poder
    são conferidos. O item “mundano” é derivado da escolha — desfazer a escolha
    devolve o item.

42. **Compreensão de Maldições (AS1 p. 45).** Transferir aceita item do mesmo tipo
    (arma para arma, proteção para proteção) ou a tatuagem; maldições iguais e
    elementos opressores seguem a regra de OPRPG p. 144. O original sai do
    inventário.

43. **Reproduzir Maldição.** A DT usa a categoria antes da maldição nova (com
    Maldição Suprema, já descontada). “Nenhum item pode ter categoria maior do que
    IV” é conferido depois da maldição nova.

44. **Combustível de Sangue (AS1 p. 55).** Quanto do tanque cada disparo ou galão
    consome não está escrito: fica com a mesa.

45. **Agatha Volkomenn (AS1 p. 19)** é aliada pela regra de aliados (OPRPG p. 170),
    sem estatística de combate: no bestiário, aparece sem PV e com os benefícios
    como habilidades.

46. **Teste de jornada (AS2 p. 18).** O livro não dá a DT: a mesa decide e informa
    se o teste passou. A ajuda dos outros e o NPC que conhece a arena também são
    da mesa.

47. **Recursos encontrados (AS2 p. 20).** “O resultado determina a quantidade de
    recursos” com uma tabela de três colunas (15+, 20+, 25+): a leitura padrão é
    uma rolagem de 1d12 na maior coluna alcançada; o mestre pode trocar para uma
    rolagem em cada coluna alcançada.

48. **Melhorias de recurso especial (AS2 p. 17).** O custo delas é um recurso, não
    sucata, e o texto do teste de melhoria fala em sucata: a mesa instala, sem
    teste.

49. **Trocar de forma (AS2, fichas transformadas).** O livro dá PV próprios a cada
    forma e não diz o que acontece com os atuais. O R.A.M.A. troca só o máximo e
    prende os atuais nele — nunca restaura; o mestre ajusta à mão se a mesa ler
    de outro jeito.

50. **Perfil “como aliado” × ficha de ameaça.** São entradas separadas do
    bestiário; o perfil não herda nada da ameaça (nem PV nem ações).

51. **Castigo do desertor.** O castigo vale para quem já era desertor quando o
    sino toca; a equipe que perde o sacrifício naquela noite deserta depois dele e
    só é castigada a partir do sacrifício seguinte.
