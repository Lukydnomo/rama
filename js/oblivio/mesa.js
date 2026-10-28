/* =====================================================================
   R.A.M.A. — Oblívio · a mesa (missão, cenas, ordem, fileiras, Farol)
   =====================================================================
   O estado COMPARTILHADO de uma campanha de Oblívio: o que pertence à
   mesa e não a uma ficha. É a FONTE DE VERDADE de: missão atual e
   histórico, cena e rodada, Ordem de Ação, fileiras, Farol, encontro
   (instâncias de Ameaças e o desgaste de Proteção de cada alvo) e o
   Buraco. A ficha guarda o que é da Persona (Estresse, Coragem,
   mazelas, inventário); a mesa nunca guarda cópia desses saldos.

   O tempo anda por EVENTOS: avancarTurno, iniciarCena, encerrarCena.
   Nada avança por relógio, recarga de página ou redesenho. Cada evento
   devolve as ações que precisam ser aplicadas às fichas (momentos), e
   quem aplica é a página (ficha avulsa) ou o servidor (campanha).

   Informação privada da Testemunha (Buraco não revelado, recompensas,
   anotações) sai por vistaDosJogadores, nunca pela vista completa.
   ===================================================================== */

(function (global) {
  "use strict";

  var C = global.RAMAOblivioCatalogo;
  var R = global.RAMAOblivio;
  var K = global.RAMAOblivioCombate;
  var AM = global.RAMAOblivioMotorAmeacas;

  function ev(tipo, dados) { return R.evento(tipo, dados); }

  function estadoVazio() {
    return {
      v: 1,
      /* Ligada em Configurações da campanha: a aba Oblívio aparece. */
      ativo: false,
      ajustes: R.ajustesDe(null),
      partida: { id: R.novoId("pt"), n: 1 },
      missao: null,
      missoes: [],
      cena: null,
      cenas: 0,
      fileiras: { personas: [], ameacas: [] },
      farol: { persona: "", item: "", aceso: false, derrubado: false, rodadas: 0, cenas: 0, apagada: null, derrubadaPor: "" },
      encontro: { ameacas: [], protecoes: {}, analisados: {}, ataquesPendentes: [] },
      buraco: null,
      registro: [],
      operacoes: [],
    };
  }

  function normalizar(bruto) {
    var b = bruto && typeof bruto === "object" ? bruto : {};
    var e = estadoVazio();
    e.ativo = b.ativo === true;
    e.ajustes = R.ajustesDe(b.ajustes);
    if (b.partida && b.partida.id) e.partida = { id: String(b.partida.id).slice(0, 80), n: R.inteiro(b.partida.n, 1, 9999, 1) };
    e.missao = b.missao && b.missao.id ? R.copiar(b.missao) : null;
    e.missoes = Array.isArray(b.missoes) ? b.missoes.slice(-50).map(R.copiar) : [];
    e.cena = b.cena && b.cena.id ? R.copiar(b.cena) : null;
    e.cenas = R.inteiro(b.cenas, 0, 99999, 0);
    var f = b.fileiras || {};
    e.fileiras = { personas: Array.isArray(f.personas) ? f.personas.map(String).slice(0, 30) : [], ameacas: Array.isArray(f.ameacas) ? f.ameacas.map(String).slice(0, 60) : [] };
    if (b.farol && typeof b.farol === "object") e.farol = Object.assign(e.farol, R.copiar(b.farol));
    var en = b.encontro || {};
    e.encontro = {
      ameacas: Array.isArray(en.ameacas) ? en.ameacas.slice(0, 60).map(R.copiar) : [],
      protecoes: en.protecoes && typeof en.protecoes === "object" ? R.copiar(en.protecoes) : {},
      analisados: en.analisados && typeof en.analisados === "object" ? R.copiar(en.analisados) : {},
      ataquesPendentes: Array.isArray(en.ataquesPendentes) ? en.ataquesPendentes.slice(-20).map(R.copiar) : [],
    };
    e.buraco = b.buraco ? R.copiar(b.buraco) : null;
    e.registro = Array.isArray(b.registro) ? b.registro.slice(-200).map(R.copiar) : [];
    e.operacoes = Array.isArray(b.operacoes) ? b.operacoes.slice(-300).map(String) : [];
    return e;
  }

  function registrar(m, tipo, dados) {
    m.registro.push(Object.assign({ tipo: tipo, cena: m.cena ? m.cena.id : "", rodada: m.cena ? m.cena.rodada : 0 }, dados || {}));
    if (m.registro.length > 200) m.registro = m.registro.slice(-200);
  }

  /* ---------------------------------------------------------------
     MISSÃO (p. 95; glossário p. 121)
     --------------------------------------------------------------- */

  function iniciarMissao(m, nome) {
    if (m.missao && !m.missao.concluida) return { ok: false, motivo: "Há uma missão em andamento." };
    m.missao = { id: R.novoId("ms"), nome: String(nome || "Missão").slice(0, 120), inicio: m.partida.id, mortos: [], concluida: false };
    registrar(m, "missao", { id: m.missao.id });
    return { ok: true, momentos: [{ tipo: "iniciarMissao", missao: m.missao.id, para: "todas" }], eventos: [ev("missaoIniciada", { nome: m.missao.nome })] };
  }

  function registrarMorte(m, personaId) {
    if (m.missao && m.missao.mortos.indexOf(personaId) < 0) m.missao.mortos.push(personaId);
  }

  /* Concluir: cada Persona VIVA recebe a progressão (uma vez — a ficha
     guarda as missões já aplicadas). */
  function concluirMissao(m) {
    if (!m.missao || m.missao.concluida) return { ok: false, motivo: "Não há missão em andamento." };
    var mis = m.missao;
    mis.concluida = true;
    m.missoes.push(mis);
    m.missao = null;
    registrar(m, "missaoConcluida", { id: mis.id, mortos: mis.mortos.length });
    return { ok: true, momentos: [{ tipo: "concluirMissao", missao: mis.id, mortos: mis.mortos.length, para: "vivas" }], eventos: [ev("missaoConcluida", { nome: mis.nome, mortos: mis.mortos.length })] };
  }

  /* ---------------------------------------------------------------
     CENAS, TURNOS, RODADAS (pp. 116–120)
     --------------------------------------------------------------- */

  /* participantes: [{ ref, tipo: "persona"|"ameaca", nome, velocidade }]
     Ordem de Ação: Velocidade, do maior ao menor; empate fica na ordem
     de entrada, e a Testemunha pode trocar (C8). */
  function ordemDeAcao(participantes) {
    return participantes.map(function (p, i) { return Object.assign({ i: i }, p); })
      .sort(function (a, b) { return (b.velocidade - a.velocidade) || (a.i - b.i); })
      .map(function (p) { return { ref: p.ref, tipo: p.tipo, nome: p.nome || "", velocidade: p.velocidade, adiado: false }; });
  }

  function iniciarCena(m, tipo, participantes, opcoes) {
    if (!C.cena[tipo]) return { ok: false, motivo: "Tipo de cena desconhecido." };
    var op = opcoes || {};
    var momentos = [];
    var eventos = [];
    if (m.cena) {
      var fim = encerrarCena(m);
      momentos = momentos.concat(fim.momentos || []);
      eventos = eventos.concat(fim.eventos || []);
    }
    m.cenas++;
    m.cena = { id: R.novoId("cn"), n: m.cenas, tipo: tipo, rodada: C.cena[tipo].rodadas ? 1 : 0, turno: 0, ordem: C.cena[tipo].rodadas ? ordemDeAcao(participantes || []) : [] };
    if (tipo === "tensao") m.cena.tensao = { rodadas: R.inteiro(op.rodadas, 0, 99, 0), meta: R.inteiro(op.sucessos, 0, 99, 0), acumulados: 0, motivo: String(op.motivo || "").slice(0, 120), aoAcabar: op.aoAcabar || null };
    registrar(m, "cena", { tipo: tipo });
    momentos.push({ tipo: "inicioDaCena", cena: m.cena.id, para: "todas" });
    /* A Fonte de Luz conta uma cena fora de combate (C10). */
    if (m.farol.aceso && tipo !== "combate" && tipo !== "tensao") eventos = eventos.concat(consumirLuz(m, "cena").eventos);
    eventos.push(ev("cenaIniciada", { tipo: tipo, n: m.cena.n }));
    return { ok: true, momentos: momentos, eventos: eventos };
  }

  function encerrarCena(m) {
    if (!m.cena) return { ok: false, momentos: [], eventos: [] };
    var eventos = [ev("cenaEncerrada", { tipo: m.cena.tipo })];
    Object.keys(m.encontro.protecoes).forEach(function (k) { K.fimDaCena(m.encontro.protecoes[k]); });
    m.encontro.analisados = {};
    m.encontro.ameacas.forEach(function (a) {
      a.beneficios = a.beneficios.filter(function (b) { return b.ate !== "fimDaCena"; });
      eventos = eventos.concat(AM.fimDaCena(a).eventos);
    });
    var tipo = m.cena.tipo;
    m.cena = null;
    return { ok: true, momentos: [{ tipo: "fimDaCena", cenaTipo: tipo, para: "todas" }], eventos: eventos };
  }

  function atual(m) { return m.cena && m.cena.ordem.length ? m.cena.ordem[m.cena.turno] || null : null; }

  /* O turno de quem está na vez termina; o próximo começa. Virando a
     rodada, o fim da rodada acontece ANTES do primeiro turno da nova.
     Devolve os momentos (fimDoTurno de uma Persona, fimDaRodada,
     início de turno para a Proteção). */
  function avancarTurno(m, rolador) {
    if (!m.cena || !m.cena.ordem.length) return { ok: false, motivo: "Sem Ordem de Ação nesta cena." };
    var momentos = [];
    var eventos = [];
    var quem = atual(m);
    if (quem && quem.tipo === "persona") momentos.push({ tipo: "fimDoTurno", persona: quem.ref });
    m.cena.turno++;
    if (m.cena.turno >= m.cena.ordem.length) {
      momentos.push({ tipo: "fimDaRodada", rodada: m.cena.rodada, para: "todas" });
      m.encontro.ameacas.forEach(function (a) { eventos = eventos.concat(AM.fimDaRodada(a, {}).eventos); });
      eventos = eventos.concat(fimDaRodadaDaMesa(m, rolador).eventos);
      m.cena.rodada++;
      m.cena.turno = 0;
      m.cena.ordem.forEach(function (o) { o.agiu = false; });
      eventos.push(ev("novaRodada", { rodada: m.cena.rodada }));
    }
    var proximo = atual(m);
    if (proximo) {
      Object.keys(m.encontro.protecoes).forEach(function (alvo) {
        eventos = eventos.concat(K.inicioDoTurno(m.encontro.protecoes[alvo], proximo.ref, alvo, m.ajustes));
      });
      eventos.push(ev("vez", { ref: proximo.ref, nome: proximo.nome, tipo: proximo.tipo }));
      if (proximo.tipo === "persona") momentos.push({ tipo: "inicioDoTurno", persona: proximo.ref });
    }
    return { ok: true, momentos: momentos, eventos: eventos };
  }

  /* Adiar (p. 117): desce na ordem até o fim da cena. */
  function adiar(m, ref, posicoes) {
    if (!m.cena) return { ok: false };
    var i = m.cena.ordem.findIndex(function (o) { return o.ref === ref; });
    if (i < 0) return { ok: false, motivo: "Não está na Ordem de Ação." };
    var n = Math.max(1, R.inteiro(posicoes, 1, 99, 1));
    var p = m.cena.ordem.splice(i, 1)[0];
    p.adiado = true;
    var destino = Math.min(m.cena.ordem.length, i + n);
    m.cena.ordem.splice(destino, 0, p);
    if (i === m.cena.turno && destino > i) { /* quem estava na vez desceu: a vez passa ao seguinte */ }
    return { ok: true, eventos: [ev("adiou", { ref: ref, para: destino })] };
  }

  /* Cena de Tensão: Personas podem trocar de posição entre si (p. 120). */
  function trocarNaTensao(m, a, b) {
    if (!m.cena || m.cena.tipo !== "tensao") return { ok: false, motivo: "Só numa Cena de Tensão." };
    var o = m.cena.ordem;
    var ia = o.findIndex(function (x) { return x.ref === a; }), ib = o.findIndex(function (x) { return x.ref === b; });
    if (ia < 0 || ib < 0 || o[ia].tipo !== "persona" || o[ib].tipo !== "persona") return { ok: false, motivo: "Escolha duas Personas." };
    var t = o[ia]; o[ia] = o[ib]; o[ib] = t;
    return { ok: true };
  }

  /* Sucessos acumulados numa Cena de Tensão (Extremo vale 2; Escapar
     como Ação Completa dobra — p. 87). */
  function somarNaTensao(m, resultado, completa) {
    if (!m.cena || !m.cena.tensao) return { ok: false };
    var s = K.sucessosDe(resultado) * (completa ? 2 : 1);
    m.cena.tensao.acumulados += s;
    var t = m.cena.tensao;
    return { ok: true, acumulados: t.acumulados, alcancou: t.meta > 0 && t.acumulados >= t.meta };
  }

  function fimDaRodadaDaMesa(m, rolador) {
    var eventos = [];
    if (m.farol.aceso && m.cena && (m.cena.tipo === "combate" || m.cena.tipo === "tensao")) eventos = eventos.concat(consumirLuz(m, "rodada").eventos);
    /* Apagou por falta de combustível: até o fim da próxima rodada para
       reacender; depois disso, a Escuridão (1D6 rodadas). */
    if (m.farol.apagada && m.farol.apagada.graca && !m.farol.aceso) {
      if (m.cena && m.cena.rodada > m.farol.apagada.rodadaApagou) {
        if (rolador) eventos = eventos.concat(escuridao(m, rolador).eventos);
        else eventos.push(ev("escuridaoPendente", { texto: "Role 1D6 para a Escuridão." }));
      }
    } else if (m.farol.apagada && m.farol.apagada.rodadas !== undefined) {
      m.farol.apagada.restam--;
      if (m.farol.apagada.restam <= 0 && !m.farol.aceso) {
        eventos.push(ev("escuridao", { texto: "A luz não voltou: todas as Personas ficam Fora de Ação e morrem (p. 81)." }));
        m.farol.apagada.consumada = true;
      }
    }
    if (m.cena && m.cena.tensao && m.cena.tensao.rodadas) {
      m.cena.tensao.rodadasPassadas = (m.cena.tensao.rodadasPassadas || 0) + 1;
      if (m.cena.tensao.rodadasPassadas >= m.cena.tensao.rodadas) eventos.push(ev("tensaoEsgotada", { meta: m.cena.tensao.meta, acumulados: m.cena.tensao.acumulados, aoAcabar: m.cena.tensao.aoAcabar }));
    }
    return { eventos: eventos };
  }

  /* ---------------------------------------------------------------
     FILEIRAS E ALCANCE (pp. 117–118)
     --------------------------------------------------------------- */

  /* Posição do alvo na fileira DELE, contando as casas que cada um
     ocupa: a primeira casa ocupada é Adjacente, a segunda Curto…, da
     quinta em diante Absoluto. Não é distância em metros (C9). */
  function casaDoAlvo(m, alvoId, casasDe) {
    var lista = m.fileiras.personas.indexOf(alvoId) >= 0 ? m.fileiras.personas : m.fileiras.ameacas;
    var casa = 0;
    for (var i = 0; i < lista.length; i++) {
      casa += 1;
      if (lista[i] === alvoId) return casa;
      casa += Math.max(1, R.inteiro(casasDe ? casasDe(lista[i]) : 1, 1, 9, 1)) - 1;
    }
    return 0;
  }
  function alcanceDe(casa) {
    if (casa <= 0) return null;
    return C.ALCANCES[Math.min(5, casa) - 1];
  }
  function noAlcance(m, alvoId, alcanceChave, casasDe) {
    var casa = casaDoAlvo(m, alvoId, casasDe);
    var max = C.alcance[alcanceChave] ? C.alcance[alcanceChave].casa : 1;
    return { ok: casa > 0 && (max >= 5 || casa <= max), casa: casa, alcance: alcanceDe(casa) };
  }
  function adjacentesNaFileira(m, personaId) {
    var l = m.fileiras.personas, i = l.indexOf(personaId);
    if (i < 0) return [];
    return [l[i - 1], l[i + 1]].filter(Boolean);
  }
  function moverNaFileira(m, ref, novaPosicao) {
    var lista = m.fileiras.personas.indexOf(ref) >= 0 ? m.fileiras.personas : m.fileiras.ameacas;
    var i = lista.indexOf(ref);
    if (i < 0) return { ok: false };
    lista.splice(i, 1);
    lista.splice(Math.max(0, Math.min(lista.length, R.inteiro(novaPosicao, 0, 99, 0))), 0, ref);
    return { ok: true, eventos: problemasDoFarol(m).map(function (p) { return ev("farolProblema", p); }) };
  }

  /* Escudo Humano (p. 59): quem está ATRÁS de uma Quem Protege com a
     habilidade recebe metade da Carne dela em Proteção — enquanto ela
     não estiver No Chão. fichas: { id: blocoOblivio }. */
  function bonusDeGrupo(m, fichas, personaId) {
    var bonus = [];
    var l = m.fileiras.personas;
    var i = l.indexOf(personaId);
    if (i < 0) return bonus;
    for (var j = 0; j < i; j++) {
      var o = fichas[l[j]];
      if (!o || !R.temHabilidade(o, "escudoHumano") || R.estadoDaPersona(o) !== "ativa") continue;
      if (R.temMazela(o, "noChao")) continue;
      bonus.push({ fonte: "Escudo Humano", valor: R.metade(R.atributosEfetivos(o).carne), de: l[j] });
      break;
    }
    return bonus;
  }

  /* Repartir a Dor: quem pode dividir o dano que esta Persona sofreu. */
  function podeRepartirADor(m, fichas, personaId) {
    var l = m.fileiras.personas, i = l.indexOf(personaId);
    for (var j = 0; j < i; j++) {
      var o = fichas[l[j]];
      if (o && R.temHabilidade(o, "escudoHumano") && R.temHabilidade(o, "repartirADor") && R.estadoDaPersona(o) === "ativa" && !R.temMazela(o, "noChao")) return l[j];
    }
    return "";
  }

  /* ---------------------------------------------------------------
     FAROL E ESCURIDÃO (pp. 80–81)
     --------------------------------------------------------------- */

  function definirFarol(m, personaId, itemId) {
    m.farol.persona = personaId; m.farol.item = itemId || "";
    return { ok: true, eventos: problemasDoFarol(m).map(function (p) { return ev("farolProblema", p); }) };
  }

  /* Acender com uma Fonte de Luz (1 cena ou 6 rodadas; metade no Buraco
     Escuro). */
  function acender(m, opcoes) {
    var op = opcoes || {};
    var mult = op.efetividade ? 2 : 1;
    var esc = m.buraco && m.buraco.regras && m.buraco.regras.luz ? m.buraco.regras.luz : 1;
    /* Uma medida só: 6 rodadas = 1 cena (p. 80). Fora de combate, cada
       cena nova gasta 6. */
    m.farol.aceso = true; m.farol.derrubado = false; m.farol.apagada = null;
    m.farol.rodadas = Math.max(1, Math.floor(6 * mult * esc));
    m.farol.cenas = Math.floor(m.farol.rodadas / 6);
    return { ok: true, eventos: [ev("luzAcesa", { rodadas: m.farol.rodadas })] };
  }

  /* Abastecer (Combustível): +1 cena ou +6 rodadas. Quem não é o Farol
     precisa estar adjacente e gasta Movimento + Regular. */
  function abastecer(m, quemId, opcoes) {
    var op = opcoes || {};
    if (quemId !== m.farol.persona && adjacentesNaFileira(m, m.farol.persona).indexOf(quemId) < 0) return { ok: false, motivo: "Para abastecer, fique adjacente ao Farol." };
    var mult = op.efetividade ? 2 : 1;
    var esc = m.buraco && m.buraco.regras && m.buraco.regras.luz ? m.buraco.regras.luz : 1;
    var eraApagada = !m.farol.aceso;
    if (eraApagada) return acender(m, op);
    m.farol.rodadas += Math.floor(6 * mult * esc);
    m.farol.cenas = Math.floor(m.farol.rodadas / 6);
    return { ok: true, acoes: quemId === m.farol.persona ? ["regular"] : ["movimento", "regular"], eventos: [ev("luzAbastecida", { rodadas: m.farol.rodadas })] };
  }

  function consumirLuz(m, unidade) {
    var eventos = [];
    if (!m.farol.aceso) return { eventos: eventos };
    m.farol.rodadas = Math.max(0, m.farol.rodadas - (unidade === "rodada" ? 1 : 6));
    m.farol.cenas = Math.floor(m.farol.rodadas / 6);
    if (m.farol.rodadas <= 0) {
      m.farol.aceso = false;
      /* Apagou: até o fim da próxima rodada para reacender (p. 80). */
      m.farol.apagada = { motivo: "combustivel", graca: true, rodadaApagou: m.cena ? m.cena.rodada : 0 };
      eventos.push(ev("luzApagando", { texto: "A chama apagou: reacendam até o fim da próxima rodada." }));
    }
    return { eventos: eventos };
  }

  /* A luz apagou de vez: Cena de Tensão e 1D6 (1–3: 1 rodada; 4–6: 2). */
  function escuridao(m, rolador) {
    var d = rolador(6);
    var rodadas = d <= 3 ? 1 : 2;
    m.farol.aceso = false;
    m.farol.apagada = { motivo: "apagou", d6: d, rodadas: rodadas, restam: rodadas };
    var r = m.cena && (m.cena.tipo === "tensao" || m.cena.tipo === "combate") ? { ok: true, momentos: [], eventos: [] } : iniciarCena(m, "tensao", [], { rodadas: rodadas, motivo: "Escuridão" });
    return { ok: true, d6: d, rodadas: rodadas, momentos: r.momentos, eventos: (r.eventos || []).concat([ev("escuridaoIminente", { rodadas: rodadas, d6: d })]) };
  }

  /* Derrubada (sem região livre, efeito): Cena de Tensão até o próximo
     turno de quem a derrubou para alguém pegar. */
  function derrubarLuz(m, quem) {
    m.farol.derrubado = true; m.farol.derrubadaPor = quem || "";
    return { ok: true, eventos: [ev("luzDerrubada", { ate: "próximo turno de " + (quem || "quem derrubou") })] };
  }
  function pegarLuz(m, quemId, mesmaZona) {
    if (!m.farol.derrubado) return { ok: false, motivo: "A luz não está no chão." };
    m.farol.derrubado = false; m.farol.persona = quemId;
    return { ok: true, acoes: mesmaZona ? ["movimento|regular"] : ["movimento", "regular"], eventos: [ev("luzRecuperada", { por: quemId })] };
  }

  /* Problemas do Farol (p. 80): extremidades da fileira deixam a Persona
     da ponta oposta No Escuro; Farol sem região livre derruba a luz. */
  function problemasDoFarol(m, fichas, luzesAcesas) {
    var p = [];
    var l = m.fileiras.personas;
    var f = m.farol.persona;
    if (!f) { p.push({ chave: "semFarol", texto: "O grupo não elegeu um Farol." }); return p; }
    var i = l.indexOf(f);
    if (l.length >= 2 && i === 0) p.push({ chave: "extremidade", noEscuro: l[l.length - 1], texto: "O Farol está no início da fileira: a última Persona fica No Escuro." });
    if (l.length >= 2 && i === l.length - 1) p.push({ chave: "extremidade", noEscuro: l[0], texto: "O Farol está no fim da fileira: a primeira Persona fica No Escuro." });
    if (l.length === 2) p.push({ chave: "doisNaFileira", texto: "Com duas Personas, o Farol sempre fica numa ponta." });
    if (fichas && fichas[f]) {
      var o = fichas[f];
      var livres = R.regioesPresentes(o).filter(function (r) { return !R.esgotada(r); });
      if (!livres.length) p.push({ chave: "semRegiao", texto: "O Farol não tem região livre para carregar a luz: ela é derrubada." });
    }
    if ((luzesAcesas || 0) > 1) p.push({ chave: "duasLuzes", gatilho: true, texto: "Mais de uma fonte de luz acesa no grupo atrai a atenção do Oblívio — a Testemunha decide a consequência." });
    if (m.farol.derrubado) p.push({ chave: "derrubada", texto: "A luz está no chão." });
    return p;
  }

  /* ---------------------------------------------------------------
     ENCONTRO — instâncias e Proteção dos alvos
     --------------------------------------------------------------- */

  function adicionarAmeaca(m, chave, rolador, opcoes) {
    var inst = AM.criarInstancia(chave, rolador, opcoes);
    if (!inst) return { ok: false, motivo: "Ameaça desconhecida." };
    m.encontro.ameacas.push(inst);
    m.fileiras.ameacas.push(inst.id);
    m.encontro.protecoes[inst.id] = K.novoEstadoDeProtecao(AM.protecaoCompleta(inst, { personasNaCena: m.fileiras.personas.length, ajustes: m.ajustes }).total);
    return { ok: true, ameaca: inst, eventos: [ev("ameacaEntrou", { nome: inst.nome, id: inst.id })] };
  }

  function instancia(m, id) { return m.encontro.ameacas.filter(function (a) { return a.id === id; })[0] || null; }

  /* O estado de Proteção de um alvo, criado com a completa atual. */
  function protecaoDoAlvo(m, alvoId, completa) {
    var p = m.encontro.protecoes[alvoId];
    if (!p) { p = K.novoEstadoDeProtecao(completa); m.encontro.protecoes[alvoId] = p; }
    else if (completa !== undefined && completa !== p.completa) K.atualizarCompleta(p, completa);
    return p;
  }

  /* Escapar (p. 87): sucessos ≥ Grau da Ameaça; várias, a maior + o
     número de Ameaças em combate. */
  function sucessosParaEscapar(m) {
    var ativas = m.encontro.ameacas.filter(function (a) { return a.estado === "ativa"; });
    if (!ativas.length) return 0;
    var maior = ativas.reduce(function (s, a) { return Math.max(s, a.grau); }, 0);
    return ativas.length === 1 ? maior : maior + ativas.length;
  }

  /* ---------------------------------------------------------------
     DESCANSO PERIGOSO (p. 119)
     --------------------------------------------------------------- */

  /* 1D6: 5–6 nada; 1–4 um Encontro e metade da cura. Cada sucesso de
     vigília (Extremo = 2) tira 1 da chance. */
  function descansoPerigoso(rolador, sucessosDeVigilia) {
    var d = rolador(6);
    var limite = Math.max(0, 4 - R.inteiro(sucessosDeVigilia, 0, 9, 0));
    var encontro = d <= limite;
    return { d6: d, limite: limite, encontro: encontro };
  }

  /* ---------------------------------------------------------------
     VISTA DOS JOGADORES — sem o que é da Testemunha
     --------------------------------------------------------------- */

  function vistaDosJogadores(m) {
    var v = R.copiar(m);
    v.registro = v.registro.filter(function (r) { return !r.privado; });
    v.encontro.ameacas = v.encontro.ameacas.map(function (a) {
      return { id: a.id, chave: a.chave, nome: a.nome, grau: a.grau, estado: a.estado, casas: a.casas,
        /* O que se vê em jogo: quanto já apanhou, não a ficha. */
        ferida: a.limite ? Math.round(100 * a.estresse / a.limite) : 0, regioes: a.regioes.length };
    });
    if (v.buraco && global.RAMAOblivioMotorBuraco) v.buraco = global.RAMAOblivioMotorBuraco.vistaDosJogadores(v.buraco);
    delete v.operacoes;
    return v;
  }

  function aplicarOperacao(m, opId, fn) {
    var id = String(opId || "").slice(0, 120);
    if (!id) return { ok: false, motivo: "Operação sem identificação." };
    if (m.operacoes.indexOf(id) >= 0) return { ok: true, repetida: true, eventos: [], momentos: [] };
    var r = fn(m) || { ok: true };
    if (r.ok !== false) { m.operacoes.push(id); if (m.operacoes.length > 300) m.operacoes = m.operacoes.slice(-300); }
    return r;
  }

  global.RAMAOblivioMesa = {
    estadoVazio: estadoVazio, normalizar: normalizar, registrar: registrar,
    iniciarMissao: iniciarMissao, registrarMorte: registrarMorte, concluirMissao: concluirMissao,
    ordemDeAcao: ordemDeAcao, iniciarCena: iniciarCena, encerrarCena: encerrarCena, atual: atual,
    avancarTurno: avancarTurno, adiar: adiar, trocarNaTensao: trocarNaTensao, somarNaTensao: somarNaTensao,
    casaDoAlvo: casaDoAlvo, alcanceDe: alcanceDe, noAlcance: noAlcance, adjacentesNaFileira: adjacentesNaFileira,
    moverNaFileira: moverNaFileira, bonusDeGrupo: bonusDeGrupo, podeRepartirADor: podeRepartirADor,
    definirFarol: definirFarol, acender: acender, abastecer: abastecer, consumirLuz: consumirLuz,
    escuridao: escuridao, derrubarLuz: derrubarLuz, pegarLuz: pegarLuz, problemasDoFarol: problemasDoFarol,
    adicionarAmeaca: adicionarAmeaca, instancia: instancia, protecaoDoAlvo: protecaoDoAlvo,
    sucessosParaEscapar: sucessosParaEscapar, descansoPerigoso: descansoPerigoso,
    vistaDosJogadores: vistaDosJogadores, aplicarOperacao: aplicarOperacao,
  };
})(typeof window !== "undefined" ? window : globalThis);
