/* =====================================================================
   R.A.M.A. — Ordem Paranormal · RAMIFICAÇÃO: futuros do personagem
   =====================================================================
   Planejar a evolução de uma ficha de Ordem Paranormal (1ª edição):
   testar caminhos, comparar e — se a pessoa ativar — aplicar as escolhas
   salvas quando a progressão REAL chegar a cada marco.

   Nada aqui tem tabela própria. A projeção é uma CÓPIA da ficha com o
   marco alvo, e toda conta é do motor de verdade:

     RAMAOrdemRegras.trilho/calcular   o trilho (NEX, nível com NEX &
                                        Experiência, patente, estágio) e
                                        os recursos
     RAMAOrdemProgressao.vagas/estado  as decisões que cada marco abre e
                                        o que elas produzem
     RAMAOrdemProgressao.confirmarAquisicao
                                        a MESMA porta que a Progressão
                                        usa para gravar uma escolha (e as
                                        cópias de ritual): na projeção e
                                        na aplicação real

   ---------------------------------------------------------------------
   O PLANO (guardado à parte da ficha, só do dono — Ordem.gs)
   ---------------------------------------------------------------------
     { id, nome, formato, alvo, base: { progresso, assinatura },
       regras: { tipo }, decisoes: { idDaVaga: decisão }, criadoEm,
       atualizadoEm }

     decisão: { tipo, candidato: { valor, opcoes }, rituais: [cópias] }
              — ou { tipo: "trilha", trilha } / { tipo: "afinidade",
              afinidade: { elemento, nomeOutro } }

   Por VAGA ESTÁVEL (o id da progressão), nunca por texto: ligar ou
   desligar uma regra não renomeia escolha nenhuma.

   ---------------------------------------------------------------------
   A ATIVAÇÃO (na ficha, `ordem.ramificacao`)
   ---------------------------------------------------------------------
     { planoId, nomePlano, tipo, ativadoEm, processado, recibos,
       pendentes, ultimoResumo, pausado }

   `processado` é a progressão já conferida. Quando a progressão REAL
   passa dele (o dono ou o Mestre mudou NEX, nível, PP ou estágio e a
   ficha foi gravada), as vagas que passaram a existir são processadas
   em ordem; abrir a ficha ou ativar o plano não abre vaga nenhuma. Cada
   recibo é por plano e vaga: repetir, recarregar, abrir duas abas ou a
   ficha cair e voltar ao mesmo marco não concede de novo. A gravação
   das escolhas, dos recibos e do novo `processado` é UMA gravação da
   ficha (com a revisão dela).
   ===================================================================== */

(function (global) {
  "use strict";

  function C() { return global.RAMAOrdemCatalogo; }
  function R() { return global.RAMAOrdemRegras; }
  function E() { return global.RAMAOrdemProgressao; }

  var FORMATO = 1;
  var LIMITE_PLANOS = 8;
  var TIPOS = {
    nex: "NEX convencional",
    nivelExposicao: "NEX & Experiência",
    patente: "Evolução por Patentes",
    estagio: "Sobrevivente (estágios)",
    mundano: "Mundano",
  };

  function copiar(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function inteiro(v, a, b, p) { var n = Math.floor(Number(v)); if (!isFinite(n)) return p === undefined ? a : p; return Math.max(a, Math.min(b, n)); }
  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function agora() { return new Date().toISOString(); }

  /* JSON com as chaves em ordem: duas escolhas iguais dão o mesmo texto. */
  function estavel(v) {
    if (Array.isArray(v)) return "[" + v.map(estavel).join(",") + "]";
    if (v && typeof v === "object") return "{" + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ":" + estavel(v[k]); }).join(",") + "}";
    return JSON.stringify(v === undefined ? null : v);
  }
  function hash(texto) { var h = 5381; for (var i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }

  /* =================================================================
     O TRILHO EM USO
     ================================================================= */
  function tipoDoTrilho(o) {
    var f = R().faseDe(o || {});
    if (f.perfil === "mundano") return "mundano";
    if (f.perfil === "sobrevivente") return "estagio";
    var t = R().trilho(o);
    if (t.porPatente) return "patente";
    if (t.separado) return "nivelExposicao";
    return "nex";
  }
  /* A progressão confirmada, na unidade da regra. */
  function progressoDe(o) {
    var t = R().trilho(o);
    return {
      tipo: tipoDoTrilho(o),
      nex: R().nexValido(o.nex),
      nivel: inteiro(o.nivel, 1, 20, 1),
      patente: t.porPatente ? t.patente : 0,
      estagio: R().faseDe(o).estagio || 0,
      passos: t.passos,
    };
  }
  function nexDoAlvo(v) { return R().nexValido(v); }
  /* Os valores que o alvo pode ter: só ACIMA da base e até o teto. */
  function opcoesDoAlvo(o) {
    var p = progressoDe(o), REG = C().REGRAS;
    var nexes = [];
    for (var n = REG.nexMinimo; n <= 95; n += REG.passoNex) nexes.push(n);
    nexes.push(99);
    if (p.tipo === "nex") return { nex: nexes.filter(function (n) { return n > p.nex; }) };
    if (p.tipo === "nivelExposicao") {
      var nv = []; for (var i = p.nivel + 1; i <= 20; i++) nv.push(i);
      return { nivel: nv, exposicao: nexes.filter(function (n) { return n > p.nex; }) };
    }
    if (p.tipo === "patente") {
      var pts = []; for (var j = p.patente + 1; j <= 4; j++) { var pt = C().patenteDaEvolucao(j); pts.push({ indice: j, nome: pt.nome, pp: pt.pp }); }
      return { patente: pts };
    }
    if (p.tipo === "estagio") { var es = []; for (var k = p.estagio + 1; k <= 5; k++) es.push(k); return { estagio: es }; }
    return {};
  }
  function alvoPadrao(o) {
    var op = opcoesDoAlvo(o), p = progressoDe(o);
    if (p.tipo === "nex") return { nex: op.nex.length ? op.nex[Math.min(2, op.nex.length - 1)] : p.nex };
    if (p.tipo === "nivelExposicao") return { nivel: op.nivel.length ? op.nivel[0] : p.nivel, exposicao: null };
    if (p.tipo === "patente") return { patente: op.patente.length ? op.patente[0].indice : p.patente };
    if (p.tipo === "estagio") return { estagio: op.estagio.length ? op.estagio[0] : p.estagio };
    return {};
  }
  /* O alvo dentro das bordas da regra (nunca abaixo da base). */
  function normalizarAlvo(o, alvo) {
    var a = obj(alvo), p = progressoDe(o);
    if (p.tipo === "nex") return { nex: Math.max(p.nex, nexDoAlvo(a.nex === undefined ? p.nex : a.nex)) };
    if (p.tipo === "nivelExposicao") return {
      nivel: a.nivel === null || a.nivel === undefined || a.nivel === "" ? null : Math.max(p.nivel, inteiro(a.nivel, 1, 20, p.nivel)),
      exposicao: a.exposicao === null || a.exposicao === undefined || a.exposicao === "" ? null : Math.max(p.nex, nexDoAlvo(a.exposicao)),
    };
    if (p.tipo === "patente") return { patente: Math.max(p.patente, inteiro(a.patente, 0, 4, p.patente)) };
    if (p.tipo === "estagio") return { estagio: Math.max(p.estagio, inteiro(a.estagio, 1, 5, p.estagio)) };
    return {};
  }
  function rotuloDoProgresso(p) {
    if (p.tipo === "nex") return p.nex + "%";
    if (p.tipo === "nivelExposicao") return "Nível " + p.nivel + " · exposição " + p.nex + "%";
    if (p.tipo === "patente") return C().patenteDaEvolucao(p.patente).nome;
    if (p.tipo === "estagio") return "Estágio " + p.estagio;
    return "sem marcos";
  }
  function rotuloDoAlvo(o, alvo) {
    var p = progressoDe(o), a = normalizarAlvo(o, alvo);
    if (p.tipo === "nex") return a.nex + "%";
    if (p.tipo === "nivelExposicao") return [a.nivel !== null ? "Nível " + a.nivel : "", a.exposicao !== null ? "exposição " + a.exposicao + "%" : ""].filter(Boolean).join(" · ") || "sem alvo";
    if (p.tipo === "patente") { var pt = C().patenteDaEvolucao(a.patente); return pt.nome + " (mín. " + pt.pp + " PP)"; }
    if (p.tipo === "estagio") return "Estágio " + a.estagio;
    return "—";
  }
  function alvoAlcancado(o, alvo) {
    var p = progressoDe(o), a = normalizarAlvo(o, alvo);
    if (p.tipo === "nex") return a.nex <= p.nex;
    if (p.tipo === "nivelExposicao") return (a.nivel === null || a.nivel <= p.nivel) && (a.exposicao === null || a.exposicao <= p.nex);
    if (p.tipo === "patente") return a.patente <= p.patente;
    if (p.tipo === "estagio") return a.estagio <= p.estagio;
    return true;
  }
  /* A cópia no marco alvo. Nada da ficha real é tocado. */
  function projetar(o, alvo) {
    var c = copiar(o), p = progressoDe(o), a = normalizarAlvo(o, alvo);
    if (p.tipo === "nex") c.nex = a.nex;
    if (p.tipo === "nivelExposicao") { if (a.nivel !== null) c.nivel = a.nivel; if (a.exposicao !== null) c.nex = a.exposicao; }
    if (p.tipo === "patente") { c.patenteConquistada = a.patente; c.prestigio = Math.max(inteiro(c.prestigio, 0, 99999, 0), C().patenteDaEvolucao(a.patente).pp); }
    if (p.tipo === "estagio") c.estagio = a.estagio;
    return c;
  }
  /* A mesma cópia num progresso já guardado (o `processado` da ativação). */
  function noProgresso(o, prog) {
    var c = copiar(o), p = obj(prog);
    if (p.tipo === "nex" || p.tipo === "nivelExposicao") c.nex = R().nexValido(p.nex);
    if (p.tipo === "nivelExposicao") c.nivel = inteiro(p.nivel, 1, 20, 1);
    if (p.tipo === "patente") { c.patenteConquistada = inteiro(p.patente, 0, 4, 0); c.prestigio = Math.min(inteiro(c.prestigio, 0, 99999, 0), C().patenteDaEvolucao(c.patenteConquistada).pp); }
    if (p.tipo === "estagio") c.estagio = inteiro(p.estagio, 1, 5, 1);
    return c;
  }

  /* NEX & Experiência: de que eixo a vaga depende. */
  function eixoDaVaga(v, tipo) {
    if (tipo !== "nivelExposicao") return tipo;
    if (/^x\d/.test(v.id) || /^t\d/.test(v.id) || v.id === "afinidade") return "exposicao";
    return "nivel";
  }

  /* =================================================================
     A ASSINATURA DA BASE — o que muda o planejamento
     -----------------------------------------------------------------
     Classe, origem, trilha, atributos e graus de criação, escolhas,
     regras opcionais, progressão, trajetória, afinidade e o
     equipamento-base (para a Defesa). Dano, cargas gastas, condições e
     notas NÃO entram: não invalidam plano.
     ================================================================= */
  function equipamentoBase(inventario) {
    return lista(inventario && inventario.itens).map(function (i) { return [i.id || "", i.nome || "", i.categoria || i.tipo || "", i.equipado === false ? 0 : 1]; });
  }
  function assinatura(o, inventario) {
    var b = obj(o);
    return hash(estavel({
      classe: b.classe, origem: b.origem, trilha: b.trilha, atributos: b.atributos, pericias: b.pericias,
      periciasDaOrigem: b.periciasDaOrigem, escolhas: lista(b.escolhas).map(function (r) { return [r.etapa, r.valor, r.opcoes]; }),
      opcionais: b.opcionais, nex: b.nex, nivel: b.nivel, patente: b.patenteConquistada, estagio: b.estagio,
      trajetoria: b.trajetoria, afinidade: b.afinidade ? b.afinidade.elemento : "", equipamento: equipamentoBase(inventario),
    }));
  }

  /* =================================================================
     O PLANO
     ================================================================= */
  function novoPlano(o, inventario, nome) {
    var t = agora();
    return {
      id: uuid(), nome: String(nome || "Plano").slice(0, 60), formato: FORMATO,
      alvo: alvoPadrao(o), base: { progresso: progressoDe(o), assinatura: assinatura(o, inventario) },
      regras: { tipo: tipoDoTrilho(o) }, decisoes: {}, criadoEm: t, atualizadoEm: t,
    };
  }
  function duplicar(plano, nome) {
    var c = copiar(plano);
    c.id = uuid(); c.nome = String(nome || (plano.nome + " (cópia)")).slice(0, 60);
    c.criadoEm = c.atualizadoEm = agora();
    return c;
  }
  function normalizarDecisao(x) {
    var d = obj(x);
    if (d.tipo === "trilha") return d.trilha ? { tipo: "trilha", trilha: String(d.trilha).slice(0, 60) } : null;
    if (d.tipo === "afinidade") { var a = obj(d.afinidade); return a.elemento ? { tipo: "afinidade", afinidade: { elemento: String(a.elemento).slice(0, 30), nomeOutro: String(a.nomeOutro || "").slice(0, 60) } } : null; }
    var c = obj(d.candidato);
    return { tipo: String(d.tipo || "").slice(0, 40), candidato: { valor: c.valor === undefined || c.valor === null ? "" : String(c.valor).slice(0, 80), opcoes: copiar(obj(c.opcoes)) }, rituais: lista(d.rituais).filter(function (r) { return r && r.id; }).slice(0, 12).map(copiar) };
  }
  function normalizarPlano(x) {
    var p = obj(x);
    if (!p.id) return null;
    var dec = {};
    Object.keys(obj(p.decisoes)).forEach(function (k) {
      if (!/^[A-Za-z0-9.]{1,60}$/.test(k)) return;
      var d = normalizarDecisao(p.decisoes[k]);
      if (d) dec[k] = d;
    });
    return {
      id: String(p.id).slice(0, 60), nome: String(p.nome || "Plano").slice(0, 60), formato: FORMATO,
      alvo: copiar(obj(p.alvo)), base: { progresso: copiar(obj(obj(p.base).progresso)), assinatura: String(obj(p.base).assinatura || "").slice(0, 40) },
      regras: { tipo: TIPOS[obj(p.regras).tipo] ? p.regras.tipo : "nex" }, decisoes: dec,
      criadoEm: String(p.criadoEm || "").slice(0, 40), atualizadoEm: String(p.atualizadoEm || "").slice(0, 40),
    };
  }
  function normalizarDoc(x) {
    var d = obj(x);
    return { formato: FORMATO, planos: lista(d.planos).map(normalizarPlano).filter(Boolean).slice(0, LIMITE_PLANOS) };
  }

  /* -----------------------------------------------------------------
     GUARDAR ENXUTO
     Uma cópia de ritual pesa ~2 mil caracteres; um plano longo de
     Ocultista tem mais de quinze. O que vai para o servidor é só a
     referência (id da cópia, id do catálogo, elemento); ao abrir, a
     cópia é refeita pelo MESMO caminho da biblioteca (paraFicha +
     criarRitual), com o mesmo id. Ritual personalizado (sem catálogo)
     vai inteiro. Um ritual que não está mais no catálogo ativo (o
     suplemento saiu) fica como referência — e a decisão aparece em
     "Revisar", com o motivo.
     ----------------------------------------------------------------- */
  function compactarDoc(doc) {
    var d = normalizarDoc(doc);
    d.planos.forEach(function (p) {
      Object.keys(p.decisoes).forEach(function (k) {
        var dec = p.decisoes[k];
        if (!dec.rituais) return;
        dec.rituais = dec.rituais.map(function (r) {
          if (r.compacto || !r.origemCatalogoId) return r;
          return { id: r.id, compacto: true, origemCatalogoId: String(r.origemCatalogoId), nome: String(r.nome || ""), elemento: String(obj(r.ordem).elemento || "") };
        });
      });
    });
    return d;
  }
  function hidratarDoc(doc, entradas) {
    var d = normalizarDoc(doc);
    var RT = global.RAMAOrdemRituais, F = global.RAMAFicha;
    var porId = {}; lista(entradas).forEach(function (e) { if (e && e.id) porId[e.id] = e; });
    d.planos.forEach(function (p) {
      Object.keys(p.decisoes).forEach(function (k) {
        var dec = p.decisoes[k];
        if (!dec.rituais) return;
        dec.rituais = dec.rituais.map(function (r) {
          if (!r.compacto) return r;
          var e = porId[r.origemCatalogoId];
          if (!e || !RT || !F) return r;
          var m = RT.paraFicha(e, e.escolha ? { escolha: r.elemento } : {});
          if (!m.ok) return r;
          var c = F.criarRitual(m.dados);
          c.id = r.id;
          return c;
        });
      });
    });
    return d;
  }

  /* A operação do motor que grava uma decisão — a mesma da Progressão. */
  function operacaoDe(v, dec) {
    var novos = lista(dec.rituais);
    if (v.tipo === "rituais") {
      var ids = lista(obj(dec.candidato.opcoes).rituais).map(function (r) { return r && r.id; }).filter(Boolean);
      return { tipo: "concessao", vaga: v.id, rituais: ids, novos: novos };
    }
    return { tipo: "escolha", vaga: v.id, candidato: copiar(dec.candidato), novos: novos };
  }
  /* Grava a decisão num objeto `ordem` (projeção ou ficha real). */
  function gravarDecisao(o, rituais, v, dec, contexto) {
    if (dec.tipo === "trilha" || v.tipo === "trilha") {
      var cands = E().candidatosTrilha(o, v.id, contexto, false);
      var c = cands.filter(function (x) { return x.trilha.chave === dec.trilha; })[0];
      if (!c) return { ok: false, motivos: ["Essa trilha não serve para a classe."] };
      if (!c.disponivel) return { ok: false, motivos: c.motivos && c.motivos.length ? c.motivos : ["Trilha indisponível."] };
      o.trilha = dec.trilha;
      return { ok: true };
    }
    if (dec.tipo === "afinidade" || v.tipo === "afinidade") {
      o.afinidade = { elemento: dec.afinidade.elemento, nomeOutro: dec.afinidade.nomeOutro || "", adiada: false };
      return { ok: true };
    }
    var semCatalogo = lista(dec.rituais).filter(function (x) { return x && x.compacto; });
    if (semCatalogo.length) {
      return { ok: false, motivos: [semCatalogo.map(function (x) { return x.nome || "Ritual"; }).join(", ") + ": não está no catálogo ativo desta ficha (o suplemento foi desligado?)."] };
    }
    return E().confirmarAquisicao(o, rituais, operacaoDe(v, dec), contexto);
  }
  /* A decisão já está na ficha? (a mesma opção conta como atendida) */
  function situacaoNaFicha(o, v, dec) {
    if (v.tipo === "trilha") return !o.trilha ? "vazia" : o.trilha === dec.trilha ? "mesma" : "outra";
    if (v.tipo === "afinidade") { var el = o.afinidade && o.afinidade.elemento; return !el ? "vazia" : el === dec.afinidade.elemento ? "mesma" : "outra"; }
    var r = lista(o.escolhas).filter(function (x) { return x.etapa === v.id; })[0];
    if (!r) return "vazia";
    if (v.tipo === "rituais") {
      var a = lista(obj(r.opcoes).rituais).map(function (x) { return x.id; }).sort().join(",");
      var b = lista(obj(dec.candidato.opcoes).rituais).map(function (x) { return x.id; }).sort().join(",");
      return a === b ? "mesma" : "outra";
    }
    return r.valor === dec.candidato.valor && estavel(r.opcoes || {}) === estavel(dec.candidato.opcoes || {}) ? "mesma" : "outra";
  }
  /* Tira da projeção a decisão que o plano registrou (para conferir outra). */
  function decisaoDaProjecao(proj, projRituais, rituaisReais, v) {
    if (v.tipo === "trilha") return proj.trilha ? { tipo: "trilha", trilha: proj.trilha } : null;
    if (v.tipo === "afinidade") return proj.afinidade && proj.afinidade.elemento ? { tipo: "afinidade", afinidade: { elemento: proj.afinidade.elemento, nomeOutro: proj.afinidade.nomeOutro || "" } } : null;
    var r = lista(proj.escolhas).filter(function (x) { return x.etapa === v.id; })[0];
    if (!r) return null;
    var reais = {}; lista(rituaisReais).forEach(function (x) { if (x && x.id) reais[x.id] = true; });
    var usados = {};
    (function varrer(x, prof) {
      if (!x || prof > 10) return;
      if (Array.isArray(x)) { x.forEach(function (y) { varrer(y, prof + 1); }); return; }
      if (typeof x === "object") { if (x.id && typeof x.id === "string") usados[x.id] = true; Object.keys(x).forEach(function (k) { varrer(x[k], prof + 1); }); }
    })(r.opcoes, 0);
    var novos = lista(projRituais).filter(function (x) { return x && usados[x.id] && !reais[x.id]; }).map(copiar);
    return { tipo: v.tipo, candidato: { valor: r.valor, opcoes: copiar(r.opcoes || {}) }, rituais: novos };
  }

  /* =================================================================
     MONTAR UM PLANO PELO MOTOR
     -----------------------------------------------------------------
     Projeção no alvo; as vagas que o avanço abre, em ordem; cada decisão
     gravada na projeção pela mesma porta da Progressão. A que não fecha
     (requisito, suplemento, escolha anterior trocada) fica VISÍVEL como
     "revisar", com o motivo, e não conta como ganho. Decisões de vagas
     fora do alvo atual ficam guardadas ("fora do plano atual").
     ================================================================= */
  function montar(ficha, plano) {
    var o = ficha.ordem;
    var tipo = tipoDoTrilho(o);
    var base = progressoDe(o);
    var rituaisReais = lista(ficha.rituais);
    var ctxReal = { inventario: ficha.inventario, rituais: rituaisReais };
    var proj = projetar(o, plano.alvo);
    var projRituais = copiar(rituaisReais);
    var idsBase = {}; E().vagas(o).forEach(function (v) { idsBase[v.id] = true; });
    var todas = E().vagas(proj).slice().sort(function (a, b) { return a.ordem - b.ordem; });
    var novas = todas.filter(function (v) { return !idsBase[v.id]; });
    var itens = [], porId = {};
    novas.forEach(function (v) {
      var dec = plano.decisoes[v.id] || null;
      var item = { vaga: v, eixo: eixoDaVaga(v, tipo), decisao: dec, estado: dec ? "definida" : "pendente", motivos: [], descricao: "" };
      if (dec) {
        var ctxProj = { inventario: ficha.inventario, rituais: projRituais };
        var r = gravarDecisao(proj, projRituais, v, dec, ctxProj);
        if (!r.ok) { item.estado = "revisar"; item.motivos = lista(r.motivos); }
      }
      itens.push(item); porId[v.id] = item;
    });
    var ctxP = { inventario: ficha.inventario, rituais: projRituais };
    var est = E().estado(proj, ctxP);
    /* A conta final pode invalidar o que entrou antes (efeito em cadeia). */
    Object.keys(est.avaliacoes).forEach(function (id) {
      var av = est.avaliacoes[id];
      if (!av || !av.vaga || !porId[av.vaga.id]) return;
      var it = porId[av.vaga.id];
      if (it.estado === "definida" && av.valido === false && !av.fora) { it.estado = "revisar"; it.motivos = lista(av.motivos); }
    });
    itens.forEach(function (it) {
      if (it.estado !== "definida") return;
      if (it.vaga.tipo === "trilha") { var tr = C().trilha(proj.trilha); it.descricao = tr ? tr.nome : ""; return; }
      if (it.vaga.tipo === "afinidade") { var el = C().elemento ? C().elemento(proj.afinidade.elemento) : null; it.descricao = el ? el.nome : proj.afinidade.elemento; return; }
      var reg = lista(proj.escolhas).filter(function (x) { return x.etapa === it.vaga.id; })[0];
      it.descricao = reg ? (E().descrever(proj, reg) || reg.nome || "") : "";
    });
    /* Os marcos, em ordem; marco sem vaga nenhuma não aparece. */
    var marcos = [], porMarco = {};
    itens.forEach(function (it) {
      var chave = it.vaga.rotuloEtapa || "—";
      if (!porMarco[chave]) { porMarco[chave] = { rotulo: chave, ordem: it.vaga.ordem, itens: [] }; marcos.push(porMarco[chave]); }
      porMarco[chave].itens.push(it);
    });
    var fora = Object.keys(plano.decisoes).filter(function (id) { return !porId[id] && !idsBase[id]; });
    var noBase = Object.keys(plano.decisoes).filter(function (id) { return idsBase[id]; });
    var autoBase = {}; E().automaticas(o).forEach(function (a) { autoBase[a.id] = a.estagio; });
    var automaticas = E().automaticas(proj).filter(function (a) { return autoBase[a.id] !== a.estagio; }).map(function (a) { return { nome: a.entrada.nome, estagio: a.estagio, nova: !(a.id in autoBase) }; });
    return {
      tipo: tipo, base: base, alvo: normalizarAlvo(o, plano.alvo), proj: proj, projRituais: projRituais, estado: est,
      ctx: ctxP, ctxReal: ctxReal, itens: itens, marcos: marcos, automaticas: automaticas,
      fora: fora, noBase: noBase,
      pendentes: itens.filter(function (i) { return i.estado === "pendente"; }).length,
      revisar: itens.filter(function (i) { return i.estado === "revisar"; }).length,
      definidas: itens.filter(function (i) { return i.estado === "definida"; }).length,
      pendentesNaFicha: lista(E().estado(o, ctxReal).pendencias).filter(function (p) { return !p.opcional; }).length,
      mudouBase: plano.base.assinatura !== assinatura(o, ficha.inventario),
      tipoMudou: plano.regras.tipo !== tipo,
      alcancado: alvoAlcancado(o, plano.alvo),
    };
  }

  /* =================================================================
     COMPARAR — valores permanentes, com o marco de onde veio o ganho
     ================================================================= */
  function ladoDaFicha(ficha) {
    var o = ficha.ordem, ctx = { inventario: ficha.inventario, rituais: lista(ficha.rituais) };
    return { rotulo: "Ficha atual", progresso: rotuloDoProgresso(progressoDe(o)), ordem: o, est: E().estado(o, ctx), calc: R().calcular(o, ficha.inventario), aDefinir: 0, revisar: 0 };
  }
  function ladoDoPlano(ficha, plano, m) {
    m = m || montar(ficha, plano);
    return { rotulo: plano.nome, progresso: rotuloDoAlvo(ficha.ordem, plano.alvo), ordem: m.proj, est: m.estado, calc: R().calcular(m.proj, ficha.inventario), aDefinir: m.pendentes, revisar: m.revisar, montagem: m };
  }
  function numero(x) { return x && typeof x === "object" ? (x.total !== undefined ? x.total : null) : (typeof x === "number" ? x : null); }
  function nomesDePoderes(est) {
    var m = {};
    lista(est.adquiridos).forEach(function (a) { if (a.valido !== false && !a.efeitosDesativados && a.nome) m[a.nome] = m[a.nome] || a; });
    return m;
  }
  function nomesDeRituais(lado) {
    var m = {};
    lista(lado.est.rituais && lado.est.rituais.aprendizados).forEach(function (a) { if (!a.substituidoEm && a.nome) m[a.nome] = a; });
    return m;
  }
  function marcoDoAdquirido(lado, a) {
    var v = lista(lado.est.vagas).filter(function (x) { return x.id === a.etapaId; })[0];
    return v ? v.rotuloEtapa : (a.degrau ? E().rotuloDoDegrau(a.degrau, lado.est.trilho.separado) : "");
  }
  function comparar(A, B) {
    var grupos = [];
    function linha(rotulo, a, b, marco) { return { rotulo: rotulo, a: a, b: b, mudou: String(a) !== String(b), marco: marco || "" }; }
    var comPd = B.calc.pd !== null && B.calc.pd !== undefined;
    var rec = [linha("PV máximos", numero(A.calc.pv), numero(B.calc.pv))];
    if (comPd) rec.push(linha("PD máximos", numero(A.calc.pd), numero(B.calc.pd)));
    else { rec.push(linha("PE máximos", numero(A.calc.pe), numero(B.calc.pe))); rec.push(linha("Sanidade máxima", numero(A.calc.san), numero(B.calc.san))); }
    if (A.calc.limitePe || B.calc.limitePe) rec.push(linha(comPd ? "Limite de PD por turno" : "Limite de PE por turno", numero(A.calc.limitePe), numero(B.calc.limitePe)));
    rec.push(linha("Defesa (mesmo equipamento atual)", numero(A.calc.defesa), numero(B.calc.defesa)));
    grupos.push({ titulo: "Recursos", linhas: rec });
    grupos.push({ titulo: "Atributos", linhas: C().ATRIBUTOS.map(function (at) { return linha(at.nome, A.est.atributos[at.chave], B.est.atributos[at.chave]); }) });
    var per = [];
    C().PERICIAS.forEach(function (p) {
      var a = A.est.graus[p.chave] || "destreinado", b = B.est.graus[p.chave] || "destreinado";
      if (a === b) return;
      var f = lista(B.est.fontesGrau && B.est.fontesGrau[p.chave]);
      var ult = f[f.length - 1];
      per.push(linha(p.nome, a, b, ult ? (ult.detalhe || ult.fonte || "") : ""));
    });
    grupos.push({ titulo: "Perícias (as que mudam)", linhas: per });
    var pa = nomesDePoderes(A.est), pb = nomesDePoderes(B.est);
    var pod = [];
    Object.keys(pb).forEach(function (n) { if (!pa[n]) pod.push(linha(n, "—", "ganha", marcoDoAdquirido(B, pb[n]))); });
    Object.keys(pa).forEach(function (n) { if (!pb[n]) pod.push(linha(n, "tem", "—", marcoDoAdquirido(A, pa[n]))); });
    grupos.push({ titulo: "Poderes e habilidades", linhas: pod });
    var ra = nomesDeRituais(A), rb = nomesDeRituais(B);
    var rit = [];
    Object.keys(rb).forEach(function (n) { if (!ra[n]) rit.push(linha(n, "—", "aprende", rb[n].degrau ? E().rotuloDoDegrau(rb[n].degrau, B.est.trilho.separado) : "")); });
    Object.keys(ra).forEach(function (n) { if (!rb[n]) rit.push(linha(n, "sabe", "—", "")); });
    grupos.push({ titulo: "Rituais", linhas: rit });
    return { a: { rotulo: A.rotulo, progresso: A.progresso, aDefinir: A.aDefinir, revisar: A.revisar }, b: { rotulo: B.rotulo, progresso: B.progresso, aDefinir: B.aDefinir, revisar: B.revisar }, alvosDiferem: A.progresso !== B.progresso, grupos: grupos };
  }

  /* =================================================================
     A ATIVAÇÃO NA FICHA
     ================================================================= */
  function normalizarRamificacao(x) {
    if (!x || typeof x !== "object") return null;
    var r = x;
    return {
      planoId: String(r.planoId || "").slice(0, 60), nomePlano: String(r.nomePlano || "").slice(0, 60),
      tipo: TIPOS[r.tipo] ? r.tipo : "", ativadoEm: String(r.ativadoEm || "").slice(0, 40),
      processado: r.processado && typeof r.processado === "object" ? {
        tipo: TIPOS[r.processado.tipo] ? r.processado.tipo : "", nex: inteiro(r.processado.nex, 0, 99, 0), nivel: inteiro(r.processado.nivel, 1, 20, 1),
        patente: inteiro(r.processado.patente, 0, 4, 0), estagio: inteiro(r.processado.estagio, 0, 5, 0), passos: inteiro(r.processado.passos, 0, 40, 0),
      } : null,
      recibos: lista(r.recibos).map(function (q) { var o = obj(q); return o.chave ? { chave: String(o.chave).slice(0, 130), planoId: String(o.planoId || "").slice(0, 60), vaga: String(o.vaga || "").slice(0, 60), marco: String(o.marco || "").slice(0, 60), status: ["aplicada", "atendida"].indexOf(o.status) >= 0 ? o.status : "aplicada", opId: String(o.opId || "").slice(0, 140), quando: String(o.quando || "").slice(0, 40) } : null; }).filter(Boolean).slice(-200),
      pendentes: lista(r.pendentes).map(function (q) { var o = obj(q); return o.vaga ? { vaga: String(o.vaga).slice(0, 60), marco: String(o.marco || "").slice(0, 60), status: ["conflito", "bloqueada"].indexOf(o.status) >= 0 ? o.status : "bloqueada", motivo: String(o.motivo || "").slice(0, 400), planoId: String(o.planoId || "").slice(0, 60) } : null; }).filter(Boolean).slice(0, 40),
      ultimoResumo: String(r.ultimoResumo || "").slice(0, 400), pausado: String(r.pausado || "").slice(0, 400),
    };
  }
  /* Ativa: grava só o ponteiro e o progresso de PARTIDA. Não processa
     nada (o que já ficou para trás é revisado por ação explícita). */
  function ativar(o, plano) {
    var anterior = normalizarRamificacao(o.ramificacao) || { recibos: [], pendentes: [] };
    o.ramificacao = normalizarRamificacao({
      planoId: plano.id, nomePlano: plano.nome, tipo: tipoDoTrilho(o), ativadoEm: agora(), processado: progressoDe(o),
      recibos: anterior.recibos, pendentes: [], ultimoResumo: "", pausado: "",
    });
    return o.ramificacao;
  }
  function desativar(o) {
    var r = normalizarRamificacao(o.ramificacao);
    if (!r) return null;
    r.planoId = ""; r.nomePlano = ""; r.pendentes = []; r.pausado = "";
    o.ramificacao = r;
    return r;
  }
  /* O que ficou para trás ao ativar um plano atrasado: decisões do plano
     para vagas que já existem na ficha e ainda estão vazias. */
  function atrasadas(ficha, plano) {
    var o = ficha.ordem;
    return E().vagas(o).filter(function (v) { var d = plano.decisoes[v.id]; return d && situacaoNaFicha(o, v, d) === "vazia"; });
  }
  /* O avanço passou do `processado`? (barato: só números) */
  function avancou(o) {
    var r = o && o.ramificacao;
    if (!r || !r.planoId || !r.processado) return false;
    var p = progressoDe(o), q = r.processado;
    if (p.tipo !== r.tipo) return true;
    return p.nex !== q.nex || p.nivel !== q.nivel || p.patente !== q.patente || p.estagio !== q.estagio;
  }

  /* =================================================================
     APLICAR — na ficha REAL, pelas rotinas da Progressão
     -----------------------------------------------------------------
     ficha: { ordem, rituais (a lista VIVA), inventario }
     opcoes.retomar: conferir também as vagas que já existiam (ação
                     explícita: "Revisar escolhas já liberadas" / "Retomar")
     ================================================================= */
  function processar(ficha, doc, opcoes) {
    var op = obj(opcoes);
    var o = ficha.ordem;
    var r = normalizarRamificacao(o.ramificacao);
    if (!r || !r.planoId) return null;
    var plano = lista(normalizarDoc(doc).planos).filter(function (p) { return p.id === r.planoId; })[0];
    var tipo = tipoDoTrilho(o);
    var res = { plano: plano ? plano.nome : r.nomePlano, aplicadas: [], atendidas: [], conflitos: [], bloqueadas: [], semEscolha: [], mudou: false, resumo: "", pausado: "" };
    if (!plano) { r.pausado = "O plano ativo não existe mais: ative outro ou desative."; o.ramificacao = r; res.pausado = r.pausado; res.mudou = true; return res; }
    if (tipo !== r.tipo || tipo === "mundano") {
      r.pausado = tipo === "mundano" ? "A ficha é Mundano: não há marcos. Depois de uma transição autorizada, crie um plano para o trilho novo."
        : "A regra de evolução mudou (" + TIPOS[r.tipo] + " → " + TIPOS[tipo] + "): o plano ficou pausado, com as escolhas guardadas. Revise o plano para o trilho novo.";
      o.ramificacao = r; res.pausado = r.pausado; res.mudou = true; return res;
    }
    var antes = {};
    if (!op.retomar && r.processado) E().vagas(noProgresso(o, r.processado)).forEach(function (v) { antes[v.id] = true; });
    var candidatas = E().vagas(o).slice().sort(function (a, b) { return a.ordem - b.ordem; }).filter(function (v) { return op.retomar || !antes[v.id]; });
    var ctx = { inventario: ficha.inventario, rituais: ficha.rituais };
    var quando = agora();
    var recibo = {}; r.recibos.forEach(function (q) { recibo[q.chave] = q; });
    var pendentes = r.pendentes.filter(function (q) { return q.planoId !== plano.id; });
    candidatas.forEach(function (v) {
      var dec = plano.decisoes[v.id];
      if (!dec) { if (!op.retomar) res.semEscolha.push(v.rotulo + " (" + v.rotuloEtapa + ")"); return; }
      var chave = plano.id + "|" + v.id;
      if (recibo[chave]) return; /* já aplicada ou atendida: nunca de novo */
      var sit = situacaoNaFicha(o, v, dec);
      var marco = v.rotuloEtapa || "";
      if (sit === "mesma") { recibo[chave] = { chave: chave, planoId: plano.id, vaga: v.id, marco: marco, status: "atendida", opId: "ram:" + chave, quando: quando }; res.atendidas.push(v.rotulo); return; }
      if (sit === "outra") { pendentes.push({ vaga: v.id, marco: marco, status: "conflito", motivo: v.rotulo + ": a ficha já tem outra escolha nesta vaga (fica a da ficha).", planoId: plano.id }); res.conflitos.push(v.rotulo); return; }
      var g = gravarDecisao(o, ficha.rituais, v, dec, ctx);
      if (!g.ok) { pendentes.push({ vaga: v.id, marco: marco, status: "bloqueada", motivo: v.rotulo + ": " + lista(g.motivos).join(" "), planoId: plano.id }); res.bloqueadas.push(v.rotulo); return; }
      var reg = lista(o.escolhas).filter(function (x) { return x.etapa === v.id; })[0];
      if (reg) reg.procedencia = "Plano " + plano.nome + " (aplicação automática, " + marco + ")";
      recibo[chave] = { chave: chave, planoId: plano.id, vaga: v.id, marco: marco, status: "aplicada", opId: "ram:" + chave, quando: quando };
      res.aplicadas.push(v.rotulo + (marco ? " (" + marco + ")" : ""));
    });
    r.recibos = Object.keys(recibo).map(function (k) { return recibo[k]; }).slice(-200);
    r.pendentes = pendentes.slice(0, 40);
    r.processado = progressoDe(o);
    r.pausado = "";
    var partes = [];
    function n(q, um, varios) { return q + " " + (q === 1 ? um : varios); }
    if (res.aplicadas.length) partes.push(n(res.aplicadas.length, "escolha aplicada", "escolhas aplicadas") + " (" + res.aplicadas.join("; ") + ")");
    if (res.atendidas.length) partes.push(n(res.atendidas.length, "já estava na ficha", "já estavam na ficha"));
    var rev = res.conflitos.length + res.bloqueadas.length;
    if (rev) partes.push(n(rev, "escolha precisa de revisão", "escolhas precisam de revisão"));
    var marcoReal = r.processado.tipo === "nex" ? r.processado.nex + "% de NEX" : rotuloDoProgresso(r.processado);
    if (partes.length) r.ultimoResumo = (marcoReal + " · aplicado o plano " + plano.nome + ": " + partes.join("; ") + ".").slice(0, 400);
    res.resumo = r.ultimoResumo;
    res.mudou = true;
    o.ramificacao = r;
    return res;
  }

  global.RAMAOrdemRamificacao = {
    FORMATO: FORMATO, LIMITE_PLANOS: LIMITE_PLANOS, TIPOS: TIPOS,
    tipoDoTrilho: tipoDoTrilho, progressoDe: progressoDe, opcoesDoAlvo: opcoesDoAlvo, alvoPadrao: alvoPadrao, normalizarAlvo: normalizarAlvo,
    rotuloDoProgresso: rotuloDoProgresso, rotuloDoAlvo: rotuloDoAlvo, alvoAlcancado: alvoAlcancado, projetar: projetar, noProgresso: noProgresso, eixoDaVaga: eixoDaVaga,
    assinatura: assinatura, novoPlano: novoPlano, duplicar: duplicar, normalizarPlano: normalizarPlano, normalizarDoc: normalizarDoc, normalizarDecisao: normalizarDecisao,
    compactarDoc: compactarDoc, hidratarDoc: hidratarDoc,
    montar: montar, decisaoDaProjecao: decisaoDaProjecao, gravarDecisao: gravarDecisao, situacaoNaFicha: situacaoNaFicha,
    ladoDaFicha: ladoDaFicha, ladoDoPlano: ladoDoPlano, comparar: comparar,
    normalizarRamificacao: normalizarRamificacao, ativar: ativar, desativar: desativar, atrasadas: atrasadas, avancou: avancou, processar: processar,
  };
})(typeof window !== "undefined" ? window : globalThis);
