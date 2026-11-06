/* =====================================================================
   R.A.M.A. — Catálogo (v6.12)
   ---------------------------------------------------------------------
   O conteúdo oficial dos sistemas numa página de consulta, sem ficha nem
   campanha: escolher o sistema pela capa → escolher a categoria →
   buscar e abrir uma entrada. Substitui a antiga página Criaturas
   (criaturas/ encaminha para cá, com o sistema e Geradores).

   Os dados são os MESMOS das fichas e das campanhas, lidos daqui sem
   cópia: o catálogo de Ordem (poderes, trilhas, origens, rituais, itens,
   usos de perícia e criaturas), os catálogos de Oblívio, Vampiro e
   Malditos Goblins e os geradores de js/geradores-criaturas.js. Só
   aparecem as categorias que têm conteúdo.

   Só consulta: o filtro de fonte muda o que aparece aqui e nada mais —
   a página não define contexto de suplemento (tudo liberado), não liga
   suplementos em fichas ou campanhas e não toca nas regras de
   aquisição. As criaturas de Ordem usam a mesma biblioteca do combate,
   com a ficha completa e "Copiar para o Homebrew". O Homebrew continua
   sendo o lugar das criações personalizadas.

   O sistema e a categoria ficam no endereço (?sistema=&categoria=).
   ===================================================================== */
(function (global) {
  "use strict";
  var U = global.RAMAUtil, UI = global.RAMAUI, el = U.el;

  function S() { return global.RAMASistemas; }
  function G() { return global.RAMAGeradoresCriaturas; }
  function C() { return global.RAMAOrdemCatalogo; }
  function P() { return global.RAMAOrdemPoderes; }
  function B() { return global.RAMAOrdemBiblioteca; }
  function IT() { return global.RAMAOrdemItens; }
  function RT() { return global.RAMAOrdemRituais; }
  function PU() { return global.RAMAOrdemPericiasUsos; }
  function O() { return global.RAMAOblivioCatalogo; }
  function V() { return global.RAMAVampiroCatalogo; }
  function VD() { return global.RAMAVampiroDisciplinas; }
  function K() { return global.RAMAGoblinsCatalogo; }

  var painel = null;
  var estado = { sistema: "ordem", categoria: "", busca: "", filtros: {}, abertos: {}, limite: 60 };
  var bibliotecaAtual = null;
  var carregados = {};     // chave → true depois do carregamento sob demanda
  var falhas = {};         // chave → mensagem

  global.RAMAApp.iniciar("catalogo", async function () {
    painel = U.$("#painel-catalogo");
    var q = new URLSearchParams(location.search);
    var s = q.get("sistema");
    if (s && S().conhecido(s)) estado.sistema = S().de(s).id;
    estado.categoria = q.get("categoria") || "";
    if (q.get("busca")) estado.busca = q.get("busca").slice(0, 80);
    desenhar();
  });

  function guardarNoEndereco() {
    try {
      var q = new URLSearchParams();
      q.set("sistema", estado.sistema);
      if (estado.categoria) q.set("categoria", estado.categoria);
      history.replaceState(null, "", location.pathname + "?" + q.toString());
    } catch (e) { /* segue */ }
  }

  function nomeDoSistema(id) { var s = S().de(id); return s ? s.nome : id; }
  function humanizar(k) {
    return String(k || "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, function (c) { return c.toUpperCase(); });
  }
  function lista(obj) { return Object.keys(obj || {}).map(function (k) { return Object.assign({ chave: k }, obj[k]); }); }
  function busca() { return Array.prototype.slice.call(arguments).filter(Boolean).join(" "); }

  /* ---------------- blocos de leitura ---------------- */

  function dados(pares) {
    var p = (pares || []).filter(function (x) { return x && x[1] !== undefined && x[1] !== null && x[1] !== ""; });
    if (!p.length) return null;
    return el("dl.r-dados.catalogo-dados", {}, p.reduce(function (s, x) {
      s.push(el("dt", { texto: x[0] }));
      s.push(el("dd", { texto: String(x[1]) }));
      return s;
    }, []));
  }
  function texto(t, classe) { return t ? el("p" + (classe ? "." + classe : ".catalogo-texto"), { texto: t }) : null; }
  function listaDeTextos(itens, titulo) {
    var l = (itens || []).filter(Boolean);
    if (!l.length) return null;
    return el("div.pilha--curta", { class: "pilha" }, [titulo ? el("h4.t-rotulo", { texto: titulo }) : null, el("ul.catalogo-lista", {}, l.map(function (x) { return el("li", { texto: x }); }))]);
  }
  function corpo() { return el("div.pilha--curta.catalogo-ficha", { class: "pilha" }, Array.prototype.slice.call(arguments).filter(Boolean)); }

  /* =================================================================
     ORDEM PARANORMAL
     ================================================================= */

  function refOrdem(fonte, pagina) {
    var C0 = C();
    var nome = C0 && C0.nomeDoLivro ? C0.nomeDoLivro(fonte || "OPRPG") : (fonte || "OPRPG");
    return nome + (pagina ? ", p. " + pagina : "");
  }
  function siglaOrdem(fonte) {
    var l = C() && C().livro ? C().livro(fonte || "OPRPG") : null;
    return l ? (l.abreviacao || l.sigla) : (fonte || "OPRPG");
  }
  function nomeDoElementoOrdem(k) {
    if (!k || k === "sem") return "Sem elemento";
    var e = C() && C().elemento(k);
    return e ? e.nome : humanizar(k);
  }
  function filtroFonteOrdem() {
    return { chave: "fonte", rotulo: "Fonte", todos: "Todas as fontes", rotuloDe: function (v) { return C().curtoDoLivro ? C().curtoDoLivro(v) : v; },
      ordem: (C().LIVROS || []).map(function (l) { return l.sigla; }) };
  }

  /* Poderes e habilidades: o texto que a biblioteca da ficha copia. */
  function entradaDePoder(p, classe, extra) {
    var md = B() ? B().modelo(p, classe) : { origem: p.tipo, texto: p.resumo };
    return Object.assign({
      id: "pod:" + p.chave + (classe ? ":" + classe : ""),
      nome: p.nome,
      linha: md.origem,
      marcas: [p.elemento ? nomeDoElementoOrdem(p.elemento) : null].filter(Boolean),
      referencia: siglaOrdem(p.fonte) + (p.pagina ? " p. " + p.pagina : ""),
      tituloRef: refOrdem(p.fonte, p.pagina),
      chave: U.chaveDeBusca(busca(p.nome, md.origem, p.resumo)),
      f: { fonte: p.fonte || "OPRPG", elemento: p.elemento || "sem" },
      detalhes: function () { return corpo(texto(md.texto, "catalogo-texto catalogo-texto--longo")); },
    }, extra || {});
  }

  var ORDEM = [
    { id: "rituais", nome: "Rituais",
      ajuda: "Os rituais dos livros, com o símbolo de cada um. Para pôr um ritual numa ficha, use a biblioteca de rituais da própria ficha.",
      carregar: function () { return RT().carregar(); },
      tem: function () { return !!RT(); },
      entradas: function () {
        var cat = RT().catalogoPronto();
        return (cat ? cat.rituais : []).map(function (e) {
          return {
            id: e.id, nome: e.nome, linha: e.classificacao,
            simbolo: function () { return RT().simbolo ? RT().simbolo(e.id) : null; },
            marcas: e.elementos.map(function (k) { return { texto: RT().nomeDoElemento(k), classe: "bib-elemento.bib-elemento--" + k }; }),
            referencia: (RT().SIGLA_FONTE[e.fonte] || e.fonte) + (e.pagina > 0 ? " p. " + e.pagina : ""), tituloRef: RT().referencia(e),
            chave: U.chaveDeBusca(busca(e.nome, e.classificacao, e.resumo)),
            f: { fonte: e.fonte, elemento: e.elementos.length > 1 && e.todosOsElementos ? "varios" : (e.elementos[0] || "sem"), circulo: String(e.circulo) },
            detalhes: function () {
              return corpo(
                el("div.ritual-conjuracao-simbolo", {}, [RT().simbolo ? RT().simbolo(e.id, { grande: true }) : null,
                  el("dl.ritual-conjuracao", { "aria-label": "Conjuração" }, RT().detalhes(e).map(function (p) {
                    return el("div.ritual-conjuracao__campo", {}, [el("dt", { texto: p[0] }), el("dd", { texto: p[1] })]);
                  }))]),
                texto(e.resumo),
                listaDeTextos(e.efeitos, "Efeitos"),
                listaDeTextos((e.versoes || []).filter(function (v) { return !v.basica; }).map(function (v) { return v.nome + " (+" + v.custo + " PE, total " + v.custoTotal + " PE)" + (v.requisito ? " — requer " + v.requisito : "") + (v.alteracoes ? ": " + v.alteracoes : "") + (v.dano ? " · " + v.dano + (v.danoExtra ? "+" + v.danoExtra : "") : ""); }), "Formas avançadas"),
                listaDeTextos(RT().requisitos(e), "Requisitos"),
                listaDeTextos(RT().regrasGerais(e), "Regras que acompanham"));
            },
          };
        });
      },
      filtros: function () { return [
        { chave: "fonte", rotulo: "Fonte", todos: "Todas as fontes", rotuloDe: function (v) { return RT().ROTULO_FONTE[v] || v; } },
        { chave: "elemento", rotulo: "Elemento", todos: "Todos os elementos", rotuloDe: function (v) { return v === "varios" ? "Vários elementos" : v === "sem" ? "Sem elemento" : RT().nomeDoElemento(v); },
          ordem: RT().ELEMENTOS.map(function (x) { return x.chave; }).concat(["varios", "sem"]) },
        { chave: "circulo", rotulo: "Círculo", todos: "Todos os círculos", rotuloDe: function (v) { return RT().rotuloCirculo(Number(v)); }, ordem: ["1", "2", "3", "4"] },
      ]; } },

    { id: "itens", nome: "Itens e equipamentos",
      ajuda: "Armas, munições, proteções, equipamento geral, itens amaldiçoados e as modificações e maldições. Para levar um item a uma ficha, use o inventário da ficha.",
      carregar: function () { return IT().carregar(); },
      tem: function () { return !!IT(); },
      entradas: function () {
        var cat = IT().catalogoPronto();
        var abas = {}; IT().ABAS.forEach(function (a) { abas[a.chave] = a.rotulo; });
        return (cat ? cat.itens : []).map(function (e) {
          var grupo = e.natureza === "modificacao" ? "Modificações" : e.natureza === "maldicao" ? "Maldições" : (abas[e.aba] || e.aba);
          return {
            id: e.id, nome: e.nome, linha: e.classificacao + (e.categoria !== null && e.categoria !== undefined ? " · categoria " + IT().rotuloCategoria(e.categoria) : ""),
            marcas: [e.elemento ? { texto: nomeDoElementoOrdem(e.elemento), classe: "bib-elemento.bib-elemento--" + e.elemento } : null].filter(Boolean),
            referencia: (IT().SIGLA_FONTE[e.fonte] || e.fonte) + (e.pagina > 0 ? " p. " + e.pagina : ""), tituloRef: IT().referencia(e),
            chave: U.chaveDeBusca(busca(e.nome, e.classificacao, e.resumo, grupo)),
            f: { fonte: e.fonte, tipo: grupo, categoria: e.categoria === null || e.categoria === undefined ? "—" : String(e.categoria) },
            detalhes: function () {
              return corpo(dados(IT().detalhes(e, cat)), texto(e.resumo), listaDeTextos(e.efeitos, "Efeitos"),
                listaDeTextos(IT().requisitos(e), "Requisitos"), listaDeTextos(IT().regrasGerais(e), "Regras que acompanham"), listaDeTextos(e.notas, "Notas"));
            },
          };
        });
      },
      filtros: function () { return [
        { chave: "fonte", rotulo: "Fonte", todos: "Todas as fontes", rotuloDe: function (v) { return IT().ROTULO_FONTE[v] || v; } },
        { chave: "tipo", rotulo: "Tipo", todos: "Todos os tipos", ordem: IT().ABAS.map(function (a) { return a.rotulo; }).concat(["Modificações", "Maldições"]) },
        { chave: "categoria", rotulo: "Categoria", todos: "Todas as categorias", rotuloDe: function (v) { return v === "—" ? "Sem categoria" : "Categoria " + IT().rotuloCategoria(Number(v)); }, ordem: ["0", "1", "2", "3", "4", "—"] },
      ]; } },

    { id: "poderes", nome: "Poderes",
      ajuda: "Poderes de classe, gerais, paranormais e de Sacrifício. Escolher um poder para uma ficha é na aba Progressão dela.",
      tem: function () { return !!(P() && B()); },
      entradas: function () {
        var saida = [];
        P().PODERES_CLASSE.forEach(function (p) { saida.push(entradaDePoder(p, p.classes && p.classes[0], { f: { fonte: p.fonte || "OPRPG", elemento: "sem", tipo: p.geral ? "Poder geral" : "Poder de classe", classe: (p.classes || []).join(",") } })); });
        P().PODERES_GERAIS.forEach(function (p) { saida.push(entradaDePoder(p, "", { f: { fonte: p.fonte || "OPRPG", elemento: "sem", tipo: "Poder geral", classe: "" } })); });
        P().PODERES_PARANORMAIS.forEach(function (p) { saida.push(entradaDePoder(p, "", { f: { fonte: p.fonte || "OPRPG", elemento: p.elemento || "sem", tipo: "Poder paranormal", classe: "" } })); });
        (P().PODERES_INTENCAO || []).forEach(function (p) { saida.push(entradaDePoder(p, "", { f: { fonte: p.fonte || "OPRPG", elemento: "intencao", tipo: "Poder paranormal", classe: "" } })); });
        (P().PODERES_SACRIFICIO || []).forEach(function (p) { saida.push(entradaDePoder(p, "", { f: { fonte: p.fonte || "OPRPG", elemento: p.elemento || "sem", tipo: "Poder de Sacrifício", classe: "" } })); });
        var vistos = {};
        return saida.filter(function (x) { if (vistos[x.id]) return false; vistos[x.id] = true; return true; });
      },
      filtros: function () { return [
        filtroFonteOrdem(),
        { chave: "tipo", rotulo: "Tipo", todos: "Todos os tipos", ordem: ["Poder de classe", "Poder geral", "Poder paranormal", "Poder de Sacrifício"] },
        { chave: "classe", rotulo: "Classe", todos: "Todas as classes", multiplo: true, rotuloDe: function (v) { var c = C().classe(v); return c ? c.nome : humanizar(v); } },
        { chave: "elemento", rotulo: "Elemento", todos: "Todos os elementos", rotuloDe: nomeDoElementoOrdem, ordem: (C().ELEMENTOS_AFINIDADE || []).concat(["medo", "transmissao", "intencao", "sem"]) },
      ]; } },

    { id: "habilidades", nome: "Habilidades de classe e trilha",
      ajuda: "As habilidades automáticas de cada classe, as das trilhas (pelo NEX) e as do Sobrevivente (pelo estágio).",
      tem: function () { return !!(P() && B()); },
      entradas: function () {
        var saida = [];
        P().AUTOMATICAS.forEach(function (p) {
          (p.classes || [""]).forEach(function (cl) { saida.push(entradaDePoder(p, cl, { f: { fonte: p.fonte || "OPRPG", classe: cl, trilha: "—" } })); });
        });
        P().HABILIDADES_TRILHA.forEach(function (p) {
          var t = C().trilha(p.trilha);
          saida.push(entradaDePoder(p, "", { f: { fonte: p.fonte || "OPRPG", classe: t ? t.classe : "", trilha: p.trilha } }));
        });
        (P().HABILIDADES_SOBREVIVENTE || []).forEach(function (p) {
          saida.push(entradaDePoder(p, "sobrevivente", { f: { fonte: p.fonte || "SAH", classe: "sobrevivente", trilha: p.trilhaSobrevivente || "—" } }));
        });
        return saida;
      },
      filtros: function () { return [
        filtroFonteOrdem(),
        { chave: "classe", rotulo: "Classe", todos: "Todas as classes", rotuloDe: function (v) { var c = C().classe(v); return c ? c.nome : humanizar(v); } },
        { chave: "trilha", rotulo: "Trilha", todos: "Todas as trilhas", rotuloDe: function (v) {
          if (v === "—") return "Habilidade de classe";
          var t = C().trilha(v) || (C().trilhaSobrevivente && C().trilhaSobrevivente(v)); return t ? t.nome : humanizar(v);
        } },
      ]; } },

    { id: "origens", nome: "Origens",
      ajuda: "As origens e o poder de cada uma. A origem de uma ficha se escolhe na criação ou na aba Geral.",
      tem: function () { return !!C(); },
      entradas: function () {
        return C().ORIGENS.map(function (o) {
          var pericias = (o.pericias || []).map(function (k) { var pe = C().pericia(k); return pe ? pe.nome : k; });
          return {
            id: "org:" + o.chave, nome: o.nome, linha: "Poder: " + o.poder,
            marcas: [], referencia: siglaOrdem(o.fonte) + (o.pagina ? " p. " + o.pagina : ""), tituloRef: refOrdem(o.fonte, o.pagina),
            chave: U.chaveDeBusca(busca(o.nome, o.poder, o.resumo, pericias.join(" "))),
            f: { fonte: o.fonte || "OPRPG" },
            detalhes: function () {
              return corpo(dados([["Perícias treinadas", pericias.length ? pericias.join(", ") : (o.periciasAEscolher ? o.periciasAEscolher + " à escolha" : "")], ["Poder", o.poder], ["Fonte", refOrdem(o.fonte, o.pagina)]]),
                texto(o.resumo), texto(o.nota, "t-mini"));
            },
          };
        });
      },
      filtros: function () { return [filtroFonteOrdem()]; } },

    { id: "criaturas", nome: "Criaturas e aliados", tipo: "criaturasOrdem", tem: function () { return !!global.RAMABibliotecaCriaturas; } },

    { id: "pericias", nome: "Usos de perícias",
      ajuda: "Os usos de cada perícia, com DT, treino e ação — a mesma consulta da ficha.",
      tem: function () { return !!(PU() && C()); },
      entradas: function () {
        var saida = [];
        C().PERICIAS.forEach(function (pe) {
          var d = PU().consulta(pe.chave, { incluirDesligados: true });
          if (!d) return;
          (d.usos || []).concat(d.especificos || []).forEach(function (u, i) {
            saida.push({
              id: "uso:" + pe.chave + ":" + i, nome: u.nome, linha: pe.nome + (u.dt ? " · DT " + u.dt : "") + (u.treino ? " · " + u.treino : ""),
              marcas: [], referencia: siglaOrdem(u.fonte || "OPRPG") + (u.pagina ? " p. " + u.pagina : ""), tituloRef: refOrdem(u.fonte || "OPRPG", u.pagina),
              chave: U.chaveDeBusca(busca(u.nome, pe.nome, u.texto)),
              f: { fonte: u.fonte || "OPRPG", pericia: pe.chave },
              detalhes: function () { return corpo(dados([["Perícia", pe.nome], ["DT", u.dt], ["Treino", u.treino], ["Ação", u.acao], ["Alcance", u.alcance]]), texto(u.texto)); },
            });
          });
        });
        return saida;
      },
      filtros: function () { return [filtroFonteOrdem(),
        { chave: "pericia", rotulo: "Perícia", todos: "Todas as perícias", rotuloDe: function (v) { var pe = C().pericia(v); return pe ? pe.nome : v; } }]; } },

    { id: "geradores", nome: "Geradores", tipo: "geradores" },
  ];

  /* =================================================================
     OBLÍVIO
     ================================================================= */

  function refOblivio(pag) { return pag ? "LB p. " + pag : "LB"; }
  function entradaSimples(prefixo, x, opcoes) {
    var o = opcoes || {};
    return {
      id: prefixo + ":" + (x.chave || x.nome), nome: x.nome, linha: o.linha || "",
      marcas: o.marcas || [], referencia: o.referencia || "", tituloRef: o.tituloRef || o.referencia || "",
      chave: U.chaveDeBusca(busca(x.nome, o.linha, x.resumo || x.texto, o.busca)),
      f: o.f || {},
      detalhes: function () { return corpo(dados(o.pares || []), texto(x.resumo || x.texto), o.extra ? o.extra() : null); },
    };
  }

  var OBLIVIO = [
    { id: "criaturas", nome: "Ameaças", nativo: "oblivio" },
    { id: "equipamentos", nome: "Equipamentos e modificações", tem: function () { return !!O(); },
      ajuda: "Equipamentos (armas, vestimentas, consumíveis…) e as modificações que se aplicam a eles.",
      entradas: function () {
        return O().EQUIPAMENTOS.map(function (x) {
          var linha = [humanizar(x.tipo), x.classe ? humanizar(x.classe) : null, x.espacos ? x.espacos + " espaço(s)" : null, x.dano ? "Dano " + x.dano : null].filter(Boolean).join(" · ");
          return entradaSimples("eq", x, { linha: linha, referencia: refOblivio(x.pag), f: { tipo: "Equipamento · " + humanizar(x.tipo) },
            pares: [["Tipo", humanizar(x.tipo)], ["Classe", x.classe ? humanizar(x.classe) : ""], ["Espaços", x.espacos], ["Usos", x.usos], ["Dano", x.dano], ["Alcance", x.alcance ? humanizar(x.alcance) : ""], ["Ação", x.acao ? String(x.acao).split("|").map(humanizar).join(" ou ") : ""], ["Página", x.pag]] });
        }).concat(O().MODIFICACOES.map(function (x) {
          return entradaSimples("mod", x, { linha: "Modificação" + (x.grupo ? " · " + humanizar(x.grupo) : ""), referencia: refOblivio(x.pag), f: { tipo: "Modificação" }, pares: [["Grupo", humanizar(x.grupo)], ["Página", x.pag]] });
        }));
      },
      filtros: function () { return [{ chave: "tipo", rotulo: "Tipo", todos: "Todos" }]; } },
    { id: "habilidades", nome: "Habilidades", tem: function () { return !!O(); },
      entradas: function () {
        return O().HABILIDADES.concat(O().SOBRECARGA ? [O().SOBRECARGA] : []).map(function (x) {
          var papel = x.papel && O().papel ? O().papel[x.papel] : null;
          return entradaSimples("hab", x, { linha: [papel ? papel.nome : "Comum", x.tipo ? humanizar(x.tipo) : null, x.acao ? humanizar(x.acao) : null].filter(Boolean).join(" · "),
            referencia: refOblivio(x.pag), f: { papel: papel ? papel.nome : "Comum" }, pares: [["Papel", papel ? papel.nome : ""], ["Tipo", humanizar(x.tipo)], ["Ação", humanizar(x.acao)], ["Página", x.pag]] });
        });
      },
      filtros: function () { return [{ chave: "papel", rotulo: "Papel", todos: "Todos os papéis" }]; } },
    { id: "papeis", nome: "Papéis", tem: function () { return !!O(); },
      entradas: function () {
        return O().PAPEIS.map(function (x) {
          var hab = function (k) { var h = O().habilidade[k]; return h ? h.nome : humanizar(k); };
          var con = function (k) { var c = O().conhecimento[k]; return c ? c.nome : humanizar(k); };
          return entradaSimples("pap", x, { linha: "Estresse " + x.estresse, referencia: refOblivio(x.pag),
            pares: [["Limite de Estresse", x.estresse], ["Habilidade principal", hab(x.principal)], ["Habilidades únicas", (x.unicas || []).map(hab).join(", ")], ["Conhecimentos da lista", (x.lista || []).map(con).join(", ")], ["Página", x.pag]] });
        });
      } },
    { id: "conhecimentos", nome: "Conhecimentos", tem: function () { return !!O(); },
      entradas: function () { return O().CONHECIMENTOS.map(function (x) { return entradaSimples("con", x, { referencia: refOblivio(x.pag), pares: [["Página", x.pag]] }); }); } },
    { id: "motivacoes", nome: "Motivações", tem: function () { return !!O(); },
      entradas: function () { return O().MOTIVACOES.map(function (x) { return entradaSimples("mot", x, { linha: x.d6 ? "1d6: " + x.d6 : "", pares: [["1d6", x.d6]] }); }); } },
    { id: "mazelas", nome: "Mazelas", tem: function () { return !!O(); },
      entradas: function () { return O().MAZELAS.map(function (x) { return entradaSimples("maz", x, { referencia: refOblivio(x.pag), pares: [["Página", x.pag]] }); }); } },
    { id: "fardos", nome: "Fardos", tem: function () { return !!O(); },
      entradas: function () { return O().FARDOS.map(function (x) { return entradaSimples("far", x, { linha: (x.d6 ? "1d6: " + x.d6 : "") + (x.acumula ? " · acumula" : ""), referencia: refOblivio(x.pag), pares: [["1d6", x.d6], ["Acumula", x.acumula ? "Sim" : "Não"], ["Página", x.pag]] }); }); } },
    { id: "geradores", nome: "Geradores", tipo: "geradores" },
  ];

  /* =================================================================
     VAMPIRO: A MÁSCARA (V5)
     ================================================================= */

  function refV5(pag) { return pag ? "LB p. " + pag : "LB"; }
  function tituloV5(pag) { return "Vampiro: A Máscara, Livro Básico" + (pag ? ", p. " + pag : ""); }
  var NOME_ATRIBUTO_V5 = {};
  function nomeV5(k) {
    if (!k) return "";
    if (k === "disciplina") return "Disciplina";
    if (!Object.keys(NOME_ATRIBUTO_V5).length && V()) {
      V().ATRIBUTOS.forEach(function (a) { NOME_ATRIBUTO_V5[a.chave] = a.nome; });
      V().HABILIDADES.forEach(function (h) { NOME_ATRIBUTO_V5[h.chave] = h.nome; });
      if (VD()) Object.keys(VD().DISCIPLINAS).forEach(function (d) { NOME_ATRIBUTO_V5[d] = VD().DISCIPLINAS[d].nome; });
    }
    return NOME_ATRIBUTO_V5[k] || humanizar(k);
  }
  function parada(p) { return (p || []).map(function (par) { return (Array.isArray(par) ? par : [par]).map(nomeV5).join(" + "); }).join(" ou "); }
  function custoV5(c) {
    if (!c) return "";
    if (c.texto) return c.texto;
    if (c.gratis) return "Sem custo";
    if (c.checagens) return c.checagens + " Checagem(ns) de Fome";
    return "";
  }
  function entradaDePoderV5(x, prefixo, rotuloNivel) {
    var disc = VD().DISCIPLINAS[x.disciplina];
    return {
      id: prefixo + ":" + x.chave, nome: x.nome,
      linha: (disc ? disc.nome : "Feitiçaria de Sangue") + " · " + rotuloNivel + " " + x.nivel,
      marcas: [], referencia: refV5(x.pagina), tituloRef: tituloV5(x.pagina),
      chave: U.chaveDeBusca(busca(x.nome, disc ? disc.nome : "ritual", x.efeito)),
      f: { disciplina: x.disciplina || "ritual", nivel: String(x.nivel) },
      detalhes: function () {
        return corpo(dados([["Disciplina", disc ? disc.nome : "Feitiçaria de Sangue (Ritual)"], ["Nível", x.nivel], ["Custo", custoV5(x.custo)], ["Parada", parada(x.parada)],
          ["Resistência", parada(x.resistencia)], ["Dificuldade", x.dificuldade], ["Ingredientes", x.ingredientes], ["Duração", x.duracao ? humanizar(x.duracao) : ""],
          ["Execução", x.execucaoMinutos ? x.execucaoMinutos + " min" : x.execucaoNoites ? x.execucaoNoites + " noite(s)" : ""], ["Fonte", tituloV5(x.pagina)]]),
          texto(x.efeito), x.critico ? texto("Vitória crítica: " + x.critico, "t-mini") : null);
      },
    };
  }

  var VAMPIRO = [
    { id: "criaturas", nome: "Antagonistas", nativo: "vampiro" },
    { id: "disciplinas", nome: "Disciplinas e poderes", tem: function () { return !!VD(); },
      ajuda: "Os poderes de cada Disciplina por nível. A Alquimia Sangue-Ralo tem categoria própria.",
      entradas: function () { return VD().PODERES.filter(function (x) { return x.disciplina !== "alquimia"; }).map(function (x) { return entradaDePoderV5(x, "pod", "nível"); }); },
      filtros: function () { return [
        { chave: "disciplina", rotulo: "Disciplina", todos: "Todas as Disciplinas", rotuloDe: function (v) { return (VD().DISCIPLINAS[v] || {}).nome || humanizar(v); } },
        { chave: "nivel", rotulo: "Nível", todos: "Todos os níveis", ordem: ["1", "2", "3", "4", "5"], rotuloDe: function (v) { return "Nível " + v; } }]; } },
    { id: "rituais", nome: "Rituais de Feitiçaria de Sangue", tem: function () { return !!(VD() && VD().RITUAIS.length); },
      entradas: function () { return VD().RITUAIS.map(function (x) { return entradaDePoderV5(x, "rit", "nível"); }); },
      filtros: function () { return [{ chave: "nivel", rotulo: "Nível", todos: "Todos os níveis", ordem: ["1", "2", "3", "4", "5"], rotuloDe: function (v) { return "Nível " + v; } }]; } },
    { id: "alquimia", nome: "Alquimia Sangue-Ralo", tem: function () { return !!VD(); },
      ajuda: "As fórmulas (p. 284–287) e os três métodos de destilação.",
      entradas: function () {
        return VD().PODERES.filter(function (x) { return x.disciplina === "alquimia"; }).map(function (x) { var e = entradaDePoderV5(x, "alq", "nível"); e.f = { tipo: "Fórmula", nivel: String(x.nivel) }; return e; })
          .concat(lista(VD().METODOS_DE_ALQUIMIA).map(function (m) {
            return entradaSimples("met", m, { linha: "Método de destilação · " + parada([m.parada]), f: { tipo: "Método", nivel: "—" }, pares: [["Parada", parada([m.parada])]] });
          }));
      },
      filtros: function () { return [{ chave: "tipo", rotulo: "Tipo", todos: "Fórmulas e métodos" }, { chave: "nivel", rotulo: "Nível", todos: "Todos os níveis", ordem: ["1", "2", "3", "4", "5", "—"], rotuloDe: function (v) { return v === "—" ? "Sem nível" : "Nível " + v; } }]; } },
    { id: "clas", nome: "Clãs", tem: function () { return !!V(); },
      entradas: function () {
        return lista(V().CLAS).map(function (c) {
          return entradaSimples("cla", c, { linha: (c.disciplinas || []).map(nomeV5).join(", "), referencia: refV5(c.pagina), tituloRef: tituloV5(c.pagina),
            pares: [["Disciplinas", (c.disciplinas || []).map(nomeV5).join(", ")], ["Perdição", c.perdicao ? c.perdicao.texto + " (p. " + c.perdicao.pagina + ")" : ""],
              ["Compulsão", c.compulsao ? c.compulsao.nome + (c.compulsao.termina ? " — termina: " + c.compulsao.termina : "") : ""], ["Fonte", tituloV5(c.pagina)]] });
        });
      } },
    { id: "predadores", nome: "Tipos de predador", tem: function () { return !!V(); },
      entradas: function () {
        return lista(V().PREDADORES).map(function (p) {
          return entradaSimples("pre", p, { linha: "Caça: " + parada(p.parada), referencia: refV5(p.pagina), tituloRef: tituloV5(p.pagina),
            pares: [["Parada de caça", parada(p.parada)], ["Especialização (uma)", (p.especializacoes || []).map(function (e) { return nomeV5(e.habilidade) + " (" + e.nome + ")"; }).join(" ou ")],
              ["Disciplina (um ponto)", (p.disciplinas || []).map(nomeV5).join(" ou ")], ["Humanidade", p.humanidade ? (p.humanidade > 0 ? "+" : "") + p.humanidade : ""],
              ["Defeitos", (p.defeitos || []).map(function (d) { return humanizar(d.chave) + " " + d.pontos + (d.nota ? " (" + d.nota + ")" : ""); }).join("; ")], ["Fonte", tituloV5(p.pagina)]] });
        });
      } },
    { id: "vantagens", nome: "Vantagens e defeitos", tem: function () { return !!V(); },
      entradas: function () {
        var l = lista(V().VANTAGENS).map(function (v) {
          return entradaSimples("van", v, { linha: (v.tipo === "defeito" ? "Defeito" : "Qualidade") + " · " + v.grupo + " · " + (v.niveis || []).join(", ") + " ponto(s)", referencia: refV5(v.pagina), tituloRef: tituloV5(v.pagina),
            f: { tipo: v.tipo === "defeito" ? "Defeito" : "Qualidade", grupo: v.grupo }, pares: [["Tipo", v.tipo === "defeito" ? "Defeito" : "Qualidade"], ["Grupo", v.grupo], ["Pontos", (v.niveis || []).join(", ")], ["Fonte", tituloV5(v.pagina)]] });
        });
        var sr = V().SANGUE_RALO || {};
        ["qualidades", "defeitos"].forEach(function (k) {
          lista(sr[k]).forEach(function (v) {
            l.push(entradaSimples("sr" + k, v, { linha: (k === "defeitos" ? "Defeito" : "Qualidade") + " · Sangue-ralo", f: { tipo: k === "defeitos" ? "Defeito" : "Qualidade", grupo: "Sangue-ralo" } }));
          });
        });
        return l;
      },
      filtros: function () { return [{ chave: "tipo", rotulo: "Tipo", todos: "Qualidades e defeitos" }, { chave: "grupo", rotulo: "Grupo", todos: "Todos os grupos" }]; } },
    { id: "fichas", nome: "Fichas de Conhecimento", tem: function () { return !!V(); },
      entradas: function () {
        return lista(V().FICHAS_DE_CONHECIMENTO).map(function (fc) {
          var cla = fc.cla && V().CLAS[fc.cla] ? V().CLAS[fc.cla].nome : "";
          return {
            id: "fc:" + fc.chave, nome: fc.nome, linha: (cla ? "Exclusiva " + cla + " · " : "") + fc.niveis.length + " níveis",
            marcas: [], referencia: refV5(fc.pagina), tituloRef: tituloV5(fc.pagina),
            chave: U.chaveDeBusca(busca(fc.nome, cla, fc.niveis.map(function (n) { return n.nome + " " + n.texto; }).join(" "))),
            f: { cla: cla || "Qualquer clã" },
            detalhes: function () {
              return corpo(texto("Cada nível se compra à parte (3 XP por ponto); comprar um nível não dá os anteriores.", "t-mini"),
                el("ul.catalogo-lista", {}, fc.niveis.map(function (n) { return el("li", { texto: "● ".repeat(n.nivel).trim() + " " + n.nome + ": " + n.texto + (n.uso ? " (uma vez por " + ({ historia: "história", sessao: "sessão", cronica: "crônica" }[n.uso] || n.uso) + ")" : "") }); })),
                texto(tituloV5(fc.pagina), "t-mini"));
            },
          };
        });
      },
      filtros: function () { return [{ chave: "cla", rotulo: "Clã", todos: "Todas" }]; } },
    { id: "equipamentos", nome: "Equipamentos", tem: function () { return !!V(); },
      ajuda: "Armas e armaduras da tabela de Conflito (p. 304) e o capítulo Itens (p. 378–381). O que o livro deixa a critério do Narrador continua com o Narrador.",
      entradas: function () {
        var l = lista(V().ARMAS).map(function (a) {
          var linha = ["Dano +" + a.dano, humanizar(a.tipo), a.distancia ? "à distância" : "corpo a corpo", a.agravadoEmVampiros ? "Agravado em vampiros" : null].filter(Boolean).join(" · ");
          return entradaSimples("arm", a, { linha: linha, referencia: refV5(a.pagina), tituloRef: tituloV5(a.pagina), f: { grupo: "Armas" },
            pares: [["Dano", "+" + a.dano], ["Tipo", humanizar(a.tipo)], ["Alcance", a.distancia ? "À distância" : "Corpo a corpo"], ["Contra vampiros", a.agravadoEmVampiros ? "Dano Agravado" : ""],
              ["Incendeia", a.incendeia ? a.incendeia + " Agravado por turno" : ""], ["Dificuldade mínima", a.dificuldadeMinima], ["Ignora armadura", a.ignoraArmadura ? "Sim" : ""], ["Estaca", a.estaca ? "Sim (paralisa vampiros no coração)" : ""], ["Fonte", tituloV5(a.pagina)]] });
        }).concat(lista(V().ARMADURAS).map(function (a) {
          return entradaSimples("blind", a, { linha: "Armadura " + a.valor + (a.penalidade && a.penalidade.destreza ? " · −" + a.penalidade.destreza + " Destreza" : ""), referencia: refV5(a.pagina), tituloRef: tituloV5(a.pagina), f: { grupo: "Armaduras" },
            pares: [["Valor", a.valor], ["Contra balas", a.contraBalas === 0 ? "Não protege" : ""], ["Penalidade", a.penalidade && a.penalidade.destreza ? "−" + a.penalidade.destreza + " em Destreza" : ""], ["Fonte", tituloV5(a.pagina)]] });
        }));
        var G0 = V().GRUPOS_DE_EQUIPAMENTO || {};
        lista(V().EQUIPAMENTOS).forEach(function (x) {
          l.push(entradaSimples("item", x, { linha: (G0[x.grupo] || humanizar(x.grupo)).replace(/ —.*$/, "").replace(/ \(p\. [^)]*\)/, ""), referencia: refV5(x.paginas || x.pagina), tituloRef: tituloV5(x.paginas || x.pagina),
            f: { grupo: x.grupo === "sobrenatural" ? "Equipamento sobrenatural" : x.grupo === "arma" ? "Armas" : "Equipamento" },
            pares: [["Parada", x.parada], ["Dificuldade", x.dificuldade], ["Fonte", tituloV5(x.paginas || x.pagina)]],
            extra: x.grupo === "sobrenatural" ? function () { return texto("Equipamento sobrenatural: as mecânicas exatas, se existirem, ficam a cargo do Narrador.", "t-mini"); } : null }));
        });
        return l;
      },
      filtros: function () { return [{ chave: "grupo", rotulo: "Grupo", todos: "Todos", ordem: ["Armas", "Armaduras", "Equipamento", "Equipamento sobrenatural"] }]; } },
    { id: "mesa", nome: "Referências da mesa", tem: function () { return !!(V() && V().REFERENCIAS_DA_MESA); },
      ajuda: "Os apêndices de Projetos e de Jogo Ponderado, resumidos para consulta durante a sessão. Nada aqui é automatizado.",
      entradas: function () {
        return lista(V().REFERENCIAS_DA_MESA).map(function (r) {
          return {
            id: "mesa:" + r.chave, nome: r.nome, linha: r.apendice + " · " + r.secoes.length + " seções", marcas: [],
            referencia: refV5(r.paginas), tituloRef: tituloV5(r.paginas),
            chave: U.chaveDeBusca(busca(r.nome, r.apendice, r.secoes.map(function (s) { return s.titulo + " " + s.texto; }).join(" "))),
            f: {},
            detalhes: function () {
              return corpo.apply(null, r.secoes.map(function (s) { return el("section.catalogo-secao", {}, [el("h4.t-rotulo", { texto: s.titulo }), texto(s.texto)]); })
                .concat([texto(tituloV5(r.paginas), "t-mini")]));
            },
          };
        });
      } },
  ];

  /* =================================================================
     MALDITOS GOBLINS
     ================================================================= */

  function refGob(pag) { return pag ? "LB p. " + pag : "LB"; }
  function tituloGob(pag) { return "Malditos Goblins (3ª edição)" + (pag ? ", p. " + pag : ""); }
  function modGob(m) { return Object.keys(m || {}).map(function (k) { return humanizar(k) + " " + (m[k] > 0 ? "+" : "") + m[k]; }).join(", "); }
  function tabela(linhas, rotulo) {
    return el("ol.catalogo-tabela", { "aria-label": rotulo || "" }, linhas.map(function (t) { return el("li", { texto: t }); }));
  }

  var GOBLINS = [
    { id: "criaturas", nome: "Inimigos", nativo: "goblins" },
    { id: "armas", nome: "Armas", tem: function () { return !!K(); },
      entradas: function () {
        var E = K().ESPECIAIS_DE_ARMA || {};
        return lista(K().ARMAS).map(function (a) {
          var esp = [a.arremesso ? "arremesso" : null, a.condutor ? "condutor" : null, a.municao ? "municao" : null, a.recarga ? "recarga" : null].filter(Boolean);
          return entradaSimples("arm", a, { linha: [a.maos + " mão(s)", humanizar(a.ataque), "+" + a.bonus + " dado(s)"].concat(esp.map(function (k) { return (E[k] || {}).nome || k; })).join(" · "),
            referencia: refGob(a.pagina), tituloRef: tituloGob(a.pagina), f: { ataque: humanizar(a.ataque) },
            pares: [["Mãos", a.maos], ["Ataque", humanizar(a.ataque)], ["Bônus", "+" + a.bonus + " dado(s)"], ["Munição", a.municao], ["Fonte", tituloGob(a.pagina)]],
            extra: function () { return listaDeTextos(esp.map(function (k) { var e = E[k]; return e ? e.nome + ": " + e.texto : k; }), "Especiais"); } });
        });
      },
      filtros: function () { return [{ chave: "ataque", rotulo: "Ataque", todos: "Todos" }]; } },
    { id: "protecoes", nome: "Proteções", tem: function () { return !!K(); },
      entradas: function () {
        return lista(K().PROTECOES).map(function (p) {
          return entradaSimples("pro", p, { linha: humanizar(p.uso) + " · durabilidade " + p.durabilidade, referencia: refGob(p.pagina), tituloRef: tituloGob(p.pagina),
            pares: [["Uso", humanizar(p.uso)], ["Durabilidade", p.durabilidade], ["Fonte", tituloGob(p.pagina)]] });
        });
      } },
    { id: "equipamentos", nome: "Equipamentos", tem: function () { return !!K(); },
      entradas: function () { return lista(K().EQUIPAMENTOS).map(function (x) { return entradaSimples("eq", x, { referencia: refGob(x.pagina), tituloRef: tituloGob(x.pagina), pares: [["Fonte", tituloGob(x.pagina)]] }); }); } },
    { id: "magicos", nome: "Itens mágicos", tem: function () { return !!K(); },
      entradas: function () {
        var N = K().NOMES_TIPO_MAGICO || {};
        return lista(K().ITENS_MAGICOS).map(function (x) {
          return entradaSimples("mag", x, { linha: (N[x.tipo] || humanizar(x.tipo)) + (x.base ? " · " + humanizar(x.base) : ""), referencia: refGob(x.pagina), tituloRef: tituloGob(x.pagina),
            f: { tipo: N[x.tipo] || humanizar(x.tipo) }, pares: [["Tipo", N[x.tipo] || humanizar(x.tipo)], ["Base", x.base ? humanizar(x.base) : ""], ["Fonte", tituloGob(x.pagina)]] });
        });
      },
      filtros: function () { return [{ chave: "tipo", rotulo: "Tipo", todos: "Todos" }]; } },
    { id: "magias", nome: "Magias", tem: function () { return !!K(); },
      ajuda: "Cada magia rola 1d6 na tabela de resultados do livro.",
      entradas: function () {
        return lista(K().MAGIAS).map(function (m) {
          return {
            id: "mag:" + m.chave, nome: m.nome, linha: (m.resultados || []).length + " resultados (1d6)", marcas: [], referencia: refGob(m.pagina), tituloRef: tituloGob(m.pagina),
            chave: U.chaveDeBusca(busca(m.nome, (m.resultados || []).map(function (r) { return r.texto; }).join(" "))), f: {},
            detalhes: function () { return corpo(tabela((m.resultados || []).map(function (r) { return r.texto; }), "Resultados de " + m.nome), texto(tituloGob(m.pagina), "t-mini")); },
          };
        });
      } },
    { id: "ocupacoes", nome: "Ocupações e técnicas", tem: function () { return !!K(); },
      entradas: function () {
        return lista(K().OCUPACOES).map(function (o) {
          return {
            id: "ocu:" + o.chave, nome: o.nome, linha: modGob(o.mod) + " · " + (o.tecnicas || []).length + " técnicas", marcas: [], referencia: refGob(o.pagina), tituloRef: tituloGob(o.pagina),
            chave: U.chaveDeBusca(busca(o.nome, (o.tecnicas || []).map(function (t) { return t.nome + " " + t.texto; }).join(" "))), f: {},
            detalhes: function () {
              return corpo(dados([["Modificador", modGob(o.mod)], ["Equipamento (um)", (o.equipamento || []).map(function (e) { return e.rotulo; }).join(" ou ")], ["Fonte", tituloGob(o.pagina)]]),
                listaDeTextos((o.tecnicas || []).map(function (t) { return "Nível " + t.nivel + " · " + t.nome + ": " + t.texto; }), "Técnicas"));
            },
          };
        });
      } },
    { id: "caracteristicas", nome: "Características e descritores", tem: function () { return !!K(); },
      entradas: function () {
        return lista(K().CARACTERISTICAS).map(function (x) { return entradaSimples("car", x, { linha: "Característica", referencia: refGob(x.pagina), tituloRef: tituloGob(x.pagina), f: { tipo: "Característica" } }); })
          .concat(lista(K().DESCRITORES).map(function (x) { return entradaSimples("des", x, { linha: "Descritor · " + modGob(x.mod), f: { tipo: "Descritor" }, pares: [["Modificador", modGob(x.mod)]] }); }));
      },
      filtros: function () { return [{ chave: "tipo", rotulo: "Tipo", todos: "Todos" }]; } },
    { id: "adaptacoes", nome: "Adaptações", tem: function () { return !!K(); },
      ajuda: "Os cenários alternativos do livro, com as mudanças de cada um.",
      entradas: function () {
        var dadosDe = { cthulin: K().CTHULIN, pokepragas: K().POKE, wargoblin: K().WARGOBLIN, goblinHigh: K().GOBLIN_HIGH, vale: K().VALE };
        return lista(K().ADAPTACOES).map(function (a) {
          var d = dadosDe[a.chave] || {};
          return {
            id: "ada:" + a.chave, nome: a.nome, linha: "Adaptação", marcas: [], referencia: refGob(a.pagina), tituloRef: tituloGob(a.pagina),
            chave: U.chaveDeBusca(busca(a.nome, JSON.stringify(d).replace(/[{}\[\]":,]/g, " "))), f: {},
            detalhes: function () { return corpo.apply(null, resumoDeAdaptacao(d).concat([texto(tituloGob(a.pagina), "t-mini")])); },
          };
        });
      } },
    { id: "aventuras", nome: "Tabelas de aventura", tem: function () { return !!K(); },
      ajuda: "As tabelas do livro para montar aventuras, locais e masmorras. Para sortear, use Geradores.",
      entradas: function () {
        var K0 = K(), l = [];
        lista(K0.AVENTURAS).forEach(function (a) {
          l.push({ id: "av:" + a.chave, nome: a.nome, linha: "Tipo de aventura", marcas: [], referencia: refGob(a.pagina), tituloRef: tituloGob(a.pagina),
            chave: U.chaveDeBusca(a.nome), f: { tipo: "Aventuras" }, detalhes: function () { return corpo(texto("Tipo de aventura da tabela 1d6 (" + tituloGob(a.pagina) + ")."), tabela(K0.AVENTURA_D6.map(function (k, i) { return (i + 1) + ": " + ((K0.AVENTURAS[k] || {}).nome || k); }))); } });
        });
        lista(K0.LOCAIS).forEach(function (x) {
          l.push(entradaSimples("loc", x, { linha: "Local", referencia: refGob(x.pagina), tituloRef: tituloGob(x.pagina), f: { tipo: "Locais" },
            extra: function () { return listaDeTextos((x.conteudo || []).map(function (c) { return c.rotulo + ": " + (c.expressao || c.chance || ""); }), "Conteúdo"); } }));
        });
        lista(K0.MASMORRAS).forEach(function (x) {
          l.push(entradaSimples("mas", x, { linha: "Masmorra", f: { tipo: "Masmorras" }, extra: function () { return listaDeTextos(x.salas, "Salas"); } }));
        });
        [["inspiracao", "Inspiração (1d6)", K0.INSPIRACAO_D6, function (r) { return r.join(" · "); }],
          ["deuRuim", "Deu ruim… (1d6)", K0.DEU_RUIM_D6, String],
          ["resposta", "Resposta (1d6)", K0.RESPOSTA_D6, function (r) { return typeof r === "string" ? r : (r && r.texto) || JSON.stringify(r); }],
          ["vitima", "Vítima (1d6)", K0.VITIMA_D6, function (r) { return typeof r === "string" ? r : (r && r.texto) || ""; }],
          ["recompensa", "Recompensa (1d6)", K0.RECOMPENSA_D6, function (r) { return typeof r === "string" ? r : (r && r.texto) || ""; }],
          ["viajante", "Viajantes (2d6)", K0.VIAJANTE_2D6, function (r) { return r.texto; }],
          ["proteger", "Proteger a masmorra (2d6)", K0.PROTEGER_2D6, function (r) { return typeof r === "string" ? r : (r && r.texto) || ""; }],
          ["vizinhos", "Vizinhos (2d6)", K0.VIZINHOS_2D6, function (r) { return typeof r === "string" ? r : (r && r.texto) || ""; }],
        ].forEach(function (t) {
          if (!t[2]) return;
          var chaves = Array.isArray(t[2]) ? t[2].map(function (_, i) { return i + 1; }) : Object.keys(t[2]);
          var linhas = chaves.map(function (k, i) { var v = Array.isArray(t[2]) ? t[2][i] : t[2][k]; return k + ": " + t[3](v); });
          l.push({ id: "tab:" + t[0], nome: t[1], linha: "Tabela · " + linhas.length + " resultados", marcas: [], referencia: "LB", tituloRef: tituloGob(),
            chave: U.chaveDeBusca(busca(t[1], linhas.join(" "))), f: { tipo: "Tabelas" }, detalhes: function () { return corpo(tabela(linhas, t[1])); } });
        });
        lista(K0.REGRAS).forEach(function (x) {
          l.push(entradaSimples("reg", x, { linha: "Regra" + (x.tipo ? " · " + humanizar(x.tipo) : ""), referencia: refGob(x.pagina), tituloRef: tituloGob(x.pagina), f: { tipo: "Regras" } }));
        });
        lista(K0.MANOBRAS).forEach(function (x) {
          l.push(entradaSimples("man", x, { linha: "Manobra", referencia: refGob(x.pagina), tituloRef: tituloGob(x.pagina), f: { tipo: "Regras" } }));
        });
        return l;
      },
      filtros: function () { return [{ chave: "tipo", rotulo: "Tipo", todos: "Todas", ordem: ["Aventuras", "Locais", "Masmorras", "Tabelas", "Regras"] }]; } },
    { id: "geradores", nome: "Geradores", tipo: "geradores" },
  ];

  function resumoDeAdaptacao(d) {
    var partes = [];
    if (d.nomes) partes.push(dados(Object.keys(d.nomes).map(function (k) { var o = K().OCUPACOES[k]; return [o ? o.nome : humanizar(k), d.nomes[k]]; })));
    Object.keys(d).forEach(function (k) {
      if (k === "nomes" || k === "pagina") return;
      var v = d[k];
      if (Array.isArray(v) && v.length && v.every(function (x) { return typeof x === "string"; })) partes.push(listaDeTextos(v, humanizar(k)));
      else if (Array.isArray(v) && v.length && v[0] && v[0].texto) partes.push(listaDeTextos(v.map(function (x) { return x.texto; }), humanizar(k)));
    });
    return partes.filter(Boolean);
  }

  /* As criaturas de Oblívio, Vampiro e Goblins (vindas da antiga página
     Criaturas, v6.6–v6.11): a ficha nativa completa em js/fichas-nativas.js. */
  var NATIVOS = {
    oblivio: {
      disponivel: function () { return !!global.RAMAOblivioAmeacas; },
      nomeDoLivro: "Oblívio RPG",
      ajuda: "As Ameaças do livro, com os valores publicados. Para jogar, a mesa da Testemunha (campanha) acrescenta a Ameaça ao encontro.",
      fontes: function () { return [{ valor: "LB", rotulo: "Livro básico" }]; },
      filtro: { rotulo: "Grau", todos: "Todos os graus", opcoes: function () { return [1, 2, 3, 4, 5, 6].map(function (g) { return { valor: String(g), rotulo: "Grau " + g }; }); } },
      entradas: function () {
        return global.RAMAOblivioAmeacas.AMEACAS.map(function (a) {
          return {
            id: a.chave, nome: a.nome, fonte: "LB", filtro: String(a.grau), referencia: "Livro básico, p. " + a.pag,
            chave: U.chaveDeBusca(a.nome), marcas: ["Grau " + a.grau],
            linha: ["Dano " + a.dano, "Proteção " + a.protecao, "Estresse " + a.limiteEstresse, a.tamanho].filter(Boolean).join(" · "),
            detalhes: function () { return global.RAMAFichasNativas.oblivio(a); },
          };
        });
      },
    },
    vampiro: {
      disponivel: function () { return !!global.RAMAVampiroAntagonistas; },
      nomeDoLivro: "Vampiro: A Máscara, Livro Básico",
      ajuda: "Os antagonistas do Livro Básico (p. 369–377). Na crônica, o Narrador cria um PN a partir deles.",
      fontes: function () { return [{ valor: "LB", rotulo: "Livro básico" }]; },
      filtro: { rotulo: "Natureza", todos: "Todas", opcoes: function () {
        return [["mortal", "Mortais"], ["carnical", "Carniçais"], ["animal", "Animais"], ["vampiro", "Vampiros"], ["criatura", "Criaturas de horror"]].map(function (n) { return { valor: n[0], rotulo: n[1] }; });
      } },
      entradas: function () {
        var NAT = { mortal: "Mortal", carnical: "Carniçal", animal: "Animal", vampiro: "Vampiro", criatura: "Criatura de horror" };
        return global.RAMAVampiroAntagonistas.LISTA.map(function (a) {
          return {
            id: a.chave, nome: a.nome, fonte: "LB", filtro: a.natureza, referencia: "Livro básico, p. " + a.pagina,
            chave: U.chaveDeBusca(a.nome + " " + (NAT[a.natureza] || "")), marcas: [NAT[a.natureza] || a.natureza],
            linha: ["Vitalidade " + a.vitalidade, "Força de Vontade " + a.forcaDeVontade].join(" · "),
            detalhes: function () { return global.RAMAFichasNativas.vampiro(a); },
          };
        });
      },
    },
    goblins: {
      disponivel: function () { return !!(global.RAMAGoblinsCatalogo && global.RAMAGoblinsCatalogo.INIMIGOS); },
      nomeDoLivro: "Malditos Goblins (3ª edição)",
      ajuda: "Os inimigos do livro. No Covil da campanha, o mestre os põe em combate.",
      fontes: function () { return [{ valor: "LB", rotulo: "Livro básico" }]; },
      filtro: { rotulo: "Adaptação", todos: "Todas", opcoes: function () {
        var A = global.RAMAGoblinsCatalogo.ADAPTACOES;
        return [{ valor: "-", rotulo: "Sem adaptação" }].concat(Object.keys(A).map(function (k) { return { valor: k, rotulo: A[k].nome }; }));
      } },
      entradas: function () {
        var K = global.RAMAGoblinsCatalogo;
        return Object.keys(K.INIMIGOS).map(function (k) {
          var d = K.INIMIGOS[k];
          var ad = d.adaptacao && K.ADAPTACOES[d.adaptacao];
          return {
            id: k, nome: d.nome, fonte: "LB", filtro: d.adaptacao || "-", referencia: "Livro básico, p. " + d.pagina,
            chave: U.chaveDeBusca(d.nome + " " + (d.especie || "") + " " + (ad ? ad.nome : "")),
            marcas: [ad ? ad.nome : null, d.especie ? humanizar(d.especie) : null].filter(Boolean),
            linha: global.RAMAFichasNativas.linhaGoblin(d),
            detalhes: function () { return global.RAMAFichasNativas.goblins(d); },
          };
        });
      },
    },
  };


  var CATEGORIAS = { ordem: ORDEM, oblivio: OBLIVIO, vampiro: VAMPIRO, goblins: GOBLINS };

  /* Só as categorias com conteúdo. As carregadas sob demanda (rituais e
     itens de Ordem) contam como tendo conteúdo quando o módulo existe. */
  function categoriasDe(sistema) {
    return (CATEGORIAS[sistema] || []).filter(function (c) {
      if (c.tipo === "geradores") return !!(G() && G().doSistema(sistema).length);
      if (c.nativo) { var n = NATIVOS[c.nativo]; return !!(n && n.disponivel()); }
      if (c.tem && !c.tem()) return false;
      if (c.carregar || c.tipo) return true;
      try { return c.entradas().length > 0; } catch (e) { return false; }
    });
  }
  function contagemDe(sistema, c) {
    try {
      if (c.tipo === "geradores") return G().doSistema(sistema).length;
      if (c.nativo) return NATIVOS[c.nativo].entradas().length;
      if (c.tipo) return null;
      if (c.carregar && !carregados[sistema + ":" + c.id]) return null;
      return c.entradas().length;
    } catch (e) { return null; }
  }

  /* ---------------- cabeçalho, capas e categorias ---------------- */

  function trocarSistema(id, comFoco) {
    if (id === estado.sistema) return;
    estado.sistema = id;
    estado.categoria = "";
    limparConsulta();
    desenhar();
    if (comFoco) { var novo = painel.querySelector('.estante-sistemas__opcao[data-sistema="' + id + '"]'); if (novo) novo.focus(); }
  }
  function limparConsulta() { estado.busca = ""; estado.filtros = {}; estado.abertos = {}; estado.limite = 60; }

  function seletorDeSistema() {
    var l = S().lista().filter(function (s) { return CATEGORIAS[s.id]; });
    var Capa = global.RAMACapaSistema;
    function mover(ev, i) {
      var passo = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[ev.key];
      var alvo = null;
      if (passo) alvo = l[(i + passo + l.length) % l.length];
      else if (ev.key === "Home") alvo = l[0];
      else if (ev.key === "End") alvo = l[l.length - 1];
      if (!alvo) return;
      ev.preventDefault();
      trocarSistema(alvo.id, true);
    }
    return el("div.estante-sistemas", { role: "radiogroup", "aria-label": "Sistema" }, l.map(function (s, i) {
      var escolhido = s.id === estado.sistema;
      return el("button.estante-sistemas__opcao" + (escolhido ? ".estante-sistemas__opcao--escolhido" : ""), {
        type: "button", role: "radio", "aria-checked": String(escolhido), tabindex: escolhido ? "0" : "-1", dataset: { sistema: s.id },
        onclick: function () { trocarSistema(s.id, true); }, onkeydown: function (ev) { mover(ev, i); },
      }, [
        el("span.estante-sistemas__volume", {}, [Capa ? Capa.elemento(s, { tamanho: "m" }) : null]),
        el("span.estante-sistemas__nome", { texto: s.nome }),
        escolhido ? el("span.estante-sistemas__marca", { texto: "Selecionado" }) : null,
      ]);
    }));
  }

  function abasDeCategoria(cats) {
    return el("div.r-abas.r-abas--rolavel.catalogo-categorias", { role: "tablist", "aria-label": "Categoria" }, cats.map(function (c) {
      var ativa = estado.categoria === c.id;
      var n = contagemDe(estado.sistema, c);
      return el("button.r-aba", {
        type: "button", role: "tab", id: "cat-" + c.id, "aria-selected": String(ativa), "aria-controls": "catalogo-corpo",
        tabindex: ativa ? "0" : "-1", dataset: { categoria: c.id },
        onclick: function () { if (estado.categoria === c.id) return; estado.categoria = c.id; limparConsulta(); desenhar(); focar('[data-categoria="' + c.id + '"]'); },
        onkeydown: function (ev) {
          var passo = { ArrowRight: 1, ArrowLeft: -1 }[ev.key];
          if (!passo) return;
          ev.preventDefault();
          var i = cats.indexOf(c), alvo = cats[(i + passo + cats.length) % cats.length];
          estado.categoria = alvo.id; limparConsulta(); desenhar(); focar('[data-categoria="' + alvo.id + '"]');
        },
      }, [el("span", { texto: c.nome }), typeof n === "number" ? el("span.abas-contexto__n", { texto: " (" + n + ")" }) : null]);
    }));
  }
  function focar(sel) { var x = painel.querySelector(sel); if (x) x.focus(); }

  function desenhar() {
    if (bibliotecaAtual && bibliotecaAtual.desmontar) bibliotecaAtual.desmontar();
    bibliotecaAtual = null;
    var cats = categoriasDe(estado.sistema);
    var cat = cats.filter(function (c) { return c.id === estado.categoria; })[0] || cats[0] || null;
    estado.categoria = cat ? cat.id : "";
    guardarNoEndereco();
    var area = el("div.pilha.catalogo-corpo", { id: "catalogo-corpo", role: "tabpanel", "aria-labelledby": cat ? "cat-" + cat.id : null });
    U.trocar(painel, [
      global.RAMAApp.titulo({ titulo: "Catálogo", trilha: [nomeDoSistema(estado.sistema), cat ? cat.nome : "—"] }),
      el("div.catalogo-controles", {}, [seletorDeSistema(), cats.length ? abasDeCategoria(cats) : null]),
      area,
    ]);
    if (!cat) { U.trocar(area, UI.vazio({ titulo: "Nada cadastrado", texto: nomeDoSistema(estado.sistema) + " ainda não tem conteúdo oficial no R.A.M.A." })); return; }
    if (cat.tipo === "geradores") return geradores(area);
    if (cat.tipo === "criaturasOrdem") return criaturasOrdem(area);
    if (cat.nativo) return listar(area, nativoComoCategoria(cat));
    if (cat.carregar && !carregados[estado.sistema + ":" + cat.id]) return carregarECategoria(area, cat);
    listar(area, cat);
  }

  function carregarECategoria(area, cat) {
    var chave = estado.sistema + ":" + cat.id;
    if (falhas[chave]) {
      U.trocar(area, UI.vazio({ titulo: "O catálogo não carregou", texto: falhas[chave], acao: { rotulo: "Tentar de novo", aoClicar: function () { delete falhas[chave]; desenhar(); } } }));
      return;
    }
    U.trocar(area, UI.carregando("Abrindo " + cat.nome.toLowerCase()));
    var sistema = estado.sistema, id = cat.id;
    cat.carregar().then(function () {
      carregados[chave] = true;
      if (estado.sistema === sistema && estado.categoria === id) desenhar();
    }, function (erro) {
      falhas[chave] = (erro && erro.message) || "Verifique a conexão e tente de novo.";
      if (estado.sistema === sistema && estado.categoria === id) desenhar();
    });
  }

  /* ---------------- geradores e criaturas de Ordem ---------------- */

  function geradores(area) {
    U.trocar(area, [
      el("p.t-mini", { texto: "Só narrativa: sortear não cria ficha nem grava nada. São os mesmos geradores da mesa." }),
      el("div.pilha.geradores", {}, G().doSistema(estado.sistema).map(function (g) { return G().cartao(g); })),
    ]);
  }

  function criaturasOrdem(area) {
    bibliotecaAtual = global.RAMABibliotecaCriaturas.abrir({
      embutido: area, aba: "oficial", homebrew: false, geradores: false, acoes: [],
      ajuda: "Consulta dos livros. O filtro de fonte só muda o que aparece aqui — não liga nem desliga suplementos em fichas ou campanhas. Para ajustar uma ficha, copie para o seu Homebrew e edite a cópia.",
    });
  }

  /* As criaturas de Oblívio, Vampiro e Goblins (as fichas nativas
     completas), no mesmo formato de categoria. */
  function nativoComoCategoria(cat) {
    var def = NATIVOS[cat.nativo];
    var fontes = def.fontes();
    var f = [];
    if (fontes.length > 1) f.push({ chave: "fonte", rotulo: "Fonte", todos: "Todas as fontes", opcoes: fontes });
    if (def.filtro) f.push({ chave: "filtro", rotulo: def.filtro.rotulo, todos: def.filtro.todos, opcoes: def.filtro.opcoes() });
    return {
      id: cat.id, nome: cat.nome, ajuda: def.ajuda,
      entradas: function () {
        return def.entradas().map(function (x) {
          return { id: x.id, nome: x.nome, linha: x.linha, marcas: x.marcas, referencia: x.referencia, tituloRef: def.nomeDoLivro + " — " + x.referencia, chave: x.chave, f: { fonte: x.fonte, filtro: x.filtro }, detalhes: x.detalhes };
        });
      },
      filtros: function () { return f; },
    };
  }

  /* ---------------- a lista: busca, filtros e entradas ----------------
     O campo de busca e os filtros ficam montados; digitar ou filtrar só
     repinta os resultados (o foco e o cursor ficam no lugar). Os
     detalhes nascem quando a entrada é aberta. */

  function opcoesDoFiltro(fd, entradas) {
    if (fd.opcoes) return fd.opcoes;
    var vistos = {}, l = [];
    entradas.forEach(function (x) {
      var v = x.f ? x.f[fd.chave] : undefined;
      if (v === undefined || v === null || v === "") return;
      (fd.multiplo ? String(v).split(",") : [v]).forEach(function (u) { if (u && !vistos[u]) { vistos[u] = true; l.push(u); } });
    });
    var ordem = fd.ordem || null;
    l.sort(function (a, b) {
      if (ordem) { var ia = ordem.indexOf(a), ib = ordem.indexOf(b); if (ia !== ib) return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib); }
      var ra = fd.rotuloDe ? fd.rotuloDe(a) : a, rb = fd.rotuloDe ? fd.rotuloDe(b) : b;
      return String(ra).localeCompare(String(rb), "pt-BR");
    });
    return l.map(function (v) { return { valor: v, rotulo: fd.rotuloDe ? fd.rotuloDe(v) : v }; });
  }

  function listar(area, cat) {
    var entradas = cat.entradas().slice().sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); });
    var filtros = (cat.filtros ? cat.filtros() : []).map(function (fd) { return { fd: fd, opcoes: opcoesDoFiltro(fd, entradas) }; })
      .filter(function (x) { return x.opcoes.length > 1; });
    var listaEl = el("div.bib-itens.catalogo-itens", { role: "list" });
    var status = el("p.t-mini.bib-status", { role: "status", "aria-live": "polite" });
    var idBase = "cat-" + estado.sistema + "-" + cat.id;

    function visiveis() {
      var chave = U.chaveDeBusca(estado.busca);
      return entradas.filter(function (x) {
        if (chave && x.chave.indexOf(chave) < 0 && U.chaveDeBusca(x.nome).indexOf(chave) < 0) return false;
        return filtros.every(function (fx) {
          var v = estado.filtros[fx.fd.chave];
          if (!v) return true;
          var dele = x.f ? x.f[fx.fd.chave] : undefined;
          return fx.fd.multiplo ? String(dele || "").split(",").indexOf(v) >= 0 : String(dele) === v;
        });
      });
    }
    function pintar() {
      var v = visiveis();
      var filtrando = !!(U.aparar(estado.busca) || Object.keys(estado.filtros).some(function (k) { return estado.filtros[k]; }));
      status.textContent = (filtrando ? v.length + " de " + entradas.length : entradas.length) + (entradas.length === 1 ? " entrada" : " entradas") + ".";
      if (!v.length) {
        U.trocar(listaEl, el("div.r-vazio.bib-nada", { role: "listitem" }, [
          el("p.r-vazio__titulo", { texto: "Nada encontrado" }),
          el("p.r-vazio__texto", { texto: "Nenhuma entrada de " + cat.nome + " corresponde à busca ou aos filtros." }),
          el("button.r-botao", { type: "button", texto: "Limpar busca e filtros", onclick: limpar }),
        ]));
        return;
      }
      U.trocar(listaEl, v.slice(0, estado.limite).map(linha).concat(v.length > estado.limite ? [
        el("button.r-botao.r-botao--fantasma.catalogo-mais", { type: "button", texto: "Mostrar mais (" + (v.length - estado.limite) + ")",
          onclick: function () { estado.limite += 60; pintar(); } }),
      ] : []));
    }
    function limpar() {
      estado.busca = ""; estado.filtros = {}; estado.limite = 60;
      campo.value = "";
      area.querySelectorAll(".catalogo-filtro select").forEach(function (s) { s.value = ""; });
      pintar();
      campo.focus();
    }
    function linha(x) {
      var idDet = idBase + "-" + String(x.id).replace(/[^a-z0-9]+/gi, "-");
      var aberto = !!estado.abertos[x.id];
      var detalhes = el("div.bib-item__detalhes", { id: idDet, hidden: !aberto }, aberto ? [x.detalhes()] : []);
      var botao = el("button.bib-item__abrir", {
        type: "button", "aria-expanded": String(aberto), "aria-controls": idDet, "aria-label": "Consultar " + x.nome,
        onclick: function () {
          var abrir = detalhes.hidden;
          estado.abertos[x.id] = abrir;
          detalhes.hidden = !abrir;
          botao.setAttribute("aria-expanded", String(abrir));
          if (abrir && !detalhes.firstChild) detalhes.appendChild(x.detalhes());
        },
      }, [
        el("span.bib-item__seta", { "aria-hidden": "true" }),
        x.simbolo ? x.simbolo() : null,
        el("span.bib-item__texto", {}, [el("span.bib-item__nome", { texto: x.nome }), x.linha ? el("span.bib-item__classe", { texto: x.linha }) : null]),
      ]);
      var marcas = (x.marcas || []).map(function (m) {
        return typeof m === "string" ? el("span.r-etiqueta", { texto: m }) : el("span.r-etiqueta." + m.classe, { texto: m.texto });
      });
      if (x.referencia) marcas.push(el("span.r-etiqueta.bib-fonte", { texto: x.referencia, title: x.tituloRef || x.referencia }));
      return el("article.bib-item", { role: "listitem" }, [el("div.bib-item__topo", {}, [botao, el("span.bib-item__marcas", {}, marcas)]), detalhes]);
    }

    var campo = el("input.r-entrada", { type: "search", value: estado.busca, placeholder: "Buscar em " + cat.nome.toLowerCase(), "aria-label": "Buscar em " + cat.nome,
      oninput: function (ev) { estado.busca = ev.target.value; estado.limite = 60; pintar(); } });
    var filtrosEl = filtros.length ? el("div.bib-filtros.catalogo-filtros", {}, filtros.map(function (fx) {
      var id = idBase + "-f-" + fx.fd.chave;
      return el("div.bib-filtro.catalogo-filtro", {}, [
        el("label.t-mini", { for: id, texto: fx.fd.rotulo }),
        el("select.r-selecao", { id: id, onchange: function (ev) { estado.filtros[fx.fd.chave] = ev.target.value; estado.limite = 60; pintar(); } },
          [{ valor: "", rotulo: fx.fd.todos || "Todos" }].concat(fx.opcoes).map(function (o) { return el("option", { value: o.valor, texto: o.rotulo, selected: (estado.filtros[fx.fd.chave] || "") === String(o.valor) }); })),
      ]);
    })) : null;
    pintar();
    U.trocar(area, el("div.pilha.bib.catalogo-lista-area", {}, [
      cat.ajuda ? el("p.t-mini", { texto: cat.ajuda }) : null,
      el("div.r-busca", {}, [el("span.r-busca__marca", {}, [UI.simbolo("busca")]), campo]),
      filtrosEl, status, listaEl,
    ]));
  }

  global.RAMAPaginaCatalogo = {
    CATEGORIAS: CATEGORIAS, NATIVOS: NATIVOS, categoriasDe: categoriasDe,
    /* Para os testes e para quem quiser listar sem desenhar. */
    entradasDe: function (sistema, id) {
      var c = (CATEGORIAS[sistema] || []).filter(function (x) { return x.id === id; })[0];
      if (!c) return [];
      if (c.nativo) return nativoComoCategoria(c).entradas();
      return c.entradas ? c.entradas() : [];
    },
  };
})(window);
