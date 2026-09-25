/* =====================================================================
   R.A.M.A. — testes de arrastar e soltar (v2.19)
   ---------------------------------------------------------------------
   As cinco abas que se organizam arrastando — habilidades, rituais,
   inventário, perícias e anotações — desenhadas DE VERDADE, com uma
   ficha de Ordem de teste, e o gesto feito como o navegador o entrega:
   eventos de ponteiro (mouse e toque) e teclado. Confere o que quem usa
   vê e o que fica na ficha:

     · durante o arraste, só a prévia muda — nada é gravado;
     · ao soltar, a ficha muda uma vez e pede para gravar uma vez;
     · destino recusado aparece recusado, com o motivo, e soltar ali não
       muda nada;
     · Esc e o cancelamento do sistema desfazem o gesto;
     · o clique que o navegador manda depois de um arraste não abre nada;
     · com filtro, os itens ocultos não trocam de lugar entre si;
     · mover não recria: o mesmo id, o mesmo conteúdo;
     · o que foi organizado sobrevive a gravar e reabrir a ficha.

   O servidor fica de fora: permissão, revisão e contagem de turnos são
   testadas em testes/executar-backend.js; a ordem e a conciliação, no
   modelo, em testes/casos.js.

   Toda espera aqui espera uma CONDIÇÃO ou um quadro de animação, nunca
   um tempo fixo que torce para a tela ter terminado.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  var F = global.RAMAFicha;
  var R = global.RAMAOrdemRegras;
  var H = global.RAMAHabilidades;
  var P = global.RAMAOrdemProgressao;
  var A = global.RAMAArrastar;
  var O = global.RAMAOrganizar;

  var saida = U.$("#saida");
  var placar = U.$("#placar");
  var palco = U.$("#palco");
  var passaram = 0;
  var falharam = 0;
  var falhas = [];
  var grupoAtual = null;

  var t = {
    grupo: function (titulo) {
      grupoAtual = el("div.grupo", {}, [el("p.grupo__titulo", { texto: titulo })]);
      saida.appendChild(grupoAtual);
    },
    ok: function (nome, condicao, detalhe) {
      if (condicao) passaram++; else { falharam++; falhas.push(nome); }
      if (!grupoAtual) t.grupo("Geral");
      grupoAtual.appendChild(el("div.caso", { class: condicao ? "caso--ok" : "caso--falhou" }, [
        el("span.caso__marca", { texto: condicao ? "ok" : "FALHOU" }),
        el("span", {}, [
          el("span", { texto: nome }),
          !condicao && detalhe ? el("span.caso__detalhe", { texto: " — " + detalhe }) : null,
        ]),
      ]));
    },
    igual: function (nome, obtido, esperado) {
      var mesmo = Object.is(obtido, esperado);
      t.ok(nome, mesmo, mesmo ? "" : "obtido " + JSON.stringify(obtido) + ", esperado " + JSON.stringify(esperado));
    },
    iguais: function (nome, obtido, esperado) {
      var a = JSON.stringify(obtido);
      var b = JSON.stringify(esperado);
      t.ok(nome, a === b, a === b ? "" : "obtido " + a + ", esperado " + b);
    },
  };

  /* ---------- esperas por condição ---------- */

  /* Um quadro de animação — ou, com a aba escondida (o navegador não
     anima o que ninguém vê), um instante. */
  function quadro() {
    return new Promise(function (ok) {
      var feito = false;
      var seguir = function () { if (!feito) { feito = true; setTimeout(ok, 0); } };
      requestAnimationFrame(seguir);
      setTimeout(seguir, 60);
    });
  }

  async function quadros(n) { for (var i = 0; i < n; i++) await quadro(); }

  async function ate(condicao, prazo) {
    var limite = Date.now() + (prazo || 5000);
    for (;;) {
      var v = condicao();
      if (v) return v;
      if (Date.now() > limite) return null;
      await quadro();
    }
  }

  /* ---------- a ficha de teste e o contexto que a ficha dá às abas ---------- */

  var estado = { ficha: null, modo: "edicao", aba: "habilidades", alteracoes: 0, desenhos: 0 };

  /* O mesmo contrato do contexto de js/paginas/ficha.js. Gravar é
     contar: `alterou` é o que a aba chama para o salvador subir a ficha. */
  var ctx = {
    get ficha() { return estado.ficha; },
    get foto() { return ""; },
    get campanhas() { return []; },
    get personagemId() { return "ficha-de-teste"; },
    emEdicao: function () { return estado.modo === "edicao"; },
    podeEditar: function () { return true; },
    ehDono: function () { return true; },
    revisao: function () { return 1; },
    alterou: function () { estado.alteracoes++; },
    redesenhar: function () { desenhar(); },
    atualizarTitulo: function () {},
    definirFoto: function () {},
    irParaAba: function (aba) { estado.aba = aba; desenhar(); },
    nomeDaCampanha: function () { return ""; },
    definirCampanha: function () {},
  };

  var SECOES = {
    habilidades: "RAMASecaoOrdemHabilidades",
    rituais: "RAMASecaoRituais",
    inventario: "RAMASecaoInventario",
    pericias: "RAMASecaoOrdemPericias",
    anotacoes: "RAMASecaoAnotacoes",
  };

  /* A ficha universal usa as abas dela — as mesmas de js/paginas/ficha.js. */
  var SECOES_UNIVERSAL = {
    habilidades: "RAMASecaoHabilidades",
    rituais: "RAMASecaoRituais",
    inventario: "RAMASecaoInventario",
    pericias: "RAMASecaoPericias",
    anotacoes: "RAMASecaoAnotacoes",
  };

  function desenhar() {
    estado.desenhos++;
    var secoes = F.ehDeOrdem(estado.ficha) ? SECOES : SECOES_UNIVERSAL;
    U.trocar(palco, el("div.ficha", { dataset: { modo: estado.modo } }, [
      el("div", { id: "aba-conteudo", role: "tabpanel" }, [global[secoes[estado.aba]].aba(ctx)]),
    ]));
  }

  function abrir(aba, modo) {
    if (A.arrastando()) A.cancelar();
    estado.aba = aba;
    estado.modo = modo || "edicao";
    desenhar();
  }

  function retrato() { return JSON.stringify(estado.ficha); }

  function fichaDeTeste() {
    var f = F.criarFicha({ nome: "Ficha de teste do arraste", tipoFicha: "ordem" });
    var o = R.fichaVazia();
    o.classe = "ocultista";
    o.origem = "academico";
    o.nex = 20;
    o.atributos = { agi: 1, "for": 1, int: 3, pre: 2, vig: 1 };
    f.ordem = R.normalizar(o);

    /* Habilidades da mesa em pastas — Combate tem uma subpasta. */
    var arv = H.arvoreVazia();
    var combate = H.criarPasta("Combate");
    var armas = H.criarPasta("Armas");
    var sessao = H.criarPasta("Sessão 3");
    H.inserir(arv, combate, null);
    H.inserir(arv, armas, combate.id);
    H.inserir(arv, sessao, null);
    H.inserir(arv, H.criarHabilidade({ nome: "Faro para pistas", texto: "Percebe o que os outros deixam passar." }), null);
    H.inserir(arv, H.criarHabilidade({ nome: "Golpe baixo", texto: "Um golpe que ninguém espera." }), combate.id);
    H.inserir(arv, H.criarHabilidade({ nome: "Lâmina fiel", texto: "A arma de sempre." }), armas.id);
    f.habilidades = arv;

    /* Rituais com círculo e elemento nos DADOS; um da mesa com elemento
       só no texto, e um sem nada. */
    function rit(nome, circulo, elemento, texto) {
      return F.criarRitual(F.normalizarRitual({ nome: nome, elemento: texto || "", ordem: { circulo: circulo, elemento: elemento } }));
    }
    f.rituais.itens = [
      rit("Luz", 1, "energia"),
      rit("Arma Atroz", 1, "sangue"),
      rit("Cicatrização", 1, "morte"),
      rit("Decadência", 1, "morte"),
      rit("Tecer Ilusão", 2, "conhecimento"),
      rit("Voz do Vazio", 3, "", "Vazio"),
      rit("Anotação de ritual", 0, "", ""),
    ];
    /* Dois deles conhecidos, pela concessão dos rituais iniciais. */
    var conc = P.confirmarAquisicao(f.ordem, f.rituais.itens,
      { tipo: "concessao", vaga: "d1.rituaisIniciais", rituais: [f.rituais.itens[0].id, f.rituais.itens[1].id] });

    f.inventario.itens = [
      F.criarItem("item", { nome: "Bandagem", categoria: "Consumível" }),
      F.criarItem("arma", { nome: "Faca", categoria: "Arma" }),
      F.criarItem("item", { nome: "Lanterna", categoria: "Consumível" }),
      F.criarItem("arma", { nome: "Pistola", categoria: "Arma" }),
      F.criarItem("item", { nome: "Pílula", categoria: "Consumível" }),
    ];

    var npcs = F.criarPasta("NPCs");
    var pistas = F.criarPasta("Pistas");
    var nota = function (titulo, conteudo) { var n = F.criarNota(titulo); n.conteudo = conteudo; return n; };
    npcs.notas.push(nota("Dono do bar", "Sabe mais do que diz."));
    pistas.notas.push(nota("Foto rasgada", "Achada no porão."));
    f.anotacoes = { pastas: [npcs, pistas], soltas: [nota("Lembrete", "Comprar munição."), nota("Diário", "Dia 1.")] };

    return { ficha: F.normalizarFicha(JSON.parse(JSON.stringify(f))), concessao: conc };
  }

  /* ---------- a tela ---------- */

  function itensDaLista(lista) {
    return U.$$("[data-arrastar-item]", lista).filter(function (it) {
      return it.parentElement && it.parentElement.closest("[data-arrastar-lista]") === lista;
    });
  }

  function lista(chave) {
    return palco.querySelector('[data-arrastar-lista="' + CSS.escape(chave) + '"]');
  }

  function nomesDaLista(chave) {
    var l = lista(chave);
    return l ? itensDaLista(l).map(function (x) { return x.dataset.arrastarRotulo; }) : null;
  }

  function item(rotulo) {
    return U.$$("[data-arrastar-item]", palco).filter(function (x) { return x.dataset.arrastarRotulo === rotulo; })[0] || null;
  }

  /* A alça do próprio item, não a de um item de dentro dele. */
  function alcaDe(no) {
    if (!no) return null;
    return U.$$("[data-arrastar-alca]", no).filter(function (a) { return a.closest("[data-arrastar-item]") === no; })[0] || null;
  }

  function cabecaDaPasta(chave) {
    return palco.querySelector('[data-arrastar-pasta="' + CSS.escape(chave) + '"]');
  }

  function botaoCom(texto) {
    return U.$$("button", palco).filter(function (b) { return b.textContent.trim() === texto; })[0] || null;
  }

  function clicar(alvo) {
    return alvo.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 }));
  }

  function escolher(select, valor) {
    select.value = valor;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function tecla(alvo, chave) {
    var ev = new KeyboardEvent("keydown", { key: chave, bubbles: true, cancelable: true });
    alvo.dispatchEvent(ev);
    return ev;
  }

  function idDoNo(nome) {
    var achado = null;
    H.percorrer(estado.ficha.habilidades, function (no) { if (no.nome === nome) achado = no; });
    return achado ? achado.id : "";
  }

  function avisoFalado() {
    var f = document.querySelector('.so-leitor[role="status"]');
    return f ? f.textContent : "";
  }

  /* ---------- o gesto ---------- */

  var sequencia = 40;

  function ponteiro(alvo, tipo, x, y, id, dispositivo) {
    var ev = new PointerEvent(tipo, {
      bubbles: true, cancelable: true, composed: true,
      pointerId: id, pointerType: dispositivo, isPrimary: true,
      clientX: x, clientY: y,
      button: tipo === "pointermove" ? -1 : 0,
      buttons: tipo === "pointerup" || tipo === "pointercancel" ? 0 : 1,
    });
    alvo.dispatchEvent(ev);
    return ev;
  }

  function centro(no) {
    var r = no.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* Espera a tela parar de mudar: uma fonte que só começa a carregar
     quando o texto novo é desenhado muda a altura das linhas depois. */
  async function assentar(alvos) {
    var antes = "";
    for (var i = 0; i < 30; i++) {
      var agora = alvos.map(function (a) {
        var r = a.getBoundingClientRect();
        return Math.round(r.top + global.scrollY) + ":" + Math.round(r.height);
      }).join("|");
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      if (agora === antes) return;
      antes = agora;
      await quadro();
    }
  }

  /* Põe a alça e o destino à vista juntos: o destino é achado pelo que
     está debaixo do ponteiro, como no navegador de verdade. */
  async function mostrarJuntos(a, b) {
    var ra = a.getBoundingClientRect();
    var rb = b.getBoundingClientRect();
    var meio = (Math.min(ra.top, rb.top) + Math.max(ra.bottom, rb.bottom)) / 2;
    global.scrollBy(0, meio - global.innerHeight / 2);
    await quadro();
  }

  function pontoEm(alvo, onde) {
    var r = alvo.getBoundingClientRect();
    var y = onde === "antes" ? r.top + Math.min(4, r.height / 5)
      : onde === "depois" ? r.bottom - Math.min(4, r.height / 5)
      : r.top + r.height / 2;
    return { x: r.left + Math.min(r.width / 2, 80), y: y };
  }

  /* Um arraste inteiro, em passos: aperta na alça, anda até o destino e
     solta — ou cancela, com `opcoes.cancelar` = "esc" | "sistema". O que
     se viu NO MEIO do gesto, antes de soltar, volta no resultado. */
  async function arrastar(alca, alvo, onde, opcoes) {
    var o = opcoes || {};
    var dispositivo = o.dispositivo || "mouse";
    var id = ++sequencia;
    await assentar([alca, alvo]);
    await mostrarJuntos(alca, alvo);
    var a = centro(alca);
    ponteiro(alca, "pointerdown", a.x, a.y, id, dispositivo);
    /* O destino é medido a cada passo: perto da borda a página rola
       sozinha (é para isso que ela serve), e o que estava num lugar da
       tela vai para outro. */
    var fim = pontoEm(alvo, onde);
    for (var passo = 1; passo <= 4; passo++) {
      fim = pontoEm(alvo, onde);
      ponteiro(alca, "pointermove", a.x + (fim.x - a.x) * passo / 4, a.y + (fim.y - a.y) * passo / 4 + (passo === 1 ? 8 : 0), id, dispositivo);
      await quadro();
    }
    /* Parado sobre o destino, até a tela parar de andar. */
    for (var volta = 0; volta < 6; volta++) {
      fim = pontoEm(alvo, onde);
      if (fim.y < 0 || fim.y > global.innerHeight) {
        global.scrollBy(0, fim.y - global.innerHeight / 2);
        await quadro();
        fim = pontoEm(alvo, onde);
      }
      ponteiro(alca, "pointermove", fim.x, fim.y, id, dispositivo);
      await quadro();
      var agora = pontoEm(alvo, onde);
      if (Math.abs(agora.y - fim.y) < 1 && Math.abs(agora.x - fim.x) < 1) break;
    }

    var fantasma = document.querySelector(".arrastar-fantasma");
    var linha = document.querySelector(".arrastar-linha");
    var motivo = document.querySelector(".arrastar-fantasma__motivo");
    var meio = {
      arrastando: A.arrastando(),
      fantasma: !!fantasma,
      nomeNoFantasma: fantasma ? fantasma.textContent : "",
      motivo: motivo ? motivo.textContent : "",
      linhaVisivel: !!(linha && !linha.hidden),
      origem: !!document.querySelector(".arrastar-origem"),
      dentro: !!document.querySelector(".arrastar-alvo-dentro"),
      recusado: !!document.querySelector(".arrastar-alvo-recusado, .arrastar-linha--recusada, .arrastar-fantasma--recusado"),
      retrato: retrato(),
      alteracoes: estado.alteracoes,
      desenhos: estado.desenhos,
      /* Para o relatório de uma falha: onde o gesto parou e o que havia ali. */
      ponto: [Math.round(fim.x), Math.round(fim.y)],
      sob: (function () {
        var sob = document.elementFromPoint(fim.x, fim.y);
        return sob ? sob.tagName.toLowerCase() + "." + String(sob.className || "").split(" ")[0] : "nada";
      })(),
      rolagem: Math.round(global.scrollY),
    };

    var textosDosAvisos = function () {
      return U.$$(".r-aviso__texto").map(function (x) { return x.textContent; });
    };
    var avisosAntes = textosDosAvisos().length;
    if (o.cancelar === "esc") {
      tecla(document.activeElement || document.body, "Escape");
      ponteiro(alca, "pointerup", fim.x, fim.y, id, dispositivo);
    } else if (o.cancelar === "sistema") {
      ponteiro(alca, "pointercancel", fim.x, fim.y, id, dispositivo);
    } else {
      ponteiro(alca, "pointerup", fim.x, fim.y, id, dispositivo);
      if (o.cliqueDepois) {
        /* O clique que o navegador dispara no fim do gesto, no que está
           debaixo do ponteiro. */
        var sob = document.elementFromPoint(fim.x, fim.y) || document.body;
        meio.cliqueDepoisValeu = sob.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1, clientX: fim.x, clientY: fim.y }));
      }
    }
    /* O que apareceu como aviso ao soltar: um destino recusado explica. */
    meio.avisos = textosDosAvisos().slice(avisosAntes);
    meio.depois = {
      fantasma: !!document.querySelector(".arrastar-fantasma"),
      linha: !!document.querySelector(".arrastar-linha"),
      arrastando: A.arrastando(),
    };
    await quadro();
    return meio;
  }

  /* =================================================================
     HABILIDADES
     ================================================================= */

  async function habilidades() {
    t.grupo("Habilidades — nós da mesa e habilidades das regras, em pastas");
    abrir("habilidades", "edicao");
    var arv = function () { return estado.ficha.habilidades; };
    var org = function () { return estado.ficha.ordem.organizacao.habilidades; };

    var todos = U.$$("[data-arrastar-item]", palco);
    var regras = U.$$('[data-arrastar-tipo="regra"]', palco);
    t.ok("no modo edição, cada nó e cada habilidade das regras tem a sua alça",
      todos.length >= 6 && regras.length > 0 && todos.every(function (x) { return !!alcaDe(x); }));
    t.ok("  a alça diz o que faz, para leitor de tela", /Arraste, ou use as setas/.test(alcaDe(todos[0]).getAttribute("aria-label")));

    /* Uma habilidade da mesa para dentro de uma pasta, soltando no nome. */
    var faro = idDoNo("Faro para pistas");
    var combate = idDoNo("Combate");
    var antes = retrato();
    var gravacoes = estado.alteracoes;
    var meio = await arrastar(alcaDe(item("Faro para pistas")), cabecaDaPasta(combate), "meio");
    t.ok("durante o arraste: o fantasma com o nome, a origem apagada e a pasta de destino marcada",
      meio.arrastando && meio.fantasma && /Faro para pistas/.test(meio.nomeNoFantasma) && meio.origem && meio.dentro,
      JSON.stringify(Object.assign({}, meio, { retrato: undefined })));
    t.ok("  e nada gravado no meio: a ficha é a mesma e ninguém pediu para salvar",
      meio.retrato === antes && meio.alteracoes === gravacoes);
    t.ok("  soltou: o fantasma e a linha somem", !meio.depois.fantasma && !meio.depois.linha && !meio.depois.arrastando);
    var achado = H.achar(arv(), faro);
    t.ok("soltar no nome da pasta põe a habilidade dentro dela", !!achado && !!achado.pai && achado.pai.id === combate);
    t.igual("  a ficha pede para gravar uma vez", estado.alteracoes, gravacoes + 1);
    t.ok("  é o mesmo nó: o mesmo id e o mesmo texto", achado.no.texto === "Percebe o que os outros deixam passar.");
    t.igual("  e nenhum nó foi criado nem apagado", H.contar(arv()).habilidades, 3);

    /* Uma habilidade das regras numa pasta: preferência de apresentação. */
    var regra = U.$$('[data-arrastar-tipo="regra"]', palco)[0];
    var regraId = regra.dataset.arrastarItem;
    var regraNome = regra.dataset.arrastarRotulo;
    var sessao = idDoNo("Sessão 3");
    var aquisicao = JSON.stringify([estado.ficha.ordem.escolhas, estado.ficha.ordem.personalizacoes, estado.ficha.ordem.excluidas]);
    var arvoreAntes = JSON.stringify(arv());
    await arrastar(alcaDe(regra), cabecaDaPasta(sessao), "meio", { dispositivo: "touch" });
    t.igual("a habilidade das regras vai para a pasta (toque)", org().lugares[regraId], sessao);
    t.ok("  e aparece dentro dela", (nomesDaLista(sessao) || []).indexOf(regraNome) >= 0);
    t.ok("  sem virar nó da árvore — não vira Homebrew", JSON.stringify(arv()) === arvoreAntes);
    t.ok("  e sem mexer na aquisição, na versão personalizada ou nas excluídas",
      JSON.stringify([estado.ficha.ordem.escolhas, estado.ficha.ordem.personalizacoes, estado.ficha.ordem.excluidas]) === aquisicao);

    /* Ciclo: a pasta sobre uma pasta que está dentro dela. */
    var armas = idDoNo("Armas");
    antes = retrato();
    gravacoes = estado.alteracoes;
    meio = await arrastar(alcaDe(item("Combate")), cabecaDaPasta(armas), "meio");
    t.ok("pasta sobre uma pasta de dentro dela: recusado ENQUANTO arrasta, com o motivo",
      meio.recusado && /dentro dela/.test(meio.motivo));
    t.ok("  e soltar ali não muda nada", retrato() === antes && estado.alteracoes === gravacoes);
    t.ok("  a não ser mostrar o motivo num aviso", meio.avisos.some(function (x) { return /dentro dela/.test(x); }));

    /* Reordenar entre vizinhas, na raiz. */
    await arrastar(alcaDe(item("Sessão 3")), item("Combate"), "antes");
    var raiz = nomesDaLista("*");
    t.ok("uma pasta muda de lugar entre as vizinhas", raiz.indexOf("Sessão 3") >= 0 && raiz.indexOf("Sessão 3") < raiz.indexOf("Combate"));

    /* Teclado: ↑ na alça. */
    var golpe = idDoNo("Golpe baixo");
    var dentroAntes = nomesDaLista(combate);
    var alca = alcaDe(item("Golpe baixo"));
    alca.focus();
    tecla(alca, "ArrowUp");
    await ate(function () { return document.activeElement && document.activeElement.dataset.foco === "arrastar-" + golpe; });
    var dentroDepois = nomesDaLista(combate);
    t.igual("↑ na alça sobe um passo dentro da pasta", dentroDepois.indexOf("Golpe baixo"), dentroAntes.indexOf("Golpe baixo") - 1);
    t.ok("  o foco continua na alça do mesmo item", document.activeElement && document.activeElement.dataset.foco === "arrastar-" + golpe);
    t.ok("  e o leitor de tela ouve a posição nova", !!(await ate(function () { return /Golpe baixo: posição \d+ de \d+/.test(avisoFalado()); })));

    /* Um modo automático: sem alça, e o comando para voltar. */
    var guardada = JSON.stringify([org().ordem, org().lugares, arv()]);
    escolher(palco.querySelector('[data-ordenacao="habilidades"] select'), "az");
    t.ok("em A–Z não há alça — arrastar ali seria desfeito pela ordem automática", !palco.querySelector("[data-arrastar-alca]"));
    var usar = botaoCom("Usar ordem personalizada");
    t.ok("  e há o comando para usar a ordem personalizada", !!usar);
    clicar(usar);
    t.ok("voltar à personalizada devolve a ordem guardada, intacta",
      JSON.stringify([org().ordem, org().lugares, arv()]) === guardada && !!palco.querySelector("[data-arrastar-alca]"));

    abrir("habilidades", "normal");
    t.ok("fora do modo edição, as habilidades não têm alça", !palco.querySelector("[data-arrastar-alca]"));
  }

  /* =================================================================
     RITUAIS
     ================================================================= */

  async function rituais(concessao) {
    t.grupo("Rituais — conhecidos e registros; círculo e elemento, juntos ou separados");
    t.ok("(a ficha de teste tem dois rituais conhecidos pela concessão)", !!(concessao && concessao.ok));
    abrir("rituais", "edicao");
    var ordemDos = function () { return estado.ficha.rituais.itens.map(function (r) { return r.nome; }); };
    var aprendizado = function () { return JSON.stringify([estado.ficha.ordem.escolhas, estado.ficha.ordem.registrosDeRitual]); };

    t.iguais("Conhecidos e Registros são listas separadas", [nomesDaLista("conhecidos|"), (nomesDaLista("registros|") || []).length],
      [["Luz", "Arma Atroz"], 5]);

    var apr = aprendizado();
    await arrastar(alcaDe(item("Luz")), item("Arma Atroz"), "depois");
    t.iguais("dentro de Conhecidos, a ordem muda arrastando", nomesDaLista("conhecidos|"), ["Arma Atroz", "Luz"]);
    t.ok("  sem mexer no aprendizado", aprendizado() === apr);

    var antes = retrato();
    var gravacoes = estado.alteracoes;
    var meio = await arrastar(alcaDe(item("Luz")), item("Tecer Ilusão"), "antes");
    t.ok("de Conhecidos para Registros: recusado, com o motivo", meio.recusado && /não se trocam arrastando/.test(meio.motivo));
    t.ok("  e nada muda — o ritual continua conhecido", retrato() === antes && estado.alteracoes === gravacoes);
    t.ok("  e o motivo aparece num aviso ao soltar", meio.avisos.some(function (x) { return /não se trocam arrastando/.test(x); }));

    /* Círculo. */
    clicar(palco.querySelector('[data-foco="criterio-circulo"]'));
    var grupos = function () { return U.$$("h4.rituais-grupo", palco).map(function (h) { return h.textContent; }); };
    var subgrupos = function () { return U.$$("h5.rituais-subgrupo", palco).map(function (h) { return h.textContent; }); };
    t.iguais("Círculo: grupos por círculo, em ordem numérica, e o sem círculo no fim — em cada lugar",
      grupos(), ["1º círculo (2)", "1º círculo (2)", "2º círculo (1)", "3º círculo (1)", "Círculo não informado (1)"]);
    t.igual("  o botão diz que está ligado", palco.querySelector('[data-foco="criterio-circulo"]').getAttribute("aria-pressed"), "true");
    t.igual("  a escolha fica na ficha", JSON.stringify(estado.ficha.ordem.organizacao.rituais.criterios), '["circulo"]');

    var ordemBase = ordemDos();
    await arrastar(alcaDe(item("Decadência")), item("Cicatrização"), "antes", { dispositivo: "touch" });
    t.iguais("dentro do grupo, arrastar reordena (toque)", nomesDaLista("registros|c1"), ["Decadência", "Cicatrização"]);
    var esperada = ordemBase.slice();
    esperada.splice(esperada.indexOf("Decadência"), 1);
    esperada.splice(esperada.indexOf("Cicatrização"), 0, "Decadência");
    t.iguais("  e a ordem guardada muda só ali", ordemDos(), esperada);

    antes = retrato();
    meio = await arrastar(alcaDe(item("Tecer Ilusão")), item("Voz do Vazio"), "antes");
    t.ok("de um círculo para outro: recusado — o grupo vem do ritual", meio.recusado && /O grupo vem do círculo e do elemento/.test(meio.motivo));
    t.ok("  e nada muda", retrato() === antes);

    /* Elemento, junto: círculo primeiro (o padrão). */
    clicar(palco.querySelector('[data-foco="criterio-elemento"]'));
    t.igual("Círculo e Elemento: a prioridade é círculo, depois elemento", JSON.stringify(estado.ficha.ordem.organizacao.rituais.criterios), '["circulo","elemento"]');
    t.ok("  com os elementos como subgrupos dentro de cada círculo",
      subgrupos().indexOf("Morte (2)") >= 0 && grupos()[0] === "1º círculo (2)");
    var prioridade = palco.querySelector('[data-foco="criterio-prioridade"]');
    t.ok("  e a prioridade à vista, num seletor", !!prioridade && prioridade.value === "circulo");
    escolher(prioridade, "elemento");
    t.igual("trocar a prioridade: elemento, depois círculo", JSON.stringify(estado.ficha.ordem.organizacao.rituais.criterios), '["elemento","circulo"]');
    t.ok("  agora os grupos são elementos e os subgrupos, círculos",
      grupos().indexOf("Morte (2)") >= 0 && subgrupos().indexOf("1º círculo (2)") >= 0);
    t.ok("  o da mesa com elemento só no texto fica no grupo dele, e o sem elemento no fim",
      grupos().indexOf("Vazio (1)") >= 0 && grupos()[grupos().length - 1] === "Elemento não informado (1)");
    var total = 0;
    U.$$(".rituais-lista", palco).forEach(function (l) { total += itensDaLista(l).length; });
    t.igual("  cada ritual aparece uma vez só, e todos aparecem", total, estado.ficha.rituais.itens.length);

    clicar(palco.querySelector('[data-foco="criterio-circulo"]'));
    t.igual("desligar o círculo deixa só o elemento", JSON.stringify(estado.ficha.ordem.organizacao.rituais.criterios), '["elemento"]');
    clicar(palco.querySelector('[data-foco="criterio-elemento"]'));
    t.ok("desligar os dois volta à lista sem grupos", !palco.querySelector("h4.rituais-grupo"));

    /* Trocar a ordem base não destrói a personalizada. */
    var personalizada = ordemDos();
    escolher(palco.querySelector('[data-ordenacao="rituais"] select'), "az");
    t.iguais("em A–Z, a tela ordena pelo nome", nomesDaLista("registros|"),
      nomesDaLista("registros|").slice().sort(function (a, b) { return U.compararNomes(a, b); }));
    t.ok("  sem alça, e com o comando para voltar", !palco.querySelector("[data-arrastar-alca]") && !!botaoCom("Usar ordem personalizada"));
    t.iguais("  e a ordem guardada é a mesma", ordemDos(), personalizada);
    clicar(botaoCom("Usar ordem personalizada"));
    t.iguais("de volta à personalizada, a tela mostra a ordem de antes", nomesDaLista("conhecidos|"), ["Arma Atroz", "Luz"]);

    /* Cancelar: Esc e o cancelamento do sistema. */
    antes = retrato();
    meio = await arrastar(alcaDe(item("Decadência")), item("Voz do Vazio"), "depois", { cancelar: "esc" });
    t.ok("Esc no meio do arraste cancela: nada muda e a prévia some",
      meio.arrastando && retrato() === antes && !meio.depois.fantasma && !meio.depois.arrastando);
    t.ok("  e o leitor de tela ouve que foi cancelado", !!(await ate(function () { return /cancelado/.test(avisoFalado()); })));
    meio = await arrastar(alcaDe(item("Decadência")), item("Voz do Vazio"), "depois", { cancelar: "sistema", dispositivo: "touch" });
    t.ok("o cancelamento do sistema (pointercancel) também não muda nada", retrato() === antes && !meio.depois.arrastando);

    /* Rolagem perto da borda. Ela anda a cada quadro de animação — e,
       para o teste não depender de o navegador estar desenhando (uma aba
       escondida não desenha), os quadros são dados aqui, um a um, pela
       mesma função que o navegador chamaria. */
    var fila = [];
    var numero = 0;
    var rafOriginal = global.requestAnimationFrame;
    var cafOriginal = global.cancelAnimationFrame;
    function quadrosNaMao(n) {
      for (var k = 0; k < n; k++) {
        var agora = fila;
        fila = [];
        agora.forEach(function (x) { x.fn(performance.now()); });
      }
    }
    var alcaLuz = alcaDe(item("Luz"));
    await assentar([alcaLuz]);
    var r0 = alcaLuz.getBoundingClientRect();
    global.scrollBy(0, r0.top - global.innerHeight / 2);
    await quadro();
    var inicio = global.scrollY;
    var comecou = false;
    var desceu = 0;
    var subiu = 0;
    global.requestAnimationFrame = function (fn) { fila.push({ id: ++numero, fn: fn }); return numero; };
    global.cancelAnimationFrame = function (n) { fila = fila.filter(function (x) { return x.id !== n; }); };
    try {
      var p = centro(alcaLuz);
      var id = ++sequencia;
      ponteiro(alcaLuz, "pointerdown", p.x, p.y, id, "mouse");
      ponteiro(alcaLuz, "pointermove", p.x, p.y + 12, id, "mouse");
      comecou = A.arrastando();
      ponteiro(alcaLuz, "pointermove", p.x, global.innerHeight - 4, id, "mouse");
      quadrosNaMao(6);
      desceu = global.scrollY - inicio;
      ponteiro(alcaLuz, "pointermove", p.x, 4, id, "mouse");
      var noFundo = global.scrollY;
      quadrosNaMao(3);
      subiu = noFundo - global.scrollY;
      ponteiro(alcaLuz, "pointermove", p.x, global.innerHeight / 2, id, "mouse");
      var parado = global.scrollY;
      quadrosNaMao(3);
      var ficou = global.scrollY === parado;
      tecla(document.body, "Escape");
      quadrosNaMao(2);
      var semSobra = !A.arrastando() && !fila.length && retrato() === antes;
    } finally {
      global.requestAnimationFrame = rafOriginal;
      global.cancelAnimationFrame = cafOriginal;
      if (A.arrastando()) A.cancelar();
    }
    /* O clique que viria logo depois do gesto é engolido até o próximo
       instante; o teste seguinte começa depois dele, como uma pessoa. */
    await quadro();
    t.ok("arrastar perto da borda de baixo rola a página para baixo", comecou && desceu > 0,
      "começou: " + comecou + ", desceu " + desceu + " px");
    t.ok("  perto da borda de cima, para cima", subiu > 0, "subiu " + subiu + " px");
    t.ok("  e longe das bordas, a página fica parada", ficou);
    t.ok("  o Esc depois não deixa arraste pendurado, quadro pedido nem mudança", semSobra);
  }

  /* =================================================================
     INVENTÁRIO
     ================================================================= */

  async function inventario() {
    t.grupo("Inventário — com filtro, os ocultos ficam onde estavam");
    abrir("inventario", "edicao");
    var nomes = function () { return estado.ficha.inventario.itens.map(function (i) { return i.nome; }); };
    var porNome = function (n) { return estado.ficha.inventario.itens.filter(function (i) { return i.nome === n; })[0]; };

    var filtro = U.$$("button.filtro", palco).filter(function (b) { return /^Consumível/.test(b.textContent.trim()); })[0];
    clicar(filtro);
    t.iguais("o filtro mostra só os consumíveis", nomesDaLista("inventario"), ["Bandagem", "Lanterna", "Pílula"]);
    t.ok("  e avisa como o arraste funciona com ele", /os outros continuam onde estavam/.test(palco.textContent));

    var pilula = JSON.stringify(porNome("Pílula"));
    await arrastar(alcaDe(item("Pílula")), item("Bandagem"), "antes", { dispositivo: "touch" });
    t.iguais("o item vai para antes do vizinho visível", nomesDaLista("inventario"), ["Pílula", "Bandagem", "Lanterna"]);
    t.iguais("  e os ocultos não trocam de ordem entre si", nomes(), ["Pílula", "Bandagem", "Faca", "Lanterna", "Pistola"]);
    t.ok("  o mesmo item, com o mesmo id, categoria e tudo", JSON.stringify(porNome("Pílula")) === pilula);

    var alca = alcaDe(item("Bandagem"));
    var bandagem = porNome("Bandagem").id;
    alca.focus();
    tecla(alca, "ArrowDown");
    await ate(function () { return document.activeElement && document.activeElement.dataset.foco === "arrastar-" + bandagem; });
    t.iguais("↓ na alça desce um passo entre os visíveis", nomesDaLista("inventario"), ["Pílula", "Lanterna", "Bandagem"]);
    t.iguais("  e os ocultos continuam na ordem deles", nomes().filter(function (n) { return n === "Faca" || n === "Pistola"; }), ["Faca", "Pistola"]);
    t.ok("  o foco fica na alça", document.activeElement && document.activeElement.dataset.foco === "arrastar-" + bandagem);

    var todas = U.$$("button.filtro", palco).filter(function (b) { return /^Todas/.test(b.textContent.trim()); })[0];
    clicar(todas);
    t.iguais("sem filtro, a lista inteira na ordem guardada", nomesDaLista("inventario"), nomes());

    /* Clique depois do arraste: não abre o item. */
    var abertos = function () { return U.$$("details[open]", palco).length; };
    var abertosAntes = abertos();
    var meio = await arrastar(alcaDe(item("Faca")), item("Pistola"), "depois", { cliqueDepois: true });
    t.ok("o clique que vem depois do arraste é engolido — nada abre", meio.cliqueDepoisValeu === false && abertos() === abertosAntes);

    /* Aperto sem arrastar: foco na alça, e o cartão não abre. */
    var alcaFaca = alcaDe(item("Faca"));
    var p = centro(alcaFaca);
    var id = ++sequencia;
    ponteiro(alcaFaca, "pointerdown", p.x, p.y, id, "mouse");
    ponteiro(alcaFaca, "pointermove", p.x + 2, p.y + 1, id, "mouse");
    t.ok("mexer 2 px não começa o arraste (o limiar é de 4)", !A.arrastando());
    ponteiro(alcaFaca, "pointerup", p.x + 2, p.y + 1, id, "mouse");
    var cartao = alcaFaca.closest("details");
    var aberto = cartao ? cartao.open : false;
    clicar(alcaFaca);
    t.ok("apertar a alça sem arrastar põe o foco nela e não abre o cartão",
      document.activeElement === alcaFaca && (cartao ? cartao.open === aberto : true));

    t.igual("a alça não deixa o toque rolar a página", getComputedStyle(alcaFaca).touchAction, "none");
    t.ok("  mas o resto do cartão deixa", getComputedStyle(item("Faca")).touchAction !== "none");

    escolher(palco.querySelector('[data-ordenacao="inventario"] select'), "az");
    t.ok("A–Z: sem alça, com o comando para usar a ordem personalizada",
      !palco.querySelector("[data-arrastar-alca]") && !!botaoCom("Usar ordem personalizada"));
    clicar(botaoCom("Usar ordem personalizada"));
  }

  /* =================================================================
     PERÍCIAS
     ================================================================= */

  async function pericias() {
    t.grupo("Perícias — pelo total que a linha mostra, e na ordem de quem joga");
    var o = estado.ficha.ordem;
    R.definirAjusteDePericia(o, "luta", { extra: -3 });
    R.definirAjusteDePericia(o, "crime", { extra: -3 });
    R.definirAjusteDePericia(o, "artes", { extra: 4 });
    abrir("pericias", "edicao");

    var linhas = function () { return itensDaLista(lista("pericias")); };
    var chaves = function () { return linhas().map(function (l) { return l.dataset.arrastarItem; }); };
    var nomes = function () { return linhas().map(function (l) { return l.dataset.arrastarRotulo; }); };
    var totalNaTela = function (l) {
      var b = l.querySelector('[data-foco^="total-"]');
      return b ? Number(b.textContent.replace(/[−–]/g, "-").replace(/[^\d-]/g, "")) : NaN;
    };
    var totalDoModelo = function (chave) { return R.bonusDePericia(o, chave, estado.ficha.inventario).total; };
    var org = function () { return estado.ficha.ordem.organizacao.pericias; };

    t.igual("ficha sem preferência: ordem alfabética", org().modo, "az");
    t.iguais("  a tela está em ordem alfabética", nomes(), nomes().slice().sort(function (a, b) { return U.compararNomes(a, b); }));
    t.ok("  num modo automático, sem alça e com o comando para a personalizada",
      !palco.querySelector("[data-arrastar-alca]") && !!botaoCom("Usar ordem personalizada"));
    t.ok("o total na tela é o do cálculo da ficha", linhas().every(function (l) { return totalNaTela(l) === totalDoModelo(l.dataset.arrastarItem); }));

    var seletor = function () { return palco.querySelector('[data-foco="ordem-pericias"]'); };
    escolher(seletor(), "maior");
    var maior = linhas().map(function (l) { return [totalNaTela(l), l.dataset.arrastarRotulo]; });
    t.ok("maior bônus primeiro, pelo total (negativos no fim)",
      maior.every(function (x, i) { return !i || maior[i - 1][0] >= x[0]; }) && maior[maior.length - 1][0] < 0);
    t.ok("  empate desempata pelo nome", maior.every(function (x, i) {
      return !i || maior[i - 1][0] !== x[0] || U.compararNomes(maior[i - 1][1], x[1]) <= 0;
    }));
    escolher(seletor(), "menor");
    var menor = linhas().map(function (l) { return totalNaTela(l); });
    t.ok("menor bônus primeiro", menor.every(function (x, i) { return !i || menor[i - 1] <= x; }));
    var naTela = chaves();

    clicar(botaoCom("Usar ordem personalizada"));
    t.iguais("a primeira ordem personalizada parte da que estava na tela — nada pula", chaves(), naTela);
    t.iguais("  guardada pelas chaves das perícias", org().ordem, naTela);

    var semOrganizacao = function () {
      var c = JSON.parse(JSON.stringify(estado.ficha.ordem));
      delete c.organizacao;
      return JSON.stringify(c);
    };
    var resto = semOrganizacao();
    var primeiro = nomes()[0];
    await arrastar(alcaDe(item("Luta")), item(primeiro), "antes");
    t.igual("arrastar Luta para o topo", chaves()[0], "luta");
    t.igual("  a ordem guardada acompanha", org().ordem[0], "luta");
    t.ok("  e grau, atributo, extra e o resto da ficha ficam como estavam", semOrganizacao() === resto);

    var alcaLuta = alcaDe(item("Luta"));
    alcaLuta.focus();
    tecla(alcaLuta, "ArrowDown");
    await ate(function () { return document.activeElement && document.activeElement.dataset.foco === "arrastar-luta"; });
    t.igual("↓ na alça desce um passo", chaves().indexOf("luta"), 1);

    var personalizada = org().ordem.slice();
    escolher(seletor(), "az");
    escolher(seletor(), "personalizada");
    t.iguais("trocar para A–Z e voltar não mexe na ordem personalizada", org().ordem, personalizada);
    t.iguais("  e a tela volta a ela", chaves(), personalizada);

    /* Editar o extra com a ordem por bônus: a linha não pula a cada tecla. */
    escolher(seletor(), "maior");
    var campo = palco.querySelector('[data-foco="extra-atletismo"]');
    var ordemAntes = chaves();
    var desenhos = estado.desenhos;
    campo.focus();
    campo.value = "-";
    campo.dispatchEvent(new Event("input", { bubbles: true }));
    campo.value = "-9";
    campo.dispatchEvent(new Event("input", { bubbles: true }));
    t.ok("digitando o extra, nada se move nem se redesenha", JSON.stringify(chaves()) === JSON.stringify(ordemAntes) && estado.desenhos === desenhos);
    campo.dispatchEvent(new Event("change", { bubbles: true }));
    await ate(function () { return estado.desenhos > desenhos; });
    await ate(function () { return document.activeElement && document.activeElement.dataset.foco === "extra-atletismo"; });
    t.ok("confirmado, a lista se reorganiza pelo total novo", chaves().indexOf("atletismo") > ordemAntes.indexOf("atletismo"));
    t.ok("  e o foco volta para o mesmo campo", document.activeElement && document.activeElement.dataset.foco === "extra-atletismo");
    t.igual("  com o extra guardado", R.bonusDePericia(o, "atletismo", estado.ficha.inventario).total, totalNaTela(item("Atletismo")));
    escolher(seletor(), "personalizada");
  }

  /* =================================================================
     ANOTAÇÕES
     ================================================================= */

  async function anotacoes() {
    t.grupo("Anotações — organizar no uso normal, entre pastas e sem pasta");
    abrir("anotacoes", "normal");
    var an = function () { return estado.ficha.anotacoes; };
    var pasta = function (nome) { return an().pastas.filter(function (p) { return p.nome === nome; })[0]; };
    var nota = function (titulo) { var r = F.todasAsNotas(an()).filter(function (x) { return x.nota.titulo === titulo; })[0]; return r || null; };

    t.ok("no modo normal, quem pode editar a ficha tem as alças das notas e das pastas",
      !!alcaDe(item("Lembrete")) && !!alcaDe(item("NPCs")));

    var lembrete = JSON.stringify(nota("Lembrete").nota);
    var gravacoes = estado.alteracoes;
    await arrastar(alcaDe(item("Lembrete")), cabecaDaPasta("notas:" + pasta("NPCs").id), "meio");
    t.ok("soltar a nota no nome da pasta a põe lá dentro",
      pasta("NPCs").notas.some(function (n) { return n.titulo === "Lembrete"; }) && !an().soltas.some(function (n) { return n.titulo === "Lembrete"; }));
    t.ok("  a mesma nota: id, título, conteúdo e datas", JSON.stringify(nota("Lembrete").nota) === lembrete);
    t.igual("  e a ficha pede para gravar uma vez", estado.alteracoes, gravacoes + 1);

    await arrastar(alcaDe(item("Foto rasgada")), item("Diário"), "depois", { dispositivo: "touch" });
    t.ok("soltar entre as notas sem pasta tira a nota da pasta (toque)",
      an().soltas.map(function (n) { return n.titulo; }).join(",") === "Diário,Foto rasgada" && pasta("Pistas").notas.length === 0);

    await arrastar(alcaDe(item("Pistas")), item("NPCs"), "antes");
    t.iguais("as pastas mudam de lugar entre si", an().pastas.map(function (p) { return p.nome; }), ["Pistas", "NPCs"]);

    var antes = retrato();
    var meio = await arrastar(alcaDe(item("Pistas")), item("Diário"), "depois");
    t.ok("uma pasta não vai para o meio das notas: recusado, com o motivo", meio.recusado && /não ficam dentro de outras pastas/.test(meio.motivo));
    t.ok("  e nada muda — nem a ordem das pastas", retrato() === antes);
    t.ok("  e o motivo aparece num aviso ao soltar", meio.avisos.some(function (x) { return /não ficam dentro de outras pastas/.test(x); }));

    var alca = alcaDe(item("Lembrete"));
    var idLembrete = nota("Lembrete").nota.id;
    alca.focus();
    tecla(alca, "ArrowUp");
    await ate(function () { return document.activeElement && document.activeElement.dataset.foco === "arrastar-" + idLembrete; });
    t.iguais("↑ na alça sobe a nota dentro da pasta", pasta("NPCs").notas.map(function (n) { return n.titulo; }), ["Lembrete", "Dono do bar"]);

    var aberta = palco.querySelector('.arvore__nota[aria-current="true"]');
    var abertaAntes = aberta ? aberta.textContent : "";
    var alcaDiario = alcaDe(item("Diário"));
    clicar(alcaDiario);
    var agora = palco.querySelector('.arvore__nota[aria-current="true"]');
    t.ok("clicar na alça não abre a nota — a alça e o botão da nota são coisas separadas", (agora ? agora.textContent : "") === abertaAntes);
    var caixaDaPasta = item("NPCs");
    var abertaDaPasta = caixaDaPasta.open;
    clicar(alcaDe(caixaDaPasta));
    t.ok("clicar na alça de uma pasta não abre nem fecha a pasta", caixaDaPasta.open === abertaDaPasta);

    abrir("anotacoes", "edicao");
    t.ok("no modo edição também", !!alcaDe(item("Diário")));
  }

  /* =================================================================
     GRAVAR E REABRIR
     ================================================================= */

  function ordemNaTela(aba) {
    abrir(aba, "edicao");
    return U.$$("[data-arrastar-item]", palco).map(function (x) { return x.dataset.arrastarItem; }).join(",");
  }

  async function reabrir() {
    t.grupo("Gravar e reabrir — a organização é da ficha");
    var abas = ["habilidades", "rituais", "inventario", "pericias", "anotacoes"];
    var visto = {};
    abas.forEach(function (aba) { visto[aba] = ordemNaTela(aba); });
    var gravado = JSON.stringify(estado.ficha);
    estado.ficha = F.normalizarFicha(JSON.parse(gravado));
    var gravacoes = estado.alteracoes;
    abas.forEach(function (aba) {
      t.igual(aba + ": a mesma ordem depois de gravar e abrir de novo", ordemNaTela(aba), visto[aba]);
    });
    t.igual("abrir de novo não pede para gravar nada", estado.alteracoes, gravacoes);
    t.igual("a ficha lida é a mesma que foi gravada", JSON.stringify(estado.ficha), gravado);

    /* Enquanto isto, o outro aparelho mexeu no PV e no texto de uma nota:
       reordenar aqui não apaga o que foi feito lá. */
    var S = global.RAMASync;
    var base = JSON.parse(gravado);
    var local = JSON.parse(gravado);
    O.reposicionar(local.inventario.itens, local.inventario.itens[3].id, 0);
    var remoto = JSON.parse(gravado);
    remoto.ordem.recursos.pv = 3;
    remoto.anotacoes.soltas[0].conteudo = "Escrito no outro aparelho.";
    var m = S.mesclar(base, local, remoto, S.ESQUEMA_FICHA);
    t.ok("reordenar aqui e editar lá: a ordem daqui, o PV e o texto de lá",
      m.estado.inventario.itens[0].id === local.inventario.itens[0].id && m.estado.ordem.recursos.pv === 3 &&
      m.estado.anotacoes.soltas[0].conteudo === "Escrito no outro aparelho." && !m.conflitos.length);
  }

  /* =================================================================
     FICHA UNIVERSAL
     ================================================================= */

  async function universal() {
    t.grupo("Ficha universal — o mesmo gesto, sem nenhuma regra de Ordem");
    var fichaDeOrdem = estado.ficha;
    var f = F.criarFicha({ nome: "Universal de teste", tipoFicha: "universal" });
    var arv = H.arvoreVazia();
    var truques = H.criarPasta("Truques");
    H.inserir(arv, truques, null);
    H.inserir(arv, H.criarHabilidade({ nome: "Lábia", texto: "Convence quase todo mundo." }), null);
    f.habilidades = arv;
    f.rituais.itens = [F.criarRitual({ nome: "Primeiro feitiço" }), F.criarRitual({ nome: "Segundo feitiço" })];
    f.inventario.itens = [F.criarItem("item", { nome: "Corda" }), F.criarItem("arma", { nome: "Bastão" })];
    estado.ficha = F.normalizarFicha(JSON.parse(JSON.stringify(f)));
    try {
      abrir("habilidades", "edicao");
      t.ok("habilidades da universal têm alça no modo edição", !!alcaDe(item("Lábia")));
      await arrastar(alcaDe(item("Lábia")), cabecaDaPasta(idDoNo("Truques")), "meio");
      var achado = H.achar(estado.ficha.habilidades, idDoNo("Lábia"));
      t.ok("  e a habilidade entra na pasta arrastando", !!achado && !!achado.pai && achado.pai.nome === "Truques");

      abrir("rituais", "edicao");
      t.ok("rituais da universal: sem barra de Ordem e sem círculo e elemento",
        !palco.querySelector('[data-foco="criterio-circulo"]') && !palco.querySelector('[data-ordenacao="rituais"]'));
      await arrastar(alcaDe(item("Segundo feitiço")), item("Primeiro feitiço"), "antes");
      t.iguais("  mas reordenam arrastando", estado.ficha.rituais.itens.map(function (r) { return r.nome; }), ["Segundo feitiço", "Primeiro feitiço"]);

      abrir("inventario", "edicao");
      t.ok("o inventário da universal continua com as armas primeiro, sem alça",
        !palco.querySelector("[data-arrastar-alca]") && nomesDaListaPlana().join(",") === "Bastão,Corda");

      abrir("pericias", "edicao");
      t.ok("as perícias da universal não ganham a ordem da ficha de Ordem",
        !palco.querySelector('[data-foco="ordem-pericias"]') && !palco.querySelector("[data-arrastar-alca]"));

      abrir("habilidades", "normal");
      t.ok("fora do modo edição, sem alça", !palco.querySelector("[data-arrastar-alca]"));
      t.ok("e a ficha continua universal: nenhum bloco de Ordem apareceu",
        estado.ficha.tipoFicha === "universal" && estado.ficha.ordem === undefined);
    } finally {
      estado.ficha = fichaDeOrdem;
    }
  }

  /* Os nomes dos cartões de uma lista sem marcação de arraste (a do
     inventário da universal). */
  function nomesDaListaPlana() {
    return U.$$(".recolhivel__titulo", palco).map(function (x) { return x.textContent.trim(); });
  }

  /* =================================================================
     LAYOUT NA LARGURA ATUAL
     ================================================================= */

  async function layout() {
    t.grupo("Layout — na largura atual (" + global.innerWidth + " px)");
    var toque = global.matchMedia && global.matchMedia("(pointer: coarse)").matches;
    ["habilidades", "rituais", "inventario", "pericias", "anotacoes"].forEach(function (aba) {
      abrir(aba, "edicao");
      var largura = document.documentElement.scrollWidth;
      t.ok(aba + ": nada passa da largura da tela", largura <= global.innerWidth + 1, "largura " + largura + " em " + global.innerWidth);
      var alca = palco.querySelector("[data-arrastar-alca]");
      if (alca && toque) {
        var r = alca.getBoundingClientRect();
        t.ok("  com toque, a alça tem alvo de dedo (≥ 40 px)", r.width >= 40 && r.height >= 40, r.width + "×" + r.height);
      }
    });
  }

  /* =================================================================
     EXECUÇÃO
     ================================================================= */

  async function executar() {
    /* As fontes mudam a altura das linhas: o gesto só começa com a tela
       assentada. */
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    var montada = fichaDeTeste();
    estado.ficha = montada.ficha;
    var etapas = [habilidades, function () { return rituais(montada.concessao); }, inventario, pericias, anotacoes, reabrir, universal, layout];
    for (var i = 0; i < etapas.length; i++) {
      try {
        await etapas[i]();
      } catch (erro) {
        t.ok("a etapa terminou sem erro", false, String(erro && erro.stack || erro));
      }
    }
    abrir("habilidades", "edicao");
    global.scrollTo(0, 0);

    /* O mesmo placar de testes/biblioteca.html. */
    U.trocar(placar, [
      el("div", {}, [el("p.placar__numero", { class: falharam ? "t-erro" : "t-ok", texto: String(passaram + falharam) }), el("p.t-rotulo", { texto: "verificações" })]),
      el("div", {}, [el("p.placar__numero.t-ok", { texto: String(passaram) }), el("p.t-rotulo", { texto: "passaram" })]),
      el("div", {}, [el("p.placar__numero", { class: falharam ? "t-erro" : "t-fraco", texto: String(falharam) }), el("p.t-rotulo", { texto: "falharam" })]),
      el("span.r-estado", { dataset: { estado: falharam ? "erro" : "salvo" }, texto: falharam ? "Há falhas" : "Tudo passando" }),
    ]);
    document.title = (falharam ? falharam + " falhas" : "Tudo passando") + " — Testes de arrastar";
    /* Para quem roda a página por automação. */
    global.RAMATestesArrastar = { terminou: true, passaram: passaram, falharam: falharam, falhas: falhas.slice() };
  }

  /* Para investigar uma falha à mão: ?parar=1 abre a página sem rodar. */
  global.__testeArrastar = { abrir: abrir, arrastar: arrastar, item: item, alcaDe: alcaDe, cabecaDaPasta: cabecaDaPasta,
    estado: estado, pontoEm: pontoEm, nomesDaLista: nomesDaLista, fichaDeTeste: fichaDeTeste, idDoNo: idDoNo };

  if (U.parametro("parar") === "1") return;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", executar);
  else executar();
})(window);
