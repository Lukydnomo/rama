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
  }

  function esquecer() {
    apagar(CHAVE_TOKEN);
    apagar(CHAVE_AGENTE);
    apagar(CHAVE_ATIVIDADE);
    agenteAtual = null;
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
     token presente no localStorage não prova nada. */
  async function retomar() {
    var tk = token();
    if (!tk) return { ok: false, erro: "sem_token" };
    if (venceuAqui()) { esquecer(); return { ok: false, erro: "expirada" }; }

    var r = await global.RAMAApi.sessao(tk);
    if (r && r.ok) {
      anotarSessao(tk, r.agente);
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
        el("p.t-mini", { texto: "Acesso restrito. Toda leitura e gravação é verificada no servidor." }),
      ]),
    ]);

    U.trocar(document.body, [el("div.veu", { "aria-hidden": "true" }), tela]);
    usuario.entrada.focus();
  }

  /* =================================================================
     A GUARDA
     -----------------------------------------------------------------
     Toda página protegida começa por aqui. Enquanto o servidor não
     responde, a tela mostra a abertura — nunca conteúdo em branco e
     nunca conteúdo que possa não ser desta pessoa.
     ================================================================= */

  function abertura() {
    var tela = el("div.abertura", { role: "status" }, [
      el("div.abertura__caixa", {}, [
        global.RAMAUI.marca(48),
        el("p.abertura__nome", { texto: "R.A.M.A." }),
        el("p.r-carregando__rotulo.t-mini", { texto: "Acessando registro" }),
        el("div.r-barra", { "aria-hidden": "true" }, [el("div.r-barra__preenche")]),
      ]),
    ]);
    document.body.appendChild(tela);
    return function () { if (tela.parentNode) tela.parentNode.removeChild(tela); };
  }

  /* exigirSessao(aoTerSessao) — chama aoTerSessao(agente) quando o
     servidor confirmar; caso contrário desenha o portão. */
  async function exigirSessao(aoTerSessao) {
    if (!global.RAMARede.configurado()) {
      desenharSemConfiguracao();
      return;
    }

    var fechar = abertura();
    var r = await retomar();
    fechar();

    if (r && r.ok) {
      tocarAtividade();
      aoTerSessao(agente());
      return;
    }

    /* Falha de rede não é falha de sessão: mandar alguém digitar a
       senha de novo porque o wi-fi caiu é castigo por nada. */
    if (r && (r.erro === "sem_conexao" || r.erro === "prazo" || r.erro === "servidor_falhou")) {
      desenharSemServidor(r);
      return;
    }

    desenharPortao(function () { location.reload(); });
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
