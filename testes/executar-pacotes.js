/* =====================================================================
   R.A.M.A. — testes dos Pacotes de Homebrew (v9.6): regras puras
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-pacotes.js

   js/pacotes-homebrew.js (o que a tela decide antes de perguntar) e o
   MESMO julgamento no servidor (backend/HomebrewPacotes.gs): para cada
   sistema do registro e cada tipo de criação, a tela e o servidor dizem
   igual se cabe — e com o mesmo motivo. Mais o agrupamento por tipo, o
   formato do código e o destino "pacote" do editor de imagem.
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }) };
const ler = (c) => Deno.readTextFile(new URL("../" + c, import.meta.url));
for (const c of ["js/util.js", "js/sistemas.js", "js/pacotes-homebrew.js", "js/imagem-editor.js"]) (0, eval)(await ler(c));
/* O servidor: só as declarações (Sistemas.gs e HomebrewPacotes.gs). */
const servidor = {};
(new Function("alvo", (await ler("backend/Sistemas.gs")) + "\n" + (await ler("backend/HomebrewPacotes.gs")) +
  "\nalvo.motivo = motivoDeIncompatibilidade; alvo.nativo = sistemaNativoDaCriatura; alvo.rituais = SISTEMAS_COM_RITUAIS; alvo.normal = normalizarCodigoDePacote; alvo.valido = codigoDePacoteValido; alvo.ids = SISTEMAS_DO_RAMA.map(function (s) { return s.id; }); alvo.limites = [LIMITE_ENTRADAS_PACOTE, LIMITE_PACOTES_POR_CONTA, MAX_NOME_PACOTE, MAX_DESCRICAO_PACOTE, LIMITE_IMPORTACAO_POR_VEZ, LARGURA_CAPA_PACOTE, ALTURA_CAPA_PACOTE];"))(servidor);

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0;
const t = {
  grupo(x) { console.log(`\n${FORTE}${x}${FIM}`); },
  ok(n, c, d) { if (c) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${n}`); } else { falharam++; console.log(`  ${VERMELHO}FALHOU${FIM} ${n}${d ? `  ${CINZA}${d}${FIM}` : ""}`); } },
  iguais(n, a, b) { const x = JSON.stringify(a), y = JSON.stringify(b); t.ok(n, x === y, `obtido ${x}, esperado ${y}`); },
};
const P = globalThis.RAMAPacotesHomebrew;

t.grupo("Compatibilidade: a tela e o servidor dizem o mesmo");
const ids = globalThis.RAMASistemas.lista().map((s) => s.id);
t.iguais("os mesmos sistemas no site e no servidor", ids.slice().sort(), servidor.ids.slice().sort());
t.iguais("os sistemas com rituais: registro do site = lista do servidor", P.sistemasComRituais().slice().sort(), servidor.rituais.slice().sort());
const amostras = [
  { tipo: "item", nome: "Lanterna" }, { tipo: "arma", nome: "Faca" }, { tipo: "armadura", nome: "Colete" }, { tipo: "mochila", nome: "Bolsa" },
  { tipo: "habilidade", nome: "Olhar" }, { tipo: "ritual", nome: "Selo" },
  { tipo: "criatura", nome: "Zumbi", sistema: "ordem", ordem: { vd: 20 } },
  { tipo: "criatura", nome: "Ordem sem bloco", sistema: "ordem" },
  { tipo: "criatura", nome: "Vampira", sistema: "vampiro", vampiro: {} },
  { tipo: "criatura", nome: "Goblin", sistema: "goblins" }, { tipo: "criatura", nome: "Ameaça", sistema: "tormenta20" },
  { tipo: "criatura", nome: "Oblívio", sistema: "oblivio" }, { tipo: "criatura", nome: "O2", sistema: "ordem2" },
  { tipo: "criatura", nome: "Rato" }, { tipo: "criatura", nome: "Resumo", resumo: { sistema: "vampiro" } },
];
let iguais = 0, total = 0, divergencias = [];
for (const s of ids) for (const a of amostras) {
  total++;
  const tela = P.compatibilidade(a, s);
  const dados = a.resumo ? { sistema: a.resumo.sistema, vampiro: {} } : a;
  const srv = servidor.motivo(a.tipo, dados, s);
  if (tela.ok === !srv && tela.motivo === srv) iguais++; else divergencias.push(s + "/" + a.nome + ": " + JSON.stringify(tela) + " × " + JSON.stringify(srv));
}
t.ok("todas as combinações sistema × criação (" + total + ") batem, com o mesmo motivo", iguais === total, divergencias.slice(0, 3).join(" | "));
t.ok("genéricos cabem em qualquer sistema (inclusive os sem editor nativo de criatura)", ids.every((s) => ["item", "arma", "armadura", "mochila", "habilidade"].every((tp) => P.compatibilidade({ tipo: tp }, s).ok)));
t.ok("criatura só no sistema nativo; nunca convertida", P.compatibilidade(amostras[6], "ordem").ok && !P.compatibilidade(amostras[6], "universal").ok && /não converte/.test(P.compatibilidade(amostras[6], "brutal").motivo));
t.ok("criatura de Ordem sem o bloco de ameaça é Universal", P.sistemaNativo(amostras[7]) === "universal" && servidor.nativo(amostras[7]) === "universal");
t.ok("ritual: Ordem e Universal sim; Vampiro não, com motivo", P.compatibilidade({ tipo: "ritual" }, "ordem").ok && P.compatibilidade({ tipo: "ritual" }, "universal").ok && /aba Rituais/.test(P.compatibilidade({ tipo: "ritual" }, "vampiro").motivo));

t.grupo("Agrupamento e rótulos");
const grupos = P.agrupar([{ tipo: "ritual", nome: "a" }, { tipo: "criatura", nome: "b" }, { tipo: "item", nome: "c" }, { tipo: "criatura", nome: "d" }]);
t.iguais("grupos na ordem dos tipos, com os itens", grupos.map((g) => g.rotulo + ":" + g.itens.length), ["Criaturas:2", "Itens:1", "Rituais:1"]);
t.iguais("resumo dos tipos (singular e plural)", P.resumoDosTipos({ criatura: 2, ritual: 1, item: 1 }), "2 criaturas · 1 item · 1 ritual");

t.grupo("Código de acesso");
t.iguais("formatar: maiúsculas e grupos de 4", P.formatarCodigo("abcd efgh-jkmn pqrs"), "ABCD-EFGH-JKMN-PQRS");
t.ok("16 símbolos do alfabeto (sem 0, 1, I, O) são válidos", P.codigoValido("2345-6789-ABCD-EFGH") && !P.codigoValido("0000-1111-IIII-OOOO") && !P.codigoValido("ABCD-EFGH"));
t.ok("a tela e o servidor aceitam e recusam os mesmos códigos", ["2345-6789-ABCD-EFGH", "abcd efgh jkmn pqrs", "0000-1111-IIII-OOOO", "curto"].every((c) => P.codigoValido(c) === servidor.valido(servidor.normal(c))));

t.grupo("Capa: o destino do editor");
const cfg = globalThis.RAMAEditorImagem.configuracao("pacote");
t.ok("moldura 2:3, 320 × 480, estática", Math.abs(cfg.proporcao - 2 / 3) < 1e-9 && cfg.largura === 320 && cfg.altura === 480 && cfg.somenteEstatica);
t.iguais("os limites que a tela explica são os do servidor", [P.LIMITES.entradas, P.LIMITES.pacotes, P.LIMITES.nome, P.LIMITES.descricao, P.LIMITES.importacao, P.LIMITES.capaLargura, P.LIMITES.capaAltura], servidor.limites);
t.ok("  e a capa do editor tem o tamanho que o servidor registra", P.LIMITES.capaLargura === cfg.largura && P.LIMITES.capaAltura === cfg.altura);

console.log(`\n${FORTE}${passaram} ok${FIM}, ${falharam ? VERMELHO : ""}${falharam} falha(s)${FIM}.`);
if (falharam) Deno.exit(1);
