/* =====================================================================
   R.A.M.A. — Homebrew · Classe de Ordem Paranormal (v9.8)
   ---------------------------------------------------------------------
   O editor de uma classe Homebrew de Ordem I, por etapas:

     1 Identidade   nome, descrição, de onde vêm poderes e trilhas
     2 Recursos     PV / PE / SAN / PD: inicial e por marco, com a
                    parcela de atributo (ex.: Vigor) opcional
     3 Perícias     fixas, escolhas obrigatórias, livres, grau de
                    treinamento, proficiências, habilidades iniciais
     4 NEX e nível  os 20 marcos: o que cada um concede e o que pede
     5 Patentes     a tabela de Evolução por Patentes (opcional)
     6 Revisão      a prévia do 1º marco e dos ganhos, e o que falta

   Pode começar da tabela de uma classe oficial (uma CÓPIA, editável).
   Sem a tabela de um trilho, a classe não é oferecida nele — a revisão
   diz qual falta. Tudo num rascunho; salvar grava na biblioteca, e a
   ficha guarda a sua própria cópia ao escolher a classe.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;
  function H() { return global.RAMAOrdemHomebrew; }
  function C() { return global.RAMAOrdemCatalogo; }
  function A() { return global.RAMAHomebrewAdaptadores; }

  var ATRIBUTOS = [["", "—"], ["vig", "Vigor"], ["for", "Força"], ["agi", "Agilidade"], ["int", "Intelecto"], ["pre", "Presença"]];
  var PATENTES = ["Recruta", "Operador", "Agente especial", "Oficial de operações", "Agente de elite"];

  function vazia() {
    return {
      pvInicial: { base: 16, atributo: "vig" }, pvPorNex: { base: 3, atributo: "vig" },
      peInicial: { base: 2, atributo: "pre" }, pePorNex: { base: 2, atributo: "pre" },
      sanInicial: { base: 12, atributo: null }, sanPorNex: { base: 3, atributo: null },
      pdInicial: { base: 6, atributo: "pre" }, pdPorNex: { base: 3, atributo: "pre" },
      periciasFixas: [], periciasEscolhaObrigatoria: [], periciasLivres: { base: 2, atributo: "int" },
      proficiencias: ["Armas simples"], grauTreinamentoBase: 3, poderesDe: "", trilhasDe: "", habilidadesIniciais: [],
      progressao: H().NEX.map(function (n) { return { nex: n, rotulos: [], escolhas: [] }; }), patentes: null,
    };
  }

  function editor(opcoes) {
    var o = opcoes || {};
    var reg = o.registro || null;
    var d = reg && reg.modelo && reg.modelo.def ? JSON.parse(JSON.stringify(reg.modelo.def)) : vazia();
    var r = { nome: reg ? reg.nome : "", descricao: reg ? reg.descricao || "" : "", visibilidade: reg ? reg.visibilidade || "privado" : "privado", passo: 1, sujo: false };
    var form = el("div.hbe-form"), lado = el("aside.hbe-lado", { "aria-label": "Revisão" });
    var janela = UI.modal({
      titulo: (reg ? "Editar" : "Nova") + " classe · Ordem Paranormal", largo: true, classe: "hbe-janela hbc-janela",
      conteudo: el("div.hbe-grade", {}, [form, lado]),
      podeFechar: function () {
        if (!r.sujo) return true;
        UI.confirmar({ titulo: "Descartar o rascunho?", texto: "A classe ainda não foi salva.", rotuloConfirmar: "Descartar", perigo: true }).then(function (s) { if (s) { r.sujo = false; janela.fechar(); } });
        return false;
      },
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: reg ? "Salvar classe" : "Criar classe", classe: "r-botao--principal", aoClicar: salvar }],
    });
    function mudou(repintar) { r.sujo = true; if (repintar) pintar(); else pintarLado(); }
    /* As trilhas Homebrew da biblioteca (para escolher as que a classe usa). */
    var trilhasHb = null;
    if (H() && H().carregarBiblioteca) H().carregarBiblioteca().then(function (b) { trilhasHb = (b && b.trilhas) || []; if (r.passo === 1 && form.isConnected) pintar(); }, function () { trilhasHb = []; });
    function blocoTrilhasHb() {
      if (!trilhasHb) return el("p.t-mini", { texto: "Carregando as suas trilhas Homebrew…" });
      var minha = reg ? reg.id : "";
      var proprias = trilhasHb.filter(function (t) { return minha && t.classeHomebrew === minha; });
      var livres = trilhasHb.filter(function (t) { return !t.classeHomebrew; });
      d.trilhasHomebrew = Array.isArray(d.trilhasHomebrew) ? d.trilhasHomebrew : [];
      return el("fieldset.r-campo.hbc-pericias", {}, [el("legend.r-rotulo", { texto: "Trilhas Homebrew desta classe (opcional)" })]
        .concat(proprias.map(function (t) { return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: true, disabled: true }), el("span", { texto: t.nome + " (feita para esta classe)" })]); }))
        .concat(livres.map(function (t) {
          return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: d.trilhasHomebrew.indexOf(t.homebrewId) >= 0, onchange: function (ev) {
            d.trilhasHomebrew = d.trilhasHomebrew.filter(function (k) { return k !== t.homebrewId; }); if (ev.target.checked) d.trilhasHomebrew.push(t.homebrewId); mudou();
          } }), el("span", { texto: t.nome + " (de " + ((C().classe(t.classe) || {}).nome || t.classe) + ")" })]);
        }))
        .concat([el("p.r-ajuda", { texto: (proprias.length || livres.length ? "" : "Você ainda não tem trilhas Homebrew. ") + "Uma trilha criada \u201csó para esta classe\u201d (no editor de Trilha) entra sempre, em qualquer versão da classe" + (reg ? "." : " — salve a classe primeiro para ela aparecer lá.") })]));
    }

    var PASSOS = ["Identidade", "Recursos", "Perícias", "NEX e nível", "Patentes", "Revisão"];
    function pintar() {
      var foco = document.activeElement && form.contains(document.activeElement) ? document.activeElement.id : "";
      U.trocar(form, [
        el("ol.pc-passos", { "aria-label": "Etapas" }, PASSOS.map(function (p, i) {
          return el("li", {}, [el("button.pc-passo", { type: "button", id: "hbc-passo-" + (i + 1), "aria-current": r.passo === i + 1 ? "step" : null, onclick: function () { r.passo = i + 1; pintar(); } }, [el("span.pc-passo__n", { texto: String(i + 1) }), el("span", { texto: p })])]);
        })),
        [passo1, passo2, passo3, passo4, passo5, passo6][r.passo - 1](),
        el("div.faixa.pc-editor__rodape", {}, [
          r.passo > 1 ? el("button.r-botao.r-botao--fantasma", { type: "button", id: "hbc-voltar", texto: "Voltar", onclick: function () { r.passo--; pintar(); } }) : null,
          r.passo < PASSOS.length ? el("button.r-botao", { type: "button", id: "hbc-continuar", texto: "Continuar", onclick: function () { r.passo++; pintar(); } }) : null,
        ]),
      ]);
      pintarLado();
      if (foco) { var f = document.getElementById(foco); if (f) f.focus(); }
    }
    function num(id, rotulo, valor, ao, extra) {
      return el("div.r-campo", {}, [el("label", { for: id, texto: rotulo }), el("input.r-entrada.r-entrada--numero", { id: id, inputmode: "numeric", maxlength: 3, value: String(valor === undefined || valor === null ? "" : valor), oninput: function (ev) { ao(Number(ev.target.value) || 0); mudou(); } }), extra ? el("p.r-ajuda", { texto: extra }) : null]);
    }
    function sel(id, rotulo, pares, valor, ao) {
      return el("div.r-campo", {}, [el("label", { for: id, texto: rotulo }), el("select.r-selecao", { id: id, onchange: function (ev) { ao(ev.target.value); mudou(true); } }, pares.map(function (p) { return el("option", { value: p[0], texto: p[1], selected: String(p[0]) === String(valor || "") }); }))]);
    }
    function linhas(id, rotulo, valores, ao, ajuda) {
      var t = el("textarea.r-area", { id: id, rows: 3, oninput: function (ev) { ao(ev.target.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean)); mudou(); } });
      t.value = (valores || []).join("\n");
      return el("div.r-campo", {}, [el("label", { for: id, texto: rotulo }), t, ajuda ? el("p.r-ajuda", { texto: ajuda }) : null]);
    }

    /* ---------- 1. identidade ---------- */
    function passo1() {
      var nome = el("input.r-entrada", { id: "hbc-nome", value: r.nome, maxlength: 60, oninput: function (ev) { r.nome = ev.target.value; mudou(); } });
      var desc = el("textarea.r-area", { id: "hbc-desc", rows: 3, maxlength: 1200, oninput: function (ev) { r.descricao = ev.target.value; mudou(); } }); desc.value = r.descricao;
      var oficiais = [["", "Nenhuma (só os gerais)"]].concat(H().OFICIAIS.map(function (k) { return [k, C().classe(k).nome]; }));
      return el("div.pc-editor__passo", {}, [
        el("div.r-campo", {}, [el("label", { for: "hbc-nome", texto: "Nome da classe" }), nome]),
        el("div.r-campo", {}, [el("label", { for: "hbc-desc", texto: "Descrição" }), desc]),
        !reg ? el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Começar de" }), el("div.faixa", {}, H().OFICIAIS.map(function (k) {
          return el("button.r-botao.r-botao--mini", { type: "button", texto: "Tabelas do " + C().classe(k).nome, onclick: function () {
            UI.confirmar({ titulo: "Copiar as tabelas do " + C().classe(k).nome + "?", texto: "Recursos, perícias, progressão e Patentes viram uma cópia editável. O que você já preencheu nessas partes é substituído.", rotuloConfirmar: "Copiar" }).then(function (s) { if (s) { d = H().modeloDeOficial(k); mudou(true); } });
          } });
        }).concat([el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Em branco", onclick: function () { d = vazia(); mudou(true); } })])), el("p.r-ajuda", { texto: "É uma cópia: a classe Homebrew nunca muda se a oficial mudar." })]) : null,
        sel("hbc-poderes", "Poderes de classe", oficiais, d.poderesDe, function (v) { d.poderesDe = v; }),
        sel("hbc-trilhas", "Trilhas oficiais", [["", "Nenhuma trilha oficial"]].concat(H().OFICIAIS.map(function (k) { return [k, "As do " + C().classe(k).nome]; })), d.trilhasDe, function (v) { d.trilhasDe = v; }),
        blocoTrilhasHb(),
        el("p.t-mini", { texto: "Nas vagas \"Poder de classe\" e \"Trilha\", a ficha oferece só o que você escolher aqui. Nada é emprestado sozinho de uma classe oficial." }),
      ]);
    }
    /* ---------- 2. recursos ---------- */
    function passo2() {
      function linhaRecurso(rot, ini, por) {
        return el("div.hbc-recurso", {}, [
          el("p.t-rotulo", { texto: rot }),
          el("div.editar-grade", {}, [
            num("hbc-" + ini + "-b", "Inicial (NEX 5%)", d[ini].base, function (v) { d[ini].base = v; }),
            sel("hbc-" + ini + "-a", "+ atributo", ATRIBUTOS, d[ini].atributo, function (v) { d[ini].atributo = v || null; }),
            num("hbc-" + por + "-b", "Por marco depois", d[por].base, function (v) { d[por].base = v; }),
            sel("hbc-" + por + "-a", "+ atributo", ATRIBUTOS, d[por].atributo, function (v) { d[por].atributo = v || null; }),
          ]),
        ]);
      }
      return el("div.pc-editor__passo", {}, [
        el("p.t-mini", { texto: "Como nas classes do livro: o valor inicial em NEX 5% e o ganho a cada marco seguinte (ou nível, com NEX & Experiência). Ex.: 20 + Vigor e 4 + Vigor." }),
        linhaRecurso("Pontos de vida (PV)", "pvInicial", "pvPorNex"), linhaRecurso("Pontos de esforço (PE)", "peInicial", "pePorNex"),
        linhaRecurso("Sanidade (SAN)", "sanInicial", "sanPorNex"), linhaRecurso("Pontos de determinação (PD, \"Jogando sem Sanidade\")", "pdInicial", "pdPorNex"),
      ]);
    }
    /* ---------- 3. perícias ---------- */
    function passo3() {
      var pericias = C().PERICIAS.map(function (p) { return [p.chave, p.nome]; });
      var fixas = el("fieldset.r-campo.hbc-pericias", {}, [el("legend.r-rotulo", { texto: "Perícias fixas (treinadas sempre)" })].concat(C().PERICIAS.map(function (p) {
        return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: d.periciasFixas.indexOf(p.chave) >= 0, onchange: function (ev) { d.periciasFixas = d.periciasFixas.filter(function (k) { return k !== p.chave; }); if (ev.target.checked) d.periciasFixas.push(p.chave); mudou(); } }), el("span", { texto: p.nome })]);
      })));
      var pares = (d.periciasEscolhaObrigatoria || []).map(function (x, i) {
        return el("div.faixa.hbc-par", {}, [
          sel("hbc-par" + i + "a", "Escolha " + (i + 1) + ": uma entre", pericias, x.entre[0], function (v) { x.entre[0] = v; }),
          sel("hbc-par" + i + "b", "e", pericias, x.entre[1], function (v) { x.entre[1] = v; }),
          el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Remover", onclick: function () { d.periciasEscolhaObrigatoria.splice(i, 1); mudou(true); } }),
        ]);
      });
      return el("div.pc-editor__passo", {}, [
        fixas,
        el("div.pilha--curta", { class: "pilha" }, pares.concat([(d.periciasEscolhaObrigatoria || []).length < 3 ? el("button.r-botao.r-botao--mini", { type: "button", texto: "+ Escolha obrigatória (uma entre duas)", onclick: function () { d.periciasEscolhaObrigatoria = (d.periciasEscolhaObrigatoria || []).concat([{ entre: ["luta", "pontaria"] }]); mudou(true); } }) : null])),
        el("div.editar-grade", {}, [
          num("hbc-livres", "Perícias livres", d.periciasLivres.base, function (v) { d.periciasLivres.base = v; }, "Mais o Intelecto, como no livro."),
          num("hbc-grau", "Grau de treinamento (base)", d.grauTreinamentoBase, function (v) { d.grauTreinamentoBase = v; }, "Perícias que sobem no Grau de treinamento: base + Intelecto."),
        ]),
        linhas("hbc-prof", "Proficiências (uma por linha)", d.proficiencias, function (v) { d.proficiencias = v; }, "Ex.: Armas simples, Proteções leves."),
        linhas("hbc-hab", "Habilidades iniciais (uma por linha)", d.habilidadesIniciais, function (v) { d.habilidadesIniciais = v; }, "Aparecem como benefício do 1º marco (o efeito mecânico de cada uma é decidido pela mesa)."),
        blocoRituais(),
      ]);
    }
    /* v9.24: conjura rituais como o Ocultista? O círculo máximo por NEX. */
    function blocoRituais() {
      var conj = !!(d.circuloPorNex && d.circuloPorNex.length);
      var nexes = H().NEX.map(function (n) { return [String(n), n + "%"]; });
      return el("fieldset.r-campo.hbc-rituais", {}, [
        el("legend.r-rotulo", { texto: "Rituais" }),
        el("label.r-marca", {}, [el("input", { type: "checkbox", id: "hbc-conjura", checked: conj, onchange: function (ev) {
          d.circuloPorNex = ev.target.checked ? JSON.parse(JSON.stringify(H().CIRCULOS_DO_OCULTISTA)) : undefined;
          if (!ev.target.checked) delete d.circuloPorNex;
          mudou(true);
        } }), el("span", { texto: "Conjura rituais como o Ocultista (Escolhido pelo Outro Lado)" })]),
        conj ? el("p.t-mini", { texto: "3 rituais de 1º círculo no 1º marco e um a cada marco depois, de qualquer círculo que já alcance; não contam no limite por Intelecto. Diga em que NEX cada círculo abre (deixe \u201c—\u201d para parar antes)." })
          : el("p.t-mini", { texto: "Sem isso, a classe aprende rituais só por poderes (Aprender Ritual), como Combatente e Especialista." }),
        conj ? el("div.editar-grade", {}, [1, 2, 3, 4].map(function (c) {
          var f = d.circuloPorNex.filter(function (x) { return x.circulo === c; })[0];
          return sel("hbc-circ" + c, c + "º círculo em", c === 1 ? nexes : [["", "—"]].concat(nexes), f ? String(f.nex) : "", function (v) {
            /* Troca só este círculo; o que ficar fora de ordem (ou sem o
               anterior) sai pela mesma regra do motor. */
            var l = d.circuloPorNex.filter(function (x) { return x.circulo !== c; });
            if (v) l.push({ nex: Number(v), circulo: c });
            l.sort(function (a, b) { return a.circulo - b.circulo; });
            d.circuloPorNex = H().circulosPorNex(l) || [l[0] || H().CIRCULOS_DO_OCULTISTA[0]];
          });
        })) : null,
      ]);
    }
    /* ---------- 4. NEX e nível ---------- */
    function tabela(entradas, rotuloLinha, escolhasValidas, prefixo) {
      return el("div.hbc-tabela", { role: "table", "aria-label": "Progressão" }, entradas.map(function (e, i) {
        var rot = el("input.r-entrada", { id: prefixo + i, value: (e.rotulos || []).join("; "), maxlength: 240, "aria-label": rotuloLinha(e, i) + ": o que concede", placeholder: "ex.: Fúria (2 PE); Habilidade de trilha", oninput: function (ev) { e.rotulos = ev.target.value.split(";").map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 4); mudou(); } });
        return el("div.hbc-linha", { role: "row" }, [
          el("span.hbc-linha__marco", { role: "rowheader", texto: rotuloLinha(e, i) }),
          rot,
          el("div.hbc-linha__escolhas", { role: "group", "aria-label": rotuloLinha(e, i) + ": o que pede" }, escolhasValidas.map(function (x) {
            return el("label.r-marca.hbc-chip", {}, [el("input", { type: "checkbox", checked: (e.escolhas || []).indexOf(x.chave) >= 0, onchange: function (ev) { e.escolhas = (e.escolhas || []).filter(function (k) { return k !== x.chave; }); if (ev.target.checked) e.escolhas.push(x.chave); mudou(); } }), el("span", { texto: x.rotulo })]);
          })),
        ]);
      }));
    }
    function passo4() {
      var tem = !!d.progressao;
      return el("div.pc-editor__passo", {}, [
        el("label.r-marca", {}, [el("input", { type: "checkbox", id: "hbc-tem-nex", checked: tem, onchange: function (ev) { d.progressao = ev.target.checked ? H().NEX.map(function (n) { return { nex: n, rotulos: [], escolhas: [] }; }) : null; mudou(true); } }), el("span", { texto: "Esta classe tem a tabela por NEX (que também serve ao nível, com NEX & Experiência)" })]),
        tem ? el("p.t-mini", { texto: "Para cada marco: o que ele concede (texto, separado por ;) e o que a ficha precisa PERGUNTAR. A ficha nunca escolhe sozinha." }) : el("p.t-mini.t-aviso", { texto: "Sem esta tabela, a classe não é oferecida nas fichas por NEX nem por nível." }),
        tem ? tabela(d.progressao, function (e) { return "NEX " + e.nex + "%"; }, H().ESCOLHAS, "hbc-nex-") : null,
      ]);
    }
    /* ---------- 5. Patentes ---------- */
    function passo5() {
      var tem = !!d.patentes;
      return el("div.pc-editor__passo", {}, [
        el("label.r-marca", {}, [el("input", { type: "checkbox", id: "hbc-tem-pat", checked: tem, onchange: function (ev) { d.patentes = ev.target.checked ? { pv: { base: 16, porPatente: 8, atributo: "vig" }, pd: { base: 8, porPatente: 4, atributo: "pre" }, patentes: [0, 1, 2, 3, 4].map(function () { return { escolhas: [], rotulos: [] }; }) } : null; mudou(true); } }), el("span", { texto: "Esta classe tem a tabela de Evolução por Patentes" })]),
        tem ? el("div.editar-grade", {}, [
          num("hbc-ppv-b", "PV em Recruta", d.patentes.pv.base, function (v) { d.patentes.pv.base = v; }, "Mais o Vigor."),
          num("hbc-ppv-p", "PV a cada patente nova", d.patentes.pv.porPatente, function (v) { d.patentes.pv.porPatente = v; }, "Mais o Vigor (Sobrevivendo ao Horror, p. 110)."),
          num("hbc-ppd-b", "PD em Recruta", d.patentes.pd.base, function (v) { d.patentes.pd.base = v; }, "Mais a Presença."),
          num("hbc-ppd-p", "PD a cada patente nova", d.patentes.pd.porPatente, function (v) { d.patentes.pd.porPatente = v; }),
        ]) : el("p.t-mini.t-aviso", { texto: "Sem esta tabela, a classe não é oferecida nas fichas com Evolução por Patentes (e nunca usa a de uma classe oficial)." }),
        tem ? tabela(d.patentes.patentes, function (e, i) { return PATENTES[i]; }, H().ESCOLHAS_PATENTE, "hbc-pat-") : null,
      ]);
    }
    /* ---------- 6. revisão ---------- */
    function definicao() { var x = JSON.parse(JSON.stringify(d)); x.nome = r.nome || "Classe Homebrew"; x.resumo = r.descricao; x.homebrewId = reg ? reg.id : "rascunho"; return H().normalizarClasse(x); }
    function passo6() {
      var def = definicao();
      var f = H().faltas(def);
      return el("div.pc-editor__passo", {}, [
        el("p.t-rotulo", { texto: "Prévia (com todos os atributos em 2)" }),
        el("ul.hbe-mini", {}, H().previa(def, { agi: 2, for: 2, int: 2, pre: 2, vig: 2 }).map(function (t) { return el("li", { texto: t }); })),
        el("p.t-rotulo", { texto: "Automático" }),
        el("ul.hbe-mini", {}, ["PV, PE, SAN e PD pela tabela, em cada marco.", "As vagas de cada marco aparecem na Progressão da ficha e na Ramificação.", def.poderesDe ? "Poderes de classe: os do " + C().classe(def.poderesDe).nome + " e os gerais." : "Poderes de classe: só os gerais.", (def.trilhasDe ? "Trilhas: as do " + C().classe(def.trilhasDe).nome : "Trilhas: nenhuma oficial") + (def.trilhasHomebrew.length ? ", mais " + def.trilhasHomebrew.length + " Homebrew escolhida(s)" : "") + "; as trilhas feitas só para esta classe entram sempre."].map(function (t) { return el("li", { texto: t }); })),
        el("p.t-rotulo", { texto: "Decisão da mesa / manual" }),
        el("ul.hbe-mini", {}, ["O efeito mecânico das habilidades escritas nos marcos (o texto aparece; a automação de cada uma é da Etapa 3)."].concat(f.map(function (x) { return "Falta a " + x + ": a classe não será oferecida nesse trilho."; })).map(function (t) { return el("li", { texto: t }); })),
        el("div.r-campo", {}, [el("span.r-rotulo", { texto: "Visibilidade" }), el("div.filtros__grupo", { role: "group", "aria-label": "Visibilidade" }, [["privado", "Privada"], ["publico", "Pública"]].map(function (x) {
          return el("button.filtro", { type: "button", "aria-pressed": String(r.visibilidade === x[0]), texto: x[1], onclick: function () { r.visibilidade = x[0]; mudou(true); } });
        })), el("p.r-ajuda", { texto: "Publicar não coloca a classe na ficha de ninguém: quem quiser a escolhe na criação do agente." })]),
      ]);
    }
    function pintarLado() {
      var def = definicao();
      var f = H().faltas(def);
      U.trocar(lado, [
        el("p.t-rotulo", { texto: "Revisão" }),
        el("p.t-secao", { texto: r.nome || "Sem nome" }),
        el("ul.hbe-mini", {}, H().previa(def, { agi: 2, for: 2, int: 2, pre: 2, vig: 2 }).map(function (t) { return el("li", { texto: t }); })),
        el("p.t-mini", { texto: "Trilhos: " + ["NEX e nível" + (def.progressao ? " ✓" : " — falta a tabela"), "Patentes" + (def.patentes ? " ✓" : " — falta a tabela")].join(" · ") }),
        f.length ? el("p.t-mini.t-aviso", { texto: "Sem " + f.join(" e ") + ", a classe não aparece nesse trilho." }) : null,
      ]);
    }

    async function salvar(fechar) {
      if (!U.aparar(r.nome)) { r.passo = 1; pintar(); UI.avisoErro("Dê um nome à classe."); var n = document.getElementById("hbc-nome"); if (n) n.focus(); return; }
      if (!d.progressao && !d.patentes) { r.passo = 4; pintar(); UI.avisoErro("A classe precisa de ao menos uma tabela (NEX/nível ou Patentes) para ser usada."); return; }
      var def = definicao(); delete def.chave; delete def.homebrewId;
      var g = A().guardar("ordem", "estrutural", "classe", { id: reg ? reg.id : undefined, nome: r.nome, descricao: r.descricao, valores: {}, classe: def, visibilidade: r.visibilidade, modeloAnterior: reg ? reg.modelo : null });
      if (!g.ok) { UI.avisoErro(g.erro); return; }
      var resp = await global.RAMAApi.salvarHomebrew(g.registro);
      if (!resp.ok) { UI.avisoDeFalha(resp, "gravação da classe"); return; }
      if (H() && H().carregarBiblioteca) H().carregarBiblioteca(true);
      r.sujo = false;
      fechar();
      UI.avisoOk(reg ? "Classe atualizada. As fichas que já a usam continuam com a versão delas." : "Classe criada. Ela aparece na criação de agentes de Ordem, em Classes Homebrew.");
      if (o.aoSalvar) o.aoSalvar(resp.dados && resp.dados.id);
    }

    pintar();
    var p = document.getElementById("hbc-nome"); if (p) p.focus();
    return janela;
  }

  global.RAMAHomebrewClasse = { editor: editor };
})(window);
