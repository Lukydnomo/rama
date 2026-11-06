/* =====================================================================
   R.A.M.A. — testes da página Criaturas e do pedido de acesso (v6.6)
   ---------------------------------------------------------------------
       deno run --allow-read testes/executar-criaturas-pagina.js

   Sem navegador: os geradores por sistema (com um rolador fixo e um
   construtor de elementos mínimo), o menu, o que cada página carrega
   (o catálogo saiu do Homebrew; combate e aliados ganharam os
   geradores compartilhados) e as regras do portão (rota pública própria,
   senha fora do armazenamento do navegador). O backend do pedido tem os
   testes dele em testes/acesso-backend.js (executar-backend).
   ===================================================================== */

globalThis.window = globalThis;
globalThis.document = { currentScript: null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), createTextNode: (t) => ({ texto: t }) };
globalThis.navigator = { onLine: true };
globalThis.location = { search: "" };

const raiz = new URL("../", import.meta.url);
const ler = (c) => Deno.readTextFile(new URL(c, raiz));
for (const c of ["js/config.js", "js/util.js", "js/dados.js", "js/habilidades.js", "js/criaturas.js", "js/ordem/criaturas.js",
  "js/vampiro/catalogo.js", "js/vampiro/disciplinas-dados.js", "js/vampiro/antagonistas-dados.js",
  "js/oblivio/catalogo.js", "js/oblivio/ameacas-dados.js", "js/oblivio/buraco-dados.js", "js/oblivio/regras.js", "js/oblivio/buraco.js",
  "js/goblins/catalogo.js", "js/goblins/dados.js", "js/goblins/mesa.js"]) {
  (0, eval)(await ler(c));
}
/* Um construtor de elementos que só guarda o texto: basta para ler o
   resultado de um gerador. */
const U0 = globalThis.RAMAUtil;
globalThis.RAMAUtil = Object.assign({}, U0, { el: (tag, o, filhos) => ({ tag, texto: (o && o.texto) || "", filhos: filhos || [] }) });
globalThis.RAMAUI = { recolhivel: (o) => ({ titulo: o.titulo }) };
(0, eval)(await ler("js/geradores-criaturas.js"));
const G = globalThis.RAMAGeradoresCriaturas;
globalThis.RAMAUI.painel = (titulo, conteudo) => ({ tag: "section", texto: titulo, filhos: [conteudo] });
(0, eval)(await ler("js/fichas-nativas.js"));
const FN = globalThis.RAMAFichasNativas;
/* Todo o texto de uma árvore do construtor mínimo, em ordem. */
const tudo = (n) => !n ? "" : (typeof n === "string" ? n : [n.texto || ""].concat((n.filhos || []).map(tudo)).filter(Boolean).join(" | "));

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0;
const t = {
  grupo(x) { console.log(`\n${FORTE}${x}${FIM}`); },
  ok(n, c, d) { if (c) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${n}`); } else { falharam++; console.log(`  ${VERMELHO}FALHOU${FIM} ${n}${d ? `  ${CINZA}${d}${FIM}` : ""}`); } },
  igual(n, a, b) { const x = JSON.stringify(a), y = JSON.stringify(b); t.ok(n, x === y, x === y ? "" : `obtido ${x}, esperado ${y}`); },
};
const textos = (nos) => nos.filter(Boolean).map((n) => n.texto).join(" | ");
const fixo = (v) => (faces) => Math.min(faces, v);

t.grupo("Geradores · por sistema, lógica dos próprios sistemas");
t.igual("Ordem: Transtornados, Produção e TV Varminho", G.doSistema("ordem").map((g) => g.id), ["transtornado", "producao", "varminho"]);
t.igual("Oblívio: Encontro do Buraco", G.doSistema("oblivio").map((g) => g.id), ["encontro"]);
t.igual("Goblins: Encontros aleatórios", G.doSistema("goblins").map((g) => g.id), ["encontros"]);
t.igual("Vampiro e Universal: nenhum (estado vazio)", [G.doSistema("vampiro").length, G.doSistema("universal").length], [0, 0]);
const tr = textos(G.doSistema("ordem")[0].sortear(fixo(1), {}));
t.ok("Transtornado: perfil, traços e aparência com os dados", /Perfil: .+\(1d10: 1\)/.test(tr) && /Traços:/.test(tr) && /Aparência:/.test(tr));
t.ok("  é a mesma função do catálogo de Ordem", tr.indexOf(globalThis.RAMAOrdemCriaturas.gerarTranstornado(fixo(1)).perfil) >= 0);
t.ok("Varminho traz a referência da torre", typeof G.doSistema("ordem")[2].referencia === "function");
const ob = textos(G.doSistema("oblivio")[0].sortear(fixo(1), { dificuldade: "facil" }));
t.ok("Oblívio, fácil, 1: Arrastão com 3 Trombadinhas", /Arrastão \(1d6: 1\)/.test(ob) && /3× Trombadinha \(Grau 1/.test(ob));
const gb = textos(G.doSistema("goblins")[0].sortear(fixo(1), { tabela: "viajante" }));
t.ok("Goblins, Viajante com 1+1: a entrada 2 (Dragão) e o grupo resolvido", /Viajante Aleatório \(2d6: 1 \+ 1\)/.test(gb) && /1× /.test(gb));
t.ok("Goblins usa as tabelas do Covil (mesa.tabelas)", !!globalThis.RAMAGoblinsMesa.tabelas().viajante.encontro);

t.grupo("Fichas por sistema (v6.7)");
const K = globalThis.RAMAGoblinsCatalogo;
t.igual("Goblins: 0 é zero, null é —, a Besta é ?", [FN.valorGoblin({}, 0), FN.valorGoblin({}, null), FN.valorGoblin(K.INIMIGOS.besta, 3)], ["0", "—", "?"]);
t.igual("  o bônus da arma e a proteção à parte do valor base", FN.linhaGoblin(K.INIMIGOS.guarda), "Combate 4 (+3) · Vitalidade 3 (+3)");
const guarda = tudo(FN.goblins(K.INIMIGOS.guarda));
t.ok("  o bloco traz +3 arma e +3 proteção como marcas próprias", /Combate \| 4 \| \+3 arma/.test(guarda) && /Vitalidade \| 3 \| \+3 proteção/.test(guarda) && /Lança e Peitoral/.test(guarda));
const carcaca = tudo(FN.oblivio(globalThis.RAMAOblivioAmeacas.ameaca.carcaca));
t.ok("Oblívio: Limite de Estresse e Regiões separados", /Limite de Estresse \| 22/.test(carcaca) && /Regiões \| 4/.test(carcaca));
t.ok("  recompensa da Carcaça como no livro (1 · 2 a 4 · 5 ou 6)", /1 \| Nada/.test(carcaca) && /2 a 4 \| Vestimenta Leve/.test(carcaca) && /5 ou 6 \| Munição/.test(carcaca));
t.ok("  habilidades com o tipo de ação", /Efeito Passivo/.test(carcaca) && /Ação Regular/.test(carcaca));
const AN = globalThis.RAMAVampiroAntagonistas;
const det = tudo(FN.vampiro(AN.porChave("detetive"))), harpia = tudo(FN.vampiro(AN.porChave("harpiaDeElisio"))), lobis = tudo(FN.vampiro(AN.porChave("lobisomem")));
t.ok("V5 compacto (Detetive): paradas padrão e excepcionais, sem Fome", /Paradas de dados padrão/.test(det) && /Investigação 6/.test(det) && !/Fome/.test(det) && !FN.vampiroCompleto(AN.porChave("detetive")));
t.ok("V5 completo (Harpia): atributos por categoria, habilidades, disciplinas, Humanidade e Potência", /Físicos/.test(harpia) && /Disciplinas/.test(harpia) && /Humanidade \| 6/.test(harpia) && /Potência do Sangue \| 3/.test(harpia) && /Fome/.test(harpia));
t.ok("  criatura sem Fome diz o que acontece no lugar (p. 376)", /Não tem: o que seria Checagem/.test(lobis));
const painelJs = await ler("js/criatura-painel.js");
t.ok("Ordem: destaques VD/PV/Defesa/Tipo/Tamanho e colunas números × ações", /destaque\("PV"/.test(painelJs) && /destaque\("Tamanho"/.test(painelJs) && /ficha-colunas__coluna/.test(painelJs));
t.ok("  listas vazias somem (parSeTiver) e a forma se vê na consulta sem gravar", /parSeTiver\("Imunidades"/.test(painelJs) && /formaDeConsulta = x\.id; pintar\(\)/.test(painelJs));

t.grupo("Homebrew: criaturas de outros sistemas (v6.8)");
const CR = globalThis.RAMACriaturas;
const gbH = CR.normalizar({ tipo: "criatura", sistema: "goblins", nome: "Teste", goblins: { combate: 0, nocao: null, habilidade: "?", vitalidade: 4, bonusCombate: 2, protecao: 1, lixo: 9 } });
t.igual("Goblins: 0, — (null) e ? sobrevivem à normalização; campo estranho sai", [gbH.goblins.combate, gbH.goblins.nocao, gbH.goblins.habilidade, "lixo" in gbH.goblins], [0, null, "?", false]);
t.ok("  e de novo, sem mudar nada (idempotente)", JSON.stringify(CR.normalizar(JSON.parse(JSON.stringify(gbH)))) === JSON.stringify(gbH));
const obH = CR.normalizar({ tipo: "criatura", sistema: "oblivio", nome: "A", oblivio: { grau: 9, atributos: { carne: 3 }, habilidades: [{ nome: "Bote", acao: "inventada" }], recompensa: [{ de: 5, ate: 6, texto: "Munição" }] } });
t.igual("Oblívio: grau preso em 1–6, ação desconhecida vira regular, recompensa em texto", [obH.oblivio.grau, obH.oblivio.habilidades[0].acao, obH.oblivio.recompensa[0].texto, obH.oblivio.atributos.mente], [6, "regular", "Munição", 0]);
t.ok("  recompensa com o mesmo número em duas linhas é recusada", CR.validar({ sistema: "oblivio", nome: "A", oblivio: { recompensa: [{ de: 1, ate: 3 }, { de: 3, ate: 4 }] } }).length === 1);
const vcH = CR.normalizar({ tipo: "criatura", sistema: "vampiro", nome: "V", vampiro: { modelo: "completo", natureza: "vampiro", atributos: { forca: 4 }, disciplinas: { auspicios: 2, "x y": 3 } } });
const vpH = CR.normalizar({ tipo: "criatura", sistema: "vampiro", nome: "M", vampiro: { paradas: { fisico: 4 }, excepcionais: { atletismo: 5 } } });
t.ok("Vampiro: os dois modelos (completo com atributos; compacto com paradas)", vcH.vampiro.modelo === "completo" && vcH.vampiro.atributos.forca === 4 && !("x y" in vcH.vampiro.disciplinas) && vpH.vampiro.modelo === "compacto" && vpH.vampiro.paradas.fisico === 4 && !vpH.vampiro.atributos);
t.ok("o sistema é reconhecido (e Universal continua Universal)", CR.sistemaDe(gbH) === "goblins" && CR.ehNativa(vcH) && CR.sistemaDe({ nome: "antiga" }) === "universal" && !CR.ehNativa({ sistema: "universal" }));
t.ok("criar já nasce no formato do sistema", CR.criar({ sistema: "goblins" }).goblins.vitalidade === 1 && CR.criarNativa("vampiro", { modelo: "completo" }).vampiro.modelo === "completo");
const hbJs2 = await ler("js/paginas/homebrew.js");
t.ok("Homebrew: uma opção só, “Criatura”, e o sistema pelas capas", /opcao\("Criatura", /.test(hbJs2) && !/Criatura de Ordem Paranormal"/.test(hbJs2) && !/opcao\("Criatura universal"/.test(hbJs2) && /escolherSistemaDaCriatura/.test(hbJs2) && /RAMACapaSistema/.test(hbJs2));
const bib2 = await ler("js/paginas/criaturas-biblioteca.js");
t.ok("combate e aliados de Ordem deixam os outros sistemas de fora (lista e leitura)", /SISTEMAS_NATIVOS/.test(bib2) && /criatura_de_outro_sistema/.test(bib2));
t.ok("o servidor resume com o sistema da criatura", /\['oblivio', 'vampiro', 'goblins'\]\.indexOf\(d\.sistema\)/.test(await ler("backend/Codigo.gs")));

t.grupo("Menu e páginas");
const app = await ler("js/app.js");
t.ok("Criaturas no menu principal, entre Campanhas e Homebrew", /campanhas\/"[^\n]*\n[^\n]*criaturas\/"[^\n]*\n[^\n]*homebrew\/"/.test(app));
const pag = await ler("criaturas/index.html");
t.ok("a página carrega os catálogos dos quatro sistemas, a biblioteca e os geradores", ["ordem/criaturas.js", "oblivio/ameacas-dados.js", "vampiro/antagonistas-dados.js", "goblins/catalogo.js", "geradores-criaturas.js", "paginas/criaturas-biblioteca.js", "paginas/criaturas.js"].every((x) => pag.includes(x)));
const pjs = await ler("js/paginas/criaturas.js");
t.ok("estante de capas no lugar do select: grupo de rádio com RAMACapaSistema", !/<select|"select\.r-selecao", \{\s*id: idc/.test(pjs) && /role: "radiogroup"/.test(pjs) && /RAMACapaSistema/.test(pjs) && pag.indexOf("capa-sistema.js") > pag.indexOf("js/sistemas.js") && pag.indexOf("capa-sistema.js") < pag.indexOf("paginas/criaturas.js"));
t.ok("  trocar de sistema limpa os filtros e não mexe na seção", /function trocarSistema[\s\S]{0,200}nativo = \{ busca: ""/.test(pjs) && !/function trocarSistema[\s\S]{0,300}estado\.secao =/.test(pjs));
t.ok("  movimento só sem prefers-reduced-motion", /prefers-reduced-motion: no-preference\) \{\s*\.estante-sistemas__opcao \.capa-sistema/.test(await ler("css/componentes.css")));
t.ok("  e não define contexto de suplemento (só consulta)", !(await ler("js/paginas/criaturas.js")).includes("definirContexto"));
const hb = await ler("homebrew/index.html"), hbJs = await ler("js/paginas/homebrew.js");
t.ok("o Homebrew não abre mais o catálogo oficial (aponta para Criaturas)", !hb.includes("criaturas-biblioteca.js") && !hbJs.includes("RAMABibliotecaCriaturas") && hbJs.includes('U.url("criaturas/")'));
t.ok("  e mantém criar, importar e as criaturas personalizadas", /\+ Criar/.test(hbJs) && /Importar/.test(hbJs) && /criatura/.test(hbJs));
for (const p of ["campanha/index.html", "ficha/index.html"]) {
  const h = await ler(p);
  t.ok(p + ": biblioteca e geradores compartilhados", h.indexOf("geradores-criaturas.js") >= 0 && h.indexOf("geradores-criaturas.js") < h.indexOf("criaturas-biblioteca.js"));
}
const bib = await ler("js/paginas/criaturas-biblioteca.js");
t.ok("a biblioteca não tem mais tabela de gerador própria", !/gerarTranstornado|gerarProducao|gerarVarminho/.test(bib) && /RAMAGeradoresCriaturas/.test(bib));
t.ok("  Fonte: Todas as fontes + só as que têm criatura (respeitando os suplementos de lá)", /Todas as fontes/.test(bib) && /fontesComCriaturas/.test(bib) && /fonteLiberada/.test(bib));
t.ok("  Copiar para o Homebrew continua", /Copiar para o Homebrew/.test(bib));

t.grupo("Portão · pedido de acesso");
const auth = await ler("js/auth.js"), api = await ler("js/api.js");
const bloco = auth.slice(auth.indexOf("PEDIDO DE ACESSO (v6.6)"), auth.indexOf("function desenharPortao"));
t.ok("o link abaixo do formulário de login", auth.includes("Não tem login? Solicite um!"));
t.ok("o aviso antes de enviar, com o texto pedido", bloco.includes("A senha provisória será enviada ao Discord para o administrador criar sua conta. Use uma senha exclusiva para o RAMA.") && /UI\.confirmar/.test(bloco));
t.ok("a confirmação só com resp.ok (o Discord aceitou)", /if \(resp && resp\.ok\)[\s\S]{0,400}Pedido enviado\. Aguarde o cadastro da sua conta\./.test(bloco));
t.ok("senha mascarada por padrão, com revelar", /type: "password"[^\n]*acesso-senha|acesso-senha"[^\n]*type: "password"/.test(bloco) && /Revelar senha/.test(bloco));
t.ok("nada no armazenamento do navegador nem no console", !/localStorage|sessionStorage|indexedDB|console\./.test(bloco));
t.ok("clique duplo bloqueado (enviando) e o mesmo id para o mesmo conteúdo", /if \(enviando \|\| entregue\) return;/.test(bloco) && /assin !== assinatura/.test(bloco));
t.ok("rota própria, sem token nem repetição automática", /acao: "solicitar_acesso"/.test(api) && /\{ repetir: false \}/.test(api.slice(api.indexOf("function solicitarAcesso"), api.indexOf("function enviarFeedback"))));
t.ok("o navegador não conhece o webhook", !/discord(app)?\.com|webhooks|RAMA_FEEDBACK_WEBHOOK/i.test(auth + api));
const fbgs = await ler("backend/Feedback.gs");
t.ok("no servidor: pública só a do pedido; o feedback segue protegido", /solicitar_acesso: \{ publica: true/.test(fbgs) && /enviar_feedback: \{ publica: false/.test(fbgs));
t.ok("  regra de usuário igual à de criarUsuario", (await ler("backend/Codigo.gs")).includes("/^[a-z0-9._-]{3,40}$/") && fbgs.includes("/^[a-z0-9._-]{3,40}$/") && bloco.includes("/^[a-z0-9._-]{3,40}$/"));

console.log(`\n${FORTE}${passaram + falharam} verificações${FIM} · ${VERDE}${passaram} ok${FIM} · ${falharam ? VERMELHO : CINZA}${falharam} falhas${FIM}`);
if (falharam) Deno.exit(1);
