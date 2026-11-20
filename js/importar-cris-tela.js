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
  /* v9.16: entradas da reconstrução, com painel próprio. */
  var COM_PAINEL = { vaga: 1, modo: 1, dividida: 1 };

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
      editandoProc = ""; sugestoes = null;
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


    /* ------------------------------------------- reconstrução (v9.16)
       Duas perguntas por entrada: "o que é isso?" (o destino, acima) e
       "como foi adquirido?" (a procedência, aqui). A visão da progressão
       e a revisão por assunto editam as MESMAS decisões
       (decisoes.reconstrucao); toda escolha passa pelo conversor, que a
       transforma na estrutura nativa e confere os requisitos na etapa. */

    var editandoProc = "";
    var sugestoes = null;

    function rc() {
      if (!decisoes.reconstrucao || typeof decisoes.reconstrucao !== "object") decisoes.reconstrucao = {};
      var r = decisoes.reconstrucao;
      if (!r.procedencia) r.procedencia = {};
      if (!r.vagas) r.vagas = {};
      return r;
    }
    function progressao() { return (resultado && resultado.progressao) || { ativa: false, etapas: [], extras: [], semEtapa: [] }; }
    function entradaDaVaga(id) { return entrada("vaga:" + id); }
    function nomeDe(chave) { var x = entrada(chave); return x ? x.rotulo : chave; }

    var SITUACAO_ETAPA = {
      reconstruida: "Reconstruída", vazia: "Não preenchida", desconhecida: "Etapa desconhecida",
      invalida: "Não vale", incompleta: "Incompleta", conflito: "Conflito",
    };

    function decidirModo(ativa) {
      if (criando || criada) return;
      rc().ativa = !!ativa;
      recalcular(["progressao:modo"]);
    }

    /* Uma etapa de poder é de uma entrada só: escolher outra para ela
       devolve a anterior para "etapa desconhecida" (dito no aviso). */
    function liberarVaga(idVaga, exceto, tipoVaga) {
      if (tipoVaga === "rituais") return [];
      var r = rc(), soltas = [];
      Object.keys(r.procedencia).forEach(function (k) {
        var dp = r.procedencia[k];
        if (k !== exceto && dp && dp.tipo === "vaga" && dp.vaga === idVaga) { r.procedencia[k] = { tipo: "desconhecida" }; soltas.push(k); }
      });
      return soltas;
    }

    function decidirProcedencia(e, dp) {
      if (criando || criada) return;
      var r = rc();
      var soltas = [];
      if (dp.tipo === "vaga") {
        var ve = entradaDaVaga(dp.vaga);
        soltas = liberarVaga(dp.vaga, e.chave, ve && ve.vaga ? ve.vaga.tipo : "");
        delete r.vagas[dp.vaga];
      }
      r.procedencia[e.chave] = dp;
      editandoProc = "";
      recalcular([e.chave]);
      if (soltas.length) UI.avisoAtencao("A etapa era de " + soltas.map(nomeDe).join(", ") + ", que voltou para “etapa desconhecida”.");
    }

    function decidirVaga(e, dv, entradaEscolhida) {
      if (criando || criada) return;
      var r = rc();
      var id = e.vaga.id;
      var soltas = [];
      if (entradaEscolhida) {
        soltas = liberarVaga(id, entradaEscolhida, e.vaga.tipo);
        r.procedencia[entradaEscolhida] = { tipo: "vaga", vaga: id };
        delete r.vagas[id];
      } else {
        soltas = liberarVaga(id, "", e.vaga.tipo);
        r.vagas[id] = dv;
      }
      editando = ""; painel = null;
      recalcular(entradaEscolhida ? [e.chave, entradaEscolhida] : [e.chave]);
      if (soltas.length) UI.avisoAtencao(soltas.map(nomeDe).join(", ") + " voltou para “etapa desconhecida”.");
    }

    function decidirRituaisDaVaga(e, marcadas) {
      if (criando || criada) return;
      var r = rc();
      var id = e.vaga.id;
      Object.keys(r.procedencia).forEach(function (k) {
        var dp = r.procedencia[k];
        if (dp && dp.tipo === "vaga" && dp.vaga === id && marcadas.indexOf(k) < 0) r.procedencia[k] = { tipo: "desconhecida" };
      });
      marcadas.forEach(function (k) { r.procedencia[k] = { tipo: "vaga", vaga: id }; });
      delete r.vagas[id];
      editando = ""; painel = null;
      recalcular([e.chave].concat(marcadas));
    }

    /* A linha que resume a entrada inteira: o que era, o que virou, de
       onde veio e se está conferida. */
    function linhaDeResumo(e, est) {
      if (!e.procedencia) return null;
      var partes = [e.rotulo, e.rotuloDestino || (e.tipo === "ritual" ? "Ritual" : "—"), e.procedencia.texto, est.rotulo];
      return el("p.t-mini.cris-resumo-linha", { texto: partes.join(" → ") });
    }

    /* Os destinos de procedência de uma entrada, das etapas compatíveis
       às outras, com o motivo de cada impedimento. */
    function etapasPara(e) {
      var saida = [];
      entradas().forEach(function (v) {
        if (v.tipo !== "vaga" || !v.vaga) return;
        var c = (v.vaga.candidatos || []).filter(function (x) { return x.entrada === e.chave; })[0];
        var ehRitual = e.tipo === "ritual";
        if ((v.vaga.tipo === "rituais") !== ehRitual) return;
        var outras = v.vaga.entradas.filter(function (k) { return k !== e.chave; });
        var ocupacao = ehRitual
          ? (v.vaga.entradas.length + " de " + (v.vaga.quantidade || "?") + " escolhidos")
          : (outras.length ? "ocupada por “" + nomeDe(outras[0]) + "”" : "livre");
        saida.push({ id: v.vaga.id, rotulo: v.rotulo, ok: !!(c && c.ok), cabe: !!c, motivos: c ? c.motivos : ["Esta etapa não concede " + (ehRitual ? "rituais" : "esse tipo de poder") + "."],
          ocupacao: ocupacao, ocupada: !ehRitual && outras.length > 0, cheia: ehRitual && v.vaga.quantidade && v.vaga.entradas.length >= v.vaga.quantidade && v.vaga.entradas.indexOf(e.chave) < 0, via: c ? c.via : "" });
      });
      return saida.sort(function (a, b) {
        var pa = a.ok ? (a.ocupada || a.cheia ? 1 : 0) : (a.cabe ? 2 : 3);
        var pb = b.ok ? (b.ocupada || b.cheia ? 1 : 0) : (b.cabe ? 2 : 3);
        return pa - pb;
      });
    }

    function rotuloDeDegraus() {
      var pg = progressao();
      var m = pg.marco || {};
      var E = global.RAMAOrdemProgressao;
      var max = m.degrau || 0;
      var lista = [];
      for (var d = 1; d <= max; d++) lista.push({ valor: String(d), rotulo: E.rotuloDoDegrau ? E.rotuloDoDegrau(d, m.modo === "nivel") : "Etapa " + d });
      return lista;
    }

    function itensDaFicha() {
      return entradas().filter(function (x) { return x.tipo === "item" && x.alvo && x.alvo.itemId; }).map(function (x) {
        var it = resultado.ficha.inventario.itens.filter(function (i) { return i.id === x.alvo.itemId; })[0];
        return it ? { chave: x.chave, nome: it.nome } : null;
      }).filter(Boolean);
    }

    function painelDeProcedencia(e) {
      var caixa = el("div.cris-destino", { tabindex: "-1", role: "region", "aria-label": "Procedência de " + e.rotulo });
      var dp = e.decisaoProcedencia || {};
      var nome = idSeguro("proc-" + e.chave);
      var atual = dp.tipo === "vaga" ? "vaga:" + dp.vaga : (dp.tipo || (e.procedencia && e.procedencia.situacao === "desconhecida" ? "desconhecida" : ""));
      var partes = [el("p.cris-destino__titulo", { texto: "Como foi adquirido?" }),
        el("p.t-mini", { texto: "Reconhecer o que é não diz quando veio. Escolha a etapa da progressão, uma escolha interna de outra entrada, uma aquisição extra — ou deixe a etapa como desconhecida. Nada fica conferido sem você confirmar." })];
      var etapas = etapasPara(e);
      var busca = el("input.r-entrada", { type: "search", id: nome + "-busca", autocomplete: "off", placeholder: "Filtrar etapas (ex.: 15%, Versatilidade)", value: painel && painel.buscaProc || "" });
      var lista = el("div.cris-opcoes", { role: "radiogroup", "aria-label": "Etapas" });
      function radio(valorR, rotulo, detalhe, extraClasse) {
        var id = nome + "-" + String(valorR).replace(/[^A-Za-z0-9_-]/g, "_");
        return el("label.cris-check" + (extraClasse || ""), { for: id }, [
          el("input", { type: "radio", name: nome, id: id, value: valorR, checked: valorR === atual }),
          el("span", {}, [el("span", { texto: " " + rotulo }), detalhe ? el("span.t-mini.cris-check__detalhe", { texto: " — " + detalhe }) : null]),
        ]);
      }
      function pintar() {
        var q = U.chaveDeBusca ? U.chaveDeBusca(busca.value || "") : String(busca.value || "").toLowerCase();
        var vistas = etapas.filter(function (x) { return !q || (U.chaveDeBusca ? U.chaveDeBusca(x.rotulo) : x.rotulo.toLowerCase()).indexOf(q) >= 0; });
        var cabem = vistas.filter(function (x) { return x.ok; });
        var naoCabem = vistas.filter(function (x) { return !x.ok; });
        var filhos = [];
        filhos.push(el("p.cris-resultados__grupo", { texto: "Etapas compatíveis (" + cabem.length + ")" }));
        if (!cabem.length) filhos.push(el("p.t-mini", { texto: q ? "Nenhuma etapa compatível com esse filtro." : "Nenhuma etapa do histórico aceita esta entrada agora." }));
        cabem.forEach(function (x) { filhos.push(radio("vaga:" + x.id, x.rotulo, x.ocupacao + (x.via === "transcender" ? " · por Transcender" : x.via === "trilha" ? " · primeiro poder da trilha" : ""))); });
        if (naoCabem.length) {
          filhos.push(el("details.cris-detalhes", {}, [el("summary", { texto: "Outras etapas, que não cabem agora (" + naoCabem.length + ")" }),
            el("div.cris-opcoes", {}, naoCabem.map(function (x) { return radio("vaga:" + x.id, x.rotulo, "não cabe: " + (x.motivos[0] || "incompatível")); }))]));
        }
        U.trocar(lista, filhos);
      }
      busca.addEventListener("input", function () { if (painel) painel.buscaProc = busca.value; pintar(); });
      pintar();
      partes.push(el("div.r-campo", {}, [el("label", { for: nome + "-busca", texto: "Etapas do histórico" }), busca]), lista);

      var outras = entradas().filter(function (x) { return x.tipo === e.tipo && x.chave !== e.chave && x.tipo === "poder"; });
      var extraForm = el("div.pilha.pilha--curta.cris-proc-extra");
      var selDentro = null, selParte = null, selItem = null;
      var campos = {};
      var fixos = [radio("desconhecida", "Aquisição conhecida, etapa desconhecida", "não inventa etapa: fica fora das vagas, com o efeito aplicado")];
      if (e.tipo === "poder") {
        if (outras.length) {
          selDentro = el("select.r-selecao", { id: nome + "-dentro", "aria-label": "Entrada de que esta é uma escolha interna" }, outras.map(function (x) { return el("option", { value: x.chave, texto: x.rotulo, selected: dp.tipo === "dentro" && dp.entrada === x.chave }); }));
          selParte = el("select.r-selecao", { id: nome + "-parte", "aria-label": "Entrada de que esta é parte" }, outras.map(function (x) { return el("option", { value: x.chave, texto: x.rotulo, selected: dp.tipo === "parte" && dp.entrada === x.chave }); }));
          fixos.push(el("div.pilha.pilha--curta", {}, [radio("dentro", "Escolha interna de outra entrada", "Transcender → poder, Expansão de Conhecimento → poder de outra classe, Versatilidade → trilha"), selDentro]));
          fixos.push(el("div.pilha.pilha--curta", {}, [radio("parte", "Parte da mesma aquisição de outra entrada", "a outra descreve o poder; esta, o efeito — sem contar duas vezes"), selParte]));
        }
        var itens = itensDaFicha();
        if (itens.length) {
          selItem = el("select.r-selecao", { id: nome + "-item", "aria-label": "Item que concede" }, itens.map(function (x) { return el("option", { value: x.chave, texto: x.nome, selected: dp.tipo === "item" && dp.item === x.chave }); }));
          fixos.push(el("div.pilha.pilha--curta", {}, [radio("item", "Concedido por um item (vale enquanto o item estiver em uso)", ""), selItem]));
        }
        fixos.push(radio("extra", "Aquisição extra (fora das vagas normais)", "recompensa, treinamento especial, concessão do mestre, homebrew"));
        campos.just = el("input.r-entrada", { type: "text", id: nome + "-just", maxlength: "200", value: dp.tipo === "extra" ? dp.procedencia || "" : "", placeholder: "De onde veio (ex.: recompensa da missão 3)" });
        campos.quando = el("select.r-selecao", { id: nome + "-quando" }, [el("option", { value: "", texto: "Não sei quando" })].concat(rotuloDeDegraus().map(function (x) { return el("option", { value: x.valor, texto: x.rotulo, selected: dp.tipo === "extra" && String(dp.quando) === x.valor }); })));
        campos.excecaoLig = el("input", { type: "checkbox", id: nome + "-exc", checked: !!(dp.tipo === "extra" && dp.excecao) });
        campos.excecao = el("input.r-entrada", { type: "text", id: nome + "-excm", maxlength: "300", value: dp.tipo === "extra" ? dp.excecao || "" : "", placeholder: "Motivo da exceção (obrigatório para manter fora do requisito)" });
        U.anexar(extraForm, [
          el("div.r-campo", {}, [el("label", { for: nome + "-just", texto: "Procedência ou justificativa" }), campos.just]),
          el("div.r-campo", {}, [el("label", { for: nome + "-quando", texto: "Quando foi adquirido (os requisitos são conferidos ali)" }), campos.quando]),
          el("label.cris-check", { for: nome + "-exc" }, [campos.excecaoLig, el("span", { texto: " Exceção a requisitos, decidida pela mesa (diferente de uma concessão extra)" })]),
          campos.excecao,
        ]);
        fixos.push(extraForm);
      } else {
        fixos.push(radio("mesa", "Concessão da mesa (fora da progressão)", "fica marcado como exceção, com nota"));
      }
      partes.push(el("p.cris-resultados__grupo", { texto: "Fora das etapas" }), el("div.cris-opcoes", { role: "radiogroup" }, fixos));

      var aviso = el("p.t-mini.t-erro", { role: "alert" });
      partes.push(aviso, el("div.faixa", {}, [
        botaoDestino("Usar esta procedência", function () {
          var marcado = caixa.querySelector("input[name='" + nome + "']:checked");
          if (!marcado) { aviso.textContent = "Escolha uma opção."; return; }
          var v = marcado.value;
          if (v.indexOf("vaga:") === 0) return decidirProcedencia(e, { tipo: "vaga", vaga: v.slice(5) });
          if (v === "dentro") return decidirProcedencia(e, { tipo: "dentro", entrada: selDentro.value });
          if (v === "parte") return decidirProcedencia(e, { tipo: "parte", entrada: selParte.value });
          if (v === "item") return decidirProcedencia(e, { tipo: "item", item: selItem.value, emUso: true });
          if (v === "extra") {
            var exc = campos.excecaoLig.checked ? U.aparar(campos.excecao.value, 300) : "";
            if (campos.excecaoLig.checked && !exc) { aviso.textContent = "A exceção a requisitos precisa de um motivo."; campos.excecao.focus(); return; }
            return decidirProcedencia(e, { tipo: "extra", procedencia: U.aparar(campos.just.value, 200), quando: campos.quando.value === "" ? null : Number(campos.quando.value), excecao: exc });
          }
          return decidirProcedencia(e, { tipo: v });
        }, true),
        el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Cancelar", onclick: function () { editandoProc = ""; focoDepois = e.chave; desenhar(); } }),
      ]));
      U.anexar(caixa, partes);
      return caixa;
    }

    /* A etapa vista pelo lado dela: o que veio aqui? */
    function painelDaVaga(e) {
      var v = e.vaga;
      var caixa = el("div.cris-destino", { tabindex: "-1", role: "region", "aria-label": "O que veio em " + e.rotulo });
      var nome = idSeguro("vg-" + v.id);
      var partes = [el("p.cris-destino__titulo", { texto: "O que veio nesta etapa?" })];
      var aviso = el("p.t-mini.t-erro", { role: "alert" });
      var dv = v.decisao || {};
      var atualFixo = v.situacao === "vazia" ? "vazia" : (v.situacao === "desconhecida" ? "desconhecida" : "");
      function radio(valorR, rotulo, detalhe, marcado) {
        var id = nome + "-" + String(valorR).replace(/[^A-Za-z0-9_-]/g, "_");
        return el("label.cris-check", { for: id }, [el("input", { type: "radio", name: nome, id: id, value: valorR, checked: !!marcado }),
          el("span", {}, [el("span", { texto: " " + rotulo }), detalhe ? el("span.t-mini.cris-check__detalhe", { texto: " — " + detalhe }) : null])]);
      }
      var fixos = [radio("desconhecida", "Etapa desconhecida", "continua histórico indisponível; nada é inventado", atualFixo === "desconhecida"),
        radio("vazia", "Não preenchida de verdade", "vira pendência normal na aba Progressão", atualFixo === "vazia")];
      var C = global.RAMAOrdemCatalogo;
      var corpo;
      var ler;
      if (v.tipo === "atributo") {
        var selA = el("select.r-selecao", { id: nome + "-atr" }, [el("option", { value: "", texto: "Escolha o atributo" })].concat(C.ATRIBUTOS.map(function (a) {
          return el("option", { value: a.chave, texto: a.nome + " (" + (resultado.resumo.atributos[a.chave]) + " no CRIS)", selected: dv.tipo === "atributo" && dv.valor === a.chave });
        })));
        var selP = el("select.r-selecao", { id: nome + "-per" }, [el("option", { value: "", texto: "Perícia treinada pelo ponto de Intelecto" })].concat(C.PERICIAS.map(function (p) {
          return el("option", { value: p.chave, texto: p.nome, selected: dv.pericia === p.chave });
        })));
        var campoP = el("div.r-campo", { hidden: !(dv.valor === "int") }, [el("label", { for: nome + "-per", texto: "Intelecto aumentado: qual perícia passou a ser treinada?" }), selP]);
        selA.addEventListener("change", function () { campoP.hidden = selA.value !== "int"; });
        corpo = [radio("atributo", "Aumento de atributo", "", dv.tipo === "atributo" || v.situacao === "reconstruida"),
          el("div.r-campo", {}, [el("label", { for: nome + "-atr", texto: "Atributo aumentado" }), selA]), campoP];
        ler = function () { if (!selA.value) return "Escolha o atributo."; if (selA.value === "int" && !selP.value) return "Escolha a perícia do ponto de Intelecto."; return { tipo: "atributo", valor: selA.value, pericia: selA.value === "int" ? selP.value : "" }; };
      } else if (v.tipo === "grauTreinamento" || v.tipo === "perito") {
        var marcadas = dv.tipo === "pericias" ? (dv.pericias || []) : [];
        var caixas = C.PERICIAS.map(function (p) {
          var id = nome + "-p-" + p.chave;
          return el("label.cris-check", { for: id }, [el("input", { type: "checkbox", id: id, value: p.chave, checked: marcadas.indexOf(p.chave) >= 0 }), el("span", { texto: " " + p.nome })]);
        });
        corpo = [radio("pericias", v.tipo === "perito" ? "Perícias do Perito" : "Perícias que subiram de grau", "", dv.tipo === "pericias" || v.situacao === "reconstruida"),
          el("fieldset.cris-opcoes.cris-grade-campos", {}, [el("legend.t-mini", { texto: "Marque as perícias" })].concat(caixas))];
        ler = function () {
          var sel = Array.prototype.slice.call(caixa.querySelectorAll("input[type=checkbox]:checked")).map(function (x) { return x.value; });
          return sel.length ? { tipo: "pericias", pericias: sel } : "Marque ao menos uma perícia.";
        };
      } else if (v.tipo === "rituais") {
        var cands = (v.candidatos || []).slice().sort(function (a, b) { return (b.ok - a.ok) || (b.ocupada - a.ocupada); });
        var contador = el("p.t-mini", { "aria-live": "polite" });
        var marc = el("fieldset.cris-opcoes", {}, [el("legend.t-mini", { texto: "Rituais que esta concessão deu (" + (v.quantidade || "?") + " nesta etapa)" })].concat(cands.map(function (c) {
          var id = nome + "-r-" + idSeguro(c.entrada);
          var ondeMais = (entrada(c.entrada) || {}).procedencia;
          var outra = ondeMais && ondeMais.vaga && ondeMais.vaga !== v.id ? " · hoje em " + (entradaDaVaga(ondeMais.vaga) || {}).rotulo : "";
          return el("label.cris-check", { for: id }, [el("input", { type: "checkbox", id: id, value: c.entrada, checked: c.ocupada }),
            el("span", {}, [el("span", { texto: " " + c.rotulo }), el("span.t-mini.cris-check__detalhe", { texto: c.ok ? (outra || "") : " — não cabe: " + (c.motivos[0] || "") })])]);
        })));
        function contar() { var n = caixa.querySelectorAll("fieldset input[type=checkbox]:checked").length; contador.textContent = n + " de " + (v.quantidade || "?") + " escolhidos" + (v.quantidade && n > v.quantidade ? " — passa do que a concessão dá" : ""); }
        marc.addEventListener("change", contar);
        partes.push(marc, contador);
        setTimeout(contar, 0);
        partes.push(el("div.cris-opcoes", {}, fixos), aviso, el("div.faixa", {}, [
          botaoDestino("Usar estes rituais", function () {
            var fixo = caixa.querySelector("input[name='" + nome + "']:checked");
            var sel = Array.prototype.slice.call(marc.querySelectorAll("input[type=checkbox]:checked")).map(function (x) { return x.value; });
            if (sel.length) return decidirRituaisDaVaga(e, sel);
            if (fixo) { decidirRituaisDaVaga(e, []); return decidirVaga(e, { tipo: fixo.value }); }
            aviso.textContent = "Marque os rituais ou escolha uma situação.";
          }, true),
          el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Cancelar", onclick: function () { editando = ""; painel = null; focoDepois = e.chave; desenhar(); } }),
        ]));
        U.anexar(caixa, partes);
        return caixa;
      } else if (v.candidatos) {
        var busca = el("input.r-entrada", { type: "search", id: nome + "-busca", autocomplete: "off", placeholder: "Filtrar poderes", value: painel && painel.busca || "" });
        var lista = el("div.cris-opcoes", { role: "radiogroup", "aria-label": "Poderes do CRIS" });
        var pintar = function () {
          var q = U.chaveDeBusca ? U.chaveDeBusca(busca.value || "") : String(busca.value || "").toLowerCase();
          var vis = v.candidatos.filter(function (c) { return !q || (U.chaveDeBusca ? U.chaveDeBusca(c.rotulo) : c.rotulo.toLowerCase()).indexOf(q) >= 0; });
          var bons = vis.filter(function (c) { return c.ok || c.ocupada; }), ruins = vis.filter(function (c) { return !c.ok && !c.ocupada; });
          var linhaC = function (c) {
            var proc = (entrada(c.entrada) || {}).procedencia;
            var onde = proc && proc.vaga && proc.vaga !== v.id ? "hoje em " + (entradaDaVaga(proc.vaga) || {}).rotulo : (proc && proc.situacao === "extra" ? "hoje como extra" : (proc && proc.situacao === "dentro" ? "hoje como escolha interna" : ""));
            return radio("e:" + c.entrada, c.rotulo, (c.ok || c.ocupada ? "" : "não cabe: " + (c.motivos[0] || "") + " ") + (c.via === "transcender" ? "por Transcender " : c.via === "trilha" ? "primeiro poder da trilha " : "") + onde, c.ocupada);
          };
          U.trocar(lista, [el("p.cris-resultados__grupo", { texto: "Compatíveis (" + bons.length + ")" })].concat(bons.map(linhaC)).concat(ruins.length ? [el("details.cris-detalhes", {}, [el("summary", { texto: "Não cabem agora (" + ruins.length + ")" }), el("div.cris-opcoes", {}, ruins.map(linhaC))])] : []));
        };
        busca.addEventListener("input", function () { if (painel) painel.busca = busca.value; pintar(); });
        pintar();
        corpo = [el("div.r-campo", {}, [el("label", { for: nome + "-busca", texto: "Poderes do CRIS" }), busca]), lista];
        ler = null;
      } else {
        corpo = [el("p.t-mini", { texto: "Esta etapa pede uma decisão que o assistente não reconstrói. Deixe como desconhecida ou não preenchida; depois de criar, a aba Progressão abre a escolha nativa." })];
      }
      partes = partes.concat(corpo || []);
      partes.push(el("p.cris-resultados__grupo", { texto: "Sem escolha" }), el("div.cris-opcoes", {}, fixos), aviso);
      partes.push(el("div.faixa", {}, [
        botaoDestino("Usar", function () {
          var marcado = caixa.querySelector("input[name='" + nome + "']:checked");
          if (!marcado) { aviso.textContent = "Escolha uma opção."; return; }
          var val = marcado.value;
          if (val === "vazia" || val === "desconhecida") return decidirVaga(e, { tipo: val });
          if (val.indexOf("e:") === 0) return decidirVaga(e, null, val.slice(2));
          var res = ler ? ler() : "Escolha uma opção.";
          if (typeof res === "string") { aviso.textContent = res; return; }
          decidirVaga(e, res);
        }, true),
        el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Cancelar", onclick: function () { editando = ""; painel = null; focoDepois = e.chave; desenhar(); } }),
      ]));
      U.anexar(caixa, partes);
      return caixa;
    }

    function painelDoModo(e) {
      var nome = idSeguro("modo");
      var ativa = progressao().ativa;
      var caixa = el("div.cris-destino", { tabindex: "-1", role: "region", "aria-label": "Reconstrução da progressão" });
      var g = el("fieldset.cris-opcoes", {}, [
        el("legend.t-mini", { texto: "Como tratar as etapas até o NEX importado?" }),
        el("label.cris-check", { for: nome + "-a" }, [el("input", { type: "radio", name: nome, id: nome + "-a", value: "nao", checked: !ativa }),
          el("span", { texto: " Só o estado atual — as etapas ficam como histórico indisponível (como nas importações anteriores)." })]),
        el("label.cris-check", { for: nome + "-b" }, [el("input", { type: "radio", name: nome, id: nome + "-b", value: "sim", checked: ativa }),
          el("span", { texto: " Reconstruir a progressão — dizer, etapa por etapa, o que veio em cada uma. O que você não souber fica como etapa desconhecida." })]),
      ]);
      U.anexar(caixa, [g, el("div.faixa", {}, [
        botaoDestino("Usar", function () { var m2 = caixa.querySelector("input[name='" + nome + "']:checked"); decidirModo(m2 && m2.value === "sim"); }, true),
        el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Cancelar", onclick: function () { editando = ""; painel = null; focoDepois = e.chave; desenhar(); } }),
      ])]);
      return caixa;
    }

    /* Dividir uma entrada que mistura várias coisas. As partes ganham id
       estável; renomear mantém as decisões delas. */
    function formularioDeDivisao(e, partesAtuais) {
      var lista = (partesAtuais && partesAtuais.length ? partesAtuais.map(function (p) { return { id: p.id, nome: p.nome }; }) : [{ id: novaParte(), nome: e.rotulo }, { id: novaParte(), nome: "" }]);
      var wrap = el("div.pilha.pilha--curta");
      var aviso = el("p.t-mini.t-erro", { role: "alert" });
      function novaParte() { return "p" + String(U.uuid()).replace(/[^A-Za-z0-9]/g, "").slice(0, 8); }
      function pintar() {
        U.trocar(wrap, [el("p.t-mini", { texto: "Cada parte vira uma entrada própria, com destino e procedência. O texto original continua na entrada dividida, como referência." })]
          .concat(lista.map(function (p, n) {
            var id = idSeguro("parte-" + e.chave + "-" + p.id);
            var campo = el("input.r-entrada", { type: "text", id: id, maxlength: "120", value: p.nome });
            campo.addEventListener("input", function () { p.nome = campo.value; });
            return el("div.faixa", {}, [el("label.so-leitor", { for: id, texto: "Parte " + (n + 1) }), campo,
              lista.length > 2 ? el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Tirar", "aria-label": "Tirar a parte " + (n + 1), onclick: function () { lista.splice(n, 1); pintar(); } }) : null]);
          }))
          .concat([el("div.faixa", {}, [
            lista.length < 12 ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Mais uma parte", onclick: function () { lista.push({ id: novaParte(), nome: "" }); pintar(); } }) : null,
            botaoDestino(partesAtuais ? "Salvar as partes" : "Dividir", function () {
              var limpas = lista.filter(function (p) { return U.aparar(p.nome, 120); });
              if (limpas.length < 2) { aviso.textContent = "Dê nome a pelo menos duas partes."; return; }
              if (!decisoes.componentes) decisoes.componentes = {};
              decisoes.componentes[e.chave] = limpas.map(function (p) { return { id: p.id, nome: U.aparar(p.nome, 120) }; });
              recalcular([e.chave]);
            }, true),
          ]), aviso]));
      }
      pintar();
      return wrap;
    }

    function painelDaDivisao(e) {
      var caixa = el("div.cris-destino", { tabindex: "-1", role: "region", "aria-label": "Partes de " + e.rotulo });
      U.anexar(caixa, [
        el("p.cris-destino__titulo", { texto: "Partes desta entrada" }),
        el("ul.pilha.pilha--curta", {}, (e.partes || []).map(function (p) { return el("li", {}, [el("button.cris-link-botao", { type: "button", texto: p.nome, onclick: function () { irPara(p.chave); } })]); })),
        formularioDeDivisao(e, e.partes),
        el("div.faixa", {}, [
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Juntar de novo (uma entrada só)", onclick: function () {
            if (decisoes.componentes) delete decisoes.componentes[e.chave];
            recalcular([e.chave]);
          } }),
          el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Cancelar", onclick: function () { editando = ""; painel = null; focoDepois = e.chave; desenhar(); } }),
        ]),
      ]);
      return caixa;
    }

    /* A visão da progressão: etapas, o que veio em cada uma, extras e o
       que ficou sem etapa — os mesmos dados da revisão por assunto. */
    function visaoDaProgressao() {
      var pg = progressao();
      if (!pg.ativa) return null;
      var linhas = pg.etapas.map(function (x) {
        var sit = SITUACAO_ETAPA[x.situacao] || x.situacao;
        var oque = x.descricao || (x.entradas.length ? x.entradas.map(nomeDe).join(", ") : "—");
        return el("li.cris-etapa", { dataset: { situacao: x.situacao } }, [
          el("button.cris-link-botao", { type: "button", texto: x.rotulo, onclick: function () { irPara("vaga:" + x.id); } }),
          el("span.cris-etapa__oque", { texto: x.situacao === "reconstruida" || x.situacao === "invalida" || x.situacao === "incompleta" ? oque : "" }),
          el("span.cris-estado", { class: x.situacao === "reconstruida" ? "cris-estado--conferida" : (x.situacao === "invalida" || x.situacao === "conflito" || x.situacao === "incompleta" ? "cris-estado--conflito" : "cris-estado--sugerido"), texto: sit }),
        ]);
      });
      var semEtapa = pg.semEtapa.filter(function (k) { var x = entrada(k); return x && x.tipo === "poder"; });
      var partes = [
        el("p.t-mini", { texto: "Etapa por etapa até o NEX importado. Clique numa etapa para dizer o que veio nela; em cada poder, “Como foi adquirido?” edita o mesmo vínculo." }),
        el("p.t-mini", { role: "status", texto: ["reconstruida", "vazia", "desconhecida"].map(function (s2) { return pg.etapas.filter(function (x) { return x.situacao === s2; }).length + " " + SITUACAO_ETAPA[s2].toLowerCase(); }).join(" · ") +
          (pg.etapas.some(function (x) { return x.situacao === "invalida" || x.situacao === "incompleta" || x.situacao === "conflito"; }) ? " · há etapas com problema" : "") + " — de " + pg.etapas.length + " etapas." }),
        el("ul.cris-etapas", {}, linhas),
      ];
      if (pg.extras.length) partes.push(el("div", {}, [el("p.cris-diferencas__secao", { texto: "Aquisições extras (" + pg.extras.length + ")" }),
        el("ul.cris-diferencas", {}, pg.extras.map(function (x) { return el("li", {}, [x.entrada ? el("button.cris-link-botao", { type: "button", texto: x.nome, onclick: function () { irPara(x.entrada); } }) : el("span", { texto: x.nome }), el("span", { texto: " — " + (x.procedencia || "sem justificativa") })]); }))]));
      if (semEtapa.length) partes.push(el("div", {}, [el("p.cris-diferencas__secao", { texto: "Poderes com etapa desconhecida (" + semEtapa.length + ")" }),
        el("ul.cris-diferencas", {}, semEtapa.map(function (k) { return el("li", {}, [el("button.cris-link-botao", { type: "button", texto: nomeDe(k), onclick: function () { irPara(k); } })]); }))]));
      partes.push(sugestoes ? painelDeSugestoes() : el("div.faixa", {}, [el("button.r-botao.r-botao--mini", { type: "button", texto: "Sugerir associações para as etapas em aberto", onclick: function () { sugestoes = calcularSugestoes(); desenhar(); focar(".cris-sugestoes"); } })]));
      return UI.painel("Visão da progressão", el("div.pilha", {}, partes));
    }

    /* Sugestão explícita: para cada etapa de poder sem decisão, o primeiro
       poder compatível ainda sem etapa. Nada é aplicado sem o botão, e o
       que for aplicado continua para conferir. */
    function calcularSugestoes() {
      var r = rc();
      var usados = {};
      Object.keys(r.procedencia).forEach(function (k) { var dp = r.procedencia[k]; if (dp && dp.tipo && dp.tipo !== "desconhecida") usados[k] = true; });
      var lista = [];
      entradas().filter(function (v) { return v.tipo === "vaga" && v.vaga && v.vaga.situacao === "desconhecida" && !r.vagas[v.vaga.id] && v.vaga.tipo !== "rituais"; }).forEach(function (v) {
        var c = (v.vaga.candidatos || []).filter(function (x) { return x.ok && !usados[x.entrada]; })[0];
        if (!c) return;
        usados[c.entrada] = true;
        lista.push({ vaga: v.vaga.id, rotulo: v.rotulo, entrada: c.entrada, nome: c.rotulo });
      });
      return lista;
    }

    function painelDeSugestoes() {
      return el("div.cris-lote.cris-sugestoes", { tabindex: "-1", role: "region", "aria-label": "Sugestões de associação" }, [
        el("p.cris-lote__titulo", { texto: sugestoes.length ? "Sugerir estas associações? Elas entram como decisão e continuam para conferir." : "Nenhuma sugestão: não há etapa em aberto com poder compatível sem etapa." }),
        sugestoes.length ? el("ul.cris-lote__lista", {}, sugestoes.map(function (s) { return el("li", {}, [el("strong", { texto: s.rotulo }), el("span", { texto: " → " + s.nome })]); })) : null,
        el("p.t-mini", { texto: "A sugestão usa só o que cabe pelas regras na ordem das etapas; ela não sabe a história do personagem." }),
        el("div.faixa", {}, [
          sugestoes.length ? el("button.r-botao.r-botao--principal", { type: "button", texto: "Aplicar " + sugestoes.length, onclick: function () {
            var r = rc();
            sugestoes.forEach(function (s) { r.procedencia[s.entrada] = { tipo: "vaga", vaga: s.vaga }; delete r.vagas[s.vaga]; });
            sugestoes = null;
            recalcular([]);
          } }) : null,
          el("button.r-botao.r-botao--fantasma", { type: "button", texto: "Fechar", onclick: function () { sugestoes = null; desenhar(); } }),
        ]),
      ]);
    }

    /* Na conferência final: o que ficou automatizado, extra, sem
       histórico, como texto ou fora — separados. */
    function comoFicaAReconstrucao() {
      var pg = progressao();
      var ents = entradas();
      var auto = ents.filter(function (x) { return x.procedencia && (x.procedencia.situacao === "vaga" || x.procedencia.situacao === "dentro" || x.procedencia.situacao === "regras") && x.procedencia.ok; });
      var extras = ents.filter(function (x) { return x.procedencia && (x.procedencia.situacao === "extra" || x.procedencia.situacao === "mesa"); });
      var semHist = ents.filter(function (x) { return x.procedencia && x.procedencia.situacao === "desconhecida"; });
      var texto = ents.filter(function (x) { return (x.tipo === "poder" && /^Habilidade de texto/.test(x.rama)) || (x.procedencia && x.procedencia.situacao === "extraTexto") || (x.destino && x.destino.tipo === "anotacao"); });
      var fora = ents.filter(function (x) { return (x.destino && x.destino.tipo === "ignorar") || x.vinculo === "ignorar"; });
      function bloco(titulo, lista, vazio) {
        return el("div", {}, [el("p.cris-diferencas__secao", { texto: titulo + " (" + lista.length + ")" }),
          lista.length ? el("ul.cris-diferencas", {}, lista.map(function (x) { return el("li", {}, [el("button.cris-link-botao", { type: "button", texto: x.rotulo, onclick: function () { irPara(x.chave); } }), x.procedencia ? el("span", { texto: " — " + x.procedencia.texto }) : null]); })) : el("p.t-mini", { texto: vazio })]);
      }
      var etapasTxt = pg.ativa ? pg.etapas.filter(function (x) { return x.situacao === "reconstruida"; }).length + " de " + pg.etapas.length + " etapas reconstruídas; " +
        pg.etapas.filter(function (x) { return x.situacao === "vazia"; }).length + " não preenchida(s); " + pg.etapas.filter(function (x) { return x.situacao === "desconhecida"; }).length + " desconhecida(s)." : "Progressão não reconstruída: as etapas até o NEX importado ficam como histórico indisponível.";
      return UI.painel("Como a ficha fica", el("div.pilha.pilha--curta", {}, [
        el("p.t-mini", { texto: etapasTxt }),
        bloco("Automatizado", auto, "Nada associado a etapas ou regras."),
        bloco("Aquisições extras e concessões da mesa", extras, "Nenhuma."),
        bloco("Sem histórico conhecido (etapa desconhecida)", semHist, "Nenhuma."),
        bloco("Preservado como texto", texto, "Nada."),
        bloco("Descartado por decisão", fora, "Nada."),
      ]));
    }

    /* ------------------------------------------------------------ desenho */

    /* v9.17: só a navegação explícita (outra etapa, outra seção) anima a
       área; recalcular, conferir ou abrir um painel redesenham sem
       movimento. Avançar entra da direita; voltar, da esquerda. */
    var vistaAnterior = null;
    var ORDEM_ETAPAS = { carregar: 0, revisar: 1, conferir: 2 };
    function desenhar() {
      desenharPassos();
      if (etapa === "revisar" && convertido()) U.trocar(area, telaRevisar());
      else if (etapa === "conferir" && convertido()) U.trocar(area, telaConferir());
      else U.trocar(area, telaCarregar());
      var vista = { etapa: etapa, secao: etapa === "revisar" ? secao : 0 };
      var Mv = global.RAMAMovimento;
      if (Mv && vistaAnterior && (vistaAnterior.etapa !== vista.etapa || vistaAnterior.secao !== vista.secao)) {
        var frente = ORDEM_ETAPAS[vista.etapa] > ORDEM_ETAPAS[vistaAnterior.etapa] || (vista.etapa === vistaAnterior.etapa && vista.secao > vistaAnterior.secao);
        Mv.entrar(area, { de: frente ? "direita" : "esquerda" });
      }
      vistaAnterior = vista;
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
      if (atual.chave === "progressao") corpo.push(visaoDaProgressao());
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
      var temEscolha = COM_DESTINO[e.tipo] || COM_PAINEL[e.tipo] || e.revisoes.some(function (r) { return !r.reconhecer && r.opcoes.length > 1; });
      var abertaProc = editandoProc === e.chave;
      var temProc = !!(e.reconstruir && e.procedencia && e.procedencia.situacao !== "regras" && (e.tipo === "poder" || e.tipo === "ritual"));
      var idTitulo = idSeguro(e.chave) + "-t";

      var acoes = [];
      if (!ok && X().podeConfirmar(e)) acoes.push(el("button.r-botao.r-botao--mini.r-botao--principal", { type: "button", texto: "Confirmar", "aria-describedby": idTitulo, onclick: function () { confirmar(e); } }));
      if (temEscolha && !criada) acoes.push(el("button.r-botao.r-botao--mini" + (precisa && !temProc ? ".r-botao--principal" : ""), { type: "button", texto: abertaEdicao ? "Fechar" : (COM_PAINEL[e.tipo] ? (e.tipo === "dividida" ? "Partes" : "Escolher") : (precisa && !temProc ? "Escolher destino" : (temProc ? "O que é isso?" : "Alterar"))), "aria-expanded": abertaEdicao ? "true" : "false", "aria-describedby": idTitulo,
        onclick: function () { if (abertaEdicao) { editando = ""; painel = null; } else { editando = e.chave; editandoProc = ""; painel = { busca: "", selecionado: null, modo: "" }; } confirmandoSecao = false; focoDepois = e.chave; desenhar(); if (!abertaEdicao) focar("#" + idSeguro(e.chave) + " .cris-destino"); } }));
      if (temProc && !criada) acoes.push(el("button.r-botao.r-botao--mini" + (precisa ? ".r-botao--principal" : ""), { type: "button", texto: abertaProc ? "Fechar" : "Como foi adquirido?", "aria-expanded": abertaProc ? "true" : "false", "aria-describedby": idTitulo,
        onclick: function () { if (abertaProc) editandoProc = ""; else { editandoProc = e.chave; editando = ""; painel = { busca: "", buscaProc: "", selecionado: null, modo: "" }; } confirmandoSecao = false; focoDepois = e.chave; desenhar(); if (!abertaProc) focar("#" + idSeguro(e.chave) + " .cris-destino"); } }));
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
        linhaDeResumo(e, est),
        voltou ? el("p.t-mini.cris-entrada__voltou", { texto: "Mudou por causa de outra escolha: " + valor(voltou.antes) + " → " + valor(voltou.depois) + "." }) : null,
        precisa ? el("p.cris-entrada__pergunta", { texto: (e.estado === "conflito" ? "Conflito: " : "") + (e.motivo || "Falta uma correspondência confiável.") +
          (e.tipo === "vaga" ? " O que veio nesta etapa?" : (e.procedencia && !e.procedencia.ok ? " Como foi adquirido?" : " O que é isso na sua ficha?")) })
          : (e.motivo && !ok ? el("p.t-mini.cris-entrada__motivo", { texto: e.motivo }) : null),
        e.divergente ? el("p.t-mini.t-erro", { texto: "Um valor desta entrada não sai como o esperado na ficha criada: veja os detalhes." }) : null,
        acoes.length ? el("div.faixa.cris-entrada__acoes", {}, acoes) : null,
        abertaEdicao ? painelDeDestino(e) : null,
        abertaProc ? painelDeProcedencia(e) : null,
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
      if (e.tipo === "vaga") return painelDaVaga(e);
      if (e.tipo === "modo") return painelDoModo(e);
      if (e.tipo === "dividida") return painelDaDivisao(e);
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
      /* v9.16: uma entrada que mistura várias coisas pode ser dividida. */
      if ((e.tipo === "poder" || e.tipo === "ritual") && !e.parteDe) {
        partes.push(el("details.cris-detalhes", {}, [el("summary", { texto: "Esta entrada mistura várias coisas? Dividir em partes" }), formularioDeDivisao(e, null)]));
      }
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
      var nomeCampo = null, descCampo = null, alvoSel = null, escolhaCampo = null;
      /* Item do catálogo que pede uma opção (o Kit de perícia pede a
         perícia): a opção vem junto, sugerida pelo nome quando dá. */
      var entCat = x.tipo === "catalogo" && e.tipo === "item" ? catalogos.itens.porId[x.id] : null;
      var ITM = global.RAMAOrdemItens;
      if (entCat && entCat.escolha) {
        var idE = idSeguro("esc-" + e.chave);
        var opcoesE = ITM.opcoesDaEscolha(entCat.escolha);
        if (entCat.escolha.tipo === "texto" || !opcoesE.length) {
          escolhaCampo = el("input.r-entrada", { id: idE, type: "text", maxlength: "60" });
        } else {
          var sugerida = X().escolhaPeloNome(opcoesE, dc.nome) || "";
          escolhaCampo = el("select.r-selecao", { id: idE }, [el("option", { value: "", texto: entCat.escolha.opcional ? "Nenhuma" : "Escolha…" })].concat(opcoesE.map(function (op) {
            return el("option", { value: op.valor, texto: op.rotulo, selected: op.valor === sugerida });
          })));
          escolhaCampo.value = sugerida;
        }
        partes.push(el("div.r-campo", {}, [el("label", { for: idE, texto: entCat.escolha.rotulo || "Opção" }), escolhaCampo]));
      }
      var avisoEscolha = el("p.t-mini.t-erro", { role: "alert" });
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
        if (escolhaCampo && !U.aparar(escolhaCampo.value) && !(entCat.escolha && entCat.escolha.opcional)) {
          avisoEscolha.textContent = (entCat.escolha.rotulo || "Escolha a opção") + ": escolha antes de usar.";
          escolhaCampo.focus();
          return;
        }
        var d = x.tipo === "homebrew" ? { tipo: "homebrew", registro: x.registro } : { tipo: "catalogo", id: x.id };
        if (escolhaCampo && U.aparar(escolhaCampo.value)) d.escolha = U.aparar(escolhaCampo.value);
        if (nomeCampo && U.aparar(nomeCampo.value) && U.aparar(nomeCampo.value) !== x.nome) d.nome = U.aparar(nomeCampo.value);
        else if (nomeCampo && e.tipo === "item" && U.aparar(nomeCampo.value)) d.nome = U.aparar(nomeCampo.value);
        if (descCampo && U.aparar(descCampo.value)) d.descricao = descCampo.value;
        escolherDestino(e, d);
      }, true)]));
      partes.push(avisoEscolha);
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
      partes.push(comoFicaAReconstrucao());
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
