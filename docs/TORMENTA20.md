# Tormenta20 — Jogo do Ano no R.A.M.A.

Fonte única: *Tormenta20 — Jogo do Ano* (Jambô, 2ª edição, 2ª impressão,
outubro de 2023). Toda página citada aqui e nos dados é a **página impressa**
(no PDF, página impressa + 6). A ficha oficial (2 páginas) orienta os campos e
a hierarquia da tela; quando ela diverge do livro, vale o livro. Esta edição usa
os atributos diretamente (sem "modificador de atributo") e mede carga em
**espaços**: os campos auxiliares da ficha em PDF (peso, "3x Força",
"Levantar até 10x Força") não viram uma segunda regra de cálculo.

Fora do escopo, de propósito: suplementos, edições anteriores e regras de
outros sistemas. Nenhum dado aqui mistura conteúdo de fora do Livro Básico.

**Textos.** Os catálogos guardam a mecânica (números, custos, execução,
alcance, duração, efeitos estruturados) e um resumo curto escrito para o
R.A.M.A., sempre com a página. O texto integral é o do livro: a ficha aponta a
página, não o reproduz.

## Onde mora cada coisa

| Arquivo | O quê |
|---|---|
| `js/tormenta20/dados.js` | Atributos e compra (Tabela 1-1), perícias e usos com CD, Ofícios, XP e treino, patamares, tamanhos, condições, situações de combate, manobras, descanso, limite de morte |
| `js/tormenta20/expressao.js` | Expressões dos efeitos (`"atr.car"`, `"nivel/2"`, dados) sem `eval` |
| `js/tormenta20/racas.js` | As 17 raças (p. 18–31), variantes (suraggel) e escolhas |
| `js/tormenta20/classes-a/b/c.js` | As 14 classes (p. 32–84): tabela de níveis, habilidades, poderes, caminhos e linhagens do Arcanista, escolhas do Druida, engenhocas e fórmulas do Inventor |
| `js/tormenta20/origens.js` | As 35 origens (p. 85–95) e a origem própria |
| `js/tormenta20/deuses.js` | As 20 divindades: devotos, energia, arma preferida, obrigações e restrições, poderes concedidos |
| `js/tormenta20/poderes.js` | Poderes gerais: combate, destino, magia, concedidos e da Tormenta (p. 124–137) |
| `js/tormenta20/equipamento.js` | Armas, munições, armaduras e escudos, itens gerais, alquímicos, melhorias (superiores), materiais especiais, dinheiro inicial (p. 138–167) |
| `js/tormenta20/magias.js` + `magias-1…5.js` | O motor de magia (aprimoramentos, truques, custos, limites) e as 198 magias arcanas, divinas e universais (p. 168–211) |
| `js/tormenta20/ameacas.js` + `ameacas-1…6.js` | As 80 ameaças (p. 280–316), ND de encontro, instâncias da mesa |
| `js/tormenta20/ameacas-7.js` | Armadilhas e perigos complexos, doenças, ambiente, Tabela 7-2 e o gerador de NPC (p. 317–323) |
| `js/tormenta20/parceiros.js` | Parceiros, graus, montarias e a variante de parceiros vulneráveis (p. 260–263) |
| `js/tormenta20/itens-magicos*.js` | XP de desafio, Tabela 8-1 e as tabelas de tesouro, encantos, itens específicos, poções e pergaminhos, acessórios, artefatos (p. 324–349) |
| `js/tormenta20/mesa-dados.js` | Ferramentas do mestre: atitudes, clima e terreno, viagem, perseguição, custo de vida, treinamento, desafios de busca (cap. 6) |
| `js/tormenta20/regras.js` | O motor (`RAMATormenta20`): ficha vazia, normalizar, cálculo com parcelas, acúmulo, condições, dano e cura, sangramento, testes e testes opostos, ataque e crítico, manobras, magias (inclusive metamagia), munição, engenhocas, progressão, descanso, recompensas idempotentes |
| `js/tormenta20/mesa.js` | A mesa (`RAMATormenta20Mesa`): combate, iniciativa e surpresa, ameaças independentes, dano e condições nas ameaças, manobra da ameaça, encontros, desafios, XP, tesouro idempotente, perigos complexos, tempo |
| `js/tormenta20/telas/` | `t20-comum.js` (valores com parcelas, rolagens, operações), `t20-criar.js` (criação em 8 passos), `ficha-t20.js` (bloco superior e abas), `campanha-t20.js` (a Mesa do Mestre e a vista do jogador) |
| `css/tormenta20.css`, `css/modern20/tormenta20.css` | Legacy e Modern20 |
| `backend/Tormenta20.gs` | `sistemaTormenta20()`: rotas, projeção, painel, estado da mesa; as operações validadas no servidor; o motor e a mesa copiados entre marcadores |
| `backend/Tormenta20Dados.gs` | Os catálogos copiados (o Apps Script não importa arquivos) |
| `testes/gerar-tormenta20-gs.js` | Copia `js/tormenta20/` para os dois `.gs` (rode a cada mudança no motor ou nos dados) |

## A ficha (`ficha.tormenta20`)

```
{
  versao: 1,
  metodo: "pontos" | "rolagem" | "livre",
  rolagens: [valores das seis rolagens já convertidos],
  atributosBase: { for, des, con, int, sab, car },     // sem raça: a raça entra no cálculo
  raca: { id, variante, atributos: [os +1 escolhidos], escolhas },
  origem: { id, beneficios: [{ tipo: "pericia"|"poder", id, escolhas: { oficio? } }], escolhas, propria },
  divindade: { id, energia, poderes: [{ id, escolhas }] } | null,
  niveis: [{ classe, escolhas }],                       // um por nível de personagem, em ordem
                                                        // escolhas do 1º: pericias, ou, oficios, int…
  periciasInt: ["luta", "oficio:alquimista", …],        // pela Inteligência
  poderes: [{ id, origem, escolhas }],                  // avulsos (fora da subida de nível)
  magias: [{ id, fonte: "classe:arcanista" | …, memorizada? }],
  oficios: ["carpinteiro", …],                          // conhecidos sem treino
  inventario: { itens: [{ id, ref, nome, quantidade, estado: mochila|vestido|empunhado|guardado,
                          mao, melhorias, material, encantos, magico, cargas, municao, … }], tibar },
  recursos: { pv, pm, pvRef, pmRef, pvTemp, pmTemp, naoLetal, sangrando, estavel },
  condicoes: [{ id, origem, duracao, rodadas }],
  ativos: [{ id, fonte, nome, duracao, sustentada, efeitos, categoria, alvo, magia?, engenhoca? }],
  usos: { "cena:…" | "dia:…": n }, situacoes: { chave: true },
  xp, idade, alinhamento, parceiros: [...], engenhocas: [...], formulas: [...],
  opcoes: { parceirosVulneraveis }, operacoes: [opId…], historico: [...]
}
```

Nada calculado é gravado: PV, PM, Defesa, perícias, ataques e manobras saem de
`calcular()` toda vez, com as parcelas. `pv`/`pm` são o estado atual; `pvRef` e
`pmRef` guardam o máximo em que o estado foi gravado, para que uma mudança de
Constituição suba máximo e atual juntos, preservando o dano sofrido. `null` é
"cheio". `operacoes` guarda os `opId` vindos da mesa (recompensa, dano,
descanso…): repetir não aplica de novo.

**Exportar e importar.** A importação apaga todo `id`. No bloco de Tormenta20,
`id` é quase sempre referência ao catálogo (raça, origem, magia, poder,
condição): ele atravessa como `idT20` e volta; itens, efeitos ativos,
engenhocas e parceiros ganham ids novos, com os vínculos refeitos, e o
registro de operações não atravessa (`js/validacao.js`).

## Efeitos

Habilidades, poderes, itens, magias, parceiros e condições falam a mesma língua:

| Efeito | Exemplo |
|---|---|
| `{ t: "bonus", alvo, valor }` | `alvo`: `defesa`, `atr.for`, `pericia.luta`, `pericias`, `resistencias`, `pv`, `pm`, `deslocamento`, `ataque`, `ataque.corpo`, `dano.corpo`, `margem`, `mult`, `manobra.derrubar`, `carga`, `vestidos` |
| `{ t: "pvNivel" / "pmNivel", valor, inicial }` | Duro como Pedra, Sangue Mágico |
| `{ t: "treino", pericia }` | perícia treinada (`oficio:<especialização>`) |
| `{ t: "prof", qual }` | marciais, exóticas, fogo, pesadas, escudos |
| `{ t: "deslocamento", tipo, valor }` / `{ t: "tamanho" }` / `{ t: "sentido" }` / `{ t: "tipo" }` | 12 m, escalada, Pequeno, visão no escuro, construto |
| `{ t: "rd", tipos, valor }` / `{ t: "imune", valor }` | Armadura Óssea, Criatura Artificial |
| `{ t: "magia", id, atributo, desconto }` / `cdMagia` / `descontoMagia` / `danoMagia` | Amiga das Plantas, linhagens, Arcano de Batalha |
| `{ t: "armaNatural" }` / `{ t: "atrAtaque" }` / `{ t: "atrPericia" }` | Chifres; Acuidade com Arma; Hynne em Atletismo |

`valor` aceita número ou expressão. `cond` marca o efeito situacional: aparece
na parcela como "(quando valer)" e só soma com a situação marcada na ficha.
Ações com custo (`acao`, `reacao`, `opcaoDeAtaque`) viram botões "Usar" com o
custo final (alquebrado, descontos, limite de PM da fonte).

**Acúmulo** (p. 226). Categoria por fonte: `habilidade` (raça, classe, origem,
poder), `item`, `magia`, `parceiro`, `ambiente`. Habilidades diferentes somam;
item, magia, parceiro e ambiente valem o maior dentro da categoria (e a pior
penalidade); condições valem a pior por grupo, e repetir uma condição pode
agravá-la (abalado → apavorado). Efeitos marcados `cumulativo` somam.

## Cobertura por capítulo

Legenda: **A** jogável e automatizado · **M** jogável com decisão da mesa (a
tela pede a decisão concreta ou mostra o resumo com a página) · **P**
pendente. Uma entrada só no Catálogo não conta como pronta quando a regra
deveria mudar a ficha ou a campanha. "Testado" aponta o teste que cobre o
bloco (`executar-tormenta20.js`, `tormenta20-backend.js`, `executar-catalogo.js`)
e o que foi conferido no navegador (servidor local, contas sintéticas).

| Cap. | Bloco | Estado | Notas |
|---|---|---|---|
| 1 | Compra por 10 pontos (Tabela 1-1) e 4d6 descartando o menor, conversão, refazer abaixo de 6, distribuição (p. 17) | **A** | Testado; criação conferida no navegador |
| 1 | 17 raças, variantes e escolhas (p. 18–31) | **A** | 54 de 55 habilidades com efeito; as alternativas do golem e do osteon que dependem de ficção ficam com a mesa (**M**) |
| 1 | 14 classes: PV/PM, perícias, proficiências, tabela 1–20 (p. 32–84) | **A** | Multiclasse sem repetir PV, perícias e proficiências iniciais (testado) |
| 1 | Habilidades de classe | **A/M** | 49 de 91 com efeito ou ação estruturados; as demais mostram o resumo com a página e ficam com a mesa |
| 1 | Poderes de classe | **A/M** | 156 de 296 com efeito, ação ou escolha; o resto é situacional e fica com a mesa (requisitos sempre conferidos) |
| 1 | Arcanista (caminhos, linhagens, familiares), Druida, Inventor (engenhocas, fórmulas) | **A** | Engenhocas: fabricar e ativar com CD, +5 por ativação, aprimoramentos até Int, penalidade de armadura, enguiçar (testado) |
| 1 | 35 origens e origem própria (p. 85–95) | **A/M** | Benefícios, itens e Ofício especializado automáticos; poderes únicos são texto (**M**) |
| 1 | 20 divindades: devotos, obrigações, poderes concedidos (p. 96–105) | **A/M** | Restrições de devoto checadas; poderes concedidos com efeito; obrigações e restrições mostradas, e cumpri-las é decisão da mesa |
| 1 | Níveis 1–20, XP, patamares, aumento de atributo (p. 30–31, 106) | **A** | Testado |
| 1 | PV, PM, Defesa, deslocamento, tamanho, carga em espaços, sobrecarga (p. 106–111, 157) | **A** | Parcelas ao expandir; Con recalcula PV preservando o dano (testado) |
| 2 | Perícias: ½ nível + atributo + treino (+2/+4/+6), só treinadas, penalidade de armadura (p. 114) | **A** | Testado |
| 2 | Ofício por especialização (p. 121) | **A** | Classe, origem, Versátil e Inteligência pedem a especialização; Ofícios inventados com o mestre (lista do livro) têm usos combinados na mesa |
| 2 | Usos de perícia com rolagem e CD (p. 114–123) | **A/M** | CD fixa rola automática; testes opostos pedem o valor do oponente |
| 2 | Poderes gerais (p. 124–137) | **A/M** | 125 de 162 com efeito; Magia Acelerada, Ampliada e Discreta viram aprimoramentos de qualquer magia (testado) |
| 3 | Armas, munições, armaduras, escudos, itens, alquímicos, superiores, materiais (p. 138–167) | **A** | Mãos, vestidos (limite), proficiência, Defesa, penalidade, passos de dano, margem e multiplicador |
| 3 | Equipamento inicial (p. 140) | **A** | Mochila, saco de dormir, traje, arma simples, marcial se proficiente, armadura (brunea se pesadas, nenhuma para arcanista), escudo leve, T$ 4d6 |
| 3 | Compra, venda (metade), moedas | **A** | |
| 3 | Fabricação por Ofício: CD, matéria-prima (1/3), tempo (p. 121) | **A/M** | Fabricar duas unidades de um consumível com –5 fica com a mesa |
| 3 | Munição: um por disparo, pacotes de 20 | **A** | Ficha e servidor (testado); recuperar munição após o combate fica com a mesa |
| 4 | 198 magias, aprimoramentos, truques, "muda" que não acumula, "requer" círculo (p. 168–211) | **A** | Prévia com custo, execução, alcance, área/alvo, resistência e efeito antes de confirmar (testado) |
| 4 | Limite de PM por fonte, CD pelo atributo-chave certo, magias conhecidas por fonte (p. 169–170) | **A** | Testado |
| 4 | Sustentadas (uma por vez; Fluxo de Mana, duas), cobrança no início do turno (p. 224) | **A** | Testado, inclusive depois de reabrir a ficha |
| 4 | Testes para lançar: armadura (Misticismo), condição ruim/terrível, concentração por dano (p. 172) | **A** | |
| 4 | Dissipar e efeitos em outros alvos | **M** | A ficha encerra os próprios efeitos; o efeito no alvo é aplicado pela mesa (nas ameaças, o servidor aplica dano, resistência e condição) |
| 5 | 1d20 + modificador, CD, 20 e 1 naturais, testes opostos com desempate (p. 220–221) | **A** | Testado |
| 5 | Testes estendidos e ajuda (p. 221) | **M** | A tabela de sucessos aparece; a contagem é da mesa |
| 5 | Iniciativa, surpresa, rodadas, turnos, ordem (p. 230) | **A** | Mesa: iniciativa dos inimigos em grupo, surpresa no início, próxima vez |
| 5 | Ações padrão/movimento/completa/livre/reação, ações preparadas | **M** | Cada habilidade mostra a execução; a economia do turno não é imposta |
| 5 | Manobras: agarrar, derrubar, desarmar, empurrar, quebrar (p. 234) | **A** | Teste oposto com tamanho e poderes; condição aplicada (jogador contra ameaça e ameaça contra jogador, no servidor) (testado) |
| 5 | Situações: caído, elevado, flanqueando, cobertura, camuflagem, alcance (p. 233) | **M** | A ficha soma o modificador quando a pessoa marca a situação |
| 5 | Ataque: Defesa antes do crítico; crítico multiplica só os dados da arma (p. 231) | **A** | Testado com dado extra |
| 5 | Dano, RD, imunidade, vulnerabilidade, PV temporários, não letal, cura (p. 232) | **A** | |
| 5 | Inconsciente, sangrando (Con CD 15), estável, morte em –10 ou –½ PV (p. 236) | **A** | Testado |
| 5 | Condições: 35, sobreposição, agravamento, expiração por rodada e cena (p. 394) | **A** | |
| 6 | Parceiros, graus, montarias, parceiros vulneráveis (p. 260–263) | **A** | Bônus entram na ficha até o limite do patamar |
| 6 | Descanso: ruim, normal, confortável, luxuoso (p. 106) | **A** | Testado |
| 6 | NPCs (Tabela 7-2 e gerador), atitudes, ambientes, viagem, perseguição, custo de vida, treinamento, busca | **A/M** | Geradores e tabelas na Mesa; o desfecho narrativo é da mesa |
| 7 | 80 ameaças com ND fracionário, ataques, habilidades, magias, defesas (p. 280–316) | **A** | Catálogo, cópia para o Homebrew, ocorrência independente no combate (navegador) |
| 7 | ND de encontro (p. 282) | **A/M** | Grupos iguais pela regra; criaturas diferentes: aproximação do RAMA, marcada na tela |
| 7 | Armadilhas e perigos complexos (p. 317–321) | **A** | Perigo complexo rodada a rodada na Mesa |
| 7 | Doenças e ambiente (p. 317–319) | **M** | Listados na Mesa com via, CD e estágios; o teste é a Fortitude da ficha |
| 8 | XP por desafio, empate, derrota, ND baixo demais, avanço por marcos (p. 324–326) | **A** | Prévia editável, distribuição uma vez só (navegador e servidor) |
| 8 | Tesouro: Tabela 8-1, metade/dobro, riquezas, itens (p. 328–332) | **A** | Rolagem idempotente por pedido (testado) |
| 8 | Encantos de arma e armadura (p. 333–339) | **A/M** | 25 de 53 com efeito na ficha; o resto é situacional |
| 8 | Itens específicos, poções, pergaminhos, acessórios, artefatos (p. 336–349) | **A/M** | 76 de 101 com efeito estruturado; poções, óleos, granadas e alquímicos gastam uma unidade ao usar; pergaminhos pela regra da p. 341, com a mesa |
| 9 | Arton (p. 350–391) | **P** | Não há material de cenário no RAMA ainda (só referências pontuais em ameaças e magias) |

## Lacunas

- **Tabela 8-5 (p. 332)** imprime "Canalizador" duas vezes (05–19 e 70–85) e
  não traz "Poderoso". O RAMA segue o livro como impresso.
- **Caçador (p. 50):** a Tabela 1-3 (p. 32) diz "mais 4" perícias e a classe
  diz "mais 6". O RAMA segue a descrição da classe (6).
- **ND de encontro com criaturas diferentes (p. 282):** o livro não dá
  fórmula. O RAMA aplica a mesma regra de dobra (cada +2 de ND vale o dobro de
  criaturas) e marca o resultado como aproximado.
- **Papel de combate (solo, lacaio, especial):** onde o ícone do livro não
  sai no texto, o RAMA registrou o papel pela descrição da p. 283.
- **Golem e osteon:** as "alternativas" das raças que dependem de ficção
  (p. 27 e 29) pedem a decisão da mesa.
- **Habilidades e poderes só com texto:** 37 poderes gerais, 140 poderes de
  classe, 42 habilidades de classe e 28 encantos mostram o resumo com a página
  sem efeito na ficha. A maior parte é situacional ("uma vez por rodada,
  quando…"); os que mudam número fixo devem ganhar efeito estruturado. Entre
  eles, aprimoramentos de outras habilidades (Raio Elemental, Fascinar em
  Massa, Canalizar Amplo) e bônus de grupo (Missa: Escudo Divino, Oficina de
  Campo).
- **Invenção Potente (Inventor):** o dado (+1 PM, +2 na CD) existe, mas a
  ativação da engenhoca ainda não oferece a opção.
- **Aharadak (p. 96):** a rolagem de 1d6 no início de cada cena de ação está
  nos dados da divindade, mas a ficha ainda não a faz sozinha.
- **Fabricar duas unidades (p. 121):** a opção de –5 para dois consumíveis
  não está no diálogo de fabricação.
- **Capítulo 9 (Arton):** pendente.
