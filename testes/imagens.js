(async function () {
  "use strict";
  var I = window.RAMAImagem, resultados = [];
  // Dois quadros (vermelho/azul), tempos 100/200 ms, repetição infinita.
  var gif64 = "R0lGODlhIAAQAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQICgAAACwAAAAAIAAQAAAIJwABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjxADAgAh+QQIFAAAACwAAAAAIAAQAIEAAP8AAAAAAAAAAAAIJwABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjxADAgA7";
  var bytes = Uint8Array.from(atob(gif64), function (c) { return c.charCodeAt(0); });
  var original = "data:image/gif;base64," + gif64;
  var arquivo = new File([bytes], "animado.gif", { type: "image/gif" });
  function ok(nome, condicao) {
    resultados.push({ nome: nome, passou: !!condicao });
    var li = document.createElement("li"); li.textContent = (condicao ? "OK · " : "FALHOU · ") + nome;
    document.querySelector("#saida").appendChild(li);
  }
  try {
    var r = await I.preparar(arquivo);
    ok("preparar preserva exatamente todos os bytes do GIF", r.ok && r.imagem === original);
    ok("GIF mantém medidas originais, sem rasterizar ou recortar", r.largura === 32 && r.altura === 16 && r.gif);
    var documento = await I.preparar(arquivo, { lado: 1024, quadrado: false });
    ok("documentos preservam a mesma animação", documento.imagem === original);
    var semMime = await I.preparar(new File([bytes], "foto.GIF", { type: "" }));
    ok("GIF com extensão válida e MIME vazio funciona", semMime.ok && semMime.imagem === original);
    var errado = await I.preparar(new File([bytes], "foto.png", { type: "image/png" }));
    ok("assinatura GIF impede congelar arquivo com MIME impreciso", errado.ok && errado.imagem === original);
    var limite = new Uint8Array(I.MAX_GIF); limite.set(bytes);
    var noLimite = await I.preparar(new File([limite], "limite.gif", { type: "image/gif" }));
    ok("GIF no limite cabe integralmente no armazenamento", noLimite.ok && noLimite.bytes <= I.MAX_SAIDA_GIF && I.MAX_GIF === 51200);
    var grande = await I.preparar(new File([limite, new Uint8Array(1)], "grande.gif", { type: "image/gif" }));
    ok("GIF grande é recusado com orientação, sem virar foto estática", !grande.ok && grande.erro === "grande" && /quadros/.test(grande.mensagem));
    var invalido = await I.preparar(new File(["isto não é um GIF"], "falso.gif", { type: "image/gif" }));
    ok("GIF inválido é recusado", !invalido.ok && invalido.erro === "leitura");
    ok("ausência de arquivo é tratada", !(await I.preparar(null)).ok);
    ok("SVG continua recusado", !(await I.preparar(new File(["<svg/>"], "x.svg", { type: "image/svg+xml" }))).ok);
    var tela = document.createElement("canvas"); tela.width = 32; tela.height = 16;
    var c = tela.getContext("2d"); c.fillStyle = "red"; c.fillRect(0, 0, 32, 16);
    var blob = await new Promise(function (resolver) { tela.toBlob(resolver, "image/png"); });
    var foto = await I.preparar(new File([blob], "foto.png", { type: "image/png" }));
    ok("PNG mantém recorte quadrado e compressão existentes", foto.ok && !foto.gif && foto.largura === 16 && /^data:image\/(webp|jpeg)/.test(foto.imagem));
    var aberta = await I.decodificar(arquivo);
    ok("capa recebe GIF completo e metadados", aberta.ok && aberta.gif && aberta.imagem === original);
    if (aberta.origem.close) aberta.origem.close();
    async function selecionar(fn) {
      var pendente = fn();
      var entrada = document.querySelector('input[type="file"]');
      ok("seletor anuncia suporte a GIF", entrada.accept.indexOf("image/gif") >= 0);
      var dados = new DataTransfer(); dados.items.add(arquivo); entrada.files = dados.files;
      entrada.dispatchEvent(new Event("change"));
      return pendente;
    }
    ok("seletor comum mantém GIF animado", (await selecionar(function () { return I.escolher(); })).imagem === original);
    ok("seletor de capa entrega o arquivo original", (await selecionar(I.escolherArquivo)).arquivo.size === arquivo.size);
    ok("seletores temporários são removidos", !document.querySelector('input[type="file"]'));
    if (window.ImageDecoder) {
      var decoder = new ImageDecoder({ data: bytes, type: "image/gif" });
      await decoder.tracks.ready;
      ok("arquivo preservado contém os dois quadros animados", decoder.tracks.selectedTrack.frameCount === 2);
      var segundo = await decoder.decode({ frameIndex: 1 });
      ok("segundo quadro mantém duração de 200 ms", segundo.image.duration === 200000);
      segundo.image.close(); decoder.close();
    }
  } catch (e) { ok("exceção: " + e.message, false); }
  var falhas = resultados.filter(function (r) { return !r.passou; });
  window.resultadoImagens = { total: resultados.length, falhas: falhas };
  document.querySelector("#placar").textContent = resultados.length + " verificações; " + falhas.length + " falhas.";
})();
