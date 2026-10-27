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

   A RESPOSTA QUE SE PERDEU (v2.15)
   ---------------------------------------------------------------------
   Cada gravação leva um id de operação. Quando ela falha no caminho —
   sem rede, prazo estourado, servidor que tropeçou —, o que volta a
   ser enviado é o MESMO pedido: mesma ficha, mesma revisão, mesmo id.
   Se o servidor tinha gravado e só a resposta se perdeu, é pelo id que
   ele reconhece a repetição e responde que deu certo — em vez de
   aplicar de novo ou de acusar um conflito com a própria gravação. O
   que mudou na tela nesse meio-tempo sobe no pedido seguinte.

   AGRUPAR SEM ADIAR PARA SEMPRE (v2.46)
   ---------------------------------------------------------------------
   A espera junta alterações seguidas numa gravação só — a ficha inteira
   vai de uma vez, então três toques no PV viram um envio com o valor
   final, e dois gastos registrados viram um envio com os DOIS registros
   (nada se funde: o que se junta é o momento de enviar). Medido com
   sequências reproduzíveis (testes/medir-salvamento.js), 800 ms juntou
   bem mais do que 400 sem atraso que se perceba ao fechar uma janela ou
   mudar de aba (que mandam na hora). E a espera tem um PRAZO MÁXIMO:
   digitar sem parar não adia o envio indefinidamente — passado o prazo
   desde a primeira alteração pendente, ela sobe.

   Antes de enviar, o que vai é comparado com o que o servidor já
   confirmou, sem `atualizadoEm` (muda a cada toque e o servidor regrava):
   igual, não há o que gravar — volta a "Salvo" sem viagem. A mesma
   serialização serve de cópia do que vai, no lugar de outra cópia.

   O que pede confirmação na hora (Salvar agora, sair da página, trocar
   de aba, aplicar um tema) continua chamando agora(), que não espera.

   O QUE REPETIR NÃO RESOLVE
   ---------------------------------------------------------------------
   Ficha acima do limite total, versão guardada que não se monta: tentar
   de novo daria a mesma resposta para sempre. O salvador para de
   insistir sozinho, mantém tudo o que está na tela como pendente e
   entrega o motivo a quem chamou, que mostra a saída (exportar a
   ficha). "Salvar agora" tenta outra vez.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;

  /* Depois de quatro conciliações seguidas, alguém do outro lado está
     digitando ao vivo no mesmo registro. Insistir vira briga de
     gravação; melhor parar e deixar a pessoa olhar. */
  var MAX_CONCILIACOES = 4;

  var ESPERA_MAXIMA = 20000;

  /* Variação aleatória na espera entre tentativas.

     Com uma pessoa só, esperar 1.500 ms, depois 3.000, depois 4.500 é
     tão bom quanto qualquer coisa. Com vinte fichas abertas na mesma
     mesa e um tropeço do servidor, é diferente: todas as vinte
     recomeçam no mesmo instante e refazem a rajada que causou a falha.

     A janela desfaz o alinhamento sem atrasar ninguém de verdade. */
  var JANELA_ALEATORIA = 700;

  function esperaDaTentativa(tentativa) {
    var base = Math.min(ESPERA_MAXIMA, 1500 * tentativa);
    return base + Math.floor(Math.random() * JANELA_ALEATORIA);
  }

  /* Respostas que repetir sozinho não muda. `dados_grandes` só chega numa
     ficha quando o servidor ainda é anterior à v2.15. */
  var ERROS_QUE_PARAM = {
    ficha_grande_demais: true,
    ficha_ilegivel: true,
    dados_grandes: true,
    /* Sem permissão (v2.44): o acesso de Editor foi rebaixado ou retirado,
       ou a ficha foi excluída. Insistir não devolve o acesso — e mandar o
       rascunho para a original depois de revogado é justamente o que não
       pode acontecer. Tudo continua pendente na tela. */
    sem_permissao: true,
    nao_encontrado: true,
  };

  /* O texto comparável de uma ficha: a serialização sem os campos que
     não são conteúdo (`atualizadoEm`). Serve de cópia também. */
  function textoComparavel(estado, ignorar) {
    if (!ignorar || !ignorar.length || !estado || typeof estado !== "object") return JSON.stringify(estado);
    var raso = Object.assign({}, estado);
    ignorar.forEach(function (k) { delete raso[k]; });
    return JSON.stringify(raso);
  }

  function novaOperacao() {
    return global.RAMAApi && global.RAMAApi.novaOperacao
      ? global.RAMAApi.novaOperacao()
      : "op-" + U.uuid();
  }

  /* criar({
       indicador,     objeto de RAMAUI.indicador
       instantaneo(), devolve o que deve ser gravado, já copiado
       enviar(dados, rev, operacaoId), faz a chamada e devolve a
                      resposta da API. O id é o mesmo quando o pedido
                      é repetido.
       aplicar(estado, rev), coloca o resultado da conciliação na tela
       esquema,       para o RAMASync
       aoSalvar(rev)  opcional
       aoErroPermanente(resposta)  opcional: o servidor recusou por um
                      motivo que repetir não muda (ver ERROS_QUE_PARAM)
     }) */
  function criar(opcoes) {
    var o = opcoes || {};
    var cfg = global.RAMA_CONFIG || {};
    var espera = o.espera || cfg.DEBOUNCE_MS || 800;
    /* O prazo máximo desde a primeira alteração pendente (v2.46). */
    var esperaMaxima = o.esperaMaxima || cfg.DEBOUNCE_MAXIMO_MS || 4000;
    /* Campos que não contam como mudança de conteúdo. */
    var ignorar = o.ignorarNaComparacao || [];
    var med = function () { return global.RAMAMedicao || null; };

    var rev = 0;
    var base = null;          // o último estado que o servidor confirmou
    /* O texto comparável do que o servidor TEM (v2.46). Na conciliação a
       base vira o estado mesclado — que o servidor ainda não tem —, então
       este texto é guardado à parte. */
    var textoConfirmado = null;
    /* Quando a primeira alteração ainda pendente aconteceu: é dela que o
       prazo máximo conta. */
    var pendenteDesde = 0;
    var pendente = false;
    var emVoo = false;
    var travado = false;
    var conflitoAberto = false;
    var tentativa = 0;
    var conciliacoes = 0;
    var timer = null;

    /* O pedido que falhou no caminho e vai de novo, igual. */
    var repeticao = null;
    /* Houve alteração depois do instantâneo que está voando ou esperando
       para ser repetido? Então há mais a enviar depois dele. */
    var novidades = false;
    /* A resposta de um erro que repetir sozinho não resolve. */
    var bloqueio = null;

    function definirBase(estado, novaRev) {
      base = U.copiar(estado);
      textoConfirmado = textoComparavel(estado, ignorar);
      rev = U.inteiro(novaRev, 0);
    }

    function agoraMs() { return Date.now(); }

    /* A espera desta vez: a de sempre, mas nunca além do prazo máximo
       contado da primeira alteração pendente. */
    function esperaDaVez() {
      if (!pendenteDesde) return espera;
      var restante = pendenteDesde + esperaMaxima - agoraMs();
      return Math.max(0, Math.min(espera, restante));
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
      if (!pendenteDesde) pendenteDesde = agoraMs();
      if (emVoo || repeticao) novidades = true;

      /* Depois de um erro que repetir não resolve, cada tecla não vira
         um pedido: a alteração fica pendente e sobe no "Salvar agora". */
      if (bloqueio) { estadoVira("erro"); return; }

      estadoVira(tentativa ? "offline" : "pendente");
      /* Com uma gravação voando, o envio seguinte sai quando ela voltar. */
      if (emVoo) return;
      clearTimeout(timer);
      timer = setTimeout(enviar, esperaDaVez());
    }

    /* Sobe agora, sem esperar o debounce. Para sair da página ou trocar
       de aba sem deixar nada para trás — e para tentar de novo depois de
       um erro que parou as tentativas automáticas. */
    function agora() {
      clearTimeout(timer);
      bloqueio = null;
      return enviar();
    }

    async function enviar() {
      if (travado || emVoo || !pendente || conflitoAberto || bloqueio) return;

      /* Um pedido que falhou no caminho vai de novo IGUAL. Só sem ele é
         que se tira um instantâneo novo — cópia de verdade: se apontasse
         para o estado vivo, a BASE mudaria junto com a tela e deixaria
         de servir como ponto de partida da conciliação. */
      var envio = repeticao;
      repeticao = null;
      if (!envio) {
        var atual = o.instantaneo();
        var texto = textoComparavel(atual, ignorar);
        /* Nada de conteúdo mudou desde o que o servidor tem: não há o que
           gravar (v2.46). */
        if (texto === textoConfirmado) {
          pendente = false;
          pendenteDesde = 0;
          novidades = false;
          if (med()) med().contar("salvamento.poupado");
          if (o.indicador) o.indicador.salvoAgora();
          return;
        }
        var copia = JSON.parse(texto);
        if (ignorar.length && atual && typeof atual === "object") {
          ignorar.forEach(function (k) { if (atual[k] !== undefined) copia[k] = atual[k]; });
        }
        envio = { dados: copia, texto: texto, rev: rev, operacaoId: novaOperacao() };
        novidades = false;
      }

      emVoo = true;
      pendente = false;
      pendenteDesde = 0;
      estadoVira("salvando");
      if (med()) med().contar("salvamento.enviado");

      var r;
      try {
        r = await o.enviar(envio.dados, envio.rev, envio.operacaoId);
      } catch (e) {
        r = { ok: false, erro: "sem_conexao" };
        console.error("[R.A.M.A. · salvar] exceção ao enviar", e);
      }

      emVoo = false;

      if (r && r.ok) {
        rev = U.inteiro(r.rev, envio.rev + 1);
        base = envio.dados;
        textoConfirmado = envio.texto !== undefined ? envio.texto : textoComparavel(envio.dados, ignorar);
        tentativa = 0;
        conciliacoes = 0;
        if (novidades) { pendente = true; if (!pendenteDesde) pendenteDesde = agoraMs(); }
        novidades = false;

        document.dispatchEvent(new CustomEvent("rama:atividade"));

        /* "Salvo" só vale se nada entrou na fila enquanto isto voava. O que
           entrou espera a sua vez — com o prazo máximo valendo. */
        if (pendente) { estadoVira("pendente"); clearTimeout(timer); timer = setTimeout(enviar, esperaDaVez()); }
        else if (o.indicador) o.indicador.salvoAgora();

        if (o.aoSalvar) o.aoSalvar(rev, envio.dados);
        return;
      }

      if (r && r.erro === "conflito") { conciliar(r, envio.dados); return; }

      if (r && global.RAMAApi.ehErroDeSessao(r.erro)) {
        travado = true;
        estadoVira("expirado");
        return;
      }

      /* Um erro que repetir não resolve: nada se perde — tudo continua
         pendente —, mas as tentativas automáticas param e quem chamou
         mostra o motivo e a saída. */
      if (r && ERROS_QUE_PARAM[r.erro]) {
        pendente = true;
        if (!pendenteDesde) pendenteDesde = agoraMs();
        bloqueio = r;
        tentativa = 0;
        clearTimeout(timer);
        estadoVira("erro");
        if (o.aoErroPermanente) o.aoErroPermanente(r);
        else global.RAMAUI.avisoErro(global.RAMAApi.recado(r));
        return;
      }

      /* Falha no caminho ou do servidor: o MESMO pedido volta, com espera
         crescente. Nada se perde. */
      repeticao = envio;
      pendente = true;
      if (!pendenteDesde) pendenteDesde = agoraMs();
      tentativa++;

      var semRede = r && (r.erro === "sem_conexao" || r.erro === "prazo");
      estadoVira(semRede ? "offline" : "erro");

      clearTimeout(timer);
      timer = setTimeout(enviar, esperaDaTentativa(tentativa));

      if (tentativa === 1) {
        global.RAMAUI.aviso(
          semRede
            ? "Sem conexão com o arquivo — as alterações continuam aqui e sobem sozinhas."
            : global.RAMAApi.recado(r) + " Vou tentar de novo.",
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

      /* O que o servidor tem agora é o estado dele (v2.46): o envio da
         conciliação é comparado com isto. */
      textoConfirmado = textoComparavel(servidor, ignorar);
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
      if (!pendenteDesde) pendenteDesde = agoraMs();
      estadoVira("salvando");
      clearTimeout(timer);
      timer = setTimeout(enviar, 0);
    }

    function estadoVira(nome) { if (o.indicador) o.indicador.definir(nome); }

    /* A rede voltou: quem estava esperando sobe agora, sem esperar o
       fim do backoff. */
    function aoVoltarAConexao() {
      if (pendente && !emVoo && !travado && !conflitoAberto && !bloqueio) {
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
      bloqueio: function () { return bloqueio; },
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
