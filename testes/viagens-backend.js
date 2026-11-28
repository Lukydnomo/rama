/* =====================================================================
   R.A.M.A. — testes do backend: viagens nas estradas (Arquivos Secretos 11)
   ---------------------------------------------------------------------
   ler_viagens e viagem_operar: desligadas por padrão, só o mestre liga e
   conduz, suplemento desligado impede operar, a vista do jogador filtra o
   que não foi liberado, veículo operacional do AS3 vinculado (lido da
   ficha, nunca escrito), dados de caçada com o resultado gravado na
   repetição, Sonnenblume e a expiração nas fichas, reféns, desfazer. E a
   cópia do módulo dentro de Ordem.gs. Dados sintéticos. Chamado por
   executar-backend.js.
   ===================================================================== */

export async function testarViagensBackend({ t, preparar, novaConta, comoFn }) {
  t.grupo("AS11 · o módulo de viagens do servidor é o mesmo do site");
  const js = (await Deno.readTextFile(new URL("../js/ordem/viagens.js", import.meta.url))).replace(/\r\n/g, "\n");
  const gs = (await Deno.readTextFile(new URL("../backend/Ordem.gs", import.meta.url))).replace(/\r\n/g, "\n");
  const ini = gs.indexOf("/* >>> js/ordem/viagens.js */\n") + "/* >>> js/ordem/viagens.js */\n".length;
  const fim = gs.indexOf("/* <<< js/ordem/viagens.js */");
  t.ok("a cópia em Ordem.gs é idêntica (byte a byte; atualize com testes/copiar-modulo-gs.js)", ini > 40 && fim > ini && gs.slice(ini, fim) === js);
  t.ok("e o servidor carregou RAMAViagens", !!globalThis.RAMAViagens && typeof globalThis.RAMAViagens.aplicar === "function");

  preparar();
  const mestra = novaConta("vg_mestra"), ana = novaConta("vg_ana"), beto = novaConta("vg_beto"), intrusa = novaConta("vg_intrusa");
  const M = comoFn(mestra), A = comoFn(ana), B = comoFn(beto), I = comoFn(intrusa);
  const mesa = M({ acao: "criar_campanha", dados: { sistema: "ordem", nome: "Serra" } }).dados.id;
  M({ acao: "salvar_participantes", campanhaId: mesa, membros: [{ userId: ana.id, papel: "jogador" }, { userId: beto.id, papel: "jogador" }] });
  const ficha = (nome, extra) => Object.assign({ nome, tipoFicha: "ordem", schemaVersion: 38,
    ordem: Object.assign({ classe: "combatente", nex: 20, recursos: { pv: null, pe: null, san: null, pd: null }, temporarios: { pv: 0, pe: 0, san: 0, defesa: 0, capacidade: 0 }, opcionais: {} }, extra || {}),
    resumoRecursos: { pv: 30, pe: 10, san: 20, pd: null } });
  const pAna = A({ acao: "criar_personagem", dados: ficha("Ana") }).dados.id;
  const pBeto = B({ acao: "criar_personagem", dados: ficha("Beto", { arquivo3: { veiculos: [
    { id: "vei-van-beto", modelo: "categoria3", nome: "Van da Ordem", pvAtual: 120, combustivel: 3, regalias: [{ chave: "janelasBlindadas" }, { chave: "arCondicionado" }] },
  ] } }) }).dados.id;
  A({ acao: "vincular_personagem", campanhaId: mesa, personagemId: pAna });
  B({ acao: "vincular_personagem", campanhaId: mesa, personagemId: pBeto });
  let n = 0;
  const op = () => "vg-teste-" + (++n) + "-aaaaaaaa";
  const operar = (como, operacao, opId) => como({ acao: "viagem_operar", campanhaId: mesa, opId: opId || op(), operacao });

  t.grupo("AS11 · viagens: desligadas por padrão e permissões");
  const vazio = M({ acao: "ler_viagens", campanhaId: mesa });
  t.ok("sem nada gravado: desligada (rev 0)", vazio.ok && vazio.rev === 0 && vazio.dados.estado.ativo === false && vazio.dados.estado.viagens.length === 0);
  t.igual("ler_campanha: a mecânica começa desligada (liberar o suplemento não liga nada)", A({ acao: "ler_campanha", campanhaId: mesa }).dados.viagens, false);
  t.igual("quem não é da campanha não lê", I({ acao: "ler_viagens", campanhaId: mesa }).erro, "nao_encontrado");
  t.igual("a jogadora não liga a ferramenta", operar(A, { tipo: "ligar", ativo: true }).erro, "sem_permissao");
  t.igual("pedido sem opId é recusado", M({ acao: "viagem_operar", campanhaId: mesa, operacao: { tipo: "ligar", ativo: true } }).erro, "dados_invalidos");
  t.igual("operação desconhecida é recusada", operar(M, { tipo: "inventada" }).erro, "dados_invalidos");
  const liga = operar(M, { tipo: "ligar", ativo: true });
  t.ok("a mestra liga (rev 1)", liga.ok && liga.rev === 1 && liga.dados.estado.ativo === true);
  t.igual("ler_campanha avisa que está ligada", A({ acao: "ler_campanha", campanhaId: mesa }).dados.viagens, true);

  t.grupo("AS11 · viagem livre só com o AS11: carro popular, 600 km");
  operar(M, { tipo: "nova_viagem", nome: "Até Gramado", origem: "Porto Alegre", destino: "Gramado", modulo: "media", velocidade: "padrao" });
  const cv = operar(M, { tipo: "veiculo", acao: "criar", modelo: "carroPopular" });
  const vg1 = cv.dados.estado.viagens[0];
  t.ok("o carro popular entra com 600 km de autonomia, estepe e extintor de série", vg1.veiculos[0].autonomiaRestante === 600 && vg1.veiculos[0].reservas.estepe === 1 && vg1.veiculos[0].reservas.extintor === 1);
  t.igual("itinerário médio padrão: partida, encontro, parada, encontro, chegada", vg1.etapas.map((e) => e.tipo).join(","), "partida,encontro,parada,encontro,chegada");
  t.igual("a jogadora não prepara a viagem (operação do mestre direto no backend)", operar(A, { tipo: "preparar", nome: "Hack" }).erro, "sem_permissao");
  t.igual("nem rola encontro", operar(A, { tipo: "encontro" }).erro, "sem_permissao");

  t.grupo("AS11 · com o AS3: o veículo operacional vinculado continua o da ficha");
  const comVeiculos = M({ acao: "ler_viagens", campanhaId: mesa, incluirVeiculos: true });
  const chave = pBeto + "|vei-van-beto";
  t.ok("o mestre vê os veículos operacionais das fichas da campanha", !!comVeiculos.dados.veiculosOperacionais[chave] && comVeiculos.dados.veiculosOperacionais[chave].pvAtual === 120);
  t.igual("a jogadora não recebe a lista de veículos das fichas", A({ acao: "ler_viagens", campanhaId: mesa, incluirVeiculos: true }).dados.veiculosOperacionais, undefined);
  t.igual("vincular veículo de fora da campanha é recusado", operar(M, { tipo: "veiculo", acao: "criar", modelo: "van", vinculo: { personagemId: pAna, veiculoId: "nao-existe" } }).erro, "operacao_recusada");
  const lig = operar(M, { tipo: "veiculo", acao: "criar", modelo: "van", vinculo: { personagemId: pBeto, veiculoId: "vei-van-beto" }, combustivelModo: "dados" });
  const vin = lig.dados.vinculados[chave];
  t.ok("vinculado: PV, combustível e regalias lidos da ficha", lig.ok && vin && vin.pvAtual === 120 && vin.combustivel === 3 && vin.regalias.indexOf("janelasBlindadas") >= 0);
  const vVin = lig.dados.estado.viagens[0].veiculos[1];
  t.ok("  com a gestão por dados de combustível (sem baixa dupla pela viagem)", vVin.combustivelModo === "dados" && operar(M, { tipo: "consumo", veiculoId: vVin.id, km: 100 }).erro === "operacao_recusada");
  const fichaBeto = B({ acao: "ler_personagem", personagemId: pBeto }).dados;
  t.ok("  e a ficha do Beto não foi tocada", fichaBeto.ordem.arquivo3.veiculos[0].pvAtual === 120 && fichaBeto.ordem.arquivo3.veiculos[0].combustivel === 3);

  t.grupo("AS11 · vista do jogador: só o que foi liberado");
  operar(M, { tipo: "preparar", notas: "SEGREDO-DO-MESTRE: emboscada no km 80" });
  operar(M, { tipo: "etapa", acao: "inserir", etapa: "fixo", rotulo: "Posto abandonado", nota: "NOTA-FIXA-SECRETA" });
  const va = A({ acao: "ler_viagens", campanhaId: mesa }).dados;
  const txt = JSON.stringify(va);
  t.ok("a jogadora recebe a vista, sem as notas do mestre", !va.mestre && !!va.vista.viagem && txt.indexOf("SEGREDO-DO-MESTRE") < 0);
  t.ok("  sem o encontro fixo futuro nem a nota dele", txt.indexOf("NOTA-FIXA-SECRETA") < 0 && txt.indexOf("Posto abandonado") < 0);
  t.ok("  sem os encontros aleatórios futuros (na partida, nenhum)", va.vista.viagem.etapas.filter((e) => e.tipo === "encontro").length === 0);
  operar(M, { tipo: "avancar" });
  const va2 = A({ acao: "ler_viagens", campanhaId: mesa }).dados.vista.viagem;
  t.ok("  depois de avançar, só o encontro atual aparece", va2.etapas.filter((e) => e.tipo === "encontro").length === 1 && va2.etapas.filter((e) => e.atual)[0].tipo === "encontro");

  t.grupo("AS11 · encontro rolado pelo servidor, gravado com a operação");
  const opEnc = op();
  const enc = operar(M, { tipo: "encontro", veiculoId: vg1.veiculos[0].id }, opEnc);
  const encontros = enc.dados.estado.viagens[0].encontros;
  t.ok("o d100 ficou gravado", enc.ok && encontros.length === 1 && encontros[0].d100 >= 1 && encontros[0].d100 <= 100);
  const encRep = operar(M, { tipo: "encontro", veiculoId: vg1.veiculos[0].id }, opEnc);
  t.ok("repetir a mesma operação não rola de novo", encRep.ok && encRep.repetida && encRep.dados.estado.viagens[0].encontros.length === 1 && encRep.dados.estado.viagens[0].encontros[0].d100 === encontros[0].d100);

  t.grupo("AS11 · Carcaças Vermelhas: dados de caçada");
  t.igual("a jogadora não inicia a missão", operar(A, { tipo: "carcacas_iniciar", agentes: [pAna] }).erro, "sem_permissao");
  const ini2 = operar(M, { tipo: "carcacas_iniciar", velocidade: "padrao", agentes: [pAna, pBeto] });
  t.ok("a mestra inicia: contador de perseguição em 6", ini2.ok && ini2.dados.estado.viagens[1].carcacas.perseguicao === 6);
  operar(M, { tipo: "caca_conceder", personagemId: pAna, quantidade: 3, origem: "teste" });
  const opCaca = op();
  const g1 = operar(A, { tipo: "caca_gastar", personagemId: pAna, quantidade: 2, contraCarcaca: true, teste: "Pontaria" }, opCaca);
  const r1 = g1.resultado && g1.resultado.resultado;
  t.ok("Ana gasta 2 contra um Carcaça Vermelha: +2d6 e fica com 1", g1.ok && r1.faces === 6 && r1.valores.length === 2 && r1.total >= 2 && r1.total <= 12 && r1.saldo === 1 &&
    g1.dados.vista.viagem.carcacas.caca[pAna] === 1);
  const g1b = operar(A, { tipo: "caca_gastar", personagemId: pAna, quantidade: 2, contraCarcaca: true, teste: "Pontaria" }, opCaca);
  t.ok("retentativa da mesma operação: mesmo resultado e o mesmo saldo", g1b.ok && g1b.repetida && g1b.resultado.resultado.total === r1.total && g1b.dados.vista.viagem.carcacas.caca[pAna] === 1);
  t.igual("o Beto não gasta os dados da Ana", operar(B, { tipo: "caca_gastar", personagemId: pAna, quantidade: 1 }).erro, "operacao_recusada");
  t.igual("a jogadora não mexe no contador (operação do mestre)", operar(A, { tipo: "perseguicao", delta: 1 }).erro, "sem_permissao");

  t.grupo("AS11 · Sonnenblume: temporários na ficha, com a origem, e a expiração");
  const opSon = op();
  const son = operar(A, { tipo: "sonnenblume", personagemId: pAna, item: "biscoito" }, opSon);
  const valor = son.resultado && son.resultado.resultado.valor;
  const ana1 = A({ acao: "ler_personagem", personagemId: pAna }).dados;
  t.ok("o biscoito põe 1d4 PE temporários na ficha da Ana", son.ok && valor >= 1 && valor <= 4 && ana1.ordem.temporarios.pe === valor);
  t.ok("  com a origem registrada", ana1.ordem.arquivo11.temporarios.some((x) => x.recurso === "pe" && x.valor === valor && /Sonnenblume/.test(x.origem)));
  const sonRep = operar(A, { tipo: "sonnenblume", personagemId: pAna, item: "biscoito" }, opSon);
  t.ok("repetir não dá de novo", sonRep.repetida && A({ acao: "ler_personagem", personagemId: pAna }).dados.ordem.temporarios.pe === valor);
  t.igual("uma escolha por agente", operar(A, { tipo: "sonnenblume", personagemId: pAna, item: "cuca" }).erro, "operacao_recusada");

  t.grupo("AS11 · confronto final: reféns pelo contador");
  const prep = operar(M, { tipo: "confronto_preparar" });
  const cf = prep.dados.estado.viagens[1].carcacas.confronto;
  t.ok("perseguição em 6: dez reféns vivos", prep.ok && cf.refens.vivos === 10 && cf.refens.mortosAntes === 4);
  t.igual("preparar de novo não sorteia os reféns de novo", operar(M, { tipo: "confronto_preparar" }).erro, "operacao_recusada");
  const fimR = operar(M, { tipo: "rodada_fim", rodada: 1 });
  t.ok("fim de rodada com sacrifícios ativos: nove", fimR.ok && fimR.dados.estado.viagens[1].carcacas.confronto.refens.vivos === 9);
  const relido = M({ acao: "ler_viagens", campanhaId: mesa }).dados.estado.viagens[1].carcacas.confronto;
  t.ok("recarregar preserva nove e o registro da rodada", relido.refens.vivos === 9 && relido.rodada === 2 && relido.rodadas[0].fim && relido.rodadas[0].fim.sacrificado);
  t.igual("o fim da mesma rodada não se aplica duas vezes", operar(M, { tipo: "rodada_fim", rodada: 1 }).erro, "operacao_recusada");

  t.grupo("AS11 · fim da missão: os temporários que restam expiram");
  /* A Ana consome 1 PE temporário na ficha. */
  const lido = A({ acao: "ler_personagem", personagemId: pAna });
  const f2 = lido.dados;
  f2.ordem.temporarios.pe = valor - 1;
  A({ acao: "salvar_personagem", personagemId: pAna, rev: lido.rev, dados: f2, operacaoId: "salvar-ana-temp-1" });
  const enc2 = operar(M, { tipo: "missao_encerrar" });
  const ana3 = A({ acao: "ler_personagem", personagemId: pAna }).dados;
  t.ok("encerrar a missão tira o que sobrou do biscoito", enc2.ok && ana3.ordem.temporarios.pe === 0);
  t.ok("  e marca a expiração com o quanto saiu", ana3.ordem.arquivo11.temporarios.some((x) => x.expirado && x.expirou === valor - 1));
  t.ok("  sem tocar nos PE permanentes", ana3.ordem.recursos.pe === null);

  t.grupo("AS11 · desfazer devolve os efeitos");
  const hist = M({ acao: "ler_viagens", campanhaId: mesa }).dados.estado.historico;
  const gasto = hist.filter((h) => h.tipo === "caca_gastar")[0];
  const desf = operar(M, { tipo: "desfazer", alvo: gasto.id });
  t.ok("desfazer o gasto devolve os dois dados de caçada", desf.ok && desf.dados.estado.viagens[1].carcacas.caca[pAna] === 3);
  t.igual("a jogadora não desfaz", operar(A, { tipo: "desfazer", alvo: gasto.id }).erro, "sem_permissao");

  t.grupo("AS11 · Limite de Dados nas ameaças (chave da campanha)");
  const ligLim = M({ acao: "salvar_campanha", campanhaId: mesa, rev: M({ acao: "ler_campanha", campanhaId: mesa }).dados.rev, dados: { limiteDeDados: true } });
  t.ok("o mestre liga e a mesa inteira lê", ligLim.ok && A({ acao: "ler_campanha", campanhaId: mesa }).dados.limiteDeDados === true);
  t.igual("a jogadora não muda a chave", A({ acao: "salvar_campanha", campanhaId: mesa, rev: 0, dados: { limiteDeDados: false } }).erro, "sem_permissao");

  t.grupo("AS11 · suplemento desligado na campanha");
  M({ acao: "salvar_campanha", campanhaId: mesa, rev: M({ acao: "ler_campanha", campanhaId: mesa }).dados.rev, dados: { suplementos: { sistema: "ordem", ids: ["ordem.as3"] } } });
  t.igual("sem o AS11 permitido: operar é recusado", operar(M, { tipo: "perseguicao", delta: 1 }).erro, "suplemento_desligado");
  t.ok("desligar a ferramenta continua permitido (e nada se apaga)", (() => { const r = operar(M, { tipo: "ligar", ativo: false }); return r.ok && r.dados.estado.viagens.length === 2; })());
  t.igual("e religar sem o suplemento não", operar(M, { tipo: "ligar", ativo: true }).erro, "suplemento_desligado");
  const desl = M({ acao: "salvar_campanha", campanhaId: mesa, rev: M({ acao: "ler_campanha", campanhaId: mesa }).dados.rev, dados: { limiteDeDados: false } });
  t.ok("o Limite de Dados das ameaças desliga sem o suplemento", desl.ok && M({ acao: "ler_campanha", campanhaId: mesa }).dados.limiteDeDados === false);
  t.igual("mas não liga", M({ acao: "salvar_campanha", campanhaId: mesa, rev: M({ acao: "ler_campanha", campanhaId: mesa }).dados.rev, dados: { limiteDeDados: true } }).erro, "suplemento_desligado");
}
