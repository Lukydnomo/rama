/* =====================================================================
   R.A.M.A. — aba Hacking da campanha (v2.38, Arquivos Secretos 4)
   ---------------------------------------------------------------------
   A regra OPCIONAL de Hacking (AS4 p. 72–73). Desligada por padrão: o
   mestre liga aqui, e só então a aba aparece para os jogadores. Não tem
   ligação com o Hexatombe, e as ações daqui não são usos gerais de
   Tecnologia — existem só dentro de uma cena de hacking.

   O mestre conduz: cria a cena (o sistema e a DT de Hackear, que vira os
   PS), põe os agentes (treino em Tecnologia e Intelecto = dados
   virtuais), abre e fecha os turnos, registra as ações (até duas por
   turno), fecha a rodada com os imprevistos que ELE confirma, e encerra
   o acesso quando a cena de jogo acaba. Os testes de Tecnologia são
   rolados na ficha de cada um; os dados virtuais (d6), aqui, pelo motor
   de sempre. As regras moram em js/ordem/hacking.js; esta tela aplica
   UMA operação por vez sobre uma cópia e grava o estado (rev + opId).

   O jogador vê as cenas em que um personagem dele participa, sem as
   notas do mestre. Tudo é acontecimento do RPG: nada aqui acessa
   dispositivo, rede ou arquivo de verdade.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil, UI = global.RAMAUI, el = U.el;
  function H() { return global.RAMAHacking; }
  function D() { return global.RAMADados; }

  var NOMES_DO_ESTADO = { preparando: "preparando", andamento: "em andamento", invadido: "invadido — acesso nesta cena", encerrada: "encerrada" };

  function rolarD6(n) {
    var r = D().somar(n + "d6");
    return r && r.ok ? r.rolagens.slice() : [];
  }

  function formulario(titulo, campos, aoConfirmar, rotuloConfirmar) {
    UI.modal({
      titulo: titulo,
      conteudo: [el("div.pilha--curta", { class: "pilha" }, campos.filter(Boolean))],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: rotuloConfirmar || "Confirmar", classe: "r-botao--principal", aoClicar: function (fechar) {
          var valores = {};
          campos.forEach(function (c) { if (c && c.chave) valores[c.chave] = c.entrada ? (c.entrada.type === "checkbox" ? c.entrada.checked : c.entrada.value) : null; });
          Promise.resolve(aoConfirmar(valores)).then(function (ok) { if (ok !== false) fechar(); });
        } },
      ],
    });
  }
  function campo(chave, o) { var c = UI.campo(o); c.chave = chave; return c; }
  function marcaCheck(chave, rotulo, marcado) {
    var entrada = el("input", { type: "checkbox", checked: !!marcado });
    var raiz = el("label.r-marca", {}, [entrada, el("span", { texto: rotulo })]);
    raiz.entrada = entrada;
    raiz.chave = chave;
    return raiz;
  }
  function mini(texto, aoClicar, op) {
    var x = op || {};
    return el("button.r-botao.r-botao--mini" + (x.classe ? "." + x.classe : ""), { type: "button", texto: texto, disabled: !!x.desligado, title: x.dica || "", onclick: aoClicar });
  }

  function aba(ctx) {
    var alvo = el("div.pilha", {}, [UI.carregando("Consultando o Hacking")]);
    var memoria = { estado: null, rev: 0, vista: null, mestre: ctx.ehMestre(), ocupado: false, aberta: "" };

    async function carregar(segundoPlano) {
      var r = await global.RAMAApi.lerHacking(ctx.campanhaId, { segundoPlano: !!segundoPlano });
      if (!r.ok) { if (!segundoPlano) U.trocar(alvo, UI.erroDeTela(r, function () { carregar(); })); return; }
      receber(r);
      pintar();
    }
    function receber(r) {
      memoria.rev = U.inteiro(r.rev, 0);
      memoria.mestre = !!(r.dados && r.dados.mestre);
      memoria.estado = memoria.mestre ? H().normalizar(r.dados.estado) : null;
      memoria.vista = memoria.mestre ? null : r.dados.vista;
    }

    ctx.aoAtualizar("hacking", function () { if (!memoria.ocupado) carregar(true); });

    /* Uma operação: cópia → regra → gravação. `fn(copia)` devolve
       { ok, motivo } — a cena da cópia já vem achada quando há id. */
    async function operar(cenaId, fn, sucesso) {
      if (memoria.ocupado) return false;
      var copia = H().normalizar(U.copiar(memoria.estado));
      var c = cenaId ? H().cena(copia, cenaId) : null;
      if (cenaId && !c) { UI.avisoAtencao("A cena não existe mais."); return false; }
      var r = fn(copia, c);
      if (!r || !r.ok) { UI.avisoAtencao((r && r.motivo) || "Não deu para aplicar."); return false; }
      memoria.ocupado = true;
      try {
        var g = await global.RAMAApi.salvarHacking(ctx.campanhaId, memoria.rev, "hk-" + U.uuid().replace(/-/g, "").slice(0, 20), copia);
        if (!g.ok) {
          if (g.erro === "conflito" && g.dados) {
            receber(g);
            pintar();
            UI.avisoAtencao("Outra janela mudou o Hacking antes. A tela foi atualizada: confira e refaça.");
            return false;
          }
          UI.avisoDeFalha(g, "gravação do Hacking");
          return false;
        }
        receber(g);
        if (sucesso) sucesso(r);
        pintar();
        return true;
      } finally {
        memoria.ocupado = false;
      }
    }

    function pintar() {
      U.trocar(alvo, memoria.mestre ? vistaDoMestre(memoria.estado) : vistaDoJogador(memoria.vista));
    }

    /* ---------------- jogador ---------------- */

    function vistaDoJogador(v) {
      if (!v || !v.ativo) return [UI.vazio({ titulo: "Sem Hacking", texto: "O mestre não ligou a regra opcional de Hacking nesta campanha." })];
      if (!v.cenas.length) return [UI.vazio({ titulo: "Nenhuma cena de hacking", texto: "Quando um personagem seu entrar numa cena de hacking, ela aparece aqui." })];
      return v.cenas.map(function (c) { return painelDaCena(c, false); });
    }

    /* ---------------- mestre ---------------- */

    function vistaDoMestre(e) {
      var partes = [
        UI.painel("Regra opcional de Hacking", el("div.pilha--curta", { class: "pilha" }, [
          el("p.t-mini", { texto: "Arquivos Secretos 4, p. 72–73. Cenas de hacking com turnos e rodadas, pontos de segurança (PS) e dados virtuais. Independente do Hexatombe; as ações valem só dentro destas cenas. Tudo é acontecimento do RPG — nenhum dispositivo, rede ou arquivo de verdade é tocado." }),
          marcaLigar(e),
          e.ativo ? el("div.faixa", {}, [mini("Nova cena de hacking…", novaCena, { classe: "r-botao--principal" })]) : null,
          UI.recolhivel({ titulo: "O que o livro não diz (interpretações desta ficha)", conteudo: [el("ul.pilha--curta", { class: "pilha" }, H().AMBIGUIDADES.map(function (a) { return el("li.t-mini", { texto: a }); }))] }),
        ])),
      ];
      if (!e.ativo) {
        partes.push(UI.vazio({ titulo: "Regra desligada", texto: "Ligue a regra para criar cenas de hacking. Os jogadores só veem a aba com ela ligada." }));
        return partes;
      }
      if (!e.cenas.length) partes.push(UI.vazio({ titulo: "Nenhuma cena", texto: "Crie uma cena com o sistema-alvo e a DT de Hackear dele (OPRPG p. 48)." }));
      e.cenas.slice().reverse().forEach(function (c) { partes.push(painelDaCena(c, true)); });
      return partes;
    }

    function marcaLigar(e) {
      return el("label.r-marca", {}, [
        el("input", { type: "checkbox", checked: e.ativo, onchange: function (ev) {
          var sim = ev.target.checked;
          operar("", function (copia) { return H().ligar(copia, sim); }).then(function (ok) { if (!ok) ev.target.checked = !sim; });
        } }),
        el("span", { texto: "Usar a regra de Hacking nesta campanha" }),
      ]);
    }

    function novaCena() {
      formulario("Nova cena de hacking", [
        campo("nome", { rotulo: "Sistema-alvo", limite: 80, dica: "Celular da vítima, servidor da produtora…" }),
        campo("dt", { rotulo: "DT de Hackear (vira os PS)", tipo: "numero", limite: 2, ajuda: "A DT da ação Hackear (OPRPG p. 48): DT 20 = 20 PS." }),
        campo("notas", { rotulo: "Notas do mestre (só você vê)", tipo: "area", linhas: 3, limite: 1000 }),
        marcaCheck("psVisivel", "Mostrar os PS aos jogadores", false),
      ], function (v) {
        return operar("", function (copia) { return H().criarCena(copia, { nome: v.nome, dt: v.dt, notas: v.notas, psVisivel: v.psVisivel }); },
          function (r) { memoria.aberta = r.cena.id; });
      }, "Criar");
    }

    /* ---------------- uma cena ---------------- */

    function painelDaCena(c, mestre) {
      var cabeca = [
        el("p.t-forte", { texto: NOMES_DO_ESTADO[c.estado] + (c.estado === "andamento" ? " · rodada " + c.rodada : "") }),
        c.psMax !== null && c.psMax !== undefined
          ? el("div.hk-ps", {}, [
              el("span.t-rotulo", { texto: "PS" }),
              el("progress.hk-barra", { max: c.psMax, value: c.psAtual, "aria-label": "Pontos de segurança: " + c.psAtual + " de " + c.psMax }),
              el("span.t-forte", { texto: c.psAtual + " / " + c.psMax }),
            ])
          : el("p.t-mini", { texto: "PS: o mestre não mostra." }),
        c.acesso ? el("p.t-mini.t-aviso", { texto: "Acesso aos arquivos liberado nesta cena" + (c.acesso.origem === "backdoor" ? " (backdoor de " + c.acesso.por + ")" : "") + ". Numa cena posterior, é preciso hackear de novo." }) : null,
        mestre && c.notas ? el("p.t-mini", { texto: "Notas: " + c.notas }) : null,
      ];
      var corpo = cabeca.concat([
        tabelaDeAgentes(c, mestre),
        c.backdoors.length ? listaDeBackdoors(c, mestre) : null,
        c.virus.length ? listaDeVirus(c, mestre) : null,
        c.imprevistos.length ? UI.recolhivel({ titulo: "Imprevistos (" + c.imprevistos.length + ")", conteudo: [el("ul.pilha--curta", { class: "pilha" }, c.imprevistos.slice().reverse().map(function (m) {
          return el("li.t-mini", { texto: "Rodada " + m.rodada + " · " + m.participante + " (" + m.uns + "×1" + (m.manual ? ", escolhido pelo mestre" : "") + "): " + H().POR_IMPREVISTO[m.tipo].nome + (m.nota ? " — " + m.nota : "") });
        }))] }) : null,
        UI.recolhivel({ titulo: "Histórico (" + c.historico.length + ")", conteudo: [el("ul.pilha--curta", { class: "pilha" }, c.historico.slice().reverse().map(function (h) {
          return el("li.t-mini", { texto: (h.rodada ? "R" + h.rodada + " · " : "") + h.texto });
        }))] }),
        mestre ? controlesDaCena(c) : null,
      ]);
      return UI.recolhivel({
        titulo: c.nome,
        extra: NOMES_DO_ESTADO[c.estado],
        classe: "hk-cena",
        aberto: memoria.aberta === c.id || c.estado === "andamento" || c.estado === "invadido",
        aoAlternar: function (aberto) { if (aberto) memoria.aberta = c.id; },
        conteudo: [el("div.pilha--curta", { class: "pilha" }, corpo.filter(Boolean))],
      });
    }

    function tabelaDeAgentes(c, mestre) {
      if (!c.participantes.length) return el("p.t-mini", { texto: "Nenhum agente nesta cena." });
      return el("ul.pilha--curta.hk-agentes", { class: "pilha" }, c.participantes.map(function (p) {
        var marcas = [p.treino + " em Tecnologia", p.dados + " dado(s) virtual(is)"];
        if (p.noTurno) marcas.push("no turno (" + p.acoes + "/" + H().ACOES_POR_TURNO + " ações)");
        if (p.cobrir) marcas.push("rastros cobertos");
        if (H().penalidadeEmTecnologia(c, p)) marcas.push("Dor nos pulsos: −2 em Tecnologia");
        if (p.perdeDado) marcas.push("perde 1 dado no próximo turno");
        if (p.unsUltimo && !p.noTurno) marcas.push(p.unsUltimo + "×1 no último turno");
        var partes = [el("p.t-forte", { texto: p.nome }), el("p.t-mini", { texto: marcas.join(" · ") })];
        if (mestre) partes.push(controlesDoAgente(c, p));
        return el("li.pilha--curta.hk-agente", { class: "pilha" }, partes);
      }));
    }

    function listaDeBackdoors(c, mestre) {
      return el("div.pilha--curta", { class: "pilha" }, [el("p.t-rotulo", { texto: "Backdoors" })].concat(c.backdoors.map(function (b) {
        return el("div.faixa", {}, [
          el("span.t-mini", { texto: b.por + " · " + b.dispositivo + ": " + (b.usos - b.usados) + " de " + b.usos + " acesso(s)" }),
          mestre && b.usados < b.usos ? mini("Acessar por aqui", function () {
            operar(c.id, function (copia, cc) { return H().usarBackdoor(cc, b.id); });
          }, { desligado: !!c.acesso }) : null,
        ]);
      })));
    }

    function listaDeVirus(c, mestre) {
      return el("div.pilha--curta", { class: "pilha" }, [el("p.t-rotulo", { texto: "Vírus espiões" })].concat(c.virus.map(function (v) {
        return el("div.faixa", {}, [
          el("span.t-mini", { texto: v.por + ": " + (v.ativo ? "ativo" : "removido pelo firewall") + (v.avisos ? " · " + v.avisos + " aviso(s)" : "") }),
          mestre && v.ativo ? mini("Interação nova: avisar (1d4)…", function () { avisarVirus(c, v); }) : null,
        ]);
      })));
    }

    function avisarVirus(c, v) {
      formulario("Vírus de " + v.por, [
        el("p.t-mini", { texto: "A seu critério, uma interação nova com o sistema é notificada a quem plantou o vírus, com os arquivos acessados e as modificações. A cada aviso, 1d4: no 1, o firewall encontra e remove o vírus." }),
        campo("oque", { rotulo: "O que aconteceu no sistema", limite: 160 }),
      ], function (val) {
        var d4 = D().somar("1d4").total;
        return operar(c.id, function (copia, cc) { return H().avisoDoVirus(cc, v.id, d4, val.oque); }, function (r) {
          UI.aviso("1d4 = " + d4 + (r.removido ? ": o firewall removeu o vírus." : ": o vírus continua."));
        });
      }, "Avisar e rolar 1d4");
    }

    function controlesDaCena(c) {
      var b = [];
      if (c.estado === "preparando") {
        b.push(mini("Adicionar agente…", function () { adicionarAgente(c); }, { desligado: c.participantes.length >= 6 }));
        b.push(mini("Começar o hacking", function () { operar(c.id, function (copia, cc) { return H().iniciar(cc); }); }, { classe: "r-botao--principal", desligado: !c.participantes.length }));
      }
      if (c.estado === "andamento") b.push(mini("Fim da rodada (imprevistos)…", function () { fimDaRodada(c); }, { classe: "r-botao--principal" }));
      if (c.acesso) b.push(mini("A cena acabou: encerrar o acesso", function () {
        UI.confirmar({ titulo: "Encerrar o acesso", texto: "O acesso aos arquivos dura uma cena. Numa cena posterior, é preciso hackear de novo (ou usar um backdoor).", rotuloConfirmar: "Encerrar" })
          .then(function (sim) { if (sim) operar(c.id, function (copia, cc) { return H().encerrarAcesso(cc); }); });
      }));
      if (c.estado === "encerrada" || c.estado === "invadido") b.push(mini("Hackear de novo (novo processo)", function () {
        UI.confirmar({ titulo: "Hackear de novo", texto: "PS no máximo e dados virtuais pelo Intelecto de cada agente. Backdoors e vírus continuam no sistema.", rotuloConfirmar: "Recomeçar" })
          .then(function (sim) { if (sim) operar(c.id, function (copia, cc) { return H().recomecar(cc); }); });
      }));
      b.push(mini("Anotar…", function () {
        formulario("Anotar no histórico", [campo("t", { rotulo: "Anotação", limite: 300 })], function (v) {
          return operar(c.id, function (copia, cc) { return H().anotar(cc, v.t); });
        }, "Anotar");
      }));
      b.push(mini("Editar…", function () {
        formulario("Editar " + c.nome, [
          campo("nome", { rotulo: "Sistema-alvo", limite: 80, valor: c.nome }),
          campo("notas", { rotulo: "Notas do mestre (só você vê)", tipo: "area", linhas: 3, limite: 1000, valor: c.notas }),
          marcaCheck("psVisivel", "Mostrar os PS aos jogadores", c.psVisivel),
        ], function (v) { return operar(c.id, function (copia, cc) { return H().editarCena(cc, v); }); }, "Salvar");
      }));
      b.push(mini("Apagar", function () {
        UI.confirmar({ titulo: "Apagar a cena", texto: "Apaga a cena de hacking " + c.nome + ", com histórico, backdoors e vírus.", rotuloConfirmar: "Apagar", perigo: true })
          .then(function (sim) { if (sim) operar("", function (copia) { return H().apagarCena(copia, c.id); }); });
      }, { classe: "r-botao--perigo" }));
      return el("div.faixa", {}, b);
    }

    function adicionarAgente(c) {
      var pcs = (ctx.personagens || []).filter(function (p) { return !c.participantes.some(function (x) { return x.personagemId === p.id; }); });
      formulario("Agente na cena", [
        el("p.t-mini", { texto: "Para hackear: ao menos treinado em Tecnologia e um aparelho próprio que se conecte ao alvo. O agente começa com tantos dados virtuais quanto o Intelecto." }),
        campo("personagemId", { rotulo: "Personagem da campanha (opcional)", tipo: "selecao", valor: "",
          opcoes: [{ valor: "", rotulo: "Nenhum (só o nome)" }].concat(pcs.map(function (p) { return { valor: p.id, rotulo: p.nome }; })) }),
        campo("nome", { rotulo: "Nome", limite: 80, ajuda: "Vazio usa o nome do personagem." }),
        campo("treino", { rotulo: "Treino em Tecnologia", tipo: "selecao", valor: "treinado",
          opcoes: H().TREINOS.map(function (t) { return { valor: t, rotulo: t }; }) }),
        campo("intelecto", { rotulo: "Intelecto", tipo: "numero", limite: 2, valor: "1" }),
      ], function (v) {
        var pc = pcs.filter(function (p) { return p.id === v.personagemId; })[0];
        return operar(c.id, function (copia, cc) {
          return H().adicionarParticipante(cc, { nome: v.nome || (pc ? pc.nome : ""), personagemId: v.personagemId, treino: v.treino, intelecto: v.intelecto });
        });
      }, "Adicionar");
    }

    function controlesDoAgente(c, p) {
      var b = [];
      if (c.estado === "preparando") {
        b.push(mini("Tirar", function () { operar(c.id, function (copia, cc) { return H().tirarParticipante(cc, p.id); }); }, { classe: "r-botao--fantasma" }));
        return el("div.faixa", {}, b);
      }
      if (c.estado !== "andamento") return null;
      if (!p.noTurno) {
        b.push(mini("Começar o turno", function () {
          operar(c.id, function (copia, cc) { return H().iniciarTurno(cc, p.id); }, function (r) { (r.notas || []).forEach(function (n) { UI.aviso(p.nome + " — " + n); }); });
        }));
        return el("div.faixa", {}, b);
      }
      var livre = p.acoes < H().ACOES_POR_TURNO;
      H().ACOES.forEach(function (a) {
        var pode = H().podeAcao(p, a.chave);
        b.push(mini(a.nome, function () { acao(c, p, a.chave); }, { desligado: !livre || !pode, dica: pode ? "" : "Exige ser " + a.treino + " em Tecnologia." }));
      });
      b.push(mini("Fim do turno", function () { operar(c.id, function (copia, cc) { return H().encerrarTurno(cc, p.id); }); }, { classe: "r-botao--fantasma" }));
      return el("div.faixa", {}, b);
    }

    /* As cinco ações. Os testes de Tecnologia vêm da ficha (o total);
       os d6 virtuais são rolados aqui, por clique. */
    function acao(c, p, chave) {
      var pen = H().penalidadeEmTecnologia(c, p);
      var aviso = pen ? el("p.t-mini.t-aviso", { texto: "Dor nos pulsos: −2 neste teste de Tecnologia (desconte do total)." }) : null;
      if (chave === "procurarBrechas") {
        formulario("Procurar Brechas · " + p.nome, [
          el("p.t-mini", { texto: "Teste de Tecnologia contra DT " + H().dtDeBrechas(p) + " (15, +5 a cada tentativa seguinte). Sucesso: +1 dado virtual." }), aviso,
          campo("total", { rotulo: "Resultado do teste de Tecnologia", tipo: "numero", limite: 3 }),
        ], function (v) {
          return operar(c.id, function (copia, cc) { return H().procurarBrechas(cc, p.id, v.total); }, function (r) {
            UI.aviso(r.sucesso ? "Brecha encontrada: +1 dado virtual." : "Nenhuma brecha (DT " + r.dt + ").");
          });
        }, "Registrar");
        return;
      }
      if (chave === "cobrirRastros") {
        formulario("Cobrir Rastros · " + p.nome, [
          el("p.t-mini", { texto: "Teste de Tecnologia contra os PS máximos (DT " + c.psMax + "). Sucesso: na próxima ação que rolar dados virtuais, os resultados 1 rolam de novo (fica o segundo)." }), aviso,
          campo("total", { rotulo: "Resultado do teste de Tecnologia", tipo: "numero", limite: 3 }),
        ], function (v) {
          return operar(c.id, function (copia, cc) { return H().cobrirRastros(cc, p.id, v.total); }, function (r) {
            UI.aviso(r.sucesso ? "Rastros cobertos." : "Falhou (DT " + r.dt + ").");
          });
        }, "Registrar");
        return;
      }
      if (chave === "quebrarCodigos") {
        formulario("Quebrar Códigos · " + p.nome, [
          el("p.t-mini", { texto: "Gaste dados virtuais à escolha (tem " + p.dados + "): a soma vira dano nos PS." + (p.cobrir ? " Rastros cobertos: os 1 rolam de novo." : "") }),
          campo("n", { rotulo: "Quantos dados virtuais (d6)", tipo: "numero", limite: 2, valor: String(Math.max(1, p.dados)) }),
        ], function (v) {
          var n = U.inteiro(v.n, 0);
          if (n < 1 || n > p.dados) { UI.avisoAtencao("Escolha de 1 a " + p.dados + " dado(s)."); return false; }
          var valores = rolarD6(n);
          var novos = p.cobrir ? rolarD6(valores.filter(function (x) { return x === 1; }).length || 0) : [];
          return operar(c.id, function (copia, cc) { return H().quebrarCodigos(cc, p.id, valores, novos); }, function (r) {
            global.RAMARolagens.mostrar({ ok: true, tipo: "soma", nome: "Quebrar Códigos", expressao: n + "d6", rolagens: r.valores, total: r.soma,
              parcelas: [{ rotulo: n + "d6 virtuais", valor: r.soma, detalhe: r.valores.join(" + ") }] },
              { nome: c.nome + " · Quebrar Códigos (" + p.nome + ")", notas: [r.soma + " de dano nos PS." + (r.invadiu ? " O sistema caiu!" : ""), r.uns ? r.uns + " resultado(s) 1: contam para o imprevisto do fim da rodada." : ""].filter(Boolean) });
          });
        }, "Rolar e aplicar");
        return;
      }
      if (chave === "programarBackdoor") {
        formulario("Programar Backdoor · " + p.nome, [
          el("p.t-mini", { texto: "Descarte 1 ou mais dados virtuais (tem " + p.dados + "), sem rolar. Cada d6 = um acesso ao sistema, por outro dispositivo, sem hackear de novo." }),
          campo("n", { rotulo: "Dados descartados", tipo: "numero", limite: 2, valor: "1" }),
          campo("dispositivo", { rotulo: "Dispositivo de acesso", limite: 80 }),
        ], function (v) { return operar(c.id, function (copia, cc) { return H().programarBackdoor(cc, p.id, v.n, v.dispositivo); }); }, "Programar");
        return;
      }
      if (chave === "plantarVirus") {
        UI.confirmar({ titulo: "Plantar Vírus · " + p.nome, texto: "Descarta 1 dado virtual, sem rolar. O vírus espião avisa das interações novas com o sistema (a seu critério); a cada aviso, 1d4 — no 1, o firewall o remove.", rotuloConfirmar: "Plantar" })
          .then(function (sim) { if (sim) operar(c.id, function (copia, cc) { return H().plantarVirus(cc, p.id); }); });
      }
    }

    /* Fim da rodada: a sugestão do livro para cada agente, que o mestre
       confirma ou troca. Rastro detectado rola 2d6 aqui. */
    function fimDaRodada(c) {
      var propostas = H().proporImprevistos(c);
      var escolhas = propostas.map(function (x) { return { participante: x.participante, tipo: x.tipo, sugerido: x.tipo }; });
      var opcoes = [{ valor: "", rotulo: "Nenhum" }].concat(H().IMPREVISTOS.map(function (m) { return { valor: m.chave, rotulo: m.nome + " (" + m.uns + "×1)" }; }));
      var linhas = propostas.map(function (x, i) {
        return el("div.r-campo", {}, [
          el("label", { texto: x.nome + " — " + x.uns + " resultado(s) 1 no último turno" + (x.tipo ? "" : " (o livro não diz o imprevisto com zero)") }),
          el("select.r-selecao", { onchange: function (ev) { escolhas[i].tipo = ev.target.value; } },
            opcoes.map(function (o) { return el("option", { value: o.valor, texto: o.rotulo, selected: o.valor === x.tipo }); })),
        ]);
      });
      UI.modal({ titulo: "Fim da rodada " + c.rodada, conteudo: [el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", { texto: "No fim de cada rodada, um imprevisto por agente, pelo número de resultados 1 nos dados virtuais do último turno dele (até 4). Confira antes de aplicar." }),
      ].concat(H().IMPREVISTOS.map(function (m) { return el("p.t-mini", { texto: m.uns + "×1 · " + m.nome + ": " + m.texto }); }), linhas))], botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Aplicar e passar a rodada", classe: "r-botao--principal", aoClicar: function (fechar) {
          var lista = escolhas.map(function (e) { return { participante: e.participante, tipo: e.tipo, manual: e.tipo !== e.sugerido }; });
          var rastros = lista.filter(function (e) { return e.tipo === "rastroDetectado"; }).map(function () { return D().somar("2d6").total; });
          operar(c.id, function (copia, cc) { return H().fimDaRodada(cc, lista, rastros); }, function (r) {
            fechar();
            if (r.aplicados.length) UI.aviso(r.aplicados.map(function (a) { return a.participante + ": " + H().POR_IMPREVISTO[a.tipo].nome + " — " + a.nota; }).join(" · "), { duracao: 10000 });
          });
        } },
      ] });
    }

    carregar();
    return alvo;
  }

  global.RAMACampanhaHacking = { aba: aba };
})(window);
