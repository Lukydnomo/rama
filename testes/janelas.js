/* Regressões de perda de preenchimento: usa os modais e o DOM reais.
   Abra janelas.html no navegador. Não depende do backend. */
(function () {
  "use strict";
  var U = window.RAMAUtil;
  var UI = window.RAMAUI;

  /* v9.17: a mesma bateria nos dois estilos. No Modern20 a janela sai com
     movimento: a camada que está saindo (.r-fundo--saindo) já não conta
     como janela aberta — não recebe clique e some por prazo. */
  var resultados = [];
  function executar() {
    resultados = [];
    document.querySelector("#saida").textContent = "";
    document.documentElement.setAttribute("data-interface", "legacy");
    bateria("Legacy");
    document.documentElement.setAttribute("data-interface", "modern20");
    bateria("Modern20");
    movimentoDaSaida();
  }

  function registrar(nome, passou) {
    var saida = document.querySelector("#saida");
    resultados.push({ nome: nome, passou: !!passou });
    saida.appendChild(U.el("li", { texto: (passou ? "OK — " : "FALHOU — ") + nome }));
  }

  /* A saída com movimento: uma vez, sem bloquear, removida por prazo. */
  function movimentoDaSaida() {
    var Mv = window.RAMAMovimento;
    var esperado = Mv && Mv.ativo();
    var n = 0;
    var m = UI.modal({ titulo: "Saída", aoFechar: function () { n++; } });
    var fundo = m.janela.parentNode;
    m.fechar(); m.fechar();
    registrar("[Modern20] aoFechar uma vez, mesmo com dois pedidos", n === 1);
    registrar("[Modern20] a camada que sai não recebe clique" + (esperado ? "" : " (movimento desligado: sai na hora)"),
      esperado ? (fundo.classList.contains("r-fundo--saindo") && getComputedStyle(fundo).pointerEvents === "none") : !fundo.isConnected);
    var conf = UI.modal({ titulo: "Atrás" });
    var frente = UI.modal({ titulo: "Frente" });
    frente.fechar();
    registrar("[Modern20] fechar a de cima devolve a de trás como topo", Array.from(document.querySelectorAll(".r-fundo:not(.r-fundo--saindo)")).length === 1);
    conf.fechar();
    setTimeout(function () {
      registrar("[Modern20] depois do prazo, nenhuma camada fica na página", document.querySelectorAll(".r-fundo").length === 0);
      var falhas = resultados.filter(function (r) { return !r.passou; });
      document.querySelector("#placar").textContent = resultados.length + " verificações; " + falhas.length + " falhas.";
      window.resultadoJanelas = { total: resultados.length, falhas: falhas };
    }, 600);
  }

  function bateria(nomeEstilo) {
    function ok(nome, passou) { registrar("[" + nomeEstilo + "] " + nome, passou); }
    function fundos() { return Array.from(document.querySelectorAll(".r-fundo:not(.r-fundo--saindo)")); }
    function topo() { return fundos().slice(-1)[0]; }
    function botao(rotulo) {
      return Array.from(topo().querySelectorAll("button")).filter(function (b) {
        return b.textContent === rotulo;
      })[0];
    }
    function esc() { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); }
    var overflow = document.body.style.overflow;
    var gatilho = document.querySelector("#executar");
    gatilho.focus();
    var fechamentos = 0;
    var campo = U.el("input.r-entrada", { value: "Personagem em criação", "aria-label": "Nome" });
    var m = UI.modal({ titulo: "Criar personagem", conteudo: campo, aoFechar: function () { fechamentos++; } });
    var original = m.janela.parentNode;
    campo.click();
    ok("Clicar dentro não abre confirmação", fundos().length === 1);
    original.click();
    ok("Clicar fora mantém o formulário e abre uma confirmação", fundos().length === 2 && m.janela.isConnected);
    ok("O foco começa na opção de voltar", document.activeElement === botao("Voltar à janela"));
    ok("O formulário não é descartado antes da decisão", fechamentos === 0 && campo.value === "Personagem em criação");
    original.click();
    topo().click();
    esc();
    ok("Cliques repetidos, clique fora da confirmação e Esc não descartam nem empilham perguntas", fundos().length === 2 && fechamentos === 0);
    botao("Voltar à janela").click();
    ok("Voltar preserva o campo original e o preenchimento", fundos().length === 1 && m.corpo.contains(campo) && campo.value === "Personagem em criação");
    ok("Voltar devolve o foco ao campo", document.activeElement === campo);
    ok("Voltar mantém a rolagem do fundo bloqueada", document.body.style.overflow === "hidden");
    original.click();
    topo().querySelector('[aria-label="Fechar"]').click();
    ok("Fechar só a pergunta preserva o formulário", fundos().length === 1 && fechamentos === 0);
    original.click();
    botao("Fechar janela").click();
    ok("Confirmar fecha a pergunta e o formulário uma vez", fundos().length === 0 && fechamentos === 1);
    ok("Fechamento final restaura foco e rolagem", document.activeElement === gatilho && document.body.style.overflow === overflow);
    m.fechar();
    ok("Fechamento repetido não repete a ação de descarte", fechamentos === 1);

    var pai = UI.modal({ titulo: "Criar personagem", conteudo: U.el("input", { value: "Rascunho" }) });
    var filha = UI.modal({ titulo: "Criar ritual", conteudo: U.el("textarea", { value: "Ritual em criação" }) });
    pai.janela.parentNode.click();
    ok("Janela atrás de outra não pede fechamento", fundos().length === 2);
    filha.janela.parentNode.click();
    botao("Fechar janela").click();
    /* Fechada = fora da página ou na camada que está saindo (Modern20). */
    var fechou = function (j) { return !j.janela.isConnected || j.janela.parentNode.classList.contains("r-fundo--saindo"); };
    ok("Confirmar na janela filha preserva a janela pai", fundos().length === 1 && pai.janela.isConnected && !fechou(pai) && fechou(filha));
    ok("O rascunho da janela pai continua intacto", pai.corpo.querySelector("input").value === "Rascunho");
    pai.fechar();

    m = UI.modal({ titulo: "Decisão obrigatória", exigeDecisao: true });
    m.janela.parentNode.click();
    esc();
    ok("Janelas de decisão continuam ignorando fundo e Esc", fundos().length === 1 && m.janela.isConnected);
    m.fechar();

    fechamentos = 0;
    m = UI.modal({ titulo: "Salvando item", aoFechar: function () { fechamentos++; } });
    m.janela.parentNode.click();
    m.fechar();
    ok("Uma ação que termina com pergunta aberta não deixa confirmação órfã", fundos().length === 0 && fechamentos === 1);
    ok("Fechamento pela ação restaura a rolagem", document.body.style.overflow === overflow);

    m = UI.modal({ titulo: "Fechar explicitamente" });
    m.janela.querySelector('[aria-label="Fechar"]').click();
    ok("O botão de fechar mantém seu comportamento", fundos().length === 0);
    m = UI.modal({ titulo: "Esc" });
    esc();
    ok("Esc mantém seu comportamento na janela original", fundos().length === 0);
    m = UI.modal({ titulo: "Cancelar", botoes: [{ rotulo: "Cancelar" }] });
    botao("Cancelar").click();
    ok("Cancelar explícito mantém seu comportamento", fundos().length === 0);

  }
  document.querySelector("#executar").addEventListener("click", executar);
  executar();
})();
