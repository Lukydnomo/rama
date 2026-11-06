/* =====================================================================
   R.A.M.A. — geradores de criaturas, por sistema (v6.6)
   ---------------------------------------------------------------------
   Um lugar só para os geradores que já existiam espalhados: a página
   Criaturas (seção Geradores) e a biblioteca de criaturas do combate
   (js/paginas/criaturas-biblioteca.js) abrem os MESMOS geradores daqui.
   Nenhuma tabela mora neste arquivo: cada gerador chama a lógica do
   próprio sistema, que é a mesma que a mesa da campanha usa.

     Ordem       Transtornados (AS1 p. 23), Produção do Anfitrião (AS4
                 p. 48) e Funcionários da TV Varminho (AS5 p. 20–33):
                 js/ordem/criaturas.js
     Oblívio     Encontro do Buraco (p. 104): a tabela de Encontro e a
                 expansão do motor do Buraco (js/oblivio/buraco.js), as
                 mesmas que a mesa da Testemunha rola
     Goblins     Viajante, Invasores e Bando Inimigo aleatórios (p. 18–
                 19): js/goblins/mesa.js (tabelas e resolverGrupo), as
                 mesmas do Covil
     Vampiro e Universal: sem gerador de criaturas (estado vazio)

   Gerador = { id, sistema, nome, resumo, fonte, parametros?, disponivel(),
               sortear(rolar, valores) → [nós], referencia?() → nó }
   Só narrativa: nenhum gerador cria ficha nem grava nada.
   ===================================================================== */
(function (global) {
  "use strict";
  var U = global.RAMAUtil, UI = global.RAMAUI, el = U.el;
  function OC() { return global.RAMAOrdemCriaturas; }
  function OA() { return global.RAMAOblivioAmeacas; }
  function OB() { return global.RAMAOblivioBuraco; }
  function OM() { return global.RAMAOblivioMotorBuraco; }
  function GC() { return global.RAMAGoblinsCatalogo; }
  function GD() { return global.RAMAGoblinsDados; }
  function GM() { return global.RAMAGoblinsMesa; }

  /* Um dado de N faces, pelo rolador do R.A.M.A. quando ele existe. */
  function rolar(faces) {
    var D = global.RAMADados;
    var r = D && D.total ? D.total("1d" + faces) : null;
    return r && r.ok ? r.total : 1 + Math.floor(Math.random() * faces);
  }
  function p(t, classe) { return el("p" + (classe ? "." + classe : ""), { texto: t }); }

  /* ---------------- Ordem ---------------- */

  function perfilOrdem(g, producao, varminho) {
    return [
      p("Perfil: " + g.perfil + " (1d10: " + g.dados.perfil + ")"),
      p("Traços: " + g.tracos.join("; ") + " (" + (producao || varminho ? "dois d6, sem somar" : "2d6") + ": " + g.dados.tracos.join(" e ") + ")"),
      p((varminho ? "Características: " : "Aparência: ") + g.aparencia.join("; ") + " (" + (varminho ? "dois d20, sem somar" : "d20") + ": " + g.dados.aparencia.join(" e ") + ")"),
      g.nota ? p(g.nota, "t-mini") : null,
    ];
  }

  function referenciaVarminho() {
    var V = OC() && OC().VARMINHO;
    if (!V) return null;
    function lista(titulo, itens) {
      return UI.recolhivel({ titulo: titulo, conteudo: [el("ul.pilha--curta", { class: "pilha" }, itens.map(function (x) {
        return el("li.t-mini", {}, [el("strong", { texto: x.nome }), document.createTextNode((x.papel ? " (" + x.papel + ")" : "") + (x.texto ? " — " + x.texto : "") + (x.pagina ? " (p. " + x.pagina + ")" : ""))]);
      }))] });
    }
    return el("div.pilha--curta", { class: "pilha" }, [
      el("h4.t-secao", { texto: "A TV Varminho, para preparar a missão" }),
      p(V.resumo, "t-mini"),
      lista("A torre", V.andares),
      lista("Os funcionários", V.papeis),
      lista("Os programas", V.programas),
      UI.recolhivel({ titulo: "Como a torre funciona", conteudo: [p(V.funcionamento, "t-mini")] }),
      lista("Ganchos de missão", V.ganchos),
      lista("Funcionários de exemplo", V.exemplos),
      p(V.notaExemplos, "t-mini"),
    ]);
  }

  var ORDEM = [
    { id: "transtornado", sistema: "ordem", nome: "Gerador de Transtornados", fonte: "Arquivos Secretos 1, p. 23",
      resumo: "Perfil, traços e aparência de um Transtornado.",
      disponivel: function () { return !!(OC() && OC().gerarTranstornado); },
      sortear: function (r) {
        var g = OC().gerarTranstornado(r);
        return perfilOrdem(g).concat([p(g.referencia + ". A ficha de jogo vem do catálogo: Assecla, Investido ou Apóstolo do Sangue.", "criacao-fonte")]);
      } },
    { id: "producao", sistema: "ordem", nome: "Gerador de Produção do Anfitrião", fonte: "Arquivos Secretos 4, p. 48",
      resumo: "Perfil, traços e aparência de um membro da Produção.",
      disponivel: function () { return !!(OC() && OC().gerarProducao); },
      sortear: function (r) {
        var g = OC().gerarProducao(r);
        return perfilOrdem(g, true).concat([p(g.referencia + ". Só narrativa: a ficha de jogo vem do catálogo (Assistente de Produção, Produtor ou Diretor), sem mudança nas estatísticas.", "criacao-fonte")]);
      } },
    { id: "varminho", sistema: "ordem", nome: "Funcionários da TV Varminho", fonte: "Arquivos Secretos 5, p. 20–33",
      resumo: "Perfil, traços e características de um funcionário da TV Varminho, e a torre como referência.",
      disponivel: function () { return !!(OC() && OC().gerarVarminho); },
      sortear: function (r) {
        var g = OC().gerarVarminho(r);
        return perfilOrdem(g, false, true).concat([p(g.referencia + ". Só narrativa: nenhum poder, nenhuma estatística. Para jogar com números, use as fichas do catálogo (doppelgangers, hospedeiros).", "criacao-fonte")]);
      },
      referencia: referenciaVarminho },
    /* AS9 (v6.9): só com o suplemento liberado no contexto (numa ficha ou
       campanha que o desligou, não aparece; na página Criaturas, sim). */
    { id: "hellhunters", sistema: "ordem", nome: "Gerador de Mercenários Hell Hunters", fonte: "Arquivos Secretos 9, p. 14",
      resumo: "Coluna (1d10), dois traços de personalidade (1d6) e duas características de aparência (1d20) de um mercenário.",
      disponivel: function () {
        var Cat = global.RAMAOrdemCatalogo;
        return !!(OC() && OC().gerarHellHunters) && (!Cat || !Cat.fonteLiberada || Cat.fonteLiberada("AS9"));
      },
      sortear: function (r) {
        var g = OC().gerarHellHunters(r);
        return [
          p("Coluna: " + g.coluna + " (1d10: " + g.dados.coluna + ")"),
          p("Traços de personalidade: " + g.tracos.join("; ") + " (1d6: " + g.dados.tracos.join(" e ") + ")"),
          p("Aparência: " + g.aparencia.join("; ") + " (1d20: " + g.dados.aparencia.join(" e ") + ")"),
          p(g.referencia + ". Só narrativa: a ficha de combate vem do catálogo (os Hell Hunters, p. 20–35).", "criacao-fonte"),
        ];
      } },
  ];

  /* ---------------- Oblívio ---------------- */

  var OBLIVIO = [
    { id: "encontro", sistema: "oblivio", nome: "Encontro do Buraco", fonte: "Oblívio, p. 104",
      resumo: "Rola a tabela de Encontro da dificuldade escolhida e diz quais Ameaças aparecem — a mesma rolagem da mesa da Testemunha.",
      parametros: [{ chave: "dificuldade", rotulo: "Dificuldade", opcoes: [{ valor: "facil", rotulo: "Fácil" }, { valor: "medio", rotulo: "Médio" }, { valor: "dificil", rotulo: "Difícil" }] }],
      disponivel: function () { return !!(OB() && OM() && OA() && OB().ENCONTRO); },
      sortear: function (r, v) {
        var dif = (v && v.dificuldade) || "facil";
        var tab = OM().rolarTabela(OB().ENCONTRO[dif], r);
        if (!tab.linha) return [p("Nada na tabela para " + tab.d + ".")];
        var ex = tab.eventos[0] ? OM().expandirEvento(tab.eventos[0], r, { dificuldade: dif }) : { ameacas: [] };
        var nomes = (ex.ameacas || []).map(function (a) {
          var am = OA().ameaca[a.ameaca];
          return (a.qtd || 1) + "× " + (am ? am.nome + " (Grau " + am.grau + ", p. " + am.pag + ")" : a.ameaca);
        });
        return [
          p(tab.nome + " (1d6: " + tab.d + ")"),
          p(tab.resumo, "t-mini"),
          nomes.length ? p("Ameaças: " + nomes.join("; ")) : null,
          ex.vinculo ? p("Vínculo: " + ex.vinculo.sucessos + " sucesso(s) em " + nomeDoConhecimento(ex.vinculo.conhecimento) + (ex.vinculo.salasAdiante ? ", " + ex.vinculo.salasAdiante + " sala(s) adiante" : ", nesta sala") + ".", "t-mini") : null,
          p("As fichas das Ameaças estão no catálogo, nesta página.", "criacao-fonte"),
        ];
      } },
  ];

  function nomeDoConhecimento(k) {
    var C = global.RAMAOblivioCatalogo;
    var x = C && C.CONHECIMENTOS ? C.CONHECIMENTOS.filter(function (c) { return c.chave === k; })[0] : null;
    return x ? x.nome : k;
  }

  /* ---------------- Malditos Goblins ---------------- */

  var GOBLINS = [
    { id: "encontros", sistema: "goblins", nome: "Encontros aleatórios", fonte: "Malditos Goblins, p. 18–19",
      resumo: "Viajante Aleatório, Invasores (Proteger Masmorra) e Bando Inimigo (Invadir Vizinhos), com as quantidades roladas — as mesmas tabelas do Covil.",
      parametros: [{ chave: "tabela", rotulo: "Tabela", opcoes: [{ valor: "viajante", rotulo: "Viajante Aleatório (p. 18)" }, { valor: "proteger", rotulo: "Invasores Aleatórios (p. 19)" }, { valor: "vizinhos", rotulo: "Bando Inimigo Aleatório (p. 19)" }] }],
      disponivel: function () { return !!(GM() && GD() && GC()); },
      sortear: function (r, v) {
        var id = (v && v.tabela) || "viajante";
        var t = GM().tabelas()[id];
        var s = GD().sortear(t, r);
        var res = s.resultado || {};
        var linhas = [p(t.nome + " (" + t.dados + ": " + s.dados.join(" + ") + "): " + GM().textoDeEntrada(res))];
        if (res.grupo) {
          GM().resolverGrupo(res.grupo, r).forEach(function (g) {
            linhas.push(p(g.quantidade + "× " + g.nome + (g.dados && g.dados.length ? " (" + g.expressao + ": " + g.dados.join("+") + ")" : ""), "t-mini"));
          });
        }
        if (res.bandoRival) linhas.push(p("O Bando Rival é gerado no Covil da campanha, a partir dos goblins da mesa.", "t-mini"));
        if (res.nota) linhas.push(p(res.nota, "t-mini"));
        linhas.push(p("As fichas dos inimigos estão no catálogo, nesta página.", "criacao-fonte"));
        return linhas;
      } },
  ];

  var POR_SISTEMA = { ordem: ORDEM, oblivio: OBLIVIO, goblins: GOBLINS };

  function doSistema(sistema) {
    return (POR_SISTEMA[sistema] || []).filter(function (g) { try { return g.disponivel(); } catch (e) { return false; } });
  }

  /* O miolo de um gerador: parâmetros, o resultado e "sortear de novo".
     Devolve { no, sortear } — quem monta decide onde fica o botão. */
  function miolo(g) {
    var valores = {};
    var saida = el("div.pilha--curta.gerador__resultado", { class: "pilha", role: "status", "aria-live": "polite" });
    var campos = (g.parametros || []).map(function (par) {
      valores[par.chave] = par.opcoes[0].valor;
      var idc = "ger-" + g.sistema + "-" + g.id + "-" + par.chave;
      return el("div.bib-filtro", {}, [
        el("label.t-mini", { for: idc, texto: par.rotulo }),
        el("select.r-selecao", { id: idc, onchange: function (ev) { valores[par.chave] = ev.target.value; sortear(); } },
          par.opcoes.map(function (o) { return el("option", { value: o.valor, texto: o.rotulo }); })),
      ]);
    });
    function sortear() {
      try { U.trocar(saida, g.sortear(rolar, valores).filter(Boolean)); }
      catch (e) { U.trocar(saida, p("Não foi possível sortear agora.", "t-erro")); }
    }
    sortear();
    return { no: el("div.pilha--curta", { class: "pilha" }, [campos.length ? el("div.bib-filtros", {}, campos) : null, saida]), sortear: sortear };
  }

  /* Janela (o fluxo da mesa: biblioteca de criaturas do combate). */
  function abrir(g) {
    var m = miolo(g);
    return UI.modal({
      titulo: g.nome,
      conteudo: [m.no, g.referencia ? g.referencia() : null],
      botoes: [
        { rotulo: "Fechar", classe: "r-botao--fantasma" },
        { rotulo: "Sortear de novo", classe: "r-botao--principal", aoClicar: function () { m.sortear(); } },
      ],
    });
  }

  /* Cartão na página (seção Geradores). */
  function cartao(g) {
    var m = miolo(g);
    return el("article.r-painel.gerador", { "data-gerador": g.sistema + "." + g.id }, [
      el("div.gerador__topo", {}, [
        el("div", {}, [el("h3.t-secao", { texto: g.nome }), p(g.resumo + " " + g.fonte + ".", "t-mini")]),
        el("button.r-botao.r-botao--mini.r-botao--principal", { type: "button", texto: "Sortear de novo", onclick: function () { m.sortear(); } }),
      ]),
      m.no,
      g.referencia ? UI.recolhivel({ titulo: "Referência", conteudo: [g.referencia()] }) : null,
    ]);
  }

  global.RAMAGeradoresCriaturas = { doSistema: doSistema, abrir: abrir, cartao: cartao, miolo: miolo, rolar: rolar };
})(typeof window !== "undefined" ? window : globalThis);
