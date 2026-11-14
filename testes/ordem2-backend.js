/* =====================================================================
   R.A.M.A. — testes do backend: Ordem Paranormal RPG II (Ordem2.gs, v9.0)
   ---------------------------------------------------------------------
   Uma sessão curta com um Mestre e duas jogadoras, pelo servidor
   simulado: fichas prontas copiadas, campanha de Ordem II, configuração
   com rev, ponto de interesse com nota privada, investigação (passiva e
   Examinar com o custo de PD), combate em fases com dano gravado na
   ficha, "recarregar" (ler de novo), repetir o MESMO opId sem duplicar
   custo nem dano, permissões dos dois papéis e trocar o sistema da
   campanha sem perder a mesa. Os dados do servidor vêm de uma FILA
   combinada. Dados sintéticos. Chamado por executar-backend.js.
   ===================================================================== */

import { ARQUIVOS_ORDEM2 } from "./gerar-ordem2-gs.js";

export async function testarOrdem2Backend({ t, preparar, novaConta, comoFn }) {
  const ler = (c) => Deno.readTextFile(new URL("../" + c, import.meta.url)).then((s) => s.replace(/\r\n/g, "\n"));
  const G = globalThis;
  const R = G.RAMAOrdem2;

  t.grupo("Ordem II · o motor do servidor é o mesmo do navegador");
  const gs = await ler("backend/Ordem2.gs");
  for (const caminho of ARQUIVOS_ORDEM2) {
    const ini = gs.indexOf("/* >>> " + caminho + " */\n") + ("/* >>> " + caminho + " */\n").length;
    const fim = gs.indexOf("/* <<< " + caminho + " */");
    t.ok("cópia de " + caminho + " idêntica (rode testes/gerar-ordem2-gs.js ao mudar)", gs.slice(ini, fim).replace(/\n$/, "") === (await ler(caminho)).replace(/\n$/, ""));
  }

  const original = G.roladorDeOrdem2;
  const fila = [];
  G.roladorDeOrdem2 = function () { if (!fila.length) throw new Error("fila de dados do servidor vazia"); return fila.shift(); };
  const rolar = (...f) => { fila.length = 0; fila.push(...f); };

  function ficha(preset, nome) {
    return { schemaVersion: 35, tipoFicha: "ordem2", nome: nome || preset, campanhaId: null, ordem2: R.dePreset(preset), atributos: [], status: [], pericias: [], inventario: { itens: [] }, anotacoes: { pastas: [], soltas: [] } };
  }
  let n = 0;
  const id = (p) => "o2-" + p + "-" + String(++n).padStart(4, "0");

  try {
    t.grupo("Ordem II · fichas e campanha");
    preparar();
    const mes = novaConta("o2_mestre"), ana = novaConta("o2_ana"), bia = novaConta("o2_bia"), fora = novaConta("o2_fora");
    const M = comoFn(mes), A = comoFn(ana), B = comoFn(bia), F = comoFn(fora);
    const fa = A({ acao: "criar_personagem", dados: ficha("rhiona", "Rhiona") });
    t.ok("cria a ficha copiada do preset", fa.ok);
    const lida = A({ acao: "ler_personagem", personagemId: fa.dados.id });
    t.ok("lê de volta o bloco ordem2, sem bloco `ordem`", lida.ok && lida.dados.tipoFicha === "ordem2" && lida.dados.ordem2.recursos.pv.max === 22 && !lida.dados.ordem);
    const fb = B({ acao: "criar_personagem", dados: ficha("cavan", "Cavan") }).dados.id;
    const camp = M({ acao: "criar_campanha", dados: { sistema: "ordem2", nome: "Ballynyr" } }).dados.id;
    M({ acao: "salvar_participantes", campanhaId: camp, membros: [{ userId: ana.id, papel: "jogador" }, { userId: bia.id, papel: "jogador" }] });
    A({ acao: "vincular_personagem", campanhaId: camp, personagemId: fa.dados.id });
    B({ acao: "vincular_personagem", campanhaId: camp, personagemId: fb });
    const lc = M({ acao: "ler_campanha", campanhaId: camp }).dados;
    t.ok("campanha de Ordem II: a mesa de Ordem II é a ferramenta (sem o combate de Ordem I)", lc.sistema === "ordem2" && lc.mesaOrdem2 === true && lc.combate === undefined);
    const l0 = M({ acao: "ler_ordem2", campanhaId: camp });
    t.ok("o Mestre lê a mesa com os dois personagens", l0.ok && l0.dados.mestre && l0.dados.personagens.length === 2);
    t.recusa("de fora não lê", F({ acao: "ler_ordem2", campanhaId: camp }), "nao_encontrado");
    const pa = fa.dados.id;
    const op = (C, operacao, opId, rev) => C(Object.assign({ acao: "ordem2_operar", campanhaId: camp, opId: opId || id("op"), operacao }, rev === undefined ? {} : { rev }));
    const fichaDe = (C, pid) => C({ acao: "ler_personagem", personagemId: pid }).dados.ordem2;

    t.grupo("Ordem II · configuração com rev e papéis");
    t.recusa("jogadora não configura", op(A, { tipo: "configurar", perfil: "alpha-contemporaneo" }), "sem_permissao");
    const cfg = op(M, { tipo: "configurar", perfil: "beta-vigilia", ambientacao: "vigilia" }, id("cfg"), 0);
    t.ok("o Mestre fixa o perfil da campanha (Beta · Vigília)", cfg.ok && cfg.dados.estado.perfil === "beta-vigilia");
    t.recusa("configuração sobre um estado velho: conflito", op(M, { tipo: "configurar", perfil: "alpha-contemporaneo" }, id("cfg"), 0), "conflito");
    t.recusa("jogadora não age pelo personagem da outra", op(A, { tipo: "teste", quem: fb, pedido: { pericia: "luta" } }), "dados_invalidos");

    t.grupo("Ordem II · investigação (vista sem soluções)");
    op(M, { tipo: "ponto", ponto: { id: "pt1", nome: "Potes de argila", descricao: "Dois potes tampados.", notaPrivada: "Bálsamo de confrei: 2d4 PV.", contextual: "Abertos, mostram a pasta verde.", pistas: [{ id: "q1", pericias: ["percepcao"], dt: 6, texto: "Parecem só potes." }, { id: "q2", pericias: ["medicina"], dt: 8, texto: "É um bálsamo." }] } }, id("pt"), cfg.rev);
    const vista = JSON.stringify(A({ acao: "ler_ordem2", campanhaId: camp }).dados);
    t.ok("a jogadora vê o ponto, mas não a nota privada, o contexto nem as pistas", vista.includes("Potes de argila") && !vista.includes("confrei") && !vista.includes("pasta verde") && !vista.includes("É um bálsamo"));
    const pas = op(A, { tipo: "investigar", quem: pa, ponto: "pt1", pericia: "percepcao", modo: "nada" });
    t.ok("revelação passiva pela face nominal (Percepção d6 → DT 6)", pas.ok && pas.resultado.resultado.novas.length === 1);
    const pdAntes = fichaDe(A, pa).recursos.pd.atual;
    rolar(2, 1);
    const opEx = id("ex");
    const ex = op(A, { tipo: "investigar", quem: pa, ponto: "pt1", pericia: "percepcao", modo: "examinar", confirmar: true }, opEx);
    t.ok("Examinar sem informação nova: −1 PD gravado na ficha", ex.ok && fichaDe(A, pa).recursos.pd.atual === pdAntes - 1, JSON.stringify(ex).slice(0, 300));
    const ex2 = op(A, { tipo: "investigar", quem: pa, ponto: "pt1", pericia: "percepcao", modo: "examinar", confirmar: true }, opEx);
    t.ok("repetir o MESMO opId não cobra de novo", ex2.ok && ex2.repetida && fichaDe(A, pa).recursos.pd.atual === pdAntes - 1);
    const rol = M({ acao: "listar_rolagens", campanhaId: camp });
    t.ok("a rolagem do servidor entra no histórico da campanha", rol.ok && JSON.stringify(rol.dados).includes("Examinar"));

    t.grupo("Ordem II · combate em fases, dano na ficha, recarga e repetição");
    const ic = op(M, { tipo: "iniciarCombate", personagens: [pa, fb], antecipar: false, npcs: [{ nome: "Afogado", pv: 6, pericias: { luta: 6, acrobacia: 4, percepcao: 4 }, ataques: [{ nome: "Garras", alcance: "corpo", dano: 2 }] }, { nome: "Afogado oculto", pv: 6, oculto: true }] });
    const npc = ic.dados.estado.combate.participantes.find((p) => p.tipo === "npc" && !p.oculto);
    const vj = A({ acao: "ler_ordem2", campanhaId: camp }).dados.vista;
    t.ok("a jogadora não vê o NPC oculto nem os números do NPC", vj.combate.participantes.length === 3 && !vj.combate.participantes.some((p) => p.bloco));
    const martelo = fichaDe(A, pa).itens.find((i) => i.nome === "Martelo de forja");
    t.ok("a jogadora declara o ataque da Rhiona", op(A, { tipo: "declarar", quem: pa, acao: "agredirCorpo", alvo: npc.id, arma: martelo.id }).ok);
    op(M, { tipo: "declarar", ator: npc.id, acao: "agredirCorpo", alvo: "pc-" + pa });
    op(M, { tipo: "aplicarFase" }); op(M, { tipo: "aplicarFase" }); op(M, { tipo: "aplicarFase" }); op(M, { tipo: "aplicarFase" });
    rolar(6, 5, 3, 3);
    op(M, { tipo: "aplicarFase" });
    const pvAntes = fichaDe(A, pa).recursos.pv.atual;
    const opAp = id("ap");
    const ap = op(M, { tipo: "aplicarFase" }, opAp);
    const pvDepois = fichaDe(A, pa).recursos.pv.atual;
    const npcDepois = M({ acao: "ler_ordem2", campanhaId: camp }).dados.estado.combate.participantes.find((p) => p.id === npc.id);
    t.iguais("ataque mútuo: Rhiona 11 × 6 — só ela acerta (RA 6 + Martelo 3 = 9)", [npcDepois.bloco.recursos.pv.atual, pvAntes - pvDepois], [0, 0]);
    const ap2 = op(M, { tipo: "aplicarFase" }, opAp);
    t.ok("repetir o opId da fase não aplica dano de novo", ap2.ok && ap2.repetida);
    const opDano = id("dano");
    op(M, { tipo: "dano", personagem: pa, valor: 5, danoTipo: "fisico" }, opDano);
    op(M, { tipo: "dano", personagem: pa, valor: 5, danoTipo: "fisico" }, opDano);
    t.igual("dano do Mestre com o mesmo opId duas vezes: aplicado uma vez", fichaDe(A, pa).recursos.pv.atual, pvDepois - 5);
    t.recusa("jogadora não aplica dano", op(A, { tipo: "dano", personagem: fb, valor: 5 }), "sem_permissao");
    const recarga = A({ acao: "ler_personagem", personagemId: pa });
    t.ok("recarregar a ficha traz o PV e o opId no bloco", recarga.ok && recarga.dados.ordem2.recursos.pv.atual === pvDepois - 5 && recarga.dados.ordem2.operacoes.indexOf(opDano) >= 0);
    const painel = M({ acao: "listar_personagens_campanha", campanhaId: camp });
    t.ok("o painel da mesa lê o resumo de Ordem II calculado no servidor", painel.ok && JSON.stringify(painel.dados).includes("beta-vigilia"));

    t.grupo("Ordem II · trocar o sistema guarda a mesa");
    M({ acao: "salvar_campanha", campanhaId: camp, dados: { sistema: "universal" } });
    t.recusa("em outra campanha de sistema, a mesa de Ordem II fica suspensa", M({ acao: "ler_ordem2", campanhaId: camp }), "outro_sistema");
    M({ acao: "salvar_campanha", campanhaId: camp, dados: { sistema: "ordem2" } });
    const volta = M({ acao: "ler_ordem2", campanhaId: camp });
    t.ok("voltando a Ordem II, o estado está como estava", volta.ok && volta.dados.estado.investigacao.pontos.length === 1 && volta.dados.estado.combate.ativo === true);
  } finally {
    G.roladorDeOrdem2 = original;
  }
}
