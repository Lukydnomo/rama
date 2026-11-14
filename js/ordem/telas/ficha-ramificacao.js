/* =====================================================================
   R.A.M.A. — ficha de Ordem Paranormal · RAMIFICAÇÃO (a tela)
   =====================================================================
   O planejador de evolução: na aba Progressão, um painel (só para o
   DONO) com o plano ativo, o próximo marco real e o que a última
   aplicação fez; e o espaço de planejamento — uma janela com o selo
   "Simulação" o tempo todo, planos, alvo, marcos com as escolhas,
   resumo e comparação.

   O que esta tela NUNCA faz
     · mudar a ficha ao planejar: toda conta é numa PROJEÇÃO (cópia) e
       as janelas de escolha da Progressão abrem em cima dela;
     · conceder ao ativar, ao abrir a ficha ou ao trocar o alvo. Só um
       avanço REAL da progressão (gravado pelo caminho normal) dispara a
       aplicação — e ela passa de novo pela porta da Progressão;
     · escolher substituto: o que não fecha fica pendente, com motivo.

   Os planos ficam no servidor (ler/salvar_planos_evolucao, só o dono),
   fora da ficha: salvar um plano não grava a ficha. A ATIVAÇÃO e os
   recibos ficam na ficha (ordem.ramificacao) e sobem na gravação normal
   dela, junto com as escolhas aplicadas.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;
  function M() { return global.RAMAOrdemRamificacao; }
  function E() { return global.RAMAOrdemProgressao; }
  function R() { return global.RAMAOrdemRegras; }
  function C() { return global.RAMAOrdemCatalogo; }
  function ES() { return global.RAMAOrdemEscolhas; }
  function API() { return global.RAMAApi; }
  function RT() { return global.RAMAOrdemRituais; }

  function copiar(v) { return JSON.parse(JSON.stringify(v)); }

  /* -----------------------------------------------------------------
     A FICHA COMO O NÚCLEO A ENXERGA
     ----------------------------------------------------------------- */
  function fichaDe(ctx) {
    if (!ctx.ficha.rituais) ctx.ficha.rituais = { itens: [] };
    if (!Array.isArray(ctx.ficha.rituais.itens)) ctx.ficha.rituais.itens = [];
    return { ordem: ctx.ficha.ordem, rituais: ctx.ficha.rituais.itens, inventario: ctx.ficha.inventario };
  }
  function podeUsar(ctx) {
    return !!(ctx && ctx.ficha && ctx.ficha.ordem && M() && ctx.ehDono && ctx.ehDono());
  }

  /* -----------------------------------------------------------------
     OS PLANOS NO SERVIDOR (cache por personagem, nesta página)
     ----------------------------------------------------------------- */
  var cache = {};
  function entradaDe(ctx) {
    var id = ctx.personagemId;
    if (!cache[id]) cache[id] = { doc: null, rev: 0, carga: null };
    return cache[id];
  }
  /* O catálogo de rituais no que a ficha pode usar agora (suplementos). */
  function entradasDoCatalogo() {
    if (!RT()) return Promise.resolve([]);
    return RT().carregar().then(function (cat) {
      var lista = (cat && cat.rituais) || [];
      return lista.filter(function (e) { return !C().fonteLiberada || C().fonteLiberada(e); });
    }, function () { return []; });
  }
  function carregar(ctx, forcar) {
    var c = entradaDe(ctx);
    if (c.doc && !forcar) return Promise.resolve(c);
    if (c.carga && !forcar) return c.carga;
    c.carga = Promise.all([API().lerPlanosEvolucao(ctx.personagemId), entradasDoCatalogo()]).then(function (rs) {
      var r = rs[0];
      c.carga = null;
      if (!r || !r.ok) throw r || new Error("falha");
      c.rev = U.inteiro(r.rev, 0);
      c.doc = M().hidratarDoc(r.dados || {}, rs[1]);
      c.limite = (r.dados && r.dados.limite) || M().LIMITE_PLANOS;
      return c;
    }, function (erro) { c.carga = null; throw erro; });
    return c.carga;
  }
  function gravar(ctx, doc) {
    var c = entradaDe(ctx);
    var opId = "ram-" + U.uuid().replace(/[^A-Za-z0-9]/g, "").slice(0, 30);
    return Promise.all([API().salvarPlanosEvolucao(ctx.personagemId, c.rev, opId, M().compactarDoc(doc)), entradasDoCatalogo()]).then(function (rs) {
      var r = rs[0];
      if (r && r.ok) {
        c.rev = U.inteiro(r.rev, c.rev);
        c.doc = M().hidratarDoc(r.dados || {}, rs[1]);
        return { ok: true };
      }
      if (r && r.erro === "conflito") return { ok: false, conflito: true, rev: U.inteiro(r.rev, 0), dados: r.dados };
      return { ok: false, erro: (r && r.erro) || "falha" };
    });
  }
  function planoAtivo(ctx) {
    var r = ctx.ficha.ordem.ramificacao;
    var c = entradaDe(ctx);
    if (!r || !r.planoId || !c.doc) return null;
    return c.doc.planos.filter(function (p) { return p.id === r.planoId; })[0] || null;
  }

  /* -----------------------------------------------------------------
     RÓTULOS
     ----------------------------------------------------------------- */
  function proximoMarco(o) {
    var op = M().opcoesDoAlvo(o), t = M().tipoDoTrilho(o);
    if (t === "nex") return op.nex.length ? "NEX " + op.nex[0] + "%" : "";
    if (t === "nivelExposicao") return [op.nivel.length ? "Nível " + op.nivel[0] : "", op.exposicao.length ? "exposição " + op.exposicao[0] + "%" : ""].filter(Boolean).join(" ou ");
    if (t === "patente") return op.patente.length ? op.patente[0].nome + " (" + op.patente[0].pp + " PP)" : "";
    if (t === "estagio") return op.estagio.length ? "Estágio " + op.estagio[0] : "";
    return "";
  }
  function alvoDoProximo(o) {
    var op = M().opcoesDoAlvo(o), t = M().tipoDoTrilho(o);
    if (t === "nex") return op.nex.length ? { nex: op.nex[0] } : null;
    if (t === "nivelExposicao") return { nivel: op.nivel.length ? op.nivel[0] : null, exposicao: op.exposicao.length ? op.exposicao[0] : null };
    if (t === "patente") return op.patente.length ? { patente: op.patente[0].indice } : null;
    if (t === "estagio") return op.estagio.length ? { estagio: op.estagio[0] } : null;
    return null;
  }
  function seloSimulacao() {
    return el("span.ram-selo", { texto: "Simulação", title: "Nada aqui muda a ficha", "aria-label": "Simulação: nada aqui muda a ficha" });
  }
  function etiquetaDeEstado(estado) {
    var t = { definida: "definida", pendente: "a definir", revisar: "revisar", aplicada: "concluída", conflito: "conflito", bloqueada: "bloqueada" }[estado] || estado;
    return el("span.ram-estado", { dataset: { estado: estado }, texto: t });
  }

  /* =================================================================
     APLICAÇÃO AUTOMÁTICA
     -----------------------------------------------------------------
     Disparada pelo avanço REAL (aoMudarOrdem, com uma folga para quem
     está digitando) e na abertura da ficha (o Mestre pode ter subido o
     NEX: a aplicação espera o dono abrir). Só no navegador do dono.
     ================================================================= */
  var ocupado = false;
  var espera = null;

  function depoisDeMudar(ctx) {
    var o = ctx.ficha.ordem;
    R().aparar(o, R().maximosDosRecursos(o));
    ctx.alterou();
    if (ctx.atualizar) { ctx.atualizar(); if (ctx.atualizarTitulo) ctx.atualizarTitulo(); }
    else ctx.redesenhar();
  }
  function avisarResultado(res) {
    if (!res) return;
    if (res.pausado) { UI.avisoAtencao("Plano pausado: " + res.pausado); return; }
    var rev = res.conflitos.length + res.bloqueadas.length;
    if (!res.aplicadas.length && !res.atendidas.length && !rev) return;
    var texto = res.resumo || "Plano aplicado.";
    if (rev) UI.avisoAtencao(texto + " Veja na aba Progressão.");
    else UI.avisoOk(texto);
  }

  function aplicarAgora(ctx, opcoes) {
    var op = opcoes || {};
    if (!podeUsar(ctx) || (ctx.podeEditar && !ctx.podeEditar())) return Promise.resolve(null);
    var o = ctx.ficha.ordem;
    if (!o.ramificacao || !o.ramificacao.planoId) return Promise.resolve(null);
    if (!op.retomar && !M().avancou(o)) return Promise.resolve(null);
    if (ocupado) return Promise.resolve(null);
    ocupado = true;
    return carregar(ctx).then(function (c) {
      ocupado = false;
      if (!op.retomar && !M().avancou(ctx.ficha.ordem)) return null;
      var res = M().processar(fichaDe(ctx), c.doc, op);
      if (res && res.mudou) { depoisDeMudar(ctx); avisarResultado(res); }
      return res;
    }, function () {
      ocupado = false;
      /* O `processado` ficou onde estava: a próxima abertura confere de novo. */
      UI.avisoAtencao("Não deu para conferir o plano de evolução ativo agora. Ele será conferido na próxima vez que a ficha abrir.");
      return null;
    });
  }

  function aoMudarOrdem(ctx) {
    if (!podeUsar(ctx)) return;
    var o = ctx.ficha.ordem;
    if (!o.ramificacao || !o.ramificacao.planoId || !M().avancou(o)) return;
    clearTimeout(espera);
    espera = setTimeout(function () { aplicarAgora(ctx); }, 900);
  }

  function aoAbrir(ctx) {
    if (!podeUsar(ctx)) return;
    var o = ctx.ficha.ordem;
    if (o.ramificacao && o.ramificacao.planoId && M().avancou(o)) aplicarAgora(ctx);
  }

  /* Prévia do que "Retomar" / "Revisar escolhas já liberadas" faria,
     numa CÓPIA — e só aplica depois da confirmação. */
  function retomar(ctx, titulo) {
    return carregar(ctx).then(function (c) {
      var f = fichaDe(ctx);
      var prova = { ordem: copiar(f.ordem), rituais: copiar(f.rituais), inventario: f.inventario };
      var res = M().processar(prova, c.doc, { retomar: true });
      if (!res) return null;
      if (res.pausado) { UI.avisoAtencao(res.pausado); return null; }
      var linhas = [];
      if (res.aplicadas.length) linhas.push("Entram: " + res.aplicadas.join("; ") + ".");
      if (res.atendidas.length) linhas.push("Já estão na ficha: " + res.atendidas.join("; ") + ".");
      if (res.conflitos.length) linhas.push("Conflito (fica a escolha da ficha): " + res.conflitos.join("; ") + ".");
      if (res.bloqueadas.length) linhas.push("Continuam bloqueadas: " + res.bloqueadas.join("; ") + ".");
      if (!res.aplicadas.length) {
        UI.aviso(linhas.length ? linhas.join(" ") : "Nada do plano para aplicar agora.");
        if (res.atendidas.length || res.conflitos.length || res.bloqueadas.length) { M().processar(f, c.doc, { retomar: true }); depoisDeMudar(ctx); }
        return null;
      }
      return UI.confirmar({
        titulo: titulo || "Retomar o plano",
        texto: "As escolhas do plano " + c.doc.planos.filter(function (p) { return p.id === f.ordem.ramificacao.planoId; })[0].nome + " para marcos que a ficha já alcançou, conferidas agora pela Progressão.",
        detalhe: linhas.join(" "),
        rotuloConfirmar: "Aplicar",
      }).then(function (sim) {
        if (!sim) return null;
        var r = M().processar(fichaDe(ctx), c.doc, { retomar: true });
        if (r && r.mudou) { depoisDeMudar(ctx); avisarResultado(r); }
        return r;
      });
    }, function () { UI.avisoErro("Não deu para ler os planos agora. Tente de novo."); });
  }

  function desativar(ctx) {
    var r = ctx.ficha.ordem.ramificacao;
    return UI.confirmar({
      titulo: "Desativar a aplicação automática",
      texto: "O plano " + (r.nomePlano || "") + " continua guardado; só as escolhas FUTURAS deixam de entrar sozinhas. O que já entrou na ficha fica.",
      rotuloConfirmar: "Desativar",
    }).then(function (sim) {
      if (!sim) return;
      M().desativar(ctx.ficha.ordem);
      depoisDeMudar(ctx);
      UI.aviso("Aplicação automática desativada.");
    });
  }

  /* =================================================================
     O PAINEL NA ABA PROGRESSÃO (só o dono)
     ================================================================= */
  function painel(ctx) {
    if (!podeUsar(ctx)) return null;
    var o = ctx.ficha.ordem;
    var tipo = M().tipoDoTrilho(o);
    var r = o.ramificacao && o.ramificacao.planoId ? o.ramificacao : null;
    var c = entradaDe(ctx);
    var linhas = [];
    var acoes = [];

    if (tipo === "mundano") {
      linhas.push(el("p.t-mini", { texto: "Mundano não tem marcos de evolução para planejar. Depois de uma transição autorizada pela mesa, os planos ficam disponíveis para o trilho novo." }));
    } else if (!r) {
      linhas.push(el("p", { texto: "Teste caminhos de evolução e compare antes de decidir. Planejar não muda a ficha." }));
    }

    if (r) {
      var plano = planoAtivo(ctx);
      linhas.push(el("p", {}, [el("strong", { texto: "Plano ativo: " }), r.nomePlano || "—", " ", el("span.etiqueta", { texto: "aplicação automática" })]));
      var prox = proximoMarco(o);
      if (prox) {
        var quantas = "";
        if (plano) {
          var alvo = alvoDoProximo(o);
          if (alvo) {
            var mm = M().montar(fichaDe(ctx), Object.assign({}, plano, { alvo: alvo }));
            quantas = mm.definidas ? " — " + mm.definidas + " escolha(s) planejada(s)" : " — nada planejado para ele";
          }
        }
        linhas.push(el("p.t-mini", { texto: "Próximo marco real: " + prox + quantas + ". Os avanços continuam pelo fluxo normal da Progressão." }));
      }
      if (r.pausado) linhas.push(el("p.t-mini.t-aviso", { role: "status", texto: "Pausado: " + r.pausado }));
      if (r.ultimoResumo) linhas.push(el("p.t-mini", { texto: "Última aplicação: " + r.ultimoResumo }));
      if (r.pendentes.length) {
        linhas.push(el("ul.ram-pendentes", {}, r.pendentes.map(function (p) {
          return el("li", {}, [etiquetaDeEstado(p.status), " ", el("span", { texto: (p.marco ? p.marco + " · " : "") + p.motivo })]);
        })));
      }
      if (plano) {
        var atr = M().atrasadas(fichaDe(ctx), plano);
        if (atr.length) {
          linhas.push(el("p.t-mini.t-aviso", { texto: atr.length + " escolha(s) deste plano são de marcos que a ficha já alcançou e continuam vazias." }));
          acoes.push(el("button.r-botao.r-botao--mini", { type: "button", texto: "Revisar escolhas já liberadas", onclick: function () { retomar(ctx, "Revisar escolhas já liberadas"); } }));
        }
      } else if (!c.doc) {
        carregar(ctx).then(function () { if (ctx.redesenhar) ctx.redesenhar(); }, function () {});
      }
      if (r.pendentes.length) acoes.push(el("button.r-botao.r-botao--mini", { type: "button", texto: "Retomar aplicação", onclick: function () { retomar(ctx); } }));
      acoes.push(el("button.r-botao.r-botao--mini", { type: "button", texto: "Revisar plano", onclick: function () { abrir(ctx, { planoId: r.planoId }); } }));
      acoes.push(el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Desativar", onclick: function () { desativar(ctx); } }));
    }
    if (tipo !== "mundano") {
      acoes.unshift(el("button.r-botao.r-botao--mini" + (r ? "" : ".r-botao--principal"), { type: "button", texto: "Planejar evolução", onclick: function () { abrir(ctx); } }));
    }
    return UI.painel("Ramificação · futuros do personagem", el("div.pilha--curta", { class: "pilha ram-painel" }, [
      linhas,
      acoes.length ? el("div.faixa", {}, acoes) : null,
      el("p.t-mini", { texto: "Só você vê os seus planos. Mestre e quem recebeu a ficha compartilhada não os recebem." }),
    ]));
  }

  /* =================================================================
     O ESPAÇO DE PLANEJAMENTO
     ================================================================= */
  function abrir(ctx, opcoes) {
    var op = opcoes || {};
    var corpo = el("div.ram-espaco", { "aria-live": "off" });
    var s = {
      ctx: ctx, doc: null, sujo: false, selecionado: op.planoId || "", aba: "escolhas",
      comparar: { a: "ficha", b: "" }, erro: null, salvando: false,
    };
    var janela = UI.modal({
      titulo: "Planejar evolução",
      largo: true,
      classe: "ram-janela",
      conteudo: corpo,
      podeFechar: function () {
        if (!s.sujo) return true;
        UI.confirmar({ titulo: "Descartar as mudanças?", texto: "Há mudanças nos planos que ainda não foram salvas.", rotuloConfirmar: "Descartar", perigo: true })
          .then(function (sim) { if (sim) { s.sujo = false; janela.fechar(); } });
        return false;
      },
      aoFechar: function () { if (ctx.redesenhar) ctx.redesenhar(); },
    });
    var topo = janela.janela.querySelector(".r-modal__topo h2");
    if (topo) topo.appendChild(seloSimulacao());

    U.trocar(corpo, UI.carregando("Abrindo os planos"));
    carregar(ctx, true).then(function (c) {
      s.doc = copiar(c.doc);
      if (!s.selecionado && s.doc.planos.length) s.selecionado = s.doc.planos[0].id;
      pintar();
    }, function () {
      U.trocar(corpo, el("div.r-vazio", {}, [
        el("p", { texto: "Não deu para abrir os planos agora." }),
        el("button.r-botao", { type: "button", texto: "Tentar de novo", onclick: function () { janela.fechar(); abrir(ctx, op); } }),
      ]));
    });

    function f() { return fichaDe(ctx); }
    function plano() { return s.doc.planos.filter(function (p) { return p.id === s.selecionado; })[0] || null; }
    function limite() { return entradaDe(ctx).limite || M().LIMITE_PLANOS; }
    function mudou() { s.sujo = true; var p = plano(); if (p) p.atualizadoEm = new Date().toISOString(); pintar(); }

    /* Repintar sem perder o foco de teclado. */
    function pintar() {
      var ativo = document.activeElement;
      var chave = ativo && corpo.contains(ativo) ? ativo.getAttribute("data-foco") : null;
      U.trocar(corpo, conteudo());
      if (chave) {
        var alvo = corpo.querySelector('[data-foco="' + chave.replace(/"/g, "") + '"]');
        if (alvo) alvo.focus();
      }
    }

    function conteudo() {
      var o = f().ordem;
      var p = plano();
      return [
        cabecalho(o),
        s.doc.planos.length ? null : vazio(),
        p ? el("div.ram-abas", { role: "tablist", "aria-label": "Partes do planejador" }, [
          botaoDeAba("escolhas", "Escolhas"), botaoDeAba("resumo", "Resumo", "ram-so-estreito"), botaoDeAba("comparar", "Comparar"),
        ]) : null,
        p ? el("div.ram-grade", { dataset: { aba: s.aba } }, [
          el("section.ram-escolhas", { "aria-label": "Escolhas do plano" }, s.aba === "comparar" ? [] : colunaDeEscolhas(o, p)),
          el("aside.ram-resumo", { "aria-label": "Resumo do plano" }, s.aba === "comparar" ? [] : colunaDeResumo(o, p)),
          s.aba === "comparar" ? el("section.ram-comparar", { "aria-label": "Comparar" }, painelComparar(o)) : null,
        ]) : null,
        rodape(o, p),
      ];
    }

    function botaoDeAba(chave, rotulo, classe) {
      return el("button.ram-aba", {
        type: "button", role: "tab", class: classe || "", "aria-selected": s.aba === chave ? "true" : "false",
        "data-foco": "aba-" + chave, texto: rotulo, onclick: function () { s.aba = chave; pintar(); },
      });
    }

    function cabecalho(o) {
      var r = o.ramificacao && o.ramificacao.planoId ? o.ramificacao : null;
      var itens = s.doc.planos.map(function (p) {
        var ativo = r && r.planoId === p.id;
        return el("button.ram-plano", {
          type: "button", "aria-pressed": p.id === s.selecionado ? "true" : "false", "data-foco": "plano-" + p.id,
          onclick: function () { s.selecionado = p.id; if (s.aba === "comparar") s.comparar.b = p.id; pintar(); },
        }, [el("span", { texto: p.nome }), ativo ? el("span.etiqueta", { texto: "ativo" }) : null]);
      });
      var cheio = s.doc.planos.length >= limite();
      var p = plano();
      return el("div.ram-cabecalho", {}, [
        el("div.faixa.ram-voltar", {}, [
          el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "← Voltar à Progressão", "data-foco": "voltar", onclick: function () { if (!s.sujo) janela.fechar(); else janela.janela.querySelector(".r-modal__topo .r-icone").click(); } }),
          el("span.t-mini", { texto: "Ficha: " + M().rotuloDoProgresso(M().progressoDe(o)) + " · " + M().TIPOS[M().tipoDoTrilho(o)] }),
        ]),
        s.doc.planos.length ? el("div.ram-planos", { role: "group", "aria-label": "Planos" }, itens) : null,
        el("div.faixa", {}, [
          el("button.r-botao.r-botao--mini", { type: "button", texto: s.doc.planos.length ? "Novo plano" : "Criar primeiro plano", "data-foco": "novo", disabled: cheio, onclick: criar }),
          p ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Duplicar", "data-foco": "duplicar", disabled: cheio, onclick: duplicar }) : null,
          p ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Renomear", "data-foco": "renomear", onclick: renomear }) : null,
          p && s.doc.planos.length ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Comparar", "data-foco": "comparar", onclick: function () { s.aba = "comparar"; if (!s.comparar.b) s.comparar.b = p.id; pintar(); } }) : null,
          p ? el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Excluir", "data-foco": "excluir", onclick: excluir }) : null,
          el("span.t-mini", { texto: s.doc.planos.length + " de " + limite() + " planos" + (cheio ? " (limite)" : "") }),
        ]),
      ]);
    }

    function vazio() {
      return el("div.r-vazio.ram-vazio", {}, [
        el("p", { texto: "Nenhum plano ainda. Um plano é um caminho possível: o alvo (por exemplo, 50% de NEX) e as escolhas de cada marco até lá." }),
        el("p.t-mini", { texto: "Você pode ter até " + limite() + " planos para esta ficha e comparar dois deles — nada disso muda a ficha nem cria ficha nova." }),
      ]);
    }

    /* ---------------- planos: criar, duplicar, renomear, excluir ---- */
    function criar() {
      if (s.doc.planos.length >= limite()) return;
      UI.pedirTexto({ titulo: "Novo plano", rotulo: "Nome do plano", valor: "Plano " + (s.doc.planos.length + 1), limite: 60, rotuloConfirmar: "Criar" }).then(function (nome) {
        if (!nome) return;
        var p = M().novoPlano(f().ordem, f().inventario, nome);
        s.doc.planos.push(p);
        s.selecionado = p.id;
        s.aba = "escolhas";
        mudou();
      });
    }
    function duplicar() {
      var p = plano();
      if (!p || s.doc.planos.length >= limite()) return;
      var d = M().duplicar(p, (p.nome + " (cópia)").slice(0, 60));
      s.doc.planos.push(d);
      s.selecionado = d.id;
      mudou();
    }
    function renomear() {
      var p = plano();
      if (!p) return;
      UI.pedirTexto({ titulo: "Renomear plano", rotulo: "Nome do plano", valor: p.nome, limite: 60, rotuloConfirmar: "Renomear" }).then(function (nome) {
        if (!nome || nome === p.nome) return;
        p.nome = nome.slice(0, 60);
        mudou();
      });
    }
    function excluir() {
      var p = plano();
      if (!p) return;
      var r = f().ordem.ramificacao;
      var ativo = r && r.planoId === p.id;
      UI.confirmar({
        titulo: "Excluir o plano " + p.nome + "?",
        texto: ativo ? "Este é o plano ativo: ao salvar, a aplicação automática para. O que já entrou na ficha fica." : "O plano sai da lista ao salvar. A ficha não muda.",
        rotuloConfirmar: "Excluir", perigo: true,
      }).then(function (sim) {
        if (!sim) return;
        s.doc.planos = s.doc.planos.filter(function (x) { return x.id !== p.id; });
        s.selecionado = s.doc.planos.length ? s.doc.planos[0].id : "";
        if (s.comparar.a === p.id) s.comparar.a = "ficha";
        if (s.comparar.b === p.id) s.comparar.b = s.selecionado;
        mudou();
      });
    }

    /* ---------------- alvo -------------------------------------------- */
    function seletorDeAlvo(o, p) {
      var tipo = M().tipoDoTrilho(o);
      var op = M().opcoesDoAlvo(o);
      var alvo = M().normalizarAlvo(o, p.alvo);
      function sel(rotulo, chave, valores, atual, comNenhum) {
        var id = "ram-alvo-" + chave;
        /* Alvo que a ficha já alcançou: aparece marcado como tal, em vez de
           a caixa mostrar o primeiro valor acima (o plano não é reescrito). */
        if (atual !== null && atual !== undefined && !valores.some(function (v) { return String(v.valor) === String(atual); })) {
          var rot = { nex: atual + "%", exposicao: atual + "%", nivel: "Nível " + atual, estagio: "Estágio " + atual,
            patente: C().patenteDaEvolucao ? C().patenteDaEvolucao(atual).nome : String(atual) }[chave];
          valores = [{ valor: atual, rotulo: rot + " (já alcançado)" }].concat(valores);
        }
        var opcoes = (comNenhum ? [el("option", { value: "", texto: "não planejar" })] : []).concat(valores.map(function (v) {
          return el("option", { value: String(v.valor), texto: v.rotulo, selected: String(v.valor) === String(atual) });
        }));
        if (!valores.length && !comNenhum) opcoes = [el("option", { value: "", texto: "teto alcançado" })];
        return el("div.r-campo.ram-campo-alvo", {}, [
          el("label", { for: id, texto: rotulo }),
          el("select.r-entrada", {
            id: id, "data-foco": id,
            onchange: function (ev) {
              var v = ev.target.value;
              p.alvo = Object.assign({}, p.alvo);
              p.alvo[chave] = v === "" ? null : Number(v);
              p.alvo = M().normalizarAlvo(o, p.alvo);
              mudou();
            },
          }, opcoes),
        ]);
      }
      var campos = [];
      if (tipo === "nex") campos.push(sel("Alvo: NEX", "nex", op.nex.map(function (n) { return { valor: n, rotulo: n + "%" }; }), alvo.nex));
      if (tipo === "nivelExposicao") {
        campos.push(sel("Alvo: nível", "nivel", op.nivel.map(function (n) { return { valor: n, rotulo: "Nível " + n }; }), alvo.nivel, true));
        campos.push(sel("Alvo: exposição", "exposicao", op.exposicao.map(function (n) { return { valor: n, rotulo: n + "%" }; }), alvo.exposicao, true));
      }
      if (tipo === "patente") campos.push(sel("Alvo: patente", "patente", op.patente.map(function (x) { return { valor: x.indice, rotulo: x.nome + " (mín. " + x.pp + " PP)" }; }), alvo.patente));
      if (tipo === "estagio") campos.push(sel("Alvo: estágio", "estagio", op.estagio.map(function (n) { return { valor: n, rotulo: "Estágio " + n }; }), alvo.estagio));
      return el("div.ram-alvo", {}, [
        el("p.ram-trajeto", { texto: "Partindo de " + M().rotuloDoProgresso(M().progressoDe(o)) + " → Alvo: " + M().rotuloDoAlvo(o, p.alvo) }),
        el("div.faixa", {}, campos),
        tipo === "nivelExposicao" ? el("p.t-mini", { texto: "Nível e exposição sobem separados: planeje um eixo ou os dois. Os marcos aparecem na ordem do motor (nível, depois exposição, no mesmo degrau); na mesa, cada um dispara quando o seu eixo sobe." }) : null,
        tipo === "patente" ? el("p.t-mini", { texto: "A patente sobe pelos pontos de prestígio, pelo caminho normal da Progressão. Perder PP depois não desfaz nada." }) : null,
      ]);
    }

    /* ---------------- coluna das escolhas ----------------------------- */
    function colunaDeEscolhas(o, p) {
      var m = M().montar(f(), p);
      var avisos = [];
      if (m.tipoMudou) avisos.push(el("div.ram-aviso", { role: "status" }, [el("p", { texto: "A regra de evolução desta ficha mudou desde que o plano foi feito (" + M().TIPOS[p.regras.tipo] + " → " + M().TIPOS[m.tipo] + "). As escolhas ficam guardadas por vaga, sem conversão: revise o alvo e as escolhas." })]));
      if (m.mudouBase) avisos.push(el("div.ram-aviso", { role: "status" }, [
        el("p", { texto: "A ficha mudou desde este plano. O resumo já usa a ficha atual; atualize a base para não ver este aviso de novo." }),
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Atualizar base", "data-foco": "base", onclick: function () { atualizarBase(o, p, m); } }),
      ]));
      if (m.alcancado) avisos.push(el("div.ram-aviso", { role: "status" }, [el("p", { texto: "A ficha já chegou ao alvo deste plano. Escolha um alvo maior para planejar os próximos marcos." })]));
      var auto = m.automaticas.length ? el("div.ram-auto", {}, [
        el("h3.t-rotulo", { texto: "Ganhos automáticos até o alvo" }),
        el("ul", {}, m.automaticas.map(function (a) { return el("li", { texto: a.nome + (a.nova ? "" : " (melhora)") }); })),
      ]) : null;
      var marcos = m.marcos.map(function (mc) {
        return el("div.ram-marco", {}, [
          el("h3.ram-marco__titulo", { texto: mc.rotulo }),
          el("ul.ram-itens", {}, mc.itens.map(function (it) { return itemDeEscolha(o, p, m, it); })),
        ]);
      });
      var fora = m.fora.length ? el("p.t-mini", { texto: m.fora.length + " escolha(s) guardada(s) fora do plano atual (de marcos além do alvo). Aumente o alvo para trazê-las de volta." }) : null;
      return [
        seletorDeAlvo(o, p),
        avisos,
        auto,
        marcos.length ? marcos : el("p.t-mini", { texto: m.alcancado ? "" : "Nenhuma decisão até este alvo — só ganhos automáticos." }),
        fora,
      ];
    }

    function itemDeEscolha(o, p, m, it) {
      var v = it.vaga;
      var texto = it.estado === "pendente" ? "A definir" : (it.descricao || (it.estado === "revisar" ? "escolha guardada" : ""));
      var acoes = [
        el("button.r-botao.r-botao--mini", {
          type: "button", "data-foco": "escolher-" + v.id,
          texto: it.estado === "pendente" ? "Escolher agora" : "Trocar",
          "aria-label": (it.estado === "pendente" ? "Escolher agora: " : "Trocar: ") + v.rotulo + ", " + v.rotuloEtapa,
          onclick: function () { escolher(o, p, v.id); },
        }),
      ];
      if (it.estado !== "pendente") {
        acoes.push(el("button.r-botao.r-botao--mini.r-botao--fantasma", {
          type: "button", "data-foco": "pendente-" + v.id, texto: "Deixar pendente",
          "aria-label": "Deixar pendente: " + v.rotulo + ", " + v.rotuloEtapa,
          onclick: function () { delete p.decisoes[v.id]; mudou(); },
        }));
      }
      return el("li.ram-item", { dataset: { estado: it.estado } }, [
        el("div.ram-item__corpo", {}, [
          el("span.ram-item__rotulo", { texto: v.rotulo + (it.eixo === "nivel" || it.eixo === "exposicao" ? " (" + it.eixo + ")" : "") + ": " }),
          el("span", { texto: texto }),
          " ", etiquetaDeEstado(it.estado),
          v.explicacao && it.estado === "pendente" ? el("span.t-mini.ram-item__ajuda", { texto: v.explicacao }) : null,
          it.motivos.length ? el("span.t-mini.t-erro", { texto: "Revisar: " + it.motivos.join(" ") }) : null,
        ]),
        el("div.faixa", {}, acoes),
      ]);
    }

    /* Abre a MESMA janela da Progressão, em cima da projeção. */
    function escolher(o, p, vagaId) {
      var m = M().montar(f(), p);
      var v = E().vagas(m.proj).filter(function (x) { return x.id === vagaId; })[0];
      if (!v) { UI.avisoErro("Esta etapa não faz parte do alvo atual."); return; }
      var falso = {
        /* A biblioteca de rituais reconhece a ficha de Ordem pelo tipo (catálogo oficial). */
        ficha: { tipoFicha: ctx.ficha.tipoFicha || "ordem", ordem: m.proj, rituais: { itens: m.projRituais, rotulos: ctx.ficha.rituais && ctx.ficha.rituais.rotulos }, inventario: f().inventario },
        alterou: function () {}, redesenhar: function () {}, emEdicao: function () { return true; },
      };
      function registrar() {
        var dec = M().decisaoDaProjecao(m.proj, m.projRituais, f().rituais, v);
        if (!dec) return;
        p.decisoes[v.id] = M().normalizarDecisao(dec);
        mudou();
      }
      if (v.tipo === "afinidade") {
        ES().abrirAfinidade({ ordem: m.proj, contexto: m.ctx, aoConfirmar: registrar });
        return;
      }
      ES().abrir({ ordem: m.proj, vagaId: v.id, contexto: m.ctx, rituais: m.projRituais, ctx: falso, aoRegistrar: registrar, aoMudarRituais: registrar });
    }

    function atualizarBase(o, p, m) {
      var detalhe = [];
      if (m.noBase.length) detalhe.push(m.noBase.length + " escolha(s) do plano são de marcos que a ficha já alcançou: ficam guardadas para \"Revisar escolhas já liberadas\".");
      if (m.revisar) detalhe.push(m.revisar + " escolha(s) precisam de revisão com a ficha atual.");
      detalhe.push("Alvo: " + M().rotuloDoAlvo(o, p.alvo) + ". As escolhas não mudam.");
      UI.confirmar({ titulo: "Atualizar a base do plano", texto: "O plano passa a partir da ficha como ela está agora (" + M().rotuloDoProgresso(M().progressoDe(o)) + ").", detalhe: detalhe.join(" "), rotuloConfirmar: "Atualizar base" })
        .then(function (sim) {
          if (!sim) return;
          p.base = { progresso: M().progressoDe(o), assinatura: M().assinatura(o, f().inventario) };
          p.regras = { tipo: M().tipoDoTrilho(o) };
          p.alvo = M().normalizarAlvo(o, p.alvo);
          mudou();
        });
    }

    /* ---------------- resumo ------------------------------------------ */
    function colunaDeResumo(o, p) {
      var m = M().montar(f(), p);
      var cmp = M().comparar(M().ladoDaFicha(f()), M().ladoDoPlano(f(), p, m));
      var grupos = cmp.grupos.map(function (g) {
        var linhas = g.titulo === "Recursos" ? g.linhas : g.linhas.filter(function (l) { return l.mudou; });
        if (!linhas.length) return null;
        return el("div.ram-grupo", {}, [
          el("h3.t-rotulo", { texto: g.titulo }),
          el("ul.ram-linhas", {}, linhas.map(function (l) {
            return el("li.ram-linha", { dataset: { mudou: l.mudou ? "sim" : "nao" } }, [
              el("span.ram-linha__rotulo", { texto: l.rotulo }),
              el("span.ram-linha__valores", { texto: valor(l.a) + " → " + valor(l.b) }),
              l.marco ? el("span.t-mini.ram-linha__marco", { texto: l.marco }) : null,
            ]);
          })),
        ]);
      });
      return [
        el("h3.t-secao", { texto: "Resumo: ficha atual → " + M().rotuloDoAlvo(o, p.alvo) }),
        el("p.t-mini", { texto: m.definidas + " definida(s) · " + m.pendentes + " a definir · " + m.revisar + " para revisar." }),
        m.pendentes ? el("p.t-mini.t-aviso", { texto: "Valores que dependem das escolhas \"A definir\" ainda não entram na conta." }) : null,
        grupos,
      ];
    }
    function valor(x) { return x === null || x === undefined ? "—" : String(x); }

    /* ---------------- comparar ---------------------------------------- */
    function painelComparar(o) {
      var lados = [{ id: "ficha", nome: "Ficha atual" }].concat(s.doc.planos.map(function (p) { return { id: p.id, nome: p.nome }; }));
      if (!s.comparar.b) s.comparar.b = s.selecionado;
      function sel(rotulo, chave) {
        var id = "ram-cmp-" + chave;
        return el("div.r-campo", {}, [
          el("label", { for: id, texto: rotulo }),
          el("select.r-entrada", { id: id, "data-foco": id, onchange: function (ev) { s.comparar[chave] = ev.target.value; pintar(); } },
            lados.map(function (l) { return el("option", { value: l.id, texto: l.nome, selected: l.id === s.comparar[chave] }); })),
        ]);
      }
      function lado(id) {
        if (id === "ficha") return M().ladoDaFicha(f());
        var p = s.doc.planos.filter(function (x) { return x.id === id; })[0];
        return p ? M().ladoDoPlano(f(), p) : M().ladoDaFicha(f());
      }
      var cmp = M().comparar(lado(s.comparar.a), lado(s.comparar.b));
      return [
        el("div.faixa.ram-cmp-escolha", {}, [sel("Comparar", "a"), el("span.ram-cmp-x", { texto: "×" }), sel("com", "b")]),
        cmp.alvosDiferem ? el("p.ram-aviso", { role: "status", texto: "Alvos diferentes: " + cmp.a.rotulo + " (" + cmp.a.progresso + ") × " + cmp.b.rotulo + " (" + cmp.b.progresso + "). A diferença inclui os marcos a mais." }) : null,
        [cmp.a, cmp.b].map(function (x) { return x.aDefinir || x.revisar ? el("p.t-mini.t-aviso", { texto: x.rotulo + ": " + x.aDefinir + " a definir, " + x.revisar + " para revisar." }) : null; }),
        cmp.grupos.map(function (g) {
          if (!g.linhas.length) return null;
          return el("div.ram-grupo", {}, [
            el("h3.t-rotulo", { texto: g.titulo }),
            el("ul.ram-linhas.ram-linhas--comparar", {}, g.linhas.map(function (l) {
              return el("li.ram-linha", { dataset: { mudou: l.mudou ? "sim" : "nao" } }, [
                el("span.ram-linha__rotulo", { texto: l.rotulo }),
                el("span.ram-linha__valores", {}, [
                  el("span", { "aria-label": cmp.a.rotulo, texto: valor(l.a) }), " × ", el("span", { "aria-label": cmp.b.rotulo, texto: valor(l.b) }),
                ]),
                l.mudou ? el("span.ram-linha__dif", { texto: "difere" }) : null,
                l.marco ? el("span.t-mini.ram-linha__marco", { texto: l.marco }) : null,
              ]);
            })),
          ]);
        }),
      ];
    }

    /* ---------------- salvar e ativar --------------------------------- */
    function rodape(o, p) {
      var r = o.ramificacao && o.ramificacao.planoId ? o.ramificacao : null;
      var ehAtivo = p && r && r.planoId === p.id;
      var botoes = [
        el("button.r-botao" + (s.sujo ? ".r-botao--principal" : ""), { type: "button", texto: s.salvando ? "Salvando…" : (s.sujo ? "Salvar planos" : "Planos salvos"), "data-foco": "salvar", disabled: !s.sujo || s.salvando, onclick: function () { salvar(); } }),
      ];
      if (p && M().tipoDoTrilho(o) !== "mundano") {
        if (ehAtivo) botoes.push(el("button.r-botao.r-botao--fantasma", { type: "button", texto: "Desativar aplicação automática", "data-foco": "desativar", onclick: function () { desativar(ctx).then(pintar); } }));
        else botoes.push(el("button.r-botao", { type: "button", texto: r ? "Ativar este plano no lugar de " + r.nomePlano : "Ativar aplicação automática", "data-foco": "ativar", onclick: function () { ativar(o, p); } }));
      }
      return el("div.ram-rodape", {}, [
        s.sujo ? el("p.t-mini.t-aviso", { role: "status", texto: "Há mudanças não salvas nos planos. Salvar não muda a ficha." }) : el("p.t-mini", { texto: "Planejar não muda a ficha, não rola dados e não gasta nada." }),
        el("div.faixa", {}, botoes),
      ]);
    }

    function salvar() {
      if (s.salvando) return Promise.resolve(false);
      s.salvando = true; pintar();
      return gravar(ctx, s.doc).then(function (r) {
        s.salvando = false;
        if (r.ok) {
          s.doc = copiar(entradaDe(ctx).doc);
          s.sujo = false;
          /* O plano ativo foi excluído: a aplicação automática para. */
          var at = f().ordem.ramificacao;
          if (at && at.planoId && !s.doc.planos.some(function (x) { return x.id === at.planoId; })) { M().desativar(f().ordem); depoisDeMudar(ctx); }
          else if (at && at.planoId) {
            var pa = s.doc.planos.filter(function (x) { return x.id === at.planoId; })[0];
            if (pa && pa.nome !== at.nomePlano) { at.nomePlano = pa.nome; ctx.alterou(); }
          }
          UI.avisoOk("Planos salvos.");
          pintar();
          return true;
        }
        if (r.conflito) {
          pintar();
          return UI.confirmar({
            titulo: "Os planos mudaram em outro lugar",
            texto: "Outra aba ou outro dispositivo salvou os planos desta ficha depois que você abriu o planejador.",
            detalhe: "Salvar por cima troca a lista salva pela sua. Cancelar mantém o seu rascunho aberto, sem salvar.",
            rotuloConfirmar: "Salvar por cima",
          }).then(function (sim) {
            if (!sim) return false;
            entradaDe(ctx).rev = r.rev;
            return salvar();
          });
        }
        pintar();
        UI.avisoErro(r.erro === "limite" ? "Limite de planos por ficha atingido." : r.erro === "dados_grandes" ? "Os planos ficaram grandes demais para salvar. Exclua um plano ou deixe escolhas pendentes." : r.erro === "instalacao_incompleta" ? "O servidor ainda não tem o espaço dos planos (falta rodar setupRama). O rascunho continua aberto." : "Não deu para salvar. O rascunho continua aberto: tente de novo.");
        return false;
      }, function () {
        s.salvando = false; pintar();
        UI.avisoErro("Sem conexão para salvar. O rascunho continua aberto: tente de novo.");
        return false;
      });
    }

    function ativar(o, p) {
      var antes = s.sujo ? salvar() : Promise.resolve(true);
      antes.then(function (ok) {
        if (!ok) return;
        var p2 = s.doc.planos.filter(function (x) { return x.id === p.id; })[0];
        if (!p2) return;
        var r = o.ramificacao && o.ramificacao.planoId ? o.ramificacao : null;
        var m = M().montar(f(), p2);
        var atr = M().atrasadas(f(), p2);
        var detalhe = [
          "Quando a progressão real chegar a cada marco (" + (m.marcos.map(function (x) { return x.rotulo; }).join(", ") || "nenhum até o alvo") + "), as " + m.definidas + " escolha(s) definida(s) entram sozinhas, conferidas de novo pela Progressão.",
          m.pendentes ? m.pendentes + " escolha(s) a definir ficam abertas na Progressão, como hoje." : "",
          "Nada é aplicado agora. Os avanços de NEX, nível, PP ou estágio continuam pelo caminho normal.",
          r ? "Troca: as escolhas futuras passam a ser as de " + p2.nome + " no lugar de " + r.nomePlano + "; o que já entrou fica." : "",
          atr.length ? atr.length + " escolha(s) deste plano são de marcos já alcançados: depois, use \"Revisar escolhas já liberadas\"." : "",
        ].filter(Boolean).join(" ");
        return UI.confirmar({ titulo: "Ativar o plano " + p2.nome, texto: "Uma ficha tem um plano ativo por vez.", detalhe: detalhe, rotuloConfirmar: "Ativar" }).then(function (sim) {
          if (!sim) return;
          M().ativar(f().ordem, p2);
          depoisDeMudar(ctx);
          UI.avisoOk("Plano " + p2.nome + " ativo. Ele age nos próximos marcos reais.");
          pintar();
        });
      });
    }

    return janela;
  }

  global.RAMAFichaRamificacao = {
    painel: painel,
    abrir: abrir,
    aoMudarOrdem: aoMudarOrdem,
    aoAbrir: aoAbrir,
    aplicarAgora: aplicarAgora,
    _cache: cache,
  };
})(window);
