/* =====================================================================
   R.A.M.A. — Vampiro · criação guiada (v5.0)
   ---------------------------------------------------------------------
   Doze etapas numa janela, com volta livre a qualquer uma:

      1 Conceito     nome, conceito, natureza, campanha, retrato
      2 Clã          os sete, Caitiff ou Sangue-Ralo; Perdição
      3 Senhor e Mar do Tempo   Senhor, idade (Criança da Noite,
                     Neófito, Ancilla) e geração
      4 Atributos    4 / 3 / 3 / 3 / 2 / 2 / 2 / 2 / 1
      5 Habilidades  uma das três distribuições; especializações
                     gratuitas (Erudição, Ofícios, Performance, Ciência)
                     e uma livre
      6 Disciplinas  2 e 1 do clã (Caitiff: quaisquer), um poder por
                     ponto, Ritual se houver Feitiçaria; Sangue-Ralo:
                     Alquimia só com a Qualidade
      7 Predador     especialização, Disciplina e poder, escolhas
      8 Vantagens    7 pontos (+2 ancilla), Defeitos 2 (+2), Fichas de
                     Conhecimento; Sangue-Ralo: Qualidades e Defeitos
      9 Crenças      1 a 3 Convicções, cada uma com seu Pilar
     10 Ambição e Desejo
     11 Experiência  a XP inicial da idade, nível a nível
     12 Revisão      validarCriacao e Criar

   O motor confere tudo (R.validarCriacao): esta tela não tem regra. As
   concessões do clã, da idade e do Predador são recalculadas pelo motor
   — trocar o Predador troca o que ele dá, sem duplicar.

   RAMAVampiroCriar.abrir({ campanhas })  ficha nova
   RAMAVampiroCriar.abrir({ ctx })        continuar a criação de uma
                                          ficha já gravada
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function C() { return global.RAMAVampiroCatalogo; }
  function DS() { return global.RAMAVampiroDisciplinas; }
  function R() { return global.RAMAVampiro; }
  function T() { return global.RAMAVampiroTela; }
  function UI() { return global.RAMAUI; }

  var ETAPAS = [
    { n: 1, nome: "Conceito" }, { n: 2, nome: "Clã" }, { n: 3, nome: "Senhor e idade" }, { n: 4, nome: "Atributos" },
    { n: 5, nome: "Habilidades" }, { n: 6, nome: "Disciplinas" }, { n: 7, nome: "Predador" }, { n: 8, nome: "Vantagens" },
    { n: 9, nome: "Crenças" }, { n: 10, nome: "Ambição e Desejo" }, { n: 11, nome: "Experiência" }, { n: 12, nome: "Revisão" },
  ];
  var GRATIS = ["erudicao", "oficios", "performance", "ciencia"];

  function contar(lista) { var c = {}; lista.forEach(function (v) { c[v] = (c[v] || 0) + 1; }); return c; }

  function abrir(opcoes) {
    if (!C() || !R()) { UI().avisoErro("A criação de Vampiro não está disponível nesta página."); return; }
    var op = opcoes || {};
    var ctx = op.ctx || null;
    var o = ctx ? R().normalizar(R().copiar(ctx.ficha.vampiro)) : R().fichaVazia("vampiro");
    var info = { nome: ctx ? ctx.ficha.nome : "", campanhaId: "", foto: "" };
    var campanhas = op.campanhas || [];
    var etapa = 0;
    var criando = false;
    var corpo = el("div.vamp-criar");
    var trilha = el("ol.vamp-criar__trilha", { "aria-label": "Etapas da criação" });

    function validar() { return R().validarCriacao(o); }
    function pendenciasDa(n) {
      var lista = validar().pendencias.filter(function (p) { return p.etapa === n; });
      if (n === 1 && !info.nome.trim()) lista.unshift({ texto: "Dê um nome à personagem." });
      return lista;
    }
    function vampiroPleno() { return o.natureza === "vampiro"; }
    function ralo() { return R().ehSangueRalo(o); }

    function desenharTrilha() {
      U.trocar(trilha, ETAPAS.map(function (e, i) {
        var pend = pendenciasDa(e.n).length;
        return el("li", {}, [el("button.vamp-criar__passo", {
          type: "button", "aria-current": i === etapa ? "step" : null,
          class: pend && i < etapa ? "vamp-criar__passo--pendente" : !pend && i < etapa ? "vamp-criar__passo--feito" : "",
          onclick: function () { etapa = i; desenhar(); },
        }, [el("span.vamp-criar__n", { texto: String(e.n) }), el("span", { texto: e.nome + (pend && i < etapa ? " · pendente" : "") })])]);
      }));
    }

    function estadoDaEtapa(n) {
      var pend = pendenciasDa(n);
      return el("div.vamp-criar__estado", { role: "status", dataset: { etapa: String(n) } }, [pend.length
        ? el("ul.vamp-criar__pendencias", {}, pend.map(function (p) { return el("li", { texto: p.texto }); }))
        : el("p.vamp-criar__ok", { texto: "Tudo certo nesta etapa." })]);
    }
    function bloco(titulo, ajuda, filhos, n) {
      return el("section.vamp-criar__etapa", {}, [el("h3.t-secao", { texto: titulo }), ajuda ? el("p.t-mini", { texto: ajuda }) : null]
        .concat(filhos)
        .concat([n ? estadoDaEtapa(n) : null]));
    }
    /* Um campo de texto mudou: só as pendências e a trilha — redesenhar
       a etapa inteira tiraria o foco de quem está digitando. */
    function desenharPendencias() {
      desenharTrilha();
      var atual = corpo.querySelector(".vamp-criar__estado");
      if (atual) atual.replaceWith(estadoDaEtapa(U.inteiro(atual.dataset.etapa, 1)));
    }

    function radio(grupo, marcado, rotulo, aoEscolher, extra) {
      return el("label.vamp-cartao", { class: marcado ? "vamp-cartao--marcado" : "" }, [
        el("input", { type: "radio", name: grupo, checked: marcado, onchange: aoEscolher }),
        el("span.vamp-cartao__nome", { texto: rotulo }),
      ].concat(extra || []));
    }

    /* ---------------- 1. Conceito ---------------- */
    function etapa1() {
      var nome = UI().campo({ rotulo: "Nome", valor: info.nome, limite: 80, aoDigitar: true, aoMudar: function (v) { info.nome = v; desenharPendencias(); } });
      var conceito = UI().campo({ rotulo: "Conceito (quem era em vida, em poucas palavras)", valor: o.conceito, limite: 200, aoDigitar: true, aoMudar: function (v) { o.conceito = v; desenharPendencias(); } });
      var natureza = UI().campo({ rotulo: "Natureza", tipo: "selecao", valor: o.natureza, opcoes: [{ valor: "vampiro", rotulo: "Vampiro (criação completa)" }, { valor: "carnical", rotulo: "Carniçal" }, { valor: "mortal", rotulo: "Mortal" }], aoMudar: function (v) { o.natureza = v; desenhar(); } });
      var filhos = [nome, conceito, ctx ? null : natureza];
      if (!ctx) {
        filhos.push(UI().campo({ rotulo: "Campanha", tipo: "selecao", valor: info.campanhaId, opcoes: [{ valor: "", rotulo: "Sem campanha (ficha avulsa)" }].concat(campanhas.map(function (c) { return { valor: c.id, rotulo: c.nome }; })), aoMudar: function (v) { info.campanhaId = v; } }));
        var previa = el("span.r-avatar.r-avatar--g", { "aria-hidden": "true" }, info.foto ? [el("img", { src: info.foto, alt: "" })] : [U.iniciais(info.nome || "?")]);
        var b = el("button.r-botao.r-botao--fantasma", { type: "button", texto: info.foto ? "Trocar retrato" : "Escolher retrato", onclick: async function () {
          if (!global.RAMAEditorImagem) return;
          b.disabled = true;
          var img; try { img = await global.RAMAEditorImagem.escolher("retrato"); } finally { b.disabled = false; }
          if (!img.ok) return;
          info.foto = img.imagem; U.trocar(previa, [el("img", { src: img.imagem, alt: "" })]);
        } });
        filhos.unshift(el("div.faixa", {}, [previa, b]));
      }
      return bloco("Conceito", "Quem era antes do Abraço. Carniçais e mortais seguem uma criação livre (o livro dá modelos, p. 377).", filhos, 1);
    }

    /* ---------------- 2. Clã ---------------- */
    function etapa2() {
      if (!vampiroPleno()) return bloco("Clã", "Só vampiros têm clã.", []);
      var grupo = "vamp-cla-" + U.uuid().slice(0, 6);
      var cartoes = Object.keys(C().CLAS).map(function (k) {
        var cl = C().CLAS[k];
        return radio(grupo, o.cla === k, cl.nome, function () {
          if (o.cla !== k) { o.disciplinas = {}; o.poderes = o.poderes.filter(function (p) { return p.origem !== "criacao"; }); o.perdicaoParametro = ""; }
          o.cla = k;
          if (k === "sangueRalo") { o.geracao = 14; o.predador = ""; o.criacao.semPredador = true; }
          else { o.criacao.semPredador = false; if (o.geracao > 13) o.geracao = 13; }
          desenhar();
        }, [
          el("span.vamp-cartao__dado", { texto: cl.disciplinas.length ? "Disciplinas: " + cl.disciplinas.map(T().nomeDisc).join(", ") : k === "caitiff" ? "Disciplinas: quaisquer (custam 6× na XP)" : "Sem Disciplinas de clã" }),
          el("span.vamp-cartao__dado", { texto: "Perdição: " + cl.perdicao.texto }),
          cl.compulsao ? el("span.vamp-cartao__dado", { texto: "Compulsão: " + cl.compulsao.nome }) : null,
          el("span.t-mini", { texto: "p. " + cl.pagina }),
        ]);
      });
      var extra = null;
      if (o.cla === "malkaviano") extra = UI().campo({ rotulo: "Perdição Malkaviana: categoria afligida", tipo: "selecao", valor: o.perdicaoParametro, opcoes: [{ valor: "", rotulo: "Escolha…" }, { valor: "fisico", rotulo: "Físicos" }, { valor: "social", rotulo: "Sociais" }, { valor: "mental", rotulo: "Mentais" }], aoMudar: function (v) { o.perdicaoParametro = v; desenharPendencias(); } });
      if (o.cla === "ventrue") extra = UI().campo({ rotulo: "Perdição Ventrue: a presa preferida", valor: o.perdicaoParametro, limite: 120, aoMudar: function (v) { o.perdicaoParametro = v; desenharPendencias(); } });
      return bloco("Clã", "Trocar de clã limpa as Disciplinas escolhidas na criação.", [el("div.vamp-cartoes", { role: "radiogroup", "aria-label": "Clã" }, cartoes), extra], 2);
    }

    /* ---------------- 3. Senhor e Mar do Tempo ---------------- */
    function etapa3() {
      if (!vampiroPleno()) return bloco("Senhor e idade", "Só vampiros.", []);
      var filhos = [];
      if (o.cla !== "caitiff" && !ralo()) filhos.push(UI().campo({ rotulo: "Senhor (pode ser \"desconhecido\")", valor: o.senhor, limite: 120, aoMudar: function (v) { o.senhor = v; desenharPendencias(); } }));
      if (ralo()) {
        filhos.push(UI().campo({ rotulo: "Geração", tipo: "selecao", valor: String(o.geracao), opcoes: [14, 15, 16].map(function (g) { return { valor: String(g), rotulo: g + "ª" }; }), aoMudar: function (v) { o.geracao = U.inteiro(v, 14); desenhar(); } }));
        filhos.push(el("p.t-mini", { texto: "Sangue-ralo: Potência 0, sem XP inicial da idade, sem Predador (p. 109)." }));
      } else {
        var grupo = "vamp-idade-" + U.uuid().slice(0, 6);
        filhos.push(el("div.vamp-cartoes", { role: "radiogroup", "aria-label": "Idade" }, Object.keys(C().IDADES).map(function (k) {
          var i = C().IDADES[k];
          return radio(grupo, o.idade === k, i.nome, function () { o.idade = k; if (i.geracoes.indexOf(o.geracao) < 0) o.geracao = i.geracoes[i.geracoes.length - 1]; desenhar(); }, [
            el("span.vamp-cartao__dado", { texto: i.resumo }),
            el("span.vamp-cartao__dado", { texto: "Geração " + i.geracoes.join(" ou ") + " · Potência " + i.potencia + " · " + i.xp + " XP · Humanidade " + i.humanidade + (i.vantagens ? " · +" + i.vantagens + " Vantagens e +" + i.defeitos + " Defeitos" : "") }),
            el("span.t-mini", { texto: "p. " + i.pagina }),
          ]);
        })));
        var idade = C().IDADES[o.idade];
        if (idade) filhos.push(UI().campo({ rotulo: "Geração", tipo: "selecao", valor: String(o.geracao), opcoes: idade.geracoes.map(function (g) { return { valor: String(g), rotulo: g + "ª (Potência " + C().GERACOES[g][0] + "–" + C().GERACOES[g][1] + ")" }; }), aoMudar: function (v) { o.geracao = U.inteiro(v, 13); desenharPendencias(); } }));
      }
      filhos.push(el("div.editar-grade", {}, [
        UI().campo({ rotulo: "Época do Abraço", valor: o.epoca, limite: 80, aoMudar: function (v) { o.epoca = v; } }),
        UI().campo({ rotulo: "Idade aparente", valor: o.idadeAparente, limite: 40, aoMudar: function (v) { o.idadeAparente = v; } }),
      ]));
      return bloco("Senhor e o Mar do Tempo", "", filhos, 3);
    }

    /* ---------------- 4. Atributos ---------------- */
    function etapa4() {
      var atuais = C().ATRIBUTOS.map(function (a) { return o.atributos[a.chave] || 0; });
      var alvo = contar(C().DISTRIBUICAO_DE_ATRIBUTOS), tem = contar(atuais);
      var resumo = [4, 3, 2, 1].map(function (v) { return v + ": " + (tem[v] || 0) + "/" + alvo[v]; }).join(" · ");
      var linhas = ["fisico", "social", "mental"].map(function (cat) {
        return el("div.vamp-coluna", {}, [el("h4.t-rotulo", { texto: C().CATEGORIAS[cat] })].concat(C().ATRIBUTOS.filter(function (a) { return a.categoria === cat; }).map(function (a) {
          return el("div.vamp-linha", {}, [el("span.vamp-linha__nome", { texto: a.nome }), T().pontos({ valor: o.atributos[a.chave], maximo: 4, minimo: 1, rotulo: a.nome, aoMudar: function (v) { o.atributos[a.chave] = Math.max(1, v); desenhar(); } })]);
        })));
      });
      var vit = R().vitalidadeMaxima(o), fdv = R().fdvMaxima(o);
      return bloco("Atributos", "Um com 4, três com 3, quatro com 2 e um com 1 (p. 154). Vitalidade = Vigor + 3; Força de Vontade = Autocontrole + Determinação.", [
        el("p.vamp-criar__contador", { role: "status", texto: resumo }),
        el("div.vamp-grade", {}, linhas),
        el("p", { texto: "Vitalidade " + vit + " · Força de Vontade " + fdv }),
      ], 4);
    }

    /* ---------------- 5. Habilidades ---------------- */
    function etapa5() {
      var dist = C().DISTRIBUICOES_DE_HABILIDADES[o.criacao.distribuicao];
      var grupo = "vamp-dist-" + U.uuid().slice(0, 6);
      var dists = el("div.vamp-cartoes", { role: "radiogroup", "aria-label": "Distribuição" }, Object.keys(C().DISTRIBUICOES_DE_HABILIDADES).map(function (k) {
        var d = C().DISTRIBUICOES_DE_HABILIDADES[k];
        var c = contar(d.valores);
        return radio(grupo, o.criacao.distribuicao === k, d.nome, function () { o.criacao.distribuicao = k; desenhar(); }, [el("span.vamp-cartao__dado", { texto: Object.keys(c).sort(function (a, b) { return b - a; }).map(function (v) { return c[v] + " com " + v; }).join(", ") })]);
      }));
      var contador = null;
      if (dist) {
        var alvo = contar(dist.valores);
        var tem = contar(C().HABILIDADES.map(function (h) { return o.habilidades[h.chave] || 0; }).filter(Boolean));
        contador = el("p.vamp-criar__contador", { role: "status", texto: Object.keys(alvo).sort(function (a, b) { return b - a; }).map(function (v) { return v + ": " + (tem[v] || 0) + "/" + alvo[v]; }).join(" · ") });
      }
      var linhas = ["fisico", "social", "mental"].map(function (cat) {
        return el("div.vamp-coluna", {}, [el("h4.t-rotulo", { texto: C().CATEGORIAS[cat] })].concat(C().HABILIDADES.filter(function (h) { return h.categoria === cat; }).map(function (h) {
          return el("div.vamp-linha", {}, [el("span.vamp-linha__nome", { texto: h.nome }), T().pontos({ valor: o.habilidades[h.chave] || 0, maximo: 4, rotulo: h.nome, aoMudar: function (v) {
            o.habilidades[h.chave] = v;
            if (!v) o.especializacoes = o.especializacoes.filter(function (e) { return e.habilidade !== h.chave; });
            desenhar();
          } })]);
        })));
      });
      /* Especializações: as gratuitas e a livre. */
      var esps = [];
      GRATIS.forEach(function (k) {
        if (!o.habilidades[k]) return;
        var atual = o.especializacoes.filter(function (e) { return e.habilidade === k && e.origem === "gratis"; })[0];
        esps.push(UI().campo({ rotulo: "Especialização gratuita em " + T().nomeHab(k), valor: atual ? atual.nome : "", limite: 80, dica: (C().habilidade(k).exemplos || []).slice(0, 3).join(", "),
          aoMudar: function (v) {
            o.especializacoes = o.especializacoes.filter(function (e) { return !(e.habilidade === k && e.origem === "gratis"); });
            if (v.trim()) o.especializacoes.push({ id: R().novoId("es"), habilidade: k, nome: v.trim(), origem: "gratis" });
            desenharPendencias();
          } }));
      });
      var livre = o.especializacoes.filter(function (e) { return e.origem === "criacao"; })[0] || { habilidade: "", nome: "" };
      var selLivre = UI().campo({ rotulo: "Especialização livre: Habilidade", tipo: "selecao", valor: livre.habilidade, opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(C().HABILIDADES.filter(function (h) { return o.habilidades[h.chave]; }).map(function (h) { return { valor: h.chave, rotulo: h.nome }; })) });
      var nomeLivre = UI().campo({ rotulo: "Especialização livre: nome", valor: livre.nome, limite: 80 });
      function gravarLivre() {
        o.especializacoes = o.especializacoes.filter(function (e) { return e.origem !== "criacao"; });
        if (selLivre.entrada.value && nomeLivre.entrada.value.trim()) o.especializacoes.push({ id: R().novoId("es"), habilidade: selLivre.entrada.value, nome: nomeLivre.entrada.value.trim(), origem: "criacao" });
        desenharPendencias();
      }
      selLivre.entrada.addEventListener("change", gravarLivre);
      nomeLivre.entrada.addEventListener("change", gravarLivre);
      return bloco("Habilidades", "Escolha a distribuição e marque os pontos. Erudição, Ofícios, Performance e Ciência ganham uma especialização gratuita; mais uma livre (p. 157–159).", [
        vampiroPleno() ? dists : null, contador, el("div.vamp-grade", {}, linhas), el("h4.t-rotulo", { texto: "Especializações" }), el("div.editar-grade", {}, esps.concat([selLivre, nomeLivre])),
      ], 5);
    }

    /* ---------------- 6. Disciplinas ---------------- */
    function etapa6() {
      if (!vampiroPleno()) return bloco("Disciplinas", "Carniçal: um ponto numa Disciplina do domitor, à parte da criação (aba Disciplinas, modo Edição).", []);
      if (ralo()) {
        var alq = o.sangueRalo.qualidades.indexOf("alquimista") >= 0;
        if (!alq) return bloco("Disciplinas", "Sangue-ralo não tem Disciplinas intrínsecas: elas vêm temporárias pela Ressonância. A Alquimia exige a Qualidade Alquimista Sangue-Ralo (etapa 8).", [], 6);
        o.disciplinas = { alquimia: 1 };
        var formulas = DS().PODERES.filter(function (x) { return x.formula && x.nivel === 1; });
        var atual = o.formulas.filter(function (f) { return f.origem === "criacao"; })[0];
        return bloco("Alquimia Sangue-Ralo", "1 ponto em Alquimia, um método e uma fórmula de nível 1 (p. 282).", [
          UI().campo({ rotulo: "Método", tipo: "selecao", valor: o.metodoAlquimia, opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(Object.keys(DS().METODOS_DE_ALQUIMIA).map(function (k) { return { valor: k, rotulo: DS().METODOS_DE_ALQUIMIA[k].nome + " — " + DS().METODOS_DE_ALQUIMIA[k].texto }; })), aoMudar: function (v) { o.metodoAlquimia = v; desenharPendencias(); } }),
          UI().campo({ rotulo: "Fórmula de nível 1", tipo: "selecao", valor: atual ? atual.chave : "", opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(formulas.map(function (x) { return { valor: x.chave, rotulo: x.nome }; })), aoMudar: function (v) {
            o.formulas = o.formulas.filter(function (f) { return f.origem !== "criacao"; });
            if (v) o.formulas.push({ id: R().novoId("fo"), chave: v, origem: "criacao" });
            desenharPendencias();
          } }),
        ], 6);
      }
      if (!o.cla) return bloco("Disciplinas", "Escolha o clã antes.", [], 6);
      var opcoes = o.cla === "caitiff" ? Object.keys(DS().DISCIPLINAS).filter(function (k) { return k !== "alquimia"; }) : C().CLAS[o.cla].disciplinas;
      var duas = Object.keys(o.disciplinas).filter(function (k) { return o.disciplinas[k] === 2; })[0] || "";
      var uma = Object.keys(o.disciplinas).filter(function (k) { return o.disciplinas[k] === 1; })[0] || "";
      function definir(d2, d1) {
        o.disciplinas = {};
        if (d2) o.disciplinas[d2] = 2;
        if (d1 && d1 !== d2) o.disciplinas[d1] = 1;
        o.poderes = o.poderes.filter(function (p) { if (p.origem !== "criacao") return true; var d = DS().poder(p.chave); return d && o.disciplinas[d.disciplina]; });
        desenhar();
      }
      var conc = R().concessoes(o);
      var predDisc = conc.filter(function (x) { return x.tipo === "disciplina"; }).map(function (x) { return x.alvo; });
      var seletoresDePoder = Object.keys(o.disciplinas).map(function (k) {
        var total = R().valorDeDisciplina(o, k);
        var meus = o.poderes.filter(function (p) { var d = DS().poder(p.chave); return p.origem === "criacao" && d && d.disciplina === k; });
        var precisa = o.disciplinas[k];
        return el("div.pilha.pilha--curta", {}, [el("h4.t-rotulo", { texto: T().nomeDisc(k) + " " + total + " — " + precisa + " poder(es) da criação" + (predDisc.indexOf(k) >= 0 ? " (+1 do Predador, na etapa 7)" : "") })].concat(Array.from({ length: precisa }, function (_, i) {
          var atual = meus[i];
          var possiveis = DS().daDisciplina(k).filter(function (x) { return !x.formula && x.nivel <= total; });
          return UI().campo({ rotulo: "Poder " + (i + 1), tipo: "selecao", valor: atual ? atual.chave : "", opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(possiveis.map(function (x) { return { valor: x.chave, rotulo: x.nivel + " · " + x.nome + (x.amalgama ? " (amálgama: " + T().nomeDisc(x.amalgama.disciplina) + " " + x.amalgama.nivel + ")" : "") }; })),
            aoMudar: function (v) {
              if (atual) o.poderes = o.poderes.filter(function (p) { return p !== atual; });
              if (v) {
                var pode = R().podeAdquirirPoder(o, v, { disciplina: k, nivel: total });
                if (!pode.ok) { UI().avisoAtencao(pode.motivo); desenhar(); return; }
                o.poderes.push({ id: R().novoId("po"), chave: v, origem: "criacao" });
              }
              desenhar();
            } });
        })));
      });
      var ritual = null;
      if (R().valorDeDisciplina(o, "feiticaria")) {
        var r1 = o.rituais.filter(function (r) { return r.origem === "criacao"; })[0];
        ritual = UI().campo({ rotulo: "Ritual de nível 1 (Feitiçaria de Sangue)", tipo: "selecao", valor: r1 ? r1.chave : "", opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(DS().RITUAIS.filter(function (r) { return r.nivel === 1; }).map(function (r) { return { valor: r.chave, rotulo: r.nome }; })), aoMudar: function (v) {
          o.rituais = o.rituais.filter(function (r) { return r.origem !== "criacao"; });
          if (v) o.rituais.push({ id: R().novoId("ri"), chave: v, origem: "criacao" });
          desenharPendencias();
        } });
      }
      return bloco("Disciplinas", "Dois pontos numa e um noutra" + (o.cla === "caitiff" ? " (Caitiff: quaisquer)" : " do clã") + "; um poder por ponto, de nível igual ou menor (p. 159).", [
        el("div.editar-grade", {}, [
          UI().campo({ rotulo: "Dois pontos em", tipo: "selecao", valor: duas, opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(opcoes.map(function (k) { return { valor: k, rotulo: T().nomeDisc(k) }; })), aoMudar: function (v) { definir(v, uma); } }),
          UI().campo({ rotulo: "Um ponto em", tipo: "selecao", valor: uma, opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(opcoes.map(function (k) { return { valor: k, rotulo: T().nomeDisc(k) }; })), aoMudar: function (v) { definir(duas, v); } }),
        ]),
      ].concat(seletoresDePoder).concat([ritual]), 6);
    }

    /* ---------------- 7. Predador ---------------- */
    function etapa7() {
      if (!vampiroPleno()) return bloco("Predador", "Só vampiros.", []);
      if (ralo()) return bloco("Predador", "Sangue-ralo não escolhe tipo de Predador na criação.", []);
      var grupo = "vamp-pred-" + U.uuid().slice(0, 6);
      var cartoes = Object.keys(C().PREDADORES).map(function (k) {
        var p = C().PREDADORES[k];
        var proibido = p.proibidoPara && p.proibidoPara.indexOf(o.cla) >= 0;
        return radio(grupo, o.predador === k, p.nome + (proibido ? " (não para " + C().CLAS[o.cla].nome + ")" : ""), function () { R().escolherPredador(o, k, {}); desenhar(); }, [
          el("span.vamp-cartao__dado", { texto: "Especialização: " + p.especializacoes.map(function (e) { return T().nomeHab(e.habilidade) + " (" + e.nome + ")"; }).join(" ou ") }),
          el("span.vamp-cartao__dado", { texto: "Disciplina: " + p.disciplinas.map(T().nomeDisc).join(" ou ") + (p.soTremere ? " (" + p.soTremere.map(T().nomeDisc).join(", ") + " só Tremere)" : "") }),
          el("span.vamp-cartao__dado", { texto: [p.humanidade ? "Humanidade " + (p.humanidade > 0 ? "+" : "") + p.humanidade : "", p.potencia ? "Potência +" + p.potencia : "", (p.vantagens || []).map(function (v) { return T().nomeDe(C().VANTAGENS, v.chave) + " " + v.pontos; }).join(", "), (p.defeitos || []).map(function (v) { return T().nomeDe(C().VANTAGENS, v.chave) + " " + v.pontos + (v.nota ? " (" + v.nota + ")" : ""); }).join(", ")].filter(Boolean).join(" · ") }),
          el("span.t-mini", { texto: "Caça: " + p.parada.map(function (x) { return x.map(function (y) { return C().atributo(y) ? T().nomeAtr(y) : C().habilidade(y) ? T().nomeHab(y) : T().nomeDe(C().VANTAGENS, y); }).join(" + "); }).join(" ou ") + " · p. " + p.pagina }),
        ]);
      });
      var p = C().PREDADORES[o.predador];
      var escolhas = [];
      if (p) {
        var esc = o.criacao.predador;
        function regravar() { R().escolherPredador(o, o.predador, esc); desenhar(); }
        escolhas.push(UI().campo({ rotulo: "Especialização do Predador", tipo: "selecao", valor: String(esc.especializacao), opcoes: [{ valor: "-1", rotulo: "Escolha…" }].concat(p.especializacoes.map(function (e, i) { return { valor: String(i), rotulo: T().nomeHab(e.habilidade) + " (" + e.nome + ")" }; })), aoMudar: function (v) { esc.especializacao = U.inteiro(v, -1); regravar(); } }));
        escolhas.push(UI().campo({ rotulo: "Disciplina do Predador (+1 ponto)", tipo: "selecao", valor: esc.disciplina, opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(p.disciplinas.filter(function (d) { return !(p.soTremere && p.soTremere.indexOf(d) >= 0 && o.cla !== "tremere"); }).map(function (d) { return { valor: d, rotulo: T().nomeDisc(d) }; })), aoMudar: function (v) { esc.disciplina = v; esc.poder = ""; regravar(); } }));
        if (esc.disciplina) {
          var nivel = R().valorDeDisciplina(o, esc.disciplina);
          escolhas.push(UI().campo({ rotulo: "Poder do ponto do Predador (nível ≤ " + nivel + ")", tipo: "selecao", valor: esc.poder, opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(DS().daDisciplina(esc.disciplina).filter(function (x) { return !x.formula && x.nivel <= nivel && !o.poderes.some(function (q) { return q.chave === x.chave; }) && (!x.amalgama || R().valorDeDisciplina(o, x.amalgama.disciplina) >= x.amalgama.nivel); }).map(function (x) { return { valor: x.chave, rotulo: x.nivel + " · " + x.nome }; })), aoMudar: function (v) { esc.poder = v; regravar(); } }));
        }
        (p.escolhas || []).forEach(function (es, i) {
          var feito = esc.escolhas[String(i)];
          if (es.tipo === "defeitoUnico") {
            escolhas.push(UI().campo({ rotulo: "Defeito do Predador", tipo: "selecao", valor: feito || "", opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(es.entre.map(function (x) { return { valor: x.chave, rotulo: T().nomeDe(C().VANTAGENS, x.chave) + " " + x.pontos + (x.nota ? " (" + x.nota + ")" : "") }; })), aoMudar: function (v) { esc.escolhas[String(i)] = v; regravar(); } }));
            return;
          }
          var mapa = feito && typeof feito === "object" ? feito : {};
          var opcoesV = [];
          es.entre.forEach(function (g) { (C().GRUPOS_DE_DEFEITO[g] || [g]).forEach(function (k) { if (C().VANTAGENS[k] && opcoesV.indexOf(k) < 0) opcoesV.push(k); }); });
          escolhas.push(el("div.pilha.pilha--curta", {}, [el("h4.t-rotulo", { texto: "Reparta " + es.pontos + " ponto(s) entre: " + opcoesV.map(function (k) { return C().VANTAGENS[k].nome; }).join(", ") })].concat(opcoesV.map(function (k) {
            return el("div.vamp-linha", {}, [el("span.vamp-linha__nome", { texto: C().VANTAGENS[k].nome }), UI().passo({ valor: mapa[k] || 0, minimo: 0, maximo: es.pontos, rotulo: C().VANTAGENS[k].nome, aoMudar: function (v) { mapa[k] = v; if (!v) delete mapa[k]; esc.escolhas[String(i)] = mapa; R().escolherPredador(o, o.predador, esc); desenharPendencias(); } })]);
          }))));
        });
      }
      return bloco("Tipo de Predador", "Como caça. Dá uma especialização, um ponto de Disciplina (com o poder), e Vantagens e Defeitos (p. 175–178). Trocar de Predador troca tudo o que ele dá.", [el("div.vamp-cartoes", { role: "radiogroup", "aria-label": "Predador" }, cartoes)].concat(escolhas), 7);
    }

    /* ---------------- 8. Vantagens ---------------- */
    function etapa8() {
      var V = C().VANTAGENS;
      var idade = C().IDADES[o.idade];
      var extra = idade && !ralo() ? idade.vantagens : 0, extraDef = idade && !ralo() ? idade.defeitos : 0;
      var qual = o.vantagens.filter(function (v) { return v.origem === "criacao" && V[v.chave].tipo !== "defeito"; }).reduce(function (s, v) { return s + v.pontos; }, 0)
        + o.fichas.filter(function (f) { return f.origem === "criacao"; }).reduce(function (s, f) { return s + f.nivel; }, 0);
      var defe = o.vantagens.filter(function (v) { return v.origem === "criacao" && V[v.chave].tipo === "defeito"; }).reduce(function (s, v) { return s + v.pontos; }, 0);
      var lista = o.vantagens.filter(function (v) { return v.origem === "criacao"; }).map(function (v) {
        return el("li.faixa", {}, [el("span", { texto: V[v.chave].nome + " " + v.pontos + (v.nota ? " (" + v.nota + ")" : "") + (V[v.chave].tipo === "defeito" ? " — Defeito" : "") }),
          el("button.r-icone", { type: "button", "aria-label": "Tirar " + V[v.chave].nome, onclick: function () { o.vantagens = o.vantagens.filter(function (x) { return x !== v; }); desenhar(); } }, [UI().simbolo("x")])]);
      }).concat(o.fichas.filter(function (f) { return f.origem === "criacao"; }).map(function (f) {
        var fd = C().FICHAS_DE_CONHECIMENTO[f.ficha];
        return el("li.faixa", {}, [el("span", { texto: "Ficha de Conhecimento: " + fd.nome + " — nível " + f.nivel + " (" + fd.niveis[f.nivel - 1].nome + ")" }),
          el("button.r-icone", { type: "button", "aria-label": "Tirar " + fd.nome, onclick: function () { o.fichas = o.fichas.filter(function (x) { return x !== f; }); desenhar(); } }, [UI().simbolo("x")])]);
      }));
      var daCriacao = R().concessoes(o).filter(function (x) { return x.tipo === "vantagem"; });
      var selV = UI().campo({ rotulo: "Vantagem ou Defeito", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(Object.keys(V).filter(function (k) { return !(V[k].proibidoPara && V[k].proibidoPara.indexOf(o.cla) >= 0); }).map(function (k) { return { valor: k, rotulo: (V[k].tipo === "defeito" ? "Defeito · " : "") + V[k].grupo + " · " + V[k].nome + " (" + V[k].niveis.join("/") + ")" }; })) });
      var pts = UI().campo({ rotulo: "Pontos", tipo: "numero", valor: 1 });
      var nota = UI().campo({ rotulo: "Nota (quem, onde…)", valor: "", limite: 200 });
      var selF = UI().campo({ rotulo: "Ficha de Conhecimento", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(Object.keys(C().FICHAS_DE_CONHECIMENTO).filter(function (k) { var f = C().FICHAS_DE_CONHECIMENTO[k]; return !f.cla || f.cla === o.cla; }).map(function (k) { return { valor: k, rotulo: C().FICHAS_DE_CONHECIMENTO[k].nome }; })) });
      var nivF = UI().campo({ rotulo: "Nível (cada nível é à parte)", tipo: "selecao", valor: "1", opcoes: [1, 2, 3, 4, 5].map(function (n) { return { valor: String(n), rotulo: String(n) }; }) });
      var filhos = [
        el("p.vamp-criar__contador", { role: "status", texto: "Vantagens: " + qual + "/" + (7 + extra) + " · Defeitos: " + defe + "/" + (2 + extraDef) }),
        daCriacao.length ? el("p.t-mini", { texto: "Já vêm do clã e do Predador (não contam): " + daCriacao.map(function (x) { return V[x.chave].nome + " " + x.pontos; }).join(", ") + "." }) : null,
        lista.length ? el("ul.vamp-lista", {}, lista) : null,
        el("div.editar-grade", {}, [selV, pts, nota, el("button.r-botao.r-botao--mini", { type: "button", texto: "Adicionar", onclick: function () {
          var k = selV.entrada.value; if (!k) return;
          var n = U.inteiro(pts.entrada.value, 1);
          if (V[k].niveis.indexOf(n) < 0 && !V[k].porNivel) { UI().avisoAtencao(V[k].nome + ": " + V[k].niveis.join(" ou ") + " ponto(s)."); return; }
          o.vantagens.push({ id: R().novoId("va"), chave: k, pontos: n, nota: nota.entrada.value, parametro: "", relacaoId: "", origem: "criacao", compartilhada: false });
          desenhar();
        } })]),
        el("div.editar-grade", {}, [selF, nivF, el("button.r-botao.r-botao--mini", { type: "button", texto: "Adicionar Ficha", onclick: function () {
          var k = selF.entrada.value; if (!k) return;
          var n = U.inteiro(nivF.entrada.value, 1);
          if (o.fichas.some(function (f) { return f.ficha === k && f.nivel === n; })) return;
          o.fichas.push({ id: R().novoId("fc"), ficha: k, nivel: n, origem: "criacao" });
          desenhar();
        } })]),
      ];
      if (ralo()) {
        var SR = C().SANGUE_RALO;
        filhos.push(el("h4.t-rotulo", { texto: "Sangue-Ralo: de 1 a 3 Qualidades, e o mesmo número de Defeitos" }));
        filhos.push(el("div.vamp-criar__checks", {}, Object.keys(SR.qualidades).map(function (k) {
          return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: o.sangueRalo.qualidades.indexOf(k) >= 0, onchange: function (ev) {
            if (ev.currentTarget.checked) o.sangueRalo.qualidades.push(k); else o.sangueRalo.qualidades = o.sangueRalo.qualidades.filter(function (x) { return x !== k; });
            if (k === "alquimista" && !ev.currentTarget.checked) { o.disciplinas = {}; o.formulas = o.formulas.filter(function (f) { return f.origem !== "criacao"; }); }
            desenhar();
          } }), el("span", { texto: SR.qualidades[k].nome + " — " + SR.qualidades[k].texto })]);
        })));
        filhos.push(el("div.vamp-criar__checks", {}, Object.keys(SR.defeitos).map(function (k) {
          return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: o.sangueRalo.defeitos.indexOf(k) >= 0, onchange: function (ev) {
            if (ev.currentTarget.checked) o.sangueRalo.defeitos.push(k); else o.sangueRalo.defeitos = o.sangueRalo.defeitos.filter(function (x) { return x !== k; });
            desenhar();
          } }), el("span", { texto: SR.defeitos[k].nome + " — " + SR.defeitos[k].texto })]);
        })));
      }
      return bloco("Vantagens e Defeitos", "7 pontos de Vantagens (Qualidades, Antecedentes, Fichas de Conhecimento) e 2 de Defeitos" + (extra ? ", +" + extra + " e +" + extraDef + " para ancillae" : "") + " (p. 179).", filhos, 8);
    }

    /* ---------------- 9. Crenças ---------------- */
    function etapa9() {
      var itens = o.convicoes.map(function (cv) {
        var pilar = o.pilares.filter(function (p) { return p.convicaoId === cv.id; })[0];
        return el("li.vamp-crenca", {}, [
          UI().campo({ rotulo: "Convicção", valor: cv.texto, limite: 300, aoMudar: function (v) { cv.texto = v; desenharPendencias(); } }),
          UI().campo({ rotulo: "Pilar (quem a sustenta)", valor: pilar ? pilar.nome : "", limite: 120, aoMudar: function (v) {
            o.pilares = o.pilares.filter(function (p) { return p.convicaoId !== cv.id; });
            if (v.trim()) o.pilares.push({ id: R().novoId("pi"), nome: v.trim(), descricao: "", convicaoId: cv.id, estado: "ok" });
            desenharPendencias();
          } }),
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Tirar", onclick: function () { o.convicoes = o.convicoes.filter(function (x) { return x !== cv; }); o.pilares = o.pilares.filter(function (p) { return p.convicaoId !== cv.id; }); desenhar(); } }),
        ]);
      });
      return bloco("Convicções e Pilares", "De 1 a 3 Convicções, cada uma presa a um Pilar: alguém (ou algo) que lembra o que é ser humano (p. 172). Ficam privadas.", [
        el("ul.vamp-crencas", {}, itens),
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Nova Convicção", disabled: o.convicoes.length >= 3, onclick: function () { o.convicoes.push({ id: R().novoId("cv"), texto: "" }); desenhar(); } }),
      ], 9);
    }

    /* ---------------- 10. Ambição e Desejo ---------------- */
    function etapa10() {
      return bloco("Ambição e Desejo", "A Ambição é o objetivo de longo prazo; o Desejo, o de curto (p. 173–174). Trabalhá-los devolve Força de Vontade.", [
        UI().campo({ rotulo: "Ambição", tipo: "area", linhas: 2, valor: o.ambicao, limite: 300, aoDigitar: true, aoMudar: function (v) { o.ambicao = v; desenharPendencias(); } }),
        UI().campo({ rotulo: "Desejo", tipo: "area", linhas: 2, valor: o.desejo, limite: 300, aoDigitar: true, aoMudar: function (v) { o.desejo = v; desenharPendencias(); } }),
      ], 10);
    }

    /* ---------------- 11. Experiência ---------------- */
    function etapa11() {
      var c = R().calcular(o);
      var tipo = "habilidade", alvo = "", para = 1, nomeEsp = "", poder = "";
      var previa = el("p.vamp-previa", { role: "status" });
      function pedido() { return { tipo: tipo, alvo: alvo, para: para, nome: nomeEsp, poderes: poder ? [poder] : [], ressonancia: true, sangueProvado: true }; }
      function conferir() { var v = R().validarCompra(o, pedido()); previa.textContent = v.ok ? "Custa " + v.custo + " XP." : v.motivo; }
      var alvoCampo = el("div");
      function desenharAlvo() {
        var opcoes = tipo === "atributo" ? C().ATRIBUTOS.map(function (a) { return { valor: a.chave, rotulo: a.nome }; })
          : tipo === "disciplina" ? Object.keys(DS().DISCIPLINAS).filter(function (k) { return k !== "alquimia" || ralo(); }).map(function (k) { return { valor: k, rotulo: T().nomeDisc(k) + " (" + R().valorDeDisciplina(o, k) + ")" }; })
          : tipo === "vantagem" ? Object.keys(C().VANTAGENS).filter(function (k) { return C().VANTAGENS[k].tipo !== "defeito"; }).map(function (k) { return { valor: k, rotulo: C().VANTAGENS[k].nome }; })
          : C().HABILIDADES.map(function (h) { return { valor: h.chave, rotulo: h.nome + " (" + R().valorDeHabilidade(o, h.chave) + ")" }; });
        var campos = [UI().campo({ rotulo: "O quê", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(opcoes), aoMudar: function (v) { alvo = v; poder = ""; desenharAlvo2(); conferir(); } })];
        if (tipo !== "especializacao") campos.push(UI().campo({ rotulo: "Novo valor", tipo: "numero", valor: 1, aoMudar: function (v) { para = U.inteiro(v, 1); desenharAlvo2(); conferir(); } }));
        else campos.push(UI().campo({ rotulo: "Especialização", valor: "", limite: 80, aoMudar: function (v) { nomeEsp = v; conferir(); } }));
        campos.push(segundo);
        U.trocar(alvoCampo, campos);
      }
      var segundo = el("div");
      function desenharAlvo2() {
        if (tipo !== "disciplina" || !alvo) { U.limpar(segundo); return; }
        var de = R().valorDeDisciplina(o, alvo);
        if (para !== de + 1) { U.trocar(segundo, [el("p.t-mini", { texto: "Na criação, compre um nível de Disciplina por vez (de " + de + " para " + (de + 1) + ")." })]); return; }
        U.trocar(segundo, [UI().campo({ rotulo: "Poder do nível novo", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(DS().daDisciplina(alvo).filter(function (x) { return !x.formula && x.nivel <= para && !R().temPoder(o, x.chave); }).map(function (x) { return { valor: x.chave, rotulo: x.nivel + " · " + x.nome }; })), aoMudar: function (v) { poder = v; conferir(); } })]);
      }
      desenharAlvo();
      var compras = o.compras.map(function (cp, i) {
        return el("li.faixa", {}, [el("span", { texto: cp.tipo + " · " + (cp.alvo || "") + (cp.para ? " → " + cp.para : "") + " — " + cp.custo + " XP" }),
          i === o.compras.length - 1 ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Desfazer", onclick: function () { desfazerUltima(); desenhar(); } }) : null]);
      });
      if (!vampiroPleno() || ralo() || !C().IDADES[o.idade] || !C().IDADES[o.idade].xp) {
        return bloco("Experiência inicial", "Sem XP inicial nesta criação.", [], 11);
      }
      return bloco("Experiência inicial", "A idade dá " + C().IDADES[o.idade].xp + " XP. Cada nível novo custa o seu (p. 151, 156).", [
        el("p.vamp-criar__contador", { role: "status", texto: c.xp.disponivel + " de " + c.xp.total + " XP disponíveis" }),
        UI().campo({ rotulo: "Comprar", tipo: "selecao", valor: tipo, opcoes: [{ valor: "atributo", rotulo: "Atributo" }, { valor: "habilidade", rotulo: "Habilidade" }, { valor: "especializacao", rotulo: "Especialização" }, { valor: "disciplina", rotulo: "Disciplina" }, { valor: "vantagem", rotulo: "Vantagem" }], aoMudar: function (v) { tipo = v; alvo = ""; para = 1; poder = ""; desenharAlvo(); conferir(); } }),
        alvoCampo, previa,
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Comprar", onclick: function () { var r = R().comprar(o, pedido()); if (!r.ok) { UI().avisoAtencao(r.motivo); return; } desenhar(); } }),
        compras.length ? el("ul.vamp-lista", {}, compras) : null,
      ], 11);
    }

    /* Desfazer a última compra DA CRIAÇÃO (a ficha ainda não existe). */
    function desfazerUltima() {
      var cp = o.compras.pop();
      if (!cp) return;
      if (cp.tipo === "especializacao") { var i = o.especializacoes.map(function (e) { return e.origem; }).lastIndexOf("xp"); if (i >= 0) o.especializacoes.splice(i, 1); }
      if (cp.tipo === "vantagemComprada") { var v = o.vantagens.filter(function (x) { return x.chave === cp.alvo && x.origem === "xp"; })[0]; if (v) { v.pontos -= cp.para - cp.de; if (v.pontos <= 0) o.vantagens = o.vantagens.filter(function (x) { return x !== v; }); } }
      if (cp.tipo === "disciplina") (cp.poderes || []).forEach(function (k) { o.poderes = o.poderes.filter(function (p) { return !(p.chave === k && p.origem === "xp"); }); });
    }

    /* ---------------- 12. Revisão ---------------- */
    function etapa12() {
      var v = validar();
      var lista = v.pendencias.slice();
      if (!info.nome.trim()) lista.unshift({ etapa: 1, texto: "Dê um nome à personagem." });
      var c = R().calcular(o);
      function dd(r, t) { return [el("dt", { texto: r }), el("dd", { texto: t || "—" })]; }
      return bloco("Revisão", lista.length ? "Há pendências. Dá para criar assim mesmo e terminar depois na ficha (o aviso fica)." : "Pronto.", [
        lista.length ? el("ul.vamp-criar__pendencias", { role: "alert" }, lista.map(function (p) { return el("li", {}, [el("button.r-link", { type: "button", texto: "Etapa " + p.etapa + ": " + p.texto, onclick: function () { etapa = Math.max(0, p.etapa - 1); desenhar(); } })]); })) : el("p.vamp-criar__ok", { texto: "Nenhuma pendência." }),
        el("dl.vamp-dl", {}, [].concat(
          dd("Nome", info.nome), dd("Conceito", o.conceito),
          dd("Clã", (C().CLAS[o.cla] || {}).nome), dd("Geração / idade", vampiroPleno() ? o.geracao + "ª · " + ((C().IDADES[o.idade] || {}).nome || "") : ""),
          dd("Predador", (C().PREDADORES[o.predador] || {}).nome),
          dd("Atributos", C().ATRIBUTOS.map(function (a) { return a.nome + " " + c.atributos[a.chave].valor; }).join(" · ")),
          dd("Habilidades", Object.keys(c.habilidades).map(function (k) { return T().nomeHab(k) + " " + c.habilidades[k].valor; }).join(" · ")),
          dd("Disciplinas", Object.keys(c.disciplinas).map(function (k) { return T().nomeDisc(k) + " " + c.disciplinas[k].valor; }).join(" · ")),
          dd("Poderes", c.poderes.map(function (p) { return (DS().poder(p.chave) || {}).nome; }).join(", ")),
          dd("Vitalidade / FdV", c.vitalidade.max + " / " + c.forcaDeVontade.max),
          dd("Humanidade / Potência", c.humanidade + " / " + c.potencia),
          dd("XP", c.xp.disponivel + " disponível de " + c.xp.total)
        )),
      ]);
    }

    var CONSTRUTORES = [etapa1, etapa2, etapa3, etapa4, etapa5, etapa6, etapa7, etapa8, etapa9, etapa10, etapa11, etapa12];

    function desenhar() {
      desenharTrilha();
      U.trocar(corpo, [CONSTRUTORES[etapa]()]);
      if (botaoVoltar) botaoVoltar.disabled = etapa === 0;
      if (botaoSeguir) botaoSeguir.textContent = etapa === ETAPAS.length - 1 ? (ctx ? "Salvar na ficha" : "Criar personagem") : "Seguir";
    }

    async function criar(fechar) {
      if (criando) return;
      if (!info.nome.trim()) { etapa = 0; desenhar(); UI().avisoAtencao("Dê um nome à personagem."); return; }
      var v = validar();
      if (v.completa) R().concluirCriacao(o);
      if (ctx) {
        T().operar(ctx, function (b) { Object.keys(o).forEach(function (k) { if (k !== "operacoes") b[k] = o[k]; }); return { ok: true, eventos: [] }; }, { silencioso: true });
        if (v.completa) UI().avisoOk("Criação concluída.");
        fechar();
        return;
      }
      criando = true;
      var ficha = global.RAMAFicha.criarFicha({ nome: info.nome.trim(), tipoFicha: "vampiro", campanhaId: info.campanhaId || null, vampiro: o });
      var r = await global.RAMAApi.criarPersonagem(ficha, global.RAMAApi.novaOperacao());
      criando = false;
      if (!r.ok) { UI().avisoDeFalha(r, "criação da personagem"); return; }
      if (info.foto && r.dados && r.dados.id) {
        var f = await global.RAMAApi.salvarFoto(r.dados.id, info.foto);
        if (!f.ok) UI().avisoAtencao("A personagem foi criada, mas o retrato não subiu. Tente de novo na ficha.");
      }
      fechar();
      location.href = U.url("ficha/?id=" + encodeURIComponent(r.dados.id));
    }

    var botaoVoltar = null, botaoSeguir = null;
    var m = UI().modal({
      titulo: ctx ? "Continuar a criação" : "Nova personagem de Vampiro",
      largo: true,
      classe: "vamp-criar-janela",
      conteudo: [el("div.vamp-criar__topo", {}, [global.RAMACapaSistema ? global.RAMACapaSistema.elemento("vampiro", { tamanho: "p" }) : null, trilha]), corpo],
      podeFechar: function () { return !criando; },
      botoes: [
        { rotulo: "Voltar", classe: "r-botao--fantasma", aoClicar: function () { if (etapa > 0) { etapa--; desenhar(); } } },
        { rotulo: "Seguir", classe: "r-botao--principal", aoClicar: function (fechar) {
          if (etapa < ETAPAS.length - 1) { etapa++; desenhar(); m.corpo.scrollTop = 0; return; }
          return criar(fechar);
        } },
      ],
    });
    var bs = U.$$(".r-modal__rodape .r-botao", m.janela);
    botaoVoltar = bs[0]; botaoSeguir = bs[1];
    desenhar();
    return m;
  }

  global.RAMAVampiroCriar = { abrir: abrir, ETAPAS: ETAPAS };
})(window);
