/* =====================================================================
   R.A.M.A. — testes do backend: leituras em lote e cortes de leitura
   (v2.46). Dados sintéticos. Chamado por executar-backend.js.

   O serviço avançado do Sheets (Sheets.Spreadsheets.Values.batchGet) é
   OPCIONAL: estes testes conferem que, ligado, cada leitura devolve
   exatamente o que o caminho de sempre devolveria — e que, desligado ou
   falhando, o caminho de sempre continua respondendo.
   ===================================================================== */

export function testarLoteBackend({ t, preparar, novaConta, comoFn, ambiente }) {
  const S = ambiente.servicoAvancado;
  const semMarcas = (lista) => JSON.stringify(lista);

  /* A mesma leitura pelos dois caminhos, cada um numa execução nova. */
  function pelosDois(fn) {
    const ligado = S.ligado;
    S.desligar();
    reiniciarExecucao();
    const padrao = fn();
    S.ligar();
    reiniciarExecucao();
    const lote = fn();
    if (!ligado) S.desligar();
    return { padrao, lote };
  }

  t.grupo("Lote · equivalência registro a registro");
  preparar();
  const ana = novaConta("lote_ana"), beto = novaConta("lote_beto");
  const A = comoFn(ana), B = comoFn(beto);
  const ficha = (nome, extra) => Object.assign({ nome, atributos: [], status: [{ id: "s1", nome: "Vida", atual: 0, maximo: 0 }] }, extra || {});
  const p1 = A({ acao: "criar_personagem", dados: ficha("Zero e falso", { tipoFicha: "universal", modulos: { aliados: false } }) }).dados.id;
  A({ acao: "criar_personagem", dados: ficha("Segunda") });
  const grande = A({ acao: "criar_personagem", dados: ficha("Grande", { anotacoes: { pastas: [], soltas: [{ id: "n1", titulo: "T", conteudo: "x".repeat(120000) }] } }) }).dados.id;
  A({ acao: "salvar_foto", personagemId: p1, imagem: "data:image/png;base64," + "Q".repeat(40000) });
  const mesa = A({ acao: "criar_campanha", dados: { nome: "Mesa do lote" } }).dados.id;
  A({ acao: "salvar_participantes", campanhaId: mesa, membros: [{ userId: beto.id, papel: "jogador" }] });
  A({ acao: "vincular_personagem", campanhaId: mesa, personagemId: p1 });
  /* Uma linha com células vazias no FIM (a API não as devolve) e valores
     zero/falso no meio. */
  reiniciarExecucao();
  inserir(ABAS.CAMPANHA_MEMBROS, { id: "m-vazio", campanhaId: mesa, userId: "", papel: "", criadoEm: "" });
  inserir(ABAS.PERSONAGENS_ORGANIZACAO, { personagemId: "org-zero", ownerId: ana.id, sistema: 0, pastaId: "", atualizadoEm: "" });

  /* Os cabeçalhos ficam conhecidos (no cache), como numa implantação em uso. */
  Object.keys(ABAS).forEach((k) => { try { reiniciarExecucao(); cabecalho(ABAS[k]); } catch (e) { /* aba sem uso */ } });

  ["PERSONAGENS", "CAMPANHAS", "CAMPANHA_MEMBROS", "PERSONAGENS_FOTOS", "PERSONAGENS_ORGANIZACAO", "SESSOES", "USUARIOS", "PERFIS", "PERSONAGENS_ACESSOS"].forEach((nome) => {
    const def = ABAS[nome];
    const leves = pelosDois(() => { preCarregar([{ definicao: def }]); return semMarcas(lerLeves(def)); });
    t.ok(nome + ": varredura leve igual nos dois caminhos", leves.padrao === leves.lote, leves.lote.slice(0, 200));
    const tudo = pelosDois(() => { preCarregar([{ definicao: def, tudo: true }]); return semMarcas(lerTudo(def)); });
    t.ok(nome + ": varredura completa igual", tudo.padrao === tudo.lote);
  });

  const cabecalhos = pelosDois(() => {
    ambiente.cache.clear();
    preCarregar(Object.keys(ABAS).map((k) => ({ definicao: ABAS[k] })));
    return JSON.stringify(Object.keys(ABAS).map((k) => cabecalho(ABAS[k])));
  });
  t.ok("cache vazio: os cabeçalhos montados pelo lote (linha inteira) são os mesmos", cabecalhos.padrao === cabecalhos.lote);

  const zero = pelosDois(() => lerTudo(ABAS.PERSONAGENS_ORGANIZACAO).find((r) => r.personagemId === "org-zero"));
  t.ok("zero continua zero (não vira vazio)", zero.lote && zero.lote.sistema === 0 && zero.padrao.sistema === 0);
  const vazioNoFim = pelosDois(() => { preCarregar([{ definicao: ABAS.CAMPANHA_MEMBROS }]); return lerTudo(ABAS.CAMPANHA_MEMBROS).find((r) => r.id === "m-vazio"); });
  t.ok("célula vazia no fim da linha volta como ''", vazioNoFim.lote && vazioNoFim.lote.userId === "" && vazioNoFim.lote.criadoEm === "" &&
    JSON.stringify(vazioNoFim.lote) === JSON.stringify(vazioNoFim.padrao));

  const datasFoto = pelosDois(() => {
    preCarregar([{ definicao: ABAS.PERSONAGENS_FOTOS, extras: ["atualizadoEm"] }]);
    const linhas = lerLeves(ABAS.PERSONAGENS_FOTOS);
    return JSON.stringify(lerCelulas(ABAS.PERSONAGENS_FOTOS, linhas, "atualizadoEm"));
  });
  t.ok("coluna extra da pré-carga = lerCelulas de sempre", datasFoto.padrao === datasFoto.lote && datasFoto.lote.length > 2);

  const blocos = pelosDois(() => {
    const linhas = lerLeves(ABAS.PERSONAGENS_BLOCOS).map((r) => r._linha);
    return JSON.stringify(lerLinhas(ABAS.PERSONAGENS_BLOCOS, linhas.filter((_, i) => i % 3 === 0)));
  });
  t.ok("linhas espalhadas (várias faixas) iguais, com conteúdo grande", blocos.padrao === blocos.lote && blocos.lote.length > 1000);

  const espalhadas = pelosDois(() => {
    const linhas = lerLeves(ABAS.PERSONAGENS).map((r) => r._linha);
    return JSON.stringify(lerCelulas(ABAS.PERSONAGENS, [linhas[0], linhas[linhas.length - 1]], "fichaJson"));
  });
  t.ok("células pesadas espalhadas iguais", espalhadas.padrao === espalhadas.lote);

  t.grupo("Lote · a resposta da API é a mesma pelas ações");
  const acoes = [
    () => A({ acao: "listar_personagens" }),
    () => A({ acao: "ler_personagem", personagemId: grande }),
    () => A({ acao: "ler_foto", personagemId: p1 }),
    () => B({ acao: "listar_personagens_campanha", campanhaId: mesa }),
    () => A({ acao: "lote", pedidos: [{ acao: "sessao" }, { acao: "ler_personagem", personagemId: p1 }, { acao: "ler_foto", personagemId: p1 }, { acao: "listar_campanhas" }] }),
    () => B({ acao: "ler_personagem", personagemId: p1 }),
    () => A({ acao: "resumo" }),
  ];
  acoes.forEach((fn, i) => {
    const r = pelosDois(() => JSON.stringify(fn()));
    t.ok("ação " + (i + 1) + ": mesma resposta com e sem o lote", r.padrao === r.lote, r.padrao.slice(0, 120) + " ≠ " + r.lote.slice(0, 120));
  });

  t.grupo("Lote · menos viagens");
  const viagens = (fn) => { reiniciarExecucao(); ambiente.contador.zerar(); fn(); return ambiente.contador.chamadasSheets; };
  S.desligar();
  const semLote = viagens(() => A({ acao: "listar_personagens" }));
  S.ligar();
  const comLote = viagens(() => A({ acao: "listar_personagens" }));
  t.ok("listar_personagens: muito menos viagens com o lote (" + semLote + " → " + comLote + ")", comLote < semLote / 3);
  const lerB = viagens(() => B({ acao: "acesso_personagem", personagemId: p1 }));
  t.ok("a pergunta de acesso cabe em poucas viagens (" + lerB + ")", lerB <= 3);
  S.desligar();

  t.grupo("Lote · falhas voltam ao caminho de sempre");
  S.ligar();
  ambiente.registros.length = 0;
  S.falhar = 1;
  S.mensagem = "API call to sheets.spreadsheets.values.batchGet failed with error: Internal error encountered.";
  reiniciarExecucao();
  const comFalha = A({ acao: "listar_personagens" });
  S.desligar(); reiniciarExecucao();
  const referencia = A({ acao: "listar_personagens" });
  t.ok("erro passageiro: a resposta sai igual, pelo caminho de sempre", comFalha.ok && JSON.stringify(comFalha) === JSON.stringify(referencia));
  t.ok("  e fica um aviso no log (warn)", ambiente.registros.some(([n, m]) => n === "warn" && /lote falhou/.test(m)));

  S.ligar();
  ambiente.registros.length = 0;
  S.falhar = 1;
  S.mensagem = "Google Sheets API has not been used in project 123 before or it is disabled.";
  reiniciarExecucao();
  t.ok("API desabilitada no projeto: responde pelo caminho de sempre", A({ acao: "listar_personagens" }).ok);
  t.ok("  e o log diz que é configuração (error)", ambiente.registros.some(([n, m]) => n === "error" && /configuração ou autorização/.test(m)));

  ambiente.registros.length = 0;
  const original = globalThis.Sheets.Spreadsheets.Values.batchGet;
  globalThis.Sheets.Spreadsheets.Values.batchGet = function (id, o) {
    const r = original.call(this, id, o);
    r.valueRanges = r.valueRanges.slice(1);
    return r;
  };
  reiniciarExecucao();
  t.ok("faixas a menos na resposta: ignorada, caminho de sempre", JSON.stringify(A({ acao: "listar_personagens" })) === JSON.stringify(referencia));
  globalThis.Sheets.Spreadsheets.Values.batchGet = function (id, o) {
    const r = original.call(this, id, o);
    if (r.valueRanges.length > 1) { const x = r.valueRanges[0]; r.valueRanges[0] = r.valueRanges[1]; r.valueRanges[1] = x; }
    return r;
  };
  reiniciarExecucao();
  t.ok("faixas trocadas de aba: ignoradas, caminho de sempre", JSON.stringify(A({ acao: "listar_personagens" })) === JSON.stringify(referencia));
  globalThis.Sheets.Spreadsheets.Values.batchGet = original;

  /* Uma célula de data que a planilha tivesse convertido chegaria como
     texto formatado: a faixa dela volta ao getValues. */
  reiniciarExecucao();
  const linhaOrg = lerTudo(ABAS.PERSONAGENS_ORGANIZACAO).find((r) => r.personagemId === "org-zero");
  ambiente.planilha.getSheetByName("PERSONAGENS_ORGANIZACAO").linhas[linhaOrg._linha - 1][4] = "08/10/2026 12:00:00";
  let divergentes = 0;
  const comData = pelosDois(() => {
    preCarregar([{ definicao: ABAS.PERSONAGENS_ORGANIZACAO }]);
    divergentes = medidor().loteDataDivergente || 0;
    return semMarcas(lerTudo(ABAS.PERSONAGENS_ORGANIZACAO));
  });
  t.ok("data que não é ISO: a proteção dispara e a faixa volta ao caminho de sempre", divergentes === 1 && comData.padrao === comData.lote);

  ambiente.propriedades.set("RAMA_SHEETS_API", "0");
  reiniciarExecucao();
  ambiente.contador.zerar();
  A({ acao: "listar_personagens" });
  t.igual("RAMA_SHEETS_API = 0 desliga o atalho mesmo com o serviço habilitado", ambiente.contador.batchGet, 0);
  ambiente.propriedades.delete("RAMA_SHEETS_API");
  S.desligar();

  t.grupo("Leituras · cortes que valem também sem o lote");
  /* Linha lida uma vez por execução. */
  reiniciarExecucao();
  ambiente.ligarRastro();
  A({ acao: "lote", pedidos: [{ acao: "ler_personagem", personagemId: p1 }, { acao: "ler_foto", personagemId: p1 }] });
  const rastro = ambiente.tirarRastro();
  const linhaDaFicha = rastro.filter((x) => x.aba === "PERSONAGENS" && x.metodo === "getValues" && x.nl === 1);
  t.igual("ler_personagem + ler_foto no mesmo lote: a linha da ficha é lida uma vez", linhaDaFicha.length, 1);

  /* A campanha só é conferida quando muda. */
  const lida = A({ acao: "ler_personagem", personagemId: p1 });
  reiniciarExecucao();
  ambiente.ligarRastro();
  A({ acao: "salvar_personagem", personagemId: p1, rev: lida.rev, dados: lida.dados });
  const tocouCampanhas = ambiente.tirarRastro().some((x) => x.aba === "CAMPANHAS");
  t.ok("salvar sem mudar a campanha não relê as campanhas", !tocouCampanhas);
  t.igual("  e a campanha continua", A({ acao: "ler_personagem", personagemId: p1 }).dados.campanhaId, mesa);
  const lida2 = A({ acao: "ler_personagem", personagemId: p1 });
  A({ acao: "salvar_personagem", personagemId: p1, rev: lida2.rev, dados: Object.assign({}, lida2.dados, { campanhaId: "campanha-que-nao-existe-1" }) });
  t.igual("trocar para uma campanha inválida continua sendo recusado (fica sem campanha)", A({ acao: "ler_personagem", personagemId: p1 }).dados.campanhaId, null);

  /* A linha do índice: a marca evita varrer a cada gravação. */
  const lida3 = A({ acao: "ler_personagem", personagemId: p1 });
  reiniciarExecucao();
  ambiente.ligarRastro();
  A({ acao: "salvar_personagem", personagemId: p1, rev: lida3.rev, dados: lida3.dados });
  t.ok("gravar de novo não varre o índice de pastas", !ambiente.tirarRastro().some((x) => x.aba === "PERSONAGENS_ORGANIZACAO"));
  /* Alguém apagou a linha do índice na mão: a listagem a recria. */
  reiniciarExecucao();
  const ind = lerTudo(ABAS.PERSONAGENS_ORGANIZACAO).find((r) => r.personagemId === p1);
  apagarLinha(ABAS.PERSONAGENS_ORGANIZACAO, ind._linha);
  const listada = A({ acao: "listar_personagens" }).dados.find((p) => p.id === p1);
  reiniciarExecucao();
  t.ok("linha do índice apagada à mão: a listagem recria (sistema certo)", listada && listada.sistema === "universal" &&
    lerTudo(ABAS.PERSONAGENS_ORGANIZACAO).some((r) => r.personagemId === p1));

  /* A contagem de acessos no cache: concessão e revogação valem na hora. */
  const v = A({ acao: "listar_compartilhamentos", personagemId: grande }).dados.versao;
  t.recusa("sem compartilhamento, quem não alcança não lê", B({ acao: "ler_personagem", personagemId: grande }), "nao_encontrado");
  const s1 = A({ acao: "salvar_compartilhamentos", personagemId: grande, versao: v, acessos: [{ userId: beto.id, papel: "leitor" }] });
  t.ok("concedido: lê na hora (a contagem do cache foi atualizada junto)", B({ acao: "ler_personagem", personagemId: grande }).ok);
  A({ acao: "salvar_compartilhamentos", personagemId: grande, versao: s1.dados.versao, acessos: [] });
  t.recusa("revogado: recusado na hora", B({ acao: "ler_personagem", personagemId: grande }), "nao_encontrado");
  /* Uma contagem velha no cache só erra para o lado de negar. */
  const s2 = A({ acao: "salvar_compartilhamentos", personagemId: grande, versao: A({ acao: "listar_compartilhamentos", personagemId: grande }).dados.versao, acessos: [{ userId: beto.id, papel: "editor" }] });
  t.ok("concedido de novo", s2.ok && B({ acao: "ler_personagem", personagemId: grande }).ok);
  Array.from(ambiente.cache.keys()).filter((k) => k.indexOf("rama.acessos.n.") === 0 && k.endsWith(grande)).forEach((k) => ambiente.cache.set(k, "5"));
  t.ok("contagem velha MAIOR: a varredura decide (continua lendo)", B({ acao: "ler_personagem", personagemId: grande }).ok);
  const vRevoga = A({ acao: "listar_compartilhamentos", personagemId: grande }).dados.versao;
  A({ acao: "salvar_compartilhamentos", personagemId: grande, versao: vRevoga, acessos: [] });
  Array.from(ambiente.cache.keys()).filter((k) => k.indexOf("rama.acessos.n.") === 0 && k.endsWith(grande)).forEach((k) => ambiente.cache.set(k, "3"));
  t.recusa("contagem velha depois da revogação: a varredura nega", B({ acao: "ler_personagem", personagemId: grande }), "nao_encontrado");

  /* A pergunta de acesso não lê a ficha. */
  reiniciarExecucao();
  ambiente.ligarRastro();
  const ac = A({ acao: "acesso_personagem", personagemId: p1 });
  const rAc = ambiente.tirarRastro();
  t.ok("acesso_personagem responde sem ler a linha inteira da ficha", ac.ok && !rAc.some((x) => x.aba === "PERSONAGENS" && x.metodo === "getValues" && x.nl === 1));
}
