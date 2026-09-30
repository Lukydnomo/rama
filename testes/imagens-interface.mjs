/* node testes/imagens-interface.mjs <pacote playwright> [pasta de screenshots]
   RAMA_CHROME indica um Chrome instalado. Toda API é simulada. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, extname, sep } from "node:path";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)(process.argv[2] || "playwright");
const root = fileURLToPath(new URL("../", import.meta.url));
const gif64 = /var gif64 = "([^"]+)"/.exec(await readFile(new URL("imagens.js", import.meta.url), "utf8"))[1];
const gif = Buffer.from(gif64, "base64"), data = "data:image/gif;base64," + gif64;
const server = createServer(async(req,res)=>{
  try {
    let path=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
    if(path.endsWith('/')) path+='index.html';
    const file=resolve(root,'.'+path);
    if(!file.startsWith(root.endsWith(sep)?root:root+sep)) throw Error('fora da raiz');
    res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');
    res.end(await readFile(file));
  } catch {res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,executablePath:process.env.RAMA_CHROME||undefined});
let total=0;
let activePage;
const check=(value,msg)=>{assert.ok(value,msg);total++;};
try {
  for(const width of [1280,390]) {
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    await context.route('**/*',route=>{
      const url=route.request().url();
      if(!url.startsWith(origin)) return route.abort();
      if(url.endsWith('/js/config.js')) return route.fulfill({contentType:'text/javascript',body:'window.RAMA_CONFIG={VERSAO_FORMATO:1};'});
      if(url.endsWith('/js/app.js')) return route.fulfill({contentType:'text/javascript',body:`
        window.RAMAApp={titulo:function(o){return RAMAUtil.el('h1',{texto:o.titulo});},iniciar:async function(_,fn){
          window.RAMASincronia=null; window.GIF_TESTE={salvos:[]};
          RAMAApi.salvarCapaCampanha=async function(id,imagem,largura,altura){GIF_TESTE.salvos.push({imagem,largura,altura});return {ok:true,dados:{existe:true,atualizadoEm:'v1',largura,altura}};};
          await Promise.resolve();
          await fn({id:'dono'}, {}, [{ok:true,rev:1,dados:{id:'mesa',nome:'Teste GIF',papel:'mestre',mestre:true,membros:[],capa:{existe:false}}},{ok:true,dados:{imagem:''}}]);
        }};
      `});
      return route.continue();
    });
    const page=await context.newPage(), errors=[];
    activePage=page;
    page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
    await page.goto(origin+'/testes/imagens.html');
    await page.waitForFunction(()=>window.resultadoImagens);
    const resultado=await page.evaluate(()=>resultadoImagens);
    check(resultado.falhas.length===0,JSON.stringify(resultado.falhas));
    console.log(width+'px: '+resultado.total+' testes de processamento passaram');
    await page.goto(origin+'/campanha/?id=mesa');
    async function escolher(nome,buffer,mimeType='image/gif') {
      const [chooser]=await Promise.all([page.waitForEvent('filechooser'),page.getByRole('button',{name:nome,exact:true}).click()]);
      await chooser.setFiles({name:'teste.'+(mimeType==='image/gif'?'gif':'png'),mimeType,buffer});
    }
    await escolher('+ Adicionar capa',gif);
    let dialog=page.getByRole('dialog').last();
    await dialog.getByRole('button',{name:'Cancelar',exact:true}).waitFor();
    check(await dialog.locator('img').getAttribute('src')===data,'prévia preserva animação original');
    check(await dialog.locator('canvas').count()===0,'GIF não passa pelo recorte que congela a imagem');
    if(process.argv[3]) await page.screenshot({path:resolve(process.argv[3],`capa-gif-${width}.png`)});
    await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();
    check(await page.evaluate(()=>GIF_TESTE.salvos.length)===0,'cancelar não salva');
    await escolher('+ Adicionar capa',gif);
    await page.getByRole('dialog').last().getByRole('button',{name:'Salvar capa',exact:true}).click();
    await page.waitForFunction(()=>GIF_TESTE.salvos.length===1);
    check(await page.evaluate(d=>GIF_TESTE.salvos[0].imagem===d && GIF_TESTE.salvos[0].largura===32 && GIF_TESTE.salvos[0].altura===16,data),'capa salva bytes e dimensões originais');
    check(await page.locator('.campanha-capa__imagem img').getAttribute('src')===data,'capa exibida continua GIF');
    const grande=Buffer.alloc(40000);gif.copy(grande);
    await escolher('Trocar capa',grande);
    await page.getByText(/Para preservar a animação, o GIF precisa/).waitFor();
    check(await page.evaluate(()=>GIF_TESTE.salvos.length)===1,'arquivo excessivo não sobrescreve a capa');
    const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=300;c.height=100;return c.toDataURL('image/png').split(',')[1];});
    await escolher('Trocar capa',Buffer.from(png,'base64'),'image/png');
    dialog=page.getByRole('dialog').last();
    await dialog.locator('canvas').waitFor();
    check(await dialog.getByLabel('Aproximação',{exact:true}).isVisible(),'PNG mantém editor de recorte');
    await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();
    check(errors.length===0,'nenhum erro de interface: '+errors.join(', '));
    await context.close();
  }
  console.log(total+' verificações de interface passaram.');
} catch(e) {
  if(activePage&&!activePage.isClosed()) console.error(await activePage.locator('body').innerText());
  throw e;
} finally {await browser.close();await new Promise(r=>server.close(r));}
