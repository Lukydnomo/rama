/* Regressões de perda de preenchimento: usa os modais e o DOM reais.
   Abra janelas.html no navegador. Não depende do backend. */
(function () {
  "use strict";
  var U = window.RAMAUtil;
  var UI = window.RAMAUI;

  function executar() {
    var resultados = [];
    var saida = document.querySelector("#saida");
    saida.textContent = "";
    function ok(nome, passou) {
      resultados.push({ nome: nome, passou: !!passou });
      saida.appendChild(U.el("li", { texto: (passou ? "OK — " : "FALHOU — ") + nome }));
    }
    function fundos() { return Array.from(document.querySelectorAll(".r-fundo")); }
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
    ok("Confirmar na janela filha preserva a janela pai", fundos().length === 1 && pai.janela.isConnected && !filha.janela.isConnected);
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

    var falhas = resultados.filter(function (r) { return !r.passou; });
    document.querySelector("#placar").textContent = resultados.length + " verificações; " + falhas.length + " falhas.";
    window.resultadoJanelas = { total: resultados.length, falhas: falhas };
  }
  document.querySelector("#executar").addEventListener("click", executar);
  executar();
})();
