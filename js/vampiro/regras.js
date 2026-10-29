/* =====================================================================
   R.A.M.A. — Vampiro: A Máscara (V5) · motor da ficha
   =====================================================================
   Funções PURAS sobre o bloco `vampiro` da ficha (schema 25). Nada aqui
   lê a tela, sorteia sozinho ou olha o relógio do computador: quem rola
   passa um `rolador(faces)`; quem avança o tempo chama os MOMENTOS
   (inicioDaSessao, fimDaSessao, novaNoite, fimDaCena, fimDoTurno).

   AS CAMADAS — de onde vem cada ponto
     base        o que a pessoa distribuiu na criação (atributos,
                 habilidades, Disciplinas, especializações, vantagens)
     concessões  CALCULADAS a partir das escolhas da criação (clã, idade,
                 Predador): trocar o Predador troca só o que ele dá, sem
                 duplicar nem apagar compras independentes
     compras     experiência gasta, uma entrada por compra, com o custo
     ajustes     o que o Narrador autorizou e o que a história fez
                 (Remorso, Diablerie, Torpor…), cada um com a origem
   O valor efetivo é a soma; calcular() devolve a composição de cada um.
   Recalcular nunca cura dano nem devolve recurso: dano, Fome, Máculas e
   estados são SALDOS guardados.

   CADA ALTERAÇÃO DEVOLVE EVENTOS { ok, eventos[] }. Operações vindas de
   fora (mesa, servidor, clique repetido) passam por aplicarOperacao.

   Páginas: impressas (PDF = +2 até a 305). Interpretações: docs/VAMPIRO.md.
   ===================================================================== */

(function (global) {
  "use strict";

  var C = global.RAMAVampiroCatalogo;
  var D = global.RAMAVampiroDados;
  function DS() { return global.RAMAVampiroDisciplinas; }

  var VERSAO_BLOCO = 1;
  var LIMITE_OPERACOES = 300;
  var NATUREZAS = ["vampiro", "carnical", "mortal"];

  /* ---------------------------------------------------------------
     UTILIDADES
     --------------------------------------------------------------- */

  function inteiro(v, min, max, padrao) {
    var n = Math.floor(Number(v));
    if (!isFinite(n)) n = padrao === undefined ? 0 : padrao;
    if (min !== undefined && n < min) n = min;
    if (max !== undefined && n > max) n = max;
    return n;
  }
  function texto(v, max) { return String(v === undefined || v === null ? "" : v).slice(0, max || 300); }
  function copiar(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
  var contadorDeId = 0;
  function novoId(prefixo) {
    var U = global.RAMAUtil;
    if (U && U.uuid) return (prefixo || "v") + "-" + U.uuid();
    contadorDeId++;
    return (prefixo || "v") + "-" + Date.now().toString(36) + "-" + contadorDeId;
  }
  function evento(tipo, dados) { return Object.assign({}, dados || {}, { tipo: tipo }); }
  function falha(motivo, extra) { return Object.assign({ ok: false, motivo: motivo, eventos: [] }, extra || {}); }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function objeto(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function chaveValida(v) { return typeof v === "string" && /^[A-Za-z0-9_-]{1,60}$/.test(v); }

  /* ---------------------------------------------------------------
     O BLOCO: vazio e normalizado
     --------------------------------------------------------------- */

  function atributosIniciais(valor) {
    var a = {};
    C.ATRIBUTOS.forEach(function (x) { a[x.chave] = valor; });
    return a;
  }

  function fichaVazia(natureza) {
    return {
      v: VERSAO_BLOCO,
      natureza: NATUREZAS.indexOf(natureza) >= 0 ? natureza : "vampiro",
      conceito: "", cla: "", senhor: "", geracao: 13, idade: "neofito",
      abraco: { data: "", local: "", circunstancias: "" },
      idadeVerdadeira: "", idadeAparente: "", epoca: "",
      ambicao: "", desejo: "", predador: "",
      perdicaoParametro: "",
      atributos: atributosIniciais(1), habilidades: {}, disciplinas: {},
      especializacoes: [], poderes: [], rituais: [], formulas: [], metodoAlquimia: "",
      vantagens: [], fichas: [], sangueRalo: { qualidades: [], defeitos: [] },
      convicoes: [], pilares: [], principiosAceitos: true,
      humanidadeBase: 7, maculas: 0, potenciaBase: 1, fome: 1, fracaoDeFome: 0,
      vitalidade: { superficial: 0, agravado: 0 }, forcaDeVontade: { superficial: 0, agravado: 0 },
      ressonancia: null,
      estado: { torpor: null, estacado: false, morteFinal: null, frenesi: null, compulsao: null, degeneracao: false, wassail: false, dormindo: false, ambienteFeio: false, ferimentos: [] },
      efeitos: [], lacos: [], formulasProntas: [],
      compras: [], ajustes: [], xp: { recebido: 0, historico: [] },
      criacao: { concluida: false, etapa: 0, distribuicao: "", predador: { especializacao: -1, disciplina: "", escolhas: {} }, excecoes: [], semPredador: false },
      equipamento: [], notas: "",
      tempo: { sessao: 0, noite: 0, cena: 0, turno: 0 },
      marcas: { sessao: {}, noite: {}, cena: {} },
      historicoDeEventos: [],
      operacoes: [],
    };
  }

  function normalizarDano(b) {
    var x = objeto(b);
    return { superficial: inteiro(x.superficial, 0, 30, 0), agravado: inteiro(x.agravado, 0, 30, 0) };
  }

  function normalizar(bruto) {
    var b = objeto(bruto);
    var o = fichaVazia(b.natureza);
    o.v = VERSAO_BLOCO;
    ["conceito", "senhor", "idadeVerdadeira", "idadeAparente", "epoca", "ambicao", "desejo", "perdicaoParametro", "notas", "metodoAlquimia"].forEach(function (k) { o[k] = texto(b[k], k === "notas" ? 20000 : 600); });
    o.cla = C.CLAS[b.cla] ? b.cla : "";
    o.predador = C.PREDADORES[b.predador] ? b.predador : "";
    o.idade = C.IDADES[b.idade] ? b.idade : "neofito";
    o.geracao = inteiro(b.geracao, 4, 16, 13);
    var ab = objeto(b.abraco);
    o.abraco = { data: texto(ab.data, 60), local: texto(ab.local, 200), circunstancias: texto(ab.circunstancias, 2000) };
    var at = objeto(b.atributos);
    C.ATRIBUTOS.forEach(function (x) { o.atributos[x.chave] = inteiro(at[x.chave], 0, 10, 1); });
    var hb = objeto(b.habilidades);
    C.HABILIDADES.forEach(function (x) { var v = inteiro(hb[x.chave], 0, 10, 0); if (v) o.habilidades[x.chave] = v; });
    var di = objeto(b.disciplinas);
    Object.keys(DS().DISCIPLINAS).forEach(function (k) { var v = inteiro(di[k], 0, 10, 0); if (v) o.disciplinas[k] = v; });
    o.especializacoes = lista(b.especializacoes).filter(function (e) { return e && C.habilidade(e.habilidade); }).slice(0, 80).map(function (e) {
      return { id: texto(e.id, 80) || novoId("es"), habilidade: e.habilidade, nome: texto(e.nome, 80), origem: texto(e.origem, 20) || "criacao" };
    });
    o.poderes = lista(b.poderes).filter(function (x) { return x && DS().poder(x.chave); }).slice(0, 80).map(function (x) {
      return { id: texto(x.id, 80) || novoId("po"), chave: x.chave, origem: texto(x.origem, 20) || "criacao" };
    });
    o.rituais = lista(b.rituais).filter(function (x) { return x && DS().ritual(x.chave); }).slice(0, 80).map(function (x) {
      return { id: texto(x.id, 80) || novoId("ri"), chave: x.chave, origem: texto(x.origem, 20) || "criacao" };
    });
    o.formulas = lista(b.formulas).filter(function (x) { return x && DS().poder(x.chave) && DS().poder(x.chave).formula; }).slice(0, 40).map(function (x) {
      return { id: texto(x.id, 80) || novoId("fo"), chave: x.chave, origem: texto(x.origem, 20) || "criacao" };
    });
    o.vantagens = lista(b.vantagens).filter(function (x) { return x && C.VANTAGENS[x.chave]; }).slice(0, 80).map(normalizarVantagem);
    /* Fichas de Conhecimento: cada nível é um item à parte (p. 180). */
    var vistos = {};
    o.fichas = lista(b.fichas).filter(function (x) {
      if (!x || !chaveValida(x.ficha) || !C.FICHAS_DE_CONHECIMENTO[x.ficha]) return false;
      var k = x.ficha + ":" + inteiro(x.nivel, 1, 5, 1);
      if (vistos[k]) return false;
      vistos[k] = true;
      return true;
    }).slice(0, 40).map(function (x) {
      return { id: texto(x.id, 80) || novoId("fc"), ficha: x.ficha, nivel: inteiro(x.nivel, 1, 5, 1), origem: texto(x.origem, 20) || "criacao" };
    });
    var sr = objeto(b.sangueRalo);
    o.sangueRalo = {
      qualidades: lista(sr.qualidades).filter(function (k) { return C.SANGUE_RALO.qualidades[k]; }).slice(0, 8),
      defeitos: lista(sr.defeitos).filter(function (k) { return C.SANGUE_RALO.defeitos[k]; }).slice(0, 8),
    };
    o.convicoes = lista(b.convicoes).slice(0, 6).map(function (x) {
      var c = objeto(x);
      return { id: texto(c.id, 80) || novoId("cv"), texto: texto(c.texto, 300), perdida: !!c.perdida };
    });
    o.pilares = lista(b.pilares).slice(0, 6).map(function (x) {
      var p = objeto(x);
      return { id: texto(p.id, 80) || novoId("pi"), nome: texto(p.nome, 120), convicaoId: texto(p.convicaoId, 80), relacaoId: texto(p.relacaoId, 80),
        estado: ["vivo", "ferido", "destruido"].indexOf(p.estado) >= 0 ? p.estado : "vivo", historico: lista(p.historico).slice(-20) };
    });
    o.humanidadeBase = inteiro(b.humanidadeBase, 0, 10, 7);
    o.maculas = inteiro(b.maculas, 0, 10, 0);
    o.potenciaBase = inteiro(b.potenciaBase, 0, 10, 1);
    o.fome = inteiro(b.fome, 0, 5, 1);
    o.fracaoDeFome = inteiro(b.fracaoDeFome, 0, 1, 0);
    o.vitalidade = normalizarDano(b.vitalidade);
    o.forcaDeVontade = normalizarDano(b.forcaDeVontade);
    var rs = objeto(b.ressonancia);
    o.ressonancia = C.RESSONANCIAS[rs.tipo] ? { tipo: rs.tipo, temperamento: C.TEMPERAMENTOS[rs.temperamento] ? rs.temperamento : "efemero", discrasia: C.DISCRASIAS[rs.discrasia] ? rs.discrasia : "", fonte: texto(rs.fonte, 120), usada: !!rs.usada } : null;
    var es = objeto(b.estado);
    o.estado = {
      torpor: es.torpor && typeof es.torpor === "object" ? { motivo: texto(es.torpor.motivo, 40), noite: inteiro(es.torpor.noite, 0), dias: inteiro(es.torpor.dias, 0), ate: texto(es.torpor.ate, 60) } : null,
      estacado: !!es.estacado,
      morteFinal: es.morteFinal && typeof es.morteFinal === "object" ? { causa: texto(es.morteFinal.causa, 200), quando: texto(es.morteFinal.quando, 60) } : null,
      frenesi: es.frenesi && typeof es.frenesi === "object" && C.FRENESI[es.frenesi.tipo] ? { tipo: es.frenesi.tipo, curtindo: !!es.frenesi.curtindo, cena: inteiro(es.frenesi.cena, 0) } : null,
      compulsao: es.compulsao && typeof es.compulsao === "object" ? normalizarCompulsao(es.compulsao) : null,
      degeneracao: !!es.degeneracao,
      wassail: !!es.wassail,
      dormindo: !!es.dormindo,
      ambienteFeio: !!es.ambienteFeio,
      ferimentos: lista(es.ferimentos).filter(function (f) { return f && C.FERIMENTOS.some(function (x) { return x.chave === f.chave; }); }).slice(0, 10).map(function (f) { return { id: texto(f.id, 80) || novoId("fe"), chave: f.chave, nota: texto(f.nota, 120) }; }),
    };
    o.efeitos = lista(b.efeitos).filter(function (e) { return e && chaveValida(e.chave); }).slice(0, 60).map(normalizarEfeito);
    o.lacos = lista(b.lacos).slice(0, 20).map(function (x) {
      var l = objeto(x);
      return { id: texto(l.id, 80) || novoId("la"), reinante: texto(l.reinante, 120), reinanteId: texto(l.reinanteId, 80), forca: inteiro(l.forca, 0, 6, 0), noites: lista(l.noites).map(String).slice(-6), ultimaNoite: inteiro(l.ultimaNoite, 0) };
    });
    o.formulasProntas = lista(b.formulasProntas).slice(0, 40).filter(function (x) { return x && DS().poder(x.chave); }).map(function (x) {
      return { id: texto(x.id, 80) || novoId("fp"), chave: x.chave, qualidade: texto(x.qualidade, 20), sucessos: inteiro(x.sucessos, 0, 30), metodo: texto(x.metodo, 30), ativa: !!x.ativa, consumida: !!x.consumida };
    });
    o.compras = lista(b.compras).slice(0, 400).map(function (x) {
      var c = objeto(x);
      return { id: texto(c.id, 80) || novoId("cp"), tipo: texto(c.tipo, 30), alvo: texto(c.alvo, 60), de: inteiro(c.de, 0, 20), para: inteiro(c.para, 0, 20), custo: inteiro(c.custo, 0, 9999), nome: texto(c.nome, 120), poderes: lista(c.poderes).map(String).slice(0, 10), noite: inteiro(c.noite, 0), credito: inteiro(c.credito, 0, 99, 0) };
    });
    o.ajustes = lista(b.ajustes).slice(0, 400).map(function (x) {
      var a = objeto(x);
      return { id: texto(a.id, 80) || novoId("aj"), tipo: texto(a.tipo, 30), alvo: texto(a.alvo, 60), valor: inteiro(a.valor, -20, 20, 0), origem: texto(a.origem, 30) || "narrador", motivo: texto(a.motivo, 300), noite: inteiro(a.noite, 0) };
    });
    var xp = objeto(b.xp);
    o.xp = { recebido: inteiro(xp.recebido, 0, 99999, 0), historico: lista(xp.historico).slice(-200).map(function (h) { var x = objeto(h); return { id: texto(x.id, 80), valor: inteiro(x.valor, -9999, 9999), motivo: texto(x.motivo, 200), noite: inteiro(x.noite, 0) }; }), creditos: objeto(xp.creditos) };
    var cr = objeto(b.criacao), pr = objeto(cr.predador);
    o.criacao = {
      concluida: !!cr.concluida, etapa: inteiro(cr.etapa, 0, 20, 0),
      distribuicao: C.DISTRIBUICOES_DE_HABILIDADES[cr.distribuicao] ? cr.distribuicao : "",
      predador: { especializacao: inteiro(pr.especializacao, -1, 10, -1), disciplina: texto(pr.disciplina, 30), poder: texto(pr.poder, 60), escolhas: objeto(pr.escolhas) },
      excecoes: lista(cr.excecoes).slice(0, 30).map(function (e) { return { id: texto(e.id, 80) || novoId("ex"), texto: texto(e.texto, 300), autorizada: !!e.autorizada }; }),
      semPredador: !!cr.semPredador,
    };
    o.equipamento = lista(b.equipamento).slice(0, 80).map(function (x) {
      var e = objeto(x);
      return { id: texto(e.id, 80) || novoId("eq"), nome: texto(e.nome, 120), arma: C.ARMAS[e.arma] ? e.arma : "", armadura: C.ARMADURAS[e.armadura] ? e.armadura : "", dano: e.dano === undefined || e.dano === "" ? null : inteiro(e.dano, 0, 10), notas: texto(e.notas, 600), personalizado: !!e.personalizado };
    });
    var tp = objeto(b.tempo);
    o.tempo = { sessao: inteiro(tp.sessao, 0), noite: inteiro(tp.noite, 0), cena: inteiro(tp.cena, 0), turno: inteiro(tp.turno, 0) };
    var mc = objeto(b.marcas);
    o.marcas = { sessao: objeto(mc.sessao), noite: objeto(mc.noite), cena: objeto(mc.cena) };
    o.historicoDeEventos = lista(b.historicoDeEventos).slice(-200);
    o.operacoes = lista(b.operacoes).map(String).slice(-LIMITE_OPERACOES);
    return o;
  }

  function normalizarVantagem(x) {
    var v = objeto(x), def = C.VANTAGENS[v.chave];
    var pts = inteiro(v.pontos, 0, 10, def.niveis[0]);
    if (def.niveis.indexOf(pts) < 0) pts = def.niveis[0];
    return { id: texto(v.id, 80) || novoId("va"), chave: v.chave, pontos: pts, nota: texto(v.nota, 200), parametro: texto(v.parametro, 120), relacaoId: texto(v.relacaoId, 80), origem: texto(v.origem, 20) || "criacao", compartilhada: !!v.compartilhada };
  }

  function normalizarCompulsao(c) {
    return { chave: texto(c.chave, 30), cla: !!c.cla, penalidade: inteiro(c.penalidade, 0, 5, 2), cena: inteiro(c.cena, 0), repeticoes: inteiro(c.repeticoes, 0, 5, 0), nota: texto(c.nota, 200) };
  }

  function normalizarEfeito(x) {
    var e = objeto(x);
    return {
      id: texto(e.id, 80) || novoId("ef"), chave: e.chave, nome: texto(e.nome, 120),
      origem: { tipo: texto(objeto(e.origem).tipo, 20), chave: texto(objeto(e.origem).chave, 60) },
      duracao: texto(e.duracao, 30) || "cena",
      inicio: { sessao: inteiro(objeto(e.inicio).sessao, 0), noite: inteiro(objeto(e.inicio).noite, 0), cena: inteiro(objeto(e.inicio).cena, 0), turno: inteiro(objeto(e.inicio).turno, 0) },
      dados: objeto(e.dados),
    };
  }

  /* ---------------------------------------------------------------
     CONCESSÕES — o que clã, idade e Predador dão (calculado)
     --------------------------------------------------------------- */

  function ehSangueRalo(o) { return o.cla === "sangueRalo"; }
  function ehVampiro(o) { return o.natureza === "vampiro"; }

  function concessoes(o) {
    var out = [];
    var idade = C.IDADES[o.idade];
    if (ehVampiro(o) && idade && !ehSangueRalo(o)) {
      if (idade.humanidade !== 7) out.push({ origem: "idade", tipo: "humanidade", valor: idade.humanidade - 7 });
    }
    if (o.cla === "caitiff") out.push({ origem: "cla", tipo: "vantagem", chave: "suspeito", pontos: 1, nota: "Caitiff" });
    if (o.cla === "nosferatu") out.push({ origem: "cla", tipo: "vantagem", chave: "repulsivo", pontos: 2, nota: "Perdição Nosferatu" });
    var p = C.PREDADORES[o.predador];
    if (p && ehVampiro(o) && !ehSangueRalo(o)) {
      var esc = o.criacao.predador;
      var e = p.especializacoes[esc.especializacao];
      if (e) {
        out.push({ origem: "predador", tipo: "especializacao", habilidade: e.habilidade, nome: e.nome });
        if (!(o.habilidades[e.habilidade] > 0)) out.push({ origem: "predador", tipo: "habilidade", alvo: e.habilidade, valor: 1 });
      }
      if (esc.disciplina && p.disciplinas.indexOf(esc.disciplina) >= 0 && predadorDisciplinaPermitida(o, p, esc.disciplina)) {
        out.push({ origem: "predador", tipo: "disciplina", alvo: esc.disciplina, valor: 1 });
        if (esc.poder) out.push({ origem: "predador", tipo: "poder", chave: esc.poder });
      }
      if (p.humanidade) out.push({ origem: "predador", tipo: "humanidade", valor: p.humanidade });
      if (p.potencia) out.push({ origem: "predador", tipo: "potencia", valor: p.potencia });
      lista(p.vantagens).forEach(function (v) { out.push({ origem: "predador", tipo: "vantagem", chave: v.chave, pontos: v.pontos, nota: v.nota || "" }); });
      lista(p.defeitos).forEach(function (v) { out.push({ origem: "predador", tipo: "vantagem", chave: v.chave, pontos: v.pontos, nota: v.nota || "" }); });
      lista(p.escolhas).forEach(function (esco, i) {
        var feito = esc.escolhas[String(i)];
        if (esco.tipo === "defeitoUnico") {
          var opc = esco.entre.filter(function (x) { return x.chave === feito; })[0];
          if (opc) out.push({ origem: "predador", tipo: "vantagem", chave: opc.chave, pontos: opc.pontos, nota: opc.nota || "" });
        } else if (feito && typeof feito === "object") {
          /* Repartição de pontos ("3 entre Fama e Rebanho"). Os grupos
             ("Míticos") viram a vantagem escolhida dentro deles. */
          Object.keys(feito).forEach(function (chave) {
            var n = inteiro(feito[chave], 0, esco.pontos, 0);
            if (!n || !C.VANTAGENS[chave]) return;
            out.push({ origem: "predador", tipo: "vantagem", chave: chave, pontos: n, nota: "" });
          });
        }
      });
    }
    return out;
  }

  function predadorDisciplinaPermitida(o, p, disciplina) {
    return !(p.soTremere && p.soTremere.indexOf(disciplina) >= 0 && o.cla !== "tremere");
  }

  /* ---------------------------------------------------------------
     CALCULAR — o valor efetivo, com a composição
     --------------------------------------------------------------- */

  function somarCamadas(o, tipo, alvo, base, conc) {
    var comp = [];
    if (base) comp.push({ fonte: "criação", valor: base });
    conc.forEach(function (c) { if (c.tipo === tipo && (alvo === null || c.alvo === alvo)) comp.push({ fonte: c.origem, valor: c.valor }); });
    o.compras.forEach(function (c) { if (c.tipo === tipo && (alvo === null || c.alvo === alvo)) comp.push({ fonte: "experiência", valor: c.para - c.de, id: c.id }); });
    o.ajustes.forEach(function (a) { if (a.tipo === tipo && (alvo === null || a.alvo === alvo || !a.alvo)) comp.push({ fonte: a.origem, valor: a.valor, id: a.id, motivo: a.motivo }); });
    var total = comp.reduce(function (s, x) { return s + x.valor; }, 0);
    return { valor: total, composicao: comp };
  }

  function efeitosAtivos(o) { return o.efeitos; }
  function temEfeito(o, chave) { return o.efeitos.some(function (e) { return e.chave === chave; }); }

  /* Os poderes que a ficha tem (base + concessões + compras). */
  function poderesDaFicha(o, conc) {
    var c = conc || concessoes(o);
    var out = o.poderes.map(function (x) { return { id: x.id, chave: x.chave, origem: x.origem }; });
    c.filter(function (x) { return x.tipo === "poder"; }).forEach(function (x) {
      if (!out.some(function (y) { return y.chave === x.chave; })) out.push({ id: "pred-" + x.chave, chave: x.chave, origem: "predador" });
    });
    return out;
  }
  function temPoder(o, chave) { return poderesDaFicha(o).some(function (p) { return p.chave === chave; }); }

  function vantagensDaFicha(o, conc) {
    var c = conc || concessoes(o);
    var out = o.vantagens.map(function (v) { return Object.assign({}, v); });
    c.filter(function (x) { return x.tipo === "vantagem"; }).forEach(function (x, i) {
      out.push({ id: "conc-" + x.origem + "-" + x.chave + "-" + i, chave: x.chave, pontos: x.pontos, nota: x.nota || "", origem: x.origem });
    });
    return out;
  }
  function temVantagem(o, chave) { return vantagensDaFicha(o).some(function (v) { return v.chave === chave; }); }
  function pontosDeVantagem(o, chave) { return vantagensDaFicha(o).filter(function (v) { return v.chave === chave; }).reduce(function (s, v) { return s + v.pontos; }, 0); }
  function temQualidadeRalo(o, k) { return ehSangueRalo(o) && o.sangueRalo.qualidades.indexOf(k) >= 0; }
  function temDefeitoRalo(o, k) { return ehSangueRalo(o) && o.sangueRalo.defeitos.indexOf(k) >= 0; }

  function especializacoesDaFicha(o, conc) {
    var c = conc || concessoes(o);
    var out = o.especializacoes.map(function (e) { return Object.assign({}, e); });
    c.filter(function (x) { return x.tipo === "especializacao"; }).forEach(function (x, i) {
      out.push({ id: "pred-esp-" + i, habilidade: x.habilidade, nome: x.nome, origem: "predador" });
    });
    return out;
  }

  function valorDeAtributo(o, k) { return calcularAtributo(o, k).valor; }
  function calcularAtributo(o, k) {
    var r = somarCamadas(o, "atributo", k, o.atributos[k] || 0, []);
    /* Aspectos animais (Perdição Gangrel), Poder Vindo da Dor: efeitos. */
    o.efeitos.forEach(function (e) {
      var d = objeto(e.dados.atributos);
      if (d[k]) r.composicao.push({ fonte: e.nome || e.chave, valor: d[k], efeito: e.id });
    });
    r.valor = Math.max(0, r.composicao.reduce(function (s, x) { return s + x.valor; }, 0));
    return r;
  }
  function valorDeHabilidade(o, k, conc) { return Math.max(0, somarCamadas(o, "habilidade", k, o.habilidades[k] || 0, conc || concessoes(o)).valor); }
  function valorDeDisciplina(o, k, conc) {
    var base = somarCamadas(o, "disciplina", k, o.disciplinas[k] || 0, conc || concessoes(o)).valor;
    /* Pontos temporários (sangue-ralo pela Ressonância; Direto da Fonte). */
    var temp = 0;
    o.efeitos.forEach(function (e) { var d = objeto(e.dados.disciplinas); if (d[k]) temp = Math.max(temp, d[k]); });
    return Math.max(0, Math.max(base, temp));
  }

  function humanidade(o, conc) { return inteiro(somarCamadas(o, "humanidade", null, o.humanidadeBase, conc || concessoes(o)).valor, 0, 10); }

  function potencia(o, conc) {
    if (ehSangueRalo(o) || !ehVampiro(o)) return 0;
    /* Durante a criação, a base vem da idade (p. 151); depois de
       concluída, é o valor da ficha. */
    var idade = C.IDADES[o.idade];
    var base = o.criacao.concluida || !idade ? o.potenciaBase : idade.potencia;
    var bruto = somarCamadas(o, "potencia", null, base, conc || concessoes(o)).valor;
    var lim = limitesDePotencia(o);
    var v = inteiro(bruto, lim[0], lim[1]);
    /* Sangue Potente (Feitiçaria): passa do limite da geração (p. 273). */
    o.efeitos.forEach(function (e) { if (e.dados.potencia) v += inteiro(e.dados.potencia, 0, 3); });
    return Math.min(10, v);
  }
  function limitesDePotencia(o) {
    if (ehSangueRalo(o)) return [0, 0];
    var g = C.GERACOES[o.geracao] || [0, 10];
    return [g[0], g[1]];
  }
  function gravidadeDaPerdicao(o) {
    if (temDefeitoRalo(o, "maldicaoDeCla")) return 1;
    return C.potencia(potencia(o)).perdicao;
  }

  function vitalidadeMaxima(o, conc) {
    var vig = valorDeAtributo(o, "vigor");
    var max = vig + 3;
    var c = conc || concessoes(o);
    if (temPoder(o, "resiliencia") && !estaEmFormaSemCorpo(o)) max += valorDeDisciplina(o, "fortitude", c);
    o.efeitos.forEach(function (e) { if (e.dados.vitalidade) max += inteiro(e.dados.vitalidade, -10, 10); });
    /* Bebedor Diurno ao sol: metade (arred. para cima) — efeito "sol". */
    if (o.efeitos.some(function (e) { return e.chave === "bebedorDiurnoAoSol"; })) max = Math.ceil(max / 2);
    return Math.max(1, max);
  }
  function estaEmFormaSemCorpo(o) { return o.efeitos.some(function (e) { return e.dados.forma === "nevoa"; }); }
  function fdvMaxima(o) { return Math.max(1, valorDeAtributo(o, "autocontrole") + valorDeAtributo(o, "determinacao")); }

  function trilha(max, t) {
    var sup = Math.min(t.superficial, max), agr = Math.min(t.agravado, max);
    var usado = Math.min(max, sup + agr);
    return { max: max, superficial: sup, agravado: agr, livre: max - usado, atual: max - usado, debilitado: usado >= max, toda: agr >= max };
  }

  /* O estado da Persona: ativa | debilitada | incapacitada | torpor |
     estacada | morte (nenhum apaga a ficha). */
  function estadoDe(o, vit) {
    if (o.estado.morteFinal) return "morteFinal";
    if (o.estado.torpor) return "torpor";
    if (o.estado.estacado) return "estacado";
    var v = vit || trilha(vitalidadeMaxima(o), o.vitalidade);
    if (!ehVampiro(o)) {
      if (v.toda) return "morte";
      if (v.debilitado) return "incapacitado";
    }
    if (o.estado.wassail) return "besta";
    return "ativo";
  }

  function xpGasto(o) { return o.compras.reduce(function (s, c) { return s + c.custo; }, 0); }
  function xpTotal(o) {
    var idade = C.IDADES[o.idade];
    var inicial = ehVampiro(o) && idade && !ehSangueRalo(o) ? idade.xp : 0;
    return inicial + o.xp.recebido;
  }

  function calcular(o) {
    var conc = concessoes(o);
    var atributos = {}, habilidades = {}, disciplinas = {};
    C.ATRIBUTOS.forEach(function (a) { atributos[a.chave] = calcularAtributo(o, a.chave); });
    C.HABILIDADES.forEach(function (h) { var r = somarCamadas(o, "habilidade", h.chave, o.habilidades[h.chave] || 0, conc); if (r.valor) habilidades[h.chave] = r; });
    Object.keys(DS().DISCIPLINAS).forEach(function (k) { var v = valorDeDisciplina(o, k, conc); if (v) disciplinas[k] = { valor: v, composicao: somarCamadas(o, "disciplina", k, o.disciplinas[k] || 0, conc).composicao }; });
    var pot = potencia(o, conc);
    var vit = trilha(vitalidadeMaxima(o, conc), o.vitalidade);
    var fdv = trilha(fdvMaxima(o), o.forcaDeVontade);
    var hum = humanidade(o, conc);
    var xpT = xpTotal(o), xpG = xpGasto(o);
    return {
      atributos: atributos, habilidades: habilidades, disciplinas: disciplinas,
      especializacoes: especializacoesDaFicha(o, conc), vantagens: vantagensDaFicha(o, conc), poderes: poderesDaFicha(o, conc),
      concessoes: conc,
      humanidade: hum, humanidadeComposicao: somarCamadas(o, "humanidade", null, o.humanidadeBase, conc).composicao, maculas: o.maculas, espacosVazios: Math.max(0, 10 - hum - o.maculas),
      humanidadeTabela: C.HUMANIDADE[hum],
      potencia: pot, limitesDePotencia: limitesDePotencia(o), tabelaPotencia: C.potencia(pot),
      gravidadePerdicao: gravidadeDaPerdicao(o), fome: o.fome,
      vitalidade: vit, forcaDeVontade: fdv,
      estado: estadoDe(o, vit),
      xp: { total: xpT, gasto: xpG, disponivel: xpT - xpG },
      cla: C.CLAS[o.cla] || null, predador: C.PREDADORES[o.predador] || null,
    };
  }

  /* ---------------------------------------------------------------
     TRILHAS: dano, conversão, Debilitação, cura (p. 126–127)
     --------------------------------------------------------------- */

  /* Marca dano numa trilha. `superficial` já vem dividido (ou não, se a
     regra manda). Cada ponto além dos espaços livres converte um
     Superficial em Agravado; sem Superficial a converter, transborda. */
  function marcarNaTrilha(t, max, sup, agr) {
    var transbordou = 0, convertidos = 0;
    for (var a = 0; a < agr; a++) {
      if (t.superficial + t.agravado < max) t.agravado++;
      else if (t.superficial > 0) { t.superficial--; t.agravado++; convertidos++; }
      else transbordou++;
    }
    for (var s = 0; s < sup; s++) {
      if (t.superficial + t.agravado < max) t.superficial++;
      else if (t.superficial > 0) { t.superficial--; t.agravado++; convertidos++; }
      else transbordou++;
    }
    return { transbordou: transbordou, convertidos: convertidos };
  }

  /* Aplica dano. `o.trilha`: "vitalidade" | "forcaDeVontade".
     `tipo`: "superficial" | "agravado". `naoDividir`: gasto voluntário,
     rolagem única, Armas Ferais etc. `fonte`: "fisico" | "fogo" | "sol" |
     "social" | "gasto" — para Pele de Mármore, Tenacidade e Desafio. */
  function sofrerDano(o, pedido) {
    var p = pedido || {};
    var qual = p.trilha === "forcaDeVontade" ? "forcaDeVontade" : "vitalidade";
    var tipo = p.tipo === "agravado" ? "agravado" : "superficial";
    var valor = inteiro(p.valor, 0, 50, 0);
    var eventos = [];
    if (!valor) return { ok: true, eventos: [], aplicado: { superficial: 0, agravado: 0 } };
    if (o.estado.morteFinal) return falha("A personagem já sofreu a Morte Final.");
    var fisico = qual === "vitalidade" && p.fonte !== "gasto";
    /* Pele de Mármore: ignora a primeira fonte de dano físico do turno. */
    if (fisico && p.fonte !== "sol" && temEfeito(o, "peleDeMarmore") && !p.critico) {
      var marca = "marmore-" + o.tempo.turno;
      if (!o.marcas.cena[marca]) {
        o.marcas.cena[marca] = true;
        eventos.push(evento("danoIgnorado", { motivo: "Pele de Mármore", valor: valor }));
        return { ok: true, eventos: eventos, aplicado: { superficial: 0, agravado: 0 } };
      }
    }
    /* Sangue-ralo e mortais: armas cortantes/perfurantes e fogo causam
       Agravado (p. 111, 126) — quem chama diz o tipo pela arma; aqui
       só a Resiliência Vampírica reverte para o tratamento vampírico. */
    var sup = tipo === "superficial" ? valor : 0;
    var agr = tipo === "agravado" ? valor : 0;
    /* Desafio à Perdição: converte Agravado em Superficial (limite por cena). */
    if (fisico && agr && temEfeito(o, "desafioAPerdicao")) {
      var ef = o.efeitos.filter(function (e) { return e.chave === "desafioAPerdicao"; })[0];
      var resta = inteiro(ef.dados.restante, 0, 10, 0);
      var conv = Math.min(resta, agr);
      if (conv) { agr -= conv; sup += conv; ef.dados.restante = resta - conv; eventos.push(evento("danoConvertido", { motivo: "Desafio à Perdição", valor: conv })); }
    }
    /* Tenacidade: subtrai Fortitude do Superficial ANTES de dividir (mínimo 1). */
    if (fisico && sup && temEfeito(o, "tenacidade")) {
      var red = valorDeDisciplina(o, "fortitude");
      var antes = sup;
      sup = Math.max(1, sup - red);
      if (sup !== antes) eventos.push(evento("danoReduzido", { motivo: "Tenacidade", de: antes, para: sup }));
    }
    if (sup && !p.naoDividir && p.fonte !== "gasto") {
      var dividido = Math.ceil(sup / 2);
      if (dividido !== sup) eventos.push(evento("danoDividido", { de: sup, para: dividido }));
      sup = dividido;
    }
    /* Ferimento maciço: +1 a todo dano sofrido. */
    if (fisico && o.estado.ferimentos.some(function (f) { return f.chave === "ferimentoMacico"; })) { if (agr) agr += 1; else sup += 1; }
    var max = qual === "vitalidade" ? vitalidadeMaxima(o) : fdvMaxima(o);
    var antesT = trilha(max, o[qual]);
    var m = marcarNaTrilha(o[qual], max, sup, agr);
    var depois = trilha(max, o[qual]);
    eventos.push(evento("dano", { trilha: qual, superficial: sup, agravado: agr, convertidos: m.convertidos, fonte: p.fonte || "" }));
    if (!antesT.debilitado && depois.debilitado) eventos.push(evento("debilitado", { trilha: qual }));
    if (depois.toda && !antesT.toda) eventos = eventos.concat(fimDaTrilha(o, qual, p).eventos);
    else if (depois.toda && (p.fonte === "fogo" || p.fonte === "sol") && qual === "vitalidade" && o.estado.torpor && ehVampiro(o)) {
      /* Em Torpor com a Vitalidade toda Agravada, mais fogo ou sol: fim. */
      eventos = eventos.concat(morteFinal(o, p.fonte === "sol" ? "Luz do sol em Torpor" : "Fogo em Torpor").eventos);
    }
    return { ok: true, eventos: eventos, aplicado: { superficial: sup, agravado: agr } };
  }

  /* A trilha inteira preenchida de Agravado (p. 127). */
  function fimDaTrilha(o, qual, p) {
    var eventos = [];
    if (qual === "forcaDeVontade") {
      eventos.push(evento("colapsoMental", {}));
      return { eventos: eventos };
    }
    if (!ehVampiro(o)) {
      eventos.push(evento("mortal", { estado: "morte ou coma (Narrador)" }));
      return { eventos: eventos };
    }
    if (p && (p.fonte === "fogo" || p.fonte === "sol" || p.decapitacao)) {
      return morteFinal(o, p.decapitacao ? "Decapitação" : (p.fonte === "sol" ? "Luz do sol" : "Fogo"));
    }
    return entrarEmTorpor(o, "dano");
  }

  /* Gasto voluntário (Força de Vontade para rerrolar etc., p. 126): o
     Superficial não é dividido; com todos os espaços já Superficiais,
     vira Agravado. */
  function gastarForcaDeVontade(o, n, motivo) {
    var r = sofrerDano(o, { trilha: "forcaDeVontade", tipo: "superficial", valor: inteiro(n, 1, 10, 1), fonte: "gasto", naoDividir: true });
    r.eventos.unshift(evento("gastoDeFdV", { valor: inteiro(n, 1, 10, 1), motivo: motivo || "" }));
    return r;
  }

  function curarTrilha(o, qual, tipo, valor) {
    var t = o[qual], n = inteiro(valor, 0, 50, 0);
    var feito = Math.min(n, tipo === "agravado" ? t.agravado : t.superficial);
    if (tipo === "agravado") t.agravado -= feito; else t.superficial -= feito;
    return feito;
  }

  /* As penalidades de dano numa parada (p. 126): Vitalidade Debilitada
     → físicas; Força de Vontade Debilitada → sociais e mentais. */
  function penalidadesDeTrilha(o, categorias) {
    var out = [];
    var vit = trilha(vitalidadeMaxima(o), o.vitalidade);
    var fdv = trilha(fdvMaxima(o), o.forcaDeVontade);
    var ignora = temEfeito(o, "poderVindoDaDor") || !!o.estado.frenesi || temEfeito(o, "ignorarDor");
    if (vit.debilitado && !ignora && categorias.indexOf("fisico") >= 0) out.push({ fonte: "Vitalidade Debilitada", valor: -2 });
    if (fdv.debilitado && (categorias.indexOf("social") >= 0 || categorias.indexOf("mental") >= 0)) out.push({ fonte: "Força de Vontade Debilitada", valor: -2 });
    return out;
  }

  /* ---------------------------------------------------------------
     FOME E CHECAGENS DE SANGUE (p. 205, 211, 217–219)
     --------------------------------------------------------------- */

  function aumentarFome(o, n, motivo) {
    var antes = o.fome;
    o.fome = Math.min(5, o.fome + inteiro(n, 0, 5, 1));
    var eventos = [evento("fome", { de: antes, para: o.fome, motivo: motivo || "" })];
    if (o.fome >= 5) eventos = eventos.concat(expirarPor(o, "fome5"));
    return eventos;
  }

  /* Uma Checagem de Sangue. `o2`:
       motivo     texto (o que motivou)
       nivelDoPoder  para a rerrolagem da Potência
       forcada    a regra obriga (despertar, cura do Agravado, poder já
                  em curso): com Fome 5, a falha não é recusada
       contexto   "despertar" | "cura" | "torpor" | "poder" | …
     Uma falha aumenta a Fome; o efeito que motivou NÃO é cancelado. */
  function checagemDeSangue(o, o2, rolador) {
    var x = o2 || {};
    if (!ehVampiro(o)) {
      /* Carniçal: usar poderes acima do nível 1 custa 1 Agravado (p. 234);
         criaturas de horror: 1 Superficial (quem chama decide). */
      return falha("Só vampiros fazem Checagens de Sangue.");
    }
    if (o.fome >= 5 && !x.forcada) return falha("Com Fome 5 não se Inflama o Sangue por vontade (p. 211).", { fome5: true });
    var pot = C.potencia(potencia(o));
    var dois = !!x.doisDados || (x.nivelDoPoder !== undefined && x.nivelDoPoder !== null && inteiro(x.nivelDoPoder, 0, 10) <= pot.rerrolagem && pot.rerrolagem > 0);
    var c = D.checagem(rolador, { dados: dois ? 2 : 1 });
    var eventos = [evento("checagem", { faces: c.faces, sucesso: c.sucesso, motivo: x.motivo || "", dois: dois })];
    var consequencia = "";
    if (!c.sucesso) {
      if (o.fome >= 5) {
        if (x.contexto === "despertar" || x.contexto === "cura" || x.contexto === "torpor") {
          eventos = eventos.concat(entrarEmTorpor(o, x.contexto === "cura" ? "cura" : "fome").eventos);
          consequencia = "torpor";
        } else {
          eventos.push(evento("frenesiPendente", { frenesi: "fome", dificuldade: 4, motivo: "Falha numa Checagem com Fome 5" }));
          consequencia = "frenesi";
        }
      } else {
        eventos = eventos.concat(aumentarFome(o, 1, x.motivo));
      }
    }
    return { ok: true, sucesso: c.sucesso, faces: c.faces, consequencia: consequencia, eventos: eventos };
  }

  /* Várias Checagens de uma vez, cada uma resolvida (p. 219). */
  function checagens(o, n, o2, rolador) {
    var total = inteiro(n, 0, 20, 1), eventos = [], resultados = [];
    for (var i = 0; i < total; i++) {
      var r = checagemDeSangue(o, Object.assign({}, o2, { forcada: (o2 && o2.forcada) || i > 0 }), rolador);
      if (!r.ok) { if (!i) return r; break; }
      resultados.push(r);
      eventos = eventos.concat(r.eventos);
      if (r.consequencia === "torpor") break;
    }
    return { ok: true, resultados: resultados, falhas: resultados.filter(function (r) { return !r.sucesso; }).length, eventos: eventos };
  }

  /* Rubor de Vida (p. 218, Humanidade p. 236–238). */
  function ruborDeVida(o, rolador) {
    if (temEfeito(o, "ruborDeVida")) return falha("O Rubor de Vida já está ativo nesta noite.");
    var hum = humanidade(o);
    if (temDefeitoRalo(o, "carneMorta")) return falha("Carne Morta: sem Rubor de Vida.");
    var gratis = hum >= 10 || (o.ressonancia && o.ressonancia.discrasia === "entusiasmoPelaVida") || temQualidadeRalo(o, "semblanteDeVida") || ehSangueRalo(o);
    var eventos = [];
    if (!gratis) {
      var r = checagemDeSangue(o, { motivo: "Rubor de Vida", doisDados: hum === 8, contexto: "rubor" }, rolador);
      if (!r.ok) return r;
      eventos = eventos.concat(r.eventos);
    }
    eventos.push(evento("efeito", { chave: "ruborDeVida" }));
    adicionarEfeito(o, { chave: "ruborDeVida", nome: "Rubor de Vida", origem: { tipo: "sangue", chave: "rubor" }, duracao: "noite" });
    return { ok: true, eventos: eventos };
  }

  /* Recuperar Superficial à Vitalidade: 1 Checagem → a quantidade da
     tabela (p. 218). Fragilidade Mortal impede. */
  function curarSuperficial(o, rolador) {
    if (!ehVampiro(o)) return falha("Mortais e carniçais curam pelo tempo (p. 127).");
    if (temDefeitoRalo(o, "fragilidadeMortal")) return falha("Fragilidade Mortal: cura como mortal.");
    if (!o.vitalidade.superficial) return falha("Não há dano Superficial à Vitalidade.");
    var marca = "curaSup-" + o.tempo.turno;
    if (o.marcas.cena[marca]) return falha("Uma Checagem de cura por turno.");
    var r = checagemDeSangue(o, { motivo: "Recuperar dano Superficial", contexto: "curaSuperficial" }, rolador);
    if (!r.ok) return r;
    o.marcas.cena[marca] = true;
    var n = curarTrilha(o, "vitalidade", "superficial", C.potencia(potencia(o)).recupera);
    r.eventos.push(evento("cura", { trilha: "vitalidade", dano: "superficial", valor: n }));
    return { ok: true, eventos: r.eventos };
  }

  /* Agravado à Vitalidade: na noite seguinte ao dano, 3 Checagens além
     da do despertar removem 1 Agravado (ou um Ferimento Incapacitante);
     1 por noite; se a Fome passaria de 5, Torpor (p. 218–219). */
  function curarAgravado(o, rolador, opcoes) {
    if (!ehVampiro(o)) return falha("Mortais tratam o Agravado com Medicina (p. 127).");
    if (temDefeitoRalo(o, "fragilidadeMortal")) return falha("Fragilidade Mortal: cura como mortal.");
    if (o.marcas.noite.curaAgravado) return falha("Só 1 Agravado à Vitalidade por noite.");
    var alvo = opcoes && opcoes.ferimento ? "ferimento" : "agravado";
    if (alvo === "agravado" && !o.vitalidade.agravado) return falha("Não há dano Agravado à Vitalidade.");
    if (alvo === "ferimento" && !o.estado.ferimentos.length) return falha("Não há Ferimento Incapacitante.");
    if (o.fome >= 5) return falha("Com Fome 5 não se Inflama o Sangue por vontade.");
    var r = checagens(o, 3, { motivo: "Curar dano Agravado", contexto: "cura", forcada: false }, rolador);
    if (!r.ok) return r;
    var eventos = r.eventos;
    if (o.estado.torpor) return { ok: true, eventos: eventos, torpor: true };
    o.marcas.noite.curaAgravado = true;
    if (alvo === "ferimento") {
      var f = opcoes.ferimento ? o.estado.ferimentos.filter(function (x) { return x.id === opcoes.ferimento; })[0] : o.estado.ferimentos[0];
      o.estado.ferimentos = o.estado.ferimentos.filter(function (x) { return x !== f; });
      eventos.push(evento("cura", { ferimento: f ? f.chave : "" }));
    } else {
      curarTrilha(o, "vitalidade", "agravado", 1);
      eventos.push(evento("cura", { trilha: "vitalidade", dano: "agravado", valor: 1 }));
    }
    return { ok: true, eventos: eventos };
  }

  /* Mortais (e carniçais, que curam o dobro, exceto fogo): Superficial
     igual ao Vigor por dia; Medicina converte Agravado. */
  function curarComoMortal(o, dias) {
    var vig = valorDeAtributo(o, "vigor");
    var fator = o.natureza === "carnical" ? 2 : 1;
    var n = curarTrilha(o, "vitalidade", "superficial", vig * fator * inteiro(dias, 1, 365, 1));
    return { ok: true, eventos: [evento("cura", { trilha: "vitalidade", dano: "superficial", valor: n, mortal: true })] };
  }
  function tratarComMedicina(o, sucessosExcedentes, medicina) {
    var max = Math.ceil(inteiro(medicina, 0, 10) / 2);
    var n = Math.min(max, inteiro(sucessosExcedentes, 0, 20));
    var conv = Math.min(n, o.vitalidade.agravado);
    o.vitalidade.agravado -= conv;
    o.vitalidade.superficial += conv;
    return { ok: true, eventos: [evento("tratamento", { convertidos: conv })] };
  }

  /* ---------------------------------------------------------------
     A PARADA — o que entra e de onde vem (p. 118–120, 205, 217–218)
     --------------------------------------------------------------- */

  function categoriaDe(atributo) { var a = C.atributo(atributo); return a ? a.categoria : ""; }

  /* `pedido`:
       atributo, habilidade | disciplina | atributo2
       especializacao  id da especialização escolhida (uma)
       contexto        ["percepcao", "combate", "humanos", "resistirCoercao", …]
       modificadores   [{ fonte, valor }] da mesa (±dados)
       opcionais       chaves de modificadores opcionais aceitos
       surto           Surto de Sangue (a Checagem é cobrada por rolarTeste)
       resistirDisciplina  rolagem de resistência a um poder
       poder           chave do poder usado (bônus de Potência)
       tipo            "teste" | "trilha" | "rolagemUnica" */
  function montarParada(o, pedido) {
    var p = pedido || {};
    var conc = concessoes(o);
    var comp = [];
    var cats = [];
    var ctx = lista(p.contexto);
    if (p.atributo) {
      comp.push({ fonte: (C.atributo(p.atributo) || {}).nome || p.atributo, valor: valorDeAtributo(o, p.atributo), tipo: "atributo" });
      cats.push(categoriaDe(p.atributo));
    }
    if (p.atributo2) {
      comp.push({ fonte: (C.atributo(p.atributo2) || {}).nome || p.atributo2, valor: valorDeAtributo(o, p.atributo2), tipo: "atributo" });
      cats.push(categoriaDe(p.atributo2));
    }
    if (p.habilidade) comp.push({ fonte: (C.habilidade(p.habilidade) || {}).nome || p.habilidade, valor: valorDeHabilidade(o, p.habilidade, conc), tipo: "habilidade" });
    if (p.disciplina) comp.push({ fonte: (DS().DISCIPLINAS[p.disciplina] || {}).nome || p.disciplina, valor: valorDeDisciplina(o, p.disciplina, conc), tipo: "disciplina" });
    if (p.valorFixo !== undefined) comp.push({ fonte: p.rotuloFixo || "Trilha", valor: inteiro(p.valorFixo, 0, 30), tipo: "trilha" });

    var opcionais = [];
    if (p.tipo !== "trilha") {
      /* Especialização: +1 dado, uma só (p. 159). */
      if (p.especializacao && p.habilidade) {
        var esp = especializacoesDaFicha(o, conc).filter(function (e) { return e.id === p.especializacao && e.habilidade === p.habilidade; })[0];
        if (esp) comp.push({ fonte: "Especialização: " + esp.nome, valor: 1, tipo: "especializacao" });
      }
      /* Penalidades de trilha. */
      penalidadesDeTrilha(o, cats).forEach(function (x) { comp.push(Object.assign({ tipo: "penalidade" }, x)); });
      if (o.estado.degeneracao) comp.push({ fonte: "Degeneração", valor: -2, tipo: "penalidade" });
      /* Humanidade baixa: interagir com humanos (p. 238). */
      if (ctx.indexOf("humanos") >= 0) {
        var ht = C.HUMANIDADE[humanidade(o, conc)];
        var pen = temEfeito(o, "ruborDeVida") && ht.comRubor ? ht.comRubor : ht.penalidade;
        if (pen) comp.push({ fonte: "Humanidade " + humanidade(o, conc), valor: -pen, tipo: "penalidade" });
      }
      /* Compulsão (p. 208–211). */
      penalidadeDeCompulsao(o, p, cats).forEach(function (x) { comp.push(x); });
      /* Ferimentos, drogas, aspectos: efeitos com penalidades. */
      penalidadesDeEfeitos(o, p, cats).forEach(function (x) { comp.push(x); });
      /* Perdições automáticas. */
      perdicaoNaParada(o, p, cats).forEach(function (x) { comp.push(x); });
      /* Poderes (passivos e ativos), sem acumular o mesmo grupo. */
      modsDePoderes(o, p, cats).forEach(function (x) { comp.push(x); });
      /* Bônus de Potência do Sangue: usar ou resistir a Disciplinas. */
      if ((p.disciplina || p.resistirDisciplina) && ehVampiro(o)) {
        var bp = C.potencia(potencia(o, conc)).bonusPoder;
        if (bp) comp.push({ fonte: "Potência do Sangue", valor: bp, tipo: "potencia" });
      }
      /* Ressonância intensa/aguda: +1 na Disciplina correspondente. */
      if (p.disciplina && o.ressonancia && o.ressonancia.temperamento !== "efemero") {
        var res = C.RESSONANCIAS[o.ressonancia.tipo];
        if (res && res.disciplinas.indexOf(p.disciplina) >= 0) comp.push({ fonte: "Ressonância " + res.nome, valor: 1, tipo: "ressonancia" });
      }
      /* Vantagens e Discrasias com condição: opcionais. */
      opcionais = modificadoresOpcionais(o, p, cats);
      opcionais.forEach(function (x) { if (lista(p.opcionais).indexOf(x.chave) >= 0) comp.push(x); });
      /* Surto de Sangue: atributo, uma vez por rolagem; nunca trilha nem
         rolagem única (p. 218). */
      if (p.surto && p.tipo !== "rolagemUnica" && p.atributo && ehVampiro(o)) {
        comp.push({ fonte: "Surto de Sangue", valor: C.potencia(potencia(o, conc)).surto, tipo: "surto" });
      }
    }
    lista(p.modificadores).forEach(function (m) { comp.push({ fonte: texto(m.fonte, 60) || "Modificador", valor: inteiro(m.valor, -10, 10), tipo: "mesa" }); });
    var total = comp.reduce(function (s, x) { return s + x.valor; }, 0);
    return { total: Math.max(1, total), bruto: total, composicao: comp, opcionais: opcionais, categorias: cats };
  }

  function penalidadeDeCompulsao(o, p, cats) {
    var c = o.estado.compulsao;
    if (!c) return [];
    var ctx = lista(p.contexto);
    if (ctx.indexOf("compulsao") >= 0) return [];
    var def = c.cla ? (C.CLAS[o.cla] || {}).compulsao : C.COMPULSOES[c.chave];
    if (!def) return [];
    var pen = c.penalidade;
    if (Array.isArray(def.alvo)) {
      var acerta = def.alvo.some(function (a) { return a === p.atributo || a === p.atributo2 || (a === "frenesiDeTerror" && ctx.indexOf("frenesiDeTerror") >= 0); });
      if (!acerta) return [];
    }
    return [{ fonte: "Compulsão: " + def.nome, valor: -pen, tipo: "penalidade" }];
  }

  function penalidadesDeEfeitos(o, p, cats) {
    var out = [];
    o.efeitos.forEach(function (e) {
      var pen = objeto(e.dados.penalidades);
      Object.keys(pen).forEach(function (k) {
        var acerta = k === "todas" || k === p.atributo || k === p.atributo2 || cats.indexOf(k) >= 0 || (k === "disciplinas" && p.disciplina);
        if (acerta) out.push({ fonte: e.nome || e.chave, valor: -inteiro(pen[k], 0, 10), tipo: "penalidade" });
      });
    });
    o.estado.ferimentos.forEach(function (f) {
      var def = C.FERIMENTOS.filter(function (x) { return x.chave === f.chave; })[0];
      var pen = objeto(def && def.penalidades);
      Object.keys(pen).forEach(function (k) {
        if (k === "todas" || cats.indexOf(k) >= 0) out.push({ fonte: def.nome, valor: -pen[k], tipo: "penalidade" });
      });
    });
    return out;
  }

  function perdicaoNaParada(o, p, cats) {
    var out = [];
    var g = gravidadeDaPerdicao(o);
    if (!g) return out;
    var ctx = lista(p.contexto);
    if (o.cla === "brujah" && ctx.indexOf("frenesiDeFuria") >= 0) out.push({ fonte: "Perdição Brujah", valor: -g, tipo: "perdicao" });
    if (o.cla === "toreador" && p.disciplina && o.estado.ambienteFeio) out.push({ fonte: "Perdição Toreador (ambiente)", valor: -g, tipo: "perdicao" });
    if (o.cla === "nosferatu" && ctx.indexOf("disfarce") >= 0) out.push({ fonte: "Perdição Nosferatu", valor: -g, tipo: "perdicao" });
    if (o.cla === "malkaviano" && temEfeito(o, "perdicaoMalkaviana") && cats.indexOf(o.perdicaoParametro) >= 0) out.push({ fonte: "Perdição Malkaviana", valor: -g, tipo: "perdicao" });
    return out;
  }

  /* Modificadores dos poderes: os passivos que a ficha tem e os ativos
     que estão em curso. O mesmo grupo (Presença) entra uma vez. */
  function modsDePoderes(o, p, cats) {
    var out = [], grupos = {}, ctx = lista(p.contexto);
    var ativos = {};
    o.efeitos.forEach(function (e) { if (e.origem.tipo === "poder") ativos[e.origem.chave] = e; });
    poderesDaFicha(o).forEach(function (pp) {
      var def = DS().poder(pp.chave);
      if (!def || !def.efeitos || !def.efeitos.mods) return;
      var passivo = def.duracao === "passiva";
      if (!passivo && !ativos[pp.chave]) return;
      var nivel = valorDeDisciplina(o, def.disciplina);
      def.efeitos.mods.forEach(function (m) {
        var acerta = (m.atributo && (m.atributo === p.atributo || m.atributo === p.atributo2)) ||
          (m.habilidade && m.habilidade === p.habilidade && (!m.contexto || ctx.indexOf(m.contexto) >= 0)) ||
          (!m.atributo && !m.habilidade && m.contexto && ctx.indexOf(m.contexto) >= 0);
        if (!acerta) return;
        if (m.foraDeCombate && ctx.indexOf("combate") >= 0) return;
        var v = m.valor === "nivel" ? nivel : inteiro(m.valor, -10, 10);
        if (m.grupo) { if (grupos[m.grupo] !== undefined) { if (v > grupos[m.grupo].valor) grupos[m.grupo].valor = v; return; } }
        var item = { fonte: def.nome, valor: v, tipo: "poder", poder: def.chave };
        if (m.grupo) grupos[m.grupo] = item;
        out.push(item);
      });
    });
    return out;
  }

  /* Modificadores que dependem de uma circunstância que só a mesa sabe:
     a tela mostra, quem rola marca. */
  function modificadoresOpcionais(o, p, cats) {
    var out = [];
    var social = cats.indexOf("social") >= 0;
    vantagensDaFicha(o).forEach(function (v) {
      var def = C.VANTAGENS[v.chave];
      var ef = def && def.efeito;
      if (!ef) return;
      if (ef.social && social) out.push({ chave: "vant-" + v.chave, fonte: def.nome, valor: ef.social, tipo: "vantagem", condicao: ef.condicao || "parada Social relevante" });
      if (ef.abstinencia) out.push({ chave: "vant-" + v.chave, fonte: def.nome, valor: ef.abstinencia, tipo: "vantagem", condicao: "a última vítima não estava sob efeito" });
      if (ef.sobEfeito) out.push({ chave: "vant-" + v.chave, fonte: def.nome, valor: ef.sobEfeito, tipo: "vantagem", condicao: "a última vítima estava sob efeito" });
    });
    if (o.ressonancia && o.ressonancia.discrasia) {
      var dis = C.DISCRASIAS[o.ressonancia.discrasia];
      if (dis && dis.efeito.dados) out.push({ chave: "dis-" + o.ressonancia.discrasia, fonte: "Discrasia: " + dis.nome, valor: dis.efeito.dados, tipo: "discrasia", condicao: dis.efeito.condicao || "" });
    }
    if (lista(p.contexto).indexOf("humanos") >= 0 && temDefeitoRalo(o, "carneMorta")) out.push({ chave: "ralo-carneMorta", fonte: "Carne Morta", valor: -1, tipo: "vantagem", condicao: "face a face com mortais" });
    return out;
  }

  /* ---------------------------------------------------------------
     TESTES — do pedido ao resultado pendente, e a conclusão
     --------------------------------------------------------------- */

  /* Rola um teste da ficha. Cobra a Checagem do Surto antes (ela é
     voluntária: recusada com Fome 5). Devolve o resultado PENDENTE. */
  function rolarTeste(o, pedido, rolador) {
    var p = pedido || {};
    var eventos = [];
    var podeAgir = podeAgirAgora(o, p);
    if (!podeAgir.ok) return podeAgir;
    if (p.surto) {
      if (!ehVampiro(o)) return falha("Só vampiros usam o Surto de Sangue.");
      if (p.tipo === "trilha" || p.tipo === "rolagemUnica") return falha("O Surto não vale em testes de trilha nem em conflito de rolagem única.");
      if (temEfeito(o, "subjugado")) return falha("Subjugar a Besta impede o Surto de Sangue.");
      var ch = checagemDeSangue(o, { motivo: "Surto de Sangue", contexto: "surto" }, rolador);
      if (!ch.ok) return ch;
      eventos = eventos.concat(ch.eventos);
    }
    var par = montarParada(o, p);
    var tipo = p.tipo === "trilha" ? "trilha" : p.tipo === "rolagemUnica" ? "rolagemUnica" : "teste";
    var semFome = tipo !== "teste" || !ehVampiro(o) || !!p.semFome;
    var r = D.rolar({ parada: par.total, fome: o.fome, semFome: semFome, tipo: tipo, dificuldade: p.dificuldade, oposicao: p.oposicao, composicao: par.composicao, rotulo: p.rotulo || "", surto: !!p.surto, id: p.id || novoId("ro"), custos: eventos.filter(function (e) { return e.tipo === "checagem"; }).map(function (e) { return { tipo: "checagem", sucesso: e.sucesso }; }) }, rolador);
    r.pedido = { atributo: p.atributo || "", habilidade: p.habilidade || "", disciplina: p.disciplina || "", atributo2: p.atributo2 || "", poder: p.poder || "", contexto: lista(p.contexto) };
    return { ok: true, resultado: r, eventos: eventos };
  }

  function podeAgirAgora(o, p) {
    if (o.estado.morteFinal) return falha("Morte Final: a ficha fica para consulta.");
    if (o.estado.torpor && !lista(p.contexto).some(function (c) { return c === "torpor"; })) return falha("Em Torpor não se age.");
    if (o.estado.estacado && p.disciplina && (DS().DISCIPLINAS[p.disciplina] || {}).tipo !== "mental") return falha("Estacado: só Disciplinas mentais (sem dar ordens).");
    if (o.estado.frenesi && p.disciplina && (DS().DISCIPLINAS[p.disciplina] || {}).tipo !== "fisica") return falha("Em frenesi, só Disciplinas físicas (Celeridade, Fortitude, Potência).");
    return { ok: true };
  }

  /* Gasta 1 FdV e rerrola até 3 dados comuns (p. 122, 158). O custo é
     Superficial SEM dividir. Só dentro da janela pendente. */
  function rerrolarComFdV(o, resultado, indices, rolador) {
    var pode = D.podeRerrolar(resultado);
    if (!pode.ok) return falha(pode.motivo);
    if (o.estado.frenesi) return falha("Em frenesi, a Força de Vontade não rerrola (p. 220).");
    var lista2 = (Array.isArray(indices) ? indices : []).filter(function (i) { return resultado.dados[i] && !resultado.dados[i].fome; });
    if (!lista2.length || lista2.length !== (indices || []).length) return falha("Escolha até três dados comuns.");
    var gasto = gastarForcaDeVontade(o, 1, "Rerrolar dados");
    var r = D.rerrolar(resultado, indices, rolador);
    if (!r.ok) return falha(r.motivo);
    resultado.custos.push({ tipo: "forcaDeVontade", valor: 1 });
    return { ok: true, eventos: gasto.eventos.concat([evento("rerrolagem", { indices: lista2, sucessos: resultado.classificacao.sucessos })]) };
  }

  /* Fecha o teste: daqui em diante a classificação vale. Um crítico
     bestial ou falha bestial vira PENDÊNCIA de consequência (escolha da
     mesa); a Perdição Malkaviana entra; a Compulsão Tremere encerra numa
     vitória crítica de Habilidade. */
  function concluirTeste(o, resultado, opcoes) {
    if (!resultado.classificacao.julgado && !(opcoes && opcoes.semJulgamento)) return falha("Falta a Dificuldade ou a oposição para julgar o teste.");
    var c = D.concluir(resultado, opcoes);
    if (!c.ok) return falha(c.motivo);
    if (c.repetida) return { ok: true, eventos: [] };
    var eventos = [], cl = resultado.classificacao;
    if (cl.criticoBestial && !temEfeito(o, "subjugado")) eventos.push(evento("criticoBestial", { opcoes: ["compulsao", "maculas", "mascara", "vantagem"] }));
    if (cl.falhaBestial) {
      eventos.push(evento("falhaBestial", { opcoes: ["compulsao", "vantagem", "dano", "fome"] }));
      if (o.cla === "malkaviano" && o.perdicaoParametro) {
        adicionarEfeito(o, { chave: "perdicaoMalkaviana", nome: "Perdição Malkaviana", origem: { tipo: "perdicao", chave: "malkaviano" }, duracao: "cena" });
        eventos.push(evento("perdicao", { cla: "malkaviano" }));
      }
    }
    if (o.estado.compulsao && o.estado.compulsao.cla && o.cla === "tremere" && cl.vitoriaCritica && resultado.pedido && resultado.pedido.habilidade) {
      eventos = eventos.concat(encerrarCompulsao(o, "Vitória crítica (Perfeccionismo)").eventos);
    }
    if (cl.vitoria === false && o.efeitos.some(function (e) { return e.chave === "arrebatamento"; })) {
      eventos.push(evento("discrasia", { chave: "arrebatamento", texto: "Falhou: −2 em todos os testes agora." }));
    }
    registrarNoHistorico(o, evento("teste", { rotulo: resultado.rotulo, sucessos: cl.sucessos, vitoria: cl.vitoria, critica: cl.vitoriaCritica, bestial: cl.criticoBestial ? "critico" : cl.falhaBestial ? "falha" : "" }));
    return { ok: true, eventos: eventos };
  }

  /* A consequência ESCOLHIDA de um resultado bestial (p. 207). Uma só,
     nunca todas ao mesmo tempo. */
  function consequenciaBestial(o, escolha, rolador) {
    var e = escolha || {};
    var eventos = [];
    switch (e.tipo) {
      case "compulsao": return iniciarCompulsao(o, e.compulsao, rolador);
      case "maculas": return adicionarMaculas(o, inteiro(e.valor, 1, 5, 1), "Crítico bestial");
      case "mascara": eventos.push(evento("quebraDaMascara", { nota: texto(e.nota, 200) })); break;
      case "vantagem": eventos.push(evento("perdaDeVantagem", { chave: texto(e.vantagem, 60), nota: texto(e.nota, 200) })); break;
      case "dano": return sofrerDano(o, { trilha: "vitalidade", tipo: "agravado", valor: inteiro(e.valor, 1, 5, 1), naoDividir: true });
      case "fome":
        if (o.fome >= 5) { eventos.push(evento("frenesiPendente", { frenesi: "fome", dificuldade: 4, motivo: "Falha bestial com Fome 5" })); break; }
        eventos = eventos.concat(aumentarFome(o, 1, "Falha bestial")); break;
      default: return falha("Consequência desconhecida.");
    }
    return { ok: true, eventos: eventos };
  }

  /* ---------------------------------------------------------------
     COMPULSÕES (p. 208–211) e FRENESI (p. 219–220)
     --------------------------------------------------------------- */

  function iniciarCompulsao(o, chave, rolador) {
    if (o.estado.frenesi) return falha("Em frenesi não se ganha Compulsão (p. 220).");
    var k = chave;
    var eventos = [];
    if (!k || k === "aleatoria") {
      var f = rolador(10);
      k = C.compulsaoDaTabela(f);
      eventos.push(evento("tabelaDeCompulsao", { face: f, resultado: k }));
      if (k === "cla" && !(C.CLAS[o.cla] && C.CLAS[o.cla].compulsao)) {
        var f2;
        do { f2 = rolador(10); } while (f2 === 10);
        k = C.compulsaoDaTabela(f2);
        eventos.push(evento("tabelaDeCompulsao", { face: f2, resultado: k, rerrolada: true }));
      }
    }
    var cla = k === "cla";
    var def = cla ? (C.CLAS[o.cla] || {}).compulsao : C.COMPULSOES[k];
    if (!def) return falha("Compulsão desconhecida.");
    o.estado.compulsao = { chave: cla ? def.chave : k, cla: cla, penalidade: def.penalidade, cena: o.tempo.cena, repeticoes: 0, nota: "" };
    eventos.push(evento("compulsao", { chave: o.estado.compulsao.chave, nome: def.nome, penalidade: def.penalidade, termina: def.termina }));
    if (o.cla === "malkaviano" && o.perdicaoParametro) {
      adicionarEfeito(o, { chave: "perdicaoMalkaviana", nome: "Perdição Malkaviana", origem: { tipo: "perdicao", chave: "malkaviano" }, duracao: "cena" });
    }
    return { ok: true, eventos: eventos };
  }

  function encerrarCompulsao(o, motivo) {
    if (!o.estado.compulsao) return { ok: true, eventos: [] };
    var c = o.estado.compulsao;
    o.estado.compulsao = null;
    return { ok: true, eventos: [evento("compulsaoEncerrada", { chave: c.chave, motivo: motivo || "cumprida" })] };
  }

  /* Perfeccionismo (Tremere): repetir a ação reduz a penalidade. */
  function repetirAcaoPerfeccionismo(o) {
    var c = o.estado.compulsao;
    if (!c || !c.cla || o.cla !== "tremere") return falha("Sem Perfeccionismo ativo.");
    c.repeticoes++;
    if (c.repeticoes >= 2) return encerrarCompulsao(o, "Segunda repetição");
    c.penalidade = 1;
    return { ok: true, eventos: [evento("compulsao", { chave: c.chave, penalidade: 1 })] };
  }

  /* A parada de resistência ao frenesi: Força de Vontade atual + 1/3 da
     Humanidade (arred. para baixo), sem dados de Fome (p. 219). */
  function paradaDeFrenesi(o, tipo) {
    var fdv = trilha(fdvMaxima(o), o.forcaDeVontade).atual;
    var hum = humanidade(o);
    var comp = [{ fonte: "Força de Vontade atual", valor: fdv }, { fonte: "Humanidade (1/3)", valor: Math.floor(hum / 3) }];
    if (o.cla === "brujah" && tipo === "furia") comp.push({ fonte: "Perdição Brujah", valor: -gravidadeDaPerdicao(o) });
    if (o.ressonancia && o.ressonancia.discrasia === "indiferente") comp.push({ fonte: "Discrasia Indiferente", valor: 2 });
    var total = comp.reduce(function (s, x) { return s + x.valor; }, 0);
    return { total: Math.max(1, total), composicao: comp };
  }

  function frenesiPossivel(o) {
    if (!ehVampiro(o)) return false;
    if (ehSangueRalo(o) && !temDefeitoRalo(o, "temperamentoBestial")) return "sobrenatural";
    return true;
  }

  /* Testar o frenesi: { tipo, dificuldade, gatilho, sobrenatural }.
     `curtir`: Curtir a Onda — sucumbe sem teste (p. 220). */
  function testarFrenesi(o, pedido, rolador) {
    var p = pedido || {};
    if (!C.FRENESI[p.tipo]) return falha("Tipo de frenesi desconhecido.");
    var poss = frenesiPossivel(o);
    if (!poss) return falha("Só vampiros entram em frenesi.");
    if (poss === "sobrenatural" && !p.sobrenatural) return falha("Sangue-ralo só entra em frenesi por meios sobrenaturais (p. 113).");
    if (o.estado.frenesi) return falha("Já está em frenesi.");
    if (p.curtir) return entrarEmFrenesi(o, p.tipo, true);
    var par = paradaDeFrenesi(o, p.tipo);
    var dif = inteiro(p.dificuldade, 1, 10, 3);
    lista(o.efeitos).forEach(function (e) { if (e.dados.dificuldadeFrenesi) dif = Math.max(1, dif + inteiro(e.dados.dificuldadeFrenesi, -3, 3)); });
    var r = D.rolar({ parada: par.total, tipo: "trilha", dificuldade: dif, composicao: par.composicao, rotulo: "Resistir a frenesi de " + C.FRENESI[p.tipo].nome }, rolador);
    D.concluir(r);
    var cl = r.classificacao;
    var eventos = [evento("testeDeFrenesi", { frenesi: p.tipo, dificuldade: dif, sucessos: cl.sucessos, vitoria: cl.vitoria, critica: cl.vitoriaCritica })];
    if (cl.vitoria) {
      eventos.push(evento("frenesiResistido", { perdeTurno: !cl.vitoriaCritica }));
      return { ok: true, resultado: r, resistiu: true, eventos: eventos };
    }
    var e = entrarEmFrenesi(o, p.tipo, false);
    return { ok: true, resultado: r, resistiu: false, eventos: eventos.concat(e.eventos) };
  }

  function entrarEmFrenesi(o, tipo, curtindo) {
    o.estado.frenesi = { tipo: tipo, curtindo: !!curtindo, cena: o.tempo.cena };
    var eventos = [evento("frenesi", { frenesi: tipo, curtindo: !!curtindo })];
    /* Compulsão e frenesi são estados distintos: o frenesi suspende a
       Compulsão em curso (não pode ganhar outra), sem apagá-la. */
    return { ok: true, eventos: eventos };
  }

  /* Encerrar o frenesi. A Perdição Gangrel deixa aspectos animais
     (Gravidade; Curtindo a Onda pode ficar com um só) até uma noite
     depois (p. 73). `aspectos`: [{ atributo }] escolhidos. */
  function encerrarFrenesi(o, motivo, aspectos) {
    var f = o.estado.frenesi;
    if (!f) return { ok: true, eventos: [] };
    o.estado.frenesi = null;
    var eventos = [evento("frenesiEncerrado", { frenesi: f.tipo, motivo: motivo || "" })];
    if (o.cla === "gangrel") {
      var n = f.curtindo ? Math.min(1, gravidadeDaPerdicao(o)) : gravidadeDaPerdicao(o);
      var escolhidos = lista(aspectos).slice(0, n);
      var padrao = ["inteligencia", "manipulacao"];
      while (escolhidos.length < n) escolhidos.push({ atributo: padrao[escolhidos.length % 2] });
      var at = {};
      escolhidos.forEach(function (a) { if (C.atributo(a.atributo)) at[a.atributo] = (at[a.atributo] || 0) - 1; });
      if (n) {
        adicionarEfeito(o, { chave: "aspectosAnimais", nome: "Aspectos animais (Perdição Gangrel)", origem: { tipo: "perdicao", chave: "gangrel" }, duracao: "noiteSeguinte", dados: { atributos: at, aspectos: escolhidos.map(function (a) { return texto(a.nota || a.atributo, 80); }) } });
        eventos.push(evento("perdicao", { cla: "gangrel", aspectos: n }));
      }
    }
    return { ok: true, eventos: eventos };
  }

  /* Assumir o controle por um turno (FdV, p. 158): em frenesi ou sob
     coerção sobrenatural. */
  function assumirControle(o, motivo) {
    if (!o.estado.frenesi && !(motivo === "coercao")) return falha("Nada a resistir agora.");
    var r = gastarForcaDeVontade(o, 1, "Assumir o controle por um turno");
    r.eventos.push(evento("controleAssumido", { motivo: motivo || "frenesi" }));
    return r;
  }

  /* ---------------------------------------------------------------
     HUMANIDADE, MÁCULAS, REMORSO, PILARES (p. 236–241)
     --------------------------------------------------------------- */

  function adicionarMaculas(o, n, motivo, opcoes) {
    var hum = humanidade(o);
    var antes = o.maculas;
    var mitigadas = opcoes && opcoes.convicao ? inteiro(opcoes.mitigar, 1, 5, 1) : 0;
    var valor = Math.max(0, inteiro(n, 0, 10, 1) - mitigadas);
    var espaco = 10 - hum;
    var eventos = [];
    if (mitigadas) eventos.push(evento("maculaMitigada", { valor: mitigadas, motivo: "Convicção" }));
    if (!valor) return { ok: true, eventos: eventos };
    o.maculas = Math.min(10, antes + valor);
    eventos.push(evento("maculas", { de: antes, para: o.maculas, motivo: motivo || "" }));
    var excesso = Math.max(0, o.maculas - espaco) - Math.max(0, antes - espaco);
    if (excesso > 0) {
      /* Degeneração (p. 239): Debilitado e 1 Agravado à FdV por Mácula
         que não coube, até o Remorso do fim da sessão. */
      o.estado.degeneracao = true;
      eventos.push(evento("degeneracao", { excesso: excesso }));
      eventos = eventos.concat(sofrerDano(o, { trilha: "forcaDeVontade", tipo: "agravado", valor: excesso, naoDividir: true }).eventos);
    }
    return { ok: true, eventos: eventos };
  }

  /* Remorso no fim da sessão: dados = espaços vazios (mínimo 1), sem
     Fome. Sucesso mantém; nenhum sucesso perde 1. As Máculas somem. */
  function testarRemorso(o, rolador) {
    if (!o.maculas) return falha("Sem Máculas, sem teste de Remorso.");
    var hum = humanidade(o);
    var comp = [{ fonte: "Espaços vazios", valor: Math.max(0, 10 - hum - o.maculas) }];
    if (o.ressonancia && o.ressonancia.discrasia === "emLuto") comp.push({ fonte: "Discrasia Em Luto", valor: 1 });
    o.efeitos.forEach(function (e) { if (e.dados.remorso) comp.push({ fonte: e.nome, valor: inteiro(e.dados.remorso, -5, 5) }); });
    var total = Math.max(1, comp.reduce(function (s, x) { return s + x.valor; }, 0));
    var r = D.rolar({ parada: total, tipo: "trilha", dificuldade: 1, composicao: comp, rotulo: "Remorso" }, rolador);
    D.concluir(r);
    var eventos = [evento("remorso", { sucessos: r.classificacao.sucessos, dados: total })];
    o.maculas = 0;
    o.estado.degeneracao = false;
    if (!r.classificacao.vitoria) eventos = eventos.concat(mudarHumanidade(o, -1, "remorso", "Remorso sem sucesso").eventos);
    else eventos.push(evento("humanidadeMantida", {}));
    return { ok: true, resultado: r, eventos: eventos };
  }

  /* Encerrar a Degeneração antes: aceitar perder 1 Humanidade. */
  function aceitarDegeneracao(o) {
    if (!o.estado.degeneracao) return falha("Sem Degeneração.");
    o.estado.degeneracao = false;
    o.maculas = 0;
    var r = mudarHumanidade(o, -1, "degeneracao", "Aceitou a Degeneração");
    return r;
  }

  function mudarHumanidade(o, delta, origem, motivo) {
    var antes = humanidade(o);
    o.ajustes.push({ id: novoId("aj"), tipo: "humanidade", alvo: "", valor: inteiro(delta, -10, 10), origem: origem || "narrador", motivo: motivo || "", noite: o.tempo.noite });
    var depois = humanidade(o);
    var eventos = [evento("humanidade", { de: antes, para: depois, motivo: motivo || "" })];
    if (depois <= 0 && antes > 0 && ehVampiro(o)) {
      /* A última gota (p. 241): frenesi, Físicos 5 na cena, wassail,
         a personagem passa ao Narrador. A ficha fica. */
      o.estado.wassail = true;
      adicionarEfeito(o, { chave: "ultimaGota", nome: "A última gota", origem: { tipo: "humanidade", chave: "0" }, duracao: "cena", dados: { atributos: atributosParaCinco(o) } });
      eventos.push(evento("humanidadeZero", {}));
      if (!o.estado.frenesi) eventos = eventos.concat(entrarEmFrenesi(o, "furia", false).eventos);
    }
    return { ok: true, eventos: eventos };
  }
  function atributosParaCinco(o) {
    var out = {};
    ["forca", "destreza", "vigor"].forEach(function (k) { var v = valorDeAtributo(o, k); if (v < 5) out[k] = 5 - v; });
    return out;
  }

  /* Um Pilar sofre algo (p. 240): Máculas automáticas; destruído, a
     Convicção ligada se perde se não houver transferência. */
  function eventoDePilar(o, pilarId, chave, rolador, opcoes) {
    var pi = o.pilares.filter(function (x) { return x.id === pilarId; })[0];
    var def = C.MACULAS_DE_PILAR.filter(function (x) { return x.chave === chave; })[0];
    if (!pi || !def) return falha("Pilar ou evento desconhecido.");
    var eventos = [];
    pi.historico = lista(pi.historico).concat([{ evento: chave, noite: o.tempo.noite }]).slice(-20);
    if (chave.indexOf("Destruido") >= 0 || chave === "pilarDestruido") pi.estado = "destruido";
    else if (chave.indexOf("Ferido") >= 0) pi.estado = pi.estado === "destruido" ? "destruido" : "ferido";
    eventos = eventos.concat(adicionarMaculas(o, def.maculas, def.nome).eventos);
    if (pi.estado === "destruido") eventos.push(evento("pilarDestruido", { pilar: pi.id, nome: pi.nome, convicao: pi.convicaoId, transferir: "Humanidade, Dif 4" }));
    return { ok: true, eventos: eventos };
  }

  /* Transferir a fixação para outro Pilar: Humanidade Dif 4; falha, a
     Convicção associada se perde (p. 240). */
  function transferirPilar(o, pilarId, novoNome, rolador) {
    var pi = o.pilares.filter(function (x) { return x.id === pilarId; })[0];
    if (!pi || pi.estado !== "destruido") return falha("Só um Pilar destruído é transferido.");
    var r = D.rolar({ parada: humanidade(o), tipo: "trilha", dificuldade: 4, rotulo: "Transferir Pilar" }, rolador);
    D.concluir(r);
    var eventos = [evento("transferenciaDePilar", { sucessos: r.classificacao.sucessos, vitoria: r.classificacao.vitoria })];
    if (r.classificacao.vitoria) {
      o.pilares.push({ id: novoId("pi"), nome: texto(novoNome, 120), convicaoId: pi.convicaoId, relacaoId: "", estado: "vivo", historico: [{ evento: "transferido", de: pi.id }] });
    } else {
      o.convicoes.forEach(function (c) { if (c.id === pi.convicaoId) c.perdida = true; });
      eventos.push(evento("convicaoPerdida", { convicao: pi.convicaoId }));
    }
    return { ok: true, resultado: r, eventos: eventos };
  }

  /* ---------------------------------------------------------------
     ESTADOS: Torpor, estaca, Morte Final, sono diurno (p. 219–223)
     --------------------------------------------------------------- */

  function entrarEmTorpor(o, motivo) {
    if (o.estado.torpor) return { ok: true, eventos: [] };
    var ht = C.HUMANIDADE[humanidade(o)] || C.HUMANIDADE[1];
    o.estado.torpor = { motivo: motivo || "", noite: o.tempo.noite, dias: ht.torporDias, ate: "" };
    o.estado.frenesi = null;
    o.estado.compulsao = null;
    return { ok: true, eventos: [evento("torpor", { motivo: motivo || "", duracao: ht.torpor })] };
  }

  /* Despertar do Torpor: com Fome 5 (p. 223). `sangue`: alimentado por
     sangue de Potência maior, bastante para saciar 1 — interrompe. */
  function despertarDoTorpor(o, modo) {
    if (!o.estado.torpor) return falha("Não está em Torpor.");
    if (o.estado.estacado) return falha("Estacado: fica em Torpor até tirarem a estaca.");
    var t = o.estado.torpor;
    if (modo !== "sangue" && modo !== "narrador" && o.tempo.noite - t.noite < t.dias && t.motivo !== "dano") return falha("O período de Torpor ainda não passou.");
    if (t.motivo === "dano" && o.vitalidade.agravado >= vitalidadeMaxima(o) && modo !== "narrador") return falha("Ainda com a Vitalidade toda Agravada.");
    o.estado.torpor = null;
    o.fome = modo === "sangue" ? 4 : 5;
    return { ok: true, eventos: [evento("despertouDoTorpor", { modo: modo || "tempo", fome: o.fome })] };
  }

  function estaquear(o) {
    if (!ehVampiro(o)) return falha("Só vampiros são paralisados pela estaca.");
    if (ehSangueRalo(o)) {
      /* Sangue-ralo: a estaca não paralisa; é trauma maciço (p. 111). */
      return { ok: true, eventos: [evento("estacaSemEfeito", { motivo: "Sangue-ralo: trauma maciço, não paralisia" })] };
    }
    if (temVantagem(o, "iscaDeEstaca")) return morteFinal(o, "Isca de Estaca");
    if (o.efeitos.some(function (e) { return e.dados.imuneEstaca || e.dados.primeiraEstaca; })) {
      var ef = o.efeitos.filter(function (e) { return e.dados.primeiraEstaca; })[0];
      if (ef) { removerEfeito(o, ef.id); return { ok: true, eventos: [evento("estacaDespedacada", { motivo: ef.nome })] }; }
      return { ok: true, eventos: [evento("estacaSemEfeito", { motivo: "Coração de Pedra" })] };
    }
    o.estado.estacado = true;
    return { ok: true, eventos: [evento("estacado", {})] };
  }
  function removerEstaca(o) {
    if (!o.estado.estacado) return falha("Não está estacado.");
    o.estado.estacado = false;
    return { ok: true, eventos: [evento("estacaRemovida", {})] };
  }

  function morteFinal(o, causa) {
    if (o.estado.morteFinal) return { ok: true, eventos: [] };
    o.estado.morteFinal = { causa: texto(causa, 200), quando: "noite " + o.tempo.noite };
    o.estado.frenesi = null; o.estado.compulsao = null;
    return { ok: true, eventos: [evento("morteFinal", { causa: texto(causa, 200) })] };
  }

  /* Luz do sol (p. 221): Agravado = Gravidade da Perdição por turno
     (obscurecida: turno sim, turno não). Sangue-ralo: 1 Superficial.
     Humanidade 10: pela metade. Bebedor Diurno: só a metade da
     Vitalidade. */
  function luzDoSol(o, intensidade) {
    if (!ehVampiro(o)) return { ok: true, eventos: [] };
    if (ehSangueRalo(o)) {
      if (temQualidadeRalo(o, "bebedorDiurno")) {
        if (!temEfeito(o, "bebedorDiurnoAoSol")) adicionarEfeito(o, { chave: "bebedorDiurnoAoSol", nome: "Bebedor Diurno ao sol", origem: { tipo: "sangueRalo", chave: "bebedorDiurno" }, duracao: "cena" });
        return { ok: true, eventos: [evento("sol", { bebedorDiurno: true })] };
      }
      return sofrerDano(o, { trilha: "vitalidade", tipo: "superficial", valor: 1, fonte: "sol", naoDividir: true });
    }
    var g = Math.max(1, gravidadeDaPerdicao(o));
    if (humanidade(o) >= 10) g = Math.ceil(g / 2);
    if (intensidade === "obscurecida") {
      var m = "sol-" + Math.floor(o.tempo.turno / 2);
      if (o.marcas.cena[m]) return { ok: true, eventos: [evento("sol", { obscurecida: true, poupado: true })] };
      o.marcas.cena[m] = true;
    }
    return sofrerDano(o, { trilha: "vitalidade", tipo: "agravado", valor: g, fonte: "sol" });
  }

  function fogo(o, exposicao) {
    var n = exposicao === "engolfado" ? 3 : exposicao === "corpo" ? 2 : 1;
    if (temEfeito(o, "andarilhoDoFogo")) n = Math.ceil(n / 2);
    return sofrerDano(o, { trilha: "vitalidade", tipo: "agravado", valor: n, fonte: "fogo" });
  }

  /* Despertar de dia (p. 219): Humanidade Dif pela crise. Acordado,
     a parada máxima é a Humanidade. */
  function despertarDeDia(o, dificuldade, rolador) {
    var r = D.rolar({ parada: Math.max(1, humanidade(o)), tipo: "trilha", dificuldade: inteiro(dificuldade, 1, 8, 3), rotulo: "Despertar de dia" }, rolador);
    D.concluir(r);
    var eventos = [evento("despertarDeDia", { sucessos: r.classificacao.sucessos, vitoria: r.classificacao.vitoria })];
    if (r.classificacao.vitoria) adicionarEfeito(o, { chave: "acordadoDeDia", nome: "Acordado de dia", origem: { tipo: "sono", chave: "dia" }, duracao: "cena", dados: { paradaMaxima: humanidade(o), critico: r.classificacao.vitoriaCritica } });
    return { ok: true, resultado: r, eventos: eventos };
  }

  /* ---------------------------------------------------------------
     RESSONÂNCIA E DISCRASIAS (p. 226–231)
     --------------------------------------------------------------- */

  /* Ressonância aleatória (p. 228). */
  function ressonanciaAleatoria(rolador) {
    var t = rolador(10), temperamento;
    if (t <= 5) return { tipo: "", temperamento: "", faces: [t] };
    if (t <= 8) temperamento = "efemero";
    else { var t2 = rolador(10); temperamento = t2 <= 8 ? "intenso" : "agudo"; }
    var f = rolador(10);
    return { tipo: C.ressonanciaDaTabela(f), temperamento: temperamento, faces: [t, f] };
  }

  function definirRessonancia(o, r) {
    var anterior = o.ressonancia;
    o.ressonancia = r && C.RESSONANCIAS[r.tipo] ? { tipo: r.tipo, temperamento: C.TEMPERAMENTOS[r.temperamento] ? r.temperamento : "efemero", discrasia: r.temperamento === "agudo" && C.DISCRASIAS[r.discrasia] && C.DISCRASIAS[r.discrasia].ressonancia === r.tipo ? r.discrasia : "", fonte: texto(r.fonte, 120), usada: false } : null;
    /* Sangue-ralo: 1 ponto numa Disciplina da Ressonância e um poder de
       nível 1; intensa ou mais, +1 ponto e um segundo poder (p. 113). */
    o.efeitos = o.efeitos.filter(function (e) { return e.chave !== "disciplinaDaRessonancia"; });
    var eventos = [evento("ressonancia", { de: anterior ? anterior.tipo : "", para: o.ressonancia ? o.ressonancia.tipo : "", temperamento: o.ressonancia ? o.ressonancia.temperamento : "" })];
    if (o.ressonancia && ehSangueRalo(o) && !temQualidadeRalo(o, "afinidadeComDisciplina")) {
      var res = C.RESSONANCIAS[o.ressonancia.tipo];
      var disc = r.disciplina && res.disciplinas.indexOf(r.disciplina) >= 0 ? r.disciplina : res.disciplinas[0];
      var pontos = o.ressonancia.temperamento === "efemero" ? 1 : 2;
      var d = {}; d[disc] = pontos;
      adicionarEfeito(o, { chave: "disciplinaDaRessonancia", nome: "Ressonância (sangue-ralo): " + DS().DISCIPLINAS[disc].nome, origem: { tipo: "ressonancia", chave: disc }, duracao: "ateFome5", dados: { disciplinas: d, poderes: lista(r.poderes).slice(0, pontos) } });
      eventos.push(evento("disciplinaTemporaria", { disciplina: disc, pontos: pontos }));
    }
    return eventos;
  }

  /* ---------------------------------------------------------------
     ALIMENTAÇÃO (p. 211–213, 226–231, 306–308)
     --------------------------------------------------------------- */

  /* Planejar mostra o que vai acontecer ANTES de confirmar: quanto sacia,
     o mínimo que a Potência permite, custos e as escolhas que só a mesa
     faz (matar, violar uma Convicção, quebrar a Máscara). */
  function planejarAlimentacao(o, pedido) {
    var p = pedido || {};
    var fonte = C.FONTES_DE_SANGUE[p.fonte];
    if (!fonte) return falha("Fonte de sangue desconhecida.");
    if (!ehVampiro(o)) return falha("Só vampiros se alimentam de sangue.");
    if (o.estado.torpor || o.estado.morteFinal) return falha("Não pode se alimentar agora.");
    var pot = potencia(o);
    var tab = C.potencia(pot);
    var avisos = [], custos = [], escolhas = [];
    var sacia = fonte.sacia;
    if (fonte.minSacia !== undefined) sacia = inteiro(p.quantidade, fonte.minSacia, fonte.sacia, fonte.minSacia);
    var potEf = pot;
    if ((fonte.animal) && temPoder(o, "suculenciaAnimal")) { sacia += 1; potEf = Math.max(0, pot - 2); }
    var meio = false;
    if (fonte.animal || fonte.ensacado) {
      var tabEf = C.potencia(potEf);
      if (fonte.ensacado && temVantagem(o, "esofagoDeFerro")) { /* integral */ }
      else if (tabEf.animalEnsacado === "nada") { avisos.push("Potência " + pot + ": sangue animal ou ensacado não sacia nada."); sacia = 0; }
      else if (tabEf.animalEnsacado === "metade") { meio = true; avisos.push("Potência 2: sacia a metade — é preciso o dobro."); }
    }
    if (fonte.humano) {
      if (tab.saciaMenos && !fonte.mata) { sacia = Math.max(0, sacia - tab.saciaMenos); avisos.push("Potência " + pot + ": cada humano sacia " + tab.saciaMenos + " a menos."); }
      if (temVantagem(o, "fazendeiro")) custos.push({ tipo: "forcaDeVontade", valor: 2, motivo: "Defeito Fazendeiro" });
      if (temVantagem(o, "organivoro")) avisos.push("Organívoro: só reduz a Fome comendo carne e órgãos.");
    }
    if (fonte.animal && o.cla === "ventrue") avisos.push("Ventrue: o sangue animal costuma fugir da preferência.");
    if (o.cla === "ventrue" && !p.preferido && (fonte.humano || fonte.animal)) custos.push({ tipo: "forcaDeVontade", valor: gravidadeDaPerdicao(o), motivo: "Perdição Ventrue (fora da preferência)" });
    if (fonte.vampiro) {
      var aumento = inteiro(p.fomeDoDoador, 1, 5, 1);
      var dif = inteiro(p.potenciaDoDoador, 0, 10, pot) - pot;
      sacia = dif >= 2 ? aumento * 2 : dif <= -2 ? Math.floor(aumento / 2) : aumento;
      avisos.push("A Fome do doador sobe " + aumento + "; beber de outro vampiro pode gerar Laço de Sangue.");
    }
    var minimo = 0;
    if (!fonte.mata) minimo = Math.max(minimo, tab.minimoSemMatar);
    if (temVantagem(o, "sedeDoMatusalem") && !p.sobrenatural) minimo = Math.max(minimo, 1);
    var fomeFinal = Math.max(minimo, o.fome - sacia);
    if (meio) {
      var meios = o.fracaoDeFome + 1;
      fomeFinal = Math.max(minimo, o.fome - Math.floor(meios / 2));
    }
    if (fonte.danoNaVitima) escolhas.push({ tipo: "vitima", texto: "A vítima sofre " + sacia + " Agravado; sobrevive com Força + Vigor contra Dificuldade " + sacia + "." });
    if (fonte.mata) escolhas.push({ tipo: "matar", texto: "A vítima morre. É uma escolha, nunca um acaso: confirme." });
    if (temVantagem(o, "exclusaoDePresa")) escolhas.push({ tipo: "exclusao", texto: "Se a presa é da classe excluída, gera Máculas como violar um Princípio." });
    return {
      ok: true, fonte: p.fonte, sacia: sacia, meio: meio, minimo: minimo, fomeAntes: o.fome, fomeFinal: fomeFinal,
      custos: custos, avisos: avisos, escolhas: escolhas, tempo: fonte.tempo, ressonancia: fonte.ressonancia,
    };
  }

  /* Alimentar-se de verdade, com as escolhas confirmadas. */
  function alimentar(o, pedido, rolador) {
    var p = pedido || {};
    var plano = planejarAlimentacao(o, p);
    if (!plano.ok) return plano;
    var fonte = C.FONTES_DE_SANGUE[p.fonte];
    if (fonte.mata && !p.confirmarMorte) return falha("Matar a vítima precisa ser confirmado.", { plano: plano });
    var eventos = [];
    plano.custos.forEach(function (c) { if (c.tipo === "forcaDeVontade") eventos = eventos.concat(gastarForcaDeVontade(o, c.valor, c.motivo).eventos); });
    var antes = o.fome;
    if (plano.meio) {
      o.fracaoDeFome += 1;
      if (o.fracaoDeFome >= 2) { o.fracaoDeFome = 0; o.fome = Math.max(plano.minimo, o.fome - 1); }
    } else {
      o.fome = Math.max(plano.minimo, o.fome - plano.sacia);
    }
    var saciou = antes - o.fome;
    eventos.push(evento("alimentacao", { fonte: p.fonte, de: antes, para: o.fome, saciou: saciou }));
    if (p.exclusao) eventos = eventos.concat(adicionarMaculas(o, inteiro(p.maculasExclusao, 1, 3, 1), "Presa excluída").eventos);
    /* A vítima: dano e a chance de sobreviver (rolada aqui, para a mesa). */
    if (fonte.danoNaVitima) {
      var vit = { dano: plano.sacia };
      if (p.vitimaForcaVigor !== undefined) {
        var rv = D.rolar({ parada: Math.max(1, inteiro(p.vitimaForcaVigor, 1, 20)), tipo: "trilha", dificuldade: plano.sacia, rotulo: "A vítima sobrevive?" }, rolador);
        D.concluir(rv);
        vit.sobreviveu = rv.classificacao.vitoria;
        vit.sucessos = rv.classificacao.sucessos;
      }
      eventos.push(evento("vitima", vit));
    }
    if (fonte.mata) eventos.push(evento("vitimaMorta", { nota: texto(p.nota, 200) }));
    /* Ressonância: saciar ≥1 prende o efeito; ensacado zera. */
    if (saciou > 0 || fonte.ensacado) {
      eventos = eventos.concat(expirarPor(o, "alimentacao"));
      if (fonte.ressonancia === "animal") eventos = eventos.concat(definirRessonancia(o, { tipo: "animal", temperamento: "efemero", fonte: p.fonte }));
      else if (fonte.ressonancia === "nenhuma") eventos = eventos.concat(definirRessonancia(o, null));
      else if (p.ressonancia && p.ressonancia.tipo) eventos = eventos.concat(definirRessonancia(o, Object.assign({ fonte: p.fonte }, p.ressonancia)));
    }
    /* Compulsão de Fome termina ao saciar; frenesi de fome com Fome ≤ 1. */
    if (saciou > 0 && o.estado.compulsao && !o.estado.compulsao.cla && o.estado.compulsao.chave === "fome") eventos = eventos.concat(encerrarCompulsao(o, "Saciou").eventos);
    if (o.estado.frenesi && o.estado.frenesi.tipo === "fome" && o.fome <= 1) eventos = eventos.concat(encerrarFrenesi(o, "Fome 1 ou menos").eventos);
    /* Laço: beber de outro vampiro (p. 233). */
    if (fonte.vampiro && p.doador) eventos = eventos.concat(beberDeVampiro(o, p.doador, p.doadorNome).eventos);
    registrarNoHistorico(o, evento("alimentacao", { fonte: p.fonte, saciou: saciou }));
    return { ok: true, eventos: eventos, plano: plano, saciou: saciou };
  }

  /* O doador (outra ficha) — chamado pelo servidor na operação entre
     duas fichas: a Fome dele sobe. */
  function doarSangue(o, pontos) {
    var antes = o.fome;
    var eventos = aumentarFome(o, inteiro(pontos, 1, 5, 1), "Doou sangue");
    return { ok: true, eventos: eventos, de: antes, para: o.fome };
  }

  /* Caçada (p. 306–308): a parada do Predador contra a Dificuldade do
     território (ou do Chasse). */
  function paradaDeCaca(o, alternativa) {
    var p = C.PREDADORES[o.predador];
    var par = p ? p.parada[inteiro(alternativa, 0, 2, 0)] || p.parada[0] : ["raciocinio", "manha"];
    var pedido = { atributo: par[0], contexto: ["caca"] };
    if (C.habilidade(par[1])) pedido.habilidade = par[1];
    else if (C.VANTAGENS[par[1]]) pedido.modificadores = [{ fonte: C.VANTAGENS[par[1]].nome, valor: pontosDeVantagem(o, par[1]) }];
    if (temVantagem(o, "predadorManifesto")) pedido.modificadores = lista(pedido.modificadores).concat([{ fonte: "Predador Manifesto", valor: -2 }]);
    return pedido;
  }
  function dificuldadeDeCaca(territorio, mods, chasse) {
    if (chasse) return C.dificuldadeDeCacaDoChasse(chasse);
    var t = C.TERRITORIOS_DE_CACA.filter(function (x) { return x.chave === territorio; })[0];
    var d = t ? t.dificuldade : 4;
    lista(mods).forEach(function (m) { var x = C.MODIFICADORES_DE_CACA.filter(function (y) { return y.chave === m; })[0]; if (x) d += x.valor; });
    return Math.max(1, d);
  }

  /* ---------------------------------------------------------------
     LAÇOS DE SANGUE (p. 233–234)
     --------------------------------------------------------------- */

  function beberDeVampiro(o, reinanteId, nome) {
    if (temVantagem(o, "aProvaDeLaco")) return { ok: true, eventos: [evento("laco", { imune: true })] };
    var l = o.lacos.filter(function (x) { return x.reinanteId === reinanteId; })[0];
    if (!l) { l = { id: novoId("la"), reinante: texto(nome, 120), reinanteId: texto(reinanteId, 80), forca: 0, noites: [], ultimaNoite: 0 }; o.lacos.push(l); }
    var noite = String(o.tempo.noite);
    if (l.noites.indexOf(noite) >= 0) return { ok: true, eventos: [evento("laco", { reinante: l.reinante, forca: l.forca, mesmaNoite: true })] };
    l.noites.push(noite);
    l.noites = l.noites.slice(-6);
    l.ultimaNoite = o.tempo.noite;
    l.forca = Math.min(6, l.forca + (temVantagem(o, "escravoDoLaco") && l.forca < 3 ? 3 : 1));
    var eventos = [evento("laco", { reinante: l.reinante, forca: l.forca, completo: l.forca >= 3 })];
    if (l.forca >= 3) {
      /* Um escravo só tem um reinante: o Laço mais antigo se desfaz. */
      o.lacos.forEach(function (x) { if (x !== l && x.forca >= 3) { x.forca = 0; eventos.push(evento("lacoDesfeito", { reinante: x.reinante })); } });
    }
    return { ok: true, eventos: eventos };
  }

  /* Desafiar o reinante: Determinação + Inteligência contra a Força do
     Laço (Resistência ao Laço soma; Viciado em Laço subtrai). */
  function paradaContraLaco(o) {
    var comp = [{ fonte: "Determinação", valor: valorDeAtributo(o, "determinacao") }, { fonte: "Inteligência", valor: valorDeAtributo(o, "inteligencia") }];
    var r = pontosDeVantagem(o, "resistenciaAoLaco");
    if (r) comp.push({ fonte: "Resistência ao Laço", valor: r });
    if (temVantagem(o, "viciadoEmLaco")) comp.push({ fonte: "Viciado em Laço", valor: -1 });
    return { total: Math.max(1, comp.reduce(function (s, x) { return s + x.valor; }, 0)), composicao: comp };
  }

  /* Um mês sem beber: cada Laço perde força (p. 233). */
  function enfraquecerLacos(o, meses) {
    var n = inteiro(meses, 1, 120, 1), eventos = [];
    var fator = temVantagem(o, "lacoCurto") ? 2 : temVantagem(o, "lacoLongo") ? 1 / 3 : 1;
    o.lacos.forEach(function (l) {
      var perde = Math.floor(n * fator);
      if (!perde) return;
      var antes = l.forca;
      l.forca = Math.max(0, l.forca - perde);
      if (l.forca !== antes) eventos.push(evento("lacoEnfraquecido", { reinante: l.reinante, de: antes, para: l.forca }));
    });
    o.lacos = o.lacos.filter(function (l) { return l.forca > 0; });
    return { ok: true, eventos: eventos };
  }

  /* ---------------------------------------------------------------
     DIABLERIE (p. 234–235) — em etapas, nunca um botão de ganho
     --------------------------------------------------------------- */

  /* Etapa de drenar a centelha: Força + Determinação, Dif 3, um teste
     por turno; precisa de tantos sucessos (vitórias) quanto a Potência
     da vítima. Uma falha apaga a centelha (Morte Final, sem diablerie). */
  function diablerieTurno(o, estado, rolador) {
    var e = estado || { vitorias: 0, encerrada: false };
    if (e.encerrada) return falha("A Diablerie já terminou.");
    var r = rolarTeste(o, { atributo: "forca", atributo2: "determinacao", dificuldade: 3, rotulo: "Diablerie: drenar a alma" }, rolador);
    if (!r.ok) return r;
    D.concluir(r.resultado);
    var ok = r.resultado.classificacao.vitoria;
    if (!ok) { e.encerrada = true; e.apagada = true; }
    else { e.vitorias++; if (e.vitorias >= inteiro(e.potenciaDaVitima, 1, 10, 1)) { e.encerrada = true; e.consumada = true; } }
    return { ok: true, estado: e, resultado: r.resultado, eventos: [evento("diablerieTurno", { vitoria: ok, vitorias: e.vitorias, consumada: !!e.consumada, apagada: !!e.apagada })] };
  }

  /* Consumada: −1 Humanidade; disputa Humanidade + Potência contra
     Determinação + Potência da vítima; vitória: 5 XP por sucesso para
     Potência (até a da vítima) ou Disciplinas dela; derrota: −1
     Humanidade por sucesso faltante. Geração cai se a vítima era de
     geração menor. A XP fica como crédito restrito. */
  function diablerieConsumada(o, vitima, rolador) {
    var v = vitima || {};
    var eventos = mudarHumanidade(o, -1, "diablerie", "Diablerie").eventos;
    var minha = Math.max(1, humanidade(o) + potencia(o));
    var dela = Math.max(1, inteiro(v.determinacao, 0, 10, 2) + inteiro(v.potencia, 0, 10, 1));
    var ra = D.rolar({ parada: minha, tipo: "trilha", rotulo: "Diablerie: a alma" }, rolador);
    var rb = D.rolar({ parada: dela, tipo: "trilha", rotulo: "A vítima resiste" }, rolador);
    D.concluir(ra); D.concluir(rb);
    var a = ra.classificacao.sucessos, b = rb.classificacao.sucessos;
    if (a >= b) {
      var credito = { id: novoId("dx"), valor: 5 * Math.max(0, a - b), restrito: { potenciaAte: inteiro(v.potencia, 0, 10), disciplinas: lista(v.disciplinas).slice(0, 10) }, motivo: "Diablerie" };
      o.xp.creditos = Object.assign({}, o.xp.creditos);
      o.xp.creditos[credito.id] = credito;
      eventos.push(evento("diablerieVenceu", { sucessos: a, vitima: b, xp: credito.valor }));
    } else {
      for (var i = 0; i < b - a; i++) eventos = eventos.concat(mudarHumanidade(o, -1, "diablerie", "A alma resistiu").eventos);
      eventos.push(evento("diablerieResistida", { faltaram: b - a }));
    }
    if (v.geracao && inteiro(v.geracao, 4, 16) < o.geracao) {
      var antes = o.geracao;
      o.geracao = ehSangueRalo(o) ? 13 : o.geracao - 1;
      eventos.push(evento("geracao", { de: antes, para: o.geracao }));
    }
    o.ajustes.push({ id: novoId("aj"), tipo: "marca", alvo: "veiasNegras", valor: 0, origem: "diablerie", motivo: "Veias negras na aura (1 ano, ou anos = diferença de gerações)", noite: o.tempo.noite });
    return { ok: true, eventos: eventos, resultados: [ra, rb] };
  }

  /* ---------------------------------------------------------------
     EXPERIÊNCIA (p. 130, 137, 151)
     --------------------------------------------------------------- */

  function disciplinasDoCla(o) { return (C.CLAS[o.cla] || { disciplinas: [] }).disciplinas; }

  function custoDeNivel(o, tipo, alvo, nivel) {
    var n = inteiro(nivel, 1, 10);
    if (tipo === "atributo") return 5 * n;
    if (tipo === "habilidade") return 3 * n;
    if (tipo === "potencia") return 10 * n;
    if (tipo === "humanidade") return 10 * n;
    if (tipo === "disciplina") {
      if (o.cla === "caitiff") return 6 * n;
      if (alvo === "alquimia" && ehSangueRalo(o)) return 5 * n;
      return disciplinasDoCla(o).indexOf(alvo) >= 0 ? 5 * n : 7 * n;
    }
    return 0;
  }

  /* Custo de subir de `de` para `para`: CADA nível intermediário. */
  function custoDeCompra(o, tipo, alvo, de, para) {
    var total = 0;
    for (var n = inteiro(de, 0, 10) + 1; n <= inteiro(para, 0, 10); n++) total += custoDeNivel(o, tipo, alvo, n);
    return total;
  }

  function valorAtual(o, tipo, alvo) {
    if (tipo === "atributo") return valorDeAtributo(o, alvo);
    if (tipo === "habilidade") return valorDeHabilidade(o, alvo);
    if (tipo === "disciplina") return somarCamadas(o, "disciplina", alvo, o.disciplinas[alvo] || 0, concessoes(o)).valor;
    if (tipo === "potencia") return potencia(o);
    if (tipo === "humanidade") return humanidade(o);
    return 0;
  }

  /* Comprar com experiência. `p`: { tipo, alvo, para, nome (especialização),
     poderes [chaves, um por nível novo], ressonancia (confirmada),
     sangueProvado (fora do clã), autorizado (Narrador) }. */
  function validarCompra(o, p) {
    var tipo = p.tipo, alvo = p.alvo;
    var xp = xpTotal(o) - xpGasto(o);
    var creditos = creditosAplicaveis(o, p);
    var de, para, custo;
    if (["atributo", "habilidade", "disciplina", "potencia", "humanidade"].indexOf(tipo) >= 0) {
      de = valorAtual(o, tipo, alvo);
      para = inteiro(p.para, 0, 10);
      if (para <= de) return falha("O novo valor precisa ser maior que o atual (" + de + ").");
      if (tipo === "atributo" && !C.atributo(alvo)) return falha("Atributo desconhecido.");
      if (tipo === "habilidade" && !C.habilidade(alvo)) return falha("Habilidade desconhecida.");
      if ((tipo === "atributo" || tipo === "habilidade" || tipo === "disciplina") && para > 5) return falha("O máximo é 5.");
      if (tipo === "habilidade" && pontosLimite(o, alvo) !== null && para > pontosLimite(o, alvo)) return falha("Um Defeito limita esta Habilidade.");
      if (tipo === "potencia") {
        if (ehSangueRalo(o)) return falha("Sangue-ralo nunca aumenta a Potência (salvo Diablerie).");
        var lim = limitesDePotencia(o);
        if (para > lim[1]) return falha("A geração " + o.geracao + " permite Potência até " + lim[1] + ".");
      }
      if (tipo === "humanidade" && !p.autorizado) return falha("Humanidade só sobe com um arco narrativo e a autorização do Narrador (p. 241).");
      if (tipo === "disciplina") {
        var def = DS().DISCIPLINAS[alvo];
        if (!def) return falha("Disciplina desconhecida.");
        if (def.soSangueRalo && !ehSangueRalo(o)) return falha("Alquimia é dos sangues-ralos.");
        if (ehSangueRalo(o) && alvo !== "alquimia" && !(temQualidadeRalo(o, "afinidadeComDisciplina") && de > 0)) return falha("Sangue-ralo não compra Disciplinas (salvo Afinidade com Disciplina).");
        if (!p.ressonancia && !(o.ressonancia && C.RESSONANCIAS[o.ressonancia.tipo].disciplinas.indexOf(alvo) >= 0) && alvo !== "alquimia") return falha("Alimente-se da Ressonância correspondente antes (p. 231), ou confirme que o fez.");
        if (o.cla !== "caitiff" && disciplinasDoCla(o).indexOf(alvo) < 0 && !ehSangueRalo(o) && !p.sangueProvado) return falha("Uma Disciplina fora do clã exige provar o Sangue de quem a possua (p. 231).");
        var novos = lista(p.poderes);
        if (novos.length !== para - de) return falha("Escolha um poder para cada nível novo.");
        for (var i = 0; i < novos.length; i++) {
          var pode = podeAdquirirPoder(o, novos[i], { disciplina: alvo, nivel: de + i + 1, jaEscolhidos: novos.slice(0, i) });
          if (!pode.ok) return pode;
        }
      }
      custo = custoDeCompra(o, tipo, alvo, de, para);
    } else if (tipo === "especializacao") {
      var hab = valorDeHabilidade(o, alvo);
      if (!hab) return falha("Precisa de ao menos 1 ponto na Habilidade.");
      var atuais = especializacoesDaFicha(o).filter(function (e) { return e.habilidade === alvo; }).length;
      var h = C.habilidade(alvo);
      if (!(h && h.semLimiteDeEspecializacoes) && atuais >= hab) return falha("Especializações: no máximo o valor da Habilidade (p. 159).");
      if (!texto(p.nome, 80).trim()) return falha("Dê nome à especialização.");
      de = atuais; para = atuais + 1; custo = C.CUSTOS_XP.especializacao.fixo;
    } else if (tipo === "vantagem") {
      var vdef = C.VANTAGENS[alvo];
      if (!vdef || vdef.tipo === "defeito") return falha("Escolha uma Qualidade ou um Antecedente.");
      de = pontosDeVantagem(o, alvo); para = inteiro(p.para, 1, 10);
      if (para <= de) return falha("O novo valor precisa ser maior.");
      if (vdef.niveis.indexOf(para) < 0 && !vdef.porNivel) return falha("Nível inexistente para esta Vantagem.");
      if (vdef.proibidoPara && vdef.proibidoPara.indexOf(o.cla) >= 0) return falha(vdef.nome + " não é permitido para " + C.CLAS[o.cla].nome + ".");
      custo = (para - de) * C.CUSTOS_XP.vantagem.porPonto;
    } else if (tipo === "ficha") {
      /* Cada nível é independente: não exige nem concede os anteriores. */
      var fdef = C.FICHAS_DE_CONHECIMENTO[alvo];
      if (!fdef) return falha("Ficha de Conhecimento desconhecida.");
      para = inteiro(p.para, 1, 5, 1); de = 0;
      if (fdef.cla && fdef.cla !== o.cla) return falha(fdef.nome + " é exclusiva do clã " + C.CLAS[fdef.cla].nome + ".");
      if (o.fichas.some(function (x) { return x.ficha === alvo && x.nivel === para; })) return falha("Já tem este nível.");
      custo = para * C.CUSTOS_XP.vantagem.porPonto;
    } else if (tipo === "ritual" || tipo === "formula") {
      var rdef = tipo === "ritual" ? DS().ritual(alvo) : DS().poder(alvo);
      if (!rdef || (tipo === "formula" && !rdef.formula)) return falha("Desconhecido.");
      var lim2 = valorDeDisciplina(o, tipo === "ritual" ? "feiticaria" : "alquimia");
      if (rdef.nivel > lim2) return falha("Precisa de " + (tipo === "ritual" ? "Feitiçaria de Sangue" : "Alquimia") + " " + rdef.nivel + ".");
      var lst = tipo === "ritual" ? o.rituais : o.formulas;
      if (lst.some(function (x) { return x.chave === alvo; })) return falha("Já conhece.");
      de = 0; para = rdef.nivel; custo = rdef.nivel * 3;
    } else {
      return falha("Tipo de compra desconhecido.");
    }
    var desconto = Math.min(custo, creditos.total);
    if (custo - desconto > xp) return falha("Experiência insuficiente: custa " + custo + (desconto ? " (crédito " + desconto + ")" : "") + ", há " + xp + ".");
    return { ok: true, de: de, para: para, custo: custo, desconto: desconto, creditos: creditos.usados };
  }

  function pontosLimite(o, habilidade) {
    var lim = null;
    vantagensDaFicha(o).forEach(function (v) {
      var ef = (C.VANTAGENS[v.chave] || {}).efeito;
      if (ef && ef.limiteHabilidade && ef.limiteHabilidade[habilidade] !== undefined) lim = lim === null ? ef.limiteHabilidade[habilidade] : Math.min(lim, ef.limiteHabilidade[habilidade]);
    });
    return lim;
  }

  /* Créditos de XP restritos (Discrasias Energético/Evocador/…,
     Diablerie): só valem para o que dizem. */
  function creditosAplicaveis(o, p) {
    var cr = objeto(o.xp.creditos), usados = [], total = 0;
    Object.keys(cr).forEach(function (k) {
      var c = cr[k];
      if (!c || !(c.valor > 0)) return;
      var r = objeto(c.restrito);
      var vale = (p.tipo === "disciplina" && lista(r.disciplinas).indexOf(p.alvo) >= 0) ||
        (p.tipo === "potencia" && r.potenciaAte !== undefined && inteiro(p.para, 0, 10) <= r.potenciaAte);
      if (vale) { usados.push(k); total += c.valor; }
    });
    return { total: total, usados: usados };
  }

  function comprar(o, p) {
    var v = validarCompra(o, p || {});
    if (!v.ok) return v;
    var compra = { id: novoId("cp"), tipo: p.tipo, alvo: p.alvo, de: v.de, para: v.para, custo: v.custo - v.desconto, credito: v.desconto, nome: texto(p.nome, 120), poderes: lista(p.poderes).slice(0, 10), noite: o.tempo.noite };
    /* Consumir créditos usados. */
    var falta = v.desconto;
    v.creditos.forEach(function (k) { var c = o.xp.creditos[k]; var usa = Math.min(c.valor, falta); c.valor -= usa; falta -= usa; if (c.valor <= 0) delete o.xp.creditos[k]; });
    var eventos = [];
    if (p.tipo === "especializacao") {
      o.especializacoes.push({ id: novoId("es"), habilidade: p.alvo, nome: texto(p.nome, 80), origem: "xp" });
      compra.de = 0; compra.para = 0; compra.tipo = "especializacao";
    } else if (p.tipo === "vantagem") {
      var existente = o.vantagens.filter(function (x) { return x.chave === p.alvo && x.origem === "xp"; })[0];
      if (existente) existente.pontos = v.para - (v.de - existente.pontos);
      else o.vantagens.push({ id: novoId("va"), chave: p.alvo, pontos: v.para - v.de, nota: texto(p.nome, 200), parametro: "", relacaoId: "", origem: "xp", compartilhada: false });
      compra.tipo = "vantagemComprada";
    } else if (p.tipo === "ficha") {
      o.fichas.push({ id: novoId("fc"), ficha: p.alvo, nivel: v.para, origem: "xp" });
      compra.tipo = "fichaComprada";
    } else if (p.tipo === "ritual") {
      o.rituais.push({ id: novoId("ri"), chave: p.alvo, origem: "xp" });
      compra.tipo = "ritualAprendido";
    } else if (p.tipo === "formula") {
      o.formulas.push({ id: novoId("fo"), chave: p.alvo, origem: "xp" });
      compra.tipo = "formulaAprendida";
    } else if (p.tipo === "disciplina") {
      lista(p.poderes).forEach(function (k) { o.poderes.push({ id: novoId("po"), chave: k, origem: "xp" }); });
    }
    o.compras.push(compra);
    eventos.push(evento("compra", { compra: p.tipo, alvo: p.alvo, de: v.de, para: v.para, custo: compra.custo, credito: v.desconto }));
    return { ok: true, eventos: eventos, compra: compra };
  }

  function receberXP(o, valor, motivo) {
    var n = inteiro(valor, -999, 999, 0);
    o.xp.recebido = Math.max(0, o.xp.recebido + n);
    o.xp.historico.push({ id: novoId("xp"), valor: n, motivo: texto(motivo, 200), noite: o.tempo.noite });
    o.xp.historico = o.xp.historico.slice(-200);
    return { ok: true, eventos: [evento("xp", { valor: n, motivo: texto(motivo, 200) })] };
  }

  /* ---------------------------------------------------------------
     PODERES: aquisição e requisitos (p. 244)
     --------------------------------------------------------------- */

  /* Ter pontos não dá todos os poderes: um por ponto, de nível ≤ ao
     valor, com amálgamas e pré-requisitos. */
  function podeAdquirirPoder(o, chave, contexto) {
    var x = contexto || {};
    var def = DS().poder(chave);
    if (!def) return falha("Poder desconhecido.");
    var disc = x.disciplina || def.disciplina;
    if (def.disciplina !== disc) return falha(def.nome + " é de " + DS().DISCIPLINAS[def.disciplina].nome + ".");
    var nivel = x.nivel !== undefined ? x.nivel : valorDeDisciplina(o, disc);
    if (def.nivel > nivel) return falha(def.nome + " exige " + DS().DISCIPLINAS[disc].nome + " " + def.nivel + ".");
    var tem = poderesDaFicha(o).map(function (p) { return p.chave; }).concat(lista(x.jaEscolhidos));
    if (tem.indexOf(chave) >= 0) return falha("Já possui " + def.nome + ".");
    if (def.amalgama && valorDeDisciplina(o, def.amalgama.disciplina) < def.amalgama.nivel) return falha(def.nome + " exige " + DS().DISCIPLINAS[def.amalgama.disciplina].nome + " " + def.amalgama.nivel + " (amálgama).");
    if (def.prereq && tem.indexOf(def.prereq) < 0) return falha(def.nome + " exige " + DS().poder(def.prereq).nome + ".");
    if (def.formula) return falha("Fórmulas se aprendem à parte.");
    return { ok: true };
  }

  /* Os requisitos de um poder que a ficha JÁ tem (criação: o clã ou o
     Predador podem ter mudado depois da escolha): nível, amálgama e
     pré-requisito. */
  function requisitosDoPoder(o, chave, conc) {
    var def = DS().poder(chave);
    if (!def) return falha("Poder desconhecido.");
    if (def.formula) return { ok: true };
    var c = conc || concessoes(o);
    if (valorDeDisciplina(o, def.disciplina, c) < def.nivel) return falha(def.nome + " exige " + DS().DISCIPLINAS[def.disciplina].nome + " " + def.nivel + ".");
    if (def.amalgama && valorDeDisciplina(o, def.amalgama.disciplina, c) < def.amalgama.nivel) return falha(def.nome + " exige " + DS().DISCIPLINAS[def.amalgama.disciplina].nome + " " + def.amalgama.nivel + " (amálgama).");
    if (def.prereq && !poderesDaFicha(o, c).some(function (p) { return p.chave === def.prereq; })) return falha(def.nome + " exige " + DS().poder(def.prereq).nome + ".");
    return { ok: true };
  }

  /* Poderes que a ficha "deve" (um por ponto) e os que faltam escolher. */
  function poderesPendentes(o) {
    var conc = concessoes(o), out = [];
    Object.keys(DS().DISCIPLINAS).forEach(function (k) {
      if (k === "alquimia") return;
      var pontos = somarCamadas(o, "disciplina", k, o.disciplinas[k] || 0, conc).valor;
      var tem = poderesDaFicha(o, conc).filter(function (p) { var d = DS().poder(p.chave); return d && d.disciplina === k; }).length;
      if (pontos > tem) out.push({ disciplina: k, faltam: pontos - tem });
    });
    return out;
  }

  /* ---------------------------------------------------------------
     EFEITOS: adicionar, remover, expirar
     --------------------------------------------------------------- */

  function adicionarEfeito(o, e) {
    var ef = normalizarEfeito(Object.assign({ inicio: copiar(o.tempo) }, e));
    /* O mesmo efeito da mesma origem não se acumula: renova. */
    o.efeitos = o.efeitos.filter(function (x) { return !(x.chave === ef.chave && x.origem.tipo === ef.origem.tipo && x.origem.chave === ef.origem.chave); });
    o.efeitos.push(ef);
    return ef;
  }
  function removerEfeito(o, id) {
    var antes = o.efeitos.length;
    o.efeitos = o.efeitos.filter(function (e) { return e.id !== id; });
    return antes !== o.efeitos.length;
  }

  /* Expira o que termina num momento. Durações:
       turno          fim do turno
       cena, uso      fim da cena
       noite, horas   nova noite
       noiteSeguinte  a segunda nova noite (aspectos Gangrel)
       ateFome5       ao chegar a Fome 5
       alimentacao    na próxima alimentação */
  function expirarPor(o, momento) {
    var eventos = [];
    var fica = [];
    o.efeitos.forEach(function (e) {
      var sai = false;
      if (momento === "turno") sai = e.duracao === "turno";
      else if (momento === "cena") sai = ["turno", "cena", "uso"].indexOf(e.duracao) >= 0;
      else if (momento === "noite") {
        if (e.duracao === "noiteSeguinte") { if (o.tempo.noite - e.inicio.noite >= 2) sai = true; }
        else sai = ["turno", "cena", "uso", "noite", "horas", "dia"].indexOf(e.duracao) >= 0;
      }
      else if (momento === "fome5") sai = e.duracao === "ateFome5" || e.chave === "disciplinaDaRessonancia";
      else if (momento === "alimentacao") sai = e.duracao === "alimentacao" || e.duracao === "ateFome5";
      if (sai) eventos.push(evento("efeitoExpirou", { chave: e.chave, nome: e.nome || e.chave, momento: momento }));
      else fica.push(e);
    });
    o.efeitos = fica;
    /* A Ressonância e a Discrasia também acabam com Fome 5. */
    if (momento === "fome5" && o.ressonancia) { o.ressonancia = null; eventos.push(evento("ressonancia", { para: "", motivo: "Fome 5" })); }
    return eventos;
  }

  /* ---------------------------------------------------------------
     MOMENTOS — o tempo só anda por aqui
     --------------------------------------------------------------- */

  /* Início de sessão (p. 158). `continuaCena`: a sessão anterior parou
     no meio de uma cena de ação — a FdV fica como estava. NÃO é uma
     noite nova: o despertar é novaNoite(). */
  function inicioDaSessao(o, opcoes) {
    var x = opcoes || {};
    o.tempo.sessao++;
    o.marcas.sessao = {};
    var eventos = [evento("inicioDaSessao", { sessao: o.tempo.sessao, continuaCena: !!x.continuaCena })];
    if (!x.continuaCena) {
      var n = Math.max(valorDeAtributo(o, "autocontrole"), valorDeAtributo(o, "determinacao"));
      var curado = curarTrilha(o, "forcaDeVontade", "superficial", n);
      if (curado) eventos.push(evento("cura", { trilha: "forcaDeVontade", dano: "superficial", valor: curado }));
    }
    return { ok: true, eventos: eventos };
  }

  /* Fim de sessão: Ambição trabalhada → 1 Agravado de FdV; XP; Remorso
     de quem tem Máculas (a Degeneração acaba aqui). */
  function fimDaSessao(o, opcoes, rolador) {
    var x = opcoes || {};
    var eventos = [evento("fimDaSessao", { sessao: o.tempo.sessao })];
    if (x.ambicao) {
      var c = curarTrilha(o, "forcaDeVontade", "agravado", 1);
      eventos.push(evento("ambicao", { curado: c }));
    }
    if (x.xp) eventos = eventos.concat(receberXP(o, x.xp, x.motivoXP || "Sessão").eventos);
    if (o.maculas && rolador) {
      var r = testarRemorso(o, rolador);
      if (r.ok) eventos = eventos.concat(r.eventos);
    } else if (o.estado.degeneracao) {
      o.estado.degeneracao = false;
    }
    return { ok: true, eventos: eventos };
  }

  /* Desejo (p. 174): 1× por sessão, ao agir decididamente pelo Desejo,
     recupera 1 Superficial de FdV. A mesa confirma que aconteceu. */
  function cumprirDesejo(o) {
    if (o.marcas.sessao.desejo) return falha("O Desejo já recuperou Força de Vontade nesta sessão.");
    o.marcas.sessao.desejo = true;
    var c = curarTrilha(o, "forcaDeVontade", "superficial", 1);
    return { ok: true, eventos: [evento("desejo", { curado: c })] };
  }

  /* Recuperações a critério do Narrador (p. 158–159): Pilar ou
     Convicção contra os próprios interesses (Agravado), Compulsão ou
     frenesi bem interpretados (Superficial). */
  function recuperarFdV(o, tipo, valor, motivo) {
    var c = curarTrilha(o, "forcaDeVontade", tipo === "agravado" ? "agravado" : "superficial", inteiro(valor, 1, 10, 1));
    return { ok: true, eventos: [evento("cura", { trilha: "forcaDeVontade", dano: tipo, valor: c, motivo: texto(motivo, 200) })] };
  }

  /* Uma noite nova: o despertar (Checagem; Fome além de 5 → Torpor),
     efeitos da noite expiram, a estaca cobra, o Torpor conta. */
  function novaNoite(o, rolador, opcoes) {
    var x = opcoes || {};
    o.tempo.noite++;
    o.tempo.cena = 0; o.tempo.turno = 0;
    o.marcas.noite = {};
    o.marcas.cena = {};
    var eventos = [evento("novaNoite", { noite: o.tempo.noite })].concat(expirarPor(o, "noite"));
    if (o.estado.morteFinal || !ehVampiro(o)) return { ok: true, eventos: eventos };
    if (o.estado.torpor) {
      var t = o.estado.torpor;
      if (t.motivo === "dano" && o.vitalidade.agravado > 0) {
        /* Recupera 1 Vitalidade por noite; curado, desperta (p. 223). */
        curarTrilha(o, "vitalidade", "agravado", 1);
        eventos.push(evento("cura", { trilha: "vitalidade", dano: "agravado", valor: 1, torpor: true }));
        if (o.vitalidade.agravado < vitalidadeMaxima(o) && !o.estado.estacado) eventos = eventos.concat(despertarDoTorpor(o, "narrador").eventos);
      }
      return { ok: true, eventos: eventos };
    }
    if (x.semDespertar) return { ok: true, eventos: eventos };
    var r = checagemDeSangue(o, { motivo: o.estado.estacado ? "Pôr do sol (estacado)" : "Despertar", forcada: true, contexto: "despertar" }, rolador);
    if (r.ok) eventos = eventos.concat(r.eventos);
    o.estado.dormindo = false;
    return { ok: true, eventos: eventos };
  }

  function novaCena(o) {
    o.tempo.cena++;
    o.tempo.turno = 0;
    o.marcas.cena = {};
    return { ok: true, eventos: [evento("novaCena", { cena: o.tempo.cena })] };
  }

  /* Fim da cena: efeitos da cena expiram; frenesi e Compulsões de cena
     terminam; a Perdição Malkaviana também. */
  function fimDaCena(o) {
    var eventos = [evento("fimDaCena", { cena: o.tempo.cena })].concat(expirarPor(o, "cena"));
    if (o.estado.frenesi) eventos = eventos.concat(encerrarFrenesi(o, "Fim da cena").eventos);
    var c = o.estado.compulsao;
    if (c) {
      var def = c.cla ? (C.CLAS[o.cla] || {}).compulsao : C.COMPULSOES[c.chave];
      if (def && def.duracao === "cena") eventos = eventos.concat(encerrarCompulsao(o, "Fim da cena").eventos);
    }
    if (o.estado.wassail) o.efeitos = o.efeitos.filter(function (e) { return e.chave !== "ultimaGota"; });
    return { ok: true, eventos: eventos };
  }

  function fimDoTurno(o) {
    o.tempo.turno++;
    return { ok: true, eventos: [evento("fimDoTurno", { turno: o.tempo.turno })].concat(expirarPor(o, "turno")) };
  }

  /* ---------------------------------------------------------------
     CRIAÇÃO (p. 135–154) — validação e pendências
     --------------------------------------------------------------- */

  function multiconjunto(valores) { return valores.slice().sort(function (a, b) { return b - a; }).join(","); }

  function validarCriacao(o) {
    var pend = [], conc = concessoes(o);
    function falta(etapa, t) { pend.push({ etapa: etapa, texto: t }); }
    if (!ehVampiro(o)) return { pendencias: [], regular: true, excecoes: [] };
    var ralo = ehSangueRalo(o);
    if (!texto(o.conceito).trim()) falta(1, "Defina o conceito.");
    if (!o.cla) falta(2, "Escolha o clã (ou Caitiff, ou Sangue-Ralo).");
    if (o.cla && o.cla !== "caitiff" && !ralo && !texto(o.senhor).trim()) falta(3, "Registre o Senhor (pode ser desconhecido).");
    var idade = C.IDADES[o.idade];
    if (ralo) { if (o.geracao < 14) falta(3, "Sangue-ralo é da 14ª à 16ª geração."); }
    else if (idade && idade.geracoes.indexOf(o.geracao) < 0) falta(3, idade.nome + ": geração " + idade.geracoes.join(" ou ") + ".");
    if (o.cla === "malkaviano" && ["fisico", "social", "mental"].indexOf(o.perdicaoParametro) < 0) falta(2, "Malkaviano: escolha a categoria afligida pela Perdição.");
    if (o.cla === "ventrue" && !texto(o.perdicaoParametro).trim()) falta(2, "Ventrue: defina a presa preferida.");
    /* Atributos 4/3/3/3/2/2/2/2/1. */
    var atr = C.ATRIBUTOS.map(function (a) { return o.atributos[a.chave] || 0; });
    if (multiconjunto(atr) !== multiconjunto(C.DISTRIBUICAO_DE_ATRIBUTOS)) falta(4, "Atributos: um com 4, três com 3, quatro com 2 e um com 1.");
    /* Habilidades pela distribuição escolhida. */
    var dist = C.DISTRIBUICOES_DE_HABILIDADES[o.criacao.distribuicao];
    if (!dist) falta(5, "Escolha a distribuição de Habilidades.");
    else {
      var hab = C.HABILIDADES.map(function (h) { return o.habilidades[h.chave] || 0; }).filter(Boolean);
      if (multiconjunto(hab) !== multiconjunto(dist.valores)) falta(5, dist.nome + ": " + resumoDist(dist.valores) + ".");
    }
    /* Especializações: grátis nas quatro, + 1 livre (+ a do Predador). */
    var esps = o.especializacoes;
    ["erudicao", "oficios", "performance", "ciencia"].forEach(function (k) {
      if (o.habilidades[k] && !esps.some(function (e) { return e.habilidade === k && e.origem === "gratis"; })) falta(5, (C.habilidade(k) || {}).nome + " precisa da especialização gratuita.");
    });
    var livres = esps.filter(function (e) { return e.origem === "criacao"; }).length;
    if (livres !== 1) falta(5, "Uma especialização livre (há " + livres + ").");
    esps.forEach(function (e) { if (!(valorDeHabilidade(o, e.habilidade, conc) > 0)) falta(5, "Especialização em " + (C.habilidade(e.habilidade) || {}).nome + " sem pontos na Habilidade."); });
    /* A mesma especialização duas vezes (a livre igual à do Predador)
       não soma nada: é pendência. */
    var vistas = {};
    especializacoesDaFicha(o, conc).forEach(function (e) {
      var k = e.habilidade + "|" + texto(e.nome).trim().toLowerCase();
      if (vistas[k]) falta(5, "Especialização repetida: " + (C.habilidade(e.habilidade) || {}).nome + " (" + e.nome + ").");
      vistas[k] = true;
    });
    /* Disciplinas. */
    var discs = Object.keys(o.disciplinas).filter(function (k) { return o.disciplinas[k] > 0; });
    var vals = discs.map(function (k) { return o.disciplinas[k]; });
    if (ralo) {
      var alq = temQualidadeRalo(o, "alquimista") ? 1 : 0;
      if (discs.some(function (k) { return k !== "alquimia"; })) falta(6, "Sangue-ralo não tem Disciplinas intrínsecas.");
      if ((o.disciplinas.alquimia || 0) !== alq) falta(6, alq ? "Alquimista Sangue-Ralo: 1 ponto em Alquimia." : "Alquimia só com a Qualidade Alquimista Sangue-Ralo.");
      if (alq && !o.metodoAlquimia) falta(6, "Escolha o método de Alquimia.");
      if (alq && o.formulas.filter(function (f) { return f.origem === "criacao"; }).length !== 1) falta(6, "Alquimista: uma fórmula de nível 1.");
    } else if (o.cla) {
      if (multiconjunto(vals) !== "2,1") falta(6, "Disciplinas: 2 pontos numa e 1 noutra.");
      if (o.cla !== "caitiff" && discs.some(function (k) { return disciplinasDoCla(o).indexOf(k) < 0; })) falta(6, "As Disciplinas da criação são as do clã.");
      if (discs.indexOf("alquimia") >= 0) falta(6, "Alquimia é dos sangues-ralos.");
    }
    poderesPendentes(o).forEach(function (x) { falta(6, "Escolha " + x.faltam + " poder(es) de " + DS().DISCIPLINAS[x.disciplina].nome + "."); });
    poderesDaFicha(o, conc).forEach(function (p) {
      var req = requisitosDoPoder(o, p.chave, conc);
      if (!req.ok) falta(p.origem === "predador" ? 7 : 6, req.motivo);
    });
    if (o.disciplinas.feiticaria && !o.rituais.some(function (r) { return r.origem === "criacao" && DS().ritual(r.chave).nivel === 1; })) falta(6, "Feitiçaria de Sangue: escolha um Ritual de nível 1.");
    /* Predador. */
    var semPredador = ralo || o.criacao.semPredador;
    if (!semPredador) {
      var p = C.PREDADORES[o.predador];
      if (!p) falta(7, "Escolha o tipo de Predador.");
      else {
        if (p.proibidoPara && p.proibidoPara.indexOf(o.cla) >= 0) falta(7, p.nome + " não é permitido para " + C.CLAS[o.cla].nome + ".");
        if (p.potenciaMaxima !== undefined && potencia(o, conc) > p.potenciaMaxima) falta(7, p.nome + ": Potência até " + p.potenciaMaxima + ".");
        if (o.criacao.predador.especializacao < 0) falta(7, "Escolha a especialização do Predador.");
        if (!o.criacao.predador.disciplina) falta(7, "Escolha a Disciplina do Predador.");
        else if (!predadorDisciplinaPermitida(o, p, o.criacao.predador.disciplina)) falta(7, "Essa Disciplina do Predador é só para Tremere.");
        else if (!o.criacao.predador.poder) falta(7, "Escolha o poder do ponto do Predador.");
        lista(p.escolhas).forEach(function (esco, i) {
          var feito = o.criacao.predador.escolhas[String(i)];
          if (esco.tipo === "defeitoUnico") { if (!feito) falta(7, "Escolha um dos Defeitos do Predador."); }
          else {
            var soma = feito && typeof feito === "object" ? Object.keys(feito).reduce(function (s, k) { return s + inteiro(feito[k], 0, 10); }, 0) : 0;
            if (soma !== esco.pontos) falta(7, "Reparta " + esco.pontos + " pontos (" + esco.entre.join(" / ") + ").");
          }
        });
      }
    }
    /* Vantagens: 7 pontos (+2 ancilla); Defeitos: 2 (+2 ancilla), além dos do Predador. */
    var extra = idade && !ralo ? idade.vantagens : 0;
    var extraDef = idade && !ralo ? idade.defeitos : 0;
    var qual = o.vantagens.filter(function (v) { return v.origem === "criacao" && C.VANTAGENS[v.chave].tipo !== "defeito"; }).reduce(function (s, v) { return s + v.pontos; }, 0);
    var defe = o.vantagens.filter(function (v) { return v.origem === "criacao" && C.VANTAGENS[v.chave].tipo === "defeito"; }).reduce(function (s, v) { return s + v.pontos; }, 0);
    qual += o.fichas.filter(function (x) { return x.origem === "criacao"; }).reduce(function (s, x) { return s + x.nivel; }, 0);
    o.fichas.forEach(function (x) {
      var fd = C.FICHAS_DE_CONHECIMENTO[x.ficha];
      if (fd.cla && fd.cla !== o.cla) falta(8, fd.nome + " é exclusiva do clã " + C.CLAS[fd.cla].nome + ".");
    });
    if (qual !== 7 + extra) falta(8, "Vantagens: " + (7 + extra) + " pontos (há " + qual + ").");
    if (defe !== 2 + extraDef) falta(8, "Defeitos: " + (2 + extraDef) + " pontos além dos do Predador (há " + defe + ").");
    o.vantagens.forEach(function (v) {
      var def = C.VANTAGENS[v.chave];
      if (def.proibidoPara && def.proibidoPara.indexOf(o.cla) >= 0) falta(8, def.nome + " não é permitido para " + C.CLAS[o.cla].nome + ".");
      if (def.requisito && def.requisito.idadeMinima === "ancilla" && o.idade !== "ancilla") falta(8, def.nome + " só para ancillae.");
      if (ralo && ["status", "mawla", "lacaios"].indexOf(v.chave) >= 0 && !v.compartilhada) falta(8, "Sangue-ralo não compra " + def.nome + " na criação.");
    });
    if (ralo) {
      var nq = o.sangueRalo.qualidades.length, nd = o.sangueRalo.defeitos.length;
      if (nq < 1 || nq > 3) falta(8, "Sangue-ralo: de 1 a 3 Qualidades de Sangue-Ralo.");
      if (nd !== nq) falta(8, "Sangue-ralo: o mesmo número de Defeitos e Qualidades de Sangue-Ralo.");
      o.sangueRalo.qualidades.forEach(function (k) {
        var cf = C.SANGUE_RALO.qualidades[k].conflitaCom;
        if (cf && o.sangueRalo.defeitos.indexOf(cf) >= 0) falta(8, C.SANGUE_RALO.qualidades[k].nome + " e " + C.SANGUE_RALO.defeitos[cf].nome + " se excluem.");
      });
    }
    /* Crenças. */
    var nc = o.convicoes.filter(function (c) { return texto(c.texto).trim(); }).length;
    if (nc < 1 || nc > 3) falta(9, "De 1 a 3 Convicções.");
    if (o.pilares.length !== nc) falta(9, "Um Pilar para cada Convicção.");
    o.pilares.forEach(function (pi) { if (!o.convicoes.some(function (c) { return c.id === pi.convicaoId; })) falta(9, "O Pilar " + (pi.nome || "") + " precisa de uma Convicção."); });
    if (!texto(o.ambicao).trim()) falta(10, "Defina a Ambição.");
    if (!texto(o.desejo).trim()) falta(10, "Defina o Desejo.");
    /* Experiência inicial. */
    var xpDisp = xpTotal(o) - xpGasto(o);
    if (xpDisp < 0) falta(11, "Experiência gasta além da disponível.");
    var excecoes = o.criacao.excecoes;
    var naoAutorizadas = excecoes.filter(function (e) { return !e.autorizada; });
    return { pendencias: pend, regular: !pend.length && !excecoes.length, excecoes: excecoes, completa: !pend.length && !naoAutorizadas.length };
  }

  function resumoDist(valores) {
    var c = {};
    valores.forEach(function (v) { c[v] = (c[v] || 0) + 1; });
    return Object.keys(c).sort(function (a, b) { return b - a; }).map(function (k) { return c[k] + " com " + k; }).join(", ");
  }

  /* Distribuir as concessões no bloco ao concluir: a Humanidade e a
     Potência viram valores próprios da ficha; Fome inicial 1. Os
     campos da criação ficam, para consulta. */
  function concluirCriacao(o) {
    var v = validarCriacao(o);
    if (!v.completa) return falha("Ainda há pendências na criação.", { pendencias: v.pendencias });
    o.criacao.concluida = true;
    var idade = C.IDADES[o.idade];
    if (ehSangueRalo(o)) o.potenciaBase = 0;
    else if (idade) o.potenciaBase = idade.potencia;
    if (o.fome === undefined || o.fome === null) o.fome = 1;
    return { ok: true, eventos: [evento("criacaoConcluida", { regular: v.regular })] };
  }

  /* Trocar uma escolha da criação: só os campos dela mudam; as
     concessões são recalculadas sozinhas (nada duplica). */
  function escolherPredador(o, chave, escolha) {
    if (o.criacao.concluida) return falha("A criação já foi concluída.");
    var p = C.PREDADORES[chave];
    if (chave && !p) return falha("Predador desconhecido.");
    o.predador = chave || "";
    var e = escolha || {};
    o.criacao.predador = { especializacao: inteiro(e.especializacao, -1, 10, -1), disciplina: texto(e.disciplina, 30), poder: texto(e.poder, 60), escolhas: objeto(e.escolhas) };
    return { ok: true, eventos: [evento("predador", { chave: o.predador })] };
  }

  /* ---------------------------------------------------------------
     HISTÓRICO, OPERAÇÕES, RESUMO
     --------------------------------------------------------------- */

  function registrarNoHistorico(o, ev) {
    o.historicoDeEventos.push(Object.assign({ noite: o.tempo.noite, cena: o.tempo.cena }, ev));
    if (o.historicoDeEventos.length > 200) o.historicoDeEventos = o.historicoDeEventos.slice(-200);
  }

  /* Aplica `fn(o)` uma vez por opId. Uma segunda chegada não muda nada. */
  function aplicarOperacao(o, opId, fn) {
    var id = texto(opId, 120);
    if (!id) return falha("Operação sem identificação.");
    if (o.operacoes.indexOf(id) >= 0) return { ok: true, repetida: true, eventos: [] };
    var r = fn(o) || { ok: true, eventos: [] };
    if (r.ok !== false) {
      o.operacoes.push(id);
      if (o.operacoes.length > LIMITE_OPERACOES) o.operacoes = o.operacoes.slice(-LIMITE_OPERACOES);
    }
    return r;
  }

  /* O resumo que a mesa lê sem abrir a ficha. Nada privado: sem
     Convicções, Pilares, Laços nem notas. */
  function resumoParaMesa(o) {
    var c = calcular(o);
    return {
      v: 1, natureza: o.natureza, cla: o.cla, predador: o.predador, geracao: o.geracao,
      fome: o.fome, humanidade: c.humanidade, maculas: o.maculas, potencia: c.potencia,
      vitalidade: { max: c.vitalidade.max, superficial: c.vitalidade.superficial, agravado: c.vitalidade.agravado },
      forcaDeVontade: { max: c.forcaDeVontade.max, superficial: c.forcaDeVontade.superficial, agravado: c.forcaDeVontade.agravado },
      estado: c.estado, frenesi: o.estado.frenesi ? o.estado.frenesi.tipo : "", compulsao: o.estado.compulsao ? o.estado.compulsao.chave : "",
      ressonancia: o.ressonancia ? { tipo: o.ressonancia.tipo, temperamento: o.ressonancia.temperamento } : null,
      xp: c.xp,
    };
  }

  global.RAMAVampiro = {
    VERSAO_BLOCO: VERSAO_BLOCO, NATUREZAS: NATUREZAS,
    fichaVazia: fichaVazia, normalizar: normalizar, inteiro: inteiro, novoId: novoId, copiar: copiar, evento: evento,
    concessoes: concessoes, calcular: calcular, trilha: trilha, estadoDe: estadoDe,
    valorDeAtributo: valorDeAtributo, valorDeHabilidade: valorDeHabilidade, valorDeDisciplina: valorDeDisciplina,
    humanidade: humanidade, potencia: potencia, limitesDePotencia: limitesDePotencia, gravidadeDaPerdicao: gravidadeDaPerdicao,
    vitalidadeMaxima: vitalidadeMaxima, fdvMaxima: fdvMaxima,
    poderesDaFicha: poderesDaFicha, temPoder: temPoder, vantagensDaFicha: vantagensDaFicha, temVantagem: temVantagem,
    pontosDeVantagem: pontosDeVantagem, especializacoesDaFicha: especializacoesDaFicha, ehSangueRalo: ehSangueRalo,
    sofrerDano: sofrerDano, gastarForcaDeVontade: gastarForcaDeVontade, curarSuperficial: curarSuperficial, curarAgravado: curarAgravado,
    curarComoMortal: curarComoMortal, tratarComMedicina: tratarComMedicina, penalidadesDeTrilha: penalidadesDeTrilha,
    aumentarFome: aumentarFome, checagemDeSangue: checagemDeSangue, checagens: checagens, ruborDeVida: ruborDeVida,
    montarParada: montarParada, rolarTeste: rolarTeste, rerrolarComFdV: rerrolarComFdV, concluirTeste: concluirTeste,
    consequenciaBestial: consequenciaBestial,
    iniciarCompulsao: iniciarCompulsao, encerrarCompulsao: encerrarCompulsao, repetirAcaoPerfeccionismo: repetirAcaoPerfeccionismo,
    paradaDeFrenesi: paradaDeFrenesi, testarFrenesi: testarFrenesi, entrarEmFrenesi: entrarEmFrenesi, encerrarFrenesi: encerrarFrenesi, assumirControle: assumirControle,
    adicionarMaculas: adicionarMaculas, testarRemorso: testarRemorso, aceitarDegeneracao: aceitarDegeneracao, mudarHumanidade: mudarHumanidade,
    eventoDePilar: eventoDePilar, transferirPilar: transferirPilar,
    entrarEmTorpor: entrarEmTorpor, despertarDoTorpor: despertarDoTorpor, estaquear: estaquear, removerEstaca: removerEstaca,
    morteFinal: morteFinal, luzDoSol: luzDoSol, fogo: fogo, despertarDeDia: despertarDeDia,
    ressonanciaAleatoria: ressonanciaAleatoria, definirRessonancia: definirRessonancia,
    planejarAlimentacao: planejarAlimentacao, alimentar: alimentar, doarSangue: doarSangue, paradaDeCaca: paradaDeCaca, dificuldadeDeCaca: dificuldadeDeCaca,
    beberDeVampiro: beberDeVampiro, paradaContraLaco: paradaContraLaco, enfraquecerLacos: enfraquecerLacos,
    diablerieTurno: diablerieTurno, diablerieConsumada: diablerieConsumada,
    custoDeNivel: custoDeNivel, custoDeCompra: custoDeCompra, validarCompra: validarCompra, comprar: comprar, receberXP: receberXP,
    podeAdquirirPoder: podeAdquirirPoder, requisitosDoPoder: requisitosDoPoder, poderesPendentes: poderesPendentes,
    adicionarEfeito: adicionarEfeito, removerEfeito: removerEfeito, temEfeito: temEfeito, expirarPor: expirarPor,
    inicioDaSessao: inicioDaSessao, fimDaSessao: fimDaSessao, cumprirDesejo: cumprirDesejo, recuperarFdV: recuperarFdV,
    novaNoite: novaNoite, novaCena: novaCena, fimDaCena: fimDaCena, fimDoTurno: fimDoTurno,
    validarCriacao: validarCriacao, concluirCriacao: concluirCriacao, escolherPredador: escolherPredador,
    registrarNoHistorico: registrarNoHistorico, aplicarOperacao: aplicarOperacao, resumoParaMesa: resumoParaMesa,
  };
})(typeof window !== "undefined" ? window : globalThis);
