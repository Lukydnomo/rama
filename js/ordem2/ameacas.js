/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II (Experimental) · ameaças (v9.1)
   ---------------------------------------------------------------------
   Fichas NATIVAS de Ordem II (nada de VD, NEX, Defesa ou ação de Ordem
   I): atributos e perícias em dados, PV, ações com a perícia do teste e
   o bônus de dano (RA + n), e habilidades com um `motor` que a mesa sabe
   executar. Só o que os arquivos imprimem — o que falta é LACUNA, com o
   nome, e não um número inventado.

     Beta  Afogado (p. 33), Aughisk (p. 43), Crias da Floresta (p. 71),
           Ellén Trechend (só os efeitos da perseguição, pp. 72–74)
     Alpha inventário do Ato I e II, sem ficha nos arquivos

   O mesmo formato é o bloco `ordem2` de uma criatura de Homebrew
   (js/criaturas.js). A solução de um enigma (o "Enigma de Medo" do
   aughisk) é conteúdo do Mestre: fica no pacote da missão, não aqui.

   Copiado para backend/Ordem2.gs (testes/gerar-ordem2-gs.js).
   ===================================================================== */

(function (global) {
  "use strict";

  function lista(v) { return Array.isArray(v) ? v : []; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function texto(v, n) { return String(v === undefined || v === null ? "" : v).slice(0, n || 200); }
  function numero(v, a, b, p) { var n = Number(v); if (v === "" || v === null || v === undefined || !Number.isFinite(n)) return p; return Math.max(a, Math.min(b, Math.round(n))); }
  function dado(v) { var n = Number(v); return [4, 6, 8, 10, 12, 20].indexOf(n) >= 0 ? n : null; }

  var NATUREZAS = { criatura: "Criatura", pessoa: "Pessoa", artefato: "Artefato amaldiçoado", manifestacao: "Manifestação", objeto: "Objeto de cena" };
  var ELEMENTOS = ["Sangue", "Morte", "Conhecimento", "Energia", "Medo"];
  var ALCANCES = { corpo: "Corpo a corpo", distancia: "À distância", especial: "Especial" };
  /* O que a mesa sabe fazer com uma ação ou habilidade (mesa/procedimentos). */
  var MOTORES = {
    afogar: "Agarra e afoga: sem dano no acerto; a vítima só pode escapar e perde o dano por rodada no fim de cada rodada.",
    oposto: "Teste oposto contra o alvo; vencendo, dano e condições.",
    area: "Todos testam ao mesmo tempo contra a DT; dano conforme passar ou falhar.",
    tributo: "No início da rodada, com PV no limite, consome as ameaças indicadas e cura.",
    cabecas: "No início de cada rodada, dois personagens sorteados sofrem dano.",
    manual: "Sem automação: o Mestre narra e aplica.",
  };

  function normalizarAcao(x, i) {
    var a = obj(x);
    var nome = texto(a.nome, 80);
    if (!nome) return null;
    return {
      id: texto(a.id, 40) || "a" + i, nome: nome,
      alcance: ALCANCES[a.alcance] ? a.alcance : "corpo",
      pericia: texto(a.pericia, 40) || "luta",
      dano: a.dano === null || a.dano === undefined || a.dano === "" ? null : numero(a.dano, -10, 50, 0),
      efeitos: lista(a.efeitos).map(function (s) { return texto(s, 40); }).filter(Boolean).slice(0, 6),
      fase: ["suporte", "distancia", "corpo", "final", "geral"].indexOf(a.fase) >= 0 ? a.fase : "",
      texto: texto(a.texto, 800),
      motor: a.motor && typeof a.motor === "object" ? JSON.parse(JSON.stringify(a.motor)) : null,
    };
  }
  function normalizarHabilidade(x, i) {
    var h = obj(x);
    var nome = texto(h.nome, 80);
    if (!nome) return null;
    return { id: texto(h.id, 40) || "h" + i, nome: nome, texto: texto(h.texto, 1200), motor: h.motor && typeof h.motor === "object" ? JSON.parse(JSON.stringify(h.motor)) : null };
  }
  /* O bloco `ordem2` (catálogo e Homebrew). */
  function normalizar(bruto) {
    var b = obj(bruto);
    var at = obj(b.atributos), pe = obj(b.pericias);
    var atributos = null;
    if (Object.keys(at).length) atributos = { fisico: dado(at.fisico) || 4, mente: dado(at.mente) || 4, emocao: dado(at.emocao) || 4 };
    var pericias = {};
    Object.keys(pe).slice(0, 24).forEach(function (k) { var d = dado(pe[k]); if (d && /^[a-z]{3,20}$/.test(k)) pericias[k] = d; });
    var f = obj(b.fonte);
    return {
      natureza: NATUREZAS[b.natureza] ? b.natureza : "criatura",
      elementos: lista(b.elementos).filter(function (e) { return ELEMENTOS.indexOf(e) >= 0; }).slice(0, 5),
      pv: b.pv === null || b.pv === undefined || b.pv === "" ? null : numero(b.pv, 0, 9999, 10),
      pd: b.pd === null || b.pd === undefined || b.pd === "" ? null : numero(b.pd, 0, 9999, 10),
      atributos: atributos,
      pericias: pericias,
      rd: b.rd === null || b.rd === undefined || b.rd === "" ? null : numero(b.rd, 0, 99, 0),
      armadura: numero(b.armadura, 0, 20, 0),
      acoes: lista(b.acoes).slice(0, 12).map(normalizarAcao).filter(Boolean),
      habilidades: lista(b.habilidades).slice(0, 16).map(normalizarHabilidade).filter(Boolean),
      estrategia: texto(b.estrategia, 800),
      fonte: { doc: texto(f.doc, 20), pagina: numero(f.pagina, 0, 999, 0), paginaNoTexto: numero(f.paginaNoTexto, 0, 999, 0) },
      lacunas: lista(b.lacunas).map(function (s) { return texto(s, 200); }).filter(Boolean).slice(0, 8),
      semFicha: b.semFicha === true,
    };
  }

  /* ---------------------------------------------------------------
     O CATÁLOGO
     --------------------------------------------------------------- */
  var LISTA = [
    { id: "afogado", nome: "Afogado", ordem2: {
      natureza: "criatura", elementos: ["Morte"], pv: 10, atributos: { fisico: 8, mente: 4, emocao: 4 }, pericias: { atletismo: 8, luta: 6 },
      acoes: [
        { id: "garras", nome: "Garras", alcance: "corpo", pericia: "luta", dano: 1, texto: "Dano RA+1." },
        { id: "afogar", nome: "Afogar", alcance: "corpo", pericia: "luta", dano: null, efeitos: ["afogar"], texto: "Agarra e empurra contra a água; só perto de um corpo d'água. A vítima só pode escapar e perde 1d6 PV no fim de cada rodada; quem agarra não faz outra coisa.", motor: { tipo: "afogar", dano: [1, 6], escapar: { pericias: ["acrobacia", "luta"], contra: "luta", passosVitima: -1 } } },
      ],
      habilidades: [{ id: "escapar", nome: "Escapar", texto: "Na fase de corpo a corpo, a vítima testa Acrobacia ou Luta (−1 passo) contra a Luta do afogado; vencendo, solta-se e não sofre o dano desta rodada. Um aliado pode gastar a ação para tentar o mesmo, sem a redução." }],
      estrategia: "Perto de água, avança no mais próximo: fere (Garras) e afoga (Afogar). Longe dela, só Garras.",
      fonte: { doc: "beta", pagina: 33, paginaNoTexto: 35 },
    } },
    { id: "aughisk", nome: "Aughisk", ordem2: {
      natureza: "criatura", elementos: ["Morte", "Medo"], pv: 40, atributos: { fisico: 10, mente: 6, emocao: 8 }, pericias: { atletismo: 10, luta: 10, percepcao: 10 },
      rd: null,
      acoes: [
        { id: "espada", nome: "Espada", alcance: "corpo", pericia: "luta", dano: 4, texto: "Teste 2d10, dano RA+4." },
        { id: "coice", nome: "Coice", alcance: "corpo", pericia: "luta", dano: 3, texto: "Teste 2d10, dano RA+3." },
        { id: "investida", nome: "Investida Equina", alcance: "especial", fase: "suporte", pericia: "atletismo", dano: 3, texto: "Na fase de suporte, avança num personagem (que pode gastar a ação para esquivar); no corpo a corpo, Atletismo contra a Acrobacia dele (+d6 se esquivou). Vencendo: RA+3 de impacto, atordoado 1 rodada e caído.", motor: { tipo: "oposto", pericia: "atletismo", contra: "acrobacia", bonusSeEsquivou: 6, dano: 3, condicoes: ["atordoado", "caido"] } },
        { id: "enxurrada", nome: "Enxurrada de Morte", alcance: "especial", fase: "suporte", texto: "Duas ações (duas rodadas, fase de suporte). Na segunda, todos testam Acrobacia DT 13: passando, 1d6; falhando, 2d6 e caído. Quem procurou abrigo durante a primeira ação recebe +d6 e, passando, não sofre dano.", motor: { tipo: "area", acoes: 2, pericia: "acrobacia", dt: 13, sucesso: { dano: [1, 6] }, falha: { dano: [2, 6], caido: true }, abrigo: { bonus: 6, semDanoNoSucesso: true } } },
      ],
      habilidades: [
        { id: "presenca", nome: "Presença Aterradora", texto: "No início da cena, quem o vê sofre 2d6 de dano emocional; Disciplina DT 10 reduz à metade. (O texto cita \"NEX\", termo da primeira edição: ignorado.)", motor: { tipo: "area", quando: "inicioDaCena", pericia: "disciplina", dt: 10, dano: [2, 6], danoTipo: "emocional", sucesso: { metade: true } } },
        { id: "tributo", nome: "Tributo Mortal", texto: "Começando a rodada com 20 PV ou menos, os afogados na ilhota gastam a ação de suporte indo até ele e explodem em lodo: +10 PV por afogado.", motor: { tipo: "tributo", limite: 20, ameaca: "afogado", cura: 10 } },
        { id: "enigma", nome: "Enigma de Medo", texto: "A manifestação está presa a objetos da cena; destruir a origem o deixa atordoado 1 rodada e sem a redução de dano. Os detalhes são do Mestre (pacote da missão).", motor: { tipo: "manual" } },
      ],
      estrategia: "1ª rodada: corpo a corpo no mais forte ao alcance; 2ª: Investida Equina; 3ª e 4ª: Enxurrada de Morte; depois repete.",
      fonte: { doc: "beta", pagina: 43, paginaNoTexto: 46 },
      lacunas: ["Redução de dano: o texto diz que ele a perde, mas a ficha não imprime o valor."],
    } },
    { id: "cria-da-floresta", nome: "Cria da Floresta", ordem2: {
      natureza: "criatura", elementos: ["Energia"], pv: 10, atributos: { fisico: 6, mente: 4, emocao: 4 }, pericias: { acrobacia: 6, atletismo: 6, luta: 6, percepcao: 6 },
      acoes: [
        { id: "garras", nome: "Garras", alcance: "corpo", pericia: "luta", dano: 1, texto: "Teste 2d6, dano RA+1." },
        { id: "derrubar", nome: "Derrubar", alcance: "especial", fase: "suporte", pericia: "luta", texto: "Teste de Luta oposto contra o alvo; vencendo, ele fica caído. Quando várias atacam o mesmo alvo, a primeira pode derrubar para facilitar as outras.", motor: { tipo: "oposto", pericia: "luta", contra: "luta", dano: null, condicoes: ["caido"] } },
      ],
      estrategia: "Saltam na vítima e retalham com as garras; várias no mesmo alvo: a primeira tenta derrubar.",
      fonte: { doc: "beta", pagina: 71, paginaNoTexto: 73 },
    } },
    { id: "ellen-trechend", nome: "Ellén Trechend", ordem2: {
      natureza: "criatura", elementos: [], pv: null, semFicha: true,
      habilidades: [
        { id: "cabecas", nome: "Ataques das Cabeças", texto: "No início de cada rodada da perseguição, dois personagens sorteados: o primeiro sofre 1d6 de dano físico (mordida ou veneno), o segundo 1d6 de dano emocional (a cabeça de muitos olhos). Facilitando: 1d4.", motor: { tipo: "cabecas", fisico: [1, 6], emocional: [1, 6], facilitado: [1, 4] } },
        { id: "alcance", nome: "Alcançar e devorar", texto: "No fim das rodadas 3, 4 e 5, quem tiver menos de 15, 20 e 30 pontos de avanço é alcançado; morre só o de menor pontuação (empate: teste oposto entre eles). Facilitando: no máximo três mortes, empate decidido em 1d20.", motor: { tipo: "manual" } },
      ],
      estrategia: "Não há combate: é uma perseguição até a aldeia.",
      fonte: { doc: "beta", pagina: 73 },
      lacunas: ["Sem ficha nos arquivos: atributos, PV e ações não são impressos (só os efeitos da perseguição)."],
    } },
    /* Alpha: o que aparece nas missões sem ficha. */
    { id: "idolo-de-pedra", nome: "Ídolo de Pedra", ordem2: { natureza: "artefato", elementos: [], pv: null, semFicha: true, fonte: { doc: "alpha", pagina: 51 }, lacunas: ["Artefato sem ficha: a maldição é uma tabela de rodadas da missão (pacote do Mestre)."] } },
    { id: "cadaveres-erguidos", nome: "Cadáveres erguidos", ordem2: { natureza: "criatura", elementos: [], pv: null, semFicha: true, fonte: { doc: "alpha", pagina: 53 }, lacunas: ["Sem ficha: o efeito é narrado pela tabela da maldição (pacote do Mestre)."] } },
    { id: "manifestacao-compendio", nome: "Manifestação do compêndio", ordem2: { natureza: "manifestacao", elementos: [], pv: null, semFicha: true, fonte: { doc: "alpha", pagina: 70 }, lacunas: ["Manifestações catalogadas só no compêndio (handout do Ato II), sem ficha de combate."] } },
  ];
  LISTA.forEach(function (x) { x.ordem2 = normalizar(x.ordem2); });

  function porId(idOuNome) {
    var k = String(idOuNome || "").toLowerCase();
    return LISTA.filter(function (x) { return x.id === k || x.nome.toLowerCase() === k; })[0] || null;
  }
  function linha(b) {
    var x = normalizar(b);
    if (x.semFicha) return (NATUREZAS[x.natureza] || "") + " · sem ficha nos arquivos";
    var at = x.atributos ? "Físico d" + x.atributos.fisico + " · Mente d" + x.atributos.mente + " · Emoção d" + x.atributos.emocao : "";
    return [x.pv !== null ? "PV " + x.pv : "", at, x.rd !== null && x.rd ? "RD " + x.rd : ""].filter(Boolean).join(" · ");
  }
  /* Uma OCORRÊNCIA para a mesa: PV, ataques e especiais próprios. */
  function paraNpc(b, nome) {
    var x = normalizar(b);
    if (x.semFicha || x.pv === null || !x.atributos) return null;
    var ataques = x.acoes.filter(function (a) { return a.alcance !== "especial"; }).map(function (a) { return { id: a.id, nome: a.nome, alcance: a.alcance, dano: a.dano === null ? 0 : a.dano, efeitos: a.efeitos, especial: a.texto.slice(0, 600) }; });
    var especiais = x.acoes.filter(function (a) { return a.motor; }).concat(x.habilidades.filter(function (h) { return h.motor && h.motor.tipo !== "manual"; })).map(function (a) { return { id: a.id, nome: a.nome, motor: a.motor, fase: a.fase || "", dano: a.dano === undefined ? null : a.dano }; });
    var pericias = {};
    Object.keys(x.pericias).forEach(function (k) { pericias[k] = x.pericias[k]; });
    ["luta", "acrobacia", "percepcao", "intuicao", "vigor", "disciplina"].forEach(function (k) { if (!pericias[k]) pericias[k] = 4; });
    return { nome: nome || "", pv: x.pv, armadura: x.armadura, rd: x.rd, atributos: x.atributos, pericias: pericias, ataques: ataques.length ? ataques : [{ nome: "Ataque", alcance: "corpo", dano: 0 }], especiais: especiais };
  }

  global.RAMAOrdem2Ameacas = {
    NATUREZAS: NATUREZAS, ELEMENTOS: ELEMENTOS, ALCANCES: ALCANCES, MOTORES: MOTORES,
    LISTA: LISTA, porId: porId, normalizar: normalizar, linha: linha, paraNpc: paraNpc,
  };
})(typeof window !== "undefined" ? window : globalThis);
