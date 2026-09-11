/* =====================================================================
   R.A.M.A. — Ordem Paranormal · cálculo
   =====================================================================
   A camada que transforma as ESCOLHAS de um personagem nos NÚMEROS da
   ficha dele.

   ---------------------------------------------------------------------
   A REGRA QUE SUSTENTA TODO O RESTO
   ---------------------------------------------------------------------

   Valor calculado NÃO é gravado. Nunca.

   O que fica guardado na ficha é só o que uma pessoa escolheu — classe,
   origem, NEX, atributos, graus de perícia —, o que ela gastou, e os
   ajustes manuais que ela pediu. Todo número derivado é recalculado do
   zero quando alguém pergunta.

   Isso não é elegância: é o que torna três defeitos clássicos
   IMPOSSÍVEIS, em vez de improváveis.

     · bônus aplicado duas vezes. Não existe "somar o bônus da origem
       ao PV gravado", porque não existe PV gravado. O total nasce da
       soma completa toda vez, e somar a mesma parcela duas vezes exigiria
       ela estar duas vezes na lista;

     · recurso gasto que volta sozinho. O que está guardado é quanto
       PV a pessoa TEM, não quanto ela perdeu. Recalcular o máximo não
       toca no atual — e quando o máximo cai, o atual é aparado, nunca
       reposto;

     · ajuste legítimo apagado. Ajustes manuais são uma parcela como
       qualquer outra, com rótulo próprio. Recalcular os sobrepõe
       somando, não substituindo.

   ---------------------------------------------------------------------
   AS SEIS COISAS QUE NÃO SE MISTURAM
   ---------------------------------------------------------------------

     escolhido      classe, origem, trilha, NEX, atributos, perícias
     calculado      PV máximo, PE máximo, Defesa, carga, bônus de perícia
     permanente     modificadores de origem e de habilidade, sempre ativos
     temporário     o que vale até o fim da cena, e some sozinho
     recurso        PV/PE/SAN atuais — o que sobrou depois do gasto
     ajuste manual  o que a mesa decidiu à mão, com motivo anotado

   Cada uma mora num lugar diferente da ficha e é tratada de um jeito
   diferente aqui. Embaralhá-las é o que produz ficha que "se conserta"
   sozinha para o valor errado.

   ---------------------------------------------------------------------
   COMPOSIÇÃO
   ---------------------------------------------------------------------

   Todo valor calculado volta com a conta aberta: de onde veio cada
   parcela, quanto ela vale e qual regra a produziu. Uma ficha que diz
   "Defesa 17" sem dizer por quê obriga quem joga a confiar; uma que diz
   "10 base + 2 Agilidade + 2 Patrulha + 3 colete" deixa conferir.
   ===================================================================== */

(function (global) {
  "use strict";

  var C = global.RAMAOrdemCatalogo;

  /* =================================================================
     COMPOSIÇÃO
     ================================================================= */

  function conta() {
    return {
      parcelas: [],
      total: 0,
      soma: function (rotulo, valor, origem) {
        var n = Math.round(Number(valor) || 0);
        if (n === 0 && !origem) return this;
        this.parcelas.push({ rotulo: rotulo, valor: n, origem: origem || "" });
        this.total += n;
        return this;
      },
      /* Um piso, quando a regra tem um. Entra como parcela própria para
         a conta continuar fechando na tela. */
      piso: function (minimo, rotulo) {
        if (this.total >= minimo) return this;
        var falta = minimo - this.total;
        this.parcelas.push({ rotulo: rotulo || "Mínimo", valor: falta, origem: "" });
        this.total = minimo;
        return this;
      },
    };
  }

  /* =================================================================
     A FICHA DE ORDEM, VAZIA
     ================================================================= */

  function fichaVazia() {
    return {
      /* --- escolhido --- */
      nex: C.REGRAS.nexMinimo,
      /* Só usado com a regra opcional NEX & Experiência. Guardado
         sempre, para ligar e desligar a regra não perder o valor. */
      nivel: 1,
      classe: "",
      origem: "",
      trilha: "",
      atributos: { agi: 1, for: 1, int: 1, pre: 1, vig: 1 },
      /* chave da perícia → grau. O que não está aqui é destreinado. */
      pericias: {},
      prestigio: 0,

      /* --- escolhas registradas por etapa --- */
      progressao: [],

      /* --- recurso: o que sobrou --- */
      recursos: { pv: null, pe: null, san: null },

      /* --- ajuste manual, com motivo --- */
      ajustes: [],

      /* --- temporário, some no fim da cena --- */
      temporarios: { pv: 0, pe: 0, san: 0, defesa: 0 },

      /* --- regras opcionais ligadas --- */
      opcionais: {},
    };
  }

  /* =================================================================
     TRILHO DE PROGRESSÃO
     -----------------------------------------------------------------
     Quantos degraus de evolução o personagem subiu.

     Sem a regra opcional, é o NEX: 5% é o primeiro degrau, 99% é o
     vigésimo.

     Com NEX & Experiência ligada (SAH p.98), quem manda na progressão é
     o NÍVEL DE EXPERIÊNCIA, e o NEX passa a medir só exposição. O livro
     é explícito sobre o que muda de trilho: Benefícios por NEX,
     pré-requisitos de habilidade de classe (exceto poderes paranormais)
     e efeitos de origens e habilidades baseados em NEX.

     "Para estas regras, considere que 1 nível equivale a 5% de NEX."

     Por isso esta função existe: nenhum cálculo deste arquivo lê
     `ficha.nex` diretamente para fins de progressão. Todos passam por
     aqui, e trocar o trilho é trocar uma função — não caçar dezenas de
     contas espalhadas.
     ================================================================= */

  function separaNivelENex(ficha) {
    return !!(ficha && ficha.opcionais && ficha.opcionais.nexExperiencia);
  }

  function trilho(ficha) {
    if (separaNivelENex(ficha)) {
      var nivel = Math.max(1, inteiro(ficha.nivel, 1));
      return {
        passos: nivel,
        rotulo: "Nível " + nivel,
        curto: "Nv " + nivel,
        /* O NEX equivalente, para comparar com pré-requisitos escritos
           em porcentagem. 1 nível = 5%. */
        nexEquivalente: nivel * 5,
        separado: true,
      };
    }

    var nex = nexValido(ficha && ficha.nex);
    return {
      passos: Math.round(nex / C.REGRAS.passoNex),
      rotulo: "NEX " + nex + "%",
      curto: nex + "%",
      nexEquivalente: nex,
      separado: false,
    };
  }

  /* O NEX de verdade — exposição ao Outro Lado. Com a regra separada,
     ele NÃO manda na progressão, mas continua mandando em afinidade
     elemental, poderes paranormais e imunidade à Presença Perturbadora
     (SAH p.98). */
  function exposicao(ficha) {
    return nexValido(ficha && ficha.nex);
  }

  function nexValido(valor) {
    var n = inteiro(valor, C.REGRAS.nexMinimo);
    if (n < 0) n = 0;
    if (n > C.REGRAS.nexMaximo) n = C.REGRAS.nexMaximo;
    return n;
  }

  /* =================================================================
     MODIFICADORES PERMANENTES
     -----------------------------------------------------------------
     Reunidos num lugar só, a partir das escolhas. É esta lista que
     alimenta todos os cálculos — e é por ela ser montada do zero a cada
     chamada que um bônus não tem como entrar duas vezes.
     ================================================================= */

  function modificadores(ficha) {
    var lista = [];

    var origem = C.origem(ficha.origem);
    if (origem && origem.efeito) {
      lista.push({
        fonte: origem.poder,
        detalhe: "Origem: " + origem.nome,
        efeito: origem.efeito,
      });
    }

    /* Trilha e poderes de classe entram aqui quando tiverem efeito
       mecânico implementado. Hoje nenhum tem — e é por isso que o
       catálogo os marca como informativos em vez de fingir. */

    return lista;
  }

  function efeitosDoTipo(ficha, tipo) {
    return modificadores(ficha).filter(function (m) { return m.efeito.tipo === tipo; });
  }

  /* =================================================================
     PONTOS DE VIDA, ESFORÇO E SANIDADE
     -----------------------------------------------------------------
     OPRPG p.25, p.29, p.33. O valor inicial vale no primeiro degrau; a
     partir dele, cada degrau soma o incremento da classe.
     ================================================================= */

  function maximoDeRecurso(ficha, qual) {
    var c = conta();
    var classe = C.classe(ficha.classe);
    if (!classe) return c;

    var t = trilho(ficha);
    var passos = Math.max(1, t.passos);

    var inicial = classe[qual + "Inicial"];
    var porNex = classe[qual + "PorNex"];

    var atribInicial = inicial.atributo ? atributo(ficha, inicial.atributo) : 0;
    var atribPorNex = porNex.atributo ? atributo(ficha, porNex.atributo) : 0;

    c.soma(classe.nome + ", inicial", inicial.base + atribInicial,
      inicial.atributo ? "base " + inicial.base + " + " + siglaDe(inicial.atributo) + " " + atribInicial : "");

    if (passos > 1) {
      var porDegrau = porNex.base + atribPorNex;
      c.soma((passos - 1) + "× degrau de progressão", porDegrau * (passos - 1),
        porDegrau + " por degrau até " + t.rotulo);
    }

    /* --- efeitos de origem, por degrau de progressão ---
       "Calejado: +1 PV para cada 5% de NEX" (OPRPG p.18). Com a regra
       de NEX & Experiência, o próprio livro diz que isso vira "+1 PV
       por nível" (SAH p.98) — que é o que `trilho` já entrega. */
    var chaveDegrau = qual === "pv" ? "pvPorNex" : (qual === "san" ? "sanPorNex" : null);
    if (chaveDegrau) {
      efeitosDoTipo(ficha, chaveDegrau).forEach(function (m) {
        c.soma(m.fonte, m.efeito.valor * passos, m.detalhe);
      });
    }

    if (qual === "pe") {
      efeitosDoTipo(ficha, "dedicacao").forEach(function (m) {
        /* "+1 PE, e mais 1 PE adicional a cada NEX ímpar (15%, 25%…)"
           — OPRPG p.21. Os degraus ímpares são o 3º (15%), o 5º (25%)…
           ou seja, um a cada dois degraus a partir do terceiro. */
        var extras = passos >= 3 ? Math.floor((passos - 1) / 2) : 0;
        c.soma(m.fonte, 1 + extras, m.detalhe);
      });
    }

    /* --- Sanidade pela metade (Cultista Arrependido, OPRPG p.18) ---
       Entra depois de tudo, porque o livro fala em "metade da Sanidade
       normal para sua classe" — o que já foi somado até aqui. */
    if (qual === "san") {
      var metade = efeitosDoTipo(ficha, "sanidadeMetade");
      if (metade.length) {
        var perdido = c.total - Math.floor(c.total / 2);
        c.soma(metade[0].fonte, -perdido, metade[0].detalhe + " — metade da Sanidade da classe");
      }
    }

    /* --- ajustes manuais --- */
    somarAjustes(c, ficha, qual);

    c.piso(0);
    return c;
  }

  function pontosDeVida(ficha) { return maximoDeRecurso(ficha, "pv"); }
  function pontosDeEsforco(ficha) { return maximoDeRecurso(ficha, "pe"); }
  function sanidade(ficha) { return maximoDeRecurso(ficha, "san"); }

  /* =================================================================
     LIMITE DE PE POR TURNO — OPRPG p.23, Tabela 1.2
     -----------------------------------------------------------------
     A tabela é linear: NEX 5% → 1, 10% → 2, … 95% → 19, 99% → 20. Ou
     seja, o número do degrau.
     ================================================================= */

  function limiteDeEsforco(ficha) {
    var c = conta();
    var t = trilho(ficha);

    c.soma(t.rotulo, t.passos, "1 por degrau de progressão");

    efeitosDoTipo(ficha, "dedicacao").forEach(function (m) {
      c.soma(m.fonte, 1, m.detalhe + " — limite de PE por turno +1");
    });

    somarAjustes(c, ficha, "limitePe");
    c.piso(1);
    return c;
  }

  /* =================================================================
     DEFESA — OPRPG p.36
     ================================================================= */

  function defesa(ficha, inventario) {
    var c = conta();

    c.soma("Base", C.REGRAS.defesaBase, "OPRPG p.36");
    c.soma("Agilidade", atributo(ficha, "agi"));

    efeitosDoTipo(ficha, "defesa").forEach(function (m) {
      c.soma(m.fonte, m.efeito.valor, m.detalhe);
    });

    var carga = capacidade(ficha, inventario);
    if (carga.sobrecarregado) {
      c.soma("Sobrecarregado", C.REGRAS.penalidadeSobrecarga.defesa, "OPRPG p.53");
    }

    if (ficha.temporarios && ficha.temporarios.defesa) {
      c.soma("Temporário", ficha.temporarios.defesa, "até o fim da cena");
    }

    somarAjustes(c, ficha, "defesa");
    return c;
  }

  /* =================================================================
     DESLOCAMENTO — OPRPG p.36, p.53
     ================================================================= */

  function deslocamento(ficha, inventario) {
    var c = conta();
    c.soma("Padrão", C.REGRAS.deslocamentoPadrao, "OPRPG p.36");

    var carga = capacidade(ficha, inventario);
    if (carga.sobrecarregado) {
      c.soma("Sobrecarregado", C.REGRAS.penalidadeSobrecarga.deslocamento, "OPRPG p.53");
    }

    somarAjustes(c, ficha, "deslocamento");
    c.piso(0);
    return c;
  }

  /* =================================================================
     CAPACIDADE DE CARGA — OPRPG p.53
     -----------------------------------------------------------------
     "Você pode carregar um número de espaços de itens igual a 5 por
     ponto de Força (se tiver Força 0, pode carregar apenas 2 espaços)."
     ================================================================= */

  function capacidade(ficha, inventario) {
    var forca = atributo(ficha, "for");
    var limite = forca <= 0
      ? C.REGRAS.espacosForcaZero
      : forca * C.REGRAS.espacosPorForca;

    var ocupado = 0;
    (inventario && inventario.itens ? inventario.itens : []).forEach(function (item) {
      ocupado += Math.max(0, Number(item && item.espacos) || 0);
    });

    return {
      limite: limite,
      /* "Você não pode ultrapassar o dobro desse limite." */
      maximo: limite * 2,
      ocupado: ocupado,
      sobrecarregado: ocupado > limite,
      acimaDoMaximo: ocupado > limite * 2,
      forca: forca,
    };
  }

  /* =================================================================
     PERÍCIAS — OPRPG p.40
     ================================================================= */

  function grauDaPericia(ficha, chave) {
    var g = ficha.pericias && ficha.pericias[chave];
    return C.grau(g).chave;
  }

  function bonusDePericia(ficha, chave, inventario) {
    var c = conta();
    var pe = C.pericia(chave);
    if (!pe) return c;

    var g = C.grau(grauDaPericia(ficha, chave));
    c.soma(g.nome, g.bonus, "OPRPG p.40");

    /* Penalidade de carga: só nas perícias marcadas com carga. */
    if (pe.carga) {
      var carga = capacidade(ficha, inventario);
      if (carga.sobrecarregado) {
        c.soma("Sobrecarregado", C.REGRAS.penalidadeSobrecarga.pericias, "OPRPG p.53");
      }
    }

    somarAjustes(c, ficha, "pericia:" + chave);
    return c;
  }

  /* Os dados que a perícia rola: um d20 por ponto do atributo-base.
     Atributo 0 rola 2d20 e pega o pior — que é o `-2d20` do motor. */
  function dadoDePericia(ficha, chave) {
    var pe = C.pericia(chave);
    if (!pe) return "1d20";
    var valor = atributo(ficha, pe.atributo);
    return valor <= 0 ? "-2d20" : valor + "d20";
  }

  /* =================================================================
     PATENTE — OPRPG p.51-52
     ================================================================= */

  function patente(ficha) {
    var pp = inteiro(ficha.prestigio, 0);

    /* A tabela vale de baixo para cima: a maior patente cujo mínimo o
       personagem alcançou. Perder PP rebaixa pelo mesmo caminho. */
    var atual = C.PATENTES[0];
    C.PATENTES.forEach(function (p) { if (pp >= p.pp) atual = p; });

    var indiceCredito = C.CREDITOS.indexOf(atual.credito);

    efeitosDoTipo(ficha, "creditoAcima").forEach(function (m) {
      indiceCredito = Math.min(C.CREDITOS.length - 1, indiceCredito + m.efeito.valor);
    });

    return {
      patente: atual,
      credito: C.CREDITOS[indiceCredito],
      creditoElevado: indiceCredito !== C.CREDITOS.indexOf(atual.credito),
      itens: atual.itens,
      prestigio: pp,
    };
  }

  /* =================================================================
     RITUAIS — OPRPG p.119, p.33
     ================================================================= */

  function rituais(ficha) {
    var classe = C.classe(ficha.classe);
    var t = trilho(ficha);

    /* O círculo máximo é de Escolhido pelo Outro Lado, que é habilidade
       de classe — logo, segue o trilho de progressão. */
    var circuloMaximo = 0;
    if (classe && classe.circuloPorNex) {
      classe.circuloPorNex.forEach(function (faixa) {
        if (t.nexEquivalente >= faixa.nex) circuloMaximo = faixa.circulo;
      });
    }

    return {
      /* "um personagem só pode aprender um número de rituais dessa
         forma igual ao seu Intelecto" — OPRPG p.119. */
      limitePorIntelecto: atributo(ficha, "int"),
      circuloMaximo: circuloMaximo,
      custoPorCirculo: C.CUSTO_RITUAL,
    };
  }

  /* =================================================================
     AJUSTES MANUAIS
     -----------------------------------------------------------------
     A mesa decide coisas que o livro não prevê, e o R.A.M.A. não pode
     tornar isso impossível. Um ajuste é uma parcela como outra
     qualquer: tem rótulo, valor e motivo, aparece na composição com a
     marca de manual, e sobrevive a qualquer recálculo — porque
     recalcular soma as parcelas de novo, e ele é uma delas.
     ================================================================= */

  function somarAjustes(c, ficha, alvo) {
    (ficha.ajustes || []).forEach(function (a) {
      if (!a || a.alvo !== alvo) return;
      c.soma(a.motivo || "Ajuste manual", a.valor, "ajuste da mesa");
    });
  }

  function criarAjuste(alvo, valor, motivo) {
    return {
      id: (global.RAMAUtil ? global.RAMAUtil.uuid() : String(Math.random())),
      alvo: String(alvo || ""),
      valor: inteiro(valor, 0),
      motivo: String(motivo || "").slice(0, 120),
      manual: true,
    };
  }

  /* =================================================================
     RECURSOS ATUAIS
     -----------------------------------------------------------------
     O que sobrou depois do gasto. Guardado, porque não dá para deduzir:
     o sistema não tem como saber quanto dano alguém tomou.

     `null` quer dizer "nunca foi tocado" e vale o máximo. É diferente de
     0, que quer dizer "gastou tudo" — e confundir os dois é como um
     recálculo acaba curando um personagem.
     ================================================================= */

  function recursoAtual(ficha, qual, maximo) {
    var guardado = ficha.recursos ? ficha.recursos[qual] : null;
    if (guardado === null || guardado === undefined) return maximo;

    var n = inteiro(guardado, maximo);
    /* Aparar para baixo quando o máximo cai. NUNCA para cima: se o
       máximo subir, o que estava gasto continua gasto. */
    return Math.min(n, maximo);
  }

  /* Aplica um novo máximo aos recursos guardados, sem repor nada. */
  function aparar(ficha, maximos) {
    if (!ficha.recursos) ficha.recursos = { pv: null, pe: null, san: null };

    ["pv", "pe", "san"].forEach(function (qual) {
      var atual = ficha.recursos[qual];
      if (atual === null || atual === undefined) return;
      var teto = maximos[qual];
      if (inteiro(atual, 0) > teto) ficha.recursos[qual] = teto;
    });

    return ficha.recursos;
  }

  /* =================================================================
     O PANORAMA
     -----------------------------------------------------------------
     Tudo de uma vez, que é como a tela desenha.
     ================================================================= */

  function calcular(ficha, inventario) {
    var pv = pontosDeVida(ficha);
    var pe = pontosDeEsforco(ficha);
    var san = sanidade(ficha);

    return {
      trilho: trilho(ficha),
      exposicao: exposicao(ficha),

      pv: pv, pe: pe, san: san,

      atual: {
        pv: recursoAtual(ficha, "pv", pv.total),
        pe: recursoAtual(ficha, "pe", pe.total),
        san: recursoAtual(ficha, "san", san.total),
      },

      limitePe: limiteDeEsforco(ficha),
      defesa: defesa(ficha, inventario),
      deslocamento: deslocamento(ficha, inventario),
      carga: capacidade(ficha, inventario),
      patente: patente(ficha),
      rituais: rituais(ficha),
    };
  }

  /* =================================================================
     AUXILIARES
     ================================================================= */

  function atributo(ficha, chave) {
    return inteiro(ficha && ficha.atributos ? ficha.atributos[chave] : 0, 0);
  }

  function siglaDe(chave) {
    var a = C.ATRIBUTOS.filter(function (x) { return x.chave === chave; })[0];
    return a ? a.sigla : chave;
  }

  function inteiro(valor, padrao) {
    var n = parseInt(valor, 10);
    return Number.isFinite(n) ? n : padrao;
  }

  /* =================================================================
     NORMALIZAÇÃO
     -----------------------------------------------------------------
     O bloco `ordem` da ficha, lido da planilha ou de um arquivo. Aceita
     o que faltar e recusa o que não faz sentido, sem apagar nada que
     possa ser aproveitado.
     ================================================================= */

  function normalizar(bruto) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};
    var vazia = fichaVazia();

    var ficha = {
      nex: nexValido(b.nex),
      nivel: Math.max(1, Math.min(20, inteiro(b.nivel, 1))),
      nivelDefinido: b.nivelDefinido === true,
      classe: chaveConhecida(b.classe, C.CLASSES),
      origem: chaveConhecida(b.origem, C.ORIGENS),
      trilha: chaveConhecida(b.trilha, C.TRILHAS),
      prestigio: Math.max(0, inteiro(b.prestigio, 0)),
      atributos: {},
      pericias: {},
      progressao: [],
      recursos: { pv: null, pe: null, san: null },
      ajustes: [],
      temporarios: { pv: 0, pe: 0, san: 0, defesa: 0 },
      opcionais: global.RAMAOrdemOpcionais
        ? global.RAMAOrdemOpcionais.normalizar(b.opcionais)
        : {},
    };

    /* A trilha precisa ser da classe escolhida. Uma trilha de ocultista
       numa ficha de combatente não é um valor que se conserte; é um
       vínculo quebrado, e ele some. */
    var t = C.trilha(ficha.trilha);
    if (t && ficha.classe && t.classe !== ficha.classe) ficha.trilha = "";

    var atribBruto = (b.atributos && typeof b.atributos === "object") ? b.atributos : {};
    C.ATRIBUTOS.forEach(function (a) {
      /* O teto de 5 é do Aumento de Atributo (OPRPG p.26). O piso 0
         existe porque atributo 0 é um valor legítimo do sistema. */
      ficha.atributos[a.chave] = Math.max(0, Math.min(5, inteiro(atribBruto[a.chave], vazia.atributos[a.chave])));
    });

    var periciasBruto = (b.pericias && typeof b.pericias === "object") ? b.pericias : {};
    C.PERICIAS.forEach(function (p) {
      var g = C.grau(periciasBruto[p.chave]);
      if (g.chave !== "destreinado") ficha.pericias[p.chave] = g.chave;
    });

    /* Escolhas de progressão: guardadas como vieram, filtrando só o que
       não tem forma de escolha. Uma escolha que deixou de ser válida
       NÃO é apagada aqui — ela é sinalizada pela revisão, para quem
       joga decidir. */
    (Array.isArray(b.progressao) ? b.progressao : []).forEach(function (e) {
      if (!e || typeof e !== "object") return;
      ficha.progressao.push({
        id: e.id || (global.RAMAUtil ? global.RAMAUtil.uuid() : String(Math.random())),
        nex: inteiro(e.nex, 0),
        tipo: String(e.tipo || "").slice(0, 40),
        valor: String(e.valor === undefined || e.valor === null ? "" : e.valor).slice(0, 120),
        rotulo: String(e.rotulo || "").slice(0, 120),
      });
    });

    var rec = (b.recursos && typeof b.recursos === "object") ? b.recursos : {};
    ["pv", "pe", "san"].forEach(function (qual) {
      var v = rec[qual];
      /* null é "nunca foi tocado" e vale o máximo. Zero é "gastou
         tudo". Os dois precisam sobreviver à leitura. */
      ficha.recursos[qual] = (v === null || v === undefined || v === "") ? null : inteiro(v, null);
    });

    (Array.isArray(b.ajustes) ? b.ajustes : []).forEach(function (a) {
      if (!a || typeof a !== "object" || !a.alvo) return;
      ficha.ajustes.push({
        id: a.id || (global.RAMAUtil ? global.RAMAUtil.uuid() : String(Math.random())),
        alvo: String(a.alvo).slice(0, 60),
        valor: inteiro(a.valor, 0),
        motivo: String(a.motivo || "").slice(0, 120),
        manual: true,
      });
    });

    var temp = (b.temporarios && typeof b.temporarios === "object") ? b.temporarios : {};
    ["pv", "pe", "san", "defesa"].forEach(function (qual) {
      ficha.temporarios[qual] = inteiro(temp[qual], 0);
    });

    return ficha;
  }

  function chaveConhecida(valor, lista) {
    var v = String(valor === undefined || valor === null ? "" : valor);
    var achou = lista.filter(function (x) { return x.chave === v; })[0];
    return achou ? achou.chave : "";
  }

  global.RAMAOrdemRegras = {
    normalizar: normalizar,
    fichaVazia: fichaVazia,

    trilho: trilho,
    exposicao: exposicao,
    separaNivelENex: separaNivelENex,
    nexValido: nexValido,

    modificadores: modificadores,

    pontosDeVida: pontosDeVida,
    pontosDeEsforco: pontosDeEsforco,
    sanidade: sanidade,
    limiteDeEsforco: limiteDeEsforco,
    defesa: defesa,
    deslocamento: deslocamento,
    capacidade: capacidade,
    patente: patente,
    rituais: rituais,

    grauDaPericia: grauDaPericia,
    bonusDePericia: bonusDePericia,
    dadoDePericia: dadoDePericia,

    criarAjuste: criarAjuste,
    recursoAtual: recursoAtual,
    aparar: aparar,

    calcular: calcular,
    atributo: atributo,
  };
})(typeof window !== "undefined" ? window : globalThis);
