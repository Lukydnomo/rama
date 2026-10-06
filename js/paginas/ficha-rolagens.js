/* =====================================================================
   R.A.M.A. — mostrador de rolagens
   ---------------------------------------------------------------------
   O canto onde o dado aparece. Flutua sobre a ficha, empilha as
   últimas e não rouba o foco: no meio de uma sessão a pessoa clica,
   lê e continua mexendo, sem precisar fechar nada.

   O que ele mostra, nesta ordem, é o que a mesa pergunta:
     o total, grande;
     os dados brutos, com o principal marcado;
     e só então de onde vieram os números.

   Ver os dados descartados importa. Em 2d20 dá para conferir na hora
   que o 15 ganhou do 6 — e em -2d20, que o 6 ganhou do 15.

   ---------------------------------------------------------------------
   MOSTRAR, EXIBIR E O CARTÃO (v2.40)
   ---------------------------------------------------------------------
     mostrar(resultado, opcoes)   uma rolagem que ACONTECEU AQUI: aparece
                                  e vira linha no histórico da campanha,
                                  com a aparência deste momento
     exibir(resultado, opcoes, ap) uma rolagem que já existe (a de outro
                                  jogador, recebida): só aparece. Nunca
                                  grava, nunca reenvia
     cartao(resultado, opcoes, ap) só o cartão, para uma prévia: não entra
                                  no canto, nem no histórico

   A aparência (tema de dados ou as cores do dado padrão) pinta só o
   próprio cartão — js/aparencia-rolagem.js.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  var MAX_NA_TELA = 4;
  var historico = [];

  /* Como notificação (v2.31.1): cada resultado fica 5 s no canto. Passar
     o mouse, tocar, clicar ou focar reinicia a contagem; a mais nova
     entra embaixo e as antigas sobem. */
  var DURACAO_MS = 5000;

  function temporizar(cartao, caixa) {
    var id = null;
    function sair() {
      /* O cartão pode ter ido para outro lugar (o painel da criatura
         repete o resultado dentro dele): aí ele fica. */
      if (cartao.parentNode !== caixa) return;
      cartao.classList.add("rolagem--saindo");
      setTimeout(function () { if (cartao.parentNode === caixa) caixa.removeChild(cartao); }, 220);
    }
    function reiniciar() {
      clearTimeout(id);
      cartao.classList.remove("rolagem--saindo");
      id = setTimeout(sair, DURACAO_MS);
    }
    ["mouseenter", "mousemove", "mouseleave", "pointerdown", "click", "focusin", "touchstart"].forEach(function (ev) {
      cartao.addEventListener(ev, reiniciar, { passive: true });
    });
    reiniciar();
  }

  function area() { return U.$("#rolagens"); }
  function AR() { return global.RAMAAparenciaRolagem || null; }

  /* mostrar(resultado, { tipo, acao: { rotulo, aoClicar } }) */
  function mostrar(resultado, opcoes) {
    var o = opcoes || {};
    if (!area()) return;

    /* A aparência é a DESTE momento: trocar o tema do personagem depois
       não muda esta rolagem, nem aqui nem no histórico. */
    var aparencia = o.aparencia !== undefined ? o.aparencia : (AR() ? AR().capturar() : null);
    var cartao = exibir(resultado, o, aparencia);

    historico.unshift({ quando: Date.now(), resultado: resultado });
    if (historico.length > 30) historico.pop();

    /* O FUNIL. Toda rolagem do sistema passa por mostrar(), então é
       aqui — e só aqui — que ela também vira linha no histórico da
       campanha. Nenhuma tela precisa lembrar de registrar; quem
       esquecer de chamar mostrar() não teria mostrado o dado também. */
    if (global.RAMAHistorico) {
      global.RAMAHistorico.registrar(resultado, {
        tipo: resultado.tipo || o.tipo,
        nome: o.nome || resultado.nome,
        critico: !!o.critico,
        aparencia: aparencia,
      });
    }

    return cartao;
  }

  /* Só apresentação: a rolagem já existe (de outro jogador, do
     histórico). Mesmo empilhamento, duração e fechamento das locais. */
  function exibir(resultado, opcoes, aparencia) {
    var caixa = area();
    if (!caixa || !resultado) return null;

    var cartao = montar(resultado, opcoes || {}, aparencia || null);

    /* A mais nova embaixo; as antigas sobem, e a mais velha sai se
       passar do limite. */
    caixa.appendChild(cartao);
    while (caixa.children.length > MAX_NA_TELA) caixa.removeChild(caixa.firstChild);
    temporizar(cartao, caixa);
    return cartao;
  }

  function montar(r, o, aparencia) {
    var critico = !!o.critico;

    var cartao = el("article.rolagem", {
      class: [
        critico ? "rolagem--critico" : "",
        r.tipo === "dano" ? "rolagem--dano" : "",
      ].filter(Boolean).join(" "),
    }, [
      /* O botão de dispensar mora no cabeçalho, ao lado da expressão:
         solto por cima do cartão, ele cobria o dado. */
      el("header.rolagem__topo", {}, [
        el("span.rolagem__nome", { texto: o.nome || r.nome || "Rolagem" }),
        el("span.rolagem__expressao", { texto: r.expressao || "" }),
        el("button.r-icone.rolagem__fechar", {
          type: "button",
          "aria-label": "Dispensar resultado",
          onclick: function () { if (cartao.parentNode) cartao.parentNode.removeChild(cartao); },
        }, [UI.simbolo("x", 12)]),
      ]),

      /* De quem é a rolagem, quando ela veio de outra pessoa. */
      o.autor ? el("p.rolagem__autor", { texto: o.autor }) : null,

      /* O dado ao lado do resultado (v2.40). A grade reserva o espaço
         dele dos dois lados, para o total continuar no centro. */
      el("div.rolagem__resultado", {}, [
        AR() ? AR().icone(aparencia, "cartao") : null,
        el("div.rolagem__numeros", {}, [
          el("p.rolagem__total", { texto: String(r.total !== undefined ? r.total : r.principal) }),
          faces(r),
        ]),
      ]),

      critico ? el("p.rolagem__marca", { texto: "Crítico" }) : null,

      parcelas(r),

      /* O que a conta não mostra em números: dados que uma condição
         tirou, uma restrição que vale neste teste, a munição gasta. */
      (o.notas || []).length
        ? el("div.rolagem__notas", {}, o.notas.map(function (n) { return el("p.rolagem__nota", { texto: n }); }))
        : null,

      /* Uma ou várias ações depois do dado (rolar dano, Empenho, um
         poder de origem): cada uma é um botão, e quem a define decide se
         ela se desliga depois de usada. */
      (o.acoes || (o.acao ? [o.acao] : [])).length
        ? el("div.rolagem__acoes", {}, (o.acoes || [o.acao]).filter(Boolean).map(function (ac) {
            var botao = el("button.r-botao.r-botao--mini.rolagem__acao", {
              type: "button",
              texto: ac.rotulo,
              title: ac.dica || "",
              onclick: function () { ac.aoClicar(cartao, botao); },
            });
            return botao;
          }))
        : null,
    ]);

    if (aparencia && AR()) AR().aplicar(cartao, aparencia);
    return cartao;
  }

  /* As faces sorteadas. No dano todas contam, então nenhuma é
     destacada; na rolagem dependente só uma vale, e ela fica invertida. */
  function faces(r) {
    var lista = r.rolagens || [];
    if (!lista.length) return null;

    var temPrincipal = r.tipo !== "dano" && r.natural !== undefined;
    var marcou = false;

    return el("div.rolagem__dados", { "aria-hidden": "true" }, lista.map(function (valor) {
      var principal = temPrincipal && !marcou && valor === r.natural;
      if (principal) marcou = true;
      return el("span.face", { class: principal ? "face--principal" : "", texto: String(valor) });
    }));
  }

  function parcelas(r) {
    var lista = (r.parcelas || []).filter(function (p) { return p.valor !== 0 || p.detalhe; });
    if (lista.length < 2) return null;

    return el("div.rolagem__parcelas", {}, lista.map(function (p) {
      return el("div.rolagem__parcela", {}, [
        el("span", { texto: p.rotulo + (p.detalhe ? " (" + p.detalhe + ")" : "") }),
        el("span", { texto: U.comSinal(p.valor) }),
      ]);
    }));
  }

  function limpar() {
    var caixa = area();
    if (caixa) U.limpar(caixa);
  }

  global.RAMARolagens = {
    mostrar: mostrar,
    exibir: exibir,
    cartao: function (resultado, opcoes, aparencia) { return montar(resultado || {}, opcoes || {}, aparencia || null); },
    limpar: limpar,
    historico: function () { return historico.slice(); },
  };
})(window);
