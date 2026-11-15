# Homebrew nativo por sistema e Modelo Universal

A especificação ("Homebrew nativo por sistema e Homebrew Universal") se
organiza em três etapas.

| Etapa | Situação |
|---|---|
| **1 — Estrutura e compatibilidade** | entregue na **v9.7.0** |
| **2 — Tipos estruturais e elementos** | parte 1 na **v9.8.0** (Elemento e Classe de Ordem I), parte 2 na **v9.9.0** (Origem e Trilha de Ordem I), parte 3 na **v9.10.0** (Raça de Tormenta20), parte 4 na **v9.11.0** (Origem e Divindade de Tormenta20), parte 5 na **v9.12.0** (Classe de Tormenta20), parte 6 na **v9.13.0** (ativadas, magia e variantes em T20), parte 7 na **v9.14.0** (Magia e Poder no motor de T20); o resto pendente |
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
| Tormenta20 | Habilidade → **Magia** (v9.14) | editor de campos | criação (Magias), + Aprender magia, lançamento | **N**: custo pelo círculo, CD, dano (metade na resistência), cura | aprimoramentos (texto) |
| Tormenta20 | Habilidade → **Poder** (v9.14) | editor próprio | Subir de nível, + Poder avulso | **N**: efeitos, ativação (PM), nível mínimo | outros requisitos (texto) |
| Tormenta20 | Habilidade (só texto) | adaptador | anotações | **Ma** | — |
| Tormenta20 | Ameaça | o de sempre | mesa de T20 | **N** | — |
| Tormenta20 | **Classe** (v9.12) | editor próprio em 4 etapas | criação de personagem; Subir de nível (também multiclasse) | **N**: PV, PM, perícias, proficiências, magias (CD, círculo, PM), habilidades da tabela com efeitos e escolha de perícia, poderes de classe com efeitos e nível mínimo | o resto do texto das habilidades e poderes; habilidades ativadas (PM) |
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
- **T20**: ~~Raça~~ (v9.10.0), ~~Origem e Divindade~~ (v9.11.0) e ~~Classe~~
  (v9.12.0), selecionáveis na criação e na progressão.
- **Ordem II**: ~~Perfil e Ocupação~~ (v9.21.0).
- **Oblívio**: ~~Papel, Motivação, Mazela e Fardo~~ (v9.19.0).
- **Vampiro**: ~~Clã, Predador, Disciplina, Vantagem, Defeito~~ (v9.20.0) e
  ~~Ficha de Conhecimento~~ (v9.27.0).
- **Goblins**: ~~Ocupação, Descritor~~ (v9.17.0) e ~~opções das variantes~~ (v9.33.0).
- **BRUTAL**: Arquétipo, Estilo e ~~modelos de mesa~~ (v9.32.0).
- ~~**Habilidades Homebrew no motor** de T20, Vampiro, Goblins, Oblívio e
  BRUTAL~~ (T20 na v9.14.0; Vampiro v9.29.0, Goblins v9.30.0, Oblívio
  v9.31.0, BRUTAL v9.32.0).
- ~~**Dependências nos pacotes**: elemento de um ritual, poder de uma classe
  e assim por diante~~ (v9.34.0).

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
- ~~Atualizar uma ficha para a versão nova de uma classe~~ — feito na v9.15.0
  (painel "Homebrew desta ficha").
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

## v9.12.0 — Etapa 2, parte 5: Classe Homebrew de Tormenta20

### O editor

**Homebrew → + Criar → Tormenta20 → Classe.** Quatro etapas:
- **Identidade:** nome, descrição, atributo-chave (texto), PV no 1º nível
  e por nível seguinte (+ Con), PM por nível;
- **Perícias e magias:**
  - perícias fixas (até 4, inclusive Ofício) e à escolha (quantas e entre
    quais);
  - proficiências além de armas simples e armaduras leves;
  - magias, se a classe conjura: arcanas ou divinas, o atributo, os
    círculos e quantas aprende. A progressão pode ser completa, como o
    Arcanista (1º, 5º, 9º, 13º, 17º), ou parcial, como o Bardo (1º, 6º,
    10º, 14º; até o 4º círculo). Também diz se o atributo soma nos PM;
- **Habilidades e poderes:**
  - as **habilidades da tabela** (até 12), cada uma no seu nível, com
    texto, efeitos do mesmo conjunto da raça e uma escolha de perícias;
  - os **níveis com "Poder de <classe>"** (padrão: do 2º ao 20º);
  - os **poderes de classe** (até 12): texto, efeitos e o nível mínimo na
    classe. Aumento de Atributo e os poderes gerais entram sozinhos;
- **Revisão:** a prévia, a tabela dos 20 níveis, o que é automático, o
  que quem joga escolhe e o que fica com a mesa.

### No motor

A classe é montada no formato das do livro: `pv`, `pm`, `pericias`,
`proficiencias`, `magias`, `tabela` (nível → habilidades), `habilidades`
e `poderes`. Por isso:
- a criação e o "Subir de nível" (também como multiclasse) usam o mesmo
  código das classes do livro. A lista de classes do "Subir de nível"
  carrega a biblioteca uma vez;
- PV, PM, perícias, proficiências, CD e círculo das magias, habilidades
  com efeito, a escolha de perícia de uma habilidade e o poder escolhido
  em cada nível entram na conta;
- o nível mínimo de um poder de classe é conferido ao subir de nível;
- as habilidades e os poderes aparecem na aba Habilidades com
  "Homebrew".

### Cópia, versão e servidor

- chave `hbcl-…`, versionada; cópia em `tormenta20.homebrew.classes`, uma
  por classe usada (multiclasse);
- sem a cópia e sem o catálogo, os níveis **ficam** na ficha, e o motor
  ignora a classe que não conhece: nada é apagado;
- o servidor roda o mesmo código (`classes-c.js` em
  `Tormenta20Dados.gs`).

**Correção:** a Classe de Tormenta20 abria o editor e o normalizador da
Classe de Ordem. Agora cada sistema usa o seu (editor, edição pela lista e
importação de arquivo).

### Servidor e pacotes

- Os estruturais de Tormenta20 passaram a ser `raca`, `origem`,
  `divindade` e `classe`. A coluna `classe` serve a Ordem e a T20;
  `modelo.sistema` diz qual.

### Validação da v9.12.0

**Automática.** `testes/executar-homebrew-t20.js` passou de 65 para 91
verificações:
- **Definição:**
  - chave;
  - perícias fixas e à escolha;
  - proficiências;
  - magias parciais;
  - a tabela (magias e habilidade no 1º, habilidade no 3º, poderes nos
    níveis pares);
  - só efeitos aceitos;
  - poderes próprios (com nível mínimo) mais Aumento de Atributo;
  - chave estável.
- **Motor:**
  - PV 18 e PM 6 no 1º nível;
  - perícias e Ofício com especialização;
  - redução de fogo 5 e a perícia escolhida;
  - proficiência marcial e magias arcanas pela Inteligência;
  - 3º nível com PV 30 e +2 Defesa;
  - o poder escolhido dá +2 em Luta;
  - o nível mínimo é conferido;
  - multiclasse com PV 28;
  - resumo da Mesa;
  - sem cópia, o nível fica;
  - listas e nome do poder.
- **Biblioteca:** guardar, voltar com a mesma chave, destino, resumo,
  arquivo e pacote.

`testes/pacotes-backend.js`:
- a Classe de T20 é aceita;
- o Elemento em T20 é recusado;
- a listagem por classe traz a de Ordem e a de T20.

**Na interface** (servidor local, conta sintética):
- Criei a classe **Vidreiro** pelo editor:
  - 16/4 PV e 4 PM;
  - Reflexos e Ofício fixos, mais 2 entre Percepção, Investigação e
    Furtividade;
  - armas marciais;
  - magias arcanas parciais;
  - Sopro Firme no 1º nível (redução de fogo 5 e uma perícia treinada à
    escolha);
  - Pele Temperada no 3º (+2 Defesa);
  - o poder Lâmina de Vidro (+2 Luta).

  A revisão mostrou a tabela dos 20 níveis.
- **Criação:**
  - um anão Vidreiro, com a classe depois das 14 do livro e "Homebrew";
  - perícias, Ofício (artesão) e Furtividade pelo Sopro Firme;
  - 2 magias arcanas;
  - a conferência deu PV 23 (16 + Con 4 + 3) e PM 5.
- **Ficha:**
  - Magias e Sopro Firme na aba Habilidades.
- **Subir de nível:**
  - o Vidreiro (nível 2) aparece na lista, com Lâmina de Vidro e Aumento
    de Atributo;
  - escolhido o poder, ficou Vidreiro 2, PV 32 e Luta +3;
  - Lâmina de Vidro aparece com "Vidreiro 2º · Homebrew".
- Sem erros no console nem no servidor.

### Publicar a v9.12.0

**Servidor:** troque **`Codigo.gs`**, **`Tormenta20.gs`** e
**`Tormenta20Dados.gs`**, e crie uma versão nova da implantação.
**`setupRama()` não é necessário.**

**Site:**
- `js/paginas/homebrew-classe-t20.js` (novo);
- `js/tormenta20/classes-c.js`, `regras.js`, `homebrew-t20.js`,
  `telas/t20-criar.js`, `telas/ficha-t20.js`;
- `js/homebrew-adaptadores.js`, `js/paginas/homebrew-editor.js`,
  `js/paginas/homebrew.js`, `js/paginas/homebrew-origem-divindade-t20.js`;
- `js/versao.js`, `homebrew/index.html`.

## v9.13.0 — Etapa 2, parte 6: habilidades ativadas, escolha de magia e variantes (Tormenta20)

### Habilidade ativada (gasta PM)

Todo poder ou habilidade Homebrew de T20 pode ser **ativado**:
- habilidades da raça;
- poder único da origem;
- poderes concedidos próprios da divindade;
- habilidades e poderes da classe.

O editor ganhou o bloco "Ativada (gasta PM)":
- custo (0 a 5 PM);
- execução (livre, movimento, padrão, completa, reação);
- duração (até o fim da cena, 1 rodada, instantânea);
- limite opcional de uma vez por cena;
- os efeitos enquanto dura: bônus em Defesa, perícia, **ataque** ou
  **dano**, redução de dano ou sentido.

Na ficha, a habilidade ganha o botão **Usar · N PM**. É o mesmo caminho
das habilidades do livro (`RAMATormenta20.ativar`): cobra os PM, confere
o limite por cena e cria o efeito ativo, que some no fim da duração. O
filtro (`acaoHomebrew` em `racas.js`) descarta efeitos que não fazem
sentido temporários (PV por nível, treino, imunidade…).

### Escolha de magia

A habilidade da raça pode dar **uma magia à escolha** de 1º círculo (ou
até o 2º), com o atributo dela, como a Tatuagem Mística do qareen. Quem
joga escolhe na criação, e a magia entra nas concedidas da ficha.

### Variantes da raça

Como o Suraggel, a raça pode ter **2 ou 3 variantes**, cada uma com
atributos fixos e as habilidades que tem. A criação mostra "Variante" e
a ficha mostra "Raça (Variante)". O motor usa `atributosDe` e
`habilidadesDe` com a variante, o mesmo das raças do livro. "Tamanho e
deslocamento" vale para todas.

### Trocar a raça (e as outras escolhas) de uma ficha

Já existia, para qualquer raça: aba **Progressão → "Refazer escolhas da
criação"** reabre o passo a passo com a ficha. As raças, origens,
divindades e classes Homebrew aparecem nele, porque ele carrega a
biblioteca.

### Validação da v9.13.0

**Automática.** `testes/executar-homebrew-t20.js` passou de 91 para 102
verificações:
- o filtro da ativada;
- variantes: atributos, habilidades existentes e `habilidadesDe` por
  variante;
- Car e Int por variante;
- a magia escolhida é concedida pela Inteligência;
- a habilidade de raça ativada cobra 1 PM e dá +2 Defesa;
- o poder único da origem ativado dá +2 no dano por 1 rodada;
- o poder de classe ativado custa 2 PM e dá +2 nos ataques;
- o poder concedido próprio entra no catálogo com a ação;
- as prévias;
- o arquivo devolve as variantes, a ativada e a escolha de magia.

**Na interface** (servidor local, conta sintética):
- Criei a raça **Espelhado** pelo editor:
  - Reflexo, ativada: 1 PM, movimento, cena, +2 Defesa;
  - Brilho Arcano: magia à escolha, por Inteligência;
  - as variantes Prateado (Car +2; só Reflexo) e Fumê (Int +2; as duas).

  A revisão mostrou as duas variantes.
- Na criação, a carta diz "Prateado ou Fumê", e a variante é um campo do
  passo Raça.
- Na ficha:
  - a raça aparece como "Espelhado (Prateado)";
  - Reflexo tem o botão "Usar · 1 PM";
  - ao usar, os PM foram de 3 para 2 e a Defesa de 12 para 14.
- Sem erros no console nem no servidor.

### Publicar a v9.13.0

**Servidor:** troque só o **`Tormenta20Dados.gs`** e crie uma versão nova
da implantação. `Codigo.gs` e `Tormenta20.gs` não mudaram.
**`setupRama()` não é necessário.**

**Site:**
- `js/tormenta20/racas.js`, `origens.js`, `deuses.js`, `classes-c.js`,
  `homebrew-t20.js`;
- `js/paginas/homebrew-raca-t20.js`,
  `js/paginas/homebrew-origem-divindade-t20.js`,
  `js/paginas/homebrew-classe-t20.js`;
- `js/versao.js`.

## v9.14.0 — Etapa 2, parte 7: Magia e Poder Homebrew no motor de Tormenta20

Até a v9.13, a habilidade Homebrew de T20 (magia, poder, habilidade)
entrava nas anotações (Manual). Agora a **Magia** e o **Poder** são
nativos. A habilidade só de texto continua Manual.

### Magia

**Homebrew → + Criar → Tormenta20 → Habilidade → Magia** (o editor de
campos):
- tipo, círculo, escola, execução, alcance, alvo, duração e resistência;
- a mecânica que o lançamento resolve: **dano** (dados e tipo; a
  resistência pode reduzir à metade) e **cura**;
- os aprimoramentos, em texto. A mesa aplica.

O motor registra a magia pelo mesmo `RAMATormenta20Magias.def` das magias
do livro, com o custo pela tabela de círculos. Ela aparece:
- no passo Magias da criação;
- em **+ Aprender magia**, para as fontes do tipo e do círculo certos.

No lançamento, a ficha cobra os PM, mostra CD, alcance e alvo e rola o
dano ou a cura. A aba Magias marca "Homebrew".

### Poder

**Homebrew → + Criar → Tormenta20 → Habilidade → Poder** (editor
próprio, três etapas):
- nome, texto, grupo (combate, destino, magia ou Tormenta), nível mínimo
  e outros requisitos em texto (a mesa confere);
- efeitos na conta e ativação opcional (PM), os mesmos dos tipos
  estruturais.

O poder entra no catálogo de poderes (`poderesDisponiveis`). Aparece na
escolha de poder do **Subir de nível**, onde o nível mínimo é conferido,
e em **+ Poder avulso**. Poderes de classe, concedidos e de origem são
feitos pelos tipos Classe, Divindade e Origem. Um poder antigo "de
classe" só de texto continua Manual.

### Cópia, versão e servidor

- chaves `hbmg-…` e `hbpd-…`, versionadas; cópias em
  `tormenta20.homebrew.magias` (a definição, não o registro do catálogo)
  e `tormenta20.homebrew.poderes`;
- sem cópia e sem catálogo, a magia aprendida e o poder avulso saem da
  lista. A escolha feita num nível fica, e o motor a ignora;
- o servidor roda o mesmo código (`magias.js` e `poderes.js` em
  `Tormenta20Dados.gs`; `regras.js` em `Tormenta20.gs`).

### Validação da v9.14.0

**Automática.** `testes/executar-homebrew-t20.js` passou de 102 para 124
verificações:
- **Magia:**
  - normalização (escola pelo nome, dados, efeitos);
  - registro com custo 3 no 2º círculo;
  - preparar com dano 4d8 de perfuração e metade;
  - disponível só para o tipo certo;
  - cópia na ficha;
  - some sem cópia nem catálogo;
  - é embutida a partir do catálogo.
- **Poder:**
  - normalização (nível mínimo vira requisito);
  - avulso dá +2 Percepção;
  - escolhido no 3º nível;
  - recusado no 2º pelo nível mínimo;
  - ativado com 1 PM;
  - listas;
  - some sem cópia nem catálogo.
- **Biblioteca:**
  - campos do editor;
  - voltar com a mesma chave;
  - um poder antigo de classe não vira poder do motor;
  - destinos;
  - arquivo;
  - prévias.

`testes/executar-homebrew-sistemas.js`: a magia de T20 passou a ser
nativa; a habilidade só de texto continua Manual.

**Na interface** (servidor local, conta sintética):
- Criei o poder **Olhar de Lince** pelo editor: destino, +2 Percepção,
  ativado com 1 PM, livre, 1 rodada, +1 nos ataques.
- Criei a magia **Lança de Vidro** pelo editor de campos: arcana, 1º
  círculo, 2d8 de perfuração, metade na resistência.
- Criei um elfo Arcanista (mago); a Lança de Vidro estava no passo Magias.
- Na ficha:
  - a magia aparece com "1 PM · Arcana · Homebrew";
  - o lançamento mostrou CD 15 e "2d8 perfuracao (resistência: metade)";
  - ao lançar, cobrou 1 PM (12 para 11) e rolou o dano.
- **+ Poder avulso** listou "Olhar de Lince (Destino)". Adicionado, ele
  aparece com "Homebrew" e "Usar · 1 PM".
- Sem erros no console nem no servidor.

### Publicar a v9.14.0

**Servidor:** troque **`Tormenta20.gs`** e **`Tormenta20Dados.gs`**, e crie
uma versão nova da implantação. `Codigo.gs` não mudou.
**`setupRama()` não é necessário.**

**Site:**
- `js/tormenta20/magias.js`, `poderes.js`, `regras.js`,
  `homebrew-t20.js`, `telas/ficha-t20.js`;
- `js/homebrew-adaptadores.js`, `js/paginas/homebrew-editor.js`,
  `js/paginas/homebrew.js`, `js/paginas/homebrew-origem-divindade-t20.js`;
- `js/versao.js`, `homebrew/index.html`.

## v9.15.0 — Atualizar a cópia de uma ficha para a versão da biblioteca

A ficha guarda a cópia de cada definição Homebrew que usa, com a chave
versionada pelo conteúdo. Editar na biblioteca não muda o personagem em
jogo. Agora dá para **trazer a versão nova de propósito**.

### Onde

Aba **Progressão**, painel **"Homebrew desta ficha"**, nas fichas de
Ordem e de Tormenta20. Ele só aparece quando a ficha tem alguma cópia.
- lista as cópias: nome, tipo e versão (o fim da chave);
- **Procurar versões novas** consulta a biblioteca (as suas e as
  públicas). Uma cópia tem versão nova quando o mesmo registro (mesmo
  `homebrewId`) está lá com outra chave;
- **Atualizar** pede confirmação, porque os números podem mudar.

O que pode ser atualizado:
- **Ordem:** classe, origem e trilha. O elemento tem chave estável e não
  versiona;
- **Tormenta20:** raça, origem, divindade, classe, magia e poder.

### Como

`atualizarVersao` (em `RAMAOrdemHomebrew` e `RAMATormenta20Homebrew`):
1. troca a chave antiga pela nova em todo o bloco da ficha. Isso inclui
   as escolhas que apontam para ela e as chaves derivadas, como
   `<divindade>-p1` ou os poderes de trilha `<trilha>-p10`;
2. grava a cópia nova;
3. registra a cópia no catálogo.

A normalização tira a cópia antiga, que ninguém mais usa. As escolhas
feitas continuam; as que não existirem na versão nova ficam sem efeito.
O painel é `js/homebrew-versoes.js` (novo), o mesmo para os dois
sistemas.

### Validação da v9.15.0

**Automática.**
- `testes/executar-homebrew-t20.js` passou de 124 para 130:
  - as cópias da ficha;
  - só o mesmo registro com outra chave é versão nova;
  - a ficha na mesma versão não tem nada a atualizar;
  - depois de atualizar, raça, divindade e o poder derivado apontam para
    as chaves novas, e as cópias antigas saem;
  - os números seguem a versão nova (12 m; +4 Furtividade) e a escolha
    de perícia fica.
- `testes/executar-homebrew-ordem.js` passou de 71 para 75:
  - origem e trilha atualizadas, com as chaves novas e as antigas fora;
  - Defesa e PV recalculados pela versão nova (o +1 PV por marco saiu, e
    o Primeiro Corte passou a dar +6).

**Na interface** (servidor local, conta sintética, ficha de Tormenta20):
- Usei uma raça Vidrado com 6 m e depois mudei o deslocamento dela para
  9 m na biblioteca.
- A ficha continuou com 6 m.
- Em Progressão → "Homebrew desta ficha", "Procurar versões novas"
  mostrou "há uma versão nova na biblioteca".
- "Atualizar" pediu confirmação. Confirmado, o deslocamento foi a 9 m e
  a versão mudou.
- Sem erros no console.

### Publicar a v9.15.0

**Servidor:** nada muda. **`setupRama()` não é necessário.**

**Site:**
- `js/homebrew-versoes.js` (novo);
- `js/tormenta20/homebrew-t20.js`, `js/tormenta20/telas/ficha-t20.js`;
- `js/ordem/homebrew-ordem.js`, `js/ordem/telas/ficha-ordem.js`;
- `js/versao.js`, `ficha/index.html`.

## v9.16.0 — Escolha de perícia nos poderes Homebrew de Ordem

O poder da **Origem Homebrew** e cada poder da **Trilha Homebrew** podem
ter **uma escolha de perícia**, no formato do livro:
- **treinado numa perícia** (como Esperto);
- **treinado; +bônus se já for** (como a Carteirada);
- **+bônus numa perícia** (como a Mutação do Experimento).

Cada uma pode ser entre uma lista (vazio = qualquer perícia), com bônus
de +1 a +5.

### Onde

- **Editor:** bloco "Escolha de perícia (opcional)" no poder da origem e
  em cada poder da trilha. A revisão diz que a escolha é feita na
  Progressão.
- **Ficha:** a escolha aparece em **Progressão → Pendentes**, como as do
  livro. A janela mostra só as perícias que cabem; feita a escolha, o
  treino ou o bônus entra na conta.

### No motor

Nada novo na conta: o normalizador gera o que as definições do livro já
usam.
- Na origem, `escolhas` e `efeitosEscolha`.
- Na trilha, `opcoes` e o efeito com `opcao: "pericia"` na habilidade da
  trilha.

A definição guarda `escolhaHb` (origem) ou `escolha` (poder da trilha),
de onde o resto é refeito.

**Correção:** o id de uma vaga de opção é `b.<chave>`. Com uma chave
Homebrew (`b.hbt-…-p10`, `b.origem.hbo-…`), ele tem hífen, que três
validações não aceitavam:
- o registro da escolha (`progressao.js`);
- as decisões da Ramificação (`ramificacao.js`);
- o servidor (`Ordem.gs`).

Sem isso, a escolha de um poder Homebrew nunca seria gravada. As três
passaram a aceitar hífen.

### Validação da v9.16.0

**Automática.** `testes/executar-homebrew-ordem.js` passou de 75 para 83:
- a normalização da escolha;
- o poder de trilha vira habilidade com a opção (entre Diplomacia e
  Enganação);
- a Progressão pede a escolha;
- só vale perícia da lista;
- escolhida, a perícia fica treinada;
- na origem, `escolhas` e `efeitosEscolha`;
- a Progressão pede a perícia da origem;
- escolhida Investigação, +2 na conta.

**Na interface** (servidor local, conta sintética):
- Criei a origem **Lapidário** pelo editor (Profissão e Percepção; poder
  Olho Clínico, +2 numa perícia à escolha). A revisão mostrou "Escolha
  (na Progressão): +2 numa perícia à escolha".
- Numa ficha de agente com ela, Progressão → Pendentes mostrou "Olho
  Clínico · Origem". "Completar" abriu a lista de perícias.
- Escolhida Investigação, a aba Perícias mostrou +2 nela.
- Sem erros no console.

### Publicar a v9.16.0

**Servidor:** troque **`Ordem.gs`** e crie uma versão nova da implantação.
**`setupRama()` não é necessário.**

**Site:**
- `js/ordem/homebrew-ordem.js`, `js/ordem/poderes.js`,
  `js/ordem/progressao.js`, `js/ordem/ramificacao.js`;
- `js/paginas/homebrew-origem-trilha.js`;
- `js/versao.js`.

## v9.17.0 — Etapa 2: Ocupação e Descritor Homebrew de Malditos Goblins

### Os editores

**Homebrew → + Criar → Malditos Goblins → Ocupação.** Três etapas:
- **Identidade:** nome, descrição e o modificador de atributo (−1 a +2;
  no livro, +1 num atributo);
- **Equipamento e técnicas:**
  - até 3 opções de equipamento inicial, cada uma com até 3 itens do
    catálogo (armas, proteções, equipamentos);
  - as **três técnicas** (níveis 1, 2 e 3): nome, texto e, se quiser,
    "1 vez por dia";
- **Revisão:** a prévia, o que é automático, o que quem joga escolhe e o
  que fica com a mesa.

**→ Descritor.** Uma etapa:
- modificadores de −2 a +2;
- ou "quem joga escolhe um atributo para +1", como o Supimpa;
- um texto.

### No motor

As definições entram nos **mesmos mapas** que o motor e as telas leem
(`OCUPACOES`, `DESCRITORES`), a partir da cópia guardada na ficha em
`goblins.homebrew`:
- o modificador entra nos atributos;
- as técnicas chegam pelo nível, também como ocupação épica;
- a técnica de "1 vez por dia" tem o botão **Usar** na ficha, que marca
  o uso do dia e recusa a segunda vez. O efeito é o do texto;
- a opção de equipamento entra na conclusão da criação, como no livro;
- o "+1 à escolha" do descritor, que era específico do Supimpa (três
  lugares conferiam `descritor === "supimpa"`), passou a ser genérico:
  vale para qualquer descritor com escolha;
- a criação mostra as ocupações e os descritores Homebrew depois dos do
  livro (`descritoresDisponiveis`). A rolagem de 1d6 continua só com os
  do livro.

### Cópia, versão e servidor

- chaves `hbgo-…` e `hbgd-…`, versionadas; as técnicas usam
  `<ocupação>-t<n>`;
- sem cópia e sem catálogo, a escolha some;
- o servidor roda o mesmo motor (`catalogo.js` e `regras.js` em
  `Goblins.gs`, por `testes/gerar-goblins-gs.js`);
- `RAMAGoblinsHomebrew` tem `copiasDaFicha`, `versoesNovas` e
  `atualizarVersao`, como Ordem e T20. O painel na ficha de Goblins fica
  para uma próxima entrega.

### Servidor e pacotes

- `TIPOS_HOMEBREW` ganhou `ocupacao` e `descritor`; os estruturais de
  Goblins são os dois. Ocupação em outro sistema é recusada.
- Os pacotes ganharam os grupos "Ocupações" e "Descritores".

### Validação da v9.17.0

**Automática.** O novo `testes/executar-homebrew-goblins.js` tem 24
verificações:
- **Definição:**
  - chave;
  - modificadores limitados;
  - equipamento só com itens do catálogo;
  - técnicas com chave e uso diário;
  - chave estável;
  - descritor com modificadores e com escolha.
- **Motor:**
  - as cópias ficam;
  - os atributos;
  - as técnicas pelo nível;
  - o uso diário marcado e a segunda vez recusada;
  - o +1 à escolha e a pendência genérica;
  - a ocupação épica;
  - some sem cópia nem catálogo;
  - é embutida a partir do catálogo;
  - a lista de descritores;
  - o resumo da Mesa.
- **Biblioteca:** guardar, voltar com a mesma chave, destino, resumo,
  arquivo, pacote e a atualização de versão.

`testes/pacotes-backend.js`:
- a Ocupação de Goblins é aceita;
- a Ocupação em Vampiro é recusada.

**Na interface** (servidor local, conta sintética):
- Criei a ocupação **Vidreiro** pelo editor (Habilidade +1, opção Adaga,
  técnicas Sopro, Lente e Vitral, esta de 1 vez por dia).
- Criei o descritor **Sortudo** (+1 à escolha).
- Na criação de goblin (manual):
  - os dois apareceram nas listas, e o campo "Sortudo: +1 em" apareceu;
  - escolhida Vitalidade, os atributos ficaram Habilidade 3 (Vidreiro +1)
    e Vitalidade 3 (Sortudo +1);
  - as técnicas apareceram com "Homebrew".
- **Ficha:** "Ocupação: Vidreiro · Homebrew" e "Descritor: Sortudo (+1 em
  Vitalidade) · Homebrew", com as cópias no servidor.
- Sem erros no console.

### Publicar a v9.17.0

**Servidor:** troque **`Codigo.gs`** e **`Goblins.gs`**, e crie uma versão
nova da implantação. **`setupRama()` não é necessário.**

**Site:**
- `js/goblins/homebrew-goblins.js` e `js/paginas/homebrew-goblins.js`
  (novos);
- `js/goblins/catalogo.js`, `js/goblins/regras.js`;
- `js/goblins/telas/goblins-criar.js`, `ficha-goblins.js`,
  `goblins-comum.js`;
- `js/homebrew-adaptadores.js`, `js/pacotes-homebrew.js`,
  `js/paginas/homebrew-editor.js`, `js/paginas/homebrew.js`,
  `js/paginas/homebrew-origem-divindade-t20.js`;
- `js/versao.js`;
- `homebrew/index.html`, `ficha/index.html`, `personagens/index.html`.

## v9.18.0 — Etapa 2: Arquétipo e Estilo Homebrew de BRUTAL

### Os editores

**Homebrew → + Criar → BRUTAL → Arquétipo.** Três etapas:
- **Identidade:** nome, adjetivos, resumo, cor e Iniciativa (1º a 9º).
  No empate, o Arquétipo do livro age antes;
- **Estilos e Habilidade:**
  - os dois Estilos, do livro ou Homebrew;
  - a Habilidade: nome, cena, recarga (as do livro) e texto;
- **Revisão:** a prévia, o automático e o que fica com a mesa.

**→ Estilo.** Nome e para que serve. A chave é **estável** (sem
versão), como o Elemento de Ordem, porque os Arquétipos apontam para ela.

### Onde entra

- **Criação de Sobrevivente** e **troca de Arquétipo** na ficha: as
  cartas Homebrew vêm depois das do livro, com a inicial no lugar da arte.
  O detalhe mostra Estilos, Habilidade, Vantagens de Estilo e Iniciativa.
- **Ficha:** os Estilos (Dificuldade −1), a Habilidade e a Iniciativa.
- **Mesa da Diretora:** o resumo que a ficha manda leva a cópia do
  Arquétipo e dos Estilos Homebrew dele. A mesa os registra no navegador
  e no servidor e os guarda em `estado.homebrew`. A Sobrevivente fica com
  o Arquétipo, os Estilos valem na Dificuldade e a Habilidade usa a
  recarga.
- A **Iniciativa** do Encontro passou a seguir o número do Arquétipo
  (`ordemDeIniciativa`). Para os do livro, a ordem é a mesma de antes.
- As listas de Estilo da ficha e da mesa incluem os Estilos Homebrew
  (`estilosDisponiveis`).

### Cópia, versão e servidor

- Arquétipo `hbba-…`, versionado; Estilo `hbbe-…`, estável. A cópia na
  ficha fica em `brutal.homebrew` (o Arquétipo e os Estilos Homebrew dele);
- sem cópia e sem catálogo, o Arquétipo some;
- o servidor roda o mesmo código (`catalogo.js`, `regras.js` e `mesa.js`
  em `Brutal.gs`, por `testes/gerar-brutal-gs.js`);
- `RAMABrutalHomebrew` tem `versoesNovas` e `atualizarVersao`.

### Servidor e pacotes

- `TIPOS_HOMEBREW` ganhou `arquetipo` e `estilo`; os estruturais de
  BRUTAL são os dois.
- Os pacotes ganharam "Arquétipos" e "Estilos".

### Validação da v9.18.0

**Automática.** O novo `testes/executar-homebrew-brutal.js` tem 18
verificações:
- **Definição:**
  - a chave estável do Estilo;
  - a chave do Arquétipo;
  - os Estilos válidos, a cor e a Habilidade;
  - a chave estável ao normalizar de novo;
  - as listas, com as do livro intactas;
  - a Iniciativa entre a Atleta e a Valentona.
- **Ficha e mesa:**
  - a ficha guarda as cópias;
  - o resumo leva a cópia;
  - some sem cópia nem catálogo;
  - a mesa, com o catálogo vazio, registra pela cópia (ao sincronizar e
    ao normalizar, como no servidor);
  - o Estilo Homebrew reduz a Dificuldade.
- **Biblioteca:** guardar, voltar com a mesma chave, destino, resumo,
  arquivo, pacote e a versão nova do Arquétipo.

`testes/pacotes-backend.js`: o Arquétipo de BRUTAL é aceito.

**Na interface** (servidor local, conta sintética):
- Criei o Estilo **Estiloso**. Ele apareceu nas opções do editor de
  Arquétipo.
- Criei o Arquétipo **Vlogueira** (Iniciativa 2º, Estiloso e Ligeiro,
  Habilidade Ao Vivo com recarga no início da sessão).
- Na criação de Sobrevivente:
  - a carta Vlogueira veio depois das oito do livro;
  - o detalhe mostrou Estilos, Habilidade, Vantagem de Estilo (Planejar
    Fuga, de Ligeiro) e Iniciativa 2º.
- **Ficha:** os Estilos Estiloso e Ligeiro, a Habilidade e as cópias
  guardadas.
- **Correção encontrada:** a ficha pedia a arte do Arquétipo (404). O
  Arquétipo Homebrew agora mostra a inicial.

### Publicar a v9.18.0

**Servidor:** troque **`Codigo.gs`** e **`Brutal.gs`**, e crie uma versão
nova da implantação. **`setupRama()` não é necessário.**

**Site:**
- `js/brutal/homebrew-brutal.js` e `js/paginas/homebrew-brutal.js`
  (novos);
- `js/brutal/catalogo.js`, `regras.js`, `mesa.js`;
- `js/brutal/telas/brutal-criar.js`, `brutal-comum.js`,
  `ficha-brutal.js`, `campanha-brutal.js`;
- `js/homebrew-adaptadores.js`, `js/pacotes-homebrew.js`,
  `js/paginas/homebrew-editor.js`, `js/paginas/homebrew.js`;
- `js/versao.js`;
- `homebrew/index.html`, `ficha/index.html`, `personagens/index.html`.

## v9.19.0 — Etapa 2: Papel, Motivação, Mazela e Fardo Homebrew de Oblívio

### Os editores

**Homebrew → + Criar → Oblívio:**
- **Papel**, em três etapas:
  - **Identidade:** nome, resumo, cor, limite de Estresse (5 a 25, +
    Carne) e os seis Conhecimentos de onde saem as especializações;
  - **Habilidades:** a **Principal** e até 3 **Únicas**, cada uma com
    nome, tipo de ação (passiva, Regular, Extra, Completa, Regular +
    Movimento) e texto;
  - **Revisão.**
- **Motivação:** nome e resumo.
- **Mazela:** nome, texto e como sai (Bálsamo, Kit de Primeiros
  Socorros).
- **Fardo:** nome, texto e se acumula.

### No motor

As definições entram nos **mesmos mapas e listas** que o motor e as
telas leem (`papel`, `PAPEIS`, `habilidade`, `HABILIDADES`, `motivacao`,
`MOTIVACOES`, `mazela`, `MAZELAS`, `fardo`, `FARDOS`), a partir da cópia
em `oblivio.homebrew`:
- **Papel:**
  - o limite de Estresse entra na conta;
  - a lista orienta as especializações;
  - a Habilidade Principal entra ao concluir a criação, como a dos do
    livro;
  - as Únicas aparecem para aprender (`<papel>-h1…h3`).
- **Motivação:** aparece na criação, depois das do livro, marcada
  "Homebrew". A rolagem de 1d6 continua só com as do livro.
- **Mazela:** aparece em "Aplicar mazela" na ficha, que carrega a
  biblioteca uma vez. Sai pelos meios marcados; o efeito por turno é da
  mesa.
- **Fardo:** a ficha ganhou "**Aplicar Fardo Homebrew**", pela mesma
  função do motor (`aplicarFardo`). A rolagem de Fardo continua com os
  seis do livro.

As mecânicas especiais que o livro tem por chave (Voracidade, Ferida,
Mal das Pernas…) não valem para as Homebrew: a ficha registra e a mesa
aplica.

### Cópia, versão e servidor

- chaves `hbop-…`, `hbmo-…`, `hbmz-…`, `hbfd-…`, versionadas. As
  Habilidades do Papel usam `<papel>-h0…h3`; atualizar a versão troca
  também essas chaves;
- sem cópia e sem catálogo, a escolha some;
- o servidor roda o mesmo motor (`catalogo.js` e `regras.js` em
  `Oblivio.gs`, por `testes/gerar-oblivio-gs.js`);
- `RAMAOblivioHomebrew` tem `versoesNovas` e `atualizarVersao`.

### Servidor e pacotes

- `TIPOS_HOMEBREW` ganhou `papel`, `motivacao`, `mazela` e `fardo`; os
  estruturais de Oblívio são os quatro.
- Os pacotes ganharam os quatro grupos.

### Validação da v9.19.0

**Automática.** O novo `testes/executar-homebrew-oblivio.js` tem 20
verificações:
- **Definições:**
  - chave, Estresse e cor do Papel;
  - Conhecimentos válidos (até seis);
  - Principal e Únicas;
  - chave estável;
  - Motivação, Mazela (só os meios que existem) e Fardo.
- **Ficha:**
  - as cópias ficam;
  - o limite de Estresse 12 + Carne 3;
  - concluir a criação dá a Principal;
  - as Únicas na lista;
  - a Principal fica ao normalizar de novo;
  - a Mazela aplicada, com a cópia;
  - o Fardo aplicado sem rolagem, com a cópia;
  - a rolagem com os seis do livro;
  - some sem cópia nem catálogo.
- **Biblioteca:** guardar, voltar com a mesma chave, destino, resumo,
  arquivo, pacote e a versão nova do Papel (com a chave da Principal e o
  limite 20 + 3).

`testes/pacotes-backend.js`: o Papel de Oblívio é aceito.

**Na interface** (servidor local, conta sintética):
- Criei o Papel **Quem Vigia** pelo editor (Estresse 15, seis
  Conhecimentos, Principal Olho Aberto, Única Sinal de Ação Extra). A
  revisão mostrou tudo.
- Na criação de Persona, ele apareceu depois dos cinco Papéis do livro,
  com "Homebrew". Escolhido, o passo Corpo mostrou "Quem Vigia 15 + Carne
  0 = 15".
- **Correções encontradas:**
  - os ids do editor do Papel não batiam com a moldura (o foco no nome
    ao salvar sem nome);
  - a Motivação Homebrew apareceria como "undefined —" na lista; agora
    mostra "Homebrew —".

### Publicar a v9.19.0

**Servidor:** troque **`Codigo.gs`** e **`Oblivio.gs`**, e crie uma versão
nova da implantação. **`setupRama()` não é necessário.**

**Site:**
- `js/oblivio/homebrew-oblivio.js` e `js/paginas/homebrew-oblivio.js`
  (novos);
- `js/oblivio/catalogo.js`, `js/oblivio/regras.js`;
- `js/oblivio/telas/oblivio-criar.js`, `ficha-oblivio.js`;
- `js/homebrew-adaptadores.js`, `js/pacotes-homebrew.js`,
  `js/paginas/homebrew-editor.js`, `js/paginas/homebrew.js`;
- `js/versao.js`;
- `homebrew/index.html`, `ficha/index.html`, `personagens/index.html`.

## v9.20.0 — Etapa 2: Clã, Predador, Disciplina, Vantagem e Defeito Homebrew de Vampiro

### Os editores

**Homebrew → + Criar → Vampiro: A Máscara**, todos com uma etapa de
regras e uma de revisão:
- **Clã:** nome, descrição, as três Disciplinas (do livro ou Homebrew), a
  Perdição (texto) e a Compulsão (nome, penalidade de −1 a −3 em todas as
  paradas, quando termina);
- **Predador:**
  - duas especializações (Habilidade + nome) e duas Disciplinas, das
    quais quem joga escolhe uma de cada;
  - Humanidade (−2 a +2);
  - a Vantagem e o Defeito que dá (do livro, com pontos);
  - a parada de caça;
  - os clãs proibidos;
- **Disciplina:** tipo (mental ou física), ressonância e até 10 poderes.
  Cada poder tem nome, nível de 1 a 5, custo em Checagens, parada
  Atributo + Disciplina, duração e efeito em texto;
- **Vantagem** e **Defeito** (o mesmo tipo, `vantagem`, com o tipo
  dentro): os pontos possíveis, um efeito Social opcional (±1 a ±3 dados,
  como Belo/Feio), os clãs proibidos e o texto.

### No motor

As definições entram nos **mesmos mapas** que o motor e as telas leem
(`CLAS`, `PREDADORES`, `VANTAGENS`, `DISCIPLINAS`, `PODERES`), a partir da
cópia em `vampiro.homebrew`. As Disciplinas são registradas primeiro,
porque clã e predador apontam para elas.
- **Clã:**
  - as Disciplinas do clã na criação;
  - a Compulsão pelo mesmo `iniciarCompulsao` (penalidade em todas as
    paradas);
  - a Perdição é texto (a mesa aplica a Gravidade).
- **Predador:** a especialização, a Disciplina (+1), a Humanidade e a
  Vantagem/Defeito entram pelas concessões, como os do livro.
- **Disciplina:**
  - os poderes viram poderes do catálogo (`<disciplina>-p<n>`),
    "narrativos";
  - o motor confere posse, estado (estacado só mentais, frenesi só
    físicas), cobra as Checagens, rola a parada e marca a duração;
  - o efeito é da mesa.
- **Vantagem:** aparece na criação e nas compras com XP; o efeito Social
  entra nas paradas Sociais.

A criação e as compras com XP carregam a biblioteca uma vez. As cartas e
os poderes Homebrew mostram "Homebrew" no lugar da página.

### Cópia, versão e servidor

- chaves `hbvd-…`, `hbvc-…`, `hbvp-…`, `hbvv-…`, versionadas. Atualizar
  uma Disciplina troca a chave dela em toda a ficha (clã, predador,
  poderes);
- sem cópia e sem catálogo, a escolha some;
- o servidor roda o mesmo motor (`catalogo.js`, `disciplinas-dados.js` e
  `regras.js` em `Vampiro.gs`, por `testes/gerar-vampiro-gs.js`).

### Servidor e pacotes

- `TIPOS_HOMEBREW` ganhou `cla`, `predador`, `disciplina` e `vantagem`; os
  estruturais de Vampiro são os quatro.
- Os pacotes ganharam os grupos.

### Validação da v9.20.0

**Automática.** O novo `testes/executar-homebrew-vampiro.js` tem 18
verificações:
- **Definições:**
  - Disciplina (custo limitado, parada e duração válidas, poderes no
    catálogo);
  - Clã (três Disciplinas sem Alquimia, Compulsão);
  - Predador (o que é válido entra);
  - Vantagem (níveis, efeito Social).
- **Ficha**, com o catálogo vazio, como no servidor:
  - tudo é registrado pela cópia;
  - as cópias ficam;
  - a Disciplina conta;
  - as concessões do Predador;
  - a Compulsão do clã (−3 em todas as paradas);
  - some sem cópia nem catálogo;
  - normalizar de novo mantém.
- **Biblioteca:**
  - guardar e voltar com a mesma chave;
  - destino e resumo;
  - arquivo;
  - pacote;
  - versão nova da Disciplina com a chave trocada em toda a ficha.

`testes/pacotes-backend.js`: o Clã de Vampiro é aceito.

**Na interface** (servidor local, conta sintética):
- Criei a Disciplina **Vitrificação** (física; Pele de Vidro, nível 1, 1
  Checagem, Vigor + Disciplina, uma cena).
- Criei o Clã **Vidreiros** (Vitrificação, Fortitude e Presença;
  Perdição; Compulsão Polimento). A Disciplina Homebrew apareceu na lista
  do editor de Clã.
- Na criação de vampiro, o passo Clã mostrou "Vidreiros", com as três
  Disciplinas, a Perdição, a Compulsão e "Homebrew".
- **Correção encontrada:** pontuação dobrada na prévia do Clã.

### Publicar a v9.20.0

**Servidor:** troque **`Codigo.gs`** e **`Vampiro.gs`**, e crie uma versão
nova da implantação. **`setupRama()` não é necessário.**

**Site:**
- `js/vampiro/homebrew-vampiro.js` e `js/paginas/homebrew-vampiro.js`
  (novos);
- `js/vampiro/catalogo.js`, `disciplinas-dados.js`, `regras.js`;
- `js/vampiro/telas/vampiro-criar.js`, `ficha-vampiro.js`,
  `ficha-vampiro-disciplinas.js`;
- `js/homebrew-adaptadores.js`, `js/pacotes-homebrew.js`,
  `js/paginas/homebrew-editor.js`, `js/paginas/homebrew.js`;
- `js/versao.js`;
- `homebrew/index.html`, `ficha/index.html`, `personagens/index.html`.

## v9.21.0 — Etapa 2: Perfil e Ocupação Homebrew de Ordem Paranormal RPG II

Experimental, como a edição.

### Os editores

**Homebrew → + Criar → Ordem Paranormal RPG II**, uma etapa cada:
- **Perfil:** nome, texto e a **habilidade de perfil**, uma do catálogo de
  Ordem II (Ímpeto, Avaliação, Prontidão…);
- **Ocupação:** nome, texto, as ambientações onde é sugerida
  (Contemporâneo, Contos da Vigília) e a **habilidade de ocupação**, do
  catálogo.

### No motor

As definições entram nos **mesmos mapas e listas** que o motor e as
telas leem (`PERFIS`, `ORDEM_PERFIS`, `HABILIDADE_DE_PERFIL`,
`OCUPACOES`), a partir da cópia em `ordem2.homebrew`:
- a **criação guiada** mostra o Perfil Homebrew depois dos três do
  playtest, com "Concede: <habilidade>", e entrega a habilidade de perfil
  como as do catálogo;
- a Ocupação Homebrew aparece na lista da ambientação e dá a habilidade
  de ocupação dela;
- sem cópia e sem catálogo, o Perfil some. A Ocupação vira "própria"
  (`personalizada`), e o nome escrito continua: nada é inventado e nada se
  perde.

### Cópia, versão e servidor

- chaves `hbo2p-…` (Perfil) e `hbo2o-…` (id da Ocupação), versionadas;
- o servidor roda o mesmo motor (`catalogo.js` e `regras.js` em
  `Ordem2.gs`, por `testes/gerar-ordem2-gs.js`);
- `RAMAOrdem2Homebrew` tem `versoesNovas` e `atualizarVersao`.

### Servidor e pacotes

- `TIPOS_HOMEBREW` ganhou `perfil`; a coluna `ocupacao` serve a Goblins e
  a Ordem II, e `modelo.sistema` diz qual. Os estruturais de Ordem II são
  `perfil` e `ocupacao`.
- Os pacotes ganharam o grupo "Perfis" (o de "Ocupações" já existia).

### Validação da v9.21.0

**Automática.** O novo `testes/executar-homebrew-ordem2.js` tem 12
verificações:
- as definições;
- o registro nas listas;
- a criação guiada com as cópias e a habilidade de perfil;
- o catálogo vazio (servidor) registrando pela cópia;
- sem cópia: o perfil some e a ocupação vira própria com o nome;
- guardar e voltar com a mesma chave;
- o destino (a Ocupação de Ordem II não serve a Goblins);
- o arquivo;
- a versão nova do Perfil.

`testes/pacotes-backend.js`: Perfil e Ocupação de Ordem II aceitos.

**Na interface** (servidor local, conta sintética):
- Criei o Perfil **Guardião** (habilidade Prontidão) pelo editor. A
  prévia mostrou "Habilidade de perfil: Prontidão".
- Na criação guiada de Ordem II, ele apareceu como "Guardião — Protege
  antes de tudo. · Concede: Prontidão.", depois de Executor, Analista e
  Vigilante.

### Publicar a v9.21.0

**Servidor:** troque **`Codigo.gs`** e **`Ordem2.gs`**, e crie uma versão
nova da implantação. **`setupRama()` não é necessário.**

**Site:**
- `js/ordem2/homebrew-ordem2.js` e `js/paginas/homebrew-ordem2.js`
  (novos);
- `js/ordem2/catalogo.js`, `js/ordem2/regras.js`,
  `js/ordem2/telas/o2-criar.js`;
- `js/homebrew-adaptadores.js`, `js/pacotes-homebrew.js`,
  `js/paginas/homebrew-editor.js`, `js/paginas/homebrew.js`;
- `js/versao.js`;
- `homebrew/index.html`, `ficha/index.html`, `personagens/index.html`.

### Etapa 2 depois da v9.21

Todos os sistemas têm agora os tipos estruturais da especificação.
Continuam pendentes:
- em **Ordem I**:
  - a classe que conjura rituais;
  - a Classe Homebrew na transição de mundano ou sobrevivente para
    agente (a transição usa uma tabela de ganhos só das classes do
    livro);
  - o elemento Homebrew em poderes paranormais e maldições;
- os **painéis "Homebrew desta ficha"** de Goblins, BRUTAL, Oblívio,
  Vampiro e Ordem II: as funções de versão existem e têm testes, mas o
  painel está só em Ordem I e T20;
- detalhes por sistema, como a escolha de poder geral dentro de uma
  habilidade de raça em T20 e a Ficha de Conhecimento em Vampiro.

## v9.22.0 — Painel "Homebrew desta ficha" nos outros sistemas

O painel de versões, que Ordem Paranormal e Tormenta20 já tinham (v9.15),
chega às fichas de **Malditos Goblins** (aba Goblin), **BRUTAL** (aba
Sobrevivente), **Oblívio** (aba Persona), **Vampiro** (aba Experiência) e
**Ordem Paranormal RPG II** (aba Habilidades).

### Como funciona

- Aparece no fim da aba só quando a ficha guarda alguma cópia Homebrew.
- Lista as cópias: nome, tipo (Ocupação, Descritor, Arquétipo, Papel,
  Motivação, Mazela, Fardo, Clã, Predador, Disciplina, Vantagem, Perfil…)
  e a versão.
- **Procurar versões novas** consulta a biblioteca. Quando o mesmo
  registro tem outra versão, oferece **Atualizar**, com confirmação. Quem
  só pode ler a ficha não vê o botão, e o servidor confere de novo ao
  gravar.
- Atualizar troca a chave em todo o bloco, grava a cópia nova, roda o
  `normalizar` do motor (a cópia antiga sai) e salva pelo caminho de
  sempre da ficha.

### Código

`js/homebrew-versoes.js` ganhou:
- `secaoNaFicha(no, ctx, bloco, H, normalizar)`;
- `comPainel(aba, bloco, módulo, motor)`, que envolve a função da aba;
- os rótulos dos tipos dos outros sistemas.

Cada ficha envolve a aba com `comPainel`. As funções de versão
(`copiasDaFicha`, `versoesNovas`, `atualizarVersao`) são as dos módulos
`RAMA<Sistema>Homebrew`, que já existiam e têm testes.

### Validação da v9.22.0

**Automática.** `testes/executar-homebrew-goblins.js` ganhou 3
verificações (agora 27):
- com cópias, a aba ganha a seção no fim;
- sem cópias, a aba fica como era;
- os rótulos dos tipos.

As outras suítes continuam verdes.

**Na interface** (servidor local, conta sintética):
- Criei a Ocupação Homebrew **Vidreiro** e um goblin com a cópia dela.
- Depois mudei o Vidreiro na biblioteca.
- Na ficha, o painel mostrou a cópia. **Procurar versões novas**
  encontrou a versão nova, e **Atualizar** pediu confirmação.
- Depois de confirmar, a ficha passou a mostrar a versão nova, com os
  atributos novos. Relida do servidor, a ficha tinha só a cópia nova.

### Publicar a v9.22.0

**Servidor:** nada muda.

**Site:**
- `js/homebrew-versoes.js`;
- `js/goblins/telas/ficha-goblins.js`, `js/brutal/telas/ficha-brutal.js`,
  `js/oblivio/telas/ficha-oblivio.js`,
  `js/vampiro/telas/ficha-vampiro.js`, `js/ordem2/telas/ficha-o2.js`;
- `js/versao.js`.

### Etapa 2 depois da v9.22

Continuam pendentes:
- em **Ordem I**:
  - a classe que conjura rituais;
  - a Classe Homebrew na transição de mundano ou sobrevivente para
    agente;
  - o elemento Homebrew em poderes paranormais e maldições;
- detalhes por sistema, como a escolha de poder geral dentro de uma
  habilidade de raça em T20 e a Ficha de Conhecimento em Vampiro.

## v9.23.0 — Ordem I: Classe Homebrew na transição para agente

Até a v9.22, só as três classes do livro apareciam quando um Mundano
("Atingindo NEX 5%", OPRPG p. 172) ou um Sobrevivente ("Treinamento
Especial", SAH p. 32) virava agente: a tabela de ganhos da transição
lista só elas. Agora a Classe Homebrew também aparece.

### A conta dos ganhos

`RAMAOrdemCatalogo.ganhosDeTransicao(def, de)` segue a mesma conta que
as três classes do livro seguem. Os testes conferem que ela reproduz a
tabela do livro nas três.

**Mundano.** É o que falta ao Mundano para chegar ao agente novato:
- PV, PE e SAN iniciais da classe, menos os do Mundano;
- as perícias obrigatórias e fixas da classe;
- as perícias livres da classe, menos a 1 que o Mundano já tem;
- as proficiências que o Mundano não tem;
- as habilidades de NEX 5%.

**Sobrevivente.** Os mesmos ganhos, com 4 PV, 1 PE e 4 SAN a menos,
nunca abaixo de 0. É a diferença que as três classes do livro têm entre
as duas tabelas.

Nos dois casos, o atributo de cada recurso continua o da fase anterior:
a transição soma números fixos, como no livro.

### No motor

- Registrar uma Classe Homebrew (pela cópia da ficha ou ao escolher) põe
  a classe em `TRANSICOES` e o treinamento dela em `RAMAOrdemPoderes`
  (`registrarTreinamentos`).
- O treinamento tem chave `treinamento.<de>.<classe>`, versionada como a
  classe.
- O resto do caminho é o de sempre:
  - o plano da transição;
  - as vagas "Ponto de atributo" e "Treinamento" em Falta decidir;
  - as vagas de NEX 5% da tabela da classe Homebrew.

### Na ficha

**Progressão → Atingir NEX 5% / Treinamento Especial.** A janela lista:
- as três classes do livro;
- as Classes Homebrew já registradas e as da biblioteca (as suas e as
  públicas), com "(Homebrew)" e os ganhos.

Uma classe sem a tabela do trilho em uso aparece desabilitada, com o
motivo, como na criação. Ao confirmar, a ficha guarda a **cópia** da
classe escolhida.

### Validação da v9.23.0

**Automática.** `testes/executar-homebrew-ordem.js` ganhou 9
verificações (agora 92):
- a conta reproduz a tabela do livro nas três classes, de Mundano e de
  Sobrevivente;
- os ganhos de uma Classe Homebrew de exemplo;
- o treinamento;
- Mundano → Classe Homebrew: classe, NEX, trajetória, cópia, recursos e
  pendências;
- Sobrevivente → Classe Homebrew.

As outras suítes continuam verdes.

**Na interface** (servidor local, conta sintética):
- Criei a Classe Homebrew **Vigilante** (18 PV, 3 PE, 10 SAN iniciais)
  e um Mundano.
- Em **Atingir NEX 5%**, a janela mostrou "Vigilante (Homebrew) · +10 PV
  · +2 PE · +2 SAN".
- O resumo mostrou PV 10 → 20 e as duas pendências (treinamento e ponto
  de atributo).
- Confirmei. A ficha virou "Vigilante · NEX 5%". Relida do servidor,
  tinha a trajetória Mundano → Vigilante e a cópia da classe.

### Publicar a v9.23.0

**Servidor:** nada muda.

**Site:**
- `js/ordem/catalogo.js`, `js/ordem/poderes.js`,
  `js/ordem/telas/ficha-ordem.js`;
- `js/versao.js`.

### Etapa 2 depois da v9.23

Continuam pendentes:
- em **Ordem I**:
  - a classe que conjura rituais;
  - o elemento Homebrew em poderes paranormais e maldições;
- detalhes por sistema, como a escolha de poder geral dentro de uma
  habilidade de raça em T20 e a Ficha de Conhecimento em Vampiro.

## v9.24.0 — Ordem I: a Classe Homebrew que conjura rituais

Até a v9.23, uma Classe Homebrew de Ordem só aprendia rituais por poderes
(Aprender Ritual), como Combatente e Especialista. Agora ela pode
conjurar como o Ocultista (Escolhido pelo Outro Lado, OPRPG p. 33).

### No editor

Na etapa **Perícias**, o bloco **Rituais** tem a marca **"Conjura rituais
como o Ocultista"**. Marcada, aparecem quatro campos, um por círculo, com
o NEX em que cada um abre. O padrão é o do Ocultista: 5%, 25%, 55% e
85%.

As regras dos campos:
- o 1º círculo é obrigatório;
- "—" num círculo encerra a tabela ali (não há 3º sem 2º);
- cada círculo abre num marco de NEX depois do anterior. Um valor fora
  de ordem é recusado.

A prévia da revisão diz, por exemplo: "Conjura rituais (como o
Ocultista): …; 1º círculo em NEX 5%, 2º círculo em NEX 30%."

Partir de **"Tabelas do Ocultista"** já traz a marca e os círculos dele.
A mesa pode desmarcar.

### No motor

- `normalizarClasse` guarda `circuloPorNex` **só quando a marca existe**.
  As classes de antes continuam com a mesma definição e a mesma chave:
  nenhuma ficha ganha uma "versão nova" por causa desta mudança.
- O motor de rituais já lia `circuloPorNex` da classe. Com ele, a Classe
  Homebrew recebe as mesmas concessões do Ocultista:
  - 3 rituais de 1º círculo no 1º marco;
  - um ritual por marco depois, até o círculo que já alcança;
  - nada disso conta no limite por Intelecto;
  - as regras de aprendizado em campo, aprendizado lento e Evolução por
    Patentes valem como para o Ocultista.
- O círculo máximo e a DT vêm da tabela da mesa.
- Essas concessões levam `classeHomebrew` e aparecem como **"Ritual de
  classe"**, não "Ritual de ocultista".

### Validação da v9.24.0

**Automática.** `testes/executar-homebrew-ordem.js` ganhou 11
verificações (agora 103):
- sem a marca, a definição e a chave não mudam;
- partir do Ocultista traz os círculos dele;
- círculos fora de ordem, sem o anterior ou em NEX que não é marco são
  recusados;
- a marca muda a chave;
- a prévia;
- o círculo máximo pelo NEX;
- as concessões de NEX 15% e o rótulo;
- a classe sem a marca não conjura.

As outras suítes continuam verdes.

**Na interface** (servidor local, conta sintética), no editor de Classe:
- **Tabelas do Ocultista** marcou "Conjura rituais" com 5/25/55/85.
- Pôr "—" no 2º círculo tirou o 3º e o 4º.
- Pôr 30% no 2º funcionou. Pôr 20% no 3º, antes do 2º, foi recusado.
- A revisão mostrou "1º círculo em NEX 5%, 2º círculo em NEX 30%".

### Publicar a v9.24.0

**Servidor:** nada muda.

**Site:**
- `js/ordem/homebrew-ordem.js`, `js/ordem/aprendizado.js`;
- `js/paginas/homebrew-classe.js`;
- `js/versao.js`.

### Etapa 2 depois da v9.24

Continuam pendentes:
- em **Ordem I**, o elemento Homebrew em poderes paranormais e
  maldições;
- detalhes por sistema, como a escolha de poder geral dentro de uma
  habilidade de raça em T20 e a Ficha de Conhecimento em Vampiro.

## v9.25.0 — Ordem I: elemento Homebrew em poderes, itens e maldições

O elemento Homebrew de Ordem (v9.8) já valia em rituais, criaturas,
itens paranormais e afinidade. Agora vale também nos poderes e nas
escolhas de elemento de itens e maldições.

O critério é o da especificação: separar **o elemento que o campo
aceita** do **elemento para o qual uma regra do livro dá efeito**.

### Poderes

**Aceitam o elemento Homebrew** os poderes cuja regra serve a qualquer
elemento:

| Poder | Por que é genérico |
|---|---|
| Especialista em Elemento | +2 na DT dos rituais do elemento |
| Mestre em Elemento | –1 PE nos rituais do elemento |
| Acostumado à Maldição de Elemento | itens amaldiçoados do elemento |
| Aprender Ritual | conta como poder do elemento do ritual; um ritual de Vidro dá Vidro |
| Resistir a Elemento | resistência 10 ao dano do elemento |
| Cicatrizado | –1 dado contra o perigo do elemento |

**Continuam só com os elementos do livro** os poderes que dão um efeito
por elemento oficial:
- Dominador de Elemento (usa a opressão do livro);
- Grão-Mestre em Elemento (um efeito para cada elemento);
- Ser Amaldiçoado, Ser Experimentado e Ser Escarificado (efeitos e
  etapas por elemento).

Escolher um elemento Homebrew num desses dá o motivo: "este poder tem
efeitos só para os elementos do livro (um elemento Homebrew não herda
nenhum)". Um elemento Homebrew também não ganha a linha "Afinidade" dos
poderes: isso continua só para os oficiais.

A janela de escolha mostra o elemento como "Vidro (Homebrew)", com a
descrição dele e "Sem efeitos de elemento do livro". A janela consulta a
biblioteca uma vez, para mostrar também os elementos que ainda não estão
na ficha. Escolher grava a **cópia** do elemento em
`ordem.homebrew.elementos`.

### Itens e maldições

As escolhas de elemento dos itens do catálogo são todas genéricas, e
agora oferecem os elementos Homebrew:
- componentes ritualísticos;
- catalisadores;
- amarras;
- scanner;
- amuleto sinalizador;
- as maldições Antielemento (arma letal contra o elemento) e Proteção
  elemental (resistência contra o elemento).

O item e a maldição levam a cópia do elemento (`elementosHomebrew`). A
biblioteca de itens consulta a biblioteca Homebrew uma vez, ao abrir.

Continuam só dos elementos do livro:
- o **preço da maldição** (OPRPG p. 145);
- a **opressão** entre maldições no mesmo item.

Uma escolha de item pode ser marcada `soOficiais` para recusar os
Homebrew.

### Correção

A confirmação de uma escolha da Progressão (`confirmarAquisicao`)
trabalha numa cópia da ficha. Ela trazia de volta só as escolhas e os
registros de ritual, e não as cópias Homebrew que a escolha tinha posto
na ficha. Agora traz.

### Validação da v9.25.0

**Automática.** `testes/executar-homebrew-ordem.js` ganhou 14
verificações (agora 117):
- Especialista em Elemento aceita Vidro;
- Dominador de Elemento recusa Vidro, com o motivo;
- texto que não é elemento continua inválido;
- só os seis poderes genéricos aceitam elemento Homebrew;
- a cópia na ficha, pelos dois caminhos (registrar e a janela), o nome
  "Especialista em Vidro" e a recarga;
- as opções de elemento dos itens, inclusive com `soOficiais`;
- a maldição Proteção elemental contra Vidro: o registro, a ficha e a
  falta de preço do livro;
- os componentes ritualísticos de Vidro.

As outras suítes continuam verdes. `testes/executar-simbolos-rituais.js`
tem 1 falha que já existia antes desta versão: cinco símbolos de ritual
de AS1/AS2 não são quadrados. Nenhuma imagem foi mexida.

**Na interface** (servidor local, conta sintética):
- Criei o elemento **Vidro** e um ocultista de NEX 15%.
- Em **Escolher poder**, Especialista em Elemento mostrou "Vidro
  (Homebrew)" junto dos cinco do livro.
- Confirmei. A ficha relida do servidor tinha "Especialista em Vidro" e a
  cópia do elemento.
- A primeira tentativa revelou a correção acima: a escolha gravava sem a
  cópia. Corrigi e refiz o teste.
- As opções de elemento dos componentes mostraram Sangue, Morte,
  Conhecimento, Energia e Vidro.

### Publicar a v9.25.0

**Servidor:** nada muda.

**Site:**
- `js/ordem/poderes.js`, `js/ordem/progressao.js`, `js/ordem/itens.js`,
  `js/ordem/inventario.js`;
- `js/ordem/telas/ordem-escolhas.js`, `js/ordem/telas/ficha-ordem.js`;
- `js/paginas/ficha-inventario-biblioteca.js`;
- `js/versao.js`.

### Etapa 2 depois da v9.25

Os itens de Ordem I estão feitos. Continuam pendentes detalhes por
sistema:
- a escolha de poder geral dentro de uma habilidade de raça em T20;
- a Ficha de Conhecimento em Vampiro;
- a origem Exorcizado e a Mácula de Ferido por Ritual continuam só com
  os elementos do livro (revisar se a mesa quer o Homebrew ali).

## v9.26.0 — Tormenta20: poder geral numa habilidade de raça

### A correção (vale também para as raças do livro)

Duas habilidades de raça do livro dão um poder geral à escolha:
- **Propósito de Criação**, do golem;
- **Memória Póstuma**, do osteon (na opção "um poder geral").

A criação gravava o poder escolhido, mas o motor não o lia, e o poder
não somava na ficha. Por exemplo, um golem com Esquiva ficava sem o +2 na
Defesa e em Reflexos.

Agora `coletarFontes` põe esse poder como uma fonte própria
(`raca:poder:<id>`), com os efeitos dele. Ele aparece na aba Habilidades
e entra na conta. Um id que não é poder é ignorado: nada é inventado.

### Na Raça Homebrew

O editor de Raça (escolha da habilidade) ganhou **"Um poder geral (como
Propósito de Criação)"**. A definição guarda `{ tipo: "poderGeral",
quantidade: 1 }`, e a prévia diz "um poder geral à escolha". Na
criação, a lista é a mesma do golem.

### Validação da v9.26.0

**Automática.** `testes/executar-homebrew-t20.js` ganhou 5
verificações (agora 135):
- golem com Esquiva: +2 na Defesa;
- osteon com Esquiva pela Memória Póstuma: +2 na Defesa;
- a escolha na definição da Raça Homebrew;
- o poder escolhido numa Raça Homebrew entra na conta;
- um id inválido é ignorado.

As outras suítes continuam verdes.

**Na interface** (servidor local, conta sintética): um golem guerreiro
com Propósito de Criação → Esquiva mostrou Defesa 15 (13 sem o poder) e
"Esquiva" na aba Habilidades.

### Publicar a v9.26.0

**Servidor:** troque **`Tormenta20.gs`** e **`Tormenta20Dados.gs`**
(regenerados por `testes/gerar-tormenta20-gs.js`) e crie uma versão nova
da implantação. **`setupRama()` não é necessário.**

**Site:**
- `js/tormenta20/regras.js`, `js/tormenta20/racas.js`,
  `js/tormenta20/homebrew-t20.js`;
- `js/paginas/homebrew-raca-t20.js`;
- `js/versao.js`.

## v9.27.0 — Vampiro: Ficha de Conhecimento Homebrew

### O editor

**Homebrew → + Criar → Vampiro: A Máscara → Ficha de Conhecimento**:
- nome e texto;
- **clã exclusivo** (opcional), do livro ou Homebrew, como Descendente de
  Tyler (só Brujah);
- de **1 a 5 níveis**, cada um com nome, **limite de uso** (sem limite,
  1× por história, 1× por sessão ou 1× por crônica) e texto.

A prévia lista os níveis com o limite de uso.

### No motor

- Chave `hbvf-<id>-<hash>`, versionada. A definição entra no mesmo mapa
  das 25 do livro (`FICHAS_DE_CONHECIMENTO`), e as telas a mostram com
  "(Homebrew)":
  - na **criação**, entre as Vantagens (cada nível à parte);
  - nas **compras com XP** (3 XP por ponto, cada nível à parte).
- A ficha guarda a cópia em `vampiro.homebrew.fichas`. Sem cópia e sem
  catálogo, a ficha some: nada é inventado.
- Uma Ficha de Conhecimento Homebrew pode ter menos de 5 níveis. Comprar
  ou escolher um nível que ela não tem é recusado com o motivo, e a
  normalização tira um nível assim.
- A exclusividade de clã vale como nas do livro.
- `RAMAVampiroHomebrew` cuida da biblioteca, da prévia e das versões. O
  painel "Homebrew desta ficha" (v9.22) mostra as cópias.

### Correção: a compra com XP grava a cópia

Comprar com XP uma Vantagem, uma Disciplina ou uma Ficha de Conhecimento
Homebrew não gravava a cópia da definição na ficha. A cópia só
aparecia quando a ficha era normalizada com a biblioteca carregada. Uma
ficha gravada sem a cópia perderia a compra ao ser aberta sem a
biblioteca.

Agora `comprar` grava a cópia na hora. Achei o problema validando esta
versão no navegador.

### Servidor e pacotes

- `TIPOS_HOMEBREW` ganhou `conhecimento`, que também passa a ser um dos
  estruturais de Vampiro.
- `Vampiro.gs` foi regenerado (`testes/gerar-vampiro-gs.js`).
- Os pacotes ganharam o grupo "Fichas de Conhecimento".

### Validação da v9.27.0

**Automática.** `testes/executar-homebrew-vampiro.js` ganhou 14
verificações (agora 32):
- a definição: chave, até 5 níveis, limite de uso, clã;
- a ficha: a cópia registra, e um nível inexistente sai;
- a compra com XP: o custo, o nível inexistente recusado e a
  exclusividade de clã;
- a compra grava a cópia, e a ficha sobrevive sem a biblioteca;
- sem cópia, a ficha some;
- a prévia;
- a biblioteca;
- o destino e o pacote;
- a versão nova.

`testes/pacotes-backend.js` verifica que o servidor aceita o tipo. As
outras suítes continuam verdes; a suíte do servidor teve, numa
execução, a falha intermitente já conhecida, e passou nas duas
seguintes.

**Na interface** (servidor local, conta sintética):
- Criei **Os Vidreiros de Murano** pelo editor, com três níveis, e tirei
  o terceiro. A revisão mostrou "Nível 1 · Olho Treinado (1× por
  história)". Gravou com 2 níveis.
- Numa vampira com 20 XP, em Experiência → Comprar → Ficha de
  Conhecimento, apareceu "Os Vidreiros de Murano (Homebrew)". Comprei o
  nível 1 por 3 XP. A ficha relida do servidor tinha o nível e a cópia, e
  a aba Vantagens mostrou "Os Vidreiros de Murano — Olho Treinado".

### Publicar a v9.27.0

**Servidor:** troque **`Codigo.gs`** e **`Vampiro.gs`** e crie uma
versão nova da implantação. **`setupRama()` não é necessário.**

**Site:**
- `js/vampiro/catalogo.js`, `js/vampiro/regras.js`,
  `js/vampiro/homebrew-vampiro.js`;
- `js/vampiro/telas/vampiro-criar.js`, `js/vampiro/telas/ficha-vampiro.js`;
- `js/paginas/homebrew-vampiro.js`, `js/paginas/homebrew-editor.js`,
  `js/paginas/homebrew.js`;
- `js/homebrew-adaptadores.js`, `js/pacotes-homebrew.js`;
- `js/versao.js`.

## v9.28.0 — Ordem I: elemento Homebrew nas origens Exorcizado e Ferido por Ritual

As duas origens que pedem um elemento ficaram pendentes na v9.25. Elas
seguem o mesmo critério: o elemento Homebrew entra onde a regra serve a
qualquer elemento.

| Origem | Decisão | Por quê |
|---|---|---|
| **Exorcizado** (O Que Restou, AS7 p. 80) | **aceita** o elemento Homebrew | RD 5 contra o tipo do elemento e perda de Sanidade no primeiro contato da cena: regra genérica |
| **Ferido por Ritual** (Mácula Ritualística, AS1 p. 43) | **só os elementos do livro** | a perícia da origem vem de uma tabela do livro (Fortitude para Sangue, Vontade para Morte e Conhecimento, Reflexos para Energia) |

No Exorcizado, a RD 5 contra o elemento Homebrew entra na conta, com o
nome dele. Escolher um elemento Homebrew em Ferido por Ritual dá o
motivo: "este poder tem efeitos só para os elementos do livro".

### Validação da v9.28.0

**Automática.** `testes/executar-homebrew-ordem.js` ganhou 3
verificações (agora 120):
- Exorcizado aceita Vidro;
- a RD 5 contra Vidro entra na conta;
- Ferido por Ritual recusa Vidro, com o motivo.

**Na interface:** não abri o navegador nesta versão. A escolha de origem
usa o mesmo seletor de elemento validado no navegador na v9.25.0.

### Publicar a v9.28.0

**Servidor:** nada muda.

**Site:** `js/ordem/catalogo.js` e `js/versao.js`.

### Etapa 2 depois da v9.28

Os pendentes que eu tinha listado na Etapa 2 estão feitos. Ainda ficam,
da lista geral da especificação:
- as opções das variantes de Goblins (como PokéPragas);
- os modelos de mesa de BRUTAL;
- as Habilidades Homebrew no motor de Vampiro, Goblins, Oblívio e BRUTAL
  (resolver ids de Homebrew junto com o catálogo, com cópia versionada
  na ficha). Em T20, Magia e Poder Homebrew já entram no motor desde a
  v9.14.

## v9.29.0 — Vampiro: Poder de Disciplina Homebrew no motor

Até aqui, a Habilidade Homebrew de Vampiro só ia para as anotações. O
subtipo **Poder de Disciplina** agora entra no motor.

### O editor

**Homebrew → + Criar → Vampiro → Habilidade → Poder de Disciplina**:
- **Disciplina (do livro)**. Para uma Disciplina Homebrew, os poderes
  ficam no editor dela (v9.20);
- **nível** de 1 a 5;
- **custo**: grátis ou 1 a 3 Checagens de Despertar;
- **parada**: sem teste, ou Atributo + Disciplina;
- **duração**: passiva, turno, cena, noite ou indefinida;
- **pré-requisitos**, em texto (a mesa confere);
- o **texto** do registro é o efeito.

Registros antigos, com a Disciplina escrita em texto, continuam
**Manual**. O R.A.M.A. não adivinha qual Disciplina era.

### No motor

- Chave `hbvq-<id>-<hash>`, versionada. O poder entra na **mesma lista**
  dos poderes da Disciplina (`daDisciplina`), como os poderes
  "narrativos" do livro: o motor cobra as Checagens, rola a parada e
  marca a duração. O efeito é da mesa.
- O poder aparece, com "(Homebrew)":
  - na **criação**;
  - em **Adicionar poder** (aba Disciplinas, em edição);
  - nas **compras com XP**.
- Valem as regras de aquisição de sempre: um poder por ponto, de nível
  menor ou igual ao valor da Disciplina.
- A ficha guarda a **cópia da definição** em `vampiro.homebrew.poderes`.
  Aberta sem a biblioteca (no servidor, por exemplo), o poder volta pela
  cópia.

### Correção: a cópia depois de qualquer operação

A v9.27 corrigiu a cópia na compra com XP. Faltavam os outros caminhos,
como adicionar um poder à mão ou escolher algo na criação. Agora
`aplicarOperacao` garante, depois de cada operação, a cópia de tudo o
que é Homebrew na ficha:
- Disciplinas e poderes;
- Vantagens;
- Fichas de Conhecimento;
- clã e predador.

A aba **Disciplinas** passou a consultar a biblioteca Homebrew, como a
aba Experiência já fazia.

### Validação da v9.29.0

**Automática.** `testes/executar-homebrew-vampiro.js` ganhou 10
verificações (agora 42):
- a definição;
- a recusa de Disciplina Homebrew, Alquimia ou inventada;
- a entrada na lista com custo, parada e duração;
- a aquisição pelo nível;
- a cópia da definição depois de uma operação;
- a ficha reaberta sem a biblioteca;
- a biblioteca e o destino;
- o registro antigo continua Manual;
- a prévia.

As outras suítes continuam verdes.

**Na interface** (servidor local, conta sintética):
- Pelo editor, o subtipo mostrou "Disciplina (do livro)" com as 11
  Disciplinas, Custo, Parada e Duração. Criei **Olhar de Cristal**
  (Auspícios 2, 1 Checagem, Raciocínio + Auspícios, uma cena).
- Numa vampira com Auspícios 2, em edição, a aba Disciplinas ofereceu "2
  · Olhar de Cristal (Homebrew)". Adicionei o poder. A ficha relida do
  servidor tinha o poder e a cópia da definição (com as Checagens e a
  parada).
- Na primeira tentativa, a aba não oferecia o poder: ela não consultava
  a biblioteca. Corrigi e refiz o teste.

### Publicar a v9.29.0

**Servidor:** troque **`Vampiro.gs`** e crie uma versão nova da
implantação. **`setupRama()` não é necessário.**

**Site:**
- `js/vampiro/disciplinas-dados.js`, `js/vampiro/regras.js`,
  `js/vampiro/homebrew-vampiro.js`;
- `js/vampiro/telas/ficha-vampiro.js`,
  `js/vampiro/telas/ficha-vampiro-disciplinas.js`,
  `js/vampiro/telas/vampiro-criar.js`;
- `js/homebrew-adaptadores.js`;
- `js/versao.js`.

## v9.30.0 — Malditos Goblins: Magia e Técnica Homebrew no motor

### Magia

**Homebrew → + Criar → Malditos Goblins → Habilidade → Magia**. Para cada
resultado (0, 1, 2 e 3+ hits):
- **o que acontece**, em texto;
- **o que a ficha aplica**, se a mesa quiser:
  - só o texto;
  - 1 ferimento em quem conjurou;
  - 1, 2 ou 3 ferimentos num inimigo;
  - remove 1 ferimento, ou todos, de um aliado.

São os efeitos que o motor já aplica nas magias do livro. Nada além
disso é automatizado.

No motor:
- chave `hbgm-<id>-<hash>`, versionada;
- a magia entra em `MAGIAS`, e na escolha de **magias do Bruxo** (criação
  e ficha, em edição) depois das sete do livro, com "(Homebrew)";
- **conjurar** é o caminho de sempre: teste de Noção, Condutor Mágico,
  Arcano, Ciranda; o resultado vem pelos hits, e Implacável também vale;
- uma magia sem nenhum texto de resultado não é aceita.

### Técnica

**Habilidade → Técnica**: nome, texto e o uso (quando o texto diz, ou **1
vez por dia**).

Técnicas vêm das ocupações. Esta, a **mesa concede**: aba **Técnicas e
magia**, painel "Técnicas concedidas pela mesa", em edição. A técnica
entra nas técnicas do goblin (`tecnicasDe`). O uso de 1 vez por dia é
marcado pela ficha e volta no dia seguinte, como nas do livro; o efeito
é o do texto.

### Cópias e versões

- A ficha guarda as cópias em `goblins.homebrew.magias` e
  `goblins.homebrew.tecnicas`. Sem cópia e sem catálogo, a escolha sai.
- Como em Vampiro (v9.29), `aplicarOperacao` garante, depois de cada
  operação, as cópias de tudo o que é Homebrew: magias, técnicas,
  ocupação e descritor.
- O painel "Homebrew desta ficha" mostra as cópias e as versões novas.

### Correção na consulta da biblioteca

A consulta da biblioteca escolhia a prévia pelo subtipo. O Poder de
Disciplina de Vampiro (v9.29) tem o mesmo subtipo (`disciplina`) da
Disciplina estrutural. Agora a prévia vem pelo tipo resolvido.

### Validação da v9.30.0

**Automática.** `testes/executar-homebrew-goblins.js` ganhou 12
verificações (agora 39):
- a magia: definição, recusa sem texto, lista do Bruxo, cópia;
- conjurar com 0 e com 2 hits, com o efeito aplicado;
- a técnica concedida: a entrada, a saída sem cópia, o uso diário;
- as cópias depois de uma operação;
- a biblioteca e o destino;
- as prévias.

As outras suítes continuam verdes.

**Na interface** (servidor local, conta sintética):
- Gravei a Magia **Estilhaço** e a Técnica **Assobio de Vidro**, com os
  campos que o editor grava.
- Num Bruxo, em edição, a escolha de magias mostrou "Estilhaço
  (Homebrew)", e o painel novo ofereceu "Assobio de Vidro (1×/dia)".
- Marquei a magia e concedi a técnica. A ficha relida do servidor tinha
  as duas, com as cópias.
- A magia ganhou o botão Conjurar. "Usar (1 vez por dia)" marcou a
  técnica como usada hoje.

### Publicar a v9.30.0

**Servidor:** troque **`Goblins.gs`** e crie uma versão nova da
implantação. **`setupRama()` não é necessário.**

**Site:**
- `js/goblins/catalogo.js`, `js/goblins/regras.js`,
  `js/goblins/homebrew-goblins.js`;
- `js/goblins/telas/ficha-goblins.js`, `js/goblins/telas/goblins-criar.js`;
- `js/homebrew-adaptadores.js`, `js/paginas/homebrew-editor.js`;
- `js/versao.js`.

## v9.31.0 — Oblívio: Habilidade Homebrew no motor

### O editor

**Homebrew → + Criar → Oblívio → Habilidade**:
- **ação**: passiva, Regular, Extra, Completa, ou Regular + Movimento;
- **limite de uso**, um dos que a ficha já conta nas habilidades do
  livro: por rodada, por cena, por cena de Descanso ou Interação, entre
  Descansos ou por Partida;
- **vezes** nesse limite, de 1 a 3;
- **custo** e **alvo**, em texto;
- **requisitos**, em texto (a Testemunha confere);
- o **texto** do registro é o efeito.

Um registro antigo, com o limite escrito em texto ("uma vez por
sessão"), mantém o texto na habilidade ("Limite: …, a mesa controla").
Ele não vira regra.

### No motor

- Chave `hboh-<id>-<hash>`, versionada. A habilidade entra no catálogo
  (`HABILIDADES`) como **Geral**, sem Papel.
- Ela aparece, com "· Homebrew":
  - na **escolha ao concluir uma Missão** (Única do Papel ou Geral);
  - em **"Habilidade concedida pela Testemunha"**, na aba Habilidades.
- **Usar** (ação que não é passiva) confere o limite, conta o uso e
  registra. O efeito é o do texto, aplicado pela mesa. Uma passiva diz
  isso no cartão, em vez de "Automática".
- A ficha guarda a cópia em `oblivio.homebrew.habilidades`.
  `aplicarOperacao` garante, depois de cada operação, as cópias de tudo
  o que é Homebrew: Papel, Motivação, Mazelas, Fardos e habilidades.
- A aba Habilidades passou a consultar a biblioteca.

### Validação da v9.31.0

**Automática.** `testes/executar-homebrew-oblivio.js` ganhou 11
verificações (agora 31):
- a definição e o limite;
- a cópia renormalizada mantém as vezes;
- o texto com custo e alvo;
- o limite antigo em texto;
- o catálogo;
- a concessão pela Testemunha;
- a cópia depois de uma operação;
- o uso: 2 por cena, e o terceiro recusado;
- a ficha reaberta sem a biblioteca;
- a biblioteca e o destino;
- a prévia.

As outras suítes continuam verdes.

**Na interface** (servidor local, conta sintética):
- Gravei **Reflexo Partido** (Ação Extra, 2 por cena, custo 1 de
  Estresse, alvo uma Ameaça).
- Numa Persona, "Habilidade concedida pela Testemunha" ofereceu
  "Reflexo Partido (Geral) · Homebrew". Adquiri. A ficha relida do
  servidor tinha a habilidade e a cópia.
- Usei duas vezes. Na terceira, o botão ficou desabilitado: "limite de
  2 por cena atingido".
- Duas correções saíram dessa validação, antes desta entrega:
  - o cartão não mostrava o botão Usar, porque só as habilidades do livro
    tinham ativação;
  - a cópia renormalizada voltava para 1 vez, porque as vezes ficavam só
    dentro do limite.

### Publicar a v9.31.0

**Servidor:** troque **`Oblivio.gs`** e crie uma versão nova da
implantação. **`setupRama()` não é necessário.**

**Site:**
- `js/oblivio/catalogo.js`, `js/oblivio/regras.js`,
  `js/oblivio/habilidades.js`, `js/oblivio/homebrew-oblivio.js`;
- `js/oblivio/telas/ficha-oblivio.js`;
- `js/homebrew-adaptadores.js`, `js/paginas/homebrew-editor.js`;
- `js/versao.js`.

## v9.32.0 — BRUTAL: modelos de mesa e Vantagem Homebrew

### Os modelos de mesa

**Homebrew → + Criar → BRUTAL** ganhou três tipos, cada um com uma etapa
e a revisão:
- **Ameaça**:
  - nome, adjetivos e texto;
  - as **Ações Únicas** dela, do livro;
  - o **Intento Único** (opcional), com texto e PH (+1 a +4);
- **Apavoro**: nome, **cena** (Livre ou Encontro), **recarga** (sem
  restrição, fim ou início de Encontro, início de sessão, cena Livre),
  **custo** em PH e o texto;
- **Assassino**:
  - as **Ameaças** (a primeira é a Principal), do livro ou Homebrew;
  - dados, PH e Testes de Susto por Encontro iniciais;
  - as **Ações Únicas**, das Ameaças escolhidas;
  - o **Apavoro**, do livro ou Homebrew;
  - o resumo.

Chaves `hbbm-`, `hbbp-` e `hbbk-`, versionadas, nos mesmos mapas do
Corte Rápido (`AMEACAS`, `INTENTOS_UNICOS`, `APAVOROS`, `ASSASSINOS`).

### Na mesa da Diretora

- **Assassino**: a carta do Assassino Homebrew aparece depois dos quatro
  prontos, com "(Homebrew)" e sem arte. Escolhê-la dá os valores do
  modelo, como nos prontos. No Personalizado, as Ameaças e o Apavoro
  Homebrew também aparecem.
- **Salvar o Assassino** leva junto as cópias dos modelos usados. O
  servidor não tem a biblioteca e roda o mesmo motor. A mesa guarda as
  cópias em `homebrew.assassinos`, `homebrew.ameacas` e
  `homebrew.apavoros`.
- **Jogo → Intentos**: o Intento Único de uma Ameaça Homebrew vira um
  botão. A Diretora marca quando acontece e ganha os PH.
- **Apavoro Homebrew**: um botão que paga os PH, marca o uso e registra o
  efeito do texto. O uso volta pela recarga do Apavoro, como os do livro.
  Um Apavoro de Encontro só vale num Encontro.
- As operações novas (`apavoroHomebrew`, `intentoUnicoHomebrew`) são só
  da Diretora, e o servidor confere isso.

### A Vantagem

**Habilidade → Vantagem**, no formato das Vantagens da mesa:
- **Estilo**, ou Geral;
- **custo** em PT;
- **recarga**;
- **efeito** que o motor aplica: +1 dado, reduzir a próxima Ferida, um
  sucesso no Partir Para Cima, Recurso e os demais da lista, ou "só
  registra".

Em **Lacunas e Vantagens → Vantagens da mesa**, a Diretora escolhe
**Da biblioteca** e a Vantagem entra na mesa como cópia.

Um registro antigo, com Tensão e janela em texto, vira custo (o número da
Tensão), efeito "só registra" e "Janela: …" no texto. Nada se perde.

### Validação da v9.32.0

**Automática.** `testes/executar-homebrew-brutal.js` ganhou 15
verificações (agora 33):
- as três definições;
- configurar o Assassino Homebrew com as cópias;
- a mesa reaberta sem a biblioteca;
- o Apavoro: recusado fora de Encontro; num Encontro, paga, marca e
  recusa o segundo uso;
- o Intento Único e a restrição à Diretora;
- a Vantagem para a mesa, inclusive o registro antigo;
- a biblioteca, o destino e o pacote;
- as prévias.

`testes/pacotes-backend.js` verifica que o servidor aceita os três tipos.
As outras suítes continuam verdes.

**Na interface** (servidor local, conta sintética):
- Criei pelos editores a Ameaça **Vidraceiro** (Intento +2), o Apavoro
  **Estilhaçar!** (Encontro, 4 PH) e o Assassino **O Vidraceiro**, que
  usa os dois. A revisão do Assassino mostrou "Dados 5 · PH 2 · Testes de
  Susto por Encontro 2".
- Numa campanha de BRUTAL sintética, a aba Assassino mostrou "O
  Vidraceiro (Homebrew)". Os dados mostraram o Apavoro e o Intento.
  Salvei. O estado da mesa, lido do servidor, tinha o modelo, a Ameaça, o
  Apavoro e as três cópias.
- Na aba Jogo, "Intento Único: … (+2)" deu os 2 PH. O botão do Apavoro
  ficou desabilitado fora do Encontro ("É de Encontro").

### Publicar a v9.32.0

**Servidor:** troque **`Codigo.gs`** e **`Brutal.gs`** e crie uma versão
nova da implantação. **`setupRama()` não é necessário.**

**Site:**
- `js/brutal/catalogo.js`, `js/brutal/mesa.js`,
  `js/brutal/homebrew-brutal.js`, `js/brutal/telas/campanha-brutal.js`;
- `js/paginas/homebrew-brutal.js`, `js/paginas/homebrew-editor.js`,
  `js/paginas/homebrew.js`;
- `js/homebrew-adaptadores.js`, `js/pacotes-homebrew.js`;
- `campanha/index.html`;
- `js/versao.js`.

## v9.33.0 — Malditos Goblins: opções das variantes (PokéPraga e Receita)

### PokéPraga (adaptação PokéPragas)

**Homebrew → + Criar → Malditos Goblins → PokéPraga**, no editor de
campos:
- **raridade**: comum, incomum ou rara (a captura pede 1, 2 ou 3 hits);
- **Combate**, **Habilidade**, **Noção** e **Vitalidade**;
- **elemento**: rolado, como nas do livro, ou um fixo.

Chave `hbgp-<id>-<hash>`. A espécie entra na ficha das PokéPragas
(`POKE.ficha`). **As tabelas d6 do livro não mudam**: "Procurar na grama
alta" e a PokéPraga inicial do Treinador continuam rolando só as do
livro.

Na ficha, com a adaptação ligada (aba **Adaptações**, em edição),
"PokéPraga Homebrew → **Pôr à vista**" coloca a espécie à vista, com o
elemento fixo ou um elemento rolado. Daí em diante vale a regra de
sempre:
- a **captura** com PokéPedra (teste de Habilidade pela raridade);
- o **ataque**;
- a **evolução**;
- os atributos da espécie, somados aos do elemento.

### Receita (adaptação Vale dos Goblins)

**Receita**: hits do teste de Noção, os ingredientes (as plantas do Vale,
Tomate, Ovo, Leite e Fruta, de 0 a 3 cada) e o peixe (200 g a 3 kg).
Chave `hbgr-<id>-<hash>`.

A receita aparece na **cozinha**, com "· Homebrew". Cozinhar segue a
regra: confere os ingredientes, testa Noção e, se falhar, os ingredientes
se perdem.

### Cópias

A ficha guarda as cópias em `goblins.homebrew.pragas` e
`goblins.homebrew.receitas`. Como nas outras versões, isso também
acontece depois de cada operação. Uma espécie sem cópia não quebra a
ficha: aparece pelo nome que a PokéPraga tem.

### Validação da v9.33.0

**Automática.** `testes/executar-homebrew-goblins.js` ganhou 14
verificações (agora 53):
- a espécie, e as tabelas d6 sem mudança;
- pôr à vista com o elemento fixo;
- a captura de uma rara com 3 hits;
- os atributos com o elemento;
- a cópia;
- a recusa com a adaptação desligada;
- a receita, e a recusa sem ingrediente;
- cozinhar e a cópia da receita;
- a biblioteca, o destino, as prévias e o pacote.

`testes/pacotes-backend.js` verifica que o servidor aceita os dois tipos.
As outras suítes continuam verdes.

**Na interface** (servidor local, conta sintética):
- Pelo editor de campos, criei a PokéPraga **Gato de Vidro** (rara,
  Combate 3, Habilidade 4, Noção 2, Vitalidade 3, Fantasma).
- Num goblin com PokéPragas ligada, a aba Adaptações ofereceu "Gato de
  Vidro (raro, Fantasma)". "Pôr à vista" mostrou "À vista: Gato de Vidro
  (Raro, Fantasma). Captura com 3 hit(s) de Habilidade". A ficha relida
  do servidor tinha a PokéPraga à vista e a cópia.
- A Receita foi validada pelos testes automáticos, não na interface.

### Publicar a v9.33.0

**Servidor:** troque **`Codigo.gs`** e **`Goblins.gs`** e crie uma versão
nova da implantação. **`setupRama()` não é necessário.**

**Site:**
- `js/goblins/catalogo.js`, `js/goblins/regras.js`,
  `js/goblins/homebrew-goblins.js`, `js/goblins/telas/ficha-goblins.js`;
- `js/homebrew-adaptadores.js`, `js/paginas/homebrew-editor.js`,
  `js/pacotes-homebrew.js`;
- `js/versao.js`.

### Etapa 2 depois da v9.33

Feitos os tipos estruturais de todos os sistemas, as Habilidades Homebrew
no motor, os modelos de mesa de BRUTAL e as opções das variantes de
Goblins. Da Etapa 2 resta **dependências nos pacotes**.

## v9.34.0 — Dependências nos pacotes

As chaves Homebrew carregam o id curto da criação de origem:
`hbXX-<id8>-<hash>`, ou `hbbe-<id12>` no Estilo de BRUTAL. Uma criação
**depende** de outra quando a definição dela cita a chave da outra.
Alguns exemplos:
- o Assassino que usa uma Ameaça;
- o clã ou o Predador que usa uma Disciplina;
- o Arquétipo que usa um Estilo;
- a classe de T20 que usa um poder;
- o ritual que usa um elemento.

### Ao montar um pacote

Na etapa **Conteúdo**, se uma criação do pacote usa outra **sua** que não
está nele, aparece o aviso, por exemplo: "O Vidraceiro usa Vidraceiro
(Ameaça)". O botão **Incluir as que faltam** põe no pacote as que cabem
nele. Só entram criações da própria conta: nada de outra conta é
exportado.

### Ao importar

Cada entrada do pacote traz `depende`, os ids das entradas de que ela
precisa. O servidor calcula isso e a origem não sai. Se a pessoa escolhe
uma entrada que usa outra do pacote ainda não escolhida nem importada,
aparece o aviso, com **Selecionar também**.

### Correção: as chaves na importação

A cópia importada ganha um id novo. A chave que apontava para ela, numa
outra criação, continuava com o id antigo, e a dependência ficava
quebrada na biblioteca de quem importou.

Agora o servidor **remapeia** essas chaves na importação. Isso vale para
as entradas importadas junto e para as que já tinham sido importadas
antes. O id curto muda e o hash fica: a definição continua sendo a
mesma. O motor de cada sistema recalcula a chave versionada ao usar a
criação.

### Validação da v9.34.0

**Automática.**
- `testes/pacotes-backend.js`, 4 verificações novas:
  - o pacote com a Ameaça e o Assassino;
  - o `depende` sem expor a origem;
  - importados juntos: a chave aponta para a cópia;
  - importado depois: a chave aponta para a cópia já importada.
- `testes/executar-pacotes.js`, 2 verificações: as dependências pelo id
  de 8 e pelo de 12.

As outras suítes continuam verdes.

**Na interface** (servidor local, conta sintética):
- Gravei a Ameaça **Vidraceiro** e o Assassino **O Vidraceiro**, que usa
  a Ameaça.
- Em **Pacotes → + Criar pacote** (BRUTAL), marquei só o Assassino. O
  aviso mostrou "O Vidraceiro usa Vidraceiro (Ameaça)".
- **Incluir as que faltam** pôs a Ameaça no pacote ("2 de 40"), e o
  aviso sumiu.
- O aviso do lado da importação foi validado pelos testes do servidor,
  não na interface.

### Publicar a v9.34.0

**Servidor:** troque **`HomebrewPacotes.gs`** e crie uma versão nova da
implantação. **`setupRama()` não é necessário.**

**Site:** `js/pacotes-homebrew.js`, `js/paginas/homebrew-pacotes.js` e
`js/versao.js`.

### Etapa 2 concluída

Com esta versão, a Etapa 2 da especificação está completa. A próxima, a
Etapa 3, é a automação por sistema.

## v9.35.0 — Etapa 3, parte 1: ações Universais com recursos nativos

Até aqui, uma ação do Modelo Universal só rodava na ficha Universal, que
tem recursos com nome. Agora ela roda em qualquer ficha. O novo
`js/homebrew-recursos.js` traduz a ficha do sistema para a lista de
recursos que o motor das ações conhece e grava a mudança pelo caminho de
cada motor.

| Sistema | Recursos | Como grava |
|---|---|---|
| Universal | os da ficha (status) | o atual do recurso |
| Ordem Paranormal | PV, PE, SAN; PD com "Jogando sem Sanidade" | `ordem.recursos` |
| Ordem II | PV e PD | a operação do motor (com id) |
| Tormenta20 | PV e PM | a operação do motor (com id) |
| Malditos Goblins | Vitalidade | os ferimentos, pela operação (com id) |
| Vampiro | Vitalidade e Força de Vontade | perder vira dano Superficial; recuperar o tira (com id) |
| Oblívio | — | o Estresse é por região: fica com a mesa |
| BRUTAL | — | os Pontos de Tensão moram na mesa da Diretora |

Nada é ligado por nome parecido. Um recurso que a ficha não tem pelo
nome (como "Vida" numa ficha de Goblins), a pessoa escolhe na lista,
como já acontecia na ficha Universal. Onde não há recurso nativo, a
ficha diz o porquê, e o teste e os usos funcionam do mesmo jeito.

### Na ficha

- **Do Homebrew → Universal**: um item Universal **com ações** entra no
  painel **Ações Homebrew (Universal)** da ficha. O painel fica no fim
  da aba principal de Goblins, BRUTAL, Oblívio, Vampiro e Ordem II, e na
  aba Progressão de Tormenta20. Ele mostra os recursos de agora
  ("Vitalidade 0/2") e os botões das ações, com os usos restantes. Em
  edição, tem também o botão Tirar.
- Em Ordem e na ficha Universal, as ações continuam no inventário e
  agora usam os recursos nativos.
- **Teste com perícia nativa**: em Ordem e Tormenta20, antes de rolar, a
  ficha pergunta se a pessoa quer somar uma perícia (com o bônus de
  agora). É opcional.
- **Confirmação e reenvio**: rolar e desistir não gasta nada. O id da
  operação nasce com a janela. Confirmar de novo não grava duas vezes
  onde o motor tem id (Ordem II, Tormenta20, Goblins, Vampiro); nos
  outros, a janela só aplica uma vez.

### Validação da v9.35.0

**Automática.** O novo `testes/executar-homebrew-acoes.js` tem 22
verificações, uma ação em cada sistema:
- custo e efeito nos recursos nativos, e a gravação;
- a perícia somada ao teste;
- o recurso sem nome que vira Manual com escolha;
- o reenvio com o mesmo id;
- Oblívio e BRUTAL com o motivo, e o teste e os usos funcionando.

As outras suítes continuam verdes.

**Na interface** (servidor local, conta sintética):
- Gravei o item Universal **Tônico de Ervas**, com a ação "Beber"
  (recupera 2 de "Vida", 2 usos).
- Num goblin com 2 ferimentos, "Do Homebrew" adicionou o item. O painel
  da aba Goblin mostrou "Vitalidade 0/2" e "Beber (2/2)".
- Usei a ação. Como "Vida" não existe, a ficha pediu o recurso e
  ofereceu "Vitalidade (0/2)". A prévia mostrou "Vitalidade: 0 → 2" e
  "restam 1 de 2".
- Apliquei. A ficha relida do servidor tinha 0 ferimentos e 1 uso gasto.
- O texto do seletor ainda dizia que as ações ficam Manuais; corrigi.

### Publicar a v9.35.0

**Servidor:** nada muda.

**Site:**
- `js/homebrew-recursos.js` (novo);
- `js/homebrew-adaptadores.js`, `js/homebrew-versoes.js`,
  `js/paginas/homebrew-ficha.js`;
- `js/tormenta20/telas/ficha-t20.js`;
- `ficha/index.html`;
- `js/versao.js`.

### Etapa 3 depois da v9.35

Falta:
- o inventário de cobertura (tipo, editor, destino, automações e pontos
  manuais) e a matriz de regressão por sistema;
- a validação em celular e desktop, nos dois temas, com teclado.

## v9.36.0 — Etapa 3, parte 2: inventário de cobertura e matriz de regressão

### O inventário de cobertura

O novo **`docs/HOMEBREW-COBERTURA.md`** lista, por sistema, cada tipo e
subtipo do Homebrew com:
- o **editor** (de campos, de rituais ou próprio, por etapas);
- **onde entra na ficha** (Nativo, Manual ou fora da ficha);
- o **que entra e o que fica com a mesa**.

No fim, a tabela dos recursos nativos das ações Universais.

O documento é **gerado** pelos adaptadores (`js/homebrew-adaptadores.js`),
os mesmos que a interface usa: não tem como ficar desatualizado em
silêncio. Para escrever de novo:

    deno run --allow-read --allow-write=docs testes/executar-homebrew-matriz.js --gerar

### A matriz de regressão

O novo `testes/executar-homebrew-matriz.js` (40 verificações) passa por
**cada sistema e cada tipo/subtipo** e confere:
- que os tipos estruturais do adaptador são **os que o servidor aceita**
  (lidos do próprio `backend/Codigo.gs`), e que cada um está em
  `TIPOS_HOMEBREW` e nos pacotes;
- que cada tipo é lido como estrutural mesmo sem o modelo, no formato
  anterior;
- que **todo tipo diz o que entra** na ficha do sistema (Nativo ou
  Manual, sempre com o texto);
- que, em **outro sistema**, ele é incompatível, porque o R.A.M.A. não
  converte, e que Universal entra como Manual, com o texto;
- que o pacote aceita o tipo no próprio sistema e recusa em outro;
- que todo sistema tem adaptador de recursos para as ações Universais,
  e que só Oblívio e BRUTAL ficam sem, com o motivo.

### O que a matriz e o inventário acharam (corrigido)

- Os tipos novos das v9.27, v9.32 e v9.33 (Ficha de Conhecimento,
  Assassino, Ameaça, Apavoro, PokéPraga, Receita) eram lidos como
  **item** num registro sem modelo. Agora são estruturais.
- Três textos de destino estavam imprecisos:
  - o **Ritual** de Ordem dizia "entra nas habilidades da ficha": ele
    entra na **aba Rituais**;
  - um item **"Outro (narrativo)"** dizia "com as regras do sistema":
    entra como item narrativo;
  - a **Habilidade só de texto** dizia que o motor "só aplica habilidades
    do livro" (não é mais verdade): agora diz quais subtipos o motor
    aplica, como "Magia e Poder" em T20 ou "Poder de Disciplina" em
    Vampiro.

### Interface: celular, desktop, temas e teclado

Feito no servidor local, com os editores das versões novas (Ficha de
Conhecimento de Vampiro e Assassino de BRUTAL):
- **Celular (375 px)**: os editores cabem na largura, sem rolagem
  horizontal, com os botões fixos no rodapé.
- **Desktop (1280 px)**: o editor aparece com a revisão lateral.
- **Temas**: escuro com Legacy e claro com Modern20, legíveis e com o
  painel opaco.
- **Teclado**:
  - o Tab percorre os campos e os botões de nível até "Criar", com o
    contorno de foco visível;
  - o foco dá a volta dentro da janela, sem escapar para a página;
  - Esc fecha a janela (sem rascunho, sem pergunta).

### Validação da v9.36.0

- `testes/executar-homebrew-matriz.js`: 40 verificações;
- `testes/executar-homebrew-sistemas.js`: a verificação da Habilidade só
  de texto acompanha o texto novo.

As outras suítes continuam verdes.

### Publicar a v9.36.0

**Servidor:** nada muda.

**Site:** `js/homebrew-adaptadores.js`, `js/paginas/homebrew-ficha.js` e
`js/versao.js`.

### Etapa 3 depois da v9.36

Ainda faltam, dos critérios de aceitação:
- pacote privado entre duas contas na interface;
- pacote antigo e pacote Universal.

Os testes do servidor já cobrem os dois casos; falta passar por eles na
interface.
