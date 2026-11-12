/* =====================================================================
   R.A.M.A. — Tormenta20 · parceiros (Livro Básico, p. 260–262)
   ---------------------------------------------------------------------
   Parceiros não agem: dão um bônus a quem ajudam, pelo tipo e pelo
   nível (iniciante, veterano, mestre). Limite por patamar: 1 até o 4º
   nível, 2 do 5º ao 16º, 3 do 17º em diante. Bônus de parceiros não se
   acumulam entre si (categoria "parceiro", p. 226).
   Cada tipo: { nome, resumo, niveis: { iniciante, veterano, mestre } },
   e cada nível: { r (resumo), efeitos: [...] } no vocabulário do motor.
   ===================================================================== */

(function (global) {
  "use strict";

  var NIVEIS = ["iniciante", "veterano", "mestre"];
  function n(r, efeitos, extra) { return Object.assign({ r: r, efeitos: efeitos || [] }, extra || {}); }

  var TIPOS = {
    adepto: { nome: "Adepto", pagina: 260, resumo: "Conjurador que ajuda a lançar magias.", niveis: {
      iniciante: n("Magias de 1º círculo custam –1 PM.", [{ t: "descontoMagia", valor: 1, circulos: [1] }]),
      veterano: n("Magias de 1º e 2º círculos custam –1 PM.", [{ t: "descontoMagia", valor: 1, circulos: [1, 2] }]),
      mestre: n("Como veterano, e a redução acumula com outras.", [{ t: "descontoMagia", valor: 1, circulos: [1, 2], cumulativo: true }]) } },
    ajudante: { nome: "Ajudante", pagina: 260, resumo: "Bardo, nobre ou sábio que encoraja. Perícias definidas pelo parceiro (nunca Luta nem Pontaria).", escolhaPericias: true, niveis: {
      iniciante: n("+2 em duas perícias.", [], { pericias: 2, valor: 2 }),
      veterano: n("+2 em três perícias.", [], { pericias: 3, valor: 2 }),
      mestre: n("+4 em três perícias.", [], { pericias: 3, valor: 4 }) } },
    assassino: { nome: "Assassino", pagina: 260, resumo: "Ladino ou outro tipo furtivo e letal.", niveis: {
      iniciante: n("Ataque Furtivo +1d6 (acumula com o seu).", [{ t: "ataqueFurtivo", valor: "1d6" }]),
      veterano: n("Ataque Furtivo +1d6 e bônus de flanquear contra um inimigo por rodada.", [{ t: "ataqueFurtivo", valor: "1d6" }, { t: "flanqueiaUm" }]),
      mestre: n("Ataque Furtivo +2d6 e bônus de flanquear contra um inimigo por rodada.", [{ t: "ataqueFurtivo", valor: "2d6" }, { t: "flanqueiaUm" }]) } },
    atirador: { nome: "Atirador", pagina: 261, resumo: "Arqueiro, besteiro ou outro combatente à distância.", niveis: {
      iniciante: n("Uma vez por rodada, +1d6 num dano à distância.", [{ t: "danoUmaVez", valor: "1d6", alvo: "distancia" }]),
      veterano: n("Uma vez por rodada, +1d10 num dano à distância.", [{ t: "danoUmaVez", valor: "1d10", alvo: "distancia" }]),
      mestre: n("Uma vez por rodada, +2d8 num dano à distância.", [{ t: "danoUmaVez", valor: "2d8", alvo: "distancia" }]) } },
    combatente: { nome: "Combatente", pagina: 261, resumo: "Bucaneiro, guerreiro, paladino ou animal de caça.", niveis: {
      iniciante: n("+2 em testes de ataque.", [{ t: "bonus", alvo: "ataque", valor: 2, categoria: "parceiro" }]),
      veterano: n("+3 em testes de ataque.", [{ t: "bonus", alvo: "ataque", valor: 3, categoria: "parceiro" }]),
      mestre: n("+4 em testes de ataque e, uma vez por rodada, 5 PM para um ataque extra.", [{ t: "bonus", alvo: "ataque", valor: 4, categoria: "parceiro" }], { acao: { nome: "Ataque extra do parceiro", custo: 5, execucao: "livre", limite: "rodada" } }) } },
    destruidor: { nome: "Destruidor", pagina: 261, resumo: "Arcanista ou inventor (tipo de dano conforme o parceiro: ácido, eletricidade, fogo ou frio).", escolhaElemento: true, niveis: {
      iniciante: n("Uma vez por rodada, ação livre e 1 PM: 2d6 num alvo em alcance curto.", [], { acoes: [{ custo: 1, dano: "2d6", alcance: "curto" }] }),
      veterano: n("Como acima, ou 2 PM para 4d6.", [], { acoes: [{ custo: 1, dano: "2d6", alcance: "curto" }, { custo: 2, dano: "4d6", alcance: "curto" }] }),
      mestre: n("Como acima, ou 4 PM para 6d6 em área de 6 m de raio em alcance médio.", [], { acoes: [{ custo: 1, dano: "2d6", alcance: "curto" }, { custo: 2, dano: "4d6", alcance: "curto" }, { custo: 4, dano: "6d6", alcance: "medio", area: "6m de raio" }] }) } },
    fortao: { nome: "Fortão", pagina: 261, resumo: "Bárbaro, lutador ou outro brutamontes.", niveis: {
      iniciante: n("Uma vez por rodada, +1d8 num dano corpo a corpo.", [{ t: "danoUmaVez", valor: "1d8", alvo: "corpo" }]),
      veterano: n("Uma vez por rodada, +1d12 num dano corpo a corpo.", [{ t: "danoUmaVez", valor: "1d12", alvo: "corpo" }]),
      mestre: n("Uma vez por rodada, +3d6 num dano corpo a corpo.", [{ t: "danoUmaVez", valor: "3d6", alvo: "corpo" }]) } },
    guardiao: { nome: "Guardião", pagina: 261, resumo: "Cavaleiro, cão de guarda ou protetor.", niveis: {
      iniciante: n("+2 na Defesa.", [{ t: "bonus", alvo: "defesa", valor: 2, categoria: "parceiro" }]),
      veterano: n("+3 na Defesa.", [{ t: "bonus", alvo: "defesa", valor: 3, categoria: "parceiro" }]),
      mestre: n("+4 na Defesa e +2 nos testes de resistência.", [{ t: "bonus", alvo: "defesa", valor: 4, categoria: "parceiro" }, { t: "bonus", alvo: "resistencias", valor: 2, categoria: "parceiro" }]) } },
    magivocador: { nome: "Magivocador", pagina: 261, resumo: "Conjurador de magias ofensivas.", niveis: {
      iniciante: n("O dano das suas magias ganha +1 dado do mesmo tipo.", [{ t: "dadoExtraMagia", valor: 1 }]),
      veterano: n("+1 dado de dano nas magias e +1 na CD delas.", [{ t: "dadoExtraMagia", valor: 1 }, { t: "cdMagia", valor: 1 }]),
      mestre: n("+2 dados de dano nas magias e +2 na CD delas.", [{ t: "dadoExtraMagia", valor: 2 }, { t: "cdMagia", valor: 2 }]) } },
    medico: { nome: "Médico", pagina: 261, resumo: "Clérigo, druida ou herbalista.", niveis: {
      iniciante: n("Uma vez por rodada, 1 PM: cura 1d8+1 PV de uma criatura adjacente.", [], { acoes: [{ custo: 1, cura: "1d8+1" }] }),
      veterano: n("Como acima, ou 3 PM para curar 3d8+3 PV ou remover uma condição prejudicial.", [], { acoes: [{ custo: 1, cura: "1d8+1" }, { custo: 3, cura: "3d8+3", ouCondicao: true }] }),
      mestre: n("Como acima, ou 5 PM para curar 6d8+6 PV.", [], { acoes: [{ custo: 1, cura: "1d8+1" }, { custo: 3, cura: "3d8+3", ouCondicao: true }, { custo: 5, cura: "6d8+6" }] }) } },
    perseguidor: { nome: "Perseguidor", pagina: 261, resumo: "Caçador ou animal farejador.", niveis: {
      iniciante: n("+2 em Percepção e Sobrevivência.", [{ t: "bonus", alvo: "pericia.percepcao", valor: 2, categoria: "parceiro" }, { t: "bonus", alvo: "pericia.sobrevivencia", valor: 2, categoria: "parceiro" }]),
      veterano: n("Pode usar Sentidos Aguçados.", [{ t: "sentido", valor: "sentidosAgucados" }]),
      mestre: n("Pode usar Percepção às Cegas.", [{ t: "sentido", valor: "percepcaoAsCegas" }]) } },
    vigilante: { nome: "Vigilante", pagina: 261, resumo: "Vigia ou animal de guarda.", niveis: {
      iniciante: n("+2 em Percepção e Iniciativa.", [{ t: "bonus", alvo: "pericia.percepcao", valor: 2, categoria: "parceiro" }, { t: "bonus", alvo: "pericia.iniciativa", valor: 2, categoria: "parceiro" }]),
      veterano: n("Pode usar Esquiva Sobrenatural.", [{ t: "habilidade", valor: "esquivaSobrenatural" }]),
      mestre: n("Pode usar Olhos nas Costas.", [{ t: "habilidade", valor: "olhosNasCostas" }]) } },
    /* Montarias (p. 261–262): precisam ser montadas; sem treino em
       Cavalgar, ação de movimento e Cavalgar CD 10 por turno. */
    cavalo: { nome: "Cavalo (ou pônei)", pagina: 262, montaria: true, tamanho: "grande", resumo: "A montaria mais comum do Reinado; pônei é Médio.", niveis: {
      iniciante: n("Deslocamento 12 m e uma ação de movimento extra por turno (só para se deslocar).", [{ t: "deslocamento", tipo: "terrestre", fixo: 12 }, { t: "movimentoExtra" }]),
      veterano: n("Deslocamento 15 m, movimento extra e +2 em ataques corpo a corpo.", [{ t: "deslocamento", tipo: "terrestre", fixo: 15 }, { t: "movimentoExtra" }, { t: "bonus", alvo: "ataque.corpo", valor: 2, categoria: "parceiro" }]),
      mestre: n("Como veterano e uma segunda ação de movimento extra.", [{ t: "deslocamento", tipo: "terrestre", fixo: 15 }, { t: "movimentoExtra", valor: 2 }, { t: "bonus", alvo: "ataque.corpo", valor: 2, categoria: "parceiro" }]) } },
    caoDeCaca: { nome: "Cão de caça", pagina: 262, montaria: true, tamanho: "medio", resumo: "Montaria de personagens Pequenos ou Minúsculos.", niveis: {
      iniciante: n("Deslocamento 9 m, faro e movimento extra por turno.", [{ t: "deslocamento", tipo: "terrestre", fixo: 9 }, { t: "sentido", valor: "faro" }, { t: "movimentoExtra" }]),
      veterano: n("Deslocamento 12 m, faro, movimento extra e +2 na Defesa.", [{ t: "deslocamento", tipo: "terrestre", fixo: 12 }, { t: "sentido", valor: "faro" }, { t: "movimentoExtra" }, { t: "bonus", alvo: "defesa", valor: 2, categoria: "parceiro" }]),
      mestre: n("Como veterano e, uma vez por rodada, derrubar como ação livre ao acertar corpo a corpo.", [{ t: "deslocamento", tipo: "terrestre", fixo: 12 }, { t: "sentido", valor: "faro" }, { t: "movimentoExtra" }, { t: "bonus", alvo: "defesa", valor: 2, categoria: "parceiro" }, { t: "derrubarLivre" }]) } },
    loboDasCavernas: { nome: "Lobo-das-cavernas (ou lobo)", pagina: 262, montaria: true, tamanho: "grande", resumo: "Montaria de goblinoides e aventureiros selvagens; lobo comum é Médio.", niveis: {
      iniciante: n("Deslocamento 12 m e movimento extra por turno.", [{ t: "deslocamento", tipo: "terrestre", fixo: 12 }, { t: "movimentoExtra" }]),
      veterano: n("Deslocamento 15 m, movimento extra e, uma vez por rodada, +1d8 num dano corpo a corpo.", [{ t: "deslocamento", tipo: "terrestre", fixo: 15 }, { t: "movimentoExtra" }, { t: "danoUmaVez", valor: "1d8", alvo: "corpo" }]),
      mestre: n("Como veterano e derrubar como ação livre ao acertar corpo a corpo (uma vez por rodada).", [{ t: "deslocamento", tipo: "terrestre", fixo: 15 }, { t: "movimentoExtra" }, { t: "danoUmaVez", valor: "1d8", alvo: "corpo" }, { t: "derrubarLivre" }]) } },
    grifo: { nome: "Grifo", pagina: 262, montaria: true, tamanho: "grande", resumo: "Fera cobiçada; o filhote (iniciante) não serve de montaria.", niveis: {
      iniciante: n("Uma vez por rodada, +1d8 num dano corpo a corpo (não é montaria).", [{ t: "danoUmaVez", valor: "1d8", alvo: "corpo" }], { naoMontavel: true }),
      veterano: n("+1d8 num dano corpo a corpo e, montado, voo 18 m.", [{ t: "danoUmaVez", valor: "1d8", alvo: "corpo" }, { t: "deslocamento", tipo: "voo", base: 18 }]),
      mestre: n("Como veterano e movimento extra por turno.", [{ t: "danoUmaVez", valor: "1d8", alvo: "corpo" }, { t: "deslocamento", tipo: "voo", base: 18 }, { t: "movimentoExtra" }]) } },
    gorlogg: { nome: "Gorlogg", pagina: 262, montaria: true, tamanho: "grande", resumo: "Besta primitiva dos mais selvagens.", niveis: {
      iniciante: n("Deslocamento 12 m e, uma vez por rodada, +1d6 num dano corpo a corpo.", [{ t: "deslocamento", tipo: "terrestre", fixo: 12 }, { t: "danoUmaVez", valor: "1d6", alvo: "corpo" }]),
      veterano: n("Deslocamento 12 m e +1d10 num dano corpo a corpo por rodada.", [{ t: "deslocamento", tipo: "terrestre", fixo: 12 }, { t: "danoUmaVez", valor: "1d10", alvo: "corpo" }]),
      mestre: n("Deslocamento 15 m e +2d8 num dano corpo a corpo por rodada.", [{ t: "deslocamento", tipo: "terrestre", fixo: 15 }, { t: "danoUmaVez", valor: "2d8", alvo: "corpo" }]) } },
    trobo: { nome: "Trobo", pagina: 262, montaria: true, tamanho: "grande", resumo: "Animal de carga e tração que também serve de montaria.", niveis: {
      iniciante: n("Deslocamento 9 m, movimento extra e +1 nos testes de resistência.", [{ t: "deslocamento", tipo: "terrestre", fixo: 9 }, { t: "movimentoExtra" }, { t: "bonus", alvo: "resistencias", valor: 1, categoria: "parceiro" }]),
      veterano: n("Deslocamento 12 m, movimento extra e +2 nas resistências.", [{ t: "deslocamento", tipo: "terrestre", fixo: 12 }, { t: "movimentoExtra" }, { t: "bonus", alvo: "resistencias", valor: 2, categoria: "parceiro" }]),
      mestre: n("Deslocamento 12 m, movimento extra e +5 nas resistências.", [{ t: "deslocamento", tipo: "terrestre", fixo: 12 }, { t: "movimentoExtra" }, { t: "bonus", alvo: "resistencias", valor: 5, categoria: "parceiro" }]) } },
  };

  var REGRAS_MONTARIA = {
    pagina: 261,
    texto: "Montar e desmontar são ações de movimento. Sem treino em Cavalgar, guiar exige ação de movimento e Cavalgar CD 10 por turno (falha perde a ação; por 5 ou mais, cai e sofre 1d6). Sofrer dano montado pede Cavalgar com CD igual ao dano (Ginete dispensa). Montado, ataques à distância sofrem –2 e lançar magia é condição ruim (Ginete dispensa). Só se monta algo maior que você; montado, usa o tamanho dela para espaço e Furtividade.",
  };

  function limite(nivel) { var n2 = Number(nivel) || 1; return n2 >= 17 ? 3 : (n2 >= 5 ? 2 : 1); }

  /* Variante parceiros vulneráveis (p. 262): ao sofrer dano, um dado por
     parceiro (d4 iniciante, d6 veterano, d8 mestre); 1 fere; outro 1 com
     o parceiro ferido o mata. */
  var DADO_VULNERAVEL = { iniciante: 4, veterano: 6, mestre: 8 };
  function testarVulneraveis(parceiros, rolar) {
    var eventos = [];
    (parceiros || []).forEach(function (p) {
      if (p.ativo === false || p.morto) return;
      var faces = DADO_VULNERAVEL[p.nivel] || 4;
      var r = rolar("1d" + faces);
      if (r === 1) {
        if (p.ferido) { p.morto = true; p.ativo = false; eventos.push({ parceiro: p.id, nome: p.nome, morreu: true, rolagem: r, faces: faces }); }
        else { p.ferido = true; eventos.push({ parceiro: p.id, nome: p.nome, ferido: true, rolagem: r, faces: faces }); }
      } else eventos.push({ parceiro: p.id, nome: p.nome, rolagem: r, faces: faces });
    });
    return eventos;
  }

  /* Efeitos de um parceiro na ficha (todos os tipos dele). */
  function efeitosDoParceiro(p) {
    var out = [];
    var tipos = (p.tipos && p.tipos.length ? p.tipos : [p.tipo]).filter(Boolean);
    tipos.forEach(function (t) {
      var def = TIPOS[t];
      if (!def) return;
      var lv = def.niveis[p.nivel] || def.niveis.iniciante;
      out = out.concat(JSON.parse(JSON.stringify(lv.efeitos || [])));
      if (lv.pericias && p.pericias) (p.pericias || []).slice(0, lv.pericias).forEach(function (k) { if (k !== "luta" && k !== "pontaria") out.push({ t: "bonus", alvo: "pericia." + k, valor: lv.valor, categoria: "parceiro" }); });
    });
    return out;
  }

  global.RAMATormenta20Parceiros = { TIPOS: TIPOS, NIVEIS: NIVEIS, REGRAS_MONTARIA: REGRAS_MONTARIA, limite: limite, testarVulneraveis: testarVulneraveis, efeitosDoParceiro: efeitosDoParceiro, DADO_VULNERAVEL: DADO_VULNERAVEL };
})(typeof window !== "undefined" ? window : globalThis);
