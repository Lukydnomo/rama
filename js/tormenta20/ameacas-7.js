/* R.A.M.A. — Tormenta20 · perigos, doenças, perigos complexos e o
   gerador de fichas de NPC (Livro Básico, p. 317–323).
   Formato em js/tormenta20/ameacas.js. Resumos do RAMA. */
(function () {
  var A = RAMATormenta20Ameacas;
  var P = A.perigo;
  function arm(id, nome, nd, pag, f, r) { return P(id, nome, nd, pag, Object.assign({ tipo: "armadilha" }, f), r); }
  /* Armadilhas (p. 317–318). magica: anulável por Dissipar Magia. */
  arm("agulhaEnvenenada", "Agulha Envenenada", "1/4", 317, { dano: "1", tipoDano: "perfuracao", perda: "1d12", res: "reflexos", cd: 20, efeitoRes: "evita", investigacao: 25, ladinagem: 20 }, "1 de perfuração e perde 1d12 PV por veneno.");
  arm("arameFarpado", "Arame Farpado", "1/4", 317, { dano: "1d6+2", tipoDano: "corte", investigacao: 10, ladinagem: 20 }, "Terreno difícil; 1d6+2 de corte em quem atravessa.");
  arm("fossoCamuflado", "Fosso Camuflado", "1/4", 317, { dano: "2d6", tipoDano: "impacto", res: "reflexos", cd: 20, efeitoRes: "evita", investigacao: 20, ladinagem: 20, escalar: 20 }, "Queda de 3 m (2d6 de impacto); Atletismo CD 20 para sair.");
  arm("rede", "Rede", "1/4", 317, { condicao: "agarrado", res: "reflexos", cd: 20, efeitoRes: "evita", investigacao: 20, ladinagem: 20 }, "Agarrado (ação completa e Acrobacia CD 20 para escapar).");
  arm("virote", "Virote", "1/4", 317, { dano: "1d10+2", tipoDano: "perfuracao", res: "reflexos", cd: 20, efeitoRes: "evita", investigacao: 25, ladinagem: 20 }, "Disparo de 1d10+2 de perfuração.");
  arm("fossoProfundo", "Fosso Profundo", "1/2", 317, { dano: "4d6", tipoDano: "impacto", res: "reflexos", cd: 20, efeitoRes: "evita", investigacao: 20, ladinagem: 20, escalar: 20 }, "Queda de 6 m (4d6 de impacto); Atletismo CD 20 para sair.");
  arm("laminaNaParede", "Lâmina na Parede", "1/2", 317, { dano: "2d6+5", tipoDano: "corte", res: "reflexos", cd: 20, efeitoRes: "evita", investigacao: 25, ladinagem: 20 }, "Lâmina de 2d6+5 de corte.");
  arm("blocoDePedra", "Bloco de Pedra", "1", 317, { dano: "6d6", tipoDano: "impacto", res: "reflexos", cd: 20, efeitoRes: "evita", investigacao: 20, ladinagem: 20 }, "Bloco que cai: 6d6 de impacto.");
  arm("penduloDeTeto", "Pêndulo de Teto", "1", 317, { dano: "1d12+10", tipoDano: "corte", res: "reflexos", cd: 25, efeitoRes: "evita", investigacao: 25, ladinagem: 20 }, "Lâmina pendular de 1d12+10 de corte.");
  arm("fossoComEstacas", "Fosso com Estacas", "2", 317, { dano: "6d6", tipoDano: "impacto", danoExtra: "2d4+5 perfuracao", res: "reflexos", cd: 20, efeitoRes: "evita", investigacao: 20, ladinagem: 20, escalar: 20 }, "Queda de 9 m (6d6 de impacto) e estacas (2d4+5 de perfuração).");
  arm("runaDeProtecao", "Runa de Proteção", "2", 317, { magica: true, dano: "6d6", tipoDano: "fogo", area: "3m", res: "reflexos", cd: 20, efeitoRes: "metade", investigacao: 25, ladinagem: 25 }, "6d6 de fogo (ou outro elemento) a até 3 m; quem ativou não tem teste.");
  arm("simboloDoMedo", "Símbolo do Medo", "2", 317, { magica: true, condicao: "abalado", area: "curto", res: "vontade", cd: 20, efeitoRes: "evita", investigacao: 25, ladinagem: 25 }, "Criaturas em alcance curto ficam abaladas até o fim da cena.");
  arm("estatuaExecutora", "Estátua Executora", "3", 318, { dano: "1d12+10", tipoDano: "corte", golpes: 2, res: "reflexos", cd: 25, efeitoRes: "evita", investigacao: 20, ladinagem: 20 }, "Dois golpes de 1d12+10 de corte; um teste de Reflexos para cada.");
  arm("gasVenenoso", "Gás Venenoso", "3", 318, { perda: "1d12", rodadas: "2d4", res: "fortitude", cd: 20, efeitoRes: "metade", investigacao: 25, ladinagem: 25 }, "Perde 1d12 PV por rodada por 2d4 rodadas.");
  arm("simboloDoSono", "Símbolo do Sono", "3", 318, { magica: true, condicao: "inconsciente", area: "curto", limiteNivel: 8, res: "vontade", cd: 20, efeitoRes: "evita", investigacao: 25, ladinagem: 25 }, "Criaturas de até 8 níveis em alcance curto caem inconscientes.");
  arm("paredeInstavel", "Parede Instável", "4", 318, { dano: "8d6", tipoDano: "impacto", area: "quadrado de 3m", res: "reflexos", cd: 25, efeitoRes: "metade", investigacao: 20, ladinagem: 20 }, "Desaba: 8d6 de impacto num quadrado de 3 m.");
  arm("simboloDaDor", "Símbolo da Dor", "4", 318, { magica: true, area: "curto", penalidade: -5, res: "fortitude", cd: 25, efeitoRes: "evita", investigacao: 30, ladinagem: 30 }, "Dores: –5 em todos os testes até o fim da cena.");
  arm("brumaDaInsanidade", "Bruma da Insanidade", "5", 318, { magica: true, condicao: "confuso", area: "cubo de 6m", res: "fortitude", cd: 20, efeitoRes: "evita", investigacao: 25, ladinagem: 25 }, "Criaturas num cubo de 6 m ficam confusas até o fim da cena.");
  arm("simboloDoAtordoamento", "Símbolo do Atordoamento", "5", 318, { magica: true, condicao: "atordoado", rodadas: "1d6", area: "curto", res: "fortitude", cd: 25, efeitoRes: "evita", investigacao: 30, ladinagem: 30 }, "Atordoadas por 1d6 rodadas.");
  arm("desabamentoDoTeto", "Desabamento do Teto", "6", 318, { dano: "15d6", tipoDano: "impacto", area: "quadrado de 6m", res: "reflexos", cd: 30, efeitoRes: "metade", investigacao: 25, ladinagem: 25 }, "15d6 de impacto num quadrado de 6 m.");
  arm("simboloDaInsanidade", "Símbolo da Insanidade", "6", 318, { magica: true, condicao: "confuso", permanente: true, area: "curto", res: "vontade", cd: 25, efeitoRes: "evita", investigacao: 30, ladinagem: 30 }, "Confusas permanentemente.");
  arm("abismoDaMorte", "Abismo da Morte", "8", 318, { dano: "20d6", tipoDano: "impacto", danoExtra: "2d8+10 perfuracao", area: "quadrado de 6m", res: "reflexos", cd: 30, efeitoRes: "evita", investigacao: 30, ladinagem: 30, escalar: 25 }, "Queda de 30 m sobre estacas: 20d6 de impacto e 2d8+10 de perfuração.");
  arm("simboloDaMorte", "Símbolo da Morte", "8", 318, { magica: true, pvPara: -1, area: "curto", res: "fortitude", cd: 30, efeitoRes: "10d6 trevas", investigacao: 30, ladinagem: 30 }, "Reduz a –1 PV (Fortitude: em vez disso, 10d6 de trevas).");

  /* Doenças (p. 318): Fortitude ao ser exposto; contaminado testa a cada
     dia; dois sucessos seguidos curam; efeitos progressivos por "/". */
  A.DOENCAS = [
    { id: "calafrioDiabolico", nome: "Calafrio Diabólico", via: "contato", cd: 25, estagios: ["fraco", "debilitado", "inconsciente", "morte"], pagina: 318 },
    { id: "febreDoRiso", nome: "Febre do Riso", via: "inalação", cd: 20, estagios: ["frustrado", "esmorecido", "confuso"], porCena: true, pagina: 318 },
    { id: "febreMental", nome: "Febre Mental", via: "inalação", cd: 20, estagios: ["frustrado", "esmorecido", "alquebrado"], pagina: 318 },
    { id: "infeccaoDoEsgoto", nome: "Infecção do Esgoto", via: "contato", cd: 15, estagios: ["fraco", "debilitado"], pagina: 318 },
    { id: "maldicaoPegajosa", nome: "Maldição Pegajosa", via: "contato", cd: 20, estagios: ["perde 1d12 PV", "perde 2d12 PV", "perde 4d12 PV"], curaCom: 3, pagina: 318 },
    { id: "molestiaDemoniaca", nome: "Moléstia Demoníaca", via: "contato", cd: 20, estagios: ["perde 1d12 PV", "perde 2d12 PV", "perde 1 de Constituição (permanente)", "morte"], pagina: 318 },
    { id: "tremores", nome: "Tremores", via: "contato", cd: 15, estagios: ["vulneravel"], pagina: 318 },
    { id: "variola", nome: "Varíola", via: "inalação", cd: 20, estagios: ["enjoado", "debilitado", "perde 1 de Carisma (permanente)", "morte"], pagina: 318 },
  ];
  /* Teste diário de doença: devolve o novo estado. */
  A.testeDeDoenca = function (doenca, estado, sucesso) {
    var e = Object.assign({ falhasSeguidas: 0, sucessosSeguidos: 0, estagio: -1 }, estado || {});
    var precisa = doenca.curaCom || 2;
    if (sucesso) {
      e.sucessosSeguidos++; e.falhasSeguidas = 0;
      if (e.sucessosSeguidos >= precisa) return { curado: true, estado: e, efeito: null };
      e.estagio = Math.max(-1, e.estagio - 1);
    } else {
      e.falhasSeguidas++; e.sucessosSeguidos = 0;
      e.estagio = Math.min(doenca.estagios.length - 1, e.estagio + 1);
    }
    return { curado: false, estado: e, efeito: e.estagio >= 0 ? doenca.estagios[e.estagio] : null };
  };

  /* Perigos do ambiente (p. 317–319). */
  A.AMBIENTE = [
    { id: "acido", nome: "Ácido", pagina: 317, r: "1d6 por rodada de exposição; imersão 10d6 por rodada, mais uma rodada depois de sair." },
    { id: "areiaMovedica", nome: "Areia Movediça", pagina: 317, r: "Sobrevivência CD 25 nota. Entrar: agarrado; uma rodada inteira agarrado e submerge (sufocamento). Ação completa e Atletismo CD 25 avança um passo (submerso → agarrado → livre); falhar por 5 ou mais cansa. Outros podem ajudar." },
    { id: "escuridao", nome: "Escuridão", pagina: 318, r: "Leve: camuflagem leve. Total: camuflagem total." },
    { id: "fogo", nome: "Fogo", pagina: 319, r: "Exposto: Reflexos CD 15 ou em chamas (1d6 de fogo no início dos turnos; ação padrão ou água apaga). Efeitos instantâneos não incendeiam." },
    { id: "fomeESede", nome: "Fome e Sede", pagina: 319, r: "Após um dia, Fortitude diária CD 15 (+1 por teste anterior): fatigado, exausto, inconsciente, morte. Só comida e bebida curam. Metabolismo." },
    { id: "fumaca", nome: "Fumaça", pagina: 319, r: "Fumaça densa: Fortitude no início do turno CD 10 (+1 por teste); falha perde o turno; duas seguidas, perde 1d6 PV. Camuflagem leve." },
    { id: "lava", nome: "Lava", pagina: 319, r: "2d6 de fogo por rodada de exposição; imersão 20d6 por rodada, mais uma rodada depois." },
    { id: "queda", nome: "Queda", pagina: 319, r: "1d6 de impacto a cada 1,5 m (máximo 40d6 aos 60 m); na água, –4d6. Objeto que cai causa 1d6 a cada 1,5 m (o dobro se muito pesado)." },
    { id: "sono", nome: "Sono", pagina: 319, r: "Uma noite sem dormir não recupera PV e PM; depois, Fortitude diária CD 15 (+1): fatigado, exausto, inconsciente até dormir 8 horas." },
    { id: "sufocamento", nome: "Sufocamento", pagina: 319, r: "Prende a respiração por 1 + Constituição rodadas; depois Fortitude por rodada CD 15 (+1); falha: inconsciente e perde 1d6 PV por rodada. Metabolismo." },
    { id: "tormenta", nome: "Área de Tormenta", pagina: 319, r: "Ao entrar, frustrado. A cada dia, Vontade CD 25 (+2 por dia consecutivo) ou esmorecido; já esmorecido, confuso; já confuso, insano (vira NPC). Habilidades com custo em PM custam +2; itens encantados perdem um encanto; recuperação por descanso cai à metade. Lefeu e lefou são imunes." },
    { id: "clima", nome: "Clima, calor e frio", pagina: 267, r: "Ver as regras de clima no Capítulo 6 (p. 267)." },
  ];

  /* Perigos complexos (p. 320–321): testes estendidos. */
  P("avalanche", "Avalanche", "4", 320, {
    tipo: "complexo", objetivo: "Escapar da avalanche.", rodadas: 5,
    deteccao: { pericia: "sobrevivencia", cd: 20, beneficio: "ação adicional na primeira rodada" },
    resultado: [{ ate: 2, efeito: "Zona de soterramento: 16d6 de impacto e soterrado (imóvel, 1d6 por turno; Força CD 25 para soltar, com ajuda).", dano: "16d6" }, { ate: 4, efeito: "Zona de deslizamento: 8d6 de impacto.", dano: "8d6" }, { ate: 99, efeito: "Escapa ileso." }],
    acoes: [{ n: "Correr", pericia: "atletismo", cd: 20, r: "Um sucesso; por 10 ou mais (ou 20 natural), dois. Cavalgar ou Pilotagem substituem com montaria ou veículo.", sucessos: 1 }, { n: "Carregar Outro", pericia: "atletismo", cd: 25, r: "Leva um aliado com até um sucesso de diferença: um sucesso para cada.", sucessos: 1 }, { n: "Procurar Caminho", pericia: "percepcao", cd: 20, r: "+5 nos testes de correr e carregar outro neste perigo." }],
  }, "O grupo tem cinco rodadas para fugir dos escombros.");
  P("jornadaPelosErmos", "Jornada pelos Ermos", "2", 320, {
    tipo: "complexo", objetivo: "Chegar ao destino.", sucessosPor: { curta: 3, media: 5, longa: 7 }, falhasMax: 3,
    cdPorTerreno: { planicie: 15, colina: 15, floresta: 20, pantano: 20, deserto: 25, montanha: 25, planar: 30, tormenta: 30 },
    porFalha: { perda: "2d6", r: "Cada falha: perde 2d6 PV (só cura um dia após a jornada)." }, tresFalhas: "PM máximos –1 por nível na próxima aventura (ou recomeçar, se o mestre quiser que possa falhar).",
    acoes: [{ n: "Avançar", pericia: "sobrevivencia", r: "Os personagens se alternam. Outras perícias justificadas (Pilotagem, Diplomacia…) valem uma vez cada por jornada." }],
  }, "Teste estendido aberto da viagem por território selvagem (ver p. 267).");
  P("salaEsmagadora", "Sala Esmagadora", "9", 321, {
    tipo: "complexo", objetivo: "Abrir a porta ou travar o mecanismo das paredes.", rodadas: 3,
    efeito: "Na 4ª rodada, 10d6 de impacto; na 5ª, quem estiver dentro morre. Âncora Dimensional impede fuga planar.",
    acoes: [{ n: "Derrubar Porta", pericia: "for", cd: 30, sucessosNecessarios: 3, r: "Até dois personagens por rodada (ou um ajudando o outro)." }, { n: "Desabilitar Mecanismo", pericia: "ladinagem", cd: 30, sucessosNecessarios: 3, r: "Paredes travadas: a porta sai sem testes." }, { n: "Segurar Paredes", pericia: "for", cd: 25, r: "A cada dois sucessos, +1 rodada antes de fechar." }],
  }, "Armadilha de masmorra em que as paredes se fecham sobre o grupo.");
  P("tempestadeEmAltoMar", "Tempestade em Alto Mar", "6", 321, {
    tipo: "complexo", objetivo: "Sobreviver à tempestade (1d6+6 rodadas).", duracao: "1d6+6",
    deteccao: { pericia: "sobrevivencia", cd: 20, beneficio: "ação adicional na primeira rodada" },
    efeito: "No início do turno, Reflexos CD 20+1d6 (rolado por rodada): falha 4d6 de impacto; falha por 10 ou mais, cai no mar (no mar, falha automática).",
    acoes: [{ n: "Navegar", pericia: "pilotagem", cd: 25, r: "Cada sucesso reduz a tempestade em uma rodada; um por rodada." }, { n: "Ajudar o Piloto", r: "Teste de ajuda com perícia justificada." }, { n: "Esconder-se", r: "No convés inferior: Reflexos CD 20 fixa, sem cair no mar, mas sem navegar ou ajudar." }, { n: "Voltar para o Navio", pericia: "atletismo", cd: 25, sucessosNecessarios: 2, r: "Falha não avança; por 5 ou mais, afunda." }],
  }, "Ondas gigantes ameaçam jogar o grupo ao mar.");

  /* Tabela 7-2: estatísticas de NPC por ND (p. 323). */
  A.TABELA_NPC = {
    "1/2": { patamar: "iniciante", ataque: 7, ataques: 1, dano: "1d6+3", def: 15, pv: 10, pericias: [4, 0], cd: 14 },
    "1": { patamar: "iniciante", ataque: 9, ataques: 1, dano: "1d8+6", def: 16, pv: 20, pericias: [6, 1], cd: 15 },
    "2": { patamar: "iniciante", ataque: 11, ataques: 1, dano: "1d10+10", def: 18, pv: 40, pericias: [8, 2], cd: 16 },
    "3": { patamar: "iniciante", ataque: 13, ataques: 1, dano: "1d12+12", def: 21, pv: 70, pericias: [10, 3], cd: 17 },
    "4": { patamar: "iniciante", ataque: 15, ataques: 1, dano: "2d6+14", def: 24, pv: 110, pericias: [12, 4], cd: 18 },
    "5": { patamar: "veterano", ataque: 18, ataques: 2, dano: "1d12+11", def: 28, pv: 150, pericias: [14, 5], cd: 20 },
    "6": { patamar: "veterano", ataque: 20, ataques: 2, dano: "2d6+15", def: 31, pv: 190, pericias: [16, 6], cd: 22 },
    "7": { patamar: "veterano", ataque: 22, ataques: 2, dano: "2d8+19", def: 34, pv: 230, pericias: [18, 7], cd: 24 },
    "8": { patamar: "veterano", ataque: 24, ataques: 2, dano: "2d10+20", def: 37, pv: 270, pericias: [20, 8], cd: 26 },
    "9": { patamar: "veterano", ataque: 26, ataques: 2, dano: "2d12+21", def: 40, pv: 310, pericias: [22, 9], cd: 28 },
    "10": { patamar: "veterano", ataque: 29, ataques: 2, dano: "3d6+26", def: 43, pv: 350, pericias: [24, 10], cd: 30 },
    "11": { patamar: "campeao", ataque: 32, ataques: 3, dano: "3d8+24", def: 46, pv: 400, pericias: [25, 11], cd: 32 },
    "12": { patamar: "campeao", ataque: 35, ataques: 3, dano: "3d10+26", def: 48, pv: 450, pericias: [26, 12], cd: 34 },
    "13": { patamar: "campeao", ataque: 37, ataques: 3, dano: "3d12+28", def: 50, pv: 550, pericias: [27, 13], cd: 36 },
    "14": { patamar: "campeao", ataque: 40, ataques: 3, dano: "4d6+38", def: 52, pv: 600, pericias: [28, 14], cd: 38 },
    "15": { patamar: "campeao", ataque: 42, ataques: 3, dano: "4d8+40", def: 54, pv: 650, pericias: [29, 15], cd: 40 },
    "16": { patamar: "campeao", ataque: 45, ataques: 3, dano: "4d10+42", def: 56, pv: 700, pericias: [30, 16], cd: 42 },
    "17": { patamar: "lenda", ataque: 47, ataques: 4, dano: "4d12+35", def: 59, pv: 750, pericias: [32, 17], cd: 44 },
    "18": { patamar: "lenda", ataque: 50, ataques: 4, dano: "4d12+40", def: 61, pv: 800, pericias: [33, 18], cd: 46 },
    "19": { patamar: "lenda", ataque: 52, ataques: 4, dano: "4d12+45", def: 63, pv: 850, pericias: [34, 19], cd: 48 },
    "20": { patamar: "lenda", ataque: 55, ataques: 4, dano: "4d12+50", def: 65, pv: 900, pericias: [35, 20], cd: 50 },
  };
  A.PACOTES_ATRIBUTOS = { iniciante: [3, 2, 1, 1, 0, -1], veterano: [4, 3, 2, 1, 0, 0], campeao: [5, 4, 3, 2, 1, 0], lenda: [7, 5, 4, 2, 2, 1] };
  /* Ficha de NPC pela Tabela 7-2: ajustes sobem ou descem colunas pelo
     ND (o bárbaro robusto: PV +2 de ND, Defesa –2). */
  A.gerarNPC = function (o) {
    var op = o || {};
    var chaves = Object.keys(A.TABELA_NPC);
    function linha(nd, desloc) {
      var i = chaves.indexOf(String(nd));
      if (i < 0) i = 0;
      return A.TABELA_NPC[chaves[Math.max(0, Math.min(chaves.length - 1, i + (desloc || 0)))]];
    }
    var aj = op.ajustes || {};
    var base = linha(op.nd);
    var foco = op.pericias || [];
    var per = {};
    ["iniciativa", "percepcao", "fortitude", "reflexos", "vontade"].concat(foco).forEach(function (k) { per[k] = foco.indexOf(k) >= 0 ? linha(op.nd, aj.pericias)[ "pericias"][0] : linha(op.nd, aj.pericias).pericias[1]; });
    var atr = (A.PACOTES_ATRIBUTOS[base.patamar] || A.PACOTES_ATRIBUTOS.iniciante).slice();
    var ordem = op.ordemAtributos || [0, 1, 2, 3, 4, 5];
    var atrFinal = [0, 0, 0, 0, 0, 0];
    ordem.forEach(function (idx, pos) { atrFinal[idx] = atr[pos]; });
    var lAt = linha(op.nd, aj.ataque), lDef = linha(op.nd, aj.defesa), lPv = linha(op.nd, aj.pv), lCd = linha(op.nd, aj.cd);
    return {
      id: op.id || "npc", nome: op.nome || "NPC", nd: String(op.nd || "1"), grupo: "npcs", pagina: 322, tipo: "humanoide", sub: op.raca || "", tam: op.tam || "medio", papel: op.papel || "solo",
      ini: per.iniciativa, per: per.percepcao, def: lDef.def, fort: per.fortitude, ref: per.reflexos, von: per.vontade, pv: lPv.pv, desl: op.desl || 9, pm: 0,
      atr: atrFinal, ataques: [{ n: op.arma || "Ataque", a: lAt.ataque, d: lAt.dano, m: 20, c: 2, q: lAt.ataques, t: op.tipoDano || "C" }],
      habs: op.habs || [], pericias: per, cd: lCd.cd, tesouro: op.tesouro || "padrao", npc: true, gerado: true,
    };
  };
})();
