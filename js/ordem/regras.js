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

      /* --- recurso: o que sobrou --- */
      recursos: { pv: null, pe: null, san: null },

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

    /* Racionalidade Inflexível troca a Presença pelo Intelecto no
       cálculo dos PE (SAH p.35). */
    var atribPe = null;
    if (qual === "pe") {
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
    var porDegrauDoPoder = qual === "pv" ? "pvPorDegrau" : (qual === "pe" ? "pePorDegrau" : null);
    if (porDegrauDoPoder) {
      efeitosDoTipo(ficha, porDegrauDoPoder).forEach(function (m) {
        var n = passosDoEfeito(ficha, m.efeito);
        c.soma(m.fonte, m.efeito.valor * n,
          m.efeito.valor + " por " + (m.efeito.trilho === "exposicao" ? "5% de NEX de exposição" : "degrau") + " × " + n);
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

    somarAjustes(c, ficha, qual);

    c.piso(0);
    return c;
  }

  function pontosDeVida(ficha) { return maximoDeRecurso(ficha, "pv"); }
  function pontosDeEsforco(ficha) { return maximoDeRecurso(ficha, "pe"); }
  function sanidade(ficha) { return maximoDeRecurso(ficha, "san"); }

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
       duas vestidas). As que não estão em uso não somam. */
    var protecao = protecaoEmUso(inventario);
    if (protecao.item) c.soma(protecao.item.nome, protecao.defesa, "proteção em uso");
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
    var fortitude = bonusDePericia(ficha, "fortitude", inventario);
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
    var reflexos = bonusDePericia(ficha, "reflexos", inventario);
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
     Defesa quando está EM USO — `ordem.emUso` no item —, e só uma
     proteção vale por vez. A tela garante isso ao marcar uma (desmarca
     as outras). Se mesmo assim vierem duas marcadas (dois aparelhos, um
     arquivo importado), vale a de maior Defesa, e a composição avisa.

     Não há distinção de escudo no modelo de item: um escudo usado junto
     com outra proteção entra como ajuste da mesa.
     ================================================================= */

  function protecaoEmUso(inventario) {
    var protecoes = itensDe(inventario).filter(function (i) { return i.tipo === "armadura"; });
    var emUso = protecoes.filter(function (i) { return !!(i.ordem && i.ordem.emUso === true); });
    var escolhida = null;
    emUso.forEach(function (i) {
      if (!escolhida || inteiro(i.defesa, 0) > inteiro(escolhida.defesa, 0)) escolhida = i;
    });

    var avisos = [];
    if (emUso.length > 1) {
      avisos.push("Mais de uma proteção está marcada em uso; só a de maior Defesa (" + escolhida.nome + ") conta. Deixe só uma em uso no inventário.");
    } else if (!emUso.length && protecoes.length) {
      avisos.push((protecoes.length === 1 ? protecoes[0].nome + " está" : "Há proteções") +
        " no inventário, mas nenhuma está em uso. Use o botão “Usar” no cartão da proteção para somar a Defesa dela.");
    }

    return {
      item: escolhida,
      defesa: escolhida ? inteiro(escolhida.defesa, 0) : 0,
      marcadas: emUso,
      protecoes: protecoes,
      avisos: avisos,
    };
  }

  function itensDe(inventario) {
    return (inventario && Array.isArray(inventario.itens)) ? inventario.itens.filter(Boolean) : [];
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

      /* Inventário Organizado: "itens [...] que normalmente ocupam meio
         espaço (0,5), em vez disso ocupam 1/4 de espaço" (SAH p.34). */
      if (meio && unitario === 0.5) {
        unitario = 0.25;
        notas.push(meio.fonte + ": meio espaço vira um quarto");
      }

      var soma = unitario * e.quantidade;

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
    CATEGORIAS.forEach(function (n) {
      uso.categorias[n].itens.forEach(function (x) {
        categoria[x.id] = { base: x.base, efetiva: x.efetiva, reducoes: x.reducoes.slice() };
      });
    });

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
        categoria: categoria[o.id] || { base: null, efetiva: null, reducoes: [] },
      };
    });

    return { porId: porId, ocupado: ocupacao.total, categorias: uso.categorias, semCategoria: uso.semCategoria };
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

  function bonusDePericia(ficha, chave, inventario) {
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

    /* Penalidade de carga: só nas perícias marcadas com carga. */
    if (pe.carga) {
      var carga = capacidade(ficha, inventario);
      if (carga.sobrecarregado) {
        c.soma("Sobrecarregado", C.REGRAS.penalidadeSobrecarga.pericias, "OPRPG p.53");
      }
    }

    somarAjustes(c, ficha, "pericia:" + chave);

    var ajuste = ajusteDePericia(ficha, chave);
    if (ajuste.extra) c.soma("Bônus extra", ajuste.extra, "ajuste da ficha");
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
  function dadoDePericia(ficha, chave) {
    var pe = C.pericia(chave);
    if (!pe) return "1d20";
    var valor = atributo(ficha, atributoDaPericia(ficha, chave));
    return valor <= 0 ? "-2d20" : valor + "d20";
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

    itensDe(inventario).forEach(function (item) {
      var d = I() ? I().dadosDoItem(item) : { categoria: null, quantidade: 1, grupo: "geral" };
      if (d.categoria === null) { semCategoria.push({ id: item.id, nome: item.nome, quantidade: d.quantidade }); return; }

      var lista = (reducoes[item.id] || []).slice();
      porGrupo.forEach(function (m) {
        if (d.grupo === m.efeito.grupo) lista.push({ valor: m.efeito.reducao || 1, fonte: m.fonte });
      });

      var total = lista.reduce(function (s, r) { return s + r.valor; }, 0);
      var efetiva = Math.max(0, d.categoria - total);

      categorias[efetiva].usados += d.quantidade;
      categorias[efetiva].itens.push({
        id: item.id, nome: item.nome, quantidade: d.quantidade,
        base: d.categoria, efetiva: efetiva, reducoes: lista,
      });
    });

    CATEGORIAS.forEach(function (n) {
      var cat = categorias[n];
      cat.excedido = cat.limite !== null && cat.usados > cat.limite;
    });

    return { categorias: categorias, semCategoria: semCategoria, aplicada: regraDePatente(ficha) };
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

  function rituais(ficha) {
    var classe = C.classe(ficha.classe);
    var t = trilho(ficha);

    var circuloMaximo = 0;
    if (classe && classe.circuloPorNex) {
      classe.circuloPorNex.forEach(function (faixa) {
        if (t.nexEquivalente >= faixa.nex) circuloMaximo = faixa.circulo;
      });
    }

    return {
      limitePorIntelecto: atributo(ficha, "int"),
      circuloMaximo: circuloMaximo,
      custoPorCirculo: C.CUSTO_RITUAL,
    };
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
     ================================================================= */

  function calcular(ficha, inventario) {
    var pv = pontosDeVida(ficha);
    var pe = pontosDeEsforco(ficha);
    var san = sanidade(ficha);

    return {
      trilho: trilho(ficha),
      exposicao: exposicao(ficha),
      estado: estadoDe(ficha, inventario),

      pv: pv, pe: pe, san: san,

      atual: {
        pv: recursoAtual(ficha, "pv", pv.total),
        pe: recursoAtual(ficha, "pe", pe.total),
        san: recursoAtual(ficha, "san", san.total),
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
    };
  }

  /* O RESUMO QUE A MESA VÊ
     -----------------------------------------------------------------
     O máximo de PV, PE e Sanidade, para os outros jogadores da campanha
     verem a vida do personagem sem receberem a ficha (ver "Resumo de
     recursos" em backend/Campanhas.gs). É calculado aqui, pelo mesmo
     motor, por quem pode ver a ficha inteira: a própria ficha ao
     gravar, a criação guiada e o painel da campanha do dono ou do
     mestre. Sanidade é nula com "Jogando sem Sanidade". */
  function resumoDeRecursos(ficha) {
    var semSanidade = !!(global.RAMAOrdemOpcionais && global.RAMAOrdemOpcionais.ligada(ficha, "semSanidade"));
    /* Inteiros, como o servidor guarda: um total fracionário nunca
       bateria com o guardado, e o painel regravaria o resumo a cada
       atualização. */
    return {
      pv: Math.round(pontosDeVida(ficha).total),
      pe: Math.round(pontosDeEsforco(ficha).total),
      san: semSanidade ? null : Math.round(sanidade(ficha).total),
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
      recursos: { pv: null, pe: null, san: null },
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
    ["pv", "pe", "san"].forEach(function (qual) {
      var v = rec[qual];
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
    var limiteTemp = global.RAMAOrdemInventario ? global.RAMAOrdemInventario.LIMITES.ajusteTemporario : 99;
    ficha.temporarios.capacidade = Math.max(-limiteTemp, Math.min(limiteTemp, inteiro(temp.capacidade, 0)));

    return ficha;
  }

  /* A ordem de exibição de cada aba — personalizada, de adição, A–Z ou
     Z–A — e a ordem personalizada das habilidades que vêm das regras
     (ids de aquisição). É apresentação: nenhuma conta lê isto. Modo
     ausente ou desconhecido é "personalizada", o comportamento de antes. */
  function normalizarOrganizacao(bruto) {
    var b = (bruto && typeof bruto === "object") ? bruto : {};
    var modo = function (aba) {
      var valor = b[aba] && typeof b[aba] === "object" ? b[aba].modo : "";
      return global.RAMAUtil ? global.RAMAUtil.modoDeOrdem(valor) : (valor || "personalizada");
    };
    var vistas = {};
    var regras = (b.habilidades && Array.isArray(b.habilidades.regras) ? b.habilidades.regras : [])
      .map(function (id) { return String(id || "").slice(0, 160); })
      .filter(function (id) {
        if (!id || vistas[id] || !/^[A-Za-z0-9_.:|#-]+$/.test(id)) return false;
        vistas[id] = true;
        return true;
      })
      .slice(0, 500);
    return {
      habilidades: { modo: modo("habilidades"), regras: regras },
      rituais: { modo: modo("rituais") },
      inventario: { modo: modo("inventario") },
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

    criarAjuste: criarAjuste,
    recursoAtual: recursoAtual,
    aparar: aparar,

    calcular: calcular,
    resumoDeRecursos: resumoDeRecursos,
  };
})(typeof window !== "undefined" ? window : globalThis);
