/* =====================================================================
   R.A.M.A. — testes do ambiente de testes local (servidor com --dados)
   ---------------------------------------------------------------------
       deno run --allow-run --allow-read --allow-write --allow-net --allow-env testes/executar-servidor-testes.js

   Sobe o testes/servidor-local.js de verdade, numa pasta temporária e
   em portas próprias (8141–8144), e confere o que o ambiente promete:
   fichas, inventário, aliado e compartilhamentos que sobrevivem a
   derrubar e subir o servidor; uma instância por arquivo de dados;
   porta ocupada por outro programa; gravação interrompida; arquivo
   ilegível e formato mais novo preservados; restaurar pelo navegador e
   pela linha de comando; e o modo medição, que não grava nada.
   Dados sintéticos. Não toca em testes/dados-locais.
   ===================================================================== */

const VERDE = "\x1b[32m", VERMELHO = "\x1b[31m", CINZA = "\x1b[90m", FORTE = "\x1b[1m", FIM = "\x1b[0m";
let passaram = 0, falharam = 0; const falhas = [];
const t = {
  grupo(x) { console.log(`\n${FORTE}${x}${FIM}`); },
  ok(nome, c, d) { if (c) { passaram++; console.log(`  ${VERDE}ok${FIM}   ${nome}`); } else { falharam++; falhas.push(nome); console.log(`  ${VERMELHO}FALHOU${FIM} ${nome}${d ? `  ${CINZA}${d}${FIM}` : ""}`); } },
};

const SERVIDOR = decodeURIComponent(new URL("./servidor-local.js", import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");
const PASTA = await Deno.makeTempDir({ prefix: "rama-testes-" });
const DADOS = PASTA + "/estado.json";
const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
const existe = async (p) => { try { await Deno.stat(p); return true; } catch { return false; } };

function subir(porta, extras, opcoes) {
  const o = opcoes || {};
  const args = ["run", "--allow-read", "--allow-write=" + PASTA, "--allow-net=127.0.0.1", "--allow-env", SERVIDOR, "--porta", String(porta)]
    .concat(o.semDados ? [] : ["--dados", DADOS]).concat(extras || []);
  const filho = new Deno.Command(Deno.execPath(), { args, stdin: "null", stdout: "piped", stderr: "piped" }).spawn();
  const saida = { texto: "" };
  const ler = async (fluxo) => { const d = new TextDecoder(); for await (const c of fluxo) saida.texto += d.decode(c); };
  const lendo = Promise.all([ler(filho.stdout), ler(filho.stderr)]);
  return { filho, saida, porta, fim: filho.status.then(async (s) => { await lendo; return s; }) };
}
async function pronto(s) {
  for (let i = 0; i < 240; i++) {
    const acabou = await Promise.race([s.fim.then(() => true), esperar(250).then(() => false)]);
    if (acabou) return false;
    try { const r = await fetch(`http://127.0.0.1:${s.porta}/__rama`); if (r.ok) { await r.body?.cancel(); return true; } } catch { /* ainda não */ }
  }
  return false;
}
async function derrubar(s) { try { s.filho.kill("SIGKILL"); } catch { /* já saiu */ } await s.fim; }
const como = (s, conta, corpo) => fetch(`http://127.0.0.1:${s.porta}/__como?conta=${conta}`, { method: "POST", body: JSON.stringify(corpo) }).then((r) => r.json());
const ids = (s) => fetch(`http://127.0.0.1:${s.porta}/__ids`).then((r) => r.json());

console.log(`${FORTE}R.A.M.A. — ambiente de testes local${FIM}  ${CINZA}${PASTA}${FIM}`);

/* --- 1. primeira partida e trabalho do dia --- */
t.grupo("Primeira partida, ficha nova, inventário, aliado e compartilhamentos");
let s = subir(8141);
t.ok("sobe e responde", await pronto(s), s.saida.texto);
t.ok("começa com os dados fictícios (novo)", /\(novo\)/.test(s.saida.texto), s.saida.texto);
t.ok("o arquivo de dados existe", await existe(DADOS));
const ident = await fetch("http://127.0.0.1:8141/__rama").then((r) => r.json());
t.ok("/__rama diz a pasta do projeto e o arquivo", ident.rama === "servidor-de-testes" && /rama/i.test(ident.raiz) && /estado\.json$/.test(ident.dados));
const inicio = await ids(s);
const base = (await como(s, "dona", { acao: "ler_personagem", personagemId: inicio.ordem })).dados;
const nova = JSON.parse(JSON.stringify(base));
nova.nome = "Ficha persistente";
nova.aliados = [{ id: "aliado-teste-1", tipo: "companheiro", origemId: null, imagem: "", companheiro: { nome: "Bóris", especie: "cão", porteInicial: "medio" } }];
const criada = await como(s, "dona", { acao: "criar_personagem", dados: nova });
t.ok("dona cria a ficha", criada.ok, JSON.stringify(criada).slice(0, 200));
const pid = criada.dados.id;
let lida = await como(s, "dona", { acao: "ler_personagem", personagemId: pid });
const chaveInv = lida.dados.inventario ? "inventario" : null;
if (chaveInv) lida.dados.inventario = (Array.isArray(lida.dados.inventario) ? lida.dados.inventario : []).concat([{ id: "item-teste-1", nome: "Lanterna de teste", quantidade: 3 }]);
lida.dados.aliados[0].companheiro.nome = "Bóris II";
lida.dados.anotacoesTeste = undefined;
const salvo = await como(s, "dona", { acao: "salvar_personagem", personagemId: pid, rev: lida.rev, dados: lida.dados });
t.ok("dona altera inventário e aliado", salvo.ok, JSON.stringify(salvo).slice(0, 200));
const comp = await como(s, "dona", { acao: "listar_compartilhamentos", personagemId: pid });
const partes = await ids(s);
const comp2 = await como(s, "dona", { acao: "salvar_compartilhamentos", personagemId: pid, versao: comp.dados.versao, acessos: [
  { userId: partes.contas.editora, papel: "editor" }, { userId: partes.contas.leitora, papel: "leitor" }] });
t.ok("dona compartilha (editora edita, leitora lê)", comp2.ok, JSON.stringify(comp2).slice(0, 200));
await esperar(900);
await derrubar(s);
t.ok("derrubado à força, sem trava órfã que impeça a próxima partida", true);

/* --- 2. reabrir --- */
t.grupo("Fechar e abrir de novo");
s = subir(8141);
t.ok("sobe de novo", await pronto(s), s.saida.texto);
t.ok("carrega os dados guardados (carregado)", /\(carregado\)/.test(s.saida.texto), s.saida.texto);
lida = await como(s, "dona", { acao: "ler_personagem", personagemId: pid });
t.ok("a ficha continua lá, com o nome", lida.ok && lida.dados.nome === "Ficha persistente");
t.ok("o aliado continua com a mudança", lida.ok && lida.dados.aliados[0].companheiro.nome === "Bóris II");
if (chaveInv) t.ok("o inventário continua com o item", lida.dados.inventario.some((i) => i.nome === "Lanterna de teste" && i.quantidade === 3));
const pelaEditora = await como(s, "editora", { acao: "ler_personagem", personagemId: pid });
pelaEditora.dados.nome = "Editada pela editora";
t.ok("editora ainda salva (compartilhamento guardado)", (await como(s, "editora", { acao: "salvar_personagem", personagemId: pid, rev: pelaEditora.rev, dados: pelaEditora.dados })).ok);
const pelaLeitora = await como(s, "leitora", { acao: "ler_personagem", personagemId: pid });
t.ok("leitora ainda lê", pelaLeitora.ok);
t.ok("leitora continua sem poder salvar", !(await como(s, "leitora", { acao: "salvar_personagem", personagemId: pid, rev: pelaLeitora.rev, dados: pelaLeitora.dados })).ok);
const entrar = await fetch("http://127.0.0.1:8141/__entrar?conta=leitora&para=/personagens/").then((r) => r.text());
t.ok("/__entrar abre a sessão da conta escolhida", /rama\.sessao\.token/.test(entrar) && /leitora/.test(entrar));
const pagina = await fetch("http://127.0.0.1:8141/__testes").then((r) => r.text());
t.ok("/__testes oferece as quatro contas e o restaurar", ["dona", "editora", "leitora", "mestre"].every((c) => pagina.includes("conta=" + c)) && /Restaurar dados de teste/.test(pagina));
const config = await fetch("http://127.0.0.1:8141/js/config.js").then((r) => r.text());
t.ok("o site fala com este servidor", config.includes('API_URL: "http://127.0.0.1:8141/exec"'));

/* --- 3. uma instância por arquivo, porta ocupada --- */
t.grupo("Uma instância por arquivo de dados; porta ocupada");
const segunda = subir(8142);
const sSeg = await segunda.fim;
t.ok("segunda instância nos mesmos dados é recusada", sSeg.code === 3 && /já está usando estes dados/.test(segunda.saida.texto), segunda.saida.texto);
const mesmaPorta = subir(8141, [], { semDados: true });
const sMesma = await mesmaPorta.fim;
t.ok("na porta do próprio servidor de testes: avisa que já está aberto", sMesma.code === 6 && /já está aberto/.test(mesmaPorta.saida.texto), mesmaPorta.saida.texto);
const intruso = Deno.listen({ hostname: "127.0.0.1", port: 8143 });
const naOcupada = subir(8143, [], { semDados: true });
const sOc = await naOcupada.fim;
intruso.close();
t.ok("porta de outro programa: explica e sugere outra porta", sOc.code === 6 && /outro programa/.test(naOcupada.saida.texto) && /--porta/.test(naOcupada.saida.texto), naOcupada.saida.texto);

/* --- 4. restaurar pelo navegador --- */
t.grupo("Restaurar pelo navegador");
const semCabecalho = await fetch("http://127.0.0.1:8141/__restaurar", { method: "POST" });
t.ok("sem o cabeçalho próprio, recusa", semCabecalho.status === 400);
await semCabecalho.body?.cancel();
t.ok("recusar não mexe nos dados", (await como(s, "dona", { acao: "ler_personagem", personagemId: pid })).ok);
const rest = await fetch("http://127.0.0.1:8141/__restaurar", { method: "POST", headers: { "x-rama-testes": "restaurar" } }).then((r) => r.json());
t.ok("restaura", rest.ok, JSON.stringify(rest));
t.ok("cópia de antes de restaurar guardada", await existe(PASTA + "/estado.antes-de-restaurar.json"));
const lista = await como(s, "dona", { acao: "listar_personagens" });
t.ok("volta às duas fichas iniciais da dona", lista.ok && lista.dados.length === 2 && !lista.dados.some((p) => p.id === pid), JSON.stringify(lista).slice(0, 200));
await esperar(500);
await derrubar(s);

/* --- 5. gravação interrompida --- */
t.grupo("Gravação interrompida");
s = subir(8141);
await pronto(s);
const antesDaQueda = (await ids(s)).ordem;
await como(s, "dona", { acao: "criar_personagem", dados: Object.assign(JSON.parse(JSON.stringify(base)), { nome: "Depois da restauração" }) });
await esperar(900);
await derrubar(s);
/* Como se tivesse caído entre as duas trocas de nome: o principal saiu
   para .anterior e o .tmp completo ainda não entrou no lugar. */
await Deno.copyFile(DADOS, DADOS + ".tmp");
await Deno.remove(DADOS);
s = subir(8141);
t.ok("sobe", await pronto(s), s.saida.texto);
t.ok("recupera a gravação interrompida", /recuperei/.test(s.saida.texto), s.saida.texto);
t.ok("com os dados dela", (await como(s, "dona", { acao: "listar_personagens" })).dados.some((p) => p.nome === "Depois da restauração") && (await ids(s)).ordem === antesDaQueda);
await esperar(300);
await derrubar(s);

/* --- 6. arquivo ilegível e formato mais novo --- */
t.grupo("Arquivo ilegível e formato mais novo");
const bom = await Deno.readTextFile(DADOS);
await Deno.writeTextFile(DADOS, bom.slice(0, 5000));
const quebrado = await Deno.readFile(DADOS);
const s6 = subir(8141);
const st6 = await s6.fim;
t.ok("ilegível: não sobe e explica", st6.code === 5 && /não é JSON válido/.test(s6.saida.texto) && /NÃO foi apagado/.test(s6.saida.texto), s6.saida.texto);
t.ok("ilegível: oferece o estado anterior", /usar o estado válido anterior/.test(s6.saida.texto));
t.ok("ilegível: arquivo intacto", (await Deno.readFile(DADOS)).length === quebrado.length);
t.ok("ilegível: sem trava esquecida", !(await existe(DADOS + ".lock")));
const novo = JSON.parse(bom); novo.versao = 99;
await Deno.writeTextFile(DADOS, JSON.stringify(novo));
const s7 = subir(8141);
const st7 = await s7.fim;
t.ok("formato mais novo: recusa e explica", st7.code === 5 && /servidor de testes mais novo/.test(s7.saida.texto), s7.saida.texto);
t.ok("formato mais novo: arquivo intacto", JSON.parse(await Deno.readTextFile(DADOS)).versao === 99);

/* --- 7. restaurar pela linha de comando --- */
t.grupo("Restaurar pela linha de comando (--restaurar)");
const r8 = subir(8141, ["--restaurar"]);
const st8 = await r8.fim;
t.ok("restaura e sai", st8.code === 0 && /restaurados/.test(r8.saida.texto), r8.saida.texto);
t.ok("o arquivo de antes ficou guardado", JSON.parse(await Deno.readTextFile(PASTA + "/estado.antes-de-restaurar.json")).versao === 99);
s = subir(8141);
await pronto(s);
t.ok("depois, os dados fictícios iniciais", (await como(s, "dona", { acao: "listar_personagens" })).dados.length === 2);
await derrubar(s);

/* --- 8. modo medição --- */
t.grupo("Modo medição (sem --dados)");
const antes = [...Deno.readDirSync(PASTA)].map((e) => e.name).sort().join(",");
s = subir(8144, [], { semDados: true });
t.ok("sobe", await pronto(s), s.saida.texto);
t.ok("avisa que é só memória", /só na memória/.test(s.saida.texto));
t.ok("tem os ids iniciais", !!(await ids(s)).ordem);
await derrubar(s);
t.ok("não grava nada", [...Deno.readDirSync(PASTA)].map((e) => e.name).sort().join(",") === antes);

await Deno.remove(PASTA, { recursive: true }).catch(() => {});
console.log(`\n${FORTE}${passaram} ok${FIM}${falharam ? `, ${VERMELHO}${falharam} falharam${FIM}: ${falhas.join("; ")}` : ""}`);
if (falharam) Deno.exit(1);
