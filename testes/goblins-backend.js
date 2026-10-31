/* =====================================================================
   R.A.M.A. — testes do backend: Malditos Goblins (Goblins.gs, v6.0)
   Dados sintéticos. Chamado por executar-backend.js.
   ===================================================================== */

export async function testarGoblinsBackend({ t, preparar, novaConta, comoFn }) {
  const ler = (c) => Deno.readTextFile(new URL("../" + c, import.meta.url)).then((s) => s.replace(/\r\n/g, "\n"));
  const R = globalThis.RAMAGoblins;
  const G = globalThis;

  t.grupo("Goblins · o motor do servidor é o mesmo do navegador");
  const gs = await ler("backend/Goblins.gs");
  for (const n of ["catalogo", "dados", "regras", "mesa"]) {
    const caminho = "js/goblins/" + n + ".js";
    const ini = gs.indexOf("/* >>> " + caminho + " */\n") + ("/* >>> " + caminho + " */\n").length;
    const fim = gs.indexOf("/* <<< " + caminho + " */");
    t.ok("cópia de " + caminho + " idêntica (rode testes/gerar-goblins-gs.js ao mudar)", gs.slice(ini, fim).replace(/\n$/, "") === (await ler(caminho)).replace(/\n$/, ""));
  }

  /* Um goblin pronto, como a criação o deixa. */
  function ficha(nome, ocupacao, extra) {
    const o = R.fichaVazia();
    o.ocupacao = ocupacao; o.descritor = "mediocre"; o.equipamentoInicial = 0;
    o.caracteristicas = [{ id: "c1", chave: "pintas" }];
    if (ocupacao === "mercenario") o.escolhas.armaFavorita = "espada";
    if (ocupacao === "bruxo") o.escolhas.magias = ["fogo", "cura", "gelo"];
    Object.assign(o, extra || {});
    R.concluirCriacao(o, () => 1);
    return { schemaVersion: 27, tipoFicha: "goblins", nome, campanhaId: null, goblins: o, atributos: [], status: [], pericias: [], inventario: { itens: [] }, anotacoes: { pastas: [], soltas: [] } };
  }
  function bloco(C, id) { return R.normalizar(C({ acao: "ler_personagem", personagemId: id }).dados.goblins); }

  t.grupo("Goblins · a ficha é de um sistema conhecido");
  preparar();
  const mestra = novaConta("gb_mestra"), jo = novaConta("gb_jo"), lu = novaConta("gb_lu"), fora = novaConta("gb_fora");
  const M = comoFn(mestra), J = comoFn(jo), L = comoFn(lu), F = comoFn(fora);
  const avulsa = J({ acao: "criar_personagem", dados: ficha("Plaft", "mercenario") });
  t.ok("cria uma ficha de Malditos Goblins", avulsa.ok);
  const lida = J({ acao: "ler_personagem", personagemId: avulsa.dados.id });
  t.ok("lê de volta com o bloco e o tipo", lida.ok && lida.dados.tipoFicha === "goblins" && lida.dados.goblins.ocupacao === "mercenario");
  const lp = J({ acao: "listar_personagens" });
  t.ok("a lista de personagens diz o sistema", lp.ok && lp.dados.some((p) => p.id === avulsa.dados.id && p.sistema === "goblins"));

  t.grupo("Goblins · o Covil é do mestre");
  const camp = M({ acao: "criar_campanha", dados: { sistema: "goblins", nome: "O Bando do Pântano" } }).dados.id;
  M({ acao: "salvar_participantes", campanhaId: camp, membros: [{ userId: jo.id, papel: "jogador" }, { userId: lu.id, papel: "jogador" }] });
  const pj = J({ acao: "criar_personagem", dados: ficha("Tik", "lider") }).dados.id;
  const pl = L({ acao: "criar_personagem", dados: ficha("Glub", "bruxo") }).dados.id;
  const pm = J({ acao: "criar_personagem", dados: ficha("Crash", "mercenario") }).dados.id;
  J({ acao: "vincular_personagem", campanhaId: camp, personagemId: pj });
  L({ acao: "vincular_personagem", campanhaId: camp, personagemId: pl });
  J({ acao: "vincular_personagem", campanhaId: camp, personagemId: pm });
  const lc = M({ acao: "ler_campanha", campanhaId: camp }).dados;
  t.ok("campanha de Goblins: o Covil é a ferramenta, sem o combate do núcleo", lc.sistema === "goblins" && lc.covil === true && lc.combate === undefined);
  const l0 = M({ acao: "ler_goblins", campanhaId: camp });
  t.ok("o mestre lê o Covil inteiro (rev 0) com os goblins e o resumo de cada um", l0.ok && l0.dados.mestre && l0.rev === 0 && l0.dados.personagens.length === 3 && l0.dados.personagens.every((p) => p.resumo && p.resumo.atributos));
  const est = l0.dados.estado;
  G.RAMAGoblinsMesa.adicionarInimigos(est, "guarda", 1);
  G.RAMAGoblinsMesa.adicionarInimigos(est, "lobo", 1, { oculto: true });
  est.notas = "o lobo é o dono da taverna";
  G.RAMAGoblinsMesa.sortear(est, "viajante", "so-mestra-01", () => 3, { oculto: true });
  t.recusa("jogador não grava o Covil", J({ acao: "salvar_goblins", campanhaId: camp, rev: 0, opId: "gb-salva-0001", estado: est }), "sem_permissao");
  const s1 = M({ acao: "salvar_goblins", campanhaId: camp, rev: 0, opId: "gb-salva-0001", estado: est });
  t.ok("o mestre grava", s1.ok && s1.rev === 1);
  t.ok("repetido (mesmo opId): não grava de novo", M({ acao: "salvar_goblins", campanhaId: camp, rev: 0, opId: "gb-salva-0001", estado: est }).repetida);
  t.recusa("revisão velha: conflito", M({ acao: "salvar_goblins", campanhaId: camp, rev: 0, opId: "gb-salva-0002", estado: est }), "conflito");
  const vj = J({ acao: "ler_goblins", campanhaId: camp });
  const txt = JSON.stringify(vj.dados);
  t.ok("o jogador recebe a VISTA, não o estado", vj.ok && !vj.dados.mestre && vj.dados.vista && !vj.dados.estado);
  t.ok("  sem notas, sem o inimigo oculto, sem o sorteio oculto", !txt.includes("dono da taverna") && !txt.includes("Lobo") && vj.dados.vista.sorteios.length === 0 && vj.dados.vista.combate.participantes.length === 1);
  t.ok("  e sabe quais goblins são dele", vj.dados.personagens.filter((p) => p.meu).length === 2);
  t.recusa("de fora não lê", F({ acao: "ler_goblins", campanhaId: camp }), "nao_encontrado");
  const pcEst = M({ acao: "ler_goblins", campanhaId: camp }).dados.estado;
  pcEst.combate.participantes.push(G.RAMAGoblinsMesa.normalizarParticipante({ tipo: "pc", personagemId: avulsa.dados.id, nome: "Intruso" }));
  M({ acao: "salvar_goblins", campanhaId: camp, rev: 1, opId: "gb-salva-0003", estado: pcEst });
  t.ok("goblin de jogador de FORA da campanha não entra no combate", !M({ acao: "ler_goblins", campanhaId: camp }).dados.estado.combate.participantes.some((p) => p.nome === "Intruso"));

  t.grupo("Goblins · operações do mestre nas fichas");
  t.recusa("jogador não aplica dano", J({ acao: "goblins_operar", campanhaId: camp, opId: "gb-op-dano-01", operacao: { tipo: "dano", personagem: pj, acertos: 2 } }), "sem_permissao");
  const escudo = bloco(J, pm).itens.find((i) => i.chave === "escudo");
  const d1 = M({ acao: "goblins_operar", campanhaId: camp, opId: "gb-op-dano-01", operacao: { tipo: "dano", personagem: pm, acertos: 3, protecaoId: escudo.id, fonte: "Guarda" } });
  t.ok("ataque recebido com bloqueio: o escudo absorve 2, sobra 1", d1.ok && d1.dados.resultado.recebidos === 1);
  const bm = bloco(J, pm);
  t.ok("na ficha: 1 ferimento e o escudo em 0/2", bm.ferimentos === 1 && bm.itens.find((i) => i.chave === "escudo").durabilidade.atual === 0);
  t.ok("repetido: não aplica de novo", M({ acao: "goblins_operar", campanhaId: camp, opId: "gb-op-dano-01", operacao: { tipo: "dano", personagem: pm, acertos: 3 } }).repetida && bloco(J, pm).ferimentos === 1);
  t.recusa("goblin de fora da campanha: não", M({ acao: "goblins_operar", campanhaId: camp, opId: "gb-op-dano-02", operacao: { tipo: "dano", personagem: avulsa.dados.id, acertos: 1 } }), "nao_encontrado");
  const mo = M({ acao: "goblins_operar", campanhaId: camp, opId: "gb-op-dia-0001", operacao: { tipo: "momentos", momentos: [{ tipo: "novoDia" }] } });
  t.ok("dia novo para todos: descanso tira 1 ferimento", mo.ok && bloco(J, pm).ferimentos === 0 && bloco(J, pj).tempo.dia === 2);
  M({ acao: "goblins_operar", campanhaId: camp, opId: "gb-op-regras-01", operacao: { tipo: "regras", regras: { vozGoblin: true, niveisEpicos: true, adaptacoes: { cthulin: true } } } });
  const br = bloco(L, pl);
  t.ok("regras da campanha aplicadas às fichas", br.opcoes.vozGoblin && br.opcoes.niveisEpicos && br.opcoes.adaptacoes.cthulin && !br.opcoes.adaptacoes.vale);
  const pr = M({ acao: "goblins_operar", campanhaId: camp, opId: "gb-op-prog-001", operacao: { tipo: "progressao", personagem: pm, oponente: "Guarda" } });
  t.ok("progressão rolada no servidor (1 dado)", pr.ok && pr.dados.resultado.dados.length === 1);

  t.grupo("Goblins · o jogador age pelo próprio goblin");
  t.recusa("não age pelo goblin de outra pessoa", L({ acao: "goblins_operar", campanhaId: camp, opId: "gb-op-grito-01", operacao: { tipo: "gritoDeGuerra", quem: pj } }), "sem_permissao");
  let grito = null, tent = 0;
  while (tent < 30) {
    tent++;
    const r = J({ acao: "goblins_operar", campanhaId: camp, opId: "gb-op-grito-" + String(tent).padStart(3, "0"), operacao: { tipo: "gritoDeGuerra", quem: pj } });
    if (!r.ok) break;
    if (r.dados.resultado.sucesso) { grito = r; break; }
    M({ acao: "goblins_operar", campanhaId: camp, opId: "gb-op-diag-" + String(tent).padStart(3, "0"), operacao: { tipo: "momentos", momentos: [{ tipo: "novoDia" }] } });
  }
  t.ok("Grito de Guerra rolado no servidor; com 1 hit, os aliados ganham Combate +1", !!grito && bloco(L, pl).efeitos.some((e) => e.chave === "gritoDeGuerra") && bloco(J, pm).efeitos.some((e) => e.chave === "gritoDeGuerra"));
  t.ok("o líder não ganha o próprio grito", !bloco(J, pj).efeitos.some((e) => e.chave === "gritoDeGuerra"));
  t.recusa("1 vez por dia", J({ acao: "goblins_operar", campanhaId: camp, opId: "gb-op-grito-zzz", operacao: { tipo: "gritoDeGuerra", quem: pj } }), "dados_invalidos");
  const rol = M({ acao: "listar_rolagens", campanhaId: camp });
  t.ok("a rolagem do servidor entra no histórico da campanha", rol.ok && JSON.stringify(rol.dados).includes("Grito de Guerra"));

  const estAt = M({ acao: "ler_goblins", campanhaId: camp });
  const guarda = estAt.dados.estado.combate.participantes.find((p) => p.chave === "guarda");
  const espada = bloco(J, pm).itens.find((i) => i.chave === "espada");
  const at = J({ acao: "goblins_operar", campanhaId: camp, opId: "gb-op-ataq-001", operacao: { tipo: "atacarInimigo", quem: pm, alvo: guarda.id, pedido: { armaId: espada.id } } });
  t.ok("ataque contra um inimigo do Covil: rolado e aplicado no servidor", at.ok && typeof at.dados.resultado.ferimentos === "number");
  const depois = M({ acao: "ler_goblins", campanhaId: camp }).dados;
  t.ok("o Covil registra os ferimentos (rev subiu)", depois.estado.combate.participantes.find((p) => p.id === guarda.id).ferimentos === at.dados.resultado.ferimentos && depois.rev === estAt.rev + 1);
  t.ok("repetido: nem rola nem fere de novo", J({ acao: "goblins_operar", campanhaId: camp, opId: "gb-op-ataq-001", operacao: { tipo: "atacarInimigo", quem: pm, alvo: guarda.id, pedido: { armaId: espada.id } } }).repetida);
  t.recusa("alvo que não está no combate: não", J({ acao: "goblins_operar", campanhaId: camp, opId: "gb-op-ataq-002", operacao: { tipo: "atacarInimigo", quem: pm, alvo: "pa-nada", pedido: {} } }), "dados_invalidos");

  t.recusa("Implacável só no nível 3 (o servidor confere a ficha)", L({ acao: "goblins_operar", campanhaId: camp, opId: "gb-op-feri-001", operacao: { tipo: "conjurar", quem: pl, magia: "cura", implacavel: 2, aliados: [pm] } }), "dados_invalidos");
  t.recusa("magia que o Bruxo não escolheu: não", L({ acao: "goblins_operar", campanhaId: camp, opId: "gb-op-feri-002", operacao: { tipo: "conjurar", quem: pl, magia: "morte" } }), "dados_invalidos");
  M({ acao: "goblins_operar", campanhaId: camp, opId: "gb-op-dano-03", operacao: { tipo: "dano", personagem: pm, acertos: 2, automatico: true } });
  const cura = L({ acao: "goblins_operar", campanhaId: camp, opId: "gb-op-cura-001", operacao: { tipo: "conjurar", quem: pl, magia: "cura", aliados: [pm] } });
  const resC = cura.ok ? cura.dados.resultado.resultado : -1;
  const ferPm = bloco(J, pm).ferimentos;
  t.ok("Cura com alvo aliado: o servidor rola e aplica pelo resultado", cura.ok && ((resC === 1 && ferPm === 1) || (resC >= 2 && ferPm === 0) || (resC === 0 && ferPm === 2)));

  t.grupo("Goblins · trocar o sistema guarda o Covil");
  const sc = M({ acao: "ler_campanha", campanhaId: camp });
  M({ acao: "salvar_campanha", campanhaId: camp, rev: sc.rev, dados: { sistema: "ordem" } });
  t.recusa("numa campanha de Ordem o Covil não responde", M({ acao: "ler_goblins", campanhaId: camp }), "outro_sistema");
  const lg = M({ acao: "ler_campanha", campanhaId: camp }).dados;
  t.ok("e fica guardado (não apagado)", lg.guardadas.includes("covil"));
  const sc2 = M({ acao: "ler_campanha", campanhaId: camp });
  M({ acao: "salvar_campanha", campanhaId: camp, rev: sc2.rev, dados: { sistema: "goblins" } });
  t.ok("voltando a Goblins, o Covil volta como estava", M({ acao: "ler_goblins", campanhaId: camp }).dados.estado.combate.participantes.some((p) => p.chave === "guarda"));
}
