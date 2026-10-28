/* =====================================================================
   R.A.M.A. — Oblívio · habilidades e ações específicas
   =====================================================================
   Cada habilidade e cada ação específica do livro como uma função:

     usar(chave, contexto) → { ok, motivo?, eventos[], pendente? }

   contexto:
     fichas   { id: blocoOblivio } — as Personas ENVOLVIDAS (quem usa e
              os alvos). Na ficha avulsa, só a própria; na campanha, o
              servidor carrega as que a operação toca e confere a
              permissão de cada uma (habilidade de aliado não dá edição
              genérica da ficha dele).
     quem     id de quem usa
     alvos    [ids] de Personas alvo (quando houver)
     mesa     estado da mesa (js/oblivio/mesa.js) ou null (avulsa)
     ctx      { cena, rodada, partida, tipoDeCena, missao }
     rolador  dados
     param    o que a habilidade precisa (mazela, quantidade, escolha…)

   Os limites (por rodada, cena, Descanso, Partida) são conferidos com
   R.podeUsar e registrados SÓ quando a habilidade é de fato aplicada.
   Passivos (Voracidade, Peso Pesado, Escudo Humano, Armadura de
   Espinhos…) não passam por aqui: o motor os aplica onde a condição é
   conhecida (dano, Proteção, ataque recebido).
   ===================================================================== */

(function (global) {
  "use strict";

  var C = global.RAMAOblivioCatalogo;
  var R = global.RAMAOblivio;
  var K = global.RAMAOblivioCombate;
  var M = global.RAMAOblivioMesa;

  function ev(tipo, dados) { return R.evento(tipo, dados); }
  function falha(motivo) { return { ok: false, motivo: motivo, eventos: [] }; }
  function marcar(evs, persona) { return evs.map(function (e) { return Object.assign({ persona: persona }, e); }); }

  function base(cx, chave) {
    var o = cx.fichas && cx.fichas[cx.quem];
    if (!o) return { erro: "Persona não encontrada." };
    var pode = R.podeUsar(o, chave, cx.ctx);
    if (!pode.ok) return { erro: pode.motivo };
    return { o: o };
  }
  function adjacentes(cx, a, b) {
    if (!cx.mesa) return true; /* avulsa: a pessoa informa o contexto */
    if (a === b) return true;
    return M.adjacentesNaFileira(cx.mesa, a).indexOf(b) >= 0;
  }

  /* Cura feita por habilidades do Papel de Quem Cuida em OUTRAS
     Personas, por cena — o que Abrir Feridas usa. */
  function registrarCuraDoPapel(o, valor, ctx) {
    var cena = (ctx && ctx.cena) || "";
    if (o.reservas.curadoNaCena.cena !== cena) o.reservas.curadoNaCena = { cena: cena, valor: 0 };
    o.reservas.curadoNaCena.valor += valor;
    o.reservas.abrirFeridas = o.reservas.curadoNaCena.valor;
  }

  var USOS = {
    /* ----------------------------- Quem Cuida ------------------------ */
    ajudarOsNecessitados: function (cx) {
      var b = base(cx, "ajudarOsNecessitados"); if (b.erro) return falha(b.erro);
      var o = b.o;
      var alvos = (cx.alvos || []).slice(0, 2);
      if (!alvos.length) return falha("Escolha até duas Personas adjacentes.");
      var calma = cx.ctx && (cx.ctx.tipoDeCena === "descanso" || cx.ctx.tipoDeCena === "interacao");
      if (!calma && cx.ctx && cx.ctx.momento !== "inicioDaRodada" && !cx.param.forcar) return falha("Ajudar os Necessitados acontece no início da rodada.");
      var valor = R.metade(R.atributosEfetivos(o).mente);
      var eventos = [];
      var curadoEmOutras = 0;
      for (var i = 0; i < alvos.length; i++) {
        var alvo = cx.fichas[alvos[i]];
        if (!alvo) return falha("Persona alvo não encontrada.");
        if (!adjacentes(cx, cx.quem, alvos[i])) return falha("Só Personas adjacentes.");
        var r = R.recuperarEstresse(alvo, valor, { fonte: "ajudarOsNecessitados", distribuicao: cx.param.distribuicao && cx.param.distribuicao[alvos[i]], ctx: cx.ctx });
        eventos = eventos.concat(marcar(r.eventos, alvos[i]));
        if (alvos[i] !== cx.quem) curadoEmOutras += r.recuperado;
      }
      registrarCuraDoPapel(o, curadoEmOutras, cx.ctx);
      R.registrarUso(o, "ajudarOsNecessitados", cx.ctx, calma ? ["cenaCalma"] : ["rodada"]);
      return { ok: true, eventos: eventos };
    },
    abrirFeridas: function (cx) {
      var b = base(cx, "abrirFeridas"); if (b.erro) return falha(b.erro);
      var o = b.o;
      var cena = (cx.ctx && cx.ctx.cena) || "";
      var acumulado = o.reservas.curadoNaCena.cena === cena ? o.reservas.curadoNaCena.valor : 0;
      if (!acumulado) return falha("Nada curado em outras Personas nesta cena.");
      var extra = R.metade(acumulado);
      R.registrarUso(o, "abrirFeridas", cx.ctx);
      /* O dano extra vai no ataque desta ação (composicaoDoDano com
         usarAbrirFeridas); a reserva zera DEPOIS do acerto. */
      return { ok: true, extra: extra, eventos: [ev("abrirFeridas", { persona: cx.quem, extra: extra })] };
    },
    balsamo: function (cx) {
      var b = base(cx, "balsamo"); if (b.erro) return falha(b.erro);
      var o = b.o;
      var alvoId = (cx.alvos && cx.alvos[0]) || cx.quem;
      var alvo = cx.fichas[alvoId];
      if (!alvo) return falha("Persona alvo não encontrada.");
      if (!adjacentes(cx, cx.quem, alvoId)) return falha("Só em si ou numa Persona adjacente.");
      if (cx.param.regiao) {
        if (R.usosFeitos(o, "balsamoRegiao", "partida", cx.ctx) >= 1) return falha("Recuperar uma região: uma vez por Partida.");
        var reg = R.regiao(alvo, cx.param.regiao);
        if (!reg || reg.estado !== "ausente" || cx.param.regiao === "torso") return falha("Essa região não foi perdida.");
        var limite = R.inteiro(cx.param.limite, 1, 99, 1);
        reg.estado = "organica"; reg.limite = limite; reg.estresse = 0;
        alvo.escolhasPendentes.push({ tipo: "distribuirLimite", id: R.novoId("pe"), texto: "A região voltou: redistribua o limite." });
        var custo = R.receberEstresse(o, limite, { regiao: "torso", origem: { tipo: "balsamo" }, semFerida: true });
        R.registrarUso(o, "balsamoRegiao", cx.ctx, ["partida"]);
        return { ok: true, eventos: [ev("regiaoRecuperada", { persona: alvoId, regiao: cx.param.regiao, limite: limite })].concat(marcar(custo.eventos, cx.quem)) };
      }
      var mz = cx.param.mazela;
      if (!R.temMazela(alvo, mz)) return falha("A Persona não sofre dessa mazela.");
      var r = R.removerMazela(alvo, mz, "balsamo");
      if (!r.ok) return r;
      return { ok: true, eventos: marcar(r.eventos, alvoId) };
    },
    ultimaEsperanca: function (cx) {
      var b = base(cx, "ultimaEsperanca"); if (b.erro) return falha(b.erro);
      var o = b.o;
      o.efeitos.push({ id: R.novoId("ef"), tipo: "ultimaEsperanca", restam: 3, valor: R.metade(R.atributosEfetivos(o).mente), cena: (cx.ctx && cx.ctx.cena) || "" });
      R.registrarUso(o, "ultimaEsperanca", cx.ctx);
      return { ok: true, eventos: [ev("ultimaEsperanca", { persona: cx.quem, vezes: 3 })] };
    },

    /* ----------------------------- Quem Age -------------------------- */
    ataqueEmDupla: function (cx) {
      var b = base(cx, "ataqueEmDupla"); if (b.erro) return falha(b.erro);
      var parceiro = cx.alvos && cx.alvos[0];
      if (!parceiro || !cx.fichas[parceiro]) return falha("Escolha uma Persona adjacente para atacar junto.");
      if (!adjacentes(cx, cx.quem, parceiro)) return falha("A parceira precisa estar adjacente.");
      /* Os dois ataques são resolvidos pela mesa, um de cada vez, contra
         o mesmo alvo; cada um causa dano se acertar (H1). */
      return { ok: true, pendente: { tipo: "ataquesConjuntos", atacantes: [cx.quem, parceiro], acao: "completa" }, eventos: [ev("ataqueEmDupla", { persona: cx.quem, parceiro: parceiro })] };
    },
    estocada: function (cx) {
      var b = base(cx, "estocada"); if (b.erro) return falha(b.erro);
      var casas = R.inteiro(cx.param.casas, 0, 99, 0);
      if (casas < 1) return falha("A Estocada avança pelo menos 1 casa.");
      return { ok: true, pendente: { tipo: "ataque", casasAvancadas: casas, aoErrar: { teste: "reflexos", falha: { mazela: "noChao" } } }, eventos: [ev("estocada", { persona: cx.quem, casas: casas })] };
    },

    /* ----------------------------- Quem Resolve ---------------------- */
    animarOsAnimos: function (cx) {
      var b = base(cx, "animarOsAnimos"); if (b.erro) return falha(b.erro);
      var o = b.o;
      var alvoId = cx.alvos && cx.alvos[0];
      var alvo = alvoId && cx.fichas[alvoId];
      if (!alvo || alvoId === cx.quem) return falha("Escolha uma Persona adjacente que acabou de atingir o limite.");
      if (!adjacentes(cx, cx.quem, alvoId)) return falha("Só uma Persona adjacente.");
      if (!R.deveFicarForaDeAcao(alvo)) return falha("A Persona não atingiu o limite.");
      var valor = R.metade(R.atributosEfetivos(o).determinacao);
      var r = R.recuperarEstresse(alvo, valor, { fonte: "animarOsAnimos", ctx: cx.ctx, distribuicao: cx.param.distribuicao });
      R.registrarUso(o, "animarOsAnimos", cx.ctx);
      var ainda = R.deveFicarForaDeAcao(alvo);
      return { ok: true, impediu: !ainda, eventos: marcar(r.eventos, alvoId).concat([ev("animarOsAnimos", { persona: cx.quem, alvo: alvoId, impediu: !ainda })]) };
    },
    copiaBarata: function (cx) {
      var b = base(cx, "copiaBarata"); if (b.erro) return falha(b.erro);
      var o = b.o;
      var dono = cx.alvos && cx.alvos[0];
      var chave = cx.param.habilidade;
      var h = C.habilidade[chave];
      if (!h || h.tipo !== "unica") return falha("Escolha uma Habilidade Única.");
      var d = dono && cx.fichas[dono];
      if (!d || dono === cx.quem || !R.temHabilidade(d, chave)) return falha("Essa Persona do grupo não tem essa habilidade.");
      var maximo = R.metade(R.atributosEfetivos(o).determinacao);
      var feitas = o.efeitos.filter(function (e) { return e.tipo === "copiaUsada"; });
      if (feitas.length >= maximo) return falha("Cópias entre Descansos: no máximo " + maximo + ".");
      if (feitas.some(function (e) { return e.habilidade === chave; })) return falha("Essa habilidade já foi copiada; espere o próximo Descanso.");
      o.efeitos.push({ id: R.novoId("ef"), tipo: "copia", habilidade: chave, de: dono, expira: "fimDaCena" });
      o.efeitos.push({ id: R.novoId("ef"), tipo: "copiaUsada", habilidade: chave });
      R.registrarUso(o, "copiaBarata", cx.ctx);
      return { ok: true, eventos: [ev("copiaBarata", { persona: cx.quem, habilidade: chave, de: dono })] };
    },
    instrucaoDecisiva: function (cx) {
      var b = base(cx, "instrucaoDecisiva"); if (b.erro) return falha(b.erro);
      var alvoId = cx.alvos && cx.alvos[0];
      if (!alvoId) return falha("Escolha a Persona que vai agir.");
      var tipo = cx.param.acao || "regular";
      if (tipo === "completa") return falha("A ação concedida não pode ser Completa.");
      return { ok: true, concede: { persona: alvoId, acao: tipo, foraDoTurno: true }, eventos: [ev("acaoConcedida", { por: cx.quem, persona: alvoId, acao: tipo })] };
    },

    /* ----------------------------- Quem Sabe ------------------------- */
    repertorioDeConhecimento: function (cx) {
      var b = base(cx, "repertorioDeConhecimento"); if (b.erro) return falha(b.erro);
      var o = b.o;
      var calma = cx.ctx && (cx.ctx.tipoDeCena === "descanso" || cx.ctx.tipoDeCena === "interacao");
      R.registrarUso(o, "repertorioDeConhecimento", cx.ctx, calma ? ["cenaCalma"] : ["rodada"]);
      var bonus = R.metade(R.atributosEfetivos(o).mente);
      return { ok: true, bonus: { fonte: "Repertório de Conhecimento", valor: bonus, aplicacao: "umDado" }, eventos: [ev("repertorio", { persona: cx.quem, bonus: bonus, para: (cx.alvos && cx.alvos[0]) || cx.quem })] };
    },
    feedbackDefensivo: function (cx) {
      var b = base(cx, "feedbackDefensivo"); if (b.erro) return falha(b.erro);
      var o = b.o;
      var alvoId = (cx.alvos && cx.alvos[0]) || cx.quem;
      var alvo = cx.fichas[alvoId];
      if (!alvo) return falha("Persona alvo não encontrada.");
      if (alvo.efeitos.some(function (e) { return e.tipo === "protecao" && e.fonte === "Feedback Defensivo"; })) return falha("Essa Persona já tem um Feedback Defensivo.");
      var valor = R.metadeMin1(R.atributosEfetivos(o).mente);
      alvo.efeitos.push({ id: R.novoId("ef"), tipo: "protecao", fonte: "Feedback Defensivo", valor: valor, persistente: true, expira: "fimDaCena" });
      R.registrarUso(o, "feedbackDefensivo", cx.ctx);
      if (cx.mesa) { var p = cx.mesa.encontro.protecoes[alvoId]; if (p) p.persistente = valor; }
      return { ok: true, eventos: [ev("feedbackDefensivo", { persona: cx.quem, alvo: alvoId, valor: valor })] };
    },
    planoDeContingencia: function (cx) {
      var b = base(cx, "planoDeContingencia"); if (b.erro) return falha(b.erro);
      R.registrarUso(b.o, "planoDeContingencia", cx.ctx);
      return { ok: true, reduzir: "Plano de Contingência", eventos: [ev("planoDeContingencia", { persona: cx.quem })] };
    },
    pontoFraco: function (cx) {
      var b = base(cx, "pontoFraco"); if (b.erro) return falha(b.erro);
      var o = b.o;
      var r = cx.param.disputa;
      if (!r) return { ok: true, pendente: { tipo: "disputa", conhecimento: "saber", alcance: "medio" }, eventos: [] };
      if (r !== "venceu") return { ok: true, eventos: [ev("pontoFraco", { persona: cx.quem, venceu: false })] };
      var efeito = cx.param.efeito;
      var saida = { ok: true, eventos: [] };
      if (efeito === "dano") saida.efeitoNoAlvo = { tipo: "pontoFracoDano", valor: R.metade(R.atributosEfetivos(o).mente), ate: "fimDaCena" };
      else if (efeito === "mazela") {
        var d = cx.rolador(6);
        var mz = d <= 2 ? "botandoParaFora" : d <= 4 ? "juraDeMorte" : d === 5 ? "lentidao" : "semReacao";
        saida.efeitoNoAlvo = { tipo: "mazela", mazela: mz, d6: d };
      } else if (efeito === "protecao") saida.efeitoNoAlvo = { tipo: "protecao", valor: -1, ate: "proximoDano", fonte: "Ponto Fraco" };
      else return falha("Escolha o efeito do Ponto Fraco.");
      saida.eventos.push(ev("pontoFraco", { persona: cx.quem, efeito: efeito, detalhe: saida.efeitoNoAlvo }));
      return saida;
    },

    /* ----------------------------- Gerais ---------------------------- */
    todosPorUm: function (cx) {
      var b = base(cx, "todosPorUm"); if (b.erro) return falha(b.erro);
      var grupo = Object.keys(cx.fichas);
      var semHab = grupo.filter(function (id) { return !R.temHabilidade(cx.fichas[id], "todosPorUm"); });
      if (semHab.length) return falha("Todas as Personas do grupo precisam de Todos por Um.");
      var eleita = cx.param.eleita;
      if (!eleita || !cx.fichas[eleita]) return falha("Elejam a Persona que faz o ataque.");
      return { ok: true, pendente: { tipo: "todosPorUm", eleita: eleita, participantes: grupo, acao: "completa" }, eventos: [ev("todosPorUm", { eleita: eleita })] };
    },
  };

  function usar(chave, contexto) {
    var cx = Object.assign({ fichas: {}, alvos: [], param: {}, ctx: {} }, contexto || {});
    var f = USOS[chave];
    if (!f) return falha("Esta habilidade é passiva ou não tem ativação.");
    return f(cx);
  }

  /* ---------------------------------------------------------------
     PASSIVOS COM GATILHO CONHECIDO
     --------------------------------------------------------------- */

  /* Armadura de Espinhos (p. 59): quem acerta a Persona testa "Fuga"
     — Reflexos pelo ajuste padrão (D6) — e sofre metade da Carne (mín.
     1) se falhar. Devolve o que a mesa aplica no atacante. */
  function armaduraDeEspinhos(o, ajustes) {
    if (!R.temHabilidade(o, "armaduraDeEspinhos")) return null;
    var modo = (ajustes && ajustes.testeDeFuga) || "reflexos";
    return { teste: modo === "reflexos" ? "reflexos" : "testemunha", dano: R.metadeMin1(R.atributosEfetivos(o).carne), fonte: "Armadura de Espinhos" };
  }

  /* Sede de Sangue (p. 55): ao eliminar, recupera o dano total do
     ataque final. */
  function sedeDeSangue(o, danoFinal, ctx) {
    if (!R.temHabilidade(o, "sedeDeSangue")) return { eventos: [] };
    return R.recuperarEstresse(o, danoFinal, { fonte: "sedeDeSangue", ctx: ctx });
  }

  /* Voracidade: primeiro acerto com Estresse em cada alvo, por cena. */
  function primeiroAcertoNoAlvo(o, alvoId, ctx) {
    var cena = (ctx && ctx.cena) || "";
    return !o.efeitos.some(function (e) { return e.tipo === "acertou" && e.alvo === alvoId && e.cena === cena; });
  }
  function registrarAcerto(o, alvoId, ctx) {
    o.efeitos.push({ id: R.novoId("ef"), tipo: "acertou", alvo: alvoId, cena: (ctx && ctx.cena) || "", expira: "fimDaCena" });
  }

  /* Última Esperança: no início do turno de quem cuida, cura o grupo. */
  function ultimaEsperancaNoTurno(fichas, quem, ctx) {
    var o = fichas[quem];
    var ef = o && o.efeitos.filter(function (e) { return e.tipo === "ultimaEsperanca" && e.restam > 0; })[0];
    if (!ef) return { eventos: [] };
    var eventos = [];
    Object.keys(fichas).forEach(function (id) {
      var r = R.recuperarEstresse(fichas[id], ef.valor, { fonte: "ultimaEsperanca", ctx: ctx });
      eventos = eventos.concat(marcar(r.eventos, id));
      if (id !== quem) registrarCuraDoPapel(o, r.recuperado, ctx);
    });
    ef.restam--;
    if (ef.restam <= 0) o.efeitos = o.efeitos.filter(function (e) { return e !== ef; });
    return { eventos: eventos };
  }

  /* Repartir a Dor: quem protege fica com `quanto` do Estresse. */
  function repartirADor(protetor, protegido, total, quanto, opcoes) {
    var q = Math.max(0, Math.min(R.inteiro(total, 0, 999, 0), R.inteiro(quanto, 0, 999, 0)));
    var e1 = q ? R.receberEstresse(protetor, q, Object.assign({}, opcoes || {}, { origem: { tipo: "repartirADor" } })).eventos : [];
    var e2 = total - q ? R.receberEstresse(protegido, total - q, opcoes).eventos : [];
    return { eventos: e1.concat(e2) };
  }

  /* ---------------------------------------------------------------
     AÇÕES ESPECÍFICAS (pp. 86–90)
     --------------------------------------------------------------- */

  /* A economia do turno: uma Regular, uma Extra e uma de Movimento, ou
     uma Completa. Sem Fôlego encarece (p. 94). */
  function custoDaAcao(o, tipo) {
    if (!R.temMazela(o, "semFolego")) return tipo;
    if (tipo === "regular") return "completa";
    if (tipo === "extra") return "regular";
    if (tipo === "completa") return "completa2";
    return tipo;
  }
  function turnoVazio() { return { regular: false, extra: false, movimento: false, completa: false, extrasConcedidas: 0 }; }
  function gastarAcao(turno, tipo) {
    var t = turno || turnoVazio();
    var partes = String(tipo).split("+");
    for (var i = 0; i < partes.length; i++) {
      var p = partes[i] === "completa2" ? "completa" : partes[i];
      if (t.completa) return { ok: false, motivo: "O turno já foi usado por uma Ação Completa." };
      if (p === "completa" && (t.regular || t.extra || t.movimento)) return { ok: false, motivo: "A Ação Completa ocupa o turno inteiro." };
      if (p !== "completa" && t[p]) return { ok: false, motivo: "A Ação " + (C.TIPOS_DE_ACAO.filter(function (x) { return x.chave === p; })[0] || { nome: p }).nome + " já foi usada neste turno." };
    }
    partes.forEach(function (p) { t[p === "completa2" ? "completa" : p] = true; });
    return { ok: true, turno: t };
  }

  var ACOES = {
    acelerar: function (cx) {
      var o = cx.fichas[cx.quem];
      var folego = Math.max(0, R.calcularMutaveis(o).folego.total);
      var feitos = R.usosFeitos(o, "acelerar", "descanso", cx.ctx);
      var eventos = [];
      o.efeitos.push({ id: R.novoId("ef"), tipo: "acelerar", expira: "fimDoProximoTurno", desdeRodada: (cx.ctx && cx.ctx.rodada) || 0 });
      R.registrarUso(o, "acelerar", cx.ctx, ["descanso"]);
      if (feitos >= folego) {
        /* Acima do Fôlego: 1D4 cumulativo nas pernas (p. 86). */
        var excedente = feitos - folego + 1;
        var dano = 0;
        for (var i = 0; i < excedente; i++) dano += cx.rolador(4);
        var perna = ["pernaD", "pernaE"].filter(function (k) { var r = R.regiao(o, k); return r && r.estado !== "ausente"; })[0] || "torso";
        eventos = eventos.concat(R.receberEstresse(o, dano, { regiao: cx.param.regiao || perna, origem: { tipo: "acelerar" } }).eventos);
      }
      return { ok: true, eventos: eventos.concat([ev("acelerar", { persona: cx.quem })]) };
    },
    seguirEmFrente: function (cx) {
      var o = cx.fichas[cx.quem];
      if (!cx.param.resultado) return { ok: true, pendente: { tipo: "teste", conhecimento: "emocional" }, eventos: [] };
      if (!C.RESULTADOS[cx.param.resultado].sucesso) return { ok: true, eventos: [ev("seguirEmFrente", { persona: cx.quem, sucesso: false })] };
      o.motivacao.abandonada = true;
      var g = R.ganharCoragem(o, 1, "Seguir em Frente");
      return { ok: true, eventos: g.eventos.concat([ev("seguirEmFrente", { persona: cx.quem, sucesso: true })]) };
    },
    resgatar: function (cx) {
      var alvoId = cx.alvos && cx.alvos[0];
      var alvo = alvoId && cx.fichas[alvoId];
      if (!alvo || !R.temMazela(alvo, "pavor")) return falha("Só uma Persona em Pavor.");
      if (!cx.param.resultado) return { ok: true, pendente: { tipo: "teste", conhecimento: "emocional" }, eventos: [] };
      if (!C.RESULTADOS[cx.param.resultado].sucesso) return { ok: true, eventos: [ev("resgatar", { sucesso: false })] };
      var r = R.removerMazela(alvo, "pavor", "resgatar");
      var g = R.ganharCoragem(alvo, 1, "Resgatar");
      return { ok: true, eventos: marcar(r.eventos.concat(g.eventos), alvoId) };
    },
    sacrificar: function (cx) {
      var o = cx.fichas[cx.quem];
      var alvoId = cx.alvos && cx.alvos[0];
      if (!alvoId || !adjacentes(cx, cx.quem, alvoId)) return falha("Só por uma Persona adjacente.");
      if (R.usosFeitos(o, "sacrificar", "rodada", cx.ctx) >= 1) return falha("Uma vez por rodada.");
      var valor = R.inteiro(cx.param.valor, 0, 999, 0);
      var r = R.receberEstresse(o, valor, { regiao: cx.param.regiao, semEquipamento: true, origem: { tipo: "sacrificar", por: alvoId } });
      var g = R.ganharCoragem(o, 1, "Sacrificar");
      R.registrarUso(o, "sacrificar", cx.ctx, ["rodada"]);
      return { ok: true, eventos: r.eventos.concat(g.eventos) };
    },
    preparar: function (cx) {
      var o = cx.fichas[cx.quem];
      o.efeitos = o.efeitos.filter(function (e) { return e.tipo !== "preparada"; });
      o.efeitos.push({ id: R.novoId("ef"), tipo: "preparada", gatilho: String(cx.param.gatilho || "").slice(0, 200), acao: String(cx.param.acao || "").slice(0, 200) });
      return { ok: true, eventos: [ev("preparou", { persona: cx.quem, gatilho: cx.param.gatilho })] };
    },
    analisar: function (cx) {
      if (!cx.param.disputa) return { ok: true, pendente: { tipo: "disputa", conhecimento: "duelo", alcance: "medio" }, eventos: [] };
      var alvo = cx.param.alvoAmeaca;
      if (cx.mesa && cx.mesa.encontro.analisados[alvo]) return falha("Esse alvo já foi analisado por alguém do grupo.");
      if (cx.param.disputa !== "venceu") return { ok: true, eventos: [ev("analisar", { sucesso: false })] };
      var bonus = R.metade(R.atributosEfetivos(cx.fichas[cx.quem]).mente);
      if (cx.mesa) cx.mesa.encontro.analisados[alvo] = { por: cx.quem, bonus: bonus };
      return { ok: true, bonus: bonus, eventos: [ev("analisar", { sucesso: true, alvo: alvo, bonus: bonus })] };
    },
  };

  function agir(chave, contexto) {
    var cx = Object.assign({ fichas: {}, alvos: [], param: {}, ctx: {} }, contexto || {});
    var f = ACOES[chave];
    if (!f) return falha("Ação sem automação específica.");
    var o = cx.fichas[cx.quem];
    if (!o || R.estadoDaPersona(o) !== "ativa") return falha("A Persona não pode agir agora.");
    /* Fazer uma Ação Regular perde a ação preparada (p. 89). */
    if (chave !== "preparar" && cx.param.tipo === "regular") o.efeitos = o.efeitos.filter(function (e) { return e.tipo !== "preparada"; });
    return f(cx);
  }

  global.RAMAOblivioHabilidades = {
    usar: usar, agir: agir, temAtivacao: function (chave) { return !!USOS[chave]; }, temAcao: function (chave) { return !!ACOES[chave]; },
    armaduraDeEspinhos: armaduraDeEspinhos, sedeDeSangue: sedeDeSangue, primeiroAcertoNoAlvo: primeiroAcertoNoAlvo, registrarAcerto: registrarAcerto,
    ultimaEsperancaNoTurno: ultimaEsperancaNoTurno, repartirADor: repartirADor, registrarCuraDoPapel: registrarCuraDoPapel,
    custoDaAcao: custoDaAcao, turnoVazio: turnoVazio, gastarAcao: gastarAcao,
  };
})(typeof window !== "undefined" ? window : globalThis);
