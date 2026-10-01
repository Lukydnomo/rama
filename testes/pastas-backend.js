/* =====================================================================
   R.A.M.A. — testes do backend: pastas e sistema na página Personagens
   (v2.26). Dados sintéticos. Chamado por executar-backend.js.
   ===================================================================== */

export function testarPastasBackend({ t, preparar, novaConta, comoFn, ambiente }) {
  t.grupo("Pastas · criar, renomear, excluir e mover");
  preparar();
  const ana = novaConta("pasta_ana"), beto = novaConta("pasta_beto");
  const A = comoFn(ana), B = comoFn(beto);

  const ficha = (nome, extra) => Object.assign({ nome, atributos: [], status: [] }, extra || {});
  const pOrdem = A({ acao: "criar_personagem", dados: ficha("Ordem", { tipoFicha: "ordem", ordem: { classe: "combatente" } }) }).dados.id;
  const pUni = A({ acao: "criar_personagem", dados: ficha("Uni", { tipoFicha: "universal" }) }).dados.id;
  const pAntiga = A({ acao: "criar_personagem", dados: ficha("Antiga") }).dados.id;
  const pFutura = A({ acao: "criar_personagem", dados: ficha("Futura", { tipoFicha: "Tormenta20" }) }).dados.id;
  const pBeto = B({ acao: "criar_personagem", dados: ficha("Do Beto", { tipoFicha: "universal" }) }).dados.id;

  const listar = (como) => como({ acao: "listar_personagens" });
  const de = (r, id) => (r.dados || []).find((p) => p.id === id);

  let l = listar(A);
  t.ok("a listagem traz a organização disponível e sem pastas", l.ok && l.organizacao && l.organizacao.disponivel === true && l.organizacao.pastas.length === 0);
  t.igual("sistema da ficha de Ordem", de(l, pOrdem).sistema, "ordem");
  t.igual("sistema da universal", de(l, pUni).sistema, "universal");
  t.igual("ficha antiga, sem tipoFicha: vazio (o site trata como universal)", de(l, pAntiga).sistema, "");
  t.igual("identificador desconhecido fica como veio (aparado)", de(l, pFutura).sistema, "tormenta20");
  t.ok("todas começam sem pasta", l.dados.every((p) => p.pastaId === null));
  t.ok("a listagem não traz a ficha", l.dados.every((p) => p.fichaJson === undefined && p.ordem === undefined && p.atributos === undefined));
  t.ok("só as fichas da conta", l.dados.length === 4 && !de(l, pBeto));
  t.igual("a ficha desconhecida não é alterada", A({ acao: "ler_personagem", personagemId: pFutura }).dados.tipoFicha, "Tormenta20");

  /* Criar */
  const op = "op-pasta-criacao-1";
  const c1 = A({ acao: "criar_pasta", nome: "  Campanha   de sábado ", operacaoId: op });
  t.ok("criar pasta responde com id e nome normalizado", c1.ok && !!c1.dados.id && c1.dados.nome === "Campanha de sábado");
  const c1b = A({ acao: "criar_pasta", nome: "Campanha de sábado", operacaoId: op });
  t.ok("a mesma criação repetida devolve a mesma pasta", c1b.ok && c1b.dados.id === c1.dados.id && c1b.repetida === true);
  t.igual("  e não cria outra", listar(A).organizacao.pastas.length, 1);
  t.recusa("nome repetido (sem diferenciar maiúsculas) é recusado", A({ acao: "criar_pasta", nome: "CAMPANHA DE SÁBADO", operacaoId: "op-pasta-criacao-2" }), "pasta_repetida");
  t.recusa("nome vazio é recusado", A({ acao: "criar_pasta", nome: "   " }), "dados_invalidos");
  t.recusa("nome longo demais é recusado", A({ acao: "criar_pasta", nome: "x".repeat(61) }), "dados_invalidos");
  t.recusa("nome que não é texto é recusado", A({ acao: "criar_pasta", nome: { a: 1 } }), "dados_invalidos");
  const pasta = c1.dados.id;
  const outra = A({ acao: "criar_pasta", nome: "Arquivo morto" }).dados.id;
  const doBeto = B({ acao: "criar_pasta", nome: "Pasta do Beto" }).dados.id;
  t.iguais("cada conta vê só as suas pastas", listar(B).organizacao.pastas.map((p) => p.nome), ["Pasta do Beto"]);

  /* Mover */
  const antes = A({ acao: "ler_personagem", personagemId: pOrdem });
  const m1 = A({ acao: "mover_personagem", personagemId: pOrdem, pastaId: pasta });
  t.ok("mover para a pasta", m1.ok && m1.dados.pastaId === pasta);
  A({ acao: "mover_personagem", personagemId: pUni, pastaId: pasta });
  l = listar(A);
  t.igual("a listagem mostra a pasta", de(l, pOrdem).pastaId, pasta);
  t.igual("  só os movidos mudaram", de(l, pAntiga).pastaId, null);
  const depois = A({ acao: "ler_personagem", personagemId: pOrdem });
  t.ok("mover não mexe na revisão nem no conteúdo", depois.rev === antes.rev && JSON.stringify(depois.dados) === JSON.stringify(antes.dados));
  t.ok("  nem nas datas e na campanha da listagem", de(l, pOrdem).criadoEm === de(listar(A), pOrdem).criadoEm && de(l, pOrdem).campanhaId === null);
  t.ok("mover de novo para o mesmo lugar é inofensivo", A({ acao: "mover_personagem", personagemId: pOrdem, pastaId: pasta }).ok);

  t.recusa("mover para a pasta de outra conta", A({ acao: "mover_personagem", personagemId: pAntiga, pastaId: doBeto }), "pasta_nao_encontrada");
  t.recusa("mover para uma pasta inexistente", A({ acao: "mover_personagem", personagemId: pAntiga, pastaId: "pasta-que-nao-existe" }), "pasta_nao_encontrada");
  t.recusa("mover o personagem de outra conta", A({ acao: "mover_personagem", personagemId: pBeto, pastaId: pasta }), "nao_encontrado");
  t.recusa("id malformado é recusado", A({ acao: "mover_personagem", personagemId: pAntiga, pastaId: "a b" }), "dados_invalidos");
  t.igual("a ficha do outro continua sem pasta", de(listar(B), pBeto).pastaId, null);

  /* Salvar depois de mover não traz a pasta antiga de volta */
  const salvo = A({ acao: "salvar_personagem", personagemId: pOrdem, rev: antes.rev, dados: Object.assign({}, antes.dados, { nome: "Ordem renomeada" }) });
  t.ok("a ficha lida antes de mover ainda grava", salvo.ok);
  t.igual("  e a pasta continua a de depois do movimento", de(listar(A), pOrdem).pastaId, pasta);

  /* Renomear */
  const r1 = A({ acao: "renomear_pasta", pastaId: pasta, nome: "Sábado à noite" });
  t.ok("renomear mantém o id", r1.ok && r1.dados.id === pasta && r1.dados.nome === "Sábado à noite");
  t.igual("  e os vínculos", de(listar(A), pUni).pastaId, pasta);
  t.recusa("renomear para um nome de outra pasta", A({ acao: "renomear_pasta", pastaId: pasta, nome: "arquivo morto" }), "pasta_repetida");
  t.ok("renomear para o próprio nome com outra caixa é aceito", A({ acao: "renomear_pasta", pastaId: pasta, nome: "SÁBADO À NOITE" }).ok);
  t.recusa("outra conta não renomeia", B({ acao: "renomear_pasta", pastaId: pasta, nome: "Invadida" }), "nao_encontrado");

  /* Retirar */
  A({ acao: "mover_personagem", personagemId: pUni, pastaId: null });
  t.igual("retirar da pasta volta para Sem pasta", de(listar(A), pUni).pastaId, null);

  /* Duplicar */
  const copia = A({ acao: "duplicar_personagem", personagemId: pOrdem, operacaoId: "op-dup-pasta-1" }).dados.id;
  l = listar(A);
  t.ok("a cópia tem id novo", copia && copia !== pOrdem);
  t.igual("  fica na mesma pasta", de(l, copia).pastaId, pasta);
  t.igual("  com o mesmo sistema", de(l, copia).sistema, "ordem");
  t.igual("  sem criar pasta", l.organizacao.pastas.length, 2);

  /* Mestre de mesa não reorganiza pastas do jogador */
  const mesa = A({ acao: "criar_campanha", dados: { nome: "Mesa das pastas" } }).dados.id;
  A({ acao: "salvar_participantes", campanhaId: mesa, membros: [{ userId: beto.id, papel: "jogador" }] });
  B({ acao: "vincular_personagem", campanhaId: mesa, personagemId: pBeto });
  t.recusa("a mestra não move a ficha do jogador para a pasta dela", A({ acao: "mover_personagem", personagemId: pBeto, pastaId: pasta }), "nao_encontrado");
  t.recusa("  nem para Sem pasta", A({ acao: "mover_personagem", personagemId: pBeto, pastaId: null }), "nao_encontrado");
  t.recusa("  nem exclui a pasta dele", A({ acao: "excluir_pasta", pastaId: doBeto }), "nao_encontrado");

  /* Excluir a pasta */
  t.recusa("outra conta não exclui", B({ acao: "excluir_pasta", pastaId: pasta }), "nao_encontrado");
  const ex = A({ acao: "excluir_pasta", pastaId: pasta });
  t.ok("excluir a pasta conta quantos voltaram para Sem pasta", ex.ok && ex.dados.liberados === 2);
  l = listar(A);
  t.ok("  os personagens continuam, sem pasta", de(l, pOrdem) && de(l, copia) && de(l, pOrdem).pastaId === null && de(l, copia).pastaId === null);
  t.igual("  a pasta saiu", l.organizacao.pastas.map((p) => p.id).indexOf(pasta), -1);
  t.igual("  as outras ficam", l.organizacao.pastas.length, 1);
  t.recusa("excluir de novo responde que não existe", A({ acao: "excluir_pasta", pastaId: pasta }), "nao_encontrado");

  /* Excluir o personagem leva a linha do índice */
  A({ acao: "mover_personagem", personagemId: pAntiga, pastaId: outra });
  A({ acao: "excluir_personagem", personagemId: pAntiga });
  const linhas = indiceDaConta({ id: ana.id }).filter((x) => x.personagemId === pAntiga);
  t.igual("excluir o personagem tira a linha do índice", linhas.length, 0);
  t.ok("  e a pasta continua", listar(A).organizacao.pastas.some((p) => p.id === outra));

  t.grupo("Pastas · fichas anteriores ao índice e listagem leve");
  /* Simula fichas de antes da v2.26: sem linha no índice. */
  indiceDaConta({ id: ana.id }).sort((a, b) => b._linha - a._linha).forEach((x) => apagarLinha(ABAS.PERSONAGENS_ORGANIZACAO, x._linha));
  const original = globalThis.lerFichasDosPersonagens;
  let lidas = 0;
  globalThis.lerFichasDosPersonagens = (regs) => { lidas += regs.length; return original(regs); };
  l = listar(A);
  t.ok("ficha sem índice aparece, com o sistema lido dela", de(l, pOrdem).sistema === "ordem" && de(l, pFutura).sistema === "tormenta20");
  t.ok("  e sem pasta", l.dados.every((p) => p.pastaId === null));
  t.ok("  o sistema foi lido uma vez", lidas === l.dados.length);
  lidas = 0;
  listar(A); listar(A);
  t.igual("a partir daí a listagem não abre ficha nenhuma", lidas, 0);
  globalThis.lerFichasDosPersonagens = original;
  t.igual("o índice tem uma linha por ficha, sem duplicar", indiceDaConta({ id: ana.id }).length, l.dados.length);

  t.grupo("Pastas · planilha sem as abas novas (setupRama ainda não rodou)");
  const folha = ambiente.planilha.getSheetByName("PASTAS");
  ambiente.planilha.deleteSheet(folha);
  reiniciarExecucao();
  l = listar(A);
  t.ok("a listagem continua funcionando", l.ok && l.dados.length >= 3);
  t.igual("  e diz que a organização não está disponível", l.organizacao.disponivel, false);
  t.recusa("criar pasta avisa a instalação incompleta", A({ acao: "criar_pasta", nome: "Nova" }), "instalacao_incompleta");
  t.ok("criar personagem não falha por causa do índice", A({ acao: "criar_personagem", dados: ficha("Sem índice", { tipoFicha: "universal" }) }).ok);
  setupRama();
  t.ok("setupRama recria a aba, sem apagar o índice", listar(A).organizacao.disponivel === true && indiceDaConta({ id: ana.id }).length >= 3);
}
