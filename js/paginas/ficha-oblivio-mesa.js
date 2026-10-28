/* =====================================================================
   R.A.M.A. — Oblívio · a ficha numa campanha (v3.0)
   ---------------------------------------------------------------------
   A ficha de uma Persona vinculada a uma campanha lê a mesa da
   Testemunha (ler_oblivio) e passa a jogar no tempo DELA: cena, rodada,
   Partida e Missão vêm da mesa, não do relógio avulso da ficha.

   O que a ficha recebe é a VISTA DOS JOGADORES — sem a ficha das
   Ameaças, sem o que a Testemunha guarda para si — mais o nome e o id
   das Personas da campanha (o que o painel da mesa já mostra a todos)
   e o bônus de grupo desta Persona (Escudo Humano), calculado no
   servidor com as fichas que estão à frente dela.

   Tudo que toca OUTRA ficha ou a mesa vai por oblivio_operar: uma
   habilidade num aliado, Resgatar, Sacrificar, o ataque a uma Ameaça.
   O servidor confere quem age, aplica nas fichas envolvidas e guarda o
   id da operação. Nenhuma tela recebe acesso de edição à ficha de
   outra pessoa por causa de uma habilidade.

     RAMAOblivioMesaDaFicha.contexto(ctx)       contexto de jogo ou null
     RAMAOblivioMesaDaFicha.bonusDeGrupo(ctx)   [{ fonte, valor }]
     RAMAOblivioMesaDaFicha.naCampanha(ctx)
     RAMAOblivioMesaDaFicha.alvos(ctx)          Ameaças ativas do encontro
     RAMAOblivioMesaDaFicha.atacarAmeaca(ctx, ataque) → Promise
     RAMAOblivioMesaDaFicha.usarHabilidade(ctx, chave)
     RAMAOblivioMesaDaFicha.agir(ctx, chave)    Resgatar, Sacrificar, Analisar
     RAMAOblivioMesaDaFicha.escapar(ctx)
     RAMAOblivioMesaDaFicha.painel(ctx)         a faixa "Na mesa" da ficha
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function C() { return global.RAMAOblivioCatalogo; }
  function R() { return global.RAMAOblivio; }
  function M() { return global.RAMAOblivioMesa; }
  function UI() { return global.RAMAUI; }
  function FX() { return global.RAMAOblivioFicha; }
  function JOGO() { return global.RAMAOblivioJogo; }

  var lido = { campanhaId: "", personagemId: "", dados: null, rev: 0, erro: "", tentado: false, carregando: null, quando: 0 };
  var fuga = { cena: "", sucessos: 0 };

  function campanhaDe(ctx) { return ctx && ctx.ficha && ctx.ficha.campanhaId ? String(ctx.ficha.campanhaId) : ""; }

  /* A mesa, lida uma vez por campanha (e de novo quando pedido). */
  function carregar(ctx, forcar) {
    var cid = campanhaDe(ctx);
    if (!cid || !global.RAMAApi || !global.RAMAApi.lerOblivio) return Promise.resolve(null);
    if (lido.carregando && lido.campanhaId === cid) return lido.carregando;
    if (!forcar && lido.tentado && lido.campanhaId === cid && lido.personagemId === ctx.personagemId) return Promise.resolve(lido.dados);
    lido.campanhaId = cid; lido.personagemId = ctx.personagemId; lido.tentado = true;
    lido.carregando = global.RAMAApi.lerOblivio(cid, ctx.personagemId, { segundoPlano: true }).then(function (r) {
      lido.carregando = null;
      if (!r || !r.ok) { lido.dados = null; lido.erro = (r && r.erro) || "falha"; return null; }
      lido.dados = r.dados; lido.rev = U.inteiro(r.rev, 0); lido.erro = ""; lido.quando = Date.now();
      ctx.atualizar(["bloco", "conteudo"]);
      return lido.dados;
    }, function () { lido.carregando = null; lido.erro = "falha"; return null; });
    return lido.carregando;
  }

  function dados(ctx) {
    var cid = campanhaDe(ctx);
    if (!cid) return null;
    if (lido.campanhaId !== cid || lido.personagemId !== ctx.personagemId) { carregar(ctx); return null; }
    if (!lido.tentado) carregar(ctx);
    return lido.dados;
  }

  /* O estado da mesa como esta conta o vê: o inteiro para a Testemunha,
     a vista dos jogadores para os outros. */
  function estado(ctx) {
    var d = dados(ctx);
    if (!d) return null;
    return d.mestre ? d.estado : d.vista;
  }

  function naCampanha(ctx) { return !!estado(ctx); }

  function contexto(ctx) {
    var e = estado(ctx);
    if (!e) return null;
    var regras = e.buraco && e.buraco.regras ? e.buraco.regras : {};
    return {
      cena: e.cena ? e.cena.id : "", rodada: e.cena ? e.cena.rodada : 0, tipoDeCena: e.cena ? e.cena.tipo : "",
      partida: e.partida ? e.partida.id : "", missao: e.missao ? e.missao.id : "",
      buracoMortal: regras.foraDeAcao === 2, perdaDeCoragem: regras.perdaDeCoragem || 1,
      mesa: true,
    };
  }

  function bonusDeGrupo(ctx) {
    var d = dados(ctx);
    return d && d.grupo && Array.isArray(d.grupo.bonus) ? d.grupo.bonus : [];
  }

  function casasDe(e) { return function (id) { var a = M().instancia(e, id); return a ? a.casas : 1; }; }

  function alvos(ctx) {
    var e = estado(ctx);
    if (!e) return null;
    return e.encontro.ameacas.filter(function (a) { return a.estado === "ativa"; }).map(function (a) {
      var casa = M().casaDoAlvo(e, a.id, casasDe(e));
      var alc = M().alcanceDe(casa);
      var an = e.encontro.analisados && e.encontro.analisados[a.id];
      return { id: a.id, nome: a.nome, grau: a.grau, casa: casa, alcance: alc ? alc.nome : "fora das fileiras", analise: an ? { bonus: an.bonus } : null };
    });
  }

  function personas(ctx, incluirSi) {
    var d = dados(ctx);
    var lista = d && Array.isArray(d.personas) ? d.personas : [];
    return lista.filter(function (p) { return incluirSi || p.id !== ctx.personagemId; });
  }

  /* ---------------------------------------------------------------
     OPERAR PELO SERVIDOR
     --------------------------------------------------------------- */

  /* Sobe o que a ficha tem pendente, manda a operação e traz de volta a
     ficha e a mesa. Repetir o mesmo pedido (resposta perdida) não aplica
     duas vezes: o id da operação vai igual. */
  function operar(ctx, operacao, rotulo) {
    var cid = campanhaDe(ctx);
    var painel = global.RAMAFichaPainel;
    var opId = global.RAMAApi.novaOperacao();
    var antes = painel && painel.salvarAgora ? Promise.resolve(painel.salvarAgora()).catch(function () { return null; }) : Promise.resolve();
    return antes.then(function () {
      return global.RAMAApi.oblivioOperar(cid, opId, Object.assign({ quem: ctx.personagemId }, operacao));
    }).then(function (r) {
      if (!r || !r.ok) {
        UI().avisoAtencao((rotulo || "A mesa") + ": " + (r && r.motivo ? r.motivo : (global.RAMAApi.frase(r || {}) || {}).texto || "não foi possível."));
        return null;
      }
      var res = r.dados || {};
      var minhas = (res.eventos || []).filter(function (e) { return !e.persona || e.persona === ctx.personagemId; });
      if (FX()) FX().narrar(minhas);
      var deOutras = (res.eventos || []).length - minhas.length;
      if (deOutras > 0) UI().aviso((rotulo || "Feito") + ": aplicado também em outra(s) Persona(s) da mesa.", { tipo: "ok" });
      carregar(ctx, true);
      /* A ficha volta do servidor; se esta Persona atingiu o limite,
         a pergunta da intervenção vem depois, com a ficha nova. */
      var recarga = painel && painel.recarregarSeLivre ? Promise.resolve(painel.recarregarSeLivre()) : Promise.resolve();
      return recarga.then(function () {
        if (FX() && FX().tratarLimite) FX().tratarLimite(ctx, minhas);
        return res;
      });
    });
  }

  /* Acertos de Ameaça esperando esta Persona escolher onde recebe. */
  function ataquesPendentes(ctx) {
    var e = estado(ctx);
    if (!e || !e.encontro || !Array.isArray(e.encontro.ataquesPendentes)) return [];
    return e.encontro.ataquesPendentes.filter(function (p) { return p.persona === ctx.personagemId; });
  }

  function receberAtaque(ctx, pend) {
    var o = ctx.ficha.oblivio;
    var regiao = UI().campo({ rotulo: "Região que recebe", tipo: "selecao", opcoes: R().regioesPresentes(o).map(function (r) { return { valor: r.chave, rotulo: C().regiao[r.chave].nome + " (" + r.estresse + "/" + r.limite + ")" + (R().esgotada(r) ? " — esgotada: transborda para o Torso" : "") }; }) });
    var duraveis = o.inventario.itens.filter(function (i) { var c = C().equipamento[i.chave]; return i.estado === "carregado" && c && c.tipo === "duravel"; });
    var item = UI().campo({ rotulo: "Um Durável empunhado absorve (tudo ou nada)", tipo: "selecao", opcoes: [{ valor: "", rotulo: "Nenhum" }].concat(duraveis.map(function (i) { return { valor: i.id, rotulo: i.nome + " (" + i.estresse + "/" + R().limiteDoItem(i) + ")" }; })) });
    UI().modal({ titulo: "Receber o acerto de " + (pend.nome || "uma Ameaça"), conteudo: [el("p", { texto: pend.dano + " de Estresse (registrado pela Testemunha)." }), regiao, item,
      el("p.t-mini", { texto: "Carne Fraca dobra; Estresse além do limite transborda para o Torso; metade do limite de uma vez abre Ferida (p. 41–43, 92)." })],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Receber", classe: "r-botao--principal", aoClicar: function (fechar) {
        fechar();
        return operar(ctx, { tipo: "receberAtaque", pendente: pend.id, regiao: regiao.entrada.value, item: item.entrada.value }, "Acerto recebido");
      } }] });
  }

  function atacarAmeaca(ctx, a) {
    var e = estado(ctx);
    var inst = e ? M().instancia(e, a.alvo) : null;
    return operar(ctx, {
      tipo: "ataqueAmeaca", alvo: a.alvo, sucessos: a.sucessos, semRegioes: !!a.semRegioes, dano: a.dano,
      corpoACorpo: !!a.corpoACorpo, mirar: a.mirar || null, classe: a.classe || "", corrompido: !!a.corrompido,
    }, "Ataque" + (inst ? " a " + inst.nome : "")).then(function (res) {
      if (!res) return null;
      return { acerto: res.acerto || {}, eventos: res.eventos || [] };
    });
  }

  /* ---------------------------------------------------------------
     HABILIDADES COM ALVO
     --------------------------------------------------------------- */

  /* Quem pode ser alvo de cada habilidade, e o que mais ela pergunta. As
     regras de adjacência, limites e custos são conferidas no servidor. */
  var COM_ALVO = {
    ajudarOsNecessitados: { max: 2, si: true, texto: "Até duas Personas adjacentes (você pode ser uma delas).", inicioDaRodada: true },
    balsamo: { max: 1, si: true, texto: "Você ou uma Persona adjacente.", extra: "balsamo" },
    ataqueEmDupla: { max: 1, texto: "A Persona adjacente que ataca junto." },
    animarOsAnimos: { max: 1, texto: "A Persona adjacente que acabou de atingir o limite." },
    copiaBarata: { max: 1, texto: "A Persona do grupo dona da Habilidade Única.", extra: "copia" },
    instrucaoDecisiva: { max: 1, texto: "A Persona que vai agir.", extra: "instrucao" },
    repertorioDeConhecimento: { max: 1, si: true, texto: "Quem recebe o bônus no próximo teste." },
    feedbackDefensivo: { max: 1, si: true, texto: "Você ou outra Persona." },
    todosPorUm: { todos: true, texto: "Todas as Personas do grupo; escolham quem faz o ataque.", extra: "eleita" },
  };

  function usarHabilidade(ctx, chave) {
    var regra = COM_ALVO[chave];
    if (!regra) { usarLocal(ctx, chave); return; }
    var lista = personas(ctx, regra.si || regra.todos);
    if (!lista.length) { UI().avisoAtencao("Nenhuma outra Persona de Oblívio nesta campanha."); return; }
    var marcas = lista.map(function (p) {
      return el("label.r-marca", {}, [el("input", { type: regra.max === 1 ? "radio" : "checkbox", name: "alvo-habilidade", value: p.id, checked: regra.todos }), el("span", { texto: p.nome + (p.id === ctx.personagemId ? " (você)" : "") })]);
    });
    var extras = [];
    var campos = {};
    if (regra.extra === "balsamo") {
      campos.mazela = UI().campo({ rotulo: "Mazela a remover", tipo: "selecao", opcoes: [{ valor: "", rotulo: "—" }].concat(C().MAZELAS.filter(function (m) { return (m.remocao || []).indexOf("balsamo") >= 0; }).map(function (m) { return { valor: m.chave, rotulo: m.nome }; })) });
      campos.regiao = UI().campo({ rotulo: "Ou recuperar uma região perdida (uma vez por Partida)", tipo: "selecao", opcoes: [{ valor: "", rotulo: "—" }].concat(["bracoE", "bracoD", "pernaE", "pernaD"].map(function (k) { return { valor: k, rotulo: C().regiao[k].nome }; })) });
      campos.limite = UI().campo({ rotulo: "Limite de Estresse da região recuperada", tipo: "numero", valor: 1 });
      extras = [campos.mazela, campos.regiao, campos.limite];
    }
    if (regra.extra === "copia") {
      campos.habilidade = UI().campo({ rotulo: "Habilidade Única a copiar", tipo: "selecao", opcoes: C().HABILIDADES.filter(function (h) { return h.tipo === "unica"; }).map(function (h) { return { valor: h.chave, rotulo: h.nome }; }) });
      extras = [campos.habilidade];
    }
    if (regra.extra === "instrucao") {
      campos.acao = UI().campo({ rotulo: "Ação concedida", tipo: "selecao", opcoes: [{ valor: "regular", rotulo: "Regular" }, { valor: "extra", rotulo: "Extra" }, { valor: "movimento", rotulo: "Movimento" }] });
      extras = [campos.acao];
    }
    if (regra.extra === "eleita") {
      campos.eleita = UI().campo({ rotulo: "Quem faz o ataque", tipo: "selecao", opcoes: lista.map(function (p) { return { valor: p.id, rotulo: p.nome }; }) });
      extras = [campos.eleita];
    }
    var inicio = regra.inicioDaRodada ? el("label.r-marca", {}, [el("input", { type: "checkbox" }), el("span", { texto: "É o início da rodada (ou uma cena calma)" })]) : null;
    UI().modal({
      titulo: C().habilidade[chave].nome,
      conteudo: [el("p.t-mini", { texto: C().habilidade[chave].resumo }), el("p", { texto: regra.texto }), el("fieldset.oblivio-alvos", {}, [el("legend.so-leitor", { texto: "Alvos" })].concat(marcas))].concat(extras, [inicio,
        el("p.t-mini", { texto: "A mesa aplica nas fichas envolvidas e confere adjacência, limites e custos. Você não ganha acesso à ficha de ninguém." })]),
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Usar", classe: "r-botao--principal", aoClicar: function (fechar) {
        var alvos = marcas.map(function (m) { return m.querySelector("input"); }).filter(function (i) { return i.checked; }).map(function (i) { return i.value; });
        if (!alvos.length) { UI().avisoAtencao("Escolha o alvo."); return; }
        if (regra.max && alvos.length > regra.max) { UI().avisoAtencao("No máximo " + regra.max + "."); return; }
        if (inicio && !inicio.querySelector("input").checked) { UI().avisoAtencao("Ajudar os Necessitados acontece no início da rodada."); return; }
        var param = {};
        if (campos.mazela && campos.mazela.entrada.value) param.mazela = campos.mazela.entrada.value;
        if (campos.regiao && campos.regiao.entrada.value) { param.regiao = campos.regiao.entrada.value; param.limite = U.inteiro(campos.limite.entrada.value, 1); }
        if (campos.habilidade) param.habilidade = campos.habilidade.entrada.value;
        if (campos.acao) param.acao = campos.acao.entrada.value;
        if (campos.eleita) param.eleita = campos.eleita.entrada.value;
        if (inicio) param.forcar = true;
        fechar();
        return operar(ctx, { tipo: "habilidade", chave: chave, alvos: alvos.filter(function (a) { return a !== ctx.personagemId || chave !== "ataqueEmDupla"; }), param: param }, C().habilidade[chave].nome);
      } }],
    });
  }

  /* Sem alvo em outra ficha: aplica aqui mesmo, no tempo da mesa. */
  function usarLocal(ctx, chave) {
    if (JOGO() && JOGO().usarHabilidadeLocal) JOGO().usarHabilidadeLocal(ctx, chave);
  }

  /* Ações que tocam outra Persona ou a mesa. */
  function agir(ctx, chave) {
    var lista = personas(ctx, false);
    if (chave === "analisar") {
      var lista2 = alvos(ctx) || [];
      if (!lista2.length) { UI().avisoAtencao("Nenhuma Ameaça ativa no encontro."); return; }
      var sel = UI().campo({ rotulo: "Ameaça (Alcance Médio)", tipo: "selecao", opcoes: lista2.map(function (a) { return { valor: a.id, rotulo: a.nome + " — " + a.alcance }; }) });
      UI().modal({ titulo: "Analisar", conteudo: [el("p.t-mini", { texto: C().acao.analisar.resumo }), sel, el("p", { texto: "Role Duelo na disputa; a Testemunha diz se você venceu." })],
        botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Rolar Duelo", classe: "r-botao--principal", aoClicar: function (fechar) {
          fechar();
          JOGO().abrirTeste(ctx, "duelo", { aoTerminar: function () {
            UI().confirmar({ titulo: "Analisar", texto: "Você venceu a disputa?", rotuloCancelar: "Perdi", rotuloConfirmar: "Venci" }).then(function (venceu) {
              operar(ctx, { tipo: "acao", chave: "analisar", param: { disputa: venceu ? "venceu" : "perdeu", alvoAmeaca: sel.entrada.value, tipo: "regular" } }, "Analisar");
            });
          } });
        } }] });
      return;
    }
    if (!lista.length) { UI().avisoAtencao("Nenhuma outra Persona de Oblívio nesta campanha."); return; }
    var alvo = UI().campo({ rotulo: chave === "resgatar" ? "Persona em Pavor" : "Persona adjacente", tipo: "selecao", opcoes: lista.map(function (p) { return { valor: p.id, rotulo: p.nome }; }) });
    if (chave === "resgatar") {
      UI().modal({ titulo: "Resgatar", conteudo: [el("p.t-mini", { texto: C().acao.resgatar.resumo }), alvo],
        botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Testar Emocional", classe: "r-botao--principal", aoClicar: function (fechar) {
          fechar();
          JOGO().abrirTeste(ctx, "emocional", { aoTerminar: function (r) {
            operar(ctx, { tipo: "acao", chave: "resgatar", alvos: [alvo.entrada.value], param: { resultado: r.resultado, tipo: "regular" } }, "Resgatar");
          } });
        } }] });
      return;
    }
    if (chave === "sacrificar") {
      var valor = UI().campo({ rotulo: "Estresse que a outra Persona sofreria", tipo: "numero", valor: 1 });
      var regiao = UI().campo({ rotulo: "Região que recebe em você", tipo: "selecao", opcoes: R().regioesPresentes(ctx.ficha.oblivio).map(function (r) { return { valor: r.chave, rotulo: C().regiao[r.chave].nome }; }) });
      UI().modal({ titulo: "Sacrificar", conteudo: [el("p.t-mini", { texto: C().acao.sacrificar.resumo }), alvo, valor, regiao, el("p.t-mini", { texto: "O Estresse vai para você, sem passar pelo equipamento; a Testemunha deixa de aplicá-lo na outra Persona." })],
        botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Sacrificar", classe: "r-botao--principal", aoClicar: function (fechar) {
          fechar();
          return operar(ctx, { tipo: "acao", chave: "sacrificar", alvos: [alvo.entrada.value], param: { valor: U.inteiro(valor.entrada.value, 0), regiao: regiao.entrada.value, tipo: "extra" } }, "Sacrificar");
        } }] });
    }
  }

  /* Escapar (p. 87): sucessos ≥ o Grau da Ameaça (várias: maior Grau +
     o número delas). Como Ação Completa, os sucessos dobram. A conta
     fica nesta tela, pela cena. */
  function escapar(ctx) {
    var e = estado(ctx);
    var o = ctx.ficha.oblivio;
    var cx = contexto(ctx) || FX().contextoDeJogo(ctx);
    if (fuga.cena !== cx.cena) fuga = { cena: cx.cena, sucessos: 0 };
    var precisa = e ? M().sucessosParaEscapar(e) : 0;
    var completa = el("label.r-marca", {}, [el("input", { type: "checkbox" }), el("span", { texto: "Ação Completa (os sucessos dobram)" })]);
    /* O livro não fixa o Conhecimento da fuga: Reflexos por padrão, a
       Testemunha pode pedir outro (D-lacuna em docs/OBLIVIO.md). */
    var con = UI().campo({ rotulo: "Conhecimento do teste", tipo: "selecao", valor: "reflexos", opcoes: C().CONHECIMENTOS.map(function (k) { return { valor: k.chave, rotulo: k.nome }; }) });
    UI().modal({ titulo: "Escapar", conteudo: [
      el("p", { texto: precisa ? "Precisa de " + precisa + " sucesso(s); já tem " + fuga.sucessos + " nesta cena." : "Sem encontro na mesa: a Testemunha diz quantos sucessos são precisos (Grau da Ameaça; várias: maior Grau + o número delas)." }),
      con, completa],
      botoes: [{ rotulo: "Zerar a conta", classe: "r-botao--fantasma", aoClicar: function (f) { fuga.sucessos = 0; f(); } }, { rotulo: "Testar", classe: "r-botao--principal", aoClicar: function (fechar) {
        var dobra = completa.querySelector("input").checked ? 2 : 1;
        var conhecimento = con.entrada.value;
        fechar();
        JOGO().abrirTeste(ctx, conhecimento, { aoTerminar: function (r, extra) {
          var s = (C().RESULTADOS[r.resultado].sucesso ? (r.resultado === "sucessoExtremo" ? 2 : 1) : 0) + (extra && extra.sucessoAdicional ? 1 : 0);
          fuga.sucessos += s * dobra;
          if (precisa && fuga.sucessos >= precisa) UI().avisoOk("Escapou: " + fuga.sucessos + " de " + precisa + " sucessos.");
          else UI().aviso("Escapar: " + fuga.sucessos + (precisa ? " de " + precisa : "") + " sucesso(s).");
        } });
      } }],
    });
  }

  /* ---------------------------------------------------------------
     A FAIXA "NA MESA"
     --------------------------------------------------------------- */

  function painel(ctx) {
    var cid = campanhaDe(ctx);
    if (!cid) return null;
    var e = estado(ctx);
    if (!e) {
      return el("p.t-mini.oblivio-mesa-faixa", { role: "status", texto: lido.erro === "sem_permissao" ? "A mesa de Oblívio desta campanha não está disponível para esta conta." : lido.erro ? "A mesa da campanha não respondeu; a ficha segue no tempo avulso." : "Lendo a mesa da campanha…" });
    }
    var partes = [];
    if (e.missao) partes.push("Missão: " + (e.missao.nome || "em andamento"));
    if (e.cena) partes.push("Cena de " + (C().cena[e.cena.tipo] ? C().cena[e.cena.tipo].nome : e.cena.tipo) + (e.cena.rodada ? ", rodada " + e.cena.rodada : ""));
    else partes.push("Sem cena aberta");
    var vez = e.cena ? M().atual(e) : null;
    if (vez && vez.ref === ctx.personagemId) partes.push("é a sua vez");
    var casa = e.fileiras.personas.indexOf(ctx.personagemId);
    if (casa >= 0) partes.push("fileira: " + (casa + 1) + "ª casa");
    if (e.farol && e.farol.persona === ctx.personagemId) partes.push("você leva o Farol" + (e.farol.aceso ? " (aceso)" : ""));
    var bonus = bonusDeGrupo(ctx);
    if (bonus.length) partes.push(bonus.map(function (b) { return b.fonte + " +" + b.valor + " de Proteção"; }).join(", "));
    var ameacas = (alvos(ctx) || []).length;
    if (ameacas) partes.push(ameacas + " Ameaça(s) no encontro");
    var pendentes = ataquesPendentes(ctx);
    return el("div.oblivio-mesa-faixa", { role: "status" }, [
      el("span", { texto: "Na mesa · " + partes.join(" · ") }),
      el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", texto: "Atualizar", onclick: function () { carregar(ctx, true); } }),
      pendentes.length ? el("div.oblivio-mesa-faixa__pendentes", {}, pendentes.map(function (p) {
        return el("div.faixa", {}, [
          el("span.r-etiqueta.r-etiqueta--aviso", { texto: (p.nome || "Ameaça") + " acertou: " + p.dano + " de Estresse" }),
          ctx.podeEditar() ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Escolher onde recebe", onclick: function () { receberAtaque(ctx, p); } }) : null,
        ]);
      })) : null,
    ]);
  }

  global.RAMAOblivioMesaDaFicha = {
    contexto: contexto, bonusDeGrupo: bonusDeGrupo, naCampanha: naCampanha, alvos: alvos, personas: personas,
    atacarAmeaca: atacarAmeaca, usarHabilidade: usarHabilidade, agir: agir, escapar: escapar, painel: painel,
    recarregar: function (ctx) { return carregar(ctx, true); },
  };
})(window);
