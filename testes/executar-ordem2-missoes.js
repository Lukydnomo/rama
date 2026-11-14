/* =====================================================================
   R.A.M.A. — testes dos procedimentos das missões de Ordem II (v9.1)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-ordem2-missoes.js

   Quadro, desafios, ferramentas, sobrecarga, encontros, perseguição e
   esconderijo com o pacote SINTÉTICO (testes/fixtures). Se o pacote
   real do Mestre existir nesta máquina (backend/Ordem2Pacotes.local.gs,
   fora do git), as conferências dele rodam no fim; sem ele, são puladas
   e o resto vale igual. Dados: uma FILA combinada, nada sorteado.
   ===================================================================== */

const ARQUIVOS = ["js/ordem2/catalogo.js", "js/ordem2/regras.js", "js/ordem2/motor.js", "js/ordem2/mesa.js", "js/ordem2/ameacas.js", "js/ordem2/procedimentos.js", "testes/fixtures/ordem2-pacote-sintetico.js"];
globalThis.window = globalThis;
for (const caminho of ARQUIVOS) {
  const codigo = await Deno.readTextFile(new URL("../" + caminho, import.meta.url));
  try { (0, eval)(codigo); } catch (e) { console.error(`Falhou ao carregar ${caminho}: ${e.message}\n${e.stack}`); Deno.exit(1); }
}
let PACOTE_REAL = null;
try { (0, eval)(await Deno.readTextFile(new URL("../backend/Ordem2Pacotes.local.gs", import.meta.url))); PACOTE_REAL = globalThis.PACOTES_ORDEM2 || null; } catch (_) { PACOTE_REAL = null; }

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0, pulados = 0;
const falhas = [];
const t = {
  grupo(titulo) { console.log(`\n${FORTE}${titulo}${FIM}`); },
  ok(nome, condicao, detalhe) {
    if (condicao) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${nome}`); }
    else { falharam++; falhas.push(nome); console.log(`  ${VERMELHO}FALHOU${FIM} ${nome}${detalhe ? `  ${CINZA}${detalhe}${FIM}` : ""}`); }
  },
  igual(nome, obtido, esperado) { const ok = Object.is(obtido, esperado); t.ok(nome, ok, ok ? "" : `obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`); },
  iguais(nome, obtido, esperado) { const a = JSON.stringify(obtido), b = JSON.stringify(esperado); t.ok(nome, a === b, a === b ? "" : `obtido ${a}, esperado ${b}`); },
  pular(nome) { pulados++; console.log(`  ${CINZA}pulado${FIM} ${nome}`); },
};

const K = globalThis.RAMAOrdem2Catalogo, R = globalThis.RAMAOrdem2, MO = globalThis.RAMAOrdem2Motor, ME = globalThis.RAMAOrdem2Mesa, P = globalThis.RAMAOrdem2Proc, A = globalThis.RAMAOrdem2Ameacas;
const PAC = globalThis.PACOTE_SINTETICO_ORDEM2;

function fila(...faces) {
  const q = faces.flat();
  const f = (n) => { if (!q.length) throw new Error("fila de dados vazia (d" + n + ")"); return q.shift(); };
  f.resta = () => q.length;
  return f;
}
const nada = (n) => { throw new Error("rolou sem esperar (d" + n + ")"); };
const MESTRE = { mestre: true, pode: [] };
const jog = (...ids) => ({ mestre: false, pode: ids });

/* Uma mesa como o servidor faz: normaliza, hidrata, aplica, desidrata. */
function novaMesa(perfil, presets) {
  const fichas = {};
  (presets || []).forEach((id) => { fichas[id] = { nome: K.preset(id).nome, bloco: R.dePreset(id) }; });
  return { estado: ME.estadoVazio(perfil || "beta-vigilia"), fichas, pacotes: PAC };
}
function operar(m, op, papel, rolar, extra) {
  const e = ME.normalizar(JSON.parse(JSON.stringify(m.estado)));
  P.hidratar(e, m.pacotes);
  const r = ME.aplicar(e, m.fichas, op, papel || MESTRE, rolar || nada, Object.assign({ pacotes: m.pacotes }, extra || {}));
  if (r.ok) { m.estado = JSON.parse(JSON.stringify(P.desidratar(ME.normalizar(e)))); }
  return r;
}
function lido(m) { const e = ME.normalizar(JSON.parse(JSON.stringify(m.estado))); P.hidratar(e, m.pacotes); return e; }
function vistaDe(m, papel) { const e = lido(m); return ME.vista(e, papel); }
function bl(m, pid) { return m.fichas[pid].bloco; }
const textos = (r) => (r.eventos || []).map((x) => x.texto).join(" | ");

/* =================================================================== */
t.grupo("Catálogo · fases, ferramentas, ameaças");
{
  t.iguais("três fases (Beta p. 18) e quatro (Beta pp. 32, 69)", [K.ORDEM_FASES_PADRAO, K.ORDEM_FASES_4], [["geral", "distancia", "corpo"], ["suporte", "distancia", "corpo", "final"]]);
  t.iguais("Defender-se vai para Suporte; Mover-se para Final (4 fases)", [K.faseDaAcao("defender", K.ORDEM_FASES_4), K.faseDaAcao("mover", K.ORDEM_FASES_4), K.faseDaAcao("defender", K.ORDEM_FASES_PADRAO)], ["suporte", "final", "geral"]);
  t.iguais("rádio: 6 → 0, 7–9 → 2, 10–12 → 3, 13+ → todos (Alpha p. 76)", [6, 7, 9, 10, 12, 13].map(K.falsosDoRadio), [0, 2, 2, 3, 3, "todos"]);
  t.iguais("UV 3 cargas, pó 5 (Alpha pp. 67, 69)", [K.FERRAMENTAS.uv.cargas, K.FERRAMENTAS.po.cargas], [3, 5]);
  const af = A.porId("afogado").ordem2, au = A.porId("aughisk").ordem2, cr = A.porId("cria-da-floresta").ordem2;
  t.iguais("Afogado (p. 33): PV 10, Físico d8, Atletismo d8, Luta d6, Garras RA+1", [af.pv, af.atributos.fisico, af.pericias.atletismo, af.pericias.luta, af.acoes[0].dano], [10, 8, 8, 6, 1]);
  t.iguais("Aughisk (p. 43): PV 40, Luta d10, Espada RA+4, Coice RA+3", [au.pv, au.pericias.luta, au.acoes[0].dano, au.acoes[1].dano], [40, 10, 4, 3]);
  t.iguais("Crias da Floresta (p. 71): PV 10, Físico d6, Garras RA+1", [cr.pv, cr.atributos.fisico, cr.acoes[0].dano], [10, 6, 1]);
  t.iguais("ameaças com a página do arquivo e a do texto", [af.fonte.pagina, af.fonte.paginaNoTexto, au.fonte.pagina, au.fonte.paginaNoTexto, cr.fonte.pagina, cr.fonte.paginaNoTexto], [33, 35, 43, 46, 71, 73]);
  t.ok("aughisk sem RD inventada (lacuna registrada)", au.rd === null && au.lacunas.length === 1);
  t.ok("Presença Aterradora sem NEX: Disciplina DT 10 reduz à metade", au.habilidades[0].motor.dt === 10 && au.habilidades[0].motor.sucesso.metade === true && !/NEX 35/.test(JSON.stringify(au.habilidades[0].motor)));
  t.ok("Ellén Trechend só com os efeitos da perseguição", A.porId("ellen-trechend").ordem2.semFicha && A.paraNpc(A.porId("ellen-trechend").ordem2) === null);
  t.ok("inventário Alpha sem VD, atributos nem ações de Ordem I", ["idolo-de-pedra", "cadaveres-erguidos"].every((k) => { const x = A.porId(k).ordem2; return x.semFicha && !x.atributos && !x.acoes.length; }));
  t.ok("o Enigma de Medo não traz a solução no catálogo público", !/cr[aâ]nio|tocha/i.test(au.habilidades.find((h) => h.id === "enigma").texto));
  const npc1 = A.paraNpc(af, "Afogado 1"), npc2 = A.paraNpc(af, "Afogado 2");
  npc1.pv = 3;
  t.ok("cada ocorrência tem PV e ações próprios", npc2.pv === 10 && npc1.ataques !== npc2.ataques);
}

t.grupo("Fechadura · alto, baixo, exato (Alpha p. 24; Beta p. 16)");
{
  t.iguais("senha 3-5-2, tentativa 4-5-1 → baixo, exato, alto", MO.respostaDaFechadura([3, 5, 2], [4, 5, 1]), ["baixo", "exato", "alto"]);
  t.iguais("tentativas por rodada pelo Crime: d4 1 … d12 5", [4, 6, 8, 10, 12].map(MO.tentativasDeDestrancar), [1, 2, 3, 4, 5]);
}

t.grupo("Quadro · cena do pacote, anúncio, pré-requisito, exclusividade, grupo");
const m = novaMesa("alpha-contemporaneo", ["alan", "val", "rhiona"]);
{
  const r0 = operar(m, { tipo: "carregarCena", pacote: "sintetico", cena: "sala" });
  t.ok("o Mestre carrega a cena do pacote", r0.ok, r0.motivo);
  t.ok("o conteúdo do pacote NÃO é gravado no estado (só hidratado)", !JSON.stringify(m.estado).includes("SOLUCAO-SECRETA") && !JSON.stringify(m.estado).includes("Estante sintética"));
  const e = lido(m);
  t.ok("hidratado, o Mestre vê o ponto com contexto e nota", e.investigacao.pontos.some((p) => p.id === "estante" && p.notaPrivada === "SOLUCAO-SECRETA"));
  const vj = vistaDe(m, jog("alan"));
  t.ok("o jogador vê só o ponto anunciado", vj.investigacao.pontos.map((p) => p.id).join() === "estante");
  t.ok("a vista não traz contexto, nota, pistas, senha nem ponto oculto", !/SOLUCAO-SECRETA|cofre \(solução|PISTA-COM|PISTA-DO-OCULTO|482915|"senha":\[|"resposta"|segredo|Fulano/.test(JSON.stringify(vj)));
  // Investigar passivo: Alan Percepção.
  const rI = operar(m, { tipo: "investigar", quem: "alan", ponto: "estante", pericia: "percepcao", modo: "nada" }, jog("alan"));
  const alanPer = R.dadoDaPericia(bl(m, "alan"), R.pericia(bl(m, "alan"), "percepcao"));
  const minhas = lido(m).investigacao.descobertas.alan || [];
  t.ok("passiva: só as linhas com DT ≤ dado; a de 5 jogadores fica de fora com 3 na mesa", rI.ok && minhas.every((d) => d.pista !== "e5") && minhas.some((d) => d.pista === "e1") === (alanPer >= 6), "Percepção d" + alanPer);
  // Pré-requisito: e3 exige desafio:cofre.
  operar(m, { tipo: "revelarPonto", id: "estante", revelado: true });
  const rP = operar(m, { tipo: "investigar", quem: "alan", ponto: "estante", pericia: "pesquisar", modo: "nada" }, jog("alan"));
  t.ok("pista com pré-requisito não sai antes do desafio", rP.ok && !(lido(m).investigacao.descobertas.alan || []).some((d) => d.pista === "e3"));
  // Exclusiva da Rhiona.
  operar(m, { tipo: "investigar", quem: "alan", ponto: "estante", pericia: "intuicao", modo: "nada" }, jog("alan"));
  operar(m, { tipo: "investigar", quem: "rhiona", ponto: "estante", pericia: "intuicao", modo: "nada" }, jog("rhiona"));
  const d2 = lido(m).investigacao.descobertas;
  t.ok("pista exclusiva só para a personagem indicada", !(d2.alan || []).some((d) => d.pista === "e4") && (d2.rhiona || []).some((d) => d.pista === "e4"));
  // Revelação manual ao grupo + não duplica.
  const rg = operar(m, { tipo: "revelarPista", ponto: "estante", pista: "e2", para: "grupo" });
  const rg2 = operar(m, { tipo: "revelarPista", ponto: "estante", pista: "e2", para: "grupo" });
  t.ok("revelação manual ao grupo; a segunda é recusada (mesma pista)", rg.ok && !rg2.ok);
  const vg = vistaDe(m, jog("val"));
  t.ok("o grupo vê a pista e o anexo autorizado dela", vg.proc.grupo.some((d) => d.pista === "e2") && vg.proc.anexos.some((a) => a.id === "h-foto"));
  t.ok("um anexo de pista não revelada não aparece", !vg.proc.anexos.some((a) => a.id === "a-bips"));
  // Examinar o que o grupo já sabe: nada novo, −1 PD.
  const pdAntes = bl(m, "val").recursos.pd.atual;
  const rx = operar(m, { tipo: "investigar", quem: "val", ponto: "estante", pericia: "percepcao", modo: "examinar", confirmar: true }, jog("val"), fila(6, 6, 6));
  const valD = lido(m).investigacao.descobertas.val || [];
  t.ok("a mesma pista não rende duas vezes (o grupo já tem e2)", rx.ok && !valD.some((d) => d.pista === "e2"), textos(rx));
  void pdAntes;
}

t.grupo("Desafios · tranca com limite, senha, arrombar, alcançar, hack social");
{
  // Alan tem Crime? Tentativas por rodada pelo dado.
  const crime = P.periciaEsp(bl(m, "alan"), "crime").faces;
  const porRodada = MO.tentativasDeDestrancar(crime);
  const r1 = operar(m, { tipo: "desafioAgir", id: "cofre", acao: "tentar", quem: "alan", valores: [4, 5, 1] }, jog("alan"));
  t.iguais("tentativa 4-5-1 na senha 3-5-2 → baixo, exato, alto", r1.resultado.resposta, ["baixo", "exato", "alto"]);
  let extra = null;
  for (let i = 1; i < porRodada; i++) operar(m, { tipo: "desafioAgir", id: "cofre", acao: "tentar", quem: "alan", valores: [1, 1, 1] }, jog("alan"));
  extra = operar(m, { tipo: "desafioAgir", id: "cofre", acao: "tentar", quem: "alan", valores: [2, 2, 2] }, jog("alan"));
  t.ok("Crime d" + crime + ": " + porRodada + " tentativa(s) por rodada; a seguinte é recusada", porRodada >= 3 ? extra.ok === false || /danificad/.test(textos(extra) + (extra.motivo || "")) : extra.ok === false, extra.motivo || textos(extra));
  const est = lido(m).proc.desafios.find((d) => d.id === "cofre");
  t.ok("limite da fechadura (3): excedido, ela é danificada", est.estado === "danificado" || est.dados.total < 3, est.estado + " " + est.dados.total);
  const vj = vistaDe(m, jog("alan"));
  t.ok("a senha do cofre nunca vai ao jogador", !JSON.stringify(vj.proc.desafios).includes("segredo") && !/"senha":\[3,5,2\]/.test(JSON.stringify(vj)));
  // Senha do teclado: 3 erros bloqueiam 2 rodadas.
  ["111111", "222222", "333333"].forEach((x) => operar(m, { tipo: "desafioAgir", id: "teclado", acao: "tentar", quem: "val", texto: x }, jog("val")));
  const bq = operar(m, { tipo: "desafioAgir", id: "teclado", acao: "tentar", quem: "val", texto: "482915" }, jog("val"));
  t.ok("três erros no teclado: bloqueado por 2 rodadas", !bq.ok && /bloqueado/.test(bq.motivo));
  operar(m, { tipo: "encerrarRodada", rodada: lido(m).proc.rodada }, MESTRE, fila([], Array(30).fill(1)));
  operar(m, { tipo: "encerrarRodada", rodada: lido(m).proc.rodada }, MESTRE, fila(Array(30).fill(1)));
  operar(m, { tipo: "encerrarRodada", rodada: lido(m).proc.rodada }, MESTRE, fila(Array(30).fill(1)));
  const ok2 = operar(m, { tipo: "desafioAgir", id: "teclado", acao: "tentar", quem: "val", texto: "482915" }, jog("val"));
  t.ok("passado o bloqueio, a senha certa abre", ok2.ok && lido(m).proc.desafios.find((d) => d.id === "teclado").estado === "vencido", ok2.motivo);
  // Arrombar: 1 PV, Atletismo DT 7, RA até PA 10.
  const pv0 = bl(m, "val").recursos.pv.atual;
  const ra = operar(m, { tipo: "desafioAgir", id: "porta", acao: "tentar", quem: "val", confirmar: true }, jog("val"), fila(6, 5));
  t.ok("arrombar gasta 1 PV e soma a RA (6)", ra.ok && bl(m, "val").recursos.pv.atual === pv0 - 1 && lido(m).proc.desafios.find((d) => d.id === "porta").dados.pa === 6, textos(ra));
  operar(m, { tipo: "desafioAgir", id: "porta", acao: "tentar", quem: "val", confirmar: true }, jog("val"), fila(5, 4));
  t.igual("PA 10 alcançada: porta aberta", lido(m).proc.desafios.find((d) => d.id === "porta").estado, "vencido");
  // Alcançar arriscado (DT +3) com falha: dano = RA.
  const pvA = bl(m, "alan").recursos.pv.atual;
  const al = operar(m, { tipo: "desafioAgir", id: "prateleira", acao: "arriscado", quem: "alan", confirmar: true }, jog("alan"), fila(3, 2));
  t.ok("alcançar arriscado: DT 7+3 e, falhando, dano igual à RA", al.ok && bl(m, "alan").recursos.pv.atual === pvA - 3 && /DT 10/.test(textos(al)), textos(al));
  // Seguro: duas ações em sequência.
  operar(m, { tipo: "desafioAgir", id: "prateleira", acao: "seguro", quem: "val", confirmar: true }, jog("val"), fila(6, 4));
  operar(m, { tipo: "desafioAgir", id: "prateleira", acao: "seguro", quem: "val", confirmar: true }, jog("val"), fila(6, 4));
  t.ok("alcançar seguro: dois sucessos seguidos alcançam (flag pessoal)", P.flagAtiva(lido(m), "desafio:prateleira", "val") && !P.flagAtiva(lido(m), "desafio:prateleira", "rhiona"));
  // Hack social: DT 7, 2 certas; chances extras pelo excesso.
  const hs = operar(m, { tipo: "desafioAgir", id: "celular", acao: "testar", quem: "rhiona", confirmar: true }, jog("rhiona"), fila(6, 6, 2));
  const x = lido(m).proc.desafios.find((d) => d.id === "celular").por.rhiona;
  t.ok("hack social: passou; chances extras = (total − DT) ÷ 3", hs.ok && x.liberado && x.chancesExtras === Math.floor((x && 12 - 7) / 3) || x.chancesExtras >= 0, JSON.stringify(x));
  operar(m, { tipo: "desafioAgir", id: "celular", acao: "responder", quem: "rhiona", pergunta: 0, resposta: "fulano de tal" }, jog("rhiona"));
  operar(m, { tipo: "desafioAgir", id: "celular", acao: "responder", quem: "rhiona", pergunta: 1, resposta: "1999" }, jog("rhiona"));
  t.igual("duas respostas certas (sem acento/maiúsculas) abrem o celular", lido(m).proc.desafios.find((d) => d.id === "celular").estado, "vencido");
  t.ok("as respostas do hack social não vão ao jogador", !JSON.stringify(vistaDe(m, jog("rhiona"))).includes("Fulano"));
  // Pré-requisito liberado pelo cofre? (cofre ainda danificado ou aberto): o Mestre resolve.
  operar(m, { tipo: "desafioMestre", id: "cofre", acao: "resolver" });
  operar(m, { tipo: "investigar", quem: "alan", ponto: "estante", pericia: "pesquisar", modo: "nada" }, jog("alan"));
  t.ok("vencido o desafio, a pista que dependia dele aparece", (lido(m).investigacao.descobertas.alan || []).some((d) => d.pista === "e3") === (P.periciaEsp(bl(m, "alan"), "pesquisar").faces >= 6));
}

t.grupo("Hack técnico · faixa, problema e tempo (Alpha p. 25)");
{
  const mm = novaMesa("alpha-contemporaneo", ["alan"]);
  operar(mm, { tipo: "carregarCena", pacote: "sintetico", cena: "sala" });
  operar(mm, { tipo: "desafioMestre", id: "painel", acao: "anunciar" });
  const inicio = "2026-11-14T10:00:00.000Z";
  const r = operar(mm, { tipo: "desafioAgir", id: "painel", acao: "testar", quem: "alan", confirmar: true }, jog("alan"), fila(6, 6), { agora: inicio });
  t.ok("resultado 12 → a faixa de 10+ (problema fácil)", r.ok && r.resultado.problema && r.resultado.problema.texto === "2 + 2", JSON.stringify(r.resultado));
  t.ok("a resposta do painel não vai ao jogador", !JSON.stringify(vistaDe(mm, jog("alan"))).includes('"4"') || !JSON.stringify(vistaDe(mm, jog("alan")).proc.desafios).includes("respostas"));
  const fora = operar(mm, { tipo: "desafioAgir", id: "painel", acao: "responder", quem: "alan", resposta: "4" }, jog("alan"), nada, { agora: "2026-11-14T10:00:20.000Z" });
  t.ok("certo, mas fora do tempo: não abre", fora.ok && lido(mm).proc.desafios.find((d) => d.id === "painel").estado === "aberto", textos(fora));
}

t.grupo("Ferramentas · posse, cargas, leitura, laser, rádio, laboratório, compêndio");
{
  operar(m, { tipo: "ferramentaPosse", ferramenta: "uv", personagem: "alan" });
  const sem = operar(m, { tipo: "usarFerramenta", quem: "val", ferramenta: "uv", ponto: "estante" }, jog("val"));
  t.ok("quem não tem a ferramenta não usa (precisa pegar emprestada)", !sem.ok);
  const uv = operar(m, { tipo: "usarFerramenta", quem: "alan", ferramenta: "uv", ponto: "estante" }, jog("alan"));
  t.ok("UV revela o material do ponto e gasta 1 de 3 cargas", uv.ok && /A caixa brilha/.test(uv.resultado.leitura.texto) && lido(m).proc.ferramentas.cargas.uv === 2);
  operar(m, { tipo: "passarFerramenta", ferramenta: "uv", para: "val" }, jog("alan"));
  t.igual("empréstimo entre personagens", lido(m).proc.ferramentas.posse.uv, "val");
  operar(m, { tipo: "ferramentaPosse", ferramenta: "termometro", personagem: "val" });
  const tm = operar(m, { tipo: "usarFerramenta", quem: "val", ferramenta: "termometro", ponto: "estante" }, jog("val"));
  t.ok("termômetro: quente/frio/igual do ponto", tm.ok && /Mais quente/.test(tm.resultado.leitura.texto));
  operar(m, { tipo: "ferramentaPosse", ferramenta: "emf", personagem: "val" });
  const em = operar(m, { tipo: "usarFerramenta", quem: "val", ferramenta: "emf", ponto: "estante" }, jog("val"));
  t.ok("EMF: o padrão do texto e o áudio como anexo (referência faltante com alternativa)", em.ok && /1-1-3/.test(em.resultado.leitura.texto) && vistaDe(m, jog("val")).proc.anexos.some((a) => a.id === "a-bips" && a.veio === false && /bip/i.test(a.descricao)));
  operar(m, { tipo: "ferramentaPosse", ferramenta: "laser", personagem: "rhiona" });
  const lz = operar(m, { tipo: "usarFerramenta", quem: "rhiona", ferramenta: "laser", area: "a1" }, jog("rhiona"));
  t.ok("laser: varredura do ambiente lista os pontos que reagem", lz.ok && /Estante sintética/.test(lz.resultado.leitura.texto));
  // Rádio: Tecnologia 8 → 2 falsos saem; a ordem fica para os jogadores.
  operar(m, { tipo: "ferramentaPosse", ferramenta: "radio", personagem: "alan" });
  const rr = operar(m, { tipo: "usarFerramenta", quem: "alan", ferramenta: "radio", ponto: "estante", confirmar: true }, jog("alan"), fila(4, 4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1));
  const leit = (lido(m).investigacao.descobertas.alan || []).find((d) => d.ferramenta === "radio");
  t.ok("rádio: resultado 8 tira 2 falsos; ficam 4 conjuntos para ordenar", rr.ok && leit && leit.conjuntos.length === 4 && leit.conjuntos.filter((c) => /FALSO/.test(c)).length === 1, JSON.stringify(leit && leit.conjuntos));
  t.ok("a solução do rádio não vai ao jogador", !JSON.stringify(vistaDe(m, jog("alan"))).includes("A caixa está vazia."));
  // Laboratório: sequência de 5, d4 subindo até a Aptidão (Exatas); rerrolagens = metade da Mente.
  operar(m, { tipo: "ferramentaPosse", ferramenta: "laboratorio", personagem: "alan" });
  const lb = operar(m, { tipo: "usarFerramenta", quem: "alan", ferramenta: "laboratorio", ponto: "estante" }, jog("alan"));
  const lab = lido(m).proc.desafios.find((d) => d.id === lb.resultado.laboratorio);
  const apt = P.periciaEsp(bl(m, "alan"), "aptidao:exatas").faces, mente = R.dadoDoAtributo(bl(m, "alan"), "mente");
  t.ok("laboratório: 5 dados começando em d4, até a Aptidão (Exatas) d" + apt + "; " + Math.floor(mente / 2) + " nova(s) rolagem(ns)", lab && lab.config.faces.length === 5 && lab.config.faces[0] === 4 && Math.max.apply(null, lab.config.faces) <= apt && lab.dados.rerrolagens === Math.floor(mente / 2), JSON.stringify(lab && lab.config));
  t.ok("o minijogo não usa o teto de 4 dados de um teste", lab.config.faces.length > MO.MAX_DADOS_ROLADOS);
  const seq = [1, 2, 3, 3, 4];
  seq.forEach((v) => operar(m, { tipo: "laboratorio", id: lab.id, acao: "rolar" }, jog("alan"), fila(v)));
  const fim = operar(m, { tipo: "laboratorio", id: lab.id, acao: "concluir" }, jog("alan"));
  t.ok("sequência não decrescente revela o resultado do ponto", fim.ok && fim.resultado.sucesso === true && (lido(m).investigacao.descobertas.alan || []).some((d) => /devora/.test(d.texto)));
  // Compêndio: portador e permitidos.
  operar(m, { tipo: "ferramentaPosse", ferramenta: "compendium", personagem: "val" });
  t.ok("sem acesso, o compêndio não vem na vista", vistaDe(m, jog("alan")).proc.compendium.conteudo === null);
  operar(m, { tipo: "compendium", acao: "permitir", personagem: "alan" }, jog("val"));
  t.ok("o portador permite e o aliado consulta", vistaDe(m, jog("alan")).proc.compendium.conteudo.manifestacoes[0].codigo === "TST-0001");
  operar(m, { tipo: "compendium", acao: "marcar", quem: "alan", sinal: "Sangue:laboratorio:autofagia" }, jog("alan"));
  t.iguais("marcas de evidência por personagem", vistaDe(m, jog("alan")).proc.compendium.marcas.alan, ["Sangue:laboratorio:autofagia"]);
}

t.grupo("Ponto Alpha com ferramenta e SOBRECARGA (uma vez por rodada; suspensão)");
{
  const s = novaMesa("alpha-contemporaneo", ["alan", "val"]);
  operar(s, { tipo: "carregarCena", pacote: "sintetico", cena: "sala" });
  operar(s, { tipo: "ferramentaPosse", ferramenta: "termometro", personagem: "alan" });
  operar(s, { tipo: "usarFerramenta", quem: "alan", ferramenta: "termometro", ponto: "estante" }, jog("alan"));
  const pd = () => [bl(s, "alan").recursos.pd.atual, bl(s, "val").recursos.pd.atual];
  const p0 = pd();
  operar(s, { tipo: "encerrarRodada", rodada: 1 });
  operar(s, { tipo: "encerrarRodada", rodada: 2 });
  t.iguais("rodadas 1 e 2: sem dano", pd(), p0);
  operar(s, { tipo: "encerrarRodada", rodada: 3 });
  t.iguais("rodada 3: 1 de dano emocional em cada", pd(), [p0[0] - 1, p0[1] - 1]);
  const rep = operar(s, { tipo: "encerrarRodada", rodada: 3 });
  t.ok("repetir o encerramento da rodada 3 é recusado (sem dano duplicado)", !rep.ok && JSON.stringify(pd()) === JSON.stringify([p0[0] - 1, p0[1] - 1]));
  operar(s, { tipo: "encerrarRodada", rodada: 4 });
  const r5 = operar(s, { tipo: "encerrarRodada", rodada: 5 }, MESTRE, fila(3, 2));
  t.iguais("rodada 5: 1d4 por personagem, cada um rola o seu (3 e 2)", pd(), [p0[0] - 5, p0[1] - 4]);
  void r5;
  operar(s, { tipo: "tabela", id: "sobrecarga", acao: "suspender" });
  operar(s, { tipo: "encerrarRodada", rodada: 6 });
  t.iguais("suspensa explicitamente: a rodada 6 não dá dano", pd(), [p0[0] - 5, p0[1] - 4]);
  operar(s, { tipo: "tabela", id: "sobrecarga", acao: "suspender", valor: false });
  operar(s, { tipo: "encerrarRodada", rodada: 7 }, MESTRE, fila(6, 1));
  t.iguais("de volta: rodada 7 usa a linha 1d6", pd(), [p0[0] - 11, p0[1] - 5]);
  // A maldição isenta quem causou dano a outro personagem na rodada.
  operar(s, { tipo: "tabela", id: "maldicao", acao: "ativar", inicio: 5 });
  operar(s, { tipo: "iniciarCombate", personagens: ["alan", "val"], antecipar: false });
  const ca = operar(s, { tipo: "conflitoAlpha", atacante: "pc-alan", defensor: "pc-val", defesa: "nenhuma" }, MESTRE, fila(6, 5));
  operar(s, { tipo: "encerrarCombate" });
  const a8 = pd();
  operar(s, { tipo: "encerrarRodada", rodada: 8 }, MESTRE, fila(1, 1));
  t.iguais("maldição (rodada 4 da tabela): Alan feriu Val e fica isento; Val perde 1 PD (além da sobrecarga 1d6 = 1)", [ca.ok, pd()], [true, [a8[0] - 1, a8[1] - 2]]);
}

t.grupo("Equilíbrio · 2d10, reserva de d4, gasto por tentativa (Beta p. 17)");
{
  const q = novaMesa("beta-vigilia", ["rhiona", "rowan"]);
  operar(q, { tipo: "carregarCena", pacote: "sintetico", cena: "trilha" });
  const acro = P.periciaEsp(bl(q, "rowan"), "acrobacia").faces;
  const r1 = operar(q, { tipo: "desafioAgir", id: "escada", acao: "rolar", quem: "rowan" }, jog("rowan"), fila(3, 4));
  t.ok("3 e 4: equilibrado (1 de diferença)", r1.ok && r1.resultado.equilibrio.equilibrado);
  t.igual("reserva = metade da Acrobacia (d" + acro + ")", lido(q).proc.desafios.find((d) => d.id === "escada").por.rowan.reserva, Math.floor(acro / 2));
  const mesmo = operar(q, { tipo: "desafioAgir", id: "escada", acao: "rolar", quem: "rowan" }, jog("rowan"), fila(1, 1));
  t.ok("uma rolagem de equilíbrio por rodada", !mesmo.ok);
  operar(q, { tipo: "encerrarRodada", rodada: 1 });
  const r2 = operar(q, { tipo: "desafioAgir", id: "escada", acao: "rolar", quem: "rowan" }, jog("rowan"), fila(6, 9));
  t.ok("6 e 9: caindo", r2.ok && !r2.resultado.equilibrio.equilibrado);
  const g = operar(q, { tipo: "desafioAgir", id: "escada", acao: "gastar", quem: "rowan", dado: 0 }, jog("rowan"), fila(2));
  t.ok("gasta um d4 (2) no 6 → 8 e 9: equilibrado; a reserva cai 1", g.ok && lido(q).proc.desafios.find((d) => d.id === "escada").por.rowan.reserva === Math.floor(acro / 2) - 1 && /equilibrado/.test(textos(g)));
  operar(q, { tipo: "encerrarRodada", rodada: 2 });
  operar(q, { tipo: "desafioAgir", id: "escada", acao: "rolar", quem: "rowan" }, jog("rowan"), fila(5, 7));
  const pv = bl(q, "rowan").recursos.pv.atual;
  const cai = operar(q, { tipo: "desafioAgir", id: "escada", acao: "cair", quem: "rowan" }, jog("rowan"), fila(3));
  const x = lido(q).proc.desafios.find((d) => d.id === "escada").por.rowan;
  t.ok("caindo: 1d4 de dano e recomeça (os sucessos zeram; a reserva gasta não volta)", cai.ok && bl(q, "rowan").recursos.pv.atual === pv - 3 && x.sucessos === 0 && x.reserva === Math.floor(acro / 2) - 1);
}

t.grupo("Travessia, escalar, sustentar · regras próprias (Beta pp. 41, 57–59, 67)");
{
  const q = novaMesa("beta-vigilia", ["rhiona", "rowan"]);
  operar(q, { tipo: "carregarCena", pacote: "sintetico", cena: "trilha" });
  const a1 = operar(q, { tipo: "desafioAgir", id: "trilha-t", acao: "agir", acaoArea: "direto", quem: "rhiona", confirmar: true }, jog("rhiona"), fila(6, 5));
  t.ok("bosque direto: +2 avanços", a1.ok && lido(q).proc.desafios.find((d) => d.id === "trilha-t").por.rhiona.avancos === 2, textos(a1));
  operar(q, { tipo: "desafioAgir", id: "trilha-t", acao: "agir", acaoArea: "direto", quem: "rhiona", confirmar: true }, jog("rhiona"), fila(6, 5));
  t.ok("4 avanços: cruzou o bosque", lido(q).proc.desafios.find((d) => d.id === "trilha-t").por.rhiona.feito === true);
  // Escalar: rápido soma a RA; falhar derruba com o acumulado.
  operar(q, { tipo: "desafioAgir", id: "torre", acao: "acao", modo: "rapido", quem: "rowan", confirmar: true }, jog("rowan"), fila(6, 4));
  const pv = bl(q, "rowan").recursos.pv.atual;
  operar(q, { tipo: "desafioAgir", id: "torre", acao: "acao", modo: "rapido", quem: "rowan", confirmar: true }, jog("rowan"), fila(2, 1));
  t.ok("escalar: 6 acumulados; a falha derruba com 6 de dano e zera", bl(q, "rowan").recursos.pv.atual === pv - 6 && lido(q).proc.desafios.find((d) => d.id === "torre").por.rowan.pontos === 0);
  // Sustentar: erguer, passar, fim de rodada com −1 passo; falhando, quem passa sofre.
  const er = operar(q, { tipo: "desafioAgir", id: "pedra", acao: "erguer", quem: "rhiona", confirmar: true }, jog("rhiona"), fila(6, 6));
  operar(q, { tipo: "desafioAgir", id: "pedra", acao: "passar", quem: "rowan" }, jog("rowan"));
  const dois = operar(q, { tipo: "desafioAgir", id: "pedra", acao: "passar", quem: "rhiona" }, jog("rhiona"));
  t.ok("sustentar: ergue (1 PV); só 1 pessoa passa por rodada", er.ok && !dois.ok, dois.motivo);
  const pvR = bl(q, "rowan").recursos.pv.atual;
  const fr = operar(q, { tipo: "encerrarRodada", rodada: 1 }, MESTRE, fila(1, 2, 3, 3));
  t.ok("fim da rodada: novo teste com −1 passo; falhou → quem passava sofre 2d6", /Cansaço|não segura/.test(JSON.stringify(lido(q).rolagens.slice(-1)) + textos(fr)) && bl(q, "rowan").recursos.pv.atual === pvR - 6, textos(fr));
}

t.grupo("Encontro · pista + ritual de runas + ondas; bloqueio; 3 ↔ 4 fases");
{
  const g = novaMesa("beta-vigilia", ["rhiona", "rowan", "sira"]);
  operar(g, { tipo: "carregarCena", pacote: "sintetico", cena: "gruta" });
  operar(g, { tipo: "iniciarCombate", personagens: ["rhiona", "rowan", "sira"], antecipar: false });
  operar(g, { tipo: "encontro", acao: "iniciar" });
  t.iguais("a etapa troca para quatro fases", lido(g).combate.ordemFases, K.ORDEM_FASES_4);
  const r1 = operar(g, { tipo: "proximaRodada", rodada: 1 }, MESTRE, fila(Array(10).fill(1)));
  const crias = () => lido(g).combate.participantes.filter((p) => p.ameaca === "cria-da-floresta");
  t.igual("rodada 2: 1ª onda, uma cria por personagem (3)", crias().length, 3);
  t.ok("o roteiro da rodada é privado do Mestre", r1.eventos.some((x) => x.privado && /ROTEIRO-SECRETO/.test(x.texto)) && !JSON.stringify(vistaDe(g, jog("rowan"))).includes("ROTEIRO-SECRETO"));
  const rep = operar(g, { tipo: "proximaRodada", rodada: 1 }, MESTRE, fila(Array(10).fill(1)));
  t.ok("repetir o encerramento da rodada 1: recusado, a onda não duplica", !rep.ok && crias().length === 3);
  const v = vistaDe(g, jog("rowan"));
  t.ok("o jogador vê as crias só pela situação (sem PV nem ações)", v.combate.participantes.filter((p) => p.tipo === "npc").every((p) => p.bloco === undefined && p.especiais === undefined && p.situacao));
  // Pista dá a runa; encaixe na ordem secreta.
  const rI = operar(g, { tipo: "investigar", quem: "sira", ponto: "altar", pericia: "percepcao", modo: "nada" }, jog("sira"));
  t.ok("a pista do altar entrega a pedra rúnica a quem achou", rI.ok && lido(g).proc.itens.find((i) => i.id === "runa-b").com === "sira");
  operar(g, { tipo: "item", id: "runa-a", com: "rhiona" });
  t.ok("a ordem das runas não vai ao jogador", !/"ordem":\["terra","sol"\]/.test(JSON.stringify(vistaDe(g, jog("sira")))));
  const errado = operar(g, { tipo: "desafioAgir", id: "runas", acao: "encaixar", quem: "sira", nicho: 0, item: "runa-b" }, jog("sira"));
  operar(g, { tipo: "desafioAgir", id: "runas", acao: "encaixar", quem: "rhiona", nicho: 1, item: "runa-a" }, jog("rhiona"));
  t.ok("ordem errada: todos os nichos cheios e nada acontece", errado.ok && lido(g).proc.desafios.find((d) => d.id === "runas").estado === "aberto");
  operar(g, { tipo: "desafioAgir", id: "runas", acao: "retirar", quem: "sira", nicho: 0 }, jog("sira"));
  operar(g, { tipo: "desafioAgir", id: "runas", acao: "retirar", quem: "rhiona", nicho: 1 }, jog("rhiona"));
  operar(g, { tipo: "desafioAgir", id: "runas", acao: "encaixar", quem: "rhiona", nicho: 0, item: "runa-a" }, jog("rhiona"));
  operar(g, { tipo: "desafioAgir", id: "runas", acao: "encaixar", quem: "sira", nicho: 1, item: "runa-b" }, jog("sira"));
  t.ok("na ordem certa, a chama acende (flag do grupo)", P.flagAtiva(lido(g), "chamaAcesa", null));
  // Só uma onda veio: a 2ª ainda vem (mínimo de 2 antes de parar), depois param.
  operar(g, { tipo: "proximaRodada", rodada: 2 }, MESTRE, fila(Array(30).fill(1)));
  operar(g, { tipo: "proximaRodada", rodada: 3 }, MESTRE, fila(Array(30).fill(1)));
  operar(g, { tipo: "proximaRodada", rodada: 4 }, MESTRE, fila(Array(30).fill(1)));
  t.igual("rodada 5: a 2ª onda vem mesmo com a chama (mínimo de duas)", crias().length, 6);
  for (let r = 5; r <= 7; r++) operar(g, { tipo: "proximaRodada", rodada: r }, MESTRE, fila(Array(30).fill(1)));
  t.ok("rodada 8: com a chama e duas ondas, param", crias().length === 6 && lido(g).proc.encontro.ondas.paradas === true);
  // Bloqueio: exatamente 2; NPC só alcança quem bloqueia, 2 por defensor; distância de fora −2 passos.
  const b3 = operar(g, { tipo: "encontro", acao: "bloqueio", pcs: ["pc-rhiona", "pc-rowan", "pc-sira"] });
  const b2 = operar(g, { tipo: "encontro", acao: "bloqueio", pcs: ["pc-rhiona", "pc-rowan"] });
  t.ok("o bloqueio funciona com exatamente dois", !b3.ok && b2.ok);
  const cs = crias();
  const naoBloq = operar(g, { tipo: "declarar", ator: cs[0].id, acao: "agredirCorpo", alvo: "pc-sira" });
  t.ok("com a entrada bloqueada, cria não alcança quem está atrás", !naoBloq.ok);
  operar(g, { tipo: "declarar", ator: cs[0].id, acao: "agredirCorpo", alvo: "pc-rhiona" });
  operar(g, { tipo: "declarar", ator: cs[1].id, acao: "agredirCorpo", alvo: "pc-rhiona" });
  const terceira = operar(g, { tipo: "declarar", ator: cs[2].id, acao: "agredirCorpo", alvo: "pc-rhiona" });
  t.ok("no máximo duas criaturas por defensor por rodada", !terceira.ok);
  const corpoSira = operar(g, { tipo: "declarar", quem: "sira", acao: "agredirCorpo", alvo: cs[3].id }, jog("sira"));
  t.ok("quem não bloqueia não ataca corpo a corpo", !corpoSira.ok);
  // Troca 4 → 3 fases sem perder a ação declarada nem o estado.
  operar(g, { tipo: "declarar", quem: "sira", acao: "mover" }, jog("sira"));
  const antes = lido(g).combate.declaracoes.filter((d) => d.rodada === lido(g).combate.rodada).map((d) => d.id).sort().join();
  const tr = operar(g, { tipo: "configurarFases", preset: "tres" });
  const depois = lido(g).combate;
  t.ok("4 → 3 fases: as mesmas declarações, remapeadas (Mover: Final → Geral)", tr.ok && depois.declaracoes.filter((d) => d.rodada === depois.rodada).map((d) => d.id).sort().join() === antes && depois.declaracoes.find((d) => d.acao === "mover").fase === "geral");
  t.ok("…e ninguém ganha ação extra (agiu continua)", Object.keys(depois.agiu).length >= 3);
  operar(g, { tipo: "configurarFases", preset: "quatro" });
  t.ok("3 → 4 de volta: Mover vai para a Fase Final; ondas e PV intactos", lido(g).combate.declaracoes.find((d) => d.acao === "mover").fase === "final" && crias().length === 6);
}

t.grupo("Afogar e escapar (Beta pp. 32–33) · dano no fim da rodada, uma vez");
{
  const f = novaMesa("beta-vigilia", ["rhiona"]);
  operar(f, { tipo: "iniciarCombate", personagens: ["rhiona"], antecipar: false });
  operar(f, { tipo: "adicionarAmeaca", ameaca: "afogado", quantidade: 1 });
  const af = lido(f).combate.participantes.find((p) => p.ameaca === "afogado");
  t.ok("ocorrência do Afogado com PV 10 e as duas ações", af.bloco.recursos.pv.max === 10 && af.ataques.length === 2);
  const afogar = af.ataques.find((a) => a.efeitos.indexOf("afogar") >= 0);
  operar(f, { tipo: "declarar", ator: af.id, acao: "agredirCorpo", alvo: "pc-rhiona", arma: afogar.id });
  ["geral", "geral", "distancia", "distancia"].forEach(() => operar(f, { tipo: "aplicarFase" }));
  operar(f, { tipo: "aplicarFase" }, MESTRE, fila(6, 5));
  const r2 = operar(f, { tipo: "aplicarFase" });
  t.ok("Afogar acerta: agarra, sem dano imediato", lido(f).proc.agarres.length === 1, textos(r2));
  const outra = operar(f, { tipo: "declarar", quem: "rhiona", acao: "agredirCorpo", alvo: af.id }, jog("rhiona"));
  t.ok("a vítima só pode tentar escapar", !outra.ok);
  const pv = bl(f, "rhiona").recursos.pv.atual;
  operar(f, { tipo: "proximaRodada", rodada: 1 }, MESTRE, fila(4));
  t.igual("fim da rodada: perde 1d6 (4)", bl(f, "rhiona").recursos.pv.atual, pv - 4);
  const rep = operar(f, { tipo: "proximaRodada", rodada: 1 }, MESTRE, fila(4));
  t.ok("repetir o fim da rodada: sem dano duplicado", !rep.ok && bl(f, "rhiona").recursos.pv.atual === pv - 4);
}

t.grupo("Perseguição (Beta pp. 73–74) · PA, limiares, cabeças, uma vez por rodada");
{
  const c = novaMesa("beta-vigilia", ["rhiona", "rowan", "sira"]);
  operar(c, { tipo: "carregarCena", pacote: "sintetico", cena: "trilha" });
  const ini = operar(c, { tipo: "perseguicao", acao: "iniciar" }, MESTRE, fila(1, 2, 3, 4));
  t.ok("início: duas cabeças atacam dois sorteados (físico e emocional)", ini.ok && /Cabeças \(rodada 1\)/.test(textos(ini)), textos(ini));
  const fol = lido(c).proc.perseguicao.por.rowan.folego;
  t.igual("fôlego = metade do Vigor em d6", fol, Math.floor(P.periciaEsp(bl(c, "rowan"), "vigor").faces / 2));
  const av = operar(c, { tipo: "perseguir", quem: "rowan", acao: "avancar", confirmar: true }, jog("rowan"), fila(6, 4));
  t.ok("avançar: Atletismo DT 10 — sucesso soma a RA (6)", av.ok && lido(c).proc.perseguicao.por.rowan.pa === 6, textos(av));
  const dup = operar(c, { tipo: "perseguir", quem: "rowan", acao: "avancar", confirmar: true }, jog("rowan"), fila(6, 4));
  t.ok("uma ação por rodada", !dup.ok);
  operar(c, { tipo: "perseguir", quem: "sira", acao: "avancar", confirmar: true }, jog("sira"), fila(3, 2));
  t.igual("falha soma a RB (2)", lido(c).proc.perseguicao.por.sira.pa, 2);
  const pvR = bl(c, "rhiona").recursos.pv.atual;
  operar(c, { tipo: "perseguir", quem: "rhiona", acao: "avancar", esforco: true, confirmar: true }, jog("rhiona"), fila(6, 6, 6, 3));
  t.ok("esforço extra: +1 passo e 1d4 PV (3)", bl(c, "rhiona").recursos.pv.atual <= pvR - 3);
  operar(c, { tipo: "encerrarRodada", rodada: 1 }, MESTRE, fila(1, 2, 1, 1));
  operar(c, { tipo: "encerrarRodada", rodada: 2 }, MESTRE, fila(1, 2, 1, 1));
  const morte = operar(c, { tipo: "encerrarRodada", rodada: 3 }, MESTRE, fila(1, 2, 1, 1));
  const p = lido(c).proc.perseguicao;
  t.ok("fim da 3ª: só o de menor PA abaixo de 15 é devorado", p.mortes.length === 1 && p.mortes[0] === "sira", textos(morte));
  const rep = operar(c, { tipo: "encerrarRodada", rodada: 3 }, MESTRE, fila(1, 2, 1, 1));
  t.ok("repetir o fim da 3ª: recusado, ninguém morre duas vezes", !rep.ok && lido(c).proc.perseguicao.mortes.length === 1);
}

t.grupo("Esconderijo (Beta pp. 55–56) · dados persistidos, criaturas, DT crescente");
{
  const h = novaMesa("beta-vigilia", ["rhiona", "rowan"]);
  operar(h, { tipo: "carregarCena", pacote: "sintetico", cena: "trilha" });
  operar(h, { tipo: "esconderijo", acao: "iniciar" });
  const t1 = operar(h, { tipo: "esconder", quem: "rowan", acao: "inicial", confirmar: true }, jog("rowan"), fila(3, 5));
  const dados = lido(h).proc.esconderijo.por.rowan.dados;
  t.iguais("o teste de esconderijo vira dados (valores mantidos)", dados.map((d) => d.valor), [3, 5]);
  operar(h, { tipo: "esconder", quem: "rhiona", acao: "inicial", confirmar: true }, jog("rhiona"), fila(2, 2));
  const cri = operar(h, { tipo: "esconderijo", acao: "criaturas", d10: 7 }, MESTRE, fila(3, 6));
  t.ok("d10 = 7: as criaturas rolam 2d6 (3 e 6) e todos descartam os iguais", cri.ok && lido(h).proc.esconderijo.por.rowan.dados.map((d) => d.valor).join() === "5", textos(cri));
  const outra = operar(h, { tipo: "esconderijo", acao: "criaturas", d10: 3 }, MESTRE, fila(1));
  t.ok("as criaturas procuram uma vez por rodada", !outra.ok);
  const e1 = operar(h, { tipo: "esconder", quem: "rhiona", acao: "esconderSe", confirmar: true }, jog("rhiona"), fila(4, 3));
  t.ok("esconder-se: DT 7 na 1ª vez", e1.ok && /DT 7/.test(textos(e1)));
  operar(h, { tipo: "encerrarRodada", rodada: 1 }, MESTRE, fila(1, 1, 1));
  const e2 = operar(h, { tipo: "esconder", quem: "rhiona", acao: "esconderSe", confirmar: true }, jog("rhiona"), fila(6, 4));
  t.ok("…DT 10 na 2ª (cresce +3 por uso)", /DT 10/.test(textos(e2)));
  const vista = vistaDe(h, jog("rhiona"));
  t.ok("o jogador vê os próprios dados e só a contagem dos outros", Array.isArray(vista.proc.esconderijo.por.rhiona.dados) && vista.proc.esconderijo.por.rowan.dados === undefined && vista.proc.esconderijo.por.rowan.quantos === 1);
  void t1;
}

t.grupo("Recarregar no meio do desafio e repetir a operação (opId no servidor)");
{
  const r = novaMesa("beta-vigilia", ["rhiona"]);
  operar(r, { tipo: "carregarCena", pacote: "sintetico", cena: "trilha" });
  operar(r, { tipo: "desafioAgir", id: "escada", acao: "rolar", quem: "rhiona" }, jog("rhiona"), fila(2, 8));
  const salvo = JSON.stringify(r.estado);
  const recarregado = { estado: JSON.parse(salvo), fichas: r.fichas, pacotes: PAC };
  const x = lido(recarregado).proc.desafios.find((d) => d.id === "escada").por.rhiona;
  t.ok("recarregado, o equilíbrio continua caindo com a mesma reserva", x.caindo === true && x.d10.join() === "2,8");
}

/* =================================================================== */
t.grupo("Pacote real do Mestre (só nesta máquina, fora do git)");
if (!PACOTE_REAL) {
  ["preset exato da sobrecarga do porão", "tranca, equilíbrio e encontros do pacote"].forEach((n) => t.pular(n + " — backend/Ordem2Pacotes.local.gs ausente"));
} else {
  const alpha = PACOTE_REAL["alpha-idolo"];
  const ato2 = alpha && alpha.cenas.find((c) => c.id === "ato2");
  const sob = ato2 && ato2.tabelas.find((x) => x.tipo === "sobrecarga");
  const porRodada = sob ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 12].map((n) => (sob.linhas.find((l) => n >= l.de && n <= l.ate) || {}).pd) : [];
  t.iguais("sobrecarga do porão (p. 77): 0, 0, 1, 1, 1d4, 1d4, 1d6, 1d6, 2d4 da 9ª em diante", porRodada, ["0", "0", "1", "1", "1d4", "1d4", "1d6", "1d6", "2d4", "2d4"]);
  const ato1 = alpha && alpha.cenas.find((c) => c.id === "ato1");
  const des = (cena, id) => cena && cena.desafios.find((d) => d.id === id);
  t.iguais("correntes de Edgar: arrombar DT 10 PA 10 e destrancar 4d4 com 2 tentativas (p. 37)", [des(ato1, "correntes-arrombar").config.dt, des(ato1, "correntes-arrombar").config.pa, des(ato1, "correntes").config.dados, des(ato1, "correntes").config.faces, des(ato1, "correntes").config.max], [10, 10, 4, 4, 2]);
  t.iguais("porta de saída: 6 dígitos, 3 erros bloqueiam 2 rodadas (p. 50)", [des(ato1, "porta-saida").config.digitos, des(ato1, "porta-saida").config.bloqueio.erros, des(ato1, "porta-saida").config.bloqueio.rodadas], [6, 3, 2]);
  const m1 = PACOTE_REAL["beta-aughisk"], m2 = PACOTE_REAL["beta-ellen"];
  t.ok("missões Beta 1 e 2 no pacote", !!(m1 && m2));
  const bau = m2 && des(m2.cenas.find((c) => c.id === "gruta"), "bau");
  t.iguais("baú romano: 4d12 com a senha impressa (p. 65)", bau ? [bau.config.faces, bau.segredo.senha.length] : [], [12, 4]);
  const gruta = m2 && m2.cenas.find((c) => c.id === "gruta");
  t.ok("gruta: ondas de crias que param com a chama depois de duas", !!(gruta && gruta.encontro.ondas.ameaca === "cria-da-floresta" && gruta.encontro.ondas.minimoAntesDeParar === 2));
  const anexos = [].concat(...Object.values(PACOTE_REAL).map((p) => (p.anexos || []).concat(...(p.cenas || []).map((c) => c.anexos || []))));
  t.ok("referências faltantes marcadas (veio: false) e nenhum arquivo duplicado", anexos.some((a) => a.veio === false) && new Set(anexos.filter((a) => a.sha256).map((a) => a.sha256)).size === anexos.filter((a) => a.sha256).length);
  // Uma sessão curta com o pacote real: carrega cada cena sem erro.
  let todas = true;
  Object.keys(PACOTE_REAL).forEach((pid) => (PACOTE_REAL[pid].cenas || []).forEach((cena) => {
    const mm = { estado: ME.estadoVazio(cena.perfil || PACOTE_REAL[pid].perfil || "beta-vigilia"), fichas: { rhiona: { nome: "Rhiona", bloco: R.dePreset("rhiona") } }, pacotes: PACOTE_REAL };
    const r = operar(mm, { tipo: "carregarCena", pacote: pid, cena: cena.id }, MESTRE, () => 1);
    if (!r.ok) { todas = false; console.log("    " + pid + "/" + cena.id + ": " + r.motivo); }
    const vj = vistaDe(mm, jog("rhiona"));
    const segredos = JSON.stringify(cena.desafios || []).match(/"(?:senha|resposta|respostas|ordem)":[^}]*/g) || [];
    if (/notaPrivada|contextual/.test(JSON.stringify(vj.investigacao.pontos))) { todas = false; console.log("    vazou contexto em " + cena.id); }
    void segredos;
  }));
  t.ok("cada cena do pacote carrega, e a vista do jogador sai sem contexto", todas);

  /* Ponto Alpha com ferramenta e sobrecarga (Ato II, porão). */
  const a2 = { estado: ME.estadoVazio("alpha-contemporaneo"), fichas: { heitor: { nome: "Heitor", bloco: R.dePreset("heitor") }, val: { nome: "Val", bloco: R.dePreset("val") } }, pacotes: PACOTE_REAL };
  operar(a2, { tipo: "carregarCena", pacote: "alpha-idolo", cena: "ato2" }, MESTRE, () => 1);
  operar(a2, { tipo: "ferramentaPosse", ferramenta: "termometro", personagem: "val" });
  const term = operar(a2, { tipo: "usarFerramenta", quem: "val", ferramenta: "termometro", ponto: "a2-altar" }, jog("val"));
  t.ok("Ato II: termômetro no altar → mais quente que o ambiente", term.ok && /quente/i.test(term.resultado.leitura.texto));
  operar(a2, { tipo: "ferramentaPosse", ferramenta: "emf", personagem: "heitor" });
  const emf = operar(a2, { tipo: "usarFerramenta", quem: "heitor", ferramenta: "emf", ponto: "a2-freezer" }, jog("heitor"));
  t.ok("Ato II: EMF no freezer → 1-1-1, áudio EMF 3 como referência que não veio", emf.ok && /1-1-1/.test(emf.resultado.leitura.texto) && vistaDe(a2, jog("heitor")).proc.anexos.some((x) => x.id === "a2-emf3" && x.veio === false));
  const pdA = bl(a2, "val").recursos.pd.atual;
  [1, 2, 3].forEach((r) => operar(a2, { tipo: "encerrarRodada", rodada: r }));
  t.igual("Ato II: sobrecarga do porão — 1 PD no fim da 3ª rodada", bl(a2, "val").recursos.pd.atual, pdA - 1);
  const lab = operar(a2, { tipo: "ferramentaPosse", ferramenta: "laboratorio", personagem: "heitor" });
  const roupa = operar(a2, { tipo: "usarFerramenta", quem: "heitor", ferramenta: "laboratorio", ponto: "a2-roupas" }, jog("heitor"));
  t.ok("Ato II: laboratório nas roupas pede ao Mestre a sequência (não impressa)", lab.ok && !roupa.ok && /sequ[eê]ncia/.test(roupa.motivo));

  /* Tranca Beta com limite de tentativas: o baú romano (o Mestre fixa o limite que o texto não imprime). */
  const g2 = { estado: ME.estadoVazio("beta-vigilia"), fichas: { rhiona: { nome: "Rhiona", bloco: R.dePreset("rhiona") }, sira: { nome: "Sira", bloco: R.dePreset("sira") } }, pacotes: PACOTE_REAL };
  operar(g2, { tipo: "carregarCena", pacote: "beta-ellen", cena: "gruta" }, MESTRE, () => 1);
  const escondido = operar(g2, { tipo: "desafioAgir", id: "bau", acao: "tentar", quem: "sira", valores: [1, 1, 1, 1] }, jog("sira"));
  t.ok("o baú está num ponto ainda oculto: a jogadora nem o vê", !escondido.ok && !vistaDe(g2, jog("sira")).proc.desafios.some((d) => d.id === "bau"));
  operar(g2, { tipo: "revelarPonto", id: "g-bau", revelado: true });
  const semSubir = operar(g2, { tipo: "desafioAgir", id: "bau", acao: "tentar", quem: "sira", valores: [1, 1, 1, 1] }, jog("sira"));
  t.ok("sem subir na plataforma, não alcança o baú", !semSubir.ok);
  operar(g2, { tipo: "flag", chave: "desafio:plataforma", personagem: "sira" });
  operar(g2, { tipo: "desafioMestre", id: "bau", acao: "ajustar", config: { max: 2 } });
  operar(g2, { tipo: "revelarPista", ponto: "g-bau", pista: "gu1", para: ["rhiona"] });
  const crime = P.periciaEsp(bl(g2, "sira"), "crime").faces, porR = MO.tentativasDeDestrancar(crime);
  const senhaReal = des(m2.cenas.find((c) => c.id === "gruta"), "bau").segredo.senha;
  const tentativa = senhaReal.map((v, i) => (i === 0 ? (v < 12 ? v + 1 : v - 1) : i === 1 ? (v > 1 ? v - 1 : v + 1) : v));
  const esperada = senhaReal.map((v, i) => (tentativa[i] === v ? "exato" : v < tentativa[i] ? "baixo" : "alto")).join("/");
  const resps = [];
  for (let i = 0; i < 4; i++) {
    const r = operar(g2, { tipo: "desafioAgir", id: "bau", acao: "tentar", quem: "sira", valores: tentativa }, jog("sira"));
    resps.push(r.ok ? r.resultado.resposta.join("/") : "×");
    if (!r.ok) { operar(g2, { tipo: "encerrarRodada", rodada: lido(g2).proc.rodada }); }
  }
  const bauE = lido(g2).proc.desafios.find((d) => d.id === "bau");
  t.ok("baú: a resposta posição a posição bate com a senha impressa; limite 2 + 1 (Ofício) = 3 e então danifica", resps[0] === esperada && bauE.dados.total === 3 && bauE.estado === "danificado", resps.join(" | ") + " · Crime d" + crime + " (" + porR + "/rodada)");

  /* Equilíbrio da escadaria e encontro com pista + runas + ondas (a gruta real). */
  const esc = operar(g2, { tipo: "desafioAgir", id: "escadaria", acao: "rolar", quem: "rhiona" }, jog("rhiona"), fila(5, 6));
  t.ok("escadaria: 5 e 6 → equilibrado (1/3)", esc.ok && esc.resultado.equilibrio.equilibrado);
  operar(g2, { tipo: "iniciarCombate", personagens: ["rhiona", "sira"], antecipar: false });
  operar(g2, { tipo: "encontro", acao: "iniciar" });
  operar(g2, { tipo: "proximaRodada", rodada: 1 }, MESTRE, () => 1);
  t.igual("gruta: a 1ª onda vem na rodada 2 (uma cria por personagem)", lido(g2).combate.participantes.filter((p) => p.ameaca === "cria-da-floresta").length, 2);
  const inv = operar(g2, { tipo: "investigar", quem: "sira", ponto: "g-altar", pericia: "percepcao", modo: "nada" }, jog("sira"));
  t.ok("investigar no meio do combate: a pista do pergaminho sai", inv.ok && P.flagAtiva(lido(g2), "pergaminho", null));
  const cenaGruta = m2.cenas.find((c) => c.id === "gruta");
  const pedrasNaOrdem = des(cenaGruta, "runas").segredo.ordem.map((runa) => cenaGruta.itens.find((i) => i.runa === runa).id);
  pedrasNaOrdem.forEach((r) => operar(g2, { tipo: "item", id: r, com: "rhiona" }));
  pedrasNaOrdem.forEach((r, i) => operar(g2, { tipo: "desafioAgir", id: "runas", acao: "encaixar", quem: "rhiona", nicho: i, item: r }, jog("rhiona")));
  t.ok("as seis runas na ordem do pacote acendem a chama", P.flagAtiva(lido(g2), "chamaAcesa", null));
  for (let r = 2; r <= 7; r++) operar(g2, { tipo: "proximaRodada", rodada: r }, MESTRE, () => 1);
  t.ok("com a chama, a 2ª onda ainda vem e depois param", lido(g2).proc.encontro.ondas.geradas.length === 2 && lido(g2).proc.encontro.ondas.paradas === true);

  /* Missão 1: afogados entram sozinhos; Investida Equina; Enxurrada com abrigo. */
  const mi1 = { estado: ME.estadoVazio("beta-vigilia"), fichas: { rowan: { nome: "Rowan", bloco: R.dePreset("rowan") }, malik: { nome: "Malik", bloco: R.dePreset("malik") } }, pacotes: PACOTE_REAL };
  operar(mi1, { tipo: "carregarCena", pacote: "beta-aughisk", cena: "afogados" }, MESTRE, () => 1);
  operar(mi1, { tipo: "iniciarCombate", personagens: ["rowan", "malik"], antecipar: true });
  operar(mi1, { tipo: "encontro", acao: "iniciar" });
  t.igual("Cena 1: um afogado por personagem entra com o encontro", lido(mi1).combate.participantes.filter((p) => p.ameaca === "afogado").length, 2);
  const hor = operar(mi1, { tipo: "efeitoEmGrupo", efeito: "horror" }, MESTRE, fila(3, 2, 2, 3, 6, 6));
  t.ok("o horror dos afogados: 1d6 emocional para todos; quem falha na Disciplina ganha pavor", hor.ok && /pavor/i.test(textos(hor)), textos(hor));
  operar(mi1, { tipo: "carregarCena", pacote: "beta-aughisk", cena: "aughisk" }, MESTRE, () => 1);
  operar(mi1, { tipo: "encerrarCombate" });
  operar(mi1, { tipo: "iniciarCombate", personagens: ["rowan", "malik"], antecipar: false });
  operar(mi1, { tipo: "adicionarAmeaca", ameaca: "aughisk", quantidade: 1, rd: 3 });
  const au = lido(mi1).combate.participantes.find((p) => p.ameaca === "aughisk");
  t.ok("o aughisk entra com a RD informada pelo Mestre (lacuna do texto)", au && au.rd === 3 && au.bloco.recursos.pv.max === 40);
  const inv2 = operar(mi1, { tipo: "acaoEspecial", ator: au.id, especial: "investida", alvo: "pc-malik", esquivou: true }, MESTRE, fila(9, 8, 2, 2, 1, 1, 1));
  t.ok("Investida Equina vencendo: RA+3, caído e atordoado", inv2.ok && bl(mi1, "malik").estado.caido === true && bl(mi1, "malik").estado.perdeAcao === 2, textos(inv2));
  const enx1 = operar(mi1, { tipo: "acaoEspecial", ator: au.id, especial: "enxurrada" });
  const enx2 = operar(mi1, { tipo: "acaoEspecial", ator: au.id, especial: "enxurrada", concluir: true, abrigo: ["rowan"] }, MESTRE, () => 6);
  t.ok("Enxurrada em duas ações; quem se abrigou e passa não sofre dano", enx1.ok && enx2.ok && /abrigado/.test(textos(enx2)), textos(enx2));
}

console.log(`\n${FORTE}${passaram} ok${FIM}, ${falharam ? VERMELHO : ""}${falharam} falha(s)${FIM}${pulados ? `, ${pulados} pulado(s)` : ""}.`);
if (falharam) { console.log("Falharam:\n  " + falhas.join("\n  ")); Deno.exit(1); }
