/* =====================================================================
   R.A.M.A. — testes do backend: leitura de ficha pública do CRIS (v2.34)
   Dados sintéticos e o retrato público do Jeff. O UrlFetchApp é
   simulado: nenhum teste sai para a rede. Chamado por executar-backend.js.
   ===================================================================== */

const LINK = "https://crisordemparanormal.com/agente/OwH4ajq32U6pYGVlJBHa";
const ENDPOINT = "https://firestore.googleapis.com/v1/projects/cris-ordem-paranormal/databases/(default)/documents/characters/OwH4ajq32U6pYGVlJBHa";

function fsValue(v) {
  if (v === null) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fsValue) } };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fsValue(x)])) } };
}

function documento(d, id) {
  return { name: "projects/cris-ordem-paranormal/databases/(default)/documents/characters/" + (id || "OwH4ajq32U6pYGVlJBHa"),
    fields: fsValue(d).mapValue.fields, updateTime: "2026-10-03T00:00:00Z" };
}

export async function testarCrisBackend({ t, preparar, novaConta, comoFn, chamar }) {
  const jeff = JSON.parse(await Deno.readTextFile(new URL("./fixtures/cris/jeff-cris-publico.json", import.meta.url)));

  /* O UrlFetchApp simulado: guarda cada pedido e responde o que o teste
     mandar. */
  const pedidos = [];
  let responder = () => ({ status: 200, corpo: JSON.stringify(documento(jeff)) });
  globalThis.UrlFetchApp = {
    fetch(url, opcoes) {
      pedidos.push({ url, opcoes: JSON.parse(JSON.stringify(opcoes || {})) });
      const r = responder(url, opcoes);
      if (r.lancar) throw new Error("timeout");
      const bytes = new TextEncoder().encode(r.corpo || "");
      return {
        getResponseCode: () => r.status,
        getContent: () => Array.from(r.tamanho ? new Uint8Array(r.tamanho) : bytes),
        getContentText: () => r.corpo || "",
      };
    },
  };

  t.grupo("CRIS · ler_ficha_cris");
  preparar();
  const ana = novaConta("cris_ana");
  const A = comoFn(ana);

  /* Implantação sem o Cris.gs: a ação não existe, e a tela explica. */
  const guardada = globalThis.rotasDoCris;
  globalThis.rotasDoCris = undefined;
  globalThis.CACHE_ROTAS = null;
  t.recusa("sem o Cris.gs instalado: acao_desconhecida", A({ acao: "ler_ficha_cris", url: LINK }), "acao_desconhecida");
  t.igual("  e nada sai para a rede", pedidos.length, 0);
  globalThis.rotasDoCris = guardada;
  globalThis.CACHE_ROTAS = null;

  const r = A({ acao: "ler_ficha_cris", url: LINK + "?aba=1#topo" });
  t.ok("ficha pública: devolve o retrato filtrado", r.ok && r.dados && r.dados.adaptador === "cris-firestore-v1");
  t.igual("  a fonte é o link canônico, sem parâmetros", r.dados.fonte.url, LINK);
  t.igual("  o id mantém as maiúsculas", r.dados.fonte.documentId, "OwH4ajq32U6pYGVlJBHa");
  t.igual("  o pedido vai ao endereço fixo do documento", pedidos[0].url, ENDPOINT);
  t.igual("  só GET", pedidos[0].opcoes.method, "get");
  t.iguais("  só o cabeçalho Accept: nenhum token, cookie ou credencial do R.A.M.A.", Object.keys(pedidos[0].opcoes.headers || {}), ["Accept"]);
  t.ok("  sem seguir redirecionamento e validando certificado", pedidos[0].opcoes.followRedirects === false && pedidos[0].opcoes.validateHttpsCertificates === true);
  t.ok("  nada do pedido do R.A.M.A. vai junto", !JSON.stringify(pedidos[0]).includes(ana.token) && !("payload" in pedidos[0].opcoes));
  t.igual("  o resumo traz a classe", r.dados.resumo.classe, "Combatente");

  /* Privacidade: o que não está na lista branca não volta. */
  pedidos.length = 0;
  responder = () => ({ status: 200, corpo: JSON.stringify(documento(Object.assign({}, jeff, {
    uid: "dono-secreto", owner: "fulano@exemplo", campaignId: "camp-1", rollHistory: [{ r: 20 }], admins: ["x"],
  }))) });
  const priv = A({ acao: "ler_ficha_cris", url: LINK });
  const texto = JSON.stringify(priv);
  t.ok("dono, campanha, administradores e histórico de rolagens não voltam", priv.ok && !/dono-secreto|fulano@exemplo|camp-1|rollHistory|admins/.test(texto));

  responder = () => ({ status: 200, corpo: JSON.stringify(documento(Object.assign({}, jeff, { private: true }))) });
  t.recusa("ficha privada é recusada", A({ acao: "ler_ficha_cris", url: LINK }), "cris_nao_publica");
  responder = () => ({ status: 200, corpo: JSON.stringify(documento((() => { const x = Object.assign({}, jeff); delete x.private; return x; })())) });
  t.recusa("ficha sem 'private: false' explícito é recusada", A({ acao: "ler_ficha_cris", url: LINK }), "cris_nao_publica");
  responder = () => ({ status: 200, corpo: JSON.stringify(documento(jeff, "OutroDocumento")) });
  t.recusa("documento de outro id é recusado", A({ acao: "ler_ficha_cris", url: LINK }), "cris_formato_incompativel");

  const http = [[404, "cris_nao_encontrada"], [403, "cris_acesso_negado"], [401, "cris_acesso_negado"], [429, "cris_limite_temporario"], [503, "cris_indisponivel"], [302, "cris_indisponivel"], [418, "cris_resposta_invalida"]];
  http.forEach(([status, erro]) => {
    responder = () => ({ status, corpo: "{}" });
    t.recusa("HTTP " + status + " vira " + erro, A({ acao: "ler_ficha_cris", url: LINK }), erro);
  });
  responder = () => ({ lancar: true });
  t.recusa("falha de rede vira indisponível", A({ acao: "ler_ficha_cris", url: LINK }), "cris_indisponivel");
  responder = () => ({ status: 200, corpo: "<html>não é json</html>" });
  t.recusa("resposta que não é JSON", A({ acao: "ler_ficha_cris", url: LINK }), "cris_resposta_invalida");
  responder = () => ({ status: 200, corpo: "{}", tamanho: 2 * 1024 * 1024 + 1 });
  t.recusa("resposta acima de 2 MiB", A({ acao: "ler_ficha_cris", url: LINK }), "cris_limite_excedido");
  responder = () => ({ status: 200, corpo: JSON.stringify(documento(Object.assign({}, jeff, { attributes: "forte" }))) });
  t.recusa("formato inesperado", A({ acao: "ler_ficha_cris", url: LINK }), "cris_formato_incompativel");

  /* Links: nada sai para a rede quando o link é recusado. */
  pedidos.length = 0;
  ["http://crisordemparanormal.com/agente/abc", "https://crisordemparanormal.com.evil.com/agente/abc", "https://crisordemparanormal.com/campanha/abc",
    "https://crisordemparanormal.com/agente/abc/../../users", "https://crisordemparanormal.com/agente/a%2Fb", "https://evil.com/?u=https://crisordemparanormal.com/agente/abc",
    "https://crisordemparanormal.com/agente/" + "a".repeat(129), "", 42].forEach((url) => {
    t.recusa("link recusado: " + String(url).slice(0, 60), A({ acao: "ler_ficha_cris", url }), "cris_url_invalida");
  });
  t.igual("  nenhum link recusado chegou a consultar", pedidos.length, 0);

  t.recusa("sem sessão não consulta", chamar(globalThis, { acao: "ler_ficha_cris", url: LINK }), "sem_token");

  /* Limite por conta: 20 a cada 5 minutos; a outra conta não é afetada. */
  responder = () => ({ status: 200, corpo: JSON.stringify(documento(jeff)) });
  preparar();
  const c1 = novaConta("cris_c1"), c2 = novaConta("cris_c2");
  const C1 = comoFn(c1), C2 = comoFn(c2);
  let ultimo = null;
  for (let i = 0; i < 20; i++) ultimo = C1({ acao: "ler_ficha_cris", url: LINK });
  t.ok("as 20 primeiras consultas passam", ultimo.ok);
  t.recusa("a 21ª da mesma conta espera", C1({ acao: "ler_ficha_cris", url: LINK }), "cris_limite_temporario");
  t.ok("  outra conta continua consultando", C2({ acao: "ler_ficha_cris", url: LINK }).ok);

  /* A leitura não grava nada nem entra no lote. */
  const lote = C2({ acao: "lote", pedidos: [{ acao: "ler_ficha_cris", url: LINK }] });
  t.ok("ler_ficha_cris não entra no lote", lote.ok && lote.dados.respostas[0].erro === "acao_desconhecida");
  t.ok("consultar não cria personagem", (C2({ acao: "listar_personagens" }).dados || []).length === 0);

  delete globalThis.UrlFetchApp;
}
