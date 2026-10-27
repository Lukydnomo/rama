/* =====================================================================
   R.A.M.A. — testes do feedback no navegador (js/feedback.js)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-feedback.js

   Sem navegador e sem rede: as regras da janela (validação, o pedido que
   vai ao servidor, a página de origem, um envio por vez, o id de
   operação, as mensagens de erro) e a costura com o resto do site (menu,
   páginas, folhas de estilo). A janela em si é conferida no navegador.
   Dados sintéticos.
   ===================================================================== */

const ARQUIVOS = ["js/config.js", "js/util.js", "js/api.js", "js/versao.js", "js/feedback.js"];

globalThis.window = globalThis;
globalThis.document = {
  currentScript: null,
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
  addEventListener() {},
  dispatchEvent() {},
};
globalThis.navigator = { onLine: true, userAgent: "teste" };
globalThis.location = { search: "", href: "http://localhost/", pathname: "/" };
globalThis.CustomEvent = class { constructor(nome, init) { this.type = nome; Object.assign(this, init); } };

const ler = (c) => Deno.readTextFile(new URL("../" + c, import.meta.url));
for (const caminho of ARQUIVOS) {
  try { (0, eval)(await ler(caminho)); } catch (e) { console.error(`Falhou ao carregar ${caminho}: ${e.message}`); Deno.exit(1); }
}
/* O núcleo do servidor, sem a ação (CacheService, UrlFetchApp). */
(0, eval)((await ler("backend/Feedback.gs")).replace(/\/\* -{60,}\s*\n\s*O FREIO[\s\S]*$/, "") + "\nglobalThis.RamaFeedbackCore = RamaFeedbackCore;");

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
  igual(nome, obtido, esperado) { const ok = Object.is(obtido, esperado); t.ok(nome, ok, ok ? "" : `obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`); },
  iguais(nome, obtido, esperado) { const a = JSON.stringify(obtido), b = JSON.stringify(esperado); t.ok(nome, a === b, a === b ? "" : `obtido ${a}, esperado ${b}`); },
};

const FB = globalThis.RAMAFeedback, Core = globalThis.RamaFeedbackCore;
const bom = (extra) => Object.assign({ categoria: "sugestao", assunto: "Inventário", descricao: "Agrupar os itens por categoria." }, extra || {});

/* ===================================================================== */
t.grupo("Feedback · as duas cópias dos limites batem");
t.iguais("limites de texto iguais aos do servidor", FB.LIMITES, Core.LIMITES);
t.iguais("mínimos iguais aos do servidor", FB.MINIMOS, Core.MINIMOS);
t.iguais("as mesmas categorias", FB.CATEGORIAS.map((c) => c.valor).sort(), Object.keys(Core.CATEGORIAS).sort());
t.iguais("os três tipos, na ordem do pedido", FB.CATEGORIAS.map((c) => c.rotulo), ["Sugestão de melhoria", "Reportar um bug", "Outro feedback"]);

/* ===================================================================== */
t.grupo("Feedback · validação na janela");
t.ok("preenchido certo passa", FB.validar(bom()).ok);
t.ok("sem tipo: pede o tipo", FB.validar(bom({ categoria: "" })).erros.categoria === "Escolha o tipo de feedback.");
t.ok("tipo inventado conta como sem tipo", !!FB.validar(bom({ categoria: "elogio" })).erros.categoria);
t.igual("assunto vazio", FB.validar(bom({ assunto: "" })).erros.assunto, "Escreva um assunto.");
t.igual("assunto só de espaços", FB.validar(bom({ assunto: "  \n " })).erros.assunto, "Escreva um assunto.");
t.igual("assunto curto", FB.validar(bom({ assunto: "ab" })).erros.assunto, "Use pelo menos 3 caracteres.");
t.igual("assunto longo diz quanto passou", FB.validar(bom({ assunto: "a".repeat(125) })).erros.assunto, "Passou do limite de 120 caracteres — 5 a mais.");
t.igual("descrição vazia", FB.validar(bom({ descricao: "   " })).erros.descricao, "Descreva o que você quer contar.");
t.igual("descrição curta", FB.validar(bom({ descricao: "oi" })).erros.descricao, "Use pelo menos 10 caracteres.");
t.ok("descrição no limite exato passa", FB.validar(bom({ descricao: "d".repeat(3000) })).ok);
t.ok("descrição acima do limite é erro (não é cortada)", !!FB.validar(bom({ descricao: "d".repeat(3001) })).erros.descricao);
t.ok("espaços das pontas não contam", FB.validar(bom({ assunto: "   " + "a".repeat(120) + "   " })).ok);
t.ok("extras do bug são opcionais", FB.validar(bom({ categoria: "bug" })).ok);
t.ok("  mas têm limite", !!FB.validar(bom({ categoria: "bug", passos: "p".repeat(1001) })).erros.passos);
t.ok("fora do bug, extras longos não travam (não vão)", FB.validar(bom({ categoria: "outro", passos: "p".repeat(5000) })).ok);
const todas = FB.validar({});
t.iguais("formulário vazio aponta os três obrigatórios", Object.keys(todas.erros).sort(), ["assunto", "categoria", "descricao"]);

/* O que a janela aceita, o servidor aceita (e vice-versa nos limites). */
const casos = [
  bom(), bom({ assunto: "a".repeat(120) }), bom({ assunto: "a".repeat(121) }), bom({ descricao: "d".repeat(3000) }),
  bom({ descricao: "d".repeat(3001) }), bom({ assunto: "ab" }), bom({ descricao: "\n\n  curto \n" }),
  bom({ categoria: "bug", passos: "p".repeat(1000), esperado: "e".repeat(500), observado: "o".repeat(501) }),
  bom({ categoria: "x" }), bom({ assunto: "linha\r\ncom   quebras" }),
];
t.ok("janela e servidor concordam em todos os casos de fronteira",
  casos.every((d) => FB.validar(d).ok === Core.validar(FB.pedidoDe(d, { versao: "2.50.0", pagina: "Home" })).ok),
  casos.map((d) => FB.validar(d).ok + "/" + Core.validar(FB.pedidoDe(d, {})).ok).join(" "));

/* ===================================================================== */
t.grupo("Feedback · o pedido ao servidor");
const ctx = { versao: "2.50.0", pagina: "Ficha — Inventário" };
let p = FB.pedidoDe(bom({ assunto: "  Inventário \n melhor ", identificar: false, passos: "não vai" }), ctx);
t.iguais("só os campos do pedido, sem extras fora do bug",
  Object.keys(p), ["categoria", "assunto", "descricao", "versao", "pagina", "identificar"]);
t.igual("assunto numa linha só", p.assunto, "Inventário melhor");
t.igual("anônimo por padrão", p.identificar, false);
t.igual("identificar só com true", FB.pedidoDe(bom({ identificar: "sim" }), ctx).identificar, false);
t.igual("  e true identifica", FB.pedidoDe(bom({ identificar: true }), ctx).identificar, true);
p = FB.pedidoDe(bom({ categoria: "bug", passos: " 1. abrir \r\n2. clicar ", esperado: "   ", observado: "quebra" }), ctx);
t.iguais("bug: só os extras preenchidos", Object.keys(p).filter((k) => ["passos", "esperado", "observado"].includes(k)), ["passos", "observado"]);
t.igual("  quebra de linha normalizada", p.passos, "1. abrir \n2. clicar");
t.ok("nada de token, id ou nome no pedido", !/token|"id"|usuario|nome/.test(JSON.stringify(p)));

/* ===================================================================== */
t.grupo("Feedback · a página de origem");
function docCom(rotuloLista, rotuloAba) {
  return {
    querySelector(sel) {
      if (!rotuloLista || !sel.includes('aria-label="' + rotuloLista + '"')) return null;
      return { textContent: rotuloAba };
    },
  };
}
const raiz = "https://exemplo.github.io/rama/";
t.igual("raiz do site: Home", FB.origemDaPagina(raiz, null, raiz), "Home");
t.igual("index.html na raiz: Home", FB.origemDaPagina(raiz + "index.html", null, raiz), "Home");
t.igual("Personagens", FB.origemDaPagina(raiz + "personagens/", null, raiz), "Personagens");
t.igual("Perfil, com consulta e âncora", FB.origemDaPagina(raiz + "perfil/?x=1#topo", null, raiz), "Perfil");
t.igual("ficha com a aba aberta", FB.origemDaPagina(raiz + "ficha/?id=abc123", docCom("Seções da ficha", " Inventário "), raiz), "Ficha — Inventário");
t.igual("campanha com a aba aberta", FB.origemDaPagina(raiz + "campanha/?id=c1", docCom("Seções da campanha", "Combate"), raiz), "Campanha — Combate");
t.igual("ficha sem aba encontrada: só Ficha", FB.origemDaPagina(raiz + "ficha/?id=abc123", docCom(null), raiz), "Ficha");
t.ok("o id da ficha na consulta nunca entra", !FB.origemDaPagina(raiz + "ficha/?id=abc123", docCom("Seções da ficha", "Geral"), raiz).includes("abc123"));
t.igual("abas de pastas da página Personagens não entram (texto da pessoa)",
  FB.origemDaPagina(raiz + "personagens/", docCom("Pastas", "Minha pasta secreta"), raiz), "Personagens");
t.igual("servidor local, sem prefixo", FB.origemDaPagina("http://localhost:8124/campanhas/", null, "http://localhost:8124/"), "Campanhas");
t.igual("pasta desconhecida", FB.origemDaPagina(raiz + "testes/", null, raiz), "Outra página");

/* ===================================================================== */
t.grupo("Feedback · um envio por vez, e o mesmo id ao repetir");
function apiFalsa() {
  const chamadas = [];
  let n = 0;
  const pendentes = [];
  return {
    chamadas, pendentes,
    novaOperacao: () => "op-teste-" + String(++n).padStart(8, "0"),
    enviarFeedback(dados, op) {
      chamadas.push({ dados, op });
      return new Promise((resolver) => pendentes.push(resolver));
    },
  };
}
{
  const api = apiFalsa();
  const envio = FB.criarEnvio(api);
  const pedido = FB.pedidoDe(bom(), ctx);
  const primeiro = envio.enviar(pedido);
  t.ok("em andamento durante o envio", envio.emAndamento());
  const duplo = await envio.enviar(pedido);
  t.ok("segundo clique durante o envio é ignorado", duplo.ignorado === true && api.chamadas.length === 1);
  api.pendentes.shift()({ ok: false, erro: "feedback_falhou" });
  const r1 = await primeiro;
  t.ok("a falha chega a quem chamou", r1.erro === "feedback_falhou" && !envio.emAndamento());

  const segundo = envio.enviar(pedido);
  api.pendentes.shift()({ ok: true });
  await segundo;
  t.ok("tentar de novo o MESMO pedido leva o MESMO id", api.chamadas[1].op === api.chamadas[0].op);
  const mudado = envio.enviar(FB.pedidoDe(bom({ descricao: "Agrupar os itens por categoria, e por peso." }), ctx));
  api.pendentes.shift()({ ok: true });
  await mudado;
  t.ok("pedido diferente leva outro id", api.chamadas[2].op !== api.chamadas[1].op);
}
{
  const api = apiFalsa();
  api.enviarFeedback = () => Promise.reject(new Error("caiu"));
  const r = await FB.criarEnvio(api).enviar(FB.pedidoDe(bom(), ctx));
  t.igual("exceção na rede vira sem_conexao (a janela trata como falha)", r.erro, "sem_conexao");
}
{
  const api = apiFalsa();
  api.enviarFeedback = () => Promise.resolve(null);
  const envio = FB.criarEnvio(api);
  const r = await envio.enviar(FB.pedidoDe(bom(), ctx));
  t.ok("resposta vazia vira sem_resposta, e o envio fica livre", r.erro === "sem_resposta" && !envio.emAndamento());
}

/* ===================================================================== */
t.grupo("Feedback · mensagens de erro");
const M = FB.mensagemDeErro;
t.ok("webhook ausente: indisponível, sem detalhe interno", /não está configurado/.test(M({ erro: "feedback_indisponivel" }).texto) && !/discord\.com|webhook|RAMA_/i.test(M({ erro: "feedback_indisponivel" }).texto));
t.ok("falha do Discord: pode tentar de novo", M({ erro: "feedback_falhou" }).tentar === true);
t.ok("sem conexão: pode tentar de novo", M({ erro: "sem_conexao" }).tentar === true);
t.ok("campo recusado: corrigir antes (sem tentar de novo)", M({ erro: "feedback_invalido", campo: "assunto" }).tentar === false);
t.igual("intervalo em segundos", M({ erro: "feedback_limite", segundos: 12 }).texto, "Você enviou feedbacks há pouco. Tente de novo em 12 segundos.");
t.igual("janela da hora em minutos", M({ erro: "feedback_limite", segundos: 1500 }).texto, "Você enviou feedbacks há pouco. Tente de novo em cerca de 25 minutos.");
t.ok("limite do canal tem frase própria", /canal de feedback recebeu muitas/.test(M({ erro: "feedback_limite", segundos: 600, geral: true }).texto));
t.ok("429 do Discord: espera curta", /3 segundos/.test(M({ erro: "feedback_ocupado", segundos: 3 }).texto));
t.ok("texto inchado pela formatação: pede para encurtar", /Encurte a descrição/.test(M({ erro: "feedback_invalido", motivo: "formatado" }).texto));
t.ok("servidor antigo (sem Feedback.gs): explica", /servidor não conhece/.test(M({ erro: "acao_desconhecida" }).texto));
const frasesFeedback = ["feedback_invalido", "feedback_limite", "feedback_em_andamento", "feedback_ocupado", "feedback_falhou", "feedback_indisponivel"];
t.ok("todo código do servidor tem frase própria", frasesFeedback.every((c) => !/ALGO DEU ERRADO/.test(globalThis.RAMAApi.frase({ erro: c }).titulo)));
const gs = await ler("backend/Feedback.gs");
const codigosDoServidor = [...new Set([...gs.matchAll(/'(feedback_[a-z_]+)'/g)].map((m) => m[1]))].sort();
t.iguais("  e a lista bate com os códigos que o servidor devolve", codigosDoServidor, frasesFeedback.slice().sort());

/* ===================================================================== */
t.grupo("Feedback · costura com o site");
const api = await ler("js/api.js");
const bloco = (inicio, fim) => api.slice(api.indexOf(inicio), api.indexOf(fim, api.indexOf(inicio)));
t.ok("enviar_feedback NÃO é repetido sozinho pela rede",
  !bloco("var IDEMPOTENTES = [", "];").includes("enviar_feedback") && !bloco("var REPETIVEIS_COM_CHAVE = {", "};").includes("enviar_feedback"));
t.ok("RAMAApi.enviarFeedback manda dados e operacaoId", /acao: "enviar_feedback", dados: dados, operacaoId: operacaoId/.test(api));
const app = await ler("js/app.js");
t.ok("Feedback no menu do agente (toda página, desktop e celular)", /rotulo: "Feedback", icone: "balao"/.test(app));
t.ok("  entre as opções e Sair, antes do separador", app.indexOf('rotulo: "Feedback"') < app.indexOf('"separador",\n      { rotulo: "Sair"'));
t.ok("nada de botão flutuante nem abertura automática", !/RAMAFeedback\.abrir\(\)/.test(app.replace(/aoClicar: function \(\) \{ global\.RAMAFeedback\.abrir\(\); \}/, "")));
const paginas = ["index.html", "personagens/index.html", "ficha/index.html", "campanhas/index.html", "campanha/index.html", "homebrew/index.html", "perfil/index.html"];
for (const pag of paginas) {
  const html = await ler(pag);
  t.ok(pag + " carrega js/feedback.js antes da casca", html.indexOf("js/feedback.js") > 0 && html.indexOf("js/feedback.js") < html.indexOf("js/app.js"));
}
const ui = await ler("js/ui.js");
for (const icone of ["balao", "lampada", "inseto", "certo", "perfil", "sair", "tela"]) t.ok("ícone " + icone, new RegExp("\\n    " + icone + ": \"M").test(ui));
const fb = await ler("js/feedback.js");
t.ok("a janela é o modal do sistema (Esc, foco preso, foco de volta)", /UI\.modal\(\{/.test(fb) && /podeFechar: podeFechar/.test(fb));
t.ok("  não fecha durante o envio", /if \(envio\.emAndamento\(\)\) return false;/.test(fb));
t.ok("  texto digitado: pergunta antes de descartar", /Descartar o feedback\?/.test(fb));
t.ok("nada guardado: sem localStorage, sem rascunho no servidor", !/localStorage|sessionStorage|indexedDB/.test(fb));
t.ok("não usa o título da aba (traz o nome do personagem na ficha)", !/document\.title/.test(fb));
t.ok("não monta HTML em texto", !/innerHTML|html:/.test(fb));
t.ok("navegador nunca fala com o Discord (sem endereço, sem fetch)", !/discord(app)?\.com|webhooks|RAMA_FEEDBACK_WEBHOOK/i.test(fb) && !/fetch\(|XMLHttpRequest|sendBeacon/.test(fb));

const css = await ler("css/componentes.css"), m20 = await ler("css/modern20/componentes.css");
t.ok("o Legacy tem o estilo da janela", /\.feedback-tipo \{/.test(css) && /\.feedback-falha \{/.test(css) && /\.feedback-sucesso \{/.test(css));
t.ok("  sem nenhuma regra de Modern20 nele", !/modern20/i.test(css.slice(css.indexOf("FEEDBACK (js/feedback.js)"))));
const blocoM20 = m20.slice(m20.indexOf("A janela de feedback"), m20.indexOf("A janela de feedback") + 1200);
t.ok("o Modern20 ajusta a forma dentro do escopo dele", m20.indexOf("A janela de feedback") > m20.indexOf(':where(:root[data-interface="modern20"])') && /& \.feedback-tipo \{/.test(blocoM20));
const cores = (css.slice(css.indexOf("FEEDBACK (js/feedback.js)")) + blocoM20).match(/#[0-9a-f]{3,8}\b|rgb\(/gi);
t.ok("cores só pelos papéis do tema (claro, escuro, personalizado)", !cores, String(cores));

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falhas.length) { console.log(`\n${VERMELHO}Falhou:${FIM}`); falhas.forEach((f) => console.log(`  · ${f}`)); }
Deno.exit(falharam ? 1 : 0);
