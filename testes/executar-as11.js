/* =====================================================================
   R.A.M.A. — testes do Arquivos Secretos 11: Gaudérios e as Estradas
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-as11.js

   O suplemento e a fonte (Gaudério Abutre, que saiu dos Extras para o
   AS11, e a motocicleta republicada, uma identidade só), os veículos de viagem, encontros e acidentes pelo
   módulo compartilhado (js/ordem/viagens.js), as regalias novas nos
   Veículos Operacionais (vagas em terços e reservas), os aliados Bruna,
   Nicole e Rômulo, o Limite de Dados (fichas e ameaças, com a Fonte do
   Medo) e Carcaças Vermelhas (contador, caçada, confronto, reféns,
   Sonnenblume). Sem DOM e sem rede; dados sintéticos. O servidor tem os
   próprios testes (testes/viagens-backend.js).
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
globalThis.navigator = globalThis.navigator || { onLine: true };
globalThis.location = globalThis.location || { search: "" };

for (const caminho of ["js/config.js", "js/util.js", "js/sistemas.js", "js/suplementos.js", "js/dados.js", "js/habilidades.js",
  "js/ordem/catalogo.js", "js/ordem/pericias-usos.js", "js/ordem/poderes.js", "js/ordem/opcionais.js", "js/ordem/efeitos.js", "js/ordem/condicoes.js",
  "js/ordem/consumo.js", "js/ordem/inventario.js", "js/ordem/personalizacao.js", "js/ordem/aprendizado.js",
  "js/ordem/progressao.js", "js/ordem/biblioteca.js", "js/ordem/regras.js",
  "js/ordem/arquivo3.js", "js/ordem/viagens.js",
  "js/criaturas.js", "js/ficha.js",
  "js/ordem/criaturas-dados.js", "js/ordem/criaturas.js"]) {
  (0, eval)(await Deno.readTextFile(new URL("../" + caminho, import.meta.url)));
}

const G = globalThis;
const C = G.RAMAOrdemCatalogo, R = G.RAMAOrdemRegras, A3 = G.RAMAOrdemArquivo3, V = G.RAMAViagens, S = G.RAMASuplementos, OP = G.RAMAOrdemOpcionais;
const F = G.RAMAFicha;

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0;
const falhas = [];
const t = {
  grupo(titulo) { console.log(`\n${FORTE}${titulo}${FIM}`); },
  ok(nome, condicao, detalhe) {
    if (condicao) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${nome}`); }
    else { falharam++; falhas.push(nome); console.log(`  ${VERMELHO}FALHOU${FIM} ${nome}${detalhe ? `  ${CINZA}${detalhe}${FIM}` : ""}`); }
  },
  igual(nome, obtido, esperado) {
    const a = JSON.stringify(obtido), b = JSON.stringify(esperado);
    t.ok(nome, a === b, a === b ? "" : `obtido ${a}, esperado ${b}`);
  },
};
const ATR = { agi: 2, for: 2, int: 2, pre: 1, vig: 2 };
function ficha(extra) {
  const o = R.fichaVazia();
  Object.keys(extra || {}).forEach((k) => { o[k] = extra[k]; });
  return R.normalizar(JSON.parse(JSON.stringify(o)));
}
function volta(o) { return R.normalizar(JSON.parse(JSON.stringify(o))); }

/* Um rolador determinístico para as operações. */
let fila = [];
const rolar = () => (fila.length ? fila.shift() : 1);
let nOp = 0;
const ctxDe = (papel, meus) => ({ papel, autor: "u1", autorNome: "Mestra", meus: meus || [], personagens: [{ id: "pA", nome: "Ana" }, { id: "pB", nome: "Beto" }, { id: "pC", nome: "Caio" }],
  vinculados: {}, rolar, agora: "2026-11-28T12:00:00.000Z", opId: "op" + (++nOp) + "-xxxxxxxx" });

t.grupo("Suplemento e fonte");
{
  t.ok("ordem.as11 no cadastro, com a fonte AS11 e a ferramenta Viagens", !!S.de("ordem.as11") && S.de("ordem.as11").fontes[0] === "AS11" && S.daFerramenta("ordem", "viagens").id === "ordem.as11");
  t.ok("o livro AS11 (v1.0) entre as fontes do catálogo", C.LIVROS.some((l) => l.sigla === "AS11" && l.edicao === "v1.0"));
  t.ok("a ferramenta começa desligada mesmo com o suplemento (precisa do mestre)", S.ferramentaLiberada("ordem", "viagens", null) === true && G.RAMASistemas.mecanicas("ordem").some((m) => m.chave === "viagens"));
  const sis = await Deno.readTextFile(new URL("../backend/Sistemas.gs", import.meta.url));
  t.ok("o servidor conhece ordem.as11 e a mecânica viagens", /ordem\.as11/.test(sis) && /'viagens'/.test(sis));
}

t.grupo("Gaudério Abutre no AS11 e a motocicleta republicada");
{
  const g = C.origem("gauderioAbutre");
  t.ok("uma origem só, agora com a fonte AS11, p. 63 (saiu dos Extras)", C.ORIGENS.filter((o) => o.chave === "gauderioAbutre").length === 1 && g.fonte === "AS11" && g.pagina === 63 && !g.material);
  t.igual("a referência é o AS11", C.referencia(g), "Arquivos Secretos 11, p. 63");
  S.definirContexto({ sistema: "ordem", ficha: ["ordem.as11"], campanha: null });
  t.ok("com o AS11 ligado: escolhível", C.fonteLiberada(g));
  S.definirContexto({ sistema: "ordem", ficha: ["ordem.extra"], campanha: null });
  t.ok("só com os Extras: fora das novas escolhas", !C.fonteLiberada(g));
  S.definirContexto({ sistema: "ordem", ficha: null, campanha: null });
  const o = ficha({ classe: "combatente", origem: "gauderioAbutre", nex: 5, atributos: ATR });
  t.ok("ficha antiga com a origem abre igual (a mesma chave, as perícias da origem)", o.origem === "gauderioAbutre" && C.origem(o.origem).pericias.join(",") === "luta,pilotagem");
  const moto = A3.MODELOS_VEICULO.filter((m) => m.chave === "motoGauderios");
  t.ok("a motocicleta é um modelo só, com a republicação (AS11 p. 57)", moto.length === 1 && moto[0].republicacoes[0].pagina === 57);
}

t.grupo("Veículos de viagem (p. 37)");
{
  t.igual("17 modelos", V.VEICULOS.length, 17);
  const carro = V.POR_VEICULO.carroPopular;
  t.ok("carro popular: proporções 2, 4 passageiros, 600 km, categoria II", carro.proporcoes === 2 && carro.passageiros === 4 && carro.autonomia === 600 && carro.categoria === "II");
  t.ok("cavalo: 50 km/dia (30 com passageiro), sem categoria, Adestramento", V.POR_VEICULO.cavalo.porDia === 50 && V.POR_VEICULO.cavalo.porDiaComPassageiro === 30 && V.POR_VEICULO.cavalo.categoria === "" && V.POR_VEICULO.cavalo.pericia === "adestramento");
  t.ok("nenhum modelo de viagem tem PV, Defesa ou RD", V.VEICULOS.every((m) => m.pv === undefined && m.defesa === undefined && m.rd === undefined));
  t.igual("carro elétrico com Painéis Solares: 350 → 700 km", [V.autonomiaMaxima({ modelo: "carroEletrico", equipamentos: [] }), V.autonomiaMaxima({ modelo: "carroEletrico", equipamentos: ["paineisSolares"] })], [350, 700]);
  t.igual("vazamento: metade", V.autonomiaMaxima({ modelo: "carroPopular", equipamentos: [], vazamento: true }), 300);
  t.igual("modelos do AS3 da viagem batem com os de arquivo3.js", Object.keys(V.MODELOS_AS3).every((k) => { const m = A3.MODELOS_VEICULO.filter((x) => x.chave === k)[0]; return m && m.pv === V.MODELOS_AS3[k].pv && m.categoria === V.MODELOS_AS3[k].categoria; }), true);
  t.igual("as regalias do AS11 da viagem são as de arquivo3.js (menor e limite)", V.CHAVES_AS11.every((k) => { const d = A3.POR_REGALIA[k], x = V.REGALIAS_NA_VIAGEM[k]; return d && d.fonte === "AS11" && !!d.menor === !!x.menor && (d.maximo || 1) === (x.maximo || 1); }), true);
}

t.grupo("Itinerários (p. 38–39)");
{
  const tipos = (m, v) => V.etapasDoModulo(m, v).map((e) => e.tipo).join(",");
  t.igual("curta: partida → encontro → chegada", tipos("curta", "imprudente"), "partida,encontro,chegada");
  t.igual("média padrão: dois encontros com uma parada", tipos("media", "padrao"), "partida,encontro,parada,encontro,chegada");
  t.igual("média imprudente: sem a parada", tipos("media", "imprudente"), "partida,encontro,encontro,chegada");
  t.igual("longa padrão: três encontros e duas paradas, de manhã à madrugada", V.etapasDoModulo("longa", "padrao").map((e) => e.tipo + (e.periodo ? ":" + e.periodo : "")).join(","),
    "partida:manhã,encontro,parada:tarde,encontro,parada:noite,encontro,chegada:madrugada");
  t.igual("longa imprudente: dois encontros, parada à tarde sem interlúdio, chegada à noite", V.etapasDoModulo("longa", "imprudente").map((e) => e.tipo + (e.periodo ? ":" + e.periodo : "")).join(","),
    "partida:manhã,encontro,parada:tarde,encontro,chegada:noite");
}

t.grupo("Encontros e acidentes (p. 44–55)");
{
  t.igual("tabela principal: 1 acidente, 2–60 nada, 98 ambiental + veículo", [V.linhaPrincipal(1)[2], V.linhaPrincipal(60)[2], V.linhaPrincipal(98)[2]], [["acidente"], [], ["ambiental", "veiculo"]]);
  const pneu = V.eventoDaTabela("veiculo", 2);
  t.ok("d100 98 com bicicleta: o problema no veículo é inaplicável", !V.aplicabilidade(pneu, { modelo: "bicicleta", equipamentos: [] }, {}).aplicavel);
  t.ok("  e o ambiental continua", V.aplicabilidade(V.eventoDaTabela("ambiental", 15), { modelo: "bicicleta", equipamentos: [] }, {}).aplicavel);
  t.ok("câmbio: carro elétrico é imune", !V.aplicabilidade(V.eventoDaTabela("veiculo", 11), { modelo: "carroEletrico", equipamentos: [] }, {}).aplicavel);
  t.ok("falha eletrônica: carro velho é imune; Painéis Solares evitam", !V.aplicabilidade(V.eventoDaTabela("veiculo", 17), { modelo: "carroVelho", equipamentos: [] }, {}).aplicavel &&
    !V.aplicabilidade(V.eventoDaTabela("veiculo", 16), { modelo: "carroPopular", equipamentos: ["paineisSolares"] }, {}).aplicavel);
  t.ok("temperatura extrema: ar-condicionado evita", !V.aplicabilidade(V.eventoDaTabela("ambiental", 3), { modelo: "carroPopular", equipamentos: ["arCondicionado"] }, {}).aplicavel);
  const comp = V.composicaoDoAcidente(27, { imprudente: true }, 2, V.outroPorChave("jipe"), []);
  t.igual("carro (2) contra jipe (3), Pilotagem 27, imprudente: 27 − 5 − 1 = 21", comp.total, 21);
  t.ok("  colisão lateral, 10d6 de impacto por ocupante", comp.resultado.chave === "lateral" && comp.resultado.dano === 10);
  t.igual("zero ou negativo é colisão frontal (extensão da tabela)", [V.resultadoDoAcidente(0).chave, V.resultadoDoAcidente(-4).chave, V.resultadoDoAcidente(41).chave], ["frontal", "frontal", "livre"]);
  t.igual("d100 do outro envolvido: 72 carro elétrico, 99 cavalo com ginete", [V.outroEnvolvido(72).nome, V.outroEnvolvido(99).proporcoes], ["Carro elétrico", 1]);
  t.ok("Sensores e câmeras entram na composição (+2)", V.composicaoDoAcidente(20, {}, 2, null, ["sensoresECameras"]).total === 22);
}

t.grupo("Regalias novas nos Veículos Operacionais (p. 56–57)");
{
  const v = A3.novoVeiculo("categoria2");
  t.igual("categoria II: uma vaga", A3.MODELOS_VEICULO[0].regalias, 1);
  ["airbag", "gps", "estepe"].forEach((k) => { const c = A3.cabeRegalia(v, k); if (c.ok) A3.trocarRegalias(v, v.regalias.concat([{ chave: k }])); });
  t.igual("três menores cabem na vaga e a ocupam", [v.regalias.length, A3.vagasUsadas(v.regalias).vagas], [3, 1]);
  t.ok("uma quarta menor já não cabe", !A3.cabeRegalia(v, "arCondicionado").ok);
  t.ok("nem uma inteira", !A3.cabeRegalia(v, "janelasBlindadas").ok);
  const v2 = A3.normalizarVeiculo(JSON.parse(JSON.stringify(v)));
  t.ok("reabrir o veículo mantém as escolhas e a reserva do estepe", v2.regalias.length === 3 && v2.reservas.estepe === 1);
  const v3 = A3.novoVeiculo("categoria4");
  v3.combustivel = 2; v3.pvAtual = 150;
  A3.trocarRegalias(v3, [{ chave: "estepe" }, { chave: "estepe" }, { chave: "extintor" }]);
  t.ok("instalar conserva combustível e PV; cada estepe traz a sua unidade", v3.combustivel === 2 && v3.pvAtual === 150 && v3.reservas.estepe === 2 && v3.reservas.extintor === 1);
  t.ok("usar um estepe é explícito", A3.mexerReserva(v3, "estepe", -1).ok && v3.reservas.estepe === 1);
  t.ok("repor até o limite das aquisições", A3.mexerReserva(v3, "estepe", 1).ok && !A3.mexerReserva(v3, "estepe", 1).ok);
  t.ok("estepe: no máximo 3 aquisições", A3.normalizarVeiculo({ id: "v-x", modelo: "categoria4", regalias: [1, 2, 3, 4].map(() => ({ chave: "estepe" })) }).regalias.length === 3);
  t.ok("Carrinho Lateral só na moto", !A3.cabeRegalia(A3.novoVeiculo("categoria3"), "carrinhoLateral").ok && A3.cabeRegalia({ modelo: "motoGauderios", regalias: [{ chave: "arsenalSecreto" }] }, "carrinhoLateral").ok);
  t.ok("Sensores e câmeras: +2 em Pilotagem nas contas do veículo", A3.contasDoVeiculo(A3.normalizarVeiculo({ id: "v-s", modelo: "categoria3", regalias: [{ chave: "sensoresECameras" }] })).pilotagem === 2);
}

t.grupo("Aliados: Bruna, Nicole e Rômulo");
{
  const sem = ficha({ classe: "combatente", origem: "academico", nex: 5, atributos: ATR });
  const base = R.bonusDePericia(sem, "pilotagem").total;
  const dBase = R.dadosDoTeste(sem, "pilotagem").quantos;
  t.ok("Bruna acompanhando agente sem Pilotagem: considerado treinado", A3.acompanhar(sem, "al-b", "as11.criatura.bruna-machado-aliado", "Bruna", true).ok &&
    R.bonusDePericia(volta(sem), "pilotagem").total - base === C.grau("treinado").bonus && R.dadosDoTeste(volta(sem), "pilotagem").quantos === dBase);
  const com = ficha({ classe: "combatente", origem: "academico", nex: 5, atributos: ATR, pericias: { pilotagem: "treinado" } });
  const b2 = R.bonusDePericia(com, "pilotagem").total, d2 = R.dadosDoTeste(com, "pilotagem").quantos;
  A3.acompanhar(com, "al-b", "as11.criatura.bruna-machado-aliado", "Bruna", true);
  t.ok("já treinado: +1d20 e o grau original", R.dadosDoTeste(volta(com), "pilotagem").quantos - d2 === 1 && R.bonusDePericia(volta(com), "pilotagem").total === b2);
  t.ok("Rômulo tem os mesmos efeitos, de propósito", JSON.stringify(A3.EFEITOS_DE_ALIADO["as11.criatura.romulo-machado-aliado"].efeitos) === JSON.stringify(A3.EFEITOS_DE_ALIADO["as11.criatura.bruna-machado-aliado"].efeitos));
  t.ok("Nicole: Artes (ou +1d20) e o Ajuda Como Dá marcado", A3.EFEITOS_DE_ALIADO["as11.criatura.nicole-oliva-aliado"].efeitos[0].pericias[0] === "artes" && A3.EFEITOS_DE_ALIADO["as11.criatura.nicole-oliva-aliado"].ajudaComoDa);
  const lista = G.RAMAOrdemCriaturasDados.criaturas.filter((c) => /^as11\.criatura\./.test(c.id));
  t.ok("os três perfis na biblioteca, com a fonte AS11 e a página", lista.length === 3 && lista.every((c) => c.livro === "AS11" && c.pagina >= 92 && c.aliada));
  t.ok("Troca Tiro e Dá Porrada custa 1 PE e rola 1d6 (botão no resultado do teste)", lista.filter((c) => /Bruna/.test(c.nome))[0].habilidades.some((h) => /Troca Tiro/.test(h.nome) && h.custo === "1 PE"));
}

t.grupo("Limite de Dados (p. 103–104, regra da comunidade)");
{
  const r = OP.regra("limiteDeDados");
  t.ok("regra opcional desligada por padrão, marcada como da comunidade (Luna Moth)", r && r.fa && /Luna Moth/.test(r.fa.autor) && !OP.ligada(R.fichaVazia(), "limiteDeDados"));
  const atr = { agi: 2, for: 5, int: 2, pre: 1, vig: 2 };
  const o = ficha({ classe: "combatente", origem: "academico", nex: 5, atributos: atr, opcionais: { limiteDeDados: true } });
  /* +2d20 em Atletismo e –2d20 nos testes, por efeitos de ficha. */
  o.condicoes.efeitos = [];
  const pericia = (oo) => R.dadosDoTeste(oo, "atletismo", { atributo: "for" }, 7);
  const semLimite = ficha({ classe: "combatente", origem: "academico", nex: 5, atributos: atr });
  t.igual("sem a regra, 7 dados", R.dadosDoTeste(semLimite, "atletismo", { atributo: "for" }, 7).expressao, "7d20");
  t.igual("com a regra, 7 positivos viram 5", pericia(o).expressao, "5d20");
  const d = R.dadosDoTeste(o, "atletismo", { atributo: "for", parcelasDeDados: [{ rotulo: "Penalidade", valor: -2 }] }, 7);
  t.igual("7 positivos e –2d20: 3d20, fica com o maior", d.expressao, "3d20");
  t.ok("  a composição mostra o corte", d.parcelas.some((p) => p.rotulo === "Limite de Dados"));
  t.igual("resultado –2: 4d20, fica com o menor", R.expressaoDosDados(o, -2), "-4d20");
  t.igual("–3 ou menos: 5d20, o menor", [R.expressaoDosDados(o, -3), R.expressaoDosDados(o, -6)], ["-5d20", "-5d20"]);
  t.igual("sem a regra, –6 continua –8d20", R.expressaoDosDados(semLimite, -6), "-8d20");
  t.igual("dado acrescentado depois (+1d20) respeita o limite", R.expressaoComDados(o, R.dadosDoTeste(o, "atletismo", { atributo: "for" }, 5), 1), "5d20");
  t.ok("o atributo continua 5 para o resto da ficha", R.atributo(o, "for") === 5);
}

t.grupo("Limite de Dados nas ameaças (painel de criatura)");
{
  (0, eval)(await Deno.readTextFile(new URL("../js/criatura-painel.js", import.meta.url)).catch(() => ""));
  const L = G.RAMACriaturaPainel && G.RAMACriaturaPainel.limitarExpressao;
  if (!L) t.ok("painel de criatura carregado", false);
  else {
    t.igual("atributo 7: 7d20+10 → 5d20+10", L("7d20+10", true, false).expressao, "5d20+10");
    t.ok("  com a nota da regra", /Limite de Dados/.test(L("7d20+10", true, false).nota));
    t.igual("Enigma de Medo pendente: Fonte do Medo, rola os 7", L("7d20+10", true, true).expressao, "7d20+10");
    t.ok("  com a nota da Fonte do Medo", /Fonte do Medo/.test(L("7d20+10", true, true).nota));
    t.igual("regra desligada: nada muda", L("7d20+10", false, false).expressao, "7d20+10");
    t.igual("negativos: −7d20 → −5d20", L("-7d20", true, false).expressao, "-5d20");
  }
}

t.grupo("Carcaças Vermelhas pelo módulo (p. 60–91)");
{
  const e = V.normalizar({});
  const ap = (op, papel, meus) => V.aplicar(e, op, ctxDe(papel || "mestre", meus));
  ap({ tipo: "ligar", ativo: true });
  ap({ tipo: "carcacas_iniciar", velocidade: "imprudente", agentes: ["pA", "pB", "pC"] });
  let vg = V.viagemAtual(e);
  t.igual("imprudente: cenas 1, 2, 3, 4 e 7; contador em 6", [vg.etapas.filter((x) => x.tipo === "cena").map((x) => x.cena), vg.carcacas.perseguicao], [[1, 2, 3, 4, 7], 6]);
  ap({ tipo: "perseguicao", delta: 9 });
  t.igual("o contador para em 10", V.viagemAtual(e).carcacas.perseguicao, 10);
  ap({ tipo: "perseguicao", delta: -12 });
  t.igual("e não desce de 1", V.viagemAtual(e).carcacas.perseguicao, 1);
  ap({ tipo: "perseguicao", delta: 5 });
  ap({ tipo: "caca_conceder", personagemId: "pA", quantidade: 3 });
  fila = [6, 3];
  const g = V.aplicar(e, { tipo: "caca_gastar", personagemId: "pA", quantidade: 2, contraCarcaca: true }, Object.assign(ctxDe("jogador", ["pA"]), { opId: "gasto-unico-xx" }));
  t.ok("três dados, gasta dois contra um Carcaça: +2d6 e sobra um", g.ok && g.resultado.faces === 6 && g.resultado.total === 9 && V.viagemAtual(e).carcacas.caca.pA === 1);
  t.ok("o resultado fica gravado com a operação", V.resultadoDe(e, "gasto-unico-xx").resultado.total === 9);
  t.ok("ninguém gasta o dado do outro", !V.aplicar(e, { tipo: "caca_gastar", personagemId: "pA", quantidade: 1 }, ctxDe("jogador", ["pB"])).ok);
  ap({ tipo: "decisao", cena: 2, decisao: "infoIrmaos" });
  vg = V.viagemAtual(e);
  t.igual("informações de Bruna e Rômulo: +1 no contador e dois dados por agente", [vg.carcacas.perseguicao, vg.carcacas.caca.pB], [7, 2]);
  t.ok("a mesma escolha não vale duas vezes", !ap({ tipo: "decisao", cena: 2, decisao: "infoIrmaos" }).ok);
  const hist = e.historico.filter((h) => h.tipo === "decisao")[0];
  ap({ tipo: "desfazer", alvo: hist.id });
  vg = V.viagemAtual(e);
  t.igual("desfazer devolve contador e dados", [vg.carcacas.perseguicao, vg.carcacas.caca.pB, !!vg.carcacas.decisoes["c2.infoIrmaos"]], [6, 0, false]);
  ap({ tipo: "veiculo", acao: "criar", modelo: "van" });
  ap({ tipo: "confronto_preparar" });
  vg = V.viagemAtual(e);
  t.igual("perseguição 6: dez reféns vivos, d10 da pessoa querida", [vg.carcacas.confronto.refens.vivos, vg.carcacas.confronto.querida.pA.dado], [10, 10]);
  ["pA", "pB", "pC"].forEach((p, i) => ap({ tipo: "passageiro", personagemId: p, pericia: ["Pontaria", "Luta", "Tática"][i], total: 35 }));
  const van = V.viagemAtual(e).veiculos[0];
  const m1 = ap({ tipo: "motorista", veiculoId: van.id, total: 10 });
  t.ok("três passageiros bem-sucedidos: o motorista testa contra DT 10", m1.ok && m1.resultado.dt === 10 && m1.resultado.sucesso);
  fila = [2];
  ap({ tipo: "rodada_fim", rodada: 1 });
  vg = V.viagemAtual(e);
  t.igual("fim de rodada com sacrifícios: nove vivos, rodada 2", [vg.carcacas.confronto.refens.vivos, vg.carcacas.confronto.rodada], [9, 2]);
  const rep = ap({ tipo: "passageiro", personagemId: "pA", pericia: "pontaria", total: 40 });
  t.ok("a perícia da rodada anterior fica indisponível", !rep.ok && /rodada anterior/.test(rep.motivo));
  ap({ tipo: "passageiro", personagemId: "pA", pericia: "Atletismo", total: 40 });
  const m2 = ap({ tipo: "motorista", veiculoId: van.id, total: 18 });
  t.ok("na rodada seguinte a redução é recalculada (um sucesso: DT 20)", m2.ok && m2.resultado.dt === 20 && !m2.resultado.sucesso);
  fila = [4];
  const imp = ap({ tipo: "passageiro", personagemId: "pB", pericia: "Pontaria", total: 39, impedir: true });
  t.ok("impedir os sacrifícios com a carroceria fechada: DT 40", imp.ok && !imp.resultado.sucesso);
  fila = [3];
  const s = ap({ tipo: "sonnenblume", personagemId: "pB", item: "biscoito" });
  const ordem = { temporarios: { pv: 0, pe: 0, san: 0 } };
  V.aplicarNaFicha(ordem, s.fichas[0]);
  t.igual("biscoito: 1d4 PE temporários na ficha, com a origem", [ordem.temporarios.pe, /Sonnenblume/.test(ordem.arquivo11.temporarios[0].origem)], [3, true]);
  t.ok("a mesma escrita duas vezes não soma de novo", !V.aplicarNaFicha(ordem, s.fichas[0]) && ordem.temporarios.pe === 3);
  ordem.temporarios.pe = 1;
  const fim = ap({ tipo: "missao_encerrar" });
  V.aplicarNaFicha(ordem, fim.fichas[0]);
  t.igual("encerrar: o que sobrou expira (1), sem tocar nos permanentes", [ordem.temporarios.pe, ordem.arquivo11.temporarios[0].expirou, ordem.recursos], [0, 1, undefined]);
  const vista = V.vistaDoJogador(e, ["pA"]);
  t.ok("vista do jogador sem notas nem remissões", JSON.stringify(vista).indexOf("REMISSOES") < 0 && vista.viagem.carcacas.meus[0] === "pA" && vista.viagem.carcacas.notas === undefined);
}

t.grupo("Ficha: schema e normalização");
{
  t.igual("schema 38", F.VERSAO_SCHEMA, 38);
  const o = ficha({ classe: "combatente", origem: "academico", nex: 5, atributos: ATR, arquivo11: { temporarios: [{ id: "t1", recurso: "pe", valor: 2, origem: "Sonnenblume", missao: "cv" }], efeitos: [{ id: "e1", chave: "apfelstrudel", missao: "cv" }] } });
  t.ok("ordem.arquivo11 atravessa a normalização", o.arquivo11 && o.arquivo11.temporarios.length === 1 && V.apfelstrudelAtivo(o));
}

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falharam) { console.log(falhas.map((f) => "  · " + f).join("\n")); Deno.exit(1); }
