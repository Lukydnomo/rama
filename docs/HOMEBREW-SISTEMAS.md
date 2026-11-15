# Homebrew nativo por sistema e Modelo Universal

A especificação ("Homebrew nativo por sistema e Homebrew Universal") se
organiza em três etapas.

| Etapa | Situação |
|---|---|
| **1 — Estrutura e compatibilidade** | entregue na **v9.7.0** |
| **2 — Tipos estruturais e elementos** | parte 1 na **v9.8.0** (Elemento e Classe de Ordem I), parte 2 na **v9.9.0** (Origem e Trilha de Ordem I), parte 3 na **v9.10.0** (Raça de Tormenta20), parte 4 na **v9.11.0** (Origem e Divindade de Tormenta20); o resto pendente |
| **3 — Automação por sistema, publicação e regressão** | pendente |

Este documento é o **inventário de cobertura**. Para cada sistema e tipo,
ele diz qual editor existe, para onde o conteúdo vai, o que é automático e o
que fica manual. Ele é atualizado a cada etapa.

## O que a Etapa 1 entrega

### Criar

**Homebrew → + Criar** abre o fluxo em duas telas:

1. **O sistema**, pelas capas do registro (`js/sistemas.js`). **Universal**
   vem primeiro, como "Crie com campos e regras da sua mesa". O sistema do
   filtro da biblioteca, se houver, aparece sugerido, e dá para trocar.
2. **Os tipos daquele sistema**, em cartões com uma frase de ajuda.

Os editores de criatura, ritual e habilidade de Ordem que já existiam são os
mesmos, chamados a partir desse fluxo.

### Editores guiados pelo adaptador

O registro de adaptadores fica em `js/homebrew-adaptadores.js`. Os editores
seguem estas regras:

- **Item** é a entrada única. Dentro dele, o **Tipo de item** decide os
  campos: arma, armadura, escudo, proteção, mochila ou recipiente,
  consumível, ferramenta, acessório, munição, os subtipos do sistema e
  **Outro (narrativo)**.
- **Habilidade** reúne os subtipos do sistema: Magia em T20, Poder de
  Disciplina em Vampiro, Vantagem em BRUTAL. Em **Ordem Paranormal**, o
  Ritual fica em **Habilidade → Ritual**, com o editor de rituais de sempre,
  e na ficha continua na aba Rituais.
- Nome, Tipo e os campos essenciais aparecem logo. As **Opções avançadas**
  ficam recolhidas.
- Cada controle traz unidade e exemplo.
- Tudo é editado num **rascunho**:
  - trocar o tipo não apaga o que foi preenchido, mas só os campos do tipo
    escolhido são gravados (um campo escondido nunca altera o jogo, e o
    resumo avisa);
  - um erro ao salvar não fecha a janela;
  - fechar com mudanças pede confirmação.
- **Resumo lateral (Revisão)**: o resumo do registro, o que é automático e o
  que é manual ou decisão da mesa. No celular, uma coluna.
- **Filtros da biblioteca**: Itens (reúne arma, armadura e mochila sem
  regravar), Habilidades, Rituais e Criaturas, mais um filtro por sistema.

### Modelo Universal

Começa no **Básico** (nome, tipo, descrição). Outras partes entram sob
demanda:

- **Modelos iniciais**: Item, Habilidade, Ritual, Criatura, Arquétipo
  (classe, raça ou origem), Elemento/Condição e Em branco. Cada um aceita um
  rótulo próprio de tipo.
- **Adicionar campo**: texto curto ou longo, número com faixa e unidade,
  sim/não, lista de opções, lista de referências, fórmula de dado e recurso
  (atual/máximo).
  - Os campos podem ser subidos, descidos, duplicados, renomeados e
    removidos.
  - A **chave de cada campo é estável**: renomear não a muda.
- **Adicionar ação**: usos ou cargas (com recuperação manual, por cena ou
  por descanso), custo em recurso, teste, efeito, alvo, requisitos e
  duração.
  - Efeitos possíveis: recuperar recurso, gastar/ferir recurso, só rolar ou
    manual.
  - A **prévia** mostra a rolagem e a mudança num exemplo.
- **Fórmulas** são dados validados pelo rolador do R.A.M.A.
  (`RAMADados.total`: dados, somas e números). Código é recusado.

### Na ficha

| Ficha | Caminho | O que entra |
|---|---|---|
| **Universal** | biblioteca do inventário | Itens Universal com campos e ações. Cada ação ganha um botão com os usos restantes. |
| **Ordem** | biblioteca do inventário | Itens Universal e de Ordem. |
| **T20, Goblins, Vampiro, Oblívio, Ordem II, BRUTAL** | botão **Do Homebrew** | Os itens do próprio sistema, pelo caminho de inserção da própria ficha (ver o inventário abaixo). Habilidades de Ordem II entram como habilidade própria. |

**Ações na ficha Universal.** Usar uma ação:

1. Rola pelo rolador e mostra o que vai mudar.
2. Só aplica depois de confirmar. Cancelar não gasta nada, e clicar duas
   vezes gasta uma vez.
3. Se a ficha não tem o recurso pelo nome exato, pergunta qual usar. Nome
   parecido não é ligado sozinho.
4. A carga gasta fica no item e sobe com a ficha (validado: salvar e
   reabrir).
5. **Recuperar usos** é um botão explícito: a ficha Universal não tem um
   gatilho de descanso confiável.

**Conteúdo de outro sistema.**
- Conteúdo Universal numa ficha de sistema cadastrado entra como **item
  narrativo**, com as regras marcadas como **Manual**. Nada é convertido nem
  mapeado sozinho.
- Conteúdo de outro sistema não aparece no seletor.

**Habilidades em T20, Goblins, Vampiro, Oblívio e BRUTAL.** Esses motores
ainda só aplicam habilidades do livro. A habilidade Homebrew pode ir para as
**anotações** da ficha (consulta), com o aviso Manual.

### Dados, servidor e pacotes

**O registro na biblioteca:**

```
{ tipo, nome, descricao, sistema,
  modelo: { versao: 1, sistema, grupo, subtipo, def },
  universal?: { campos, valores, acoes } }
```

- Ordem e Universal continuam gravando o item no formato do `RAMAFicha`
  (arma, armadura, mochila, item), que essas fichas já leem.
- Os outros sistemas guardam a definição nativa em `modelo.def`.
- **Registros antigos** (sem `modelo`) não são regravados. Continuam
  Universal e aparecem agrupados.
- **`salvar_homebrew`** confere o `modelo`: o sistema existe, o grupo e o
  subtipo são válidos, e a coluna `tipo` é uma que o sistema aceita. Uma
  criação não entra com o tipo de outro RPG.
- **Pacotes v9.6**:
  - um registro nativo só entra em pacote do próprio sistema;
  - Universal entra em qualquer pacote;
  - registros antigos seguem a regra de antes;
  - o julgamento é o mesmo na tela e no servidor (`testes/executar-pacotes.js`).
- **Exportar e importar**:
  - o registro com modelo volta pelo adaptador, com a mesma validação do
    editor;
  - as ações usam `chave`, e não `id` (a exportação apaga ids), então os
    usos gastos atravessam a exportação da ficha;
  - corrigido de passagem: o **Exportar** da página Homebrew quebrava,
    porque `RAMAValidacao.tipoDeExportacao` não era exportado.

## Inventário de cobertura (v9.7.0)

Legenda:
- **N**: nativo, o motor usa;
- **Ma**: entra com marca **Manual**;
- **C**: só consulta;
- **—**: ainda não existe.

| Sistema | Tipo | Editor | Destino na ficha | Automação | Manual / pendente |
|---|---|---|---|---|---|
| **Ordem I** | Item: geral, arma, proteção, munição, acessório, consumível, paranormal, mochila, outro | adaptador (categoria 0–IV, espaços, proficiência, tipo, empunhadura, alcance, dano, crítico, RD, elemento, capacidade) | inventário (biblioteca da ficha) | **N**: ataque, dano, crítico, Defesa e carga pelo inventário de Ordem | modificações e maldições pelo item na ficha (como antes) |
| Ordem I | Habilidade / poder; Ritual | os de sempre (habilidade; ritual com o editor da ficha) | aba Habilidades / Rituais (bibliotecas da ficha) | **N** (ritual: símbolo, círculo, elemento, conjuração) | — |
| Ordem I | Criatura | o de sempre | combate, aliados, consulta | **N** | — |
| Ordem I | **Elemento** (v9.8) | adaptador (cor, símbolo, relações, afinidade) | rituais (principal e vários), criaturas, item paranormal, afinidade | **N** nos campos; sem regra oficial herdada | relações: guardadas, automação na Etapa 3 |
| Ordem I | **Classe** (v9.8) | editor próprio em 6 etapas | criação de agente (Classes Homebrew), Progressão, Ramificação | **N**: PV/PE/SAN/PD, vagas, poderes e trilhas escolhidos, em NEX, nível e Patentes (com a tabela) | conjuração de rituais pela classe; troca de classe numa ficha existente |
| Ordem I | **Origem** (v9.9) | editor próprio em 3 etapas | criação de agente (aba Homebrew), troca de origem | **N**: perícias fixas treinadas; efeitos do conjunto que o motor soma (Defesa, PV/PE fixos, PV/SAN por marco, bônus em perícia) | escolhas internas no poder; o resto do texto é da mesa |
| Ordem I | **Trilha** (v9.9) | editor próprio em 3 etapas | vaga de Trilha (Progressão, criação), Ramificação | **N**: 4 poderes automáticos no marco (NEX, nível, Patentes), com os mesmos efeitos | escolhas internas nos poderes |
| **Ordem II** | Item: arma, proteção, consumível, equipamento (passos em perícia), outro | adaptador | inventário (Do Homebrew) | **N**: RA + dano, armadura, passos | — |
| Ordem II | Habilidade, Poder, Ritual (experimental) | adaptador | habilidades (habilidade própria) | **C** (texto) | efeitos estruturados: **Etapa 3** |
| Ordem II | Ameaça | o de sempre | mesa de Ordem II | **N** | Perfil e Ocupação: **Etapa 2** |
| **Tormenta20** | Item: arma, armadura, escudo, vestuário, ferramenta, alquímico, esotérico, aventura, alimentação, munição, outro | adaptador (preço, espaços, proficiência, empunhadura, dano, margem, multiplicador, tipo, alcance, munição, bônus de perícia) | inventário (Do Homebrew), como `personalizado` | **N**: ataque calculado, Defesa e penalidade, bônus de perícia (`efeitos`), espaços | melhorias e encantos (pela ficha, como antes) |
| Tormenta20 | Habilidade: magia (círculo, escola, execução…), poder, habilidade | adaptador | anotações | **Ma** | o motor só aplica poderes e magias do livro: **Etapa 2** |
| Tormenta20 | Ameaça | o de sempre | mesa de T20 | **N** | Classe: **Etapa 2** |
| Tormenta20 | **Origem** (v9.11) | editor próprio em 3 etapas | criação de personagem (depois das do livro) | **N**: os dois benefícios (perícia treinada, poder geral com as regras do livro, poder único com efeitos) | itens (texto); o resto do texto do poder único |
| Tormenta20 | **Divindade** (v9.11) | editor próprio em 3 etapas | criação de personagem (depois do Panteão); poderes concedidos na ficha | **N**: devotos, energia, arma preferida; poderes concedidos do livro (regras do livro) e próprios (efeitos) | obrigações e restrições (texto); o resto dos poderes próprios |
| Tormenta20 | **Raça** (v9.10) | editor próprio em 3 etapas | criação de personagem (passo Raça, depois das do livro) | **N**: atributos fixos e à escolha, tamanho, deslocamento; efeitos que o motor soma (Defesa, perícia, treino, PV/PM por nível, sentido, RD, proficiência); perícias à escolha (treino ou bônus) | variantes, habilidades ativadas (PM), escolhas de magia/poder; o resto do texto é da mesa |
| **Goblins** | Item: arma (mãos, ataque, bônus, munição, recarga, arremesso), proteção (uso, durabilidade), equipamento, outro | adaptador | inventário (Do Homebrew), pelo `adicionarItem` com `personalizado` | **N**: ataque, bônus, munição, recarga e durabilidade no `defDoItem` | — |
| Goblins | Habilidade: magia, técnica, habilidade | adaptador | anotações | **Ma** | **Etapa 2** |
| Goblins | Inimigo | o de sempre | consulta | **N** | Ocupação, Descritor e PokéPragas: **Etapa 2** |
| **Vampiro V5** | Item: arma e armadura sobre uma base do V5, equipamento, objeto sobrenatural, outro | adaptador | equipamento (Do Homebrew) | **N**: dano e proteção da base, dano próprio | — |
| Vampiro | Habilidade: poder de Disciplina, habilidade | adaptador | anotações | **Ma** | **Etapa 2** |
| Vampiro | Antagonista | o de sempre | consulta | **N** | Clã, Predador, Disciplina, Vantagem e Defeito: **Etapa 2** |
| **Oblívio** | Item: equipamento sobre uma base do catálogo, objeto narrativo | adaptador | inventário (Do Homebrew), pelo `adicionarItem` | **N**: espaços, Durabilidade, Dano e Proteção da base (sem número inventado) | equipamento com números próprios: **Etapa 3** |
| Oblívio | Habilidade (requisitos, custo, alvo, limite) | adaptador | anotações | **Ma** | **Etapa 2** |
| Oblívio | Ameaça | o de sempre | consulta | **N** | Papel, Motivação, Mazela e Fardo: **Etapa 2** |
| **BRUTAL** | Item = Apego "item" (nome e texto) | adaptador (só o que o Corte Rápido usa) | Apego da ficha (troca com confirmação) | **N**: o Apego rende PT como sempre | — |
| BRUTAL | Habilidade: vantagem (tensão, janela) | adaptador | anotações | **Ma** | **Etapa 2** |
| BRUTAL | Arquétipo, Estilo, modelos de mesa | — | — | — | **Etapa 2** |
| **Universal** | Item (equipamento, arma, proteção, recipiente, consumível, ferramenta, acessório, outro) + campos + ações | adaptador + Modelo Universal | inventário Universal e de Ordem (biblioteca); narrativo nos outros sistemas | **N** na ficha Universal: ações com usos, custo, teste e efeito em recurso | alvo escolhido na hora e efeito manual: botão de marcar uso |
| Universal | Habilidade, Ritual, Criatura, Arquétipo, Elemento/Condição, Em branco | adaptador / os de sempre | habilidades e rituais (biblioteca), combate | **C**, e as ações (Modelo Universal) | integração de Arquétipo e Condição com a ficha: **Etapa 2** |

## Validação da v9.7.0

### Automática

**`testes/executar-homebrew-sistemas.js`** (novo, 47) roda os motores de
verdade:
- **T20**: arma, escudo e ferramenta com bônus; a arma empunhada aparece nos
  ataques calculados.
- **Goblins**: arma e proteção pelo `adicionarItem`.
- **Vampiro**: arma sobre base, com dano próprio.
- **Oblívio**: equipamento sobre base e objeto narrativo.
- **Ordem II**: arma e passos.
- **BRUTAL**: o Apego.
- **Ordem**: arma e proteção.

O mesmo teste cobre ainda:
- trocar o subtipo sem deixar campo escondido valendo;
- registros antigos agrupados e compatibilidade com pacotes;
- destino nativo, Manual e incompatível;
- **Modelo Universal**: chave estável, faixa e opções, fórmula sem código,
  e o **Kit de Cura** (2 cargas, 1d6, teto do máximo, sem usos, recuperar,
  escolha de recurso, custo + teste + efeito);
- **exportar, importar, editar e reabrir** (T20, Ordem II, magia de T20,
  Kit), arquivo de sistema desconhecido recusado, e a ficha exportada com a
  carga gasta.

**`testes/executar-pacotes.js`**: a matriz sistema × criação passou a
incluir registros nativos.

### Na interface

No servidor local, com uma conta sintética:

- **Seletor de sistema**: Universal primeiro e os sete sistemas.
- **Tormenta20 → Item**: os onze subtipos. Trocar Arma ↔ Escudo muda os
  campos, preserva os valores e mostra o aviso. Ao salvar, só os campos de
  arma vão para o servidor.
- **Universal → Item, "Kit de Cura"**:
  - ação com prévia de exemplo;
  - fórmula com código recusada;
  - campo "Raridade".
- **Na ficha Universal**:
  - a biblioteca mostra o Kit e esconde a espada de T20;
  - "Usar o kit" perguntou o recurso (a ficha tem PV, não "Vida");
  - Cancelar não gastou;
  - PV 3 → 8, com o cartão da rolagem;
  - clique duplo em Aplicar gastou uma vez;
  - recarregada, a ficha mostra "(1/2)" e o servidor guarda o uso.
- **Ficha T20 → Do Homebrew**:
  - a espada entra pelo motor;
  - o Kit aparece como Universal (Manual);
  - na aba Combate, a espada empunhada tem ataque 1d10, 19/x3, C.
- **Celular**: o editor numa coluna, sem rolagem lateral.

Sem erros no console nem no servidor.

## Publicar a v9.7.0

**Servidor:** troque **`Codigo.gs`** e **`HomebrewPacotes.gs`** e crie uma
versão nova da implantação. **`setupRama()` não é necessário**: nenhuma aba
nova, e o modelo vai no `dadosJson` de sempre.

**Site:**
- `js/homebrew-adaptadores.js`, `js/paginas/homebrew-editor.js`,
  `js/paginas/homebrew-ficha.js`, `js/paginas/homebrew.js`;
- `js/pacotes-homebrew.js`, `js/validacao.js`, `js/ficha.js`;
- `js/paginas/ficha-inventario.js`,
  `js/paginas/ficha-inventario-biblioteca.js`;
- as fichas `js/tormenta20/telas/ficha-t20.js`,
  `js/goblins/telas/ficha-goblins.js`, `js/vampiro/telas/ficha-vampiro.js`,
  `js/oblivio/telas/ficha-oblivio-jogo.js`, `js/ordem2/telas/ficha-o2.js`,
  `js/brutal/telas/ficha-brutal.js`;
- `homebrew/index.html`, `ficha/index.html`, `css/homebrew.css`,
  `css/modern20/homebrew.css`, `js/versao.js`.

## Próximas etapas (o que falta da especificação)

**Etapa 2 — tipos estruturais e elementos.**

- **Ordem I**:
  - Classe Homebrew com PV/PE/SAN (ou PD), ganho por marco, perícias,
    proficiências e habilidades, em NEX, nível e Patentes, com a prévia pelo
    motor e a Ramificação;
  - Origem e Trilha;
  - **Elemento** Homebrew num catálogo único para rituais (principal e
    múltiplos), criaturas, poderes, itens, maldições e afinidade. Hoje há
    listas fixas em `js/criaturas.js`, `js/ordem/rituais.js`,
    `js/ordem/regras.js`, `js/ordem/progressao.js` e
    `js/ordem/inventario.js`. O elemento aceito pelo campo fica separado do
    efeito oficial. O caso de teste é "Vidro".
- **T20**: ~~Raça~~ (v9.10.0), ~~Origem e Divindade~~ (v9.11.0) e Classe,
  selecionáveis na criação e na progressão.
- **Ordem II**: Perfil e Ocupação.
- **Oblívio**: Papel, Motivação, Mazela e Fardo.
- **Vampiro**: Clã, Predador, Disciplina, Vantagem, Defeito e Ficha de
  Conhecimento.
- **Goblins**: Ocupação, Descritor e opções das variantes.
- **BRUTAL**: Arquétipo, Estilo e modelos de mesa.
- **Habilidades Homebrew no motor** de T20, Vampiro, Goblins, Oblívio e
  BRUTAL: resolver ids de Homebrew junto com o catálogo, com cópia
  versionada na ficha.
- **Dependências nos pacotes**: elemento de um ritual, poder de uma classe
  e assim por diante.

**Etapa 3 — automação por sistema.** Ações estruturadas pelo motor de cada
ficha: bônus por condição, dano/cura, custos, cargas, concessões e
expiração. Ações de Universal em ficha de sistema cadastrado pelo adaptador
de destino, com a escolha do recurso ou da perícia nativa. Reenvio com IDs
de operação nas mesas. A matriz de regressão por sistema.

## v9.8.0 — Etapa 2, parte 1: Elemento e Classe Homebrew de Ordem I

### Elemento Homebrew de Ordem

**Homebrew → + Criar → Ordem Paranormal → Elemento.** Os campos são nome,
descrição, cor, símbolo opcional e, em opções avançadas, "forte contra",
"fraco contra" e "pode ser escolhido como afinidade". O elemento recebe uma
**chave estável** (`hbe-<nome>-<id>`), que não muda ao renomear nem ao
importar.

**Catálogo único** (`js/ordem/elementos.js`). Ele separa duas perguntas:

| Pergunta | Quem responde |
|---|---|
| O **campo aceita** este elemento? | oficiais + Homebrew |
| Há **regra oficial** para ele? | só os cinco oficiais |

**O que passou a usar o catálogo:**
- normalização de ritual, inclusive principal e vários elementos;
- normalização de criatura e de item de Ordem;
- `RAMAOrdemCatalogo.elemento`;
- nomes no painel de criatura e no ritual;
- resumo de criatura no servidor (`nomesDeElementos`);
- filtro e marcas da biblioteca de criaturas;
- editor de ritual: principal e a lista de vários elementos, agora
  editável;
- editor de criatura e item paranormal;
- **afinidade**, só para os que a mesa permitiu.

**O que continua só com os oficiais:** requisito de Sangue, afinidade
oficial sem Medo, Opressão, horda, Arquivos 6/7, consumo, dano das origens.
Um elemento Homebrew **nunca herda** mecânica pela cor ou pelo nome. Na
afinidade, ele é marcado Homebrew, sem efeito oficial. As relações que a
mesa configurou ficam guardadas (`relacaoHomebrew`) para a automação da
Etapa 3.

**Cópia, não vínculo.** A definição viaja junto de quem a usa:
- `ordem.elementosHomebrew`, no bloco do ritual, da criatura ou do item;
- `ordem.homebrew.elementos`, na ficha, para a afinidade.

Renomear ou apagar na biblioteca não quebra nada. Uma chave `hbe-…` sem
definição (arquivo incompleto) fica como **referência pendente
identificada** ("Elemento Homebrew não encontrado (…)"). Ela nunca vira
Medo nem "sem elemento".

### Classe Homebrew de Ordem I

**Homebrew → + Criar → Ordem Paranormal → Classe.** O editor tem seis
etapas, com a prévia ao lado:

1. **Identidade**: poderes de classe e trilhas vêm de uma classe oficial
   escolhida, ou de nenhuma.
2. **Recursos**: PV, PE, SAN e PD, inicial e por marco, com parcela de
   atributo opcional (ex.: + Vigor).
3. **Perícias**: fixas, escolhas obrigatórias, livres, grau de
   treinamento, proficiências e habilidades iniciais.
4. **NEX e nível**: 20 marcos, com o que cada um concede e o que pede
   (trilha, poder, atributo, grau, versatilidade).
5. **Patentes**: a tabela, opcional.
6. **Revisão**: a prévia pelo motor, o que é automático e o que falta.

O editor pode começar de uma **cópia** das tabelas de Combatente,
Especialista ou Ocultista.

**No motor.** A classe registrada entra em `RAMAOrdemCatalogo.classe`, na
tabela de NEX (que também serve ao nível com NEX & Experiência) e em
`EVOLUCAO_PATENTES.classes`. Isso alimenta:
- PV, PE, SAN e PD calculados;
- as vagas da Progressão;
- os candidatos a poder de classe (`classeDosPoderes`) e as trilhas
  (`trilhaServe`);
- as perícias da criação (`periciasDaClasse`);
- a **Ramificação** (planos com a classe Homebrew; os planos existentes não
  mudam).

**Trilho sem tabela.** Se falta a tabela de um trilho, a criação mostra a
classe desabilitada com o motivo, e uma ficha nesse trilho fica sem vagas.
Ela **nunca** usa a tabela de uma classe oficial.

**Na ficha.** Ela guarda a sua **cópia versionada** (`ordem.homebrew.classes`,
chave `hbc-<id>-<hash>`):
- editar a classe na biblioteca cria outra versão, e o personagem em jogo
  continua com a dele;
- o Mestre e quem recebeu a ficha não precisam alcançar a biblioteca;
- uma página sem o módulo novo também preserva a classe.

**Criação de agente.** A etapa Classe ganhou **Classes Homebrew** (as suas e
as públicas), com a prévia pelos atributos da ficha e a disponibilidade no
trilho.

### Servidor e pacotes

- `TIPOS_HOMEBREW` ganhou `classe` e `elemento`, e o grupo `estrutural`
  passou a ser aceito.
- Só os estruturais que o sistema usa de verdade são aceitos (por enquanto,
  Ordem: classe e elemento). Raça em T20, por exemplo, ainda é recusada.
- Pacotes: Classe e Elemento entram em pacote de Ordem, agrupados em
  "Classes" e "Elementos".
- Um ritual ou criatura com Vidro leva a cópia do elemento dentro: a
  dependência viaja junto, e quem importa vê "Vidro" mesmo sem o elemento
  na biblioteca.
- Exportar e importar (`homebrew-estrutural`) mantêm a chave do elemento e
  as tabelas da classe.

### Validação da v9.8.0

**Automática.**

`testes/executar-homebrew-ordem.js` (novo, 44), pelo motor:
- **Classe**: chave versionada; NEX 5% com 20 PV e NEX 10% com 27; não é a
  tabela do Combatente; vagas da tabela própria; poderes só do "poderes
  de…" ou só gerais; trilhas só com "trilhas de…".
- **Nível**: o nível 2 ganha o 2º marco.
- **Patentes**: sem tabela, nenhuma vaga e nada emprestado; com tabela, 33
  PV (fórmula do SAH, p. 110), e não 46 (Combatente), com as vagas da
  tabela.
- **Cópia**: recarregar e exportar/importar a ficha mantêm a classe; a
  Ramificação projeta 10 → 20% com a tabela.
- **Vidro**: ritual Vidro + Energia com a cópia; criatura; reabrir sem a
  biblioteca; referência pendente; lixo recusado; item paranormal;
  afinidade sem efeito oficial; afinidade oficial intacta; relação só a
  configurada.
- **Adaptador e arquivo**: chave do elemento ao renomear e importar, classe
  ida e volta, pacotes.

`testes/pacotes-backend.js`: Classe e Elemento no servidor, estrutural de
T20 recusado e pacotes.

**Na interface** (servidor local, conta sintética):
- Criei o **Vidro** (cor, ◇, forte contra Morte, afinidade). O ritual
  **Estilhaços Refletidos**, de Vidro + Energia e 2º círculo, aparece na
  lista e na consulta como "Vidro e Energia".
- Criei a **criatura Espectro de Vidro**; o servidor resume com o nome.
- Criei a **classe Vigilante** pelo editor (tabelas do Combatente, PV 18 +
  Vig e 5 + Vig, sem Patentes). A revisão avisou da falta de Patentes.
- **Criação de agente**: o Vigilante aparece em Classes Homebrew com a
  prévia (21 PV com Vigor 3), as escolhas de perícia da classe e PV 21 na
  revisão. Ficha gravada com a cópia. NEX 10% deu **29 PV** e a vaga de
  Trilha.
- **Ocultista a 55%**: a afinidade abriu com "Vidro (Homebrew)". A escolha
  foi gravada com a cópia na ficha, e o painel mostra "Vidro (Homebrew)".
- Editor de classe no celular: uma coluna, sem rolagem lateral.
- Sem erros no console nem no servidor.

### Publicar a v9.8.0

**Servidor:** troque **`Codigo.gs`** e crie uma versão nova da implantação.
**`setupRama()` não é necessário.**

**Site:**
- `js/ordem/elementos.js`, `js/ordem/homebrew-ordem.js`,
  `js/paginas/homebrew-classe.js` (novos);
- `js/ordem/catalogo.js`, `js/ordem/poderes.js`, `js/ordem/progressao.js`,
  `js/ordem/regras.js`, `js/ordem/rituais.js`, `js/ordem/inventario.js`,
  `js/ordem/criaturas.js`, `js/criaturas.js`;
- `js/ordem/telas/ordem-criar.js`, `js/ordem/telas/ordem-escolhas.js`,
  `js/ordem/telas/ficha-ordem.js`;
- `js/paginas/ficha-rituais.js`, `js/paginas/homebrew-criatura.js`,
  `js/paginas/criaturas-biblioteca.js`, `js/paginas/homebrew.js`,
  `js/paginas/homebrew-editor.js`, `js/paginas/ficha.js`;
- `js/homebrew-adaptadores.js`, `js/pacotes-homebrew.js`, `js/validacao.js`;
- `css/homebrew.css`, `css/componentes.css`, `js/versao.js`;
- as páginas que carregam Ordem: `index.html`, `ficha/`, `homebrew/`,
  `personagens/`, `campanha/`, `campanhas/`, `catalogo/`, `perfil/`.

### O que ainda falta na Etapa 2

**Ordem I:**
- ~~**Origem** e **Trilha** Homebrew~~ — feitas na v9.9.0 (abaixo).
- Classe que conjura rituais (o "Escolhido pelo Outro Lado" com círculos por
  NEX).
- Classes Homebrew também na troca de classe e na transição de uma ficha
  existente (hoje, só na criação).
- Atualizar uma ficha para a versão nova de uma classe (hoje fica a cópia).
- Elemento Homebrew em poderes paranormais e maldições Homebrew (dependem
  dos editores desses tipos).

**Os outros sistemas:**
- T20: Raça, Origem, Classe e Divindade.
- Ordem II: Perfil e Ocupação.
- Oblívio: Papel, Motivação, Mazela e Fardo.
- Vampiro: Clã, Predador, Disciplina, Vantagem e Defeito.
- Goblins: Ocupação e Descritor.
- BRUTAL: Arquétipo e Estilo.
- As habilidades Homebrew no motor desses sistemas.

A **Etapa 3** (automação por sistema) continua como descrita acima.

## v9.9.0 — Etapa 2, parte 2: Origem e Trilha Homebrew de Ordem I

### Origem Homebrew

**Homebrew → + Criar → Ordem Paranormal → Origem.** O editor tem três
etapas (Identidade → Perícias e poder → Revisão), com a prévia ao lado:
- até duas perícias treinadas fixas;
- perícias à escolha (0 a 4), opcionalmente entre uma lista, com uma
  observação ("Duas à escolha do mestre");
- o poder: nome e texto, como aparece em Habilidades;
- **efeitos opcionais**, só do conjunto que o motor de Ordem já soma:
  Defesa, PV fixo, PE fixo, PV por marco, SAN por marco e bônus em
  perícia (até 4, valor de −5 a +10). Um tipo fora dessa lista é
  descartado na normalização. Sem efeito, o poder é informativo, como os
  do livro que dependem da cena.

**Onde entra:** na criação do agente (aba **Homebrew** da etapa Origem) e
na troca de origem (aba Geral, modo edição). As perícias fixas entram
treinadas e ficam em `periciasDaOrigem`, como as do livro; os efeitos
entram na conta da ficha; o cartão em Habilidades mostra o texto,
"Entra na conta" e "Homebrew".

### Trilha Homebrew

**Homebrew → + Criar → Ordem Paranormal → Trilha.** Três etapas
(Identidade → Poderes → Revisão):
- a **classe oficial** a que serve. Serve também às Classes Homebrew que
  usam as trilhas dela ("Trilhas: as do Especialista");
- um requisito opcional: ser treinado numa perícia (como Médico de Campo
  pede Medicina);
- os **quatro poderes** (NEX 10%, 40%, 65% e 99%), cada um com nome,
  texto e os mesmos efeitos opcionais da origem.

Os poderes viram habilidades de trilha como as do livro
(`RAMAOrdemPoderes.habilidadesDaTrilha`): chegam sozinhos no marco, com a
mesma regra de nível e Patentes das trilhas oficiais. A trilha aparece na
vaga de Trilha da Progressão, na revisão da criação e na Ramificação.

### Cópia, versão e catálogo

O mesmo esquema da classe:
- chave versionada (`hbo-<id>-<hash>`, `hbt-<id>-<hash>`): editar na
  biblioteca cria outra versão, e o personagem em jogo continua com a dele;
- a ficha guarda a cópia em `ordem.homebrew.origens` e
  `ordem.homebrew.trilhas`;
- as origens e trilhas da biblioteca (suas e públicas) entram no catálogo
  ao carregar (`carregarBiblioteca`), e as listas de escolha as mostram;
- ao escolher (criação, troca de origem, vaga de Trilha, Ramificação), a
  cópia é gravada (`RAMAOrdemHomebrew.embutir`). A normalização embute a
  que faltar;
- uma chave `hbo-`/`hbt-` com a cópia na ficha nunca é apagada, mesmo numa
  página sem a biblioteca. Sem a cópia e sem o catálogo, a chave some (nada
  é inventado).

Fonte `HOMEBREW`: nunca bloqueada por suplemento desligado. A referência
mostra "Homebrew".

**Correção:** numa ficha com Classe Homebrew que usa as trilhas de uma
oficial, a trilha escolhida sumia na normalização (a conferência olhava só
`trilha.classe === ficha.classe`). Agora ela fica, a oficial e a Homebrew.

### Servidor e pacotes

- `TIPOS_HOMEBREW` ganhou `origem` e `trilha`.
- Os estruturais aceitos em Ordem passaram a ser `classe`, `elemento`,
  `origem` e `trilha`. Origem estrutural em T20 continua recusada.
- Pacotes agrupam em "Origens" e "Trilhas" (só em pacote de Ordem).
- Exportar e importar (`homebrew-estrutural`) refazem a definição pelo
  normalizador do motor.

### Validação da v9.9.0

**Automática.** `testes/executar-homebrew-ordem.js` passou de 44 para 71:
- **Origem**: chave versionada; só os efeitos aceitos; fonte Homebrew
  liberada; +1 Defesa e +1 PV por marco na conta; entra em
  `origensDisponiveis` sem mexer em `ORIGENS`; sem cópia e sem catálogo
  some; escolhida da biblioteca, a normalização embute a cópia; opções de
  perícia.
- **Trilha**: chave, classe, requisito e os 4 poderes; sobrevive com a
  cópia; poderes como habilidades de trilha; NEX 10% dá +3 PV e NEX 40%
  +1 Defesa; entra nas trilhas do Combatente e não nas do Ocultista; numa
  ficha de outra classe o vínculo some; classe Homebrew com as trilhas do
  Combatente mantém a Homebrew e a oficial; `embutir` leva a cópia.
- **Biblioteca e arquivo**: guardar, ida e volta pelo arquivo, o texto do
  poder não vira descrição, pacote só de Ordem, resumo da lista.

`testes/pacotes-backend.js`: Origem e Trilha gravadas com as colunas
próprias; Origem estrutural em T20 recusada.

**Na interface** (servidor local, conta sintética):
- Criei a origem **Vidraceiro** pelo editor (Profissão e Percepção, poder
  Olho Treinado, +1 Defesa e +1 PV por marco) e a trilha **Lapidador**
  (Especialista, requisito Profissão, Primeiro Corte +3 PV, Faceta
  +1 Defesa). A lista e a consulta mostram as regras.
- **Criação de agente** (Especialista, NEX 10%): a aba "Homebrew (1)"
  trouxe o Vidraceiro, e Profissão e Percepção vieram "já treinadas pela
  origem". A prévia somou: PV 25 e Defesa 13. Na revisão, "Escolher trilha"
  mostrou o Lapidador com "✓ Treinado em Profissão"; escolhido, o PV foi a
  28.
- **Ficha gravada**: as cópias estão em `ordem.homebrew.origens` e
  `ordem.homebrew.trilhas`. PV 28 e Defesa 13 no cabeçalho; Olho Treinado e
  Primeiro Corte em Habilidades.
- A troca de origem lista "Vidraceiro (atual)" como Homebrew.
- O editor reabre com tudo preenchido; no celular, uma coluna, sem rolagem
  lateral.
- Sem erros no console nem no servidor.

### Publicar a v9.9.0

**Servidor:** troque **`Codigo.gs`** e crie uma versão nova da implantação.
**`setupRama()` não é necessário.**

**Site:**
- `js/paginas/homebrew-origem-trilha.js` (novo);
- `js/ordem/homebrew-ordem.js`, `js/ordem/catalogo.js`,
  `js/ordem/poderes.js`, `js/ordem/regras.js`, `js/ordem/ramificacao.js`;
- `js/ordem/telas/ordem-criar.js`, `js/ordem/telas/ordem-escolhas.js`,
  `js/ordem/telas/ficha-origens.js`;
- `js/paginas/homebrew-editor.js`, `js/paginas/homebrew.js`,
  `js/homebrew-adaptadores.js`, `js/pacotes-homebrew.js`;
- `css/homebrew.css`, `js/versao.js`, `homebrew/index.html`.

### O que ainda falta na Etapa 2 (depois da v9.9)

**Ordem I:**
- Classe que conjura rituais (o "Escolhido pelo Outro Lado" com círculos por
  NEX).
- Classes Homebrew também na troca de classe e na transição de uma ficha
  existente (hoje, só na criação).
- Atualizar uma ficha para a versão nova de uma classe, origem ou trilha
  (hoje fica a cópia).
- Escolhas internas nos poderes Homebrew (como "escolha uma perícia" ou "a
  arma favorita"): hoje só efeitos fixos.
- Elemento Homebrew em poderes paranormais e maldições Homebrew.

**Os outros sistemas:** os mesmos da lista da v9.8 (T20, Ordem II,
Oblívio, Vampiro, Goblins e BRUTAL, e as habilidades Homebrew nesses
motores).

## v9.10.0 — Etapa 2, parte 3: Raça Homebrew de Tormenta20

### O editor

**Homebrew → + Criar → Tormenta20 → Raça.** Três etapas
(Identidade → Atributos e habilidades → Revisão), com a prévia ao lado no
desktop e uma coluna no celular:
- **Identidade:** nome, descrição, tamanho (Minúsculo, Pequeno, Médio,
  Grande) e deslocamento (6, 9 ou 12 m);
- **Atributos:** fixos de −2 a +2 e, se quiser, 1 a 3 atributos à escolha
  (+1 ou +2), como o Humano. Um atributo fixo não pode ser escolhido de
  novo;
- **Habilidades** (até 6): nome, texto e até 4 **efeitos** do conjunto que
  o motor de T20 já soma, no formato das raças do livro:
  - bônus na Defesa ou numa perícia (−5 a +10);
  - perícia treinada;
  - PV no 1º nível e por nível seguinte (como Duro como Pedra);
  - PM por nível (como Sangue Mágico);
  - sentido: visão no escuro, na penumbra ou faro;
  - redução de dano de um tipo (1 a 10);
  - proficiência: armas marciais ou exóticas, armas de fogo, escudos,
    armaduras pesadas.

  E **uma escolha** por habilidade: 1 a 3 perícias à escolha, treinadas
  (como Híbrido) ou com bônus de +1 a +5 (como Deformidade). É o "traço
  inicial" que quem joga escolhe na criação.
- **Revisão:** a prévia, o que é automático, o que quem joga escolhe e o
  que fica com a mesa.

Um efeito fora da lista é descartado na normalização. Sem efeito, a
habilidade é informativa: a ficha mostra o texto e a mesa aplica.
Tamanho e deslocamento diferentes do comum viram a habilidade "Tamanho e
deslocamento".

### Onde entra

Na **criação de personagem de Tormenta20** (passo Raça): as raças da
biblioteca (suas e públicas) aparecem depois das 17 do livro, marcadas
"Homebrew". A raça escolhida mostra a descrição, os atributos, cada
habilidade e o campo da escolha. Os atributos, o tamanho, o deslocamento
e os efeitos entram na conta da ficha. Na aba Habilidades, cada uma
aparece em "Raça e origem" com "Homebrew". O resumo da Mesa mostra o nome
da raça.

### Cópia, versão e servidor

O mesmo esquema da classe de Ordem:
- a chave é versionada pelo conteúdo (`hbr-<id>-<hash>`). Editar a raça
  na biblioteca cria outra versão, e o personagem em jogo continua com a
  dele;
- a ficha guarda a cópia em `tormenta20.homebrew.racas`. A normalização
  (`RAMATormenta20.normalizar`) passa a cópia pelo mesmo filtro e a
  registra em `RAMATormenta20Racas.RACA`, o mapa que o motor inteiro lê.
  Quem abre a ficha não precisa da biblioteca de ninguém;
- escolhida de uma lista da biblioteca, a normalização embute a cópia.
  Sem cópia e sem catálogo, a chave some: nada é inventado;
- **o servidor roda o mesmo motor:** `racas.js` e `regras.js` foram
  copiados para `backend/Tormenta20Dados.gs` e `backend/Tormenta20.gs`
  (`testes/gerar-tormenta20-gs.js`). A Mesa (dano, cura, recompensa)
  normaliza a ficha e mantém a cópia.

Arquivos: o motor (normalizar, registrar, referência "Homebrew") está em
`js/tormenta20/racas.js`; a página (biblioteca, textos da prévia) em
`js/tormenta20/homebrew-t20.js`, que é novo; o editor em
`js/paginas/homebrew-raca-t20.js`, também novo.

### Servidor e pacotes

- `TIPOS_HOMEBREW` ganhou `raca`; os estruturais de Tormenta20 são
  `['raca']`. Origem e Classe estruturais em T20 continuam recusadas.
- Pacotes agrupam em "Raças" (só em pacote de T20).
- Exportar e importar (`homebrew-estrutural`) refazem a definição pelo
  normalizador do motor.

### Validação da v9.10.0

**Automática.** O novo `testes/executar-homebrew-t20.js` tem 36
verificações:
- **Definição:**
  - chave versionada, estável ao normalizar de novo e diferente ao mudar;
  - atributos limitados a −2…+2;
  - só os efeitos aceitos e uma escolha de perícia por habilidade;
  - o corpo vem dos campos;
  - referência "Homebrew".
- **Motor:**
  - atributos;
  - PV 25 (Guerreiro 20 + Con 2 + 3);
  - Defesa 14;
  - Pequeno, 6 m;
  - redução de fogo 5 e visão no escuro;
  - a perícia escolhida entra treinada;
  - atributos e bônus à escolha;
  - resumo da Mesa.
- **Cópia:**
  - sobrevive a normalizar de novo;
  - some sem cópia e sem catálogo;
  - é embutida a partir do catálogo;
  - uma versão nova não muda a ficha;
  - uma cópia adulterada passa pelo filtro;
  - a raça do livro não ganha bloco Homebrew.
- **Biblioteca:** guardar, voltar da biblioteca com a mesma chave, resumo,
  destino, arquivo e pacote.

`testes/pacotes-backend.js`:
- a Raça de T20 é gravada com a coluna `raca`;
- a Classe estrutural em T20 é recusada;
- o pacote de T20 aceita a Raça e o de Ordem a recusa.

**Na interface** (servidor local, conta sintética):
- Criei a raça **Vidrado** pelo editor:
  - Pequeno, 6 m;
  - For −1, Des +2, Sab +1;
  - Pele de Cristal: +1 Defesa e redução de fogo 5;
  - Olhar Lapidado: visão no escuro e uma perícia treinada à escolha;
  - Têmpera: +3 PV no 1º nível e +1 por nível seguinte.

  A lista mostra "Raça · Pequeno · 3 habilidades", e a consulta mostra as
  regras e os textos.
- **Criação de personagem:**
  - Vidrado apareceu depois das 17 raças, com "Homebrew";
  - escolhi Furtividade no Olhar Lapidado, Acólito e Guerreiro;
  - a conferência mostrou PV 25, Defesa 14, deslocamento 6 m e
    Furtividade treinada.
- **Ficha gravada:**
  - raça Vidrado, tamanho Pequeno, PV 25 e deslocamento 6 m (Defesa 15
    com o escudo inicial);
  - visão no escuro e redução de fogo 5 no Combate;
  - as quatro habilidades em "Raça e origem" com "Homebrew";
  - no servidor, a cópia em `tormenta20.homebrew.racas` e a escolha em
    `raca.escolhas`.
- **Versão:** mudei o deslocamento da raça na biblioteca para 9 m; a ficha
  continuou com 6 m.
- O editor reabre preenchido. Funciona no celular (uma coluna, sem rolagem
  lateral) e no desktop (com o resumo ao lado). Sem erros no console nem no
  servidor.

### Publicar a v9.10.0

**Servidor:** troque **`Codigo.gs`**, **`Tormenta20.gs`** e
**`Tormenta20Dados.gs`**, e crie uma versão nova da implantação.
**`setupRama()` não é necessário.**

**Site:**
- `js/tormenta20/homebrew-t20.js` e `js/paginas/homebrew-raca-t20.js`
  (novos);
- `js/tormenta20/racas.js`, `js/tormenta20/regras.js`,
  `js/tormenta20/telas/t20-criar.js`, `js/tormenta20/telas/ficha-t20.js`;
- `js/homebrew-adaptadores.js`, `js/pacotes-homebrew.js`,
  `js/paginas/homebrew-editor.js`, `js/paginas/homebrew.js`;
- `css/homebrew.css`, `js/versao.js`;
- `homebrew/index.html`, `ficha/index.html`, `personagens/index.html`.

### O que ainda falta na Etapa 2 (depois da v9.10)

**Tormenta20:**
- Origem, Classe e Divindade Homebrew.
- Raça Homebrew: variantes (como o Suraggel), habilidades ativadas com
  custo em PM e escolhas além de perícias (magia, poder geral, elemento).
  Hoje, só efeitos fixos e perícias à escolha.
- Trocar a raça de uma ficha existente (a ficha de T20 ainda não tem essa
  troca para nenhuma raça).
- Habilidades e magias Homebrew no motor de T20 (hoje, anotações).

**Ordem I:** o mesmo da v9.9 (classe que conjura rituais, troca de classe,
atualizar a versão de uma cópia, escolhas internas nos poderes, elemento
em poderes paranormais e maldições).

**Os outros sistemas:**
- Ordem II: Perfil e Ocupação.
- Oblívio: Papel, Motivação, Mazela e Fardo.
- Vampiro: Clã, Predador, Disciplina, Vantagem e Defeito.
- Goblins: Ocupação e Descritor.
- BRUTAL: Arquétipo e Estilo.

## v9.11.0 — Etapa 2, parte 4: Origem e Divindade Homebrew de Tormenta20

### Origem

**Homebrew → + Criar → Tormenta20 → Origem.** Três etapas
(Identidade → Benefícios → Revisão):
- itens, um por linha, que entram como texto;
- as **perícias** (até 6, inclusive Ofício) e os **poderes gerais** (até
  6, de combate, destino, magia ou Tormenta) de onde saem os dois
  benefícios;
- o **poder único**: nome, texto e os efeitos do mesmo conjunto da raça.

Na criação de personagem, a origem aparece depois das do livro, marcada
"Homebrew". Quem joga marca dois benefícios, como numa origem do livro.
A perícia escolhida entra treinada. O poder geral entra com as regras do
livro, e o poder único com os efeitos configurados.

### Divindade

**Homebrew → + Criar → Tormenta20 → Divindade.** Três etapas
(Identidade → Poderes e obrigações → Revisão):
- título, descrição, energia (positiva, negativa ou à escolha do devoto)
  e arma preferida;
- devotos: qualquer um, ou raças e classes escolhidas. Humanos e clérigos
  podem ser devotos de qualquer divindade, como no livro (p. 96);
- obrigações e restrições, em texto. A ficha mostra; a mesa aplica;
- **poderes concedidos**: até 6 do livro e até 3 **próprios** (nome,
  texto e efeitos).

Os poderes próprios entram no catálogo de poderes com a chave
`<divindade>-p<n>`, como concedidos. Um poder concedido do livro listado
pela divindade atende o requisito "devoto". Na criação, a divindade
aparece depois do Panteão, com os poderes concedidos para escolher.

### Cópia, versão e servidor

O mesmo esquema da raça:
- chaves `hbor-…` e `hbdv-…`, versionadas pelo conteúdo;
- cópias em `tormenta20.homebrew.origens` e `tormenta20.homebrew.deuses`;
- a normalização (`homebrewDaFicha` em `regras.js`) trata raça, origem e
  divindade pelo mesmo caminho e as registra nos catálogos do motor. O
  servidor roda o mesmo código: `origens.js` e `deuses.js` entram em
  `Tormenta20Dados.gs`.

**Correção:** importar uma Origem de Tormenta20 de um arquivo passava pelo
normalizador da Origem de Ordem. Agora cada sistema usa o seu.

### Servidor e pacotes

- `TIPOS_HOMEBREW` ganhou `divindade`. Os estruturais de Tormenta20
  passaram a ser `raca`, `origem` e `divindade`. Divindade em Ordem é
  recusada.
- Os pacotes ganharam o grupo "Divindades".

### Validação da v9.11.0

**Automática.** `testes/executar-homebrew-t20.js` passou de 36 para 65
verificações:
- **Origem:**
  - chave;
  - perícias e poderes válidos (um poder concedido sai);
  - itens;
  - poder único só com efeitos aceitos;
  - benefício de perícia treinada, de poder único (+1 Defesa) e de poder
    geral (Vontade de Ferro);
  - resumo da Mesa;
  - some sem cópia nem catálogo;
  - raça e origem Homebrew juntas.
- **Divindade:**
  - chave;
  - poderes do livro mais os próprios;
  - devotos, energia e arma;
  - chave estável;
  - poder próprio (+2 Furtividade);
  - poder do livro (redução de frio 5) com o requisito "devoto" atendido;
  - quem pode ser devoto;
  - resumo da Mesa;
  - some sem cópia nem catálogo.
- **Biblioteca:** guardar, voltar da biblioteca, destino, resumo,
  arquivo (com os poderes próprios), pacote e prévias.

`testes/pacotes-backend.js`:
- Origem e Divindade de T20 são gravadas com as colunas próprias;
- Divindade em Ordem é recusada.

**Na interface** (servidor local, conta sintética):
- Criei a origem **Soprador de Vidro** (Investigação, Ofício, Percepção,
  Vontade de Ferro; poder único Olho de Vidreiro com +1 Defesa).
- Criei a divindade **Vitrea**:
  - positiva, adaga;
  - devotos: anão e guerreiro;
  - Fulgor Solar e o poder próprio Pele Translúcida, com +2 Furtividade.

  A lista mostra os resumos.
- **Criação:** um anão guerreiro com o Soprador de Vidro (Investigação e
  Olho de Vidreiro) e devoto de Vitrea (Pele Translúcida). A conferência
  mostrou Defesa 11 (10 + Des 0 + 1) e Investigação treinada.
- **Ficha gravada:**
  - origem e divindade no topo;
  - Defesa 12 com o escudo;
  - Olho de Vidreiro em "Raça e origem" e Pele Translúcida em "Poderes",
    os dois com "Homebrew";
  - Furtividade +1 (Des 0 + 2 − 1 do escudo);
  - no servidor, as cópias em `homebrew.origens` e `homebrew.deuses`.
- Sem erros no console nem no servidor.

### Publicar a v9.11.0

**Servidor:** troque **`Codigo.gs`**, **`Tormenta20.gs`** e
**`Tormenta20Dados.gs`**, e crie uma versão nova da implantação.
**`setupRama()` não é necessário.**

**Site:**
- `js/paginas/homebrew-origem-divindade-t20.js` (novo);
- `js/tormenta20/origens.js`, `deuses.js`, `racas.js`, `regras.js`,
  `homebrew-t20.js`, `telas/t20-criar.js`;
- `js/homebrew-adaptadores.js`, `js/pacotes-homebrew.js`,
  `js/paginas/homebrew-editor.js`, `js/paginas/homebrew.js`;
- `css/homebrew.css`, `js/versao.js`, `homebrew/index.html`.
