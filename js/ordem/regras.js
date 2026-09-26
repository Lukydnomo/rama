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
   origem, NEX, atributos, graus de perícia, as decisões de cada etapa —,
   o que ela gastou, e os ajustes manuais que ela pediu. Todo número
   derivado é recalculado do zero quando alguém pergunta.

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

     escolhido      classe, origem, trilha, NEX, atributos, perícias,
                    as escolhas registradas em cada etapa
     calculado      PV máximo, PE máximo, Defesa, carga, bônus de perícia
     permanente     efeitos de origem, de habilidade e de poder
     temporário     ajustes que valem até alguém os tirar
     recurso        PV/PE/SAN atuais — o que sobrou depois do gasto
     ajuste manual  o que a mesa decidiu à mão, com motivo anotado

   ---------------------------------------------------------------------
   DE ONDE VÊM OS EFEITOS DE PROGRESSÃO
   ---------------------------------------------------------------------

   progressao.js percorre as etapas e devolve atributos e graus
   efetivos, poderes adquiridos e uma lista de efeitos. Esta camada só
   SOMA essa lista nas contas certas. Nenhum poder é tratado por nome
   aqui: um efeito novo é um tipo novo de efeito, não um `if` a mais.

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

  function E() { return global.RAMAOrdemProgressao; }
  function I() { return global.RAMAOrdemInventario; }
  function CD() { return global.RAMAOrdemCondicoes; }
  function EF() { return global.RAMAOrdemEfeitos || null; }

  /* As condições e os efeitos aplicados que estão valendo nesta ficha
     (js/ordem/efeitos.js), com o que o rastreador de morrendo e
     enlouquecendo diz. Sem o módulo, nada muda nas contas. */
  function efeitosDaFicha(ficha) {
    if (!EF() || !ficha || !ficha.condicoes) return null;
    var cond = ficha.condicoes;
    var extra = CD() && CD().extrasDoRastreador ? CD().extrasDoRastreador(cond) : {};
    return { cond: cond, extra: extra };
  }

  /* Soma na conta as parcelas de um efeito combinado, e mostra — com
     valor 0 — o que não acumulou e por quê. */
  function somarEfeitos(c, combinado) {
    if (!combinado) return;
    combinado.parcelas.forEach(function (x) { c.soma(x.rotulo, x.valor, x.origem); });
    combinado.ignorados.forEach(function (x) {
      c.soma(x.rotulo + " (" + (x.valor > 0 ? "+" : "") + x.valor + ", não acumula)", 0, x.motivo);
    });
  }

  /* "Jogando sem Sanidade" (SAH p.104): PE e Sanidade saem, e os dois
     viram um recurso só, pontos de determinação. A chave da regra é a
     mesma desde a v2.3 (`semSanidade`). */
  var REGRA_DETERMINACAO = "semSanidade";

  function usaDeterminacao(ficha) {
    return !!(ficha && ficha.opcionais && ficha.opcionais[REGRA_DETERMINACAO] === true);
  }

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

      /* --- decisões de progressão, por etapa (progressao.js) --- */
      escolhas: [],
      /* --- rituais aprendidos fora da progressão: estudo em campo e
             concessão da mesa --- */
      registrosDeRitual: [],
      /* --- versões personalizadas de habilidades oficiais
             (personalizacao.js): apresentação por aquisição --- */
      personalizacoes: [],
      /* --- habilidades automáticas excluídas da ficha --- */
      excluidas: [],
      /* --- como cada aba ordena a lista (só apresentação) --- */
      organizacao: normalizarOrganizacao(null),
      /* --- bônus extra de Defesa, Bloqueio e Esquiva --- */
      bonusExtra: { defesa: 0, bloqueio: 0, esquiva: 0 },
      /* --- por perícia: atributo escolhido e bônus extra (só o que
             difere do padrão) --- */
      periciasAjustes: {},
      /* --- registros de texto livre da v2.3, preservados --- */
      progressao: [],
      /* --- afinidade elemental --- */
      afinidade: { elemento: "", nomeOutro: "", adiada: false },

      /* --- regra de patente e limites manuais --- */
      patente: { aplicar: true, limites: null },

      /* --- recurso: o que sobrou. `pd` só vale com "Jogando sem
             Sanidade"; PE e SAN ficam guardados enquanto isso --- */
      recursos: { pv: null, pe: null, san: null, pd: null },

      /* --- condições contadas por turno: morrendo, enlouquecendo e os
             contadores da mesa (condicoes.js) --- */
      condicoes: CD() ? CD().vazio() : {},
      componentes: global.RAMAOrdemConsumo ? global.RAMAOrdemConsumo.normalizarControle(null) : {},
      consumos: [],

      /* --- ajuste manual, com motivo --- */
      ajustes: [],

      /* --- temporário: fica até alguém tirar --- */
      temporarios: { pv: 0, pe: 0, san: 0, defesa: 0, capacidade: 0 },

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

     Por isso esta função existe: nenhum cálculo lê `ficha.nex`
     diretamente para fins de progressão. Todos passam por aqui.
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
     ESTADO DE PROGRESSÃO
     ================================================================= */

  /* O catálogo de poderes só é carregado nas páginas que calculam a
     ficha de Ordem (a ficha e a criação). Nas outras, a conta de
     progressão não existe — e o que depende dela volta ao valor base,
     em vez de quebrar a página. */
  function estadoDe(ficha, inventario) {
    if (!E() || !global.RAMAOrdemPoderes || !ficha) return null;
    return E().estado(ficha, inventario ? { inventario: inventario } : null);
  }

  function efeitosDaProgressao(ficha, inventario) {
    var est = estadoDe(ficha, inventario);
    return est ? est.efeitos : [];
  }

  /* =================================================================
     MODIFICADORES PERMANENTES
     -----------------------------------------------------------------
     Reunidos num lugar só: o efeito da origem e todos os efeitos que a
     progressão produziu. É esta lista que alimenta os cálculos — e é
     por ela ser montada do zero a cada chamada que um bônus não tem
     como entrar duas vezes.
     ================================================================= */

  function modificadores(ficha, inventario) {
    var lista = [];

    var origem = C.origem(ficha.origem);
    if (origem && origem.efeito) {
      lista.push({
        fonte: origem.poder,
        detalhe: "Origem: " + origem.nome,
        efeito: origem.efeito,
      });
    }

    efeitosDaProgressao(ficha, inventario).forEach(function (ef) {
      lista.push({ fonte: ef.fonte, detalhe: ef.detalhe, efeito: ef });
    });

    return lista;
  }

  function efeitosDoTipo(ficha, tipo, inventario) {
    return modificadores(ficha, inventario).filter(function (m) { return m.efeito.tipo === tipo; });
  }

  /* =================================================================
     ATRIBUTOS
     -----------------------------------------------------------------
     `atributoBase` é o que está gravado: o valor da criação e os
     ajustes que a mesa fez à mão. `atributo` é o que vale na conta: a
     base mais os aumentos de atributo e os efeitos de poder, somados
     na ordem das etapas.
     ================================================================= */

  function atributoBase(ficha, chave) {
    return inteiro(ficha && ficha.atributos ? ficha.atributos[chave] : 0, 0);
  }

  function atributo(ficha, chave) {
    var est = estadoDe(ficha);
    if (est && est.atributos && est.atributos[chave] !== undefined) return est.atributos[chave];
    return atributoBase(ficha, chave);
  }

  /* A conta aberta de um atributo: base e cada efeito. */
  function composicaoDoAtributo(ficha, chave) {
    var c = conta();
    c.soma("Valor da ficha", atributoBase(ficha, chave), "criação e ajustes à mão");
    efeitosDaProgressao(ficha).forEach(function (ef) {
      if ((ef.tipo === "aumentoAtributo" || ef.tipo === "atributo") && ef.atributo === chave) {
        c.soma(ef.fonte, ef.valor, ef.detalhe);
      }
    });
    return c;
  }

  /* =================================================================
     PONTOS DE VIDA, ESFORÇO E SANIDADE
     -----------------------------------------------------------------
     OPRPG p.25, p.29, p.33. O valor inicial vale no primeiro degrau; a
     partir dele, cada degrau soma o incremento da classe.
     ================================================================= */

  function passosDoEfeito(ficha, ef) {
    if (ef.trilho === "exposicao" && E()) return E().degrauDeExposicao(exposicao(ficha));
    return Math.max(1, trilho(ficha).passos);
  }

  function maximoDeRecurso(ficha, qual) {
    var c = conta();
    var classe = C.classe(ficha.classe);
    if (!classe) return c;

    var t = trilho(ficha);
    var passos = Math.max(1, t.passos);

    var inicial = classe[qual + "Inicial"];
    var porNex = classe[qual + "PorNex"];
    if (!inicial || !porNex) return c;

    /* Pontos de determinação (SAH p.104): "todos os demais efeitos e
       mecânicas relacionados a pontos de esforço se aplicam diretamente a
       pontos de determinação". Então os PD somam, além da tabela da
       classe, tudo o que soma PE — e nada do que soma Sanidade ("ignore
       as demais referências a Sanidade"). */
    var comoPe = qual === "pe" || qual === "pd";

    /* Racionalidade Inflexível troca a Presença pelo Intelecto no
       cálculo dos PE (SAH p.35). */
    var atribPe = null;
    if (comoPe) {
      efeitosDoTipo(ficha, "atributoDoPe").forEach(function (m) { atribPe = m.efeito.atributo; });
    }
    var chaveInicial = inicial.atributo ? (atribPe || inicial.atributo) : null;
    var chavePorNex = porNex.atributo ? (atribPe || porNex.atributo) : null;

    var atribInicial = chaveInicial ? atributo(ficha, chaveInicial) : 0;
    var atribPorNex = chavePorNex ? atributo(ficha, chavePorNex) : 0;

    c.soma(classe.nome + ", inicial", inicial.base + atribInicial,
      chaveInicial ? "base " + inicial.base + " + " + siglaDe(chaveInicial) + " " + atribInicial : "");

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

    /* --- efeitos de poder e habilidade, por degrau --- */
    var porDegrauDoPoder = qual === "pv" ? "pvPorDegrau" : (comoPe ? "pePorDegrau" : null);
    if (porDegrauDoPoder) {
      efeitosDoTipo(ficha, porDegrauDoPoder).forEach(function (m) {
        var n = passosDoEfeito(ficha, m.efeito);
        c.soma(m.fonte, m.efeito.valor * n,
          m.efeito.valor + " por " + (m.efeito.trilho === "exposicao" ? "5% de NEX de exposição" : "degrau") + " × " + n);
      });
    }

    if (comoPe) {
      efeitosDoTipo(ficha, "dedicacao").forEach(function (m) {
        /* "+1 PE, e mais 1 PE adicional a cada NEX ímpar (15%, 25%…)"
           — OPRPG p.21. Os degraus ímpares são o 3º (15%), o 5º (25%)…
           ou seja, um a cada dois degraus a partir do terceiro. */
        var extras = passos >= 3 ? Math.floor((passos - 1) / 2) : 0;
        c.soma(m.fonte, 1 + extras, m.detalhe);
      });
      efeitosDoTipo(ficha, "pePorDoisDegraus").forEach(function (m) {
        var n = Math.floor(passos / 2);
        c.soma(m.fonte, m.efeito.valor * n, "1 a cada 2 degraus × " + n);
      });
      efeitosDoTipo(ficha, "peFixo").forEach(function (m) {
        c.soma(m.fonte, m.efeito.valor, m.detalhe);
      });
      efeitosDoTipo(ficha, "peAtributo").forEach(function (m) {
        c.soma(m.fonte, atributo(ficha, m.efeito.atributo), siglaDe(m.efeito.atributo) + " somado aos PE");
      });
    }

    if (qual === "san") {
      /* Transcender: "você recebe o poder escolhido, mas não ganha
         Sanidade neste aumento de NEX" (OPRPG p.26). */
      efeitosDoTipo(ficha, "sanPerdidaTranscender").forEach(function (m) {
        c.soma("Transcender", -porNex.base, "Sanidade não ganha em " + m.detalhe);
      });

      /* Sanidade pela metade (Cultista Arrependido, OPRPG p.18). Entra
         depois de tudo, porque o livro fala em "metade da Sanidade
         normal para sua classe" — o que já foi somado até aqui. */
      var metade = efeitosDoTipo(ficha, "sanidadeMetade");
      if (metade.length) {
        var perdido = c.total - Math.floor(c.total / 2);
        c.soma(metade[0].fonte, -perdido, metade[0].detalhe + " — metade da Sanidade da classe");
      }
    }

    /* Um ajuste da mesa nos PE é mecânica de PE: com a regra ligada, ele
       vale para os PD — e volta aos PE quando ela é desligada. */
    if (qual === "pd") somarAjustes(c, ficha, "pe");
    somarAjustes(c, ficha, qual);

    c.piso(0);
    return c;
  }

  function pontosDeVida(ficha) { return maximoDeRecurso(ficha, "pv"); }
  function pontosDeEsforco(ficha) { return maximoDeRecurso(ficha, "pe"); }
  function sanidade(ficha) { return maximoDeRecurso(ficha, "san"); }
  function determinacao(ficha) { return maximoDeRecurso(ficha, "pd"); }

  /* =================================================================
     LIMITE DE PE POR TURNO — OPRPG p.23, Tabela 1.2
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

    /* A proteção em uso soma a Defesa cadastrada nela — uma vez, seja
       qual for a quantidade (duas proteções leves na mochila não são
       duas vestidas). As que não estão em uso não somam. O escudo em
       uso acumula (OPRPG p. 62). Modificações entram como parcelas. */
    var protecao = protecaoEmUso(inventario);
    if (protecao.item) {
      c.soma(protecao.item.nome, protecao.composicao.base, "proteção em uso");
      protecao.composicao.ajustes.forEach(function (x) {
        c.soma(protecao.item.nome + " · " + x.fonte, x.valor, "modificação da proteção em uso");
      });
    }
    if (protecao.escudo) {
      c.soma(protecao.escudo.nome, protecao.composicaoEscudo.base, "escudo em uso — acumula com a proteção (OPRPG p.62)");
      protecao.composicaoEscudo.ajustes.forEach(function (x) {
        c.soma(protecao.escudo.nome + " · " + x.fonte, x.valor, "modificação do escudo em uso");
      });
    }
    c.avisos = protecao.avisos;

    efeitosDoTipo(ficha, "defesa", inventario).forEach(function (m) {
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
    somarExtra(c, ficha, "defesa", "Bônus extra de Defesa");

    /* Condições e efeitos: a Defesa geral entra na conta; a que depende
       de quem ataca (caído: −5 contra corpo a corpo, +5 contra à
       distância) fica ao lado, como observação. */
    var ef = efeitosDaFicha(ficha);
    c.contextuais = [];
    if (ef) {
      somarEfeitos(c, EF().bonusEm(ef.cond, ef.extra, ["defesa"]));
      c.contextuais = EF().contextuais(ef.cond, ef.extra).filter(function (x) { return /^defesa:/.test(x.alvo); });
    }
    return c;
  }

  /* =================================================================
     BLOQUEIO E ESQUIVA
     -----------------------------------------------------------------
     Bloqueio = valor de Fortitude + bônus extra de Bloqueio.
     Esquiva  = Defesa FINAL + valor de Reflexos + bônus extra de Esquiva.

     "Valor da perícia" é o bônus numérico dela — grau, poderes,
     penalidade de carga, ajustes da mesa e o bônus extra da perícia —,
     o mesmo que entra na rolagem, sem os dados do atributo. Ele vem de
     bonusDePericia: um extra de Fortitude aparece no Bloqueio porque já
     está em Fortitude, e não é somado de novo aqui.

     O bônus em testes de resistência (Reflexos Defensivos, Mente Sã…)
     vale quando a perícia é usada para RESISTIR. Bloquear e esquivar não
     são testes de resistência, então ele não entra — do mesmo jeito que
     não entra no bônus geral dessas perícias.

     A Esquiva usa a Defesa como ela sai de `defesa()`, já com proteção,
     poderes, sobrecarga, temporário, ajustes e o extra de Defesa: é UMA
     parcela, e as parcelas da Defesa não são repetidas.
     ================================================================= */

  function bloqueio(ficha, inventario) {
    var c = conta();
    var fortitude = bonusDePericia(ficha, "fortitude", inventario, false);
    parcelasDaPericia(c, "Fortitude", fortitude);
    somarAjustes(c, ficha, "bloqueio");
    somarExtra(c, ficha, "bloqueio", "Bônus extra de Bloqueio");
    c.pericia = fortitude.total;
    return c;
  }

  function esquiva(ficha, inventario) {
    var c = conta();
    var def = defesa(ficha, inventario);
    c.soma("Defesa final", def.total, "a Defesa inteira, já com os modificadores e o extra de Defesa");
    var reflexos = bonusDePericia(ficha, "reflexos", inventario, false);
    parcelasDaPericia(c, "Reflexos", reflexos);
    somarAjustes(c, ficha, "esquiva");
    somarExtra(c, ficha, "esquiva", "Bônus extra de Esquiva");
    c.defesa = def.total;
    c.pericia = reflexos.total;
    return c;
  }

  /* O valor de uma perícia entra aberto na composição — "Reflexos ·
     Veterano +10", "Reflexos · Bônus extra +2" —, e a soma continua
     sendo exatamente o bônus da perícia. Perícia com bônus 0 e nenhuma
     parcela aparece como uma linha "+0", para a conta não esconder que
     ela foi considerada. */
  function parcelasDaPericia(c, nome, contaDaPericia) {
    if (!contaDaPericia.parcelas.length) {
      c.soma(nome, 0, "valor da perícia");
      return;
    }
    contaDaPericia.parcelas.forEach(function (x) {
      c.soma(nome + " · " + x.rotulo, x.valor, x.origem || "valor da perícia");
    });
  }

  /* =================================================================
     DESLOCAMENTO — OPRPG p.36, p.53
     ================================================================= */

  function deslocamento(ficha, inventario) {
    var c = conta();
    c.soma("Padrão", C.REGRAS.deslocamentoPadrao, "OPRPG p.36");

    efeitosDoTipo(ficha, "deslocamento", inventario).forEach(function (m) {
      c.soma(m.fonte, m.efeito.valor, m.detalhe);
    });

    var carga = capacidade(ficha, inventario);
    if (carga.sobrecarregado) {
      c.soma("Sobrecarregado", C.REGRAS.penalidadeSobrecarga.deslocamento, "OPRPG p.53");
    }

    somarAjustes(c, ficha, "deslocamento");
    c.piso(0);

    var ef = efeitosDaFicha(ficha);
    if (ef) {
      var d = EF().deslocamento(ef.cond, ef.extra, c.total);
      d.parcelas.forEach(function (x) {
        c.parcelas.push({ rotulo: x.rotulo + (x.texto ? " (" + x.texto + ")" : ""), valor: x.valor, origem: "condição ou efeito" });
        c.total += x.valor;
      });
      c.total = Math.max(0, Math.round(c.total * 10) / 10);
    }
    return c;
  }

  /* =================================================================
     CAPACIDADE DE CARGA — OPRPG p.53
     -----------------------------------------------------------------
     "Você pode carregar um número de espaços de itens igual a 5 por
     ponto de Força (se tiver Força 0, pode carregar apenas 2 espaços)."

     Três números, mostrados separados:

       calculada   a regra: Força, poderes, itens que aumentam a
                   capacidade e ajustes da mesa
       temporário  o ajuste com sinal que quem joga pôs à mão, e que
                   fica até ser tirado — nenhuma duração é inventada
       final       calculada + temporário, nunca abaixo de zero

     O ajuste temporário muda a CAPACIDADE. Ele não mexe na carga dos
     itens, na Força nem nos limites por categoria.
     ================================================================= */

  function capacidade(ficha, inventario) {
    var forca = atributo(ficha, "for");
    var comp = conta();

    var somaAtributo = efeitosDoTipo(ficha, "capacidadeForcaMais", inventario)[0];
    var extra = somaAtributo ? atributo(ficha, somaAtributo.efeito.atributo) : 0;
    var base = forca + extra;

    if (base <= 0) {
      comp.soma("Força 0", C.REGRAS.espacosForcaZero, "OPRPG p.53");
    } else if (somaAtributo) {
      comp.soma("Força " + forca + " + " + siglaDe(somaAtributo.efeito.atributo) + " " + extra,
        base * C.REGRAS.espacosPorForca, somaAtributo.fonte + " · 5 por ponto");
    } else {
      comp.soma("Força " + forca, base * C.REGRAS.espacosPorForca, "5 espaços por ponto · OPRPG p.53");
    }

    efeitosDoTipo(ficha, "capacidade", inventario).forEach(function (m) {
      comp.soma(m.fonte, m.efeito.valor, m.detalhe);
    });
    efeitosDoTipo(ficha, "capacidadeAtributo", inventario).forEach(function (m) {
      comp.soma(m.fonte, atributo(ficha, m.efeito.atributo), siglaDe(m.efeito.atributo) + " somado à capacidade");
    });

    /* Itens que aumentam a capacidade (Mochila Militar, OPRPG p.66).
       Cada item conta uma vez, não por unidade: duas mochilas na
       quantidade não viram duas mochilas vestidas. */
    itensDe(inventario).forEach(function (item) {
      var d = I() ? I().dadosDoItem(item) : { capacidade: 0 };
      if (d.capacidade > 0) comp.soma(item.nome || "Item", d.capacidade, "item que aumenta a capacidade");
    });

    somarAjustes(comp, ficha, "capacidade");

    var calculada = Math.max(0, comp.total);
    var temporario = inteiro(ficha.temporarios ? ficha.temporarios.capacidade : 0, 0);
    var bruto = calculada + temporario;
    var final = Math.max(0, bruto);

    var ocupacao = ocupacaoDoInventario(ficha, inventario);

    return {
      composicao: comp,
      calculada: calculada,
      temporario: temporario,
      final: final,
      /* O ajuste levaria abaixo de zero: a tela diz isso por extenso em
         vez de mostrar um número negativo ou esconder o ajuste. */
      abaixoDeZero: bruto < 0,
      semTemporario: calculada,

      limite: final,
      /* "Você não pode ultrapassar o dobro desse limite." */
      maximo: final * 2,
      ocupado: ocupacao.total,
      itens: ocupacao.itens,
      sobrecarregado: ocupacao.total > final,
      acimaDoMaximo: ocupacao.total > final * 2,
      forca: forca,
    };
  }

  /* =================================================================
     PROTEÇÃO EM USO
     -----------------------------------------------------------------
     No R.A.M.A. uma proteção (item do tipo "armadura") só soma na
     Defesa quando está EM USO — `ordem.emUso` no item.

     Vale UMA proteção vestida e UM escudo. "Bônus na Defesa fornecido
     por um escudo acumula com o de uma proteção" (OPRPG p. 62): o escudo
     é a proteção marcada com `ordem.protecao.tipo = "escudo"` (todo
     escudo do catálogo vem assim; um item antigo sem o tipo conta como
     proteção vestida, como sempre contou). A tela garante um de cada ao
     marcar; se vierem dois marcados (dois aparelhos, um arquivo
     importado), vale o de maior Defesa e a composição avisa.

     A Defesa de cada proteção é a cadastrada mais o que as modificações
     e maldições aplicadas somam (Reforçada, Cinética, Letárgica) — cada
     uma como parcela própria na composição.
     ================================================================= */

  function tipoDeProtecao(item) {
    var d = I() ? I().dadosDoItem(item) : ((item && item.ordem) || {});
    return d.protecao && d.protecao.tipo ? d.protecao.tipo : "";
  }

  function defesaDaProtecao(item) {
    var base = inteiro(item && item.defesa, 0);
    var ajustes = ajustesDoItem(item).defesa;
    return { base: base, ajustes: ajustes, total: base + somaDe(ajustes) };
  }

  function protecaoEmUso(inventario) {
    var protecoes = itensDe(inventario).filter(function (i) { return i.tipo === "armadura"; });
    var emUso = function (i) { return !!(i.ordem && i.ordem.emUso === true); };
    var maior = function (lista) {
      var escolhida = null;
      lista.forEach(function (i) {
        if (!escolhida || defesaDaProtecao(i).total > defesaDaProtecao(escolhida).total) escolhida = i;
      });
      return escolhida;
    };

    var vestidas = protecoes.filter(function (i) { return tipoDeProtecao(i) !== "escudo"; });
    var escudos = protecoes.filter(function (i) { return tipoDeProtecao(i) === "escudo"; });
    var marcadasVestidas = vestidas.filter(emUso);
    var marcadosEscudos = escudos.filter(emUso);
    var escolhida = maior(marcadasVestidas);
    var escudo = maior(marcadosEscudos);

    var avisos = [];
    if (marcadasVestidas.length > 1) {
      avisos.push("Mais de uma proteção está marcada em uso; só a de maior Defesa (" + escolhida.nome + ") conta. Deixe só uma em uso no inventário.");
    }
    if (marcadosEscudos.length > 1) {
      avisos.push("Mais de um escudo está marcado em uso; só o de maior Defesa (" + escudo.nome + ") conta.");
    }
    if (!marcadasVestidas.length && !marcadosEscudos.length && protecoes.length) {
      avisos.push((protecoes.length === 1 ? protecoes[0].nome + " está" : "Há proteções") +
        " no inventário, mas nenhuma está em uso. Use o botão “Usar” no cartão da proteção para somar a Defesa dela.");
    }

    return {
      item: escolhida,
      defesa: escolhida ? defesaDaProtecao(escolhida).total : 0,
      composicao: escolhida ? defesaDaProtecao(escolhida) : null,
      escudo: escudo,
      defesaEscudo: escudo ? defesaDaProtecao(escudo).total : 0,
      composicaoEscudo: escudo ? defesaDaProtecao(escudo) : null,
      /* "impõe –5 em testes de perícias que sofrem penalidade de carga"
         (OPRPG p. 62) — só a proteção pesada, e só em uso. */
      pesadaEmUso: !!escolhida && tipoDeProtecao(escolhida) === "pesada",
      marcadas: marcadasVestidas.concat(marcadosEscudos),
      protecoes: protecoes,
      avisos: avisos,
    };
  }

  function itensDe(inventario) {
    return (inventario && Array.isArray(inventario.itens)) ? inventario.itens.filter(Boolean) : [];
  }

  /* =================================================================
     MODIFICAÇÕES E MALDIÇÕES DE UM ITEM
     -----------------------------------------------------------------
     O que cada modificação ou maldição aplicada soma, lido do RETRATO
     guardado no próprio item (`ordem.modificacoes`) — nunca do catálogo,
     que pode mudar ou nem estar carregado.

       categoria   +I por modificação (OPRPG p. 60); a primeira maldição
                   do item soma II e as seguintes, I (p. 144)
       o resto     o que o retrato traz em `calculo`: espaços, Defesa,
                   ataque, dano, dados de dano, margem, alcance

     Nada disto é gravado: o item guarda os valores-base, e tirar a
     modificação desfaz a conta na leitura seguinte.
     ================================================================= */

  function ajustesDoItem(item) {
    var d = I() ? I().dadosDoItem(item) : ((item && item.ordem) || {});
    var saida = {
      categoria: [], espacos: [], defesa: [], ataque: [], dano: [], dadosDano: [],
      margem: [], margemDobra: [], alcance: [], alcanceSeDistancia: [],
      automatica: false, lista: [],
    };
    var maldicoes = 0;
    (d.modificacoes || []).forEach(function (m) {
      saida.lista.push(m);
      var fonte = m.nome;
      if (m.natureza === "maldicao") {
        maldicoes++;
        saida.categoria.push({ valor: maldicoes === 1 ? 2 : 1, fonte: fonte + " (maldição)" });
      } else if (!m.semAcrescimoDeCategoria) {
        saida.categoria.push({ valor: 1, fonte: fonte + " (modificação)" });
      }
      var c = m.calculo || {};
      ["espacos", "defesa", "ataque", "dano", "dadosDano", "margem", "alcance", "alcanceSeDistancia"].forEach(function (k) {
        if (c[k]) saida[k].push({ valor: c[k], fonte: fonte });
      });
      if (c.margemDobra) saida.margemDobra.push({ fonte: fonte });
      if (c.automatica) saida.automatica = true;
    });
    return saida;
  }

  function somaDe(lista) {
    return (lista || []).reduce(function (s, x) { return s + (Number(x.valor) || 0); }, 0);
  }

  /* Quanto cada item ocupa, com as exceções das habilidades. */
  function ocupacaoDoInventario(ficha, inventario) {
    var itens = itensDe(inventario);
    var meio = efeitosDoTipo(ficha, "meioEspaco", inventario)[0];

    var reducoes = {};
    efeitosDoTipo(ficha, "espacoItem", inventario).forEach(function (m) {
      (m.efeito.itens || []).forEach(function (id) {
        (reducoes[id] = reducoes[id] || []).push({ valor: m.efeito.reducao || 1, fonte: m.fonte });
      });
    });

    var total = 0;
    var lista = itens.map(function (item) {
      var e = I() ? I().espacosDoItem(item) : { unitario: Math.max(0, Number(item.espacos) || 0), padrao: false, quantidade: 1 };
      var unitario = e.unitario;
      var notas = [];

      /* Modificações que mudam o espaço (Discreta −1; Reforçada e
         Blindada +1): por unidade, antes de tudo, nunca abaixo de 0. */
      var ajustesEspaco = ajustesDoItem(item).espacos;
      if (ajustesEspaco.length) {
        unitario = Math.max(0, Math.round((unitario + somaDe(ajustesEspaco)) * 100) / 100);
        ajustesEspaco.forEach(function (x) {
          notas.push(x.fonte + ": " + (x.valor > 0 ? "+" : "−") + Math.abs(x.valor) + " espaço por unidade");
        });
      }

      /* Inventário Organizado: "itens [...] que normalmente ocupam meio
         espaço (0,5), em vez disso ocupam 1/4 de espaço" (SAH p.34). */
      if (meio && unitario === 0.5) {
        unitario = 0.25;
        notas.push(meio.fonte + ": meio espaço vira um quarto");
      }

      var soma = unitario * e.quantidade;

      /* Revólver compacto: treinado em Crime, UMA unidade não ocupa
         espaço (SAH p. 37). */
      var dadosArma = item.tipo === "arma" && I() ? I().dadosDoItem(item).arma : null;
      var semEspaco = dadosArma && dadosArma.semEspacoSeTreinado;
      if (semEspaco && C.pericia(semEspaco) && grauDaPericia(ficha, semEspaco) !== "destreinado") {
        var livre = Math.min(unitario, soma);
        if (livre > 0) {
          soma -= livre;
          notas.push("Treinado em " + C.pericia(semEspaco).nome + ": uma unidade não ocupa espaço");
        }
      }

      /* Mochila de Utilidades: "um item [...] ocupa 1 espaço a menos"
         (OPRPG p.29). Um item — uma unidade —, nunca abaixo de zero. */
      (reducoes[item.id] || []).forEach(function (r) {
        var tirar = Math.min(r.valor, unitario);
        if (tirar > 0) {
          soma -= tirar;
          notas.push(r.fonte + ": −" + tirar + " espaço");
        }
      });

      /* Duas casas: 0,1 × 3 é 0,3, e não 0,30000000000000004 — que
         passaria do limite por um fio. */
      soma = Math.max(0, Math.round(soma * 100) / 100);
      total += soma;

      return {
        id: item.id,
        nome: item.nome,
        unitario: e.unitario,
        unitarioEfetivo: unitario,
        quantidade: e.quantidade,
        total: soma,
        padrao: e.padrao,
        notas: notas,
      };
    });

    return { total: Math.round(total * 100) / 100, itens: lista };
  }

  /* =================================================================
     VALORES EFETIVOS DE CADA ITEM
     -----------------------------------------------------------------
     A ÚNICA origem do que a tela mostra de um item: categoria original
     e efetiva, espaços por unidade (original e efetivo), quantidade,
     ocupação total da pilha (original e efetiva) e os modificadores com
     a fonte de cada um. Sai das mesmas duas contas que a carga e os
     limites por categoria usam — cabeçalho, detalhes, carga e patente
     não têm como divergir.

     Nada disto é gravado: o item guarda só os valores-base, e os
     efetivos nascem de novo a cada leitura. Zero é um resultado válido
     e nunca é trocado pelo valor-base.
     ================================================================= */

  function itensEfetivos(ficha, inventario) {
    var ocupacao = ocupacaoDoInventario(ficha, inventario);
    var uso = usoPorCategoria(ficha, inventario);

    var categoria = {};
    var guardar = function (x) {
      categoria[x.id] = { base: x.base, efetiva: x.efetiva, reducoes: x.reducoes.slice(), acrescimos: (x.acrescimos || []).slice(), acimaDeIV: x.efetiva > 4 };
    };
    CATEGORIAS.forEach(function (n) { uso.categorias[n].itens.forEach(guardar); });
    uso.acimaDeIV.forEach(guardar);

    var porId = {};
    ocupacao.itens.forEach(function (o) {
      var totalBase = Math.round(o.unitario * o.quantidade * 100) / 100;
      porId[o.id] = {
        id: o.id,
        nome: o.nome,
        quantidade: o.quantidade,
        espacos: {
          unitario: o.unitario,
          unitarioEfetivo: o.unitarioEfetivo,
          padrao: o.padrao,
          totalBase: totalBase,
          total: o.total,
          modificado: o.total !== totalBase || o.unitarioEfetivo !== o.unitario,
          notas: o.notas.slice(),
        },
        categoria: categoria[o.id] || { base: null, efetiva: null, reducoes: [], acrescimos: [], acimaDeIV: false },
      };
    });

    return { porId: porId, ocupado: ocupacao.total, categorias: uso.categorias, semCategoria: uso.semCategoria, acimaDeIV: uso.acimaDeIV };
  }

  /* =================================================================
     ATAQUE E DANO DE UMA ARMA — OPRPG p. 54–59
     -----------------------------------------------------------------
     Os botões Ataque e Dano de uma arma da ficha de Ordem rolam com os
     números DE ORDEM — o grau e os poderes da perícia, o atributo
     efetivo —, pelo mesmo motor de dados da ficha universal.

       perícia     a escolhida na arma; sem ela, Luta para corpo a
                   corpo e Pontaria para o resto (p. 54)
       atributo    o da perícia; arma ágil usa Agilidade se for maior
                   (p. 59). A penalidade em dados da arma (motosserra:
                   −1) tira dados do teste
       ataque      o bônus da perícia, o bônus da arma e o que as
                   modificações somam (Certeira, Alongada)
       dano        os dados da arma (+ dados de Calibre Grosso), e soma
                   Força em corpo a corpo e arremesso; arco composto e
                   estilingue também; arma ágil soma o maior entre
                   Força e Agilidade; disparo e fogo, nada (p. 54)
       margem      a da arma; Predadora dobra antes de qualquer aumento,
                   e Perigosa e Mira Laser somam +2 (p. 60, 146)

     O que depende de escolha na hora — rajada, dois canos, mirar, pagar
     PE, alcance dobrado — fica com quem joga.
     ================================================================= */

  var PASSOS_ALCANCE = ["curto", "medio", "longo", "extremo"];
  var PENALIDADE_PROTECAO_PESADA = -5;

  /* `periciasUniversais`: a lista de perícias do corpo da ficha. Uma
     arma criada antes da v2.13 guarda só `periciaId`, apontando para
     essa lista; o NOME dela ("Luta") leva à perícia de Ordem. */
  function periciaDaArma(item, periciasUniversais) {
    var d = I() ? I().dadosDoItem(item) : {};
    if (d.pericia && C.pericia(d.pericia)) return d.pericia;
    if (item && item.periciaId && Array.isArray(periciasUniversais)) {
      var universal = periciasUniversais.filter(function (p) { return p && p.id === item.periciaId; })[0];
      var chave = universal ? chaveDeTexto(universal.nome) : "";
      var deOrdem = C.PERICIAS.filter(function (p) { return chaveDeTexto(p.nome) === chave; })[0];
      if (deOrdem) return deOrdem.chave;
    }
    var a = d.arma || {};
    if (a.tipo === "corpoACorpo") return "luta";
    if (a.tipo) return "pontaria";
    return "";
  }

  function aumentarDados(expressao, mais) {
    var m = /^(\d+)d(\d+)$/.exec(String(expressao || "").trim().toLowerCase());
    if (!m) return String(expressao || "");
    return Math.max(1, parseInt(m[1], 10) + (mais || 0)) + "d" + m[2];
  }

  function armaEfetiva(ficha, inventario, item, periciasUniversais) {
    var d = I() ? I().dadosDoItem(item) : {};
    var a = d.arma || {};
    var aj = ajustesDoItem(item);
    var avisos = [];

    var chave = periciaDaArma(item, periciasUniversais);
    var pe = chave ? C.pericia(chave) : null;
    if (!pe) avisos.push("Escolha a perícia de ataque de " + (item.nome || "a arma") + " no modo edição.");

    var atributoDoTeste = pe ? atributoDaPericia(ficha, chave) : "";
    var agil = false;
    if (a.agil && atributoDoTeste && atributo(ficha, "agi") > atributo(ficha, atributoDoTeste)) {
      atributoDoTeste = "agi";
      agil = true;
    }
    var quantosDados = atributoDoTeste ? atributo(ficha, atributoDoTeste) + (a.dadosAtaque || 0) : 0;
    /* O contexto do ataque: corpo a corpo ou à distância. Um efeito que
       vale só num deles não vira bônus de todo ataque. */
    var contexto = { ataque: a.tipo === "corpoACorpo" ? "corpo" : (a.tipo ? "distancia" : (chave === "luta" ? "corpo" : "distancia")) };
    var dados = dadosDoTeste(ficha, chave, Object.assign({ atributo: atributoDoTeste }, contexto), quantosDados);
    var dado = atributoDoTeste ? dados.expressao : "-2d20";

    var ataque = pe ? bonusDePericia(ficha, chave, inventario, contexto) : conta();
    if (a.bonusAtaque) ataque.soma(item.nome || "Arma", a.bonusAtaque, "bônus de ataque da arma");
    aj.ataque.forEach(function (x) { ataque.soma(x.fonte, x.valor, "modificação da arma"); });

    var maisDados = somaDe(aj.dadosDano);
    var dano = aumentarDados(item.dano, maisDados);
    var alternativo = a.danoAlternativo ? { dano: aumentarDados(a.danoAlternativo.dano, maisDados), rotulo: a.danoAlternativo.rotulo } : null;
    var tabelaD6 = a.danoPorD6 ? a.danoPorD6.map(function (x) { return aumentarDados(x, maisDados); }) : null;

    var extra = conta();
    var atributoDano = a.atributoDano || "";
    if (atributoDano === "melhor" || (atributoDano === "for" && a.agil)) {
      var forca = atributo(ficha, "for");
      var agilidade = atributo(ficha, "agi");
      if (agilidade > forca) extra.soma("Agilidade", agilidade, "arma ágil: Agilidade no lugar de Força (OPRPG p.59)");
      else extra.soma("Força", forca, "OPRPG p.54");
    } else if (atributoDano === "for") {
      extra.soma("Força", atributo(ficha, "for"), "OPRPG p.54");
    } else if (atributoDano === "agi") {
      extra.soma("Agilidade", atributo(ficha, "agi"), "atributo no dano da arma");
    }
    aj.dano.forEach(function (x) { extra.soma(x.fonte, x.valor, "modificação da arma"); });
    var efDano = efeitosDaFicha(ficha);
    if (efDano) somarEfeitos(extra, EF().bonusEm(efDano.cond, efDano.extra, ["dano", "dano:" + contexto.ataque]));

    var margemBase = inteiro(item.critico, 0);
    var margem = margemBase;
    if (margemBase > 0) {
      var faces = 21 - Math.min(20, margemBase);
      if (aj.margemDobra.length) faces *= 2;
      faces += somaDe(aj.margem);
      margem = Math.max(1, 21 - faces);
    }

    var alcance = a.alcance || "";
    var passos = somaDe(aj.alcance) + (a.tipo && a.tipo !== "corpoACorpo" ? somaDe(aj.alcanceSeDistancia) : 0);
    if (alcance && passos) {
      alcance = PASSOS_ALCANCE[Math.max(0, Math.min(PASSOS_ALCANCE.length - 1, PASSOS_ALCANCE.indexOf(alcance) + passos))];
    }

    return {
      pericia: chave,
      periciaNome: pe ? pe.nome : "",
      atributoDoTeste: atributoDoTeste,
      agilNoTeste: agil,
      dado: dado,
      dados: dados,
      contexto: contexto.ataque,
      ataque: ataque,
      dano: dano,
      alternativo: alternativo,
      tabelaD6: tabelaD6,
      extra: extra,
      danoExtraManual: item.danoExtra || "",
      margem: margem,
      margemBase: margemBase,
      multiplicador: Math.max(1, inteiro(item.multiplicador, 2)),
      alcance: alcance,
      alcanceBase: a.alcance || "",
      automatica: !!(a.automatica || aj.automatica),
      proficiencia: proficienciaDaArma(ficha, item),
      modificacoes: aj.lista,
      avisos: avisos,
    };
  }

  /* A proficiência que a arma exige, contra as da ficha. É AVISO: a
     penalidade (−2 dados no ataque, OPRPG p. 54) não é aplicada
     sozinha, porque proficiências de poderes vêm em texto e a mesa pode
     ter decidido outra coisa. */
  var PROFICIENCIA_EXIGIDA = { simples: "Armas simples", tatica: "Armas táticas", pesada: "Armas pesadas" };

  function chaveDeTexto(texto) {
    return global.RAMAUtil && global.RAMAUtil.chaveDeBusca ? global.RAMAUtil.chaveDeBusca(texto) : String(texto || "").toLowerCase();
  }

  function proficienciaDaArma(ficha, item) {
    var d = I() ? I().dadosDoItem(item) : {};
    var a = d.arma || {};
    if (!a.proficiencia) return { exigida: "", proficiente: null, texto: "" };
    var exigida = PROFICIENCIA_EXIGIDA[a.proficiencia];
    var lista = proficiencias(ficha);
    if (!lista.length) {
      return { exigida: exigida, proficiente: null, texto: "Sem classe definida, a ficha não sabe as proficiências." };
    }
    var alvo = chaveDeTexto(exigida);
    var municaoLonga = /balas longas/.test(chaveDeTexto(a.municao));
    var proficiente = lista.some(function (p) {
      var t = chaveDeTexto(p.texto);
      if (t === alvo) return true;
      if (a.proficiencia === "tatica" && t.indexOf("armas taticas") === 0) {
        if (/exceto de fogo/.test(t)) {
          return a.tipo !== "fogo" && ((/corpo a corpo/.test(t) && a.tipo === "corpoACorpo") || (/disparo/.test(t) && a.tipo === "disparo"));
        }
        if (/de fogo/.test(t)) return a.tipo === "fogo";
      }
      if (/armas de fogo que usam balas longas/.test(t)) return a.tipo === "fogo" && municaoLonga;
      return false;
    });
    return {
      exigida: exigida,
      proficiente: proficiente,
      texto: proficiente
        ? "Proficiente com " + exigida.toLowerCase() + "."
        : "Sem proficiência com " + exigida.toLowerCase() + " nesta ficha: −2 dados nos testes de ataque (OPRPG p.54). A penalidade não entra sozinha.",
    };
  }

  /* =================================================================
     PERÍCIAS — OPRPG p.40
     ================================================================= */

  function grauBaseDaPericia(ficha, chave) {
    var g = ficha.pericias && ficha.pericias[chave];
    return C.grau(g).chave;
  }

  /* O grau que vale: o da ficha, subido pelas escolhas de progressão. */
  function grauDaPericia(ficha, chave) {
    var est = estadoDe(ficha);
    if (est && est.graus && est.graus[chave]) return est.graus[chave];
    return grauBaseDaPericia(ficha, chave);
  }

  function fontesDoGrau(ficha, chave) {
    var est = estadoDe(ficha);
    return est && est.fontesGrau ? (est.fontesGrau[chave] || []) : [];
  }

  /* `teste`: o contexto do teste — { ataque: "corpo" | "distancia" } num
     ataque com arma. `false` pede o VALOR da perícia, sem os efeitos que
     valem só em testes (Bloqueio e Esquiva usam o valor, não um teste). */
  function bonusDePericia(ficha, chave, inventario, teste) {
    var c = conta();
    var pe = C.pericia(chave);
    if (!pe) return c;

    var g = C.grau(grauDaPericia(ficha, chave));
    var fontes = fontesDoGrau(ficha, chave);
    var origemGrau = fontes.length
      ? "OPRPG p.40 · " + fontes.map(function (f) { return f.fonte + " (" + f.detalhe + ")"; }).join(", ")
      : "OPRPG p.40";
    c.soma(g.nome, g.bonus, origemGrau);

    efeitosDoTipo(ficha, "bonusPericia", inventario).forEach(function (m) {
      if ((m.efeito.pericias || []).indexOf(chave) >= 0) c.soma(m.fonte, m.efeito.valor, m.detalhe);
    });

    efeitosDoTipo(ficha, "bonusPericiaAtributo", inventario).forEach(function (m) {
      if (m.efeito.pericia === chave) {
        c.soma(m.fonte, atributo(ficha, m.efeito.atributo), siglaDe(m.efeito.atributo) + " somado");
      }
    });

    efeitosDoTipo(ficha, "bonusSeTreinado", inventario).forEach(function (m) {
      if (m.efeito.pericia === chave && g.bonus > 0) c.soma(m.fonte, m.efeito.valor, m.detalhe);
    });

    /* Penalidade de carga: só nas perícias marcadas com carga. A
       proteção pesada em uso impõe a mesma −5 (OPRPG p. 62). */
    if (pe.carga) {
      var carga = capacidade(ficha, inventario);
      if (carga.sobrecarregado) {
        c.soma("Sobrecarregado", C.REGRAS.penalidadeSobrecarga.pericias, "OPRPG p.53");
      }
      var emUso = protecaoEmUso(inventario);
      if (emUso.pesadaEmUso) {
        c.soma(emUso.item.nome + " (proteção pesada em uso)", PENALIDADE_PROTECAO_PESADA, "OPRPG p.62");
      }
    }

    somarAjustes(c, ficha, "pericia:" + chave);

    var ajuste = ajusteDePericia(ficha, chave);
    if (ajuste.extra) c.soma("Bônus extra", ajuste.extra, "ajuste da ficha");

    /* Condições e efeitos aplicados — ao teste, com o contexto dele. Não
       tocam no grau nem no bônus extra: saem quando o efeito sai. */
    var ef = teste === false ? null : efeitosDaFicha(ficha);
    if (ef) {
      var t = Object.assign({ pericia: chave, atributo: atributoDaPericia(ficha, chave) }, teste || {});
      somarEfeitos(c, EF().bonusNoTeste(ef.cond, ef.extra, t));
    }
    return c;
  }

  /* O que a ficha personalizou numa perícia: o atributo usado e um bônus
     extra. Nada disto muda o grau de treinamento. */
  function ajusteDePericia(ficha, chave) {
    var a = ficha.periciasAjustes && ficha.periciasAjustes[chave];
    return {
      atributo: a && a.atributo ? a.atributo : "",
      extra: a ? inteiro(a.extra, 0) : 0,
    };
  }

  /* O atributo padrão da perícia: o do catálogo, ou o que um poder
     troca — A Força do Saber, Racionalidade Inflexível. */
  function atributoPadraoDaPericia(ficha, chave) {
    var pe = C.pericia(chave);
    if (!pe) return "";
    var escolhido = pe.atributo;
    efeitosDoTipo(ficha, "atributoBasePericia").forEach(function (m) {
      if (m.efeito.pericia === chave) escolhido = m.efeito.atributo;
    });
    return escolhido;
  }

  /* O atributo que a perícia usa. A escolha feita na ficha vale sobre o
     padrão; sem escolha, é o padrão. */
  function atributoDaPericia(ficha, chave) {
    var padrao = atributoPadraoDaPericia(ficha, chave);
    if (!padrao) return "";
    var escolhido = ajusteDePericia(ficha, chave).atributo;
    return escolhido || padrao;
  }

  /* Os dados que a perícia rola: um d20 por ponto do atributo-base.
     Atributo 0 rola 2d20 e pega o pior — que é o `-2d20` do motor. */
  function dadoDePericia(ficha, chave, teste) {
    if (!C.pericia(chave)) return "1d20";
    return dadosDoTeste(ficha, chave, teste).expressao;
  }

  /* Os dados de um teste, abertos: o atributo, os dados a mais ou a
     menos das condições e efeitos, e a expressão final. Com menos de um
     dado, rola-se mais e fica-se com o pior (efeitos.js). */
  function dadosDoTeste(ficha, chave, teste, base) {
    var pe = chave ? C.pericia(chave) : null;
    var atrib = teste && teste.atributoPuro ? teste.atributo : ((teste && teste.atributo) || (pe ? atributoDaPericia(ficha, chave) : ""));
    var valor = base !== undefined ? base : atributo(ficha, atrib);
    var c = conta();
    c.soma(atrib ? "Dados de " + siglaDe(atrib) : "Dados", valor, "1d20 por ponto do atributo");
    var ef = efeitosDaFicha(ficha);
    if (ef && (pe || (teste && teste.atributoPuro))) {
      var t = Object.assign({ pericia: pe ? chave : "", atributo: atrib }, teste || {});
      somarEfeitos(c, EF().dadosNoTeste(ef.cond, ef.extra, t));
    }
    var expressao = EF() ? EF().expressaoDeDados(c.total) : (c.total <= 0 ? "-2d20" : c.total + "d20");
    return { expressao: expressao, quantos: c.total, parcelas: c.parcelas, base: valor };
  }

  /* Teste de atributo puro (OPRPG p. 75), com os efeitos que valem em
     "todos os testes" e em testes daquele atributo. */
  function dadoDeAtributo(ficha, chave) {
    return dadosDoTeste(ficha, "", { atributoPuro: true, atributo: chave });
  }

  /* =================================================================
     PATENTE — OPRPG p.51-52
     -----------------------------------------------------------------
     A regra de patente é uma chave da ficha, "Aplicar regras de
     patente". Ligada (o padrão, e o comportamento de toda ficha
     anterior a esta chave), ela controla três coisas:

       · a patente em si, derivada dos pontos de prestígio;
       · o limite de crédito, com o efeito de Patrocinador da Ordem;
       · o limite de itens por categoria (Tabela 3.1).

     Desligada, nenhuma das três é calculada. Os pontos de prestígio
     continuam guardados, e os limites por categoria passam a ser os
     definidos à mão pela mesa — guardados à parte, para voltar a valer
     se a chave for desligada de novo depois.

     Limite `null` é "sem limite". Limite `0` é "nenhum item". Os dois
     nunca se confundem.
     ================================================================= */

  var CATEGORIAS = [0, 1, 2, 3, 4];

  function regraDePatente(ficha) {
    return !(ficha && ficha.patente && ficha.patente.aplicar === false);
  }

  function patente(ficha) {
    var pp = inteiro(ficha.prestigio, 0);

    var atual = C.PATENTES[0];
    C.PATENTES.forEach(function (p) { if (pp >= p.pp) atual = p; });

    var indiceCredito = C.CREDITOS.indexOf(atual.credito);
    efeitosDoTipo(ficha, "creditoAcima").forEach(function (m) {
      indiceCredito = Math.min(C.CREDITOS.length - 1, indiceCredito + m.efeito.valor);
    });

    var aplicada = regraDePatente(ficha);

    return {
      aplicada: aplicada,
      patente: atual,
      credito: C.CREDITOS[indiceCredito],
      creditoElevado: indiceCredito !== C.CREDITOS.indexOf(atual.credito),
      /* A tabela da patente, sempre disponível para mostrar. */
      itens: atual.itens,
      limites: limitesPorCategoria(ficha, atual),
      prestigio: pp,
    };
  }

  function limitesPorCategoria(ficha, patenteAtual) {
    var saida = {};
    if (regraDePatente(ficha)) {
      var tabela = patenteAtual || C.PATENTES[0];
      CATEGORIAS.forEach(function (n) {
        /* "Você pode escolher quantos itens quiser de categoria 0"
           (OPRPG p.53). Na tabela, "—" é nenhum item. */
        saida[n] = n === 0
          ? { limite: null, origem: "patente", texto: "Categoria 0 não tem limite (OPRPG p.53)." }
          : { limite: tabela.itens[C.CATEGORIAS_ITEM[n].rotulo] || 0, origem: "patente", texto: tabela.nome + ", Tabela 3.1 (OPRPG p.52)." };
      });
      return saida;
    }

    var manuais = ficha.patente && ficha.patente.limites ? ficha.patente.limites : {};
    CATEGORIAS.forEach(function (n) {
      var v = manuais[String(n)];
      saida[n] = {
        limite: v === null || v === undefined ? null : v,
        origem: "manual",
        texto: v === null || v === undefined ? "Sem limite definido pela mesa." : "Definido pela mesa.",
      };
    });
    return saida;
  }

  /* Os limites da patente atual, no formato manual — é com eles que a
     configuração manual começa na primeira vez que a regra é
     desligada, para nada mudar de uma hora para a outra. */
  function limitesDaTabela(ficha) {
    var atual = patente(Object.assign({}, ficha, { patente: { aplicar: true } }));
    var saida = {};
    CATEGORIAS.forEach(function (n) { saida[String(n)] = atual.limites[n].limite; });
    return saida;
  }

  /* Liga ou desliga a regra de patente. Não apaga item nenhum e não
     perde a configuração manual. */
  function definirRegraDePatente(ficha, aplicar) {
    if (!ficha.patente || typeof ficha.patente !== "object") ficha.patente = { aplicar: true, limites: null };
    var aviso = null;
    if (!aplicar && !ficha.patente.limites) {
      ficha.patente.limites = limitesDaTabela(ficha);
      aviso = "Os limites manuais começaram iguais aos da patente atual. Ajuste no modo edição.";
    }
    ficha.patente.aplicar = !!aplicar;
    return { ok: true, aviso: aviso };
  }

  /* Quantos itens de cada categoria o inventário tem, contra o limite.

     Cada UNIDADE conta como um item: três granadas de categoria I são
     três itens de categoria I. A categoria contada é a EFETIVA, depois
     das habilidades que a reduzem. */
  function usoPorCategoria(ficha, inventario) {
    var reducoes = {};
    function reduzir(id, valor, fonte) {
      (reducoes[id] = reducoes[id] || []).push({ valor: valor, fonte: fonte });
    }

    efeitosDoTipo(ficha, "categoriaItem", inventario).forEach(function (m) {
      (m.efeito.itens || []).forEach(function (id) { reduzir(id, m.efeito.reducao || 1, m.fonte); });
    });

    /* A Favorita cai I; Técnica Secreta faz cair II; Máquina de Matar,
       III (OPRPG p.26). A redução acompanha a trilha, não se soma. */
    var est = estadoDe(ficha, inventario);
    var temTrilha = function (chave) {
      return !!est && est.adquiridos.some(function (a) {
        return a.valido && a.completo !== false && !a.efeitosDesativados && a.chave === chave && a.via === "trilha";
      });
    };
    efeitosDoTipo(ficha, "categoriaFavorita", inventario).forEach(function (m) {
      var nivel = 1 + (temTrilha("tecnicaSecreta") ? 1 : 0) + (temTrilha("maquinaDeMatar") ? 1 : 0);
      (m.efeito.itens || []).forEach(function (id) { reduzir(id, nivel, m.fonte); });
    });

    var porGrupo = efeitosDoTipo(ficha, "categoriaGrupo", inventario);

    var limites = patente(ficha).limites;
    var categorias = {};
    CATEGORIAS.forEach(function (n) {
      categorias[n] = { categoria: n, rotulo: C.CATEGORIAS_ITEM[n].rotulo, usados: 0, itens: [],
        limite: limites[n].limite, origem: limites[n].origem, texto: limites[n].texto, excedido: false };
    });
    var semCategoria = [];
    /* "Categorias Acima de IV" (OPRPG p. 53): um item com modificações e
       maldições pode passar de IV; só entra no limite se habilidades o
       trouxerem de volta a IV ou menos. Acima disso ele fica numa lista
       à parte, que a tela mostra como aviso. */
    var acimaDeIV = [];

    itensDe(inventario).forEach(function (item) {
      var d = I() ? I().dadosDoItem(item) : { categoria: null, quantidade: 1, grupo: "geral" };
      if (d.categoria === null) { semCategoria.push({ id: item.id, nome: item.nome, quantidade: d.quantidade }); return; }

      var lista = (reducoes[item.id] || []).slice();
      porGrupo.forEach(function (m) {
        if (d.grupo === m.efeito.grupo) lista.push({ valor: m.efeito.reducao || 1, fonte: m.fonte });
      });

      var acrescimos = ajustesDoItem(item).categoria;
      var total = lista.reduce(function (s, r) { return s + r.valor; }, 0);
      var efetiva = Math.max(0, d.categoria + somaDe(acrescimos) - total);

      var registro = {
        id: item.id, nome: item.nome, quantidade: d.quantidade,
        base: d.categoria, efetiva: efetiva, reducoes: lista, acrescimos: acrescimos,
      };
      if (efetiva > 4) { acimaDeIV.push(registro); return; }

      categorias[efetiva].usados += d.quantidade;
      categorias[efetiva].itens.push(registro);
    });

    CATEGORIAS.forEach(function (n) {
      var cat = categorias[n];
      cat.excedido = cat.limite !== null && cat.usados > cat.limite;
    });

    return { categorias: categorias, semCategoria: semCategoria, acimaDeIV: acimaDeIV, aplicada: regraDePatente(ficha) };
  }

  /* =================================================================
     RESISTÊNCIAS E PROFICIÊNCIAS
     ================================================================= */

  var ROTULOS_DANO = { mental: "Dano mental", paranormal: "Dano paranormal" };

  function resistencias(ficha, inventario) {
    var dano = {};
    function contaDe(tipo) {
      if (!dano[tipo]) {
        var el = C.elemento(tipo);
        dano[tipo] = { tipo: tipo, rotulo: el ? el.nome : (ROTULOS_DANO[tipo] || tipo), conta: conta() };
      }
      return dano[tipo].conta;
    }

    efeitosDoTipo(ficha, "resistenciaDano", inventario).forEach(function (m) {
      if (m.efeito.dano) contaDe(m.efeito.dano).soma(m.fonte, m.efeito.valor, m.detalhe);
    });

    /* Eu Já Sabia: resistência a dano mental igual ao Intelecto
       (OPRPG p.21). */
    efeitosDoTipo(ficha, "resistenciaMental", inventario).forEach(function (m) {
      contaDe("mental").soma(m.fonte, atributo(ficha, m.efeito.atributo || "int"), m.detalhe);
    });

    var testes = conta();
    efeitosDoTipo(ficha, "resistenciaTestes", inventario).forEach(function (m) {
      testes.soma(m.fonte, m.efeito.valor, m.detalhe);
    });

    var paranormal = conta();
    efeitosDoTipo(ficha, "resistenciaTestesParanormal", inventario).forEach(function (m) {
      paranormal.soma(m.fonte, m.efeito.valor, m.detalhe);
    });

    return {
      dano: Object.keys(dano).map(function (k) { return dano[k]; }),
      testes: testes,
      testesParanormal: paranormal,
    };
  }

  function proficiencias(ficha) {
    var classe = C.classe(ficha.classe);
    var lista = classe ? classe.proficiencias.map(function (p) { return { texto: p, fonte: classe.nome }; }) : [];
    efeitosDoTipo(ficha, "proficiencia").forEach(function (m) {
      if (!lista.some(function (x) { return x.texto === m.efeito.texto; })) {
        lista.push({ texto: m.efeito.texto, fonte: m.fonte });
      }
    });
    return lista;
  }

  /* =================================================================
     RITUAIS — OPRPG p.119, p.33
     ================================================================= */

  function rituais(ficha, contexto) {
    var classe = C.classe(ficha.classe);
    var t = trilho(ficha);

    var circuloMaximo = 0;
    if (classe && classe.circuloPorNex) {
      classe.circuloPorNex.forEach(function (faixa) {
        if (t.nexEquivalente >= faixa.nex) circuloMaximo = faixa.circulo;
      });
    }

    /* O limite por Intelecto conta SÓ o que veio de Aprender Ritual:
       "ocultistas aprendem rituais através de suas habilidades de
       classe. Esses rituais não contam no limite" (OPRPG p.119). Sem o
       motor de progressão carregado, sobra o limite sem a conta —
       nenhuma página que não calcula a ficha precisa dela. */
    var est = estadoDe(ficha, contexto && contexto.inventario ? contexto.inventario : null);
    var aprendizado = est && est.rituais ? est.rituais : null;

    return {
      limitePorIntelecto: atributo(ficha, "int"),
      limite: aprendizado ? aprendizado.limite : null,
      aprendizado: aprendizado,
      circuloMaximo: circuloMaximo,
      custoPorCirculo: C.CUSTO_RITUAL,
      /* Rituais Eficientes (Graduado, OPRPG p.35) soma +5 na DT de
         resistir a TODOS os rituais do personagem. */
      dtExtra: somaDeDtDeRitual(ficha),
    };
  }

  function somaDeDtDeRitual(ficha) {
    var total = 0;
    var partes = [];
    efeitosDaProgressao(ficha).forEach(function (ef) {
      if (ef.tipo !== "dtRitual") return;
      total += inteiro(ef.valor, 0);
      partes.push({ fonte: ef.fonte, valor: inteiro(ef.valor, 0), detalhe: ef.detalhe || "" });
    });
    return { total: total, partes: partes };
  }

  /* =================================================================
     AJUSTES MANUAIS
     ================================================================= */

  function somarAjustes(c, ficha, alvo) {
    (ficha.ajustes || []).forEach(function (a) {
      if (!a || a.alvo !== alvo) return;
      c.soma(a.motivo || "Ajuste manual", a.valor, "ajuste da mesa");
    });
  }

  /* O bônus extra de Defesa, Bloqueio ou Esquiva: um número guardado na
     ficha, que fica até alguém mudar ou zerar. Zero não vira parcela. */
  var ESTATISTICAS_COM_EXTRA = ["defesa", "bloqueio", "esquiva"];
  var LIMITE_EXTRA = 99;

  function bonusExtra(ficha, qual) {
    return ficha.bonusExtra ? inteiro(ficha.bonusExtra[qual], 0) : 0;
  }

  function somarExtra(c, ficha, qual, rotulo) {
    var v = bonusExtra(ficha, qual);
    if (v) c.soma(rotulo, v, "bônus extra");
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
     `null` quer dizer "nunca foi tocado" e vale o máximo. É diferente de
     0, que quer dizer "gastou tudo".
     ================================================================= */

  function recursoAtual(ficha, qual, maximo) {
    var guardado = ficha.recursos ? ficha.recursos[qual] : null;
    if (guardado === null || guardado === undefined) return maximo;
    var n = inteiro(guardado, maximo);
    return Math.min(n, maximo);
  }

  function aparar(ficha, maximos) {
    if (!ficha.recursos) ficha.recursos = { pv: null, pe: null, san: null, pd: null };
    ["pv", "pe", "san", "pd"].forEach(function (qual) {
      var atual = ficha.recursos[qual];
      if (atual === null || atual === undefined) return;
      var teto = maximos[qual];
      if (teto === undefined || teto === null) return;
      if (inteiro(atual, 0) > teto) ficha.recursos[qual] = teto;
    });
    return ficha.recursos;
  }

  /* Os máximos que `aparar` confere, para quem mexeu nas escolhas. PE e
     SAN continuam sendo aparados com "Jogando sem Sanidade" ligada: eles
     ficam guardados e voltam quando a regra for desligada. */
  function maximosDosRecursos(ficha) {
    return {
      pv: pontosDeVida(ficha).total,
      pe: pontosDeEsforco(ficha).total,
      san: sanidade(ficha).total,
      pd: determinacao(ficha).total,
    };
  }

  /* =================================================================
     O PANORAMA
     ================================================================= */

  function calcular(ficha, inventario) {
    var pv = pontosDeVida(ficha);
    var pe = pontosDeEsforco(ficha);
    var san = sanidade(ficha);
    var comPd = usaDeterminacao(ficha);
    var pd = comPd ? determinacao(ficha) : null;

    return {
      trilho: trilho(ficha),
      exposicao: exposicao(ficha),
      estado: estadoDe(ficha, inventario),

      pv: pv, pe: pe, san: san, pd: pd,
      /* Com "Jogando sem Sanidade", os recursos em jogo são PV e PD. */
      determinacao: comPd,

      atual: {
        pv: recursoAtual(ficha, "pv", pv.total),
        pe: recursoAtual(ficha, "pe", pe.total),
        san: recursoAtual(ficha, "san", san.total),
        pd: pd ? recursoAtual(ficha, "pd", pd.total) : null,
      },

      limitePe: limiteDeEsforco(ficha),
      defesa: defesa(ficha, inventario),
      bloqueio: bloqueio(ficha, inventario),
      esquiva: esquiva(ficha, inventario),
      deslocamento: deslocamento(ficha, inventario),
      carga: capacidade(ficha, inventario),
      categorias: usoPorCategoria(ficha, inventario),
      patente: patente(ficha),
      rituais: rituais(ficha),
      resistencias: resistencias(ficha, inventario),
      proficiencias: proficiencias(ficha),
      efeitos: resumoDosEfeitos(ficha, pv, san, comPd),
    };
  }

  /* O que a tela de condições precisa, pronto: as condições valendo
     (diretas, derivadas e do rastreador), restrições, ações que pedem
     um teste ou rolagem, e os modificadores que não entram numa conta
     geral (Defesa contra corpo a corpo, custo de PE, resistência). As
     automáticas — machucado e perturbado — vêm dos recursos atuais. */
  function resumoDosEfeitos(ficha, pv, san, comPd) {
    var ef = efeitosDaFicha(ficha);
    if (!ef) return null;
    var atualPv = recursoAtual(ficha, "pv", pv.total);
    var atualSan = recursoAtual(ficha, "san", san.total);
    var automaticas = [];
    if (pv.total > 0 && atualPv * 2 < pv.total) automaticas.push({ chave: "machucado", nome: "Machucado", motivo: "PV " + atualPv + " de " + pv.total });
    if (!comPd && san.total > 0 && atualSan * 2 < san.total) automaticas.push({ chave: "perturbado", nome: "Perturbado", motivo: "Sanidade " + atualSan + " de " + san.total });
    return {
      condicoes: EF().condicoesEfetivas(ef.cond, ef.extra),
      restricoes: EF().restricoes(ef.cond, ef.extra),
      acoes: EF().acoes(ef.cond, ef.extra),
      contextuais: EF().contextuais(ef.cond, ef.extra),
      automaticas: automaticas,
    };
  }

  /* O RESUMO QUE A MESA VÊ
     -----------------------------------------------------------------
     O máximo de PV, PE e Sanidade, para os outros jogadores da campanha
     verem a vida do personagem sem receberem a ficha (ver "Resumo de
     recursos" em backend/Campanhas.gs). É calculado aqui, pelo mesmo
     motor, por quem pode ver a ficha inteira: a própria ficha ao
     gravar, a criação guiada e o painel da campanha do dono ou do
     mestre. Com "Jogando sem Sanidade", PE e Sanidade são nulos e vem o
     máximo de PD; sem ela, `pd` é nulo. */
  function resumoDeRecursos(ficha) {
    var comPd = usaDeterminacao(ficha);
    /* Inteiros, como o servidor guarda: um total fracionário nunca
       bateria com o guardado, e o painel regravaria o resumo a cada
       atualização. */
    return {
      pv: Math.round(pontosDeVida(ficha).total),
      pe: comPd ? null : Math.round(pontosDeEsforco(ficha).total),
      san: comPd ? null : Math.round(sanidade(ficha).total),
      pd: comPd ? Math.round(determinacao(ficha).total) : null,
    };
  }

  /* =================================================================
     AUXILIARES
     ================================================================= */

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

  var ELEMENTOS_DA_AFINIDADE = ["conhecimento", "energia", "morte", "sangue", "outro"];

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
      escolhas: [],
      personalizacoes: [],
      excluidas: [],
      organizacao: normalizarOrganizacao(b.organizacao),
      bonusExtra: normalizarBonusExtra(b.bonusExtra),
      periciasAjustes: normalizarAjustesDePericia(b.periciasAjustes),
      progressao: [],
      afinidade: normalizarAfinidade(b.afinidade),
      patente: normalizarPatente(b.patente),
      recursos: { pv: null, pe: null, san: null, pd: null },
      ajustes: [],
      temporarios: { pv: 0, pe: 0, san: 0, defesa: 0, capacidade: 0 },
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
      ficha.atributos[a.chave] = Math.max(0, Math.min(5, inteiro(atribBruto[a.chave], vazia.atributos[a.chave])));
    });

    var periciasBruto = (b.pericias && typeof b.pericias === "object") ? b.pericias : {};
    C.PERICIAS.forEach(function (p) {
      var g = C.grau(periciasBruto[p.chave]);
      if (g.chave !== "destreinado") ficha.pericias[p.chave] = g.chave;
    });

    /* As decisões de cada etapa. Uma escolha que deixou de ser válida
       NÃO é apagada aqui — ela é sinalizada pelo motor de progressão,
       para quem joga decidir. Sem o módulo carregado, o que veio é
       preservado como veio. */
    ficha.escolhas = E()
      ? E().normalizarEscolhas(b.escolhas)
      : (Array.isArray(b.escolhas) ? b.escolhas.slice() : []);

    /* Aprendizado de ritual fora da progressão — estudo em campo e
       concessão da mesa (v2.18). Mesmo cuidado: sem o motor, passa como
       veio, e nunca some numa gravação. */
    ficha.registrosDeRitual = (E() && E().normalizarRegistrosDeRitual)
      ? E().normalizarRegistrosDeRitual(b.registrosDeRitual)
      : (Array.isArray(b.registrosDeRitual) ? JSON.parse(JSON.stringify(b.registrosDeRitual)) : []);

    /* Sem o módulo carregado (uma página que não edita habilidades), as
       personalizações passam como vieram — nunca somem numa gravação. */
    ficha.personalizacoes = global.RAMAOrdemPersonalizacao
      ? global.RAMAOrdemPersonalizacao.normalizar(b.personalizacoes)
      : (Array.isArray(b.personalizacoes) ? JSON.parse(JSON.stringify(b.personalizacoes)) : []);
    ficha.excluidas = global.RAMAOrdemPersonalizacao
      ? global.RAMAOrdemPersonalizacao.normalizarExcluidas(b.excluidas)
      : (Array.isArray(b.excluidas) ? JSON.parse(JSON.stringify(b.excluidas)) : []);

    /* Os registros de texto livre da v2.3: guardados como vieram. */
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
    ["pv", "pe", "san", "pd"].forEach(function (qual) {
      var v = rec[qual];
      ficha.recursos[qual] = (v === null || v === undefined || v === "") ? null : inteiro(v, null);
    });

    /* Condições contadas por turno (v2.19). Sem o módulo, passam como
       vieram: uma página que não as desenha não pode apagá-las. */
    ficha.condicoes = CD()
      ? CD().normalizar(b.condicoes)
      : (b.condicoes && typeof b.condicoes === "object" ? JSON.parse(JSON.stringify(b.condicoes)) : {});

    /* Controle de componentes e registro de usos (v2.20, regras
       opcionais). Sem o módulo, passam como vieram. */
    var CS = global.RAMAOrdemConsumo || null;
    ficha.componentes = CS
      ? CS.normalizarControle(b.componentes)
      : (b.componentes && typeof b.componentes === "object" ? JSON.parse(JSON.stringify(b.componentes)) : {});
    ficha.consumos = CS
      ? CS.normalizarRegistros(b.consumos)
      : (Array.isArray(b.consumos) ? JSON.parse(JSON.stringify(b.consumos)) : []);

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
    var limiteTemp = global.RAMAOrdemInventario ? global.RAMAOrdemInventario.LIMITES.ajusteTemporario : 99;
    ficha.temporarios.capacidade = Math.max(-limiteTemp, Math.min(limiteTemp, inteiro(temp.capacidade, 0)));

    return ficha;
  }

  /* A ordem de exibição de cada aba — personalizada, de adição, A–Z ou
     Z–A — e a ordem personalizada das habilidades que vêm das regras
     (ids de aquisição). É apresentação: nenhuma conta lê isto. Modo
     ausente ou desconhecido é "personalizada", o comportamento de antes.

     v2.19 acrescenta, sem mudar a ordem de ficha nenhuma:
       rituais.criterios     ["circulo", "elemento"] — agrupar por um, pelos
                             dois, em qualquer prioridade, ou por nenhum
       pericias              { modo: az | maior | menor | personalizada,
                               ordem: [chaves de perícia] }
       habilidades.lugares   { idDaAquisição: idDaPasta } — a pasta em que
                             uma habilidade das regras aparece
       habilidades.ordem     { idDaPasta ou "*": ["r:…", "n:…"] } — a
                             posição dela entre as da mesa, naquela pasta */
  var ID_DE_ORGANIZACAO = /^[A-Za-z0-9_.:|#-]+$/;
  var CRITERIOS_DE_RITUAL = ["circulo", "elemento"];
  var MODOS_DE_PERICIA = ["az", "maior", "menor", "personalizada"];

  function listaDeIds(bruto, limite, filtro) {
    var vistas = {};
    return (Array.isArray(bruto) ? bruto : [])
      .map(function (id) { return String(id || "").slice(0, 160); })
      .filter(function (id) {
        if (!id || vistas[id] || !ID_DE_ORGANIZACAO.test(id)) return false;
        if (filtro && !filtro(id)) return false;
        vistas[id] = true;
        return true;
      })
      .slice(0, limite);
  }

  function normalizarOrganizacao(bruto) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};
    var modo = function (aba) {
      var valor = b[aba] && typeof b[aba] === "object" ? b[aba].modo : "";
      return global.RAMAUtil ? global.RAMAUtil.modoDeOrdem(valor) : (valor || "personalizada");
    };
    var hab = b.habilidades && typeof b.habilidades === "object" ? b.habilidades : {};
    var rit = b.rituais && typeof b.rituais === "object" ? b.rituais : {};
    var per = b.pericias && typeof b.pericias === "object" ? b.pericias : {};

    var lugares = {};
    if (hab.lugares && typeof hab.lugares === "object" && !Array.isArray(hab.lugares)) {
      Object.keys(hab.lugares).slice(0, 500).forEach(function (id) {
        var pasta = String(hab.lugares[id] || "").slice(0, 160);
        if (ID_DE_ORGANIZACAO.test(id) && id.length <= 160 && pasta && ID_DE_ORGANIZACAO.test(pasta)) lugares[id] = pasta;
      });
    }
    var ordemHab = {};
    if (hab.ordem && typeof hab.ordem === "object" && !Array.isArray(hab.ordem)) {
      Object.keys(hab.ordem).slice(0, 200).forEach(function (conteiner) {
        if (!ID_DE_ORGANIZACAO.test(conteiner) && conteiner !== "*") return;
        var ids = listaDeIds(hab.ordem[conteiner], 500, function (id) { return /^[rn]:/.test(id); });
        if (ids.length) ordemHab[conteiner.slice(0, 160)] = ids;
      });
    }

    return {
      habilidades: { modo: modo("habilidades"), regras: listaDeIds(hab.regras, 500), lugares: lugares, ordem: ordemHab },
      rituais: {
        modo: modo("rituais"),
        criterios: listaDeIds(rit.criterios, 2, function (c) { return CRITERIOS_DE_RITUAL.indexOf(c) >= 0; }),
      },
      inventario: { modo: modo("inventario") },
      pericias: {
        modo: MODOS_DE_PERICIA.indexOf(per.modo) >= 0 ? per.modo : "az",
        ordem: listaDeIds(per.ordem, 60, function (k) { return !!C.pericia(k); }),
      },
    };
  }

  function extraValido(valor) {
    return Math.max(-LIMITE_EXTRA, Math.min(LIMITE_EXTRA, inteiro(valor, 0)));
  }

  function normalizarBonusExtra(bruto) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};
    return { defesa: extraValido(b.defesa), bloqueio: extraValido(b.bloqueio), esquiva: extraValido(b.esquiva) };
  }

  /* Só perícias do catálogo e atributos que existem. Uma perícia sem
     atributo trocado e com extra 0 não é guardada. */
  function normalizarAjustesDePericia(bruto) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};
    var saida = {};
    Object.keys(b).forEach(function (chave) {
      if (!C.pericia(chave)) return;
      var a = b[chave];
      if (!a || typeof a !== "object") return;
      var atributo = C.ATRIBUTOS.some(function (x) { return x.chave === a.atributo; }) ? a.atributo : "";
      var extra = extraValido(a.extra);
      if (!atributo && !extra) return;
      var item = {};
      if (atributo) item.atributo = atributo;
      if (extra) item.extra = extra;
      saida[chave] = item;
    });
    return saida;
  }

  /* Grava o ajuste de uma perícia na ficha, já normalizado. `mudanca` é
     { atributo } e/ou { extra }; atributo "" restaura o padrão. */
  function definirAjusteDePericia(ficha, chave, mudanca) {
    if (!C.pericia(chave)) return false;
    var atual = Object.assign({}, (ficha.periciasAjustes || {})[chave] || {}, mudanca || {});
    var todos = Object.assign({}, ficha.periciasAjustes || {});
    todos[chave] = atual;
    ficha.periciasAjustes = normalizarAjustesDePericia(todos);
    return true;
  }

  function definirBonusExtra(ficha, qual, valor) {
    if (ESTATISTICAS_COM_EXTRA.indexOf(qual) < 0) return false;
    ficha.bonusExtra = normalizarBonusExtra(Object.assign({}, ficha.bonusExtra || {}, (function () {
      var o = {}; o[qual] = valor; return o;
    })()));
    return true;
  }

  function normalizarAfinidade(bruto) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};
    var elemento = ELEMENTOS_DA_AFINIDADE.indexOf(b.elemento) >= 0 ? b.elemento : "";
    return {
      elemento: elemento,
      /* O nome do elemento Homebrew fica guardado mesmo quando a
         afinidade é trocada para outro elemento: voltar para "Outro" não
         pede para digitar tudo de novo. */
      nomeOutro: String(b.nomeOutro || "").trim().slice(0, 60),
      adiada: b.adiada === true,
    };
  }

  function normalizarPatente(bruto) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};
    var limites = null;
    if (b.limites && typeof b.limites === "object") {
      limites = {};
      CATEGORIAS.forEach(function (n) {
        var v = b.limites[String(n)];
        if (v === null || v === undefined || v === "") { limites[String(n)] = null; return; }
        var num = inteiro(v, null);
        limites[String(n)] = num === null ? null : Math.max(0, Math.min(99, num));
      });
    }
    return {
      /* Ausente é ligada: é o comportamento de toda ficha gravada antes
         desta chave existir. */
      aplicar: b.aplicar !== false,
      limites: limites,
    };
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

    estado: estadoDe,
    modificadores: modificadores,

    atributo: atributo,
    atributoBase: atributoBase,
    composicaoDoAtributo: composicaoDoAtributo,

    pontosDeVida: pontosDeVida,
    pontosDeEsforco: pontosDeEsforco,
    sanidade: sanidade,
    determinacao: determinacao,
    usaDeterminacao: usaDeterminacao,
    REGRA_DETERMINACAO: REGRA_DETERMINACAO,
    maximosDosRecursos: maximosDosRecursos,
    limiteDeEsforco: limiteDeEsforco,
    defesa: defesa,
    bloqueio: bloqueio,
    esquiva: esquiva,
    bonusExtra: bonusExtra,
    ESTATISTICAS_COM_EXTRA: ESTATISTICAS_COM_EXTRA,
    LIMITE_EXTRA: LIMITE_EXTRA,
    deslocamento: deslocamento,
    capacidade: capacidade,
    ocupacaoDoInventario: ocupacaoDoInventario,
    itensEfetivos: itensEfetivos,
    protecaoEmUso: protecaoEmUso,
    tipoDeProtecao: tipoDeProtecao,
    defesaDaProtecao: defesaDaProtecao,
    ajustesDoItem: ajustesDoItem,
    armaEfetiva: armaEfetiva,
    periciaDaArma: periciaDaArma,
    proficienciaDaArma: proficienciaDaArma,
    patente: patente,
    regraDePatente: regraDePatente,
    definirRegraDePatente: definirRegraDePatente,
    limitesDaTabela: limitesDaTabela,
    usoPorCategoria: usoPorCategoria,
    rituais: rituais,
    resistencias: resistencias,
    proficiencias: proficiencias,

    grauDaPericia: grauDaPericia,
    grauBaseDaPericia: grauBaseDaPericia,
    fontesDoGrau: fontesDoGrau,
    bonusDePericia: bonusDePericia,
    ajusteDePericia: ajusteDePericia,
    definirAjusteDePericia: definirAjusteDePericia,
    definirBonusExtra: definirBonusExtra,
    atributoPadraoDaPericia: atributoPadraoDaPericia,
    atributoDaPericia: atributoDaPericia,
    dadoDePericia: dadoDePericia,
    dadosDoTeste: dadosDoTeste,
    dadoDeAtributo: dadoDeAtributo,
    aumentarDados: aumentarDados,

    criarAjuste: criarAjuste,
    recursoAtual: recursoAtual,
    aparar: aparar,

    calcular: calcular,
    resumoDeRecursos: resumoDeRecursos,

    normalizarOrganizacao: normalizarOrganizacao,
    CRITERIOS_DE_RITUAL: CRITERIOS_DE_RITUAL,
    MODOS_DE_PERICIA: MODOS_DE_PERICIA,
  };
})(typeof window !== "undefined" ? window : globalThis);
