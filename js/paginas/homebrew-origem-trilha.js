/* =====================================================================
   R.A.M.A. — Homebrew · Origem, Trilha e Poder paranormal de Ordem (v9.9)
   ---------------------------------------------------------------------
   Dois editores por etapas (Identidade → Regras → Revisão), no mesmo
   modelo do editor de Classe:

     Origem  perícias fixas e à escolha, o poder (nome e texto) e os
             efeitos opcionais que o motor já calcula
     Trilha  a classe a que serve, um requisito opcional e os quatro
             poderes (NEX 10%, 40%, 65%, 99%), cada um com efeitos opcionais
     Poder    poder PARANORMAL: elemento, requisito "<Elemento> N", texto,
              efeitos, escolha de perícia e a linha de Afinidade (com
              efeitos próprios). Entra nas vagas de poder paranormal.

   A definição passa pelo normalizador do motor (js/ordem/homebrew-ordem.js)
   antes de ser gravada; a ficha guarda a sua própria cópia ao escolher.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;
  function H() { return global.RAMAOrdemHomebrew; }
  function C() { return global.RAMAOrdemCatalogo; }
  function A() { return global.RAMAHomebrewAdaptadores; }

  function vaziaOrigem() { return { pericias: [], periciasAEscolher: 0, periciasOpcoes: [], periciasObservacao: "", poder: "", resumo: "", efeitos: [] }; }
  function vazioPoder() { return { elemento: "", requisitoElemento: 0, resumo: "", afinidade: "", repetivel: false, efeitos: [], efeitosAfinidade: [], escolhaHb: null }; }
  function vazioPoderClasse() { return { classe: "combatente", resumo: "", requisitoAtributo: null, requisitoPericia: "", requisitoNex: 0, repetivel: false, grupoModular: "utilidade", efeitos: [], escolhaHb: null }; }
  function vaziaTrilha() { return { classe: "combatente", resumo: "", requisitos: [], poderes: [10, 40, 65, 99].map(function (n) { return { nex: n, nome: "", resumo: "", efeitos: [] }; }) }; }

  function editor(tipo, opcoes) {
    var o = opcoes || {};
    var reg = o.registro || null;
    var ehOrigem = tipo === "origem", ehPoder = tipo === "poder", ehPC = tipo === "poderClasse", masc = ehPoder || ehPC;
    var d = reg && reg.modelo && reg.modelo.def ? JSON.parse(JSON.stringify(reg.modelo.def)) : (ehOrigem ? vaziaOrigem() : ehPoder ? vazioPoder() : ehPC ? vazioPoderClasse() : vaziaTrilha());
    if (ehPC) { d = Object.assign(vazioPoderClasse(), d); if (!d.resumo && reg) d.resumo = reg.descricao || reg.texto || ""; }
    if (ehOrigem && !Array.isArray(d.periciasOpcoes)) d.periciasOpcoes = [];
    if (ehPoder) { d = Object.assign(vazioPoder(), d); if (!d.resumo && reg) d.resumo = reg.descricao || reg.texto || ""; }
    if (!ehOrigem && !ehPoder && !ehPC) d.poderes = H().normalizarTrilha(d).poderes.map(function (p, i) { var x = (d.poderes || [])[i] || {}; return { nex: p.nex, nome: x.nome || "", resumo: x.resumo || "", efeitos: x.efeitos || [], escolha: x.escolha || null }; });
    var rotulo = ehOrigem ? "origem" : ehPoder ? "poder paranormal" : ehPC ? "poder de classe" : "trilha";
    /* Concordância: "o poder", "a origem", "a trilha". */
    var g = masc ? { a: "o", A: "O", da: "do", nova: "Novo", salva: "salvo" } : { a: "a", A: "A", da: "da", nova: "Nova", salva: "salva" };
    var r = { nome: reg ? reg.nome : "", descricao: reg ? reg.descricao || "" : (d.resumo && !ehOrigem ? d.resumo : ""), visibilidade: reg ? reg.visibilidade || "privado" : "privado", passo: 1, sujo: false };
    /* v9.14: a imagem opcional (ilustração da origem/trilha; símbolo do poder). */
    var imagem = global.RAMAHomebrewImagem ? global.RAMAHomebrewImagem.campo({ registro: reg, sistema: "ordem", grupo: ehPoder || ehPC ? "habilidade" : "estrutural",
      subtipo: ehPoder ? "poderParanormal" : ehPC ? "poderClasse" : tipo, aoMudar: function () { r.sujo = true; } }) : null;
    var pref = ehOrigem ? "hbo" : ehPoder ? "hbpp" : ehPC ? "hbpc" : "hbt";
    /* As classes Homebrew (para uma trilha exclusiva de uma delas). */
    var classesHb = null;
    if ((tipo === "trilha" || ehPC) && H().carregarBiblioteca) H().carregarBiblioteca().then(function (b) { classesHb = (b && b.classes) || []; if (r.passo === 1 && form.isConnected) pintar(); }, function () { classesHb = []; });
    var form = el("div.hbe-form"), lado = el("aside.hbe-lado", { "aria-label": "Revisão" });
    var janela = UI.modal({
      titulo: (reg ? "Editar " : g.nova + " ") + rotulo + " · Ordem Paranormal", largo: true, classe: "hbe-janela hbc-janela",
      conteudo: el("div.hbe-grade", {}, [form, lado]),
      podeFechar: function () {
        if (!r.sujo) return true;
        UI.confirmar({ titulo: "Descartar o rascunho?", texto: g.A + " " + rotulo + " ainda não foi " + g.salva + ".", rotuloConfirmar: "Descartar", perigo: true }).then(function (s) { if (s) { r.sujo = false; janela.fechar(); } });
        return false;
      },
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: reg ? "Salvar " + rotulo : "Criar " + rotulo, classe: "r-botao--principal", aoClicar: salvar }],
    });
    function mudou(repintar) { r.sujo = true; if (repintar) pintar(); else pintarLado(); }

    var PASSOS = ["Identidade", ehOrigem ? "Perícias e poder" : ehPoder ? "Efeitos e afinidade" : ehPC ? "Requisitos e efeitos" : "Poderes", "Revisão"];
    function pintar() {
      var foco = document.activeElement && form.contains(document.activeElement) ? document.activeElement.id : "";
      U.trocar(form, [
        el("ol.pc-passos", { "aria-label": "Etapas" }, PASSOS.map(function (p, i) {
          return el("li", {}, [el("button.pc-passo", { type: "button", id: pref + "-passo-" + (i + 1), "aria-current": r.passo === i + 1 ? "step" : null, onclick: function () { r.passo = i + 1; pintar(); } }, [el("span.pc-passo__n", { texto: String(i + 1) }), el("span", { texto: p })])]);
        })),
        [passo1, ehOrigem ? passoOrigem : ehPoder ? passoPoder : ehPC ? passoPoderClasse : passoTrilha, passoRevisao][r.passo - 1](),
        el("div.faixa.pc-editor__rodape", {}, [
          r.passo > 1 ? el("button.r-botao.r-botao--fantasma", { type: "button", id: pref + "-voltar", texto: "Voltar", onclick: function () { r.passo--; pintar(); } }) : null,
          r.passo < PASSOS.length ? el("button.r-botao", { type: "button", id: pref + "-continuar", texto: "Continuar", onclick: function () { r.passo++; pintar(); } }) : null,
        ]),
      ]);
      pintarLado();
      if (foco) { var f = document.getElementById(foco); if (f) f.focus(); }
    }

    /* ---------- controles ---------- */
    function pericias(vazio) { return (vazio ? [["", vazio]] : []).concat(C().PERICIAS.map(function (p) { return [p.chave, p.nome]; })); }
    function sel(id, rot, pares, valor, ao, ajuda) {
      return el("div.r-campo", {}, [el("label", { for: id, texto: rot }), el("select.r-selecao", { id: id, onchange: function (ev) { ao(ev.target.value); mudou(true); } }, pares.map(function (p) { return el("option", { value: p[0], texto: p[1], selected: String(p[0]) === String(valor === undefined || valor === null ? "" : valor) }); })), ajuda ? el("p.r-ajuda", { texto: ajuda }) : null]);
    }
    function txt(id, rot, valor, ao, max, ajuda, area) {
      var c = area ? el("textarea.r-area", { id: id, rows: 3, maxlength: max, oninput: function (ev) { ao(ev.target.value); mudou(); } }) : el("input.r-entrada", { id: id, value: valor || "", maxlength: max, oninput: function (ev) { ao(ev.target.value); mudou(); } });
      if (area) c.value = valor || "";
      return el("div.r-campo", {}, [el("label", { for: id, texto: rot }), c, ajuda ? el("p.r-ajuda", { texto: ajuda }) : null]);
    }
    function num(id, rot, valor, ao, ajuda) {
      return el("div.r-campo", {}, [el("label", { for: id, texto: rot }), el("input.r-entrada.r-entrada--numero", { id: id, inputmode: "numeric", maxlength: 3, value: String(valor || 0), oninput: function (ev) { ao(Number(ev.target.value) || 0); mudou(); }, onchange: function () { pintar(); } }), ajuda ? el("p.r-ajuda", { texto: ajuda }) : null]);
    }
    /* Os efeitos (só os que o motor já calcula). */
    function blocoEfeitos(dono, id) {
      dono.efeitos = dono.efeitos || [];
      var tipos = H().EFEITOS.map(function (e) { return [e.chave, e.rotulo]; });
      return el("fieldset.r-campo.hbo-efeitos", {}, [el("legend.r-rotulo", { texto: "Efeito na conta da ficha (opcional)" })].concat(dono.efeitos.map(function (ef, i) {
        var spec = H().EFEITOS.filter(function (e) { return e.chave === ef.tipo; })[0] || H().EFEITOS[0];
        return el("div.faixa.hbc-par", {}, [
          sel(id + "-t" + i, "Efeito", tipos, ef.tipo, function (v) { ef.tipo = v; if (v === "bonusPericia" && !ef.pericias) ef.pericias = ["atletismo"]; }),
          num(id + "-v" + i, "Valor", ef.valor, function (v) { ef.valor = v; }),
          spec.pericia ? sel(id + "-p" + i, "Perícia", pericias(), (ef.pericias || [])[0], function (v) { ef.pericias = [v]; }) : null,
          el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Remover", onclick: function () { dono.efeitos.splice(i, 1); mudou(true); } }),
        ]);
      })).concat([
        dono.efeitos.length < 4 ? el("button.r-botao.r-botao--mini", { type: "button", id: id + "-mais", texto: "+ Efeito", onclick: function () { dono.efeitos.push({ tipo: "defesa", valor: 1 }); mudou(true); } }) : null,
        el("p.r-ajuda", { texto: "Ex.: " + H().EFEITOS.map(function (e) { return e.exemplo; }).slice(0, 3).join("; ") + ". Sem efeito, o poder é informativo: a ficha mostra o texto e a mesa aplica." }),
      ]));
    }

    /* v9.16: uma escolha de perícia no poder de trilha. */
    function blocoEscolha(p, id, campo) {
      campo = campo || "escolha";
      var e = p[campo];
      var partes = [el("legend.r-rotulo", { texto: "Escolha de perícia (opcional)" }),
        sel(id + "-modo", "Quem joga escolhe", [["", "Nada"], ["treinar", "Treinado numa perícia"], ["treinarOuBonus", "Treinado; +bônus se já for (como Carteirada)"], ["bonus", "Bônus numa perícia"]], e ? e.modo : "", function (v) { p[campo] = v ? { modo: v, entre: e ? e.entre : [], valor: e && e.valor ? e.valor : 2 } : null; }, "Decidida na Progressão (\u201cFalta decidir\u201d); o efeito entra na conta.")];
      if (e) {
        if (e.modo !== "treinar") partes.push(sel(id + "-valor", "Bônus", [[1, "+1"], [2, "+2"], [3, "+3"], [4, "+4"], [5, "+5"]], e.valor || 2, function (v) { e.valor = Number(v); }));
        partes.push(el("fieldset.r-campo.hbc-pericias", {}, [el("legend.r-rotulo", { texto: "Entre (vazio = qualquer perícia)" })].concat(C().PERICIAS.map(function (pz) {
          return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: (e.entre || []).indexOf(pz.chave) >= 0, onchange: function (ev) { e.entre = (e.entre || []).filter(function (k) { return k !== pz.chave; }); if (ev.target.checked) e.entre.push(pz.chave); mudou(); } }), el("span", { texto: pz.nome })]);
        }))));
      }
      return el("fieldset.r-campo.hbo-efeitos", {}, partes);
    }

    /* A classe: uma oficial ou uma Classe Homebrew sua, exclusiva (o id do registro). */
    function seletorClasse(id, oQue) {
      var opsCl = H().OFICIAIS.map(function (k) { return [k, C().classe(k).nome]; }).concat((classesHb || []).map(function (c) { return ["hb:" + c.homebrewId, c.nome + " (classe Homebrew — só ela)"]; }));
      if (d.classeHomebrew && !(classesHb || []).some(function (c) { return c.homebrewId === d.classeHomebrew; })) opsCl.push(["hb:" + d.classeHomebrew, (d.classeHomebrewNome || "Classe Homebrew") + " (classe Homebrew — só ela)"]);
      return sel(id, "Classe", opsCl, d.classeHomebrew ? "hb:" + d.classeHomebrew : d.classe, function (v) {
        if (v.indexOf("hb:") === 0) { var cid = v.slice(3); var c = (classesHb || []).filter(function (x) { return x.homebrewId === cid; })[0]; d.classeHomebrew = cid; if (c) d.classeHomebrewNome = c.nome; }
        else { delete d.classeHomebrew; delete d.classeHomebrewNome; d.classe = v; }
      }, d.classeHomebrew ? "Só essa classe Homebrew oferece " + oQue + " (em qualquer versão dela)." : (classesHb === null ? "Carregando as suas classes Homebrew…" : "Uma classe oficial (e as Classes Homebrew que a seguem) ou uma classe Homebrew sua, exclusiva."));
    }

    /* ---------- 1. identidade ---------- */
    function passo1() {
      var partes = [
        txt(pref + "-nome", "Nome " + g.da + " " + rotulo, r.nome, function (v) { r.nome = v; }, 60),
      ];
      if (ehPC) {
        partes.push(seletorClasse("hbpc-classe", "o poder"));
        partes.push(txt("hbpc-texto", "Texto do poder", d.resumo, function (v) { d.resumo = v; }, 1200, "O que o poder faz, como aparece na ficha.", true));
        partes.push(sel("hbpc-grupo", "Evolução Modular (regra opcional)", [["utilidade", "Utilidade"], ["combate", "Combate"]], d.grupoModular, function (v) { d.grupoModular = v; }, "Em qual grupo o poder entra quando a ficha usa a Evolução Modular (AS6 p. 80)."));
        partes.push(el("label.r-marca", {}, [el("input", { type: "checkbox", id: "hbpc-repetivel", checked: !!d.repetivel, onchange: function (ev) { d.repetivel = ev.target.checked; mudou(); } }), el("span", { texto: "Pode ser escolhido várias vezes" })]));
        return el("div.pc-editor__passo", {}, partes);
      }
      if (ehPoder) {
        var ELx = global.RAMAOrdemElementos;
        var opsEl = [["", "Sem elemento fixo"]].concat(ELx ? ELx.paraSelecao().map(function (e) { return [e.chave, e.nome + (e.oficial ? "" : " (Homebrew)")]; }) : []);
        partes.push(sel("hbpp-elemento", "Elemento", opsEl, d.elemento, function (v) { d.elemento = v; if (!v) { d.requisitoElemento = 0; d.afinidade = ""; d.efeitosAfinidade = []; } }, "Os oficiais e os seus elementos Homebrew de Ordem. Conta para requisitos como “Sangue 2” e para a afinidade."));
        if (d.elemento) partes.push(sel("hbpp-req", "Requisito", [[0, "Nenhum"], [1, "1 poder do elemento"], [2, "2 poderes do elemento"], [3, "3 poderes do elemento"], [4, "4 poderes do elemento"]], d.requisitoElemento || 0, function (v) { d.requisitoElemento = Number(v); }, "Como o “Sangue 1” do livro: quantos poderes desse elemento a pessoa já precisa ter."));
        partes.push(el("label.r-marca", {}, [el("input", { type: "checkbox", id: "hbpp-repetivel", checked: !!d.repetivel, onchange: function (ev) { d.repetivel = ev.target.checked; mudou(); } }), el("span", { texto: "Pode ser escolhido várias vezes (como Aprender Ritual)" })]));
        partes.push(txt("hbpp-texto", "Texto do poder", d.resumo, function (v) { d.resumo = v; }, 1200, "O que o poder faz, como aparece na ficha.", true));
        return el("div.pc-editor__passo", {}, partes);
      }
      partes.push(txt(pref + "-desc", "Descrição", r.descricao, function (v) { r.descricao = v; }, 1200, ehOrigem ? "O que a pessoa fazia antes da Ordem." : "O estilo da trilha, em poucas linhas.", true));
      if (!ehOrigem) {
        partes.push(seletorClasse("hbt-classe", "a trilha"));
        partes.push(sel("hbt-req", "Requisito (opcional)", pericias("Nenhum"), d.requisitos && d.requisitos[0] ? d.requisitos[0].pericia : "", function (v) { d.requisitos = v ? [{ tipo: "treinado", pericia: v }] : []; }, "Ser treinado nessa perícia para escolher a trilha (como Médico de Campo pede Medicina)."));
      }
      return el("div.pc-editor__passo", {}, partes);
    }
    /* ---------- 2. origem ---------- */
    function passoOrigem() {
      var fixas = d.pericias || [];
      var partes = [
        el("p.t-mini", { texto: "No livro, cada origem dá duas perícias treinadas e um poder." }),
        el("div.editar-grade", {}, [0, 1].map(function (i) {
          return sel("hbo-per" + i, "Perícia treinada " + (i + 1), pericias("—"), fixas[i] || "", function (v) { var l = (d.pericias || []).slice(); l[i] = v; d.pericias = l.filter(function (k, j, ll) { return k && ll.indexOf(k) === j; }); });
        })),
        num("hbo-escolher", "Perícias à escolha", d.periciasAEscolher, function (v) { d.periciasAEscolher = Math.max(0, Math.min(4, v)); }, "Além das fixas (como o Amnésico, que tem duas à escolha)."),
      ];
      if (d.periciasAEscolher > 0) {
        partes.push(el("fieldset.r-campo.hbc-pericias", {}, [el("legend.r-rotulo", { texto: "Escolhidas entre (opcional; vazio = qualquer perícia)" })].concat(C().PERICIAS.filter(function (p) { return fixas.indexOf(p.chave) < 0; }).map(function (p) {
          return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: d.periciasOpcoes.indexOf(p.chave) >= 0, onchange: function (ev) { d.periciasOpcoes = d.periciasOpcoes.filter(function (k) { return k !== p.chave; }); if (ev.target.checked) d.periciasOpcoes.push(p.chave); mudou(); } }), el("span", { texto: p.nome })]);
        }))));
        partes.push(txt("hbo-obs", "Observação sobre as perícias", d.periciasObservacao, function (v) { d.periciasObservacao = v; }, 160, "Ex.: \"Duas à escolha do mestre.\""));
      }
      partes.push(txt("hbo-poder", "Nome do poder", d.poder, function (v) { d.poder = v; }, 60));
      partes.push(txt("hbo-texto", "Texto do poder", d.resumo, function (v) { d.resumo = v; }, 1200, "O que o poder faz, como aparece em Habilidades.", true));
      partes.push(blocoEfeitos(d, "hbo-ef"));
      partes.push(blocoEscolha(d, "hbo-esc", "escolhaHb"));
      return el("div.pc-editor__passo", {}, partes);
    }
    /* ---------- 2. poder de classe ---------- */
    function passoPoderClasse() {
      var ra = d.requisitoAtributo || {};
      var atrs = [["", "Nenhum"], ["agi", "Agilidade"], ["for", "Força"], ["int", "Intelecto"], ["pre", "Presença"], ["vig", "Vigor"]];
      return el("div.pc-editor__passo", {}, [
        el("fieldset.r-campo.hbo-efeitos", {}, [
          el("legend.r-rotulo", { texto: "Requisitos (opcional)" }),
          el("div.editar-grade", {}, [
            sel("hbpc-req-atr", "Atributo", atrs, ra.atributo || "", function (v) { d.requisitoAtributo = v ? { atributo: v, valor: (d.requisitoAtributo && d.requisitoAtributo.valor) || 2 } : null; }),
            d.requisitoAtributo ? sel("hbpc-req-val", "Valor mínimo", [[1, "1"], [2, "2"], [3, "3"], [4, "4"], [5, "5"]], ra.valor || 2, function (v) { d.requisitoAtributo.valor = Number(v); }) : null,
          ]),
          sel("hbpc-req-per", "Treinado em", pericias("Nenhuma"), d.requisitoPericia, function (v) { d.requisitoPericia = v; }),
          sel("hbpc-req-nex", "NEX mínimo", [[0, "Nenhum"]].concat([10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 99].map(function (n) { return [n, n + "%"]; })), d.requisitoNex || 0, function (v) { d.requisitoNex = Number(v); }, "Como os do livro (\u201cFor 2, treinado em Luta\u201d). A Progressão confere."),
        ]),
        blocoEfeitos(d, "hbpc-ef"),
        blocoEscolha(d, "hbpc-esc", "escolhaHb"),
      ]);
    }
    /* ---------- 2. poder paranormal ---------- */
    function passoPoder() {
      var partes = [blocoEfeitos(d, "hbpp-ef"), blocoEscolha(d, "hbpp-esc", "escolhaHb")];
      if (d.elemento) {
        var af = { efeitos: d.efeitosAfinidade };
        partes.push(el("fieldset.r-campo.hbo-efeitos", {}, [
          el("legend.r-rotulo", { texto: "Afinidade (opcional)" }),
          el("p.r-ajuda", { texto: "Com afinidade no elemento, o poder pode ser escolhido uma segunda vez para receber esta linha (OPRPG p. 114)." }),
          txt("hbpp-afinidade", "Texto da afinidade", d.afinidade, function (v) { d.afinidade = v; }, 600, null, true),
          blocoEfeitos(af, "hbpp-af"),
        ]));
        d.efeitosAfinidade = af.efeitos;
      } else partes.push(el("p.t-mini", { texto: "Sem elemento fixo, o poder não tem linha de afinidade." }));
      return el("div.pc-editor__passo", {}, partes);
    }
    /* ---------- 2. trilha ---------- */
    function passoTrilha() {
      return el("div.pc-editor__passo", {}, [el("p.t-mini", { texto: "Os poderes chegam sozinhos no marco (NEX 10%, 40%, 65% e 99%; nível e Patentes seguem a mesma regra das trilhas do livro)." })].concat(d.poderes.map(function (p, i) {
        return el("fieldset.r-campo.hbt-poder", {}, [
          el("legend.r-rotulo", { texto: "NEX " + p.nex + "%" }),
          txt("hbt-p" + i + "-nome", "Nome", p.nome, function (v) { p.nome = v; }, 60),
          txt("hbt-p" + i + "-texto", "Texto", p.resumo, function (v) { p.resumo = v; }, 1200, null, true),
          blocoEfeitos(p, "hbt-p" + i + "-ef"),
          blocoEscolha(p, "hbt-p" + i + "-esc"),
        ]);
      })));
    }
    /* ---------- 3. revisão ---------- */
    function definicao() {
      var x = JSON.parse(JSON.stringify(d));
      x.nome = r.nome || (ehOrigem ? "Origem Homebrew" : ehPoder ? "Poder paranormal Homebrew" : ehPC ? "Poder de classe Homebrew" : "Trilha Homebrew");
      x.homebrewId = reg ? reg.id : "rascunho";
      if (ehPoder) return H().normalizarPoder(x);
      if (ehPC) return H().normalizarPoderClasse(x);
      if (ehOrigem) x.descricao = r.descricao; else x.resumo = r.descricao;
      return ehOrigem ? H().normalizarOrigem(x) : H().normalizarTrilha(x);
    }
    function previa(def) { return ehOrigem ? H().previaOrigem(def) : ehPoder ? H().previaPoder(def) : ehPC ? H().previaPoderClasse(def) : H().previaTrilha(def); }
    function passoRevisao() {
      var def = definicao();
      var auto = ehPC
        ? [def.classeHomebrew ? "Aparece na vaga de Poder de classe só da classe Homebrew " + def.classeHomebrewNome + "." : "Aparece na vaga de Poder de classe do " + C().classe(def.classe).nome + " (e das Classes Homebrew que usam os poderes dele ou que o escolherem).", "A Progressão confere os requisitos.", def.efeitos.length ? "Os efeitos entram na conta (" + def.efeitos.map(H().textoEfeito).join(", ") + ")." : "Sem efeito na conta."]
        : ehPoder
        ? ["Aparece nas vagas de poder paranormal da Progressão (Transcender e as demais), junto dos do livro" + (def.elemento ? ", no grupo do elemento" : "") + ".", def.requisitoElemento ? "O requisito é conferido pela Progressão." : null, def.efeitos.length ? "Os efeitos entram na conta (" + def.efeitos.map(H().textoEfeito).join(", ") + ")." : "Sem efeito na conta.", def.efeitosAfinidade.length ? "Com a segunda escolha (afinidade), entram também: " + def.efeitosAfinidade.map(H().textoEfeito).join(", ") + "." : null]
        : ehOrigem
        ? ["As perícias fixas entram treinadas na criação e na troca de origem.", def.efeitos.length ? "Os efeitos entram na conta (" + def.efeitos.map(H().textoEfeito).join(", ") + ")." : (def.escolhaHb ? "Sem efeito fixo; a escolha do poder entra na conta depois de feita." : "Sem efeito na conta.")]
        : [def.classeHomebrew ? "A trilha aparece na vaga de Trilha só para a classe Homebrew " + def.classeHomebrewNome + "." : "A trilha aparece na vaga de Trilha para " + C().classe(def.classe).nome + " (e para as Classes Homebrew que usam as trilhas dela ou que a escolherem).", "Cada poder chega no seu marco; os efeitos configurados entram na conta."];
      var manual = masc
        ? [def.escolhaHb ? "Do poder: " + H().textoEscolha(def.escolhaHb) + " — escolhida na Progressão." : null, "O que o texto descreve além dos efeitos é aplicado pela mesa."]
        : ehOrigem
        ? [def.periciasAEscolher ? "As " + def.periciasAEscolher + " perícias à escolha são escolhidas por quem joga." : null, def.escolhaHb ? "Do poder: " + H().textoEscolha(def.escolhaHb) + " — escolhida na Progressão (“Falta decidir”)." : null, "O que o texto do poder descreve além dos efeitos é aplicado pela mesa."]
        : def.poderes.filter(function (p) { return p.escolha; }).map(function (p) { return "NEX " + p.nex + "% · " + p.nome + ": " + H().textoEscolha(p.escolha) + " — escolhida na Progressão."; }).concat(["O que o texto de cada poder descreve além dos efeitos é aplicado pela mesa."]);
      return el("div.pc-editor__passo", {}, [
        el("p.t-rotulo", { texto: "Prévia" }),
        el("ul.hbe-mini", {}, previa(def).map(function (t) { return el("li", { texto: t }); })),
        el("p.t-rotulo", { texto: "Automático" }),
        el("ul.hbe-mini", {}, auto.filter(Boolean).map(function (t) { return el("li", { texto: t }); })),
        el("p.t-rotulo", { texto: "Decisão de quem joga / da mesa" }),
        el("ul.hbe-mini", {}, manual.filter(Boolean).map(function (t) { return el("li", { texto: t }); })),
        imagem ? imagem.el : null,
        el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Visibilidade" }), el("div.filtros__grupo", { role: "group", "aria-label": "Visibilidade" }, [["privado", "Privada"], ["publico", "Pública"]].map(function (x) {
          return el("button.filtro", { type: "button", "aria-pressed": String(r.visibilidade === x[0]), texto: x[1], onclick: function () { r.visibilidade = x[0]; mudou(true); } });
        }))]),
      ]);
    }
    function pintarLado() {
      var def = definicao();
      U.trocar(lado, [
        el("p.t-rotulo", { texto: "Revisão" }),
        el("p.t-secao", { texto: r.nome || "Sem nome" }),
        el("ul.hbe-mini", {}, previa(def).map(function (t) { return el("li", { texto: t }); })),
      ]);
    }

    async function salvar(fechar) {
      if (!U.aparar(r.nome)) { r.passo = 1; pintar(); UI.avisoErro("Dê um nome " + (masc ? "ao " : "à ") + rotulo + "."); var n = document.getElementById(pref + "-nome"); if (n) n.focus(); return; }
      var def = definicao();
      ["chave", "homebrewId", "homebrew", "fonte", "pagina", "nome", "descricao"].forEach(function (k) { delete def[k]; });
      if (masc) delete def.tipo;
      else if (!ehOrigem) delete def.resumo;
      var gd = masc
        ? A().guardar("ordem", "habilidade", ehPC ? "poderClasse" : "poderParanormal", { id: reg ? reg.id : undefined, nome: r.nome, descricao: def.resumo, origem: ehPC ? "Poder de classe" : "Poder paranormal", valores: {}, def: def, visibilidade: r.visibilidade, modeloAnterior: reg ? reg.modelo : null })
        : A().guardar("ordem", "estrutural", tipo, { id: reg ? reg.id : undefined, nome: r.nome, descricao: r.descricao, valores: {}, def: def, visibilidade: r.visibilidade, modeloAnterior: reg ? reg.modelo : null });
      if (!gd.ok) { UI.avisoErro(gd.erro); return; }
      var resp = await global.RAMAApi.salvarHomebrew(gd.registro);
      if (!resp.ok) { UI.avisoDeFalha(resp, "gravação " + g.da + " " + rotulo); return; }
      if (imagem) await imagem.salvarEm((resp.dados && resp.dados.id) || (reg && reg.id));
      r.sujo = false;
      fechar();
      if (H()) H().carregarBiblioteca(true);
      UI.avisoOk(ehPC
        ? (reg ? "Poder atualizado. As fichas que já o usam continuam com a versão delas." : "Poder de classe criado. Ele aparece na vaga de Poder de classe da progressão para a classe dele.")
        : ehPoder
        ? (reg ? "Poder atualizado. As fichas que já o usam continuam com a versão delas." : "Poder paranormal criado. Ele aparece nas vagas de poder paranormal da Progressão (Transcender e as demais).")
        : ehOrigem
        ? (reg ? "Origem atualizada. As fichas que já a usam continuam com a versão delas." : "Origem criada. Ela aparece na criação de agentes de Ordem (aba Homebrew) e na troca de origem.")
        : (reg ? "Trilha atualizada. As fichas que já a usam continuam com a versão delas." : "Trilha criada. Ela aparece na vaga de Trilha da progressão para a classe dela."));
      if (o.aoSalvar) o.aoSalvar(resp.dados && resp.dados.id);
    }

    pintar();
    var p = document.getElementById(pref + "-nome"); if (p) p.focus();
    return janela;
  }

  global.RAMAHomebrewOrigemTrilha = {
    origem: function (o) { return editor("origem", o); },
    trilha: function (o) { return editor("trilha", o); },
    poder: function (o) { return editor("poder", o); },
    poderClasse: function (o) { return editor("poderClasse", o); },
  };
})(window);
