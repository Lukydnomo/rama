/* =====================================================================
   R.A.M.A. — Ordem Paranormal · telas de escolha
   =====================================================================
   A janela que resolve uma pendência de progressão. É a MESMA na
   criação guiada e na aba Progressão: as duas entregam um objeto
   `ordem`, e esta tela registra a decisão nele pelo motor de
   progressão. Quem chamou decide o que fazer depois — a ficha salva, a
   criação só redesenha o resumo.

   ---------------------------------------------------------------------
   O QUE ESTA TELA PROMETE
   ---------------------------------------------------------------------

     · só mostra opções pertinentes à vaga: poder de classe numa vaga
       de poder de classe, perícias treinadas num grau de treinamento;
     · toda opção indisponível continua visível, com o motivo escrito;
     · o botão de confirmar só acende quando a decisão está completa e
       válida — e a própria tela diz o que falta;
     · trocar uma escolha mostra ANTES o que sai, o que entra e o que
       deixa de valer por causa disso;
     · nada é digitado à mão onde existe catálogo.

   A validação não é refeita aqui: cada mudança pergunta ao motor
   (`simular`), que usa exatamente a conta que a ficha vai usar.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var C = global.RAMAOrdemCatalogo;
  var P = global.RAMAOrdemPoderes;
  var E = global.RAMAOrdemProgressao;
  var OP = global.RAMAOrdemOpcionais;
  function A() { return global.RAMAOrdemAprendizado; }
  function RT() { return global.RAMAOrdemRituais; }
  function BIB() { return global.RAMABibliotecaDeRituais; }
  var el = U.el;

  var ROTULO_FONTE = { OPRPG: "Livro básico", SAH: "Sobrevivendo ao Horror" };

  function copiar(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

  function registroDaVaga(ordem, idVaga) {
    return (ordem.escolhas || []).filter(function (r) { return r.etapa === idVaga; })[0] || null;
  }

  function vagaPorId(ordem, idVaga) {
    return E.vagas(ordem).filter(function (v) { return v.id === idVaga; })[0] || null;
  }

  /* =================================================================
     ETIQUETAS
     ================================================================= */

  function etiquetaAutomacao(automacao) {
    if (automacao === "calculo") return el("span.etiqueta.etiqueta--calculo", { texto: "entra na conta" });
    if (automacao === "parcial") return el("span.etiqueta.etiqueta--parcial", { texto: "parte na conta" });
    return el("span.etiqueta", { texto: "anotação" });
  }

  function rotuloTipoPoder(e, classe) {
    if (e.tipo === "geral") return "Poder geral";
    if (e.tipo === "paranormal") {
      var el2 = e.elemento ? C.elemento(e.elemento) : null;
      return "Poder paranormal" + (el2 ? " · " + el2.nome : "");
    }
    if (e.tipo === "trilha") {
      var tr = C.trilha(e.trilha);
      return "Trilha " + (tr ? tr.nome : "") + " · NEX " + e.nex + "%";
    }
    if (e.tipo === "classe") {
      if (classe && e.classes.indexOf(classe) < 0 && e.geral) return "Poder geral (antes de " + e.classes.map(nomeDaClasse).join(" e ") + ")";
      return "Poder de " + e.classes.map(nomeDaClasse).join(", ").toLowerCase();
    }
    return "";
  }

  function nomeDaClasse(k) { var c = C.classe(k); return c ? c.nome : k; }
  function nomeDaPericia(k) { var p = C.pericia(k); return p ? p.nome : k; }

  /* =================================================================
     CARTÃO DE PODER
     ================================================================= */

  function cartaoDePoder(cand, escolhido, aoEscolher, classe) {
    var e = cand.entrada;
    var indisponivel = !cand.disponivel;

    var marcas = [
      el("span.etiqueta", { texto: rotuloTipoPoder(e, classe) }),
      el("span.etiqueta", { texto: ROTULO_FONTE[e.fonte] || e.fonte }),
      etiquetaAutomacao(e.automacao),
    ];
    if (cand.segundaComAfinidade) marcas.push(el("span.etiqueta.etiqueta--calculo", { texto: "2ª escolha: afinidade" }));
    if (e.repetivel) marcas.push(el("span.etiqueta", { texto: "repetível" }));

    var requisitos = (cand.requisitos || []).filter(function (r) { return r.texto; });

    return el("button.criacao-opcao.escolha-cartao", {
      type: "button",
      class: (escolhido ? "criacao-opcao--escolhida " : "") + (indisponivel ? "escolha-cartao--indisponivel" : ""),
      "aria-pressed": String(!!escolhido),
      "aria-disabled": indisponivel ? "true" : null,
      "aria-label": e.nome + (indisponivel ? ", indisponível: " + cand.motivos.join(" ") : "") + ". " + e.resumo,
      onclick: function () {
        if (indisponivel) {
          UI.avisoAtencao(e.nome + ": " + cand.motivos.join(" "));
          return;
        }
        aoEscolher(e.chave);
      },
    }, [
      el("span.criacao-opcao__nome", { texto: e.nome }),
      el("span.escolha-marcas", {}, marcas),
      el("span.criacao-opcao__texto.escolha-cartao__resumo", { texto: e.resumo }),
      e.afinidade ? el("span.criacao-opcao__texto", { texto: "Afinidade: " + e.afinidade }) : null,
      requisitos.length
        ? el("span.escolha-requisitos", {}, requisitos.map(function (r) {
            return el("span.escolha-requisito", { class: r.ok ? "escolha-requisito--ok" : "escolha-requisito--falta" }, [
              el("span", { "aria-hidden": "true", texto: r.ok ? "✓ " : "✗ " }),
              el("span.so-leitor", { texto: r.ok ? "cumprido: " : "não cumprido: " }),
              el("span", { texto: r.texto }),
            ]);
          }))
        : null,
      indisponivel ? el("span.escolha-motivo", { texto: "Indisponível. " + cand.motivos.join(" ") }) : null,
      e.nota ? el("span.criacao-opcao__fonte", { texto: e.nota }) : null,
      el("span.criacao-opcao__fonte", { texto: P.referencia(e, classe) }),
    ]);
  }

  /* =================================================================
     LISTA DE PODERES, COM BUSCA E FILTROS
     -----------------------------------------------------------------
     A busca e os filtros vivem fora do desenho: redesenhar a janela
     depois de uma escolha não pode zerar o que a pessoa digitou.
     ================================================================= */

  function seletorDePoder(sessao, chaveFiltro, candidatos, valorAtual, aoEscolher, opcoes) {
    var o = opcoes || {};
    var f = sessao.filtros[chaveFiltro] || (sessao.filtros[chaveFiltro] = { busca: "", fonte: "", elemento: "", soDisponiveis: false });

    var lista = el("div.criacao-lista.escolha-lista", { role: "list" });

    function pintarLista() {
      var termo = U.chaveDeBusca(f.busca);
      var visiveis = candidatos.filter(function (c) {
        var e = c.entrada;
        if (termo && U.chaveDeBusca(e.nome + " " + e.resumo).indexOf(termo) < 0) return false;
        if (f.fonte && e.fonte !== f.fonte) return false;
        if (f.elemento && (e.elemento || "sem") !== f.elemento) return false;
        if (f.soDisponiveis && !c.disponivel) return false;
        return true;
      }).sort(function (a, b) {
        if (a.entrada.chave === valorAtual) return -1;
        if (b.entrada.chave === valorAtual) return 1;
        if (a.disponivel !== b.disponivel) return a.disponivel ? -1 : 1;
        return a.entrada.nome.localeCompare(b.entrada.nome, "pt-BR");
      });

      var disponiveis = candidatos.filter(function (c) { return c.disponivel; }).length;

      U.trocar(lista, visiveis.length
        ? visiveis.map(function (c) {
            return el("div", { role: "listitem" }, [cartaoDePoder(c, c.entrada.chave === valorAtual, aoEscolher, sessao.ordem.classe)]);
          })
        : el("p.t-mini", { texto: "Nada corresponde aos filtros." }));

      contagem.textContent = visiveis.length + " mostrado(s) · " + disponiveis + " disponível(is) de " + candidatos.length;
    }

    var contagem = el("p.t-mini", { "aria-live": "polite" });

    var busca = el("input.r-entrada", {
      type: "search", placeholder: "Buscar por nome ou efeito", "aria-label": "Buscar",
      value: f.busca,
      oninput: function (ev) { f.busca = ev.target.value; pintarLista(); },
    });

    function botaoFiltro(rotulo, ativo, aoClicar) {
      return el("button.filtro", { type: "button", texto: rotulo, "aria-pressed": String(ativo), onclick: aoClicar });
    }

    var grupoFonte = el("div.filtros__grupo", { role: "group", "aria-label": "Livro" }, [
      botaoFiltro("Todos os livros", !f.fonte, function () { f.fonte = ""; sessao.pintar(); }),
      botaoFiltro("Livro básico", f.fonte === "OPRPG", function () { f.fonte = "OPRPG"; sessao.pintar(); }),
      botaoFiltro("Sobrevivendo ao Horror", f.fonte === "SAH", function () { f.fonte = "SAH"; sessao.pintar(); }),
    ]);

    var grupoElemento = o.porElemento
      ? el("div.filtros__grupo", { role: "group", "aria-label": "Elemento" },
          [{ v: "", r: "Todos os elementos" }, { v: "conhecimento", r: "Conhecimento" }, { v: "energia", r: "Energia" },
           { v: "morte", r: "Morte" }, { v: "sangue", r: "Sangue" }, { v: "sem", r: "Sem elemento fixo" }]
            .map(function (x) {
              return botaoFiltro(x.r, f.elemento === x.v, function () { f.elemento = x.v; sessao.pintar(); });
            }))
      : null;

    var soDisponiveis = el("label.r-marca", {}, [
      el("input", { type: "checkbox", checked: f.soDisponiveis, onchange: function (ev) { f.soDisponiveis = ev.target.checked; pintarLista(); } }),
      el("span", { texto: "Só as disponíveis" }),
    ]);

    pintarLista();

    /* Vaga com uma opção só — o Possuído, que só transcende — não
       precisa de busca, filtros nem contagem. */
    if (candidatos.length < 2) return el("div.pilha--curta.escolha-seletor", { class: "pilha" }, [lista]);

    return el("div.pilha--curta.escolha-seletor", { class: "pilha" }, [
      el("div.r-busca", {}, [el("span.r-busca__marca", {}, [UI.simbolo("busca")]), busca]),
      el("div.filtros", {}, [grupoFonte, grupoElemento]),
      soDisponiveis,
      contagem,
      lista,
    ]);
  }

  /* =================================================================
     GRADES DE PERÍCIA, ATRIBUTO E ELEMENTO
     ================================================================= */

  function gradeDePericias(candidatos, selecionadas, maximo, aoAlternar) {
    return el("div.criacao-pericias", { role: "group" }, candidatos.map(function (c) {
      var marcada = selecionadas.indexOf(c.pericia.chave) >= 0;
      var cheia = !marcada && maximo && selecionadas.length >= maximo;
      var bloqueada = !c.disponivel && !marcada;
      var motivo = bloqueada ? c.motivos.join(" ") : (cheia ? "Já há " + maximo + " escolhida(s)." : "");
      return el("button.criacao-pericia", {
        type: "button",
        "aria-pressed": String(marcada),
        "aria-disabled": (bloqueada || cheia) ? "true" : null,
        "aria-label": c.pericia.nome + ", " + c.grau + (c.novoGrau && c.novoGrau !== c.grau ? " para " + c.novoGrau : "") + (motivo ? ". " + motivo : ""),
        class: (marcada ? "criacao-pericia--marcada " : "") + ((bloqueada || cheia) ? "criacao-pericia--bloqueada" : ""),
        title: motivo,
        onclick: function () {
          if (bloqueada) { UI.avisoAtencao(motivo); return; }
          if (cheia) { UI.avisoAtencao(motivo + " Desmarque uma antes."); return; }
          aoAlternar(c.pericia.chave);
        },
      }, [
        el("span.criacao-pericia__nome", { texto: c.pericia.nome }),
        el("span.criacao-pericia__atrib", {
          texto: c.grau + (c.novoGrau && c.novoGrau !== c.grau ? " → " + c.novoGrau : ""),
        }),
        motivo ? el("span.criacao-pericia__motivo", { texto: motivo }) : null,
      ]);
    }));
  }

  function botoesDeEscolha(itens, atual, aoEscolher) {
    return el("div.faixa.escolha-botoes", { role: "group" }, itens.map(function (x) {
      return el("button.r-botao.r-botao--mini", {
        type: "button",
        class: atual === x.valor ? "r-botao--principal" : "r-botao--fantasma",
        "aria-pressed": String(atual === x.valor),
        "aria-disabled": x.motivo ? "true" : null,
        title: x.motivo || x.ajuda || "",
        texto: x.rotulo,
        onclick: function () {
          if (x.motivo) { UI.avisoAtencao(x.motivo); return; }
          aoEscolher(x.valor);
        },
      });
    }));
  }

  /* =================================================================
     OPÇÕES INTERNAS
     ================================================================= */

  function painelDeOpcoes(sessao, schema, valores, prefixo, prof) {
    var prof2 = prof || 0;
    return el("div.pilha.escolha-opcoes", {}, (schema || []).map(function (op) {
      return el("div.pilha--curta.escolha-opcao", { class: "pilha" }, [
        el("h4.t-secao", { texto: op.rotulo + (op.opcional ? " (opcional)" : "") }),
        op.ajuda ? el("p.t-mini", { texto: op.ajuda }) : null,
        controleDeOpcao(sessao, op, valores, prefixo + "." + op.chave, prof2),
      ]);
    }));
  }

  function controleDeOpcao(sessao, op, valores, caminho, prof) {
    var ordem = sessao.ordem;
    var vagaId = sessao.vaga.id;
    var contexto = sessao.contexto;
    var atual = valores[op.chave];

    switch (op.tipo) {
      case "pericia": {
        var modo = op.modo || (sessao.entradaAtual && sessao.entradaAtual.chave === "focoEmPericia" ? "treinada" : "livre");
        var cands = E.candidatosPericia(ordem, vagaId, contexto, modo, { entre: op.entre, exceto: op.exceto });
        return gradeDePericias(cands, atual ? [atual] : [], 1, function (k) {
          valores[op.chave] = atual === k ? "" : k;
          sessao.pintar();
        });
      }

      case "pericias": {
        var lista = Array.isArray(atual) ? atual : [];
        var cands2 = E.candidatosPericia(ordem, vagaId, contexto, op.modo || "livre", { entre: op.entre, exceto: op.exceto });
        return el("div.pilha--curta", { class: "pilha" }, [
          el("p.t-mini", { texto: "Escolhidas: " + lista.length + " de " + op.quantidade + "." }),
          gradeDePericias(cands2, lista, op.quantidade, function (k) {
            var i = lista.indexOf(k);
            var nova = lista.slice();
            if (i >= 0) nova.splice(i, 1); else nova.push(k);
            valores[op.chave] = nova;
            sessao.pintar();
          }),
        ]);
      }

      case "atributo":
        return botoesDeEscolha(C.ATRIBUTOS.map(function (a) {
          return { valor: a.chave, rotulo: a.nome, motivo: op.exceto && op.exceto.indexOf(a.chave) >= 0 ? a.nome + " não pode ser escolhido aqui." : "" };
        }), atual, function (v) { valores[op.chave] = v; sessao.pintar(); });

      case "elemento": {
        var lista3 = E.ELEMENTOS_PODER.concat(op.comMedo ? ["medo"] : []);
        return botoesDeEscolha(lista3.map(function (k) {
          var e = C.elemento(k);
          return { valor: k, rotulo: e ? e.nome : k, ajuda: e ? e.resumo : "" };
        }), atual, function (v) { valores[op.chave] = v; sessao.pintar(); });
      }

      case "escolha":
        return botoesDeEscolha((op.valores || []).map(function (v) {
          return { valor: v, rotulo: v.charAt(0).toUpperCase() + v.slice(1) };
        }), atual, function (v) { valores[op.chave] = v; sessao.pintar(); });

      case "texto": {
        var campo = UI.campo({ rotulo: op.rotulo, valor: atual || "", limite: op.limite || 80, dica: op.dica });
        campo.entrada.addEventListener("input", function () {
          valores[op.chave] = campo.entrada.value.trim();
          sessao.atualizarStatus();
        });
        return campo;
      }

      /* Aprender Ritual (OPRPG p.114). O vínculo é com um ritual DA
         FICHA, não com um nome escrito: é ele que diz depois "este
         ritual veio daqui". O círculo permitido vem do NEX de
         exposição, e o que não cabe aparece com o motivo. */
      case "ritualAprendido":
      case "ritualDaFicha": {
        var daFicha = sessao.rituais || [];
        var soConhecidos = op.tipo === "ritualDaFicha";
        var maximo = (op.tipo === "ritualAprendido" && A())
          ? A().circuloDeAprenderRitual(R_exposicao(ordem))
          : 0;

        var cartoes = daFicha.map(function (r) {
          var dados = RT() ? RT().dadosDoRitual(r) : {};
          var circulo = Number(dados.circulo) || 0;
          var motivo = "";
          if (maximo) {
            if (!circulo) motivo = "Este ritual não informa o círculo.";
            else if (circulo > maximo) motivo = "Aprender Ritual alcança o " + maximo + "º círculo com NEX de exposição " + R_exposicao(ordem) + "%.";
          }
          return {
            valor: r.id,
            rotulo: r.nome + (circulo ? " · " + circulo + "º círculo" : ""),
            motivo: motivo,
          };
        });

        var escolhido = (atual && typeof atual === "object") ? atual.id : "";

        return el("div.pilha--curta", { class: "pilha" }, [
          cartoes.length
            ? botoesDeEscolha(cartoes, escolhido, function (v) {
                var r = daFicha.filter(function (x) { return x.id === v; })[0];
                valores[op.chave] = (escolhido === v) ? undefined : (E.vinculoDeRitual(r) || undefined);
                sessao.pintar();
              })
            : el("p.t-mini", { texto: "Esta ficha ainda não tem rituais registrados." }),

          (!soConhecidos && sessao.ctx && BIB())
            ? el("button.r-botao.r-botao--mini", {
                type: "button", texto: "Trazer um ritual da biblioteca",
                onclick: function () {
                  BIB().abrir(sessao.ctx, {
                    aoAdicionarRitual: function (ritual) {
                      sessao.rituais = (sessao.ctx.ficha.rituais && sessao.ctx.ficha.rituais.itens) || sessao.rituais;
                      valores[op.chave] = E.vinculoDeRitual(ritual) || undefined;
                      sessao.pintar();
                    },
                  });
                },
              })
            : null,

          /* O texto que as fichas anteriores guardavam. Ele fica à
             vista até alguém prendê-lo a um ritual de verdade — apagar
             seria perder a única informação que sobrou. */
          (op.tipo === "ritualAprendido" && typeof valores.ritual === "string" && valores.ritual.trim())
            ? el("p.t-mini.t-aviso", {
                texto: "Ficha anterior: este Aprender Ritual guarda só o nome “" + valores.ritual +
                       "”. Escolher acima prende a escolha a um ritual da ficha; o nome continua guardado.",
              })
            : null,
        ]);
      }

      case "ritual": {
        var rituais = sessao.rituais || [];
        var campoR = UI.campo({
          rotulo: "Nome do ritual", valor: atual || "", limite: 80,
          ajuda: rituais.length ? "Escolha um ritual da ficha ou escreva o nome." : "Escreva o nome do ritual. Ele fica anotado; o ritual em si vai na aba de rituais.",
        });
        campoR.entrada.addEventListener("input", function () {
          valores[op.chave] = campoR.entrada.value.trim();
          sessao.atualizarStatus();
        });
        return el("div.pilha--curta", { class: "pilha" }, [
          rituais.length
            ? botoesDeEscolha(rituais.map(function (r) { return { valor: r.nome, rotulo: r.nome }; }), atual, function (v) {
                valores[op.chave] = v;
                sessao.pintar();
              })
            : null,
          campoR,
        ]);
      }

      case "item":
      case "itens": {
        var itens = contexto && contexto.inventario ? (contexto.inventario.itens || []) : null;
        if (!itens) {
          return el("p.t-mini", { texto: "Esta opção escolhe um item do inventário. Resolva depois de criar o personagem e adicionar o item — a pendência fica aberta até lá." });
        }
        var I = global.RAMAOrdemInventario;
        var elegiveis = itens.filter(function (i) {
          if (!i) return false;
          if (op.excetoArmas && i.tipo === "arma") return false;
          if (op.apenasArmas && i.tipo !== "arma") return false;
          if (op.grupo && I && I.dadosDoItem(i).grupo !== op.grupo) return false;
          return true;
        });
        if (!elegiveis.length) {
          return el("p.t-mini", {
            texto: op.grupo === "paranormal"
              ? "Nenhum item marcado como paranormal no inventário. Marque o grupo do item no inventário e volte aqui."
              : (op.apenasArmas ? "Nenhuma arma no inventário ainda." : "Nenhum item elegível no inventário ainda."),
          });
        }
        if (op.tipo === "item") {
          return botoesDeEscolha(elegiveis.map(function (i) { return { valor: i.id, rotulo: i.nome }; }), atual, function (v) {
            valores[op.chave] = v;
            sessao.pintar();
          });
        }
        var marcados = Array.isArray(atual) ? atual : [];
        return el("div.pilha--curta", { class: "pilha" }, elegiveis.map(function (i) {
          return el("label.r-marca", {}, [
            el("input", {
              type: "checkbox", checked: marcados.indexOf(i.id) >= 0,
              onchange: function (ev) {
                var nova = marcados.filter(function (x) { return x !== i.id; });
                if (ev.target.checked) nova.push(i.id);
                valores[op.chave] = nova;
                sessao.pintar();
              },
            }),
            el("span", { texto: i.nome }),
          ]);
        }));
      }

      case "origem": {
        var campoO = UI.campo({
          rotulo: op.rotulo, tipo: "selecao", valor: atual || "",
          opcoes: [{ valor: "", rotulo: "Escolha uma origem" }].concat(C.ORIGENS.filter(function (x) {
            return x.chave !== ordem.origem;
          }).map(function (x) { return { valor: x.chave, rotulo: x.nome + " — " + x.poder }; })),
          aoMudar: function (v) { valores[op.chave] = v; sessao.pintar(); },
        });
        var org = C.origem(atual);
        return el("div.pilha--curta", { class: "pilha" }, [
          campoO,
          org ? el("p.t-mini", { texto: org.poder + ": " + org.resumo }) : null,
          org ? etiquetaAutomacao(org.automacao) : null,
        ]);
      }

      case "poderParanormal":
      case "poderOutraClasse":
      case "poderDaClasse": {
        var sub = atual && typeof atual === "object" ? atual : null;
        var candidatos = op.tipo === "poderParanormal"
          ? E.candidatosParanormais(ordem, vagaId, contexto)
          : (op.tipo === "poderOutraClasse" ? E.candidatosOutraClasse(ordem, vagaId, contexto) : E.candidatosPoderClasse(ordem, vagaId, contexto));
        var escolhida = sub && sub.valor ? P.poder(sub.valor) : null;
        return el("div.pilha", {}, [
          seletorDePoder(sessao, caminho, candidatos, sub ? sub.valor : "", function (k) {
            if (sub && sub.valor === k) return;
            valores[op.chave] = { valor: k, opcoes: {} };
            sessao.pintar();
          }, { porElemento: op.tipo === "poderParanormal" }),
          escolhida && escolhida.opcoes.length && prof < 3
            ? el("div.escolha-aninhada", {}, [
                el("p.t-secao", { texto: "Opções de " + escolhida.nome }),
                painelDeOpcoes(sessao, escolhida.opcoes, sub.opcoes, caminho, prof + 1),
              ])
            : null,
        ]);
      }

      case "trilhaOutra": {
        var subT = atual && typeof atual === "object" ? atual : null;
        var trilhas = E.candidatosTrilha(ordem, vagaId, contexto, true);
        var tr = subT && subT.valor ? C.trilha(subT.valor) : null;
        var primeira = tr ? P.primeiraDaTrilha(tr.chave) : null;
        return el("div.pilha", {}, [
          el("div.criacao-lista.escolha-lista", {}, trilhas.map(function (c) {
            var h = c.primeira;
            return cartaoDeTrilha(c, subT && subT.valor === c.trilha.chave, function () {
              valores[op.chave] = { valor: c.trilha.chave, opcoes: {} };
              sessao.pintar();
            }, h ? "Primeiro poder: " + h.nome + " — " + h.resumo : "");
          })),
          primeira && primeira.opcoes.length && prof < 3
            ? el("div.escolha-aninhada", {}, [
                el("p.t-secao", { texto: "Opções de " + primeira.nome }),
                painelDeOpcoes(sessao, primeira.opcoes, subT.opcoes, caminho, prof + 1),
              ])
            : null,
        ]);
      }

      case "caminho": {
        var subC = atual && typeof atual === "object" ? atual : null;
        var cam = subC ? (op.caminhos || []).filter(function (c) { return c.valor === subC.valor; })[0] : null;
        var ponte = {};
        if (cam) {
          Object.defineProperty(ponte, cam.opcao.chave, {
            enumerable: true,
            get: function () { return valores[op.chave].sub; },
            set: function (v) { valores[op.chave].sub = v; },
          });
        }
        return el("div.pilha", {}, [
          botoesDeEscolha((op.caminhos || []).map(function (c) { return { valor: c.valor, rotulo: c.rotulo }; }),
            subC ? subC.valor : "", function (v) {
              valores[op.chave] = { valor: v, sub: undefined };
              sessao.pintar();
            }),
          cam ? controleDeOpcao(sessao, cam.opcao, ponte, caminho + "." + cam.valor, prof + 1) : null,
        ]);
      }

      default:
        return el("p.t-mini", { texto: "Opção sem tela: " + op.tipo });
    }
  }

  function cartaoDeTrilha(c, escolhida, aoEscolher, extra) {
    var tr = c.trilha;
    return el("button.criacao-opcao.escolha-cartao", {
      type: "button",
      class: (escolhida ? "criacao-opcao--escolhida " : "") + (c.disponivel ? "" : "escolha-cartao--indisponivel"),
      "aria-pressed": String(!!escolhida),
      "aria-disabled": c.disponivel ? null : "true",
      "aria-label": tr.nome + (c.disponivel ? "" : ", indisponível: " + c.motivos.join(" ")) + ". " + tr.resumo,
      onclick: function () {
        if (!c.disponivel) { UI.avisoAtencao(tr.nome + ": " + c.motivos.join(" ")); return; }
        aoEscolher();
      },
    }, [
      el("span.criacao-opcao__nome", { texto: tr.nome }),
      el("span.escolha-marcas", {}, [el("span.etiqueta", { texto: ROTULO_FONTE[tr.fonte || "OPRPG"] })]),
      el("span.criacao-opcao__texto", { texto: tr.resumo }),
      extra ? el("span.criacao-opcao__texto", { texto: extra }) : null,
      tr.especial ? el("span.criacao-opcao__texto", { texto: "Especial: " + tr.especial }) : null,
      (c.requisitos || []).length
        ? el("span.escolha-requisitos", {}, c.requisitos.map(function (r) {
            return el("span.escolha-requisito", { class: r.ok ? "escolha-requisito--ok" : "escolha-requisito--falta", texto: (r.ok ? "✓ " : "✗ ") + r.texto });
          }))
        : null,
      tr.requisitoNota ? el("span.criacao-opcao__fonte", { texto: tr.requisitoNota }) : null,
      c.disponivel ? null : el("span.escolha-motivo", { texto: "Indisponível. " + c.motivos.join(" ") }),
      el("span.criacao-opcao__fonte", { texto: C.referencia(tr) }),
    ]);
  }

  /* =================================================================
     A JANELA DE ESCOLHA
     ================================================================= */

  function abrir(opcoes) {
    var o = opcoes || {};
    var ordem = o.ordem;
    var vaga = vagaPorId(ordem, o.vagaId);

    if (!vaga) {
      UI.avisoErro("Esta etapa não faz mais parte da progressão do personagem.");
      return null;
    }
    if (vaga.tipo === "afinidade") return abrirAfinidade(o);
    if (vaga.tipo === "trilha") return abrirTrilha(o, vaga);
    if (vaga.tipo === "rituais") return abrirRituais(o, vaga);

    var existente = registroDaVaga(ordem, vaga.id);
    var candidato = existente
      ? { valor: existente.valor, opcoes: copiar(existente.opcoes) || {} }
      : { valor: "", opcoes: {} };

    var corpo = el("div.pilha.escolha-corpo");
    var status = el("div.escolha-status", { "aria-live": "polite" });

    var sessao = {
      ordem: ordem,
      vaga: vaga,
      contexto: o.contexto || null,
      /* A ficha inteira, quando quem chamou a tem: é por ela que a
         biblioteca de rituais entra em cima desta janela. */
      ctx: o.ctx || null,
      rituais: o.rituais || [],
      filtros: {},
      entradaAtual: null,
      pintar: pintar,
      atualizarStatus: atualizarStatus,
    };

    var m = UI.modal({
      titulo: vaga.rotulo + " — " + vaga.rotuloEtapa,
      largo: true,
      conteudo: [corpo, status],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: existente ? "Trocar escolha" : "Confirmar", classe: "r-botao--principal", aoClicar: confirmar },
      ],
    });
    var botao = m.janela.querySelector(".r-modal__rodape .r-botao--principal");

    function pintar() {
      /* Redesenhar preserva a rolagem da janela: escolher um poder no
         meio da lista não pode jogar a pessoa de volta ao topo. */
      var rolagem = m.corpo.scrollTop;
      U.trocar(corpo, desenhar());
      m.corpo.scrollTop = rolagem;
      atualizarStatus();
    }

    function desenhar() {
      var partes = [el("p", { texto: vaga.explicacao })];

      switch (vaga.tipo) {
        case "poderClasse": {
          var e = candidato.valor ? P.poder(candidato.valor) : null;
          sessao.entradaAtual = e;
          partes.push(seletorDePoder(sessao, "raiz", E.candidatosPoderClasse(ordem, vaga.id, sessao.contexto), candidato.valor, function (k) {
            if (candidato.valor === k) return;
            candidato.valor = k;
            candidato.opcoes = {};
            pintar();
          }));
          if (e && e.opcoes.length) {
            partes.push(el("div.escolha-aninhada", {}, [
              el("p.t-secao", { texto: "Opções de " + e.nome }),
              painelDeOpcoes(sessao, e.opcoes, candidato.opcoes, "raiz", 0),
            ]));
          }
          break;
        }

        case "versatilidade":
          partes.push(botoesDeEscolha([
            { valor: "poderClasse", rotulo: vaga.soTranscender ? "Transcender, no lugar do poder de ocultista" : "Um poder de classe" },
            { valor: "trilha", rotulo: "O primeiro poder de outra trilha" },
          ], candidato.valor, function (v) {
            if (candidato.valor === v) return;
            candidato.valor = v;
            candidato.opcoes = {};
            pintar();
          }));
          if (candidato.valor === "poderClasse") {
            partes.push(painelDeOpcoes(sessao, [{ chave: "poder", tipo: "poderDaClasse", rotulo: "Poder de classe" }], candidato.opcoes, "raiz", 0));
          } else if (candidato.valor === "trilha") {
            partes.push(painelDeOpcoes(sessao, [{ chave: "trilha", tipo: "trilhaOutra", rotulo: "Trilha" }], candidato.opcoes, "raiz", 0));
          }
          break;

        case "atributo": {
          var cands = E.candidatosAtributo(ordem, vaga.id, sessao.contexto);
          partes.push(el("div.escolha-atributos", { role: "group", "aria-label": "Atributo" }, cands.map(function (c) {
            var marcado = candidato.valor === c.atributo.chave;
            return el("button.criacao-opcao.escolha-cartao", {
              type: "button",
              class: (marcado ? "criacao-opcao--escolhida " : "") + (c.disponivel ? "" : "escolha-cartao--indisponivel"),
              "aria-pressed": String(marcado),
              "aria-disabled": c.disponivel ? null : "true",
              "aria-label": c.atributo.nome + ", de " + c.atual + " para " + c.novo + (c.disponivel ? "" : ", indisponível: " + c.motivos.join(" ")),
              onclick: function () {
                if (!c.disponivel) { UI.avisoAtencao(c.motivos.join(" ")); return; }
                candidato.valor = c.atributo.chave;
                if (c.atributo.chave !== "int") candidato.opcoes = {};
                pintar();
              },
            }, [
              el("span.criacao-opcao__nome", { texto: c.atributo.nome }),
              el("span.escolha-atributo__valor", { texto: c.atual + " → " + c.novo }),
              c.disponivel ? null : el("span.escolha-motivo", { texto: c.motivos.join(" ") }),
            ]);
          })));
          if (candidato.valor === "int") {
            partes.push(el("div.escolha-aninhada", {}, [
              el("p.t-secao", { texto: "Perícia do novo ponto de Intelecto" }),
              el("p.t-mini", { texto: "“Caso seu Intelecto aumente, você aprende uma perícia adicional para cada ponto” (Ordem Paranormal RPG, p. 15)." }),
              gradeDePericias(E.candidatosPericia(ordem, vaga.id, sessao.contexto, "treinar"),
                candidato.opcoes.pericia ? [candidato.opcoes.pericia] : [], 1, function (k) {
                  candidato.opcoes.pericia = candidato.opcoes.pericia === k ? "" : k;
                  pintar();
                }),
            ]));
          }
          partes.push(el("p.criacao-fonte", { texto: "Ordem Paranormal RPG, p. 26" }));
          break;
        }

        case "grauTreinamento": {
          var q = E.quantasNoGrau(ordem, vaga.id, sessao.contexto);
          var sel = Array.isArray(candidato.opcoes.pericias) ? candidato.opcoes.pericias : [];
          partes.push(el("p.t-secao", { texto: "Escolha " + q.total + " perícia(s): " + q.base + " da classe + Intelecto " + q.intelecto + ". Escolhidas: " + sel.length + "." }));
          partes.push(gradeDePericias(E.candidatosPericia(ordem, vaga.id, sessao.contexto, "grau"), sel, q.total, function (k) {
            var i = sel.indexOf(k);
            var nova = sel.slice();
            if (i >= 0) nova.splice(i, 1); else nova.push(k);
            candidato.opcoes.pericias = nova;
            pintar();
          }));
          partes.push(el("p.criacao-fonte", { texto: "Ordem Paranormal RPG, p. 26, 30 e 34 · veterano a partir de NEX 35%, expert a partir de 70%" }));
          break;
        }

        case "perito": {
          var selP = Array.isArray(candidato.opcoes.pericias) ? candidato.opcoes.pericias : [];
          partes.push(el("p.t-secao", { texto: "Escolhidas: " + selP.length + " de 2." }));
          partes.push(gradeDePericias(E.candidatosPericia(ordem, vaga.id, sessao.contexto, "perito"), selP, 2, function (k) {
            var i = selP.indexOf(k);
            var nova = selP.slice();
            if (i >= 0) nova.splice(i, 1); else nova.push(k);
            candidato.opcoes.pericias = nova;
            pintar();
          }));
          partes.push(el("p.criacao-fonte", { texto: "Ordem Paranormal RPG, p. 28" }));
          break;
        }

        case "opcoesBeneficio":
        case "alteracao": {
          var h = P.poder(vaga.beneficio);
          if (h) {
            partes.push(el("div.criacao-opcao", {}, [
              el("span.criacao-opcao__nome", { texto: h.nome }),
              el("span.criacao-opcao__texto", { texto: h.resumo }),
              etiquetaAutomacao(h.automacao),
              h.nota ? el("span.criacao-opcao__fonte", { texto: h.nota }) : null,
              el("span.criacao-opcao__fonte", { texto: P.referencia(h) }),
            ]));
            partes.push(painelDeOpcoes(sessao, h.opcoes, candidato.opcoes, "raiz", 0));
          }
          break;
        }

        case "poderOrigem": {
          var org = C.origem(vaga.origem);
          if (org && org.escolha) {
            partes.push(el("p.criacao-fonte", { texto: C.referencia(org) }));
            partes.push(painelDeOpcoes(sessao, [org.escolha], candidato.opcoes, "raiz", 0));
          }
          break;
        }

        case "transcenderExposicao":
          partes.push(el("p.t-mini", { texto: "Sobrevivendo ao Horror, p. 98: com NEX & Experiência, Transcender não é poder de classe. Ele é recebido nos valores de NEX em que o personagem sofre alteração, e não custa Sanidade." }));
          partes.push(botoesDeEscolha([
            { valor: "transcender", rotulo: "Transcender agora" },
            { valor: "nao", rotulo: "Não transcender neste NEX" },
          ], candidato.valor, function (v) {
            candidato.valor = v;
            if (v === "nao") candidato.opcoes = {};
            pintar();
          }));
          if (candidato.valor === "transcender") {
            partes.push(painelDeOpcoes(sessao, [{ chave: "poder", tipo: "poderParanormal", rotulo: "Poder paranormal" }], candidato.opcoes, "raiz", 0));
          }
          break;

        default:
          partes.push(el("p.t-mini", { texto: "Esta etapa não tem tela de escolha." }));
      }

      return partes;
    }

    function atualizarStatus() {
      var sim = E.simular(ordem, vaga, candidato, sessao.contexto);
      var a = sim.avaliacao;
      var pronto = a.completo && a.valido;
      botao.disabled = !pronto;

      var linhas = [];
      if (a.faltam && a.faltam.length) {
        linhas.push(el("p.t-mini.t-aviso", { texto: "Falta: " + a.faltam.join("; ") + "." }));
      }
      if (a.motivos && a.motivos.length) {
        linhas.push(el("p.t-mini.t-erro", { texto: a.motivos.join(" ") }));
      }
      if (pronto) {
        linhas.push(el("p.t-mini", { texto: "Pronto: " + (E.descrever(ordem, { tipo: vaga.tipo, valor: candidato.valor, opcoes: candidato.opcoes }) || "escolha completa") + "." }));
        if (existente) {
          var imp = E.impacto(ordem, vaga, candidato, sessao.contexto);
          if (imp.saem.length) linhas.push(el("p.t-mini", { texto: "Sai: " + imp.saem.join(", ") + "." }));
          if (imp.entram.length) linhas.push(el("p.t-mini", { texto: "Entra: " + imp.entram.join(", ") + "." }));
          imp.invalidados.forEach(function (x) {
            linhas.push(el("p.t-mini.t-aviso", {
              texto: "Deixa de valer: " + ((x.registro && x.registro.nome) || "uma escolha posterior") + " — " + x.motivos.join(" "),
            }));
          });
          if (imp.invalidados.length) {
            linhas.push(el("p.t-mini", { texto: "Nada é apagado: as escolhas afetadas ficam marcadas na Progressão para você revisar." }));
          }
        }
      }
      U.trocar(status, linhas);
    }

    function confirmar(fechar) {
      var sim = E.simular(ordem, vaga, candidato, sessao.contexto);
      if (!sim.avaliacao.completo || !sim.avaliacao.valido) { atualizarStatus(); return; }
      var registro = E.registrar(ordem, vaga, candidato);
      fechar();
      if (o.aoRegistrar) o.aoRegistrar(registro);
    }

    pintar();
    return m;
  }

  /* =================================================================
     RITUAIS
     -----------------------------------------------------------------
     Esta vaga não tem tela própria: ela ABRE A BIBLIOTECA no contexto
     da concessão. É a mesma janela de "Da biblioteca" — mesma busca,
     mesmos filtros, mesma prévia —, com o topo dizendo de onde o
     benefício veio e quantos rituais faltam.
     ================================================================= */

  function abrirRituais(o, vaga) {
    if (!BIB() || !o.ctx) {
      UI.avisoAtencao("A escolha de rituais precisa da aba Rituais da ficha. Abra o personagem para resolvê-la.");
      return null;
    }
    return BIB().abrir(o.ctx, {
      aprendizado: {
        vagaId: vaga.id,
        aoMudar: o.aoMudarRituais || o.aoRegistrar || null,
      },
    });
  }

  /* O NEX de exposição, que é o que vale para poder paranormal mesmo
     com nível e NEX separados (SAH p.98). */
  function R_exposicao(ordem) {
    var R = global.RAMAOrdemRegras;
    return R && R.exposicao ? R.exposicao(ordem) : (Number(ordem.nex) || 0);
  }

  /* =================================================================
     TRILHA
     ================================================================= */

  function abrirTrilha(o, vaga) {
    var ordem = o.ordem;
    var escolhida = ordem.trilha;
    var anterior = ordem.trilha;

    var corpo = el("div.pilha");
    var status = el("div.escolha-status", { "aria-live": "polite" });

    var m = UI.modal({
      titulo: "Trilha — " + vaga.rotuloEtapa,
      largo: true,
      conteudo: [corpo, status],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: anterior ? "Trocar trilha" : "Confirmar", classe: "r-botao--principal", aoClicar: confirmar },
      ],
    });
    var botao = m.janela.querySelector(".r-modal__rodape .r-botao--principal");

    function pintar() {
      var cands = E.candidatosTrilha(ordem, vaga.id, o.contexto, false);
      U.trocar(corpo, [
        el("p", { texto: vaga.explicacao }),
        el("div.criacao-lista.escolha-lista", {}, cands.map(function (c) {
          var poderes = P.habilidadesDaTrilha(c.trilha.chave).map(function (h) { return "NEX " + h.nex + "% " + h.nome; }).join(" · ");
          return cartaoDeTrilha(c, escolhida === c.trilha.chave, function () { escolhida = c.trilha.chave; pintar(); }, poderes);
        })),
      ]);
      var cand = cands.filter(function (c) { return c.trilha.chave === escolhida; })[0];
      botao.disabled = !cand || !cand.disponivel || escolhida === anterior;
      var linhas = [];
      if (anterior && escolhida && escolhida !== anterior) {
        linhas.push(el("p.t-mini.t-aviso", {
          texto: "Trocar de trilha tira os poderes de " + C.trilha(anterior).nome + " e dá os de " + C.trilha(escolhida).nome +
                 ". As opções já escolhidas nos poderes da trilha antiga ficam guardadas, sem efeito.",
        }));
      }
      U.trocar(status, linhas);
    }

    function confirmar(fechar) {
      if (!escolhida) return;
      ordem.trilha = escolhida;
      fechar();
      if (o.aoRegistrar) o.aoRegistrar(null);
    }

    pintar();
    return m;
  }

  /* =================================================================
     AFINIDADE
     -----------------------------------------------------------------
     OPRPG p.110 e p.114. A tela separa as duas coisas que o livro
     separa: ESCOLHER o elemento (a conexão, em NEX 50%) e TER a
     afinidade (que se desenvolve na primeira vez que transcende depois
     disso). Escolher não aplica efeito mecânico nenhum.
     ================================================================= */

  function abrirAfinidade(opcoes) {
    var o = opcoes || {};
    var ordem = o.ordem;
    var atual = ordem.afinidade || { elemento: "", nomeOutro: "", adiada: false };
    var revisao = !!atual.elemento;
    var escolha = atual.elemento || "";
    var nomeOutro = atual.nomeOutro || "";
    var decidido = false;

    var corpo = el("div.pilha");
    var status = el("div.escolha-status", { "aria-live": "polite" });

    var botoes = [];
    if (!revisao) {
      botoes.push({
        rotulo: "Decidir depois", classe: "r-botao--fantasma",
        aoClicar: function (fechar) {
          decidido = true;
          if (!ordem.afinidade) ordem.afinidade = { elemento: "", nomeOutro: "", adiada: false };
          ordem.afinidade.adiada = true;
          fechar();
          if (o.aoAdiar) o.aoAdiar();
        },
      });
    } else {
      botoes.push({ rotulo: "Cancelar", classe: "r-botao--fantasma" });
    }
    botoes.push({ rotulo: revisao ? "Trocar afinidade" : "Confirmar", classe: "r-botao--principal", aoClicar: confirmar });

    var m = UI.modal({
      titulo: revisao ? "Revisar afinidade" : "Afinidade elemental",
      largo: true,
      conteudo: [corpo, status],
      botoes: botoes,
      aoFechar: function () {
        /* Fechar no X ou no Esc numa primeira escolha também é adiar:
           a janela não pode voltar sozinha a cada recálculo. */
        if (!decidido && !revisao && o.aoFecharSemDecidir) o.aoFecharSemDecidir();
      },
    });
    var botao = m.janela.querySelector(".r-modal__rodape .r-botao--principal");

    var campoOutro = UI.campo({
      rotulo: "Nome do elemento (Homebrew)", valor: nomeOutro, limite: 60,
      ajuda: "Obrigatório para “Outro”. O R.A.M.A. não atribui a ele efeitos de outro elemento.",
    });
    campoOutro.entrada.addEventListener("input", function () {
      nomeOutro = campoOutro.entrada.value;
      atualizar();
    });

    function pintar() {
      var cartoes = C.ELEMENTOS_AFINIDADE.map(function (k) {
        var e = C.elemento(k);
        return cartaoElemento(k, e.nome, e.resumo);
      });
      cartoes.push(cartaoElemento("outro", "Outro", "Um elemento Homebrew da sua mesa. Sem efeitos automáticos."));

      U.trocar(corpo, [
        el("p", {
          texto: "Com NEX 50%, você se conecta a uma entidade. Escolher o elemento não tem efeito imediato: a afinidade se desenvolve na primeira vez que você transcender depois disso.",
        }),
        el("p.t-mini", {
          texto: "Com afinidade: rituais do elemento sem componentes, +2 dados contra efeitos do seu elemento e –2 dados contra o elemento que o oprime, e poderes paranormais do seu elemento podem ser escolhidos uma segunda vez para receber a linha “Afinidade”.",
        }),
        el("p.criacao-fonte", { texto: "Ordem Paranormal RPG, p. 110 e p. 114" }),
        revisao
          ? el("p.t-mini.t-aviso", {
              texto: "O livro diz que esta escolha não pode ser alterada (p. 110). Trocar aqui é uma decisão da mesa, registrada como qualquer outra.",
            })
          : null,
        el("div.criacao-lista.escolha-lista", { role: "group", "aria-label": "Elemento" }, cartoes),
        escolha === "outro" ? campoOutro : null,
      ]);
      atualizar();
    }

    function cartaoElemento(chave, nome, resumo) {
      var marcado = escolha === chave;
      return el("button.criacao-opcao.escolha-cartao", {
        type: "button",
        class: marcado ? "criacao-opcao--escolhida" : "",
        "aria-pressed": String(marcado),
        "aria-label": nome + ". " + resumo,
        onclick: function () { escolha = chave; pintar(); if (chave === "outro") campoOutro.entrada.focus(); },
      }, [
        el("span.criacao-opcao__nome", { texto: nome }),
        el("span.criacao-opcao__texto", { texto: resumo }),
      ]);
    }

    function atualizar() {
      var nome = String(nomeOutro || "").trim();
      var completo = !!escolha && (escolha !== "outro" || !!nome);
      var mudou = escolha !== atual.elemento || (escolha === "outro" && nome !== (atual.nomeOutro || ""));
      botao.disabled = !completo || (revisao && !mudou);

      var linhas = [];
      if (escolha === "outro" && !nome) {
        campoOutro.marcarErro("Escreva o nome do elemento.");
        linhas.push(el("p.t-mini.t-aviso", { texto: "Falta o nome do elemento Homebrew." }));
      } else {
        campoOutro.marcarErro("");
      }

      if (completo && mudou && revisao) {
        var antes = E.estado(ordem, o.contexto || null);
        var copia = JSON.parse(JSON.stringify(ordem));
        copia.afinidade = { elemento: escolha, nomeOutro: escolha === "outro" ? nome : (atual.nomeOutro || ""), adiada: false };
        var depois = E.estado(copia, o.contexto || null);
        var perdidos = [];
        Object.keys(depois.avaliacoes).forEach(function (id) {
          var a = antes.avaliacoes[id];
          var d = depois.avaliacoes[id];
          if (a && a.valido && d && !d.valido) {
            var r = (ordem.escolhas || []).filter(function (x) { return x.id === id; })[0];
            perdidos.push(r ? r.nome : "uma escolha");
          }
        });
        var comAfinidade = antes.adquiridos.filter(function (x) { return x.valido && x.afinidade; }).map(function (x) { return x.nome; });
        linhas.push(el("p.t-mini", {
          texto: "Ao trocar, o sistema recalcula: os benefícios de afinidade ligados ao elemento antigo" +
                 (comAfinidade.length ? " (" + comAfinidade.join(", ") + ")" : "") +
                 " deixam de valer, e as escolhas que dependiam dele ficam marcadas para revisão.",
        }));
        if (perdidos.length) linhas.push(el("p.t-mini.t-aviso", { texto: "Ficam marcadas: " + perdidos.join(", ") + "." }));
        if (atual.elemento === "outro" && escolha !== "outro") {
          linhas.push(el("p.t-mini", { texto: "O nome Homebrew “" + (atual.nomeOutro || "") + "” continua guardado, caso você volte para “Outro”." }));
        }
      }
      if (completo && !revisao) {
        linhas.push(el("p.t-mini", { texto: "Pronto para confirmar." }));
      }
      U.trocar(status, linhas);
    }

    function confirmar(fechar) {
      var nome = String(nomeOutro || "").trim();
      if (!escolha || (escolha === "outro" && !nome)) { atualizar(); return; }
      decidido = true;
      ordem.afinidade = {
        elemento: escolha,
        /* O nome Homebrew é preservado mesmo trocando para outro
           elemento — nada é apagado em silêncio. */
        nomeOutro: escolha === "outro" ? nome : (atual.nomeOutro || ""),
        adiada: false,
      };
      fechar();
      if (o.aoConfirmar) o.aoConfirmar(ordem.afinidade);
    }

    pintar();
    return m;
  }

  /* =================================================================
     CARTÃO DE PENDÊNCIA
     ================================================================= */

  function cartaoDePendencia(p, aoResolver) {
    var detalhe = [];
    if (p.situacao === "aberta") detalhe.push(p.explicacao);
    /* A concessão de rituais conta em voz alta: permitido, escolhido e
       o que falta, como manda o pedido da tela. */
    if (p.aprendizado) {
      detalhe.push("Escolhidos: " + p.aprendizado.escolhidos + " de " + p.aprendizado.quantidade +
        (p.aprendizado.restantes ? " · faltam " + p.aprendizado.restantes : "") + ".");
      if (p.situacao !== "aberta" && p.vaga && p.vaga.concessao) detalhe.push(p.explicacao);
    }
    if (p.faltam && p.faltam.length) detalhe.push("Falta: " + p.faltam.join("; ") + ".");
    if (p.motivos && p.motivos.length) detalhe.push(p.motivos.join(" "));
    if (p.adiada) detalhe.push("Adiada: fica aqui até você decidir.");
    if (p.opcional) detalhe.push("Opcional: dá para recusar.");

    return el("div.ordem-pendencia", { dataset: { situacao: p.situacao } }, [
      el("span.ordem-pendencia__nex", { texto: p.rotuloEtapa }),
      el("div.ordem-pendencia__corpo", {}, [
        el("span.ordem-pendencia__rotulo", { texto: p.rotulo }),
        p.aprendizado ? el("span.escolha-marcas", {}, [
          el("span.etiqueta", { texto: p.aprendizado.concessao.origem === "trilha" ? "Trilha" : "Classe" }),
          el("span.etiqueta", { texto: p.aprendizado.concessao.nomePoder }),
          p.aprendizado.concessao.fixo ? el("span.etiqueta", { texto: "automática" }) : null,
          p.aprendizado.concessao.destino === "grimorio" ? el("span.etiqueta.etiqueta--parcial", { texto: "grimório" }) : null,
        ]) : null,
        detalhe.length ? el("span.t-mini", { texto: detalhe.join(" ") }) : null,
      ]),
      aoResolver
        ? el("button.r-botao.r-botao--mini", {
            type: "button",
            class: p.situacao === "invalida" ? "" : "r-botao--principal",
            texto: p.verbo,
            "aria-label": p.verbo + ": " + p.rotulo + ", " + p.rotuloEtapa,
            onclick: function () { aoResolver(p); },
          })
        : null,
    ]);
  }

  global.RAMAOrdemEscolhas = {
    abrir: abrir,
    abrirAfinidade: abrirAfinidade,
    abrirRituais: abrirRituais,
    cartaoDePendencia: cartaoDePendencia,
    etiquetaAutomacao: etiquetaAutomacao,
    rotuloTipoPoder: rotuloTipoPoder,
  };
})(window);
