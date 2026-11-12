/* =====================================================================
   R.A.M.A. — Homebrew: criaturas de Oblívio, Vampiro e Goblins (v6.8)
   ---------------------------------------------------------------------
   O editor de cada sistema, com os campos da ficha do livro dele, e o
   resumo do cartão do Homebrew. O formato gravado é o do catálogo do
   sistema (ver "CRIATURAS DOS OUTROS SISTEMAS" em js/criaturas.js); a
   consulta usa a ficha nativa (js/fichas-nativas.js).

     editar(criatura|null, aoSalvar, { sistema, modelo })
     detalhes(criatura) → o resumo do cartão

   Listas de perícias e disciplinas (V5) se escrevem como no livro —
   "Atletismo 5, Briga 4" — e são conferidas contra o catálogo do
   sistema: nome desconhecido não grava. Ordem e Universal continuam
   no editor de sempre (js/paginas/homebrew-criatura.js).
   ===================================================================== */
(function (global) {
  "use strict";
  var U = global.RAMAUtil, UI = global.RAMAUI, el = U.el;
  function C() { return global.RAMACriaturas; }
  function FN() { return global.RAMAFichasNativas; }

  var NOMES_ACAO = { regular: "Ação Regular", extra: "Ação Extra", movimento: "Ação de Movimento", completa: "Ação Completa", passiva: "Efeito Passivo" };
  var NAT_VAMPIRO = [["mortal", "Mortal"], ["carnical", "Carniçal"], ["animal", "Animal"], ["vampiro", "Vampiro"], ["criatura", "Criatura de horror"]];

  /* ---------- peças do formulário ---------- */

  function numero(rotulo, valor, max) {
    var c = UI.campo({ rotulo: rotulo, tipo: "numero", valor: valor === null || valor === undefined ? "" : String(valor), limite: String(max || 99).length });
    c.valor = function () { var n = parseInt(c.entrada.value, 10); return Number.isFinite(n) ? n : null; };
    return c;
  }
  function texto(rotulo, valor, limite, area) {
    var c = UI.campo({ rotulo: rotulo, valor: valor || "", limite: limite || 120, tipo: area ? "area" : undefined, linhas: area ? 3 : undefined });
    c.valor = function () { return c.entrada.value.trim(); };
    return c;
  }
  function selecao(rotulo, opcoes, valor) {
    var c = UI.campo({ rotulo: rotulo, tipo: "selecao", valor: valor, opcoes: opcoes.map(function (o) { return { valor: o[0], rotulo: o[1] }; }) });
    c.valor = function () { return c.entrada.value; };
    return c;
  }
  function grade(campos) { return el("div.editar-grade", {}, campos); }
  function secao(titulo, partes) { return el("fieldset.r-campo.hb-sistema__secao", {}, [el("legend.t-secao", { texto: titulo })].concat(partes.filter(Boolean))); }
  function marca(rotulo, ligado) {
    var cb = el("input", { type: "checkbox", checked: !!ligado });
    return { no: el("label.r-marca", {}, [cb, el("span", { texto: rotulo })]), valor: function () { return cb.checked; } };
  }

  /* Uma lista editável (habilidades, recompensa): cada linha é um
     objeto com `no` e `valor()`. */
  function listaEditavel(rotuloAdicionar, iniciais, novaLinha, max) {
    var linhas = [];
    var caixa = el("div.pilha--curta.hb-sistema__lista", { class: "pilha" });
    function pintar() {
      U.trocar(caixa, linhas.map(function (l, i) {
        return el("div.hb-sistema__linha", {}, [l.no, el("button.r-botao.r-botao--mini.r-botao--fantasma", {
          type: "button", texto: "Remover", "aria-label": "Remover a linha " + (i + 1),
          onclick: function () { linhas.splice(i, 1); pintar(); },
        })]);
      }).concat([linhas.length < (max || 30) ? el("button.r-botao.r-botao--mini", { type: "button", texto: rotuloAdicionar, onclick: function () { linhas.push(novaLinha({})); pintar(); } }) : null]));
    }
    (iniciais || []).forEach(function (x) { linhas.push(novaLinha(x)); });
    pintar();
    return { no: caixa, valor: function () { return linhas.map(function (l) { return l.valor(); }).filter(Boolean); } };
  }

  /* "Atletismo 5, Briga 4" ↔ { atletismo: 5, briga: 4 }, conferido
     contra uma lista do catálogo ({ chave, nome } ou mapa). */
  function catalogoDeNomes(fonte) {
    var itens = Array.isArray(fonte) ? fonte : Object.keys(fonte || {}).map(function (k) { return { chave: k, nome: fonte[k].nome }; });
    var porNome = {};
    itens.forEach(function (x) { porNome[U.chaveDeBusca(x.nome)] = x.chave; });
    return {
      texto: function (mapa) { return Object.keys(mapa || {}).map(function (k) { var x = itens.filter(function (i) { return i.chave === k; })[0]; return (x ? x.nome : k) + " " + mapa[k]; }).join(", "); },
      ler: function (t) {
        var mapa = {}, desconhecidos = [];
        String(t || "").split(/[,;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (parte) {
          var m = /^(.*?)\s+(\d{1,2})$/.exec(parte);
          var chave = m ? porNome[U.chaveDeBusca(m[1])] : null;
          if (!m || !chave) { desconhecidos.push(parte); return; }
          mapa[chave] = Number(m[2]);
        });
        return { mapa: mapa, desconhecidos: desconhecidos };
      },
      exemplos: itens.slice(0, 4).map(function (x) { return x.nome; }).join(", "),
    };
  }

  /* ---------- formulários de cada sistema ---------- */

  function formOblivio(b) {
    var OC = global.RAMAOblivioCatalogo || {};
    var grau = selecao("Grau", [1, 2, 3, 4, 5, 6].map(function (g) { return [String(g), "Grau " + g]; }), String(b.grau));
    var dano = numero("Dano", b.dano), prot = numero("Proteção", b.protecao), vel = numero("Velocidade", b.velocidade);
    var tam = texto("Tamanho", b.tamanho, 60), casas = texto("Casas", b.casas, 20);
    var lim = numero("Limite de Estresse", b.limiteEstresse, 999), reg = numero("Regiões", b.regioes);
    var atrs = (OC.ATRIBUTOS || []).map(function (a) { var c = numero(a.nome, b.atributos[a.chave], 20); c.chave = a.chave; return c; });
    var conhecimentos = (OC.CONHECIMENTOS || []).map(function (k) { var m = marca(k.nome, b.especializacoes.indexOf(k.chave) >= 0); m.chave = k.chave; return m; });
    var habs = listaEditavel("+ Habilidade", b.habilidades, function (h) {
      var n = texto("Nome", h.nome, 80), a = selecao("Tipo de ação", Object.keys(NOMES_ACAO).map(function (k) { return [k, NOMES_ACAO[k]]; }), h.acao || "regular");
      var d = texto("Dano", h.dano, 40), al = texto("Alcance", h.alcance, 40), r = texto("Efeito", h.resumo, 1500, true);
      return { no: el("div.pilha--curta", { class: "pilha" }, [grade([n.no || n, a.no || a, d.no || d, al.no || al]), r.no || r]),
        valor: function () { return n.valor() ? { nome: n.valor(), acao: a.valor(), dano: d.valor(), alcance: al.valor(), resumo: r.valor() } : null; } };
    });
    var rec = listaEditavel("+ Linha da recompensa", b.recompensa.map(function (r) {
      return { de: r.de, ate: r.ate, texto: r.texto || (r.itens.length && FN() ? r.itens.map(FN().itemDeRecompensa).join(" e ") : (r.itens.length ? "" : "Nada")) };
    }), function (r) {
      var de = numero("1d6 de", r.de, 6), ate = numero("até", r.ate, 6), t = texto("Recompensa", r.texto, 200);
      return { no: grade([de.no || de, ate.no || ate, t.no || t]), valor: function () { return de.valor() ? { de: de.valor(), ate: ate.valor() || de.valor(), texto: t.valor() || "Nada" } : null; } };
    }, 6);
    return {
      nos: [
        secao("Destaques", [grade([grau, dano, prot, vel, tam, lim, reg, casas])]),
        secao("Atributos", [grade(atrs)]),
        secao("Conhecimento especializado", [el("div.faixa", {}, conhecimentos.map(function (m) { return m.no; }))]),
        secao("Habilidades", [habs.no]),
        secao("Tabela de recompensa (1d6)", [rec.no]),
      ],
      ler: function () {
        var at = {};
        atrs.forEach(function (c) { at[c.chave] = c.valor() || 0; });
        return { ok: true, bloco: { grau: Number(grau.valor()), dano: dano.valor(), protecao: prot.valor(), velocidade: vel.valor(), tamanho: tam.valor(), casas: casas.valor(),
          limiteEstresse: lim.valor(), regioes: reg.valor(), atributos: at,
          especializacoes: conhecimentos.filter(function (m) { return m.valor(); }).map(function (m) { return m.chave; }),
          habilidades: habs.valor(), recompensa: rec.valor() } };
      },
    };
  }

  function formVampiro(b) {
    var VC = global.RAMAVampiroCatalogo || {};
    var VD = global.RAMAVampiroDisciplinas || {};
    var habNomes = catalogoDeNomes(VC.HABILIDADES), discNomes = catalogoDeNomes(VD.DISCIPLINAS);
    var completo = b.modelo === "completo";
    var natureza = selecao("Natureza", NAT_VAMPIRO, b.natureza);
    var vit = numero("Vitalidade", b.vitalidade, 30), fdv = numero("Força de Vontade", b.forcaDeVontade, 30);
    var especial = texto("Especial (regras próprias)", b.especial, 1500, true);
    var semFome = marca("Sem Fome (criatura que não se alimenta de sangue: a Checagem vira dano Superficial, p. 376)", b.semFome);
    var nos = [], ler;
    if (!completo) {
      var p = b.paradas || {};
      var fis = numero("Físico", p.fisico, 20), soc = numero("Social", p.social, 20), men = numero("Mental", p.mental, 20);
      var exc = texto("Paradas de dados excepcionais", habNomes.texto(b.excepcionais), 600, true);
      var de = numero("Dano extra", b.danoExtra || 0, 10);
      nos = [secao("Antagonista (modelo compacto, p. 370)", [grade([natureza, vit, fdv, de])]),
        secao("Paradas de dados padrão", [grade([fis, soc, men])]),
        secao("Excepcionais", [exc, el("p.r-ajuda", { texto: "Como no livro: “Atletismo 5, Armas de Fogo 5”. Os nomes são os das Habilidades do V5." })]),
        secao("Especial", [especial])];
      ler = function () {
        var r = habNomes.ler(exc.valor());
        if (r.desconhecidos.length) return { ok: false, motivo: "Excepcionais não reconhecidas: " + r.desconhecidos.join("; ") + "." };
        return { ok: true, bloco: { modelo: "compacto", natureza: natureza.valor(), vitalidade: vit.valor(), forcaDeVontade: fdv.valor(), especial: especial.valor(),
          paradas: { fisico: fis.valor(), social: soc.valor(), mental: men.valor() }, excepcionais: r.mapa, danoExtra: de.valor() } };
      };
    } else {
      var at = b.atributos || {};
      var atrs = (VC.ATRIBUTOS || []).map(function (a) { var c = numero(a.nome, at[a.chave], 10); c.chave = a.chave; return c; });
      var hu = numero("Humanidade", b.humanidade, 10), po = numero("Potência do Sangue", b.potencia, 10);
      var habs = texto("Habilidades", habNomes.texto(b.habilidades), 1000, true);
      var discs = texto("Disciplinas", discNomes.texto(b.disciplinas), 400, true);
      nos = [secao("Ficha completa (p. 374)", [grade([natureza, vit, fdv, hu, po]), semFome.no]),
        secao("Atributos", [grade(atrs)]),
        secao("Habilidades e Disciplinas", [habs, discs, el("p.r-ajuda", { texto: "Como no livro: “Erudição 2, Percepção 4” e “Auspícios 3, Presença 3”." })]),
        secao("Especial", [especial])];
      ler = function () {
        var rh = habNomes.ler(habs.valor()), rd = discNomes.ler(discs.valor());
        var ruins = rh.desconhecidos.concat(rd.desconhecidos);
        if (ruins.length) return { ok: false, motivo: "Não reconhecidos: " + ruins.join("; ") + "." };
        var a = {};
        atrs.forEach(function (c) { a[c.chave] = c.valor() === null ? 1 : c.valor(); });
        return { ok: true, bloco: { modelo: "completo", natureza: natureza.valor(), vitalidade: vit.valor(), forcaDeVontade: fdv.valor(), especial: especial.valor(),
          semFome: semFome.valor(), atributos: a, habilidades: rh.mapa, disciplinas: rd.mapa, humanidade: hu.valor(), potencia: po.valor() } };
      };
    }
    return { nos: nos, ler: ler };
  }

  /* Cada atributo dos Goblins: um número, "—" (não existe) ou "?" (sem número). */
  function atributoGoblin(rotulo, v) {
    var modo = v === null ? "nulo" : (v === "?" ? "indefinido" : "numero");
    var m = selecao(rotulo + " — tipo", [["numero", "Número"], ["nulo", "— (não existe)"], ["indefinido", "? (indefinido)"]], modo);
    var n = numero(rotulo, typeof v === "number" ? v : "", 9999);
    function sincronizar() { n.entrada.disabled = m.valor() !== "numero"; }
    m.entrada.addEventListener("change", sincronizar);
    sincronizar();
    return { nos: [n, m], valor: function () { return m.valor() === "nulo" ? null : (m.valor() === "indefinido" ? "?" : (n.valor() === null ? 0 : n.valor())); } };
  }

  function formGoblins(b) {
    var co = atributoGoblin("Combate", b.combate), no = atributoGoblin("Noção", b.nocao), ha = atributoGoblin("Habilidade", b.habilidade), vi = atributoGoblin("Vitalidade", b.vitalidade);
    var bc = numero("Bônus da arma (no Combate)", b.bonusCombate), pr = numero("Proteção (na Vitalidade)", b.protecao);
    var eq = texto("Equipamento", b.equip, 200), es = texto("Espécie", b.especie, 40), nota = texto("Nota", b.nota, 500, true);
    var indes = marca("Indescritível: sem número nenhum (como a Besta, p. 23)", b.indescritivel);
    var habs = listaEditavel("+ Efeito", b.habilidades, function (h) {
      var n = texto("Nome", h.nome, 80), t = texto("Efeito", h.texto, 800, true);
      return { no: el("div.pilha--curta", { class: "pilha" }, [n, t]), valor: function () { return n.valor() ? { nome: n.valor(), texto: t.valor() } : null; } };
    }, 20);
    return {
      nos: [
        secao("Bloco do inimigo (p. 21)", [grade(co.nos.concat(no.nos, ha.nos, vi.nos)), grade([bc, pr]),
          el("p.r-ajuda", { texto: "0 é zero; “—” é atributo que não existe; “?” é indefinido. O bônus da arma e a proteção ficam à parte do valor base." }), indes.no]),
        secao("Equipamento e efeitos", [grade([eq, es]), habs.no, nota]),
      ],
      ler: function () {
        return { ok: true, bloco: { combate: co.valor(), nocao: no.valor(), habilidade: ha.valor(), vitalidade: vi.valor(), bonusCombate: bc.valor(), protecao: pr.valor(),
          equip: eq.valor(), especie: es.valor(), nota: nota.valor(), habilidades: habs.valor(), indescritivel: indes.valor() } };
      },
    };
  }

  /* Tormenta20 (v8.0): a ficha de ameaça — ND, defesas, ataques e
     habilidades, no formato do catálogo. Para NPCs rápidos, a mesa tem o
     gerador da Tabela 7-2. */
  function formTormenta20(b) {
    var nd = texto("ND (1/4, 1/2, 1…20)", b.nd, 6);
    var tipo = selecao("Tipo", [["animal", "Animal"], ["construto", "Construto"], ["espirito", "Espírito"], ["humanoide", "Humanoide"], ["monstro", "Monstro"], ["mortoVivo", "Morto-vivo"]], b.tipo);
    var tam = selecao("Tamanho", [["minusculo", "Minúsculo"], ["pequeno", "Pequeno"], ["medio", "Médio"], ["grande", "Grande"], ["enorme", "Enorme"], ["colossal", "Colossal"]], b.tam);
    var papel = selecao("Papel", [["solo", "Solo"], ["lacaio", "Lacaio"], ["especial", "Especial"]], b.papel);
    var nums = [["ini", "Iniciativa"], ["per", "Percepção"], ["def", "Defesa"], ["fort", "Fortitude"], ["ref", "Reflexos"], ["von", "Vontade"], ["pv", "PV"], ["pm", "PM"], ["desl", "Deslocamento (m)"]].map(function (x) { var c = numero(x[1], b[x[0]], 99999); c.chave = x[0]; return c; });
    var atrs = ["For", "Des", "Con", "Int", "Sab", "Car"].map(function (r, i) { var c = texto(r + " (— se nulo)", b.atr && b.atr[i] === null ? "—" : String(b.atr ? b.atr[i] : 0), 4); return c; });
    var rd = texto("Redução de dano (geral 5, fogo 10…)", Object.keys(b.rd || {}).map(function (k) { return k + " " + b.rd[k]; }).join(", "), 200);
    var imune = texto("Imunidades (separadas por vírgula)", (b.imune || []).join(", "), 300), vulner = texto("Vulnerabilidades", (b.vulner || []).join(", "), 200);
    var ataques = listaEditavel("+ Ataque", b.ataques, function (a) {
      var n = texto("Nome", a.n, 80), bo = numero("Bônus", a.a, 99), d = texto("Dano (1d8+6)", a.d, 40), x = texto("Extra (1d6 fogo)", a.x, 60), m = numero("Margem", a.m || 20, 20), c = numero("Multiplicador", a.c || 2, 6), t = texto("Tipo (C, I, P)", a.t, 20), q = numero("Quantidade", a.q || 1, 10), di = marca("À distância", a.dist);
      return { no: grade([n, bo, d, x, m, c, t, q, di.no]), valor: function () { return n.valor() ? { n: n.valor(), a: bo.valor() || 0, d: d.valor(), x: x.valor(), m: m.valor() || 20, c: c.valor() || 2, t: t.valor(), q: q.valor() || 1, dist: di.valor() } : null; } };
    }, 12);
    var habs = listaEditavel("+ Habilidade", b.habs, function (h) {
      var n = texto("Nome", h.n, 80), a = selecao("Ação", [["", "Passiva"], ["padrao", "Padrão"], ["movimento", "Movimento"], ["completa", "Completa"], ["livre", "Livre"], ["reacao", "Reação"]], h.acao || ""), pm = numero("PM", h.pm, 99), dn = texto("Dano", h.dano, 40), r = texto("Efeito", h.r, 1500, true);
      return { no: el("div.pilha--curta", { class: "pilha" }, [grade([n, a, pm, dn]), r]), valor: function () { return n.valor() ? { n: n.valor(), acao: a.valor(), pm: pm.valor() || 0, dano: dn.valor(), r: r.valor() } : null; } };
    }, 20);
    var tesouro = selecao("Tesouro", [["nenhum", "Nenhum"], ["metade", "Metade"], ["padrao", "Padrão"], ["dobro", "Dobro"]], b.tesouro || "padrao");
    var equip = texto("Equipamento", b.equip, 300), resumo = texto("Resumo", b.resumo, 600, true);
    function listaTexto(v) { return String(v || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean); }
    return {
      nos: [secao("Identidade (p. 282–284)", [grade([nd, tipo, tam, papel])]), secao("Números", [grade(nums), grade(atrs)]), secao("Defesas", [grade([rd, imune, vulner])]), secao("Ataques", [ataques.no]), secao("Habilidades", [habs.no]), secao("Outros", [grade([tesouro, equip]), resumo])],
      ler: function () {
        var bloco = { nd: nd.valor() || "1", tipo: tipo.valor(), tam: tam.valor(), papel: papel.valor(), rd: {}, imune: listaTexto(imune.valor()), vulner: listaTexto(vulner.valor()), ataques: ataques.valor().map(function (a, i) { a.id = "a" + i; return a; }), habs: habs.valor(), tesouro: tesouro.valor(), equip: equip.valor(), resumo: resumo.valor() };
        nums.forEach(function (c) { bloco[c.chave] = c.valor() || 0; });
        bloco.atr = atrs.map(function (c) { var v = c.valor(); return v === "—" || v === "-" ? null : (parseInt(v, 10) || 0); });
        listaTexto(rd.valor()).forEach(function (p) { var m = /^(.*?)\s*(\d+)$/.exec(p); if (m) bloco.rd[m[1].trim() || "geral"] = Number(m[2]); });
        if (!bloco.pv) return { ok: false, motivo: "Informe os PV." };
        return { ok: true, bloco: bloco };
      },
    };
  }

  var FORMS = { oblivio: formOblivio, vampiro: formVampiro, goblins: formGoblins, tormenta20: formTormenta20 };

  /* ---------- o editor ---------- */

  function editar(original, aoSalvar, opcoes) {
    var o = opcoes || {};
    var criando = !original;
    var c = criando ? C().criarNativa(o.sistema, { modelo: o.modelo }) : C().normalizar(original);
    if (!criando && original.id) c.id = original.id;
    var sistema = c.sistema;
    var visibilidade = c.visibilidade;
    var nome = texto("Nome", c.nome, 120);
    var categoria = texto("Categoria (opcional)", c.categoria, 60);
    var descricao = texto("Descrição", c.descricao, 4000, true);
    var seletorVis = el("div.filtros__grupo", { role: "group", "aria-label": "Visibilidade" },
      [{ v: "privado", r: "Privada" }, { v: "publico", r: "Pública" }].map(function (op) {
        return el("button.filtro", {
          type: "button", "aria-pressed": String(visibilidade === op.v), texto: op.r,
          onclick: function (ev) { visibilidade = op.v; U.$$(".filtro", ev.target.parentNode).forEach(function (b) { b.setAttribute("aria-pressed", String(b === ev.target)); }); },
        });
      }));
    var form = FORMS[sistema](c[sistema]);
    var previa = el("div.hb-sistema__previa");
    function verPrevia() {
      var r = form.ler();
      if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
      var bruta = { tipo: "criatura", sistema: sistema, nome: nome.valor() || c.nome, categoria: categoria.valor(), descricao: descricao.valor() };
      bruta[sistema] = r.bloco;
      U.trocar(previa, [global.RAMACriaturaPainel.criar(C().normalizar(bruta), { consulta: true, rotulo: "Prévia" }).raiz]);
    }
    UI.modal({
      titulo: (criando ? "Nova criatura · " : "Editar criatura · ") + C().NOMES_DOS_SISTEMAS[sistema],
      largo: true,
      conteudo: [el("div.pilha.hb-sistema", {}, [
        grade([nome, categoria]),
        el("div.r-campo", {}, [el("span.t-rotulo", { texto: "Visibilidade" }), seletorVis]),
      ].concat(form.nos).concat([descricao,
        el("div.faixa", {}, [el("button.r-botao.r-botao--mini", { type: "button", texto: "Ver como fica", onclick: verPrevia })]),
        previa]))],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: criando ? "Criar" : "Salvar", classe: "r-botao--principal", aoClicar: async function (fechar) {
          var r = form.ler();
          if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
          var bruta = { id: c.id, tipo: "criatura", sistema: sistema, nome: nome.valor(), categoria: categoria.valor(), descricao: descricao.valor(), visibilidade: visibilidade, origem: c.origem };
          bruta[sistema] = r.bloco;
          var pronta = C().normalizar(bruta);
          if (c.id) pronta.id = c.id;
          var problemas = C().validar(bruta);
          if (problemas.length) { UI.avisoErro("Confira antes de salvar: " + problemas.slice(0, 3).join("; ") + "."); return; }
          var s = await global.RAMAApi.salvarHomebrew(pronta);
          if (!s.ok) { UI.avisoDeFalha(s, "gravação da criatura"); return; }
          fechar();
          if (aoSalvar) aoSalvar();
        } },
      ],
    });
    nome.entrada.focus();
  }

  /* ---------- o resumo do cartão ---------- */

  function detalhes(registro) {
    var c = C().normalizar(registro);
    var b = c[c.sistema];
    var linha = "";
    if (c.sistema === "oblivio") linha = "Grau " + b.grau + " · Dano " + b.dano + " · Proteção " + b.protecao + " · Estresse " + b.limiteEstresse + " / " + b.regioes + " Regiões";
    if (c.sistema === "vampiro") linha = (NAT_VAMPIRO.filter(function (n) { return n[0] === b.natureza; })[0] || ["", ""])[1] + " · " + (b.modelo === "completo" ? "ficha completa" : "antagonista compacto") + " · Vitalidade " + b.vitalidade + " · Força de Vontade " + b.forcaDeVontade;
    if (c.sistema === "goblins") linha = FN() ? FN().linhaGoblin(b) : "";
    if (c.sistema === "tormenta20") linha = FN() ? FN().linhaTormenta20(b) : "";
    return el("dl.r-dados", {}, [
      el("dt", { texto: "Sistema" }), el("dd", { texto: C().NOMES_DOS_SISTEMAS[c.sistema] }),
      el("dt", { texto: "Ficha" }), el("dd", { texto: linha }),
    ]);
  }

  global.RAMAHomebrewCriaturaSistemas = { editar: editar, detalhes: detalhes, catalogoDeNomes: catalogoDeNomes };
})(window);
