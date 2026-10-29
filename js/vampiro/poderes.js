/* =====================================================================
   R.A.M.A. — Vampiro: A Máscara (V5) · poderes, Rituais e Alquimia
   =====================================================================
   Ativar um poder tem fases, e cada uma é visível:
     1. declarar     ativarPoder(): confere posse, estado, custos;
     2. custos       Checagens de Sangue (com a rerrolagem da Potência para
                     poderes até o nível da tabela), FdV, Máculas;
     3. teste        a parada do poder (resultado PENDENTE, como todo teste);
     4. decisões     rerrolar com FdV, julgar contra a resistência;
     5. resolução    resolverPoder(): aplica o efeito definido;
     6. persistência o efeito ativo fica em `efeitos`, com a duração, e
                     expira no momento certo (regras.expirarPor).
   Uma falha na Checagem aumenta a Fome e NÃO cancela o poder (p. 217).
   Poderes mentais e narrativos: o motor resolve custo, teste e duração;
   o que o alvo faz é da mesa — nada aqui decide por outra pessoa.
   ===================================================================== */

(function (global) {
  "use strict";

  var R = global.RAMAVampiro;
  var C = global.RAMAVampiroCatalogo;
  var D = global.RAMAVampiroDados;
  var DS = global.RAMAVampiroDisciplinas;

  function falha(m, x) { return Object.assign({ ok: false, motivo: m, eventos: [] }, x || {}); }
  function evento(t, d) { return R.evento(t, d); }
  function lista(v) { return Array.isArray(v) ? v : []; }

  /* Os poderes disponíveis agora: os da ficha e os temporários
     (sangue-ralo pela Ressonância, Direto da Fonte). */
  function poderesDisponiveis(o) {
    var out = R.poderesDaFicha(o).map(function (p) { return p.chave; });
    o.efeitos.forEach(function (e) { lista(e.dados.poderes).forEach(function (k) { if (out.indexOf(k) < 0) out.push(k); }); });
    return out;
  }

  /* O que o poder vale para a mesa ler antes de usar. */
  function descreverPoder(o, chave) {
    var def = DS.poder(chave);
    if (!def) return null;
    var nivel = R.valorDeDisciplina(o, def.disciplina);
    var pot = C.potencia(R.potencia(o));
    var checks = def.custo && def.custo.checagens ? def.custo.checagens : 0;
    return {
      def: def, nivel: nivel,
      checagens: checks,
      rerrolaChecagem: checks > 0 && pot.rerrolagem >= def.nivel,
      ativo: o.efeitos.some(function (e) { return e.origem.tipo === "poder" && e.origem.chave === chave; }),
      passivo: def.duracao === "passiva",
    };
  }

  function valorDoEfeito(v, nivel, margem) {
    if (v === "nivel") return nivel;
    if (v === "metadeCima") return Math.ceil(nivel / 2);
    if (v === "margem") return margem || 0;
    return v;
  }

  /* Declarar e pagar. `x`: { parada (índice), alvo, contexto, dificuldade,
     oposicao, checagensExtras, modificadores, opcionais, surto }. */
  function ativarPoder(o, chave, x, rolador) {
    var op = x || {};
    var def = DS.poder(chave);
    if (!def) return falha("Poder desconhecido.");
    if (poderesDisponiveis(o).indexOf(chave) < 0) return falha("A ficha não tem " + def.nome + ".");
    if (def.duracao === "passiva" && !def.parada) return falha(def.nome + " é passivo: já vale sempre.");
    if (o.estado.morteFinal || o.estado.torpor) return falha("Não pode usar poderes agora.");
    var disc = DS.DISCIPLINAS[def.disciplina];
    if (o.estado.frenesi && disc.tipo !== "fisica") return falha("Em frenesi, só Disciplinas físicas.");
    if (o.estado.estacado && disc.tipo !== "mental") return falha("Estacado: só Disciplinas mentais.");
    if (def.limite === "cena" && o.marcas.cena["poder-" + chave]) return falha(def.nome + ": uma vez por cena.");
    var eventos = [];
    /* Custos. */
    var n = def.custo && def.custo.checagens ? def.custo.checagens : 0;
    if (def.custo && def.custo.ate) n = Math.max(1, Math.min(def.custo.ate, Number(op.checagens) || 1));
    if (def.custo && def.custo.porUso) n = Math.max(1, Math.min(10, Number(op.checagens) || 1));
    if (def.custo && def.custo.opcional && !op.comCusto) n = 0;
    n += Math.max(0, Number(op.checagensExtras) || 0);
    if (n) {
      if (o.natureza === "carnical") {
        if (def.nivel > 1) eventos = eventos.concat(R.sofrerDano(o, { trilha: "vitalidade", tipo: "agravado", valor: 1, naoDividir: true }).eventos);
      } else if (o.natureza === "vampiro") {
        if (o.fome >= 5) return falha("Com Fome 5 não se Inflama o Sangue por vontade (p. 211).", { fome5: true });
        var ch = R.checagens(o, n, { motivo: def.nome, nivelDoPoder: def.nivel, contexto: "poder" }, rolador);
        if (!ch.ok) return ch;
        eventos = eventos.concat(ch.eventos);
      }
    }
    if (def.custo && def.custo.fdv) eventos = eventos.concat(R.gastarForcaDeVontade(o, def.custo.fdv, def.nome).eventos);
    if (def.custo && def.custo.maculas) eventos = eventos.concat(R.adicionarMaculas(o, Math.max(1, Number(op.maculas) || 1), def.nome).eventos);
    if (def.limite === "cena") o.marcas.cena["poder-" + chave] = true;
    eventos.push(evento("poder", { chave: chave, nome: def.nome, checagens: n }));
    /* Teste. */
    var resultado = null;
    if (def.parada) {
      var par = def.parada[Math.max(0, Math.min(def.parada.length - 1, Number(op.parada) || 0))];
      var pedido = { atributo: par[0], contexto: lista(op.contexto), poder: chave, dificuldade: op.dificuldade !== undefined ? op.dificuldade : def.dificuldade, oposicao: op.oposicao, modificadores: op.modificadores, opcionais: op.opcionais, surto: op.surto, rotulo: def.nome };
      if (par[1] === "disciplina") pedido.disciplina = def.disciplina;
      else if (C.habilidade(par[1])) pedido.habilidade = par[1];
      else if (DS.DISCIPLINAS[par[1]]) pedido.disciplina = par[1];
      else if (C.atributo(par[1])) pedido.atributo2 = par[1];
      var r = R.rolarTeste(o, pedido, rolador);
      if (!r.ok) return Object.assign(r, { eventos: eventos.concat(r.eventos || []) });
      resultado = r.resultado;
      resultado.poder = chave;
      eventos = eventos.concat(r.eventos);
    }
    /* Sem teste: o efeito vale já. */
    if (!resultado) eventos = eventos.concat(aplicarEfeitoDoPoder(o, def, { margem: 0, critico: false }));
    return { ok: true, eventos: eventos, resultado: resultado };
  }

  /* Depois do teste concluído: vitória aplica o efeito do poder. A
     falha não devolve a Checagem (ela já foi feita). */
  function resolverPoder(o, resultado) {
    var def = DS.poder(resultado.poder);
    if (!def) return falha("Poder desconhecido.");
    if (resultado.pendente) {
      var c = R.concluirTeste(o, resultado, { semJulgamento: !resultado.classificacao.julgado });
      if (!c.ok) return c;
      var ev = c.eventos;
    }
    var cl = resultado.classificacao;
    var eventos = (ev || []).concat([evento("poderResolvido", { chave: def.chave, vitoria: cl.julgado ? cl.vitoria : null, margem: cl.margem || 0, critico: !!cl.vitoriaCritica })]);
    if (cl.julgado && !cl.vitoria) {
      if (cl.falhaTotal && def.falhaTotal) eventos.push(evento("falhaTotalDoPoder", { texto: def.falhaTotal }));
      return { ok: true, eventos: eventos };
    }
    return { ok: true, eventos: eventos.concat(aplicarEfeitoDoPoder(o, def, { margem: cl.margem || cl.sucessos, critico: !!cl.vitoriaCritica })) };
  }

  /* O efeito persistente (o que tem duração) entra em `efeitos`. */
  function aplicarEfeitoDoPoder(o, def, r) {
    var eventos = [];
    var nivel = R.valorDeDisciplina(o, def.disciplina);
    var ef = def.efeitos || {};
    var dados = {};
    if (ef.reduzSuperficial) dados.reducao = valorDoEfeito(ef.reduzSuperficial, nivel);
    if (ef.converteAgravado) dados.restante = valorDoEfeito(ef.converteAgravado, nivel);
    if (ef.ignoraPenalidadeVitalidade) {
      /* Poder Vindo da Dor: +1 Físico por nível de dano, até Surto + 6. */
      var dano = o.vitalidade.superficial + o.vitalidade.agravado;
      if (dano) {
        var teto = C.potencia(R.potencia(o)).surto + 6;
        var forca = R.valorDeAtributo(o, "forca");
        dados.atributos = { forca: Math.max(0, Math.min(dano, teto - forca)) };
      }
    }
    if (ef.forma) dados.forma = ef.forma;
    if (ef.potenciaTemporaria) dados.potencia = r.critico ? ef.potenciaCritico : ef.potenciaTemporaria;
    if (ef.vitalidade) dados.vitalidade = valorDoEfeito(ef.vitalidade, nivel);
    if (def.chave === "subjugarABesta") dados.alvo = true;
    var temDuracao = ["passiva", "uso", "turno"].indexOf(def.duracao) < 0 || ef.mods || Object.keys(dados).length;
    if (temDuracao && def.duracao !== "passiva") {
      var duracao = def.duracao === "ate desativar" ? "indefinida" : def.duracao === "doPoder" || def.duracao === "horas" ? "cena" : def.duracao === "dia" ? "noite" : def.duracao;
      R.adicionarEfeito(o, { chave: def.chave, nome: def.nome, origem: { tipo: "poder", chave: def.chave }, duracao: duracao, dados: dados });
      eventos.push(evento("efeito", { chave: def.chave, nome: def.nome, duracao: duracao }));
    }
    if (ef.perguntas) eventos.push(evento("perguntas", { quantas: valorDoEfeito(ef.perguntas, nivel, r.margem) }));
    if (ef.danoAgravado || ef.danoVeneno || ef.fomeNoAlvo || ef.danoSocial) eventos.push(evento("efeitoNoAlvo", { poder: def.chave, margem: r.margem, critico: r.critico }));
    return eventos;
  }

  /* Encerrar um poder ativo antes do fim (desativar). */
  function desativarPoder(o, chave) {
    var e = o.efeitos.filter(function (x) { return x.origem.tipo === "poder" && x.origem.chave === chave; })[0];
    if (!e) return falha("O poder não está ativo.");
    R.removerEfeito(o, e.id);
    return { ok: true, eventos: [evento("efeitoEncerrado", { chave: chave })] };
  }

  /* Direto da Fonte (Celeridade, Fortitude, Potência 4): quem bebe
     ganha metade dos pontos do doador e os poderes até esse nível, por
     uma noite. Chamado na ficha de quem bebe (o servidor opera as duas). */
  function receberDiretoDaFonte(o, disciplina, pontosDoDoador, poderesDoDoador) {
    var pontos = Math.floor(Number(pontosDoDoador) / 2);
    if (!pontos) return falha("O doador precisa de ao menos 2 pontos.");
    var poderes = lista(poderesDoDoador).filter(function (k) { var d = DS.poder(k); return d && d.disciplina === disciplina && d.nivel <= pontos && !d.amalgama; });
    var d = {}; d[disciplina] = pontos;
    R.adicionarEfeito(o, { chave: "diretoDaFonte", nome: DS.DISCIPLINAS[disciplina].nome + " Direto da Fonte", origem: { tipo: "sangue", chave: disciplina }, duracao: o.natureza === "vampiro" ? "alimentacao" : "noite", dados: { disciplinas: d, poderes: poderes } });
    return { ok: true, eventos: [evento("diretoDaFonte", { disciplina: disciplina, pontos: pontos })] };
  }

  /* ---------------- RITUAIS (p. 274–282) ---------------- */

  /* conhecido → em execução (5 min/nível) → teste → efeito ativo.
     `x`: { modificadores, dificuldadeExtra (círculo: +2) }. */
  function executarRitual(o, chave, x, rolador) {
    var op = x || {};
    var def = DS.ritual(chave);
    if (!def) return falha("Ritual desconhecido.");
    if (!o.rituais.some(function (r) { return r.chave === chave; })) return falha("A ficha não conhece " + def.nome + ".");
    if (R.valorDeDisciplina(o, "feiticaria") < def.nivel) return falha(def.nome + " exige Feitiçaria de Sangue " + def.nivel + ".");
    if (o.estado.frenesi || o.estado.torpor || o.estado.morteFinal) return falha("Não pode conduzir um Ritual agora.");
    var eventos = [];
    var n = def.custo.checagens || 1;
    if (o.fome >= 5) return falha("Com Fome 5 não se Inflama o Sangue por vontade.");
    var ch = R.checagens(o, n, { motivo: def.nome, contexto: "ritual" }, rolador);
    if (!ch.ok) return ch;
    eventos = eventos.concat(ch.eventos);
    if (def.maculasPossiveis && op.maculas) eventos = eventos.concat(R.adicionarMaculas(o, op.maculas, def.nome).eventos);
    eventos.push(evento("ritual", { chave: chave, nome: def.nome, minutos: def.execucaoMinutos, noites: def.execucaoNoites || 0 }));
    var dif = def.dificuldade + (def.circulo ? 2 : 0) + (Number(op.dificuldadeExtra) || 0);
    var r = R.rolarTeste(o, { atributo: "inteligencia", disciplina: "feiticaria", dificuldade: dif, modificadores: op.modificadores, rotulo: def.nome, contexto: ["ritual"] }, rolador);
    if (!r.ok) return Object.assign(r, { eventos: eventos.concat(r.eventos || []) });
    r.resultado.ritual = chave;
    return { ok: true, eventos: eventos.concat(r.eventos), resultado: r.resultado };
  }

  function resolverRitual(o, resultado) {
    var def = DS.ritual(resultado.ritual);
    if (!def) return falha("Ritual desconhecido.");
    var eventos = [];
    if (resultado.pendente) {
      var c = R.concluirTeste(o, resultado);
      if (!c.ok) return c;
      eventos = c.eventos;
    }
    var cl = resultado.classificacao;
    eventos.push(evento("ritualResolvido", { chave: def.chave, vitoria: cl.vitoria, critico: !!cl.vitoriaCritica }));
    if (!cl.vitoria) return { ok: true, eventos: eventos };
    var duracao = { cena: "cena", noite: "noite", dia: "noite", indefinida: "indefinida", uso: "uso" }[def.duracao] || (def.duracao ? "indefinida" : "uso");
    if (def.duracao) {
      var dados = Object.assign({}, def.efeitos || {});
      if (cl.vitoriaCritica) dados.critico = true;
      R.adicionarEfeito(o, { chave: def.chave, nome: def.nome, origem: { tipo: "ritual", chave: def.chave }, duracao: duracao, dados: dados });
      eventos.push(evento("efeito", { chave: def.chave, nome: def.nome, duracao: duracao }));
    }
    return { ok: true, eventos: eventos };
  }

  /* ---------------- ALQUIMIA SANGUE-RALO (p. 282–287) ---------------- */

  /* Destilar: o custo de DESTILAÇÃO (o vitae do Alquimista: uma
     Checagem) é separado do de ATIVAÇÃO (o do poder). */
  function destilar(o, chave, x, rolador) {
    var op = x || {};
    var def = DS.poder(chave);
    if (!def || !def.formula) return falha("Fórmula desconhecida.");
    if (!R.ehSangueRalo(o)) return falha("Alquimia é dos sangues-ralos.");
    if (!o.formulas.some(function (f) { return f.chave === chave; })) return falha("A ficha não conhece " + def.nome + ".");
    var alq = R.valorDeDisciplina(o, "alquimia");
    if (def.nivel > alq) return falha(def.nome + " exige Alquimia " + def.nivel + ".");
    var metodo = DS.METODOS_DE_ALQUIMIA[o.metodoAlquimia];
    if (!metodo) return falha("Escolha o método de Alquimia.");
    var mods = lista(op.modificadores).slice();
    if (o.metodoAlquimia === "fixatio" && !op.laboratorio) {
      if (def.nivel > 3) return falha("Sem laboratório, só fórmulas fracas (nível 3 ou menos).");
      mods.push({ fonte: "Sem laboratório", valor: metodo.semLaboratorio });
    }
    if (o.metodoAlquimia === "fixatio") {
      var guardadas = o.formulasProntas.filter(function (f) { return !f.consumida; }).length;
      var cap = 2 * (alq + R.pontosDeVantagem(o, "refugio"));
      if (guardadas >= cap) return falha("Armazenamento cheio: até 2 × (Alquimia + Refúgio) = " + cap + ".");
    }
    if (o.fome >= 5) return falha("Com Fome 5 não se Inflama o Sangue por vontade.");
    var ch = R.checagemDeSangue(o, { motivo: "Destilar " + def.nome, contexto: "destilacao" }, rolador);
    if (!ch.ok) return ch;
    var r = R.rolarTeste(o, { atributo: metodo.parada[0], disciplina: "alquimia", modificadores: mods, rotulo: "Destilar " + def.nome, contexto: ["alquimia"] }, rolador);
    if (!r.ok) return r;
    r.resultado.formula = chave;
    return { ok: true, eventos: ch.eventos.concat(r.eventos), resultado: r.resultado };
  }

  function concluirDestilacao(o, resultado) {
    var def = DS.poder(resultado.formula);
    if (resultado.pendente) {
      var c = R.concluirTeste(o, resultado, { semJulgamento: true });
      if (!c.ok) return c;
    }
    var q = DS.qualidadeDaDestilacao(resultado.classificacao.sucessos);
    if (q === "falha") return { ok: true, eventos: [evento("destilacao", { chave: def.chave, qualidade: q })] };
    var pronta = { id: R.novoId("fp"), chave: def.chave, qualidade: q, sucessos: resultado.classificacao.sucessos, metodo: o.metodoAlquimia, ativa: false, consumida: false };
    if (o.metodoAlquimia === "athanorCorporis") {
      /* Um poder ativo por vez: a nova substitui a anterior não usada. */
      o.formulasProntas.forEach(function (f) { if (f.metodo === "athanorCorporis" && !f.consumida) f.consumida = true; });
    }
    o.formulasProntas.push(pronta);
    return { ok: true, eventos: [evento("destilacao", { chave: def.chave, qualidade: q, sucessos: pronta.sucessos })], pronta: pronta };
  }

  /* Ativar uma fórmula pronta: consome-a UMA vez e paga a ativação. */
  function ativarFormula(o, id, x, rolador) {
    var f = o.formulasProntas.filter(function (y) { return y.id === id; })[0];
    if (!f) return falha("Fórmula pronta não encontrada.");
    if (f.consumida) return falha("Esta dose já foi usada.");
    var def = DS.poder(f.chave);
    f.consumida = true;
    var eventos = [evento("formulaAtivada", { chave: f.chave, qualidade: f.qualidade })];
    var n = def.custo && def.custo.checagens ? def.custo.checagens : 0;
    if (n) {
      if (o.fome >= 5) { f.consumida = false; return falha("Com Fome 5 não se Inflama o Sangue por vontade."); }
      var ch = R.checagens(o, n, { motivo: def.nome, contexto: "formula" }, rolador);
      if (!ch.ok) { f.consumida = false; return ch; }
      eventos = eventos.concat(ch.eventos);
    }
    var resultado = null;
    if (def.parada) {
      var par = def.parada[0];
      var pedido = { atributo: par[0], disciplina: "alquimia", rotulo: def.nome, oposicao: x && x.oposicao, dificuldade: x && x.dificuldade };
      if (C.atributo(par[1])) { delete pedido.disciplina; pedido.atributo2 = par[1]; }
      if (f.qualidade === "fraca") pedido.modificadores = [{ fonte: "Destilação fraca", valor: -1 }];
      if (f.qualidade === "aumentada") pedido.modificadores = [{ fonte: "Destilação aumentada", valor: 1 }];
      var r = R.rolarTeste(o, pedido, rolador);
      if (!r.ok) return Object.assign(r, { eventos: eventos });
      resultado = r.resultado;
      resultado.poder = f.chave;
    } else {
      eventos = eventos.concat(aplicarEfeitoDoPoder(o, def, { margem: f.sucessos, critico: false }));
    }
    if (o.metodoAlquimia === "calcinatio") eventos.push(evento("calcinatio", { sacia: Math.max(1, def.nivel), texto: "Beber do alvo sacia Fome = nível do poder (mínimo 1)." }));
    return { ok: true, eventos: eventos, resultado: resultado };
  }

  global.RAMAVampiroPoderes = {
    poderesDisponiveis: poderesDisponiveis, descreverPoder: descreverPoder,
    ativarPoder: ativarPoder, resolverPoder: resolverPoder, desativarPoder: desativarPoder, receberDiretoDaFonte: receberDiretoDaFonte,
    executarRitual: executarRitual, resolverRitual: resolverRitual,
    destilar: destilar, concluirDestilacao: concluirDestilacao, ativarFormula: ativarFormula,
  };
})(typeof window !== "undefined" ? window : globalThis);
