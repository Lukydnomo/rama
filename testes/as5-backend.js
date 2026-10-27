/* =====================================================================
   R.A.M.A. — testes do backend: Arquivos Secretos 5 (v2.48)
   ---------------------------------------------------------------------
   Perigos complexos (ler_perigos e salvar_perigos: desligados por
   padrão, só o mestre grava, o jogador vê os perigos em que está,
   repetição e conflito) e as operações da Sincronia Conectiva
   (sincronia_operar: consentimento dos dois lados, campanha, recursos,
   SAN fora, repetição sem cobrar duas vezes, compartilhamento não dá
   porta). Também confere que o módulo de perigos dentro de Campanhas.gs
   é a cópia fiel de js/ordem/perigos.js. Dados sintéticos. Chamado por
   executar-backend.js.
   ===================================================================== */

export async function testarAs5Backend({ t, preparar, novaConta, comoFn }) {
  t.grupo("AS5 · o módulo de perigos do servidor é o mesmo do site");
  const js = (await Deno.readTextFile(new URL("../js/ordem/perigos.js", import.meta.url))).replace(/\r\n/g, "\n");
  const gs = (await Deno.readTextFile(new URL("../backend/Campanhas.gs", import.meta.url))).replace(/\r\n/g, "\n");
  const ini = gs.indexOf("/* >>> js/ordem/perigos.js */\n") + "/* >>> js/ordem/perigos.js */\n".length;
  const fim = gs.indexOf("/* <<< js/ordem/perigos.js */");
  t.ok("a cópia em Campanhas.gs é idêntica (byte a byte)", ini > 40 && fim > ini && gs.slice(ini, fim) === js);
  t.ok("e o servidor carregou RAMAPerigos", !!globalThis.RAMAPerigos && typeof globalThis.RAMAPerigos.vistaDoJogador === "function");

  t.grupo("AS5 · perigos complexos: desligados por padrão e permissões");
  preparar();
  const mestra = novaConta("pg_mestra"), ana = novaConta("pg_ana"), beto = novaConta("pg_beto"), intrusa = novaConta("pg_intrusa");
  const M = comoFn(mestra), A = comoFn(ana), B = comoFn(beto), I = comoFn(intrusa);
  const mesa = M({ acao: "criar_campanha", dados: { nome: "Varminho" } }).dados.id;
  const outra = M({ acao: "criar_campanha", dados: { nome: "Outra" } }).dados.id;
  M({ acao: "salvar_participantes", campanhaId: mesa, membros: [{ userId: ana.id, papel: "jogador" }, { userId: beto.id, papel: "jogador" }] });
  const ficha = (nome, extra) => Object.assign({ nome, tipoFicha: "ordem", schemaVersion: 23,
    ordem: { classe: "ocultista", nex: 30, recursos: { pv: 20, pe: null, san: null, pd: null }, opcionais: { poderesDeTransmissao: true } },
    resumoRecursos: { pv: 30, pe: 14, san: 24, pd: null } }, extra || {});
  const pAna = A({ acao: "criar_personagem", dados: ficha("Ana") }).dados.id;
  const pBeto = B({ acao: "criar_personagem", dados: ficha("Beto") }).dados.id;
  const pFora = M({ acao: "criar_personagem", dados: ficha("De fora") }).dados.id;
  A({ acao: "vincular_personagem", campanhaId: mesa, personagemId: pAna });
  B({ acao: "vincular_personagem", campanhaId: mesa, personagemId: pBeto });
  M({ acao: "vincular_personagem", campanhaId: outra, personagemId: pFora });

  const vazio = M({ acao: "ler_perigos", campanhaId: mesa });
  t.ok("sem nada gravado: desligado e sem perigos (rev 0)", vazio.ok && vazio.rev === 0 && vazio.dados.estado.ativo === false && vazio.dados.estado.perigos.length === 0);
  t.igual("ler_campanha: mecânica desligada", A({ acao: "ler_campanha", campanhaId: mesa }).dados.perigos, false);
  t.igual("quem não é da campanha não lê", I({ acao: "ler_perigos", campanhaId: mesa }).erro, "nao_encontrado");

  const P = globalThis.RAMAPerigos;
  const e = P.normalizar({});
  P.ligar(e, true);
  const navio = P.criar(e, "navio", "", { duracao: 9 }).perigo;
  P.adicionarParticipante(navio, "Ana", pAna);
  P.adicionarParticipante(navio, "Intrusa", pFora);
  const chuva = P.criar(e, "chuva", "", {}, "media").perigo;
  P.adicionarParticipante(chuva, "Beto", pBeto);
  let n = 0;
  const op = () => "pg-teste-" + (++n) + "-aaaaaaaa";
  t.igual("jogadora não grava perigos", A({ acao: "salvar_perigos", campanhaId: mesa, rev: 0, opId: op(), estado: e }).erro, "sem_permissao");
  t.igual("pedido sem opId é recusado", M({ acao: "salvar_perigos", campanhaId: mesa, rev: 0, estado: e }).erro, "dados_invalidos");

  t.grupo("AS5 · perigos complexos: gravação, repetição, conflito e vista");
  const opId = op();
  const s1 = M({ acao: "salvar_perigos", campanhaId: mesa, rev: 0, opId, estado: e });
  t.ok("a mestra grava (rev 1), ligada e com dois perigos", s1.ok && s1.rev === 1 && s1.dados.estado.ativo && s1.dados.estado.perigos.length === 2);
  t.igual("  participante de OUTRA campanha perde o vínculo no servidor", s1.dados.estado.perigos[0].participantes.find((p) => p.nome === "Intrusa").personagemId, "");
  t.ok("o mesmo lote de novo não grava duas vezes", (() => { const r = M({ acao: "salvar_perigos", campanhaId: mesa, rev: 0, opId, estado: e }); return r.ok && r.repetida && r.rev === 1; })());
  t.igual("revisão velha recebe conflito", M({ acao: "salvar_perigos", campanhaId: mesa, rev: 0, opId: op(), estado: e }).erro, "conflito");
  t.igual("ler_campanha avisa que a mecânica está ligada", A({ acao: "ler_campanha", campanhaId: mesa }).dados.perigos, true);
  const va = A({ acao: "ler_perigos", campanhaId: mesa }).dados;
  t.ok("a jogadora recebe a vista, só o perigo em que a personagem dela está", !va.mestre && va.vista.perigos.length === 1 && va.vista.perigos[0].modelo === "navio");
  t.ok("  com a duração sorteada guardada (sem rolar de novo)", va.vista.perigos[0].rodadasTotal === 9);
  const sujo = JSON.parse(JSON.stringify(s1.dados.estado));
  sujo.perigos[0].participantes[0].sucessos = 500;
  sujo.perigos[0].modelo = "inventado";
  const s2 = M({ acao: "salvar_perigos", campanhaId: mesa, rev: 1, opId: op(), estado: sujo });
  t.ok("o servidor normaliza com a mesma régua (modelo desconhecido sai)", s2.ok && s2.dados.estado.perigos.length === 1 && s2.dados.estado.perigos[0].modelo === "chuva");

  t.grupo("AS5 · Sincronia Conectiva: consentimento dos dois lados");
  const comSincronia = (id, outros) => ({ id: "sin-" + id, cena: "c1", entrouEm: "2026-10-27T10:00:00.000Z", participantes: outros, operacoes: [] });
  const gravar = (como, pid, mudar) => {
    const lido = como({ acao: "ler_personagem", personagemId: pid });
    const f = lido.dados;
    mudar(f);
    return como({ acao: "salvar_personagem", personagemId: pid, rev: lido.rev, dados: f, operacaoId: "salvar-" + pid.slice(0, 6) + "-" + (++n) });
  };
  const operar = (como, extra) => como(Object.assign({ acao: "sincronia_operar", campanhaId: mesa, personagemId: pAna, alvoId: pBeto, tipo: "pe", valor: 3, opId: op() }, extra));

  t.igual("sem sincronia nenhuma: recusado", operar(A).erro, "sem_sincronia");
  gravar(A, pAna, (f) => { f.ordem.arquivo5 = { transmissao: { sincronia: comSincronia("a", [{ nome: "Beto", personagemId: pBeto }]) } }; });
  t.igual("só a Ana marcou o Beto: ainda recusado (falta o consentimento do Beto)", operar(A).erro, "sem_sincronia");
  gravar(B, pBeto, (f) => { f.ordem.arquivo5 = { transmissao: { sincronia: comSincronia("b", [{ nome: "Ana", personagemId: pAna }]) } }; });

  t.grupo("AS5 · Sincronia Conectiva: só com a regra opcional ligada nas duas fichas (v2.48.2)");
  gravar(B, pBeto, (f) => { f.ordem.opcionais.poderesDeTransmissao = false; });
  const semRegra = operar(A);
  t.ok("o Beto desligou Poderes de Transmissão: recusado, sem cobrar", semRegra.erro === "sem_sincronia" && semRegra.detalhe === "regra_desligada" &&
    B({ acao: "ler_personagem", personagemId: pBeto }).dados.ordem.recursos.pe === null);
  gravar(B, pBeto, (f) => { f.ordem.opcionais.poderesDeTransmissao = true; });

  t.grupo("AS5 · Sincronia Conectiva: gastar PE de outro");
  const op1 = op();
  const g1 = operar(A, { opId: op1 });
  const beto1 = B({ acao: "ler_personagem", personagemId: pBeto }).dados;
  t.ok("Ana gasta 3 PE do Beto (cheio = 14, do resumo): 11", g1.ok && beto1.ordem.recursos.pe === 11);
  t.ok("  e a ficha do Beto guarda o registro, com o id da operação", beto1.ordem.arquivo5.transmissao.sincronia.operacoes.some((o) => o.opId === op1 && o.papel === "alvo" && o.valor === 3));
  const g1b = operar(A, { opId: op1 });
  t.ok("repetir a MESMA operação não cobra de novo", g1b.ok && g1b.repetida && B({ acao: "ler_personagem", personagemId: pBeto }).dados.ordem.recursos.pe === 11);
  t.igual("pedir mais do que o Beto tem: sem_recursos", operar(A, { valor: 50 }).erro, "sem_recursos");
  t.igual("a Ana não age pela ficha do Beto", operar(A, { personagemId: pBeto, alvoId: pAna }).erro, "nao_encontrado");
  t.igual("a intrusa (fora da campanha) não opera", operar(I).erro, "nao_encontrado");
  t.igual("alvo de outra campanha: recusado", operar(A, { alvoId: pFora }).erro, "nao_encontrado");
  t.igual("valor inválido: recusado", operar(A, { valor: 0 }).erro, "dados_invalidos");

  t.grupo("AS5 · Sincronia Conectiva: assumir dano ou perda");
  t.igual("SAN nunca (a fonte exclui efeitos que afetam SAN)", operar(A, { tipo: "redirecionar", recurso: "san" }).erro, "dados_invalidos");
  const op2 = op();
  const r1 = operar(A, { tipo: "redirecionar", recurso: "pv", natureza: "dano", valor: 7, opId: op2 });
  const ana2 = A({ acao: "ler_personagem", personagemId: pAna }).dados;
  const beto2 = B({ acao: "ler_personagem", personagemId: pBeto }).dados;
  t.ok("a Ana sofre 7 de PV no lugar do Beto (20 → 13)", r1.ok && ana2.ordem.recursos.pv === 13);
  t.ok("  o Beto não perde nada e fica com o registro", beto2.ordem.recursos.pv === 20 && beto2.ordem.arquivo5.transmissao.sincronia.operacoes.some((o) => o.opId === op2 && o.tipo === "redirecionar" && o.papel === "alvo"));
  const r1b = operar(A, { tipo: "redirecionar", recurso: "pv", natureza: "dano", valor: 7, opId: op2 });
  t.ok("repetir não tira PV de novo", r1b.ok && r1b.repetida && A({ acao: "ler_personagem", personagemId: pAna }).dados.ordem.recursos.pv === 13);

  t.grupo("AS5 · Sincronia Conectiva: sair revoga o consentimento");
  gravar(B, pBeto, (f) => { f.ordem.arquivo5.transmissao.sincronia = null; });
  t.igual("o Beto saiu da sincronia: a Ana não usa mais o PE dele", operar(A).erro, "sem_sincronia");
}
