/* =====================================================================
   R.A.M.A. — Homebrew · criaturas
   ---------------------------------------------------------------------
   O editor da mini ficha de uma criatura.

   Ela reusa os conceitos que já existem — atributo com valor e dado
   separados, perícia como rolagem dependente, ataque com dano e
   crítico, habilidade igual à da ficha — mas NÃO herda a ficha inteira:
   uma criatura com três perícias tem três perícias.

   Nada aqui calcula estatística. Não existe vida por tipo, defesa por
   fórmula nem dificuldade automática: o que a mesa não definiu, o
   sistema não inventa.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var C = global.RAMACriaturas;
  var H = global.RAMAHabilidades;
  var V = global.RAMAValidacao;
  var el = U.el;

  /* editar(criatura|null, aoSalvar) */
  function editar(original, aoSalvar) {
    var criando = !original;
    var c = criando ? C.criar({}) : C.normalizar(original);
    if (!criando && original.id) c.id = original.id;

    var imagem = "";

    var nome = UI.campo({ rotulo: "Nome", valor: c.nome, limite: 120 });
    var categoria = UI.campo({ rotulo: "Categoria", valor: c.categoria || "", limite: 60 });
    var descricao = UI.campo({
      rotulo: "Descrição", tipo: "area", valor: c.descricao, linhas: 3, limite: 4000,
    });

    var visibilidade = c.visibilidade;
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

    var previa = el("span.r-avatar.r-avatar--g", { "aria-hidden": "true", texto: "?" });
    if (!criando && original.id) {
      global.RAMAApi.lerImagemCriatura(original.id).then(function (r) {
        if (r.ok && r.dados.imagem) {
          imagem = r.dados.imagem;
          U.trocar(previa, [el("img", { src: imagem, alt: "" })]);
        }
      });
    }

    /* As quatro listas são desenhadas por uma função só: elas diferem
       nos campos, não na mecânica de acrescentar, editar e remover. */
    var listas = {
      status: bloco("Status", c.status, camposDeStatus, function () {
        return { id: U.uuid(), nome: "Novo status", atual: 0, maximo: 0 };
      }),
      atributos: bloco("Atributos", c.atributos, camposDeAtributo, function () {
        return { id: U.uuid(), nome: "Novo atributo", sigla: "NOV", valor: 0, dado: "1d20" };
      }),
      pericias: bloco("Perícias", c.pericias, function (p) { return camposDePericia(p, c); }, function () {
        if (!c.atributos.length) { UI.avisoErro("Crie um atributo antes: a perícia rola pelo dado dele."); return null; }
        return { id: U.uuid(), nome: "Nova perícia", atributoId: c.atributos[0].id, bonus: 0, bonusTemporario: 0, dadosExtras: [] };
      }),
      ataques: bloco("Ataques", c.ataques, function (a) { return camposDeAtaque(a, c); }, function () {
        return { id: U.uuid(), nome: "Novo ataque", periciaId: null, dado: "1d20", dano: "", danoExtra: "", critico: 0, multiplicador: 2, descricao: "" };
      }),
      habilidades: bloco("Habilidades", c.habilidades, camposDeHabilidade, function () {
        return H.criarHabilidade({ nome: "Nova habilidade" });
      }),
    };

    UI.modal({
      titulo: criando ? "Nova criatura" : "Editar criatura",
      largo: true,
      conteudo: el("div.pilha", {}, [
        el("div.faixa", {}, [
          previa,
          el("button.r-botao.r-botao--fantasma", {
            type: "button", texto: imagem ? "Trocar imagem" : "Imagem",
            onclick: async function () {
              var img = await global.RAMAImagem.escolher();
              if (!img.ok) {
                if (img.erro !== "cancelado") UI.avisoErro(img.mensagem || "Não foi possível usar esta imagem.");
                return;
              }
              imagem = img.imagem;
              U.trocar(previa, [el("img", { src: imagem, alt: "" })]);
            },
          }),
        ]),

        nome,
        el("div.editar-grade", {}, [categoria]),
        descricao,

        el("div.r-campo", {}, [
          el("span.r-rotulo", { texto: "Visibilidade" }),
          seletorVis,
          el("p.r-ajuda", {
            texto: "Privada: só você lista, abre e usa. Pública: outros agentes podem usá-la como modelo — mas só você edita ou apaga.",
          }),
        ]),

        listas.status,
        listas.atributos,
        listas.pericias,
        listas.ataques,
        listas.habilidades,
      ]),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: criando ? "Criar" : "Salvar",
          classe: "r-botao--principal",
          aoClicar: async function (fechar) {
            var valor = nome.entrada.value.trim();
            if (!valor) { nome.marcarErro("Informe um nome."); nome.entrada.focus(); return; }

            c.nome = valor;
            c.categoria = categoria.entrada.value.trim();
            c.descricao = descricao.entrada.value;
            c.visibilidade = visibilidade;

            var pronta = C.normalizar(c);
            if (c.id) pronta.id = c.id;

            var r = await global.RAMAApi.salvarHomebrew(pronta);
            if (!r.ok) { UI.avisoDeFalha(r, "gravação da criatura"); return; }

            var id = (r.dados && r.dados.id) || c.id;

            if (imagem && id) {
              var ri = await global.RAMAApi.salvarImagemCriatura(id, imagem);
              if (!ri.ok) UI.avisoAtencao("A criatura foi salva, mas a imagem não subiu.");
            }

            fechar();
            if (aoSalvar) aoSalvar();
          },
        },
      ],
    });

    nome.entrada.focus();
  }

  /* Uma lista editável genérica: título, itens, botão de acrescentar e
     um X por linha. Escrever isso cinco vezes seria cinco chances de
     divergir. */
  function bloco(titulo, lista, camposDe, criar) {
    var corpo = el("div.pilha--curta", { class: "pilha" });

    function pintar() {
      U.trocar(corpo, lista.length
        ? lista.map(function (item) {
            return el("div.linha-editavel", { estilo: { gridTemplateColumns: "1fr auto" } }, [
              el("div.editar-grade", {}, camposDe(item)),
              el("button.r-icone", {
                type: "button", "aria-label": "Remover",
                onclick: function () {
                  var i = lista.indexOf(item);
                  if (i >= 0) lista.splice(i, 1);
                  pintar();
                },
              }, [UI.simbolo("x")]),
            ]);
          })
        : el("p.t-mini", { texto: "Nenhum registro. A criatura só carrega o que ela realmente tem." })
      );
    }

    pintar();

    return UI.painel(titulo, corpo, {
      acoes: [
        el("button.r-botao.r-botao--mini", {
          type: "button", texto: "+",
          "aria-label": "Acrescentar em " + titulo,
          onclick: function () {
            var novo = criar();
            if (!novo) return;
            lista.push(novo);
            pintar();
          },
        }),
      ],
    });
  }

  /* =================================================================
     CAMPOS DE CADA TIPO
     ================================================================= */

  function camposDeStatus(s) {
    return [
      UI.campo({ rotulo: "Nome", valor: s.nome, limite: 40,
        aoMudar: function (v) { s.nome = U.aparar(v, 40) || s.nome; } }),
      UI.campo({ rotulo: "Atual", tipo: "numero", valor: s.atual,
        aoMudar: function (v) { s.atual = U.inteiro(v, s.atual); } }),
      UI.campo({ rotulo: "Máximo", tipo: "numero", valor: s.maximo,
        aoMudar: function (v) { s.maximo = Math.max(0, U.inteiro(v, s.maximo)); } }),
    ];
  }

  function camposDeAtributo(a) {
    return [
      UI.campo({ rotulo: "Nome", valor: a.nome, limite: 40,
        aoMudar: function (v) { a.nome = U.aparar(v, 40) || a.nome; } }),
      UI.campo({ rotulo: "Sigla", valor: a.sigla, limite: 6,
        aoMudar: function (v) { a.sigla = (U.aparar(v, 6) || a.sigla).toUpperCase(); } }),
      UI.campo({ rotulo: "Valor", tipo: "numero", valor: a.valor,
        aoMudar: function (v) { a.valor = U.inteiro(v, a.valor); } }),
      /* Valor e dado continuam sendo informações diferentes, como na
         ficha: um atributo 2 pode rolar 3d20. */
      UI.campo({ rotulo: "Dado", valor: a.dado, limite: 12,
        aoMudar: function (v, entrada) {
          var r = V.dado(v);
          if (!r.ok) { entrada.value = a.dado; UI.avisoErro(r.mensagem); return; }
          a.dado = r.valor; entrada.value = r.valor;
        } }),
    ];
  }

  function camposDePericia(p, c) {
    return [
      UI.campo({ rotulo: "Perícia", valor: p.nome, limite: 60,
        aoMudar: function (v) { p.nome = U.aparar(v, 60) || p.nome; } }),
      UI.campo({
        rotulo: "Atributo", tipo: "selecao", valor: p.atributoId,
        opcoes: c.atributos.map(function (a) { return { valor: a.id, rotulo: a.nome + " (" + a.sigla + ")" }; }),
        aoMudar: function (v) { p.atributoId = v; },
      }),
      UI.campo({ rotulo: "Bônus", tipo: "numero", valor: p.bonus,
        aoMudar: function (v) { p.bonus = U.inteiro(v, p.bonus); } }),
    ];
  }

  function camposDeAtaque(a, c) {
    return [
      UI.campo({ rotulo: "Nome", valor: a.nome, limite: 80,
        aoMudar: function (v) { a.nome = U.aparar(v, 80) || a.nome; } }),
      UI.campo({
        rotulo: "Perícia", tipo: "selecao", valor: a.periciaId || "",
        opcoes: [{ valor: "", rotulo: "Dado próprio" }].concat(
          c.pericias.map(function (p) { return { valor: p.id, rotulo: p.nome }; })
        ),
        aoMudar: function (v) { a.periciaId = v || null; },
      }),
      UI.campo({ rotulo: "Dado de ataque", valor: a.dado, limite: 12,
        ajuda: "Usado quando não há perícia.",
        aoMudar: function (v, entrada) {
          var r = V.dadoOpcional(v);
          if (!r.ok) { entrada.value = a.dado; UI.avisoErro(r.mensagem); return; }
          a.dado = r.valor; entrada.value = r.valor;
        } }),
      UI.campo({ rotulo: "Dano", valor: a.dano, limite: 12,
        aoMudar: function (v, entrada) {
          var r = V.dadoOpcional(v);
          if (!r.ok) { entrada.value = a.dano; UI.avisoErro(r.mensagem); return; }
          a.dano = r.valor; entrada.value = r.valor;
        } }),
      UI.campo({ rotulo: "Dano extra", valor: a.danoExtra, limite: 20,
        aoMudar: function (v) { a.danoExtra = U.aparar(v, 20); } }),
      UI.campo({ rotulo: "Crítico", tipo: "numero", valor: a.critico,
        aoMudar: function (v) { a.critico = Math.max(0, U.inteiro(v, a.critico)); } }),
      UI.campo({ rotulo: "Multiplicador", tipo: "numero", valor: a.multiplicador,
        aoMudar: function (v) { a.multiplicador = Math.max(1, U.inteiro(v, a.multiplicador)); } }),
    ];
  }

  function camposDeHabilidade(h) {
    return [
      UI.campo({ rotulo: "Nome", valor: h.nome, limite: 120,
        aoMudar: function (v) { h.nome = U.aparar(v, 120) || h.nome; } }),
      UI.campo({ rotulo: "Texto", tipo: "area", valor: h.texto, linhas: 3, limite: 8000,
        aoMudar: function (v) { h.texto = U.aparar(v, 8000); } }),
    ];
  }

  /* Cartão de leitura, para a lista da biblioteca. */
  function detalhes(registro) {
    var c = C.normalizar(registro);
    var partes = [];

    if (c.status.length) {
      partes.push(["Status", c.status.map(function (s) { return s.nome + " " + s.atual + "/" + s.maximo; }).join(" · ")]);
    }
    if (c.atributos.length) {
      partes.push(["Atributos", c.atributos.map(function (a) { return a.sigla + " " + a.valor + " (" + a.dado + ")"; }).join(" · ")]);
    }
    if (c.pericias.length) {
      partes.push(["Perícias", c.pericias.map(function (p) { return p.nome + " " + U.comSinal(p.bonus); }).join(" · ")]);
    }
    if (c.ataques.length) {
      partes.push(["Ataques", c.ataques.map(function (a) { return a.nome + " " + (a.dano || "—"); }).join(" · ")]);
    }
    if (c.habilidades.length) {
      partes.push(["Habilidades", c.habilidades.map(function (h) { return h.nome; }).join(" · ")]);
    }

    return el("dl.r-dados", {}, partes.reduce(function (saida, par) {
      saida.push(el("dt", { texto: par[0] }));
      saida.push(el("dd", { texto: par[1] }));
      return saida;
    }, []));
  }

  global.RAMAHomebrewCriatura = { editar: editar, detalhes: detalhes };
})(window);
