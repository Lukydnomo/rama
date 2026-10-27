/* =====================================================================
   R.A.M.A. — Ordem Paranormal · perigos complexos da campanha
   =====================================================================
   Arquivos Secretos 5, p. 66–69 ("Como fazer e usar perigos
   complexos?"). Um perigo complexo é uma cena por si só, resolvida com
   testes estendidos (OPRPG p. 77): cada personagem faz UMA ação por
   rodada, as ações listadas são sugestões, e soluções criativas valem a
   critério do mestre. As ações pertencem ao PERIGO — não são usos novos
   de perícia.

   MODELOS são os cinco exemplos do livro, imutáveis. A campanha cria
   INSTÂNCIAS independentes (rodada, participantes, sucessos, falhas,
   estado e registro), guardadas entre sessões. Os dados que o perigo
   sorteia (duração, elemento, a DT da rodada) são rolados por clique e
   gravados: recarregar nunca rola de novo.

   DANO É UMA COISA, PERDA É OUTRA. O registro diz qual é qual e marca o
   que o livro declara irredutível. NADA aqui é aplicado numa ficha: o
   mestre e cada jogador aplicam com a confirmação deles.

   Este arquivo é copiado em backend/Campanhas.gs (entre os marcadores
   ">>> js/ordem/perigos.js" e "<<<"): o servidor normaliza com a MESMA
   regra. Um teste confere que as duas cópias são iguais.
   ===================================================================== */

(function (global) {
  "use strict";

  var MAX_PERIGOS = 20;
  var MAX_PARTICIPANTES = 12;
  var MAX_REGISTRO = 80;
  var ID = /^[A-Za-z0-9_.:-]{1,80}$/;

  function texto(v, n) { return String(v === undefined || v === null ? "" : v).replace(/[\u0000-\u001F]/g, " ").slice(0, n || 120); }
  function inteiro(v, min, max, padrao) {
    var n = Math.round(Number(v));
    if (!isFinite(n)) return padrao;
    return Math.max(min, Math.min(max, n));
  }
  function idOk(v) { var s = String(v || ""); return ID.test(s) ? s : ""; }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function carimbo(v) { return typeof v === "string" && v && !isNaN(new Date(v).getTime()) ? v.slice(0, 40) : ""; }
  function agora() { return new Date().toISOString(); }
  function novoId(prefixo) {
    var U = global.RAMAUtil;
    var u = U && U.uuid ? U.uuid() : Math.random().toString(36).slice(2) + Date.now().toString(36);
    return prefixo + "-" + String(u).replace(/[^A-Za-z0-9]/g, "").slice(0, 20);
  }

  /* =================================================================
     OS CINCO MODELOS (p. 66–69)
     ================================================================= */

  var ELEMENTOS_DA_HORDA = ["sangue", "morte", "conhecimento", "energia"];
  var NOMES_ELEMENTO = { sangue: "Sangue", morte: "Morte", conhecimento: "Conhecimento", energia: "Energia" };
  var RESISTENCIA_DO_ELEMENTO = { sangue: "fortitude", morte: "fortitude", conhecimento: "vontade", energia: "reflexos" };
  var AREAS_DA_CHUVA = { pequena: { nome: "Pequena (uma casa)", testes: 3 }, media: { nome: "Média (um quarteirão)", testes: 5 }, grande: { nome: "Grande (uma cidade)", testes: 7 } };

  var MODELOS = [
    { chave: "explosao", nome: "Explosão em Contagem Regressiva", vd: 80, pagina: 66,
      resumo: "O grupo está diante de um explosivo que entra em contagem regressiva.",
      objetivo: "Desarmar ou escapar da área de explosão.",
      efeito: "Cinco rodadas para se afastar. No fim da quinta, a posição de cada um sai dos sucessos acumulados em correr ou carregar outro: dois ou menos, zona de explosão (8d4 de fogo, 8d4 de impacto e soterrado); três ou quatro, onda de choque (8d4 de impacto); cinco ou mais, escapa ileso. Soterrado: imóvel, 1d6 de impacto no início de cada turno; soltar-se (ou soltar um aliado) pede Atletismo DT 20.",
      rodadas: 5, sucessosParaEscapar: 5, desarmarCom: 3,
      acoes: [
        { chave: "correr", nome: "Correr", teste: "Atletismo DT 20 (Adestramento ou Pilotagem com montaria ou veículo)", dt: 20, conta: "sucesso", dobra: true,
          texto: "Corre para longe do explosivo. Passando, afasta-se; passar por 10 ou mais (ou 20 natural) conta dois sucessos. Mesmos modificadores da ação corrida (OPRPG p. 42)." },
        { chave: "carregarOutro", nome: "Carregar Outro", teste: "Atletismo DT 25", dt: 25, conta: "carregar",
          texto: "Carrega um aliado próximo (no máximo um sucesso de diferença). Passando, um sucesso para si e para o aliado." },
        { chave: "desarmar", nome: "Desarmar Explosivo", teste: "Crime ou Tecnologia DT 20", dt: 20, conta: "desarmar",
          texto: "Sacrifica a corrida para desarmar: passando, um sucesso de desarme. Com três, o explosivo é desarmado e o perigo acaba." },
        { chave: "procurarCaminho", nome: "Procurar Caminho", teste: "Percepção DT 20", dt: 20, conta: "caminho",
          texto: "Analisa o terreno: passando, +5 em todos os testes de correr e carregar outro feitos durante o perigo." },
      ] },
    { chave: "fuga", nome: "Fuga de Horda de Criaturas", vd: 40, pagina: 67,
      resumo: "Uma horda tão grande que fugir é a única opção.",
      objetivo: "Escapar da horda por 1d10+4 rodadas; depois disso, quem sobreviver escapa.",
      efeito: "No início do turno, cada personagem PERDE 2d8 PV — cansaço, desgaste e o que a horda causa; essa perda só pode ser curada depois do perigo. Para fugir, passe em correr ou carregar outro: cinco sucessos ou mais, escapa. Soterrados ficam imóveis e sofrem 1d6 de impacto no início do turno; soltar-se pede Atletismo DT 15.",
      duracao: "1d10+4", sucessosParaEscapar: 5,
      acoes: [
        { chave: "atrair", nome: "Atrair Criaturas", teste: "Enganação DT 15", dt: 15, conta: "proteger",
          texto: "Atrai a horda para proteger os aliados: passando, os aliados próximos (no máximo um sucesso de diferença) não perdem vida por uma rodada, mas o personagem perde 1d8 PV a mais." },
        { chave: "correr", nome: "Correr", teste: "Atletismo DT 15 (Adestramento ou Pilotagem com montaria ou veículo)", dt: 15, conta: "sucesso", dobra: true, metadeDaPerda: true,
          texto: "Foge da horda: passando, afasta-se e a perda de vida do perigo cai à metade por uma rodada. Por 10 ou mais (ou 20 natural), dois sucessos." },
        { chave: "carregarOutro", nome: "Carregar Outro", teste: "Atletismo DT 20", dt: 20, conta: "carregar",
          texto: "Carrega um aliado próximo: um sucesso para si e para o aliado." },
        { chave: "enfrentar", nome: "Enfrentar Criaturas", teste: "teste de ataque DT 15", dt: 15, conta: "proteger",
          texto: "Retarda a horda: passando, os aliados próximos não perdem vida por uma rodada, mas o personagem perde 1d8 PV a mais." },
        { chave: "procurarCaminho", nome: "Procurar Caminho", teste: "Percepção DT 15", dt: 15, conta: "caminho",
          texto: "Passando, +5 em todos os testes de correr e carregar outro durante o perigo." },
      ] },
    { chave: "navio", nome: "Navio Naufragando", vd: 120, pagina: 68,
      resumo: "Um desastre naufraga e inunda a embarcação com o grupo dentro.",
      objetivo: "Escapar do naufrágio em menos de 1d6+6 rodadas; depois disso, o navio é tragado com todos dentro.",
      efeito: "No início do turno, Reflexos para evitar acidentes, destroços e jatos d'água: falhando, 6d6 de impacto; falhando por 10 ou mais, fica preso e uma rodada sem agir para se libertar. A DT é 20+1d6, rolada UMA vez no início de cada rodada e a mesma para todos. Preso falha automaticamente no Reflexos. Cinco sucessos em nadar ou carregar outro: escapa.",
      duracao: "1d6+6", sucessosParaEscapar: 5,
      acoes: [
        { chave: "abrirCaminho", nome: "Abrir Caminho", teste: "teste de ataque DT 23", dt: 23, conta: "grupo", dobra: true,
          texto: "Abre caminho com violência: passando, ele e os aliados próximos se aproximam de uma saída — mas ele falha automaticamente no próximo Reflexos do perigo. Por 10 ou mais (ou 20 natural), dois sucessos." },
        { chave: "carregarOutro", nome: "Carregar Outro", teste: "Atletismo DT 28", dt: 28, conta: "carregar",
          texto: "Nada puxando um aliado próximo: um sucesso para si e para o aliado." },
        { chave: "libertar", nome: "Libertar Aliado", teste: "nenhum teste", dt: 0, conta: "libertar",
          texto: "Liberta um aliado próximo que está preso." },
        { chave: "nadar", nome: "Nadar", teste: "Atletismo DT 23", dt: 23, conta: "sucesso", dobra: true,
          texto: "Nada para fora do navio: passando, aproxima-se de uma saída; por 10 ou mais (ou 20 natural), dois sucessos. Mesmos modificadores da ação natação (OPRPG p. 42)." },
        { chave: "protegerSe", nome: "Proteger-se", teste: "nenhum teste", dt: 0, conta: "protegido",
          texto: "Busca um canto para se proteger: o Reflexos do perigo tem DT 20 (sem o d6) e não há chance de ficar preso — mas não pode nadar nem carregar outro." },
      ] },
    { chave: "predio", nome: "Prédio Ocupado por Criaturas", vd: 180, pagina: 68,
      resumo: "Invadir um prédio e exterminar uma horda de criaturas em pouco tempo.",
      objetivo: "Exterminar a horda em 1d10+5 rodadas.",
      efeito: "Elemento da horda: 1d4 (1 Sangue, 2 Morte, 3 Conhecimento, 4 Energia). No início do turno, cada personagem sofre 5d10 de dano do elemento. A horda tem 360 PV; zerados, o perigo acaba. Ela é imune a dano do seu elemento, a manobras e a efeitos que afetam só uma criatura sem causar dano, e sofre 50% a mais de dano de efeitos de área. Não exterminada a tempo, chegam mais criaturas: só resta fugir (Fuga de Horda de Criaturas).",
      duracao: "1d10+5", pvHorda: 360,
      acoes: [
        { chave: "exterminar", nome: "Exterminar Criaturas", teste: "teste de ataque DT 28", dt: 28, conta: "danoNaHorda",
          texto: "Passando, causa dano aos PV da horda como se tivesse acertado um inimigo em combate." },
        { chave: "protegerSe", nome: "Proteger-se", teste: "resistência DT 28 (Fortitude para Sangue e Morte, Vontade para Conhecimento, Reflexos para Energia)", dt: 28, conta: "metadeProximo",
          texto: "Busca cobertura: passando, reduz à metade o próximo dano do perigo." },
        { chave: "protegerAliado", nome: "Proteger Aliado", teste: "nenhum teste", dt: 0, conta: "protegerAliado",
          texto: "Toma a frente de um aliado: o próximo dano do perigo que ele sofrer é dobrado, mas o aliado não sofre dano do perigo por uma rodada." },
        { chave: "ritual", nome: "Usar Ritual", teste: "Ocultismo DT 28 (no lugar da resistência da horda)", dt: 28, conta: "danoNaHorda",
          texto: "Um ritual de dano contra a horda: se o ritual pede resistência, o personagem faz Ocultismo DT 28 — passando, é como se as criaturas tivessem falhado; falhando, como se tivessem passado." },
      ] },
    { chave: "chuva", nome: "Chuva de Sangue", vd: 300, pagina: 69,
      resumo: "Atravessar uma área tomada por chuva de ácido gástrico e órgãos humanos causada pela entidade de Sangue.",
      objetivo: "Atravessar a chuva de Sangue.",
      efeito: "No início da rodada, cada personagem sofre 5d10 de dano de Sangue (Fortitude DT 35 reduz à metade), 2d10 de dano mental e fica alquebrado (Vontade DT 35 reduz à metade e evita a condição). A área define os sucessos exigidos em avançar: pequena 3, média 5, grande 7. Cada falha: o grupo avança, mas as DT do perigo sobem para 39 por uma rodada. Três falhas: a travessia termina da forma mais desastrosa — todos sofrem 4d10 de Sangue, 2d10 mental e perdem 2d10 PE, sem que nenhum efeito evite ou reduza.",
      falhasMaximas: 3,
      acoes: [
        { chave: "avancar", nome: "Avançar", teste: "Fortitude, ou outra perícia justificada e aprovada pelo mestre (DT varia)", dt: 0, conta: "grupo",
          texto: "Os personagens se alternam fazendo testes até a quantidade exigida (ou três falhas). Fortitude pode repetir; cada outra perícia vale UMA vez no perigo. Teste estendido em grupo e aberto (OPRPG p. 77). Independentemente do resultado, o grupo atravessa: o que está em jogo é o estado de cada um no fim." },
      ] },
  ];
  var POR_MODELO = {};
  MODELOS.forEach(function (m) { POR_MODELO[m.chave] = m; });
  function modelo(chave) { return POR_MODELO[chave] || null; }
  function semTeste(a) { return !!a && a.teste === "nenhum teste"; }
  function acaoDoModelo(m, chave) { return m ? m.acoes.filter(function (a) { return a.chave === chave; })[0] || null : null; }

  /* =================================================================
     NORMALIZAÇÃO
     ================================================================= */

  var ESTADOS_DO_PARTICIPANTE = ["ativo", "escapou", "preso", "soterrado", "caido"];

  function normalizarParticipante(p) {
    var x = obj(p);
    var id = idOk(x.id);
    var nome = texto(x.nome, 80).trim();
    if (!id || !nome) return null;
    return {
      id: id, nome: nome,
      personagemId: /^[A-Za-z0-9-]{8,60}$/.test(String(x.personagemId || "")) ? String(x.personagemId) : "",
      sucessos: inteiro(x.sucessos, 0, 99, 0),
      estado: ESTADOS_DO_PARTICIPANTE.indexOf(x.estado) >= 0 ? x.estado : "ativo",
      caminho: x.caminho === true,
      ultimaRodada: inteiro(x.ultimaRodada, 0, 999, 0),
      protegidoAte: inteiro(x.protegidoAte, 0, 999, 0),
      metadeProximo: x.metadeProximo === true,
      dobroProximo: x.dobroProximo === true,
      metadeDaPerdaAte: inteiro(x.metadeDaPerdaAte, 0, 999, 0),
      falhaAutomatica: x.falhaAutomatica === true,
      presoAte: inteiro(x.presoAte, 0, 999, 0),
      protegido: x.protegido === true,
      perdaAcumulada: inteiro(x.perdaAcumulada, 0, 9999, 0),
      zona: ["explosao", "onda", "ileso"].indexOf(x.zona) >= 0 ? x.zona : "",
    };
  }

  function normalizarRegistro(r) {
    var x = obj(r);
    var id = idOk(x.id);
    if (!id) return null;
    return {
      id: id, rodada: inteiro(x.rodada, 0, 999, 0), participanteId: idOk(x.participanteId),
      tipo: ["acao", "efeito", "rodada", "solucao", "fim", "nota"].indexOf(x.tipo) >= 0 ? x.tipo : "nota",
      acao: texto(x.acao, 40), passou: x.passou === true, total: inteiro(x.total, -99, 999, 0),
      /* Dano e perda não se confundem; irredutível é o que o livro diz que
         nenhum efeito evita ou reduz. */
      natureza: x.natureza === "perda" ? "perda" : (x.natureza === "dano" ? "dano" : ""),
      irredutivel: x.irredutivel === true,
      valor: inteiro(x.valor, 0, 9999, 0), expressao: texto(x.expressao, 60),
      texto: texto(x.texto, 300), em: carimbo(x.em),
    };
  }

  function normalizarInstancia(i) {
    var x = obj(i);
    var id = idOk(x.id);
    var m = modelo(x.modelo);
    if (!id || !m) return null;
    var enc = obj(x.encerrado);
    var vistos = {};
    return {
      id: id, modelo: m.chave,
      nome: texto(x.nome, 120).trim() || m.nome,
      criadoEm: carimbo(x.criadoEm),
      rodada: inteiro(x.rodada, 0, 999, 0),
      rodadasTotal: inteiro(x.rodadasTotal, 0, 99, m.rodadas || 0),
      sorteioDuracao: texto(x.sorteioDuracao, 60),
      dtRodada: inteiro(x.dtRodada, 0, 99, 0),
      elemento: ELEMENTOS_DA_HORDA.indexOf(x.elemento) >= 0 ? x.elemento : "",
      pvHorda: inteiro(x.pvHorda, 0, 9999, m.pvHorda || 0),
      area: AREAS_DA_CHUVA[x.area] ? x.area : "",
      sucessosDoGrupo: inteiro(x.sucessosDoGrupo, 0, 99, 0),
      falhasDoGrupo: inteiro(x.falhasDoGrupo, 0, 9, 0),
      dtElevadaAte: inteiro(x.dtElevadaAte, 0, 999, 0),
      periciasUsadas: lista(x.periciasUsadas).map(function (k) { return texto(k, 40).toLowerCase(); }).filter(function (k) { if (!k || vistos[k]) return false; vistos[k] = true; return true; }).slice(0, 30),
      desarmes: inteiro(x.desarmes, 0, 9, 0),
      participantes: lista(x.participantes).map(normalizarParticipante).filter(Boolean).slice(0, MAX_PARTICIPANTES),
      registro: lista(x.registro).map(normalizarRegistro).filter(Boolean).slice(-MAX_REGISTRO),
      encerrado: x.encerrado ? { em: carimbo(enc.em), motivo: texto(enc.motivo, 40), texto: texto(enc.texto, 300) } : null,
      origem: idOk(x.origem),
    };
  }

  function normalizar(bruto) {
    var b = obj(bruto);
    var vistos = {};
    return {
      ativo: b.ativo === true,
      perigos: lista(b.perigos).map(normalizarInstancia).filter(function (p) { if (!p || vistos[p.id]) return false; vistos[p.id] = true; return true; }).slice(-MAX_PERIGOS),
    };
  }

  function falha(m) { return { ok: false, motivo: m }; }
  function ok(extra) { return Object.assign({ ok: true, avisos: [] }, extra || {}); }

  function ligar(estado, sim) { estado.ativo = !!sim; return ok(); }

  function perigo(estado, id) { return estado.perigos.filter(function (p) { return p.id === id; })[0] || null; }
  function participante(inst, id) { return inst.participantes.filter(function (p) { return p.id === id; })[0] || null; }

  function registrar(inst, r) {
    var n = normalizarRegistro(Object.assign({ id: novoId("pr"), rodada: inst.rodada, em: agora() }, r));
    if (n) inst.registro.push(n);
    inst.registro = inst.registro.slice(-MAX_REGISTRO);
    return n;
  }

  /* =================================================================
     CRIAR, PARTICIPANTES, RODADAS
     ================================================================= */

  /* `sorteios`: o que a TELA rolou — { duracao: total da expressão do
     modelo, elemento: 1d4 }. Gravado: recarregar não rola de novo. */
  function criar(estado, chaveModelo, nome, sorteios, area) {
    var m = modelo(chaveModelo);
    if (!m) return falha("Perigo desconhecido.");
    if (estado.perigos.filter(function (p) { return !p.encerrado; }).length >= MAX_PERIGOS) return falha("Há perigos demais em andamento.");
    var s = sorteios || {};
    var inst = normalizarInstancia({ id: novoId("per"), modelo: m.chave, nome: nome || m.nome, criadoEm: agora() });
    if (m.duracao) {
      var d = inteiro(s.duracao, 1, 99, 0);
      if (!d) return falha("Role a duração (" + m.duracao + ").");
      inst.rodadasTotal = d;
      inst.sorteioDuracao = m.duracao + " = " + d;
    }
    if (m.chave === "predio") {
      var e = inteiro(s.elemento, 1, 4, 0);
      if (!e) return falha("Role o elemento da horda (1d4).");
      inst.elemento = ELEMENTOS_DA_HORDA[e - 1];
      inst.pvHorda = m.pvHorda;
    }
    if (m.chave === "chuva") {
      if (!AREAS_DA_CHUVA[area]) return falha("Escolha o tamanho da área.");
      inst.area = area;
    }
    estado.perigos.push(inst);
    estado.perigos = estado.perigos.slice(-MAX_PERIGOS);
    return ok({ perigo: inst });
  }

  function adicionarParticipante(inst, nome, personagemId) {
    if (inst.encerrado) return falha("O perigo já terminou.");
    if (inst.participantes.length >= MAX_PARTICIPANTES) return falha("Participantes demais.");
    var n = texto(nome, 80).trim();
    if (!n) return falha("Diga o nome.");
    if (personagemId && inst.participantes.some(function (p) { return p.personagemId === personagemId; })) return falha(n + " já participa.");
    var p = normalizarParticipante({ id: novoId("pp"), nome: n, personagemId: personagemId });
    inst.participantes.push(p);
    return ok({ participante: p });
  }
  function removerParticipante(inst, id) {
    var antes = inst.participantes.length;
    inst.participantes = inst.participantes.filter(function (p) { return p.id !== id; });
    return inst.participantes.length < antes ? ok() : falha("Participante não encontrado.");
  }

  function rodadaDaDtElevada(inst) { return inst.dtElevadaAte && inst.dtElevadaAte >= inst.rodada; }

  /* Nova rodada. Navio: `d6` é a rolagem da DT da rodada (20+1d6), UMA
     para todos. */
  function novaRodada(inst, d6) {
    if (inst.encerrado) return falha("O perigo já terminou.");
    var m = modelo(inst.modelo);
    if (inst.rodadasTotal && inst.rodada >= inst.rodadasTotal) return falha("As rodadas do perigo acabaram: encerre-o.");
    if (m.chave === "navio") {
      var v = inteiro(d6, 1, 6, 0);
      if (!v) return falha("Role 1d6 para a DT da rodada (20+1d6).");
      inst.rodada += 1;
      inst.dtRodada = 20 + v;
    } else {
      inst.rodada += 1;
    }
    inst.participantes.forEach(function (p) { if (p.estado === "preso" && p.presoAte && p.presoAte < inst.rodada) p.estado = "ativo"; });
    registrar(inst, { tipo: "rodada", texto: "Rodada " + inst.rodada + (inst.rodadasTotal ? " de " + inst.rodadasTotal : "") + (m.chave === "navio" ? " — DT de Reflexos " + inst.dtRodada + " (20+" + (inst.dtRodada - 20) + "), a mesma para todos." : "") +
      (m.chave === "chuva" && rodadaDaDtElevada(inst) ? " — DT das resistências 39 nesta rodada (falha anterior)." : "") });
    return ok({ rodada: inst.rodada });
  }

  /* =================================================================
     AÇÕES (uma por personagem por rodada)
     -----------------------------------------------------------------
     resultado = { passou, total, natural20, porDez, aliadoId, pericia,
     dano, area } — o que a tela rolou e a mesa confirmou.
     ================================================================= */

  function somarSucessos(inst, p, n) {
    var m = modelo(inst.modelo);
    p.sucessos = Math.min(99, p.sucessos + n);
    if (m.sucessosParaEscapar && p.sucessos >= m.sucessosParaEscapar && m.chave !== "explosao") p.estado = "escapou";
  }

  function registrarAcao(inst, participanteId, chaveAcao, resultado) {
    if (inst.encerrado) return falha("O perigo já terminou.");
    if (!inst.rodada) return falha("Comece a primeira rodada.");
    var m = modelo(inst.modelo);
    var a = acaoDoModelo(m, chaveAcao);
    if (!a) return falha("Ação desconhecida neste perigo.");
    var p = participante(inst, participanteId);
    if (!p) return falha("Participante não encontrado.");
    if (p.estado === "escapou") return falha(p.nome + " já escapou.");
    if (p.ultimaRodada === inst.rodada) return falha(p.nome + " já agiu nesta rodada (uma ação por rodada).");
    if (p.estado === "preso" && a.chave !== "libertar") return falha(p.nome + " está preso: uma rodada sem agir para se libertar.");
    if (m.chave === "navio" && p.protegido && (a.chave === "nadar" || a.chave === "carregarOutro")) return falha("Protegido, não pode nadar nem carregar outro nesta rodada.");
    var r = obj(resultado);
    /* Só as ações "nenhum teste" passam sozinhas; Avançar (Chuva) tem DT
       variável, mas tem teste. */
    var passou = semTeste(a) ? true : r.passou === true;
    var dobra = a.dobra && passou && (r.natural20 === true || r.porDez === true);
    var aliado = r.aliadoId ? participante(inst, r.aliadoId) : null;
    var notas = [];
    /* Confere o aliado ANTES de mexer em qualquer coisa: uma ação recusada
       não gasta a vez do personagem. */
    if (passou && (a.conta === "carregar" || a.conta === "protegerAliado") && (!aliado || aliado.id === p.id)) return falha("Escolha o aliado.");
    if (passou && a.conta === "carregar" && Math.abs(aliado.sucessos - p.sucessos) > 1) return falha("Só um aliado próximo (no máximo um sucesso de diferença).");
    if (a.conta === "libertar" && (!aliado || aliado.estado !== "preso")) return falha("Escolha um aliado preso.");

    if (m.chave === "chuva") {
      var k = texto(r.pericia, 40).toLowerCase() || "fortitude";
      if (k !== "fortitude" && inst.periciasUsadas.indexOf(k) >= 0) return falha("Cada perícia que não seja Fortitude só pode ser usada uma vez neste perigo.");
      if (k !== "fortitude") inst.periciasUsadas.push(k);
      if (passou) inst.sucessosDoGrupo += 1;
      else {
        inst.falhasDoGrupo += 1;
        inst.dtElevadaAte = inst.rodada + 1;
        notas.push("Falha: o grupo avança com mais dor — as DT de resistência do perigo sobem para 39 na próxima rodada.");
      }
      p.ultimaRodada = inst.rodada;
      registrar(inst, { tipo: "acao", participanteId: p.id, acao: a.chave, passou: passou, total: inteiro(r.total, -99, 999, 0), texto: p.nome + " · Avançar (" + (r.pericia || "Fortitude") + "): " + (passou ? "sucesso" : "falha") + "." });
      var exigidos = AREAS_DA_CHUVA[inst.area].testes;
      if (inst.falhasDoGrupo >= m.falhasMaximas) return ok({ fim: "desastre", avisos: notas.concat(["Três falhas: a travessia termina da forma mais desastrosa — encerre o perigo para o efeito final."]) });
      if (inst.sucessosDoGrupo >= exigidos) return ok({ fim: "atravessou", avisos: notas.concat(["Sucessos exigidos atingidos: o grupo atravessou."]) });
      return ok({ avisos: notas });
    }

    p.ultimaRodada = inst.rodada;
    if (passou) {
      if (a.conta === "sucesso") somarSucessos(inst, p, dobra ? 2 : 1);
      if (a.conta === "carregar") {
        if (!aliado || aliado.id === p.id) return falha("Escolha o aliado carregado.");
        if (Math.abs(aliado.sucessos - p.sucessos) > 1) return falha("Só um aliado próximo (no máximo um sucesso de diferença).");
        somarSucessos(inst, p, 1);
        somarSucessos(inst, aliado, 1);
      }
      if (a.conta === "grupo" && m.chave === "navio") {
        var proximos = inst.participantes.filter(function (q) { return q.estado !== "escapou" && Math.abs(q.sucessos - p.sucessos) <= 1; });
        proximos.forEach(function (q) { somarSucessos(inst, q, dobra ? 2 : 1); });
        p.falhaAutomatica = true;
        notas.push("Abrir Caminho: " + p.nome + " falha automaticamente no próximo Reflexos do perigo.");
      }
      if (a.conta === "desarmar") {
        inst.desarmes += 1;
        if (inst.desarmes >= m.desarmarCom) {
          inst.encerrado = { em: agora(), motivo: "desarmado", texto: "Três sucessos em Desarmar Explosivo: o explosivo foi desarmado." };
          notas.push("O explosivo foi desarmado: o perigo acabou.");
        }
      }
      if (a.conta === "caminho") p.caminho = true;
      if (a.conta === "proteger") {
        inst.participantes.forEach(function (q) { if (q.id !== p.id && Math.abs(q.sucessos - p.sucessos) <= 1) q.protegidoAte = inst.rodada + 1; });
        notas.push(p.nome + " perde 1d8 PV adicionais (role no efeito do perigo).");
      }
      if (a.conta === "libertar") {
        if (!aliado || aliado.estado !== "preso") return falha("Escolha um aliado preso.");
        aliado.estado = "ativo"; aliado.presoAte = 0;
      }
      if (a.conta === "protegido") p.protegido = true;
      if (a.conta === "metadeProximo") p.metadeProximo = true;
      if (a.conta === "protegerAliado") {
        if (!aliado || aliado.id === p.id) return falha("Escolha o aliado protegido.");
        p.dobroProximo = true;
        aliado.protegidoAte = inst.rodada + 1;
      }
      if (a.conta === "danoNaHorda") {
        var dano = inteiro(r.dano, 0, 9999, 0);
        if (r.area === true) { var antesA = dano; dano = Math.floor(dano * 1.5); notas.push("Efeito de área: +50% (" + antesA + " → " + dano + ")."); }
        if (r.doElemento === true) { dano = 0; notas.push("A horda é imune a dano do próprio elemento."); }
        inst.pvHorda = Math.max(0, inst.pvHorda - dano);
        if (inst.pvHorda === 0) inst.encerrado = { em: agora(), motivo: "exterminada", texto: "A horda foi exterminada." };
      }
      if (a.metadeDaPerda) p.metadeDaPerdaAte = inst.rodada + 1;
    }
    registrar(inst, { tipo: "acao", participanteId: p.id, acao: a.chave, passou: passou, total: inteiro(r.total, -99, 999, 0),
      valor: a.conta === "danoNaHorda" ? inteiro(r.dano, 0, 9999, 0) : 0,
      texto: p.nome + " · " + a.nome + ": " + (semTeste(a) ? "feito" : passou ? (dobra ? "sucesso por 10+ (dois)" : "sucesso") : "falha") + (aliado ? " (" + aliado.nome + ")" : "") + "." });
    return ok({ avisos: notas });
  }

  /* Uma solução criativa aprovada pelo mestre: fica registrada como
     solução da mesa, nunca como ação oficial; os sucessos (se houver)
     são os que a mesa decidiu. */
  function solucaoAlternativa(inst, participanteId, textoDaSolucao, sucessos) {
    if (inst.encerrado) return falha("O perigo já terminou.");
    var t = texto(textoDaSolucao, 300).trim();
    if (!t) return falha("Descreva a solução.");
    var p = participanteId ? participante(inst, participanteId) : null;
    var n = inteiro(sucessos, 0, 5, 0);
    if (p && n) somarSucessos(inst, p, n);
    if (!p && n && inst.modelo === "chuva") inst.sucessosDoGrupo += n;
    registrar(inst, { tipo: "solucao", participanteId: p ? p.id : "", texto: "Solução da mesa" + (p ? " (" + p.nome + ")" : "") + ": " + t + (n ? " — +" + n + " sucesso(s), decisão do mestre." : "") });
    return ok();
  }

  /* =================================================================
     O EFEITO DO PERIGO (início do turno ou da rodada)
     -----------------------------------------------------------------
     Devolve o PLANO — quem, o que rolar, dano ou perda, a DT — para a
     tela rolar e mostrar. Nada é aplicado numa ficha.
     ================================================================= */

  function planoDoEfeito(inst, participanteId) {
    var m = modelo(inst.modelo);
    var p = participante(inst, participanteId);
    if (!p) return falha("Participante não encontrado.");
    var l = [];
    if (m.chave === "fuga") {
      if (p.protegidoAte >= inst.rodada) l.push({ texto: "Protegido por um aliado nesta rodada: não perde vida." });
      else l.push({ rolar: "2d8", natureza: "perda", recurso: "PV", metade: p.metadeDaPerdaAte >= inst.rodada, texto: "Perda de PV da horda (só pode ser curada depois do perigo)" + (p.metadeDaPerdaAte >= inst.rodada ? " — à metade por ter corrido." : ".") });
      if (p.estado === "soterrado") l.push({ rolar: "1d6", natureza: "dano", tipoDano: "impacto", texto: "Soterrado: 1d6 de impacto." });
    }
    if (m.chave === "navio") {
      var dt = p.protegido ? 20 : inst.dtRodada;
      if (p.estado === "preso" || p.falhaAutomatica) l.push({ automatica: true, texto: "Falha automaticamente no Reflexos (" + (p.estado === "preso" ? "preso" : "Abrir Caminho") + ")." });
      l.push({ teste: "reflexos", dt: dt, texto: "Reflexos DT " + dt + (p.protegido ? " (protegido: sem o d6 e sem ficar preso)" : "") + ": falhando, 6d6 de impacto; por 10 ou mais, preso." });
      l.push({ rolar: "6d6", natureza: "dano", tipoDano: "impacto", texto: "Se falhar: 6d6 de impacto." });
    }
    if (m.chave === "predio") {
      if (p.protegidoAte >= inst.rodada) l.push({ texto: "Protegido por um aliado nesta rodada: não sofre dano do perigo." });
      else l.push({ rolar: "5d10", natureza: "dano", tipoDano: inst.elemento, metade: p.metadeProximo, dobro: p.dobroProximo,
        texto: "5d10 de dano de " + NOMES_ELEMENTO[inst.elemento] + (p.metadeProximo ? " — à metade (Proteger-se)" : "") + (p.dobroProximo ? " — dobrado (Proteger Aliado)" : "") + "." });
    }
    if (m.chave === "chuva") {
      var dtC = rodadaDaDtElevada(inst) ? 39 : 35;
      l.push({ rolar: "5d10", natureza: "dano", tipoDano: "Sangue", teste: "fortitude", dt: dtC, texto: "5d10 de dano de Sangue (Fortitude DT " + dtC + " reduz à metade)." });
      l.push({ rolar: "2d10", natureza: "dano", tipoDano: "mental", teste: "vontade", dt: dtC, texto: "2d10 de dano mental e alquebrado (Vontade DT " + dtC + " reduz à metade e evita a condição)." });
    }
    if (m.chave === "explosao" && p.estado === "soterrado") l.push({ rolar: "1d6", natureza: "dano", tipoDano: "impacto", texto: "Soterrado: 1d6 de impacto (soltar-se: Atletismo DT 20)." });
    return ok({ participante: p, partes: l });
  }

  /* O resultado do efeito, já rolado: registra (e gasta os marcadores
     de "próximo dano"). `falhouPorDez`: navio, fica preso. */
  function registrarEfeito(inst, participanteId, partes) {
    var p = participante(inst, participanteId);
    if (!p) return falha("Participante não encontrado.");
    lista(partes).forEach(function (x) {
      var v = inteiro(x.valor, 0, 9999, 0);
      if (x.natureza === "perda" && inst.modelo === "fuga") p.perdaAcumulada = Math.min(9999, p.perdaAcumulada + v);
      registrar(inst, { tipo: "efeito", participanteId: p.id, natureza: x.natureza, irredutivel: x.irredutivel === true, valor: v, expressao: x.expressao,
        texto: p.nome + ": " + (x.natureza === "perda" ? "perde " : "sofre ") + v + (x.recurso ? " " + x.recurso : "") + (x.tipoDano ? " de " + x.tipoDano : "") + (x.irredutivel ? " (irredutível)" : "") + (x.nota ? " — " + x.nota : "") + "." });
    });
    if (inst.modelo === "predio") { p.metadeProximo = false; p.dobroProximo = false; }
    if (inst.modelo === "navio") {
      p.falhaAutomatica = false;
      var presa = lista(partes).some(function (x) { return x.falhouPorDez === true; });
      if (presa && !p.protegido) { p.estado = "preso"; p.presoAte = inst.rodada + 1; }
      p.protegido = false;
    }
    return ok();
  }

  /* =================================================================
     ENCERRAR
     ================================================================= */

  function encerrar(inst, motivo) {
    if (inst.encerrado) return falha("O perigo já terminou.");
    var m = modelo(inst.modelo);
    var avisos = [];
    if (m.chave === "explosao" && motivo !== "desarmado") {
      inst.participantes.forEach(function (p) {
        p.zona = p.sucessos >= 5 ? "ileso" : p.sucessos >= 3 ? "onda" : "explosao";
        if (p.zona === "explosao") p.estado = "soterrado";
        avisos.push(p.nome + ": " + (p.zona === "ileso" ? "escapa ileso" : p.zona === "onda" ? "onda de choque — 8d4 de impacto" : "zona de explosão — 8d4 de fogo, 8d4 de impacto e soterrado") + ".");
      });
    }
    if (m.chave === "fuga") inst.participantes.forEach(function (p) { if (p.estado !== "caido") p.estado = "escapou"; });
    if (m.chave === "navio") inst.participantes.forEach(function (p) { if (p.estado !== "escapou") avisos.push(p.nome + ": tragado com o navio para as profundezas."); });
    if (m.chave === "chuva" && inst.falhasDoGrupo >= m.falhasMaximas) {
      avisos.push("Travessia desastrosa: todos sofrem 4d10 de Sangue e 2d10 de dano mental e perdem 2d10 PE — nenhum efeito evita ou reduz.");
    }
    inst.encerrado = { em: agora(), motivo: texto(motivo || "fim", 40), texto: avisos.join(" ") };
    registrar(inst, { tipo: "fim", texto: "Perigo encerrado" + (motivo ? " (" + motivo + ")" : "") + "." + (avisos.length ? " " + avisos.join(" ") : "") });
    return ok({ avisos: avisos });
  }

  /* O efeito final que a fonte declara, para a tela rolar (explosão por
     zona e a travessia desastrosa da chuva). */
  function efeitoFinal(inst, participanteId) {
    var p = participante(inst, participanteId);
    if (!p || !inst.encerrado) return [];
    if (inst.modelo === "explosao") {
      if (p.zona === "explosao") return [{ rolar: "8d4", natureza: "dano", tipoDano: "fogo" }, { rolar: "8d4", natureza: "dano", tipoDano: "impacto" }];
      if (p.zona === "onda") return [{ rolar: "8d4", natureza: "dano", tipoDano: "impacto" }];
    }
    if (inst.modelo === "chuva" && inst.falhasDoGrupo >= 3) {
      return [{ rolar: "4d10", natureza: "dano", tipoDano: "Sangue", irredutivel: true }, { rolar: "2d10", natureza: "dano", tipoDano: "mental", irredutivel: true },
        { rolar: "2d10", natureza: "perda", recurso: "PE", irredutivel: true }];
    }
    return [];
  }

  /* O prédio não exterminado a tempo vira uma fuga — um perigo novo,
     com os mesmos participantes (os sucessos recomeçam). */
  function transicaoParaFuga(estado, inst, duracao) {
    if (inst.modelo !== "predio") return falha("Só o Prédio Ocupado vira fuga.");
    if (!inst.encerrado) encerrar(inst, "tempo");
    var r = criar(estado, "fuga", "Fuga — " + inst.nome, { duracao: duracao });
    if (!r.ok) return r;
    inst.participantes.forEach(function (p) { adicionarParticipante(r.perigo, p.nome, p.personagemId); });
    r.perigo.origem = inst.id;
    return r;
  }

  /* A VISTA de um jogador: os perigos em que um personagem dele está,
     sem o registro dos outros. */
  function vistaDoJogador(estado, meusPersonagens) {
    var meus = {};
    lista(meusPersonagens).forEach(function (id) { meus[String(id)] = true; });
    return {
      ativo: estado.ativo,
      perigos: estado.perigos.filter(function (i) { return i.participantes.some(function (p) { return p.personagemId && meus[p.personagemId]; }); }).map(function (i) {
        var m = modelo(i.modelo);
        var mineIds = {};
        i.participantes.forEach(function (p) { if (p.personagemId && meus[p.personagemId]) mineIds[p.id] = true; });
        return {
          id: i.id, modelo: i.modelo, nome: i.nome, objetivo: m.objetivo, efeito: m.efeito, rodada: i.rodada, rodadasTotal: i.rodadasTotal,
          dtRodada: i.dtRodada, elemento: i.elemento, pvHorda: i.pvHorda, area: i.area, sucessosDoGrupo: i.sucessosDoGrupo, falhasDoGrupo: i.falhasDoGrupo,
          encerrado: i.encerrado,
          participantes: i.participantes.map(function (p) { return { id: p.id, nome: p.nome, sucessos: p.sucessos, estado: p.estado, zona: p.zona, meu: !!mineIds[p.id] }; }),
          registro: i.registro.filter(function (r) { return !r.participanteId || mineIds[r.participanteId] || r.tipo === "rodada" || r.tipo === "fim"; }).slice(-20),
        };
      }),
    };
  }

  global.RAMAPerigos = {
    MODELOS: MODELOS,
    AREAS_DA_CHUVA: AREAS_DA_CHUVA,
    ELEMENTOS_DA_HORDA: ELEMENTOS_DA_HORDA,
    NOMES_ELEMENTO: NOMES_ELEMENTO,
    RESISTENCIA_DO_ELEMENTO: RESISTENCIA_DO_ELEMENTO,
    modelo: modelo,
    semTeste: semTeste,
    normalizar: normalizar,
    normalizarInstancia: normalizarInstancia,
    ligar: ligar,
    perigo: perigo,
    participante: participante,
    criar: criar,
    adicionarParticipante: adicionarParticipante,
    removerParticipante: removerParticipante,
    novaRodada: novaRodada,
    registrarAcao: registrarAcao,
    solucaoAlternativa: solucaoAlternativa,
    planoDoEfeito: planoDoEfeito,
    registrarEfeito: registrarEfeito,
    encerrar: encerrar,
    efeitoFinal: efeitoFinal,
    transicaoParaFuga: transicaoParaFuga,
    vistaDoJogador: vistaDoJogador,
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
