/* =====================================================================
   R.A.M.A. — Malditos Goblins · a mesa da campanha (o Covil)
   =====================================================================
   O estado que o mestre guarda numa campanha de Malditos Goblins
   (CAMPANHA_GOBLINS, uma linha por campanha). Puro como o resto: quem
   rola passa o rolador. O mesmo arquivo roda no servidor.

     regras        as regras opcionais e adaptações da campanha (o
                   mestre aplica às fichas por goblins_operar)
     dia           o dia da campanha
     combate       participantes (goblins, inimigos do catálogo,
                   aliados), ordem MANUAL (p. 15: quem surpreende age
                   primeiro, os goblins escolhem a ordem entre si),
                   rodada, vez, efeitos com duração por marco, ações
                   demoradas (Galinha Explosiva, Uivo do Lobo, Veneno),
                   efeitos da mesa (Tempestade)
     sorteios      cada sorteio com tabela, dados e resultado, guardado
                   pelo id da operação: refazer a mesma operação devolve
                   o MESMO sorteio, e sortear de novo é outro registro
     masmorras     as geradas (p. 28–29), segmento a segmento
     rivais        o Bando Rival (p. 23)
     negociacoes   o registro das negociações (p. 18)
     registro      o que aconteceu

   Valores dos inimigos: `null` é atributo que não existe (o "-" do
   livro), 0 é zero, e a Besta Indescritível não tem número nenhum. A
   proteção do inimigo é um contador À PARTE da Vitalidade.
   ===================================================================== */

(function (global) {
  "use strict";

  var VERSAO = 1;
  var MAX_SORTEIOS = 200, MAX_REGISTRO = 300, MAX_PARTICIPANTES = 60, MAX_MASMORRAS = 12, MAX_SEGMENTOS = 40;

  function C() { return global.RAMAGoblinsCatalogo; }
  function D() { return global.RAMAGoblinsDados; }

  function copiar(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
  var contador = 0;
  function novoId(p) {
    var U = global.RAMAUtil;
    if (U && U.uuid) return (p || "m") + "-" + U.uuid().replace(/-/g, "").slice(0, 16);
    contador++;
    return (p || "m") + "-" + Date.now().toString(36) + "-" + contador;
  }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function objeto(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function texto(v, max) { return typeof v === "string" ? v.slice(0, max || 200) : ""; }
  function inteiro(v, min, padrao) {
    var n = Math.floor(Number(v));
    if (!isFinite(n)) n = padrao === undefined ? 0 : padrao;
    return min !== undefined && min !== null && n < min ? min : n;
  }
  /* Número ou null (atributo que não existe). */
  function numeroOuNulo(v) { if (v === null || v === undefined || v === "") return null; var n = Math.floor(Number(v)); return isFinite(n) ? n : null; }
  function chaveValida(v) { return typeof v === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(v); }
  function falha(m) { return { ok: false, motivo: m }; }

  function vazio() {
    return {
      v: VERSAO,
      regras: { vozGoblin: false, deuRuim: false, niveisEpicos: false, explosoesManuais: false, adaptacoes: { cthulin: false, pokepragas: false, wargoblin: false, goblinHigh: false, vale: false } },
      dia: 1,
      combate: { ativo: false, rodada: 0, vez: 0, surpresa: "", ordem: [], participantes: [], acoes: [], efeitosDaMesa: [] },
      sorteios: [], masmorras: [], rivais: [], negociacoes: [], registro: [], notas: "", seq: 0,
    };
  }

  function normalizarEfeito(b) {
    var x = objeto(b);
    var e = { id: chaveValida(x.id) ? x.id : novoId("ef"), chave: texto(x.chave, 60) || "efeito", nome: texto(x.nome, 120) || "Efeito", ate: ["turnos", "fimDaBatalha", "manual", "proximoAtaque"].indexOf(x.ate) >= 0 ? x.ate : "manual", turnos: inteiro(x.turnos, 0), ataque: inteiro(x.ataque), semAgir: x.semAgir === true, semAtaque: x.semAtaque === true, porTurno: inteiro(x.porTurno, 0), porMinuto: inteiro(x.porMinuto, 0), fonte: texto(x.fonte, 120) };
    return e;
  }

  function normalizarParticipante(b) {
    var x = objeto(b);
    var p = {
      id: chaveValida(x.id) ? x.id : novoId("pa"),
      tipo: ["pc", "inimigo", "aliado"].indexOf(x.tipo) >= 0 ? x.tipo : "inimigo",
      personagemId: chaveValida(x.personagemId) ? x.personagemId : "",
      chave: chaveValida(x.chave) ? x.chave : "",
      nome: texto(x.nome, 80) || "Participante",
      lado: x.lado === "goblins" ? "goblins" : "inimigos",
      combate: numeroOuNulo(x.combate), bonusCombate: numeroOuNulo(x.bonusCombate), nocao: numeroOuNulo(x.nocao), habilidade: numeroOuNulo(x.habilidade), vitalidade: numeroOuNulo(x.vitalidade),
      protecao: x.protecao && typeof x.protecao === "object" ? { atual: inteiro(x.protecao.atual, 0), original: inteiro(x.protecao.original, 0) } : null,
      ferimentos: inteiro(x.ferimentos, 0),
      efeitos: lista(x.efeitos).slice(0, 20).map(normalizarEfeito),
      derrotado: x.derrotado === true,
      indescritivel: x.indescritivel === true,
      turnosRestantes: x.turnosRestantes === null || x.turnosRestantes === undefined ? null : inteiro(x.turnosRestantes, 0),
      ateFimDaBatalha: x.ateFimDaBatalha === true,
      oculto: x.oculto === true,
      nota: texto(x.nota, 400),
    };
    return p;
  }

  function normalizar(bruto) {
    var b = objeto(bruto);
    var e = vazio();
    var rg = objeto(b.regras), ad = objeto(rg.adaptacoes);
    ["vozGoblin", "deuRuim", "niveisEpicos", "explosoesManuais"].forEach(function (k) { e.regras[k] = rg[k] === true; });
    Object.keys(e.regras.adaptacoes).forEach(function (k) { e.regras.adaptacoes[k] = ad[k] === true; });
    e.dia = inteiro(b.dia, 1, 1);
    var cb = objeto(b.combate);
    e.combate.ativo = cb.ativo === true;
    e.combate.rodada = inteiro(cb.rodada, 0);
    e.combate.vez = inteiro(cb.vez, 0);
    e.combate.surpresa = ["goblins", "inimigos", ""].indexOf(cb.surpresa) >= 0 ? cb.surpresa : "";
    e.combate.participantes = lista(cb.participantes).slice(0, MAX_PARTICIPANTES).map(normalizarParticipante);
    var ids = e.combate.participantes.map(function (p) { return p.id; });
    e.combate.ordem = lista(cb.ordem).filter(function (id) { return ids.indexOf(id) >= 0; }).filter(function (id, i, t) { return t.indexOf(id) === i; });
    ids.forEach(function (id) { if (e.combate.ordem.indexOf(id) < 0) e.combate.ordem.push(id); });
    if (e.combate.vez >= e.combate.ordem.length) e.combate.vez = 0;
    e.combate.acoes = lista(cb.acoes).slice(0, 30).map(function (a) {
      var y = objeto(a);
      return { id: chaveValida(y.id) ? y.id : novoId("ac"), nome: texto(y.nome, 120), turnos: inteiro(y.turnos, 0), tipo: texto(y.tipo, 30), ferimentos: inteiro(y.ferimentos, 0), inimigo: chaveValida(y.inimigo) ? y.inimigo : "", fonte: texto(y.fonte, 120) };
    });
    e.combate.efeitosDaMesa = lista(cb.efeitosDaMesa).slice(0, 20).map(normalizarEfeito);
    e.sorteios = lista(b.sorteios).slice(-MAX_SORTEIOS).map(function (s) {
      var y = objeto(s);
      return { id: chaveValida(y.id) ? y.id : novoId("so"), n: inteiro(y.n, 0), tabela: texto(y.tabela, 60), nome: texto(y.nome, 120), pagina: y.pagina ? inteiro(y.pagina, 0) : null, dados: lista(y.dados).map(function (d) { return inteiro(d, 0); }).slice(0, 40), resultado: y.resultado === undefined ? null : copiar(y.resultado), texto: texto(y.texto, 600), detalhes: lista(y.detalhes).slice(0, 30).map(function (d) { return copiar(objeto(d)); }), oculto: y.oculto === true, dia: inteiro(y.dia, 0) };
    });
    e.masmorras = lista(b.masmorras).slice(-MAX_MASMORRAS).map(function (m) {
      var y = objeto(m);
      return { id: chaveValida(y.id) ? y.id : novoId("ms"), tipo: C().MASMORRAS[y.tipo] ? y.tipo : "caverna", dadosTipo: lista(y.dadosTipo).map(function (d) { return inteiro(d, 0); }), segmentos: lista(y.segmentos).slice(0, MAX_SEGMENTOS).map(function (s) { return copiar(objeto(s)); }), oculto: y.oculto === true, nome: texto(y.nome, 80) };
    });
    e.rivais = lista(b.rivais).slice(0, 20).map(function (r) { return copiar(objeto(r)); });
    e.negociacoes = lista(b.negociacoes).slice(-40).map(function (r) { return copiar(objeto(r)); });
    e.registro = lista(b.registro).slice(-MAX_REGISTRO).map(function (r) { var y = objeto(r); return { n: inteiro(y.n, 0), dia: inteiro(y.dia, 0), texto: texto(y.texto, 400), privado: y.privado === true }; });
    e.notas = texto(b.notas, 8000);
    e.seq = inteiro(b.seq, 0);
    return e;
  }

  function registrar(e, t, privado) {
    e.seq++;
    e.registro.push({ n: e.seq, dia: e.dia, texto: String(t).slice(0, 400), privado: !!privado });
    if (e.registro.length > MAX_REGISTRO) e.registro = e.registro.slice(-MAX_REGISTRO);
  }

  /* O que os jogadores veem: sem notas, sem o registro privado, sem
     participantes, sorteios e masmorras ocultos. */
  function vistaDosJogadores(e) {
    var v = copiar(e);
    v.notas = "";
    v.registro = v.registro.filter(function (r) { return !r.privado; });
    v.combate.participantes = v.combate.participantes.filter(function (p) { return !p.oculto; });
    var vis = v.combate.participantes.map(function (p) { return p.id; });
    v.combate.ordem = v.combate.ordem.filter(function (id) { return vis.indexOf(id) >= 0; });
    v.sorteios = v.sorteios.filter(function (s) { return !s.oculto; });
    v.masmorras = v.masmorras.filter(function (m) { return !m.oculto; });
    return v;
  }

  /* ---------------------------------------------------------------
     TABELAS (cada uma: id, nome, página, dados, entradas, texto)
     --------------------------------------------------------------- */

  function textoDeEntrada(r) {
    if (r === null || r === undefined) return "Nada";
    if (typeof r === "string") return r;
    if (Array.isArray(r)) return r.join("; ");
    if (r.texto) return r.texto;
    if (r.cor) return r.cor + ": " + r.texto;
    return JSON.stringify(r);
  }

  function nomes(mapa, lista_) { return lista_.map(function (k) { return mapa[k] ? mapa[k].nome || mapa[k] : k; }); }

  function tabelas() {
    var K = C();
    var GH = K.GOBLIN_HIGH;
    var t = {
      nome: { nome: "Nome", pagina: 4, dados: "colunaLinha", entradas: K.NOMES, grupo: "Personagem" },
      ocupacao: { nome: "Ocupação", pagina: 4, dados: "1d6", entradas: nomes(K.OCUPACOES, K.OCUPACAO_D6), grupo: "Personagem" },
      descritor: { nome: "Descritor", pagina: 4, dados: "1d6", entradas: nomes(K.DESCRITORES, K.DESCRITOR_D6), grupo: "Personagem" },
      caracteristica: { nome: "Característica", pagina: 4, dados: "colunaLinha", entradas: K.CARACTERISTICA_2D6.map(function (col) { return col.map(function (k) { return k === "rolarDuasVezes" ? "[Role 2 vezes]" : K.CARACTERISTICAS[k].nome; }); }), grupo: "Personagem" },
      aventura: { nome: "Aventura Aleatória", pagina: 16, dados: "1d6", entradas: K.AVENTURA_D6.map(function (k) { return K.AVENTURAS[k].nome; }), grupo: "Sem mestre" },
      inspiracao: { nome: "Inspiração", pagina: 16, dados: "1d6", entradas: K.INSPIRACAO_D6, grupo: "Sem mestre" },
      resposta: { nome: "Resposta do Mestre", pagina: 16, dados: "1d6", entradas: K.RESPOSTA_D6, grupo: "Sem mestre" },
      viajante: { nome: "Viajante Aleatório", pagina: 18, dados: "2d6", entradas: K.VIAJANTE_2D6, grupo: "Aventuras", encontro: true },
      vitima: { nome: "Vítima Aleatória", pagina: 18, dados: "1d6", entradas: K.VITIMA_D6, grupo: "Aventuras" },
      recompensa: { nome: "Recompensa", pagina: 18, dados: "1d6", entradas: K.RECOMPENSA_D6, grupo: "Aventuras" },
      local: { nome: "Local Aleatório", pagina: 19, dados: "1d6", entradas: K.LOCAL_D6.map(function (k) { return K.LOCAIS[k].nome; }), grupo: "Aventuras", local: true },
      proteger: { nome: "Invasores Aleatórios (Proteger Masmorra)", pagina: 19, dados: "2d6", entradas: K.PROTEGER_2D6, grupo: "Aventuras", encontro: true },
      vizinhos: { nome: "Bando Inimigo Aleatório (Invadir Vizinhos)", pagina: 19, dados: "2d6", entradas: K.VIZINHOS_2D6, grupo: "Aventuras", encontro: true },
      itemMagico: { nome: "Item Mágico", pagina: 24, dados: "1d6", entradas: K.TIPO_MAGICO_D6.map(function (k) { return K.NOMES_TIPO_MAGICO[k]; }), grupo: "Itens", itemMagico: true },
      pocao: { nome: "Cor da Poção", pagina: 27, dados: "1d6", entradas: K.POCAO_D6, grupo: "Itens" },
      anel: { nome: "Efeito do Anel Mágico", pagina: 25, dados: "1d6", entradas: K.ANEL_D6.map(function (a) { return a.texto; }), grupo: "Itens" },
      deuRuim: { nome: "Mas deu ruim…", pagina: 16, dados: "1d6", entradas: K.DEU_RUIM_D6, grupo: "Regras opcionais" },
      caracteristicaRival: { nome: "Característica Rival", pagina: 23, dados: "2d6", entradas: K.CARACTERISTICA_RIVAL_2D6, grupo: "Inimigos" },
      masmorraTipo: { nome: "Tipo da Masmorra", pagina: 28, dados: "1d6", entradas: K.MASMORRA_TIPO_D6.map(function (k) { return K.MASMORRAS[k].nome; }), grupo: "Masmorra" },
      corredor: { nome: "Conteúdo do Corredor", pagina: 29, dados: "1d6", entradas: K.CORREDOR_D6, grupo: "Masmorra" },
      eventoSobrenatural: { nome: "Evento Sobrenatural", pagina: 32, dados: "1d6", entradas: K.CTHULIN.evento, grupo: "Chamado de Cthulin", adaptacao: "cthulin" },
      procurando: { nome: "Procurando PokéPraga", pagina: 35, dados: "1d6", entradas: ["Não encontrou nada", "Uma PokéPraga comum", "Uma PokéPraga comum", "Uma PokéPraga comum", "Uma PokéPraga incomum", "Uma PokéPraga rara"], grupo: "PokéPragas", adaptacao: "pokepragas" },
      reacao: { nome: "Reação", pagina: 38, dados: "1d6", entradas: GH.reacaoD6.map(function (k) { return GH.nomes[k]; }), grupo: "Goblin High", adaptacao: "goblinHigh" },
      conversa: { nome: "Conversa", pagina: 38, dados: "1d6", entradas: GH.conversaD6.map(function (c) { return c.texto; }), grupo: "Goblin High", adaptacao: "goblinHigh" },
      assunto: { nome: "Assunto", pagina: 38, dados: "1d6", entradas: GH.assunto, grupo: "Goblin High", adaptacao: "goblinHigh" },
      gosto: { nome: "Gosto", pagina: 38, dados: "1d6", entradas: GH.gosto, grupo: "Goblin High", adaptacao: "goblinHigh" },
      materia: { nome: "Matéria", pagina: 38, dados: "1d6", entradas: GH.materia, grupo: "Goblin High", adaptacao: "goblinHigh" },
      segredo: { nome: "Segredo", pagina: 38, dados: "1d6", entradas: GH.segredo, grupo: "Goblin High", adaptacao: "goblinHigh" },
      tePego: { nome: "Te pego na saída", pagina: 39, dados: "1d6", entradas: GH.tePego, grupo: "Goblin High", adaptacao: "goblinHigh" },
    };
    Object.keys(t).forEach(function (k) { t[k].id = k; });
    return t;
  }

  /* Monta os inimigos de um encontro: cada quantidade vira número
     (rolando quando é expressão), e a rolagem fica registrada. */
  function resolverGrupo(grupo, rolador) {
    return lista(grupo).map(function (g) {
      var q = typeof g.quantidade === "number" ? { total: g.quantidade, dados: [], expressao: String(g.quantidade) } : D().quantidade(g.quantidade, rolador);
      return { inimigo: g.inimigo, nome: C().INIMIGOS[g.inimigo] ? C().INIMIGOS[g.inimigo].nome : g.inimigo, quantidade: q.total, expressao: q.expressao, dados: q.dados };
    });
  }

  /* Os detalhes de um local (p. 20): quantidades e chances. */
  function gerarLocal(chave, rolador) {
    var def = C().LOCAIS[chave];
    if (!def) return [];
    var det = [];
    def.conteudo.forEach(function (c) {
      var d = { rotulo: c.rotulo, inimigo: c.inimigo || "", itemMagico: !!c.itemMagico, nota: c.nota || "" };
      if (c.expressao) { var q = D().quantidade(c.expressao, rolador); d.quantidade = q.total; d.dados = q.dados; d.expressao = q.expressao; if (c.metadeCriancas) d.criancas = Math.ceil(q.total / 2); }
      else if (c.quantidade) d.quantidade = c.quantidade;
      else if (c.chance) { var ch = D().chance(c.chance === "50%" ? "50%" : "1em6", rolador); d.chance = c.chance; d.dados = ch.dados; d.saiu = ch.saiu; d.quantidade = ch.saiu ? 1 : 0; if (ch.saiu && c.extra) { var qe = D().quantidade(c.extra.expressao, rolador); d.extra = { inimigo: c.extra.inimigo, quantidade: qe.total, dados: qe.dados }; } }
      else if (c.golem) { var gq = D().chance("50%", rolador); d.inimigo = gq.saiu ? "golemPedra" : "golemMadeira"; d.dados = gq.dados; d.quantidade = 1; d.rotulo = "Golem do 2º piso: " + C().INIMIGOS[d.inimigo].nome; }
      det.push(d);
    });
    return det;
  }

  /* Sorteia numa tabela. O id da operação faz o sorteio ÚNICO: pedir
     de novo com o mesmo id devolve o que já saiu. */
  function sortear(e, tabelaId, opId, rolador, opcoes) {
    var op = opcoes || {};
    var id = chaveValida(opId) ? opId : novoId("so");
    var ja = e.sorteios.filter(function (s) { return s.id === id; })[0];
    if (ja) return { ok: true, repetida: true, sorteio: ja };
    var t = tabelas()[tabelaId];
    if (!t) return falha("Tabela desconhecida.");
    var s = D().sortear(t, rolador);
    var reg = { id: id, n: 0, tabela: tabelaId, nome: t.nome, pagina: t.pagina, dados: s.dados.slice(), resultado: s.resultado, texto: textoDeEntrada(s.resultado), detalhes: [], oculto: !!op.oculto, dia: e.dia };
    if (t.encontro && s.resultado && s.resultado.grupo) reg.detalhes = resolverGrupo(s.resultado.grupo, rolador);
    if (t.encontro && s.resultado && s.resultado.bandoRival) reg.detalhes = [{ bandoRival: true, rotulo: "Gere o Bando Rival (ferramenta ao lado)" }];
    if (t.local) { var chave = C().LOCAL_D6[s.dados[0] - 1]; reg.detalhes = gerarLocal(chave, rolador); reg.resultado = { local: chave, texto: C().LOCAIS[chave].nome }; }
    if (t.itemMagico) {
      var tipo = C().TIPO_MAGICO_D6[s.dados[0] - 1];
      var si = D().sortear({ dados: "1d6", entradas: C().MAGICOS_D6[tipo] }, rolador);
      reg.dados.push(si.dados[0]);
      reg.resultado = { tipo: tipo, item: si.resultado };
      reg.texto = C().NOMES_TIPO_MAGICO[tipo] + ": " + C().ITENS_MAGICOS[si.resultado].nome;
      if (si.resultado === "pocao") { var sp = D().sortear({ dados: "1d6", entradas: C().POCAO_D6 }, rolador); reg.dados.push(sp.dados[0]); reg.resultado.cor = sp.indice; reg.texto += " (" + sp.resultado.cor + ")"; }
    }
    if (tabelaId === "aventura") reg.resultado = { aventura: C().AVENTURA_D6[s.dados[0] - 1], texto: reg.texto };
    if (tabelaId === "recompensa" && s.resultado && s.resultado.itemMagico) {
      var sub = sortear(e, "itemMagico", id + "-item", rolador, op);
      if (sub.ok) reg.detalhes = [{ rotulo: "Item mágico", texto: sub.sorteio.texto }];
    }
    e.seq++;
    reg.n = e.seq;
    e.sorteios.push(reg);
    if (e.sorteios.length > MAX_SORTEIOS) e.sorteios = e.sorteios.slice(-MAX_SORTEIOS);
    registrar(e, t.nome + ": " + reg.texto, !!op.oculto);
    return { ok: true, sorteio: reg };
  }

  /* ---------------------------------------------------------------
     COMBATE (p. 15)
     --------------------------------------------------------------- */

  function participanteDoCatalogo(chave, n) {
    var d = C().INIMIGOS[chave];
    if (!d) return null;
    return normalizarParticipante({
      tipo: "inimigo", chave: chave, nome: d.nome + (n ? " " + n : ""), lado: "inimigos",
      combate: d.combate, bonusCombate: d.bonusCombate, nocao: d.nocao, habilidade: d.habilidade, vitalidade: d.vitalidade,
      protecao: d.protecao ? { atual: d.protecao, original: d.protecao } : null, indescritivel: !!d.indescritivel,
    });
  }

  function adicionarInimigos(e, chave, quantidade, opcoes) {
    var op = opcoes || {};
    var d = C().INIMIGOS[chave];
    if (!d) return falha("Inimigo desconhecido.");
    var q = Math.max(1, Math.min(30, inteiro(quantidade, 1, 1)));
    if (e.combate.participantes.length + q > MAX_PARTICIPANTES) return falha("Participantes demais no combate.");
    var ja = e.combate.participantes.filter(function (p) { return p.chave === chave; }).length;
    var novos = [];
    for (var i = 0; i < q; i++) {
      var p = participanteDoCatalogo(chave, q > 1 || ja ? ja + i + 1 : 0);
      if (op.lado === "goblins") { p.lado = "goblins"; p.tipo = "aliado"; }
      if (op.oculto) p.oculto = true;
      if (op.turnos) p.turnosRestantes = inteiro(op.turnos, 1);
      if (op.ateFimDaBatalha) p.ateFimDaBatalha = true;
      e.combate.participantes.push(p);
      e.combate.ordem.push(p.id);
      novos.push(p);
    }
    registrar(e, "Entrou no combate: " + q + "× " + d.nome, !!op.oculto);
    return { ok: true, participantes: novos };
  }

  /* Um goblin de jogador entra pela projeção da ficha (resumo). */
  function adicionarPC(e, pc) {
    var x = objeto(pc);
    if (!chaveValida(x.id)) return falha("Personagem inválido.");
    if (e.combate.participantes.some(function (p) { return p.personagemId === x.id; })) return falha("Já está no combate.");
    var r = objeto(x.resumo), at = objeto(r.atributos);
    var p = normalizarParticipante({ tipo: "pc", personagemId: x.id, nome: x.nome, lado: "goblins", combate: at.combate, nocao: at.nocao, habilidade: at.habilidade, vitalidade: at.vitalidade, ferimentos: r.ferimentos });
    e.combate.participantes.push(p);
    e.combate.ordem.push(p.id);
    return { ok: true, participante: p };
  }

  function participante(e, id) { return e.combate.participantes.filter(function (p) { return p.id === id; })[0]; }

  function removerParticipante(e, id) {
    var p = participante(e, id);
    if (!p) return falha("Participante não encontrado.");
    e.combate.participantes = e.combate.participantes.filter(function (x) { return x.id !== id; });
    e.combate.ordem = e.combate.ordem.filter(function (x) { return x !== id; });
    if (e.combate.vez >= e.combate.ordem.length) e.combate.vez = 0;
    return { ok: true };
  }

  /* Ordem manual: subir/descer. */
  function moverNaOrdem(e, id, delta) {
    var o = e.combate.ordem, i = o.indexOf(id), j = i + (delta > 0 ? 1 : -1);
    if (i < 0 || j < 0 || j >= o.length) return falha("Não dá para mover.");
    var atual = o[e.combate.vez];
    o[i] = o[j]; o[j] = id;
    e.combate.vez = Math.max(0, o.indexOf(atual));
    return { ok: true };
  }

  /* Quem surpreende age primeiro (p. 15). A ordem DENTRO de cada lado
     é a que já está (os goblins decidem entre si). */
  function iniciarCombate(e, surpresa) {
    var lado = function (l) { return e.combate.ordem.filter(function (id) { var p = participante(e, id); return p && p.lado === l; }); };
    var g = lado("goblins"), i = lado("inimigos");
    e.combate.surpresa = surpresa === "inimigos" ? "inimigos" : surpresa === "goblins" ? "goblins" : "";
    if (e.combate.surpresa === "inimigos") e.combate.ordem = i.concat(g);
    else if (e.combate.surpresa === "goblins") e.combate.ordem = g.concat(i);
    e.combate.ativo = true;
    e.combate.rodada = 1;
    e.combate.vez = 0;
    registrar(e, "Começou o combate" + (e.combate.surpresa === "goblins" ? " (os goblins pegaram os inimigos distraídos)" : e.combate.surpresa === "inimigos" ? " (os goblins esbarraram nos inimigos)" : ""));
    return { ok: true, eventos: [{ tipo: "momento", momento: "iniciarBatalha" }] };
  }

  function vezAtual(e) { return participante(e, e.combate.ordem[e.combate.vez]); }

  /* Fim da vez do participante atual: efeitos por turno dele; o
     esqueleto animado conta os turnos; no fim da rodada, as ações
     demoradas andam. Devolve o que a tela precisa aplicar ou mostrar
     (momentos de ficha, explosões, regeneração). */
  function proximaVez(e, rolador) {
    if (!e.combate.ativo) return falha("Nenhum combate em curso.");
    var eventos = [];
    var p = vezAtual(e);
    if (p) {
      p.efeitos = p.efeitos.filter(function (ef) {
        if (ef.ate === "turnos") { ef.turnos--; if (ef.turnos <= 0) { eventos.push({ tipo: "efeitoExpirou", participante: p.nome, nome: ef.nome }); return false; } }
        return true;
      });
      if (p.turnosRestantes !== null) {
        p.turnosRestantes--;
        if (p.turnosRestantes <= 0) { p.derrotado = true; eventos.push({ tipo: "dispensado", participante: p.nome }); registrar(e, p.nome + " volta a ser só ossos"); }
      }
      if (p.tipo === "pc") eventos.push({ tipo: "momento", momento: "fimDoTurno", personagemId: p.personagemId });
    }
    var vivos = e.combate.ordem.length;
    e.combate.vez++;
    var guarda = 0;
    while (guarda < vivos + 1) {
      guarda++;
      if (e.combate.vez >= e.combate.ordem.length) { e.combate.vez = 0; e.combate.rodada++; eventos = eventos.concat(fimDaRodada(e, rolador)); }
      var q = vezAtual(e);
      if (q && !q.derrotado) break;
      e.combate.vez++;
    }
    var atual = vezAtual(e);
    if (atual) eventos = eventos.concat(inicioDaVez(e, atual, rolador));
    return { ok: true, eventos: eventos };
  }

  /* No turno do participante: Regeneração (Troll 1d6−1, Shogoth 3) e o
     que prende (Giro Mortal: 1 ferimento por turno). */
  function inicioDaVez(e, p, rolador) {
    var ev = [];
    var def = C().INIMIGOS[p.chave];
    var reg = def && lista(def.habilidades).filter(function (h) { return h.regeneracao; })[0];
    if (reg && p.ferimentos > 0 && rolador) {
      var q = D().quantidade(reg.regeneracao, rolador);
      var tira = Math.min(p.ferimentos, q.total);
      p.ferimentos -= tira;
      ev.push({ tipo: "regeneracao", participante: p.nome, dados: q.dados, valor: tira });
      registrar(e, p.nome + " regenerou " + tira + " ferimento(s)");
    }
    p.efeitos.forEach(function (ef) {
      if (ef.porTurno) {
        ev.push({ tipo: "porTurno", participante: p.nome, nome: ef.nome, ferimentos: ef.porTurno, personagemId: p.personagemId || "" });
        if (p.tipo !== "pc") ferir(e, p.id, ef.porTurno, {});
      }
    });
    return ev;
  }

  function fimDaRodada(e) {
    var ev = [];
    e.combate.acoes = e.combate.acoes.filter(function (a) {
      a.turnos--;
      if (a.turnos > 0) return true;
      ev.push({ tipo: "acaoDemorada", nome: a.nome, ferimentos: a.ferimentos, inimigo: a.inimigo, acao: a.tipo });
      if (a.tipo === "uivo" && a.inimigo) adicionarInimigos(e, a.inimigo, 1);
      registrar(e, a.nome + ": aconteceu");
      return false;
    });
    return ev;
  }

  function encerrarCombate(e) {
    e.combate.ativo = false;
    e.combate.rodada = 0;
    e.combate.vez = 0;
    e.combate.acoes = [];
    e.combate.efeitosDaMesa = e.combate.efeitosDaMesa.filter(function (x) { return x.ate !== "fimDaBatalha"; });
    e.combate.participantes.forEach(function (p) {
      p.efeitos = p.efeitos.filter(function (x) { return x.ate === "manual"; });
      if (p.ateFimDaBatalha) p.derrotado = true;
    });
    registrar(e, "Fim do combate");
    return { ok: true, eventos: [{ tipo: "momento", momento: "fimDaBatalha" }] };
  }

  function limparDerrotados(e) {
    var fora = e.combate.participantes.filter(function (p) { return p.derrotado && p.tipo !== "pc"; }).map(function (p) { return p.id; });
    fora.forEach(function (id) { removerParticipante(e, id); });
    return { ok: true, removidos: fora.length };
  }

  /* Ferir um participante (não-PC: os PCs são feridos na ficha, pelo
     servidor). `bloquear`: a proteção absorve até a durabilidade.
     Vulnerabilidade (Golem de Madeira) dobra fogo; Imunidade (Dragão)
     zera fogo. Mais ferimentos que Vitalidade: derrotado. */
  function ferir(e, id, n, tipo) {
    var t = tipo || {};
    var p = participante(e, id);
    if (!p) return falha("Participante não encontrado.");
    if (p.tipo === "pc") return falha("Goblins de jogador se ferem pela ficha.");
    var def = C().INIMIGOS[p.chave] || {};
    var valor = inteiro(n, 0);
    var notas = [];
    if (t.fogo && def.imuneFogo) { valor = 0; notas.push("imune a fogo"); }
    if (t.fogo && def.vulneravelFogo && valor) { valor *= 2; notas.push("vulnerável a fogo: dobro"); }
    if (t.bloquear && p.protecao && p.protecao.atual > 0 && valor > 0 && !t.ignoraProtecao) {
      var abs = Math.min(valor, p.protecao.atual);
      p.protecao.atual -= abs; valor -= abs;
      notas.push("proteção absorveu " + abs);
    }
    var autom = inteiro(t.automatico, 0);
    if (autom) { valor += autom; notas.push("+" + autom + " automático"); }
    p.ferimentos += valor;
    var ev = [{ tipo: "ferimentos", participante: p.nome, valor: valor, notas: notas }];
    if (p.vitalidade !== null && !p.indescritivel && p.ferimentos > p.vitalidade && !p.derrotado) {
      p.derrotado = true;
      ev.push({ tipo: "derrotado", participante: p.nome, id: p.id });
      registrar(e, p.nome + " foi derrotado");
    }
    registrar(e, p.nome + ": +" + valor + " ferimento(s)" + (notas.length ? " (" + notas.join(", ") + ")" : ""), p.oculto);
    return { ok: true, eventos: ev, valor: valor };
  }

  function curarParticipante(e, id, quanto) {
    var p = participante(e, id);
    if (!p) return falha("Participante não encontrado.");
    var antes = p.ferimentos;
    p.ferimentos = quanto === "todos" ? 0 : Math.max(0, p.ferimentos - inteiro(quanto, 0));
    if (p.derrotado && p.vitalidade !== null && p.ferimentos <= p.vitalidade && p.turnosRestantes === null) p.derrotado = false;
    registrar(e, p.nome + ": −" + (antes - p.ferimentos) + " ferimento(s)");
    return { ok: true };
  }

  function efeitoEmParticipante(e, id, def) {
    var p = participante(e, id);
    if (!p) return falha("Participante não encontrado.");
    var ef = normalizarEfeito(def);
    p.efeitos = p.efeitos.filter(function (x) { return x.chave !== ef.chave; });
    p.efeitos.push(ef);
    registrar(e, p.nome + ": " + ef.nome);
    return { ok: true, efeito: ef };
  }

  function removerEfeitoDeParticipante(e, id, efId) {
    var p = participante(e, id);
    if (!p) return falha("Participante não encontrado.");
    p.efeitos = p.efeitos.filter(function (x) { return x.id !== efId; });
    return { ok: true };
  }

  /* A parada de ataque de um inimigo: Combate + dados da arma (o número
     entre parênteses) + efeitos (Combate Sincronizado: −1). */
  function paradaDeInimigo(e, id, pedido) {
    var p = participante(e, id);
    var q = pedido || {};
    if (!p) return { ok: false, motivo: "Participante não encontrado." };
    if (p.indescritivel || p.combate === null) return { ok: false, motivo: "Sem número de Combate: “alguma coisa acontece…” — a mesa narra." };
    if (p.efeitos.some(function (x) { return x.semAgir; })) return { ok: false, motivo: p.nome + " não pode agir." };
    if (p.efeitos.some(function (x) { return x.semAtaque; }) && q.tipo !== "esquiva") return { ok: false, motivo: p.nome + " não pode atacar agora." };
    var parcelas = [];
    if (q.tipo !== "esquiva" && p.bonusCombate) parcelas.push({ fonte: "Arma", valor: p.bonusCombate });
    if (q.tipo !== "esquiva") p.efeitos.forEach(function (x) { if (x.ataque) parcelas.push({ fonte: x.nome, valor: x.ataque }); });
    parcelas = parcelas.concat(lista(q.extras));
    var at = q.atributo && ["habilidade", "nocao"].indexOf(q.atributo) >= 0 ? q.atributo : "combate";
    if (p[at] === null) return { ok: false, motivo: p.nome + " não tem " + (at === "nocao" ? "Noção" : "Habilidade") + "." };
    var m = D().montarParada({ fonte: at === "combate" ? "Combate" : at === "nocao" ? "Noção" : "Habilidade", valor: p[at] }, parcelas, q.dificuldade);
    return { ok: true, parada: m.parada, composicao: m.composicao, participante: p };
  }

  /* O inimigo ataca (ou testa): rola na mesa, sem explosão de goblin
     (os dados todos em 1 só viram nota). Consome "próximo ataque". */
  function rolarPorParticipante(e, id, pedido, rolador) {
    var q = pedido || {};
    var m = paradaDeInimigo(e, id, q);
    if (!m.ok) return falha(m.motivo);
    var p = m.participante;
    var r = D().rolar({ parada: m.parada, composicao: m.composicao, tipo: q.tipo === "esquiva" ? "esquiva" : q.atributo ? "teste" : "ataque", rotulo: p.nome + (q.rotulo ? " · " + q.rotulo : q.tipo === "esquiva" ? " · esquiva" : " · ataque"), podeExplodirGoblin: p.tipo === "pc", seZero: q.seZero || "falha" }, rolador);
    if (q.tipo !== "esquiva" && !q.atributo) p.efeitos = p.efeitos.filter(function (x) { return x.ate !== "proximoAtaque"; });
    if (q.tipo === "esquiva") efeitoEmParticipante(e, p.id, { chave: "esquivou", nome: "Esquivou: não ataca no próximo turno", ate: "turnos", turnos: 1, semAtaque: true });
    registrar(e, r.rotulo + ": " + r.classificacao.hits + " hit(s)", p.oculto);
    return { ok: true, rolagem: r };
  }

  /* Combate Sincronizado (p. 17): 3+ goblins no mesmo alvo neste turno
     → o alvo rola 1 dado a menos no próximo ataque. */
  function combateSincronizado(e, alvoId) {
    return efeitoEmParticipante(e, alvoId, { chave: "sincronizado", nome: "Confuso (Combate Sincronizado): −1 dado no próximo ataque", ate: "proximoAtaque", ataque: -1 });
  }

  function acaoDemorada(e, def) {
    var a = { id: novoId("ac"), nome: texto(def.nome, 120) || "Ação", turnos: Math.max(1, inteiro(def.turnos, 1, 1)), tipo: texto(def.tipo, 30), ferimentos: inteiro(def.ferimentos, 0), inimigo: chaveValida(def.inimigo) ? def.inimigo : "", fonte: texto(def.fonte, 120) };
    e.combate.acoes.push(a);
    registrar(e, a.nome + " (em " + a.turnos + " rodada(s))");
    return { ok: true, acao: a };
  }

  function efeitoDaMesa(e, def) {
    var ef = normalizarEfeito(def);
    e.combate.efeitosDaMesa.push(ef);
    registrar(e, ef.nome);
    return { ok: true, efeito: ef };
  }

  /* Um participante ao acaso (Tempestade, Troca 0): só entre os que
     ainda estão de pé. */
  function participanteAleatorio(e, rolador, filtro) {
    var vivos = e.combate.participantes.filter(function (p) { return !p.derrotado && (!filtro || filtro(p)); });
    if (!vivos.length) return null;
    var i = Math.floor(Number(rolador(vivos.length))) - 1;
    return vivos[Math.max(0, Math.min(vivos.length - 1, i))];
  }

  /* ---------------------------------------------------------------
     NEGOCIAÇÃO (p. 18)
     --------------------------------------------------------------- */

  /* pedido: { negociador: { nome, nocao, personagemId }, maisForte:
     Combate do goblin mais forte, vitima: { nome, combate, nocao } } */
  function negociar(e, pedido, opId, rolador) {
    var p = pedido || {};
    var id = chaveValida(opId) ? opId : novoId("ng");
    var ja = e.negociacoes.filter(function (n) { return n.id === id; })[0];
    if (ja) return { ok: true, repetida: true, negociacao: ja };
    var neg = objeto(p.negociador), vit = objeto(p.vitima);
    var reg = { id: id, dia: e.dia, negociador: texto(neg.nome, 80), personagemId: chaveValida(neg.personagemId) ? neg.personagemId : "", vitima: texto(vit.nome, 80) };
    if (numeroOuNulo(vit.combate) !== null && inteiro(vit.combate) > inteiro(p.maisForte)) {
      reg.resultado = "ataca";
      reg.texto = reg.vitima + " tem mais Combate que o goblin mais forte: não negocia e ataca primeiro.";
    } else {
      var rg = D().rolar({ parada: inteiro(neg.nocao, 0), tipo: "oposto", rotulo: "Negociação · " + reg.negociador, podeExplodirGoblin: true, seZero: "falha" }, rolador);
      var rv = D().rolar({ parada: inteiro(vit.nocao, 0), tipo: "oposto", rotulo: "Negociação · " + reg.vitima, podeExplodirGoblin: false, seZero: "falha" }, rolador);
      var d = D().disputa(rg.classificacao.hits, rv.classificacao.hits);
      reg.rolagens = { goblin: D().paraHistorico(rg), vitima: D().paraHistorico(rv) };
      reg.hits = { goblin: d.a, vitima: d.b };
      reg.goblinExplode = rg.classificacao.goblinExplode;
      reg.resultado = d.vence === "a" ? "vitimaEntrega" : d.vence === "b" ? "goblinsEntregam" : "continua";
      reg.texto = d.vence === "a" ? reg.vitima + " entrega tudo." : d.vence === "b" ? "Os goblins ficam confusos e entregam tudo a " + reg.vitima + "." : "Empate: a negociação continua.";
      if (reg.goblinExplode) reg.texto += " Todos os dados do negociador caíram em 1: ele explode!";
    }
    e.negociacoes.push(reg);
    if (e.negociacoes.length > 40) e.negociacoes = e.negociacoes.slice(-40);
    registrar(e, "Negociação com " + reg.vitima + ": " + reg.texto);
    return { ok: true, negociacao: reg };
  }

  /* ---------------------------------------------------------------
     BANDO RIVAL (p. 23)
     --------------------------------------------------------------- */

  /* pcs: [{ id, nome, resumo }] — cada goblin do grupo ganha um gêmeo
     rival com os mesmos números e uma característica rival (2d6). */
  function gerarBandoRival(e, pcs, opId, rolador) {
    var id = chaveValida(opId) ? opId : novoId("br");
    var ja = e.rivais.filter(function (r) { return r.id === id; })[0];
    if (ja) return { ok: true, repetida: true, bando: ja };
    var membros = lista(pcs).slice(0, 12).map(function (pc) {
      var s = D().sortear({ dados: "2d6", entradas: C().CARACTERISTICA_RIVAL_2D6 }, rolador);
      var r = objeto(pc.resumo), at = objeto(r.atributos);
      return { nome: texto(pc.nome, 80) + " (rival)", base: texto(pc.nome, 80), ocupacao: texto(r.ocupacaoNome, 60), atributos: { combate: numeroOuNulo(at.combate), habilidade: numeroOuNulo(at.habilidade), nocao: numeroOuNulo(at.nocao), vitalidade: numeroOuNulo(at.vitalidade) }, bonusCombate: inteiro(r.melhorArma, 0), caracteristica: { dados: s.dados, texto: s.resultado } };
    });
    var bando = { id: id, dia: e.dia, membros: membros };
    e.rivais.push(bando);
    if (e.rivais.length > 20) e.rivais = e.rivais.slice(-20);
    registrar(e, "Bando Rival gerado (" + membros.length + " goblin(s))");
    return { ok: true, bando: bando };
  }

  function rivaisNoCombate(e, bandoId) {
    var b = e.rivais.filter(function (r) { return r.id === bandoId; })[0];
    if (!b) return falha("Bando não encontrado.");
    b.membros.forEach(function (m) {
      var p = normalizarParticipante({ tipo: "inimigo", nome: m.nome, lado: "inimigos", combate: m.atributos.combate, bonusCombate: m.bonusCombate, nocao: m.atributos.nocao, habilidade: m.atributos.habilidade, vitalidade: m.atributos.vitalidade, nota: m.caracteristica.texto });
      e.combate.participantes.push(p);
      e.combate.ordem.push(p.id);
    });
    registrar(e, "O Bando Rival entrou no combate");
    return { ok: true };
  }

  /* ---------------------------------------------------------------
     MASMORRA (p. 28–29)
     --------------------------------------------------------------- */

  /* "1d6 Goblins" → rola; o texto fica com o número. */
  function resolverTexto(t, rolador) {
    var m = /(\d*d\d+(?:\s*[−-]\s*\d+)?)/.exec(t);
    if (!m) return { texto: t, dados: [] };
    var q = D().quantidade(m[1].replace(/−/g, "-").replace(/\s/g, ""), rolador);
    return { texto: t.replace(m[1], String(q.total)) + " (" + m[1] + ": " + q.dados.join("+") + ")", dados: q.dados, quantidade: q.total };
  }

  /* A partir da entrada: cada segmento rola 1d6 + quantos segmentos há
     entre ele e a entrada; cada porta abre um caminho. Depois, o
     conteúdo de cada corredor e de cada sala (pela tabela do tipo). */
  function gerarMasmorra(e, opId, rolador, opcoes) {
    var op = opcoes || {};
    var id = chaveValida(opId) ? opId : novoId("ms");
    var ja = e.masmorras.filter(function (m) { return m.id === id; })[0];
    if (ja) return { ok: true, repetida: true, masmorra: ja };
    var tipo, dadosTipo = [];
    if (op.tipo && C().MASMORRAS[op.tipo]) tipo = op.tipo;
    else { var st = D().sortear({ dados: "1d6", entradas: C().MASMORRA_TIPO_D6 }, rolador); tipo = st.resultado; dadosTipo = st.dados; }
    var segmentos = [];
    var fila = [{ pai: null, profundidade: 0 }];
    while (fila.length && segmentos.length < MAX_SEGMENTOS) {
      var x = fila.shift();
      var f = D().quantidade("1d6", rolador).total;
      var indice = Math.min(12, f + x.profundidade);
      var seg = C().SEGMENTOS[indice];
      var s = { id: "s" + (segmentos.length + 1), pai: x.pai, profundidade: x.profundidade, dado: f, indice: indice, tipo: seg.tipo, nome: seg.nome, medida: seg.medida, portas: seg.portas };
      segmentos.push(s);
      for (var k = 0; k < seg.portas; k++) fila.push({ pai: s.id, profundidade: x.profundidade + 1 });
    }
    var cortada = fila.length > 0;
    segmentos.forEach(function (s) {
      var c = D().quantidade("1d6", rolador).total;
      var t = s.tipo === "corredor" ? C().CORREDOR_D6[c - 1] : C().MASMORRAS[tipo].salas[c - 1];
      var r = resolverTexto(t, rolador);
      s.conteudo = { dado: c, texto: r.texto, base: t };
    });
    var m = { id: id, tipo: tipo, dadosTipo: dadosTipo, segmentos: segmentos, oculto: op.oculto !== false, nome: texto(op.nome, 80) || C().MASMORRAS[tipo].nome, cortada: cortada };
    e.masmorras.push(m);
    if (e.masmorras.length > MAX_MASMORRAS) e.masmorras = e.masmorras.slice(-MAX_MASMORRAS);
    registrar(e, "Masmorra gerada: " + m.nome + " (" + segmentos.length + " segmentos)", m.oculto);
    return { ok: true, masmorra: m };
  }

  function revelarMasmorra(e, id, revelar) {
    var m = e.masmorras.filter(function (x) { return x.id === id; })[0];
    if (!m) return falha("Masmorra não encontrada.");
    m.oculto = !revelar;
    return { ok: true };
  }

  function novoDia(e) {
    e.dia++;
    registrar(e, "Dia " + e.dia);
    return { ok: true, eventos: [{ tipo: "momento", momento: "novoDia" }] };
  }

  global.RAMAGoblinsMesa = {
    VERSAO: VERSAO,
    vazio: vazio, normalizar: normalizar, normalizarParticipante: normalizarParticipante, vistaDosJogadores: vistaDosJogadores, registrar: registrar,
    tabelas: tabelas, textoDeEntrada: textoDeEntrada, resolverGrupo: resolverGrupo, gerarLocal: gerarLocal, sortear: sortear,
    participanteDoCatalogo: participanteDoCatalogo, adicionarInimigos: adicionarInimigos, adicionarPC: adicionarPC, participante: participante, removerParticipante: removerParticipante,
    moverNaOrdem: moverNaOrdem, iniciarCombate: iniciarCombate, vezAtual: vezAtual, proximaVez: proximaVez, encerrarCombate: encerrarCombate, limparDerrotados: limparDerrotados,
    ferir: ferir, curarParticipante: curarParticipante, efeitoEmParticipante: efeitoEmParticipante, removerEfeitoDeParticipante: removerEfeitoDeParticipante,
    paradaDeInimigo: paradaDeInimigo, rolarPorParticipante: rolarPorParticipante, combateSincronizado: combateSincronizado,
    acaoDemorada: acaoDemorada, efeitoDaMesa: efeitoDaMesa, participanteAleatorio: participanteAleatorio,
    negociar: negociar, gerarBandoRival: gerarBandoRival, rivaisNoCombate: rivaisNoCombate,
    gerarMasmorra: gerarMasmorra, revelarMasmorra: revelarMasmorra, novoDia: novoDia,
  };
})(typeof window !== "undefined" ? window : globalThis);
