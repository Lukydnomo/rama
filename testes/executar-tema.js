/* =====================================================================
   R.A.M.A. — testes do tema claro/escuro (v2.25)
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
  return {
    attrs, style: {},
    setAttribute(k, v) { attrs[k] = String(v); },
    getAttribute(k) { return k in attrs ? attrs[k] : null; },
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

/* ---------- fim ---------- */

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falhas.length) {
  console.log(`\n${VERMELHO}Falhou:${FIM}`);
  falhas.forEach((f) => console.log(`  · ${f}`));
}
Deno.exit(falharam ? 1 : 0);
