/* =====================================================================
   R.A.M.A. — importação
   ---------------------------------------------------------------------
   A janela que recebe um arquivo do R.A.M.A. — uma ficha ou um item de
   biblioteca — e o transforma num registro desta conta.

   Três coisas são inegociáveis aqui:

   1. NADA é importado sem prévia. A pessoa vê o que vai entrar antes
      de confirmar, com nome, tipo e um resumo do conteúdo.

   2. Um arquivo importado NUNCA sobrescreve um registro existente. Ele
      sempre cria um novo, com id novo. Substituir em silêncio um
      personagem porque o arquivo trazia o mesmo identificador seria a
      forma mais rápida de perder uma campanha inteira.

   3. Dono, identificadores, revisão e qualquer coisa parecida com
      credencial são ARRANCADOS do arquivo. Um JSON que declara
      ownerId está tentando escrever no arquivo de outra pessoa; o
      RAMAValidacao remove esses campos, e o servidor os ignora de
      novo, derivando o dono da sessão e nunca do que foi enviado.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var F = global.RAMAFicha;
  var V = global.RAMAValidacao;
  var el = U.el;

  /* abrir({ tipo, aoConfirmar(dados) → Promise<bool> }) */
  function abrir(opcoes) {
    var o = opcoes || {};
    var validado = null;

    var area = el("textarea.r-area", {
      rows: 8,
      placeholder: 'Cole aqui o conteúdo do arquivo .json',
      "aria-label": "Conteúdo do arquivo",
    });

    var previa = el("div", { id: "previa-importacao" });

    var botaoArquivo = el("button.r-botao.r-botao--fantasma", {
      type: "button", texto: "Escolher arquivo .json",
      onclick: escolherArquivo,
    });

    var confirmar = el("button.r-botao.r-botao--principal", {
      type: "button", texto: "Importar", disabled: true,
      onclick: async function () {
        if (!validado) return;
        confirmar.disabled = true;
        confirmar.textContent = "Importando…";
        var deuCerto = await o.aoConfirmar(validado.dados);
        confirmar.disabled = false;
        confirmar.textContent = "Importar";
        if (deuCerto !== false) m.fechar();
      },
    });

    area.addEventListener("input", function () { conferir(area.value); });

    function escolherArquivo() {
      var entrada = document.createElement("input");
      entrada.type = "file";
      entrada.accept = ".json,application/json,text/plain";
      entrada.style.display = "none";

      entrada.addEventListener("change", function () {
        var arquivo = entrada.files && entrada.files[0];
        document.body.removeChild(entrada);
        if (!arquivo) return;

        if (arquivo.size > 5 * 1024 * 1024) {
          mostrarProblema(["O arquivo tem mais de 5 MB. Isso não parece um registro do R.A.M.A."]);
          return;
        }

        var leitor = new FileReader();
        leitor.onload = function () {
          area.value = String(leitor.result || "");
          conferir(area.value);
        };
        leitor.onerror = function () { mostrarProblema(["Não foi possível ler o arquivo."]); };
        leitor.readAsText(arquivo);
      });

      document.body.appendChild(entrada);
      entrada.click();
    }

    function conferir(texto) {
      validado = null;
      confirmar.disabled = true;

      var bruto = String(texto || "").trim();
      if (!bruto) { U.limpar(previa); return; }

      var pacote;
      try {
        pacote = JSON.parse(bruto);
      } catch (e) {
        mostrarProblema(["O conteúdo não é um JSON válido. Confira se copiou o arquivo inteiro."]);
        return;
      }

      var r = V.importado(pacote);

      if (!r.ok) {
        mostrarProblema(r.problemas || [r.mensagem || "O arquivo não pôde ser lido."]);
        return;
      }

      if (o.tipo && r.tipo !== o.tipo) {
        mostrarProblema([
          "Este arquivo é do tipo “" + r.tipo + "”, e esta tela importa “" + o.tipo + "”.",
        ]);
        return;
      }

      validado = r;
      confirmar.disabled = false;
      mostrarPrevia(r);
    }

    function mostrarProblema(problemas) {
      U.trocar(previa, UI.painel("Não dá para importar", el("ul.pilha--curta", { class: "pilha" },
        problemas.map(function (p) { return el("li.t-erro", { texto: "· " + p }); })
      )));
    }

    function mostrarPrevia(r) {
      U.trocar(previa, UI.painel("Prévia", previaDe(r)));
    }

    var m = UI.modal({
      titulo: o.tipo === "personagem" ? "Importar ficha" : "Importar para a biblioteca",
      largo: true,
      conteudo: [
        el("p", {
          texto: "Cole o conteúdo do arquivo ou escolha um .json. Nada é gravado antes de você confirmar.",
        }),
        botaoArquivo,
        area,
        previa,
        el("p.t-mini", {
          texto: "O registro entra como novo, com identificador próprio e sob a sua conta. " +
                 "Dono, identificadores e credenciais que venham no arquivo são descartados.",
        }),
      ],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }],
    });

    m.janela.querySelector(".r-modal__rodape").appendChild(confirmar);

    return m;
  }

  /* =================================================================
     PRÉVIAS
     ================================================================= */

  function previaDe(r) {
    if (r.tipo === "personagem") return previaDeFicha(r.dados);
    if (r.tipo === "homebrew-criatura") return previaDeCriatura(r.dados);
    if (r.tipo === "homebrew-habilidade") return previaDeHabilidade(r.dados);
    return previaDeItem(r.dados);
  }

  function previaDeCriatura(c) {
    var pares = [
      linha("Nome", c.nome),
      linha("Tipo", "Criatura"),
      linha("Status", (c.status || []).map(function (s) { return s.nome; }).join(", ") || "nenhum"),
      linha("Atributos", (c.atributos || []).length),
      linha("Perícias", (c.pericias || []).length),
      linha("Ataques", (c.ataques || []).length),
      linha("Habilidades", (c.habilidades || []).length),
      linha("Visibilidade", "entra como privada"),
    ];
    if (c.descricao) pares.push(linha("Descrição", c.descricao.slice(0, 200)));
    return el("dl.r-dados", {}, pares.reduce(function (saida, par) { return saida.concat(par); }, []));
  }

  function previaDeHabilidade(h) {
    var pares = [
      linha("Nome", h.nome),
      linha("Tipo", "Habilidade"),
      linha("Origem", h.origem || "—"),
      linha("Negrito", h.negrito ? "sim" : "não"),
      linha("Cor", h.cor || "sem cor"),
      linha("Visibilidade", "entra como privada"),
    ];
    if (h.texto) pares.push(linha("Texto", h.texto.slice(0, 200)));
    return el("dl.r-dados", {}, pares.reduce(function (saida, par) { return saida.concat(par); }, []));
  }

  function previaDeFicha(ficha) {
    var itens = (ficha.inventario && ficha.inventario.itens) || [];
    var notas = F.todasAsNotas(ficha.anotacoes).length;

    return el("dl.r-dados", {}, [
      linha("Nome", ficha.nome),
      linha("Classe", ficha.classe || "—"),
      linha("Origem", ficha.origem || "—"),
      linha("Atributos", ficha.atributos.length + " (" + ficha.atributos.map(function (a) { return a.sigla; }).join(", ") + ")"),
      linha("Status", ficha.status.length ? ficha.status.map(function (s) { return s.nome; }).join(", ") : "nenhum"),
      linha("Perícias", String(ficha.pericias.length)),
      linha("Inventário", itens.length + " item(ns), peso " + F.pesoAtual(ficha.inventario)),
      linha("Anotações", String(notas)),
      linha("Campanha", "não vem junto — vincule depois"),
    ].reduce(function (saida, par) { return saida.concat(par); }, []));
  }

  function previaDeItem(item) {
    var pares = [
      linha("Nome", item.nome),
      linha("Tipo", F.rotuloDoTipo(item.tipo)),
    ];

    if (item.tipo === "mochila") pares.push(linha("Reduz", String(U.peso(item.reducaoPeso))));
    else pares.push(linha("Peso", String(U.peso(item.peso))));

    if (item.tipo === "arma") {
      pares.push(linha("Dano", (item.dano || "—") + (item.danoExtra ? " + " + item.danoExtra : "")));
      pares.push(linha("Crítico", item.critico ? item.critico + " / x" + item.multiplicador : "—"));
    }

    if (item.tipo === "armadura") pares.push(linha("Defesa", String(item.defesa)));

    if (item.descricao) pares.push(linha("Descrição", item.descricao.slice(0, 200)));

    return el("dl.r-dados", {}, pares.reduce(function (saida, par) { return saida.concat(par); }, []));
  }

  function linha(rotulo, valor) {
    return [el("dt", { texto: rotulo }), el("dd", { texto: String(valor) })];
  }

  global.RAMAImportar = { abrir: abrir };
})(window);
