# Malditos Goblins (3ª edição) no R.A.M.A. — v6.0

Fonte: *Malditos Goblins*, 3ª edição digital (44 páginas). A página citada em
todo o sistema é a **impressa** (no PDF digital, a do arquivo é a mesma). O
sumário do livro dá algumas páginas diferentes; vale a impressa.

## Onde mora cada coisa

| Arquivo | O quê |
|---|---|
| `js/goblins/catalogo.js` | Todas as tabelas, com página: nomes, ocupações (+ Treinador e Fazendeiro), descritores, características, técnicas, magias (+ Invocação), armas, proteções, equipamento, itens mágicos (as 24 das tabelas e as 4 só da lista), poção, anel, regras de consulta, manobras, aventuras, locais, inimigos (+ Horrores e alienígenas), Bando Rival, masmorra, adaptações e as inconsistências |
| `js/goblins/dados.js` | O motor de d6: hits, explosão em cadeia (automática ou "pode rolar"), explosão de goblin, Voz Goblin, parada de 0 dados, sorteios em tabela (1d6, 2d6, coluna/linha, d7), quantidades (1d6−2, 3d6…), chance (1 em 6, 50%) e a pescaria |
| `js/goblins/regras.js` | O motor da ficha (`RAMAGoblins`): bloco, camadas, morte, efeitos por marco, combate, magia, técnicas, progressão, itens, adaptações, criação, operações |
| `js/goblins/mesa.js` | O Covil (`RAMAGoblinsMesa`): combate, sorteios únicos, masmorra, Bando Rival, negociação |
| `js/goblins/telas/` | `goblins-comum.js` (operar, rolagem, consulta de regra, a ficha numa campanha), `ficha-goblins.js`, `goblins-criar.js`, `campanha-goblins.js` |
| `backend/Goblins.gs` | `sistemaGoblins()`, `ler_goblins`, `salvar_goblins`, `goblins_operar`; motor copiado entre marcadores por `testes/gerar-goblins-gs.js` |
| `css/goblins.css`, `css/modern20/goblins.css` | Legacy e Modern20; densidade compacta em `css/densidade.css` |
| `assets/sistemas/goblins-capa*.webp` | A capa (página 1 do PDF), 320 px e 160 px |

## Matriz de cobertura

| Regra (página) | Como está no R.A.M.A. |
|---|---|
| Criação em 3 etapas (4–6) | Guiada, manual e aleatória. Nome 2d6 (1º dado coluna, 2º linha), ocupação e descritor 1d6, característica 2d6 com "Role 2 vezes" e Olhos extras (1d6). Escolhas ficam como pendência: Supimpa, Fazendeiro (Hab ou Noç), equipamento, arma favorita, espécie inimiga, 3 magias, turminha e 2 itens do WarGoblin, Chapéu ou Livro do Cthulin. Cada sorteio fica em `criacao.sorteios`. O equipamento inicial entra **uma** vez (`equipamentoAplicado`) |
| Atributos (5) | Base 2 + ocupação + descritor (+Supimpa) + ajustes permanentes = base/permanente; + equipamento vestido; + efeitos. `calcular()` devolve cada camada e a composição; nada volta para a base |
| Ficha oficial (44) | Bloco superior: nome, ocupação, descritor, nível, característica, os 4 atributos e as caixas de ferimento |
| Níveis (5) | "Derrotei um oponente": 1d6, 6 sobe; técnica nova; nível 4 explode de alegria |
| Níveis Épicos (16) | Opcional: no 4, escolher outra ocupação ("acreditaram" / "ninguém acreditou") e progredir nela a partir do nível 1 |
| Ferimentos e morte (5) | Morre com MAIS ferimentos que a Vitalidade (igual: "no limite"). A situação muda só numa ação; curar depois não ressuscita. Noite de descanso: −1 |
| Morreu: novo goblin (5) | "Fazer o próximo goblin": ficha nova de nível 1, mesmas regras ligadas, mesma campanha, `linhagem` nas duas; a antiga não muda |
| Testes, dificuldade, explosões (14) | Teste com rótulo 0/1/2/3+; fácil +1, difícil −1; cada 6 explode em cadeia sem teto; ataque: hits = ferimentos sem teto; todos os dados em 1: o goblin explode (só goblin de jogador) |
| Voz Goblin (16) | Opcional; declarada e perdida pela pessoa ("Estou fazendo a voz" / "Falei sem a voz") |
| Mas deu ruim… (16) | Opcional; botão oferecido no teste de Habilidade com 1 hit ("se estiver sem ideia") |
| Combate (15) | Turnos, ordem manual no Covil, surpresa (goblins ou inimigos primeiro); ficha avulsa com batalha e fim do turno próprios |
| Esquiva (15) | Teste de Combate; hits tiram hits do atacante; efeito "não ataca no próximo turno" (1 turno) |
| Bloqueio (15) | Proteção vestida absorve até a durabilidade atual; durabilidade 0 não bloqueia; nunca é Vitalidade extra |
| Equipamento (12–13) | Mãos, bônus, Arremesso (a arma fica onde caiu, "pegar de volta"), Munição [X], Recarga (turno), reabastecer, Aljava, Barril (até 3 armas de fogo), Arcano, Sorte (só na cabeça, só à distância), destruído/gasto continuam na lista, restrições de característica (Cabeção, Minicabeça, Pés gigantes) |
| Técnicas (7–9) | Todas: Mestre de Armas, Inimigo, Ataque Furtivo (automático quando escondido), Matador de Pragas, Ataque Giratório (oferecido depois do dano), Ataque Brutal e Tiro Certeiro (dobro, 1×/dia), Resistência e Imunidade (no dano recebido), Delírio (condição declarada), Roubar (1 hit), Esconder (1×/dia; atacar encerra), Grito de Guerra (aliados, até o fim da batalha), Humilhação (aliado), Magias, Condutor Mágico, Implacável (1×/dia), as do Treinador e do Fazendeiro |
| Magias (10–11) | As 7, com 0/1/2/3+: o que é em quem conjurou é aplicado (ferimento com fogo, braço congelado, −1 Vit até o fim do dia, Morte 0 permanente com marca de esqueleto, Medo); o que pede alvo vai à mesa (servidor) ou fica descrito; Condutor, Arcano, Ciranda (2+ amigos), Implacável; Necronomicon, Livro Estranho de magia e Livro Especial como fontes |
| Manobras (17) | Catapulta (falhou: 1d6), Pendurar (efeito +1 contra aquele alvo), Duas Armas (−1), Cacunda (em cima +1, ninguém esquiva, dividir ferimento), Sincronizado (−1 no próximo ataque do alvo, no Covil), Derrubar, Ciranda, Tralha do Poder |
| Itens mágicos (24–27) | Sorteio de tipo e item; ações: poção (cor rolada ao achar; Amarelo explode, Roxo +1 dado, Azul cura, Verde +1 permanente escolhido), anel (rola ao colocar; efeito some ao tirar), bracelete e coroa (camada de equipamento), Capacete de Ovo (−1 Combate), Martelo do Poder (+1 automático em não humano), Adaga Matadora (+2 contra goblin), Maçãs, Peteca (dado no fim do dia), Relógio, Espada da Justiçeira, Ombreiras (par 5), Elmo-Cadeira, Sandália, Necronomicon (voltar como morto-vivo) |
| Ações demoradas e contínuas (13) | Galinha Explosiva (dois turnos do dono; no Covil, duas rodadas), Veneno (1 ferimento por minuto, "passou 1 minuto"), Uivo do Lobo (outro lobo em 2 rodadas) |
| Aventuras e locais (18–20) | Todas as tabelas no Covil; encontros viram participantes com quantidades roladas; locais com quantidades e chances; Templo à parte |
| Negociação (18) | Combate da vítima × o goblin mais forte; Noção contra Noção; negociador com todos os dados em 1 explode (na ficha) |
| Inimigos (21–23) | Todos, com `null` para o "-", 0 como 0, Besta sem número; parênteses separados (dados da arma, proteção); Gosmento, Vulnerabilidade, Imunidade, Etéreo, Mordida, Teia, Regeneração, Baforada, Uivo, Giro Mortal |
| Bando Rival (23) | Gêmeo de cada goblin da campanha (resumo da ficha) + característica rival 2d6 |
| Masmorra (28–29) | Tipo, segmentos pela regra (1d6 + segmentos até a entrada, portas abrem caminhos), conteúdo de corredor e de sala com quantidades roladas; nasce oculta |
| Sem mestre (16) | Aventura aleatória, inspiração, resposta do mestre |
| Chamado de Cthulin (32–33) | Nomes das ocupações, Chapéu ou Livro Especial, Investigação (rótulos 1/2/3), Evento Sobrenatural automático em 3+ hits (Tentáculos: +1 Medo), Medo > Noção = loucura, queimar livro e lugar sagrado zeram, Invocação com redução por Horror, Terror (1d6/2d6 Medo), Horrores no Covil |
| PokéPragas (34–35) | Treinador e 6 PokéPedras, PokéPraga inicial incomum, gerar por raridade e elemento, procurar (o dia todo), captura 1/2/3 hits, ficha da praga (elementos somam, fraqueza só do primeiro), ataque normal/elemental com +1 na fraqueza, desmaio, evolução (2 dados com Mestre da Evolução) |
| WarGoblin 40k (36–37) | Turminhas = ocupações, dois equipamentos, armas e proteções do futuro, alienígenas |
| Goblin High (38–39) | Estudantes com reação sorteada e segredos escondidos; conversar, agradar (1×/dia, precisa conversar), Amigo e segredo, romance (dois caminhos), Inimigo com "Te pego na saída" no fim do dia, Briga e suas consequências, desfazer inimizade |
| Vale dos Goblins (40–41) | Fazendeiro e Herança; coleta por animal/m²/mina/bosque; plantar (1×/dia, colhe em 1d6 dias), Dedo Verde; pescaria (5 dados, até duas rerrolagens, combinação = peso); construções (2 hits, Picareta gasta uma Espada); cozinha (falhou, perdeu os ingredientes); vilarejo com as regras do Goblin High |

## Durações por marco

`proximoAtaque`, `proximoTeste` (toda rolagem do goblin), `turnos` (conta no fim
do turno DESTE goblin), `fimDaBatalha`, `fimDoDia`, `manual`. Nenhuma duração é
por relógio de verdade. "Novo dia" expira o que é do dia, devolve os usos e,
com descanso, tira 1 ferimento.

## Campanha (o Covil)

- O mestre grava o estado inteiro (`salvar_goblins`, rev + opId); jogadores
  recebem a vista (sem notas, registro privado e o que está oculto).
- O mestre aplica nas fichas por `goblins_operar`: momentos (dia, início e fim
  da batalha, fim do turno), ataque recebido (com esquiva informada, bloqueio,
  tipo), cura, efeito, Medo, progressão, explosão e as regras da campanha.
- Quem joga age pelo próprio goblin (dono ou mestre): Grito de Guerra,
  Humilhação, magia com alvos e ataque contra um inimigo do Covil. **O
  servidor rola** com o motor e grava a rolagem no histórico da campanha.
- Sorteios têm id de operação: repetir a operação devolve o mesmo sorteio;
  sortear de novo é outro registro.

## Interpretações e lacunas

A lista completa está em `C.INCONSISTENCIAS` e aparece na aba Diário. Em
resumo: Varinha sem Condutor na tabela mas citada pela técnica (vale a
técnica); "Arco de Caça" = Arco e Flecha; itens fora das tabelas
(Medalhas, Espada Especial, Chicote…) valem os números entre parênteses nos
inimigos e entram sem regra nos goblins; Templo fora da tabela de locais;
Tomate e 200 g de Franzino impossíveis de obter (alimento manual; o peixe
maior é fatiado); Elmo-Cadeira com durabilidade 1; Mestre da Evolução evolui
com 6 em qualquer dos dois dados; parada de 0 dados pergunta (falha ou 1 dado
de regra da casa); linha 6 da tabela de nomes dividida em colunas 1–3 e 4–6;
bloqueio absorve até a durabilidade; Martelo +1 automático por ataque; livro de
magia no 6 e magia em d7; Poção Verde escolhida e permanente; elemento com o 1º
dado na coluna; pescaria empatada escolhida; Cura 1 e 2 não valem em quem
conjura; Tempestade sem dano inventado; Ataque Giratório sem cadeia; Galinha
Explosiva conta turnos do dono (rodadas no Covil); Barril de Pólvora explode ao
acender (o livro não dá prazo); Necronomicon: voltar como morto-vivo não mexe
nos ferimentos (a mesa decide).

## Limitações conhecidas

- Efeitos narrativos (Troca, Planta 0/1/3+, Morte 3+, itens como a Corda-Serpente)
  são descritos e registrados, sem número.
- A ficha avulsa não tem "outros goblins": efeitos para aliados (Grito,
  Humilhação, Cura em aliado) são mostrados para aplicar na ficha de cada um;
  numa campanha, o servidor aplica.
- Um ataque de jogador pelo servidor grava primeiro o Covil e depois a ficha;
  se a gravação da ficha falhar no meio (planilha indisponível), a munição gasta
  pode não ficar registrada.
- O vilarejo do Vale usa as tabelas do Goblin High (o livro não dá tabelas de
  fazenda).
