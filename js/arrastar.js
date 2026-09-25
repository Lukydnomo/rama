/* =====================================================================
   R.A.M.A. — arrastar e soltar
   =====================================================================
   UMA implementação para habilidades, rituais, inventário, perícias e
   anotações. Cada aba diz o que pode ir para onde e o que fazer quando
   alguém soltar; o gesto, a prévia, o indicador de destino, a rolagem
   perto da borda, o cancelamento e o teclado são daqui.

   ---------------------------------------------------------------------
   COMO UMA ABA USA
   ---------------------------------------------------------------------

     alca({ id, rotulo })     o botão de segurar — a ÚNICA parte que
                              começa um arraste. Com ele, o resto do
                              cartão continua sendo cartão: clicar abre,
                              tocar rola a página.
     ligar(raiz, opcoes)      liga o arraste dentro de `raiz`:
       podeSoltar(item, destino) → { ok, motivo }
       aoSoltar(item, destino)          muda o modelo e redesenha
       aoTeclado(item, direcao)         ↑/↓ na alça: um passo

     Marcações no HTML que a aba desenha:
       data-arrastar-item="id"      o que se arrasta (o cartão inteiro)
       data-arrastar-tipo="…"       opcional: "no", "regra", "nota"…
       data-arrastar-lista="chave"  onde itens moram (a lista, a pasta)
       data-arrastar-pasta="chave"  opcional: soltar AQUI põe dentro da
                                    lista `chave` (o cabeçalho da pasta)

     destino = { lista, indice, dentro }
       lista   a chave de data-arrastar-lista
       indice  a posição entre os itens daquela lista, SEM o arrastado
       dentro  true quando o gesto terminou num cabeçalho de pasta

   ---------------------------------------------------------------------
   O QUE O GESTO NUNCA FAZ
   ---------------------------------------------------------------------

     · abrir o cartão, rolar dado ou clicar em botão: a alça fica fora de
       qualquer outro controle, e o clique que o navegador dispararia no
       fim do arraste é engolido;
     · gravar no meio: durante o arraste só a prévia muda. O modelo muda
       uma vez, ao soltar — e é a aba que chama `ctx.alterou()`, pelo
       mesmo salvador de sempre;
     · aceitar para desfazer depois: um destino recusado aparece como
       recusado ENQUANTO se arrasta, com o motivo, e soltar ali não faz
       nada.

   Esc, o cancelamento do sistema (pointercancel), perder o foco da
   janela ou soltar fora de uma lista cancelam sem mudar nada.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;

  var LIMIAR_MOUSE = 4;
  var LIMIAR_TOQUE = 6;
  var BORDA_DE_ROLAGEM = 56;
  var ROLAGEM_MAXIMA = 18;

  /* Um aviso só para leitor de tela, reaproveitado. */
  var falador = null;
  function anunciar(texto) {
    if (!global.document || !document.body) return;
    if (!falador || !falador.isConnected) {
      falador = el("div.so-leitor", { role: "status", "aria-live": "polite" });
      document.body.appendChild(falador);
    }
    falador.textContent = "";
    setTimeout(function () { falador.textContent = texto; }, 30);
  }

  /* =================================================================
     A ALÇA
     ================================================================= */

  function alca(opcoes) {
    var o = opcoes || {};
    var botao = el("button.arrastar-alca", {
      type: "button",
      "aria-label": "Mover " + (o.rotulo || "item") + ". Arraste, ou use as setas para cima e para baixo.",
      title: o.desligada ? o.motivo || "" : "Arraste para mover · ↑ ↓ no teclado",
      "aria-disabled": o.desligada ? "true" : null,
      dataset: { arrastarAlca: o.id || "", foco: "arrastar-" + (o.id || "") },
    }, [global.RAMAUI ? global.RAMAUI.simbolo("alca", 14) : el("span", { texto: "⠿" })]);
    return botao;
  }

  /* =================================================================
     O ESTADO DE UM ARRASTE
     ================================================================= */

  var ativo = null;

  function itensDaLista(lista) {
    return Array.prototype.slice.call(lista.querySelectorAll("[data-arrastar-item]")).filter(function (it) {
      return it.parentElement && it.parentElement.closest("[data-arrastar-lista]") === lista;
    });
  }

  function listaDoItem(item) {
    return item && item.parentElement ? item.parentElement.closest("[data-arrastar-lista]") : null;
  }

  /* O destino debaixo do ponteiro, sem contar o próprio item arrastado
     nem o que está dentro dele (uma pasta não se solta nela mesma). */
  function destinoEm(x, y) {
    var a = ativo;
    var sob = document.elementFromPoint(x, y);
    if (!sob || !a.raiz.contains(sob)) return null;
    if (a.item.contains(sob)) {
      /* Sobre o cabeçalho de uma pasta que está DENTRO do arrastado: é um
         destino de verdade — e recusado, com o motivo (uma pasta não
         entra num descendente seu). A aba decide em podeSoltar. */
      var cabecaInterna = sob.closest("[data-arrastar-pasta]");
      if (cabecaInterna && cabecaInterna.closest("[data-arrastar-item]") !== a.item) {
        return { lista: cabecaInterna.dataset.arrastarPasta, indice: 0, dentro: true, ancora: cabecaInterna, lado: "dentro" };
      }
      /* Em cima dele mesmo: fica onde está. */
      var propria = listaDoItem(a.item);
      if (!propria) return null;
      return { lista: propria.dataset.arrastarLista, indice: itensDaLista(propria).indexOf(a.item), dentro: false,
        ancora: a.item, lado: "sobre", elementoLista: propria };
    }

    var cabeca = sob.closest("[data-arrastar-pasta]");
    if (cabeca && a.raiz.contains(cabeca) && !a.item.contains(cabeca)) {
      var caixa = cabeca.getBoundingClientRect();
      var meio = y > caixa.top + caixa.height * 0.25 && y < caixa.bottom - caixa.height * 0.25;
      if (meio) {
        var chave = cabeca.dataset.arrastarPasta;
        var listaDentro = a.raiz.querySelector('[data-arrastar-lista="' + cssEscapar(chave) + '"]');
        var n = listaDentro ? itensDaLista(listaDentro).filter(function (i) { return i !== a.item; }).length : 0;
        return { lista: chave, indice: n, dentro: true, ancora: cabeca, lado: "dentro" };
      }
    }

    var item = sob.closest("[data-arrastar-item]");
    while (item && (item === a.item || a.item.contains(item))) item = item.parentElement ? item.parentElement.closest("[data-arrastar-item]") : null;
    if (item && a.raiz.contains(item)) {
      var lista = listaDoItem(item);
      if (!lista) return null;
      var r = item.getBoundingClientRect();
      var depois = y > r.top + r.height / 2;
      var semArrastado = itensDaLista(lista).filter(function (i) { return i !== a.item; });
      var i = semArrastado.indexOf(item);
      return { lista: lista.dataset.arrastarLista, indice: i + (depois ? 1 : 0), dentro: false,
        ancora: item, lado: depois ? "depois" : "antes", elementoLista: lista };
    }

    var vazia = sob.closest("[data-arrastar-lista]");
    if (vazia && a.raiz.contains(vazia) && !a.item.contains(vazia)) {
      var resto = itensDaLista(vazia).filter(function (i) { return i !== a.item; });
      return { lista: vazia.dataset.arrastarLista, indice: resto.length, dentro: false,
        ancora: resto.length ? resto[resto.length - 1] : vazia, lado: resto.length ? "depois" : "vazia", elementoLista: vazia };
    }
    return null;
  }

  function cssEscapar(s) {
    return global.CSS && global.CSS.escape ? global.CSS.escape(s) : String(s).replace(/["\\]/g, "\\$&");
  }

  /* =================================================================
     A PRÉVIA: o fantasma, a linha de destino e o recusado
     ================================================================= */

  function desenharIndicador(destino, aceito, motivo) {
    var a = ativo;
    if (!a.linha) {
      a.linha = el("div.arrastar-linha", { "aria-hidden": "true" });
      document.body.appendChild(a.linha);
    }
    if (a.alvoDentro) { a.alvoDentro.classList.remove("arrastar-alvo-dentro", "arrastar-alvo-recusado"); a.alvoDentro = null; }
    a.fantasma.classList.toggle("arrastar-fantasma--recusado", !aceito);
    a.fantasmaMotivo.textContent = aceito ? "" : (motivo || "Não dá para soltar aqui.");

    if (!destino || destino.lado === "sobre") { a.linha.hidden = true; return; }
    if (destino.lado === "dentro") {
      a.linha.hidden = true;
      a.alvoDentro = destino.ancora;
      a.alvoDentro.classList.add(aceito ? "arrastar-alvo-dentro" : "arrastar-alvo-recusado");
      return;
    }
    var r = destino.ancora.getBoundingClientRect();
    var y = destino.lado === "antes" ? r.top : (destino.lado === "vazia" ? r.top + 8 : r.bottom);
    a.linha.hidden = false;
    a.linha.classList.toggle("arrastar-linha--recusada", !aceito);
    a.linha.style.setProperty("top", Math.round(y - 1) + "px");
    a.linha.style.setProperty("left", Math.round(r.left) + "px");
    a.linha.style.setProperty("width", Math.round(r.width) + "px");
  }

  function moverFantasma(x, y) {
    var f = ativo.fantasma;
    f.style.setProperty("transform", "translate(" + Math.round(x + 12) + "px, " + Math.round(y + 12) + "px)");
  }

  /* =================================================================
     ROLAGEM PERTO DA BORDA
     ================================================================= */

  function passoDeRolagem() {
    var a = ativo;
    if (!a || !a.iniciado) return;
    var y = a.y;
    var alto = global.innerHeight || 0;
    var dy = 0;
    if (y < BORDA_DE_ROLAGEM) dy = -Math.ceil(ROLAGEM_MAXIMA * (1 - y / BORDA_DE_ROLAGEM));
    else if (y > alto - BORDA_DE_ROLAGEM) dy = Math.ceil(ROLAGEM_MAXIMA * (1 - (alto - y) / BORDA_DE_ROLAGEM));
    if (dy) {
      global.scrollBy(0, dy);
      atualizar(a.x, a.y);
    }
    a.quadro = global.requestAnimationFrame(passoDeRolagem);
  }

  /* =================================================================
     O GESTO
     ================================================================= */

  function atualizar(x, y) {
    var a = ativo;
    a.x = x; a.y = y;
    moverFantasma(x, y);
    var d = destinoEm(x, y);
    a.destino = d;
    if (!d || d.lado === "sobre") {
      a.aceito = false;
      desenharIndicador(d, true, "");
      return;
    }
    var r = a.opcoes.podeSoltar ? a.opcoes.podeSoltar(a.dados, d) : { ok: true };
    a.aceito = !!(r && r.ok);
    a.motivo = r && r.motivo ? r.motivo : "";
    desenharIndicador(d, a.aceito, a.motivo);
  }

  function iniciar() {
    var a = ativo;
    a.iniciado = true;
    a.item.classList.add("arrastar-origem");
    document.documentElement.classList.add("arrastando");
    a.fantasmaMotivo = el("span.arrastar-fantasma__motivo");
    a.fantasma = el("div.arrastar-fantasma", { "aria-hidden": "true" }, [
      el("span.arrastar-fantasma__nome", { texto: a.dados.rotulo || "Item" }),
      a.fantasmaMotivo,
    ]);
    document.body.appendChild(a.fantasma);
    a.quadro = global.requestAnimationFrame(passoDeRolagem);
    anunciar("Arrastando " + (a.dados.rotulo || "item") + ". Solte no lugar, ou Esc para cancelar.");
  }

  function terminar(soltar) {
    var a = ativo;
    ativo = null;
    if (!a) return;
    if (a.quadro) global.cancelAnimationFrame(a.quadro);
    document.removeEventListener("keydown", aoTeclaDuranteArraste, true);
    global.removeEventListener("blur", aoPerderFoco);
    if (a.fantasma) a.fantasma.remove();
    if (a.linha) a.linha.remove();
    if (a.alvoDentro) a.alvoDentro.classList.remove("arrastar-alvo-dentro", "arrastar-alvo-recusado");
    a.item.classList.remove("arrastar-origem");
    document.documentElement.classList.remove("arrastando");
    try { a.alca.releasePointerCapture(a.ponteiro); } catch (e) { /* já soltou */ }

    /* Um toque sem arraste só põe o foco na alça: dali, as setas movem. */
    if (!a.iniciado) {
      if (soltar && a.alca.isConnected) a.alca.focus();
      return;
    }
    /* O clique que o navegador manda depois do arraste não vale. */
    var engolir = function (ev) { ev.preventDefault(); ev.stopPropagation(); };
    global.addEventListener("click", engolir, true);
    setTimeout(function () { global.removeEventListener("click", engolir, true); }, 0);

    if (!soltar) { anunciar("Movimento cancelado."); return; }
    if (!a.destino || a.destino.lado === "sobre") { anunciar("Nada mudou."); return; }
    if (!a.aceito) {
      if (global.RAMAUI && a.motivo) global.RAMAUI.avisoAtencao(a.motivo);
      anunciar("Não foi movido. " + (a.motivo || ""));
      return;
    }
    var destino = { lista: a.destino.lista, indice: a.destino.indice, dentro: !!a.destino.dentro };
    a.opcoes.aoSoltar(a.dados, destino);
    anunciar((a.dados.rotulo || "Item") + " movido.");
  }

  function aoTeclaDuranteArraste(ev) {
    if (ev.key === "Escape" && ativo) {
      ev.preventDefault();
      ev.stopPropagation();
      terminar(false);
    }
  }

  function aoPerderFoco() { if (ativo) terminar(false); }

  function dadosDoItem(item) {
    return {
      id: item.dataset.arrastarItem,
      tipo: item.dataset.arrastarTipo || "",
      rotulo: item.dataset.arrastarRotulo || "",
      lista: listaDoItem(item) ? listaDoItem(item).dataset.arrastarLista : "",
    };
  }

  /* =================================================================
     LIGAR NUMA ÁREA
     ================================================================= */

  function ligar(raiz, opcoes) {
    if (!raiz || !opcoes) return raiz;

    raiz.addEventListener("pointerdown", function (ev) {
      var alcaEl = ev.target.closest ? ev.target.closest("[data-arrastar-alca]") : null;
      if (!alcaEl || !raiz.contains(alcaEl) || ativo) return;
      if (alcaEl.getAttribute("aria-disabled") === "true") return;
      if (ev.button !== undefined && ev.button !== 0 && ev.pointerType === "mouse") return;
      var item = alcaEl.closest("[data-arrastar-item]");
      if (!item) return;
      ev.preventDefault();
      ativo = {
        raiz: raiz, opcoes: opcoes, item: item, alca: alcaEl, dados: dadosDoItem(item),
        ponteiro: ev.pointerId, x0: ev.clientX, y0: ev.clientY, x: ev.clientX, y: ev.clientY,
        limiar: ev.pointerType === "mouse" ? LIMIAR_MOUSE : LIMIAR_TOQUE,
        iniciado: false, destino: null, aceito: false, motivo: "",
      };
      try { alcaEl.setPointerCapture(ev.pointerId); } catch (e) { /* navegador antigo */ }
      document.addEventListener("keydown", aoTeclaDuranteArraste, true);
      global.addEventListener("blur", aoPerderFoco);
    });

    raiz.addEventListener("pointermove", function (ev) {
      var a = ativo;
      if (!a || a.raiz !== raiz || ev.pointerId !== a.ponteiro) return;
      if (!a.iniciado) {
        if (Math.abs(ev.clientX - a.x0) < a.limiar && Math.abs(ev.clientY - a.y0) < a.limiar) return;
        iniciar();
      }
      ev.preventDefault();
      atualizar(ev.clientX, ev.clientY);
    });

    raiz.addEventListener("pointerup", function (ev) {
      var a = ativo;
      if (!a || a.raiz !== raiz || ev.pointerId !== a.ponteiro) return;
      if (a.iniciado) atualizar(ev.clientX, ev.clientY);
      terminar(true);
    });

    raiz.addEventListener("pointercancel", function (ev) {
      var a = ativo;
      if (!a || a.raiz !== raiz || ev.pointerId !== a.ponteiro) return;
      terminar(false);
    });

    /* Teclado: ↑ e ↓ na alça movem um passo. A aba redesenha e o foco
       volta para a alça do mesmo item (data-foco). */
    raiz.addEventListener("keydown", function (ev) {
      var alcaEl = ev.target.closest ? ev.target.closest("[data-arrastar-alca]") : null;
      if (!alcaEl || !raiz.contains(alcaEl)) return;
      if (ev.key !== "ArrowUp" && ev.key !== "ArrowDown") return;
      ev.preventDefault();
      if (alcaEl.getAttribute("aria-disabled") === "true") {
        if (global.RAMAUI && alcaEl.title) global.RAMAUI.avisoAtencao(alcaEl.title);
        return;
      }
      var item = alcaEl.closest("[data-arrastar-item]");
      if (!item || !opcoes.aoTeclado) return;
      var dados = dadosDoItem(item);
      var r = opcoes.aoTeclado(dados, ev.key === "ArrowUp" ? -1 : 1);
      if (r && r.ok === false) {
        anunciar(r.motivo || "Não dá para mover mais.");
        return;
      }
      var foco = alcaEl.dataset.foco;
      setTimeout(function () {
        var novo = foco ? document.querySelector('[data-foco="' + cssEscapar(foco) + '"]') : null;
        if (novo) novo.focus();
        var novoItem = novo ? novo.closest("[data-arrastar-item]") : null;
        var lista = novoItem ? listaDoItem(novoItem) : null;
        if (lista) {
          var irmaos = itensDaLista(lista);
          anunciar((dados.rotulo || "Item") + ": posição " + (irmaos.indexOf(novoItem) + 1) + " de " + irmaos.length + ".");
        }
      }, 0);
    });

    /* A alça é o lugar de segurar, não um botão de ação: o clique nela
       não abre nem fecha o cartão em volta. */
    raiz.addEventListener("click", function (ev) {
      var alcaEl = ev.target.closest ? ev.target.closest("[data-arrastar-alca]") : null;
      if (!alcaEl || !raiz.contains(alcaEl)) return;
      ev.preventDefault();
      ev.stopPropagation();
    });

    return raiz;
  }

  function arrastando() { return !!(ativo && ativo.iniciado); }

  global.RAMAArrastar = {
    alca: alca,
    ligar: ligar,
    arrastando: arrastando,
    cancelar: function () { if (ativo) terminar(false); },
    anunciar: anunciar,
  };
})(window);
