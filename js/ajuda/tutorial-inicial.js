/* =====================================================================
   R.A.M.A. — o roteiro do tutorial inicial
   ---------------------------------------------------------------------
   Oito etapas sobre a ficha Universal de demonstração (Rafa Duarte),
   rodadas por js/tutorial.js. As práticas avançam quando a ação
   acontece de verdade nos controles da ficha (eventos "rama:demo"); as
   explicativas usam Próximo. Meta: cinco a oito minutos.

   A conclusão só é gravada no fim, pelo botão Concluir tutorial
   (concluir_tutorial, idempotente). Na revisão (Ajuda → Refazer), o fim
   não grava nada: a conclusão que a conta já tem continua.

   Tudo o que se pratica aqui fica nesta página: a camada de API está em
   modo demonstração, a prévia de aparência é desfeita ao sair da etapa
   e a situação de permissão é fictícia.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function UI() { return global.RAMAUI; }
  function demo() { return global.RAMAFichaDemo; }
  function $(s) { return document.querySelector(s); }
  function estreito() { return global.matchMedia && global.matchMedia("(max-width: 760px)").matches; }

  /* Para onde voltar no fim: só um caminho do próprio site. */
  function destino() {
    var v = U.parametro("voltar");
    if (!v || /^[a-z]+:|^\/\/|\\|^\//i.test(v) || /^ficha\/\?tutorial=/.test(v)) return "";
    return v;
  }

  function botoes(lista, atual, aoEscolher) {
    return el("div.tut-opcoes", { role: "group" }, lista.map(function (o) {
      return el("button.r-botao.r-botao--mini", {
        type: "button", texto: o.rotulo, "aria-pressed": String(atual === o.valor),
        class: atual === o.valor ? "r-botao--principal" : "",
        onclick: function () { aoEscolher(o.valor); },
      });
    }));
  }

  /* -------- a busca da Ajuda, em miniatura (sem sair da página) -------- */
  function miniBusca() {
    var A = global.RAMAAjuda;
    var resultados = el("ul.tut-busca__resultados", { "aria-live": "polite" });
    function pintar(q) {
      var lista = A ? A.buscar(q, { limite: 4 }) : [];
      U.trocar(resultados, !q ? [] : lista.length ? lista.map(function (a) {
        return el("li", {}, [
          el("strong", { texto: a.titulo }),
          el("span.t-mini", { texto: " — " + a.resumo }),
        ]);
      }) : [el("li.t-mini", { texto: "Nada encontrado para essa busca. Na Ajuda, tente outras palavras ou use as áreas." })]);
    }
    var campo = el("input.r-entrada", {
      type: "search", placeholder: "Experimente: compartilhar, mestre, não consigo editar",
      "aria-label": "Buscar na Ajuda",
      oninput: function (ev) { pintar(ev.target.value); },
    });
    return el("div.tut-busca", {}, [campo, resultados]);
  }

  function passos(o) {
    var revisao = !!(o && o.revisao);

    return [
      /* 1 ---------------------------------------------------------- */
      { id: "boas-vindas", titulo: "Boas-vindas ao R.A.M.A.",
        texto: [
          "O R.A.M.A. guarda suas fichas, faz as contas e rola os dados das regras de cada sistema — e reúne a mesa numa campanha.",
          "Esta é a ficha de Rafa Duarte, no modelo Universal: um modelo livre, que você ajusta ao jogo que quiser. Ela é só um exemplo: nada do que você fizer aqui é gravado na sua conta.",
          "Mesmo com a ficha completa, conhecer as regras continua importante. Leia o livro ou o PDF do sistema que a sua mesa escolheu e combine com o mestre quais regras opcionais valem.",
        ] },

      /* 2 ---------------------------------------------------------- */
      { id: "areas", titulo: "Onde fica cada coisa",
        texto: ["A navegação leva às áreas do R.A.M.A." + (estreito() ? " No celular, ela abre pelo botão ☰ no topo." : "")],
        alvo: function () { return estreito() ? $(".app-nav__alternar") : $(".app-nav"); },
        conteudo: function () {
          return el("dl.tut-lista", {}, [
            ["Personagens", "suas fichas e as compartilhadas com você"],
            ["Campanhas", "as mesas: personagens, combate, rolagens"],
            ["Catálogo", "o conteúdo oficial de cada sistema, com livro e página"],
            ["Homebrew", "o que você cria: itens, habilidades, rituais, criaturas"],
            ["Perfil", "conta, aparência, temas de dados e importações"],
            ["Ajuda", "guias por tarefa, tutoriais por sistema e perguntas frequentes"],
          ].map(function (x) { return el("div", {}, [el("dt", { texto: x[0] }), el("dd", { texto: x[1] })]); }));
        } },

      /* 3 ---------------------------------------------------------- */
      (function () {
        var antes = null;
        function fotografar() {
          var d = demo();
          return d ? JSON.stringify((d.ctx().ficha.status || []).map(function (s) { return s.atual; })) : "";
        }
        return { id: "modos", titulo: "A ficha: modos e recursos",
          texto: [
            "No topo da ficha ficam Normal e Edição. Normal é o modo de jogo: recursos, rolagens e itens. Edição destrava a estrutura — criar, apagar e configurar.",
            "Os recursos (PV, PE, Sanidade) mudam no modo Normal, com − e + ou digitando o número.",
          ],
          tarefa: "tire ou devolva 1 ponto de um recurso (por exemplo, PV).",
          feitoTexto: "O indicador no topo mostra a gravação — aqui, simulada.",
          aoEntrar: function () { var d = demo(); if (d && d.modo() !== "normal") d.trocarModo("normal"); if (d) d.irParaAba("geral"); antes = fotografar(); },
          alvo: function () { return $(".status-lista") || $(".modo"); },
          esperar: function (api) {
            api.ouvir("alterou", function () { if (fotografar() !== antes) api.feito(); });
          } };
      })(),

      /* 4 ---------------------------------------------------------- */
      (function () {
        var rolou = false;
        return { id: "rolagem", titulo: "Rolar uma perícia",
          texto: [
            "Clique numa perícia para rolar. O resultado aparece no canto da tela: o total em destaque, os dados (o principal marcado) e, embaixo, as parcelas — atributo, bônus e extras.",
            "Numa ficha de verdade, vinculada a uma campanha, a rolagem também vai para o histórico da mesa. Aqui, não.",
          ],
          tarefa: "abra a aba Perícias e role Investigação (ou outra perícia).",
          feitoTexto: "Confira o cartão do resultado: o total, os dados e as parcelas.",
          aoEntrar: function () { rolou = false; },
          alvo: function () {
            var d = demo();
            if (rolou) return $("#rolagens .rolagem:last-child") || $("#aba-pericias");
            if (d && d.aba() !== "pericias") return $("#aba-pericias");
            var lista = document.querySelectorAll(".pericias .pericia");
            for (var i = 0; i < lista.length; i++) if (/Investiga/.test(lista[i].textContent)) return lista[i];
            return lista[0] || $("#aba-pericias");
          },
          esperar: function (api) {
            api.ouvir("aba", function () { api.destacar(); });
            api.ouvir("rolagem", function (d) {
              if (d.aba !== "pericias") return;
              rolou = true;
              api.feito();
              setTimeout(function () { api.destacar(); }, 50);
            });
          } };
      })(),

      /* 5 ---------------------------------------------------------- */
      (function () {
        var hab = false, item = false;
        return { id: "habilidade-item", titulo: "Consultar uma habilidade e um item",
          texto: [
            "Habilidades e itens se abrem com um clique no nome, mostrando o texto inteiro. Pastas guardam habilidades e ficam abertas ou fechadas como você deixar.",
            "Para organizar, o menu ⋯ de cada item tem editar, duplicar e mover; no modo Edição dá para arrastar pela alça ou usar Subir e Descer.",
          ],
          tarefa: "abra uma habilidade na aba Habilidades e depois um item no Inventário.",
          aoEntrar: function () { hab = false; item = false; },
          alvo: function () {
            var d = demo();
            var aba = d ? d.aba() : "";
            if (!hab) return aba === "habilidades" ? ($('[data-regiao="conteudo"] details:not(.recolhivel--pasta) > summary') || $('[data-regiao="conteudo"] details > summary')) : $("#aba-habilidades");
            if (!item) return aba === "inventario" ? $('[data-regiao="conteudo"] details:not(.inventario-lista-recolhida) > summary') : $("#aba-inventario");
            return null;
          },
          esperar: function (api) {
            api.ouvir("aba", function () { api.destacar(); });
            function aoAlternar(ev) {
              var d = ev.target;
              if (!d || d.tagName !== "DETAILS" || !d.open || !d.closest('[data-regiao="conteudo"]')) return;
              var aba = demo() ? demo().aba() : "";
              if (aba === "habilidades" && !d.classList.contains("recolhivel--pasta")) hab = true;
              if (aba === "inventario" && !d.classList.contains("inventario-lista-recolhida")) item = true;
              if (hab && item) api.feito();
              api.redesenhar();
            }
            document.addEventListener("toggle", aoAlternar, true);
            return function () { document.removeEventListener("toggle", aoAlternar, true); };
          } };
      })(),

      /* 6 ---------------------------------------------------------- */
      (function () {
        var escolha = "";
        var CONSEQUENCIA = {
          leitor: "Com Leitor, a Bia abre a ficha em Personagens → Compartilhados comigo, rola e consulta, mas vê “Somente leitura”: nada que ela fizer muda a ficha. É o acesso certo para quem só acompanha.",
          editor: "Com Editor, a Bia pode mudar tudo na ficha, como você — só não compartilha nem exclui. Dê esse acesso a quem vai cuidar da ficha junto com você.",
        };
        return { id: "campanhas", titulo: "Campanhas, vínculo e permissões",
          texto: [
            "Numa campanha, o mestre convida os jogadores e cada um vincula a própria ficha: o mestre passa a abri-la e ajustá-la, e as rolagens vão para o histórico da mesa. Ninguém precisa compartilhar a ficha com o mestre.",
            "Para outra pessoa ver ou editar fora da campanha, o dono usa Opções da ficha (⋯) → Compartilhar…, com dois papéis: Leitor e Editor.",
            "Situação fictícia: a Bia, da sua mesa, quer acompanhar a ficha do Rafa entre as sessões, sem mexer em nada. Que acesso você daria?",
          ],
          tarefa: "escolha um acesso para a Bia.",
          feitoTexto: "Numa ficha sua, o mesmo fica em Opções da ficha → Compartilhar….",
          aoEntrar: function () { escolha = ""; },
          alvo: function () { return $('.ficha-topo [aria-label="Opções da ficha"]'); },
          conteudo: function (api) {
            return el("div", {}, [
              botoes([{ valor: "leitor", rotulo: "Leitor" }, { valor: "editor", rotulo: "Editor" }], escolha, function (v) {
                escolha = v; api.feito(); api.redesenhar();
                /* A consequência aparece embaixo: o cartão rola até ela. */
                setTimeout(function () {
                  var corpo = api.cartao.querySelector(".tut__corpo");
                  if (corpo) corpo.scrollTop = corpo.scrollHeight;
                }, 0);
              }),
              escolha ? el("p.tut-consequencia", { role: "status", texto: CONSEQUENCIA[escolha] + (escolha === "editor" ? " Para quem só acompanha, Leitor costuma bastar." : "") }) : null,
            ]);
          } };
      })(),

      /* 7 ---------------------------------------------------------- */
      (function () {
        var previa = { estilo: "", tema: "", densidade: "" };
        function aplicar() {
          var I = global.RAMAInterface, T = global.RAMATema, D = global.RAMADensidade;
          if (I && I.definirPrevia) I.definirPrevia(previa.estilo || null);
          if (T && T.definirPrevia) T.definirPrevia(previa.tema ? { modo: previa.tema } : null);
          if (D && D.definirPrevia) D.definirPrevia(previa.densidade || null);
        }
        function desfazer() {
          previa = { estilo: "", tema: "", densidade: "" };
          aplicar();
        }
        return { id: "personalizar", titulo: "Personalização",
          texto: [
            "O R.A.M.A. tem dois estilos de interface — Legacy e Modern20 —, temas de cores e a densidade (o espaço entre as coisas). Experimente: a prévia muda esta página na hora.",
            "Aqui é só prévia: ao sair desta etapa tudo volta como estava. Para guardar, use Perfil → Aparência. Estilo e tema seguem a sua conta; tamanho e densidade valem neste aparelho.",
          ],
          tarefa: "experimente uma das opções abaixo.",
          aoSair: desfazer,
          conteudo: function (api) {
            var I = global.RAMAInterface, D = global.RAMADensidade;
            var estilo = previa.estilo || (I ? I.estilo() : "legacy");
            var dens = previa.densidade || (D ? D.atual() : "confortavel");
            function escolher(campo) { return function (v) { previa[campo] = v; aplicar(); api.feito(); api.redesenhar(); }; }
            return el("div.tut-personalizar", {}, [
              el("p.tut-rotulo", { texto: "Estilo" }),
              botoes([{ valor: "legacy", rotulo: "Legacy" }, { valor: "modern20", rotulo: "Modern20" }], estilo, escolher("estilo")),
              el("p.tut-rotulo", { texto: "Tema" }),
              botoes([{ valor: "sistema", rotulo: "Do aparelho" }, { valor: "claro", rotulo: "Claro" }, { valor: "escuro", rotulo: "Escuro" }], previa.tema, escolher("tema")),
              el("p.tut-rotulo", { texto: "Densidade" }),
              botoes([{ valor: "confortavel", rotulo: "Confortável" }, { valor: "compacta", rotulo: "Compacta" }], dens, escolher("densidade")),
            ]);
          } };
      })(),

      /* 8 ---------------------------------------------------------- */
      (function () {
        var estado = revisao ? "revisao" : "pronto"; /* pronto · gravando · falhou · concluido */
        var erro = "";
        async function concluir(api) {
          if (estado === "gravando") return;
          estado = "gravando"; erro = ""; api.redesenhar();
          var r = null;
          try { r = await global.RAMAApi.concluirTutorial(); } catch (e) { r = null; }
          if (r && r.ok) {
            global.RAMAAuth.marcarTutorialConcluido(r.tutorial && r.tutorial.inicial);
            estado = "concluido";
          } else {
            estado = "falhou";
            erro = r ? global.RAMAApi.recado(r) : "Sem resposta do servidor.";
          }
          api.redesenhar();
        }
        function atalhos() {
          var d = destino();
          var lista = [];
          if (d) lista.push({ rotulo: "Continuar de onde eu vinha", href: U.url(d), principal: true });
          lista.push({ rotulo: "Criar meu personagem", href: U.url("personagens/?novo=1"), principal: !d });
          lista.push({ rotulo: "Ver campanhas", href: U.url("campanhas/") });
          lista.push({ rotulo: "Abrir a Ajuda", href: U.url("ajuda/") });
          return el("div.tut-atalhos", {}, lista.map(function (x) {
            return el("a.r-botao.r-botao--mini" + (x.principal ? ".r-botao--principal" : ""), { href: x.href, texto: x.rotulo });
          }));
        }
        return { id: "ajuda", titulo: revisao ? "Ajuda e fim da revisão" : "Ajuda e conclusão", final: true,
          texto: [
            "A Ajuda (no menu de navegação) tem busca por tarefa, guias por área, tutoriais com ficha de exemplo para cada sistema e perguntas frequentes. Cada regra citada diz o livro e a página para você conferir no seu material.",
            "Se algo não funcionar, o Feedback fica no menu do agente (⋯), no canto do cabeçalho — o envio só acontece quando você confirmar.",
          ],
          alvo: function () { return estado === "concluido" ? null : $('[aria-label="Opções do agente"]'); },
          conteudo: function (api) {
            var fim;
            if (estado === "revisao") {
              fim = el("div.tut-fim", {}, [
                el("p", { texto: "Fim da revisão. A sua conclusão continua registrada; nada desta demonstração foi gravado." }),
                el("div.tut-atalhos", {}, [
                  el("button.r-botao.r-botao--mini.r-botao--principal", { type: "button", texto: "Encerrar revisão", onclick: function () { api.encerrar(); } }),
                ]),
              ]);
            } else if (estado === "concluido") {
              fim = el("div.tut-fim", { role: "status" }, [
                el("p.tut-fim__ok", { texto: "Tutorial concluído! A conclusão foi gravada na sua conta: em qualquer aparelho, você entra direto." }),
                atalhos(),
              ]);
            } else {
              fim = el("div.tut-fim", {}, [
                estado === "falhou" ? el("p.tut-fim__erro", { role: "alert", texto: "Não foi possível gravar a conclusão agora. " + erro + " Você continua nesta etapa: tente de novo em instantes. Se não resolver, saia pelo menu do agente (⋯) e entre de novo mais tarde." }) : null,
                el("button.r-botao.r-botao--principal", {
                  type: "button", disabled: estado === "gravando",
                  texto: estado === "gravando" ? "Gravando…" : (estado === "falhou" ? "Tentar de novo" : "Concluir tutorial"),
                  onclick: function () { concluir(api); },
                }),
              ]);
            }
            return el("div", {}, [
              el("p.tut-rotulo", { texto: "Experimente a busca da Ajuda" }),
              miniBusca(),
              fim,
            ]);
          },
          esperar: function (api) {
            if (revisao || !global.RAMAAuth.aoConcluirTutorialEmOutraAba) return;
            global.RAMAAuth.aoConcluirTutorialEmOutraAba(function () {
              if (estado === "concluido") return;
              estado = "concluido"; api.redesenhar();
            });
          } };
      })(),
    ];
  }

  global.RAMAAjudaTutorialInicial = { passos: passos, destino: destino };
})(window);
