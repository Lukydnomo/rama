/* =====================================================================
   R.A.M.A. — painel da mesa · o que cada cartão mostra
   =====================================================================
   A parte SEM tela da aba Personagens da campanha: dado um personagem
   como a listagem da campanha o entrega, devolve o resumo que o cartão
   desenha — identificação, atributos (só leitura), recursos com limites
   de edição e estatísticas secundárias.

   NENHUMA FÓRMULA MORA AQUI. Numa ficha de Ordem, máximos, atuais,
   atributos efetivos, Defesa, Bloqueio, Esquiva, limite de PE e
   deslocamento saem de
   RAMAOrdemRegras.calcular — o mesmo cálculo que a ficha completa faz,
   com os mesmos dados (o servidor manda o bloco `ordem` e os itens que
   entram na conta). Numa universal, os status e atributos são os que a
   própria ficha configurou.

   O que a listagem não trouxe não vira zero: estatística ausente não
   aparece.

   PERMISSÕES VÊM DO SERVIDOR
   O cartão diz o que pode fazer com os rótulos que a listagem mandou
   (podeEditarRecursos, podeAbrirFicha, recursosVisiveis). Para outro
   jogador, a listagem manda só o resumo dos recursos — ou nada, com
   "Esconder status dos jogadores" ligada —, e é esse resumo que o
   cartão desenha, sem controles. Os rótulos são para a tela; quem
   recusa de verdade é o servidor.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;

  /* Os mesmos limites de edição da ficha completa: Ordem em
     js/paginas/ficha-ordem.js (−99 até o máximo calculado), universal em
     js/paginas/ficha-geral.js (−9999 até o máximo, ou sem teto quando o
     máximo é 0). */
  var PISO_ORDEM = -99;
  var PISO_UNIVERSAL = -9999;
  var TETO_SEM_MAXIMO = 999999;

  var CORES_UNIVERSAIS = ["azul", "verde", "cinza"];

  var RECURSOS_DE_ORDEM = {
    pv: { rotulo: "PV", nome: "Pontos de vida", cor: "vida" },
    pe: { rotulo: "PE", nome: "Pontos de esforço", cor: "esforco" },
    san: { rotulo: "SAN", nome: "Sanidade", cor: "sanidade" },
    /* Jogando sem Sanidade (SAH p.104): PD no lugar de PE e SAN. */
    pd: { rotulo: "PD", nome: "Pontos de determinação", cor: "esforco" },
  };

  function CD() { return global.RAMAOrdemCondicoes; }

  /* As condições como o cartão mostra: só as ativas ou com turnos nesta
     cena. Para quem vê a ficha inteira, sai do bloco de Ordem; para os
     outros, do resumo que o servidor mandou (e só se o status estiver
     visível). */
  function condicoesDoCartao(lista) {
    return (Array.isArray(lista) ? lista : []).map(function (c) {
      if (!c || typeof c !== "object") return null;
      var limite = c.limite === null || c.limite === undefined ? null : U.inteiro(c.limite, null);
      var contagem = Math.max(0, U.inteiro(c.contagem, 0));
      return {
        chave: U.texto(c.chave).slice(0, 40),
        nome: U.texto(c.nome).slice(0, 40) || U.texto(c.chave),
        oficial: c.oficial !== false,
        ativa: c.ativa === true,
        contagem: contagem,
        limite: limite,
        atingiu: limite !== null && contagem >= limite,
        texto: (c.ativa === true ? "" : "encerrada · ") + (limite !== null ? contagem + "/" + limite : (contagem ? String(contagem) : "")),
        /* O mesmo, por extenso, para leitor de tela: "2/3" lido em voz
           alta não diz o que é. */
        leitura: (U.texto(c.nome).slice(0, 40) || U.texto(c.chave)) + (c.ativa === true ? "" : ", encerrada") +
          (limite !== null ? ": " + contagem + " de " + limite + " inícios de turno nesta cena"
            : (contagem ? ": " + contagem + " inícios de turno nesta cena" : "")) +
          (c.oficial === false ? " (contador da mesa)" : ""),
      };
    }).filter(Boolean);
  }

  /* A cor de um status universal. Os nomes de sempre ganham a mesma cor
     dos recursos de Ordem (vida, esforço, sanidade) — assim "Sanidade"
     nunca fica laranja num cartão e roxa no outro. O resto alterna. */
  function corDoStatus(nome, indice) {
    var k = U.chaveDeBusca(nome);
    if (/^(vida|pv|pontos de vida|hp|saude)$/.test(k)) return "vida";
    if (/^(sanidade|san|sd)$/.test(k)) return "sanidade";
    if (/^(esforco|pe|pontos de esforco|energia|mana|pm)$/.test(k)) return "esforco";
    return CORES_UNIVERSAIS[indice % CORES_UNIVERSAIS.length];
  }

  function R() { return global.RAMAOrdemRegras; }
  function C() { return global.RAMAOrdemCatalogo; }
  function F() { return global.RAMAFicha; }

  function nomeDoCatalogo(lista, chave) {
    var achado = (lista || []).filter(function (x) { return x.chave === chave; })[0];
    return achado ? achado.nome : "";
  }

  /* ---------------- resumo ---------------- */

  function resumir(p) {
    var base = {
      id: p.id,
      nome: U.texto(p.nome) || "Sem nome",
      /* A versão da foto, não a foto: quem desenha pede a imagem a
         js/imagens.js e reaproveita o que já baixou (v2.16). */
      fotoVersao: p.fotoVersao || "",
      dono: p.dono || "",
      souDono: !!p.souDono,
      detalhado: p.detalhado !== false,
      /* null quando o servidor é de uma versão que não manda o rótulo: a
         tela decide pelo papel, como antes. */
      podeEditar: p.podeEditarRecursos === undefined ? null : !!p.podeEditarRecursos,
      podeAbrirFicha: p.podeAbrirFicha === undefined ? null : !!p.podeAbrirFicha,
      recursosOcultos: p.recursosVisiveis === false,
      recursosPendentes: !!p.recursosPendentes,
      /* A ficha não se montou no servidor (v2.15): o cartão mostra a
         identificação e o aviso, sem números nem controles. */
      ilegivel: !!p.fichaIlegivel,
      /* Para quem vê a ficha inteira: o resumo que o cálculo dá, e se o
         guardado no servidor ficou para trás. */
      resumoCalculado: null,
      resumoDesatualizado: false,
      rev: U.inteiro(p.rev, 0),
      tipo: p.tipoFicha === "ordem" ? "ordem" : "universal",
      linhas: [],
      progressao: "",
      atributos: [],
      recursos: [],
      estatisticas: [],
      condicoes: [],
    };
    return base.tipo === "ordem" ? resumirOrdem(p, base) : resumirUniversal(p, base);
  }

  function resumirOrdem(p, base) {
    var bruto = p.ordem && typeof p.ordem === "object" ? p.ordem : {};
    if (!R()) return base;

    var o = R().normalizar(bruto);
    var classe = nomeDoCatalogo(C() && C().CLASSES, o.classe);
    var trilha = nomeDoCatalogo(C() && C().TRILHAS, o.trilha);
    if (classe || trilha) base.linhas.push([classe, trilha].filter(Boolean).join(" · "));

    var t = R().trilho(o);
    base.progressao = t.separado ? t.rotulo + " · NEX " + R().exposicao(o) + "%" : t.rotulo;

    /* Outro jogador da mesa: a identificação e, se o mestre permitir, o
       resumo dos recursos que o servidor mandou — atual e máximo, sem
       controle. Nada é calculado a partir de dado que não veio. */
    if (!base.detalhado) {
      base.recursos = (Array.isArray(p.recursos) ? p.recursos : []).map(function (rec) {
        var def = rec && RECURSOS_DE_ORDEM[rec.chave];
        if (!def) return null;
        var maximo = U.inteiro(rec.maximo, 0);
        return {
          chave: "recurso/" + rec.chave, alvo: "recurso", itemId: rec.chave, campo: "atual",
          rotulo: def.rotulo, nome: def.nome, cor: def.cor,
          atual: U.inteiro(rec.atual, maximo), maximo: maximo,
          minimo: PISO_ORDEM, teto: maximo, cru: null,
        };
      }).filter(Boolean);
      base.condicoes = condicoesDoCartao(p.condicoes);
      return base;
    }

    var itens = (p.inventario && Array.isArray(p.inventario.itens) ? p.inventario.itens : [])
      .map(function (i) { return F() ? F().normalizarItem(i) : i; })
      .filter(Boolean);
    var inventario = { limite: 0, itens: itens };
    var c = R().calcular(o, inventario);

    base.atributos = (C() ? C().ATRIBUTOS : []).map(function (a) {
      return { sigla: a.sigla, nome: a.nome, valor: R().atributo(o, a.chave) };
    });

    var recursos = [
      { chave: "pv", rotulo: "PV", nome: "Pontos de vida", cor: "vida", conta: c.pv, atual: c.atual.pv },
    ];
    if (c.determinacao) {
      recursos.push({ chave: "pd", rotulo: "PD", nome: "Pontos de determinação", cor: "esforco", conta: c.pd, atual: c.atual.pd });
    } else {
      recursos.push({ chave: "pe", rotulo: "PE", nome: "Pontos de esforço", cor: "esforco", conta: c.pe, atual: c.atual.pe });
      recursos.push({ chave: "san", rotulo: "SAN", nome: "Sanidade", cor: "sanidade", conta: c.san, atual: c.atual.san });
    }

    base.recursos = recursos.map(function (r) {
      var guardado = o.recursos ? o.recursos[r.chave] : null;
      return {
        chave: "recurso/" + r.chave,
        alvo: "recurso",
        itemId: r.chave,
        campo: "atual",
        rotulo: r.rotulo,
        nome: r.nome,
        cor: r.cor,
        atual: r.atual,
        maximo: r.conta.total,
        minimo: PISO_ORDEM,
        teto: r.conta.total,
        /* O valor como está GUARDADO (null = nunca foi tocado, vale o
           máximo). É com ele que um conflito é conferido. */
        cru: guardado === undefined ? null : guardado,
      };
    });

    base.resumoCalculado = R().resumoDeRecursos ? R().resumoDeRecursos(o) : null;
    if (base.resumoCalculado && p.resumoRecursos !== undefined) {
      var guardado = p.resumoRecursos;
      base.resumoDesatualizado = !guardado ||
        guardado.pv !== base.resumoCalculado.pv ||
        (guardado.pe === undefined ? null : guardado.pe) !== base.resumoCalculado.pe ||
        (guardado.san === undefined ? null : guardado.san) !== base.resumoCalculado.san ||
        (guardado.pd === undefined ? null : guardado.pd) !== (base.resumoCalculado.pd === undefined ? null : base.resumoCalculado.pd);
    }
    base.condicoes = CD() ? condicoesDoCartao(CD().resumoPublico(o.condicoes)) : [];

    base.estatisticas = [
      { chave: "defesa", rotulo: "Defesa", valor: String(c.defesa.total) },
      { chave: "bloqueio", rotulo: "Bloqueio", valor: String(c.bloqueio.total) },
      { chave: "esquiva", rotulo: "Esquiva", valor: String(c.esquiva.total) },
      { chave: "limitePe", rotulo: c.determinacao ? "PD por turno" : "PE por turno", valor: String(c.limitePe.total) },
      { chave: "deslocamento", rotulo: "Deslocamento", valor: c.deslocamento.total + " m" },
    ];
    return base;
  }

  function resumirUniversal(p, base) {
    if (p.classe) base.linhas.push(U.texto(p.classe));
    if (p.origem) base.linhas.push(U.texto(p.origem));

    base.atributos = (Array.isArray(p.atributos) ? p.atributos : []).map(function (a) {
      return { sigla: U.texto(a.sigla) || U.texto(a.nome).slice(0, 3).toUpperCase(), nome: U.texto(a.nome), valor: U.inteiro(a.valor, 0) };
    });

    var outros = 0;
    base.recursos = (Array.isArray(p.status) ? p.status : []).map(function (s) {
      var maximo = U.inteiro(s.maximo, 0);
      return {
        chave: "status/" + s.id,
        alvo: "status",
        itemId: s.id,
        campo: "atual",
        rotulo: U.texto(s.nome) || "Status",
        nome: U.texto(s.nome) || "Status",
        cor: (function () {
          var cor = corDoStatus(s.nome, outros);
          if (CORES_UNIVERSAIS.indexOf(cor) >= 0) outros++;
          return cor;
        })(),
        atual: U.inteiro(s.atual, 0),
        maximo: maximo,
        minimo: PISO_UNIVERSAL,
        teto: maximo > 0 ? maximo : TETO_SEM_MAXIMO,
        cru: s.atual === undefined ? null : s.atual,
      };
    });
    return base;
  }

  /* ---------------- barra ---------------- */

  /* Quanto da barra pintar, de 0 a 100. O número mostrado continua o de
     verdade: esta conta só decide a largura. Máximo 0 com atual positivo
     enche; negativo ou máximo 0 sem nada fica vazio. */
  function preenchimento(atual, maximo) {
    var a = Number(atual);
    var m = Number(maximo);
    if (!Number.isFinite(a) || a <= 0) return 0;
    if (!Number.isFinite(m) || m <= 0) return 100;
    return Math.max(0, Math.min(100, Math.round((a / m) * 1000) / 10));
  }

  /* ---------------- edição direta ---------------- */

  /* Um número inteiro, dentro dos limites do recurso. Vazio, texto,
     decimal ou fora da faixa é recusado com o motivo — nunca vira zero. */
  function validarEntrada(texto, recurso) {
    var bruto = U.texto(texto).trim().replace(/^\+/, "").replace("−", "-");
    if (!bruto) return { ok: false, mensagem: "Digite um número." };
    if (!/^-?\d+$/.test(bruto)) return { ok: false, mensagem: "Use um número inteiro, como 12 ou -3." };
    var n = parseInt(bruto, 10);
    if (n < recurso.minimo) return { ok: false, mensagem: "O mínimo é " + recurso.minimo + "." };
    if (n > recurso.teto) return { ok: false, mensagem: "O máximo é " + recurso.teto + "." };
    return { ok: true, valor: n };
  }

  function limitar(valor, recurso) {
    return Math.max(recurso.minimo, Math.min(recurso.teto, U.inteiro(valor, 0)));
  }

  /* ---------------- concorrência ---------------- */

  /* O valor guardado de um recurso numa listagem nova. */
  function valorGuardado(p, recurso) {
    if (!p) return undefined;
    if (recurso.alvo === "recurso") {
      var rec = p.ordem && p.ordem.recursos;
      if (!rec) return null;
      return rec[recurso.itemId] === undefined ? null : rec[recurso.itemId];
    }
    var s = (Array.isArray(p.status) ? p.status : []).filter(function (x) { return String(x.id) === String(recurso.itemId); })[0];
    return s ? (s.atual === undefined ? null : s.atual) : undefined;
  }

  /* Depois de um conflito de revisão: reenviar só se ESTE recurso não
     mudou no servidor desde que o mestre começou a mexer. Se mudou (o
     jogador gastou PE na ficha), o ajuste do mestre não sobrescreve. */
  function podeReenviar(pNovo, recurso, base) {
    var agora = valorGuardado(pNovo, recurso);
    if (agora === undefined) return false;
    var normal = function (v) { return v === null || v === undefined ? null : U.inteiro(v, null); };
    return normal(agora) === normal(base);
  }

  global.RAMAPainelMesa = {
    PISO_ORDEM: PISO_ORDEM,
    PISO_UNIVERSAL: PISO_UNIVERSAL,
    resumir: resumir,
    condicoesDoCartao: condicoesDoCartao,
    preenchimento: preenchimento,
    validarEntrada: validarEntrada,
    limitar: limitar,
    valorGuardado: valorGuardado,
    podeReenviar: podeReenviar,
  };
})(typeof window !== "undefined" ? window : globalThis);
