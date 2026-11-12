/* =====================================================================
   R.A.M.A. — Tormenta20 · ferramentas do mestre (Livro Básico, Cap. 6)
   ---------------------------------------------------------------------
   Atitudes de NPC (p. 259), estatísticas rápidas de NPC (Tabela 6-1),
   clima (p. 267), terrenos e elementos dos ermos (p. 268–269), viagens
   (Tabela 6-4, p. 270), perseguições (Tabela 6-5, p. 274), elementos
   urbanos (p. 275) e tempo entre aventuras: trabalho, treinamento,
   busca e custo de vida (p. 276–279). Funções puras com `rolar`.
   Resumos do RAMA.
   ===================================================================== */

(function (global) {
  "use strict";

  var ATITUDES = [
    { chave: "prestativo", nome: "Prestativo", persuasao: 5, r: "Ajuda mesmo correndo perigo; +5 em persuasão." },
    { chave: "amistoso", nome: "Amistoso", persuasao: 0, r: "Ajuda, mas dificilmente se arrisca." },
    { chave: "indiferente", nome: "Indiferente", persuasao: 0, r: "Trata como socialmente esperado (padrão)." },
    { chave: "inamistoso", nome: "Inamistoso", persuasao: -5, r: "Pode enganar ou fazer intrigas; –5 em persuasão." },
    { chave: "hostil", nome: "Hostil", persuasao: null, r: "Tenta prejudicar, até atacar; persuasão falha automaticamente." },
  ];
  /* Tabela 6-1: perícia forte e fraca de NPCs sem ficha. */
  var NPC_RAPIDO = { iniciante: { forte: 5, fraca: 0 }, veterano: { forte: 10, fraca: 3 }, campeao: { forte: 15, fraca: 6 } };

  var CLIMA = [
    { chave: "calorFrio", nome: "Calor ou frio intenso", r: "Acima de 50 °C ou abaixo de –10 °C: Fortitude diária CD 15 (+1 por teste) ou 1d6 de fogo ou frio (só cura saindo do clima). Extremo (60 °C / –20 °C): teste por minuto.", teste: { pericia: "fortitude", cd: 15, cumulativo: 1, dano: "1d6" } },
    { chave: "neblina", nome: "Neblina", r: "Camuflagem; espessa: leve a 1,5 m e total além." },
    { chave: "chuva", nome: "Chuva", r: "–5 em Percepção e efeitos de vento forte.", percepcao: -5, vento: "forte" },
    { chave: "granizo", nome: "Granizo", r: "Como chuva; 1 de impacto em todos no início de cada rodada.", percepcao: -5, vento: "forte", danoRodada: "1" },
    { chave: "neve", nome: "Neve", r: "Como chuva e terreno difícil.", percepcao: -5, vento: "forte", terrenoDificil: true },
    { chave: "tempestade", nome: "Tempestade", r: "–10 em Percepção e efeitos de vendaval; 10% por rodada de um raio de 8d10 numa criatura aleatória.", percepcao: -10, vento: "vendaval", raio: { chance: 10, dano: "8d10" } },
    { chave: "ventoForte", nome: "Vento forte", r: "–2 em ataques à distância; 50% por rodada de apagar chamas ou dissipar névoa.", distancia: -2 },
    { chave: "vendaval", nome: "Vendaval", r: "–5 em ataques à distância; apaga chamas e dissipa névoa.", distancia: -5 },
    { chave: "furacao", nome: "Furacão", r: "Ataques à distância impossíveis. No início de cada rodada, Médios ou menores fazem Fortitude CD 15 ou caem e são arrastados 1d4 × 1,5 m (1d6 por 1,5 m).", distancia: null, teste: { pericia: "fortitude", cd: 15 } },
    { chave: "tornado", nome: "Tornado", r: "Ataques à distância impossíveis. No início de cada rodada, Grandes ou menores fazem Fortitude CD 25 ou caem e são arrastados 1d12 × 1,5 m (1d6 por 1,5 m).", distancia: null, teste: { pericia: "fortitude", cd: 25 } },
  ];

  var TERRENOS = [
    { chave: "colinas", nome: "Colinas", elementos: ["Inclinação suave: terreno elevado para quem está acima.", "Inclinação íngreme: terreno difícil para subir; descer correndo ou em investida pede Acrobacia (ou Cavalgar) CD 10 ou rola 1d4 × 1,5 m com 1d6 por 1,5 m.", "Penhasco: 1d6 × 3 m; Atletismo CD 15."] },
    { chave: "desertos", nome: "Desertos", elementos: ["Dunas: como inclinações íngremes, mas cair não causa dano."] },
    { chave: "florestas", nome: "Florestas", elementos: ["Árvore estreita: RD 5, 100 PV, cobertura leve no mesmo espaço.", "Árvore larga: RD 5, 500 PV, cobertura leve atrás; no topo, camuflagem leve contra o solo.", "Subir: Atletismo CD 15; equilíbrio no topo CD 15.", "Folhagens: terreno difícil e camuflagem leve.", "Vegetação rasteira: terreno difícil e –2 em Furtividade."] },
    { chave: "montanhas", nome: "Montanhas", elementos: ["Abismo: 1d4 × 1,5 m de largura, 2d4 × 3 m de fundo; sair com Atletismo CD 20.", "Altitude: Fortitude diária CD 15 (+1) ou fatigado (depois exausto) até descer.", "Paredão: 2d6 × 3 m; Atletismo CD 25.", "Seixos: descer correndo vira CD 15."] },
    { chave: "pantanos", nome: "Pântanos", elementos: ["Vegetação, árvores e água parada.", "Lodaçal: terreno difícil e vulnerável."] },
    { chave: "planicies", nome: "Planícies", elementos: ["Trincheira: cobertura leve contra ataques à distância; sair é terreno difícil."] },
    { chave: "artico", nome: "Ártico", elementos: ["Gelo: metade do deslocamento sem testes; mais que isso, correr, investir ou sofrer dano pede Acrobacia (CD 15 ou o dano) ou cai e desliza 1d4 × 1,5 m.", "Rio congelado: como gelo; deslizar com 1 no d4 quebra o gelo (1d6 de frio por rodada e nadar; abrir buraco: 10 de impacto ou fogo)."] },
    { chave: "aquatico", nome: "Aquático", elementos: ["Água corrente: 1d6 × 3 m por rodada; nadar CD 15 (até 9 m) ou 20; sair de 15 m ou mais exige ponto de apoio e Atletismo CD 20.", "Submerso: não fala nem lança magias, –2 em ataques e –5 em Percepção; à distância só arremesso perfurante, bestas e redes; corte e impacto (não naturais) causam metade; camuflagem e cobertura leves contra quem está fora."] },
  ];

  var ELEMENTOS_ERMOS = [
    { chave: "covil", nome: "Covil", r: "Percepção ou Sobrevivência acham; Sobrevivência CD 15 + ND identifica o dono; 25% de chance de ele estar fora." },
    { chave: "ruina", nome: "Ruína", r: "1d6: 1–2 uma ameaça; 3–4 vazia; 5 ameaça e tesouro; 6 só tesouro (do nível do grupo).", tabela: [[2, "ameaça"], [4, "vazia"], [5, "ameaça e tesouro"], [6, "tesouro"]] },
    { chave: "santuario", nome: "Santuário", r: "Religião CD 20 identifica o deus. Do seu deus: uma magia (Bênção, Curar Ferimentos, Físico Divino ou Vestimenta da Fé) uma vez por dia. De deus inimigo: Rogar Maldição até o fim do dia." },
  ];

  /* Tabela 6-4: viagem por hora = deslocamento × 0,5 km; por dia = ×8.
     Terreno difícil ou clima ruim: metade (acumulam). Marcha forçada:
     dobra por hora, Fortitude CD 15 (+1) por hora ou perde 1d6 PV. */
  function viagem(deslocamento, opcoes) {
    var o = opcoes || {};
    var porHora = (Number(deslocamento) || 9) * 0.5;
    var fator = 1;
    if (o.terrenoDificil) fator *= 0.5;
    if (o.climaRuim) fator *= 0.5;
    if (o.marchaForcada) fator *= 2;
    var horas = o.horas || 8;
    return { porHora: porHora * fator, porDia: porHora * fator * horas, fator: fator };
  }

  /* Tabela 6-5: eventos de perseguição (d20). */
  var PERSEGUICAO = [[6, "nenhum"], [8, "obstaculo", "for", 15, "Pilha de caixotes bloqueia o caminho."], [10, "obstaculo", "acrobacia", 20, "Piso escorregadio."], [12, "obstaculo", "reflexos", 20, "Barris rolando pela rua."], [14, "obstaculo", "intimidacao", 20, "Multidão no caminho."], [16, "atalho", "adestramento", 20, "Uma carroça em que se pode subir."], [18, "atalho", "for", 15, "Caminho mais curto, mas bloqueado."], [20, "atalho", "percepcao", 20, "Ruelas labirínticas."]];
  function eventoDePerseguicao(rolar) {
    var d = rolar("1d20");
    for (var i = 0; i < PERSEGUICAO.length; i++) if (d <= PERSEGUICAO[i][0]) { var l = PERSEGUICAO[i]; return { d20: d, tipo: l[1], pericia: l[2] || null, cd: l[3] || null, exemplo: l[4] || "" }; }
    return { d20: d, tipo: "nenhum" };
  }
  /* Uma rodada de perseguição: cada participante avança o resultado de
     Atletismo (corrida) em metros; obstáculo: falha anda metade; atalho
     (opcional): passa dobra, falha metade. */
  function rodadaDePerseguicao(participantes, evento) {
    return participantes.map(function (p) {
      var dist = Math.max(0, Number(p.corrida) || 0);
      if (evento && evento.tipo === "obstaculo") dist = p.passouEvento ? dist : Math.floor(dist / 2 / 1.5) * 1.5;
      if (evento && evento.tipo === "atalho" && p.tentouAtalho) dist = p.passouEvento ? dist * 2 : Math.floor(dist / 2 / 1.5) * 1.5;
      return { id: p.id, avancou: dist, total: (Number(p.total) || 0) + dist };
    });
  }
  var REGRAS_PERSEGUICAO = { pagina: 274, r: "Cada participante faz Atletismo (corrida) por rodada; perseguidores começam em 0 e fugitivos na distância inicial (1d10 × 3 m na dúvida). Passou a distância de um fugitivo, alcançou. Corre 1 + Con rodadas; depois Fortitude CD 15 (+1) ou fica fatigado e sai." };

  var URBANO = [
    { chave: "ruas", nome: "Ruas", r: "Ruas de 3–6 m, becos de 1,5–3 m, avenidas de até 9 m. Terra batida com chuva pede Acrobacia para correr ou investir." },
    { chave: "muros", nome: "Muros e portões", r: "Muros de 6–9 m (metrópole até 18 m), ameias com cobertura leve, escalar CD 25. Portão de madeira RD 5, 60 PV; de ferro RD 10, 300 PV." },
    { chave: "telhados", nome: "Telhados", r: "Subir CD 20; andar Acrobacia CD 10 por ação de movimento (+5 correndo); saltar para o próximo Atletismo CD 20." },
    { chave: "esgotos", nome: "Esgotos", r: "Só em metrópoles: abrir bueiro (completa) e descer (movimento) ou saltar (livre; Atletismo CD 15 ou 1d6)." },
    { chave: "multidoes", nome: "Multidões", r: "Terreno difícil e cobertura leve; fogem 9 m por rodada do perigo; direcionar com Diplomacia CD 15 (completa) ou Intimidação CD 20 (livre)." },
  ];

  /* Tempo entre aventuras (p. 276–279): uma ação por mês. */
  var CUSTO_DE_VIDA = [
    { chave: "pobre", nome: "Pobre", custo: 10, descanso: "ruim" },
    { chave: "medio", nome: "Médio", custo: 50, descanso: "normal" },
    { chave: "rico", nome: "Rico", custo: 100, descanso: "confortavel" },
    { chave: "luxuoso", nome: "Luxuoso", custo: 200, descanso: "luxuosa" },
  ];
  /* Treinamento: três testes do atributo escolhido, CD 10 + ½ nível;
     dois sucessos dão um benefício do próximo nível (PV, PM, uma
     habilidade de classe, ou +1 nas perícias se o próximo nível for par).
     Quatro benefícios: sobe de nível. Variante: T$ 100 por nível. */
  var BENEFICIOS_TREINO = [{ chave: "pv", nome: "PV do próximo nível" }, { chave: "pm", nome: "PM do próximo nível" }, { chave: "habilidade", nome: "Uma habilidade de classe do próximo nível" }, { chave: "pericias", nome: "+1 em todas as perícias (próximo nível par)", soPar: true }];
  function treinamento(rolar, atributo, nivel) {
    var cd = 10 + Math.floor((Number(nivel) || 1) / 2);
    var testes = [0, 1, 2].map(function () { var d = rolar("1d20"); var t = d + (Number(atributo) || 0); return { d20: d, total: t, sucesso: d === 20 || (d !== 1 && t >= cd) }; });
    var s = testes.filter(function (t) { return t.sucesso; }).length;
    return { cd: cd, testes: testes, sucessos: s, beneficio: s >= 2, custoVariante: 100 * (Number(nivel) || 1) };
  }
  /* Busca: três perícias (jogador, mestre e 2d12 na Tabela 6-6), CD 20 +
     ½ nível (+5 se ousada). 0 sucessos: castigo; 1: nada; 2: uma
     recompensa (ou duas se ousada); 3: duas (ou três se ousada). */
  var DESAFIOS_BUSCA = { 2: ["misticismo", "Decifrar uma runa"], 3: ["adestramento", "Acalmar uma fera"], 4: ["conhecimento", "Traduzir um texto antigo"], 5: ["enganacao", "Participar de uma intriga"], 6: ["cura", "Tratar um veneno"], 7: ["iniciativa", "Perseguir um bandido"], 8: ["intimidacao", "Negociar com um criminoso"], 9: ["investigacao", "Descobrir uma localização"], 10: ["reflexos", "Evitar um desmoronamento"], 11: ["atletismo", "Escalar um penhasco"], 12: ["percepcao", "Evitar uma emboscada"], 13: ["sobrevivencia", "Atravessar os ermos"], 14: ["fortitude", "Tolerar clima ruim"], 15: ["diplomacia", "Negociar com um mercador"], 16: ["furtividade", "Infiltrar-se num lugar"], 17: ["acrobacia", "Atravessar uma ravina"], 18: ["intuicao", "Elucidar um enigma"], 19: ["vontade", "Resistir a uma maldição"], 20: ["luta", "Defender-se de um monstro"], 21: ["jogatina", "Apostar com as fadas"], 22: ["nobreza", "Participar de um baile"], 23: ["religiao", "Entender um presságio"], 24: ["guerra", "Atravessar um campo de batalha"] };
  var RECOMPENSAS_BUSCA = ["Tesouro (riqueza)", "Favor", "Tesouro (item)", "Informação", "Tesouro (ambos)", "Poder"];
  var CASTIGOS_BUSCA = ["Ruína (menor)", "Abalo", "Complicação", "Ferimento", "Maldição", "Ruína (maior)"];
  var CONSEQUENCIAS_TEXTO = {
    "Favor": "Um favor de NPC ou organização que ajuda por uma cena (o mestre aprova).",
    "Informação": "Uma informação escolhida (o mestre aprova).",
    "Poder": "Um benefício de treinamento aleatório.",
    "Tesouro (riqueza)": "Rolagem de riquezas na linha do seu nível (Tabela 8-1).",
    "Tesouro (item)": "Rolagem de itens na linha do seu nível (Tabela 8-1).",
    "Tesouro (ambos)": "Riquezas e itens na linha do seu nível (Tabela 8-1).",
    "Abalo": "Na próxima aventura, PM máximos –1 por nível.",
    "Complicação": "Uma complicação definida pelo mestre.",
    "Ferimento": "Na próxima aventura, PV máximos –1 por nível (cura não resolve).",
    "Maldição": "Rogar Maldição na próxima aventura.",
    "Ruína (menor)": "Perde 1/4 do dinheiro inicial do seu nível (sem dinheiro: Abalo).",
    "Ruína (maior)": "Perde 1/2 do dinheiro inicial do seu nível (sem dinheiro: Abalo).",
  };
  function desafioDeBusca(rolar) { var t = rolar("1d12") + rolar("1d12"); return { rolagem: t, pericia: DESAFIOS_BUSCA[t][0], exemplo: DESAFIOS_BUSCA[t][1] }; }
  function resultadoDeBusca(sucessos, ousada, rolar) {
    var rec = 0, cast = 0;
    if (sucessos === 0) cast = 1;
    else if (sucessos === 2) rec = 1 + (ousada ? 1 : 0);
    else if (sucessos >= 3) rec = 2 + (ousada ? 1 : 0);
    var out = [];
    for (var i = 0; i < rec; i++) { var r = RECOMPENSAS_BUSCA[rolar("1d6") - 1]; out.push({ tipo: "recompensa", nome: r, texto: CONSEQUENCIAS_TEXTO[r] }); }
    for (var j = 0; j < cast; j++) { var c = CASTIGOS_BUSCA[rolar("1d6") - 1]; out.push({ tipo: "castigo", nome: c, texto: CONSEQUENCIAS_TEXTO[c] }); }
    return { sucessos: sucessos, consequencias: out };
  }


  global.RAMATormenta20MesaDados = {
    ATITUDES: ATITUDES, NPC_RAPIDO: NPC_RAPIDO, CLIMA: CLIMA, TERRENOS: TERRENOS, ELEMENTOS_ERMOS: ELEMENTOS_ERMOS, viagem: viagem,
    PERSEGUICAO: PERSEGUICAO, eventoDePerseguicao: eventoDePerseguicao, rodadaDePerseguicao: rodadaDePerseguicao, REGRAS_PERSEGUICAO: REGRAS_PERSEGUICAO, URBANO: URBANO,
    CUSTO_DE_VIDA: CUSTO_DE_VIDA, BENEFICIOS_TREINO: BENEFICIOS_TREINO, treinamento: treinamento,
    DESAFIOS_BUSCA: DESAFIOS_BUSCA, RECOMPENSAS_BUSCA: RECOMPENSAS_BUSCA, CASTIGOS_BUSCA: CASTIGOS_BUSCA, CONSEQUENCIAS_TEXTO: CONSEQUENCIAS_TEXTO, desafioDeBusca: desafioDeBusca, resultadoDeBusca: resultadoDeBusca,
  };
})(typeof window !== "undefined" ? window : globalThis);
