/* =====================================================================
   R.A.M.A. — Oblívio · motor do Buraco (pp. 98–115)
   =====================================================================
   A exploração como ferramenta da mesa, com as tabelas alternativas do
   livro no lugar do baralho físico.

   O Buraco é um grafo de CARTAS (cômodos) em andares. Cada carta guarda
   o tipo, as conexões que ainda aceita, as ligações feitas, o resultado
   da tabela dela e os EVENTOS estruturados (de js/oblivio/buraco-
   dados.js), com o estado de cada um: pendente, resolvido. Revisitar
   não repete o que já foi resolvido — só Déjà-vu e Coringa mandam.

   Privado da Testemunha: cartas ainda não reveladas e o conteúdo de
   cartas que só ela viu (vistaDosJogadores tira).
   ===================================================================== */

(function (global) {
  "use strict";

  var T = global.RAMAOblivioBuraco;
  var R = global.RAMAOblivio;
  var A = global.RAMAOblivioAmeacas;

  function ev(tipo, dados) { return R.evento(tipo, dados); }
  function naFaixa(tabela, d) { return tabela.filter(function (x) { return d >= x.de && d <= x.ate; })[0] || null; }

  /* Rola uma tabela de 1D6 e devolve a linha com os eventos copiados,
     cada um com id e estado. */
  function rolarTabela(tabela, rolador, dado) {
    var d = rolador(dado || 6);
    var linha = naFaixa(tabela, d);
    if (!linha) return { d: d, linha: null, eventos: [] };
    return { d: d, linha: linha, chave: linha.chave, nome: linha.nome, resumo: linha.resumo,
      eventos: linha.eventos.map(function (e) { return Object.assign({ id: R.novoId("bv"), estado: "pendente" }, R.copiar(e)); }) };
  }

  function dificuldadeDeEncontro(personas, missoesConcluidas) {
    var p = R.inteiro(personas, 0, 99, 0), mi = R.inteiro(missoesConcluidas, 0, 999, 0);
    function nivel(n, campo) { for (var i = 0; i < T.DIFICULDADE_DE_ENCONTRO.length; i++) if (n <= T.DIFICULDADE_DE_ENCONTRO[i][campo]) return i; return 2; }
    /* O MAIOR dos dois critérios (p. 104). */
    return T.DIFICULDADE_DE_ENCONTRO[Math.max(nivel(p, "personasAte"), nivel(mi, "missoesAte"))].chave;
  }

  /* ---------------------------------------------------------------
     FUNDAÇÃO (pp. 98–102)
     --------------------------------------------------------------- */

  function criarBuraco(rolador, opcoes) {
    var op = opcoes || {};
    var b = { v: 1, id: R.novoId("bu"), andares: [], cartas: [], atual: "", efeito: null, missao: null, regras: {},
      personas: R.inteiro(op.personas, 1, 20, 4), missoesConcluidas: R.inteiro(op.missoesConcluidas, 0, 999, 0),
      combatesVencidos: 0, cenasPassadas: 0, saidasFalsasAte: 1, dejaVu: false, encerrado: null };
    var eventos = [];
    if (!op.semEfeito) {
      var ef = rolarTabela(T.EFEITO, rolador);
      b.efeito = { d: ef.d, chave: ef.chave, nome: ef.nome, resumo: ef.resumo };
      ef.eventos.forEach(function (e) { if (e.tipo === "regraDoBuraco") aplicarRegra(b, e); });
      eventos.push(ev("efeitoDoBuraco", { nome: ef.nome, d6: ef.d }));
    }
    if (!op.semMissao) {
      var mi = rolarTabela(T.MISSAO, rolador);
      b.missao = { d: mi.d, chave: mi.chave, nome: mi.nome, resumo: mi.resumo, objetivo: mi.linha.objetivo, carta: mi.linha.carta, cumprida: false, eventos: mi.eventos };
      mi.eventos.forEach(function (e) {
        if (e.tipo === "objetivoDeMissao" && e.combates) {
          var n = Math.max(e.combates.minimo || 1, R.metade(b.personas)) + R.rolarExpressao(e.combates.mais, rolador).total;
          b.missao.combatesNecessarios = n;
        }
        if (e.tipo === "objetivoDeMissao" && e.rolarObjetivoAntes) {
          b.missao.objetivoAntes = rolarObjetivo(b, rolador);
          /* Ache a Saída: o Objetivo é rolado antes e já vale como regra. */
          b.missao.objetivoAntes.eventos.forEach(function (x) { if (x.tipo === "regraDoBuraco") { aplicarRegra(b, x); x.estado = "resolvido"; } });
        }
        if (e.tipo === "objetivoDeMissao" && e.entradaFechada) b.regras.entradaFechada = true;
      });
      eventos.push(ev("missaoDoBuraco", { nome: mi.nome, d6: mi.d }));
    }
    novoAndar(b, rolador);
    return { ok: true, buraco: b, eventos: eventos };
  }

  function aplicarRegra(b, e) {
    ["recuperacao", "perdaDeCoragem", "descansoTotal", "luz", "semDescanso", "foraDeAcao", "colapso", "saidaFalsaAte", "perseguicao"].forEach(function (k) {
      if (e[k] !== undefined) b.regras[k] = R.copiar(e[k]);
    });
    if (e.saidaFalsaAte) b.saidasFalsasAte = e.saidaFalsaAte;
  }

  function novoAndar(b, rolador) {
    var andar = { id: R.novoId("an"), n: b.andares.length + 1 };
    b.andares.push(andar);
    var d = rolador(12);
    var linha = naFaixa(T.ENTRADA, d);
    var carta = { id: R.novoId("ct"), andar: andar.id, tipo: "entrada", conexoes: linha.conexoes, ligacoes: [], revelada: true, explorada: true, d: d, resultado: null, eventos: [] };
    b.cartas.push(carta);
    if (!b.atual) b.atual = carta.id;
    return carta;
  }

  /* ---------------------------------------------------------------
     CONSTRUÇÃO (pp. 103–115)
     --------------------------------------------------------------- */

  function carta(b, id) { return b.cartas.filter(function (c) { return c.id === id; })[0] || null; }
  function livres(c) { return Math.max(0, c.conexoes - c.ligacoes.length); }

  /* Seguir por uma extremidade livre da carta atual: saca uma carta de
     Construção (1D100; 61+ rola de novo), liga as duas e resolve a
     tabela da carta nova. */
  function explorar(b, deId, rolador) {
    var de = carta(b, deId || b.atual);
    if (!de) return { ok: false, motivo: "Carta inexistente." };
    if (b.encerrado) return { ok: false, motivo: "A exploração terminou." };
    if (!livres(de)) return { ok: false, motivo: "Esta carta não tem mais conexões livres." };
    var d;
    var tentativas = [];
    do { d = rolador(100); tentativas.push(d); } while (d > T.CONSTRUCAO_REROLA_ACIMA && tentativas.length < 50);
    var linha = naFaixa(T.CONSTRUCAO, d);
    var nova = { id: R.novoId("ct"), andar: de.andar, tipo: linha.carta, conexoes: linha.conexoes, ligacoes: [de.id], revelada: true, explorada: true, d: d, rerolagens: tentativas.length - 1, resultado: null, eventos: [] };
    de.ligacoes.push(nova.id);
    b.cartas.push(nova);
    b.atual = nova.id;
    var r = resolverCarta(b, nova, rolador);
    return { ok: true, carta: nova, eventos: [ev("cartaSacada", { tipo: nova.tipo, d100: d, conexoes: nova.conexoes })].concat(r.eventos) };
  }

  /* A tabela de cada tipo de carta. */
  function resolverCarta(b, c, rolador) {
    var eventos = [];
    var tab = null;
    if (c.tipo === "armadilha") tab = rolarTabela(T.ARMADILHA, rolador);
    if (c.tipo === "encontro") {
      c.dificuldade = dificuldadeDeEncontro(b.personas, b.missoesConcluidas);
      tab = rolarTabela(T.ENCONTRO[c.dificuldade], rolador);
    }
    if (c.tipo === "infortunio") tab = rolarTabela(T.INFORTUNIO, rolador);
    if (c.tipo === "saida") {
      tab = rolarTabela(T.SAIDA, rolador);
      /* Fim da Linha: Saída Falsa com 1–3. Última Saída nunca é falsa. */
      if (b.saidasFalsasAte > 1 && tab.d <= b.saidasFalsasAte) tab = Object.assign(tab, forcarLinha(T.SAIDA, "saidaFalsa"));
    }
    if (c.tipo === "segredo") tab = rolarTabela(T.SEGREDO, rolador);
    if (c.tipo === "tesouro") tab = rolarTabela(T.TESOURO, rolador);
    if (c.tipo === "objetivo" && b.missao) tab = rolarObjetivo(b, rolador);
    if (c.tipo === "escada") {
      var andar = novoAndar(b, rolador);
      c.leva = andar.id;
      eventos.push(ev("novoAndar", { andar: andar.andar }));
    }
    if (c.tipo === "vazio") eventos.push(ev("cartaVazia", {}));
    if (tab) {
      c.resultado = { d: tab.d, chave: tab.chave, nome: tab.nome, resumo: tab.resumo };
      c.eventos = tab.eventos;
      eventos.push(ev("resultadoDaCarta", { tipo: c.tipo, nome: tab.nome, d: tab.d }));
    }
    /* A carta da Missão: Encontro/Segredo/Vazio/Tesouro aciona o
       Objetivo também (p. 102). */
    /* Ache a Saída já rolou o Objetivo antes: achar a Saída é o próprio
       objetivo (cumprido ao sair por ela). */
    if (b.missao && b.missao.carta === c.tipo && c.tipo !== "objetivo" && !b.missao.cumprida && !b.missao.objetivoAntes) {
      var obj = rolarObjetivo(b, rolador);
      c.objetivo = { nome: obj.nome, chave: obj.chave, d: obj.d, eventos: obj.eventos };
      eventos.push(ev("objetivo", { nome: obj.nome }));
    }
    if (c.tipo === "encontro") b.combatesPendentes = (b.combatesPendentes || 0) + 1;
    return { eventos: eventos };
  }

  function forcarLinha(tabela, chave) {
    var l = tabela.filter(function (x) { return x.chave === chave; })[0];
    return { linha: l, chave: l.chave, nome: l.nome, resumo: l.resumo, eventos: l.eventos.map(function (e) { return Object.assign({ id: R.novoId("bv"), estado: "pendente" }, R.copiar(e)); }) };
  }

  function rolarObjetivo(b, rolador) {
    var tabela = T.OBJETIVO[b.missao ? b.missao.objetivo : "salveODia"];
    return rolarTabela(tabela, rolador);
  }

  /* Revisitar uma carta: o que já foi resolvido não repete. Déjà-vu e a
     Armadilha Coringa mandam repetir. */
  function entrar(b, cartaId, rolador) {
    var c = carta(b, cartaId);
    if (!c) return { ok: false, motivo: "Carta inexistente." };
    var anterior = carta(b, b.atual);
    var ligada = anterior && (anterior.ligacoes.indexOf(c.id) >= 0 || c.ligacoes.indexOf(anterior.id) >= 0 || (anterior.passagem === c.id) || (c.passagem === anterior.id));
    if (anterior && anterior.id !== c.id && !ligada) return { ok: false, motivo: "Não há caminho direto até essa carta." };
    if (c.bloqueadaDe && anterior && c.bloqueadaDe === anterior.id) return { ok: false, motivo: "O caminho está bloqueado (Desmoronamento)." };
    b.atual = c.id;
    var eventos = [ev("entrou", { tipo: c.tipo })];
    var coringa = c.eventos.filter(function (e) { return e.tipo === "armadilhaArmada" && e.estado === "pendente"; })[0];
    if (coringa) {
      coringa.estado = "resolvido";
      var tab = rolarTabela(T.ARMADILHA, rolador);
      c.eventos = c.eventos.concat(tab.eventos);
      eventos.push(ev("armadilhaDisparou", { nome: tab.nome, d6: tab.d }));
    }
    if (b.dejaVu && c.explorada && c.resultado) {
      b.dejaVu = false;
      c.eventos = c.eventos.map(function (e) { return Object.assign({}, e, { id: R.novoId("bv"), estado: "pendente" }); });
      eventos.push(ev("dejaVu", { carta: c.id }));
    }
    return { ok: true, carta: c, eventos: eventos };
  }

  /* Marca um evento da carta como resolvido (depois que a mesa aplicou:
     encontro vencido, teste feito, item entregue). */
  function resolverEvento(b, cartaId, eventoId, resultado) {
    var c = carta(b, cartaId);
    var e = c ? c.eventos.concat(c.objetivo ? c.objetivo.eventos : []).filter(function (x) { return x.id === eventoId; })[0] : null;
    if (!e) return { ok: false, motivo: "Evento inexistente." };
    if (e.estado === "resolvido") return { ok: true, repetida: true };
    e.estado = "resolvido";
    e.resultado = R.copiar(resultado || {});
    var eventos = [];
    if (e.tipo === "iniciarEncontro" && resultado && resultado.vencido) {
      b.combatesVencidos++;
      if (b.missao && b.missao.combatesNecessarios && b.combatesVencidos >= b.missao.combatesNecessarios) { b.missao.cumprida = true; eventos.push(ev("missaoCumprida", {})); }
    }
    if (e.tipo === "dejaVu") b.dejaVu = true;
    if (e.tipo === "bloquearConexao") c.bloqueada = true;
    if (e.tipo === "objetivoCumprido") { b.missao.cumprida = true; eventos.push(ev("missaoCumprida", {})); }
    if (e.tipo === "passagem" && resultado && resultado.ate) c.passagem = resultado.ate;
    if (e.tipo === "regraDoBuraco") aplicarRegra(b, e);
    return { ok: true, eventos: eventos };
  }

  /* Expande um evento estruturado no que a mesa precisa fazer: as
     Ameaças a pôr em combate, os itens a entregar, os testes a pedir.
     Rola o que o evento manda rolar. */
  function expandirEvento(e, rolador, contexto) {
    var cx = contexto || {};
    var saida = { ameacas: [], itens: [], testes: [], cura: null, dano: null, tensao: null, escolhas: [], notas: [] };
    if (e.tipo === "iniciarEncontro" || e.tipo === "encontroDeObjetivo") {
      var lista = e.ameacas ? R.copiar(e.ameacas) : [];
      if (e.tipo === "encontroDeObjetivo") {
        var tab = rolarTabela(T.ENCONTRO[cx.dificuldade || "facil"], rolador);
        lista = tab.eventos[0] ? R.copiar(tab.eventos[0].ameacas) : [];
        saida.notas.push("Encontro rolado: " + tab.nome);
        if (e.multiplica) lista.forEach(function (a) { a.qtd *= e.multiplica; });
        if (e.mais) lista.push({ grau: e.mais.grau, qtd: e.mais.qtd, aleatoria: true });
        if (e.acaoExtra) saida.notas.push("Todas as Ameaças ganham uma Ação Regular a mais por turno.");
      }
      lista.forEach(function (a) {
        if (a.grau && !a.ameaca) {
          var op = A.porGrau(a.grau);
          a.ameaca = op[rolador(op.length) - 1].chave;
        }
      });
      saida.ameacas = lista;
      if (e.vinculo) {
        var dv = rolador(6);
        var sala = (e.vinculo.salas.filter(function (s) { return dv >= s[0] && dv <= s[1]; })[0] || [0, 0, 0])[2];
        saida.vinculo = { d6: dv, salasAdiante: sala, sucessos: e.vinculo.sucessos, conhecimento: e.vinculo.conhecimento, coletivo: e.vinculo.coletivo };
      }
      if (e.prazo) saida.tensao = { rodadas: e.prazo.rodadas, senao: e.prazo.senao };
    }
    if (e.tipo === "encontroPorGrau") {
      var d = rolador(6);
      var l = e.tabela.filter(function (x) { return d >= x.de && d <= x.ate; })[0];
      l.graus.forEach(function (g) { var op2 = A.porGrau(g[0]); for (var i = 0; i < g[1]; i++) saida.ameacas.push({ ameaca: op2[rolador(op2.length) - 1].chave, qtd: 1 }); });
    }
    if (e.tipo === "teste" || e.tipo === "testeOpcional") saida.testes.push({ quem: e.quem || "um", conhecimento: e.conhecimento, falha: e.falha || null, sucesso: e.sucesso || null, extremo: e.extremo || null });
    if (e.tipo === "tensao") saida.tensao = { rodadas: e.rodadas, sucessos: e.sucessos, conhecimentos: e.conhecimentos, falha: e.falha || null, porFalha: e.porFalha || null };
    if (e.tipo === "explosao") {
      var dx = rolador(6);
      var lx = e.tabela.filter(function (x) { return dx >= x.de && dx <= x.ate; })[0];
      var qtd = typeof lx.qtd === "number" ? lx.qtd : R.rolarExpressao(lx.qtd, rolador).total;
      saida.testes.push({ quem: "todos", conhecimento: e.teste, bomba: lx.bomba, qtd: qtd });
      saida.notas.push(qtd + "× " + lx.bomba);
    }
    if (e.tipo === "aposta") {
      var da = rolador(6);
      var lado = da <= 3 ? e.baixo : e.alto;
      if (lado.todos.dano) saida.dano = { todos: R.rolarExpressao(lado.todos.dano, rolador).total };
      if (lado.todos.cura) saida.cura = { todos: R.rolarExpressao(lado.todos.cura, rolador).total };
    }
    if (e.tipo === "cura") saida.cura = { todos: e.todos };
    if (e.tipo === "coragem") saida.coragem = { todos: e.todos };
    if (e.tipo === "reparo") saida.reparo = { cada: e.todos };
    if (e.tipo === "moedas") saida.moedas = { cada: e.cada };
    if (e.tipo === "itemPorD6") saida.itensPorPersona = e.tabela;
    if (e.tipo === "contrabando") {
      var dc = rolador(6);
      var armas = dc >= e.armas[0] && dc <= e.armas[1];
      var n = R.rolarExpressao(e.qtd, rolador).total;
      for (var k = 0; k < n; k++) {
        var dp = rolador(6);
        var peso = dp <= e.peso.leve[1] ? "leve" : dp <= e.peso.media[1] ? "media" : "pesada";
        saida.escolhas.push({ tipo: armas ? "arma" : "protecao", peso: peso, texto: (armas ? "Uma arma " : "Uma proteção ") + peso + " à escolha" });
      }
    }
    if (e.tipo === "escolhaDeCada") saida.escolhas.push({ tipo: "santuario", opcoes: e.opcoes });
    if (e.tipo === "modificacaoGratis") saida.escolhas.push({ tipo: "modificacaoGratis", cada: e.cada });
    if (e.tipo === "perderItem") saida.escolhas.push({ tipo: "bolsoFurado" });
    return saida;
  }

  /* Sair do Buraco por uma carta de Saída (ou pela Entrada, se o Efeito
     da Missão não a fechou). */
  function sair(b, cartaId) {
    var c = carta(b, cartaId || b.atual);
    if (!c) return { ok: false, motivo: "Carta inexistente." };
    if (c.tipo === "entrada" && b.regras.entradaFechada) return { ok: false, motivo: "Ache a Saída: a Entrada não serve mais de saída." };
    if (c.tipo !== "saida" && c.tipo !== "entrada") return { ok: false, motivo: "Só se sai por uma Saída ou pela Entrada." };
    if (c.tipo === "saida" && c.resultado && c.resultado.chave === "saidaFalsa") return { ok: false, motivo: "Era uma Saída Falsa." };
    var cura = c.resultado && c.resultado.chave === "saidaDeEmergencia";
    b.encerrado = { por: c.id, curaTotal: !!cura, volta: !(cura) };
    if (b.missao && b.missao.chave === "acheASaida" && c.tipo === "saida") b.missao.cumprida = true;
    return { ok: true, curaTotal: !!cura, eventos: [ev("saiuDoBuraco", { curaTotal: !!cura })] };
  }

  /* A vista dos Jogadores: só cartas exploradas e o que foi revelado.
     Eventos pendentes da Testemunha (vínculos, armadilhas armadas)
     aparecem só como "algo aqui". */
  function vistaDosJogadores(b) {
    var v = R.copiar(b);
    v.cartas = v.cartas.filter(function (c) { return c.revelada; }).map(function (c) {
      return { id: c.id, andar: c.andar, tipo: c.tipo, conexoes: c.conexoes, ligacoes: c.ligacoes, resultado: c.resultado ? { nome: c.resultado.nome, resumo: c.resultado.resumo } : null,
        eventos: c.eventos.filter(function (e) { return e.tipo !== "armadilhaArmada"; }).map(function (e) { return { id: e.id, tipo: e.tipo, estado: e.estado }; }), bloqueada: !!c.bloqueada };
    });
    if (v.missao) v.missao = { nome: v.missao.nome, resumo: v.missao.resumo, cumprida: v.missao.cumprida };
    return v;
  }

  global.RAMAOblivioMotorBuraco = {
    criarBuraco: criarBuraco, explorar: explorar, entrar: entrar, resolverEvento: resolverEvento, expandirEvento: expandirEvento,
    sair: sair, carta: carta, livres: livres, dificuldadeDeEncontro: dificuldadeDeEncontro, rolarTabela: rolarTabela,
    rolarObjetivo: rolarObjetivo, vistaDosJogadores: vistaDosJogadores, novoAndar: novoAndar,
  };
})(typeof window !== "undefined" ? window : globalThis);
