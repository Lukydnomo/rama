/* =====================================================================
   R.A.M.A. — feedback pelo site
   ---------------------------------------------------------------------
   A janela de "Feedback", aberta pelo menu do agente (Opções do agente,
   no cabeçalho de toda página). Sugestão, bug ou outra opinião vão ao
   servidor por `enviar_feedback`, e o servidor entrega num canal do
   Discord (backend/Feedback.gs). O navegador nunca fala com o Discord
   nem conhece o endereço do webhook.

   O que vai junto com o texto: a versão do site, o nome da página (e da
   aba, na ficha e na campanha) e, só quando a pessoa marca, o nome do
   agente. Nada de token, id, ficha ou campanha — e o título da aba do
   navegador também não, porque na ficha ele traz o nome do personagem.

   Nada é guardado: fechar sem enviar descarta (com uma pergunta, se
   havia texto); falhar no envio mantém tudo na tela para tentar de novo.

   Os limites de texto repetem os de backend/Feedback.gs só para o
   contador; quem decide é o servidor. Os testes conferem que batem.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;

  var CATEGORIAS = [
    { valor: "sugestao", rotulo: "Sugestão de melhoria", descricao: "Uma ideia para o R.A.M.A. ficar melhor.", icone: "lampada",
      dica: "Qual é a ideia, e o que ela resolveria?" },
    { valor: "bug", rotulo: "Reportar um bug", descricao: "Algo que não funcionou como deveria.", icone: "inseto",
      dica: "O que aconteceu? Conte em poucas linhas." },
    { valor: "outro", rotulo: "Outro feedback", descricao: "Opinião, elogio, dúvida ou crítica.", icone: "balao",
      dica: "Escreva o que quiser compartilhar." },
  ];

  var LIMITES = { assunto: 120, descricao: 3000, passos: 1000, esperado: 500, observado: 500 };
  var MINIMOS = { assunto: 3, descricao: 10 };
  var EXTRAS_DO_BUG = ["passos", "esperado", "observado"];

  var NOMES_DOS_CAMPOS = {
    assunto: "assunto", descricao: "descrição", passos: "passos para reproduzir",
    esperado: "comportamento esperado", observado: "comportamento observado",
  };

  /* A pasta da página → o nome que aparece na mensagem. */
  var PAGINAS = {
    "": "Home", personagens: "Personagens", ficha: "Ficha", campanhas: "Campanhas",
    campanha: "Campanha", homebrew: "Homebrew", perfil: "Perfil",
  };

  /* =================================================================
     REGRAS (sem DOM — os testes rodam estas)
     ================================================================= */

  /* O mesmo corte do servidor: pontas fora, quebra de linha \n; o
     assunto é uma linha só. */
  function normalizar(campo, texto) {
    var t = String(texto === undefined || texto === null ? "" : texto).replace(/\r\n?/g, "\n").trim();
    return campo === "assunto" ? t.replace(/\s+/g, " ") : t;
  }

  function tamanho(campo, texto) { return normalizar(campo, texto).length; }

  /* validar({ categoria, assunto, descricao, passos, esperado, observado })
     → { ok, erros: { campo: frase } }. Os extras só contam num bug. */
  function validar(dados) {
    var d = dados || {};
    var erros = {};
    var categoria = CATEGORIAS.some(function (c) { return c.valor === d.categoria; }) ? d.categoria : "";
    if (!categoria) erros.categoria = "Escolha o tipo de feedback.";

    var campos = ["assunto", "descricao"].concat(categoria === "bug" ? EXTRAS_DO_BUG : []);
    campos.forEach(function (c) {
      var n = tamanho(c, d[c]);
      if (MINIMOS[c] && !n) erros[c] = c === "assunto" ? "Escreva um assunto." : "Descreva o que você quer contar.";
      else if (MINIMOS[c] && n < MINIMOS[c]) erros[c] = "Use pelo menos " + MINIMOS[c] + " caracteres.";
      else if (n > LIMITES[c]) erros[c] = "Passou do limite de " + LIMITES[c] + " caracteres — " + (n - LIMITES[c]) + " a mais.";
    });

    return { ok: !Object.keys(erros).length, erros: erros };
  }

  /* O corpo de `dados` que o servidor recebe. Os extras só vão num bug,
     e só os preenchidos. */
  function pedidoDe(dados, contexto) {
    var d = dados || {}, c = contexto || {};
    var pedido = {
      categoria: d.categoria,
      assunto: normalizar("assunto", d.assunto),
      descricao: normalizar("descricao", d.descricao),
    };
    if (d.categoria === "bug") {
      EXTRAS_DO_BUG.forEach(function (k) {
        var t = normalizar(k, d[k]);
        if (t) pedido[k] = t;
      });
    }
    pedido.versao = c.versao || "";
    pedido.pagina = c.pagina || "";
    pedido.identificar = d.identificar === true;
    return pedido;
  }

  /* "Ficha — Inventário": a pasta da página e, na ficha e na campanha,
     a aba aberta (rótulos fixos da interface, nunca texto da pessoa). */
  function origemDaPagina(endereco, doc, raiz) {
    var caminho = String(endereco || "").split(/[?#]/)[0];
    var base = String(raiz || "").split(/[?#]/)[0];
    if (base && caminho.indexOf(base) === 0) caminho = caminho.slice(base.length);
    var partes = caminho.split("/").filter(function (p) { return p && p !== "index.html"; });
    var pasta = partes.length ? partes[partes.length - 1] : "";
    var nome = Object.prototype.hasOwnProperty.call(PAGINAS, pasta) ? PAGINAS[pasta] : (base ? "Outra página" : "Home");

    if ((pasta === "ficha" || pasta === "campanha") && doc && doc.querySelector) {
      var lista = pasta === "ficha" ? "Seções da ficha" : "Seções da campanha";
      var aba = doc.querySelector('#conteudo [role="tablist"][aria-label="' + lista + '"] [role="tab"][aria-selected="true"]');
      var rotulo = aba ? String(aba.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40) : "";
      if (rotulo) nome += " — " + rotulo;
    }
    return nome;
  }

  /* Um envio por vez, e o mesmo id de operação enquanto o pedido for o
     mesmo: se a resposta da primeira tentativa se perdeu depois de o
     Discord receber, "Tentar novamente" não posta duas vezes — o
     servidor reconhece o id. Mudou o texto, é outra intenção, outro id. */
  function criarEnvio(api) {
    var emVoo = false;
    var ultima = null;
    return {
      emAndamento: function () { return emVoo; },
      enviar: async function (pedido) {
        if (emVoo) return { ok: false, erro: "ocupado_local", ignorado: true };
        var chave = JSON.stringify(pedido);
        if (!ultima || ultima.chave !== chave) ultima = { chave: chave, op: api.novaOperacao() };
        emVoo = true;
        try {
          var r = await api.enviarFeedback(pedido, ultima.op);
          return r || { ok: false, erro: "sem_resposta" };
        } catch (e) {
          return { ok: false, erro: "sem_conexao" };
        } finally {
          emVoo = false;
        }
      },
    };
  }

  function espera(segundos) {
    var s = Math.max(1, Math.round(Number(segundos) || 0));
    if (s < 60) return s + (s === 1 ? " segundo" : " segundos");
    var m = Math.ceil(s / 60);
    return "cerca de " + m + (m === 1 ? " minuto" : " minutos");
  }

  /* A resposta de erro → { titulo, texto, tentar }. `tentar` diz se o
     botão "Tentar novamente" faz sentido (texto recusado não: é preciso
     corrigir antes). */
  function mensagemDeErro(resposta) {
    var r = resposta || {};
    var f = global.RAMAApi && global.RAMAApi.frase ? global.RAMAApi.frase(r) : { titulo: "ALGO DEU ERRADO", texto: "" };
    var texto = f.texto;
    if (r.erro === "feedback_limite" && r.segundos) {
      texto = r.geral
        ? "O canal de feedback recebeu muitas mensagens na última hora. Tente de novo em " + espera(r.segundos) + "."
        : "Você enviou feedbacks há pouco. Tente de novo em " + espera(r.segundos) + ".";
    }
    if (r.erro === "feedback_ocupado" && r.segundos) {
      texto = "O canal de feedback está recebendo muitas mensagens agora. Tente de novo em " + espera(r.segundos) + ".";
    }
    if (r.erro === "feedback_invalido" && r.motivo === "formatado") {
      texto = "Depois de formatada, a mensagem passou do tamanho que o Discord aceita. Encurte a descrição e tente de novo.";
    }
    return { titulo: f.titulo, texto: texto, tentar: r.erro !== "feedback_invalido" && r.erro !== "acao_desconhecida" };
  }

  /* =================================================================
     A JANELA
     ================================================================= */

  var aberta = null;

  function abrir() {
    if (aberta) { aberta.foco(); return aberta; }

    var UI = global.RAMAUI, Api = global.RAMAApi;
    var agente = (global.RAMAAuth && global.RAMAAuth.agente && global.RAMAAuth.agente()) || {};
    var V = global.RAMAVersion;
    var contexto = {
      versao: V ? V.numero : "",
      pagina: origemDaPagina(location.href, document, U.raiz ? U.raiz() : ""),
    };
    var envio = criarEnvio(Api);
    var tentou = false;
    var enviado = false;
    var categoria = "";
    var sufixo = U.uuid().slice(0, 6);

    /* ---- os campos ---- */

    var campos = {};

    function campoDeTexto(chave, rotulo, opcoes) {
      var o = opcoes || {};
      var id = "fb-" + chave + "-" + sufixo;
      var entrada = o.area
        ? el("textarea.r-area", { id: id, rows: o.linhas || 4 })
        : el("input.r-entrada", { id: id, type: "text", autocomplete: "off" });
      if (o.obrigatorio) entrada.setAttribute("aria-required", "true");
      var contador = el("span.feedback-contador", { id: id + "-contador", "aria-hidden": "true" });
      var ajuda = el("p.r-ajuda", { id: id + "-ajuda", texto: o.ajuda || "", hidden: !o.ajuda });
      entrada.setAttribute("aria-describedby", ajuda.id + " " + id + "-limite");
      var limite = el("span.so-leitor", { id: id + "-limite", texto: "Até " + LIMITES[chave] + " caracteres." });

      var raiz = el("div.r-campo.feedback-campo", {}, [
        el("div.feedback-campo__topo", {}, [el("label", { for: id, texto: rotulo }), contador]),
        entrada,
        ajuda,
        limite,
      ]);

      function contar() {
        var n = tamanho(chave, entrada.value), max = LIMITES[chave];
        contador.textContent = n + "/" + max;
        contador.classList.toggle("feedback-contador--perto", n > max * 0.9 && n <= max);
        contador.classList.toggle("feedback-contador--passou", n > max);
      }

      entrada.addEventListener("input", function () {
        contar();
        esconderErroGeral();
        if (tentou) mostrarErros(validar(lerDados()).erros, false);
      });
      contar();

      var c = {
        raiz: raiz, entrada: entrada,
        marcarErro: function (mensagem) {
          entrada.classList.toggle(o.area ? "r-area--erro" : "r-entrada--erro", !!mensagem);
          entrada.setAttribute("aria-invalid", mensagem ? "true" : "false");
          ajuda.textContent = mensagem || o.ajuda || "";
          ajuda.classList.toggle("r-ajuda--erro", !!mensagem);
          ajuda.hidden = !mensagem && !o.ajuda;
        },
      };
      campos[chave] = c;
      return raiz;
    }

    /* ---- o tipo: três opções, uma por linha no celular ---- */

    var grupo = "fb-tipo-" + sufixo;
    var erroTipo = el("p.r-ajuda.r-ajuda--erro", { id: grupo + "-erro", hidden: true });
    var opcoesTipo = CATEGORIAS.map(function (c) {
      var entrada = el("input", {
        type: "radio", name: grupo, value: c.valor,
        "aria-describedby": grupo + "-" + c.valor,
        onchange: function () { if (entrada.checked) escolherCategoria(c.valor); },
      });
      return el("label.feedback-tipo", { dataset: { tipo: c.valor } }, [
        entrada,
        el("span.feedback-tipo__icone", {}, [UI.simbolo(c.icone, 18)]),
        el("span.feedback-tipo__textos", {}, [
          el("span.feedback-tipo__nome", { texto: c.rotulo }),
          el("span.feedback-tipo__descricao", { id: grupo + "-" + c.valor, texto: c.descricao }),
        ]),
      ]);
    });
    var blocoTipo = el("fieldset.feedback-tipos", {}, [
      el("legend.r-rotulo", { texto: "Tipo" }),
      el("div.feedback-tipos__grade", { role: "radiogroup", "aria-required": "true", "aria-describedby": erroTipo.id }, opcoesTipo),
      erroTipo,
    ]);

    var blocoBug = el("fieldset.feedback-bug", { hidden: true }, [
      el("legend.r-rotulo", { texto: "Detalhes do bug · opcional" }),
      campoDeTexto("passos", "Passos para reproduzir", { area: true, linhas: 3, ajuda: "O que você fez, em ordem, até o problema aparecer." }),
      campoDeTexto("esperado", "Comportamento esperado", { area: true, linhas: 2 }),
      campoDeTexto("observado", "Comportamento observado", { area: true, linhas: 2 }),
    ]);

    var nome = String(agente.nome || "").trim();
    var marcaNome = el("input", { type: "checkbox", id: "fb-nome-" + sufixo, "aria-describedby": "fb-nome-ajuda-" + sufixo });
    var blocoNome = el("div.feedback-identidade", {}, [
      el("label.r-marca", { for: marcaNome.id }, [
        marcaNome,
        el("span", { texto: nome ? "Mostrar meu nome (“" + nome + "”) na mensagem" : "Mostrar meu nome na mensagem" }),
      ]),
      el("p.r-ajuda", {
        id: "fb-nome-ajuda-" + sufixo,
        texto: "Sem marcar, a mensagem chega como Anônimo. A conta só é conferida para evitar abuso e não aparece na mensagem.",
      }),
    ]);

    var erroGeral = el("div.feedback-falha", { role: "alert", hidden: true });

    var campoAssunto = campoDeTexto("assunto", "Assunto", { obrigatorio: true });
    var campoDescricao = campoDeTexto("descricao", "Descrição", { area: true, linhas: 5, obrigatorio: true });
    campos.descricao.entrada.placeholder = "Escolha o tipo e conte o que quiser.";

    var formulario = el("fieldset.feedback-formulario", {}, [
      el("p.t-mini", { texto: "Sugestões, bugs e opiniões chegam direto à equipe do R.A.M.A. Tipo, assunto e descrição são obrigatórios." }),
      blocoTipo,
      campoAssunto,
      campoDescricao,
      blocoBug,
      blocoNome,
      el("p.t-mini.feedback-contexto", {
        texto: "Vão junto, para situar: a versão (" + (V ? "v" + V.numero : "desconhecida") + "), a página (" + contexto.pagina +
               ") e a data e hora do envio. Nada da sua ficha, das suas campanhas ou da sua senha.",
      }),
    ]);

    var corpo = el("div.feedback", {}, [formulario, erroGeral]);

    /* ---- estado ---- */

    function escolherCategoria(valor) {
      categoria = valor;
      opcoesTipo.forEach(function (op) { op.classList.toggle("feedback-tipo--marcado", op.dataset.tipo === valor); });
      blocoBug.hidden = valor !== "bug";
      var c = CATEGORIAS.filter(function (x) { return x.valor === valor; })[0];
      campos.descricao.entrada.placeholder = c ? c.dica : "";
      esconderErroGeral();
      if (tentou) mostrarErros(validar(lerDados()).erros, false);
    }

    function lerDados() {
      var d = { categoria: categoria, identificar: marcaNome.checked };
      Object.keys(campos).forEach(function (k) { d[k] = campos[k].entrada.value; });
      return d;
    }

    function temConteudo() {
      return Object.keys(campos).some(function (k) { return !!normalizar(k, campos[k].entrada.value); });
    }

    function mostrarErros(erros, focar) {
      erroTipo.textContent = erros.categoria || "";
      erroTipo.hidden = !erros.categoria;
      blocoTipo.classList.toggle("feedback-tipos--erro", !!erros.categoria);
      Object.keys(campos).forEach(function (k) { campos[k].marcarErro(erros[k] || ""); });
      if (!focar) return;
      if (erros.categoria) { (blocoTipo.querySelector("input:checked") || blocoTipo.querySelector("input")).focus(); return; }
      var primeiro = ["assunto", "descricao"].concat(EXTRAS_DO_BUG).filter(function (k) { return erros[k]; })[0];
      if (primeiro) campos[primeiro].entrada.focus();
    }

    function esconderErroGeral() { erroGeral.hidden = true; U.limpar(erroGeral); }

    function mostrarErroGeral(resposta) {
      var m = mensagemDeErro(resposta);
      U.trocar(erroGeral, [
        el("p.feedback-falha__titulo", { texto: m.titulo }),
        el("p.feedback-falha__texto", { texto: m.texto + " O que você escreveu continua aqui." }),
        m.tentar ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Tentar novamente", onclick: enviar }) : null,
      ]);
      erroGeral.hidden = false;
    }

    function travar(sim) {
      formulario.disabled = sim;
      if (botaoCancelar) botaoCancelar.disabled = sim;
      if (botaoX) botaoX.disabled = sim;
      U.$$("button", erroGeral).forEach(function (b) { b.disabled = sim; });
    }

    async function enviar() {
      if (enviado || envio.emAndamento()) return;
      tentou = true;
      var v = validar(lerDados());
      mostrarErros(v.erros, true);
      if (!v.ok) return;

      esconderErroGeral();
      travar(true);
      var resposta;
      try {
        resposta = await UI.ocupar(botaoEnviar, function () {
          return envio.enviar(pedidoDe(lerDados(), contexto));
        }, { rotulo: "Enviando…", regiao: corpo });
      } finally {
        travar(false);
      }
      if (resposta && resposta.ignorado) return;

      if (resposta && resposta.ok) { concluir(); return; }

      if (resposta && resposta.erro === "feedback_invalido" && resposta.campo && campos[resposta.campo]) {
        var erros = {};
        erros[resposta.campo] = mensagemDeErro(resposta).texto;
        mostrarErros(erros, true);
      }
      mostrarErroGeral(resposta);
      var tentar = erroGeral.querySelector("button");
      if (tentar) tentar.focus();
    }

    function concluir() {
      enviado = true;
      var comoChegou = marcaNome.checked && nome ? "com o seu nome, “" + nome + "”" : "como Anônimo";
      U.trocar(corpo, [
        el("div.feedback-sucesso", { role: "status" }, [
          el("span.feedback-sucesso__marca", {}, [UI.simbolo("certo", 22)]),
          el("div", {}, [
            el("p.t-secao", { texto: "Feedback enviado" }),
            el("p", { texto: "Obrigado! A mensagem chegou ao canal da equipe do R.A.M.A., " + comoChegou + "." }),
          ]),
        ]),
      ]);
      if (botaoCancelar) botaoCancelar.hidden = true;
      botaoEnviar.textContent = "Fechar";
      botaoEnviar.focus();
    }

    /* ---- a janela ---- */

    var perguntando = false;

    function podeFechar() {
      if (envio.emAndamento()) return false;
      if (enviado || !temConteudo()) return true;
      if (perguntando) return false;
      perguntando = true;
      UI.confirmar({
        titulo: "Descartar o feedback?",
        texto: "O que você escreveu ainda não foi enviado e vai se perder.",
        rotuloCancelar: "Continuar escrevendo",
        rotuloConfirmar: "Descartar",
        perigo: true,
      }).then(function (sim) {
        perguntando = false;
        if (sim) m.fechar();
      });
      return false;
    }

    var m = UI.modal({
      titulo: "Feedback",
      classe: "feedback-janela",
      conteudo: corpo,
      /* O fundo pede fechamento como o X: a pergunta, se houver texto,
         é a desta janela (podeFechar), não a genérica. */
      fundoFecha: true,
      podeFechar: podeFechar,
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: "Enviar feedback",
          classe: "r-botao--principal",
          aoClicar: function (fechar) {
            if (enviado) { fechar(); return; }
            enviar();
          },
        },
      ],
      aoFechar: function () { aberta = null; },
    });

    var botoes = U.$$(".r-modal__rodape .r-botao", m.janela);
    var botaoCancelar = botoes[0], botaoEnviar = botoes[1];
    var botaoX = m.janela.querySelector(".r-modal__topo .r-icone");

    aberta = {
      janela: m,
      foco: function () {
        var alvo = m.janela.querySelector("input:checked") || m.janela.querySelector("input, textarea, button");
        if (alvo) alvo.focus();
      },
    };
    return aberta;
  }

  global.RAMAFeedback = {
    CATEGORIAS: CATEGORIAS,
    LIMITES: LIMITES,
    MINIMOS: MINIMOS,
    abrir: abrir,
    validar: validar,
    pedidoDe: pedidoDe,
    origemDaPagina: origemDaPagina,
    criarEnvio: criarEnvio,
    mensagemDeErro: mensagemDeErro,
  };
})(window);
