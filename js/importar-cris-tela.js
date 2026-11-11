/* =====================================================================
   R.A.M.A. — Importar do CRIS: o assistente (v7.2)
   ---------------------------------------------------------------------
   1. Carregar a ficha (link público → servidor → conversão).
   2. Revisar por seção, como na ficha de Ordem: cada entrada mostra o que
      veio do CRIS → como fica no R.A.M.A., com Confirmar e Alterar. Nada
      começa conferido, nem o que o R.A.M.A. reconheceu sozinho.
   3. Associar, editar ou criar sem sair daqui: Catálogo, Homebrew (minhas
      criações e públicos), personalizado a partir do CRIS, Anotações ou
      Não importar — sempre escolhas explícitas.
   4. Conferir e criar: Criar ficha e Baixar JSON só quando todas as
      entradas foram conferidas ou receberam destino.

   Cada escolha refaz a conversão inteira (js/importar-cris.js). Uma
   entrada conferida guarda a ASSINATURA do resultado: se a escolha de
   outra entrada mudar o resultado dela, a confirmação cai e a tela diz
   exatamente o que voltou para a revisão. O resto fica como estava.

   Nada é gravado antes de "Criar ficha". Cancelar descarta o rascunho.
   Gravar na Homebrew só acontece para o personalizado em que a pessoa
   marcou "Também salvar no Homebrew", e só ao criar a ficha. A criação
   leva um `operacaoId` fixo por leitura: repetir depois de uma falha não
   duplica a ficha. A foto vem depois e nunca desfaz a criação.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  var PREFIXO_FOTO = "https://firebasestorage.googleapis.com/v0/b/cris-ordem-paranormal.appspot.com/o/";
  var MAX_FOTO = 15 * 1024 * 1024;
  var TIPOS_ITEM_HB = ["item", "arma", "armadura", "mochila"];

  function X() { return global.RAMAImportarCris; }

  function dependencias(catalogos, homebrew) {
    return {
      F: global.RAMAFicha, R: global.RAMAOrdemRegras, C: global.RAMAOrdemCatalogo, P: global.RAMAOrdemPoderes,
      E: global.RAMAOrdemProgressao, H: global.RAMAHabilidades, ITM: global.RAMAOrdemItens, RS: global.RAMAOrdemRituais,
      U: U, V: global.RAMAValidacao, catalogoItens: catalogos.itens, catalogoRituais: catalogos.rituais,
      homebrew: homebrew || null,
    };
  }

  function nomeDoArquivo(nome) {
    var base = String(nome || "ficha").normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "ficha";
    return base + ".rama.json";
  }

  function baixar(texto, nome) {
    try {
      var blob = new Blob([texto], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = nome;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      return true;
    } catch (e) {
      return false;
    }
  }

  function idSeguro(chave) { return "cris-" + String(chave).replace(/[^A-Za-z0-9_-]/g, "_"); }
  function valor(v) { return v === null || v === undefined || v === "" ? "—" : String(v); }
  function plural(n, um, varios) { return n + " " + (n === 1 ? um : varios); }

  var ESTADOS = {
    conferida: { rotulo: "Conferida", classe: "cris-estado--conferida" },
    voltou: { rotulo: "Voltou para revisão", classe: "cris-estado--voltou" },
    sugerido: { rotulo: "Sugestão", classe: "cris-estado--sugerido" },
    escolhido: { rotulo: "Destino escolhido", classe: "cris-estado--sugerido" },
    sem_destino: { rotulo: "Precisa de destino", classe: "cris-estado--pendente" },
    conflito: { rotulo: "Conflito", classe: "cris-estado--conflito" },
  };
  /* Entradas que escolhem destino (as outras só têm decisões de regra). */
  var COM_DESTINO = { item: 1, ritual: 1, poder: 1, pericia: 1, mod: 1, ataque: 1, texto: 1 };

  /* abrir({ aoCriar(id, nome) }) */
  function abrir(opcoes) {
    var o = opcoes || {};
    var fechada = false;
    var sequencia = 0;
    var etapa = "carregar";        // carregar · revisar · conferir
    var secao = 0;
    var retrato = null;
    var linkDoRetrato = "";
    var decisoes = { destinos: {}, vinculos: {} };
    var resultado = null;
    var confirmados = {};          // chave → assinatura conferida
    var sinalizados = {};          // chave → { antes, depois } (voltou para revisão)
    var avisoRecalculo = [];       // o que voltou no último recálculo
    var editando = "";             // entrada com o painel de destino aberto
    var painel = null;             // estado do painel { busca, selecionado, modo }
    var detalhesAbertos = {};
    var confirmandoSecao = false;
    var mostrarTudo = false;
    var catalogos = null;
    var homebrew = null;
    var operacaoId = null;
    var criando = false;
    var criada = null;
    var querFoto = true;
    var homebrewSalvos = {};       // chave → id do registro gravado (repetir não duplica)
    var focoDepois = "";

    var passos = el("ol.cris-passos", { "aria-label": "Etapas da importação" });
    var area = el("div.cris-area", { id: "cris-resultado" });
    var estadoGeral = el("p.t-mini.cris-status", { role: "status", "aria-live": "polite" });

    var m = UI.modal({
      titulo: "Importar do CRIS",
      largo: true,
      classe: "cris-modal cris-assistente",
      conteudo: [passos, estadoGeral, area],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }],
      podeFechar: function () {
        if (criando) return false;
        if (criada || !temRascunho()) return true;
        UI.confirmar({
          titulo: "Descartar a importação?",
          texto: "As conferências e escolhas desta importação serão perdidas. Nada foi criado nem gravado.",
          rotuloConfirmar: "Descartar", rotuloCancelar: "Continuar revisando", perigo: true,
        }).then(function (ok) { if (ok) m.fechar(); });
        return false;
      },
      aoFechar: function () { fechada = true; sequencia++; retrato = null; resultado = null; },
    });

    function temRascunho() {
      return !!(retrato && (Object.keys(confirmados).length || Object.keys(decisoes.destinos).length || Object.keys(decisoes.vinculos).length ||
        Object.keys(decisoes).some(function (k) { return k !== "destinos" && k !== "vinculos"; })));
    }

    function mostrarEstado(texto, erro) {
      estadoGeral.textContent = texto || "";
      estadoGeral.className = "t-mini cris-status" + (erro ? " t-erro" : "");
    }

    function entradas() { return resultado && resultado.entradas ? resultado.entradas : []; }
    function entrada(chave) { return entradas().filter(function (e) { return e.chave === chave; })[0] || null; }
    function situacao() { return X().situacao(entradas(), confirmados); }
    function secoes() { return (resultado && resultado.secoes) || X().SECOES; }
    function conferida(e) { return confirmados[e.chave] === e.assinatura; }
    function convertido() { return !!(resultado && resultado.ok && !resultado.bloqueado); }

    /* ------------------------------------------------------------ ciclo */

    function descartar() {
      retrato = null; resultado = null; decisoes = { destinos: {}, vinculos: {} }; confirmados = {}; sinalizados = {}; avisoRecalculo = [];
      operacaoId = null; linkDoRetrato = ""; editando = ""; painel = null; detalhesAbertos = {}; homebrewSalvos = {}; secao = 0; etapa = "carregar";
    }

    async function carregar(campoLink, botao) {
      if (criando || criada) return;
      var link = X().validarLink(campoLink.value);
      if (!link.ok) { descartar(); desenhar(); mostrarEstado(link.mensagem, true); focar("#cris-link"); return; }
      var minha = ++sequencia;
      var texto = campoLink.value;
      descartar();
      botao.disabled = true;
      botao.setAttribute("aria-busy", "true");
      mostrarEstado("Lendo a ficha no CRIS…");
      try {
        var r = await global.RAMAApi.lerFichaCris(link.url);
        if (fechada || minha !== sequencia) return;
        if (!r || !r.ok) { mostrarEstado(X().mensagemDeErro(r), true); return; }
        mostrarEstado("Preparando as sugestões…");
        if (!catalogos) {
          var cats = await Promise.all([global.RAMAOrdemItens.carregar(), global.RAMAOrdemRituais.carregar()]);
          catalogos = { itens: cats[0], rituais: cats[1] };
        }
        if (!homebrew) homebrew = await lerHomebrew();
        if (fechada || minha !== sequencia) return;
        retrato = r.dados;
        linkDoRetrato = U.aparar(texto);
        operacaoId = global.RAMAApi.novaOperacao();
        converter();
        mostrarEstado(convertido() ? "" : "A ficha não pôde ser convertida.", !convertido());
        desenhar();
        focar(".cris-carregada h3");
      } catch (e) {
        if (fechada || minha !== sequencia) return;
        console.error("[R.A.M.A. · CRIS] falha na leitura", e && e.message);
        mostrarEstado(catalogos ? "Não foi possível ler a ficha agora." : "Os catálogos do R.A.M.A. não carregaram. Recarregue a página e tente de novo.", true);
      } finally {
        if (minha === sequencia) { botao.disabled = false; botao.removeAttribute("aria-busy"); }
      }
    }

    /* Catálogo e Homebrew para associar. A Homebrew é opcional: sem ela,
       o assistente funciona só com o catálogo, e diz isso. */
    async function lerHomebrew() {
      var api = global.RAMAApi;
      try {
        var rs = await Promise.all([
          api.listarHomebrew({ escopo: "todos", tipos: TIPOS_ITEM_HB.concat(["ritual"]) }),
          api.listarHomebrew({ escopo: "todos", tipo: "habilidade" }),
        ]);
        var a = rs[0] && rs[0].ok ? rs[0].dados || [] : null;
        var b = rs[1] && rs[1].ok ? rs[1].dados || [] : null;
        return {
          itens: (a || []).filter(function (h) { return h && TIPOS_ITEM_HB.indexOf(h.tipo) >= 0; }),
          rituais: (a || []).filter(function (h) { return h && h.tipo === "ritual"; }),
          habilidades: (b || []).filter(function (h) { return h && h.tipo === "habilidade"; }),
          indisponivel: !a || !b,
        };
      } catch (e) {
        return { itens: [], rituais: [], habilidades: [], indisponivel: true };
      }
    }

    function converter() {
      try {
        resultado = X().converter(retrato, decisoes, dependencias(catalogos, homebrew));
      } catch (e) {
        console.error("[R.A.M.A. · CRIS] falha na conversão", e && e.message);
        resultado = { ok: false, bloqueado: true, avisos: [{ codigo: "conversao", gravidade: "erro", texto: "A conversão falhou. A importação por arquivo continua disponível." }], entradas: [], pendencias: [], comparacao: [], preservadosComoTexto: [] };
      }
    }

    /* Recalcular depois de uma escolha. A entrada escolhida fica
       conferida (escolher é conferir); as outras que mudaram voltam. */
    function recalcular(chavesEscolhidas) {
      var antigas = entradas();
      converter();
      var rec = X().reconciliarConfirmacoes(antigas, entradas(), confirmados);
      confirmados = rec.confirmados;
      (chavesEscolhidas || []).forEach(function (k) {
        var e = entrada(k);
        delete sinalizados[k];
        if (e && X().podeConfirmar(e)) confirmados[k] = e.assinatura;
      });
      avisoRecalculo = rec.voltaram.filter(function (v) { return (chavesEscolhidas || []).indexOf(v.chave) < 0; });
      avisoRecalculo.forEach(function (v) { sinalizados[v.chave] = v; });
      editando = ""; painel = null;
      if (chavesEscolhidas && chavesEscolhidas[0]) focoDepois = chavesEscolhidas[0];
      desenhar();
    }

    function escolherDestino(e, destino) {
      if (criando || criada) return;
      if (e.tipo === "ataque") decisoes.vinculos[e.chave] = destino;
      else decisoes.destinos[e.chave] = destino;
      recalcular([e.chave]);
    }

    function decidirRevisao(e, chave, valorNovo) {
      if (criando || criada) return;
      decisoes[chave] = valorNovo;
      recalcular([e.chave]);
    }

    function confirmar(e) {
      if (!X().podeConfirmar(e)) return;
      confirmados[e.chave] = e.assinatura;
      delete sinalizados[e.chave];
      focoDepois = proximaNaoConferidaDaSecao(e) || e.chave;
      desenhar();
    }

    function proximaNaoConferidaDaSecao(e) {
      var lista = entradas().filter(function (x) { return x.secao === e.secao; });
      var i = lista.indexOf(lista.filter(function (x) { return x.chave === e.chave; })[0]);
      for (var n = i + 1; n < lista.length; n++) if (!conferida(lista[n])) return lista[n].chave;
      return "";
    }

    function irParaPendencia() {
      var s = situacao();
      if (!s.pendentes.length) { etapa = "conferir"; desenhar(); return; }
      var e = entrada(s.pendentes[0]);
      etapa = "revisar";
      secao = Math.max(0, secoes().map(function (x) { return x.chave; }).indexOf(e.secao));
      confirmandoSecao = false;
      focoDepois = e.chave;
      desenhar();
    }

    function focar(seletor) {
      setTimeout(function () {
        var alvo = typeof seletor === "string" ? m.janela.querySelector(seletor) : seletor;
        if (alvo) {
          if (!alvo.hasAttribute("tabindex") && !/^(BUTTON|INPUT|SELECT|TEXTAREA|A)$/.test(alvo.tagName)) alvo.setAttribute("tabindex", "-1");
          alvo.focus();
          if (alvo.scrollIntoView) alvo.scrollIntoView({ block: "nearest" });
        }
      }, 0);
    }

    /* ------------------------------------------------------------ desenho */

    function desenhar() {
      desenharPassos();
      if (etapa === "revisar" && convertido()) U.trocar(area, telaRevisar());
      else if (etapa === "conferir" && convertido()) U.trocar(area, telaConferir());
      else U.trocar(area, telaCarregar());
      if (focoDepois) { var k = focoDepois; focoDepois = ""; focar("#" + idSeguro(k)); }
    }

    function desenharPassos() {
      var pronto = convertido();
      var itens = [["carregar", "Carregar ficha"], ["revisar", "Revisar por seção"], ["conferir", "Conferir e criar"]];
      U.trocar(passos, itens.map(function (p, n) {
        var atual = etapa === p[0];
        var pode = n === 0 ? !criando : pronto && !criando;
        return el("li", { class: "cris-passos__item" + (atual ? " cris-passos__item--atual" : "") }, [
          el("button.cris-passos__botao", { type: "button", disabled: !pode || atual, "aria-current": atual ? "step" : null,
            onclick: function () { etapa = p[0]; confirmandoSecao = false; editando = ""; painel = null; desenhar(); focar(".cris-area h3"); } }, [
            el("span.cris-passos__numero", { "aria-hidden": "true", texto: String(n + 1) }),
            el("span", { texto: p[1] }),
          ]),
        ]);
      }));
    }

    /* 1 · Carregar ------------------------------------------------------ */

    function telaCarregar() {
      var campoLink = el("input.r-entrada", {
        type: "url", inputmode: "url", autocomplete: "off", spellcheck: "false", id: "cris-link",
        placeholder: "https://crisordemparanormal.com/agente/…", value: linkDoRetrato,
      });
      var botao = el("button.r-botao.r-botao--principal", { type: "button", texto: "Carregar ficha", onclick: function () { carregar(campoLink, botao); } });
      campoLink.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); carregar(campoLink, botao); } });
      campoLink.addEventListener("input", function () {
        if (retrato && U.aparar(campoLink.value) !== linkDoRetrato && !criando && !criada) {
          sequencia++;
          var v = campoLink.value;
          descartar();
          desenhar();
          var novo = m.janela.querySelector("#cris-link");
          if (novo) { novo.value = v; novo.focus(); }
          mostrarEstado("O link mudou. Carregue a ficha de novo.");
        }
      });
      var partes = [
        el("p", { texto: "Cole o link público da ficha no CRIS. O R.A.M.A. adianta o preenchimento e você confere tudo o que vai entrar na ficha, seção por seção, antes de criar." }),
        el("div.r-campo", {}, [
          el("label", { for: "cris-link", texto: "Link público da ficha" }),
          el("div.faixa.cris-link", {}, [campoLink, botao]),
        ]),
      ];
      if (resultado) {
        var erros = (resultado.avisos || []).filter(function (a) { return a.gravidade === "erro"; });
        if (erros.length) partes.push(UI.painel("Não dá para importar", el("ul.pilha.pilha--curta", {}, erros.map(function (a) { return el("li.t-erro", { texto: a.texto }); }))));
        else partes.push(cartaoCarregada());
      }
      partes.push(el("p.t-mini", { texto: "Importação pontual: a ficha criada não sincroniza com o CRIS. Só o link vai ao servidor do R.A.M.A., que lê a ficha pública sem levar sua sessão ao CRIS. Nada é criado nem gravado antes de você clicar em Criar ficha." }));
      return el("div.pilha", {}, partes);
    }

    function textoDoResumo(s) {
      var partes = [];
      if (s.sugeridas) partes.push(plural(s.sugeridas, "sugestão pronta", "sugestões prontas") + " para conferir");
      if (s.semDestino) partes.push(plural(s.semDestino, "entrada precisa", "entradas precisam") + " de destino");
      if (!partes.length) partes.push(s.total ? "Tudo conferido" : "Nada para conferir");
      return partes.join(" · ");
    }

    function cartaoCarregada() {
      var s = situacao();
      var nome = (resultado.resumo && resultado.resumo.nome) || "Personagem";
      return el("section.cris-carregada.r-painel", { "aria-labelledby": "cris-nome" }, [
        el("h3.cris-carregada__nome", { id: "cris-nome", texto: nome }),
        el("p.cris-carregada__resumo", { texto: textoDoResumo(s) }),
        el("p.t-mini", { texto: [resultado.resumo.classe, resultado.resumo.origem, resultado.resumo.progressao].filter(function (x) { return x && x !== "—"; }).join(" · ") }),
        homebrew && homebrew.indisponivel ? el("p.t-mini.t-aviso", { texto: "A Homebrew não respondeu agora: as associações usam só o Catálogo. Você ainda pode criar personalizados." }) : null,
        foto(),
        el("div.faixa", {}, [
          el("button.r-botao.r-botao--principal", { type: "button", texto: s.conferidas ? "Continuar a revisão" : "Começar a revisão",
            onclick: function () { etapa = "revisar"; desenhar(); focar(".cris-secao h3"); } }),
        ]),
      ]);
    }

    function urlDaFoto() {
      var u = retrato && retrato.ficha && retrato.ficha.sheetPictureURL;
      return typeof u === "string" && u.indexOf(PREFIXO_FOTO) === 0 && u.length < 2048 ? u : "";
    }

    function foto() {
      if (!urlDaFoto() || !global.RAMAImagem) return null;
      var caixa = el("input", { type: "checkbox", id: "cris-foto-" + etapa, checked: querFoto, disabled: criando || !!criada });
      caixa.addEventListener("change", function () { querFoto = caixa.checked; });
      return el("label.cris-check", { for: "cris-foto-" + etapa }, [caixa, el("span", { texto: " Trazer a foto da ficha (opcional; se o CRIS não permitir a cópia, a ficha é criada sem foto)." })]);
    }

    /* 2 · Revisar por seção --------------------------------------------- */

    function telaRevisar() {
      var s = situacao();
      var lista = secoes();
      if (secao >= lista.length) secao = lista.length - 1;
      var atual = lista[secao];
      var daSecao = entradas().filter(function (e) { return e.secao === atual.chave; });
      var ps = s.porSecao[atual.chave] || { total: 0, conferidas: 0 };

      var nav = el("nav.cris-secoes", { "aria-label": "Seções da ficha" }, [el("ul", {}, lista.map(function (sx, n) {
        var p = s.porSecao[sx.chave] || { total: 0, conferidas: 0 };
        var completa = p.total && p.conferidas === p.total;
        return el("li", {}, [el("button.cris-secoes__botao", {
          type: "button", class: (n === secao ? "cris-secoes__botao--atual" : "") + (completa ? " cris-secoes__botao--completa" : "") + (p.semDestino ? " cris-secoes__botao--pendente" : ""),
          "aria-current": n === secao ? "true" : null, disabled: !p.total,
          "aria-label": sx.titulo + ": " + p.conferidas + " de " + p.total + " conferidas" + (p.semDestino ? ", " + p.semDestino + " sem destino" : ""),
          onclick: function () { secao = n; confirmandoSecao = false; editando = ""; painel = null; desenhar(); focar(".cris-secao h3"); },
        }, [el("span.cris-secoes__nome", { texto: sx.titulo }), el("span.cris-secoes__conta", { texto: p.conferidas + "/" + p.total })])]);
      }))]);

      var progresso = el("div.cris-progresso", {}, [
        el("progress", { max: String(Math.max(1, s.total)), value: String(s.conferidas), "aria-label": "Entradas conferidas" }),
        el("p.t-mini", { texto: s.conferidas + " de " + s.total + " entradas conferidas" + (s.semDestino ? " · " + plural(s.semDestino, "precisa", "precisam") + " de destino" : "") }),
      ]);

      var partes = [nav, progresso];
      if (avisoRecalculo.length) partes.push(avisoDeVolta());
      var confirmaveis = X().confirmaveisDaSecao(entradas(), confirmados, atual.chave);
      var semDestinoAqui = daSecao.filter(function (e) { return !conferida(e) && !X().podeConfirmar(e); }).length;

      var cabecalho = el("header.cris-secao__topo", {}, [
        el("div", {}, [
          el("h3", { id: "cris-secao-titulo", texto: atual.titulo }),
          el("p.t-mini", { texto: ps.conferidas + " de " + ps.total + " conferidas" + (semDestinoAqui ? " · " + plural(semDestinoAqui, "precisa", "precisam") + " de destino" : "") }),
        ]),
        confirmaveis.length && !confirmandoSecao ? el("button.r-botao", { type: "button", texto: "Confirmar as sugestões desta seção (" + confirmaveis.length + ")",
          onclick: function () { confirmandoSecao = true; editando = ""; painel = null; desenhar(); focar(".cris-lote"); } }) : null,
      ]);
      var corpo = [cabecalho];
      if (confirmandoSecao && confirmaveis.length) corpo.push(painelDoLote(confirmaveis, semDestinoAqui, atual));
      corpo.push(el("div.cris-entradas", {}, daSecao.map(cartaoDeEntrada)));
      partes.push(el("section.cris-secao", { "aria-labelledby": "cris-secao-titulo" }, corpo));

      var ultima = secao === lista.length - 1;
      partes.push(el("div.faixa.cris-navegacao", {}, [
        el("button.r-botao.r-botao--fantasma", { type: "button", texto: "← Seção anterior", disabled: secao === 0,
          onclick: function () { secao--; confirmandoSecao = false; editando = ""; desenhar(); focar(".cris-secao h3"); } }),
        s.pendentes.length ? el("button.r-botao.r-botao--fantasma", { type: "button", texto: "Ir para a próxima pendência", onclick: irParaPendencia }) : null,
        el("button.r-botao.r-botao--principal", { type: "button", texto: ultima ? "Conferir e criar →" : "Próxima seção →",
          onclick: function () { if (ultima) etapa = "conferir"; else secao++; confirmandoSecao = false; editando = ""; desenhar(); focar(ultima ? ".cris-area h3" : ".cris-secao h3"); } }),
      ]));
      return el("div.pilha", {}, partes);
    }

    function avisoDeVolta() {
      return el("div.cris-voltou", { role: "alert" }, [
        el("p.cris-voltou__titulo", { texto: "A mudança afetou o que já estava conferido. Voltou para revisão:" }),
        el("ul", {}, avisoRecalculo.map(function (v) {
          return el("li", {}, [
            el("button.cris-link-botao", { type: "button", texto: v.rotulo, onclick: function () { irPara(v.chave); } }),
            el("span", { texto: ": " + valor(v.antes) + " → " + valor(v.depois) + (v.destinoAntes !== v.destinoDepois ? " (destino: " + valor(v.destinoAntes) + " → " + valor(v.destinoDepois) + ")" : "") }),
          ]);
        })),
        el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Entendi", onclick: function () { avisoRecalculo = []; desenhar(); } }),
      ]);
    }

    function irPara(chave) {
      var e = entrada(chave);
      if (!e) return;
      secao = Math.max(0, secoes().map(function (x) { return x.chave; }).indexOf(e.secao));
      etapa = "revisar"; confirmandoSecao = false;
      focoDepois = chave;
      desenhar();
    }

    /* "Confirmar as sugestões desta seção" mostra antes a lista com os
       destinos propostos. Não resolve sem destino nem conflito. */
    function painelDoLote(lista, semDestino, atual) {
      return el("div.cris-lote", { tabindex: "-1", role: "region", "aria-label": "Confirmar sugestões da seção" }, [
        el("p.cris-lote__titulo", { texto: "Confirmar " + plural(lista.length, "sugestão", "sugestões") + " de " + atual.titulo + "?" }),
        el("ul.cris-lote__lista", {}, lista.map(function (e) {
          return el("li", {}, [el("strong", { texto: e.rotulo }), el("span", { texto: " → " + e.rama + (e.rotuloDestino ? " · " + e.rotuloDestino : "") })]);
        })),
        semDestino ? el("p.t-mini", { texto: plural(semDestino, "entrada sem destino ou com conflito continua", "entradas sem destino ou com conflito continuam") + " pedindo sua decisão." }) : null,
        el("div.faixa", {}, [
          el("button.r-botao.r-botao--principal", { type: "button", texto: "Confirmar " + lista.length,
            onclick: function () {
              confirmados = X().confirmarSecao(entradas(), confirmados, atual.chave);
              lista.forEach(function (e) { delete sinalizados[e.chave]; });
              confirmandoSecao = false; desenhar(); focar(".cris-secao h3");
            } }),
          el("button.r-botao.r-botao--fantasma", { type: "button", texto: "Voltar", onclick: function () { confirmandoSecao = false; desenhar(); } }),
        ]),
      ]);
    }

    function cartaoDeEntrada(e) {
      var ok = conferida(e);
      var voltou = !ok && sinalizados[e.chave];
      var est = ok ? ESTADOS.conferida : voltou ? ESTADOS.voltou : (ESTADOS[e.estado] || ESTADOS.sugerido);
      var precisa = !ok && !X().podeConfirmar(e);
      var abertaEdicao = editando === e.chave;
      var temEscolha = COM_DESTINO[e.tipo] || e.revisoes.some(function (r) { return !r.reconhecer && r.opcoes.length > 1; });
      var idTitulo = idSeguro(e.chave) + "-t";

      var acoes = [];
      if (!ok && X().podeConfirmar(e)) acoes.push(el("button.r-botao.r-botao--mini.r-botao--principal", { type: "button", texto: "Confirmar", "aria-describedby": idTitulo, onclick: function () { confirmar(e); } }));
      if (temEscolha && !criada) acoes.push(el("button.r-botao.r-botao--mini" + (precisa ? ".r-botao--principal" : ""), { type: "button", texto: abertaEdicao ? "Fechar" : (precisa ? "Escolher destino" : "Alterar"), "aria-expanded": abertaEdicao ? "true" : "false", "aria-describedby": idTitulo,
        onclick: function () { if (abertaEdicao) { editando = ""; painel = null; } else { editando = e.chave; painel = { busca: "", selecionado: null, modo: "" }; } confirmandoSecao = false; focoDepois = e.chave; desenhar(); if (!abertaEdicao) focar("#" + idSeguro(e.chave) + " .cris-destino"); } }));
      var temDetalhes = e.detalhes.length || (e.dadosCris && (e.dadosCris.descricao || e.dadosCris.texto)) || e.revisoes.some(function (r) { return r.reconhecer; });
      if (temDetalhes) acoes.push(el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: detalhesAbertos[e.chave] ? "Menos detalhes" : "Detalhes", "aria-expanded": detalhesAbertos[e.chave] ? "true" : "false",
        onclick: function () { detalhesAbertos[e.chave] = !detalhesAbertos[e.chave]; focoDepois = e.chave; desenhar(); } }));

      return el("article.cris-entrada", { id: idSeguro(e.chave), tabindex: "-1", "aria-labelledby": idTitulo, class: est.classe + (abertaEdicao ? " cris-entrada--editando" : "") }, [
        el("header.cris-entrada__topo", {}, [
          el("h4.cris-entrada__nome", { id: idTitulo, texto: e.rotulo }),
          el("span.cris-estado", { class: est.classe, texto: est.rotulo }),
        ]),
        el("div.cris-antes-depois", {}, [
          el("div.cris-lado.cris-lado--cris", {}, [el("span.cris-lado__rotulo", { texto: "No CRIS" }), el("p.cris-lado__valor", { texto: valor(e.cris) })]),
          el("span.cris-seta", { "aria-hidden": "true", texto: "→" }),
          el("div.cris-lado.cris-lado--rama", {}, [
            el("span.cris-lado__rotulo", { texto: "No R.A.M.A." }),
            el("p.cris-lado__valor", { texto: valor(e.rama) }),
            e.rotuloDestino ? el("p.t-mini.cris-lado__destino", { texto: e.rotuloDestino }) : null,
          ]),
        ]),
        voltou ? el("p.t-mini.cris-entrada__voltou", { texto: "Mudou por causa de outra escolha: " + valor(voltou.antes) + " → " + valor(voltou.depois) + "." }) : null,
        precisa ? el("p.cris-entrada__pergunta", { texto: (e.estado === "conflito" ? "Conflito: " : "") + (e.motivo || "Falta uma correspondência confiável.") + " O que é isso na sua ficha?" })
          : (e.motivo && !ok ? el("p.t-mini.cris-entrada__motivo", { texto: e.motivo }) : null),
        e.divergente ? el("p.t-mini.t-erro", { texto: "Um valor desta entrada não sai como o esperado na ficha criada: veja os detalhes." }) : null,
        acoes.length ? el("div.faixa.cris-entrada__acoes", {}, acoes) : null,
        abertaEdicao ? painelDeDestino(e) : null,
        detalhesAbertos[e.chave] ? detalhes(e) : null,
      ]);
    }

    function detalhes(e) {
      var partes = [];
      e.revisoes.filter(function (r) { return r.reconhecer; }).forEach(function (r) { partes.push(el("p.t-mini", { texto: r.rotulo + ": " + r.texto })); });
      var dc = e.dadosCris || {};
      var desc = dc.descricao || dc.texto;
      if (desc) partes.push(el("div.cris-detalhes__texto", {}, [el("p.cris-lado__rotulo", { texto: "Descrição no CRIS" }), el("p", { texto: desc, estilo: { whiteSpace: "pre-wrap" } })]));
      if (e.detalhes.length) {
        partes.push(el("div.cris-tabela__rolagem", { tabindex: "0", role: "region", "aria-label": "Cálculo de " + e.rotulo }, [el("table.cris-tabela.cris-tabela--entrada", {}, [
          el("thead", {}, [el("tr", {}, ["Valor", "CRIS", "Na ficha", "Por quê"].map(function (t) { return el("th", { scope: "col", texto: t }); }))]),
          el("tbody", {}, e.detalhes.map(function (l) {
            return el("tr", {}, [
              el("th", { scope: "row", texto: l.campo }),
              el("td", { dataset: { rotulo: "CRIS" }, texto: valor(l.cris) }),
              el("td", { dataset: { rotulo: "Na ficha" }, texto: valor(l.final) + (l.ajuste ? " (ajuste " + (l.ajuste > 0 ? "+" : "") + l.ajuste + ")" : "") }),
              el("td", { dataset: { rotulo: "Por quê" }, texto: l.motivo || "" }),
            ]);
          })),
        ])]));
      }
      return el("div.cris-detalhes", {}, partes);
    }

    /* O painel "O que é isso na sua ficha?" ----------------------------- */

    function fontes(e) {
      var item = null;
      if (e.tipo === "mod") {
        var dono = entrada(e.itemChave);
        var id = dono && dono.alvo ? dono.alvo.itemId : "";
        item = id ? resultado.ficha.inventario.itens.filter(function (x) { return x.id === id; })[0] : null;
      }
      return { catalogoItens: catalogos.itens, catalogoRituais: catalogos.rituais, P: global.RAMAOrdemPoderes, C: global.RAMAOrdemCatalogo,
        ITM: global.RAMAOrdemItens, RS: global.RAMAOrdemRituais, homebrew: homebrew, item: item };
    }

    function painelDeDestino(e) {
      var caixa = el("div.cris-destino", { tabindex: "-1", role: "region", "aria-label": "Destino de " + e.rotulo });
      var partes = [el("p.cris-destino__titulo", { texto: COM_DESTINO[e.tipo] ? "O que é isso na sua ficha?" : "Alterar" })];

      e.revisoes.filter(function (r) { return !r.reconhecer && r.opcoes.length > 1; }).forEach(function (r) {
        var id = idSeguro("rev-" + r.chave);
        var sel = el("select.r-selecao", { id: id }, r.opcoes.map(function (op) { return el("option", { value: op.valor, texto: op.rotulo, selected: op.valor === r.valor }); }));
        sel.value = r.valor;
        sel.addEventListener("change", function () { decidirRevisao(e, r.chave, sel.value); });
        partes.push(el("div.r-campo", {}, [el("label", { for: id, texto: r.rotulo }), el("p.t-mini", { texto: r.texto }), sel]));
      });

      if (e.tipo === "ataque") partes.push(opcoesDeAtaque(e));
      else if (e.tipo === "texto") partes.push(el("div.faixa", {}, [
        botaoDestino("Guardar em Anotações", function () { escolherDestino(e, { tipo: "anotacao" }); }),
        botaoDestino("Não importar", function () { escolherDestino(e, { tipo: "ignorar" }); }),
      ]));
      else if (COM_DESTINO[e.tipo]) partes.push(buscaDeDestino(e));
      partes.push(el("div.faixa", {}, [el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Cancelar", onclick: function () { editando = ""; painel = null; focoDepois = e.chave; desenhar(); } })]));
      U.anexar(caixa, partes);
      return caixa;
    }

    function botaoDestino(rotulo, aoClicar, principal) {
      return el("button.r-botao.r-botao--mini" + (principal ? ".r-botao--principal" : ""), { type: "button", texto: rotulo, onclick: aoClicar });
    }

    function armasDaFicha() {
      return entradas().filter(function (x) { return x.tipo === "item" && x.alvo && x.alvo.itemId; }).map(function (x) {
        var it = resultado.ficha.inventario.itens.filter(function (i) { return i.id === x.alvo.itemId; })[0];
        return it && it.tipo === "arma" ? { chave: x.chave, nome: it.nome, base: x.rotuloDestino } : null;
      }).filter(Boolean);
    }

    /* O vínculo do ataque: com qual arma ele rola. Reconhecido ou não, a
       pessoa vê e pode corrigir. */
    function opcoesDeAtaque(e) {
      var atual = e.vinculo || (e.alvoChave || "");
      var nome = idSeguro("vinc-" + e.chave);
      var opcoesV = armasDaFicha().map(function (a) { return { valor: a.chave, rotulo: "Vincular a “" + a.nome + "”", detalhe: a.base }; })
        .concat([{ valor: "proprio", rotulo: "Arma própria (0 espaço)", detalhe: "uma arma só para este ataque" },
          { valor: "anotacao", rotulo: "Guardar em Anotações" }, { valor: "ignorar", rotulo: "Não importar" }]);
      var grupo = el("fieldset.cris-opcoes", {}, [el("legend.t-mini", { texto: e.dadosCris && e.dadosCris.itemCris ? "No CRIS, ligado a “" + e.dadosCris.itemCris + "”." : "No CRIS, sem item." })].concat(opcoesV.map(function (op, n) {
        var id = nome + "-" + n;
        var r = el("input", { type: "radio", name: nome, id: id, value: op.valor, checked: op.valor === atual });
        return el("label.cris-check", { for: id }, [r, el("span", { texto: " " + op.rotulo + (op.detalhe ? " · " + op.detalhe : "") })]);
      })));
      var usar = botaoDestino("Usar este vínculo", function () {
        var marcado = grupo.querySelector("input:checked");
        if (marcado) escolherDestino(e, marcado.value);
      }, true);
      return el("div.pilha.pilha--curta", {}, [grupo, el("div.faixa", {}, [usar])]);
    }

    function buscaDeDestino(e) {
      var wrap = el("div.pilha.pilha--curta");
      var idBusca = idSeguro("busca-" + e.chave);
      var busca = el("input.r-entrada", { type: "search", id: idBusca, autocomplete: "off", value: painel.busca || "", placeholder: e.tipo === "pericia" ? "Nome da perícia" : "Buscar no Catálogo e na Homebrew" });
      var listaEl = el("ul.cris-resultados", { "aria-label": "Destinos compatíveis" });
      var rotuloLista = el("p.t-mini.cris-resultados__rotulo", { "aria-live": "polite" });
      var formulario = el("div.cris-destino__escolha");

      function pintarLista() {
        var achados = X().sugerirDestinos(e, painel.busca, fontes(e));
        rotuloLista.textContent = painel.busca ? (achados.length ? achados.length + " resultado(s)" : "Nada encontrado com esse nome.") : (achados.length ? "Mais prováveis (busque para ver os outros):" : "Busque pelo nome no Catálogo e na Homebrew.");
        var grupoAnterior = "";
        U.trocar(listaEl, achados.map(function (x) {
          var cab = x.grupo !== grupoAnterior ? el("span.cris-resultados__grupo", { texto: x.grupo }) : null;
          grupoAnterior = x.grupo;
          var sel = painel.selecionado && painel.selecionado.tipo === x.tipo && painel.selecionado.id === x.id;
          return el("li", {}, [cab, el("button.cris-resultado", { type: "button", "aria-pressed": sel ? "true" : "false",
            onclick: function () { painel.selecionado = x; painel.modo = "lista"; pintarLista(); pintarEscolha(); focar(formulario.querySelector("input, select, button")); } }, [
            el("span.cris-resultado__nome", { texto: x.nome }), el("span.cris-resultado__detalhe", { texto: x.detalhe || "" }),
          ])]);
        }));
      }
      function pintarEscolha() {
        if (painel.modo === "personalizado") U.trocar(formulario, formularioPersonalizado(e));
        else if (painel.selecionado) U.trocar(formulario, formularioDaEscolha(e, painel.selecionado));
        else U.limpar(formulario);
      }
      busca.addEventListener("input", function () { painel.busca = busca.value; pintarLista(); });
      pintarLista();
      pintarEscolha();

      var fixos = [];
      if (e.tipo !== "pericia" && e.tipo !== "mod") fixos.push(botaoDestino("Criar personalizado a partir do CRIS", function () { painel.modo = "personalizado"; painel.selecionado = null; pintarEscolha(); pintarLista(); focar(formulario.querySelector("input")); }));
      if (e.tipo === "mod") fixos.push(botaoDestino("Manter no texto do item", function () { escolherDestino(e, { tipo: "texto" }); }));
      fixos.push(botaoDestino("Guardar em Anotações", function () { escolherDestino(e, { tipo: "anotacao" }); }));
      fixos.push(botaoDestino("Não importar", function () { escolherDestino(e, { tipo: "ignorar" }); }));

      U.anexar(wrap, [
        el("div.r-campo", {}, [el("label", { for: idBusca, texto: e.tipo === "pericia" ? "Perícia do R.A.M.A." : "Buscar no Catálogo e na Homebrew" }), busca]),
        rotuloLista, listaEl, formulario,
        el("div.faixa.cris-destino__fixos", {}, fixos),
      ]);
      return wrap;
    }

    /* Catálogo, Homebrew ou "aplicar a um item": a cópia pode mudar de
       nome e descrição sem tocar no original. */
    function formularioDaEscolha(e, x) {
      var partes = [el("p.cris-destino__selecionado", { texto: "Escolhido: " + x.nome + (x.detalhe ? " · " + x.detalhe : "") })];
      var dc = e.dadosCris || {};
      var nomeCampo = null, descCampo = null, alvoSel = null;
      if (x.tipo === "modificacao") {
        var alvos = entradas().filter(function (y) { return y.tipo === "item" && y.chave !== e.chave && y.alvo && y.alvo.itemId; });
        var idA = idSeguro("alvo-" + e.chave);
        alvoSel = el("select.r-selecao", { id: idA }, alvos.map(function (y) { return el("option", { value: y.chave, texto: (resultado.ficha.inventario.itens.filter(function (i) { return i.id === y.alvo.itemId; })[0] || {}).nome || y.rotulo }); }));
        if (!alvos.length) partes.push(el("p.t-mini.t-erro", { texto: "Não há outro item na ficha para receber." }));
        else partes.push(el("div.r-campo", {}, [el("label", { for: idA, texto: "Aplicar em qual item?" }), alvoSel]));
      } else if (e.tipo === "item" || e.tipo === "ritual" || e.tipo === "poder") {
        var idN = idSeguro("nome-" + e.chave);
        var padraoNome = e.tipo === "item" ? (dc.nome || x.nome) : x.nome;
        nomeCampo = el("input.r-entrada", { id: idN, type: "text", value: padraoNome, maxlength: e.tipo === "item" ? "80" : "120" });
        var idD = idSeguro("desc-" + e.chave);
        descCampo = el("textarea.r-entrada", { id: idD, rows: "3", placeholder: "Vazio: mantém a descrição do original." });
        partes.push(el("div.r-campo", {}, [el("label", { for: idN, texto: "Nome na ficha" }), nomeCampo]));
        partes.push(el("div.r-campo", {}, [el("label", { for: idD, texto: e.tipo === "ritual" && x.tipo === "catalogo" ? "Complemento da cópia (opcional)" : "Descrição da cópia (opcional)" }), descCampo]));
        partes.push(el("p.t-mini", { texto: "Editar aqui muda só a cópia desta ficha; o original do " + (x.tipo === "homebrew" ? "Homebrew" : "Catálogo") + " continua igual." }));
      }
      partes.push(el("div.faixa", {}, [botaoDestino("Usar este destino", function () {
        if (x.tipo === "modificacao") {
          if (!alvoSel || !alvoSel.value) return;
          escolherDestino(e, { tipo: "modificacao", id: x.id, alvo: alvoSel.value });
          return;
        }
        var d = x.tipo === "homebrew" ? { tipo: "homebrew", registro: x.registro } : { tipo: "catalogo", id: x.id };
        if (nomeCampo && U.aparar(nomeCampo.value) && U.aparar(nomeCampo.value) !== x.nome) d.nome = U.aparar(nomeCampo.value);
        else if (nomeCampo && e.tipo === "item" && U.aparar(nomeCampo.value)) d.nome = U.aparar(nomeCampo.value);
        if (descCampo && U.aparar(descCampo.value)) d.descricao = descCampo.value;
        escolherDestino(e, d);
      }, true)]));
      return el("div.pilha.pilha--curta", {}, partes);
    }

    /* O personalizado nasce dos dados do CRIS; a pessoa edita nome,
       descrição e os campos do tipo, e decide se ele vai também para o
       Homebrew (privado, gravado só ao criar a ficha). */
    function formularioPersonalizado(e) {
      var dc = e.dadosCris || {};
      var atual = (e.destino && e.destino.tipo === "personalizado" && e.destino.dados) || {};
      var campos = {};
      var partes = [el("p.cris-destino__selecionado", { texto: "Personalizado a partir do CRIS" })];
      function texto(chave, rotulo, valorPadrao, tipo, extra) {
        var id = idSeguro("p-" + chave + "-" + e.chave);
        var v = atual[chave] !== undefined ? atual[chave] : valorPadrao;
        var c = tipo === "textarea" ? el("textarea.r-entrada", Object.assign({ id: id, rows: "4" }, extra || {})) : el("input.r-entrada", Object.assign({ id: id, type: tipo || "text" }, extra || {}));
        c.value = v === null || v === undefined ? "" : String(v);
        campos[chave] = c;
        return el("div.r-campo", {}, [el("label", { for: id, texto: rotulo }), c]);
      }
      function escolha(chave, rotulo, opcoesE, valorPadrao) {
        var id = idSeguro("p-" + chave + "-" + e.chave);
        var v = atual[chave] !== undefined ? atual[chave] : valorPadrao;
        var c = el("select.r-selecao", { id: id }, opcoesE.map(function (op) { return el("option", { value: op[0], texto: op[1], selected: String(op[0]) === String(v) }); }));
        c.value = String(v);
        campos[chave] = c;
        return el("div.r-campo", {}, [el("label", { for: id, texto: rotulo }), c]);
      }
      var grade = [];
      if (e.tipo === "item") {
        grade.push(texto("nome", "Nome", dc.nome, "text", { maxlength: "80" }));
        grade.push(escolha("tipoItem", "Tipo", [["item", "Item"], ["arma", "Arma"], ["armadura", "Proteção"]], dc.tipoItem || "item"));
        grade.push(escolha("categoria", "Categoria", [["0", "0"], ["1", "I"], ["2", "II"], ["3", "III"], ["4", "IV"]], dc.categoria === null || dc.categoria === undefined ? "0" : Math.max(0, Math.min(4, dc.categoria))));
        grade.push(texto("espacos", "Espaços", dc.espacos === null || dc.espacos === undefined ? 1 : Math.max(0, dc.espacos), "number", { min: "0", max: "99", step: "0.5" }));
        grade.push(texto("dano", "Dano (arma)", (dc.dano || "").split(/\s*\+\s*/)[0], "text", { maxlength: "20", placeholder: "1d8" }));
        grade.push(texto("critico", "Margem de ameaça (arma)", dc.critico === null ? 20 : dc.critico, "number", { min: "1", max: "20" }));
        grade.push(texto("multiplicador", "Multiplicador (arma)", dc.multiplicador === null ? 2 : dc.multiplicador, "number", { min: "1", max: "10" }));
        grade.push(escolha("tipoArma", "Alcance (arma)", [["corpoACorpo", "Corpo a corpo"], ["distancia", "Distância"]], "corpoACorpo"));
        grade.push(texto("tipoDano", "Tipo de dano (arma)", dc.tipoDano || "", "text", { maxlength: "20" }));
        grade.push(texto("defesa", "Defesa (proteção)", dc.defesa === null || dc.defesa === undefined ? "" : dc.defesa, "number", { min: "0", max: "99" }));
        partes.push(el("div.cris-grade-campos", {}, grade));
        partes.push(texto("descricao", "Descrição", dc.descricao || "", "textarea", { maxlength: "2000" }));
      } else if (e.tipo === "ritual") {
        grade.push(texto("nome", "Nome", dc.nome, "text", { maxlength: "120" }));
        grade.push(escolha("circulo", "Círculo", [["1", "1º"], ["2", "2º"], ["3", "3º"], ["4", "4º"]], dc.circulo || 1));
        grade.push(texto("elemento", "Elemento", dc.elemento || ""));
        grade.push(texto("execucao", "Execução", dc.execucao || ""));
        grade.push(texto("alcance", "Alcance", dc.alcance || ""));
        grade.push(texto("alvo", "Alvo", dc.alvo || ""));
        grade.push(texto("duracao", "Duração", dc.duracao || ""));
        grade.push(texto("resistencia", "Resistência", dc.resistencia || ""));
        partes.push(el("div.cris-grade-campos", {}, grade));
        partes.push(texto("descricao", "Descrição", dc.descricao || "", "textarea", { maxlength: "8000" }));
      } else {
        partes.push(texto("nome", "Nome", dc.nome, "text", { maxlength: "120" }));
        partes.push(texto("descricao", "Descrição", dc.descricao || "", "textarea", { maxlength: "8000" }));
      }
      var idHb = idSeguro("p-hb-" + e.chave);
      var salvar = el("input", { type: "checkbox", id: idHb, checked: !!(e.destino && e.destino.tipo === "personalizado" && e.destino.salvarHomebrew) });
      partes.push(el("label.cris-check", { for: idHb }, [salvar, el("span", { texto: " Também salvar no Homebrew (privado; gravado só ao criar a ficha). Sem marcar, fica só nesta ficha." })]));
      partes.push(el("div.faixa", {}, [botaoDestino("Usar personalizado", function () {
        var dados = {};
        Object.keys(campos).forEach(function (k) { dados[k] = campos[k].value; });
        ["categoria", "espacos", "critico", "multiplicador", "defesa", "circulo"].forEach(function (k) { if (dados[k] === "") delete dados[k]; });
        escolherDestino(e, { tipo: "personalizado", dados: dados, salvarHomebrew: salvar.checked, homebrewId: homebrewSalvos[e.chave] || "" });
      }, true)]));
      return el("div.pilha.pilha--curta", {}, partes);
    }

    /* 3 · Conferir e criar ---------------------------------------------- */

    function telaConferir() {
      var s = situacao();
      var partes = [];
      if (criada) {
        partes.push(UI.painel("Ficha criada", el("div.pilha", {}, [
          el("p", { texto: criada.nome + " está na sua conta." }),
          criada.homebrew ? el("p.t-mini", { texto: criada.homebrew }) : null,
          el("p.t-mini", { id: "cris-foto-estado", texto: criada.foto || "" }),
          el("div.faixa", {}, [
            el("button.r-botao.r-botao--principal", { type: "button", texto: "Abrir ficha", onclick: abrirFicha }),
            el("button.r-botao.r-botao--fantasma", { type: "button", texto: "Baixar JSON do RAMA", onclick: baixarJson }),
          ]),
        ])));
      }
      partes.push(el("h3", { texto: "Conferir o resultado" }));
      if (!s.pronto && !criada) {
        partes.push(el("div.cris-falta", { role: "status" }, [
          el("p", { texto: "Falta conferir " + plural(s.pendentes.length, "entrada", "entradas") + (s.semDestino ? " (" + plural(s.semDestino, "sem destino ou com conflito", "sem destino ou com conflito") + ")" : "") + ". Criar ficha e Baixar JSON ficam disponíveis quando tudo estiver conferido." }),
          el("div.faixa", {}, [el("button.r-botao.r-botao--principal", { type: "button", texto: "Ir para a próxima pendência", onclick: irParaPendencia })]),
        ]));
      }
      partes.push(resumo(resultado));
      partes.push(diferencas());
      partes.push(el("details.cris-detalhes", { open: mostrarTudo ? true : null }, [
        el("summary", { texto: "Ver detalhes: a comparação completa, avisos e textos guardados" }),
        el("div.pilha", {}, [comparacao(resultado), avisos(resultado), preservados(resultado)]),
      ]));
      if (!criada) {
        partes.push(foto());
        var bloqueado = !s.pronto || criando;
        partes.push(el("div.faixa.cris-navegacao", {}, [
          el("button.r-botao.r-botao--fantasma", { type: "button", texto: "← Voltar à revisão", disabled: criando, onclick: function () { etapa = "revisar"; desenhar(); } }),
          el("button.r-botao", { type: "button", id: "cris-baixar", texto: "Baixar JSON do RAMA", disabled: bloqueado, onclick: baixarJson }),
          el("button.r-botao.r-botao--principal", { type: "button", id: "cris-criar", texto: criando ? "Criando…" : "Criar ficha", disabled: bloqueado, "aria-busy": criando ? "true" : null, onclick: criar }),
        ]));
      }
      return el("div.pilha", {}, partes);
    }

    function resumo(r) {
      var s = r.resumo;
      var a = s.atributos;
      function rec(n, v) { return v ? n + " " + (v[0] === null ? "—" : v[0]) + "/" + v[1] : null; }
      var pares = [
        ["Nome", s.nome], ["Classe", s.classe], ["Origem", s.origem], ["Trilha", s.trilha], ["Progressão", s.progressao],
        ["Atributos", "FOR " + a.for + " · AGI " + a.agi + " · INT " + a.int + " · PRE " + a.pre + " · VIG " + a.vig],
        ["Recursos", [rec("PV", s.recursos.pv), rec("PE", s.recursos.pe), rec("SAN", s.recursos.san) + (s.semSanidade ? " (guardada; a regra usa PD)" : ""), rec("PD", s.recursos.pd)].filter(Boolean).join(" · ")],
        ["Defesas", "Defesa " + s.defesa + " · bloqueio " + s.bloqueio + " · esquiva " + s.esquiva],
        ["Conteúdo", s.itens + " itens · " + s.poderes + " poderes e habilidades · " + s.rituais + " rituais"],
      ];
      return UI.painel("Resumo da ficha", el("dl.r-dados", {}, pares.reduce(function (saida, p) {
        return saida.concat([el("dt", { texto: p[0] }), el("dd", { texto: valor(p[1]) })]);
      }, [])));
    }

    /* O que muda no jogo: ajustes, regras do R.A.M.A. que valem no lugar
       do CRIS, personalizados sem automação e o que ficou fora da ficha. */
    function diferencas() {
      var lista = entradas().filter(function (e) { return e.afetaJogo; });
      if (!lista.length) return UI.painel("Diferenças que afetam o jogo", el("p.t-mini", { texto: "Nenhuma: a ficha joga como no CRIS." }));
      var porSecao = {};
      lista.forEach(function (e) { (porSecao[e.secao] = porSecao[e.secao] || []).push(e); });
      return UI.painel("Diferenças que afetam o jogo (" + lista.length + ")", el("div.pilha.pilha--curta", {}, secoes().filter(function (sx) { return porSecao[sx.chave]; }).map(function (sx) {
        return el("div", {}, [
          el("p.cris-diferencas__secao", { texto: sx.titulo }),
          el("ul.cris-diferencas", {}, porSecao[sx.chave].map(function (e) {
            return el("li", {}, [el("button.cris-link-botao", { type: "button", texto: e.rotulo, onclick: function () { irPara(e.chave); } }),
              el("span", { texto: ": " + valor(e.cris) + " → " + valor(e.rama) })]);
          })),
        ]);
      })));
    }

    var SITUACOES = {
      divergente: { rotulo: "Divergente", classe: "cris-situacao--divergente" },
      regra: { rotulo: "Regra do R.A.M.A.", classe: "cris-situacao--regra" },
      ajustado: { rotulo: "Ajustado", classe: "cris-situacao--ajustado" },
      conferencia: { rotulo: "Para conferir", classe: "cris-situacao--conferir" },
      igual: { rotulo: "Igual", classe: "cris-situacao--igual" },
    };
    var ORDEM_SITUACAO = ["divergente", "regra", "ajustado", "conferencia", "igual"];
    var GRUPOS = ["Identidade", "Atributos", "Recursos", "Defesas", "Perícias", "Carga", "Itens", "Ataques", "Rituais", "Poderes", "Contagens"];

    function comparacao(r) {
      var cf = r.conferencia || {};
      var todas = r.comparacao || [];
      var porGrupo = {};
      todas.forEach(function (l) { (porGrupo[l.grupo] = porGrupo[l.grupo] || []).push(l); });
      var grupos = GRUPOS.filter(function (g) { return porGrupo[g]; }).concat(Object.keys(porGrupo).filter(function (g) { return GRUPOS.indexOf(g) < 0; }));
      var contagem = el("ul.cris-contagem", { "aria-label": "Resumo da comparação" }, ORDEM_SITUACAO.filter(function (k) { return cf[k]; }).map(function (k) {
        return el("li", { class: "cris-situacao " + SITUACOES[k].classe, texto: SITUACOES[k].rotulo + ": " + cf[k] });
      }));
      var corpo = [];
      grupos.forEach(function (g) {
        var linhas = porGrupo[g].slice().sort(function (a, b) { return ORDEM_SITUACAO.indexOf(a.situacao) - ORDEM_SITUACAO.indexOf(b.situacao); });
        corpo.push(el("tr.cris-tabela__grupo", {}, [el("th", { scope: "colgroup", colspan: "6", texto: g + " (" + linhas.length + ")" })]));
        linhas.forEach(function (l) {
          var sit = SITUACOES[l.situacao] || SITUACOES.conferencia;
          corpo.push(el("tr", { class: l.situacao === "igual" ? "cris-tabela__igual" : (l.situacao === "divergente" ? "cris-tabela__divergente" : "") }, [
            el("th", { scope: "row", texto: l.campo }),
            el("td", { dataset: { rotulo: "CRIS" }, texto: valor(l.cris) }),
            el("td", { dataset: { rotulo: "R.A.M.A. calcula" }, texto: valor(l.rama) }),
            el("td", { dataset: { rotulo: "Na ficha criada" }, texto: valor(l.final) + (l.ajuste ? " (ajuste " + (l.ajuste > 0 ? "+" : "") + l.ajuste + ")" : "") }),
            el("td", { dataset: { rotulo: "Situação" } }, [el("span", { class: "cris-situacao " + sit.classe, texto: sit.rotulo })]),
            el("td", { dataset: { rotulo: "Motivo" }, texto: l.problema ? l.problema + " — " + l.motivo : l.motivo }),
          ]));
        });
      });
      return el("div.pilha.pilha--curta", {}, [
        el("p.cris-decisao__titulo", { texto: "Comparação completa CRIS × R.A.M.A." }),
        el("p.t-mini", { texto: (cf.total || todas.length) + " valores conferidos na ficha que será criada" + (cf.arquivo ? ", e de novo depois de exportar e importar o arquivo." : ".") }),
        contagem,
        el("div.cris-tabela__rolagem", { tabindex: "0", role: "region", "aria-label": "Comparação de valores" }, [el("table.cris-tabela", {}, [
          el("caption.so-leitor", { texto: "Comparação entre o CRIS e a ficha que será criada no R.A.M.A." }),
          el("thead", {}, [el("tr", {}, ["Campo", "CRIS", "R.A.M.A. calcula", "Na ficha criada", "Situação", "Motivo"].map(function (t) { return el("th", { scope: "col", texto: t }); }))]),
          el("tbody", {}, corpo),
        ])]),
      ]);
    }

    function avisos(r) {
      var lista = (r.avisos || []).filter(function (a) { return a.gravidade !== "erro"; });
      if (!lista.length) return el("p.t-mini", { texto: "Nenhum aviso." });
      return el("div.pilha.pilha--curta", {}, [
        el("p.cris-decisao__titulo", { texto: "Avisos (" + lista.length + ")" }),
        el("ul.pilha.pilha--curta", {}, lista.map(function (a) { return el("li.t-mini", { texto: a.texto }); })),
      ]);
    }

    function preservados(r) {
      var lista = r.preservadosComoTexto || [];
      if (!lista.length) return el("span");
      return el("div.pilha.pilha--curta", {}, [
        el("p.cris-decisao__titulo", { texto: "Em Anotações, pasta “Importado do CRIS” (" + lista.length + ")" }),
        el("ul.pilha.pilha--curta", {}, lista.map(function (p) { return el("li.t-mini", { texto: p.titulo }); })),
      ]);
    }

    /* ------------------------------------------------------------ ações */

    function baixarJson() {
      if (!convertido() || (!criada && !situacao().pronto)) return;
      var pacote = global.RAMAValidacao.exportar("personagem", resultado.ficha);
      var ok = baixar(JSON.stringify(pacote, null, 2), nomeDoArquivo(resultado.ficha.nome));
      if (ok) UI.avisoOk("Arquivo gerado. Ele importa pelo botão Importar ficha, como qualquer exportação do R.A.M.A.");
      else UI.avisoAtencao("Não foi possível gerar o arquivo neste navegador.");
    }

    function abrirFicha() { if (criada) location.href = U.url("ficha/?id=" + encodeURIComponent(criada.id)); }

    /* Personalizados marcados para o Homebrew: gravados antes da ficha,
       uma vez cada (repetir atualiza o mesmo registro). */
    function registroParaHomebrew(e) {
      var F = global.RAMAFicha, H = global.RAMAHabilidades;
      var f = resultado.ficha;
      var reg = null;
      if (e.tipo === "item") {
        var it = f.inventario.itens.filter(function (x) { return x.id === e.alvo.itemId; })[0];
        if (it) { reg = F.normalizarItem(it); delete reg.origemHomebrewId; delete reg.adicionadoEm; if (reg.ordem) delete reg.ordem.ajustesImportados; }
      } else if (e.tipo === "ritual") {
        var rit = e.alvo.ritualIndice >= 0 ? f.rituais.itens[e.alvo.ritualIndice] : null;
        if (rit) { reg = JSON.parse(JSON.stringify(F.normalizarRitual(rit) || {})); delete reg.origemHomebrewId; delete reg.adicionadoEm; reg.tipo = "ritual"; }
      } else if (e.tipo === "poder") {
        var achado = H.achar(f.habilidades, e.alvo.habilidadeId);
        if (achado) { reg = H.normalizarHabilidade(achado.no); reg.tipo = "habilidade"; reg.origemHabilidadeId = null; }
      }
      if (!reg) return null;
      reg.visibilidade = "privado";
      if (homebrewSalvos[e.chave]) reg.id = homebrewSalvos[e.chave]; else delete reg.id;
      return reg;
    }

    async function gravarHomebrew() {
      var alvos = entradas().filter(function (e) { return e.destino && e.destino.tipo === "personalizado" && e.destino.salvarHomebrew; });
      var gravados = 0;
      for (var n = 0; n < alvos.length; n++) {
        var e = alvos[n];
        var reg = registroParaHomebrew(e);
        if (!reg) continue;
        var r = await global.RAMAApi.salvarHomebrew(reg);
        if (!r || !r.ok) return { ok: false, resposta: r, nome: e.rotulo };
        homebrewSalvos[e.chave] = (r.dados && r.dados.id) || reg.id || "";
        if (homebrewSalvos[e.chave]) decisoes.destinos[e.chave] = Object.assign({}, decisoes.destinos[e.chave], { homebrewId: homebrewSalvos[e.chave] });
        gravados++;
      }
      return { ok: true, gravados: gravados };
    }

    async function criar() {
      if (criando || criada || !convertido() || !situacao().pronto) return;
      criando = true;
      desenhar();
      mostrarEstado("Criando a ficha…");
      var hb = { ok: true, gravados: 0 };
      try { hb = await gravarHomebrew(); } catch (e) { hb = { ok: false, resposta: { ok: false, erro: "rede" } }; }
      if (!hb.ok) {
        criando = false;
        desenhar();
        mostrarEstado("Nada foi criado: “" + (hb.nome || "um personalizado") + "” não foi salvo no Homebrew. Tente de novo ou desmarque “Também salvar no Homebrew”.", true);
        UI.avisoDeFalha(hb.resposta, "gravação no Homebrew");
        return;
      }
      if (hb.gravados) {
        /* O rastro (origemHomebrewId) entra na ficha. As decisões são as
           mesmas; só confirmar que nada mudou de resultado. */
        var antes = entradas();
        converter();
        var rec = X().reconciliarConfirmacoes(antes, entradas(), confirmados);
        confirmados = rec.confirmados;
        if (rec.voltaram.length || !situacao().pronto) {
          criando = false; avisoRecalculo = rec.voltaram; rec.voltaram.forEach(function (v) { sinalizados[v.chave] = v; });
          etapa = "revisar"; desenhar();
          mostrarEstado("Os personalizados foram salvos no Homebrew, mas o resultado mudou. Confira de novo antes de criar.", true);
          return;
        }
      }
      var r;
      try { r = await global.RAMAApi.criarPersonagem(resultado.ficha, operacaoId); } catch (e) { r = { ok: false, erro: "rede" }; }
      if (!r || !r.ok) {
        criando = false;
        desenhar();
        mostrarEstado("A ficha não foi criada. Tentar de novo usa a mesma operação: se a primeira tentativa chegou ao servidor, nada é duplicado.", true);
        UI.avisoDeFalha(r, "importação do CRIS");
        return;
      }
      criando = false;
      criada = { id: r.dados.id, nome: resultado.ficha.nome, foto: querFoto && urlDaFoto() ? "Trazendo a foto…" : "", homebrew: hb.gravados ? plural(hb.gravados, "personalizado salvo", "personalizados salvos") + " no seu Homebrew (privado)." : "" };
      etapa = "conferir";
      desenhar();
      mostrarEstado("Ficha criada.");
      focar(".cris-area .r-botao--principal");
      if (o.aoCriar) o.aoCriar(criada.id, criada.nome);
      UI.avisoOk(criada.nome + " foi importado do CRIS.", { acao: { rotulo: "Abrir ficha", aoClicar: abrirFicha } });
      if (querFoto && urlDaFoto()) {
        criada.foto = await trazerFoto(criada.id);
        var alvo = document.getElementById("cris-foto-estado");
        if (alvo) alvo.textContent = criada.foto;
      }
    }

    /* A foto é opcional e vem depois: falhar aqui não desfaz a ficha nem
       repete a criação. O pedido ao armazenamento do CRIS vai sem
       credenciais e sem referer. */
    async function trazerFoto(id) {
      var url = urlDaFoto();
      if (!url) return "";
      try {
        var resp = await fetch(url, { method: "GET", credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store", redirect: "error", mode: "cors" });
        if (!resp.ok) return "A foto não veio (o CRIS respondeu " + resp.status + "). Adicione pela ficha, se quiser.";
        var blob = await resp.blob();
        if (!blob.size || blob.size > MAX_FOTO || !/^image\//.test(blob.type || "")) return "A foto do CRIS não é uma imagem aceita. Adicione pela ficha, se quiser.";
        var prep = await global.RAMAImagem.preparar(blob);
        if (!prep || !prep.ok) return (prep && prep.mensagem) || "A foto não pôde ser preparada. Adicione pela ficha, se quiser.";
        var s = await global.RAMAApi.salvarFoto(id, prep.imagem);
        return s && s.ok ? "Foto trazida do CRIS." : "A ficha foi criada, mas a foto não foi gravada. Adicione pela ficha, se quiser.";
      } catch (e) {
        return "O CRIS não permite copiar a foto por este navegador. A ficha foi criada sem foto; adicione pela ficha, se quiser.";
      }
    }

    desenhar();
    focar("#cris-link");
    return m;
  }

  global.RAMAImportarCrisTela = { abrir: abrir };
})(typeof window !== "undefined" ? window : globalThis);
