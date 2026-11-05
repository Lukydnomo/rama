/* =====================================================================
   R.A.M.A. — Ordem Paranormal · estados do Arquivos Secretos 7
   =====================================================================
   O que o Arquivos Secretos 7 (v1.0) guarda numa ficha, e a regra de
   cada coisa — sem tela e sem rede. A ficha desenha (js/ordem/telas/
   ficha-arquivo7.js); as contas (js/ordem/regras.js) perguntam daqui.

     contatos       O Que Restou (Exorcizado): a primeira vez de cada cena
                    em contato com o elemento (2 SAN, uma vez por cena)
     procedimento   as variantes de Monstruoso (p. 81–88): o experimento ou
                    a escarificação de cada DIA da cronologia, com o
                    componente consumido, a recuperação rolada e o
                    sacrifício de Ser Testado; os dias sem procedimento;
                    as escolhas da trilha (perícias, rituais marcados na
                    pele, os rituais de 4º círculo); os usos por cena e
                    por rodada; os itens já tocados pelo braço de Morte
     vampirismo     Vampirismo (p. 76–77): os corpos preparados (com a
                    cena e a forma), os vasos consumidos de cada corpo e o
                    que cada refeição deu, a quem
     submerso       regras debaixo d'água (p. 92–93): na água ou não, a
                    profundidade, natação, oxigênio e os testes de Pressão
     infeccao       Mentem Corrumpere (a Apóstata, p. 70): estágio, desde
                    que dia, testes diários e falhas seguidas
     exposicoes     exposição em dobro das variantes (NEX & Experiência)
     usos           operações já feitas, pelo id (o mesmo clique, ou a
                    página recarregada, nunca aplica duas vezes)

   O estado de cada item (a criatura guiada pela Carranca, a ativação do
   Pé de Coelho, os usos do Sal Dourado, a súplica do Terço) mora no
   próprio item, em `item.ordem.as7` (normalizarDadosDoItem).

   Tempo é sempre o do JOGO: o dia da cronologia (Arquivos Secretos 3),
   a cena e a rodada da ficha — nunca o relógio do computador. NADA AQUI
   ROLA DADO SOZINHO: quem rola é a tela, por clique, e entrega o
   resultado. Nada aqui mexe em outra ficha.
   ===================================================================== */

(function (global) {
  "use strict";

  var ID = /^[A-Za-z0-9_.:|#-]{1,80}$/;
  var MAX = 40;
  var ELEMENTOS = ["sangue", "morte", "conhecimento", "energia"];
  var ATRIBUTOS = ["agi", "for", "int", "pre", "vig"];

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
  function porId(l, campo) {
    var vistos = {};
    return l.filter(function (x) {
      var k = x && x[campo || "id"];
      if (!k || vistos[k]) return false;
      vistos[k] = true;
      return true;
    });
  }
  function chaveDeBusca(v) {
    var s = texto(v, 120).toLowerCase();
    if (s.normalize) s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
    return s.replace(/\s+/g, " ").trim();
  }

  function C() { return global.RAMAOrdemCatalogo || null; }
  function E() { return global.RAMAOrdemProgressao || null; }
  function A3() { return global.RAMAOrdemArquivo3 || null; }
  function A5() { return global.RAMAOrdemArquivo5 || null; }
  function I() { return global.RAMAOrdemInventario || null; }
  function OP() { return global.RAMAOrdemOpcionais || null; }

  /* =================================================================
     O TEMPO DO JOGO
     ================================================================= */

  function cenaDe(ordem) {
    return (ordem && ordem.condicoes && ordem.condicoes.cena && ordem.condicoes.cena.id) || "inicial";
  }
  function rodadaDe(ordem) { return A5() && ordem ? A5().rodada(ordem) : 1; }
  function chaveDaRodada(ordem) { return cenaDe(ordem) + "#" + rodadaDe(ordem); }
  /* O dia da cronologia da campanha (AS3). Sem o módulo, 0: tudo o que é
     "por dia" vira "uma vez" até alguém ter a cronologia. */
  function diaDe(ordem) {
    var cr = A3() && ordem ? A3().dados(ordem).cronologia : null;
    return cr ? (Number(cr.dia) || 0) : 0;
  }

  /* =================================================================
     A PROGRESSÃO DA FICHA
     ================================================================= */

  function aquisicoes(ordem, chave) {
    var est = E() && ordem ? E().estado(ordem, null) : null;
    return est ? est.adquiridos.filter(function (a) { return a.chave === chave && a.valido !== false && a.completo !== false; }) : [];
  }
  function temPoder(ordem, chave) { return aquisicoes(ordem, chave).length > 0; }

  /* As duas variantes: chave da trilha, o poder de cada marco e o que o
     procedimento recupera em cada um (o MAIOR marco manda). */
  var VARIANTES = {
    monstruosoEspecialista: {
      classe: "especialista", procedimento: "experimento", nomeProcedimento: "Experimento",
      marcos: [[10, "serExperimentado"], [40, "serTestado"], [65, "serExpurgado"], [99, "serApavorante"]],
      recupera: { recurso: "pv", 10: "1d8+1", 40: "2d8+2", 65: "3d8+3", 99: "4d8+4" },
      pagina: { 10: 81, 40: 82, 65: 83, 99: 84 },
    },
    monstruosoOcultista: {
      classe: "ocultista", procedimento: "escarificacao", nomeProcedimento: "Escarificação",
      marcos: [[10, "serEscarificado"], [40, "serPerfurado"], [65, "serRasgado"], [99, "serMutilado"]],
      recupera: { recurso: "pe", 10: "1d4", 40: "1d6", 65: "1d8", 99: "1d12" },
      pagina: { 10: 85, 40: 86, 65: 87, 99: 88 },
    },
  };

  var ATRIBUTO_DO_ELEMENTO = { sangue: "for", morte: "vig", conhecimento: "int", energia: "agi" };
  var NOME_DO_ATRIBUTO = { agi: "Agilidade", "for": "Força", int: "Intelecto", pre: "Presença", vig: "Vigor" };
  var NOME_DO_ELEMENTO = { sangue: "Sangue", morte: "Morte", conhecimento: "Conhecimento", energia: "Energia", medo: "Medo" };
  /* Ser Testado sacrifica pontos de outro atributo: Conhecimento inexiste
     Agilidade, Energia queima Vigor, Sangue devora Intelecto, Morte
     necrosa Força (p. 82). */
  var SACRIFICIO = {
    conhecimento: { atributo: "agi", verbo: "inexistir" },
    energia: { atributo: "vig", verbo: "queimar" },
    sangue: { atributo: "int", verbo: "devorar" },
    morte: { atributo: "for", verbo: "necrosar" },
  };
  /* Os rituais que Ser Apavorante ensina, por elemento (p. 84). */
  var RITUAL_APAVORANTE = {
    sangue: "op.ritual.vinculo-de-sangue", morte: "op.ritual.distorcao-temporal",
    conhecimento: "op.ritual.controle-mental", energia: "op.ritual.teletransporte",
  };
  /* A reação de Ser Perfurado (p. 86): a condição que a permite. */
  var REACAO_DO_ELEMENTO = {
    conhecimento: { categorias: ["mental", "medo"], machucado: false, morrendo: false, texto: "sob efeito de uma condição mental ou de medo" },
    energia: { categorias: ["paralisia", "sentidos"], machucado: false, morrendo: false, texto: "sob efeito de uma condição de paralisia ou de sentidos" },
    sangue: { categorias: ["fadiga"], machucado: true, morrendo: false, texto: "machucado ou sob efeito de uma condição de fadiga" },
    morte: { categorias: ["sentidos"], machucado: false, morrendo: true, texto: "morrendo ou sob efeito de uma condição de sentidos" },
  };

  /* A variante que a ficha usa agora: a trilha, servindo à classe. */
  function variante(ordem) {
    if (!ordem || !ordem.trilha || !VARIANTES[ordem.trilha]) return null;
    var tr = C() ? C().trilha(ordem.trilha) : null;
    if (!tr || (C().trilhaServe && !C().trilhaServe(tr, ordem.classe, ordem))) return null;
    var v = VARIANTES[ordem.trilha];
    var marco = 0;
    v.marcos.forEach(function (m) { if (temPoder(ordem, m[1])) marco = m[0]; });
    if (!marco) return null;
    var base = aquisicoes(ordem, v.marcos[0][1])[0];
    var elemento = base && base.opcoes && ELEMENTOS.indexOf(base.opcoes.elemento) >= 0 ? base.opcoes.elemento : "";
    return { chave: ordem.trilha, def: v, marco: marco, elemento: elemento, especialista: ordem.trilha === "monstruosoEspecialista" };
  }

  /* =================================================================
     NORMALIZAÇÃO
     ================================================================= */

  function normalizarRegistro(r) {
    var y = obj(r);
    var id = idOk(y.id);
    if (!id) return null;
    var cura = obj(y.cura);
    var comp = obj(y.componente);
    var sac = obj(y.sacrificio);
    return {
      id: id, dia: inteiro(y.dia, 0, 99999, 0), trilha: VARIANTES[y.trilha] ? y.trilha : "",
      elemento: ELEMENTOS.indexOf(y.elemento) >= 0 ? y.elemento : "", marco: [10, 40, 65, 99].indexOf(y.marco) >= 0 ? y.marco : 10,
      cura: { expressao: texto(cura.expressao, 20), valor: inteiro(cura.valor, 0, 999, 0), recurso: ["pv", "pe", "pd"].indexOf(cura.recurso) >= 0 ? cura.recurso : "pv",
        antes: inteiro(cura.antes, -99, 9999, 0), depois: inteiro(cura.depois, -99, 9999, 0) },
      componente: { nome: texto(comp.nome, 120), modo: comp.modo === "quantidade" ? "quantidade" : "item" },
      sacrificio: { atributo: ATRIBUTOS.indexOf(sac.atributo) >= 0 ? sac.atributo : "", pontos: inteiro(sac.pontos, 0, 9, 0) },
      temporarios: inteiro(y.temporarios, 0, 999, 0),
      em: carimbo(y.em),
    };
  }

  function normalizarUso(u) {
    var y = obj(u);
    var id = idOk(y.id);
    if (!id) return null;
    return { id: id, chave: texto(y.chave, 40), periodo: texto(y.periodo, 100), alvo: texto(y.alvo, 120), em: carimbo(y.em) };
  }

  function normalizar(ordem, bruto) {
    var b = obj(bruto && bruto.arquivo7 !== undefined ? bruto.arquivo7 : (ordem && ordem.arquivo7));
    var pr = obj(b.procedimento);
    var vp = obj(b.vampirismo);
    var sb = obj(b.submerso);
    var inf = obj(b.infeccao);
    var r99 = obj(pr.rituais99);

    ordem.arquivo7 = {
      contatos: porId(lista(b.contatos).map(function (c) {
        var y = obj(c); var id = idOk(y.id);
        if (!id) return null;
        return { id: id, cena: idOk(y.cena), elemento: ELEMENTOS.indexOf(y.elemento) >= 0 ? y.elemento : "", perdeu: inteiro(y.perdeu, 0, 99, 0), em: carimbo(y.em) };
      }).filter(Boolean)).slice(-MAX),
      procedimento: {
        registros: porId(lista(pr.registros).map(normalizarRegistro).filter(Boolean)).slice(-MAX),
        semProcedimento: lista(pr.semProcedimento).map(function (d) { return inteiro(d, 0, 99999, -1); })
          .filter(function (d, i, l) { return d >= 0 && l.indexOf(d) === i; }).slice(-MAX),
        usos: porId(lista(pr.usos).map(normalizarUso).filter(Boolean)).slice(-MAX),
        tocados: porId(lista(pr.tocados).map(function (t) {
          var y = obj(t); var id = idOk(y.id); var nome = texto(y.nome, 120).trim();
          return id && nome ? { id: id, nome: nome, escolha: y.escolha === "passado" ? "passado" : "envelhecer", em: carimbo(y.em) } : null;
        }).filter(Boolean)).slice(-MAX),
        periciasConhecimento: lista(pr.periciasConhecimento).map(String).filter(function (k, i, l) { return C() && C().pericia(k) && l.indexOf(k) === i; }).slice(0, 2),
        periciasApavorante: lista(pr.periciasApavorante).map(String).filter(function (k, i, l) { return C() && C().pericia(k) && l.indexOf(k) === i; }).slice(0, 3),
        rituaisMarcados: lista(pr.rituaisMarcados).map(function (k) { return texto(k, 120); }).filter(function (k, i, l) { return k && l.indexOf(k) === i; }).slice(0, 40),
        rituais99: { elemento: texto(r99.elemento, 80), medo: texto(r99.medo, 80) },
        corporeidade: idOk(pr.corporeidade),
        acoplado: texto(pr.acoplado, 120),
      },
      vampirismo: {
        corpos: porId(lista(vp.corpos).map(function (c) {
          var y = obj(c); var id = idOk(y.id); var alvo = texto(y.alvo, 120).trim();
          if (!id || !alvo) return null;
          return { id: id, alvo: alvo, forma: FORMAS_VAMPIRISMO.indexOf(y.forma) >= 0 ? y.forma : "normal", cena: idOk(y.cena),
            porMim: y.porMim !== false, encerrado: y.encerrado === true, em: carimbo(y.em) };
        }).filter(Boolean)).slice(-MAX),
        consumos: porId(lista(vp.consumos).map(function (c) {
          var y = obj(c); var id = idOk(y.id);
          if (!id || VASOS.indexOf(y.vaso) < 0) return null;
          return { id: id, corpoId: idOk(y.corpoId), vaso: y.vaso, forma: FORMAS_VAMPIRISMO.indexOf(y.forma) >= 0 ? y.forma : "normal",
            cena: idOk(y.cena), beneficiario: texto(y.beneficiario, 80), paraMim: y.paraMim !== false,
            escolha: texto(y.escolha, 120), modo: y.modo === "bonus" ? "bonus" : (y.modo === "grau" ? "grau" : ""),
            valor: inteiro(y.valor, 0, 999, 0), efeitoId: idOk(y.efeitoId), em: carimbo(y.em) };
        }).filter(Boolean)).slice(-MAX * 2),
      },
      submerso: {
        ativo: sb.ativo === true,
        profundidade: inteiro(sb.profundidade, 0, 11000, 0),
        natacao: sb.natacao === true,
        oxigenio: sb.oxigenio === true,
        testes: inteiro(sb.testes, 0, 99, 0),
        efeitoId: idOk(sb.efeitoId),
        cena: idOk(sb.cena),
        em: carimbo(sb.em),
      },
      infeccao: {
        ativa: inf.ativa === true,
        desde: inteiro(inf.desde, 0, 99999, 0),
        estagio: inteiro(inf.estagio, 1, 4, 1),
        treinoPorBonus: inf.treinoPorBonus === true,
        falhasSeguidas: inteiro(inf.falhasSeguidas, 0, 99, 0),
        testes: porId(lista(inf.testes).map(function (t) {
          var y = obj(t); var id = idOk(y.id);
          return id ? { id: id, dia: inteiro(y.dia, 0, 99999, 0), dt: inteiro(y.dt, 0, 999, 0), total: inteiro(y.total, -99, 999, 0), passou: y.passou === true, em: carimbo(y.em) } : null;
        }).filter(Boolean)).slice(-MAX),
        efeitos: lista(inf.efeitos).map(idOk).filter(Boolean).slice(0, 8),
        curadaEm: carimbo(inf.curadaEm),
      },
      exposicoes: porId(lista(b.exposicoes).map(function (x) {
        var y = obj(x); var id = idOk(y.id);
        return id && EXPOSICOES[y.tipo] ? { id: id, tipo: y.tipo, valor: inteiro(y.valor, 0, 10, 0), dobro: y.dobro === true, em: carimbo(y.em) } : null;
      }).filter(Boolean)).slice(-MAX),
      usos: porId(lista(b.usos).map(function (u) {
        var y = obj(u); var op = idOk(y.opId);
        return op ? { opId: op, tipo: texto(y.tipo, 40), em: carimbo(y.em) } : null;
      }).filter(Boolean), "opId").slice(-MAX),
    };
    return ordem;
  }

  function vazio() { return normalizar({}, {}).arquivo7; }
  function dados(ordem) {
    if (!ordem.arquivo7) normalizar(ordem, {});
    return ordem.arquivo7;
  }

  function jaFeito(ordem, opId) { return !!opId && dados(ordem).usos.some(function (u) { return u.opId === opId; }); }
  function registrarUso(ordem, opId, tipo) {
    var a = dados(ordem);
    if (!opId || jaFeito(ordem, opId)) return false;
    a.usos.push({ opId: opId, tipo: texto(tipo, 40), em: agora() });
    a.usos = a.usos.slice(-MAX);
    return true;
  }
  function falha(motivo) { return { ok: false, motivo: motivo }; }

  /* =================================================================
     O QUE RESTOU (Exorcizado, p. 80)
     ================================================================= */

  /* A escolha da vaga da origem (b.origem.exorcizado), como a Mácula
     Ritualística lê a dela. */
  function elementoDoExorcizado(ordem) {
    if (!ordem || ordem.origem !== "exorcizado") return "";
    var r = (ordem.escolhas || []).filter(function (x) { return x && x.etapa === "b.origem.exorcizado"; })[0];
    var el = r && r.opcoes && typeof r.opcoes.elemento === "string" ? r.opcoes.elemento : "";
    return ELEMENTOS.indexOf(el) >= 0 ? el : "";
  }

  function contatoNaCena(ordem) {
    var cena = cenaDe(ordem);
    return dados(ordem).contatos.filter(function (c) { return c.cena === cena; })[0] || null;
  }

  /* `perdeu`: 2, ou 0 com Jogando sem Sanidade (a perda não se aplica,
     SAH p. 104) — quem aplica a perda é a tela, uma vez, com este
     registro. */
  function registrarContato(ordem, opId, elemento, perdeu) {
    if (jaFeito(ordem, opId)) return { ok: true, repetido: true };
    if (contatoNaCena(ordem)) return falha("O contato desta cena já foi registrado: a perda de 2 SAN é só na primeira vez de cada cena.");
    var a = dados(ordem);
    a.contatos.push({ id: novoId("ct"), cena: cenaDe(ordem), elemento: ELEMENTOS.indexOf(elemento) >= 0 ? elemento : "", perdeu: inteiro(perdeu, 0, 99, 0), em: agora() });
    a.contatos = a.contatos.slice(-MAX);
    registrarUso(ordem, opId, "contato");
    return { ok: true };
  }

  /* =================================================================
     O PROCEDIMENTO DIÁRIO (Monstruoso, p. 81 e 85)
     ================================================================= */

  function registroDeHoje(ordem) {
    var dia = diaDe(ordem);
    var v = variante(ordem);
    if (!v) return null;
    return dados(ordem).procedimento.registros.filter(function (r) { return r.dia === dia && r.trilha === v.chave; })[0] || null;
  }
  function ativoHoje(ordem) { return !!registroDeHoje(ordem); }
  function semProcedimentoHoje(ordem) { return dados(ordem).procedimento.semProcedimento.indexOf(diaDe(ordem)) >= 0; }

  /* O que a recuperação rola, pelo maior marco. */
  function recuperacao(ordem) {
    var v = variante(ordem);
    if (!v) return null;
    return { expressao: v.def.recupera[v.marco], recurso: v.def.recupera.recurso };
  }

  /* Os componentes do elemento: itens do inventário e, com a regra de
     controle de componentes no modo quantidade, o saldo da mesa. */
  function componentesDisponiveis(ordem, inventario, elemento) {
    var saida = [];
    var nome = chaveDeBusca(NOME_DO_ELEMENTO[elemento] || elemento);
    ((inventario && inventario.itens) || []).forEach(function (i) {
      if (!i) return;
      var d = I() ? I().dadosDoItem(i) : (i.ordem || {});
      var eComp = i.origemCatalogoId === "op.paranormal.componentes" || /componentes? ritual/.test(chaveDeBusca(i.nome));
      if (!eComp) return;
      if (d.elemento === elemento || chaveDeBusca(i.nome).indexOf(nome) >= 0) saida.push({ modo: "item", id: i.id, nome: i.nome, quantidade: d.quantidade || 1 });
    });
    var cs = ordem && ordem.componentes && ordem.componentes.elementos ? ordem.componentes.elementos[elemento] : null;
    var ligado = OP() && OP().ligada(ordem, "controleComponentes");
    if (ligado && cs && cs.modo === "quantidade" && (cs.quantidade || 0) > 0) {
      saida.push({ modo: "quantidade", id: "quantidade", nome: "Componentes de " + (NOME_DO_ELEMENTO[elemento] || elemento) + " (" + cs.quantidade + " " + (cs.unidade || "unidades") + ", regra da mesa)", quantidade: cs.quantidade });
    }
    return saida;
  }

  /* O limite de pontos a sacrificar: só os pontos SEUS — o valor da ficha
     com os aumentos da progressão, sem itens, rituais nem efeitos do dia
     (p. 82). Até chegar a 0. */
  function limiteDoSacrificio(ordem) {
    var v = variante(ordem);
    if (!v || !v.especialista || v.marco < 40 || !SACRIFICIO[v.elemento]) return 0;
    var at = SACRIFICIO[v.elemento].atributo;
    var est = E() ? E().estado(ordem, null) : null;
    var proprio = est && est.atributos && est.atributos[at] !== undefined ? est.atributos[at] : inteiro(ordem.atributos && ordem.atributos[at], 0, 9, 0);
    return Math.max(0, proprio);
  }

  /* Faz o procedimento do dia. `p`: { opId, componente: { modo, id },
     rolagem (o total da recuperação, rolado pela tela), sacrificio
     (pontos), atual e maximo do recurso que recupera }. Consome o
     componente, guarda a recuperação e liga os efeitos até o próximo
     dia. O mesmo opId não faz de novo. */
  function fazerProcedimento(ordem, inventario, p) {
    var o = p || {};
    if (jaFeito(ordem, o.opId)) return { ok: true, repetido: true, registro: registroDeHoje(ordem) };
    var v = variante(ordem);
    if (!v) return falha("A ficha não tem uma trilha Monstruoso do Arquivos Secretos 7 com o primeiro marco.");
    if (!v.elemento) return falha("Escolha o elemento na Progressão (" + (v.especialista ? "Ser Experimentado" : "Ser Escarificado") + ") antes.");
    if (registroDeHoje(ordem)) return falha("Só é possível um " + (v.especialista ? "experimento" : "escarificação") + " por dia — o deste dia (" + diaDe(ordem) + ") já foi feito.");
    var comps = componentesDisponiveis(ordem, inventario, v.elemento);
    var escolhido = comps.filter(function (c) { return o.componente && c.modo === o.componente.modo && c.id === o.componente.id; })[0];
    if (!escolhido) return falha("É preciso um componente ritualístico de " + NOME_DO_ELEMENTO[v.elemento] + " para consumir.");
    var pontos = 0;
    if (v.especialista && v.marco >= 40) {
      pontos = inteiro(o.sacrificio, 0, 9, 0);
      var limite = limiteDoSacrificio(ordem);
      if (pontos > limite) return falha("Só dá para sacrificar pontos seus de " + NOME_DO_ATRIBUTO[SACRIFICIO[v.elemento].atributo] + ", até 0: no máximo " + limite + ".");
    }
    /* consumir o componente */
    if (escolhido.modo === "item") {
      var itens = (inventario && inventario.itens) || [];
      var item = itens.filter(function (i) { return i && i.id === escolhido.id; })[0];
      if (!item) return falha("O componente não está mais no inventário.");
      if (!item.ordem || typeof item.ordem !== "object") item.ordem = {};
      var q = Math.max(1, inteiro(item.ordem.quantidade, 1, 999, 1));
      if (q > 1) item.ordem.quantidade = q - 1;
      else inventario.itens = itens.filter(function (i) { return i !== item; });
    } else {
      var cs = ordem.componentes.elementos[v.elemento];
      cs.quantidade = Math.max(0, (cs.quantidade || 0) - 1);
    }
    var rec = recuperacao(ordem);
    var recurso = rec.recurso === "pe" && global.RAMAOrdemRegras && global.RAMAOrdemRegras.usaDeterminacao(ordem) ? "pd" : rec.recurso;
    var valor = inteiro(o.rolagem, 0, 999, 0);
    var antes = inteiro(o.atual, -99, 9999, 0);
    var maximo = inteiro(o.maximo, 0, 9999, 0);
    var depois = Math.max(antes, Math.min(maximo, antes + valor));
    if (!ordem.recursos) ordem.recursos = { pv: null, pe: null, san: null, pd: null };
    ordem.recursos[recurso] = depois;
    var a = dados(ordem);
    var reg = {
      id: novoId("pr"), dia: diaDe(ordem), trilha: v.chave, elemento: v.elemento, marco: v.marco,
      cura: { expressao: rec.expressao, valor: valor, recurso: recurso, antes: antes, depois: depois },
      componente: { nome: escolhido.nome, modo: escolhido.modo },
      sacrificio: { atributo: pontos ? SACRIFICIO[v.elemento].atributo : "", pontos: pontos },
      temporarios: 0, em: agora(),
    };
    a.procedimento.registros.push(reg);
    a.procedimento.registros = a.procedimento.registros.slice(-MAX);
    a.procedimento.semProcedimento = a.procedimento.semProcedimento.filter(function (d) { return d !== reg.dia; });
    aplicarLimiteDeMorrendo(ordem);
    registrarUso(ordem, o.opId, "procedimento");
    return { ok: true, registro: reg };
  }

  function marcarSemProcedimento(ordem) {
    if (registroDeHoje(ordem)) return falha("O procedimento de hoje já foi feito.");
    var a = dados(ordem).procedimento;
    var dia = diaDe(ordem);
    if (a.semProcedimento.indexOf(dia) < 0) a.semProcedimento.push(dia);
    a.semProcedimento = a.semProcedimento.slice(-MAX);
    return { ok: true };
  }

  /* Morte · Ser Testado: +1 turno morrendo (e +1 por ponto necrosado).
     O limite vive nas Condições (condicoes.js lê `limiteExtra`), posto e
     tirado por aqui conforme o dia — recarregar não soma de novo. */
  function extraDeMorrendo(ordem) {
    var v = variante(ordem);
    var reg = registroDeHoje(ordem);
    if (!v || !reg || !v.especialista || v.elemento !== "morte" || v.marco < 40) return 0;
    return 1 + (reg.sacrificio.pontos || 0);
  }
  function aplicarLimiteDeMorrendo(ordem) {
    if (!ordem || !ordem.condicoes) return;
    var n = extraDeMorrendo(ordem);
    if (!ordem.condicoes.limiteExtra || typeof ordem.condicoes.limiteExtra !== "object") ordem.condicoes.limiteExtra = {};
    if (n) ordem.condicoes.limiteExtra.morrendo = n;
    else delete ordem.condicoes.limiteExtra.morrendo;
  }

  /* Usos limitados por cena, rodada ou dia (a ação padrão adicional de
     Morte, a reação de Ser Perfurado, o ataque do braço de Sangue…). */
  var LIMITES = {
    acaoPadraoExtra: { periodo: "cena" },
    reacaoPerfurado: { periodo: "cena", quantos: 1 },
    bracoSangue: { periodo: "rodada", quantos: 1 },
    pvDaCena: { periodo: "cena", quantos: 1 },
  };
  function periodoDe(ordem, periodo) {
    if (periodo === "rodada") return chaveDaRodada(ordem);
    if (periodo === "dia") return "dia#" + diaDe(ordem);
    return cenaDe(ordem);
  }
  function usosNoPeriodo(ordem, chave) {
    var l = LIMITES[chave];
    if (!l) return 0;
    var per = periodoDe(ordem, l.periodo);
    return dados(ordem).procedimento.usos.filter(function (u) { return u.chave === chave && u.periodo === per; }).length;
  }
  function quantosPorPeriodo(ordem, chave) {
    if (chave === "acaoPadraoExtra") {
      var v = variante(ordem);
      return v && v.marco >= 99 ? 2 : 1;
    }
    return (LIMITES[chave] && LIMITES[chave].quantos) || 1;
  }
  function registrarUsoLimitado(ordem, chave, opId, alvo) {
    if (jaFeito(ordem, opId)) return { ok: true, repetido: true };
    if (usosNoPeriodo(ordem, chave) >= quantosPorPeriodo(ordem, chave)) return falha("Já usado o limite deste período.");
    var l = LIMITES[chave];
    var a = dados(ordem).procedimento;
    a.usos.push({ id: novoId("us"), chave: chave, periodo: periodoDe(ordem, l.periodo), alvo: texto(alvo, 120), em: agora() });
    a.usos = a.usos.slice(-MAX);
    registrarUso(ordem, opId, chave);
    return { ok: true };
  }

  /* Morte · braço de Ser Expurgado: um item tocado pela primeira vez. */
  function itemJaTocado(ordem, nome) {
    var k = chaveDeBusca(nome);
    return dados(ordem).procedimento.tocados.some(function (t) { return chaveDeBusca(t.nome) === k; });
  }
  function registrarToque(ordem, opId, nome, escolha) {
    if (jaFeito(ordem, opId)) return { ok: true, repetido: true };
    var n = texto(nome, 120).trim();
    if (!n) return falha("Diga qual item foi tocado.");
    if (itemJaTocado(ordem, n)) return falha("Este item já foi tocado pelo braço: o efeito é só na primeira vez.");
    var a = dados(ordem).procedimento;
    a.tocados.push({ id: novoId("tq"), nome: n, escolha: escolha === "passado" ? "passado" : "envelhecer", em: agora() });
    a.tocados = a.tocados.slice(-MAX);
    registrarUso(ordem, opId, "toque");
    return { ok: true };
  }

  function definirEscolha(ordem, campo, valor) {
    var a = dados(ordem).procedimento;
    if (campo === "periciasConhecimento" || campo === "periciasApavorante") {
      var max = campo === "periciasConhecimento" ? 2 : 3;
      a[campo] = lista(valor).map(String).filter(function (k, i, l) { return C() && C().pericia(k) && l.indexOf(k) === i; }).slice(0, max);
      return { ok: true };
    }
    if (campo === "rituaisMarcados") {
      a.rituaisMarcados = lista(valor).map(function (k) { return texto(k, 120); }).filter(function (k, i, l) { return k && l.indexOf(k) === i; }).slice(0, 40);
      return { ok: true };
    }
    if (campo === "ritual99elemento" || campo === "ritual99medo") {
      a.rituais99[campo === "ritual99elemento" ? "elemento" : "medo"] = texto(valor, 80);
      return { ok: true };
    }
    if (campo === "corporeidade") { a.corporeidade = valor ? cenaDe(ordem) : ""; return { ok: true }; }
    if (campo === "acoplado") { a.acoplado = texto(valor, 120); return { ok: true }; }
    return falha("Escolha desconhecida.");
  }

  /* A chave de um ritual da ficha para "marcado na pele": o id do
     catálogo, ou o nome (rituais escritos à mão). Não usa o id da
     instância — ele muda ao importar. */
  function chaveDoRitual(ritual) {
    if (!ritual) return "";
    return ritual.origemCatalogoId ? String(ritual.origemCatalogoId) : "nome:" + chaveDeBusca(ritual.nome);
  }
  function elementosDoRitual(ritual) {
    var RT = global.RAMAOrdemRituais;
    var d = RT && RT.dadosDoRitual ? RT.dadosDoRitual(ritual) : ritual;
    if (d && Array.isArray(d.elementos) && d.elementos.length && d.todosOsElementos) return d.elementos;
    var e = d ? (Array.isArray(d.elemento) ? d.elemento : [d.elemento]) : [];
    e = e.filter(Boolean);
    /* Uma entrada do catálogo (elementos[]) ou um ritual sem o bloco de
       Ordem: o elemento vem dele mesmo. */
    if (!e.length && ritual) e = (Array.isArray(ritual.elementos) ? ritual.elementos : [ritual.elemento]).filter(Boolean);
    return e;
  }

  /* O ritual conta como do elemento da trilha? Os do elemento, e o de
     Medo escolhido em Ser Mutilado ("como se fosse um ritual de…", sem
     mudar o catálogo). */
  function ritualDoElementoDaTrilha(ordem, ritual) {
    var v = variante(ordem);
    if (!v || v.especialista || !ritual) return false;
    if (elementosDoRitual(ritual).indexOf(v.elemento) >= 0) return true;
    if (v.marco >= 99 && ativoHoje(ordem)) {
      var medo = dados(ordem).procedimento.rituais99.medo;
      if (medo && (ritual.origemCatalogoId === medo || chaveDoRitual(ritual) === medo)) return true;
    }
    return false;
  }
  function ritualMarcado(ordem, ritual) {
    if (!ritualDoElementoDaTrilha(ordem, ritual)) return false;
    var k = chaveDoRitual(ritual);
    var marcados = dados(ordem).procedimento.rituaisMarcados;
    if (marcados.indexOf(k) >= 0) return true;
    /* O ritual de Medo de Ser Mutilado conta como marcado: é da trilha. */
    var medo = dados(ordem).procedimento.rituais99.medo;
    return !!(medo && ritual.origemCatalogoId === medo);
  }

  /* Ser Perfurado: a Tatuagem Ritualística vale para os rituais do
     elemento marcados na pele, além do normal (alcance pessoal com você
     de alvo). Uma Tatuagem só: quem já tem o poder não recebe outro –1. */
  function menosPeDoRitual(ordem, ritual, inventario, rituais) {
    var notas = [];
    var menos = 0;
    var v = variante(ordem);
    var hoje = ativoHoje(ordem);
    if (v && !v.especialista && v.marco >= 40 && hoje) {
      var pessoal = /pessoal/i.test(String(ritual && ritual.alcance || "")) && /voc[eê]/i.test(String(ritual && ritual.alvo || ""));
      if (ritualMarcado(ordem, ritual) || pessoal) {
        menos += 1;
        notas.push("–1 PE de Tatuagem Ritualística (Ser Perfurado: vale para os rituais de " + NOME_DO_ELEMENTO[v.elemento] + " marcados na pele" + (temPoder(ordem, "tatuagemRitualistica") ? "; o poder que a ficha já tem não soma outro –1" : "") + ").");
      }
    }
    if (v && !v.especialista && v.marco >= 65 && hoje && v.elemento === "morte" && ritual && ritual.origemCatalogoId === "op.ritual.cicatrizacao" && conheceRitual(rituais, "op.ritual.cicatrizacao")) {
      menos += 1;
      notas.push("–1 PE de Ser Rasgado (Cicatrização já conhecida, cumulativo).");
    }
    if (cajadoAtivo(ordem, inventario, rituais) && elementosDoRitual(ritual).indexOf("sangue") >= 0) {
      menos += 1;
      notas.push("–1 PE do Cajado da Cruz de Sangue empunhado.");
    }
    return { menosPe: menos, notas: notas };
  }

  /* A DT do ritual: +2 nos marcados (Ser Rasgado) e +1 com o Cajado
     (rituais de Sangue). */
  function dtExtraDoRitual(ordem, ritual, inventario, rituais) {
    var partes = [];
    var total = 0;
    var v = variante(ordem);
    if (v && !v.especialista && v.marco >= 65 && ativoHoje(ordem) && ritualMarcado(ordem, ritual)) {
      total += 2; partes.push("+2 de Ser Rasgado (marcado na pele)");
    }
    if (cajadoAtivo(ordem, inventario, rituais) && elementosDoRitual(ritual).indexOf("sangue") >= 0) {
      total += 1; partes.push("+1 do Cajado da Cruz de Sangue");
    }
    return { valor: total, partes: partes };
  }

  /* O atributo da DT dos rituais e dos PE (Ser Escarificado). */
  function atributoDoElemento(ordem) {
    var v = variante(ordem);
    return v && v.elemento ? ATRIBUTO_DO_ELEMENTO[v.elemento] : "";
  }

  /* `rituais`: os rituais da ficha (ficha.rituais.itens). Um ritual
     concedido só por hoje (rituaisDoDia) não conta como conhecido. */
  function conheceRitual(rituais, catalogoId) {
    return lista(rituais).some(function (r) { return r && r.origemCatalogoId === catalogoId; });
  }

  /* Os rituais que a trilha deixa conjurar HOJE sem serem aprendidos:
     o de Ser Apavorante, Cicatrização de Ser Rasgado (se ainda não
     conhece) e os dois de Ser Mutilado. */
  function rituaisDoDia(ordem, rituaisDaFicha) {
    var v = variante(ordem);
    var saida = [];
    if (!v || !ativoHoje(ordem)) return saida;
    var conhecidos = lista(rituaisDaFicha).map(function (r) { return r && r.origemCatalogoId; }).filter(Boolean);
    if (v.especialista && v.marco >= 99 && RITUAL_APAVORANTE[v.elemento]) saida.push({ id: RITUAL_APAVORANTE[v.elemento], fonte: "Ser Apavorante" });
    if (!v.especialista && v.marco >= 65 && v.elemento === "morte" && conhecidos.indexOf("op.ritual.cicatrizacao") < 0) saida.push({ id: "op.ritual.cicatrizacao", fonte: "Ser Rasgado" });
    if (!v.especialista && v.marco >= 99) {
      var r99 = dados(ordem).procedimento.rituais99;
      if (r99.elemento) saida.push({ id: r99.elemento, fonte: "Ser Mutilado (" + NOME_DO_ELEMENTO[v.elemento] + ", 4º círculo)" });
      if (r99.medo) saida.push({ id: r99.medo, fonte: "Ser Mutilado (Medo, 4º círculo, como se fosse de " + NOME_DO_ELEMENTO[v.elemento] + ")" });
    }
    return saida.filter(function (x) { return conhecidos.indexOf(x.id) < 0 || x.fonte.indexOf("Ser Mutilado") === 0; });
  }

  /* A reação de Ser Perfurado: a condição do elemento, uma vez por cena. */
  function podeReacao(ordem, situacao) {
    var v = variante(ordem);
    if (!v || v.especialista || v.marco < 40 || !ativoHoje(ordem)) return { ok: false, motivo: "Só com Ser Perfurado e a escarificação de hoje." };
    if (usosNoPeriodo(ordem, "reacaoPerfurado") >= 1) return { ok: false, motivo: "Uma vez por cena — já usada nesta cena." };
    var req = REACAO_DO_ELEMENTO[v.elemento];
    var s = situacao || {};
    var cats = lista(s.categorias);
    var ok = req.categorias.some(function (c) { return cats.indexOf(c) >= 0; }) || (req.machucado && s.machucado) || (req.morrendo && s.morrendo);
    return ok ? { ok: true, texto: req.texto } : { ok: false, motivo: "A reação pede estar " + req.texto + "." };
  }

  /* =================================================================
     OS EFEITOS DO DIA E A PENALIDADE SOCIAL
     -----------------------------------------------------------------
     Uma lista no formato dos modificadores (regras.js): { fonte, detalhe,
     efeito }. Montada do zero a cada chamada — nada se acumula por
     recarregar. Os dados extras (+1d6, +1d8) não são bônus fixo: saem em
     dadosExtras(), para a rolagem.
     ================================================================= */

  function m(fonte, detalhe, efeito) { return { fonte: fonte, detalhe: detalhe, efeito: efeito }; }

  function penalidadeSocial(ordem) {
    var v = variante(ordem);
    if (!v) return [];
    var nome = v.especialista ? "Monstruoso (Especialista)" : "Monstruoso (Ocultista)";
    var p = v.def.pagina[v.marco];
    var pericias = ["diplomacia", "enganacao", "intuicao"];
    if (v.marco >= 99) return [m(nome, "–2 dados em Diplomacia, Enganação e Intuição (AS7 p. " + p + ")", { tipo: "dadosPericia", pericias: pericias, valor: -2 })];
    if (v.marco >= 65) return [m(nome, "–1 dado em Diplomacia, Enganação e Intuição (AS7 p. " + p + ")", { tipo: "dadosPericia", pericias: pericias, valor: -1 })];
    if (v.marco >= 40) return [m(nome, "–5 em Diplomacia, Enganação e Intuição (AS7 p. " + p + ")", { tipo: "bonusPericia", pericias: pericias, valor: -5 })];
    return [m(nome, "–2 em Diplomacia, Enganação e Intuição (AS7 p. " + p + ")", { tipo: "bonusPericia", pericias: pericias, valor: -2 })];
  }

  function efeitosDoDia(ordem) {
    var v = variante(ordem);
    var reg = registroDeHoje(ordem);
    if (!v || !reg || !v.elemento) return [];
    var el = v.elemento;
    var at = ATRIBUTO_DO_ELEMENTO[el];
    var saida = [];
    var dia = "até o fim do dia " + reg.dia;
    if (v.especialista) {
      var apavorante = v.marco >= 99;
      var f1 = apavorante ? "Ser Apavorante" : "Ser Experimentado";
      var det = (apavorante ? "forma apavorante, substitui Ser Experimentado · " : "") + dia;
      saida.push(m(f1, det, { tipo: "atributoDoPe", atributo: at }));
      saida.push(m(f1, det + " · soma " + NOME_DO_ATRIBUTO[at] + " nos testes baseados nele", { tipo: "bonusTestesAtributo", atributo: at }));
      if (el === "sangue") saida.push(m(f1, (apavorante ? "Enorme: –5 em Furtividade, +5 em manobras" : "Grande: –2 em Furtividade, +2 em manobras") + " · " + dia, { tipo: "bonusPericia", pericias: ["furtividade"], valor: apavorante ? -5 : -2 }));
      if (el === "energia") saida.push(m(f1, dia, { tipo: "deslocamento", valor: apavorante ? 12 : 6 }));
      if (el === "conhecimento" && !apavorante && dados(ordem).procedimento.periciasConhecimento.length) {
        saida.push(m(f1, "considerado treinado · " + dia, { tipo: "treinadoPorAliado", pericias: dados(ordem).procedimento.periciasConhecimento.slice() }));
      }
      if (v.marco >= 40) {
        var n = reg.sacrificio.pontos || 0;
        if (el === "energia") saida.push(m("Ser Testado", "+2 na Defesa" + (n ? " e +" + 2 * n + " pelos " + n + " ponto(s) de Vigor queimados" : "") + " · " + dia, { tipo: "defesa", valor: 2 + 2 * n }));
        if (el === "sangue") saida.push(m("Ser Testado", "RD 2" + (n ? " +" + 2 * n + " pelos " + n + " ponto(s) de Intelecto devorados" : "") + " · " + dia, { tipo: "resistenciaDano", dano: "geral", valor: 2 + 2 * n }));
      }
    } else {
      saida.push(m("Ser Escarificado", dia, { tipo: "atributoDoPe", atributo: at }));
      saida.push(m("Ser Escarificado", dia, { tipo: "atributoDaDt", atributo: at }));
    }
    return saida;
  }

  /* +1 em atributos do dia (Ser Escarificado, o braço de Ser Expurgado,
     Ser Apavorante e Ser Mutilado) e o sacrifício de Ser Testado. O
     sacrifício NÃO vale para PV, PE, SAN e perícias treinadas (p. 82):
     regras.js pede `semSacrificio` nessas contas. */
  function ajusteDeAtributo(ordem, chave, opcoes) {
    var v = variante(ordem);
    var reg = registroDeHoje(ordem);
    if (!v || !reg || !v.elemento) return 0;
    var at = ATRIBUTO_DO_ELEMENTO[v.elemento];
    var n = 0;
    if (chave === at) {
      if (v.especialista) {
        if (v.marco >= 65) n += 1;   /* o braço */
        if (v.marco >= 99) n += 1;   /* a forma apavorante */
      } else {
        n += 1;                      /* Ser Escarificado */
        if (v.marco >= 99) n += 1;   /* Ser Mutilado */
      }
    }
    if (!(opcoes && opcoes.semSacrificio) && reg.sacrificio.pontos && reg.sacrificio.atributo === chave) n -= reg.sacrificio.pontos;
    return n;
  }
  function partesDoAtributo(ordem, chave) {
    var v = variante(ordem);
    var reg = registroDeHoje(ordem);
    var saida = [];
    if (!v || !reg || !v.elemento) return saida;
    var at = ATRIBUTO_DO_ELEMENTO[v.elemento];
    if (chave === at) {
      if (v.especialista && v.marco >= 65) saida.push({ fonte: "Ser Expurgado (o braço)", valor: 1 });
      if (v.especialista && v.marco >= 99) saida.push({ fonte: "Ser Apavorante", valor: 1 });
      if (!v.especialista) saida.push({ fonte: "Ser Escarificado", valor: 1 });
      if (!v.especialista && v.marco >= 99) saida.push({ fonte: "Ser Mutilado", valor: 1 });
    }
    if (reg.sacrificio.pontos && reg.sacrificio.atributo === chave) {
      saida.push({ fonte: "Ser Testado (" + SACRIFICIO[v.elemento].verbo + " " + reg.sacrificio.pontos + ")", valor: -reg.sacrificio.pontos,
        nota: "não muda PV, PE, SAN nem perícias treinadas" });
    }
    return saida;
  }

  /* Grau temporário: Ser Apavorante de Conhecimento (expert nas três),
     o Tato do Vampirismo (até o fim da cena) e o estágio I da infecção
     da Apóstata (treinado em Religião). Nunca grava o grau da ficha. */
  var GRAUS = ["destreinado", "treinado", "veterano", "expert"];
  function grauTemporario(ordem, chave) {
    var melhor = null;
    function propor(grau, fonte) {
      if (!melhor || GRAUS.indexOf(grau) > GRAUS.indexOf(melhor.grau)) melhor = { grau: grau, fonte: fonte };
    }
    var v = variante(ordem);
    if (v && v.especialista && v.marco >= 99 && v.elemento === "conhecimento" && ativoHoje(ordem) &&
        dados(ordem).procedimento.periciasApavorante.indexOf(chave) >= 0) propor("expert", "Ser Apavorante (até o fim do dia)");
    var cena = cenaDe(ordem);
    dados(ordem).vampirismo.consumos.forEach(function (c) {
      if (c.vaso === "tato" && c.paraMim && c.cena === cena && c.modo === "grau" && c.escolha === chave) propor(GRAU_DO_TATO[c.forma], "Vampirismo · Vasos do Tato (até o fim da cena)");
    });
    var inf = dados(ordem).infeccao;
    if (inf.ativa && chave === "religiao" && !inf.treinoPorBonus) propor("treinado", "Mentem Corrumpere · estágio I");
    return melhor;
  }

  /* Os bônus fixos que dependem de estado de cena (Vampirismo, infecção). */
  function efeitosDeCena(ordem) {
    var saida = [];
    var cena = cenaDe(ordem);
    dados(ordem).vampirismo.consumos.forEach(function (c) {
      if (c.vaso === "tato" && c.paraMim && c.cena === cena && c.modo === "bonus" && c.escolha) {
        saida.push(m("Vampirismo · Vasos do Tato", "já tinha o grau: +2 até o fim da cena", { tipo: "bonusPericia", pericias: [c.escolha], valor: 2 }));
      }
    });
    var inf = dados(ordem).infeccao;
    if (inf.ativa) {
      if (inf.treinoPorBonus) saida.push(m("Mentem Corrumpere", "estágio I: já era treinado em Religião, +2", { tipo: "bonusPericia", pericias: ["religiao"], valor: 2 }));
      if (inf.estagio >= 2) saida.push(m("Mentem Corrumpere", "estágio II: +5 em Religião", { tipo: "bonusPericia", pericias: ["religiao"], valor: 5 }));
    }
    return saida;
  }

  function efeitos(ordem, inventario) {
    if (!ordem) return [];
    return penalidadeSocial(ordem).concat(efeitosDoDia(ordem), efeitosDeCena(ordem));
  }

  /* Os dados que entram na ROLAGEM (não são bônus fixo): `contexto` =
     { pericia, atributo, ataque: "corpo"|"distancia"|null, atributoPuro }.
     Devolve [{ dado, rotulo }]. */
  function dadosExtras(ordem, inventario, contexto) {
    var ctx = contexto || {};
    var saida = [];
    var v = variante(ordem);
    var reg = registroDeHoje(ordem);
    if (v && reg && v.especialista && v.marco >= 40) {
      var n = reg.sacrificio.pontos || 0;
      if (v.elemento === "conhecimento" && ctx.atributo === "int") saida.push({ dado: (1 + n) + "d6", rotulo: "Ser Testado" + (n ? " (+" + n + "d6 de Agilidade inexistida)" : "") });
      if (v.elemento === "energia" && ctx.ataque) saida.push({ dado: (1 + n) + "d6", rotulo: "Ser Testado" + (n ? " (+" + n + "d6 de Vigor queimado)" : "") });
    }
    if (v && reg && v.especialista && v.marco >= 65 && v.elemento === "sangue" && ctx.ataque === "corpo") {
      saida.push({ dado: "1d8", rotulo: "Ser Expurgado (braço de Sangue)" });
    }
    if (peDeCoelhoAtivo(ordem, inventario)) saida.push({ dado: "1d4", rotulo: "Pé de Coelho", peDeCoelho: true });
    return saida;
  }

  /* O dano extra dos ataques: Sangue · Ser Testado (+1d6 de Sangue, +1d6
     por ponto devorado; com o braço, d8). Não multiplica no crítico. */
  function danoExtra(ordem) {
    var v = variante(ordem);
    var reg = registroDeHoje(ordem);
    if (!v || !reg || !v.especialista || v.marco < 40 || v.elemento !== "sangue") return null;
    var n = 1 + (reg.sacrificio.pontos || 0);
    var d = v.marco >= 65 ? "d8" : "d6";
    return { expressao: n + d, tipo: "Sangue", rotulo: "Ser Testado (" + n + d + " de Sangue" + (v.marco >= 65 ? ", d8 pelo braço" : "") + ")" };
  }

  /* Morte · Ser Testado: PV temporários no início de cada cena (2d8, +2d8
     por ponto necrosado), uma vez por cena. */
  function temporariosDaCena(ordem) {
    var v = variante(ordem);
    var reg = registroDeHoje(ordem);
    if (!v || !reg || !v.especialista || v.marco < 40 || v.elemento !== "morte") return null;
    return { expressao: (2 * (1 + (reg.sacrificio.pontos || 0))) + "d8", jaRecebido: usosNoPeriodo(ordem, "pvDaCena") >= 1 };
  }
  /* Morte · Ser Experimentado: 2d6 PV temporários no experimento (4d6 na
     forma apavorante). */
  function temporariosDoExperimento(ordem) {
    var v = variante(ordem);
    if (!v || !v.especialista || v.elemento !== "morte") return "";
    return v.marco >= 99 ? "4d6" : "2d6";
  }

  /* =================================================================
     VAMPIRISMO (p. 76–77)
     ================================================================= */

  var FORMAS_VAMPIRISMO = ["normal", "discente", "verdadeiro"];
  var VASOS = ["visao", "audicao", "paladar", "olfato", "tato"];
  var NOMES_DOS_VASOS = { visao: "Vasos da Visão", audicao: "Vasos da Audição", paladar: "Vasos do Paladar", olfato: "Vasos do Olfato", tato: "Vasos do Tato" };
  var BONUS_DA_FORMA = { normal: 5, discente: 10, verdadeiro: 15 };
  var CURA_DA_FORMA = { normal: "2d8+2", discente: "3d8+3", verdadeiro: "4d8+4" };
  var CIRCULO_DA_AUDICAO = { normal: 1, discente: 2, verdadeiro: 3 };
  var GRAU_DO_TATO = { normal: "treinado", discente: "veterano", verdadeiro: "expert" };
  var ID_VAMPIRISMO = "as7.ritual.vampirismo";

  function formaDaVersao(nomeVersao) {
    var k = chaveDeBusca(nomeVersao);
    if (k === "discente") return "discente";
    if (k === "verdadeiro" || k === "verdadeira") return "verdadeiro";
    return "normal";
  }

  /* Um corpo encerrado (a cena dele acabou) nunca volta a ser alvo. */
  function corpoEncerrado(ordem, alvo) {
    var k = chaveDeBusca(alvo);
    return dados(ordem).vampirismo.corpos.some(function (c) { return c.encerrado && chaveDeBusca(c.alvo) === k; });
  }
  function corposDaCena(ordem) {
    var cena = cenaDe(ordem);
    return dados(ordem).vampirismo.corpos.filter(function (c) { return !c.encerrado && c.cena === cena; });
  }
  function acharCorpo(ordem, id) { return dados(ordem).vampirismo.corpos.filter(function (c) { return c.id === id; })[0] || null; }

  /* A conjuração: o corpo vira refeição até o fim da cena. `porMim`:
     conjurado por esta ficha (false: um corpo preparado por outro, que
     esta ficha só registra para comer). */
  function registrarCorpo(ordem, opId, alvo, forma, porMim) {
    if (jaFeito(ordem, opId)) return { ok: true, repetido: true };
    var nome = texto(alvo, 120).trim();
    if (!nome) return falha("Diga de quem é o corpo.");
    if (corpoEncerrado(ordem, nome)) return falha("Este corpo já foi refeição numa cena que acabou: não pode ser alvo de Vampirismo de novo (AS7 p. 76).");
    var k = chaveDeBusca(nome);
    var jaNaCena = corposDaCena(ordem).filter(function (c) { return chaveDeBusca(c.alvo) === k; })[0];
    if (jaNaCena) return falha("Este corpo já é uma refeição nesta cena.");
    var a = dados(ordem).vampirismo;
    var corpo = { id: novoId("cp"), alvo: nome, forma: FORMAS_VAMPIRISMO.indexOf(forma) >= 0 ? forma : "normal", cena: cenaDe(ordem), porMim: porMim !== false, encerrado: false, em: agora() };
    a.corpos.push(corpo);
    a.corpos = a.corpos.slice(-MAX);
    registrarUso(ordem, opId, "vampirismo");
    return { ok: true, corpo: corpo };
  }

  function vasosConsumidos(ordem, corpoId) {
    return dados(ordem).vampirismo.consumos.filter(function (c) { return c.corpoId === corpoId; }).map(function (c) { return c.vaso; });
  }

  /* Comer (1 minuto). `p`: { opId, corpoId, vasos: [...], paraMim,
     beneficiario, escolhas: { audicao, olfato, tato }, paladar (o total
     rolado), grauAtual: { pericia: grau } }. Cada vaso, uma vez por
     corpo. Devolve os registros feitos (a tela aplica cura e efeitos). */
  function consumir(ordem, p) {
    var o = p || {};
    if (jaFeito(ordem, o.opId)) return { ok: true, repetido: true, feitos: [] };
    var corpo = acharCorpo(ordem, o.corpoId);
    if (!corpo || corpo.encerrado || corpo.cena !== cenaDe(ordem)) return falha("O corpo não é uma refeição nesta cena: o efeito do ritual dura até o fim da cena em que foi conjurado.");
    var vasos = lista(o.vasos).filter(function (x, i, l) { return VASOS.indexOf(x) >= 0 && l.indexOf(x) === i; });
    if (!vasos.length) return falha("Escolha pelo menos um vaso sanguíneo.");
    var ja = vasosConsumidos(ordem, corpo.id);
    var repetidos = vasos.filter(function (x) { return ja.indexOf(x) >= 0; });
    if (repetidos.length) return falha("Já consumidos deste corpo: " + repetidos.map(function (x) { return NOMES_DOS_VASOS[x]; }).join(", ") + ". Os mesmos vasos não podem ser consumidos duas vezes.");
    var esc = obj(o.escolhas);
    if (vasos.indexOf("audicao") >= 0 && !texto(esc.audicao, 80)) return falha("Vasos da Audição: escolha o ritual de " + CIRCULO_DA_AUDICAO[corpo.forma] + "º círculo que a pessoa conjurava.");
    if (vasos.indexOf("olfato") >= 0 && !texto(esc.olfato, 120).trim()) return falha("Vasos do Olfato: diga qual ser ligado à pessoa você vai rastrear.");
    if (vasos.indexOf("tato") >= 0 && !(C() && C().pericia(esc.tato))) return falha("Vasos do Tato: escolha a perícia em que a pessoa era " + GRAU_DO_TATO[corpo.forma] + ".");
    var paraMim = o.paraMim !== false;
    var feitos = [];
    var a = dados(ordem).vampirismo;
    vasos.forEach(function (vaso) {
      var r = { id: novoId("vs"), corpoId: corpo.id, vaso: vaso, forma: corpo.forma, cena: corpo.cena,
        beneficiario: texto(o.beneficiario, 80), paraMim: paraMim, escolha: "", modo: "", valor: 0, efeitoId: "", em: agora() };
      if (vaso === "audicao") r.escolha = texto(esc.audicao, 80);
      if (vaso === "olfato") r.escolha = texto(esc.olfato, 120).trim();
      if (vaso === "visao") r.valor = BONUS_DA_FORMA[corpo.forma];
      if (vaso === "paladar") r.valor = inteiro(o.paladar, 0, 999, 0);
      if (vaso === "tato") {
        r.escolha = esc.tato;
        var atual = (obj(o.grauAtual))[esc.tato] || "destreinado";
        r.modo = GRAUS.indexOf(atual) >= GRAUS.indexOf(GRAU_DO_TATO[corpo.forma]) ? "bonus" : "grau";
      }
      a.consumos.push(r);
      feitos.push(r);
    });
    a.consumos = a.consumos.slice(-MAX * 2);
    registrarUso(ordem, o.opId, "refeicao");
    return { ok: true, corpo: corpo, feitos: feitos };
  }

  function consumosDaCena(ordem, soParaMim) {
    var cena = cenaDe(ordem);
    return dados(ordem).vampirismo.consumos.filter(function (c) { return c.cena === cena && (!soParaMim || c.paraMim); });
  }
  function ligarEfeitoAoConsumo(ordem, consumoId, efeitoId) {
    var c = dados(ordem).vampirismo.consumos.filter(function (x) { return x.id === consumoId; })[0];
    if (c) c.efeitoId = idOk(efeitoId);
  }

  /* =================================================================
     ITENS (p. 78–79)
     ================================================================= */

  var ID_CARRANCA = "as7.paranormal.carranca-cacadora";
  var ID_CAJADO = "as7.amaldicoado.cajado-da-cruz-de-sangue";
  var ID_PE = "as7.paranormal.pe-de-coelho";
  var ID_SAL = "as7.paranormal.sal-dourado";
  var ID_TERCO = "as7.amaldicoado.terco-maculado";

  function dadosDoItem(item) { return I() ? I().dadosDoItem(item) : ((item && item.ordem) || {}); }
  function doCatalogo(item, id) { return !!(item && item.origemCatalogoId === id); }
  function estadoDoItem(item) {
    if (!item.ordem || typeof item.ordem !== "object") item.ordem = {};
    if (!item.ordem.as7 || typeof item.ordem.as7 !== "object") item.ordem.as7 = {};
    return item.ordem.as7;
  }

  /* inventario.js chama ao normalizar os dados de Ordem de um item: só o
     que existe passa, cada campo só quando vale. */
  function normalizarDadosDoItem(destino, bruto) {
    var x = obj(bruto && bruto.as7);
    var s = {};
    var guiadas = porId(lista(x.guiadas).map(function (g) {
      /* Sem id (o arquivo importado apaga todos), ganha um: o registro
         vale pela criatura, não pela identidade. */
      var y = obj(g); var id = idOk(y.id) || novoId("cg"); var cri = texto(y.criatura, 120).trim();
      return cri ? { id: id, criatura: cri, cena: idOk(y.cena), terminado: y.terminado === true, em: carimbo(y.em) } : null;
    }).filter(Boolean)).slice(-MAX);
    if (guiadas.length) s.guiadas = guiadas;
    if (idOk(x.ativadoCena)) s.ativadoCena = idOk(x.ativadoCena);
    var usados = inteiro(x.usados, 0, 3, 0);
    if (usados) s.usados = usados;
    var barreiras = porId(lista(x.barreiras).map(function (b) {
      var y = obj(b); var id = idOk(y.id) || novoId("sl");
      return { id: id, forma: y.forma === "circulo" ? "circulo" : "linha", local: texto(y.local, 120), cena: idOk(y.cena), em: carimbo(y.em) };
    }).filter(Boolean)).slice(-MAX);
    if (barreiras.length) s.barreiras = barreiras;
    var suplica = texto(x.suplica, 300).trim();
    if (suplica) s.suplica = suplica;
    if (x.preso === true) s.preso = true;
    if (x.fim === "decepado" || x.fim === "cumprido") s.fim = x.fim;
    if (Object.keys(s).length) destino.as7 = s;
  }

  /* Carranca Caçadora: guiar até uma criatura (10 minutos), terminar
     (consome o material) e a recusa da mesma criatura depois. */
  function carrancaGuiar(item, opId, criatura, cena) {
    var s = estadoDoItem(item);
    var nome = texto(criatura, 120).trim();
    if (!nome) return falha("Diga a criatura ligada ao material.");
    var k = chaveDeBusca(nome);
    s.guiadas = lista(s.guiadas);
    if (s.guiadas.some(function (g) { return g.terminado && chaveDeBusca(g.criatura) === k; })) return falha("A carranca já consumiu um material desta criatura: nunca mais serve para achá-la (outras, sim).");
    if (s.guiadas.some(function (g) { return !g.terminado; })) return falha("A carranca já está guiando: termine os 10 minutos antes.");
    s.guiadas.push({ id: idOk(opId) || novoId("cg"), criatura: nome, cena: idOk(cena), terminado: false, em: agora() });
    return { ok: true };
  }
  function carrancaTerminar(item) {
    var s = estadoDoItem(item);
    var g = lista(s.guiadas).filter(function (x) { return !x.terminado; })[0];
    if (!g) return falha("A carranca não está guiando.");
    g.terminado = true;
    return { ok: true, criatura: g.criatura };
  }

  /* Pé de Coelho: vestido, uma vez por cena. */
  function peAtivar(item, cena) {
    var d = dadosDoItem(item);
    if (!d.vestida) return falha("O Pé de Coelho precisa estar vestido.");
    var s = estadoDoItem(item);
    if (s.ativadoCena === cena) return falha("Uma vez por cena — já ativado nesta cena.");
    s.ativadoCena = cena;
    return { ok: true };
  }
  function peDeCoelhoAtivo(ordem, inventario) {
    var cena = cenaDe(ordem);
    return ((inventario && inventario.itens) || []).some(function (i) {
      if (!doCatalogo(i, ID_PE)) return false;
      var d = dadosDoItem(i);
      return d.vestida && d.as7 && d.as7.ativadoCena === cena;
    });
  }

  /* Sal Dourado: linha (1 uso de 3) ou círculo (esvazia). */
  function salUsar(item, forma, local, cena) {
    var s = estadoDoItem(item);
    var usados = inteiro(s.usados, 0, 3, 0);
    if (usados >= 3) return falha("O saleiro está vazio.");
    if (forma === "circulo") s.usados = 3; else s.usados = usados + 1;
    s.barreiras = lista(s.barreiras);
    s.barreiras.push({ id: novoId("sl"), forma: forma === "circulo" ? "circulo" : "linha", local: texto(local, 120), cena: idOk(cena), em: agora() });
    return { ok: true, vazio: s.usados >= 3 };
  }

  /* Terço Maculado: vestir (com a súplica), tentar tirar, contrariar,
     decepar e cumprir. A perda de PV (2d10) é rolada pela tela. */
  function tercoVestir(item, suplica) {
    var s = estadoDoItem(item);
    if (s.fim) return falha("O terço já não tem efeito.");
    var t = texto(suplica, 300).trim();
    if (!t) return falha("Escreva a súplica que o mestre definiu.");
    s.suplica = t;
    s.preso = true;
    if (!item.ordem) item.ordem = {};
    item.ordem.vestida = true;
    return { ok: true };
  }
  function tercoAtivo(item) {
    var s = (dadosDoItem(item).as7) || {};
    return !!(s.preso && !s.fim && s.suplica);
  }
  function tercoEncerrar(item, fim) {
    var s = estadoDoItem(item);
    if (fim !== "decepado" && fim !== "cumprido") return falha("Forma de encerrar desconhecida.");
    s.fim = fim;
    s.preso = false;
    if (fim === "cumprido") {
      /* "vira um item mundano sem qualquer efeito paranormal". */
      delete item.ordem.amaldicoado;
      if (item.ordem.grupo === "amaldicoado") item.ordem.grupo = "geral";
      delete item.ordem.elemento;
    } else {
      delete item.ordem.vestida;
    }
    return { ok: true };
  }
  function tercosAtivos(inventario) {
    return ((inventario && inventario.itens) || []).filter(function (i) { return doCatalogo(i, ID_TERCO) && tercoAtivo(i); });
  }

  /* Cajado da Cruz de Sangue: empunhado, por um ocultista que conhece
     pelo menos um ritual de Sangue. */
  function cajadoAtivo(ordem, inventario, rituais) {
    if (!ordem || ordem.classe !== "ocultista") return false;
    var cajado = ((inventario && inventario.itens) || []).filter(function (i) { return doCatalogo(i, ID_CAJADO) && dadosDoItem(i).empunhada; })[0];
    if (!cajado) return false;
    return lista(rituais).some(function (r) { return r && elementosDoRitual(r).indexOf("sangue") >= 0; });
  }

  /* =================================================================
     DEBAIXO D'ÁGUA (p. 92–93)
     ================================================================= */

  function regraSubaquatica(ordem) { return !!(OP() && OP().ligada(ordem, "regrasSubaquaticas")); }

  function entrarNaAgua(ordem, opcoes) {
    if (!regraSubaquatica(ordem)) return falha("Ligue a regra opcional Regras debaixo d'água (aba Regras) para usar isto.");
    var o = opcoes || {};
    var s = dados(ordem).submerso;
    s.ativo = true;
    s.profundidade = inteiro(o.profundidade, 0, 11000, 0);
    s.natacao = o.natacao === true;
    s.oxigenio = o.oxigenio === true;
    s.testes = 0;
    s.cena = cenaDe(ordem);
    s.em = agora();
    return { ok: true };
  }
  function mudarProfundidade(ordem, metros) {
    var s = dados(ordem).submerso;
    if (!s.ativo) return falha("A ficha não está submersa.");
    var antes = faixaDePressao(s.profundidade).chave;
    s.profundidade = inteiro(metros, 0, 11000, s.profundidade);
    if (faixaDePressao(s.profundidade).chave !== antes) s.testes = 0;
    return { ok: true };
  }
  function sairDaAgua(ordem) {
    var s = dados(ordem).submerso;
    var efeitoId = s.efeitoId;
    ordem.arquivo7.submerso = { ativo: false, profundidade: 0, natacao: false, oxigenio: false, testes: 0, efeitoId: "", cena: "", em: "" };
    return { ok: true, efeitoId: efeitoId };
  }

  /* As faixas do perigo Pressão. */
  function faixaDePressao(metros) {
    var p = inteiro(metros, 0, 11000, 0);
    if (p >= 300) return { chave: "extrema", rotulo: "300 m ou mais", base: 25, passo: 5, momento: "por rodada" };
    if (p >= 100) return { chave: "ferimentos", rotulo: "100 a 299 m", base: 25, passo: 1, momento: "no início dos seus turnos" };
    if (p >= 50) return { chave: "fadiga", rotulo: "50 a 99 m", base: 20, passo: 0, momento: "ao chegar à profundidade" };
    return { chave: "", rotulo: "menos de 50 m", base: 0, passo: 0, momento: "" };
  }
  function dtDaPressao(ordem) {
    var s = dados(ordem).submerso;
    var f = faixaDePressao(s.profundidade);
    if (!f.chave) return null;
    return { dt: f.base + f.passo * s.testes, faixa: f };
  }
  /* O resultado de um teste de Fortitude contra a Pressão: o que a regra
     manda (a tela aplica as condições e rola a perda de PV). */
  function resolverPressao(ordem, opId, total) {
    if (jaFeito(ordem, opId)) return { ok: true, repetido: true };
    var s = dados(ordem).submerso;
    var d = dtDaPressao(ordem);
    if (!s.ativo || !d) return falha("Sem perigo de Pressão nesta profundidade.");
    var passou = inteiro(total, -99, 999, 0) >= d.dt;
    s.testes = Math.min(99, s.testes + 1);
    registrarUso(ordem, opId, "pressao");
    var f = d.faixa.chave;
    var saida = { ok: true, dt: d.dt, passou: passou, faixa: f, condicao: "", perdaPv: "", metade: false };
    if (f === "fadiga") { if (!passou) saida.condicao = "fatigado"; }
    else if (f === "ferimentos") { saida.perdaPv = "1d6"; saida.metade = passou; if (!passou) saida.condicao = "exausto"; }
    else if (f === "extrema") { if (!passou) { saida.condicao = "inconsciente"; saida.perdaPv = "1d6"; } }
    return saida;
  }

  /* Os modificadores do Submerso (entram como efeito aplicado, em
     Condições, e saem ao sair da água). */
  function modificadoresSubmerso(ordem) {
    var s = dados(ordem).submerso;
    var mods = [{ alvo: "pericia:percepcao", tipo: "bonus", valor: -10 }];
    if (!s.natacao) mods.push({ alvo: "ataques", tipo: "bonus", valor: -5 });
    return mods;
  }
  function restricoesSubmerso(ordem) {
    var s = dados(ordem).submerso;
    var r = [
      "Não dá para falar normalmente; som e luz se propagam mal (Percepção –10 para ver e ouvir).",
      "Pistas visuais em água turva ou escura: –5 a mais, sem lanterna subaquática, infravermelho ou sonar.",
      "Só conjura rituais quem dispensa fala e gestos.",
      "Armas de fogo: alcance 3 m. Outras armas à distância não funcionam (exceto arremesso de perfuração, balestras e redes). Corte e impacto não naturais: metade do dano.",
      "Contra quem está fora d'água: camuflagem e cobertura leve.",
    ];
    if (!s.natacao) r.unshift("Sem deslocamento de natação: –5 em ataques e só se move nadando (Atletismo, OPRPG p. 42).");
    if (!s.oxigenio) r.unshift("Sem fonte de oxigênio: prender a respiração (OPRPG p. 42).");
    return r;
  }
  /* Ser Mutilado dispensa fala e gestos nos rituais marcados. */
  function conjuraSubmerso(ordem, ritual) {
    var v = variante(ordem);
    return !!(v && !v.especialista && v.marco >= 99 && ativoHoje(ordem) && ritualMarcado(ordem, ritual));
  }

  /* =================================================================
     MENTEM CORRUMPERE (a Apóstata, p. 70)
     ================================================================= */

  function infectar(ordem, opId, estagio, treinadoEmReligiao) {
    if (jaFeito(ordem, opId)) return { ok: true, repetido: true };
    var inf = dados(ordem).infeccao;
    if (inf.ativa) return falha("A ficha já está infectada.");
    ordem.arquivo7.infeccao = {
      ativa: true, desde: diaDe(ordem), estagio: inteiro(estagio, 1, 4, 1), treinoPorBonus: treinadoEmReligiao === true,
      falhasSeguidas: 0, testes: [], efeitos: [], curadaEm: "",
    };
    registrarUso(ordem, opId, "infeccao");
    return { ok: true };
  }
  function diasInfectado(ordem) {
    var inf = dados(ordem).infeccao;
    return inf.ativa ? Math.max(0, diaDe(ordem) - inf.desde) : 0;
  }
  /* DT 20 +1 por dia infectado: no primeiro dia depois da infecção, 21. */
  function dtDaInfeccao(ordem) { return 20 + diasInfectado(ordem); }
  function testeDeHoje(ordem) {
    var dia = diaDe(ordem);
    return dados(ordem).infeccao.testes.filter(function (t) { return t.dia === dia; })[0] || null;
  }
  var FALHAS_PARA_RITO = { 1: 2, 2: 3, 3: 4 };
  function registrarTesteDiario(ordem, opId, total) {
    if (jaFeito(ordem, opId)) return { ok: true, repetido: true };
    var inf = dados(ordem).infeccao;
    if (!inf.ativa) return falha("A ficha não está infectada.");
    if (testeDeHoje(ordem)) return falha("O teste deste dia já foi feito.");
    var dt = dtDaInfeccao(ordem);
    var passou = inteiro(total, -99, 999, 0) >= dt;
    inf.testes.push({ id: novoId("ti"), dia: diaDe(ordem), dt: dt, total: inteiro(total, -99, 999, 0), passou: passou, em: agora() });
    inf.testes = inf.testes.slice(-MAX);
    inf.falhasSeguidas = passou ? 0 : inf.falhasSeguidas + 1;
    registrarUso(ordem, opId, "testeInfeccao");
    var limite = FALHAS_PARA_RITO[inf.estagio];
    return { ok: true, passou: passou, dt: dt, falhasSeguidas: inf.falhasSeguidas,
      obrigaRito: !!(limite && inf.falhasSeguidas >= limite) ? inf.estagio : 0 };
  }
  function avancarInfeccao(ordem, estagio) {
    var inf = dados(ordem).infeccao;
    if (!inf.ativa) return falha("A ficha não está infectada.");
    var novo = inteiro(estagio, 1, 4, inf.estagio);
    if (novo <= inf.estagio) return falha("Os estágios só avançam com os ritos.");
    inf.estagio = novo;
    return { ok: true, estagio: novo };
  }
  function curarInfeccao(ordem) {
    var inf = dados(ordem).infeccao;
    if (!inf.ativa) return falha("A ficha não está infectada.");
    var efeitos = inf.efeitos.slice();
    inf.ativa = false;
    inf.curadaEm = agora();
    inf.efeitos = [];
    return { ok: true, efeitos: efeitos };
  }
  /* As condições de cada estágio (postas em Condições pela tela). */
  function condicoesDoEstagio(estagio) {
    var c = [];
    if (estagio >= 2) c.push("alquebrado");
    if (estagio >= 4) c.push("esmorecido", "abalado");
    return c;
  }

  /* =================================================================
     EXPOSIÇÃO EM DOBRO (p. 81 e 85)
     ================================================================= */

  var EXPOSICOES = { moderada: 1, profunda: 2, total: 5 };
  function exposicaoEmDobro(ordem) {
    var tr = ordem && ordem.trilha ? (C() ? C().trilha(ordem.trilha) : null) : null;
    return !!(tr && tr.exposicaoEmDobro && C().trilhaServe(tr, ordem.classe, ordem) && OP() && OP().ligada(ordem, "nexExperiencia"));
  }
  function registrarExposicao(ordem, opId, tipo) {
    if (jaFeito(ordem, opId)) return { ok: true, repetido: true };
    if (!EXPOSICOES[tipo]) return falha("Tipo de exposição desconhecido.");
    if (!(OP() && OP().ligada(ordem, "nexExperiencia"))) return falha("Só com NEX & Experiência: sem a regra, o NEX sobe pela progressão.");
    var dobro = exposicaoEmDobro(ordem);
    var valor = EXPOSICOES[tipo] * (dobro ? 2 : 1);
    var antes = inteiro(ordem.nex, 0, 99, 0);
    ordem.nex = Math.min(99, antes + valor);
    var a = dados(ordem);
    a.exposicoes.push({ id: novoId("ex"), tipo: tipo, valor: valor, dobro: dobro, em: agora() });
    a.exposicoes = a.exposicoes.slice(-MAX);
    registrarUso(ordem, opId, "exposicao");
    return { ok: true, antes: antes, depois: ordem.nex, valor: valor, dobro: dobro };
  }

  /* =================================================================
     A CENA ACABOU
     ================================================================= */

  /* Os corpos do Vampirismo da cena que acabou ficam encerrados (nunca
     mais alvo); a corporeidade do braço de Energia sai. */
  function aoTrocarDeCena(ordem, cenaQueAcabou) {
    var a = ordem && ordem.arquivo7;
    var saida = { corposEncerrados: [] };
    if (!a) return saida;
    var acabou = cenaQueAcabou || "inicial";
    a.vampirismo.corpos.forEach(function (c) {
      if (c.cena === acabou && !c.encerrado) { c.encerrado = true; saida.corposEncerrados.push(c.alvo); }
    });
    if (a.procedimento.corporeidade === acabou) a.procedimento.corporeidade = "";
    return saida;
  }

  /* O dia mudou na cronologia: o limite de Morrendo acompanha. */
  function aoMudarDia(ordem) { aplicarLimiteDeMorrendo(ordem); }

  global.RAMAOrdemArquivo7 = {
    VARIANTES: VARIANTES,
    ATRIBUTO_DO_ELEMENTO: ATRIBUTO_DO_ELEMENTO,
    NOME_DO_ATRIBUTO: NOME_DO_ATRIBUTO,
    NOME_DO_ELEMENTO: NOME_DO_ELEMENTO,
    SACRIFICIO: SACRIFICIO,
    RITUAL_APAVORANTE: RITUAL_APAVORANTE,
    REACAO_DO_ELEMENTO: REACAO_DO_ELEMENTO,
    VASOS: VASOS,
    NOMES_DOS_VASOS: NOMES_DOS_VASOS,
    BONUS_DA_FORMA: BONUS_DA_FORMA,
    CURA_DA_FORMA: CURA_DA_FORMA,
    CIRCULO_DA_AUDICAO: CIRCULO_DA_AUDICAO,
    GRAU_DO_TATO: GRAU_DO_TATO,
    FORMAS_VAMPIRISMO: FORMAS_VAMPIRISMO,
    ID_VAMPIRISMO: ID_VAMPIRISMO,
    ID_CARRANCA: ID_CARRANCA, ID_CAJADO: ID_CAJADO, ID_PE: ID_PE, ID_SAL: ID_SAL, ID_TERCO: ID_TERCO,
    EXPOSICOES: EXPOSICOES,

    normalizar: normalizar,
    vazio: vazio,
    dados: dados,
    jaFeito: jaFeito,
    registrarUso: registrarUso,
    cenaDe: cenaDe,
    diaDe: diaDe,
    temPoder: temPoder,

    elementoDoExorcizado: elementoDoExorcizado,
    contatoNaCena: contatoNaCena,
    registrarContato: registrarContato,

    variante: variante,
    registroDeHoje: registroDeHoje,
    ativoHoje: ativoHoje,
    semProcedimentoHoje: semProcedimentoHoje,
    recuperacao: recuperacao,
    componentesDisponiveis: componentesDisponiveis,
    limiteDoSacrificio: limiteDoSacrificio,
    fazerProcedimento: fazerProcedimento,
    marcarSemProcedimento: marcarSemProcedimento,
    extraDeMorrendo: extraDeMorrendo,
    aplicarLimiteDeMorrendo: aplicarLimiteDeMorrendo,
    usosNoPeriodo: usosNoPeriodo,
    quantosPorPeriodo: quantosPorPeriodo,
    registrarUsoLimitado: registrarUsoLimitado,
    itemJaTocado: itemJaTocado,
    registrarToque: registrarToque,
    definirEscolha: definirEscolha,
    chaveDoRitual: chaveDoRitual,
    elementosDoRitual: elementosDoRitual,
    ritualDoElementoDaTrilha: ritualDoElementoDaTrilha,
    ritualMarcado: ritualMarcado,
    menosPeDoRitual: menosPeDoRitual,
    dtExtraDoRitual: dtExtraDoRitual,
    atributoDoElemento: atributoDoElemento,
    rituaisDoDia: rituaisDoDia,
    podeReacao: podeReacao,

    penalidadeSocial: penalidadeSocial,
    efeitosDoDia: efeitosDoDia,
    efeitos: efeitos,
    ajusteDeAtributo: ajusteDeAtributo,
    partesDoAtributo: partesDoAtributo,
    grauTemporario: grauTemporario,
    dadosExtras: dadosExtras,
    danoExtra: danoExtra,
    temporariosDaCena: temporariosDaCena,
    temporariosDoExperimento: temporariosDoExperimento,

    formaDaVersao: formaDaVersao,
    corpoEncerrado: corpoEncerrado,
    corposDaCena: corposDaCena,
    acharCorpo: acharCorpo,
    registrarCorpo: registrarCorpo,
    vasosConsumidos: vasosConsumidos,
    consumir: consumir,
    consumosDaCena: consumosDaCena,
    ligarEfeitoAoConsumo: ligarEfeitoAoConsumo,

    normalizarDadosDoItem: normalizarDadosDoItem,
    carrancaGuiar: carrancaGuiar,
    carrancaTerminar: carrancaTerminar,
    peAtivar: peAtivar,
    peDeCoelhoAtivo: peDeCoelhoAtivo,
    salUsar: salUsar,
    tercoVestir: tercoVestir,
    tercoAtivo: tercoAtivo,
    tercoEncerrar: tercoEncerrar,
    tercosAtivos: tercosAtivos,
    cajadoAtivo: cajadoAtivo,

    regraSubaquatica: regraSubaquatica,
    entrarNaAgua: entrarNaAgua,
    mudarProfundidade: mudarProfundidade,
    sairDaAgua: sairDaAgua,
    faixaDePressao: faixaDePressao,
    dtDaPressao: dtDaPressao,
    resolverPressao: resolverPressao,
    modificadoresSubmerso: modificadoresSubmerso,
    restricoesSubmerso: restricoesSubmerso,
    conjuraSubmerso: conjuraSubmerso,

    infectar: infectar,
    diasInfectado: diasInfectado,
    dtDaInfeccao: dtDaInfeccao,
    testeDeHoje: testeDeHoje,
    registrarTesteDiario: registrarTesteDiario,
    avancarInfeccao: avancarInfeccao,
    curarInfeccao: curarInfeccao,
    condicoesDoEstagio: condicoesDoEstagio,

    exposicaoEmDobro: exposicaoEmDobro,
    registrarExposicao: registrarExposicao,

    aoTrocarDeCena: aoTrocarDeCena,
    aoMudarDia: aoMudarDia,
  };
})(typeof window !== "undefined" ? window : globalThis);
