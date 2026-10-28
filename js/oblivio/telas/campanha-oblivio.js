/* =====================================================================
   R.A.M.A. — aba Oblívio da campanha: a mesa da Testemunha (v3.0)
   ---------------------------------------------------------------------
   A ferramenta de toda campanha de Oblívio (v4.0: o sistema da campanha
   decide; não há mais chave para ligar). A Testemunha (mestre) conduz; os jogadores veem a VISTA DOS JOGADORES — sem a ficha das
   Ameaças, sem as cartas não reveladas do Buraco, sem o registro
   privado.

     Missão e Partida   abrir, concluir (progressão nas fichas vivas)
     Cena               Combate, Descanso, Interação, Tensão; Ordem de
                        Ação pela Velocidade; turnos, rodadas, Adiar
     Fileiras           a posição define o alcance (casas, p. 117–118)
     Farol              a luz, o combustível, a Escuridão (p. 80–81)
     Encontro           as 18 Ameaças, Proteção completa × restante,
                        dano, derrota, retornos, ataques nas Personas
     Buraco             construção, cartas, eventos, saída

   Cada ação é UMA operação: cópia do estado → regra (js/oblivio/) →
   salvar_oblivio (rev + opId). Os MOMENTOS que tocam fichas (fim do
   turno, fim da rodada, início da cena, Missão) seguem por
   oblivio_operar — o servidor aplica nas fichas de Oblívio da campanha,
   uma vez por id. Acerto de Ameaça numa Persona vira um ATAQUE
   PENDENTE: quem recebe escolhe a região e o Durável na ficha (p. 66).
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil, UI = global.RAMAUI, el = U.el;
  function C() { return global.RAMAOblivioCatalogo; }
  function R() { return global.RAMAOblivio; }
  function M() { return global.RAMAOblivioMesa; }
  function K() { return global.RAMAOblivioCombate; }
  function AM() { return global.RAMAOblivioMotorAmeacas; }
  function AD() { return global.RAMAOblivioAmeacas; }
  function BU() { return global.RAMAOblivioMotorBuraco; }

  function rolador(f) { return global.RAMADados.rolar("1d" + f).rolagens[0]; }
  function opId() { return "ob-" + U.uuid().replace(/-/g, "").slice(0, 24); }
  function mini(texto, aoClicar, op) {
    var x = op || {};
    return el("button.r-botao.r-botao--mini" + (x.classe ? "." + x.classe : ""), { type: "button", texto: texto, disabled: !!x.desligado, title: x.dica || "", onclick: aoClicar });
  }
  function linha(t, classe) { return el("p.t-mini" + (classe ? "." + classe : ""), { texto: t }); }
  function selecao(rotulo, opcoes, valor) { return UI.campo({ rotulo: rotulo, tipo: "selecao", valor: valor, opcoes: opcoes }); }
  function numero(rotulo, valor) { return UI.campo({ rotulo: rotulo, tipo: "numero", valor: valor }); }

  /* Os momentos que o servidor aplica nas fichas. */
  var MOMENTOS_DAS_FICHAS = ["fimDoTurno", "fimDaRodada", "inicioDaCena", "iniciarMissao", "concluirMissao", "inicioDoTurno"];

  var NOMES = {
    missaoIniciada: function (e) { return "Missão aberta: " + e.nome; },
    missaoConcluida: function (e) { return "Missão concluída" + (e.mortos ? " (" + e.mortos + " morte(s))" : ""); },
    cenaIniciada: function (e) { return "Cena de " + C().cena[e.tipo].nome; },
    cenaEncerrada: function () { return "Cena encerrada"; },
    novaRodada: function (e) { return "Rodada " + e.rodada; },
    vez: function (e) { return "Vez de " + (e.nome || "—"); },
    luzAcesa: function (e) { return "Luz acesa (" + e.rodadas + " rodadas)"; },
    luzAbastecida: function (e) { return "Luz abastecida (" + e.rodadas + " rodadas)"; },
    luzApagando: function (e) { return e.texto; },
    escuridaoIminente: function (e) { return "Escuridão: 1D6 = " + e.d6 + " → " + e.rodadas + " rodada(s) para reacender"; },
    escuridao: function (e) { return e.texto; },
    luzDerrubada: function () { return "A luz caiu"; },
    ameacaEntrou: function (e) { return e.nome + " entrou no encontro"; },
    danoNaAmeaca: function (e) { return e.valor + " de dano (" + e.total + "/" + e.limite + ")"; },
    derrotada: function (e) { return e.nome + " derrotada"; },
    retornoPendente: function () { return "Pode voltar — impeça o retorno"; },
    retornou: function () { return "Uma Ameaça voltou"; },
    transformacao: function () { return "O Rei dos Ratos virou Enxame (3 rodadas)"; },
    explosaoIminente: function () { return "Vai explodir: Cena de Tensão"; },
    mutacao: function (e) { return "Mutação: 1D6 = " + e.d6 + " (" + e.pontos + " ponto(s))"; },
    cartaSacada: function (e) { return "Carta: " + e.tipo + " (1D100 = " + e.d100 + ")"; },
    resultadoDaCarta: function (e) { return e.nome + " (" + e.d + ")"; },
    efeitoDoBuraco: function (e) { return "Efeito do Buraco: " + e.nome; },
    missaoDoBuraco: function (e) { return "Missão do Buraco: " + e.nome; },
    saiuDoBuraco: function (e) { return "Saíram do Buraco" + (e.curaTotal ? " (cura total)" : ""); },
    missaoCumprida: function () { return "Missão do Buraco cumprida"; },
  };
  function narrar(eventos) {
    var frases = (eventos || []).map(function (e) { var f = NOMES[e.tipo]; return f ? f(e) : ""; }).filter(Boolean);
    if (frases.length) UI.aviso(frases.slice(0, 5).join(" · ") + (frases.length > 5 ? " …" : ""), { duracao: 8000 });
  }

  function aba(ctx) {
    var alvo = el("div.pilha.oblivio-mesa", {}, [UI.carregando("Abrindo a mesa de Oblívio")]);
    var mem = { estado: null, vista: null, mestre: ctx.ehMestre(), rev: 0, ocupado: false, buracoAberto: "" };

    async function carregar(segundoPlano) {
      var r = await global.RAMAApi.lerOblivio(ctx.campanhaId, "", { segundoPlano: !!segundoPlano });
      if (!r.ok) { if (!segundoPlano) U.trocar(alvo, UI.erroDeTela(r, function () { carregar(); })); return; }
      receber(r);
      pintar();
    }
    function receber(r) {
      mem.rev = U.inteiro(r.rev, 0);
      mem.mestre = !!(r.dados && r.dados.mestre);
      mem.estado = mem.mestre ? M().normalizar(r.dados.estado) : null;
      mem.vista = mem.mestre ? null : r.dados.vista;
    }

    ctx.aoAtualizar("oblivio", function () { if (!mem.ocupado) carregar(true); });
    ctx.aoAtualizar("personagens", function () { if (!mem.ocupado) pintar(); });

    /* As Personas de Oblívio da campanha (o painel já as tem). */
    function personas() { return ctx.personagens.filter(function (p) { return p.tipoFicha === "oblivio"; }); }
    function persona(id) { return personas().filter(function (p) { return p.id === id; })[0] || null; }
    function nomeDe(ref) {
      var p = persona(ref);
      if (p) return p.nome;
      var e = mem.estado || mem.vista;
      var a = e ? e.encontro.ameacas.filter(function (x) { return x.id === ref; })[0] : null;
      return a ? a.nome : "—";
    }

    /* Uma operação: cópia → regra → gravação → momentos nas fichas. */
    async function operar(fn, aoTerminar) {
      if (mem.ocupado) return false;
      var copia = M().normalizar(U.copiar(mem.estado));
      var r = fn(copia);
      if (!r || r.ok === false) { UI.avisoAtencao((r && r.motivo) || "Não deu para aplicar."); return false; }
      mem.ocupado = true;
      var id = opId();
      try {
        var g = await global.RAMAApi.salvarOblivio(ctx.campanhaId, mem.rev, id, copia);
        if (!g.ok) {
          if (g.erro === "conflito" && g.dados) { receber(g); pintar(); UI.avisoAtencao("Outra janela mudou a mesa antes. A tela foi atualizada: confira e refaça."); return false; }
          UI.avisoDeFalha(g, "gravação da mesa de Oblívio");
          return false;
        }
        receber(g);
        narrar(r.eventos);
        var momentos = (r.momentos || []).filter(function (m) { return MOMENTOS_DAS_FICHAS.indexOf(m.tipo) >= 0; });
        if (momentos.length) await aplicarMomentos(id + "-m", momentos);
        if (aoTerminar) aoTerminar(r);
        pintar();
        return true;
      } finally {
        mem.ocupado = false;
      }
    }

    async function aplicarMomentos(id, momentos) {
      var mm = await global.RAMAApi.oblivioOperar(ctx.campanhaId, id, { tipo: "momentos", momentos: momentos });
      if (!mm.ok) {
        UI.avisoDeFalha(mm, "aplicar o tempo da mesa nas fichas", { tentarDeNovo: function () { aplicarMomentos(id, momentos); } });
        return;
      }
      var evs = (mm.dados && mm.dados.eventos) || [];
      var fora = evs.filter(function (e) { return e.tipo === "atingiuLimite" || e.tipo === "foraDeAcao" || e.tipo === "morte"; });
      if (fora.length) UI.avisoAtencao(fora.map(function (e) { return nomeDe(e.persona) + ": " + (e.tipo === "morte" ? "morreu (" + e.causa + ")" : e.tipo === "foraDeAcao" ? "Fora de Ação" : "atingiu o limite"); }).join(" · "), { duracao: 12000 });
      if (mm.dados && mm.dados.gravadas && ctx.sincronizarAgora) ctx.sincronizarAgora();
    }

    /* Repinta a aba sem tirar a Testemunha do lugar em que estava. */
    function pintar() {
      var y = global.scrollY;
      U.trocar(alvo, mem.mestre ? vistaDaTestemunha(mem.estado) : vistaDoJogador(mem.vista));
      if (alvo.isConnected) global.scrollTo(0, y);
    }

    /* =================================================================
       JOGADOR
       ================================================================= */

    function vistaDoJogador(v) {
      if (!v) return [UI.vazio({ titulo: "Mesa da Testemunha", texto: "A mesa ainda não chegou. Recarregue a página." })];
      var minhas = personas().filter(function (p) { return p.souDono; }).map(function (p) { return p.id; });
      var pend = v.encontro.ataquesPendentes.filter(function (p) { return minhas.indexOf(p.persona) >= 0; });
      return [
        UI.painel("Missão e cena", [resumoDaCena(v), ordemDeAcao(v, false)]),
        pend.length ? UI.painel("Acertos esperando você", pend.map(function (p) {
          return el("div.faixa", {}, [el("span", { texto: nomeDe(p.persona) + ": " + p.nome + " acertou — " + p.dano + " de Estresse." }),
            el("a.r-botao.r-botao--mini", { href: U.url("ficha/?id=" + encodeURIComponent(p.persona)), texto: "Escolher a região na ficha" })]);
        })) : null,
        UI.painel("Fileiras", [fileiras(v, false)]),
        UI.painel("Farol", [farol(v, false)]),
        v.encontro.ameacas.length ? UI.painel("Encontro", [el("ul.oblivio-ameacas", {}, v.encontro.ameacas.map(function (a) {
          return el("li.oblivio-ameaca", { dataset: { estado: a.estado } }, [
            el("span.oblivio-ameaca__nome", { texto: a.nome + " · Grau " + a.grau }),
            el("span.t-mini", { texto: a.estado === "ativa" ? "ferida " + a.ferida + "% · " + a.regioes + " região(ões)" : a.estado }),
          ]);
        }))]) : null,
        v.buraco ? UI.painel("Buraco", [buracoDosJogadores(v.buraco)]) : null,
        registro(v),
      ];
    }

    function buracoDosJogadores(b) {
      var atual = b.cartas.filter(function (c) { return c.id === b.atual; })[0];
      return el("div.pilha.pilha--curta", {}, [
        b.missao ? linha("Missão: " + b.missao.nome + (b.missao.cumprida ? " (cumprida)" : "") + " — " + b.missao.resumo) : null,
        b.efeito ? linha("Efeito: " + b.efeito.nome + " — " + b.efeito.resumo) : null,
        atual ? el("p", { texto: "Vocês estão em: " + nomeDaCarta(atual) + (atual.resultado ? " — " + atual.resultado.nome : "") }) : null,
        mapa(b, false),
      ]);
    }

    /* =================================================================
       TESTEMUNHA
       ================================================================= */

    function vistaDaTestemunha(e) {
      return [
        UI.painel("Missão e Partida", [missao(e)]),
        UI.painel("Cena", [resumoDaCena(e), controlesDaCena(e), ordemDeAcao(e, true)]),
        UI.painel("Fileiras e alcance", [fileiras(e, true)]),
        UI.painel("Farol", [farol(e, true)]),
        UI.painel("Encontro", [encontro(e)]),
        UI.painel("Buraco", [buraco(e)]),
        UI.painel("Ajustes da mesa", [ajustes(e)]),
        registro(e),
      ];
    }

    /* ---------------- Missão e Partida ---------------- */

    function missao(e) {
      return el("div.pilha.pilha--curta", {}, [
        el("p", { texto: (e.missao ? "Missão: " + e.missao.nome + (e.missao.mortos.length ? " · " + e.missao.mortos.length + " morte(s)" : "") : "Nenhuma Missão em andamento") + " · Partida " + e.partida.n + " · " + e.missoes.length + " concluída(s)." }),
        el("div.faixa", {}, [
          !e.missao ? mini("Abrir Missão", function () {
            UI.pedirTexto({ titulo: "Abrir Missão", rotulo: "Nome da Missão", valor: "Missão " + (e.missoes.length + 1), rotuloConfirmar: "Abrir" }).then(function (nome) {
              if (nome === null) return;
              operar(function (m) { return M().iniciarMissao(m, nome); });
            });
          }) : mini("Concluir Missão", function () {
            UI.confirmar({ titulo: "Concluir a Missão?", texto: "Cada Persona viva recebe a progressão (p. 95) e o contador de Fora de Ação recomeça.", rotuloConfirmar: "Concluir" }).then(function (s) {
              if (s) operar(function (m) { return M().concluirMissao(m); });
            });
          }),
          mini("Nova Partida (sessão)", function () {
            operar(function (m) { m.partida = { id: R().novoId("pt"), n: m.partida.n + 1 }; M().registrar(m, "partida", { n: m.partida.n }); return { ok: true, eventos: [] }; });
          }, { dica: "Limites \"por Partida\" recomeçam." }),
          e.missao ? mini("Registrar morte na Missão", function () {
            var sel = selecao("Persona", personas().map(function (p) { return { valor: p.id, rotulo: p.nome }; }));
            UI.modal({ titulo: "Morte na Missão", conteudo: [sel, linha("Conta para a progressão de quem sobreviver (p. 95).")], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" },
              { rotulo: "Registrar", classe: "r-botao--principal", aoClicar: function (f) { f(); operar(function (m) { M().registrarMorte(m, sel.entrada.value); return { ok: true, eventos: [] }; }); } }] });
          }) : null,
        ]),
      ]);
    }

    /* ---------------- Cena ---------------- */

    function resumoDaCena(e) {
      var c = e.cena;
      var partes = [e.missao ? "Missão: " + e.missao.nome : "Sem Missão"];
      if (c) {
        partes.push("Cena " + c.n + ": " + C().cena[c.tipo].nome + (c.rodada ? ", rodada " + c.rodada : ""));
        if (c.tensao) partes.push("Tensão: " + c.tensao.acumulados + (c.tensao.meta ? "/" + c.tensao.meta : "") + " sucesso(s)" + (c.tensao.rodadas ? ", " + c.tensao.rodadas + " rodada(s)" : "") + (c.tensao.motivo ? " — " + c.tensao.motivo : ""));
        var vez = M().atual(e);
        if (vez) partes.push("Vez de " + nomeDe(vez.ref));
      } else partes.push("nenhuma cena aberta");
      return el("p", { role: "status", texto: partes.join(" · ") });
    }

    function participantesDaCena(e) {
      var lista = e.fileiras.personas.map(function (id) {
        var p = persona(id);
        return { ref: id, tipo: "persona", nome: p ? p.nome : id, velocidade: p && p.oblivio && p.oblivio.velocidade !== undefined ? p.oblivio.velocidade : 0 };
      });
      e.encontro.ameacas.filter(function (a) { return a.estado === "ativa"; }).forEach(function (a) {
        lista.push({ ref: a.id, tipo: "ameaca", nome: a.nome, velocidade: AM().velocidadeAtual(a) });
      });
      return lista;
    }

    function controlesDaCena(e) {
      var tipo = selecao("Nova cena", C().CENAS.map(function (c) { return { valor: c.chave, rotulo: c.nome }; }), "combate");
      return el("div.pilha.pilha--curta", {}, [
        el("div.faixa", {}, [tipo, mini("Abrir cena", function () {
          var t = tipo.entrada.value;
          if (t === "tensao") { abrirTensao(e); return; }
          operar(function (m) { return M().iniciarCena(m, t, participantesDaCena(m)); });
        }, { dica: "A Ordem de Ação sai da Velocidade de quem está nas fileiras e das Ameaças ativas." })]),
        e.cena ? el("div.faixa", {}, [
          e.cena.ordem.length ? mini("Fim do turno → próximo", function () { operar(function (m) { return M().avancarTurno(m, rolador); }); }, { classe: "r-botao--principal" }) : null,
          e.cena.ordem.length ? mini("Adiar…", function () { adiar(e); }) : null,
          e.cena.tipo === "tensao" ? mini("Somar sucessos na Tensão", function () { somarTensao(); }) : null,
          e.cena.tipo === "tensao" ? mini("Trocar Personas de posição", function () { trocar(e); }) : null,
          mini("Encerrar cena", function () { operar(function (m) { return M().encerrarCena(m); }); }),
        ]) : null,
      ]);
    }

    function abrirTensao(e) {
      var rod = numero("Rodadas (0: sem limite)", 3), suc = numero("Sucessos coletivos para vencer (0: sem meta)", 0);
      var motivo = UI.campo({ rotulo: "Motivo", valor: "", limite: 120 });
      UI.modal({ titulo: "Cena de Tensão", conteudo: [rod, suc, motivo, linha("Na Tensão, Personas podem trocar de posição entre si; Extremo vale 2 sucessos; Escapar como Ação Completa dobra (p. 87, 120).")],
        botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Abrir", classe: "r-botao--principal", aoClicar: function (f) {
          f(); operar(function (m) { return M().iniciarCena(m, "tensao", participantesDaCena(m), { rodadas: U.inteiro(rod.entrada.value, 0), sucessos: U.inteiro(suc.entrada.value, 0), motivo: motivo.entrada.value }); });
        } }] });
    }

    function somarTensao() {
      var res = selecao("Resultado", Object.keys(C().RESULTADOS).map(function (k) { return { valor: k, rotulo: C().RESULTADOS[k].nome }; }), "sucessoRegular");
      var completa = el("label.r-marca", {}, [el("input", { type: "checkbox" }), el("span", { texto: "Escapar como Ação Completa (dobra)" })]);
      UI.modal({ titulo: "Somar na Tensão", conteudo: [res, completa], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Somar", classe: "r-botao--principal", aoClicar: function (f) {
        f();
        var x = null;
        operar(function (m) { x = M().somarNaTensao(m, res.entrada.value, completa.querySelector("input").checked); return x; }, function () {
          if (x && x.alcancou) UI.avisoOk("A meta da Tensão foi alcançada (" + x.acumulados + ").");
        });
      } }] });
    }

    function adiar(e) {
      var quem = selecao("Quem adia", e.cena.ordem.map(function (o) { return { valor: o.ref, rotulo: nomeDe(o.ref) }; }));
      var pos = numero("Descer quantas posições", 1);
      UI.modal({ titulo: "Adiar (p. 117)", conteudo: [quem, pos], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Adiar", classe: "r-botao--principal", aoClicar: function (f) {
        f(); operar(function (m) { return M().adiar(m, quem.entrada.value, U.inteiro(pos.entrada.value, 1)); });
      } }] });
    }

    function trocar(e) {
      var ops = e.cena.ordem.filter(function (o) { return o.tipo === "persona"; }).map(function (o) { return { valor: o.ref, rotulo: nomeDe(o.ref) }; });
      var a = selecao("Persona", ops), b = selecao("Troca com", ops);
      UI.modal({ titulo: "Trocar na Tensão", conteudo: [a, b], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Trocar", classe: "r-botao--principal", aoClicar: function (f) {
        f(); operar(function (m) { return M().trocarNaTensao(m, a.entrada.value, b.entrada.value); });
      } }] });
    }

    function ordemDeAcao(e, mestre) {
      if (!e.cena || !e.cena.ordem.length) return null;
      return el("ol.oblivio-ordem", { "aria-label": "Ordem de Ação" }, e.cena.ordem.map(function (o, i) {
        var vez = i === e.cena.turno;
        return el("li.oblivio-ordem__item", { class: (vez ? "oblivio-ordem__item--vez" : "") + (o.adiado ? " oblivio-ordem__item--adiado" : ""), "aria-current": vez ? "step" : null }, [
          el("span", { texto: nomeDe(o.ref) }),
          el("span.t-mini", { texto: (o.tipo === "ameaca" ? "Ameaça · " : "") + "Velocidade " + o.velocidade + (o.adiado ? " · adiou" : "") }),
        ]);
      }));
    }

    /* ---------------- Fileiras ---------------- */

    function fileiras(e, mestre) {
      var casasDe = function (id) { var a = M().instancia(e, id); return a ? a.casas : 1; };
      function linhaDaFileira(lista, tipo) {
        return el("ol.oblivio-fileira", { "aria-label": tipo === "persona" ? "Fileira das Personas" : "Fileira das Ameaças" }, lista.map(function (id, i) {
          var casa = M().casaDoAlvo(e, id, casasDe);
          var alc = M().alcanceDe(casa);
          return el("li.oblivio-fileira__casa", {}, [
            el("span", { texto: nomeDe(id) }),
            el("span.t-mini", { texto: casa + "ª casa · " + (alc ? alc.nome : "") + (e.farol.persona === id ? " · Farol" : "") }),
            mestre ? el("span.faixa", {}, [
              mini("↑", function () { operar(function (m) { return M().moverNaFileira(m, id, i - 1); }); }, { desligado: i === 0, dica: "Para a frente" }),
              mini("↓", function () { operar(function (m) { return M().moverNaFileira(m, id, i + 1); }); }, { desligado: i === lista.length - 1, dica: "Para trás" }),
              tipo === "persona" ? mini("Tirar", function () { operar(function (m) { m.fileiras.personas = m.fileiras.personas.filter(function (x) { return x !== id; }); return { ok: true, eventos: [] }; }); }) : null,
            ]) : null,
          ]);
        }));
      }
      var fora = personas().filter(function (p) { return e.fileiras.personas.indexOf(p.id) < 0; });
      return el("div.pilha.pilha--curta", {}, [
        linha("A posição na fileira é o alcance: 1ª casa Adjacente, 2ª Curto, 3ª Médio, 4ª Longo, 5ª+ Absoluto (p. 117). Quem está atrás de Quem Protege com Escudo Humano recebe a Proteção dela."),
        el("h4.t-rotulo", { texto: "Personas" }),
        e.fileiras.personas.length ? linhaDaFileira(e.fileiras.personas, "persona") : linha("Ninguém na fileira."),
        mestre && fora.length ? el("div.faixa", {}, fora.map(function (p) {
          return mini("+ " + p.nome, function () { operar(function (m) { m.fileiras.personas.push(p.id); return { ok: true, eventos: [] }; }); });
        })) : null,
        el("h4.t-rotulo", { texto: "Ameaças" }),
        e.fileiras.ameacas.length ? linhaDaFileira(e.fileiras.ameacas, "ameaca") : linha("Nenhuma Ameaça na fileira."),
      ]);
    }

    /* ---------------- Farol ---------------- */

    function farol(e, mestre) {
      var f = e.farol;
      var problemas = M().problemasDoFarol(e);
      var estado = f.aceso ? "Aceso — " + f.rodadas + " rodada(s) de luz (" + f.cenas + " cena(s))" : f.apagada ? (f.apagada.graca ? "Apagou: reacendam até o fim da próxima rodada" : f.apagada.consumada ? "A Escuridão venceu" : "Escuridão: " + (f.apagada.restam || 0) + " rodada(s) para reacender") : "Apagado";
      var base = [
        el("p", { role: "status", texto: "Farol: " + (f.persona ? nomeDe(f.persona) : "ninguém") + " · " + estado + (f.derrubado ? " · a luz está no chão" : "") }),
        problemas.length ? el("ul.oblivio-lista", {}, problemas.map(function (p) { return el("li", { texto: p.texto }); })) : null,
      ];
      if (!mestre) return el("div.pilha.pilha--curta", {}, base);
      var quem = selecao("Farol (quem leva a luz)", [{ valor: "", rotulo: "—" }].concat(e.fileiras.personas.map(function (id) { return { valor: id, rotulo: nomeDe(id) }; })), f.persona);
      var efet = el("label.r-marca", {}, [el("input", { type: "checkbox" }), el("span", { texto: "Combustível com Efetividade (dobra)" })]);
      return el("div.pilha.pilha--curta", {}, base.concat([
        el("div.faixa", {}, [quem, mini("Definir Farol", function () { operar(function (m) { return M().definirFarol(m, quem.entrada.value, ""); }); })]),
        efet,
        el("div.faixa", {}, [
          mini(f.aceso ? "Abastecer" : "Acender", function () {
            var ef = efet.querySelector("input").checked;
            operar(function (m) { return f.aceso ? M().abastecer(m, m.farol.persona, { efetividade: ef }) : M().acender(m, { efetividade: ef }); });
          }, { desligado: !f.persona }),
          mini("Derrubar a luz", function () { operar(function (m) { return M().derrubarLuz(m, ""); }); }, { desligado: !f.aceso || f.derrubado }),
          f.derrubado ? mini("Alguém pegou a luz", function () {
            var sel = selecao("Quem pega", e.fileiras.personas.map(function (id) { return { valor: id, rotulo: nomeDe(id) }; }));
            UI.modal({ titulo: "Pegar a luz", conteudo: [sel], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Pegar", classe: "r-botao--principal", aoClicar: function (fe) { fe(); operar(function (m) { return M().pegarLuz(m, sel.entrada.value, true); }); } }] });
          }) : null,
          mini("Rolar a Escuridão (1D6)", function () { operar(function (m) { return M().escuridao(m, rolador); }); }, { dica: "A luz apagou de vez: Cena de Tensão de 1 ou 2 rodadas (p. 81)." }),
        ]),
      ]));
    }

    /* ---------------- Encontro ---------------- */

    function encontro(e) {
      var ativas = e.encontro.ameacas.filter(function (a) { return a.estado !== "unida"; });
      var escolha = selecao("Ameaça", AD().AMEACAS.map(function (a) { return { valor: a.chave, rotulo: "Grau " + a.grau + " · " + a.nome + " (p. " + a.pag + ")" }; }), "golfo");
      var qtd = numero("Quantas", 1);
      var dif = BU().dificuldadeDeEncontro(e.fileiras.personas.length || personas().length, e.missoes.length);
      var golfos = e.encontro.ameacas.filter(function (a) { return a.chave === "golfo" && a.estado === "ativa"; }).length;
      return el("div.pilha.pilha--curta", {}, [
        linha("Dificuldade de Encontro sugerida (p. 104): " + ({ facil: "Fácil", medio: "Médio", dificil: "Difícil" }[dif] || dif) + " — pela quantidade de Personas e de Missões concluídas."),
        el("div.faixa", {}, [escolha, qtd, mini("Pôr no encontro", function () {
          var k = escolha.entrada.value, n = U.limitar(U.inteiro(qtd.entrada.value, 1), 1, 12);
          if (k === "quimera") { montarQuimera(); return; }
          operar(function (m) { var ev = []; for (var i = 0; i < n; i++) { var r = M().adicionarAmeaca(m, k, rolador, { cena: m.cena ? m.cena.id : "" }); if (!r.ok) return r; ev = ev.concat(r.eventos); } return { ok: true, eventos: ev }; });
        })]),
        golfos >= 3 ? mini("Unir os Golfos (A União Faz a Força)", function () {
          operar(function (m) {
            var r = AM().unirGolfos(m.encontro.ameacas, rolador);
            if (!r.ok) return r;
            m.fileiras.ameacas = m.fileiras.ameacas.filter(function (id) { return r.consumidas.indexOf(id) < 0; });
            m.encontro.ameacas.push(r.nova); m.fileiras.ameacas.push(r.nova.id);
            m.encontro.protecoes[r.nova.id] = K().novoEstadoDeProtecao(AM().protecaoCompleta(r.nova, { personasNaCena: m.fileiras.personas.length, ajustes: m.ajustes }).total);
            return r;
          });
        }) : golfos ? mini("Golfos sem união: destruídos no fim da próxima rodada", function () { operar(function (m) { AM().marcarGolfosSemUniao(m.encontro.ameacas); return { ok: true, eventos: [] }; }); }) : null,
        e.encontro.ataquesPendentes.length ? el("div.pilha.pilha--curta", {}, [el("h4.t-rotulo", { texto: "Acertos esperando a Persona escolher a região" })].concat(e.encontro.ataquesPendentes.map(function (p) {
          return el("div.faixa", {}, [el("span", { texto: nomeDe(p.persona) + " ← " + p.nome + ": " + p.dano }),
            mini("Aplicar pela Testemunha", function () { aplicarPendente(p); }),
            mini("Cancelar", function () { operar(function (m) { m.encontro.ataquesPendentes = m.encontro.ataquesPendentes.filter(function (x) { return x.id !== p.id; }); return { ok: true, eventos: [] }; }); })]);
        }))) : null,
        ativas.length ? el("ul.oblivio-ameacas", {}, ativas.map(function (a) { return cartaoDaAmeaca(e, a); })) : linha("Nenhuma Ameaça no encontro."),
        ativas.length ? el("div.faixa", {}, [
          mini("Uma Persona ficou Fora de Ação", function () { operar(function (m) { var ev = []; m.encontro.ameacas.forEach(function (a) { ev = ev.concat(AM().aoPersonaForaDeAcao(a).eventos); }); return { ok: true, eventos: ev }; }); }, { dica: "A Forca volta (Fim de Todas as Coisas)." }),
          mini("Limpar o encontro", function () {
            UI.confirmar({ titulo: "Limpar o encontro?", texto: "As Ameaças saem da mesa (derrotadas e ativas).", rotuloConfirmar: "Limpar", perigo: true }).then(function (s) {
              if (s) operar(function (m) { m.encontro = { ameacas: [], protecoes: {}, analisados: {}, ataquesPendentes: m.encontro.ataquesPendentes }; m.fileiras.ameacas = []; return { ok: true, eventos: [] }; });
            });
          }),
        ]) : null,
      ]);
    }

    function cartaoDaAmeaca(e, a) {
      var cat = AD().ameaca[a.chave];
      var prot = e.encontro.protecoes[a.id];
      var completa = AM().protecaoCompleta(a, { personasNaCena: e.fileiras.personas.length, ajustes: e.ajustes });
      var vivas = AM().regioesVivas(a).length;
      var botoes = [];
      if (a.estado === "ativa") {
        botoes.push(mini("Atacar uma Persona", function () { ataqueDaAmeaca(e, a); }, { classe: "r-botao--principal" }));
        botoes.push(mini("Dano", function () { danoNaAmeaca(a); }));
        botoes.push(mini("Recuperar", function () {
          UI.pedirTexto({ titulo: "Recuperar Estresse", rotulo: "Quanto", valor: "1" }).then(function (v) { if (v !== null) operar(function (m) { return Object.assign({ ok: true }, AM().recuperar(M().instancia(m, a.id), U.inteiro(v, 0))); }); });
        }));
        if (a.habilidades.indexOf("apropriacaoForcada") >= 0) botoes.push(mini("Benefício (Apropriação)", function () { beneficio(a); }));
        if (a.habilidades.indexOf("muralhaDeCarne") >= 0 || a.chave === "horda" || a.chave === "reiDosRatos") botoes.push(mini("Trocar regiões por…", function () { invocar(a); }));
        if (a.mutacao && a.mutacao.pontos > 0) botoes.push(mini("Gastar Mutação (" + a.mutacao.pontos + ")", function () { mutacao(a); }));
        botoes.push(mini("Derrotar", function () { operar(function (m) { return AM().derrotar(M().instancia(m, a.id), {}); }); }));
      }
      if (a.estado === "derrotada" && a.retorno && !a.retorno.impedido) botoes.push(mini("Impedir o retorno", function () {
        var meio = selecao("Como", [{ valor: "fogo", rotulo: "Fogo (Combustível, Bomba Incendiária)" }, { valor: "vinculoCessado", rotulo: "Vínculo cessado" }, { valor: "combustivel", rotulo: "Combustível" }, { valor: "bombaIncendiaria", rotulo: "Bomba Incendiária" }]);
        UI.modal({ titulo: "Impedir o retorno de " + a.nome, conteudo: [meio], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Impedir", classe: "r-botao--principal", aoClicar: function (f) { f(); operar(function (m) { return AM().impedirRetorno(M().instancia(m, a.id), meio.entrada.value); }); } }] });
      }));
      if (a.estado !== "ativa") botoes.push(mini("Recompensa (1D6)", function () {
        var r = AM().recompensa(a.chave, rolador);
        UI.aviso("Recompensa de " + a.nome + ": 1D6 = " + r.d6 + " — " + (r.itens.length ? r.itens.map(function (x) { var c = C().equipamento[x.item]; return (x.qtd > 1 ? x.qtd + "× " : "") + (c ? c.nome : x.item + " (a Testemunha decide)"); }).join(", ") : "nada"), { duracao: 12000 });
      }));
      botoes.push(mini("Tirar", function () { operar(function (m) { m.encontro.ameacas = m.encontro.ameacas.filter(function (x) { return x.id !== a.id; }); m.fileiras.ameacas = m.fileiras.ameacas.filter(function (x) { return x !== a.id; }); delete m.encontro.protecoes[a.id]; return { ok: true, eventos: [] }; }); }));
      return el("li.oblivio-ameaca", { dataset: { estado: a.estado } }, [
        el("div.oblivio-ameaca__topo", {}, [
          el("span.oblivio-ameaca__nome", { texto: a.nome + " · Grau " + a.grau }),
          el("span.r-etiqueta" + (a.estado === "ativa" ? "" : ".r-etiqueta--aviso"), { texto: { ativa: "ativa", derrotada: "derrotada", destruida: "destruída", unida: "unida" }[a.estado] || a.estado }),
        ]),
        el("p", { texto: "Estresse " + a.estresse + "/" + a.limite + " · Regiões " + vivas + "/" + a.regioes.length + " · Proteção " + (prot ? prot.restante : completa.total) + "/" + completa.total + " · Dano " + AM().danoAtual(a) + " · Velocidade " + AM().velocidadeAtual(a) + " · " + a.casas + " casa(s)" }),
        linha(Object.keys(a.atributos).map(function (k) { return C().atributo[k].sigla + " " + a.atributos[k]; }).join(" · ") + (a.especializacoes.length ? " · Especializada em " + a.especializacoes.map(function (k) { return C().conhecimento[k].nome; }).join(", ") : "")),
        cat ? UI.recolhivel({ titulo: "Habilidades (p. " + cat.pag + ")", conteudo: [el("ul.oblivio-lista", {}, cat.habilidades.map(function (h) { return el("li", { texto: h.nome + (h.acao ? " (" + h.acao + ")" : "") + ": " + h.resumo }); }))] }) : null,
        a.notas.length ? linha(a.notas.join(" ")) : null,
        a.retorno ? linha("Retorno: " + (a.retorno.impedido ? "impedido" : a.retorno.quando === "personaForaDeAcao" ? "quando uma Persona ficar Fora de Ação" : "no fim da próxima cena")) : null,
        el("div.faixa", {}, botoes),
      ]);
    }

    function danoNaAmeaca(a) {
      var valor = numero("Dano", 0);
      var classe = selecao("De quê", [{ valor: "", rotulo: "Ataque comum" }, { valor: "bomba", rotulo: "Bomba" }]);
      var corr = el("label.r-marca", {}, [el("input", { type: "checkbox" }), el("span", { texto: "Equipamento Corrompido" })]);
      var corpo = el("label.r-marca", {}, [el("input", { type: "checkbox" }), el("span", { texto: "Corpo a corpo" })]);
      UI.modal({ titulo: "Dano em " + a.nome, conteudo: [valor, classe, corr, corpo, linha("Ataques das Personas pela ficha já chegam aqui sozinhos; use isto para dano de bomba, armadilha ou decisão da mesa.")],
        botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (f) {
          f();
          operar(function (m) { return AM().sofrerDano(M().instancia(m, a.id), U.inteiro(valor.entrada.value, 0), { classe: classe.entrada.value, corrompido: corr.querySelector("input").checked, corpoACorpo: corpo.querySelector("input").checked }, rolador); });
        } }] });
    }

    /* A Ameaça ataca (p. 50–51; A9): um dado por região viva (até 5);
       as falhas cansam a Ameaça. Os sucessos desgastam a Proteção da
       Persona; acertando, o dano vira um acerto pendente que a Persona
       recebe escolhendo a região. */
    function ataqueDaAmeaca(e, a) {
      var cat = AD().ameaca[a.chave];
      var alvo = selecao("Persona alvo", e.fileiras.personas.map(function (id) { return { valor: id, rotulo: nomeDe(id) }; }));
      var comDano = (cat ? cat.habilidades : []).filter(function (h) { return h.dano; });
      var forma = selecao("Ataque", [{ valor: "", rotulo: "Comum (Dano " + AM().danoAtual(a) + ")" }].concat(comDano.map(function (h) { return { valor: h.chave, rotulo: h.nome + " (" + h.dano.toUpperCase() + ")" }; })));
      var dados = numero("Dados (regiões vivas, até 5)", Math.min(5, AM().regioesVivas(a).length || 1));
      var dif = selecao("Dificuldade", C().DIFICULDADES.map(function (d) { return { valor: d.chave, rotulo: d.nome }; }), "normal");
      var bonus = numero("Bônus em cada dado", 0);
      var noChao = el("label.r-marca", {}, [el("input", { type: "checkbox" }), el("span", { texto: "Alvo No Chão (rola duas vezes, fica com o melhor)" })]);
      var distancia = el("label.r-marca", {}, [el("input", { type: "checkbox" }), el("span", { texto: "À distância (Proteção Elevada reduz)" })]);
      if (!e.fileiras.personas.length) { UI.avisoAtencao("Ponha as Personas na fileira primeiro."); return; }
      UI.modal({ titulo: a.nome + " ataca", conteudo: [alvo, forma, dados, dif, bonus, noChao, distancia],
        botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Rolar", classe: "r-botao--principal", aoClicar: function (f) {
          f();
          var saida = null;
          var pid = alvo.entrada.value;
          var p = persona(pid);
          var completa = p && p.oblivio && p.oblivio.protecao !== undefined ? p.oblivio.protecao : 0;
          operar(function (m) {
            var inst = M().instancia(m, a.id);
            var rol = AM().rolarAtaque(inst, { dados: U.inteiro(dados.entrada.value, 1), dificuldade: dif.entrada.value, bonus: U.inteiro(bonus.entrada.value, 0), alvoNoChao: noChao.querySelector("input").checked }, rolador);
            var prot = M().protecaoDoAlvo(m, pid, completa);
            var acerto = K().aplicarSucessos(prot, rol.sucessos, inst.id, {});
            var dano = 0, faces = [];
            if (acerto.acertou) {
              if (forma.entrada.value) { var dh = AM().danoDaHabilidade(inst, forma.entrada.value, rolador, 0); dano = dh.total; faces = dh.faces; }
              else dano = AM().danoAtual(inst);
              m.encontro.ataquesPendentes.push({ id: R().novoId("ap"), ameaca: inst.id, nome: inst.nome, persona: pid, dano: dano, aDistancia: distancia.querySelector("input").checked, corpoACorpo: !distancia.querySelector("input").checked, quando: new Date().toISOString() });
            }
            M().registrar(m, "ataqueDaAmeaca", { ameaca: inst.id, persona: pid, sucessos: rol.sucessos, acertou: !!acerto.acertou, dano: dano });
            saida = { rol: rol, acerto: acerto, dano: dano, faces: faces };
            return { ok: true, eventos: [] };
          }, function () {
            var r = saida;
            UI.modal({ titulo: a.nome + " → " + nomeDe(pid), conteudo: [
              el("ol.oblivio-dados", {}, r.rol.dados.map(function (d) { return el("li.oblivio-dado", { class: "oblivio-dado--" + { falhaExtrema: "fe", falhaRegular: "fr", sucessoRegular: "sr", sucessoExtremo: "se" }[d.resultado] }, [el("span", { texto: d.faces.join("/") + " = " + d.total + " · " + C().RESULTADOS[d.resultado].nome })]); })),
              el("p", { texto: r.rol.sucessos + " sucesso(s) contra Proteção " + r.acerto.restanteAntes + (r.rol.estresseDasFalhas ? " · as falhas deram " + r.rol.estresseDasFalhas + " de Estresse na Ameaça" : "") }),
              el("p", { texto: r.acerto.acertou ? "Acertou: " + r.dano + " de Estresse" + (r.faces.length ? " (" + r.faces.join("+") + ")" : "") + ". A Persona escolhe a região na ficha." : "Não acertou; a Proteção caiu para " + r.acerto.restanteDepois + "." }),
            ], botoes: [{ rotulo: "Fechar", classe: "r-botao--principal" }] });
          });
        } }] });
    }

    /* Sem a pessoa na mesa: a Testemunha escolhe a região. */
    function aplicarPendente(p) {
      var pp = persona(p.persona);
      var regs = pp && pp.oblivio && Array.isArray(pp.oblivio.regioes) ? pp.oblivio.regioes.filter(function (r) { return r.estado !== "ausente"; }) : [];
      var reg = selecao("Região", regs.map(function (r) { return { valor: r.chave, rotulo: C().regiao[r.chave].nome + " (" + r.estresse + "/" + r.limite + ")" }; }));
      UI.modal({ titulo: "Aplicar " + p.dano + " em " + nomeDe(p.persona), conteudo: [reg, linha("Sem Durável absorvendo: isso é escolha de quem recebe, na ficha.")],
        botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: async function (f) {
          f();
          var r = await global.RAMAApi.oblivioOperar(ctx.campanhaId, opId(), { tipo: "receberAtaque", quem: p.persona, pendente: p.id, regiao: reg.entrada.value });
          if (!r.ok) { UI.avisoDeFalha(r, "aplicar o acerto"); return; }
          carregar(true);
          if (ctx.sincronizarAgora) ctx.sincronizarAgora();
        } }] });
    }

    function beneficio(a) {
      var k = selecao("Benefício (até 3 na cena)", [{ valor: "velocidade", rotulo: "+1D6 Velocidade" }, { valor: "protecao", rotulo: "+1D4 Proteção" }, { valor: "dano", rotulo: "+1D2 Dano" }]);
      UI.modal({ titulo: "Apropriação Forçada", conteudo: [k], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Rolar", classe: "r-botao--principal", aoClicar: function (f) {
        f(); operar(function (m) { return AM().beneficioDaApropriacao(M().instancia(m, a.id), k.entrada.value, rolador); });
      } }] });
    }

    function invocar(a) {
      var k = selecao("Criar", [{ valor: "muralha", rotulo: "Muralha de Carne (1 região)" }, { valor: "carcaca", rotulo: "Carcaça (2 regiões)" }, { valor: "enxame", rotulo: "Enxame (3 regiões)" }]);
      UI.modal({ titulo: a.nome + ": trocar regiões", conteudo: [k], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Criar", classe: "r-botao--principal", aoClicar: function (f) {
        f(); operar(function (m) {
          var r = AM().trocarRegioesPor(M().instancia(m, a.id), k.entrada.value, rolador);
          if (!r.ok) return r;
          m.encontro.ameacas.push(r.nova); m.fileiras.ameacas.push(r.nova.id);
          m.encontro.protecoes[r.nova.id] = K().novoEstadoDeProtecao(AM().protecaoCompleta(r.nova, { personasNaCena: m.fileiras.personas.length, ajustes: m.ajustes }).total);
          return r;
        });
      } }] });
    }

    function mutacao(a) {
      var bens = AD().ameaca.mutageno.habilidades[0].efeito.beneficios;
      var k = selecao("Benefício", bens.map(function (b) { return { valor: b.chave, rotulo: b.texto + " (" + b.custo + ")" }; }));
      var atr = selecao("Atributo (se for +1 atributo)", C().ATRIBUTOS.map(function (x) { return { valor: x.chave, rotulo: x.nome }; }));
      UI.modal({ titulo: "Gastar Mutação", conteudo: [k, atr], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Gastar", classe: "r-botao--principal", aoClicar: function (f) {
        f(); operar(function (m) { return AM().gastarMutacao(M().instancia(m, a.id), k.entrada.value, { atributo: atr.entrada.value }); });
      } }] });
    }

    function montarQuimera() {
      var linhas = [0, 1, 2].map(function () {
        var am = selecao("Ameaça componente", AD().AMEACAS.filter(function (x) { return x.chave !== "quimera"; }).map(function (x) { return { valor: x.chave, rotulo: x.nome }; }));
        var hab = selecao("Habilidade dela", []);
        function encher() { U.trocar(hab.entrada, AD().ameaca[am.entrada.value].habilidades.map(function (h) { return el("option", { value: h.chave, texto: h.nome }); })); }
        am.entrada.addEventListener("change", encher); encher();
        return { am: am, hab: hab };
      });
      UI.modal({ titulo: "Montar a Quimera (p. 137)", largo: true, conteudo: [linha("Três Ameaças e uma habilidade de cada, mais Decifra-me ou Te Devoro.")].concat(linhas.map(function (l) { return el("div.editar-grade", {}, [l.am, l.hab]); })),
        botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Montar", classe: "r-botao--principal", aoClicar: function (f) {
          f(); operar(function (m) {
            var r = AM().montarQuimera(linhas.map(function (l) { return { ameaca: l.am.entrada.value, habilidade: l.hab.entrada.value }; }), rolador);
            if (!r.ok) return r;
            m.encontro.ameacas.push(r.nova); m.fileiras.ameacas.push(r.nova.id);
            m.encontro.protecoes[r.nova.id] = K().novoEstadoDeProtecao(AM().protecaoCompleta(r.nova, { personasNaCena: m.fileiras.personas.length, ajustes: m.ajustes }).total);
            return { ok: true, eventos: [{ tipo: "ameacaEntrou", nome: r.nova.nome }] };
          });
        } }] });
    }

    /* ---------------- Buraco ---------------- */

    var NOMES_CARTA = { entrada: "Entrada", vazio: "Vazio", armadilha: "Armadilha", encontro: "Encontro", infortunio: "Infortúnio", saida: "Saída", segredo: "Segredo", tesouro: "Tesouro", objetivo: "Objetivo", escada: "Escada" };
    function nomeDaCarta(c) { return (NOMES_CARTA[c.tipo] || c.tipo) + (c.d ? " (" + c.d + ")" : ""); }

    function buraco(e) {
      var b = e.buraco;
      if (!b) {
        var semEf = el("label.r-marca", {}, [el("input", { type: "checkbox" }), el("span", { texto: "Sem Efeito do Buraco" })]);
        var semMi = el("label.r-marca", {}, [el("input", { type: "checkbox" }), el("span", { texto: "Sem Missão do Buraco" })]);
        return el("div.pilha.pilha--curta", {}, [linha("A construção rola a Entrada (1D12), o Efeito (1D6) e a Missão (1D6); explorar saca cartas (1D100, acima de 60 rola de novo) — p. 99–115."), semEf, semMi,
          mini("Construir um Buraco", function () {
            operar(function (m) {
              var r = BU().criarBuraco(rolador, { personas: m.fileiras.personas.length || personas().length, missoesConcluidas: m.missoes.length, semEfeito: semEf.querySelector("input").checked, semMissao: semMi.querySelector("input").checked });
              if (!r.ok) return r;
              m.buraco = r.buraco;
              return r;
            });
          }, { classe: "r-botao--principal" })]);
      }
      var atual = BU().carta(b, b.atual);
      var vizinhas = atual ? b.cartas.filter(function (c) { return c.id !== atual.id && (atual.ligacoes.indexOf(c.id) >= 0 || c.ligacoes.indexOf(atual.id) >= 0 || atual.passagem === c.id || c.passagem === atual.id); }) : [];
      return el("div.pilha.pilha--curta", {}, [
        b.efeito ? el("p", { texto: "Efeito: " + b.efeito.nome + " — " + b.efeito.resumo }) : null,
        b.missao ? el("p", { texto: "Missão: " + b.missao.nome + (b.missao.cumprida ? " (cumprida)" : "") + " — " + b.missao.resumo }) : null,
        Object.keys(b.regras).length ? linha("Regras em vigor: " + Object.keys(b.regras).map(function (k) { return textoDaRegra(k, b.regras[k]); }).join(" · ")) : null,
        b.encerrado ? el("p.r-etiqueta", { texto: "Exploração encerrada" + (b.encerrado.curaTotal ? " (Saída de Emergência: cura total)" : "") }) : null,
        atual ? cartaAtual(e, b, atual) : null,
        !b.encerrado && atual ? el("div.faixa", {}, [
          mini("Explorar uma conexão livre (" + BU().livres(atual) + ")", function () { operar(function (m) { return BU().explorar(m.buraco, m.buraco.atual, rolador); }); }, { desligado: !BU().livres(atual), classe: "r-botao--principal" }),
        ].concat(vizinhas.map(function (c) {
          return mini("Ir para " + nomeDaCarta(c), function () { operar(function (m) { return BU().entrar(m.buraco, c.id, rolador); }); });
        })).concat(atual.tipo === "saida" || (atual.tipo === "entrada" && !b.regras.entradaFechada) ? [mini("Sair do Buraco por aqui", function () { operar(function (m) { return BU().sair(m.buraco, m.buraco.atual); }); })] : [])
          .concat(atual.tipo === "escada" && atual.leva ? [mini("Descer a escada", function () { operar(function (m) { var dest = m.buraco.cartas.filter(function (c) { return c.andar === atual.leva && c.tipo === "entrada"; })[0]; if (!dest) return { ok: false, motivo: "Andar sem entrada." }; m.buraco.atual = dest.id; return { ok: true, eventos: [] }; }); })] : [])) : null,
        mapa(b, true),
        mini("Descartar o Buraco", function () {
          UI.confirmar({ titulo: "Descartar o Buraco?", texto: "O mapa e os eventos deste Buraco saem da mesa.", rotuloConfirmar: "Descartar", perigo: true }).then(function (s) { if (s) operar(function (m) { m.buraco = null; return { ok: true, eventos: [] }; }); });
        }, { classe: "r-botao--fantasma" }),
      ]);
    }

    /* As regras que o Efeito e a Missão põem em vigor, em palavras. */
    function textoDaRegra(k, v) {
      if (k === "recuperacao") return "recuperação ×" + v;
      if (k === "perdaDeCoragem") return "perda de Coragem ×" + v;
      if (k === "luz") return "a luz dura ×" + v;
      if (k === "foraDeAcao") return "Fora de Ação conta " + v + " vezes";
      if (k === "semDescanso") return "sem Descanso";
      if (k === "descansoTotal") return "o Descanso recupera tudo";
      if (k === "entradaFechada") return "a Entrada não serve de saída";
      if (k === "saidaFalsaAte") return "Saída Falsa com 1–" + v;
      if (k === "perseguicao" && v && v.dado) return "perseguição: " + String(v.dado).toUpperCase() + (v.de ? " (" + v.de + "+)" : "");
      if (k === "colapso") return "colapso: 1" + String((v && v.dado) || "d4").toUpperCase() + " de Estresse por cena passada, no fim de cada cena";
      return k;
    }

    function cartaAtual(e, b, c) {
      var eventos = c.eventos.concat(c.objetivo ? c.objetivo.eventos : []);
      return el("div.oblivio-carta.oblivio-carta--atual", { dataset: { tipo: c.tipo } }, [
        el("p.t-forte", { texto: "Aqui: " + nomeDaCarta(c) + (c.resultado ? " — " + c.resultado.nome : "") }),
        c.resultado ? linha(c.resultado.resumo) : null,
        c.objetivo ? linha("Objetivo: " + c.objetivo.nome) : null,
        eventos.length ? el("ul.oblivio-eventos", {}, eventos.map(function (ev) {
          return el("li.oblivio-evento", { dataset: { estado: ev.estado || "pendente" } }, [
            el("span", { texto: rotuloDoEvento(ev) + (ev.estado === "resolvido" ? " — resolvido" : "") }),
            ev.estado !== "resolvido" ? el("span.faixa", {}, [
              mini("Preparar", function () { expandir(e, c, ev); }),
              mini("Resolvido", function () {
                var vencido = ev.tipo === "iniciarEncontro" || ev.tipo === "encontroDeObjetivo";
                operar(function (m) { return BU().resolverEvento(m.buraco, c.id, ev.id, vencido ? { vencido: true } : {}); });
              }),
            ]) : null,
          ]);
        })) : null,
      ]);
    }

    function rotuloDoEvento(ev) {
      var t = { iniciarEncontro: "Encontro", encontroDeObjetivo: "Encontro do Objetivo", encontroPorGrau: "Encontro por Grau", teste: "Teste", testeOpcional: "Teste opcional", tensao: "Cena de Tensão", explosao: "Explosão", aposta: "Aposta",
        cura: "Cura", coragem: "Coragem", reparo: "Reparo", moedas: "Moedas", itemPorD6: "Itens", contrabando: "Contrabando", escolhaDeCada: "Escolha de cada um", modificacaoGratis: "Modificação grátis",
        perderItem: "Perder um item", regraDoBuraco: "Regra do Buraco", dejaVu: "Déjà-vu", bloquearConexao: "Desmoronamento", objetivoCumprido: "Objetivo cumprido", passagem: "Passagem", armadilhaArmada: "Armadilha armada", mazela: "Mazela", dano: "Dano" }[ev.tipo] || ev.tipo;
      if (ev.conhecimento && C().conhecimento[ev.conhecimento]) t += " de " + C().conhecimento[ev.conhecimento].nome;
      return t;
    }

    /* O evento vira o que a mesa precisa fazer: Ameaças prontas para
       entrar, testes para pedir, Tensão para abrir. */
    function expandir(e, c, ev) {
      var s = BU().expandirEvento(ev, rolador, { dificuldade: c.dificuldade || "facil" });
      var partes = [];
      if (s.ameacas.length) partes.push(el("p", { texto: "Ameaças: " + s.ameacas.map(function (a) { return (a.qtd || 1) + "× " + (AD().ameaca[a.ameaca] ? AD().ameaca[a.ameaca].nome : a.ameaca); }).join(", ") }));
      if (s.vinculo) partes.push(linha("Vínculo: 1D6 = " + s.vinculo.d6 + " → " + (s.vinculo.salasAdiante ? s.vinculo.salasAdiante + " sala(s) adiante" : "nesta sala") + "; " + s.vinculo.sucessos + " sucesso(s) em " + C().conhecimento[s.vinculo.conhecimento].nome + (s.vinculo.coletivo ? " (coletivos)" : "")));
      s.testes.forEach(function (t) { partes.push(linha("Teste" + (t.quem === "todos" ? " de todos" : "") + ": " + (C().conhecimento[t.conhecimento] ? C().conhecimento[t.conhecimento].nome : t.conhecimento) + (t.qtd ? " — " + t.qtd + "× " + t.bomba : ""))); });
      if (s.tensao) partes.push(linha("Cena de Tensão: " + (s.tensao.rodadas || "?") + " rodada(s)" + (s.tensao.sucessos ? ", " + s.tensao.sucessos + " sucessos" : "")));
      if (s.dano) partes.push(linha("Dano em todos: " + s.dano.todos));
      if (s.cura) partes.push(linha("Cura em todos: " + s.cura.todos));
      if (s.coragem) partes.push(linha("Coragem para todos: " + s.coragem.todos));
      if (s.moedas) partes.push(linha("Moedas para cada: " + s.moedas.cada));
      s.escolhas.forEach(function (x) { partes.push(linha(x.texto || x.tipo)); });
      s.notas.forEach(function (n) { partes.push(linha(n)); });
      if (!partes.length) partes.push(linha("Nada a rolar: aplique o que a carta diz e marque como resolvido."));
      var botoes = [{ rotulo: "Fechar", classe: "r-botao--fantasma" }];
      if (s.ameacas.length) botoes.push({ rotulo: "Pôr no encontro", classe: "r-botao--principal", aoClicar: function (f) {
        f(); operar(function (m) {
          var evs = [];
          for (var i = 0; i < s.ameacas.length; i++) for (var n = 0; n < (s.ameacas[i].qtd || 1); n++) {
            var r = M().adicionarAmeaca(m, s.ameacas[i].ameaca, rolador, { cena: m.cena ? m.cena.id : "" });
            if (r.ok) evs = evs.concat(r.eventos);
          }
          return { ok: true, eventos: evs };
        });
      } });
      if (s.tensao) botoes.push({ rotulo: "Abrir a Tensão", classe: "r-botao--principal", aoClicar: function (f) {
        f(); operar(function (m) { return M().iniciarCena(m, "tensao", participantesDaCena(m), { rodadas: s.tensao.rodadas, sucessos: s.tensao.sucessos || 0, motivo: rotuloDoEvento(ev) }); });
      } });
      UI.modal({ titulo: rotuloDoEvento(ev), conteudo: partes, botoes: botoes });
    }

    /* O mapa: as cartas por andar, a atual marcada. */
    function mapa(b, mestre) {
      var andares = b.andares || [];
      return el("div.oblivio-mapa", {}, andares.map(function (an) {
        var cartas = b.cartas.filter(function (c) { return c.andar === an.id; });
        return el("div.oblivio-mapa__andar", {}, [
          el("h4.t-rotulo", { texto: "Andar " + an.n }),
          el("ul.oblivio-mapa__cartas", {}, cartas.map(function (c) {
            var pend = (c.eventos || []).filter(function (x) { return x.estado !== "resolvido"; }).length;
            return el("li.oblivio-carta", { class: c.id === b.atual ? "oblivio-carta--atual" : "", dataset: { tipo: c.tipo }, "aria-current": c.id === b.atual ? "location" : null }, [
              el("span.oblivio-carta__tipo", { texto: nomeDaCarta(c) }),
              c.resultado ? el("span.t-mini", { texto: c.resultado.nome }) : null,
              el("span.t-mini", { texto: (c.ligacoes ? c.ligacoes.length : 0) + "/" + c.conexoes + " conexões" + (pend ? " · " + pend + " pendente(s)" : "") + (c.bloqueada ? " · bloqueada" : "") }),
            ]);
          })),
        ]);
      }));
    }

    /* ---------------- Ajustes e registro ---------------- */

    function ajustes(e) {
      function campo(rotulo, chave, opcoes, conv) {
        return UI.campo({ rotulo: rotulo, tipo: "selecao", valor: String(e.ajustes[chave]), opcoes: opcoes,
          aoMudar: function (v) { operar(function (m) { m.ajustes[chave] = conv ? conv(v) : v; m.ajustes = R().ajustesDe(m.ajustes); return { ok: true, eventos: [] }; }); } });
      }
      return el("div.pilha.pilha--curta", {}, [
        linha("Leituras onde o livro diverge ou não define (docs/OBLIVIO.md). Valem para a mesa; cada ficha avulsa tem as suas."),
        campo("Desgaste parcial da Proteção dura", "desgasteParcial", [{ valor: "cena", rotulo: "Até o fim da cena (padrão)" }, { valor: "turnoDoAlvo", rotulo: "Até o início do turno do alvo" }]),
        campo("Errante com 3 Personas ou menos (bônus \"reduzido\")", "errante", [{ valor: "metade", rotulo: "Metade do bônus (padrão)" }, { valor: "zero", rotulo: "Sem bônus" }, { valor: "testemunha", rotulo: "A Testemunha decide" }]),
        campo("\"Teste de Fuga\" (Armadura de Espinhos)", "testeDeFuga", [{ valor: "reflexos", rotulo: "Teste de Reflexos (padrão)" }, { valor: "testemunha", rotulo: "A Testemunha decide" }]),
      ]);
    }

    function registro(e) {
      var lista = (e.registro || []).slice(-40).reverse();
      if (!lista.length) return null;
      return UI.recolhivel({ titulo: "Registro da mesa (" + e.registro.length + ")", conteudo: [el("ul.oblivio-lista", {}, lista.map(function (r) {
        var t = r.tipo;
        if (r.tipo === "ataque") t = nomeDe(r.por) + " atacou " + nomeDe(r.alvo) + ": " + r.sucessos + " sucesso(s)" + (r.acertou ? ", acertou" : "");
        if (r.tipo === "ataqueDaAmeaca") t = nomeDe(r.ameaca) + " atacou " + nomeDe(r.persona) + ": " + r.sucessos + " sucesso(s)" + (r.acertou ? ", acertou (" + r.dano + ")" : "");
        if (r.tipo === "ataqueRecebido") t = nomeDe(r.persona) + " recebeu " + r.dano + " de " + nomeDe(r.ameaca);
        if (r.tipo === "reacao") t = r.fonte + ": " + nomeDe(r.ameaca) + " testa " + (r.teste === "reflexos" ? "Reflexos" : "(a Testemunha decide)") + "; falhando, sofre " + r.dano;
        /* registrar() guarda o tipo da cena no próprio `tipo`. */
        if (C().cena[r.tipo]) t = "Cena de " + C().cena[r.tipo].nome;
        if (r.tipo === "missao") t = "Missão aberta";
        if (r.tipo === "missaoConcluida") t = "Missão concluída";
        if (r.tipo === "partida") t = "Partida " + r.n;
        return el("li", { texto: (r.rodada ? "R" + r.rodada + " · " : "") + t });
      }))] });
    }

    carregar();
    return alvo;
  }

  global.RAMACampanhaOblivio = { aba: aba };
})(window);
