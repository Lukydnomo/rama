/* =====================================================================
   R.A.M.A. — sincronização da campanha
   =====================================================================
   Quem está com a campanha aberta vê o que os outros mudaram sem
   recarregar a página. Não é tempo real: o Apps Script não mantém
   conexão aberta, então o navegador PERGUNTA de tempos em tempos.

   ---------------------------------------------------------------------
   A PERGUNTA É LEVE
   ---------------------------------------------------------------------

   Ela não traz dado nenhum: traz as MARCAS de cada parte da campanha
   (campanha, membros, personagens, combates, documentos, rolagens). O
   servidor as lê do cache, sem tocar na planilha — ver "Marcas da mesa"
   em backend/Campanhas.gs. Só quando uma marca muda a parte dela é
   buscada de novo, pelo caminho normal e com todas as conferências.

   ---------------------------------------------------------------------
   O RITMO
   ---------------------------------------------------------------------

     aba Personagens ou Combate aberta   a cada ~8 s
     outras abas                         a cada ~20 s
     página escondida (outra aba, tela   não pergunta; ao voltar,
     bloqueada)                          pergunta na hora
     falha                               espera dobra a cada falha, até
                                         1 minuto; volta ao normal na
                                         primeira resposta boa

   Cada espera tem uma variação aleatória de ±10%, para vinte navegadores
   abertos na mesma mesa não perguntarem todos no mesmo instante.

   Latência esperada de uma mudança feita por outra pessoa: o intervalo
   (até 8 s nas abas de mesa) + a resposta das marcas (normalmente menos
   de 2 s) + a busca da parte que mudou (1 a 3 s). Na prática, de 2 a
   15 segundos — e mais quando o Apps Script está acordando.

   Com vinte pessoas nas abas de mesa, são cerca de 2,5 perguntas por
   segundo — cada uma, uma leitura de cache. As buscas de verdade só
   acontecem quando algo mudou.
   ===================================================================== */

(function (global) {
  "use strict";

  var INTERVALO_ATIVO = 8000;
  var INTERVALO_CALMO = 20000;
  var ESPERA_MAXIMA = 60000;
  var VARIACAO = 0.1;

  function relogioPadrao() {
    return {
      definir: function (fn, ms) { return setTimeout(fn, ms); },
      limpar: function (id) { clearTimeout(id); },
    };
  }

  /* As partes cujas marcas mudaram. */
  function diferencas(antes, depois) {
    var a = antes || {};
    var d = depois || {};
    return Object.keys(d).filter(function (k) { return a[k] !== d[k]; });
  }

  /* A espera até a próxima pergunta. `falhas` dobra a espera. */
  function proximaEspera(base, falhas, aleatorio) {
    var espera = base * Math.pow(2, Math.max(0, falhas || 0));
    espera = Math.min(ESPERA_MAXIMA, espera);
    var r = aleatorio === undefined ? Math.random() : aleatorio;
    return Math.round(espera * (1 - VARIACAO + 2 * VARIACAO * r));
  }

  /* criar({
       consultar() → Promise<resposta de sincronizar_campanha>
       marcas            as marcas de partida (de ler_campanha)
       papel             o papel de partida
       intervalo()       ms até a próxima pergunta, sem falha
       visivel()         a página está à vista?
       aoMudar(partes, dados) → Promise   partes que mudaram (inclui
                         "papel" se o papel de quem pergunta mudou)
       aoPerderAcesso(resposta)           a campanha sumiu para esta conta
       relogio, aleatorio
     }) */
  function criar(opcoes) {
    var o = opcoes || {};
    var relogio = o.relogio || relogioPadrao();
    var marcas = o.marcas || null;
    var papel = o.papel || null;
    var falhas = 0;
    var timer = null;
    var perguntando = false;
    var parado = true;
    var ultimaResposta = 0;

    function intervalo() {
      return o.intervalo ? o.intervalo() : INTERVALO_ATIVO;
    }

    function visivel() { return o.visivel ? o.visivel() : true; }

    function agendar(espera) {
      relogio.limpar(timer);
      timer = null;
      if (parado || !visivel()) return;
      timer = relogio.definir(perguntar, espera);
    }

    async function perguntar() {
      timer = null;
      if (parado || perguntando) return;
      if (!visivel()) return;

      perguntando = true;
      var r;
      try {
        r = await o.consultar();
      } catch (e) {
        r = { ok: false, erro: "sem_conexao" };
      }
      perguntando = false;
      if (parado) return;

      if (r && r.ok && r.dados) {
        falhas = 0;
        ultimaResposta = Date.now();
        var partes = marcas ? diferencas(marcas, r.dados.marcas) : [];
        if (papel && r.dados.papel && r.dados.papel !== papel) partes.push("papel");
        marcas = r.dados.marcas || marcas;
        papel = r.dados.papel || papel;

        if (partes.length && o.aoMudar) {
          try { await o.aoMudar(partes, r.dados); }
          catch (e) { console.error("[R.A.M.A. · sincronia] falha ao aplicar mudança", e); }
        }
        agendar(proximaEspera(intervalo(), 0, o.aleatorio));
        return;
      }

      var erro = r && r.erro;
      if (erro === "nao_encontrado" || erro === "sem_permissao") {
        parado = true;
        if (o.aoPerderAcesso) o.aoPerderAcesso(r);
        return;
      }
      if (global.RAMAApi && global.RAMAApi.ehErroDeSessao && global.RAMAApi.ehErroDeSessao(erro)) {
        /* O RAMAAuth já levou ao portão. */
        parado = true;
        return;
      }

      falhas++;
      agendar(proximaEspera(intervalo(), falhas, o.aleatorio));
    }

    function aoMudarVisibilidade() {
      if (parado) return;
      if (visivel()) {
        relogio.limpar(timer);
        timer = relogio.definir(perguntar, 300);
      } else {
        relogio.limpar(timer);
        timer = null;
      }
    }

    function iniciar() {
      if (!parado) return;
      parado = false;
      if (typeof document !== "undefined" && document.addEventListener) {
        document.addEventListener("visibilitychange", aoMudarVisibilidade);
      }
      agendar(proximaEspera(intervalo(), 0, o.aleatorio));
    }

    function parar() {
      parado = true;
      relogio.limpar(timer);
      timer = null;
      if (typeof document !== "undefined" && document.removeEventListener) {
        document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      }
    }

    /* Pergunta já — depois de trocar de aba, por exemplo. */
    function agora() {
      if (parado) return;
      relogio.limpar(timer);
      timer = relogio.definir(perguntar, 0);
    }

    /* Quem acabou de gravar já sabe o que mudou e buscou de novo: a marca
       nova não precisa voltar como "mudança". */
    function reconhecer(novas) {
      if (!novas) return;
      marcas = Object.assign({}, marcas || {}, novas);
    }

    return {
      iniciar: iniciar,
      parar: parar,
      agora: agora,
      perguntar: perguntar,
      reconhecer: reconhecer,
      aoMudarVisibilidade: aoMudarVisibilidade,
      estado: function () {
        return { parado: parado, falhas: falhas, marcas: marcas, papel: papel, ultimaResposta: ultimaResposta, agendado: !!timer };
      },
    };
  }

  global.RAMASincronia = {
    criar: criar,
    diferencas: diferencas,
    proximaEspera: proximaEspera,
    INTERVALO_ATIVO: INTERVALO_ATIVO,
    INTERVALO_CALMO: INTERVALO_CALMO,
    ESPERA_MAXIMA: ESPERA_MAXIMA,
  };
})(typeof window !== "undefined" ? window : globalThis);
