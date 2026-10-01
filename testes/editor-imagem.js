/* =====================================================================
   R.A.M.A. — testes do editor de imagem no navegador (v2.27)
   Abra testes/editor-imagem.html. Usa o modal, o canvas e a codificação
   reais, com imagens sintéticas; o envio é um dublê que só anota.
   ===================================================================== */
(function () {
  "use strict";
  var E = window.RAMAEditorImagem;
  var RI = window.RAMAImagem;
  var resultados = [];

  function ok(nome, condicao, detalhe) {
    resultados.push({ nome: nome, passou: !!condicao, detalhe: detalhe || "" });
    var li = document.createElement("li");
    li.textContent = (condicao ? "OK · " : "FALHOU · ") + nome + (condicao || !detalhe ? "" : " — " + detalhe);
    document.querySelector("#saida").appendChild(li);
  }
  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function ate(cond, limite) {
    var fim = Date.now() + (limite || 4000);
    while (Date.now() < fim) { var v = cond(); if (v) return v; await esperar(25); }
    return null;
  }
  function topo() { var f = document.querySelectorAll(".r-fundo"); return f[f.length - 1] || null; }
  function botao(rotulo) {
    var t = topo();
    return t ? Array.from(t.querySelectorAll("button")).filter(function (b) { return b.textContent.trim() === rotulo; })[0] : null;
  }
  function faixa(rotulo) {
    var t = topo();
    var l = t && Array.from(t.querySelectorAll("label")).filter(function (x) { return x.textContent === rotulo; })[0];
    return l ? document.getElementById(l.getAttribute("for")) : null;
  }
  function mexer(entrada, valor) { entrada.value = String(valor); entrada.dispatchEvent(new Event("input", { bubbles: true })); }
  function esc() { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); }

  function tela(w, h, desenhar) {
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    desenhar(c.getContext("2d"), w, h);
    return c;
  }
  async function arquivo(c, tipo, nome) {
    var blob = await new Promise(function (r) { c.toBlob(r, tipo || "image/png", 0.95); });
    return new File([blob], nome || "teste.png", { type: tipo || "image/png" });
  }
  async function pixels(dataUrl) {
    var img = new Image();
    await new Promise(function (r, f) { img.onload = r; img.onerror = f; img.src = dataUrl; });
    var c = tela(img.naturalWidth, img.naturalHeight, function (x) { x.drawImage(img, 0, 0); });
    return { w: c.width, h: c.height, ler: function (px, py) {
      return Array.from(c.getContext("2d").getImageData(Math.min(c.width - 1, Math.floor(px * c.width)), Math.min(c.height - 1, Math.floor(py * c.height)), 1, 1).data);
    } };
  }
  function parecido(a, b, t) { return Math.abs(a[0] - b[0]) <= t && Math.abs(a[1] - b[1]) <= t && Math.abs(a[2] - b[2]) <= t; }
  function vermelho(p) { return p[0] > 170 && p[1] < 90 && p[2] < 90; }

  /* Uma imagem com um "rosto" vermelho fora do centro e quadrantes de cor. */
  function cena(w, h, rx, ry) {
    return tela(w, h, function (c) {
      c.fillStyle = "#2050c0"; c.fillRect(0, 0, w / 2, h / 2);
      c.fillStyle = "#20a050"; c.fillRect(w / 2, 0, w / 2, h / 2);
      c.fillStyle = "#e0c020"; c.fillRect(0, h / 2, w / 2, h / 2);
      c.fillStyle = "#909090"; c.fillRect(w / 2, h / 2, w / 2, h / 2);
      c.fillStyle = "#e01010"; c.beginPath(); c.arc(rx, ry, Math.min(w, h) * 0.08, 0, Math.PI * 2); c.fill();
    });
  }

  /* Abre o editor com um arquivo e devolve { promessa, janela }. */
  async function abrir(arq, destino, opcoes) {
    var promessa = E.abrirArquivo(arq, destino, opcoes);
    var janela = await ate(function () { var t = topo(); return t && (t.querySelector(".editor-imagem") || t.querySelector(".editor-imagem__gif") || (botao("Recortar como imagem estática") && t)) ? t : null; });
    return { promessa: promessa, janela: janela };
  }

  async function executar() {
    resultados = [];
    document.querySelector("#saida").textContent = "";
    try {
      /* 1. Horizontal, rosto fora do centro, zoom e posição, prévia = salvo */
      var enviados = [];
      var aberto = await abrir(await arquivo(cena(800, 400, 700, 100)), "avatar", {
        aoUsar: async function (img) { enviados.push(img); await esperar(150); return { ok: true }; },
      });
      ok("abre o editor com palco, miniatura e controles", aberto.janela && aberto.janela.querySelector("canvas.editor-imagem__tela") &&
        aberto.janela.querySelector(".editor-imagem__miniatura") && faixa("Zoom") && faixa("Posição horizontal"));
      ok("o foco vai para o palco do enquadramento", document.activeElement && document.activeElement.classList.contains("editor-imagem__tela"));
      ok("nada foi enviado ao abrir", enviados.length === 0);
      ok("horizontal começa no quadrado central (posição 50%)", Number(faixa("Posição horizontal").value) === 50 && faixa("Posição vertical").disabled);
      mexer(faixa("Zoom"), 300);
      ok("o zoom libera a posição vertical", !faixa("Posição vertical").disabled);
      mexer(faixa("Posição horizontal"), 100);
      mexer(faixa("Posição vertical"), 0);
      await esperar(80);
      var mini = aberto.janela.querySelector(".editor-imagem__miniatura");
      var cm = mini.getContext("2d");
      function miniPx(px, py) { return Array.from(cm.getImageData(Math.floor(px * mini.width), Math.floor(py * mini.height), 1, 1).data); }
      ok("a miniatura mostra o rosto no recorte", vermelho(miniPx(0.25, 0.75)));
      var antesMini = [[0.25, 0.75], [0.9, 0.2], [0.1, 0.1], [0.75, 0.75]].map(function (p) { return miniPx(p[0], p[1]); });
      var usar = botao("Usar imagem");
      usar.click(); usar.click(); botao("Usar imagem") && botao("Usar imagem").click();
      ok("durante o envio o botão fica ocupado", usar.getAttribute("aria-busy") === "true");
      ok("Escape não fecha durante o envio", (esc(), !!topo() && !!topo().querySelector(".editor-imagem")));
      var r1 = await aberto.promessa;
      ok("confirmação dupla envia uma vez só", enviados.length === 1);
      ok("o resultado é 1:1 e com no máximo 256 px", r1.ok && r1.largura === r1.altura && r1.largura <= 256 && !r1.gif);
      var p1 = await pixels(r1.imagem);
      ok("o arquivo salvo tem o rosto onde a prévia mostrava", vermelho(p1.ler(0.25, 0.75)));
      var iguais = [[0.25, 0.75], [0.9, 0.2], [0.1, 0.1], [0.75, 0.75]].every(function (p, i) { return parecido(p1.ler(p[0], p[1]), antesMini[i], 40); });
      ok("prévia e arquivo salvo coincidem ponto a ponto", iguais);
      ok("o editor fecha e não deixa janela para trás", !topo());

      /* 2. Arrastar, pinça e redefinir */
      aberto = await abrir(await arquivo(cena(600, 900, 300, 450)), "retrato");
      ok("vertical começa no quadrado central", Number(faixa("Posição vertical").value) === 50 && faixa("Posição horizontal").disabled);
      var palco = aberto.janela.querySelector(".editor-imagem__tela");
      var caixa = palco.getBoundingClientRect();
      function ponteiro(tipo, id, x, y) {
        palco.dispatchEvent(new PointerEvent(tipo, { bubbles: true, cancelable: true, pointerId: id, pointerType: "touch", clientX: x, clientY: y, isPrimary: id === 1 }));
      }
      var cx = caixa.left + caixa.width / 2, cy = caixa.top + caixa.height / 2;
      ponteiro("pointerdown", 1, cx, cy); ponteiro("pointermove", 1, cx, cy + 120); ponteiro("pointerup", 1, cx, cy + 120);
      ok("arrastar a imagem para baixo sobe o recorte", Number(faixa("Posição vertical").value) < 50);
      ponteiro("pointerdown", 1, cx - 20, cy); ponteiro("pointerdown", 2, cx + 20, cy);
      ponteiro("pointermove", 2, cx + 80, cy); ponteiro("pointerup", 1, cx - 20, cy); ponteiro("pointerup", 2, cx + 80, cy);
      ok("a pinça com dois dedos aumenta o zoom", Number(faixa("Zoom").value) > 100);
      palco.focus();
      palco.dispatchEvent(new KeyboardEvent("keydown", { key: "+", bubbles: true }));
      ok("teclado: + aumenta o zoom", Number(faixa("Zoom").value) > 110);
      botao("Redefinir enquadramento").click();
      ok("redefinir volta ao zoom 100% e ao centro", Number(faixa("Zoom").value) === 100 && Number(faixa("Posição vertical").value) === 50);
      botao("Cancelar").click();
      var r2 = await aberto.promessa;
      ok("cancelar devolve 'cancelado' sem imagem", !r2.ok && r2.erro === "cancelado" && !r2.imagem);

      /* 3. Dentro de outro modal: Escape fecha só o editor */
      var nome = window.RAMAUtil.el("input.r-entrada", { value: "Personagem em criação", "aria-label": "Nome" });
      var formulario = window.RAMAUI.modal({ titulo: "Novo personagem", conteudo: nome });
      aberto = await abrir(await arquivo(cena(400, 400, 200, 200)), "retrato");
      esc();
      var r3 = await aberto.promessa;
      ok("Escape cancela só o editor", !r3.ok && r3.erro === "cancelado");
      ok("o formulário de baixo continua aberto e preenchido", !!formulario.janela.isConnected && nome.value === "Personagem em criação");
      formulario.fechar();

      /* 4. Quadrada: sem folga */
      aberto = await abrir(await arquivo(cena(512, 512, 256, 256)), "criatura");
      ok("quadrada: posições travadas no zoom 100%", faixa("Posição horizontal").disabled && faixa("Posição vertical").disabled);
      botao("Usar imagem").click();
      var r4 = await aberto.promessa;
      ok("quadrada: 256 × 256 sem envio (rascunho)", r4.ok && r4.largura === 256 && r4.altura === 256);

      /* 5. Transparência */
      var transparente = tela(300, 300, function (c) { c.fillStyle = "#e01010"; c.fillRect(100, 100, 100, 100); });
      aberto = await abrir(await arquivo(transparente), "avatar");
      botao("Usar imagem").click();
      var r5 = await aberto.promessa;
      var p5 = await pixels(r5.imagem);
      ok("transparência: formato que guarda alfa (WebP ou PNG), nunca JPEG", r5.ok && /^data:image\/(webp|png)/.test(r5.imagem) && r5.transparente);
      ok("transparência: o canto continua transparente, sem fundo preto", p5.ler(0.02, 0.02)[3] === 0);
      ok("transparência: o centro opaco continua vermelho", vermelho(p5.ler(0.5, 0.5)) && p5.ler(0.5, 0.5)[3] === 255);

      /* 6. Orientação EXIF (foto de celular deitada) */
      var deitada = tela(40, 20, function (c) { c.fillStyle = "#e01010"; c.fillRect(0, 0, 20, 20); c.fillStyle = "#1030e0"; c.fillRect(20, 0, 20, 20); });
      var jpeg = new Uint8Array(await (await arquivo(deitada, "image/jpeg", "c.jpg")).arrayBuffer());
      var tiff = [0x4D, 0x4D, 0, 0x2A, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0];
      var exif = [0x45, 0x78, 0x69, 0x66, 0, 0].concat(tiff);
      var app1 = [0xFF, 0xE1, (exif.length + 2) >> 8, (exif.length + 2) & 255].concat(exif);
      var comExif = new Uint8Array(jpeg.length + app1.length);
      comExif.set(jpeg.slice(0, 2)); comExif.set(app1, 2); comExif.set(jpeg.slice(2), 2 + app1.length);
      var aberta = await RI.decodificar(new File([comExif], "celular.jpg", { type: "image/jpeg" }));
      ok("orientação do celular aplicada: 40×20 deitada abre 20×40 em pé", aberta.ok && aberta.largura === 20 && aberta.altura === 40,
        aberta.ok ? aberta.largura + "×" + aberta.altura : aberta.mensagem);
      if (aberta.ok) {
        var girada = tela(20, 40, function (c) { c.drawImage(aberta.origem, 0, 0); });
        var topoPx = Array.from(girada.getContext("2d").getImageData(10, 8, 1, 1).data);
        ok("  e girada no sentido certo (a metade vermelha vai para cima)", vermelho(topoPx));
        aberta.origem.close && aberta.origem.close();
      }

      /* 7. GIF animado: original preservado ou conversão explícita */
      var gif64 = "R0lGODlhIAAQAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQICgAAACwAAAAAIAAQAAAIJwABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjxADAgAh+QQIFAAAACwAAAAAIAAQAIEAAP8AAAAAAAAAAAAIJwABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjxADAgA7";
      var bytesGif = Uint8Array.from(atob(gif64), function (c) { return c.charCodeAt(0); });
      var dataGif = "data:image/gif;base64," + gif64;
      var gifsEnviados = [];
      aberto = await abrir(new File([bytesGif], "animado.gif", { type: "image/gif" }), "capa", {
        aoUsar: async function (img) { gifsEnviados.push(img); return { ok: true }; },
      });
      ok("GIF abre a escolha, sem canvas de recorte", !!botao("Usar GIF original") && !!botao("Recortar como imagem estática") && !topo().querySelector("canvas"));
      ok("a prévia é o GIF original animado", topo().querySelector(".editor-imagem__gif img").getAttribute("src") === dataGif);
      botao("Usar GIF original").click();
      var r7 = await aberto.promessa;
      ok("GIF original: bytes e medidas intactos", r7.ok && r7.gif && r7.imagem === dataGif && r7.largura === 32 && r7.altura === 16 && gifsEnviados.length === 1);
      aberto = await abrir(new File([bytesGif], "animado.gif", { type: "image/gif" }), "avatar");
      botao("Recortar como imagem estática").click();
      await ate(function () { return topo() && topo().querySelector(".editor-imagem"); });
      ok("conversão só por escolha: o editor avisa que vira imagem estática", /estática/.test(topo().querySelector(".editor-imagem__aviso").textContent) && !!topo().querySelector(".editor-imagem__miniatura"));
      botao("Usar imagem").click();
      var r7b = await aberto.promessa;
      ok("conversão explícita entrega imagem estática", r7b.ok && !r7b.gif && r7b.convertidoDeGif && /^data:image\/(webp|png|jpeg)/.test(r7b.imagem));
      var grande = new Uint8Array(RI.MAX_GIF + 500); grande.set(bytesGif);
      aberto = await abrir(new File([grande], "grande.gif", { type: "image/gif" }), "avatar");
      ok("GIF grande: sem 'Usar GIF original', com o motivo e a conversão oferecida",
        !botao("Usar GIF original") && !!botao("Recortar como imagem estática") && /Para preservar a animação/.test(topo().textContent));
      botao("Cancelar").click();
      ok("cancelar o GIF não entrega nada", !(await aberto.promessa).ok);

      /* 8. Documento: inteira por padrão, recorte livre */
      aberto = await abrir(await arquivo(cena(1600, 400, 1400, 100)), "documento");
      ok("documento começa em 'Imagem inteira', sem controles", botao("Imagem inteira").getAttribute("aria-pressed") === "true" && topo().querySelector(".editor-imagem__controles").hidden);
      botao("Usar imagem").click();
      var r8 = await aberto.promessa;
      ok("imagem inteira: 1024 × 256, nada cortado nem quadrado forçado", r8.ok && r8.largura === 1024 && r8.altura === 256);
      aberto = await abrir(await arquivo(cena(1600, 400, 1400, 100)), "documento");
      botao("Recortar").click();
      mexer(faixa("Largura da área"), 25);
      mexer(faixa("Posição horizontal"), 100);
      botao("Usar imagem").click();
      var r8b = await aberto.promessa;
      var p8 = await pixels(r8b.imagem);
      ok("recorte livre: a proporção muda com a largura escolhida", r8b.ok && Math.abs(r8b.largura / r8b.altura - 1) < 0.02);
      ok("  e mostra a área escolhida (o 'rosto' à direita)", vermelho(p8.ler(0.5, 0.25)));

      /* 9. Capa: 3:1 com até 1500 px */
      aberto = await abrir(await arquivo(cena(3000, 1500, 1500, 750)), "capa");
      botao("Usar imagem").click();
      var r9 = await aberto.promessa;
      ok("capa: 1500 × 500", r9.ok && r9.largura === 1500 && r9.altura === 500);

      /* 10. Limite e falhas */
      var ruido = tela(600, 600, function (c, w, h) {
        var d = c.createImageData(w, h);
        for (var i = 0; i < d.data.length; i += 4) { d.data[i] = Math.random() * 255; d.data[i + 1] = Math.random() * 255; d.data[i + 2] = Math.random() * 255; d.data[i + 3] = 255; }
        c.putImageData(d, 0, 0);
      });
      var tentativas = 0;
      aberto = await abrir(await arquivo(ruido), "documento", { limite: 3000, aoUsar: async function () { tentativas++; return { ok: true }; } });
      botao("Usar imagem").click();
      await ate(function () { return document.querySelector(".r-aviso") && /não cabe/.test(document.body.textContent); }, 8000);
      ok("acima do limite: recusa com mensagem, sem enviar", tentativas === 0 && /não cabe/.test(document.body.textContent));
      ok("  e o editor continua aberto", !!(topo() && topo().querySelector(".editor-imagem")));
      botao("Cancelar").click(); await aberto.promessa;

      var falhas = 0;
      aberto = await abrir(await arquivo(cena(400, 400, 100, 100)), "avatar", {
        aoUsar: async function () { falhas++; return falhas === 1 ? { ok: false, erro: "sem_conexao" } : { ok: true }; },
      });
      botao("Usar imagem").click();
      await ate(function () { return falhas === 1 && botao("Usar imagem") && botao("Usar imagem").getAttribute("aria-busy") !== "true"; });
      ok("envio falhou: editor aberto, pronto para tentar de novo", !!(topo() && topo().querySelector(".editor-imagem")));
      botao("Usar imagem").click();
      var r10 = await aberto.promessa;
      ok("  e a segunda tentativa conclui", r10.ok && falhas === 2);

      var invalido = await E.abrirArquivo(new File(["não é imagem"], "falso.png", { type: "image/png" }), "avatar");
      ok("arquivo inválido: erro claro, sem abrir editor", !invalido.ok && invalido.avisado && !topo());
      var heic = await E.abrirArquivo(new File(["x"], "foto.heic", { type: "image/heic" }), "avatar");
      ok("formato não aceito explica os formatos", !heic.ok && /PNG, JPG/.test(heic.mensagem));

      /* 11. Abrir e fechar várias vezes não acumula */
      var arq = await arquivo(cena(500, 300, 100, 100));
      for (var n = 0; n < 8; n++) {
        aberto = await abrir(arq, n % 2 ? "capa" : "avatar");
        if (n % 2) esc(); else botao("Cancelar").click();
        await aberto.promessa;
      }
      ok("oito aberturas: nenhuma janela, palco ou fundo sobrando", !document.querySelector(".r-fundo, .editor-imagem, .editor-imagem__tela"));
      ok("rolagem da página liberada", document.body.style.overflow !== "hidden");
    } catch (e) {
      ok("exceção: " + e.message, false);
      console.error(e);
    }
    var falhou = resultados.filter(function (r) { return !r.passou; });
    window.resultadoEditorImagem = { total: resultados.length, falhas: falhou };
    document.querySelector("#placar").textContent = resultados.length + " verificações; " + falhou.length + " falhas.";
    document.title = (falhou.length ? "Falhou" : "Tudo passando") + " — Editor de imagem";
  }

  document.querySelector("#executar").addEventListener("click", executar);
  executar();
})();
