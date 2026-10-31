/* =====================================================================
   R.A.M.A. — testes do backend: a plataforma e os sistemas (v4.0)
   ---------------------------------------------------------------------
   O registro de sistemas (Sistemas.gs) e o que depende dele: o sistema
   de cada campanha, a regra de compatibilidade das campanhas antigas, a
   troca de sistema (que suspende sem apagar), as ferramentas de um
   sistema recusadas em campanha de outro, o cartão da mesa feito pelo
   módulo da ficha e um arquivo de sistema ausente. Dados sintéticos.
   Chamado por executar-backend.js.
   ===================================================================== */

export async function testarSistemasBackend({ t, preparar, novaConta, comoFn }) {
  const G = globalThis;

  t.grupo("Sistemas · o registro do servidor é o mesmo do site");
  const site = G.RAMASistemas;
  t.ok("o site e o servidor conhecem os mesmos sistemas, na mesma ordem",
    JSON.stringify(site.lista().map((s) => s.id)) === JSON.stringify(G.SISTEMAS_DO_RAMA.map((s) => s.id)));
  for (const s of G.SISTEMAS_DO_RAMA) {
    const c = site.de(s.id).campanha;
    t.ok("  " + s.id + ": as mesmas ferramentas e mecânicas de campanha",
      JSON.stringify(c.ferramentas) === JSON.stringify(s.ferramentas) && JSON.stringify(c.mecanicas.map((m) => m.chave)) === JSON.stringify(s.mecanicas));
  }
  t.ok("a mesma regra para fichas antigas", site.SISTEMA_DAS_FICHAS_ANTIGAS === G.SISTEMA_DAS_FICHAS_ANTIGAS);
  t.ok("nenhum sistema é o de todos: cada ferramenta de sistema tem um dono só",
    G.SISTEMAS_DO_RAMA.every((s) => s.mecanicas.every((m) => G.sistemaDaFerramenta(m) === s.id)));

  t.grupo("Sistemas · toda campanha nova diz o sistema");
  preparar();
  const mestra = novaConta("sis_mestra"), ana = novaConta("sis_ana"), fora = novaConta("sis_fora");
  const M = comoFn(mestra), A = comoFn(ana), F = comoFn(fora);
  t.recusa("sem sistema, a campanha não nasce (nenhum é suposto)", M({ acao: "criar_campanha", dados: { nome: "Sem sistema" } }), "dados_invalidos");
  t.recusa("um sistema que não existe também não", M({ acao: "criar_campanha", dados: { nome: "Futuro", sistema: "brutal" } }), "dados_invalidos");
  const uni = M({ acao: "criar_campanha", dados: { nome: "Livre", sistema: "Universal" } });
  t.ok("Universal é um sistema como os outros", uni.ok && uni.dados.sistema === "universal");
  const lu = M({ acao: "ler_campanha", campanhaId: uni.dados.id }).dados;
  t.ok("  ler_campanha diz o sistema, sem herança", lu.sistema === "universal" && lu.sistemaHerdado === false);
  t.ok("  com o combate do núcleo e sem as ferramentas de Ordem", lu.combate === true && lu.hexatombe === undefined && lu.condicoes === undefined);
  const ordem = M({ acao: "criar_campanha", dados: { nome: "A Ordem", sistema: "ordem" } }).dados.id;
  const lo = M({ acao: "ler_campanha", campanhaId: ordem }).dados;
  t.ok("Ordem: mecânicas opcionais desligadas, ferramentas de sempre ligadas", lo.hexatombe === false && lo.hacking === false && lo.perigos === false && lo.combate === true && lo.condicoes === true);
  t.ok("  e nada de Oblívio", lo.oblivio === undefined && lo.guardadas.length === 0);
  const lista = M({ acao: "listar_campanhas" }).dados;
  t.ok("a lista de campanhas diz o sistema de cada uma",
    lista.find((c) => c.id === ordem).sistema === "ordem" && lista.find((c) => c.id === uni.dados.id).sistema === "universal");

  t.grupo("Sistemas · campanha antiga: a regra de compatibilidade, explícita");
  function tirarSistema(id) {
    G.reiniciarExecucao();
    const reg = G.acharPor(G.ABAS.CAMPANHAS, "id", id);
    const d = JSON.parse(reg.dadosJson);
    delete d.sistema;
    reg.dadosJson = JSON.stringify(d);
    G.atualizarLinha(G.ABAS.CAMPANHAS, reg._linha, reg);
    G.reiniciarExecucao();
  }
  const antiga = M({ acao: "criar_campanha", dados: { nome: "De 2025", sistema: "ordem" } }).dados.id;
  tirarSistema(antiga);
  const la = M({ acao: "ler_campanha", campanhaId: antiga }).dados;
  t.ok("sem `sistema`: Ordem Paranormal, marcada como herdada", la.sistema === "ordem" && la.sistemaHerdado === true);
  t.ok("  as mecânicas de Ordem continuam onde estavam", la.hexatombe === false && la.combate === true);
  const antigaObl = M({ acao: "criar_campanha", dados: { nome: "Testemunha da v3", sistema: "ordem" } }).dados.id;
  tirarSistema(antigaObl);
  G.inserir(G.ABAS.CAMPANHA_OBLIVIO, { campanhaId: antigaObl, ativo: true, atualizadoEm: new Date().toISOString(), rev: 1, opsJson: "[]", dadosJson: "{}" });
  G.reiniciarExecucao();
  const lv3 = M({ acao: "ler_campanha", campanhaId: antigaObl }).dados;
  t.ok("com a mesa de Oblívio ligada na v3.0: Oblívio, herdado", lv3.sistema === "oblivio" && lv3.sistemaHerdado === true && lv3.oblivio === true);
  t.ok("ler não grava nada", JSON.parse(G.acharPor(G.ABAS.CAMPANHAS, "id", antiga).dadosJson).sistema === undefined);
  const sa = M({ acao: "ler_campanha", campanhaId: antiga });
  M({ acao: "salvar_campanha", campanhaId: antiga, rev: sa.rev, dados: { descricao: "agora com sistema" } });
  const depois = M({ acao: "ler_campanha", campanhaId: antiga }).dados;
  t.ok("salvar as configurações escreve o sistema que ela já usava", depois.sistema === "ordem" && depois.sistemaHerdado === false);

  t.grupo("Sistemas · trocar o sistema suspende, não apaga");
  M({ acao: "salvar_participantes", campanhaId: ordem, membros: [{ userId: ana.id, papel: "jogador" }] });
  const fichaOrdem = { nome: "Agente Ana", tipoFicha: "ordem", schemaVersion: 24,
    ordem: { classe: "combatente", nex: 5, recursos: { pv: 10, pe: null, san: null, pd: null } }, resumoRecursos: { pv: 20, pe: 5, san: 12, pd: null } };
  const pAna = A({ acao: "criar_personagem", dados: fichaOrdem }).dados.id;
  A({ acao: "vincular_personagem", campanhaId: ordem, personagemId: pAna });
  const H = G.RAMAHexatombe;
  const e = H.vazio();
  H.ligar(e, true);
  H.salvarEquipe(e, { id: "eqA", nome: "Mascarados" });
  t.ok("Hexatombe ligado na campanha de Ordem", M({ acao: "salvar_hexatombe", campanhaId: ordem, rev: 0, opId: "sis-hex-liga-aaaa", estado: e }).ok);
  const combate = M({ acao: "salvar_combate", campanhaId: ordem, dados: { nome: "Emboscada" } });
  t.ok("e um combate em andamento", combate.ok);

  const rv = M({ acao: "ler_campanha", campanhaId: ordem }).rev;
  t.recusa("jogadora não troca o sistema", A({ acao: "salvar_campanha", campanhaId: ordem, rev: rv, dados: { sistema: "oblivio" } }), "sem_permissao");
  t.recusa("um sistema desconhecido é recusado", M({ acao: "salvar_campanha", campanhaId: ordem, rev: rv, dados: { sistema: "brutal" } }), "dados_invalidos");
  const troca = M({ acao: "salvar_campanha", campanhaId: ordem, rev: rv, dados: { sistema: "oblivio" } });
  t.ok("a mestra troca para Oblívio", troca.ok && troca.dados.sistema === "oblivio");
  const lt = A({ acao: "ler_campanha", campanhaId: ordem }).dados;
  t.ok("  a campanha passa a ter a mesa da Testemunha", lt.sistema === "oblivio" && lt.oblivio === true);
  t.ok("  e as ferramentas de Ordem somem", lt.hexatombe === undefined && lt.combate === undefined && lt.condicoes === undefined);
  t.ok("  o Hexatombe aparece como guardado", lt.guardadas.indexOf("hexatombe") >= 0);
  t.recusa("  ler o Hexatombe responde que é de outro sistema", M({ acao: "ler_hexatombe", campanhaId: ordem }), "outro_sistema");
  t.recusa("  gravar também", M({ acao: "salvar_hexatombe", campanhaId: ordem, rev: 1, opId: "sis-hex-grava-aaaa", estado: e }), "outro_sistema");
  t.recusa("  o combate do núcleo não é de Oblívio", M({ acao: "salvar_combate", campanhaId: ordem, dados: { nome: "Outra" } }), "outro_sistema");
  t.ok("  o estado do Hexatombe continua na planilha", !!G.acharPor(G.ABAS.CAMPANHA_HEXATOMBE, "campanhaId", ordem));
  t.ok("  o combate também", M({ acao: "listar_combates", campanhaId: ordem }).dados.length === 1);
  const fa = A({ acao: "ler_personagem", personagemId: pAna }).dados;
  t.ok("  a ficha de Ordem não foi convertida nem desvinculada", fa.tipoFicha === "ordem" && fa.ordem.classe === "combatente" && fa.campanhaId === ordem);
  const cartao = M({ acao: "listar_personagens_campanha", campanhaId: ordem }).dados.find((p) => p.id === pAna);
  t.ok("  e o cartão dela continua o de Ordem", cartao && cartao.tipoFicha === "ordem" && !!cartao.ordem);
  t.ok("  a mesa de Oblívio responde", M({ acao: "ler_oblivio", campanhaId: ordem }).ok);
  const lm = M({ acao: "ler_oblivio", campanhaId: ordem });
  t.ok("  e grava", M({ acao: "salvar_oblivio", campanhaId: ordem, rev: lm.rev, opId: "sis-obl-grava-aa", estado: lm.dados.estado }).ok);

  const rv2 = M({ acao: "ler_campanha", campanhaId: ordem }).rev;
  M({ acao: "salvar_campanha", campanhaId: ordem, rev: rv2, dados: { sistema: "ordem" } });
  const volta = M({ acao: "ler_campanha", campanhaId: ordem }).dados;
  t.ok("voltando a Ordem, o Hexatombe volta ligado", volta.sistema === "ordem" && volta.hexatombe === true && volta.combate === true);
  const hx = M({ acao: "ler_hexatombe", campanhaId: ordem });
  t.ok("  com o estado de antes", hx.ok && hx.dados.estado.equipes.length === 1 && hx.dados.estado.equipes[0].nome === "Mascarados");
  t.ok("  e a mesa de Oblívio fica guardada", volta.guardadas.indexOf("oblivio") >= 0);
  t.recusa("  ler_oblivio agora é de outro sistema", M({ acao: "ler_oblivio", campanhaId: ordem }), "outro_sistema");
  t.ok("  o combate de antes volta a andar", M({ acao: "salvar_combate", campanhaId: ordem, dados: { nome: "Segunda emboscada" } }).ok);

  t.grupo("Sistemas · o cartão da mesa é do sistema da ficha");
  const pUni = A({ acao: "criar_personagem", dados: { nome: "Livre", tipoFicha: "universal", atributos: [{ id: "a1", nome: "Força", sigla: "FOR", valor: 2 }], status: [{ id: "s1", nome: "Vida", atual: 3, maximo: 5 }] } }).dados.id;
  const pFut = A({ acao: "criar_personagem", dados: { nome: "Do futuro", tipoFicha: "brutal", atributos: [{ id: "a2", nome: "Raiva", valor: 9 }] } }).dados.id;
  A({ acao: "vincular_personagem", campanhaId: ordem, personagemId: pUni });
  A({ acao: "vincular_personagem", campanhaId: ordem, personagemId: pFut });
  const mesa = M({ acao: "listar_personagens_campanha", campanhaId: ordem }).dados;
  const cUni = mesa.find((p) => p.id === pUni), cFut = mesa.find((p) => p.id === pFut);
  t.ok("ficha Universal: atributos e status, pelo módulo Universal", cUni.tipoFicha === "universal" && cUni.atributos.length === 1 && cUni.status[0].atual === 3);
  t.ok("ficha de um sistema que esta versão não conhece: só a identificação", cFut.tipoFicha === "brutal" && cFut.atributos === undefined && cFut.status === undefined);
  t.ok("  nunca vira Universal", cFut.tipoFicha !== "universal");
  t.recusa("ajuste de recurso é de Ordem: numa ficha Universal, recusado",
    M({ acao: "ajustar_personagem", campanhaId: ordem, personagemId: pUni, rev: A({ acao: "ler_personagem", personagemId: pUni }).rev, alvo: "recurso", itemId: "pv", campo: "atual", valor: 1, operacaoId: "sis-aj-1-aaaaaaa" }), "dados_invalidos");
  const revAna = A({ acao: "ler_personagem", personagemId: pAna }).rev;
  t.ok("numa ficha de Ordem, aceito", M({ acao: "ajustar_personagem", campanhaId: ordem, personagemId: pAna, rev: revAna, alvo: "recurso", itemId: "pv", campo: "atual", valor: 7, operacaoId: "sis-aj-2-aaaaaaa" }).ok);
  t.recusa("quem é de fora não troca o sistema de ninguém", F({ acao: "salvar_campanha", campanhaId: ordem, rev: 99, dados: { sistema: "universal" } }), "nao_encontrado");

  t.grupo("Sistemas · um arquivo de sistema ausente não derruba o núcleo");
  const guardada = G.sistemaOrdem;
  G.sistemaOrdem = undefined;
  G.CACHE_ROTAS = null;
  try {
    t.recusa("sem Ordem.gs, as ações de Ordem não existem", M({ acao: "ler_hexatombe", campanhaId: ordem }), "acao_desconhecida");
    const semModulo = M({ acao: "listar_personagens_campanha", campanhaId: ordem });
    const c = semModulo.ok && semModulo.dados.find((p) => p.id === pAna);
    t.ok("  a ficha de Ordem aparece na mesa, identificada, sem números inventados", !!c && c.tipoFicha === "ordem" && c.ordem === undefined && c.atributos === undefined);
    t.ok("  e abre normalmente", A({ acao: "ler_personagem", personagemId: pAna }).dados.ordem.classe === "combatente");
    t.ok("  o resto da campanha funciona", M({ acao: "ler_campanha", campanhaId: ordem }).ok && M({ acao: "listar_rolagens", campanhaId: ordem }).ok);
  } finally {
    G.sistemaOrdem = guardada;
    G.CACHE_ROTAS = null;
  }
  t.ok("com o arquivo de volta, tudo volta", M({ acao: "ler_hexatombe", campanhaId: ordem }).ok);

  t.grupo("Suplementos · o cadastro do servidor é o mesmo do site");
  const SUP = G.RAMASuplementos;
  t.ok("os mesmos suplementos de Ordem, com as mesmas fontes",
    JSON.stringify(SUP.doSistema("ordem").map((s) => [s.id, s.fontes])) === JSON.stringify(G.SUPLEMENTOS_DO_RAMA.ordem.map((s) => [s.id, s.fontes])));
  t.ok("e as mesmas ferramentas de suplemento",
    G.SUPLEMENTOS_DO_RAMA.ordem.every((s) => s.ferramentas.every((f) => SUP.daFerramenta("ordem", f).id === s.id)) &&
    Object.keys(SUP.FERRAMENTAS.ordem).every((f) => G.suplementoDaFerramenta("ordem", f).id === SUP.FERRAMENTAS.ordem[f]));

  t.grupo("Suplementos · a campanha guarda por sistema");
  const camp = M({ acao: "criar_campanha", dados: { nome: "Mesa sup", sistema: "ordem" } }).dados.id;
  M({ acao: "salvar_participantes", campanhaId: camp, membros: [{ userId: ana.id, papel: "jogador" }] });
  const l0 = M({ acao: "ler_campanha", campanhaId: camp });
  t.ok("campanha nova: sem escolha (todos permitidos)", l0.ok && JSON.stringify(l0.dados.suplementos) === "{}");
  t.recusa("jogadora não muda os suplementos da mesa", A({ acao: "salvar_campanha", campanhaId: camp, rev: l0.rev, dados: { suplementos: { sistema: "ordem", ids: [] } } }), "sem_permissao");
  t.recusa("sistema sem suplementos: recusado", M({ acao: "salvar_campanha", campanhaId: camp, rev: l0.rev, dados: { suplementos: { sistema: "goblins", ids: [] } } }), "dados_invalidos");
  const s1 = M({ acao: "salvar_campanha", campanhaId: camp, rev: l0.rev, dados: { suplementos: { sistema: "ordem", ids: ["ordem.sah", "ordem.zzz"] } } });
  t.ok("o mestre grava (ids desconhecidos saem)", s1.ok && JSON.stringify(s1.dados.suplementos) === JSON.stringify({ ordem: ["ordem.sah"] }));
  t.ok("todo membro lê o que a mesa permite", JSON.stringify(A({ acao: "ler_campanha", campanhaId: camp }).dados.suplementos) === JSON.stringify({ ordem: ["ordem.sah"] }));
  t.ok("a lista de campanhas também traz", A({ acao: "listar_campanhas" }).dados.find((c) => c.id === camp).suplementos.ordem[0] === "ordem.sah");
  const r2 = M({ acao: "ler_campanha", campanhaId: camp }).rev;
  M({ acao: "salvar_campanha", campanhaId: camp, rev: r2, dados: { sistema: "universal" } });
  const r3 = M({ acao: "ler_campanha", campanhaId: camp });
  t.ok("trocar o sistema guarda a escolha do outro", JSON.stringify(r3.dados.suplementos) === JSON.stringify({ ordem: ["ordem.sah"] }));
  M({ acao: "salvar_campanha", campanhaId: camp, rev: r3.rev, dados: { sistema: "ordem" } });
  const r4 = M({ acao: "ler_campanha", campanhaId: camp }).rev;
  const vazio = M({ acao: "salvar_campanha", campanhaId: camp, rev: r4, dados: { suplementos: { sistema: "ordem", ids: [] } } });
  t.ok("lista vazia fica vazia (só o livro básico), não vira 'todos'", vazio.ok && Array.isArray(vazio.dados.suplementos.ordem) && vazio.dados.suplementos.ordem.length === 0);

  t.grupo("Suplementos · ferramentas da mesa: habilitar não liga, desligar trava");
  const eh = G.RAMAHexatombe.vazio();
  G.RAMAHexatombe.ligar(eh, true);
  t.recusa("AS2 desligado: o Hexatombe não inicia", M({ acao: "salvar_hexatombe", campanhaId: camp, rev: 0, opId: "sup-hex-0000001", estado: eh }), "suplemento_desligado");
  const r5 = M({ acao: "ler_campanha", campanhaId: camp });
  t.ok("e a mecânica continua desligada", r5.dados.hexatombe === false);
  M({ acao: "salvar_campanha", campanhaId: camp, rev: r5.rev, dados: { suplementos: { sistema: "ordem", ids: ["ordem.as2"] } } });
  t.ok("AS2 ligado: a mecânica fica disponível, ainda desligada", M({ acao: "ler_campanha", campanhaId: camp }).dados.hexatombe === false);
  t.ok("e o mestre pode iniciar", M({ acao: "salvar_hexatombe", campanhaId: camp, rev: 0, opId: "sup-hex-0000002", estado: eh }).ok);
  const r6 = M({ acao: "ler_campanha", campanhaId: camp }).rev;
  M({ acao: "salvar_campanha", campanhaId: camp, rev: r6, dados: { suplementos: { sistema: "ordem", ids: [] } } });
  t.ok("desligado depois: o estado continua legível", M({ acao: "ler_hexatombe", campanhaId: camp }).ok);
  t.recusa("mas novas operações não", M({ acao: "salvar_hexatombe", campanhaId: camp, rev: 1, opId: "sup-hex-0000003", estado: eh }), "suplemento_desligado");
  const desligar = JSON.parse(JSON.stringify(M({ acao: "ler_hexatombe", campanhaId: camp }).dados.estado || eh));
  desligar.ativo = false;
  t.ok("desligar a mecânica continua permitido", M({ acao: "salvar_hexatombe", campanhaId: camp, rev: 1, opId: "sup-hex-0000004", estado: desligar }).ok);
  t.ok("campanha antiga (sem o campo): ferramentas como antes", M({ acao: "ler_hexatombe", campanhaId: ordem }).ok);
}
