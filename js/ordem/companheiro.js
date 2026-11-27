/* =====================================================================
   R.A.M.A. — Ordem Paranormal · Companheiro Animal (v9.25.0)
   =====================================================================
   O motor da ficha jogável de companheiro animal, do suplemento de fã
   "Melhor Amigo da Ordem", de @_Lesm0_ (conteúdo de fã, não oficial).

   ONDE MORA. Um aliado da ficha de Ordem com `tipo: "companheiro"` e um
   bloco `companheiro` (sem `criatura`): uma ficha só por companheiro,
   dentro da ficha do tutor. Nada vira Homebrew, personagem solto ou
   combatente.

   UMA ESCOLHA POR MARCO, PELO ID. Toda decisão fica em
   `companheiro.escolhas[<id da vaga>]` — "atr.30", "poder.20",
   "grau.35", "elo.50", "cresc.15", "conexao"… O que se GANHA (PV, PE,
   COR, pontos, poderes) é CALCULADO de novo a cada leitura a partir do
   estado e das escolhas: reabrir, sincronizar, confirmar duas vezes ou
   recalcular nunca concede nada outra vez. Uma escolha de Elo continua
   guardada se o Elo cair (fica inativa) e volta quando ele sobe.

   DECISÕES DE INTERPRETAÇÃO (as divergências do próprio suplemento):
     · especialização escolhida em 5% (pacote de perícias e
       proficiências); a primeira habilidade dela chega em 10%;
     · poderes gerais em 20/50/80 (a linha de 60% da tabela não dá um
       quarto); grau de treinamento em 35/70 (a de 75% não dá novo);
     · cada habilidade no marco escrito nela (Agressor: 70%; Pata Amiga e
       Caçada: 65%; o dado de Presa Fácil sobe em 70%);
     · errata: "Agressividade" (perícia) é Luta; Distrair custa 3 PE;
     · Elo: escolhas em 20/50/80, habilidades fixas em 30/60/90/100.

   Este arquivo é puro: não desenha nem grava. As telas estão em
   js/ordem/telas/companheiro-ficha.js e companheiro-criar.js.
   ===================================================================== */

(function (global) {
  "use strict";

  var NEX = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 99];
  var ATRIBUTOS = [
    { chave: "agi", sigla: "AGI", nome: "Agilidade" },
    { chave: "for", sigla: "FOR", nome: "Força" },
    { chave: "int", sigla: "INT", nome: "Intelecto" },
    { chave: "pre", sigla: "PRE", nome: "Presença" },
    { chave: "vig", sigla: "VIG", nome: "Vigor" },
  ];
  var CHAVES_ATR = ATRIBUTOS.map(function (a) { return a.chave; });
  var ELEMENTOS = [
    { chave: "sangue", nome: "Sangue" }, { chave: "morte", nome: "Morte" },
    { chave: "conhecimento", nome: "Conhecimento" }, { chave: "energia", nome: "Energia" },
  ];

  function atr(agi, fo, int, pre, vig) { return { agi: agi, "for": fo, int: int, pre: pre, vig: vig }; }

  /* Porte: atributos iniciais, tetos, recursos (inicial / ganho por marco),
     carga e desarmado. */
  var PORTES = [
    { chave: "minusculo", nome: "Minúsculo", tamanho: "até cerca de 20 cm", base: atr(3, 0, 1, 1, 0), tetos: atr(5, 2, 5, 5, 2),
      pv: [6, 1], pe: [6, 5], cor: [18, 6], cargaFor: 1, cargaZero: 0, desarmado: "1", voraz: ["1d4", "1d6", "1d8"] },
    { chave: "pequeno", nome: "Pequeno", tamanho: "até cerca de 50 cm", base: atr(2, 0, 1, 1, 1), tetos: atr(5, 3, 4, 4, 3),
      pv: [8, 2], pe: [4, 4], cor: [16, 5], cargaFor: 2, cargaZero: 1, desarmado: "1d2", voraz: ["1d6", "1d8", "1d10"] },
    { chave: "medio", nome: "Médio", tamanho: "até cerca de 1,50 m", base: atr(1, 1, 1, 1, 1), tetos: atr(4, 4, 4, 4, 4),
      pv: [12, 3], pe: [3, 3], cor: [14, 4], cargaFor: 4, cargaZero: 2, desarmado: "1d3", voraz: ["1d8", "1d10", "1d12"] },
    { chave: "grande", nome: "Grande", tamanho: "a partir de cerca de 1,50 m", base: atr(1, 1, 1, 1, 1), tetos: atr(4, 5, 4, 4, 5),
      pv: [16, 4], pe: [2, 2], cor: [12, 3], cargaFor: 5, cargaZero: 2, desarmado: "1d4", voraz: ["1d8", "1d10", "1d12"] },
  ];
  var CHAVES_PORTE = PORTES.map(function (p) { return p.chave; });
  function porte(chave) { return PORTES[Math.max(0, CHAVES_PORTE.indexOf(chave))]; }

  var PERICIAS = [
    { chave: "acrobacia", nome: "Acrobacia", atributo: "agi", carga: true, ordem: "acrobacia" },
    { chave: "atletismo", nome: "Atletismo", atributo: "for", ordem: "atletismo" },
    { chave: "crime", nome: "Crime", atributo: "agi", treinada: true, carga: true, ordem: "crime", semUsos: ["arrombar", "sabotar"] },
    { chave: "docura", nome: "Doçura", atributo: "pre" },
    { chave: "fortitude", nome: "Fortitude", atributo: "vig", ordem: "fortitude" },
    { chave: "furtividade", nome: "Furtividade", atributo: "agi", carga: true, ordem: "furtividade" },
    { chave: "iniciativa", nome: "Iniciativa", atributo: "agi", ordem: "iniciativa" },
    { chave: "instinto", nome: "Instinto", atributo: "pre", ordem: "intuicao" },
    { chave: "intimidacao", nome: "Intimidação", atributo: "pre", ordem: "intimidacao", semUsos: ["coagir"] },
    { chave: "luta", nome: "Luta", atributo: "for", ordem: "luta" },
    { chave: "pontaria", nome: "Pontaria", atributo: "agi", ordem: "pontaria" },
    { chave: "reflexos", nome: "Reflexos", atributo: "agi", ordem: "reflexos" },
    { chave: "sentidos", nome: "Sentidos", atributo: "int", ordem: "percepcao" },
    { chave: "sobrevivencia", nome: "Sobrevivência", atributo: "int", ordem: "sobrevivencia", semUsos: ["montarAcampamento", "acampamento"] },
    { chave: "vontade", nome: "Vontade", atributo: "pre", ordem: "vontade" },
  ];
  var CHAVES_PERICIA = PERICIAS.map(function (p) { return p.chave; });
  function pericia(chave) { return PERICIAS.filter(function (p) { return p.chave === chave; })[0] || null; }

  /* Usos próprios (o resto vem dos usos compatíveis de Ordem). */
  var USOS_PROPRIOS = {
    docura: [
      { nome: "Acalmar", treinada: true, texto: "Ação padrão, DT 20 (+5 por uso anterior de Acalmar sobre o mesmo alvo na cena). Estabiliza um personagem adjacente enlouquecendo, que fica com SAN 1." },
      { nome: "Encantar", treinada: true, texto: "Teste oposto pela Vontade do alvo: ele fica fascinado por uma rodada." },
      { nome: "Mudar Atitude", texto: "Teste oposto pela Vontade do alvo, levando um minuto (ou ação completa com –2d20), uma vez por alvo por dia. Sucesso melhora a atitude em uma categoria (duas com margem de 10); falha por 5 ou mais piora uma." },
    ],
    instinto: [
      { nome: "Sentir Ameaça", texto: "Sem treinamento, DT 15 + 1 por 20 de VD. Também cobre os usos de Intuição." },
    ],
    sentidos: [
      { nome: "Farejar", texto: "Perceber odores, DT de 15 a 30 conforme a dificuldade. Também cobre os usos de Percepção." },
    ],
  };

  var GRAUS = [
    { chave: "destreinado", nome: "Destreinado", bonus: 0 },
    { chave: "treinado", nome: "Treinado", bonus: 5 },
    { chave: "veterano", nome: "Veterano", bonus: 10 },
    { chave: "expert", nome: "Expert", bonus: 15 },
  ];

  /* ---------------- origens ---------------- */

  var ORIGENS = [
    { chave: "selvagem", nome: "Animal selvagem", pericias: ["sobrevivencia", "furtividade"], beneficio: "Sobrevivente", texto: "+1 PV máximo por marco de NEX, incluindo o inicial." },
    { chave: "rua", nome: "Animal de rua", pericias: ["luta", "furtividade"], beneficio: "Lixo de Cada Dia", texto: "Procura comida no lixo como ação livre, uma vez por cena, e recupera 1d6 PV.", acao: { custo: 0, cena: 1, cura: "1d6", recurso: "pv" } },
    { chave: "palco", nome: "Animal de palco", pericias: ["acrobacia", "docura"], beneficio: "Exibição", texto: "Em interlúdio, a exibição recupera 1d6 de Sanidade em quem assiste.", acao: { custo: 0, rolagem: "1d6", nota: "Sanidade recuperada por quem assiste (na ficha de cada um)." } },
    { chave: "farejador", nome: "Animal farejador", pericias: ["sentidos", "iniciativa"], beneficio: "Farejar", texto: "2 PE, uma vez por cena de investigação: teste de Instinto ou Sentidos contra DT 20 para encontrar uma pista.", acao: { custo: 2, cena: 1 } },
    { chave: "guarda", nome: "Animal de guarda", pericias: ["luta", "intimidacao"], beneficio: "Corajoso", texto: "+1 COR máxima por marco de NEX, incluindo o inicial." },
    { chave: "cobaia", nome: "Animal cobaia", pericias: ["fortitude", "vontade"], beneficio: "Sequela", texto: "Escolha uma sequela: Paranormal, Laboratório, Química ou Militar." },
    { chave: "domestico", nome: "Animal doméstico", pericias: ["docura", "iniciativa"], beneficio: "Lar Doce Lar", texto: "Em interlúdio confortável, recupera PV e COR sem consumir ação do interlúdio: 1d6, mais 1d6 por 30% de NEX.", acao: { custo: 0, curaPorNex: true } },
    { chave: "longaData", nome: "Amigo de longa data", pericias: ["vontade", "iniciativa"], beneficio: "Velhos Tempos", texto: "+10 pontos percentuais de Elo inicial." },
    { chave: "corrida", nome: "Animal de corrida", pericias: ["atletismo", "iniciativa"], beneficio: "Rumo ao Pódio", texto: "+3 m de deslocamento e +5 no teste da ação Corrida." },
    { chave: "trabalho", nome: "Animal de trabalho", pericias: ["atletismo", "fortitude"], beneficio: "Esforço", texto: "Em teste de esforço físico que não seja ataque, pode gastar 1 PE para receber +3.", acao: { custo: 1 } },
    { chave: "crime", nome: "Companheiro de crime", pericias: ["crime", "instinto"], beneficio: "Pickpockpet", texto: "O animal e o tutor recebem +3 em Enganação, Crime e Furtividade contra um alvo de quem ambos estejam próximos. Não cria perícia permanente fora da lista do animal." },
    { chave: "rinha", nome: "Animal de rinha", pericias: ["luta", "fortitude"], beneficio: "Cólera do Campeão", texto: "+2 cumulativo em ataques cada vez que o animal sofre um ataque, até +6, até o fim do combate." },
    { chave: "carga", nome: "Animal de carga", pericias: ["atletismo", "fortitude"], beneficio: "Carga Pesada", texto: "+1 espaço por ponto de FOR." },
    { chave: "rebanho", nome: "Animal de rebanho", pericias: ["docura", "vontade"], beneficio: "Bando", texto: "+2 nos testes enquanto houver pelo menos dois aliados em alcance curto." },
  ];
  function origem(chave) { return ORIGENS.filter(function (o) { return o.chave === chave; })[0] || null; }

  var SEQUELAS = [
    { chave: "paranormal", nome: "Paranormal", texto: "Recebe um poder paranormal e começa com metade da COR inicial (os ganhos futuros são normais)." },
    { chave: "laboratorio", nome: "Laboratório", texto: "RD física 2, +1 a cada 30% de NEX." },
    { chave: "quimica", nome: "Química", texto: "+5 em Intimidação e +5 em Fortitude contra venenos e químicos." },
    { chave: "militar", nome: "Militar", texto: "+2 nos ataques corpo a corpo; 2 PE no início da cena de ação para +5 em Reflexos até o fim do turno." },
  ];

  /* ---------------- especializações ---------------- */

  var ESPECIALIZACOES = [
    { chave: "agressor", nome: "Agressor", resumo: "Combate na linha de frente.",
      fixas: ["luta"], fixaEscolha: ["fortitude", "reflexos"], livres: 1, grau: 1,
      proficiencias: ["armas simples", "armas táticas", "armas pesadas", "proteções leves"],
      habilidades: [
        { marco: 10, chave: "combateAnimal", nome: "Combate Animal", texto: "+2 de dano e +2 na margem de ameaça dos ataques. O dano a mais cresce +1 a cada novo marco de 10% depois da aquisição." },
        { marco: 40, chave: "experienciaCampo", nome: "Experiência em Campo", custo: "1+", texto: "+5 para manobras, +1 por PE gasto (até +15). Após sucesso, pode gastar 4 PE por um ataque adicional contra o alvo." },
        { marco: 70, chave: "ataqueCadeia", nome: "Ataque em Cadeia", custo: 2, texto: "+2 na margem de ameaça. Ao acertar um crítico, pode gastar 2 PE por um ataque adicional contra inimigo em alcance curto." },
        { marco: 99, chave: "treinadoMatar", nome: "Treinado para Matar", custo: 2, texto: "Ao acertar, pode gastar 2 PE por +1 na margem de ameaça, cumulativo até +6 e até o fim da cena." },
      ] },
    { chave: "utilitario", nome: "Utilitário", resumo: "Apoio versátil: carrega, ajuda e resolve.",
      fixas: [], fixaEscolha: [], livres: 6, grau: 4,
      proficiencias: ["armas simples", "proteções leves"],
      habilidades: [
        { marco: 10, chave: "burroCarga", nome: "Burro de Carga", texto: "Escolha um atributo para somar à FOR no cálculo de carga. Um aliado a até 3 m pode retirar um item do inventário do animal como ação livre." },
        { marco: 40, chave: "pauObra", nome: "Pau pra Toda Obra", custo: 2, texto: "Por 2 PE e uma ação padrão, auxilia alguém adjacente: Cobertura (cobertura parcial e RD = VIG + 3 por grau em Fortitude), Apoio de Mira (+5 em Pontaria), Pézinho (levantar como ação livre ou +5 em Atletismo para subir muro), Obstáculo (+5 para derrubar o inimigo atrás do qual está) ou Arrastar (move um ser caído até metade do deslocamento)." },
        { marco: 65, chave: "pataAmiga", nome: "Pata Amiga", texto: "Um aliado adjacente pode aproveitar um kit ou utensílio do animal, com seus efeitos e +5 no teste. Item de cura usado adjacente ao companheiro cura um dado adicional do mesmo tipo." },
        { marco: 99, chave: "animalEspecialista", nome: "Animal Especialista", custo: 5, texto: "Por 5 PE, testa uma perícia humana (exceto Luta e Pontaria) com bônus de 3 × o atributo-base." },
      ] },
    { chave: "predador", nome: "Predador", resumo: "Furtivo e letal contra alvos desatentos.",
      fixas: ["furtividade"], fixaEscolha: [], livres: 3, grau: 2,
      proficiencias: ["armas simples", "armas táticas"],
      habilidades: [
        { marco: 10, chave: "presaFacil", nome: "Presa Fácil", custo: 1, texto: "Uma vez por rodada, por 1 PE, contra alvo desprevenido ou flanqueado: soma AGI à margem de ameaça e +1d6 ao dano (+2d6 em 40%, +3d6 em 70%, +4d6 em 99%)." },
        { marco: 40, chave: "predadorSilencioso", nome: "Predador Silencioso", custo: 2, texto: "Move-se em silêncio sem penalidade de deslocamento. Uma vez por rodada, após crítico contra alvo flanqueado ou desprevenido, pode gastar 2 PE por ataque adicional como ação livre." },
        { marco: 65, chave: "cacada", nome: "Caçada", custo: 3, texto: "Por 3 PE, escolhe um alvo em alcance curto: até o fim do próximo turno, +5 nos ataques contra ele, dobra o dano adicional de Presa Fácil e soma AGI à margem de ameaça contra ele." },
        { marco: 99, chave: "predadorPerfeito", nome: "Predador Perfeito", custo: 3, texto: "+5 em Furtividade, Luta, Sobrevivência e Sentidos. Por 3 PE, ignora a penalidade de –3d20 em Furtividade após ação chamativa." },
      ] },
  ];
  function especializacao(chave) { return ESPECIALIZACOES.filter(function (e) { return e.chave === chave; })[0] || null; }

  /* ---------------- poderes de companheiro (20/50/80) ---------------- */

  var PODERES = [
    { chave: "aumentoAtributo", nome: "Aumento de Atributo", texto: "+1 em um atributo. Só uma vez.", sub: "atributo" },
    { chave: "agressividadeVoraz", nome: "Agressividade Voraz", texto: "Ataque desarmado vira arma ágil, com dano maior por porte (sobe em NEX 30% e 70%)." },
    { chave: "animalApoio", nome: "Animal de Apoio", custo: 2, texto: "Ao Acalmar, uma vez por cena, 2 PE dão +5 no teste e recuperam 1d10 de Sanidade de quem foi acalmado." },
    { chave: "ataquePesado", nome: "Ataque Pesado", texto: "+1 dado do mesmo tipo no dano dos ataques. Dano fixo não tem dado do mesmo tipo até algum efeito lhe dar um." },
    { chave: "armamentoPesado", nome: "Armamento Pesado", texto: "Proficiência em armas pesadas ou táticas (escolha).", sub: "armamento" },
    { chave: "instintivo", nome: "Instintivo", custo: 2, texto: "2 PE para fazer um teste com Instinto no lugar da perícia. Um uso por cena, +1 a cada 30% de NEX." },
    { chave: "protecaoPesada", nome: "Proteção Pesada", texto: "Proficiência em proteções pesadas (se já tiver leves) ou em leves." },
    { chave: "reflexosDefensivos", nome: "Reflexos Defensivos", texto: "Soma AGI à Defesa e aos testes de resistência.", requisitos: [{ atributo: "agi", minimo: 2 }] },
    { chave: "tanqueAnimal", nome: "Tanque Animal", texto: "Soma VIG à Defesa e recebe RD igual a VIG.", requisitos: [{ atributo: "vig", minimo: 2 }] },
    { chave: "movimentoSelvagem", nome: "Movimento Selvagem", custo: 1, texto: "1 PE para ignorar a penalidade de deslocamento por terreno difícil ou escalada até o fim do turno.", requisitos: [{ umaTreinada: ["atletismo", "sobrevivencia"] }] },
    { chave: "superdotado", nome: "Superdotado", custo: 2, texto: "Em um teste de perícia, 2 PE para usar INT como atributo-base.", requisitos: [{ atributo: "int", minimo: 2 }] },
    { chave: "passosGato", nome: "Passos de Gato", texto: "+2 em Furtividade por espaço livre no inventário." },
    { chave: "intimidacaoSelvagem", nome: "Intimidação Selvagem", texto: "Soma PRE aos testes de Intimidação e +5 contra alvos com PRE menor." },
    { chave: "predadorNato", nome: "Predador Nato", custo: 2, texto: "Por 2 PE e ação de movimento, soma INT a Luta, Furtividade e Reflexos até o fim da cena.", requisitos: [{ atributo: "int", minimo: 2 }, { treinada: "sentidos" }, { treinada: "sobrevivencia" }] },
    { chave: "sentidosAgucados", nome: "Sentidos Aguçados", texto: "Soma INT aos testes de Sentidos; pode testar Sentidos para evitar ficar desprevenido diante de um ataque.", requisitos: [{ treinada: "sentidos" }] },
    { chave: "transcender", nome: "Transcender", repetivel: true, texto: "Recebe um poder paranormal elegível e não ganha COR neste marco de NEX.", sub: "paranormal" },
    { chave: "treinamentoPericia", nome: "Treinamento em Perícia", repetivel: true, texto: "Duas escolhas: treinar uma perícia, ou subir de treinado a veterano (a partir de 35%) ou de veterano a expert (a partir de 70%).", sub: "pericias" },
  ];
  function poderGeral(chave) { return PODERES.filter(function (p) { return p.chave === chave; })[0] || null; }

  /* ---------------- Elo ---------------- */

  var HABILIDADES_ELO = [
    { marco: 30, chave: "trabalhoEquipe", nome: "Trabalho em Equipe", custo: 3, texto: "Em cena de ação e alcance curto do tutor, gasta 3 PE por +3 em um teste (+5 com Elo 60%, +7 com 90%, +10 com 100%)." },
    { marco: 60, chave: "tudoPorAmigo", nome: "Tudo por um Amigo", custo: 5, texto: "Uma vez por cena, após falha do tutor, gasta 5 PE para conceder +1d20 àquele teste." },
    { marco: 90, chave: "juntosFim", nome: "Juntos até o Fim", custo: 2, texto: "Uma vez por cena, diante de dano fatal ao tutor a até duas vezes seu deslocamento, gasta 2 PE para protegê-lo, mesmo morrendo. Preso ou agarrado, +10 para se libertar." },
    { marco: 100, chave: "almasGemeas", nome: "Almas Gêmeas", texto: "A até 6 m um do outro, ambos têm +1d20 nos testes e redução de 1 nos gastos de PE." },
  ];
  var PODERES_ELO = [
    { chave: "auxiliarRecuo", nome: "Auxiliar Recuo", custo: 1, texto: "Por 1 PE, um cede sua ação de movimento e soma metade do seu deslocamento à próxima ação de movimento do outro." },
    { chave: "combateEquipe", nome: "Combate em Equipe", texto: "Adjacentes ao mesmo inimigo, ambos têm +2 no dano, mais +2 por 10% de NEX." },
    { chave: "ajudanteInvestigacao", nome: "Ajudante de Investigação", texto: "Juntos, o tutor soma o INT do animal aos testes de Investigação." },
    { chave: "retalhamento", nome: "Retalhamento", texto: "Quando o tutor sofre um ataque, o animal ganha +5 nos ataques contra o agressor até o fim da rodada." },
    { chave: "ataqueDuplo", nome: "Ataque Duplo", custo: 2, texto: "Após um crítico do tutor, o animal adjacente ao alvo pode gastar 2 PE para atacá-lo como reação." },
    { chave: "esforcoConjunto", nome: "Esforço Conjunto", texto: "Até 3 PE de um gasto podem ser assumidos pelo outro." },
    { chave: "apoioMoral", nome: "Apoio Moral", custo: 2, texto: "Até duas vezes por cena, o animal gasta 2 PE para dar +1d20 num teste do tutor." },
    { chave: "distrair", nome: "Distrair", custo: 3, texto: "Ao atacar, o tutor gasta 3 PE (errata) para deixar o alvo desprevenido para o animal." },
    { chave: "ombroAmigo", nome: "Ombro Amigo", custo: 2, texto: "Por 2 PE, um dá ao outro RD mental por uma rodada quando houver dano mental: 1d4, +1d4+1 a cada 30% de NEX." },
    { chave: "apoioRelampago", nome: "Apoio Relâmpago", texto: "+6 m de deslocamento quando o companheiro se move na direção do tutor." },
    { chave: "ameacaDobro", nome: "Ameaça em Dobro", texto: "Juntos, cada um pode somar a PRE do outro em Intimidação." },
    { chave: "finalizacaoConjunta", nome: "Finalização Conjunta", texto: "Com o companheiro adjacente ao alvo, o tutor ganha +25 pontos percentuais na chance do golpe de misericórdia." },
    { chave: "duplaCautelosa", nome: "Dupla Cautelosa", texto: "Contra alvo agarrado pelo companheiro, o tutor tem +1d20 nos ataques e ataca à distância sem acertar o companheiro." },
  ];
  var MARCOS_ELO = [20, 50, 80];
  var OBEDIENCIA = [
    { minimo: 70, texto: "Segue inclusive ordens perigosas." },
    { minimo: 40, texto: "Aceita ordens sem risco imediato evidente e, se estiver bem, coopera no interlúdio." },
    { minimo: 10, texto: "Aceita ordens seguras e divide as ações de interlúdio entre a ordem e suas necessidades." },
    { minimo: 0, texto: "Age por conta própria e foge se ameaçado." },
  ];
  var AJUSTES_ELO = [
    { valor: 3, texto: "Salvar o animal" }, { valor: 2, texto: "Vencer juntos um inimigo poderoso" },
    { valor: 1, texto: "Passar o interlúdio juntos" }, { valor: -1, texto: "Deixar de alimentá-lo" },
    { valor: -2, texto: "Expô-lo a risco de vida" },
  ];

  /* ---------------- paranormal ---------------- */

  var PARANORMAIS_PROPRIOS = [
    { chave: "comunicacaoTelepatica", nome: "Comunicação Telepática", elemento: "conhecimento", texto: "Envia ideias simples ao tutor em alcance curto.", afinidade: "Comunicação articulada com qualquer ser nesse alcance." },
    { chave: "compartilhamentoSensorial", nome: "Compartilhamento Sensorial", elemento: "conhecimento", texto: "O tutor entra em foco, fica inconsciente e percebe pelos sentidos do animal, exceto a visão. Pode exigir teste de Sentidos do animal.", afinidade: "Inclui a visão." },
    { chave: "sapiencia", nome: "Sapiência", elemento: "conhecimento", requisitos: [{ atributo: "int", minimo: 2 }], texto: "Habilita itens operacionais complexos e armas simples humanas.", afinidade: "Também armas táticas e itens paranormais." },
    { chave: "formaEterea", nome: "Forma Etérea", elemento: "energia", custo: 2, requisitos: [{ elemento: "energia", quantidade: 1 }], texto: "Por 2 PE e uma ação de movimento, atravessa um ser ou cobertura parcial em alcance curto.", afinidade: "Atravessar um ser causa 3d6 de Energia (Fortitude reduz à metade; DT de referência 20, ligada a AGI — a mesa pode ajustar)." },
    { chave: "repulsaoSonora", nome: "Repulsão Sonora", elemento: "energia", texto: "Empurra seres em alcance curto por 3 m.", afinidade: "6 m e 2d8 de Energia aos adjacentes (Fortitude reduz à metade; DT de referência 20, ligada a PRE — a mesa pode ajustar)." },
    { chave: "selvageriaCaotica", nome: "Selvageria Caótica", elemento: "energia", requisitos: [{ atributo: "agi", minimo: 2 }], texto: "+3 em Reflexos, Acrobacia, Iniciativa e ataques que usem AGI.", afinidade: "+1 AGI." },
    { chave: "instintoEspiral", nome: "Instinto Espiral", elemento: "morte", requisitos: [{ elemento: "morte", quantidade: 1 }], texto: "Adjacente ao alvo, ação livre e Instinto DT 15 + 1 por 20 de VD para prever a próxima ação dele.", afinidade: "Previsão passiva dá +5 para atacá-lo; previsão ofensiva dá +5 na Defesa contra a ação." },
    { chave: "secrecaoLodo", nome: "Secreção de Lodo", elemento: "morte", custo: 3, texto: "3 PE e ação de movimento: raio de 3 m; quem estiver em contato sofre –1 FOR e AGI.", afinidade: "Recebe 1 PE temporário por ser em contato, perdidos no fim do turno." },
    { chave: "transferirPotencial", nome: "Transferir Potencial", elemento: "morte", custo: 2, texto: "2 PE para transferir uma ação de movimento entre tutor e companheiro.", afinidade: "Pode transferir ação padrão." },
    { chave: "furiaBestial", nome: "Fúria Bestial", elemento: "sangue", custo: 3, requisitos: [{ elemento: "sangue", quantidade: 2 }], texto: "Uma vez por cena, 3 PE, três turnos: +1 AGI, +1 FOR, +3 em ataques, ignora terreno difícil e ataca o ser mais próximo, inclusive aliado.", afinidade: "Quatro turnos, +5 nos ataques e +1 dado no dano corpo a corpo." },
    { chave: "hiperfagia", nome: "Hiperfagia", elemento: "sangue", custo: 2, texto: "2 PE e ação padrão para consumir um ser morto até médio: recupera 1d6 PV por categoria de tamanho (1d6 para minúsculo).", afinidade: "Até enorme e +1 AGI, FOR e VIG por duas rodadas." },
    { chave: "metamorfo", nome: "Metamorfo", elemento: "sangue", custo: 2, texto: "2 PE e ação completa para mudar o porte; os atributos ficam limitados pelos tetos do porte assumido.", afinidade: "Ignora os tetos temporários." },
  ];

  /* Os poderes paranormais padrões de Ordem que servem ao animal: todos,
     menos Aprender Ritual e os de Transmissão (que dependem de regra e
     de ritual). */
  function paranormaisDeOrdem() {
    var P = global.RAMAOrdemPoderes;
    var lista = P && P.PODERES_PARANORMAIS ? P.PODERES_PARANORMAIS : [];
    return lista.filter(function (p) { return p.chave !== "aprenderRitual" && !p.transmissao && p.elemento !== "transmissao"; }).map(function (p) {
      var reqs = (p.requisitos || []).map(function (r) {
        if (r.tipo === "elemento") return { elemento: r.elemento, quantidade: r.quantidade };
        if (r.tipo === "atributo") return { atributo: r.atributo, minimo: r.minimo };
        if (r.tipo === "nex") return { nex: r.minimo };
        if (r.tipo === "treinado") {
          var doAnimal = PERICIAS.filter(function (x) { return x.ordem === r.pericia || x.chave === r.pericia; })[0];
          if (doAnimal) return { treinada: doAnimal.chave };
        }
        return { texto: r.texto || "Requisito do livro (conferir pela mesa)" };
      });
      return { chave: "ordem:" + p.chave, nome: p.nome, elemento: p.elemento || "", texto: p.resumo || "", afinidade: p.afinidade || "", requisitos: reqs, deOrdem: true, fonte: p.fonte, pagina: p.pagina };
    });
  }
  function paranormais() { return PARANORMAIS_PROPRIOS.concat(paranormaisDeOrdem()); }
  function paranormal(chave) { return paranormais().filter(function (p) { return p.chave === chave; })[0] || null; }

  /* ---------------- armas adaptadas ---------------- */

  function arma(nome, cat, dano, margem, mult, alcance, tipoDano, espacos, grupo, extra) {
    return Object.assign({ nome: nome, categoria: cat, dano: dano, margem: margem, multiplicador: mult, alcance: alcance, tipoDano: tipoDano, espacos: espacos, proficiencia: grupo }, extra || {});
  }
  var ARMAS = [
    arma("Corno acoplado", 0, "1d6", 20, 3, "corpoACorpo", "perfuração", 1, "simples", { agil: true }),
    arma("Garras metálicas", 0, "1d6", 19, 2, "corpoACorpo", "corte", 1, "simples", { agil: true }),
    arma("Patas contundentes", 0, "1d6", 20, 2, "corpoACorpo", "impacto", 1, "simples"),
    arma("Besta de suporte", 0, "1d8", 19, 2, "medio", "perfuração", 1, "simples", { nota: "Recarga: uma ação de movimento de terceiro a cada disparo." }),
    arma("Disparador de suporte", 0, "3d4", 19, 2, "curto", "balístico", 2, "simples", { nota: "Recarga: ação de movimento de terceiro a cada disparo. Metade do dano a partir de alcance médio." }),
    arma("Mandíbula de aço", 1, "1d8", 20, 3, "corpoACorpo", "perfuração", 1, "taticas"),
    arma("Garras de serra", 1, "1d8", 19, 2, "corpoACorpo", "corte", 1, "taticas", { agil: true }),
    arma("Balestra de suporte", 1, "1d12", 19, 2, "medio", "perfuração", 2, "taticas", { nota: "Recarga: ação de movimento de terceiro a cada disparo." }),
    arma("Espingarda montada", 2, "4d6", 20, 3, "curto", "balístico", 2, "taticas", { nota: "Recarga: ação de movimento de terceiro a cada dois disparos. Metade do dano a partir de alcance médio." }),
    arma("Aríete montado", 2, "1d12", 20, 2, "corpoACorpo", "impacto", 2, "pesadas", { nota: "+1 dado de dano contra objetos ou na manobra quebrar." }),
    arma("Lança de justa", 1, "1d10", 19, 2, "corpoACorpo", "perfuração", 2, "pesadas", { nota: "+5 no ataque em investida." }),
    arma("Balista montada", 2, "1d20", 19, 2, "medio", "perfuração", 3, "pesadas", { nota: "Disparo: ação padrão de terceiro. Recarga: ação de movimento a cada disparo." }),
    arma("Metralhadora montada", 2, "2d12", 19, 3, "medio", "balístico", 3, "pesadas", { automatica: true, nota: "Automática, operada por terceiro. –5 nos ataques se a FOR do companheiro for menor que 4." }),
  ];

  /* ---------------- normalizar ---------------- */

  function inteiro(v, p) { var n = parseInt(v, 10); return Number.isFinite(n) ? n : p; }
  function texto(v, n) { return String(v === undefined || v === null ? "" : v).slice(0, n); }
  function limitar(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function uuid() { return global.RAMAUtil && global.RAMAUtil.uuid ? global.RAMAUtil.uuid() : "c" + Math.random().toString(36).slice(2, 12); }

  function vazio() {
    return {
      versao: 1, nome: "", especie: "", aparencia: "", personalidade: "", historico: "",
      porteInicial: "medio", portePlanejado: "medio", crescimentos: [],
      nexIndice: 0, distribuicao: atr(0, 0, 0, 0, 0), zerado: "",
      origem: "", especializacao: "", escolhas: {},
      eloBase: 0, eloRegistro: [],
      recursos: { pv: null, pe: null, cor: null },
      trauma: { episodios: [], missao: "" },
      inventario: { itens: [] },
      anotacoes: "",
    };
  }

  function normalizarEscolha(v) {
    if (v === null || v === undefined) return undefined;
    if (Array.isArray(v)) return v.map(function (x) { return texto(x, 80); }).filter(Boolean).slice(0, 20);
    if (typeof v === "object") { var o = {}; Object.keys(v).slice(0, 10).forEach(function (k) { var n = normalizarEscolha(v[k]); if (n !== undefined) o[k] = n; }); return o; }
    return texto(v, 80);
  }

  function normalizar(bruto) {
    var b = bruto && typeof bruto === "object" ? bruto : {};
    var c = vazio();
    ["nome", "especie"].forEach(function (k) { c[k] = texto(b[k], 80).trim(); });
    ["aparencia", "personalidade", "historico"].forEach(function (k) { c[k] = texto(b[k], 3000); });
    c.anotacoes = texto(b.anotacoes, 10000);
    c.porteInicial = CHAVES_PORTE.indexOf(b.porteInicial) >= 0 ? b.porteInicial : "medio";
    var iIni = CHAVES_PORTE.indexOf(c.porteInicial);
    c.portePlanejado = CHAVES_PORTE.indexOf(b.portePlanejado) >= iIni ? b.portePlanejado : c.porteInicial;
    c.nexIndice = limitar(inteiro(b.nexIndice, 0), 0, NEX.length - 1);
    var vistos = {};
    c.crescimentos = (Array.isArray(b.crescimentos) ? b.crescimentos : []).map(function (g) { return { marco: limitar(inteiro(g && g.marco, 0), 0, NEX.length - 1) }; })
      .filter(function (g) { if (vistos[g.marco]) return false; vistos[g.marco] = true; return true; })
      .sort(function (a, b2) { return a.marco - b2.marco; })
      .slice(0, CHAVES_PORTE.indexOf(c.portePlanejado) - iIni);
    var d = b.distribuicao && typeof b.distribuicao === "object" ? b.distribuicao : {};
    CHAVES_ATR.forEach(function (k) { c.distribuicao[k] = limitar(inteiro(d[k], 0), -5, 5); });
    c.zerado = CHAVES_ATR.indexOf(b.zerado) >= 0 && porte(c.porteInicial).base[b.zerado] > 0 ? b.zerado : "";
    c.origem = origem(b.origem) ? b.origem : "";
    c.especializacao = especializacao(b.especializacao) ? b.especializacao : "";
    var e = b.escolhas && typeof b.escolhas === "object" ? b.escolhas : {};
    Object.keys(e).slice(0, 120).forEach(function (k) {
      if (!/^[a-z][A-Za-z0-9.:_-]{0,60}$/.test(k)) return;
      var n = normalizarEscolha(e[k]);
      if (n !== undefined && n !== "") c.escolhas[k] = n;
    });
    c.eloBase = limitar(inteiro(b.eloBase, 0), -100, 100);
    c.eloRegistro = (Array.isArray(b.eloRegistro) ? b.eloRegistro : []).slice(-50).map(function (r) {
      return { id: texto(r && r.id, 60) || uuid(), valor: limitar(inteiro(r && r.valor, 0), -100, 100), motivo: texto(r && r.motivo, 120), em: texto(r && r.em, 40) };
    });
    var rec = b.recursos && typeof b.recursos === "object" ? b.recursos : {};
    ["pv", "pe", "cor"].forEach(function (k) { c.recursos[k] = rec[k] === null || rec[k] === undefined || rec[k] === "" ? null : limitar(inteiro(rec[k], 0), -999, 9999); });
    var tr = b.trauma && typeof b.trauma === "object" ? b.trauma : {};
    c.trauma = {
      missao: texto(tr.missao, 60),
      episodios: (Array.isArray(tr.episodios) ? tr.episodios : []).slice(-30).map(function (x) {
        return { id: texto(x && x.id, 60) || uuid(), missao: texto(x && x.missao, 60), em: texto(x && x.em, 40),
          turnos: limitar(inteiro(x && x.turnos, 0), 0, 3), estado: ["aberto", "prolongado", "tratado"].indexOf(x && x.estado) >= 0 ? x.estado : "aberto", resolucao: texto(x && x.resolucao, 300) };
      }),
    };
    var I = global.RAMAOrdemInventario;
    var itens = b.inventario && Array.isArray(b.inventario.itens) ? b.inventario.itens : [];
    c.inventario = { itens: itens.filter(function (i) { return i && typeof i === "object"; }).slice(0, 60).map(function (i) {
      var item = { id: texto(i.id, 60) || uuid(), nome: texto(i.nome, 80) || "Item", tipo: ["item", "arma", "armadura"].indexOf(i.tipo) >= 0 ? i.tipo : "item", descricao: texto(i.descricao, 2000) };
      if (i.tipo === "arma") {
        item.dano = texto(i.dano, 20) || "1d4"; item.margem = limitar(inteiro(i.margem, 20), 2, 20); item.multiplicador = limitar(inteiro(i.multiplicador, 2), 1, 6);
        item.alcance = texto(i.alcance, 20) || "corpoACorpo"; item.tipoDano = texto(i.tipoDano, 30); item.proficiencia = ["simples", "taticas", "pesadas"].indexOf(i.proficiencia) >= 0 ? i.proficiencia : "simples";
        if (i.agil) item.agil = true; if (i.automatica) item.automatica = true; if (i.nota) item.nota = texto(i.nota, 300);
      }
      if (i.tipo === "armadura") { item.defesa = limitar(inteiro(i.defesa, 0), 0, 30); item.protecao = i.protecao === "pesada" ? "pesada" : "leve"; }
      item.espacos = Math.max(0, Math.min(99, Math.round((Number(String(i.espacos).replace(",", ".")) || 0) * 100) / 100));
      if (i.espacos === undefined || i.espacos === null || i.espacos === "") item.espacos = 1;
      item.quantidade = limitar(inteiro(i.quantidade, 1), 1, 999);
      item.categoria = i.categoria === null || i.categoria === undefined || i.categoria === "" ? null : limitar(inteiro(i.categoria, 0), 0, 4);
      if (i.vestido === true) item.vestido = true;
      if (i.empunhado === true) item.empunhado = true;
      return item;
    }) };
    void I;
    return c;
  }

  /* ---------------- o cálculo ---------------- */

  function porteNoMarco(c, k, inclusive) {
    var i = CHAVES_PORTE.indexOf(c.porteInicial);
    c.crescimentos.forEach(function (g) { if (inclusive ? g.marco <= k : g.marco < k) i++; });
    return PORTES[Math.min(i, PORTES.length - 1)];
  }

  function pontosIniciais(c) {
    var iIni = CHAVES_PORTE.indexOf(c.porteInicial), iFim = CHAVES_PORTE.indexOf(c.portePlanejado);
    return 2 - Math.max(0, iFim - iIni) + (c.zerado ? 1 : 0);
  }

  /* Os atributos de criação (base do porte inicial + distribuição). */
  function atributosIniciais(c) {
    var p = porte(c.porteInicial);
    var saida = {};
    CHAVES_ATR.forEach(function (k) { saida[k] = (k === c.zerado ? 0 : p.base[k]) + (c.distribuicao[k] || 0); });
    return saida;
  }

  function problemasDaDistribuicao(c) {
    var p = porte(c.porteInicial);
    var ini = atributosIniciais(c);
    var soma = CHAVES_ATR.reduce(function (s, k) { return s + (c.distribuicao[k] || 0); }, 0);
    var alvo = pontosIniciais(c);
    var lista = [];
    if (soma !== alvo) lista.push(alvo < 0 && soma > alvo
      ? "O crescimento planejado pede reduzir " + (soma - alvo) + " ponto(s) da base: diminua atributos até a soma dar " + alvo + "."
      : (soma < alvo ? "Faltam " + (alvo - soma) + " ponto(s) a distribuir." : "Pontos demais: tire " + (soma - alvo) + "."));
    CHAVES_ATR.forEach(function (k) {
      if (ini[k] < 0) lista.push(nomeAtr(k) + " não pode ficar abaixo de 0.");
      if (ini[k] > p.tetos[k]) lista.push(nomeAtr(k) + " passa do teto do porte (" + p.tetos[k] + ").");
    });
    if (alvo >= 0 && CHAVES_ATR.some(function (k) { return (c.distribuicao[k] || 0) < 0; })) lista.push("Só dá para tirar pontos da base zerando um atributo (que rende +1 ponto), ou quando o crescimento planejado pede a redução.");
    if (c.zerado && (c.distribuicao[c.zerado] || 0) > 0) lista.push(nomeAtr(c.zerado) + " foi zerado para ganhar um ponto: não recebe pontos.");
    return lista;
  }
  function nomeAtr(k) { var a = ATRIBUTOS.filter(function (x) { return x.chave === k; })[0]; return a ? a.sigla : k; }
  function nomeElemento(k) { var e = ELEMENTOS.filter(function (x) { return x.chave === k; })[0]; return e ? e.nome : k; }

  function marcoAtingido(c, nex) { return NEX[c.nexIndice] >= nex; }
  function indiceDoNex(nex) { return NEX.indexOf(nex); }

  /* Quem tem a perícia treinada pela criação (origem e especialização). */
  function treinosDeCriacao(c) {
    var o = origem(c.origem), e = especializacao(c.especializacao);
    var daOrigem = o ? o.pericias.slice() : [];
    var lista = daOrigem.slice();
    var subst = [];
    if (e) {
      var fixas = e.fixas.slice();
      var fixaEsc = e.fixaEscolha.length ? c.escolhas["esp.fixa"] : null;
      if (fixaEsc && e.fixaEscolha.indexOf(fixaEsc) >= 0) fixas.push(fixaEsc);
      fixas.forEach(function (p) {
        if (daOrigem.indexOf(p) >= 0) subst.push(p);
        else if (lista.indexOf(p) < 0) lista.push(p);
      });
      subst.forEach(function (p) {
        var s = c.escolhas["esp.subst." + p];
        if (s && lista.indexOf(s) < 0 && pericia(s)) lista.push(s);
      });
      var livres = Array.isArray(c.escolhas["esp.pericias"]) ? c.escolhas["esp.pericias"] : [];
      livres.forEach(function (p) { if (pericia(p) && lista.indexOf(p) < 0) lista.push(p); });
    }
    /* O que as perícias livres não podem repetir: tudo, menos elas. */
    var semLivres = daOrigem.slice();
    if (e) {
      e.fixas.concat(e.fixaEscolha.indexOf(c.escolhas["esp.fixa"]) >= 0 ? [c.escolhas["esp.fixa"]] : []).forEach(function (p) { if (semLivres.indexOf(p) < 0) semLivres.push(p); });
      subst.forEach(function (p) { var s2 = c.escolhas["esp.subst." + p]; if (s2 && semLivres.indexOf(s2) < 0) semLivres.push(s2); });
    }
    return { treinadas: lista, daOrigem: daOrigem, substituicoes: subst, semLivres: semLivres };
  }

  /* As vagas (decisões) pelo NEX, pelo Elo e pelas escolhas. Cada uma
     diz o marco, as opções e se a escolha guardada ainda vale. */
  function vagas(c, atributos, graus, opcoes) {
    var o = opcoes || {};
    var lista = [];
    var e = especializacao(c.especializacao);
    var org = origem(c.origem);
    var intIni = atributosIniciais(c).int;
    var tc = treinosDeCriacao(c);
    function vaga(v) { v.valor = c.escolhas[v.id]; lista.push(v); return v; }

    if (org && org.chave === "cobaia") {
      vaga({ id: "origem.sequela", marco: 5, tipo: "opcao", rotulo: "Sequela (Animal cobaia)", opcoes: SEQUELAS.map(function (s) { return { valor: s.chave, rotulo: s.nome, texto: s.texto }; }) });
      if (c.escolhas["origem.sequela"] === "paranormal") vaga({ id: "origem.paranormal", marco: 5, tipo: "paranormal", rotulo: "Poder paranormal da sequela" });
    }
    if (e) {
      if (e.fixaEscolha.length) vaga({ id: "esp.fixa", marco: 5, tipo: "opcao", rotulo: "Perícia fixa do " + e.nome, opcoes: e.fixaEscolha.map(function (p) { return { valor: p, rotulo: pericia(p).nome }; }) });
      tc.substituicoes.forEach(function (p) {
        vaga({ id: "esp.subst." + p, marco: 5, tipo: "pericia", rotulo: "Substituta de " + pericia(p).nome + " (já veio da origem)", excluir: tc.treinadas.filter(function (x) { return x !== c.escolhas["esp.subst." + p] || tc.daOrigem.indexOf(x) >= 0 || e.fixas.indexOf(x) >= 0 || x === c.escolhas["esp.fixa"]; }) });
      });
      var n = Math.max(0, e.livres + Math.max(0, intIni));
      vaga({ id: "esp.pericias", marco: 5, tipo: "pericias", quantidade: n, rotulo: n + " perícia(s) livre(s) do " + e.nome + " (" + e.livres + " + INT " + intIni + ")",
        excluir: tc.semLivres });
    }
    if (e && e.chave === "utilitario" && marcoAtingido(c, 10)) {
      vaga({ id: "hab.burroCarga", marco: 10, tipo: "opcao", rotulo: "Burro de Carga: atributo somado à FOR na carga",
        opcoes: ATRIBUTOS.filter(function (x) { return x.chave !== "for"; }).map(function (x) { return { valor: x.chave, rotulo: x.nome }; }) });
    }
    [30, 50, 90].forEach(function (nx) {
      if (marcoAtingido(c, nx)) vaga({ id: "atr." + nx, marco: nx, tipo: "atributo", rotulo: "+1 atributo (NEX " + nx + "%)", limite5: true });
    });
    c.crescimentos.forEach(function (g) {
      if (g.marco <= c.nexIndice) vaga({ id: "cresc." + NEX[g.marco], marco: NEX[g.marco], tipo: "atributo", rotulo: "+1 atributo pelo crescimento para " + porteNoMarco(c, g.marco, true).nome + " (NEX " + NEX[g.marco] + "%)" });
    });
    [20, 50, 80].forEach(function (nx) {
      if (!marcoAtingido(c, nx)) return;
      var v = vaga({ id: "poder." + nx, marco: nx, tipo: "poder", rotulo: "Poder de companheiro (NEX " + nx + "%)" });
      var p = poderGeral(v.valor);
      if (p && p.sub === "atributo") vaga({ id: "poder." + nx + ".atributo", marco: nx, tipo: "atributo", rotulo: "Atributo do Aumento de Atributo" });
      if (p && p.sub === "armamento") vaga({ id: "poder." + nx + ".armamento", marco: nx, tipo: "opcao", rotulo: "Armamento Pesado", opcoes: [{ valor: "pesadas", rotulo: "Armas pesadas" }, { valor: "taticas", rotulo: "Armas táticas" }] });
      if (p && p.sub === "paranormal") vaga({ id: "poder." + nx + ".paranormal", marco: nx, tipo: "paranormal", rotulo: "Poder paranormal do Transcender" });
      if (p && p.sub === "pericias") vaga({ id: "poder." + nx + ".pericias", marco: nx, tipo: "pericias", quantidade: 2, rotulo: "Treinamento em Perícia: duas escolhas", subir: true });
    });
    [35, 70].forEach(function (nx) {
      if (!marcoAtingido(c, nx) || !e) return;
      var n = Math.max(0, e.grau + Math.max(0, (atributos || atributosIniciais(c)).int));
      vaga({ id: "grau." + nx, marco: nx, tipo: "grau", quantidade: n, rotulo: "Grau de treinamento (NEX " + nx + "%): " + n + " perícia(s) sobem um grau" });
    });
    if (marcoAtingido(c, 50)) vaga({ id: "conexao", marco: 50, tipo: "opcao", rotulo: "Elemento da conexão (NEX 50%)", opcoes: ELEMENTOS.map(function (x) { return { valor: x.chave, rotulo: x.nome }; }) });
    var elo = o.elo !== undefined ? o.elo : 0;
    MARCOS_ELO.forEach(function (m) {
      if (c.escolhas["elo." + m] || elo >= m) {
        var v = vaga({ id: "elo." + m, marco: null, elo: m, tipo: "poderElo", rotulo: "Poder de Elo (" + m + "%)" });
        v.ativa = elo >= m;
      }
    });
    lista.forEach(function (v) { if (v.ativa === undefined) v.ativa = true; });
    void graus;
    return lista;
  }

  function cumpre(req, ctx) {
    if (req.atributo) return ctx.atributos[req.atributo] >= req.minimo;
    if (req.treinada) return GRAUS_IDX(ctx.graus[req.treinada]) >= 1;
    if (req.umaTreinada) return req.umaTreinada.some(function (p) { return GRAUS_IDX(ctx.graus[p]) >= 1; });
    if (req.elemento) return (ctx.porElemento[req.elemento] || 0) >= req.quantidade;
    if (req.nex) return NEX[ctx.c.nexIndice] >= req.nex;
    return true;
  }
  function GRAUS_IDX(g) { return Math.max(0, GRAUS.map(function (x) { return x.chave; }).indexOf(g)); }
  function textoDoRequisito(r) {
    if (r.atributo) return nomeAtr(r.atributo) + " " + r.minimo;
    if (r.treinada) return pericia(r.treinada).nome + " treinada";
    if (r.umaTreinada) return r.umaTreinada.map(function (p) { return pericia(p).nome; }).join(" ou ") + " treinada";
    if (r.elemento) return nomeElemento(r.elemento) + " " + r.quantidade;
    if (r.nex) return "NEX " + r.nex + "%";
    return r.texto || "";
  }

  /* Calcula tudo. `opcoes.tutor`: { limitesCategoria } (patente). */
  function calcular(bruto, opcoes) {
    var o = opcoes || {};
    var c = normalizar(bruto);
    var nexAtual = NEX[c.nexIndice];
    var portAtual = porteNoMarco(c, c.nexIndice, true);
    var org = origem(c.origem);
    var esp = especializacao(c.especializacao);
    var sequela = org && org.chave === "cobaia" ? c.escolhas["origem.sequela"] : "";

    /* Elo: o que a pessoa ajustou + Velhos Tempos. */
    var elo = limitar(c.eloBase + (org && org.chave === "longaData" ? 10 : 0), 0, 100);

    /* Atributos: criação, depois cada aumento pelo marco. */
    var atributos = atributosIniciais(c);
    var historico = [];
    var preVagas = vagas(c, atributos, null, { elo: elo });
    function somarAtributo(vagaId, k, motivo) {
      if (CHAVES_ATR.indexOf(k) < 0) return;
      atributos[k] += 1;
      historico.push({ vaga: vagaId, atributo: k, motivo: motivo });
    }
    preVagas.filter(function (v) { return v.tipo === "atributo" && v.valor; }).sort(function (a, b) { return a.marco - b.marco; }).forEach(function (v) {
      somarAtributo(v.id, v.valor, v.rotulo);
    });

    /* Perícias: criação, Treinamento em Perícia e graus, pela ordem dos marcos. */
    var graus = {};
    CHAVES_PERICIA.forEach(function (p) { graus[p] = "destreinado"; });
    var tc = treinosDeCriacao(c);
    tc.treinadas.forEach(function (p) { graus[p] = "treinado"; });
    function subir(p, nx) {
      var g = GRAUS_IDX(graus[p]);
      if (g === 0) graus[p] = "treinado";
      else if (g === 1 && nx >= 35) graus[p] = "veterano";
      else if (g === 2 && nx >= 70) graus[p] = "expert";
    }
    var eventosPericia = [];
    preVagas.forEach(function (v) {
      if (v.tipo === "pericias" && v.subir && Array.isArray(v.valor)) eventosPericia.push({ marco: v.marco, lista: v.valor, tipo: "treino" });
      if (v.tipo === "grau" && Array.isArray(v.valor)) eventosPericia.push({ marco: v.marco, lista: v.valor, tipo: "grau" });
    });
    eventosPericia.sort(function (a, b) { return a.marco - b.marco; }).forEach(function (ev) {
      ev.lista.slice(0, 20).forEach(function (p) {
        if (!pericia(p)) return;
        if (ev.tipo === "grau") { var g = GRAUS_IDX(graus[p]); if (g >= 1) subir(p, ev.marco); }
        else subir(p, ev.marco);
      });
    });

    /* Poderes escolhidos (gerais, paranormais, Elo). */
    var poderes = [];
    preVagas.filter(function (v) { return v.tipo === "poder" && v.valor; }).forEach(function (v) {
      var p = poderGeral(v.valor);
      if (p) poderes.push({ chave: p.chave, nome: p.nome, texto: p.texto, custo: p.custo, marco: v.marco, vaga: v.id });
    });
    function tem(chave) { return poderes.some(function (p) { return p.chave === chave; }); }

    var paranormaisEscolhidos = [];
    preVagas.filter(function (v) { return v.tipo === "paranormal" && v.valor; }).forEach(function (v) {
      var p = paranormal(v.valor);
      if (p) paranormaisEscolhidos.push({ chave: p.chave, nome: p.nome, elemento: p.elemento, texto: p.texto, afinidadeTexto: p.afinidade, custo: p.custo, marco: v.marco, vaga: v.id, deOrdem: !!p.deOrdem });
    });
    var conexao = c.escolhas.conexao && ELEMENTOS.some(function (x) { return x.chave === c.escolhas.conexao; }) && nexAtual >= 50 ? c.escolhas.conexao : "";
    /* A afinidade se manifesta na próxima aquisição de poder paranormal
       DEPOIS da conexão (NEX 50%). */
    var afinidade = conexao && paranormaisEscolhidos.some(function (p) { return p.marco > 50 || (p.marco === 50 && /^poder\.50/.test(p.vaga)); }) ? conexao : "";
    paranormaisEscolhidos.forEach(function (p) { p.comAfinidade = !!afinidade && p.elemento === afinidade; });
    if (paranormaisEscolhidos.some(function (p) { return p.chave === "selvageriaCaotica" && p.comAfinidade; })) { atributos.agi += 1; historico.push({ vaga: "afinidade", atributo: "agi", motivo: "Selvageria Caótica (afinidade)" }); }

    var porElemento = {};
    paranormaisEscolhidos.forEach(function (p) { if (p.elemento) porElemento[p.elemento] = (porElemento[p.elemento] || 0) + 1; });

    var podElo = [];
    preVagas.filter(function (v) { return v.tipo === "poderElo" && v.valor; }).forEach(function (v) {
      var p = PODERES_ELO.filter(function (x) { return x.chave === v.valor; })[0];
      if (p) podElo.push({ chave: p.chave, nome: p.nome, texto: p.texto, custo: p.custo, elo: v.elo, ativo: elo >= v.elo, vaga: v.id });
    });

    /* Recursos, marco a marco, com o porte de cada marco. */
    var p0 = porte(c.porteInicial);
    var corInicial = p0.cor[0];
    if (sequela === "paranormal") corInicial = Math.floor(corInicial / 2);
    var pv = p0.pv[0] + atributos.vig, pe = p0.pe[0] + atributos.pre, cor = corInicial;
    var linhas = [{ nex: 5, porte: p0.nome, pv: pv, pe: pe, cor: cor }];
    var semCor = {};
    preVagas.forEach(function (v) { if (v.tipo === "poder" && v.valor === "transcender") semCor[v.marco] = true; });
    for (var k = 1; k <= c.nexIndice; k++) {
      var pk = porteNoMarco(c, k, false);
      pv += pk.pv[1] + atributos.vig;
      pe += pk.pe[1] + atributos.pre;
      var gCor = semCor[NEX[k]] ? 0 : pk.cor[1];
      cor += gCor;
      linhas.push({ nex: NEX[k], porte: pk.nome, pv: pk.pv[1] + atributos.vig, pe: pk.pe[1] + atributos.pre, cor: gCor, semCor: !!semCor[NEX[k]] });
    }
    var marcos = c.nexIndice + 1;
    var extrasPv = [], extrasCor = [];
    if (org && org.chave === "selvagem") { pv += marcos; extrasPv.push({ fonte: "Sobrevivente", valor: marcos }); }
    if (org && org.chave === "guarda") { cor += marcos; extrasCor.push({ fonte: "Corajoso", valor: marcos }); }
    pv = Math.max(1, pv); pe = Math.max(0, pe); cor = Math.max(0, cor);

    /* Habilidades da especialização pelo marco escrito nelas. */
    var habilidades = esp ? esp.habilidades.map(function (h) { return Object.assign({}, h, { ativa: nexAtual >= h.marco }); }) : [];
    function habAtiva(chave) { return habilidades.some(function (h) { return h.chave === chave && h.ativa; }); }
    var habElo = HABILIDADES_ELO.map(function (h) { return Object.assign({}, h, { ativa: elo >= h.marco }); });
    var bonusEquipe = elo >= 100 ? 10 : elo >= 90 ? 7 : elo >= 60 ? 5 : 3;

    /* Inventário, carga e proteção. */
    var itens = c.inventario.itens;
    var protecao = itens.filter(function (i) { return i.tipo === "armadura" && i.vestido; });
    var defProtecao = protecao.reduce(function (s, i) { return s + (i.defesa || 0); }, 0);
    var forCarga = atributos["for"];
    if (habAtiva("burroCarga") && CHAVES_ATR.indexOf(c.escolhas["hab.burroCarga"]) >= 0) forCarga += atributos[c.escolhas["hab.burroCarga"]];
    var capacidade = forCarga <= 0 ? portAtual.cargaZero : forCarga * portAtual.cargaFor;
    if (org && org.chave === "carga") capacidade += Math.max(0, atributos["for"]);
    var ocupado = Math.round(itens.reduce(function (s, i) { return s + (i.empunhado ? Math.max(0, i.quantidade - 1) : i.quantidade) * i.espacos; }, 0) * 100) / 100;
    var sobrecarregado = ocupado > capacidade;
    var espacosLivres = Math.max(0, Math.floor(capacidade - ocupado));

    /* Proficiências. */
    var prof = esp ? esp.proficiencias.slice() : [];
    preVagas.forEach(function (v) {
      if (v.id.slice(-11) === ".armamento" && v.valor) prof.push(v.valor === "pesadas" ? "armas pesadas" : "armas táticas");
    });
    if (tem("protecaoPesada")) prof.push(prof.indexOf("proteções leves") >= 0 ? "proteções pesadas" : "proteções leves");
    prof = prof.filter(function (x, i, l) { return l.indexOf(x) === i; });

    /* Bônus por perícia. */
    var bonusPericia = {};
    function bonus(p, valor, fonte) { (bonusPericia[p] = bonusPericia[p] || []).push({ valor: valor, fonte: fonte }); }
    if (tem("intimidacaoSelvagem")) bonus("intimidacao", atributos.pre, "Intimidação Selvagem (PRE)");
    if (sequela === "quimica") bonus("intimidacao", 5, "Sequela Química");
    if (tem("sentidosAgucados")) bonus("sentidos", atributos.int, "Sentidos Aguçados (INT)");
    if (tem("passosGato")) bonus("furtividade", 2 * espacosLivres, "Passos de Gato (" + espacosLivres + " espaço(s) livre(s))");
    if (habAtiva("predadorPerfeito")) ["furtividade", "luta", "sobrevivencia", "sentidos"].forEach(function (p) { bonus(p, 5, "Predador Perfeito"); });
    if (paranormaisEscolhidos.some(function (p) { return p.chave === "selvageriaCaotica"; })) ["reflexos", "acrobacia", "iniciativa"].forEach(function (p) { bonus(p, 3, "Selvageria Caótica"); });
    if (tem("reflexosDefensivos")) ["fortitude", "reflexos", "vontade"].forEach(function (p) { bonus(p, atributos.agi, "Reflexos Defensivos (AGI)"); });

    var pericias = PERICIAS.map(function (p) {
      var g = GRAUS.filter(function (x) { return x.chave === graus[p.chave]; })[0];
      var extras = (bonusPericia[p.chave] || []).slice();
      if (p.carga && sobrecarregado) extras.push({ valor: -5, fonte: "Sobrecarregado" });
      var total = g.bonus + extras.reduce(function (s, x) { return s + x.valor; }, 0);
      return { chave: p.chave, nome: p.nome, atributo: p.atributo, valorAtributo: atributos[p.atributo], grau: g.chave, grauNome: g.nome, bonusGrau: g.bonus,
        extras: extras, total: total, treinada: !!p.treinada, podeUsar: !p.treinada || g.chave !== "destreinado", carga: !!p.carga,
        usos: (USOS_PROPRIOS[p.chave] || []).slice(), usosDeOrdem: p.ordem || "", semUsos: p.semUsos || [] };
    });

    /* Defesa, RD, deslocamento. */
    var partesDefesa = [{ fonte: "Base", valor: 10 }, { fonte: "AGI", valor: atributos.agi }];
    if (defProtecao) partesDefesa.push({ fonte: "Proteção vestida", valor: defProtecao });
    if (tem("reflexosDefensivos")) partesDefesa.push({ fonte: "Reflexos Defensivos (AGI)", valor: atributos.agi });
    if (tem("tanqueAnimal")) partesDefesa.push({ fonte: "Tanque Animal (VIG)", valor: atributos.vig });
    if (sobrecarregado) partesDefesa.push({ fonte: "Sobrecarregado", valor: -5 });
    var defesa = partesDefesa.reduce(function (s, x) { return s + x.valor; }, 0);
    var rd = [];
    if (sequela === "laboratorio") rd.push({ tipo: "física", valor: 2 + Math.floor(nexAtual / 30), fonte: "Sequela Laboratório" });
    if (tem("tanqueAnimal")) rd.push({ tipo: "todos", valor: atributos.vig, fonte: "Tanque Animal" });
    var deslocamento = 9 + (org && org.chave === "corrida" ? 3 : 0) + (sobrecarregado ? -3 : 0);

    /* Ataques: desarmado e armas. */
    var desarmadoDano = portAtual.desarmado;
    var desarmadoAgil = false;
    if (tem("agressividadeVoraz")) { desarmadoDano = portAtual.voraz[nexAtual >= 70 ? 2 : nexAtual >= 30 ? 1 : 0]; desarmadoAgil = true; }
    var combateAnimal = habAtiva("combateAnimal") ? 2 + Math.max(0, Math.floor((nexAtual - 10) / 10)) : 0;
    var margemExtra = (habAtiva("combateAnimal") ? 2 : 0) + (habAtiva("ataqueCadeia") ? 2 : 0);
    var presaDados = !habAtiva("presaFacil") ? 0 : nexAtual >= 99 ? 4 : nexAtual >= 70 ? 3 : nexAtual >= 40 ? 2 : 1;
    function ataque(nome, dano, margem, mult, alcance, agil, extra) {
      var corpo = alcance === "corpoACorpo";
      var pr = corpo ? "luta" : "pontaria";
      var per = pericias.filter(function (x) { return x.chave === pr; })[0];
      var bonusAtq = per.total + (corpo && sequela === "militar" ? 2 : 0);
      var atributoAtq = corpo && !agil ? "for" : "agi";
      if (paranormaisEscolhidos.some(function (p) { return p.chave === "selvageriaCaotica"; }) && atributoAtq === "agi") bonusAtq += 3;
      var danoTexto = dano;
      if (tem("ataquePesado")) {
        var m = /^(\d+)d(\d+)/.exec(dano);
        if (m) danoTexto = dano.replace(/^(\d+)d/, (Number(m[1]) + 1) + "d");
      }
      var somaDano = (corpo ? atributos["for"] : 0) + combateAnimal;
      return Object.assign({ nome: nome, pericia: pr, atributo: atributoAtq, valorAtributo: atributos[atributoAtq], bonus: bonusAtq,
        dano: danoTexto, danoBonus: somaDano, margem: Math.max(2, margem - margemExtra), multiplicador: mult, alcance: alcance, agil: !!agil,
        semDadoExtra: tem("ataquePesado") && !/^\d+d\d+/.test(dano) }, extra || {});
    }
    var ataques = [ataque("Desarmado", desarmadoDano, 20, 2, "corpoACorpo", desarmadoAgil, { desarmado: true })];
    itens.filter(function (i) { return i.tipo === "arma"; }).forEach(function (i) {
      var proficiente = prof.indexOf(i.proficiencia === "simples" ? "armas simples" : i.proficiencia === "taticas" ? "armas táticas" : "armas pesadas") >= 0;
      var at = ataque(i.nome, i.dano, i.margem, i.multiplicador, i.alcance, i.agil, { itemId: i.id, proficiente: proficiente, nota: i.nota || "" });
      if (!proficiente) at.bonus -= 5;
      if (i.automatica && atributos["for"] < 4) at.bonus -= 5;
      ataques.push(at);
    });

    /* Patente: os limites por categoria do tutor. */
    var usoCategoria = {};
    itens.forEach(function (i) { if (i.categoria !== null && i.categoria > 0) usoCategoria[i.categoria] = (usoCategoria[i.categoria] || 0) + i.quantidade; });

    /* Trauma. */
    var corAtual = c.recursos.cor === null ? cor : c.recursos.cor;
    var missao = c.trauma.missao;
    var daMissao = c.trauma.episodios.filter(function (x) { return x.missao === missao; });
    var aberto = c.trauma.episodios.filter(function (x) { return x.estado !== "tratado"; }).slice(-1)[0] || null;

    var tudoVagas = vagas(c, atributos, graus, { elo: elo });
    var ctxReq = { atributos: atributos, graus: graus, porElemento: porElemento, c: c };
    tudoVagas.forEach(function (v) { v.problema = problemaDaVaga(c, v, ctxReq, tudoVagas, atributos, graus, portAtual); });

    return {
      c: c, nex: nexAtual, nexIndice: c.nexIndice, proximoNex: NEX[c.nexIndice + 1] || null,
      porte: portAtual, porteInicial: p0, portePlanejado: porte(c.portePlanejado),
      podeCrescer: CHAVES_PORTE.indexOf(portAtual.chave) < CHAVES_PORTE.indexOf(c.portePlanejado) && !c.crescimentos.some(function (g) { return g.marco === c.nexIndice; }) && c.nexIndice >= 1,
      origem: org, sequela: sequela, especializacao: esp,
      atributos: atributos, tetos: portAtual.tetos, historicoAtributos: historico,
      graus: graus, pericias: pericias,
      pv: { maximo: pv, atual: c.recursos.pv === null ? pv : c.recursos.pv, extras: extrasPv },
      pe: { maximo: pe, atual: c.recursos.pe === null ? pe : c.recursos.pe },
      cor: { maximo: cor, atual: corAtual, extras: extrasCor },
      linhasDeRecursos: linhas,
      limitePE: c.nexIndice + 1,
      defesa: defesa, partesDefesa: partesDefesa, rd: rd, deslocamento: deslocamento,
      resistencias: ["fortitude", "reflexos", "vontade"].map(function (k) { return pericias.filter(function (x) { return x.chave === k; })[0]; }),
      elo: elo, obediencia: OBEDIENCIA.filter(function (x) { return elo >= x.minimo; })[0].texto, bonusEquipe: bonusEquipe,
      habilidades: habilidades, habilidadesElo: habElo, poderes: poderes, poderesElo: podElo,
      paranormais: paranormaisEscolhidos, conexao: conexao, afinidade: afinidade,
      proficiencias: prof,
      carga: { capacidade: capacidade, ocupado: ocupado, sobrecarregado: sobrecarregado, maximo: capacidade * 2, acimaDoMaximo: ocupado > capacidade * 2 },
      ataques: ataques, presaFacilDados: presaDados, combateAnimal: combateAnimal,
      usoCategoria: usoCategoria,
      amedrontado: corAtual > 0 && corAtual < cor,
      trauma: { emTrauma: corAtual <= 0, aberto: aberto, daMissao: daMissao.length, incapaz: daMissao.length >= 3, missao: missao },
      vagas: tudoVagas,
      pendentes: tudoVagas.filter(function (v) { return v.ativa && v.problema; }),
      problemasDistribuicao: problemasDaDistribuicao(c),
      pontosIniciais: pontosIniciais(c),
    };
  }

  /* O que falta (ou deixou de valer) numa vaga. null: tudo certo. */
  function problemaDaVaga(c, v, ctxReq, todas, atributos, graus, portAtual) {
    var val = v.valor;
    if (v.tipo === "opcao") {
      if (!val) return "Escolha pendente.";
      return v.opcoes.some(function (op) { return op.valor === val; }) ? null : "A escolha guardada não vale mais: escolha de novo.";
    }
    if (v.tipo === "pericia") {
      if (!val) return "Escolha a perícia substituta.";
      return pericia(val) && v.excluir.indexOf(val) < 0 ? null : "Essa perícia já é treinada por outro caminho: escolha outra.";
    }
    if (v.tipo === "pericias") {
      var lista = Array.isArray(val) ? val : [];
      if (v.subir) return lista.length === v.quantidade ? null : "Faltam " + (v.quantidade - lista.length) + " escolha(s).";
      var invalidas = lista.filter(function (p) { return !pericia(p) || v.excluir.indexOf(p) >= 0; });
      if (invalidas.length) return "Já treinada por outro caminho: " + invalidas.map(function (p) { return pericia(p) ? pericia(p).nome : p; }).join(", ") + ".";
      if (lista.length < v.quantidade) return "Faltam " + (v.quantidade - lista.length) + " perícia(s).";
      if (lista.length > v.quantidade) return "Perícias demais: tire " + (lista.length - v.quantidade) + " (o INT mudou?).";
      return null;
    }
    if (v.tipo === "grau") {
      var l2 = Array.isArray(val) ? val : [];
      if (l2.length < v.quantidade) return "Faltam " + (v.quantidade - l2.length) + " perícia(s).";
      if (l2.length > v.quantidade) return "Perícias demais: tire " + (l2.length - v.quantidade) + ".";
      return null;
    }
    if (v.tipo === "atributo") {
      if (!val) return "Escolha o atributo.";
      if (CHAVES_ATR.indexOf(val) < 0) return "Atributo desconhecido.";
      if (atributos[val] > portAtual.tetos[val] || (v.limite5 && atributos[val] > 5)) return nomeAtr(val) + " passa do teto do porte (" + portAtual.tetos[val] + ").";
      return null;
    }
    if (v.tipo === "poder") {
      if (!val) return "Escolha o poder.";
      var p = poderGeral(val);
      if (!p) return "Poder desconhecido.";
      var repetido = todas.some(function (o) { return o.tipo === "poder" && o.id !== v.id && o.valor === val && o.marco < v.marco; });
      if (repetido && !p.repetivel) return p.nome + " já foi escolhido em outro marco.";
      var falta = (p.requisitos || []).filter(function (r) { return !cumpre(r, ctxReq); });
      if (falta.length) return "Requisito: " + falta.map(textoDoRequisito).join(", ") + ".";
      return null;
    }
    if (v.tipo === "paranormal") {
      if (!val) return "Escolha o poder paranormal.";
      var pp = paranormal(val);
      if (!pp) return "Poder desconhecido.";
      var dup = todas.some(function (o) { return o.tipo === "paranormal" && o.id !== v.id && o.valor === val; });
      if (dup) return pp.nome + " já foi escolhido.";
      /* "Sangue 1" pede OUTRO poder do elemento: este não conta. */
      var semEste = Object.assign({}, ctxReq, { porElemento: Object.assign({}, ctxReq.porElemento) });
      if (pp.elemento && semEste.porElemento[pp.elemento]) semEste.porElemento[pp.elemento]--;
      var faltaP = (pp.requisitos || []).filter(function (r) { return !cumpre(r, semEste); });
      if (faltaP.length) return "Requisito: " + faltaP.map(textoDoRequisito).join(", ") + ".";
      return null;
    }
    if (v.tipo === "poderElo") {
      if (!val) return "Escolha o poder de Elo.";
      if (!PODERES_ELO.some(function (x) { return x.chave === val; })) return "Poder desconhecido.";
      if (todas.some(function (o) { return o.tipo === "poderElo" && o.id !== v.id && o.valor === val; })) return "Esse poder de Elo já foi escolhido.";
      return null;
    }
    void c; void graus;
    return null;
  }

  /* ---------------- ações (mudam o bloco, sem conceder nada duas vezes) ---------------- */

  /* Recurso atual, com o trauma: chegar a 0 de COR (vindo de cima) abre
     UM episódio; reabrir em 0 não abre outro. */
  function definirRecurso(c, chave, valor, maximo) {
    var antes = c.recursos[chave] === null ? maximo : c.recursos[chave];
    var novo = Math.round(Number(valor) || 0);
    if (chave === "cor") novo = Math.max(0, novo);
    else novo = Math.max(chave === "pv" ? -999 : 0, novo);
    c.recursos[chave] = novo;
    var abriu = false;
    if (chave === "cor" && antes > 0 && novo <= 0) {
      c.trauma.episodios.push({ id: uuid(), missao: c.trauma.missao, em: new Date().toISOString(), turnos: 0, estado: "aberto", resolucao: "" });
      abriu = true;
    }
    return { antes: antes, depois: novo, abriuTrauma: abriu };
  }

  function subirNex(c) { if (c.nexIndice < NEX.length - 1) { c.nexIndice++; return true; } return false; }
  function descerNex(c) {
    if (c.nexIndice <= 0) return false;
    c.crescimentos = c.crescimentos.filter(function (g) { return g.marco < c.nexIndice; });
    c.nexIndice--;
    return true;
  }
  function crescer(c) {
    var atual = porteNoMarco(c, c.nexIndice, true);
    if (CHAVES_PORTE.indexOf(atual.chave) >= CHAVES_PORTE.indexOf(c.portePlanejado)) return false;
    if (c.crescimentos.some(function (g) { return g.marco === c.nexIndice; }) || c.nexIndice < 1) return false;
    c.crescimentos.push({ marco: c.nexIndice });
    return true;
  }
  function desfazerCrescimento(c) {
    var g = c.crescimentos.filter(function (x) { return x.marco === c.nexIndice; })[0];
    if (!g) return false;
    c.crescimentos = c.crescimentos.filter(function (x) { return x !== g; });
    delete c.escolhas["cresc." + NEX[g.marco]];
    return true;
  }
  function ajustarElo(c, valor, motivo) {
    var v = Math.round(Number(valor) || 0);
    if (!v) return false;
    c.eloBase = limitar(c.eloBase + v, -100, 100);
    c.eloRegistro.push({ id: uuid(), valor: v, motivo: texto(motivo, 120), em: new Date().toISOString() });
    if (c.eloRegistro.length > 50) c.eloRegistro.shift();
    return true;
  }

  global.RAMAOrdemCompanheiro = {
    NEX: NEX, ATRIBUTOS: ATRIBUTOS, ELEMENTOS: ELEMENTOS, PORTES: PORTES, PERICIAS: PERICIAS, GRAUS: GRAUS,
    ORIGENS: ORIGENS, SEQUELAS: SEQUELAS, ESPECIALIZACOES: ESPECIALIZACOES, PODERES: PODERES,
    PODERES_ELO: PODERES_ELO, HABILIDADES_ELO: HABILIDADES_ELO, MARCOS_ELO: MARCOS_ELO, AJUSTES_ELO: AJUSTES_ELO,
    PARANORMAIS_PROPRIOS: PARANORMAIS_PROPRIOS, ARMAS: ARMAS,
    porte: porte, origem: origem, especializacao: especializacao, pericia: pericia, poderGeral: poderGeral,
    paranormal: paranormal, paranormais: paranormais, cumpre: cumpre, textoDoRequisito: textoDoRequisito,
    vazio: vazio, normalizar: normalizar, calcular: calcular, atributosIniciais: atributosIniciais, pontosIniciais: pontosIniciais,
    porteNoMarco: porteNoMarco, nomeAtr: nomeAtr, nomeElemento: nomeElemento,
    definirRecurso: definirRecurso, subirNex: subirNex, descerNex: descerNex, crescer: crescer, desfazerCrescimento: desfazerCrescimento,
    ajustarElo: ajustarElo,
    FONTE: "Melhor Amigo da Ordem — suplemento de fã de @_Lesm0_ (não oficial)",
  };
})(typeof window !== "undefined" ? window : globalThis);
