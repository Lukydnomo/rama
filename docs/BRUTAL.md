# BRUTAL — Corte Rápido no R.A.M.A. — v7.0

Fonte: *BRUTAL: Corte Rápido* (o Fast Play do RPGpédia, 25 páginas). As páginas
citadas são as do PDF (no rodapé). Quando o PDF e a ficha de referência (o
layout das capturas) divergem, vale o PDF: as Vantagens "Preparar Para o Pior"
e "Aquecer" da referência não estão no Corte Rápido e entram, se a mesa
quiser, como **Vantagens da mesa**.

## Onde mora cada coisa

| Arquivo | O quê |
|---|---|
| `js/brutal/catalogo.js` | Estilos, Arquétipos (Habilidade, Iniciativa, cor), Apegos, Vantagens, Ações de Encontro, Ações do Assassino, Apavoros, Ameaças, Intentos, Assassinos prontos, recargas, limites e as **lacunas**, com página |
| `js/brutal/regras.js` | A ficha persistente (`RAMABrutal`): Arquétipo, pronomes, intérprete, Apegos, detalhes, o treino e o resumo da mesa |
| `js/brutal/mesa.js` | O Thriller (`RAMABrutalMesa`): estado, `aplicar(estado, op, papel, rolar)`, vista das jogadoras, motivos de indisponibilidade |
| `js/brutal/telas/` | `brutal-comum.js` (dados, rolagens, o Thriller de uma ficha: campanha ou treino), `brutal-criar.js` (as oito cartas), `ficha-brutal.js` (o tabuleiro e as abas), `campanha-brutal.js` (a Mesa da Diretora) |
| `backend/Brutal.gs` | `sistemaBrutal()`, `ler_brutal`, `brutal_operar`; motor copiado entre marcadores por `testes/gerar-brutal-gs.js` |
| `css/brutal.css` | Tabuleiro, cartas e Mesa; tokens do tema, acento vermelho, cor por Arquétipo |
| `assets/brutal/` | Arte dos Arquétipos e dos Assassinos (do PDF), e a capa em `assets/sistemas/brutal-capa*.webp` |

## Ficha × Thriller

A **ficha** (`ficha.brutal`) guarda quem a Sobrevivente é: Arquétipo, pronomes,
intérprete, Apegos e detalhes. O **Thriller** guarda o jogo: Pilha Comum, Pilha
de Fuga, PT, Ferida, Sequelas, Marcadores, Recursos, Estilos incapacitados,
recargas, efeitos pendentes, a vez. Numa campanha de BRUTAL, o Thriller mora em
`CAMPANHA_BRUTAL` (uma linha por campanha); a mesma ficha em outra campanha
começa outro Thriller, e o antigo fica guardado (a Sobrevivente aparece como
`foraDaCampanha`, sem apagar nada). Sem campanha, a ficha guarda um **treino**
(testes, Sustos, Vantagens e Apegos; Encontros e o Assassino são da Mesa da
Diretora). A única informação de jogo que vai para a ficha é o **Desejo Obscuro
revelado** (p. 7: não pode ser usado de novo).

## Matriz de cobertura

| Regra (página) | Como está no R.A.M.A. |
|---|---|
| Pilha Comum (3) | 6 dados para cada Sobrevivente, nunca acima de 6; a Diretora começa com os dados iniciais do Assassino |
| Dados Marcadores (3) | Separados das pilhas, com valor 1–6; o mesmo nome de condição substitui o antigo; Ferida é marcador próprio e **soma** |
| Pilha de Descarte (3) | Uma só, contagem na mesa |
| Testes e Dificuldade (4, 6) | Sucesso em 4+; Estilo dela −1; cada Recurso −1 (gasto ao usar). A tela mostra "Acima de N" e o motivo de cada redução |
| Testes Complexos (4) | **Exatamente** 2 sucessos: 1 falha, 2 supera, 3 falha |
| Sacrificar × Descartar (4) | Livre e Suspense: as falhas vão para a Pilha da Diretora; Encontro e Susto: para o Descarte. A Diretora pode pedir outro destino no teste ("a não ser que alguma ocasião diga o contrário") |
| Teste de Susto (4) | 1 dado; falha descarta; +1 PH (Intento) |
| Pontos de Tensão (5) | 0 a 10; Desafios concedidos pela Diretora; Apegos dão PT |
| Apegos (7) | Item Icônico +2 e Relação Afetiva +2 uma vez por sessão; Desejo Obscuro +3 uma vez só, gravado na ficha |
| Vantagens (8) | Só fora de Encontro; custo em PT; recarga; Estilo incapacitado bloqueia; efeitos aplicados (dado, Estilo recuperado, Recurso, PT transferidos, sucesso garantido, fuga planejada) e consumidos no momento certo |
| Habilidades (9–12) | Resiliência (troca um dado pelo valor de um marcador, com o teste esperando a decisão), Benefício da Dúvida (repetir o Susto), Egocêntrica (+1 PT por 6), Até o Fim (manter 1 dado ao Arriscar Tudo por si), Carência (dados doados saem do Descarte; automática, com opção de guardar), Memória Fotográfica (só ela vê quanto falta), Olé (rerrola o marcador da Ferida), Cara Lavada (descarta 1 dado da Fuga; o resto é lacuna) |
| Encontro (21) | A Diretora inicia; o R.A.M.A. confere a condição; Iniciativa pelo Arquétipo e o Assassino por último; uma Ação por vez; Vantagens bloqueadas |
| Ações de Encontro (22–23) | As seis, com os efeitos sobre dados, participantes e a vez (Ajudar Alguém, Arriscar Tudo, Distrair, Partir Para Cima, Recuperar Fôlego, Vazar Dali, com a fuga vantajosa no 6) |
| Fuga (22) | Pilha de Fuga por Sobrevivente; completar = escapar; no fim, os dados voltam à Pilha Comum |
| Fim do Encontro (23) | Os quatro casos conferidos sozinhos (Escapar, Pilha vazia, todas escaparam, todas morreram) e o encerramento manual; recargas de Fim de Encontro voltam; a cena volta a Livre |
| Ações do Assassino (13–14) | Assustar (com o limite por Encontro), Dificultar, Escapar, Ferir (6: a Diretora escolhe morte ou Mutilar), Matar (menos dados que a Pilha; Distrair encarece), Mutilar, Acidentar, Devorar, Incapacitar, Possuir (marcador que sobe por falha; no 6, Matar pela possuída), Segurar (Ferida +1 no turno dela; livrar com Teste Complexo), Restringir (todos os testes Complexos; Ligeiro/Sagaz reduzem) |
| Apavoros (15) | Buh!, Mudando de Planos!, Sinto Cheiro de Sangue!, Sua Hora Chegou!, com custo e recarga |
| Intentos (12, 16) | Os verificáveis entram sozinhos (morte no Encontro, Ferida ao sair, Choque de Realidade, falha no Susto, todas tentando escapar no 1º turno e os Intentos Únicos das quatro Ameaças); beijo, Armadilha e o suspiro do Susto são botões da Diretora |
| Assassinos (17–20) | Bruto, Sangria, Rato, Profeta e o personalizado (duas Ameaças, uma Ação Única de cada, um Apavoro, números à mão) |

## O que fica com a Diretora

São decisões que o PDF entrega à mesa. O R.A.M.A. dá o controle e aplica as
consequências:

- **Quando** começa um Encontro (o R.A.M.A. só confere a condição) e quem está
  nele; a meta da Pilha de Fuga (ver lacunas).
- Pedir testes (comum, Complexo, Susto) e, quando a cena pede outra coisa, o
  destino das falhas.
- Conceder Pontos de Tensão por Desafios (shots, ações clichê).
- Dar Dados Marcadores de condições narrativas; ajustar pilhas, Feridas,
  Sequelas, PH e Descarte.
- O 6 do FERIR: morte ou MUTILAR. Devorar, Incapacitar, Segurar, Sinto Cheiro
  de Sangue e Mudando de Planos quando valem.
- Os Intentos narrativos (beijo, Armadilha, suspiro no Susto).
- Revelar ou não o Assassino às jogadoras.
- Encerrar o Encontro à mão; matar ou devolver uma Sobrevivente por decisão da
  mesa.
- O que a Ferida acima de 6 significa (ver lacunas).
- O resto da Cara Lavada (ver lacunas).

## Lacunas do Corte Rápido

Registradas em `RAMABrutalCatalogo.LACUNAS` e na Mesa da Diretora (Lacunas e
Vantagens). Onde há "leitura", ela é a que vale até a Diretora mudar.

| Lacuna | O que o R.A.M.A. faz |
|---|---|
| Tamanho da Pilha de Fuga (p. 22; as fichas prontas não trazem) | A Diretora escolhe de 1 a 6 ao iniciar cada Encontro (lembra a última); Dificultar soma 1, até 6 |
| Custo de Tratar Feridas ("Confira a descrição", p. 8) | Indisponível, com o motivo, até a Diretora definir o custo. O efeito é o do texto (+1 dado) |
| Caçar Recursos: Recarga "3 pts" e Custo "Sem restrição" (p. 8) | Leitura: custo 3 PT, recarga sem restrição |
| Planejar Fuga: Recarga "6 pts" (p. 8) | Leitura: vale até o efeito pendente ser usado; a Diretora pode trocar para Fim de Encontro ou Sem restrição |
| Cara Lavada termina no meio da frase (p. 12) | Descarta 1 dado da Fuga e abre uma decisão para a Diretora |
| De onde vem "um dado" (Recuperar Fôlego, Choque de Realidade, Resistir à Dor, Tratar Feridas) | Leitura: do Descarte quando houver, senão novo; configurável |
| De quem é o dado do FERIR ("um de seus dados", p. 13) | Leitura: um dado da Pilha da Diretora, gasto e descartado |
| Ferida acima de 6 | Avisa a Diretora; ninguém morre sozinho |
| Condição do Encontro ("a de qualquer Intérprete", p. 21) | Leitura: maior que a Pilha de pelo menos uma Sobrevivente presente |
| Testes de Susto fora do Encontro | Sem limite (o limite das fichas é por Encontro) |
| Estilo incapacitado nos testes | Leitura: também não reduz a Dificuldade |
| Vários Recursos num teste | Aceitos; Dificuldade mínima 2 |
| Dados além de 6 (doação, Fuga voltando) | Ficam com quem doou ou vão para o Descarte |
| Os dados de quem morre | Saem de jogo |
| Duração do Distrair | Vale para a próxima vez do Assassino e zera depois dela |
| Estigma e Nível de Brutalidade | Texto livre; o Assassino personalizado recebe dados, PH e Sustos à mão |
| Ameaças sem descrição (Carniceiro, Amaldiçoada, Perseguidor) | Aparecem pelo nome, sem Ações nem Intentos |
| Vantagens de outras versões | Vantagens da mesa, com efeito automático (inclui "reduz a próxima Ferida", consumida quando a Ferida é aplicada) |

## Sincronia e repetição

Toda mudança do Thriller é uma operação (`brutal_operar`) com `opId`: clique
duplo, reconexão ou duas abas não aplicam duas vezes (o servidor guarda os
últimos 120 ids). As configurações levam `rev`; sobre um estado velho, o
servidor responde `conflito` com o estado atual. Os dados são rolados no
servidor e entram no histórico de rolagens da campanha. A ficha acompanha a
mesa pelas marcas da sincronia da campanha (parte `brutal`), e a Mesa da
Diretora, pela mesma sincronia (aba `diretora`).

## Testes

- `testes/executar-brutal.js` — o motor, com dados combinados.
- `testes/brutal-backend.js` (dentro de `executar-backend.js`) — a sessão de
  uma Diretora e duas jogadoras pelo servidor simulado.
- `testes/executar-catalogo.js` — as categorias de BRUTAL no Catálogo.
