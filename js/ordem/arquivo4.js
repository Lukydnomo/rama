/* =====================================================================
   R.A.M.A. — Ordem Paranormal · estados do Arquivos Secretos 4
   =====================================================================
   O que o Arquivos Secretos 4 (v1.0) guarda numa ficha, e a regra de
   cada coisa — sem tela e sem rede. A ficha desenha (js/paginas/
   ficha-arquivo4.js); as contas (js/ordem/regras.js) perguntam daqui.

     influencer    Registrar o Paranormal: o que foi registrado (criatura
                   ou ritual), a cena do último registro e o ritual
                   memorizado no interlúdio (válido até o próximo)
     cacador       Quem Não Arrisca: o +1d20 guardado depois de uma falha
     exercicios    Treinamento Militarizado: os bônus de +1d8 guardados
                   (até o Vigor, até o fim da missão)
     analises      Análise Conturbada: quem aceitou e quanto rolou
     profissao     Profissão Perigo: a missão em que foi usada
     explorador    Explorador da Névoa: o estado da Membrana na cena
     sinestesia    Sinestesia Paranormal: os pares de perícias trocados
     terrores      Terrores Noturnos: o 1d100 do interlúdio e o poder ou
                   ritual de uso único
     gororoba, ruido, olhada   o uso por interlúdio ou por cena
     foco          Foco Gravitacional: os itens (ids do inventário)
     sobrepor      Sobrepor Imprevisível: as rolagens de iniciativa
     granadeiro    as missões em que os explosivos autorais foram dados
     backup        o chamariz do ritual Backup (efeito, não outra ficha)
     explosoes     o registro dos explosivos usados (com id: recarregar
                   ou clicar de novo não registra duas vezes)
     timers        granadas Programadas, contadas em turnos do jogo

   Tempo é sempre o do JOGO: cena e interlúdio da ficha (Condições), e
   missão e dia da cronologia da campanha (Arquivos Secretos 3) — nunca
   o relógio do computador.

   NADA AQUI ROLA DADO SOZINHO. Quem rola é a tela, por clique, e passa o
   resultado.
   ===================================================================== */

(function (global) {
  "use strict";

  var ID = /^[A-Za-z0-9_.:|#-]{1,80}$/;
  var MAX = 40;

  function uuid() {
    var U = global.RAMAUtil;
    return U && U.uuid ? U.uuid() : "a" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  function agora() { return new Date().toISOString(); }
  function texto(v, n) { return String(v === undefined || v === null ? "" : v).replace(/[\u0000-\u001F]/g, " ").slice(0, n || 120); }
  function inteiro(v, min, max, padrao) {
    var n = Math.round(Number(v));
    if (!isFinite(n)) return padrao;
    return Math.max(min, Math.min(max, n));
  }
  function idOk(v) { var s = String(v || ""); return ID.test(s) ? s : ""; }
  function carimbo(v) {
    if (typeof v !== "string" || !v) return "";
    return isNaN(new Date(v).getTime()) ? "" : v.slice(0, 40);
  }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function novoId(prefixo) { return prefixo + "-" + String(uuid()).replace(/[^A-Za-z0-9]/g, "").slice(0, 24); }

  function A3() { return global.RAMAOrdemArquivo3 || null; }
  function E() { return global.RAMAOrdemProgressao || null; }

  /* Os poderes da ficha (progressão): só as aquisições válidas. */
  function aquisicoes(ordem, chave) {
    var est = E() && ordem ? E().estado(ordem, null) : null;
    return est ? est.adquiridos.filter(function (a) { return a.chave === chave && a.valido !== false; }) : [];
  }
  function temPoder(ordem, chave) { return aquisicoes(ordem, chave).length > 0; }
  function comAfinidade(ordem, chave) { return aquisicoes(ordem, chave).some(function (a) { return a.afinidade; }); }

  /* =================================================================
     O TEMPO DO JOGO
     ================================================================= */

  function cenaDe(ordem) {
    return (ordem && ordem.condicoes && ordem.condicoes.cena && ordem.condicoes.cena.id) || "inicial";
  }
  function emInterludio(ordem) {
    return !!(ordem && ordem.condicoes && ordem.condicoes.cena && ordem.condicoes.cena.interludio);
  }
  function interludioDe(ordem) {
    var c = ordem && ordem.condicoes;
    return c && c.interludio && typeof c.interludio.numero === "number" ? c.interludio.numero : 0;
  }
  /* Missão e dia: os contadores da cronologia da campanha (AS3). */
  function cronologia(ordem) {
    var a = A3() && ordem ? A3().dados(ordem).cronologia : null;
    return a || { missao: 0, dia: 0, semana: 0, sessao: 0 };
  }

  /* =================================================================
     ESTADO
     ================================================================= */

  var ESTADOS_DA_MEMBRANA = [
    { chave: "estavel", nome: "Estável", piora: false },
    { chave: "danificada", nome: "Danificada", piora: true },
    { chave: "arruinada", nome: "Arruinada", piora: true },
    { chave: "rompida", nome: "Rompida (ou pior)", piora: true },
  ];
  var MEMBRANA = {};
  ESTADOS_DA_MEMBRANA.forEach(function (m) { MEMBRANA[m.chave] = m; });

  var VERSOES_BACKUP = ["normal", "discente", "verdadeiro"];

  function normalizarRegistro(r) {
    var x = obj(r);
    var id = idOk(x.id);
    var nome = texto(x.nome, 120).trim();
    if (!id || !nome || (x.tipo !== "criatura" && x.tipo !== "ritual")) return null;
    var saida = { id: id, tipo: x.tipo, nome: nome, cena: idOk(x.cena), em: carimbo(x.em) };
    var cat = texto(x.catalogoId, 80);
    if (/^[a-z0-9]+\.[A-Za-z0-9_.-]+$/.test(cat)) saida.catalogoId = cat;
    if (x.tipo === "ritual") saida.circulo = inteiro(x.circulo, 0, 4, 0);
    return saida;
  }

  /* Um ritual guardado (memorizado ou de Terrores Noturnos): o retrato
     que "Usar ritual" precisa, como um ritual de ficha. */
  function normalizarRetratoDeRitual(r) {
    var x = obj(r);
    var nome = texto(x.nome, 120).trim();
    if (!nome) return null;
    var o = obj(x.ordem);
    return {
      nome: nome,
      circulo: texto(x.circulo, 40), elemento: texto(x.elemento, 60),
      execucao: texto(x.execucao, 60), alcance: texto(x.alcance, 60), alvo: texto(x.alvo, 160),
      area: texto(x.area, 160), efeito: texto(x.efeito, 160), duracao: texto(x.duracao, 80), resistencia: texto(x.resistencia, 160),
      descricao: texto(x.descricao, 2000),
      origemCatalogoId: /^[a-z0-9]+\.ritual\.[a-z0-9-]+$/.test(String(x.origemCatalogoId || "")) ? x.origemCatalogoId : "",
      ordem: {
        elemento: texto(o.elemento, 20), circulo: inteiro(o.circulo, 1, 4, 1),
        custo: o.custo === undefined || o.custo === null ? undefined : inteiro(o.custo, 0, 99, 0),
        referencia: o.referencia && typeof o.referencia === "object" ? { fonte: texto(o.referencia.fonte, 10), pagina: inteiro(o.referencia.pagina, 0, 999, 0) } : undefined,
      },
      versoes: lista(x.versoes).slice(0, 4).map(function (v) {
        var vv = obj(v);
        var saida = { nome: texto(vv.nome, 40) || "Normal" };
        if (vv.custo) saida.custo = inteiro(vv.custo, 0, 30, 0);
        if (vv.requisito) saida.requisito = texto(vv.requisito, 80);
        if (vv.alteracoes) saida.alteracoes = texto(vv.alteracoes, 1000);
        if (vv.dano) saida.dano = texto(vv.dano, 40);
        if (Array.isArray(vv.rolagens)) saida.rolagens = vv.rolagens.slice(0, 4).map(function (rr) {
          var q = obj(rr);
          return { tipo: ["dano", "cura", "outra"].indexOf(q.tipo) >= 0 ? q.tipo : "outra", rotulo: texto(q.rotulo, 80), expressao: texto(q.expressao, 40), extra: texto(q.extra, 40) };
        });
        return saida;
      }),
    };
  }

  function normalizar(ordem, b) {
    var x = obj(b && b.arquivo4);
    var inf = obj(x.influencer);
    var mem = inf.memorizado && typeof inf.memorizado === "object" ? inf.memorizado : null;
    var ca = obj(x.cacador);
    var ex = obj(x.exercicios);
    var pp = obj(x.profissao);
    var ep = x.explorador && typeof x.explorador === "object" ? x.explorador : null;
    var si = obj(x.sinestesia);
    var te = x.terrores && typeof x.terrores === "object" ? x.terrores : null;
    var fo = obj(x.foco);
    var gr = obj(x.granadeiro);
    var bk = x.backup && typeof x.backup === "object" ? x.backup : null;
    var vistos = {};
    function unico(v) { if (!v || vistos[v.id]) return false; vistos[v.id] = true; return true; }

    var paresOk = lista(si.pares).map(function (p) {
      var a = lista(p);
      var p1 = texto(a[0], 30), p2 = texto(a[1], 30);
      return /^[a-z]{2,30}$/.test(p1) && /^[a-z]{2,30}$/.test(p2) && p1 !== p2 ? [p1, p2] : null;
    }).filter(Boolean).slice(0, 2);

    ordem.arquivo4 = {
      influencer: {
        registros: lista(inf.registros).map(normalizarRegistro).filter(unico).slice(-MAX),
        cena: idOk(inf.cena),
        memorizado: mem && normalizarRetratoDeRitual(mem.ritual) ? {
          registroId: idOk(mem.registroId), interludio: inteiro(mem.interludio, 0, 99999, 0),
          ritual: normalizarRetratoDeRitual(mem.ritual), em: carimbo(mem.em),
        } : null,
      },
      cacador: { pendente: ca.pendente === true, cena: idOk(ca.cena), em: carimbo(ca.em) },
      exercicios: {
        bonus: inteiro(ex.bonus, 0, 10, 0),
        missao: inteiro(ex.missao, -1, 99999, -1),
        rolagens: lista(ex.rolagens).map(idOk).filter(Boolean).slice(-60),
      },
      analises: lista(x.analises).map(function (a) {
        var aa = obj(a);
        var aid = idOk(aa.id);
        if (!aid) return null;
        return {
          id: aid, cena: idOk(aa.cena), em: carimbo(aa.em),
          participantes: lista(aa.participantes).map(function (p) {
            var pp2 = obj(p);
            var nome = texto(pp2.nome, 80).trim();
            return nome ? { nome: nome, valor: inteiro(pp2.valor, 1, 6, 1), voce: pp2.voce === true } : null;
          }).filter(Boolean).slice(0, 12),
        };
      }).filter(Boolean).slice(-20),
      profissao: { missao: inteiro(pp.missao, -1, 99999, -1), de: texto(pp.de, 80), para: texto(pp.para, 80), em: carimbo(pp.em) },
      explorador: ep ? { cena: idOk(ep.cena), membrana: MEMBRANA[ep.membrana] ? ep.membrana : "estavel", reduz: ep.reduz === true, em: carimbo(ep.em) } : null,
      sinestesia: {
        ativa: si.ativa === true && paresOk.length === 2,
        pares: paresOk,
        dia: inteiro(si.dia, -1, 99999, -1),
        san: inteiro(si.san, 0, 6, 0),
        em: carimbo(si.em),
      },
      terrores: te ? {
        interludio: inteiro(te.interludio, 0, 99999, 0),
        d100: inteiro(te.d100, 1, 100, 100),
        pesadelo: te.pesadelo === true,
        san: inteiro(te.san, 0, 4, 0),
        escolha: te.escolha && typeof te.escolha === "object" && texto(te.escolha.nome, 120).trim() ? {
          tipo: te.escolha.tipo === "ritual" ? "ritual" : "poder",
          chave: texto(te.escolha.chave, 80),
          nome: texto(te.escolha.nome, 120).trim(),
          ritual: te.escolha.tipo === "ritual" ? normalizarRetratoDeRitual(te.escolha.ritual) : null,
        } : null,
        usado: te.usado === true,
        em: carimbo(te.em),
      } : null,
      gororoba: { interludio: inteiro(obj(x.gororoba).interludio, -1, 99999, -1) },
      ruido: { cena: idOk(obj(x.ruido).cena) },
      olhada: { cena: idOk(obj(x.olhada).cena) },
      foco: { itens: lista(fo.itens).map(idOk).filter(Boolean).filter(function (v, i, l) { return l.indexOf(v) === i; }).slice(0, 3) },
      sobrepor: lista(x.sobrepor).map(function (s) {
        var ss = obj(s);
        var sid = idOk(ss.id);
        if (!sid) return null;
        return {
          id: sid, cena: idOk(ss.cena), em: carimbo(ss.em),
          dados: lista(ss.dados).map(function (d) { return inteiro(d, 1, 20, 1); }).slice(0, 2),
          escolhido: inteiro(ss.escolhido, 1, 20, 1),
          iniciativaAntes: inteiro(ss.iniciativaAntes, -99, 999, 0),
          iniciativaDepois: inteiro(ss.iniciativaDepois, -99, 999, 0),
        };
      }).filter(Boolean).slice(-20),
      granadeiro: { missoes: lista(gr.missoes).map(function (m) { return inteiro(m, 0, 99999, 0); }).filter(function (v, i, l) { return l.indexOf(v) === i; }).slice(-20) },
      backup: bk && VERSOES_BACKUP.indexOf(bk.versao) >= 0 ? {
        ativo: bk.ativo === true,
        versao: bk.versao,
        frase: texto(bk.frase, 200),
        aparencia: texto(bk.aparencia, 200),
        dia: inteiro(bk.dia, 0, 99999, 0),
        sentidos: bk.sentidos === true,
        efeitos: lista(bk.efeitos).map(idOk).filter(Boolean).slice(0, 6),
        criadoEm: carimbo(bk.criadoEm),
        historico: lista(bk.historico).map(function (h) {
          var hh = obj(h);
          var t = texto(hh.texto, 300).trim();
          return t ? { texto: t, em: carimbo(hh.em) } : null;
        }).filter(Boolean).slice(-20),
      } : null,
      explosoes: lista(x.explosoes).map(function (e) {
        var ee = obj(e);
        var eid = idOk(ee.id);
        var t = texto(ee.texto, 600).trim();
        return eid && t ? { id: eid, texto: t, em: carimbo(ee.em) } : null;
      }).filter(unico).slice(-30),
      timers: lista(x.timers).map(function (t) {
        var tt = obj(t);
        var tid = idOk(tt.id);
        var nome = texto(tt.nome, 120).trim();
        if (!tid || !nome) return null;
        var turnos = inteiro(tt.turnos, 1, 99, 1);
        return { id: tid, nome: nome, turnos: turnos, restantes: inteiro(tt.restantes, 0, turnos, turnos),
          resolvido: tt.resolvido === true, nota: texto(tt.nota, 300), em: carimbo(tt.em) };
      }).filter(Boolean).slice(-10),
    };
    return ordem;
  }

  function vazio() { return normalizar({}, {}).arquivo4; }

  function dados(ordem) {
    if (!ordem.arquivo4) normalizar(ordem, {});
    return ordem.arquivo4;
  }

  /* Os campos do AS4 num ITEM do inventário (chamado por
     js/ordem/inventario.js). Cada um só existe quando vale. */
  function normalizarDadosDoItem(dados, b, tipo) {
    if (b.modeloGranada === "40mm") dados.modeloGranada = "40mm";
    if (b.foraDoLimite === true) dados.foraDoLimite = true;
    if (b.autoral && typeof b.autoral === "object") {
      var au = b.autoral;
      var autor = texto(au.autor, 80).trim();
      if (autor) {
        dados.autoral = { autor: autor };
        if (idOk(au.autorId)) dados.autoral.autorId = idOk(au.autorId);
        if (au.apressado === true) dados.autoral.apressado = true;
        if (au.missao !== undefined) dados.autoral.missao = inteiro(au.missao, 0, 99999, 0);
      }
    }
    if (tipo === "arma" && b.lancador && typeof b.lancador === "object") {
      var cap = inteiro(b.lancador.capacidade, 1, 12, 6);
      dados.lancador = {
        capacidade: cap,
        carregadas: lista(b.lancador.carregadas).map(function (g) {
          var gg = obj(g);
          var gid = idOk(gg.id);
          var nome = texto(gg.nome, 80).trim();
          if (!gid || !nome) return null;
          var saida = { id: gid, nome: nome };
          var cat = texto(gg.origemCatalogoId, 80);
          if (/^[a-z0-9]+\.[A-Za-z0-9_.-]+$/.test(cat)) saida.origemCatalogoId = cat;
          if (gg.espacos !== undefined) saida.espacos = Math.max(0, Math.min(10, Number(gg.espacos) || 0));
          var I = global.RAMAOrdemInventario;
          var mods = lista(gg.modificacoes).map(I && I.modificacaoValida ? I.modificacaoValida : function (m) { return m; }).filter(Boolean).slice(0, 6);
          if (mods.length) saida.modificacoes = mods;
          if (gg.autoral && typeof gg.autoral === "object" && texto(gg.autoral.autor, 80).trim()) {
            saida.autoral = { autor: texto(gg.autoral.autor, 80).trim() };
            if (idOk(gg.autoral.autorId)) saida.autoral.autorId = idOk(gg.autoral.autorId);
            if (gg.autoral.apressado === true) saida.autoral.apressado = true;
          }
          return saida;
        }).filter(Boolean).slice(0, cap),
      };
    }
    if (b.quaseNovo && typeof b.quaseNovo === "object") {
      dados.quaseNovo = { pvExtra: inteiro(b.quaseNovo.pvExtra, 0, 99, 10), interludio: inteiro(b.quaseNovo.interludio, 0, 99999, 0) };
    }
    return dados;
  }

  /* =================================================================
     INFLUENCER PARANORMAL (p. 64)
     ================================================================= */

  /* O círculo que o NEX deixa memorizar: 1º a partir de 5%, 2º de 25%,
     3º de 55%, 4º de 85%. */
  function circuloMaximoPorNex(nex) {
    var n = Number(nex) || 0;
    return n >= 85 ? 4 : n >= 55 ? 3 : n >= 25 ? 2 : n >= 5 ? 1 : 0;
  }

  function registrarParanormal(ordem, registro) {
    var a = dados(ordem).influencer;
    var cena = cenaDe(ordem);
    if (a.cena === cena) return { ok: false, motivo: "Uma vez por cena — já registrou algo nesta cena." };
    var r = normalizarRegistro(Object.assign({ id: novoId("reg"), cena: cena, em: agora() }, registro || {}));
    if (!r) return { ok: false, motivo: "Diga o que foi registrado: uma criatura paranormal ou um ritual conjurado nesta cena." };
    a.registros.push(r);
    if (a.registros.length > MAX) a.registros = a.registros.slice(-MAX);
    a.cena = cena;
    return { ok: true, registro: r };
  }

  function criaturasRegistradas(ordem) {
    return dados(ordem).influencer.registros.filter(function (r) { return r.tipo === "criatura"; });
  }

  function memorizar(ordem, registroId, retrato, nex) {
    var a = dados(ordem).influencer;
    if (!emInterludio(ordem)) return { ok: false, motivo: "A memorização é uma ação de interlúdio: comece um em Condições → Novo interlúdio." };
    var reg = a.registros.filter(function (r) { return r.id === registroId && r.tipo === "ritual"; })[0];
    if (!reg) return { ok: false, motivo: "Só um ritual registrado pode ser memorizado." };
    var r = normalizarRetratoDeRitual(retrato);
    if (!r) return { ok: false, motivo: "O ritual registrado precisa estar na biblioteca para ser conjurado." };
    var maximo = circuloMaximoPorNex(nex);
    if (r.ordem.circulo > maximo) {
      return { ok: false, motivo: maximo ? "Com o seu NEX, só até o " + maximo + "º círculo (1º a partir de 5%, 2º de 25%, 3º de 55%, 4º de 85%)." : "Com NEX abaixo de 5%, nenhum ritual pode ser memorizado." };
    }
    a.memorizado = { registroId: reg.id, interludio: interludioDe(ordem), ritual: r, em: agora() };
    return { ok: true };
  }

  /* Vale até a próxima cena de interlúdio: o interlúdio em que foi
     memorizado e o que vem depois dele, até um novo interlúdio começar. */
  function memorizadoValendo(ordem) {
    var m = dados(ordem).influencer.memorizado;
    return m && m.interludio === interludioDe(ordem) ? m : null;
  }

  /* =================================================================
     CAÇADOR DE RECOMPENSAS (p. 64)
     ================================================================= */

  function marcarFalhaDoCacador(ordem) {
    var c = dados(ordem).cacador;
    var cena = cenaDe(ordem);
    var jaTinha = c.pendente && c.cena === cena;
    c.pendente = true;
    c.cena = cena;
    c.em = agora();
    return { ok: true, jaTinha: jaTinha };
  }
  function bonusDoCacador(ordem) {
    var c = dados(ordem).cacador;
    return !!(c.pendente && c.cena === cenaDe(ordem));
  }
  function consumirCacador(ordem) {
    if (!bonusDoCacador(ordem)) return { ok: false, motivo: "Não há +1d20 guardado nesta cena (o bônus termina no fim da cena)." };
    var c = dados(ordem).cacador;
    c.pendente = false;
    return { ok: true };
  }

  /* =================================================================
     TREINAMENTO MILITARIZADO (p. 65) — exercitar-se (OPRPG p. 93)
     ================================================================= */

  function bonusDeExercicio(ordem) {
    var e = dados(ordem).exercicios;
    return e.missao === cronologia(ordem).missao ? e.bonus : 0;
  }
  function exercitar(ordem, vigor) {
    if (!emInterludio(ordem)) return { ok: false, motivo: "Exercitar-se é uma ação de interlúdio: comece um em Condições → Novo interlúdio." };
    var e = dados(ordem).exercicios;
    var missao = cronologia(ordem).missao;
    if (e.missao !== missao) { e.bonus = 0; e.missao = missao; }
    var maximo = Math.max(0, Number(vigor) || 0);
    if (e.bonus >= maximo) return { ok: false, motivo: "Você já acumula " + e.bonus + " bônus de exercício — o máximo é o seu Vigor (" + maximo + ")." };
    e.bonus += 1;
    return { ok: true, bonus: e.bonus };
  }
  /* Um bônus por rolagem: o id da rolagem fica guardado. */
  function usarExercicio(ordem, rolagemId) {
    var e = dados(ordem).exercicios;
    if (bonusDeExercicio(ordem) <= 0) return { ok: false, motivo: "Sem bônus de exercício guardado nesta missão." };
    var rid = idOk(rolagemId);
    if (rid && e.rolagens.indexOf(rid) >= 0) return { ok: false, motivo: "Só um bônus de exercício por rolagem." };
    e.bonus -= 1;
    if (rid) { e.rolagens.push(rid); if (e.rolagens.length > 60) e.rolagens = e.rolagens.slice(-60); }
    return { ok: true, restam: e.bonus };
  }

  /* =================================================================
     ANÁLISE CONTURBADA (p. 65)
     ================================================================= */

  function registrarAnalise(ordem, participantes) {
    var lista2 = lista(participantes).map(function (p) {
      var nome = texto(p && p.nome, 80).trim();
      return nome ? { nome: nome, valor: inteiro(p.valor, 1, 6, 1), voce: !!(p && p.voce) } : null;
    }).filter(Boolean);
    if (!lista2.length) return { ok: false, motivo: "Ninguém aceitou ouvir a análise." };
    var a = dados(ordem).analises;
    var reg = { id: novoId("anl"), cena: cenaDe(ordem), em: agora(), participantes: lista2 };
    a.push(reg);
    if (a.length > 20) dados(ordem).analises = a.slice(-20);
    return { ok: true, registro: reg };
  }

  /* =================================================================
     PROFISSÃO PERIGO (p. 65)
     ================================================================= */

  function profissaoDisponivel(ordem) {
    return dados(ordem).profissao.missao !== cronologia(ordem).missao;
  }
  /* Cabe? O novo item não ultrapassa a categoria nem os espaços do
     sacrificado (as categorias e espaços do catálogo, por unidade). */
  function trocaCabe(sacrificado, novo) {
    if (!sacrificado || !novo) return { ok: false, motivo: "Escolha os dois itens." };
    var catVelha = sacrificado.categoria === null || sacrificado.categoria === undefined ? null : Number(sacrificado.categoria);
    var catNova = novo.categoria === null || novo.categoria === undefined ? 0 : Number(novo.categoria);
    if (catVelha === null) return { ok: false, motivo: "O item sacrificado não tem categoria: a ficha não sabe o que cabe no lugar dele." };
    if (catNova > catVelha) return { ok: false, motivo: "O novo item passa da categoria do sacrificado." };
    var espVelho = Number(sacrificado.espacos) || 0;
    var espNovo = novo.espacos === null || novo.espacos === undefined ? 1 : Number(novo.espacos);
    if (espNovo > espVelho) return { ok: false, motivo: "O novo item ocupa mais espaços do que o sacrificado." };
    return { ok: true };
  }
  function registrarProfissao(ordem, de, para) {
    if (!profissaoDisponivel(ordem)) return { ok: false, motivo: "Uma vez por missão — já usada nesta missão." };
    var p = dados(ordem).profissao;
    p.missao = cronologia(ordem).missao;
    p.de = texto(de, 80);
    p.para = texto(para, 80);
    p.em = agora();
    return { ok: true };
  }

  /* =================================================================
     QUASE NOVO (p. 65)
     ================================================================= */

  /* Modificações temporárias (do Quase Novo) cujo interlúdio já passou. */
  function modificacoesVencidas(ordem, item) {
    var atual = interludioDe(ordem);
    var mods = item && item.ordem && Array.isArray(item.ordem.modificacoes) ? item.ordem.modificacoes : [];
    return mods.filter(function (m) { return m && m.temporaria === "interludio" && Number(m.interludio) < atual; });
  }
  function tirarVencidas(ordem, inventario) {
    var tiradas = [];
    lista(inventario && inventario.itens).forEach(function (item) {
      var venc = modificacoesVencidas(ordem, item);
      if (!venc.length) return;
      var ids = venc.map(function (m) { return m.id; });
      item.ordem.modificacoes = item.ordem.modificacoes.filter(function (m) { return ids.indexOf(m.id) < 0; });
      venc.forEach(function (m) { tiradas.push(item.nome + ": " + m.nome); });
    });
    return tiradas;
  }

  /* =================================================================
     EXPLORADOR DA NÉVOA (p. 66)
     ================================================================= */

  function usarExplorador(ordem, membrana) {
    var e = dados(ordem);
    var cena = cenaDe(ordem);
    if (e.explorador && e.explorador.cena === cena) return { ok: false, motivo: "Uma vez por cena — já usado nesta cena." };
    var m = MEMBRANA[membrana];
    if (!m) return { ok: false, motivo: "Escolha o estado da Membrana que o mestre informou." };
    e.explorador = { cena: cena, membrana: m.chave, reduz: m.piora, em: agora() };
    return { ok: true, perdeSan: m.piora ? 1 : 0, reduz: m.piora };
  }
  /* −1 PE em todos os rituais, na cena em que a Membrana estava
     danificada ou pior (o livro não dá duração; ver a nota do poder). */
  function reducaoDoExplorador(ordem) {
    var e = dados(ordem).explorador;
    return e && e.reduz && e.cena === cenaDe(ordem) ? 1 : 0;
  }

  /* =================================================================
     SINESTESIA PARANORMAL (p. 66)
     ================================================================= */

  function sinestesiaDisponivel(ordem) {
    var s = dados(ordem).sinestesia;
    return !s.ativa && s.dia !== cronologia(ordem).dia;
  }
  /* pares: [[a, b], [c, d]] — quatro perícias diferentes. `podeUsar(k)`
     diz se a perícia pode entrar (as que exigem treinamento, só
     treinado). */
  function aceitarSinestesia(ordem, pares, san, podeUsar) {
    var s = dados(ordem).sinestesia;
    if (s.ativa) return { ok: false, motivo: "A sinestesia já está valendo." };
    if (s.dia === cronologia(ordem).dia) return { ok: false, motivo: "Só pode ser aceita de novo no dia seguinte (cronologia da campanha)." };
    var ok = Array.isArray(pares) && pares.length === 2 && pares.every(function (p) { return Array.isArray(p) && p.length === 2 && p[0] && p[1] && p[0] !== p[1]; });
    if (!ok) return { ok: false, motivo: "Escolha dois pares de perícias." };
    var todas = [pares[0][0], pares[0][1], pares[1][0], pares[1][1]];
    if (todas.some(function (k, i) { return todas.indexOf(k) !== i; })) return { ok: false, motivo: "Os dois pares precisam de quatro perícias diferentes." };
    if (podeUsar) {
      var barrada = todas.filter(function (k) { return !podeUsar(k); })[0];
      if (barrada) return { ok: false, motivo: "Não vale em perícia que exige treinamento e você não tem (" + barrada + ")." };
    }
    s.ativa = true;
    s.pares = [pares[0].slice(), pares[1].slice()];
    s.dia = cronologia(ordem).dia;
    s.san = inteiro(san, 0, 6, 0);
    s.em = agora();
    return { ok: true };
  }
  function encerrarSinestesia(ordem) {
    var s = dados(ordem).sinestesia;
    if (!s.ativa) return { ok: false, motivo: "A sinestesia não está valendo." };
    s.ativa = false;
    return { ok: true };
  }
  /* O atributo da perícia `chave` com a sinestesia: o da outra do par.
     `padrao(k)` dá o atributo normal de uma perícia. Sem troca, null. */
  function atributoDaSinestesia(ordem, chave, padrao) {
    var s = ordem && ordem.arquivo4 && ordem.arquivo4.sinestesia;
    if (!s || !s.ativa) return null;
    for (var i = 0; i < s.pares.length; i++) {
      var p = s.pares[i];
      if (p[0] === chave) return padrao(p[1]) || null;
      if (p[1] === chave) return padrao(p[0]) || null;
    }
    return null;
  }

  /* =================================================================
     TERRORES NOTURNOS (p. 66)
     ================================================================= */

  function rolarTerrores(ordem, d100, san) {
    if (!emInterludio(ordem)) return { ok: false, motivo: "É ao dormir numa cena de interlúdio." };
    var e = dados(ordem);
    var n = interludioDe(ordem);
    if (e.terrores && e.terrores.interludio === n) return { ok: false, motivo: "O 1d100 deste interlúdio já foi rolado (dorme-se uma vez por interlúdio)." };
    var v = inteiro(d100, 1, 100, 100);
    var pesadelo = v <= 50;
    e.terrores = { interludio: n, d100: v, pesadelo: pesadelo, san: pesadelo ? inteiro(san, 0, 4, 0) : 0, escolha: null, usado: false, em: agora() };
    return { ok: true, pesadelo: pesadelo };
  }
  function escolherTerror(ordem, escolha) {
    var t = dados(ordem).terrores;
    if (!t || !t.pesadelo || t.interludio !== interludioDe(ordem)) return { ok: false, motivo: "Só nos pesadelos do interlúdio atual." };
    if (t.escolha) return { ok: false, motivo: "A escolha deste pesadelo já foi feita." };
    var tipo = escolha && escolha.tipo === "ritual" ? "ritual" : "poder";
    var nome = texto(escolha && escolha.nome, 120).trim();
    if (!nome) return { ok: false, motivo: "Escolha um poder paranormal ou um ritual." };
    var ritual = tipo === "ritual" ? normalizarRetratoDeRitual(escolha.ritual) : null;
    if (tipo === "ritual" && !ritual) return { ok: false, motivo: "O ritual precisa estar na biblioteca." };
    t.escolha = { tipo: tipo, chave: texto(escolha.chave, 80), nome: nome, ritual: ritual };
    return { ok: true };
  }
  /* Vale do pesadelo até o início da próxima cena de interlúdio. */
  function terrorValendo(ordem) {
    var t = dados(ordem).terrores;
    return t && t.pesadelo && t.escolha && !t.usado && t.interludio === interludioDe(ordem) ? t : null;
  }
  function usarTerror(ordem) {
    var t = terrorValendo(ordem);
    if (!t) return { ok: false, motivo: "Não há uso guardado dos Terrores Noturnos (ou ele já foi gasto)." };
    t.usado = true;
    return { ok: true, escolha: t.escolha };
  }

  /* =================================================================
     GERAIS (p. 66-67)
     ================================================================= */

  function usarGororoba(ordem) {
    if (!emInterludio(ordem)) return { ok: false, motivo: "É numa cena de interlúdio." };
    var g = dados(ordem).gororoba;
    var n = interludioDe(ordem);
    if (g.interludio === n) return { ok: false, motivo: "Uma vez por interlúdio — já usada neste." };
    g.interludio = n;
    return { ok: true };
  }
  function usarRuido(ordem) {
    var r = dados(ordem).ruido;
    var cena = cenaDe(ordem);
    if (r.cena === cena) return { ok: false, motivo: "Uma vez por cena — já usado nesta cena." };
    r.cena = cena;
    return { ok: true };
  }
  function usarOlhada(ordem) {
    var r = dados(ordem).olhada;
    var cena = cenaDe(ordem);
    if (r.cena === cena) return { ok: false, motivo: "Uma vez por cena — a rodada extra desta investigação já foi usada." };
    r.cena = cena;
    return { ok: true };
  }

  /* =================================================================
     FOCO GRAVITACIONAL (p. 67)
     ================================================================= */

  function itensDoFoco(ordem, inventario) {
    var ids = {};
    lista(inventario && inventario.itens).forEach(function (i) { ids[i.id] = true; });
    return dados(ordem).foco.itens.filter(function (id) { return ids[id]; });
  }
  function definirFoco(ordem, ids, maximo) {
    var lim = Math.max(1, Math.min(3, Number(maximo) || 1));
    var limpos = lista(ids).map(idOk).filter(Boolean).filter(function (v, i, l) { return l.indexOf(v) === i; });
    if (limpos.length > lim) return { ok: false, motivo: "Até " + lim + (lim === 1 ? " equipamento." : " equipamentos.") };
    dados(ordem).foco.itens = limpos;
    return { ok: true };
  }
  /* 25%: 1 a 25 em 1d100. */
  function focoVoou(d100) { return Number(d100) >= 1 && Number(d100) <= 25; }

  /* =================================================================
     SOBREPOR IMPREVISÍVEL (p. 67)
     ================================================================= */

  /* Par soma, ímpar subtrai. */
  function deltaDoSobrepor(d20) {
    var n = Number(d20) || 0;
    return n % 2 === 0 ? n : -n;
  }
  function registrarSobrepor(ordem, dadosRolados, escolhido, antes) {
    var lista2 = dados(ordem).sobrepor;
    var depois = (Number(antes) || 0) + deltaDoSobrepor(escolhido);
    var reg = { id: novoId("sob"), cena: cenaDe(ordem), em: agora(), dados: lista(dadosRolados).slice(0, 2),
      escolhido: inteiro(escolhido, 1, 20, 1), iniciativaAntes: Number(antes) || 0, iniciativaDepois: depois };
    lista2.push(reg);
    if (lista2.length > 20) dados(ordem).sobrepor = lista2.slice(-20);
    return { ok: true, registro: reg };
  }

  /* =================================================================
     GRANADEIRO BLASTER E EXPLOSIVOS (p. 69-71)
     ================================================================= */

  /* Meus Bebês: 1 explosivo autoral, +1 em NEX 40%, 65% e 99%. */
  function explosivosDaMissao(nex) {
    var n = Number(nex) || 0;
    return 1 + (n >= 40 ? 1 : 0) + (n >= 65 ? 1 : 0) + (n >= 99 ? 1 : 0);
  }
  function explosivosEntregues(ordem) {
    return dados(ordem).granadeiro.missoes.indexOf(cronologia(ordem).missao) >= 0;
  }
  function marcarEntrega(ordem) {
    if (explosivosEntregues(ordem)) return { ok: false, motivo: "Os explosivos desta missão já foram entregues — nova missão na cronologia da campanha." };
    var g = dados(ordem).granadeiro;
    g.missoes.push(cronologia(ordem).missao);
    if (g.missoes.length > 20) g.missoes = g.missoes.slice(-20);
    return { ok: true };
  }

  /* Dobra os DADOS de uma parte de dano ("8d6 Energia" → "16d6
     Energia"); bônus fixos ficam como estão (Memória Muscular). */
  function dobrarDados(parte) {
    return String(parte || "").replace(/(\d+)d(\d+)/g, function (_, n, f) { return (Number(n) * 2) + "d" + f; });
  }

  /* A medida da área com Fogo Amigo: +6 m no raio, no comprimento do
     cone ou na medida da esfera. */
  function areaDoExplosivo(explosivo, fogoAmigo) {
    var e = explosivo || {};
    var medida = Number(e.medida) || 0;
    var forma = e.forma || "raio";
    var nome = { raio: "raio", cone: "cone", esfera: "esfera de raio" }[forma] || forma;
    return { forma: forma, medida: medida + (fogoAmigo ? 6 : 0), base: medida, texto: nome + " de " + (medida + (fogoAmigo ? 6 : 0)) + " m" + (fogoAmigo ? " (" + medida + " + 6 de Fogo Amigo)" : "") };
  }

  /* A DT de um explosivo seu: 10 + limite de PE + atributo, mais o
     Intelecto de Perito em Explosivos (duas vezes com Fogo Amigo e
     Perito adquirido). DT fixa (o galão vermelho) não muda. */
  function dtDoExplosivo(explosivo, ctx) {
    var e = explosivo || {};
    var c = ctx || {};
    if (!e.dt) return { dt: null, partes: [] };
    if (e.dt.fixa) return { dt: e.dt.fixa, partes: [{ rotulo: "DT impressa", valor: e.dt.fixa }] };
    var partes = [{ rotulo: "Base", valor: 10 }, { rotulo: "Limite de PE", valor: c.passos || 0 }, { rotulo: (e.dt.atributo || "agi").toUpperCase(), valor: c.atributo || 0 }];
    if (c.perito) partes.push({ rotulo: "Perito em Explosivos (Intelecto)" + (c.dobrado ? " ×2 (Fogo Amigo)" : ""), valor: (c.intelecto || 0) * (c.dobrado ? 2 : 1) });
    return { dt: partes.reduce(function (s, p) { return s + p.valor; }, 0), partes: partes };
  }

  function alvosExcluidos(intelecto, perito, dobrado) {
    if (!perito) return 0;
    return (Number(intelecto) || 0) * (dobrado ? 2 : 1);
  }

  /* Ctrl+C Ctrl+V: par gera outra granada; para no primeiro ímpar ou na
     quarta explosão. `d4s` são os d4 rolados depois de cada explosão. */
  function cadeiaCtrlC(d4s) {
    var explosoes = 1;
    var usados = [];
    for (var i = 0; i < lista(d4s).length && explosoes < 4; i++) {
      var v = Number(d4s[i]);
      usados.push(v);
      if (v % 2 !== 0) break;
      explosoes += 1;
    }
    return { explosoes: explosoes, d4: usados, fim: explosoes >= 4 ? "quarta explosão" : "d4 ímpar" };
  }

  /* O Calor do Momento: 25% (1 a 25 em 1d100) de explodir na mão. */
  function explodiuNaMao(d100) { return Number(d100) >= 1 && Number(d100) <= 25; }

  function registrarExplosao(ordem, id, textoDoUso) {
    var lista2 = dados(ordem).explosoes;
    var eid = idOk(id);
    if (!eid) return { ok: false, motivo: "Uso sem identificação." };
    if (lista2.some(function (e) { return e.id === eid; })) return { ok: true, repetido: true };
    lista2.push({ id: eid, texto: texto(textoDoUso, 600), em: agora() });
    if (lista2.length > 30) dados(ordem).explosoes = lista2.slice(-30);
    return { ok: true };
  }

  /* Programada: o temporizador em turnos do jogo. */
  function criarTimer(ordem, nome, turnos) {
    var t = { id: novoId("tmr"), nome: texto(nome, 120) || "Granada programada", turnos: inteiro(turnos, 1, 99, 1), resolvido: false, nota: "", em: agora() };
    t.restantes = t.turnos;
    var l = dados(ordem).timers;
    l.push(t);
    if (l.length > 10) dados(ordem).timers = l.slice(-10);
    return { ok: true, timer: t };
  }
  function avancarTimer(ordem, id) {
    var t = dados(ordem).timers.filter(function (x) { return x.id === id; })[0];
    if (!t || t.resolvido) return { ok: false, motivo: "Temporizador não encontrado." };
    if (t.restantes > 0) t.restantes -= 1;
    return { ok: true, pronto: t.restantes === 0, timer: t };
  }
  function resolverTimer(ordem, id, nota) {
    var t = dados(ordem).timers.filter(function (x) { return x.id === id; })[0];
    if (!t) return { ok: false, motivo: "Temporizador não encontrado." };
    t.resolvido = true;
    t.nota = texto(nota, 300);
    return { ok: true };
  }

  /* =================================================================
     BACKUP (ritual, p. 68)
     ================================================================= */

  function conjurarBackup(ordem, versao, frase, aparencia) {
    if (VERSOES_BACKUP.indexOf(versao) < 0) return { ok: false, motivo: "Versão desconhecida." };
    var e = dados(ordem);
    if (e.backup && e.backup.ativo) return { ok: false, motivo: "Já há um chamariz ativo: dissipe-o antes." };
    e.backup = { ativo: true, versao: versao, frase: texto(frase, 200), aparencia: versao === "verdadeiro" ? texto(aparencia, 200) : "",
      dia: cronologia(ordem).dia, sentidos: false, efeitos: [], criadoEm: agora(), historico: [{ texto: "Chamariz criado (" + versao + ").", em: agora() }] };
    return { ok: true };
  }
  function historicoDoBackup(ordem, t) {
    var b = dados(ordem).backup;
    if (!b) return;
    b.historico.push({ texto: texto(t, 300), em: agora() });
    if (b.historico.length > 20) b.historico = b.historico.slice(-20);
  }
  function dissiparBackup(ordem, motivo) {
    var b = dados(ordem).backup;
    if (!b || !b.ativo) return { ok: false, motivo: "Não há chamariz ativo." };
    b.ativo = false;
    b.sentidos = false;
    historicoDoBackup(ordem, "Dissipado: " + (motivo || "por escolha") + ".");
    return { ok: true, efeitos: b.efeitos.slice() };
  }
  function backupAtivo(ordem) {
    var b = dados(ordem).backup;
    return b && b.ativo ? b : null;
  }

  global.RAMAOrdemArquivo4 = {
    ESTADOS_DA_MEMBRANA: ESTADOS_DA_MEMBRANA,
    temPoder: temPoder,
    comAfinidade: comAfinidade,
    aquisicoes: aquisicoes,
    VERSOES_BACKUP: VERSOES_BACKUP,
    normalizar: normalizar,
    normalizarDadosDoItem: normalizarDadosDoItem,
    normalizarRetratoDeRitual: normalizarRetratoDeRitual,
    vazio: vazio,
    dados: dados,
    cenaDe: cenaDe,
    emInterludio: emInterludio,
    interludioDe: interludioDe,
    cronologia: cronologia,

    circuloMaximoPorNex: circuloMaximoPorNex,
    registrarParanormal: registrarParanormal,
    criaturasRegistradas: criaturasRegistradas,
    memorizar: memorizar,
    memorizadoValendo: memorizadoValendo,

    marcarFalhaDoCacador: marcarFalhaDoCacador,
    bonusDoCacador: bonusDoCacador,
    consumirCacador: consumirCacador,

    bonusDeExercicio: bonusDeExercicio,
    exercitar: exercitar,
    usarExercicio: usarExercicio,

    registrarAnalise: registrarAnalise,
    profissaoDisponivel: profissaoDisponivel,
    trocaCabe: trocaCabe,
    registrarProfissao: registrarProfissao,
    modificacoesVencidas: modificacoesVencidas,
    tirarVencidas: tirarVencidas,

    usarExplorador: usarExplorador,
    reducaoDoExplorador: reducaoDoExplorador,
    sinestesiaDisponivel: sinestesiaDisponivel,
    aceitarSinestesia: aceitarSinestesia,
    encerrarSinestesia: encerrarSinestesia,
    atributoDaSinestesia: atributoDaSinestesia,
    rolarTerrores: rolarTerrores,
    escolherTerror: escolherTerror,
    terrorValendo: terrorValendo,
    usarTerror: usarTerror,

    usarGororoba: usarGororoba,
    usarRuido: usarRuido,
    usarOlhada: usarOlhada,

    itensDoFoco: itensDoFoco,
    definirFoco: definirFoco,
    focoVoou: focoVoou,
    deltaDoSobrepor: deltaDoSobrepor,
    registrarSobrepor: registrarSobrepor,

    explosivosDaMissao: explosivosDaMissao,
    explosivosEntregues: explosivosEntregues,
    marcarEntrega: marcarEntrega,
    dobrarDados: dobrarDados,
    areaDoExplosivo: areaDoExplosivo,
    dtDoExplosivo: dtDoExplosivo,
    alvosExcluidos: alvosExcluidos,
    cadeiaCtrlC: cadeiaCtrlC,
    explodiuNaMao: explodiuNaMao,
    registrarExplosao: registrarExplosao,
    criarTimer: criarTimer,
    avancarTimer: avancarTimer,
    resolverTimer: resolverTimer,

    conjurarBackup: conjurarBackup,
    historicoDoBackup: historicoDoBackup,
    dissiparBackup: dissiparBackup,
    backupAtivo: backupAtivo,
  };
})(typeof window !== "undefined" ? window : globalThis);
