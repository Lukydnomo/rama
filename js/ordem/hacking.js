/* =====================================================================
   R.A.M.A. — Hacking (v2.38 — Arquivos Secretos 4, p. 72–73)
   =====================================================================
   A regra OPCIONAL de Hacking de uma campanha. Desligada por padrão; é
   o mestre quem liga, na aba Hacking da campanha. Não tem nada a ver
   com o Hexatombe, e as ações daqui NÃO são usos gerais de Tecnologia:
   só existem dentro de uma cena de hacking.

   Tudo aqui é acontecimento do RPG. Nada acessa dispositivo, rede ou
   arquivo de verdade: "sistema", "backdoor" e "vírus" são registros da
   história, guardados na planilha da campanha.

   O livro, em resumo (o texto é o do AS4):

     cena de hacking   turnos e rodadas, como combate e investigação; a
                       rodada pode durar horas, dias ou semanas, e a
                       cena pode se repartir por várias sessões
     PS                pontos de segurança do sistema = a DT da ação
                       Hackear (OPRPG p. 48): DT 20 = 20 PS. Zerou,
                       invadiu: acesso aos arquivos por UMA cena; numa
                       cena posterior, o processo todo de novo
     dados virtuais    d6; ao começar, tantos quanto o Intelecto
     no turno          até duas ações, pelo treino em Tecnologia:
       Procurar Brechas (treinado)  teste de Tecnologia, DT 15 e +5 a
                                    cada tentativa seguinte; sucesso:
                                    +1 dado virtual
       Quebrar Códigos (treinado)   gasta dados à escolha; a soma vira
                                    dano nos PS
       Cobrir Rastros (veterano)    teste de Tecnologia contra os PS
                                    máximos; sucesso: na próxima ação que
                                    rolar dados virtuais, rola de novo os
                                    1 e fica com o segundo resultado
       Programar Backdoor (veterano) gasta 1+ dados sem rolar; cada d6
                                    gasto = um acesso ao sistema, de
                                    outro dispositivo, sem hackear de novo
       Plantar Vírus (expert)       gasta 1 dado sem rolar; o vírus espião
                                    avisa de cada interação nova (a
                                    critério do mestre) e, a cada aviso,
                                    1d4: no 1, o firewall o remove
     Imprevistos       no fim de cada rodada, um por agente, pelo número
                       de resultados 1 nos dados virtuais do último turno
                       dele (até 4): Dor nos pulsos (−2 em Tecnologia na
                       próxima rodada), Código mal escrito (perde 1 dado
                       no começo do próximo turno), Rastro detectado (o
                       sistema recupera 2d6 PS), Invasão detectada (perde
                       o progresso; o sistema recupera todos os PS)

   O que o livro NÃO diz, e esta implementação decide — sempre à vista,
   como interpretação, nunca como regra oficial (AMBIGUIDADES):

     · a ordem 1→Dor nos pulsos … 4→Invasão detectada vem da ordem em
       que o livro lista os imprevistos
     · com zero resultados 1 no turno, nenhum imprevisto é sugerido; o
       mestre pode registrar um à mão
     · com Cobrir Rastros, contam os 1 que SOBRARAM depois de rolar de
       novo (os resultados que valeram)
     · "perde o progresso": os PS voltam ao máximo; os dados virtuais que
       o agente tem ficam como estão
     · a DT de Procurar Brechas sobe por agente (cada um tem as próprias
       tentativas)

   Os dados são rolados pela tela (o motor de dados de sempre) e chegam
   aqui como números: o módulo só confere e aplica, sem sorteio próprio.
   Isso o deixa igual no navegador e no Apps Script, onde ele é copiado
   (backend/Campanhas.gs, entre os marcadores >>> e <<<).
   ===================================================================== */

(function (global) {
  "use strict";

  var VERSAO = 1;
  var MAX_CENAS = 12;
  var MAX_PARTICIPANTES = 6;
  var MAX_HISTORICO = 60;
  var MAX_BACKDOORS = 10;
  var MAX_VIRUS = 6;
  var MAX_IMPREVISTOS = 40;
  var ACOES_POR_TURNO = 2;

  var TREINOS = ["treinado", "veterano", "expert"];
  var NIVEL = { treinado: 1, veterano: 2, expert: 3 };
  var NOMES_DO_TREINO = { treinado: "treinado", veterano: "veterano", expert: "expert" };

  var ACOES = [
    { chave: "procurarBrechas", nome: "Procurar Brechas", treino: "treinado" },
    { chave: "quebrarCodigos", nome: "Quebrar Códigos", treino: "treinado" },
    { chave: "cobrirRastros", nome: "Cobrir Rastros", treino: "veterano" },
    { chave: "programarBackdoor", nome: "Programar Backdoor", treino: "veterano" },
    { chave: "plantarVirus", nome: "Plantar Vírus", treino: "expert" },
  ];
  var POR_ACAO = {};
  ACOES.forEach(function (a) { POR_ACAO[a.chave] = a; });

  var IMPREVISTOS = [
    { chave: "dorNosPulsos", uns: 1, nome: "Dor nos pulsos", texto: "−2 em testes de Tecnologia durante a próxima rodada." },
    { chave: "codigoMalEscrito", uns: 2, nome: "Código mal escrito", texto: "Perde um dado virtual no começo do próximo turno." },
    { chave: "rastroDetectado", uns: 3, nome: "Rastro detectado", texto: "O sistema recupera 2d6 PS." },
    { chave: "invasaoDetectada", uns: 4, nome: "Invasão detectada", texto: "O agente perde o progresso do hacking e o sistema recupera todos os seus PS." },
  ];
  var POR_IMPREVISTO = {};
  IMPREVISTOS.forEach(function (x) { POR_IMPREVISTO[x.chave] = x; });

  var AMBIGUIDADES = [
    "A correspondência 1 → Dor nos pulsos, 2 → Código mal escrito, 3 → Rastro detectado, 4 → Invasão detectada segue a ordem em que o livro lista os imprevistos.",
    "Com nenhum resultado 1 no turno, o livro não diz qual imprevisto acontece: nada é sugerido, e o mestre pode registrar um à mão.",
    "Com Cobrir Rastros, contam os resultados 1 que sobraram depois de rolar de novo.",
    "“Perde o progresso do hacking”: os PS voltam ao máximo; os dados virtuais do agente ficam como estão.",
    "A DT de Procurar Brechas (15, +5 a cada tentativa) sobe por agente.",
  ];

  var ESTADOS = ["preparando", "andamento", "invadido", "encerrada"];

  /* ---------------- utilidades ---------------- */

  function lista(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function texto(v, n) { return String(v === undefined || v === null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ").trim().slice(0, n || 120); }
  function inteiro(v, min, max, padrao) {
    var n = Math.round(Number(v));
    if (!isFinite(n)) n = padrao;
    return Math.max(min, Math.min(max, n));
  }
  var ID = /^[A-Za-z0-9_-]{1,40}$/;
  function idOk(v) { var s = String(v || ""); return ID.test(s) ? s : ""; }
  function carimbo(v) { var s = String(v || ""); return /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(s) ? s : ""; }
  function agora() { return new Date().toISOString(); }
  var contador = 0;
  function novoId(prefixo) {
    contador = (contador + 1) % 100000;
    return prefixo + "-" + Date.now().toString(36) + contador.toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  }
  function d6(v) { var n = Math.round(Number(v)); return n >= 1 && n <= 6 ? n : 0; }

  /* ---------------- normalização ---------------- */

  function normalizarParticipante(p) {
    var x = obj(p);
    var id = idOk(x.id);
    var nome = texto(x.nome, 80);
    if (!id || !nome) return null;
    return {
      id: id,
      nome: nome,
      personagemId: texto(x.personagemId, 60).replace(/[^A-Za-z0-9_-]/g, ""),
      treino: TREINOS.indexOf(x.treino) >= 0 ? x.treino : "treinado",
      intelecto: inteiro(x.intelecto, 0, 10, 1),
      dados: inteiro(x.dados, 0, 99, 0),
      tentativas: inteiro(x.tentativas, 0, 99, 0),
      cobrir: x.cobrir === true,
      acoes: inteiro(x.acoes, 0, ACOES_POR_TURNO, 0),
      noTurno: x.noTurno === true,
      uns: inteiro(x.uns, 0, 99, 0),
      unsUltimo: inteiro(x.unsUltimo, 0, 99, 0),
      dor: inteiro(x.dor, 0, 9999, 0),
      perdeDado: x.perdeDado === true,
    };
  }

  function normalizarCena(c) {
    var x = obj(c);
    var id = idOk(x.id);
    var nome = texto(x.nome, 80);
    if (!id || !nome) return null;
    var psMax = inteiro(x.psMax, 1, 99, 15);
    var participantes = lista(x.participantes).map(normalizarParticipante).filter(Boolean).slice(0, MAX_PARTICIPANTES);
    var ids = {};
    participantes = participantes.filter(function (p) { if (ids[p.id]) return false; ids[p.id] = true; return true; });
    var acesso = obj(x.acesso);
    return {
      id: id,
      nome: nome,
      notas: texto(x.notas, 1000),
      psMax: psMax,
      psAtual: inteiro(x.psAtual, 0, psMax, psMax),
      psVisivel: x.psVisivel === true,
      estado: ESTADOS.indexOf(x.estado) >= 0 ? x.estado : "preparando",
      rodada: inteiro(x.rodada, 1, 9999, 1),
      participantes: participantes,
      acesso: acesso.desde ? { desde: carimbo(acesso.desde) || agora(), origem: acesso.origem === "backdoor" ? "backdoor" : "hacking", por: texto(acesso.por, 80) } : null,
      backdoors: lista(x.backdoors).map(function (b) {
        var y = obj(b);
        var bid = idOk(y.id);
        if (!bid) return null;
        var usos = inteiro(y.usos, 1, 99, 1);
        return { id: bid, por: texto(y.por, 80), dispositivo: texto(y.dispositivo, 80), usos: usos, usados: inteiro(y.usados, 0, usos, 0), em: carimbo(y.em) };
      }).filter(Boolean).slice(-MAX_BACKDOORS),
      virus: lista(x.virus).map(function (v) {
        var y = obj(v);
        var vid = idOk(y.id);
        if (!vid) return null;
        return { id: vid, por: texto(y.por, 80), ativo: y.ativo !== false, avisos: inteiro(y.avisos, 0, 999, 0), em: carimbo(y.em), removidoEm: carimbo(y.removidoEm) };
      }).filter(Boolean).slice(-MAX_VIRUS),
      imprevistos: lista(x.imprevistos).map(function (m) {
        var y = obj(m);
        var tipo = POR_IMPREVISTO[y.tipo] ? y.tipo : "";
        if (!tipo) return null;
        return { rodada: inteiro(y.rodada, 1, 9999, 1), participante: texto(y.participante, 80), uns: inteiro(y.uns, 0, 99, 0), tipo: tipo, manual: y.manual === true, nota: texto(y.nota, 200) };
      }).filter(Boolean).slice(-MAX_IMPREVISTOS),
      historico: lista(x.historico).map(function (h) {
        var y = obj(h);
        var t = texto(y.texto, 300);
        return t ? { em: carimbo(y.em), rodada: inteiro(y.rodada, 0, 9999, 0), texto: t } : null;
      }).filter(Boolean).slice(-MAX_HISTORICO),
      criadaEm: carimbo(x.criadaEm),
      atualizadaEm: carimbo(x.atualizadaEm),
    };
  }

  function normalizar(bruto) {
    var x = obj(bruto);
    var cenas = lista(x.cenas).map(normalizarCena).filter(Boolean);
    var ids = {};
    cenas = cenas.filter(function (c) { if (ids[c.id]) return false; ids[c.id] = true; return true; }).slice(-MAX_CENAS);
    return { versao: VERSAO, ativo: x.ativo === true, cenas: cenas };
  }

  function vazio() { return normalizar({}); }

  /* O que o jogador vê: a regra ligada e as cenas em que um personagem
     dele participa — sem as notas do mestre, e com os PS só quando o
     mestre os mostra. */
  function vistaDoJogador(estado, meusPersonagens) {
    var e = normalizar(estado);
    var meus = {};
    lista(meusPersonagens).forEach(function (id) { meus[String(id)] = true; });
    if (!e.ativo) return { ativo: false, cenas: [] };
    return {
      ativo: true,
      cenas: e.cenas.filter(function (c) {
        return c.participantes.some(function (p) { return p.personagemId && meus[p.personagemId]; });
      }).map(function (c) {
        var v = JSON.parse(JSON.stringify(c));
        delete v.notas;
        if (!c.psVisivel) { v.psMax = null; v.psAtual = null; }
        return v;
      }),
    };
  }

  /* ---------------- consultas ---------------- */

  function cena(estado, id) { return lista(estado && estado.cenas).filter(function (c) { return c.id === id; })[0] || null; }
  function participante(c, id) { return lista(c && c.participantes).filter(function (p) { return p.id === id; })[0] || null; }
  function podeAcao(p, chave) {
    var a = POR_ACAO[chave];
    return !!(a && p && NIVEL[p.treino] >= NIVEL[a.treino]);
  }
  function dtDeBrechas(p) { return 15 + 5 * ((p && p.tentativas) || 0); }
  /* Dor nos pulsos vale na rodada marcada. */
  function penalidadeEmTecnologia(c, p) { return p && p.dor && p.dor === c.rodada ? -2 : 0; }
  function imprevistoPorUns(uns) {
    var n = Math.min(4, Math.max(0, Number(uns) || 0));
    return n ? IMPREVISTOS[n - 1] : null;
  }

  function registrar(c, t) {
    c.historico.push({ em: agora(), rodada: c.rodada, texto: texto(t, 300) });
    if (c.historico.length > MAX_HISTORICO) c.historico = c.historico.slice(-MAX_HISTORICO);
    c.atualizadaEm = agora();
  }

  /* ---------------- o mestre: cenas e participantes ---------------- */

  function ligar(estado, sim) {
    estado.ativo = !!sim;
    return { ok: true };
  }

  /* Uma cena: o sistema-alvo e a DT de Hackear dele, que vira os PS. */
  function criarCena(estado, dados) {
    var d = obj(dados);
    var nome = texto(d.nome, 80);
    if (!nome) return { ok: false, motivo: "Dê um nome ao sistema-alvo." };
    var dt = inteiro(d.dt, 0, 99, 0);
    if (dt < 1) return { ok: false, motivo: "Informe a DT de Hackear do sistema (OPRPG p. 48): ela vira os PS." };
    if (estado.cenas.length >= MAX_CENAS) return { ok: false, motivo: "Até " + MAX_CENAS + " cenas de hacking por campanha: encerre e apague uma antiga." };
    var c = normalizarCena({ id: novoId("hk"), nome: nome, notas: d.notas, psMax: dt, psAtual: dt, psVisivel: d.psVisivel === true, criadaEm: agora() });
    registrar(c, "Cena criada: " + nome + " (DT " + dt + " = " + dt + " PS).");
    estado.cenas.push(c);
    return { ok: true, cena: c };
  }

  function apagarCena(estado, id) {
    var antes = estado.cenas.length;
    estado.cenas = estado.cenas.filter(function (c) { return c.id !== id; });
    return antes === estado.cenas.length ? { ok: false, motivo: "Cena não encontrada." } : { ok: true };
  }

  function editarCena(c, dados) {
    var d = obj(dados);
    if (d.nome !== undefined) { var n = texto(d.nome, 80); if (n) c.nome = n; }
    if (d.notas !== undefined) c.notas = texto(d.notas, 1000);
    if (d.psVisivel !== undefined) c.psVisivel = d.psVisivel === true;
    return { ok: true };
  }

  /* Ao entrar, o agente recebe tantos dados virtuais quanto o Intelecto. */
  function adicionarParticipante(c, dados) {
    var d = obj(dados);
    var nome = texto(d.nome, 80);
    if (!nome) return { ok: false, motivo: "Diga quem hackeia." };
    if (TREINOS.indexOf(d.treino) < 0) return { ok: false, motivo: "Hackear exige ao menos treinamento em Tecnologia (e um aparelho próprio que se conecte ao alvo)." };
    if (c.participantes.length >= MAX_PARTICIPANTES) return { ok: false, motivo: "Até " + MAX_PARTICIPANTES + " agentes por cena." };
    var pid = texto(d.personagemId, 60).replace(/[^A-Za-z0-9_-]/g, "");
    if (pid && c.participantes.some(function (p) { return p.personagemId === pid; })) return { ok: false, motivo: "Esse personagem já está na cena." };
    var int = inteiro(d.intelecto, 0, 10, 1);
    var p = normalizarParticipante({ id: novoId("ag"), nome: nome, personagemId: pid, treino: d.treino, intelecto: int, dados: int });
    c.participantes.push(p);
    registrar(c, nome + " entra (" + NOMES_DO_TREINO[p.treino] + " em Tecnologia): " + int + " dado(s) virtual(is).");
    return { ok: true, participante: p };
  }

  function tirarParticipante(c, id) {
    var p = participante(c, id);
    if (!p) return { ok: false, motivo: "Agente não encontrado." };
    c.participantes = c.participantes.filter(function (x) { return x.id !== id; });
    registrar(c, p.nome + " sai da cena.");
    return { ok: true };
  }

  function iniciar(c) {
    if (c.estado !== "preparando") return { ok: false, motivo: "A cena já começou." };
    if (!c.participantes.length) return { ok: false, motivo: "Ninguém está hackeando." };
    c.estado = "andamento";
    c.rodada = 1;
    registrar(c, "O hacking começa (rodada 1).");
    return { ok: true };
  }

  /* ---------------- turnos ---------------- */

  function iniciarTurno(c, id) {
    var p = participante(c, id);
    if (!p) return { ok: false, motivo: "Agente não encontrado." };
    if (c.estado !== "andamento") return { ok: false, motivo: "A cena não está em andamento." };
    if (p.noTurno) return { ok: false, motivo: "O turno de " + p.nome + " já começou." };
    var notas = [];
    if (p.perdeDado) {
      p.perdeDado = false;
      if (p.dados > 0) { p.dados -= 1; notas.push("Código mal escrito: −1 dado virtual."); }
      else notas.push("Código mal escrito: não havia dado virtual para perder.");
    }
    p.noTurno = true;
    p.acoes = 0;
    p.uns = 0;
    registrar(c, "Turno de " + p.nome + "." + (notas.length ? " " + notas.join(" ") : ""));
    return { ok: true, notas: notas };
  }

  function encerrarTurno(c, id) {
    var p = participante(c, id);
    if (!p) return { ok: false, motivo: "Agente não encontrado." };
    if (!p.noTurno) return { ok: false, motivo: "Não é o turno de " + p.nome + "." };
    p.noTurno = false;
    p.unsUltimo = p.uns;
    registrar(c, "Fim do turno de " + p.nome + " (" + p.uns + " resultado[s] 1 nos dados virtuais).");
    return { ok: true };
  }

  function conferirAcao(c, p, chave) {
    if (!p) return "Agente não encontrado.";
    if (c.estado !== "andamento") return c.estado === "invadido" ? "O sistema já caiu: o acesso está liberado nesta cena." : "A cena não está em andamento.";
    if (!p.noTurno) return "Comece o turno de " + p.nome + " primeiro.";
    if (p.acoes >= ACOES_POR_TURNO) return "Até duas ações de hacking por turno.";
    if (!podeAcao(p, chave)) return POR_ACAO[chave].nome + " exige ser " + POR_ACAO[chave].treino + " em Tecnologia.";
    return "";
  }

  function invadiu(c, por) {
    if (c.psAtual > 0 || c.estado !== "andamento") return false;
    c.estado = "invadido";
    c.acesso = { desde: agora(), origem: "hacking", por: por };
    registrar(c, "Os PS chegaram a zero: o sistema caiu. Acesso aos arquivos durante esta cena.");
    return true;
  }

  /* ---------------- as cinco ações ---------------- */

  /* `total`: o resultado do teste de Tecnologia, rolado na ficha. */
  function procurarBrechas(c, id, total) {
    var p = participante(c, id);
    var erro = conferirAcao(c, p, "procurarBrechas");
    if (erro) return { ok: false, motivo: erro };
    var t = Math.round(Number(total));
    if (!isFinite(t)) return { ok: false, motivo: "Informe o resultado do teste de Tecnologia." };
    var dt = dtDeBrechas(p);
    var sucesso = t >= dt;
    p.tentativas += 1;
    p.acoes += 1;
    if (sucesso) p.dados = Math.min(99, p.dados + 1);
    registrar(c, p.nome + " · Procurar Brechas: " + t + " contra DT " + dt + " — " + (sucesso ? "brecha encontrada, +1 dado virtual." : "nada.") +
      (penalidadeEmTecnologia(c, p) ? " (com −2 de Dor nos pulsos)" : ""));
    return { ok: true, sucesso: sucesso, dt: dt };
  }

  /* `valores`: os d6 rolados; `novos`: os d6 rolados de novo para cada 1
     (Cobrir Rastros), na ordem. Fica o segundo resultado. */
  function quebrarCodigos(c, id, valores, novos) {
    var p = participante(c, id);
    var erro = conferirAcao(c, p, "quebrarCodigos");
    if (erro) return { ok: false, motivo: erro };
    var v = lista(valores).map(d6);
    if (!v.length || v.some(function (x) { return !x; })) return { ok: false, motivo: "Os dados virtuais são d6 (1 a 6)." };
    if (v.length > p.dados) return { ok: false, motivo: p.nome + " só tem " + p.dados + " dado(s) virtual(is)." };
    var rerrolados = [];
    if (p.cobrir) {
      var fila = lista(novos).map(d6);
      var precisa = v.filter(function (x) { return x === 1; }).length;
      if (fila.length < precisa || fila.slice(0, precisa).some(function (x) { return !x; })) return { ok: false, motivo: "Cobrir Rastros: role de novo cada resultado 1." };
      var k = 0;
      v = v.map(function (x) { if (x !== 1) return x; var y = fila[k++]; rerrolados.push(y); return y; });
      p.cobrir = false;
    }
    var soma = v.reduce(function (s, x) { return s + x; }, 0);
    var uns = v.filter(function (x) { return x === 1; }).length;
    p.dados -= v.length;
    p.acoes += 1;
    p.uns += uns;
    var antes = c.psAtual;
    c.psAtual = Math.max(0, c.psAtual - soma);
    registrar(c, p.nome + " · Quebrar Códigos: " + v.length + "d6 = " + v.join(", ") + " (soma " + soma + ")" +
      (rerrolados.length ? ", com os 1 rolados de novo (Cobrir Rastros)" : "") + ". PS " + antes + " → " + c.psAtual + ".");
    var caiu = invadiu(c, p.nome);
    return { ok: true, soma: soma, valores: v, uns: uns, invadiu: caiu };
  }

  function cobrirRastros(c, id, total) {
    var p = participante(c, id);
    var erro = conferirAcao(c, p, "cobrirRastros");
    if (erro) return { ok: false, motivo: erro };
    var t = Math.round(Number(total));
    if (!isFinite(t)) return { ok: false, motivo: "Informe o resultado do teste de Tecnologia." };
    var sucesso = t >= c.psMax;
    p.acoes += 1;
    if (sucesso) p.cobrir = true;
    registrar(c, p.nome + " · Cobrir Rastros: " + t + " contra DT " + c.psMax + " (PS máximos) — " + (sucesso ? "na próxima rolagem de dados virtuais, os 1 rolam de novo." : "falhou."));
    return { ok: true, sucesso: sucesso, dt: c.psMax };
  }

  function programarBackdoor(c, id, quantos, dispositivo) {
    var p = participante(c, id);
    var erro = conferirAcao(c, p, "programarBackdoor");
    if (erro) return { ok: false, motivo: erro };
    var n = inteiro(quantos, 0, 99, 0);
    if (n < 1) return { ok: false, motivo: "Gaste ao menos 1 dado virtual." };
    if (n > p.dados) return { ok: false, motivo: p.nome + " só tem " + p.dados + " dado(s) virtual(is)." };
    if (c.backdoors.length >= MAX_BACKDOORS) return { ok: false, motivo: "Backdoors demais neste sistema." };
    p.dados -= n;
    p.acoes += 1;
    var b = { id: novoId("bd"), por: p.nome, dispositivo: texto(dispositivo, 80) || "um dispositivo à escolha", usos: n, usados: 0, em: agora() };
    c.backdoors.push(b);
    registrar(c, p.nome + " · Programar Backdoor: " + n + " dado(s) descartado(s) — " + n + " acesso(s) por " + b.dispositivo + ", sem hackear de novo.");
    return { ok: true, backdoor: b };
  }

  function plantarVirus(c, id) {
    var p = participante(c, id);
    var erro = conferirAcao(c, p, "plantarVirus");
    if (erro) return { ok: false, motivo: erro };
    if (p.dados < 1) return { ok: false, motivo: p.nome + " não tem dado virtual para descartar." };
    if (c.virus.length >= MAX_VIRUS) return { ok: false, motivo: "Vírus demais neste sistema." };
    p.dados -= 1;
    p.acoes += 1;
    var v = { id: novoId("vr"), por: p.nome, ativo: true, avisos: 0, em: agora(), removidoEm: "" };
    c.virus.push(v);
    registrar(c, p.nome + " · Plantar Vírus: 1 dado descartado — o vírus espião avisa das interações novas com o sistema.");
    return { ok: true, virus: v };
  }

  /* ---------------- fim da rodada: imprevistos ---------------- */

  /* A sugestão do livro para cada agente, pelos 1 do último turno. O
     mestre confirma (ou troca) antes de aplicar. */
  function proporImprevistos(c) {
    return c.participantes.map(function (p) {
      var im = imprevistoPorUns(p.unsUltimo);
      return { participante: p.id, nome: p.nome, uns: p.unsUltimo, tipo: im ? im.chave : "" };
    });
  }

  /* `escolhas`: [{ participante, tipo ("" = nenhum), manual }]; `ps2d6`:
     o resultado de 2d6 para cada Rastro detectado, na ordem. */
  function fimDaRodada(c, escolhas, ps2d6) {
    if (c.estado !== "andamento") return { ok: false, motivo: "A cena não está em andamento." };
    if (c.participantes.some(function (p) { return p.noTurno; })) return { ok: false, motivo: "Encerre os turnos abertos antes de fechar a rodada." };
    var rolagens = lista(ps2d6).map(function (x) { return inteiro(x, 2, 12, 0); });
    var k = 0;
    var aplicados = [];
    var rastros = lista(escolhas).filter(function (e) { return e && e.tipo === "rastroDetectado" && participante(c, e.participante); }).length;
    if (rolagens.slice(0, rastros).filter(Boolean).length < rastros) return { ok: false, motivo: "Rastro detectado: role 2d6 de PS recuperados." };
    lista(escolhas).forEach(function (e) {
      var p = participante(c, e && e.participante);
      var tipo = POR_IMPREVISTO[e && e.tipo] ? e.tipo : "";
      if (!p || !tipo) return;
      var nota = "";
      if (tipo === "dorNosPulsos") { p.dor = c.rodada + 1; nota = "−2 em Tecnologia na rodada " + (c.rodada + 1) + "."; }
      if (tipo === "codigoMalEscrito") { p.perdeDado = true; nota = "perde 1 dado virtual no começo do próximo turno."; }
      if (tipo === "rastroDetectado") {
        var r = rolagens[k++];
        var antes = c.psAtual;
        c.psAtual = Math.min(c.psMax, c.psAtual + r);
        nota = "2d6 = " + r + ": PS " + antes + " → " + c.psAtual + ".";
      }
      if (tipo === "invasaoDetectada") { var a2 = c.psAtual; c.psAtual = c.psMax; nota = "o progresso se perde: PS " + a2 + " → " + c.psMax + "."; }
      var reg = { rodada: c.rodada, participante: p.nome, uns: p.unsUltimo, tipo: tipo, manual: e.manual === true, nota: nota };
      c.imprevistos.push(reg);
      aplicados.push(reg);
      registrar(c, "Imprevisto (" + p.nome + ", " + p.unsUltimo + "×1" + (e.manual ? ", escolhido pelo mestre" : "") + "): " + POR_IMPREVISTO[tipo].nome + " — " + nota);
    });
    if (c.imprevistos.length > MAX_IMPREVISTOS) c.imprevistos = c.imprevistos.slice(-MAX_IMPREVISTOS);
    c.participantes.forEach(function (p) { p.unsUltimo = 0; p.uns = 0; p.acoes = 0; });
    c.rodada += 1;
    registrar(c, "Rodada " + c.rodada + ".");
    return { ok: true, aplicados: aplicados };
  }

  /* ---------------- acesso, backdoor e vírus ---------------- */

  /* O acesso vale uma cena: o mestre encerra quando a cena de jogo acaba. */
  function encerrarAcesso(c) {
    if (!c.acesso) return { ok: false, motivo: "Não há acesso aberto." };
    c.acesso = null;
    c.estado = "encerrada";
    registrar(c, "A cena terminou: o acesso aos arquivos acabou. Numa cena posterior, é preciso hackear de novo (ou usar um backdoor).");
    return { ok: true };
  }

  /* Hackear de novo, numa cena posterior: o processo inteiro. Backdoors
     e vírus continuam no sistema. */
  function recomecar(c) {
    c.estado = "preparando";
    c.acesso = null;
    c.psAtual = c.psMax;
    c.rodada = 1;
    c.participantes.forEach(function (p) {
      p.dados = p.intelecto; p.tentativas = 0; p.cobrir = false; p.acoes = 0; p.noTurno = false;
      p.uns = 0; p.unsUltimo = 0; p.dor = 0; p.perdeDado = false;
    });
    registrar(c, "Novo processo de hacking: PS no máximo e dados virtuais pelo Intelecto.");
    return { ok: true };
  }

  function usarBackdoor(c, id) {
    var b = lista(c.backdoors).filter(function (x) { return x.id === id; })[0];
    if (!b) return { ok: false, motivo: "Backdoor não encontrado." };
    if (b.usados >= b.usos) return { ok: false, motivo: "Esse backdoor já foi usado todas as vezes." };
    if (c.acesso) return { ok: false, motivo: "O acesso já está aberto nesta cena." };
    b.usados += 1;
    c.acesso = { desde: agora(), origem: "backdoor", por: b.por };
    if (c.estado !== "andamento") c.estado = "invadido";
    registrar(c, "Backdoor de " + b.por + " (" + b.dispositivo + "): acesso sem hackear (" + b.usados + " de " + b.usos + ").");
    return { ok: true, restam: b.usos - b.usados };
  }

  /* Uma interação nova com o sistema, a critério do mestre: o vírus
     avisa, e o jogador rola 1d4 (no 1, o firewall o remove). */
  function avisoDoVirus(c, id, d4, oQue) {
    var v = lista(c.virus).filter(function (x) { return x.id === id; })[0];
    if (!v || !v.ativo) return { ok: false, motivo: "Esse vírus não está mais no sistema." };
    var r = Math.round(Number(d4));
    if (!(r >= 1 && r <= 4)) return { ok: false, motivo: "Role 1d4." };
    v.avisos += 1;
    var removido = r === 1;
    if (removido) { v.ativo = false; v.removidoEm = agora(); }
    registrar(c, "Vírus de " + v.por + " avisa: " + (texto(oQue, 160) || "nova interação com o sistema") + ". 1d4 = " + r + (removido ? " — o firewall encontrou e removeu o vírus." : "."));
    return { ok: true, removido: removido };
  }

  /* Imprevisto ou nota registrados à mão pelo mestre. */
  function anotar(c, t) {
    var s = texto(t, 300);
    if (!s) return { ok: false, motivo: "Escreva a anotação." };
    registrar(c, s);
    return { ok: true };
  }

  global.RAMAHacking = {
    VERSAO: VERSAO,
    ACOES: ACOES,
    POR_ACAO: POR_ACAO,
    TREINOS: TREINOS,
    IMPREVISTOS: IMPREVISTOS,
    POR_IMPREVISTO: POR_IMPREVISTO,
    AMBIGUIDADES: AMBIGUIDADES,
    ACOES_POR_TURNO: ACOES_POR_TURNO,
    normalizar: normalizar,
    vazio: vazio,
    vistaDoJogador: vistaDoJogador,
    cena: cena,
    participante: participante,
    podeAcao: podeAcao,
    dtDeBrechas: dtDeBrechas,
    penalidadeEmTecnologia: penalidadeEmTecnologia,
    imprevistoPorUns: imprevistoPorUns,
    ligar: ligar,
    criarCena: criarCena,
    apagarCena: apagarCena,
    editarCena: editarCena,
    adicionarParticipante: adicionarParticipante,
    tirarParticipante: tirarParticipante,
    iniciar: iniciar,
    iniciarTurno: iniciarTurno,
    encerrarTurno: encerrarTurno,
    procurarBrechas: procurarBrechas,
    quebrarCodigos: quebrarCodigos,
    cobrirRastros: cobrirRastros,
    programarBackdoor: programarBackdoor,
    plantarVirus: plantarVirus,
    proporImprevistos: proporImprevistos,
    fimDaRodada: fimDaRodada,
    encerrarAcesso: encerrarAcesso,
    recomecar: recomecar,
    usarBackdoor: usarBackdoor,
    avisoDoVirus: avisoDoVirus,
    anotar: anotar,
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
