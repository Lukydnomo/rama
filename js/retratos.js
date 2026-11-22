/* =====================================================================
   R.A.M.A. — retratos do personagem (v9.13)
   ---------------------------------------------------------------------
   A biblioteca de retratos e os conjuntos, para todos os sistemas.

   BIBLIOTECA   as imagens do personagem, em PERSONAGENS_IMAGENS (tipo
                "retrato"): várias, em uso ou não, cada uma com nome. Uma
                imagem é um arquivo só, por mais conjuntos que a usem.
   CONJUNTOS    na ficha (`ficha.retratos`), só com REFERÊNCIAS: cada um
                tem nome e as posições Normal, Machucado e — nos sistemas
                que têm o estado — Enlouquecendo.
   MODO         Automático: a posição acompanha o estado REAL da ficha,
                calculado na tela (nada é gravado a cada dano ou cura),
                com a prioridade Enlouquecendo → Machucado → Normal,
                pulando posição sem imagem. Fixar retrato: a posição
                escolhida fica até voltar ao automático.
   PRÉVIA       testar uma posição na tela, sem tocar em vida, sanidade
                nem condição. Some ao fechar a janela.

   A foto de sempre (PERSONAGENS_FOTOS) continua sendo a das listas e da
   mesa: ela acompanha o Normal do conjunto ativo. Uma ficha antiga com
   foto abre como sempre; ao abrir Retratos, a foto vira o Normal de um
   conjunto inicial, sem pedir nada.

   ESTADO POR SISTEMA (machucado / enlouquecendo)
     ordem       Machucado da regra (PV na metade ou menos, OPRPG p. 82);
                 Enlouquecendo é a condição do rastreador
     ordem2      PV atual abaixo da metade do máximo (sem definição própria)
     oblivio     a mazela Ferida ou Fora de Ação
     vampiro     Vitalidade Debilitada (ou torpor)
     goblins     um ferimento ou mais
     tormenta20  PV abaixo da metade do máximo
     universal   um status PV/Vida/HP com máximo: abaixo da metade
     brutal      as Feridas vivem no Thriller da campanha, não na ficha:
                 sem sinal confiável — fica a troca manual
   Sanidade baixa, sozinha, nunca é Enlouquecendo; só Ordem tem o estado.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function UI() { return global.RAMAUI; }
  function F() { return global.RAMAFicha; }
  function IF() { return global.RAMAImagensFicha; }

  var LIMITE_BIBLIOTECA = 30;
  var POSICOES = ["normal", "machucado", "enlouquecendo"];
  var NOMES = { normal: "Normal", machucado: "Machucado", enlouquecendo: "Enlouquecendo" };

  /* A posição em teste (só tela). */
  var previa = null;
  var janelaAberta = null;

  /* =================================================================
     ESTADO DA FICHA
     ================================================================= */

  function abaixoDaMetade(atual, maximo) { return maximo > 0 && atual * 2 < maximo; }

  function statusDeVida(ficha) {
    var nomes = /^(pv|pvs|vida|pontos de vida|hp|hit points|saude|saúde)$/i;
    return (ficha.status || []).filter(function (s) { return nomes.test(String(s.nome || "").trim()) && U.inteiro(s.maximo, 0) > 0; })[0] || null;
  }

  /* { machucado: true|false|null, motivo, enlouquecendo: true|false|null }
     null em machucado = sem sinal confiável; null em enlouquecendo = o
     sistema não tem o estado (a posição nem aparece). */
  function estado(ficha) {
    var e = { machucado: null, motivo: "", enlouquecendo: null };
    if (!ficha) return e;
    try {
      switch (ficha.tipoFicha) {
        case "ordem": {
          var o = ficha.ordem, R = global.RAMAOrdemRegras;
          if (o && R && R.machucado) {
            e.machucado = !!R.machucado(o);
            var max = R.pontosDeVida ? R.pontosDeVida(o).total : 0;
            if (R.recursoAtual && max) e.motivo = "PV " + R.recursoAtual(o, "pv", max) + " de " + max + (e.machucado ? " (metade ou menos)" : "");
          }
          e.enlouquecendo = !!(o && o.condicoes && o.condicoes.enlouquecendo && o.condicoes.enlouquecendo.ativa);
          break;
        }
        case "ordem2": {
          var pv = ficha.ordem2 && ficha.ordem2.recursos && ficha.ordem2.recursos.pv;
          if (pv && U.inteiro(pv.max, 0) > 0) {
            e.machucado = abaixoDaMetade(U.inteiro(pv.atual, 0), U.inteiro(pv.max, 0));
            e.motivo = "PV " + U.inteiro(pv.atual, 0) + " de " + U.inteiro(pv.max, 0);
          }
          break;
        }
        case "oblivio": {
          var b = ficha.oblivio;
          if (b) {
            var ferida = (b.mazelas || []).some(function (m) { return m && m.chave === "ferida"; });
            var fora = !!(b.foraDeAcao && b.foraDeAcao.ativo);
            e.machucado = ferida || fora;
            e.motivo = ferida ? "mazela Ferida" : fora ? "Fora de Ação" : "sem Ferida";
          }
          break;
        }
        case "vampiro": {
          var V = global.RAMAVampiro;
          if (ficha.vampiro && V && V.calcular) {
            var c = V.calcular(ficha.vampiro);
            var deb = !!(c.vitalidade && c.vitalidade.debilitado);
            var torpor = !!(ficha.vampiro.estado && ficha.vampiro.estado.torpor);
            e.machucado = deb || torpor;
            e.motivo = torpor ? "em torpor" : deb ? "Vitalidade Debilitada" : "Vitalidade " + c.vitalidade.atual + " de " + c.vitalidade.max;
          }
          break;
        }
        case "goblins": {
          if (ficha.goblins) {
            var f = U.inteiro(ficha.goblins.ferimentos, 0);
            e.machucado = f > 0;
            e.motivo = f ? f + " ferimento(s)" : "sem ferimentos";
          }
          break;
        }
        case "tormenta20": {
          var T = global.RAMATormenta20;
          if (ficha.tormenta20 && T && T.calcular) {
            var t = T.calcular(ficha.tormenta20);
            if (t && t.pv && t.pv.max > 0) {
              e.machucado = abaixoDaMetade(t.pv.atual, t.pv.max);
              e.motivo = "PV " + t.pv.atual + " de " + t.pv.max;
            }
          }
          break;
        }
        case "brutal":
          e.motivo = "as Feridas ficam no Thriller da campanha";
          break;
        default: {
          var s = statusDeVida(ficha);
          if (s) {
            e.machucado = abaixoDaMetade(U.inteiro(s.atual, 0), U.inteiro(s.maximo, 0));
            e.motivo = s.nome + " " + U.inteiro(s.atual, 0) + " de " + U.inteiro(s.maximo, 0);
          } else {
            e.motivo = "nenhum status de PV ou Vida com máximo nesta ficha";
          }
        }
      }
    } catch (erro) {
      console.warn("[R.A.M.A. · retratos] estado da ficha", erro);
    }
    return e;
  }

  function temEnlouquecendo(ficha) { return !!ficha && ficha.tipoFicha === "ordem"; }
  function posicoesDe(ficha) { return temEnlouquecendo(ficha) ? POSICOES.slice() : ["normal", "machucado"]; }

  /* =================================================================
     CONJUNTOS
     ================================================================= */

  function conjuntoVazio(nome) {
    return { id: U.uuid(), nome: nome || "Principal", posicoes: { normal: "", machucado: "", enlouquecendo: "" } };
  }

  function ativoDe(ficha) {
    var r = ficha && ficha.retratos;
    if (!r || !r.conjuntos || !r.conjuntos.length) return null;
    return U.porId(r.conjuntos, r.ativo) || r.conjuntos[0];
  }

  /* A posição e a ref em uso agora. ref vazia: a foto de sempre. */
  function emUso(ficha) {
    var c = ativoDe(ficha);
    if (!c) return { posicao: "normal", ref: "", conjunto: null };
    var p = c.posicoes || {};
    var r = ficha.retratos;
    if (previa) return { posicao: previa, ref: p[previa] || "", conjunto: c, previa: true };
    if (r.modo === "fixo") {
      var fixo = posicoesDe(ficha).indexOf(r.fixo) >= 0 ? r.fixo : "normal";
      return { posicao: fixo, ref: p[fixo] || p.normal || "", conjunto: c, fixo: true };
    }
    var e = estado(ficha);
    var ordem = [];
    if (e.enlouquecendo && temEnlouquecendo(ficha)) ordem.push("enlouquecendo");
    if (e.machucado) ordem.push("machucado");
    ordem.push("normal");
    for (var i = 0; i < ordem.length; i++) if (p[ordem[i]]) return { posicao: ordem[i], ref: p[ordem[i]], conjunto: c };
    return { posicao: "normal", ref: "", conjunto: c };
  }

  /* Onde cada ref aparece: [{ conjunto, posicao }]. */
  function usosDe(ficha, ref) {
    var saida = [];
    ((ficha.retratos && ficha.retratos.conjuntos) || []).forEach(function (c) {
      POSICOES.forEach(function (k) { if (c.posicoes[k] === ref) saida.push({ conjunto: c, posicao: k }); });
    });
    return saida;
  }

  /* =================================================================
     A FOTO NA FICHA
     ================================================================= */

  /* O conteúdo da caixa da foto: o retrato em uso, ou a foto de sempre
     enquanto ele não chega (e se não houver retrato). */
  function preencher(ctx, caixa, opcoes) {
    var o = opcoes || {};
    var uso = emUso(ctx.ficha);
    var src = uso.ref ? IF().ja(ctx.personagemId, uso.ref) : "";
    caixa.dataset.retratoRef = uso.ref || "";
    caixa.dataset.retratoPosicao = uso.posicao;
    var alt = (o.alt || "Foto de " + ctx.ficha.nome) + (uso.ref && uso.posicao !== "normal" ? " (" + NOMES[uso.posicao].toLowerCase() + ")" : "");
    var mostrar = src || ctx.foto;
    U.trocar(caixa, [mostrar ? el("img", { src: mostrar, alt: alt }) : (o.vazio ? o.vazio() : null)].concat(o.extras || []));
    if (uso.ref && !src) {
      IF().obter(ctx.personagemId, [uso.ref]).then(function (achadas) {
        if (!achadas[uso.ref] || caixa.dataset.retratoRef !== uso.ref || !caixa.isConnected) return;
        var img = caixa.querySelector("img");
        if (img) img.src = achadas[uso.ref];
        else caixa.insertBefore(el("img", { src: achadas[uso.ref], alt: alt }), caixa.firstChild);
      });
    }
  }

  /* O estado mudou (dano, cura, condição, prévia): toda foto da página
     que mostra outro retrato troca de imagem — sem redesenhar a ficha. */
  var conferencia = null;
  function conferir(ctx) {
    clearTimeout(conferencia);
    conferencia = setTimeout(function () { conferirAgora(ctx); }, 120);
  }
  function conferirAgora(ctx) {
    if (!ctx || !ctx.ficha) return;
    var uso = emUso(ctx.ficha);
    U.$$("[data-retrato-ficha]").forEach(function (caixa) {
      if ((caixa.dataset.retratoRef || "") === (uso.ref || "") && caixa.dataset.retratoPosicao === uso.posicao) return;
      var img = caixa.querySelector("img");
      caixa.dataset.retratoRef = uso.ref || "";
      caixa.dataset.retratoPosicao = uso.posicao;
      function por(src) { if (!src) return; if (img) img.src = src; else caixa.insertBefore(img = el("img", { src: src, alt: "Foto de " + ctx.ficha.nome }), caixa.firstChild); }
      if (!uso.ref) { por(ctx.foto); return; }
      var ja = IF().ja(ctx.personagemId, uso.ref);
      if (ja) { por(ja); return; }
      IF().obter(ctx.personagemId, [uso.ref]).then(function (a) { if (caixa.dataset.retratoRef === uso.ref) por(a[uso.ref] || ctx.foto); });
    });
  }

  /* =================================================================
     A JANELA — Retratos do personagem
     ================================================================= */

  async function abrir(ctx) {
    if (!ctx.podeEditar() || janelaAberta) return;
    var st = {
      ctx: ctx,
      biblioteca: null,          /* [{ ref, nome, criadoEm }] */
      erro: null,
      painel: null,              /* null | "biblioteca" | { escolher: posicao } */
      ocupado: "",
      corpo: el("div.retratos"),
    };
    janelaAberta = UI().modal({
      titulo: "Retratos do personagem",
      conteudo: [st.corpo],
      largo: true,
      fundoFecha: true,
      classe: "r-modal--retratos",
      podeFechar: function () { return !st.ocupado; },
      aoFechar: function () { janelaAberta = null; previa = null; conferirAgora(ctx); },
    });
    st.modal = janelaAberta;
    U.trocar(st.corpo, [UI().carregando ? UI().carregando("Abrindo a biblioteca", { forma: "retratos", proporcao: "1 / 1", tamanho: "grande" }) : el("p", { texto: "Abrindo a biblioteca…" })]);

    var r = await global.RAMAApi.listarImagensPersonagem(ctx.personagemId, "retrato");
    if (!r.ok) {
      st.erro = r;
      U.trocar(st.corpo, [el("p.r-aviso", { role: "alert", texto: r.erro === "instalacao_incompleta"
        ? "A biblioteca de retratos precisa do Apps Script atualizado (v9.13) e de setupRama(). A foto da ficha continua como está."
        : "Não deu para abrir a biblioteca agora: " + global.RAMAApi.frase(r).titulo.toLowerCase() + ". Nada mudou." }),
        el("div.faixa", {}, [el("button.r-botao", { type: "button", texto: "Usar só a foto (como antes)", onclick: function () { janelaAberta.fechar(); trocarFotoSimples(ctx); } })])]);
      return;
    }
    st.biblioteca = (r.dados && r.dados.imagens) || [];

    /* Primeira vez: a foto que já existe vira o Normal de um conjunto
       inicial — sem pedir nada. Sem foto, um conjunto vazio. */
    if (!ctx.ficha.retratos) {
      var inicial = conjuntoVazio("Principal");
      if (ctx.foto) {
        var ref = IF().novaRef();
        var s = await global.RAMAApi.salvarImagemPersonagem(ctx.personagemId, { ref: ref, tipo: "retrato", nome: "Foto atual", imagem: ctx.foto });
        if (s.ok) {
          IF().guardar(ctx.personagemId, ref, ctx.foto);
          st.biblioteca.push(s.dados || { ref: ref, nome: "Foto atual" });
          inicial.posicoes.normal = ref;
        }
      }
      ctx.ficha.retratos = { v: 1, ativo: inicial.id, modo: "auto", fixo: "normal", conjuntos: [inicial] };
      ctx.alterou();
    }
    pintar(st);
  }

  /* Sem a biblioteca (servidor antigo): a troca de sempre. */
  async function trocarFotoSimples(ctx) {
    var r = await global.RAMAEditorImagem.escolher("retrato", {
      contexto: "envio da foto",
      aoUsar: function (img) { return global.RAMAApi.salvarFoto(ctx.personagemId, img.imagem); },
    });
    if (!r.ok) return;
    ctx.definirFoto(r.imagem);
    UI().avisoOk("Foto atualizada.");
  }

  function mudou(st) {
    st.ctx.alterou();
    conferirAgora(st.ctx);
    pintar(st);
  }

  function nomeDaImagem(st, ref) {
    var x = (st.biblioteca || []).filter(function (i) { return i.ref === ref; })[0];
    return x ? (x.nome || "Sem nome") : "Imagem";
  }

  function miniatura(st, ref, alt, classe) {
    var img = el("img", { alt: alt || "", src: ref ? IF().ja(st.ctx.personagemId, ref) : "" });
    var caixa = el("span.retrato-mini" + (classe ? "." + classe : ""), { dataset: { ref: ref || "" } }, ref ? [img] : [el("span.retrato-mini__vazio", { texto: "Sem imagem" })]);
    if (ref && !img.getAttribute("src")) {
      caixa.classList.add("retrato-mini--carregando");
      IF().obter(st.ctx.personagemId, [ref]).then(function (a) {
        caixa.classList.remove("retrato-mini--carregando");
        if (a[ref]) img.src = a[ref]; else caixa.classList.add("retrato-mini--falta");
      });
    }
    return caixa;
  }

  function pintar(st) {
    if (!janelaAberta) return;
    var ctx = st.ctx, ficha = ctx.ficha, r = ficha.retratos;
    var c = ativoDe(ficha);
    var e = estado(ficha);
    var uso = emUso(ficha);
    var posicoes = posicoesDe(ficha);

    /* ---- conjunto ---- */
    var seletor = el("select.r-selecao", { id: "retratos-conjunto", "aria-label": "Conjunto ativo",
      onchange: function (ev) { ativar(st, ev.target.value); } },
      r.conjuntos.map(function (x) { return el("option", { value: x.id, texto: x.nome, selected: x.id === c.id }); }));
    var linhaConjunto = el("div.retratos__conjunto", {}, [
      el("label.r-rotulo", { for: "retratos-conjunto", texto: "Conjunto ativo" }),
      el("div.faixa.retratos__conjunto-linha", {}, [
        seletor,
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Renomear", onclick: function () { renomearConjunto(st, c); } }),
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Duplicar", disabled: r.conjuntos.length >= F().MAX_CONJUNTOS_DE_RETRATO,
          onclick: function () { duplicarConjunto(st, c); } }),
        el("button.r-botao.r-botao--mini", { type: "button", texto: "+ Novo conjunto", disabled: r.conjuntos.length >= F().MAX_CONJUNTOS_DE_RETRATO,
          onclick: function () { novoConjunto(st); } }),
        r.conjuntos.length > 1 ? el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Excluir conjunto",
          onclick: function () { excluirConjunto(st, c); } }) : null,
      ]),
    ]);

    /* ---- modo ---- */
    function opcaoModo(valor, rotulo) {
      return el("button.r-botao.r-botao--mini" + (r.modo === valor ? ".r-botao--principal" : ""), {
        type: "button", texto: rotulo, "aria-pressed": r.modo === valor ? "true" : "false",
        onclick: function () { if (r.modo !== valor) { r.modo = valor; mudou(st); } },
      });
    }
    var linhaEstado = [];
    linhaEstado.push(e.machucado === null
      ? "Machucado: este sistema não informa ferimento pela ficha (" + e.motivo + "). Para mostrar o retrato de machucado, use Fixar retrato."
      : "Machucado: " + (e.machucado ? "sim" : "não") + (e.motivo ? " — " + e.motivo : "") + ".");
    if (temEnlouquecendo(ficha)) linhaEstado.push("Enlouquecendo: " + (e.enlouquecendo ? "sim" : "não") + " (a condição da ficha).");
    var linhaModo = el("div.retratos__modo", {}, [
      el("div.faixa", { role: "group", "aria-label": "Modo do retrato" }, [
        opcaoModo("auto", "Automático"),
        opcaoModo("fixo", "Fixar retrato"),
        r.modo === "fixo" ? el("select.r-selecao", { "aria-label": "Retrato fixo",
          onchange: function (ev) { r.fixo = ev.target.value; mudou(st); } },
          posicoes.map(function (k) { return el("option", { value: k, texto: NOMES[k], selected: r.fixo === k }); })) : null,
      ]),
      el("p.t-mini", { texto: r.modo === "auto"
        ? "O retrato acompanha o estado real da ficha e volta ao Normal quando a condição termina. Posição sem imagem é pulada."
        : "O retrato escolhido fica, qualquer que seja o estado, até voltar ao Automático." }),
      el("p.t-mini.retratos__estado", { texto: "Agora: " + linhaEstado.join(" ") }),
    ]);

    /* ---- prévia ---- */
    var blocoPrevia = previa ? el("div.retratos__previa", { role: "status" }, [
      miniatura(st, c.posicoes[previa], "Prévia: " + NOMES[previa], "retrato-mini--grande"),
      el("div.pilha--curta", { class: "pilha" }, [
        el("strong", { texto: "Prévia: " + c.nome + " · " + NOMES[previa] }),
        el("p.t-mini", { texto: "Só na tela: a vida, a sanidade e as condições da ficha não mudam. A foto da ficha mostra a prévia enquanto esta janela estiver aberta." }),
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Encerrar prévia", onclick: function () { previa = null; conferirAgora(ctx); pintar(st); } }),
      ]),
    ]) : null;

    /* ---- posições ---- */
    var grade = el("ul.retratos__posicoes", {}, posicoes.map(function (k) {
      var ref = c.posicoes[k];
      var emUsoAgora = !previa && uso.posicao === k && uso.ref === ref && !!ref;
      return el("li.retratos__posicao" + (emUsoAgora ? ".retratos__posicao--uso" : ""), {}, [
        el("button.retratos__testar", { type: "button", "aria-label": "Testar a prévia de " + NOMES[k], "aria-pressed": previa === k ? "true" : "false",
          onclick: function () { previa = previa === k ? null : k; conferirAgora(ctx); pintar(st); } }, [miniatura(st, ref, NOMES[k])]),
        el("div.retratos__posicao-cab", {}, [
          el("strong", { texto: NOMES[k] }),
          emUsoAgora ? el("span.r-etiqueta", { texto: "Em uso" }) : null,
        ]),
        ref ? el("p.t-mini.retratos__nome", { texto: nomeDaImagem(st, ref) }) : el("p.t-mini", { texto: k === "normal" ? "Sem imagem: a ficha mostra a foto de sempre." : "Sem imagem: esta posição é pulada." }),
        el("div.faixa.retratos__acoes", {}, [
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Escolher da biblioteca", disabled: !!st.ocupado,
            onclick: function () { st.painel = { escolher: k }; pintar(st); focarPainel(st); } }),
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Adicionar imagem", disabled: !!st.ocupado,
            onclick: function () { adicionarNaPosicao(st, k); } }),
          el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: previa === k ? "Encerrar prévia" : "Testar",
            onclick: function () { previa = previa === k ? null : k; conferirAgora(ctx); pintar(st); } }),
          ref ? el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Limpar posição",
            title: "Tira a imagem só desta posição; ela continua na biblioteca",
            onclick: function () { limparPosicao(st, k); } }) : null,
        ]),
      ]);
    }));

    /* ---- biblioteca ---- */
    var n = st.biblioteca.length;
    var abrirBiblioteca = el("div.faixa.faixa--entre.retratos__biblioteca-cab", {}, [
      el("span.r-rotulo", { texto: "Biblioteca do personagem · " + n + " de " + LIMITE_BIBLIOTECA }),
      el("div.faixa", {}, [
        el("button.r-botao.r-botao--mini", { type: "button", texto: st.painel === "biblioteca" ? "Fechar biblioteca" : "Ver biblioteca",
          onclick: function () { st.painel = st.painel === "biblioteca" ? null : "biblioteca"; pintar(st); if (st.painel) focarPainel(st); } }),
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Enviar imagens", disabled: !!st.ocupado || n >= LIMITE_BIBLIOTECA,
          title: "Envie uma ou várias; cada uma passa pelo recorte",
          onclick: function () { enviarVarias(st); } }),
      ]),
    ]);

    U.trocar(st.corpo, [
      st.ocupado ? el("p.r-aviso", { role: "status", texto: st.ocupado }) : null,
      linhaConjunto,
      linhaModo,
      blocoPrevia,
      grade,
      abrirBiblioteca,
      st.painel ? painelBiblioteca(st) : null,
    ]);
  }

  function focarPainel(st) {
    var p = st.corpo.querySelector(".retratos__biblioteca");
    if (p) { p.scrollIntoView({ block: "nearest" }); var b = p.querySelector("button"); if (b) b.focus({ preventScroll: true }); }
  }

  function painelBiblioteca(st) {
    var ctx = st.ctx;
    var escolher = st.painel && st.painel.escolher;
    var c = ativoDe(ctx.ficha);
    var titulo = escolher ? "Escolha a imagem para " + c.nome + " · " + NOMES[escolher] : "Todas as imagens do personagem";
    var lista = st.biblioteca;
    return el("section.retratos__biblioteca", { "aria-label": titulo }, [
      el("div.faixa.faixa--entre", {}, [
        el("strong", { texto: titulo }),
        escolher ? el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Cancelar", onclick: function () { st.painel = null; pintar(st); } }) : null,
      ]),
      lista.length ? el("ul.retratos__grade", {}, lista.map(function (img) {
        var usos = usosDe(ctx.ficha, img.ref);
        var textoUso = usos.length ? "Em uso: " + usos.map(function (u) { return u.conjunto.nome + " · " + NOMES[u.posicao]; }).join(", ") : "Sem uso";
        return el("li.retratos__item", {}, [
          escolher
            ? el("button.retratos__pegar", { type: "button", "aria-label": "Usar " + (img.nome || "esta imagem") + " em " + NOMES[escolher],
                onclick: function () { definirPosicao(st, escolher, img.ref); } }, [miniatura(st, img.ref, img.nome)])
            : el("button.retratos__pegar", { type: "button", "aria-label": "Ampliar " + (img.nome || "imagem"),
                onclick: function () { IF().obter(ctx.personagemId, [img.ref]).then(function (a) { IF().ampliar([{ src: a[img.ref], legenda: img.nome }], 0); }); } },
                [miniatura(st, img.ref, img.nome)]),
          el("p.retratos__item-nome", { texto: img.nome || "Sem nome" }),
          el("p.t-mini", { texto: textoUso }),
          escolher ? null : el("div.faixa.retratos__acoes", {}, [
            el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Renomear", onclick: function () { renomearImagem(st, img); } }),
            el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Excluir", onclick: function () { excluirImagem(st, img); } }),
          ]),
        ]);
      })) : el("p.t-mini", { texto: "A biblioteca está vazia. Use “Enviar imagens” ou “Adicionar imagem” numa posição." }),
    ]);
  }

  /* ---- ações dos conjuntos ---- */

  function ativar(st, id) {
    var r = st.ctx.ficha.retratos;
    if (r.ativo === id) return;
    r.ativo = id;
    previa = null;
    mudou(st);
    sincronizarFotoPrincipal(st);
  }

  async function renomearConjunto(st, c) {
    var nome = await UI().pedirTexto({ titulo: "Renomear conjunto", rotulo: "Nome do conjunto", valor: c.nome, limite: 60 });
    if (nome === null) return;
    c.nome = U.aparar(nome, 60) || c.nome;
    mudou(st);
  }

  async function novoConjunto(st) {
    var nome = await UI().pedirTexto({ titulo: "Novo conjunto", rotulo: "Nome do conjunto", valor: "", limite: 60 });
    if (nome === null) return;
    var novo = conjuntoVazio(U.aparar(nome, 60) || "Novo conjunto");
    st.ctx.ficha.retratos.conjuntos.push(novo);
    st.ctx.ficha.retratos.ativo = novo.id;
    previa = null;
    mudou(st);
  }

  /* Duplicar copia as REFERÊNCIAS: as imagens não se repetem no arquivo. */
  async function duplicarConjunto(st, c) {
    var nome = await UI().pedirTexto({ titulo: "Duplicar conjunto", rotulo: "Nome da cópia", valor: c.nome + " (cópia)", limite: 60 });
    if (nome === null) return;
    var novo = conjuntoVazio(U.aparar(nome, 60) || c.nome + " (cópia)");
    POSICOES.forEach(function (k) { novo.posicoes[k] = c.posicoes[k] || ""; });
    st.ctx.ficha.retratos.conjuntos.push(novo);
    st.ctx.ficha.retratos.ativo = novo.id;
    previa = null;
    mudou(st);
  }

  async function excluirConjunto(st, c) {
    var sim = await UI().confirmar({
      titulo: "Excluir o conjunto " + c.nome + "?",
      texto: "Só o conjunto sai. As imagens continuam na biblioteca do personagem.",
      rotuloConfirmar: "Excluir conjunto", perigo: true,
    });
    if (!sim) return;
    var r = st.ctx.ficha.retratos;
    r.conjuntos = r.conjuntos.filter(function (x) { return x.id !== c.id; });
    var trocouAtivo = r.ativo === c.id;
    if (trocouAtivo) r.ativo = r.conjuntos[0].id;
    previa = null;
    mudou(st);
    if (trocouAtivo) sincronizarFotoPrincipal(st);
  }

  function definirPosicao(st, posicao, ref) {
    var c = ativoDe(st.ctx.ficha);
    c.posicoes[posicao] = ref;
    st.painel = null;
    mudou(st);
    if (posicao === "normal") sincronizarFotoPrincipal(st);
    UI().avisoOk(c.nome + " · " + NOMES[posicao] + ": " + nomeDaImagem(st, ref) + ".");
  }

  function limparPosicao(st, posicao) {
    var c = ativoDe(st.ctx.ficha);
    c.posicoes[posicao] = "";
    if (previa === posicao) previa = null;
    mudou(st);
    UI().aviso("A posição " + NOMES[posicao] + " ficou vazia. A imagem continua na biblioteca.");
  }

  /* A foto das listas e da mesa acompanha o Normal do conjunto ativo. */
  async function sincronizarFotoPrincipal(st) {
    var ctx = st.ctx;
    var c = ativoDe(ctx.ficha);
    var ref = c && c.posicoes.normal;
    if (!ref) return;
    var a = await IF().obter(ctx.personagemId, [ref]);
    var img = a[ref];
    if (!img || img === ctx.foto) return;
    var r = await global.RAMAApi.salvarFoto(ctx.personagemId, img);
    if (!r.ok) { UI().avisoDeFalha(r, "A foto das listas não foi atualizada"); return; }
    ctx.definirFoto(img);
  }

  /* ---- biblioteca: enviar, renomear, excluir ---- */

  function cabe(st, quantas) {
    var livre = LIMITE_BIBLIOTECA - st.biblioteca.length;
    if (livre <= 0) {
      UI().avisoAtencao("A biblioteca chegou a " + LIMITE_BIBLIOTECA + " imagens, o máximo. Exclua alguma para enviar outra.");
      return 0;
    }
    if (quantas > livre) UI().avisoAtencao("Cabem mais " + livre + " imagem(ns) na biblioteca (máximo " + LIMITE_BIBLIOTECA + "). As outras ficam de fora.", { duracao: 9000 });
    return Math.min(livre, quantas);
  }

  /* Uma imagem pelo recorte de sempre; sobe com o editor aberto (uma
     falha mantém o enquadramento). Devolve a ref, ou "" se não subiu. */
  async function enviarUma(st, arquivo, nome, titulo) {
    var ref = IF().novaRef();
    var enviado = null;
    var opcoes = {
      contexto: "envio do retrato",
      titulo: titulo,
      aoUsar: async function (img) {
        var r = await global.RAMAApi.salvarImagemPersonagem(st.ctx.personagemId, { ref: ref, tipo: "retrato", nome: nome, imagem: img.imagem });
        if (r.ok) enviado = { img: img.imagem, dados: r.dados };
        return r;
      },
    };
    var r = arquivo
      ? await global.RAMAEditorImagem.abrirArquivo(arquivo, "retrato", opcoes)
      : await global.RAMAEditorImagem.escolher("retrato", opcoes);
    if (!r.ok || !enviado) return "";
    IF().guardar(st.ctx.personagemId, ref, enviado.img);
    st.biblioteca.push(enviado.dados || { ref: ref, nome: nome });
    return ref;
  }

  async function adicionarNaPosicao(st, posicao) {
    if (!cabe(st, 1)) return;
    var c = ativoDe(st.ctx.ficha);
    var ref = await enviarUma(st, null, c.nome + " · " + NOMES[posicao], "Retrato: " + c.nome + " · " + NOMES[posicao]);
    if (!janelaAberta) return;
    if (!ref) { pintar(st); return; }
    definirPosicao(st, posicao, ref);
  }

  function semExtensao(nome) { return U.aparar(String(nome || "").replace(/\.[a-z0-9]{2,5}$/i, ""), 80) || "Retrato"; }

  async function enviarVarias(st) {
    if (!cabe(st, 1)) return;
    var arquivos = await IF().escolherArquivos({ multiplo: true });
    if (!arquivos.length) return;
    var quantas = cabe(st, arquivos.length);
    arquivos = arquivos.slice(0, quantas);
    var enviadas = 0;
    for (var i = 0; i < arquivos.length; i++) {
      st.ocupado = "Enviando " + (i + 1) + " de " + arquivos.length + "…";
      pintar(st);
      var ref = await enviarUma(st, arquivos[i], semExtensao(arquivos[i].name), "Retrato " + (i + 1) + " de " + arquivos.length);
      if (ref) enviadas++;
      if (!janelaAberta) break;
    }
    st.ocupado = "";
    st.painel = "biblioteca";
    pintar(st);
    if (enviadas) UI().avisoOk(enviadas === 1 ? "Imagem guardada na biblioteca." : enviadas + " imagens guardadas na biblioteca.");
  }

  async function renomearImagem(st, img) {
    var nome = await UI().pedirTexto({ titulo: "Renomear imagem", rotulo: "Nome", valor: img.nome || "", limite: 80 });
    if (nome === null) return;
    nome = U.aparar(nome, 80);
    var r = await global.RAMAApi.salvarImagemPersonagem(st.ctx.personagemId, { ref: img.ref, tipo: "retrato", nome: nome });
    if (!r.ok) { UI().avisoDeFalha(r, "A imagem não foi renomeada"); return; }
    img.nome = nome;
    pintar(st);
  }

  /* Excluir da biblioteca é outra coisa que limpar uma posição: o
     arquivo some, e as posições que o usavam ficam vazias — avisado
     antes, com a lista. */
  async function excluirImagem(st, img) {
    var usos = usosDe(st.ctx.ficha, img.ref);
    var sim = await UI().confirmar({
      titulo: "Excluir “" + (img.nome || "imagem") + "” da biblioteca?",
      texto: usos.length
        ? "Ela está em uso e estas posições vão ficar vazias: " + usos.map(function (u) { return u.conjunto.nome + " · " + NOMES[u.posicao]; }).join(", ") + "."
        : "Ela não está em nenhum conjunto.",
      detalhe: "A imagem é apagada do arquivo e não pode ser recuperada.",
      rotuloConfirmar: "Excluir da biblioteca", perigo: true,
    });
    if (!sim) return;
    var r = await global.RAMAApi.excluirImagemPersonagem(st.ctx.personagemId, [img.ref]);
    if (!r.ok) { UI().avisoDeFalha(r, "A imagem não foi excluída"); return; }
    st.biblioteca = st.biblioteca.filter(function (i) { return i.ref !== img.ref; });
    usos.forEach(function (u) { u.conjunto.posicoes[u.posicao] = ""; });
    IF().esquecer(st.ctx.personagemId, img.ref);
    if (usos.length) mudou(st); else pintar(st);
  }

  global.RAMARetratos = {
    estado: estado,
    temEnlouquecendo: temEnlouquecendo,
    posicoesDe: posicoesDe,
    ativoDe: ativoDe,
    emUso: emUso,
    usosDe: usosDe,
    preencher: preencher,
    conferir: conferir,
    conferirAgora: conferirAgora,
    abrir: abrir,
    LIMITE_BIBLIOTECA: LIMITE_BIBLIOTECA,
    NOMES: NOMES,
    /* testes: a prévia sem a janela */
    _previa: function (p) { previa = p || null; },
  };
})(window);
