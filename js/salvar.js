/* =====================================================================
   R.A.M.A. — salvamento
   ---------------------------------------------------------------------
   A ficha precisa parecer instantânea. A tela muda no clique; a
   planilha fica sabendo logo em seguida.

   O ciclo, e o motivo de cada etapa:

     1. quem chamou já mudou a tela — nada aqui espera o servidor
     2. estado vira "Alterações pendentes"
     3. espera curta, juntando alterações seguidas
     4. envia, e o estado vira "Salvando…"
     5. se voltou bem, "Salvo"

   Duas armadilhas que este arquivo existe para evitar:

   · Dizer "Salvo" cedo demais. Se algo mudou enquanto a gravação
     voava, o que está na tela AINDA não subiu. Anunciar "Salvo" ali
     convida a pessoa a fechar a aba com trabalho por enviar.

   · Mandar duas gravações ao mesmo tempo. Elas chegariam fora de
     ordem e a segunda poderia carregar uma revisão já vencida. Só uma
     voa por vez; o que chegar durante o voo entra na fila.

   E quando o servidor recusa por revisão, ninguém recarrega nada: o
   RAMASync compara as três versões e só o que os dois lados mudaram
   vira pergunta.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;

  /* Depois de quatro conciliações seguidas, alguém do outro lado está
     digitando ao vivo no mesmo registro. Insistir vira briga de
     gravação; melhor parar e deixar a pessoa olhar. */
  var MAX_CONCILIACOES = 4;

  var ESPERA_MAXIMA = 20000;

  /* criar({
       indicador,     objeto de RAMAUI.indicador
       instantaneo(), devolve o que deve ser gravado, já copiado
       enviar(dados, rev), faz a chamada e devolve a resposta da API
       aplicar(estado, rev), coloca o resultado da conciliação na tela
       esquema,       para o RAMASync
       aoSalvar(rev)  opcional
     }) */
  function criar(opcoes) {
    var o = opcoes || {};
    var espera = (global.RAMA_CONFIG && global.RAMA_CONFIG.DEBOUNCE_MS) || 400;

    var rev = 0;
    var base = null;          // o último estado que o servidor confirmou
    var pendente = false;
    var emVoo = false;
    var travado = false;
    var conflitoAberto = false;
    var tentativa = 0;
    var conciliacoes = 0;
    var timer = null;

    function definirBase(estado, novaRev) {
      base = U.copiar(estado);
      rev = U.inteiro(novaRev, 0);
    }

    function revisaoAtual() { return rev; }

    /* Chamado pela tela a cada alteração. Barato de propósito: pode ser
       chamado a cada tecla sem custo de rede. */
    function alterou() {
      if (travado) return;

      if (conflitoAberto) {
        /* Com conflito na tela, mandar o estado em disputa por cima
           seria exatamente o que se quer evitar. */
        pendente = true;
        estadoVira("conflito");
        return;
      }

      pendente = true;
      estadoVira(tentativa ? "offline" : "pendente");
      clearTimeout(timer);
      timer = setTimeout(enviar, espera);
    }

    /* Sobe agora, sem esperar o debounce. Para sair da página ou trocar
       de aba sem deixar nada para trás. */
    function agora() {
      clearTimeout(timer);
      return enviar();
    }

    async function enviar() {
      if (travado || emVoo || !pendente || conflitoAberto) return;

      emVoo = true;
      pendente = false;
      estadoVira("salvando");

      /* Cópia de verdade. Se isto apontasse para o estado vivo, a BASE
         mudaria junto com a tela e deixaria de servir como ponto de
         partida da conciliação. */
      var instantaneo = U.copiar(o.instantaneo());

      var r;
      try {
        r = await o.enviar(instantaneo, rev);
      } catch (e) {
        r = { ok: false, erro: "sem_conexao" };
        console.error("[R.A.M.A. · salvar] exceção ao enviar", e);
      }

      emVoo = false;

      if (r && r.ok) {
        rev = U.inteiro(r.rev, rev + 1);
        base = instantaneo;
        tentativa = 0;
        conciliacoes = 0;

        document.dispatchEvent(new CustomEvent("rama:atividade"));

        /* "Salvo" só vale se nada entrou na fila enquanto isto voava. */
        if (pendente) { estadoVira("pendente"); clearTimeout(timer); timer = setTimeout(enviar, 0); }
        else if (o.indicador) o.indicador.salvoAgora();

        if (o.aoSalvar) o.aoSalvar(rev, instantaneo);
        return;
      }

      if (r && r.erro === "conflito") { conciliar(r, instantaneo); return; }

      if (r && global.RAMAApi.ehErroDeSessao(r.erro)) {
        travado = true;
        estadoVira("expirado");
        return;
      }

      /* Falha de transporte: reagenda com espera crescente e mantém o
         que estava para enviar. Nada se perde. */
      pendente = true;
      tentativa++;

      var semRede = r && (r.erro === "sem_conexao" || r.erro === "prazo");
      estadoVira(semRede ? "offline" : "erro");

      clearTimeout(timer);
      timer = setTimeout(enviar, Math.min(ESPERA_MAXIMA, 1500 * tentativa));

      if (tentativa === 1) {
        global.RAMAUI.aviso(
          semRede
            ? "Sem conexão com o arquivo — as alterações continuam aqui e sobem sozinhas."
            : "O servidor recusou a gravação — vou tentar de novo.",
          { tipo: semRede ? "atencao" : "erro" }
        );
      }
    }

    /* =================================================================
       CONCILIAÇÃO
       ================================================================= */

    function conciliar(resposta, instantaneo) {
      var servidor = resposta && resposta.dados;

      /* Sem o estado do servidor não dá para comparar nada. Parar é
         mais honesto do que adivinhar. */
      if (!servidor) {
        conflitoAberto = true;
        estadoVira("conflito");
        global.RAMAUI.avisoErro(
          "Outro aparelho alterou este registro. Recarregue para ver a versão mais recente."
        );
        return;
      }

      var m = global.RAMASync.mesclar(base || instantaneo, instantaneo, servidor, o.esquema);

      console.info("[R.A.M.A. · sync] " + m.conflitos.length + " campo(s) em disputa, " +
        m.automaticos.length + " conciliado(s) sozinho");

      if (!m.conflitos.length) {
        aplicarConciliado(m.estado, resposta.rev, m.automaticos.length);
        return;
      }

      conflitoAberto = true;
      estadoVira("conflito");

      global.RAMASync.abrirConflito({
        conflitos: m.conflitos,
        automaticos: m.automaticos,
        aoResolver: function (escolhas) {
          global.RAMASync.aplicarEscolhas(m.conflitos, escolhas);
          conflitoAberto = false;
          aplicarConciliado(m.estado, resposta.rev, m.automaticos.length);
        },
        aoCancelar: function () {
          estadoVira("conflito");
          global.RAMAUI.avisoAtencao(
            "Conflito guardado. Nada foi perdido — resolva para voltar a salvar.",
            { acao: { rotulo: "Resolver", aoClicar: function () { conciliar(resposta, instantaneo); } } }
          );
        },
      });
    }

    function aplicarConciliado(estado, novaRev, quantosAutomaticos) {
      rev = U.inteiro(novaRev, rev);
      if (o.aplicar) o.aplicar(estado, rev);
      base = U.copiar(estado);

      conciliacoes++;
      if (conciliacoes > MAX_CONCILIACOES) {
        conflitoAberto = true;
        estadoVira("conflito");
        global.RAMAUI.avisoAtencao(
          "Este registro continua sendo alterado em outro aparelho. Confira antes de salvar de novo."
        );
        return;
      }

      if (quantosAutomaticos) {
        global.RAMAUI.aviso(
          quantosAutomaticos + " alteração(ões) do outro aparelho foram juntadas automaticamente."
        );
      }

      /* Sobe o resultado da conciliação, fora da pilha do envio atual. */
      conflitoAberto = false;
      pendente = true;
      estadoVira("salvando");
      clearTimeout(timer);
      timer = setTimeout(enviar, 0);
    }

    function estadoVira(nome) { if (o.indicador) o.indicador.definir(nome); }

    /* A rede voltou: quem estava esperando sobe agora, sem esperar o
       fim do backoff. */
    function aoVoltarAConexao() {
      if (pendente && !emVoo && !travado && !conflitoAberto) {
        tentativa = 0;
        clearTimeout(timer);
        timer = setTimeout(enviar, 200);
      }
    }

    global.addEventListener("online", aoVoltarAConexao);

    /* Fechar a aba com trabalho por enviar pede confirmação. O
       navegador só permite isso a partir de uma interação real da
       pessoa, e é justamente o caso. */
    function aoSair(ev) {
      if (!pendente && !emVoo) return;
      ev.preventDefault();
      ev.returnValue = "";
      return "";
    }

    global.addEventListener("beforeunload", aoSair);

    /* Trocar de aba ou minimizar é o momento mais provável de a pessoa
       largar o aparelho. Sobe o que estiver pendente. */
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden" && pendente && !emVoo) agora();
    });

    return {
      alterou: alterou,
      agora: agora,
      definirBase: definirBase,
      revisao: revisaoAtual,
      temPendencia: function () { return pendente || emVoo; },
      emConflito: function () { return conflitoAberto; },
      travar: function () { travado = true; clearTimeout(timer); },
      parar: function () {
        clearTimeout(timer);
        global.removeEventListener("online", aoVoltarAConexao);
        global.removeEventListener("beforeunload", aoSair);
        if (o.indicador) o.indicador.parar();
      },
    };
  }

  global.RAMASalvador = { criar: criar };
})(window);
