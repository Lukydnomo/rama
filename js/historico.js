/* =====================================================================
   R.A.M.A. — histórico de rolagens
   ---------------------------------------------------------------------
   O ponto ÚNICO por onde uma rolagem vira linha no histórico da
   campanha.

   O sistema já tinha um funil para MOSTRAR rolagens: tudo o que rola
   passa por RAMARolagens.mostrar(). Este módulo se pendura nesse mesmo
   funil, e é por isso que ficha-pericias.js, ficha-geral.js e
   ficha-inventario.js não têm — e não devem ter — uma linha sequer de
   código de histórico. Espalhar isso por quatro arquivos garantiria que
   o quinto esquecesse.

       ação rolável
             ↓
       motor de dados (rola UMA vez)
             ↓
       resultado ──┬── RAMARolagens.mostrar()  → aparece na tela
                   └── RAMAHistorico.registrar() → sobe, se houver campanha

   ---------------------------------------------------------------------
   A ROLAGEM ACONTECE UMA VEZ SÓ
   ---------------------------------------------------------------------

   O resultado já existe quando chega aqui. Se a gravação falhar, o que
   se repete é o ENVIO — nunca o sorteio. O número que a mesa viu na
   tela é o número que vai para o histórico, aconteça o que acontecer
   com a rede.

   E cada rolagem carrega um id gerado no momento em que ela aconteceu.
   Esse id acompanha todas as retentativas, e é ele que faz o servidor
   reconhecer a segunda chegada como repetição em vez de criar uma
   segunda linha. Gerar um id novo ao repetir seria o mesmo que rolar de
   novo, com um disfarce.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;

  /* Onde estamos. Preenchido pela ficha quando ela sabe a que campanha
     o personagem pertence; vazio quando o personagem não está em mesa
     nenhuma — e aí nada é registrado. */
  var contexto = { campanhaId: null, personagemId: null };

  /* Envios que ainda não confirmaram. Cada um guarda o resultado
     PRONTO; nenhum guarda "como rolar de novo". */
  var fila = [];
  var enviando = false;
  var tentativas = 0;

  var ESPERAS = [1500, 4000, 10000, 20000];

  function configurar(dados) {
    contexto.campanhaId = (dados && dados.campanhaId) || null;
    contexto.personagemId = (dados && dados.personagemId) || null;
  }

  function emCampanha() { return !!contexto.campanhaId; }

  /* registrar(resultado, { tipo, nome, personagemId })

     `resultado` é o que o motor devolveu, inteiro: expressão, dados
     sorteados, natural, parcelas e total. Guardar tudo permite
     reconstruir na tela do histórico exatamente o que a mesa viu, em
     vez de um total sem procedência. */
  function registrar(resultado, opcoes) {
    if (!emCampanha() || !resultado) return null;

    var o = opcoes || {};

    var rolagem = {
      id: "rol-" + U.uuid(),
      personagemId: o.personagemId !== undefined ? o.personagemId : contexto.personagemId,
      tipo: o.tipo || resultado.tipo || "rolagem",
      nome: o.nome || resultado.nome || "Rolagem",
      dados: {
        expressao: resultado.expressao || "",
        rolagens: resultado.rolagens || [],
        natural: resultado.natural !== undefined ? resultado.natural : null,
        total: resultado.total !== undefined ? resultado.total : null,
        selecao: resultado.selecao || null,
        parcelas: resultado.parcelas || [],
        critico: !!o.critico,
      },
    };

    fila.push(rolagem);
    escoar();

    return rolagem.id;
  }

  async function escoar() {
    if (enviando || !fila.length) return;
    enviando = true;

    var rolagem = fila[0];
    var campanhaId = contexto.campanhaId;

    var r;
    try {
      r = await global.RAMAApi.registrarRolagem(campanhaId, rolagem);
    } catch (e) {
      r = { ok: false, erro: "sem_conexao" };
    }

    enviando = false;

    if (r && r.ok) {
      fila.shift();
      tentativas = 0;
      if (fila.length) escoar();
      return;
    }

    /* Sessão morta ou campanha que sumiu: insistir não resolve, e a
       fila cresceria para sempre. O resultado continua na tela — ele
       só não entrou no histórico. */
    if (r && (global.RAMAApi.ehErroDeSessao(r.erro) ||
              r.erro === "nao_encontrado" || r.erro === "sem_permissao" ||
              r.erro === "dados_invalidos")) {
      console.warn("[R.A.M.A. · histórico] rolagem descartada:", r.erro, rolagem.id);
      fila.shift();
      tentativas = 0;
      if (fila.length) escoar();
      return;
    }

    /* Falha passageira. Espera e tenta o MESMO envio, com o MESMO id. */
    tentativas++;
    var espera = ESPERAS[Math.min(tentativas - 1, ESPERAS.length - 1)];

    if (tentativas === 1) {
      console.info("[R.A.M.A. · histórico] envio adiado; o resultado continua na tela");
    }

    setTimeout(escoar, espera);
  }

  /* A rede voltou: escoa o que ficou para trás. */
  global.addEventListener("online", function () {
    tentativas = 0;
    escoar();
  });

  global.RAMAHistorico = {
    configurar: configurar,
    emCampanha: emCampanha,
    registrar: registrar,
    pendentes: function () { return fila.length; },
    contexto: function () { return { campanhaId: contexto.campanhaId, personagemId: contexto.personagemId }; },
  };
})(window);
