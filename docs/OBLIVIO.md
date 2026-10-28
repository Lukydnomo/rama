# Oblívio no R.A.M.A. (v3.0)

O sistema **Oblívio** (livro de regras de 146 páginas e a Ficha de Persona de 2
páginas) implementado como sistema próprio do R.A.M.A.: `tipoFicha: "oblivio"`,
bloco `oblivio` na ficha (schema 24), criação guiada, ficha com corpo em cinco
regiões, mesa da Testemunha na campanha, as 18 Ameaças e os Buracos. Nunca é
tratado como Universal — nem no site, nem no Apps Script.

Este documento é a **matriz de cobertura** (regra → página → dado → o que é
automático → o que é escolha → como foi verificado), a lista das
**interpretações** adotadas onde o livro diverge de si mesmo ou da ficha, e as
**lacunas** do PDF. Interpretação não é errata: é a leitura que a implementação
usa, registrada para a mesa poder discordar — várias viram **ajuste da mesa**.

Páginas: sempre a **impressa**, com a do PDF entre parênteses. A conversão é
`paginaDoPdf()` em `js/oblivio/catalogo.js`: PDF = impressa − 2 até a p. 27 e
impressa − 4 da p. 30 em diante. Os resumos do catálogo são paráfrases curtas
— o texto do livro não é reproduzido.

---

## Arquitetura

```
js/oblivio/                 o motor (puro: sem DOM; roda no navegador, no Deno e no Apps Script)
  catalogo.js               Papéis, Habilidades, Conhecimentos, equipamentos, modificações,
                            Mazelas, Fardos, cenas, alcances, lacunas — com páginas
  ameacas-dados.js          as 18 Ameaças e a Infecção, com efeitos estruturados
  buraco-dados.js           todas as tabelas do Buraco, cada linha com eventos estruturados
  regras.js                 a Persona: cálculo, criação, Estresse, Coragem, Mazelas,
                            Fora de Ação, Fardos, inventário, fabricação, momentos, progressão
  combate.js                testes (Zona de Acerto), disputa, ataque com resolução pendente,
                            Proteção completa × restante, dano
  ameacas.js                instâncias de Ameaça: dano, derrota, retornos, comportamentos
  mesa.js                   a mesa da Testemunha: Missão, cenas, turnos, fileiras, Farol,
                            encontro, vista dos jogadores
  buraco.js                 construção, exploração, eventos, saída
  habilidades.js            as habilidades com ativação e as ações específicas
js/paginas/
  oblivio-criar.js          a criação guiada (8 etapas)
  oblivio-corpo.js          o diagrama do corpo (figura + lista acessível)
  ficha-oblivio.js          bloco superior, abas Persona, Habilidades e Estado; operar()
  ficha-oblivio-jogo.js     abas Testes e Inventário; ataque; fabricação; descanso
  ficha-oblivio-mesa.js     a ficha numa campanha: tempo da mesa, alvos, operações no servidor
  campanha-oblivio.js       a aba Oblívio da campanha (Testemunha e jogadores)
js/capa-sistema.js          o componente de capa (volume de livro) de qualquer sistema
assets/sistemas/            oblivio-capa.webp (320×480) e oblivio-capa-pequena.webp (160×240)
backend/Oblivio.gs          cópia FIEL do motor (gerada) + ler_oblivio, salvar_oblivio,
                            oblivio_operar
css/oblivio.css             Legacy; css/modern20/oblivio.css — Modern20
```

`backend/Oblivio.gs` traz os nove arquivos do motor entre marcadores
`/* >>> js/oblivio/X.js */ … /* <<< … */`. **Mudou o motor, rode**
`deno run --allow-read --allow-write testes/gerar-oblivio-gs.js` — a suíte do
backend confere que as cópias são idênticas.

### Tempo e idempotência

O tempo só anda por **momentos**: `fimDoTurno`, `fimDaRodada`, `inicioDaCena`,
`descansar`, `concluirMissao` (e `inicioDoTurno` para Última Esperança). Toda
mutação passa por `aplicarOperacao(bloco, opId, fn)`: o id fica guardado (até
300) e a segunda chegada não aplica de novo. Numa ficha avulsa, os botões da aba
Estado são os momentos; numa campanha com a mesa ligada, quem anda é a
Testemunha e o servidor aplica os momentos em todas as fichas de Oblívio da
campanha.

### Segurança

- A Testemunha (mestre) grava o estado da mesa inteiro (`salvar_oblivio`, rev +
  opId). Jogadores recebem a **vista dos jogadores**: Ameaças só com nome, Grau,
  estado e "% ferida"; cartas do Buraco só reveladas, eventos de armadilha armada
  escondidos; registro privado fora.
- Efeitos entre fichas vão por `oblivio_operar`: quem age precisa poder **editar
  a Persona que age** (dono, Editor ou mestre — `personagemAcessivel`); os alvos
  só precisam ser fichas de Oblívio da **mesma campanha**. Uma habilidade num
  aliado nunca dá acesso de edição à ficha dele: o servidor aplica só o efeito.
- `estresse` e `momentos` são da Testemunha. Um acerto de Ameaça vira
  **ataque pendente**: a Persona atingida escolhe região e Durável
  (`receberAtaque`), mas o VALOR é o que a mesa registrou.
- `ler_oblivio` devolve as Personas da campanha só com **id e nome** (o que o
  painel já mostra) e o bônus de Escudo Humano calculado no servidor (fonte e
  valor — nunca a ficha de quem protege).

---

## Matriz de cobertura

Legenda da coluna "Verificação": **T** = teste automatizado
(`testes/executar-oblivio.js`, `testes/oblivio-backend.js`), **N** = revisão no
navegador (servidor local, dados sintéticos), **—** = sem verificação dedicada.

### Criação (pp. 17–47)

| Regra | p. (PDF) | Dados | Automático | Escolha | Verif. |
|---|---|---|---|---|---|
| Persona: nome, retrato, campanha, notas | 17 (15) | ficha | grava | jogador | N |
| Papel (5) e Habilidade Principal | 17–25 | `PAPEIS` | Principal entra sozinha; limite base do Papel | jogador | T, N |
| 10 pontos de Atributo, 0 a 10 | 32 (28) | `CRIACAO` | contador, validação | jogador | T, N |
| Atributos Mutáveis = (A + B) / 2 | 35–37 | `MUTAVEIS` | calculados com composição | Dano: Força + Carne ou Fuga | T, N |
| 3 especializações do Papel + metade de Mente | 40 (36) | `ESPECIALIZACOES_DO_PAPEL` | conta e valida | jogador | T, N |
| Limite de Estresse distribuído nas 5 regiões | 41–42 | `REGIOES` | soma, "Sugerir distribuição", mín. 1 | jogador | T, N |
| Jogando com menos regiões: Próteses, Aprimorar o Corpo, Ir Além | 42–43 | `MENOS_REGIOES` | Aprimorar dá Coragem; Sobrecarga | jogador | T |
| Equipamento inicial, espaços (carregados contam) | 67 (63) | `INVENTARIO` | contador; requisitos de peso | jogador | T, N |
| Motivação (1D6 ou escolha) | 84 (80) | `MOTIVACOES` | rola 1D6 | jogador | N |
| Revisão | — | `validarCriacao` | pendências por etapa | — | T, N |

### Persona em jogo

| Regra | p. (PDF) | Automático | Escolha | Verif. |
|---|---|---|---|---|
| Estresse sobe de zero; região esgotada não é arriscada; Torso esgotado = Fora de Ação | 41 (37) | `receberEstresse` | a região (quem recebe) | T, N |
| Estresse além do limite transborda para o Torso | 41 (37) | marca `transbordo` | — | T |
| Ferida (metade do limite de uma vez) | 92 (88) | abre a Mazela; repete no fim da rodada | — | T |
| Durável empunhado absorve tudo ou nada | 66–67 | `item` em `receberEstresse` | o Durável | T |
| Coragem: valor inicial (Det + Men) / 2, depois SALDO | 37 (33) | recálculo nunca devolve gasto | — | T, N |
| 5 usos de Coragem | 37 (33) | Aumentar Mutável, Aumentar Extremo, Comprar Sucesso, Recuperar Estresse, Reduzir Extremo | quando usar | T, N |
| Recompensas de Coragem (Motivação, Ação Corajosa, Estimulante) e Coragem Cega (3+ de uma vez) | 21, 37, 91 | Coragem Cega automática | a Testemunha concede | T |
| Perda de Coragem; sem Coragem vira Pavor; Covardia e Buraco Assustador dobram | 46, 93 | `perderCoragem` | — | T |
| Fora de Ação: 1ª e 2ª vez (No Chão, Sem Reação, volta e recupera); 3ª na Missão = morte | 45 (41) | `entrarForaDeAcao`, retorno no momento certo | intervenção (Animar os Ânimos) | T |
| Fardos (1D6), acumulam ou não; Guilhotina 1D4; Deterioração 1D6 | 46 (42) | `rolarFardo`, `aplicarFardo` | — | T |
| Recuperação: Ração, Descanso (5 + Fôlego), Fome e Carne Fraca, cura temporária, próteses | 47, 95 | `descansar`, `comerRacao`, `recuperarEstresse` | — | T, N |
| Descanso perigoso (1D6, vigília) | 119 (115) | `descansoPerigoso` | sucessos de vigília | T, N |
| Progressão ao concluir a Missão (+metade de Carne no limite; 1 + mortos habilidades) | 95 (91) | `concluirMissao`, uma vez por Missão | as habilidades | T |
| Limites de uso por rodada/cena/Descanso/Partida/Missão | 53–65 | `podeUsar`/`registrarUso` | — | T |

### Testes e combate (pp. 48–52, 86–90, 116–120)

| Regra | p. (PDF) | Automático | Escolha | Verif. |
|---|---|---|---|---|
| 10 Conhecimentos; +2 especializado | 48 (44) | bônus na montagem | dificuldade (Testemunha) | T, N |
| Zona de Acerto 1D20: Reduzida 10+, Normal 13+, Aumentada 16+; 1 Falha Extrema; 20 Sucesso Extremo | 52 (48) | `classificarD20` sobre o TOTAL | — | T, N |
| Dificuldade aumentada/reduzida por itens, Mazelas (Lentidão, Pavor), Covardia, Versátil, Utensílio | várias | `montarTeste` | — | T |
| Disputa: sucesso > falha; Extremo > Regular; empate da Testemunha | 49 (45) | `compararDisputa` | resultado do oponente | T |
| Ajudar (+1 por Persona) | 86 (82) | bônus | quantas ajudam | T |
| Ataque: 1 dado por região arriscada (máx. 5), escolhida ANTES de rolar | 50 (46) | regiões no diagrama; validação | regiões, arma | T, N |
| Falha num dado põe Estresse na região DO dado (1; 2 na Extrema) | 50 (46) | `concluirAtaque` | — | T, N |
| Resolução pendente: Comprar Sucesso, Aumentar Extremo, Mãozinha, Empunhadura, Corte Relâmpago | 37, 61, 72, 78 | `escolherNoAtaque`; só "Concluir" aplica | cada escolha | T, N |
| Prótese: conta Falhas Extremas; passa de metade de Carne, é destruída | 43 (39) | automático | — | T |
| Proteção completa × restante; desgaste acumula entre atacantes | 50 (46) | `aplicarSucessos`; zerada até o próximo turno de quem acertou | — | T |
| Mirar: Proteção + capacidade da região | 89 (85) | `mirar` | região e capacidade | T |
| Dano: arma (se a região que empunha foi arriscada) + atributo + habilidades | 50, 72–76 | `composicaoDoDano` | — | T, N |
| Recarga (Disparo) e Munição | 72–74 | `recarregar` | — | T |
| Reduções na Persona: Proteção Maximizada e Elevada | 76 (72) | servidor, ao receber o acerto | — | T |
| Ações específicas (13) | 86–90 | ver tabela abaixo | — | T |
| Cenas: Combate, Descanso, Interação, Tensão; Ordem de Ação por Velocidade | 116–120 | `iniciarCena`, `ordemDeAcao` | Adiar, trocar na Tensão | T, N |
| Fileiras e alcance (casas) | 117–118 | `casaDoAlvo`, `noAlcance` | posições | T, N |
| Escapar: sucessos ≥ Grau (várias: maior + número) | 87 (83) | `sucessosParaEscapar`; conta na ficha | o Conhecimento | T |

### Farol e escuridão (pp. 80–81)

| Regra | p. (PDF) | Automático | Escolha | Verif. |
|---|---|---|---|---|
| O Farol (quem leva a luz); problemas de posição; luz derrubada | 80 (76) | `problemasDoFarol` | quem é o Farol | T, N |
| Fonte de Luz: 1 cena ou 6 rodadas; Combustível +1 cena/+6 rodadas; Efetividade dobra | 69, 80 | consumo por rodada (combate/Tensão) e por cena | abastecer | T |
| Apagou: até o fim da próxima rodada para reacender; depois 1D6 de Escuridão | 81 (77) | `fimDaRodada` da mesa | — | T |
| Escuridão vence: todas Fora de Ação e mortas | 81 (77) | evento para a Testemunha | — | T |

### Ações específicas

| Ação | Tipo | p. (PDF) |
|---|---|---|
| Acelerar | regular | 86 (82) |
| Ajudar | regular | 86 (82) |
| Analisar | regular | 86 (82) |
| Atacar | regular | 86 (82) |
| Descansar | completa | 86 (82) |
| Distrair | regular | 86 (82) |
| Escapar | regular|completa | 87 (83) |
| Fabricar | completa | 87 (83) |
| Mirar | completa | 89 (85) |
| Preparar | regular+extra | 89 (85) |
| Seguir em Frente | regular | 90 (86) |
| Resgatar | regular | 90 (86) |
| Sacrificar | extra | 90 (86) |

Automáticas: Acelerar (Velocidade dobrada, 1D4 cumulativo acima do Fôlego),
Preparar, Seguir em Frente, Resgatar, Sacrificar, Analisar (bônus de metade de
Mente contra o alvo, um por alvo), Escapar, Fabricar, Descansar, Mirar, Atacar.
Ajudar e Distrair entram como bônus/dificuldade do teste.

### Habilidades (25)

| Habilidade | Papel · tipo | Ação | p. impressa (PDF) | Automação |
|---|---|---|---|---|
| Voracidade | Quem Age · principal | passiva | 55 (51) | passiva: dano (composicaoDoDano) |
| Ataque em Dupla | Quem Age · unica | completa | 55 (51) | botão Usar → `RAMAOblivioHabilidades.usar` (limites, custos, alvos no servidor) |
| Estocada | Quem Age · unica | regular+movimento | 55 (51) | botão Usar → `RAMAOblivioHabilidades.usar` (limites, custos, alvos no servidor) |
| Sede de Sangue | Quem Age · unica | passiva | 55 (51) | passiva: servidor, ao eliminar |
| Ajudar os Necessitados | Quem Cuida · principal | extra | 57 (53) | botão Usar → `RAMAOblivioHabilidades.usar` (limites, custos, alvos no servidor) |
| Abrir Feridas | Quem Cuida · unica | regular | 57 (53) | botão Usar → `RAMAOblivioHabilidades.usar` (limites, custos, alvos no servidor) |
| Bálsamo | Quem Cuida · unica | regular | 57 (53) | botão Usar → `RAMAOblivioHabilidades.usar` (limites, custos, alvos no servidor) |
| Última Esperança | Quem Cuida · unica | regular | 57 (53) | botão Usar → `RAMAOblivioHabilidades.usar` (limites, custos, alvos no servidor) |
| Escudo Humano | Quem Protege · principal | passiva | 59 (55) | passiva: Proteção do grupo (servidor, bonusDeGrupo) |
| Armadura de Espinhos | Quem Protege · unica | passiva | 59 (55) | ao receber um acerto corpo a corpo, o servidor registra para a Testemunha o teste do atacante e o dano (metade de Carne, mín. 1) |
| Peso Pesado | Quem Protege · unica | passiva | 59 (55) | passiva: dano corpo a corpo |
| Repartir a Dor | Quem Protege · unica | passiva | 59 (55) | passiva: a mesa indica quem pode dividir (`podeRepartirADor`); a divisão é decisão das duas Personas |
| Dar uma Mãozinha | Quem Resolve · principal | extra | 61 (57) | escolha na falha de um teste ou dado de ataque (`darUmaMaozinha`): 1D6, 4–6 vira sucesso; 1–3 o Estresse vai para Quem Resolve |
| Animar os Ânimos | Quem Resolve · unica | extra | 61 (57) | botão Usar → `RAMAOblivioHabilidades.usar` (limites, custos, alvos no servidor) |
| Cópia Barata | Quem Resolve · unica | extra | 61 (57) | botão Usar → `RAMAOblivioHabilidades.usar` (limites, custos, alvos no servidor) |
| Instrução Decisiva | Quem Resolve · unica | regular | 61 (57) | botão Usar → `RAMAOblivioHabilidades.usar` (limites, custos, alvos no servidor) |
| Repertório de Conhecimento | Quem Sabe · principal | extra | 63 (59) | botão Usar → `RAMAOblivioHabilidades.usar` (limites, custos, alvos no servidor) |
| Feedback Defensivo | Quem Sabe · unica | regular | 63 (59) | botão Usar → `RAMAOblivioHabilidades.usar` (limites, custos, alvos no servidor) |
| Plano de Contingência | Quem Sabe · unica | extra | 63 (59) | botão Usar → `RAMAOblivioHabilidades.usar` (limites, custos, alvos no servidor) |
| Ponto Fraco | Quem Sabe · unica | regular | 63 (59) | botão Usar → `RAMAOblivioHabilidades.usar` (limites, custos, alvos no servidor) |
| Aprender com a Prática | Geral · geral | passiva | 64 (60) | passiva: aquisição |
| Aumento de Atributo | Geral · geral | passiva | 64 (60) | passiva: atributos ao adquirir |
| Cão Velho | Geral · geral | passiva | 64 (60) | passiva: imunidade a uma Mazela |
| Saber é Poder | Geral · geral | passiva | 64 (60) | passiva: especialização extra |
| Todos por Um | Geral · geral | completa | 65 (61) | botão Usar → `RAMAOblivioHabilidades.usar` (limites, custos, alvos no servidor) |

### Equipamentos (31)

Requisitos por peso (Leve: 1 região; Média: Força 5 e 2 regiões; Pesada: Força
e Carne 5 e 3 regiões; proteções Média Carne 5, Pesada Carne + Força 5), limites
de modificação por peso, Estresse de Duráveis e destruição: `regras.js`.

| Equipamento | Tipo · classe | Espaços | p. (PDF) |
|---|---|---|---|
| Bomba Atordoante | consumivel · bomba | 1 | 67 (63) |
| Bomba de Estalo | consumivel · bomba | 1 | 68 (64) |
| Bomba de Fumaça | consumivel · bomba | 1 | 68 (64) |
| Bomba Incendiária | consumivel · bomba | 1 | 68 (64) |
| Fogueira | consumivel · luz | 3 | 69 (65) |
| Combustível | consumivel · luz | 1 | 69 (65) |
| Fonte de Luz | consumivel · luz | 1 | 69 (65) |
| Kit de Primeiros Socorros | consumivel · utilidade | 2 | 69 (65) |
| Kit de Reparos | consumivel · utilidade | 2 | 70 (66) |
| Estimulante | consumivel · utilidade | 1 | 70 (66) |
| Utensílio | consumivel · utilidade | 2 | 70 (66) |
| Ração | consumivel · utilidade | 2 | 70 (66) |
| Recurso | consumivel · recurso | 1 | 71 (67) |
| Munição | consumivel · utilidade | 1 | 71 (67) |
| Prótese | duravel · protese | 3 | 71 (67) |
| Arremessável | duravel · arma | 1 | 72 (68) |
| Disparo Médio | duravel · arma | 1 | 72 (68) |
| Lâmina Curta | duravel · arma | 1 | 72 (68) |
| Lâmina de Guerra | duravel · arma | 1 | 72 (68) |
| Taco | duravel · arma | 1 | 73 (69) |
| Corda | duravel · arma | 2 | 73 (69) |
| Disparo Longo | duravel · arma | 2 | 73 (69) |
| Lâmina Longa | duravel · arma | 2 | 74 (70) |
| Disparo Absoluto | duravel · arma | 3 | 74 (70) |
| Haste Grande | duravel · arma | 3 | 74 (70) |
| Escudo Leve | duravel · escudo | 1 | 75 (71) |
| Vestimenta Leve | duravel · vestimenta | 1 | 75 (71) |
| Escudo Médio | duravel · escudo | 2 | 75 (71) |
| Vestimenta Média | duravel · vestimenta | 2 | 76 (72) |
| Escudo Pesado | duravel · escudo | 3 | 76 (72) |
| Vestimenta Pesada | duravel · vestimenta | 3 | 76 (72) |

### Modificações (15) e fabricação (pp. 77–79, 88)

Limite por item: consumível 1, leve 2, média 3, pesada 4; cada modificação ocupa
+1 espaço guardada. Fabricar: Ação Completa, teste de Saber, Recursos pelo
custo; sem Kit de Reparos, o item sai pela metade.

| Modificação | Serve em | p. (PDF) |
|---|---|---|
| Bandoleira | {"exceto":["vestimenta"]} | 77 (73) |
| Contrapeso | {"classes":["arma","escudo"],"pesos":["media","pesada"]} | 78 (74) |
| Efetividade | {"tipos":["consumivel"]} | 78 (74) |
| Radiante | {"classes":["arma","escudo","vestimenta"]} | 78 (74) |
| Vida Longa | {"tipos":["consumivel"],"excetoClasses":["bomba"]} | 78 (74) |
| Empunhadura | {"classes":["arma"]} | 78 (74) |
| Extensão | {"classes":["arma"],"alcanceAte":"longo"} | 78 (74) |
| Incendiária | {"classes":["arma"]} | 78 (74) |
| Mortal | {"classes":["arma"],"alcanceAte":"longo"} | 79 (75) |
| Suporte de Carregador | {"classes":["arma"],"disparo":true} | 79 (75) |
| Amarra | {"classes":["escudo"]} | 79 (75) |
| Bélica | {"classes":["escudo"]} | 79 (75) |
| Espaçosa | {"classes":["vestimenta"]} | 79 (75) |
| Reforço | {"classes":["escudo","vestimenta"]} | 79 (75) |
| Versátil | {"classes":["vestimenta"]} | 79 (75) |

### Mazelas (14, pp. 91–94)

Os botões de remoção cobram o que o livro cobra: Ração sai do inventário, Kit de
Primeiros Socorros gasta um uso, Bálsamo é a habilidade (de quem a tem). Os
meios automáticos (próximo Estresse, dano zerado, dois turnos, Descanso) o motor
aplica sozinho.

| Mazela | Remoção | p. (PDF) |
|---|---|---|
| Botando para Fora | teste:esforco:regular, kitPrimeirosSocorros, balsamo | 91 (87) |
| Carne Fraca | proximoEstresse, balsamo | 91 (87) |
| Confusão | teste:esforco|rastro, balsamo | 91 (87) |
| Coragem Cega | proximoDanoSofrido, balsamo | 91 (87) |
| Ferida | kitPrimeirosSocorros, balsamo | 92 (88) |
| Fome | racao, balsamo | 92 (88) |
| Jura de Morte | teste:esforco, teste:bandidagem, derrotarOrigem, balsamo | 92 (88) |
| Lentidão | balsamo, descanso | 92 (88) |
| No Chão | acao:extra+movimento, balsamo | 93 (89) |
| No Escuro | luz | 93 (89) |
| Pavor | teste:emocional:aposEscapar, resgatar, balsamo | 93 (89) |
| Pegando Fogo | acao:regular+movimento, danoZerado, balsamo | 93 (89) |
| Sem Fôlego | teste:esforco:completa, balsamo | 94 (90) |
| Sem Reação | teste:rastro:aposPrimeiroTurno, doisTurnos, balsamo | 94 (90) |

### Fardos (1D6, p. 46)

| D6 | Fardo | Acúmulo | p. (PDF) |
|---|---|---|---|
| 1 | Guilhotina | acumula | 46 (42) |
| 2 | Deterioração | acumula | 46 (42) |
| 3 | Covardia | não acumula | 46 (42) |
| 4 | Mal das Pernas | acumula | 46 (42) |
| 5 | Fragilidade | não acumula | 46 (42) |
| 6 | Ataque Cardíaco | acumula | 46 (42) |

### Ameaças (18, pp. 121–150)

Ficha publicada usada como está (A1). Cada habilidade tem `efeito` estruturado
nos dados. Na aba da Testemunha, são automáticos: ataque (um dado por região
viva, até 5, as falhas cansam a Ameaça — A9), dano com Força Imparável, Couraça
Impenetrável, Muralha de Carne e Além Túmulo, perda de regiões de Enxame e Horda,
Mutação (1D6), derrota e retornos (Regeneração Maldita, Além Túmulo, Fim de
Todas as Coisas), Vida Longa ao Rei, Estrondo Final, regeneração no fim da
rodada, União dos Golfos, Apropriação Forçada, invocação por regiões, Quimera,
recompensa (1D6), Proteção Variável, Toque Corrosivo, Sede de Sangue das
Personas. As disputas específicas (Salto de Mola, Engolfar, Mão Leve…) aparecem
com o texto para a Testemunha conduzir com as ferramentas de teste.

| Ameaça | Grau | p. (PDF) | Habilidades com efeito estruturado |
|---|---|---|---|
| Golfo | 1 | 126 (122) | A União Faz a Força |
| Peste | 1 | 127 (123) | Ataque Peçonhento |
| Trombadinha | 1 | 128 (124) | Mão Leve |
| Carcaça | 2 | 129 (125) | Regeneração Maldita; Ataque (título repetido no livro) |
| Mortalha | 2 | 130 (126) | Além Túmulo; Assombrar a Carne |
| Mutágeno | 2 | 131 (127) | Mutação; Ataque (título repetido no livro) |
| Amálgama Golfada | 3 | 132 (128) | Toque Corrosivo; Disparo Catarrento; Engolfar |
| Cilada | 3 | 133 (129) | Salto de Mola; Surpresa!; De Mudança |
| Enxame | 3 | 134 (130) | Difícil de Acertar; Devorar os Restos; Atropelar |
| Coletor | 4 | 135 (131) | Muralha de Carne; Apropriação Forçada; Benefícios da Apropriação (título repetido no livro); Desabrochar Pútrido |
| Patógeno | 4 | 136 (132) | Resposta Imunológica; Seleção Natural; Sobrevivência do mais Apto; Baixa Imunidade |
| Quimera | 4 | 137 (133) | Infecção Perniciosa; Mau-Olhado; Bons Sonhos; Decifra-me ou Te Devoro |
| Errante | 5 | 140 (136) | Hematofagia; Proteção Variável; Sede de Sangue; Golpe do Carrasco; Marca do Caçador |
| Horda | 5 | 141 (137) | Força Imparável; Roda Punk; Destacar Forças; Maremoto; Passar por Cima |
| Rei dos Ratos | 5 | 143 (139) | Vida Longa ao Rei; Guardas!; A Nova Roupa do Rei; Decreto Real; Desfile da Coroa |
| A Forca | 6 | 145 (141) | Fim de Todas as Coisas; Hora da Morte; Marcado para Morrer; Balançar os Corpos; Sentença; Nó do Carrasco |
| Apogeu | 6 | 147 (143) | Ápice da Evolução; Couraça Impenetrável; Estrondo Final; Ataque Devastador; Zona de Impacto; Avanço (título repetido no livro) |
| Comensal | 6 | 149 (145) | Aura Pavorosa; Amedrontar; Acerto Fantasmagórico; Corromper os Fracos; Hora da Colheita; Última Trombeta |

### Buraco (pp. 99–115)

Todas as tabelas, com cada linha transformada em eventos estruturados
(`iniciarEncontro`, `tensao`, `teste`, `explosao`, `aposta`, `regraDoBuraco`,
`encontroPorGrau`, `contrabando`…): Entrada (1D12), Construção (1D100, acima de
60 rola de novo), Efeito (1D6), Missão (1D6) com o Objetivo de cada uma,
Armadilha, Encontro fácil/médio/difícil e a Dificuldade de Encontro (p. 104),
Infortúnio, Saída, Segredo, Tesouro. Na aba da Testemunha: construir, explorar,
entrar em carta ligada, "Preparar" um evento (rola e mostra o que fazer, põe
Ameaças no encontro ou abre a Tensão), marcar resolvido, sair; jogadores veem só
as cartas reveladas. Verificação: T (tabelas, regras de Efeito/Missão, Ache a
Saída, Fim da Linha, Déjà-vu, desmoronamento) e N.

---

## Interpretações adotadas

Leituras da implementação, não errata. As marcadas com ⚙ são **ajuste da
mesa** (ficha avulsa: aba Estado; campanha: aba Oblívio → Ajustes da mesa).

### Regras gerais (D)

- **D1 ⚙** Bônus de especialização: p. 40 diz +3, p. 48 (capítulo de Testes)
  diz +2. Padrão +2; a mesa pode escolher +3.
- **D2** Cenas de Interação e Descanso: as pp. 118–119 repetem o mesmo texto
  para as duas. Tratadas como cenas calmas distintas; o Descanso exige
  Fogueira (p. 69) e recupera 5 + Fôlego (p. 47).
- **D3** Textos das Mazelas na Ficha de Persona diferem do livro em detalhes.
  Vale o livro (pp. 91–94).
- **D4** Momento de volta do Fora de Ação: a ficha resume diferente do livro.
  Vale p. 45: 1ª vez volta no fim da próxima rodada com metade do limite; 2ª,
  no início da próxima cena com o Fôlego; 3ª na Missão, morte.
- **D5 ⚙** As tabelas de 1D6 e 2D6 impressas só na ficha não têm regras no
  livro (sem bônus, Coragem nem modificadores). Padrão: 1D20 do livro; as da
  ficha são modalidade alternativa, comparando só o resultado bruto.
- **D6 ⚙** "Teste de Fuga" (Armadura de Espinhos) não é Conhecimento. Padrão:
  Reflexos; ou a Testemunha decide.
- **D7** Coragem: o cálculo (Det + Men) / 2 é o valor INICIAL; depois ela é um
  saldo — recalcular a ficha nunca devolve o que foi gasto nem tira o ganho.
- **D8** Estresse conta para cima, de zero ao limite (p. 41), em todas as telas.
- **D9** Fardo: um por ocorrência de Fora de Ação. Quando o Buraco Mortal faz
  uma ocorrência contar duas vezes, rola-se um Fardo só ("a cada vez que ficar
  Fora de Ação").

### Combate (C)

- **C1** Acertar: o livro diz "igual ou superior" à Proteção e, noutro trecho,
  "mais sucessos". Adotado: sucessos acumulados contra o alvo ≥ Proteção.
- **C2** Proteção completa (recalculada da ficha ou da Ameaça, pode mudar) e
  restante (o desgaste) ficam separadas por alvo.
- **C3 ⚙** Desgaste parcial dura até o fim da cena (padrão) ou até o início do
  turno do próprio alvo.
- **C4** Mirar que erra desgasta a Proteção como um ataque comum, mas ESTE ataque
  não causa dano.
- **C5** Dano da arma exige arriscar a região que a empunha (Bandoleira
  dispensa) e o mínimo de regiões DISTINTAS do peso; senão, só o atributo.
- **C6** A Zona de Acerto compara o TOTAL (dado + bônus); total 1 ou menos é
  Falha Extrema.
- **C7** Reduzir Extremo nunca põe o mínimo do Extremo abaixo do mínimo do
  Sucesso Regular daquela dificuldade.
- **C8** Empate na Ordem de Ação fica na ordem de entrada; a Testemunha troca.
- **C9** Casas são posições na fileira (1ª Adjacente … 5ª+ Absoluto), não
  metros.
- **C10** Luz: uma medida só — 6 rodadas = 1 cena; fora de combate, cada cena
  nova gasta 6 rodadas de luz.

### Ameaças (A)

- **A1** Proteção, Dano, Velocidade e limite vêm da ficha publicada; não são
  recalculados pelas fórmulas da Persona.
- **A2** Carcaça e Mutágeno têm habilidades com o título genérico "Ataque";
  ganham chave própria por Ameaça. O alcance do ataque da Carcaça segue o
  cabeçalho (Curto), que diverge do texto (Adjacente).
- **A3** Cilada, Salto de Mola: o "(2)" impresso lido como 2 de Estresse por
  rodada enquanto agarrado.
- **A4** Títulos repetidos (Benefícios da Apropriação do Coletor, Avanço do
  Apogeu) ganham nome distinto.
- **A5 ⚙** Errante, Proteção Variável: com 3 Personas ou menos o bônus é
  "reduzido" sem dizer quanto. Padrão: metade; ou zero; ou a Testemunha decide.
- **A6** Recompensa "uma Haste": a única Haste do catálogo é a Grande.
- **A7** Regiões de Ameaça: o limite dividido igualmente; a sobra vai para a
  primeira. Só importa para Mirar e perdas de região.
- **A8** Enxame e Horda perdem regiões com dano grande de uma vez (o limiar
  publicado de cada uma).
- **A9** Ameaça ataca com um dado por região viva, até 5; as falhas também
  cansam a Ameaça (a mesma regra do teste da Persona).

### Buraco (B)

- **B1** Objetivo de "Destrua o Oculto": faixas impressas sobrepostas (Portal
  1; Relicário "3 a 5"; Ritual "5 ou 6"). Adotado: 1–2, 3–4, 5–6.
- **B2** A tabela de "Devolva ao Lar" está impressa com o título "Destrua o
  Oculto" pela segunda vez; o conteúdo é de Devolva ao Lar.
- **B3** Saída: Normal "2 a 5" e Emergência "5 ou 6". Adotado: Normal 2–4,
  Emergência 5–6.
- **B4** Drenagem lista Fôlego, Coragem e Velocidade (Mutáveis) entre atributos
  que "caem 1". Mantido como está nos dados (o 1D6 escolhe o atributo); a
  Testemunha aplica a queda — o motor não rebaixa Mutáveis por conta própria.
- **B5** A tabela de Segredo está impressa com o título "Tabela de Saída".

### Habilidades (H)

- **H1** Ataque em Dupla: os dois ataques são resolvidos um de cada vez contra o
  mesmo alvo; cada um causa dano se acertar.

### Outras leituras desta versão

- Na campanha, quem recebe um acerto de Ameaça escolhe a região e o Durável na
  ficha (p. 66–67, "à escolha de quem recebe"); a Testemunha pode aplicar por
  ela se a pessoa não estiver na mesa.
- Analisar: o bônus (metade de Mente de quem analisou) vale num dado dos ataques
  de qualquer Persona contra o alvo analisado, até o fim da cena.
- Escapar: o livro não fixa o Conhecimento; a tela sugere Reflexos e deixa
  trocar.

---

## Lacunas do PDF

Nada foi inventado para cobri-las: viram escolha da Testemunha.

| Lacuna | p. (PDF) |
|---|---|
| A p. 12 remete à "página XX" para variações da Zona de Acerto. | 12 (10) |
| "Partida Solo", no capítulo A Testemunha, não está no PDF. | 8 (6) |
| O capítulo "Ameaças de Jogo" (criar Ameaças, usado pela Quimera) não está no PDF. | 137 (133) |
| "Histórias de Acampamento", de Quem Resolve, é citada no Descanso mas não existe na lista do Papel. | 119 (115) |
| "Bater em Retirada", de Quem Resolve, é citada nas Cenas de Combate mas não existe na lista do Papel. | 117 (113) |
| "Equipamento Corrompido" (Mortalha, Comensal, Devolva ao Lar) não é definido. | 130 (126) |
| A recompensa do Errante dá "Lâmina Grande", que não está no catálogo. | 144 (140) |
| "Revoada" (invocada pelo Comensal) não tem ficha. | 150 (146) |
| "Devaneio" (Aura Pavorosa do Comensal) não tem ficha. | 149 (145) |
| "Carniçal" aparece nos exemplos, sem ficha. | 43 (39) |
| O efeito "Perseguidor" (Pique-Pega) não é definido. | 109 (105) |
| "Cegueira" é citada como Fardo que não acumula, mas não está na tabela. | 45 (41) |
| Os pontos de Infecção da Carcaça são definidos só no ataque dela. | 129 (125) |

---

## Verificação

Ver a seção "Verificação da v3.0.0" no fim deste arquivo (números dos testes e
o que segue pendente).

### Verificação da v3.0.0

**Executado (28/10/2026), com dados sintéticos:**

- `testes/executar-oblivio.js` — 494 verificações (motor: criação, cálculo,
  Estresse, Coragem, Mazelas, Fora de Ação, Fardos, inventário, modificações,
  fabricação, testes, ataque, Proteção, Ameaças, mesa, Farol, Buraco, as
  habilidades e as ações).
- `testes/executar-backend.js` — 1667 verificações, nos dois modos (normal e
  `--servico-avancado`); `testes/oblivio-backend.js` confere a cópia do motor no
  `.gs`, a ficha atravessando o servidor como Oblívio, a vista dos jogadores,
  permissões de `salvar_oblivio`/`oblivio_operar`, habilidade em aliado sem
  acesso à ficha dele, ataque a Ameaça com desgaste entre atacantes,
  momentos, repetição por opId, aliados e Escudo Humano no servidor, a mesa
  ligada em `ler_campanha` e o acerto recebido pela região escolhida.
- As demais suítes do projeto, sem regressão (ver o README).
- Revisão no navegador (servidor local `testes/servidor-local.js`, contas de
  teste): escolha de sistema com as capas; criação guiada nas 8 etapas até a
  ficha; abas Persona, Testes (teste de Duelo; ataque com 2 regiões, compra de
  sucesso, conclusão e dano), Inventário, Estado (Descanso com Fogueira → Fome e
  Carne Fraca); a aba Oblívio da campanha (ligar a mesa, Golfos e União,
  construção do Buraco, exploração, evento de Armadilha → Cena de Tensão, turnos
  e rodadas); a ficha vinculada à campanha pelo modo Edição, com a faixa "Na
  mesa" e um ataque à Amálgama da mesa resolvido pelo servidor (desgaste da
  Proteção, Carne Fraca dobrando o Estresse das falhas); Modern20; largura de
  celular (375 px) sem rolagem horizontal.

**Pendente (não validado nesta entrega):**

- Implantação real no Apps Script e na planilha (criação da aba
  `CAMPANHA_OBLIVIO` pelo `setupRama()` e as rotas novas numa implantação nova).
- Duas pessoas jogando ao mesmo tempo em aparelhos diferentes (a lógica é
  coberta pelos testes do backend; a experiência em tempo real, não).
- No navegador, com duas Personas na mesma campanha: habilidade num aliado, o
  acerto de uma Ameaça escolhido na ficha e o Escudo Humano na faixa "Na mesa"
  (cobertos pelos testes do servidor, não clicados na tela).
- Leitor de tela real (a estrutura acessível foi conferida no DOM, não com um
  leitor).
