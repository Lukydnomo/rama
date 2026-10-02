/* =====================================================================
   R.A.M.A. — testes do backend: modo Hexatombe (v2.30)
   ---------------------------------------------------------------------
   ler_hexatombe, salvar_hexatombe e lancar_hexatombe, de ponta a ponta,
   pelo doPost: quem grava, o que o jogador recebe (só a própria equipe,
   nada de notas do mestre, rival só com o nome), repetição e conflito,
   vínculo só com personagem da campanha e lançamentos na ficha com id
   estável. Também confere que o módulo dentro de Campanhas.gs é a cópia
   fiel de js/ordem/hexatombe.js, e a troca de forma de uma criatura
   (Arquivos Secretos 2) pela operação de combate. Dados sintéticos.
   Chamado por executar-backend.js.
   ===================================================================== */

export async function testarHexatombeBackend({ t, preparar, novaConta, comoFn }) {
  t.grupo("Hexatombe · o módulo do servidor é o mesmo do site");
  const js = (await Deno.readTextFile(new URL("../js/ordem/hexatombe.js", import.meta.url))).replace(/\r\n/g, "\n");
  const gs = (await Deno.readTextFile(new URL("../backend/Campanhas.gs", import.meta.url))).replace(/\r\n/g, "\n");
  const ini = gs.indexOf("/* >>> js/ordem/hexatombe.js */\n") + "/* >>> js/ordem/hexatombe.js */\n".length;
  const fim = gs.indexOf("/* <<< js/ordem/hexatombe.js */");
  t.ok("a cópia em Campanhas.gs é idêntica (byte a byte)", ini > 40 && fim > ini && gs.slice(ini, fim) === js);
  t.ok("e o servidor carregou RAMAHexatombe", !!globalThis.RAMAHexatombe && typeof globalThis.RAMAHexatombe.vistaDoJogador === "function");

  t.grupo("Hexatombe · permissões");
  preparar();
  const mestra = novaConta("hx_mestra"), ana = novaConta("hx_ana"), beto = novaConta("hx_beto"), intrusa = novaConta("hx_intrusa");
  const M = comoFn(mestra), A = comoFn(ana), B = comoFn(beto), I = comoFn(intrusa);
  const mesa = M({ acao: "criar_campanha", dados: { nome: "Coroa" } }).dados.id;
  const outraMesa = M({ acao: "criar_campanha", dados: { nome: "Outra" } }).dados.id;
  M({ acao: "salvar_participantes", campanhaId: mesa, membros: [{ userId: ana.id, papel: "jogador" }, { userId: beto.id, papel: "jogador" }] });
  const ficha = (nome) => ({ nome, tipoFicha: "ordem", schemaVersion: 10, ordem: { classe: "combatente", nex: 5, recursos: { pv: 18, pe: null, san: null, pd: null } } });
  const pAna = A({ acao: "criar_personagem", dados: ficha("Ana") }).dados.id;
  const pBeto = B({ acao: "criar_personagem", dados: ficha("Beto") }).dados.id;
  const pFora = M({ acao: "criar_personagem", dados: ficha("De fora") }).dados.id;
  A({ acao: "vincular_personagem", campanhaId: mesa, personagemId: pAna });
  B({ acao: "vincular_personagem", campanhaId: mesa, personagemId: pBeto });
  M({ acao: "vincular_personagem", campanhaId: outraMesa, personagemId: pFora });

  const vazio = M({ acao: "ler_hexatombe", campanhaId: mesa });
  t.ok("sem nada gravado, a mestra recebe o estado vazio (rev 0)", vazio.ok && vazio.rev === 0 && vazio.dados.mestre && vazio.dados.estado.ativo === false);
  t.igual("a jogadora, com o modo desligado, não recebe nada", JSON.stringify(A({ acao: "ler_hexatombe", campanhaId: mesa }).dados.vista), JSON.stringify({ ativo: false }));
  t.igual("quem não é da campanha não lê", I({ acao: "ler_hexatombe", campanhaId: mesa }).erro, "nao_encontrado");
  t.igual("ler_campanha: modo desligado", A({ acao: "ler_campanha", campanhaId: mesa }).dados.hexatombe, false);

  const H = globalThis.RAMAHexatombe;
  const e = H.vazio();
  H.ligar(e, true);
  H.salvarEquipe(e, { id: "eqA", nome: "Mascarados", notas: "notas da mestra" });
  H.salvarEquipe(e, { id: "eqB", nome: "Vampiros" });
  e.equipes[1].estoque.agua = 9;
  H.salvarParticipante(e, { id: "pa", nome: "Ana", equipeId: "eqA", personagemId: pAna });
  H.salvarParticipante(e, { id: "pb", nome: "Beto", equipeId: "eqB", personagemId: pBeto, sacrificio: true, estigma: "prazer", notas: "segredo" });
  H.salvarParticipante(e, { id: "pf", nome: "Fora", equipeId: "eqB", personagemId: pFora });
  let n = 0;
  const op = () => "hx-teste-" + (++n) + "-aaaaaaaa";

  t.igual("jogadora não grava o Hexatombe", A({ acao: "salvar_hexatombe", campanhaId: mesa, rev: 0, opId: op(), estado: e }).erro, "sem_permissao");
  t.igual("intrusa também não", I({ acao: "salvar_hexatombe", campanhaId: mesa, rev: 0, opId: op(), estado: e }).erro, "nao_encontrado");
  t.igual("pedido sem opId é recusado", M({ acao: "salvar_hexatombe", campanhaId: mesa, rev: 0, estado: e }).erro, "dados_invalidos");

  t.grupo("Hexatombe · gravação, repetição e conflito");
  const opId = op();
  const s1 = M({ acao: "salvar_hexatombe", campanhaId: mesa, rev: 0, opId, estado: e });
  t.ok("a mestra grava (rev 1)", s1.ok && s1.rev === 1 && s1.dados.estado.ativo === true);
  t.igual("  vínculo com personagem de OUTRA campanha é desfeito no servidor",
    s1.dados.estado.participantes.find((p) => p.id === "pf").personagemId, "");
  const s1b = M({ acao: "salvar_hexatombe", campanhaId: mesa, rev: 0, opId, estado: e });
  t.ok("o mesmo lote chegando de novo não grava duas vezes", s1b.ok && s1b.repetida && s1b.rev === 1);
  const velho = M({ acao: "salvar_hexatombe", campanhaId: mesa, rev: 0, opId: op(), estado: e });
  t.ok("revisão velha recebe conflito com o estado atual", velho.erro === "conflito" && velho.rev === 1 && velho.dados.estado.ativo === true);
  t.igual("ler_campanha avisa o jogador que o modo está ligado", A({ acao: "ler_campanha", campanhaId: mesa }).dados.hexatombe, true);
  const sujo = Object.assign({}, e, { dia: 99, equipes: e.equipes.concat([{ id: "eqA", nome: "Duplicada" }]), registro: [{ id: "r1", texto: "<b>x</b>", visivel: "qualquer" }] });
  const s2 = M({ acao: "salvar_hexatombe", campanhaId: mesa, rev: 1, opId: op(), estado: sujo });
  t.ok("o servidor normaliza com a mesma régua (dia ≤ 6, ids únicos, visibilidade conhecida)",
    s2.ok && s2.dados.estado.dia === 6 && s2.dados.estado.equipes.length === 2 && s2.dados.estado.registro[0].visivel === "todos");

  t.grupo("Hexatombe · o que cada jogador recebe");
  const va = A({ acao: "ler_hexatombe", campanhaId: mesa }).dados;
  t.ok("a jogadora recebe a vista, não o estado", !va.mestre && !va.estado && va.vista.ativo === true);
  const rival = va.vista.equipes.find((q) => q.id === "eqB");
  t.ok("  a equipe rival vem só com o nome (estoque protegido)", rival.rival && rival.estoque === undefined && rival.base === undefined);
  t.ok("  ela vê a própria equipe e não vê participantes rivais", va.vista.participantes.every((p) => p.equipeId === "eqA"));
  const texto = JSON.stringify(va);
  t.ok("  nenhuma nota do mestre, pendência ou lançamento pendente", texto.indexOf("notas da mestra") < 0 && texto.indexOf("segredo") < 0 && va.vista.pendentes === undefined);
  const vb = B({ acao: "ler_hexatombe", campanhaId: mesa }).dados.vista;
  t.ok("Beto vê a equipe dele, com o estoque", vb.equipes.find((q) => q.id === "eqB").estoque.agua === 9 && vb.participantes.some((p) => p.meu && p.sacrificio));

  t.grupo("Hexatombe · lançamentos na ficha");
  const lanc = (corpo, como) => (como || M)(Object.assign({ acao: "lancar_hexatombe", campanhaId: mesa, operacaoId: "op-" + op() }, corpo));
  const sede = { id: "hx.sede.pa.d1", tipo: "pvMax", valor: -10, dia: 2, motivo: "Sem água no dia 1" };
  t.igual("jogadora não lança na própria ficha por aqui", lanc({ personagemId: pAna, dia: 1, itens: [{ lancamento: sede }] }, A).erro, "sem_permissao");
  t.igual("personagem de outra campanha: não encontrado", lanc({ personagemId: pFora, dia: 1, itens: [{ lancamento: sede }] }).erro, "nao_encontrado");
  const l1 = lanc({ personagemId: pAna, dia: 1, itens: [{ lancamento: sede }] });
  t.ok("a mestra lança na ficha vinculada", l1.ok && l1.dados.mudou);
  const lerAna = () => A({ acao: "ler_personagem", personagemId: pAna }).dados.ordem.hexatombe;
  t.ok("  com origem, dia e quem lançou", lerAna().lancamentos.length === 1 && lerAna().lancamentos[0].motivo === "Sem água no dia 1" &&
    lerAna().campanhaId === mesa && lerAna().dia === 1);
  const l2 = lanc({ personagemId: pAna, dia: 1, itens: [{ lancamento: sede }] });
  t.ok("o mesmo id não lança duas vezes", l2.ok && !l2.dados.mudou && lerAna().lancamentos.length === 1);
  lanc({ personagemId: pAna, dia: 2, itens: [{ desfazer: true, lancamento: { id: sede.id } }] });
  t.ok("desfazer marca o lançamento, sem apagar", !!lerAna().lancamentos[0].desfeito && lerAna().lancamentos.length === 1);
  lanc({ personagemId: pAna, dia: 2, itens: [{ lancamento: Object.assign({ refazer: true }, sede) }] });
  t.ok("refazer devolve o mesmo lançamento", lerAna().lancamentos[0].desfeito === "" && lerAna().lancamentos.length === 1);
  lanc({ personagemId: pAna, dia: 2, itens: [{ lancamento: { id: "hx.castigo.pv.pa.s1", tipo: "pvMax", valor: -7, atualPv: -7, motivo: "Castigo" } }] });
  t.igual("“perde PV máximos e atuais”: os atuais guardados descem junto", A({ acao: "ler_personagem", personagemId: pAna }).dados.ordem.recursos.pv, 11);
  t.igual("tipo desconhecido é recusado", lanc({ personagemId: pAna, dia: 2, itens: [{ lancamento: { id: "hx.x", tipo: "pv", valor: 5 } }] }).erro, "dados_invalidos");
  const opRepetida = "op-repetida-aaaaaaaa";
  M({ acao: "lancar_hexatombe", campanhaId: mesa, operacaoId: opRepetida, personagemId: pAna, dia: 3, itens: [{ lancamento: { id: "hx.intencao.pa.prazer", tipo: "pvMax", valor: 10 } }] });
  const rep = M({ acao: "lancar_hexatombe", campanhaId: mesa, operacaoId: opRepetida, personagemId: pAna, dia: 3, itens: [{ lancamento: { id: "hx.intencao.pa.prazer", tipo: "pvMax", valor: 10 } }] });
  t.ok("o mesmo pedido repetido é reconhecido", rep.ok && rep.repetida);
  t.grupo("Arquivos Secretos 2 · forma de criatura pela operação de combate");
  const snapshot = {
    tipo: "criatura", sistema: "ordem", versao: 2, nome: "Sintético", visibilidade: "privado", natureza: "humana",
    status: [{ id: "vida", nome: "Pontos de vida", atual: 50, maximo: 100 }], atributos: [], pericias: [], ataques: [], habilidades: [], acoes: [],
    ordem: { vd: 80, elementos: [], tipo: "Pessoa", estados: [], pvBase: 100, formas: [{ id: "forte", nome: "Forma forte", pv: 200, habilidades: [], acoes: [], pericias: [] }] },
    instancia: { estados: {}, usos: {}, marcadores: {}, enigma: false, nota: "" },
  };
  const cmb = M({ acao: "salvar_combate", campanhaId: mesa, dados: { nome: "Formas", estado: "preparando", visiveis: [], participantes: [{ id: "c1", tipo: "criatura", nome: "Sintético", ordem: 1, snapshot }] } });
  let revC = cmb.rev;
  const opC = (valor) => M({ acao: "atualizar_combate", campanhaId: mesa, combateId: cmb.dados.id, rev: revC, opId: op(), ops: [{ tipo: "criatura_instancia", participanteId: "c1", chave: "forma", valor }] });
  const f1 = opC("forte");
  if (f1.ok) revC = f1.rev;
  const lido = () => M({ acao: "listar_combates", campanhaId: mesa }).dados.find((c) => c.id === cmb.dados.id).participantes[0].snapshot;
  t.ok("o servidor troca a forma: máximo da forma, atuais preservados", f1.ok && lido().instancia.forma === "forte" && lido().status[0].maximo === 200 && lido().status[0].atual === 50);
  t.igual("forma que a ficha não tem é recusada", opC("outra").erro, "dados_invalidos");
  const f2 = opC("");
  t.ok("voltar à ficha de partida prende os atuais no máximo dela, sem restaurar", f2.ok && !lido().instancia.forma && lido().status[0].maximo === 100 && lido().status[0].atual === 50);
}
