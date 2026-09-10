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
  ];

  /* "Minhas" e "Públicas" são bibliotecas diferentes: a segunda é o que
     outras contas publicaram, e nela você usa como modelo mas não
     edita. Misturar as duas numa lista só faria o botão de excluir
     aparecer em coisa que não é sua. */
  var escopo = "meus";

  global.RAMAApp.iniciar("homebrew", async function () {
    painel = U.$("#painel-homebrew");
    await carregar();
  });

  async function carregar() {
    U.trocar(painel, [cabecalho(), UI.carregando("Consultando biblioteca")]);

    var r = await global.RAMAApi.listarHomebrew({ escopo: escopo });
    if (!r.ok) { U.trocar(painel, [cabecalho(), UI.erroDeTela(r, carregar)]); return; }

    registros = r.dados || [];
    desenhar();
  }

  function cabecalho() {
    return global.RAMAApp.titulo({
      titulo: "Homebrew",
      trilha: ["Biblioteca // " + registros.length + " registro(s)"],
      acoes: [
        el("button.r-botao", {
          type: "button", texto: "Importar", onclick: importar,
        }),
        el("button.r-botao.r-botao--principal", {
          type: "button", texto: "+ Criar", onclick: function () { escolherTipo(); },
        }),
      ],
    });
  }

  function desenhar() {
    var visiveis = filtrar();

    U.trocar(painel, [
      cabecalho(),

      registros.length ? el("div.filtros", {}, [
        el("div.r-busca", {}, [
          el("span.r-busca__marca", {}, [UI.simbolo("busca")]),
          el("input.r-entrada", {
            type: "search", value: busca,
            placeholder: "Buscar na biblioteca",
            "aria-label": "Buscar na biblioteca",
            oninput: function (ev) { busca = ev.target.value; desenhar(); },
          }),
        ]),
        el("div.filtros__grupo", { role: "group", "aria-label": "Biblioteca" },
          [{ v: "meus", r: "Minhas" }, { v: "publicos", r: "Públicas" }].map(function (op) {
            return el("button.filtro", {
              type: "button",
              "aria-pressed": String(escopo === op.v),
              texto: op.r,
              onclick: function () { escopo = op.v; carregar(); },
            });
          })
        ),
        el("div.filtros__grupo", { role: "group", "aria-label": "Filtrar por tipo" },
          TIPOS.map(function (t) {
            return el("button.filtro", {
              type: "button",
              "aria-pressed": String(tipoFiltro === t.chave),
              texto: t.rotulo + (t.chave ? " (" + contar(t.chave) + ")" : ""),
              onclick: function () { tipoFiltro = t.chave; desenhar(); },
            });
          })
        ),
      ]) : null,

      visiveis.length
        ? el("div.itens", {}, visiveis.map(cartao))
        : (registros.length ? nadaEncontrado() : bibliotecaVazia()),
    ]);
  }

  function contar(tipo) {
    return registros.filter(function (r) { return r.tipo === tipo; }).length;
  }

  function filtrar() {
    var chave = U.chaveDeBusca(busca);
    return registros.filter(function (r) {
      if (tipoFiltro && r.tipo !== tipoFiltro) return false;
      if (!chave) return true;
      return U.chaveDeBusca(r.nome + " " + (r.descricao || "") + " " + F.rotuloDoTipo(r.tipo)).indexOf(chave) >= 0;
    });
  }

  function bibliotecaVazia() {
    if (escopo === "publicos") {
      return UI.vazio({
        titulo: "Nada publicado ainda",
        texto: "Quando alguém marcar uma criatura, item ou habilidade como pública, ela aparece aqui.",
      });
    }
    return UI.vazio({
      titulo: "Biblioteca vazia",
      texto: "Crie um item aqui, ou marque “guardar na biblioteca” ao criar algo no inventário de uma ficha.",
      acao: { rotulo: "+ Criar registro", aoClicar: function () { escolherTipo(); } },
    });
  }

  function nadaEncontrado() {
    return UI.vazio({
      titulo: "Nada encontrado",
      texto: "Nenhum registro corresponde à busca ou ao filtro.",
      acao: {
        rotulo: "Limpar filtros",
        aoClicar: function () { busca = ""; tipoFiltro = ""; desenhar(); },
      },
    });
  }

  /* =================================================================
     CARTÃO
     ================================================================= */

  function cartao(registro) {
    /* Público de outra conta pode ser usado como modelo, nunca editado
       nem apagado: o menu simplesmente não oferece isso — e o servidor
       recusaria de qualquer forma. */
    var meu = registro.meu !== false;

    var opcoes = meu
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
        ];

    var etiquetas = [
      el("span.r-etiqueta", { texto: rotuloDoTipo(registro.tipo) }),
      registro.visibilidade === "publico"
        ? el("span.r-etiqueta", { texto: "Pública" })
        : null,
      !meu ? el("span.r-etiqueta.r-etiqueta--para", { texto: "De outra conta" }) : null,
    ];

    return el("article.item", { class: registro.tipo === "arma" ? "item--arma" : "" }, [
      el("div.item__topo", {}, [
        el("div", {}, [
          el("p.item__nome", { texto: registro.nome }),
          el("div.faixa", { estilo: { gap: "var(--e1)" } }, etiquetas),
        ]),
        UI.menu(opcoes, { rotulo: "Opções de " + registro.nome, icone: "tresPontos" }),
      ]),

      registro.tipo === "criatura"
        ? global.RAMAHomebrewCriatura.detalhes(registro)
        : detalhes(registro),

      registro.descricao ? el("p.item__descricao", { texto: registro.descricao }) : null,

      el("p.t-mini", { texto: "Registro // " + U.codigoCurto(registro.id) + " · " + U.dataCurta(registro.atualizadoEm) }),
    ]);
  }

  function rotuloDoTipo(tipo) {
    if (tipo === "criatura") return "Criatura";
    if (tipo === "habilidade") return "Habilidade";
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
        nome, origem, texto,
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
              texto: texto.entrada.value, cor: cor, negrito: negrito,
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

  function escolherTipo() {
    var m = UI.modal({
      titulo: "Criar na biblioteca",
      conteudo: el("div.pilha--curta", { class: "pilha" }, [
        opcao("Item", "Nome, peso e descrição.", "item"),
        opcao("Arma", "Perícia de ataque, dano, crítico e multiplicador.", "arma"),
        opcao("Armadura", "Com um valor de defesa.", "armadura"),
        opcao("Mochila", "Reduz o peso total carregado.", "mochila"),
        el("hr.r-linha"),
        opcao("Criatura", "Mini ficha: status, atributos, perícias, ataques e habilidades.", "criatura"),
        opcao("Habilidade", "Texto informativo, com cor e origem.", "habilidade"),
      ]),
    });

    function opcao(rotulo, ajuda, tipo) {
      return el("button.r-botao.r-botao--bloco", {
        type: "button",
        estilo: { flexDirection: "column", alignItems: "flex-start", gap: "2px", textTransform: "none", padding: "var(--e3)" },
        onclick: function () { m.fechar(); editar(null, tipo); },
      }, [
        el("span.t-secao", { texto: rotulo }),
        el("span.t-mini", { texto: ajuda }),
      ]);
    }
  }

  function editar(registro, tipoNovo) {
    var criando = !registro;
    var tipo = registro ? registro.tipo : tipoNovo;

    /* Criatura e habilidade têm editores próprios: os campos delas não
       se parecem em nada com peso e dano. */
    if (tipo === "criatura") {
      global.RAMAHomebrewCriatura.editar(criando ? null : registro, carregar);
      return;
    }
    if (tipo === "habilidade") {
      editarHabilidade(criando ? null : registro);
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

    var campos = [nome, categoria];
    var extras = { categoria: categoria };

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
          : F.normalizarItem(registro));

    /* Sem id: o servidor cria um registro novo sob quem pediu. É assim
       que copiar algo público de outra conta não vira edição do
       original. */
    delete copia.id;
    copia.tipo = registro.tipo;
    copia.visibilidade = "privado";
    copia.nome = registro.nome + " (cópia)";

    var r = await global.RAMAApi.salvarHomebrew(copia);
    if (!r.ok) { UI.avisoDeFalha(r, "duplicação"); return; }

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
    desenhar();
    UI.avisoOk(registro.nome + " foi removido da biblioteca.");
  }

  function exportar(registro) {
    var texto = JSON.stringify(V.exportar("homebrew-item", registro), null, 2);

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
      tipo: "homebrew-item",
      aoConfirmar: async function (dados) {
        var r = await global.RAMAApi.salvarHomebrew(dados);
        if (!r.ok) { UI.avisoDeFalha(r, "importação"); return false; }
        await carregar();
        UI.avisoOk(dados.nome + " foi importado para a biblioteca.");
        return true;
      },
    });
  }
})(window);
