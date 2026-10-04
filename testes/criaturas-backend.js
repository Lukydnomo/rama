/* =====================================================================
   R.A.M.A. — testes do backend: criaturas (v2.28)
   ---------------------------------------------------------------------
   Combate grande em blocos, a operação criatura_instancia, o que o
   jogador NÃO recebe, a imagem do turno de uma criatura do catálogo e o
   resumo do Homebrew. Dados sintéticos — nenhuma ficha do livro aqui.
   Chamado por executar-backend.js.
   ===================================================================== */

export function testarCriaturasBackend({ t, preparar, novaConta, comoFn, ambiente }) {
  const folhaDe = (nome) => ambiente.planilha.getSheetByName(nome);
  const colunaDe = (aba, nome) => folhaDe(aba).linhas[0].indexOf(nome);
  const linhasDe = (aba) => folhaDe(aba).linhas.slice(1);
  let contador = 0;
  const op = () => "op-criatura-" + (++contador) + "-" + "x".repeat(8);

  /* Uma criatura de Ordem sintética, gorda o bastante para que poucas
     estourem a célula do combate. */
  function criaturaSintetica(n) {
    return {
      tipo: "criatura", sistema: "ordem", versao: 2, nome: "Sintética " + n, visibilidade: "privado",
      natureza: "paranormal", categoria: "", descricao: "D".repeat(3000),
      origem: { tipo: "catalogo", catalogoId: "op.criatura.teste-sintetico", livro: "OPRPG", pagina: 1 },
      status: [{ id: "vida", nome: "Pontos de vida", atual: 100, maximo: 100 }],
      atributos: [], pericias: [], ataques: [], habilidades: [],
      acoes: [0, 1, 2].map((i) => ({ id: "a" + i, tipo: "padrao", nome: "Ação " + i, texto: "T".repeat(2500), ataques: [], rolagens: [] })),
      ordem: { vd: 100, elementos: ["sangue"], tipo: "Criatura", tamanho: "Médio",
        estados: [{ id: "fase", nome: "Fase", maximo: 3, inicial: 0 }], enigma: { texto: "segredo do enigma", efeito: "x", altera: null, rolagens: [] } },
      instancia: { estados: {}, usos: {}, marcadores: {}, enigma: false, nota: "" },
    };
  }

  t.grupo("Criaturas · combate grande vai para blocos, e volta");
  preparar();
  const mestra = novaConta("cria_mestra"), lia = novaConta("cria_lia"), intrusa = novaConta("cria_intrusa");
  const M = comoFn(mestra), L = comoFn(lia), I = comoFn(intrusa);
  const mesa = M({ acao: "criar_campanha", dados: { nome: "Bestiário" } }).dados.id;
  M({ acao: "salvar_participantes", campanhaId: mesa, membros: [{ userId: lia.id, papel: "jogador" }] });

  const participantes = [1, 2, 3, 4, 5].map((n) => ({ id: "cr-" + n, tipo: "criatura", origemId: "op.criatura.teste-sintetico", nome: "Sintética #" + n, ordem: n, snapshot: criaturaSintetica(n) }));
  const tamanho = JSON.stringify(participantes).length;
  t.ok("(o combate sintético passa de uma célula)", tamanho > 45000);
  const salvo = M({ acao: "salvar_combate", campanhaId: mesa, dados: { nome: "Grande", estado: "preparando", visiveis: [lia.id], participantes } });
  t.ok("salvar um combate maior que a célula funciona", salvo.ok);
  const combate = salvo.dados.id;
  let rev = salvo.rev;
  const linhaDoCombate = () => linhasDe("CAMPANHA_COMBATES").find((l) => l[colunaDe("CAMPANHA_COMBATES", "id")] === combate);
  const manifesto = () => { const v = linhaDoCombate()[colunaDe("CAMPANHA_COMBATES", "armazenamento")]; return v ? JSON.parse(v) : null; };
  const blocos = () => linhasDe("CAMPANHA_COMBATES_BLOCOS").filter((l) => l[0] === combate);
  t.ok("  o manifesto aponta os blocos", !!manifesto() && manifesto().formato === "blocos" && manifesto().blocos >= 2);
  t.ok("  e a célula do combate guarda só um aviso", String(linhaDoCombate()[colunaDe("CAMPANHA_COMBATES", "dadosJson")]).length < 200);
  const daMestra = () => M({ acao: "listar_combates", campanhaId: mesa }).dados.find((c) => c.id === combate);
  t.igual("a mestra lê o combate inteiro de volta", JSON.stringify(daMestra().participantes.map((p) => p.snapshot)), JSON.stringify(participantes.map((p) => p.snapshot)));

  const operar = (ops, como) => {
    const r = (como || M)({ acao: "atualizar_combate", campanhaId: mesa, combateId: combate, rev, opId: op(), ops });
    if (r.ok) rev = r.rev;
    return r;
  };
  t.ok("vida de uma ocorrência muda em blocos", operar([{ tipo: "criatura_status", participanteId: "cr-2", statusId: "vida", valor: 40 }]).ok);
  t.ok("estado da ocorrência (criatura_instancia) muda", operar([
    { tipo: "criatura_instancia", participanteId: "cr-2", chave: "estado:fase", valor: 2 },
    { tipo: "criatura_instancia", participanteId: "cr-2", chave: "enigma", valor: true },
    { tipo: "criatura_instancia", participanteId: "cr-2", chave: "uso:a1", valor: 1 },
    { tipo: "criatura_instancia", participanteId: "cr-2", chave: "marcador:a0", valor: true },
    { tipo: "criatura_instancia", participanteId: "cr-2", chave: "nota", valor: "  caída  " },
  ]).ok);
  const dois = daMestra().participantes.find((p) => p.id === "cr-2").snapshot;
  const tres = daMestra().participantes.find((p) => p.id === "cr-3").snapshot;
  t.iguais("  só nela", [dois.status[0].atual, dois.instancia, tres.status[0].atual, tres.instancia],
    [40, { estados: { fase: 2 }, usos: { a1: 1 }, marcadores: { a0: true }, enigma: true, nota: "caída" }, 100, { estados: {}, usos: {}, marcadores: {}, enigma: false, nota: "" }]);
  const geracoes = () => new Set(blocos().map((l) => l[1])).size;
  for (let i = 0; i < 6; i++) operar([{ tipo: "criatura_status", participanteId: "cr-1", statusId: "vida", valor: 90 - i }]);
  t.ok("muitas gravações não fazem a aba crescer: no máximo duas gerações vivas", geracoes() <= 2);
  const linhasNaAba = folhaDe("CAMPANHA_COMBATES_BLOCOS").linhas.length;
  for (let i = 0; i < 4; i++) operar([{ tipo: "criatura_status", participanteId: "cr-1", statusId: "vida", valor: 50 + i }]);
  t.igual("  e as linhas da aba são reaproveitadas", folhaDe("CAMPANHA_COMBATES_BLOCOS").linhas.length, linhasNaAba);

  t.grupo("Criaturas · a operação criatura_instancia é conferida no servidor");
  const recusa = (ops, nome) => { const r = operar(ops); t.ok(nome, !r.ok && r.erro === "dados_invalidos", JSON.stringify(r).slice(0, 120)); };
  recusa([{ tipo: "criatura_instancia", participanteId: "cr-2", chave: "estado:fase", valor: 9 }], "estado acima do máximo");
  recusa([{ tipo: "criatura_instancia", participanteId: "cr-2", chave: "estado:inexistente", valor: 1 }], "estado que a ficha não tem");
  recusa([{ tipo: "criatura_instancia", participanteId: "cr-2", chave: "uso:a1", valor: 1.5 }], "uso quebrado");
  recusa([{ tipo: "criatura_instancia", participanteId: "cr-2", chave: "marcador:a0", valor: "sim" }], "marcador que não é booleano");
  recusa([{ tipo: "criatura_instancia", participanteId: "cr-2", chave: "outra:coisa", valor: 1 }], "chave desconhecida");
  recusa([{ tipo: "criatura_instancia", participanteId: "cr-2", chave: "uso:<b>", valor: 1 }], "chave com caracteres fora do formato");
  t.ok("ocorrência que já saiu: o ajuste é ignorado, o lote passa", operar([{ tipo: "criatura_instancia", participanteId: "cr-sumiu", chave: "enigma", valor: true }]).ok);
  t.ok("jogador não mexe na ocorrência", !operar([{ tipo: "criatura_instancia", participanteId: "cr-2", chave: "enigma", valor: false }], L).ok);

  t.grupo("Criaturas · o jogador não recebe ficha nem estado");
  const doJogador = L({ acao: "listar_combates", campanhaId: mesa }).dados.find((c) => c.id === combate);
  const textoJogador = JSON.stringify(doJogador);
  t.ok("nada de snapshot, instância, enigma, PV ou ações", !/snapshot|instancia|segredo do enigma|"acoes"|"status"|DDDD/.test(textoJogador));
  t.ok("  mas a lista e a ordem chegam", doJogador.participantes.length === 5 && doJogador.participantes.every((p) => p.nome && p.tipo === "criatura"));
  t.ok("quem está fora da campanha não lê", !I({ acao: "listar_combates", campanhaId: mesa }).ok);
  operar([{ tipo: "estado", valor: "ativo" }]);
  const img = L({ acao: "ler_imagem_do_turno", campanhaId: mesa, combateId: combate });
  t.ok("imagem do turno de criatura do catálogo: só o id do retrato, nada da ficha",
    img.ok && img.dados.retratoCatalogo === "op.criatura.teste-sintetico" && !/snapshot|segredo|acoes/.test(JSON.stringify(img.dados)));

  t.grupo("Criaturas · blocos adulterados não são lidos nem sobrescritos");
  const alvo = blocos()[0];
  const original = alvo[6];
  alvo[6] = "RB|" + "x".repeat(10) + "|RB";
  globalThis.reiniciarExecucao();
  const lido = daMestra();
  t.ok("a lista marca o combate como ilegível em vez de mostrar outro conteúdo", lido.ilegivel === true && lido.participantes.length === 0);
  const tentar = M({ acao: "atualizar_combate", campanhaId: mesa, combateId: combate, rev, opId: op(), ops: [{ tipo: "renomear", nome: "X" }] });
  t.ok("e nenhuma gravação passa por cima", !tentar.ok && tentar.erro === "armazenamento_falhou");
  alvo[6] = original;
  globalThis.reiniciarExecucao();
  t.ok("restaurado o bloco, volta a ler", !daMestra().ilegivel && daMestra().participantes.length === 5);

  t.grupo("Criaturas · encolheu: volta para a célula e limpa os blocos");
  ["cr-1", "cr-3", "cr-4", "cr-5"].forEach((id) => operar([{ tipo: "remover", participanteId: id }]));
  t.ok("com uma só criatura o combate volta para dadosJson", manifesto() === null && String(linhaDoCombate()[colunaDe("CAMPANHA_COMBATES", "dadosJson")]).indexOf("cr-2") >= 0);
  t.igual("  e os blocos dele saem", blocos().filter((l) => l[0]).length, 0);
  t.iguais("  o estado da ocorrência continua", daMestra().participantes[0].snapshot.instancia.estados, { fase: 2 });
  operar([{ tipo: "adicionar", participantes: participantes.slice(2) }]);
  t.ok("cresceu de novo: blocos de novo", !!manifesto());
  t.ok("excluir o combate leva os blocos", M({ acao: "excluir_combate", campanhaId: mesa, combateId: combate }).ok && blocos().filter((l) => l[0]).length === 0);
  const outro = M({ acao: "salvar_combate", campanhaId: mesa, dados: { nome: "Outro grande", estado: "preparando", visiveis: [], participantes } }).dados.id;
  t.ok("(outro combate grande)", linhasDe("CAMPANHA_COMBATES_BLOCOS").some((l) => l[0] === outro));
  M({ acao: "excluir_campanha", campanhaId: mesa });
  t.ok("excluir a campanha leva os blocos dos combates dela", !linhasDe("CAMPANHA_COMBATES_BLOCOS").some((l) => l[0] === outro));

  t.grupo("Criaturas · combate antigo continua igual");
  preparar();
  const m2 = novaConta("cria_mestra2");
  const M2 = comoFn(m2);
  const mesa2 = M2({ acao: "criar_campanha", dados: { nome: "Antiga" } }).dados.id;
  const pequeno = M2({ acao: "salvar_combate", campanhaId: mesa2, dados: { nome: "Pequeno", estado: "preparando", visiveis: [], participantes: [
    { id: "c1", tipo: "criatura", nome: "Existido", ordem: 1, snapshot: { nome: "Existido", status: [{ id: "v", nome: "Vida", atual: 5, maximo: 30 }] } },
  ] } });
  const linha2 = linhasDe("CAMPANHA_COMBATES").find((l) => l[0] === pequeno.dados.id);
  t.ok("um combate pequeno fica inteiro na célula, sem manifesto", !linha2[colunaDe("CAMPANHA_COMBATES", "armazenamento")] && /Existido/.test(linha2[colunaDe("CAMPANHA_COMBATES", "dadosJson")]));
  t.igual("criatura universal (sem sistema) segue funcionando", M2({ acao: "atualizar_combate", campanhaId: mesa2, combateId: pequeno.dados.id, rev: pequeno.rev, opId: op(),
    ops: [{ tipo: "criatura_status", participanteId: "c1", statusId: "v", valor: 12 }] }).dados.participantes[0].snapshot.status[0].atual, 12);

  t.grupo("Criaturas · Homebrew: ficha de Ordem e resumo de lista");
  const dona = novaConta("cria_dona"), outra = novaConta("cria_outra");
  const Dn = comoFn(dona), Ot = comoFn(outra);
  const ficha = criaturaSintetica(9);
  delete ficha.instancia;
  ficha.origem = { tipo: "homebrew", copiadoDe: "op.criatura.teste-sintetico", livro: "OPRPG", pagina: 1 };
  const salvoHb = Dn({ acao: "salvar_homebrew", dados: Object.assign({}, ficha, { visibilidade: "publico" }) });
  const privada = Dn({ acao: "salvar_homebrew", dados: Object.assign({}, ficha, { nome: "Secreta" }) });
  t.ok("salvar criatura de Ordem no Homebrew", salvoHb.ok && privada.ok);
  const lida = Dn({ acao: "ler_homebrew", homebrewId: salvoHb.dados.id }).dados;
  t.igual("ida e volta preserva sistema, origem, bloco de Ordem e ações",
    JSON.stringify([lida.sistema, lida.origem, lida.ordem, lida.acoes]), JSON.stringify([ficha.sistema, ficha.origem, ficha.ordem, ficha.acoes]));
  const lista = Ot({ acao: "listar_homebrew", escopo: "todos", tipo: "criatura", resumo: true });
  t.ok("o resumo traz só o necessário para a lista", lista.ok && lista.dados.length === 1 &&
    lista.dados[0].resumo.vd === 100 && lista.dados[0].resumo.sistema === "ordem" && lista.dados[0].resumo.pv === 100 &&
    !lista.dados[0].acoes && !lista.dados[0].ordem && !lista.dados[0].descricao);
  t.ok("  e a criatura privada de outra conta não aparece", !lista.dados.some((d) => d.nome === "Secreta"));
  t.ok("  nem pode ser lida pelo id", !Ot({ acao: "ler_homebrew", homebrewId: privada.dados.id }).ok);
  const semResumo = Ot({ acao: "listar_homebrew", escopo: "todos", tipo: "criatura" });
  t.ok("sem `resumo`, a lista continua como era (compatível)", semResumo.ok && !!semResumo.dados[0].ordem);
  t.ok("a pública pode ser copiada, nunca editada por outra conta",
    Ot({ acao: "salvar_homebrew", dados: Object.assign({}, lida, { nome: "Tentativa" }) }).dados.id !== salvoHb.dados.id &&
    Dn({ acao: "ler_homebrew", homebrewId: salvoHb.dados.id }).dados.nome === ficha.nome);

  t.grupo("Criaturas · procedimento da ocorrência (AS4, v2.38)");
  const def = globalThis.definirNaInstanciaDaCriatura;
  const simul = { ordem: { procedimentos: [{ id: "exorcismo-digital", requisitos: [{ id: "aparelhos" }, { id: "sigilos" }] }] }, instancia: {} };
  t.ok("o servidor aceita o andamento de um procedimento da ficha", def(simul, "procedimento:exorcismo-digital",
    { estado: "andamento", sucessos: 1, falhas: 9, participantes: [{ nome: "Ana", papel: "executar", treinado: true }], requisitos: { aparelhos: true, inventado: true } }));
  const andamento = simul.instancia.procedimentos["exorcismo-digital"];
  t.ok("  com a mesma régua do site (requisito desconhecido cai, números presos)", andamento.sucessos === 1 && andamento.falhas === 9 && !andamento.requisitos.inventado && andamento.requisitos.aparelhos);
  t.ok("  estado desconhecido vira preparando", def(simul, "procedimento:exorcismo-digital", { estado: "explodido" }) && simul.instancia.procedimentos["exorcismo-digital"].estado === "preparando");
  t.ok("  procedimento que a ficha não tem é recusado", !def(simul, "procedimento:outro", { estado: "andamento" }));
  t.ok("  null recomeça", def(simul, "procedimento:exorcismo-digital", null) && !simul.instancia.procedimentos["exorcismo-digital"]);
}
