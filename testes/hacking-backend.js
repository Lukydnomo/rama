/* =====================================================================
   R.A.M.A. — testes do backend: regra opcional de Hacking (v2.38)
   ---------------------------------------------------------------------
   ler_hacking e salvar_hacking, de ponta a ponta, pelo doPost: desligada
   por padrão, só o mestre grava, o jogador recebe só as cenas em que um
   personagem dele está (sem as notas do mestre, PS só quando mostrados),
   repetição e conflito, vínculo só com personagem da campanha. Também
   confere que o módulo dentro de Campanhas.gs é a cópia fiel de
   js/ordem/hacking.js. Dados sintéticos. Chamado por executar-backend.js.
   ===================================================================== */

export async function testarHackingBackend({ t, preparar, novaConta, comoFn }) {
  t.grupo("Hacking · o módulo do servidor é o mesmo do site");
  const js = (await Deno.readTextFile(new URL("../js/ordem/hacking.js", import.meta.url))).replace(/\r\n/g, "\n");
  const gs = (await Deno.readTextFile(new URL("../backend/Campanhas.gs", import.meta.url))).replace(/\r\n/g, "\n");
  const ini = gs.indexOf("/* >>> js/ordem/hacking.js */\n") + "/* >>> js/ordem/hacking.js */\n".length;
  const fim = gs.indexOf("/* <<< js/ordem/hacking.js */");
  t.ok("a cópia em Campanhas.gs é idêntica (byte a byte)", ini > 40 && fim > ini && gs.slice(ini, fim) === js);
  t.ok("e o servidor carregou RAMAHacking", !!globalThis.RAMAHacking && typeof globalThis.RAMAHacking.vistaDoJogador === "function");

  t.grupo("Hacking · desligado por padrão e permissões");
  preparar();
  const mestra = novaConta("hk_mestra"), ana = novaConta("hk_ana"), beto = novaConta("hk_beto"), intrusa = novaConta("hk_intrusa");
  const M = comoFn(mestra), A = comoFn(ana), B = comoFn(beto), I = comoFn(intrusa);
  const mesa = M({ acao: "criar_campanha", dados: { nome: "Rede" } }).dados.id;
  const outraMesa = M({ acao: "criar_campanha", dados: { nome: "Outra" } }).dados.id;
  M({ acao: "salvar_participantes", campanhaId: mesa, membros: [{ userId: ana.id, papel: "jogador" }, { userId: beto.id, papel: "jogador" }] });
  const ficha = (nome) => ({ nome, tipoFicha: "ordem", schemaVersion: 10, ordem: { classe: "especialista", nex: 5, recursos: { pv: 16, pe: null, san: null, pd: null } } });
  const pAna = A({ acao: "criar_personagem", dados: ficha("Ana") }).dados.id;
  const pBeto = B({ acao: "criar_personagem", dados: ficha("Beto") }).dados.id;
  const pFora = M({ acao: "criar_personagem", dados: ficha("De fora") }).dados.id;
  A({ acao: "vincular_personagem", campanhaId: mesa, personagemId: pAna });
  B({ acao: "vincular_personagem", campanhaId: mesa, personagemId: pBeto });
  M({ acao: "vincular_personagem", campanhaId: outraMesa, personagemId: pFora });

  const vazio = M({ acao: "ler_hacking", campanhaId: mesa });
  t.ok("sem nada gravado: estado vazio e desligado (rev 0)", vazio.ok && vazio.rev === 0 && vazio.dados.mestre && vazio.dados.estado.ativo === false && vazio.dados.estado.cenas.length === 0);
  t.igual("a jogadora, com a regra desligada, não recebe cena nenhuma", JSON.stringify(A({ acao: "ler_hacking", campanhaId: mesa }).dados.vista), JSON.stringify({ ativo: false, cenas: [] }));
  t.igual("quem não é da campanha não lê", I({ acao: "ler_hacking", campanhaId: mesa }).erro, "nao_encontrado");
  t.igual("ler_campanha: regra desligada", A({ acao: "ler_campanha", campanhaId: mesa }).dados.hacking, false);

  const H = globalThis.RAMAHacking;
  const e = H.vazio();
  H.ligar(e, true);
  const c1 = H.criarCena(e, { nome: "Servidor da produtora", dt: 25, notas: "senha é o nome do cachorro" }).cena;
  H.adicionarParticipante(c1, { nome: "Ana", personagemId: pAna, treino: "veterano", intelecto: 3 });
  H.adicionarParticipante(c1, { nome: "Intrusa", personagemId: pFora, treino: "treinado", intelecto: 1 });
  const c2 = H.criarCena(e, { nome: "Celular do Beto", dt: 15, psVisivel: true }).cena;
  H.adicionarParticipante(c2, { nome: "Beto", personagemId: pBeto, treino: "expert", intelecto: 2 });
  let n = 0;
  const op = () => "hk-teste-" + (++n) + "-aaaaaaaa";

  t.igual("jogadora não grava o Hacking", A({ acao: "salvar_hacking", campanhaId: mesa, rev: 0, opId: op(), estado: e }).erro, "sem_permissao");
  t.igual("intrusa também não", I({ acao: "salvar_hacking", campanhaId: mesa, rev: 0, opId: op(), estado: e }).erro, "nao_encontrado");
  t.igual("pedido sem opId é recusado", M({ acao: "salvar_hacking", campanhaId: mesa, rev: 0, estado: e }).erro, "dados_invalidos");

  t.grupo("Hacking · gravação, repetição e conflito");
  const opId = op();
  const s1 = M({ acao: "salvar_hacking", campanhaId: mesa, rev: 0, opId, estado: e });
  t.ok("a mestra grava (rev 1)", s1.ok && s1.rev === 1 && s1.dados.estado.ativo === true && s1.dados.estado.cenas.length === 2);
  t.igual("  vínculo com personagem de OUTRA campanha é desfeito no servidor",
    s1.dados.estado.cenas[0].participantes.find((p) => p.nome === "Intrusa").personagemId, "");
  const s1b = M({ acao: "salvar_hacking", campanhaId: mesa, rev: 0, opId, estado: e });
  t.ok("o mesmo lote chegando de novo não grava duas vezes", s1b.ok && s1b.repetida && s1b.rev === 1);
  const velho = M({ acao: "salvar_hacking", campanhaId: mesa, rev: 0, opId: op(), estado: e });
  t.ok("revisão velha recebe conflito com o estado atual", velho.erro === "conflito" && velho.rev === 1 && velho.dados.estado.ativo === true);
  t.igual("ler_campanha avisa o jogador que a regra está ligada", A({ acao: "ler_campanha", campanhaId: mesa }).dados.hacking, true);
  const sujo = JSON.parse(JSON.stringify(s1.dados.estado));
  sujo.cenas[0].psAtual = 999;
  sujo.cenas[0].participantes[0].treino = "hacker supremo";
  sujo.cenas[0].participantes[0].acoes = 9;
  const s2 = M({ acao: "salvar_hacking", campanhaId: mesa, rev: 1, opId: op(), estado: sujo });
  t.ok("o servidor normaliza com a mesma régua (PS ≤ máximo, treino conhecido, ≤ 2 ações)",
    s2.ok && s2.dados.estado.cenas[0].psAtual === 25 && s2.dados.estado.cenas[0].participantes[0].treino === "treinado" && s2.dados.estado.cenas[0].participantes[0].acoes === 2);

  t.grupo("Hacking · o que cada jogador recebe");
  const va = A({ acao: "ler_hacking", campanhaId: mesa }).dados;
  t.ok("a jogadora recebe a vista, não o estado", !va.mestre && !va.estado && va.vista.ativo === true);
  t.igual("  só a cena em que a personagem dela está", va.vista.cenas.map((c) => c.nome).join("|"), "Servidor da produtora");
  t.ok("  sem as notas do mestre", JSON.stringify(va).indexOf("cachorro") < 0 && va.vista.cenas[0].notas === undefined);
  t.ok("  e sem os PS, que o mestre não mostrou", va.vista.cenas[0].psMax === null && va.vista.cenas[0].psAtual === null);
  const vb = B({ acao: "ler_hacking", campanhaId: mesa }).dados.vista;
  t.ok("Beto vê a cena dele, com os PS mostrados", vb.cenas.length === 1 && vb.cenas[0].psMax === 15);

  t.grupo("Hacking · desligar esconde tudo de novo");
  const desl = JSON.parse(JSON.stringify(s2.dados.estado));
  desl.ativo = false;
  const s3 = M({ acao: "salvar_hacking", campanhaId: mesa, rev: 2, opId: op(), estado: desl });
  t.ok("a mestra desliga, e as cenas ficam guardadas", s3.ok && s3.dados.estado.cenas.length === 2);
  t.igual("  o jogador não recebe nada", JSON.stringify(B({ acao: "ler_hacking", campanhaId: mesa }).dados.vista), JSON.stringify({ ativo: false, cenas: [] }));
}
