# Ordem Paranormal RPG II — Experimental no R.A.M.A. — v9.0

Sistema **à parte**, id `ordem2`. Não é DLC, suplemento nem migração de
`ordem` (Ordem Paranormal, 1ª edição): nenhuma ficha, campanha, suplemento ou
importador de Ordem I é lido, convertido ou alterado por ele, e o conversor do
CRIS continua sendo só de Ordem I.

## Fontes

| Sigla | Material | Usado |
|---|---|---|
| Alpha | *Ordem Paranormal RPG 2 — Playtest Alpha* | pp. 14–26 (ficha, perícias, testes, investigação, desafios de acesso, conflito simplificado); ficha de Alan na p. 15 |
| Alpha Ato II | ZIP de extras do Alpha (ZIP 01) | fichas JPG de Amanda, Antônio, Heitor, Raven e Val (nível 6) e os históricos (idade) |
| Beta | *Ordem 2 — Playtest Beta, Missões 1 e 2* | p. 2 (apresentação), pp. 6–25 (ficha, perícias, testes, investigação, desafios, combate, dano, lesões, traumas, pavor, armadura, relações); ficha de Rhiona na p. 7 |
| Beta (fichas) | ZIPs de extras do Beta (Missão 1 = ZIP 03, Missão 2 elite = ZIP 04) | fichas e versos dos oito personagens (nível 3) |

As páginas citadas são as impressas no rodapé (iguais às do PDF nos dois
playtests). Nenhum texto do livro é copiado: o catálogo guarda números, nomes e
resumos próprios, com a página.

A capa do seletor, da campanha e do Catálogo é a arte PNG fornecida
(`assets/sistemas/ordem2-capa.png`, cópia byte a byte), com variantes WebP **sem
perda** (`ordem2-capa.webp`, mesmas dimensões, e `ordem2-capa-pequena.webp`,
160 px). A arte é 9:16; o volume de capa do R.A.M.A. é 2:3, então Ordem II usa
encaixe `contain` (`capaEncaixe: "conter"` no registro): a imagem aparece
inteira, sem corte nem deformação, com o fundo da própria arte completando o
espaço.

## Onde mora cada coisa

| Arquivo | O quê |
|---|---|
| `js/ordem2/catalogo.js` | Perfis de regras, ambientações, atributos, as duas listas de perícias, perfis, ocupações/vocações, habilidades (com o `motor` de cada uma), graus de relação, tabelas (falha crítica, lesões, traumas), fases e ações de combate, minijogos, o bloco paranormal (só consulta), as 14 fichas prontas e o inventário de **divergências** e **decisões** |
| `js/ordem2/regras.js` | A ficha (`RAMAOrdem2`): schema do bloco, normalização, dados efetivos (base + efeitos + itens), PV/PD máximos efetivos, armadura, cópia de preset, criação guiada, resumo da mesa |
| `js/ordem2/motor.js` | O motor puro (`RAMAOrdem2Motor`): montar/rolar/resolver o teste, pavor, crítico, RA/RB, oposto, ataque mútuo, modificadores de ataque, dano, armadura, a máquina de lesão/trauma, fim de rodada/cena, minijogos |
| `js/ordem2/mesa.js` | A mesa (`RAMAOrdem2Mesa`): estado da campanha e `aplicar(estado, fichas, op, papel, rolar)` — a porta única de toda ação; a vista do jogador |
| `js/ordem2/telas/` | `o2-comum.js` (dados, resultado, diálogo de teste e de pós-rolagem, o jogo da ficha), `o2-criar.js` (ficha pronta, livre, guiada), `ficha-o2.js` (a ficha), `campanha-o2.js` (a mesa) |
| `backend/Ordem2.gs` | `sistemaOrdem2()`, `ler_ordem2`, `ordem2_operar`; o motor copiado entre marcadores por `testes/gerar-ordem2-gs.js` |
| `css/ordem2.css`, `css/modern20/ordem2.css` | Ficha, mesa, criação e diálogos, nos tokens do tema |

## Fato, inferência e proposta

**Fatos expressos** (estão nas fontes, como estão): atributos e perícias de d4 a
d12 (d20 só com efeito paranormal); teste = atributo + perícia contra DT 7;
máximo de 4 dados rolados e 3 somados; crítico com dois iguais ≥ 6; falha
crítica com todos 1 e a tabela d8; RA/RB pelo resultado; ajuda (d6/d8 +1 passo,
d10/d12 +2, d4 não ajuda); as duas listas de perícias e os atributos-base; as
ações de investigação de cada playtest; os desafios de acesso; o conflito
simplificado do Alpha; as três fases do Beta, ações, manobras, alcance,
cobertura, ocultação, caído, disparo em corpo a corpo, vantagem tática; dano RA
+ arma e as duas maiores no crítico do Beta; dano físico/emocional, não letal,
lesões, traumas, moribundo, morte lenta; pavor; pontos de armadura; relações e
graus. As fichas prontas (atributos, perícias, PV, PD, habilidades,
equipamento, relações, idade) são copiadas como impressas.

**Inferências** (o R.A.M.A. decide porque a fonte não fecha, e registra):
ver a tabela de divergências — Executor do Alpha com o Ímpeto de 3 espaços;
Laceração reduz o máximo de PV; Chaga reduz o máximo de PD enquanto não curada;
o escudo de Sorcha reduz pela RB dela; uma dose de cada preparado de Muirenn;
modificadores "−1 em Percepção" são numéricos; habilidade de ocupação/vocação
documentada só onde a ficha só tem as duas de criação (Alan/Cientista,
Muirenn/Herborista, Malik/Explorador).

**Propostas de mesa** (não são regra publicada): a **criação guiada** inteira
(d6 nos três atributos com 2 passos livres até d10; perícias d4 com 8 passos,
teto d8 por entrada; 16 PV e 12 PD editáveis como referência inicial de mesa
para teste) e as **decisões de implementação** (`RAMAOrdem2Catalogo.DECISOES`,
abaixo). A tela marca a guiada como "experimental".

## Divergências — fonte, comportamento e teste

| Divergência | Fontes | O R.A.M.A. adota | Teste que fixa |
|---|---|---|---|
| Compartilhar: o texto pede Pesquisar (DT 10); a tabela-resumo diz Intuição; o Beta não tem Pesquisar | Alpha p. 23; Beta p. 15 | Vale o texto: Pesquisar no Alpha, Inspecionar (a mesma descrição, p. 9) no Beta; o Mestre pode trocar a perícia ao aprovar | `executar-ordem2`: "Compartilhar usa a perícia de pesquisa do perfil"; "Compartilhar: o aliado testa Pesquisar no Alpha"; "Compartilhar no Beta usa Inspecionar" |
| Bruxaria (lista) × Ocultismo (fichas impressas) | Beta p. 9; fichas Beta | Uma chave (`ocultismo`), rótulo pela ambientação; o preset guarda o rótulo impresso | "ocultismo é UMA chave"; "rótulo Bruxaria na Vigília" |
| Metalurgia (lista) × Ofício / Ofício (Metalurgia) (fichas) | Beta p. 9; fichas Beta | Metalurgia, com Ofício como alias; a especialização escrita fica | "Ofício é alias de Metalurgia"; "Ofício (Metalurgia) d8 preservado" |
| Coluna de atributo-base impressa desalinhada (Sira e Sorcha: Intuição/Físico, Luta/Mente, Percepção/Emoção; Cavan: sete linhas) | Fichas Beta | O motor usa o atributo-base da lista (p. 9). O preset guarda o impresso; a prévia e a ficha mostram a diferença. O Mestre troca o atributo de um teste quando quiser | "atributo impresso divergente não muda o atributo-base" |
| Relações das fichas com rótulos livres (Confiança, Amizade, Neutro…) × graus Afinidade/Vínculo/Devoção | Beta pp. 24–25; fichas Beta | O grau não é deduzido do rótulo; só o Vínculo e a Afinidade de Cormac viram grau. Sem grau, invocar pede a escolha | "rótulo livre não vira grau"; "relação sem grau não é invocada" |
| Três Ímpetos: 3 espaços (Alan, Raven), 5 com +d10 e ação extra (Heitor), 5 que esvaziam no fim da cena (Beta) | Alpha p. 15; Ato II; fichas Beta | Cada ficha usa a sua; Executor novo do Alpha recebe a de 3 espaços (inferência) | "as três versões de Ímpeto" (grupo Fichas prontas e Habilidades) |
| Prontidão: Alpha (Val) = rodada antecipada por 3 PD; Beta = rolar de novo por 2 PD (Antecipação Tática = rodada por 2 PD) | Ato II; fichas Beta | Cada ficha usa a sua | "Val 18/32 com a Prontidão Alpha"; "Val: Prontidão Alpha no início do conflito" |
| Foco Mental de Alan (2 PD/+d4) × de Amanda (4 PD/+d8) | Alpha p. 15; Ato II | Parâmetros por ficha | "Foco Mental de Alan 2 PD/+d4 e de Amanda 4 PD/+d8" |
| "Teste de morte" (moribundo) × "teste de lesão" | Beta pp. 21–22 | O mesmo teste na máquina de estados de lesão | "testa no fim da rodada seguinte, DT 10 (o rótulo teste de morte é o de lesão)" |
| Não letal: "+1d6 no teste de morte" e "2d20 no ferimento grave" | Beta p. 23 | +d6 no teste de lesão e 2d20 (o maior) na tabela de lesões | "não letal anotado à parte; zero pela soma → +d6 e 2d20" |
| +1 por patamar no d20 de lesão/trauma; patamares não definidos | Beta pp. 22–23 | Bônus só com patamar informado (padrão +0) | "patamar não informado: +0"; "patamar informado (elite): +2" |
| Laceração Profunda "perde 2 PV" (permanente, acumula); Chaga da Alma "perde 2 PD" (até curar) | Beta pp. 22–23 | Inferência: máximos efetivos −2 | "falha: d20 na tabela → 10 Laceração Profunda (máx. PV −2)"; "duplicata de Laceração acumula" |
| "−1 em Percepção", "−2 em Vigor" num sistema de passos | Beta pp. 22–23 | Modificador numérico no total | "modificador numérico: −1 em Percepção (Sem Olho)" |
| Contador de zero de PV/PD: "+3 por teste já realizado" (Alpha) × "na cena" (Beta) | Alpha p. 26; Beta pp. 21, 23 | Beta zera no fim da cena; Alpha mantém até o Mestre zerar | "no Alpha o contador NÃO zera no fim da cena"; "fim da cena … contadores de cena zeram" |
| A p. 12 diz que a ordem de combate virá depois; a p. 18 define; citam "fase tática" (p. 18) e "fase de suporte" (p. 24) | Beta pp. 12, 18, 24 | Três fases; tática e suporte = Fase Geral; ordem configurável | "três fases por padrão"; "a ordem das fases é configurável" |
| Caído: p. 21 (corpo a corpo +1 passo, distância DT +3) × p. 24 ("ataques" +1 passo) | Beta pp. 21, 24 | Vale a p. 21 | "alvo caído: +1 passo corpo a corpo, DT +3 à distância" |
| Ajuda remete à "página 20" (do Alpha) | Beta p. 11 | Passos pela p. 12 do Beta | — |
| Escudo de Sorcha: "reduz a sua rolagem baixa do dano recebido" | Ficha de Sorcha | Inferência: o dano cai pela RB de Sorcha naquele teste | lógica em `golpe` (mesa.js) |
| Arsenal de Herborista sem quantidade | Ficha de Muirenn | Inferência: uma dose de cada, editável | — |
| Rodapé de Herança fala em "Diarmaid" | Ficha de Cormac | Só registrado | — |
| Alan: Cientista na ficha × arqueólogo na missão | Alpha pp. 15, 62 | Vale a ficha | "presets conferidos: Alan é Cientista" |

## Decisões de implementação (não são regras publicadas)

- **Quatro dados:** a soma sugerida é a dos três maiores; a pessoa pode
  escolher outros três (Alpha p. 20 e Beta p. 12 não dizem quais).
- **Sobreviventes:** crítico, RA e RB leem os dados de teste que sobraram
  depois do pavor; a escolha dos três afeta só a soma. O dado de pavor nunca
  entra no crítico. Sem dado sobrando: falha crítica (Beta p. 24, expresso).
- **Pavor:** controlar não desce abaixo de d4 (o efeito termina só com o
  resultado 1 ou pelo Mestre); abraçar converte o dado em bônus **só naquele
  teste** — o pavor continua nos seguintes. O Mestre ajusta o dado à mão.
- **Ímpeto** (+d4/+d10) entra antes da rolagem.
- **Prontidão fora de rodadas:** "uma vez por rodada" vale uma vez por teste.
  A Prontidão de um **aliado** só segura um teste quando quem rolou marcou
  "esperar reações" ou em combate (a fase espera o Mestre aplicar).
- **Passo sem alvo prescrito** (ajuda, Instinto de Sobrevivência, situação): a
  tela pergunta (padrão: o dado de perícia) e registra a escolha.
- **Armadura:** escolha de quem joga, uma por ocorrência, marcada ao aplicar o
  dano (preferência por participante no combate; NPC usa sempre).
- **Examinar não tem DT:** compara com as linhas do quadro; sem "falha", o
  Ímpeto não enche.
- **Perder 1 PD por Examinar sem novidade** é custo, não dano emocional externo
  (não dispara trauma).
- **Plano Estratégico:** os dados vão para uma reserva comum do grupo, gasta em
  quaisquer testes até o fim da cena.

## A ficha (`ficha.ordem2`, schema do bloco 1; ficha schema 35)

`versao`, `perfilRegras` (`alpha-contemporaneo` | `beta-vigilia`, fixo na
ficha), `ambientacao`, `modoCriacao` (`pronta` | `livre` | `guiada`),
`procedencia` (preset, nome, fonte, página, **versão dos dados**, data da cópia,
atributos impressos), `escolhas` (o que a guiada distribuiu e se PV/PD foram
editados), `perfil`, `ocupacao`, `nivel` (1–10), `patamar`, narrativa (`idade`,
`resumo`, `historia`, `aparencia`), `base` (**dados-base**: atributos e
perícias com especialização, rótulo e atributo impressos), `recursos` (PV e PD
máximo/atual, não letal anotado à parte, armadura gasta), `habilidades` (ref do
catálogo, parâmetros da ficha e estado: espaços, marcadores, reserva,
indisponível), `itens`, `relacoes` (rótulo, grau, ficha ligada, missão em que
foi usada), `efeitos` (**separados da base**, com expiração: teste, rodada,
cena, missão, permanente), `estado` (condições, lesões, traumas, pavor,
contadores, pendentes, reservas, ação extra, perda de ação, usos, missão
local), `historico` (consequências graves, com correções do Mestre marcadas),
`local` (a mesa local de quem joga sem campanha) e `operacoes`.

Nada é recalculado por fórmula: PV e PD de uma ficha pronta são os impressos.
Quando os dados de um playtest mudarem (`VERSAO_DADOS`), a ficha copiada **não**
é atualizada — a tela só avisa.

## A mesa (`CAMPANHA_ORDEM2`)

Uma linha por campanha (`campanhaId`, `atualizadoEm`, `rev`, `opsJson`,
`dadosJson`). `dadosJson`: perfil e ambientação da campanha, missão e cena,
combate (participantes, NPCs com bloco próprio, ordem das fases, fase, etapa,
declarações, ações por rodada, antecipados, miras, fintas, quem lutou com
quem), investigação (pontos com descrição pública, pistas por perícia/limiar,
contexto e nota privada; descobertas por personagem; travas; solicitações),
pedidos de teste, ajudas, testes (com as escolhas pós-rolagem), reserva do
grupo, rolagens e registros (público e privado).

PV, PD e o estado de cada personagem moram na **ficha**: o que a mesa muda numa
ficha leva o `opId` para dentro do bloco (`operacoes`). Repetir a operação
(clique duplo, reconexão, outra aba) não cobra custo nem aplica dano de novo.
Configurações (`configurar`, pontos de interesse, ordem das fases) levam `rev`.

O perfil de regras é fixo na campanha e em cada ficha; uma ficha de outro
perfil recebe um aviso, nunca é convertida. Trocar o sistema da campanha não
apaga a linha: voltar a Ordem II devolve tudo como estava.

## Cobertura

| Regra (página) | No R.A.M.A. |
|---|---|
| Ficha (Alpha pp. 14–16; Beta pp. 6–8) | Topo: retrato, nome, perfil · ocupação/vocação · nível e a variante; faixa de recursos (atributos, PV, PD, armadura, pavor, condições) e, no celular, a mini-faixa fixa no rodapé |
| Perícias (Alpha p. 17; Beta p. 9) | Uma linha por perícia: dado, atributo-base e o botão de teste; Aptidão com especializações; rótulos impressos e divergências com ⓘ |
| Testes (Alpha pp. 18–20; Beta pp. 10–12) | Simples, oposto, estendido (pontuação = RA ou duas maiores no crítico do Beta) e minijogos; faces, soma, RA/RB, anulados, fora da soma, passos e fontes escritos |
| Críticos e falha crítica | Sucesso automático; investigação: informação adicional (Alpha); falha crítica com a tabela d8 a cargo do Mestre |
| Ajuda e Mentoria | Ação do ajudante; passos pela perícia; Mentoria testa DT 7 e oferece a troca do dado; relação dá +dX na ajuda |
| Análise, Ímpeto, Prontidão, Avaliação, Foco Mental, Olhar Infalível, Sorrateiro, Linha de Tiro, Estoico, Para Bellum, Técnica Medicinal, Varredura Ampla, Esquiva, Espectro, Arsenal, Curandeiro, Guardiã, Instinto de Sobrevivência, Plano Estratégico, Leitura de Combate, Segredo do Aço, Ímpeto Fervilhante, Amor pela Descoberta, Incansável, Antecipação Tática | Automatizadas com janela (antes/depois/ação/reação/início), custo, limite e expiração; Herança é narrativa |
| Investigação (Alpha pp. 21–23; Beta pp. 13–15) | Pontos com descrição pública, pistas por perícia/limiar e nota privada; passiva pela face nominal; Examinar (−1 PD sem novidade); Observar (Beta); Interagir no ramo certo de cada perfil; Recapitular e Compartilhar com aprovação, DT 10 e trava |
| Desafios de acesso (Alpha pp. 24–25; Beta pp. 16–17) | Equilíbrio na ficha; tentativas de Destrancar pelo Crime; Arrombar, Alcançar, Sustentar e Hack como consulta e teste |
| Combate Beta (pp. 18–21) | Fases (configuráveis), uma ação por rodada, ações livres, preparar; simultaneidade por fase; ataque mútuo oposto; manobras; alcance, cobertura, ocultação, caído, disparo em corpo a corpo, vantagem tática, finta, mira; dano RA + arma |
| Conflito simplificado (Alpha p. 26) | Oposto de Luta, RA/RB, esquiva +d6, agressores extras DT 7; zero de PV/PD pelos testes da p. 26 |
| Dano, armadura, lesões, traumas (Beta pp. 21–24) | Físico/emocional, não letal anotado, armadura −10 por ocorrência sem recuperar, máquina de lesão (moribundo, morte lenta, duplicatas, Laceração), traumas (externo × gasto voluntário), fim de cena, histórico e correção do Mestre |
| Pavor (Beta p. 24) | d6 separado, anula menores, 1 encerra, reaplicar +1 passo, controlar e abraçar |
| Relações (Beta pp. 24–25) | Graus, uma invocação por relação por missão (nova missão renova), +dX no teste ou na ajuda, motivar 2d4/2d6 PD (ficha ligada), ação extra na Devoção |
| Paranormal | Só consulta (etapa 3): nenhum botão de conjurar |

## Validação feita

- `testes/executar-ordem2.js` — o motor e a mesa com dados combinados (166
  verificações): presets conferidos (Rhiona 22/12 e Martelo RA+3; Val 18/32 com
  a Prontidão Alpha; Executores Alan, Heitor e Muirenn), 6/6 crítico com DT 30,
  1/1 falha crítica, RA/RB 6/3, quatro dados com três somados, pavor [7,2] vs 4
  e [3,1] vs 5, empate de ataque, simultaneidade, zero de PV/PD nos dois
  perfis, armadura, resgate de uso por missão.
- `testes/ordem2-backend.js` (em `executar-backend.js`) — uma sessão curta pelo
  servidor simulado: campanha, rev, vista sem soluções, investigação com custo
  de PD, combate com dano gravado na ficha, recarga, repetição do mesmo `opId`
  sem duplicar, papéis e troca de sistema.
- `testes/casos.js` — a ficha no núcleo, exportar/importar, o cartão da mesa.

## Publicar

Site: `js/ordem2/`, `css/ordem2.css`, `css/modern20/ordem2.css`,
`assets/sistemas/ordem2-capa*.{png,webp}` e as páginas `personagens/`, `ficha/`,
`campanha/`, `catalogo/`, mais os arquivos de núcleo alterados (ver o
changelog). Servidor: crie o arquivo **Ordem2** com `backend/Ordem2.gs`, troque
`Sistemas.gs`, `Dados.gs` e `Campanhas.gs`, rode **`setupRama()`** (cria
`CAMPANHA_ORDEM2`) e crie uma versão nova da implantação.
