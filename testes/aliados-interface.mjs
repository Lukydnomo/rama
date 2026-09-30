/* Teste de navegador isolado: não acessa contas ou o Apps Script real.
   node testes/aliados-interface.mjs <caminho do pacote playwright> [pasta de imagens]
   RAMA_CHROME pode indicar o executável do Chrome instalado. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, extname, sep } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || "playwright");
const root = fileURLToPath(new URL("../", import.meta.url));
const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (path.endsWith("/")) path += "index.html";
    const file = resolve(root, "." + path);
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) throw Error("fora da raiz");
    res.setHeader("Content-Type", ({ ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml" })[extname(file)] || "application/octet-stream");
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const origin = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({ headless: true, executablePath: process.env.RAMA_CHROME || undefined });
const stub = `
window.RAMAApp = { iniciar: async function(_, iniciar) {
  const tipo = new URLSearchParams(location.search).get('tipo') || 'universal';
  const chave = 'teste-ficha-' + tipo;
  const ler = () => JSON.parse(localStorage.getItem(chave));
  if (!ler()) { const f = RAMAFicha.criarFicha({nome:'Agente inicial',tipoFicha:tipo}); f.campanhaId='mesa'; localStorage.setItem(chave,JSON.stringify(f)); }
  window.TESTE = {ler, historico:[], envios:[], sorteios:0};
  const imagem = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB1kAAAAASUVORK5CYII=';
  const criatura = RAMACriaturas.normalizar({id:'modelo',nome:'Corvo da biblioteca',status:[{id:'vida',nome:'Vida',atual:8,maximo:12}],atributos:[{id:'a',nome:'Agilidade',sigla:'AGI',valor:2,dado:'2d20'}],pericias:[{id:'p',nome:'Voo',atributoId:'a',bonus:5}],ataques:[{id:'b',nome:'Bico',periciaId:'p',dano:'1d6',danoExtra:'2',critico:19,multiplicador:2}]});
  let rev=1;
  Object.assign(RAMAApi, {
    lerPersonagem:async()=>({ok:true,dados:ler(),rev,dono:true}), lerFoto:async()=>({ok:true,dados:{imagem:''}}), listarCampanhas:async()=>({ok:true,dados:[{id:'mesa',nome:'Mesa teste'}]}),
    salvarPersonagem:async(id,r,dados)=>{localStorage.setItem(chave,JSON.stringify(dados));return {ok:true,rev:++rev};},
    listarHomebrew:async()=>({ok:true,dados:[criatura]}), lerHomebrew:async()=>({ok:true,dados:criatura}), lerImagemCriatura:async()=>({ok:true,dados:{imagem}}),
    registrarRolagem:async(id,r)=>{TESTE.envios.push(JSON.parse(JSON.stringify(r))); if(TESTE.falharUma){TESTE.falharUma=false;return {ok:false,erro:'sem_conexao'};} TESTE.historico.push(r);return {ok:true};}
  });
  RAMAImagem.escolher=async()=>({ok:true,imagem});
  await iniciar({id:'dono',nome:'Teste'},{});
}};`;
let checks = 0;
let activePage;
function check(value, message) { assert.ok(value, message); checks++; }
async function fill(locator, value) { await locator.fill(value); await locator.press("Tab"); }
try {
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await context.route("**/*", async route => {
      const url = route.request().url();
      if (!url.startsWith(origin)) return route.abort();
      if (url.endsWith("/js/config.js")) return route.fulfill({ contentType:"text/javascript", body:"window.RAMA_CONFIG={DEBOUNCE_MS:20,VERSAO_FORMATO:1};" });
      if (url.endsWith("/js/app.js")) return route.fulfill({ contentType:"text/javascript", body:stub });
      return route.continue();
    });
    const page = await context.newPage();
    activePage = page;
    const errors=[];
    page.on("pageerror", e => errors.push(e.message));
    for (const tipo of ["universal", "ordem"]) {
      await page.goto(origin + "/ficha/?id=personagem&tipo=" + tipo);
      await page.getByRole("button", {name:"Edição",exact:true}).click();
      if (tipo === "universal") {
        check((await page.evaluate(()=>TESTE.ler().pericias.length))===0,"universal inicia sem perícias");
        await page.getByRole("tab",{name:"Perícias",exact:true}).click();
        check(await page.getByRole("button",{name:"Adicionar perícia",exact:true}).isVisible(),"estado vazio oferece adicionar");
        const before = await page.evaluate(()=>TESTE.ler());
        await page.getByRole("button",{name:"Configurar módulos",exact:true}).click();
        let dialog=page.getByRole("dialog").last();
        for (const checkbox of await dialog.getByRole("checkbox").all()) await checkbox.uncheck();
        await dialog.getByRole("button",{name:"Aplicar",exact:true}).click();
        await page.waitForFunction(()=>TESTE.ler().modulos.aliados===false);
        check(await page.getByRole("tab").count()===1,"ocultar todos deixa apenas Geral");
        check(await page.getByRole("tab",{name:"Geral",exact:true}).getAttribute("aria-selected")==="true","aba oculta cai em Geral");
        await page.reload();
        await page.getByRole("button",{name:"Edição",exact:true}).click();
        check(await page.getByRole("tab").count()===1,"módulos persistem após reload");
        await page.getByRole("button",{name:"Configurar módulos",exact:true}).click();
        dialog=page.getByRole("dialog").last();
        for (const checkbox of await dialog.getByRole("checkbox").all()) await checkbox.check();
        await dialog.getByRole("button",{name:"Aplicar",exact:true}).click();
        await page.waitForFunction(()=>TESTE.ler().modulos.aliados===true);
        const after=await page.evaluate(()=>TESTE.ler());
        check(JSON.stringify(before.atributos)===JSON.stringify(after.atributos),"ocultar não muda atributos");
        check(await page.getByRole("tab").count()===7,"reativar restaura abas");
      } else {
        check(await page.getByRole("button",{name:"Configurar módulos",exact:true}).count()===0,"Ordem não recebe configuração modular");
        check((await page.evaluate(()=>TESTE.ler().pericias.length))>0,"Ordem preserva perícias");
        await fill(page.getByLabel("Nome",{exact:true}).first(),"Agente renomeado");
        await page.waitForFunction(()=>TESTE.ler().nome==='Agente renomeado');
        await page.reload();
        await page.getByRole("button",{name:"Edição",exact:true}).click();
        check(await page.getByLabel("Nome",{exact:true}).first().inputValue()==="Agente renomeado","nome de Ordem persiste");
      }
      await page.getByRole("tab",{name:"Aliados",exact:true}).click();
      await page.getByRole("button",{name:"Criar aliado",exact:true}).click();
      let dialog=page.getByRole("dialog").last();
      await fill(dialog.getByLabel("Nome",{exact:true}).first(),"Companheiro criado");
      await fill(dialog.getByLabel("Máximo",{exact:true}).first(),"12");
      await fill(dialog.getByLabel("Atual",{exact:true}).first(),"8");
      await dialog.getByRole("button",{name:"Imagem",exact:true}).click();
      await dialog.getByRole("button",{name:"Acrescentar em Atributos",exact:true}).click();
      await fill(dialog.getByLabel("Dado",{exact:true}),"2d20");
      await dialog.getByRole("button",{name:"Acrescentar em Perícias",exact:true}).click();
      await fill(dialog.getByLabel("Bônus",{exact:true}),"5");
      await dialog.getByRole("button",{name:"Acrescentar em Ataques",exact:true}).click();
      await dialog.getByLabel("Perícia",{exact:true}).filter({visible:true}).last().selectOption({index:1});
      await fill(dialog.getByLabel("Dano",{exact:true}),"1d6");
      await fill(dialog.getByLabel("Dano extra",{exact:true}),"2");
      await fill(dialog.getByLabel("Crítico",{exact:true}),"19");
      await dialog.getByRole("button",{name:"Acrescentar em Habilidades",exact:true}).click();
      await fill(dialog.getByLabel("Texto",{exact:true}),"Habilidade do companheiro");
      check(await dialog.locator('.r-modal__corpo').evaluate(n=>n.scrollWidth<=n.clientWidth+1),"editor cabe na janela de "+width);
      await dialog.getByRole("button",{name:"Criar",exact:true}).click();
      await page.waitForFunction(()=>TESTE.ler().aliados.length===1);
      check((await page.evaluate(()=>TESTE.ler().aliados[0].criatura.ataques[0].periciaId))!==null,"editor preserva vínculo ataque/perícia");
      for (let i=0;i<2;i++) {
        await page.getByRole("button",{name:"Da biblioteca",exact:true}).click();
        await page.getByRole("dialog").last().getByRole("button",{name:"Corvo da biblioteca",exact:true}).click();
        await page.waitForFunction(n=>TESTE.ler().aliados.length===n,i+2);
      }
      check(await page.locator(".aliados-grade article").count()===3,"criação e duas importações mostram três cartões");
      await page.getByRole("button",{name:"Editar aliado",exact:true}).first().click();
      dialog=page.getByRole("dialog").last();
      await fill(dialog.getByLabel("Nome",{exact:true}).first(),"Companheiro editado");
      await dialog.getByRole("button",{name:"Salvar",exact:true}).click();
      await page.waitForFunction(()=>TESTE.ler().aliados[0].criatura.nome==='Companheiro editado');
      await page.reload();
      await page.getByRole("tab",{name:"Aliados",exact:true}).click();
      check(await page.getByRole("button",{name:"Editar aliado",exact:true}).count()===0,"modo uso reserva estrutura à edição");
      check((await page.evaluate(()=>TESTE.ler().aliados.every(a=>a.imagem.startsWith('data:image/')))),"imagens persistem após reabrir");
      await page.getByRole("button",{name:"Abrir ficha",exact:true}).nth(1).click();
      dialog=page.getByRole("dialog").last();
      await fill(dialog.getByLabel("Vida de Corvo da biblioteca",{exact:true}),"3");
      await page.waitForFunction(()=>TESTE.ler().aliados[1].criatura.status[0].atual===3);
      check((await page.evaluate(()=>TESTE.ler().aliados[2].criatura.status[0].atual))===8,"recursos das cópias independentes");
      await page.evaluate(()=>{TESTE.falharUma=true;RAMADados.usarSorteio(()=>{TESTE.sorteios++;return 3;});});
      await dialog.getByRole("button",{name:"Ataque",exact:true}).click();
      await page.waitForFunction(()=>TESTE.historico.length===1);
      check((await page.evaluate(()=>TESTE.sorteios))===2,"retry do histórico não rola de novo");
      check(await page.evaluate(()=>TESTE.envios.length===2 && TESTE.envios[0].id===TESTE.envios[1].id && JSON.stringify(TESTE.envios[0])===JSON.stringify(TESTE.envios[1])),"retry mantém ID e resultado");
      await dialog.getByRole("button",{name:"Dano",exact:true}).click();
      await dialog.getByRole("button",{name:"Dano crítico",exact:true}).click();
      check(await page.evaluate(()=>TESTE.historico[1].dados.total===5 && TESTE.historico[2].dados.total===8),"dano e crítico usam motor central");
      check(await page.evaluate(()=>TESTE.historico.every(r=>r.nome.startsWith('Corvo da biblioteca'))),"rolagens identificam aliado");
      check(await dialog.locator('.rolagem').isVisible(),"resultado aparece dentro da janela do aliado");
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"ficha cabe na largura de "+width);
      if(process.argv[3]) await page.screenshot({path:resolve(process.argv[3],`aliados-${tipo}-${width}.png`)});
      await dialog.getByRole("button",{name:"Fechar",exact:true}).last().click();
      await page.getByRole("button",{name:"Edição",exact:true}).click();
      await page.locator('.aliados-grade').getByRole("button",{name:"Remover",exact:true}).first().click();
      await page.getByRole("dialog").last().getByRole("button",{name:"Cancelar",exact:true}).click();
      check(await page.locator(".aliados-grade article").count()===3,"cancelar remoção preserva aliado");
      await page.locator('.aliados-grade').getByRole("button",{name:"Remover",exact:true}).first().click();
      await page.getByRole("dialog").last().getByRole("button",{name:"Remover aliado",exact:true}).click();
      await page.waitForFunction(()=>TESTE.ler().aliados.length===2);
      check(await page.locator(".aliados-grade article").count()===2,"confirmar remove só um aliado");
      console.log(`${tipo} ${width}px: OK`);
    }
    check(errors.length===0,"nenhum erro de JavaScript: "+errors.join(", "));
    if(width===1280) {
      await page.evaluate(()=>{
        const f=RAMAFicha.normalizarFicha(TESTE.ler());
        const ctx={ficha:f,emEdicao:()=>true,podeEditar:()=>true,alterou:()=>{},redesenhar:()=>RAMAUtil.trocar(document.querySelector('#ficha'),[RAMASecaoAliados.aba(ctx)])};
        TESTE.ctx=ctx;ctx.redesenhar();
      });
      await page.getByRole('button',{name:'Editar aliado',exact:true}).first().click();
      await fill(page.getByRole('dialog').last().getByLabel('Nome',{exact:true}).first(),'Escolha local');
      await page.evaluate(()=>{TESTE.ctx.ficha.aliados[0].criatura.nome='Escolha remota';TESTE.ctx.ficha.aliados[0].criatura.status[0].atual=7;});
      await page.getByRole('dialog').last().getByRole('button',{name:'Salvar',exact:true}).click();
      await page.getByRole('dialog').last().getByRole('button',{name:'Usar tudo deste aparelho',exact:true}).click();
      await page.waitForFunction(()=>TESTE.ctx.ficha.aliados[0].criatura.nome==='Escolha local');
      check(await page.evaluate(()=>TESTE.ctx.ficha.aliados[0].criatura.status[0].atual===7),'resolver conflito de nome preserva recurso atualizado por outro usuário');
      check(await page.getByRole('dialog').count()===0,'resolver conflito conclui edição sem janela órfã');
      await page.goto(origin+'/testes/');
      await page.waitForFunction(()=>document.title.startsWith('Tudo passando'));
      check(true,'suíte de modelos também passa no navegador');
      await page.goto(origin+'/testes/janelas.html');
      check(await page.evaluate(()=>resultadoJanelas.total===21 && resultadoJanelas.falhas.length===0),'21 regressões de confirmação das janelas');
    }
    await context.close();
  }
  console.log(`${checks} verificações de interface passaram.`);
} catch(e) {
  if (activePage && !activePage.isClosed()) {
    console.error(await activePage.locator('body').innerText());
    if(process.argv[3]) await activePage.screenshot({path:resolve(process.argv[3],'aliados-falha.png'),fullPage:true});
  }
  throw e;
} finally { await browser.close(); await new Promise(r=>server.close(r)); }
