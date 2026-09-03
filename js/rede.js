/* =====================================================================
   R.A.M.A. — transporte
   ---------------------------------------------------------------------
   A única porta de saída do sistema. Todo POST para o Apps Script passa
   por aqui, e nenhuma tela chama fetch por conta própria.

   Três coisas que este arquivo existe para acertar:

   1. O tipo de conteúdo é text/plain. Não é descuido: com
      application/json o navegador manda um OPTIONS de verificação
      antes, e o Apps Script não responde a OPTIONS. O corpo continua
      sendo JSON; só o cabeçalho é que finge outra coisa.

   2. O Apps Script erra sozinho de vez em quando. O /exec responde com
      um redirecionamento, e esse segundo salto às vezes volta 404 ou
      5xx sem nada estar errado do nosso lado. Leitura pode repetir;
      gravação, não — repetir gravação é duplicar registro.

   3. "Sem internet" e "o servidor recusou" NÃO são a mesma falha. A
      primeira é da rede de quem usa e resolve sozinha; a segunda é do
      backend e precisa de conserto. Misturar as duas manda a pessoa
      reiniciar o roteador enquanto o problema está na planilha.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;

  /* Só status passageiro merece nova tentativa. 401, 403 e 400 são
     resposta de verdade: repetir só gasta tempo e engana. */
  var STATUS_PASSAGEIRO = [0, 404, 429, 500, 502, 503, 504];

  /* Espera crescente entre tentativas. */
  var ESPERAS = [400, 1200, 3000];

  /* O ARRANQUE A FRIO
     ---------------------------------------------------------------
     O Apps Script hiberna. A primeira chamada depois de um tempo
     parado precisa subir o contêiner de execução, e isso passa
     facilmente de meio minuto — enquanto as seguintes respondem na
     hora. É o motivo de "só a primeira vez dá erro".

     A saída é contraintuitiva: a primeira tentativa tem prazo CURTO
     de propósito. Se o servidor estiver dormindo, ela vai estourar de
     qualquer jeito; e abortar o fetch NÃO cancela a execução do lado
     do Google — ela continua e acaba de acordar o contêiner. A
     tentativa seguinte, com prazo maior, encontra tudo quente.

     Desistir cedo e tentar de novo chega mais rápido do que esperar
     muito de uma vez só. */
  function prazos(repetir) {
    var base = config().TEMPO_LIMITE_MS || 30000;
    if (!repetir) return [base];                       // gravação: uma vez só
    return [Math.min(12000, base), base, Math.round(base * 1.5)];
  }

  function config() { return global.RAMA_CONFIG || {}; }

  function endereco() {
    return String(config().API_URL || "").trim();
  }

  function configurado() {
    var u = endereco();
    return !!u && u.indexOf("COLE_AQUI") === -1 && /^https?:\/\//.test(u);
  }

  /* Quando o Apps Script estoura, ele devolve uma página de erro em HTML
     em vez do JSON de sempre. Ler o texto e não conseguir virar JSON é
     exatamente esse caso, e é informação — não é "internet ruim". */
  function lerCorpo(texto) {
    try { return { ok: true, dados: JSON.parse(texto) }; }
    catch (e) { return { ok: false, texto: texto }; }
  }

  /* O texto visível da página de erro do Google, para o console. */
  function resumoDaPagina(html) {
    return String(html || "")
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);
  }

  /* fetch com prazo. Sem isto uma requisição pendurada trava o
     indicador de "Salvando…" para sempre e nada avisa a pessoa. */
  async function comPrazo(url, opcoes, ms) {
    var controle = new AbortController();
    var timer = setTimeout(function () { controle.abort(); }, ms);
    try {
      return await fetch(url, Object.assign({}, opcoes, { signal: controle.signal }));
    } finally {
      clearTimeout(timer);
    }
  }

  /* postar(corpo, { repetir })
       repetir:true  → tenta de novo em falha passageira (só leitura)
       repetir:false → uma vez só; quem chamou decide o que fazer

     Devolve sempre um objeto no formato da API. Falha de transporte
     também vira objeto, com código próprio, para nenhuma tela precisar
     de try/catch para saber o que aconteceu. */
  async function postar(corpo, opcoes) {
    var o = opcoes || {};

    if (!configurado()) {
      registrar("erro", "API_URL não configurada em js/config.js");
      return { ok: false, erro: "sem_configuracao" };
    }

    var limites = prazos(o.repetir);
    var tentativas = limites.length;
    var ultimoStatus = 0;
    var ultimoTexto = "";

    for (var i = 0; i < tentativas; i++) {
      if (i > 0) await U.esperar(ESPERAS[Math.min(i - 1, ESPERAS.length - 1)]);

      var resposta;
      try {
        resposta = await comPrazo(endereco(), {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
          redirect: "follow",
        }, limites[i]);
      } catch (e) {
        var abortou = e && e.name === "AbortError";
        var ultima = i === tentativas - 1;

        /* Prazo estourado NÃO é rede caída. O servidor está lá, só
           demorando — o caso clássico é o contêiner acordando. Se a
           operação pode ser repetida, é exatamente aqui que a
           repetição vale, e era isto que faltava: antes, o prazo
           desistia sem nunca chegar ao laço, e quem usava o sistema
           tinha de clicar em "tentar novamente" por conta própria. */
        if (abortou && !ultima) {
          avisarDemora(i + 1);
          registrar("aviso", "Prazo de " + limites[i] + " ms esgotado na tentativa " +
            (i + 1) + " — o servidor pode estar acordando");
          continue;
        }

        /* Rede de verdade caída: repetir não esclarece nada, e quem
           chamou precisa saber que foi conexão. */
        registrar("aviso", abortou ? "Prazo esgotado ao falar com o servidor" : "Falha de rede", e);
        return {
          ok: false,
          erro: abortou ? "prazo" : "sem_conexao",
          offline: !navigator.onLine,
        };
      }

      ultimoStatus = resposta.status;
      ultimoTexto = await resposta.text();

      var lido = lerCorpo(ultimoTexto);

      if (resposta.ok && lido.ok) {
        if (i > 0) registrar("info", "Resposta veio na tentativa " + (i + 1));
        return lido.dados;
      }

      var valeRepetir = STATUS_PASSAGEIRO.indexOf(resposta.status) >= 0;
      /* JSON legítimo com status ruim ainda é resposta do sistema:
         entregue como está, sem inventar erro de transporte. */
      if (lido.ok) return lido.dados;
      if (!valeRepetir) break;
    }

    var detalhe = resumoDaPagina(ultimoTexto);
    registrar("erro", "Servidor respondeu " + ultimoStatus + " sem JSON", detalhe);

    return { ok: false, erro: "servidor_falhou", status: ultimoStatus, detalhe: detalhe };
  }

  /* Uma espera silenciosa de meio minuto é indistinguível de travamento.
     Este aviso não interrompe nada: quem estiver desenhando uma tela de
     carregamento escuta e troca o texto. Se ninguém escutar, não
     acontece nada. */
  function avisarDemora(tentativa) {
    try {
      document.dispatchEvent(new CustomEvent("rama:servidor-demorando", {
        detail: { tentativa: tentativa },
      }));
    } catch (e) { /* ambiente sem DOM: segue sem avisar */ }
  }

  /* O detalhe técnico vive no console, não na tela. A tela recebe uma
     frase que uma pessoa entende; quem está consertando abre o console. */
  function registrar(nivel, mensagem, extra) {
    var linha = "[R.A.M.A. · rede] " + mensagem;
    if (nivel === "erro") console.error(linha, extra || "");
    else if (nivel === "aviso") console.warn(linha, extra || "");
    else console.info(linha, extra || "");
  }

  global.RAMARede = {
    postar: postar,
    endereco: endereco,
    configurado: configurado,
    registrar: registrar,
  };
})(window);
