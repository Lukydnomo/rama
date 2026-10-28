/* =====================================================================
   R.A.M.A. — Oblívio · criação guiada da Persona (v3.0)
   ---------------------------------------------------------------------
   Oito etapas, numa janela:

     1. Persona      nome, retrato, campanha e notas
     2. Papel        os cinco, com limite, lista e Habilidade Principal
     3. Atributos    10 pontos, 0 a 10, com os Mutáveis calculados ao vivo
     4. Conhecimentos  3 da lista do Papel + metade de Mente da lista toda
     5. Corpo        o limite de Estresse pelas regiões (mín. 1 cada) e,
                     se quiser, menos regiões (Próteses, Aprimorar, Ir Além)
     6. Equipamentos os iniciais, contando os que vão carregados (p. 67)
     7. Motivação    as seis do livro (ou 1D6) e o texto
     8. Revisão      o que o motor confere (validarCriacao) e Criar

   Tudo é conferido pelo motor (js/oblivio/regras.js) — esta tela não
   tem regra própria. Nenhuma sugestão substitui o que já foi escolhido:
   "Sugerir distribuição" só preenche as regiões ainda não mexidas.
   Habilidades além da Principal dependem da Testemunha e não são
   concedidas aqui.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;

  function C() { return global.RAMAOblivioCatalogo; }
  function R() { return global.RAMAOblivio; }
  function UI() { return global.RAMAUI; }

  var ETAPAS = [
    { chave: "persona", nome: "Persona" },
    { chave: "papel", nome: "Papel" },
    { chave: "atributos", nome: "Atributos" },
    { chave: "conhecimentos", nome: "Conhecimentos" },
    { chave: "corpo", nome: "Corpo" },
    { chave: "equipamentos", nome: "Equipamentos" },
    { chave: "motivacao", nome: "Motivação" },
    { chave: "revisao", nome: "Revisão" },
  ];

  function abrir(opcoes) {
    if (!C() || !R()) { UI().avisoErro("A criação de Oblívio não está disponível nesta página."); return; }
    var op = opcoes || {};
    var campanhas = op.campanhas || [];
    var o = R().fichaVazia();
    var info = { nome: "", campanhaId: "", notas: "", foto: "" };
    var mexidas = {};
    var etapa = 0;
    /* Os grupos do catálogo abertos continuam abertos ao levar um item. */
    var gruposAbertos = {};
    var criando = false;

    var corpo = el("div.oblivio-criar");
    var trilha = el("ol.oblivio-criar__trilha", { "aria-label": "Etapas da criação" });

    function erros() { return R().validarCriacao(o).erros; }
    function errosDaEtapa(chave) {
      var mapa = { papel: ["papel"], atributos: ["atributos", "carne", "forca", "fuga", "determinacao", "mente"], conhecimentos: ["especializacoes"], corpo: ["corpo"], equipamentos: ["equipamentos"] };
      var campos = mapa[chave] || [];
      var lista = erros().filter(function (e) { return campos.indexOf(e.campo) >= 0; });
      if (chave === "persona" && !info.nome.trim()) lista.push({ texto: "Dê um nome à Persona." });
      return lista;
    }

    function desenharTrilha() {
      U.trocar(trilha, ETAPAS.map(function (e, i) {
        var pend = errosDaEtapa(e.chave).length;
        return el("li", {}, [el("button.oblivio-criar__passo", {
          type: "button", "aria-current": i === etapa ? "step" : null,
          class: pend && i < etapa ? "oblivio-criar__passo--pendente" : (!pend && i < etapa ? "oblivio-criar__passo--feito" : ""),
          onclick: function () { etapa = i; desenhar(); },
        }, [el("span.oblivio-criar__n", { texto: String(i + 1) }), el("span", { texto: e.nome + (pend && i < etapa ? " · pendente" : "") })])]);
      }));
    }

    function bloco(titulo, ajuda, filhos) {
      return el("section.oblivio-criar__etapa", {}, [
        el("h3.t-secao", { texto: titulo }),
        ajuda ? el("p.t-mini", { texto: ajuda }) : null,
      ].concat(filhos));
    }

    function avisos(chave) {
      var e = errosDaEtapa(chave);
      if (!e.length) return el("p.oblivio-criar__ok", { role: "status", texto: "Tudo certo nesta etapa." });
      return el("ul.oblivio-criar__pendencias", { role: "status" }, e.map(function (x) { return el("li", { texto: x.texto }); }));
    }

    /* ---------------- 1. Persona ---------------- */
    function etapaPersona() {
      var nome = UI().campo({ rotulo: "Nome da Persona", valor: info.nome, limite: 80, aoMudar: function (v) { info.nome = v; desenharTrilha(); }, aoDigitar: true });
      var campanha = UI().campo({ rotulo: "Campanha", tipo: "selecao", valor: info.campanhaId,
        opcoes: [{ valor: "", rotulo: "Sem campanha (ficha avulsa)" }].concat(campanhas.map(function (c) { return { valor: c.id, rotulo: c.nome }; })),
        aoMudar: function (v) { info.campanhaId = v; } });
      var notas = UI().campo({ rotulo: "Informações da Persona", tipo: "area", linhas: 3, valor: info.notas, limite: 2000, aoMudar: function (v) { info.notas = v; }, aoDigitar: true });
      var previa = el("span.r-avatar.r-avatar--g", { "aria-hidden": "true" }, info.foto ? [el("img", { src: info.foto, alt: "" })] : [U.iniciais(info.nome || "?")]);
      var botao = el("button.r-botao.r-botao--fantasma", { type: "button", texto: info.foto ? "Trocar retrato" : "Escolher retrato",
        onclick: async function () {
          if (!global.RAMAEditorImagem) return;
          botao.disabled = true;
          var img;
          try { img = await global.RAMAEditorImagem.escolher("retrato"); } finally { botao.disabled = false; }
          if (!img.ok) return;
          info.foto = img.imagem;
          U.trocar(previa, [el("img", { src: img.imagem, alt: "" })]);
        } });
      return bloco("Persona", "Quem é ela. O retrato e as notas podem esperar.", [el("div.faixa", {}, [previa, botao]), nome, campanha, notas, avisos("persona")]);
    }

    /* ---------------- 2. Papel ---------------- */
    function etapaPapel() {
      var grupo = "obl-papel-" + U.uuid().slice(0, 6);
      var cartoes = C().PAPEIS.map(function (p) {
        var marcado = o.papel === p.chave;
        var hab = C().habilidade[p.principal];
        var entrada = el("input", { type: "radio", name: grupo, value: p.chave, checked: marcado,
          onchange: function () {
            if (o.papel !== p.chave) {
              /* Trocar de Papel limpa as especializações do Papel anterior. */
              o.especializacoes = o.especializacoes.filter(function (s) { return s.origem !== "papel"; });
            }
            o.papel = p.chave; desenhar();
          } });
        return el("label.oblivio-papel", { class: marcado ? "oblivio-papel--marcado" : "", style: "--cor-papel:" + p.cor }, [
          entrada,
          el("span.oblivio-papel__nome", { texto: p.nome }),
          el("span.oblivio-papel__resumo", { texto: p.resumo }),
          el("span.oblivio-papel__dado", { texto: "Limite de Estresse: " + p.estresse + " + Carne" }),
          el("span.oblivio-papel__dado", { texto: "Especializações: " + p.lista.map(function (k) { return C().conhecimento[k].nome; }).join(", ") }),
          el("span.oblivio-papel__dado", { texto: "Habilidade Principal: " + hab.nome }),
          el("span.t-mini", { texto: "p. " + p.pag }),
        ]);
      });
      return bloco("Papel", "Papéis repetidos no grupo são permitidos — o livro só recomenda variedade (p. 17).", [
        el("div.oblivio-papeis", { role: "radiogroup", "aria-label": "Papel" }, cartoes), avisos("papel")]);
    }

    /* ---------------- 3. Atributos ---------------- */
    function etapaAtributos() {
      var soma = C().ATRIBUTOS.reduce(function (s, a) { return s + o.atributos[a.chave]; }, 0);
      var restantes = C().CRIACAO.pontos - soma;
      var linhas = C().ATRIBUTOS.map(function (a) {
        return el("div.oblivio-criar__atributo", {}, [
          el("span.oblivio-criar__atr-nome", { texto: a.nome }),
          UI().passo({ valor: o.atributos[a.chave], minimo: 0, maximo: 10, rotulo: a.nome,
            aoMudar: function (v) { o.atributos[a.chave] = v; desenhar(); } }),
          el("span.t-mini", { texto: a.resumo }),
        ]);
      });
      var m = R().calcularMutaveis(o);
      var danoEscolha = UI().campo({ rotulo: "Dano soma Força com…", tipo: "selecao", valor: o.escolhas.dano,
        opcoes: [{ valor: "carne", rotulo: "Carne" }, { valor: "fuga", rotulo: "Fuga" }], aoMudar: function (v) { o.escolhas.dano = v; desenhar(); } });
      var mut = el("dl.oblivio-mutaveis", {}, ["coragem", "dano", "folego", "protecao", "velocidade"].reduce(function (lista, k) {
        var x = m[k];
        var valor = k === "coragem" ? x.base : x.total;
        return lista.concat([el("dt", { texto: C().mutavel[k].nome }), el("dd", {}, [el("strong", { texto: String(valor) }), el("span.t-mini", { texto: " " + x.partes[0].fonte })])]);
      }, []));
      return bloco("Atributos Fixos", "10 pontos, cada atributo de 0 a 10 (p. 32). Os Mutáveis são (A + B) / 2, arredondado para baixo.", [
        el("p.oblivio-criar__contador", { role: "status", class: restantes ? "oblivio-criar__contador--falta" : "", texto: restantes > 0 ? "Restam " + restantes + " ponto(s)." : restantes < 0 ? "Passou " + (-restantes) + " ponto(s)." : "Todos os 10 pontos distribuídos." }),
        el("div.oblivio-criar__atributos", {}, linhas), danoEscolha,
        el("h4.t-rotulo", { texto: "Atributos Mutáveis (calculados)" }), mut, avisos("atributos")]);
    }

    /* ---------------- 4. Conhecimentos ---------------- */
    function etapaConhecimentos() {
      var p = C().papel[o.papel];
      if (!p) return bloco("Conhecimentos", "Escolha um Papel antes.", []);
      var extras = R().metade(o.atributos.mente);
      var doPapel = o.especializacoes.filter(function (s) { return s.origem === "papel"; }).map(function (s) { return s.conhecimento; });
      var daMente = o.especializacoes.filter(function (s) { return s.origem === "mente"; }).map(function (s) { return s.conhecimento; });
      function alternar(k, origem, limite) {
        var tem = o.especializacoes.filter(function (s) { return s.conhecimento === k; })[0];
        if (tem) o.especializacoes = o.especializacoes.filter(function (s) { return s !== tem; });
        else if (o.especializacoes.filter(function (s) { return s.origem === origem; }).length < limite) o.especializacoes.push({ id: R().novoId("es"), conhecimento: k, origem: origem });
        desenhar();
      }
      var listaPapel = p.lista.map(function (k) {
        var marcado = doPapel.indexOf(k) >= 0;
        var bloqueado = daMente.indexOf(k) >= 0 || (!marcado && doPapel.length >= 3);
        return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: marcado, disabled: bloqueado, onchange: function () { alternar(k, "papel", 3); } }),
          el("span", { texto: C().conhecimento[k].nome + " — " + C().conhecimento[k].resumo })]);
      });
      var listaMente = C().CONHECIMENTOS.filter(function (c) { return doPapel.indexOf(c.chave) < 0; }).map(function (c) {
        var marcado = daMente.indexOf(c.chave) >= 0;
        return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: marcado, disabled: !marcado && daMente.length >= extras, onchange: function () { alternar(c.chave, "mente", extras); } }),
          el("span", { texto: c.nome })]);
      });
      return bloco("Conhecimentos Especializados", "+" + o.ajustes.bonusEspecializacao + " nos testes deles (p. 48).", [
        el("h4.t-rotulo", { texto: "Do Papel (" + doPapel.length + "/3)" }), el("div.oblivio-criar__checks", {}, listaPapel),
        el("h4.t-rotulo", { texto: "Por metade de Mente (" + daMente.length + "/" + extras + ")" }),
        extras ? el("div.oblivio-criar__checks", {}, listaMente) : el("p.t-mini", { texto: "Com Mente " + o.atributos.mente + ", nenhuma extra." }),
        avisos("conhecimentos")]);
    }

    /* ---------------- 5. Corpo ---------------- */
    function etapaCorpo() {
      if (!o.papel) return bloco("Corpo", "Escolha um Papel antes.", []);
      R().sincronizarAprimorar(o);
      var d = R().distribuicao(o);
      var regs = o.corpo.regioes.map(function (r) {
        var cat = C().regiao[r.chave];
        var estado = cat.essencial ? null : UI().campo({ rotulo: "Estado", tipo: "selecao", valor: r.estado,
          opcoes: [{ valor: "organica", rotulo: "Orgânica" }, { valor: "protese", rotulo: "Prótese (até 5)" }, { valor: "ausente", rotulo: "Ausente" }],
          aoMudar: function (v) { r.estado = v; if (v === "ausente") r.limite = 0; else if (r.limite < 1) r.limite = 1; mexidas[r.chave] = true; desenhar(); } });
        return el("div.oblivio-criar__regiao", { dataset: { regiao: r.chave } }, [
          el("span.oblivio-criar__reg-nome", { texto: cat.nome }),
          r.estado === "ausente" ? el("span.t-mini", { texto: "Ausente" }) :
            UI().passo({ valor: r.limite, minimo: 1, maximo: r.estado === "protese" ? 5 : 99, rotulo: "Limite de " + cat.nome,
              aoMudar: function (v) { r.limite = v; mexidas[r.chave] = true; desenhar(); } }),
          estado,
        ]);
      });
      var faltando = o.corpo.regioes.filter(function (r) { return r.estado !== "organica"; }).length;
      var menos = faltando ? UI().campo({ rotulo: "Jogando com menos regiões (p. 42)", tipo: "selecao", valor: o.escolhas.menosRegioes,
        opcoes: [{ valor: "", rotulo: "Escolha…" }, { valor: "proteses", rotulo: "Usar Próteses" }, { valor: "aprimorar", rotulo: "Aprimorar o Corpo (+1 limite e +1 Coragem por região ausente)" }, { valor: "irAlem", rotulo: "Ir Além (Sobrecarga)" }],
        aoMudar: function (v) { o.escolhas.menosRegioes = v; desenhar(); } }) : null;
      var sugerir = el("button.r-botao.r-botao--mini", { type: "button", texto: "Sugerir distribuição nas regiões não mexidas",
        onclick: function () {
          var s = R().sugerirDistribuicao(o);
          o.corpo.regioes.forEach(function (r) { if (!mexidas[r.chave] && s[r.chave] !== undefined && r.estado !== "ausente") r.limite = s[r.chave]; });
          desenhar();
        } });
      var diagrama = global.RAMAOblivioCorpo ? global.RAMAOblivioCorpo.diagrama(o, { somenteLeitura: true, compacto: true }) : null;
      return bloco("Corpo e Estresse", "Limite de " + C().papel[o.papel].nome + ": " + R().limiteTotal(o).partes.map(function (x) { return x.fonte + " " + x.valor; }).join(" + ") + " = " + d.limite + ". Mínimo 1 por região; o Torso esgotado deixa Fora de Ação.", [
        el("p.oblivio-criar__contador", { role: "status", class: d.falta ? "oblivio-criar__contador--falta" : "", texto: d.falta > 0 ? "Distribua mais " + d.falta + "." : d.falta < 0 ? "Retire " + (-d.falta) + "." : "Limite inteiro distribuído (" + d.limite + ")." }),
        el("div.oblivio-criar__corpo", {}, [diagrama, el("div.oblivio-criar__regioes", {}, regs)]), sugerir, menos, avisos("corpo")]);
    }

    /* ---------------- 6. Equipamentos ---------------- */
    function etapaEquipamentos() {
      var esp = R().espacosDeInventario(o);
      var usados = o.inventario.itens.reduce(function (s, i) { return s + C().equipamento[i.chave].espacos * (i.qtd || 1); }, 0);
      var escolha = UI().campo({ rotulo: "Espaços de inventário somam 5 + …", tipo: "selecao", valor: o.escolhas.inventario,
        opcoes: [{ valor: "carne", rotulo: "Carne" }, { valor: "forca", rotulo: "Força" }], aoMudar: function (v) { o.escolhas.inventario = v; desenhar(); } });
      var grupos = [["Consumíveis", function (e) { return e.tipo === "consumivel"; }], ["Armas", function (e) { return e.classe === "arma"; }], ["Proteções", function (e) { return e.classe === "escudo" || e.classe === "vestimenta"; }], ["Outros duráveis", function (e) { return e.classe === "protese"; }]];
      var catalogo = grupos.map(function (g) {
        return el("details.oblivio-criar__grupo", { open: !!gruposAbertos[g[0]], ontoggle: function (ev) { gruposAbertos[g[0]] = ev.currentTarget.open; } }, [el("summary", { texto: g[0] }), el("ul.oblivio-catalogo", {}, C().EQUIPAMENTOS.filter(g[1]).map(function (e) {
          var req = R().requisitosDoItem(o, { chave: e.chave });
          return el("li.oblivio-catalogo__item", {}, [
            el("span.oblivio-catalogo__nome", { texto: e.nome }),
            el("span.t-mini", { texto: [e.espacos + " esp.", e.dano ? "dano " + e.dano.toUpperCase() : "", e.bonusProtecao ? "+" + e.bonusProtecao + " Proteção" : "", e.usos ? e.usos + " uso(s)" : "", "p. " + e.pag].filter(Boolean).join(" · ") }),
            el("span.t-mini.oblivio-catalogo__resumo", { texto: e.resumo }),
            el("button.r-botao.r-botao--mini", { type: "button", texto: "Levar", disabled: !req.ok, title: req.ok ? "" : req.motivo,
              onclick: function () { R().adicionarItem(o, e.chave); desenhar(); } }),
          ]);
        }))]);
      });
      var escolhidos = o.inventario.itens.map(function (i) {
        var cat = C().equipamento[i.chave];
        var regiao = UI().campo({ rotulo: "Vai", tipo: "selecao", valor: i.estado === "carregado" ? i.regiao || "" : "",
          opcoes: [{ valor: "", rotulo: "Guardado" }].concat(R().regioesPresentes(o).map(function (r) { return { valor: r.chave, rotulo: "Carregado: " + C().regiao[r.chave].nome }; })),
          aoMudar: function (v) {
            if (v) { var r = R().equipar(o, i.id, v); if (!r.ok) UI().avisoAtencao(r.motivo); }
            else { i.estado = "guardado"; i.regiao = null; }
            desenhar();
          } });
        return el("li.oblivio-criar__levado", {}, [
          el("span", { texto: i.nome + " (" + cat.espacos + " esp.)" }), regiao,
          el("button.r-icone", { type: "button", "aria-label": "Tirar " + i.nome, onclick: function () { o.inventario.itens = o.inventario.itens.filter(function (x) { return x !== i; }); desenhar(); } }, [UI().simbolo("x")]),
        ]);
      });
      return bloco("Equipamentos iniciais", "Sem modificações de início. A soma dos espaços conta TAMBÉM os que vão carregados (p. 67).", [
        escolha,
        el("p.oblivio-criar__contador", { role: "status", class: usados > esp.total ? "oblivio-criar__contador--falta" : "", texto: usados + " de " + esp.total + " espaços." }),
        escolhidos.length ? el("ul.oblivio-criar__levados", {}, escolhidos) : el("p.t-mini", { texto: "Nada escolhido ainda — sem um conjunto obrigatório, a menos que a Testemunha defina." }),
        el("div.oblivio-criar__catalogo", {}, catalogo), avisos("equipamentos")]);
    }

    /* ---------------- 7. Motivação ---------------- */
    function etapaMotivacao() {
      var grupo = "obl-mot-" + U.uuid().slice(0, 6);
      var opcoes = C().MOTIVACOES.map(function (m) {
        return el("label.r-marca", {}, [el("input", { type: "radio", name: grupo, checked: o.motivacao.chave === m.chave, onchange: function () { o.motivacao.chave = m.chave; desenhar(); } }),
          el("span", { texto: m.d6 + " — " + m.nome + ": " + m.resumo })]);
      });
      var rolar = el("button.r-botao.r-botao--mini", { type: "button", texto: "Rolar 1D6",
        onclick: function () { var d = global.RAMADados.rolar("1d6").rolagens[0]; o.motivacao.chave = C().MOTIVACOES[d - 1].chave; UI().avisoOk("1D6: " + d + " — " + C().MOTIVACOES[d - 1].nome); desenhar(); } });
      var texto = UI().campo({ rotulo: "Em poucas palavras", tipo: "area", linhas: 3, valor: o.motivacao.texto, limite: 500, aoMudar: function (v) { o.motivacao.texto = v; }, aoDigitar: true });
      return bloco("Motivação", "Agir por ela, com impacto real na história, rende Coragem — a decisão é da Testemunha (p. 84).", [
        el("div.oblivio-criar__checks", { role: "radiogroup", "aria-label": "Motivação" }, opcoes), rolar, texto]);
    }

    /* ---------------- 8. Revisão ---------------- */
    function etapaRevisao() {
      var lista = erros();
      if (!info.nome.trim()) lista = [{ texto: "Dê um nome à Persona." }].concat(lista);
      var p = C().papel[o.papel];
      var m = R().calcularMutaveis(o);
      return bloco("Revisão", lista.length ? "Resolva as pendências antes de criar." : "Pronto para criar.", [
        lista.length ? el("ul.oblivio-criar__pendencias", { role: "alert" }, lista.map(function (x) { return el("li", { texto: x.texto }); })) : el("p.oblivio-criar__ok", { texto: "Nenhuma pendência." }),
        el("dl.oblivio-mutaveis", {}, [
          el("dt", { texto: "Nome" }), el("dd", { texto: info.nome || "—" }),
          el("dt", { texto: "Papel" }), el("dd", { texto: p ? p.nome + " — " + C().habilidade[p.principal].nome : "—" }),
          el("dt", { texto: "Atributos" }), el("dd", { texto: C().ATRIBUTOS.map(function (a) { return a.sigla + " " + o.atributos[a.chave]; }).join(" · ") }),
          el("dt", { texto: "Mutáveis" }), el("dd", { texto: "Coragem " + m.coragem.base + " · Dano " + m.dano.total + " · Fôlego " + m.folego.total + " · Proteção " + m.protecao.total + " · Velocidade " + m.velocidade.total }),
          el("dt", { texto: "Especializações" }), el("dd", { texto: o.especializacoes.map(function (s) { return C().conhecimento[s.conhecimento].nome; }).join(", ") || "—" }),
          el("dt", { texto: "Corpo" }), el("dd", { texto: R().regioesPresentes(o).map(function (r) { return C().regiao[r.chave].nome + " " + r.limite + (r.estado === "protese" ? " (prótese)" : ""); }).join(" · ") }),
          el("dt", { texto: "Equipamentos" }), el("dd", { texto: o.inventario.itens.map(function (i) { return i.nome + (i.estado === "carregado" ? " (" + C().regiao[i.regiao].nome + ")" : ""); }).join(", ") || "—" }),
          el("dt", { texto: "Motivação" }), el("dd", { texto: o.motivacao.chave ? C().motivacao[o.motivacao.chave].nome : "—" }),
        ]),
      ]);
    }

    var CONSTRUTORES = { persona: etapaPersona, papel: etapaPapel, atributos: etapaAtributos, conhecimentos: etapaConhecimentos, corpo: etapaCorpo, equipamentos: etapaEquipamentos, motivacao: etapaMotivacao, revisao: etapaRevisao };

    function desenhar() {
      desenharTrilha();
      U.trocar(corpo, [CONSTRUTORES[ETAPAS[etapa].chave]()]);
      if (botaoVoltar) botaoVoltar.disabled = etapa === 0;
      if (botaoSeguir) botaoSeguir.textContent = etapa === ETAPAS.length - 1 ? "Criar Persona" : "Seguir";
    }

    async function criar(fechar) {
      if (criando) return;
      var lista = erros();
      if (!info.nome.trim() || lista.length) { etapa = ETAPAS.length - 1; desenhar(); return; }
      criando = true;
      R().concluirCriacao(o);
      var ficha = global.RAMAFicha.criarFicha({ nome: info.nome.trim(), tipoFicha: "oblivio", campanhaId: info.campanhaId || null, oblivio: o });
      if (info.notas.trim()) ficha.anotacoes.soltas.push({ id: U.uuid(), titulo: "Informações da Persona", texto: info.notas.trim() });
      var r = await global.RAMAApi.criarPersonagem(ficha, global.RAMAApi.novaOperacao());
      criando = false;
      if (!r.ok) { UI().avisoDeFalha(r, "criação da Persona"); return; }
      if (info.foto && r.dados && r.dados.id) {
        var f = await global.RAMAApi.salvarFoto(r.dados.id, info.foto);
        if (!f.ok) UI().avisoAtencao("A Persona foi criada, mas o retrato não subiu. Tente de novo na ficha.");
      }
      fechar();
      location.href = U.url("ficha/?id=" + encodeURIComponent(r.dados.id));
    }

    var botaoVoltar = null, botaoSeguir = null;
    var m = UI().modal({
      titulo: "Nova Persona de Oblívio",
      largo: true,
      classe: "oblivio-criar-janela",
      conteudo: [el("div.oblivio-criar__topo", {}, [global.RAMACapaSistema ? global.RAMACapaSistema.elemento("oblivio", { tamanho: "p" }) : null, trilha]), corpo],
      podeFechar: function () { return !criando; },
      botoes: [
        { rotulo: "Voltar", classe: "r-botao--fantasma", aoClicar: function () { if (etapa > 0) { etapa--; desenhar(); } } },
        { rotulo: "Seguir", classe: "r-botao--principal", aoClicar: function (fechar) {
          if (etapa < ETAPAS.length - 1) { etapa++; desenhar(); return; }
          return criar(fechar);
        } },
      ],
    });
    var bs = U.$$(".r-modal__rodape .r-botao", m.janela);
    botaoVoltar = bs[0]; botaoSeguir = bs[1];
    desenhar();
    return m;
  }

  global.RAMAOblivioCriar = { abrir: abrir, ETAPAS: ETAPAS };
})(window);
