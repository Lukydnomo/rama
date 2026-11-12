/* =====================================================================
   R.A.M.A. — Tormenta20 (Jogo do Ano) · o motor (RAMATormenta20)
   ---------------------------------------------------------------------
   A ficha guarda ESCOLHAS e ESTADO; nada de total gravado. calcular()
   junta as fontes — raça, origem, cada nível de cada classe, divindade,
   poderes, itens, efeitos ativos e condições —, aplica as regras de
   acúmulo (p. 226) e devolve cada característica com as parcelas.

   Acúmulo por categoria de fonte:
     habilidade  soma entre habilidades; a mesma habilidade vale o maior
     item, magia, parceiro, ambiente
                 dentro da categoria vale o maior bônus e a pior
                 penalidade; categorias diferentes se somam
     condicao    por grupo de efeito vale a mais severa (p. 394)
     armadura, escudo
                 bônus próprios do item vestido/empunhado

   Puro: quem rola passa `rolar(expressao)` (na página, RAMADados; nos
   testes, uma fila). O servidor roda este mesmo arquivo.
   ===================================================================== */

(function (global) {
  "use strict";

  function D() { return global.RAMATormenta20Dados; }
  function RA() { return global.RAMATormenta20Racas; }
  function CL() { return global.RAMATormenta20Classes; }
  function OR() { return global.RAMATormenta20Origens; }
  function DE() { return global.RAMATormenta20Deuses; }
  function PO() { return global.RAMATormenta20Poderes; }
  function EQ() { return global.RAMATormenta20Equipamento; }
  function MG() { return global.RAMATormenta20Magias; }
  function IM() { return global.RAMATormenta20ItensMagicos; }
  function X() { return global.RAMATormenta20Expressao; }

  var VERSAO = 1;
  var ATR = ["for", "des", "con", "int", "sab", "car"];
  var RESISTENCIAS = ["fortitude", "reflexos", "vontade"];
  var CATEGORIAS_UNICAS = { item: 1, magia: 1, parceiro: 1, ambiente: 1 };

  function inteiro(v, p) { var n = Math.floor(Number(v)); return isFinite(n) ? n : (p === undefined ? 0 : p); }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function texto(v, max) { return String(v === undefined || v === null ? "" : v).slice(0, max || 200); }
  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  var contadorId = 0;
  function novoId() {
    if (global.RAMAUtil && global.RAMAUtil.uuid) return global.RAMAUtil.uuid();
    contadorId++;
    return "t20-" + Date.now().toString(36) + "-" + contadorId.toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* =================================================================
     FICHA VAZIA E NORMALIZAÇÃO
     ================================================================= */
  function fichaVazia() {
    return {
      versao: VERSAO,
      metodo: "pontos",
      rolagens: [],
      atributosBase: { "for": 0, des: 0, con: 0, "int": 0, sab: 0, car: 0 },
      raca: { id: "", variante: "", atributos: [], escolhas: {} },
      origem: { id: "", beneficios: [], escolhas: {}, propria: null },
      divindade: null,
      niveis: [],
      periciasInt: [],
      poderes: [],
      magias: [],
      oficios: [],
      inventario: { itens: [], tibar: 0 },
      recursos: { pv: null, pm: null, pvRef: null, pmRef: null, pvTemp: 0, pmTemp: 0, naoLetal: 0, sangrando: false, estavel: true },
      operacoes: [],
      condicoes: [],
      ativos: [],
      usos: {},
      situacoes: {},
      xp: 0,
      idade: null,
      alinhamento: "",
      parceiros: [],
      engenhocas: [],
      formulas: [],
      opcoes: { parceirosVulneraveis: false },
      historico: [],
    };
  }

  function normalizarItem(it) {
    var i = obj(it);
    var estado = ["mochila", "vestido", "empunhado", "guardado"].indexOf(i.estado) >= 0 ? i.estado : "mochila";
    return {
      id: texto(i.id, 80) || novoId(),
      ref: texto(i.ref, 80),
      nome: texto(i.nome, 120),
      quantidade: Math.max(0, Math.min(9999, inteiro(i.quantidade, 1))),
      estado: estado,
      mao: ["principal", "secundaria", "duas"].indexOf(i.mao) >= 0 ? i.mao : "principal",
      melhorias: lista(i.melhorias).map(String).slice(0, 4),
      material: texto(i.material, 40),
      encantos: lista(i.encantos).map(String).slice(0, 8),
      magico: i.magico ? texto(i.magico, 80) : "",
      cargas: i.cargas === undefined || i.cargas === null ? null : Math.max(0, inteiro(i.cargas)),
      municao: i.municao === undefined || i.municao === null ? null : Math.max(0, inteiro(i.municao)),
      escolha: i.escolha === undefined ? null : texto(i.escolha, 80),
      fabricadoPorMim: !!i.fabricadoPorMim,
      personalizado: i.personalizado && typeof i.personalizado === "object" ? clone(i.personalizado) : null,
      notas: texto(i.notas, 2000),
    };
  }

  function normalizar(bruto) {
    var b = obj(bruto);
    var v = fichaVazia();
    v.metodo = ["pontos", "rolagem", "livre"].indexOf(b.metodo) >= 0 ? b.metodo : "pontos";
    v.rolagens = lista(b.rolagens).slice(0, 12).map(function (n) { return inteiro(n); });
    ATR.forEach(function (a) { v.atributosBase[a] = Math.max(-5, Math.min(10, inteiro(obj(b.atributosBase)[a]))); });
    var r = obj(b.raca);
    v.raca = { id: texto(r.id, 40), variante: texto(r.variante, 40), atributos: lista(r.atributos).filter(function (a) { return ATR.indexOf(a) >= 0; }).slice(0, 3), escolhas: clone(obj(r.escolhas)) };
    var o = obj(b.origem);
    v.origem = { id: texto(o.id, 40), beneficios: lista(o.beneficios).slice(0, 4).map(function (x) { var y = obj(x); return { tipo: y.tipo === "poder" ? "poder" : "pericia", id: texto(y.id, 60), escolhas: clone(obj(y.escolhas)) }; }).filter(function (x) { return x.id; }),
      escolhas: clone(obj(o.escolhas)), propria: o.propria && typeof o.propria === "object" ? { nome: texto(o.propria.nome, 80), unico: { nome: texto(obj(o.propria.unico).nome, 80), resumo: texto(obj(o.propria.unico).resumo, 600) }, itens: texto(o.propria.itens, 600) } : null };
    if (b.divindade && typeof b.divindade === "object" && b.divindade.id) {
      v.divindade = { id: texto(b.divindade.id, 40), energia: b.divindade.energia === "negativa" ? "negativa" : (b.divindade.energia === "positiva" ? "positiva" : ""),
        poderes: lista(b.divindade.poderes).slice(0, 4).map(function (x) { var y = obj(x); return { id: texto(y.id, 60), escolhas: clone(obj(y.escolhas)) }; }).filter(function (x) { return x.id; }) };
    }
    v.niveis = lista(b.niveis).slice(0, 20).map(function (n) { var y = obj(n); return { classe: texto(y.classe, 40), escolhas: clone(obj(y.escolhas)) }; }).filter(function (n) { return n.classe; });
    v.periciasInt = lista(b.periciasInt).map(String).slice(0, 12);
    v.poderes = lista(b.poderes).slice(0, 60).map(function (x) { var y = obj(x); return { id: texto(y.id, 60), origem: texto(y.origem, 60), escolhas: clone(obj(y.escolhas)) }; }).filter(function (x) { return x.id; });
    v.magias = lista(b.magias).slice(0, 200).map(function (x) { var y = obj(x); return { id: texto(y.id, 60), fonte: texto(y.fonte, 60), atributo: ATR.indexOf(y.atributo) >= 0 ? y.atributo : "", memorizada: !!y.memorizada }; }).filter(function (x) { return x.id; });
    v.oficios = lista(b.oficios).map(String).slice(0, 10);
    var inv = obj(b.inventario);
    v.inventario = { itens: lista(inv.itens).slice(0, 400).map(normalizarItem), tibar: Math.max(0, Math.round((Number(inv.tibar) || 0) * 10) / 10) };
    var rc = obj(b.recursos);
    v.recursos = { pv: rc.pv === null || rc.pv === undefined ? null : inteiro(rc.pv), pm: rc.pm === null || rc.pm === undefined ? null : inteiro(rc.pm),
      pvRef: rc.pvRef === null || rc.pvRef === undefined ? null : inteiro(rc.pvRef), pmRef: rc.pmRef === null || rc.pmRef === undefined ? null : inteiro(rc.pmRef),
      pvTemp: Math.max(0, inteiro(rc.pvTemp)), pmTemp: Math.max(0, inteiro(rc.pmTemp)), naoLetal: Math.max(0, inteiro(rc.naoLetal)), sangrando: !!rc.sangrando, estavel: rc.estavel !== false };
    v.operacoes = lista(b.operacoes).map(function (x) { return texto(x, 80); }).filter(Boolean).slice(-120);
    v.condicoes = lista(b.condicoes).slice(0, 40).map(function (c) { var y = obj(c); return { id: texto(y.id, 40), origem: texto(y.origem, 120), duracao: texto(y.duracao, 60), rodadas: y.rodadas === undefined || y.rodadas === null ? null : inteiro(y.rodadas), notas: texto(y.notas, 300) }; }).filter(function (c) { return c.id; });
    v.ativos = lista(b.ativos).slice(0, 40).map(function (a) { var y = obj(a); return { id: texto(y.id, 80) || novoId(), fonte: texto(y.fonte, 120), nome: texto(y.nome, 120), x: Math.max(0, inteiro(y.x)), duracao: texto(y.duracao, 40), sustentada: !!y.sustentada, estado: texto(y.estado, 40), escolha: y.escolha === undefined ? null : clone(y.escolha), efeitos: clone(lista(y.efeitos)).slice(0, 20), categoria: ["habilidade", "magia", "item", "parceiro", "ambiente"].indexOf(y.categoria) >= 0 ? y.categoria : "habilidade", alvo: texto(y.alvo, 120), contador: Math.max(0, inteiro(y.contador)), magia: texto(y.magia, 60) || undefined, engenhoca: texto(y.engenhoca, 80) || undefined, naoMagico: y.naoMagico === true || undefined }; });
    v.usos = {};
    Object.keys(obj(b.usos)).slice(0, 80).forEach(function (k) { v.usos[texto(k, 80)] = inteiro(b.usos[k]); });
    v.situacoes = {};
    Object.keys(obj(b.situacoes)).slice(0, 40).forEach(function (k) { v.situacoes[texto(k, 80)] = !!b.situacoes[k]; });
    v.xp = Math.max(0, inteiro(b.xp));
    v.idade = b.idade === null || b.idade === undefined || b.idade === "" ? null : Math.max(0, inteiro(b.idade));
    v.alinhamento = texto(b.alinhamento, 4);
    v.parceiros = lista(b.parceiros).slice(0, 12).map(function (p) { var y = obj(p); return { id: texto(y.id, 80) || novoId(), nome: texto(y.nome, 80), tipo: texto(y.tipo, 40), tipos: lista(y.tipos).map(String).slice(0, 3), nivel: ["iniciante", "veterano", "mestre"].indexOf(y.nivel) >= 0 ? y.nivel : "iniciante", origem: texto(y.origem, 80), pericias: lista(y.pericias).map(String).slice(0, 3), elemento: texto(y.elemento, 20), ferido: !!y.ferido, morto: !!y.morto, temporario: !!y.temporario, notas: texto(y.notas, 600), ativo: y.ativo !== false && !y.morto }; });
    v.engenhocas = lista(b.engenhocas).slice(0, 20).map(function (g) { var y = obj(g); return { id: texto(y.id, 80) || novoId(), magia: texto(y.magia, 60), forma: y.forma === "vestida" ? "vestida" : "empunhada", ativacoesHoje: Math.max(0, inteiro(y.ativacoesHoje)), enguicada: !!y.enguicada, nome: texto(y.nome, 80) }; });
    v.formulas = lista(b.formulas).map(String).slice(0, 80);
    var op = obj(b.opcoes);
    v.opcoes = { parceirosVulneraveis: !!op.parceirosVulneraveis, envelhecimento: !!op.envelhecimento };
    v.historico = lista(b.historico).slice(-60).map(function (h) { var y = obj(h); return { quando: texto(y.quando, 40), texto: texto(y.texto, 300) }; });
    return v;
  }

  /* =================================================================
     NÍVEIS
     ================================================================= */
  function niveisDeClasse(t20) {
    var porClasse = {}, ordem = [];
    lista(t20.niveis).forEach(function (n) {
      if (!porClasse[n.classe]) { porClasse[n.classe] = 0; ordem.push(n.classe); }
      porClasse[n.classe]++;
    });
    return { porClasse: porClasse, ordem: ordem, nivel: lista(t20.niveis).length, inicial: ordem[0] || "" };
  }
  function nivelDe(t20) { return Math.max(1, lista(t20.niveis).length || 1); }

  /* =================================================================
     ATRIBUTOS: base + raça + aumentos + efeitos − Tormenta
     ================================================================= */
  function modificadoresDeRaca(t20) {
    var r = t20.raca || {};
    var at = RA() ? RA().atributosDe(r.id, r.variante) : {};
    var mods = { "for": 0, des: 0, con: 0, "int": 0, sab: 0, car: 0 };
    Object.keys(obj(at.fixo)).forEach(function (k) { mods[k] += at.fixo[k]; });
    if (at.escolha) {
      var vistos = {};
      lista(r.atributos).slice(0, at.escolha.quantidade).forEach(function (k) {
        if (vistos[k] || lista(at.escolha.exceto).indexOf(k) >= 0) return;
        vistos[k] = true;
        mods[k] += at.escolha.valor;
      });
    }
    return mods;
  }

  /* Compra de pontos (Tabela 1-1): custo total e validade. */
  function custoDosPontos(base) {
    var total = 0, ok = true;
    ATR.forEach(function (a) {
      var v = inteiro(base[a]);
      var c = D().CUSTO_PONTOS[String(v)];
      if (c === undefined) ok = false; else total += c;
    });
    return { custo: total, valido: ok && total <= D().PONTOS_INICIAIS, restante: D().PONTOS_INICIAIS - total };
  }

  /* =================================================================
     FONTES DE EFEITO
     ================================================================= */
  function fonte(id, nome, origem, def, extra) {
    return Object.assign({ id: id, chave: def && def.id ? def.id : id, nome: nome, origem: origem, def: def || {}, categoria: "habilidade", efeitos: lista(def && def.efeitos), escolhas: {} }, extra || {});
  }

  function poderDeClasse(classe, id) {
    if (!classe) return null;
    return lista(classe.poderes).filter(function (p) { return p.id === id; })[0] || null;
  }
  function poderGeral(id) { return PO() ? PO().PODER[id] || null : null; }
  function poderPorId(id, classeId) {
    var c = classeId && CL() ? CL().CLASSE[classeId] : null;
    return (c && poderDeClasse(c, id)) || poderGeral(id) || null;
  }

  /* Efeitos de uma escolha que traz um "efeito" modelo (treino, bônus,
     magia, RD por elemento…). */
  function efeitosDaEscolha(esc, valor) {
    var out = [];
    if (!esc || !esc.efeito || valor === undefined || valor === null || valor === "") return out;
    var valores = Array.isArray(valor) ? valor : [valor];
    valores.forEach(function (v) {
      if (v && typeof v === "object") return;
      var ef = clone(esc.efeito);
      if (esc.tipo === "pericia" || esc.tipo === "periciaTreinada" || ef.alvoPericia) {
        if (ef.t === "treino") ef.pericia = v; else ef.alvo = "pericia." + v;
      } else if (esc.tipo === "oficio") { ef.alvo = "pericia.oficio:" + v; }
      else if (esc.tipo === "magia") { ef.t = "magia"; ef.id = v; }
      else if (esc.tipo === "opcao" && ef.t === "rd") { ef.tipos = [v]; }
      else if (esc.tipo === "opcao" && ef.t === "imune") { ef.valor = v; }
      else if (esc.tipo === "opcao" && ef.t === "prof") { ef.qual = v; }
      out.push(ef);
    });
    return out;
  }

  function coletarFontes(t20) {
    var fontes = [];
    var nv = niveisDeClasse(t20);
    var nivel = Math.max(1, nv.nivel);

    /* raça */
    var r = t20.raca || {};
    if (RA() && RA().RACA[r.id]) {
      var raca = RA().RACA[r.id];
      RA().habilidadesDe(r.id, r.variante).forEach(function (h) {
        var f = fonte("raca:" + h.id, h.nome, raca.nome, h, { escolhas: obj(obj(r.escolhas)[h.id]), tipoFonte: "raca" });
        lista(h.escolhas).forEach(function (esc) {
          var val = obj(r.escolhas)[esc.id];
          if (esc.troca && val && typeof val === "object" && !Array.isArray(val)) {
            f.efeitos = f.efeitos.concat(efeitosDaEscolha(esc, val.valores));
          } else if (esc.tipo === "alternativa") {
            var alt = obj(val);
            var op = lista(esc.opcoes).filter(function (x) { return x.id === alt.opcao; })[0];
            if (op && op.escolha && op.escolha.efeito) f.efeitos = f.efeitos.concat(efeitosDaEscolha(op.escolha, alt.valor));
            if (op && op.id === "raca" && alt.raca && alt.habilidade) {
              var hab = RA().habilidade(alt.raca, alt.habilidade);
              if (hab) fontes.push(fonte("raca:memoria:" + hab.id, hab.nome + " (Memória Póstuma)", raca.nome, hab, { tipoFonte: "raca" }));
              if (op.escolha.herdaTamanho) {
                var tam = lista(RA().RACA[alt.raca] && RA().habilidadesDe(alt.raca)).map(function (x) { return lista(x.efeitos).filter(function (e) { return e.t === "tamanho"; })[0]; }).filter(Boolean)[0];
                if (tam) f.efeitos = f.efeitos.concat([tam]);
              }
            }
          } else {
            f.efeitos = f.efeitos.concat(efeitosDaEscolha(esc, val));
          }
        });
        fontes.push(f);
      });
    }

    /* origem: perícias e poderes escolhidos */
    var o = t20.origem || {};
    var origem = OR() ? OR().ORIGEM[o.id] : null;
    lista(o.beneficios).forEach(function (b) {
      if (b.tipo === "pericia") {
        /* Ofício treina uma especialização (p. 121): a escolha fica no
           benefício; sem ela, o treino fica pendente. */
        var efO = { t: "treino", pericia: b.id };
        if (b.id === "oficio") { var espO = obj(b.escolhas).oficio; if (espO) efO.pericia = "oficio:" + espO; else efO.oficioPendente = { onde: "origem" }; }
        fontes.push(fonte("origem:pericia:" + b.id, "Treino da origem", origem ? origem.nome : "Origem", { id: "origem:" + b.id, efeitos: [efO] }, { tipoFonte: "origem" }));
      } else {
        var pd = origem && origem.unico && origem.unico.id === b.id ? origem.unico : poderGeral(b.id);
        if (pd) fontes.push(fonte("origem:poder:" + b.id, pd.nome, origem ? origem.nome : "Origem", pd, { escolhas: obj(b.escolhas), tipoFonte: "origem", poderId: pd.id }));
      }
    });
    if (origem && origem.especial === "mestre" && origem.unico && !lista(o.beneficios).some(function (b) { return b.id === origem.unico.id; })) {
      fontes.push(fonte("origem:poder:" + origem.unico.id, origem.unico.nome, origem.nome, origem.unico, { tipoFonte: "origem", poderId: origem.unico.id }));
    }
    if (o.propria && o.propria.unico && o.propria.unico.nome) {
      fontes.push(fonte("origem:propria", o.propria.unico.nome, o.propria.nome || "Origem própria", { id: "origemPropria", resumo: o.propria.unico.resumo }, { tipoFonte: "origem" }));
    }
    /* itens de origem com efeito (adereço de gangue, bolas de malabarismo…) */
    if (origem) lista(origem.itens).forEach(function (it, i) {
      if (it && typeof it === "object" && it.efeitos) fontes.push(fonte("origem:item:" + i, it.texto, origem.nome, { id: "origemItem" + i, efeitos: it.efeitos }, { categoria: "item", tipoFonte: "origem" }));
      if (it && typeof it === "object" && it.escolhaBonus) {
        var esc = obj(o.escolhas)["item" + i];
        if (esc) fontes.push(fonte("origem:item:" + i, it.texto, origem.nome, { id: "origemItem" + i, efeitos: [{ t: "bonus", alvo: "pericia." + esc, valor: it.valor, categoria: "item" }] }, { categoria: "item", tipoFonte: "origem" }));
      }
    });

    /* classes: cada nível, as habilidades da tabela até o nível na classe */
    var contagem = {};
    lista(t20.niveis).forEach(function (n, idx) {
      var c = CL() ? CL().CLASSE[n.classe] : null;
      if (!c) return;
      contagem[n.classe] = (contagem[n.classe] || 0) + 1;
      var nc = contagem[n.classe];
      var esc = obj(n.escolhas);
      lista(c.tabela[nc]).forEach(function (hid) {
        var h = c.habilidades[hid];
        if (!h || h.poder) return;
        var idFonte = "classe:" + c.id + ":" + hid;
        if (fontes.some(function (f) { return f.id === idFonte; })) return;
        var f = fonte(idFonte, h.nome, c.nome, Object.assign({ id: hid }, h), { classe: c.id, desdeNivel: idx + 1, escolhas: esc, tipoFonte: "classe" });
        /* caminhos e escolhas fixas */
        lista(h.escolhas).forEach(function (e) {
          var val = valorDeEscolhaDaClasse(t20, c.id, e.id);
          if (h.caminhos && val && h.caminhos[val]) {
            var cam = h.caminhos[val];
            f.efeitos = f.efeitos.concat(lista(cam.efeitos));
            if (cam.acao) f.acaoCaminho = cam.acao;
            f.caminho = val;
          }
          f.efeitos = f.efeitos.concat(efeitosDaEscolha(e, val));
        });
        fontes.push(f);
      });
      /* poder escolhido neste nível (de classe ou geral) */
      var pz = obj(esc.poder);
      if (pz.id) {
        var def = poderDeClasse(c, pz.id) || poderGeral(pz.id);
        if (def) {
          var fp = fonte("nivel:" + (idx + 1) + ":" + pz.id, def.nome, c.nome + " " + nc + "º", def, { classe: def.grupo ? null : c.id, desdeNivel: idx + 1, escolhas: obj(pz.escolhas), tipoFonte: def.grupo ? "geral" : "classe", poderId: def.id });
          lista(def.escolhas).forEach(function (e) { fp.efeitos = fp.efeitos.concat(efeitosDaEscolha(e, obj(pz.escolhas)[e.id])); });
          if (def.heranca) fp.heranca = def.heranca;
          fontes.push(fp);
        }
      }
    });

    /* linhagem do feiticeiro: básica + heranças por poder */
    var lin = valorDeEscolhaDaClasse(t20, "arcanista", "linhagem");
    var caminhoArc = valorDeEscolhaDaClasse(t20, "arcanista", "caminho");
    var arc = CL() && CL().CLASSE.arcanista;
    if (caminhoArc === "feiticeiro" && lin && arc && arc.linhagens[lin]) {
      var L = arc.linhagens[lin];
      var escolhaLin = valorDeEscolhaDaClasse(t20, "arcanista", "linhagemEscolha");
      ["basica", "aprimorada", "superior"].forEach(function (grau) {
        var tem = grau === "basica" || fontes.some(function (f) { return f.heranca === grau; });
        if (!tem || !L[grau]) return;
        var efs = lista(L[grau].efeitos).map(function (e) {
          var c2 = clone(e);
          if (c2.tipoEscolhido) { if (c2.t === "rd") c2.tipos = [escolhaLin]; if (c2.t === "imune") c2.valor = escolhaLin; delete c2.tipoEscolhido; }
          if (c2.danoTipo === "elemento") c2.danoTipo = escolhaLin;
          return c2;
        });
        fontes.push(fonte("linhagem:" + lin + ":" + grau, L.nome + " (" + (grau === "basica" ? "básica" : grau) + ")", "Arcanista", { id: "linhagem" + grau, efeitos: efs, contaComo: L[grau].contaComo }, { classe: "arcanista", tipoFonte: "classe" }));
      });
    }
    /* familiar */
    if (arc && fontes.some(function (f) { return f.poderId === "familiar"; })) {
      var famF = fontes.filter(function (f) { return f.poderId === "familiar"; })[0];
      var fam = lista(arc.familiares).filter(function (x) { return x[0] === obj(famF.escolhas).familiar; })[0];
      if (fam) fontes.push(fonte("familiar:" + fam[0], "Familiar: " + fam[1], "Arcanista", { id: "familiar" + fam[0], efeitos: fam[3], resumo: fam[2] }, { categoria: "parceiro", tipoFonte: "classe" }));
    }

    /* divindade */
    var dv = t20.divindade;
    if (dv && dv.id && DE() && DE().DEUS[dv.id]) {
      var deus = DE().DEUS[dv.id];
      if (deus.efeitos) fontes.push(fonte("deus:" + deus.id, "Devoto de " + deus.nome, deus.nome, { id: "deus" + deus.id, efeitos: deus.efeitos }, { tipoFonte: "deus" }));
      lista(dv.poderes).forEach(function (pz) {
        var def = poderGeral(pz.id);
        if (!def) return;
        var f = fonte("deus:poder:" + pz.id, def.nome, deus.nome, def, { escolhas: obj(pz.escolhas), tipoFonte: "deus", poderId: def.id });
        lista(def.escolhas).forEach(function (e) { f.efeitos = f.efeitos.concat(efeitosDaEscolha(e, obj(pz.escolhas)[e.id])); });
        fontes.push(f);
      });
    }

    /* poderes avulsos (trocas, Planejamento Marcial, mestre…) */
    lista(t20.poderes).forEach(function (pz, i) {
      var def = poderPorId(pz.id, null);
      if (!def && CL()) CL().CLASSES.some(function (c) { def = poderDeClasse(c, pz.id); return !!def; });
      if (!def) return;
      var f = fonte("poder:" + i + ":" + pz.id, def.nome, pz.origem || "Poder", def, { escolhas: obj(pz.escolhas), tipoFonte: def.grupo ? "geral" : "classe", poderId: def.id });
      lista(def.escolhas).forEach(function (e) { f.efeitos = f.efeitos.concat(efeitosDaEscolha(e, obj(pz.escolhas)[e.id])); });
      fontes.push(f);
    });

    /* perícias pela Inteligência */
    lista(t20.periciasInt).forEach(function (p) { fontes.push(fonte("int:" + p, "Treino (Inteligência)", "Inteligência", { id: "int:" + p, efeitos: [{ t: "treino", pericia: p }] }, { tipoFonte: "int" })); });

    /* perícias e proficiências da classe inicial */
    var inicial = CL() && CL().CLASSE[nv.inicial];
    if (inicial) {
      var esc1 = obj(lista(t20.niveis)[0] && t20.niveis[0].escolhas);
      var efs = [];
      /* Cada "Ofício" da classe pede a especialização, na ordem: fixas,
         "uma das duas", escolhidas (escolhas.oficios[i]). */
      var ofs = lista(esc1.oficios), iOf = 0;
      var treinoDeClasse = function (p) {
        if (p !== "oficio") return { t: "treino", pericia: p };
        var idx = iOf++;
        return ofs[idx] ? { t: "treino", pericia: "oficio:" + ofs[idx] } : { t: "treino", pericia: "oficio", oficioPendente: { onde: "classe", indice: idx } };
      };
      lista(inicial.pericias.fixas).forEach(function (p) { efs.push(treinoDeClasse(p)); });
      lista(inicial.pericias.ou).forEach(function (par, i) { var v = obj(esc1.ou)[i] || par[0]; efs.push(treinoDeClasse(v)); });
      lista(esc1.pericias).forEach(function (p) { efs.push(treinoDeClasse(p)); });
      lista(inicial.proficiencias).forEach(function (q) { efs.push({ t: "prof", qual: q }); });
      fontes.push(fonte("classe:" + inicial.id + ":inicial", "Perícias e proficiências de " + inicial.nome, inicial.nome, { id: "inicial", efeitos: efs }, { classe: inicial.id, tipoFonte: "classe" }));
    }

    /* parceiros ativos, até o limite do patamar (p. 260) */
    var PA = global.RAMATormenta20Parceiros;
    if (PA) {
      var limiteParc = PA.limite(nivel), usados = 0;
      lista(t20.parceiros).forEach(function (pc) {
        if (!pc.ativo || pc.morto) return;
        if (usados >= limiteParc) return;
        usados++;
        var efsP = PA.efeitosDoParceiro(pc);
        fontes.push(fonte("parceiro:" + pc.id, (pc.nome || "Parceiro") + " (" + (pc.tipos.length ? pc.tipos : [pc.tipo]).map(function (t) { return PA.TIPOS[t] ? PA.TIPOS[t].nome : t; }).join(" e ") + ", " + pc.nivel + ")", "Parceiro", { id: "parceiro:" + pc.id, efeitos: efsP }, { categoria: "parceiro", tipoFonte: "parceiro", parceiro: pc }));
      });
    }

    /* itens vestidos e empunhados */
    lista(t20.inventario && t20.inventario.itens).forEach(function (it) {
      if (it.estado !== "vestido" && it.estado !== "empunhado") return;
      var base = itemBase(it);
      var efs = base && base.especifico ? [] : lista(base && base.efeitos).map(clone);
      if (base && base.escolhaBonus && it.escolha) efs.push({ t: "bonus", alvo: "pericia." + it.escolha, valor: base.valor || 1, categoria: "item" });
      lista(it.melhorias).forEach(function (m) { var md = EQ() && EQ().MELHORIA[m]; if (md && md.efeitos) efs = efs.concat(md.efeitos.map(clone)); });
      if (IM()) efs = efs.concat(IM().efeitosDoItem ? IM().efeitosDoItem(it, base) : []);
      if (efs.length) fontes.push(fonte("item:" + it.id, nomeDoItem(it), "Item", { id: "item:" + (it.ref || it.id), efeitos: efs }, { categoria: "item", tipoFonte: "item", item: it }));
    });

    /* efeitos ativos (habilidades ligadas, magias, poções) */
    lista(t20.ativos).forEach(function (a) {
      fontes.push(fonte("ativo:" + a.id, a.nome, a.fonte || "Efeito ativo", { id: "ativo:" + (a.fonte || a.id), efeitos: a.efeitos }, { categoria: a.categoria || "habilidade", x: a.x, ativo: a, tipoFonte: "ativo", estadoAtivo: a.estado }));
    });

    return fontes;
  }

  function valorDeEscolhaDaClasse(t20, classeId, id) {
    var v;
    lista(t20.niveis).some(function (n) { if (n.classe === classeId && obj(n.escolhas)[id] !== undefined) { v = n.escolhas[id]; return true; } return false; });
    return v;
  }

  /* =================================================================
     ITENS
     ================================================================= */
  function itemBase(it) {
    if (!it) return null;
    if (it.personalizado) return it.personalizado;
    var eq = EQ() ? EQ().ITEM[it.ref] : null;
    if (eq) return eq;
    var im = IM() && IM().ITEM ? IM().ITEM[it.ref] : null;
    return im || null;
  }
  function nomeDoItem(it) { var b = itemBase(it); return it.nome || (b && b.nome) || "Item"; }
  function espacosDoItem(it) {
    var b = itemBase(it) || {};
    var e = b.espacos === undefined ? 1 : Number(b.espacos) || 0;
    if (lista(it.melhorias).indexOf("discreto") >= 0) e = Math.max(1, e - 1);
    if (it.material === "mitral") e = Math.max(1, e - 1);
    var q = b.categoria === "municao" ? Math.ceil((it.quantidade || 1) / 1) : (it.quantidade || 1);
    return e * q;
  }

  /* =================================================================
     O CÁLCULO
     ================================================================= */
  function somarComRegras(mods) {
    /* mods: [{valor, categoria, chave, grupo}] já filtrados e aplicados */
    var total = 0;
    var porChave = {}, porCategoria = {}, porGrupo = {};
    mods.forEach(function (m) {
      var v = Number(m.valor) || 0;
      if (!v) return;
      if (m.categoria === "condicao") {
        var g = m.grupo || m.chave;
        if (porGrupo[g] === undefined || v < porGrupo[g]) porGrupo[g] = v;
        return;
      }
      if (m.cumulativo) { total += v; return; }
      if (CATEGORIAS_UNICAS[m.categoria]) {
        var pc = porCategoria[m.categoria] || (porCategoria[m.categoria] = { pos: 0, neg: 0 });
        if (v > 0) pc.pos = Math.max(pc.pos, v); else pc.neg = Math.min(pc.neg, v);
        return;
      }
      var k = (m.categoria || "habilidade") + ":" + (m.chave || "");
      var pk = porChave[k] || (porChave[k] = { pos: 0, neg: 0 });
      if (v > 0) pk.pos = Math.max(pk.pos, v); else pk.neg = Math.min(pk.neg, v);
    });
    Object.keys(porChave).forEach(function (k) { total += porChave[k].pos + porChave[k].neg; });
    Object.keys(porCategoria).forEach(function (k) { total += porCategoria[k].pos + porCategoria[k].neg; });
    Object.keys(porGrupo).forEach(function (k) { total += porGrupo[k]; });
    return total;
  }

  function calcular(bruto, opcoes) {
    var t20 = bruto && bruto.versao ? bruto : normalizar(bruto);
    var op = obj(opcoes);
    var nv = niveisDeClasse(t20);
    var nivel = Math.max(1, nv.nivel);
    var fontes = coletarFontes(t20);
    var tem = {};
    fontes.forEach(function (f) { tem[f.chave] = 1; if (f.poderId) tem[f.poderId] = 1; if (f.caminho) tem[f.caminho] = 1; });
    var caminhoArc = valorDeEscolhaDaClasse(t20, "arcanista", "caminho");
    if (caminhoArc) tem.caminho = 1;
    var estados = {};
    lista(t20.ativos).forEach(function (a) { if (a.estado) estados[a.estado] = a; });
    var condicoes = condicoesEfetivas(t20);
    condicoes.forEach(function (c) { tem["cond:" + c.id] = 1; });

    /* poderes da Tormenta */
    var pt = 0, gratis = 0;
    fontes.forEach(function (f) {
      if (f.def && f.def.grupo === "tormenta") pt++;
      if (f.def && f.def.contaComo === "poderTormenta") { pt++; gratis++; }
      if (f.def && f.def.escolhas) lista(f.def.escolhas).forEach(function (e) { if (e.contaComo === "poderTormenta") { var v = f.escolhas[e.id]; var n = Array.isArray(v) ? v.length : (v && v.valores ? v.valores.length : 0); pt += n; gratis += n; } });
      lista(f.efeitos).forEach(function (e) { if (e.t === "tormentaGratis") gratis += e.valor || 1; });
    });
    /* Deformidade do lefou: os bônus contam como poderes da Tormenta (não para Carisma). */
    var raca = t20.raca || {};
    var deform = obj(raca.escolhas).deformidade;
    if (raca.id === "lefou" && deform) { var nd = Array.isArray(deform) ? deform.length : lista(deform.valores).length; /* já contado acima */ }

    /* --- atributos --- */
    var modRaca = modificadoresDeRaca(t20);
    var aumentos = { "for": 0, des: 0, con: 0, "int": 0, sab: 0, car: 0 };
    lista(t20.niveis).forEach(function (n) { var a = obj(n.escolhas).aumento; if (a && ATR.indexOf(a) >= 0 && obj(n.escolhas.poder).id === "aumentoDeAtributo") aumentos[a]++; });
    lista(t20.poderes).forEach(function (p) { if (p.id === "aumentoDeAtributo" && ATR.indexOf(obj(p.escolhas).atributo) >= 0) aumentos[p.escolhas.atributo]++; });
    var perdaCar = PO() ? PO().perdaDeCarisma(pt, gratis) : 0;
    var atrTormenta = obj(t20.raca && t20.raca.escolhas).perdaTormenta;
    var atributos = {};
    ATR.forEach(function (a) {
      atributos[a] = { base: inteiro(t20.atributosBase[a]), parcelas: [{ rotulo: "Base", valor: inteiro(t20.atributosBase[a]) }] };
      if (modRaca[a]) atributos[a].parcelas.push({ rotulo: "Raça", valor: modRaca[a] });
      if (aumentos[a]) atributos[a].parcelas.push({ rotulo: "Aumento de Atributo", valor: aumentos[a] });
    });
    if (perdaCar) {
      var alvoPerda = (tem.perdaTormentaEscolhida || fontes.some(function (f) { return lista(f.efeitos).some(function (e) { return e.t === "perdaTormentaEscolhida"; }); })) && ATR.indexOf(atrTormenta) >= 0 ? atrTormenta : "car";
      atributos[alvoPerda].parcelas.push({ rotulo: "Poderes da Tormenta", valor: -perdaCar });
    }
    if (t20.opcoes.envelhecimento && t20.idade && D()) {
      var mult = (D().LONGEVIDADE[raca.id] || 1);
      D().ENVELHECIMENTO.forEach(function (fx) {
        if (t20.idade >= fx.idade * mult) ATR.forEach(function (a) { if (fx.mod[a]) atributos[a].parcelas.push({ rotulo: fx.nome, valor: fx.mod[a] }); });
      });
    }
    var atrBase = {};
    ATR.forEach(function (a) { atrBase[a] = atributos[a].parcelas.reduce(function (s, p) { return s + p.valor; }, 0); });

    /* contexto das expressões */
    var circuloMax = 0;
    var ctxBase = {
      nivel: nivel, atr: atrBase, tem: tem, pt: pt, pto: Math.max(0, pt - 1), poderesTormenta: pt,
      patamar: D().patamar(nivel).chave, circuloMax: 0, limitePM: nivel, defesaEscudo: 0, dependentes: { encouracado: 0 },
    };
    fontes.forEach(function (f) { if (f.def && f.def.req && lista(f.def.req.poderes).indexOf("encouracado") >= 0) ctxBase.dependentes.encouracado++; });

    function ctxDe(f) {
      var nc = f && f.classe ? (nv.porClasse[f.classe] || 0) : nivel;
      return function (nome) {
        if (nome === "nc") return nc;
        if (nome === "x") return f && f.x !== undefined ? f.x : 0;
        if (nome === "contador") return f && f.ativo ? f.ativo.contador : 0;
        if (nome.indexOf("atr.") === 0) { var k = nome.slice(4); if (k === "chave") return atrChave; return ctxBase.atr[k] !== undefined ? ctxBase.atr[k] : 0; }
        if (nome.indexOf("tem.") === 0) return tem[nome.slice(4)] ? 1 : 0;
        if (nome.indexOf("nivelClasse.") === 0) return nv.porClasse[nome.slice(12)] || 0;
        if (nome.indexOf("dependentes.") === 0) return ctxBase.dependentes[nome.slice(12)] || 0;
        if (nome.indexOf("prof.") === 0) return proficiencias[nome.slice(5)] ? 1 : 0;
        if (nome.indexOf("cond.") === 0) return tem["cond:" + nome.slice(5)] ? 1 : 0;
        return ctxBase[nome];
      };
    }
    var atrChave = 0;

    /* efeitos aplicáveis: `se`, `estado` e `auto` decidem. `cond` vira
       parcela situacional, só somada com a situação marcada na ficha. */
    var equipamento = analisarEquipamento(t20);
    function autoOk(auto) {
      if (!auto) return true;
      switch (auto) {
        case "semArmadura": return !equipamento.armadura;
        case "semArmaduraPesada": return !equipamento.armadura || equipamento.armaduraDef.tipoArmadura !== "pesada";
        case "armaduraPesada": return !!equipamento.armadura && equipamento.armaduraDef.tipoArmadura === "pesada";
        case "comArmadura": return !!equipamento.armadura;
        case "comEscudo": return !!equipamento.escudo;
        case "livreMovimento": return !(equipamento.armadura && equipamento.armaduraDef.tipoArmadura === "pesada") && !tem["cond:imovel"];
        default: return true;
      }
    }
    var todos = [];
    fontes.forEach(function (f) {
      lista(f.efeitos).forEach(function (e) {
        if (!e || typeof e !== "object") return;
        if (e.se && !X().numero(e.se, ctxDe(f))) return;
        if (e.estado && !estados[e.estado] && !(f.ativo && f.ativo.estado === e.estado)) return;
        if (e.autoCondicoes && !e.autoCondicoes.some(function (c) { return tem["cond:" + c]; }) && !(e.cond && t20.situacoes[e.cond])) return;
        var deArma = !!(e.armas || e.armaEscolhida || e.empunhadura || e.armaEmpunhada || e.naArma);
        var aplicado = autoOk(e.auto) && (!e.cond || !!t20.situacoes[e.cond]) && !deArma;
        todos.push({ fonte: f, efeito: e, aplicado: aplicado, situacional: !!e.cond, condicionalArma: deArma });
      });
    });
    condicoes.forEach(function (c) {
      var cd = D().CONDICAO[c.id];
      if (!cd) return;
      lista(cd.efeitos).forEach(function (e) {
        todos.push({ fonte: { id: "cond:" + c.id, chave: c.id, nome: cd.nome, categoria: "condicao" }, efeito: Object.assign({ t: "bonus" }, e), aplicado: true, condicao: true });
      });
    });

    function modsPara(alvos, filtro) {
      var out = [];
      todos.forEach(function (m) {
        var e = m.efeito;
        if (e.t !== "bonus") return;
        if (alvos.indexOf(e.alvo) < 0) return;
        if (filtro && !filtro(m)) return;
        var v = X().numero(e.valor, ctxDe(m.fonte));
        if (e.naoAcumulaArmadura && equipamento.armadura) v = Math.max(0, v - defesaDoItem(equipamento.armadura, equipamento.armaduraDef));
        var cat = m.condicao ? "condicao" : (e.categoria || m.fonte.categoria || "habilidade");
        if (cat === "encanto") cat = "magia";
        out.push({ valor: v, categoria: cat, chave: m.fonte.chave, grupo: e.grupo, cumulativo: e.cumulativo, rotulo: m.fonte.nome + (e.cond ? " (" + e.cond + ")" : ""), aplicado: m.aplicado, situacional: m.situacional, efeito: e, fonte: m.fonte });
      });
      return out;
    }
    function total(mods) { return somarComRegras(mods.filter(function (m) { return m.aplicado; })); }
    function parcelasDe(mods) { return mods.map(function (m) { return { rotulo: m.rotulo, valor: m.valor, situacional: m.situacional && !m.aplicado }; }); }

    /* atributos finais */
    ATR.forEach(function (a) {
      var ms = modsPara(["atr." + a]);
      ms.forEach(function (m) { atributos[a].parcelas.push({ rotulo: m.rotulo, valor: m.valor, situacional: m.situacional && !m.aplicado }); });
      atributos[a].total = atrBase[a] + total(ms);
      ctxBase.atr[a] = atributos[a].total;
    });
    var atr = ctxBase.atr;
    var minimos = [];
    ATR.forEach(function (a) { if (atr[a] < -5) minimos.push({ atributo: a, efeito: D().ATRIBUTO_MINIMO[a] }); });

    /* proficiências */
    var proficiencias = { simples: true, leves: true };
    var armasSimplesExtra = [], profArmas = [];
    todos.forEach(function (m) {
      var e = m.efeito;
      if (e.t === "prof" && e.qual) proficiencias[e.qual] = true;
      if (e.t === "armaSimples") armasSimplesExtra = armasSimplesExtra.concat(lista(e.grupos), lista(e.armas));
      if (e.t === "profArma") profArmas = profArmas.concat(lista(e.armas));
    });
    if (proficiencias.marciaisCorpo && proficiencias.marciaisDistancia) proficiencias.marciais = true;
    var dv = t20.divindade && DE() ? DE().DEUS[t20.divindade.id] : null;
    if (proficiencias.armaPreferida && dv && dv.armaPreferida) profArmas.push(dv.armaPreferida);

    /* --- caminho do arcanista e atributo-chave de magias --- */
    var magiasInfo = infoDeMagias(t20, nv, atr, fontes, tem);
    atrChave = magiasInfo.atributoChave ? atr[magiasInfo.atributoChave] : 0;
    circuloMax = magiasInfo.circuloMax;
    ctxBase.circuloMax = circuloMax;

    /* --- tamanho --- */
    var tamanho = "medio";
    todos.forEach(function (m) { if (m.efeito.t === "tamanho" && m.aplicado) tamanho = m.efeito.valor; });
    var tam = D().TAMANHO[tamanho] || D().TAMANHO.medio;

    /* --- PV --- */
    var atrPV = "con";
    todos.forEach(function (m) { if (m.efeito.t === "atrPV" && m.aplicado) atrPV = m.efeito.atributo; });
    var pvParcelas = [], pvMax = 0;
    var vistasClasses = {};
    lista(t20.niveis).forEach(function (n, i) {
      var c = CL() && CL().CLASSE[n.classe];
      if (!c) return;
      var primeiroDaClasse = !vistasClasses[n.classe];
      vistasClasses[n.classe] = true;
      var ganho;
      if (i === 0) ganho = c.pv.inicial + atr[atrPV];
      else ganho = Math.max(1, c.pv.nivel + atr[atrPV]);
      pvMax += ganho;
    });
    if (nv.nivel) {
      var ci = CL() && CL().CLASSE[nv.inicial];
      pvParcelas.push({ rotulo: (ci ? ci.nome : "Classe") + " (1º nível)", valor: ci ? ci.pv.inicial : 0 });
      var porNivelSoma = 0;
      lista(t20.niveis).slice(1).forEach(function (n) { var c = CL().CLASSE[n.classe]; if (c) porNivelSoma += c.pv.nivel; });
      if (porNivelSoma) pvParcelas.push({ rotulo: "PV por nível", valor: porNivelSoma });
      var somaAtr = pvMax - (ci ? ci.pv.inicial : 0) - porNivelSoma;
      pvParcelas.push({ rotulo: (atrPV === "con" ? "Constituição" : D().ATRIBUTOS.filter(function (x) { return x.chave === atrPV; })[0].nome) + " × " + nivel + (somaAtr !== atr[atrPV] * nivel ? " (mín. 1 por nível)" : ""), valor: somaAtr });
    }
    todos.forEach(function (m) {
      var e = m.efeito;
      if (e.t === "pvNivel" && m.aplicado) {
        var v = (e.inicial !== undefined ? e.inicial : 0) + X().numero(e.valor, ctxDe(m.fonte)) * Math.max(0, nivel - (e.inicial !== undefined ? 1 : 0));
        pvMax += v; pvParcelas.push({ rotulo: m.fonte.nome, valor: v });
      }
    });
    var pvBonus = modsPara(["pv", "pvInicial"]);
    pvMax += total(pvBonus);
    pvParcelas = pvParcelas.concat(parcelasDe(pvBonus));
    pvMax = Math.max(1, pvMax);

    /* --- PM --- */
    var pmMax = 0, pmParcelas = [];
    var pmPorClasse = {};
    lista(t20.niveis).forEach(function (n) { var c = CL() && CL().CLASSE[n.classe]; if (c) pmPorClasse[c.id] = (pmPorClasse[c.id] || 0) + c.pm; });
    Object.keys(pmPorClasse).forEach(function (k) { pmMax += pmPorClasse[k]; pmParcelas.push({ rotulo: CL().CLASSE[k].nome, valor: pmPorClasse[k] }); });
    /* atributo-chave das classes conjuradoras: um mesmo atributo uma vez só (p. 226) */
    var atrsPM = {};
    Object.keys(nv.porClasse).forEach(function (k) {
      var c = CL().CLASSE[k];
      if (!c || !c.magias || !c.magias.somaPM) return;
      var a = c.magias.atributoPor === "caminho" ? (caminhoArc ? c.habilidades.caminho.caminhos[caminhoArc].atributo : null) : c.magias.atributo;
      if (a) atrsPM[a] = c.nome;
    });
    todos.forEach(function (m) { if (m.efeito.t === "bonus" && m.efeito.alvo === "pm" && m.efeito.atributoUnico && m.aplicado) { atrsPM[m.efeito.atributoUnico] = atrsPM[m.efeito.atributoUnico] || m.fonte.nome; m.aplicado = false; } });
    Object.keys(atrsPM).forEach(function (a) { pmMax += atr[a]; pmParcelas.push({ rotulo: D().ATRIBUTOS.filter(function (x) { return x.chave === a; })[0].nome + " (" + atrsPM[a] + ")", valor: atr[a] }); });
    todos.forEach(function (m) {
      var e = m.efeito;
      if (e.t === "pmNivel" && m.aplicado) { var v = X().numero(e.valor, ctxDe(m.fonte)) * nivel; pmMax += v; pmParcelas.push({ rotulo: m.fonte.nome, valor: v }); }
    });
    var pmBonus = modsPara(["pm", "pmInicial"]);
    pmMax += total(pmBonus);
    pmParcelas = pmParcelas.concat(parcelasDe(pmBonus));
    var sacrificio = inteiro(t20.usos.sacrificioPM);
    if (sacrificio) { pmMax -= sacrificio; pmParcelas.push({ rotulo: "PM sacrificados", valor: -sacrificio }); }
    pmMax = Math.max(0, pmMax);

    /* --- carga --- */
    var cargaBonus = modsPara(["carga"]);
    var limiteCarga = Math.max(1, 10 + (atr["for"] >= 0 ? 2 * atr["for"] : atr["for"]) + total(cargaBonus));
    var cargaUsada = equipamento.espacos + Math.floor((t20.inventario.tibar || 0) / 1000);
    var sobrecarregado = cargaUsada > limiteCarga;
    if (sobrecarregado) { tem["cond:sobrecarregado"] = 1; }

    /* --- penalidade de armadura --- */
    var penParcelas = [];
    var pen = 0;
    if (equipamento.armadura) { var pa = penalidadeDoItem(equipamento.armadura, equipamento.armaduraDef); pen += pa; penParcelas.push({ rotulo: nomeDoItem(equipamento.armadura), valor: pa }); }
    if (equipamento.escudo) { var pe = penalidadeDoItem(equipamento.escudo, equipamento.escudoDef); pen += pe; penParcelas.push({ rotulo: nomeDoItem(equipamento.escudo), valor: pe }); }
    var penMods = modsPara(["penalidadeArmadura"]);
    pen += total(penMods);
    penParcelas = penParcelas.concat(parcelasDe(penMods));
    if (sobrecarregado) { pen -= 5; penParcelas.push({ rotulo: "Sobrecarregado", valor: -5 }); }
    var naoProfArmadura = (equipamento.armadura && equipamento.armaduraDef.tipoArmadura === "pesada" && !proficiencias.pesadas) || (equipamento.escudo && !proficiencias.escudos);

    /* --- Defesa --- */
    var defParcelas = [{ rotulo: "Base", valor: 10 }];
    var pesada = equipamento.armadura && equipamento.armaduraDef.tipoArmadura === "pesada";
    var atrDef = "des", atrDefMax = null;
    todos.forEach(function (m) {
      var e = m.efeito;
      if (e.t !== "atrDefesa" || !m.aplicado) return;
      if (e.comPesada && pesada) { atrDef = e.atributo; atrDefMax = null; }
      else if (!e.comPesada && (!e.comArmadura || equipamento.armadura) && atr[e.atributo] > atr[atrDef]) atrDef = e.atributo;
    });
    var permiteAtrComPesada = todos.some(function (m) { return m.efeito.t === "atrDefesa" && m.efeito.comPesada && m.aplicado; });
    if (pesada && !permiteAtrComPesada) {
      var desMax = 0;
      lista(equipamento.armadura.melhorias).forEach(function (mm) { if (mm === "delicada") desMax = Math.max(desMax, 1); });
      if (equipamento.armadura.material === "mitral") desMax = Math.max(desMax, 2);
      if (desMax) { var vd = Math.min(desMax, atr[atrDef]); defParcelas.push({ rotulo: nomeAtr(atrDef) + " (armadura pesada, até " + desMax + ")", valor: vd }); }
    } else {
      defParcelas.push({ rotulo: nomeAtr(atrDef), valor: atr[atrDef] });
    }
    if (equipamento.armadura) defParcelas.push({ rotulo: nomeDoItem(equipamento.armadura), valor: defesaDoItem(equipamento.armadura, equipamento.armaduraDef) });
    if (equipamento.escudo) { var ve = defesaDoItem(equipamento.escudo, equipamento.escudoDef); defParcelas.push({ rotulo: nomeDoItem(equipamento.escudo), valor: ve }); ctxBase.defesaEscudo = ve; }
    var defMods = modsPara(["defesa", "defesa.corpo"], function (m) { return !m.efeito.armaEmpunhada || armaEmpunhadaCasa(equipamento, m.efeito.armaEmpunhada); });
    defMods.forEach(function (m) { if (m.situacional) return; });
    var defesa = defParcelas.reduce(function (s, p) { return s + p.valor; }, 0) + total(defMods);
    defParcelas = defParcelas.concat(parcelasDe(defMods));
    /* a mesma atributo não entra duas vezes na Defesa (bucaneiro/nobre) */
    var defesaDistancia = defesa + total(modsPara(["defesa.distancia"])) - total(modsPara(["defesa.corpo"]));

    /* --- deslocamento --- */
    var desl = 9, deslParcelas = [];
    var ignoraReducao = todos.some(function (m) { return m.efeito.t === "ignoraReducaoDeslocamento" && m.aplicado; });
    var semReducaoArmadura = ignoraReducao || todos.some(function (m) { return m.efeito.t === "semReducaoDeslocamentoArmadura" && m.aplicado; });
    var outros = {};
    todos.forEach(function (m) {
      var e = m.efeito;
      if (e.t !== "deslocamento" || !m.aplicado) return;
      var v = e.fixo !== undefined ? e.fixo : X().numero(e.base, ctxDe(m.fonte));
      if (e.tipo === "terrestre" || !e.tipo) { if (e.fixo !== undefined) desl = v; else desl = v; deslParcelas.push({ rotulo: m.fonte.nome, valor: v, define: true }); }
      else outros[e.tipo] = Math.max(outros[e.tipo] || 0, e.igualTerrestre ? -1 : v);
    });
    if (pesada && !semReducaoArmadura) { desl -= 3; deslParcelas.push({ rotulo: "Armadura pesada", valor: -3 }); }
    if (sobrecarregado && !ignoraReducao) { desl -= 3; deslParcelas.push({ rotulo: "Sobrecarregado", valor: -3 }); }
    var deslMods = modsPara(["deslocamento"]);
    desl += total(deslMods);
    deslParcelas = deslParcelas.concat(parcelasDe(deslMods));
    condicoes.forEach(function (c) { var cd = D().CONDICAO[c.id]; if (cd && cd.deslocamentoFixo !== undefined) desl = Math.min(desl, cd.deslocamentoFixo); });
    if (tem["cond:lento"]) desl = Math.max(1.5, Math.floor(desl / 2 / 1.5) * 1.5);
    Object.keys(outros).forEach(function (k) { if (outros[k] === -1) outros[k] = desl; if (tem["cond:lento"]) outros[k] = Math.floor(outros[k] / 2 / 1.5) * 1.5; if (tem["cond:imovel"]) outros[k] = 0; });
    desl = Math.max(0, desl);

    /* --- perícias --- */
    var treinos = {};
    todos.forEach(function (m) { if (m.efeito.t === "treino" && m.efeito.pericia) { treinos[m.efeito.pericia] = treinos[m.efeito.pericia] || []; treinos[m.efeito.pericia].push(m.fonte.nome); } });
    var atrAlternativo = {};
    todos.forEach(function (m) { if (m.efeito.t === "atrPericia" && m.aplicado) { var a = m.efeito.atributo === "chave" ? magiasInfo.atributoChave : m.efeito.atributo; if (a) (atrAlternativo[m.efeito.pericia] = atrAlternativo[m.efeito.pericia] || []).push(a); } });
    var oficiosPendentes = [];
    todos.forEach(function (m) { if (m.efeito.t === "treino" && m.efeito.oficioPendente) oficiosPendentes.push(Object.assign({ fonte: m.fonte.nome }, m.efeito.oficioPendente)); });
    var treinoBonus = D().bonusDeTreino(nivel);
    var meio = Math.floor(nivel / 2);
    var pericias = {};
    var oficios = {};
    Object.keys(treinos).forEach(function (k) { if (k.indexOf("oficio:") === 0) oficios[k.slice(7)] = true; });
    lista(t20.oficios).forEach(function (o) { oficios[o] = oficios[o] || false; });
    function calcPericia(chave, def, rotulo) {
      var a = def.atributo;
      lista(atrAlternativo[chave]).concat(lista(atrAlternativo[def.chave])).forEach(function (alt) { if (atr[alt] > atr[a]) a = alt; });
      var treinado = !!(treinos[chave] || (def.chave !== "oficio" && treinos[def.chave]));
      var parcelas = [{ rotulo: "Metade do nível", valor: meio }, { rotulo: nomeAtr(a), valor: atr[a] }];
      if (treinado) parcelas.push({ rotulo: "Treinado (" + lista(treinos[chave] || treinos[def.chave]).join(", ") + ")", valor: treinoBonus });
      var alvos = ["pericias", "pericia." + chave, "pericias." + def.atributo];
      if (def.chave !== chave) alvos.push("pericia." + def.chave);
      if (def.resistencia) alvos.push("resistencias");
      var ms = modsPara(alvos);
      var v = meio + atr[a] + (treinado ? treinoBonus : 0) + total(ms);
      parcelas = parcelas.concat(parcelasDe(ms));
      var aplicaPen = def.armadura || (naoProfArmadura && (def.atributo === "for" || def.atributo === "des"));
      if (aplicaPen && pen) { v += pen; parcelas.push({ rotulo: "Penalidade de armadura", valor: pen }); }
      return { chave: chave, nome: rotulo || def.nome, atributo: a, treinado: treinado, somenteTreinada: !!def.treinada, armadura: !!def.armadura, total: v, parcelas: parcelas, utilizavel: !def.treinada || treinado };
    }
    D().PERICIAS.forEach(function (p) {
      if (p.chave === "oficio") return;
      pericias[p.chave] = calcPericia(p.chave, p);
    });
    var defOficio = D().PERICIA.oficio;
    Object.keys(oficios).forEach(function (o) {
      var nomeOf = (D().OFICIOS.filter(function (x) { return x.chave === o; })[0] || { nome: o }).nome;
      pericias["oficio:" + o] = calcPericia("oficio:" + o, defOficio, "Ofício (" + nomeOf + ")");
    });

    /* --- RD, imunidades, resistências, sentidos, tipo --- */
    var rd = {}, imunidades = {}, sentidos = {}, tipoCriatura = "humanoide", vulnerabilidades = {};
    var rdPorFonte = {};
    todos.forEach(function (m) {
      var e = m.efeito;
      if (!m.aplicado) return;
      if (e.t === "rd") {
        var v = X().numero(e.valor, ctxDe(m.fonte));
        lista(e.tipos && e.tipos.length ? e.tipos : ["geral"]).forEach(function (tp) {
          var k = tp + "|" + (e.fonteRd || m.fonte.chave);
          rdPorFonte[k] = Math.max(rdPorFonte[k] || 0, v);
        });
      }
      if (e.t === "imune" && e.valor) imunidades[e.valor] = m.fonte.nome;
      if (e.t === "sentido") sentidos[e.valor] = m.fonte.nome;
      if (e.t === "tipo") tipoCriatura = e.valor;
      if (e.t === "vulnerabilidadePorDado") vulnerabilidades[e.tipo] = (vulnerabilidades[e.tipo] || 0) + e.valor;
    });
    Object.keys(rdPorFonte).forEach(function (k) { var tp = k.split("|")[0]; rd[tp] = (rd[tp] || 0) + rdPorFonte[k]; });
    condicoes.forEach(function (c) { var cd = D().CONDICAO[c.id]; if (cd && cd.rd) rd.geral = (rd.geral || 0) + cd.rd; });
    var resistencias = {};
    todos.forEach(function (m) { var e = m.efeito; if (e.t === "bonus" && /^resist\./.test(e.alvo)) { var k = e.alvo.slice(7); resistencias[k] = (resistencias[k] || 0) + (m.aplicado ? X().numero(e.valor, ctxDe(m.fonte)) : 0); } });

    /* --- ataques --- */
    var ataques = calcularAtaques({ t20: t20, equipamento: equipamento, pericias: pericias, atr: atr, proficiencias: proficiencias, armasSimplesExtra: armasSimplesExtra, profArmas: profArmas,
      todos: todos, ctxDe: ctxDe, tem: tem, tamanho: tam, nivel: nivel, total: total, modsParaArma: modsParaArma, estados: estados, condicoes: condicoes, atributoChave: magiasInfo.atributoChave });

    function modsParaArma(alvos, arma, ataque) {
      return modsPara(alvos, function (m) {
        var e = m.efeito;
        if (!m.aplicado && !m.condicionalArma) return false;
        if (e.cond && !t20.situacoes[e.cond]) return false;
        if (!autoOk(e.auto)) return false;
        if (e.contraAlvo || e.contraOutros) return false;
        if (e.armas && !armaCasa(arma, e.armas, ataque)) return false;
        if (e.armaEscolhida) { var esc = obj(m.fonte.escolhas)[e.armaEscolhida]; if (!esc || esc !== arma.ref) return false; }
        if (e.empunhadura && !empunhaduraCasa(arma, e.empunhadura, equipamento, ataque)) return false;
        if (e.exceto && armaCasa(arma, e.exceto, ataque)) return false;
        if (e.proficiente && !arma.proficiente) return false;
        if (e.armaPreferida && (!dv || arma.ref !== dv.armaPreferida)) return false;
        if (e.naArma && (!m.fonte.ativo || m.fonte.ativo.alvo !== arma.itemId)) return false;
        return true;
      }).map(function (m) { m.aplicado = true; return m; });
    }

    /* --- manobras (p. 234): teste de ataque corpo a corpo (agarrar só
       desarmado ou arma natural), tamanho e poderes como Derrubar
       Aprimorado. Sem arma corpo a corpo, vale Luta. --- */
    var corpoACorpo = ataques.filter(function (a) { return !a.distancia && !a.enreda; });
    var manobras = {};
    D().MANOBRAS.forEach(function (mb) {
      var pool = mb.id === "agarrar" ? corpoACorpo.filter(function (a) { return a.ref === "desarmado" || a.natural; }) : corpoACorpo;
      if (!pool.length) pool = corpoACorpo;
      var melhor = pool.reduce(function (x, a) { return !x || a.ataque > x.ataque ? a : x; }, null);
      var baseM = melhor ? melhor.ataque : (pericias.luta ? pericias.luta.total : 0);
      var parcM = [{ rotulo: melhor ? "Ataque com " + melhor.nome : "Luta", valor: baseM }];
      if (tam.manobra) parcM.push({ rotulo: "Tamanho (" + tam.nome + ")", valor: tam.manobra });
      var modsM = modsPara(["manobra", "manobra." + mb.id]);
      manobras[mb.id] = { id: mb.id, nome: mb.nome, total: baseM + (tam.manobra || 0) + total(modsM), parcelas: parcM.concat(parcelasDe(modsM)), arma: melhor ? melhor.id : null };
    });

    /* --- recursos atuais --- */
    var rec = t20.recursos;
    var pvAtual = rec.pv === null ? pvMax : rec.pv + (rec.pvRef !== null && rec.pvRef !== undefined ? pvMax - rec.pvRef : 0);
    var pmAtual = rec.pm === null ? pmMax : Math.max(0, rec.pm + (rec.pmRef !== null && rec.pmRef !== undefined ? pmMax - rec.pmRef : 0));
    pvAtual = Math.min(pvMax, pvAtual); pmAtual = Math.min(pmMax, pmAtual);
    var limiteMorte = D().limiteDeMorte(pvMax);

    return {
      nivel: nivel, xp: t20.xp, proximoNivelXp: nivel < 20 ? D().xpDoNivel(nivel + 1) : null, podeSubir: nivel < 20 && t20.xp >= D().xpDoNivel(nivel + 1),
      patamar: D().patamar(nivel), niveisClasse: nv.porClasse, classeInicial: nv.inicial, treino: treinoBonus,
      atributos: atributos, atr: atr, minimos: minimos,
      pv: { max: pvMax, atual: pvAtual, temp: rec.pvTemp, naoLetal: rec.naoLetal, parcelas: pvParcelas, limiteMorte: limiteMorte },
      pm: { max: pmMax, atual: pmAtual, temp: rec.pmTemp, parcelas: pmParcelas },
      defesa: { total: defesa, distancia: defesaDistancia, parcelas: defParcelas },
      penalidadeArmadura: { total: pen, parcelas: penParcelas, naoProficiente: !!naoProfArmadura },
      deslocamento: { terrestre: desl, outros: outros, parcelas: deslParcelas },
      tamanho: tam,
      carga: { usada: cargaUsada, limite: limiteCarga, maximo: limiteCarga * 2, sobrecarregado: sobrecarregado, excesso: cargaUsada > limiteCarga * 2 },
      vestidos: equipamento.vestidos, limiteVestidos: 4 + total(modsPara(["vestidos"])),
      pericias: pericias, proficiencias: proficiencias, armasSimplesExtra: armasSimplesExtra,
      rd: rd, imunidades: imunidades, resistencias: resistencias, sentidos: sentidos, tipoCriatura: tipoCriatura, vulnerabilidades: vulnerabilidades,
      ataques: ataques, manobras: manobras, oficiosPendentes: oficiosPendentes, magias: magiasInfo, condicoes: condicoes, poderesTormenta: pt, perdaCarisma: perdaCar,
      fontes: fontes.map(function (f) { return { id: f.id, nome: f.nome, origem: f.origem, def: f.def, classe: f.classe, escolhas: f.escolhas, tipoFonte: f.tipoFonte, poderId: f.poderId, categoria: f.categoria, ativo: f.ativo, acaoCaminho: f.acaoCaminho, caminho: f.caminho }; }),
      tem: tem, estados: estados, equipamento: equipamento,
      situacionais: todos.filter(function (m) { return m.situacional; }).map(function (m) { return { cond: m.efeito.cond, fonte: m.fonte.nome, alvo: m.efeito.alvo, valor: m.efeito.valor }; }),
    };
  }

  function nomeAtr(a) { var d = D().ATRIBUTOS.filter(function (x) { return x.chave === a; })[0]; return d ? d.nome : a; }

  /* --- equipamento em uso --- */
  function analisarEquipamento(t20) {
    var res = { armadura: null, armaduraDef: null, escudo: null, escudoDef: null, armas: [], vestidos: 0, espacos: 0, maos: { principal: null, secundaria: null } };
    lista(t20.inventario && t20.inventario.itens).forEach(function (it) {
      var b = itemBase(it) || {};
      res.espacos += espacosDoItem(it);
      if (it.estado === "vestido") {
        if (b.categoria === "armadura") { res.armadura = it; res.armaduraDef = b; }
        res.vestidos++;
      }
      if (it.estado === "empunhado") {
        if (b.categoria === "escudo") { res.escudo = it; res.escudoDef = b; }
        else if (b.categoria === "arma" || b.comoArma) res.armas.push(it);
        if (it.mao === "duas") { res.maos.principal = it; res.maos.secundaria = it; }
        else res.maos[it.mao] = it;
      }
    });
    return res;
  }
  function defesaDoItem(it, def) {
    var v = Number(def.defesa) || 0;
    lista(it.melhorias).forEach(function (m) { if (m === "reforcada") v += 1; });
    if (IM() && IM().bonusDefesaDoItem) v += IM().bonusDefesaDoItem(it);
    return v;
  }
  function penalidadeDoItem(it, def) {
    var v = Number(def.penalidade) || 0;
    var mel = lista(it.melhorias);
    if (mel.indexOf("sobMedida") >= 0) v += 2; else if (mel.indexOf("ajustada") >= 0) v += 1;
    if (mel.indexOf("reforcada") >= 0) v -= 1;
    if (it.material === "mitral") v += 2;
    return Math.min(0, v);
  }
  function armaEmpunhadaCasa(eq, tags) { return eq.armas.some(function (it) { var b = itemBase(it) || {}; return tags.some(function (t) { return t === "leve" ? b.empunhadura === "leve" : t === "agil" ? lista(b.habilidades).indexOf("agil") >= 0 : false; }); }); }

  /* --- ataques --- */
  function armaCasa(arma, tags, ataque) {
    var b = arma.def || {};
    return lista(tags).some(function (t) {
      switch (t) {
        case "leve": return b.empunhadura === "leve";
        case "umaMao": return b.empunhadura === "umaMao";
        case "duasMaos": return ataque && ataque.duasMaos || b.empunhadura === "duasMaos";
        case "agil": return lista(b.habilidades).indexOf("agil") >= 0;
        case "alongada": return lista(b.habilidades).indexOf("alongada") >= 0;
        case "arremesso": return !!(ataque && ataque.arremessada);
        case "disparo": return !!b.disparo;
        case "fogo": return b.proficiencia === "fogo";
        case "funda": return arma.ref === "funda";
        case "natural": return !!b.natural;
        case "desarmado": return arma.ref === "desarmado";
        case "corpo": return !ataque || !ataque.distancia;
        default: return arma.ref === t || lista(b.grupos).indexOf(t) >= 0;
      }
    });
  }
  function empunhaduraCasa(arma, emp, eq, ataque) {
    if (emp === "umaArma") return eq.armas.length === 1 && !eq.escudo && !(ataque && ataque.duasMaos) && arma.def.proposito === "corpo" && arma.ref !== "desarmado";
    if (emp === "duasMaos") return !!(ataque && ataque.duasMaos);
    return true;
  }

  function calcularAtaques(c) {
    var out = [];
    var E = EQ();
    var t20 = c.t20, eq = c.equipamento;
    function proficienteEm(b, ref) {
      if (!b || b.natural) return true;
      if (c.armasSimplesExtra.indexOf(ref) >= 0 || lista(b.grupos).some(function (g) { return c.armasSimplesExtra.indexOf(g) >= 0; })) return true;
      if (c.profArmas.indexOf(ref) >= 0) return true;
      if (b.proficiencia === "simples") return true;
      if (b.proficiencia === "marcial") return !!(c.proficiencias.marciais || (b.proposito === "corpo" ? c.proficiencias.marciaisCorpo : c.proficiencias.marciaisDistancia));
      if (b.proficiencia === "exotica") return !!c.proficiencias.exoticas || !!c.proficiencias["exotica:" + ref];
      if (b.proficiencia === "fogo") return !!c.proficiencias.fogo;
      return false;
    }
    function montar(it, b, opts) {
      var ref = it ? it.ref : b.id;
      var arma = { ref: ref, def: b, proficiente: proficienteEm(b, ref), itemId: it ? it.id : null };
      function naArmaOk(m) { return !m.efeito.naArma || (m.fonte.ativo && m.fonte.ativo.alvo === arma.itemId); }
      /* exóticas adaptáveis de uma mão viram marciais de duas mãos */
      var duasMaos = opts.duasMaos;
      if (!arma.proficiente && b.marcialDuasMaos && duasMaos && (c.proficiencias.marciais || c.proficiencias.marciaisCorpo)) arma.proficiente = true;
      var distancia = !!opts.distancia;
      var periciaId = distancia ? "pontaria" : "luta";
      var atrOriginal = distancia ? "des" : "for";
      var pericia = c.pericias[periciaId];
      var ataqueBase = pericia ? pericia.total : 0;
      var parcelasAtk = [{ rotulo: pericia ? pericia.nome : periciaId, valor: ataqueBase }];
      /* troca de atributo no ataque (Acuidade, adaga, Armeiro, Balística, Abençoar Arma…) */
      var atrAtk = atrOriginal;
      if (ref === "adaga") atrAtk = c.atr.des > c.atr[atrAtk] ? "des" : atrAtk;
      var atrDano = (!distancia || opts.arremessada || b.somaFor) ? "for" : null;
      c.todos.forEach(function (m) {
        var e = m.efeito;
        if (e.t !== "atrAtaque" || !m.aplicado && !(e.estado && c.estados[e.estado]) && !e.naArma) return;
        if (!naArmaOk(m)) return;
        if (e.atributo === "chave") { var ak = c.atributoChave; if (ak && c.atr[ak] > c.atr[atrAtk]) atrAtk = ak; return; }
        if (e.estado && !c.estados[e.estado]) return;
        if (e.armas && !armaCasa(arma, e.armas, opts)) return;
        if (e.tipoArma && (e.tipoArma === "corpo") === distancia) return;
        if (e.armaPreferida) { var dv2 = t20.divindade && DE() && DE().DEUS[t20.divindade.id]; if (!dv2 || dv2.armaPreferida !== ref) return; }
        if (e.substitui && e.substitui !== atrOriginal && !(e.substitui === "for" && atrAtk === "for") ) { if (!(e.substitui === "des" && distancia)) return; }
        if (c.atr[e.atributo] > c.atr[atrAtk]) { atrAtk = e.atributo; if (e.dano && atrDano) atrDano = e.atributo; }
      });
      if (atrAtk !== atrOriginal && pericia) {
        var dif = c.atr[atrAtk] - c.atr[atrOriginal];
        ataqueBase += dif;
        parcelasAtk.push({ rotulo: nomeAtr(atrAtk) + " no lugar de " + nomeAtr(atrOriginal), valor: dif });
      }
      /* Esgrima Mágica: Atuação no lugar de Luta */
      c.todos.forEach(function (m) {
        var e = m.efeito;
        if (e.t !== "periciaAtaque" || distancia) return;
        if (e.estado && !c.estados[e.estado]) return;
        if (e.armas && !armaCasa(arma, e.armas, opts)) return;
        var alt = c.pericias[e.pericia];
        if (alt && alt.total > ataqueBase) { parcelasAtk = [{ rotulo: alt.nome + " (" + m.fonte.nome + ")", valor: alt.total }]; ataqueBase = alt.total; }
      });
      var atk = ataqueBase;
      var mAtk = c.modsParaArma(["ataque", distancia ? "ataque.distancia" : "ataque.corpo"], arma, opts);
      atk += c.total(mAtk);
      parcelasAtk = parcelasAtk.concat(mAtk.map(function (m) { return { rotulo: m.rotulo, valor: m.valor }; }));
      if (!arma.proficiente) { atk -= 5; parcelasAtk.push({ rotulo: "Sem proficiência", valor: -5 }); }
      if (lista(b.habilidades).indexOf("desbalanceada") >= 0) { atk -= 2; parcelasAtk.push({ rotulo: "Desbalanceada", valor: -2 }); }
      if (b.corpoPenalidade && !distancia) { atk += b.corpoPenalidade; parcelasAtk.push({ rotulo: "Arma de arremesso em corpo a corpo", valor: b.corpoPenalidade }); }
      if (b.ataque) { atk += b.ataque; parcelasAtk.push({ rotulo: "Arma improvisada", valor: b.ataque }); }
      var mel = it ? lista(it.melhorias) : [];
      if (mel.indexOf("pungente") >= 0) { atk += 2; parcelasAtk.push({ rotulo: "Pungente", valor: 2 }); }
      else if (mel.indexOf("certeira") >= 0) { atk += 1; parcelasAtk.push({ rotulo: "Certeira", valor: 1 }); }
      var bonusMagico = it && IM() && IM().bonusArma ? IM().bonusArma(it) : null;
      if (bonusMagico && bonusMagico.ataque) { atk += bonusMagico.ataque; parcelasAtk.push({ rotulo: "Mágica", valor: bonusMagico.ataque }); }

      /* dano: dados com passos */
      var danoBase = String(b.dano || "0");
      if (danoBase.indexOf("/") > 0) { var dp = danoBase.split("/"); danoBase = (lista(b.habilidades).indexOf("dupla") >= 0) ? dp[0] : (duasMaos ? dp[1] : dp[0]); }
      var passos = 0, passosRot = [];
      if (c.tamanho.passosArma && !b.natural) { passos += c.tamanho.passosArma; passosRot.push(c.tamanho.nome); }
      if (lista(b.habilidades).indexOf("adaptavel") >= 0 && duasMaos && danoBase === String(b.dano).split("/")[0]) { passos += 1; passosRot.push("Adaptável (duas mãos)"); }
      c.todos.forEach(function (m) {
        var e = m.efeito;
        if (e.t !== "passoDano") return;
        if (!m.aplicado && !(e.armas || e.armaEscolhida || e.armaPreferida || e.desarmado || e.tipoDano || e.naArma)) return;
        if (!naArmaOk(m)) return;
        if (e.estado && !c.estados[e.estado]) return;
        if (e.armas && !armaCasa(arma, e.armas, opts)) return;
        if (e.desarmado && ref !== "desarmado") return;
        if (e.armaEscolhida) { var esc = obj(m.fonte.escolhas)[e.armaEscolhida]; if (esc !== ref) return; }
        if (e.armaPreferida) { var dv3 = t20.divindade && DE() && DE().DEUS[t20.divindade.id]; if (!dv3 || dv3.armaPreferida !== ref) return; }
        if (e.tipoDano && E && String(b.tipo || "").indexOf(e.tipoDano === "corte" ? "C" : e.tipoDano) < 0) return;
        var v = X().numero(e.valor, c.ctxDe(m.fonte));
        passos += v; passosRot.push(m.fonte.nome);
      });
      if (it && it.material === "adamante") { passos += 1; passosRot.push("Adamante"); }
      var dano = E ? E.passoDeDano(danoBase, passos) : danoBase;
      var parcelasDano = [{ rotulo: "Dano da arma", valor: danoBase }];
      if (passos) parcelasDano.push({ rotulo: (passos > 0 ? "+" : "") + passos + " passo(s): " + passosRot.join(", "), valor: dano });
      var fixo = 0;
      if (atrDano) { fixo += c.atr[atrDano]; parcelasDano.push({ rotulo: nomeAtr(atrDano), valor: c.atr[atrDano] }); }
      var mDano = c.modsParaArma(["dano", distancia ? "dano.distancia" : "dano.corpo"].concat(ref === "desarmado" ? ["dano.desarmado"] : []), arma, opts);
      fixo += c.total(mDano);
      parcelasDano = parcelasDano.concat(mDano.map(function (m) { return { rotulo: m.rotulo, valor: m.valor }; }));
      if (mel.indexOf("atroz") >= 0) { fixo += 2; parcelasDano.push({ rotulo: "Atroz", valor: 2 }); }
      else if (mel.indexOf("cruel") >= 0) { fixo += 1; parcelasDano.push({ rotulo: "Cruel", valor: 1 }); }
      if (bonusMagico && bonusMagico.dano) { fixo += bonusMagico.dano; parcelasDano.push({ rotulo: "Mágica", valor: bonusMagico.dano }); }
      var extras = [];
      c.todos.forEach(function (m) {
        var e = m.efeito;
        if (e.t !== "danoExtra" || !m.aplicado && !e.estado && !e.naArma) return;
        if (!naArmaOk(m)) return;
        if (e.estado && !c.estados[e.estado]) return;
        if (e.contraAlvo || e.contraTipo || e.cond) return;
        if (e.alvo === "corpo" && distancia) return;
        if (e.tipoDanoArma && String(b.tipo || "").indexOf("C") < 0) return;
        var dx = X().rolavel(e.valor, c.ctxDe(m.fonte));
        if (dx && dx !== "0") extras.push({ dados: dx, tipo: e.tipo === "opcao" ? (m.fonte.ativo && m.fonte.ativo.escolha) || "" : (e.tipo || ""), rotulo: m.fonte.nome });
      });
      if (it && it.material === "geloEterno") extras.push({ dados: "2", tipo: "frio", rotulo: "Gelo eterno" });
      if (it && it.material === "materiaVermelha") extras.push({ dados: "1d6", tipo: "", rotulo: "Matéria vermelha" });
      if (bonusMagico && bonusMagico.extras) extras = extras.concat(bonusMagico.extras);
      /* crítico */
      var margem = b.margem || 20, multv = b.mult || 2;
      var mMargem = c.modsParaArma(["margem"].concat(b.natural ? ["margem.natural"] : []).concat(ref === "desarmado" ? ["margem.desarmado"] : []), arma, opts);
      margem -= c.total(mMargem);
      if (mel.indexOf("precisa") >= 0) margem -= 1;
      if (it && it.material === "mitral") margem -= 1;
      if (bonusMagico && bonusMagico.margem) margem -= bonusMagico.margem;
      var mMult = c.modsParaArma(["mult", distancia ? "mult.distancia" : "mult.corpo"].concat(opts.arremessada ? ["mult.arremesso"] : []).concat(ref === "desarmado" ? ["mult.desarmado"] : []), arma, opts);
      multv += c.total(mMult);
      if (mel.indexOf("macica") >= 0) multv += 1;
      margem = Math.max(2, Math.min(20, margem));
      return {
        id: (it ? it.id : ref) + (opts.sufixo || ""), itemId: it ? it.id : null, ref: ref, nome: (it ? nomeDoItem(it) : b.nome) + (opts.rotulo ? " (" + opts.rotulo + ")" : ""),
        pericia: periciaId, ataque: atk, parcelasAtaque: parcelasAtk, dano: dano, danoFixo: fixo, parcelasDano: parcelasDano, extras: extras,
        margem: margem, mult: multv, tipo: (E && E.ITEM && b.tipo) ? b.tipo : (b.tipo || ""), alcance: distancia ? (opts.arremessada ? (b.alcance || "curto") : b.alcance) : null,
        distancia: distancia, arremessada: !!opts.arremessada, duasMaos: !!duasMaos, proficiente: arma.proficiente, natural: !!b.natural, naoLetal: !!b.naoLetal,
        municao: b.municao || null, recarga: b.recarga || null, extraAtaque: opts.extra || null,
      };
    }
    eq.armas.forEach(function (it) {
      var b = itemBase(it) || {};
      if (b.categoria !== "arma") { if (b.comoArma) { var base = typeof b.comoArma === "string" ? (E && E.ITEM[b.comoArma]) : Object.assign({ proposito: "corpo", empunhadura: "leve", margem: 20 }, b.comoArma); if (base) out.push(montar(it, base, { duasMaos: it.mao === "duas" })); } return; }
      var duas = it.mao === "duas" || b.empunhadura === "duasMaos";
      if (b.proposito === "corpo") {
        out.push(montar(it, b, { duasMaos: duas }));
        if (b.arremesso) out.push(montar(it, b, { distancia: true, arremessada: true, rotulo: "arremessada", sufixo: ":arr" }));
      } else {
        if (b.arremesso) out.push(montar(it, b, { distancia: true, arremessada: true }));
        else if (b.enreda) out.push(Object.assign(montar(it, b, { distancia: true }), { dano: "—", enreda: true }));
        else out.push(montar(it, b, { distancia: true, duasMaos: duas }));
        if (b.arremesso && b.corpoPenalidade !== undefined) out.push(montar(it, b, { rotulo: "corpo a corpo", sufixo: ":cac" }));
      }
    });
    if (eq.escudo && (c.proficiencias.marciais || c.proficiencias.marciaisCorpo)) {
      var ed = eq.escudoDef;
      if (ed && ed.ataque) out.push(montar(eq.escudo, { id: eq.escudo.ref, nome: nomeDoItem(eq.escudo), proposito: "corpo", empunhadura: "umaMao", dano: ed.ataque.dano, margem: 20, mult: ed.ataque.mult, tipo: "I", proficiencia: "simples" }, { rotulo: "ataque com escudo" }));
    }
    /* armas naturais */
    c.todos.forEach(function (m) {
      var e = m.efeito;
      if (e.t !== "armaNatural") return;
      if (!m.aplicado) return;
      out.push(montar(null, { id: e.id, nome: e.nome, proposito: "corpo", empunhadura: "leve", dano: e.dano, margem: e.margem || 20, mult: e.mult || 2, tipo: e.tipo, natural: true, proficiencia: "simples" }, { extra: e.extra || null }));
    });
    /* desarmado (sempre) */
    var danoDes = "1d3", naoLetal = true;
    c.todos.forEach(function (m) { var e = m.efeito; if (e.t === "danoDesarmado" && m.aplicado) { var dd = X().rolavel(e.valor, c.ctxDe(m.fonte)); if (dd && (!danoDes || dadoMedio(dd) > dadoMedio(danoDes))) { danoDes = dd; naoLetal = false; } } });
    var temManopla = lista(t20.inventario.itens).some(function (it) { return it.ref === "manopla" && it.estado === "vestido"; });
    if (temManopla) naoLetal = false;
    out.push(montar(null, Object.assign({}, EQ() ? EQ().DESARMADO : { id: "desarmado", nome: "Desarmado", proposito: "corpo", empunhadura: "leve", margem: 20, mult: 2, tipo: "I" }, { dano: danoDes, naoLetal: naoLetal }), {}));
    return out;
  }
  function dadoMedio(d) { var m = /^(\d+)d(\d+)$/.exec(String(d)); return m ? Number(m[1]) * (Number(m[2]) + 1) / 2 : Number(d) || 0; }

  /* =================================================================
     MAGIAS: atributo-chave, círculos, CD e limite de PM por fonte
     ================================================================= */
  function infoDeMagias(t20, nv, atr, fontes, tem) {
    var info = { fontes: {}, atributoChave: null, circuloMax: 0, conhecidas: [] };
    Object.keys(nv.porClasse).forEach(function (k) {
      var c = CL() && CL().CLASSE[k];
      if (!c || !c.magias) return;
      var nc = nv.porClasse[k];
      var circ = 0;
      Object.keys(c.magias.circulos).forEach(function (n) { if (nc >= Number(n)) circ = Math.max(circ, c.magias.circulos[n]); });
      var a = c.magias.atributoPor === "caminho" ? (function () { var cam = valorDeEscolhaDaClasse(t20, k, "caminho"); return cam && c.habilidades.caminho.caminhos[cam] ? c.habilidades.caminho.caminhos[cam].atributo : "int"; })() : c.magias.atributo;
      var cd = 10 + Math.floor(Math.max(1, nv.nivel) / 2) + atr[a];
      info.fontes["classe:" + k] = { classe: k, nome: c.nome, tipo: c.magias.tipo, circuloMax: circ, atributo: a, cd: cd, limitePM: nc, escolas: valorDeEscolhaDaClasse(t20, k, "escolas") || null };
      if (circ >= info.circuloMax) { info.circuloMax = circ; info.atributoChave = a; }
    });
    info.cdBase = function (atributo) { return 10 + Math.floor(Math.max(1, nv.nivel) / 2) + (atr[atributo] || 0); };
    info.conhecidas = lista(t20.magias).map(function (m) { return m.id; });
    /* magias concedidas por efeitos (raça, poderes) */
    info.concedidas = [];
    fontes.forEach(function (f) {
      lista(f.efeitos).forEach(function (e) {
        if (e.t === "magia" && e.id) info.concedidas.push({ id: e.id, atributo: e.atributo || info.atributoChave || "car", fonte: f.nome, desconto: e.desconto || 0, naoMagica: !!e.naoMagica, soTruque: !!e.soTruque, tipoMagia: e.tipoMagia || null, restricao: e.restricao || null, limitePM: Math.max(1, nv.nivel) });
      });
    });
    return info;
  }

  /* =================================================================
     CONDIÇÕES
     ================================================================= */
  /* Expande as condições que implicam outras (exausto → debilitado,
     lento, vulnerável) e devolve a lista efetiva sem repetição. */
  function condicoesEfetivas(t20) {
    var vistos = {}, out = [];
    function add(id, origem) {
      if (vistos[id]) return;
      var cd = D().CONDICAO[id];
      if (!cd) return;
      vistos[id] = true;
      out.push({ id: id, nome: cd.nome, origem: origem });
      lista(cd.inclui).forEach(function (i) { add(i, cd.nome); });
    }
    lista(t20.condicoes).forEach(function (c) { add(c.id, c.origem || ""); });
    if (t20.recursos && (t20.recursos.pv !== null && t20.recursos.pv <= 0)) add("inconsciente", "0 PV ou menos");
    return out;
  }

  /* Recebe uma condição: imunidade, agravamento (abalado→apavorado,
     fraco→debilitado→inconsciente, fatigado→exausto→inconsciente). */
  function aplicarCondicao(t20, id, origem, opcoes) {
    var op = obj(opcoes);
    var cd = D().CONDICAO[id];
    if (!cd) return { ok: false, motivo: "desconhecida" };
    if (!op.ignoraImunidade) {
      var calc = op.calc || calcular(t20);
      if (calc.imunidades[id] || (cd.tipo && calc.imunidades[cd.tipo])) return { ok: false, motivo: "imune", fonte: calc.imunidades[id] || calc.imunidades[cd.tipo] };
    }
    var ja = lista(t20.condicoes).filter(function (c) { return c.id === id; })[0];
    if (ja && cd.agrava) {
      t20.condicoes = t20.condicoes.filter(function (c) { return c.id !== id; });
      return aplicarCondicao(t20, cd.agrava, origem, Object.assign({}, op, { ignoraImunidade: true }));
    }
    if (ja) { if (op.duracao) ja.duracao = op.duracao; return { ok: true, id: id, renovada: true }; }
    t20.condicoes.push({ id: id, origem: texto(origem, 120), duracao: texto(op.duracao || "cena", 60), rodadas: op.rodadas === undefined ? null : inteiro(op.rodadas), notas: "" });
    return { ok: true, id: id };
  }
  function removerCondicao(t20, id) { var antes = t20.condicoes.length; t20.condicoes = t20.condicoes.filter(function (c) { return c.id !== id; }); return antes !== t20.condicoes.length; }

  /* =================================================================
     DANO, CURA, MORTE
     ================================================================= */
  /* Ordem (p. 226): resistência → reduções (metade) → RD. Temporários
     primeiro; não letal conta para inconsciência, não para morte. */
  function aplicarDano(t20, valor, tipo, opcoes) {
    var op = obj(opcoes);
    var calc = op.calc || calcular(t20);
    var v = Math.max(0, inteiro(valor));
    var notas = [];
    if (tipo && calc.imunidades[tipo]) return { ok: true, dano: 0, notas: ["imune a " + tipo] };
    if (op.metade) { v = Math.floor(v / 2); notas.push("metade"); }
    if (op.dadosImpacto && tipo && calc.vulnerabilidades[tipo]) { v += calc.vulnerabilidades[tipo] * op.dadosImpacto; notas.push("+" + calc.vulnerabilidades[tipo] * op.dadosImpacto + " por dado"); }
    if (!op.perdaDeVida) {
      var rdv = (calc.rd.geral || 0) + (tipo ? (calc.rd[tipo] || 0) : 0);
      if (rdv) { v = Math.max(0, v - rdv); notas.push("RD " + rdv); }
    }
    if (op.vulneravel) { v = Math.floor(v * 1.5); notas.push("vulnerável"); }
    var rec = t20.recursos;
    var atual = calc.pv.atual;
    var absorvido = 0;
    if (rec.pvTemp > 0) { absorvido = Math.min(rec.pvTemp, v); rec.pvTemp -= absorvido; }
    var resto = v - absorvido;
    if (op.naoLetal) rec.naoLetal = (rec.naoLetal || 0) + resto;
    else atual -= resto;
    rec.pv = atual; rec.pvRef = calc.pv.max;
    var efetivo = atual - (rec.naoLetal || 0);
    var estado = "ok";
    if (atual <= calc.pv.limiteMorte) estado = "morto";
    else if (atual <= 0) { estado = "sangrando"; rec.sangrando = true; rec.estavel = false; }
    else if (efetivo <= 0) estado = "inconsciente";
    return { ok: true, dano: v, absorvido: absorvido, pv: atual, estado: estado, notas: notas };
  }
  function curar(t20, valor, opcoes) {
    var op = obj(opcoes);
    var calc = op.calc || calcular(t20);
    var rec = t20.recursos;
    var v = Math.max(0, inteiro(valor));
    var antes = calc.pv.atual;
    var nl = rec.naoLetal || 0;
    var curaNl = Math.min(nl, v);
    rec.naoLetal = nl - curaNl;
    var resto = v - curaNl;
    var depois = Math.min(calc.pv.max, antes + resto);
    rec.pv = depois; rec.pvRef = calc.pv.max;
    if (depois > 0) { rec.sangrando = false; rec.estavel = true; t20.condicoes = t20.condicoes.filter(function (c) { return c.id !== "inconsciente" && c.id !== "sangrando"; }); }
    else if (v > 0) { rec.sangrando = false; rec.estavel = true; }
    return { ok: true, curado: depois - antes + curaNl, pv: depois };
  }
  /* Sangrando (p. 236): Constituição CD 15 no início do turno. */
  function testeDeSangramento(t20, rolar, opcoes) {
    var calc = obj(opcoes).calc || calcular(t20);
    var d20 = rolar("1d20");
    var totalT = d20 + calc.atr.con;
    var rec = t20.recursos;
    if (d20 === 20 || (d20 !== 1 && totalT >= 15)) { rec.estavel = true; rec.sangrando = false; return { ok: true, estabilizou: true, rolagem: d20, total: totalT }; }
    var perda = rolar("1d6");
    var r = aplicarDano(t20, perda, null, { perdaDeVida: true, calc: calc });
    return { ok: true, estabilizou: false, rolagem: d20, total: totalT, perda: perda, estado: r.estado, pv: r.pv };
  }

  /* =================================================================
     USAR HABILIDADE: custo, limite de PM, alquebrado, efeito ativo
     ================================================================= */
  function custoFinal(base, calc, opcoes) {
    var op = obj(opcoes);
    var c = Math.max(0, inteiro(base));
    if (calc && calc.tem["cond:alquebrado"]) c += 1;
    if (op.desconto) c -= op.desconto;
    return op.minimoZero ? Math.max(0, c) : (base > 0 ? Math.max(1, c) : Math.max(0, c));
  }
  /* Limite de PM por uso (p. 224): nível na classe da habilidade; para
     raça, origem e poderes gerais, nível de personagem. */
  function limiteDePM(calc, fonteObj) {
    if (fonteObj && fonteObj.classe && calc.niveisClasse[fonteObj.classe]) return calc.niveisClasse[fonteObj.classe];
    return calc.nivel;
  }
  function gastarPM(t20, custo, calc) {
    var c = calc || calcular(t20);
    var rec = t20.recursos;
    var atual = c.pm.atual;
    if (custo > atual + rec.pmTemp) return { ok: false, motivo: "pm_insuficiente", disponivel: atual + rec.pmTemp };
    var doTemp = Math.min(rec.pmTemp, custo);
    rec.pmTemp -= doTemp;
    rec.pm = atual - (custo - doTemp); rec.pmRef = c.pm.max;
    return { ok: true, gasto: custo, pm: rec.pm, pmTemp: rec.pmTemp };
  }

  /* ativar(t20, fonteId, { x, escolha }) — a ação de uma habilidade. */
  function definicaoDeAcao(calc, fonteId) {
    var f = calc.fontes.filter(function (z) { return z.id === fonteId; })[0];
    if (!f) return null;
    var acao = f.def.acao || f.acaoCaminho || f.def.reacao || null;
    return acao ? { fonte: f, acao: acao, reacao: !!f.def.reacao && !f.def.acao } : null;
  }
  function ativar(t20, fonteId, opcoes) {
    var op = obj(opcoes);
    var calc = calcular(t20);
    var d = definicaoDeAcao(calc, fonteId);
    if (!d) return { ok: false, motivo: "sem_acao" };
    var a = d.acao;
    var x = Math.max(0, inteiro(op.x));
    var nc = d.fonte.classe ? calc.niveisClasse[d.fonte.classe] : calc.nivel;
    var ctx = function (nome) {
      if (nome === "nc") return nc; if (nome === "nivel") return calc.nivel; if (nome === "x") return x;
      if (nome.indexOf("atr.") === 0) return calc.atr[nome.slice(4)] || 0;
      if (nome.indexOf("tem.") === 0) return calc.tem[nome.slice(4)] ? 1 : 0;
      if (nome === "limitePM") return limiteDePM(calc, d.fonte); if (nome === "pto") return Math.max(0, calc.poderesTormenta - 1);
      return 0;
    };
    var maxX = a.escala ? Math.max(0, Math.floor(X().numero(a.escala.max, ctx))) : 0;
    if (x > maxX) return { ok: false, motivo: "escala", max: maxX };
    var custo = (a.custo || 0) + (a.escala ? x * (a.escala.pm || 1) : 0) + inteiro(op.extensao);
    if (custo > limiteDePM(calc, d.fonte) && custo > (a.custo || 0)) return { ok: false, motivo: "limite_pm", limite: limiteDePM(calc, d.fonte) };
    custo = custoFinal(custo, calc, { desconto: op.desconto });
    if (a.limite === "cena" && t20.usos["cena:" + fonteId]) return { ok: false, motivo: "uma_vez_por_cena" };
    if (op.semGastar !== true) {
      var g = gastarPM(t20, custo, calc);
      if (!g.ok) return g;
    }
    if (a.limite === "cena") t20.usos["cena:" + fonteId] = 1;
    var resultado = { ok: true, custo: custo, x: x, nome: d.fonte.nome };
    /* efeitos que duram: viram um efeito ativo com o x resolvido */
    if (a.efeitos && a.efeitos.length && a.duracao && a.duracao !== "instantanea") {
      var efs = a.efeitos.map(function (e) {
        var c2 = clone(e);
        if (typeof c2.valor === "string" && /\bx\b|nc|nivel|atr\./.test(c2.valor) && !/\bd\d/.test(c2.valor)) { var vv = X().avaliar(c2.valor, ctx); c2.valor = typeof vv === "number" ? vv : c2.valor; }
        return c2;
      });
      if (a.postura) t20.ativos = t20.ativos.filter(function (z) { var zf = calc.fontes.filter(function (q) { return q.id === z.fonte; })[0]; return !(zf && zf.def && (zf.def.postura || (zf.def.acao && zf.def.acao.postura))); });
      if (a.estado) t20.ativos = t20.ativos.filter(function (z) { return z.estado !== a.estado; });
      var ativo = { id: novoId(), fonte: fonteId, nome: d.fonte.nome + (x ? " (+" + x + ")" : ""), x: x, duracao: a.duracao, sustentada: !!a.sustentada, estado: a.estado || "", efeitos: efs, categoria: "habilidade", alvo: texto(op.alvo, 120), contador: 0 };
      t20.ativos.push(ativo);
      resultado.ativo = ativo;
      /* gatilhos: Alma de Bronze ao entrar em fúria */
      calc.fontes.forEach(function (fz) {
        var gt = fz.def && fz.def.gatilho;
        if (gt && gt.estado && gt.estado === a.estado && gt.pvTemp) { var ganho = Math.max(0, Math.floor(X().numero(gt.pvTemp, ctx))); t20.recursos.pvTemp = Math.max(t20.recursos.pvTemp, ganho); resultado.pvTemp = ganho; }
      });
    }
    if (a.cura || a.curaOuDano) resultado.rolar = X().rolavel(a.cura || a.curaOuDano, ctx);
    if (a.dano && a.dano.dados) resultado.rolarDano = { dados: X().rolavel(a.dano.dados, ctx), tipo: a.dano.tipo };
    if (a.danoContraAlvo) resultado.danoContraAlvo = a.danoContraAlvo[Math.min(a.danoContraAlvo.length - 1, x)];
    if (a.resistencia) resultado.cd = 10 + Math.floor(calc.nivel / 2) + (a.resistencia.atributo === "chave" ? (calc.magias.atributoChave ? calc.atr[calc.magias.atributoChave] : 0) : (calc.atr[a.resistencia.atributo] || 0));
    if (a.condicao) resultado.condicao = a.condicao;
    if (a.texto) resultado.texto = a.texto;
    return resultado;
  }
  function encerrarAtivo(t20, ativoId) { var n = t20.ativos.length; t20.ativos = t20.ativos.filter(function (a) { return a.id !== ativoId; }); return n !== t20.ativos.length; }

  /* Início do turno: cobra sustentadas (1 PM cada; sem PM, termina). */
  function inicioDoTurno(t20) {
    var calc = calcular(t20);
    var encerradas = [], cobradas = [];
    t20.ativos.slice().forEach(function (a) {
      if (!a.sustentada) return;
      var g = gastarPM(t20, 1, calc);
      if (g.ok) cobradas.push(a.nome); else { encerrarAtivo(t20, a.id); encerradas.push(a.nome); }
    });
    t20.ativos = t20.ativos.filter(function (a) { return a.duracao !== "ate o proximo turno" && a.duracao !== "rodada" && a.duracao !== "turno"; });
    return { cobradas: cobradas, encerradas: encerradas };
  }
  /* Fim de cena: efeitos de cena e condições de cena terminam; PV/PM
     temporários de cena somem; usos por cena zeram. */
  function fimDeCena(t20) {
    var antes = t20.ativos.length;
    t20.ativos = t20.ativos.filter(function (a) { return a.duracao && ["cena", "rodada", "turno", "ate o proximo turno", "ate o fim do proximo turno"].indexOf(a.duracao) < 0 && !a.sustentada; });
    var condAntes = t20.condicoes.length;
    t20.condicoes = t20.condicoes.filter(function (c) { return c.duracao && c.duracao !== "cena" && c.duracao !== "rodada"; });
    Object.keys(t20.usos).forEach(function (k) { if (k.indexOf("cena:") === 0) delete t20.usos[k]; });
    return { efeitos: antes - t20.ativos.length, condicoes: condAntes - t20.condicoes.length };
  }

  /* =================================================================
     DESCANSO (p. 106): PV e PM pelo nível × condição; temporários somem
     ================================================================= */
  function descansar(t20, condicao, opcoes) {
    var op = obj(opcoes);
    var calc = calcular(t20);
    var cond = D().DESCANSO.filter(function (d) { return d.chave === condicao; })[0] || D().DESCANSO[1];
    var idx = D().DESCANSO.indexOf(cond);
    var melhor = 0, fixo = false;
    calc.fontes.forEach(function (f) { lista(f.def && f.def.efeitos).forEach(function (e) { if (e.t === "descansoMelhor") melhor += e.valor || 1; if (e.t === "descansoFixo") fixo = true; if (e.t === "descansoRelento" && condicao === "ruim") { var alvo = D().DESCANSO.filter(function (d) { return d.chave === e.valor; })[0]; if (alvo) idx = Math.max(idx, D().DESCANSO.indexOf(alvo)); } }); });
    if (fixo) idx = 1;
    else idx = Math.min(D().DESCANSO.length - 1, idx + melhor);
    cond = D().DESCANSO[idx];
    var base = Math.floor(calc.nivel * cond.fator);
    var minimo = 0;
    calc.fontes.forEach(function (f) { lista(f.def && f.def.efeitos).forEach(function (e) { if (e.t === "recuperacaoMinima") minimo = Math.max(minimo, calc.nivel); }); });
    var pv = Math.max(base, minimo) + inteiro(op.extraPV), pm = Math.max(base, minimo) + inteiro(op.extraPM);
    var rec = t20.recursos;
    rec.pvTemp = 0; rec.pmTemp = 0;
    var antesPV = calc.pv.atual;
    var antesPM = calc.pm.atual;
    var nl = rec.naoLetal || 0;
    rec.naoLetal = Math.max(0, nl - pv);
    rec.pv = Math.min(calc.pv.max, antesPV + Math.max(0, pv - nl));
    rec.pm = Math.min(calc.pm.max, antesPM + pm);
    rec.pvRef = calc.pv.max; rec.pmRef = calc.pm.max;
    if (rec.pv > 0) { rec.sangrando = false; rec.estavel = true; t20.condicoes = t20.condicoes.filter(function (c) { return c.id !== "inconsciente"; }); }
    t20.ativos = t20.ativos.filter(function (a) { return a.duracao === "permanente" || a.duracao === "aventura"; });
    Object.keys(t20.usos).forEach(function (k) { if (k.indexOf("dia:") === 0 || k.indexOf("cena:") === 0) delete t20.usos[k]; });
    t20.engenhocas.forEach(function (g) { g.ativacoesHoje = 0; });
    return { ok: true, condicao: cond.chave, pv: rec.pv - antesPV, pm: rec.pm - antesPM, recuperacao: Math.max(base, minimo) };
  }

  /* =================================================================
     TESTES: 1d20 + modificador; 20 natural sucesso, 1 natural falha
     ================================================================= */
  function teste(rolar, modificador, cd, opcoes) {
    var op = obj(opcoes);
    var d = rolar("1d20");
    var d2 = op.vantagem ? rolar("1d20") : null;
    var usado = d2 !== null ? Math.max(d, d2) : d;
    var total = usado + inteiro(modificador) + inteiro(op.bonus);
    var natural = usado;
    var r = { d20: usado, rolagens: d2 !== null ? [d, d2] : [d], modificador: inteiro(modificador) + inteiro(op.bonus), total: total, natural20: natural === 20, natural1: natural === 1 };
    if (cd !== undefined && cd !== null) {
      r.cd = cd;
      r.sucesso = natural === 20 ? true : natural === 1 ? false : total >= cd;
      if (op.sucessoNatural && natural >= op.sucessoNatural) r.sucesso = true;
      r.margem = total - cd;
    }
    return r;
  }
  /* Teste oposto (p. 221 e 234): maior resultado vence; empate, maior
     bônus; bônus iguais, rola de novo. */
  function testeOposto(rolar, modA, modB) {
    var a = inteiro(modA), b = inteiro(modB), rodadas = [];
    for (var i = 0; i < 20; i++) {
      var da = rolar("1d20"), db = rolar("1d20");
      var ta = da + a, tb = db + b;
      rodadas.push({ dA: da, dB: db, totalA: ta, totalB: tb });
      if (ta !== tb) return { vencedor: ta > tb ? "a" : "b", totalA: ta, totalB: tb, dA: da, dB: db, margem: Math.abs(ta - tb), rodadas: rodadas };
      if (a !== b) return { vencedor: a > b ? "a" : "b", totalA: ta, totalB: tb, dA: da, dB: db, margem: 0, desempate: "bônus", rodadas: rodadas };
    }
    return { vencedor: "b", totalA: 0, totalB: 0, margem: 0, rodadas: rodadas };
  }
  /* Manobra de combate (p. 234): o atacante vence e a consequência que
     já dá para determinar sai pronta (condição, metros, item no chão);
     o que depende do mapa fica descrito para a mesa. */
  function resolverManobra(rolar, manobraId, modAtacante, modDefensor) {
    var mb = D().MANOBRAS.filter(function (m) { return m.id === manobraId; })[0];
    if (!mb) return { ok: false, motivo: "Manobra desconhecida." };
    var o = testeOposto(rolar, modAtacante, modDefensor);
    var r = { ok: true, manobra: mb.id, nome: mb.nome, venceu: o.vencedor === "a", oposto: o, margem: o.margem, condicao: null, consequencia: "" };
    if (!r.venceu) { r.consequencia = mb.id === "agarrar" ? "Não agarrou." : "A manobra falhou."; return r; }
    if (mb.id === "agarrar") { r.condicao = "agarrado"; r.consequencia = "Alvo agarrado (desprevenido, imóvel, –2 em ataques, só armas leves). Você fica com a mão ocupada e anda à metade."; }
    else if (mb.id === "derrubar") { r.condicao = "caido"; r.consequencia = "Alvo caído" + (o.margem >= 5 ? " e empurrado 1,5 m (perto de beirada: Reflexos CD 20 para se agarrar)." : "."); r.empurraoMetros = o.margem >= 5 ? 1.5 : 0; }
    else if (mb.id === "desarmar") { r.consequencia = "O item empunhado cai" + (o.margem >= 5 ? " e é empurrado 1,5 m." : " no espaço do alvo."); r.desarma = true; }
    else if (mb.id === "empurrar") { r.empurraoMetros = 1.5 * (1 + Math.floor(o.margem / 5)); r.consequencia = "Alvo empurrado " + String(r.empurraoMetros).replace(".", ",") + " m (ação de movimento para acompanhar)."; }
    else if (mb.id === "quebrar") { r.consequencia = "Acertou o item empunhado: role o dano contra a RD e os PV do objeto (p. 235)."; r.quebrar = true; }
    return r;
  }
  /* Ataque: compara com a Defesa ANTES do crítico; crítico multiplica só
     os dados da arma (com passos); fixos e dados extras não (p. 231). */
  function rolarAtaque(rolar, ataque, defesa, opcoes) {
    var op = obj(opcoes);
    var t = teste(rolar, ataque.ataque + inteiro(op.bonusAtaque), defesa, op);
    var acertou = t.sucesso;
    var critico = acertou && t.d20 >= ataque.margem && !op.imuneCritico;
    var r = { teste: t, acertou: acertou, critico: critico };
    if (!acertou || ataque.enreda) return r;
    var vezes = critico ? ataque.mult : 1;
    var m = /^(\d+)d(\d+)$/.exec(String(ataque.dano));
    var danoArma = 0, dadosArma = [];
    if (m) { for (var i = 0; i < Number(m[1]) * vezes; i++) { var v = rolar("1d" + m[2]); dadosArma.push(v); danoArma += v; } }
    else danoArma = (Number(ataque.dano) || 0) * vezes;
    var extrasRol = (ataque.extras || []).concat(lista(op.extras)).map(function (e) { var ex = rolarExpressao(rolar, e.dados); return { rotulo: e.rotulo, tipo: e.tipo, total: ex.total, detalhe: ex.detalhe }; });
    var fixo = ataque.danoFixo + inteiro(op.bonusDano);
    var totalDano = Math.max(1, danoArma + fixo + extrasRol.reduce(function (s, e) { return s + e.total; }, 0));
    r.dano = { arma: danoArma, dadosArma: dadosArma, multiplicador: vezes, fixo: fixo, extras: extrasRol, total: totalDano, tipo: ataque.tipo };
    return r;
  }
  /* "2d6+1d8+3" → total, sem eval. */
  function rolarExpressao(rolar, expr) {
    var s = String(expr || "0").replace(/\s+/g, "").replace(/−/g, "-");
    var total = 0, detalhe = [];
    var re = /([+-]?)(\d*)d(\d+)|([+-]?)(\d+)/g, m;
    while ((m = re.exec(s))) {
      if (m[3]) {
        var n = m[2] === "" ? 1 : Number(m[2]), f = Number(m[3]), sinal = m[1] === "-" ? -1 : 1, soma = 0, faces = [];
        for (var i = 0; i < n && i < 200; i++) { var v = rolar("1d" + f); faces.push(v); soma += v; }
        total += sinal * soma; detalhe.push((sinal < 0 ? "-" : "") + n + "d" + f + "[" + faces.join(",") + "]");
      } else if (m[5]) { var k = (m[4] === "-" ? -1 : 1) * Number(m[5]); total += k; detalhe.push(String(k)); }
    }
    return { total: total, detalhe: detalhe.join(" ") };
  }

  /* =================================================================
     REQUISITOS DE PODERES
     ================================================================= */
  function cumpreRequisitos(t20, def, classeId, calc) {
    var req = obj(def && def.req);
    var c = calc || calcular(t20);
    var falta = [];
    if (req.nivel && c.nivel < req.nivel) falta.push(req.nivel + "º nível");
    if (req.nc && (c.niveisClasse[classeId] || 0) < req.nc) falta.push(req.nc + "º nível de " + (CL().CLASSE[classeId] ? CL().CLASSE[classeId].nome : classeId));
    Object.keys(obj(req.atr)).forEach(function (a) { if (c.atr[a] < req.atr[a]) falta.push(nomeAtr(a) + " " + req.atr[a]); });
    lista(req.poderes).forEach(function (p) { if (!c.tem[p]) falta.push(nomeDoPoder(p, classeId)); });
    if (req.poderesUm && !req.poderesUm.some(function (p) { return c.tem[p]; })) falta.push(req.poderesUm.map(function (p) { return nomeDoPoder(p, classeId); }).join(" ou "));
    lista(req.pericias).forEach(function (p) { var k = p; if (!(c.pericias[k] && c.pericias[k].treinado)) falta.push("treinado em " + nomePericia(k)); });
    if (req.periciasUm && !req.periciasUm.some(function (p) { return c.pericias[p] && c.pericias[p].treinado; })) falta.push("treinado em " + req.periciasUm.map(nomePericia).join(" ou "));
    lista(req.prof).forEach(function (q) { if (!c.proficiencias[q]) falta.push("proficiência: " + q); });
    if (req.caminho) { var cam = valorDeEscolhaDaClasse(t20, "arcanista", "caminho") || valorDeEscolhaDaClasse(t20, "cavaleiro", "caminho"); var cams = Array.isArray(req.caminho) ? req.caminho : [req.caminho]; if (cams.indexOf(cam) < 0) falta.push("caminho: " + cams.join(" ou ")); }
    if (req.devoto) { var dv = t20.divindade && t20.divindade.id; if (req.devoto.indexOf(dv) < 0) falta.push("devoto de " + req.devoto.map(function (x) { return DE().DEUS[x] ? DE().DEUS[x].nome : x; }).join(" ou ")); }
    if (req.tormenta && Math.max(0, c.poderesTormenta) < req.tormenta) falta.push(req.tormenta + " outro(s) poder(es) da Tormenta");
    if (req.lancaMagias && !c.magias.circuloMax && !(c.magias.concedidas || []).length) falta.push("lançar magias");
    if (req.circulo && c.magias.circuloMax < req.circulo) falta.push("magias de " + req.circulo + "º círculo");
    if (req.habilidadeMagias && !c.magias.circuloMax) falta.push("habilidade de classe Magias");
    if (req.magias) lista(req.magias).forEach(function (m) { if (c.magias.conhecidas.indexOf(m) < 0) falta.push("magia " + m); });
    if (req.classe && !c.niveisClasse[req.classe]) falta.push(CL().CLASSE[req.classe] ? CL().CLASSE[req.classe].nome : req.classe);
    if (req.semPoder && c.tem[req.semPoder]) falta.push("não ter " + nomeDoPoder(req.semPoder));
    if (req.poderesDoTipo && !c.fontes.some(function (f) { return f.def && f.def[req.poderesDoTipo]; })) falta.push("um poder de " + req.poderesDoTipo);
    if (req.mesa) falta.push("(mesa) " + req.mesa);
    var jaTem = c.fontes.some(function (f) { return f.poderId === def.id || f.def.id === def.id; });
    if (jaTem && !def.repetivel) falta.push("já possui (não repetível)");
    return { ok: !falta.filter(function (x) { return x.indexOf("(mesa)") !== 0; }).length, falta: falta };
  }
  function nomeDoPoder(id, classeId) { var d = poderPorId(id, classeId); if (!d && CL()) CL().CLASSES.some(function (c) { d = poderDeClasse(c, id); return !!d; }); return d ? d.nome : id; }
  function nomePericia(k) { if (k.indexOf("oficio:") === 0) return "Ofício (" + k.slice(7) + ")"; var p = D().PERICIA[k]; return p ? p.nome : k; }

  /* =================================================================
     RESUMO PARA A MESA
     ================================================================= */
  function resumoParaMesa(bruto) {
    var t20 = normalizar(bruto);
    var c;
    try { c = calcular(t20); } catch (e) { return { erro: true }; }
    var r = RA() && RA().RACA[t20.raca.id];
    return {
      raca: r ? r.nome + (t20.raca.variante ? " (" + t20.raca.variante + ")" : "") : "",
      origem: t20.origem.propria ? t20.origem.propria.nome : (OR() && OR().ORIGEM[t20.origem.id] ? OR().ORIGEM[t20.origem.id].nome : ""),
      divindade: t20.divindade && DE() && DE().DEUS[t20.divindade.id] ? DE().DEUS[t20.divindade.id].nome : "",
      classes: c.niveisClasse ? Object.keys(c.niveisClasse).map(function (k) { return (CL().CLASSE[k] ? CL().CLASSE[k].nome : k) + " " + c.niveisClasse[k]; }).join(" / ") : "",
      nivel: c.nivel, patamar: c.patamar.nome,
      pv: { atual: c.pv.atual, max: c.pv.max, temp: c.pv.temp }, pm: { atual: c.pm.atual, max: c.pm.max, temp: c.pm.temp },
      defesa: c.defesa.total, deslocamento: c.deslocamento.terrestre,
      condicoes: c.condicoes.map(function (x) { return x.id; }),
      iniciativa: c.pericias.iniciativa ? c.pericias.iniciativa.total : 0,
      percepcao: c.pericias.percepcao ? c.pericias.percepcao.total : 0,
      resistencias: { fortitude: c.pericias.fortitude.total, reflexos: c.pericias.reflexos.total, vontade: c.pericias.vontade.total },
      sangrando: !!t20.recursos.sangrando,
    };
  }

  /* XP e subir de nível */
  function adicionarXp(t20, valor) { t20.xp = Math.max(0, inteiro(t20.xp) + inteiro(valor)); return { xp: t20.xp, nivelPelaXp: D().nivelDoXp(t20.xp) }; }


  /* =================================================================
     MAGIAS: fontes, lançamento e sustentação (p. 170–173, 224)
     ================================================================= */
  /* Contexto de lançamento de uma magia conhecida: círculo e limite de
     PM pela fonte (classe: nível nessa classe; outras: nível de
     personagem), atributo da CD e descontos (não cumulativos, salvo os
     que dizem acumular). */
  function contextoDeMagia(t20, calc, entrada) {
    var mg = MG() && MG().MAGIA[entrada.id];
    var fs = calc.magias.fontes[entrada.fonte];
    var conc = (calc.magias.concedidas || []).filter(function (x) { return x.id === entrada.id; })[0];
    var atributo = entrada.atributo || (fs ? fs.atributo : (conc ? conc.atributo : calc.magias.atributoChave)) || "int";
    var ctx = {
      circuloMax: fs ? fs.circuloMax : 0,
      deClasse: !!fs,
      limitePM: fs ? fs.limitePM : calc.nivel,
      tipoFonte: fs ? fs.tipo : (mg ? mg.tipo : ""),
      alquebrado: !!calc.tem["cond:alquebrado"],
      atr: calc.atr, nivel: calc.nivel,
    };
    var bonusCD = 0, descontos = [], descontoCumulativo = 0;
    calc.fontes.forEach(function (f) {
      lista(f.def && f.def.efeitos).concat(lista(f.ativo && f.ativo.efeitos)).forEach(function (e) {
        if (e.t === "cdMagia" && (!e.escola || (mg && e.escola === mg.escola))) bonusCD += Number(e.valor) || 0;
        if (e.t === "descontoMagia" && (!e.escola || (mg && e.escola === mg.escola)) && (!e.magia || e.magia === entrada.id)) {
          if (e.cumulativo) descontoCumulativo += Number(e.valor) || 0; else descontos.push(Number(e.valor) || 0);
        }
      });
    });
    if (conc && conc.desconto) descontos.push(conc.desconto);
    ctx.desconto = (descontos.length ? Math.max.apply(null, descontos) : 0) + descontoCumulativo;
    ctx.cd = 10 + Math.floor(calc.nivel / 2) + (calc.atr[atributo] || 0) + bonusCD;
    ctx.atributo = atributo;
    return ctx;
  }

  function magiasConhecidas(t20, calc) {
    var c = calc || calcular(t20);
    var out = lista(t20.magias).map(function (m) { return Object.assign({ concedida: false }, m); });
    (c.magias.concedidas || []).forEach(function (m) {
      if (!out.some(function (x) { return x.id === m.id; })) out.push({ id: m.id, fonte: "concedida:" + m.fonte, atributo: m.atributo, concedida: true });
    });
    return out.filter(function (m) { return MG() && MG().MAGIA[m.id]; });
  }

  /* Prévia do lançamento (não muda a ficha). */
  function prepararMagia(t20, magiaId, escolhas, opcoes) {
    var op = obj(opcoes);
    var calc = op.calc || calcular(t20);
    var entrada = magiasConhecidas(t20, calc).filter(function (m) { return m.id === magiaId && (!op.fonte || m.fonte === op.fonte); })[0];
    if (!entrada) return { ok: false, erros: ["Magia não conhecida."] };
    var mg = MG().MAGIA[magiaId];
    var ctx = contextoDeMagia(t20, calc, entrada);
    var r = MG().preparar(mg, escolhas, ctx);
    r.fonte = entrada.fonte; r.atributo = ctx.atributo; r.cd = ctx.cd; r.limitePM = ctx.limitePM;
    var caminho = valorDeEscolhaDaClasse(t20, "arcanista", "caminho");
    if (entrada.fonte === "classe:arcanista" && caminho === "mago" && !entrada.memorizada) r.erros.push("O mago só lança magias memorizadas.");
    if (calc.fontes.some(function (f) { return f.ativo && lista(f.ativo.efeitos).some(function (e) { return e.t === "semMagias"; }); })) r.erros.push("Um efeito ativo impede lançar magias.");
    var pmDisp = calc.pm.atual + calc.pm.temp;
    if (r.custo > pmDisp) r.erros.push("PM insuficientes (" + pmDisp + " disponíveis, custo " + r.custo + ").");
    aplicarMetamagias(r, calc, mg, obj(escolhas), ctx);
    var armadura = calc.equipamento.armadura;
    var arcana = mg.tipo === "arcana" || (mg.tipo === "universal" && ctx.tipoFonte !== "divina");
    r.testes = MG().testesParaLancar(r, { armaduraArcana: arcana && !!armadura && !calc.tem.armaduraArcanaSemTeste && !r.discreta, condicao: op.condicao, dano: op.dano });
    r.ok = !r.erros.length;
    return r;
  }

  /* Poderes de magia que viram aprimoramento de qualquer magia (p. 131):
     Magia Acelerada (+4 PM, execução livre), Magia Ampliada (+2 PM,
     alcance +1 passo ou área dobrada), Magia Discreta (+2 PM, sem gestos
     nem palavras: arcana de armadura sem Misticismo). O custo entra no
     limite de PM como qualquer aprimoramento. */
  var PASSOS_ALCANCE = ["toque", "curto", "medio", "longo"];
  function metamagiasDisponiveis(calc) {
    var out = [];
    calc.fontes.forEach(function (f) {
      var d = f.def || {};
      if (d.aprimoramento && !out.some(function (x) { return x.id === d.id; })) out.push(Object.assign({ id: d.id, nome: d.nome }, d.aprimoramento));
    });
    return out;
  }
  function aplicarMetamagias(r, calc, mg, escolhas, ctx) {
    var disp = metamagiasDisponiveis(calc);
    r.metamagias = disp;
    var marcadas = lista(escolhas.metamagias).map(String).filter(function (id) { return disp.some(function (x) { return x.id === id; }); });
    if (!marcadas.length) return;
    var antes = r.custo;
    marcadas.forEach(function (id) {
      var x = disp.filter(function (y) { return y.id === id; })[0];
      r.custo += inteiro(x.custo);
      r.textos = lista(r.textos).concat([x.nome + " (+" + x.custo + " PM)"]);
      if (x.execucao) {
        if (lista(x.de).indexOf(r.ex) >= 0) r.ex = x.execucao;
        else r.erros.push(x.nome + ": só para magias de execução " + lista(x.de).map(function (e) { return MG().nomeExecucao(e); }).join(", ") + ".");
      }
      if (x.alcanceOuArea) {
        var querArea = escolhas.ampliada === "area";
        if (querArea && (r.area || mg.base.area)) { r.area = "dobrada: " + (r.area || mg.base.area); r.alvosTexto = r.area; }
        else {
          var i = PASSOS_ALCANCE.indexOf(String(r.al));
          if (i >= 0 && i < PASSOS_ALCANCE.length - 1) r.al = PASSOS_ALCANCE[i + 1];
          else r.erros.push(x.nome + ": o alcance desta magia não aumenta; escolha a área.");
        }
      }
      if (x.discreta) r.discreta = true;
    });
    if (r.custo > antes && r.custo > ctx.limitePM) r.erros.push("Custo " + r.custo + " passa do limite de PM (" + ctx.limitePM + ").");
    var pmDisp = calc.pm.atual + calc.pm.temp;
    if (r.custo > pmDisp && antes <= pmDisp) r.erros.push("PM insuficientes (" + pmDisp + " disponíveis, custo " + r.custo + ").");
  }

  function encerrarSustentadasExcedentes(t20, calc, resultado) {
    var limite = calc.tem.fluxoDeMana ? 2 : 1;
    var sust = t20.ativos.filter(function (a) { return a.sustentada && a.magia; });
    while (sust.length >= limite) { var velha = sust.shift(); encerrarAtivo(t20, velha.id); resultado.encerradas.push(velha.nome); }
  }

  /* Lança: valida, cobra PM (temporários primeiro), aplica sacrifícios
     e cria o efeito ativo quando a magia é pessoal (ou numa arma sua).
     Uma única magia sustentada por vez (p. 224; Fluxo de Mana: duas). */
  function lancarMagia(t20, magiaId, escolhas, opcoes) {
    var op = obj(opcoes);
    var calc = calcular(t20);
    var r = prepararMagia(t20, magiaId, escolhas, Object.assign({}, op, { calc: calc }));
    if (!r.ok && !op.forcar) return r;
    var g = gastarPM(t20, r.custo, calc);
    if (!g.ok) return { ok: false, erros: ["PM insuficientes."], preparo: r };
    var mg = MG().MAGIA[magiaId];
    var sacr = 0;
    lista(r.aplicados).forEach(function (a) { var mud = mg.aprimoramentos[a.indice].mud; if (mud.sacrificioPM) sacr += mud.sacrificioPM; });
    if (typeof mg.mec.sacrificioPM === "number") sacr += mg.mec.sacrificioPM;
    else if (mg.mec.sacrificioPM && r.opcao && mg.mec.sacrificioPM[r.opcao]) sacr += mg.mec.sacrificioPM[r.opcao];
    if (sacr) t20.usos.sacrificioPM = inteiro(t20.usos.sacrificioPM) + sacr;
    var resultado = { ok: true, preparo: r, custo: r.custo, encerradas: [], sacrificio: sacr };
    var pessoal = r.al === "pessoal" || /^você/.test(String(r.alvo || "")) || !!op.emMim;
    var efeitos = lista(r.efeitos).map(function (e) {
      var c2 = clone(e);
      if (c2.alvo === "atr.opcao") c2.alvo = "atr." + r.opcao;
      if (Array.isArray(c2.tipos)) c2.tipos = c2.tipos.map(function (t) { return t === "opcao" ? r.opcao : t; });
      return c2;
    });
    var penal = 0;
    lista(r.aplicados).forEach(function (a) { var mud = mg.aprimoramentos[a.indice].mud; if (mud.penalidadePM) penal = Math.max(penal, mud.penalidadePM); });
    if (mg.mec.penalidadePM && !penal) penal = mg.mec.penalidadePM;
    if (penal) efeitos.push({ t: "bonus", alvo: "pm", valor: -penal, cumulativo: 1 });
    var dura = r.du && String(r.du).indexOf("instant") !== 0;
    var naArma = efeitos.some(function (e) { return e.naArma; });
    if (dura && (r.sustentada || (efeitos.length && (pessoal || naArma)))) {
      if (r.sustentada) encerrarSustentadasExcedentes(t20, calc, resultado);
      var ativo = { id: novoId(), fonte: "magia:" + magiaId, nome: mg.nome + (op.alvoTexto ? " → " + texto(op.alvoTexto, 60) : ""), x: 0,
        duracao: r.sustentada ? "sustentada" : normalizarDuracao(r.du), sustentada: !!r.sustentada, estado: "", escolha: r.opcao || null,
        efeitos: (pessoal || naArma) ? efeitos : [], categoria: "magia", alvo: texto(op.alvoItem || "", 120), contador: 0, magia: magiaId };
      t20.ativos.push(ativo);
      resultado.ativo = ativo;
    }
    if (r.pvTemp && pessoal) resultado.rolarPvTemp = r.pvTemp;
    t20.historico.push({ quando: new Date().toISOString(), texto: "Lançou " + mg.nome + " (" + r.custo + " PM)" });
    if (t20.historico.length > 60) t20.historico = t20.historico.slice(-60);
    return resultado;
  }
  function normalizarDuracao(du) {
    var d = String(du || "").toLowerCase();
    if (d.indexOf("cena") === 0) return "cena";
    if (d.indexOf("1 dia") === 0 || d.indexOf("dia") === 0) return "dia";
    if (d.indexOf("permanente") === 0) return "permanente";
    if (d.indexOf("rodada") >= 0 || d.indexOf("turno") >= 0) return "rodada";
    return d.slice(0, 40);
  }
  /* Munição (p. 151): cada disparo gasta uma. O item de munição é um
     pacote (20); `municao` guarda quantas restam no pacote aberto e
     `quantidade`, quantos pacotes. Acabou o último, o item sai. */
  function itemDeMunicao(t20, ataque) {
    if (!ataque || !ataque.municao) return null;
    var itens = lista(t20.inventario && t20.inventario.itens).filter(function (x) { return x.ref === ataque.municao; });
    return itens.filter(function (x) { return x.estado !== "guardado"; })[0] || itens[0] || null;
  }
  function municaoRestante(t20, ataque) {
    var it = itemDeMunicao(t20, ataque);
    if (!it) return 0;
    var porPacote = (itemBase(it) || {}).quantidade || 20;
    var aberto = it.municao === null || it.municao === undefined ? porPacote : it.municao;
    return Math.max(0, (Math.max(1, it.quantidade) - 1) * porPacote + aberto);
  }
  function consumirMunicao(t20, ataque) {
    if (!ataque || !ataque.municao) return { ok: true, usa: false };
    var it = itemDeMunicao(t20, ataque);
    var nome = (EQ() && EQ().ITEM[ataque.municao] ? EQ().ITEM[ataque.municao].nome : ataque.municao);
    if (!it || municaoRestante(t20, ataque) <= 0) return { ok: false, motivo: "Sem munição (" + nome + ")." };
    var porPacote = (itemBase(it) || {}).quantidade || 20;
    var aberto = (it.municao === null || it.municao === undefined ? porPacote : it.municao) - 1;
    if (aberto > 0) it.municao = aberto;
    else if (it.quantidade > 1) { it.quantidade -= 1; it.municao = porPacote; }
    else t20.inventario.itens = t20.inventario.itens.filter(function (x) { return x !== it; });
    return { ok: true, usa: true, restante: municaoRestante(t20, ataque) };
  }

  /* PV temporários: o maior vale (não somam entre fontes). */
  function receberPvTemp(t20, valor) { var v = Math.max(0, inteiro(valor)); t20.recursos.pvTemp = Math.max(inteiro(t20.recursos.pvTemp), v); return t20.recursos.pvTemp; }

  /* =================================================================
     ENGENHOCAS DO INVENTOR (p. 70–71)
     Fabricar: T$ 100 × PM da magia, Ofício (engenhoqueiro) CD 20 + PM,
     uma semana; máximo = Inteligência. Ativar: CD 15 + PM, +5 por
     ativação no mesmo dia, +1 por PM de aprimoramento (até a
     Inteligência); a penalidade de armadura vale; falha enguiça. O
     efeito usa Inteligência, não é mágico, e só um efeito sustentado de
     engenhoca por vez (1 PM no início do turno, como magia).
     ================================================================= */
  function configEngenhocas() { return CL() && CL().CLASSE.inventor ? CL().CLASSE.inventor.engenhocas : null; }
  function circuloDeEngenhoca(calc) {
    var cfg = configEngenhocas(), nc = calc.niveisClasse.inventor || 0, circ = 0;
    if (!cfg) return 0;
    Object.keys(cfg.circulos).forEach(function (n) { if (nc >= Number(n)) circ = cfg.circulos[n]; });
    return circ;
  }
  function limiteDeEngenhocas(calc) { return Math.max(0, calc.atr["int"]) + (calc.tem.manutencaoEficiente ? 3 : 0); }
  function custoDeEngenhoca(magiaId) {
    var cfg = configEngenhocas(), mg = MG() && MG().MAGIA[magiaId];
    if (!cfg || !mg) return null;
    var pm = MG().custoBase(mg.circulo);
    return { pm: pm, tibar: cfg.fabricar.custoPorPM * pm, cd: cfg.fabricar.cdBase + pm, tempo: cfg.fabricar.tempo };
  }
  function fabricarEngenhoca(t20, magiaId, forma, rolar, opcoes) {
    var op = obj(opcoes);
    var c = op.calc || calcular(t20);
    var mg = MG() && MG().MAGIA[magiaId];
    var custo = custoDeEngenhoca(magiaId);
    if (!mg || !custo) return { ok: false, motivo: "Magia desconhecida." };
    if (!c.tem.engenhoqueiro) return { ok: false, motivo: "Precisa do poder Engenhoqueiro." };
    if (mg.tipo !== "arcana" && mg.tipo !== "divina" && mg.tipo !== "universal") return { ok: false, motivo: "A engenhoca simula uma magia arcana ou divina." };
    if (mg.circulo > circuloDeEngenhoca(c)) return { ok: false, motivo: "Círculo acima do permitido (" + circuloDeEngenhoca(c) + "º)." };
    var p = c.pericias["oficio:engenhoqueiro"];
    if (!p || !p.treinado) return { ok: false, motivo: "Precisa de Ofício (engenhoqueiro)." };
    if (t20.engenhocas.length >= limiteDeEngenhocas(c)) return { ok: false, motivo: "Já tem o máximo de engenhocas (" + limiteDeEngenhocas(c) + ")." };
    if (inteiro(t20.inventario.tibar) < custo.tibar) return { ok: false, motivo: "Tibares insuficientes (T$ " + custo.tibar + ")." };
    var t = teste(rolar, p.total, custo.cd);
    var r = { ok: true, sucesso: !!t.sucesso, teste: t, custo: custo, parcelas: p.parcelas };
    if (t.sucesso) {
      t20.inventario.tibar = inteiro(t20.inventario.tibar) - custo.tibar;
      r.engenhoca = { id: novoId(), magia: magiaId, forma: forma === "vestida" ? "vestida" : "empunhada", ativacoesHoje: 0, enguicada: false, nome: texto(op.nome || "", 80) };
      t20.engenhocas.push(r.engenhoca);
    }
    return r;
  }
  /* Prévia da ativação: a magia simulada com os aprimoramentos (até a
     Inteligência em PM), a CD do teste e o que será cobrado. */
  function prepararEngenhoca(t20, engenhocaId, escolhas, opcoes) {
    var op = obj(opcoes);
    var c = op.calc || calcular(t20);
    var cfg = configEngenhocas();
    var g = t20.engenhocas.filter(function (x) { return x.id === engenhocaId; })[0];
    if (!g || !cfg) return { ok: false, erros: ["Engenhoca não encontrada."] };
    var mg = MG() && MG().MAGIA[g.magia];
    if (!mg) return { ok: false, erros: ["Magia desconhecida."] };
    var base = MG().custoBase(mg.circulo);
    var intel = Math.max(0, c.atr["int"]);
    var ctx = { circuloMax: Math.max(mg.circulo, circuloDeEngenhoca(c)), deClasse: true, limitePM: base + intel, desconto: 0, alquebrado: false, cd: 10 + Math.floor(c.nivel / 2) + c.atr["int"], tipoFonte: mg.tipo, atr: c.atr, nivel: c.nivel, atributo: "int" };
    var r = MG().preparar(mg, escolhas || {}, ctx);
    r.aprimPM = Math.max(0, r.custo - base);
    if (r.aprimPM > intel) r.erros.push("Aprimoramentos até " + intel + " PM (Inteligência).");
    r.custoPM = r.aprimPM;
    r.cd = ctx.cd;
    r.cdAtivacao = cfg.ativar.cdBase + base + cfg.ativar.porAtivacaoNoDia * g.ativacoesHoje + cfg.ativar.porPMAprimoramento * r.aprimPM;
    var p = c.pericias["oficio:engenhoqueiro"];
    var pen = c.penalidadeArmadura.total;
    r.modificador = (p ? p.total : 0) + pen;
    r.parcelasTeste = (p ? p.parcelas : []).concat(pen ? [{ rotulo: "Penalidade de armadura (p. 71)", valor: pen }] : []);
    if (g.enguicada) r.erros.push("Enguiçada: uma hora de trabalho para consertar.");
    if (!p || !p.treinado) r.erros.push("Precisa de Ofício (engenhoqueiro).");
    if (c.fontes.some(function (f) { return f.ativo && lista(f.ativo.efeitos).some(function (e) { return e.t === "semMagias"; }); })) r.erros.push("Um efeito que impede lançar magias também impede ativar engenhocas.");
    var pmDisp = c.pm.atual + c.pm.temp;
    if (r.custoPM > pmDisp) r.erros.push("PM insuficientes para os aprimoramentos (" + pmDisp + " disponíveis).");
    r.engenhoca = g;
    r.ok = !r.erros.length;
    return r;
  }
  function ativarEngenhoca(t20, engenhocaId, escolhas, rolar, opcoes) {
    var op = obj(opcoes);
    var c = calcular(t20);
    var r = prepararEngenhoca(t20, engenhocaId, escolhas, { calc: c });
    if (!r.ok) return r;
    var g = r.engenhoca, mg = MG().MAGIA[g.magia];
    if (r.custoPM) { var gs = gastarPM(t20, r.custoPM, c); if (!gs.ok) return { ok: false, erros: ["PM insuficientes."] }; }
    var t = teste(rolar, r.modificador, r.cdAtivacao);
    g.ativacoesHoje++;
    var resultado = { ok: true, sucesso: !!t.sucesso, teste: t, preparo: r, custoPM: r.custoPM, encerradas: [] };
    if (!t.sucesso) { g.enguicada = true; return resultado; }
    var dura = r.du && String(r.du).indexOf("instant") !== 0;
    var pessoal = r.al === "pessoal" || /^você/.test(String(r.alvo || "")) || !!op.emMim;
    if (dura && (r.sustentada || (lista(r.efeitos).length && pessoal))) {
      if (r.sustentada) {
        t20.ativos.filter(function (a) { return a.sustentada && a.engenhoca; }).forEach(function (a) { encerrarAtivo(t20, a.id); resultado.encerradas.push(a.nome); });
      }
      var ativo = { id: novoId(), fonte: "engenhoca:" + g.id, nome: (g.nome || mg.nome) + " (engenhoca)", x: 0, duracao: r.sustentada ? "sustentada" : normalizarDuracao(r.du), sustentada: !!r.sustentada,
        estado: "", escolha: r.opcao || null, efeitos: pessoal ? clone(lista(r.efeitos)) : [], categoria: "item", alvo: "", contador: 0, engenhoca: g.id, naoMagico: true };
      t20.ativos.push(ativo);
      resultado.ativo = ativo;
    }
    t20.historico.push({ quando: new Date().toISOString(), texto: "Ativou a engenhoca " + (g.nome || mg.nome) + (r.custoPM ? " (" + r.custoPM + " PM)" : "") });
    if (t20.historico.length > 60) t20.historico = t20.historico.slice(-60);
    return resultado;
  }
  function consertarEngenhoca(t20, engenhocaId) { var g = t20.engenhocas.filter(function (x) { return x.id === engenhocaId; })[0]; if (!g) return false; g.enguicada = false; return true; }


  /* =================================================================
     OPERAÇÕES IDEMPOTENTES, PROGRESSÃO E CRIAÇÃO
     ================================================================= */
  /* Uma operação vinda da mesa (recompensa, dano, descanso) entra uma vez
     só: o opId fica na ficha; repetir devolve "repetida". */
  function aplicarOperacao(t20, opId, fn) {
    if (!opId) return fn(t20);
    if (lista(t20.operacoes).indexOf(opId) >= 0) return { ok: true, repetida: true };
    var r = fn(t20);
    if (r && r.ok === false) return r;
    t20.operacoes = lista(t20.operacoes).concat([String(opId).slice(0, 80)]).slice(-120);
    return r || { ok: true };
  }
  /* Recompensa: XP, tibares e itens (ids do equipamento ou itens mágicos
     com encantos). */
  function aplicarRecompensa(t20, rec, opId) {
    return aplicarOperacao(t20, opId, function (t) {
      var r = obj(rec);
      var antes = { xp: t.xp, tibar: t.inventario.tibar };
      if (r.xp) t.xp = Math.max(0, inteiro(t.xp) + inteiro(r.xp));
      if (r.tibar) t.inventario.tibar = Math.max(0, Math.round((Number(t.inventario.tibar) + Number(r.tibar)) * 10) / 10);
      lista(r.itens).slice(0, 30).forEach(function (it) { t.inventario.itens.push(normalizarItem(it)); });
      t.historico.push({ quando: new Date().toISOString(), texto: "Recompensa: " + (r.xp ? r.xp + " XP " : "") + (r.tibar ? "T$ " + r.tibar + " " : "") + (lista(r.itens).length ? lista(r.itens).length + " item(ns)" : "") });
      if (t.historico.length > 60) t.historico = t.historico.slice(-60);
      return { ok: true, xp: t.xp - antes.xp, tibar: Math.round((t.inventario.tibar - antes.tibar) * 10) / 10, nivelPelaXp: D().nivelDoXp(t.xp) };
    });
  }

  /* Subir de nível (p. 35): exige XP; a classe nova não dá PV iniciais,
     perícias nem proficiências (o cálculo só usa as da classe inicial).
     Multiclasse pode exigir requisitos da mesa (o livro não os impõe). */
  function podeSubir(t20) {
    var nivel = lista(t20.niveis).length;
    if (nivel >= 20) return { ok: false, motivo: "Nível máximo." };
    if (nivel === 0) return { ok: true, primeiro: true };
    if (inteiro(t20.xp) < D().xpDoNivel(nivel + 1)) return { ok: false, motivo: "XP insuficiente (" + t20.xp + " de " + D().xpDoNivel(nivel + 1) + ")." };
    return { ok: true };
  }
  function subirNivel(t20, classeId, escolhas, opcoes) {
    var op = obj(opcoes);
    var c = CL() && CL().CLASSE[classeId];
    if (!c) return { ok: false, motivo: "Classe desconhecida." };
    var p = podeSubir(t20);
    if (!p.ok && !op.ignorarXp) return p;
    var esc = obj(escolhas);
    var pz = obj(esc.poder);
    if (pz.id) {
      var calc = calcular(t20);
      var def = poderDeClasse(c, pz.id) || poderGeral(pz.id);
      if (!def) return { ok: false, motivo: "Poder desconhecido." };
      var nivelFuturo = lista(t20.niveis).length + 1;
      var nc = (calc.niveisClasse[classeId] || 0) + 1;
      var falta = cumpreRequisitosNoNivel(t20, def, classeId, calc, nivelFuturo, nc);
      if (falta.length && !op.forcar) return { ok: false, motivo: "Requisitos: " + falta.join(", ") + "." };
    }
    t20.niveis.push({ classe: classeId, escolhas: clone(esc) });
    if (op.noPrimeiroDeixarCheio !== false && t20.niveis.length === 1) { t20.recursos.pv = null; t20.recursos.pm = null; }
    return { ok: true, nivel: t20.niveis.length };
  }
  /* Requisitos considerando o nível que vai ser alcançado. */
  function cumpreRequisitosNoNivel(t20, def, classeId, calc, nivelFuturo, ncFuturo) {
    var copia = clone(calc);
    copia.nivel = nivelFuturo;
    copia.niveisClasse = Object.assign({}, calc.niveisClasse);
    copia.niveisClasse[classeId] = ncFuturo;
    var r = cumpreRequisitos(t20, def, classeId, copia);
    return r.falta.filter(function (x) { return x.indexOf("(mesa)") !== 0; });
  }
  /* Escolhe a especialização de um Ofício pendente (classe ou origem). */
  function definirOficio(t20, onde, especializacao) {
    var o = obj(onde), esp = texto(especializacao, 40);
    if (!esp || !D().OFICIOS.some(function (x) { return x.chave === esp; })) return { ok: false, motivo: "Ofício desconhecido." };
    if (o.onde === "classe" && t20.niveis[0]) {
      var e = t20.niveis[0].escolhas = obj(t20.niveis[0].escolhas);
      e.oficios = lista(e.oficios).slice();
      e.oficios[inteiro(o.indice)] = esp;
      return { ok: true };
    }
    if (o.onde === "origem") {
      var b = lista(t20.origem && t20.origem.beneficios).filter(function (x) { return x.tipo === "pericia" && x.id === "oficio"; })[0];
      if (!b) return { ok: false, motivo: "A origem não tem Ofício." };
      b.escolhas = obj(b.escolhas); b.escolhas.oficio = esp;
      return { ok: true };
    }
    return { ok: false, motivo: "Nada para definir." };
  }
  function desfazerUltimoNivel(t20) { if (!lista(t20.niveis).length) return { ok: false }; t20.niveis.pop(); return { ok: true, nivel: t20.niveis.length }; }

  /* Seis rolagens de 4d6 descartando o menor (p. 17); se a soma dos
     modificadores ficar abaixo de 6, rola de novo o menor. */
  function rolarAtributos(rolar) {
    function umaRolagem() {
      var d = [rolar("1d6"), rolar("1d6"), rolar("1d6"), rolar("1d6")];
      var ord = d.slice().sort(function (a, b) { return a - b; });
      var soma = ord[1] + ord[2] + ord[3];
      return { dados: d, descartado: ord[0], soma: soma, valor: D().atributoDaRolagem(soma) };
    }
    var rol = [0, 1, 2, 3, 4, 5].map(umaRolagem);
    var refeitas = 0;
    while (rol.reduce(function (s, r) { return s + r.valor; }, 0) < D().SOMA_MINIMA_ROLAGEM && refeitas < 30) {
      var idx = 0;
      rol.forEach(function (r, i) { if (r.valor < rol[idx].valor) idx = i; });
      rol[idx] = umaRolagem(); refeitas++;
    }
    return { rolagens: rol, valores: rol.map(function (r) { return r.valor; }), soma: rol.reduce(function (s, r) { return s + r.valor; }, 0), refeitas: refeitas };
  }
  /* Distribui valores rolados (ou da compra) nos atributos. */
  function distribuirAtributos(t20, valores, ordem) {
    var v = lista(valores);
    var o = lista(ordem);
    if (v.length !== 6 || o.length !== 6) return { ok: false, motivo: "Seis valores e seis atributos." };
    var usados = {};
    for (var i = 0; i < 6; i++) { if (ATR.indexOf(o[i]) < 0 || usados[o[i]]) return { ok: false, motivo: "Atributo repetido ou inválido." }; usados[o[i]] = 1; }
    o.forEach(function (a, i) { t20.atributosBase[a] = inteiro(v[i]); });
    t20.metodo = "rolagem";
    t20.rolagens = v.slice();
    return { ok: true };
  }

  /* Recursos atuais acompanham mudanças no máximo (p. 106): se a
     Constituição sobe, o máximo e o atual sobem juntos; o dano sofrido
     fica igual. */
  function sincronizarRecursos(t20, calc) {
    var c = calc || calcular(t20);
    var rec = t20.recursos;
    if (rec.pv !== null && rec.pvRef !== undefined && rec.pvRef !== null && rec.pvRef !== c.pv.max) rec.pv = rec.pv + (c.pv.max - rec.pvRef);
    if (rec.pm !== null && rec.pmRef !== undefined && rec.pmRef !== null && rec.pmRef !== c.pm.max) rec.pm = Math.max(0, rec.pm + (c.pm.max - rec.pmRef));
    if (rec.pv !== null && rec.pv > c.pv.max) rec.pv = c.pv.max;
    if (rec.pm !== null && rec.pm > c.pm.max) rec.pm = c.pm.max;
    rec.pvRef = c.pv.max; rec.pmRef = c.pm.max;
    return { pv: rec.pv === null ? c.pv.max : rec.pv, pm: rec.pm === null ? c.pm.max : rec.pm };
  }

  global.RAMATormenta20 = {
    VERSAO: VERSAO, ATR: ATR, RESISTENCIAS: RESISTENCIAS,
    fichaVazia: fichaVazia, normalizar: normalizar, normalizarItem: normalizarItem,
    niveisDeClasse: niveisDeClasse, nivelDe: nivelDe, modificadoresDeRaca: modificadoresDeRaca, custoDosPontos: custoDosPontos,
    coletarFontes: coletarFontes, calcular: calcular, somarComRegras: somarComRegras, valorDeEscolhaDaClasse: valorDeEscolhaDaClasse,
    itemBase: itemBase, nomeDoItem: nomeDoItem, espacosDoItem: espacosDoItem,
    condicoesEfetivas: condicoesEfetivas, aplicarCondicao: aplicarCondicao, removerCondicao: removerCondicao,
    aplicarDano: aplicarDano, curar: curar, testeDeSangramento: testeDeSangramento,
    custoFinal: custoFinal, limiteDePM: limiteDePM, gastarPM: gastarPM, definicaoDeAcao: definicaoDeAcao, ativar: ativar, encerrarAtivo: encerrarAtivo,
    inicioDoTurno: inicioDoTurno, fimDeCena: fimDeCena, descansar: descansar,
    teste: teste, testeOposto: testeOposto, resolverManobra: resolverManobra, rolarAtaque: rolarAtaque, rolarExpressao: rolarExpressao,
    cumpreRequisitos: cumpreRequisitos, nomeDoPoder: nomeDoPoder, nomePericia: nomePericia, poderPorId: poderPorId, poderDeClasse: poderDeClasse,
    resumoParaMesa: resumoParaMesa, adicionarXp: adicionarXp, novoId: novoId,
    aplicarOperacao: aplicarOperacao, aplicarRecompensa: aplicarRecompensa, podeSubir: podeSubir, subirNivel: subirNivel, desfazerUltimoNivel: desfazerUltimoNivel,
    rolarAtributos: rolarAtributos, distribuirAtributos: distribuirAtributos, sincronizarRecursos: sincronizarRecursos,
    contextoDeMagia: contextoDeMagia, magiasConhecidas: magiasConhecidas, prepararMagia: prepararMagia, lancarMagia: lancarMagia, receberPvTemp: receberPvTemp,
    definirOficio: definirOficio, municaoRestante: municaoRestante, consumirMunicao: consumirMunicao, circuloDeEngenhoca: circuloDeEngenhoca, limiteDeEngenhocas: limiteDeEngenhocas, custoDeEngenhoca: custoDeEngenhoca, fabricarEngenhoca: fabricarEngenhoca,
    prepararEngenhoca: prepararEngenhoca, ativarEngenhoca: ativarEngenhoca, consertarEngenhoca: consertarEngenhoca,
  };
})(typeof window !== "undefined" ? window : globalThis);
