/* =====================================================================
   R.A.M.A. — testes do backend: Vampiro: A Máscara (Vampiro.gs, v4.1)
   Dados sintéticos. Chamado por executar-backend.js.
   ===================================================================== */

export async function testarVampiroBackend({ t, preparar, novaConta, comoFn }) {
  const ler = (c) => Deno.readTextFile(new URL("../" + c, import.meta.url)).then((s) => s.replace(/\r\n/g, "\n"));
  const R = globalThis.RAMAVampiro;

  t.grupo("Vampiro · o motor do servidor é o mesmo do navegador");
  const gs = await ler("backend/Vampiro.gs");
  for (const n of ["catalogo", "disciplinas-dados", "antagonistas-dados", "dados", "regras", "poderes", "cronica"]) {
    const caminho = "js/vampiro/" + n + ".js";
    const ini = gs.indexOf("/* >>> " + caminho + " */\n") + ("/* >>> " + caminho + " */\n").length;
    const fim = gs.indexOf("/* <<< " + caminho + " */");
    t.ok("cópia de " + caminho + " idêntica (rode testes/gerar-vampiro-gs.js ao mudar)", gs.slice(ini, fim).replace(/\n$/, "") === (await ler(caminho)).replace(/\n$/, ""));
  }

  /* Um vampiro como a criação o deixa. */
  function ficha(nome, cla) {
    const o = R.fichaVazia("vampiro");
    Object.assign(o, { conceito: "x", cla: cla || "brujah", geracao: 13, idade: "neofito" });
    Object.assign(o.atributos, { forca: 4, destreza: 3, vigor: 3, carisma: 3, manipulacao: 2, autocontrole: 2, inteligencia: 2, raciocinio: 2, determinacao: 1 });
    o.disciplinas = { potencia: 2, celeridade: 1 };
    o.criacao.concluida = true; o.potenciaBase = 1; o.fome = 1;
    return { schemaVersion: 25, tipoFicha: "vampiro", nome, campanhaId: null, vampiro: o, atributos: [], status: [], pericias: [], inventario: { itens: [] }, anotacoes: { pastas: [], soltas: [] } };
  }

  t.grupo("Vampiro · a crônica é do Narrador");
  preparar();
  const narradora = novaConta("vp_narr"), jo = novaConta("vp_jo"), lu = novaConta("vp_lu"), fora = novaConta("vp_fora");
  const N = comoFn(narradora), J = comoFn(jo), L = comoFn(lu), F = comoFn(fora);
  const camp = N({ acao: "criar_campanha", dados: { sistema: "vampiro", nome: "Noites de São Paulo" } }).dados.id;
  N({ acao: "salvar_participantes", campanhaId: camp, membros: [{ userId: jo.id, papel: "jogador" }, { userId: lu.id, papel: "jogador" }] });
  const pj = J({ acao: "criar_personagem", dados: ficha("Jô") }).dados.id;
  const pl = L({ acao: "criar_personagem", dados: ficha("Lu", "ventrue") }).dados.id;
  J({ acao: "vincular_personagem", campanhaId: camp, personagemId: pj });
  L({ acao: "vincular_personagem", campanhaId: camp, personagemId: pl });
  const lc = N({ acao: "ler_campanha", campanhaId: camp }).dados;
  t.ok("campanha de Vampiro: a crônica é a ferramenta, sem o combate do núcleo", lc.sistema === "vampiro" && lc.cronica === true && lc.combate === undefined);
  const l0 = N({ acao: "ler_vampiro", campanhaId: camp });
  t.ok("o Narrador lê a crônica inteira (rev 0)", l0.ok && l0.dados.mestre && l0.rev === 0 && l0.dados.personagens.length === 2);
  const est = l0.dados.estado;
  est.principios.push({ id: "pr1", texto: "Não matarás inocentes" });
  est.personagens.push({ id: "pn1", nome: "Príncipe", natureza: "vampiro", visivel: true, notasPrivadas: "deve um favor vital" });
  est.personagens.push({ id: "pn2", nome: "Espiã", natureza: "carnical", visivel: false });
  est.relacoes.push({ id: "r1", de: pj, para: "pn1", tipo: "Senhor", visivel: true }, { id: "r2", de: "pn2", para: pj, tipo: "Vigia", visivel: true }, { id: "r3", de: "pn1", para: pl, tipo: "Desconfia", visivel: false });
  est.registro.push({ id: "g1", tipo: "nota", texto: "a Espiã é do Xerife", privado: true });
  t.recusa("jogadora não grava a crônica", J({ acao: "salvar_vampiro", campanhaId: camp, rev: 0, opId: "vp-salva-0001", estado: est }), "sem_permissao");
  const s1 = N({ acao: "salvar_vampiro", campanhaId: camp, rev: 0, opId: "vp-salva-0001", estado: est });
  t.ok("o Narrador grava", s1.ok && s1.rev === 1);
  t.ok("repetido (mesmo opId): não grava de novo", N({ acao: "salvar_vampiro", campanhaId: camp, rev: 0, opId: "vp-salva-0001", estado: est }).repetida);
  t.recusa("revisão velha: conflito", N({ acao: "salvar_vampiro", campanhaId: camp, rev: 0, opId: "vp-salva-0002", estado: est }), "conflito");
  const vj = J({ acao: "ler_vampiro", campanhaId: camp });
  const txt = JSON.stringify(vj.dados);
  t.ok("a jogadora recebe a VISTA, não o estado", vj.ok && !vj.dados.mestre && vj.dados.vista && !vj.dados.estado);
  t.ok("  Princípios e o PN visível chegam", vj.dados.vista.principios.length === 1 && vj.dados.vista.personagens.some((p) => p.id === "pn1"));
  t.ok("  nada privado: notas, PN oculto, relação privada, registro privado", !txt.includes("favor vital") && !txt.includes("Espiã") && !txt.includes("Desconfia") && !txt.includes("do Xerife"));
  t.ok("  nem a relação visível que aponta para o PN oculto", !vj.dados.vista.relacoes.some((r) => r.de === "pn2"));
  t.recusa("de fora não lê", F({ acao: "ler_vampiro", campanhaId: camp }), "nao_encontrado");

  t.grupo("Vampiro · momentos nas fichas, sem repetir");
  const fomeDe = (id) => N({ acao: "ler_personagem", personagemId: id }).dados.vampiro;
  J({ acao: "salvar_personagem", personagemId: pj, rev: J({ acao: "ler_personagem", personagemId: pj }).rev, dados: Object.assign(J({ acao: "ler_personagem", personagemId: pj }).dados, { vampiro: Object.assign(fomeDe(pj), { forcaDeVontade: { superficial: 2, agravado: 0 } }) }) });
  t.recusa("jogadora não avança o tempo", J({ acao: "vampiro_operar", campanhaId: camp, opId: "vp-mom-0001", operacao: { tipo: "momentos", momentos: [{ tipo: "novaNoite" }] } }), "sem_permissao");
  const m1 = N({ acao: "vampiro_operar", campanhaId: camp, opId: "vp-mom-0001", operacao: { tipo: "momentos", momentos: [{ tipo: "inicioDaSessao" }] } });
  t.ok("início de sessão: FdV recupera nas fichas de Vampiro", m1.ok && fomeDe(pj).forcaDeVontade.superficial === 0);
  t.ok("  e a noite não anda (sessão não é noite)", fomeDe(pj).tempo.noite === 0 && fomeDe(pj).tempo.sessao === 1);
  N({ acao: "vampiro_operar", campanhaId: camp, opId: "vp-mom-0001", operacao: { tipo: "momentos", momentos: [{ tipo: "inicioDaSessao" }] } });
  t.igual("repetido: a sessão não conta duas vezes", fomeDe(pj).tempo.sessao, 1);
  const n1 = N({ acao: "vampiro_operar", campanhaId: camp, opId: "vp-mom-0002", operacao: { tipo: "momentos", momentos: [{ tipo: "novaNoite" }] } });
  t.ok("noite nova: o despertar é rolado no servidor, uma vez por ficha", n1.ok && fomeDe(pj).tempo.noite === 1 && n1.dados.eventos.filter((e) => e.tipo === "checagem").length === 2);
  N({ acao: "vampiro_operar", campanhaId: camp, opId: "vp-mom-0002", operacao: { tipo: "momentos", momentos: [{ tipo: "novaNoite" }] } });
  t.igual("repetida, a noite não avança de novo", fomeDe(pj).tempo.noite, 1);
  const xp = N({ acao: "vampiro_operar", campanhaId: camp, opId: "vp-xp-00001", operacao: { tipo: "xp", personagens: [pj], valor: 2, motivo: "Sessão" } });
  N({ acao: "vampiro_operar", campanhaId: camp, opId: "vp-xp-00001", operacao: { tipo: "xp", personagens: [pj], valor: 2, motivo: "Sessão" } });
  t.igual("XP do Narrador, sem duplicar", fomeDe(pj).xp.recebido, 2);
  t.ok("Máculas decididas pelo Narrador são processadas", N({ acao: "vampiro_operar", campanhaId: camp, opId: "vp-mac-0001", operacao: { tipo: "maculas", persona: pj, valor: 1, motivo: "Violou um Princípio" } }).ok && fomeDe(pj).maculas === 1);
  t.recusa("jogador não decide Máculas", J({ acao: "vampiro_operar", campanhaId: camp, opId: "vp-mac-0002", operacao: { tipo: "maculas", persona: pl, valor: 3 } }), "sem_permissao");

  t.grupo("Vampiro · alimentar-se de outro vampiro");
  t.recusa("Jô não bebe de Lu sem o Narrador (não dá acesso à ficha de Lu)", J({ acao: "vampiro_operar", campanhaId: camp, opId: "vp-beb-0001", operacao: { tipo: "alimentarDeVampiro", quem: pj, doador: pl, fome: 1 } }), "sem_permissao");
  const antesJ = fomeDe(pj).fome, antesL = fomeDe(pl).fome;
  const b1 = N({ acao: "vampiro_operar", campanhaId: camp, opId: "vp-beb-0002", operacao: { tipo: "alimentarDeVampiro", quem: pj, doador: pl, fome: 2 } });
  t.ok("com o Narrador: as duas fichas mudam juntas", b1.ok && b1.dados.gravadas === 2 && fomeDe(pl).fome === Math.min(5, antesL + 2) && fomeDe(pj).fome <= antesJ);
  t.ok("  e o Laço começa", fomeDe(pj).lacos.some((l) => l.reinanteId === pl && l.forca === 1));
  N({ acao: "vampiro_operar", campanhaId: camp, opId: "vp-beb-0002", operacao: { tipo: "alimentarDeVampiro", quem: pj, doador: pl, fome: 2 } });
  t.igual("repetido: o doador não perde de novo", fomeDe(pl).fome, Math.min(5, antesL + 2));

  t.grupo("Vampiro · painel e troca de sistema");
  const painel = N({ acao: "listar_personagens_campanha", campanhaId: camp }).dados.find((p) => p.id === pj);
  t.ok("o cartão de Vampiro vem do motor do servidor", painel.tipoFicha === "vampiro" && painel.vampiro && painel.vampiro.fome !== undefined && painel.vampiro.humanidade === 7);
  const rv = N({ acao: "ler_campanha", campanhaId: camp }).rev;
  N({ acao: "salvar_campanha", campanhaId: camp, rev: rv, dados: { ocultarStatusJogadores: true } });
  const deLu = L({ acao: "listar_personagens_campanha", campanhaId: camp }).dados.find((p) => p.id === pj);
  t.ok("com status ocultos, a outra jogadora vê só o clã", deLu.vampiro && deLu.vampiro.fome === undefined && deLu.vampiro.cla === "brujah");
  const rv2 = N({ acao: "ler_campanha", campanhaId: camp }).rev;
  N({ acao: "salvar_campanha", campanhaId: camp, rev: rv2, dados: { sistema: "ordem" } });
  const lo = N({ acao: "ler_campanha", campanhaId: camp }).dados;
  t.ok("trocou para Ordem: a crônica fica guardada", lo.guardadas.indexOf("cronica") >= 0);
  t.recusa("  e suspensa", N({ acao: "ler_vampiro", campanhaId: camp }), "outro_sistema");
  t.ok("  as fichas de Vampiro não mudaram", fomeDe(pj).cla === "brujah" && N({ acao: "ler_personagem", personagemId: pj }).dados.tipoFicha === "vampiro");
  const rv3 = N({ acao: "ler_campanha", campanhaId: camp }).rev;
  N({ acao: "salvar_campanha", campanhaId: camp, rev: rv3, dados: { sistema: "vampiro" } });
  const volta = N({ acao: "ler_vampiro", campanhaId: camp });
  t.ok("de volta a Vampiro, a crônica volta como estava", volta.ok && volta.dados.estado.principios[0].texto === "Não matarás inocentes" && volta.rev === 1);
}
