/* =====================================================================
   R.A.M.A. — Tormenta20 · deuses do Panteão (p. 96–105)
   ---------------------------------------------------------------------
   Devoto (p. 96): raça ou classe listada em "devotos" (humanos e
   clérigos podem qualquer deus); um poder concedido (clérigo, druida e
   paladino: dois); violar as Obrigações & Restrições tira todos os PM
   até o próximo dia (de novo na mesma aventura: até a penitência).
   `inicioDeCena` e `restricoes` são o que a ficha aplica sozinha; o
   resto das O&R é decisão da mesa.
   ===================================================================== */

(function (global) {
  "use strict";

  function d(id, nome, pagina, energia, arma, devotos, poderes, oer, extra) {
    return Object.assign({ id: id, nome: nome, pagina: pagina, energia: energia, armaPreferida: arma, devotos: devotos, poderes: poderes, obrigacoes: oer, fonte: "T20" }, extra || {});
  }
  var QUALQUER = "qualquer";

  var DEUSES = [
    d("aharadak", "Aharadak", 96, "negativa", "correnteDeEspinhos", QUALQUER, ["afinidadeComATormenta", "extaseDaLoucura", "percepcaoTemporal", "rejeicaoDivina"],
      "No início de cada cena de ação, role 1d6: ímpar, fica fascinado na primeira rodada (mesmo se imune).",
      { titulo: "Deus da Tormenta", inicioDeCena: { rolar: "1d6", se: "impar", condicao: "fascinado", duracao: "1 rodada", ignoraImunidade: true } }),
    d("allihanna", "Allihanna", 97, "positiva", "bordao", ["dahllan", "elfo", "silfide", "barbaro", "cacador", "druida"], ["compreenderOsErmos", "dedoVerde", "descansoNatural", "vozDaNatureza"],
      "Só armaduras e escudos não metálicos (acolchoada, couro, gibão de peles, escudo leve ou materiais especiais não metálicos). Não descansa em comunidade maior que aldeia (não recupera PV e PM).",
      { titulo: "Deusa da Natureza", restricoes: { armadurasPermitidas: ["acolchoada", "couro", "gibaoDePeles", "escudoLeve"], naoMetal: true } }),
    d("arsenal", "Arsenal", 98, QUALQUER, "marteloDeGuerra", ["anao", "minotauro", "barbaro", "cavaleiro", "guerreiro", "lutador"], ["conjurarArma", "coragemTotal", "feGuerreira", "sangueDeFerro"],
      "Proibido de ser derrotado em combate ou disputa (inclusive o grupo).", { titulo: "Deus da Guerra" }),
    d("azgher", "Azgher", 98, "positiva", "cimitarra", ["suraggel:aggelus", "qareen", "arcanista", "barbaro", "cacador", "cavaleiro", "guerreiro", "nobre", "paladino"], ["espadaSolar", "fulgorSolar", "habitanteDoDeserto", "inimigoDeTenebra"],
      "Rosto sempre coberto (só revelado ao sumo-sacerdote ou no funeral). Doa à igreja 20% de todo tesouro, em ouro.", { titulo: "Deus-Sol", dizimo: 0.2 }),
    d("hyninn", "Hyninn", 98, QUALQUER, "adaga", ["hynne", "goblin", "silfide", "bardo", "bucaneiro", "ladino", "inventor", "nobre"], ["apostarComOTrapaceiro", "farsaDoFingidor", "formaDeMacaco", "golpistaDivino"],
      "Não recusa golpe, trapaça ou artimanha (salvo contra aliados). Um ato furtivo, ousado ou proibido por dia ou sessão (Enganação ou Ladinagem, CD mínima 15 + metade do nível).", { titulo: "Deus da Trapaça" }),
    d("kallyadranoch", "Kallyadranoch", 99, "negativa", "lanca", ["elfo", "medusa", "suraggel:sulfure", "arcanista", "cavaleiro", "guerreiro", "lutador", "nobre"], ["auraDeMedo", "escamasDraconicas", "presasPrimordiais", "servosDoDragao"],
      "Para subir de nível, oferenda de 20% da diferença de dinheiro inicial entre o nível novo e o atual.", { titulo: "Deus dos Dragões", oferendaPorNivel: 0.2 }),
    d("khalmyr", "Khalmyr", 99, "positiva", "espadaLonga", ["suraggel:aggelus", "anao", "cavaleiro", "guerreiro", "nobre", "paladino"], ["coragemTotal", "domDaVerdade", "espadaJusticeira", "repararInjustica"],
      "Não recusa ajuda a inocentes; obedece superiores na igreja; só usa itens mágicos permanentes feitos por devotos de Khalmyr.", { titulo: "Deus da Justiça" }),
    d("lena", "Lena", 99, "positiva", null, ["dahllan", "qareen", "nobre", "paladino"], ["ataquePiedoso", "auraRestauradora", "curaGentil", "curandeiraPerfeita"],
      "Não causa dano letal nem perda de PV a criaturas vivas (nem dá bônus nisso); pode dano não letal e condições. Só mulheres (paladinos podem ser homens). Sem Arma Espiritual e similares.",
      { titulo: "Deusa da Vida", restricoes: { semDanoLetal: true, semArmaEspiritual: true } }),
    d("linWu", "Lin-Wu", 100, QUALQUER, "katana", ["anao", "cavaleiro", "guerreiro", "nobre", "paladino"], ["coragemTotal", "kiaiDivino", "menteVazia", "tradicaoDeLinWu"],
      "Comportamento honrado: proibido qualquer teste de Enganação, Furtividade ou Ladinagem.", { titulo: "Deus Samurai", restricoes: { periciasProibidas: ["enganacao", "furtividade", "ladinagem"] } }),
    d("marah", "Marah", 101, "positiva", null, ["suraggel:aggelus", "elfo", "hynne", "qareen", "bardo", "nobre", "paladino"], ["auraDePaz", "domDaEsperanca", "palavrasDeBondade", "talentoArtistico"],
      "Não causa dano, perda de PV nem condições (exceto enfeitiçado, fascinado e pasmo); em combate só protege, cura, foge ou se rende. Sem Arma Espiritual e similares.",
      { titulo: "Deusa da Paz", restricoes: { semDano: true, semArmaEspiritual: true } }),
    d("megalokk", "Megalokk", 101, "negativa", "maca", ["goblin", "medusa", "minotauro", "suraggel:sulfure", "trog", "barbaro", "cacador", "druida", "lutador"], ["olharAmedrontador", "presasPrimordiais", "urroDivino", "vozDosMonstros"],
      "Proibido usar perícias de Inteligência ou Carisma (exceto Adestramento e Intimidação), preparar ação, escolher 10 ou 20 e lançar magias sustentadas.",
      { titulo: "Deus dos Monstros", restricoes: { periciasPorAtributo: ["int", "car"], excetoPericias: ["adestramento", "intimidacao"], semSustentadas: true, semEscolher10: true } }),
    d("nimb", "Nimb", 102, QUALQUER, "qualquer", ["goblin", "qareen", "silfide", "arcanista", "barbaro", "bardo", "bucaneiro", "inventor", "ladino"], ["extaseDaLoucura", "poderOculto", "sorteDosLoucos", "transmissaoDaLoucura"],
      "Sem obrigações (nunca perde PM por elas). –5 em perícias de Carisma; no início de cada cena de ação, 1d6: com 1, fica confuso (mesmo se imune).",
      { titulo: "Deus do Caos", semPerdaDePM: true, efeitos: [{ t: "bonus", alvo: "pericias.car", valor: -5 }], inicioDeCena: { rolar: "1d6", se: 1, condicao: "confuso", ignoraImunidade: true } }),
    d("oceano", "Oceano", 102, QUALQUER, "tridente", ["dahllan", "hynne", "minotauro", "sereia", "barbaro", "bucaneiro", "cacador", "druida"], ["anfibio", "arsenalDasProfundezas", "mestreDosMares", "soproDoMar"],
      "Só azagaia, lança, tridente e rede; só armaduras leves; não fica mais de um mês longe do oceano.",
      { titulo: "Deus dos Mares", restricoes: { armasPermitidas: ["azagaia", "lanca", "tridente", "rede"], soArmaduraLeve: true } }),
    d("sszzaas", "Sszzaas", 103, "negativa", "adaga", ["medusa", "arcanista", "bardo", "bucaneiro", "inventor", "ladino", "nobre"], ["astuciaDaSerpente", "familiarOfidico", "presasVenenosas", "sangueOfidico"],
      "Um ato de traição, intriga ou corrupção por dia ou sessão (Enganação, CD mínima 15 + metade do nível).", { titulo: "Deus da Traição" }),
    d("tannaToh", "Tanna-Toh", 103, QUALQUER, "bordao", ["golem", "kliren", "arcanista", "bardo", "inventor", "nobre", "paladino"], ["conhecimentoEnciclopedico", "menteAnalitica", "pesquisaAbencoada", "vozDaCivilizacao"],
      "Não recusa missão de buscar conhecimento; sempre diz a verdade e responde perguntas diretas; não esconde conhecimento.", { titulo: "Deusa do Conhecimento" }),
    d("tenebra", "Tenebra", 104, "negativa", "adaga", ["anao", "medusa", "qareen", "osteon", "suraggel:sulfure", "trog", "arcanista", "bardo", "ladino"], ["cariciaSombria", "mantoDaPenumbra", "visaoNasTrevas", "zumbificar"],
      "Não pode ser tocado pelo sol: de dia, cobre-se inteiro.", { titulo: "Deusa das Trevas" }),
    d("thwor", "Thwor", 104, QUALQUER, "machadoDeGuerra", "duyshidakk", ["almejarOImpossivel", "furiaDivina", "olharAmedrontador", "tropasDuyshidakk"],
      "Ser duyshidakk (aceito pelo povo goblinoide); buscar o 'Mundo Como Deve Ser'; aliar-se a goblinoides e só lutar contra eles em último caso.", { titulo: "Deus dos Goblinoides" }),
    d("thyatis", "Thyatis", 104, "positiva", "espadaLonga", ["suraggel:aggelus", "cavaleiro", "guerreiro", "inventor", "lutador", "paladino"], ["ataquePiedoso", "domDaImortalidade", "domDaProfecia", "domDaRessurreicao"],
      "Proibido matar criaturas inteligentes (Int –3 ou maior).", { titulo: "Deus da Ressurreição e Profecia" }),
    d("valkaria", "Valkaria", 105, "positiva", "mangual", "aventureiros", ["almejarOImpossivel", "armasDaAmbicao", "coragemTotal", "liberdadeDivina"],
      "Não fixa moradia (no máximo 2d10+10 dias na mesma cidade ou 1d4+2 meses no mesmo reino); não se casa nem forma união estável.", { titulo: "Deusa da Ambição" }),
    d("wynna", "Wynna", 105, QUALQUER, "adaga", ["elfo", "golem", "qareen", "silfide", "arcanista", "bardo"], ["bencaoDoMana", "centelhaMagica", "escudoMagico", "teurgistaMistico"],
      "Não recusa ajuda a inocentes; proibido matar seres mágicos (elfos, qareen, sílfides…) e conjuradores arcanos.", { titulo: "Deusa da Magia" }),
  ];
  var DEUS = {};
  DEUSES.forEach(function (x) { DEUS[x.id] = x; });

  /* Pode ser devoto? Humanos e clérigos podem qualquer deus (p. 96). */
  function podeSerDevoto(deus, racaId, varianteId, classesIds) {
    var dz = typeof deus === "string" ? DEUS[deus] : deus;
    if (!dz) return false;
    if (racaId === "humano" || classesIds.indexOf("clerigo") >= 0) return true;
    if (dz.devotos === QUALQUER || dz.devotos === "aventureiros") return true;
    if (dz.devotos === "duyshidakk") return null; // decisão da mesa
    return dz.devotos.some(function (x) {
      var p = x.split(":");
      if (p[0] === racaId) return !p[1] || p[1] === varianteId;
      return classesIds.indexOf(p[0]) >= 0;
    });
  }

  global.RAMATormenta20Deuses = { DEUSES: DEUSES, DEUS: DEUS, podeSerDevoto: podeSerDevoto, PANTEAO: { id: "panteao", nome: "Panteão", armaPreferida: "maca", restricao: "Não usa armas cortantes nem perfurantes." }, BEM: { id: "bem", nome: "O bem (paladino)" } };
})(typeof window !== "undefined" ? window : globalThis);
