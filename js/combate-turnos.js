/* =====================================================================
   R.A.M.A. — combate · ordem, turnos e rodadas
   ---------------------------------------------------------------------
   As regras da vez, sem tela e sem rede. Moram aqui para a aba Combate
   mostrar o próximo turno no clique, sem esperar o servidor — e o
   servidor aplica as MESMAS regras (backend/Campanhas.gs, "Turnos e
   rodadas"). Os testes rodam os mesmos casos nas duas implementações e
   exigem o mesmo resultado; se uma mudar, a outra tem de mudar junto.

   O que vale, em uma linha cada:

     ordem              iniciativa digitada, do maior para o menor; quem
                        empata mantém a posição em que entrou
     turno              de um participante, guardado pelo ID
     iniciar            rodada 1, turno do primeiro da ordem
     próximo            o seguinte; depois do último, o primeiro, e a
                        rodada sobe
     voltar             o anterior; do primeiro, o último da rodada
                        anterior; na rodada 1, do primeiro, nada muda
     remover o da vez   passa a quem vinha depois (do último: ao
                        primeiro, e a rodada sobe)
     reordenar          nunca muda de quem é o turno
     encerrar           a rodada fica; o turno não é de ninguém

   `aplicar` repete, para a VISTA da tela, o que o servidor faz com um
   lote de operações. Ela é tolerante: uma operação que o servidor
   recusaria é ignorada aqui, e a resposta do servidor corrige a tela.
   ===================================================================== */

(function (global) {
  "use strict";

  function ordem(participantes) {
    return (Array.isArray(participantes) ? participantes : [])
      .map(function (p, i) { return { p: p, i: i }; })
      .sort(function (a, b) {
        return ((Number(b.p.ordem) || 0) - (Number(a.p.ordem) || 0)) || (a.i - b.i);
      })
      .map(function (x) { return x.p; });
  }

  function indice(lista, id) {
    if (!id) return -1;
    for (var i = 0; i < lista.length; i++) {
      if (String(lista[i].id) === String(id)) return i;
    }
    return -1;
  }

  function normalizado(turno, participantes, estado) {
    var lista = ordem(participantes);
    var t = (turno && typeof turno === "object") ? turno : {};
    var rodada = Math.round(Number(t.rodada));
    var ativoId = t.ativoId ? String(t.ativoId) : null;

    if (estado === "preparando") return { rodada: 0, ativoId: null };
    if (estado === "encerrado") return { rodada: rodada > 0 ? rodada : 0, ativoId: null };

    return {
      rodada: rodada >= 1 ? rodada : 1,
      ativoId: indice(lista, ativoId) >= 0 ? ativoId : (lista.length ? String(lista[0].id) : null),
    };
  }

  function seguinte(turno, participantes) {
    var lista = ordem(participantes);
    if (!lista.length) return { rodada: turno.rodada, ativoId: null, mudou: false };
    var i = indice(lista, turno.ativoId);
    if (i < 0) return { rodada: turno.rodada, ativoId: String(lista[0].id), mudou: true };
    if (i + 1 < lista.length) return { rodada: turno.rodada, ativoId: String(lista[i + 1].id), mudou: true };
    return { rodada: turno.rodada + 1, ativoId: String(lista[0].id), mudou: true };
  }

  function anterior(turno, participantes) {
    var lista = ordem(participantes);
    if (!lista.length) return { rodada: turno.rodada, ativoId: null, mudou: false };
    var i = indice(lista, turno.ativoId);
    if (i < 0) return { rodada: turno.rodada, ativoId: String(lista[0].id), mudou: true };
    if (i > 0) return { rodada: turno.rodada, ativoId: String(lista[i - 1].id), mudou: true };
    if (turno.rodada <= 1) return { rodada: turno.rodada, ativoId: turno.ativoId, mudou: false, inicio: true };
    return { rodada: turno.rodada - 1, ativoId: String(lista[lista.length - 1].id), mudou: true };
  }

  function semParticipante(turno, participantes, removidoId) {
    if (!turno || String(turno.ativoId) !== String(removidoId)) return turno;
    var lista = ordem(participantes);
    var i = indice(lista, removidoId);
    var restantes = lista.filter(function (p) { return String(p.id) !== String(removidoId); });
    if (!restantes.length) return { rodada: turno.rodada, ativoId: null };
    if (i < 0) return { rodada: turno.rodada, ativoId: String(restantes[0].id) };
    if (i + 1 < lista.length) return { rodada: turno.rodada, ativoId: String(lista[i + 1].id) };
    return { rodada: turno.rodada + 1, ativoId: String(restantes[0].id) };
  }

  /* No turno da vez: dá para voltar? (Para desabilitar o botão.) */
  function podeVoltar(turno, participantes) {
    return anterior(turno, participantes).mudou;
  }

  function copiar(v) { return JSON.parse(JSON.stringify(v)); }

  function acharParticipante(combate, id) {
    var lista = combate.participantes || [];
    for (var i = 0; i < lista.length; i++) {
      if (String(lista[i].id) === String(id)) return lista[i];
    }
    return null;
  }

  /* O lote aplicado a uma CÓPIA do combate, como o servidor faria. */
  function aplicar(combate, ops) {
    var c = copiar(combate);
    c.participantes = Array.isArray(c.participantes) ? c.participantes : [];
    c.turno = normalizado(c.turno, c.participantes, c.estado);

    (ops || []).forEach(function (op) {
      if (!op || typeof op !== "object") return;

      if (op.tipo === "iniciativa") {
        var alvo = acharParticipante(c, op.participanteId);
        var valor = Number(op.valor);
        if (alvo && Number.isFinite(valor)) alvo.ordem = Math.round(valor);
        return;
      }

      if (op.tipo === "criatura_status") {
        var criatura = acharParticipante(c, op.participanteId);
        var lista = criatura && criatura.snapshot && Array.isArray(criatura.snapshot.status) ? criatura.snapshot.status : [];
        lista.forEach(function (s) {
          if (String(s.id) !== String(op.statusId)) return;
          var n = Math.round(Number(op.valor));
          if (!Number.isFinite(n)) return;
          var maximo = Math.max(0, Math.round(Number(s.maximo)) || 0);
          s.atual = maximo > 0 ? Math.max(0, Math.min(maximo, n)) : Math.max(0, Math.min(999999, n));
        });
        return;
      }

      if (op.tipo === "turno") {
        if (c.estado !== "ativo") return;
        var t = op.direcao === "anterior" ? anterior(c.turno, c.participantes) : seguinte(c.turno, c.participantes);
        c.turno = { rodada: t.rodada, ativoId: t.ativoId };
        return;
      }

      if (op.tipo === "estado") {
        if (c.estado === "preparando" && op.valor === "ativo") {
          c.estado = "ativo";
          c.turno = normalizado(null, c.participantes, "ativo");
        } else if (c.estado === "ativo" && op.valor === "encerrado") {
          c.estado = "encerrado";
          c.turno = normalizado(c.turno, c.participantes, "encerrado");
        }
        return;
      }

      if (op.tipo === "adicionar") {
        (op.participantes || []).forEach(function (p) {
          if (!p || acharParticipante(c, p.id)) return;
          if (p.tipo === "personagem" && c.participantes.some(function (x) {
            return x.tipo === "personagem" && String(x.personagemId) === String(p.personagemId);
          })) return;
          c.participantes.push(copiar(p));
        });
        return;
      }

      if (op.tipo === "remover") {
        var saindo = acharParticipante(c, op.participanteId);
        if (!saindo) return;
        if (c.estado === "ativo") c.turno = semParticipante(c.turno, c.participantes, saindo.id);
        c.participantes = c.participantes.filter(function (p) { return String(p.id) !== String(saindo.id); });
        return;
      }

      if (op.tipo === "renomear") {
        var nome = String(op.nome || "").trim().slice(0, 120);
        if (nome) c.nome = nome;
        return;
      }

      if (op.tipo === "visiveis") {
        if (Array.isArray(op.lista)) c.visiveis = op.lista.map(String);
      }
    });

    c.turno = normalizado(c.turno, c.participantes, c.estado);
    return c;
  }

  global.RAMACombateTurnos = {
    ordem: ordem,
    normalizado: normalizado,
    seguinte: seguinte,
    anterior: anterior,
    semParticipante: semParticipante,
    podeVoltar: podeVoltar,
    aplicar: aplicar,
  };
})(typeof window !== "undefined" ? window : globalThis);
