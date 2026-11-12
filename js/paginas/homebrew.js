/* =====================================================================
   R.A.M.A. — Homebrew
   ---------------------------------------------------------------------
   A biblioteca do agente: itens, armas, armaduras e mochilas criados à
   mão, guardados uma vez e reaproveitados em qualquer ficha.

   A relação com o inventário é de MODELO e CÓPIA, nunca de vínculo
   vivo. Trazer algo daqui para uma ficha cria um item novo, com id
   próprio, que só guarda de onde veio. Assim ajustar o dano da espada
   na biblioteca não muda, semanas depois, a espada de um personagem
   que já estava em jogo.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var F = global.RAMAFicha;
  var V = global.RAMAValidacao;
  var D = global.RAMADados;
  var el = U.el;
  function RT() { return global.RAMAOrdemRituais || null; }

  var registros = [];
  var busca = "";
  var tipoFiltro = "";
  var painel = null;

  var TIPOS = [
    { chave: "", rotulo: "Tudo" },
    { chave: "criatura", rotulo: "Criaturas" },
    { chave: "arma", rotulo: "Armas" },
    { chave: "armadura", rotulo: "Armaduras" },
    { chave: "item", rotulo: "Itens" },
    { chave: "mochila", rotulo: "Mochilas" },
    { chave: "habilidade", rotulo: "Habilidades" },
    { chave: "ritual", rotulo: "Rituais" },
  ];

  /* "Minhas criações" e "Públicas" são bibliotecas diferentes: a segunda
     é o que outras contas publicaram, e nela você consulta e copia, mas
     não edita. Misturar as duas numa lista só faria o botão de excluir
     aparecer em coisa que não é sua. */
  var ESCOPOS = [
    { chave: "meus", rotulo: "Minhas criações" },
    { chave: "publicos", rotulo: "Públicas" },
  ];
  var escopo = "meus";
  /* "carregando" | "erro" | "pronto". As abas existem nos três. */
  var estado = "carregando";
  var falha = null;
  var contagens = {};      // escopo → total da última carga
  var pedido = 0;          // só a resposta do último pedido desenha

  global.RAMAApp.iniciar("homebrew", async function () {
    painel = U.$("#painel-homebrew");
    await carregar();
  });

  async function carregar() {
    var meu = ++pedido;
    estado = "carregando";
    desenhar();

    var r = await global.RAMAApi.listarHomebrew({ escopo: escopo });
    if (meu !== pedido) return;
    if (!r.ok) { estado = "erro"; falha = r; desenhar(); return; }

    registros = r.dados || [];
    contagens[escopo] = registros.length;
    estado = "pronto";
    desenhar();
  }

  /* =================================================================
     CABEÇALHO E ABAS
     -----------------------------------------------------------------
     Como em Personagens: o título com a ação principal (+ Criar), a
     secundária (Importar) e o link para o catálogo oficial; logo abaixo,
     as duas bibliotecas como abas — que continuam ali carregando, com
     erro e com a biblioteca vazia.
     ================================================================= */

  function cabecalho() {
    var total = estado === "pronto" ? registros.length + " registro(s)" : "…";
    return global.RAMAApp.titulo({
      titulo: "Homebrew",
      trilha: [(escopo === "publicos" ? "Públicas" : "Biblioteca") + " // " + total],
      acoes: [
        /* v6.6: o catálogo oficial mora na página Criaturas (consultar e
           copiar para cá). Aqui ficam só as criações. */
        el("a.r-botao.r-botao--fantasma.hb-catalogo", { href: U.url("catalogo/?sistema=ordem&categoria=criaturas"), texto: "Catálogo oficial" }),
        el("button.r-botao", { type: "button", texto: "Importar", onclick: importar }),
        el("button.r-botao.r-botao--principal", {
          type: "button", texto: "+ Criar", onclick: function () { escolherTipo(); },
        }),
      ],
    });
  }

  function abas() {
    return el("div.r-abas.abas-contexto.hb-abas", { role: "tablist", "aria-label": "Bibliotecas" }, ESCOPOS.map(function (e) {
      var ativa = escopo === e.chave;
      var n = contagens[e.chave];
      return el("button.r-aba", {
        type: "button", role: "tab", id: "hb-aba-" + e.chave,
        "aria-selected": String(ativa), "aria-controls": "hb-lista", tabindex: ativa ? "0" : "-1",
        dataset: { foco: "hb-aba-" + e.chave },
        onclick: function () { trocarEscopo(e.chave); },
        onkeydown: function (ev) {
          if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
          ev.preventDefault();
          trocarEscopo(escopo === "meus" ? "publicos" : "meus");
          var outra = painel.querySelector('[data-foco="hb-aba-' + escopo + '"]');
          if (outra) outra.focus();
        },
      }, [el("span", { texto: e.rotulo }), typeof n === "number" ? el("span.abas-contexto__n", { texto: " (" + n + ")" }) : null]);
    }));
  }

  function trocarEscopo(chave) {
    if (chave === escopo) return;
    escopo = chave;
    busca = ""; tipoFiltro = "";
    carregar();
  }

  /* =================================================================
     DESENHO
     -----------------------------------------------------------------
     A barra (busca, tipo e contagem) é montada uma vez por carga; digitar
     ou trocar o tipo só repinta os resultados — o campo fica no lugar,
     com o foco e o cursor.
     ================================================================= */

  var resultados = null, contagem = null, chips = [];

  function desenhar() {
    var focoAba = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.foco : "";
    var corpo;
    if (estado === "carregando") corpo = UI.carregando("Consultando biblioteca");
    else if (estado === "erro") corpo = UI.erroDeTela(falha, carregar);
    else if (!registros.length) corpo = bibliotecaVazia();
    else corpo = el("div.hb-conteudo", {}, [barra(), resultados = el("div.hb-lista", { role: "list" })]);

    U.trocar(painel, [
      cabecalho(),
      abas(),
      el("section.hb-painel", { id: "hb-lista", role: "tabpanel", "aria-labelledby": "hb-aba-" + escopo }, [corpo]),
    ]);
    if (estado === "pronto" && registros.length) pintarResultados();
    if (focoAba && /^hb-aba-/.test(focoAba)) {
      var a = painel.querySelector('[data-foco="' + focoAba + '"]');
      if (a) a.focus();
    }
  }

  function barra() {
    var campo = el("input.r-entrada", {
      type: "search", value: busca, placeholder: "Buscar por nome, tipo ou descrição",
      "aria-label": "Buscar na biblioteca", "aria-controls": "hb-lista",
      oninput: function (ev) { busca = ev.target.value; pintarResultados(); },
    });
    chips = TIPOS.filter(function (t) { return !t.chave || contar(t.chave); }).map(function (t) {
      return el("button.filtro", {
        type: "button", dataset: { tipo: t.chave },
        "aria-pressed": String(tipoFiltro === t.chave),
        onclick: function () { tipoFiltro = t.chave; pintarResultados(); },
      }, [el("span", { texto: t.rotulo }), t.chave ? el("span.hb-chip__n", { texto: " " + contar(t.chave) }) : null]);
    });
    contagem = el("p.hb-barra__contagem", { role: "status", "aria-live": "polite" });
    return el("div.hb-barra", {}, [
      el("div.r-busca.hb-barra__busca", {}, [el("span.r-busca__marca", {}, [UI.simbolo("busca")]), campo]),
      el("div.filtros__grupo.hb-barra__tipos", { role: "group", "aria-label": "Filtrar por tipo" }, chips),
      contagem,
    ]);
  }

  function pintarResultados() {
    if (!resultados) return;
    chips.forEach(function (c) { c.setAttribute("aria-pressed", String((c.dataset.tipo || "") === tipoFiltro)); });
    var v = filtrar();
    var filtrando = !!(U.aparar(busca) || tipoFiltro);
    contagem.textContent = filtrando ? v.length + " de " + registros.length + (registros.length === 1 ? " registro" : " registros")
      : registros.length + (registros.length === 1 ? " registro" : " registros");
    U.trocar(resultados, v.length ? v.map(linha) : [nadaEncontrado()]);
  }

  function contar(tipo) {
    return registros.filter(function (r) { return r.tipo === tipo; }).length;
  }

  function filtrar() {
    var chave = U.chaveDeBusca(busca);
    return registros.filter(function (r) {
      if (tipoFiltro && r.tipo !== tipoFiltro) return false;
      if (!chave) return true;
      return U.chaveDeBusca(r.nome + " " + (r.descricao || "") + " " + rotuloDoTipo(r.tipo) + " " + resumoDe(r)).indexOf(chave) >= 0;
    });
  }

  function bibliotecaVazia() {
    if (escopo === "publicos") {
      return UI.vazio({
        titulo: "Nada publicado ainda",
        texto: "Quando alguém marcar uma criatura, item ou habilidade como pública, ela aparece aqui.",
        acao: { rotulo: "Ver minhas criações", aoClicar: function () { trocarEscopo("meus"); } },
      });
    }
    return UI.vazio({
      titulo: "Nenhuma criação ainda",
      texto: "Crie um item, uma criatura ou um ritual aqui, ou marque “guardar na biblioteca” ao criar algo no inventário de uma ficha. Em Públicas, há o que outras contas compartilharam.",
      acao: { rotulo: "+ Criar registro", aoClicar: function () { escolherTipo(); } },
    });
  }

  function nadaEncontrado() {
    return el("div.r-vazio.hb-nada", { role: "listitem" }, [
      el("p.r-vazio__titulo", { texto: "Nenhum resultado para esses filtros" }),
      el("p.r-vazio__texto", { texto: "A biblioteca tem " + registros.length + (registros.length === 1 ? " registro" : " registros") + ", mas nenhum corresponde à busca ou ao tipo escolhido." }),
      el("button.r-botao", {
        type: "button", texto: "Limpar filtros",
        onclick: function () {
          busca = ""; tipoFiltro = "";
          var campo = painel.querySelector(".hb-barra input");
          if (campo) { campo.value = ""; campo.focus(); }
          pintarResultados();
        },
      }),
    ]);
  }

  /* =================================================================
     LINHA
     -----------------------------------------------------------------
     Nome, tipo e um resumo que serve para escolher (dano e crítico,
     Defesa, elemento e círculo, sistema e a estatística principal). O
     nome abre a consulta, onde ficam a descrição longa e o código do
     registro; o menu de três pontos tem as ações, à parte.
     ================================================================= */

  function resumoDe(r) {
    var p = [];
    if (r.tipo === "arma") {
      p.push("Dano " + (r.dano || "—") + (r.danoExtra ? "+" + r.danoExtra : ""));
      p.push("Crítico " + (r.critico ? r.critico + "/x" + (r.multiplicador || 2) : "—"));
    } else if (r.tipo === "armadura") {
      p.push("Defesa " + U.inteiro(r.defesa, 0));
    } else if (r.tipo === "mochila") {
      p.push("Reduz " + U.peso(r.reducaoPeso) + " de peso");
    } else if (r.tipo === "item") {
      p.push("Peso " + U.peso(r.peso));
    } else if (r.tipo === "ritual") {
      if (r.elemento) p.push(String(r.elemento).replace(/^./, function (c) { return c.toUpperCase(); }));
      if (r.circulo) p.push(/^\d+$/.test(String(r.circulo)) ? r.circulo + "º círculo" : String(r.circulo));
      if (r.execucao) p.push(r.execucao);
    } else if (r.tipo === "habilidade") {
      if (r.origem) p.push(r.origem);
    } else if (r.tipo === "criatura") {
      p = p.concat(resumoDaCriatura(r));
    }
    return p.filter(Boolean).join(" · ");
  }

  function resumoDaCriatura(r) {
    var CR = global.RAMACriaturas;
    var p = [];
    try {
      var c = CR.normalizar(r);
      var sis = CR.sistemaDe(c);
      p.push(CR.NOMES_DOS_SISTEMAS[sis] || "Universal");
      if (sis === "oblivio" && c.oblivio) { p.push("Grau " + c.oblivio.grau); p.push("Dano " + c.oblivio.dano); }
      else if (sis === "vampiro" && c.vampiro) { if (c.vampiro.vitalidade) p.push("Vitalidade " + c.vampiro.vitalidade); }
      else if (sis === "goblins" && c.goblins) p.push("Vitalidade " + c.goblins.vitalidade);
      else if (sis === "tormenta20" && c.tormenta20) p.push("ND " + c.tormenta20.nd + " · PV " + c.tormenta20.pv);
      else {
        var s = CR.resumo(c);
        if (typeof s.vd === "number") p.push("VD " + s.vd); else if (s.nivel) p.push(s.nivel);
        if (s.pv) p.push(s.pv + " PV");
      }
    } catch (e) { /* criatura estranha: só o nome */ }
    return p;
  }

  function opcoesDe(registro) {
    /* Público de outra conta pode ser consultado e copiado, nunca editado
       nem apagado: o menu simplesmente não oferece isso — e o servidor
       recusaria de qualquer forma. */
    var meu = registro.meu !== false;
    var consulta = [{ rotulo: registro.tipo === "criatura" ? "Consultar ficha" : "Consultar", aoClicar: function () { consultar(registro); } }];
    return consulta.concat(meu
      ? [
          { rotulo: "Editar", aoClicar: function () { editar(registro); } },
          { rotulo: "Duplicar", aoClicar: function () { duplicar(registro); } },
          { rotulo: "Exportar", aoClicar: function () { exportar(registro); } },
          "separador",
          { rotulo: "Excluir", perigo: true, aoClicar: function () { excluir(registro); } },
        ]
      : [
          { rotulo: "Copiar para minha biblioteca", aoClicar: function () { duplicar(registro); } },
          { rotulo: "Exportar", aoClicar: function () { exportar(registro); } },
        ]);
  }

  function linha(registro) {
    var meu = registro.meu !== false;
    var resumo = resumoDe(registro);
    var marcas = [
      registro.visibilidade === "publico" && meu ? el("span.r-etiqueta", { texto: "Pública" }) : null,
      !meu ? el("span.r-etiqueta.r-etiqueta--para", { texto: "De outra conta" }) : null,
      UI.etiquetaColorida(registro.etiqueta),
    ].filter(Boolean);
    var simb = registro.tipo === "ritual" && RT() && RT().simbolo ? RT().simbolo(registro) : null;
    return el("article.hb-linha", { role: "listitem", class: "hb-linha--" + registro.tipo + (simb ? " hb-linha--com-simbolo" : "") }, [
      simb ? el("div.hb-linha__simbolo", {}, [simb]) : null,
      el("div.hb-linha__principal", {}, [
        el("button.hb-linha__nome", {
          type: "button", texto: registro.nome, title: "Consultar " + registro.nome,
          "aria-label": "Consultar " + registro.nome + " (" + rotuloDoTipo(registro.tipo) + ")",
          onclick: function () { consultar(registro); },
        }),
        el("p.hb-linha__meta", {}, [
          el("span.hb-linha__tipo", { texto: rotuloDoTipo(registro.tipo) }),
          resumo ? el("span.hb-linha__resumo", { texto: resumo }) : null,
        ]),
      ]),
      marcas.length ? el("div.hb-linha__marcas", {}, marcas) : null,
      el("div.hb-linha__menu", {}, [UI.menu(opcoesDe(registro), { rotulo: "Opções de " + registro.nome, icone: "tresPontos" })]),
    ]);
  }

  /* A consulta: criatura pela ficha inteira (o painel de sempre); o resto
     com os detalhes, a descrição longa e o código do registro. */
  function consultar(registro) {
    if (registro.tipo === "criatura") { consultarCriatura(registro); return; }
    var meu = registro.meu !== false;
    UI.modal({
      titulo: registro.nome,
      largo: registro.tipo === "ritual",
      conteudo: [
        el("div.faixa", { estilo: { gap: "var(--e1)" } }, [
          el("span.r-etiqueta", { texto: rotuloDoTipo(registro.tipo) }),
          registro.visibilidade === "publico" ? el("span.r-etiqueta", { texto: "Pública" }) : null,
          !meu ? el("span.r-etiqueta.r-etiqueta--para", { texto: "De outra conta" }) : null,
        ]),
        registro.tipo === "ritual" ? detalhesDoRitual(registro)
          : registro.tipo === "habilidade" ? detalhesDaHabilidade(registro) : detalhes(registro),
        registro.tipo !== "ritual" && registro.descricao ? el("p.item__descricao", { texto: registro.descricao }) : null,
        rodapeDoRegistro(registro),
      ],
      botoes: [{ rotulo: "Fechar", classe: "r-botao--fantasma" }],
    });
  }

  function detalhesDaHabilidade(r) {
    return el("div.pilha--curta", { class: "pilha" }, [
      r.origem ? el("p.t-mini", { texto: "Origem: " + r.origem }) : null,
      r.texto ? el("p.item__descricao", { texto: r.texto }) : null,
    ]);
  }

  function rodapeDoRegistro(r) {
    return el("p.t-mini.hb-registro", { texto: "Registro // " + U.codigoCurto(r.id) + (r.atualizadoEm ? " · " + U.dataCurta(r.atualizadoEm) : "") });
  }

  /* A ficha inteira de uma criatura, só para leitura. */
  function consultarCriatura(registro) {
    var painelC = global.RAMACriaturaPainel.criar(registro, { consulta: true, rotulo: "Homebrew" });
    UI.modal({ titulo: registro.nome, largo: true, conteudo: [painelC.raiz, rodapeDoRegistro(registro)], botoes: [{ rotulo: "Fechar" }] });
  }

  function rotuloDoTipo(tipo) {
    if (tipo === "criatura") return "Criatura";
    if (tipo === "habilidade") return "Habilidade";
    if (tipo === "ritual") return "Ritual";
    return F.rotuloDoTipo(tipo);
  }

  /* Editor de habilidade avulsa. Reusa o mesmo modelo da ficha, para
     não existirem dois schemas de habilidade no sistema. */
  function editarHabilidade(registro) {
    var H = global.RAMAHabilidades;
    var criando = !registro;
    var h = criando ? H.criarHabilidade({}) : H.normalizarHabilidade(registro);
    var cor = h.cor;
    var negrito = !!h.negrito;
    var etiqueta = U.normalizarEtiqueta(h.etiqueta);
    var visibilidade = (registro && registro.visibilidade) || "privado";

    var nome = UI.campo({ rotulo: "Nome", valor: h.nome, limite: 120 });
    var origem = UI.campo({ rotulo: "Origem", valor: h.origem, limite: 60 });
    var texto = UI.campo({ rotulo: "Texto", tipo: "area", valor: h.texto, linhas: 6, limite: 8000 });

    var seletorVis = el("div.filtros__grupo", { role: "group", "aria-label": "Visibilidade" },
      [{ v: "privado", r: "Privada" }, { v: "publico", r: "Pública" }].map(function (op) {
        return el("button.filtro", {
          type: "button",
          "aria-pressed": String(visibilidade === op.v),
          texto: op.r,
          onclick: function (ev) {
            visibilidade = op.v;
            U.$$(".filtro", ev.target.parentNode).forEach(function (b) {
              b.setAttribute("aria-pressed", String(b === ev.target));
            });
          },
        });
      })
    );

    UI.modal({
      titulo: criando ? "Nova habilidade" : "Editar habilidade",
      largo: true,
      conteudo: el("div.pilha", {}, [
        nome,
        UI.campoEtiqueta({ valor: etiqueta, aoMudar: function (v) { etiqueta = v; } }),
        origem, texto,
        el("label.r-marca", {}, [
          el("input", { type: "checkbox", checked: negrito,
            onchange: function (ev) { negrito = ev.target.checked; } }),
          el("span", { texto: "Texto em negrito" }),
        ]),
        UI.seletorDeCor({ valor: cor, aoMudar: function (v) { cor = v; } }),
        el("div.r-campo", {}, [
          el("span.r-rotulo", { texto: "Visibilidade" }),
          seletorVis,
          el("p.r-ajuda", { texto: "Pública: outras contas encontram esta habilidade como GERAL e podem copiá-la." }),
        ]),
      ]),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: criando ? "Criar" : "Salvar", classe: "r-botao--principal",
          aoClicar: async function (fechar) {
            var valor = nome.entrada.value.trim();
            if (!valor) { nome.marcarErro("Informe um nome."); return; }

            var pronta = H.criarHabilidade({
              nome: valor, origem: origem.entrada.value.trim(),
              texto: texto.entrada.value, cor: cor, negrito: negrito, etiqueta: etiqueta,
            });
            pronta.tipo = "habilidade";
            pronta.visibilidade = visibilidade;
            if (registro && registro.id) pronta.id = registro.id;

            var r = await global.RAMAApi.salvarHomebrew(pronta);
            if (!r.ok) { UI.avisoDeFalha(r, "gravação"); return; }

            fechar();
            await carregar();
          },
        },
      ],
    });

    nome.entrada.focus();
  }

  /* Um ritual da biblioteca: os campos preenchidos e as versões. O
     schema é o mesmo da ficha — não existe ritual de dois formatos. */
  function detalhesDoRitual(r) {
    /* v2.32: o mesmo desenho do cartão da ficha (conjuração, efeito,
       formas avançadas e complemento). */
    var S = global.RAMASecaoRituais;
    if (S && S.apresentacao) {
      var rit = F.normalizarRitual(r) || r;
      return el("div.ritual-corpo", {}, [S.marcasDoRitual(null, rit)].concat(S.apresentacao(rit, { simbolo: !!(RT() && RT().simbolo) })).filter(Boolean));
    }
    var linhas = [];
    F.CAMPOS_RITUAL.forEach(function (campo) {
      if (campo === F.CAMPO_LONGO_RITUAL) return;
      var valor = U.aparar(r[campo]);
      if (valor) linhas.push([F.ROTULOS_RITUAL_PADRAO[campo], valor]);
    });
    var versoes = (r.versoes || []).map(function (v) {
      var extras = [];
      if (v.dano) extras.push(v.dano + (v.danoExtra ? "+" + v.danoExtra : ""));
      if (v.custo) extras.push("+" + v.custo + " PE");
      return v.nome + (extras.length ? " (" + extras.join(", ") + ")" : "");
    });
    if (versoes.length) linhas.push(["Versões", versoes.join(" · ")]);

    return el("dl.r-dados", {}, linhas.reduce(function (saida, par) {
      saida.push(el("dt", { texto: par[0] }));
      saida.push(el("dd", { texto: par[1] }));
      return saida;
    }, []));
  }

  /* Editor de ritual avulso: os MESMOS campos do editor da ficha
     (js/paginas/ficha-rituais.js), com a visibilidade da biblioteca por
     cima. Dois formulários de ritual divergiriam na primeira mudança. */
  function editarRitual(registro) {
    var S = global.RAMASecaoRituais;
    if (!S || !S.camposDoRitual) {
      UI.avisoErro("O editor de rituais não carregou nesta página.");
      return;
    }
    var criando = !registro;
    var atual = criando ? F.criarRitual({}) : (F.normalizarRitual(registro) || F.criarRitual({}));
    var visibilidade = (registro && registro.visibilidade) || "privado";

    var campos = S.camposDoRitual(atual, { comOrdem: true });

    var seletorVis = el("div.filtros__grupo", { role: "group", "aria-label": "Visibilidade" },
      [{ v: "privado", r: "Privado" }, { v: "publico", r: "Público" }].map(function (op) {
        return el("button.filtro", {
          type: "button",
          "aria-pressed": String(visibilidade === op.v),
          texto: op.r,
          onclick: function (ev) {
            visibilidade = op.v;
            U.$$(".filtro", ev.target.parentNode).forEach(function (b) {
              b.setAttribute("aria-pressed", String(b === ev.target));
            });
          },
        });
      })
    );

    UI.modal({
      titulo: criando ? "Novo ritual" : "Editar ritual",
      largo: true,
      conteudo: el("div.pilha", {}, campos.elementos.concat([
        el("div.r-campo", {}, [
          el("span.r-rotulo", { texto: "Visibilidade" }),
          seletorVis,
          el("p.r-ajuda", { texto: "Público: outras contas encontram este ritual na biblioteca e podem copiá-lo." }),
        ]),
      ])),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: criando ? "Criar" : "Salvar", classe: "r-botao--principal",
          aoClicar: async function (fechar) {
            var dados = campos.coletar();
            if (!dados) return;

            var pronto = F.criarRitual(dados);
            /* O vínculo com o ritual oficial (o símbolo) sobrevive à edição. */
            if (atual.origemCatalogoId) pronto.origemCatalogoId = atual.origemCatalogoId;
            if (atual.simboloCatalogoId) pronto.simboloCatalogoId = atual.simboloCatalogoId;
            pronto.tipo = "ritual";
            pronto.visibilidade = visibilidade;
            if (registro && registro.id) pronto.id = registro.id;

            var r = await global.RAMAApi.salvarHomebrew(pronto);
            if (!r.ok) { UI.avisoDeFalha(r, "gravação"); return; }

            fechar();
            await carregar();
          },
        },
      ],
    });

    campos.focar();
  }

  function detalhes(r) {
    var linhas = [];

    if (r.tipo === "mochila") linhas.push(["Reduz", U.peso(r.reducaoPeso) + " de peso"]);
    else linhas.push(["Peso", String(U.peso(r.peso))]);

    if (r.tipo === "arma") {
      linhas.push(["Dano", (r.dano || "—") + (r.danoExtra ? " + " + r.danoExtra : "")]);
      linhas.push(["Crítico", r.critico ? r.critico + " / x" + r.multiplicador : "—"]);
    }

    if (r.tipo === "armadura") linhas.push(["Defesa", String(U.inteiro(r.defesa, 0))]);

    return el("dl.r-dados", {}, linhas.reduce(function (saida, par) {
      saida.push(el("dt", { texto: par[0] }));
      saida.push(el("dd", { texto: par[1] }));
      return saida;
    }, []));
  }

  /* =================================================================
     CRIAR E EDITAR
     ================================================================= */

  /* + Criar em três grupos (v6.10): Equipamentos, Criaturas e
     Habilidades e rituais. Os editores são os de sempre; Criatura abre a
     escolha de sistema pelas capas (e Vampiro, os dois modelos). Criar
     estando em Públicas leva para Minhas criações, onde o novo aparece. */
  function escolherTipo() {
    var m = UI.modal({
      titulo: "Criar na biblioteca",
      conteudo: el("div.pilha.hb-criar", {}, [
        grupo("Equipamentos", "Vão para o inventário das fichas como cópia.", [
          opcao("Item", "Nome, peso e descrição.", "item"),
          opcao("Arma", "Perícia de ataque, dano, crítico e multiplicador.", "arma"),
          opcao("Armadura", "Com um valor de defesa.", "armadura"),
          opcao("Mochila", "Reduz o peso total carregado.", "mochila"),
        ]),
        grupo("Criaturas", "Para o combate, os aliados e a consulta.", [
          opcao("Criatura", "Escolha o sistema: Ordem Paranormal, Oblívio, Vampiro, Malditos Goblins ou a ficha universal.", "criatura-sistema"),
        ]),
        grupo("Habilidades e rituais", "Textos e rituais prontos para levar às fichas.", [
          opcao("Habilidade", "Texto informativo, com cor e origem.", "habilidade"),
          opcao("Ritual", "Campos do ritual e versões, com dano e custo.", "ritual"),
        ]),
      ]),
    });

    function grupo(titulo, ajuda, opcoes) {
      return el("section.hb-criar__grupo", { "aria-label": titulo }, [
        el("h3.t-secao.hb-criar__titulo", { texto: titulo }),
        el("p.t-mini", { texto: ajuda }),
        el("div.hb-criar__opcoes", {}, opcoes),
      ]);
    }

    function opcao(rotulo, ajuda, tipo) {
      return el("button.r-botao.r-botao--bloco.hb-criar__opcao", {
        type: "button",
        onclick: function () {
          m.fechar();
          if (escopo !== "meus") { escopo = "meus"; busca = ""; tipoFiltro = ""; carregar(); }
          if (tipo === "criatura-sistema") escolherSistemaDaCriatura(); else editar(null, tipo);
        },
      }, [
        el("span.t-secao", { texto: rotulo }),
        el("span.t-mini", { texto: ajuda }),
      ]);
    }
  }

  /* v6.8: uma "Criatura" só, e o sistema escolhido pelas capas (como na
     página Criaturas). Vampiro pergunta o modelo do livro: o compacto
     dos antagonistas (p. 370) ou a ficha completa (p. 374). */
  var CRIATURA_POR_SISTEMA = {
    ordem: "Ficha de ameaça: VD, elementos, Presença Perturbadora, defesas, ações, formas e Enigma de Medo.",
    oblivio: "Ameaça: Grau, Dano, Proteção, Velocidade, Estresse e Regiões, atributos, habilidades e recompensa.",
    vampiro: "Antagonista: paradas padrão e excepcionais, ou a ficha completa com Atributos, Habilidades e Disciplinas.",
    goblins: "Inimigo: Combate, Noção, Habilidade e Vitalidade, bônus da arma, proteção e efeitos.",
    tormenta20: "Ameaça de Tormenta20: ND, Defesa, resistências, PV, ataques, habilidades e magias.",
    universal: "Mini ficha livre: status, atributos, perícias, ataques e habilidades.",
  };
  function escolherSistemaDaCriatura() {
    var Capa = global.RAMACapaSistema;
    var m = UI.modal({
      titulo: "Nova criatura · sistema",
      largo: true,
      conteudo: el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", { texto: "Cada sistema tem a ficha do próprio livro. Criaturas de Oblívio, Vampiro e Goblins ficam para consulta no Homebrew; as ameaças de Tormenta20 entram no combate pela Mesa da campanha de Tormenta20; o combate e os aliados de Ordem usam Ordem e Universal." }),
        el("div.hb-sistemas", { role: "list" }, global.RAMASistemas.lista().filter(function (s) { return CRIATURA_POR_SISTEMA[s.id]; }).map(function (s) {
          return el("button.hb-sistemas__opcao", {
            type: "button", role: "listitem", dataset: { sistema: s.id },
            onclick: function () {
              m.fechar();
              if (s.id === "vampiro") { escolherModeloVampiro(); return; }
              if (s.id === "universal") { editar(null, "criatura"); return; }
              editar(null, "criatura", { sistema: s.id });
            },
          }, [
            Capa ? Capa.elemento(s, { tamanho: "p" }) : null,
            el("span.hb-sistemas__textos", {}, [el("span.hb-sistemas__nome", { texto: s.nome }), el("span.t-mini", { texto: CRIATURA_POR_SISTEMA[s.id] })]),
          ]);
        })),
      ]),
    });
  }
  function escolherModeloVampiro() {
    var m = UI.modal({
      titulo: "Nova criatura · Vampiro",
      conteudo: el("div.pilha--curta", { class: "pilha" }, [["compacto", "Antagonista compacto", "Paradas de dados padrão e excepcionais, Vitalidade, Força de Vontade e regras especiais (p. 370–373)."],
        ["completo", "Ficha completa", "Atributos, Habilidades, Disciplinas, Humanidade e Potência do Sangue (p. 374–377)."]].map(function (x) {
        return el("button.r-botao.r-botao--bloco", {
          type: "button", estilo: { flexDirection: "column", alignItems: "flex-start", gap: "2px", textTransform: "none", padding: "var(--e3)" },
          onclick: function () { m.fechar(); editar(null, "criatura", { sistema: "vampiro", modelo: x[0] }); },
        }, [el("span.t-secao", { texto: x[1] }), el("span.t-mini", { texto: x[2] })]);
      })),
    });
  }

  function editar(registro, tipoNovo, opcoesCriatura) {
    var criando = !registro;
    var tipo = registro ? registro.tipo : tipoNovo;

    /* Criatura e habilidade têm editores próprios: os campos delas não
       se parecem em nada com peso e dano. */
    if (tipo === "criatura" || tipo === "criatura-ordem") {
      global.RAMAHomebrewCriatura.editar(criando ? null : registro, carregar,
        tipo === "criatura-ordem" ? { sistema: global.RAMACriaturas.SISTEMA_ORDEM } : opcoesCriatura);
      return;
    }
    if (tipo === "habilidade") {
      editarHabilidade(criando ? null : registro);
      return;
    }
    if (tipo === "ritual") {
      editarRitual(criando ? null : registro);
      return;
    }

    var atual = registro || F.criarItem(tipo, {});

    var nome = UI.campo({ rotulo: "Nome", valor: atual.nome, limite: 80 });
    /* A categoria acompanha o modelo para chegar junto na ficha quando
       o item for copiado — senão ela teria de ser redigitada a cada
       personagem que usasse a mesma espada. */
    var categoria = UI.campo({
      rotulo: "Categoria", valor: atual.categoria, limite: 60,
      ajuda: "Livre. Vai junto quando este modelo entrar num inventário.",
    });
    var descricao = UI.campo({ rotulo: "Descrição", tipo: "area", valor: atual.descricao, linhas: 3, limite: 2000 });

    var etiqueta = U.normalizarEtiqueta(atual.etiqueta);
    var campoEtiqueta = UI.campoEtiqueta({ valor: etiqueta, aoMudar: function (v) { etiqueta = v; } });

    var campos = [nome, campoEtiqueta, categoria];
    var extras = { categoria: categoria, etiqueta: function () { return etiqueta; } };

    if (tipo === "mochila") {
      extras.reducao = UI.campo({ rotulo: "Redução de peso", tipo: "numero", valor: atual.reducaoPeso });
      campos.push(extras.reducao);
    } else {
      extras.peso = UI.campo({ rotulo: "Peso", tipo: "numero", valor: atual.peso });
      campos.push(extras.peso);
    }

    if (tipo === "arma") {
      extras.dano = UI.campo({ rotulo: "Dano", valor: atual.dano, limite: 12, ajuda: "NdX, ex. 2d10" });
      extras.danoExtra = UI.campo({
        rotulo: "Dano extra", valor: atual.danoExtra, limite: 20,
        ajuda: "Número (4) ou dado (1d6). Nunca multiplica no crítico.",
      });
      extras.critico = UI.campo({ rotulo: "Crítico", tipo: "numero", valor: atual.critico, ajuda: "0 desliga." });
      extras.multiplicador = UI.campo({ rotulo: "Multiplicador", tipo: "numero", valor: atual.multiplicador });

      campos.push(el("div.editar-grade", {}, [extras.dano, extras.danoExtra]));
      campos.push(el("div.editar-grade", {}, [extras.critico, extras.multiplicador]));

      /* A perícia de ataque é escolhida na ficha, e não aqui: o modelo
         da biblioteca não sabe quais perícias existem em cada
         personagem. */
      campos.push(el("p.t-mini", { texto: "A perícia de ataque é escolhida na ficha, quando a arma entrar no inventário." }));
    }

    if (tipo === "armadura") {
      extras.defesa = UI.campo({ rotulo: "Defesa", tipo: "numero", valor: atual.defesa });
      campos.push(extras.defesa);
    }

    campos.push(descricao);

    UI.modal({
      titulo: (criando ? "Nova " : "Editar ") + F.rotuloDoTipo(tipo).toLowerCase(),
      conteudo: el("div.pilha", {}, campos),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: criando ? "Criar" : "Salvar",
          classe: "r-botao--principal",
          aoClicar: async function (fechar) {
            var montado = coletar(tipo, atual, nome, descricao, extras);
            if (!montado) return;

            var r = await global.RAMAApi.salvarHomebrew(montado);
            if (!r.ok) { UI.avisoDeFalha(r, "gravação na biblioteca"); return; }

            fechar();
            await carregar();
            UI.avisoOk(criando ? "Registro criado." : "Registro atualizado.");
          },
        },
      ],
    });

    nome.entrada.focus();
  }

  function coletar(tipo, base, nome, descricao, extras) {
    var dados = {
      nome: nome.entrada.value.trim(),
      categoria: extras.categoria ? extras.categoria.entrada.value.trim() : "",
      descricao: descricao.entrada.value,
      /* Espaços, quantidade e categoria de Ordem Paranormal, quando o
         modelo veio de uma ficha de Ordem. A biblioteca não os edita,
         mas também não pode perdê-los numa edição do nome. */
      ordem: base.ordem,
      etiqueta: extras.etiqueta ? extras.etiqueta() : base.etiqueta,
    };

    nome.marcarErro("");
    if (!dados.nome) { nome.marcarErro("Informe um nome."); nome.entrada.focus(); return null; }

    if (tipo === "mochila") {
      var red = V.peso(extras.reducao.entrada.value);
      extras.reducao.marcarErro(red.ok ? "" : red.mensagem);
      if (!red.ok) return null;
      dados.reducaoPeso = red.valor;
    } else {
      var p = V.peso(extras.peso.entrada.value);
      extras.peso.marcarErro(p.ok ? "" : p.mensagem);
      if (!p.ok) return null;
      dados.peso = p.valor;
    }

    if (tipo === "arma") {
      var d = V.dadoOpcional(extras.dano.entrada.value);
      extras.dano.marcarErro(d.ok ? "" : d.mensagem);
      if (!d.ok) return null;

      var c = V.critico(extras.critico.entrada.value);
      extras.critico.marcarErro(c.ok ? "" : c.mensagem);
      if (!c.ok) return null;

      var m = V.multiplicador(extras.multiplicador.entrada.value);
      extras.multiplicador.marcarErro(m.ok ? "" : m.mensagem);
      if (!m.ok) return null;

      var extra = extras.danoExtra.entrada.value.trim();
      if (extra && !/^[+-]?\d+$/.test(extra) && !D.valida(extra)) {
        extras.danoExtra.marcarErro("Use um número (4) ou uma expressão de dado (1d6).");
        return null;
      }
      extras.danoExtra.marcarErro("");

      dados.dano = d.valor;
      dados.danoExtra = extra;
      dados.critico = c.valor;
      dados.multiplicador = m.valor;
    }

    if (tipo === "armadura") {
      var def = V.inteiroEntre(extras.defesa.entrada.value, -999, 999, "A defesa");
      extras.defesa.marcarErro(def.ok ? "" : def.mensagem);
      if (!def.ok) return null;
      dados.defesa = def.valor;
    }

    var item = F.criarItem(tipo, dados);
    if (base.id) item.id = base.id;
    return item;
  }

  /* =================================================================
     DUPLICAR, EXCLUIR, EXPORTAR, IMPORTAR
     ================================================================= */

  async function duplicar(registro) {
    var copia = registro.tipo === "criatura"
      ? global.RAMACriaturas.normalizar(registro)
      : (registro.tipo === "habilidade"
          ? global.RAMAHabilidades.normalizarHabilidade(registro)
          : registro.tipo === "ritual" ? (F.normalizarRitual(registro) || F.criarRitual({ nome: registro.nome })) : F.normalizarItem(registro));

    /* Sem id: o servidor cria um registro novo sob quem pediu. É assim
       que copiar algo público de outra conta não vira edição do
       original. */
    delete copia.id;
    copia.tipo = registro.tipo;
    copia.visibilidade = "privado";
    copia.nome = registro.nome + " (cópia)";

    var r = await global.RAMAApi.salvarHomebrew(copia);
    if (!r.ok) { UI.avisoDeFalha(r, "duplicação"); return; }

    /* Copiar de Públicas: a cópia é sua e mora em Minhas criações. */
    if (escopo !== "meus") { delete contagens.meus; UI.avisoOk("Cópia criada em Minhas criações."); return; }
    await carregar();
    UI.avisoOk("Cópia criada.");
  }

  async function excluir(registro) {
    var certeza = await UI.confirmar({
      titulo: "Excluir " + registro.nome + "?",
      texto: "O modelo sai da biblioteca.",
      detalhe: "As fichas que já usam uma cópia dele não são afetadas — elas guardam a própria versão.",
      rotuloConfirmar: "Excluir",
      perigo: true,
    });
    if (!certeza) return;

    var r = await global.RAMAApi.excluirHomebrew(registro.id);
    if (!r.ok) { UI.avisoDeFalha(r, "exclusão"); return; }

    registros = registros.filter(function (x) { return x.id !== registro.id; });
    contagens[escopo] = registros.length;
    desenhar();
    UI.avisoOk(registro.nome + " foi removido da biblioteca.");
  }

  function exportar(registro) {
    var texto = JSON.stringify(V.exportar(V.tipoDeExportacao(registro), registro), null, 2);

    var area = el("textarea.r-area", { rows: 12, readonly: true, "aria-label": "Registro em JSON" });
    area.value = texto;

    UI.modal({
      titulo: "Exportar " + registro.nome,
      largo: true,
      conteudo: [
        el("p", { texto: "Copie e guarde num arquivo .json. Ele pode ser importado aqui ou em outra conta." }),
        area,
      ],
      botoes: [
        {
          rotulo: "Copiar", classe: "r-botao--principal",
          aoClicar: async function () {
            try { await navigator.clipboard.writeText(texto); UI.avisoOk("Copiado."); }
            catch (e) { area.select(); UI.avisoAtencao("Use Ctrl+C — o texto está selecionado."); }
          },
        },
        { rotulo: "Fechar", classe: "r-botao--fantasma" },
      ],
    });
  }

  function importar() {
    global.RAMAImportar.abrir({
      /* sem `tipo`: a biblioteca aceita item, criatura e habilidade, e a
         janela reconhece qual é pelo próprio arquivo */
      aoConfirmar: async function (dados) {
        var r = await global.RAMAApi.salvarHomebrew(dados);
        if (!r.ok) { UI.avisoDeFalha(r, "importação"); return false; }
        if (escopo !== "meus") { escopo = "meus"; busca = ""; tipoFiltro = ""; }
        await carregar();
        UI.avisoOk(dados.nome + " foi importado para a biblioteca.");
        return true;
      },
    });
  }
})(window);
