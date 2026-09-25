/* =====================================================================
   R.A.M.A. — combate · fila de alterações
   =====================================================================
   Uma fila por combate, entre a tela e atualizar_combate.

   ---------------------------------------------------------------------
   O DEFEITO QUE ELA RESOLVE
   ---------------------------------------------------------------------

   Antes, cada iniciativa digitada disparava a gravação do combate
   INTEIRO meio segundo depois, com a revisão que a tela conhecia. Com o
   mestre digitando três iniciativas num ritmo normal, duas gravações
   saíam quase juntas com a MESMA revisão: a primeira passava, a segunda
   voltava como conflito, e a tela recarregava tudo — engolindo a
   terceira iniciativa, que ainda estava sendo digitada. Iniciar e
   encerrar ainda agendavam um recarregamento "700 ms depois", que podia
   chegar antes da gravação terminar e mostrar o combate velho.

   Nada disso era proteção demais: era a tela brigando com ela mesma.

   ---------------------------------------------------------------------
   COMO ELA TRABALHA
   ---------------------------------------------------------------------

   CAMPOS e OPERAÇÕES PONTUAIS são coisas diferentes.

     campos      iniciativa e status de criatura. Aceitam várias
                 alterações seguidas: vale o ÚLTIMO valor de cada campo.
                 Ficam esperando ~5 s sem nova iniciativa (~1,2 s para
                 status) e sobem juntos, num lote.
     pontuais    turno, iniciar, encerrar, acrescentar, remover,
                 renomear, quem pode ver. Sobem logo, em ordem.

   Enquanto espera, a tela já mostra os números novos: a VISTA é o
   estado confirmado pelo servidor com o que está no ar e o que está
   pendente aplicado por cima (js/combate-turnos.js).

   UM LOTE NO AR POR VEZ. O que for editado durante o envio forma o
   próximo lote, que só sai com a revisão que a resposta trouxe. Duas
   gravações da mesma fila nunca saem com a mesma revisão.

   ---------------------------------------------------------------------
   QUANDO DÁ ERRADO
   ---------------------------------------------------------------------

   Rede (sem conexão, prazo, servidor ocupado): o MESMO lote é repetido,
   com o MESMO opId e a MESMA revisão, com espera crescente. Se a
   primeira chegada tinha entrado, o servidor reconhece o opId e
   responde que já aplicou — nada é aplicado duas vezes. Nada pendente
   se perde enquanto isso.

   Conflito (outro mestre, outra aba, outro aparelho mudou o combate): o
   servidor manda o estado atual. Cada alteração é comparada com o valor
   que ela tinha ANTES de ser feita:

     o servidor ainda tem o valor de antes    independente: reaplicada
     o servidor já tem o valor desejado       descartada, não faz falta
     o servidor tem OUTRO valor               a outra pessoa mexeu no
                                              mesmo campo: a pessoa
                                              decide (aoConflito)

   Turno, iniciar e encerrar só são reaplicados se o turno e o estado
   ainda forem os de quando o clique aconteceu; senão caem com aviso —
   avançar um turno que outro mestre já avançou pularia alguém.

   Atualização vinda da sincronização (receberRemoto) passa pela mesma
   comparação ANTES de o próximo lote sair. Sem isso, o lote seguinte
   levaria a revisão nova e sobrescreveria em silêncio a mudança que
   acabou de chegar.

   Nada disto recarrega a página, e nenhum timer fixo substitui esperar a
   resposta.
   ===================================================================== */

(function (global) {
  "use strict";

  var ESPERA_INICIATIVA = 5000;
  var ESPERA_STATUS = 1200;
  var ESPERAS_DE_REDE = [2000, 5000, 10000, 20000, 30000];
  var MAX_TENTATIVAS_DE_REDE = 6;
  var MAX_CONFLITOS_SEGUIDOS = 5;
  var JANELA_ALEATORIA = 600;

  var PASSAGEIROS = { sem_conexao: true, prazo: true, servidor_falhou: true, ocupado: true, sem_resposta: true };

  function copiar(v) { return v === undefined || v === null ? v : JSON.parse(JSON.stringify(v)); }

  function T() { return global.RAMACombateTurnos; }

  function relogioPadrao() {
    return {
      definir: function (fn, ms) { return setTimeout(fn, ms); },
      limpar: function (id) { clearTimeout(id); },
      agora: function () { return Date.now(); },
    };
  }

  function acharParticipante(combate, id) {
    var lista = (combate && combate.participantes) || [];
    for (var i = 0; i < lista.length; i++) {
      if (String(lista[i].id) === String(id)) return lista[i];
    }
    return null;
  }

  function chaveDoCampo(tipo, participanteId, statusId) {
    return tipo + "|" + participanteId + "|" + (statusId || "");
  }

  /* O valor de um campo num estado de combate; undefined se o
     participante (ou o status) não existe ali. */
  function valorDoCampo(combate, entrada) {
    var p = acharParticipante(combate, entrada.participanteId);
    if (!p) return undefined;
    if (entrada.tipo === "iniciativa") return Math.round(Number(p.ordem) || 0);
    var lista = p.snapshot && Array.isArray(p.snapshot.status) ? p.snapshot.status : [];
    for (var i = 0; i < lista.length; i++) {
      if (String(lista[i].id) === String(entrada.statusId)) return Math.round(Number(lista[i].atual) || 0);
    }
    return undefined;
  }

  function rotuloDoCampo(combate, entrada) {
    var p = acharParticipante(combate, entrada.participanteId);
    var nome = p ? p.nome : "participante";
    if (entrada.tipo === "iniciativa") return "Iniciativa de " + nome;
    var lista = p && p.snapshot && Array.isArray(p.snapshot.status) ? p.snapshot.status : [];
    var s = lista.filter(function (x) { return String(x.id) === String(entrada.statusId); })[0];
    return (s ? s.nome : "Status") + " de " + nome;
  }

  /* Participantes de uma resposta de operação vêm sem os recursos de
     personagem (eles não mudam por operação de combate): ficam os que o
     estado anterior tinha. */
  function comRecursos(novo, anterior) {
    if (!novo || !anterior) return novo;
    (novo.participantes || []).forEach(function (p) {
      if (p.recursos !== undefined || p.tipo !== "personagem") return;
      var antes = acharParticipante(anterior, p.id);
      if (antes && antes.recursos !== undefined) {
        p.recursos = copiar(antes.recursos);
        if (antes.recursosPendentes) p.recursosPendentes = true;
        /* As condições (v2.19) vêm junto dos recursos, na listagem. */
        if (antes.condicoes !== undefined) p.condicoes = copiar(antes.condicoes);
      }
    });
    return novo;
  }

  function mesmaLista(a, b) {
    return JSON.stringify((a || []).map(String).sort()) === JSON.stringify((b || []).map(String).sort());
  }

  /* criar({
       combate,            estado confirmado inicial (com rev)
       enviar(rev, opId, ops) → Promise<resposta da API>
       buscar() → Promise<{ ok, dados: combate }>   (reserva para conflito)
       aoMudar(fila)       a vista ou o estado da fila mudou
       aoConflito(lista) → Promise<{ [chave]: "minha" | "deles" }>
       aoAviso(texto, tipo)
       aoRecusa(resposta)  o servidor recusou de vez (permissão, dados)
       esperaIniciativa, esperaStatus, relogio, gerarId
     }) */
  function criar(opcoes) {
    var o = opcoes || {};
    var relogio = o.relogio || relogioPadrao();
    var gerarId = o.gerarId || function () {
      var u = global.RAMAUtil && global.RAMAUtil.uuid ? global.RAMAUtil.uuid() : String(Math.random()).slice(2) + String(Date.now());
      return "lote-" + String(u).replace(/[^A-Za-z0-9_-]/g, "");
    };
    var esperaIniciativa = o.esperaIniciativa !== undefined ? o.esperaIniciativa : ESPERA_INICIATIVA;
    var esperaStatus = o.esperaStatus !== undefined ? o.esperaStatus : ESPERA_STATUS;

    var confirmado = copiar(o.combate) || { participantes: [], rev: 0 };
    confirmado.rev = Number(confirmado.rev) || 0;

    var campos = {};        // chave → { tipo, participanteId, statusId, valor, base }
    var pontuais = [];      // { op, base, resolver }
    var voo = null;         // { opId, rev, ops, campos, pontuais, tentativas }
    var timer = null;
    var programadoPara = 0;
    var timerDeRede = null;
    var aguardandoVoo = false;
    var erro = null;
    var decidindo = false;
    var remotoGuardado = null;
    var conflitosSeguidos = 0;
    var parado = false;

    function mudou() { if (o.aoMudar) o.aoMudar(api); }
    function avisar(texto, tipo) { if (o.aoAviso) o.aoAviso(texto, tipo || "atencao"); }

    function opsDosCampos() {
      return Object.keys(campos).map(function (k) {
        var c = campos[k];
        return c.tipo === "iniciativa"
          ? { tipo: "iniciativa", participanteId: c.participanteId, valor: c.valor }
          : { tipo: "criatura_status", participanteId: c.participanteId, statusId: c.statusId, valor: c.valor };
      });
    }

    function opsNoAr() { return voo ? voo.ops : []; }

    /* O estado com o que já saiu, sem o que está esperando. */
    function vistaSemPendentes() { return T().aplicar(confirmado, opsNoAr()); }

    function vista() {
      var ops = opsNoAr().concat(opsDosCampos()).concat(pontuais.map(function (p) { return p.op; }));
      return T().aplicar(confirmado, ops);
    }

    /* =================================================================
       ENTRADA
       ================================================================= */

    function definirCampo(tipo, participanteId, statusId, valor) {
      if (parado) return false;
      var n = Math.round(Number(valor));
      if (!Number.isFinite(n)) return false;

      var chave = chaveDoCampo(tipo, participanteId, statusId);
      var entrada = { tipo: tipo, participanteId: String(participanteId), statusId: statusId ? String(statusId) : null };
      var existente = campos[chave];
      var base = existente ? existente.base : valorDoCampo(vistaSemPendentes(), entrada);
      if (base === undefined) return false;

      if (n === base) delete campos[chave];
      else campos[chave] = Object.assign(entrada, { valor: n, base: base });

      programar();
      mudou();
      return true;
    }

    function baseDaOperacao(op, estado) {
      if (op.tipo === "turno") return { rodada: estado.turno.rodada, ativoId: estado.turno.ativoId };
      if (op.tipo === "estado") return estado.estado;
      if (op.tipo === "renomear") return estado.nome;
      if (op.tipo === "visiveis") return (estado.visiveis || []).slice();
      return null;
    }

    /* Uma operação pontual. A promessa resolve quando o servidor confirma
       o lote que a levou ({ ok: true }) ou quando ela cai ({ ok: false }). */
    function enfileirar(op) {
      return new Promise(function (resolver) {
        if (parado) { resolver({ ok: false, erro: "parado" }); return; }
        var copia = copiar(op);
        var base = baseDaOperacao(copia, vista());

        /* Tirar alguém torna inútil o que estava pendente dele. */
        if (copia.tipo === "remover") {
          Object.keys(campos).forEach(function (k) {
            if (String(campos[k].participanteId) === String(copia.participanteId)) delete campos[k];
          });
        }

        pontuais.push({ op: copia, base: base, resolver: resolver });
        programar();
        mudou();
      });
    }

    function programar() {
      if (parado) return;
      relogio.limpar(timer);
      timer = null;
      programadoPara = 0;

      var chaves = Object.keys(campos);
      if (!chaves.length && !pontuais.length) return;

      var temIniciativa = chaves.some(function (k) { return campos[k].tipo === "iniciativa"; });
      var espera = pontuais.length ? 0 : (temIniciativa ? esperaIniciativa : esperaStatus);

      programadoPara = relogio.agora() + espera;
      timer = relogio.definir(function () {
        timer = null;
        programadoPara = 0;
        enviar();
      }, espera);
    }

    function salvarAgora() {
      relogio.limpar(timer);
      timer = null;
      programadoPara = 0;
      if (voo && erro && erro.tipo === "rede") { tentarAgora(); return; }
      enviar();
    }

    /* =================================================================
       ENVIO
       ================================================================= */

    function enviar() {
      if (parado || decidindo) return;
      if (voo) { aguardandoVoo = true; return; }

      var enviadosCampos = Object.keys(campos).map(function (k) { return campos[k]; });
      var enviadosPontuais = pontuais.splice(0, pontuais.length);
      if (!enviadosCampos.length && !enviadosPontuais.length) return;

      var ops = opsDosCampos().concat(enviadosPontuais.map(function (p) { return p.op; }));
      campos = {};
      aguardandoVoo = false;

      voo = {
        opId: gerarId(),
        rev: confirmado.rev,
        ops: ops,
        campos: enviadosCampos,
        pontuais: enviadosPontuais,
        tentativas: 0,
      };

      relogio.limpar(timer);
      timer = null;
      programadoPara = 0;
      mudou();
      disparar();
    }

    async function disparar() {
      var atual = voo;
      if (!atual) return;

      var r;
      try {
        r = await o.enviar(atual.rev, atual.opId, atual.ops);
      } catch (e) {
        r = { ok: false, erro: "sem_conexao" };
      }

      if (parado || voo !== atual) return;

      if (r && r.ok) { sucesso(atual, r); return; }
      if (r && r.erro === "conflito") { await conflito(atual, r); return; }
      if (!r || PASSAGEIROS[r.erro]) { falhaDeRede(atual, r || { ok: false, erro: "sem_resposta" }); return; }
      await recusado(atual, r);
    }

    function sucesso(atual, r) {
      var anterior = confirmado;
      var novo = r.dados ? copiar(r.dados) : T().aplicar(anterior, atual.ops);
      confirmado = comRecursos(novo, anterior);
      confirmado.rev = Number(r.rev) || confirmado.rev;

      voo = null;
      erro = null;
      conflitosSeguidos = 0;

      atual.pontuais.forEach(function (p) { if (p.resolver) p.resolver({ ok: true, resposta: r }); });

      (r.avisos || []).forEach(function (a) {
        if (a && a.aviso === "inicio") avisar("Este já é o primeiro turno do combate — não há para onde voltar.", "info");
      });

      var remoto = remotoGuardado;
      remotoGuardado = null;
      if (remoto && Number(remoto.rev) > confirmado.rev) aplicarRemoto(remoto);

      if (pontuais.length || aguardandoVoo) enviar();
      else if (Object.keys(campos).length && !timer) programar();

      mudou();
    }

    function falhaDeRede(atual, r) {
      atual.tentativas++;
      erro = { tipo: "rede", erro: r.erro, tentativas: atual.tentativas, parado: false, proximaTentativa: 0 };

      if (atual.tentativas >= MAX_TENTATIVAS_DE_REDE) {
        /* Parou de insistir sozinha; o lote continua guardado para
           "Tentar agora" ou para a volta da conexão. */
        erro.parado = true;
        mudou();
        return;
      }

      var espera = ESPERAS_DE_REDE[Math.min(atual.tentativas - 1, ESPERAS_DE_REDE.length - 1)] +
        Math.floor(Math.random() * JANELA_ALEATORIA);
      erro.proximaTentativa = relogio.agora() + espera;
      relogio.limpar(timerDeRede);
      timerDeRede = relogio.definir(function () {
        timerDeRede = null;
        if (voo === atual) disparar();
      }, espera);
      mudou();
    }

    function tentarAgora() {
      if (!voo) { enviar(); return; }
      relogio.limpar(timerDeRede);
      timerDeRede = null;
      if (erro && erro.tipo === "rede") {
        erro.parado = false;
        erro.proximaTentativa = 0;
      }
      mudou();
      disparar();
    }

    async function recusado(atual, r) {
      voo = null;
      erro = { tipo: "recusado", erro: r && r.erro };
      atual.pontuais.forEach(function (p) { if (p.resolver) p.resolver({ ok: false, erro: r && r.erro }); });
      if (o.aoRecusa) o.aoRecusa(r);

      /* O lote recusado some; a tela volta a mostrar o que o servidor tem. */
      if (o.buscar && r && r.erro === "dados_invalidos") {
        var b = await o.buscar();
        if (b && b.ok && b.dados && !parado) confirmado = comRecursos(copiar(b.dados), confirmado);
      }
      mudou();
    }

    /* =================================================================
       CONCILIAÇÃO
       ================================================================= */

    async function conflito(atual, r) {
      conflitosSeguidos++;

      var servidor = r.dados ? copiar(r.dados) : null;
      if (!servidor && o.buscar) {
        var b = await o.buscar();
        servidor = b && b.ok && b.dados ? copiar(b.dados) : null;
      }
      if (parado) return;

      if (!servidor) {
        /* Sem o estado atual não dá para comparar nada: segura o lote e
           tenta de novo como falha de rede. */
        falhaDeRede(atual, { ok: false, erro: "servidor_falhou" });
        return;
      }

      servidor.rev = Number(servidor.rev) || Number(r.rev) || confirmado.rev;
      confirmado = comRecursos(servidor, confirmado);
      voo = null;

      var resultado = conciliar(confirmado, atual.campos, atual.pontuais);
      resultado.avisos.forEach(function (t) { avisar(t, "atencao"); });

      if (conflitosSeguidos > MAX_CONFLITOS_SEGUIDOS) {
        erro = { tipo: "instavel" };
        avisar("O combate continua sendo alterado em outro lugar. As suas alterações estão guardadas — confira e use \"Salvar agora\".", "atencao");
        mudou();
        return;
      }

      if (resultado.conflitos.length) await decidir(resultado.conflitos);
      if (parado) return;

      erro = null;
      mudou();
      enviar();
    }

    /* Compara com `servidor` o que está pendente (e o que tinha saído, se
       veio de um conflito). Recoloca na fila o que é independente, tira o
       que ficou sem efeito e devolve o que precisa de decisão. */
    function conciliar(servidor, camposEnviados, pontuaisEnviados) {
      var avisos = [];
      var conflitos = [];

      /* Campos: o que saiu e voltou, mais o que foi editado depois. O
         editado depois vale como valor; o que saiu dá a base. */
      var todos = {};
      (camposEnviados || []).forEach(function (c) { todos[chaveDoCampo(c.tipo, c.participanteId, c.statusId)] = copiar(c); });
      Object.keys(campos).forEach(function (k) {
        var novo = copiar(campos[k]);
        if (todos[k]) novo.base = todos[k].base;
        todos[k] = novo;
      });

      campos = {};
      Object.keys(todos).forEach(function (k) {
        var c = todos[k];
        var noServidor = valorDoCampo(servidor, c);
        if (noServidor === undefined) {
          avisos.push(rotuloDoCampo(servidor, c) + ": o participante não está mais no combate, e a alteração foi descartada.");
          return;
        }
        if (noServidor === c.valor) return;
        if (noServidor === c.base) { campos[k] = c; return; }
        conflitos.push({
          chave: k,
          entrada: c,
          rotulo: rotuloDoCampo(servidor, c),
          minha: c.valor,
          deles: noServidor,
          antes: c.base,
        });
      });

      /* Pontuais: na ordem, sobre o estado que o servidor teria depois de
         cada uma reaplicada. */
      var reaplicadas = [];
      var devolver = [];
      (pontuaisEnviados || []).concat(pontuais.splice(0, pontuais.length)).forEach(function (p) {
        var op = p.op;
        var atual = T().aplicar(servidor, reaplicadas.map(function (x) { return x.op; }));

        function cai(texto) {
          if (texto) avisos.push(texto);
          if (p.resolver) p.resolver({ ok: false, erro: "conflito" });
        }
        function jaEsta() { if (p.resolver) p.resolver({ ok: true, jaEstava: true }); }
        function volta(novoOp) {
          var registro = { op: novoOp || op, base: p.base, resolver: p.resolver };
          reaplicadas.push(registro);
          devolver.push(registro);
        }

        if (op.tipo === "adicionar") {
          var faltam = (op.participantes || []).filter(function (x) {
            if (acharParticipante(atual, x.id)) return false;
            return !(x.tipo === "personagem" && (atual.participantes || []).some(function (y) {
              return y.tipo === "personagem" && String(y.personagemId) === String(x.personagemId);
            }));
          });
          if (!faltam.length) jaEsta(); else volta(Object.assign({}, op, { participantes: faltam }));
          return;
        }

        if (op.tipo === "remover") {
          if (!acharParticipante(atual, op.participanteId)) jaEsta(); else volta();
          return;
        }

        if (op.tipo === "turno") {
          var mesmoTurno = atual.estado === "ativo" && p.base &&
            atual.turno.rodada === p.base.rodada && String(atual.turno.ativoId) === String(p.base.ativoId);
          if (mesmoTurno) volta();
          else cai("O turno mudou em outro lugar antes do seu clique chegar. O seu \"" +
            (op.direcao === "anterior" ? "Voltar turno" : "Próximo turno") + "\" não foi aplicado — confira a vez e clique de novo.");
          return;
        }

        if (op.tipo === "estado") {
          if (atual.estado === op.valor) jaEsta();
          else if (atual.estado === p.base) volta();
          else cai("O combate mudou de situação em outro lugar; a sua mudança não foi aplicada.");
          return;
        }

        if (op.tipo === "renomear") {
          if (atual.nome === op.nome) jaEsta();
          else if (atual.nome === p.base) volta();
          else cai("O nome do combate foi trocado em outro lugar (agora \"" + atual.nome + "\"). O seu não foi aplicado.");
          return;
        }

        if (op.tipo === "visiveis") {
          if (mesmaLista(atual.visiveis, op.lista)) jaEsta();
          else if (mesmaLista(atual.visiveis, p.base)) volta();
          else cai("\"Quem pode ver\" foi alterado em outro lugar. A sua lista não foi aplicada — abra de novo e confira.");
          return;
        }

        volta();
      });

      pontuais = devolver;
      return { avisos: avisos, conflitos: conflitos };
    }

    async function decidir(conflitos) {
      decidindo = true;
      mudou();

      var escolhas = {};
      try {
        escolhas = (o.aoConflito ? await o.aoConflito(conflitos) : null) || {};
      } catch (e) {
        escolhas = {};
      }

      conflitos.forEach(function (c) {
        /* Sem escolha explícita, fica o que está no servidor: nunca se
           sobrescreve a outra pessoa sem ninguém ter decidido. */
        if (escolhas[c.chave] === "minha") {
          campos[c.chave] = Object.assign(copiar(c.entrada), { valor: c.minha, base: c.deles });
        } else {
          delete campos[c.chave];
        }
      });

      decidindo = false;
    }

    /* Um estado mais novo chegou pela sincronização. Mais velho ou igual
       ao que já se conhece é ignorado: resposta atrasada não apaga valor
       novo. Com lote no ar, espera a resposta dele. */
    function receberRemoto(servidor) {
      if (parado || !servidor) return;
      var rev = Number(servidor.rev) || 0;
      if (rev <= confirmado.rev) {
        /* Mesma revisão: os recursos de personagem podem ter mudado sem
           o combate mudar. */
        if (rev === confirmado.rev) {
          (servidor.participantes || []).forEach(function (p) {
            var meu = acharParticipante(confirmado, p.id);
            if (meu && p.tipo === "personagem") {
              meu.recursos = copiar(p.recursos);
              if (p.recursosPendentes) meu.recursosPendentes = true; else delete meu.recursosPendentes;
              /* Morrendo e enlouquecendo contam no servidor, no próprio
                 "próximo turno": a listagem traz a contagem nova. */
              if (p.condicoes !== undefined) meu.condicoes = copiar(p.condicoes); else delete meu.condicoes;
            }
          });
          mudou();
        }
        return;
      }
      if (voo) {
        if (!remotoGuardado || rev > Number(remotoGuardado.rev)) remotoGuardado = copiar(servidor);
        return;
      }
      aplicarRemoto(servidor);
    }

    async function aplicarRemoto(servidor) {
      confirmado = copiar(servidor);
      confirmado.rev = Number(confirmado.rev) || 0;

      var resultado = conciliar(confirmado, [], []);
      resultado.avisos.forEach(function (t) { avisar(t, "atencao"); });
      mudou();

      if (resultado.conflitos.length) {
        await decidir(resultado.conflitos);
        if (parado) return;
        programar();
        mudou();
      } else if (pontuais.length) {
        programar();
      }
    }

    /* =================================================================
       CONSULTA
       ================================================================= */

    function campoPendente(tipo, participanteId, statusId) {
      var chave = chaveDoCampo(tipo, participanteId, statusId);
      if (campos[chave]) return true;
      return !!(voo && voo.campos.some(function (c) { return chaveDoCampo(c.tipo, c.participanteId, c.statusId) === chave; }));
    }

    function estado() {
      var chaves = Object.keys(campos);
      return {
        rev: confirmado.rev,
        pendentes: chaves.length + pontuais.length,
        camposPendentes: chaves.length,
        iniciativasPendentes: chaves.filter(function (k) { return campos[k].tipo === "iniciativa"; }).length,
        enviando: !!voo,
        programadoPara: programadoPara,
        decidindo: decidindo,
        erro: erro ? copiar(erro) : null,
      };
    }

    function temPendencias() {
      return !!(Object.keys(campos).length || pontuais.length || voo || decidindo);
    }

    function parar() {
      parado = true;
      relogio.limpar(timer);
      relogio.limpar(timerDeRede);
      pontuais.forEach(function (p) { if (p.resolver) p.resolver({ ok: false, erro: "parado" }); });
    }

    var api = {
      vista: vista,
      confirmado: function () { return copiar(confirmado); },
      estado: estado,
      definirIniciativa: function (participanteId, valor) { return definirCampo("iniciativa", participanteId, null, valor); },
      definirStatusCriatura: function (participanteId, statusId, valor) { return definirCampo("criatura_status", participanteId, statusId, valor); },
      enfileirar: enfileirar,
      salvarAgora: salvarAgora,
      tentarAgora: tentarAgora,
      receberRemoto: receberRemoto,
      campoPendente: campoPendente,
      temPendencias: temPendencias,
      temCamposNaoEnviados: function () { return Object.keys(campos).length > 0; },
      parar: parar,
    };

    return api;
  }

  global.RAMAFilaCombate = {
    criar: criar,
    ESPERA_INICIATIVA: ESPERA_INICIATIVA,
    ESPERA_STATUS: ESPERA_STATUS,
  };
})(typeof window !== "undefined" ? window : globalThis);
