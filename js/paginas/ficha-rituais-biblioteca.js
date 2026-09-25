/* =====================================================================
   R.A.M.A. — ficha · rituais · "Da biblioteca"
   ---------------------------------------------------------------------
   A janela que traz rituais para a ficha sem cadastrá-los à mão. É a
   mesma janela da aba Habilidades e do inventário, com duas origens:

     Ordem Paranormal   o catálogo oficial dos dois livros, filtrado por
                        elemento, círculo e livro
     Homebrew           os rituais da biblioteca que esta conta pode
                        ver, filtrados no servidor

   Na ficha universal, só a Homebrew — o R.A.M.A. não impõe regra de
   Ordem a quem não joga Ordem.

   ---------------------------------------------------------------------
   DOIS JEITOS DE ABRIR
   ---------------------------------------------------------------------

   REGISTRO (sem `aquisicao`)
     "Da biblioteca", na aba Rituais. Cada "Adicionar à ficha" é uma
     cópia confirmada ali mesmo, e o ritual entra como REGISTRO: está na
     ficha para consulta, não é aprendido e não resolve pendência.

   AQUISIÇÃO (`aquisicao: { tipo, … }`)
     Aberta por uma pendência, por Aprender Ritual dentro de Transcender,
     pela troca que Aprender Ritual permite ou pelo estudo em campo. A
     janela sabe POR QUE o personagem está escolhendo, e pergunta ao
     motor (E.contextoDeAquisicao) quantos rituais cabem, de que círculo
     e com que limite. Muda o que ela promete:

     · a escolha é PROVISÓRIA: selecionar não escreve nada na ficha;
       cancelar, fechar ou apertar Esc descarta a seleção inteira;
     · o rodapé mostra, sempre à vista, quantos faltam;
     · cada ritual diz se está disponível, selecionado ou indisponível —
       e, quando indisponível, por quê;
     · antes de gravar, um resumo diz o que entra, o que sai e a que
       aquisição cada ritual fica preso;
     · gravar é UMA operação, validada pelo motor (E.confirmarAquisicao):
       ou tudo entra, ou nada entra, e repetir a confirmação não duplica;
     · não existe "só registrar" dentro de uma aquisição. Registrar é a
       outra porta, a da aba Rituais, e nunca resolve pendência.

     Aprender Ritual e a troca são escolhidos DENTRO de outra janela (a
     de Transcender). Nesses dois casos a biblioteca não grava nada: ela
     devolve o ritual escolhido para a janela de quem pediu, que só
     grava quando aquela escolha inteira for confirmada.

   ---------------------------------------------------------------------
   O QUE A JANELA CONTINUA PROMETENDO
   ---------------------------------------------------------------------

   · Cada resultado aparece compacto; os detalhes só são montados quando
     alguém abre, e abrir os detalhes nunca seleciona nada.
   · Adicionar cria uma CÓPIA independente, com id próprio, ids de
     versão próprios e rastro da origem.
   · Um clique duplo não vira dois rituais.
   · ADICIONAR NÃO É CONJURAR: nenhum PE é gasto e nenhum dado é rolado.
   · Uma rolagem só: a lista não rola dentro do corpo da janela.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var F = global.RAMAFicha;
  var el = U.el;

  function RT() { return global.RAMAOrdemRituais; }
  function E() { return global.RAMAOrdemProgressao; }
  function AP() { return global.RAMAOrdemAprendizado; }

  /* O único tipo de Homebrew que é ritual. Habilidades, itens e
     criaturas moram na mesma biblioteca e não entram aqui. */
  var TIPOS_DE_RITUAL = ["ritual"];

  var lembrado = { origem: "oficial" };
  var contador = 0;

  function deOrdem(ctx) {
    return !!(ctx && F.ehDeOrdem(ctx.ficha) && RT());
  }

  function ordemDe(ctx) { return ctx.ficha.ordem; }

  function rituaisDaFicha(ctx) {
    return (ctx.ficha.rituais && ctx.ficha.rituais.itens) || [];
  }

  function rotulosDaFicha(ctx) {
    return (ctx.ficha.rituais && ctx.ficha.rituais.rotulos) || F.ROTULOS_RITUAL_PADRAO;
  }

  function nomeDaFonte(sigla) {
    return sigla === "SAH" ? "Sobrevivendo ao Horror" : (sigla === "OPRPG" ? "Ordem Paranormal RPG" : "");
  }

  /* =================================================================
     ABRIR
     ================================================================= */

  function abrir(ctx, opcoes) {
    var o = opcoes || {};
    var ordem = deOrdem(ctx);
    var id = "bibr-" + (++contador);

    /* A v2.17 abria por `aprendizado: { vagaId }`; o nome continua
       aceito, e vira uma aquisição de concessão. */
    var pedido = o.aquisicao || (o.aprendizado && o.aprendizado.vagaId
      ? { tipo: "concessao", vaga: o.aprendizado.vagaId } : null);
    var aoMudar = o.aoConfirmar || (o.aprendizado && o.aprendizado.aoMudar) || null;

    var modoAquisicao = !!(ordem && pedido && E() && E().contextoDeAquisicao);
    var devolve = modoAquisicao && (pedido.tipo === "aprenderRitual" || pedido.tipo === "substituicao");

    function contextoDaFicha() {
      return Object.assign({ inventario: ctx.ficha.inventario }, o.contexto || {}, { rituais: rituaisDaFicha(ctx) });
    }

    function lerAquisicao() {
      return modoAquisicao ? E().contextoDeAquisicao(ordemDe(ctx), pedido, contextoDaFicha()) : null;
    }

    var aq = lerAquisicao();
    if (modoAquisicao && !aq) {
      UI.avisoAtencao("Esta aquisição de ritual não está disponível agora — a progressão, a trilha ou uma regra opcional mudou.");
      return null;
    }

    var estado = {
      /* Numa aquisição, a janela começa sempre no catálogo oficial — é
         de lá que vêm os rituais concedidos pelo nome, e é o que quem
         abriu por uma pendência espera ver. Fora dela, volta onde a
         pessoa estava. */
      origem: ordem ? (o.origem || (modoAquisicao ? "oficial" : lembrado.origem)) : "homebrew",
      busca: "", elemento: o.elemento || "", circulo: o.circulo || "", fonte: "",
      soElegiveis: modoAquisicao,
      abertos: {},
      catalogo: null, carregandoCatalogo: false, falhaCatalogo: null,
      homebrew: null,
      hb: { busca: "", escopo: "" },
    };

    /* Os filtros já abrem onde a aquisição manda: um círculo só, o
       elemento exigido, o ritual concedido pelo nome. Não é trava — a
       lista continua inteira com "Todos". */
    if (aq) {
      if (aq.circulos.length === 1) estado.circulo = aq.circulos[0];
      if (aq.elemento) estado.elemento = aq.elemento;
      if (aq.fixo) estado.busca = aq.fixo.nome;
    }

    /* ---------------------------------------------------------------
       A SELEÇÃO PROVISÓRIA
       ---------------------------------------------------------------
       Nada disto está na ficha até a confirmação.

         itens   o que entra: { chave, ritual, novo, nome, circulo,
                 elemento, origem }. `ritual` já é a cópia montada
                 (para o catálogo e a Homebrew) ou o da própria ficha
         saem    ids de rituais que hoje ocupam a concessão e vão sair
       --------------------------------------------------------------- */

    var sel = { itens: [], saem: {} };
    var passo = "lista";
    var gravando = false;
    var rolagemDaLista = 0;

    function selecionado(chave) {
      return sel.itens.filter(function (i) { return i.chave === chave; })[0] || null;
    }

    function escolhidosQueFicam() {
      return aq ? aq.escolhidos.filter(function (rid) { return !sel.saem[rid]; }) : [];
    }

    function totalDepois() {
      return escolhidosQueFicam().length + sel.itens.length;
    }

    function capacidade() {
      if (!aq) return Infinity;
      if (devolve || aq.tipo === "campo") return 1;
      if (aq.quantidade === null || aq.quantidade === undefined) return Infinity;
      return aq.quantidade;
    }

    function cheio() {
      return totalDepois() >= capacidade();
    }

    function alternar(item) {
      var existente = selecionado(item.chave);
      if (existente) {
        sel.itens = sel.itens.filter(function (i) { return i !== existente; });
      } else {
        if (capacidade() === 1) sel.itens = [];
        if (cheio()) return false;
        sel.itens.push(item);
      }
      atualizarRodape();
      return true;
    }

    /* ---------------------------------------------------------------
       O ESQUELETO
       --------------------------------------------------------------- */

    var janela = el("div.pilha.biblioteca.bib", { id: id });
    var cabecalho = el("div.pilha--curta.bib-aquisicao", { class: "pilha" });
    var anuncio = el("p.so-leitor", { role: "status", "aria-live": "polite" });
    var corpo = el("div.pilha");
    var resumo = el("div.pilha.bib-resumo", { hidden: true });
    var aberta = true;

    function anunciar(texto) {
      anuncio.textContent = "";
      setTimeout(function () { anuncio.textContent = texto; }, 30);
    }

    function pintar() {
      var partes = [];
      if (aq) partes.push(cabecalho);
      if (ordem) {
        partes.push(el("div.biblioteca-origens", { role: "group", "aria-label": "Origem dos rituais" }, [
          botaoOrigem("oficial", "Ordem Paranormal"),
          botaoOrigem("homebrew", "Homebrew"),
        ]));
      }
      partes.push(corpo, resumo, anuncio);
      U.trocar(janela, partes);
      if (aq) pintarCabecalho();
      pintarOrigem();
    }

    function botaoOrigem(chave, rotulo) {
      return el("button.biblioteca-origem", {
        type: "button",
        "aria-pressed": String(estado.origem === chave),
        texto: rotulo,
        onclick: function () {
          if (estado.origem === chave) return;
          estado.origem = chave;
          lembrado.origem = chave;
          pintar();
          var novo = U.$$(".biblioteca-origem", janela).filter(function (b) { return b.textContent === rotulo; })[0];
          if (novo) novo.focus();
        },
      });
    }

    function pintarOrigem() {
      if (estado.origem === "oficial") pintarOficial();
      else pintarHomebrew();
    }

    /* ---------------------------------------------------------------
       O CABEÇALHO DA AQUISIÇÃO
       --------------------------------------------------------------- */

    function pintarCabecalho() {
      if (!aq) return;
      var partes = [
        el("p.bib-aquisicao__titulo", {}, [
          el("strong", { texto: aq.rotulo }),
          el("span.t-mini", {
            texto: (aq.rotuloEtapa ? " · " + aq.rotuloEtapa : "") +
                   (aq.nomePoder && aq.nomePoder !== aq.rotulo ? " · " + rotuloDaOrigem(aq) + ": " + aq.nomePoder : ""),
          }),
        ]),
        el("p.t-mini", { texto: aq.explicacao }),
      ];
      if (aq.fonte && aq.pagina) partes.push(el("p.criacao-fonte", { texto: nomeDaFonte(aq.fonte) + ", p. " + aq.pagina }));
      if (aq.fixo) {
        partes.push(el("p.t-mini", { texto: "Concessão automática: o único ritual que serve é " + aq.fixo.nome + ". Selecione-o e confirme para trazer a cópia." }));
      }
      if (aq.limite && aq.limite.esgotado) partes.push(el("p.t-mini.t-aviso", { texto: aq.limite.motivo }));

      /* O que hoje ocupa a concessão — e pode sair, também só na
         confirmação. */
      if (aq.tipo === "concessao" && aq.escolhidos.length) {
        partes.push(el("div.pilha--curta", { class: "pilha" }, [
          el("h3.t-rotulo", { texto: "Já nesta concessão" }),
          el("ul.bib-aquisicao__lista", {}, aq.escolhidos.map(function (rid) {
            var r = ritualDaFicha(rid);
            var sai = !!sel.saem[rid];
            return el("li.bib-aquisicao__item", { class: sai ? "bib-aquisicao__item--sai" : "" }, [
              el("span", { texto: (r ? r.nome : "(ritual fora da ficha)") + (sai ? " — sai ao confirmar" : "") }),
              el("button.r-botao.r-botao--mini.r-botao--fantasma", {
                type: "button",
                texto: sai ? "Manter" : "Tirar desta concessão",
                "aria-pressed": String(sai),
                onclick: function () {
                  if (sai) delete sel.saem[rid]; else sel.saem[rid] = true;
                  pintarCabecalho();
                  atualizarRodape();
                  pintarOrigem();
                },
              }),
            ]);
          })),
        ]));
      }

      partes.push(blocoDaFicha());
      U.trocar(cabecalho, partes);
    }

    function rotuloDaOrigem(a) {
      return { classe: "Classe", trilha: "Trilha", poder: "Poder", campo: "Regra opcional", mesa: "Mesa" }[a.origem] || "Origem";
    }

    function ritualDaFicha(rid) {
      return rituaisDaFicha(ctx).filter(function (x) { return x && x.id === rid; })[0] || null;
    }

    /* Rituais que já estão na ficha e não têm aquisição: podem ocupar
       esta sem virar outra cópia. Os que já têm aquisição não aparecem
       — um ritual não quita duas. */
    function blocoDaFicha() {
      var est = E().estado(ordemDe(ctx), contextoDaFicha());
      var candidatos = (est && est.rituais ? est.rituais.semAquisicao : []).filter(function (d) {
        return !sel.saem[d.id] && aq.escolhidos.indexOf(d.id) < 0;
      });
      if (!candidatos.length) return null;
      return el("div.pilha--curta.bib-ficha", { class: "pilha" }, [
        el("h3.t-rotulo", { texto: "Já na ficha, sem aquisição" }),
        el("p.t-mini", { texto: "Usar um destes não cria outra cópia. Rituais que já têm aquisição não aparecem: um ritual não quita duas." }),
        el("div.bib-itens", {}, candidatos.map(function (d) {
          var r = ritualDaFicha(d.id);
          return linhaDaFicha(r, d);
        })),
      ]);
    }

    function linhaDaFicha(r, d) {
      var chave = "ficha:" + d.id;
      var teste = aq.avaliar({ ritualId: d.id, circulo: d.circulo, elemento: d.elemento, catalogo: d.catalogo, nome: d.nome });
      return el("article.bib-item", { class: classeDeEstado(chave, teste) }, [
        el("div.bib-item__topo", {}, [
          el("span.bib-item__texto.bib-item__texto--fixo", {}, [
            el("span.bib-item__nome", { texto: d.nome || "(sem nome)" }),
            el("span.bib-item__classe", {
              texto: (d.circulo ? d.circulo + "º círculo" : "círculo não informado") +
                     (d.elemento && RT() ? " · " + RT().nomeDoElemento(d.elemento) : "") + " · na ficha, sem aquisição",
            }),
          ]),
        ]),
        controleDeEscolha(chave, teste, function () {
          return { chave: chave, ritual: r, novo: false, nome: d.nome, circulo: d.circulo, elemento: d.elemento, origem: "ficha" };
        }, d.nome),
      ]);
    }

    /* ---------------------------------------------------------------
       O CONTROLE DE ESCOLHA DE CADA RESULTADO
       ---------------------------------------------------------------
       Irmão do botão que abre os detalhes — nunca dentro dele. Abrir
       os detalhes não seleciona, selecionar não abre os detalhes.
       --------------------------------------------------------------- */

    function classeDeEstado(chave, teste) {
      if (selecionado(chave)) return "bib-item--escolhido";
      if (!teste.ok) return "bib-item--indisponivel";
      return "bib-item--disponivel";
    }

    function controleDeEscolha(chave, teste, montar, nome, escolha) {
      var marcado = !!selecionado(chave);
      var motivo = "";
      if (!marcado) {
        if (!teste.ok) motivo = teste.motivo;
        else if (cheio() && capacidade() !== 1) motivo = "A seleção já tem o que esta aquisição dá: tire um antes de pôr outro.";
      }
      var estadoTexto = marcado ? "Selecionado" : (motivo ? "Indisponível" : "Disponível");
      var aviso = el("p.t-mini.bib-item__motivo", { texto: motivo, hidden: !motivo });
      var status = el("p.t-mini.bib-item__status", { role: "status" });

      var botao = el("button.r-botao.r-botao--mini.bib-item__selecionar", {
        type: "button",
        class: marcado ? "r-botao--principal" : "",
        "aria-pressed": String(marcado),
        "aria-disabled": motivo ? "true" : null,
        "aria-label": (marcado ? "Tirar " : "Selecionar ") + nome + (motivo ? " — indisponível: " + motivo : ""),
        texto: marcado ? "✓ Selecionado" : "Selecionar",
        onkeydown: function (ev) { if (ev.key === "Enter" && ev.repeat) ev.preventDefault(); },
        onclick: function (ev) {
          if (ev.detail > 1) return;
          if (motivo && !selecionado(chave)) {
            status.textContent = motivo;
            return;
          }
          var item = selecionado(chave) || montar(escolha ? escolha.entrada.value : "");
          if (!item) return;
          if (item.erro) {
            status.textContent = item.erro;
            status.classList.add("t-erro");
            if (escolha) escolha.entrada.focus();
            return;
          }
          alternar(item);
          anunciar((selecionado(chave) ? "Selecionado: " : "Fora da seleção: ") + nome + ".");
          /* Redesenha a lista inteira: a capacidade mudou para todos. A
             busca, os filtros e a posição continuam onde estavam. */
          var rolagem = m.corpo.scrollTop;
          if (aq) pintarCabecalho();
          pintarOrigem();
          m.corpo.scrollTop = rolagem;
          var volta = U.$$(".bib-item__selecionar", janela).filter(function (b) {
            return b.getAttribute("data-chave") === chave;
          })[0];
          if (volta) volta.focus();
        },
      });
      botao.setAttribute("data-chave", chave);

      return el("div.bib-item__escolha", {}, [
        el("span.bib-item__estado", { class: "bib-item__estado--" + (marcado ? "escolhido" : (motivo ? "indisponivel" : "disponivel")), texto: estadoTexto }),
        escolha && !marcado && !motivo ? escolha.caixa : null,
        botao,
        aviso,
        status,
      ]);
    }

    /* O que se sabe de uma entrada do catálogo para conferir a regra. O
       elemento de um ritual que pede escolha (Amaldiçoar Arma) só é
       decidido ao selecionar, então os quatro entram. */
    function dadosDaEntrada(e) {
      return { circulo: e.circulo, elemento: e.elemento, elementos: e.elementos, catalogo: e.id, nome: e.nome };
    }

    function avaliarEntrada(e) {
      return aq ? aq.avaliar(dadosDaEntrada(e)) : { ok: true, motivo: "" };
    }

    function montarDoCatalogo(e, elementoEscolhido) {
      var montado = RT().paraFicha(e, { escolha: e.escolha ? elementoEscolhido : undefined });
      if (!montado.ok) return { erro: montado.mensagem };
      var ritual = F.criarRitual(montado.dados);
      ritual.adicionadoEm = U.agoraISO();
      var d = RT().dadosDoRitual(ritual);
      return { chave: "cat:" + e.id, ritual: ritual, novo: true, nome: ritual.nome, circulo: d.circulo, elemento: d.elemento, origem: "catalogo" };
    }

    function montarDaHomebrew(h) {
      var ritual = F.criarRitual(F.normalizarRitual(h) || {});
      ritual.origemHomebrewId = h.id;
      delete ritual.origemCatalogoId;
      ritual.adicionadoEm = U.agoraISO();
      var d = RT() ? RT().dadosDoRitual(ritual) : {};
      return { chave: "hb:" + h.id, ritual: ritual, novo: true, nome: ritual.nome, circulo: d.circulo || 0, elemento: d.elemento || "", origem: "homebrew" };
    }

    /* ---------------------------------------------------------------
       ORDEM PARANORMAL
       --------------------------------------------------------------- */

    function carregarCatalogo(focar) {
      estado.carregandoCatalogo = true;
      estado.falhaCatalogo = null;
      if (estado.origem === "oficial") U.trocar(corpo, UI.carregando("Abrindo o catálogo de rituais"));
      RT().carregar().then(function (catalogo) {
        estado.catalogo = catalogo;
        estado.carregandoCatalogo = false;
        if (aberta && estado.origem === "oficial" && passo === "lista") {
          pintarOficial();
          if (focar) focarEm("input[type=search]");
        }
      }, function (erro) {
        console.error("[R.A.M.A. · rituais] o catálogo não carregou", erro);
        estado.falhaCatalogo = erro || new Error("falha");
        estado.carregandoCatalogo = false;
        if (aberta && estado.origem === "oficial") { pintarOficial(); if (focar) focarEm("button"); }
      });
    }

    function focarEm(seletor) {
      var alvo = corpo.querySelector(seletor);
      if (alvo) alvo.focus();
    }

    function pintarOficial() {
      if (!estado.catalogo) {
        if (estado.falhaCatalogo) {
          U.trocar(corpo, el("div.r-vazio", {}, [
            el("p.r-vazio__titulo.t-erro", { texto: "Não foi possível abrir o catálogo" }),
            el("p.r-vazio__texto", { texto: "O arquivo do catálogo de rituais não carregou. Confira a conexão e tente de novo — nada foi alterado na ficha." }),
            el("button.r-botao", { type: "button", texto: "Tentar novamente", onclick: function () { carregarCatalogo(true); } }),
          ]));
          return;
        }
        U.trocar(corpo, UI.carregando("Abrindo o catálogo de rituais"));
        if (!estado.carregandoCatalogo) carregarCatalogo();
        return;
      }

      if (!estado.catalogo.rituais.length) {
        U.trocar(corpo, UI.vazio({ titulo: "Catálogo vazio", texto: "O arquivo do catálogo carregou sem nenhum ritual." }));
        return;
      }

      var lista = el("div.biblioteca-lista.bib-lista", { "aria-live": "off" });
      var status = el("p.t-mini.bib-status", { role: "status" });
      var filtroElemento = el("div.r-abas.biblioteca-abas", { role: "group", "aria-label": "Elemento" });
      var filtroCirculo = el("div.faixa.bib-chips", { role: "group", "aria-label": "Círculo" });
      var filtroFonte = el("div.bib-filtros");

      var busca = el("input.r-entrada", {
        type: "search", placeholder: "Buscar por nome", "aria-label": "Buscar ritual no catálogo",
        value: estado.busca,
        oninput: function (ev) { estado.busca = ev.target.value; pintarFiltros(); pintarLista(); },
      });

      function chip(rotulo, ativo, aoClicar, contagem, classe) {
        return el("button.r-aba" + (classe ? "." + classe : ""), {
          type: "button",
          "aria-pressed": String(ativo),
          texto: rotulo + (contagem === null || contagem === undefined ? "" : " (" + contagem + ")"),
          onclick: aoClicar,
        });
      }

      function pintarFiltros() {
        var c = RT().contagens(estado.catalogo, estado);

        U.trocar(filtroElemento, [
          chip("Todos", !estado.elemento, function () { estado.elemento = ""; pintarFiltros(); pintarLista(); }, c.todosElementos),
        ].concat(RT().ELEMENTOS.map(function (e) {
          return chip(e.nome, estado.elemento === e.chave, function () {
            estado.elemento = estado.elemento === e.chave ? "" : e.chave;
            pintarFiltros(); pintarLista();
          }, c.elementos[e.chave], "bib-elemento--" + e.chave);
        })));

        U.trocar(filtroCirculo, [
          chip("Todos", !estado.circulo, function () { estado.circulo = ""; pintarFiltros(); pintarLista(); }, c.todosCirculos),
        ].concat(RT().CIRCULOS.map(function (n) {
          return chip(RT().rotuloCirculo(n), String(estado.circulo) === String(n), function () {
            estado.circulo = String(estado.circulo) === String(n) ? "" : n;
            pintarFiltros(); pintarLista();
          }, c.circulos[n]);
        })));

        /* O filtro de livro só aparece quando há mais de uma fonte no
           catálogo — um seletor com uma opção é ruído. */
        var fontes = RT().fontesDoCatalogo(estado.catalogo);
        var ativos = !!(estado.busca || estado.elemento || estado.circulo || estado.fonte);
        var idFonte = id + "-fonte";
        var idSo = id + "-so-elegiveis";
        U.trocar(filtroFonte, [
          fontes.length > 1 ? el("div.bib-filtro", {}, [
            el("label.t-mini", { for: idFonte, texto: "Livro" }),
            el("select.r-selecao", {
              id: idFonte,
              onchange: function (ev) { estado.fonte = ev.target.value; pintarFiltros(); pintarLista(); },
            }, [el("option", { value: "", texto: "Todos" })].concat(fontes.map(function (k) {
              return el("option", { value: k, texto: RT().ROTULO_FONTE[k] + " (" + c.fontes[k] + ")", selected: estado.fonte === k });
            }))),
          ]) : null,
          /* Numa aquisição, o que não cabe some por padrão — e volta com
             o motivo escrito, para quem quiser ver por quê. */
          aq ? el("label.bib-alternar", { for: idSo }, [
            el("input", {
              id: idSo, type: "checkbox", checked: estado.soElegiveis,
              onchange: function (ev) { estado.soElegiveis = ev.target.checked; pintarLista(); },
            }),
            el("span.t-mini", { texto: "Só os que cabem nesta aquisição" }),
          ]) : null,
          ativos ? el("button.r-botao.r-botao--mini.r-botao--fantasma.bib-limpar", {
            type: "button", texto: "Limpar busca e filtros",
            onclick: function () {
              estado.busca = ""; estado.elemento = ""; estado.circulo = ""; estado.fonte = "";
              busca.value = "";
              pintarFiltros(); pintarLista();
              busca.focus();
            },
          }) : null,
        ]);
      }

      function pintarLista() {
        var entradas = RT().filtrar(estado.catalogo, estado);
        var escondidos = 0;
        if (aq && estado.soElegiveis) {
          entradas = entradas.filter(function (e) {
            var fica = avaliarEntrada(e).ok || !!selecionado("cat:" + e.id);
            if (!fica) escondidos++;
            return fica;
          });
        }
        if (!entradas.length) {
          status.textContent = "Nenhum resultado." + (escondidos ? " " + escondidos + " não cabem nesta aquisição." : "");
          U.trocar(lista, el("div.r-vazio.bib-nada", {}, [
            el("p.r-vazio__titulo", { texto: "Nenhum ritual encontrado" }),
            el("p.r-vazio__texto", {
              texto: escondidos
                ? "Nenhum ritual com esta busca cabe nesta aquisição. Desmarque “Só os que cabem” para ver os outros e o motivo de cada um."
                : "Tente outro nome, ou limpe a busca e os filtros.",
            }),
          ]));
          return;
        }
        status.textContent = entradas.length + (entradas.length === 1 ? " ritual" : " rituais") +
          (aq && estado.soElegiveis ? (entradas.length === 1 ? " cabe" : " cabem") + " nesta aquisição" : "") + "." +
          (escondidos ? " " + escondidos + " escondido" + (escondidos === 1 ? "" : "s") + " por não caber." : "");
        U.trocar(lista, RT().porCirculo(entradas).map(function (g) {
          return el("section.biblioteca-secao", { "aria-label": g.titulo }, [
            el("h3.t-rotulo", { texto: g.titulo + " (" + g.entradas.length + ") · " + g.custo + " PE" }),
            el("div.bib-itens", {}, g.entradas.map(linhaOficial)),
          ]);
        }));
      }

      pintarFiltros();
      pintarLista();

      U.trocar(corpo, [
        filtroElemento,
        filtroCirculo,
        el("div.r-busca", {}, [el("span.r-busca__marca", {}, [UI.simbolo("busca")]), busca]),
        filtroFonte,
        status,
        lista,
        el("p.t-mini", {
          texto: aq
            ? "Selecionar não escreve nada na ficha: a cópia só entra quando a escolha inteira for confirmada. Aprender não gasta PE nem rola dado."
            : (ordem
              ? "Aqui o ritual entra como REGISTRO, para consulta: não é aprendido e não resolve pendência — aprender vem das pendências da Progressão. " +
                "A cópia é independente: editá-la não muda o catálogo. Adicionar não conjura — nenhum PE é gasto e nenhum dado é rolado."
              : "Cada ritual entra na ficha como cópia: editar a cópia não muda o catálogo, e o catálogo não muda a cópia. " +
                "Adicionar não conjura — nenhum PE é gasto e nenhum dado é rolado."),
        }),
      ]);
    }

    /* Uma entrada do catálogo, compacta; os detalhes nascem ao abrir. */
    function linhaOficial(e) {
      var idDet = id + "-" + e.id.replace(/[^a-z0-9]+/gi, "-");
      var aberto = !!estado.abertos[e.id];
      var detalhes = el("div.bib-item__detalhes", { id: idDet, hidden: !aberto });
      var naFicha = el("span.r-etiqueta.bib-item__na-ficha", { hidden: true });
      var chave = "cat:" + e.id;
      var teste = avaliarEntrada(e);

      function atualizarNaFicha() {
        var n = RT().quantasNaFicha(e, rituaisDaFicha(ctx));
        naFicha.hidden = !n;
        naFicha.textContent = "na ficha: " + n;
      }
      atualizarNaFicha();

      var botaoAbrir = el("button.bib-item__abrir", {
        type: "button",
        "aria-expanded": String(aberto),
        "aria-controls": idDet,
        "aria-label": "Detalhes de " + e.nome,
        onclick: function () {
          var abrirAgora = detalhes.hidden;
          estado.abertos[e.id] = abrirAgora;
          detalhes.hidden = !abrirAgora;
          botaoAbrir.setAttribute("aria-expanded", String(abrirAgora));
          if (abrirAgora && !detalhes.firstChild) montarDetalhes(e, detalhes, atualizarNaFicha);
        },
      }, [
        el("span.bib-item__seta", { "aria-hidden": "true" }),
        el("span.bib-item__texto", {}, [
          el("span.bib-item__nome", { texto: e.nome }),
          el("span.bib-item__classe", { texto: e.classificacao }),
          dadosCompactos(RT().resumoCompacto(e)),
        ]),
      ]);

      var marcas = el("span.bib-item__marcas", {}, e.elementos.map(function (chaveEl) {
        return el("span.r-etiqueta.bib-elemento.bib-elemento--" + chaveEl, { texto: RT().nomeDoElemento(chaveEl) });
      }).concat([
        el("span.r-etiqueta.bib-fonte", { texto: RT().SIGLA_FONTE[e.fonte] + " p. " + e.pagina, title: RT().referencia(e) }),
        naFicha,
      ]));

      if (aberto) montarDetalhes(e, detalhes, atualizarNaFicha);

      var escolha = aq ? campoDeEscolha(e) : null;
      return el("article.bib-item", { class: aq ? classeDeEstado(chave, teste) : "" }, [
        el("div.bib-item__topo", {}, [botaoAbrir, marcas]),
        aq ? controleDeEscolha(chave, teste, function (elemento) { return montarDoCatalogo(e, elemento); }, e.nome, escolha) : null,
        detalhes,
      ]);
    }

    function dadosCompactos(pares) {
      if (!pares.length) return null;
      return el("span.bib-item__dados", {}, pares.map(function (p) {
        return el("span.item-dados__par", {}, [
          el("span.item-dados__rotulo", { texto: p[0] + ":" }),
          el("span.item-dados__valor", { texto: p[1] }),
        ]);
      }));
    }

    function listaDeTextos(textos, classe) {
      if (!textos.length) return null;
      return el("ul.bib-lista-textos" + (classe ? "." + classe : ""), {}, textos.map(function (t) { return el("li", { texto: t }); }));
    }

    /* As versões, com o custo ADICIONAL e o TOTAL lado a lado. */
    function blocoDeVersoes(e) {
      return el("div.pilha--curta", { class: "pilha" }, [
        el("h4.t-rotulo", { texto: "Versões" }),
        el("div.bib-versoes", {}, e.versoes.map(function (v) {
          var linhas = [];
          if (v.requisito) linhas.push("Requer " + v.requisito + ".");
          if (v.alteracoes) linhas.push(v.alteracoes);
          var rolagens = [];
          if (v.dano) rolagens.push("dano " + v.dano + (v.danoExtra ? "+" + v.danoExtra : ""));
          v.rolagens.forEach(function (r) {
            rolagens.push(r.rotulo.toLowerCase() + " " + (r.expressao || "") + (r.extra ? (r.expressao ? "+" : "") + r.extra : ""));
          });
          if (rolagens.length) linhas.push("Rolagens: " + rolagens.join(", ") + ".");
          return el("div.bib-versao", {}, [
            el("p.bib-versao__topo", {}, [
              el("strong", { texto: v.nome }),
              el("span.t-mini", {
                texto: v.basica
                  ? " · " + v.custoTotal + " PE"
                  : " · +" + v.custo + " PE (total " + v.custoTotal + " PE)",
              }),
            ]),
            linhas.length ? el("p.t-mini", { texto: linhas.join(" ") }) : null,
          ]);
        })),
      ]);
    }

    function montarDetalhes(e, caixa, aoAdicionar) {
      var automacao = RT().naFicha(e);
      var conferencias = deOrdem(ctx) ? RT().conferencias(e, ordemDe(ctx)) : [];
      var teste = aq ? avaliarEntrada(e) : null;

      U.trocar(caixa, [
        el("p.bib-item__resumo", { texto: e.resumo }),
        el("dl.r-dados.bib-item__pares", {}, RT().detalhes(e).reduce(function (saida, p) {
          saida.push(el("dt", { texto: p[0] }));
          saida.push(el("dd", { texto: p[1] }));
          return saida;
        }, [])),
        e.efeitos.length ? el("h4.t-rotulo", { texto: "Efeitos" }) : null,
        listaDeTextos(e.efeitos),
        blocoDeVersoes(e),
        el("h4.t-rotulo", { texto: "Requisitos" }),
        listaDeTextos(RT().requisitos(e), "t-mini"),
        el("h4.t-rotulo", { texto: "Regras que acompanham" }),
        listaDeTextos(RT().regrasGerais(e), "t-mini"),
        conferencias.length ? el("h4.t-rotulo", { texto: "Nesta ficha" }) : null,
        listaDeTextos(conferencias, "t-mini.t-aviso"),
        teste ? el("p.t-mini", {
          class: teste.ok ? "t-ok" : "t-aviso",
          texto: teste.ok ? "Cabe em " + aq.rotulo + (aq.rotuloEtapa ? " (" + aq.rotuloEtapa + ")" : "") + "." : teste.motivo,
        }) : null,
        el("p.t-mini.bib-automacao", {}, [
          el("span.r-etiqueta", {
            class: automacao.automacao === "calculo" ? "etiqueta--calculo" : "",
            texto: { calculo: "Automatizado", parcial: "Parcial", texto: "Controle manual" }[automacao.automacao],
          }),
          el("span", { texto: " " + automacao.texto }),
        ]),
        e.notas.length ? listaDeTextos(e.notas.map(function (n) { return "Nota: " + n; }), "t-mini.t-aviso") : null,
        /* Numa aquisição, o controle de escolha fica no resultado, fora
           dos detalhes: consultar nunca seleciona. */
        aq ? null : acaoAdicionar(e, aoAdicionar),
      ]);
    }

    function campoDeEscolha(e) {
      if (!e.escolha) return null;
      var idCampo = id + "-esc-" + e.id.replace(/[^a-z0-9]+/gi, "-");
      var entrada = el("select.r-selecao", { id: idCampo }, [
        el("option", { value: "", texto: "Escolha…" }),
      ].concat(RT().opcoesDaEscolha(e.escolha).map(function (op) {
        return el("option", { value: op.valor, texto: op.rotulo });
      })));
      return {
        caixa: el("div.r-campo.bib-campo", {}, [el("label.r-rotulo", { for: idCampo, texto: e.escolha.rotulo }), entrada]),
        entrada: entrada,
      };
    }

    /* ---------------------------------------------------------------
       REGISTRO: adicionar à ficha, uma cópia por clique
       --------------------------------------------------------------- */

    function acaoAdicionar(e, aoAdicionar) {
      var escolha = campoDeEscolha(e);
      var status = el("p.t-mini.bib-item__status", { role: "status" });
      var botao = el("button.r-botao.r-botao--principal.bib-item__adicionar", {
        type: "button",
        texto: "Adicionar à ficha",
        "aria-label": "Adicionar " + e.nome + " à ficha",
        onkeydown: function (ev) { if (ev.key === "Enter" && ev.repeat) ev.preventDefault(); },
        onclick: function (ev) {
          /* O segundo clique de um clique duplo não é outra intenção. */
          if (ev.detail > 1) return;
          adicionarOficial(e, escolha, botao, status, aoAdicionar);
        },
      });
      return el("div.bib-item__acao", {}, [
        escolha ? escolha.caixa : null,
        botao,
        status,
      ]);
    }

    function adicionarOficial(e, escolha, botao, status, aoAdicionar) {
      if (botao.getAttribute("aria-busy") === "true") return;
      status.classList.remove("t-erro");

      var montado = RT().paraFicha(e, { escolha: escolha ? escolha.entrada.value : undefined });
      if (!montado.ok) {
        status.textContent = montado.mensagem;
        status.classList.add("t-erro");
        if (escolha) escolha.entrada.focus();
        return;
      }

      var jaTinha = RT().quantasNaFicha(e, rituaisDaFicha(ctx));

      botao.setAttribute("aria-busy", "true");
      botao.disabled = true;
      var ritual;
      try {
        ritual = F.criarRitual(montado.dados);
        ritual.adicionadoEm = U.agoraISO();
        ctx.ficha.rituais.itens.push(ritual);
        ctx.alterou();
        ctx.redesenhar();
      } finally {
        botao.removeAttribute("aria-busy");
        botao.disabled = false;
      }

      if (aoAdicionar) aoAdicionar();
      var texto = ritual.nome + " entrou na ficha" + (jaTinha ? " (" + (jaTinha + 1) + " cópias)" : "") +
        (ordem ? " como registro" : "") +
        ". Nenhum PE foi gasto: aprender e conjurar continuam com você.";
      status.textContent = texto;
      anunciar(texto);
      botao.focus();
    }

    /* ---------------------------------------------------------------
       HOMEBREW
       --------------------------------------------------------------- */

    function carregarHomebrew(focar) {
      estado.homebrew = { carregando: true };
      if (estado.origem === "homebrew") U.trocar(corpo, UI.carregando("Consultando a biblioteca Homebrew"));
      global.RAMAApi.listarHomebrew({ escopo: "todos", tipos: TIPOS_DE_RITUAL }).then(function (r) {
        if (!r || !r.ok) {
          estado.homebrew = { falha: r || { ok: false, erro: "sem_resposta" } };
        } else {
          /* Um servidor anterior a esta versão ignora `tipos`: filtrar
             de novo aqui garante que item e criatura não virem ritual. */
          estado.homebrew = {
            registros: (r.dados || []).filter(function (h) { return h && h.tipo === "ritual"; }),
          };
        }
        if (aberta && estado.origem === "homebrew" && passo === "lista") {
          pintarHomebrew();
          if (focar) focarEm(estado.homebrew.falha ? "button" : "input[type=search], button");
        }
      });
    }

    function pintarHomebrew() {
      if (!estado.homebrew) { carregarHomebrew(); return; }
      if (estado.homebrew.carregando) { U.trocar(corpo, UI.carregando("Consultando a biblioteca Homebrew")); return; }
      if (estado.homebrew.falha) {
        U.trocar(corpo, UI.erroDeTela(estado.homebrew.falha, function () { carregarHomebrew(true); }));
        return;
      }

      var registros = estado.homebrew.registros;
      if (!registros.length) {
        U.trocar(corpo, el("div.pilha", {}, [
          UI.vazio({
            titulo: "Nenhum ritual na Homebrew",
            texto: "Você ainda não guardou rituais na sua biblioteca, e nenhuma conta publicou rituais." +
                   (aq ? "" : " Crie um ritual agora — ele pode ir para a Homebrew ao mesmo tempo."),
            acao: aq ? null : {
              rotulo: "Criar ritual",
              aoClicar: function () {
                m.fechar();
                if (global.RAMASecaoRituais && global.RAMASecaoRituais.novoRitual) global.RAMASecaoRituais.novoRitual(ctx);
              },
            },
          }),
          el("p.t-mini", {}, [
            el("span", { texto: "Ou organize a biblioteca na página " }),
            el("a", { href: U.url("homebrew/"), target: "_blank", rel: "noopener", texto: "Homebrew (abre em outra aba)" }),
            el("span", { texto: "." }),
          ]),
        ]));
        return;
      }

      var hb = estado.hb;
      var lista = el("div.biblioteca-lista.bib-lista");
      var status = el("p.t-mini.bib-status", { role: "status" });
      var idEscopo = id + "-hb-escopo";

      var busca = el("input.r-entrada", {
        type: "search", placeholder: "Buscar por nome", "aria-label": "Buscar ritual na Homebrew", value: hb.busca,
        oninput: function (ev) { hb.busca = ev.target.value; pintarListaHb(); },
      });

      var filtros = el("div.bib-filtros", {}, [
        el("div.bib-filtro", {}, [
          el("label.t-mini", { for: idEscopo, texto: "Escopo" }),
          el("select.r-selecao", {
            id: idEscopo,
            onchange: function (ev) { hb.escopo = ev.target.value; pintarListaHb(); },
          }, [
            el("option", { value: "", texto: "Todos" }),
            el("option", { value: "meu", texto: "Meus", selected: hb.escopo === "meu" }),
            el("option", { value: "publico", texto: "Públicos de outras contas", selected: hb.escopo === "publico" }),
          ]),
        ]),
      ]);

      function pintarListaHb() {
        var termo = U.chaveDeBusca(hb.busca);
        var visiveis = registros.filter(function (h) {
          if (hb.escopo === "meu" && !h.meu) return false;
          if (hb.escopo === "publico" && h.meu) return false;
          return !termo || U.chaveDeBusca(h.nome).indexOf(termo) >= 0;
        }).sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome), "pt-BR"); });

        if (!visiveis.length) {
          status.textContent = "Nenhum resultado.";
          U.trocar(lista, el("div.r-vazio.bib-nada", {}, [
            el("p.r-vazio__titulo", { texto: "Nenhum ritual encontrado" }),
            el("button.r-botao.r-botao--mini", {
              type: "button", texto: "Limpar busca e filtros",
              onclick: function () { hb.busca = ""; hb.escopo = ""; pintarHomebrew(); },
            }),
          ]));
          return;
        }
        status.textContent = visiveis.length + (visiveis.length === 1 ? " ritual." : " rituais.");
        U.trocar(lista, el("div.bib-itens", {}, visiveis.map(linhaHomebrew)));
      }

      pintarListaHb();
      U.trocar(corpo, [
        el("div.r-busca", {}, [el("span.r-busca__marca", {}, [UI.simbolo("busca")]), busca]),
        filtros,
        status,
        lista,
        el("p.t-mini", {
          texto: aq
            ? "Um ritual Homebrew ocupa uma aquisição quando informa o círculo — é por ele que a regra confere. Selecionar não escreve nada na ficha."
            : "O ritual entra na ficha como cópia. Editá-lo aqui não muda o modelo da biblioteca, e editar o modelo não muda esta ficha.",
        }),
      ]);
    }

    function paresHomebrew(h) {
      var rotulos = rotulosDaFicha(ctx);
      var pares = [];
      F.CAMPOS_RITUAL.forEach(function (campo) {
        if (campo === F.CAMPO_LONGO_RITUAL) return;
        var valor = U.aparar(h[campo]);
        if (valor) pares.push([rotulos[campo], valor]);
      });
      var comRolagem = F.versoesComRolagem(h);
      if (comRolagem.length) pares.push(["Versões", comRolagem.map(function (v) { return v.nome; }).join(", ")]);
      return pares.slice(0, 4);
    }

    function linhaHomebrew(h) {
      var idDet = id + "-hb-" + String(h.id).replace(/[^a-z0-9]+/gi, "-");
      var aberto = !!estado.abertos["hb:" + h.id];
      var detalhes = el("div.bib-item__detalhes", { id: idDet, hidden: !aberto });
      var chave = "hb:" + h.id;
      var dados = RT() ? RT().dadosDoRitual(h) : {};
      var teste = aq
        ? aq.avaliar({ circulo: dados.circulo || 0, elemento: dados.elemento || "", elementos: dados.elemento ? [dados.elemento] : [], nome: h.nome })
        : null;

      var botaoAbrir = el("button.bib-item__abrir", {
        type: "button", "aria-expanded": String(aberto), "aria-controls": idDet,
        "aria-label": "Detalhes de " + h.nome,
        onclick: function () {
          var abrirAgora = detalhes.hidden;
          estado.abertos["hb:" + h.id] = abrirAgora;
          detalhes.hidden = !abrirAgora;
          botaoAbrir.setAttribute("aria-expanded", String(abrirAgora));
          if (abrirAgora && !detalhes.firstChild) montarDetalhesHb(h, detalhes);
        },
      }, [
        el("span.bib-item__seta", { "aria-hidden": "true" }),
        el("span.bib-item__texto", {}, [
          el("span.bib-item__nome", { texto: h.nome }),
          el("span.bib-item__classe", {
            texto: "Ritual Homebrew" + (dados.circulo ? " · " + dados.circulo + "º círculo" : ""),
          }),
          dadosCompactos(paresHomebrew(h)),
        ]),
      ]);

      if (aberto) montarDetalhesHb(h, detalhes);

      return el("article.bib-item", { class: aq ? classeDeEstado(chave, teste) : "" }, [
        el("div.bib-item__topo", {}, [
          botaoAbrir,
          el("span.bib-item__marcas", {}, [
            el("span.r-etiqueta", { texto: h.meu ? "Meu" : "Público" }),
            h.atualizadoEm ? el("span.r-etiqueta.bib-fonte", { texto: U.dataCurta(h.atualizadoEm) }) : null,
          ]),
        ]),
        aq ? controleDeEscolha(chave, teste, function () { return montarDaHomebrew(h); }, h.nome, null) : null,
        detalhes,
      ]);
    }

    function montarDetalhesHb(h, caixa) {
      var rotulos = rotulosDaFicha(ctx);
      var status = el("p.t-mini.bib-item__status", { role: "status" });
      var botao = aq ? null : el("button.r-botao.r-botao--principal.bib-item__adicionar", {
        type: "button", texto: "Adicionar à ficha", "aria-label": "Adicionar " + h.nome + " à ficha",
        onkeydown: function (ev) { if (ev.key === "Enter" && ev.repeat) ev.preventDefault(); },
        onclick: function (ev) {
          if (ev.detail > 1) return;
          adicionarHomebrew(h, botao, status);
        },
      });

      var pares = [];
      F.CAMPOS_RITUAL.forEach(function (campo) {
        if (campo === F.CAMPO_LONGO_RITUAL) return;
        var valor = U.aparar(h[campo]);
        if (!valor) return;
        pares.push(el("dt", { texto: rotulos[campo] }));
        pares.push(el("dd", { texto: valor }));
      });

      U.trocar(caixa, [
        pares.length ? el("dl.r-dados.bib-item__pares", {}, pares) : null,
        U.aparar(h[F.CAMPO_LONGO_RITUAL])
          ? el("p.bib-item__resumo", { texto: h[F.CAMPO_LONGO_RITUAL], estilo: { whiteSpace: "pre-wrap" } })
          : el("p.t-mini", { texto: "Sem descrição." }),
        (h.versoes || []).length
          ? el("p.t-mini", { texto: "Versões: " + h.versoes.map(function (v) {
              return v.nome + (v.dano ? " (" + v.dano + (v.danoExtra ? "+" + v.danoExtra : "") + ")" : "");
            }).join(", ") + "." })
          : null,
        botao ? el("div.bib-item__acao", {}, [botao, status]) : null,
      ]);
    }

    function adicionarHomebrew(h, botao, status) {
      if (botao.getAttribute("aria-busy") === "true") return;
      status.classList.remove("t-erro");

      botao.setAttribute("aria-busy", "true");
      botao.disabled = true;
      var copia;
      try {
        /* criarRitual gera ids novos, inclusive das versões: a cópia é
           outro registro, e editá-la não mexe no modelo. */
        copia = montarDaHomebrew(h).ritual;
        ctx.ficha.rituais.itens.push(copia);
        ctx.alterou();
        ctx.redesenhar();
      } finally {
        botao.removeAttribute("aria-busy");
        botao.disabled = false;
      }

      var texto = copia.nome + " entrou na ficha" + (ordem ? " como registro" : "") + ".";
      status.textContent = texto;
      anunciar(texto);
      botao.focus();
    }

    /* ---------------------------------------------------------------
       O RODAPÉ E O RESUMO
       --------------------------------------------------------------- */

    var rodapeStatus = el("p.t-mini.bib-rodape__status", { role: "status", "aria-live": "polite" });

    function textoDaConta() {
      if (!aq) return "";
      if (devolve) {
        return sel.itens.length ? "Escolhido: " + sel.itens[0].nome + "." : "Nenhum ritual escolhido.";
      }
      if (aq.tipo === "campo") {
        return sel.itens.length ? "Para estudar: " + sel.itens[0].nome + "." : "Escolha o ritual estudado.";
      }
      var total = totalDepois();
      var q = aq.quantidade;
      var faltam = Math.max(0, q - total);
      return "Escolhidos: " + total + " de " + q + (faltam ? " · faltam " + faltam : " · completa") +
        (sel.itens.length || Object.keys(sel.saem).length ? " (a confirmar)" : "");
    }

    function haMudanca() {
      return sel.itens.length > 0 || Object.keys(sel.saem).length > 0;
    }

    function atualizarRodape() {
      if (!aq) return;
      rodapeStatus.textContent = textoDaConta();
      var principal = botaoPrincipal();
      if (principal) {
        principal.disabled = !haMudanca() || gravando;
        principal.textContent = rotuloPrincipal();
      }
      var secundario = botaoSecundario();
      if (secundario) secundario.textContent = passo === "resumo" ? "Voltar" : "Cancelar";
    }

    function rotuloPrincipal() {
      if (passo === "resumo") return aq.tipo === "campo" ? "Registrar estudo" : "Confirmar";
      if (devolve) return "Usar este ritual";
      return "Revisar e confirmar";
    }

    function botaoPrincipal() {
      return m ? m.janela.querySelector(".r-modal__rodape .r-botao--principal") : null;
    }

    function botaoSecundario() {
      return m ? m.janela.querySelector(".r-modal__rodape .r-botao--fantasma") : null;
    }

    function aoPrincipal(fechar) {
      if (!aq || gravando) return;
      if (!haMudanca()) return;
      if (devolve) { devolver(fechar); return; }
      if (passo === "lista") { mostrarResumo(); return; }
      gravar(fechar);
    }

    function aoSecundario(fechar) {
      if (passo === "resumo") { voltarParaLista(); return; }
      fechar();
    }

    /* Aprender Ritual e a troca: devolve o ritual para a janela de quem
       pediu. Nada é gravado aqui. */
    function devolver(fechar) {
      var item = sel.itens[0];
      if (!item) return;
      if (o.aoEscolher) o.aoEscolher({ ritual: item.ritual, novo: item.novo, nome: item.nome, origem: item.origem });
      fechar();
    }

    var resumoCampo = { confirmado: false, fonte: "", nota: "" };

    function mostrarResumo() {
      rolagemDaLista = m.corpo.scrollTop;
      passo = "resumo";
      corpo.hidden = true;
      cabecalho.hidden = true;
      U.$$(".biblioteca-origens", janela).forEach(function (b) { b.hidden = true; });
      resumo.hidden = false;
      pintarResumo();
      atualizarRodape();
      m.corpo.scrollTop = 0;
      var titulo = resumo.querySelector("h3");
      if (titulo) { titulo.tabIndex = -1; titulo.focus(); }
    }

    function voltarParaLista() {
      passo = "lista";
      resumo.hidden = true;
      corpo.hidden = false;
      cabecalho.hidden = false;
      U.$$(".biblioteca-origens", janela).forEach(function (b) { b.hidden = false; });
      atualizarRodape();
      m.corpo.scrollTop = rolagemDaLista;
    }

    function pintarResumo(motivos) {
      var entram = sel.itens.map(function (i) {
        return el("li", {}, [
          el("strong", { texto: i.nome }),
          el("span.t-mini", {
            texto: " · " + (i.circulo ? i.circulo + "º círculo" : "círculo não informado") +
                   (i.elemento && RT() ? " · " + RT().nomeDoElemento(i.elemento) : "") +
                   (i.novo ? " · cópia nova, " + (i.origem === "homebrew" ? "da Homebrew" : "do catálogo") : " · já na ficha, sem cópia"),
          }),
        ]);
      });
      var saem = Object.keys(sel.saem).map(function (rid) {
        var r = ritualDaFicha(rid);
        return el("li", { texto: (r ? r.nome : "ritual") + " — sai desta concessão e continua na ficha, como registro" });
      });

      var partes = [
        el("h3.t-secao", { texto: "Antes de gravar" }),
        el("p", {}, [
          el("span", { texto: "Aquisição: " }),
          el("strong", { texto: aq.rotulo }),
          el("span", { texto: (aq.rotuloEtapa ? " · " + aq.rotuloEtapa : "") + (aq.nomePoder && aq.nomePoder !== aq.rotulo ? " · " + aq.nomePoder : "") }),
        ]),
        entram.length ? el("h4.t-rotulo", { texto: "Entram" }) : null,
        entram.length ? el("ul.bib-lista-textos", {}, entram) : null,
        saem.length ? el("h4.t-rotulo", { texto: "Saem" }) : null,
        saem.length ? el("ul.bib-lista-textos", {}, saem) : null,
      ];

      if (aq.tipo === "concessao") {
        var total = totalDepois();
        partes.push(el("p.t-mini", {
          texto: "Depois de gravar: " + total + " de " + aq.quantidade +
                 (total < aq.quantidade ? " — a pendência continua aberta com o que falta." : " — a concessão fica completa."),
        }));
      }

      if (aq.tipo === "campo") partes.push(formularioDeEstudo());

      partes.push(el("p.t-mini", { texto: "Nenhum PE é gasto e nenhum dado é rolado." }));
      if (motivos && motivos.length) {
        partes.push(el("div.pilha--curta.bib-resumo__erro", { class: "pilha", role: "alert" },
          [el("p.t-erro", { texto: "Não foi gravado:" })].concat(motivos.map(function (x) { return el("p.t-mini.t-erro", { texto: x }); }))));
      }
      U.trocar(resumo, partes);
    }

    /* O estudo em campo depende de acontecimentos da mesa: a fonte foi
       achada e o teste passou. A janela pergunta — selecionar o ritual
       na biblioteca não prova nenhum dos dois. */
    function formularioDeEstudo() {
      var item = sel.itens[0];
      var dt = item && AP() ? AP().dtDeEstudo(item.circulo) : 0;
      var idConf = id + "-estudo-conf";
      var idFonte = id + "-estudo-fonte";
      var idNota = id + "-estudo-nota";
      return el("div.pilha--curta.bib-estudo", { class: "pilha" }, [
        el("p.t-mini", {
          texto: "Sobrevivendo ao Horror, p. 113: o estudo gasta uma ação de interlúdio e exige Ocultismo DT " + (dt || "—") +
                 (item && item.circulo ? " (" + item.circulo + "º círculo)" : "") + ". Na falha, pode tentar de novo com outra ação de interlúdio.",
        }),
        el("div.r-campo", {}, [
          el("label.r-rotulo", { for: idFonte, texto: "De onde veio o ritual" }),
          el("select.r-selecao", {
            id: idFonte,
            onchange: function (ev) { resumoCampo.fonte = ev.target.value; },
          }, [el("option", { value: "", texto: "Não informar" })].concat((AP() ? AP().FONTES_DE_ESTUDO : []).map(function (f) {
            return el("option", { value: f.chave, texto: f.nome, selected: resumoCampo.fonte === f.chave });
          }))),
        ]),
        el("div.r-campo", {}, [
          el("label.r-rotulo", { for: idNota, texto: "Nota (opcional)" }),
          el("input.r-entrada", {
            id: idNota, type: "text", maxlength: "300", value: resumoCampo.nota,
            placeholder: "Pergaminho do porão, missão 3…",
            oninput: function (ev) { resumoCampo.nota = ev.target.value; },
          }),
        ]),
        el("label.bib-alternar", { for: idConf }, [
          el("input", {
            id: idConf, type: "checkbox", checked: resumoCampo.confirmado,
            onchange: function (ev) { resumoCampo.confirmado = ev.target.checked; },
          }),
          el("span", { texto: "Confirmo que o personagem encontrou a fonte deste ritual e passou no teste de Ocultismo." }),
        ]),
      ]);
    }

    function gravar(fechar) {
      if (gravando) return;
      if (aq.tipo === "campo" && !resumoCampo.confirmado) {
        pintarResumo(["Falta confirmar o estudo: a fonte achada e o teste de Ocultismo que passou."]);
        return;
      }
      gravando = true;
      atualizarRodape();

      var operacao;
      var novos = sel.itens.filter(function (i) { return i.novo; }).map(function (i) { return i.ritual; });
      if (aq.tipo === "concessao") {
        operacao = {
          tipo: "concessao", vaga: aq.vaga, novos: novos,
          rituais: escolhidosQueFicam().concat(sel.itens.map(function (i) { return i.ritual.id; })),
        };
      } else if (aq.tipo === "campo") {
        operacao = {
          tipo: "campo", ritualId: sel.itens[0].ritual.id, novos: novos,
          fonte: resumoCampo.fonte, nota: resumoCampo.nota, confirmado: resumoCampo.confirmado === true,
        };
      }

      var r = operacao
        ? E().confirmarAquisicao(ordemDe(ctx), rituaisDaFicha(ctx), operacao, contextoDaFicha())
        : { ok: false, motivos: ["Esta aquisição não grava por aqui."] };
      gravando = false;

      if (!r.ok) {
        pintarResumo(r.motivos);
        atualizarRodape();
        return;
      }

      sel = { itens: [], saem: {} };
      ctx.alterou();
      ctx.redesenhar();
      if (aoMudar) aoMudar();
      fechar();
      UI.avisoOk(aq.tipo === "campo"
        ? "Estudo registrado: o ritual passou a ser conhecido."
        : "Rituais gravados em " + aq.rotulo + ".");
    }

    /* --------------------------------------------------------------- */

    pintar();

    var m = UI.modal({
      titulo: aq
        ? (aq.fixo ? "Trazer " + aq.fixo.nome : (aq.tipo === "campo" ? "Estudo em campo" : "Escolher rituais — " + aq.rotulo))
        : "Da biblioteca",
      largo: true,
      classe: "r-modal--biblioteca" + (aq ? " r-modal--aquisicao" : ""),
      conteudo: janela,
      botoes: aq
        ? [
            { rotulo: "Cancelar", classe: "r-botao--fantasma", aoClicar: aoSecundario },
            { rotulo: rotuloPrincipal(), classe: "r-botao--principal", aoClicar: aoPrincipal },
          ]
        : [{ rotulo: "Fechar", classe: "r-botao--fantasma" }],
      aoFechar: function () {
        aberta = false;
        /* Fechar descarta a seleção inteira: nada dela chegou à ficha. */
        sel = { itens: [], saem: {} };
      },
    });

    if (aq) {
      var rodape = m.janela.querySelector(".r-modal__rodape");
      if (rodape) rodape.insertBefore(rodapeStatus, rodape.firstChild);
      atualizarRodape();
    }

    return m;
  }

  global.RAMABibliotecaDeRituais = { abrir: abrir, TIPOS_DE_RITUAL: TIPOS_DE_RITUAL };
})(window);
