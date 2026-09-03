/* =====================================================================
   R.A.M.A. — fotos
   ---------------------------------------------------------------------
   A foto de um personagem sai de um celular com 4 MB e precisa caber
   numa célula de planilha. Todo o trabalho acontece aqui, no navegador,
   antes de qualquer coisa subir: recorte quadrado pelo centro,
   redução para o lado configurado e compressão até o tamanho alvo.

   A imagem original NUNCA sobe. Não é economia de espaço apenas — o
   Apps Script tem limite por célula e por resposta, e uma foto grande
   derrubaria a gravação inteira da ficha junto com ela.

   Uma decisão importante: o recorte é centralizado e automático, sem
   editor de enquadramento. É o caminho mais simples que resolve o caso
   real (avatar redondo pequeno) — e a estrutura aceita um editor
   depois sem mudar quem chama.
   ===================================================================== */

(function (global) {
  "use strict";

  var TIPOS_ACEITOS = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp"];

  /* 12 MB de arquivo original. Acima disso o navegador de celular
     costuma ficar sem memória ao decodificar, e o erro que aparece não
     explica nada. Melhor recusar com uma frase clara. */
  var MAX_ARQUIVO = 12 * 1024 * 1024;

  /* Alvo do resultado, em bytes de dataURL. A planilha do Google
     aceita até 50.000 caracteres por célula; 40.000 deixa margem. */
  var MAX_SAIDA = 40000;

  function config() { return global.RAMA_CONFIG || {}; }

  function lado() { return config().LADO_FOTO || 256; }

  /* preparar(File) → Promise<{ ok, imagem, largura, bytes }> */
  async function preparar(arquivo) {
    if (!arquivo) return { ok: false, erro: "sem_arquivo", mensagem: "Nenhuma imagem escolhida." };

    if (TIPOS_ACEITOS.indexOf(arquivo.type) < 0) {
      return { ok: false, erro: "tipo", mensagem: "Formato não aceito. Use PNG, JPG ou WebP." };
    }

    if (arquivo.size > MAX_ARQUIVO) {
      return {
        ok: false, erro: "grande",
        mensagem: "A imagem tem mais de 12 MB. Escolha uma menor.",
      };
    }

    var bitmap;
    try {
      bitmap = await carregar(arquivo);
    } catch (e) {
      console.error("[R.A.M.A. · imagem] falha ao decodificar", e);
      return { ok: false, erro: "leitura", mensagem: "Não foi possível ler esta imagem." };
    }

    var quadro = recortarQuadrado(bitmap, lado());
    if (bitmap.close) bitmap.close();

    var resultado = comprimir(quadro);
    if (!resultado) {
      return { ok: false, erro: "compressao", mensagem: "Não foi possível preparar a imagem." };
    }

    return { ok: true, imagem: resultado.dados, largura: quadro.width, bytes: resultado.dados.length };
  }

  function carregar(arquivo) {
    if (global.createImageBitmap) {
      /* createImageBitmap decodifica fora da thread principal: a
         interface não congela enquanto uma foto grande abre. */
      return global.createImageBitmap(arquivo);
    }
    return new Promise(function (ok, falhou) {
      var url = URL.createObjectURL(arquivo);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); ok(img); };
      img.onerror = function () { URL.revokeObjectURL(url); falhou(new Error("decodificação")); };
      img.src = url;
    });
  }

  /* Recorta o maior quadrado central e desenha no tamanho pedido. */
  function recortarQuadrado(origem, destino) {
    var largura = origem.width || origem.naturalWidth;
    var altura = origem.height || origem.naturalHeight;
    var corte = Math.min(largura, altura);
    var x = Math.floor((largura - corte) / 2);
    var y = Math.floor((altura - corte) / 2);

    /* Nunca aumentar: ampliar uma foto de 90px para 256 só entrega
       borrão pesando mais. */
    var alvo = Math.min(destino, corte);

    var tela = document.createElement("canvas");
    tela.width = alvo;
    tela.height = alvo;

    var ctx = tela.getContext("2d");
    /* Rosto não leva pixelização artificial: a estética pixel é da
       interface, não de quem está na campanha. */
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(origem, x, y, corte, corte, 0, 0, alvo, alvo);

    return tela;
  }

  /* Tenta WebP e cai em JPEG; baixa a qualidade até caber no alvo.
     Um navegador que não faz WebP devolve um PNG gigante disfarçado —
     por isso o resultado é conferido, e não presumido. */
  function comprimir(tela) {
    var formatos = ["image/webp", "image/jpeg"];
    var qualidades = [0.82, 0.7, 0.6, 0.5, 0.4];

    var melhor = null;

    for (var f = 0; f < formatos.length; f++) {
      for (var q = 0; q < qualidades.length; q++) {
        var dados = tela.toDataURL(formatos[f], qualidades[q]);

        /* O navegador que não conhece o formato devolve PNG e ignora a
           qualidade. Descobre-se pelo cabeçalho do dataURL. */
        if (dados.indexOf("data:" + formatos[f]) !== 0) break;

        if (!melhor || dados.length < melhor.dados.length) {
          melhor = { dados: dados, formato: formatos[f], qualidade: qualidades[q] };
        }
        if (dados.length <= MAX_SAIDA) return melhor;
      }
    }

    if (melhor && melhor.dados.length <= MAX_SAIDA) return melhor;

    /* Ainda grande: reduz o lado pela metade e tenta de novo, uma vez.
       Duas reduções seguidas já entregariam um avatar ilegível. */
    if (tela.width > 96) {
      var menor = document.createElement("canvas");
      menor.width = Math.round(tela.width / 2);
      menor.height = Math.round(tela.height / 2);
      var ctx = menor.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(tela, 0, 0, menor.width, menor.height);
      return comprimir(menor);
    }

    return melhor;
  }

  /* Abre o seletor de arquivo e devolve a imagem pronta. O <input> não
     precisa existir no HTML: ele nasce, é usado e some. */
  function escolher() {
    return new Promise(function (ok) {
      var entrada = document.createElement("input");
      entrada.type = "file";
      entrada.accept = TIPOS_ACEITOS.join(",");
      entrada.style.display = "none";

      var respondido = false;
      /* Marcado no instante em que um arquivo aparece, ANTES de
         decodificar. Uma foto grande leva mais que a folga do resgate,
         e sem esta marca o resgate responderia "cancelado" enquanto a
         imagem ainda estava sendo preparada. */
      var escolheu = false;

      function responder(resultado) {
        if (respondido) return;
        respondido = true;
        window.removeEventListener("focus", aoVoltar);
        if (entrada.parentNode) entrada.parentNode.removeChild(entrada);
        ok(resultado);
      }

      entrada.addEventListener("change", async function () {
        var arquivo = entrada.files && entrada.files[0];
        if (!arquivo) { responder({ ok: false, erro: "cancelado" }); return; }
        escolheu = true;
        responder(await preparar(arquivo));
      });

      /* Cancelar o seletor de arquivo não dispara `change` em navegador
         nenhum de forma confiável. Sem este resgate a promessa ficaria
         pendente para sempre — e o botão que a aguarda, desabilitado
         até a página recarregar. O foco voltando à janela é o único
         sinal que sobra; a folga cobre o `change` que vem logo depois
         quando a pessoa de fato escolheu algo. */
      function aoVoltar() {
        setTimeout(function () {
          if (escolheu) return;   // há um arquivo a caminho; deixa ele responder
          responder({ ok: false, erro: "cancelado" });
        }, 700);
      }

      window.addEventListener("focus", aoVoltar, { once: true });

      document.body.appendChild(entrada);
      entrada.click();
    });
  }

  global.RAMAImagem = {
    preparar: preparar,
    escolher: escolher,
    TIPOS_ACEITOS: TIPOS_ACEITOS,
    MAX_SAIDA: MAX_SAIDA,
  };
})(window);
