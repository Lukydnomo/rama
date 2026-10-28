/* =====================================================================
   R.A.M.A. — janela "Adicionar condição"
   =====================================================================
   A MESMA janela na ficha (quem joga, no próprio personagem) e no
   combate (o mestre, num participante da mesa): escolher uma condição
   do livro, um efeito de ritual ou um efeito da mesa; revisar descrição,
   modificadores e duração; confirmar. O que ela devolve é uma instância
   de js/ordem/efeitos.js — quem chama grava pelo caminho de sempre (a
   ficha, pelo salvador; o combate, pelo servidor, que confere a
   permissão de novo).

   Usar uma condição do livro como modelo nunca muda o catálogo: a
   aplicação é uma cópia, e o que for ajustado nela fica marcado.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  function EF() { return global.RAMAOrdemEfeitos; }
  function C() { return global.RAMAOrdemCatalogo || null; }
  function RT() { return global.RAMAOrdemRituais || null; }

  var ROTULOS_DE_DURACAO = {
    cena: "Até o fim da cena",
    turnos: "Por turnos",
    ateRemover: "Até ser removido",
    especial: "Duração especial (acompanhada à mão)",
  };

  var ROTULOS_DE_TIPO = { bonus: "Bônus", dados: "Dados", deslocamento: "Deslocamento" };

  /* Um modificador por extenso: "+2 em Testes de perícia". */
  function textoDoModificador(m) {
    var alvo = EF().nomeDoAlvo(m.alvo);
    if (m.tipo === "deslocamento") {
      if (m.operacao === "metade") return "Deslocamento pela metade";
      if (m.operacao === "zero") return "Deslocamento 0m";
      if (m.operacao === "fixo") return "Deslocamento " + String(m.valor).replace(".", ",") + "m";
      return U.comSinal(m.valor) + "m de deslocamento";
    }
    if (m.tipo === "dados") {
      var n = Math.abs(m.valor);
      return (m.valor > 0 ? "+" : "−") + n + (n === 1 ? " dado" : " dados") + " em " + alvo.charAt(0).toLowerCase() + alvo.slice(1);
    }
    return U.comSinal(m.valor) + " em " + alvo.charAt(0).toLowerCase() + alvo.slice(1);
  }

  function opcoesDeAlvo() {
    var lista = EF().ALVOS.map(function (a) { return { valor: a.chave, rotulo: a.nome }; });
    if (C()) {
      C().PERICIAS.forEach(function (p) { lista.push({ valor: "pericia:" + p.chave, rotulo: "Perícia: " + p.nome }); });
    }
    return lista;
  }

  function tiposDoAlvo(alvo) {
    var def = EF().ALVOS.filter(function (a) { return a.chave === alvo; })[0];
    return def ? def.tipos : ["bonus", "dados"];
  }

  /* =================================================================
     A JANELA
     ================================================================= */

  function abrir(opcoes) {
    var o = opcoes || {};
    var estado = {
      etapa: o.inicial ? "revisar" : "escolher",
      aba: "condicoes",
      busca: "",
      rascunho: o.inicial ? rascunhoDe(o.inicial) : null,
      catalogo: RT() && RT().catalogoPronto ? RT().catalogoPronto() : null,
      carregando: false,
      conflito: null,
      ocupado: false,
    };

    var conteudo = el("div.efeitos-janela");
    var janela = UI.modal({
      titulo: o.titulo || (o.inicial ? "Editar aplicação" : "Adicionar condição ou efeito"),
      conteudo: [conteudo],
      largo: true,
      classe: "r-modal--efeitos",
    });

    function desenhar() {
      if (estado.etapa === "escolher") U.trocar(conteudo, escolher());
      else if (estado.etapa === "conflito") U.trocar(conteudo, conflito());
      else U.trocar(conteudo, revisar());
    }

    /* ---------- etapa 1: escolher ---------- */

    function escolher() {
      var abas = [
        { chave: "condicoes", rotulo: "Condições do livro" },
        { chave: "rituais", rotulo: "Efeito de ritual" },
        { chave: "personalizado", rotulo: "Efeito da mesa" },
      ];
      var busca = el("input.r-entrada", {
        type: "search", placeholder: "Buscar…", value: estado.busca,
        "aria-label": "Buscar na biblioteca",
        oninput: function (ev) { estado.busca = ev.target.value; pintarLista(); },
      });
      var lista = el("div.efeitos-lista", { role: "list" });

      function pintarLista() {
        if (estado.aba === "condicoes") U.trocar(lista, listaDeCondicoes());
        else if (estado.aba === "rituais") U.trocar(lista, listaDeRituais());
        else U.trocar(lista, personalizado());
      }
      pintarLista();

      return el("div.pilha", {}, [
        o.alvoNome ? el("p.t-mini", { texto: "Alvo: " + o.alvoNome + "." }) : null,
        el("div.filtros__grupo.efeitos-abas", { role: "group", "aria-label": "De onde vem" }, abas.map(function (a) {
          return el("button.filtro", {
            type: "button", "aria-pressed": String(estado.aba === a.chave), texto: a.rotulo,
            dataset: { foco: "efeitos-aba-" + a.chave },
            onclick: function () { estado.aba = a.chave; desenhar(); focar("efeitos-aba-" + a.chave); },
          });
        })),
        estado.aba !== "personalizado" ? busca : null,
        lista,
      ]);
    }

    function casa(texto) {
      var b = U.chaveDeBusca(estado.busca || "").trim();
      return !b || U.chaveDeBusca(texto || "").indexOf(b) >= 0;
    }

    function listaDeCondicoes() {
      var itens = EF().CONDICOES.filter(function (c) { return casa(c.nome + " " + c.texto + " " + (c.categoria || "")); });
      if (!itens.length) return [el("p.t-mini", { texto: "Nenhuma condição com esse nome." })];
      return itens.map(function (c) {
        var imune = o.cond && EF().imune(o.cond, c.chave);
        var aviso = c.automatica
          ? "Automática: a ficha mostra sozinha, pelo " + (c.automatica === "pv" ? "PV" : "recurso") + "."
          : (imune ? "O personagem tem imunidade a esta condição." : "");
        var podeAplicar = !c.automatica || c.rastreador;
        return el("div.efeitos-item", { role: "listitem" }, [
          el("div.efeitos-item__topo", {}, [
            el("span.efeitos-item__nome", { texto: c.nome }),
            c.categoria ? el("span.r-etiqueta", { texto: EF().CATEGORIAS[c.categoria] }) : null,
            c.rastreador ? el("span.r-etiqueta", { texto: "contador próprio" }) : null,
            el("span.t-mini", { texto: "OPRPG p. " + c.pagina }),
          ]),
          el("p.t-mini.efeitos-item__texto", { texto: c.texto }),
          c.inclui.length ? el("p.t-mini", { texto: "Traz junto: " + c.inclui.map(function (k) { return EF().condicao(k).nome; }).join(", ") + "." }) : null,
          aviso ? el("p.t-mini.t-aviso", { texto: aviso }) : null,
          el("button.r-botao.r-botao--mini", {
            type: "button", texto: c.rastreador ? "Ativar" : "Escolher", disabled: !podeAplicar || imune,
            "aria-label": (c.rastreador ? "Ativar " : "Escolher ") + c.nome,
            onclick: function () {
              if (c.rastreador) { ativarRastreador(c); return; }
              estado.rascunho = rascunhoDeCondicao(c);
              estado.etapa = "revisar";
              desenhar();
            },
          }),
        ]);
      });
    }

    function ativarRastreador(c) {
      if (!o.aoRastreador) { UI.avisoAtencao(c.nome + " usa o contador próprio da ficha."); return; }
      concluir(function () { return o.aoRastreador(c.chave); });
    }

    function listaDeRituais() {
      var saida = [];
      var daFicha = (o.rituaisDaFicha || []).filter(function (r) { return casa(r.nome); });
      if (daFicha.length) {
        saida.push(el("p.t-rotulo", { texto: "Rituais desta ficha" }));
        daFicha.forEach(function (r) { saida.push(itemDeRitual(r, true)); });
      }
      if (!estado.catalogo && !(RT() && RT().carregar)) {
        saida.push(el("p.t-mini", { texto: "O catálogo de rituais não está disponível nesta página. Use um efeito da mesa com o nome do ritual." }));
        return saida;
      }
      if (!estado.catalogo) {
        if (RT() && RT().carregar && !estado.carregando) {
          estado.carregando = true;
          RT().carregar().then(function (cat) {
            estado.catalogo = cat;
            estado.carregando = false;
            if (estado.etapa === "escolher" && estado.aba === "rituais") desenhar();
          }, function () {
            estado.carregando = false;
            estado.falhaNoCatalogo = true;
            if (estado.etapa === "escolher" && estado.aba === "rituais") desenhar();
          });
        }
        saida.push(el("p.t-mini", { texto: estado.falhaNoCatalogo ? "O catálogo de rituais não carregou. Os rituais da ficha continuam acima; tente de novo mais tarde." : "Carregando o catálogo de rituais…" }));
        return saida;
      }
      var doCatalogo = estado.catalogo.rituais.filter(function (r) { return casa(r.nome + " " + (r.resumo || "")); });
      saida.push(el("p.t-rotulo", { texto: "Catálogo" }));
      if (!doCatalogo.length) saida.push(el("p.t-mini", { texto: "Nenhum ritual com esse nome." }));
      doCatalogo.slice(0, 60).forEach(function (r) { saida.push(itemDeRitual(r, false)); });
      if (doCatalogo.length > 60) saida.push(el("p.t-mini", { texto: "Mais " + (doCatalogo.length - 60) + " — refine a busca." }));
      return saida;
    }

    function itemDeRitual(r, daFicha) {
      var id = daFicha ? (r.origemCatalogoId || (r.ordem && r.ordem.catalogo) || "") : r.id;
      var estruturado = EF().ritualComEfeito(id);
      var duracao = r.duracao || "";
      var dur = EF().duracaoDoRitual(duracao);
      return el("div.efeitos-item", { role: "listitem" }, [
        el("div.efeitos-item__topo", {}, [
          el("span.efeitos-item__nome", { texto: r.nome }),
          estruturado ? el("span.r-etiqueta", { texto: "bônus na conta" }) : null,
          duracao ? el("span.t-mini", { texto: "Duração: " + duracao }) : null,
        ]),
        r.resumo || r.descricao ? el("p.t-mini.efeitos-item__texto", { texto: U.texto(r.resumo || r.descricao).slice(0, 240) }) : null,
        !dur ? el("p.t-mini.t-aviso", { texto: "Duração instantânea: não deixa efeito para acompanhar." }) : null,
        el("button.r-botao.r-botao--mini", {
          type: "button", texto: "Escolher", disabled: !dur, "aria-label": "Escolher o efeito de " + r.nome,
          onclick: function () {
            estado.rascunho = rascunhoDeRitual(r, id, dur);
            estado.etapa = "revisar";
            desenhar();
          },
        }),
      ]);
    }

    function personalizado() {
      return [
        el("p.t-mini", { texto: "Um efeito escrito pela mesa: um bônus de item, uma habilidade, algo que o livro não descreve. Os modificadores vêm de uma lista fechada; o texto é só texto." }),
        el("button.r-botao.r-botao--mini.r-botao--principal", {
          type: "button", texto: "Criar efeito",
          onclick: function () {
            estado.rascunho = {
              modelo: "", tipo: "efeito", nome: "", descricao: "", versao: "",
              origem: { tipo: "manual", nome: "" }, modificadores: [], restricoes: [], duracao: { tipo: "cena" },
              versoes: null, acumula: false,
            };
            estado.etapa = "revisar";
            desenhar();
          },
        }),
      ];
    }

    /* ---------- etapa 2: revisar ---------- */

    function revisar() {
      var r = estado.rascunho;
      var nome = UI.campo({ rotulo: "Nome", valor: r.nome, limite: 80 });
      var origemTipo = UI.campo({
        rotulo: "Origem", tipo: "selecao", valor: r.origem.tipo,
        opcoes: EF().ORIGENS.map(function (k) { return { valor: k, rotulo: EF().NOMES_DE_ORIGEM[k] }; }),
      });
      var origemNome = UI.campo({ rotulo: "De onde veio (nome da criatura, do ritual, do item…)", valor: r.origem.nome, limite: 80 });
      var descricao = UI.campo({ rotulo: "Descrição", tipo: "area", valor: r.descricao, limite: 1000, linhas: 3 });
      var restricoes = UI.campo({
        rotulo: "Restrições e lembretes (um por linha — só são mostrados)", tipo: "area",
        valor: (r.restricoes || []).join("\n"), limite: 1200, linhas: 2,
      });

      var versao = null;
      if (r.versoes && r.versoes.length > 1) {
        versao = UI.campo({
          rotulo: "Versão do ritual", tipo: "selecao", valor: r.versao || "Normal",
          opcoes: r.versoes.map(function (v) { return { valor: v, rotulo: v }; }),
          aoMudar: function (v) {
            lerCampos();
            r.versao = v;
            if (r.ritualId && EF().ritualComEfeito(r.ritualId)) {
              var rit = EF().ritualComEfeito(r.ritualId);
              r.modificadores = JSON.parse(JSON.stringify(rit.versoes[v] || rit.versoes.Normal || []));
            }
            desenhar();
          },
        });
      }

      var mods = el("div.efeitos-mods");
      function pintarMods() {
        U.trocar(mods, r.modificadores.length
          ? r.modificadores.map(function (m, i) { return linhaDeModificador(m, i); })
          : [el("p.t-mini", { texto: "Nenhum modificador: o efeito aparece na ficha, mas não muda conta nenhuma." })]);
      }

      function linhaDeModificador(m, i) {
        var alvo = el("select.r-selecao", { "aria-label": "Modificador " + (i + 1) + ": no quê" },
          opcoesDeAlvo().map(function (op) { return el("option", { value: op.valor, texto: op.rotulo, selected: op.valor === m.alvo }); }));
        var tipos = tiposDoAlvo(m.alvo);
        var tipo = el("select.r-selecao", { "aria-label": "Modificador " + (i + 1) + ": tipo" },
          tipos.map(function (t) { return el("option", { value: t, texto: ROTULOS_DE_TIPO[t], selected: t === m.tipo }); }));
        var operacao = m.tipo === "deslocamento"
          ? el("select.r-selecao", { "aria-label": "Modificador " + (i + 1) + ": operação" }, [
              ["soma", "Somar metros"], ["metade", "Pela metade"], ["zero", "Zero"], ["fixo", "Fixar em (m)"],
            ].map(function (x) { return el("option", { value: x[0], texto: x[1], selected: x[0] === (m.operacao || "soma") }); }))
          : null;
        var valor = el("input.r-entrada.r-entrada--numero", {
          type: "text", inputmode: "decimal", maxlength: 5, value: String(m.valor === undefined ? "" : m.valor),
          "aria-label": "Modificador " + (i + 1) + ": valor",
          hidden: m.tipo === "deslocamento" && (m.operacao === "metade" || m.operacao === "zero"),
        });
        function ler() {
          m.alvo = alvo.value;
          var validos = tiposDoAlvo(m.alvo);
          m.tipo = validos.indexOf(tipo.value) >= 0 ? tipo.value : validos[0];
          if (operacao) m.operacao = operacao.value;
          var n = Number(String(valor.value).replace(",", ".").replace("−", "-"));
          m.valor = isFinite(n) ? n : 0;
        }
        [alvo, tipo, operacao].forEach(function (s) {
          if (s) s.addEventListener("change", function () { lerCampos(); ler(); desenhar(); });
        });
        valor.addEventListener("change", ler);
        m._ler = ler;
        return el("div.efeitos-mod", {}, [
          alvo, tipo, operacao, valor,
          el("button.r-icone", {
            type: "button", "aria-label": "Tirar o modificador " + (i + 1),
            onclick: function () { lerCampos(); r.modificadores.splice(i, 1); desenhar(); },
          }, [UI.simbolo("x")]),
        ]);
      }
      pintarMods();

      var d = r.duracao;
      var tipoDur = UI.campo({
        rotulo: "Duração", tipo: "selecao", valor: d.tipo,
        opcoes: EF().TIPOS_DE_DURACAO.map(function (k) { return { valor: k, rotulo: ROTULOS_DE_DURACAO[k] }; }),
        aoMudar: function (v) { lerCampos(); r.duracao = { tipo: v, turnos: d.turnos || 1, contador: d.contador || "alvo", momento: d.momento || "inicio" }; desenhar(); },
      });
      var detalhesDur = [];
      var turnos = null, contador = null, momento = null, textoDur = null;
      if (d.tipo === "turnos") {
        turnos = UI.campo({ rotulo: "Quantos turnos", tipo: "numero", valor: String(d.turnos || 1), limite: 2 });
        var quem = [{ valor: "alvo", rotulo: "Do afetado" + (o.alvoNome ? " (" + o.alvoNome + ")" : "") }]
          .concat((o.participantes || []).map(function (p) { return { valor: "p:" + p.id, rotulo: "De " + p.nome }; }));
        contador = UI.campo({
          rotulo: "Contar os turnos de", tipo: "selecao",
          valor: d.contador === "participante" && d.participante ? "p:" + d.participante.id : "alvo", opcoes: quem,
          ajuda: o.participantes && o.participantes.length ? "" : "Fora do combate, a contagem é à mão. No combate, os turnos de outro participante podem ser escolhidos ao aplicar pelo painel do combate.",
        });
        momento = UI.campo({
          rotulo: "Contar no", tipo: "selecao", valor: d.momento || "inicio",
          opcoes: [{ valor: "inicio", rotulo: "Início de cada turno" }, { valor: "fim", rotulo: "Fim de cada turno" }],
        });
        detalhesDur = [turnos, contador, momento,
          el("p.t-mini", { texto: "A contagem começa no próximo turno contado: aplicar durante um turno não gasta aquele turno. O efeito termina quando os turnos contados chegam à quantidade." })];
      }
      if (d.tipo === "especial") {
        textoDur = UI.campo({ rotulo: "Como a duração termina", valor: d.texto || "", limite: 120, dica: "ex.: até o próximo descanso" });
        detalhesDur = [textoDur];
      }

      function lerCampos() {
        r.nome = nome.entrada.value.trim();
        r.origem = { tipo: origemTipo.entrada.value, nome: origemNome.entrada.value.trim() };
        r.descricao = descricao.entrada.value;
        r.restricoes = restricoes.entrada.value.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
        r.modificadores.forEach(function (m) { if (m._ler) m._ler(); });
        if (r.duracao.tipo === "turnos" && turnos) {
          r.duracao.turnos = Math.round(Number(turnos.entrada.value)) || 1;
          var c = contador.entrada.value;
          if (c.indexOf("p:") === 0) {
            var pid = c.slice(2);
            var part = (o.participantes || []).filter(function (p) { return String(p.id) === pid; })[0];
            r.duracao.contador = "participante";
            r.duracao.participante = { id: pid, nome: part ? part.nome : "", combate: o.combateId || "" };
          } else {
            r.duracao.contador = "alvo";
            delete r.duracao.participante;
          }
          r.duracao.momento = momento.entrada.value;
        }
        if (r.duracao.tipo === "especial" && textoDur) r.duracao.texto = textoDur.entrada.value.trim();
      }

      var botoes = el("div.faixa.efeitos-janela__botoes", {}, [
        o.inicial ? null : el("button.r-botao.r-botao--fantasma", {
          type: "button", texto: "Voltar",
          onclick: function () { lerCampos(); estado.etapa = "escolher"; desenhar(); },
        }),
        el("button.r-botao.r-botao--principal", {
          type: "button", texto: o.inicial ? "Salvar alterações" : "Aplicar",
          dataset: { foco: "efeitos-aplicar" },
          onclick: function () {
            lerCampos();
            if (!r.nome) { nome.marcarErro("Dê um nome ao efeito."); nome.entrada.focus(); return; }
            if (r.duracao.tipo === "turnos" && !(r.duracao.turnos >= 1 && r.duracao.turnos <= EF().MAX_TURNOS)) {
              turnos.marcarErro("De 1 a " + EF().MAX_TURNOS + " turnos."); return;
            }
            confirmar();
          },
        }),
      ]);

      return el("div.pilha", {}, [
        r.modelo ? el("p.t-mini", {
          texto: (r.tipo === "condicao" ? "Condição do livro" : "Efeito de ritual") + (r.pagina ? " · OPRPG p. " + r.pagina : "") +
                 ". Ajustar esta aplicação não muda a biblioteca; o ajuste fica marcado.",
        }) : null,
        nome,
        el("div.efeitos-janela__linha", {}, [origemTipo, origemNome]),
        versao,
        descricao,
        el("div.pilha--curta", { class: "pilha" }, [
          el("p.t-rotulo", { texto: "Modificadores" }),
          mods,
          el("button.r-botao.r-botao--mini", {
            type: "button", texto: "+ Modificador",
            onclick: function () { lerCampos(); r.modificadores.push({ alvo: "pericias", tipo: "bonus", valor: 1 }); desenhar(); },
          }),
          el("p.t-mini", { texto: "Bônus somam no total; dados mudam quantos d20 se rolam. Ataque corpo a corpo e à distância valem só nesses ataques; a Defesa contra um tipo de ataque aparece ao lado da Defesa." }),
        ]),
        restricoes,
        el("div.pilha--curta", { class: "pilha" }, [tipoDur].concat(detalhesDur)),
        o.avisoPrivacidade ? el("p.t-mini.t-aviso", { texto: "O que você escrever aqui vai para a ficha do personagem, e o dono dela vê. Anotações só do mestre ficam nas notas da campanha." }) : null,
        botoes,
      ]);
    }

    /* ---------- etapa 3: já está ativa ---------- */

    function confirmar() {
      var inst = instanciaDoRascunho();
      if (!inst) { UI.avisoErro("Não foi possível montar a aplicação."); return; }
      if (o.inicial) {
        concluir(function () { return o.aoConfirmar(inst, "editar"); });
        return;
      }
      if (o.cond) {
        var av = EF().avaliarAplicacao(o.cond, inst);
        if (!av.ok) { UI.avisoAtencao(av.motivo); return; }
        if (av.conflito) {
          estado.conflito = { inst: inst, info: av.conflito };
          estado.etapa = "conflito";
          desenhar();
          return;
        }
      }
      concluir(function () { return o.aoConfirmar(inst, "nova"); });
    }

    function conflito() {
      var c = estado.conflito;
      var rep = c.info.repeticao;
      return el("div.pilha", {}, [
        el("p", { texto: c.info.existente.nome + " já está valendo em " + (o.alvoNome || "o personagem") + " (" + EF().textoDaDuracao(c.info.existente) + ")." }),
        rep ? el("p.t-mini", { texto: "Pela regra (OPRPG p. " + EF().condicao(c.inst.modelo.slice(5)).pagina + "), ficar " + c.info.existente.nome.toLowerCase() + " de novo deixa " + rep.nome.toLowerCase() + "." }) : null,
        el("p.t-mini", { texto: "Aplicações repetidas da mesma coisa não somam (OPRPG p. 312-313). Escolha o que fazer:" }),
        el("div.faixa", {}, [
          rep ? el("button.r-botao.r-botao--principal", {
            type: "button", texto: "Aplicar " + rep.nome,
            onclick: function () { concluir(function () { return o.aoConfirmar(c.inst, "repetir"); }); },
          }) : null,
          el("button.r-botao", {
            type: "button", texto: "Renovar a duração",
            onclick: function () { concluir(function () { return o.aoConfirmar(c.inst, "renovar"); }); },
          }),
          el("button.r-botao", {
            type: "button", texto: "Aplicar outra (não soma)",
            onclick: function () { concluir(function () { return o.aoConfirmar(c.inst, "nova"); }); },
          }),
          el("button.r-botao.r-botao--fantasma", {
            type: "button", texto: "Voltar",
            onclick: function () { estado.etapa = "revisar"; desenhar(); },
          }),
        ]),
      ]);
    }

    /* Chama quem grava; fecha no sucesso. Um clique repetido enquanto
       grava não faz nada. */
    function concluir(fn) {
      if (estado.ocupado) return;
      estado.ocupado = true;
      conteudo.setAttribute("aria-busy", "true");
      U.$$("button", conteudo).forEach(function (b) { b.disabled = true; });
      Promise.resolve().then(fn).then(function (r) {
        estado.ocupado = false;
        conteudo.removeAttribute("aria-busy");
        if (r && r.ok === false) {
          U.$$("button", conteudo).forEach(function (b) { b.disabled = false; });
          if (r.motivo) UI.avisoAtencao(r.motivo);
          return;
        }
        janela.fechar();
      }, function (erro) {
        estado.ocupado = false;
        conteudo.removeAttribute("aria-busy");
        U.$$("button", conteudo).forEach(function (b) { b.disabled = false; });
        UI.avisoErro("Não foi aplicado: " + (erro && erro.message ? erro.message : "erro inesperado."));
      });
    }

    function instanciaDoRascunho() {
      var r = estado.rascunho;
      var base = o.inicial || null;
      var modificadores = r.modificadores.map(function (m) {
        var c = { alvo: m.alvo, tipo: m.tipo, valor: m.valor };
        if (m.tipo === "deslocamento") c.operacao = m.operacao || "soma";
        return EF().normalizarModificador(c);
      }).filter(Boolean);
      if (base) {
        var editada = JSON.parse(JSON.stringify(base));
        editada.nome = r.nome;
        editada.descricao = r.descricao;
        editada.origem = r.origem;
        editada.modificadores = modificadores;
        editada.restricoes = r.restricoes;
        editada.duracao = r.duracao;
        editada.versao = r.versao || editada.versao;
        var n = EF().normalizarInstancia(editada);
        if (n) n.personalizado = EF().personalizada(n);
        return n;
      }
      return EF().criarInstancia({
        modelo: r.modelo, nome: r.nome, descricao: r.descricao, origem: r.origem,
        modificadores: modificadores, restricoes: r.restricoes, duracao: r.duracao, versao: r.versao,
        acumula: r.acumula, aplicadoPor: o.aplicadoPor || {}, alvoNome: o.alvoNome || "",
        cena: o.cena || "", combate: o.combateId || "",
      });
    }

    function focar(chave) {
      var alvo = conteudo.querySelector('[data-foco="' + chave + '"]');
      if (alvo) alvo.focus();
    }

    desenhar();
    return janela;
  }

  /* =================================================================
     RASCUNHOS
     ================================================================= */

  function rascunhoDeCondicao(c) {
    return {
      modelo: "cond:" + c.chave, tipo: "condicao", nome: c.nome, descricao: c.texto, versao: "", pagina: c.pagina,
      origem: { tipo: "manual", nome: "" },
      modificadores: JSON.parse(JSON.stringify(c.modificadores)),
      restricoes: c.restricoes.slice(),
      duracao: { tipo: "cena" },
      versoes: null, acumula: false,
    };
  }

  function rascunhoDeRitual(r, id, dur) {
    var rit = id ? EF().ritualComEfeito(id) : null;
    var versoes = (r.versoes || []).map(function (v) { return v.nome; }).filter(Boolean);
    if (!versoes.length) versoes = ["Normal"];
    return {
      modelo: rit ? "ritual:" + id : "", ritualId: id, tipo: "efeito", nome: r.nome,
      descricao: U.texto(r.resumo || r.descricao || "").slice(0, 1000) + (rit && rit.nota ? " " + rit.nota : ""),
      versao: "Normal", pagina: rit ? rit.pagina : 0,
      origem: { tipo: "ritual", nome: r.nome },
      modificadores: rit ? JSON.parse(JSON.stringify(rit.versoes.Normal || [])) : [],
      restricoes: [],
      duracao: dur || { tipo: "cena" },
      versoes: versoes,
      acumula: !!(rit && rit.acumulaComRituais),
    };
  }

  function rascunhoDe(inst) {
    var rit = /^ritual:(.+)$/.exec(inst.modelo || "");
    var dadosRit = rit ? EF().ritualComEfeito(rit[1]) : null;
    return {
      modelo: inst.modelo, ritualId: rit ? rit[1] : "", tipo: inst.tipo, nome: inst.nome, descricao: inst.descricao,
      versao: inst.versao, pagina: 0,
      origem: JSON.parse(JSON.stringify(inst.origem)),
      modificadores: JSON.parse(JSON.stringify(inst.modificadores)),
      restricoes: inst.restricoes.slice(),
      duracao: JSON.parse(JSON.stringify(inst.duracao)),
      versoes: dadosRit ? Object.keys(dadosRit.versoes) : null,
      acumula: inst.acumula,
    };
  }

  global.RAMAJanelaDeEfeitos = {
    abrir: abrir,
    textoDoModificador: textoDoModificador,
  };
})(window);
