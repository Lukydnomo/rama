/* =====================================================================
   R.A.M.A. — Ficha de Ordem · consulta dos usos de uma perícia
   =====================================================================
   A janela que abre ao clicar no NOME de uma perícia: título, descrição
   e os usos (js/ordem/pericias-usos.js), com os nomes em destaque, o
   treinamento, a DT, a ação e a fonte de cada um; e, à parte, os usos
   que só existem dentro de uma regra específica.

   Somente leitura: abrir e fechar não mexe na ficha, não grava, não
   rola e não gasta nada. O texto vem carregado com a página — nenhuma
   consulta ao servidor.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  function PU() { return global.RAMAOrdemPericiasUsos || null; }
  function C() { return global.RAMAOrdemCatalogo || null; }

  var TREINO = { treinado: "Treinado", veterano: "Veterano", expert: "Expert" };
  var ATRIBUTO = { agi: "Agilidade", for: "Força", int: "Intelecto", pre: "Presença", vig: "Vigor" };

  function maiuscula(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }

  function etiqueta(texto, classe, dica) {
    return el("span.r-etiqueta" + (classe ? "." + classe : ""), { texto: texto, title: dica || "" });
  }

  function linhaDoUso(u) {
    var meta = [];
    if (u.treino) meta.push(TREINO[u.treino] || u.treino);
    if (u.dt) meta.push(/^(oposto|a |sem teste|variável)/i.test(u.dt) ? u.dt : "DT " + u.dt);
    if (u.acao) meta.push(u.acao);
    if (u.custo) meta.push(u.custo);
    if (u.alcance) meta.push("alcance " + u.alcance);
    return el("li.pericia-consulta__uso", {}, [
      el("p.pericia-consulta__uso-topo", {}, [
        el("strong.pericia-consulta__uso-nome", { texto: u.nome + "." }),
        meta.length ? el("span.pericia-consulta__uso-meta", { texto: " " + maiuscula(meta.join(" · ")) }) : null,
      ]),
      u.texto ? el("p.pericia-consulta__uso-texto", { texto: u.texto }) : null,
      el("p.pericia-consulta__fonte", { texto: PU().referencia(u.fonte, u.pagina) }),
    ]);
  }

  function linhaEspecifica(e) {
    return el("li.pericia-consulta__uso", {}, [
      el("p.pericia-consulta__uso-topo", {}, [
        el("strong.pericia-consulta__uso-nome", { texto: e.nome + "." }),
        el("span.pericia-consulta__uso-meta", { texto: " " + e.contexto }),
      ]),
      el("p.pericia-consulta__uso-texto", { texto: e.texto }),
      el("p.pericia-consulta__fonte", { texto: PU().referencia(e.fonte, e.pagina) }),
    ]);
  }

  /* opcoes: { nome (o que a linha mostra — Profissão com as
     especialidades), grau (o efetivo na ficha) } */
  function conteudo(chave, opcoes) {
    var o = opcoes || {};
    var p = C() ? C().pericia(chave) : null;
    var dados = PU() ? PU().consulta(chave) : null;
    var partes = [];
    if (!p || !dados) {
      partes.push(el("p", { texto: "Não há consulta cadastrada para esta perícia." }));
      return partes;
    }
    var marcas = [etiqueta(ATRIBUTO[p.atributo] || p.atributo, "", "Atributo-base")];
    if (p.treinada) marcas.push(etiqueta("somente treinada", "", PU().REGRAS_GERAIS.treino));
    if (p.carga) marcas.push(etiqueta("carga", "", PU().REGRAS_GERAIS.carga));
    if (p.kit) marcas.push(etiqueta("kit", "", PU().REGRAS_GERAIS.kit));
    partes.push(el("div.pericia-consulta__marcas", {}, marcas));
    partes.push(el("p.pericia-consulta__intro", { texto: dados.intro }));
    if (p.treinada && o.grau === "destreinado") {
      partes.push(el("p.t-mini.t-aviso", { texto: "Você não é treinado nesta perícia: ela só pode ser usada por quem é treinado. O texto continua aqui para consulta." }));
    }
    (dados.notas || []).forEach(function (n) { partes.push(el("p.t-mini.pericia-consulta__nota", { texto: n })); });
    if (dados.usos.length) {
      partes.push(el("ul.pericia-consulta__usos", { "aria-label": "Usos de " + p.nome }, dados.usos.map(linhaDoUso)));
    }
    partes.push(el("p.pericia-consulta__fonte", { texto: "Descrição: " + PU().referencia("OPRPG", dados.pagina) + ". Regras gerais de perícias: p. " + PU().REGRAS_GERAIS.pagina + "." }));
    var esp = dados.especificos || [];
    if (esp.length) {
      partes.push(el("h3.t-secao.pericia-consulta__subtitulo", { texto: "Usos em regras específicas" }));
      partes.push(el("p.t-mini", { texto: "Só valem dentro da regra indicada (cena de perseguição, de furtividade, de investigação…). Não substituem os usos acima." }));
      partes.push(el("ul.pericia-consulta__usos", { "aria-label": "Usos de " + p.nome + " em regras específicas" }, esp.map(linhaEspecifica)));
    }
    return partes;
  }

  function abrir(chave, opcoes) {
    var o = opcoes || {};
    var p = C() ? C().pericia(chave) : null;
    return UI.modal({
      titulo: o.nome || (p ? p.nome : chave),
      classe: "pericia-consulta",
      largo: false,
      fundoFecha: true,
      conteudo: [el("div.pericia-consulta__corpo", {}, conteudo(chave, o))],
    });
  }

  global.RAMAConsultaPericia = { abrir: abrir, conteudo: conteudo };
})(window);
