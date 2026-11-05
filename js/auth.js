/* =====================================================================
   R.A.M.A. — sessão do agente
   ---------------------------------------------------------------------
   O que este aparelho guarda, o portão de entrada e a garantia de que
   nenhuma página desenha conteúdo antes de o servidor confirmar quem
   está do outro lado.

   O QUE FICA NESTE NAVEGADOR
     · o token de sessão, emitido pelo servidor;
     · nome e usuário, só para escrever no cabeçalho;
     · a hora da última atividade.

   O QUE NUNCA FICA
     senha, hash, sal, segredo, permissão. Nada disso passa por aqui em
     momento nenhum — a senha vai uma vez para o servidor no login e o
     que volta é um token opaco.

   E o mais importante: estar logado nesta tela NÃO é autorização.
   Esconder um botão é conveniência visual. Quem decide se a leitura ou
   a gravação acontece é o Apps Script, que confere a sessão e o dono do
   registro em toda requisição. Se este arquivo inteiro fosse adulterado
   pelo console, o servidor continuaria recusando o que precisa recusar.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;

  var CHAVE_TOKEN = "rama.sessao.token";
  var CHAVE_AGENTE = "rama.sessao.agente";
  var CHAVE_ATIVIDADE = "rama.sessao.atividade";

  var agenteAtual = null;
  var perdendoSessao = false;

  /* =================================================================
     ARMAZENAMENTO
     -----------------------------------------------------------------
     localStorage, e não sessionStorage, para a sessão sobreviver a
     fechar o navegador — é o que faz o sistema valer entre o
     computador e o celular sem pedir senha toda hora.

     Tudo dentro de try: navegação privada e políticas de empresa
     derrubam o armazenamento, e isso não pode derrubar o sistema.
     ================================================================= */

  function guardar(chave, valor) {
    try { localStorage.setItem(chave, valor); } catch (e) { /* segue sem guardar */ }
  }

  function ler(chave) {
    try { return localStorage.getItem(chave) || ""; } catch (e) { return ""; }
  }

  function apagar(chave) {
    try { localStorage.removeItem(chave); } catch (e) { /* nada a fazer */ }
  }

  function token() { return ler(CHAVE_TOKEN); }

  function agente() {
    if (agenteAtual) return agenteAtual;
    try { agenteAtual = JSON.parse(ler(CHAVE_AGENTE) || "null"); } catch (e) { agenteAtual = null; }
    return agenteAtual;
  }

  function anotarSessao(tk, dados) {
    guardar(CHAVE_TOKEN, tk);
    guardar(CHAVE_ATIVIDADE, String(Date.now()));
    agenteAtual = {
      id: (dados && dados.id) || "",
      usuario: (dados && dados.usuario) || "",
      nome: (dados && dados.nome) || (dados && dados.usuario) || "Agente",
      avatar: (dados && dados.avatar) || "",
    };
    guardar(CHAVE_AGENTE, JSON.stringify(agenteAtual));
    /* O tema salvo na conta chega junto com a sessão (tema.js). */
    if (global.RAMATema) {
      global.RAMATema.sincronizarDaConta(agenteAtual.id, dados && dados.preferencias && dados.preferencias.tema, dados && dados.preferencias);
    }
    /* As outras preferências de apresentação (v2.35, preferencias.js). */
    if (global.RAMAPreferencias) {
      global.RAMAPreferencias.sincronizarDaConta(agenteAtual.id, dados && dados.preferencias);
    }
    /* O estilo da interface (v2.49, interface.js): Legacy ou Modern20. */
    if (global.RAMAInterface) {
      global.RAMAInterface.sincronizarDaConta(agenteAtual.id, dados && dados.preferencias);
    }
  }

  function esquecer() {
    apagar(CHAVE_TOKEN);
    apagar(CHAVE_AGENTE);
    apagar(CHAVE_ATIVIDADE);
    agenteAtual = null;
    /* Sem conta, o tema volta ao do sistema. */
    if (global.RAMATema) global.RAMATema.esquecerConta();
    if (global.RAMAPreferencias) global.RAMAPreferencias.esquecerConta();
    if (global.RAMAInterface) global.RAMAInterface.esquecerConta();
  }

  function tocarAtividade() { guardar(CHAVE_ATIVIDADE, String(Date.now())); }

  /* O servidor conta o mesmo prazo e tem a palavra final. Isto aqui só
     evita gastar uma requisição mandando um token que já sabemos
     vencido — e evita a tela piscar conteúdo antes de recusar. */
  function venceuAqui() {
    var quando = Number(ler(CHAVE_ATIVIDADE)) || 0;
    if (!quando) return false;
    var dias = (global.RAMA_CONFIG && global.RAMA_CONFIG.DIAS_SESSAO) || 30;
    return Date.now() - quando > dias * 86400000;
  }

  /* =================================================================
     ENTRAR, RETOMAR E SAIR
     ================================================================= */

  async function entrar(usuario, senha) {
    var r = await global.RAMAApi.login(usuario, senha);
    if (r && r.ok && r.token) {
      anotarSessao(r.token, r.agente || r.usuario);
    }
    return r;
  }

  /* Confere a sessão com o servidor. É a única resposta que vale:
     token presente no localStorage não prova nada.

     `pedidos` é opcional e muda o transporte, não a regra. Com ele, a
     conferência da sessão e as primeiras leituras da página saem numa
     requisição só — e o que a página recebe já vem junto.

     Sem ele, a página faria assim:

       1. perguntar quem é      → uma viagem ao Apps Script
       2. desenhar a casca
       3. pedir os dados        → outra viagem

     Duas ondas, e a segunda só começa quando a primeira acaba. Cada
     viagem paga o custo de partida do Apps Script, que é o que faz uma
     tela demorar mesmo quando a planilha é pequena.

     A ordem de segurança não muda: a sessão continua sendo validada
     pelo servidor antes de qualquer leitura, porque é o servidor que
     executa as duas coisas, e ele valida a sessão ANTES de olhar para
     a lista de pedidos. Se a sessão não valer, nenhuma leitura
     acontece — a resposta é o erro de sessão, e nada mais. */
  async function retomar(pedidos) {
    var tk = token();
    if (!tk) return { ok: false, erro: "sem_token" };
    if (venceuAqui()) { esquecer(); return { ok: false, erro: "expirada" }; }

    var extras = pedidos || [];
    var r = null;
    var respostas = [];

    if (extras.length) {
      var todas = await global.RAMAApi.lote([{ acao: "sessao" }].concat(extras));
      var primeira = todas[0];

      if (primeira && primeira.ok) {
        r = primeira;
        respostas = todas.slice(1);
      } else if (primeira && global.RAMAApi.ehErroDeSessao(primeira.erro)) {
        /* A sessão é que está ruim. Perguntar de novo por outro caminho
           daria a mesma resposta. */
        r = primeira;
      }

      /* Qualquer outro motivo — e o mais provável é um Apps Script
         ainda não atualizado, que não conhece a ação `lote` — não pode
         parecer sessão inválida. Pergunta do jeito de sempre.

         Sem esta linha o sistema entrava em laço: a tela pedia login,
         o login funcionava, a página recarregava e o lote falhava de
         novo. E a tela inicial continuava logada, porque ela não usa
         pré-carga. */
    }

    if (!r) r = await global.RAMAApi.sessao(tk);

    if (r && r.ok) {
      anotarSessao(tk, r.agente);
      r.respostas = respostas;
    } else if (r && global.RAMAApi.ehErroDeSessao(r.erro)) {
      esquecer();
    }
    return r;
  }

  async function sair() {
    var tk = token();
    esquecer();
    if (tk) {
      try { await global.RAMAApi.logout(tk); } catch (e) { /* a sessão local já se foi */ }
    }
    location.href = U.url("");
  }

  /* Chamado pela camada de API quando o servidor recusa por sessão.
     Não recarrega a página sozinho: se houver algo digitado agora,
     recarregar apagaria justamente o que a pessoa acabou de escrever.
     Avisa, oferece o caminho e deixa a decisão com ela. */
  function aoPerderSessao(erro) {
    if (perdendoSessao) return;
    perdendoSessao = true;
    esquecer();

    var f = global.RAMAApi.frase({ erro: erro });
    global.RAMAUI.avisoErro(f.titulo + " — " + f.texto, {
      duracao: 60000,
      acao: { rotulo: "Entrar", aoClicar: function () { location.href = U.url(""); } },
    });
  }

  /* =================================================================
     PORTÃO DE ENTRADA
     -----------------------------------------------------------------
     Uma tela só, montada aqui, usada por qualquer página que precise
     de sessão. Repetir este formulário por página seria repetir cinco
     vezes o cuidado com foco, erro e bloqueio.
     ================================================================= */

  /* =================================================================
     PEDIDO DE ACESSO (v6.6)
     -----------------------------------------------------------------
     Só ENVIA um pedido: o servidor publica no Discord da administração
     (solicitar_acesso) nome de exibição, usuário e a senha provisória
     como digitada, e quem administra cria a conta com criarUsuario.
     Nada aqui cria conta nem abre sessão. A senha mora só no campo:
     não vai ao armazenamento do navegador, ao log nem ao histórico, e sai do
     campo quando o pedido é entregue ou a janela fecha.
     As regras repetem as do servidor (criarUsuario) só para avisar
     antes; quem decide é o servidor.
     ================================================================= */

  var AVISO_DO_PEDIDO = "A senha provisória será enviada ao Discord para o administrador criar sua conta. Use uma senha exclusiva para o RAMA.";

  function regrasDoPedido(d) {
    var e = {};
    var nome = d.nome.replace(/\s+/g, " ").trim();
    var usuario = d.usuario.trim().toLowerCase();
    if (!nome) e.nome = "Informe o nome de exibição.";
    else if (nome.length > 80) e.nome = "Até 80 caracteres.";
    if (!/^[a-z0-9._-]{3,40}$/.test(usuario)) e.usuario = "De 3 a 40 caracteres: letras minúsculas, números, ponto, hífen e sublinhado.";
    if (d.senha.length < 8) e.senha = "Pelo menos 8 caracteres.";
    else if (d.senha.length > 200) e.senha = "Até 200 caracteres.";
    else if (/[\u0000-\u001F\u007F]/.test(d.senha)) e.senha = "Sem caracteres de controle.";
    else if (d.senha !== d.senha.trim()) e.senha = "Sem espaço no começo ou no fim (para chegar exatamente igual).";
    return { erros: e, nome: nome, usuario: usuario };
  }

  function pedirAcesso() {
    var UI = global.RAMAUI;
    var revelada = false;
    var enviando = false;
    var entregue = false;
    var operacao = null;
    var assinatura = "";

    function campoTexto(id, rotulo, max, auto, dica) {
      var entrada = el("input.r-entrada", { id: id, type: "text", maxlength: max, autocomplete: auto, spellcheck: "false", autocapitalize: "off" });
      var erro = el("p.r-ajuda.r-ajuda--erro", { id: id + "-erro", hidden: true });
      entrada.setAttribute("aria-describedby", id + "-erro" + (dica ? " " + id + "-dica" : ""));
      return { entrada: entrada, erro: erro, no: el("div.r-campo", {}, [
        el("label", { for: id, texto: rotulo }), entrada,
        dica ? el("p.r-ajuda", { id: id + "-dica", texto: dica }) : null, erro,
      ]) };
    }
    var nome = campoTexto("acesso-nome", "Nome de exibição", 80, "nickname");
    var usuario = campoTexto("acesso-usuario", "Nome de usuário", 40, "off", "3 a 40 caracteres: a–z, 0–9, ponto, hífen e sublinhado.");
    var senha = el("input.r-entrada", { id: "acesso-senha", type: "password", maxlength: 200, autocomplete: "new-password", spellcheck: "false", autocapitalize: "off", "aria-describedby": "acesso-senha-erro acesso-senha-dica" });
    var senhaErro = el("p.r-ajuda.r-ajuda--erro", { id: "acesso-senha-erro", hidden: true });
    var olho = el("button.r-icone.senha__olho", { type: "button", "aria-label": "Revelar senha", "aria-pressed": "false", "aria-controls": "acesso-senha",
      onclick: function () { revelada = !revelada; senha.type = revelada ? "text" : "password"; olho.setAttribute("aria-pressed", String(revelada));
        olho.setAttribute("aria-label", revelada ? "Ocultar senha" : "Revelar senha"); U.trocar(olho, [UI.simbolo(revelada ? "olhoFechado" : "olho")]); pintarPrevia(); } },
      [UI.simbolo("olho")]);

    var pNome = el("dd.acesso-previa__valor"), pUsuario = el("dd.acesso-previa__valor"), pSenha = el("dd.acesso-previa__valor.acesso-previa__senha");
    var previa = el("aside.acesso-previa", { "aria-label": "Prévia do pedido", "aria-live": "polite" }, [
      el("p.acesso-previa__titulo", { texto: "Solicitação de acesso — RAMA" }),
      el("dl.acesso-previa__lista", {}, [
        el("dt.t-rotulo", { texto: "Nome de exibição" }), pNome,
        el("dt.t-rotulo", { texto: "Usuário" }), pUsuario,
        el("dt.t-rotulo", { texto: "Senha provisória" }), pSenha,
      ]),
      el("p.t-mini", { texto: "É isto que o administrador recebe. A conta só existe depois que ele cadastrar." }),
    ]);

    var recado = el("p.r-ajuda", { role: "status", hidden: true });
    var botao = el("button.r-botao.r-botao--principal", { type: "submit", texto: "Enviar pedido" });

    function dados() { return { nome: nome.entrada.value, usuario: usuario.entrada.value, senha: senha.value }; }

    function pintarPrevia() {
      var d = dados();
      var r = regrasDoPedido(d);
      pNome.textContent = r.nome || "—";
      pUsuario.textContent = r.usuario || "—";
      pSenha.textContent = d.senha ? (revelada ? d.senha : "•".repeat(Math.min(d.senha.length, 24))) : "—";
    }

    function mostrarErros(erros) {
      [[nome, "nome"], [usuario, "usuario"]].forEach(function (x) {
        x[0].erro.textContent = erros[x[1]] || ""; x[0].erro.hidden = !erros[x[1]];
        x[0].entrada.setAttribute("aria-invalid", erros[x[1]] ? "true" : "false");
      });
      senhaErro.textContent = erros.senha || ""; senhaErro.hidden = !erros.senha;
      senha.setAttribute("aria-invalid", erros.senha ? "true" : "false");
    }

    [nome.entrada, usuario.entrada, senha].forEach(function (c) {
      c.addEventListener("input", function () { pintarPrevia(); if (!enviando) { recado.hidden = true; } });
    });

    var formulario = el("form.pilha.acesso-form", { novalidate: true }, [
      nome.no, usuario.no,
      el("div.r-campo", {}, [
        el("label", { for: "acesso-senha", texto: "Senha provisória" }),
        el("div.senha", {}, [senha, olho]),
        el("p.r-ajuda", { id: "acesso-senha-dica", texto: "Pelo menos 8 caracteres. Fica mascarada na tela." }),
        senhaErro,
      ]),
      recado,
      el("div.faixa", {}, [botao]),
    ]);

    formulario.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      if (enviando || entregue) return;
      var d = dados();
      var r = regrasDoPedido(d);
      mostrarErros(r.erros);
      if (Object.keys(r.erros).length) { recado.hidden = true; return; }
      var sim = await UI.confirmar({ titulo: "Antes de enviar", texto: AVISO_DO_PEDIDO, rotuloConfirmar: "Enviar pedido", rotuloCancelar: "Voltar" });
      if (!sim || enviando || entregue) return;
      /* O mesmo conteúdo repetido (falha, clique duplo) leva o mesmo id:
         o servidor não reposta o que já entregou. */
      var assin = r.nome + "\u0000" + r.usuario + "\u0000" + d.senha;
      if (!operacao || assin !== assinatura) { operacao = "op-" + U.uuid(); assinatura = assin; }
      enviando = true;
      botao.disabled = true;
      botao.textContent = "Enviando…";
      recado.hidden = true;
      var resp = await global.RAMAApi.solicitarAcesso(d, operacao);
      enviando = false;
      if (resp && resp.ok) {
        entregue = true;
        senha.value = "";
        assinatura = "";
        [nome.entrada, usuario.entrada, senha, olho].forEach(function (c) { c.disabled = true; });
        botao.textContent = "Pedido enviado";
        recado.className = "r-ajuda r-ajuda--ok";
        recado.textContent = "Pedido enviado. Aguarde o cadastro da sua conta.";
        recado.hidden = false;
        pintarPrevia();
        return;
      }
      botao.disabled = false;
      botao.textContent = "Tentar novamente";
      if (resp && resp.erro === "acesso_invalido" && resp.campo) {
        var e = {};
        e[resp.campo === "dados" ? "nome" : resp.campo] = resp.motivo === "existe" ? "Este nome de usuário já está em uso." : "O servidor não aceitou este campo.";
        mostrarErros(e);
      }
      var f = global.RAMAApi.frase(resp);
      recado.className = "r-ajuda r-ajuda--erro";
      recado.setAttribute("role", "alert");
      recado.textContent = f.texto + (resp && resp.segundos ? " (cerca de " + resp.segundos + " s)" : "");
      recado.hidden = false;
    });

    pintarPrevia();
    UI.modal({
      titulo: "Solicitar acesso",
      largo: true,
      conteudo: [
        el("p.t-mini", { texto: "O pedido vai para o administrador, que cria a sua conta manualmente. Nenhuma conta é criada agora." }),
        el("div.acesso-grade", {}, [formulario, previa]),
      ],
      botoes: [{ rotulo: "Fechar", classe: "r-botao--fantasma" }],
      aoFechar: function () { senha.value = ""; },
    });
    setTimeout(function () { nome.entrada.focus(); }, 0);
  }

  function desenharPortao(aoEntrar) {
    document.body.classList.add("tem-portao");

    var usuario = global.RAMAUI.campo({
      rotulo: "Agente", tipo: "text", limite: 40, autocomplete: "username", dica: "usuário",
    });

    var senhaCampo = el("input.r-entrada", {
      type: "password", id: "portao-senha", maxlength: 200, autocomplete: "current-password",
      placeholder: "senha",
    });

    var olho = el("button.r-icone.senha__olho", {
      type: "button", "aria-label": "Mostrar senha", "aria-pressed": "false",
      onclick: function () {
        var mostrando = senhaCampo.type === "text";
        senhaCampo.type = mostrando ? "password" : "text";
        olho.setAttribute("aria-pressed", String(!mostrando));
        olho.setAttribute("aria-label", mostrando ? "Mostrar senha" : "Ocultar senha");
        U.trocar(olho, [global.RAMAUI.simbolo(mostrando ? "olho" : "olhoFechado")]);
      },
    }, [global.RAMAUI.simbolo("olho")]);

    var recado = el("p.r-ajuda.r-ajuda--erro", { role: "alert", hidden: true });

    var botao = el("button.r-botao.r-botao--principal.r-botao--bloco", {
      type: "submit", texto: "Acessar arquivo",
    });

    var formulario = el("form.pilha", { novalidate: true }, [
      usuario,
      el("div.r-campo", {}, [
        el("label", { for: "portao-senha", texto: "Senha" }),
        el("div.senha", {}, [senhaCampo, olho]),
      ]),
      recado,
      botao,
    ]);

    formulario.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      recado.hidden = true;

      var u = usuario.entrada.value.trim();
      var s = senhaCampo.value;

      if (!u || !s) {
        recado.textContent = "Informe usuário e senha.";
        recado.hidden = false;
        return;
      }

      botao.disabled = true;
      botao.textContent = "Verificando…";

      var r = await entrar(u, s);

      botao.disabled = false;
      botao.textContent = "Acessar arquivo";
      /* A senha sai da memória do campo assim que foi usada. */
      senhaCampo.value = "";

      if (r && r.ok) { aoEntrar(r); return; }

      var f = global.RAMAApi.frase(r);
      recado.textContent = f.texto + (r && r.restam ? " Restam " + r.restam + " tentativas." : "");
      recado.hidden = false;
      senhaCampo.focus();
    });

    var tela = el("main.portao", {}, [
      el("div.portao__caixa", {}, [
        el("div.portao__marca", {}, [
          global.RAMAUI.marca(56),
          el("p.portao__nome", { texto: "R.A.M.A." }),
          el("p.portao__extenso", { texto: "Rede de Arquivamento Multiversal de Agentes" }),
        ]),
        formulario,
        el("p.portao__pedido", {}, [
          el("button.r-link.portao__pedido-botao", { type: "button", texto: "Não tem login? Solicite um!", onclick: function () { pedirAcesso(); } }),
        ]),
        el("p.t-mini", { texto: "Acesso restrito. Toda leitura e gravação é verificada no servidor." }),
      ]),
    ]);

    U.trocar(document.body, [el("div.veu", { "aria-hidden": "true" }), tela]);
    usuario.entrada.focus();

    /* Acorda o servidor enquanto a pessoa digita.

       O Apps Script hiberna, e a primeira chamada paga a subida do
       contêiner. Sem isto, essa conta caía justamente sobre o login —
       a operação em que esperar é mais irritante. Mandando um ping
       agora, os segundos de arranque acontecem durante a digitação e a
       senha chega a um servidor já acordado.

       Deliberadamente sem await e sem tratamento: se falhar, o login
       segue seu caminho normal e ninguém fica sabendo. */
    global.RAMAApi.ping().catch(function () { /* aquecer é opcional */ });
  }

  /* =================================================================
     A GUARDA
     -----------------------------------------------------------------
     Toda página protegida começa por aqui. Enquanto o servidor não
     responde, a tela mostra a abertura — nunca conteúdo em branco e
     nunca conteúdo que possa não ser desta pessoa.
     ================================================================= */

  function abertura() {
    var rotulo = el("p.r-carregando__rotulo.t-mini", { texto: "Acessando registro" });

    /* Meio minuto de barra andando sem explicação é indistinguível de
       travamento. Quando a rede avisa que está repetindo por demora, a
       tela conta o que está acontecendo — a espera continua a mesma,
       mas deixa de parecer defeito. */
    var explicacao = el("p.t-mini", { hidden: true, estilo: { maxWidth: "32ch", textAlign: "center" } });

    function aoDemorar() {
      explicacao.textContent =
        "O servidor estava em repouso e está acordando. A primeira consulta " +
        "depois de um tempo parado é a mais lenta; as seguintes são rápidas.";
      explicacao.hidden = false;
    }

    document.addEventListener("rama:servidor-demorando", aoDemorar);

    /* v6.3: a marca se desenha (o tronco cresce, os nós acendem), com o
       nome por extenso embaixo e uma grade de arquivo bem leve no fundo. */
    var tela = el("div.abertura", { role: "status" }, [
      el("div.abertura__caixa", {}, [
        el("span.abertura__marca", { "aria-hidden": "true" }, [global.RAMAUI.marca(64, { animada: true })]),
        el("div.abertura__titulos", {}, [
          el("p.abertura__nome", { texto: "R.A.M.A." }),
          el("p.abertura__extenso", { texto: "Rede de Arquivamento Multiversal de Agentes" }),
        ]),
        el("div.abertura__estado", {}, [
          rotulo,
          el("div.r-barra", { "aria-hidden": "true" }, [el("div.r-barra__preenche")]),
        ]),
        explicacao,
      ]),
    ]);

    document.body.appendChild(tela);

    return function () {
      document.removeEventListener("rama:servidor-demorando", aoDemorar);
      if (tela.parentNode) tela.parentNode.removeChild(tela);
    };
  }

  /* exigirSessao(aoTerSessao) — chama aoTerSessao(agente) quando o
     servidor confirmar; caso contrário desenha o portão. */
  async function exigirSessao(aoTerSessao, pedidos) {
    if (!global.RAMARede.configurado()) {
      desenharSemConfiguracao();
      return;
    }

    var fechar = abertura();
    var r = await retomar(pedidos);
    fechar();

    if (r && r.ok) {
      tocarAtividade();
      aoTerSessao(agente(), r.respostas || []);
      return;
    }

    /* O portão aparece SÓ quando o problema é mesmo a sessão.

       A regra era o contrário: qualquer erro fora de uma lista curta de
       falhas passageiras levava ao portão. Isso transforma qualquer
       recusa nova do servidor num pedido de senha — que a pessoa
       digita, que funciona, e que não resolve nada, porque o problema
       não era a senha. Errar para o lado de "o servidor está com
       algum problema" é sempre mais honesto do que errar para o lado
       de "você não está logado". */
    if (r && global.RAMAApi.ehErroDeSessao(r.erro)) {
      desenharPortao(function () { location.reload(); });
      return;
    }

    desenharSemServidor(r);
  }

  function desenharSemConfiguracao() {
    U.trocar(document.body, [
      el("div.veu", { "aria-hidden": "true" }),
      el("main.portao", {}, [
        el("div.portao__caixa", {}, [
          el("div.portao__marca", {}, [
            global.RAMAUI.marca(56),
            el("p.portao__nome", { texto: "R.A.M.A." }),
          ]),
          el("p.t-secao.t-aviso", { texto: "Sistema não configurado" }),
          el("p", { texto: "O endereço do servidor ainda não foi informado." }),
          el("p.t-mini", {
            texto: "Abra js/config.js e preencha API_URL com a URL do Apps Script publicado como app da Web (a que termina em /exec). O README explica o passo a passo.",
          }),
        ]),
      ]),
    ]);
  }

  function desenharSemServidor(resposta) {
    var f = global.RAMAApi.frase(resposta);
    U.trocar(document.body, [
      el("div.veu", { "aria-hidden": "true" }),
      el("main.portao", {}, [
        el("div.portao__caixa", {}, [
          el("div.portao__marca", {}, [
            global.RAMAUI.marca(56),
            el("p.portao__nome", { texto: "R.A.M.A." }),
          ]),
          el("p.t-secao.t-erro", { texto: f.titulo }),
          el("p", { texto: f.texto }),
          el("button.r-botao.r-botao--principal.r-botao--bloco", {
            type: "button", texto: "Tentar novamente",
            onclick: function () { location.reload(); },
          }),
        ]),
      ]),
    ]);
  }

  /* Cada resposta boa do servidor renova o relógio local de inatividade.
     Sem isto alguém que usa o sistema todo dia seria desconectado no
     trigésimo dia por um contador que ninguém atualizou. */
  document.addEventListener("rama:atividade", tocarAtividade);

  global.RAMAAuth = {
    token: token,
    agente: agente,
    entrar: entrar,
    retomar: retomar,
    sair: sair,
    esquecer: esquecer,
    exigirSessao: exigirSessao,
    aoPerderSessao: aoPerderSessao,
    tocarAtividade: tocarAtividade,
  };
})(window);
