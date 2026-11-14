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
    t.ok("o Mestre escolhe a ambientação (Contos da Vigília); o perfil antigo no pedido não muda regra", cfg.ok && cfg.dados.estado.ambientacao === "vigilia" && cfg.dados.estado.regras === G.RAMAOrdem2Catalogo.REGRAS.id && cfg.dados.estado.perfil === undefined);
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
    t.ok("o painel da mesa lê o resumo de Ordem II calculado no servidor", painel.ok && JSON.stringify(painel.dados).includes("\"ambientacao\":\"vigilia\""));

    /* v9.4: a gravação comum grava a migração; aba antiga não volta o esquema. */
    t.grupo("Ordem II · migração para as regras unificadas no fluxo normal de escrita");
    const leg = A({ acao: "ler_personagem", personagemId: pa });
    const velha = JSON.parse(JSON.stringify(leg.dados));
    delete velha.ordem2.regras; delete velha.ordem2.versaoRegras; velha.ordem2.perfilRegras = "alpha-contemporaneo";
    const pq = velha.ordem2.base.pericias.find((p) => p.chave === "pesquisar"); pq.chave = "inspecionar"; delete pq.origens;
    const svLeg = A({ acao: "salvar_personagem", personagemId: pa, rev: leg.rev, dados: velha });
    const gravada = A({ acao: "ler_personagem", personagemId: pa }).dados.ordem2;
    t.ok("uma aba antiga grava com perfilRegras/Inspecionar: o servidor grava o caminho único", svLeg.ok && gravada.regras === G.RAMAOrdem2Catalogo.REGRAS.id && gravada.perfilRegras === undefined && !gravada.base.pericias.some((p) => p.chave === "inspecionar") && gravada.base.pericias.some((p) => p.chave === "pesquisar"));
    t.ok("  o perfil antigo da aba não muda a ambientação já gravada (vigília)", gravada.ambientacao === "vigilia");

    t.grupo("Ordem II · trocar o sistema guarda a mesa");
    M({ acao: "salvar_campanha", campanhaId: camp, dados: { sistema: "universal" } });
    t.recusa("em outra campanha de sistema, a mesa de Ordem II fica suspensa", M({ acao: "ler_ordem2", campanhaId: camp }), "outro_sistema");
    M({ acao: "salvar_campanha", campanhaId: camp, dados: { sistema: "ordem2" } });
    const volta = M({ acao: "ler_ordem2", campanhaId: camp });
    t.ok("voltando a Ordem II, o estado está como estava", volta.ok && volta.dados.estado.investigacao.pontos.length === 1 && volta.dados.estado.combate.ativo === true);

    /* ---------------- v9.1: pacote de missão no servidor ---------------- */
    t.grupo("Ordem II · pacote de missão (conteúdo do Mestre só no servidor)");
    (0, eval)(await ler("testes/fixtures/ordem2-pacote-sintetico.js"));
    const pacoteAntes = G.PACOTES_ORDEM2;
    G.PACOTES_ORDEM2 = G.PACOTE_SINTETICO_ORDEM2;
    try {
      const fA = A({ acao: "criar_personagem", dados: ficha("alan", "Alan") }).dados.id;
      const fV = B({ acao: "criar_personagem", dados: ficha("val", "Val") }).dados.id;
      const c2 = M({ acao: "criar_campanha", dados: { sistema: "ordem2", nome: "Porão sintético" } }).dados.id;
      M({ acao: "salvar_participantes", campanhaId: c2, membros: [{ userId: ana.id, papel: "jogador" }, { userId: bia.id, papel: "jogador" }] });
      A({ acao: "vincular_personagem", campanhaId: c2, personagemId: fA });
      B({ acao: "vincular_personagem", campanhaId: c2, personagemId: fV });
      const op2 = (C, operacao, opId, rev) => C(Object.assign({ acao: "ordem2_operar", campanhaId: c2, opId: opId || id("op"), operacao }, rev === undefined ? {} : { rev }));
      const l1 = M({ acao: "ler_ordem2", campanhaId: c2 });
      t.ok("o Mestre vê a lista de pacotes (só nomes)", l1.ok && l1.dados.pacotes.some((p) => p.id === "sintetico" && p.cenas.length === 3) && !JSON.stringify(l1.dados.pacotes).includes("SOLUCAO"));
      t.ok("a jogadora não recebe a lista de pacotes", A({ acao: "ler_ordem2", campanhaId: c2 }).dados.pacotes === undefined);
      op2(M, { tipo: "configurar", perfil: "alpha-contemporaneo" }, id("cfg"), l1.rev);
      const lc2 = M({ acao: "ler_ordem2", campanhaId: c2 });
      const car = op2(M, { tipo: "carregarCena", pacote: "sintetico", cena: "sala" }, id("car"), lc2.rev);
      t.ok("carregar a cena: o Mestre recebe pontos com contexto, anexos e compêndio", car.ok && car.dados.estado.investigacao.pontos.some((p) => p.notaPrivada === "SOLUCAO-SECRETA") && car.dados.cena && car.dados.cena.anexos.length === 3);
      const linha = G.acharPor(G.ABAS.CAMPANHA_ORDEM2, "campanhaId", c2);
      t.ok("a planilha guarda só o estado dinâmico (nem pistas nem solução)", !String(linha.dadosJson).includes("SOLUCAO-SECRETA") && !String(linha.dadosJson).includes("Uma caixa tem fundo falso") && String(linha.dadosJson).includes('"pacote"'));
      const vj = JSON.stringify(A({ acao: "ler_ordem2", campanhaId: c2 }).dados);
      t.ok("payload da jogadora: sem pista não revelada, senha, solução, roteiro nem ponto oculto", vj.includes("Estante sintética") && !/SOLUCAO-SECRETA|Uma caixa tem fundo falso|482915|"senha":\[|Fulano|PISTA-DO-OCULTO|A caixa está vazia/.test(vj));
      // Handout privado: documento da campanha ligado ao anexo.
      const doc = M({ acao: "salvar_documento", campanhaId: c2, dados: { nome: "Foto da estante", descricao: "handout", visiveis: [] } });
      t.ok("o Mestre guarda o handout como documento privado", doc.ok);
      op2(M, { tipo: "anexo", id: "h-foto", documentoId: doc.dados.id });
      const docsAntes = A({ acao: "listar_documentos", campanhaId: c2 });
      t.ok("antes da pista, a jogadora nem sabe que o documento existe", docsAntes.ok && !JSON.stringify(docsAntes.dados).includes("Foto da estante"));
      op2(M, { tipo: "revelarPista", ponto: "estante", pista: "e2", para: [fA] });
      t.ok("revelada a pista com o anexo, só quem a recebeu vê o documento", JSON.stringify(A({ acao: "listar_documentos", campanhaId: c2 }).dados).includes("Foto da estante") && !JSON.stringify(B({ acao: "listar_documentos", campanhaId: c2 }).dados).includes("Foto da estante"));
      // Tranca e senha.
      const tr = op2(A, { tipo: "desafioAgir", id: "cofre", acao: "tentar", quem: fA, valores: [4, 5, 1] });
      t.iguais("tranca no servidor: 4-5-1 → baixo, exato, alto", tr.ok && tr.resultado.resultado.resposta, ["baixo", "exato", "alto"]);
      // Arrombar no meio: recarregar e continuar.
      rolar(6, 5);
      op2(B, { tipo: "desafioAgir", id: "porta", acao: "tentar", quem: fV, confirmar: true });
      const recarregada = B({ acao: "ler_ordem2", campanhaId: c2 }).dados.vista.proc.desafios.find((d) => d.id === "porta");
      t.ok("recarregar no meio do arrombamento mantém a pontuação (6/10)", recarregada && recarregada.dados.pa === 6);
      // Sobrecarga: encerrar a rodada com o mesmo opId duas vezes.
      const pd0 = [fichaDe(A, fA).recursos.pd.atual, fichaDe(B, fV).recursos.pd.atual];
      op2(M, { tipo: "encerrarRodada", rodada: 1 }); op2(M, { tipo: "encerrarRodada", rodada: 2 });
      const opR3 = id("r3");
      const r3 = op2(M, { tipo: "encerrarRodada", rodada: 3 }, opR3);
      const r3b = op2(M, { tipo: "encerrarRodada", rodada: 3 }, opR3);
      const r3c = op2(M, { tipo: "encerrarRodada", rodada: 3 });
      t.ok("rodada 3 encerrada uma vez: repetir o opId devolve 'repetida', outro pedido é recusado", r3.ok && r3b.ok && r3b.repetida && !r3c.ok);
      t.iguais("sobrecarga aplicada uma vez nas fichas (−1 PD cada)", [fichaDe(A, fA).recursos.pd.atual, fichaDe(B, fV).recursos.pd.atual], [pd0[0] - 1, pd0[1] - 1]);
      // Encontro com ondas: repetir o fim de rodada não duplica a onda.
      const l3 = M({ acao: "ler_ordem2", campanhaId: c2 });
      op2(M, { tipo: "carregarCena", pacote: "sintetico", cena: "gruta" }, id("car"), l3.rev);
      op2(M, { tipo: "configurar", perfil: "beta-vigilia" }, id("cfg"), M({ acao: "ler_ordem2", campanhaId: c2 }).rev);
      op2(M, { tipo: "iniciarCombate", personagens: [fA, fV], antecipar: false });
      op2(M, { tipo: "encontro", acao: "iniciar" });
      const opR = id("onda");
      const o1 = op2(M, { tipo: "proximaRodada", rodada: 1 }, opR);
      const o2 = op2(M, { tipo: "proximaRodada", rodada: 1 }, opR);
      const crias = M({ acao: "ler_ordem2", campanhaId: c2 }).dados.estado.combate.participantes.filter((p) => p.ameaca === "cria-da-floresta").length;
      t.ok("onda da rodada 2 gerada uma vez (repetir o opId não duplica)", o1.ok && o2.repetida && crias === 2);
      const vg = JSON.stringify(A({ acao: "ler_ordem2", campanhaId: c2 }).dados);
      t.ok("bastidores do encontro (roteiro, ordem das runas) fora do payload da jogadora", !/ROTEIRO-SECRETO|"ordem":\["terra"/.test(vg));

      /* ---------------- v9.2: evolução e paranormal (experimentais) ---------------- */
      t.grupo("Ordem II · evolução por marcos e paranormal experimental no servidor");
      const l9 = M({ acao: "ler_ordem2", campanhaId: c2 });
      t.recusa("jogadora não liga a evolução por marcos", op2(A, { tipo: "evolucaoConfigurar", config: { modo: "marcos" } }), "sem_permissao");
      op2(M, { tipo: "evolucaoConfigurar", config: { modo: "marcos" } }, id("evo"), l9.rev);
      op2(M, { tipo: "subirNivel", personagem: fA });
      const nivelAntes = fichaDe(A, fA).nivel;
      const opEsc = id("esc");
      const e1 = op2(A, { tipo: "escolherMelhoria", quem: fA, escolha: { tipo: "pd" } }, opEsc);
      const e2 = op2(A, { tipo: "escolherMelhoria", quem: fA, escolha: { tipo: "pd" } }, opEsc);
      const fAlan = fichaDe(A, fA);
      t.ok("subir de nível com o mesmo opId duas vezes: um nível e +2 PD uma vez", e1.ok && e2.repetida && fAlan.nivel === nivelAntes + 1 && fAlan.evolucao.registros.length === 1 && R.pdMax(fAlan) === fAlan.recursos.pd.max + 2);
      t.recusa("a jogadora não desfaz (é do Mestre)", op2(A, { tipo: "desfazerEvolucao", personagem: fA, registro: fAlan.evolucao.registros[0].id }), "sem_permissao");

      /* v9.3: a gravação comum da ficha não contorna o marco. */
      const lidaA = A({ acao: "ler_personagem", personagemId: fA });
      const velha = JSON.parse(JSON.stringify(lidaA.dados));
      const revVelha = lidaA.rev;
      op2(M, { tipo: "subirNivel", personagem: fA, nivelAntes: fAlan.nivel });
      const pendId = fichaDe(A, fA).evolucao.pendente.id;
      t.recusa("aba antiga (rev velha) não sobrescreve o marco liberado pelo servidor", A({ acao: "salvar_personagem", personagemId: fA, rev: revVelha, dados: velha }), "conflito");
      const atual = A({ acao: "ler_personagem", personagemId: fA });
      const adulterada = JSON.parse(JSON.stringify(atual.dados));
      adulterada.ordem2.nivel = 10;
      adulterada.ordem2.evolucao = { nex: "", pendente: null, registros: [] };
      adulterada.ordem2.habilidades.push({ id: "h-falsa", nome: "Falsa", texto: "x", origemEvolucao: "reg-falso" });
      adulterada.ordem2.recursos.pv.atual = 1;
      const sv = A({ acao: "salvar_personagem", personagemId: fA, rev: atual.rev, dados: adulterada });
      const depoisSv = fichaDe(A, fA);
      t.ok("nível e evolução mandados pela gravação comum são ignorados (ficam os do servidor)", sv.ok && depoisSv.nivel === fAlan.nivel && depoisSv.evolucao.pendente && depoisSv.evolucao.pendente.id === pendId && depoisSv.evolucao.registros.length === 1);
      t.ok("…habilidade 'ganha' inventada não entra; o resto da gravação (PV atuais) vale", !depoisSv.habilidades.some((h) => h.id === "h-falsa") && depoisSv.recursos.pv.atual === 1);
      t.recusa("escolher com o id de um marco antigo é recusado", op2(A, { tipo: "escolherMelhoria", quem: fA, pendente: "marco-velho", escolha: { tipo: "pv" } }), "dados_invalidos");
      t.recusa("o Mestre não define nível por cima de um marco pendente", op2(M, { tipo: "definirNivel", personagem: fA, nivel: 9 }), "dados_invalidos");
      t.recusa("subir com 'local: true' vindo do navegador não dispensa a regra da campanha", op2(M, { tipo: "subirNivel", personagem: fA, local: true }), "dados_invalidos");
      op2(M, { tipo: "cancelarSubida", personagem: fA, pendente: pendId });
      t.ok("cancelar o marco volta ao estado anterior, sem ganho", !fichaDe(A, fA).evolucao.pendente && fichaDe(A, fA).nivel === fAlan.nivel && fichaDe(A, fA).evolucao.registros.length === 1);
      op2(M, { tipo: "paranormalConfigurar", config: { ativo: true } }, id("par"), M({ acao: "ler_ordem2", campanhaId: c2 }).rev);
      op2(M, { tipo: "ritualSalvar", ritual: { id: "sopro", nome: "Sopro frio", classe: "experimental", complexidade: "simples", alvo: "proprio", efeitos: { normal: [{ tipo: "cura", valor: "1", recurso: "pd", quem: "proprio" }] } } });
      op2(M, { tipo: "ritualEnsinar", ritual: "sopro", para: [fA] });
      const rit = fichaDe(A, fA).paranormal.rituais[0].id;
      t.recusa("a outra jogadora não conjura pelo Alan", op2(B, { tipo: "conjurar", quem: fA, ritual: rit, confirmar: true }), "dados_invalidos");
      const pdAntesR = fichaDe(A, fA).recursos.pd.atual;
      rolar(2, 1);
      const opRit = id("rit");
      const r1 = op2(A, { tipo: "conjurar", quem: fA, ritual: rit, confirmar: true }, opRit);
      const r2 = op2(A, { tipo: "conjurar", quem: fA, ritual: rit, confirmar: true }, opRit);
      t.ok("conjurar repetido com o mesmo opId não cobra dois custos (falha: 1 PD uma vez)", r1.ok && r2.repetida && fichaDe(A, fA).recursos.pd.atual === pdAntesR - 1);
      t.ok("a biblioteca do Mestre não vai para a jogadora", A({ acao: "ler_ordem2", campanhaId: c2 }).dados.vista.paranormal.biblioteca.length === 0);
      op2(M, { tipo: "paranormalConfigurar", config: { ativo: false } }, id("par"), M({ acao: "ler_ordem2", campanhaId: c2 }).rev);
      t.recusa("desligado: conjuração bloqueada", op2(A, { tipo: "conjurar", quem: fA, ritual: rit, confirmar: true }), "dados_invalidos");
      t.ok("…e o ritual e o histórico continuam na ficha", fichaDe(A, fA).paranormal.rituais.length === 1 && fichaDe(A, fA).paranormal.historico.length >= 2);
    } finally { G.PACOTES_ORDEM2 = pacoteAntes; }
  } finally {
    G.roladorDeOrdem2 = original;
  }
}
