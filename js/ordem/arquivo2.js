/* =====================================================================
   R.A.M.A. — Ordem Paranormal · estados do Arquivos Secretos 2
   =====================================================================
   O que o Arquivos Secretos 2 (Hexatombe) guarda numa ficha, e a regra
   de cada coisa — sem tela e sem rede. A ficha desenha (js/paginas/
   ficha-arquivo2.js); as contas (js/ordem/regras.js) perguntam daqui.

     intencao        o contato com a Coroa de Espinhos e os poderes de
                     Intenção concedidos, cada um com o gatilho, os
                     ferimentos contados, o uso e o efeito ativo
                     (AS2 p. 94-95)
     formaSuprema    a forma alternativa ("As Máscaras na Sua Mesa",
                     p. 97): configurada e aprovada pela mesa, ativada,
                     mantida por rodada e desativada
     sintonizacoes   Sintonização Mental com Arma / com Proteção (p. 83):
                     o item, o atributo e o interlúdio em que foi feita
     pendentes       "o próximo dano / ataque / teste" (Arte da Música
                     Macabra, p. 83; Especialista em Matar, p. 59): fica
                     guardado até ser gasto ou a cena acabar
     fortalecimentos Liturgia de Fortalecimento Ritualístico (p. 93)
     reservas        os 3d6 por cena do Catalisador Sofisticado (p. 75)
     marcas          coisas "por dia" e "por alvo por cena" (Incenso,
                     Tratamento de Emergência, vítimas, zonas…)
     hexatombe       o dia, os lançamentos na ficha (fome, sede,
                     desertor, recompensas de Intenção) — cada um com
                     origem e id, desfeito sem apagar os outros

   NADA AQUI ROLA DADO SOZINHO. Quem rola é a tela, por clique, e passa o
   resultado. Nada é "resolvido" pelo avanço de um dia.
   ===================================================================== */

(function (global) {
  "use strict";

  var ID = /^[A-Za-z0-9_.:|#-]{1,80}$/;
  var ATRIBUTOS = ["agi", "for", "int", "pre", "vig"];
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
  function P() { return global.RAMAOrdemPoderes || null; }

  /* =================================================================
     AS REGRAS OPCIONAIS (v2.31) — A DECISÃO ÚNICA
     -----------------------------------------------------------------
     Intenção, forma suprema e participação no Hexatombe são regras
     opcionais da ficha (js/ordem/opcionais.js), desligadas por padrão.
     Tela, contas e ações perguntam AQUI — nunca pela existência dos
     campos normalizados, que toda ficha tem.

     Desligada, a regra não soma, não tira, não cobra e não oferece
     ação: os dados ficam guardados, intactos, e voltam a valer quando
     ela é religada (sem conceder nada de novo).
     ================================================================= */

  var REGRAS = { intencao: "poderesDeIntencao", forma: "formasSupremas", hexatombe: "participacaoHexatombe", perigo: "aliadosEmPerigo" };
  var MOTIVOS = {
    intencao: "A regra opcional Poderes de Intenção está desligada nesta ficha (Arquivos Secretos 2, p. 94).",
    forma: "A regra opcional Formas Supremas está desligada nesta ficha (Arquivos Secretos 2, p. 97).",
    hexatombe: "A regra opcional Participação no Hexatombe está desligada nesta ficha (Arquivos Secretos 2, p. 4–24).",
    perigo: "A regra opcional Aliados em Perigo está desligada nesta ficha (Arquivos Secretos 2, p. 24).",
  };

  function regraLigada(ordem, qual) {
    var OP = global.RAMAOrdemOpcionais;
    var chave = REGRAS[qual] || qual;
    return !!(OP && ordem && OP.ligada(ordem, chave));
  }
  function desligada(qual) { return { ok: false, desligada: true, motivo: MOTIVOS[qual] }; }

  function cenaDe(ordem) {
    return (ordem && ordem.condicoes && ordem.condicoes.cena && ordem.condicoes.cena.id) || "inicial";
  }
  /* O interlúdio em curso: um contador que sobe a cada "Novo interlúdio".
     O que dura "até o início da próxima cena de interlúdio" guarda o
     número em que foi feito e vence quando ele muda. */
  function interludioDe(ordem) {
    var c = ordem && ordem.condicoes;
    return c && c.interludio && typeof c.interludio.numero === "number" ? c.interludio.numero : 0;
  }

  /* =================================================================
     NORMALIZAÇÃO
     ================================================================= */

  var TIPOS_DE_GATILHO = ["ferimentos", "acao", "confirmacao"];

  function normalizarPoderDeIntencao(x) {
    if (!x || typeof x !== "object") return null;
    var id = idOk(x.id);
    var chave = /^[A-Za-z0-9]{1,60}$/.test(String(x.chave || "")) ? String(x.chave) : "";
    if (!id || !chave) return null;
    var g = x.gatilho && typeof x.gatilho === "object" ? x.gatilho : {};
    var ativo = x.ativo && typeof x.ativo === "object" ? x.ativo : null;
    return {
      id: id,
      chave: chave,
      concedidoEm: carimbo(x.concedidoEm),
      nota: texto(x.nota, 300),
      gatilho: {
        atendido: g.atendido === true,
        em: carimbo(g.em),
        cena: idOk(g.cena),
        por: texto(g.por, 80),
      },
      ferimentos: lista(x.ferimentos).map(function (f) {
        if (!f || typeof f !== "object") return null;
        var fid = idOk(f.id);
        if (!fid) return null;
        return { id: fid, dano: inteiro(f.dano, 0, 999, 0), em: carimbo(f.em), cena: idOk(f.cena) };
      }).filter(Boolean).slice(-12),
      ativo: ativo ? { desde: carimbo(ativo.desde), cena: idOk(ativo.cena) } : null,
      usos: lista(x.usos).map(function (u) {
        if (!u || typeof u !== "object") return null;
        return { cena: idOk(u.cena), em: carimbo(u.em) };
      }).filter(Boolean).slice(-20),
    };
  }

  function normalizarIntencao(b) {
    var x = b && typeof b === "object" ? b : {};
    var c = x.contato && typeof x.contato === "object" ? x.contato : {};
    var vistos = {};
    return {
      contato: {
        registrado: c.registrado === true,
        em: carimbo(c.em),
        nota: texto(c.nota, 300),
        por: texto(c.por, 80),
      },
      poderes: lista(x.poderes).map(normalizarPoderDeIntencao).filter(function (p) {
        if (!p || vistos[p.id]) return false;
        vistos[p.id] = true;
        return true;
      }).slice(0, 12),
    };
  }

  var CUSTOS_COM_PD = ["", "ignorar", "pd"];

  function normalizarFormaSuprema(b) {
    var x = b && typeof b === "object" ? b : {};
    var a = x.ativa && typeof x.ativa === "object" ? x.ativa : null;
    return {
      configurada: x.configurada === true,
      aprovada: x.aprovada === true,
      nome: texto(x.nome, 80),
      descricao: texto(x.descricao, 1500),
      sugestoes: lista(x.sugestoes).map(function (s) { return texto(s, 200); }).filter(Boolean).slice(0, 8),
      custoComPd: CUSTOS_COM_PD.indexOf(x.custoComPd) >= 0 ? x.custoComPd : "",
      ativa: a ? {
        desde: carimbo(a.desde),
        cena: idOk(a.cena),
        rodadasExtras: inteiro(a.rodadasExtras, 0, 999, 0),
      } : null,
      historico: lista(x.historico).map(function (h) {
        if (!h || typeof h !== "object") return null;
        var hid = idOk(h.id);
        if (!hid) return null;
        return { id: hid, tipo: texto(h.tipo, 20), em: carimbo(h.em), custo: inteiro(h.custo, 0, 99, 0), recurso: h.recurso === "pd" ? "pd" : "san" };
      }).filter(Boolean).slice(-30),
    };
  }

  function normalizarSintonizacoes(b) {
    var vistos = {};
    return lista(b).map(function (s) {
      if (!s || typeof s !== "object") return null;
      var id = idOk(s.id);
      var tipo = s.tipo === "protecao" ? "protecao" : (s.tipo === "arma" ? "arma" : "");
      if (!id || !tipo || vistos[tipo] || ATRIBUTOS.indexOf(s.atributo) < 0) return null;
      vistos[tipo] = true;   /* uma de cada: a nova substitui a velha */
      return { id: id, tipo: tipo, itemId: idOk(s.itemId), atributo: s.atributo, interludio: inteiro(s.interludio, 0, 99999, 0), em: carimbo(s.em) };
    }).filter(Boolean);
  }

  var TIPOS_PENDENTES = ["dano", "margem", "ataque", "alcance"];

  function normalizarPendentes(b) {
    return lista(b).map(function (p) {
      if (!p || typeof p !== "object") return null;
      var id = idOk(p.id);
      if (!id || TIPOS_PENDENTES.indexOf(p.tipo) < 0) return null;
      return {
        id: id, tipo: p.tipo, valor: inteiro(p.valor, -99, 99, 0), fonte: texto(p.fonte, 80),
        cena: idOk(p.cena), em: carimbo(p.em), consumido: carimbo(p.consumido),
      };
    }).filter(Boolean).slice(-MAX);
  }

  function normalizarFortalecimentos(b) {
    return lista(b).map(function (f) {
      if (!f || typeof f !== "object") return null;
      var id = idOk(f.id);
      if (!id) return null;
      return { id: id, ritualId: idOk(f.ritualId), nome: texto(f.nome, 120), interludio: inteiro(f.interludio, 0, 99999, 0), em: carimbo(f.em) };
    }).filter(Boolean).slice(-MAX);
  }

  function normalizarReservas(b) {
    return lista(b).map(function (r) {
      if (!r || typeof r !== "object") return null;
      var id = idOk(r.id);
      if (!id) return null;
      return { id: id, fonte: texto(r.fonte, 80), cena: idOk(r.cena), total: inteiro(r.total, 0, 20, 3), gastos: inteiro(r.gastos, 0, 20, 0),
        rituais: lista(r.rituais).map(function (x) { return idOk(x); }).filter(Boolean).slice(-20) };
    }).filter(Boolean).slice(-10);
  }

  /* Marcas soltas: "chave" → valor (um dia, uma cena, uma lista curta de
     nomes). Só chaves conhecidas. */
  var MARCAS = {
    incensoDia: "int",            /* o dia em que recebeu o incenso */
    tratamentoAlvos: "lista",     /* "cena|alvo" de Tratamento de Emergência */
    vitimas: "lista",             /* Predador de Sangue */
    zonas: "lista",               /* Zona dos Sussurros (até 3) */
    pressaoAlvos: "lista",        /* "cena|alvo" de Pressão Atmosférica */
    kianCena: "id",               /* Kian Vai Nos Salvar: a cena do ritual */
  };

  function normalizarMarcas(b) {
    var x = b && typeof b === "object" && !Array.isArray(b) ? b : {};
    var saida = {};
    Object.keys(MARCAS).forEach(function (k) {
      if (x[k] === undefined) return;
      if (MARCAS[k] === "int") saida[k] = inteiro(x[k], 0, 9999, 0);
      else if (MARCAS[k] === "id") saida[k] = idOk(x[k]);
      else saida[k] = lista(x[k]).map(function (s) { return texto(s, 120); }).filter(Boolean).slice(-12);
    });
    return saida;
  }

  /* -----------------------------------------------------------------
     O HEXATOMBE NA FICHA
     -----------------------------------------------------------------
     Um lançamento é uma alteração com origem: o dia, o motivo e quem
     lançou. O id é ESTÁVEL quando vem da campanha ("sede:d2:p7"): lançar
     de novo não duplica. Desfazer marca o lançamento, sem apagar.

       pvMax / peMax   soma (negativo para a sede e a fome)
       pvMetade        o desertor tem os PV máximos pela metade
       rd              resistência a dano (Obsessão)
       testes          bônus em testes (o −1 por sacrifício do desertor)
       dadosTestes     dados em testes (o −1 dado do desertor)
       dano            bônus de dano (Rancor)
       nota            só registro (o poder de quem morreu, a Culpa…)
     ----------------------------------------------------------------- */

  var TIPOS_DE_LANCAMENTO = ["pvMax", "peMax", "pvMetade", "rd", "testes", "dadosTestes", "dano", "nota"];

  function normalizarHexatombe(b) {
    var x = b && typeof b === "object" ? b : {};
    var vistos = {};
    return {
      campanhaId: idOk(x.campanhaId),
      dia: inteiro(x.dia, 0, 99, 0),
      lancamentos: lista(x.lancamentos).map(function (l) {
        if (!l || typeof l !== "object") return null;
        var id = idOk(l.id);
        if (!id || vistos[id] || TIPOS_DE_LANCAMENTO.indexOf(l.tipo) < 0) return null;
        vistos[id] = true;
        return {
          id: id, tipo: l.tipo, valor: inteiro(l.valor, -999, 999, 0), dia: inteiro(l.dia, 0, 99, 0),
          motivo: texto(l.motivo, 200), origem: texto(l.origem, 80), em: carimbo(l.em), por: texto(l.por, 80),
          desfeito: carimbo(l.desfeito),
        };
      }).filter(Boolean).slice(-120),
    };
  }

  function normalizar(ordem, b) {
    var x = b || {};
    ordem.intencao = normalizarIntencao(x.intencao);
    ordem.formaSuprema = normalizarFormaSuprema(x.formaSuprema);
    ordem.sintonizacoes = normalizarSintonizacoes(x.sintonizacoes);
    ordem.pendentes = normalizarPendentes(x.pendentes);
    ordem.fortalecimentos = normalizarFortalecimentos(x.fortalecimentos);
    ordem.reservas = normalizarReservas(x.reservas);
    ordem.marcas = normalizarMarcas(x.marcas);
    ordem.hexatombe = normalizarHexatombe(x.hexatombe);
    return ordem;
  }

  function vazio() {
    return normalizar({}, {});
  }

  /* =================================================================
     INTENÇÃO (AS2 p. 94-95)
     ================================================================= */

  function registrarContato(ordem, nota, por) {
    if (!regraLigada(ordem, "intencao")) return desligada("intencao");
    ordem.intencao = normalizarIntencao(ordem.intencao);
    ordem.intencao.contato = { registrado: true, em: agora(), nota: texto(nota, 300), por: texto(por, 80) };
    return { ok: true };
  }

  function concederIntencao(ordem, chave, nota) {
    var e = P() ? P().poder(chave) : null;
    if (!e || e.tipo !== "intencao") return { ok: false, motivo: "Esse não é um poder de Intenção." };
    if (!regraLigada(ordem, "intencao")) return desligada("intencao");
    ordem.intencao = normalizarIntencao(ordem.intencao);
    if (!ordem.intencao.contato.registrado) {
      return { ok: false, motivo: "Poderes de Intenção pedem contato com a Coroa de Espinhos (Arquivos Secretos 2, p. 94). Registre o contato antes." };
    }
    if (ordem.intencao.poderes.some(function (p) { return p.chave === chave; })) return { ok: false, motivo: "A ficha já tem " + e.nome + "." };
    var p = normalizarPoderDeIntencao({ id: "int-" + uuid(), chave: chave, concedidoEm: agora(), nota: nota });
    ordem.intencao.poderes.push(p);
    return { ok: true, poder: p };
  }

  function acharIntencao(ordem, id) {
    return ((ordem.intencao && ordem.intencao.poderes) || []).filter(function (p) { return p.id === id; })[0] || null;
  }

  /* Um ferimento conta para Filho da Dor quando causa o dano mínimo. */
  function registrarFerimento(ordem, id, dano) {
    var p = acharIntencao(ordem, id);
    var e = p && P() ? P().poder(p.chave) : null;
    if (!p || !e || !e.intencao || e.intencao.tipo !== "ferimentos") return { ok: false, motivo: "Este poder não conta ferimentos." };
    if (!regraLigada(ordem, "intencao")) return desligada("intencao");
    var n = inteiro(dano, 0, 999, 0);
    if (n < (e.intencao.danoMinimo || 0)) {
      return { ok: false, motivo: "Um ferimento só conta com pelo menos " + e.intencao.danoMinimo + " pontos de dano." };
    }
    if (p.gatilho.atendido) return { ok: false, motivo: "O gatilho já foi atendido: use o poder antes de contar de novo." };
    p.ferimentos.push({ id: "fer-" + uuid(), dano: n, em: agora(), cena: cenaDe(ordem) });
    if (p.ferimentos.length >= (e.intencao.ferimentos || 3)) {
      p.gatilho = { atendido: true, em: agora(), cena: cenaDe(ordem), por: "contagem de ferimentos" };
    }
    return { ok: true, contados: p.ferimentos.length, atendido: p.gatilho.atendido };
  }

  /* Gatilho narrativo: a mesa (ou quem joga, com a mesa) confirma. */
  function atenderGatilho(ordem, id, por) {
    var p = acharIntencao(ordem, id);
    if (!p) return { ok: false, motivo: "Poder não encontrado." };
    if (!regraLigada(ordem, "intencao")) return desligada("intencao");
    if (p.gatilho.atendido) return { ok: false, motivo: "O gatilho já está atendido." };
    p.gatilho = { atendido: true, em: agora(), cena: cenaDe(ordem), por: texto(por || "confirmado pela mesa", 80) };
    return { ok: true };
  }

  function estadoDaIntencao(ordem, p) {
    var e = P() ? P().poder(p.chave) : null;
    var it = (e && e.intencao) || {};
    var cena = cenaDe(ordem);
    var usosNaCena = p.usos.filter(function (u) { return u.cena === cena; }).length;
    var motivo = "";
    var ligada = regraLigada(ordem, "intencao");
    if (!ligada) motivo = MOTIVOS.intencao;
    else if (!p.gatilho.atendido) motivo = "O gatilho ainda não foi atendido.";
    else if (it.mesmaCena && p.gatilho.cena && p.gatilho.cena !== cena) motivo = "O gatilho foi atendido em outra cena; este poder pede a mesma cena.";
    else if (it.porCena && usosNaCena >= it.porCena) motivo = "Já usado nesta cena.";
    if (p.ativo && p.ativo.cena && p.ativo.cena !== cena && it.duracao === "cena") motivo = motivo || "";
    return {
      entrada: e,
      disponivel: ligada && !motivo && !p.ativo,
      motivo: motivo,
      ligada: ligada,
      ativo: ligada && !!(p.ativo && (it.duracao !== "cena" || p.ativo.cena === cena)),
      usosNaCena: usosNaCena,
      ferimentos: p.ferimentos.length,
    };
  }

  /* Usar consome o gatilho (a menos que o poder diga outra coisa). Um
     efeito "ativo" fica ligado até desligar (ou a cena, se for de cena). */
  function usarIntencao(ordem, id) {
    var p = acharIntencao(ordem, id);
    if (!p) return { ok: false, motivo: "Poder não encontrado." };
    var st = estadoDaIntencao(ordem, p);
    if (!st.disponivel) return { ok: false, motivo: st.motivo || "O efeito já está ativo." };
    var it = (st.entrada && st.entrada.intencao) || {};
    p.usos.push({ cena: cenaDe(ordem), em: agora() });
    p.gatilho = { atendido: false, em: "", cena: "", por: "" };
    p.ferimentos = [];
    if (it.efeito === "ativo") p.ativo = { desde: agora(), cena: cenaDe(ordem) };
    return { ok: true, ativo: !!p.ativo, entrada: st.entrada };
  }

  function encerrarIntencao(ordem, id) {
    var p = acharIntencao(ordem, id);
    if (!p || !p.ativo) return { ok: false, motivo: "Nada ativo para encerrar." };
    p.ativo = null;
    return { ok: true };
  }

  /* O que os poderes de Intenção ativos somam nas contas: a RD de Filho
     da Dor e o dano / a margem de O Sabor do Silêncio (só nesta cena). */
  function efeitosDaIntencao(ordem) {
    var saida = { rd: 0, danoDados: "", margem: 0, perdaPorTurno: 0, fontes: [] };
    if (!regraLigada(ordem, "intencao")) return saida;
    ((ordem && ordem.intencao && ordem.intencao.poderes) || []).forEach(function (p) {
      var st = estadoDaIntencao(ordem, p);
      if (!st.ativo || !st.entrada) return;
      var it = st.entrada.intencao || {};
      if (it.rd) { saida.rd += it.rd; saida.perdaPorTurno += it.perdaPorTurno || 0; saida.fontes.push(st.entrada.nome); }
      if (p.chave === "oSaborDoSilencio") { saida.danoDados = "1d8"; saida.margem += 2; saida.fontes.push(st.entrada.nome); }
    });
    return saida;
  }

  /* =================================================================
     FORMA SUPREMA (AS2 p. 97)
     -----------------------------------------------------------------
     Custos e benefícios DEFINIDOS: ação de movimento; 6 SAN, mais 2 por
     rodada além da primeira; +20 PV e +10 PE atuais e máximos e +10 na
     Defesa. Desativar (ação livre) tira tudo: com menos de 20 PV atuais,
     fica com 0 e morrendo. Insano na forma: vira NPC (narrativo).
     As "sugestões" do livro são só sugestões — texto da ficha.

     Jogando sem Sanidade: o livro manda ignorar as referências a
     Sanidade (SAH p. 104), e a p. 96 diz que as formas custam "muitos
     pontos de determinação". A ficha não converte por palpite: a mesa
     escolhe ("ignorar" ou "pd") antes da primeira ativação.
     ================================================================= */

  var BENEFICIOS = { pv: 20, pe: 10, defesa: 10, custoInicial: 6, custoPorRodada: 2 };

  function podeAtivar(ordem, comPd) {
    if (!regraLigada(ordem, "forma")) return desligada("forma");
    var f = normalizarFormaSuprema(ordem.formaSuprema);
    if (!f.configurada) return { ok: false, motivo: "Configure a forma alternativa primeiro." };
    if (!f.aprovada) return { ok: false, motivo: "A forma alternativa precisa da aprovação da mesa (Arquivos Secretos 2, p. 97)." };
    if (f.ativa) return { ok: false, motivo: "A forma já está ativa." };
    if (comPd && !f.custoComPd) return { ok: false, motivo: "Com Jogando sem Sanidade, a mesa precisa decidir antes como fica o custo em Sanidade (ignorar, pela regra do SAH, ou pagar em PD)." };
    return { ok: true };
  }

  /* Devolve o plano: quanto cobrar e de quê. Quem chama aplica nos
     recursos (com os máximos já recalculados). */
  function planoDeAtivacao(ordem, comPd) {
    var pode = podeAtivar(ordem, comPd);
    if (!pode.ok) return pode;
    var f = ordem.formaSuprema;
    var recurso = comPd ? (f.custoComPd === "pd" ? "pd" : "") : "san";
    return { ok: true, custo: recurso ? BENEFICIOS.custoInicial : 0, recurso: recurso };
  }

  function ativarForma(ordem, comPd) {
    var plano = planoDeAtivacao(ordem, comPd);
    if (!plano.ok) return plano;
    ordem.formaSuprema.ativa = { desde: agora(), cena: cenaDe(ordem), rodadasExtras: 0 };
    ordem.formaSuprema.historico.push({ id: "fs-" + uuid(), tipo: "ativar", em: agora(), custo: plano.custo, recurso: plano.recurso || "san" });
    return plano;
  }

  function manterForma(ordem, comPd) {
    var f = ordem.formaSuprema;
    if (!regraLigada(ordem, "forma")) return desligada("forma");
    if (!f || !f.ativa) return { ok: false, motivo: "A forma não está ativa." };
    var recurso = comPd ? (f.custoComPd === "pd" ? "pd" : "") : "san";
    f.ativa.rodadasExtras += 1;
    f.historico.push({ id: "fs-" + uuid(), tipo: "rodada", em: agora(), custo: recurso ? BENEFICIOS.custoPorRodada : 0, recurso: recurso || "san" });
    return { ok: true, custo: recurso ? BENEFICIOS.custoPorRodada : 0, recurso: recurso };
  }

  /* pvAtual: os PV atuais COM a forma. Devolve os novos atuais e se
     fica morrendo. */
  function desativarForma(ordem, pvAtual, peAtual) {
    var f = ordem.formaSuprema;
    if (!f || !f.ativa) return { ok: false, motivo: "A forma não está ativa." };
    f.ativa = null;
    f.historico.push({ id: "fs-" + uuid(), tipo: "desativar", em: agora(), custo: 0, recurso: "san" });
    var pv = Math.max(0, (Number(pvAtual) || 0) - BENEFICIOS.pv);
    var pe = Math.max(0, (Number(peAtual) || 0) - BENEFICIOS.pe);
    return { ok: true, pv: pv, pe: pe, morrendo: pv === 0 };
  }

  function formaAtiva(ordem) { return !!(ordem && ordem.formaSuprema && ordem.formaSuprema.ativa) && regraLigada(ordem, "forma"); }

  /* =================================================================
     SINTONIZAÇÕES, LITURGIA E PENDENTES
     ================================================================= */

  function sintonizar(ordem, tipo, itemId, atributo) {
    if (["arma", "protecao"].indexOf(tipo) < 0 || ATRIBUTOS.indexOf(atributo) < 0 || !idOk(itemId)) return { ok: false, motivo: "Escolha o item e o atributo." };
    var lista2 = normalizarSintonizacoes(ordem.sintonizacoes).filter(function (s) { return s.tipo !== tipo; });
    lista2.push({ id: "sin-" + uuid(), tipo: tipo, itemId: itemId, atributo: atributo, interludio: interludioDe(ordem), em: agora() });
    ordem.sintonizacoes = lista2;
    return { ok: true };
  }

  /* Vale do interlúdio em que foi feita até o início do próximo. */
  function sintonizacaoValendo(ordem, tipo, itemId) {
    return (ordem && ordem.sintonizacoes || []).filter(function (s) {
      return s.tipo === tipo && (!itemId || s.itemId === itemId) && s.interludio === interludioDe(ordem);
    })[0] || null;
  }

  function fortalecer(ordem, ritualId, nome) {
    if (!idOk(ritualId)) return { ok: false, motivo: "Escolha o ritual." };
    var l = normalizarFortalecimentos(ordem.fortalecimentos).filter(function (f) { return f.interludio === interludioDe(ordem); });
    if (l.some(function (f) { return f.ritualId === ritualId; })) return { ok: false, motivo: "Este ritual já está fortalecido até o próximo interlúdio." };
    l.push({ id: "lit-" + uuid(), ritualId: ritualId, nome: texto(nome, 120), interludio: interludioDe(ordem), em: agora() });
    ordem.fortalecimentos = l;
    return { ok: true };
  }

  function dtDeFortalecimento(ordem, ritualId) {
    return (ordem && ordem.fortalecimentos || []).some(function (f) {
      return f.ritualId === ritualId && f.interludio === interludioDe(ordem);
    }) ? 2 : 0;
  }

  /* "O próximo …": guardado até ser gasto, e só nesta cena. */
  function guardarPendente(ordem, tipo, valor, fonte) {
    if (TIPOS_PENDENTES.indexOf(tipo) < 0) return { ok: false, motivo: "Efeito desconhecido." };
    if (!Array.isArray(ordem.pendentes)) ordem.pendentes = [];
    var p = { id: "pen-" + uuid(), tipo: tipo, valor: inteiro(valor, -99, 99, 0), fonte: texto(fonte, 80), cena: cenaDe(ordem), em: agora(), consumido: "" };
    ordem.pendentes.push(p);
    return { ok: true, pendente: p };
  }

  function pendentesValendo(ordem, tipo) {
    var cena = cenaDe(ordem);
    return (ordem && ordem.pendentes || []).filter(function (p) {
      return p.tipo === tipo && !p.consumido && p.cena === cena;
    });
  }

  /* Gasta os pendentes de um tipo (todos os que valem). Devolve a soma. */
  function consumirPendentes(ordem, tipo) {
    var soma = 0;
    var fontes = [];
    pendentesValendo(ordem, tipo).forEach(function (p) {
      p.consumido = agora();
      soma += p.valor;
      fontes.push(p.fonte);
    });
    return { soma: soma, fontes: fontes };
  }

  /* =================================================================
     ESPECIALISTA EM MATAR (AS2 p. 59)
     -----------------------------------------------------------------
     Cada +4 vai para o ataque ou para o dano. O número de +4 e o custo
     sobem com o NEX: 1 (2 PE), 2 em 25% (3 PE), 3 em 55% (4 PE), 4 em
     85% (5 PE). Pode-se comprar menos do que o máximo.
     ================================================================= */

  function patamaresDeEspecialistaEmMatar(nex) {
    var n = Number(nex) || 0;
    var maximo = n >= 85 ? 4 : n >= 55 ? 3 : n >= 25 ? 2 : 1;
    var lista2 = [];
    for (var k = 1; k <= maximo; k++) lista2.push({ bonus: k, custo: k + 1 });
    return lista2;
  }

  function planoDeEspecialistaEmMatar(nex, noAtaque, noDano) {
    var a = inteiro(noAtaque, 0, 4, 0);
    var d = inteiro(noDano, 0, 4, 0);
    var total = a + d;
    var maximo = patamaresDeEspecialistaEmMatar(nex).length;
    if (!total) return { ok: true, custo: 0, ataque: 0, dano: 0 };
    if (total > maximo) return { ok: false, motivo: "Com este NEX, no máximo " + maximo + " bônus de +4." };
    return { ok: true, custo: total + 1, ataque: 4 * a, dano: 4 * d };
  }

  /* =================================================================
     RESERVA DE DADOS (Catalisador Sofisticado e Horrorizado, p. 75)
     ================================================================= */

  function reservaDaCena(ordem, fonte) {
    var cena = cenaDe(ordem);
    if (!Array.isArray(ordem.reservas)) ordem.reservas = [];
    var r = ordem.reservas.filter(function (x) { return x.fonte === fonte && x.cena === cena; })[0];
    if (!r) {
      ordem.reservas = ordem.reservas.filter(function (x) { return x.fonte !== fonte; });
      r = { id: "res-" + uuid(), fonte: texto(fonte, 80), cena: cena, total: 3, gastos: 0, rituais: [] };
      ordem.reservas.push(r);
    }
    return r;
  }

  /* Um d6 por ritual, no momento de conjurá-lo. */
  function gastarDaReserva(ordem, fonte, conjuracaoId) {
    var r = reservaDaCena(ordem, fonte);
    if (r.gastos >= r.total) return { ok: false, motivo: "Os 3d6 desta cena já foram gastos." };
    if (conjuracaoId && r.rituais.indexOf(conjuracaoId) >= 0) return { ok: false, motivo: "Só 1d6 por ritual." };
    r.gastos += 1;
    if (conjuracaoId) r.rituais.push(conjuracaoId);
    return { ok: true, restantes: r.total - r.gastos };
  }

  /* =================================================================
     LANÇAMENTOS DO HEXATOMBE NA FICHA
     ================================================================= */

  function lancar(ordem, lanc) {
    if (!regraLigada(ordem, "hexatombe")) return desligada("hexatombe");
    ordem.hexatombe = normalizarHexatombe(ordem.hexatombe);
    var id = idOk(lanc.id) || ("lan-" + uuid());
    var existente = ordem.hexatombe.lancamentos.filter(function (l) { return l.id === id; })[0];
    if (existente) return { ok: true, repetido: true, lancamento: existente };
    if (TIPOS_DE_LANCAMENTO.indexOf(lanc.tipo) < 0) return { ok: false, motivo: "Tipo de lançamento desconhecido." };
    var l = {
      id: id, tipo: lanc.tipo, valor: inteiro(lanc.valor, -999, 999, 0), dia: inteiro(lanc.dia, 0, 99, ordem.hexatombe.dia),
      motivo: texto(lanc.motivo, 200), origem: texto(lanc.origem || "Hexatombe", 80), em: agora(), por: texto(lanc.por, 80), desfeito: "",
    };
    ordem.hexatombe.lancamentos.push(l);
    return { ok: true, lancamento: l };
  }

  function desfazerLancamento(ordem, id) {
    var l = ((ordem.hexatombe && ordem.hexatombe.lancamentos) || []).filter(function (x) { return x.id === id; })[0];
    if (!l) return { ok: false, motivo: "Lançamento não encontrado." };
    if (l.desfeito) return { ok: true, repetido: true };
    l.desfeito = agora();
    return { ok: true };
  }

  /* Só com a participação ligada. Os guardados (lancamentosGuardados)
     continuam na ficha, suspensos, e voltam a valer ao religar. */
  function lancamentosValendo(ordem, tipo) {
    if (!regraLigada(ordem, "hexatombe")) return [];
    return lancamentosGuardados(ordem, tipo);
  }

  function lancamentosGuardados(ordem, tipo) {
    return ((ordem && ordem.hexatombe && ordem.hexatombe.lancamentos) || []).filter(function (l) {
      return !l.desfeito && (!tipo || l.tipo === tipo);
    });
  }

  function somaDosLancamentos(ordem, tipo) {
    return lancamentosValendo(ordem, tipo).reduce(function (t, l) { return t + l.valor; }, 0);
  }

  /* =================================================================
     ALIADOS EM PERIGO (p. 24, regra opcional)
     -----------------------------------------------------------------
     Um uso arriscado da habilidade do aliado (combate, perseguição,
     furtividade): 1d6. Par, nada; ímpar, ferido. O segundo ferimento na
     MESMA cena mata — mas fica pendente até a mesa confirmar. Cada
     aliado tem o seu registro, e o mesmo `rolagemId` nunca conta duas
     vezes. `cena` é a marca da cena da ficha (cenaDe).
     ================================================================= */

  function perigoVazio() { return { cena: "", feridas: 0, morto: false, pendente: false, registros: [] }; }

  function arriscarAliado(aliado, cena, d6, rolagemId, situacao, ordem) {
    if (!aliado) return { ok: false, motivo: "Aliado não encontrado." };
    if (ordem && !regraLigada(ordem, "perigo")) return desligada("perigo");
    var p = aliado.perigo && typeof aliado.perigo === "object" ? aliado.perigo : perigoVazio();
    if (!Array.isArray(p.registros)) p.registros = [];
    var id = idOk(rolagemId) || ("perigo-" + uuid());
    var repetido = p.registros.filter(function (r) { return r.id === id; })[0];
    if (repetido) return { ok: true, repetido: true, ferido: repetido.ferido, perigo: p };
    if (p.morto) return { ok: false, motivo: "Este aliado morreu." };
    if (p.pendente) return { ok: false, motivo: "Há uma morte por confirmar: decida antes de rolar de novo." };
    var n = inteiro(d6, 1, 6, 0);
    if (!n) return { ok: false, motivo: "Resultado de 1d6 inválido." };
    var marca = texto(cena, 80) || "inicial";
    if (p.cena !== marca) { p.cena = marca; p.feridas = 0; }
    var ferido = n % 2 === 1;
    p.registros.push({ id: id, em: agora(), cena: marca, d6: n, ferido: ferido, situacao: texto(situacao, 200) });
    if (p.registros.length > 20) p.registros = p.registros.slice(-20);
    if (ferido) {
      if (p.feridas >= 1) p.pendente = true;
      else p.feridas = 1;
    }
    aliado.perigo = p;
    return { ok: true, ferido: ferido, pendente: p.pendente, perigo: p };
  }

  /* A mesa decide: `morreu` true confirma a morte; false descarta (o
     ferimento continua contado na cena). */
  function confirmarPerigo(aliado, morreu) {
    var p = aliado && aliado.perigo;
    if (!p || !p.pendente) return { ok: false, motivo: "Nada a confirmar." };
    p.pendente = false;
    if (morreu) p.morto = true;
    return { ok: true, morto: p.morto };
  }

  function estadoDoPerigo(aliado, cena) {
    var p = aliado && aliado.perigo;
    if (!p) return { feridas: 0, morto: false, pendente: false };
    var mesma = p.cena === (texto(cena, 80) || "inicial");
    return { feridas: mesma ? p.feridas : 0, morto: !!p.morto, pendente: !!p.pendente };
  }

  /* =================================================================
     DESLIGAR UMA REGRA COM EFEITO ATIVO
     -----------------------------------------------------------------
     Chamado por RAMAOrdemOpcionais.definir ao desligar. Só tira os
     modificadores daquela regra; o que já foi gasto fica gasto, e nada
     volta a ficar ativo ao religar:

       Intenção        efeitos ativos encerrados (gatilhos, usos e
                       ferimentos contados ficam)
       Forma suprema   a forma sai sem custo e sem "morrendo": os +20 PV
                       e +10 PE guardados como atuais saem junto (os
                       vazios já acompanham o máximo); fica no histórico
       Hexatombe       nada a mexer: os lançamentos ficam suspensos
     ================================================================= */

  function suspenderRegra(ordem, chave) {
    if (!ordem) return { mudou: false };
    if (chave === REGRAS.intencao) {
      var n = 0;
      ((ordem.intencao && ordem.intencao.poderes) || []).forEach(function (p) {
        if (p.ativo) { p.ativo = null; n += 1; }
      });
      return { mudou: n > 0, aviso: n ? n + " efeito(s) de Intenção ativo(s) encerrado(s). Gatilhos, usos e ferimentos contados ficam guardados." : "" };
    }
    if (chave === REGRAS.forma) {
      var f = ordem.formaSuprema;
      if (!f || !f.ativa) return { mudou: false };
      f.ativa = null;
      if (!Array.isArray(f.historico)) f.historico = [];
      f.historico.push({ id: "fs-" + uuid(), tipo: "suspender", em: agora(), custo: 0, recurso: "san" });
      var R = global.RAMAOrdemRegras;
      var qualPe = R && R.usaDeterminacao && R.usaDeterminacao(ordem) ? "pd" : "pe";
      if (ordem.recursos && typeof ordem.recursos.pv === "number") ordem.recursos.pv = Math.max(0, ordem.recursos.pv - BENEFICIOS.pv);
      if (ordem.recursos && typeof ordem.recursos[qualPe] === "number") ordem.recursos[qualPe] = Math.max(0, ordem.recursos[qualPe] - BENEFICIOS.pe);
      return { mudou: true, aviso: "A forma suprema ativa foi encerrada: os benefícios saíram, o que foi gasto continua gasto, e religar a regra não a reativa." };
    }
    if (chave === REGRAS.hexatombe) {
      var guardados = lancamentosGuardados(ordem).length;
      return { mudou: false, aviso: guardados ? guardados + " lançamento(s) do Hexatombe ficam guardados, sem efeito, até a regra voltar." : "" };
    }
    return { mudou: false };
  }

  /* Há dados guardados desta regra na ficha? Para avisar (nunca para
     ligar sozinho). */
  function dadosGuardados(ordem, qual) {
    if (!ordem) return false;
    if (qual === "intencao") return !!(ordem.intencao && (ordem.intencao.contato.registrado || ordem.intencao.poderes.length));
    if (qual === "forma") return !!(ordem.formaSuprema && (ordem.formaSuprema.configurada || ordem.formaSuprema.historico.length));
    if (qual === "hexatombe") return !!(ordem.hexatombe && (ordem.hexatombe.lancamentos.length || ordem.hexatombe.dia));
    return false;
  }

  global.RAMAOrdemArquivo2 = {
    REGRAS: REGRAS,
    regraLigada: regraLigada,
    suspenderRegra: suspenderRegra,
    dadosGuardados: dadosGuardados,
    lancamentosGuardados: lancamentosGuardados,
    BENEFICIOS_DA_FORMA: BENEFICIOS,
    TIPOS_DE_LANCAMENTO: TIPOS_DE_LANCAMENTO,
    TIPOS_PENDENTES: TIPOS_PENDENTES,
    TIPOS_DE_GATILHO: TIPOS_DE_GATILHO,
    normalizar: normalizar,
    vazio: vazio,
    normalizarIntencao: normalizarIntencao,
    normalizarFormaSuprema: normalizarFormaSuprema,
    normalizarHexatombe: normalizarHexatombe,
    cenaDe: cenaDe,
    interludioDe: interludioDe,

    registrarContato: registrarContato,
    concederIntencao: concederIntencao,
    registrarFerimento: registrarFerimento,
    atenderGatilho: atenderGatilho,
    estadoDaIntencao: estadoDaIntencao,
    usarIntencao: usarIntencao,
    encerrarIntencao: encerrarIntencao,
    efeitosDaIntencao: efeitosDaIntencao,

    podeAtivar: podeAtivar,
    planoDeAtivacao: planoDeAtivacao,
    ativarForma: ativarForma,
    manterForma: manterForma,
    desativarForma: desativarForma,
    formaAtiva: formaAtiva,

    sintonizar: sintonizar,
    sintonizacaoValendo: sintonizacaoValendo,
    fortalecer: fortalecer,
    dtDeFortalecimento: dtDeFortalecimento,
    guardarPendente: guardarPendente,
    pendentesValendo: pendentesValendo,
    consumirPendentes: consumirPendentes,
    patamaresDeEspecialistaEmMatar: patamaresDeEspecialistaEmMatar,
    planoDeEspecialistaEmMatar: planoDeEspecialistaEmMatar,
    reservaDaCena: reservaDaCena,
    gastarDaReserva: gastarDaReserva,

    arriscarAliado: arriscarAliado,
    confirmarPerigo: confirmarPerigo,
    estadoDoPerigo: estadoDoPerigo,

    lancar: lancar,
    desfazerLancamento: desfazerLancamento,
    lancamentosValendo: lancamentosValendo,
    somaDosLancamentos: somaDosLancamentos,
  };
})(typeof window !== "undefined" ? window : globalThis);
