/* =====================================================================
   R.A.M.A. — interface
   ---------------------------------------------------------------------
   Avisos, janelas, confirmações, menus e o indicador de estado. Tudo o
   que uma tela precisa mostrar sem inventar desenho próprio.

   Nada aqui usa alert, confirm ou prompt. Não é preciosismo: as caixas
   do navegador travam a página inteira, não seguem a identidade do
   sistema, não dão para navegar direito pelo teclado e não permitem
   nomear o botão perigoso de forma diferente do botão seguro. Numa
   confirmação de exclusão isso é a diferença entre ler e clicar no
   automático.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el, $ = U.$;

  /* =================================================================
     AVISOS PASSAGEIROS
     ================================================================= */

  var caixaDeAvisos = null;

  function areaDeAvisos() {
    if (caixaDeAvisos && document.body.contains(caixaDeAvisos)) return caixaDeAvisos;
    caixaDeAvisos = el("div.r-avisos", { role: "status", "aria-live": "polite" });
    document.body.appendChild(caixaDeAvisos);
    return caixaDeAvisos;
  }

  /* aviso(texto, { tipo, duracao, acao: { rotulo, aoClicar } }) */
  function aviso(texto, opcoes) {
    var o = opcoes || {};
    var tipo = o.tipo || "info";

    var node = el("div.r-aviso", { class: tipo !== "info" ? "r-aviso--" + tipo : "" }, [
      el("div.r-aviso__texto", { texto: texto }),
      o.acao ? el("button.r-botao.r-botao--mini", {
        type: "button",
        texto: o.acao.rotulo,
        onclick: function () { fechar(); if (o.acao.aoClicar) o.acao.aoClicar(); },
      }) : null,
      el("button.r-icone", {
        type: "button",
        "aria-label": "Fechar aviso",
        onclick: fechar,
      }, [simbolo("x")]),
    ]);

    areaDeAvisos().appendChild(node);

    /* Aviso com botão fica mais tempo: quem precisa decidir precisa
       conseguir ler antes de o aviso sumir. */
    var timer = setTimeout(fechar, o.duracao || (o.acao ? 9000 : 4500));

    function fechar() {
      clearTimeout(timer);
      if (node.parentNode) node.parentNode.removeChild(node);
    }

    return fechar;
  }

  function avisoOk(texto, o) { return aviso(texto, Object.assign({ tipo: "ok" }, o || {})); }
  function avisoErro(texto, o) { return aviso(texto, Object.assign({ tipo: "erro", duracao: 7000 }, o || {})); }
  function avisoAtencao(texto, o) { return aviso(texto, Object.assign({ tipo: "atencao" }, o || {})); }

  /* Traduz uma resposta de erro da API num aviso legível. O detalhe
     técnico vai para o console, não para a cara da pessoa. */
  function avisoDeFalha(resposta, contexto) {
    var f = global.RAMAApi.frase(resposta);
    console.warn("[R.A.M.A.] " + (contexto || "operação") + " falhou:", resposta);
    return avisoErro(f.titulo + " — " + f.texto);
  }

  /* =================================================================
     JANELAS
     -----------------------------------------------------------------
     O foco entra na janela, circula dentro dela e volta para onde
     estava quando ela fecha. Sem isso, quem navega por teclado sai da
     janela e continua clicando no que está atrás dela.
     ================================================================= */

  var pilhaDeModais = [];

  function modal(opcoes) {
    var o = opcoes || {};
    var focoAnterior = document.activeElement;

    var corpo = el("div.r-modal__corpo");
    U.anexar(corpo, o.conteudo);

    var rodape = el("div.r-modal__rodape");
    (o.botoes || []).forEach(function (b) {
      rodape.appendChild(el("button.r-botao", {
        type: "button",
        class: b.classe || "",
        texto: b.rotulo,
        onclick: function () { if (b.aoClicar) b.aoClicar(fechar); else fechar(); },
      }));
    });

    var idTitulo = "modal-titulo-" + U.uuid().slice(0, 8);

    var janela = el("div.r-modal", {
      class: o.largo ? "r-modal--largo" : "",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": idTitulo,
    }, [
      el("div.r-modal__topo", {}, [
        el("h2.t-secao", { id: idTitulo, texto: o.titulo || "" }),
        o.semFechar ? null : el("button.r-icone", {
          type: "button",
          "aria-label": "Fechar",
          onclick: function () { fechar(); },
        }, [simbolo("x")]),
      ]),
      corpo,
      (o.botoes || []).length ? rodape : null,
    ]);

    var fundo = el("div.r-fundo", {
      onclick: function (ev) {
        /* clique fora fecha, mas só quando a janela não exige decisão */
        if (ev.target === fundo && !o.exigeDecisao) fechar();
      },
    }, [janela]);

    document.body.appendChild(fundo);
    pilhaDeModais.push({ fundo: fundo, fechar: fechar });
    travarRolagem();

    /* O primeiro campo do formulário costuma ser o que a pessoa quer;
       quando não há campo, o foco vai para a janela em si. */
    var primeiro = janela.querySelector("input, select, textarea, button.r-botao--principal") ||
                   janela.querySelector("button");
    if (primeiro) primeiro.focus();
    else { janela.tabIndex = -1; janela.focus(); }

    janela.addEventListener("keydown", prender);
    document.addEventListener("keydown", escapar);

    function prender(ev) {
      if (ev.key !== "Tab") return;
      var focaveis = U.$$(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        janela
      ).filter(function (n) { return n.offsetParent !== null; });
      if (!focaveis.length) return;
      var primeiroN = focaveis[0], ultimo = focaveis[focaveis.length - 1];
      if (ev.shiftKey && document.activeElement === primeiroN) { ev.preventDefault(); ultimo.focus(); }
      else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primeiroN.focus(); }
    }

    function escapar(ev) {
      if (ev.key !== "Escape") return;
      /* só a janela do topo responde ao Esc */
      if (pilhaDeModais[pilhaDeModais.length - 1] && pilhaDeModais[pilhaDeModais.length - 1].fundo !== fundo) return;
      if (o.exigeDecisao) return;
      ev.stopPropagation();
      fechar();
    }

    function fechar(resultado) {
      document.removeEventListener("keydown", escapar);
      if (fundo.parentNode) fundo.parentNode.removeChild(fundo);
      pilhaDeModais = pilhaDeModais.filter(function (m) { return m.fundo !== fundo; });
      if (!pilhaDeModais.length) soltarRolagem();
      if (focoAnterior && focoAnterior.focus) focoAnterior.focus();
      if (o.aoFechar) o.aoFechar(resultado);
    }

    return { fechar: fechar, janela: janela, corpo: corpo };
  }

  var rolagemGuardada = "";

  function travarRolagem() {
    if (pilhaDeModais.length > 1) return;
    rolagemGuardada = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  function soltarRolagem() { document.body.style.overflow = rolagemGuardada; }

  /* =================================================================
     CONFIRMAÇÃO
     -----------------------------------------------------------------
     O botão que apaga nunca se chama "OK": ele diz o que vai fazer.
     "EXCLUIR" e "CANCELAR" se distinguem lendo; "OK" e "Cancelar", não.
     ================================================================= */

  function confirmar(opcoes) {
    var o = opcoes || {};
    return new Promise(function (resolver) {
      var decidido = false;

      var m = modal({
        titulo: o.titulo || "Confirmar",
        exigeDecisao: !!o.exigeDecisao,
        conteudo: [
          el("p", { texto: o.texto || "" }),
          o.detalhe ? el("p.t-mini", { texto: o.detalhe }) : null,
        ],
        botoes: [
          {
            rotulo: o.rotuloCancelar || "Cancelar",
            classe: "r-botao--fantasma",
            aoClicar: function (fechar) { decidido = true; fechar(); resolver(false); },
          },
          {
            rotulo: o.rotuloConfirmar || "Confirmar",
            classe: o.perigo ? "r-botao--perigo" : "r-botao--principal",
            aoClicar: function (fechar) { decidido = true; fechar(); resolver(true); },
          },
        ],
        aoFechar: function () { if (!decidido) resolver(false); },
      });

      /* Numa exclusão o foco começa no botão seguro: quem apertar Enter
         sem ler cancela, não apaga. */
      if (o.perigo) {
        var cancelar = m.janela.querySelector(".r-modal__rodape .r-botao");
        if (cancelar) cancelar.focus();
      }
    });
  }

  /* Pergunta um texto curto sem usar prompt(). */
  function pedirTexto(opcoes) {
    var o = opcoes || {};
    return new Promise(function (resolver) {
      var decidido = false;
      var campo = el("input.r-entrada", {
        type: "text",
        value: o.valor || "",
        maxlength: o.limite || 120,
        id: "pedir-" + U.uuid().slice(0, 6),
      });

      var m = modal({
        titulo: o.titulo || "Informe",
        conteudo: el("div.r-campo", {}, [
          el("label", { for: campo.id, texto: o.rotulo || "Texto" }),
          campo,
          o.ajuda ? el("p.r-ajuda", { texto: o.ajuda }) : null,
        ]),
        botoes: [
          { rotulo: "Cancelar", classe: "r-botao--fantasma",
            aoClicar: function (f) { decidido = true; f(); resolver(null); } },
          { rotulo: o.rotuloConfirmar || "Confirmar", classe: "r-botao--principal",
            aoClicar: function (f) { decidido = true; f(); resolver(campo.value.trim()); } },
        ],
        aoFechar: function () { if (!decidido) resolver(null); },
      });

      campo.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") {
          ev.preventDefault();
          decidido = true;
          m.fechar();
          resolver(campo.value.trim());
        }
      });
      campo.focus();
      campo.select();
    });
  }

  /* =================================================================
     MENU DE CONTEXTO
     -----------------------------------------------------------------
     itens = [ { rotulo, aoClicar, perigo }, "separador" ]
     ================================================================= */

  var menuAberto = null;

  function menu(itens, opcoes) {
    var o = opcoes || {};

    var lista = el("ul.r-menu__lista", { role: "menu", hidden: true, class: o.esquerda ? "r-menu__lista--esquerda" : "" });

    itens.forEach(function (item) {
      if (item === "separador") {
        lista.appendChild(el("li.r-menu__separador", { role: "separator" }));
        return;
      }
      lista.appendChild(el("li", { role: "none" }, [
        el("button.r-menu__item", {
          type: "button",
          role: "menuitem",
          class: item.perigo ? "r-menu__item--perigo" : "",
          texto: item.rotulo,
          onclick: function (ev) {
            ev.stopPropagation();
            ev.preventDefault();
            fechar();
            if (item.aoClicar) item.aoClicar();
          },
        }),
      ]));
    });

    var gatilho = el("button.r-icone", {
      type: "button",
      "aria-haspopup": "menu",
      "aria-expanded": "false",
      "aria-label": o.rotulo || "Mais opções",
      onclick: function (ev) {
        ev.stopPropagation();
        ev.preventDefault();
        lista.hidden ? abrir() : fechar();
      },
    }, [simbolo(o.icone || "mais")]);

    var raiz = el("div.r-menu", {}, [gatilho, lista]);

    function abrir() {
      if (menuAberto) menuAberto();
      lista.hidden = false;
      gatilho.setAttribute("aria-expanded", "true");
      menuAberto = fechar;
      setTimeout(function () {
        document.addEventListener("click", foraDaqui);
        document.addEventListener("keydown", teclado);
      }, 0);
      var primeiro = lista.querySelector(".r-menu__item");
      if (primeiro) primeiro.focus();
    }

    function fechar() {
      lista.hidden = true;
      gatilho.setAttribute("aria-expanded", "false");
      document.removeEventListener("click", foraDaqui);
      document.removeEventListener("keydown", teclado);
      if (menuAberto === fechar) menuAberto = null;
    }

    function foraDaqui(ev) { if (!raiz.contains(ev.target)) fechar(); }

    function teclado(ev) {
      if (ev.key === "Escape") { fechar(); gatilho.focus(); return; }
      if (ev.key !== "ArrowDown" && ev.key !== "ArrowUp") return;
      ev.preventDefault();
      var opcoesFoco = U.$$(".r-menu__item", lista);
      var i = opcoesFoco.indexOf(document.activeElement);
      var proximo = ev.key === "ArrowDown" ? i + 1 : i - 1;
      if (proximo < 0) proximo = opcoesFoco.length - 1;
      if (proximo >= opcoesFoco.length) proximo = 0;
      if (opcoesFoco[proximo]) opcoesFoco[proximo].focus();
    }

    return raiz;
  }

  /* =================================================================
     INDICADOR DE ESTADO
     -----------------------------------------------------------------
     O texto acompanha sempre — cor sozinha não é informação. E o
     anúncio para leitor de tela só sai quando o estado MUDA: sem isso
     ele leria "salvo há 9 s", "salvo há 10 s" sem parar.
     ================================================================= */

  var TEXTOS = {
    carregando: "Carregando",
    salvo: "Salvo",
    pendente: "Alterações pendentes",
    salvando: "Salvando…",
    offline: "Sem conexão",
    erro: "Erro ao salvar",
    conflito: "Conflito",
    expirado: "Sessão expirada",
  };

  var DETALHES = {
    carregando: "Buscando o registro no arquivo.",
    salvo: "Tudo o que está aqui já foi gravado.",
    pendente: "Ainda não subiram para o arquivo.",
    salvando: "Enviando as alterações.",
    offline: "As alterações ficam neste aparelho e sobem quando a conexão voltar.",
    erro: "O servidor recusou a gravação. O que você fez continua aqui.",
    conflito: "Este registro mudou em outro aparelho. Clique para resolver.",
    expirado: "Entre novamente para voltar a salvar.",
  };

  function indicador(alvo) {
    var elemento = alvo || null;
    var estado = "carregando";
    var salvoEm = 0;

    function texto() {
      if (estado === "salvo" && salvoEm) {
        var q = U.haQuanto(salvoEm);
        return q === "agora" ? "Salvo agora" : "Salvo " + q;
      }
      return TEXTOS[estado] || estado;
    }

    function pintar() {
      if (!elemento) return;
      elemento.textContent = texto();
      elemento.dataset.estado = estado;
      elemento.title = DETALHES[estado] || "";
    }

    function definir(novo) {
      var mudou = novo !== estado;
      estado = novo;
      if (elemento) {
        if (mudou) elemento.setAttribute("aria-live", "polite");
        else elemento.removeAttribute("aria-live");
      }
      pintar();
    }

    function salvoAgora() { salvoEm = Date.now(); definir("salvo"); }

    var timer = setInterval(function () {
      if (estado === "salvo" && salvoEm) {
        if (elemento) elemento.removeAttribute("aria-live");
        pintar();
      }
    }, 10000);

    pintar();

    return {
      definir: definir,
      salvoAgora: salvoAgora,
      estado: function () { return estado; },
      parar: function () { clearInterval(timer); },

      /* A tela que redesenha cria um elemento novo a cada volta. Quem
         guarda este objeto — o salvador — não pode ser recriado junto,
         ou perderia a fila e a revisão. Então o objeto continua o
         mesmo e só troca de alvo. */
      apontar: function (novo) {
        elemento = novo || null;
        pintar();
        return this;
      },
      elemento: function () { return elemento; },
    };
  }

  /* =================================================================
     ESTADOS DE TELA
     ================================================================= */

  function carregando(mensagem) {
    return el("div.r-carregando", { role: "status" }, [
      el("p.r-carregando__rotulo", { texto: mensagem || "Consultando arquivo" }),
      el("div.r-barra", { "aria-hidden": "true" }, [el("div.r-barra__preenche")]),
    ]);
  }

  /* vazio({ titulo, texto, acao: { rotulo, aoClicar } }) */
  function vazio(opcoes) {
    var o = opcoes || {};
    return el("div.r-vazio", {}, [
      el("div.r-vazio__marca", {}, [marca(40)]),
      el("p.r-vazio__titulo", { texto: o.titulo || "Nada arquivado" }),
      o.texto ? el("p.r-vazio__texto", { texto: o.texto }) : null,
      o.acao ? el("button.r-botao.r-botao--principal", {
        type: "button", texto: o.acao.rotulo, onclick: o.acao.aoClicar,
      }) : null,
    ]);
  }

  function erroDeTela(resposta, aoTentarNovamente) {
    var f = global.RAMAApi.frase(resposta);
    return el("div.r-vazio", {}, [
      el("p.r-vazio__titulo.t-erro", { texto: f.titulo }),
      el("p.r-vazio__texto", { texto: f.texto }),
      aoTentarNovamente ? el("button.r-botao", {
        type: "button", texto: "Tentar novamente", onclick: aoTentarNovamente,
      }) : null,
    ]);
  }

  /* =================================================================
     DESENHOS
     -----------------------------------------------------------------
     A marca do R.A.M.A. é uma ramificação: uma linha que sobe e se
     divide em nós. Nasce do nome do evento que originou as realidades
     das campanhas, e essa é toda a lore que a interface entrega — quem
     não sabe vê um diagrama de arquivo.
     ================================================================= */

  function marca(tamanho) {
    var s = tamanho || 28;
    var svg = U.svg;
    return svg("svg", {
      viewBox: "0 0 32 32", width: s, height: s,
      fill: "none", stroke: "currentColor", "stroke-width": "2",
      "stroke-linecap": "square", "aria-hidden": "true", focusable: "false",
    }, [
      /* o tronco */
      svg("path", { d: "M16 30 L16 18" }),
      /* a primeira bifurcação */
      svg("path", { d: "M16 18 L6 10" }),
      svg("path", { d: "M16 18 L26 10" }),
      /* a segunda, só de um lado — a ramificação não é simétrica */
      svg("path", { d: "M26 10 L26 4" }),
      /* os nós */
      svg("rect", { x: "13", y: "27", width: "6", height: "3", fill: "currentColor", stroke: "none" }),
      svg("rect", { x: "3", y: "7", width: "6", height: "6", fill: "none" }),
      svg("rect", { x: "23", y: "7", width: "6", height: "6", fill: "currentColor", stroke: "none" }),
      svg("rect", { x: "24", y: "2", width: "4", height: "4", fill: "none" }),
    ]);
  }

  var CAMINHOS = {
    x: "M4 4 L12 12 M12 4 L4 12",
    mais: "M8 3 L8 13 M3 8 L13 8",
    tresPontos: "M4 8 h0.01 M8 8 h0.01 M12 8 h0.01",
    menu: "M2 4 h12 M2 8 h12 M2 12 h12",
    busca: "M7 2 a5 5 0 1 0 0.01 0 M11 11 L14 14",
    voltar: "M10 3 L5 8 L10 13",
    olho: "M1 8 s3-4 7-4 7 4 7 4 -3 4-7 4-7-4-7-4z M8 6 a2 2 0 1 0 0.01 0",
    olhoFechado: "M2 2 L14 14 M1 8 s3-4 7-4c1 0 2 .2 3 .5 M13 6.5 c1 .8 2 1.5 2 1.5 s-3 4-7 4c-1 0-2-.2-3-.5",
    dado: "M2 2 h12 v12 h-12z M5 5 h0.01 M11 5 h0.01 M8 8 h0.01 M5 11 h0.01 M11 11 h0.01",
    lixeira: "M3 4 h10 M6 4 V2 h4 v2 M5 4 l0.5 10 h5 L11 4",
    baixar: "M8 2 V11 M4 8 L8 12 L12 8 M3 14 h10",
    salvar: "M3 3 h10 v10 h-10z M6 3 v4 h4 V3 M5 13 v-4 h6 v4",
  };

  function simbolo(nome, tamanho) {
    var d = CAMINHOS[nome] || CAMINHOS.mais;
    var s = tamanho || 16;
    return U.svg("svg", {
      viewBox: "0 0 16 16", width: s, height: s,
      fill: "none", stroke: "currentColor", "stroke-width": "1.5",
      "stroke-linecap": "square", "aria-hidden": "true", focusable: "false",
    }, [U.svg("path", { d: d })]);
  }

  /* =================================================================
     CONTROLE DE NÚMERO
     -----------------------------------------------------------------
     passo({ valor, minimo, maximo, aoMudar, rotulo })
     Botão para mais e para menos, e o campo aceita digitação direta —
     tirar 7 de PV de uma vez não deve custar sete cliques.
     ================================================================= */

  function passo(opcoes) {
    var o = opcoes || {};
    var minimo = o.minimo === undefined ? -9999 : o.minimo;
    var maximo = o.maximo === undefined ? 999999 : o.maximo;
    var valor = U.limitar(U.inteiro(o.valor, 0), minimo, maximo);

    var campo = el("input.r-passo__valor", {
      type: "text",
      inputmode: "numeric",
      value: String(valor),
      "aria-label": o.rotulo || "Valor",
    });

    function aplicar(novo, avisar) {
      var v = U.limitar(U.inteiro(novo, valor), minimo, maximo);
      valor = v;
      campo.value = String(v);
      atualizarBotoes();
      if (avisar !== false && o.aoMudar) o.aoMudar(v);
    }

    var menos = el("button.r-passo__botao", {
      type: "button", texto: "−", "aria-label": "Diminuir " + (o.rotulo || ""),
      onclick: function () { aplicar(valor - 1); },
    });

    var mais = el("button.r-passo__botao", {
      type: "button", texto: "+", "aria-label": "Aumentar " + (o.rotulo || ""),
      onclick: function () { aplicar(valor + 1); },
    });

    function atualizarBotoes() {
      menos.disabled = valor <= minimo;
      mais.disabled = valor >= maximo;
    }

    /* Só confirma ao sair do campo ou no Enter: aplicar a cada tecla
       transformaria "12" em 1 e depois 12, disparando duas gravações. */
    campo.addEventListener("blur", function () { aplicar(campo.value); });
    campo.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") { ev.preventDefault(); aplicar(campo.value); campo.blur(); }
      if (ev.key === "ArrowUp") { ev.preventDefault(); aplicar(valor + 1); }
      if (ev.key === "ArrowDown") { ev.preventDefault(); aplicar(valor - 1); }
    });

    atualizarBotoes();

    var raiz = el("div.r-passo", {}, [menos, campo, mais]);
    raiz.definir = function (v) { aplicar(v, false); };
    raiz.valor = function () { return valor; };
    return raiz;
  }

  /* =================================================================
     CAMPO ROTULADO
     ================================================================= */

  /* campo({ rotulo, valor, tipo, aoMudar, ajuda, ... }) → .r-campo */
  function campo(opcoes) {
    var o = opcoes || {};
    var idCampo = o.id || ("c-" + U.uuid().slice(0, 8));

    var entrada;
    if (o.tipo === "area") {
      entrada = el("textarea.r-area", { id: idCampo, rows: o.linhas || 4, maxlength: o.limite || 20000 });
      entrada.value = U.texto(o.valor);
    } else if (o.tipo === "selecao") {
      entrada = el("select.r-selecao", { id: idCampo });
      (o.opcoes || []).forEach(function (op) {
        entrada.appendChild(el("option", { value: op.valor, texto: op.rotulo, selected: String(op.valor) === String(o.valor) }));
      });
    } else {
      entrada = el("input.r-entrada", {
        id: idCampo,
        type: o.tipo === "numero" ? "text" : (o.tipo || "text"),
        inputmode: o.tipo === "numero" ? "numeric" : null,
        class: o.tipo === "numero" ? "r-entrada--numero" : "",
        maxlength: o.limite || 200,
        placeholder: o.dica || null,
        autocomplete: o.autocomplete || null,
      });
      entrada.value = U.texto(o.valor);
    }

    if (o.desabilitado) entrada.disabled = true;

    var ajuda = el("p.r-ajuda", { texto: o.ajuda || "", hidden: !o.ajuda });

    if (o.aoMudar) {
      var evento = o.aoDigitar ? "input" : "change";
      entrada.addEventListener(evento, function () { o.aoMudar(entrada.value, entrada); });
    }

    var raiz = el("div.r-campo", {}, [
      el("label", { for: idCampo, texto: o.rotulo || "" }),
      entrada,
      ajuda,
    ]);

    raiz.entrada = entrada;
    raiz.marcarErro = function (mensagem) {
      entrada.classList.toggle("r-entrada--erro", !!mensagem);
      entrada.classList.toggle("r-area--erro", !!mensagem && o.tipo === "area");
      entrada.setAttribute("aria-invalid", mensagem ? "true" : "false");
      ajuda.textContent = mensagem || o.ajuda || "";
      ajuda.classList.toggle("r-ajuda--erro", !!mensagem);
      ajuda.hidden = !mensagem && !o.ajuda;
    };
    return raiz;
  }

  /* =================================================================
     RECOLHÍVEL
     -----------------------------------------------------------------
     Por padrão só o nome aparece; o resto abre no clique. Um inventário
     de vinte itens mostrando tudo o tempo todo vira uma parede em que
     ninguém acha nada.

     É montado com <details>/<summary> de propósito. O navegador já dá
     de graça o que teríamos de reconstruir à mão e provavelmente errar:
     foco por teclado, Enter e Espaço para abrir, estado exposto para
     leitor de tela e busca do navegador encontrando texto fechado. O
     aria-expanded vai junto porque nem todo leitor de tela antigo lê o
     estado nativo do <details>.

     recolhivel({ titulo, extra, conteudo, aberto, acoes })
     ================================================================= */

  function recolhivel(opcoes) {
    var o = opcoes || {};

    var seta = el("span.recolhivel__seta", { "aria-hidden": "true" });

    var resumo = el("summary.recolhivel__topo", {}, [
      seta,
      el("span.recolhivel__titulo", { texto: o.titulo || "" }),
      o.extra ? el("span.recolhivel__extra", { texto: o.extra }) : null,
    ]);

    var caixa = el("details.recolhivel", { open: !!o.aberto, class: o.classe || "" }, [
      resumo,
      el("div.recolhivel__corpo", {}, o.conteudo),
    ]);

    /* As ações ficam FORA do <summary>: um botão dentro dele seria
       ativado junto com a abertura, e "Excluir" não pode disparar
       porque alguém quis só olhar o item. */
    if (o.acoes) resumo.appendChild(el("span.recolhivel__acoes", {
      onclick: function (ev) { ev.preventDefault(); ev.stopPropagation(); },
    }, o.acoes));

    resumo.setAttribute("aria-expanded", String(!!o.aberto));
    caixa.addEventListener("toggle", function () {
      resumo.setAttribute("aria-expanded", String(caixa.open));
      if (o.aoAlternar) o.aoAlternar(caixa.open);
    });

    if (!o.faixa) return caixa;

    /* A FAIXA QUE NÃO SE RECOLHE
       -----------------------------------------------------------------
       Alguma coisa precisa continuar à vista com o cartão fechado: os
       botões de Ataque e Dano de uma arma, as versões de dano de um
       ritual. São as ações mais repetidas de uma sessão, e abrir o
       cartão para alcançá-las é um clique a mais em toda rolagem.

       Ela fica FORA do <details>, e não pendurada dentro dele. É a
       parte que não é óbvia: um <details> fechado esconde TUDO o que
       não é o <summary>, inclusive o que for acrescentado depois. Uma
       faixa dentro dele existe, ocupa espaço no cálculo de quem
       pergunta, e não é pintada — que é o pior dos mundos, porque
       parece funcionar em código e some na tela.

       Então o recolhível vira o miolo de uma caixa, e a caixa é que
       carrega a borda. Visualmente é o mesmo cartão. */
    return el("div.recolhivel-faixa", { class: o.classe || "" }, [caixa, o.faixa]);
  }

  /* =================================================================
     SELETOR DE COR
     -----------------------------------------------------------------
     Uma paleta fechada, mais um campo hexadecimal validado. A cor
     escolhida NUNCA vira CSS por concatenação de texto: ela passa por
     RAMAHabilidades.corValida() e só depois é aplicada por
     style.setProperty, que trata o valor como valor e não como
     declaração.
     ================================================================= */

  function seletorDeCor(opcoes) {
    var o = opcoes || {};
    var H = global.RAMAHabilidades;
    var atual = H.corValida(o.valor);

    var amostras = el("div.cores");

    function pintar() {
      U.trocar(amostras, H.CORES.map(function (c) {
        var escolhida = H.corValida(c.valor) === atual;
        var botao = el("button.cor", {
          type: "button",
          "aria-label": c.nome,
          "aria-pressed": String(escolhida),
          title: c.nome,
          class: c.valor ? "" : "cor--nenhuma",
          onclick: function () { atual = H.corValida(c.valor); pintar(); if (o.aoMudar) o.aoMudar(atual); },
        });
        if (c.valor) botao.style.setProperty("--cor-escolhida", c.valor);
        return botao;
      }));
    }

    pintar();

    var manual = campo({
      rotulo: "Cor personalizada", valor: atual, limite: 7,
      ajuda: "Hexadecimal, como #A33B3B. Em branco, sem cor.",
      aoMudar: function (v, entrada) {
        var limpa = H.corValida(v);
        if (v && !limpa) {
          entrada.value = atual;
          avisoErro("Use um hexadecimal como #A33B3B.");
          return;
        }
        atual = limpa;
        entrada.value = limpa;
        pintar();
        if (o.aoMudar) o.aoMudar(atual);
      },
    });

    return el("div.r-campo", {}, [
      el("span.r-rotulo", { texto: o.rotulo || "Cor" }),
      amostras,
      manual,
    ]);
  }

  /* =================================================================
     PAINEL
     ================================================================= */

  function painel(titulo, conteudo, opcoes) {
    var o = opcoes || {};
    return el("section.r-painel", { class: o.classe || "" }, [
      titulo ? el("h2.r-painel__titulo", { texto: titulo }) : null,
      o.acoes ? el("div.r-painel__acoes", {}, o.acoes) : null,
      conteudo,
    ]);
  }

  global.RAMAUI = {
    aviso: aviso,
    avisoOk: avisoOk,
    avisoErro: avisoErro,
    avisoAtencao: avisoAtencao,
    avisoDeFalha: avisoDeFalha,
    modal: modal,
    confirmar: confirmar,
    pedirTexto: pedirTexto,
    menu: menu,
    indicador: indicador,
    carregando: carregando,
    vazio: vazio,
    erroDeTela: erroDeTela,
    marca: marca,
    simbolo: simbolo,
    passo: passo,
    campo: campo,
    painel: painel,
    recolhivel: recolhivel,
    seletorDeCor: seletorDeCor,
  };
})(window);
