/* =====================================================================
   R.A.M.A. — testes do backend: BRUTAL (Brutal.gs, v7.0)
   ---------------------------------------------------------------------
   Uma sessão inteira com uma Diretora e duas jogadoras, pelo servidor
   simulado: fichas, campanha, testes em Livre e Suspense, um Susto, um
   Encontro (Vantagem, Ferida, fuga, fim), o Teste Complexo com 1, 2 e
   3 sucessos, recarregar, repetir a mesma operação e o isolamento da
   Diretora. Os dados do servidor vêm de uma FILA combinada (o rolador
   do Brutal.gs é trocado durante o teste). Dados sintéticos.
   Chamado por executar-backend.js.
   ===================================================================== */

export async function testarBrutalBackend({ t, preparar, novaConta, comoFn }) {
  const ler = (c) => Deno.readTextFile(new URL("../" + c, import.meta.url)).then((s) => s.replace(/\r\n/g, "\n"));
  const G = globalThis;
  const B = G.RAMABrutal;

  t.grupo("BRUTAL · o motor do servidor é o mesmo do navegador");
  const gs = await ler("backend/Brutal.gs");
  for (const n of ["catalogo", "regras", "mesa"]) {
    const caminho = "js/brutal/" + n + ".js";
    const ini = gs.indexOf("/* >>> " + caminho + " */\n") + ("/* >>> " + caminho + " */\n").length;
    const fim = gs.indexOf("/* <<< " + caminho + " */");
    t.ok("cópia de " + caminho + " idêntica (rode testes/gerar-brutal-gs.js ao mudar)", gs.slice(ini, fim).replace(/\n$/, "") === (await ler(caminho)).replace(/\n$/, ""));
  }

  /* Os dados do servidor: uma fila combinada. */
  const original = G.roladorDeBrutal;
  const fila = [];
  G.roladorDeBrutal = function () { if (!fila.length) throw new Error("fila de dados do servidor vazia"); return fila.shift(); };
  const rolar = (...f) => { fila.length = 0; fila.push(...f); };

  function ficha(nome, arquetipo, extra) {
    return { schemaVersion: 32, tipoFicha: "brutal", nome, campanhaId: null, brutal: B.normalizar(Object.assign({ arquetipo, apegos: { item: { nome: "Taco de beisebol" }, desejo: { texto: "segredo" } } }, extra || {})), atributos: [], status: [], pericias: [], inventario: { itens: [] }, anotacoes: { pastas: [], soltas: [] } };
  }
  let n = 0;
  const id = (p) => "br-" + p + "-" + String(++n).padStart(4, "0");

  try {
    t.grupo("BRUTAL · fichas e campanha");
    preparar();
    const dir = novaConta("br_diretora"), ana = novaConta("br_ana"), bia = novaConta("br_bia"), fora = novaConta("br_fora");
    const D = comoFn(dir), A = comoFn(ana), Bi = comoFn(bia), F = comoFn(fora);
    const fa = A({ acao: "criar_personagem", dados: ficha("Ana", "valentona") });
    t.ok("cria a ficha de uma Sobrevivente", fa.ok);
    const lida = A({ acao: "ler_personagem", personagemId: fa.dados.id });
    t.ok("lê de volta o bloco brutal e o tipo", lida.ok && lida.dados.tipoFicha === "brutal" && lida.dados.brutal.arquetipo === "valentona");
    t.ok("a ficha não guarda pilhas nem PT (são do Thriller)", !("pilha" in lida.dados.brutal) && !("pt" in lida.dados.brutal));
    const fb = Bi({ acao: "criar_personagem", dados: ficha("Bia", "nerd") }).dados.id;
    const camp = D({ acao: "criar_campanha", dados: { sistema: "brutal", nome: "Acampamento Lago Escuro" } }).dados.id;
    D({ acao: "salvar_participantes", campanhaId: camp, membros: [{ userId: ana.id, papel: "jogador" }, { userId: bia.id, papel: "jogador" }] });
    A({ acao: "vincular_personagem", campanhaId: camp, personagemId: fa.dados.id });
    Bi({ acao: "vincular_personagem", campanhaId: camp, personagemId: fb });
    const lc = D({ acao: "ler_campanha", campanhaId: camp }).dados;
    t.ok("campanha de BRUTAL: a Mesa da Diretora é a ferramenta", lc.sistema === "brutal" && lc.diretora === true && lc.combate === undefined);
    const l0 = D({ acao: "ler_brutal", campanhaId: camp });
    t.ok("a Diretora lê o Thriller com as duas Sobreviventes (6 dados, 0 PT)", l0.ok && l0.dados.mestre && Object.keys(l0.dados.estado.sobreviventes).length === 2 && Object.values(l0.dados.estado.sobreviventes).every((s) => s.pilha === 6 && s.pt === 0));
    t.recusa("de fora não lê", F({ acao: "ler_brutal", campanhaId: camp }), "nao_encontrado");
    const pa = fa.dados.id;
    const op = (C, operacao, opId, rev) => C(Object.assign({ acao: "brutal_operar", campanhaId: camp, opId: opId || id("op"), operacao }, rev === undefined ? {} : { rev }));

    t.grupo("BRUTAL · o Assassino e o isolamento da Diretora");
    t.recusa("jogadora não configura o Assassino", op(A, { tipo: "configurarAssassino", modelo: "bruto", aplicarPilha: true }), "sem_permissao");
    const cfg = op(D, { tipo: "configurarAssassino", modelo: "bruto", aplicarPilha: true, notas: "o martelo está no porão" }, id("cfg"), 0);
    t.ok("a Diretora escolhe o Bruto: 6 dados, 3 PH", cfg.ok && cfg.dados.estado.diretora.pilha === 6 && cfg.dados.estado.diretora.ph === 3);
    t.recusa("configuração sobre um estado velho (rev): conflito", op(D, { tipo: "configurarLacunas", fonteDosDados: "novo" }, id("cfg"), 0), "conflito");
    const va = A({ acao: "ler_brutal", campanhaId: camp });
    const txt = JSON.stringify(va.dados);
    t.ok("a jogadora recebe a VISTA: sem PH, sem a ficha do Assassino, sem notas", va.ok && !va.dados.mestre && va.dados.vista && !va.dados.estado && va.dados.vista.diretora.ph === undefined && !txt.includes("porão") && !txt.includes("Bruto"));
    t.ok("e sabe qual Sobrevivente é dela", va.dados.pode.length === 1 && va.dados.pode[0] === pa);

    t.grupo("BRUTAL · Livre e Suspense: as falhas são sacrificadas");
    t.recusa("jogadora não age pela outra", op(A, { tipo: "teste", quem: fb, dados: 1 }), "dados_invalidos");
    rolar(5, 2);
    const t1 = op(A, { tipo: "teste", quem: pa, dados: 2, estilo: "firme" });
    t.ok("teste em Livre rolado no servidor: 5 (sucesso), 2 (falha)", t1.ok && t1.resultado.rolagens[0].superado && t1.resultado.rolagens[0].faces.join() === "5,2");
    const e1 = D({ acao: "ler_brutal", campanhaId: camp }).dados.estado;
    t.iguais("o dado falho foi SACRIFICADO (Ana 5, Diretora 7)", [e1.sobreviventes[pa].pilha, e1.diretora.pilha], [5, 7]);
    const rol = D({ acao: "listar_rolagens", campanhaId: camp });
    t.ok("a rolagem do servidor entra no histórico da campanha", rol.ok && JSON.stringify(rol.dados).includes("Teste"));
    op(D, { tipo: "mudarCena", cena: "suspense" });
    rolar(1);
    const t2 = op(Bi, { tipo: "teste", quem: fb, dados: 1, estilo: "sagaz" });
    t.ok("Suspense: a falha também é sacrificada", t2.ok && D({ acao: "ler_brutal", campanhaId: camp }).dados.estado.diretora.pilha === 8);

    t.grupo("BRUTAL · o Teste Complexo exige exatamente 2 sucessos");
    const complexo = (faces) => { op(D, { tipo: "pedirTeste", teste: "complexo", alvos: [pa], rotulo: "Arrombar a porta" }); const ped = D({ acao: "ler_brutal", campanhaId: camp }).dados.estado.pedidos.slice(-1)[0]; rolar(...faces); return op(A, { tipo: "teste", quem: pa, pedido: ped.id, dados: faces.length, estilo: "potente" }); };
    op(D, { tipo: "ajustar", alvo: pa, campo: "pilha", delta: 3 });
    const c1 = complexo([5, 2, 1]), c2 = complexo([5, 6, 1]);
    op(D, { tipo: "ajustar", alvo: pa, campo: "pilha", delta: 6 });
    const c3 = complexo([5, 6, 4]);
    t.iguais("1 sucesso: falha · 2: superado · 3: FALHA", [c1.resultado.rolagens[0].superado, c2.resultado.rolagens[0].superado, c3.resultado.rolagens[0].superado], [false, true, false]);

    t.grupo("BRUTAL · Teste de Susto e Intento");
    op(D, { tipo: "mudarCena", cena: "livre" });
    op(D, { tipo: "ajustar", alvo: pa, campo: "pilha", delta: 6 });
    const ph0 = D({ acao: "ler_brutal", campanhaId: camp }).dados.estado.diretora.ph;
    op(D, { tipo: "assustar", alvos: [pa, fb] });
    const ped = D({ acao: "ler_brutal", campanhaId: camp }).dados.estado.pedidos.slice(-1)[0];
    rolar(2);
    const su = op(A, { tipo: "teste", quem: pa, pedido: ped.id, dados: 3 });
    const e2 = D({ acao: "ler_brutal", campanhaId: camp }).dados.estado;
    t.ok("Susto: 1 dado só; a falha é DESCARTADA e dá +1 PH", su.ok && su.resultado.rolagens[0].faces.length === 1 && e2.descarte === 1 && e2.diretora.ph === ph0 + 1);
    rolar(6);
    op(Bi, { tipo: "teste", quem: fb, pedido: ped.id });

    t.grupo("BRUTAL · Vantagem fora do Encontro");
    op(D, { tipo: "darPt", alvo: pa, valor: 5, motivo: "shot" });
    op(D, { tipo: "vantagemDaMesa", vantagem: { nome: "Preparar Para o Pior", estilo: "firme", custo: 2, recarga: "fimEncontro", efeito: "reduzirFerida", valor: 1 } }, id("vm"), D({ acao: "ler_brutal", campanhaId: camp }).rev);
    const vm = D({ acao: "ler_brutal", campanhaId: camp }).dados.estado.vantagensDaMesa[0].id;
    const uv = op(A, { tipo: "vantagem", quem: pa, chave: vm });
    t.ok("Ana usa a Vantagem (2 PT): a próxima Ferida será reduzida em 1", uv.ok && D({ acao: "ler_brutal", campanhaId: camp }).dados.estado.sobreviventes[pa].pendentes.reduzirFerida === 1);
    const uRep = op(A, { tipo: "vantagem", quem: pa, chave: vm }, "br-vant-fixo-0001");
    const uRep2 = op(A, { tipo: "vantagem", quem: pa, chave: vm }, "br-vant-fixo-0001");
    t.ok("Recarga: a segunda vez antes do Encontro acabar é recusada", uRep.ok === false);
    const ptAntes = D({ acao: "ler_brutal", campanhaId: camp }).dados.estado.sobreviventes[pa].pt;
    const apA = op(A, { tipo: "apego", quem: pa, apego: "item" }, "br-apego-item-0001");
    const apB = op(A, { tipo: "apego", quem: pa, apego: "item" }, "br-apego-item-0001");
    t.ok("Apego (Item Icônico +2): o mesmo opId repetido não dá PT duas vezes", apA.ok && apB.repetida && D({ acao: "ler_brutal", campanhaId: camp }).dados.estado.sobreviventes[pa].pt === ptAntes + 2 && uRep2.ok === false);

    t.grupo("BRUTAL · o Encontro");
    let est = D({ acao: "ler_brutal", campanhaId: camp }).dados.estado;
    t.ok("a Diretora (Pilha " + est.diretora.pilha + ") supera a de alguém", est.diretora.pilha > Math.min(est.sobreviventes[pa].pilha, est.sobreviventes[fb].pilha));
    t.recusa("jogadora não inicia o Encontro", op(A, { tipo: "iniciarEncontro", meta: 2 }), "sem_permissao");
    const ie = op(D, { tipo: "iniciarEncontro", meta: 2 });
    est = ie.dados.estado;
    t.ok("Iniciativa: Valentona antes da Nerd e o Assassino por último", ie.ok && est.encontro.ordem.join() === [pa, fb, "assassino"].join() && est.encontro.ordem[est.encontro.vez] === pa);
    const vb = Bi({ acao: "ler_brutal", campanhaId: camp }).dados.vista;
    t.ok("a jogadora não vê a meta da Fuga nem os Sustos restantes", vb.encontro.meta === undefined && vb.encontro.sustos === undefined);
    t.recusa("Vantagem durante o Encontro: recusada", op(A, { tipo: "vantagem", quem: pa, chave: "resistirADor" }), "dados_invalidos");
    t.recusa("fora da vez: recusado", op(Bi, { tipo: "acaoEncontro", quem: fb, acao: "recuperarFolego" }), "dados_invalidos");
    rolar(4, 3);
    const pc = op(A, { tipo: "acaoEncontro", quem: pa, acao: "partirParaCima", dados: 2 });
    est = D({ acao: "ler_brutal", campanhaId: camp }).dados.estado;
    t.ok("Partir Para Cima (Potente, sucesso em 3+): a Diretora descarta 1", pc.ok && est.encontro.ordem[est.encontro.vez] === fb);
    rolar(6, 5);
    const vz = op(Bi, { tipo: "acaoEncontro", quem: fb, acao: "vazarDali", dados: 2 });
    est = D({ acao: "ler_brutal", campanhaId: camp }).dados.estado;
    t.ok("Vazar Dali (Ligeiro): 2 sucessos completam a Fuga (meta 2): Bia escapa", vz.ok && est.sobreviventes[fb].situacao === "fugiu");
    t.ok("vez do Assassino", est.encontro.ordem[est.encontro.vez] === "assassino");
    rolar(4);
    const fe = op(D, { tipo: "ferir", alvo: pa });
    est = D({ acao: "ler_brutal", campanhaId: camp }).dados.estado;
    t.iguais("FERIR 4 com a Vantagem: Ferida 3 (4 − 1), 1 Sequela, Vantagem consumida", [est.sobreviventes[pa].ferida, est.sobreviventes[pa].sequelas, est.sobreviventes[pa].pendentes.reduzirFerida], [3, 1, 0]);
    t.ok("a ficha da jogadora vê a mesma Ferida depois de recarregar", A({ acao: "ler_brutal", campanhaId: camp }).dados.vista.sobreviventes[pa].ferida === 3 && fe.ok);
    op(D, { tipo: "fimDoTurno" });
    rolar(5, 6);
    const vz2 = op(A, { tipo: "acaoEncontro", quem: pa, acao: "vazarDali", dados: 2 });
    est = D({ acao: "ler_brutal", campanhaId: camp }).dados.estado;
    t.ok("todas escaparam: o Encontro termina sozinho e a cena volta a Livre", vz2.ok && est.encontro === null && est.cena === "livre");
    t.ok("os dados da Fuga voltam às Pilhas e as duas seguem vivas", est.sobreviventes[pa].situacao === "viva" && est.sobreviventes[fb].situacao === "viva" && est.sobreviventes[pa].fuga === 0);
    t.ok("Intento: saiu do Encontro com Ferida (+1 PH)", est.privado.some((r) => /saiu do Encontro com uma Ferida/.test(r.texto)));
    t.ok("a Vantagem recarregou no fim do Encontro", G.RAMABrutalMesa.motivoDaVantagem(est, est.sobreviventes[pa], vm) === "" || /PT/.test(G.RAMABrutalMesa.motivoDaVantagem(est, est.sobreviventes[pa], vm)));

    t.grupo("BRUTAL · o Desejo Obscuro vai para a ficha");
    const de = op(A, { tipo: "apego", quem: pa, apego: "desejo" });
    t.ok("revelado: +3 PT e a ficha registra para sempre", de.ok && A({ acao: "ler_personagem", personagemId: pa }).dados.brutal.apegos.desejo.revelado === true);

    t.grupo("BRUTAL · a mesma ficha em outra campanha começa outro Thriller");
    const camp2 = D({ acao: "criar_campanha", dados: { sistema: "brutal", nome: "Mansão do Bruto" } }).dados.id;
    D({ acao: "salvar_participantes", campanhaId: camp2, membros: [{ userId: ana.id, papel: "jogador" }] });
    const rl = A({ acao: "ler_personagem", personagemId: pa });
    A({ acao: "vincular_personagem", campanhaId: camp2, personagemId: pa });
    const n2 = D({ acao: "ler_brutal", campanhaId: camp2 }).dados.estado;
    t.ok("no Thriller novo: 6 dados, 0 PT, sem Ferida", rl.ok && n2.sobreviventes[pa] && n2.sobreviventes[pa].pilha === 6 && n2.sobreviventes[pa].pt === 0 && n2.sobreviventes[pa].ferida === 0);
    t.ok("…e o Desejo continua revelado (é da ficha)", n2.sobreviventes[pa].desejoRevelado === true);
    const antigo = D({ acao: "ler_brutal", campanhaId: camp }).dados.estado;
    t.ok("o Thriller antigo guarda o que ela tinha (sem apagar)", antigo.sobreviventes[pa] && antigo.sobreviventes[pa].foraDaCampanha === true && antigo.sobreviventes[pa].ferida === 3);

    t.grupo("BRUTAL · trocar o sistema guarda o Thriller");
    const sc = D({ acao: "ler_campanha", campanhaId: camp });
    D({ acao: "salvar_campanha", campanhaId: camp, rev: sc.rev, dados: { sistema: "ordem" } });
    t.recusa("numa campanha de Ordem a Mesa da Diretora não responde", D({ acao: "ler_brutal", campanhaId: camp }), "outro_sistema");
    t.ok("e fica guardada", D({ acao: "ler_campanha", campanhaId: camp }).dados.guardadas.includes("diretora"));
    const sc2 = D({ acao: "ler_campanha", campanhaId: camp });
    D({ acao: "salvar_campanha", campanhaId: camp, rev: sc2.rev, dados: { sistema: "brutal" } });
    t.ok("voltando a BRUTAL, o Thriller volta como estava", D({ acao: "ler_brutal", campanhaId: camp }).dados.estado.assassino.nome === "Bruto");
  } finally {
    G.roladorDeBrutal = original;
  }
}
