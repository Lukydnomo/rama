/* =====================================================================
   R.A.M.A. — testes do tema claro/escuro (v2.25) e dos temas
   personalizáveis (v2.36)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-tema.js

   Sem navegador: o documento, o prefers-color-scheme, o localStorage e o
   transporte são dublês. O que está sob teste é a decisão de js/tema.js
   (preferência → tema efetivo, cache por conta, fila de salvamento) e a
   ligação com o auth.js. Dados sintéticos.
   ===================================================================== */

const ARQUIVOS = ["js/config.js", "js/util.js", "js/api.js", "js/auth.js"];

/* ---------- ambiente ---------- */

function elementoFalso() {
  const attrs = {};
  const props = {};
  return {
    attrs,
    style: {
      setProperty(k, v) { props[k] = String(v); },
      removeProperty(k) { delete props[k]; },
      getPropertyValue(k) { return k in props ? props[k] : ""; },
    },
    setAttribute(k, v) { attrs[k] = String(v); },
    getAttribute(k) { return k in attrs ? attrs[k] : null; },
    removeAttribute(k) { delete attrs[k]; },
    appendChild() {}, addEventListener() {},
  };
}

let metas = {};
globalThis.window = globalThis;
globalThis.document = {
  currentScript: null,
  documentElement: elementoFalso(),
  createElement: () => elementoFalso(),
  addEventListener() {},
  querySelector(sel) {
    const m = /meta\[name="([^"]+)"\]/.exec(sel);
    return m ? metas[m[1]] || null : null;
  },
  querySelectorAll: () => [],
  body: { classList: { add() {}, remove() {} } },
  dispatchEvent() {},
};
globalThis.navigator = { onLine: true, userAgent: "teste" };
globalThis.location = { search: "", href: "", pathname: "/", reload() {} };
globalThis.CustomEvent = class { constructor(nome, init) { this.type = nome; Object.assign(this, init); } };

let ouvintesGlobais = [];
globalThis.addEventListener = (tipo, fn) => { ouvintesGlobais.push({ tipo, fn }); };

const guardado = new Map();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (k) => (guardado.has(k) ? guardado.get(k) : null),
    setItem: (k, v) => guardado.set(k, String(v)),
    removeItem: (k) => guardado.delete(k),
    clear: () => guardado.clear(),
  },
});

/* prefers-color-scheme de mentira: `escuro` null = aparelho sem suporte. */
let midia = null;
function aparelho(escuro) {
  if (escuro === null) { globalThis.matchMedia = undefined; midia = null; return; }
  const ouvintes = [];
  midia = {
    matches: escuro,
    addEventListener: (_t, fn) => ouvintes.push(fn),
    trocar(v) { midia.matches = v; ouvintes.forEach((fn) => fn({ matches: v })); },
  };
  globalThis.matchMedia = () => midia;
}

/* Transporte: cada pedido fica numa fila e o teste decide quando e como
   responder — é assim que se testa resposta fora de ordem. */
const rede = {
  pedidos: [],
  automatico: null,
  postar(corpo) {
    if (rede.automatico) return Promise.resolve(rede.automatico(corpo));
    return new Promise((resolver, rejeitar) => rede.pedidos.push({ corpo, resolver, rejeitar }));
  },
  endereco: () => "http://teste/exec",
  configurado: () => true,
  registrar: () => {},
};
globalThis.RAMAUI = { aviso() {}, avisoErro() {}, avisoAtencao() {}, marca: () => ({}), simbolo: () => ({}) };

for (const caminho of ARQUIVOS) {
  (0, eval)(await Deno.readTextFile(new URL("../" + caminho, import.meta.url)));
}
globalThis.RAMARede = rede;
/* O modelo dos temas (v2.36) não guarda estado: carregado uma vez. */
(0, eval)(await Deno.readTextFile(new URL("../js/tema-modelo.js", import.meta.url)));
const codigoTema = await Deno.readTextFile(new URL("../js/tema.js", import.meta.url));

/* Abre "uma página nova": documento limpo e tema.js carregado de novo. */
function abrirPagina({ escuro = false, conta = null } = {}) {
  document.documentElement = elementoFalso();
  metas = { "color-scheme": elementoFalso(), "theme-color": elementoFalso() };
  ouvintesGlobais = [];
  rede.pedidos = [];
  rede.automatico = null;
  aparelho(escuro);
  if (conta) {
    guardado.set("rama.sessao.agente", JSON.stringify({ id: conta, usuario: conta, nome: conta }));
    guardado.set("rama.sessao.token", "tk-" + conta);
  } else {
    guardado.delete("rama.sessao.agente");
    guardado.delete("rama.sessao.token");
  }
  (0, eval)(codigoTema);
  return globalThis.RAMATema;
}

const tela = () => document.documentElement.getAttribute("data-tema");
const esperar = () => new Promise((r) => setTimeout(r, 0));

/* ---------- coletor ---------- */

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
    const igual = Object.is(obtido, esperado);
    t.ok(nome, igual, igual ? "" : `obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`);
  },
};

/* =====================================================================
   RESOLUÇÃO
   ===================================================================== */

t.grupo("Preferência → tema efetivo");
let T = abrirPagina();
t.igual("sistema + aparelho escuro = escuro", T.resolver("sistema", true), "escuro");
t.igual("sistema + aparelho claro = claro", T.resolver("sistema", false), "claro");
t.igual("claro fixo ignora o aparelho", T.resolver("claro", true), "claro");
t.igual("escuro fixo ignora o aparelho", T.resolver("escuro", false), "escuro");
t.igual("valor estranho vale como sistema", T.resolver("roxo", true), "escuro");

t.grupo("Sem conta");
T = abrirPagina({ escuro: false });
t.igual("aparelho claro → tela clara", tela(), "claro");
t.igual("  preferência 'sistema'", T.preferencia(), "sistema");
t.igual("  color-scheme light no <html>", document.documentElement.style.colorScheme, "light");
t.igual("  meta color-scheme acompanha", metas["color-scheme"].getAttribute("content"), "light");
T = abrirPagina({ escuro: true });
t.igual("aparelho escuro → tela escura", tela(), "escuro");
t.igual("  meta theme-color com o fundo escuro", metas["theme-color"].getAttribute("content"), "#08080A");
T = abrirPagina({ escuro: null });
t.igual("aparelho sem prefers-color-scheme → claro", tela(), "claro");

t.grupo("O aparelho troca de tema com o site aberto");
T = abrirPagina({ escuro: false });
midia.trocar(true);
t.igual("em 'sistema', a tela acompanha", tela(), "escuro");
midia.trocar(false);
t.igual("  e volta", tela(), "claro");

/* =====================================================================
   CONTA, CACHE E SESSÃO
   ===================================================================== */

t.grupo("Cache por conta");
guardado.clear();
guardado.set("rama.tema.u1", "escuro");
T = abrirPagina({ escuro: false, conta: "u1" });
t.igual("o cache da conta antecipa o tema antes da sessão responder", tela(), "escuro");
midia.trocar(true); midia.trocar(false);
t.igual("  com tema fixo, o aparelho não manda", tela(), "escuro");
T = abrirPagina({ escuro: false, conta: "u2" });
t.igual("outra conta, sem cache, não herda o da u1", T.preferencia(), "sistema");
t.igual("  e a tela segue o aparelho", tela(), "claro");

t.grupo("A sessão traz o tema da conta");
guardado.clear();
T = abrirPagina({ escuro: true, conta: "u1" });
rede.automatico = (c) => c.acao === "sessao"
  ? { ok: true, agente: { id: "u1", usuario: "u1", nome: "U1", preferencias: { tema: "claro" } } }
  : { ok: true };
await RAMAAuth.retomar();
t.igual("retomar a sessão aplica o tema salvo (outro aparelho salvou 'claro')", tela(), "claro");
t.igual("  e guarda no cache da conta", guardado.get("rama.tema.u1"), "claro");
T = abrirPagina({ escuro: true, conta: "u1" });
t.igual("recarregar: o cache aplica antes da rede", tela(), "claro");

t.grupo("Trocar de conta");
T.sincronizarDaConta("u3", "escuro");
t.igual("entrar com outra conta aplica a dela", tela(), "escuro");
T.sincronizarDaConta("u1", undefined);
t.igual("voltar para a u1 sem tema na resposta (backend antigo) usa o cache da u1", tela(), "claro");
T.esquecerConta();
t.igual("sair: sem conta, vale o aparelho", T.preferencia(), "sistema");
t.igual("  tela escura (aparelho escuro)", tela(), "escuro");
t.igual("  o cache da conta fica para a próxima entrada", guardado.get("rama.tema.u1"), "claro");

/* =====================================================================
   SALVAR
   ===================================================================== */

t.grupo("Salvar na conta");
guardado.clear();
T = abrirPagina({ escuro: false, conta: "u1" });
T.sincronizarDaConta("u1", "sistema");
const estados = [];
T.aoMudar((i) => estados.push(i.estado));
T.salvar("escuro");
t.igual("a troca é na hora, antes da resposta", tela(), "escuro");
t.igual("  estado 'salvando'", T.estado(), "salvando");
await esperar();
t.igual("  um pedido só", rede.pedidos.length, 1);
t.ok("  manda só o tema, não o objeto inteiro",
  JSON.stringify(rede.pedidos[0].corpo.dados) === JSON.stringify({ preferencias: { tema: "escuro" } }));
rede.pedidos.shift().resolver({ ok: true, preferencias: { tema: "escuro" } });
await esperar();
t.igual("resposta certa → 'salvo'", T.estado(), "salvo");
t.igual("  cache da conta atualizado", guardado.get("rama.tema.u1"), "escuro");

t.grupo("Falha de rede não vira sucesso");
T.salvar("claro");
await esperar();
rede.pedidos.shift().resolver({ ok: false, erro: "rede" });
await esperar();
t.igual("falha → 'erro'", T.estado(), "erro");
t.igual("  a tela segue com a escolha", tela(), "claro");
t.igual("  o cache volta ao que a conta tem de fato", guardado.get("rama.tema.u1"), "escuro");
T.tentarDeNovo();
await esperar();
t.igual("tentar de novo manda o que está na tela", rede.pedidos[0].corpo.dados.preferencias.tema, "claro");
rede.pedidos.shift().rejeitar(new Error("caiu"));
await esperar();
t.igual("  promessa rejeitada também é 'erro'", T.estado(), "erro");
T.salvar("claro");
await esperar();
rede.pedidos.shift().resolver({ ok: true });
await esperar();
t.igual("backend antigo (sem preferências na resposta) não confirma", T.estado(), "erro");

t.grupo("Alternâncias rápidas");
guardado.clear();
T = abrirPagina({ escuro: false, conta: "u1" });
T.sincronizarDaConta("u1", "sistema");
T.salvar("claro");
T.salvar("escuro");
T.salvar("sistema");
await esperar();
t.igual("um pedido por vez", rede.pedidos.length, 1);
t.igual("a tela mostra a última escolha", T.preferencia(), "sistema");
rede.pedidos.shift().resolver({ ok: true, preferencias: { tema: "claro" } });
await esperar();
t.igual("a resposta velha não passa por cima da escolha nova", T.preferencia(), "sistema");
t.igual("  e só o último valor vai em seguida (o 'escuro' do meio nem sai)", rede.pedidos.length === 1 && rede.pedidos[0].corpo.dados.preferencias.tema, "sistema");
t.igual("  ainda 'salvando'", T.estado(), "salvando");
T.sincronizarDaConta("u1", "escuro");
t.igual("uma leitura de sessão no meio não desfaz a escolha", T.preferencia(), "sistema");
rede.pedidos.shift().resolver({ ok: true, preferencias: { tema: "sistema" } });
await esperar();
t.igual("fim: 'salvo'", T.estado(), "salvo");
t.igual("  cache com 'sistema' (a preferência, não o tema efetivo)", guardado.get("rama.tema.u1"), "sistema");

t.grupo("Troca de conta com salvamento a caminho");
T.salvar("escuro");
await esperar();
T.sincronizarDaConta("u2", undefined);
t.igual("a conta nova não vê o tema que a anterior está salvando", T.preferencia(), "sistema");
rede.pedidos.shift().resolver({ ok: true, preferencias: { tema: "escuro" } });
await esperar();
t.igual("  a resposta da anterior não muda a tela da nova", T.preferencia(), "sistema");
t.igual("  e não grava no cache da nova", guardado.has("rama.tema.u2"), false);
t.igual("  mas a anterior fica com o que a planilha confirmou", guardado.get("rama.tema.u1"), "escuro");

t.grupo("Outra aba da mesma conta");
guardado.clear();
T = abrirPagina({ escuro: false, conta: "u1" });
const storage = ouvintesGlobais.find((o) => o.tipo === "storage");
storage.fn({ key: "rama.tema.u1", newValue: "escuro" });
t.igual("salvar em outra aba troca esta", tela(), "escuro");
storage.fn({ key: "rama.tema.u9", newValue: "claro" });
t.igual("  o cache de outra conta não mexe aqui", tela(), "escuro");

/* =====================================================================
   PREFERÊNCIAS DE APRESENTAÇÃO (v2.35, js/preferencias.js)
   ===================================================================== */

const codigoPref = await Deno.readTextFile(new URL("../js/preferencias.js", import.meta.url));
function abrirPaginaPref(conta) {
  ouvintesGlobais = [];
  rede.pedidos = [];
  rede.automatico = null;
  if (conta) guardado.set("rama.sessao.agente", JSON.stringify({ id: conta, usuario: conta, nome: conta }));
  else guardado.delete("rama.sessao.agente");
  (0, eval)(codigoPref);
  return globalThis.RAMAPreferencias;
}

t.grupo("Exibição das pastas · padrão e cache por conta");
guardado.clear();
let PR = abrirPaginaPref(null);
t.igual("sem conta: Abas", PR.valor("exibicaoPastas"), "abas");
PR = abrirPaginaPref("u1");
t.igual("conta sem preferência registrada: Abas", PR.valor("exibicaoPastas"), "abas");
guardado.set("rama.pref.u1.exibicaoPastas", "icones");
PR = abrirPaginaPref("u1");
t.igual("o cache da conta antecipa a abertura", PR.valor("exibicaoPastas"), "icones");
guardado.set("rama.pref.u1.exibicaoPastas", "mosaico");
PR = abrirPaginaPref("u1");
t.igual("valor desconhecido no cache vira o padrão", PR.valor("exibicaoPastas"), "abas");

t.grupo("Exibição das pastas · a sessão traz a da conta");
guardado.clear();
abrirPagina({ conta: "u1" });
PR = abrirPaginaPref("u1");
rede.automatico = (c) => c.acao === "sessao"
  ? { ok: true, agente: { id: "u1", usuario: "u1", nome: "U1", preferencias: { tema: "escuro", exibicaoPastas: "icones" } } }
  : { ok: true };
await RAMAAuth.retomar();
t.igual("retomar a sessão aplica a exibição salva (outro aparelho escolheu Ícones)", PR.valor("exibicaoPastas"), "icones");
t.igual("  e guarda no cache da conta", guardado.get("rama.pref.u1.exibicaoPastas"), "icones");
t.igual("  o tema chega junto, sem se misturar", guardado.get("rama.tema.u1"), "escuro");
PR.sincronizarDaConta("u2", { tema: "claro" });
t.igual("outra conta, sem a chave (servidor antigo): o cache dela, não o da anterior", PR.valor("exibicaoPastas"), "abas");
PR.sincronizarDaConta("u1", {});
t.igual("voltar para a u1 sem a chave: o cache da u1", PR.valor("exibicaoPastas"), "icones");
PR.esquecerConta();
t.igual("sair: padrão", PR.valor("exibicaoPastas"), "abas");

t.grupo("Exibição das pastas · salvar na conta");
guardado.clear();
PR = abrirPaginaPref("u1");
PR.sincronizarDaConta("u1", { exibicaoPastas: "abas" });
PR.salvar("exibicaoPastas", "icones");
t.igual("a troca é na hora", PR.valor("exibicaoPastas"), "icones");
await esperar();
t.ok("manda só a chave mudada (o tema e o resto ficam no servidor)",
  JSON.stringify(rede.pedidos[0].corpo.dados) === JSON.stringify({ preferencias: { exibicaoPastas: "icones" } }));
rede.pedidos.shift().resolver({ ok: true, preferencias: { tema: "escuro", exibicaoPastas: "icones" } });
await esperar();
t.igual("resposta certa → 'salvo'", PR.estado("exibicaoPastas"), "salvo");
t.igual("  cache atualizado", guardado.get("rama.pref.u1.exibicaoPastas"), "icones");

PR.salvar("exibicaoPastas", "abas");
await esperar();
rede.pedidos.shift().resolver({ ok: false, erro: "sem_conexao" });
await esperar();
t.igual("falha → 'erro', e a tela segue com a escolha", [PR.estado("exibicaoPastas"), PR.valor("exibicaoPastas")].join(), "erro,abas");
t.igual("  o cache volta ao que a conta tem", guardado.get("rama.pref.u1.exibicaoPastas"), "icones");

PR.salvar("exibicaoPastas", "abas");
await esperar();
rede.pedidos.shift().resolver({ ok: false, erro: "dados_invalidos" });
await esperar();
t.igual("servidor anterior à v2.35 recusa a chave → 'local'", PR.estado("exibicaoPastas"), "local");
t.igual("  a escolha fica neste aparelho", guardado.get("rama.pref.u1.exibicaoPastas"), "abas");

t.grupo("Exibição das pastas · alternâncias rápidas");
PR.salvar("exibicaoPastas", "icones");
PR.salvar("exibicaoPastas", "abas");
PR.salvar("exibicaoPastas", "icones");
await esperar();
t.igual("um pedido por vez", rede.pedidos.length, 1);
rede.pedidos.shift().resolver({ ok: true, preferencias: { exibicaoPastas: "icones" } });
await esperar(); await esperar();
t.igual("a última escolha é a que vale (sem pedido extra quando já bate)", rede.pedidos.length, 0);
t.igual("  e a tela mostra a última", PR.valor("exibicaoPastas"), "icones");
PR.salvar("exibicaoPastas", "abas");
await esperar();
PR.sincronizarDaConta("u1", { exibicaoPastas: "icones" });
t.igual("uma leitura da sessão no meio não passa por cima da escolha nova", PR.valor("exibicaoPastas"), "abas");
rede.pedidos.shift().resolver({ ok: true, preferencias: { exibicaoPastas: "abas" } });
await esperar();

t.grupo("Exibição das pastas · outra aba");
PR = abrirPaginaPref("u1");
const storagePref = ouvintesGlobais.find((o) => o.tipo === "storage");
storagePref.fn({ key: "rama.pref.u1.exibicaoPastas", newValue: "icones" });
t.igual("outra aba da mesma conta trocou: esta acompanha", PR.valor("exibicaoPastas"), "icones");
storagePref.fn({ key: "rama.pref.u9.exibicaoPastas", newValue: "abas" });
t.igual("  outra conta não mexe aqui", PR.valor("exibicaoPastas"), "icones");

/* =====================================================================
   TEMAS PERSONALIZÁVEIS (v2.36): o modelo (js/tema-modelo.js)
   ===================================================================== */

const MT = globalThis.RAMATemaModelo;

t.grupo("Modelo · paletas iguais às de css/tokens.css");
{
  const css = await Deno.readTextFile(new URL("../css/tokens.css", import.meta.url));
  const bloco = (ini) => { const i = css.indexOf(ini); return css.slice(i, css.indexOf("}", i)); };
  const claro = bloco(":root {"), escuro = bloco(':root[data-tema="escuro"] {');
  const ler = (b, v) => { const m = new RegExp(v.replace(/[-]/g, "\\-") + ":\\s*([^;]+);").exec(b); return m ? m[1].trim().toLowerCase() : null; };
  const paraCss = (p) => p.alfa < 1 ? MT.cssCor(p.cor, p.alfa).replace(/\s/g, "") : p.cor;
  let divergentes = [];
  for (const base of ["claro", "escuro"]) {
    const b = base === "claro" ? claro : escuro;
    MT.TOKENS.forEach((tok) => {
      const p = MT.PALETAS[base][tok.chave];
      if (p.ref) return;
      const noCss = ler(b, tok.cor);
      if (noCss && noCss.replace(/\s/g, "") !== paraCss(p)) divergentes.push(base + ":" + tok.chave + " " + noCss + " ≠ " + paraCss(p));
    });
  }
  t.ok("toda propriedade com valor próprio confere com o CSS", divergentes.length === 0, divergentes.join(", "));
  const papeis = bloco("/* ---------- papéis (v2.36)");
  const faltam = MT.TOKENS.filter((tok) => !new RegExp(tok.cor.replace(/-/g, "\\-") + ":").test(css)).map((tok) => tok.cor);
  t.ok("toda variável do modelo existe em tokens.css", faltam.length === 0, faltam.join(", "));
  t.ok("os papéis novos seguem a paleta (nenhuma cor fixa)", !/#[0-9a-f]{3,6}/i.test(papeis.split("*/").slice(1).join("")));
}

t.grupo("Modelo · validação: só dados, nunca CSS");
{
  const tok = (k) => MT.token(k);
  t.igual("hex curto vira longo", MT.corValida("#AbC"), "#aabbcc");
  t.igual("url() é recusado", MT.corValida("url(x)"), null);
  t.igual("nome de cor é recusado", MT.corValida("red"), null);
  t.igual("expressão CSS é recusada", MT.normalizarValor(tok("fundo"), { tipo: "cor", cor: "#fff;background:url(x)" }), null);
  t.igual("tipo desconhecido é recusado", MT.normalizarValor(tok("fundo"), { tipo: "css", valor: "red" }), null);
  t.igual("gradiente em cor de texto é recusado", MT.normalizarValor(tok("texto"), { tipo: "linear", angulo: 0, pontos: [{ cor: "#000", pos: 0 }, { cor: "#fff", pos: 100 }] }), null);
  t.igual("texto não aceita transparência (fica opaco)", MT.normalizarValor(tok("texto"), { tipo: "cor", cor: "#123456", alfa: 0.2 }).alfa, 1);
  t.igual("preenchimento aceita transparência", MT.normalizarValor(tok("superficie"), { tipo: "cor", cor: "#123456", alfa: 0.25 }).alfa, 0.25);
  const nove = Array.from({ length: 9 }, (_, i) => ({ cor: "#000000", pos: i * 10 }));
  t.igual("gradiente com 9 pontos é recusado", MT.normalizarValor(tok("fundo"), { tipo: "linear", angulo: 0, pontos: nove }), null);
  t.igual("gradiente com 1 ponto é recusado", MT.normalizarValor(tok("fundo"), { tipo: "linear", angulo: 0, pontos: [{ cor: "#000", pos: 0 }] }), null);
  const lin = MT.normalizarValor(tok("fundo"), { tipo: "linear", angulo: 999, pontos: [{ cor: "#fff", pos: 120 }, { cor: "#000", pos: -5, alfa: 0.5 }] });
  t.ok("ângulo e posições são limitados e os pontos ordenados", lin.angulo === 360 && lin.pontos[0].pos === 0 && lin.pontos[1].pos === 100 && lin.pontos[0].alfa === 0.5);
  const rad = MT.normalizarValor(tok("cabecalho"), { tipo: "radial", forma: "circulo", x: 10, y: 90, pontos: [{ cor: "#fff", pos: 0 }, { cor: "#000", pos: 100 }] });
  t.ok("radial guarda forma e centro", rad.forma === "circulo" && rad.x === 10 && rad.y === 90);
  t.igual("forma desconhecida é recusada", MT.normalizarValor(tok("fundo"), { tipo: "radial", forma: "estrela", pontos: [{ cor: "#fff", pos: 0 }, { cor: "#000", pos: 100 }] }), null);
  const tema = MT.normalizarTema({ nome: "  <script>x</script>  ", base: "escuro", valores: { fundo: { tipo: "cor", cor: "#101010" }, inventada: { tipo: "cor", cor: "#fff" }, texto: { tipo: "cor", cor: "nada" } } }, false);
  t.ok("nome sem < > nem controle", !/[<>]/.test(tema.nome));
  t.ok("propriedade inventada e valor inválido ficam de fora; o válido fica", Object.keys(tema.valores).join() === "fundo");
  t.igual("base desconhecida recusa o tema", MT.normalizarTema({ base: "neon", valores: {} }, false), null);
  t.igual("tema da conta sem id é recusado", MT.normalizarTema({ base: "claro", valores: {} }, true), null);
  const muitos = Array.from({ length: 15 }, (_, i) => ({ id: "t-" + i, base: "claro", valores: {} }));
  t.igual("a lista fica no máximo de 12", MT.normalizarTemas(muitos).length, 12);
  t.igual("id repetido entra uma vez", MT.normalizarTemas([{ id: "a", base: "claro" }, { id: "a", base: "escuro" }]).length, 1);
  t.igual("aparência ausente = usar o tema da conta", MT.normalizarAparencia(undefined).modo, "conta");
  t.igual("aparência personalizada sem tema volta à conta", MT.normalizarAparencia({ modo: "personalizado" }).modo, "conta");
  t.igual("modo desconhecido volta à conta", MT.normalizarAparencia({ modo: "neon" }).modo, "conta");
  t.igual("digitar rgba() funciona", JSON.stringify(MT.lerCorDigitada("rgba(255, 0, 0, .5)")), JSON.stringify({ cor: "#ff0000", alfa: 0.5 }));
  t.igual("digitar lixo não", MT.lerCorDigitada("rgb(300,0,0)"), null);
}

t.grupo("Modelo · o tema da conta é do site inteiro, não de um sistema (v2.37)");
{
  const gerais = MT.tokensDe("geral");
  const ORDEM = /ordem|paranormal|sangue|morte|conhecimento|energia|medo|elemento|grau|pv\b|pe\b|san\b|vida|esfor|sanidade|nex|ritual|agente/i;
  t.ok("nenhuma propriedade geral fala de um sistema", gerais.every((tok) => !ORDEM.test(tok.rotulo)), gerais.filter((tok) => ORDEM.test(tok.rotulo)).map((tok) => tok.rotulo).join(", "));
  const catGerais = MT.categoriasDe("geral");
  t.ok("nenhuma categoria geral fala de um sistema", catGerais.every((c) => !ORDEM.test(c.rotulo + " " + c.ajuda)), catGerais.filter((c) => ORDEM.test(c.rotulo + " " + c.ajuda)).map((c) => c.rotulo).join(", "));
  t.ok("o tema da conta não tem categoria de Ordem", !catGerais.some((c) => c.sistema));
  t.ok("a ficha de Ordem ganha a categoria dela", MT.categoriasDe("ordem").some((c) => c.sistema === "ordem") && MT.tokensDe("ordem").some((tok) => tok.chave === "elementoSangue"));
  t.ok("a ficha universal não tem nada de Ordem", !MT.categoriasDe("universal").some((c) => c.sistema) && !MT.tokensDe("universal").some((tok) => tok.sistema));
  const comOrdem = { id: "t-misto00001", base: "escuro", valores: { fundo: { tipo: "cor", cor: "#101010" }, elementoSangue: { tipo: "cor", cor: "#ff0000" }, grau: { tipo: "cor", cor: "#00ff00" } } };
  t.igual("um tema da conta perde as cores de Ordem", Object.keys(MT.normalizarTemas([comOrdem])[0].valores).join(), "fundo");
  t.igual("  a ficha de Ordem as mantém", Object.keys(MT.normalizarAparencia({ modo: "personalizado", tema: comOrdem }, "ordem").tema.valores).sort().join(), "elementoSangue,fundo,grau");
  t.igual("  a ficha universal não", Object.keys(MT.normalizarAparencia({ modo: "personalizado", tema: comOrdem }, "universal").tema.valores).join(), "fundo");
  const daConta = MT.resolver(MT.normalizarTemas([comOrdem])[0]);
  t.igual("sem a cor própria, Ordem segue a base do tema (escuro)", daConta.vars["--cor-elemento-sangue"], "#b64a4a");
  const daFicha = MT.resolver(MT.normalizarAparencia({ modo: "personalizado", tema: comOrdem }, "ordem").tema);
  t.igual("  e na ficha de Ordem usa a escolhida", daFicha.vars["--cor-elemento-sangue"], "#ff0000");
  t.ok("as barras da mesa (PV, PE, SAN, status universais) não são personalizáveis", ["vida", "esforco", "sanidade", "azul", "verde", "cinza", "opacidadeBarra"].every((k) => !MT.token(k)));
}

t.grupo("Modelo · exportar e importar tema (.json)");
{
  const original = { id: "t-meu0000001", nome: "Roxo da mesa", base: "escuro", valores: {
    fundo: { tipo: "radial", forma: "circulo", x: 30, y: 70, pontos: [{ cor: "#08080a", pos: 0 }, { cor: "#3a1030", alfa: 0.8, pos: 100 }] },
    texto: { tipo: "cor", cor: "#f0e0ff" },
  } };
  const pacote = MT.exportarTema(original, "geral");
  t.ok("o arquivo é um pacote do R.A.M.A. do tipo tema", pacote.rama === true && pacote.tipo === "tema" && pacote.versaoTema === 1 && pacote.sistema === "geral");
  t.igual("  sem o id da conta", pacote.dados.id, undefined);
  const volta = MT.importarTema(JSON.stringify(pacote), "geral");
  t.ok("exportar e importar devolve o mesmo tema", volta.ok && JSON.stringify(volta.tema.valores) === JSON.stringify(MT.normalizarTema(original, false, "geral").valores) && volta.tema.nome === "Roxo da mesa" && volta.avisos.length === 0);
  t.igual("  o tema importado não traz id (vira um tema novo)", volta.tema.id, undefined);
  t.ok("JSON inválido é recusado com explicação", !MT.importarTema("{ quebrado", "geral").ok);
  t.ok("arquivo que não é do R.A.M.A. é recusado", !MT.importarTema(JSON.stringify({ tipo: "tema", versaoTema: 1, dados: original }), "geral").ok);
  t.ok("ficha exportada não entra como tema", /não é um tema/.test(MT.importarTema(JSON.stringify({ rama: true, tipo: "personagem", versaoFormato: 1, dados: {} }), "geral").problemas[0]));
  t.ok("versão mais nova é recusada", !MT.importarTema(Object.assign({}, pacote, { versaoTema: 99 }), "geral").ok);
  t.ok("arquivo grande demais é recusado antes de ler", !MT.importarTema(" ".repeat(210 * 1024), "geral").ok);
  const sujo = MT.importarTema({ rama: true, tipo: "tema", versaoTema: 1, dados: { nome: "<b>Mau</b>", base: "claro", valores: {
    fundo: { tipo: "cor", cor: "url(javascript:alert(1))" },
    superficie: { tipo: "cor", cor: "#ffffff;background:red" },
    link: { tipo: "cor", cor: "#123456" },
    estilo: "body{display:none}",
    elementoSangue: { tipo: "cor", cor: "#ff0000" },
  } } }, "geral");
  t.ok("CSS, url() e propriedades inventadas não entram; o válido entra", sujo.ok && Object.keys(sujo.tema.valores).join() === "link" && !/[<>]/.test(sujo.tema.nome));
  t.ok("  e a prévia avisa o que ficou de fora (inválidos, desconhecida, cor de Ordem, nome)", sujo.avisos.length === 4 && sujo.avisos.some((a) => /Ordem Paranormal/.test(a)));
  const deOrdem = { nome: "Elementos", base: "escuro", valores: { elementoSangue: { tipo: "cor", cor: "#ff0000" }, fundo: { tipo: "cor", cor: "#101010" } } };
  const pacoteOrdem = MT.exportarTema(deOrdem, "ordem");
  t.ok("o tema de uma ficha de Ordem exporta as cores de Ordem", pacoteOrdem.sistema === "ordem" && !!pacoteOrdem.dados.valores.elementoSangue);
  t.ok("  importado numa ficha de Ordem, elas ficam", !!MT.importarTema(pacoteOrdem, "ordem").tema.valores.elementoSangue);
  t.ok("  no tema da conta, ficam de fora com aviso", (() => { const r = MT.importarTema(pacoteOrdem, "geral"); return r.ok && !r.tema.valores.elementoSangue && !!r.tema.valores.fundo && r.avisos.length === 1; })());
  t.ok("  numa ficha universal, também", !MT.importarTema(pacoteOrdem, "universal").tema.valores.elementoSangue);
}

t.grupo("Modelo · o resolvedor");
{
  const vazio = MT.resolver({ base: "claro", valores: {} });
  t.igual("sem mudança, o fundo é o do claro", vazio.vars["--cor-fundo"], "#f4f4f1");
  t.igual("  e o botão principal é a cor do texto (como antes)", vazio.vars["--fundo-botao"], "#111114");
  t.ok("  todas as variáveis saem (contexto fechado)", MT.TOKENS.every((tok) => tok.cor in vazio.vars && (!tok.fundo || tok.fundo in vazio.vars)));
  const g = { tipo: "linear", angulo: 90, pontos: [{ cor: "#000000", pos: 0 }, { cor: "#ffffff", pos: 100 }] };
  const r = MT.resolver({ base: "claro", valores: { fundo: g, botao: { tipo: "radial", forma: "elipse", x: 50, y: 50, pontos: g.pontos } } });
  t.ok("o gradiente vai para o preenchimento", r.vars["--fundo-pagina"].startsWith("linear-gradient(90deg"));
  t.ok("  e o radial também", r.vars["--fundo-botao"].startsWith("radial-gradient(ellipse at 50% 50%"));
  const comGradienteEmCor = Object.keys(r.vars).filter((k) => k.startsWith("--cor-") && /gradient/.test(r.vars[k]));
  t.ok("nenhuma variável de cor recebe gradiente", comGradienteEmCor.length === 0, comGradienteEmCor.join());
  t.ok("  a cor sólida do fundo é a média do gradiente", /^#[0-9a-f]{6}$/.test(r.vars["--cor-fundo"]) && r.vars["--cor-fundo"] !== "#000000");
  t.ok("quem segue o fundo herda a cor sólida, não o gradiente", !/gradient/.test(r.vars["--fundo-cabecalho"]) && r.vars["--cor-campo"] === r.vars["--cor-fundo"]);
  t.ok("nenhum valor tem url(, ; ou { }", Object.values(r.vars).every((v) => !/url\(|;|[{}]/.test(v)));
  t.igual("fundo escuro → esquema dark", MT.resolver({ base: "claro", valores: { fundo: { tipo: "cor", cor: "#050505" } } }).esquema, "dark");
  const c = MT.avaliarContraste({ base: "claro", valores: { botaoTexto: { tipo: "cor", cor: "#777777" }, botao: { tipo: "linear", angulo: 0, pontos: [{ cor: "#111114", pos: 0 }, { cor: "#444444", pos: 100 }] } } });
  const btn = c.find((p) => p.frente === "botaoTexto");
  t.ok("contraste confere cada região do gradiente (a pior decide)", btn.regioes === 2 && !btn.ok && btn.onde === "100%");
  t.ok("  e sugere uma cor que passa nas duas, sem aplicar", btn.sugestao && MT.contraste(btn.sugestao, "#444444") >= 4.5 && MT.contraste(btn.sugestao, "#111114") >= 4.5);
  const impossivel = MT.avaliarContraste({ base: "claro", valores: { botao: { tipo: "linear", angulo: 0, pontos: [{ cor: "#111114", pos: 0 }, { cor: "#f4f4f1", pos: 100 }] } } }).find((p) => p.frente === "botaoTexto");
  t.ok("  do preto ao branco não há cor que sirva: sem sugestão falsa", !impossivel.ok && impossivel.sugestao === null);
  t.ok("os temas prontos passam em tudo", MT.avaliarContraste({ base: "claro", valores: {} }).every((p) => p.ok) && MT.avaliarContraste({ base: "escuro", valores: {} }).every((p) => p.ok));
  const novo = MT.novoTema("escuro");
  t.ok("tema novo a partir do escuro tem id e base escura", /^t-[a-z0-9]{10}$/.test(novo.id) && novo.base === "escuro");
  const copia = MT.novoTema(Object.assign({}, novo, { valores: { fundo: g } }), "Cópia");
  t.ok("copiar um tema gera id novo e valores independentes", copia.id !== novo.id && copia.valores.fundo !== g && copia.valores.fundo.pontos.length === 2);
}

/* =====================================================================
   TEMAS PERSONALIZÁVEIS: a resolução da página (js/tema.js)
   ===================================================================== */

const ESCURO_ROXO = { id: "t-roxo000001", nome: "Roxo", base: "escuro", valores: { fundo: { tipo: "linear", angulo: 180, pontos: [{ cor: "#08080a", pos: 0 }, { cor: "#3a1030", pos: 100 }] } } };
const CLARO_AZUL = { nome: "Azul", base: "claro", valores: { superficie: { tipo: "cor", cor: "#ddeeff", alfa: 1 } } };
const varRaiz = (v) => document.documentElement.style.getPropertyValue(v);

t.grupo("Tema personalizado da conta");
guardado.clear();
T = abrirPagina({ escuro: false, conta: "u1" });
T.sincronizarDaConta("u1", "personalizado", { temaAtivo: ESCURO_ROXO.id, temaPersonalizado: ESCURO_ROXO });
t.igual("a sessão traz o tema ativo e a página pinta com ele", varRaiz("--fundo-pagina").startsWith("linear-gradient"), true);
t.igual("  data-tema é a base (as regras de claro/escuro continuam valendo)", tela(), "escuro");
t.igual("  meta theme-color com a cor sólida do fundo", /^#[0-9a-f]{6}$/.test(metas["theme-color"].getAttribute("content")), true);
midia.trocar(true); midia.trocar(false);
t.igual("  o aparelho não muda um tema personalizado", varRaiz("--fundo-pagina").startsWith("linear-gradient"), true);
T = abrirPagina({ escuro: false, conta: "u1" });
t.igual("recarregar: o cache por conta pinta antes da rede", varRaiz("--fundo-pagina").startsWith("linear-gradient"), true);
T = abrirPagina({ escuro: false, conta: "u2" });
t.igual("outra conta não herda o tema personalizado da u1", varRaiz("--fundo-pagina"), "");
T.sincronizarDaConta("u1", "personalizado", { temaPersonalizado: ESCURO_ROXO });
T.sincronizarDaConta("u2", "claro", { temaPersonalizado: null });
t.igual("trocar de conta tira as variáveis da anterior", varRaiz("--fundo-pagina"), "");
t.igual("  e aplica a da nova", tela(), "claro");
T.sincronizarDaConta("u1", "personalizado", { temaPersonalizado: null });
t.igual("personalizado sem tema (apagado em outro lugar) cai no aparelho", tela(), "claro");

t.grupo("Prioridade: prévia → ficha → conta");
guardado.clear();
location.pathname = "/ficha/";
location.search = "?id=ficha-a";
T = abrirPagina({ escuro: true, conta: "u1" });
T.sincronizarDaConta("u1", "claro", {});
t.igual("ficha sem tema próprio (cache vazio): tema da conta", tela(), "claro");
t.igual("  origem 'conta'", T.escolha().origem, "conta");
T.definirFicha("ficha-a", { v: 1, modo: "personalizado", tema: ESCURO_ROXO });
t.igual("ficha com tema próprio manda", T.escolha().origem, "ficha");
t.igual("  pinta o tema da ficha", varRaiz("--fundo-pagina").startsWith("linear-gradient"), true);
t.ok("  e guarda no cache por conta e ficha", guardado.has("rama.tema.ficha.u1.ficha-a"));
T.definirPrevia({ modo: "personalizado", tema: CLARO_AZUL });
t.igual("a prévia do editor passa na frente", T.escolha().origem, "previa");
t.igual("  pinta o rascunho", varRaiz("--fundo-superficie"), "#ddeeff");
t.igual("  sem mexer no que está salvo", T.ficha().aparencia.modo, "personalizado");
T.definirPrevia(null);
t.igual("fechar o editor volta ao tema da ficha", varRaiz("--fundo-pagina").startsWith("linear-gradient"), true);
T.definirFicha("ficha-a", { v: 1, modo: "sistema" });
t.igual("ficha que segue o aparelho: escuro (aparelho escuro), mesmo com a conta clara", tela(), "escuro");
t.igual("  sem variáveis personalizadas sobrando", varRaiz("--fundo-pagina"), "");
midia.trocar(false);
t.igual("  e acompanha o aparelho ao vivo", tela(), "claro");
midia.trocar(true);
T.definirFicha("ficha-a", { v: 1, modo: "conta" });
t.igual("'usar o tema da conta' herda a conta de quem vê", tela(), "claro");
t.ok("  e sai do cache da ficha", !guardado.has("rama.tema.ficha.u1.ficha-a"));
T.definirFicha("ficha-a", { v: 1, modo: "escuro" });
T.sairDaFicha();
t.igual("sair da ficha devolve o tema da conta", tela(), "claro");
T.definirFicha("ficha-a", { v: 1, modo: "escuro" });
T = abrirPagina({ escuro: false, conta: "u1" });
t.igual("reabrir a ficha: o cache pinta o tema dela antes da rede", tela(), "escuro");
t.igual("  origem 'ficha'", T.escolha().origem, "ficha");
location.search = "?id=ficha-b";
T = abrirPagina({ escuro: false, conta: "u1" });
t.igual("outra ficha (outra aba) não herda o tema da primeira", T.escolha().origem, "conta");
location.search = "?id=ficha-a";
T = abrirPagina({ escuro: false, conta: "u2" });
t.igual("outra conta abrindo a mesma ficha não lê o cache da u1", T.escolha().origem, "conta");
location.pathname = "/personagens/";
location.search = "";
T = abrirPagina({ escuro: false, conta: "u1" });
t.igual("fora da ficha, o tema da ficha não vale", T.escolha().origem, "conta");
location.pathname = "/";

t.grupo("Aplicar num contexto (prévia do editor, janela)");
{
  T = abrirPagina({ escuro: false, conta: "u1" });
  const caixa = elementoFalso();
  const desfazer = T.aplicarEm(caixa, { modo: "personalizado", tema: ESCURO_ROXO });
  t.ok("o elemento recebe a lista inteira de variáveis", caixa.style.getPropertyValue("--cor-texto") !== "" && caixa.style.getPropertyValue("--fundo-pagina").startsWith("linear-gradient"));
  t.igual("  o <html> não muda", varRaiz("--fundo-pagina"), "");
  desfazer();
  t.igual("  e desfazer limpa", caixa.style.getPropertyValue("--cor-texto"), "");
  T.aplicarEm(caixa, { modo: "sistema" });
  t.igual("'sistema' num contexto usa a paleta do aparelho", caixa.style.getPropertyValue("--cor-fundo"), "#f4f4f1");
}

t.grupo("Salvar pelo editor");
guardado.clear();
T = abrirPagina({ escuro: false, conta: "u1" });
T.sincronizarDaConta("u1", "sistema", {});
let p1 = T.salvarConta({ tema: "personalizado", temaAtivo: ESCURO_ROXO.id, temas: [ESCURO_ROXO] });
await esperar();
t.ok("manda preferência, tema ativo e lista", (() => { const d = rede.pedidos[0].corpo.dados.preferencias; return d.tema === "personalizado" && d.temaAtivo === ESCURO_ROXO.id && d.temas.length === 1; })());
t.igual("  nada muda na tela antes da resposta", T.preferencia(), "sistema");
rede.pedidos.shift().resolver({ ok: false, erro: "dados_invalidos" });
let r1 = await p1;
t.ok("falha não vira sucesso", !r1.ok && T.estado() === "erro" && T.preferencia() === "sistema");
t.ok("  e o cache continua o de antes", !guardado.has("rama.tema.personalizado.u1"));
p1 = T.salvarConta({ tema: "personalizado", temaAtivo: ESCURO_ROXO.id, temas: [ESCURO_ROXO] });
const p2 = T.salvarConta({ tema: "claro", temaAtivo: null, temas: [ESCURO_ROXO] });
await esperar();
rede.pedidos[1].resolver({ ok: true, preferencias: { tema: "claro", temas: [ESCURO_ROXO] } });
const r2 = await p2;
rede.pedidos[0].resolver({ ok: true, preferencias: { tema: "personalizado", temaAtivo: ESCURO_ROXO.id, temas: [ESCURO_ROXO] } });
r1 = await p1;
rede.pedidos = [];
t.ok("a resposta mais nova vale", r2.ok && T.preferencia() === "claro");
t.ok("  a mais antiga, chegando depois, não passa por cima", r1.antigo && T.preferencia() === "claro" && tela() === "claro");
p1 = T.salvarConta({ tema: "personalizado", temaAtivo: ESCURO_ROXO.id, temas: [ESCURO_ROXO] });
await esperar();
rede.pedidos.shift().resolver({ ok: true, preferencias: { tema: "personalizado", temaAtivo: ESCURO_ROXO.id, temas: [ESCURO_ROXO] } });
r1 = await p1;
t.ok("sucesso: a conta passa a usar o tema e o cache guarda", r1.ok && T.preferencia() === "personalizado" && JSON.parse(guardado.get("rama.tema.personalizado.u1")).id === ESCURO_ROXO.id);
t.igual("  a página pinta com ele", varRaiz("--fundo-pagina").startsWith("linear-gradient"), true);
const storageT = ouvintesGlobais.find((o) => o.tipo === "storage");
guardado.set("rama.tema.personalizado.u1", JSON.stringify({ id: "t-outro00001", tema: Object.assign({}, CLARO_AZUL, { id: "t-outro00001" }) }));
storageT.fn({ key: "rama.tema.personalizado.u1" });
t.igual("outra aba editou o tema ativo: esta acompanha", varRaiz("--fundo-superficie"), "#ddeeff");

/* =====================================================================
   ESTILO DA INTERFACE (v2.49, js/interface.js): Legacy ou Modern20
   ===================================================================== */

const codigoInterface = await Deno.readTextFile(new URL("../js/interface.js", import.meta.url));
const estiloNaTela = () => document.documentElement.getAttribute("data-interface");
function abrirPaginaInterface(conta) {
  abrirPagina({ conta });
  (0, eval)(codigoInterface);
  return globalThis.RAMAInterface;
}

t.grupo("Estilo da interface · padrão e cache por conta");
guardado.clear();
let EI = abrirPaginaInterface(null);
t.igual("sem conta: Legacy", estiloNaTela(), "legacy");
EI = abrirPaginaInterface("u1");
t.igual("conta sem escolha: Legacy já na primeira pintura", estiloNaTela(), "legacy");
guardado.set("rama.interface.u1", "modern20");
EI = abrirPaginaInterface("u1");
t.igual("o cache da conta antecipa a abertura (Modern20 antes de a sessão responder)", estiloNaTela(), "modern20");
EI = abrirPaginaInterface("u2");
t.igual("outra conta no mesmo aparelho não herda o Modern20 da u1", estiloNaTela(), "legacy");
guardado.set("rama.interface.u1", "retro");
EI = abrirPaginaInterface("u1");
t.igual("valor desconhecido no cache vira Legacy", estiloNaTela(), "legacy");

t.grupo("Estilo da interface · a sessão traz o da conta");
guardado.clear();
EI = abrirPaginaInterface("u1");
rede.automatico = (c) => c.acao === "sessao"
  ? { ok: true, agente: { id: "u1", usuario: "u1", nome: "U1", preferencias: { tema: "escuro", exibicaoPastas: "icones", estiloInterface: "modern20" } } }
  : { ok: true };
await RAMAAuth.retomar();
t.igual("retomar a sessão aplica o estilo salvo (outro aparelho escolheu Modern20)", estiloNaTela(), "modern20");
t.igual("  e guarda no cache da conta", guardado.get("rama.interface.u1"), "modern20");
t.ok("  o tema chega junto, sem se misturar", guardado.get("rama.tema.u1") === "escuro" && tela() === "escuro");
EI.sincronizarDaConta("u2", { tema: "claro" });
t.igual("outra conta, sem a chave (servidor antigo): o cache dela, não o da anterior", estiloNaTela(), "legacy");
EI.sincronizarDaConta("u1", {});
t.igual("voltar para a u1 sem a chave: o cache da u1", estiloNaTela(), "modern20");
EI.sincronizarDaConta("u1", { estiloInterface: "retro" });
t.igual("valor desconhecido vindo da sessão é ignorado", estiloNaTela(), "modern20");
await RAMAAuth.sair();
t.igual("sair: Legacy", estiloNaTela(), "legacy");
t.igual("  sem apagar o cache da conta", guardado.get("rama.interface.u1"), "modern20");

t.grupo("Estilo da interface · salvar na conta");
guardado.clear();
EI = abrirPaginaInterface("u1");
EI.sincronizarDaConta("u1", { estiloInterface: "legacy" });
let pEstilo = EI.salvar("modern20");
t.igual("a troca é na hora", estiloNaTela(), "modern20");
await esperar();
t.ok("manda só a chave do estilo (tema e temas ficam no servidor)",
  JSON.stringify(rede.pedidos[0].corpo.dados) === JSON.stringify({ preferencias: { estiloInterface: "modern20" } }));
t.igual("  enquanto isso: 'salvando'", EI.estado(), "salvando");
rede.pedidos.shift().resolver({ ok: true, preferencias: { tema: "sistema", estiloInterface: "modern20" } });
let rEstilo = await pEstilo;
t.ok("resposta certa → 'salvo'", rEstilo.ok && rEstilo.estado === "salvo" && EI.estado() === "salvo");
t.igual("  cache atualizado", guardado.get("rama.interface.u1"), "modern20");

pEstilo = EI.salvar("legacy");
await esperar();
rede.pedidos.shift().resolver({ ok: false, erro: "sem_conexao" });
rEstilo = await pEstilo;
t.ok("falha → 'erro', nunca 'salvo'", !rEstilo.ok && EI.estado() === "erro");
t.ok("  a tela e o cache voltam ao que a conta tem", estiloNaTela() === "modern20" && guardado.get("rama.interface.u1") === "modern20");

pEstilo = EI.salvar("legacy");
await esperar();
rede.pedidos.shift().resolver({ ok: true, preferencias: { tema: "sistema" } });
rEstilo = await pEstilo;
t.ok("resposta 'ok' sem o estilo gravado também não é sucesso", !rEstilo.ok && estiloNaTela() === "modern20");

pEstilo = EI.salvar("legacy");
await esperar();
rede.pedidos.shift().resolver({ ok: false, erro: "dados_invalidos" });
rEstilo = await pEstilo;
t.ok("servidor anterior à v2.49 recusa a chave → 'local', e a escolha fica neste aparelho",
  rEstilo.ok && rEstilo.estado === "local" && estiloNaTela() === "legacy" && guardado.get("rama.interface.u1") === "legacy");

t.grupo("Estilo da interface · escolhas rápidas");
guardado.clear();
EI = abrirPaginaInterface("u1");
EI.sincronizarDaConta("u1", { estiloInterface: "legacy" });
const pA = EI.salvar("modern20");
const pB = EI.salvar("legacy");
const pC = EI.salvar("modern20");
await esperar();
t.igual("um pedido por vez", rede.pedidos.length, 1);
t.igual("  a tela já mostra a última escolha", estiloNaTela(), "modern20");
rede.pedidos.shift().resolver({ ok: true, preferencias: { estiloInterface: "modern20" } });
const [rA, rB, rC] = await Promise.all([pA, pB, pC]);
t.igual("a última escolha é a que vale (sem pedido extra quando já bate)", rede.pedidos.length, 0);
t.ok("  as três esperas recebem o mesmo fim", rA.ok && rB.ok && rC.ok && EI.preferencia() === "modern20");
pEstilo = EI.salvar("legacy");
await esperar();
EI.sincronizarDaConta("u1", { estiloInterface: "modern20" });
t.igual("uma leitura da sessão no meio não passa por cima da escolha nova", estiloNaTela(), "legacy");
pEstilo = EI.salvar("modern20");
rede.pedidos.shift().resolver({ ok: true, preferencias: { estiloInterface: "legacy" } });
await esperar(); await esperar();
t.igual("resposta antiga (legacy) chega depois da escolha nova: vai outro pedido com a nova", rede.pedidos.length, 1);
t.igual("  e a tela não volta para a antiga", estiloNaTela(), "modern20");
rede.pedidos.shift().resolver({ ok: true, preferencias: { estiloInterface: "modern20" } });
rEstilo = await pEstilo;
t.ok("  no fim: 'salvo' com a nova", rEstilo.ok && EI.confirmado() === "modern20" && guardado.get("rama.interface.u1") === "modern20");

t.grupo("Estilo da interface · prévia do editor");
guardado.clear();
EI = abrirPaginaInterface("u1");
EI.sincronizarDaConta("u1", { estiloInterface: "legacy" });
EI.definirPrevia("modern20");
t.ok("a prévia muda a tela, não a preferência", estiloNaTela() === "modern20" && EI.preferencia() === "legacy");
t.igual("  e não manda nada ao servidor", rede.pedidos.length, 0);
t.igual("  nem grava no cache", guardado.get("rama.interface.u1"), "legacy");
EI.definirPrevia(null);
t.igual("cancelar: volta ao confirmado", estiloNaTela(), "legacy");
EI.definirPrevia("retro");
t.igual("prévia desconhecida é ignorada", estiloNaTela(), "legacy");

t.grupo("Estilo da interface · troca de conta com salvamento a caminho");
guardado.clear();
EI = abrirPaginaInterface("u1");
EI.sincronizarDaConta("u1", { estiloInterface: "legacy" });
pEstilo = EI.salvar("modern20");
await esperar();
EI.sincronizarDaConta("u2", { estiloInterface: "legacy" });
rede.pedidos.shift().resolver({ ok: true, preferencias: { estiloInterface: "modern20" } });
rEstilo = await pEstilo;
t.ok("a resposta da u1 não pinta a tela da u2", estiloNaTela() === "legacy" && EI.conta() === "u2");
t.igual("  mas fica no cache da u1", guardado.get("rama.interface.u1"), "modern20");

t.grupo("Estilo da interface · outra aba");
EI = abrirPaginaInterface("u1");
const storageEI = ouvintesGlobais.filter((o) => o.tipo === "storage").pop();
storageEI.fn({ key: "rama.interface.u1", newValue: "legacy" });
t.igual("outra aba da mesma conta trocou: esta acompanha", estiloNaTela(), "legacy");
storageEI.fn({ key: "rama.interface.u9", newValue: "modern20" });
t.igual("  outra conta não mexe aqui", estiloNaTela(), "legacy");
t.ok("trocar o estilo não mexe no tema da conta", tela() === "claro" && !guardado.has("rama.tema.u1"));

/* =====================================================================
   DENSIDADE (v5.2, js/densidade.js): Confortável ou Compacta
   ===================================================================== */

const codigoDensidade = await Deno.readTextFile(new URL("../js/densidade.js", import.meta.url));
const densidadeNaTela = () => document.documentElement.getAttribute("data-densidade");
function abrirPaginaDensidade(conta) {
  abrirPaginaInterface(conta);
  (0, eval)(codigoDensidade);
  return globalThis.RAMADensidade;
}

t.grupo("Densidade · preferência deste aparelho, antes da primeira pintura");
guardado.clear();
let DS = abrirPaginaDensidade(null);
t.igual("sem escolha: Confortável (a apresentação de sempre)", densidadeNaTela(), "confortavel");
guardado.set("rama.pref.densidade", "compacta");
DS = abrirPaginaDensidade("u1");
t.igual("a escolha guardada vale já ao abrir a página", densidadeNaTela(), "compacta");
DS = abrirPaginaDensidade("u2");
t.igual("  e é do aparelho, não da conta: outra conta no mesmo navegador vê igual", densidadeNaTela(), "compacta");
guardado.set("rama.pref.densidade", "minuscula");
DS = abrirPaginaDensidade(null);
t.igual("valor desconhecido vira Confortável", densidadeNaTela(), "confortavel");
guardado.clear();
DS = abrirPaginaDensidade("u1");
rede.pedidos = [];
DS.definir("compacta");
t.ok("trocar é na hora e grava neste aparelho", densidadeNaTela() === "compacta" && guardado.get("rama.pref.densidade") === "compacta");
t.igual("  sem nenhum pedido ao servidor", rede.pedidos.length, 0);
t.ok("  sem mexer no estilo nem no tema", document.documentElement.getAttribute("data-interface") === "legacy" && !guardado.has("rama.interface.u1") && !guardado.has("rama.tema.u1"));
DS.definir("confortavel");
t.igual("e volta (reversível)", densidadeNaTela(), "confortavel");
const storageDS = ouvintesGlobais.filter((o) => o.tipo === "storage").pop();
storageDS.fn({ key: "rama.pref.densidade", newValue: "compacta" });
t.igual("outra aba deste navegador trocou: esta acompanha", densidadeNaTela(), "compacta");
storageDS.fn({ key: "rama.interface.u1", newValue: "modern20" });
t.igual("  outra chave não mexe na densidade", densidadeNaTela(), "compacta");

t.grupo("Densidade · as páginas e a folha");
{
  const PAGINAS = ["index.html", "personagens/index.html", "campanhas/index.html", "campanha/index.html", "ficha/index.html", "homebrew/index.html", "perfil/index.html"];
  const ruins = [], semFolha = [];
  for (const p of PAGINAS) {
    const html = await Deno.readTextFile(new URL("../" + p, import.meta.url));
    const iInterface = html.indexOf("js/interface.js"), iDens = html.indexOf("js/densidade.js"), iCss = html.indexOf('rel="stylesheet"');
    if (!(iDens > iInterface && iDens < iCss)) ruins.push(p);
    const folhas = [...html.matchAll(/href="(?:\.\.\/)?css\/((?:modern20\/)?[a-z0-9]+)\.css"/g)].map((m) => m[1]);
    if (folhas.slice(-2).join(",") !== "densidade,modern20/densidade") semFolha.push(p);
  }
  t.ok("toda página aplica a densidade no <head>, depois do estilo e antes das folhas", ruins.length === 0, ruins.join(", "));
  t.ok("  e carrega a folha da densidade por último (com a par do Modern20)", semFolha.length === 0, semFolha.join(", "));
  const css = (await Deno.readTextFile(new URL("../css/densidade.css", import.meta.url))).replace(/\/\*[\s\S]*?\*\//g, "");
  t.ok("a compactação não usa zoom, transform nem fonte menor", !/\bzoom\s*:|transform\s*:|font-size\s*:|--texto-[a-z]+\s*:/.test(css));
  t.ok("  nem muda os tokens de espaço (--e1…--e8)", !/--e\d\s*:/.test(css));
  t.ok("  e o alvo de toque só diminui com ponteiro fino", /@media \(pointer: fine\)\s*\{\s*:root\[data-densidade="compacta"\] \{ --alvo-toque: 32px; \}/.test(css) &&
    (css.match(/--alvo-toque\s*:/g) || []).length === 1);
  const seletores = css.split("}").map((b) => b.split("{")[0].trim()).filter((s) => s && !/^@media/.test(s));
  t.ok("  toda regra presa a :root[data-densidade=\"compacta\"] (Confortável fica intocado)",
    seletores.every((s) => s.split(",").every((x) => x.trim().indexOf(':root[data-densidade="compacta"]') === 0)), seletores.filter((s) => s.indexOf(':root[data-densidade="compacta"]') !== 0).slice(0, 3).join(" | "));
}

t.grupo("Estilo da interface · as páginas e o isolamento das folhas");
{
  const PAGINAS = ["index.html", "personagens/index.html", "campanhas/index.html", "campanha/index.html", "ficha/index.html", "homebrew/index.html", "perfil/index.html"];
  const semPares = [], foraDeOrdem = [];
  for (const p of PAGINAS) {
    const html = await Deno.readTextFile(new URL("../" + p, import.meta.url));
    const iTema = html.indexOf("js/tema.js"), iInterface = html.indexOf("js/interface.js"), iCss = html.indexOf('rel="stylesheet"');
    if (!(iTema >= 0 && iInterface > iTema && iInterface < iCss)) foraDeOrdem.push(p);
    const legado = [...html.matchAll(/href="(?:\.\.\/)?css\/([a-z]+)\.css"/g)].map((m) => m[1]).filter((n) => n !== "interface");
    /* A par do Modern20 vem LOGO DEPOIS da folha do Legacy: assim um
       modificador de uma folha seguinte (ficha.css, campanha.css) continua
       valendo sobre o componente de base. */
    const folhas = [...html.matchAll(/href="(?:\.\.\/)?css\/((?:modern20\/)?[a-z]+)\.css"/g)].map((m) => m[1]).filter((n) => n !== "interface");
    legado.forEach((n) => {
      const i = folhas.indexOf(n);
      if (folhas[i + 1] !== "modern20/" + n) semPares.push(p + ":" + n);
    });
  }
  t.ok("toda página aplica o estilo no <head>, depois do tema e antes das folhas", foraDeOrdem.length === 0, foraDeOrdem.join(", "));
  t.ok("toda folha do Legacy carregada tem a sua par do Modern20, logo depois dela", semPares.length === 0, semPares.join(", "));

  const LEGADO = ["tokens", "base", "componentes", "layout", "home", "ficha", "campanha"];
  const vazou = [];
  for (const n of LEGADO) {
    const css = await Deno.readTextFile(new URL("../css/" + n + ".css", import.meta.url));
    if (/data-interface|modern20/.test(css)) vazou.push(n);
  }
  t.ok("as folhas do Legacy não sabem que o Modern20 existe", vazou.length === 0, vazou.join(", "));

  /* Cada regra de css/modern20 mora dentro de :root[data-interface="modern20"]
     — com :where(), sem peso, nas folhas de componente — ou de um @media que
     só contém blocos assim; fora disso, só @keyframes com prefixo m20-. É o
     que impede o Modern20 de vazar para o Legacy. */
  const RAIZES = [':root[data-interface="modern20"]', ':where(:root[data-interface="modern20"])'];
  function blocos(css) {
    const lista = [];
    let i = 0;
    while (i < css.length) {
      const abre = css.indexOf("{", i);
      if (abre < 0) { if (css.slice(i).trim()) lista.push({ preludio: css.slice(i).trim(), corpo: null }); break; }
      const preludio = css.slice(i, abre).trim();
      let nivel = 1, j = abre + 1;
      while (j < css.length && nivel) { if (css[j] === "{") nivel++; else if (css[j] === "}") nivel--; j++; }
      lista.push({ preludio, corpo: css.slice(abre + 1, j - 1) });
      i = j;
    }
    return lista;
  }
  function soltas(css) {
    const ruins = [];
    for (const b of blocos(css)) {
      if (b.corpo === null) { ruins.push(b.preludio.slice(0, 40)); continue; }
      if (RAIZES.includes(b.preludio)) continue;
      if (/^@keyframes m20-[a-z0-9-]+$/.test(b.preludio)) continue;
      if (/^@media\b/.test(b.preludio) || /^@supports\b/.test(b.preludio)) { ruins.push(...soltas(b.corpo)); continue; }
      ruins.push(b.preludio.slice(0, 60));
    }
    return ruins;
  }
  const pasta = new URL("../css/modern20/", import.meta.url);
  const arquivos = [];
  for await (const e of Deno.readDir(pasta)) if (e.name.endsWith(".css")) arquivos.push(e.name);
  t.ok("css/modern20 tem a par de cada folha do Legacy", LEGADO.every((n) => arquivos.includes(n + ".css")), arquivos.join(", "));
  const fora = [];
  for (const a of arquivos) {
    const css = (await Deno.readTextFile(new URL(a, pasta))).replace(/\/\*[\s\S]*?\*\//g, "");
    soltas(css).forEach((r) => fora.push(a + ": " + r));
  }
  t.ok("nenhuma regra do Modern20 fica fora de :root[data-interface=\"modern20\"]", fora.length === 0, fora.slice(0, 5).join(" | "));
  const importantes = [];
  for (const a of arquivos) {
    const n = ((await Deno.readTextFile(new URL(a, pasta))).match(/!important/g) || []).length;
    if (n) importantes.push(a + ": " + n);
  }
  t.ok("o Modern20 não usa !important", importantes.length === 0, importantes.join(", "));
}

t.grupo("Aparência num lugar só (v2.49.1): o editor, não Exibição");
{
  const perfil = await Deno.readTextFile(new URL("../js/paginas/perfil.js", import.meta.url));
  const editor = await Deno.readTextFile(new URL("../js/tema-editor.js", import.meta.url));
  const app = await Deno.readTextFile(new URL("../js/app.js", import.meta.url));
  const css = await Deno.readTextFile(new URL("../css/interface.css", import.meta.url));
  t.ok("Exibição não repete o lápis: sem \"Outros temas…\" nem \"Trocar estilo…\"", !/Outros temas…|Trocar estilo…/.test(perfil));
  t.ok("  nem a caixa do efeito de tela antiga", !/definirEfeitos|Efeito de tela antiga/.test(perfil));
  t.ok("  o lápis continua abrindo o editor da conta", /onclick: abrirTema/.test(perfil) && /contexto: "conta"/.test(perfil));
  t.ok("o efeito é um interruptor (role=switch) na célula do Legacy", /function chaveDoEfeito\(\)/.test(editor) && /role: "switch"/.test(editor.slice(editor.indexOf("function chaveDoEfeito"))) && /v === "legacy" \? chaveDoEfeito\(\)/.test(editor));
  t.ok("  entra na foto do rascunho (Desfazer e \"Fechar janela?\" o veem)", /estilo: estilo, efeitos: efeitos/.test(editor));
  t.ok("  fechar sem salvar devolve o que o aparelho guarda", /if \(A\) A\.previaEfeitos\(null\)/.test(editor));
  t.ok("  Salvar grava neste aparelho, sem pedido ao servidor só por ele", /if \(efeitosMudou\) A\.definirEfeitos\(efeitos\)/.test(editor) && /\(!estiloMudou && !efeitosMudou\)/.test(editor));
  t.ok("app.js expõe a prévia do efeito, que não grava", /previaEfeitos: previaEfeitos/.test(app) && !/gravarPref/.test(app.slice(app.indexOf("function previaEfeitos"), app.indexOf("function definirEscala"))));
  t.ok("a miniatura do Legacy perde as linhas com o efeito desligado", /\.estilo-previa--legacy\.estilo-previa--sem-efeito \{ background-image: none; \}/.test(css));
}

{
  /* A prévia do efeito, executada: mostra sem gravar e null volta ao guardado. */
  const fonte = await Deno.readTextFile(new URL("../js/app.js", import.meta.url));
  const corpo = fonte.slice(fonte.indexOf("function previaEfeitos"), fonte.indexOf("function definirEscala"));
  const html = { dataset: { efeitos: "on" } };
  let aplicadas = 0;
  const previa = new Function("document", "aplicarPreferencias", corpo + "; return previaEfeitos;")({ documentElement: html }, () => { aplicadas++; html.dataset.efeitos = "on"; });
  previa(false);
  t.igual("previaEfeitos(false) desliga só na tela", html.dataset.efeitos, "off");
  previa(null);
  t.ok("  previaEfeitos(null) volta ao que o aparelho guarda", html.dataset.efeitos === "on" && aplicadas === 1);
}

t.grupo("Depois de uma atualização, o histórico primeiro (v2.49.2)");
{
  const fonte = await Deno.readTextFile(new URL("../js/app.js", import.meta.url));
  const corpo = fonte.slice(fonte.indexOf("function novidadesDaVersao"), fonte.indexOf("/* =================================================================\n     CABEÇALHO DE PÁGINA"));
  function aparelho(guardada, quebrado) {
    const mapa = new Map(guardada ? [["rama.versao.vista", guardada]] : []);
    const ls = {
      getItem: (k) => { if (quebrado) throw new Error("bloqueado"); return mapa.has(k) ? mapa.get(k) : null; },
      setItem: (k, v) => { if (quebrado) throw new Error("bloqueado"); mapa.set(k, v); },
    };
    const abertos = [];
    const fn = new Function("global", "localStorage", "CHAVE_VERSAO_VISTA", "abrirChangelog", corpo + "; return novidadesDaVersao;")(
      { RAMAVersion: { numero: "9.9.9" } }, ls, "rama.versao.vista", (o) => abertos.push(o));
    return { fn, mapa, abertos };
  }
  let a = aparelho("9.9.8");
  a.fn();
  t.ok("versão nova neste aparelho: abre o histórico como novidade", a.abertos.length === 1 && a.abertos[0].novidade === true);
  t.igual("  e marca como visto", a.mapa.get("rama.versao.vista"), "9.9.9");
  a.fn();
  t.igual("  a próxima página não abre de novo", a.abertos.length, 1);
  a = aparelho(null);
  a.fn();
  t.igual("aparelho sem registro (primeira visita ou primeira versão com o aviso): abre", a.abertos.length, 1);
  a = aparelho("9.9.9");
  a.fn();
  t.igual("versão já vista: não abre", a.abertos.length, 0);
  a = aparelho(null, true);
  a.fn();
  t.igual("sem armazenamento: não abre (senão abriria em toda página)", a.abertos.length, 0);
  t.ok("só com a casca: a ficha embutida no combate não avisa", /if \(!o\.semCasca\) novidadesDaVersao\(\);/.test(fonte));
  t.ok("o número no rodapé abre o histórico comum, não o aviso", /onclick: function \(\) \{ abrirChangelog\(\); \}/.test(fonte));
}

/* ---------- fim ---------- */

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falhas.length) {
  console.log(`\n${VERMELHO}Falhou:${FIM}`);
  falhas.forEach((f) => console.log(`  · ${f}`));
}
Deno.exit(falharam ? 1 : 0);
