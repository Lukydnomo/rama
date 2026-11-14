/* =====================================================================
   R.A.M.A. — testes da Ramificação (v9.5): futuros do personagem
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-ramificacao.js

   O planejador de evolução de Ordem Paranormal (1ª edição) com o motor
   REAL: o caso do Ocultista de 35% → 50% (dois planos, troca de uma
   escolha, comparação, a projeção igual à ficha real com as mesmas
   escolhas), a aplicação nos marcos reais (40% só o de 40%; salto a 50%
   em ordem; repetir sem conceder de novo; conflito; requisito quebrado;
   plano incompleto; troca, desativação, NEX que cai e volta), NEX &
   Experiência (eixos independentes, ordem inversa), Evolução por
   Patentes (abaixo de 50 PP, promoção dupla, perda de PP), Sobrevivente
   (estágio e transição), Mundano, base alterada e o que planejar NÃO
   muda na ficha.
   ===================================================================== */

const ARQUIVOS = ["js/config.js", "js/util.js", "js/sistemas.js", "js/dados.js", "js/habilidades.js", "js/ficha.js",
  "js/ordem/catalogo.js", "js/ordem/pericias-usos.js", "js/ordem/poderes.js", "js/ordem/opcionais.js", "js/ordem/efeitos.js", "js/ordem/condicoes.js",
  "js/ordem/consumo.js", "js/ordem/inventario.js", "js/ordem/personalizacao.js", "js/ordem/aprendizado.js", "js/ordem/progressao.js",
  "js/ordem/biblioteca.js", "js/ordem/regras.js", "js/ordem/itens-dados.js", "js/ordem/itens.js", "js/ordem/rituais-dados.js", "js/ordem/rituais.js",
  "js/ordem/maldicoes.js", "js/ordem/arquivo2.js", "js/ordem/arquivo3.js", "js/ordem/arquivo4.js", "js/ordem/arquivo5.js", "js/ordem/arquivo6.js",
  "js/ordem/arquivo7.js", "js/ordem/arquivo9.js", "js/ordem/ramificacao.js"];
globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.navigator = globalThis.navigator || { onLine: true };
globalThis.location = globalThis.location || { search: "" };
for (const caminho of ARQUIVOS) {
  const codigo = await Deno.readTextFile(new URL("../" + caminho, import.meta.url));
  try { (0, eval)(codigo); } catch (e) { console.error(`Falhou ao carregar ${caminho}: ${e.message}`); Deno.exit(1); }
}
const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0;
const falhas = [];
const t = {
  grupo(x) { console.log(`\n${FORTE}${x}${FIM}`); },
  ok(nome, c, d) { if (c) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${nome}`); } else { falharam++; falhas.push(nome); console.log(`  ${VERMELHO}FALHOU${FIM} ${nome}${d ? `  ${CINZA}${d}${FIM}` : ""}`); } },
  iguais(n, a, b) { const x = JSON.stringify(a), y = JSON.stringify(b); t.ok(n, x === y, `obtido ${x}, esperado ${y}`); },
};
const R = globalThis.RAMAOrdemRegras, E = globalThis.RAMAOrdemProgressao, C = globalThis.RAMAOrdemCatalogo, RT = globalThis.RAMAOrdemRituais, F = globalThis.RAMAFicha, M = globalThis.RAMAOrdemRamificacao;
const copia = (x) => JSON.parse(JSON.stringify(x));
const catalogo = await RT.carregar();
const entradas = catalogo.entradas || catalogo.rituais || catalogo;

/* Uma ficha de Ocultista a 35% com o que ela já decidiu até ali. */
function ficha(opc) {
  const ordem = R.normalizar(Object.assign({ classe: "ocultista", origem: "academico", nex: 35, atributos: { agi: 1, for: 1, int: 3, pre: 2, vig: 2 }, pericias: { ocultismo: "treinado", vontade: "treinado", investigacao: "treinado" } }, opc || {}));
  return { ordem, rituais: [], inventario: { itens: [] } };
}
function copiaDoRitual(nome) {
  const e = entradas.find((x) => x.nome === nome);
  if (!e) throw new Error("ritual não encontrado: " + nome);
  const m = RT.paraFicha(e, { escolha: e.escolha ? (e.escolha.opcoes ? e.escolha.opcoes[0].valor || e.escolha.opcoes[0] : undefined) : undefined });
  return F.criarRitual(m.dados);
}
/* Rituais de 1º/2º círculo que cabem (o motor confere) — para as vagas de ritual. */
function rituaisQueCabem(fx, vagaId, quantos) {
  const cands = [];
  for (const e of entradas) {
    if (cands.length >= quantos) break;
    if (e.circulo > 2 || fx.rituais.some((x) => x.nome === e.nome) || cands.some((x) => x.nome === e.nome)) continue;
    const r = F.criarRitual(RT.paraFicha(e, {}).dados);
    if (!r || !r.id) continue;
    const ok = E.confirmarAquisicao(copia(fx.ordem), copia(fx.rituais), { tipo: "concessao", vaga: vagaId, rituais: cands.map((c) => c.id).concat([r.id]), novos: cands.concat([r]) }, { rituais: fx.rituais });
    if (ok.ok) cands.push(r);
  }
  return cands;
}
/* Decide uma vaga NA PROJEÇÃO (como a tela faz) e devolve a decisão. */
function decidirNaProjecao(fx, plano, vagaId, fazer) {
  const m = M.montar(fx, plano);
  const v = E.vagas(m.proj).find((x) => x.id === vagaId);
  fazer(m.proj, m.projRituais, v, m.ctx);
  return M.decisaoDaProjecao(m.proj, m.projRituais, fx.rituais, v);
}
function escolherPoder(proj, rit, v, ctx, chave) {
  const cands = E.candidatosPoderClasse(proj, v.id, ctx).filter((c) => c.disponivel !== false && (!chave || c.entrada.chave === chave));
  const c = cands.find((x) => !x.entrada.opcoes || !x.entrada.opcoes.length) || cands[0];
  return E.confirmarAquisicao(proj, rit, { tipo: "escolha", vaga: v.id, candidato: { valor: c.entrada.chave, opcoes: {} } }, ctx);
}

/* Prepara as escolhas até 35% (para a base ficar coerente). */
function base35() {
  const fx = ficha();
  fx.ordem.trilha = C.TRILHAS.filter((tr) => tr.classe === "ocultista")[0].chave;
  const ctx = { rituais: fx.rituais, inventario: fx.inventario };
  E.vagas(fx.ordem).sort((a, b) => a.ordem - b.ordem).forEach((v) => {
    if (v.tipo === "rituais") {
      const q = Math.max(1, E.quantidadeDeRituais ? E.quantidadeDeRituais(fx.ordem, v.id, ctx) : 1);
      const rs = rituaisQueCabem(fx, v.id, q);
      if (rs.length) E.confirmarAquisicao(fx.ordem, fx.rituais, { tipo: "concessao", vaga: v.id, rituais: rs.map((r) => r.id), novos: rs }, ctx);
    } else if (v.tipo === "poderClasse") escolherPoder(fx.ordem, fx.rituais, v, ctx);
    else if (v.tipo === "atributo") E.confirmarAquisicao(fx.ordem, fx.rituais, { tipo: "escolha", vaga: v.id, candidato: { valor: "int", opcoes: { pericia: "pilotagem" } } }, ctx);
  });
  return fx;
}

/* =================================================================== */
t.grupo("1. Caso principal: Ocultista 35% → 50%");
const fx = base35();
const antesDaFicha = JSON.stringify(fx);
const p1 = M.novoPlano(fx.ordem, fx.inventario, "Mais rituais");
p1.alvo = { nex: 50 };
const p2 = M.duplicar(p1, "Mais resistente");
t.ok("duplicar copia alvo e escolhas com id novo", p2.id !== p1.id && JSON.stringify(p2.alvo) === JSON.stringify(p1.alvo));
t.iguais("Partindo de 35% → Alvo: 50%", [M.rotuloDoProgresso(M.progressoDe(fx.ordem)), M.rotuloDoAlvo(fx.ordem, p1.alvo)], ["35%", "50%"]);
t.ok("o alvo não aceita marco abaixo da base nem acima do teto", M.normalizarAlvo(fx.ordem, { nex: 20 }).nex === 35 && M.opcoesDoAlvo(fx.ordem).nex[0] === 40 && M.opcoesDoAlvo(fx.ordem).nex.slice(-1)[0] === 99);
let m1 = M.montar(fx, p1);
t.iguais("marcos em ordem, só os que mudam", m1.marcos.map((x) => x.rotulo), ["NEX 40%", "NEX 45%", "NEX 50%"]);
t.ok("vagas do marco 50% incluem atributo, versatilidade, ritual e afinidade", ["d10.atributo", "d10.versatilidade", "d10.ritualClasse", "afinidade"].every((id) => m1.itens.some((i) => i.vaga.id === id)));
t.ok("sem decisões: tudo pendente (A definir)", m1.pendentes === m1.itens.length && m1.definidas === 0);

/* Mais rituais: rituais em 40/45/50 + Int em 50; Mais resistente: Vig em 50. */
const rit40 = rituaisQueCabem({ ordem: M.projetar(fx.ordem, { nex: 40 }), rituais: fx.rituais }, "d8.ritualClasse", 1);
p1.decisoes["d8.ritualClasse"] = decidirNaProjecao(fx, p1, "d8.ritualClasse", (proj, rit, v, ctx) => E.confirmarAquisicao(proj, rit, { tipo: "concessao", vaga: v.id, rituais: rit40.map((r) => r.id), novos: rit40 }, ctx));
p1.decisoes["d10.atributo"] = decidirNaProjecao(fx, p1, "d10.atributo", (proj, rit, v, ctx) => E.confirmarAquisicao(proj, rit, { tipo: "escolha", vaga: v.id, candidato: { valor: "int", opcoes: { pericia: "medicina" } } }, ctx));
p1.decisoes["d9.poderClasse"] = decidirNaProjecao(fx, p1, "d9.poderClasse", (proj, rit, v, ctx) => escolherPoder(proj, rit, v, ctx));
p2.decisoes["d10.atributo"] = decidirNaProjecao(fx, p2, "d10.atributo", (proj, rit, v, ctx) => E.confirmarAquisicao(proj, rit, { tipo: "escolha", vaga: v.id, candidato: { valor: "vig", opcoes: {} } }, ctx));
m1 = M.montar(fx, p1);
const m2 = M.montar(fx, p2);
t.ok("decisões salvas por vaga estável e conferidas pelo motor", m1.itens.filter((i) => i.estado === "definida").map((i) => i.vaga.id).sort().join() === "d10.atributo,d8.ritualClasse,d9.poderClasse", m1.itens.map((i) => i.vaga.id + ":" + i.estado + ":" + i.motivos.join("|")).join(" "));
t.ok("o ritual decidido em 40% entra como cópia nova (não existia na ficha)", p1.decisoes["d8.ritualClasse"].rituais.length === 1);
const cmp = M.comparar(M.ladoDoPlano(fx, p1, m1), M.ladoDoPlano(fx, p2, m2));
const linha = (g, r) => cmp.grupos.find((x) => x.titulo === g).linhas.find((l) => l.rotulo === r);
t.iguais("comparar planos: Intelecto e Vigor em 50% diferem", [linha("Atributos", "Intelecto").a - linha("Atributos", "Intelecto").b, linha("Atributos", "Vigor").b - linha("Atributos", "Vigor").a], [1, 1]);
t.ok("  Mais resistente tem mais PV máximos (Vigor)", linha("Recursos", "PV máximos").b > linha("Recursos", "PV máximos").a);
t.ok("  e o plano incompleto avisa quantas escolhas faltam (A definir)", cmp.a.aDefinir > 0 && cmp.b.aDefinir > cmp.a.aDefinir);
const cmpF = M.comparar(M.ladoDaFicha(fx), M.ladoDoPlano(fx, p1, m1));
t.ok("Ficha atual × plano: o ritual de 40% aparece como ganho, com o marco", cmpF.grupos.find((g) => g.titulo === "Rituais").linhas.some((l) => l.b === "aprende" && /40%/.test(l.marco)), JSON.stringify(cmpF.grupos.find((g) => g.titulo === "Rituais").linhas));
/* A projeção bate com a ficha real aplicada (cópia de teste) com as mesmas escolhas. */
const real = copia(fx);
real.ordem.nex = 50;
["d8.ritualClasse", "d9.poderClasse", "d10.atributo"].forEach((id) => { const v = E.vagas(real.ordem).find((x) => x.id === id); M.gravarDecisao(real.ordem, real.rituais, v, p1.decisoes[id], { rituais: real.rituais, inventario: real.inventario }); });
const cr = R.calcular(real.ordem, real.inventario), cp = R.calcular(m1.proj, fx.inventario);
t.iguais("projeção = ficha real com as mesmas escolhas (PV, PE, SAN, Defesa, atributos)", [cp.pv.total, cp.pe.total, cp.san.total, cp.defesa, E.estado(m1.proj, m1.ctx).atributos], [cr.pv.total, cr.pe.total, cr.san.total, cr.defesa, E.estado(real.ordem, { rituais: real.rituais }).atributos]);
t.ok("planejar, montar e comparar NÃO mudaram a ficha", JSON.stringify(fx) === antesDaFicha);

t.grupo("2. Reavaliar a sequência: Revisar e fora do alvo");
const p3 = M.duplicar(p1, "Teste de requisito");
p3.decisoes["d10.atributo"] = { tipo: "atributo", candidato: { valor: "naoExiste", opcoes: {} }, rituais: [] };
const m3 = M.montar(fx, p3);
const it3 = m3.itens.find((i) => i.vaga.id === "d10.atributo");
t.ok("decisão que não fecha fica visível como Revisar, com motivo, sem contar", it3.estado === "revisar" && it3.motivos.length > 0 && M.ladoDoPlano(fx, p3, m3).est.atributos.int === E.estado(M.projetar(fx.ordem, { nex: 50 }), {}).atributos.int);
const p4 = M.duplicar(p1, "Alvo menor"); p4.alvo = { nex: 40 };
const m4 = M.montar(fx, p4);
t.ok("reduzir o alvo guarda as etapas posteriores como fora do plano atual", m4.fora.indexOf("d10.atributo") >= 0 && m4.fora.indexOf("d9.poderClasse") >= 0 && m4.itens.length === 1);
p4.alvo = { nex: 50 };
t.ok("  expandir de novo traz de volta", M.montar(fx, p4).itens.filter((i) => i.estado === "definida").length === 3);

t.grupo("3. Aplicação automática nos marcos reais");
const doc = { formato: 1, planos: [p1, p2] };
const viva = copia(fx);
M.ativar(viva.ordem, p1);
t.ok("ativar não processa nada nem muda escolhas", JSON.stringify(viva.ordem.escolhas) === JSON.stringify(fx.ordem.escolhas) && !M.avancou(viva.ordem) && M.processar(viva, doc).aplicadas.length === 0);
viva.ordem.nex = 40;
t.ok("o NEX real chegou a 40%: o avanço é detectado", M.avancou(viva.ordem));
let r40 = M.processar(viva, doc);
t.ok("a 40%: só a escolha de 40% entra; 45% e 50% aguardam", r40.aplicadas.length === 1 && /40%/.test(r40.aplicadas[0]) && !viva.ordem.escolhas.some((x) => x.etapa === "d10.atributo"), JSON.stringify(r40));
t.ok("  o ritual entrou na aba Rituais e a escolha tem a procedência", viva.rituais.length === fx.rituais.length + 1 && /Plano Mais rituais/.test(viva.ordem.escolhas.find((x) => x.etapa === "d8.ritualClasse").procedencia));
t.ok("  resumo legível", /40%.*Mais rituais.*1 escolha/.test(viva.ordem.ramificacao.ultimoResumo), viva.ordem.ramificacao.ultimoResumo);
const nRit = viva.rituais.length, nEsc = viva.ordem.escolhas.length;
const repetido = M.processar(viva, doc, { retomar: true });
t.ok("repetir (retomar, outra aba, resposta perdida) não concede de novo", viva.rituais.length === nRit && viva.ordem.escolhas.length === nEsc && repetido.aplicadas.length === 0);
viva.ordem.nex = 50;
const r50 = M.processar(viva, doc);
t.ok("salto 40% → 50%: 45% processado antes de 50%", r50.aplicadas.length === 2 && /45%/.test(r50.aplicadas[0]) && /50%/.test(r50.aplicadas[1]), JSON.stringify(r50.aplicadas));
t.ok("  as vagas sem escolha no plano ficam abertas na Progressão (avisadas)", r50.semEscolha.length >= 3 && viva.ordem.ramificacao.pendentes.length === 0);
const antesDaQueda = JSON.stringify(viva.ordem.escolhas);
viva.ordem.nex = 35; M.processar(viva, doc);
viva.ordem.nex = 50; const volta = M.processar(viva, doc);
t.ok("NEX que cai e volta ao mesmo marco não recria concessão nem mexe em escolha", volta.aplicadas.length === 0 && JSON.stringify(viva.ordem.escolhas) === antesDaQueda && viva.rituais.length === nRit);
/* A mesma coisa pela progressão manual: igual. */
const manual = copia(fx); manual.ordem.nex = 50;
["d8.ritualClasse", "d9.poderClasse", "d10.atributo"].forEach((id) => { const v = E.vagas(manual.ordem).find((x) => x.id === id); M.gravarDecisao(manual.ordem, manual.rituais, v, p1.decisoes[id], { rituais: manual.rituais }); });
t.iguais("igual à progressão manual equivalente (atributos, poderes, rituais)", [E.estado(viva.ordem, { rituais: viva.rituais }).atributos, viva.rituais.length], [E.estado(manual.ordem, { rituais: manual.rituais }).atributos, manual.rituais.length]);

/* Conflito: a vaga já tem outra escolha real. */
const conf = copia(fx); M.ativar(conf.ordem, p1); conf.ordem.nex = 50;
E.confirmarAquisicao(conf.ordem, conf.rituais, { tipo: "escolha", vaga: "d10.atributo", candidato: { valor: "pre", opcoes: {} } }, { rituais: conf.rituais });
const rc = M.processar(conf, doc);
t.ok("escolha real diferente: fica a da ficha, conflito para revisar", rc.conflitos.length === 1 && conf.ordem.escolhas.find((x) => x.etapa === "d10.atributo").valor === "pre" && conf.ordem.ramificacao.pendentes.some((p) => p.status === "conflito"));
/* Mesma escolha já feita: atendida. */
const at = copia(fx); M.ativar(at.ordem, p1); at.ordem.nex = 50;
E.confirmarAquisicao(at.ordem, at.rituais, { tipo: "escolha", vaga: "d10.atributo", candidato: { valor: "int", opcoes: { pericia: "medicina" } } }, { rituais: at.rituais });
t.ok("a mesma opção já escolhida conta como atendida", M.processar(at, doc).atendidas.length === 1);
/* Requisito quebrado na hora: bloqueada, e o resto entra. */
const blq = copia(fx); M.ativar(blq.ordem, p3); blq.ordem.nex = 50;
const rb = M.processar(blq, { planos: [p3] });
t.ok("requisito não cumprido na hora: bloqueada com motivo; as independentes entram", rb.bloqueadas.length === 1 && rb.aplicadas.length === 2 && blq.ordem.ramificacao.pendentes.some((p) => p.status === "bloqueada" && p.motivo));
/* Troca e desativação. */
const tr = copia(fx); M.ativar(tr.ordem, p1); tr.ordem.nex = 40; M.processar(tr, doc);
M.ativar(tr.ordem, p2); tr.ordem.nex = 50; const rt2 = M.processar(tr, doc);
t.ok("trocar de plano: o que já entrou fica; o novo plano segue dali", tr.ordem.escolhas.some((x) => x.etapa === "d8.ritualClasse") && tr.ordem.escolhas.find((x) => x.etapa === "d10.atributo").valor === "vig" && rt2.aplicadas.length === 1);
const ds = copia(fx); M.ativar(ds.ordem, p1); M.desativar(ds.ordem); ds.ordem.nex = 50;
t.ok("desativado: nada é aplicado", M.processar(ds, doc) === null && !ds.ordem.escolhas.some((x) => x.etapa === "d10.atributo"));
/* Plano ativado atrasado. */
const atr = copia(fx); atr.ordem.nex = 50; M.ativar(atr.ordem, p1);
t.ok("plano ativado depois do marco: mostra o que ficou para trás, sem aplicar sozinho", M.atrasadas(atr, p1).length === 3 && M.processar(atr, doc).aplicadas.length === 0);
t.ok("  e aplica só pela ação explícita (Revisar escolhas já liberadas)", M.processar(atr, doc, { retomar: true }).aplicadas.length === 3);
/* Normalização: ramificação e procedência sobrevivem a recarga. */
const recarregada = R.normalizar(copia(viva.ordem));
t.ok("recarregar preserva ativação, recibos e procedência", recarregada.ramificacao.planoId === p1.id && recarregada.ramificacao.recibos.length === viva.ordem.ramificacao.recibos.length && recarregada.escolhas.some((x) => x.procedencia));

t.grupo("4. NEX & Experiência: eixos independentes");
const fe = base35(); fe.ordem.opcionais.nexExperiencia = true; fe.ordem.nivel = 7; fe.ordem.nex = 20;
t.iguais("o trilho é nível + exposição", [M.tipoDoTrilho(fe.ordem), M.rotuloDoProgresso(M.progressoDe(fe.ordem))], ["nivelExposicao", "Nível 7 · exposição 20%"]);
const pe = M.novoPlano(fe.ordem, fe.inventario, "Os dois"); pe.alvo = { nivel: 10, exposicao: 50 };
const me = M.montar(fe, pe);
t.ok("vagas de nível e de exposição separadas por eixo", me.itens.some((i) => i.eixo === "nivel") && me.itens.some((i) => i.eixo === "exposicao"), me.itens.map((i) => i.vaga.id + ":" + i.eixo).join(" "));
const pSoExp = M.novoPlano(fe.ordem, fe.inventario, "Só exposição"); pSoExp.alvo = { nivel: null, exposicao: 50 };
t.ok("plano só de exposição: nenhuma vaga de nível", M.montar(fe, pSoExp).itens.every((i) => i.eixo === "exposicao"));
const expVaga = me.itens.find((i) => i.eixo === "exposicao" && i.vaga.tipo === "afinidade");
pe.decisoes["afinidade"] = { tipo: "afinidade", afinidade: { elemento: "conhecimento", nomeOutro: "" } };
const nvVaga = me.itens.find((i) => i.eixo === "nivel" && i.vaga.tipo === "atributo");
pe.decisoes[nvVaga.vaga.id] = { tipo: "atributo", candidato: { valor: "pre", opcoes: {} }, rituais: [] };
const fe1 = copia(fe); M.ativar(fe1.ordem, pe); fe1.ordem.nivel = 10;
const rN = M.processar(fe1, { planos: [pe] });
t.ok("subir só o nível não dispara escolha de exposição", rN.aplicadas.length === 1 && !(fe1.ordem.afinidade && fe1.ordem.afinidade.elemento), JSON.stringify(rN));
fe1.ordem.nex = 50;
const rX = M.processar(fe1, { planos: [pe] });
t.ok("subir só a exposição aplica só a de exposição", rX.aplicadas.length === 1 && fe1.ordem.afinidade.elemento === "conhecimento");
const fe2 = copia(fe); M.ativar(fe2.ordem, pe); fe2.ordem.nex = 50;
t.ok("ordem inversa (exposição antes do nível) também funciona", M.processar(fe2, { planos: [pe] }).aplicadas.length === 1 && (() => { fe2.ordem.nivel = 10; return M.processar(fe2, { planos: [pe] }).aplicadas.length === 1; })());
const fe3 = copia(fe); M.ativar(fe3.ordem, pe); fe3.ordem.nex = 50; fe3.ordem.nivel = 10;
t.ok("subida conjunta: as duas, sem misturar medidas", M.processar(fe3, { planos: [pe] }).aplicadas.length === 2);
void expVaga;

t.grupo("5. Evolução por Patentes");
const fp = ficha({ classe: "combatente", origem: "militar", nex: 20, atributos: { agi: 2, for: 3, int: 1, pre: 1, vig: 2 } });
fp.ordem.opcionais.evolucaoPatentes = true; fp.ordem.prestigio = 30; fp.ordem.patenteConquistada = 1;
t.iguais("o trilho é a patente", M.tipoDoTrilho(fp.ordem), "patente");
const pp = M.novoPlano(fp.ordem, fp.inventario, "Promoção");
pp.alvo = { patente: 2 };
t.ok("o alvo mostra a patente e o mínimo de PP", /\(mín\. \d+ PP\)/.test(M.rotuloDoAlvo(fp.ordem, pp.alvo)), M.rotuloDoAlvo(fp.ordem, pp.alvo));
const mp = M.montar(fp, pp);
t.ok("a projeção usa as vagas da patente alvo", mp.itens.length > 0, String(mp.itens.length));
const vp = mp.itens.find((i) => i.vaga.tipo === "poderClasse") || mp.itens[0];
if (vp && vp.vaga.tipo === "poderClasse") pp.decisoes[vp.vaga.id] = M.decisaoDaProjecao(...(() => { const mm = M.montar(fp, pp); escolherPoder(mm.proj, mm.projRituais, E.vagas(mm.proj).find((x) => x.id === vp.vaga.id), mm.ctx); return [mm.proj, mm.projRituais, fp.rituais, E.vagas(mm.proj).find((x) => x.id === vp.vaga.id)]; })());
const fp1 = copia(fp); M.ativar(fp1.ordem, pp);
fp1.ordem.prestigio = 45; R.registrarPromocao(fp1.ordem);
t.ok("abaixo dos PP da próxima patente: nada dispara", M.processar(fp1, { planos: [pp] }).aplicadas.length === 0);
fp1.ordem.prestigio = C.patenteDaEvolucao(2).pp; R.registrarPromocao(fp1.ordem);
const rp = M.processar(fp1, { planos: [pp] });
t.ok("cruzou os PP: a patente sobe e a escolha planejada entra", fp1.ordem.patenteConquistada === 2 && rp.aplicadas.length === 1, JSON.stringify(rp));
const escolhasDepois = JSON.stringify(fp1.ordem.escolhas);
fp1.ordem.prestigio = 10; M.processar(fp1, { planos: [pp] });
t.ok("perder PP mantendo a patente não dispara, desfaz nem duplica", JSON.stringify(fp1.ordem.escolhas) === escolhasDepois && fp1.ordem.patenteConquistada === 2);
const fp2 = copia(fp); M.ativar(fp2.ordem, pp); fp2.ordem.prestigio = C.patenteDaEvolucao(4).pp; R.registrarPromocao(fp2.ordem);
t.ok("promoção por várias patentes de uma vez: percorre em ordem, sem antecipar o que não está no plano", fp2.ordem.patenteConquistada === 4 && M.processar(fp2, { planos: [pp] }).aplicadas.length === Object.keys(pp.decisoes).length);

t.grupo("6. Sobrevivente, Mundano e mudança de trilho");
const fs = { ordem: R.normalizar({ classe: "sobrevivente", origem: "academico", estagio: 1, atributos: { agi: 1, for: 1, int: 2, pre: 1, vig: 1 } }), rituais: [], inventario: { itens: [] } };
t.iguais("Sobrevivente planeja por estágio", [M.tipoDoTrilho(fs.ordem), M.rotuloDoProgresso(M.progressoDe(fs.ordem)), M.opcoesDoAlvo(fs.ordem).estagio], ["estagio", "Estágio 1", [2, 3, 4, 5]]);
const ps = M.novoPlano(fs.ordem, fs.inventario, "Esperto"); ps.alvo = { estagio: 2 };
const ms = M.montar(fs, ps);
t.ok("o estágio 2 abre a trilha de sobrevivente", ms.itens.some((i) => i.vaga.tipo === "trilhaSobrevivente"), ms.itens.map((i) => i.vaga.id).join(" "));
const fs1 = copia(fs); M.ativar(fs1.ordem, ps);
fs1.ordem.classe = "ocultista"; fs1.ordem.nex = 5;
const rs = M.processar(fs1, { planos: [ps] });
t.ok("virou agente: o plano pausa, guarda as escolhas e pede revisão (sem converter)", rs.pausado && /regra de evolução mudou/.test(rs.pausado) && fs1.ordem.ramificacao.planoId === ps.id);
const fm = { ordem: R.normalizar({ classe: "mundano", origem: "academico" }), rituais: [], inventario: { itens: [] } };
t.iguais("Mundano: sem marcos de evolução", [M.tipoDoTrilho(fm.ordem), JSON.stringify(M.opcoesDoAlvo(fm.ordem))], ["mundano", "{}"]);

t.grupo("7. Base alterada");
const fb = copia(fx);
t.ok("um dano ou uma nota não muda a assinatura", M.assinatura(fb.ordem, fb.inventario) === M.assinatura(Object.assign(copia(fb.ordem), { recursos: { pv: 3, pe: 1, san: 2, pd: null } }), fb.inventario));
fb.ordem.atributos.vig = 3;
t.ok("um atributo-base muda: A ficha mudou desde este plano", M.montar(fb, p1).mudouBase === true && M.montar(fx, p1).mudouBase === false);
const fa = copia(fx); fa.ordem.nex = 55;
t.ok("alvo já alcançado pela ficha: avisado (o plano não é reescrito)", M.montar(fa, p1).alcancado === true && p1.alvo.nex === 50);
t.ok("o documento normaliza e limita os planos", M.normalizarDoc({ planos: Array.from({ length: 12 }, (_, i) => Object.assign(copia(p1), { id: "x" + i })) }).planos.length === M.LIMITE_PLANOS);

t.grupo("8. Guardar enxuto e reabrir");
const docCheio = { formato: 1, planos: [p1, p2] };
const enxuto = M.compactarDoc(docCheio);
const rEnx = enxuto.planos[0].decisoes["d8.ritualClasse"].rituais[0];
t.ok("a cópia de ritual vai ao servidor como referência (id, catálogo, elemento)", rEnx.compacto === true && rEnx.id === p1.decisoes["d8.ritualClasse"].rituais[0].id && !rEnx.descricao && JSON.stringify(enxuto).length < JSON.stringify(docCheio).length - 1000);
t.ok("  e o plano original não foi alterado ao compactar", !p1.decisoes["d8.ritualClasse"].rituais[0].compacto);
const reaberto = M.hidratarDoc(JSON.parse(JSON.stringify(enxuto)), entradas);
const rRe = reaberto.planos[0].decisoes["d8.ritualClasse"].rituais[0], rOr = p1.decisoes["d8.ritualClasse"].rituais[0];
t.iguais("reabrir refaz a cópia pelo catálogo, com o mesmo id e o mesmo conteúdo", [rRe.id, rRe.nome, rRe.descricao, rRe.circulo, JSON.stringify(rRe.ordem), rRe.versoes.length], [rOr.id, rOr.nome, rOr.descricao, rOr.circulo, JSON.stringify(rOr.ordem), rOr.versoes.length]);
const mRe = M.montar(fx, reaberto.planos[0]);
t.iguais("o plano reaberto monta igual ao original", mRe.itens.map((i) => i.vaga.id + ":" + i.estado), m1.itens.map((i) => i.vaga.id + ":" + i.estado));
const semCat = M.hidratarDoc(JSON.parse(JSON.stringify(enxuto)), entradas.filter((e) => e.id !== rEnx.origemCatalogoId));
const mSem = M.montar(fx, semCat.planos[0]);
const itSem = mSem.itens.find((i) => i.vaga.id === "d8.ritualClasse");
t.ok("ritual fora do catálogo ativo (suplemento desligado): Revisar com o motivo, sem substituto", itSem.estado === "revisar" && /catálogo ativo/.test(itSem.motivos.join(" ")), JSON.stringify(itSem.motivos));
const dep = copia(fx); M.ativar(dep.ordem, semCat.planos[0]); dep.ordem.nex = 50;
const rDep = M.processar(dep, semCat);
t.ok("  na aplicação: fica bloqueada com o motivo e as independentes entram", rDep.bloqueadas.length === 1 && rDep.aplicadas.length === 2 && dep.rituais.length === fx.rituais.length, JSON.stringify(rDep));
const rDep2 = M.processar(dep, reaberto, { retomar: true });
t.ok("  Retomar depois que o catálogo volta: aplica só a que faltava", rDep2.aplicadas.length === 1 && dep.rituais.length === fx.rituais.length + 1 && dep.ordem.ramificacao.pendentes.length === 0, JSON.stringify(rDep2));

console.log(`\n${FORTE}${passaram} ok${FIM}, ${falharam ? VERMELHO : ""}${falharam} falha(s)${FIM}.`);
if (falharam) { console.log("Falharam:\n  " + falhas.join("\n  ")); Deno.exit(1); }
