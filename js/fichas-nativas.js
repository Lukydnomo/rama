/* =====================================================================
   R.A.M.A. — fichas de criatura dos sistemas sem modelo próprio (v6.7)
   ---------------------------------------------------------------------
   A consulta de uma Ameaça de Oblívio, de um antagonista de Vampiro
   (V5) e de um inimigo de Malditos Goblins, cada uma com o arranjo do
   próprio livro — o que aparece junto e o que a mesa precisa ver
   primeiro. Só leitura: os dados vêm dos catálogos que cada sistema já
   carrega (ameacas-dados, antagonistas-dados, catalogo dos Goblins);
   nada é copiado nem recalculado.

     Oblívio (p. 126–150)  destaques Grau, Dano, Proteção, Velocidade,
                           Tamanho; Limite de Estresse e Regiões como
                           valores distintos; os cinco atributos, o
                           conhecimento especializado e as habilidades
                           com o tipo de ação; a tabela de recompensa
     Vampiro (p. 369–377)  dois modelos: o compacto (paradas padrão e
                           excepcionais, Vitalidade, Força de Vontade,
                           especial) e o completo (Atributos por
                           categoria, Habilidades, Disciplinas,
                           Humanidade, Potência do Sangue); Fome só onde
                           se aplica
     Goblins (p. 21–23)    o bloco curto do livro (Combate, Noção,
                           Habilidade, Vitalidade), com o bônus da arma
                           e a Proteção À PARTE dos valores base;
                           0 é zero, "—" é sem atributo, "?" é indefinido

   As classes ficha-* são as mesmas da ficha de Ordem (destaques,
   colunas, caixas): a tipografia é comum, o arranjo é de cada sistema.
   ===================================================================== */
(function (global) {
  "use strict";
  var U = global.RAMAUtil, UI = global.RAMAUI, el = U.el;

  function humanizar(k) {
    return String(k || "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, function (c) { return c.toUpperCase(); });
  }
  function nomeEm(listaOuMapa, chave) {
    if (!listaOuMapa) return humanizar(chave);
    if (Array.isArray(listaOuMapa)) { var x = listaOuMapa.filter(function (i) { return i.chave === chave; })[0]; return x ? x.nome : humanizar(chave); }
    var y = listaOuMapa[chave]; return y && y.nome ? y.nome : humanizar(chave);
  }
  function vazio(v) { return v === undefined || v === null || v === ""; }

  /* ---------- peças comuns ---------- */

  function destaques(pares) {
    var nos = pares.filter(function (p) { return !vazio(p[1]); }).map(function (p) {
      return el("div.ficha-destaque", {}, [el("span.ficha-destaque__rotulo", { texto: p[0] }), el("span.ficha-destaque__valor", { texto: String(p[1]) })]);
    });
    return nos.length ? el("div.ficha-destaques", {}, nos) : null;
  }
  /* Caixas de atributo: sigla em cima, valor grande. */
  function caixas(lista, rotulo) {
    return el("div.ficha-caixas", { role: "list", "aria-label": rotulo || "Atributos" }, lista.map(function (c) {
      return el("div.ficha-caixa", { role: "listitem", title: c.nome || c.sigla, "aria-label": (c.nome || c.sigla) + ": " + c.valor }, [
        el("span.ficha-caixa__sigla", { texto: c.sigla }),
        el("span.ficha-caixa__valor", { texto: String(c.valor) }),
      ]);
    }));
  }
  function pares(lista) {
    var itens = [];
    lista.forEach(function (p) {
      if (vazio(p[1])) return;
      itens.push(el("dt", { texto: p[0] }));
      itens.push(el("dd", {}, [typeof p[1] === "object" ? p[1] : el("span", { texto: String(p[1]) })]));
    });
    return itens.length ? el("dl.r-dados.criatura-dados", {}, itens) : null;
  }
  function painel(titulo, conteudo, classe) {
    var c = Array.isArray(conteudo) ? conteudo.filter(Boolean) : conteudo;
    if (!c || (Array.isArray(c) && !c.length)) return null;
    return UI.painel(titulo, Array.isArray(c) ? el("div.pilha--curta", { class: "pilha" }, c) : c, classe ? { classe: classe } : null);
  }
  function colunas(esquerda, direita) {
    var e = esquerda.filter(Boolean), d = direita.filter(Boolean);
    if (!e.length && !d.length) return null;
    return el("div.ficha-colunas", {}, [
      e.length ? el("div.ficha-colunas__coluna", {}, e) : null,
      d.length ? el("div.ficha-colunas__coluna", {}, d) : null,
    ]);
  }
  function efeito(nome, marca, linhaExtra, texto) {
    return el("div.ficha-efeito", {}, [
      el("p.ficha-efeito__titulo", {}, [el("strong", { texto: nome }), marca ? el("span.r-etiqueta.ficha-efeito__acao", { texto: marca }) : null]),
      linhaExtra ? el("p.t-mini.ficha-efeito__dados", { texto: linhaExtra }) : null,
      texto ? el("p.ficha-efeito__texto", { texto: texto }) : null,
    ]);
  }
  function ficha(classe, partes) { return el("div.pilha.ficha-nativa.ficha-nativa--" + classe, {}, partes.filter(Boolean)); }

  /* =================================================================
     OBLÍVIO
     ================================================================= */

  var NOMES_ACAO_OBLIVIO = { regular: "Ação Regular", extra: "Ação Extra", movimento: "Ação de Movimento", completa: "Ação Completa", passiva: "Efeito Passivo" };

  function itemDeRecompensa(x) {
    var OC = global.RAMAOblivioCatalogo || {};
    var nome = nomeEm(OC.EQUIPAMENTOS, x.item);
    return (x.qtd > 1 ? x.qtd + "× " : "") + nome + (x.lacuna ? " (o livro não define)" : "");
  }

  function oblivio(a) {
    var OC = global.RAMAOblivioCatalogo || {};
    var casas = Array.isArray(a.casas) ? a.casas.join(" ou ") : a.casas;
    var atributos = (OC.ATRIBUTOS || []).map(function (at) { return { sigla: at.sigla || at.nome.slice(0, 3).toUpperCase(), nome: at.nome, valor: a.atributos[at.chave] }; });
    var esp = (a.especializacoes || []).map(function (k) { return nomeEm(OC.CONHECIMENTOS, k); }).join(", ");
    var habs = (a.habilidades || []).map(function (h) {
      var dados = [h.dano ? "Dano: " + h.dano : "", h.alcance ? "Alcance: " + humanizar(h.alcance) : ""].filter(Boolean).join(" · ");
      return efeito(h.nome, NOMES_ACAO_OBLIVIO[h.acao] || (h.acao ? humanizar(h.acao) : ""), dados, h.resumo || "");
    });
    var rec = (a.recompensa || []).length ? el("table.ficha-tabela", {}, [
      el("caption", { texto: "Tabela de recompensa" }),
      el("thead", {}, [el("tr", {}, [el("th", { scope: "col", texto: "1d6" }), el("th", { scope: "col", texto: "Recompensa" })])]),
      el("tbody", {}, a.recompensa.map(function (r) {
        return el("tr", {}, [
          /* como o livro escreve: "2 a 4", "5 ou 6" */
          el("td", { texto: r.de === r.ate ? String(r.de) : r.de + (r.ate === r.de + 1 ? " ou " : " a ") + r.ate }),
          el("td", { texto: r.itens && r.itens.length ? r.itens.map(itemDeRecompensa).join(" e ") : "Nada" }),
        ]);
      })),
    ]) : null;
    return ficha("oblivio", [
      destaques([["Grau", a.grau], ["Dano", a.dano], ["Proteção", a.protecao], ["Velocidade", a.velocidade], ["Tamanho", a.tamanho]]),
      destaques([["Limite de Estresse", a.limiteEstresse], ["Regiões", a.regioes], ["Casas", casas]]),
      colunas([
        painel("Atributos", caixas(atributos, "Atributos da Ameaça")),
        painel("Conhecimento especializado", esp ? el("p", { texto: esp }) : null),
      ], [
        painel("Habilidades", habs),
      ]),
      rec ? painel("Recompensa", rec) : null,
    ]);
  }

  /* =================================================================
     VAMPIRO: A MÁSCARA (V5)
     ================================================================= */

  var NAT_VAMPIRO = { mortal: "Mortal", carnical: "Carniçal", animal: "Animal", vampiro: "Vampiro", criatura: "Criatura de horror" };
  var CATEGORIAS_V5 = [["fisico", "Físicos", "Físicas"], ["social", "Sociais", "Sociais"], ["mental", "Mentais", "Mentais"]];

  function vampiroCompleto(a) { return !!a.atributos; }

  function vampiro(a) {
    var VC = global.RAMAVampiroCatalogo || {};
    var VD = global.RAMAVampiroDisciplinas || {};
    var discs = a.disciplinas && typeof a.disciplinas === "object"
      ? Object.keys(a.disciplinas).map(function (k) { return nomeEm(VD.DISCIPLINAS, k) + " " + a.disciplinas[k]; }).join(", ") : "";
    /* Fome: vampiros a têm; criaturas sem Fome trocam a Checagem por
       dano (p. 376). Mortais e animais não mostram nada. */
    var fome = a.semFome ? "Não tem: o que seria Checagem de Fome vira 1 de dano Superficial à Força de Vontade ou à Vitalidade (p. 376)."
      : (a.natureza === "vampiro" ? "Sujeito à Fome (o nível vem da cena)." : "");

    if (!vampiroCompleto(a)) {
      var exc = Object.keys(a.excepcionais || {}).map(function (k) { return nomeEm(VC.HABILIDADES, k) + " " + a.excepcionais[k]; }).join(", ");
      return ficha("vampiro-compacto", [
        destaques([["Natureza", NAT_VAMPIRO[a.natureza] || a.natureza], ["Vitalidade", a.vitalidade], ["Força de Vontade", a.forcaDeVontade]]),
        colunas([
          painel("Paradas de dados padrão", a.paradas ? caixas([
            { sigla: "Físico", valor: a.paradas.fisico }, { sigla: "Social", valor: a.paradas.social }, { sigla: "Mental", valor: a.paradas.mental },
          ], "Paradas de dados padrão") : null),
          /* Vitalidade e Força de Vontade já estão nos destaques. */
          painel("Ataque", pares([["Dano extra", a.danoExtra ? "+" + a.danoExtra : ""]])),
        ], [
          painel("Paradas de dados excepcionais", exc ? el("p", { texto: exc }) : null),
          painel("Especial", [a.especial ? el("p", { texto: a.especial }) : null, fome ? el("p.t-mini", { texto: "Fome: " + fome }) : null]),
        ]),
      ]);
    }

    var porCategoria = CATEGORIAS_V5.map(function (c) {
      var lista = (VC.ATRIBUTOS || []).filter(function (at) { return at.categoria === c[0] && a.atributos[at.chave] !== undefined; });
      return el("div.ficha-grupo", {}, [el("p.t-rotulo", { texto: c[1] }), pares(lista.map(function (at) { return [at.nome, a.atributos[at.chave]]; }))]);
    });
    var habilidades = a.habilidades ? CATEGORIAS_V5.map(function (c) {
      var lista = (VC.HABILIDADES || []).filter(function (h) { return h.categoria === c[0] && a.habilidades[h.chave] !== undefined; });
      if (!lista.length) return null;
      return el("p", {}, [el("strong", { texto: c[2] + ": " }), document.createTextNode(lista.map(function (h) { return h.nome + " " + a.habilidades[h.chave]; }).join(", "))]);
    }).filter(Boolean) : [];
    return ficha("vampiro-completo", [
      destaques([["Natureza", NAT_VAMPIRO[a.natureza] || a.natureza], ["Vitalidade", a.vitalidade], ["Força de Vontade", a.forcaDeVontade],
        ["Humanidade", a.humanidade], ["Potência do Sangue", a.potencia]]),
      colunas([
        painel("Atributos", el("div.ficha-grupos", {}, porCategoria)),
        painel("Fome", fome ? el("p.t-mini", { texto: fome }) : null),
      ], [
        painel("Habilidades", habilidades),
        painel("Disciplinas", discs ? el("p", { texto: discs }) : null),
        painel("Especial", a.especial ? el("p", { texto: a.especial }) : null),
      ]),
    ]);
  }

  /* =================================================================
     MALDITOS GOBLINS
     ================================================================= */

  /* 0 é zero; null é o "-" do livro (sem atributo); a Besta Indescritível
     não tem número nenhum ("?"). */
  function valorGoblin(d, v) {
    if (d.indescritivel) return "?";
    if (v === null) return "—";
    if (v === undefined) return "?";
    return String(v);
  }
  function linhaGoblin(d) {
    var c = valorGoblin(d, d.combate);
    return "Combate " + c + (d.bonusCombate ? " (+" + d.bonusCombate + ")" : "") + " · Vitalidade " + (d.semVitalidade ? "—" : valorGoblin(d, d.vitalidade)) + (d.protecao ? " (+" + d.protecao + ")" : "");
  }

  function goblins(d) {
    var K = global.RAMAGoblinsCatalogo || {};
    var ad = d.adaptacao && K.ADAPTACOES ? K.ADAPTACOES[d.adaptacao] : null;
    function celula(rotulo, v, extra, extraRotulo) {
      return el("div.ficha-goblin__celula", {}, [
        el("span.ficha-goblin__rotulo", { texto: rotulo }),
        el("span.ficha-goblin__valor", { texto: v }),
        extra ? el("span.r-etiqueta.ficha-goblin__extra", { texto: extra, title: extraRotulo, "aria-label": extraRotulo + " " + extra }) : null,
      ]);
    }
    var bloco = el("div.ficha-goblin", { role: "group", "aria-label": "Atributos" }, [
      celula("Combate", valorGoblin(d, d.combate), d.bonusCombate ? "+" + d.bonusCombate + " arma" : "", "Bônus da arma"),
      celula("Noção", valorGoblin(d, d.nocao)),
      celula("Habilidade", valorGoblin(d, d.habilidade), d.habilidadeAlternativa ? d.habilidadeAlternativa + " na água" : "", "Habilidade alternativa"),
      celula("Vitalidade", d.semVitalidade ? "—" : valorGoblin(d, d.vitalidade), d.protecao ? "+" + d.protecao + " proteção" : "", "Proteção"),
    ]);
    var efeitos = (d.habilidades || []).map(function (h) { return efeito(h.nome, "", "", h.texto || ""); });
    return ficha("goblins", [
      bloco,
      el("p.t-mini.ficha-goblin__legenda", { texto: "0 é zero · — é atributo que não existe · ? é indefinido. O bônus da arma e a proteção ficam à parte do valor base." }),
      painel("Equipamento e efeitos", [
        pares([["Equipamento", d.equip], ["Terror", d.terror ? d.terror + " de Medo" : ""], ["Invocação", typeof d.invocacao === "number" ? (d.invocacao > 0 ? "+" : "") + d.invocacao : ""], ["Adaptação", ad ? ad.nome + " (p. " + ad.pagina + ")" : ""]]),
      ].concat(efeitos).concat([d.nota ? el("p.t-mini", { texto: d.nota }) : null,
        d.indescritivel ? el("p.t-mini", { texto: "Indescritível: sem números — a mesa decide." }) : null])),
    ]);
  }

  global.RAMAFichasNativas = {
    oblivio: oblivio, vampiro: vampiro, goblins: goblins,
    vampiroCompleto: vampiroCompleto, valorGoblin: valorGoblin, linhaGoblin: linhaGoblin, itemDeRecompensa: itemDeRecompensa,
    NOMES_ACAO_OBLIVIO: NOMES_ACAO_OBLIVIO,
  };
})(typeof window !== "undefined" ? window : globalThis);
