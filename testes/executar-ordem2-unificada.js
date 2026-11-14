/* =====================================================================
   R.A.M.A. — testes de Ordem II (v9.4): regras unificadas
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-ordem2-unificada.js

   UM conjunto de regras: a mesma rolagem dá o mesmo resultado para uma
   ficha do Alpha e uma do Beta, em qualquer ambientação; as habilidades
   de perfil com o efeito mais recente; a migração repetível de fichas e
   mesas gravadas na v9.0–9.3 (aliases com as duas origens, ganhos de
   evolução no caminho certo, desfazer, exportar/importar, reservas
   incompatíveis expiradas, pendências antigas congeladas); as tabelas
   por rodada sem aplicar duas vezes ao alternar exploração e combate; a
   investigação num fluxo só. Dados: FILA combinada.
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
  iguais(n, a, b) { const x = JSON.stringify(a), y = JSON.stringify(b); t.ok(n, x === y, `obtido ${x}, esperado ${y}`); },
};
const K = globalThis.RAMAOrdem2Catalogo, R = globalThis.RAMAOrdem2, MO = globalThis.RAMAOrdem2Motor, ME = globalThis.RAMAOrdem2Mesa, P = globalThis.RAMAOrdem2Proc, EV = globalThis.RAMAOrdem2Evolucao, PA = globalThis.RAMAOrdem2Paranormal;
const PAC = globalThis.PACOTE_SINTETICO_ORDEM2;
function fila(...faces) { const q = faces.flat(); return (n) => { if (!q.length) throw new Error("fila vazia (d" + n + ")"); return q.shift(); }; }
const nada = (n) => { throw new Error("rolou sem esperar (d" + n + ")"); };
const MESTRE = { mestre: true, pode: [] };
const jog = (...ids) => ({ mestre: false, pode: ids });
const copia = (x) => JSON.parse(JSON.stringify(x));
function novaMesa(amb, presets) {
  const fichas = {};
  (presets || []).forEach((id) => { fichas[id] = { nome: K.preset(id).nome, bloco: R.dePreset(id) }; });
  return { estado: ME.estadoVazio(amb || "contemporaneo"), fichas, pacotes: PAC };
}
function operar(m, op, papel, rolar) {
  const e = ME.normalizar(copia(m.estado));
  P.hidratar(e, m.pacotes);
  Object.keys(m.fichas).forEach((k) => { m.fichas[k].bloco = R.normalizar(m.fichas[k].bloco); });
  const r = ME.aplicar(e, m.fichas, op, papel || MESTRE, rolar || nada, { pacotes: m.pacotes });
  if (r.ok) m.estado = copia(P.desidratar(ME.normalizar(e)));
  return r;
}
const lido = (m) => { const e = ME.normalizar(copia(m.estado)); P.hidratar(e, m.pacotes); return e; };
const bl = (m, pid) => m.fichas[pid].bloco;

/* Uma ficha como a v9.3 gravava (o formato antigo, para a migração). */
function legada(presetId, mexer) {
  const b = copia(R.dePreset(presetId));
  delete b.regras; delete b.versaoRegras; delete b.migracao;
  b.perfilRegras = K.PERFIS_REGRAS[K.preset(presetId).perfilRegras].id;
  b.base.pericias = b.base.pericias.filter((p) => !/^o2p-/.test(p.id)).map((p) => { const q = copia(p); delete q.origens; return q; });
  b.habilidades.forEach((h) => { const orig = (b.procedencia.habilidadesOriginais || []).find((o) => K.HABILIDADES_LEGADAS[o.ref].nova === h.ref); if (orig) { h.ref = orig.ref; h.nome = orig.nome; h.texto = orig.texto; } });
  if (b.procedencia) { delete b.procedencia.origem; delete b.procedencia.habilidadesOriginais; }
  if (mexer) mexer(b);
  return b;
}

/* =================================================================== */
t.grupo("1. Uma regra: a mesma rolagem, o mesmo resultado");
{
  const a = R.dePreset("alan"), m = R.dePreset("muirenn");
  t.ok("nenhuma ficha guarda escolha de regra por playtest", !("perfilRegras" in a) && !("perfilRegras" in m) && a.regras === K.REGRAS.id && m.regras === K.REGRAS.id);
  [a, m].forEach((b) => { b.base.atributos.fisico = 8; const l = b.base.pericias.find((p) => p.chave === "luta"); l.dado = 6; });
  const ra = MO.resolver(MO.montar(a, { pericia: "luta" }).montagem, MO.rolar(MO.montar(a, { pericia: "luta" }).montagem, fila(6, 6)), {});
  const rm = MO.resolver(MO.montar(m, { pericia: "luta" }).montagem, MO.rolar(MO.montar(m, { pericia: "luta" }).montagem, fila(6, 6)), {});
  t.iguais("Alan (Alpha) e Muirenn (Beta): mesmos dados → mesmo total, RA, RB e crítico", [ra.total, ra.ra, ra.rb, ra.critico], [rm.total, rm.ra, rm.rb, rm.critico]);
  t.iguais("  pontuação no crítico: as duas maiores para os dois", [MO.pontuacao(ra), MO.pontuacao(rm)], [12, 12]);
  a.estado.caido = true; m.estado.caido = true;
  t.iguais("  caído: −1 passo em Físico para os dois", [MO.montar(a, { atributo: "fisico" }).montagem.dados[0].faces, MO.montar(m, { atributo: "fisico" }).montagem.dados[0].faces], [6, 6]);
  const da = MO.aplicarDano(R.dePreset("alan"), { valor: 99, tipo: "fisico" }), dm = MO.aplicarDano(R.dePreset("muirenn"), { valor: 99, tipo: "fisico" });
  t.ok("  0 PV: teste de lesão para os dois", da.some((x) => /lesão/.test(x.texto)) && dm.some((x) => /lesão/.test(x.texto)));
  /* Mesma campanha, mesma rolagem; trocar só a ambientação não muda nada. */
  function rodar(amb) {
    const mm = novaMesa(amb, ["val", "rhiona"]);
    const p = operar(mm, { tipo: "pedirTeste", rotulo: "Escalar", pericia: "atletismo", dt: 7, alvos: ["val", "rhiona"] });
    operar(mm, { tipo: "teste", quem: "val", contexto: { pedido: p.resultado.pedido }, confirmar: true }, jog("val"), fila(4, 3));
    operar(mm, { tipo: "teste", quem: "rhiona", contexto: { pedido: p.resultado.pedido }, confirmar: true }, jog("rhiona"), fila(4, 3));
    const e = lido(mm); return [e.pedidos[0].respostas.val.total, e.pedidos[0].respostas.rhiona.total];
  }
  t.iguais("trocar SÓ a ambientação da campanha não muda o resultado", rodar("contemporaneo"), rodar("vigilia"));
  const mc = novaMesa("vigilia", ["val"]);
  const vAntes = copia(bl(mc, "val"));
  operar(mc, { tipo: "configurar", ambientacao: "contemporaneo", perfil: "alpha-contemporaneo" });
  t.ok("configurar com o perfil antigo (aba antiga) não muda regra; a ambientação não mexe na ficha", lido(mc).ambientacao === "contemporaneo" && lido(mc).regras === K.REGRAS.id && !("perfil" in lido(mc)) && JSON.stringify(R.normalizar(copia(vAntes)).base) === JSON.stringify(bl(mc, "val").base));
}

t.grupo("2. Habilidades de perfil com o efeito mais recente");
{
  const val = R.dePreset("val"), rowan = R.dePreset("rowan"), amanda = R.dePreset("amanda"), rhiona = R.dePreset("rhiona");
  t.iguais("Prontidão em Val e Rowan: a mesma (2 PD, rolar de novo, 1×/rodada)", [R.motorDe(R.habilidadesDoTipo(val, "prontidao")[0]), R.motorDe(R.habilidadesDoTipo(rowan, "prontidao")[0])].map((x) => x.pd + ":" + x.limite), ["2:rodada", "2:rodada"]);
  t.iguais("Avaliação em Amanda e Rhiona: o efeito da Análise", [amanda, rhiona].map((b) => { const h = R.habilidadesDoTipo(b, "analise")[0]; return h.ref + ":" + h.nome + ":" + R.motorDe(h).maximo; }), ["avaliacao:Avaliação:4", "avaliacao:Avaliação:4"]);
  t.iguais("Rhiona 22 PV / 12 PD; Val 18 PV / 32 PD", [rhiona.recursos.pv.max, rhiona.recursos.pd.max, val.recursos.pv.max, val.recursos.pd.max], [22, 12, 18, 32]);
  t.ok("Varredura Ampla (Val) e Antecipação Tática (Sira) continuam à parte", R.habilidadesDoTipo(val, "duasPericias").length === 1 && R.habilidadesDoTipo(R.dePreset("sira"), "rodadaAntecipada").length === 1 && !R.habilidadesDoTipo(val, "rodadaAntecipada").length);
  /* Executor antigo: ficha da v9.3 com o Ímpeto de 3 espaços (Alan) e de 5 (Heitor). */
  const alanV = R.normalizar(legada("alan", (b) => { b.habilidades.find((h) => h.ref === "impeto_alpha3").estado.espacos = 3; }));
  const imp = R.habilidadesDoTipo(alanV, "impeto")[0];
  t.iguais("Ímpeto moderno num Executor antigo (Alan): mesmo id de instância, 3 espaços mantidos, limite 5", [imp.ref, imp.estado.espacos, R.motorDe(imp).espacos, R.motorDe(imp).zeraFimCena], ["impeto", 3, 5, true]);
  t.ok("  o texto antigo fica na procedência", alanV.procedencia.habilidadesOriginais.some((o) => o.ref === "impeto_alpha3" && /3 espaços/.test(o.texto)));
  const heitorV = R.normalizar(legada("heitor", (b) => { const h = b.habilidades.find((x) => x.ref === "impeto_alpha5"); h.estado.espacos = 5; h.id = "inst-heitor"; }));
  t.iguais("Heitor: barra cheia compatível (5) fica; o id da instância é o mesmo", [R.habilidadesDoTipo(heitorV, "impeto")[0].id, R.habilidadesDoTipo(heitorV, "impeto")[0].estado.espacos], ["inst-heitor", 5]);
  /* Avaliação antiga com dados guardados: expiram sem reembolso. */
  const amV = R.normalizar(legada("amanda", (b) => { const h = b.habilidades.find((x) => x.ref === "avaliacao_alpha"); h.estado.reserva = [{ id: "r1", faces: 4, alvo: "cena" }, { id: "r2", faces: 4, alvo: "cena" }]; b.recursos.pd.atual = 20; }));
  t.ok("Avaliação antiga: 2 dados guardados expiram (sem saldo nem PD de volta) e o aviso diz", R.habilidadesDoTipo(amV, "analise")[0].estado.reserva.length === 0 && amV.recursos.pd.atual === 20 && amV.migracao.avisos.some((a) => /expiraram/.test(a)));
  /* Personalizada com o mesmo nome não é tratada como padrão. */
  const custom = R.normalizar({ perfilRegras: "beta-vigilia", habilidades: [{ id: "h1", ref: "", nome: "Ímpeto", texto: "Minha versão." }] });
  t.iguais("habilidade personalizada chamada Ímpeto continua personalizada", [custom.habilidades[0].ref, custom.habilidades[0].texto], ["", "Minha versão."]);
  const nomeProprio = R.normalizar(legada("val", (b) => { b.habilidades.find((h) => h.ref === "prontidao_alpha").nome = "Reflexo de Plantão"; }));
  t.ok("nome escrito pela pessoa é preservado na migração", R.habilidadesDoTipo(nomeProprio, "prontidao")[0].nome === "Reflexo de Plantão");
}

t.grupo("3. Migração: aliases, ganhos, desfazer, exportar/importar");
{
  /* Uma Beta da v9.3 que tinha Inspecionar d6 E uma Pesquisar d4 (editada),
     com ganhos nos dois, Ofício especializado, item com alias, marco
     pendente e um ritual salvo com "bruxaria". */
  const antiga = legada("rhiona", (b) => {
    const insp = b.base.pericias.find((p) => p.chave === "pesquisar"); insp.chave = "inspecionar"; insp.dado = 6; insp.id = "p-insp";
    b.base.pericias.push({ id: "p-pesq", chave: "pesquisar", especializacao: "", dado: 4 });
    const of = b.base.pericias.find((p) => p.chave === "metalurgia"); of.chave = "oficio";
    b.base.pericias = b.base.pericias.filter((p) => !["maquinas", "tecnologia"].includes(p.chave));
    b.itens.push({ id: "lupa", nome: "Lupa", tipo: "item", vestido: true, passos: { inspecionar: 1, pesquisar: 1 } });
    b.evolucao = { nex: "", pendente: { id: "marco-1", nivelAntes: 5, nivelDepois: 6, aprovadoEm: "2026-11-10", proposta: null, config: { modo: "marcos" } }, registros: [
      { id: "g1", quando: "2026-11-01", modo: "marcos", nivelAntes: 3, nivelDepois: 4, ganhos: [{ tipo: "pericia", chave: "inspecionar", n: 1, de: "d6", para: "d8" }] },
      { id: "g2", quando: "2026-11-02", modo: "marcos", nivelAntes: 4, nivelDepois: 5, ganhos: [{ tipo: "pericia", chave: "pesquisar", n: 1, de: "d4", para: "d6" }] },
    ] };
    b.nivel = 5;
    b.paranormal = { rituais: [{ id: "rit", nome: "Vela", classe: "experimental", efeitos: { normal: [{ tipo: "passo", alvoDado: "pericia", chave: "bruxaria", n: 1 }] } }], emAndamento: null, ativos: [], historico: [] };
  });
  const m1 = R.normalizar(copia(antiga));
  const m2 = R.normalizar(copia(m1));
  const m3 = R.normalizar(copia(m2));
  const pesq = (b) => b.base.pericias.filter((p) => p.chave === "pesquisar");
  t.ok("Pesquisar e Inspecionar viram UMA perícia, com as duas origens guardadas", pesq(m1).length === 1 && pesq(m1)[0].origens.map((o) => o.chave).sort().join() === "inspecionar,pesquisar" && !m1.base.pericias.some((p) => p.chave === "inspecionar"));
  t.iguais("  vale o melhor caminho sem somar passos (Inspecionar d6+1 = d8; Pesquisar d4+1 = d6) → d8", EV.permanentePericia(m1, pesq(m1)[0]), 8);
  t.iguais("  o item com dois aliases do mesmo bônus soma UMA vez (d8 → d10)", R.dadoDaPericia(m1, pesq(m1)[0]), 10);
  t.ok("migrar e normalizar duas vezes: estável (nenhum ganho some nem dobra)", JSON.stringify(m2) === JSON.stringify(m3) && m3.evolucao.registros.length === 2 && EV.permanentePericia(m3, pesq(m3)[0]) === 8);
  t.ok("Ofício especializado: chave metalurgia, especialização e rótulo impresso preservados", (() => { const o = m1.base.pericias.find((p) => p.chave === "metalurgia"); return o && o.especializacao === "Metalurgia" && /Ofício/.test(o.rotuloImpresso); })());
  t.ok("perícias ausentes entram destreinadas (d4), com id fixo, sem reabrir a criação", ["maquinas", "tecnologia"].every((c) => { const p = m1.base.pericias.find((x) => x.chave === c); return p && p.dado === 4 && p.id === "o2p-" + c; }) && m1.escolhas === antiga.escolhas);
  t.ok("marco pendente preservado", m1.evolucao.pendente && m1.evolucao.pendente.id === "marco-1");
  t.ok("ritual salvo: a perícia do efeito vira Ocultismo", m1.paranormal.rituais[0].efeitos.normal[0].chave === "ocultismo");
  t.ok("aviso de migração uma vez, com o que mudou; a ambientação e a origem ficam", m1.migracao.de === "beta-vigilia" && m1.migracao.avisos.length > 0 && !m1.migracao.visto && m1.ambientacao === "vigilia" && m2.migracao.quando === m1.migracao.quando);
  /* Um ganho novo vai para o caminho maior; desfazer tira do caminho certo. */
  const pv = EV.previa(m1, { tipo: "pericia", chave: "pesquisar" }, { modo: "marcos" });
  t.iguais("ganho novo: no caminho que hoje é o maior (Inspecionar), d8 → d10", [pv.ganho.chave, pv.ganho.de, pv.ganho.para], ["inspecionar", "d8", "d10"]);
  m1.evolucao.pendente = null;
  const r1 = EV.desfazer(m1, "g2");
  t.ok("desfazer o ganho migrado de Pesquisar tira só ele (o melhor continua d8, por Inspecionar)", r1.ok && EV.permanentePericia(m1, pesq(m1)[0]) === 8);
  const r2 = EV.desfazer(m1, "g1");
  t.ok("desfazer o de Inspecionar: o melhor passa a ser Pesquisar d4 vs Inspecionar d6 → d6", r2.ok && EV.permanentePericia(m1, pesq(m1)[0]) === 6);
  /* Exportar/importar e compartilhar = a mesma normalização. */
  const imp = R.normalizar(copia(m3));
  t.ok("exportar/importar conserva origens, ganhos e o marco", JSON.stringify(imp.base.pericias) === JSON.stringify(m3.base.pericias) && imp.evolucao.registros.length === 2 && imp.evolucao.pendente.id === "marco-1");
  /* Efeitos e pedidos com alias. */
  const ef = R.normalizar({ versaoRegras: 1, efeitos: [{ tipo: "passoPericia", alvo: "inspecionar", n: 1, expira: "cena", fonte: "X" }, { tipo: "passoPericia", alvo: "pesquisar", n: 1, expira: "cena", fonte: "X" }] });
  t.iguais("o mesmo efeito vindo por dois aliases aplica uma vez", ef.efeitos.length, 1);
  t.ok("teste pedido com 'inspecionar' acha Pesquisar", MO.montar(m3, { pericia: "inspecionar" }).ok && MO.montar(m3, { pericia: "bruxaria" }).ok);
}

t.grupo("4. Mesa: investigação, combate, tabelas e campanha antiga");
{
  /* Trecho contemporâneo: Tecnologia, lesão e combate de três fases. */
  const m = novaMesa("contemporaneo", ["heitor", "val"]);
  const p = operar(m, { tipo: "pedirTeste", rotulo: "Desbloquear o celular", pericia: "tecnologia", dt: 7, alvos: ["val"] });
  const tv = operar(m, { tipo: "teste", quem: "val", contexto: { pedido: p.resultado.pedido }, confirmar: true }, jog("val"), fila(5, 4));
  t.ok("Tecnologia (do Alpha) num teste pedido", tv.ok && lido(m).pedidos[0].respostas.val.sucesso === true);
  operar(m, { tipo: "iniciarCombate", personagens: ["heitor", "val"], npcs: [{ nome: "Cultista", pv: 30, pericias: { luta: 6 } }], antecipar: false });
  t.iguais("combate de cena contemporânea: três fases", lido(m).combate.ordemFases, K.ORDEM_FASES_PADRAO);
  operar(m, { tipo: "dano", personagem: "val", valor: 99, danoTipo: "fisico" });
  t.ok("lesão (Val, do Alpha) pela regra única", bl(m, "val").estado.pendentes.some((x) => x.tipo === "lesao"));

  /* Investigação: Pesquisar, Observar, Interagir, Compartilhar, privacidade. */
  const mi = novaMesa("vigilia", ["rhiona", "val"]);
  operar(mi, { tipo: "ponto", ponto: { id: "pt", nome: "Arquivo", descricao: "Caixas.", revelado: true, pistas: [{ id: "a1", pericias: ["inspecionar"], dt: 4, texto: "Carta rasgada." }, { id: "a2", pericias: ["percepcao"], dt: 4, texto: "Pegadas." }, { id: "a3", pericias: ["medicina"], dt: 12, texto: "SEGREDO-DA-PISTA" }] } });
  const inv = operar(mi, { tipo: "investigar", quem: "rhiona", ponto: "pt", pericia: "pesquisar", segunda: "percepcao", modo: "observar" }, jog("rhiona"));
  t.ok("pista marcada 'inspecionar' sai para quem investiga com Pesquisar; Observar dá a 2ª", inv.ok && inv.resultado.novas.map((n) => n.pista).sort().join() === "a1,a2");
  const vv = JSON.stringify(ME.vista(lido(mi), jog("val")));
  t.ok("privacidade: as descobertas de Rhiona não aparecem para Val; pista não descoberta não aparece", vv.indexOf("Carta rasgada") < 0 && vv.indexOf("SEGREDO-DA-PISTA") < 0);
  operar(mi, { tipo: "compartilhar", quem: "rhiona", aliado: "val", descricao: "A carta." }, jog("rhiona"));
  t.iguais("Compartilhar: Pesquisar DT 10", [lido(mi).investigacao.solicitacoes[0].pericia, lido(mi).investigacao.solicitacoes[0].dt], ["pesquisar", 10]);

  /* Tabelas por rodada: exploração → combate → exploração, sem dobrar. */
  const mt = novaMesa("contemporaneo", ["alan"]);
  operar(mt, { tipo: "tabela", acao: "criar", tabela: { id: "sob", nome: "Sobrecarga", tipo: "sobrecarga", ativa: true, inicio: 1, linhas: [{ de: 1, ate: 99, pd: "1" }] } });
  const pd0 = bl(mt, "alan").recursos.pd.atual;
  operar(mt, { tipo: "encerrarRodada", rodada: 1 });
  operar(mt, { tipo: "iniciarCombate", personagens: ["alan"], antecipar: false });
  const rc = lido(mt).combate.rodada;
  operar(mt, { tipo: "proximaRodada", rodada: rc });
  operar(mt, { tipo: "proximaRodada", rodada: rc });
  operar(mt, { tipo: "encerrarCombate" });
  operar(mt, { tipo: "encerrarRodada", rodada: lido(mt).proc.rodada });
  t.iguais("sobrecarga: 3 rodadas da cena (exploração, combate, exploração) = 3 de dano, sem dobrar nem pular", pd0 - bl(mt, "alan").recursos.pd.atual, 3);
  t.iguais("  o contador da cena avançou também com a rodada de combate", lido(mt).proc.rodada, 4);

  /* Campanha antiga aberta no meio de uma fase: migrar e reabrir não rola,
     não cobra e não aplica dano de novo; a ação declarada segue congelada. */
  const mb = novaMesa("vigilia", ["rowan"]);
  operar(mb, { tipo: "iniciarCombate", personagens: ["rowan"], npcs: [{ nome: "Afogado", pv: 20, pericias: { luta: 6 } }], antecipar: false });
  const npc = lido(mb).combate.participantes.find((x) => x.tipo === "npc");
  operar(mb, { tipo: "declarar", quem: "rowan", acao: "agredirCorpo", alvo: npc.id }, jog("rowan"));
  const velho = copia(mb.estado);
  delete velho.regras; delete velho.versaoRegras; delete velho.migracao; velho.perfil = "beta-vigilia";
  const pvRowan = bl(mb, "rowan").recursos.pv.atual, pdRowan = bl(mb, "rowan").recursos.pd.atual;
  const mig1 = ME.normalizar(copia(velho)), mig2 = ME.normalizar(copia(mig1));
  t.ok("mesa da v9.3 no meio do combate: migra para a regra única e guarda o legado", mig1.regras === K.REGRAS.id && mig1.migracao.de === "beta-vigilia" && mig1.migracao.pendencias.some((x) => /Combate em andamento/.test(x)));
  t.ok("  migrar de novo não muda nada (declarações, rolagens e registro iguais)", JSON.stringify(mig1.combate) === JSON.stringify(mig2.combate) && JSON.stringify(mig1.rolagens) === JSON.stringify(mig2.rolagens) && JSON.stringify(mig1.combate) === JSON.stringify(ME.normalizar(copia(mb.estado)).combate));
  t.ok("  nada foi rolado, cobrado ou ferido na migração", bl(mb, "rowan").recursos.pv.atual === pvRowan && bl(mb, "rowan").recursos.pd.atual === pdRowan && mig1.rolagens.length === lido(mb).rolagens.length);
  t.ok("conflito simplificado chamado direto numa mesa antiga: recusado", !ME.aplicar(mig1, mb.fichas, { tipo: "conflitoAlpha", atacante: "pc-rowan", defensor: npc.id }, MESTRE, nada, {}).ok);
}

t.grupo("5. Catálogo, ocupações e decisões");
{
  t.ok("ocupações num catálogo só, com sugestão por ambientação e ids preservados", K.ocupacoes("vigilia")[0].ambientacoes.indexOf("vigilia") >= 0 && K.ocupacao("ferreira") && K.ocupacao("cientista") && K.OCUPACOES.filter((o) => o.id === "professor").length === 1);
  t.ok("especializações: a união, com as da ambientação primeiro", K.especializacoes("vigilia")[0] === "Artes" && K.especializacoes("vigilia").indexOf("Exatas") >= 0 && K.especializacoes("contemporaneo").indexOf("Folclore") >= 0);
  t.ok("o catálogo de habilidades não tem duas entradas funcionais da mesma habilidade de perfil", ["impeto_alpha3", "impeto_beta", "analise_beta", "avaliacao_alpha", "prontidao_alpha", "prontidao_beta"].every((k) => !K.HABILIDADES[k]) && K.HABILIDADES.impeto && K.HABILIDADES.avaliacao && K.HABILIDADES.prontidao);
  t.ok("a matriz de precedência está registrada (não é edição oficial)", K.DIVERGENCIAS.some((d) => d.id === "precedencia" && /Não é edição oficial/.test(d.escolha)) && /Não é edição oficial/.test(K.REGRAS.texto));
  t.ok("paranormal: a perícia do teste aceita Bruxaria como Ocultismo", PA.normalizarConfig({ pericia: "bruxaria" }).pericia === "ocultismo");
}

console.log(`\n${FORTE}${passaram} ok${FIM}, ${falharam ? VERMELHO : ""}${falharam} falha(s)${FIM}.`);
if (falharam) { console.log("Falharam:\n  " + falhas.join("\n  ")); Deno.exit(1); }
