/* =====================================================================
   R.A.M.A. — Ordem Paranormal · estados do Arquivos Secretos 3
   =====================================================================
   O que o Arquivos Secretos 3 (v1.0) guarda numa ficha, e a regra de
   cada coisa — sem tela e sem rede. A ficha desenha (js/paginas/
   ficha-arquivo3.js); as contas (js/ordem/regras.js) perguntam daqui.

     cronologia    missão, dia, semana e sessão DA CAMPANHA, contados à
                   mão ("Nova missão", "Novo dia"…). Tudo o que o livro
                   mede em tempo ("uma vez por dia", "24 horas", "uma vez
                   por sessão", "a cada semana") olha estes contadores,
                   nunca o relógio do computador
     sacrificio    Digno de Sacrifício e o estigma registrados pela mesa,
                   e o poder de sacrifício que eles concedem (p. 110-111)
     flagelo       os PV pagos com Poder do Flagelo que ainda não voltaram
                   e os usos de Recuperação Flagelante no interlúdio
     guardiao      os usos de Guardião da Tropa (a SAN só volta no evento)
     entrada       Entrada Triunfal: a sessão em que foi usada e o bônus
     ensaio        Ensaio (Combatente Performático): o bônus e o
                   interlúdio em que vale — o seu ou o de quem ensaiou
     ritmo         Rítmo Contagiante: a cena e os críticos já contados
                   (por id: recarregar a ficha não conta de novo)
     ambidestria   a penalidade de –1d20 até o próximo turno
     instrumento   o item do Instrumento Elétrico de Combate
     paixoes       Regras da Paixão: cada laço com o que deu de PV e PE
     recordacoes   Boas Recordações: fotos e o +1d6 do dia
     batalha       Batalha de Intenções em curso
     circo         as partidas dos Jogos do Circo
     veiculos      veículos operacionais (instâncias de um modelo)
     animais       animais treinados (aliado ou ficha de ameaça)
     itens         marcas de uso dos itens do AS3 (Paçoca, Crânio…)

   NADA AQUI ROLA DADO SOZINHO. Quem rola é a tela, por clique, e passa o
   resultado. Desligar uma regra opcional suspende o efeito e guarda os
   registros, que voltam a valer quando ela é religada.
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

  /* =================================================================
     AS REGRAS OPCIONAIS DO AS3 — A DECISÃO ÚNICA
     -----------------------------------------------------------------
     Todas desligadas por padrão (js/ordem/opcionais.js). Tela, contas e
     ações perguntam AQUI. Desligada, a regra não soma, não cobra e não
     oferece ação; os registros ficam guardados.
     ================================================================= */

  var REGRAS = {
    sacrificio: "poderesDeSacrificio",
    trilhaGeral: "trilhaGeral",
    batalhas: "batalhasDeIntencoes",
    circo: "jogosDoCirco",
    recordacoes: "boasRecordacoes",
    paixao: "regrasDaPaixao",
    veiculos: "veiculosOperacionais",
    animais: "animaisTreinados",
  };
  var MOTIVOS = {
    sacrificio: "A regra opcional Poderes de Sacrifício está desligada nesta ficha (Arquivos Secretos 3, p. 110).",
    trilhaGeral: "A regra opcional Trilha Geral está desligada nesta ficha (Arquivos Secretos 3, p. 119).",
    batalhas: "A regra opcional Batalhas de Intenções está desligada nesta ficha (Arquivos Secretos 3, p. 120).",
    circo: "A regra opcional Jogos do Circo está desligada nesta ficha (Arquivos Secretos 3, p. 122).",
    recordacoes: "A regra opcional Boas Recordações está desligada nesta ficha (Arquivos Secretos 3, p. 123).",
    paixao: "A regra opcional Regras da Paixão está desligada nesta ficha (Arquivos Secretos 3, p. 124).",
    veiculos: "A regra opcional Veículos Operacionais está desligada nesta ficha (Arquivos Secretos 3, p. 125).",
    animais: "A regra opcional Animais Treinados está desligada nesta ficha (Arquivos Secretos 3, p. 132).",
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
  function interludioDe(ordem) {
    var c = ordem && ordem.condicoes;
    return c && c.interludio && typeof c.interludio.numero === "number" ? c.interludio.numero : 0;
  }

  /* =================================================================
     ESTIGMAS E PODERES DE SACRIFÍCIO (p. 110-111)
     -----------------------------------------------------------------
     "Quando um ser se torna um sacrifício do Hexatombe, ele recebe um
     dos poderes a seguir, correspondente ao seu estigma." O poder não
     é escolhido nem ocupa vaga: vem do estigma.
     ================================================================= */

  var ESTIGMAS = [
    { chave: "orgulho", nome: "Orgulho", poder: "arroganciaDiabolica" },
    { chave: "culpa", nome: "Culpa", poder: "causarCulpa" },
    { chave: "obsessao", nome: "Obsessão", poder: "despertarObsessao" },
    { chave: "prazer", nome: "Prazer", poder: "estimularHedonismo" },
    { chave: "desejo", nome: "Desejo", poder: "frutoDaAmbicao" },
    { chave: "rancor", nome: "Rancor", poder: "odioSuprimido" },
  ];
  var POR_ESTIGMA = {};
  ESTIGMAS.forEach(function (e) { POR_ESTIGMA[e.chave] = e; });

  /* =================================================================
     COMBATENTE PERFORMÁTICO (p. 119)
     ================================================================= */

  /* Ensaio: +1 na margem (+2 em NEX 40%, +3 em 65%, +4 em 99%). */
  function bonusDeEnsaio(nexEquivalente) {
    var n = Number(nexEquivalente) || 0;
    return n >= 99 ? 4 : n >= 65 ? 3 : n >= 40 ? 2 : 1;
  }

  /* Frase de Efeito: o multiplicador vira a Presença; se a Presença for
     igual ou menor do que o multiplicador, ele aumenta em +1. */
  function multiplicadorDaFrase(multiplicador, presenca) {
    var m = Math.max(1, Number(multiplicador) || 2);
    var p = Number(presenca) || 0;
    return p > m ? p : m + 1;
  }

  /* Mosh Pit: +1d6 por aliado cercando o alvo, até +5d6. */
  function dadosDoMoshPit(aliados) {
    var n = inteiro(aliados, 0, 99, 0);
    return Math.min(5, n);
  }

  /* Rítmo Contagiante: +5 na Defesa, +1 a cada acerto crítico seu. */
  var RITMO_BASE = 5;

  /* =================================================================
     REGRAS OPCIONAIS DE CONTA (p. 120-124)
     ================================================================= */

  /* Tempo de Construção de Base (p. 121): 7 dias para uma pessoa; −1
     por pessoa adicional, mínimo de 3. */
  function diasDeConstrucao(pessoas) {
    var n = inteiro(pessoas, 1, 99, 1);
    return Math.max(3, 7 - (n - 1));
  }

  /* Acerte os Dardos (p. 122): três tentativas; cada uma pontua pela
     maior DT superada. */
  var FAIXAS_DARDOS = [[30, 50], [25, 25], [20, 15], [15, 10], [10, 5]];
  function pontosDoDardo(total) {
    var t = Number(total) || 0;
    for (var i = 0; i < FAIXAS_DARDOS.length; i++) if (t >= FAIXAS_DARDOS[i][0]) return FAIXAS_DARDOS[i][1];
    return 0;
  }

  /* Máquina de Soco (p. 122-123): o tipo de golpe e o quanto gastar são
     decididos ANTES de rolar. 2 PV (descuidado) ou 2 PE (intenso) para
     cada +2 de dano, até o limite de PE. Pontuação = dano × 100; 18 ou
     mais num único soco quebra a máquina. */
  function planoDoSoco(tipo, gasto, limiteDePe) {
    if (tipo !== "descuidado" && tipo !== "intenso") return { ok: false, motivo: "Escolha o golpe antes de rolar: descuidado (PV) ou intenso (PE)." };
    var limite = inteiro(limiteDePe, 0, 99, 0);
    var g = inteiro(gasto, 0, 999, 0);
    if (g % 2) return { ok: false, motivo: "O gasto vai de 2 em 2 (2 pontos para cada +2 de dano)." };
    if (g > limite) return { ok: false, motivo: "O gasto passa do seu limite de PE (" + limite + ")." };
    return { ok: true, tipo: tipo, recurso: tipo === "descuidado" ? "pv" : "pe", gasto: g, bonus: g };
  }
  function resultadoDoSoco(dano) {
    var d = Math.max(0, Number(dano) || 0);
    return { pontos: d * 100, quebrou: d >= 18 };
  }

  /* Boas Recordações (p. 123): 1d4 em PV, PE ou SAN; uma vez por missão,
     ação padrão para +1d6 num único teste até o fim do dia. */
  var RECURSOS_DA_FOTO = ["pv", "pe", "san"];

  /* =================================================================
     VEÍCULOS OPERACIONAIS (p. 125-131)
     -----------------------------------------------------------------
     MODELOS do livro, imutáveis; o grupo cria INSTÂNCIAS (com PV,
     combustível, regalias, danos e defeitos próprios). Um veículo não é
     criatura nem item.
     ================================================================= */

  /* "carga": espaços com a lotação; "total": sem passageiros. O total é
     a carga mais 20 por ser médio (4 × 20 + 20 = 100, 5 × 20 + 30 = 130,
     6 × 20 + 40 = 160, 2 × 20 + 5 = 45) — leitura conferida nos quatro. */
  var MODELOS_VEICULO = [
    { chave: "categoria2", nome: "Veículo de categoria II", descricao: "Carro popular, emprestado pelos agentes para missões rápidas e menos perigosas.",
      categoria: "II", tamanho: "Grande", defesaBase: 8, rd: 5, pv: 100, seres: 4, carga: 20, total: 100, regalias: 1, pagina: 126 },
    { chave: "categoria3", nome: "Veículo de categoria III", descricao: "Van operacional reforçada pela Ordem — o mais usado pelos agentes.",
      categoria: "III", tamanho: "Grande", defesaBase: 10, rd: 10, pv: 150, seres: 5, carga: 30, total: 130, regalias: 2, pagina: 126 },
    { chave: "categoria4", nome: "Veículo de categoria IV", descricao: "Trailer ou motocasa projetado por engenheiros da Ordem para agentes de elite.",
      categoria: "IV", tamanho: "Enorme", defesaBase: 12, rd: 15, pv: 200, seres: 6, carga: 40, total: 160, regalias: 3, pagina: 126 },
    { chave: "motoGauderios", nome: "Motocicleta dos Gaudérios Abutres", descricao: "Adaptação do livro para quem prefere andar de moto.",
      categoria: "III", tamanho: "Médio", defesaBase: 14, rd: 5, pv: 120, seres: 2, carga: 5, total: 45, regalias: 2, pagina: 131,
      regaliasFixas: ["arsenalSecreto", "aprimoramentosDeVelocidade"] },
  ];
  var POR_MODELO = {};
  MODELOS_VEICULO.forEach(function (m) { POR_MODELO[m.chave] = m; });

  var REGALIAS = [
    { chave: "arsenalSecreto", nome: "Arsenal Secreto", resumo: "Três vezes por missão, um agente pega no veículo um item (arma, proteção, equipamento geral ou item amaldiçoado) de uma patente que possa acessar, como se o tivesse guardado. Os itens não ocupam a carga do veículo.", usosPorMissao: 3 },
    { chave: "aprimoramentosDeVelocidade", nome: "Aprimoramentos de Velocidade", resumo: "+5 em Pilotagem em viagens, perseguições e no teste de velocidade de manobra.", pilotagem: 5 },
    { chave: "bancosReclinaveis", nome: "Bancos Reclináveis", resumo: "Dormir no veículo num interlúdio é descanso confortável, em vez de precário." },
    { chave: "estacaoDeTrabalho", nome: "Estação de Trabalho", resumo: "Uma perícia escolhida (exceto Luta, Pilotagem e Pontaria): +2 em todo teste dela feito dentro do veículo.", pericia: true },
    { chave: "janelasBlindadas", nome: "Janelas Blindadas", resumo: "+5 na RD do veículo. Quem está dentro tem cobertura total (em vez de leve) mesmo com o veículo danificado, se ele estiver todo fechado.", rd: 5 },
    { chave: "latariaReforcada", nome: "Lataria Reforçada", resumo: "+5 na Defesa do veículo. Pode ser escolhida duas vezes (+10).", defesa: 5, maximo: 2 },
    { chave: "paraChoquesLetais", nome: "Para-choques Letais", resumo: "Atropelar causa +2d6 por 1,5 m percorrido (em vez de 1d6) e a DT para desviar aumenta em +5. Ao aplicar, pode trocar impacto por corte ou perfuração.", tipoDeDano: true },
    { chave: "quadroDeInvestigacao", nome: "Quadro de Investigação", resumo: "+5 nos testes para revisar o caso durante um interlúdio." },
    { chave: "tracaoNasQuatroRodas", nome: "Tração nas Quatro Rodas", resumo: "Ignora a penalidade de deslocamento por terreno difícil." },
  ];
  var POR_REGALIA = {};
  REGALIAS.forEach(function (r) { POR_REGALIA[r.chave] = r; });

  /* Velocidade de manobra (p. 127): a maior DT superada no teste de
     Pilotagem do começo da cena. */
  var FAIXAS_MANOBRA = [[30, 30, 20], [25, 27, 18], [20, 24, 16], [15, 21, 14], [10, 18, 12], [5, 15, 10]];
  function velocidadeDeManobra(total) {
    var t = Number(total) || 0;
    for (var i = 0; i < FAIXAS_MANOBRA.length; i++) {
      if (t >= FAIXAS_MANOBRA[i][0]) return { dt: FAIXAS_MANOBRA[i][0], metros: FAIXAS_MANOBRA[i][1], quadrados: FAIXAS_MANOBRA[i][2] };
    }
    return null;
  }

  /* Dano massivo (p. 130): 1d8 na lista. */
  var DEFEITOS = [
    { chave: "perdaTotal", nome: "Perda Total", resumo: "O carro apaga. Ação padrão e Pilotagem DT 20 para ligar de novo; falhando, não funciona mais." },
    { chave: "freioDefeituoso", nome: "Freio Defeituoso", resumo: "Ao frear, Pilotagem DT 20; falhando, anda mais metade do deslocamento até parar." },
    { chave: "pneuFurado", nome: "Pneu Furado", resumo: "–1d20 em Pilotagem e –3 m de deslocamento por pneu furado (cumulativo)." },
    { chave: "suspensaoDanificada", nome: "Suspensão Danificada", resumo: "Em terreno difícil, perde 2d6 PV por rodada." },
    { chave: "motorSuperaquecido", nome: "Motor Superaquecido", resumo: "Percorrendo pelo menos metade do deslocamento numa rodada, role 1d6: ímpar, perda total." },
    { chave: "faroisQuebrados", nome: "Faróis Quebrados", resumo: "Na escuridão, é como dirigir cego." },
    { chave: "tanqueFurado", nome: "Tanque Furado", resumo: "Ao rolar o combustível, um dos dados já conta como 1." },
    { chave: "portasDanificadas", nome: "Portas Danificadas", resumo: "A cada manobra evasiva, todos dentro fazem Reflexos DT 20 ou caem do carro (2d6 de impacto e caído)." },
  ];
  var POR_DEFEITO = {};
  DEFEITOS.forEach(function (d) { POR_DEFEITO[d.chave] = d; });

  /* Reparos (p. 131): por ação de interlúdio, Profissão; a maior DT
     superada. */
  var FAIXAS_REPARO = [
    [30, "todos", 99, "Recupera todos os PV e se livra de todas as penalidades."],
    [25, "metade", 99, "Recupera metade dos PV totais e se livra de todas as penalidades."],
    [20, "metade", 3, "Recupera metade dos PV totais e se livra de 3 penalidades."],
    [15, "metade", 1, "Recupera metade dos PV totais e se livra de 1 penalidade."],
    [10, 20, 0, "Recupera 20 PV."],
  ];
  function planoDeReparo(total, pvMaximo) {
    var t = Number(total) || 0;
    for (var i = 0; i < FAIXAS_REPARO.length; i++) {
      var f = FAIXAS_REPARO[i];
      if (t >= f[0]) {
        var pv = f[1] === "todos" ? pvMaximo : f[1] === "metade" ? Math.floor(pvMaximo / 2) : f[1];
        return { dt: f[0], pv: pv, penalidades: f[2], texto: f[3] };
      }
    }
    return { dt: 0, pv: 0, penalidades: 0, texto: "Abaixo de DT 10: o trabalho não rende." };
  }

  var COMBUSTIVEL_MAXIMO = 5;

  /* Danos pontuais (p. 130): pneus, janelas, faróis, tanque. */
  var DANOS_PONTUAIS = ["pneus", "janelas", "farois", "tanque"];

  function normalizarVeiculo(b) {
    var x = obj(b);
    var id = idOk(x.id);
    var modelo = POR_MODELO[x.modelo] ? x.modelo : "";
    if (!id || !modelo) return null;
    var m = POR_MODELO[modelo];
    var regalias = [];
    lista(x.regalias).forEach(function (r) {
      var rr = obj(r);
      if (!POR_REGALIA[rr.chave]) return;
      var mesma = regalias.filter(function (q) { return q.chave === rr.chave; }).length;
      if (mesma >= (POR_REGALIA[rr.chave].maximo || 1)) return;
      regalias.push({ chave: rr.chave, pericia: texto(rr.pericia, 40), tipoDeDano: ["impacto", "corte", "perfuração"].indexOf(rr.tipoDeDano) >= 0 ? rr.tipoDeDano : "" });
    });
    var danos = obj(x.danos);
    var usos = obj(x.usos);
    return {
      id: id, modelo: modelo,
      nome: texto(x.nome, 80) || m.nome,
      pvAtual: inteiro(x.pvAtual, 0, 9999, m.pv),
      combustivel: inteiro(x.combustivel, 0, COMBUSTIVEL_MAXIMO, COMBUSTIVEL_MAXIMO),
      regalias: regalias,
      defeitos: lista(x.defeitos).filter(function (d) { return !!POR_DEFEITO[d]; }).slice(0, 16),
      danos: { pneus: inteiro(danos.pneus, 0, 8, 0), janelas: danos.janelas === true, farois: danos.farois === true, tanque: danos.tanque === true },
      manobra: x.manobra && typeof x.manobra === "object" ? { cena: idOk(x.manobra.cena), dt: inteiro(x.manobra.dt, 0, 30, 0), total: inteiro(x.manobra.total, -99, 999, 0) } : null,
      motorista: texto(x.motorista, 80),
      agiMotorista: inteiro(x.agiMotorista, 0, 9, 0),
      usos: { arsenal: inteiro(usos.arsenal, 0, 3, 0), missao: inteiro(usos.missao, 0, 99999, 0) },
      notas: texto(x.notas, 600),
      registro: lista(x.registro).map(function (r) {
        var rr = obj(r);
        var rid = idOk(rr.id);
        return rid ? { id: rid, tipo: texto(rr.tipo, 20), texto: texto(rr.texto, 200), em: carimbo(rr.em) } : null;
      }).filter(Boolean).slice(-30),
    };
  }

  function modeloDe(v) { return v ? POR_MODELO[v.modelo] || null : null; }

  /* As contas do veículo, com origem. A Defesa soma a Agilidade de QUEM
     ESTÁ DIRIGINDO (informada na instância). */
  function contasDoVeiculo(v) {
    var m = modeloDe(v);
    if (!m) return null;
    var defesa = [{ rotulo: "Base (categoria " + m.categoria + ")", valor: m.defesaBase }];
    if (v.motorista || v.agiMotorista) defesa.push({ rotulo: "Agilidade de " + (v.motorista || "quem dirige"), valor: v.agiMotorista });
    var rd = [{ rotulo: "Base", valor: m.rd }];
    var pilotagem = 0;
    v.regalias.forEach(function (r) {
      var d = POR_REGALIA[r.chave];
      if (d.defesa) defesa.push({ rotulo: d.nome, valor: d.defesa });
      if (d.rd) rd.push({ rotulo: d.nome, valor: d.rd });
      if (d.pilotagem) pilotagem += d.pilotagem;
    });
    var soma = function (l) { return l.reduce(function (s, x) { return s + x.valor; }, 0); };
    var def = soma(defesa);
    var danificado = v.pvAtual <= Math.floor(m.pv / 2);
    var penalidadePilotagem = v.danos.pneus + (v.defeitos.indexOf("pneuFurado") >= 0 ? 1 : 0);
    var desloc = v.manobra ? velocidadeDeManobra(v.manobra.total) : null;
    var metros = desloc ? desloc.metros : 0;
    if (metros) {
      metros = Math.max(0, metros - 3 * penalidadePilotagem);
      if (danificado) metros = Math.floor(metros / 2);
    }
    return {
      modelo: m,
      defesa: { total: def, parcelas: defesa },
      defesaPontosVitais: def + 10,
      rd: { total: soma(rd), parcelas: rd },
      pvMaximo: m.pv,
      danificado: danificado,
      pilotagem: pilotagem,
      dadosPilotagem: -penalidadePilotagem,
      deslocamento: desloc ? { dt: desloc.dt, metros: metros, quadrados: Math.floor(metros / 1.5) } : null,
      vagas: Math.max(0, m.regalias - (m.regaliasFixas ? 0 : 0)),
    };
  }

  function novoVeiculo(modelo, nome) {
    var m = POR_MODELO[modelo];
    if (!m) return null;
    return normalizarVeiculo({
      id: novoId("vei"), modelo: modelo, nome: nome || m.nome, pvAtual: m.pv, combustivel: COMBUSTIVEL_MAXIMO,
      regalias: (m.regaliasFixas || []).map(function (k) { return { chave: k }; }),
    });
  }

  function registrarNoVeiculo(v, tipo, txt) {
    v.registro.push({ id: novoId("vr"), tipo: tipo, texto: texto(txt, 200), em: agora() });
    v.registro = v.registro.slice(-30);
  }

  /* Combustível (p. 129): ao fim de um percurso, rola a pilha (um d6 por
     dado) e tira os que deram 1. Tanque Furado: um dado já conta como 1.
     `dados` são os resultados já rolados pela tela. */
  function dadosARolar(v) {
    var furado = v.defeitos.indexOf("tanqueFurado") >= 0 && v.combustivel > 0;
    return Math.max(0, v.combustivel - (furado ? 1 : 0));
  }
  function gastarCombustivel(v, dados) {
    var antes = v.combustivel;
    var furado = v.defeitos.indexOf("tanqueFurado") >= 0 && antes > 0;
    var precisa = dadosARolar(v);
    var rol = lista(dados).map(function (d) { return inteiro(d, 1, 6, 1); }).slice(0, precisa);
    if (rol.length !== precisa) return { ok: false, motivo: "Role um d6 para cada dado da pilha (" + precisa + ")." };
    var uns = rol.filter(function (d) { return d === 1; }).length + (furado ? 1 : 0);
    v.combustivel = Math.max(0, antes - uns);
    registrarNoVeiculo(v, "combustivel", "Percurso: " + rol.join(", ") + (furado ? " (tanque furado: um dado conta como 1)" : "") + " — pilha " + antes + "d6 → " + v.combustivel + "d6.");
    return { ok: true, antes: antes, depois: v.combustivel, removidos: uns, semCombustivel: v.combustivel === 0 };
  }
  function reabastecer(v) {
    var antes = v.combustivel;
    v.combustivel = COMBUSTIVEL_MAXIMO;
    registrarNoVeiculo(v, "combustivel", "Reabastecido: " + antes + "d6 → " + COMBUSTIVEL_MAXIMO + "d6.");
    return { ok: true, antes: antes, depois: v.combustivel };
  }
  /* Galão (SaH p. 41): +2d6 na pilha, até o máximo de 5. */
  function usarGalao(v) {
    var antes = v.combustivel;
    v.combustivel = Math.min(COMBUSTIVEL_MAXIMO, antes + 2);
    registrarNoVeiculo(v, "combustivel", "Galão: " + antes + "d6 → " + v.combustivel + "d6.");
    return { ok: true, antes: antes, depois: v.combustivel };
  }

  /* Dano no veículo: tira a RD (salvo dano que a ignora), marca dano
     massivo quando um único ataque causa metade dos PV totais ou mais. */
  function danificarVeiculo(v, dano, ignorarRd) {
    var c = contasDoVeiculo(v);
    if (!c) return { ok: false, motivo: "Veículo sem modelo." };
    var bruto = inteiro(dano, 0, 9999, 0);
    var efetivo = ignorarRd ? bruto : Math.max(0, bruto - c.rd.total);
    var antes = v.pvAtual;
    v.pvAtual = Math.max(0, antes - efetivo);
    var massivo = efetivo >= Math.ceil(c.pvMaximo / 2);
    registrarNoVeiculo(v, "dano", "Dano " + bruto + (ignorarRd ? "" : " − RD " + c.rd.total) + " = " + efetivo + " (PV " + antes + " → " + v.pvAtual + ")" + (massivo ? " — dano massivo" : "") + ".");
    return { ok: true, efetivo: efetivo, antes: antes, depois: v.pvAtual, massivo: massivo, danificado: v.pvAtual <= Math.floor(c.pvMaximo / 2) };
  }
  function registrarDefeito(v, d8) {
    var n = inteiro(d8, 1, 8, 1);
    var d = DEFEITOS[n - 1];
    if (d.chave === "pneuFurado") v.danos.pneus = Math.min(8, v.danos.pneus + 1);
    else if (d.chave === "faroisQuebrados") v.danos.farois = true;
    else if (v.defeitos.indexOf(d.chave) < 0) v.defeitos.push(d.chave);
    registrarNoVeiculo(v, "defeito", "Dano massivo (1d8 = " + n + "): " + d.nome + ".");
    return { ok: true, defeito: d };
  }
  /* Penalidades por dano que um reparo pode tirar, na ordem em que
     aparecem: defeitos, pneus, janelas, faróis, tanque. */
  function penalidadesDoVeiculo(v) {
    var l = v.defeitos.map(function (k) { return { tipo: "defeito", chave: k, nome: POR_DEFEITO[k].nome }; });
    for (var i = 0; i < v.danos.pneus; i++) l.push({ tipo: "pneu", nome: "Pneu furado" });
    if (v.danos.janelas) l.push({ tipo: "janelas", nome: "Janelas estilhaçadas" });
    if (v.danos.farois) l.push({ tipo: "farois", nome: "Faróis quebrados" });
    if (v.danos.tanque) l.push({ tipo: "tanque", nome: "Tanque atingido" });
    return l;
  }
  function repararVeiculo(v, total, escolhidas) {
    var c = contasDoVeiculo(v);
    var plano = planoDeReparo(total, c.pvMaximo);
    var antes = v.pvAtual;
    v.pvAtual = Math.min(c.pvMaximo, v.pvAtual + plano.pv);
    var todas = penalidadesDoVeiculo(v);
    var tirar = plano.penalidades >= todas.length ? todas : (lista(escolhidas).length ? lista(escolhidas) : todas).slice(0, plano.penalidades);
    tirar.forEach(function (p) {
      if (p.tipo === "defeito") v.defeitos = v.defeitos.filter(function (k) { return k !== p.chave; });
      else if (p.tipo === "pneu") v.danos.pneus = Math.max(0, v.danos.pneus - 1);
      else if (p.tipo === "janelas") v.danos.janelas = false;
      else if (p.tipo === "farois") v.danos.farois = false;
      else if (p.tipo === "tanque") v.danos.tanque = false;
    });
    registrarNoVeiculo(v, "reparo", "Reparo (Profissão " + total + ", DT " + plano.dt + "): PV " + antes + " → " + v.pvAtual +
      (tirar.length ? "; sem " + tirar.map(function (p) { return p.nome; }).join(", ") : "") + ".");
    return { ok: true, plano: plano, antes: antes, depois: v.pvAtual, tiradas: tirar };
  }
  function definirManobra(v, cena, total) {
    var vel = velocidadeDeManobra(total);
    v.manobra = { cena: idOk(cena), dt: vel ? vel.dt : 0, total: inteiro(total, -99, 999, 0) };
    registrarNoVeiculo(v, "manobra", "Velocidade de manobra: Pilotagem " + total + (vel ? " → DT " + vel.dt + ", " + vel.metros + " m" : " → abaixo de DT 5") + ".");
    return vel;
  }
  function usarArsenal(v, missao) {
    if (!v.regalias.some(function (r) { return r.chave === "arsenalSecreto"; })) return { ok: false, motivo: "O veículo não tem Arsenal Secreto." };
    if (v.usos.missao !== missao) v.usos = { arsenal: 0, missao: missao };
    if (v.usos.arsenal >= 3) return { ok: false, motivo: "O Arsenal Secreto já foi usado três vezes nesta missão." };
    v.usos.arsenal += 1;
    registrarNoVeiculo(v, "arsenal", "Arsenal Secreto: uso " + v.usos.arsenal + " de 3 nesta missão.");
    return { ok: true, usados: v.usos.arsenal };
  }

  /* =================================================================
     ANIMAIS TREINADOS (p. 132-134)
     -----------------------------------------------------------------
     Como aliado: um dos perfis do livro (Serpente, Corvo, Gato), uma
     cópia na aba Aliados. Como ficha de ameaça da realidade: o VD segue
     o NEX do dono — e já é o VD final, sem a redução de duas categorias
     das ameaças da realidade (p. 134 e 140).
     ================================================================= */

  /* NEX 0–10% = VD 10; 15% = 20; 20% = 40; e +20 por 5% até 99% = 360. */
  function vdDoAnimal(nex) {
    var n = Math.max(0, Math.min(99, Number(nex) || 0));
    if (n < 15) return 10;
    if (n < 20) return 20;
    var degraus = Math.floor((Math.min(n, 95) - 20) / 5);
    var vd = 40 + 20 * degraus;
    if (n >= 99) vd = 360;
    return vd;
  }

  var MODOS_ANIMAL = ["aliado", "ficha"];
  function normalizarAnimal(b) {
    var x = obj(b);
    var id = idOk(x.id);
    var nome = texto(x.nome, 80);
    if (!id || !nome) return null;
    return {
      id: id, nome: nome,
      especie: texto(x.especie, 60),
      modo: MODOS_ANIMAL.indexOf(x.modo) >= 0 ? x.modo : "aliado",
      perfil: ["serpente", "corvo", "gato", ""].indexOf(x.perfil) >= 0 ? x.perfil : "",
      aliadoId: idOk(x.aliadoId),
      treinado: x.treinado === true,
      treino: texto(x.treino, 300),
      aprovado: x.aprovado === true,
      aprovadoPor: texto(x.aprovadoPor, 80),
      aprovadoEm: carimbo(x.aprovadoEm),
      notas: texto(x.notas, 600),
    };
  }

  /* =================================================================
     VALORES MÉDIOS PARA CRIATURAS (p. 141)
     -----------------------------------------------------------------
     Referência para o editor de Homebrew. As linhas são as impressas;
     a de VD 30 foi conferida na diagramação (três linhas de Recruta:
     10, 20 e 30 — não há linha de VD 40 nem 50). "O" é d20.
       [vd, ataque, dano médio, pv, defesa, forte, média, fraca, dt, presença]
     ================================================================= */

  var VALORES_MEDIOS = [
    ["Recruta", 10, "1O+5", 6, 15, 14, "1O+5", "1O", "1O", 13, "1d6"],
    ["Recruta", 20, "2O+5", 12, 35, 16, "2O+5", "1O", "1O", 14, "2d6"],
    ["Recruta", 30, "2O+10", 17, 70, 19, "2O+5", "1O+5", "1O", 15, "2d8"],
    ["Operador", 60, "3O+10", 26, 105, 21, "3O+10", "2O+5", "2O", 19, "3d6"],
    ["Operador", 80, "3O+10", 32, 140, 23, "3O+10", "2O+5", "2O", 20, "3d8"],
    ["Operador", 100, "3O+15", 38, 200, 25, "3O+10", "2O+5", "2O", 21, "4d6"],
    ["Agente Especial", 120, "3O+15", 62, 240, 28, "4O+10", "3O+10", "2O+5", 23, "4d6"],
    ["Agente Especial", 140, "4O+15", 69, 280, 31, "4O+10", "3O+10", "2O+5", 24, "4d8"],
    ["Agente Especial", 160, "4O+20", 77, 320, 34, "4O+10", "3O+10", "2O+5", 25, "4d8"],
    ["Oficial de Operações", 180, "4O+20", 104, 360, 36, "4O+15", "3O+15", "2O+10", 28, "6d6"],
    ["Oficial de Operações", 200, "4O+25", 113, 400, 38, "4O+15", "3O+15", "2O+10", 29, "6d6"],
    ["Oficial de Operações", 220, "5O+25", 122, 550, 40, "4O+15", "3O+15", "2O+10", 30, "7d6"],
    ["Oficial de Operações", 240, "5O+30", 131, 600, 42, "4O+20", "4O+15", "3O+10", 31, "6d8"],
    ["Oficial de Operações", 260, "5O+30", 140, 650, 44, "4O+20", "4O+15", "3O+10", 37, "8d6"],
    ["Oficial de Operações", 280, "5O+30", 150, 700, 46, "5O+20", "4O+15", "3O+10", 38, "8d6"],
    ["Oficial de Operações", 300, "5O+35", 159, 750, 48, "5O+25", "4O+20", "3O+15", 39, "7d8"],
    ["Agente de Elite", 320, "5O+35", 192, 800, 50, "5O+25", "5O+20", "4O+15", 40, "9d6"],
    ["Agente de Elite", 340, "5O+35", 202, 1020, 53, "5O+25", "5O+20", "4O+15", 41, "10d6"],
    ["Agente de Elite", 360, "5O+40", 212, 1080, 56, "5O+30", "5O+25", "4O+20", 42, "8d8"],
    ["Agente de Elite", 380, "5O+40", 223, 1140, 58, "5O+30", "5O+25", "5O+20", 43, "9d8"],
    ["Agente de Elite", 400, "5O+45", 233, 1200, 60, "5O+35", "5O+30", "5O+25", 44, "10d8"],
  ].map(function (l) {
    return { patente: l[0], vd: l[1], ataque: l[2], dano: l[3], pv: l[4], defesa: l[5], forte: l[6], media: l[7], fraca: l[8], dt: l[9], presenca: l[10] };
  });

  /* "3O+10" → "3d20+10"; "1O" → "1d20". Só troca a letra: o número de
     dados e o bônus são os impressos. */
  function expressaoDoLivro(v) {
    var m = /^(\d+)O([+-]\d+)?$/.exec(String(v || "").replace(/\s+/g, ""));
    return m ? m[1] + "d20" + (m[2] || "") : "";
  }

  /* A linha de um VD: a exata, se houver. Sem ela, NÃO arredonda: devolve
     as duas vizinhas, para quem cria escolher (VD 40 e 50 caem entre
     Recruta 30 e Operador 60). Ameaça da realidade: duas linhas abaixo
     (p. 140) — nunca para um animal treinado (p. 134). */
  function linhasDoVd(vd) {
    var n = Number(vd);
    if (!isFinite(n)) return { exata: null, abaixo: null, acima: null };
    var exata = VALORES_MEDIOS.filter(function (l) { return l.vd === n; })[0] || null;
    var abaixo = null, acima = null;
    VALORES_MEDIOS.forEach(function (l) {
      if (l.vd < n) abaixo = l;
      if (l.vd > n && !acima) acima = l;
    });
    return { exata: exata, abaixo: abaixo, acima: acima };
  }
  function linhaDuasAbaixo(linha) {
    var i = VALORES_MEDIOS.indexOf(linha);
    return i >= 2 ? VALORES_MEDIOS[i - 2] : (i >= 0 ? VALORES_MEDIOS[0] : null);
  }

  /* O que aplicar numa ficha: forte/média/fraca nas três resistências,
     como quem cria escolheu (uma de cada). Ataque, dano e DT ficam como
     referência — eles moram nas ações, e nada aqui inventa fórmula. */
  function planoDeValores(linha, escolhaDeResistencias) {
    if (!linha) return null;
    var e = obj(escolhaDeResistencias);
    var vistas = {};
    var res = {};
    ["fortitude", "reflexos", "vontade"].forEach(function (k) {
      var nivel = ["forte", "media", "fraca"].indexOf(e[k]) >= 0 ? e[k] : "";
      if (nivel) { res[k] = expressaoDoLivro(linha[nivel]); vistas[nivel] = (vistas[nivel] || 0) + 1; }
    });
    var repetidas = Object.keys(vistas).filter(function (k) { return vistas[k] > 1; });
    return {
      linha: linha,
      defesa: linha.defesa,
      pv: linha.pv,
      resistencias: res,
      presencaDano: linha.presenca,
      referencia: { ataque: expressaoDoLivro(linha.ataque), dano: linha.dano, dt: linha.dt },
      aviso: repetidas.length ? "A tabela tem uma resistência forte, uma média e uma fraca; você repetiu " + repetidas.join(" e ") + "." : "",
    };
  }

  /* =================================================================
     NORMALIZAÇÃO DA FICHA
     ================================================================= */

  var TIPOS_FRUTO = ["poder", "ritual"];

  function normalizarSacrificio(b) {
    var x = obj(b);
    var fruto = obj(x.fruto);
    return {
      digno: x.digno === true,
      dignoEm: carimbo(x.dignoEm),
      dignoPor: texto(x.dignoPor, 80),
      dignoNota: texto(x.dignoNota, 300),
      estigma: POR_ESTIGMA[x.estigma] ? x.estigma : "",
      estigmaEm: carimbo(x.estigmaEm),
      estigmaPor: texto(x.estigmaPor, 80),
      fruto: TIPOS_FRUTO.indexOf(fruto.tipo) >= 0 && texto(fruto.nome, 80)
        ? { tipo: fruto.tipo, chave: texto(fruto.chave, 80), nome: texto(fruto.nome, 80) } : null,
      usos: lista(x.usos).map(function (u) {
        var uu = obj(u);
        return { poder: texto(uu.poder, 40), cena: idOk(uu.cena), em: carimbo(uu.em), nota: texto(uu.nota, 200) };
      }).slice(-MAX),
    };
  }

  function normalizarPaixao(b) {
    var x = obj(b);
    var id = idOk(x.id);
    var nome = texto(x.nome, 80);
    if (!id || !nome) return null;
    var perdida = x.perdida && typeof x.perdida === "object" ? { em: carimbo(x.perdida.em), motivo: texto(x.perdida.motivo, 200) } : null;
    return {
      id: id, nome: nome,
      pv: inteiro(x.pv, 0, 8, 0), pe: inteiro(x.pe, 0, 8, 0),
      /* "Só é possível se beneficiar dessa regra ao mesmo tempo uma vez":
         só um laço com bônus por vez; os outros são só a condição. */
      comBonus: x.comBonus === true,
      origem: x.origem === "papinho" ? "papinho" : "intimidade",
      em: carimbo(x.em),
      perdida: perdida,
    };
  }

  function normalizar(ordem, b) {
    var x = obj(b && b.arquivo3);
    var cr = obj(x.cronologia);
    var fl = obj(x.flagelo);
    var en = obj(x.entrada);
    var es = x.ensaio && typeof x.ensaio === "object" ? x.ensaio : null;
    var ri = x.ritmo && typeof x.ritmo === "object" ? x.ritmo : null;
    var am = x.ambidestria && typeof x.ambidestria === "object" ? x.ambidestria : null;
    var ins = obj(x.instrumento);
    var rec = obj(x.recordacoes);
    var ba = x.batalha && typeof x.batalha === "object" ? x.batalha : null;
    var fr = x.frase && typeof x.frase === "object" ? x.frase : null;
    var it = obj(x.itens);
    var vistos = {};
    function unico(v) { if (!v || vistos[v.id]) return false; vistos[v.id] = true; return true; }

    ordem.arquivo3 = {
      cronologia: {
        missao: inteiro(cr.missao, 0, 99999, 0),
        dia: inteiro(cr.dia, 0, 99999, 0),
        semana: inteiro(cr.semana, 0, 99999, 0),
        sessao: inteiro(cr.sessao, 0, 99999, 0),
      },
      sacrificio: normalizarSacrificio(x.sacrificio),
      flagelo: {
        pvGastos: inteiro(fl.pvGastos, 0, 9999, 0),
        interludio: inteiro(fl.interludio, 0, 99999, 0),
        recuperacoes: inteiro(fl.recuperacoes, 0, 9, 0),
      },
      guardiao: lista(x.guardiao).map(function (g) {
        var gg = obj(g);
        var gid = idOk(gg.id);
        return gid ? { id: gid, cena: idOk(gg.cena), em: carimbo(gg.em), resultado: ["san", "semSan", "pendente"].indexOf(gg.resultado) >= 0 ? gg.resultado : "pendente" } : null;
      }).filter(Boolean).slice(-MAX),
      entrada: {
        sessao: inteiro(en.sessao, -1, 99999, -1),
        pendente: en.pendente === true,
        transferida: en.transferida === true,
        em: carimbo(en.em),
      },
      ensaio: es ? {
        interludio: inteiro(es.interludio, 0, 99999, 0), bonus: inteiro(es.bonus, 1, 4, 1),
        origem: es.origem === "aliado" ? "aliado" : "propria", nome: texto(es.nome, 80), cena: idOk(es.cena), em: carimbo(es.em),
      } : null,
      ritmo: ri ? {
        cena: idOk(ri.cena), origem: ri.origem === "aliado" ? "aliado" : "propria", nome: texto(ri.nome, 80),
        bonus: inteiro(ri.bonus, 0, 99, RITMO_BASE),
        criticos: lista(ri.criticos).map(idOk).filter(Boolean).slice(-60),
      } : null,
      frase: fr ? { cena: idOk(fr.cena), multiplicador: inteiro(fr.multiplicador, 2, 20, 2), em: carimbo(fr.em) } : null,
      ambidestria: am ? { cena: idOk(am.cena), em: carimbo(am.em), semPenalidade: am.semPenalidade === true } : null,
      instrumento: {
        itemId: idOk(ins.itemId),
        nome: texto(ins.nome, 80),
        criadoEm: carimbo(ins.criadoEm),
        quebrados: lista(ins.quebrados).map(function (q) {
          var qq = obj(q);
          return texto(qq.nome, 80) ? { nome: texto(qq.nome, 80), em: carimbo(qq.em), motivo: texto(qq.motivo, 120) } : null;
        }).filter(Boolean).slice(-12),
      },
      paixoes: lista(x.paixoes).map(normalizarPaixao).filter(unico).slice(0, 12),
      recordacoes: {
        fotos: lista(rec.fotos).map(function (f) {
          var ff = obj(f);
          var fid = idOk(ff.id);
          return fid ? { id: fid, nome: texto(ff.nome, 80), recurso: RECURSOS_DA_FOTO.indexOf(ff.recurso) >= 0 ? ff.recurso : "pv", valor: inteiro(ff.valor, 0, 4, 0), em: carimbo(ff.em) } : null;
        }).filter(Boolean).slice(-12),
        missaoUsada: inteiro(rec.missaoUsada, -1, 99999, -1),
        bonusDia: rec.bonusDia === null || rec.bonusDia === undefined ? -1 : inteiro(rec.bonusDia, -1, 99999, -1),
        bonusGasto: rec.bonusGasto === true,
      },
      batalha: ba && texto(ba.contra, 80) ? { contra: texto(ba.contra, 80), cena: idOk(ba.cena), em: carimbo(ba.em) } : null,
      circo: lista(x.circo).map(function (p) {
        var pp = obj(p);
        var pid = idOk(pp.id);
        return pid && (pp.jogo === "dardos" || pp.jogo === "soco") ? {
          id: pid, jogo: pp.jogo, pontos: inteiro(pp.pontos, 0, 999999, 0), detalhe: texto(pp.detalhe, 240), quebrou: pp.quebrou === true, em: carimbo(pp.em),
        } : null;
      }).filter(Boolean).slice(-20),
      veiculos: lista(x.veiculos).map(normalizarVeiculo).filter(unico).slice(0, 8),
      animais: lista(x.animais).map(normalizarAnimal).filter(unico).slice(0, 8),
      aliados: lista(x.aliados).map(normalizarRegistroDeAliado).filter(Boolean).slice(0, 24),
      itens: {
        pacocaDia: inteiro(it.pacocaDia, -1, 99999, -1),
        cranioDia: inteiro(it.cranioDia, -1, 99999, -1),
        gaiolaAberta: it.gaiolaAberta === true,
        couracas: lista(it.couracas).map(function (c) {
          var cc = obj(c);
          var iid = idOk(cc.itemId);
          return iid ? {
            itemId: iid, semanas: inteiro(cc.semanas, 0, 10, 0),
            vontade: ["passou", "falhou", ""].indexOf(cc.vontade) >= 0 ? cc.vontade : "",
            fortitude: ["passou", "falhou", ""].indexOf(cc.fortitude) >= 0 ? cc.fortitude : "",
            dt: inteiro(cc.dt, 0, 36, 0),
            semana: inteiro(cc.semana, -1, 99999, -1), missao: inteiro(cc.missao, -1, 99999, -1),
          } : null;
        }).filter(Boolean).slice(0, 4),
      },
    };
    return ordem;
  }

  function vazio() { return normalizar({}, {}).arquivo3; }

  function dados(ordem) {
    if (!ordem.arquivo3) normalizar(ordem, {});
    return ordem.arquivo3;
  }

  /* =================================================================
     CRONOLOGIA DA CAMPANHA
     ================================================================= */

  var MARCOS = { missao: "Nova missão", dia: "Novo dia", semana: "Nova semana", sessao: "Nova sessão" };

  /* Nova missão também começa um novo dia; nova semana, também (o livro
     conta "uma semana ou o início de uma nova missão"). */
  function avancar(ordem, marco) {
    if (!MARCOS[marco]) return { ok: false, motivo: "Marco desconhecido." };
    var a = dados(ordem);
    a.cronologia[marco] += 1;
    if (marco === "missao" || marco === "semana") a.cronologia.dia += 1;
    return { ok: true, cronologia: a.cronologia };
  }

  /* =================================================================
     SACRIFÍCIO
     ================================================================= */

  function registrarDigno(ordem, digno, por, nota) {
    var s = dados(ordem).sacrificio;
    s.digno = !!digno;
    s.dignoEm = digno ? agora() : "";
    s.dignoPor = digno ? texto(por, 80) : "";
    s.dignoNota = digno ? texto(nota, 300) : "";
    return { ok: true };
  }

  /* O estigma muda o poder; o registro anterior (usos, Fruto) fica. */
  function registrarEstigma(ordem, estigma, por) {
    if (estigma && !POR_ESTIGMA[estigma]) return { ok: false, motivo: "Estigma desconhecido." };
    var s = dados(ordem).sacrificio;
    if (estigma && !s.digno) return { ok: false, motivo: "Só um personagem Digno de Sacrifício é tragado pelo Hexatombe (p. 110). Registre isso antes." };
    s.estigma = estigma || "";
    s.estigmaEm = estigma ? agora() : "";
    s.estigmaPor = estigma ? texto(por, 80) : "";
    return { ok: true };
  }

  /* O poder de sacrifício vale: regra ligada, digno, com estigma. */
  function poderDeSacrificio(ordem) {
    if (!ordem || !regraLigada(ordem, "sacrificio")) return null;
    var s = dados(ordem).sacrificio;
    if (!s.digno || !s.estigma) return null;
    var P = global.RAMAOrdemPoderes;
    var e = P ? P.poder(POR_ESTIGMA[s.estigma].poder) : null;
    return e ? { entrada: e, estigma: POR_ESTIGMA[s.estigma] } : null;
  }

  function registrarUsoDeSacrificio(ordem, nota) {
    var p = poderDeSacrificio(ordem);
    if (!p) return regraLigada(ordem, "sacrificio") ? { ok: false, motivo: "Sem poder de sacrifício: falta o registro de Digno de Sacrifício ou o estigma." } : desligada("sacrificio");
    var s = dados(ordem).sacrificio;
    s.usos.push({ poder: p.entrada.chave, cena: cenaDe(ordem), em: agora(), nota: texto(nota, 200) });
    s.usos = s.usos.slice(-MAX);
    return { ok: true, poder: p.entrada };
  }

  /* Fruto da Ambição: um poder ou ritual conhecido vira o gatilho da
     forma (As Máscaras, AS2 p. 97). */
  function definirFruto(ordem, tipo, chave, nome) {
    if (!regraLigada(ordem, "sacrificio")) return desligada("sacrificio");
    var s = dados(ordem).sacrificio;
    if (s.estigma !== "desejo") return { ok: false, motivo: "Fruto da Ambição é o poder do sacrifício do Desejo." };
    if (TIPOS_FRUTO.indexOf(tipo) < 0 || !texto(nome, 80)) return { ok: false, motivo: "Escolha um poder ou um ritual que o personagem conheça." };
    s.fruto = { tipo: tipo, chave: texto(chave, 80), nome: texto(nome, 80) };
    return { ok: true };
  }

  /* =================================================================
     PODER DO FLAGELO, FLAGELO BEM APROVEITADO E RECUPERAÇÃO FLAGELANTE
     ================================================================= */

  /* PV por PE pago: 2 (Poder do Flagelo, OPRPG p. 34) ou 1 (Flagelo Bem
     Aproveitado, AS3 p. 108). */
  function taxaDoFlagelo(bemAproveitado) { return bemAproveitado ? 1 : 2; }

  function pagarComFlagelo(ordem, pe, bemAproveitado) {
    var n = inteiro(pe, 0, 99, 0);
    var pv = n * taxaDoFlagelo(bemAproveitado);
    var f = dados(ordem).flagelo;
    f.pvGastos = Math.min(9999, f.pvGastos + pv);
    return { ok: true, pe: n, pv: pv };
  }

  /* Usos de Recuperação Flagelante entre dois interlúdios: um por
     aquisição, até três. */
  function usosDeRecuperacao(aquisicoes) { return Math.max(0, Math.min(3, inteiro(aquisicoes, 0, 9, 0))); }

  function estadoDaRecuperacao(ordem, aquisicoes) {
    var f = dados(ordem).flagelo;
    var maximo = usosDeRecuperacao(aquisicoes);
    var usados = f.interludio === interludioDe(ordem) ? f.recuperacoes : 0;
    return { maximo: maximo, usados: usados, restantes: Math.max(0, maximo - usados), pvGastos: f.pvGastos };
  }

  /* Recuperar PV do flagelo por outro método (cura, ritual, item): só os
     PV que o flagelo tirou, e só com uso disponível. */
  function recuperarFlagelo(ordem, pv, aquisicoes) {
    var e = estadoDaRecuperacao(ordem, aquisicoes);
    if (!e.maximo) return { ok: false, motivo: "Sem Recuperação Flagelante, os PV do Poder do Flagelo só voltam com descanso." };
    if (!e.restantes) return { ok: false, motivo: "Recuperação Flagelante já foi usada " + e.maximo + " vez(es) desde o último interlúdio." };
    var f = dados(ordem).flagelo;
    var n = Math.min(inteiro(pv, 0, 9999, 0), f.pvGastos);
    if (!n) return { ok: false, motivo: "Não há PV do flagelo a recuperar." };
    if (f.interludio !== interludioDe(ordem)) { f.interludio = interludioDe(ordem); f.recuperacoes = 0; }
    f.recuperacoes += 1;
    f.pvGastos -= n;
    return { ok: true, pv: n, restantes: e.restantes - 1 };
  }

  /* Descanso devolve o que o flagelo tirou (a cura é a do descanso). */
  function descansoDoFlagelo(ordem) {
    var f = dados(ordem).flagelo;
    var antes = f.pvGastos;
    f.pvGastos = 0;
    return { ok: true, liberados: antes };
  }

  /* =================================================================
     GUARDIÃO DA TROPA
     ================================================================= */

  function usarGuardiao(ordem) {
    var a = dados(ordem);
    var g = { id: novoId("gua"), cena: cenaDe(ordem), em: agora(), resultado: "pendente" };
    a.guardiao.push(g);
    a.guardiao = a.guardiao.slice(-MAX);
    return { ok: true, uso: g };
  }
  /* "Se o ataque não vencer sua Defesa ou a habilidade não te afetar
     completamente, você recupera 1 SAN" — uma vez por uso, só no evento. */
  function resolverGuardiao(ordem, id, protegeu) {
    var g = dados(ordem).guardiao.filter(function (x) { return x.id === id; })[0];
    if (!g) return { ok: false, motivo: "Uso desconhecido." };
    if (g.resultado !== "pendente") return { ok: false, motivo: "Este uso já foi resolvido.", repetido: true };
    g.resultado = protegeu ? "san" : "semSan";
    return { ok: true, san: protegeu ? 1 : 0 };
  }

  /* =================================================================
     ENTRADA TRIUNFAL — uma vez por sessão (o contador da cronologia)
     ================================================================= */

  function estadoDaEntrada(ordem) {
    var a = dados(ordem);
    return { usadaNaSessao: a.entrada.sessao === a.cronologia.sessao, pendente: a.entrada.pendente, transferida: a.entrada.transferida };
  }
  function anunciarEntrada(ordem) {
    var a = dados(ordem);
    if (a.entrada.sessao === a.cronologia.sessao) return { ok: false, motivo: "Entrada Triunfal já foi usada nesta sessão. Use “Nova sessão” na cronologia quando começar outra." };
    a.entrada = { sessao: a.cronologia.sessao, pendente: true, transferida: false, em: agora() };
    return { ok: true };
  }
  /* O bônus vai para o primeiro teste — nunca Furtividade. */
  function consumirEntrada(ordem, pericia) {
    var a = dados(ordem);
    if (!a.entrada.pendente) return { ok: false, motivo: "Não há bônus de Entrada Triunfal guardado." };
    if (pericia === "furtividade") return { ok: false, motivo: "O bônus de Entrada Triunfal não vale em Furtividade." };
    a.entrada.pendente = false;
    return { ok: true };
  }
  function transferirEntrada(ordem) {
    var a = dados(ordem);
    if (!a.entrada.pendente) return { ok: false, motivo: "Não há bônus a transferir." };
    a.entrada.pendente = false;
    a.entrada.transferida = true;
    return { ok: true };
  }

  /* =================================================================
     ENSAIO, FRASE DE EFEITO, RÍTMO CONTAGIANTE
     ================================================================= */

  /* Ensaiar: uma vez por cena; o bônus vale até o início da próxima
     cena de interlúdio (o contador de interlúdios muda). */
  function ensaiar(ordem, bonus, origem, nome) {
    var a = dados(ordem);
    var cena = cenaDe(ordem);
    if (a.ensaio && a.ensaio.cena === cena && a.ensaio.origem === (origem || "propria")) return { ok: false, motivo: "Só se ensaia uma vez por cena." };
    a.ensaio = { interludio: interludioDe(ordem), bonus: inteiro(bonus, 1, 4, 1), origem: origem === "aliado" ? "aliado" : "propria", nome: texto(nome, 80), cena: cena, em: agora() };
    return { ok: true, ensaio: a.ensaio };
  }
  function margemDoEnsaio(ordem) {
    var a = ordem && ordem.arquivo3;
    if (!a || !a.ensaio) return 0;
    return a.ensaio.interludio === interludioDe(ordem) ? a.ensaio.bonus : 0;
  }

  /* Frase de Efeito no seu próprio crítico: o multiplicador fica
     guardado para a rolagem de dano desse crítico, nesta cena. */
  function guardarFrase(ordem, multiplicador) {
    var a = dados(ordem);
    a.frase = { cena: cenaDe(ordem), multiplicador: inteiro(multiplicador, 2, 20, 2), em: agora() };
    return { ok: true };
  }
  function consumirFrase(ordem) {
    var a = dados(ordem);
    if (!a.frase || a.frase.cena !== cenaDe(ordem)) { a.frase = null; return null; }
    var m = a.frase.multiplicador;
    a.frase = null;
    return m;
  }

  function iniciarRitmo(ordem, origem, nome, bonus) {
    var a = dados(ordem);
    a.ritmo = { cena: cenaDe(ordem), origem: origem === "aliado" ? "aliado" : "propria", nome: texto(nome, 80), bonus: inteiro(bonus, 0, 99, RITMO_BASE), criticos: [] };
    return { ok: true };
  }
  /* Cada crítico conta uma vez: o id da rolagem fica guardado. */
  function criticoNoRitmo(ordem, rolagemId) {
    var a = dados(ordem);
    var id = idOk(rolagemId);
    if (!a.ritmo || a.ritmo.cena !== cenaDe(ordem) || a.ritmo.origem !== "propria") return { ok: false };
    if (!id || a.ritmo.criticos.indexOf(id) >= 0) return { ok: false, repetido: true };
    a.ritmo.criticos.push(id);
    a.ritmo.bonus += 1;
    return { ok: true, bonus: a.ritmo.bonus };
  }
  function defesaDoRitmo(ordem) {
    var a = ordem && ordem.arquivo3;
    if (!a || !a.ritmo || a.ritmo.cena !== cenaDe(ordem)) return 0;
    return a.ritmo.bonus;
  }

  /* =================================================================
     AMBIDESTRIA — –1d20 em ataques até o próximo turno
     ================================================================= */

  function usarAmbidestria(ordem, semPenalidade) {
    var a = dados(ordem);
    a.ambidestria = { cena: cenaDe(ordem), em: agora(), semPenalidade: !!semPenalidade };
    return { ok: true };
  }
  function encerrarAmbidestria(ordem) { dados(ordem).ambidestria = null; return { ok: true }; }
  function dadosDeAmbidestria(ordem) {
    var a = ordem && ordem.arquivo3;
    if (!a || !a.ambidestria || a.ambidestria.semPenalidade || a.ambidestria.cena !== cenaDe(ordem)) return 0;
    return -1;
  }

  /* =================================================================
     REGRAS DA PAIXÃO E CONDIÇÃO APAIXONADO (p. 124)
     ================================================================= */

  function paixoesValendo(ordem) {
    if (!regraLigada(ordem, "paixao")) return [];
    return ((ordem.arquivo3 && ordem.arquivo3.paixoes) || []).filter(function (p) { return !p.perdida; });
  }
  /* PV e PE do laço com bônus: atuais e máximos. Perder o parceiro tira
     o mesmo valor, permanentemente — o laço vira `perdida` e o bônus vira
     uma perda (−) no máximo. */
  /* Leitura (ver docs/ORDEM-REGRAS.md): "perde permanentemente a
     quantidade recebida" tira o bônus para sempre — o laço perdido não
     soma mais e não volta. */
  function bonusDaPaixao(ordem, qual) {
    if (!regraLigada(ordem, "paixao")) return [];
    return ((ordem.arquivo3 && ordem.arquivo3.paixoes) || []).filter(function (p) { return p.comBonus && !p.perdida; }).map(function (p) {
      return { nome: p.nome, valor: qual === "pv" ? p.pv : p.pe };
    }).filter(function (x) { return x.valor; });
  }
  function criarPaixao(ordem, nome, pv, pe, origem) {
    if (!regraLigada(ordem, "paixao") && origem !== "papinho") return desligada("paixao");
    var a = dados(ordem);
    var comBonus = origem !== "papinho" && !a.paixoes.some(function (p) { return p.comBonus && !p.perdida; });
    var p = normalizarPaixao({ id: novoId("pai"), nome: nome, pv: comBonus ? pv : 0, pe: comBonus ? pe : 0, comBonus: comBonus, origem: origem, em: agora() });
    if (!p) return { ok: false, motivo: "Diga por quem." };
    a.paixoes.push(p);
    return { ok: true, paixao: p, comBonus: comBonus };
  }
  function perderPaixao(ordem, id, motivo) {
    var p = dados(ordem).paixoes.filter(function (x) { return x.id === id; })[0];
    if (!p) return { ok: false, motivo: "Laço desconhecido." };
    if (p.perdida) return { ok: false, motivo: "Este laço já foi perdido.", repetido: true };
    p.perdida = { em: agora(), motivo: texto(motivo, 200) || "O parceiro morreu." };
    return { ok: true, paixao: p };
  }
  /* A penalidade de apaixonado: a soma dos PV e PE recebidos no laço
     íntimo (0 quando a paixão não veio de uma relação íntima). */
  function penalidadeDeApaixonado(p) { return p ? (p.pv || 0) + (p.pe || 0) : 0; }

  /* =================================================================
     BOAS RECORDAÇÕES (p. 123)
     ================================================================= */

  function registrarFoto(ordem, nome, recurso, valor) {
    if (!regraLigada(ordem, "recordacoes")) return desligada("recordacoes");
    var a = dados(ordem);
    var f = { id: novoId("fot"), nome: texto(nome, 80) || "Foto no circo", recurso: RECURSOS_DA_FOTO.indexOf(recurso) >= 0 ? recurso : "pv", valor: inteiro(valor, 1, 4, 1), em: agora() };
    a.recordacoes.fotos.push(f);
    a.recordacoes.fotos = a.recordacoes.fotos.slice(-12);
    return { ok: true, foto: f };
  }
  function olharFoto(ordem) {
    if (!regraLigada(ordem, "recordacoes")) return desligada("recordacoes");
    var a = dados(ordem);
    if (!a.recordacoes.fotos.length) return { ok: false, motivo: "Primeiro, registre uma foto." };
    if (a.recordacoes.missaoUsada === a.cronologia.missao) return { ok: false, motivo: "Uma vez por missão — já usada nesta missão." };
    a.recordacoes.missaoUsada = a.cronologia.missao;
    a.recordacoes.bonusDia = a.cronologia.dia;
    a.recordacoes.bonusGasto = false;
    return { ok: true };
  }
  function bonusDeRecordacaoPendente(ordem) {
    if (!regraLigada(ordem, "recordacoes")) return false;
    var r = ordem.arquivo3 && ordem.arquivo3.recordacoes;
    return !!(r && !r.bonusGasto && r.bonusDia >= 0 && r.bonusDia === ordem.arquivo3.cronologia.dia);
  }
  function gastarRecordacao(ordem) {
    if (!bonusDeRecordacaoPendente(ordem)) return { ok: false, motivo: "Não há +1d6 de Boas Recordações para hoje." };
    ordem.arquivo3.recordacoes.bonusGasto = true;
    return { ok: true };
  }

  /* =================================================================
     BATALHA DE INTENÇÕES (p. 120)
     ================================================================= */

  function iniciarBatalha(ordem, contra) {
    if (!regraLigada(ordem, "batalhas")) return desligada("batalhas");
    var nome = texto(contra, 80).trim();
    if (!nome) return { ok: false, motivo: "Contra quem é a batalha?" };
    dados(ordem).batalha = { contra: nome, cena: cenaDe(ordem), em: agora() };
    return { ok: true };
  }
  function encerrarBatalha(ordem) { dados(ordem).batalha = null; return { ok: true }; }
  function batalhaAtiva(ordem) {
    if (!regraLigada(ordem, "batalhas")) return null;
    var b = ordem.arquivo3 && ordem.arquivo3.batalha;
    return b || null;
  }
  /* Dano sofrido: metade, salvo o que vem do alvo da batalha. */
  function danoNaBatalha(ordem, dano, doAlvo) {
    var d = Math.max(0, inteiro(dano, 0, 99999, 0));
    if (!batalhaAtiva(ordem) || doAlvo) return d;
    return Math.floor(d / 2);
  }

  /* =================================================================
     ITENS DO AS3 — marcas por cronologia
     ================================================================= */

  function usarPacoca(ordem) {
    var a = dados(ordem);
    if (a.itens.pacocaDia === a.cronologia.dia) return { ok: false, motivo: "A recuperação da Paçoca é uma vez por dia (dia " + a.cronologia.dia + " da campanha)." };
    a.itens.pacocaDia = a.cronologia.dia;
    return { ok: true };
  }
  /* Crânio Dominador: 24 horas — o próximo dia da cronologia. */
  function cranioDisponivel(ordem) {
    var a = dados(ordem);
    return a.itens.cranioDia < 0 || a.cronologia.dia > a.itens.cranioDia;
  }
  function usarCranio(ordem) {
    if (!cranioDisponivel(ordem)) return { ok: false, motivo: "O crânio só volta a ser útil depois de 24 horas (no próximo dia da campanha). Quando voltar, as correntes antigas somem." };
    var a = dados(ordem);
    a.itens.cranioDia = a.cronologia.dia;
    return { ok: true };
  }

  /* Armadura dos Couraças (p. 115): +10 na Defesa e +1 por semana de uso
     (até +20); testes de Vontade (tocar) e Fortitude (controle) contra
     6d6, refeitos a cada semana ou nova missão. */
  function couraca(ordem, itemId) {
    var a = dados(ordem);
    var c = a.itens.couracas.filter(function (x) { return x.itemId === itemId; })[0];
    if (!c && idOk(itemId)) {
      c = { itemId: itemId, semanas: 0, vontade: "", fortitude: "", dt: 0, semana: -1, missao: -1 };
      a.itens.couracas.push(c);
      a.itens.couracas = a.itens.couracas.slice(-4);
    }
    return c || null;
  }
  function bonusDaCouraca(ordem, itemId) {
    var a = ordem && ordem.arquivo3;
    var c = a ? a.itens.couracas.filter(function (x) { return x.itemId === itemId; })[0] : null;
    return c ? Math.min(10, c.semanas) : 0;
  }
  function testesDaCouracaVencidos(ordem, itemId) {
    var a = dados(ordem);
    var c = a.itens.couracas.filter(function (x) { return x.itemId === itemId; })[0];
    if (!c || c.semana < 0) return true;
    return c.semana !== a.cronologia.semana || c.missao !== a.cronologia.missao;
  }
  function registrarTestesDaCouraca(ordem, itemId, dt, vontade, fortitude) {
    var c = couraca(ordem, itemId);
    if (!c) return { ok: false, motivo: "Item desconhecido." };
    var a = dados(ordem);
    c.dt = inteiro(dt, 6, 36, 6);
    c.vontade = vontade === "passou" || vontade === "falhou" ? vontade : "";
    c.fortitude = fortitude === "passou" || fortitude === "falhou" ? fortitude : "";
    c.semana = a.cronologia.semana;
    c.missao = a.cronologia.missao;
    return { ok: true };
  }
  function semanaDeCouraca(ordem, itemId) {
    var c = couraca(ordem, itemId);
    if (!c) return { ok: false };
    c.semanas = Math.min(10, c.semanas + 1);
    return { ok: true, bonus: c.semanas };
  }

  /* =================================================================
     ALIADOS DO AS3 NA FICHA (p. 116-118 e 133)
     -----------------------------------------------------------------
     O bônus de um aliado só vale enquanto ele acompanha o personagem:
     cada perfil copiado para a aba Aliados ganha aqui um registro
     ("acompanhando", e as escolhas que o perfil pede). As contas leem
     só os bônus FIXOS; os condicionais e os de custo ficam com botões.
     ================================================================= */

  var PERICIAS_DE_INTELECTO = ["atualidades", "ciencias", "investigacao", "medicina", "ocultismo", "profissao", "sobrevivencia", "tatica", "tecnologia"];

  var EFEITOS_DE_ALIADO = {
    "as3.criatura.caio-aliado": { efeitos: [{ tipo: "dadosPericia", pericias: ["furtividade"], valor: 1 }], texto: "+1d20 em Furtividade" },
    "as3.criatura.cindy-aliado": { efeitos: [{ tipo: "bonusPericia", pericias: ["diplomacia", "enganacao", "intimidacao"], valor: 5 }], texto: "+5 em Diplomacia, Enganação e Intimidação (exceto contra a Cindy)" },
    "as3.criatura.eloy-aliado": { efeitos: [{ tipo: "resistenciaDano", dano: "geral", valor: 5 }], texto: "resistência a dano 5" },
    "as3.criatura.chispa-aliado": { efeitos: [{ tipo: "deslocamento", valor: 9 }], texto: "+9 m de deslocamento" },
    "as3.criatura.pomba-aliado": { efeitos: [{ tipo: "treinadoPorAliado", pericias: ["crime", "sobrevivencia"], seJaTreinado: 2 }], texto: "treinado em Crime e Sobrevivência (+2 se já for)" },
    "as3.criatura.coruja-aliado": { escolha: { quantas: 2 }, texto: "treinado em duas perícias de Intelecto escolhidas" },
    "as3.criatura.serpente-animal": { efeitos: [{ tipo: "bonusPericia", pericias: ["enganacao", "intimidacao"], valor: 2 }], texto: "+2 em Enganação e Intimidação" },
    "as3.criatura.corvo-animal": { efeitos: [{ tipo: "bonusPericia", pericias: ["percepcao", "sobrevivencia"], valor: 2 }], texto: "+2 em Percepção e Sobrevivência" },
    "as3.criatura.gato-animal": { efeitos: [{ tipo: "bonusPericia", pericias: ["percepcao", "reflexos"], valor: 2 }], texto: "+2 em Percepção e Reflexos" },
  };

  function normalizarRegistroDeAliado(b) {
    var x = obj(b);
    var id = idOk(x.aliadoId);
    var cat = String(x.catalogoId || "");
    if (!id || !EFEITOS_DE_ALIADO[cat]) return null;
    return {
      aliadoId: id, catalogoId: cat, nome: texto(x.nome, 80),
      ativo: x.ativo === true,
      pericias: lista(x.pericias).filter(function (p) { return PERICIAS_DE_INTELECTO.indexOf(p) >= 0; }).slice(0, 2),
    };
  }

  /* Os efeitos fixos dos aliados acompanhando, no formato da progressão. */
  function efeitosDeAliados(ordem) {
    var a = ordem && ordem.arquivo3;
    if (!a || !a.aliados) return [];
    var saida = [];
    a.aliados.forEach(function (r) {
      if (!r.ativo) return;
      var d = EFEITOS_DE_ALIADO[r.catalogoId];
      if (!d) return;
      var fonte = "Aliado: " + (r.nome || r.catalogoId);
      (d.efeitos || []).forEach(function (ef) { saida.push(Object.assign({}, ef, { fonte: fonte, detalhe: "Arquivos Secretos 3, p. 116-118" })); });
      if (d.escolha && r.pericias.length) {
        saida.push({ tipo: "treinadoPorAliado", pericias: r.pericias.slice(), seJaTreinado: 0, fonte: fonte, detalhe: "perícias escolhidas (AS3 p. 117)" });
      }
    });
    return saida;
  }

  function registroDeAliado(ordem, aliadoId) {
    return dados(ordem).aliados.filter(function (r) { return r.aliadoId === aliadoId; })[0] || null;
  }

  /* Liga/desliga o bônus de um aliado (e cria o registro na primeira vez). */
  function acompanhar(ordem, aliadoId, catalogoId, nome, ativo, pericias) {
    if (!EFEITOS_DE_ALIADO[catalogoId]) return { ok: false, motivo: "Este aliado não tem bônus fixo para a ficha." };
    var a = dados(ordem);
    var r = registroDeAliado(ordem, aliadoId);
    if (!r) {
      r = normalizarRegistroDeAliado({ aliadoId: aliadoId, catalogoId: catalogoId, nome: nome });
      if (!r) return { ok: false, motivo: "Aliado inválido." };
      a.aliados.push(r);
    }
    if (Array.isArray(pericias)) {
      var esc = EFEITOS_DE_ALIADO[catalogoId].escolha;
      var l = pericias.filter(function (p, i) { return PERICIAS_DE_INTELECTO.indexOf(p) >= 0 && pericias.indexOf(p) === i; });
      if (esc && l.length !== esc.quantas) return { ok: false, motivo: "Escolha " + esc.quantas + " perícias de Intelecto diferentes." };
      r.pericias = l.slice(0, 2);
    }
    r.ativo = !!ativo;
    r.nome = texto(nome, 80) || r.nome;
    return { ok: true, registro: r };
  }

  /* Tira os registros de aliados que saíram da ficha. */
  function podarAliados(ordem, idsPresentes) {
    var a = dados(ordem);
    var antes = a.aliados.length;
    a.aliados = a.aliados.filter(function (r) { return idsPresentes.indexOf(r.aliadoId) >= 0; });
    return antes !== a.aliados.length;
  }

  /* =================================================================
     SUSPENDER UMA REGRA (opcionais.definir, ao desligar)
     ================================================================= */

  function suspenderRegra(ordem, chave) {
    if (!ordem || !ordem.arquivo3) return null;
    var a = ordem.arquivo3;
    if (chave === REGRAS.batalhas && a.batalha) return { aviso: "A batalha de intenções contra " + a.batalha.contra + " fica guardada, sem efeito, até a regra voltar." };
    if (chave === REGRAS.paixao && a.paixoes.length) return { aviso: "Os laços da Paixão ficam guardados; os PV e PE deles saem das contas até a regra voltar." };
    if (chave === REGRAS.sacrificio && a.sacrificio.estigma) return { aviso: "O estigma e o registro de Digno de Sacrifício ficam guardados; o poder de sacrifício some até a regra voltar." };
    if (chave === REGRAS.trilhaGeral) return { aviso: "Uma trilha Performática fora do combatente fica guardada, sem efeito, até a regra voltar." };
    return null;
  }

  global.RAMAOrdemArquivo3 = {
    REGRAS: REGRAS,
    MOTIVOS: MOTIVOS,
    regraLigada: regraLigada,
    ESTIGMAS: ESTIGMAS,
    POR_ESTIGMA: POR_ESTIGMA,
    MARCOS: MARCOS,
    normalizar: normalizar,
    vazio: vazio,
    dados: dados,
    cenaDe: cenaDe,
    interludioDe: interludioDe,
    avancar: avancar,
    suspenderRegra: suspenderRegra,

    registrarDigno: registrarDigno,
    registrarEstigma: registrarEstigma,
    poderDeSacrificio: poderDeSacrificio,
    registrarUsoDeSacrificio: registrarUsoDeSacrificio,
    definirFruto: definirFruto,

    taxaDoFlagelo: taxaDoFlagelo,
    pagarComFlagelo: pagarComFlagelo,
    usosDeRecuperacao: usosDeRecuperacao,
    estadoDaRecuperacao: estadoDaRecuperacao,
    recuperarFlagelo: recuperarFlagelo,
    descansoDoFlagelo: descansoDoFlagelo,

    usarGuardiao: usarGuardiao,
    resolverGuardiao: resolverGuardiao,

    estadoDaEntrada: estadoDaEntrada,
    anunciarEntrada: anunciarEntrada,
    consumirEntrada: consumirEntrada,
    transferirEntrada: transferirEntrada,

    bonusDeEnsaio: bonusDeEnsaio,
    ensaiar: ensaiar,
    margemDoEnsaio: margemDoEnsaio,
    multiplicadorDaFrase: multiplicadorDaFrase,
    guardarFrase: guardarFrase,
    consumirFrase: consumirFrase,
    dadosDoMoshPit: dadosDoMoshPit,
    RITMO_BASE: RITMO_BASE,
    iniciarRitmo: iniciarRitmo,
    criticoNoRitmo: criticoNoRitmo,
    defesaDoRitmo: defesaDoRitmo,

    usarAmbidestria: usarAmbidestria,
    encerrarAmbidestria: encerrarAmbidestria,
    dadosDeAmbidestria: dadosDeAmbidestria,

    paixoesValendo: paixoesValendo,
    bonusDaPaixao: bonusDaPaixao,
    criarPaixao: criarPaixao,
    perderPaixao: perderPaixao,
    penalidadeDeApaixonado: penalidadeDeApaixonado,

    registrarFoto: registrarFoto,
    olharFoto: olharFoto,
    bonusDeRecordacaoPendente: bonusDeRecordacaoPendente,
    gastarRecordacao: gastarRecordacao,

    iniciarBatalha: iniciarBatalha,
    encerrarBatalha: encerrarBatalha,
    batalhaAtiva: batalhaAtiva,
    danoNaBatalha: danoNaBatalha,

    diasDeConstrucao: diasDeConstrucao,
    pontosDoDardo: pontosDoDardo,
    planoDoSoco: planoDoSoco,
    resultadoDoSoco: resultadoDoSoco,

    usarPacoca: usarPacoca,
    cranioDisponivel: cranioDisponivel,
    usarCranio: usarCranio,
    couraca: couraca,
    bonusDaCouraca: bonusDaCouraca,
    testesDaCouracaVencidos: testesDaCouracaVencidos,
    registrarTestesDaCouraca: registrarTestesDaCouraca,
    semanaDeCouraca: semanaDeCouraca,

    MODELOS_VEICULO: MODELOS_VEICULO,
    REGALIAS: REGALIAS,
    DEFEITOS: DEFEITOS,
    POR_REGALIA: POR_REGALIA,
    POR_DEFEITO: POR_DEFEITO,
    COMBUSTIVEL_MAXIMO: COMBUSTIVEL_MAXIMO,
    velocidadeDeManobra: velocidadeDeManobra,
    planoDeReparo: planoDeReparo,
    normalizarVeiculo: normalizarVeiculo,
    novoVeiculo: novoVeiculo,
    contasDoVeiculo: contasDoVeiculo,
    dadosARolar: dadosARolar,
    gastarCombustivel: gastarCombustivel,
    reabastecer: reabastecer,
    usarGalao: usarGalao,
    danificarVeiculo: danificarVeiculo,
    registrarDefeito: registrarDefeito,
    penalidadesDoVeiculo: penalidadesDoVeiculo,
    repararVeiculo: repararVeiculo,
    definirManobra: definirManobra,
    usarArsenal: usarArsenal,

    EFEITOS_DE_ALIADO: EFEITOS_DE_ALIADO,
    PERICIAS_DE_INTELECTO: PERICIAS_DE_INTELECTO,
    efeitosDeAliados: efeitosDeAliados,
    registroDeAliado: registroDeAliado,
    acompanhar: acompanhar,
    podarAliados: podarAliados,
    vdDoAnimal: vdDoAnimal,
    normalizarAnimal: normalizarAnimal,

    VALORES_MEDIOS: VALORES_MEDIOS,
    expressaoDoLivro: expressaoDoLivro,
    linhasDoVd: linhasDoVd,
    linhaDuasAbaixo: linhaDuasAbaixo,
    planoDeValores: planoDeValores,
  };
})(typeof window !== "undefined" ? window : globalThis);
