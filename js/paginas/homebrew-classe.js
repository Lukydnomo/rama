/* =====================================================================
   R.A.M.A. — Homebrew · Classe de Ordem Paranormal (v9.8)
   ---------------------------------------------------------------------
   O editor de uma classe Homebrew de Ordem I, por etapas:

     1 Identidade   nome, descrição, de onde vêm poderes e trilhas
     2 Recursos     PV / PE / SAN / PD: inicial e por marco, com a
                    parcela de atributo (ex.: Vigor) opcional
     3 Perícias     fixas, escolhas obrigatórias, livres, grau de
                    treinamento, proficiências, rituais
     4 Habilidades  as habilidades características: concedidas nos
                    marcos, sem vaga de poder, com escolha, estágios,
                    custos e efeitos que a ficha aplica
                    (js/ordem/habilidades-classe.js). Próprias ou a partir
                    das oficiais (cópias adaptáveis)
     5 NEX e nível  os 20 marcos: o que cada um concede e o que pede
     6 Patentes     a tabela de Evolução por Patentes (opcional)
     7 Revisão      a prévia do 1º marco e dos ganhos, e o que falta

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
  function HC() { return global.RAMAOrdemHabilidadesClasse; }

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
    var r = { nome: reg ? reg.nome : "", descricao: reg ? reg.descricao || "" : "", visibilidade: reg ? reg.visibilidade || "privado" : "privado", passo: 1, sujo: false, convertidas: 0 };
    /* As "habilidades iniciais" só de texto (antes da etapa Habilidades)
       viram cartões SEM efeito, no 1º marco: o mesmo que eram, agora no
       lugar de todas as habilidades. A biblioteca só muda ao salvar (e a
       ficha só com a atualização explícita da versão). */
    if (HC() && Array.isArray(d.habilidadesIniciais) && d.habilidadesIniciais.length) {
      d.habilidadesCaracteristicas = (Array.isArray(d.habilidadesCaracteristicas) ? d.habilidadesCaracteristicas : []).concat(d.habilidadesIniciais.map(function (nome) {
        return { chave: HC().novoId(), nome: String(nome).slice(0, 60), descricao: "", escolha: null, estagios: [{ nex: 5, patente: 0, custo: 0, custoPatente: null, efeitos: [] }] };
      })).slice(0, HC().MAX_HABILIDADES);
      r.convertidas = d.habilidadesIniciais.length;
      d.habilidadesIniciais = [];
    }
    /* v9.14: a ilustração opcional da classe (js/homebrew-imagem.js). */
    var imagem = global.RAMAHomebrewImagem ? global.RAMAHomebrewImagem.campo({ registro: reg, sistema: "ordem", grupo: "estrutural", subtipo: "classe", aoMudar: function () { r.sujo = true; } }) : null;
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
    var trilhasHb = null, poderesHb = null;
    if (H() && H().carregarBiblioteca) H().carregarBiblioteca().then(function (b) { trilhasHb = (b && b.trilhas) || []; poderesHb = (b && b.poderesClasse) || []; if (r.passo === 1 && form.isConnected) pintar(); }, function () { trilhasHb = []; poderesHb = []; });
    /* Os poderes de classe Homebrew: os feitos só para esta classe entram
       sempre; os das classes oficiais, a mesa marca. */
    function blocoPoderesHb() {
      if (!poderesHb) return UI.carregando("Carregando os seus poderes de classe Homebrew", { forma: "lista", plana: true, retrato: false, linhas: 1, tamanho: "curto", legado: function () { return el("p.t-mini", { texto: "Carregando os seus poderes de classe Homebrew…" }); } });
      var minha = reg ? reg.id : "";
      var proprios = poderesHb.filter(function (p) { return minha && p.classeHomebrew === minha; });
      var livres = poderesHb.filter(function (p) { return !p.classeHomebrew; });
      d.poderesHomebrew = Array.isArray(d.poderesHomebrew) ? d.poderesHomebrew : [];
      return el("fieldset.r-campo.hbc-pericias", {}, [el("legend.r-rotulo", { texto: "Poderes de classe Homebrew desta classe (opcional)" })]
        .concat(proprios.map(function (p) { return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: true, disabled: true }), el("span", { texto: p.nome + " (feito para esta classe)" })]); }))
        .concat(livres.map(function (p) {
          return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: d.poderesHomebrew.indexOf(p.homebrewId) >= 0, onchange: function (ev) {
            d.poderesHomebrew = d.poderesHomebrew.filter(function (k) { return k !== p.homebrewId; }); if (ev.target.checked) d.poderesHomebrew.push(p.homebrewId); mudou();
          } }), el("span", { texto: p.nome + " (de " + ((C().classe(p.classe) || {}).nome || p.classe) + ")" })]);
        }))
        .concat([el("p.r-ajuda", { texto: (proprios.length || livres.length ? "" : "Você ainda não tem poderes de classe Homebrew. ") + "Um poder criado \u201csó para esta classe\u201d (Habilidade → Poder de classe) entra sempre, em qualquer versão da classe" + (reg ? "." : " — salve a classe primeiro para ela aparecer lá.") })]));
    }
    function blocoTrilhasHb() {
      if (!trilhasHb) return UI.carregando("Carregando as suas trilhas Homebrew", { forma: "lista", plana: true, retrato: false, linhas: 1, tamanho: "curto", legado: function () { return el("p.t-mini", { texto: "Carregando as suas trilhas Homebrew…" }); } });
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

    var PASSOS = ["Identidade", "Recursos", "Perícias", "Habilidades", "NEX e nível", "Patentes", "Revisão"];
    function pintar() {
      var foco = document.activeElement && form.contains(document.activeElement) ? document.activeElement.id : "";
      U.trocar(form, [
        el("ol.pc-passos", { "aria-label": "Etapas" }, PASSOS.map(function (p, i) {
          return el("li", {}, [el("button.pc-passo", { type: "button", id: "hbc-passo-" + (i + 1), "aria-current": r.passo === i + 1 ? "step" : null, onclick: function () { r.passo = i + 1; pintar(); } }, [el("span.pc-passo__n", { texto: String(i + 1) }), el("span", { texto: p })])]);
        })),
        [passo1, passo2, passo3, passoHabilidades, passo4, passo5, passo6][r.passo - 1](),
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
        sel("hbc-poderes", "Poderes de classe oficiais", oficiais, d.poderesDe, function (v) { d.poderesDe = v; }),
        blocoPoderesHb(),
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
        blocoRituais(),
      ]);
    }
    /* v9.24: conjura rituais como o Ocultista? O círculo máximo por NEX. */
    function blocoRituais() {
      var porHab = !!(HC() && HC().usaConjuracao(d.habilidadesCaracteristicas));
      if (porHab && !(d.circuloPorNex && d.circuloPorNex.length)) d.circuloPorNex = JSON.parse(JSON.stringify(H().CIRCULOS_DO_OCULTISTA));
      var conj = !!(d.circuloPorNex && d.circuloPorNex.length);
      var nexes = H().NEX.map(function (n) { return [String(n), n + "%"]; });
      return el("fieldset.r-campo.hbc-rituais", {}, [
        el("legend.r-rotulo", { texto: "Rituais" }),
        el("label.r-marca", {}, [el("input", { type: "checkbox", id: "hbc-conjura", checked: conj, disabled: porHab, onchange: function (ev) {
          d.circuloPorNex = ev.target.checked ? JSON.parse(JSON.stringify(H().CIRCULOS_DO_OCULTISTA)) : undefined;
          if (!ev.target.checked) delete d.circuloPorNex;
          mudou(true);
        } }), el("span", { texto: "Conjura rituais como o Ocultista (Escolhido pelo Outro Lado)" })]),
        porHab ? el("p.t-mini", { texto: "Uma habilidade característica (etapa Habilidades) concede a conjuração: é esta tabela que ela usa. Para desligar, tire o efeito da habilidade." }) : null,
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
    /* ---------- 4. habilidades características ---------- */
    function habs() { if (!Array.isArray(d.habilidadesCaracteristicas)) d.habilidadesCaracteristicas = []; return d.habilidadesCaracteristicas; }
    function comTreino(excluir) {
      return habs().filter(function (h) { return h !== excluir && (h.estagios || []).some(function (s) { return (s.efeitos || []).some(function (e) { return e.tipo === "treinoTemporario"; }); }); });
    }
    function adicionarPreset(chave) {
      if (habs().length >= HC().MAX_HABILIDADES) { UI.avisoAtencao("Até " + HC().MAX_HABILIDADES + " habilidades por classe."); return; }
      var alvo = chave === "engenhosidade" ? (comTreino()[0] || {}).chave : undefined;
      if (chave === "engenhosidade" && !alvo) { UI.avisoAtencao("Engenhosidade melhora uma habilidade de benefícios de grau (como o Eclético). Adicione essa antes."); return; }
      var h = chave ? HC().dePreset(chave, alvo) : { chave: HC().novoId(), nome: "", descricao: "", escolha: null, estagios: [{ nex: 5, patente: 0, custo: 0, custoPatente: null, efeitos: [] }] };
      habs().push(h);
      if (chave === "escolhidoPeloOutroLado" && !(d.circuloPorNex && d.circuloPorNex.length)) d.circuloPorNex = JSON.parse(JSON.stringify(H().CIRCULOS_DO_OCULTISTA));
      mudou(true);
      setTimeout(function () { var n = document.getElementById("hbh-" + h.chave + "-nome"); if (n) n.focus(); }, 0);
    }
    function chipsDePericias(rotulo, valores, ao) {
      return el("fieldset.r-campo.hbc-pericias", {}, [el("legend.r-rotulo", { texto: rotulo })].concat(C().PERICIAS.map(function (p) {
        return el("label.r-marca.hbc-chip", {}, [el("input", { type: "checkbox", checked: (valores || []).indexOf(p.chave) >= 0, onchange: function (ev) {
          var l = (valores || []).filter(function (k) { return k !== p.chave; }); if (ev.target.checked) l.push(p.chave); ao(l); mudou(true);
        } }), el("span", { texto: p.nome })]);
      })));
    }
    function editorDeEfeito(h, s, e, i, j) {
      var pref = "hbh-" + h.chave + "-" + i + "-" + j;
      var tipo = HC().POR_TIPO[e.tipo] || {};
      var tipos = HC().TIPOS.filter(function (t) { return !t.precisaEscolha || h.escolha; }).map(function (t) { return [t.chave, (t.grupo === "passivo" ? "Passivo · " : t.grupo === "uso" ? "Ao usar · " : "Especial · ") + t.rotulo]; });
      var campos = [sel(pref + "-tipo", "Efeito", tipos, e.tipo, function (v) {
        Object.keys(e).forEach(function (k) { delete e[k]; });
        e.tipo = v;
        var t2 = HC().POR_TIPO[v];
        if (t2.valor) e.valor = Math.max(1, t2.valor[0]);
        if (t2.dado) e.dado = "1d6";
        if (t2.grau) e.grau = "treinado";
        if (t2.pericias) e.pericias = [C().PERICIAS[0].chave];
        if (t2.alvo) e.alvo = h.escolha ? "escolha" : "todas";
        if (v === "melhoraTreino") { e.alvo = (comTreino(h)[0] || {}).chave || ""; e.grau = "veterano"; e.custoExtra = 2; }
      })];
      if (tipo.valor) campos.push(num(pref + "-v", "Valor", e.valor, function (v) { e.valor = v; }));
      if (tipo.dado) campos.push(sel(pref + "-d", "Dado", HC().DADOS.map(function (x) { return [x, x]; }), e.dado, function (v) { e.dado = v; }));
      if (tipo.grau) campos.push(sel(pref + "-g", "Grau", HC().GRAUS.map(function (x) { return [x, x.charAt(0).toUpperCase() + x.slice(1)]; }), e.grau, function (v) { e.grau = v; }));
      if (tipo.pericias) campos.push(sel(pref + "-p", "Perícia", C().PERICIAS.map(function (p) { return [p.chave, p.nome]; }), (e.pericias || [])[0], function (v) { e.pericias = [v]; }));
      if (tipo.alvo) campos.push(sel(pref + "-a", "Em quais testes", [["todas", "Qualquer perícia"], ["lista", "Perícias da lista"]].concat(h.escolha ? [["escolha", "As perícias da escolha"]] : []), e.alvo, function (v) { e.alvo = v; }));
      if (e.tipo === "melhoraTreino") {
        var alvos = comTreino(h).map(function (x) { return [x.chave, x.nome || "Sem nome"]; });
        campos.push(sel(pref + "-alvo", "Melhora", alvos.length ? alvos : [["", "— nenhuma habilidade de grau —"]], e.alvo, function (v) { e.alvo = v; }));
        campos.push(num(pref + "-ce", "PE a mais", e.custoExtra, function (v) { e.custoExtra = v; }));
      }
      return el("div.hbc-efeito", {}, [
        el("div.editar-grade", {}, campos),
        tipo.alvo ? el("label.r-marca", {}, [el("input", { type: "checkbox", checked: !!e.exigeTreinada, onchange: function (ev) { if (ev.target.checked) e.exigeTreinada = true; else delete e.exigeTreinada; mudou(true); } }), el("span", { texto: "Só em perícias treinadas" })]) : null,
        tipo.alvo && e.alvo === "lista" ? chipsDePericias("Perícias da lista", e.pericias, function (l) { e.pericias = l; }) : null,
        e.tipo === "conjuracao" ? el("p.t-mini", { texto: "Usa a tabela de círculos da etapa Perícias (Rituais): 3 rituais de 1º círculo no 1º marco e um a cada marco. Uma concessão só." }) : null,
        el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Remover efeito", onclick: function () { s.efeitos.splice(j, 1); mudou(true); } }),
      ]);
    }
    function editorDeEstagio(h, s, i) {
      var pref = "hbh-" + h.chave + "-e" + i;
      s.efeitos = Array.isArray(s.efeitos) ? s.efeitos : [];
      return el("fieldset.hbc-estagio", {}, [
        el("legend.r-rotulo", { texto: i ? "Melhoria " + i + " (substitui a anterior)" : "Aquisição" }),
        el("div.editar-grade", {}, [
          sel(pref + "-nex", "NEX / nível", H().NEX.map(function (n) { return [String(n), "NEX " + n + "% · nível " + HC().degrauDoNex(n)]; }), String(s.nex), function (v) { s.nex = Number(v); }),
          sel(pref + "-pat", "Em Patentes", [["", "— não existe"]].concat(HC().PATENTES.map(function (p, k) { return [String(k), p]; })), s.patente === null || s.patente === undefined ? "" : String(s.patente), function (v) { s.patente = v === "" ? null : Number(v); }),
          num(pref + "-c", "Custo ao usar (PE)", s.custo, function (v) { s.custo = v; }, "Com “Jogando sem Sanidade”, em PD."),
          el("div.r-campo", {}, [el("label", { for: pref + "-cp", texto: "Custo em Patentes (PD)" }), el("input.r-entrada.r-entrada--numero", { id: pref + "-cp", inputmode: "numeric", maxlength: 2, placeholder: "o mesmo", value: s.custoPatente === null || s.custoPatente === undefined ? "" : String(s.custoPatente), oninput: function (ev) { s.custoPatente = ev.target.value === "" ? null : Number(ev.target.value) || 0; mudou(); } })]),
        ]),
        el("div.pilha--curta", { class: "pilha" }, s.efeitos.map(function (e, j) { return editorDeEfeito(h, s, e, i, j); })),
        el("div.faixa", {}, [
          s.efeitos.length < HC().MAX_EFEITOS ? el("button.r-botao.r-botao--mini", { type: "button", texto: "+ Efeito", onclick: function () { s.efeitos.push({ tipo: "bonusTeste", valor: 2, alvo: h.escolha ? "escolha" : "todas" }); mudou(true); } }) : null,
          i ? el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Remover melhoria", onclick: function () { h.estagios.splice(i, 1); mudou(true); } }) : null,
        ]),
      ]);
    }
    function cartaoDeHabilidade(h, k) {
      var pref = "hbh-" + h.chave;
      var nome = el("input.r-entrada", { id: pref + "-nome", value: h.nome || "", maxlength: 60, oninput: function (ev) { h.nome = ev.target.value; mudou(); } });
      var desc = el("textarea.r-area", { id: pref + "-desc", rows: 2, maxlength: 1200, oninput: function (ev) { h.descricao = ev.target.value; mudou(); } }); desc.value = h.descricao || "";
      h.estagios = Array.isArray(h.estagios) && h.estagios.length ? h.estagios : [{ nex: 5, patente: 0, custo: 0, custoPatente: null, efeitos: [] }];
      var todas = HC().normalizarLista(habs().map(function (x) { return Object.assign({}, x, { nome: x.nome || "Sem nome" }); }));
      var norm = todas.filter(function (x) { return x.chave === h.chave; })[0];
      var semAuto = !h.estagios.some(function (s) { return (s.efeitos || []).length; });
      var temUso = h.estagios.some(function (s) { return (s.efeitos || []).some(function (e) { return (HC().POR_TIPO[e.tipo] || {}).grupo === "uso"; }); });
      return el("article.hbc-hab", { "aria-labelledby": pref + "-titulo" }, [
        el("div.faixa.hbc-hab__topo", {}, [
          el("p.t-secao", { id: pref + "-titulo", texto: (h.nome || "Sem nome") }),
          el("span.hbc-hab__selo", { texto: semAuto ? "Só texto" : (temUso ? "Com uso" : "Passiva") }),
          h.escolha ? el("span.hbc-hab__selo", { texto: "Pede escolha" }) : null,
          h.base ? el("span.t-mini", { texto: "Partiu de: " + HC().ROTULOS_PRESET[h.base] + " (cópia; a oficial não muda)" }) : null,
          el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Remover", "aria-label": "Remover " + (h.nome || "a habilidade"), onclick: function () { habs().splice(k, 1); mudou(true); } }),
        ]),
        el("div.r-campo", {}, [el("label", { for: pref + "-nome", texto: "Nome" }), nome]),
        el("div.r-campo", {}, [el("label", { for: pref + "-desc", texto: "Descrição (aparece no cartão; não é interpretada)" }), desc]),
        el("div.editar-grade", {}, [
          sel(pref + "-esc", "Escolha do jogador", [["", "Nenhuma"], ["pericias", "Perícias"]], h.escolha ? "pericias" : "", function (v) { h.escolha = v ? { tipo: "pericias", quantidade: 2, modo: "treinada" } : null; }),
          h.escolha ? num(pref + "-q", "Quantas", h.escolha.quantidade, function (v) { h.escolha.quantidade = v; }) : null,
          h.escolha ? sel(pref + "-m", "Quais", [["treinada", "Só treinadas"], ["qualquer", "Qualquer perícia"]], h.escolha.modo, function (v) { h.escolha.modo = v; }) : null,
        ]),
        h.escolha ? chipsDePericias("Não podem ser escolhidas", h.escolha.exceto, function (l) { h.escolha.exceto = l; }) : null,
        el("div.pilha--curta", { class: "pilha" }, h.estagios.map(function (s, i) { return editorDeEstagio(h, s, i); })),
        h.estagios.length < HC().MAX_ESTAGIOS ? el("button.r-botao.r-botao--mini", { type: "button", texto: "+ Melhoria em outro marco", onclick: function () {
          var ult = h.estagios[h.estagios.length - 1];
          var prox = H().NEX.filter(function (n) { return n > ult.nex; })[0];
          if (!prox) { UI.avisoAtencao("O último estágio já está em NEX 99%."); return; }
          h.estagios.push({ nex: prox, patente: ult.patente === null || ult.patente === undefined ? null : Math.min(4, ult.patente + 1), custo: ult.custo, custoPatente: ult.custoPatente, efeitos: JSON.parse(JSON.stringify(ult.efeitos || [])) });
          mudou(true);
        } }) : null,
        el("div.hbc-hab__previa", {}, [el("p.t-rotulo", { texto: "Na ficha" }), el("ul.hbe-mini", {}, (norm ? HC().previa(norm, todas) : ["Ajuste os campos acima."]).map(function (t) { return el("li", { texto: t }); }))]),
        semAuto ? el("p.t-mini.t-aviso", { texto: "Sem efeito configurado: a ficha mostra o cartão com o texto, e a mesa aplica." }) : null,
      ]);
    }
    function passoHabilidades() {
      if (!HC()) return el("div.pc-editor__passo", {}, [el("p.t-aviso", { texto: "As habilidades características não carregaram nesta página." })]);
      var podeEngenho = comTreino().length > 0;
      return el("div.pc-editor__passo", {}, [
        r.convertidas ? el("p.t-mini.t-aviso", { texto: r.convertidas + " habilidade(s) só de texto desta classe viraram cartões sem efeito (no 1º marco). Dá para dar efeito a elas aqui; salve a classe para guardar." }) : null,
        el("p.t-mini", { texto: "Habilidades que a classe concede sozinha nos marcos — sem ocupar vaga de poder. Sem efeito configurado, a habilidade é só texto: aparece como cartão, e a mesa aplica. Cada uma pode pedir uma escolha (feita na criação e na Progressão), ter melhorias em marcos seguintes (cada uma substitui a anterior) e efeitos que a ficha aplica: os passivos entram na conta; os de uso aparecem nas rolagens, com o custo do estágio. Independem dos poderes e trilhas da etapa 1." }),
        el("div.faixa", {}, [
          el("button.r-botao.r-botao--mini", { type: "button", id: "hbh-nova", texto: "+ Habilidade própria", onclick: function () { adicionarPreset(""); } }),
        ].concat(["ataqueEspecial", "ecletico", "perito", "engenhosidade", "escolhidoPeloOutroLado"].map(function (k) {
          return el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "+ " + HC().ROTULOS_PRESET[k], disabled: k === "engenhosidade" && !podeEngenho, title: k === "engenhosidade" && !podeEngenho ? "Precisa antes de uma habilidade de benefícios de grau (como o Eclético)." : "Uma cópia adaptável da oficial", onclick: function () { adicionarPreset(k); } });
        }))),
        habs().length ? el("div.pilha", {}, habs().map(cartaoDeHabilidade)) : el("p.t-mini", { texto: "Nenhuma habilidade característica ainda." }),
      ]);
    }

    /* ---------- 5. NEX e nível ---------- */
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
    function definicao() { var x = JSON.parse(JSON.stringify(d)); if (Array.isArray(x.habilidadesCaracteristicas) && !x.habilidadesCaracteristicas.length) delete x.habilidadesCaracteristicas; x.nome = r.nome || "Classe Homebrew"; x.resumo = r.descricao; x.homebrewId = reg ? reg.id : "rascunho"; return H().normalizarClasse(x); }
    function passo6() {
      var def = definicao();
      var f = H().faltas(def);
      return el("div.pc-editor__passo", {}, [
        el("p.t-rotulo", { texto: "Prévia (com todos os atributos em 2)" }),
        el("ul.hbe-mini", {}, H().previa(def, { agi: 2, for: 2, int: 2, pre: 2, vig: 2 }).map(function (t) { return el("li", { texto: t }); })),
        el("p.t-rotulo", { texto: "Automático" }),
        el("ul.hbe-mini", {}, ["PV, PE, SAN e PD pela tabela, em cada marco.", "As vagas de cada marco aparecem na Progressão da ficha e na Ramificação.", (def.poderesDe ? "Poderes de classe: os do " + C().classe(def.poderesDe).nome + " e os gerais" : "Poderes de classe: os gerais") + (def.poderesHomebrew.length ? ", mais " + def.poderesHomebrew.length + " Homebrew escolhido(s)" : "") + "; os feitos só para esta classe entram sempre.", (def.trilhasDe ? "Trilhas: as do " + C().classe(def.trilhasDe).nome : "Trilhas: nenhuma oficial") + (def.trilhasHomebrew.length ? ", mais " + def.trilhasHomebrew.length + " Homebrew escolhida(s)" : "") + "; as trilhas feitas só para esta classe entram sempre."].map(function (t) { return el("li", { texto: t }); })),
        def.habilidadesCaracteristicas ? el("p.t-rotulo", { texto: "Habilidades características" }) : null,
        def.habilidadesCaracteristicas ? el("div.pilha--curta", { class: "pilha" }, def.habilidadesCaracteristicas.map(function (h) {
          return el("div", {}, [el("p.t-secao", { texto: h.nome }), el("ul.hbe-mini", {}, HC().previa(h, def.habilidadesCaracteristicas).map(function (t) { return el("li", { texto: t }); }))]);
        })) : null,
        el("p.t-rotulo", { texto: "Decisão da mesa / manual" }),
        el("ul.hbe-mini", {}, ["O efeito mecânico do que está só em texto (os rótulos dos marcos e as habilidades sem efeito configurado). As habilidades com efeito são aplicadas pela ficha."].concat(f.map(function (x) { return "Falta a " + x + ": a classe não será oferecida nesse trilho."; })).map(function (t) { return el("li", { texto: t }); })),
        imagem ? imagem.el : null,
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
      if (!d.progressao && !d.patentes) { r.passo = 5; pintar(); UI.avisoErro("A classe precisa de ao menos uma tabela (NEX/nível ou Patentes) para ser usada."); return; }
      var def = definicao(); delete def.chave; delete def.homebrewId;
      var g = A().guardar("ordem", "estrutural", "classe", { id: reg ? reg.id : undefined, nome: r.nome, descricao: r.descricao, valores: {}, classe: def, visibilidade: r.visibilidade, modeloAnterior: reg ? reg.modelo : null });
      if (!g.ok) { UI.avisoErro(g.erro); return; }
      var resp = await global.RAMAApi.salvarHomebrew(g.registro);
      if (!resp.ok) { UI.avisoDeFalha(resp, "gravação da classe"); return; }
      if (imagem) await imagem.salvarEm((resp.dados && resp.dados.id) || (reg && reg.id));
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
