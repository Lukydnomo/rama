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
    { chave: "atributos", nome: "Atributos", pagina: 17, intro: "Dê um nome e defina os seis atributos: compre com 10 pontos ou role 4d6 seis vezes." },
    { chave: "raca", nome: "Raça", pagina: 18, intro: "A raça ajusta atributos e dá habilidades. Clique numa carta para ver os detalhes." },
    { chave: "origem", nome: "Origem", pagina: 85, intro: "O que o personagem fazia antes de se aventurar: itens e dois benefícios." },
    { chave: "classe", nome: "Classe", pagina: 32, intro: "A classe define PV, PM, perícias e o que o personagem sabe fazer." },
    { chave: "divindade", nome: "Divindade", pagina: 96, intro: "Opcional (obrigatória para clérigos, druidas e paladinos): devotos ganham um poder e seguem obrigações." },
    { chave: "magias", nome: "Magias", pagina: 170, intro: "Conjuradores começam com magias de 1º círculo." },
    { chave: "equipamento", nome: "Equipamento", pagina: 140, intro: "O equipamento inicial do livro e os tibares." },
    { chave: "conferir", nome: "Conferir", pagina: 106, intro: "Confira antes de criar. Tudo pode ser ajustado depois na ficha." },
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
    var SIGLA = { "for": "For", des: "Des", con: "Con", "int": "Int", sab: "Sab", car: "Car" };
    function textoAtributos(a) {
      var x = a || {}, l = [];
      Object.keys(x.fixo || {}).forEach(function (k) { l.push(SIGLA[k] + " " + T().sinal(x.fixo[k])); });
      if (x.escolha) l.push("+" + x.escolha.valor + " em " + x.escolha.quantidade + " à escolha");
      return l.join(", ");
    }
    /* Uma grade de cartas; a escolhida fica marcada (aria-pressed). */
    function cartas(rotulo, itens, atual, aoEscolher) {
      return el("ul.t20-cartas", { "aria-label": rotulo }, itens.map(function (x) {
        return el("li", {}, [el("button.t20-carta" + (x.indisponivel ? ".t20-carta--indisponivel" : ""), {
          type: "button", "aria-pressed": String(atual === x.id), title: x.dica || "",
          onclick: function () { aoEscolher(x.id); },
        }, [el("span.t20-carta__nome", { texto: x.nome })].concat((x.linhas || []).filter(Boolean).map(function (l) { return el("span.t20-carta__linha", { texto: l }); })))]);
      }));
    }
    function escolhido(titulo, conteudo) {
      return el("section.t20-escolhido", { "aria-label": titulo }, [el("h4.t20-escolhido__titulo", { texto: titulo })].concat(conteudo.filter(Boolean)));
    }

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
      var mods = R().modificadoresDeRaca(b);
      var quadros = R().ATR.map(function (a) {
        var base = b.atributosBase[a];
        var raca = mods[a];
        return el("div.t20-compra__atr", {}, [
          el("span.t20-compra__sigla", { texto: T().siglaAtr(a) }),
          b.metodo === "pontos" ? el("span.t20-compra__ajuste", {}, [
            T().botao("−", function () { if (base > -1) { b.atributosBase[a] = base - 1; desenhar(); } }, { rotulo: "Diminuir " + T().nomeAtr(a), motivo: base <= -1 ? "Mínimo −1 na compra." : "" }),
            el("span.t20-compra__valor", { texto: T().sinal(base), "aria-live": "polite" }),
            T().botao("+", function () { if (base < 4) { b.atributosBase[a] = base + 1; desenhar(); } }, { rotulo: "Aumentar " + T().nomeAtr(a), motivo: base >= 4 ? "Máximo 4 na compra." : "" }),
          ]) : el("span.t20-compra__valor", { texto: T().sinal(base) }),
          el("span.t20-compra__info", { texto: T().nomeAtr(a) + (b.metodo === "pontos" ? " · custo " + D().CUSTO_PONTOS[String(base)] : "") }),
          raca ? el("span.t20-compra__total", { texto: "raça " + T().sinal(raca) + " → " + (c ? T().sinal(c.atr[a]) : "") }) : null,
        ]);
      });
      return [
        UI().campo({ rotulo: "Nome do personagem", valor: estado.nome, aoMudar: function (v) { estado.nome = v; }, aoDigitar: true }),
        T().selecao("Como definir os atributos", [{ valor: "pontos", rotulo: "Compra de 10 pontos (Tabela 1-1)" }, { valor: "rolagem", rotulo: "Seis rolagens de 4d6, descartando o menor" }], b.metodo, function (v) { b.metodo = v; if (v === "pontos") R().ATR.forEach(function (a) { b.atributosBase[a] = 0; }); desenhar(); }),
        b.metodo === "pontos" ? el("p.t20-compra-saldo", { role: "status" }, [el("strong", { texto: String(cp.restante) }), el("span", { texto: " de " + D().PONTOS_INICIAIS + " pontos restantes" })]) : passoRolagem(),
        el("div.t20-compra", {}, quadros),
        el("p.t20-legenda", { texto: b.metodo === "pontos" ? "Cada valor custa: −1 devolve 1 · 0 custa 0 · 1 custa 1 · 2 custa 2 · 3 custa 4 · 4 custa 7. A raça entra no passo seguinte." : "A raça entra no passo seguinte." }),
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
      var itens = [cartas("Raças", RA().RACAS.map(function (r) {
        return { id: r.id, nome: r.nome, linhas: [r.variantes ? r.variantes.map(function (v) { return v.nome; }).join(" ou ") : textoAtributos(r.atributos), "p. " + r.pagina] };
      }), b.raca.id, function (v) { if (v !== b.raca.id) { b.raca = { id: v, variante: "", atributos: [], escolhas: {} }; } desenhar(); })];
      if (raca) {
        var det = [];
        if (raca.variantes) det.push(T().selecao("Variante", [{ valor: "", rotulo: "—" }].concat(raca.variantes.map(function (x) { return { valor: x.id, rotulo: x.nome + " (" + textoAtributos(x.atributos) + ")" }; })), b.raca.variante, function (v) { b.raca.variante = v; b.raca.atributos = []; desenhar(); }));
        if (at) det.push(el("p.t20-legenda", { texto: "Atributos: " + textoAtributos(at) + "." }));
        if (at && at.escolha) det.push(campoDeEscolha({ id: "atr", tipo: "opcao", quantidade: at.escolha.quantidade, rotulo: "Atributo +" + at.escolha.valor, opcoes: R().ATR.filter(function (a) { return (at.escolha.exceto || []).indexOf(a) < 0; }).map(function (a) { return [a, T().nomeAtr(a)]; }) }, b.raca.atributos, function (v) { b.raca.atributos = v; desenhar(); }, {}));
        RA().habilidadesDe(b.raca.id, b.raca.variante).forEach(function (h) {
          det.push(el("div.t20-habilidade", {}, [el("strong", { texto: h.nome }), el("span.t-mini", { texto: h.resumo })].concat((h.escolhas || []).map(function (e) {
            return campoDeEscolha(e, b.raca.escolhas[e.id], function (v) { b.raca.escolhas[e.id] = v; desenhar(); }, { calc: c, t20: b });
          }))));
        });
        itens.push(escolhido(raca.nome + " · p. " + raca.pagina, det));
      }
      return itens;
    }
    function passoOrigem() {
      var raca = RA().RACA[b.raca.id];
      if (raca && raca.semOrigem) return [el("p", { texto: raca.nome + " não tem origem (veja a raça, p. " + raca.pagina + ")." })];
      var o = OR().ORIGEM[b.origem.id];
      var lista = OR().ORIGENS.map(function (x) { return { id: x.id, nome: x.nome, linhas: [x.pericias.map(R().nomePericia).slice(0, 3).join(", ") + (x.pericias.length > 3 ? "…" : ""), "p. " + x.pagina] }; }).concat([{ id: "propria", nome: "Origem própria", linhas: ["Crie com o mestre", "p. 95"] }]);
      var itens = [cartas("Origens", lista, b.origem.id, function (v) { if (v !== b.origem.id) b.origem = { id: v, beneficios: [], escolhas: {}, propria: v === "propria" ? { nome: "", unico: { nome: "", resumo: "" }, itens: "" } : null }; desenhar(); })];
      if (b.origem.id === "propria") {
        var pr = b.origem.propria;
        itens.push(escolhido("Origem própria · p. 95", [
          UI().campo({ rotulo: "Nome da origem", valor: pr.nome, aoMudar: function (v) { pr.nome = v; } }),
          UI().campo({ rotulo: "Itens", valor: pr.itens, aoMudar: function (v) { pr.itens = v; } }),
          el("p.t20-legenda", { texto: "Escolha dois benefícios entre perícias e poderes gerais (o mestre aprova)." }),
          beneficiosLivres(),
        ]));
        return itens;
      }
      if (!o) return itens;
      var det = [el("p.t20-legenda", { texto: "Itens: " + o.itens.map(function (i) { return typeof i === "string" ? i : i.texto; }).join("; ") + "." })];
      if (o.especial === "mestre") { det.push(el("p", { texto: o.unico.nome + ": " + o.unico.resumo })); itens.push(escolhido(o.nome + " · p. " + o.pagina, det)); return itens; }
      var opcoes = o.pericias.map(function (k) { return { tipo: "pericia", id: k, rotulo: "Perícia: " + R().nomePericia(k) }; })
        .concat(o.poderes.map(function (k) { var p = PO().PODER[k]; return { tipo: "poder", id: k, rotulo: "Poder: " + (p ? p.nome : k), dica: p ? p.resumo : "" }; }))
        .concat(o.unico ? [{ tipo: "poder", id: o.unico.id, rotulo: "Poder único: " + o.unico.nome, dica: o.unico.resumo }] : []);
      det.push(el("fieldset.t20-beneficios", {}, [el("legend", { texto: "Escolha " + OR().BENEFICIOS + " benefícios (" + b.origem.beneficios.length + "/" + OR().BENEFICIOS + ")" })].concat(opcoes.map(function (x) {
        var marcado = b.origem.beneficios.some(function (y) { return y.id === x.id; });
        return el("label.r-marca", { title: x.dica || "" }, [el("input", { type: "checkbox", checked: marcado, onchange: function (ev) {
          if (ev.currentTarget.checked) { if (b.origem.beneficios.length >= OR().BENEFICIOS) { ev.currentTarget.checked = false; UI().avisoAtencao("Já há " + OR().BENEFICIOS + " benefícios."); return; } b.origem.beneficios.push({ tipo: x.tipo, id: x.id, escolhas: {} }); }
          else b.origem.beneficios = b.origem.beneficios.filter(function (y) { return y.id !== x.id; });
          desenhar();
        } }), el("span", { texto: x.rotulo })]);
      }))));
      var benOf = b.origem.beneficios.filter(function (y) { return y.tipo === "pericia" && y.id === "oficio"; })[0];
      if (benOf) det.push(T().selecao("Especialização do Ofício da origem", [{ valor: "", rotulo: "—" }].concat(D().OFICIOS.map(function (o2) { return { valor: o2.chave, rotulo: o2.nome }; })), (benOf.escolhas || {}).oficio || "", function (v) { benOf.escolhas = benOf.escolhas || {}; benOf.escolhas.oficio = v; desenhar(); }));
      if (o.unico) det.push(el("p.t20-legenda", { texto: o.unico.nome + ": " + o.unico.resumo }));
      (o.qualquer || []).forEach(function (g) { det.push(el("p.t20-legenda", { texto: "Esta origem também permite poderes de " + g + " no lugar dos listados; escolha depois na ficha (Habilidades → Poder avulso), com o mestre." })); });
      itens.push(escolhido(o.nome + " · p. " + o.pagina, det));
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
      var itens = [cartas("Classes", CL().CLASSES.map(function (x) {
        return { id: x.id, nome: x.nome, linhas: ["PV " + x.pv.inicial + " + Con · PM " + x.pm + "/nível", x.atributo, "p. " + x.pagina] };
      }), estado.classe, function (v) { if (v !== estado.classe) { estado.classe = v; b.niveis = v ? [{ classe: v, escolhas: {} }] : []; b.magias = []; b.periciasInt = []; } desenhar(); })];
      if (!cl) return itens;
      var esc = nivel1().escolhas;
      var det = [el("p.t20-legenda", { texto: "Perícias fixas: " + (cl.pericias.fixas.map(R().nomePericia).join(", ") || "—") + " · Proficiências: " + (cl.proficiencias.join(", ") || "só armas simples e armaduras leves") + "." })];
      (cl.pericias.ou || []).forEach(function (par, i) {
        esc.ou = esc.ou || [];
        det.push(T().selecao("Perícia (uma das duas)", par.map(function (k) { return { valor: k, rotulo: R().nomePericia(k) }; }), esc.ou[i] || par[0], function (v) { esc.ou[i] = v; desenhar(); }));
      });
      det.push(campoDeEscolha({ id: "pericias", tipo: "opcao", quantidade: cl.pericias.escolha.n, rotulo: "Perícia da classe", opcoes: cl.pericias.escolha.de.map(function (k) { return [k, R().nomePericia(k)]; }) }, esc.pericias || [], function (v) { esc.pericias = v; desenhar(); }, {}));
      var quantosOficios = cl.pericias.fixas.concat((cl.pericias.ou || []).map(function (par, i) { return (esc.ou || [])[i] || par[0]; })).concat(esc.pericias || []).filter(function (k) { return k === "oficio"; }).length;
      for (var iOf = 0; iOf < quantosOficios; iOf++) {
        (function (i) {
          esc.oficios = esc.oficios || [];
          det.push(T().selecao("Especialização do Ofício" + (quantosOficios > 1 ? " " + (i + 1) : ""), [{ valor: "", rotulo: "—" }].concat(D().OFICIOS.map(function (o) { return { valor: o.chave, rotulo: o.nome }; })), esc.oficios[i] || "", function (v) { esc.oficios[i] = v; desenhar(); }));
        })(iOf);
      }
      var nInt = c ? Math.max(0, c.atr["int"]) : 0;
      if (nInt) det.push(campoDeEscolha({ id: "int", tipo: "opcao", quantidade: nInt, rotulo: "Perícia pela Inteligência", opcoes: D().PERICIAS.filter(function (p) { return p.chave !== "oficio"; }).map(function (p) { return [p.chave, p.nome]; }).concat(D().OFICIOS.map(function (o) { return ["oficio:" + o.chave, "Ofício (" + o.nome + ")"]; })) }, b.periciasInt, function (v) { b.periciasInt = v; desenhar(); }, {}));
      (cl.tabela[1] || []).forEach(function (hid) {
        var h = cl.habilidades[hid];
        if (!h) return;
        det.push(el("div.t20-habilidade", {}, [el("strong", { texto: h.nome }), el("span.t-mini", { texto: h.resumo })].concat((h.escolhas || []).map(function (e) {
          return campoDeEscolha(e, esc[e.id], function (v) { esc[e.id] = v; desenhar(); }, { calc: c, t20: b, classe: cl.id });
        }))));
      });
      itens.push(escolhido(cl.nome + " · p. " + cl.pagina, det));
      return itens;
    }
    function passoDivindade() {
      var nv = b.niveis.map(function (n) { return n.classe; });
      var dv = b.divindade && DE().DEUS[b.divindade.id];
      var lista = [{ id: "", nome: "Nenhuma", linhas: ["Não devoto"] }].concat(DE().DEUSES.map(function (d) {
        var pode = DE().podeSerDevoto(d, b.raca.id, b.raca.variante, nv);
        return { id: d.id, nome: d.nome, linhas: [d.titulo || "", pode === false ? "Sua raça e classe não estão entre os devotos" : pode === null ? "O mestre decide" : "p. " + d.pagina], indisponivel: pode === false, dica: pode === false ? "Não pode ser devoto" : "" };
      }));
      var itens = [cartas("Divindades", lista, b.divindade ? b.divindade.id : "", function (v) {
        var d = v && DE().DEUS[v];
        if (d && DE().podeSerDevoto(d, b.raca.id, b.raca.variante, nv) === false) { UI().avisoAtencao("Sua raça e classe não estão entre os devotos de " + d.nome + "."); return; }
        b.divindade = v ? { id: v, energia: "", poderes: [] } : null; desenhar();
      })];
      if (dv) {
        itens.push(escolhido(dv.nome + " · p. " + dv.pagina, [
          el("p", {}, [el("strong", { texto: "Obrigações e restrições: " }), el("span", { texto: dv.obrigacoes })]),
          el("p.t20-legenda", { texto: "Energia: " + dv.energia + " · arma preferida: " + (EQ().ITEM[dv.armaPreferida] ? EQ().ITEM[dv.armaPreferida].nome : dv.armaPreferida) }),
          dv.energia === "qualquer" ? T().selecao("Energia canalizada (definitiva)", [{ valor: "positiva", rotulo: "Positiva" }, { valor: "negativa", rotulo: "Negativa" }], b.divindade.energia || "positiva", function (v) { b.divindade.energia = v; }) : null,
          el("fieldset.t20-beneficios", {}, [el("legend", { texto: "Poder concedido (escolha um)" })].concat(dv.poderes.map(function (k) {
            var pz = PO().PODER[k];
            return el("label.r-marca", {}, [el("input", { type: "radio", name: "t20-poder-concedido", checked: !!(b.divindade.poderes[0] && b.divindade.poderes[0].id === k), onchange: function () { b.divindade.poderes = [{ id: k, escolhas: {} }]; desenhar(); } }), el("span", {}, [el("strong", { texto: pz ? pz.nome : k }), el("span.t-mini", { texto: pz ? " — " + pz.resumo : "" })])]);
          }))),
        ]));
      }
      return itens;
    }
    function passoMagias() {
      var cl = classe();
      var n = magiasIniciais();
      if (!n) return [el("p", { texto: cl ? cl.nome + " não começa com magias de classe. Pode avançar." : "Escolha a classe antes." })];
      var c = calc();
      var fs = c.magias.fontes["classe:" + cl.id];
      var disponiveis = MG().MAGIAS.filter(function (m) { return MG().disponivel(m, { tipo: fs.tipo, circuloMax: 1, escolas: fs.escolas }); }).sort(function (a, z) { return a.nome.localeCompare(z.nome); });
      var escolhidas = b.magias.map(function (m) { return m.id; });
      return [
        escolhido("Escolha " + n + " magia(s) de 1º círculo (" + escolhidas.length + "/" + n + ")", [
          el("p.t20-legenda", { texto: humanizarTipo(fs.tipo) + (fs.escolas ? " · escolas " + fs.escolas.join(", ") : "") + " · CD " + fs.cd + " (" + T().nomeAtr(fs.atributo) + ") · 1 PM cada." }),
          el("div.t20-beneficios", { role: "group", "aria-label": "Magias de 1º círculo" }, disponiveis.map(function (m) {
            var marcada = escolhidas.indexOf(m.id) >= 0;
            return el("label.r-marca", { title: m.resumo }, [el("input", { type: "checkbox", checked: marcada, onchange: function (ev) {
              var lista = b.magias.map(function (x) { return x.id; });
              if (ev.currentTarget.checked) { if (lista.length >= n) { ev.currentTarget.checked = false; UI().avisoAtencao("Já há " + n + " magias."); return; } lista.push(m.id); }
              else lista = lista.filter(function (x) { return x !== m.id; });
              b.magias = lista.map(function (id) { return { id: id, fonte: "classe:" + cl.id, atributo: "", memorizada: true }; });
              desenhar();
            } }), el("span", {}, [el("strong", { texto: m.nome }), el("span.t-mini", { texto: " — " + m.resumo })])]);
          })),
        ]),
      ];
    }
    function humanizarTipo(t) { return t === "arcana" ? "Arcanas" : t === "divina" ? "Divinas" : "Universais"; }
    function passoEquipamento() {
      var cl = classe();
      var o = OR().ORIGEM[b.origem.id];
      return [
        escolhido("Sempre", [
          el("p", { texto: "Mochila, saco de dormir e traje de viajante." + (o ? " Da origem: " + o.itens.map(function (i) { return typeof i === "string" ? i : i.texto; }).join("; ") + "." : "") }),
          el("div.faixa", {}, [T().botao("Rolar T$ 4d6", function () { var r = T().rolarExpressao("Dinheiro inicial", "4d6", "teste"); b.inventario.tibar = r.total; desenhar(); }), el("strong", { role: "status", texto: "T$ " + b.inventario.tibar })]),
        ]),
        ctx ? null : escolhido("Armas e armadura (grátis)", escolhasIniciais(cl)),
        el("p.t20-legenda", { texto: "O resto se compra na aba Equipamento da ficha, pelo preço da Tabela 3-3." }),
      ];
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
      var itens = [];
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
      var dv = b.divindade && DE().DEUS[b.divindade.id];
      return [
        escolhido(estado.nome || "Sem nome", [
          el("p", { texto: [(RA().RACA[b.raca.id] || {}).nome, (OR().ORIGEM[b.origem.id] || {}).nome || (b.origem.propria && b.origem.propria.nome), (classe() || {}).nome + " 1", dv ? "devoto de " + dv.nome : ""].filter(Boolean).join(" · ") }),
          el("div.t20-resumo-criacao", {}, [T().valor("PV", c.pv.max, c.pv.parcelas), T().valor("PM", c.pm.max, c.pm.parcelas), T().valor("Defesa", c.defesa.total, c.defesa.parcelas), T().valor("Deslocamento", c.deslocamento.terrestre + " m", c.deslocamento.parcelas)]),
          el("p.t20-legenda", { texto: "Perícias treinadas: " + Object.keys(c.pericias).filter(function (k) { return c.pericias[k].treinado; }).map(R().nomePericia).join(", ") + "." }),
          b.magias.length ? el("p.t20-legenda", { texto: "Magias: " + b.magias.map(function (m) { return (MG().MAGIA[m.id] || {}).nome; }).join(", ") + "." }) : null,
        ]),
      ];
    }
    function resumoLateral() {
      var c = calc();
      if (!c) return null;
      var cl = classe();
      return el("aside.t20-criar__resumo", { "aria-label": "Resumo do personagem" }, [
        el("h4", { texto: estado.nome || "Novo personagem" }),
        el("span.t-mini", { texto: [(RA().RACA[b.raca.id] || {}).nome, (OR().ORIGEM[b.origem.id] || {}).nome, cl ? cl.nome + " 1" : ""].filter(Boolean).join(" · ") || "Escolhas em andamento" }),
        el("div.t20-criar__atrs", {}, R().ATR.map(function (a) { return el("div", {}, [el("span", { texto: T().siglaAtr(a) }), el("strong", { texto: T().sinal(c.atr[a]) })]); })),
        cl ? el("div.t20-criar__vitais", {}, [["PV", c.pv.max], ["PM", c.pm.max], ["Defesa", c.defesa.total]].map(function (x) { return el("div", {}, [el("strong", { texto: String(x[1]) }), el("span", { texto: x[0] })]); })) : null,
        cl ? el("p.t20-criar__extra", { texto: "Treinado em " + Object.keys(c.pericias).filter(function (k) { return c.pericias[k].treinado; }).length + " perícias." }) : null,
      ]);
    }
    function podeIrPara(i) { for (var k = 0; k < i; k++) if (pendencia(k)) return false; return true; }
    function desenhar() {
      var p = PASSOS[estado.passo];
      var conteudo;
      try {
        conteudo = { atributos: passoAtributos, raca: passoRaca, origem: passoOrigem, classe: passoClasse, divindade: passoDivindade, magias: passoMagias, equipamento: passoEquipamento, conferir: passoConferir }[p.chave]();
      } catch (e) { conteudo = [el("p.t-erro", { texto: "Erro ao montar o passo: " + e.message })]; }
      var rolagem = corpo.closest ? corpo.closest(".r-modal__corpo, [role=dialog]") : null;
      U.trocar(corpo, [
        el("ol.t20-passos", { "aria-label": "Passos da criação" }, PASSOS.map(function (x, i) {
          var feito = i < estado.passo && !pendencia(i);
          return el("li", {}, [el("button.t20-passo" + (i === estado.passo ? ".t20-passo--atual" : "") + (feito ? ".t20-passo--feito" : ""), {
            type: "button", "aria-current": i === estado.passo ? "step" : null, disabled: i !== estado.passo && !podeIrPara(i),
            "aria-label": (i + 1) + ". " + x.nome + (feito ? " (feito)" : ""),
            onclick: function () { if (i !== estado.passo && podeIrPara(i)) { estado.passo = i; desenhar(); } },
          }, [el("span.t20-passo__n", {}, [el("span", { texto: String(i + 1) })]), el("span", { texto: x.nome })])]);
        })),
        el("div.t20-criar__grade" + (p.chave === "atributos" ? ".t20-criar__grade--so" : ""), {}, [
          el("div.t20-criar__principal", {}, [
            el("p.t20-criar__intro", {}, [el("span", { texto: p.intro }), el("span.t-mini", { texto: " · " + T().referencia(p.pagina) })]),
            el("div.pilha", {}, conteudo),
          ]),
          p.chave === "atributos" ? null : resumoLateral(),
        ]),
      ]);
      if (rolagem && estado.ultimoPasso !== estado.passo) { rolagem.scrollTop = 0; estado.ultimoPasso = estado.passo; }
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
