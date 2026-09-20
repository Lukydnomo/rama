/* =====================================================================
   R.A.M.A. — imagens sob demanda
   ---------------------------------------------------------------------
   Foto de personagem e avatar de conta são os campos mais pesados do
   sistema e os que menos mudam. Até a v2.15 eles vinham DENTRO das
   listagens: abrir a mesa baixava as oito fotos toda vez, e cada
   atualização automática baixava tudo de novo. Numa sessão de três
   horas isso é a mesma imagem atravessando a rede dezenas de vezes.

   Agora a listagem devolve a VERSÃO da imagem — a data em que ela foi
   gravada — e quem desenha o cartão pede a imagem aqui. Este arquivo:

     · guarda o que já chegou, nesta página e entre páginas;
     · junta os pedidos numa viagem só, em vez de uma por cartão;
     · pede primeiro o que está à vista, quando o navegador sabe dizer;
     · devolve vazio quando não há imagem, sem insistir.

   O QUE FICA GUARDADO, E ONDE
   ---------------------------------------------------------------------
     memória       enquanto a página estiver aberta: troca de aba na
                   campanha não rebaixa nada
     localStorage  entre páginas e entre visitas, com orçamento e
                   descarte do mais velho. Só imagem que a conta já
                   recebeu do servidor — nada de permissão, nada de
                   identidade

   A chave carrega a VERSÃO. Imagem trocada muda a versão, muda a chave,
   e a antiga deixa de ser usada — sem invalidação manual em lugar
   nenhum. Espaço cheio, gravação recusada pelo navegador ou modo
   privado: o sistema continua funcionando e só volta a pedir.

   O que este arquivo NÃO faz: decidir quem vê o quê. Ele pede ao
   servidor, que confere o acesso a cada pedido e devolve só o que a
   conta alcança. Uma imagem que não vem simplesmente não aparece.
   ===================================================================== */

(function (global) {
  "use strict";

  /* Quantas imagens por viagem. O servidor aceita 40; 24 deixa margem e
     faz a primeira leva chegar mais cedo numa mesa grande. */
  var POR_PEDIDO = 24;

  /* Quanto tempo esperar por mais pedidos antes de mandar a viagem.
     Curto o bastante para ninguém perceber, longo o bastante para os
     cartões de uma tela caberem no mesmo pedido. */
  var JANELA_MS = 40;

  /* Uma viagem por vez, por tipo: o objetivo é não trocar "uma
     requisição gigante" por "trinta requisições pequenas". */
  var PREFIXO = "rama.img.";
  var ORCAMENTO = 1500000;

  var TIPOS = {
    foto: { acao: "lerFotos", campo: "personagemIds" },
    avatar: { acao: "lerAvatares", campo: "userIds" },
  };

  var memoria = {};
  var esperando = {};   /* chave → [resolve] */
  var pendentes = { foto: [], avatar: [] };
  var timers = { foto: null, avatar: null };
  var emVoo = { foto: false, avatar: false };

  function chaveDe(tipo, id, versao) {
    return tipo + "." + String(id) + "." + String(versao || "");
  }

  /* ---------------- guardado no aparelho ---------------- */

  function lerGuardada(chave) {
    try {
      var bruto = localStorage.getItem(PREFIXO + chave);
      if (!bruto) return null;
      var v = JSON.parse(bruto);
      return v && typeof v.d === "string" ? v.d : null;
    } catch (e) {
      return null;
    }
  }

  function guardar(chave, imagem) {
    if (!imagem) return;
    try {
      localStorage.setItem(PREFIXO + chave, JSON.stringify({ d: imagem, t: Date.now() }));
    } catch (e) {
      /* Espaço cheio: joga fora o mais velho e tenta uma vez. Falhando
         de novo, segue sem guardar — a imagem continua na memória desta
         página. */
      if (!liberarEspaco(imagem.length * 2)) return;
      try {
        localStorage.setItem(PREFIXO + chave, JSON.stringify({ d: imagem, t: Date.now() }));
      } catch (e2) { /* segue sem guardar */ }
    }
  }

  /* Descarta as entradas mais velhas até liberar o espaço pedido.
     Devolve se conseguiu jogar alguma coisa fora. */
  function liberarEspaco(precisa) {
    var itens = [];
    var total = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf(PREFIXO) !== 0) continue;
        var bruto = localStorage.getItem(k) || "";
        total += bruto.length;
        var quando = 0;
        try { quando = JSON.parse(bruto).t || 0; } catch (e) { quando = 0; }
        itens.push({ chave: k, tamanho: bruto.length, quando: quando });
      }
    } catch (e) {
      return false;
    }

    if (!itens.length) return false;

    itens.sort(function (a, b) { return a.quando - b.quando; });

    var alvo = Math.max(precisa || 0, total - ORCAMENTO + (precisa || 0));
    var liberado = 0;
    var jogou = false;

    for (var j = 0; j < itens.length && liberado < alvo; j++) {
      try { localStorage.removeItem(itens[j].chave); } catch (e) { continue; }
      liberado += itens[j].tamanho;
      jogou = true;
    }
    return jogou;
  }

  /* ---------------- a viagem ---------------- */

  function agendar(tipo) {
    if (timers[tipo] || emVoo[tipo]) return;
    timers[tipo] = setTimeout(function () {
      timers[tipo] = null;
      despachar(tipo);
    }, JANELA_MS);
  }

  async function despachar(tipo) {
    if (emVoo[tipo]) return;

    var lote = pendentes[tipo].splice(0, POR_PEDIDO);
    if (!lote.length) return;

    emVoo[tipo] = true;

    var ids = lote.map(function (p) { return p.id; });
    var r;
    try {
      r = await global.RAMAApi[TIPOS[tipo].acao](ids);
    } catch (e) {
      r = { ok: false };
    }

    var dados = (r && r.ok && r.dados) || {};

    lote.forEach(function (p) {
      var vinda = dados[p.id];
      var imagem = (vinda && vinda.imagem) || "";

      /* A versão que o servidor devolveu manda: se a imagem trocou
         entre a listagem e este pedido, a chave certa é a de agora. */
      var chave = chaveDe(tipo, p.id, (vinda && vinda.versao) || p.versao);
      if (imagem) {
        memoria[chave] = imagem;
        guardar(chave, imagem);
      }

      /* Sem imagem também é resposta: guardar o vazio na memória evita
         pedir de novo a cada redesenho. */
      if (!imagem) memoria[chaveDe(tipo, p.id, p.versao)] = "";

      responder(chaveDe(tipo, p.id, p.versao), imagem);
      if (chave !== chaveDe(tipo, p.id, p.versao)) responder(chave, imagem);
    });

    emVoo[tipo] = false;

    if (pendentes[tipo].length) agendar(tipo);
  }

  function responder(chave, imagem) {
    var fila = esperando[chave];
    if (!fila) return;
    delete esperando[chave];
    fila.forEach(function (fn) {
      try { fn(imagem); } catch (e) { /* quem pediu sumiu */ }
    });
  }

  /* ---------------- o pedido ---------------- */

  function buscar(tipo, id, versao) {
    var chave = chaveDe(tipo, id, versao);

    if (memoria[chave] !== undefined) return Promise.resolve(memoria[chave]);

    var guardada = lerGuardada(chave);
    if (guardada !== null) {
      memoria[chave] = guardada;
      return Promise.resolve(guardada);
    }

    if (!id) return Promise.resolve("");

    return new Promise(function (resolve) {
      if (!esperando[chave]) {
        esperando[chave] = [];
        pendentes[tipo].push({ id: String(id), versao: String(versao || "") });
      }
      esperando[chave].push(resolve);
      agendar(tipo);
    });
  }

  /* ---------------- o que as telas usam ---------------- */

  /* Põe a imagem dentro do elemento quando ela chegar. Com
     IntersectionObserver, o pedido só sai quando o cartão chega perto da
     tela — numa mesa de vinte fichas, os que estão fora dela não
     custam viagem nenhuma.

     Devolve uma função que cancela a observação, para quem redesenha. */
  function aplicar(caixa, opcoes) {
    var o = opcoes || {};
    var tipo = TIPOS[o.tipo] ? o.tipo : "foto";
    if (!caixa || !o.id || !o.versao) return function () {};

    var vivo = true;

    function colocar(imagem) {
      if (!vivo || !imagem) return;
      /* Só troca o conteúdo se o elemento ainda estiver na tela e ainda
         for deste personagem: redesenhos acontecem. */
      if (caixa.dataset && caixa.dataset.imagemId && caixa.dataset.imagemId !== String(o.id)) return;
      var img = global.document.createElement("img");
      img.src = imagem;
      img.alt = o.alt || "";
      caixa.textContent = "";
      caixa.appendChild(img);
    }

    if (caixa.dataset) caixa.dataset.imagemId = String(o.id);

    function pedir() {
      buscar(tipo, o.id, o.versao).then(colocar);
    }

    var chave = chaveDe(tipo, o.id, o.versao);
    if (memoria[chave] !== undefined || lerGuardada(chave) !== null) {
      pedir();
      return function () { vivo = false; };
    }

    if (typeof global.IntersectionObserver !== "function") {
      pedir();
      return function () { vivo = false; };
    }

    var observador = new global.IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        observador.disconnect();
        pedir();
      });
    }, { rootMargin: "300px" });

    observador.observe(caixa);

    return function () {
      vivo = false;
      observador.disconnect();
    };
  }

  /* Uma imagem trocada nesta mesma página (o dono acabou de gravar):
     entra no lugar sem viagem nenhuma. */
  function lembrar(tipo, id, versao, imagem) {
    if (!TIPOS[tipo] || !id) return;
    var chave = chaveDe(tipo, id, versao);
    memoria[chave] = imagem || "";
    if (imagem) guardar(chave, imagem);
  }

  global.RAMAImagens = {
    foto: function (id, versao) { return buscar("foto", id, versao); },
    avatar: function (id, versao) { return buscar("avatar", id, versao); },
    aplicar: aplicar,
    lembrar: lembrar,
    /* para os testes */
    _chave: chaveDe,
  };
})(typeof window !== "undefined" ? window : globalThis);
