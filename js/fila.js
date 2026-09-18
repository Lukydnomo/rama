/* =====================================================================
   R.A.M.A. — fila de gravação por entidade
   ---------------------------------------------------------------------
   Um lugar só para o problema de "a pessoa clicou rápido demais".

   O CASO QUE DEU ORIGEM A ISTO
   ---------------------------------------------------------------------

   O painel do mestre tem um [−] ao lado da vida de cada personagem. Ele
   tira quatro pontos clicando quatro vezes. Antes, cada clique virava
   uma requisição imediata — e as quatro saíam com a MESMA revisão, que
   era a que a listagem tinha trazido.

   O que acontecia: a primeira chegava, gravava e a revisão do servidor
   subia. As outras três chegavam com a revisão vencida e voltavam como
   conflito. A tela recarregava, o número piscava, e o mestre via 19 em
   vez de 16 sem entender por quê.

   Nada disso era erro de segurança nem de dados — o `rev` fez
   exatamente o trabalho dele. Era a interface pedindo quatro coisas
   quando queria uma.

   O QUE ESTA FILA FAZ
   ---------------------------------------------------------------------

     1. junta. Cliques seguidos na mesma coisa viram um envio só, com o
        último valor. Quatro cliques no [−] querem dizer "fica em 16",
        e um pedido basta para isso.

     2. serializa. Uma gravação por entidade de cada vez. O que chegar
        durante o voo espera, e vai depois com a revisão atualizada.

     3. separa entidades. A vida do Ana e a vida do Bruno são filas
        diferentes e não esperam uma pela outra.

   POR QUE JUNTAR AQUI É SEGURO, E ONDE NÃO SERIA
   ---------------------------------------------------------------------

   Porque o pedido carrega o valor FINAL, não a diferença. "Ponha em
   16" aplicado duas vezes deixa 16; "tire 1" aplicado duas vezes tira
   2. Juntar, repetir e reordenar são todos inofensivos quando a
   operação diz onde chegar em vez de quanto andar — e é por isso que a
   API do R.A.M.A. manda valor absoluto.

   Se algum dia existir uma operação de incremento de verdade, ela NÃO
   pode passar por aqui sem uma chave de idempotência própria, do jeito
   que as rolagens têm.

   A REPETIÇÃO É DO MESMO PEDIDO (v2.15)
   ---------------------------------------------------------------------

   Quando um envio falha no caminho, o que volta é o MESMO item — com o
   mesmo id de operação, se quem enviou o pôs no item. Se o servidor
   tinha gravado e só a resposta se perdeu, ele reconhece o id e
   responde que deu certo, em vez de acusar conflito com o próprio
   ajuste. Um clique que chegou enquanto isso NÃO é descartado: ele
   espera a repetição e sobe depois, com a revisão que ela trouxer.

   O QUE ESTA FILA NÃO É
   ---------------------------------------------------------------------

   Não é um cache, não guarda nada em disco e não sobrevive a um
   recarregamento da página. É uma fila em memória para o intervalo
   entre o clique e a resposta.
   ===================================================================== */

(function (global) {
  "use strict";

  var ESPERA_PADRAO = 280;
  var MAX_TENTATIVAS = 3;
  var JANELA_ALEATORIA = 400;

  /* criar({
       espera,        ms de agrupamento (padrão 280)
       enviar(item),  faz a chamada e devolve a resposta da API
       aoConflito(item)  opcional. Devolve a revisão nova, ou null para
                         desistir. Sem ela, conflito é tratado como erro.
       aoEstado(chave, estado, item)  opcional. "pendente" | "salvando" |
                         "salvo" | "erro" | "conflito"
     }) */
  function criar(opcoes) {
    var o = opcoes || {};
    var espera = o.espera === undefined ? ESPERA_PADRAO : o.espera;

    /* Uma entrada por entidade. `pendente` é o que ainda não subiu;
       `voando` é verdade enquanto a resposta não voltou. */
    var filas = {};

    function entrada(chave) {
      if (!filas[chave]) filas[chave] = { pendente: null, repetir: null, voando: false, timer: null, tentativa: 0 };
      return filas[chave];
    }

    function avisar(chave, estado, item, resposta) {
      if (o.aoEstado) o.aoEstado(chave, estado, item, resposta);
    }

    /* O ponto de entrada. Chamado a cada clique, sem custo de rede. */
    function definir(chave, item) {
      var e = entrada(chave);

      /* O último valor vence. Guardar os anteriores só serviria para
         mandar ao servidor estados pelos quais a tela já passou. */
      e.pendente = item;
      avisar(chave, "pendente", item);

      clearTimeout(e.timer);
      e.timer = setTimeout(function () { correr(chave); }, espera);
    }

    /* Sobe agora o que estiver esperando, sem o agrupamento. */
    function agora(chave) {
      var e = entrada(chave);
      clearTimeout(e.timer);
      return correr(chave);
    }

    async function correr(chave) {
      var e = entrada(chave);

      if (e.voando || (!e.pendente && !e.repetir)) return;

      /* O que falhou no caminho vai antes, igual; o clique mais novo, depois. */
      var item;
      if (e.repetir) { item = e.repetir; e.repetir = null; }
      else { item = e.pendente; e.pendente = null; }
      e.voando = true;
      avisar(chave, "salvando", item);

      var r;
      try {
        r = await o.enviar(item);
      } catch (erro) {
        r = { ok: false, erro: "sem_conexao" };
        console.error("[R.A.M.A. · fila] exceção ao enviar", erro);
      }

      e.voando = false;

      if (r && r.ok) {
        e.tentativa = 0;
        avisar(chave, "salvo", item, r);
        if (o.aoConcluir) o.aoConcluir(chave, item, r);

        /* Chegou coisa nova durante o voo: sobe agora, já com a
           revisão que esta resposta trouxe. */
        if (e.pendente) correr(chave);
        return;
      }

      if (r && r.erro === "conflito") {
        /* Alguém mais mexeu na mesma ficha. Não é caso de repetir com a
           mesma revisão — isso daria conflito de novo, para sempre. É
           caso de pegar a revisão nova e mandar o valor que esta tela
           quer, uma vez. */
        if (o.aoConflito && e.tentativa < MAX_TENTATIVAS) {
          e.tentativa++;
          var refeito = await o.aoConflito(item, r);
          if (refeito) {
            e.pendente = refeito;
            correr(chave);
            return;
          }
        }
        avisar(chave, "conflito", item, r);
        if (o.aoFalhar) o.aoFalhar(chave, item, r);
        return;
      }

      /* Falha passageira: volta a tentar, com espera crescente e
         variação aleatória — vinte fichas abertas na mesma mesa não
         podem recomeçar todas no mesmo instante. */
      if (e.tentativa < MAX_TENTATIVAS && ehPassageiro(r)) {
        e.tentativa++;
        e.repetir = item;
        avisar(chave, "erro", item, r);
        clearTimeout(e.timer);
        e.timer = setTimeout(function () { correr(chave); },
          800 * e.tentativa + Math.floor(Math.random() * JANELA_ALEATORIA));
        return;
      }

      e.tentativa = 0;
      avisar(chave, "erro", item, r);
      if (o.aoFalhar) o.aoFalhar(chave, item, r);
    }

    /* Repetir só faz sentido para o que pode dar certo depois. Sessão
       vencida, permissão negada e dados recusados são respostas
       definitivas: insistir não muda nada e esconde o motivo. */
    function ehPassageiro(r) {
      var erro = r && r.erro;
      return erro === "sem_conexao" || erro === "prazo" ||
             erro === "servidor_falhou" || erro === "ocupado" ||
             erro === "armazenamento_falhou";
    }

    function temPendencia() {
      return Object.keys(filas).some(function (k) {
        return filas[k].pendente || filas[k].repetir || filas[k].voando;
      });
    }

    function parar() {
      Object.keys(filas).forEach(function (k) { clearTimeout(filas[k].timer); });
      filas = {};
    }

    return {
      definir: definir,
      agora: agora,
      temPendencia: temPendencia,
      parar: parar,
    };
  }

  global.RAMAFila = { criar: criar };
})(window);
