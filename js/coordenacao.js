/* =====================================================================
   R.A.M.A. — coordenação entre abas (v2.46)
   ---------------------------------------------------------------------
   Duas abas com a mesma campanha aberta perguntavam ao servidor, cada
   uma no seu ritmo, a MESMA coisa: "o que mudou na mesa?". Com três
   abas, três perguntas — e cada pergunta é uma execução do Apps Script.

   Aqui as abas do mesmo navegador dividem o resultado de leituras
   EQUIVALENTES por um BroadcastChannel:

     · antes de perguntar, a aba vê se outra já trouxe a resposta há
       pouco (mais nova que a validade que ELA aceitaria). Se trouxe, usa;
     · se outra aba avisou que está perguntando agora, espera a resposta
       dela por um prazo curto;
     · senão, avisa que vai perguntar, pergunta, e espalha a resposta —
       e quem estava esperando, ou só ouvindo, recebe na hora.

   Não há líder a eleger. Quem pergunta é quem chegou primeiro; se ela
   fechar, ficar suspensa, perder a conexão ou não responder, o prazo de
   espera vence e cada aba volta a perguntar por conta própria. Uma falha
   avisa as outras na hora ("desistiu"), para ninguém esperar à toa.

   O QUE É "EQUIVALENTE"
     A chave diz tudo o que a resposta depende: o tipo da consulta, a
     campanha ou o personagem e os parâmetros ("sinc:<campanha>",
     "acesso:<personagem>"). E toda mensagem leva a CONTA de quem
     perguntou: resposta de outra conta é ignorada (a aba trocou de conta
     no meio), e trocar de sessão (o token no localStorage) apaga tudo o
     que estava guardado.

   O QUE NUNCA VAI PELO CANAL
     Token, senha ou qualquer credencial. Vai a resposta de uma LEITURA
     que a própria conta pode fazer, entre abas da mesma origem — o
     BroadcastChannel não sai do navegador nem da origem do site.

   O QUE NÃO É COORDENADO
     Gravação nenhuma. Duas gravações iguais podem ser duas intenções; só
     leituras com chave entram aqui.

   Sem BroadcastChannel (navegador antigo, contexto sem suporte), cada
   aba pergunta sozinha, como antes.
   ===================================================================== */

(function (global) {
  "use strict";

  var NOME_DO_CANAL = "rama.coordenacao.v1";
  /* Quanto esperar a resposta que outra aba anunciou. Passado isso, a aba
     pergunta por conta própria. */
  var ESPERA_ALHEIA_MS = (global.RAMA_CONFIG && global.RAMA_CONFIG.COORDENACAO_ESPERA_MS) || 6000;

  var idDaAba = "aba-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  var canal = null;
  var resultados = {};   // chave → { em, conta, resposta }
  var anunciadas = {};   // chave → { em, aba }
  var esperando = {};    // chave → [função]
  var ouvintes = {};     // chave → [função]

  function med() { return global.RAMAMedicao || null; }

  function copiar(v) {
    try { return JSON.parse(JSON.stringify(v)); } catch (e) { return v; }
  }

  function contaAtual() {
    try {
      var a = global.RAMAAuth && global.RAMAAuth.agente ? global.RAMAAuth.agente() : null;
      return a && a.id ? String(a.id) : "";
    } catch (e) { return ""; }
  }

  function abrirCanal() {
    if (canal !== null) return canal;
    try {
      canal = typeof global.BroadcastChannel === "function" ? new global.BroadcastChannel(NOME_DO_CANAL) : false;
      if (canal) canal.onmessage = function (ev) { receber(ev && ev.data); };
    } catch (e) {
      canal = false;
    }
    return canal;
  }

  function enviar(m) {
    var c = abrirCanal();
    if (!c) return;
    try { c.postMessage(m); } catch (e) { /* aba fechando */ }
  }

  function receber(m) {
    if (!m || m.v !== 1 || m.aba === idDaAba || !m.chave) return;
    /* Outra conta (a aba trocou de conta no meio) ou nenhuma: ignorado. */
    var conta = contaAtual();
    if (!conta || m.conta !== conta) return;

    if (m.tipo === "consultando") {
      anunciadas[m.chave] = { em: m.em, aba: m.aba };
      return;
    }
    if (m.tipo === "desistiu") {
      var a = anunciadas[m.chave];
      if (a && a.aba === m.aba) delete anunciadas[m.chave];
      liberar(m.chave, null);
      return;
    }
    if (m.tipo === "resultado") {
      var atual = resultados[m.chave];
      /* Uma resposta de uma pergunta MAIS VELHA que a que já se tem
         (chegou atrasada) não substitui a mais nova. */
      if (atual && atual.em >= m.em) return;
      resultados[m.chave] = { em: m.em, conta: m.conta, resposta: m.resposta };
      var an = anunciadas[m.chave];
      if (an && an.aba === m.aba) delete anunciadas[m.chave];
      if (med()) med().contar("coordenacao.recebida");
      liberar(m.chave, m.resposta);
      (ouvintes[m.chave] || []).slice().forEach(function (fn) {
        try { fn(copiar(m.resposta), m.em); } catch (e) { console.error("[R.A.M.A. · coordenação] ouvinte falhou", e); }
      });
    }
  }

  function liberar(chave, resposta) {
    var lista = esperando[chave];
    if (!lista || !lista.length) return;
    esperando[chave] = [];
    lista.forEach(function (fn) { fn(resposta); });
  }

  function esperarResultado(chave, ms) {
    return new Promise(function (ok) {
      var feito = false;
      var timer = setTimeout(function () { if (!feito) { feito = true; ok(null); } }, ms);
      (esperando[chave] = esperando[chave] || []).push(function (r) {
        if (feito) return;
        feito = true;
        clearTimeout(timer);
        ok(r);
      });
    });
  }

  /* Trocar de sessão (entrar, sair, outra conta) em qualquer aba apaga o
     que estava guardado aqui: nada de uma sessão vale para outra. */
  function esquecerTudo() {
    resultados = {};
    anunciadas = {};
    Object.keys(esperando).forEach(function (k) { liberar(k, null); });
  }

  if (global.addEventListener) {
    global.addEventListener("storage", function (ev) {
      if (!ev || ev.key === null || /^rama\.sessao\./.test(String(ev.key))) esquecerTudo();
    });
  }

  /* compartilhada(chave, consultar, opcoes) → executar(validadeMs)
       consultar()        a leitura de verdade; devolve a resposta da API
       opcoes.aceitar(r)  quais respostas podem ser divididas (padrão: ok)
     executar(validade) devolve uma resposta: a de outra aba, se for mais
     nova que `validade` ms; senão a desta. */
  function compartilhada(chave, consultar, opcoes) {
    var o = opcoes || {};
    var aceitar = o.aceitar || function (r) { return !!(r && r.ok); };

    return async function executar(validadeMs) {
      var conta = contaAtual();
      var guardado = resultados[chave];
      if (guardado && conta && guardado.conta === conta && Date.now() - guardado.em <= (validadeMs || 0)) {
        if (med()) med().contar("coordenacao.aproveitada");
        return copiar(guardado.resposta);
      }

      if (abrirCanal()) {
        var an = anunciadas[chave];
        if (an && Date.now() - an.em < ESPERA_ALHEIA_MS) {
          var dela = await esperarResultado(chave, ESPERA_ALHEIA_MS - (Date.now() - an.em));
          if (dela && contaAtual() === conta) {
            if (med()) med().contar("coordenacao.esperada");
            return copiar(dela);
          }
          if (med()) med().contar("coordenacao.desistiu");
        }
      }

      var inicio = Date.now();
      if (conta) enviar({ v: 1, tipo: "consultando", chave: chave, conta: conta, aba: idDaAba, em: inicio });
      var r;
      try {
        r = await consultar();
      } catch (e) {
        r = { ok: false, erro: "sem_conexao" };
      }
      if (med()) med().contar("coordenacao.consultou");
      /* Só divide o que veio da MESMA sessão em que perguntou: a aba pode
         ter trocado de conta enquanto a resposta voava. */
      if (conta && contaAtual() === conta && aceitar(r)) {
        var atual = resultados[chave];
        if (!atual || atual.em < inicio) resultados[chave] = { em: inicio, conta: conta, resposta: copiar(r) };
        enviar({ v: 1, tipo: "resultado", chave: chave, conta: conta, aba: idDaAba, em: inicio, resposta: r });
      } else if (conta) {
        enviar({ v: 1, tipo: "desistiu", chave: chave, conta: conta, aba: idDaAba, em: inicio });
      }
      return r;
    };
  }

  /* Recebe as respostas que OUTRAS abas trouxeram para esta chave. */
  function ouvir(chave, fn) {
    abrirCanal();
    (ouvintes[chave] = ouvintes[chave] || []).push(fn);
    return function () {
      ouvintes[chave] = (ouvintes[chave] || []).filter(function (f) { return f !== fn; });
    };
  }

  /* O canal abre já: uma aba precisa ouvir as respostas das outras desde
     que nasce — inclusive escondida —, para usá-las ao perguntar. */
  abrirCanal();

  global.RAMACoordenacao = {
    compartilhada: compartilhada,
    ouvir: ouvir,
    disponivel: function () { return !!abrirCanal(); },
    esquecerTudo: esquecerTudo,
    ESPERA_ALHEIA_MS: ESPERA_ALHEIA_MS,
  };
})(typeof window !== "undefined" ? window : globalThis);
