/* =====================================================================
   R.A.M.A. — Tormenta20 · criação de personagem e escolhas (v8.0)
   ---------------------------------------------------------------------
     RAMATormenta20Escolhas  o campo de uma escolha do catálogo (perícia,
                             ofício, magia, opção, poder geral, escola,
                             arma, familiar, totem, terreno…), usado na
                             criação e na subida de nível
     RAMATormenta20Criar     o passo a passo (p. 16–35): atributos por
                             compra de 10 pontos ou 4d6, raça, origem (ou
                             própria), classe com perícias e escolhas do
                             1º nível, divindade, magias iniciais e
                             equipamento inicial. Cada benefício entra
                             UMA vez: o motor calcula a partir das
                             escolhas, nada é somado à mão.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function R() { return global.RAMATormenta20; }
  function D() { return global.RAMATormenta20Dados; }
  function RA() { return global.RAMATormenta20Racas; }
  function CL() { return global.RAMATormenta20Classes; }
  function OR() { return global.RAMATormenta20Origens; }
  function DE() { return global.RAMATormenta20Deuses; }
  function PO() { return global.RAMATormenta20Poderes; }
  function EQ() { return global.RAMATormenta20Equipamento; }
  function MG() { return global.RAMATormenta20Magias; }
  function PA() { return global.RAMATormenta20Parceiros; }
  function T() { return global.RAMATormenta20Tela; }
  function UI() { return global.RAMAUI; }
  var X = function () { return global.RAMATormenta20Expressao; };

  /* ------------------------------------------------- opções de escolha */
  function opcoesDe(esc, contexto) {
    var c = contexto || {};
    var calc = c.calc;
    switch (esc.tipo) {
      case "opcao": return (esc.opcoes || []).map(function (o) { return { valor: o[0], rotulo: o[1] }; });
      case "pericia": {
        var lista = D().PERICIAS.filter(function (p) { return p.chave !== "oficio"; });
        if (esc.daClasse && c.classe) { var cl = CL().CLASSE[c.classe]; var perm = cl ? cl.pericias.escolha.de.concat(cl.pericias.fixas) : []; lista = lista.filter(function (p) { return perm.indexOf(p.chave) >= 0; }); }
        if (esc.exceto) lista = lista.filter(function (p) { return esc.exceto.indexOf(p.chave) < 0; });
        var ops = lista.map(function (p) { return { valor: p.chave, rotulo: p.nome }; });
        /* Ofício é uma perícia por especialização (p. 121). */
        if (!esc.daClasse && !(esc.exceto && esc.exceto.indexOf("oficio") >= 0)) ops = ops.concat(D().OFICIOS.map(function (o) { return { valor: "oficio:" + o.chave, rotulo: "Ofício (" + o.nome + ")" }; }));
        return ops;
      }
      case "periciaTreinada": {
        var tr = calc ? Object.keys(calc.pericias).filter(function (k) { return calc.pericias[k].treinado; }) : D().PERICIAS.map(function (p) { return p.chave; });
        if (esc.exceto) tr = tr.filter(function (k) { return esc.exceto.indexOf(k) < 0; });
        return tr.map(function (k) { return { valor: k, rotulo: R().nomePericia(k) }; });
      }
      case "oficio": return D().OFICIOS.map(function (o) { return { valor: o.chave, rotulo: o.nome }; });
      case "escola": return D().ESCOLAS.map(function (e) { return { valor: e[0], rotulo: e[1] }; });
      case "magia": {
        var ms = MG() ? MG().MAGIAS.slice() : [];
        if (esc.de) ms = ms.filter(function (m) { return esc.de.indexOf(m.id) >= 0; });
        if (esc.circulo) ms = ms.filter(function (m) { return m.circulo <= esc.circulo; });
        if (esc.tipoMagia && !esc.qualquerTipo) ms = ms.filter(function (m) { return m.tipo === esc.tipoMagia || m.tipo === "universal"; });
        if (esc.escolas) ms = ms.filter(function (m) { return esc.escolas.indexOf(m.escola) >= 0; });
        return ms.sort(function (a, b) { return a.circulo - b.circulo || a.nome.localeCompare(b.nome); }).map(function (m) { return { valor: m.id, rotulo: m.nome + " (" + m.circulo + "º)" }; });
      }
      case "magiaConhecida": return (c.t20 ? c.t20.magias : []).map(function (m) { return { valor: m.id, rotulo: MG().MAGIA[m.id] ? MG().MAGIA[m.id].nome : m.id }; });
      case "arma": return EQ().ARMAS.map(function (a) { return { valor: a.id, rotulo: a.nome }; });
      case "familiar": return (CL().CLASSE.arcanista.familiares || []).map(function (f) { return { valor: f[0], rotulo: f[1] + " — " + f[2] }; });
      case "totem": return (CL().CLASSE.barbaro && CL().CLASSE.barbaro.totens || []).map(function (f) { return { valor: f[0], rotulo: f[1] }; });
      case "terreno": return (CL().CLASSE.cacador && CL().CLASSE.cacador.terrenos || []).map(function (f) { return { valor: f[0], rotulo: f[1] }; });
      case "tipoParceiro": return Object.keys(PA().TIPOS).filter(function (k) { return !PA().TIPOS[k].montaria || k === "cavalo"; }).map(function (k) { return { valor: k, rotulo: PA().TIPOS[k].nome }; });
      case "proficiencia": return [["marciais", "Armas marciais"], ["escudos", "Escudos"], ["pesadas", "Armaduras pesadas"], ["exoticas", "Armas exóticas"], ["fogo", "Armas de fogo"]].map(function (o) { return { valor: o[0], rotulo: o[1] }; });
      case "poderGeral": return PO().PODERES.filter(function (p) { return ["combate", "destino", "magia"].indexOf(p.grupo) >= 0; }).map(function (p) { return { valor: p.id, rotulo: p.nome + " (" + PO().GRUPOS[p.grupo] + ")" }; });
      case "poderTormenta": return PO().PODERES.filter(function (p) { return p.grupo === "tormenta"; }).map(function (p) { return { valor: p.id, rotulo: p.nome }; });
      case "habilidadeDeRaca": {
        var out = [];
        (RA().HUMANOIDES || []).filter(function (r) { return !esc.exceto || esc.exceto.indexOf(r) < 0; }).forEach(function (r) { RA().habilidadesDe(r).forEach(function (h) { out.push({ valor: r + ":" + h.id, rotulo: RA().RACA[r].nome + " — " + h.nome }); }); });
        return out;
      }
      default: return [];
    }
  }
  function quantidadeDe(esc, calc) {
    if (esc.quantidade === undefined) return 1;
    if (typeof esc.quantidade === "number") return esc.quantidade;
    return Math.max(0, Math.floor(X().numero(esc.quantidade, calc ? { atr: calc.atr } : {})));
  }
  /* O campo: uma ou várias seleções (sem repetir), ou texto. */
  function campoDeEscolha(esc, valorAtual, aoMudar, contexto) {
    var rotulo = esc.rotulo || ({ pericia: "Perícia", periciaTreinada: "Perícia treinada", oficio: "Ofício", magia: "Magia", escola: "Escola", arma: "Arma", familiar: "Familiar", totem: "Totem", terreno: "Terreno", proficiencia: "Proficiência", poderGeral: "Poder geral", poderTormenta: "Poder da Tormenta", opcao: "Escolha", tipoParceiro: "Tipo de parceiro", habilidadeDeRaca: "Habilidade" }[esc.tipo] || esc.id);
    if (esc.tipo === "texto") return UI().campo({ rotulo: rotulo, valor: valorAtual || "", aoMudar: function (v) { aoMudar(v); } });
    if (esc.tipo === "alternativa") {
      var alt = valorAtual && typeof valorAtual === "object" ? valorAtual : {};
      var op = (esc.opcoes || []).filter(function (o) { return o.id === alt.opcao; })[0];
      return el("div.pilha", {}, [
        T().selecao("Escolha", [{ valor: "", rotulo: "—" }].concat(esc.opcoes.map(function (o) { return { valor: o.id, rotulo: o.rotulo }; })), alt.opcao || "", function (v) { aoMudar({ opcao: v }); }),
        op ? campoDeEscolha(Object.assign({ id: esc.id + ":sub" }, op.escolha), op.id === "raca" ? (alt.raca ? alt.raca + ":" + alt.habilidade : "") : alt.valor, function (v) {
          if (op.id === "raca") { var p = String(v || "").split(":"); aoMudar({ opcao: op.id, raca: p[0], habilidade: p[1] }); }
          else aoMudar({ opcao: op.id, valor: v });
        }, contexto) : null,
      ]);
    }
    var opcoes = opcoesDe(esc, contexto);
    var n = quantidadeDe(esc, contexto && contexto.calc);
    if (n <= 1) return T().selecao(rotulo, [{ valor: "", rotulo: "—" }].concat(opcoes), Array.isArray(valorAtual) ? valorAtual[0] || "" : (valorAtual || ""), function (v) { aoMudar(n === 1 && esc.quantidade !== undefined ? (v ? [v] : []) : v); });
    var atual = Array.isArray(valorAtual) ? valorAtual.slice(0, n) : [];
    var campos = [];
    for (var i = 0; i < n; i++) {
      (function (i) {
        campos.push(T().selecao(rotulo + " " + (i + 1), [{ valor: "", rotulo: "—" }].concat(opcoes.filter(function (o) { return atual.indexOf(o.valor) < 0 || atual[i] === o.valor; })), atual[i] || "", function (v) { var novo = atual.slice(); novo[i] = v; aoMudar(novo.filter(Boolean)); }));
      })(i);
    }
    return el("div.t20-escolhas-multiplas", {}, campos);
  }
  function escolhaCompleta(esc, valor, calc) {
    if (esc.tipo === "texto") return !!valor;
    if (esc.tipo === "alternativa") return !!(valor && valor.opcao && (valor.valor || valor.habilidade));
    var n = quantidadeDe(esc, calc);
    if (n === 0) return true;
    if (Array.isArray(valor)) return valor.filter(Boolean).length >= n;
    return !!valor;
  }

  global.RAMATormenta20Escolhas = { opcoesDe: opcoesDe, quantidadeDe: quantidadeDe, campo: campoDeEscolha, completa: escolhaCompleta };

  /* =================================================== a criação */
  var PASSOS = [
    { chave: "atributos", nome: "Atributos", pagina: 17 },
    { chave: "raca", nome: "Raça", pagina: 18 },
    { chave: "origem", nome: "Origem", pagina: 85 },
    { chave: "classe", nome: "Classe", pagina: 32 },
    { chave: "divindade", nome: "Divindade", pagina: 96 },
    { chave: "magias", nome: "Magias", pagina: 170 },
    { chave: "equipamento", nome: "Equipamento", pagina: 140 },
    { chave: "conferir", nome: "Conferir", pagina: 106 },
  ];

  function abrir(opcoes) {
    var op = opcoes || {};
    var ctx = op.ctx || null;
    var b = ctx ? R().normalizar(ctx.ficha.tormenta20) : R().fichaVazia();
    if (!ctx && op.campanhaId) b.opcoes = b.opcoes || {};
    var estado = { passo: 0, nome: ctx ? ctx.ficha.nome : "", campanhaId: op.campanhaId || "", classe: b.niveis[0] ? b.niveis[0].classe : "", rolagem: null,
      inicial: { simples: "", marcial: "", armadura: "", escudo: true } };
    var corpo = el("div.t20-criar");
    var janela = UI().modal({ titulo: ctx ? "Continuar a criação" : "Nova ficha de Tormenta20", largo: true, classe: "t20-criar-janela", conteudo: corpo, exigeDecisao: true,
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Voltar", aoClicar: function () { if (estado.passo > 0) { estado.passo--; desenhar(); } } },
        { rotulo: "Avançar", classe: "r-botao--principal", aoClicar: function (fechar) {
          var falta = pendencia(estado.passo);
          if (falta) { UI().avisoAtencao(falta); return; }
          if (estado.passo < PASSOS.length - 1) { estado.passo++; desenhar(); return; }
          return concluir(fechar);
        } },
      ] });

    function calc() { try { return R().calcular(R().normalizar(b)); } catch (e) { return null; } }
    function classe() { return CL().CLASSE[estado.classe] || null; }
    function nivel1() { if (!b.niveis[0]) b.niveis[0] = { classe: estado.classe, escolhas: {} }; b.niveis[0].classe = estado.classe; return b.niveis[0]; }

    function pendencia(i) {
      var p = PASSOS[i].chave;
      var c = calc();
      if (p === "atributos") {
        if (b.metodo === "pontos") { var cp = R().custoDosPontos(b.atributosBase); if (!cp.valido) return "A compra passa de 10 pontos ou usa valores fora da tabela (de −1 a 4)."; }
        if (b.metodo === "rolagem" && (!estado.rolagem || estado.ordem.filter(Boolean).length < 6)) return "Role os atributos e distribua os seis valores.";
        if (!estado.nome.trim()) return "Dê um nome ao personagem.";
      }
      if (p === "raca") {
        if (!b.raca.id) return "Escolha a raça.";
        var at = RA().atributosDe(b.raca.id, b.raca.variante);
        if (at.escolha && b.raca.atributos.length < at.escolha.quantidade) return "Escolha os atributos da raça (" + at.escolha.quantidade + ").";
        var faltaR = RA().habilidadesDe(b.raca.id, b.raca.variante).some(function (h) { return (h.escolhas || []).some(function (e) { return e.criacao !== false && !escolhaCompleta(e, b.raca.escolhas[e.id], c); }); });
        if (faltaR) return "Complete as escolhas da raça.";
      }
      if (p === "origem") {
        if (RA().RACA[b.raca.id] && RA().RACA[b.raca.id].semOrigem) return "";
        if (!b.origem.id) return "Escolha a origem (ou origem própria).";
        if (b.origem.id === "propria") { if (!b.origem.propria || !b.origem.propria.nome) return "Dê um nome à origem própria."; if (b.origem.beneficios.length !== 2) return "A origem própria dá dois benefícios (perícias ou poderes gerais)."; return ""; }
        var o = OR().ORIGEM[b.origem.id];
        if (o && o.especial !== "mestre" && b.origem.beneficios.length !== OR().BENEFICIOS) return "Escolha " + OR().BENEFICIOS + " benefícios da origem.";
      }
      if (p === "classe") {
        var cl = classe();
        if (!cl) return "Escolha a classe.";
        var esc = nivel1().escolhas;
        if ((esc.pericias || []).length < cl.pericias.escolha.n) return "Escolha " + cl.pericias.escolha.n + " perícias da classe.";
        var faltaC = (cl.tabela[1] || []).some(function (hid) { var h = cl.habilidades[hid]; return h && (h.escolhas || []).some(function (e) { return !escolhaCompleta(e, esc[e.id], c); }); });
        if (faltaC) return "Complete as escolhas do 1º nível da classe.";
        var nInt = c ? Math.max(0, c.atr["int"]) : 0;
        if (b.periciasInt.length < nInt) return "Inteligência " + nInt + ": escolha " + nInt + " perícia(s) extra.";
      }
      if (p === "divindade") {
        var obrig = ["clerigo", "druida", "paladino"].indexOf(estado.classe) >= 0;
        if (obrig && !b.divindade) return "Clérigos, druidas e paladinos são devotos: escolha a divindade.";
        if (b.divindade && !b.divindade.poderes.length) return "Escolha o poder concedido.";
      }
      if (p === "magias") {
        var nM = magiasIniciais();
        if (nM && b.magias.length < nM) return "Escolha " + nM + " magia(s) iniciais.";
      }
      return "";
    }
    function magiasIniciais() {
      var cl = classe();
      if (!cl || !cl.magias) return 0;
      var n = cl.magias.iniciais || 0;
      var cam = nivel1().escolhas.caminho;
      if (cl.id === "arcanista" && cam === "mago") n += 1;
      return n;
    }

    /* --------------------------------------------- passos */
    function passoAtributos() {
      var c = calc();
      var cp = R().custoDosPontos(b.atributosBase);
      var linhas = R().ATR.map(function (a) {
        var base = b.atributosBase[a];
        var raca = R().modificadoresDeRaca(b)[a];
        return el("tr", {}, [
          el("th", { scope: "row", texto: T().nomeAtr(a) }),
          el("td", {}, b.metodo === "pontos" ? [
            T().botao("−", function () { if (base > -1) { b.atributosBase[a] = base - 1; desenhar(); } }, { rotulo: "Diminuir " + T().nomeAtr(a), motivo: base <= -1 ? "Mínimo −1 na compra." : "" }),
            el("span.t20-num", { texto: T().sinal(base) }),
            T().botao("+", function () { if (base < 4) { b.atributosBase[a] = base + 1; desenhar(); } }, { rotulo: "Aumentar " + T().nomeAtr(a), motivo: base >= 4 ? "Máximo 4 na compra." : "" }),
          ] : [el("span.t20-num", { texto: T().sinal(base) })]),
          el("td", { texto: b.metodo === "pontos" ? String(D().CUSTO_PONTOS[String(base)]) : "—" }),
          el("td", { texto: raca ? T().sinal(raca) : "" }),
          el("td.t20-num", { texto: c ? T().sinal(c.atr[a]) : "" }),
        ]);
      });
      return [
        UI().campo({ rotulo: "Nome do personagem", valor: estado.nome, aoMudar: function (v) { estado.nome = v; }, aoDigitar: true }),
        T().selecao("Método", [{ valor: "pontos", rotulo: "Compra de 10 pontos (Tabela 1-1)" }, { valor: "rolagem", rotulo: "Seis rolagens de 4d6, descartando o menor" }], b.metodo, function (v) { b.metodo = v; if (v === "pontos") R().ATR.forEach(function (a) { b.atributosBase[a] = 0; }); desenhar(); }),
        b.metodo === "pontos" ? el("p", { role: "status", texto: "Pontos: " + (D().PONTOS_INICIAIS - cp.restante) + " de " + D().PONTOS_INICIAIS + " usados · restam " + cp.restante + ". Custo: −1 devolve 1 ponto; 0 custa 0; 1 custa 1; 2 custa 2; 3 custa 4; 4 custa 7." }) : passoRolagem(),
        el("table.t20-tabela", {}, [el("thead", {}, [el("tr", {}, ["Atributo", "Base", "Custo", "Raça", "Total"].map(function (h) { return el("th", { scope: "col", texto: h }); }))]), el("tbody", {}, linhas)]),
        el("p.t-mini", { texto: "O total já mostra os ajustes da raça escolhida. Aumentos de atributo por poder entram pela progressão. " + T().referencia(17) }),
      ];
    }
    function passoRolagem() {
      if (!estado.rolagem) return el("div.faixa", {}, [T().botao("Rolar os seis valores", function () { estado.rolagem = R().rolarAtributos(T().rolar); estado.ordem = ["", "", "", "", "", ""]; desenhar(); })]);
      var vals = estado.rolagem.rolagens;
      return el("div.pilha", {}, [
        el("ul.t20-rolagens", {}, vals.map(function (r, i) { return el("li", {}, [el("span", { texto: "4d6: " + r.dados.join(", ") + " (descarta " + r.descartado + ") = " + r.soma + " → " }), el("strong", { texto: T().sinal(r.valor) }), T().selecao("Atributo", [{ valor: "", rotulo: "—" }].concat(R().ATR.filter(function (a) { return estado.ordem.indexOf(a) < 0 || estado.ordem[i] === a; }).map(function (a) { return { valor: a, rotulo: T().nomeAtr(a) }; })), estado.ordem[i], function (v) { estado.ordem[i] = v; if (estado.ordem.filter(Boolean).length === 6) R().distribuirAtributos(b, vals.map(function (x) { return x.valor; }), estado.ordem); desenhar(); })]); })),
        el("p.t-mini", { texto: "Soma dos modificadores: " + estado.rolagem.soma + (estado.rolagem.refeitas ? " (o menor foi rolado de novo " + estado.rolagem.refeitas + " vez(es) por a soma ficar abaixo de 6)" : "") + ". " + T().referencia(17) }),
        T().botao("Rolar de novo", function () { estado.rolagem = null; desenhar(); }, { classe: "r-botao--fantasma" }),
      ]);
    }
    function passoRaca() {
      var c = calc();
      var raca = RA().RACA[b.raca.id];
      var at = raca ? RA().atributosDe(b.raca.id, b.raca.variante) : null;
      var itens = [T().selecao("Raça", [{ valor: "", rotulo: "—" }].concat(RA().RACAS.map(function (r) { return { valor: r.id, rotulo: r.nome + " (p. " + r.pagina + ")" }; })), b.raca.id, function (v) { b.raca = { id: v, variante: "", atributos: [], escolhas: {} }; desenhar(); })];
      if (raca && raca.variantes) itens.push(T().selecao("Variante", [{ valor: "", rotulo: "—" }].concat(raca.variantes.map(function (x) { return { valor: x.id, rotulo: x.nome }; })), b.raca.variante, function (v) { b.raca.variante = v; b.raca.atributos = []; desenhar(); }));
      if (at && at.escolha) itens.push(campoDeEscolha({ id: "atr", tipo: "opcao", quantidade: at.escolha.quantidade, rotulo: "Atributo +" + at.escolha.valor, opcoes: R().ATR.filter(function (a) { return (at.escolha.exceto || []).indexOf(a) < 0; }).map(function (a) { return [a, T().nomeAtr(a)]; }) }, b.raca.atributos, function (v) { b.raca.atributos = v; desenhar(); }, {}));
      if (raca) {
        itens.push(el("p", { texto: raca.resumo || "" }));
        RA().habilidadesDe(b.raca.id, b.raca.variante).forEach(function (h) {
          itens.push(el("div.t20-habilidade", {}, [el("strong", { texto: h.nome }), el("span", { texto: " — " + h.resumo })].concat((h.escolhas || []).map(function (e) {
            return campoDeEscolha(e, b.raca.escolhas[e.id], function (v) { b.raca.escolhas[e.id] = v; desenhar(); }, { calc: c, t20: b });
          }))));
        });
      }
      return itens;
    }
    function passoOrigem() {
      var raca = RA().RACA[b.raca.id];
      if (raca && raca.semOrigem) return [el("p", { texto: raca.nome + " não tem origem (veja a raça, p. " + raca.pagina + ")." })];
      var o = OR().ORIGEM[b.origem.id];
      var itens = [T().selecao("Origem", [{ valor: "", rotulo: "—" }].concat(OR().ORIGENS.map(function (x) { return { valor: x.id, rotulo: x.nome + " (p. " + x.pagina + ")" }; })).concat([{ valor: "propria", rotulo: "Origem própria (p. 95)" }]), b.origem.id, function (v) { b.origem = { id: v, beneficios: [], escolhas: {}, propria: v === "propria" ? { nome: "", unico: { nome: "", resumo: "" }, itens: "" } : null }; desenhar(); })];
      if (b.origem.id === "propria") {
        var pr = b.origem.propria;
        itens.push(UI().campo({ rotulo: "Nome da origem", valor: pr.nome, aoMudar: function (v) { pr.nome = v; } }));
        itens.push(UI().campo({ rotulo: "Itens", valor: pr.itens, aoMudar: function (v) { pr.itens = v; } }));
        itens.push(el("p.t-mini", { texto: "Escolha dois benefícios entre perícias e poderes gerais (o mestre aprova). " + T().referencia(95) }));
        itens.push(beneficiosLivres());
        return itens;
      }
      if (!o) return itens;
      itens.push(el("p.t-mini", { texto: "Itens: " + o.itens.map(function (i) { return typeof i === "string" ? i : i.texto; }).join("; ") }));
      if (o.especial === "mestre") { itens.push(el("p", { texto: o.unico.nome + ": " + o.unico.resumo })); return itens; }
      var opcoes = o.pericias.map(function (k) { return { tipo: "pericia", id: k, rotulo: "Perícia: " + R().nomePericia(k) }; })
        .concat(o.poderes.map(function (k) { var p = PO().PODER[k]; return { tipo: "poder", id: k, rotulo: "Poder: " + (p ? p.nome : k) }; }))
        .concat(o.unico ? [{ tipo: "poder", id: o.unico.id, rotulo: "Poder único: " + o.unico.nome + " — " + o.unico.resumo }] : []);
      itens.push(el("fieldset.t20-beneficios", {}, [el("legend", { texto: "Escolha " + OR().BENEFICIOS + " benefícios" })].concat(opcoes.map(function (x) {
        var marcado = b.origem.beneficios.some(function (y) { return y.id === x.id; });
        return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: marcado, onchange: function (ev) {
          if (ev.currentTarget.checked) { if (b.origem.beneficios.length >= OR().BENEFICIOS) { ev.currentTarget.checked = false; UI().avisoAtencao("Já há " + OR().BENEFICIOS + " benefícios."); return; } b.origem.beneficios.push({ tipo: x.tipo, id: x.id, escolhas: {} }); }
          else b.origem.beneficios = b.origem.beneficios.filter(function (y) { return y.id !== x.id; });
          desenhar();
        } }), el("span", { texto: x.rotulo })]);
      }))));
      var benOf = b.origem.beneficios.filter(function (y) { return y.tipo === "pericia" && y.id === "oficio"; })[0];
      if (benOf) itens.push(T().selecao("Especialização do Ofício da origem", [{ valor: "", rotulo: "—" }].concat(D().OFICIOS.map(function (o2) { return { valor: o2.chave, rotulo: o2.nome }; })), (benOf.escolhas || {}).oficio || "", function (v) { benOf.escolhas = benOf.escolhas || {}; benOf.escolhas.oficio = v; desenhar(); }));
      (o.qualquer || []).forEach(function (g) { itens.push(el("p.t-mini", { texto: "Esta origem também permite poderes de " + g + " no lugar dos listados (p. " + o.pagina + "); escolha em Progressão → Poderes avulsos, com o mestre." })); });
      return itens;
    }
    function beneficiosLivres() {
      var lista = el("div.pilha");
      var atual = b.origem.beneficios;
      [0, 1].forEach(function (i) {
        var x = atual[i] || { tipo: "pericia", id: "" };
        lista.appendChild(el("div.faixa", {}, [
          T().selecao("Benefício " + (i + 1), [{ valor: "pericia", rotulo: "Perícia" }, { valor: "poder", rotulo: "Poder geral" }], x.tipo, function (v) { atual[i] = { tipo: v, id: "", escolhas: {} }; desenhar(); }),
          campoDeEscolha({ id: "b" + i, tipo: x.tipo === "poder" ? "poderGeral" : "pericia" }, x.id, function (v) { atual[i] = { tipo: x.tipo, id: v, escolhas: {} }; b.origem.beneficios = atual.filter(function (y) { return y && y.id; }); desenhar(); }, {}),
        ]));
      });
      return lista;
    }
    function passoClasse() {
      var c = calc();
      var cl = classe();
      var itens = [T().selecao("Classe", [{ valor: "", rotulo: "—" }].concat(CL().CLASSES.map(function (x) { return { valor: x.id, rotulo: x.nome + " (PV " + x.pv.inicial + "+Con, " + x.pm + " PM/nível; p. " + x.pagina + ")" }; })), estado.classe, function (v) { estado.classe = v; b.niveis = v ? [{ classe: v, escolhas: {} }] : []; b.magias = []; b.periciasInt = []; desenhar(); })];
      if (!cl) return itens;
      var esc = nivel1().escolhas;
      itens.push(el("p.t-mini", { texto: "Perícias fixas: " + (cl.pericias.fixas.map(R().nomePericia).join(", ") || "—") + ". Proficiências: " + (cl.proficiencias.join(", ") || "só simples e leves") + "." }));
      (cl.pericias.ou || []).forEach(function (par, i) {
        esc.ou = esc.ou || [];
        itens.push(T().selecao("Perícia (uma das duas)", par.map(function (k) { return { valor: k, rotulo: R().nomePericia(k) }; }), esc.ou[i] || par[0], function (v) { esc.ou[i] = v; desenhar(); }));
      });
      itens.push(campoDeEscolha({ id: "pericias", tipo: "opcao", quantidade: cl.pericias.escolha.n, rotulo: "Perícia da classe", opcoes: cl.pericias.escolha.de.map(function (k) { return [k, R().nomePericia(k)]; }) }, esc.pericias || [], function (v) { esc.pericias = v; desenhar(); }, {}));
      /* Cada Ofício da classe pede a especialização (p. 121). */
      var quantosOficios = cl.pericias.fixas.concat((cl.pericias.ou || []).map(function (par, i) { return (esc.ou || [])[i] || par[0]; })).concat(esc.pericias || []).filter(function (k) { return k === "oficio"; }).length;
      for (var iOf = 0; iOf < quantosOficios; iOf++) {
        (function (i) {
          esc.oficios = esc.oficios || [];
          itens.push(T().selecao("Especialização do Ofício" + (quantosOficios > 1 ? " " + (i + 1) : ""), [{ valor: "", rotulo: "—" }].concat(D().OFICIOS.map(function (o) { return { valor: o.chave, rotulo: o.nome }; })), esc.oficios[i] || "", function (v) { esc.oficios[i] = v; desenhar(); }));
        })(iOf);
      }
      (cl.tabela[1] || []).forEach(function (hid) {
        var h = cl.habilidades[hid];
        if (!h) return;
        itens.push(el("div.t20-habilidade", {}, [el("strong", { texto: h.nome }), el("span", { texto: " — " + h.resumo })].concat((h.escolhas || []).map(function (e) {
          return campoDeEscolha(e, esc[e.id], function (v) { esc[e.id] = v; desenhar(); }, { calc: c, t20: b, classe: cl.id });
        }))));
      });
      var nInt = c ? Math.max(0, c.atr["int"]) : 0;
      if (nInt) itens.push(campoDeEscolha({ id: "int", tipo: "opcao", quantidade: nInt, rotulo: "Perícia pela Inteligência", opcoes: D().PERICIAS.filter(function (p) { return p.chave !== "oficio"; }).map(function (p) { return [p.chave, p.nome]; }).concat(D().OFICIOS.map(function (o) { return ["oficio:" + o.chave, "Ofício (" + o.nome + ")"]; })) }, b.periciasInt, function (v) { b.periciasInt = v; desenhar(); }, {}));
      return itens;
    }
    function passoDivindade() {
      var nv = b.niveis.map(function (n) { return n.classe; });
      var lista = DE().DEUSES.map(function (d) { var pode = DE().podeSerDevoto(d, b.raca.id, b.raca.variante, nv); return { valor: d.id, rotulo: d.nome + (pode === false ? " (sua raça e classe não estão entre os devotos)" : pode === null ? " (o mestre decide)" : ""), pode: pode }; });
      var dv = b.divindade && DE().DEUS[b.divindade.id];
      var itens = [T().selecao("Divindade", [{ valor: "", rotulo: "Nenhuma (não devoto)" }].concat(lista.filter(function (x) { return x.pode !== false; })), b.divindade ? b.divindade.id : "", function (v) { b.divindade = v ? { id: v, energia: "", poderes: [] } : null; desenhar(); })];
      if (dv) {
        itens.push(el("p", { texto: "Obrigações & Restrições: " + dv.obrigacoes }));
        itens.push(el("p.t-mini", { texto: "Energia: " + dv.energia + " · arma preferida: " + (EQ().ITEM[dv.armaPreferida] ? EQ().ITEM[dv.armaPreferida].nome : dv.armaPreferida) + " · p. " + dv.pagina }));
        if (dv.energia === "qualquer") itens.push(T().selecao("Energia canalizada (definitiva)", [{ valor: "positiva", rotulo: "Positiva" }, { valor: "negativa", rotulo: "Negativa" }], b.divindade.energia || "positiva", function (v) { b.divindade.energia = v; }));
        itens.push(T().selecao("Poder concedido (um ao se tornar devoto)", [{ valor: "", rotulo: "—" }].concat(dv.poderes.map(function (k) { var p = PO().PODER[k]; return { valor: k, rotulo: (p ? p.nome : k) + (p ? " — " + p.resumo : "") }; })), b.divindade.poderes[0] ? b.divindade.poderes[0].id : "", function (v) { b.divindade.poderes = v ? [{ id: v, escolhas: {} }] : []; desenhar(); }));
      }
      return itens;
    }
    function passoMagias() {
      var cl = classe();
      var n = magiasIniciais();
      if (!n) return [el("p", { texto: cl ? cl.nome + " não começa com magias de classe." : "Escolha a classe antes." })];
      var c = calc();
      var fs = c.magias.fontes["classe:" + cl.id];
      var disponiveis = MG().MAGIAS.filter(function (m) { return MG().disponivel(m, { tipo: fs.tipo, circuloMax: 1, escolas: fs.escolas }); });
      return [
        el("p", { texto: "Escolha " + n + " magia(s) de 1º círculo (" + fs.tipo + (fs.escolas ? "; escolas " + fs.escolas.join(", ") : "") + "). CD " + fs.cd + ", atributo " + T().nomeAtr(fs.atributo) + "." }),
        campoDeEscolha({ id: "magias", tipo: "opcao", quantidade: n, rotulo: "Magia", opcoes: disponiveis.map(function (m) { return [m.id, m.nome + " (" + m.escola + ")"]; }) }, b.magias.map(function (m) { return m.id; }), function (v) { b.magias = v.map(function (id) { return { id: id, fonte: "classe:" + cl.id, atributo: "", memorizada: true }; }); desenhar(); }, {}),
      ];
    }
    function passoEquipamento() {
      var cl = classe();
      var ini = EQ().ITENS_INICIAIS || {};
      var o = OR().ORIGEM[b.origem.id];
      return [
        el("p", { texto: "Equipamento inicial (p. 140): uma mochila, um saco de dormir e um traje de viajante; armas e armadura conforme as proficiências; T$ 4d6 de dinheiro." }),
        el("p.t-mini", { texto: (ini.resumo || "") + (o ? " Itens da origem: " + o.itens.map(function (i) { return typeof i === "string" ? i : i.texto; }).join("; ") + "." : "") }),
        el("div.faixa", {}, [T().botao("Rolar T$ 4d6", function () { var r = T().rolarExpressao("Dinheiro inicial", "4d6", "teste"); b.inventario.tibar = r.total; desenhar(); }), el("span", { role: "status", texto: "Tibares: T$ " + b.inventario.tibar })]),
      ].concat(escolhasIniciais(cl)).concat([
        el("p.t-mini", { texto: "O resto se compra no Inventário da ficha, pelo preço da Tabela 3-3." }),
      ]);
    }
    /* As armas e a armadura que vêm de graça no 1º nível (p. 140): uma
       arma simples; uma marcial se proficiente; couro, couro batido ou
       gibão de peles (ou brunea, se proficiente em pesadas); escudo leve
       se proficiente em escudos. Arcanistas começam sem armadura. */
    function escolhasIniciais(cl) {
      if (!cl || ctx) return [];
      var c = calc();
      var prof = c ? c.proficiencias : {};
      var ini = estado.inicial;
      var opcoesDe = function (l) { return [{ valor: "", rotulo: "—" }].concat(l.map(function (a) { return { valor: a.id, rotulo: a.nome + " (" + a.dano + (a.margem < 20 ? ", " + a.margem : "") + ", x" + (a.mult || 2) + ")" }; })); };
      var itens = [el("h4.t-rotulo", { texto: "Armas e armadura iniciais (grátis)" })];
      itens.push(T().selecao("Arma simples", opcoesDe(EQ().ARMAS.filter(function (a) { return a.proficiencia === "simples"; })), ini.simples, function (v) { ini.simples = v; }));
      if (prof.marciais) itens.push(T().selecao("Arma marcial", opcoesDe(EQ().ARMAS.filter(function (a) { return a.proficiencia === "marcial"; })), ini.marcial, function (v) { ini.marcial = v; }));
      if (cl.id === "arcanista") itens.push(el("p.t-mini", { texto: "Arcanistas começam sem armadura." }));
      else {
        var armaduras = ["couro", "couroBatido", "gibaoDePeles"].concat(prof.pesadas ? ["brunea"] : []).map(function (id) { return EQ().ITEM[id]; }).filter(Boolean);
        itens.push(T().selecao("Armadura", [{ valor: "", rotulo: "—" }].concat(armaduras.map(function (a) { return { valor: a.id, rotulo: a.nome + " (Defesa +" + a.defesa + (a.penalidade ? ", penalidade " + a.penalidade : "") + ")" }; })), ini.armadura, function (v) { ini.armadura = v; }));
        if (prof.escudos) itens.push(el("label.r-marca", {}, [el("input", { type: "checkbox", checked: ini.escudo !== false, onchange: function (ev) { ini.escudo = ev.currentTarget.checked; } }), el("span", { texto: "Escudo leve" })]));
      }
      return itens;
    }
    function passoConferir() {
      var c = calc();
      if (!c) return [el("p", { texto: "Falta alguma escolha." })];
      return [
        el("p", { texto: estado.nome + " — " + (RA().RACA[b.raca.id] || {}).nome + ", " + (classe() || {}).nome + " 1" + (b.divindade ? ", devoto de " + DE().DEUS[b.divindade.id].nome : "") }),
        el("div.t20-resumo-criacao", {}, [T().valor("PV", c.pv.max, c.pv.parcelas), T().valor("PM", c.pm.max, c.pm.parcelas), T().valor("Defesa", c.defesa.total, c.defesa.parcelas), T().valor("Deslocamento", c.deslocamento.terrestre + " m", c.deslocamento.parcelas)]),
        el("p.t-mini", { texto: "Perícias treinadas: " + Object.keys(c.pericias).filter(function (k) { return c.pericias[k].treinado; }).map(R().nomePericia).join(", ") }),
      ];
    }

    function desenhar() {
      var p = PASSOS[estado.passo];
      var conteudo;
      try {
        conteudo = { atributos: passoAtributos, raca: passoRaca, origem: passoOrigem, classe: passoClasse, divindade: passoDivindade, magias: passoMagias, equipamento: passoEquipamento, conferir: passoConferir }[p.chave]();
      } catch (e) { conteudo = [el("p.t-erro", { texto: "Erro ao montar o passo: " + e.message })]; }
      U.trocar(corpo, [
        el("ol.t20-passos", { "aria-label": "Passos da criação" }, PASSOS.map(function (x, i) { return el("li" + (i === estado.passo ? ".t20-passos__atual" : ""), { "aria-current": i === estado.passo ? "step" : null, texto: (i + 1) + ". " + x.nome }); })),
        el("h3.t-secao", { texto: p.nome }), el("p.t-mini", { texto: T().referencia(p.pagina) }),
        el("div.pilha", {}, conteudo),
      ]);
      /* No último passo, o botão diz o que vai acontecer. */
      var dialogo = corpo.closest ? corpo.closest("[role=dialog]") : null;
      var principal = dialogo ? dialogo.querySelector(".r-botao--principal") : null;
      if (principal) principal.textContent = estado.passo === PASSOS.length - 1 ? (ctx ? "Concluir" : "Criar ficha") : "Avançar";
    }

    function concluir(fechar) {
      b.recursos.pv = null; b.recursos.pm = null;
      if (!b.inventario.itens.length) {
        ((EQ().ITENS_INICIAIS || {}).sempre || []).forEach(function (ref) { b.inventario.itens.push(R().normalizarItem({ ref: ref, estado: ref === "trajeDeViajante" ? "vestido" : "mochila" })); });
        var ini = estado.inicial, cl = classe();
        if (!ctx && cl) {
          var c0 = calc() || { proficiencias: {} };
          var mao = "principal";
          [ini.marcial && c0.proficiencias.marciais ? ini.marcial : "", ini.simples].filter(Boolean).forEach(function (ref) { b.inventario.itens.push(R().normalizarItem({ ref: ref, estado: mao ? "empunhado" : "mochila", mao: mao || undefined })); mao = ""; });
          if (cl.id !== "arcanista" && ini.armadura) b.inventario.itens.push(R().normalizarItem({ ref: ini.armadura, estado: "vestido" }));
          if (cl.id !== "arcanista" && c0.proficiencias.escudos && ini.escudo !== false) b.inventario.itens.push(R().normalizarItem({ ref: "escudoLeve", estado: "empunhado", mao: "secundaria" }));
        }
      }
      var final = R().normalizar(b);
      if (ctx) {
        T().operar(ctx, function (bl) { Object.keys(final).forEach(function (k) { if (k !== "operacoes") bl[k] = final[k]; }); return { ok: true }; });
        if (estado.nome && estado.nome !== ctx.ficha.nome && ctx.renomear) ctx.renomear(estado.nome);
        fechar();
        return;
      }
      var F = global.RAMAFicha;
      var nova = F.criarFicha({ nome: estado.nome.trim(), tipoFicha: "tormenta20", campanhaId: estado.campanhaId || null, tormenta20: final });
      return global.RAMAApi.criarPersonagem(nova).then(function (r) {
        if (!r.ok) { UI().avisoDeFalha(r, "criação da ficha"); return; }
        fechar();
        location.href = U.url("ficha/?id=" + encodeURIComponent(r.dados.id));
      });
    }

    desenhar();
    return janela;
  }

  global.RAMATormenta20Criar = { abrir: abrir, PASSOS: PASSOS };
})(window);
