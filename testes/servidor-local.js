/* =====================================================================
   R.A.M.A. — servidor local de teste e medição (v2.46)
   ---------------------------------------------------------------------
       deno run --allow-read --allow-net --allow-env testes/servidor-local.js [--porta 8124] [--backend pasta] [--site pasta]

   --backend e --site aceitam caminho absoluto: é assim que uma versão
   anterior guardada (git archive) é servida lado a lado com a atual,
   para medir as duas com o mesmo roteiro. Arquivos que a pasta de
   --site não tiver vêm da raiz do projeto.

   O backend de verdade (os .gs) dentro do simulador do Apps Script, e os
   arquivos do site servidos como o GitHub Pages serviria — com o
   endereço da API trocado para este servidor. Dados SINTÉTICOS, criados
   na partida; nada sai desta máquina e nada é gravado em disco.

   CONTAS (senha "senha-de-teste")
     dona       dona das duas fichas e jogadora da mesa
     editora    recebeu a ficha de Ordem como Editor
     leitora    recebeu a ficha de Ordem como Leitor
     mestre     mestre da campanha em que a ficha de Ordem está

   ROTAS DE APOIO (só existem aqui)
     /__entrar?conta=…&para=…   abre a sessão da conta sem o formulário
     /__ids                     ids das fichas e da campanha
     /__como?conta=…  (POST)    age como outra conta, direto no backend
     /__backend                 contadores do backend (chamadas ao Sheets,
                                células, leituras) desde a partida
     /__backend/zerar           zera esses contadores
     /__feedback?modo=…         o Discord SIMULADO do feedback: ok, 429,
                                500, 404, rede ou sem-webhook (padrão:
                                sem-webhook, como uma implantação nova);
                                devolve as mensagens que ele "recebeu"

   Não é a implantação: a planilha é um array em memória, sem latência.
   Serve para conferir comportamento e CONTAR o que acontece — nunca
   para medir tempo do Google.
   ===================================================================== */

import { instalarAmbiente, chamar } from "./apps-script-simulado.js";
import { fichasParaMedir } from "./medicao-fichas.js";

const RAIZ = new URL("../", import.meta.url);
function argumento(nome, padrao) {
  const i = Deno.args.indexOf(nome);
  return i >= 0 && Deno.args[i + 1] ? Deno.args[i + 1] : padrao;
}
const PORTA = Number(argumento("--porta", "8124"));
const PASTA_BACKEND = argumento("--backend", "backend");
const PASTA_SITE = argumento("--site", "");
const absoluto = (p) => /^([A-Za-z]:[\\/]|\/)/.test(p);
const urlDaPasta = (p) => absoluto(p) ? new URL("file:///" + p.replace(/\\/g, "/").replace(/^\//, "") + "/") : new URL(p + "/", RAIZ);

/* As fichas são montadas ANTES do backend: o motor do site e os .gs
   dividem o escopo global, e o conversor precisa do motor inteiro. */
const fichas = await fichasParaMedir();

const ambiente = instalarAmbiente(globalThis);
/* O núcleo é obrigatório; os arquivos de sistema e os opcionais, não —
   um backend de versão anterior (para comparar) não os tem. */
const NUCLEO = ["Dados.gs", "Codigo.gs", "Campanhas.gs"];
for (const arq of NUCLEO.concat(["Sistemas.gs", "Ordem.gs", "Universal.gs", "Oblivio.gs", "Cris.gs", "Feedback.gs"])) {
  try {
    (0, eval)(await Deno.readTextFile(new URL(arq, urlDaPasta(PASTA_BACKEND))));
  } catch (e) {
    if (NUCLEO.includes(arq)) throw e;
  }
}

/* O Discord do feedback, SIMULADO: nada sai desta máquina. O endereço
   abaixo só tem o formato de um webhook; não existe. */
const WEBHOOK_SIMULADO = "https://discord.com/api/webhooks/000000000000000000/simulado-local-nao-existe-0000";
const discord = { modo: "sem-webhook", recebidas: [] };
globalThis.UrlFetchApp = {
  fetch(endereco, opcoes) {
    if (discord.modo === "rede") throw new Error("Address unavailable: " + endereco);
    const status = { ok: 200, "429": 429, "500": 500, "404": 404 }[discord.modo] || 200;
    if (status === 200) discord.recebidas.push({ corpo: JSON.parse(opcoes.payload) });
    const corpo = status === 200 ? JSON.stringify({ id: String(discord.recebidas.length) }) : status === 429 ? JSON.stringify({ retry_after: 3.2 }) : "{}";
    return { getResponseCode: () => status, getContentText: () => corpo, getHeaders: () => ({}) };
  },
};
ambiente.propriedades.set("RAMA_ITERACOES", "50");
setupRama();
gerarPepper();

const contas = {};
for (const nome of ["dona", "editora", "leitora", "mestre"]) {
  criarUsuario(nome, nome[0].toUpperCase() + nome.slice(1), "senha-de-teste");
  const r = chamar(globalThis, { acao: "login", usuario: nome, senha: "senha-de-teste" });
  contas[nome] = { token: r.token, id: r.agente.id };
}
const como = (c) => (corpo) => chamar(globalThis, Object.assign({ token: contas[c].token }, corpo));

const ordem = como("dona")({ acao: "criar_personagem", dados: fichas.ordem }).dados.id;
const universal = como("dona")({ acao: "criar_personagem", dados: fichas.universal }).dados.id;
const campanha = como("mestre")({ acao: "criar_campanha", dados: { sistema: "ordem", nome: "Mesa de medição", visibilidade: "privado" } }).dados.id;
como("mestre")({ acao: "salvar_participantes", campanhaId: campanha, membros: [
  { userId: contas.dona.id, papel: "jogador" }, { userId: contas.editora.id, papel: "jogador" },
] });
como("dona")({ acao: "vincular_personagem", campanhaId: campanha, personagemId: ordem });
const lista = como("dona")({ acao: "listar_compartilhamentos", personagemId: ordem });
if (lista.ok) {
  como("dona")({ acao: "salvar_compartilhamentos", personagemId: ordem, versao: lista.dados.versao, acessos: [
    { userId: contas.editora.id, papel: "editor" }, { userId: contas.leitora.id, papel: "leitor" },
  ] });
}

const TIPOS = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json",
  ".woff2": "font/woff2", ".webp": "image/webp", ".gif": "image/gif",
};

/* Os contadores do backend desde a partida (ou desde o último zerar):
   o medidor do Dados.gs é por requisição, então eles são somados aqui. */
const somaBackend = { requisicoes: 0, porAcao: {}, chamadas: 0, leituras: 0, escritas: 0, celulas: 0 };
function somar(acao) {
  const m = typeof medidor === "function" ? medidor() : null;
  somaBackend.requisicoes++;
  somaBackend.porAcao[acao] = (somaBackend.porAcao[acao] || 0) + 1;
  if (!m) return;
  somaBackend.chamadas += m.chamadas || 0;
  somaBackend.leituras += m.leituras || 0;
  somaBackend.escritas += m.escritas || 0;
  somaBackend.celulas += m.celulas || 0;
}

const json = (v) => new Response(JSON.stringify(v), { headers: { "content-type": "application/json", "cache-control": "no-store" } });

Deno.serve({ port: PORTA, onListen: () => console.log("R.A.M.A. local em http://localhost:" + PORTA) }, async (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/exec" && req.method === "POST") {
    const corpo = JSON.parse(await req.text());
    const r = chamar(globalThis, corpo);
    somar(corpo.acao === "lote" ? "lote:" + (corpo.pedidos || []).map((p) => p.acao).join("+") : corpo.acao);
    return json(r);
  }
  if (url.pathname === "/__ids") return json({ ordem, universal, campanha, contas: Object.fromEntries(Object.entries(contas).map(([k, v]) => [k, v.id])) });
  if (url.pathname === "/__backend") return json(somaBackend);
  if (url.pathname === "/__backend/zerar") {
    Object.assign(somaBackend, { requisicoes: 0, porAcao: {}, chamadas: 0, leituras: 0, escritas: 0, celulas: 0 });
    return json({ ok: true });
  }
  if (url.pathname === "/__feedback") {
    const modo = url.searchParams.get("modo");
    if (modo) {
      discord.modo = modo;
      if (modo === "sem-webhook") ambiente.propriedades.delete("RAMA_FEEDBACK_WEBHOOK");
      else ambiente.propriedades.set("RAMA_FEEDBACK_WEBHOOK", WEBHOOK_SIMULADO);
    }
    /* &zerar=1 devolve o freio do feedback a zero, para o roteiro de teste. */
    if (url.searchParams.get("zerar")) for (const k of [...ambiente.cache.keys()]) if (k.startsWith("rama.feedback.")) ambiente.cache.delete(k);
    return json({ modo: discord.modo, recebidas: discord.recebidas });
  }
  if (url.pathname === "/__como" && req.method === "POST") {
    const quem = url.searchParams.get("conta") || "editora";
    return json(como(quem)(JSON.parse(await req.text())));
  }
  if (url.pathname === "/__entrar") {
    const quem = url.searchParams.get("conta") || "dona";
    const destino = url.searchParams.get("para") || "/personagens/";
    const c = contas[quem];
    if (!c) return new Response("conta desconhecida", { status: 404 });
    const pagina = "<!doctype html><meta charset=utf-8><script>" +
      "localStorage.setItem('rama.sessao.token'," + JSON.stringify(c.token) + ");" +
      "localStorage.setItem('rama.sessao.agente'," + JSON.stringify(JSON.stringify({ id: c.id, usuario: quem, nome: quem })) + ");" +
      "localStorage.setItem('rama.sessao.atividade', String(Date.now()));" +
      "location.replace(" + JSON.stringify(destino) + ");</script>";
    return new Response(pagina, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  }

  let caminho = decodeURIComponent(url.pathname);
  if (caminho.endsWith("/")) caminho += "index.html";
  if (caminho.includes("..")) return new Response("não", { status: 400 });
  try {
    let corpo = null;
    if (PASTA_SITE) { try { corpo = await Deno.readFile(new URL("." + caminho, urlDaPasta(PASTA_SITE))); } catch { corpo = null; } }
    if (!corpo) corpo = await Deno.readFile(new URL("." + caminho, RAIZ));
    if (caminho === "/js/config.js") {
      corpo = new TextEncoder().encode(new TextDecoder().decode(corpo)
        .replace(/API_URL:\s*"[^"]*"/, 'API_URL: "http://localhost:' + PORTA + '/exec"'));
    }
    const ext = caminho.slice(caminho.lastIndexOf("."));
    return new Response(corpo, { headers: { "content-type": TIPOS[ext] || "application/octet-stream", "cache-control": "no-store" } });
  } catch {
    return new Response("não encontrado", { status: 404 });
  }
});
