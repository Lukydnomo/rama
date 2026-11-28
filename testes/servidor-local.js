/* =====================================================================
   R.A.M.A. — servidor local de teste e medição (v2.46; dados em disco na
   entrega em desenvolvimento — ver docs/ENTREGA.md)
   ---------------------------------------------------------------------
   Duas maneiras de usar:

   1. AMBIENTE DE TESTES DO DIA A DIA — duplo clique em “Abrir testes.cmd”
      na raiz do projeto. Ele chama testes/abrir-testes.ps1, que roda:

       deno run … testes/servidor-local.js --dados testes/dados-locais/estado.json --abrir

      Com --dados, a planilha simulada, as propriedades e as contas ficam
      num arquivo (fora do Git) e voltam iguais na próxima partida.

   2. MEDIÇÃO E ROTEIROS AUTOMÁTICOS — sem --dados, tudo nasce na partida
      e some ao fechar, como sempre foi:

       deno run --allow-read --allow-net --allow-env testes/servidor-local.js [--porta 8124] [--backend pasta] [--site pasta]

   OPÇÕES
     --porta N        porta local (padrão 8124). Só escuta em 127.0.0.1.
     --dados arquivo  guarda os dados de teste nesse arquivo (pede
                      --allow-write na pasta dele)
     --abrir          abre o navegador na escolha de conta quando estiver
                      pronto (pede --allow-run=cmd)
     --restaurar      com --dados: troca os dados guardados pelos fictícios
                      iniciais e sai (uma cópia do estado anterior fica em
                      estado.antes-de-restaurar.json). Quem confirma é o
                      testes/restaurar-testes.ps1.
     --backend/--site caminho absoluto de outra versão guardada (git
                      archive), para medir lado a lado. Arquivos que a
                      pasta de --site não tiver vêm da raiz do projeto.

   O backend de verdade (os .gs) dentro do simulador do Apps Script, e os
   arquivos do site servidos como o GitHub Pages serviria — com o
   endereço da API trocado para este servidor. Dados SINTÉTICOS; nada sai
   desta máquina. Os arquivos do site são lidos a cada pedido (atualizar
   a página mostra a mudança); os .gs só na partida (mudou o backend,
   reinicie — os dados guardados continuam).

   CONTAS (senha "senha-de-teste")
     dona       dona das duas fichas e jogadora da mesa
     editora    recebeu a ficha de Ordem como Editor
     leitora    recebeu a ficha de Ordem como Leitor
     mestre     mestre da campanha em que a ficha de Ordem está
     novata     conta nova, com o tutorial inicial pendente (as quatro de
                cima nascem com ele concluído; em dados guardados antes do
                tutorial, elas continuam pendentes — o caso "conta antiga")

   O ARQUIVO DE DADOS (--dados)
     estado.json            o estado em uso
     estado.anterior.json   o estado válido da gravação anterior
     estado.json.tmp        gravação em andamento; sobra só se ela foi
                            interrompida
     estado.json.lock       esta instância está usando os dados (porta)
   Cada gravação escreve o .tmp inteiro, guarda o atual como .anterior e
   só então põe o .tmp no lugar: uma gravação cortada no meio nunca
   estraga o último estado válido. Arquivo ilegível ou de formato
   desconhecido não é apagado nem sobrescrito: o servidor explica e
   pergunta o que fazer (ou sai, sem console interativo).

   ROTAS DE APOIO (só existem aqui)
     /__testes                  escolha da conta e “Restaurar dados de teste”
     /__rama                    identidade desta instância (pasta, dados,
                                porta) — o iniciador usa para saber se a
                                instância certa já está aberta
     /__restaurar   (POST)      volta aos dados fictícios iniciais; exige o
                                cabeçalho x-rama-testes: restaurar
     /__entrar?conta=…&para=…   abre a sessão da conta sem o formulário
                                (&ls={"chave":"valor"} grava mais chaves no
                                localStorage antes: versão vista, densidade)
     /__ids                     ids das fichas e da campanha iniciais
     /__tutorial?conta=…&estado=pendente|concluido
                                marca o tutorial inicial da conta, para
                                testar o desvio obrigatório de novo
     /__como?conta=…  (POST)    age como outra conta, direto no backend
     /__codigo?codigo=…&tema=…  cadastra um código de resgate sintético
     /__backend                 contadores do backend (chamadas ao Sheets,
                                células, leituras) desde a partida
     /__backend/zerar           zera esses contadores
     /__atraso?ms=…             rede lenta simulada: cada /exec espera
                                tantos ms antes de responder (0 desliga;
                                v9.19.0, para conferir o Skeleton Loading)
     /__feedback?modo=…         o Discord SIMULADO do feedback: ok, 429,
                                500, 404, rede ou sem-webhook (padrão:
                                sem-webhook, como uma implantação nova);
                                devolve as mensagens que ele "recebeu"
                                (também os pedidos de acesso do portão, v6.6)

   Não é a implantação: a planilha é um array em memória, sem latência.
   Serve para conferir comportamento e CONTAR o que acontece — nunca
   para medir tempo do Google.
   ===================================================================== */

import { instalarAmbiente, chamar } from "./apps-script-simulado.js";
import { fichasParaMedir } from "./medicao-fichas.js";

/* O console do backend é trocado pelo simulador (fica em `registros`):
   guardamos o de verdade para as mensagens deste servidor. */
const terminal = globalThis.console;
const RAIZ = new URL("../", import.meta.url);
function argumento(nome, padrao) {
  const i = Deno.args.indexOf(nome);
  return i >= 0 && Deno.args[i + 1] ? Deno.args[i + 1] : padrao;
}
const PORTA = Number(argumento("--porta", "8124"));
const HOST = "127.0.0.1";
const PASTA_BACKEND = argumento("--backend", "backend");
const PASTA_SITE = argumento("--site", "");
const ABRIR = Deno.args.includes("--abrir");
const RESTAURAR = Deno.args.includes("--restaurar");
const absoluto = (p) => /^([A-Za-z]:[\\/]|\/|\\\\)/.test(p);
const urlDaPasta = (p) => absoluto(p) ? new URL("file:///" + p.replace(/\\/g, "/").replace(/^\//, "") + "/") : new URL(p + "/", RAIZ);
const SEP = Deno.build.os === "windows" ? "\\" : "/";
const caminhoAbsoluto = (p) => (absoluto(p) ? p : Deno.cwd().replace(/[\\/]+$/, "") + SEP + p.replace(/^\.[\\/]/, "")).replace(/[\\/]/g, SEP);
const RAIZ_CAMINHO = decodeURIComponent(RAIZ.pathname).replace(/^\/([A-Za-z]:)/, "$1").replace(/\//g, SEP).replace(/[\\/]+$/, "");

const DADOS = argumento("--dados", "") ? caminhoAbsoluto(argumento("--dados", "")) : "";
const ARQ = DADOS ? {
  atual: DADOS,
  anterior: DADOS.replace(/\.json$/i, "") + ".anterior.json",
  tmp: DADOS + ".tmp",
  trava: DADOS + ".lock",
  antesDeRestaurar: DADOS.replace(/\.json$/i, "") + ".antes-de-restaurar.json",
  invalido: () => DADOS.replace(/\.json$/i, "") + ".invalido-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json",
} : null;
const relativo = (p) => p && p.toLowerCase().startsWith(RAIZ_CAMINHO.toLowerCase() + SEP) ? p.slice(RAIZ_CAMINHO.length + 1) : p;

/* O formato do arquivo de dados de teste. Sobe quando a forma do arquivo
   mudar; um arquivo de formato mais novo é recusado, nunca adivinhado.
   (Coluna nova de uma aba NÃO muda o formato: o setupRama roda a cada
   partida e acrescenta o que faltar, como na planilha de verdade.) */
const FORMATO_DADOS = "rama-testes-locais";
const VERSAO_DADOS = 1;

function sair(codigo, ...linhas) {
  terminal.error("\n" + linhas.join("\n") + "\n");
  Deno.exit(codigo);
}
if (RESTAURAR && !DADOS) sair(2, "--restaurar precisa de --dados <arquivo>.");

/* As fichas são montadas ANTES do backend: o motor do site e os .gs
   dividem o escopo global, e o conversor precisa do motor inteiro. */
const fichas = await fichasParaMedir();

const ambiente = instalarAmbiente(globalThis);
const avisar = (...a) => terminal.log(...a);
/* O núcleo é obrigatório; os arquivos de sistema e os opcionais, não —
   um backend de versão anterior (para comparar) não os tem. */
const NUCLEO = ["Dados.gs", "Codigo.gs", "Campanhas.gs"];
for (const arq of NUCLEO.concat(["Sistemas.gs", "Ordem.gs", "Universal.gs", "Oblivio.gs", "Vampiro.gs", "Goblins.gs", "Brutal.gs", "Tormenta20Dados.gs", "Tormenta20.gs", "Ordem2.gs", "Ordem2Pacotes.local.gs", "Cris.gs", "Feedback.gs", "HomebrewPacotes.gs"])) {
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
/* O CRIS, SIMULADO (v7.2): as fichas públicas guardadas em
   testes/fixtures/cris respondem pelo id do link, no formato do
   Firestore. Nada sai para a rede; ids desconhecidos dão 404. */
const BASE_CRIS = "https://firestore.googleapis.com/v1/projects/cris-ordem-paranormal/databases/(default)/documents/characters/";
const docsDoCris = {};
function fsValor(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fsValor) } };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fsValor(x)])) } };
}
try {
  for await (const arq of Deno.readDir(new URL("./fixtures/cris/", import.meta.url))) {
    if (!arq.name.endsWith(".json")) continue;
    const dado = JSON.parse(await Deno.readTextFile(new URL("./fixtures/cris/" + arq.name, import.meta.url)));
    if (dado.adaptador && dado.fonte && dado.ficha) docsDoCris[dado.fonte.documentId] = dado.ficha;
    else if (arq.name === "jeff-cris-publico.json") docsDoCris.OwH4ajq32U6pYGVlJBHa = dado;
  }
} catch (_) { /* sem fixtures: o CRIS simulado só responde 404 */ }

globalThis.UrlFetchApp = {
  fetch(endereco, opcoes) {
    if (String(endereco).indexOf(BASE_CRIS) === 0) {
      const id = String(endereco).slice(BASE_CRIS.length);
      const ficha = docsDoCris[id];
      const corpo = ficha ? JSON.stringify({ name: "projects/cris-ordem-paranormal/databases/(default)/documents/characters/" + id, fields: fsValor(ficha).mapValue.fields, updateTime: "2026-11-11T00:00:00Z" }) : "{}";
      const bytes = new TextEncoder().encode(corpo);
      return { getResponseCode: () => (ficha ? 200 : 404), getContentText: () => corpo, getContent: () => bytes, getHeaders: () => ({}) };
    }
    if (discord.modo === "rede") throw new Error("Address unavailable: " + endereco);
    const status = { ok: 200, "429": 429, "500": 500, "404": 404 }[discord.modo] || 200;
    if (status === 200) discord.recebidas.push({ corpo: JSON.parse(opcoes.payload) });
    const corpo = status === 200 ? JSON.stringify({ id: String(discord.recebidas.length) }) : status === 429 ? JSON.stringify({ retry_after: 3.2 }) : "{}";
    return { getResponseCode: () => status, getContentText: () => corpo, getHeaders: () => ({}) };
  },
};

/* =====================================================================
   CONTAS E DADOS FICTÍCIOS INICIAIS
   ===================================================================== */

const NOMES_DAS_CONTAS = ["dona", "editora", "leitora", "mestre", "novata"];
/* As contas que nascem com o tutorial inicial concluído: os roteiros de
   medição entram nelas e esperam a página pedida, não o tutorial. */
const JA_FIZERAM_O_TUTORIAL = ["dona", "editora", "leitora", "mestre"];
const SENHA = "senha-de-teste";
let contas = {};
let ids = { ordem: "", universal: "", campanha: "" };
let criadoEm = new Date().toISOString();
const como = (c) => (corpo) => chamar(globalThis, Object.assign({ token: contas[c] && contas[c].token }, corpo));

function entrarComo(nome) {
  const r = chamar(globalThis, { acao: "login", usuario: nome, senha: SENHA });
  if (!r || !r.ok || !r.token) return false;
  contas[nome] = { token: r.token, id: r.agente.id };
  return true;
}

function semear() {
  ambiente.propriedades.set("RAMA_ITERACOES", "50");
  setupRama();
  gerarPepper();
  contas = {};
  for (const nome of NOMES_DAS_CONTAS) {
    criarUsuario(nome, nome[0].toUpperCase() + nome.slice(1), SENHA);
    entrarComo(nome);
  }

  /* Homebrew sintético para o assistente do CRIS (v7.2): dois rituais da
     dona e um público da editora. */
  como("dona")({ acao: "salvar_homebrew", dados: { tipo: "ritual", nome: "Prece do Vigia", circulo: "1º círculo", elemento: "Conhecimento", execucao: "Padrão", alcance: "Curto", alvo: "1 ser", duracao: "Cena", resistencia: "Vontade anula", descricao: "Ritual sintético da Homebrew (teste)." } });
  como("dona")({ acao: "salvar_homebrew", dados: { tipo: "ritual", nome: "Sussurro Sintético", circulo: "1º círculo", elemento: "Conhecimento", execucao: "Padrão", alcance: "Pessoal", alvo: "Você", duracao: "Cena", descricao: "Ritual sintético da Homebrew (teste)." } });
  como("editora")({ acao: "salvar_homebrew", dados: { tipo: "ritual", nome: "Canto Público de Teste", visibilidade: "publico", circulo: "2º círculo", elemento: "Energia", descricao: "Ritual sintético público (teste)." } });

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
  ids = { ordem, universal, campanha };
  for (const nome of JA_FIZERAM_O_TUTORIAL) como(nome)({ acao: "concluir_tutorial" });
  criadoEm = new Date().toISOString();
}

/* A conta existe na planilha? (Dados guardados antes de uma conta nova
   entrar na lista não a têm: ela é criada na partida.) */
function contaExiste(nome) {
  return !!acharPor(ABAS.USUARIOS, "usuario", nome);
}

/* Pendente apaga a chave reservada; concluído grava pela ação de verdade. */
function marcarTutorial(nome, estado) {
  if (!contas[nome]) return { ok: false, erro: "conta desconhecida" };
  if (estado === "concluido") return como(nome)({ acao: "concluir_tutorial" });
  const perfil = acharPor(ABAS.PERFIS, "userId", contas[nome].id);
  if (!perfil) return { ok: true };
  const prefs = JSON.parse(perfil.preferenciasJson || "{}");
  delete prefs.tutorial;
  perfil.preferenciasJson = JSON.stringify(prefs);
  atualizarLinha(ABAS.PERFIS, perfil._linha, perfil);
  return { ok: true };
}

/* Volta ao começo dentro do mesmo processo: planilha, cache e
   propriedades vazias, e a semeadura de novo. */
function recomecar() {
  ambiente.limpar();
  ambiente.propriedades.clear();
  semear();
}

/* =====================================================================
   O ARQUIVO DE DADOS
   ===================================================================== */

/* Datas viram { "$data": iso } (o JSON as achataria em texto); célula
   vazia (buraco ou undefined) vira null e volta como vazia. */
function paraTexto(estado) {
  return JSON.stringify(estado, function (k, v) {
    const original = this[k];
    if (original instanceof Date) return { $data: original.toISOString() };
    return v === undefined ? null : v;
  });
}
function celulaDeVolta(v) {
  if (v === null) return undefined;
  if (v && typeof v === "object" && typeof v.$data === "string") return new Date(v.$data);
  return v;
}

function estadoAtual() {
  return {
    formato: FORMATO_DADOS,
    versao: VERSAO_DADOS,
    criadoEm,
    salvoEm: new Date().toISOString(),
    ids,
    contas: Object.fromEntries(Object.entries(contas).map(([k, v]) => [k, { id: v.id }])),
    propriedades: Object.fromEntries(ambiente.propriedades),
    folhas: ambiente.planilha.folhas.map((f) => ({
      nome: f.nome, congeladas: f.congeladas, maxLinhas: f.maxLinhas, formatos: f.formatos,
      linhas: Array.from(f.linhas, (l) => Array.from(l || [])),
    })),
  };
}

/* Confere a forma inteira ANTES de tocar no simulador: um arquivo ruim
   nunca deixa a planilha pela metade. Devolve { ok, erro, estado }. */
function lerEstado(texto) {
  let e;
  try { e = JSON.parse(texto); } catch (x) { return { ok: false, erro: "o conteúdo não é JSON válido (" + String(x.message || x).slice(0, 160) + ")" }; }
  if (!e || typeof e !== "object") return { ok: false, erro: "o conteúdo não é um objeto" };
  if (e.formato !== FORMATO_DADOS) return { ok: false, erro: "não é um arquivo de dados de teste do RAMA (formato \"" + String(e.formato) + "\")" };
  if (!Number.isInteger(e.versao) || e.versao < 1) return { ok: false, erro: "a versão do formato está ausente ou inválida" };
  if (e.versao > VERSAO_DADOS) return { ok: false, erro: "foi gravado por um servidor de testes mais novo (formato " + e.versao + "; este lê até o " + VERSAO_DADOS + ")" };
  if (!Array.isArray(e.folhas) || !e.folhas.length) return { ok: false, erro: "não há abas da planilha" };
  for (const f of e.folhas) {
    if (!f || typeof f.nome !== "string" || !Array.isArray(f.linhas) || f.linhas.some((l) => !Array.isArray(l))) {
      return { ok: false, erro: "uma aba da planilha está malformada" + (f && f.nome ? " (" + f.nome + ")" : "") };
    }
  }
  if (!e.propriedades || typeof e.propriedades !== "object") return { ok: false, erro: "faltam as propriedades do script" };
  if (!e.ids || typeof e.ids !== "object") return { ok: false, erro: "faltam os ids iniciais" };
  return { ok: true, estado: e };
}

function aplicarEstado(e) {
  ambiente.limpar();
  ambiente.propriedades.clear();
  for (const [k, v] of Object.entries(e.propriedades)) ambiente.propriedades.set(k, String(v));
  for (const f of e.folhas) {
    const folha = ambiente.planilha.insertSheet(f.nome);
    folha.linhas = f.linhas.map((l) => l.map(celulaDeVolta));
    folha.congeladas = Number(f.congeladas) || 0;
    folha.maxLinhas = Math.max(Number(f.maxLinhas) || 0, folha.linhas.length);
    folha.formatos = f.formatos && typeof f.formatos === "object" ? f.formatos : {};
  }
  ids = Object.assign({ ordem: "", universal: "", campanha: "" }, e.ids);
  criadoEm = e.criadoEm || criadoEm;
  /* Como a implantação depois de atualizar o backend: o setup é
     idempotente e acrescenta as colunas novas. */
  setupRama();
  contas = {};
  const semSessao = [];
  for (const nome of NOMES_DAS_CONTAS) {
    if (!contaExiste(nome)) criarUsuario(nome, nome[0].toUpperCase() + nome.slice(1), SENHA);
    if (!entrarComo(nome)) {
      semSessao.push(nome);
      if (e.contas && e.contas[nome] && e.contas[nome].id) contas[nome] = { token: "", id: e.contas[nome].id };
    }
  }
  if (semSessao.length) avisar("Aviso: não foi possível entrar como " + semSessao.join(", ") + " com a senha de teste (ela foi trocada?). Use o formulário de login para essas contas.");
}

async function lerArquivo(caminho) {
  try { return await Deno.readTextFile(caminho); } catch (e) { if (e instanceof Deno.errors.NotFound) return null; throw e; }
}

const esperarMs = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
/* O Google Drive (e antivírus) às vezes segura o arquivo por um
   instante: renomear tenta de novo antes de desistir. */
function comInsistencia(fn) {
  for (let i = 0; ; i++) {
    try { return fn(); } catch (e) {
      if (e instanceof Deno.errors.NotFound) throw e;
      if (i >= 8) throw e;
      esperarMs(60 * (i + 1));
    }
  }
}
function existe(caminho) { try { Deno.statSync(caminho); return true; } catch { return false; } }

let gravacaoFalhou = false;
function gravarAgora() {
  if (!ARQ) return true;
  try {
    const texto = paraTexto(estadoAtual());
    const f = Deno.openSync(ARQ.tmp, { write: true, create: true, truncate: true });
    try {
      const bytes = new TextEncoder().encode(texto);
      let escrito = 0;
      while (escrito < bytes.length) escrito += f.writeSync(bytes.subarray(escrito));
      f.syncSync();
    } finally { f.close(); }
    if (existe(ARQ.atual)) {
      if (existe(ARQ.anterior)) comInsistencia(() => Deno.removeSync(ARQ.anterior));
      comInsistencia(() => Deno.renameSync(ARQ.atual, ARQ.anterior));
    }
    comInsistencia(() => Deno.renameSync(ARQ.tmp, ARQ.atual));
    if (gravacaoFalhou) avisar("Gravação dos dados de teste voltou a funcionar.");
    gravacaoFalhou = false;
    return true;
  } catch (e) {
    if (!gravacaoFalhou) avisar("ERRO ao gravar os dados de teste: " + String(e && e.message || e) + "\nO último estado válido continua em " + relativo(ARQ.atual) + " (ou .anterior / .tmp). Vou tentar de novo na próxima mudança.");
    gravacaoFalhou = true;
    return false;
  }
}

/* Gravar logo depois de cada mudança, mas sem reescrever o arquivo a
   cada clique de uma sequência: 300 ms de folga. */
let pendente = null;
function agendarGravacao() {
  if (!ARQ) return;
  clearTimeout(pendente);
  pendente = setTimeout(() => { pendente = null; gravarAgora(); }, 300);
}
function gravarPendente() {
  if (pendente) { clearTimeout(pendente); pendente = null; gravarAgora(); }
}

/* Mudou algo? As escritas do simulador e as propriedades. */
function assinatura() {
  const c = ambiente.contador;
  return [c.setValues, c.appendRow, c.deleteRow, c.insertRows, ambiente.planilha.folhas.length, JSON.stringify([...ambiente.propriedades])].join("|");
}

function perguntar(texto) {
  if (!Deno.stdin.isTerminal()) return null;
  const r = prompt(texto);
  return r === null ? null : String(r).trim();
}

async function instanciaEm(porta) {
  try {
    const r = await fetch("http://" + HOST + ":" + porta + "/__rama", { signal: AbortSignal.timeout(1500) });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

/* Uma instância por arquivo de dados: a trava diz a porta de quem está
   usando; se essa porta responde como servidor de testes com os mesmos
   dados, paramos. Trava de uma instância que caiu é só recolhida. */
async function travar() {
  const texto = await lerArquivo(ARQ.trava);
  if (texto) {
    let t = null;
    try { t = JSON.parse(texto); } catch { t = null; }
    if (t && t.porta) {
      const outra = await instanciaEm(t.porta);
      if (outra && outra.rama && String(outra.dados || "").toLowerCase() === ARQ.atual.toLowerCase()) {
        sair(3, "Outro servidor de testes já está usando estes dados, em http://localhost:" + t.porta + "/__testes .",
          "Abra esse endereço, ou feche a janela dele antes de abrir outro.");
      }
    }
  }
  Deno.writeTextFileSync(ARQ.trava, JSON.stringify({ pid: Deno.pid, porta: PORTA, desde: new Date().toISOString() }));
}
function destravar() {
  if (!ARQ) return;
  try {
    const t = JSON.parse(Deno.readTextFileSync(ARQ.trava));
    if (t.pid === Deno.pid) Deno.removeSync(ARQ.trava);
  } catch { /* já não existe */ }
}

/* Na partida: carrega o estado válido mais recente, ou explica por que
   não dá e pergunta o que fazer. Nunca apaga o arquivo problemático. */
async function carregarOuSemear() {
  const pasta = ARQ.atual.slice(0, ARQ.atual.lastIndexOf(SEP));
  await Deno.mkdir(pasta, { recursive: true });
  await travar();

  if (RESTAURAR) {
    if (existe(ARQ.atual)) comInsistencia(() => Deno.copyFileSync(ARQ.atual, ARQ.antesDeRestaurar));
    semear();
    const ok = gravarAgora();
    destravar();
    if (!ok) sair(4, "Não consegui gravar os dados restaurados. Nada foi perdido: confira a mensagem acima.");
    avisar("Dados de teste restaurados para o conjunto fictício inicial." + (existe(ARQ.antesDeRestaurar) ? "\nO estado de antes ficou em " + relativo(ARQ.antesDeRestaurar) + "." : ""));
    Deno.exit(0);
  }

  const atual = await lerArquivo(ARQ.atual);
  if (atual === null) {
    /* Sem o arquivo principal: ou é a primeira vez, ou uma gravação foi
       cortada entre as duas trocas de nome. */
    for (const [qual, caminho] of [["gravação interrompida (.tmp)", ARQ.tmp], ["estado anterior", ARQ.anterior]]) {
      const t = await lerArquivo(caminho);
      if (t === null) continue;
      const r = lerEstado(t);
      if (r.ok) {
        aplicarEstado(r.estado);
        avisar("O arquivo principal faltava; recuperei o " + qual + ", salvo em " + (r.estado.salvoEm || "?") + ".");
        gravarAgora();
        return "recuperado";
      }
    }
    semear();
    gravarAgora();
    return "novo";
  }

  const r = lerEstado(atual);
  if (r.ok) { aplicarEstado(r.estado); return "carregado"; }

  /* Ilegível ou incompatível. */
  const anterior = await lerArquivo(ARQ.anterior);
  const rAnt = anterior === null ? null : lerEstado(anterior);
  const linhas = [
    "Não consegui usar os dados de teste guardados:",
    "  " + relativo(ARQ.atual),
    "  motivo: " + r.erro,
    "O arquivo NÃO foi apagado nem alterado.",
    "",
    "Como continuar:",
  ];
  if (rAnt && rAnt.ok) linhas.push("  1  usar o estado válido anterior (salvo em " + (rAnt.estado.salvoEm || "?") + ")");
  linhas.push("  2  começar de novo com os dados fictícios iniciais");
  linhas.push("  3  sair sem mudar nada");
  linhas.push("Nas opções 1 e 2 o arquivo problemático é renomeado para estado.invalido-<data>.json e fica guardado na mesma pasta.");
  terminal.error("\n" + linhas.join("\n") + "\n");
  const escolha = perguntar("Escolha (1, 2 ou 3):");
  if (escolha === "1" && rAnt && rAnt.ok) {
    const guardado = ARQ.invalido();
    comInsistencia(() => Deno.renameSync(ARQ.atual, guardado));
    aplicarEstado(rAnt.estado);
    gravarAgora();
    avisar("Usando o estado anterior. O arquivo com problema está em " + relativo(guardado) + ".");
    return "recuperado";
  }
  if (escolha === "2") {
    const guardado = ARQ.invalido();
    comInsistencia(() => Deno.renameSync(ARQ.atual, guardado));
    semear();
    gravarAgora();
    avisar("Começando com os dados fictícios iniciais. O arquivo com problema está em " + relativo(guardado) + ".");
    return "novo";
  }
  destravar();
  sair(5, escolha === null
    ? "Sem console interativo para perguntar: saí sem mudar nada. Abra pelo “Abrir testes.cmd” para escolher, ou use “Restaurar dados de teste.cmd”."
    : "Saí sem mudar nada.");
}

/* =====================================================================
   PARTIDA
   ===================================================================== */

/* A porta: se já tem algo nela, dizer o quê antes de carregar dados. */
async function conferirPorta() {
  try {
    const l = Deno.listen({ hostname: HOST, port: PORTA });
    l.close();
  } catch (e) {
    if (!(e instanceof Deno.errors.AddrInUse)) throw e;
    const outra = await instanciaEm(PORTA);
    if (outra && outra.rama) {
      const mesmaPasta = String(outra.raiz || "").toLowerCase() === RAIZ_CAMINHO.toLowerCase();
      sair(6, mesmaPasta
        ? "O servidor de testes deste projeto já está aberto em http://localhost:" + PORTA + "/__testes ."
        : "A porta " + PORTA + " já está com o servidor de testes de OUTRA pasta do RAMA:\n  " + outra.raiz + "\nFeche a janela dele, ou use outra porta (--porta).");
    }
    sair(6, "A porta " + PORTA + " já está em uso por outro programa.",
      "Feche esse programa e abra de novo, ou rode com outra porta (--porta 8130).",
      "Para ver quem está usando: Get-NetTCPConnection -LocalPort " + PORTA + " -State Listen");
  }
}

ambiente.propriedades.set("RAMA_ITERACOES", "50");
if (!RESTAURAR) await conferirPorta();
let situacao = "memória";
if (ARQ) situacao = await carregarOuSemear();
else semear();

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

const json = (v, status) => new Response(JSON.stringify(v), { status: status || 200, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const html = (texto, status) => new Response(texto, { status: status || 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
const escapar = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

let atrasoMs = 0;

/* A escolha de conta: a porta de entrada do ambiente de testes. */
function paginaDeTestes() {
  const papeis = {
    dona: "dona das fichas de exemplo e jogadora da mesa",
    editora: "recebeu a ficha de Ordem como Editor",
    leitora: "recebeu a ficha de Ordem como Leitor (só lê)",
    mestre: "mestre da campanha “Mesa de medição”",
    novata: "conta nova: ainda não fez o tutorial inicial",
  };
  const botoes = NOMES_DAS_CONTAS.map((n) =>
    '<a class="conta" href="/__entrar?conta=' + n + '&amp;para=%2Fpersonagens%2F"><b>' + n[0].toUpperCase() + n.slice(1) + "</b><span>" + escapar(papeis[n]) + "</span></a>").join("");
  const tutorial = NOMES_DAS_CONTAS.map((n) => {
    const pendente = contas[n] && !conclusaoDoTutorial(acharPor(ABAS.PERFIS, "userId", contas[n].id));
    return "<li>" + n + ": " + (pendente ? "pendente" : "concluído") + ' · <a href="/__tutorial?conta=' + n + "&amp;estado=" + (pendente ? "concluido" : "pendente") + '&amp;voltar=1">marcar como ' + (pendente ? "concluído" : "pendente") + "</a></li>";
  }).join("");
  const guarda = ARQ
    ? "Os dados ficam em <code>" + escapar(relativo(ARQ.atual)) + "</code> e continuam aqui depois de fechar e abrir de novo."
    : "Modo medição: os dados vivem só na memória e somem ao fechar o servidor.";
  return "<!doctype html><html lang=pt-BR><meta charset=utf-8><meta name=viewport content=\"width=device-width,initial-scale=1\"><title>R.A.M.A. — testes locais</title>" +
    "<style>body{font:15px/1.5 system-ui,sans-serif;background:#111;color:#eee;margin:0;padding:32px 16px}main{max-width:560px;margin:auto}" +
    "h1{font-size:20px;margin:0 0 4px}p{color:#bbb}.contas{display:grid;gap:10px;margin:20px 0}.conta{display:flex;flex-direction:column;padding:12px 14px;border:1px solid #444;border-radius:8px;color:#eee;text-decoration:none;background:#1a1a1a}" +
    ".conta:hover,.conta:focus-visible{border-color:#c9a227;outline:none}.conta span{color:#aaa;font-size:13px}code{color:#e6c35c}" +
    "button{font:inherit;padding:8px 12px;border-radius:6px;border:1px solid #844;background:#2a1414;color:#f3c4c4;cursor:pointer}small{color:#888}</style>" +
    "<main><h1>R.A.M.A. — testes locais</h1><p>Escolha uma conta fictícia para entrar. Senha de todas, no formulário comum: <code>" + SENHA + "</code>.</p>" +
    '<nav class="contas">' + botoes + "</nav>" +
    "<p><small>" + guarda + " Mudou um arquivo do site? Atualize a página. Mudou um <code>.gs</code>? Feche e abra o servidor — os dados continuam.</small></p>" +
    '<p><a href="/" style="color:#e6c35c">Entrar pelo formulário</a></p>' +
    '<details><summary><small>Tutorial inicial por conta</small></summary><ul style="font-size:13px;color:#bbb">' + tutorial + "</ul></details><hr style=\"border-color:#333\">" +
    '<p><button id="restaurar" type="button">Restaurar dados de teste</button><br><small>Troca todas as fichas, campanhas e contas pelos dados fictícios iniciais' + (ARQ ? " (uma cópia do estado atual fica em <code>" + escapar(relativo(ARQ.antesDeRestaurar)) + "</code>)" : "") + ".</small></p>" +
    "<script>document.getElementById('restaurar').onclick=async function(){" +
    "if(!confirm('Restaurar os dados de teste?\\n\\nTodas as fichas, campanhas, aliados e compartilhamentos voltam ao conjunto fictício inicial. As sessões abertas terminam.'))return;" +
    "this.disabled=true;const r=await fetch('/__restaurar',{method:'POST',headers:{'x-rama-testes':'restaurar'}}).then(function(x){return x.json()}).catch(function(){return{ok:false}});" +
    "alert(r.ok?'Dados de teste restaurados.':'Não consegui restaurar: '+(r.erro||'sem resposta do servidor'));location.reload();};</script></main></html>";
}

function aoEncerrar() {
  gravarPendente();
  destravar();
}
globalThis.addEventListener("unload", aoEncerrar);
for (const sinal of Deno.build.os === "windows" ? ["SIGINT", "SIGBREAK"] : ["SIGINT", "SIGTERM"]) {
  try { Deno.addSignalListener(sinal, () => { aoEncerrar(); Deno.exit(0); }); } catch { /* sinal indisponível aqui */ }
}

const ENDERECO = "http://localhost:" + PORTA;
Deno.serve({
  hostname: HOST, port: PORTA,
  onListen: () => {
    avisar("R.A.M.A. — servidor de testes em " + ENDERECO + "/__testes");
    if (ARQ) avisar("Dados: " + relativo(ARQ.atual) + " (" + situacao + ")." + "\nPara encerrar: feche esta janela ou aperte Ctrl+C.");
    else avisar("Modo medição: dados só na memória.");
    if (ABRIR) {
      try { new Deno.Command("cmd", { args: ["/c", "start", "", ENDERECO + "/__testes"], stdout: "null", stderr: "null" }).spawn(); }
      catch (e) { avisar("Abra no navegador: " + ENDERECO + "/__testes (" + String(e && e.message || e) + ")"); }
    }
  },
}, async (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/exec" && req.method === "POST") {
    const corpo = JSON.parse(await req.text());
    if (atrasoMs > 0) await new Promise((ok) => setTimeout(ok, atrasoMs));
    const antes = assinatura();
    const r = chamar(globalThis, corpo);
    somar(corpo.acao === "lote" ? "lote:" + (corpo.pedidos || []).map((p) => p.acao).join("+") : corpo.acao);
    if (assinatura() !== antes) agendarGravacao();
    if (ambiente.registros.length > 500) ambiente.registros.splice(0, ambiente.registros.length - 200);
    return json(r);
  }
  if (url.pathname === "/__rama") return json({ rama: "servidor-de-testes", raiz: RAIZ_CAMINHO, dados: ARQ ? ARQ.atual : null, porta: PORTA, pid: Deno.pid });
  if (url.pathname === "/__testes") return html(paginaDeTestes());
  if (url.pathname === "/__restaurar") {
    /* O cabeçalho próprio obriga um pedido do próprio site: uma página
       de fora não consegue mandá-lo sem uma liberação que nunca damos. */
    if (req.method !== "POST" || req.headers.get("x-rama-testes") !== "restaurar") return json({ ok: false, erro: "pedido inválido" }, 400);
    try {
      gravarPendente();
      if (ARQ && existe(ARQ.atual)) comInsistencia(() => Deno.copyFileSync(ARQ.atual, ARQ.antesDeRestaurar));
      recomecar();
      const ok = gravarAgora();
      avisar("Dados de teste restaurados pelo navegador.");
      return json({ ok, erro: ok ? "" : "a gravação falhou (veja a janela do servidor)" });
    } catch (e) {
      return json({ ok: false, erro: String(e && e.message || e) }, 500);
    }
  }
  if (url.pathname === "/__tutorial") {
    const r = marcarTutorial(url.searchParams.get("conta") || "", url.searchParams.get("estado") || "");
    agendarGravacao();
    if (url.searchParams.get("voltar")) return new Response(null, { status: 303, headers: { location: "/__testes" } });
    return json(r);
  }
  if (url.pathname === "/__ids") return json(Object.assign({}, ids, { contas: Object.fromEntries(Object.entries(contas).map(([k, v]) => [k, v.id])) }));
  if (url.pathname === "/__backend") return json(somaBackend);
  if (url.pathname === "/__atraso") {
    atrasoMs = Math.max(0, Math.min(60000, Number(url.searchParams.get("ms")) || 0));
    return json({ ok: true, ms: atrasoMs });
  }
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
    if (url.searchParams.get("zerar")) for (const k of [...ambiente.cache.keys()]) if (k.startsWith("rama.feedback.") || k.startsWith("rama.acesso.")) ambiente.cache.delete(k);
    return json({ modo: discord.modo, recebidas: discord.recebidas });
  }
  /* /__codigo?codigo=…&tema=… cadastra um código de resgate SINTÉTICO
     (o mesmo cadastrarCodigo do editor do Apps Script), para testar o
     resgate de temas de dados no Perfil. */
  if (url.pathname === "/__codigo") {
    const codigo = url.searchParams.get("codigo") || "TESTE-RAMA-01";
    const tema = url.searchParams.get("tema") || "mandinha-linda";
    try {
      const msg = globalThis.cadastrarCodigo(codigo, [tema], "teste local");
      agendarGravacao();
      return json({ ok: true, msg });
    } catch (e) { return json({ ok: false, erro: String(e && e.message || e) }); }
  }
  if (url.pathname === "/__como" && req.method === "POST") {
    const quem = url.searchParams.get("conta") || "editora";
    const antes = assinatura();
    const r = como(quem)(JSON.parse(await req.text()));
    if (assinatura() !== antes) agendarGravacao();
    return json(r);
  }
  if (url.pathname === "/__entrar") {
    const quem = url.searchParams.get("conta") || "dona";
    const destino = url.searchParams.get("para") || "/personagens/";
    if (!NOMES_DAS_CONTAS.includes(quem)) return new Response("conta desconhecida", { status: 404 });
    /* Sessão nova a cada entrada: a guardada pode ter expirado num
       servidor aberto há dias. */
    const antes = assinatura();
    if (!entrarComo(quem) && !(contas[quem] && contas[quem].token)) {
      return html("<!doctype html><meta charset=utf-8><p>Não consegui entrar como <b>" + escapar(quem) + "</b> com a senha de teste (ela foi trocada nestes dados?). Use o <a href=\"/\">formulário</a> ou restaure os dados de teste em <a href=\"/__testes\">/__testes</a>.</p>", 409);
    }
    if (assinatura() !== antes) agendarGravacao();
    const c = contas[quem];
    /* &ls={"chave":"valor"} (v6.4): chaves a mais no localStorage antes de
       abrir — a versão já vista (sem a janela de novidades), a densidade —,
       para capturas de tela num navegador sem perfil. */
    let extras = "";
    try {
      const ls = JSON.parse(url.searchParams.get("ls") || "{}");
      for (const [k, v] of Object.entries(ls)) extras += "localStorage.setItem(" + JSON.stringify(String(k)) + "," + JSON.stringify(String(v)) + ");";
    } catch { extras = ""; }
    const pagina = "<!doctype html><meta charset=utf-8><script>" + extras +
      "localStorage.setItem('rama.sessao.token'," + JSON.stringify(c.token) + ");" +
      "localStorage.setItem('rama.sessao.agente'," + JSON.stringify(JSON.stringify({ id: c.id, usuario: quem, nome: quem })) + ");" +
      "localStorage.setItem('rama.sessao.atividade', String(Date.now()));" +
      "location.replace(" + JSON.stringify(destino) + ");</script>";
    return html(pagina);
  }

  let caminho = decodeURIComponent(url.pathname);
  if (caminho.endsWith("/")) caminho += "index.html";
  if (caminho.includes("..")) return new Response("não", { status: 400 });
  try {
    let corpo = null;
    if (PASTA_SITE) { try { corpo = await Deno.readFile(new URL("." + caminho, urlDaPasta(PASTA_SITE))); } catch { corpo = null; } }
    if (!corpo) corpo = await Deno.readFile(new URL("." + caminho, RAIZ));
    if (caminho === "/js/config.js") {
      /* O endereço da API é o deste servidor, pelo mesmo nome que o
         navegador usou (localhost ou 127.0.0.1). */
      corpo = new TextEncoder().encode(new TextDecoder().decode(corpo)
        .replace(/API_URL:\s*"[^"]*"/, 'API_URL: "' + url.origin + '/exec"'));
    }
    const ext = caminho.slice(caminho.lastIndexOf("."));
    return new Response(corpo, { headers: { "content-type": TIPOS[ext] || "application/octet-stream", "cache-control": "no-store" } });
  } catch {
    return new Response("não encontrado", { status: 404 });
  }
});
