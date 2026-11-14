/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II · a mesa da campanha (v9.0)
   ---------------------------------------------------------------------
   A ferramenta de toda campanha de Ordem II. O Mestre conduz; quem joga
   vê a VISTA (sem nota privada, contexto, DT nem pistas não descobertas;
   NPCs só com a situação; ocultos de fora) e age pela própria ficha.

     Cena          missão (renova relações), cena (fim de cena), testes
                   pedidos e as respostas, testes aguardando escolhas
     Personagens   dano físico/emocional (não letal, armadura), cura,
                   pavor, condições e correções que ficam no histórico
     Combate       Beta: participantes e NPCs, ordem das fases, declarar,
                   rolar a fase, aplicar de uma vez, próxima rodada;
                   (v9.4: regras unificadas; o conflito simplificado do
                   Alpha não inicia ações novas)
     Investigação  pontos de interesse (descrição pública, pistas por
                   perícia/limiar, contexto e nota privada), solicitações
                   (Recapitular, Compartilhar, Interagir), pistas dadas
     Paranormal    (v9.2) a biblioteca do Mestre, ensinar e as pendências
                   dos rituais — módulo experimental, desligado por padrão
     Registro e Configuração (perfil de regras da campanha; v9.2: modo
                   de evolução e o módulo paranormal)
     Personagens também ganha (v9.2): subir/definir nível, aprovar a
                   habilidade proposta, desfazer, encerrar efeitos ativos

   Cada ação: ordem2_operar (opId; `rev` nas configurações).
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil, UI = global.RAMAUI, el = U.el;
  function K() { return global.RAMAOrdem2Catalogo; }
  function R() { return global.RAMAOrdem2; }
  function ME() { return global.RAMAOrdem2Mesa; }
  function T() { return global.RAMAOrdem2Tela; }
  function PT() { return global.RAMAOrdem2ProcTela; }
  function PN() { return global.RAMAOrdem2ParanormalTela; }
  function EVT() { return global.RAMAOrdem2EvolucaoTela; }

  function botao(t, fn, o) { return T().botao(t, fn, o); }
  function linha(t) { return el("p.t-mini", { texto: t }); }
  function marca(rotulo, marcado, aoMudar) { return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: !!marcado, onchange: function (ev) { aoMudar(ev.currentTarget.checked); } }), el("span", { texto: rotulo })]); }

  function aba(ctx) {
    var alvo = el("div.pilha.o2-mesa", {}, [UI.carregando("Abrindo a mesa de Ordem II")]);
    var mem = { dados: null, ocupado: false, aba: "cena", editandoPonto: null };

    async function carregar(segundoPlano) {
      var r = await global.RAMAApi.lerOrdem2(ctx.campanhaId, { segundoPlano: !!segundoPlano });
      if (!r.ok) { if (!segundoPlano) U.trocar(alvo, UI.erroDeTela(r, function () { carregar(); })); return; }
      mem.dados = r.dados;
      pintar();
    }
    if (ctx.aoAtualizar) {
      ctx.aoAtualizar("mesaOrdem2", function () { if (!mem.ocupado) carregar(true); });
      ctx.aoAtualizar("personagens", function () { if (!mem.ocupado) carregar(true); });
    }
    function estado() { return mem.dados ? (mem.dados.estado || mem.dados.vista) : null; }
    function mestre() { return !!(mem.dados && mem.dados.mestre); }
    function pcs() { return mem.dados ? mem.dados.personagens : []; }
    function nomePc(pid) { var p = pcs().filter(function (x) { return x.id === pid; })[0]; return p ? p.nome : "?"; }
    /* O pacote de dados das telas dos procedimentos (v9.1). */
    function m91() { return { estado: estado(), mestre: mestre(), pcs: pcs(), meus: pcs().filter(function (p) { return p.meu; }).map(function (p) { return p.id; }), operar: operar, cena: mem.dados ? mem.dados.cena : null, pacotes: (mem.dados && mem.dados.pacotes) || [] }; }

    async function operar(op) {
      if (mem.ocupado) return { ok: false };
      mem.ocupado = true;
      try {
        var r = await global.RAMAApi.ordem2Operar(ctx.campanhaId, T().novaOperacao(), op, ME().OPS_COM_REV.indexOf(op.tipo) >= 0 ? mem.dados.rev : undefined);
        if (!r.ok) {
          if (r.erro === "conflito" && r.dados) { mem.dados = r.dados; pintar(); UI.avisoAtencao("A mesa mudou em outra janela. A tela foi atualizada: confira e refaça."); return r; }
          if (r.motivo) UI.avisoAtencao(r.motivo); else UI.avisoDeFalha(r, "ação na mesa de Ordem II");
          return r;
        }
        mem.dados = r.dados;
        if (r.resultado) T().narrar(r.resultado.eventos);
        if (ctx.sincronizarAgora) ctx.sincronizarAgora();
        pintar();
        return Object.assign({ ok: true }, r.resultado || {});
      } finally { mem.ocupado = false; }
    }

    function pintar() {
      var y = global.scrollY;
      var e = estado();
      U.trocar(alvo, !e ? linha("A mesa ainda não abriu.") : mestre() ? vistaDoMestre(e) : vistaDoJogador(e));
      if (alvo.isConnected) global.scrollTo(0, y);
    }

    function topo(e) {
      return el("section.o2-mesa__topo", { "aria-label": "A mesa" }, [
        global.RAMACapaSistema ? global.RAMACapaSistema.elemento("ordem2", { tamanho: "m" }) : null,
        el("div.o2-mesa__textos", {}, [
          el("p.o2-mesa__titulo", { texto: "Missão " + e.missao.numero + (e.missao.nome ? " — " + e.missao.nome : "") + " · Cena " + e.cena.numero + (e.cena.nome ? " — " + e.cena.nome : "") }),
          el("p.t-mini", { texto: "Regras unificadas · " + K().AMBIENTACOES[e.ambientacao].nome + (e.combate.ativo ? " · COMBATE, rodada " + e.combate.rodada : "") }),
        ]),
      ]);
    }
    /* v9.4: a mesa gravada antes das regras unificadas — uma vez, com o que
       ainda está em curso (resolve pela montagem congelada). */
    function avisoDeMigracao(e) {
      var mg = e.migracao;
      if (!mg || mg.visto || !mg.de) return null;
      return el("div.o2-aviso.o2-aviso--migracao", { role: "status" }, [
        el("p", {}, [el("strong", { texto: "Esta campanha passou para as regras unificadas de Ordem II." }), el("span", { texto: " A ambientação ficou (" + K().AMBIENTACOES[e.ambientacao].nome + "); nada foi rolado, cobrado ou apagado. Ações novas usam a regra única." })]),
        mg.pendencias.length ? el("ul", {}, mg.pendencias.map(function (t) { return el("li.t-mini", { texto: t }); })) : linha("Nada em curso precisava de atenção."),
        botao("Entendi", function () { operar({ tipo: "configurar", migracaoVista: true }); }),
      ]);
    }
    function abas(lista) {
      return el("div.r-abas.o2-mesa__abas", { role: "tablist", "aria-label": "Mesa de Ordem II" }, lista.map(function (a) {
        var ativa = mem.aba === a[0];
        return el("button.r-aba", { type: "button", role: "tab", "aria-selected": String(ativa), dataset: { mesaAba: a[0] }, texto: a[1], onclick: function () { mem.aba = a[0]; pintar(); } });
      }));
    }

    /* =================================================================
       O MESTRE
       ================================================================= */
    function vistaDoMestre(e) {
      var lista = [["cena", "Cena"], ["personagens", "Personagens"], ["combate", "Combate"], ["investigacao", "Quadro"], ["desafios", "Desafios"], ["encontro", "Encontro"], ["paranormal", "Paranormal"], ["registro", "Registro"], ["config", "Configuração"]];
      if (!lista.some(function (a) { return a[0] === mem.aba; })) mem.aba = "cena";
      var conteudo = { cena: abaCena, personagens: abaPersonagens, combate: abaCombate, investigacao: abaInvestigacao, desafios: function () { return PT().mestre.desafios(m91()); }, encontro: function () { return PT().mestre.encontro(m91()); }, paranormal: function () { return PN() ? PN().mestre.biblioteca(m91()) : linha("Tela paranormal não carregada."); }, registro: abaRegistro, config: abaConfig }[mem.aba];
      return el("div.pilha", {}, [topo(e), avisoDeMigracao(e), abas(lista), conteudo(e)]);
    }

    function abaCena(e) {
      var st = { rotulo: "", pericia: "", atributo: "", dt: "7", alvos: [], oculto: false, cenaNome: "", cenaTipo: "livre", missaoNome: "" };
      var pericias = K().listaDePericias();
      return el("div.pilha", {}, [
        PT() ? PT().mestre.cena(m91()) : null,
        UI.painel("Missão e cena", el("div.pilha", {}, [
          el("div.o2-criar__campos", {}, [
            UI.campo({ rotulo: "Nome da próxima cena", limite: 120, aoMudar: function (v) { st.cenaNome = v; } }),
            UI.campo({ rotulo: "Tipo", tipo: "selecao", valor: "livre", opcoes: [{ valor: "livre", rotulo: "Livre" }, { valor: "investigacao", rotulo: "Investigação" }, { valor: "acao", rotulo: "Ação" }, { valor: "combate", rotulo: "Combate" }], aoMudar: function (v) { st.cenaTipo = v; } }),
            botao("Nova cena (fim da atual)", function () { UI.confirmar({ titulo: "Encerrar a cena", texto: "Fim de cena para todos: marcadores de análise e ímpeto do Beta zeram, efeitos de cena terminam, contadores de lesão/trauma da cena zeram, quem está com 0 PV e vivo recupera 1 PV (Beta), e Recapitular/Compartilhar destravam.", rotuloConfirmar: "Nova cena" }).then(function (s) { if (s) operar({ tipo: "novaCena", nome: st.cenaNome, cenaTipo: st.cenaTipo }); }); }, { classe: "r-botao--principal" }),
          ]),
          el("div.o2-criar__campos", {}, [
            UI.campo({ rotulo: "Nome da próxima missão", limite: 120, aoMudar: function (v) { st.missaoNome = v; } }),
            botao("Nova missão (renova as relações)", function () { operar({ tipo: "novaMissao", nome: st.missaoNome }); }),
          ]),
        ])),
        UI.painel("Pedir um teste", el("div.pilha", {}, [
          el("div.o2-criar__campos", {}, [
            UI.campo({ rotulo: "Rótulo", limite: 120, dica: "Escalar o paredão", aoMudar: function (v) { st.rotulo = v; } }),
            UI.campo({ rotulo: "Perícia", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "— a escolher —" }].concat(pericias.map(function (p) { return { valor: p.chave, rotulo: K().nomeDaPericia(null, p.chave, e.ambientacao) }; })), aoMudar: function (v) { st.pericia = v; } }),
            UI.campo({ rotulo: "Atributo (opcional: troca o da perícia)", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "O da perícia" }].concat(K().ORDEM_ATRIBUTOS.map(function (k) { return { valor: k, rotulo: K().ATRIBUTOS[k].nome }; })), aoMudar: function (v) { st.atributo = v; } }),
            UI.campo({ rotulo: "DT (vazio = oposto)", tipo: "numero", valor: "7", aoMudar: function (v) { st.dt = v; } }),
          ]),
          el("div.faixa", {}, pcs().map(function (p) { return marca(p.nome, false, function (v) { st.alvos = st.alvos.filter(function (x) { return x !== p.id; }); if (v) st.alvos.push(p.id); }); }).concat([marca("DT oculta dos jogadores", false, function (v) { st.oculto = v; })])),
          botao("Pedir", function () { operar({ tipo: "pedirTeste", rotulo: st.rotulo, pericia: st.pericia, atributo: st.atributo, dt: String(st.dt).trim() === "" ? null : U.inteiro(st.dt, 7), alvos: st.alvos, oculto: st.oculto }); }, { classe: "r-botao--principal" }),
          pedidos(e, true),
        ])),
        testesAguardando(e),
      ]);
    }
    function pedidos(e, comoMestre) {
      var abertos = e.pedidos.slice().reverse().slice(0, 8);
      if (!abertos.length) return linha("Nenhum teste pedido.");
      return el("ul.o2-pedidos", {}, abertos.map(function (p) {
        return el("li.o2-pedido", {}, [
          el("strong", { texto: p.rotulo + (p.dt !== null && p.dt !== undefined ? " (DT " + p.dt + ")" : "") + (p.aberto ? "" : " · encerrado") }),
          el("ul", {}, p.alvos.map(function (a) { var r = p.respostas[a]; return el("li.t-mini", { texto: nomePc(a) + ": " + (r ? r.total + (r.critico ? " CRÍTICO" : r.falhaCritica ? " FALHA CRÍTICA" : r.sucesso === true ? " sucesso" : r.sucesso === false ? " falha" : "") : "aguardando") }); })),
          comoMestre && p.aberto ? botao("Encerrar", function () { operar({ tipo: "fecharPedido", id: p.id }); }) : null,
        ]);
      }));
    }
    function testesAguardando(e) {
      var l = (e.testes || []).filter(function (t) { return t.estado === "aguardando"; });
      return UI.painel("Testes aguardando escolhas pós-rolagem", l.length ? el("ul", {}, l.map(function (t) { return el("li", {}, [el("span", { texto: t.nome + " · " + t.montagem.rotulo + ": " + ME().descreverResultado(t.resultado) }), mestre() ? botao("Fazer valer como está", function () { operar({ tipo: "resolverTeste", testeId: t.id, confirmar: true }); }) : null]); })) : linha("Nenhum."));
    }

    function abaPersonagens(e) {
      if (!pcs().length) return linha("Nenhum personagem de Ordem II vinculado a esta campanha.");
      return el("div.o2-mesa__pcs", {}, pcs().map(function (p) {
        var x = p.resumo || {};
        var conds = (x.condicoes || []).filter(function (c) { return c !== "pavor"; }).map(function (c) { return R().NOMES_CONDICAO[c] || c; });
        return el("article.o2-mesa__pc", {}, [
          el("header", {}, [el("h3", { texto: p.nome }), el("span.t-mini", { texto: [x.perfilNome, x.ocupacao, x.nivel ? "nível " + x.nivel : "", x.ambientacao && x.ambientacao !== e.ambientacao ? "ambientação " + K().AMBIENTACOES[x.ambientacao].curto : ""].filter(Boolean).join(" · ") })]),
          x.pv ? el("p.o2-mesa__pc-rec", { texto: "PV " + x.pv.atual + "/" + x.pv.max + (x.pv.naoLetal ? " (" + x.pv.naoLetal + " NL)" : "") + " · PD " + x.pd.atual + "/" + x.pd.max + " · Armadura " + x.armadura.atual + "/" + x.armadura.max + (x.pavor ? " · Pavor d" + x.pavor : "") + (x.lesoes ? " · " + x.lesoes + " lesão(ões)" : "") + (x.traumas ? " · " + x.traumas + " trauma(s)" : "") }) : null,
          conds.length ? el("p", {}, conds.map(function (c) { return el("span.r-etiqueta.r-etiqueta--aviso", { texto: c }); })) : null,
          el("div.faixa", {}, [
            botao("Dano…", function () { abrirDano(p.id, p.nome); }, { classe: "r-botao--principal" }),
            botao("Curar…", function () { abrirCura(p.id, p.nome); }),
            botao(x.pavor ? "Pavor +1 passo" : "Dar pavor (d6)", function () { operar({ tipo: "pavor", personagem: p.id, acao: "dar" }); }),
            x.pavor ? botao("Tirar pavor", function () { operar({ tipo: "pavor", personagem: p.id, acao: "remover" }); }) : null,
            botao("Condições…", function () { abrirCondicoes(p.id, p.nome, x); }),
            botao("Zerar contadores de lesão/trauma", function () { operar({ tipo: "corrigir", personagem: p.id, alvo: "contadores" }); }),
          ]),
          EVT() ? EVT().mestre.personagem(m91(), p) : null,
          PN() ? PN().mestre.personagem(m91(), p) : null,
        ]);
      }));
    }
    function abrirDano(pid, nome, participante) {
      var st = { valor: 1, tipo: "fisico", naoLetal: false, armadura: false, externo: true };
      UI.modal({ titulo: "Dano em " + nome, classe: "o2-janela", conteudo: [el("div.pilha", {}, [
        UI.campo({ rotulo: "Quanto", tipo: "numero", valor: "1", aoDigitar: true, aoMudar: function (v) { st.valor = U.inteiro(v, 0); } }),
        UI.campo({ rotulo: "Tipo", tipo: "selecao", valor: "fisico", opcoes: [{ valor: "fisico", rotulo: "Físico (PV)" }, { valor: "emocional", rotulo: "Emocional (PD)" }], aoMudar: function (v) { st.tipo = v; } }),
        marca("Não letal (anotado à parte)", false, function (v) { st.naoLetal = v; }),
        marca("Gastar 1 ponto de armadura (−10)", false, function (v) { st.armadura = v; }),
        marca("Efeito externo (desmarque para gasto voluntário: sem trauma)", true, function (v) { st.externo = v; }),
      ])], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (f) { f(); operar(Object.assign({ tipo: "dano", valor: st.valor, danoTipo: st.tipo, naoLetal: st.naoLetal, armadura: st.armadura, externo: st.externo }, participante ? { participante: participante } : { personagem: pid })); } }] });
    }
    function abrirCura(pid, nome) {
      var st = { valor: 1, recurso: "pv" };
      UI.modal({ titulo: "Curar " + nome, classe: "o2-janela", conteudo: [el("div.pilha", {}, [
        UI.campo({ rotulo: "Quanto", tipo: "numero", valor: "1", aoDigitar: true, aoMudar: function (v) { st.valor = U.inteiro(v, 0); } }),
        UI.campo({ rotulo: "Recurso", tipo: "selecao", valor: "pv", opcoes: [{ valor: "pv", rotulo: "PV" }, { valor: "pd", rotulo: "PD" }], aoMudar: function (v) { st.recurso = v; } }),
      ])], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Curar", classe: "r-botao--principal", aoClicar: function (f) { f(); operar({ tipo: "curar", personagem: pid, valor: st.valor, recurso: st.recurso }); } }] });
    }
    function abrirCondicoes(pid, nome, x) {
      var atuais = x.condicoes || [];
      UI.modal({ titulo: "Condições de " + nome, classe: "o2-janela", conteudo: [el("div.pilha", {}, ["caido", "inconsciente", "moribundo", "perdeAcao", "morto"].map(function (c) {
        return marca(R().NOMES_CONDICAO[c], atuais.indexOf(c) >= 0, function (v) { operar({ tipo: "condicao", personagem: pid, chave: c, valor: v }); });
      }).concat([linha("Correções graves (desfazer morte/colapso) ficam no histórico da ficha."), botao("Desfazer morte/colapso", function () { operar({ tipo: "corrigir", personagem: pid, alvo: "vida" }); })]))], botoes: [{ rotulo: "Fechar", classe: "r-botao--principal" }] });
    }

    /* ---------------- COMBATE ---------------- */
    function abaCombate(e) {
      var c = e.combate;
      if (!c.ativo) return iniciarCombate(e);
      var fase = c.ordemFases[c.fase];
      var daFase = c.declaracoes.filter(function (d) { return d.rodada === c.rodada; });
      return el("div.pilha", {}, [
        UI.painel("Rodada " + c.rodada + (c.rodada === 0 ? " (antecipada: só quem usou Prontidão/Antecipação)" : ""), el("div.pilha", {}, [
          el("ol.o2-fases", {}, c.ordemFases.map(function (f, i) { return el("li" + (i === c.fase ? ".o2-fases__atual" : i < c.fase ? ".o2-fases__feita" : ""), { "aria-current": i === c.fase ? "step" : null, texto: (i === c.fase ? "▶ " : i < c.fase ? "✓ " : "") + K().FASES[f].nome + (i === c.fase && c.etapa === "rolada" ? " (rolada)" : "") }); })),
          el("div.faixa", {}, [
            fase ? botao(c.etapa === "declarar" ? "Rolar a " + K().FASES[fase].nome : "Aplicar a " + K().FASES[fase].nome + " (simultâneo)", function () { operar({ tipo: "aplicarFase" }); }, { classe: "r-botao--principal" }) : null,
            botao("Próxima rodada", function () { operar({ tipo: "proximaRodada", rodada: c.rodada }); }, { classe: fase ? "" : "r-botao--principal" }),
            botao("Encerrar combate", function () { operar({ tipo: "encerrarCombate" }); }, { classe: "r-botao--fantasma" }),
          ]),
          linha("Ações na mesma fase acontecem ao mesmo tempo: quem cai nela ainda resolve a ação; quem cai antes de uma fase posterior não age nela."),
          e.proc && (e.proc.agarres || []).length ? el("p.o2-privado", { texto: "Sendo afogados: " + e.proc.agarres.map(function (a) { var v = ME().participante(e, a.vitima), q = ME().participante(e, a.por); return (v ? v.nome : "?") + (q ? " (por " + q.nome + ")" : ""); }).join(", ") + " — perdem o dano no fim da rodada; só podem escapar." }) : null,
          daFase.length ? el("ul.o2-declaracoes", {}, daFase.map(function (d) {
            var alvo = ME().participante(e, d.alvo);
            var res = d.resultado ? " — " + ME().descreverResultado(d.resultado) : "";
            return el("li", {}, [el("span", { texto: d.nome + ": " + K().ACOES_COMBATE[d.acao].nome + (alvo ? " → " + alvo.nome : "") + " · " + K().FASES[d.fase].nome + " · " + d.estado + res + (d.motivo ? " (" + d.motivo + ")" : "") }), d.estado === "declarada" ? botao("Cancelar", function () { operar({ tipo: "cancelarDeclaracao", id: d.id }); }) : null]);
          })) : linha("Nenhuma ação declarada nesta rodada."),
          declararNpc(e),
        ])),
        UI.painel("Participantes", el("ul.o2-participantes", {}, c.participantes.map(function (p) {
          var bl = p.tipo === "npc" ? p.bloco : null;
          var res = p.tipo === "pc" ? (pcs().filter(function (x) { return x.id === p.personagemId; })[0] || {}).resumo : null;
          return el("li.o2-participante", {}, [
            el("strong", { texto: p.nome + (p.oculto ? " (oculto)" : "") }),
            el("span.t-mini", { texto: bl ? " PV " + bl.recursos.pv.atual + "/" + bl.recursos.pv.max + (R().armaduraMax(bl) ? " · Armadura " + R().armaduraAtual(bl) : "") + (bl.estado.inconsciente ? " · fora de combate" : "") + (bl.estado.caido ? " · caído" : "") : res && res.pv ? " PV " + res.pv.atual + "/" + res.pv.max + " · PD " + res.pd.atual + "/" + res.pd.max : "" }),
            p.tipo === "npc" ? botao("Dano…", function () { abrirDano("", p.nome, p.id); }) : null,
            p.tipo === "npc" ? botao(p.oculto ? "Revelar" : "Ocultar", function () { operar({ tipo: "configurarParticipante", ator: p.id, oculto: !p.oculto }); }) : null,
            botao("Tirar", function () { operar({ tipo: "removerParticipante", id: p.id }); }, { classe: "r-botao--fantasma" }),
          ]);
        }).concat([el("li", {}, [formNpc(e)])]))),
        configurarFases(e),
      ]);
    }
    function iniciarCombate(e) {
      var st = { pcs: pcs().map(function (p) { return p.id; }), antecipar: true };
      return UI.painel("Iniciar combate (Beta pp. 18–21)", el("div.pilha", {}, [
        linha("Três fases por rodada: Geral → Distância → Corpo a corpo. Uma ação padrão por rodada (exceções de habilidade); ações livres e preparadas."),
        el("div.faixa", {}, pcs().map(function (p) { return marca(p.nome, true, function (v) { st.pcs = st.pcs.filter(function (x) { return x !== p.id; }); if (v) st.pcs.push(p.id); }); })),
        marca("Começar com a rodada antecipada (Prontidão Alpha / Antecipação Tática)", true, function (v) { st.antecipar = v; }),
        botao("Iniciar", function () { operar({ tipo: "iniciarCombate", personagens: st.pcs, antecipar: st.antecipar }); }, { classe: "r-botao--principal" }),
      ]));
    }
    function formNpc(e) {
      var st = { nome: "", pv: 10, fisico: 6, luta: 6, pontaria: 4, acrobacia: 4, percepcao: 4, armadura: 0, ataque: "Ataque", alcance: "corpo", dano: 1, oculto: false };
      function n(rot, k) { return UI.campo({ rotulo: rot, tipo: "numero", valor: String(st[k]), aoMudar: function (v) { st[k] = U.inteiro(v, st[k]); } }); }
      function d(rot, k) { return UI.campo({ rotulo: rot, tipo: "selecao", valor: String(st[k]), opcoes: [4, 6, 8, 10, 12].map(function (f) { return { valor: String(f), rotulo: "d" + f }; }), aoMudar: function (v) { st[k] = Number(v); } }); }
      return UI.recolhivel({ titulo: "+ NPC", conteudo: el("div.pilha", {}, [
        el("div.o2-criar__campos", {}, [UI.campo({ rotulo: "Nome", limite: 120, aoMudar: function (v) { st.nome = v; } }), n("PV", "pv"), n("Armadura (pontos)", "armadura")]),
        el("div.o2-criar__campos", {}, [d("Físico", "fisico"), d("Luta", "luta"), d("Pontaria", "pontaria"), d("Acrobacia", "acrobacia"), d("Percepção", "percepcao")]),
        el("div.o2-criar__campos", {}, [UI.campo({ rotulo: "Ataque", valor: st.ataque, limite: 60, aoMudar: function (v) { st.ataque = v; } }), UI.campo({ rotulo: "Alcance", tipo: "selecao", valor: "corpo", opcoes: [{ valor: "corpo", rotulo: "Corpo a corpo" }, { valor: "distancia", rotulo: "À distância" }], aoMudar: function (v) { st.alcance = v; } }), n("Dano (RA +)", "dano")]),
        marca("Oculto dos jogadores", false, function (v) { st.oculto = v; }),
        botao("Adicionar NPC", function () { operar({ tipo: "adicionarNpc", npc: { nome: st.nome, pv: st.pv, armadura: st.armadura, oculto: st.oculto, atributos: { fisico: st.fisico }, pericias: { luta: st.luta, pontaria: st.pontaria, acrobacia: st.acrobacia, percepcao: st.percepcao, intuicao: 4, vigor: 4 }, ataques: [{ nome: st.ataque, alcance: st.alcance, dano: st.dano }] } }); }, { classe: "r-botao--principal" }),
      ]) });
    }
    function declararNpc(e) {
      var npcs = e.combate.participantes.filter(function (p) { return p.tipo === "npc"; });
      if (!npcs.length) return null;
      var st = { ator: npcs[0].id, acao: "agredirCorpo", alvo: "", arma: "" };
      var alvos = e.combate.participantes;
      return UI.recolhivel({ titulo: "Declarar pelos NPCs", conteudo: el("div.o2-criar__campos", {}, [
        UI.campo({ rotulo: "NPC", tipo: "selecao", valor: st.ator, opcoes: npcs.map(function (p) { return { valor: p.id, rotulo: p.nome }; }), aoMudar: function (v) { st.ator = v; } }),
        UI.campo({ rotulo: "Ação", tipo: "selecao", valor: st.acao, opcoes: Object.keys(K().ACOES_COMBATE).map(function (k) { return { valor: k, rotulo: K().ACOES_COMBATE[k].nome }; }), aoMudar: function (v) { st.acao = v; } }),
        UI.campo({ rotulo: "Alvo", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "—" }].concat(alvos.map(function (p) { return { valor: p.id, rotulo: p.nome }; })), aoMudar: function (v) { st.alvo = v; } }),
        botao("Declarar", function () { operar({ tipo: "declarar", ator: st.ator, acao: st.acao, alvo: st.alvo }); }, { classe: "r-botao--principal" }),
      ]) });
    }
    function configurarFases(e) {
      var ordem = e.combate.ordemFases.slice();
      return UI.recolhivel({ titulo: "Ordem das fases (configurável por cena)", conteudo: el("div.pilha", {}, [
        linha("Padrão: Geral → Distância → Corpo a corpo. As missões do Beta usam quatro: Suporte → Distância → Corpo a corpo → Final. Trocar no meio da rodada não perde nem repete ação."),
        el("div.faixa", {}, [botao("Três fases (Beta pp. 18–21)", function () { operar({ tipo: "configurarFases", preset: "tres" }); }), botao("Quatro fases (Beta pp. 32, 69)", function () { operar({ tipo: "configurarFases", preset: "quatro" }); })]),
        el("div.o2-criar__campos", {}, [0, 1, 2, 3].map(function (i) { return UI.campo({ rotulo: (i + 1) + "ª fase", tipo: "selecao", valor: ordem[i] || "", opcoes: [{ valor: "", rotulo: "—" }].concat(Object.keys(K().FASES).map(function (f) { return { valor: f, rotulo: K().FASES[f].nome }; })), aoMudar: function (v) { ordem[i] = v; } }); })),
        botao("Salvar a ordem", function () { operar({ tipo: "configurarFases", ordem: ordem.filter(Boolean) }); }),
      ]) });
    }
    function abaInvestigacao(e) {
      var inv = e.investigacao;
      var pend = inv.solicitacoes.filter(function (s) { return s.estado === "pendente"; });
      return el("div.pilha", {}, [
        pend.length ? UI.painel("Solicitações", el("ul.o2-solicitacoes", {}, pend.map(function (s) {
          var st = { pericia: s.pericia || "", dt: s.dt || 10, resposta: "" };
          return el("li.o2-solicitacao", {}, [
            el("strong", { texto: { recapitular: "Recapitular", compartilhar: "Compartilhar", interagir: "Interagir", critico: "Crítico examinando" }[s.tipo] + " — " + s.nome + (s.nomeAliado ? " → " + s.nomeAliado : "") }),
            s.descricao ? el("p", { texto: s.descricao }) : null,
            s.tipo === "interagir" || s.tipo === "critico" ? UI.campo({ rotulo: s.tipo === "critico" ? "A informação adicional (ou dê uma pista nova em Desafios → Escolher a pista nova)" : "Resposta (pela descrição contextual)", tipo: "area", linhas: 2, limite: 1200, aoMudar: function (v) { st.resposta = v; } }) : el("div.o2-criar__campos", {}, [
              UI.campo({ rotulo: "Perícia do teste", tipo: "selecao", valor: st.pericia, opcoes: K().listaDePericias().map(function (p) { return { valor: p.chave, rotulo: K().nomeDaPericia(null, p.chave, e.ambientacao) }; }), aoMudar: function (v) { st.pericia = v; } }),
              UI.campo({ rotulo: "DT", tipo: "numero", valor: String(st.dt), aoMudar: function (v) { st.dt = U.inteiro(v, 10); } }),
            ]),
            el("div.faixa", {}, s.tipo === "interagir" || s.tipo === "critico" ? [botao("Responder", function () { operar({ tipo: "resolverSolicitacao", id: s.id, aprovar: true, resposta: st.resposta }); }, { classe: "r-botao--principal" })]
              : [botao("Aprovar (recapitulação coerente)", function () { operar({ tipo: "resolverSolicitacao", id: s.id, aprovar: true, pericia: st.pericia, dt: st.dt }); }, { classe: "r-botao--principal" }), botao("Não aprovar", function () { operar({ tipo: "resolverSolicitacao", id: s.id, aprovar: false }); })]),
          ]);
        }))) : null,
        UI.painel("Dar uma pista", darPista(e)),
        PT() ? PT().mestre.quadro(m91(), function (p) { mem.editandoPonto = JSON.parse(JSON.stringify(p)); pintar(); }) : null,
        mem.editandoPonto && mem.editandoPonto.id ? UI.painel("Editando: " + mem.editandoPonto.nome, editorDePonto(e, mem.editandoPonto)) : null,
        UI.painel("Pontos de interesse (próprios)", el("div.pilha", {}, inv.pontos.filter(function () { return !PT(); }).map(function (p) { return pontoDoMestre(e, p); }).concat([botao("+ Ponto de interesse", function () { mem.editandoPonto = { id: "", nome: "", descricao: "", revelado: true, pistas: [{ pericias: ["percepcao"], dt: 6, texto: "" }], contextual: "", notaPrivada: "" }; pintar(); })]).concat(mem.editandoPonto && !mem.editandoPonto.id ? [editorDePonto(e, mem.editandoPonto)] : []))),
        UI.painel("Travas da cena", linha("Recapitular: " + (inv.travas.recapitular ? "travado (já houve sucesso)" : "livre") + " · Compartilhar: " + (inv.travas.compartilhar ? "travado" : "livre") + ". Nova cena destrava.")),
      ]);
    }
    function pontoDoMestre(e, p) {
      if (mem.editandoPonto && mem.editandoPonto.id === p.id) return editorDePonto(e, mem.editandoPonto);
      var desc = e.investigacao.descobertas;
      return el("article.o2-ponto", {}, [
        el("h3.o2-ponto__nome", { texto: p.nome + (p.revelado ? "" : " (escondido dos jogadores)") }),
        el("p", { texto: p.descricao }),
        el("table.o2-pistas", {}, [el("thead", {}, [el("tr", {}, [el("th", { texto: "Perícia" }), el("th", { texto: "DT" }), el("th", { texto: "Informação" }), el("th", { texto: "Quem achou" })])]), el("tbody", {}, p.pistas.map(function (q) {
          var quem = Object.keys(desc).filter(function (pid) { return desc[pid].some(function (d) { return d.pista === q.id; }); }).map(nomePc);
          return el("tr", {}, [el("td", { texto: q.pericias.map(function (k) { var c = k.split(":"); return K().nomeDaPericia(null, c[0], e.ambientacao) + (c[1] ? " (" + c[1] + ")" : ""); }).join(" ou ") }), el("td", { texto: String(q.dt) }), el("td", { texto: q.texto }), el("td", { texto: quem.join(", ") || "—" })]);
        }))]),
        p.contextual ? el("p.o2-privado", { texto: "Contexto (só o Mestre): " + p.contextual }) : null,
        p.notaPrivada ? el("p.o2-privado", { texto: "Nota privada: " + p.notaPrivada }) : null,
        el("div.faixa", {}, [
          botao("Editar", function () { mem.editandoPonto = JSON.parse(JSON.stringify(p)); pintar(); }),
          botao(p.revelado ? "Esconder" : "Revelar", function () { operar({ tipo: "revelarPonto", id: p.id, revelado: !p.revelado }); }),
          botao("Remover", function () { UI.confirmar({ titulo: "Remover " + p.nome, texto: "As descobertas já dadas continuam com os personagens.", rotuloConfirmar: "Remover", perigo: true }).then(function (s) { if (s) operar({ tipo: "removerPonto", id: p.id }); }); }, { classe: "r-botao--perigo" }),
        ]),
      ]);
    }
    function editorDePonto(e, p) {
      var pericias = K().listaDePericias().map(function (x) { return { valor: x.chave, rotulo: K().nomeDaPericia(null, x.chave, e.ambientacao) }; }).concat(K().ESPECIALIZACOES[e.perfil].map(function (esp) { return { valor: "aptidao:" + esp.toLowerCase(), rotulo: "Aptidão (" + esp + ")" }; }));
      var area = el("div.pilha.o2-editor-ponto");
      function desenhar() {
        U.trocar(area, [
          UI.campo({ rotulo: "Nome", valor: p.nome, limite: 120, aoMudar: function (v) { p.nome = v; } }),
          UI.campo({ rotulo: "Descrição básica (os jogadores ouvem)", tipo: "area", linhas: 2, valor: p.descricao, limite: 2000, aoMudar: function (v) { p.descricao = v; } }),
          el("h4.t-secao", { texto: "Quadro de informações" }),
          el("div.pilha", {}, p.pistas.map(function (q, i) {
            return el("div.o2-criar__campos.o2-editor-ponto__pista", {}, [
              UI.campo({ rotulo: "Perícia", tipo: "selecao", valor: q.pericias[0] || "", opcoes: pericias, aoMudar: function (v) { q.pericias[0] = v; } }),
              UI.campo({ rotulo: "ou outra (opcional)", tipo: "selecao", valor: q.pericias[1] || "", opcoes: [{ valor: "", rotulo: "—" }].concat(pericias), aoMudar: function (v) { if (v) q.pericias[1] = v; else q.pericias = q.pericias.slice(0, 1); } }),
              UI.campo({ rotulo: "DT", tipo: "numero", valor: String(q.dt), aoMudar: function (v) { q.dt = U.inteiro(v, 6); } }),
              UI.campo({ rotulo: "Informação", tipo: "area", linhas: 2, valor: q.texto, limite: 1200, aoMudar: function (v) { q.texto = v; } }),
              botao("Tirar", function () { p.pistas.splice(i, 1); desenhar(); }, { classe: "r-botao--fantasma" }),
            ]);
          })),
          botao("+ Linha", function () { p.pistas.push({ pericias: ["percepcao"], dt: 6, texto: "" }); desenhar(); }),
          UI.campo({ rotulo: "Descrição contextual (só o Mestre)", tipo: "area", linhas: 3, valor: p.contextual, limite: 4000, aoMudar: function (v) { p.contextual = v; } }),
          UI.campo({ rotulo: "Nota privada / solução (só o Mestre)", tipo: "area", linhas: 2, valor: p.notaPrivada, limite: 2000, aoMudar: function (v) { p.notaPrivada = v; } }),
          marca("Revelado aos jogadores", p.revelado !== false, function (v) { p.revelado = v; }),
          el("div.faixa", {}, [
            botao("Salvar ponto", function () { operar({ tipo: "ponto", ponto: Object.assign({}, p, { id: p.id || undefined }) }).then(function (r) { if (r && r.ok) { mem.editandoPonto = null; pintar(); } }); }, { classe: "r-botao--principal" }),
            botao("Cancelar", function () { mem.editandoPonto = null; pintar(); }, { classe: "r-botao--fantasma" }),
          ]),
        ]);
      }
      desenhar();
      return area;
    }
    function darPista(e) {
      var st = { personagem: (pcs()[0] || {}).id || "", texto: "", como: "Mestre" };
      return el("div.o2-criar__campos", {}, [
        UI.campo({ rotulo: "Para quem", tipo: "selecao", valor: st.personagem, opcoes: pcs().map(function (p) { return { valor: p.id, rotulo: p.nome }; }), aoMudar: function (v) { st.personagem = v; } }),
        UI.campo({ rotulo: "Pista (Recapitular, Compartilhar, crítico, Interagir…)", tipo: "area", linhas: 2, limite: 1200, aoMudar: function (v) { st.texto = v; } }),
        UI.campo({ rotulo: "Como", valor: "Mestre", limite: 80, aoMudar: function (v) { st.como = v; } }),
        botao("Revelar a pista", function () { operar({ tipo: "darPista", personagem: st.personagem, texto: st.texto, como: st.como }); }, { classe: "r-botao--principal" }),
      ]);
    }

    function abaRegistro(e) {
      return el("div.pilha", {}, [
        UI.painel("Registro da mesa", el("ol.o2-historico", {}, e.registro.slice(-80).reverse().map(function (r) { return el("li", {}, [el("span.t-mini", { texto: String(r.quando).slice(11, 16) + " · " }), el("span", { texto: r.texto })]); }))),
        mestre() ? UI.painel("Registro privado (só o Mestre)", el("ol.o2-historico", {}, e.privado.slice(-40).reverse().map(function (r) { return el("li", { texto: r.texto }); }))) : null,
        UI.painel("Rolagens recentes", el("div.pilha", {}, (e.rolagens || []).slice(-10).reverse().map(function (r) { return el("p.t-mini", { texto: r.nome + " · " + r.rotulo + ": " + (r.dados || []).map(function (d) { return (d.anulado ? "~" : "") + d.valor; }).join(", ") + " = " + r.total + (r.critico ? " CRÍTICO" : r.falhaCritica ? " FALHA CRÍTICA" : r.sucesso === true ? " sucesso" : r.sucesso === false ? " falha" : "") }); }))),
      ]);
    }
    function abaConfig(e) {
      var st = { ambientacao: e.ambientacao };
      return el("div.pilha", {}, [UI.painel("Configuração da mesa", el("div.pilha", {}, [
        linha(K().REGRAS.nome + ": uma regra para todas as fichas e cenas (" + K().REGRAS.texto + ")"),
        el("div.o2-criar__campos", {}, [
          UI.campo({ rotulo: "Ambientação", tipo: "selecao", valor: st.ambientacao, ajuda: "Muda a ambientação e as sugestões; as regras são as mesmas. Trocar não altera fichas, combate, pistas nem resultados.", opcoes: K().ORDEM_AMBIENTACOES.map(function (k) { return { valor: k, rotulo: K().AMBIENTACOES[k].nome }; }), aoMudar: function (v) { st.ambientacao = v; } }),
        ]),
        botao("Salvar", function () { operar({ tipo: "configurar", ambientacao: st.ambientacao }); }, { classe: "r-botao--principal" }),
        UI.recolhivel({ titulo: "Divergências entre as fontes e decisões", conteudo: el("ul.pilha.pilha--curta", {}, K().DIVERGENCIAS.map(function (d) { return el("li.t-mini", {}, [el("strong", { texto: d.fontes + ": " }), el("span", { texto: d.texto + " → " + d.escolha })]); }).concat(K().DECISOES.map(function (d) { return el("li.t-mini", { texto: "Decisão: " + d.texto }); }))) }),
      ])), EVT() ? EVT().mestre.config(m91()) : null, PN() ? PN().mestre.config(m91()) : null]);
    }

    /* =================================================================
       QUEM JOGA
       ================================================================= */
    function vistaDoJogador(e) {
      var lista = [["cena", "Cena"], ["combate", "Combate"], ["investigacao", "Investigação"], ["registro", "Registro"]];
      if (!lista.some(function (a) { return a[0] === mem.aba; })) mem.aba = "cena";
      var meus = pcs().filter(function (p) { return p.meu; });
      var conteudo = {
        cena: function () {
          return el("div.pilha", {}, [
            UI.painel("Seus personagens", meus.length ? el("ul", {}, meus.map(function (p) { return el("li", {}, [el("a", { href: U.url("ficha/?id=" + encodeURIComponent(p.id)), texto: p.nome }), el("span.t-mini", { texto: p.resumo && p.resumo.pv ? " · PV " + p.resumo.pv.atual + "/" + p.resumo.pv.max + " · PD " + p.resumo.pd.atual + "/" + p.resumo.pd.max : "" })]); })) : linha("Vincule um personagem de Ordem II a esta campanha.")),
            UI.painel("Testes pedidos", el("div.pilha", {}, [linha("Responda pela ficha do personagem (aparece no topo dela)."), pedidos(e, false)])),
          ]);
        },
        combate: function () {
          var c = e.combate;
          if (!c.ativo) return linha("Sem combate agora.");
          return UI.painel("Rodada " + c.rodada, el("div.pilha", {}, [
            el("ol.o2-fases", {}, c.ordemFases.map(function (f, i) { return el("li" + (i === c.fase ? ".o2-fases__atual" : i < c.fase ? ".o2-fases__feita" : ""), { "aria-current": i === c.fase ? "step" : null, texto: (i === c.fase ? "▶ " : i < c.fase ? "✓ " : "") + K().FASES[f].nome }); })),
            el("ul.o2-participantes", {}, c.participantes.map(function (p) { return el("li", { texto: p.nome + (p.situacao ? " · " + p.situacao : "") }); })),
            linha("Declare as ações pela aba Combate da sua ficha."),
          ]));
        },
        investigacao: function () {
          return el("div.pilha", {}, [
            UI.painel("Pontos de interesse", e.investigacao.pontos.length ? el("div.pilha", {}, e.investigacao.pontos.map(function (p) { return el("article.o2-ponto", {}, [el("h3.o2-ponto__nome", { texto: (p.numero ? p.numero + ". " : "") + p.nome }), el("p", { texto: p.descricao })]); }).concat([linha("Investigue pela aba Investigação da sua ficha.")])) : linha("Nenhum ponto de interesse nesta cena.")),
            PT() && meus.length ? PT().jogador(m91()) : null,
          ]);
        },
        registro: function () { return abaRegistro(e); },
      }[mem.aba];
      return el("div.pilha", {}, [topo(e), abas(lista), conteudo()]);
    }

    carregar();
    return alvo;
  }

  global.RAMACampanhaOrdem2 = { aba: aba };
})(window);
