/* =====================================================================
   R.A.M.A. — testes de Ordem II, etapa 3 (v9.2): evolução e paranormal
   Experimental — regra do R.A.M.A.
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-ordem2-etapa3.js

   Evolução por marcos (subir, escolher, teto, aprovar, desfazer,
   dependências, preset), exportar/importar com evolução e ritual, o
   módulo paranormal desligado e ligado (prévia, custo único, sucesso,
   falha, crítico, forçar, elaborado com interrupção), desligar sem perder
   nada, a gruta jogável sem conjuração e duas sessões curtas (Alpha e
   Beta), com o módulo desligado e ligado. Dados: FILA combinada.
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
  igual(n, a, b) { t.ok(n, Object.is(a, b), `obtido ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`); },
  iguais(n, a, b) { const x = JSON.stringify(a), y = JSON.stringify(b); t.ok(n, x === y, `obtido ${x}, esperado ${y}`); },
};
const K = globalThis.RAMAOrdem2Catalogo, R = globalThis.RAMAOrdem2, MO = globalThis.RAMAOrdem2Motor, ME = globalThis.RAMAOrdem2Mesa, P = globalThis.RAMAOrdem2Proc, EV = globalThis.RAMAOrdem2Evolucao, PA = globalThis.RAMAOrdem2Paranormal;
const PAC = globalThis.PACOTE_SINTETICO_ORDEM2;
function fila(...faces) { const q = faces.flat(); return (n) => { if (!q.length) throw new Error("fila vazia (d" + n + ")"); return q.shift(); }; }
const nada = (n) => { throw new Error("rolou sem esperar (d" + n + ")"); };
const MESTRE = { mestre: true, pode: [] };
const jog = (...ids) => ({ mestre: false, pode: ids });
function novaMesa(perfil, presets) {
  const fichas = {};
  (presets || []).forEach((id) => { fichas[id] = { nome: K.preset(id).nome, bloco: R.dePreset(id) }; });
  return { estado: ME.estadoVazio(perfil || "beta-vigilia"), fichas, pacotes: PAC };
}
/* Como o servidor: normaliza a mesa e as fichas, hidrata, aplica, desidrata. */
function operar(m, op, papel, rolar) {
  const e = ME.normalizar(JSON.parse(JSON.stringify(m.estado)));
  P.hidratar(e, m.pacotes);
  Object.keys(m.fichas).forEach((k) => { m.fichas[k].bloco = R.normalizar(m.fichas[k].bloco); });
  const r = ME.aplicar(e, m.fichas, op, papel || MESTRE, rolar || nada, { pacotes: m.pacotes });
  if (r.ok) m.estado = JSON.parse(JSON.stringify(P.desidratar(ME.normalizar(e))));
  return r;
}
const lido = (m) => { const e = ME.normalizar(JSON.parse(JSON.stringify(m.estado))); P.hidratar(e, m.pacotes); return e; };
const bl = (m, pid) => m.fichas[pid].bloco;
const textos = (r) => (r.eventos || []).map((x) => x.texto).join(" | ");

/* =================================================================== */
t.grupo("O que o texto diz (confirmado) e o que é proposta");
{
  const val = R.dePreset("val");
  t.ok("presets sem evolução inferida: nenhum registro, nível impresso", val.nivel === 6 && val.evolucao.registros.length === 0 && !val.evolucao.pendente);
  t.ok("patamar continua campo separado (não sai do nível)", val.patamar === "" && R.dePreset("rhiona").patamar === "");
  t.ok("NEX é só metadado vazio", val.evolucao.nex === "");
  t.ok("modo padrão da campanha: livre", EV.configDaMesa(ME.estadoVazio("beta-vigilia")).modo === "livre");
  t.ok("o paranormal começa DESLIGADO", PA.configDaMesa(ME.estadoVazio("beta-vigilia")).ativo === false);
  t.iguais("rascunho de DT/custo: 7/1, 10/3, 13/5 (ajustáveis)", ["simples", "intermediario", "complexo"].map((k) => PA.configPadrao().dts[k] + "/" + PA.configPadrao().custos[k]), ["7/1", "10/3", "13/5"]);
  t.ok("o selo Experimental — regra do R.A.M.A. acompanha a prévia", PA.SELO === "Experimental — regra do R.A.M.A.");
}

t.grupo("Evolução · modo livre e por marcos");
const m = novaMesa("alpha-contemporaneo", ["val", "alan"]);
{
  const recusa = operar(m, { tipo: "subirNivel", personagem: "val" });
  t.ok("no modo livre, \"subir nível\" é recusado (o Mestre define)", !recusa.ok && /livre/.test(recusa.motivo));
  const dn = operar(m, { tipo: "definirNivel", personagem: "alan", nivel: 3 });
  t.ok("livre: o Mestre põe o nível 3 e fica registrado (sem ganhos)", dn.ok && bl(m, "alan").nivel === 3 && bl(m, "alan").evolucao.registros.slice(-1)[0].ganhos.length === 0);
  operar(m, { tipo: "evolucaoConfigurar", config: { modo: "marcos" } });
  const jogNao = operar(m, { tipo: "subirNivel", personagem: "val" }, jog("val"));
  t.ok("só o Mestre confirma a subida", !jogNao.ok);
  const sobe = operar(m, { tipo: "subirNivel", personagem: "val" });
  t.ok("marcos: o Mestre confirma; a escolha fica pendente para o nível 7", sobe.ok && bl(m, "val").evolucao.pendente.nivelDepois === 7 && bl(m, "val").nivel === 6);
  const pv = EV.previa(bl(m, "val"), { tipo: "atributo", chave: "mente" }, { teto: 12 });
  t.ok("prévia antes/depois: Mente d10 → d12", pv.ok && pv.rotulo === "Mente: d10 → d12");
  const esc = operar(m, { tipo: "escolherMelhoria", quem: "val", escolha: { tipo: "atributo", chave: "mente" } }, jog("val"));
  t.ok("a jogadora escolhe; o nível sobe e Mente vira d12", esc.ok && bl(m, "val").nivel === 7 && R.dadoDoAtributo(bl(m, "val"), "mente") === 12);
  t.igual("o valor IMPRESSO não muda (base continua d10)", bl(m, "val").base.atributos.mente, 10);
  t.igual("a procedência do preset fica", bl(m, "val").procedencia.preset, "val");
  operar(m, { tipo: "subirNivel", personagem: "val" });
  const teto = operar(m, { tipo: "escolherMelhoria", quem: "val", escolha: { tipo: "atributo", chave: "mente" } }, jog("val"));
  t.ok("teto: d12 não sobe (sem d20)", !teto.ok && /teto d12/.test(teto.motivo));
  const pvAtual = bl(m, "val").recursos.pv.atual;
  bl(m, "val").recursos.pv.atual = 10;
  const pvMais = operar(m, { tipo: "escolherMelhoria", quem: "val", escolha: { tipo: "pv" } }, jog("val"));
  t.ok("+2 PV máximos: 18 → 20, os atuais ficam (10); recuperar é outra ação", pvMais.ok && R.pvMax(bl(m, "val")) === 20 && bl(m, "val").recursos.pv.atual === 10 && bl(m, "val").recursos.pv.max === 18);
  void pvAtual;
  operar(m, { tipo: "subirNivel", personagem: "val" });
  const prop = operar(m, { tipo: "escolherMelhoria", quem: "val", escolha: { tipo: "habilidade", habilidade: { nome: "Olho clínico", texto: "Experimental: +1 passo em Medicina para diagnosticar." } } }, jog("val"));
  t.ok("habilidade: a jogadora propõe e espera o Mestre (o nível ainda não sobe)", prop.ok && bl(m, "val").evolucao.pendente.proposta && bl(m, "val").nivel === 8);
  const ap = operar(m, { tipo: "aprovarHabilidade", personagem: "val" });
  const h = bl(m, "val").habilidades.find((x) => x.nome === "Olho clínico");
  t.ok("aprovada: nível 9 e a habilidade marcada com o registro de origem", ap.ok && bl(m, "val").nivel === 9 && h && h.origemEvolucao);
  const regs = bl(m, "val").evolucao.registros;
  t.iguais("registros separados, com antes/depois", regs.map((r) => r.nivelAntes + "→" + r.nivelDepois + ":" + r.ganhos.map((g) => g.tipo + (g.para ? (g.de ? " " + g.de : "") + "→" + g.para : "")).join("")), ["6→7:atributo d10→d12", "7→8:pv 18→20", "8→9:habilidade→Olho clínico"]);
}

t.grupo("Evolução · desfazer só a operação, com dependências");
{
  const regs = bl(m, "val").evolucao.registros;
  const cedo = operar(m, { tipo: "desfazerEvolucao", personagem: "val", registro: regs[0].id });
  t.ok("desfazer um registro antigo pede para resolver os posteriores", !cedo.ok && /posterior/.test(cedo.motivo));
  bl(m, "val").recursos.pv.atual = 20;
  operar(m, { tipo: "desfazerEvolucao", personagem: "val", registro: regs[2].id });
  t.ok("desfaz a habilidade: some a habilidade, nível volta a 8", !bl(m, "val").habilidades.some((x) => x.nome === "Olho clínico") && bl(m, "val").nivel === 8);
  bl(m, "val").recursos.pv.atual = 15;
  operar(m, { tipo: "desfazerEvolucao", personagem: "val", registro: regs[1].id });
  t.ok("desfaz +2 PV: máximo 18; o atual (15) fica — dano antigo não volta", R.pvMax(bl(m, "val")) === 18 && bl(m, "val").recursos.pv.atual === 15);
  operar(m, { tipo: "desfazerEvolucao", personagem: "val", registro: regs[0].id });
  t.ok("desfaz Mente: volta a d10; os registros ficam marcados como desfeitos", R.dadoDoAtributo(bl(m, "val"), "mente") === 10 && bl(m, "val").nivel === 6 && bl(m, "val").evolucao.registros.every((r) => r.desfeito));
  const pre = EV.previaAtualizacao(bl(m, "val"));
  t.ok("atualizar o preset pede prévia (sem mudança, nenhuma diferença)", pre.ok && pre.diferencas.length === 0);
  const sem = EV.aplicarAtualizacao(bl(m, "val"));
  t.ok("…e só aplica com confirmação", !sem.ok && /Confirme/.test(sem.motivo));
  const com = EV.aplicarAtualizacao(bl(m, "val"), true);
  t.ok("confirmado: registros de evolução preservados e histórico anotado", com.ok && bl(m, "val").evolucao.registros.length === 3 && bl(m, "val").historico.some((h) => h.tipo === "preset"));
}

t.grupo("Exportar/importar uma ficha com evolução e ritual");
{
  const b = R.dePreset("rhiona");
  const lutaAntes = R.dadoDaPericia(b, R.pericia(b, "luta"));
  EV.registrar(b, { modo: "marcos", nivelDepois: 4 }, [{ tipo: "pericia", chave: "luta", n: 1, de: "d" + lutaAntes, para: "d" + R.passoDado(lutaAntes, 1) }]);
  b.paranormal.rituais.push(PA.normalizarEntrada({ nome: "Selo de brasa", classe: "experimental", efeitos: { normal: [{ tipo: "dano", valor: "1d6" }] } }));
  /* Exportar = cópia JSON; importar = ids novos (devolverOrdem2) e normalizar. */
  const json = JSON.parse(JSON.stringify(b));
  json.base.pericias.forEach((p) => { p.id = "novo-" + Math.random().toString(36).slice(2); });
  json.habilidades.forEach((h) => { h.id = "novo-" + Math.random().toString(36).slice(2); });
  json.operacoes = []; json.local = null;
  const volta = R.normalizar(json);
  t.ok("importada: a evolução vale pela CHAVE da perícia (ids novos)", R.dadoDaPericia(volta, R.pericia(volta, "luta")) === R.passoDado(lutaAntes, 1) && volta.nivel === 4);
  t.ok("…e o ritual aprendido vem junto", volta.paranormal.rituais.length === 1 && volta.paranormal.rituais[0].efeitos.normal[0].valor === "1d6");
}

t.grupo("Paranormal · desligado por padrão, procedimento ≠ conjuração");
const g = novaMesa("beta-vigilia", ["rhiona", "sira"]);
{
  operar(g, { tipo: "ritualSalvar", ritual: { id: "brasa", nome: "Selo de brasa", classe: "experimental", complexidade: "intermediario", elementos: ["Energia"], alvo: "um", efeitos: { normal: [{ tipo: "dano", valor: "1d6" }], critico: [{ tipo: "dano", valor: "2d6" }], falha: [] } } });
  operar(g, { tipo: "ritualSalvar", ritual: { id: "chama-runas", nome: "Chama das runas (cena)", classe: "procedimento", referencias: [{ fonte: "Beta", pagina: "60–71", nota: "joga-se pelo desafio de runas" }] } });
  const ens = operar(g, { tipo: "ritualEnsinar", ritual: "brasa", para: ["rhiona"] });
  operar(g, { tipo: "ritualEnsinar", ritual: "chama-runas", para: ["rhiona"] });
  t.ok("o Mestre cria na biblioteca e ensina (uma cópia vai para a ficha)", ens.ok && bl(g, "rhiona").paranormal.rituais.length === 2);
  const rit = bl(g, "rhiona").paranormal.rituais.find((x) => x.nome === "Selo de brasa").id;
  const desl = operar(g, { tipo: "conjurar", quem: "rhiona", ritual: rit, confirmar: true }, jog("rhiona"));
  t.ok("módulo desligado: conjurar é recusado", !desl.ok && /desligado/.test(desl.motivo));
  t.ok("a biblioteca do Mestre não vai para a jogadora", ME.vista(lido(g), jog("rhiona")).paranormal.biblioteca.length === 0);
  operar(g, { tipo: "paranormalConfigurar", config: { ativo: true } });
  const proc = operar(g, { tipo: "conjurar", quem: "rhiona", ritual: bl(g, "rhiona").paranormal.rituais.find((x) => x.classe === "procedimento").id, confirmar: true }, jog("rhiona"));
  t.ok("mesmo ligado, o procedimento da missão não vira conjuração livre", !proc.ok && /procedimento/.test(proc.motivo));
}

t.grupo("Paranormal · prévia, custo único, sucesso, falha, crítico");
{
  operar(g, { tipo: "iniciarCombate", personagens: ["rhiona", "sira"], antecipar: false });
  operar(g, { tipo: "adicionarAmeaca", ameaca: "cria-da-floresta", quantidade: 1 });
  const cria = lido(g).combate.participantes.find((p) => p.ameaca === "cria-da-floresta");
  const rit = bl(g, "rhiona").paranormal.rituais.find((x) => x.nome === "Selo de brasa").id;
  const pd0 = bl(g, "rhiona").recursos.pd.atual;
  const pre = operar(g, { tipo: "conjurar", quem: "rhiona", ritual: rit, alvos: [cria.id] }, jog("rhiona"));
  const pv = pre.resultado.previa;
  t.ok("prévia: ação, custo, DT, alvo e teste — nada cobrado", pre.ok && pv.dt === 10 && pv.custoPd === 3 && pv.alvo === "Um alvo" && /Mente/.test(pv.teste) && bl(g, "rhiona").recursos.pd.atual === pd0);
  const ok1 = operar(g, { tipo: "conjurar", quem: "rhiona", ritual: rit, alvos: [cria.id], confirmar: true }, jog("rhiona"), fila(5, 5, 4));
  const criaDepois = lido(g).combate.participantes.find((p) => p.id === cria.id);
  t.ok("sucesso (5+5): paga 3 PD uma vez e o 1d6 (4) atinge a cria", ok1.ok && bl(g, "rhiona").recursos.pd.atual === pd0 - 3 && criaDepois.bloco.recursos.pv.atual === 6, textos(ok1));
  const pd1 = bl(g, "rhiona").recursos.pd.atual;
  const falha = operar(g, { tipo: "conjurar", quem: "rhiona", ritual: rit, alvos: [cria.id], confirmar: true }, jog("rhiona"), fila(2, 3));
  const pend = lido(g).paranormal.pendentes.slice(-1)[0];
  t.ok("falha: o custo é cobrado mesmo assim; sem efeito de falha configurado, vai para o Mestre", falha.ok && bl(g, "rhiona").recursos.pd.atual === pd1 - 3 && pend && pend.resultado === "falha", textos(falha));
  const pd2 = bl(g, "rhiona").recursos.pd.atual;
  const crit = operar(g, { tipo: "conjurar", quem: "rhiona", ritual: rit, alvos: [cria.id], confirmar: true }, jog("rhiona"), fila(6, 6, 3, 3));
  t.ok("crítico (6/6): efeito do crítico (2d6 = 6), custo uma vez", crit.ok && bl(g, "rhiona").recursos.pd.atual === pd2 - 3 && /2d6/.test(textos(crit)), textos(crit));
  const sem = bl(g, "rhiona"); sem.recursos.pd.atual = 2;
  const caro = operar(g, { tipo: "conjurar", quem: "rhiona", ritual: rit, confirmar: true }, jog("rhiona"));
  t.ok("sem PD para o custo: recusado antes de rolar", !caro.ok && /PD insuficiente/.test(caro.motivo));
  bl(g, "rhiona").recursos.pd.atual = 12;
}

t.grupo("Paranormal · forçar a conjuração (opcional, editável)");
{
  const rit = bl(g, "rhiona").paranormal.rituais.find((x) => x.nome === "Selo de brasa").id;
  const nao = operar(g, { tipo: "conjurar", quem: "rhiona", ritual: rit, forcar: { dado: "pericia" }, confirmar: true }, jog("rhiona"));
  t.ok("forçar desabilitado: recusado", !nao.ok && /Forçar/.test(nao.motivo));
  operar(g, { tipo: "paranormalConfigurar", config: { forcar: { permitido: true, pv: 2, passos: 1, alternativa: "pv" } } });
  const pv0 = bl(g, "rhiona").recursos.pv.atual, pd0 = bl(g, "rhiona").recursos.pd.atual;
  const f = operar(g, { tipo: "conjurar", quem: "rhiona", ritual: rit, forcar: { dado: "pericia" }, confirmar: true }, jog("rhiona"), fila(4, 4, 1));
  t.ok("forçar: 2 PV (uma vez) e +1 passo no dado de perícia", f.ok && bl(g, "rhiona").recursos.pv.atual === pv0 - 2 && bl(g, "rhiona").recursos.pd.atual === pd0 - 3 && /Forçar a conjuração/.test(JSON.stringify(lido(g).testes.slice(-1)[0].montagem.fontes)), textos(f));
  bl(g, "rhiona").recursos.pv.atual = 1;
  const sem = operar(g, { tipo: "conjurar", quem: "rhiona", ritual: rit, forcar: { dado: "pericia" }, confirmar: true }, jog("rhiona"));
  t.ok("forçar sem PV para pagar: recusado", !sem.ok && /PV insuficiente/.test(sem.motivo));
  bl(g, "rhiona").recursos.pv.atual = 20;
  operar(g, { tipo: "paranormalConfigurar", config: { forcar: { permitido: true, alternativa: "pavor" } } });
  const pv1 = bl(g, "rhiona").recursos.pv.atual;
  const pav = operar(g, { tipo: "conjurar", quem: "rhiona", ritual: rit, forcar: { dado: "atributo" }, confirmar: true }, jog("rhiona"), fila(1, 2));
  t.ok("alternativa pavor: sem PV; falhando, ganha pavor (nunca os dois juntos)", pav.ok && bl(g, "rhiona").recursos.pv.atual === pv1 && bl(g, "rhiona").estado.pavor === 6, textos(pav));
  bl(g, "rhiona").estado.pavor = 0;
}

t.grupo("Paranormal · elaborado: etapas, componente, interrupção");
{
  operar(g, { tipo: "ritualSalvar", ritual: { id: "vigilia", nome: "Vigília das cinzas", classe: "experimental", modo: "elaborado", complexidade: "simples", etapas: [{ nome: "Traçar o círculo" }, { nome: "Queimar a erva", acao: "uma ação" }, { nome: "Recitar" }], componentes: [{ nome: "Erva seca", item: "Erva seca", consome: true, etapa: 2 }], duracao: "cena", efeitos: { normal: [{ tipo: "passo", alvoDado: "todos", n: 1, quem: "proprio" }] } } });
  operar(g, { tipo: "ritualEnsinar", ritual: "vigilia", para: ["sira"] });
  const rit = bl(g, "sira").paranormal.rituais.find((x) => x.nome === "Vigília das cinzas").id;
  const pd0 = bl(g, "sira").recursos.pd.atual;
  operar(g, { tipo: "conjurar", quem: "sira", ritual: rit, confirmar: true }, jog("sira"));
  t.ok("começar não cobra nada; etapa 1 de 3", bl(g, "sira").paranormal.emAndamento.etapa === 0 && bl(g, "sira").recursos.pd.atual === pd0);
  const fora = operar(g, { tipo: "ritualEtapa", quem: "sira", etapa: 2 }, jog("sira"));
  t.ok("fora de ordem: recusado", !fora.ok && /ordem/.test(fora.motivo));
  operar(g, { tipo: "ritualEtapa", quem: "sira", etapa: 0 }, jog("sira"));
  const semErva = operar(g, { tipo: "ritualEtapa", quem: "sira", etapa: 1 }, jog("sira"));
  t.ok("sem o componente da etapa 2: recusado", !semErva.ok && /Erva seca/.test(semErva.motivo));
  bl(g, "sira").itens.push(R.normalizarItem({ nome: "Erva seca", quantidade: 1 }));
  operar(g, { tipo: "ritualEtapa", quem: "sira", etapa: 1 }, jog("sira"));
  t.ok("etapa 2 feita: a erva é consumida", !bl(g, "sira").itens.some((i) => i.nome === "Erva seca") && bl(g, "sira").paranormal.emAndamento.etapa === 2);
  operar(g, { tipo: "dano", personagem: "sira", valor: 2, danoTipo: "fisico" });
  t.ok("dano interrompe o ritual; nenhum custo de execução cobrado", bl(g, "sira").paranormal.emAndamento.interrompido === true && bl(g, "sira").recursos.pd.atual === pd0);
  const depois = operar(g, { tipo: "ritualEtapa", quem: "sira" }, jog("sira"));
  t.ok("interrompido: não continua", !depois.ok && /interrompido/.test(depois.motivo));
  operar(g, { tipo: "ritualInterromper", quem: "sira", descartar: true }, jog("sira"));
  bl(g, "sira").itens.push(R.normalizarItem({ nome: "Erva seca", quantidade: 1 }));
  operar(g, { tipo: "conjurar", quem: "sira", ritual: rit, confirmar: true }, jog("sira"));
  operar(g, { tipo: "ritualEtapa", quem: "sira", etapa: 0 }, jog("sira"));
  operar(g, { tipo: "ritualEtapa", quem: "sira", etapa: 1 }, jog("sira"));
  const prev = operar(g, { tipo: "ritualEtapa", quem: "sira", etapa: 2 }, jog("sira"));
  t.ok("a execução final mostra a prévia antes de confirmar", prev.ok && prev.resultado.previa && bl(g, "sira").recursos.pd.atual === pd0);
  const fim = operar(g, { tipo: "ritualEtapa", quem: "sira", etapa: 2, confirmar: true }, jog("sira"), fila(5, 4, 1, 1));
  t.ok("execução final: 1 PD (simples) uma vez, DT 7, +1 passo em tudo pela cena", fim.ok && bl(g, "sira").recursos.pd.atual === pd0 - 1 && bl(g, "sira").efeitos.some((x) => x.tipo === "passoTodos") && bl(g, "sira").paranormal.ativos.length === 1, textos(fim));
}

t.grupo("Paranormal · desligar sem perder dados; efeitos ativos à mão");
{
  operar(g, { tipo: "paranormalConfigurar", config: { ativo: false } });
  const rit = bl(g, "rhiona").paranormal.rituais.find((x) => x.nome === "Selo de brasa").id;
  const bloq = operar(g, { tipo: "conjurar", quem: "rhiona", ritual: rit, confirmar: true }, jog("rhiona"));
  t.ok("desligado: conjuração nova bloqueada", !bloq.ok);
  t.ok("rituais, histórico e efeitos ativos preservados", bl(g, "rhiona").paranormal.rituais.length === 2 && bl(g, "rhiona").paranormal.historico.length > 3 && bl(g, "sira").paranormal.ativos.length === 1 && lido(g).paranormal.biblioteca.length === 3);
  const at = bl(g, "sira").paranormal.ativos[0];
  const enc = operar(g, { tipo: "efeitoRitualEncerrar", personagem: "sira", efeito: at.id, como: "encerrar" });
  t.ok("o Mestre encerra o efeito ativo explicitamente (o passo sai da ficha)", enc.ok && !bl(g, "sira").efeitos.some((x) => x.tipo === "passoTodos") && bl(g, "sira").paranormal.ativos.length === 0);
}

t.grupo("A gruta da etapa 2 continua jogável sem conjuração livre");
{
  const gr = novaMesa("beta-vigilia", ["rhiona", "sira"]);
  operar(gr, { tipo: "carregarCena", pacote: "sintetico", cena: "gruta" });
  operar(gr, { tipo: "item", id: "runa-a", com: "rhiona" });
  operar(gr, { tipo: "item", id: "runa-b", com: "rhiona" });
  operar(gr, { tipo: "desafioAgir", id: "runas", acao: "encaixar", quem: "rhiona", nicho: 0, item: "runa-a" }, jog("rhiona"));
  operar(gr, { tipo: "desafioAgir", id: "runas", acao: "encaixar", quem: "rhiona", nicho: 1, item: "runa-b" }, jog("rhiona"));
  t.ok("com o paranormal desligado, as runas acendem a chama pelo desafio", PA.configDaMesa(lido(gr)).ativo === false && P.flagAtiva(lido(gr), "chamaAcesa", null));
}

/* Sessões curtas: Alpha (investigação + ferramenta) e Beta (pavor, relação, lesão, fases), sem e com o módulo. */
for (const ligado of [false, true]) {
  t.grupo("Sessão Alpha — investigação e ferramenta (paranormal " + (ligado ? "LIGADO" : "desligado") + ")");
  const a = novaMesa("alpha-contemporaneo", ["heitor", "val"]);
  if (ligado) operar(a, { tipo: "paranormalConfigurar", config: { ativo: true } });
  operar(a, { tipo: "carregarCena", pacote: "sintetico", cena: "sala" });
  const inv = operar(a, { tipo: "investigar", quem: "val", ponto: "estante", pericia: "percepcao", modo: "nada", segunda: "pesquisar" }, jog("val"));
  t.ok("Val investiga com Varredura Ampla (duas perícias)", inv.ok && /Varredura Ampla/.test(textos(inv)), textos(inv));
  operar(a, { tipo: "ferramentaPosse", ferramenta: "termometro", personagem: "heitor" });
  const ter = operar(a, { tipo: "usarFerramenta", quem: "heitor", ferramenta: "termometro", ponto: "estante" }, jog("heitor"));
  t.ok("Heitor usa o termômetro", ter.ok && /quente/i.test(ter.resultado.leitura.texto));
  [1, 2, 3].forEach((r) => operar(a, { tipo: "encerrarRodada", rodada: r }));
  t.igual("sobrecarga na 3ª rodada: −1 PD", bl(a, "val").recursos.pd.atual, 31);
  if (ligado) {
    operar(a, { tipo: "ritualSalvar", ritual: { id: "eco", nome: "Eco de memória", classe: "experimental", alvo: "proprio", efeitos: { normal: [{ tipo: "mestre", texto: "Uma lembrança do lugar (o Mestre narra)." }] } } });
    operar(a, { tipo: "ritualEnsinar", ritual: "eco", para: ["val"] });
    const c = operar(a, { tipo: "conjurar", quem: "val", ritual: bl(a, "val").paranormal.rituais[0].id, confirmar: true }, jog("val"), fila(6, 4));
    t.ok("com o módulo ligado, um efeito narrativo fica pendente para o Mestre", c.ok && lido(a).paranormal.pendentes.some((q) => q.estado === "pendente" && /lembrança/.test(q.texto)), textos(c));
  } else t.ok("com o módulo desligado, nenhuma pendência paranormal", lido(a).paranormal.pendentes.length === 0);

  t.grupo("Sessão Beta — pavor, relação, lesão e fases (paranormal " + (ligado ? "LIGADO" : "desligado") + ")");
  const bt = novaMesa("beta-vigilia", ["cormac", "cavan"]);
  if (ligado) operar(bt, { tipo: "paranormalConfigurar", config: { ativo: true } });
  operar(bt, { tipo: "pavor", personagem: "cavan", acao: "dar" });
  const tp = operar(bt, { tipo: "teste", quem: "cavan", pedido: { pericia: "luta", dt: 7 }, confirmar: true }, jog("cavan"), fila(5, 2, 3));
  const rt = lido(bt).testes.slice(-1)[0].resultado;
  t.ok("pavor d6 (3) anula o dado menor que ele (2)", tp.ok && rt.pavor && rt.pavor.valor === 3 && rt.dados.filter((d) => d.anulado).map((d) => d.valor).join() === "2", textos(tp));
  const rel = bl(bt, "cormac").relacoes.find((r) => r.grau);
  const ir = operar(bt, { tipo: "invocarRelacao", quem: "cormac", relacao: rel.id, beneficio: "teste" }, jog("cormac"));
  const ir2 = operar(bt, { tipo: "invocarRelacao", quem: "cormac", relacao: rel.id, beneficio: "teste" }, jog("cormac"));
  t.ok("relação: uma invocação por missão", ir.ok && !ir2.ok);
  operar(bt, { tipo: "dano", personagem: "cavan", valor: 40, danoTipo: "fisico" });
  const pend = bl(bt, "cavan").estado.pendentes[0];
  t.ok("lesão: zerar PV deixa o teste pendente", !!pend && pend.tipo === "lesao");
  const le = operar(bt, { tipo: "teste", quem: "cavan", contexto: { pendente: pend.id }, confirmar: true }, jog("cavan"), fila(6, 6, 6, 6, 6, 6, 6, 6));
  t.ok("o teste de lesão resolve a máquina de estados", le.ok && !bl(bt, "cavan").estado.pendentes.some((x) => x.id === pend.id), textos(le));
  operar(bt, { tipo: "iniciarCombate", personagens: ["cormac", "cavan"], antecipar: false });
  operar(bt, { tipo: "configurarFases", preset: "quatro" });
  operar(bt, { tipo: "adicionarAmeaca", ameaca: "afogado", quantidade: 1 });
  const af = lido(bt).combate.participantes.find((p) => p.ameaca === "afogado");
  const dec = operar(bt, { tipo: "declarar", quem: "cormac", acao: "agredirCorpo", alvo: af.id }, jog("cormac"));
  t.ok("encontro em quatro fases: Cormac declara o ataque corpo a corpo", dec.ok && lido(bt).combate.ordemFases.length === 4);
  ["suporte", "suporte", "distancia", "distancia"].forEach(() => operar(bt, { tipo: "aplicarFase" }));
  operar(bt, { tipo: "aplicarFase" }, MESTRE, fila(6, 6, 6, 6, 6, 6, 6, 6));
  const ap = operar(bt, { tipo: "aplicarFase" }, MESTRE, fila(6, 6, 6, 6));
  t.ok("a fase de corpo a corpo aplica o golpe de uma vez", ap.ok && lido(bt).combate.participantes.find((p) => p.id === af.id).bloco.recursos.pv.atual < 10, textos(ap));
}

/* =================================================================== */
t.grupo("O resumo que a mesa do Mestre vê (evolução e paranormal)");
{
  const m = novaMesa("beta-vigilia", ["rhiona"]);
  operar(m, { tipo: "evolucaoConfigurar", config: { modo: "marcos" } });
  operar(m, { tipo: "subirNivel", personagem: "rhiona" });
  let rs = R.resumoParaMesa(bl(m, "rhiona"));
  t.ok("resumo: subida pendente aparece para o Mestre", rs.evolucao && rs.evolucao.pendente && rs.evolucao.pendente.nivelDepois === bl(m, "rhiona").nivel + 1);
  operar(m, { tipo: "escolherMelhoria", quem: "rhiona", escolha: { tipo: "pd" } }, jog("rhiona"));
  rs = R.resumoParaMesa(bl(m, "rhiona"));
  t.ok("resumo: o registro vivo leva id e o ganho escrito", rs.evolucao.registros.length === 1 && /PD máx\. 12 → 14/.test(rs.evolucao.registros[0].ganhos) && !!rs.evolucao.registros[0].id, JSON.stringify(rs.evolucao.registros));
  operar(m, { tipo: "paranormalConfigurar", config: { ativo: true } });
  operar(m, { tipo: "ritualSalvar", ritual: { id: "r-res", nome: "Vela Curta", modo: "imediato", alvo: "proprio", duracao: "cena", efeitos: { normal: [{ tipo: "passo", alvoDado: "todos", n: 1 }] } } });
  operar(m, { tipo: "ritualEnsinar", ritual: "r-res", para: ["rhiona"] });
  operar(m, { tipo: "conjurar", quem: "rhiona", ritual: bl(m, "rhiona").paranormal.rituais[0].id, confirmar: true }, jog("rhiona"), fila(6, 6));
  rs = R.resumoParaMesa(bl(m, "rhiona"));
  t.ok("resumo: rituais conhecidos e o efeito ativo (para encerrar)", rs.paranormal.rituais.length === 1 && rs.paranormal.ativos.length === 1 && /\+1 passo/.test(rs.paranormal.ativos[0].descricao), JSON.stringify(rs.paranormal));
  t.ok("resumo: nada da biblioteca do Mestre vai junto", !JSON.stringify(rs).includes("biblioteca"));
}

console.log(`\n${FORTE}${passaram} ok${FIM}, ${falharam ? VERMELHO : ""}${falharam} falha(s)${FIM}.`);
if (falharam) { console.log("Falharam:\n  " + falhas.join("\n  ")); Deno.exit(1); }
