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

  /* editar(criatura|null, aoSalvar, { sistema, salvar, imagem, titulo,
     destinoImagem }) — a ficha de Ordem tem editor próprio (v2.28); a
     criatura sem sistema continua no editor de sempre. */
  function editar(original, aoSalvar, opcoes) {
    var o = opcoes || {};
    if ((original && C.ehOrdem(original)) || (!original && o.sistema === C.SISTEMA_ORDEM)) {
      editarOrdem(original, aoSalvar, o);
      return;
    }
    var criando = !original;
    var c = criando ? C.criar({}) : C.normalizar(original);
    if (!criando && original.id) c.id = original.id;

    var imagem = o.imagem || "";

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
    if (imagem) U.trocar(previa, [el("img", { src: imagem, alt: "" })]);
    if (!o.salvar && !criando && original.id) {
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
      titulo: o.titulo || (criando ? "Nova criatura" : "Editar criatura"),
      largo: true,
      conteudo: el("div.pilha", {}, [
        el("div.faixa", {}, [
          previa,
          el("button.r-botao.r-botao--fantasma", {
            type: "button", texto: imagem ? "Trocar imagem" : "Imagem",
            onclick: async function () {
              /* Rascunho: a imagem recortada só sobe com "Criar"/"Salvar".
                 O mesmo editor serve aos aliados da ficha (destinoImagem). */
              var img = await global.RAMAEditorImagem.escolher(o.destinoImagem || "criatura");
              if (!img.ok) return;
              imagem = img.imagem;
              U.trocar(previa, [el("img", { src: imagem, alt: "" })]);
            },
          }),
        ]),

        nome,
        el("div.editar-grade", {}, [categoria]),
        descricao,

        o.salvar ? null : el("div.r-campo", {}, [
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

            if (o.salvar) {
              if (await o.salvar(pronta, imagem) === false) return;
              fechar();
              if (aoSalvar) aoSalvar();
              return;
            }

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
  function bloco(titulo, lista, camposDe, criar, textoVazio) {
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
        : el("p.t-mini", { texto: textoVazio || "Nenhum registro. A criatura só carrega o que ela realmente tem." })
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
      UI.campo({ rotulo: "Descrição do ataque", tipo: "area", valor: a.descricao, limite: 1000,
        aoMudar: function (v) { a.descricao = U.aparar(v, 1000); } }),
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

  /* =================================================================
     ORDEM PARANORMAL (v2.28)
     -----------------------------------------------------------------
     O editor da ficha de ameaça. Os campos de teste aceitam a expressão
     publicada ("3d20+10", "-2d20" = o pior de dois d20), "—" para "não
     se aplica", vazio para "não informado" ou um texto curto ("veja
     texto"), que é mostrado e nunca rolado. O que o editor não mostra
     — partes do Enigma sem campo, por exemplo — continua na ficha: ele
     edita uma cópia do original, não monta uma ficha nova.
     ================================================================= */

  var PERIODOS = ["rodada", "turno", "cena", "combate", "interlúdio", "dia", "missão"];
  var NOMES_ACAO = { padrao: "Padrão", movimento: "Movimento", completa: "Completa", livre: "Livre", reacao: "Reação" };
  var NOMES_ELEMENTO = { sangue: "Sangue", morte: "Morte", conhecimento: "Conhecimento", energia: "Energia", medo: "Medo" };

  function descreverValor(v) {
    var x = C.classificar(v);
    if (x.tipo === "expressao") return "Rola " + x.texto + ".";
    if (x.tipo === "na") return "Não se aplica.";
    if (x.tipo === "nd") return "Não informado.";
    if (x.tipo === "numero") return "Número.";
    return "Texto: mostrado, nunca rolado.";
  }

  /* Um campo de valor de ficha: teste ("3d20+10") ou número (Defesa). */
  function campoValor(rotulo, obj, chave, tipo) {
    var atual = obj[chave];
    var campo = UI.campo({
      rotulo: rotulo, valor: atual === null || atual === undefined ? "" : String(atual), limite: 160,
      ajuda: descreverValor(atual),
      aoMudar: function (v, entrada) {
        var novo = tipo === "numero" ? C.valorNumerico(v) : C.valorDeTeste(v);
        obj[chave] = novo;
        entrada.value = novo === null ? "" : String(novo);
        campo.marcarErro("");
        U.$(".r-ajuda", campo).textContent = descreverValor(novo);
        U.$(".r-ajuda", campo).hidden = false;
      },
    });
    return campo;
  }

  function campoTexto(rotulo, obj, chave, limite, extra) {
    return UI.campo(Object.assign({
      rotulo: rotulo, valor: obj[chave] || "", limite: limite || 120,
      aoMudar: function (v) { obj[chave] = U.aparar(v, limite || 120); },
    }, extra || {}));
  }

  function campoArea(rotulo, obj, chave, limite, linhas) {
    return UI.campo({
      rotulo: rotulo, tipo: "area", valor: obj[chave] || "", linhas: linhas || 3, limite: limite || 4000,
      aoMudar: function (v) { obj[chave] = U.aparar(v, limite || 4000); },
    });
  }

  /* Uma lista de textos, um por linha (imunidades, sentidos, notas). */
  function campoLinhas(rotulo, obj, chave, ajuda) {
    return UI.campo({
      rotulo: rotulo, tipo: "area", linhas: 2, limite: 4000, valor: (obj[chave] || []).join("\n"),
      ajuda: ajuda || "Um por linha.",
      aoMudar: function (v) { obj[chave] = v.split(/\n+/).map(function (t) { return t.trim(); }).filter(Boolean); },
    });
  }

  function campoInteiro(rotulo, obj, chave, minimo, maximo) {
    return UI.campo({
      rotulo: rotulo, tipo: "numero", valor: obj[chave] === null || obj[chave] === undefined ? "" : obj[chave],
      aoMudar: function (v, entrada) {
        if (String(v).trim() === "") { obj[chave] = null; return; }
        obj[chave] = U.limitar(U.inteiro(v, minimo || 0), minimo || 0, maximo || 999999);
        entrada.value = String(obj[chave]);
      },
    });
  }

  function selecao(rotulo, valor, opcoes, aoMudar) {
    return UI.campo({ rotulo: rotulo, tipo: "selecao", valor: valor, opcoes: opcoes, aoMudar: aoMudar });
  }

  /* O dano de um ataque ou rolagem: as partes separadas por ";" —
     "2d8+8 impacto; 2d12 Morte". */
  function campoDano(rotulo, obj, chave) {
    var campo = UI.campo({
      rotulo: rotulo, valor: (obj[chave] || []).join("; "), limite: 300,
      ajuda: "Expressão e tipo; partes de tipos diferentes separadas por “;”.",
      aoMudar: function (v) {
        var partes = v.split(";").map(function (p) { return p.trim(); }).filter(Boolean);
        obj[chave] = partes;
        campo.marcarErro(partes.length && !global.RAMADados.danoValido(partes) ? "Confira as expressões de dano." : "");
      },
    });
    return campo;
  }

  function campoTeste(rotulo, obj, chave) {
    var campo = UI.campo({
      rotulo: rotulo, valor: obj[chave] || "", limite: 80,
      aoMudar: function (v, entrada) {
        var t = String(v).replace(/\s+/g, "");
        if (!t) { obj[chave] = ""; campo.marcarErro(""); return; }
        if (!global.RAMADados.testeValido(t)) { campo.marcarErro("Use um teste como 3d20+10 (ou -2d20 para o pior de dois)."); obj[chave] = t; return; }
        obj[chave] = global.RAMADados.termos(t).expressao;
        entrada.value = obj[chave];
        campo.marcarErro("");
      },
    });
    return campo;
  }

  function camposDeRolagem(r) {
    return [
      selecao("Tipo", r.tipo, [{ valor: "teste", rotulo: "Teste" }, { valor: "dano", rotulo: "Dano" }, { valor: "soma", rotulo: "Soma" }],
        function (v) {
          r.tipo = v;
          if (v === "dano" && !r.partes) { r.partes = r.expressao ? [r.expressao] : []; delete r.expressao; }
          if (v !== "dano" && r.partes) { r.expressao = (r.partes[0] || "").split(" ")[0]; delete r.partes; }
        }),
      campoTexto("Rótulo", r, "rotulo", 80),
      UI.campo({
        rotulo: "Expressão", valor: r.tipo === "dano" ? (r.partes || []).join("; ") : (r.expressao || ""), limite: 200,
        ajuda: "Teste: 3d20+10 · Dano: 4d6 Sangue; 2d6 fogo · Soma: 1d4+1",
        aoMudar: function (v) {
          if (r.tipo === "dano") r.partes = v.split(";").map(function (p) { return p.trim(); }).filter(Boolean);
          else r.expressao = v.replace(/\s+/g, "");
        },
      }),
    ];
  }

  function camposDeAtaqueOrdem(a) {
    return [
      campoTexto("Ataque", a, "nome", 80),
      campoTexto("Alcance", a, "alcance", 60, { ajuda: "corpo a corpo, curto, médio, longo…" }),
      campoInteiro("Quantidade", a, "quantidade", 1, 20),
      campoTeste("Teste", a, "teste"),
      campoDano("Dano", a, "dano"),
      UI.campo({
        rotulo: "Crítico", valor: C.textoDoCritico(a.critico), limite: 12, ajuda: "Margem/multiplicador: 19/x3, x3, 18.",
        aoMudar: function (v, entrada) { a.critico = C.normalizarCritico(v); entrada.value = C.textoDoCritico(a.critico); },
      }),
      campoTexto("Nota", a, "nota", 400),
    ];
  }

  function camposDeEfeito(ef, ehAcao, c) {
    var limite = ef.limite || { quantidade: 0, periodo: "cena" };
    var requer = ef.requer || { estado: "", minimo: 1 };
    function salvarLimite() { if (limite.quantidade > 0) ef.limite = { quantidade: limite.quantidade, periodo: limite.periodo }; else delete ef.limite; }
    function salvarRequer() { if (requer.estado) ef.requer = { estado: requer.estado, minimo: requer.minimo }; else delete ef.requer; }
    if (!ef.rolagens) ef.rolagens = [];
    if (ehAcao && !ef.ataques) ef.ataques = [];

    var campos = [
      ehAcao ? selecao("Ação", ef.tipo, Object.keys(NOMES_ACAO).map(function (k) { return { valor: k, rotulo: NOMES_ACAO[k] }; }),
        function (v) { ef.tipo = v; }) : null,
      campoTexto("Nome", ef, "nome", 120),
      campoArea("Texto", ef, "texto", 8000, 3),
      campoTexto("Resistência", ef, "resistencia", 200, { ajuda: "Ex.: Fortitude DT 30 reduz à metade." }),
      UI.campo({ rotulo: "Usos (0 = sem limite)", tipo: "numero", valor: limite.quantidade,
        aoMudar: function (v) { limite.quantidade = U.limitar(U.inteiro(v, 0), 0, 99); salvarLimite(); } }),
      selecao("Por", limite.periodo, PERIODOS.map(function (p) { return { valor: p, rotulo: p }; }),
        function (v) { limite.periodo = v; salvarLimite(); }),
      campoTexto("Marcador", ef, "marcador", 60, { ajuda: "Um liga/desliga da ocorrência (“Murcha”, “Ativo”)." }),
      campoTexto("Custo", ef, "custo", 60),
      campoTexto("Recarga", ef, "recarga", 120),
      selecao("Exige o estado", requer.estado, [{ valor: "", rotulo: "Nenhum" }].concat(c.ordem.estados.map(function (e) {
        return { valor: e.id, rotulo: e.nome };
      })), function (v) { requer.estado = v; salvarRequer(); }),
      UI.campo({ rotulo: "No mínimo", tipo: "numero", valor: requer.minimo,
        aoMudar: function (v) { requer.minimo = Math.max(0, U.inteiro(v, 1)); salvarRequer(); } }),
    ];
    if (ehAcao) {
      campos.push(bloco("Ataques", ef.ataques, camposDeAtaqueOrdem, function () {
        return { id: U.uuid(), nome: "Novo ataque", alcance: "corpo a corpo", quantidade: 1, teste: "1d20", dano: ["1d6"], critico: { margem: 20, multiplicador: 2 }, nota: "" };
      }, "Sem ataques. Ataques da mesma ação são feitos juntos (a ação agredir)."));
    }
    campos.push(bloco("Rolagens", ef.rolagens, camposDeRolagem, function () {
      return { id: U.uuid(), tipo: "dano", rotulo: "Dano", partes: ["1d6"] };
    }, "Sem rolagens próprias."));
    return campos.filter(Boolean);
  }

  function editarOrdem(original, aoSalvar, o) {
    var criando = !original;
    var c = criando ? C.criarOrdem({}) : C.normalizar(original);
    if (!criando && original.id) c.id = original.id;
    /* No Homebrew o modelo não tem estado de jogo; num aliado (o.salvar), a
       ocorrência guarda o dela e editar a ficha não o apaga. */
    if (!o.salvar) delete c.instancia;
    var od = c.ordem;
    var imagem = o.imagem || "";
    var visibilidade = c.visibilidade;

    var vida = U.porId(c.status, C.ID_VIDA);
    if (!vida) { vida = { id: C.ID_VIDA, nome: "Pontos de vida", atual: 0, maximo: 0 }; c.status.unshift(vida); }
    var pe = U.porId(c.status, C.ID_PE);
    var recursos = { pv: vida.maximo || null, pe: pe ? pe.maximo : null };

    var nome = UI.campo({ rotulo: "Nome", valor: c.nome, limite: 120 });
    var seletorVis = el("div.filtros__grupo", { role: "group", "aria-label": "Visibilidade" },
      [{ v: "privado", r: "Privada" }, { v: "publico", r: "Pública" }].map(function (op) {
        return el("button.filtro", {
          type: "button", "aria-pressed": String(visibilidade === op.v), texto: op.r,
          onclick: function (ev) {
            visibilidade = op.v;
            U.$$(".filtro", ev.target.parentNode).forEach(function (b) { b.setAttribute("aria-pressed", String(b === ev.target)); });
          },
        });
      }));

    var previa = el("span.r-avatar.r-avatar--g", { "aria-hidden": "true", texto: "?" });
    if (imagem) U.trocar(previa, [el("img", { src: imagem, alt: "" })]);
    if (!o.salvar && !criando && original.id) {
      global.RAMAApi.lerImagemCriatura(original.id).then(function (r) {
        if (r.ok && r.dados.imagem) { imagem = r.dados.imagem; U.trocar(previa, [el("img", { src: imagem, alt: "" })]); }
      });
    }

    var elementos = el("div.r-abas", { role: "group", "aria-label": "Elementos" }, Object.keys(NOMES_ELEMENTO).map(function (e) {
      return el("button.r-aba.bib-elemento.bib-elemento--" + e, {
        type: "button", "aria-pressed": String(od.elementos.indexOf(e) >= 0), texto: NOMES_ELEMENTO[e],
        onclick: function (ev) {
          var i = od.elementos.indexOf(e);
          if (i >= 0) od.elementos.splice(i, 1); else od.elementos.push(e);
          ev.currentTarget.setAttribute("aria-pressed", String(i < 0));
        },
      });
    }));

    if (!od.presenca) od.presenca = { dt: null, dano: "", imune: "" };
    var presenca = od.presenca;

    var atributos = c.atributos.map(function (a) {
      return UI.campo({
        rotulo: a.sigla, valor: a.naoAplica ? "—" : (a.valor === null ? "" : a.valor), limite: 4,
        ajuda: "Número, “—” ou vazio.",
        aoMudar: function (v, entrada) {
          var t = String(v).trim();
          if (/^[—–-]$/.test(t)) { a.naoAplica = true; a.valor = null; entrada.value = "—"; return; }
          a.naoAplica = false;
          a.valor = t === "" ? null : U.limitar(U.inteiro(t, 0), 0, 20);
          entrada.value = a.valor === null ? "" : String(a.valor);
        },
      });
    });

    /* Os campos que a referência de valores médios (AS3 p. 141) pode
       preencher: guardados para a prévia atualizar a tela. */
    var campos = {
      presenca: UI.campo({ rotulo: "Dano mental", valor: presenca.dano || "", limite: 40, ajuda: "Ex.: 4d8. Vazio = sem Presença.",
        aoMudar: function (v) { presenca.dano = v.replace(/\s+/g, ""); } }),
      defesa: campoValor("Defesa", od, "defesa", "numero"),
      fortitude: campoValor("Fortitude", od, "fortitude", "teste"),
      reflexos: campoValor("Reflexos", od, "reflexos", "teste"),
      vontade: campoValor("Vontade", od, "vontade", "teste"),
      pv: campoInteiro("PV máximo", recursos, "pv", 0, 999999),
    };

    if (!od.enigma) od.enigma = { texto: "", efeito: "", altera: null, rolagens: [] };
    var enigma = od.enigma;
    var altera = enigma.altera || {};
    var alteraDesativar = { lista: altera.desativar || [] };

    UI.modal({
      titulo: o.titulo || (criando ? "Nova criatura de Ordem" : "Editar criatura"),
      largo: true,
      conteudo: el("div.pilha", {}, [
        el("div.faixa", {}, [
          previa,
          el("button.r-botao.r-botao--fantasma", {
            type: "button", texto: imagem ? "Trocar imagem" : "Imagem",
            onclick: async function () {
              var img = await global.RAMAEditorImagem.escolher(o.destinoImagem || "criatura");
              if (!img.ok) return;
              imagem = img.imagem;
              U.trocar(previa, [el("img", { src: imagem, alt: "" })]);
            },
          }),
        ]),
        nome,
        c.origem && c.origem.copiadoDe ? el("p.t-mini", { texto: "Cópia de " + c.origem.copiadoDe + (c.origem.pagina ? " (p. " + c.origem.pagina + ")" : "") + ". O catálogo oficial não muda." }) : null,
        o.salvar ? null : el("div.r-campo", {}, [
          el("span.r-rotulo", { texto: "Visibilidade" }),
          seletorVis,
          el("p.r-ajuda", { texto: "Privada: só você lista, abre e usa. Pública: outros agentes podem usá-la como modelo — mas só você edita ou apaga." }),
        ]),

        UI.painel("Identidade", el("div.editar-grade", {}, [
          selecao("Natureza", c.natureza, [{ valor: "paranormal", rotulo: "Paranormal" }, { valor: "humana", rotulo: "Pessoa" }, { valor: "animal", rotulo: "Animal" }],
            function (v) { c.natureza = v; }),
          campoTexto("Tipo", od, "tipo", 40, { ajuda: "Criatura, Relíquia, Pessoa, Animal…" }),
          campoTexto("Tamanho", od, "tamanho", 30),
          campoInteiro("VD", od, "vd", 0, 9999),
          campoTexto("Nível (sem VD)", od, "nivel", 60),
          campoTexto("Categoria", c, "categoria", 60),
          el("div.r-campo.editar-grade__largo", {}, [el("span.r-rotulo", { texto: "Elementos" }), elementos]),
          el("div.editar-grade__largo", {}, [campoArea("Descrição", c, "descricao", 4000, 3)]),
        ])),

        valoresMedios(c, od, recursos, presenca, campos, o),

        UI.painel("Presença Perturbadora", el("div.editar-grade", {}, [
          campoInteiro("DT", presenca, "dt", 0, 99),
          campos.presenca,
          campoTexto("Imunidade", presenca, "imune", 60, { ajuda: "Ex.: NEX 50%+" }),
        ])),

        UI.painel("Sentidos e defesas", el("div.editar-grade", {}, [
          campoValor("Percepção", od, "percepcao", "teste"),
          campoValor("Iniciativa", od, "iniciativa", "teste"),
          campos.defesa,
          campos.fortitude,
          campos.reflexos,
          campos.vontade,
          el("div.editar-grade__largo", {}, [campoLinhas("Sentidos", od, "sentidos")]),
        ])),

        UI.painel("Vida e esforço", el("div.editar-grade", {}, [
          campos.pv,
          campoValor("Machucado", od, "machucado", "numero"),
          campoInteiro("PE (opcional)", recursos, "pe", 0, 9999),
        ])),

        bloco("Resistências", od.resistencias, function (r) {
          return [
            campoInteiro("Valor", r, "valor", 0, 999),
            UI.campo({ rotulo: "Tipos", valor: r.tipos.join(", "), limite: 300, ajuda: "Separados por vírgula; “dano” = qualquer dano.",
              aoMudar: function (v) { r.tipos = v.split(",").map(function (t) { return t.trim(); }).filter(Boolean); } }),
          ];
        }, function () { return { valor: 5, tipos: ["corte", "impacto", "perfuração"] }; }, "Sem resistências."),

        UI.painel("Imunidades e vulnerabilidades", el("div.editar-grade", {}, [
          campoLinhas("Imunidades", od, "imunidades"),
          campoLinhas("Vulnerabilidades", od, "vulnerabilidades"),
        ])),

        bloco("Deslocamento", od.deslocamento, function (d) {
          return [
            campoInteiro("Metros", d, "metros", 0, 999),
            campoInteiro("Quadrados", d, "quadrados", 0, 999),
            campoTexto("Modo", d, "modo", 30, { ajuda: "Vazio = em terra; escalada, natação, voo…" }),
          ];
        }, function () { return { metros: 9, quadrados: 6, modo: "" }; }, "Sem deslocamento."),

        UI.painel("Atributos", el("div.editar-grade", {}, atributos)),

        bloco("Perícias", c.pericias, function (p) {
          return [campoTexto("Perícia", p, "nome", 80), campoTeste("Teste", p, "expressao")];
        }, function () { return { id: U.uuid(), nome: "Nova perícia", expressao: "1d20" }; }, "Sem perícias treinadas."),

        bloco("Estados de fase", od.estados, function (e) {
          return [campoTexto("Nome", e, "nome", 80), campoInteiro("Máximo", e, "maximo", 1, 99), campoInteiro("Inicial", e, "inicial", 0, 99)];
        }, function () { return { id: "e" + U.uuid().replace(/-/g, "").slice(0, 8), nome: "Nova fase", maximo: 1, inicial: 0 }; },
        "Contadores de fase ou forma (flores, metamorfoses, atos). Cada ocorrência marca o seu."),

        bloco("Habilidades", c.habilidades, function (h) { return camposDeEfeito(h, false, c); }, function () {
          return { id: U.uuid(), nome: "Nova habilidade", texto: "", rolagens: [] };
        }, "Sem habilidades passivas."),

        bloco("Ações", c.acoes, function (a) { return camposDeEfeito(a, true, c); }, function () {
          return { id: U.uuid(), tipo: "padrao", nome: "Agredir", texto: "", ataques: [], rolagens: [] };
        }, "Sem ações."),

        UI.painel("Enigma de Medo", el("div.editar-grade", {}, [
          el("div.editar-grade__largo", {}, [campoArea("Enigma", enigma, "texto", 4000, 3)]),
          el("div.editar-grade__largo", {}, [campoArea("Efeito ao resolver", enigma, "efeito", 2000, 2)]),
          campoValor("Defesa resolvido", altera, "defesa", "numero"),
          campoValor("Fortitude resolvido", altera, "fortitude", "teste"),
          campoValor("Reflexos resolvido", altera, "reflexos", "teste"),
          campoValor("Vontade resolvido", altera, "vontade", "teste"),
          el("div.editar-grade__largo", {}, [campoLinhas("Habilidades e ações desativadas", alteraDesativar, "lista", "O nome exato, uma por linha.")]),
        ])),

        UI.painel("Notas", campoLinhas("Notas", od, "notas")),
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
            c.visibilidade = visibilidade;

            vida.maximo = Math.max(0, recursos.pv || 0);
            vida.atual = vida.maximo;
            c.status = c.status.filter(function (s) { return s.id !== C.ID_PE; });
            if (recursos.pe > 0) c.status.push({ id: C.ID_PE, nome: "Pontos de esforço", atual: recursos.pe, maximo: recursos.pe });

            if (!presenca.dano && presenca.dt === null && !presenca.imune) od.presenca = null;
            else od.presenca = presenca;

            ["defesa", "fortitude", "reflexos", "vontade"].forEach(function (k) {
              if (altera[k] === null || altera[k] === undefined) delete altera[k];
            });
            if (alteraDesativar.lista.length) altera.desativar = alteraDesativar.lista; else delete altera.desativar;
            enigma.altera = Object.keys(altera).length ? altera : null;
            od.enigma = enigma.texto || enigma.efeito ? enigma : null;

            var pronta = C.normalizar(c);
            if (c.id) pronta.id = c.id;
            var problemas = C.validar(pronta);
            if (problemas.length) {
              UI.avisoErro("Confira antes de salvar: " + problemas.slice(0, 3).join("; ") + (problemas.length > 3 ? " (e mais " + (problemas.length - 3) + ")" : "") + ".");
              return;
            }

            if (o.salvar) {
              if (await o.salvar(pronta, imagem) === false) return;
              fechar();
              if (aoSalvar) aoSalvar();
              return;
            }

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

  /* =================================================================
     VALORES MÉDIOS PARA CRIATURAS (Arquivos Secretos 3, p. 141)
     -----------------------------------------------------------------
     Referência, não regra: escolhe-se a linha do VD (sem arredondar —
     VD fora da tabela mostra as vizinhas), a forte/média/fraca de cada
     resistência e o que aplicar, vendo antes o que muda. Ataque, dano
     médio e DT ficam como referência: moram nas ações, e o editor não
     inventa fórmula. Ameaça da realidade: duas linhas abaixo (p. 140);
     animal treinado, não (p. 134).
     ================================================================= */

  function valoresMedios(c, od, recursos, presenca, campos, o) {
    var A3 = global.RAMAOrdemArquivo3;
    if (!A3 || !A3.VALORES_MEDIOS) return null;
    var linhas = A3.VALORES_MEDIOS;
    var vizinhas = A3.linhasDoVd(od.vd);
    var inicial = vizinhas.exata || vizinhas.abaixo || linhas[0];
    var st = {
      linha: linhas.indexOf(inicial),
      realidade: !o.animal && (c.natureza === "humana" || c.natureza === "animal"),
      /* Nenhuma escolhida: quem cria decide qual é forte, média e fraca. */
      res: { fortitude: "", reflexos: "", vontade: "" },
      aplicar: { defesa: true, pv: true, fortitude: true, reflexos: true, vontade: true, presenca: c.natureza === "paranormal" },
    };
    var corpo = el("div.pilha--curta.valores-medios", { class: "pilha" });

    function linhaUsada() {
      var l = linhas[st.linha];
      return st.realidade ? A3.linhaDuasAbaixo(l) : l;
    }

    function pintar() {
      var l = linhaUsada();
      var plano = A3.planoDeValores(l, st.res);
      var aviso = [];
      if (typeof od.vd === "number" && !vizinhas.exata) {
        aviso.push("A tabela não tem VD " + od.vd + (vizinhas.abaixo && vizinhas.acima ? ": fica entre " + vizinhas.abaixo.vd + " e " + vizinhas.acima.vd + ". Escolha a linha." : "."));
      }
      if (st.realidade) aviso.push("Ameaça da realidade: valores da linha VD " + l.vd + " (duas abaixo da escolhida, p. 140).");
      if (plano.aviso) aviso.push(plano.aviso);
      var atual = {
        defesa: od.defesa, pv: recursos.pv, fortitude: od.fortitude, reflexos: od.reflexos, vontade: od.vontade, presenca: presenca.dano,
      };
      var novo = {
        defesa: plano.defesa, pv: plano.pv, fortitude: plano.resistencias.fortitude, reflexos: plano.resistencias.reflexos,
        vontade: plano.resistencias.vontade, presenca: plano.presencaDano,
      };
      var rotulos = { defesa: "Defesa", pv: "PV máximo", fortitude: "Fortitude", reflexos: "Reflexos", vontade: "Vontade", presenca: "Presença (dano mental)" };
      U.trocar(corpo, [
        el("p.t-mini", { texto: "Ponto de partida, não regra (Arquivos Secretos 3, p. 140-141). Nada muda até você aplicar." }),
        el("div.editar-grade", {}, [
          selecao("Linha da tabela", String(st.linha), linhas.map(function (x, i) { return { valor: String(i), rotulo: "VD " + x.vd + " · " + x.patente }; }),
            function (v) { st.linha = Number(v) || 0; pintar(); }),
          el("label.r-marca", {}, [
            el("input", { type: "checkbox", checked: st.realidade, disabled: !!o.animal, onchange: function (ev) { st.realidade = ev.target.checked; pintar(); } }),
            el("span", { texto: o.animal ? "Animal treinado: sem a redução das ameaças da realidade (p. 134)" : "Ameaça da realidade (duas linhas abaixo)" }),
          ]),
        ].concat(["fortitude", "reflexos", "vontade"].map(function (k) {
          return selecao(rotulos[k], st.res[k], [{ valor: "", rotulo: "Escolher…" }, { valor: "forte", rotulo: "Forte" }, { valor: "media", rotulo: "Média" }, { valor: "fraca", rotulo: "Fraca" }],
            function (v) { st.res[k] = v; pintar(); });
        }))),
        aviso.length ? el("p.t-aviso", { texto: aviso.join(" ") }) : null,
        el("table.valores-medios__tabela", {}, [
          el("thead", {}, [el("tr", {}, [el("th", { texto: "Aplicar" }), el("th", { texto: "Campo" }), el("th", { texto: "Agora" }), el("th", { texto: "Tabela" })])]),
          el("tbody", {}, Object.keys(rotulos).map(function (k) {
            var igual = String(atual[k] === null || atual[k] === undefined ? "" : atual[k]) === String(novo[k]);
            return el("tr", { class: igual ? "" : "valores-medios__muda" }, [
              el("td", {}, [el("input", { type: "checkbox", "aria-label": "Aplicar " + rotulos[k], checked: !!st.aplicar[k], onchange: function (ev) { st.aplicar[k] = ev.target.checked; } })]),
              el("td", { texto: rotulos[k] }),
              el("td", { texto: atual[k] === null || atual[k] === undefined || atual[k] === "" ? "—" : String(atual[k]) }),
              el("td", { texto: novo[k] === undefined || novo[k] === "" ? "escolha forte/média/fraca" : String(novo[k]) }),
            ]);
          })),
        ]),
        el("p.t-mini", { texto: "Referência (não aplicada): ataque médio " + plano.referencia.ataque + ", dano médio por rodada " + plano.referencia.dano +
          " (ex.: 26 ≈ 4d8+10), DT de efeitos " + plano.referencia.dt + ". Use-os ao escrever ações e habilidades." }),
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Aplicar os marcados", onclick: function () {
          var mudou = [];
          if (st.aplicar.defesa) { od.defesa = novo.defesa; campos.defesa.entrada.value = String(novo.defesa); mudou.push("Defesa"); }
          if (st.aplicar.pv) { recursos.pv = novo.pv; campos.pv.entrada.value = String(novo.pv); mudou.push("PV"); }
          ["fortitude", "reflexos", "vontade"].forEach(function (k) {
            if (st.aplicar[k] && novo[k]) { od[k] = novo[k]; campos[k].entrada.value = novo[k]; mudou.push(rotulos[k]); }
          });
          if (st.aplicar.presenca) { presenca.dano = novo.presenca; campos.presenca.entrada.value = novo.presenca; mudou.push("Presença"); }
          UI.avisoOk(mudou.length ? "Aplicado: " + mudou.join(", ") + ". Salve a criatura para gravar." : "Nada marcado para aplicar.");
          pintar();
        } }),
      ]);
    }
    pintar();
    return UI.recolhivel({ titulo: "Valores médios para criaturas", extra: "Arquivos Secretos 3, p. 141", conteudo: corpo });
  }

  /* O resumo de leitura de uma ficha de Ordem, para cartões. */
  function detalhesOrdem(c) {
    var od = c.ordem;
    var vida = U.porId(c.status, C.ID_VIDA);
    var linha = [];
    if (typeof od.vd === "number") linha.push("VD " + od.vd);
    if (od.nivel) linha.push(od.nivel);
    linha.push(od.tipo);
    if (od.tamanho) linha.push(od.tamanho);
    var partes = [
      ["Ficha", linha.join(" · ")],
      ["Elementos", od.elementos.length ? od.elementos.map(function (e) { return NOMES_ELEMENTO[e]; }).join(", ") : "—"],
    ];
    /* Perfil "como aliado" (AS1/AS2): sem PV nem Defesa para mostrar. */
    if (od.aliada) partes.push(["Aliado", "Benefícios para quem acompanha; sem PV nem PE (OPRPG p. 170)"]);
    else partes.push(["PV / Defesa", (vida ? vida.maximo : "—") + " / " + C.classificar(od.defesa).texto]);
    if (od.formas && od.formas.length) partes.push(["Formas", od.formas.map(function (f) { return f.nome + " (" + f.pv + " PV)"; }).join(" · ")]);
    if (c.acoes.length) partes.push(["Ações", c.acoes.map(function (a) { return a.nome; }).join(" · ")]);
    if (c.habilidades.length) partes.push(["Habilidades", c.habilidades.map(function (h) { return h.nome; }).join(" · ")]);
    if (c.origem && (c.origem.copiadoDe || c.origem.catalogoId)) partes.push(["Origem", "Catálogo · " + (c.origem.copiadoDe || c.origem.catalogoId)]);
    return el("dl.r-dados", {}, partes.reduce(function (saida, par) {
      saida.push(el("dt", { texto: par[0] }));
      saida.push(el("dd", { texto: par[1] }));
      return saida;
    }, []));
  }

  /* Cartão de leitura, para a lista da biblioteca. */
  function detalhes(registro) {
    var c = C.normalizar(registro);
    if (C.ehOrdem(c)) return detalhesOrdem(c);
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
