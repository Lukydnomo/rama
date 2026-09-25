/* =====================================================================
   R.A.M.A. — testes da janela "Da biblioteca" (inventário)
   ---------------------------------------------------------------------
   Abre a janela DE VERDADE — o mesmo arquivo que a ficha usa — com uma
   ficha de teste, e confere o que quem usa faz: trocar de origem,
   buscar, filtrar, abrir detalhes, adicionar cada tipo de item, aplicar
   uma modificação, usar o teclado, e caber na largura da tela.

   O que fica de fora de propósito: o servidor. A Homebrew é um dublê
   (a permissão é conferida no backend, e testada lá, em
   testes/executar-backend.js). O catálogo, não: ele é carregado sob
   demanda pelo caminho real, como na ficha.

   Toda espera aqui espera uma CONDIÇÃO (a lista apareceu, o botão
   sumiu), nunca um tempo fixo que torce para a tela ter terminado.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  var F = global.RAMAFicha;
  var R = global.RAMAOrdemRegras;
  var B = global.RAMABibliotecaDeItens;

  var saida = U.$("#saida");
  var placar = U.$("#placar");
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
  };

  /* ---------- esperas por condição ---------- */

  function tique() { return new Promise(function (ok) { setTimeout(ok, 30); }); }

  /* Espera curta para a tela se redesenhar depois de um clique. Toda
     espera de RESULTADO é feita por ate(), com condição. */
  function espera(ms) { return new Promise(function (ok) { setTimeout(ok, ms || 0); }); }

  async function ate(condicao, prazo) {
    var limite = Date.now() + (prazo || 10000);
    for (;;) {
      var v = condicao();
      if (v) return v;
      if (Date.now() > limite) return null;
      await tique();
    }
  }

  /* ---------- atalhos da janela ---------- */

  function janela() { return document.querySelector(".r-modal--biblioteca"); }
  function botoes(raiz) { return U.$$("button", raiz || document); }
  function botaoCom(texto, raiz) {
    return botoes(raiz || janela()).filter(function (b) { return b.textContent.trim() === texto; })[0] || null;
  }
  function linhas() { return U.$$(".bib-item", janela()); }
  function linha(nome) {
    return linhas().filter(function (l) { return l.querySelector(".bib-item__nome").textContent.trim() === nome; })[0] || null;
  }
  function nomesNaLista() { return linhas().map(function (l) { return l.querySelector(".bib-item__nome").textContent.trim(); }); }
  function clicar(alvo, detalhe) {
    alvo.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: detalhe === undefined ? 1 : detalhe }));
  }
  function digitar(campo, texto) {
    campo.value = texto;
    campo.dispatchEvent(new Event("input", { bubbles: true }));
  }
  function escolherNoFiltro(rotulo, valor) {
    var rotulos = U.$$(".bib-filtro label", janela()).filter(function (l) { return l.textContent.trim() === rotulo; });
    var select = rotulos.length ? document.getElementById(rotulos[0].htmlFor) : null;
    if (!select) return false;
    select.value = valor;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  function tecla(alvo, chave, extra) {
    var ev = new KeyboardEvent("keydown", Object.assign({ key: chave, bubbles: true, cancelable: true }, extra || {}));
    alvo.dispatchEvent(ev);
    return ev;
  }
  function busca() { return janela().querySelector("input[type=search]"); }
  function abaPressionada() {
    var b = U.$$(".biblioteca-abas .r-aba", janela()).filter(function (x) { return x.getAttribute("aria-pressed") === "true"; })[0];
    return b ? b.dataset.aba : "";
  }
  async function expandir(nome) {
    var l = await ate(function () { return linha(nome); });
    if (!l) return null;
    var abrir = l.querySelector(".bib-item__abrir");
    if (abrir.getAttribute("aria-expanded") !== "true") clicar(abrir);
    return l;
  }
  async function fecharJanela() {
    var rodape = document.querySelector(".r-modal--biblioteca .r-modal__rodape");
    if (rodape) clicar(botaoCom("Fechar", rodape));
    await ate(function () { return !janela(); });
  }

  /* ---------- a ficha e a Homebrew de teste ---------- */

  function contexto(ficha) {
    var c = { ficha: ficha, alteracoes: 0, desenhos: 0 };
    c.alterou = function () { c.alteracoes++; };
    c.redesenhar = function () { c.desenhos++; };
    return c;
  }

  var REGISTROS = [
    { id: "hb-arma", tipo: "arma", nome: "Pé de cabra da mesa", dano: "1d8", critico: 20, multiplicador: 2, peso: 3, meu: true, descricao: "Serve de alavanca." },
    { id: "hb-item", tipo: "item", nome: "Lanterna pública", peso: 1, meu: false, descricao: "Publicada por outra conta.",
      ordem: { categoria: 0, espacos: 1, quantidade: 1, grupo: "geral" } },
    { id: "hb-hab", tipo: "habilidade", nome: "Habilidade que não é item", meu: true },
    { id: "hb-cri", tipo: "criatura", nome: "Criatura que não é item", meu: false },
  ];
  var RITUAIS_HB = [
    { id: "hb-ritual", tipo: "ritual", nome: "Selo da mesa", meu: true, circulo: "1º círculo", elemento: "Sangue",
      execucao: "padrão", alcance: "toque", alvo: "1 ser", duracao: "cena", descricao: "Ritual caseiro.",
      versoes: [{ id: "v1", nome: "Normal", dano: "2d6" }, { id: "v2", nome: "Discente", dano: "4d6", custo: 2, requisito: "2º círculo" }],
      ordem: { elemento: "sangue", circulo: 1, custo: 1 } },
    { id: "hb-ritual-pub", tipo: "ritual", nome: "Prece pública", meu: false, circulo: "2º círculo",
      descricao: "Publicada por outra conta.",
      versoes: [{ id: "v3", nome: "Normal", rolagens: [{ id: "r1", tipo: "cura", rotulo: "Cura", expressao: "2d8", extra: "2" }] }] },
    { id: "hb-item-2", tipo: "item", nome: "Item que não é ritual", meu: true },
  ];
  var pedidosHomebrew = [];
  var respostaHomebrew = null;    /* quando o teste quer forçar a resposta */
  global.RAMAApi.listarHomebrew = function (opcoes) {
    pedidosHomebrew.push(opcoes);
    var o = opcoes || {};
    var dados = (o.tipos || []).indexOf("ritual") >= 0 ? RITUAIS_HB : REGISTROS;
    var resposta = respostaHomebrew ? respostaHomebrew(o) : { ok: true, dados: JSON.parse(JSON.stringify(dados)) };
    return new Promise(function (ok) { setTimeout(function () { ok(resposta); }, 20); });
  };
  var novoItemPedido = null;
  global.RAMASecaoInventario = { novoItem: function (ctx) { novoItemPedido = ctx; } };

  function fichaDeOrdem() {
    return F.normalizarFicha({
      nome: "Agente de teste", tipoFicha: "ordem",
      ordem: {
        classe: "combatente", origem: "militar", nex: 5,
        atributos: { agi: 2, for: 2, int: 1, pre: 1, vig: 2 },
        pericias: { luta: "treinado", pontaria: "treinado", fortitude: "treinado", reflexos: "treinado" },
      },
      inventario: { limite: 0, itens: [] },
    });
  }

  /* =================================================================
     O ROTEIRO
     ================================================================= */

  async function roteiro() {
    if (global.RAMAOrdemItens) global.RAMAOrdemItens._esquecer();

    /* ---------------------------------------------------------------- */
    t.grupo("Ficha universal: só a Homebrew, sem regras de Ordem");

    var universal = contexto(F.normalizarFicha({ nome: "Universal de teste", inventario: { itens: [] } }));
    B.abrir(universal);
    t.ok("a janela abre", !!(await ate(janela)));
    t.igual("  sem o seletor de origens", U.$$(".biblioteca-origem", janela()).length, 0);
    await ate(function () { return linhas().length; });
    t.ok("  pedindo à Homebrew só os tipos de item", pedidosHomebrew.length === 1 &&
      JSON.stringify(pedidosHomebrew[0].tipos) === JSON.stringify(["item", "arma", "armadura", "mochila"]));
    t.igual("  e nunca habilidade ou criatura, mesmo que um servidor antigo mande", nomesNaLista().join(" | "), "Lanterna pública | Pé de cabra da mesa");
    t.ok("  o catálogo de Ordem não foi carregado", !global.RAMAOrdemItensDados);
    var peDeCabra = await expandir("Pé de cabra da mesa");
    t.ok("  a ficha universal não pede quantidade", !peDeCabra.querySelector(".bib-quantidade"));
    clicar(peDeCabra.querySelector(".bib-item__adicionar"));
    var copiaUniversal = universal.ficha.inventario.itens[0];
    t.ok("adicionar cria uma cópia com id próprio e rastro do modelo", !!copiaUniversal && copiaUniversal.id !== "hb-arma" && copiaUniversal.origemHomebrewId === "hb-arma");
    t.ok("  sem bloco de Ordem", copiaUniversal && copiaUniversal.ordem === undefined);
    t.ok("  e a janela avisa e continua aberta", /entrou no inventário/.test(peDeCabra.querySelector(".bib-item__status").textContent) && !!janela());
    copiaUniversal.nome = "Pé de cabra editado";
    t.igual("editar a cópia não muda o modelo", REGISTROS[0].nome, "Pé de cabra da mesa");
    await fecharJanela();

    /* ---------------------------------------------------------------- */
    t.grupo("Catálogo que não carrega: erro claro e tentar de novo");

    var ctx = contexto(fichaDeOrdem());
    var urlOriginal = U.url;
    U.url = function (caminho) {
      return /itens-dados/.test(String(caminho)) ? urlOriginal("js/ordem/arquivo-que-nao-existe.js") : urlOriginal.apply(this, arguments);
    };
    B.abrir(ctx, { origem: "oficial", aba: "armas" });
    t.ok("mostra o carregamento enquanto busca", !!(await ate(function () { return janela() && /Abrindo o catálogo/.test(janela().textContent); }, 3000)));
    var tentar = await ate(function () { return janela() && botaoCom("Tentar novamente"); }, 25000);
    t.ok("falhou: diz que o catálogo não abriu e oferece tentar de novo", !!tentar && /Não foi possível abrir o catálogo/.test(janela().textContent));
    U.url = urlOriginal;
    if (tentar) { tentar.focus(); clicar(tentar); }
    t.ok("tentar de novo carrega o catálogo", !!(await ate(function () { return linhas().length > 10; }, 25000)));
    t.igual("  e o foco vai para a busca", document.activeElement, busca());

    /* ---------------------------------------------------------------- */
    t.grupo("Origens e abas");

    var origens = U.$$(".biblioteca-origem", janela());
    t.igual("duas origens: Ordem Paranormal e Homebrew", origens.map(function (b) { return b.textContent; }).join(" | "), "Ordem Paranormal | Homebrew");
    t.igual("  Ordem Paranormal marcada", origens[0].getAttribute("aria-pressed"), "true");
    var abas = U.$$(".biblioteca-abas .r-aba", janela());
    t.igual("cinco abas de navegação", abas.map(function (a) { return a.textContent.replace(/ \(\d+\)$/, ""); }).join(" | "),
      "Armas | Munições | Proteções | Geral | Itens Amaldiçoados");
    t.ok("  com a contagem de cada uma", abas.every(function (a) { return /\(\d+\)$/.test(a.textContent); }));
    abas[0].focus();
    tecla(abas[0], "ArrowRight");
    t.igual("seta para a direita troca para Munições", abaPressionada(), "municoes");
    t.igual("  e leva o foco junto", document.activeElement && document.activeElement.dataset.aba, "municoes");
    tecla(document.activeElement, "ArrowLeft");
    t.igual("seta para a esquerda volta para Armas", abaPressionada(), "armas");
    clicar(origens[1]);
    t.ok("trocar para Homebrew lista os itens da Homebrew", !!(await ate(function () { return linha("Lanterna pública"); })));
    t.ok("  com os filtros de Escopo, Tipo e Categoria", ["Escopo", "Tipo", "Categoria"].every(function (r) {
      return U.$$(".bib-filtro label", janela()).some(function (l) { return l.textContent === r; });
    }));
    escolherNoFiltro("Escopo", "publica");
    t.igual("  escopo Públicas mostra só o que outra conta publicou", nomesNaLista().join(" | "), "Lanterna pública");
    clicar(U.$$(".biblioteca-origem", janela())[0]);
    t.ok("voltar a Ordem Paranormal mantém a aba", !!(await ate(function () { return abaPressionada() === "armas" && linhas().length > 10; })));

    /* ---------------------------------------------------------------- */
    t.grupo("Busca e filtros");

    digitar(busca(), "BASTAO");
    t.ok("busca sem acento e em maiúsculas acha Bastão", nomesNaLista().indexOf("Bastão") >= 0);
    t.ok("  e diz quantos resultados", /resultado/.test(janela().querySelector(".bib-status").textContent));
    digitar(busca(), "");
    t.ok("filtro Fonte: Sobrevivendo ao Horror", escolherNoFiltro("Fonte", "SAH"));
    t.ok("  só entradas do SAH na lista", linhas().length === 12 && linhas().every(function (l) { return /^SAH p\./.test(l.querySelector(".bib-fonte").textContent); }));
    escolherNoFiltro("Tipo", "fogo");
    t.ok("  e com Tipo Fogo, só armas de fogo do SAH", linhas().length > 0 && linhas().every(function (l) { return /Fogo/.test(l.querySelector(".bib-item__classe").textContent); }));
    digitar(busca(), "xyzzy");
    t.ok("sem resultado: estado claro, sem lista vazia muda", /Nenhum item encontrado/.test(janela().textContent));
    clicar(botaoCom("Limpar busca e filtros"));
    t.ok("limpar busca e filtros traz tudo de volta", busca().value === "" && linhas().length > 40);
    digitar(busca(), "mochila militar");
    var dica = botaoCom("Geral (1)");
    t.ok("nada nesta aba, mas há em outra: a janela aponta a aba", linhas().length === 0 && !!dica &&
      /Mas há resultados em outras abas/.test(janela().textContent));
    if (dica) clicar(dica);
    t.ok("  e o botão leva até lá, com a mesma busca", abaPressionada() === "geral" && nomesNaLista().join() === "Mochila militar" && busca().value === "mochila militar");
    clicar(U.$$(".biblioteca-abas .r-aba", janela()).filter(function (a) { return a.dataset.aba === "armas"; })[0]);
    digitar(busca(), "");

    /* ---------------------------------------------------------------- */
    t.grupo("Resumo compacto e detalhes sob demanda");

    var katana = await ate(function () { return linha("Katana"); });
    t.ok("fechado, o resultado mostra dano e crítico na mesma linha", /Dano:1d10/.test(katana.querySelector(".bib-item__dados").textContent.replace(/\s+/g, "")) &&
      /Crítico:19\/x2/.test(katana.querySelector(".bib-item__dados").textContent.replace(/\s+/g, "")));
    t.ok("  e a categoria 0–IV como marca, separada da aba", /Cat\. I/.test(katana.querySelector(".bib-item__marcas").textContent));
    t.igual("  os detalhes ainda não foram montados", katana.querySelector(".bib-item__detalhes").childNodes.length, 0);
    await expandir("Katana");
    var detalhesKatana = katana.querySelector(".bib-item__detalhes");
    t.ok("abrir mostra os detalhes, com aria-expanded", !detalhesKatana.hidden && katana.querySelector(".bib-item__abrir").getAttribute("aria-expanded") === "true");
    var rotulosDt = U.$$("dt", detalhesKatana).map(function (d) { return d.textContent; });
    t.ok("  dano, crítico, alcance, tipo de dano, empunhadura e proficiência", ["Dano", "Crítico", "Alcance", "Tipo de dano", "Empunhadura", "Proficiência"].every(function (r) {
      return rotulosDt.indexOf(r) >= 0;
    }));
    t.ok("  nenhum campo vazio", U.$$("dd", detalhesKatana).every(function (d) { return d.textContent.trim() !== ""; }));
    t.ok("  e diz o que é automático", /Parcial|Automatizado|Controle manual/.test(detalhesKatana.querySelector(".bib-automacao").textContent));

    /* ---------------------------------------------------------------- */
    t.grupo("Adicionar ao inventário: cada tipo, sem clique duplo duplicando");

    digitar(busca(), "katana");
    katana = await expandir("Katana");
    var adicionarKatana = katana.querySelector(".bib-item__adicionar");
    clicar(adicionarKatana, 1);
    clicar(adicionarKatana, 2);
    t.igual("clique duplo adiciona UMA Katana", ctx.ficha.inventario.itens.length, 1);
    var enterRepetido = tecla(adicionarKatana, "Enter", { repeat: true });
    t.ok("Enter segurado não repete a inclusão", enterRepetido.defaultPrevented);
    t.ok("confirmação discreta, janela aberta, busca mantida", /Katana entrou no inventário/.test(katana.querySelector(".bib-item__status").textContent) &&
      !!janela() && busca().value === "katana");
    t.igual("  o foco fica no botão, para continuar", document.activeElement, adicionarKatana);
    clicar(adicionarKatana, 1);
    t.igual("clicar de novo, de propósito, adiciona outra", ctx.ficha.inventario.itens.length, 2);
    t.ok("  com ids diferentes", ctx.ficha.inventario.itens[0].id !== ctx.ficha.inventario.itens[1].id);
    t.igual("  e a marca \"na ficha\" conta as duas", katana.querySelector(".bib-item__na-ficha").textContent, "na ficha: 2");
    var kat = ctx.ficha.inventario.itens[0];
    t.ok("a arma entra com os campos mecânicos", kat.tipo === "arma" && kat.dano === "1d10" && kat.critico === 19 && kat.ordem.categoria === 1 &&
      kat.ordem.espacos === 2 && kat.ordem.pericia === "luta" && kat.origemCatalogoId === "op.arma.katana");
    t.ok("  e a ficha foi avisada para salvar e redesenhar", ctx.alteracoes === 2 && ctx.desenhos === 2);

    clicar(U.$$(".biblioteca-abas .r-aba", janela()).filter(function (a) { return a.dataset.aba === "municoes"; })[0]);
    digitar(busca(), "balas curtas");
    var balas = await expandir("Balas curtas");
    var qtd = balas.querySelector(".bib-quantidade");
    t.ok("munição pede quantidade, com a unidade do livro", !!qtd && /pacotes/.test(balas.querySelector("label[for='" + qtd.id + "']").textContent));
    qtd.value = "0";
    clicar(balas.querySelector(".bib-item__adicionar"));
    t.ok("quantidade inválida: avisa e não adiciona", ctx.ficha.inventario.itens.length === 2 && /t-erro/.test(balas.querySelector(".bib-item__status").className));
    qtd.value = "3";
    clicar(balas.querySelector(".bib-item__adicionar"));
    var pacotes = ctx.ficha.inventario.itens[2];
    t.ok("3 pacotes entram como UMA pilha de quantidade 3", !!pacotes && pacotes.ordem.quantidade === 3 && pacotes.ordem.grupo === "municao");

    clicar(U.$$(".biblioteca-abas .r-aba", janela()).filter(function (a) { return a.dataset.aba === "protecoes"; })[0]);
    digitar(busca(), "protecao leve");
    clicar((await expandir("Proteção leve")).querySelector(".bib-item__adicionar"));
    var leve = ctx.ficha.inventario.itens[3];
    t.ok("proteção entra com Defesa e tipo, e GUARDADA", !!leve && leve.tipo === "armadura" && leve.defesa === 5 && leve.ordem.protecao.tipo === "leve" && leve.ordem.emUso !== true);
    var defesaGuardada = R.defesa(ctx.ficha.ordem, ctx.ficha.inventario).total;
    leve.ordem.emUso = true;
    t.igual("  e só soma na Defesa quando posta em uso", R.defesa(ctx.ficha.ordem, ctx.ficha.inventario).total, defesaGuardada + 5);
    leve.ordem.emUso = false;

    clicar(U.$$(".biblioteca-abas .r-aba", janela()).filter(function (a) { return a.dataset.aba === "geral"; })[0]);
    digitar(busca(), "kit de pericia");
    var kit = await expandir("Kit de perícia");
    clicar(kit.querySelector(".bib-item__adicionar"));
    t.ok("item com escolha obrigatória: pede a escolha antes", ctx.ficha.inventario.itens.length === 4 && /Escolha/i.test(kit.querySelector(".bib-item__status").textContent));
    var selectKit = kit.querySelector(".bib-campo select");
    selectKit.value = "medicina";
    clicar(kit.querySelector(".bib-item__adicionar"));
    t.igual("  escolhida, o nome leva a perícia", (ctx.ficha.inventario.itens[4] || {}).nome, "Kit de perícia (Medicina)");

    clicar(U.$$(".biblioteca-abas .r-aba", janela()).filter(function (a) { return a.dataset.aba === "amaldicoados"; })[0]);
    digitar(busca(), "coracao pulsante");
    var coracao = await expandir("Coração pulsante");
    t.ok("amaldiçoado mostra o aviso de patente desta ficha", /patente é Recruta/.test(coracao.querySelector(".bib-item__detalhes").textContent));
    clicar(coracao.querySelector(".bib-item__adicionar"));
    var amaldicoado = ctx.ficha.inventario.itens[5];
    t.ok("  e entra marcado, com elemento", !!amaldicoado && amaldicoado.ordem.amaldicoado === true && amaldicoado.ordem.elemento === "sangue");

    var carga = R.itensEfetivos(ctx.ficha.ordem, ctx.ficha.inventario);
    t.igual("a carga soma tudo que entrou: 2 + 2 + 3 + 2 + 1 + 1", carga.ocupado, 11);
    await fecharJanela();

    /* ---------------------------------------------------------------- */
    t.grupo("Modificações pelo menu do item");

    var alvo = ctx.ficha.inventario.itens[0];
    B.abrirParaModificar(ctx, alvo);
    await ate(function () { return janela() && linhas().length; });
    t.igual("a janela abre para modificar", janela().querySelector(".r-modal__topo h2").textContent, "Modificações e maldições");
    t.ok("  dizendo em qual item", /Aplicando em:\s*Katana/.test(janela().textContent));
    var alongada = await expandir("Alongada");
    t.ok("modificação que não serve: o motivo aparece escrito", /Katana não aceita Alongada/.test(alongada.querySelector(".bib-item__detalhes").textContent));
    var certeira = await expandir("Certeira");
    var aplicar = botaoCom("Aplicar em Katana", certeira);
    t.ok("modificação que serve: botão para aplicar nela", !!aplicar);
    if (aplicar) clicar(aplicar);
    t.ok("aplicada, com a categoria de antes e depois", /Categoria I → II/.test(certeira.querySelector(".bib-item__status").textContent));
    t.ok("  guardada no item, sem mexer no valor-base", (alvo.ordem.modificacoes || []).length === 1 && alvo.ordem.categoria === 1);
    t.ok("  e não oferece aplicar de novo", !botaoCom("Aplicar em Katana", certeira));
    t.igual("a outra Katana continua sem modificação", (ctx.ficha.inventario.itens[1].ordem.modificacoes || []).length, 0);
    await fecharJanela();

    /* ---------------------------------------------------------------- */
    t.grupo("Homebrew vazia e com falha");

    respostaHomebrew = function () { return { ok: true, dados: [] }; };
    B.abrir(ctx, { origem: "homebrew" });
    var criar = await ate(function () { return janela() && botaoCom("Criar item"); });
    t.ok("sem itens: orientação e o botão Criar item", !!criar && /Nenhum item na Homebrew/.test(janela().textContent));
    t.ok("  e o caminho para a página Homebrew", !!janela().querySelector("a[href$='homebrew/']"));
    clicar(criar);
    t.ok("Criar item fecha a janela e abre a criação manual", !!(await ate(function () { return !janela(); })) && novoItemPedido === ctx);

    respostaHomebrew = function () { return { ok: false, erro: "sem_conexao" }; };
    B.abrir(ctx, { origem: "homebrew" });
    var tentarHb = await ate(function () { return janela() && botaoCom("Tentar novamente"); });
    t.ok("falha: mensagem de erro e tentar de novo", !!tentarHb);
    t.igual("  sem mexer no inventário", ctx.ficha.inventario.itens.length, 6);
    respostaHomebrew = null;
    tentarHb.focus();
    clicar(tentarHb);
    t.ok("tentar de novo carrega a lista", !!(await ate(function () { return linha("Lanterna pública"); })));
    var lanterna = await expandir("Lanterna pública");
    var qtdHb = lanterna.querySelector(".bib-quantidade");
    t.ok("na ficha de Ordem, a Homebrew pede quantidade", !!qtdHb);
    qtdHb.value = "2";
    clicar(lanterna.querySelector(".bib-item__adicionar"));
    var copiaHb = ctx.ficha.inventario.itens[6];
    t.ok("  e a cópia entra com a quantidade e o rastro do modelo", !!copiaHb && copiaHb.ordem.quantidade === 2 && copiaHb.origemHomebrewId === "hb-item" && copiaHb.id !== "hb-item");
    await fecharJanela();

    /* ---------------------------------------------------------------- */
    t.grupo("Teclado");

    var abridor = el("button.r-botao", { type: "button", texto: "Da biblioteca (teste)" });
    document.querySelector("main").appendChild(abridor);
    abridor.focus();
    B.abrir(ctx, { origem: "oficial" });
    await ate(function () { return janela() && linhas().length; });
    t.ok("o foco entra na janela", janela().contains(document.activeElement));
    t.ok("tudo o que se usa é botão, campo ou seleção de verdade", U.$$(".bib-item__abrir, .r-aba, .biblioteca-origem", janela()).every(function (b) { return b.tagName === "BUTTON"; }) &&
      U.$$(".bib-filtro select", janela()).every(function (s) { return s.labels && s.labels.length === 1; }));
    tecla(document, "Escape");
    t.ok("Esc fecha", !!(await ate(function () { return !janela(); })));
    t.igual("  e devolve o foco para quem abriu", document.activeElement, abridor);
    abridor.parentNode.removeChild(abridor);

    /* ================================================================
       RITUAIS
       ================================================================ */

    t.grupo("Rituais · abrir a biblioteca e filtrar");

    var ctxR = contexto(fichaDeOrdem());
    var abridorR = el("button.r-botao", { type: "button", texto: "Da biblioteca (rituais)" });
    document.querySelector("main").appendChild(abridorR);
    abridorR.focus();
    global.RAMABibliotecaDeRituais.abrir(ctxR);
    var modalR = await ate(function () {
      var m = document.querySelector(".r-modal--biblioteca");
      return m && m.querySelector(".bib-item") ? m : null;
    }, 25000);
    t.ok("a janela abre com o catálogo carregado sob demanda", !!modalR && !!global.RAMAOrdemRituaisDados);
    t.igual("  com as duas origens", U.$$(".biblioteca-origem", modalR).map(function (b) { return b.textContent; }).join(" | "),
      "Ordem Paranormal | Homebrew");

    function chipsDe(rotulo) {
      return U.$$(".r-aba", modalR).filter(function (b) { return b.textContent.indexOf(rotulo) === 0; })[0];
    }
    var chips = U.$$(".r-aba", modalR).map(function (b) { return b.textContent; });
    t.ok("os cinco elementos aparecem escritos, com contagem",
      ["Conhecimento", "Energia", "Morte", "Sangue", "Medo"].every(function (nome) {
        return chips.some(function (c) { return c.indexOf(nome) === 0 && /\(\d+\)/.test(c); });
      }));
    t.ok("os quatro círculos também", ["1º círculo", "2º círculo", "3º círculo", "4º círculo"].every(function (nome) {
      return chips.some(function (c) { return c.indexOf(nome) === 0; });
    }));
    t.ok("nenhum chip de elemento inventado (sem “Varia”)", !chips.some(function (c) { return /^Varia/.test(c); }));
    t.igual("98 rituais, os dois livros", modalR.querySelector(".bib-status").textContent, "98 rituais.");

    clicar(chipsDe("Sangue"));
    await espera(120);
    clicar(chipsDe("2º círculo"));
    await espera(150);
    t.igual("Sangue + 2º círculo: 6 rituais", modalR.querySelector(".bib-status").textContent, "6 rituais.");
    t.ok("  e as contagens dos chips acompanham os outros filtros",
      U.$$(".r-aba[aria-pressed=true]", modalR).map(function (b) { return b.textContent; }).join(" | ") === "Sangue (6) | 2º círculo (6)");
    digitar(busca(), "DESCARNAR");
    await espera(150);
    t.igual("busca sem acento e em maiúsculas dentro dos filtros", nomesNaLista().join(), "Descarnar");
    clicar(botaoCom("Limpar busca e filtros"));
    await espera(150);
    t.ok("limpar devolve os 98", modalR.querySelector(".bib-status").textContent === "98 rituais." && busca().value === "");
    t.ok("o filtro de livro traz as duas fontes", (function () {
      var select = U.$$(".bib-filtro select", modalR)[0];
      return select && select.options.length === 3;
    })());
    escolherNoFiltro("Livro", "SAH");
    await espera(150);
    t.igual("só o Sobrevivendo ao Horror: 16", modalR.querySelector(".bib-status").textContent, "16 rituais.");
    escolherNoFiltro("Livro", "");
    await espera(150);

    t.grupo("Rituais · prévia, versões e custo");

    digitar(busca(), "cicatrizacao");
    var linhaR = await ate(function () { return linha("Cicatrização"); });
    t.ok("o resultado fechado mostra círculo e elemento na classificação",
      /1º círculo · Morte/.test(linhaR.querySelector(".bib-item__classe").textContent));
    t.ok("  e custo, execução, alcance e duração na linha compacta", (function () {
      var texto = linhaR.querySelector(".bib-item__dados").textContent.replace(/\s+/g, "");
      return /Custo:1PE/.test(texto) && /Execução:padrão/.test(texto) && /Alcance:toque/.test(texto) && /Duração:instantânea/.test(texto);
    })());
    t.igual("  os detalhes ainda não foram montados", linhaR.querySelector(".bib-item__detalhes").childNodes.length, 0);
    clicar(linhaR.querySelector(".bib-item__abrir"));
    await espera(150);
    var detR = linhaR.querySelector(".bib-item__detalhes");
    t.ok("abrir mostra os campos do ritual", ["Elemento", "Círculo", "Custo", "Execução", "Alcance", "Alvo", "Duração", "Fonte"]
      .every(function (r) { return U.$$("dt", detR).some(function (d) { return d.textContent === r; }); }));
    t.ok("  as três versões, com custo adicional e total",
      /Normal · 1 PE/.test(detR.innerText) && /Discente · \+2 PE \(total 3 PE\)/.test(detR.innerText) &&
      /Verdadeiro · \+9 PE \(total 10 PE\)/.test(detR.innerText));
    t.ok("  as rolagens aparecem como CURA, não como dano", /cura 3d8\+3/i.test(detR.innerText));
    t.ok("  os requisitos de cada versão", /Discente: requer 2º círculo/.test(detR.innerText));
    t.ok("  as regras que acompanham (componentes e Custo do Paranormal)", /Custo do Paranormal/.test(detR.innerText));
    t.ok("  e o que a ficha faz — sem prometer conjuração", /não gasta PE/.test(detR.innerText));

    t.grupo("Rituais · adicionar à ficha não conjura");

    var adicionarR = detR.querySelector(".bib-item__adicionar");
    clicar(adicionarR, 1);
    clicar(adicionarR, 2);
    t.igual("clique duplo adiciona UM ritual", ctxR.ficha.rituais.itens.length, 1);
    var enterR = tecla(adicionarR, "Enter", { repeat: true });
    t.ok("Enter segurado não repete", enterR.defaultPrevented);
    t.ok("a confirmação diz que nada foi gasto", /Nenhum PE foi gasto/.test(detR.querySelector(".bib-item__status").textContent));
    t.ok("  a janela continua aberta, com a busca e os filtros", !!janela() && busca().value === "cicatrizacao");
    var adicionado = ctxR.ficha.rituais.itens[0];
    t.ok("o ritual entra com campos, bloco de Ordem e versões",
      adicionado.circulo === "1º círculo" && adicionado.elemento === "Morte" && adicionado.alvo === "1 ser" &&
      adicionado.ordem.circulo === 1 && adicionado.ordem.custo === 1 && adicionado.versoes.length === 3);
    t.ok("  com a cura como rolagem de cura", adicionado.versoes[0].rolagens[0].tipo === "cura");
    t.ok("  e o rastro da origem", adicionado.origemCatalogoId === "op.ritual.cicatrizacao");
    t.ok("nenhum dado foi rolado ao adicionar", !document.querySelector(".rolagem"));
    clicar(adicionarR, 1);
    t.igual("clicar de novo, de propósito, adiciona outra cópia", ctxR.ficha.rituais.itens.length, 2);
    t.ok("  com id próprio e versões com ids próprios",
      ctxR.ficha.rituais.itens[1].id !== adicionado.id &&
      ctxR.ficha.rituais.itens[1].versoes[0].id !== adicionado.versoes[0].id);
    t.igual("  e a marca “na ficha” conta as duas", linhaR.querySelector(".bib-item__na-ficha").textContent, "na ficha: 2");

    digitar(busca(), "amaldicoar arma");
    var multi = await ate(function () { return linha("Amaldiçoar Arma"); });
    clicar(multi.querySelector(".bib-item__abrir"));
    await espera(150);
    var detMulti = multi.querySelector(".bib-item__detalhes");
    t.ok("ritual de quatro elementos pede o elemento ao adicionar", !!detMulti.querySelector(".bib-campo select"));
    clicar(detMulti.querySelector(".bib-item__adicionar"), 1);
    t.ok("  sem escolher, a inclusão é recusada com o motivo",
      ctxR.ficha.rituais.itens.length === 2 && /Escolha/i.test(detMulti.querySelector(".bib-item__status").textContent));
    detMulti.querySelector(".bib-campo select").value = "morte";
    clicar(detMulti.querySelector(".bib-item__adicionar"), 1);
    t.igual("  escolhendo Morte, o ritual entra com esse elemento",
      (ctxR.ficha.rituais.itens[2] || {}).elemento, "Morte");

    t.grupo("Rituais · avisos da ficha, nunca bloqueio");

    digitar(busca(), "controle mental");
    var quarto = await ate(function () { return linha("Controle Mental"); });
    clicar(quarto.querySelector(".bib-item__abrir"));
    await espera(150);
    var detQuarto = quarto.querySelector(".bib-item__detalhes");
    t.ok("ritual acima do círculo da ficha avisa, e o botão continua lá",
      /Nesta ficha/.test(detQuarto.innerText) && !!detQuarto.querySelector(".bib-item__adicionar"));
    clicar(detQuarto.querySelector(".bib-item__adicionar"), 1);
    t.igual("  e adicionar continua permitido (a mesa decide)", ctxR.ficha.rituais.itens.length, 4);

    t.grupo("Rituais · Homebrew");

    clicar(U.$$(".biblioteca-origem", janela()).filter(function (b) { return b.textContent === "Homebrew"; })[0]);
    await ate(function () { return linha("Selo da mesa"); });
    t.ok("pede ao servidor só o tipo ritual", pedidosHomebrew.some(function (p) {
      return p && p.tipos && p.tipos.length === 1 && p.tipos[0] === "ritual";
    }));
    t.igual("  e item nenhum entra na lista", nomesNaLista().join(" | "), "Prece pública | Selo da mesa");
    var linhaHb = await expandir("Selo da mesa");
    clicar(linhaHb.querySelector(".bib-item__adicionar"), 1);
    var copiaHb = ctxR.ficha.rituais.itens[4];
    t.ok("o ritual Homebrew entra como cópia independente",
      !!copiaHb && copiaHb.origemHomebrewId === "hb-ritual" && copiaHb.id !== "hb-ritual" &&
      copiaHb.versoes[0].id !== "v1");
    t.ok("  com as versões e o custo adicional preservados",
      copiaHb.versoes.length === 2 && copiaHb.versoes[1].custo === 2 && copiaHb.versoes[1].dano === "4d6");
    copiaHb.nome = "Selo editado na ficha";
    t.igual("  e editar a cópia não muda o modelo", RITUAIS_HB[0].nome, "Selo da mesa");

    t.grupo("Rituais · teclado e layout (" + window.innerWidth + " px)");

    t.ok("tudo o que se usa é botão, campo ou seleção de verdade",
      U.$$(".bib-item__abrir, .r-aba, .biblioteca-origem", janela()).every(function (b) { return b.tagName === "BUTTON"; }));
    t.ok("a página não ganha rolagem horizontal", document.documentElement.scrollWidth <= window.innerWidth + 1);
    var caixaR = janela().getBoundingClientRect();
    t.ok("a janela cabe na tela", caixaR.left >= -1 && caixaR.right <= window.innerWidth + 1);
    tecla(document, "Escape");
    t.ok("Esc fecha", !!(await ate(function () { return !janela(); })));
    t.igual("  e devolve o foco para quem abriu", document.activeElement, abridorR);
    abridorR.parentNode.removeChild(abridorR);

    /* ---------------------------------------------------------------- */
    t.grupo("Rituais · a janela fica de pé sem ficha.css");

    global.RAMABibliotecaDeRituais.abrir(contexto(fichaDeOrdem()));
    await ate(function () { return janela() && linhas().length; }, 25000);
    var abrirCss = linhas()[0].querySelector(".bib-item__abrir");
    t.igual("o botão do resultado não tem o fundo cinza do navegador",
      getComputedStyle(abrirCss).backgroundColor, "rgba(0, 0, 0, 0)");
    t.igual("  e o topo do resultado é flexível (nome, marcas)",
      getComputedStyle(linhas()[0].querySelector(".bib-item__topo")).display, "flex");
    var listaCss = janela().querySelector(".bib-lista");
    t.ok("a lista não rola sozinha: uma rolagem só, a da janela",
      getComputedStyle(listaCss).overflowY === "visible" && getComputedStyle(listaCss).maxHeight === "none");
    await fecharJanela();

    /* ---------------------------------------------------------------- */
    t.grupo("Rituais · escolha de concessão, provisória");

    function fichaDeOcultista(nex) {
      return F.normalizarFicha({
        nome: "Ocultista de teste", tipoFicha: "ordem",
        ordem: {
          classe: "ocultista", origem: "academico", nex: nex || 5,
          atributos: { agi: 1, for: 1, int: 3, pre: 2, vig: 1 },
          pericias: { ocultismo: "treinado", vontade: "treinado" },
        },
        inventario: { limite: 0, itens: [] },
      });
    }
    function rodapeStatus() { var s = janela() && janela().querySelector(".bib-rodape__status"); return s ? s.textContent : ""; }
    function principal() { return janela().querySelector(".r-modal__rodape .r-botao--principal"); }
    function secundario() { return janela().querySelector(".r-modal__rodape .r-botao--fantasma"); }
    function selecionar(nome) {
      var l = linha(nome);
      if (!l) return false;
      clicar(l.querySelector(".bib-item__selecionar"), 1);
      return true;
    }

    var ctxO = contexto(fichaDeOcultista(5));
    global.RAMABibliotecaDeRituais.abrir(ctxO, { aquisicao: { tipo: "concessao", vaga: "d1.rituaisIniciais" } });
    await ate(function () { return janela() && linhas().length; }, 25000);
    t.ok("o topo diz de onde vem a escolha", /Rituais iniciais/.test(janela().querySelector(".bib-aquisicao").textContent) &&
      /Escolhido pelo Outro Lado/.test(janela().querySelector(".bib-aquisicao").textContent));
    t.igual("o rodapé conta o que falta", rodapeStatus(), "Escolhidos: 0 de 3 · faltam 3");
    t.ok("  e confirmar começa desligado", principal().disabled);
    t.igual("só os de 1º círculo aparecem", janela().querySelector(".bib-status").textContent, "30 rituais cabem nesta aquisição.");

    selecionar("Luz");
    await espera(120);
    selecionar("Cicatrização");
    await espera(120);
    t.igual("selecionar dois atualiza a conta", rodapeStatus(), "Escolhidos: 2 de 3 · faltam 1 (a confirmar)");
    t.igual("  e nada foi escrito na ficha", ctxO.ficha.rituais.itens.length, 0);
    t.igual("  nem nas escolhas", (ctxO.ficha.ordem.escolhas || []).length, 0);
    t.ok("o selecionado fica marcado, com o estado escrito",
      linha("Luz").classList.contains("bib-item--escolhido") && /Selecionado/i.test(linha("Luz").querySelector(".bib-item__estado").textContent));

    var sel2 = linha("Luz").querySelector(".bib-item__selecionar");
    clicar(sel2, 1);
    clicar(sel2, 2);
    await espera(120);
    t.igual("clique duplo não alterna duas vezes", rodapeStatus(), "Escolhidos: 1 de 3 · faltam 2 (a confirmar)");

    var detalhe = linha("Ouvir os Sussurros");
    clicar(detalhe.querySelector(".bib-item__abrir"));
    await espera(120);
    t.ok("abrir os detalhes não seleciona", !detalhe.classList.contains("bib-item--escolhido") &&
      rodapeStatus() === "Escolhidos: 1 de 3 · faltam 2 (a confirmar)");
    t.ok("  e o botão de abrir não contém botão nenhum",
      !detalhe.querySelector(".bib-item__abrir button"));

    clicar(secundario());
    t.ok("cancelar fecha", !!(await ate(function () { return !janela(); })));
    t.igual("  e descarta a seleção inteira", ctxO.ficha.rituais.itens.length, 0);

    global.RAMABibliotecaDeRituais.abrir(ctxO, { aquisicao: { tipo: "concessao", vaga: "d1.rituaisIniciais" } });
    await ate(function () { return janela() && linhas().length; });
    t.igual("reabrir começa do que está gravado", rodapeStatus(), "Escolhidos: 0 de 3 · faltam 3");
    ["Luz", "Cicatrização", "Ouvir os Sussurros"].forEach(selecionar);
    await espera(150);
    var quarto = linha("Arma Atroz");
    t.ok("com a concessão cheia, o resto fica indisponível com o motivo",
      /Indisponível/i.test(quarto.querySelector(".bib-item__estado").textContent) &&
      /tire um antes/.test(quarto.querySelector(".bib-item__motivo").textContent));

    clicar(principal());
    await espera(150);
    t.ok("revisar mostra o resumo antes de gravar", /Antes de gravar/i.test(janela().querySelector(".bib-resumo").textContent) &&
      /cópia nova, do catálogo/.test(janela().querySelector(".bib-resumo").textContent));
    t.igual("  e o botão principal vira Confirmar", principal().textContent, "Confirmar");
    t.igual("  ainda sem nada na ficha", ctxO.ficha.rituais.itens.length, 0);

    clicar(secundario());
    await espera(120);
    t.ok("Voltar devolve a lista com a seleção", !!linha("Luz") && linha("Luz").classList.contains("bib-item--escolhido"));
    clicar(principal());
    await espera(120);
    var confirmar = principal();
    clicar(confirmar);
    clicar(confirmar);
    await ate(function () { return !janela(); });
    t.igual("confirmar grava os três rituais, uma vez só", ctxO.ficha.rituais.itens.length, 3);
    t.igual("  numa alteração só da ficha", ctxO.alteracoes, 1);
    var estO = global.RAMAOrdemProgressao.estado(ctxO.ficha.ordem, { rituais: ctxO.ficha.rituais.itens });
    t.ok("  e os três ocupam a concessão", estO.rituais.concessoes[0].completa &&
      ctxO.ficha.rituais.itens.every(function (r) { return !!estO.rituais.porRitual[r.id]; }));

    /* ---------------------------------------------------------------- */
    t.grupo("Rituais · Transcender → Aprender Ritual, sem gravar pela metade");

    var ctxT = contexto(fichaDeOcultista(15));
    var ES = global.RAMAOrdemEscolhas;
    function janelaEscolha() {
      return U.$$(".r-modal").filter(function (m) { return !m.classList.contains("r-modal--biblioteca"); }).slice(-1)[0] || null;
    }
    function abrirEscolha() {
      ES.abrir({
        ordem: ctxT.ficha.ordem, vagaId: "d3.poderClasse", ctx: ctxT,
        contexto: { inventario: ctxT.ficha.inventario, rituais: ctxT.ficha.rituais.itens },
        rituais: ctxT.ficha.rituais.itens,
        aoRegistrar: function () { ctxT.alterou(); },
      });
    }
    async function ateAprenderRitual() {
      var j = await ate(function () { return janelaEscolha(); });
      clicar(U.$$(".escolha-cartao", j).filter(function (c) { return /^Transcender/.test(c.textContent); })[0]);
      await espera(150);
      j = janelaEscolha();
      clicar(U.$$(".escolha-cartao", j).filter(function (c) { return /^Aprender Ritual/.test(c.textContent); })[0]);
      await espera(150);
      return janelaEscolha();
    }

    abrirEscolha();
    var jT = await ateAprenderRitual();
    t.ok("a escolha mostra a regra do poder nesta etapa",
      /até 1º círculo/.test(jT.querySelector(".escolha-ritual").textContent) && /0 de 3/.test(jT.querySelector(".escolha-ritual").textContent));
    clicar(jT.querySelector(".escolha-ritual button"));
    await ate(function () { return janela() && linhas().length; }, 25000);
    t.igual("a biblioteca abre no contexto de Aprender Ritual", janela().querySelector("h2").textContent, "Escolher rituais — Aprender Ritual");
    t.ok("  com a divisão Ordem Paranormal e Homebrew", U.$$(".biblioteca-origem", janela()).length === 2);
    selecionar("Luz");
    await espera(120);
    t.igual("  o rodapé diz o escolhido", rodapeStatus(), "Escolhido: Luz.");
    clicar(principal());
    await ate(function () { return !janela(); });
    jT = janelaEscolha();
    t.ok("o ritual volta para a escolha, como cópia pendente",
      /Luz/.test(jT.querySelector(".escolha-ritual").textContent) && /só quando esta escolha for confirmada/.test(jT.querySelector(".escolha-ritual").textContent));
    t.igual("  e a ficha continua sem ritual", ctxT.ficha.rituais.itens.length, 0);

    clicar(U.$$(".r-modal__rodape button", jT).filter(function (b) { return b.textContent === "Cancelar"; })[0]);
    await ate(function () { return !janelaEscolha(); });
    t.igual("cancelar a escolha não deixa ritual nenhum para trás", ctxT.ficha.rituais.itens.length, 0);
    t.igual("  nem poder nenhum", (ctxT.ficha.ordem.escolhas || []).length, 0);

    abrirEscolha();
    jT = await ateAprenderRitual();
    clicar(jT.querySelector(".escolha-ritual button"));
    await ate(function () { return janela() && linhas().length; }, 25000);
    selecionar("Luz");
    await espera(120);
    clicar(principal());
    await ate(function () { return !janela(); });
    jT = janelaEscolha();
    var elemento = U.$$(".escolha-opcao", jT).filter(function (s) { return /Elemento do ritual/i.test(s.querySelector("h4").textContent); })[0];
    function botaoDoElemento(nome) { return U.$$("button", elemento).filter(function (b) { return b.textContent === nome; })[0]; }
    t.ok("o elemento do poder vem do ritual escolhido, sem outro clique (OPRPG p.114)",
      /Vem do ritual escolhido: Luz é de Energia/.test(elemento.textContent) && botaoDoElemento("Energia").getAttribute("aria-pressed") === "true");
    t.ok("  e os outros elementos ficam indisponíveis, com o motivo",
      botaoDoElemento("Morte").getAttribute("aria-disabled") === "true" && /Luz é de Energia/.test(botaoDoElemento("Morte").title));
    clicar(botaoDoElemento("Morte"));
    await espera(150);
    t.igual("  clicar num deles não troca o elemento", botaoDoElemento("Energia").getAttribute("aria-pressed"), "true");
    jT = janelaEscolha();
    t.ok("o resumo diz qual ritual entra e a que ele fica preso",
      /Luz \(1º círculo\) — cópia nova, entra na aba Rituais ao confirmar/.test(jT.querySelector(".escolha-status").textContent));
    var botaoConfirmar = U.$$(".r-modal__rodape button", jT).filter(function (b) { return b.textContent === "Confirmar"; })[0];
    clicar(botaoConfirmar);
    clicar(botaoConfirmar);
    await ate(function () { return !janelaEscolha(); });
    t.igual("confirmar grava o ritual uma vez", ctxT.ficha.rituais.itens.length, 1);
    var estT = global.RAMAOrdemProgressao.estado(ctxT.ficha.ordem, { rituais: ctxT.ficha.rituais.itens });
    var vindoT = estT.rituais.porRitual[ctxT.ficha.rituais.itens[0].id];
    t.ok("  preso a Aprender Ritual, contando no limite",
      !!vindoT && vindoT.nomePoder === "Aprender Ritual" && vindoT.contaNoLimite && estT.rituais.limite.usados === 1);
    t.ok("  e o poder, preso ao ritual", estT.pendencias.every(function (p) { return p.id !== "d3.poderClasse"; }));

        /* ---------------------------------------------------------------- */
    t.grupo("Layout na largura atual (" + window.innerWidth + " px)");

    B.abrir(ctx, { origem: "oficial", aba: "armas" });
    await ate(function () { return janela() && linhas().length; });
    var primeira = linhas()[0];
    clicar(primeira.querySelector(".bib-item__abrir"));
    t.ok("a página não ganha rolagem horizontal", document.documentElement.scrollWidth <= window.innerWidth + 1);
    var caixa = janela().getBoundingClientRect();
    t.ok("a janela cabe na tela", caixa.left >= -1 && caixa.right <= window.innerWidth + 1);
    t.ok("os resultados cabem na janela", linhas().slice(0, 10).every(function (l) {
      var r = l.getBoundingClientRect();
      return r.left >= caixa.left - 1 && r.right <= caixa.right + 1;
    }));
    t.ok("alvos de toque com altura mínima", U.$$(".bib-item__abrir, .bib-item__adicionar", janela()).slice(0, 10).every(function (b) {
      return b.getBoundingClientRect().height >= 32;
    }));
    if (window.innerWidth <= 640) {
      t.igual("no celular, o topo do resultado empilha", getComputedStyle(primeira.querySelector(".bib-item__topo")).flexDirection, "column");
      var add = primeira.querySelector(".bib-item__adicionar");
      t.ok("  e o botão de adicionar ocupa a largura", add.getBoundingClientRect().width >= primeira.getBoundingClientRect().width * 0.7);
    }
    await fecharJanela();
  }

  function mostrarPlacar() {
    U.trocar(placar, [
      el("div", {}, [el("p.placar__numero", { class: falharam ? "t-erro" : "t-ok", texto: String(passaram + falharam) }), el("p.t-rotulo", { texto: "verificações" })]),
      el("div", {}, [el("p.placar__numero.t-ok", { texto: String(passaram) }), el("p.t-rotulo", { texto: "passaram" })]),
      el("div", {}, [el("p.placar__numero", { class: falharam ? "t-erro" : "t-fraco", texto: String(falharam) }), el("p.t-rotulo", { texto: "falharam" })]),
      el("span.r-estado", { dataset: { estado: falharam ? "erro" : "salvo" }, texto: falharam ? "Há falhas" : "Tudo passando" }),
    ]);
    document.title = (falharam ? falharam + " falhas" : "Tudo passando") + " — Testes da biblioteca";
    /* Para quem roda a página por automação. */
    global.RAMATestesBiblioteca = { terminou: true, passaram: passaram, falharam: falharam, falhas: falhas.slice() };
  }

  roteiro().then(mostrarPlacar, function (e) {
    falharam++;
    t.grupo("Exceção");
    t.ok("o roteiro parou: " + e.message, false, e.stack);
    mostrarPlacar();
  });
})(window);
