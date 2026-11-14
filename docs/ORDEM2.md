# Ordem Paranormal RPG II — Experimental no R.A.M.A. — v9.0 e v9.1

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

## Etapa 2 — os procedimentos das missões (v9.1)

O mesmo sistema `ordem2` (id, regras de Ordem I e resultados já salvos
intocados). A meta: conduzir pelo R.A.M.A. os procedimentos jogáveis do Alpha
(Atos I e II) e das duas missões do Beta. **O Mestre decide narrativa e
revelações; o site resolve contadores, testes e efeitos.**

### Fontes desta etapa

| Lote | Páginas | O que virou |
|---|---|---|
| Alpha — investigação e acesso | pp. 21–25 | quadro (pontos, perícias, limiares, Examinar, Interagir, Recapitular, Compartilhar), destrancar, arrombar, hack técnico e social, alcançar, sustentar |
| Alpha — Ato I | pp. 28–64 | cena `ato1` do pacote: 29 pontos (pertences, porão, sala secreta), 19 desafios, itens, tabela da maldição, efeitos do Ídolo e do freezer, roteiro |
| Alpha — ferramentas | pp. 65–70, 74–76 | `FERRAMENTAS` (cargas, modo de uso), laboratório, rádio, laser por ambiente, EMF, compêndio |
| Alpha — Ato II e sobrecarga | pp. 72–77 | cena `ato2`: preset exato da sobrecarga do porão, ferramentas por ponto |
| Alpha — cena, pontos e desfecho | pp. 78–102 | os 25 pontos do Ato II com o setor de ferramentas, a resposta do caso (só no pacote) |
| Compendium (ZIP do Ato II) | pp. 3–12 | as cinco manifestações e os sinais por elemento × ferramenta (no pacote; consulta só de quem carrega e de quem ele permitir) |
| Beta — investigação e acesso | pp. 13–17 | Investigar/Observar/Examinar, equilíbrio (2d10 + d4), alcançar e sustentar |
| Beta — Missão 1 | pp. 28–49 | cenas `afogados` e `aughisk` (enxurrada = perseguição, ilhota, confronto com ondas) |
| Beta — furtividade e travessias | pp. 50–59 | cena `mata`: esconderijo, bosque, rio (tronco = equilíbrio), encosta, runa de Brenna |
| Beta — gruta | pp. 60–67 | cena `gruta`: enigmas, runas, baú, nicho, escadaria, monólito |
| Beta — combate e ondas | pp. 68–71 | a mesma cena `gruta`: preparação, quatro fases, bloqueio da entrada, ondas das crias |
| Beta — perseguição e desfecho | pp. 72–75 | cena `cabecas`: perseguição de 5 rodadas, cabeças, vala oculta, facilitar |
| ZIPs 03 e 04 | — | mapas, handouts, tokens, músicas e fichas: só referência (nome, caminho, sha256) |

### Onde mora (v9.1)

| Arquivo | O quê |
|---|---|
| `js/ordem2/ameacas.js` | `RAMAOrdem2Ameacas`: fichas **nativas** (Afogado p. 33, Aughisk p. 43, Crias da Floresta p. 71; Ellén Trechend só com os efeitos da perseguição; inventário do Alpha sem ficha), `normalizar`, `linha`, `paraNpc` (uma ocorrência com PV e ações próprios). É também o bloco `ordem2` de uma criatura de Homebrew. |
| `js/ordem2/procedimentos.js` | `RAMAOrdem2Proc`: as operações e ganchos dos procedimentos (quadro, desafios, ferramentas, tabelas por rodada, encontros, perseguição, esconderijo), a hidratação do pacote e a vista do jogador. Registrado na MESMA porta (`RAMAOrdem2Mesa.aplicar`). |
| `js/ordem2/telas/o2-procedimentos.js` | as telas do Mestre (Cena, Quadro, Desafios, Encontro) e de quem joga (desafios, ferramentas, laboratório, compêndio, anexos, itens, perseguição, esconderijo) — na mesa e na ficha |
| `backend/Ordem2.gs` | carrega o pacote local, hidrata a cena, passa `pacotes` ao motor, desidrata antes de gravar, libera documentos de anexo |
| `backend/Ordem2Pacotes.local.gs` | **o pacote do Mestre — fora do git e do site** (ver abaixo) |
| `testes/fixtures/ordem2-pacote-sintetico.js` | um pacote inventado, no mesmo formato, para os testes públicos |
| `testes/executar-ordem2-missoes.js` | os testes desta etapa (pacote sintético; com o pacote local, também as conferências dele) |

### O pacote do Mestre (conteúdo exclusivo fora dos arquivos públicos)

O repositório é público e o GitHub Pages serve a raiz inteira — inclusive
`backend/`. Por isso, **pontos de interesse, pistas, senhas, soluções,
roteiros, a resposta do caso e o compêndio não estão em nenhum arquivo
versionado**. Eles moram em `backend/Ordem2Pacotes.local.gs`, que o
`.gitignore` já exclui (`backend/*.local.gs`) e que só existe nesta pasta e no
projeto do Apps Script (arquivo **Ordem2Pacotes**). O servidor:

- lista ao Mestre só os nomes (`ler_ordem2` → `pacotes`);
- ao carregar uma cena, cria as instâncias (desafios com a senha sorteada ou a
  impressa, tabelas, itens, ferramentas) e **hidrata** os pontos a cada leitura
  e operação — o conteúdo do pacote nunca é copiado para a planilha; só ficam
  lá o estado dinâmico e o que o Mestre editou;
- devolve ao Mestre a cena hidratada (`estado` + `cena`: anexos, compêndio,
  roteiro, efeitos) e ao jogador só a vista.

Sem o arquivo, a mesa funciona como na v9.0 (pontos próprios do Mestre). Os
textos do pacote são paráfrases curtas; nada é cópia do livro.

**Handouts, mapas, tokens e músicas não vêm com o site.** O pacote guarda a
referência (nome no texto, caminho no ZIP, sha256) e, quando o arquivo não
veio, uma descrição para o Mestre narrar (e os padrões de bips do EMF). O
Mestre liga cada anexo a um **documento da campanha** (aba Documentos, visível
a ninguém) ou a um link próprio: quando alguém recebe a pista com aquele anexo,
o servidor acrescenta a conta dessa pessoa ao `visiveisJson` do documento (nunca
tira) — o handout privado só aparece para quem o achou. O documento guarda a
imagem que a aba Documentos aceita (até ~65 KB); para handout com texto miúdo,
o link evita perder legibilidade. Duplicatas: 8 arquivos dos ZIPs são idênticos
(as duas músicas e os seis tokens de personagem que vêm na Missão 1 e na 2):
o manifesto guarda cada conteúdo uma vez (`igualA`). O mapa da caverna vem em
JPG e em PNG de 51 MB: a referência é o JPG.

### Fato — o que o motor faz porque o texto diz

- **Quadro**: ponto oculto/anunciado; a descrição básica para todos; pistas por
  perícia e DT; Examinar sem novidade custa 1 PD (Alpha p. 22; Beta p. 14);
  Recapitular e Compartilhar com DT 10 e trava na cena (Alpha pp. 22–23; Beta
  p. 15); pistas "só para" um personagem; linhas por número de jogadores
  (ícones 3/4/5 do Alpha); pré-requisitos (cadeado, hack, ter achado a foto e a
  pulseira).
- **Destrancar**: senha secreta; a resposta posição a posição; tentativas por
  rodada pelo Crime (d4 1 … d12 5); máximo da fechadura → danificada (só força
  ou chave) (Alpha p. 24; Beta p. 16). **Arrombar**: 1 PV por tentativa,
  Atletismo contra a DT, soma a RA até a PA. **Senha de teclado**: três erros
  bloqueiam duas rodadas (Alpha p. 50).
- **Hack técnico**: teste de Tecnologia → problema da faixa do resultado, com o
  tempo da faixa (painel: 10+/7–9/5–6/1–4; computador: 20/15/10 s). **Hack
  social**: Intuição; uma chance extra a cada 3 acima da DT; N respostas certas
  (celular: 4) (Alpha p. 25).
- **Alcançar** seguro (duas ações; falha: dano = RB e recomeça) e arriscado (DT
  +3; falha: dano = RA); **Sustentar** (1 PV; novo teste a cada rodada com −1
  passo acumulado; quem passa sofre na falha) (Alpha p. 25; Beta p. 17);
  **Equilíbrio** (2d10 sem somar; diferença ≤ 1; d4 de reserva = metade da
  Acrobacia, gastos até o fim da travessia) (Beta p. 17).
- **Escalar** a tocha (rápido DT 8 soma RA; cauteloso DT 6 soma RB; meta 10;
  falha: cai com dano igual ao acumulado) (Beta p. 41); **travessias** do bosque,
  rio e encosta, com escuridão e salto de fé (Beta pp. 57–59).
- **Ferramentas**: UV 3 cargas, pó 5; termômetro ilimitado; laser por ambiente
  com a lista de pontos; rádio: Tecnologia tira 0/2/3/todos os falsos (6−,
  7–9, 10–12, 13+), a ordem fica para os jogadores; **laboratório**: 4–6 dados
  em sequência começando em d4 e subindo um passo até a Aptidão (Exatas), não
  decrescente, metade da Mente em novas rolagens — fora do teto de quatro dados
  de um teste (Alpha pp. 74–76). Compêndio: quem carrega e quem ele permite.
- **Sobrecarga** do porão: 0, 0, 1, 1, 1d4, 1d4, 1d6, 1d6, 2d4 da 9ª em diante,
  cada um rola o seu, no fim de cada rodada (Alpha p. 77 — conferido na página
  renderizada). **Maldição** do Ídolo: rodadas 4/7/10 com perda a menos que o
  personagem fira outro marcado; +1 PV/+1 PD com o Ídolo quebrado (Alpha pp.
  52–53).
- **Encontros**: quatro fases nas missões (Beta pp. 32, 69); afogar (só escapar;
  1d6 no fim da rodada; escapar com −1 passo; aliado sem a redução) (p. 33);
  investida e enxurrada do aughisk, presença aterradora, tributo mortal (p. 43);
  ondas do aughisk (rodadas 2, 4, 6…, metade dos personagens, chegam e atacam na
  seguinte) (p. 44); ondas das crias (2, 5, 8…; param com a chama depois de duas;
  Intuição DT 10 na 3ª e 4ª) e bloqueio da entrada (exatamente dois; até duas
  crias por defensor; −2 passos a quem atira de fora) (pp. 69–70); perseguições
  (fôlego, esforço extra, carregar outro, recuperar fôlego, sacrifício, vala,
  cabeças, limiares, só o de menor PA morre) (pp. 35, 73–74); esconderijo (os
  dados do teste viram esconderijo; a tabela d10 das criaturas; DT +3 por uso;
  encontrado sofre 1d6 por rodada) (pp. 55–56).

### Inferência — lido nas entrelinhas, com o nome

- Rádio do Ato II: os conjuntos falsos vêm em vermelho no livro; no texto
  extraído a cor some. O pacote deduz os falsos da solução impressa.
- No Beta, as linhas "Pesquisar" da árvore (p. 38) usam **Inspecionar** — o
  Beta não tem Pesquisar (a mesma decisão de Compartilhar da v9.0).
- A tocha (p. 41) tem duas linhas "Percepção"; a segunda foi lida como
  Inspecionar. A tocha é destruída quando acerta (o texto: "se usada dessa
  forma").
- O buraco das raízes (p. 63) traz em Percepção 8 a linha da carroça: o pacote
  põe "há um entalhe rúnico" e marca para o Mestre confirmar.
- Laser: o "ambiente" é a área do mapa (porão ou sala secreta).

### Proposta — decisões de implementação (não são regras)

As de `DECISOES` no catálogo: efeitos em grupo rolam direto no servidor;
Sustentar testa sozinho ao encerrar a rodada; encerrar a rodada leva o número
dela (nada aplica duas vezes); pontuação = RA, duas maiores no crítico do Beta;
crítico do esconderijo dá um dado do maior tipo rolado; hack social sem DT
impressa usa 7 e o Mestre pode aceitar resposta à mão; novas rolagens do
laboratório em qualquer dado já rolado.

### Divergências desta etapa — fonte, comportamento e teste

| Divergência | Fontes | Comportamento | Teste |
|---|---|---|---|
| Sentido de alto/baixo da fechadura | Alpha p. 24; Beta p. 16 | a resposta diz onde está a senha (3-5-2 × 4-5-1 → baixo, exato, alto); **a v9.0 respondia ao contrário e foi corrigida** | `executar-ordem2-missoes`: senha 3-5-2 |
| Remissões de página | Beta pp. 31, 39, 42, 70 | cita a página do arquivo (33, 37, 43, 71) e guarda a do texto | `executar-ordem2-missoes`: ameaças com a página do arquivo |
| "NEX 35%+" no aughisk | Beta p. 43 | ignorado (termo de Ordem I) | `executar-ordem2-missoes`: Presença Aterradora sem NEX |
| RD do aughisk não impressa | Beta pp. 38, 41, 43 | lacuna: o Mestre informa no encontro | `executar-ordem2-missoes`: aughisk sem RD inventada |
| Efeito da tocha "na Fase 3" | Beta p. 41 | ondas pelo roteiro + interruptor manual | `executar-ordem2-missoes`: ondas do aughisk |
| Ondas das crias (duração, intervalo, tamanho) | Beta p. 70 | 2, 5, 8…; 1 cria por personagem (crescente opcional); param com a chama depois de duas | `executar-ordem2-missoes`: ondas param |
| Freezer "DT acumulada 12" | Alpha p. 58 | PA 12, DT 7 até o Mestre ajustar; destrancar 4d6 sem limite impresso | `executar-ordem2-missoes`: arrombar soma a RA |
| Alcançar com Atletismo na plataforma | Beta pp. 17 × 64 | a exceção da cena vale (Atletismo 7/10) | pacote local: baú atrás da plataforma |
| Números dos handouts do Ato II | Alpha pp. 88–100 × ZIP | ligados pelo conteúdo, com os dois nomes | pacote local: anexos |
| Arquivos que não vieram | Alpha pp. 31–59, 76, 87, 100 | referência + descrição/padrão | pacote local: referências faltantes |
| Caixas com texto trocado | Alpha pp. 91–100; Beta pp. 62–63 | o pacote usa o texto do ponto | — |
| Tabela da sobrecarga em ícones | Alpha p. 77 | conferida na página renderizada | pacote local: preset exato |
| Enigma das cinzas: o trajeto impresso contradiz o "caminho do sol" do próprio texto | Beta p. 64 | a mesa aceita o trajeto impresso e também o do sol (as duas respostas só no pacote; o Mestre vê ambas) | pacote local (`segredo.alternativas`) |
| Sequência do laboratório nas roupas | Alpha p. 97 | não impressa: o site pede ao Mestre | pacote local: laboratório nas roupas |
| Destrancar o baú sem número de tentativas | Beta p. 65 | sem limite até o Mestre ajustar; +1 com o Ofício | pacote local: baú com limite ajustado |

### Fichas e procedimentos implementados

- **Ameaças nativas**: Afogado, Aughisk, Cria da Floresta, Ellén Trechend
  (efeitos), Ídolo de Pedra, Cadáveres erguidos, a manifestação do compêndio —
  no Catálogo (Ordem II → Ameaças, com "Copiar para o Homebrew"), no Homebrew
  (sistema Ordem Paranormal RPG II, formulário nativo) e na mesa (catálogo ou
  Homebrew; cada ocorrência com PV e ações próprios; objetos atacáveis como o
  crânio, PV 5/RD 5, com efeito ao destruir).
- **Quadro**: cena do pacote, pontos por área e número, pistas com requisito,
  exclusividade, jogadores, anexo, ordem; revelação manual a personagens ou ao
  grupo; o que cada um e o grupo já sabem (a mesma pista não rende duas vezes);
  Recapitular/Compartilhar/Interagir com a pista nova escolhida pelo Mestre
  (só as que a pessoa ainda não tem); flags; itens de cena.
- **Desafios**: destrancar, senha, arrombar, alcançar, sustentar, equilíbrio,
  escalar, travessia, hack técnico e social, enigma, runas, ação de cena
  (consertar/municiar/disparar a balista, erguer a carroça, pegar o crânio,
  atacar com a tocha, nicho, monólito).
- **Ferramentas**: as dez, com posse, empréstimo, cargas, leitura por ponto,
  laser, rádio, laboratório e o compêndio com marcas e evidências comparáveis.
- **Tabelas por rodada**: sobrecarga e maldição, com ativar, suspender e isentar.
- **Encontros**: etapas, troca de 3 ↔ 4 fases sem perder ação, ondas com chegada,
  tributo, bloqueio, afogar/escapar, efeitos em grupo, ações especiais,
  perseguição (arrastado/devorado, empate pelo Mestre, facilitado),
  esconderijo, runa de Brenna.

### Referências que faltam nos arquivos

Ato I: os handouts 01–14, os mapas 02 e 03, as músicas "O Porão" e "O Ídolo",
e as fichas de Victor, Eloísa, Edgar e Kênia (só a de Alan existe, p. 15).
Ato II: os áudios EMF 1 e 3 (os padrões 1-1-3 e 1-1-1 estão no texto). Beta:
nada faltou para os procedimentos (os handouts, mapas, tokens e músicas vieram).

### Validação desta etapa (simulada, não é a implantação)

- `testes/executar-ordem2-missoes.js` — 140 verificações (115 com o pacote
  sintético + 25 com o pacote local, puladas onde ele não existe): ponto Alpha
  com ferramenta e sobrecarga; tranca com limite (sintética e o baú real);
  equilíbrio; encontro com pista + runas + ondas; 3 ↔ 4 fases; payload do
  jogador sem pista não revelada, senha, handout privado nem bastidores;
  recarregar no meio do desafio; encerrar a rodada duas vezes sem duplicar dano,
  tentativas ou ondas; afogar; perseguição; esconderijo.
- `testes/ordem2-backend.js` — a sessão pelo servidor simulado com o pacote
  sintético: lista de pacotes só para o Mestre, planilha sem o conteúdo do
  pacote, documento de anexo liberado só para quem recebeu a pista, tranca,
  arrombar recarregado, sobrecarga com o mesmo opId (repetida) e onda sem
  duplicar.
- No navegador (servidor local, contas sintéticas, pacote real): o Mestre
  carregou o Ato II e a gruta pela tela, entregou ferramentas, viu os segredos
  na aba Desafios; a jogadora usou termômetro e laboratório pela ficha,
  resolveu o buraco das raízes, rolou a escadaria; o Catálogo mostrou as
  ameaças e copiou o Aughisk para o Homebrew, que entrou na mesa com PV e ações
  próprios. Celular 375 px sem rolagem lateral; nenhum erro no console.

### Publicar a v9.1

Servidor: troque **Ordem2.gs** e **Codigo.gs**; crie o arquivo
**Ordem2Pacotes** com o conteúdo de `backend/Ordem2Pacotes.local.gs` (só existe
nesta pasta — não está no GitHub); crie uma versão nova da implantação.
**`setupRama()` não é necessário** (nenhuma aba nova: o estado da etapa 2 mora
em `CAMPANHA_ORDEM2.dadosJson`). Site: `js/ordem2/` (inclui `ameacas.js`,
`procedimentos.js`, `telas/o2-procedimentos.js`), `css/ordem2.css`,
`css/modern20/ordem2.css`, `js/criaturas.js`, `js/fichas-nativas.js`,
`js/paginas/homebrew.js`, `js/paginas/homebrew-criatura-sistemas.js`,
`js/paginas/catalogo.js`, `js/versao.js` e as páginas `personagens/`, `ficha/`,
`campanha/`, `catalogo/`, `homebrew/`.

## Etapa 3 — evolução e paranormal (v9.2)

Dois módulos **opcionais**, com o selo "Experimental — regra do R.A.M.A.".
Nenhuma das propostas abaixo é chamada de regra publicada; nada vem de Ordem I
(catálogo, círculos, afinidade, custos, NEX).

### Fontes desta etapa

- Alpha pp. 14–16 e Beta pp. 6–8: nível, patamar, aquisição de habilidades.
- Beta p. 2: o sistema paranormal é anunciado (rituais, poderes, objetos
  amaldiçoados) e **não** está nos playtests.
- Beta pp. 60–71: a gruta (runas, chama) — procedimento de aventura, não modo
  geral de conjurar.

### Onde mora (v9.2)

| Parte | Arquivo |
|---|---|
| Evolução (motor) | `js/ordem2/evolucao.js` → `RAMAOrdem2Evolucao` |
| Paranormal (motor) | `js/ordem2/paranormal.js` → `RAMAOrdem2Paranormal` |
| Telas (ficha e Mestre) | `js/ordem2/telas/o2-paranormal.js` → `RAMAOrdem2ParanormalTela`, `RAMASecaoOrdem2Paranormal` |
| Ficha no estilo do livro | `js/ordem2/telas/ficha-o2.js`, `css/ordem2.css`, `css/modern20/ordem2.css` |
| Servidor | os dois motores copiados em `backend/Ordem2.gs` (8 arquivos) |

### A ficha no estilo do livro

A organização das fichas de Val (Alpha) e Rhiona (Beta): nome grande; a
etiqueta do perfil · ocupação/vocação · a caixa de NÍVEL; PV e PD em
quadradinhos (o número escrito ao lado); a aba **Ficha** (antes "Perícias") com
ATRIBUTOS e PERÍCIAS ("NOME [d] + [d] ATRIBUTO", a linha inteira rola) à
esquerda, o retrato e "Nível e evolução" no centro, HABILIDADES (título em
etiqueta, números em destaque) à direita. Acento verde do tema
(`--cor-verde`); estado sempre escrito, nunca só cor. Celular: uma coluna
(retrato pequeno, atributos, perícias com o atributo abreviado, habilidades).
A aba **Paranormal** entra depois de Habilidades.

### Cobertura — confirmado, inferido, experimental

**Confirmado (o texto diz):**

| Regra | Fonte | Teste |
|---|---|---|
| Nível de 1 a 10 | Alpha p. 15; Beta p. 8 | etapa3 "Evolução · modo livre e por marcos" (subir do 10 recusado) |
| A ficha começa com as habilidades de perfil e ocupação/vocação; ganha outras ao subir ou treinar | Alpha p. 15; Beta p. 8 | etapa3 "O que o texto diz" (presets sem evolução inferida) |
| d20 só com influência paranormal | Alpha p. 16; Beta p. 8 | etapa3 (teto d12 na melhoria; d20 só de efeito que permite) |
| O sistema paranormal não está nos playtests | Beta p. 2 | etapa3 "Paranormal · desligado por padrão" |
| A gruta é um procedimento (runas → chama) | Beta pp. 60–71 | etapa3 "A gruta da etapa 2 continua jogável sem conjuração livre" |

**Inferido (lido nas entrelinhas, com o nome):** patamar é campo à parte do
nível (os textos não ligam um ao outro); NEX não aparece nos playtests, então
fica só como anotação; a classificação de um item no compêndio e o ritual de um
handout não provam custo nem modo geral de conjuração.

**Experimental (proposta do R.A.M.A., configurável):**

| Proposta | Padrão | Teste |
|---|---|---|
| Modo livre (o Mestre define o nível; registra sem ganhos) | ligado | etapa3 "Evolução · modo livre e por marcos" |
| Por marcos: o Mestre confirma um nível; quem joga escolhe UMA melhoria — +1 passo em atributo/perícia (até d12, sem d20), +2 PV máx., +2 PD máx. ou habilidade aprovada | desligado | idem; backend (opId repetido = um nível só) |
| Melhorias em registros separados dos valores impressos; máximo maior preserva os pontos atuais | — | etapa3 + navegador (PD 12/12 → 12/14) |
| Desfazer só a operação, dependências primeiro; nunca devolve dano antigo | — | etapa3 "desfazer só a operação, com dependências" |
| Atualizar do preset só com prévia e confirmação, registros preservados | — | etapa3 |
| Módulo paranormal desligado por padrão | desligado | etapa3; backend |
| Teste Mente + Ocultismo/Bruxaria; DT/custo simples 7/1, intermediário 10/3, complexo 13/5 PD (campanha e ritual mudam) | — | etapa3 "prévia, custo único…" |
| Imediato consome a ação; elaborado com etapas, componentes e ordem, teste na execução final | — | etapa3 "elaborado"; navegador |
| Custo cobrado UMA vez na confirmação, também na falha; repetir o opId não cobra de novo | — | etapa3; backend (`opRit`) |
| Efeitos separados para sucesso, crítico, falha e falha crítica; sem efeito configurado vai para o Mestre | — | etapa3 |
| Forçar: 2 PV por +1 passo, uma vez, recusado se não puder pagar; pavor ou componente como alternativa (nunca dois) | desligado | etapa3 "forçar" |
| Desligar bloqueia conjurações novas e preserva rituais, histórico e efeitos ativos | — | etapa3 "desligar sem perder dados" |
| Três classes: experimental (conjurável), procedimento de missão, consulta | — | etapa3 "procedimento ≠ conjuração" |

### Casos de validação

- `testes/executar-ordem2-etapa3.js` — 78 verificações: subir e desfazer;
  exportar/importar com evolução e ritual (ids novos); desligar sem perder
  dados; conjurar com sucesso, falha e crítico; interromper o elaborado por
  dano; forçar; a gruta sem conjuração livre; sessões Alpha (investigação +
  ferramenta) e Beta (pavor, relação, lesão, encontro em fases), cada uma com o
  módulo desligado e ligado; o resumo que a mesa do Mestre vê.
- `testes/ordem2-backend.js` (dentro de `executar-backend.js`) — marcos com o
  mesmo opId repetido (um nível, +2 PD uma vez); jogador não desfaz; outro
  jogador não conjura; conjurar com o mesmo opId cobra uma vez; a biblioteca não
  vai para o jogador; desligado bloqueia e preserva.
- No navegador (servidor local, contas sintéticas): ficha local com "por
  marcos", subir, escolher, desfazer; ritual criado, ensinado e conjurado; na
  campanha, o Mestre configurou os dois módulos, criou um ritual elaborado,
  ensinou, confirmou a subida; a jogadora escolheu +2 PD, fez as duas etapas e a
  execução final (3 PD uma vez) e o Mestre encerrou o efeito ativo. Legacy e
  Modern20; celular 375 px sem rolagem lateral; console limpo.

### Lacunas das fontes

Não há tabela de evolução, valores de patamar, custos de ritual, círculos,
lista de rituais nem regras de objetos amaldiçoados nos playtests. Tudo isso
fica no módulo experimental, configurável e com o selo — ou com o Mestre.

### Publicar a v9.2

Servidor: troque **Ordem2.gs** e crie uma versão nova da implantação.
**`setupRama()` não é necessário** e `Ordem2Pacotes` não mudou. Site:
`js/ordem2/evolucao.js`, `js/ordem2/paranormal.js`, `js/ordem2/regras.js`,
`js/ordem2/telas/o2-paranormal.js` (novo), `js/ordem2/telas/ficha-o2.js`,
`js/ordem2/telas/campanha-o2.js`, `js/sistemas.js`, `css/ordem2.css`,
`css/modern20/ordem2.css`, `js/versao.js` e as páginas `ficha/`, `campanha/`,
`personagens/`, `catalogo/`.

## v9.3 — criação em etapas e progressão do 1 ao 10

### Criação: só o que se decide agora (`js/ordem2/telas/o2-criar.js`)

Primeira tela "Como você quer criar?", com três opções visíveis e nenhuma
escolhida (a guiada em destaque, com o selo Experimental). Etapas:

| Modo | Etapas |
|---|---|
| Criação guiada | Identidade → Atributos → Perícias → Habilidades e recursos → Revisão |
| Ficha pronta | Escolher ficha → Revisão |
| Criação livre | Identidade → Dados e recursos → Revisão |

- "Passo X de Y", a sequência das etapas no desktop (▶ atual, ✓ feita, "(a
  seguir)") e só a contagem no celular; Voltar/Continuar no rodapé;
  Criar/Copiar só na revisão, que tem "Editar" por seção e "Voltar à revisão".
- Um rascunho por modo enquanto o assistente está aberto; trocar a versão diz o
  que depende dela (perícias de outra lista, ocupação, especialização) e só
  limpa com confirmação — nome, perfil, atributos e recursos ficam.
- Campanha: a versão das regras dela é lida da mesa (`ler_ordem2`); havendo
  divergência, aviso com "Usar a versão da campanha" ou "Criar sem campanha".
  Ficha pronta nunca é convertida.
- Guiada: atributos com −/+ (d6, 2 passos, teto d10); perícias agrupadas pelo
  atributo-base, busca, "Ver só as melhoradas", contador preso, próximo dado e
  o motivo de não poder subir; Aptidão com especialização; habilidade de perfil
  em destaque, a de ocupação quando documentada ou "Definir depois"; 16 PV / 12
  PD como referência experimental editável. Passos sobrando: a revisão pede
  confirmação (o motor permite). Validação final: `conferirGuiada`/`deGuiada`.
- Pronta: filtro Alpha/Beta; cartão com nome, perfil, nível, PV e PD; a prévia
  abre só do escolhido (resumo primeiro; perícias, habilidades, equipamento,
  relações e procedência em detalhes). Nome digitado à mão não é sobrescrito ao
  trocar de ficha. `dePreset()` dá ids próprios à cópia.
- Livre: nível inicial 1–10 sem melhorias retroativas; dados e recursos diretos.
- Sair com alterações pergunta (continuar ou descartar). O envio bloqueia o
  clique duplo, mantém o rascunho se falhar e repete com o MESMO `operacaoId`
  enquanto nada mudou (o servidor devolve a ficha da primeira tentativa).

### Progressão: um caminho só (`js/ordem2/telas/o2-evolucao.js`)

**Progressão experimental do RAMA** — os playtests não trazem tabela.

- Entrada: ao lado do NÍVEL, "Ver progressão" ou a ação pendente ("Escolher
  melhoria para o nível 4"); aba **Evolução** na navegação (nível atual e
  próximo, estado, uma ação principal, a escolha, a trilha 1–10 em lista, o
  histórico, o modo e o NEX em detalhes). A edição direta do nível saiu de
  Identidade; o patamar continua à parte.
- Por marcos (2 a 10): uma melhoria à escolha em cada subida — +1 passo num
  atributo, +1 passo numa perícia, +PV/+PD máximos (padrão +2) ou uma
  habilidade aprovada. Teto do valor permanente (padrão d12), sem d20; máximo
  maior mantém os atuais; prévia específica ("Mente d8 → d10", "PV máx. 16 →
  18; PV atuais continuam 9"); indisponível com o motivo na opção.
- Patamar sugerido para a mesa (1–3 Iniciante, 4–6 Veterano, 7–9 Elite, 10
  Lenda) só em detalhes: nunca aplicado; vale o registrado na ficha.
- Campanha: o Mestre libera o marco na mesa; quem joga escolhe; habilidade
  proposta mostra "Aguardando aprovação"; recusa volta à escolha sem perder o
  marco; cancelar não concede nada. Ficha avulsa: o dono escolhe o modo ("por
  marcos" recomendado ali), sobe e escolhe, sem aprovação. Campanha carregando
  ou sem a mesa: sem controles locais. Leitor: o estado, sem controles.
- Histórico: data, origem, nível anterior/novo e antes/depois; desfazer só o
  último aplicável, com prévia; nunca devolve dano nem PD gastos.

**Servidor (regras conferidas, não confiadas ao navegador):**

- `subirNivel` exige o modo "por marcos" da mesa (o atalho `local` vindo do
  navegador acabou; a ficha avulsa liga o modo na mesa local) e aceita
  `nivelAntes` para recusar tela desatualizada.
- `escolherMelhoria`, `aprovarHabilidade` e `cancelarSubida` aceitam
  `pendente` (o id do marco) e recusam marco trocado; com proposta aguardando,
  quem joga não escolhe outra por cima; habilidade personalizada exige nome e
  efeito.
- `definirNivel` e `desfazerEvolucao` recusam com marco pendente; mudar a
  configuração não mexe num marco (ele guarda a sua).
- `salvar_personagem` numa campanha de Ordem II mantém `nivel`, `evolucao` e
  as habilidades com `origemEvolucao` gravados (`preservarEvolucaoDeOrdem2`,
  Ordem2.gs, chamado por Codigo.gs). Aba antiga: a rev recusa (`conflito`).

### Validação v9.3

Automática:

- `testes/executar-ordem2-etapa4.js` (novo) — presets com os números de origem
  (Rhiona 22/12, os 14), guiada (orçamentos, tetos, devolução, Aptidão,
  versões), progressão do 1 ao 10 (pendência por id, nível manual e desfazer
  bloqueados com marco, configuração congelada, ferida com máximo maior,
  habilidade proposta/recusada/aprovada, teto permanente, exportar/importar no
  meio do marco, desfazer com dependência, nível 10), modo livre e ficha antiga.
- `testes/ordem2-backend.js` — aba antiga recusada; nível, evolução e
  habilidade "ganha" adulterados ignorados na gravação comum; marco antigo,
  nível manual e `local: true` recusados; cancelar sem ganho.

Na interface (servidor local, contas sintéticas): os três modos de ponta a
ponta (desktop Legacy; celular 375 px; Modern20), troca Alpha/Beta com
confirmação, divergência de campanha, teclado nos −/+, busca com foco
preservado, "Editar" e "Voltar à revisão", falha simulada no envio + clique
duplo + reenvio = uma ficha; na campanha com outra conta como Mestre: marco
liberado, escolha com prévia, habilidade proposta → aguardando → recusada →
escolha de novo, PV máx. com atuais preservados; leitor sem controles; ficha
avulsa: "por marcos" recomendado, subir, escolher, desfazer com prévia.

### Publicar a v9.3

Servidor: troque **Ordem2.gs** e **Codigo.gs** e crie uma versão nova da
implantação (a proteção da gravação comum mora nos dois). `setupRama()` não é
necessário; `Ordem2Pacotes` não mudou. Site: `js/ordem2/evolucao.js`,
`js/ordem2/telas/` (`o2-criar.js`, o novo `o2-evolucao.js`, `o2-paranormal.js`,
`ficha-o2.js`, `campanha-o2.js`), `js/sistemas.js`, `css/ordem2.css`,
`css/modern20/ordem2.css`, `js/versao.js` e as páginas `ficha/` e `campanha/`.
