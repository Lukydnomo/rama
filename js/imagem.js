/* =====================================================================
   R.A.M.A. — fotos
   ---------------------------------------------------------------------
   A foto de um personagem sai de um celular com 4 MB e precisa caber
   numa célula de planilha. Todo o trabalho acontece aqui, no navegador,
   antes de qualquer coisa subir: recorte quadrado pelo centro,
   redução para o lado configurado e compressão até o tamanho alvo.

   Fotos estáticas são convertidas. GIFs são preservados integralmente
   para manter quadros, tempos, transparência e repetição da animação.
   Só são aceitos se o arquivo original couber no mesmo limite de saída.
   Não é economia de espaço apenas — o
   Apps Script tem limite por célula e por resposta, e uma foto grande
   derrubaria a gravação inteira da ficha junto com ela.

   Desde a v2.27 quem escolhe o enquadramento é a pessoa, no editor
   compartilhado (js/imagem-editor.js): ele usa as peças daqui — escolher
   o arquivo (escolherArquivo), abrir com as conferências de tipo, tamanho
   e orientação (decodificar), recortar o retângulo escolhido a partir da
   imagem ORIGINAL decodificada (recortar) e só então reduzir e codificar
   até caber (codificar). preparar/escolher, com o recorte central
   automático, continuam aqui para quem ainda os chama.

   Transparência: uma tela com pixels transparentes nunca vira JPEG (o
   JPEG não tem canal alfa e o transparente sairia preto). Vai WebP, que
   guarda o alfa, ou PNG; não cabendo, a imagem é recusada com o motivo.
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
  var PREFIXO_GIF = "data:image/gif;base64,";
  var MAX_GIF = Math.floor((MAX_SAIDA - PREFIXO_GIF.length) / 4) * 3;

  /* Resolução máxima aceita para abrir (80 megapixels). Acima disso o
     celular costuma ficar sem memória no meio do recorte — melhor dizer
     antes. */
  var MAX_PIXELS = 80 * 1000 * 1000;

  var MENSAGEM_GIF_GRANDE = "Para preservar a animação, o GIF precisa ter até " +
    MAX_GIF.toLocaleString("pt-BR") + " bytes (aprox. 29 KB). Escolha uma versão menor ou com menos quadros.";

  function config() { return global.RAMA_CONFIG || {}; }

  function lado() { return config().LADO_FOTO || 256; }

  /* preparar(File, { lado, quadrado })

     `lado` permite pedir um recorte maior que o do avatar. A imagem de
     um documento precisa ser LEGÍVEL — uma planta baixa a 256px não
     serve para nada —, então a tela de documentos pede 1024 e aceita
     o retângulo original em vez de forçar o quadrado. */
  /* As conferências de tipo e tamanho, e a decodificação.

     opcoes.gifGrande === "aceitar": um GIF que passa do limite não é
     recusado aqui — ele volta com `gifCabe: false`, sem os bytes, para o
     editor oferecer a conversão para imagem estática (com escolha
     explícita). Sem a opção, o comportamento de sempre: recusado. */
  async function decodificar(arquivo, opcoes) {
    var o = opcoes || {};
    if (!arquivo) return { ok: false, erro: "sem_arquivo", mensagem: "Nenhuma imagem escolhida." };

    var tipo = arquivo.type || (/\.gif$/i.test(arquivo.name || "") ? "image/gif" : "");
    if (TIPOS_ACEITOS.indexOf(tipo) < 0) {
      return { ok: false, erro: "tipo", mensagem: "Formato não aceito. Use PNG, JPG, WebP, GIF ou BMP." };
    }

    if (arquivo.size > MAX_ARQUIVO) {
      return {
        ok: false, erro: "grande",
        mensagem: "A imagem tem mais de 12 MB. Escolha uma menor.",
      };
    }

    try {
      // Verificar a assinatura evita depender apenas da extensão/MIME do arquivo.
      var inicio = new Uint8Array(await arquivo.slice(0, 6).arrayBuffer());
      var assinatura = String.fromCharCode.apply(null, inicio);
      var gif = assinatura === "GIF87a" || assinatura === "GIF89a";
      if (tipo === "image/gif" && !gif) {
        return { ok: false, erro: "leitura", mensagem: "Este arquivo não é um GIF válido." };
      }
      var gifCabe = !gif || arquivo.size <= MAX_GIF;
      if (gif && !gifCabe && o.gifGrande !== "aceitar") {
        return { ok: false, erro: "grande", mensagem: MENSAGEM_GIF_GRANDE };
      }
      var imagemGif = gif && gifCabe ? await lerGif(arquivo) : "";
      var bitmap;
      try {
        bitmap = await carregar(arquivo);
      } catch (e) {
        /* Um GIF grande que nem abre: o motivo útil é o do tamanho. */
        if (gif && !gifCabe) return { ok: false, erro: "grande", mensagem: MENSAGEM_GIF_GRANDE };
        throw e;
      }
      var largura = bitmap.width || bitmap.naturalWidth;
      var altura = bitmap.height || bitmap.naturalHeight;
      if (!largura || !altura) {
        if (bitmap.close) bitmap.close();
        return { ok: false, erro: "leitura", mensagem: "Esta imagem está vazia ou corrompida." };
      }
      if (largura * altura > MAX_PIXELS) {
        if (bitmap.close) bitmap.close();
        return {
          ok: false, erro: "resolucao",
          mensagem: "A imagem tem resolução alta demais (" + largura + " × " + altura + " px) para abrir com segurança " +
            "neste aparelho. Use uma versão com até 80 megapixels.",
        };
      }
      return {
        ok: true,
        gif: gif,
        gifCabe: gifCabe,
        imagem: imagemGif,
        origem: bitmap,
        largura: largura,
        altura: altura,
        tipo: tipo,
      };
    } catch (e) {
      console.error("[R.A.M.A. · imagem] falha ao decodificar", e);
      return {
        ok: false, erro: "leitura",
        mensagem: "Não foi possível ler esta imagem. O arquivo pode estar corrompido ou num formato que este navegador não abre.",
      };
    }
  }

  async function preparar(arquivo, opcoes) {
    var o = opcoes || {};
    var aberta = await decodificar(arquivo);
    if (!aberta.ok) return aberta;
    var bitmap = aberta.origem;

    if (aberta.gif) {
      if (bitmap.close) bitmap.close();
      return { ok: true, imagem: aberta.imagem, largura: aberta.largura, altura: aberta.altura,
        bytes: aberta.imagem.length, gif: true };
    }

    var quadro = o.quadrado === false
      ? redimensionar(bitmap, o.lado || lado())
      : recortarQuadrado(bitmap, o.lado || lado());
    if (bitmap.close) bitmap.close();

    /* Mesmo codificador do editor: transparência preservada e resultado
       conferido contra o limite — nunca "sucesso" acima dele. */
    var resultado = codificar(quadro);
    if (!resultado.ok) return resultado;
    return { ok: true, imagem: resultado.imagem, largura: resultado.largura, altura: resultado.altura, bytes: resultado.bytes };
  }

  function lerGif(arquivo) {
    return new Promise(function (resolver, recusar) {
      var leitor = new FileReader();
      leitor.onerror = function () { recusar(new Error("leitura do GIF")); };
      leitor.onload = function () {
        resolver(PREFIXO_GIF + String(leitor.result).split(",")[1]);
      };
      leitor.readAsDataURL(arquivo);
    });
  }

  function carregar(arquivo) {
    if (global.createImageBitmap) {
      /* createImageBitmap decodifica fora da thread principal: a
         interface não congela enquanto uma foto grande abre.
         "from-image" aplica a orientação EXIF: a foto que o celular gravou
         deitada (com a marca de "gire 90°") abre em pé, e o recorte é
         feito sobre o que a pessoa vê. Navegador que não conhece a opção
         tenta sem ela — o <img> abaixo já respeita o EXIF por padrão. */
      return global.createImageBitmap(arquivo, { imageOrientation: "from-image" })
        .catch(function () { return global.createImageBitmap(arquivo); });
    }
    return new Promise(function (ok, falhou) {
      var url = URL.createObjectURL(arquivo);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); ok(img); };
      img.onerror = function () { URL.revokeObjectURL(url); falhou(new Error("decodificação")); };
      img.src = url;
    });
  }

  /* Mantém a proporção e cabe dentro do lado pedido. É o que serve para
     documentos: recortar um quadrado de uma planta baixa jogaria fora
     metade da informação. */
  function redimensionar(origem, maximo) {
    var largura = origem.width || origem.naturalWidth;
    var altura = origem.height || origem.naturalHeight;
    var escala = Math.min(1, maximo / Math.max(largura, altura));

    var tela = document.createElement("canvas");
    tela.width = Math.max(1, Math.round(largura * escala));
    tela.height = Math.max(1, Math.round(altura * escala));

    var ctx = tela.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(origem, 0, 0, tela.width, tela.height);

    return tela;
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

  /* Há algum pixel não totalmente opaco? Uma tela de até ~2 Mpx lê rápido;
     maior que isso, lê-se uma versão reduzida (o alfa sobrevive à
     redução). */
  function temTransparencia(tela) {
    var alvo = tela;
    var area = tela.width * tela.height;
    if (area > 2000000) {
      var f = Math.sqrt(2000000 / area);
      alvo = document.createElement("canvas");
      alvo.width = Math.max(1, Math.round(tela.width * f));
      alvo.height = Math.max(1, Math.round(tela.height * f));
      alvo.getContext("2d").drawImage(tela, 0, 0, alvo.width, alvo.height);
    }
    try {
      var dados = alvo.getContext("2d").getImageData(0, 0, alvo.width, alvo.height).data;
      for (var i = 3; i < dados.length; i += 4) if (dados[i] < 255) return true;
      return false;
    } catch (e) {
      /* Sem leitura de pixels (tela "suja"): na dúvida, trata como
         transparente — nunca arrisca o fundo preto. */
      return true;
    }
  }

  var PASSOS = [1, 0.85, 0.72, 0.6, 0.5, 0.42];
  var QUALIDADES = [0.86, 0.78, 0.7, 0.62, 0.55, 0.48];
  var DATA_URL_VALIDA = /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/;

  function reduzida(tela, passo) {
    if (passo >= 1) return tela;
    var alvo = document.createElement("canvas");
    alvo.width = Math.max(1, Math.round(tela.width * passo));
    alvo.height = Math.max(1, Math.round(tela.height * passo));
    var ctx = alvo.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(tela, 0, 0, alvo.width, alvo.height);
    return alvo;
  }

  /* codificar(tela, { limite, transparente })

     Codifica uma tela até caber no limite de caracteres do destino,
     reduzindo aos poucos se preciso. Sem transparência: WebP e, se o
     navegador não fizer WebP, JPEG. Com transparência: WebP (guarda o
     alfa) e PNG — nunca JPEG, que pintaria o transparente de preto.

     O navegador que não conhece um formato devolve PNG e ignora a
     qualidade: o cabeçalho é conferido, não presumido. O texto final é
     conferido inteiro (data URL válida e dentro do limite). Não cabendo,
     RECUSA com o motivo: imagem cortada no meio é imagem quebrada. */
  function codificar(tela, opcoes) {
    var o = opcoes || {};
    var limite = o.limite || MAX_SAIDA;
    var transparente = o.transparente !== undefined ? !!o.transparente : temTransparencia(tela);
    var formatos = transparente ? ["image/webp", "image/png"] : ["image/webp", "image/jpeg"];

    for (var p = 0; p < PASSOS.length; p++) {
      var alvo = reduzida(tela, PASSOS[p]);
      for (var f = 0; f < formatos.length; f++) {
        var qualidades = formatos[f] === "image/png" ? [1] : QUALIDADES;
        for (var q = 0; q < qualidades.length; q++) {
          var dados = alvo.toDataURL(formatos[f], qualidades[q]);
          if (dados.indexOf("data:" + formatos[f] + ";") !== 0) break;
          if (dados.length <= limite && DATA_URL_VALIDA.test(dados)) {
            return {
              ok: true, imagem: dados, largura: alvo.width, altura: alvo.height, bytes: dados.length,
              formato: formatos[f], transparente: transparente,
            };
          }
        }
      }
    }
    return {
      ok: false, erro: "grande",
      mensagem: transparente
        ? "Mesmo reduzida, esta imagem com transparência não cabe no arquivo sem perder o fundo transparente. " +
          "Escolha uma área menor, uma imagem com menos detalhes ou sem transparência."
        : "Mesmo reduzida, esta imagem não cabe no arquivo. Escolha uma área menor ou uma imagem com menos detalhes.",
    };
  }

  /* Um retângulo da origem, desenhado em largura × altura. Nunca amplia
     além do retângulo: ampliar entrega borrão pesando mais. */
  function recortar(origem, retangulo, largura, altura) {
    var r = retangulo;
    var escala = Math.min(1, largura / r.largura, altura / r.altura);
    var tela = document.createElement("canvas");
    tela.width = Math.max(1, Math.round(r.largura * escala));
    tela.height = Math.max(1, Math.round(r.altura * escala));
    var ctx = tela.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(origem, r.x, r.y, r.largura, r.altura, 0, 0, tela.width, tela.height);
    return tela;
  }

  /* O nome antigo: hoje é o mesmo codificador. */
  function comprimirTela(tela, opcoes) { return codificar(tela, opcoes); }

  /* Só o arquivo, sem preparar: quem chama decide o que fazer com ele. */
  function escolherArquivo() {
    return new Promise(function (ok) {
      var entrada = document.createElement("input");
      entrada.type = "file";
      entrada.accept = TIPOS_ACEITOS.join(",");
      entrada.style.display = "none";

      var respondido = false;
      var escolheu = false;

      function responder(resultado) {
        if (respondido) return;
        respondido = true;
        window.removeEventListener("focus", aoVoltar);
        if (entrada.parentNode) entrada.parentNode.removeChild(entrada);
        ok(resultado);
      }

      entrada.addEventListener("change", function () {
        var arquivo = entrada.files && entrada.files[0];
        if (!arquivo) { responder({ ok: false, erro: "cancelado" }); return; }
        escolheu = true;
        responder({ ok: true, arquivo: arquivo });
      });

      function aoVoltar() {
        setTimeout(function () {
          if (escolheu) return;
          responder({ ok: false, erro: "cancelado" });
        }, 700);
      }

      window.addEventListener("focus", aoVoltar, { once: true });
      document.body.appendChild(entrada);
      entrada.click();
    });
  }

  /* Abre o seletor de arquivo e devolve a imagem pronta. O <input> não
     precisa existir no HTML: ele nasce, é usado e some. */
  function escolher(opcoes) {
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
        responder(await preparar(arquivo, opcoes));
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
    escolherArquivo: escolherArquivo,
    decodificar: decodificar,
    recortar: recortar,
    comprimirTela: comprimirTela,
    codificar: codificar,
    temTransparencia: temTransparencia,
    lado: lado,
    TIPOS_ACEITOS: TIPOS_ACEITOS,
    MAX_SAIDA: MAX_SAIDA,
    MAX_GIF: MAX_GIF,
    MAX_PIXELS: MAX_PIXELS,
    MENSAGEM_GIF_GRANDE: MENSAGEM_GIF_GRANDE,
  };
})(window);
