# Homebrew nativo por sistema e Modelo Universal

A especificação ("Homebrew nativo por sistema e Homebrew Universal") se
organiza em três etapas.

| Etapa | Situação |
|---|---|
| **1 — Estrutura e compatibilidade** | entregue na **v9.7.0** |
| **2 — Tipos estruturais e elementos** | pendente |
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
| Ordem I | **Elemento, Classe, Origem, Trilha** | — | — | — | **Etapa 2** |
| **Ordem II** | Item: arma, proteção, consumível, equipamento (passos em perícia), outro | adaptador | inventário (Do Homebrew) | **N**: RA + dano, armadura, passos | — |
| Ordem II | Habilidade, Poder, Ritual (experimental) | adaptador | habilidades (habilidade própria) | **C** (texto) | efeitos estruturados: **Etapa 3** |
| Ordem II | Ameaça | o de sempre | mesa de Ordem II | **N** | Perfil e Ocupação: **Etapa 2** |
| **Tormenta20** | Item: arma, armadura, escudo, vestuário, ferramenta, alquímico, esotérico, aventura, alimentação, munição, outro | adaptador (preço, espaços, proficiência, empunhadura, dano, margem, multiplicador, tipo, alcance, munição, bônus de perícia) | inventário (Do Homebrew), como `personalizado` | **N**: ataque calculado, Defesa e penalidade, bônus de perícia (`efeitos`), espaços | melhorias e encantos (pela ficha, como antes) |
| Tormenta20 | Habilidade: magia (círculo, escola, execução…), poder, habilidade | adaptador | anotações | **Ma** | o motor só aplica poderes e magias do livro: **Etapa 2** |
| Tormenta20 | Ameaça | o de sempre | mesa de T20 | **N** | Raça, Origem, Classe e Divindade: **Etapa 2** |
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
- **T20**: Raça, Origem, Classe e Divindade selecionáveis na criação e na
  progressão.
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
