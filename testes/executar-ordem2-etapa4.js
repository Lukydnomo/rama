/* =====================================================================
   R.A.M.A. — testes de Ordem II (v9.3): criação e progressão
   Progressão experimental do RAMA
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-ordem2-etapa4.js

   As regras que o assistente de criação e a aba Evolução usam: os
   presets conservam os números de origem (Rhiona 22/12), a guiada com
   orçamento, teto e devolução de passos, Aptidão, troca Alpha/Beta; a
   progressão por marcos do 1 ao 10 com a pendência conferida por id,
   nível manual bloqueado com marco pendente, habilidade proposta,
   recusada e aprovada, máximos com personagem ferido, desfazer com
   dependência, o teto do nível 10, a configuração congelada no marco e
   exportar/importar no meio de uma pendência. Dados: FILA combinada.
   ===================================================================== */

const ARQUIVOS = ["catalogo", "regras", "motor", "mesa", "ameacas", "procedimentos", "evolucao", "paranormal"].map((n) => "js/ordem2/" + n + ".js").concat(["testes/fixtures/ordem2-pacote-sintetico.js"]);
globalThis.window = globalThis;
for (const caminho of ARQUIVOS) {
  const codigo = await Deno.readTextFile(new URL("../" + caminho, import.meta.url));
  try { (0, eval)(codigo); } catch (e) { console.error(`Falhou ao carregar ${caminho}: ${e.message}\n${e.stack}`); Deno.exit(1); }
}
const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0;
const falhas = [];
const t = {
  grupo(x) { console.log(`\n${FORTE}${x}${FIM}`); },
  ok(nome, c, d) { if (c) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${nome}`); } else { falharam++; falhas.push(nome); console.log(`  ${VERMELHO}FALHOU${FIM} ${nome}${d ? `  ${CINZA}${d}${FIM}` : ""}`); } },
};
const K = globalThis.RAMAOrdem2Catalogo, R = globalThis.RAMAOrdem2, ME = globalThis.RAMAOrdem2Mesa, P = globalThis.RAMAOrdem2Proc, EV = globalThis.RAMAOrdem2Evolucao;
const PAC = globalThis.PACOTE_SINTETICO_ORDEM2;
const MESTRE = { mestre: true, pode: [] };
const jog = (...ids) => ({ mestre: false, pode: ids });
const nada = (n) => { throw new Error("rolou sem esperar (d" + n + ")"); };
function novaMesa(perfil, presets) {
  const fichas = {};
  (presets || []).forEach((id) => { fichas[id] = { nome: K.preset(id).nome, bloco: R.dePreset(id) }; });
  return { estado: ME.estadoVazio(perfil || "beta-vigilia"), fichas, pacotes: PAC };
}
function operar(m, op, papel) {
  const e = ME.normalizar(JSON.parse(JSON.stringify(m.estado)));
  P.hidratar(e, m.pacotes);
  Object.keys(m.fichas).forEach((k) => { m.fichas[k].bloco = R.normalizar(m.fichas[k].bloco); });
  const r = ME.aplicar(e, m.fichas, op, papel || MESTRE, nada, { pacotes: m.pacotes });
  if (r.ok) m.estado = JSON.parse(JSON.stringify(P.desidratar(ME.normalizar(e))));
  return r;
}
const bl = (m, pid) => m.fichas[pid].bloco;

/* =================================================================== */
t.grupo("Ficha pronta: os números de origem");
{
  const rh = R.dePreset("rhiona");
  t.ok("Rhiona (Beta) continua com 22 PV / 12 PD", rh.recursos.pv.max === 22 && rh.recursos.pd.max === 12 && rh.ambientacao === "vigilia" && rh.procedencia.origem === "beta");
  const todos = K.PRESETS.every((p) => { const b = R.dePreset(p.id); return b.recursos.pv.max === p.pv && b.recursos.pd.max === p.pd && b.nivel === p.nivel && b.ambientacao === K.PERFIS_REGRAS[p.perfilRegras].ambientacao && b.base.atributos.fisico === p.atributos.fisico; });
  t.ok("os 14 presets conservam PV, PD, nível, versão e dados de origem", todos && K.PRESETS.length === 14);
  const a = R.dePreset("val"), b = R.dePreset("val");
  t.ok("cada cópia ganha ids próprios", a.base.pericias[0].id !== b.base.pericias[0].id);
  t.ok("a referência 16/12 da guiada não entra em ficha pronta", !a.escolhas || !a.escolhas.pvPdReferencia);
}

t.grupo("Criação guiada: orçamento, teto, devolução, Aptidão, versão");
{
  const base = (o) => Object.assign({ perfilRegras: "beta-vigilia", perfil: "analista", ocupacaoId: "ferreira", ocupacaoNome: "Ferreira", atributos: { fisico: 6, mente: 6, emocao: 6 }, pericias: [], habilidadeOcupacao: "", pv: 16, pd: 12 }, o);
  t.ok("2 passos de atributo: d8 + d8 cabe", R.conferirGuiada(base({ atributos: { fisico: 8, mente: 8, emocao: 6 } })).ok);
  t.ok("3 passos de atributo estouram", !R.conferirGuiada(base({ atributos: { fisico: 10, mente: 8, emocao: 6 } })).ok);
  t.ok("teto d10 por atributo; abaixo de d6 recusado", !R.conferirGuiada(base({ atributos: { fisico: 12, mente: 6, emocao: 6 } })).ok && !R.conferirGuiada(base({ atributos: { fisico: 4, mente: 6, emocao: 6 } })).ok);
  const p8 = ["atletismo", "luta", "vigor", "percepcao"].map((c) => ({ chave: c, dado: 8 }));
  t.ok("8 passos de perícia (4 × d8) cabem; teto d8", R.conferirGuiada(base({ pericias: p8 })).ok && !R.conferirGuiada(base({ pericias: [{ chave: "luta", dado: 10 }] })).ok);
  t.ok("o 9º passo estoura", !R.conferirGuiada(base({ pericias: p8.concat([{ chave: "bruxaria", dado: 6 }]) })).ok);
  const devolve = R.conferirGuiada(base({ pericias: [{ chave: "luta", dado: 6 }] }));
  t.ok("tirar um passo devolve (1 usado de 8)", devolve.passosPericia === 1);
  const apt = R.deGuiada(base({ pericias: [{ chave: "aptidao", especializacao: "Folclore", dado: 6 }] }));
  t.ok("Aptidão leva a especialização e custa uma vez", apt.ok && apt.bloco.base.pericias.some((p) => p.chave === "aptidao" && p.especializacao === "Folclore" && p.dado === 6) && apt.bloco.escolhas.passosPericia === 1);
  const g = R.deGuiada(base({}));
  t.ok("guiada: nível 1, 16 PV / 12 PD de referência, habilidade do perfil", g.ok && g.bloco.nivel === 1 && g.bloco.recursos.pv.max === 16 && g.bloco.habilidades.some((h) => h.ref === K.HABILIDADE_DE_PERFIL.analista));
  t.ok("passos sobrando são permitidos pelo motor (a tela pede confirmação)", g.ok && g.bloco.escolhas.passosAtributo === 0);
  const alpha = R.deGuiada(base({ ambientacao: "contemporaneo", ocupacaoId: "cientista", ocupacaoNome: "Cientista", habilidadeOcupacao: "foco_mental" }));
  t.ok("Alpha: ocupação documentada traz a habilidade dela", alpha.ok && alpha.bloco.habilidades.some((h) => h.ref === "foco_mental"));
  t.ok("v9.4: uma lista de perícias para todos (Ocultismo, Pesquisar, Tecnologia, Animais)", ["ocultismo", "pesquisar", "tecnologia", "animais"].every((c) => K.listaDePericias().some((p) => p.chave === c)));
}

t.grupo("Progressão por marcos: do 1 ao 10");
{
  const m = novaMesa("beta-vigilia", ["rhiona"]);
  t.ok("modo livre recusa subir — também com 'local: true' vindo do navegador", !operar(m, { tipo: "subirNivel", personagem: "rhiona", local: true }).ok);
  operar(m, { tipo: "evolucaoConfigurar", config: { modo: "marcos" } });
  const n0 = bl(m, "rhiona").nivel;
  t.ok("nível desatualizado na tela (nivelAntes) é recusado", !operar(m, { tipo: "subirNivel", personagem: "rhiona", nivelAntes: n0 + 1 }).ok);
  operar(m, { tipo: "subirNivel", personagem: "rhiona", nivelAntes: n0 });
  const pend = bl(m, "rhiona").evolucao.pendente;
  t.ok("o marco não muda o nível sozinho", bl(m, "rhiona").nivel === n0 && pend.nivelDepois === n0 + 1);
  t.ok("o Mestre não define nível por cima do marco", !operar(m, { tipo: "definirNivel", personagem: "rhiona", nivel: 7 }).ok);
  t.ok("desfazer fica bloqueado com marco pendente", !operar(m, { tipo: "desfazerEvolucao", personagem: "rhiona", registro: "x" }).ok);
  t.ok("pendência de outro id é recusada", !operar(m, { tipo: "escolherMelhoria", quem: "rhiona", pendente: "outro", escolha: { tipo: "pv" } }, jog("rhiona")).ok);
  /* ferida: PV atuais 9 */
  bl(m, "rhiona").recursos.pv.atual = 9;
  const pv = EV.previa(bl(m, "rhiona"), { tipo: "pv" }, pend.config);
  t.ok("prévia legível: 'PV máx. 22 → 24; PV atuais continuam 9'", pv.ok && pv.rotulo === "PV máx. 22 → 24; PV atuais continuam 9", pv.rotulo);
  /* a configuração muda depois do marco: o marco segue a dele */
  operar(m, { tipo: "evolucaoConfigurar", config: { modo: "marcos", pvPorEscolha: 5 } });
  const r = operar(m, { tipo: "escolherMelhoria", quem: "rhiona", pendente: pend.id, escolha: { tipo: "pv" } }, jog("rhiona"));
  const rh = bl(m, "rhiona");
  t.ok("o marco usa a configuração congelada (+2, não +5); atuais continuam 9", r.ok && R.pvMax(rh) === 24 && rh.recursos.pv.atual === 9 && rh.nivel === n0 + 1);

  /* habilidade: proposta, recusa (volta à escolha sem perder o marco), aprovação */
  operar(m, { tipo: "subirNivel", personagem: "rhiona" });
  const p2 = bl(m, "rhiona").evolucao.pendente;
  t.ok("habilidade personalizada exige nome e efeito", !operar(m, { tipo: "escolherMelhoria", quem: "rhiona", pendente: p2.id, escolha: { tipo: "habilidade", habilidade: { nome: "Sexto sentido", texto: "" } } }, jog("rhiona")).ok);
  operar(m, { tipo: "escolherMelhoria", quem: "rhiona", pendente: p2.id, escolha: { tipo: "habilidade", habilidade: { nome: "Sexto sentido", texto: "Pressente emboscadas." } } }, jog("rhiona"));
  t.ok("a proposta fica aguardando o Mestre (nível não muda)", bl(m, "rhiona").evolucao.pendente.proposta && bl(m, "rhiona").nivel === n0 + 1);
  t.ok("com proposta aguardando, a jogadora não escolhe outra por cima", !operar(m, { tipo: "escolherMelhoria", quem: "rhiona", pendente: p2.id, escolha: { tipo: "pd" } }, jog("rhiona")).ok);
  operar(m, { tipo: "aprovarHabilidade", personagem: "rhiona", pendente: p2.id, aprovar: false });
  t.ok("recusa volta para a escolha, sem perder o marco", bl(m, "rhiona").evolucao.pendente && bl(m, "rhiona").evolucao.pendente.id === p2.id && !bl(m, "rhiona").evolucao.pendente.proposta);
  operar(m, { tipo: "escolherMelhoria", quem: "rhiona", pendente: p2.id, escolha: { tipo: "habilidade", habilidade: { nome: "Sexto sentido", texto: "Pressente emboscadas." } } }, jog("rhiona"));
  operar(m, { tipo: "aprovarHabilidade", personagem: "rhiona", pendente: p2.id });
  t.ok("aprovada: a habilidade entra com a marca da evolução", bl(m, "rhiona").habilidades.some((h) => h.nome === "Sexto sentido" && h.origemEvolucao) && bl(m, "rhiona").nivel === n0 + 2);

  /* teto: atributo no d12 fica indisponível com o motivo */
  bl(m, "rhiona").base.atributos.fisico = 12;
  operar(m, { tipo: "subirNivel", personagem: "rhiona" });
  const p3 = bl(m, "rhiona").evolucao.pendente;
  const teto = EV.previa(bl(m, "rhiona"), { tipo: "atributo", chave: "fisico" }, p3.config);
  t.ok("atributo no teto: indisponível, com o motivo (sem d20)", !teto.ok && /teto d12/.test(teto.motivo), teto.motivo);
  t.ok("o teto olha o valor permanente, sem bônus temporário", (() => { const b = JSON.parse(JSON.stringify(bl(m, "rhiona"))); b.base.atributos.mente = 10; b.efeitos.push(R.normalizarEfeito({ tipo: "passoAtributo", alvo: "mente", n: 1, expira: "cena", fonte: "teste" })); return EV.previa(b, { tipo: "atributo", chave: "mente" }, p3.config).ok; })());

  /* exportar/importar no meio da pendência */
  const exportada = JSON.parse(JSON.stringify(bl(m, "rhiona")));
  const importada = R.normalizar(exportada);
  t.ok("exportar/importar no meio de uma pendência conserva marco e registros", importada.evolucao.pendente && importada.evolucao.pendente.id === p3.id && importada.evolucao.registros.length === 2);
  operar(m, { tipo: "cancelarSubida", personagem: "rhiona", pendente: p3.id });
  t.ok("cancelar o marco não concede nada", !bl(m, "rhiona").evolucao.pendente && bl(m, "rhiona").nivel === n0 + 2);

  /* desfazer: só o último aplicável; dependência explicada */
  const regs = EV.vivos(bl(m, "rhiona"));
  const primeiro = regs[0];
  const dep = operar(m, { tipo: "desfazerEvolucao", personagem: "rhiona", registro: primeiro.id });
  t.ok("desfazer um registro com dependente: recusa e diz qual resolver antes", !dep.ok && /nível/.test(dep.motivo), dep.motivo);
  t.ok("o desfazível é o mais recente sem dependentes", EV.desfazivel(bl(m, "rhiona")).id === regs[regs.length - 1].id);
  operar(m, { tipo: "desfazerEvolucao", personagem: "rhiona", registro: regs[regs.length - 1].id });
  t.ok("desfazer tira só a habilidade daquele registro", !bl(m, "rhiona").habilidades.some((h) => h.nome === "Sexto sentido") && bl(m, "rhiona").nivel === n0 + 1);
  bl(m, "rhiona").recursos.pv.atual = 24;
  operar(m, { tipo: "desfazerEvolucao", personagem: "rhiona", registro: primeiro.id });
  t.ok("desfazer o +2 PV: máximo 22 e atuais limitados a 22 (dano não volta)", R.pvMax(bl(m, "rhiona")) === 22 && bl(m, "rhiona").recursos.pv.atual === 22);

  /* até o 10 */
  bl(m, "rhiona").base.atributos.fisico = 6;
  while (bl(m, "rhiona").nivel < 10) {
    operar(m, { tipo: "subirNivel", personagem: "rhiona" });
    const pp = bl(m, "rhiona").evolucao.pendente;
    operar(m, { tipo: "escolherMelhoria", quem: "rhiona", pendente: pp.id, escolha: { tipo: "pd" } }, jog("rhiona"));
  }
  t.ok("chega ao 10 com uma melhoria por marco", bl(m, "rhiona").nivel === 10 && EV.vivos(bl(m, "rhiona")).length === 10 - n0);
  t.ok("no 10: subir recusado e o histórico fica", !operar(m, { tipo: "subirNivel", personagem: "rhiona" }).ok && bl(m, "rhiona").evolucao.registros.length >= 10 - n0);
  const tr = EV.trilha(bl(m, "rhiona"));
  t.ok("a trilha mostra os 10 níveis, um a um", tr.length === 10 && tr[9].estado === "atual" && tr.every((x, i) => x.nivel === i + 1));
  t.ok("patamar é só sugestão: o registrado na ficha não muda pelo nível", bl(m, "rhiona").patamar === "" && tr[9].patamarSugerido === "lenda");
}

t.grupo("Modo livre e fichas antigas");
{
  const m = novaMesa("alpha-contemporaneo", ["val"]);
  const d = operar(m, { tipo: "definirNivel", personagem: "val", nivel: 7, nota: "marco da mesa" });
  t.ok("livre: o nível muda registrado, sem ganhos automáticos", d.ok && bl(m, "val").nivel === 7 && EV.vivos(bl(m, "val"))[0].ganhos.length === 0);
  const antiga = R.normalizar({ perfilRegras: "beta-vigilia", nivel: 3 });
  t.ok("ficha antiga sem bloco de evolução normaliza vazia e conserva o nível", antiga.nivel === 3 && antiga.evolucao.registros.length === 0 && !antiga.evolucao.pendente);
}

console.log(`\n${FORTE}${passaram} ok${FIM}, ${falharam ? VERMELHO : ""}${falharam} falha(s)${FIM}.`);
if (falharam) { console.log("Falharam:\n  " + falhas.join("\n  ")); Deno.exit(1); }
