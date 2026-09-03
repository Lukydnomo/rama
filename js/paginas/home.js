/* =====================================================================
   R.A.M.A. — Home
   ---------------------------------------------------------------------
   O painel de entrada: quem está, quanto existe arquivado e o que foi
   mexido por último.

   Uma tela inicial vazia obriga a pessoa a adivinhar para onde ir. Esta
   responde três perguntas antes de qualquer clique: de quem é este
   arquivo, o que tem dentro e o que mudou.

   Os números vêm todos de uma chamada só. Três requisições para
   escrever três números seria pagar três vezes a lentidão do Apps
   Script para desenhar a mesma tela.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  global.RAMAApp.iniciar("home", async function (agente) {
    var painel = U.$("#painel-home");

    U.trocar(painel, [
      global.RAMAApp.titulo({
        titulo: "Arquivo do agente",
        trilha: [agente.nome || "Agente", "Nó // ativo"],
      }),
      UI.carregando("Consultando arquivo"),
    ]);

    var r = await global.RAMAApi.resumo();

    if (!r.ok) {
      U.trocar(painel, [
        global.RAMAApp.titulo({ titulo: "Arquivo do agente", trilha: [agente.nome || "Agente"] }),
        UI.erroDeTela(r, function () { location.reload(); }),
      ]);
      return;
    }

    desenhar(painel, agente, r.dados || {});
  });

  function desenhar(painel, agente, dados) {
    var contagens = dados.contagens || {};
    var recentes = dados.recentes || [];

    U.trocar(painel, [
      global.RAMAApp.titulo({
        titulo: "Arquivo do agente",
        trilha: [
          agente.nome || "Agente",
          "Registro // " + U.codigoCurto(agente.id || agente.usuario || "rama"),
          "Nó // ativo",
        ],
        acoes: [
          el("a.r-botao.r-botao--principal", {
            href: U.url("personagens/"),
            texto: "+ Novo personagem",
          }),
        ],
      }),

      UI.painel("Panorama", el("div.resumo", {}, [
        contador("Personagens", contagens.personagens, "personagens/"),
        contador("Campanhas", contagens.campanhas, "campanhas/"),
        contador("Homebrew", contagens.homebrew, "homebrew/"),
      ])),

      UI.painel("Últimos registros", recentes.length
        ? el("div.registros", {}, recentes.map(linhaRecente))
        : UI.vazio({
            titulo: "Nenhum registro ainda",
            texto: "Crie seu primeiro personagem para começar o arquivo.",
            acao: {
              rotulo: "+ Adicionar personagem",
              aoClicar: function () { location.href = U.url("personagens/?novo=1"); },
            },
          })
      ),
    ]);
  }

  /* Dois dígitos, como numeração de dossiê: 04 registros lê melhor
     numa coluna do que 4. */
  function doisDigitos(n) {
    var v = U.inteiro(n, 0);
    return v < 10 ? "0" + v : String(v);
  }

  function contador(rotulo, valor, caminho) {
    return el("a.resumo__item", { href: U.url(caminho) }, [
      el("span.t-rotulo", { texto: rotulo }),
      el("span.resumo__valor", { texto: doisDigitos(valor) }),
      el("span.t-mini", { texto: U.inteiro(valor, 0) === 1 ? "registro" : "registros" }),
    ]);
  }

  function linhaRecente(registro) {
    var destino = registro.tipo === "personagem"
      ? U.url("ficha/?id=" + encodeURIComponent(registro.id))
      : (registro.tipo === "campanha" ? U.url("campanhas/") : U.url("homebrew/"));

    return el("div.r-cartao.registro", { estilo: { position: "relative" } }, [
      el("a.registro__link", { href: destino, "aria-label": "Abrir " + registro.nome }),
      avatar(registro),
      el("div.registro__corpo", {}, [
        el("span.registro__nome", { texto: registro.nome || "Sem nome" }),
        el("span.registro__sub", { texto: legenda(registro) }),
      ]),
      el("span.registro__data", { texto: U.dataCurta(registro.atualizadoEm) }),
    ]);
  }

  function avatar(registro) {
    var caixa = el("span.r-avatar", { "aria-hidden": "true" });
    if (registro.foto) caixa.appendChild(el("img", { src: registro.foto, alt: "" }));
    else caixa.textContent = U.iniciais(registro.nome);
    return caixa;
  }

  function legenda(registro) {
    if (registro.tipo === "personagem") {
      return registro.campanha ? "Personagem · " + registro.campanha : "Personagem";
    }
    if (registro.tipo === "campanha") return "Campanha";
    return "Homebrew · " + global.RAMAFicha.rotuloDoTipo(registro.subtipo);
  }
})(window);
