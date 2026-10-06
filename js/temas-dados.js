/* =====================================================================
   R.A.M.A. — temas de dados (v2.40)
   =====================================================================
   O catálogo dos temas de dados e as regras puras que valem igual no
   navegador e no Apps Script (este arquivo é copiado dentro do
   backend/Codigo.gs, entre os marcadores >>> e <<<; um teste confere).

   Três responsabilidades, que não se misturam:

     a conta         POSSUI os temas desbloqueados (aba DESBLOQUEIOS,
                     escrita só pelo resgate de código no servidor)
     o personagem    ESCOLHE qual usar nas próprias rolagens
                     (ficha.aparencia.dados = { id })
     o desenvolvedor CRIA os temas — aqui, com os assets em
                     assets/dados/ — e os códigos, na configuração
                     privada do backend (cadastrarCodigo no Apps Script)

   Nenhum código de resgate mora aqui: este arquivo é público.

   ---------------------------------------------------------------------
   O CONTRATO DE UM TEMA
   ---------------------------------------------------------------------

     id        estável, minúsculas e hífen; nunca muda
     nome, descricao
     versoes   cada versão é imutável: uma rolagem antiga guarda id e
               versão e continua sendo desenhada como era. Arte nova =
               versão nova, numa pasta nova (…/v2/)

   Cada versão:

     previa       a imagem pronta para listas (já recortada)
     dado
       mascara    a silhueta: alfa vale, cor não (assets/dados/mascaras/)
       base       a arte de baixo, quadrada (1:1)
       camadas    em ordem; { imagem, opacidade (0–1), recortar }
                  recortar: true  → no grupo da base, sob a máscara
                  recortar: false → por cima, fora do recorte, mas presa
                                    à mesma tela quadrada (não vaza)
     notificacao
       fundo        uma imagem inteira, de proporção livre
       ajusteFundo  { modo: "zoom-pela-altura", alinhamentoHorizontal }
                    a imagem é escalada pela ALTURA do cartão
                    (background-size: auto 100%), sem repetir e sem
                    cortar topo ou base; 0 = esquerda, 0.5 = centro
       cores        legibilidade do cartão (hexadecimais)
       veu          { cor, alfa } opcional: uma película sobre o fundo

   Todas as imagens do dado usam a MESMA tela quadrada e a mesma origem
   (o modelo usa 1024 × 1024). Caminhos só dentro de assets/dados/.
   ===================================================================== */

(function (global) {
  "use strict";

  var VERSAO_CONTRATO = 1;
  var ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
  var CAMINHO = /^assets\/dados\/[a-z0-9][a-z0-9/_.-]{0,200}\.(png|webp|svg|jpg|jpeg|avif)$/;
  var MAX_CAMADAS = 8;
  var MODOS_DE_FUNDO = ["zoom-pela-altura"];

  /* As cores que o cartão usa, na ordem em que a tela as lê. São estas, e
     só estas, que uma rolagem com o dado padrão leva para os outros. */
  var CORES = ["superficie", "texto", "texto2", "texto3", "tracoForte", "tracoMedia", "tracoFraca",
    "selecao", "selecaoTexto", "paranormal", "erro", "aviso"];

  /* =================================================================
     O CATÁLOGO
     ================================================================= */

  var BRUTO = [
    {
      id: "modelo-tecnico",
      nome: "Modelo técnico",
      descricao: "O exemplo do kit: base cinza, facetas claras e o fundo com as linhas de topo e base.",
      versoes: [{
        versao: 1,
        previa: "assets/dados/temas/modelo-tecnico/v1/previa.png",
        dado: {
          mascara: "assets/dados/mascaras/d20-v1.svg",
          base: "assets/dados/temas/modelo-tecnico/v1/base.png",
          camadas: [
            { imagem: "assets/dados/temas/modelo-tecnico/v1/facetas.png", opacidade: 1, recortar: true },
          ],
        },
        notificacao: {
          fundo: "assets/dados/temas/modelo-tecnico/v1/fundo.png",
          ajusteFundo: { modo: "zoom-pela-altura", alinhamentoHorizontal: 0.5 },
          cores: {
            superficie: "#121216", texto: "#ffffff", texto2: "#d4d4dd", texto3: "#b4b4c0",
            tracoForte: "#e8e0f5", tracoMedia: "#8240c6", tracoFraca: "#4c3a66",
            selecao: "#d4d4dd", selecaoTexto: "#121216",
            paranormal: "#b98cf0", erro: "#e0675c", aviso: "#e2c15a",
          },
          veu: { cor: "#121216", alfa: 0.25 },
        },
      }],
    },
    {
      id: "sigilo-violeta",
      nome: "Sigilo Violeta",
      descricao: "Violeta com um sigilo gravado no dado, faíscas em volta e linhas de néon no fundo.",
      versoes: [{
        versao: 1,
        previa: "assets/dados/temas/sigilo-violeta/v1/previa.png",
        dado: {
          mascara: "assets/dados/mascaras/d20-v1.svg",
          base: "assets/dados/temas/sigilo-violeta/v1/base.png",
          camadas: [
            { imagem: "assets/dados/temas/sigilo-violeta/v1/facetas.png", opacidade: 0.8, recortar: true },
            { imagem: "assets/dados/temas/sigilo-violeta/v1/sigilo.png", opacidade: 1, recortar: true },
            { imagem: "assets/dados/temas/sigilo-violeta/v1/faiscas.png", opacidade: 1, recortar: false },
          ],
        },
        notificacao: {
          fundo: "assets/dados/temas/sigilo-violeta/v1/fundo.png",
          ajusteFundo: { modo: "zoom-pela-altura", alinhamentoHorizontal: 0.5 },
          cores: {
            superficie: "#1a0f2a", texto: "#ffffff", texto2: "#e6dcf5", texto3: "#c3b4dc",
            tracoForte: "#f0e6ff", tracoMedia: "#a066f0", tracoFraca: "#5a3c82",
            selecao: "#e6dcf5", selecaoTexto: "#1a0f2a",
            paranormal: "#c89bff", erro: "#ff7a6e", aviso: "#f0cf6a",
          },
          veu: { cor: "#140a20", alfa: 0.3 },
        },
      }],
    },
  ];

  /* =================================================================
     CONFERÊNCIA
     ================================================================= */

  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : null; }
  function texto(v, n) { return String(v === undefined || v === null ? "" : v).replace(/[\u0000-\u001F<>]/g, "").trim().slice(0, n || 80); }

  /* "#abc" ou "#aabbcc", em minúsculas e com seis dígitos. */
  function cor(v) {
    var s = String(v || "").trim().toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(s)) return "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
    return /^#[0-9a-f]{6}$/.test(s) ? s : "";
  }
  function fracao(v, padrao) {
    var n = Number(v);
    return isFinite(n) ? Math.max(0, Math.min(1, Math.round(n * 1000) / 1000)) : padrao;
  }
  function caminho(v) {
    var s = String(v || "");
    return CAMINHO.test(s) && s.indexOf("..") < 0 && s.indexOf("//") < 0 ? s : "";
  }

  function normalizarCores(bruto) {
    var b = obj(bruto) || {};
    var saida = {};
    CORES.forEach(function (k) { var c = cor(b[k]); if (c) saida[k] = c; });
    return saida;
  }

  /* Uma versão como o desenvolvedor a escreveu → a versão conferida, ou
     null com o motivo em `problemas`. */
  function normalizarVersao(v, problemas, rotulo) {
    var b = obj(v);
    if (!b) { problemas.push(rotulo + ": versão inválida"); return null; }
    var n = Math.round(Number(b.versao));
    if (!(n >= 1 && n <= 999)) { problemas.push(rotulo + ": número de versão inválido"); return null; }
    var dado = obj(b.dado) || {};
    var base = caminho(dado.base);
    var mascara = caminho(dado.mascara);
    if (!base || !mascara) { problemas.push(rotulo + " v" + n + ": base e máscara precisam de caminho em assets/dados/"); return null; }
    var camadas = (Array.isArray(dado.camadas) ? dado.camadas : []).map(function (c, i) {
      var cc = obj(c) || {};
      var img = caminho(cc.imagem);
      if (!img) { problemas.push(rotulo + " v" + n + ": camada " + (i + 1) + " sem caminho válido"); return null; }
      return { imagem: img, opacidade: fracao(cc.opacidade, 1), recortar: cc.recortar !== false };
    }).filter(Boolean);
    if (camadas.length > MAX_CAMADAS) { problemas.push(rotulo + " v" + n + ": mais de " + MAX_CAMADAS + " camadas"); return null; }
    var notif = obj(b.notificacao) || {};
    var ajuste = obj(notif.ajusteFundo) || {};
    var modo = MODOS_DE_FUNDO.indexOf(ajuste.modo) >= 0 ? ajuste.modo : "zoom-pela-altura";
    var cores = normalizarCores(notif.cores);
    if (!cores.superficie || !cores.texto) { problemas.push(rotulo + " v" + n + ": as cores precisam ao menos de superficie e texto"); return null; }
    var veu = obj(notif.veu);
    return {
      versao: n,
      previa: caminho(b.previa),
      dado: { base: base, mascara: mascara, camadas: camadas },
      notificacao: {
        fundo: caminho(notif.fundo),
        ajusteFundo: { modo: modo, alinhamentoHorizontal: fracao(ajuste.alinhamentoHorizontal, 0.5) },
        cores: cores,
        veu: veu && cor(veu.cor) ? { cor: cor(veu.cor), alfa: fracao(veu.alfa, 0) } : null,
      },
    };
  }

  function normalizarTema(t, problemas) {
    var b = obj(t);
    var lista = problemas || [];
    if (!b || !ID.test(String(b.id || ""))) { lista.push("tema sem id válido"); return null; }
    var versoes = (Array.isArray(b.versoes) ? b.versoes : []).map(function (v) { return normalizarVersao(v, lista, b.id); }).filter(Boolean);
    var vistas = {};
    versoes = versoes.filter(function (v) { if (vistas[v.versao]) { lista.push(b.id + ": versão " + v.versao + " repetida"); return false; } vistas[v.versao] = true; return true; });
    if (!versoes.length) { lista.push(b.id + ": nenhuma versão válida"); return null; }
    versoes.sort(function (x, y) { return x.versao - y.versao; });
    return { id: b.id, nome: texto(b.nome, 60) || b.id, descricao: texto(b.descricao, 240), versoes: versoes };
  }

  var PROBLEMAS = [];
  var CATALOGO = [];
  var POR_ID = {};
  BRUTO.forEach(function (t) {
    var n = normalizarTema(t, PROBLEMAS);
    if (!n || POR_ID[n.id]) return;
    POR_ID[n.id] = n;
    CATALOGO.push(n);
  });

  /* =================================================================
     CONSULTAS
     ================================================================= */

  function tema(id) { return POR_ID[String(id || "")] || null; }
  function versaoDe(id, n) {
    var t = tema(id);
    if (!t) return null;
    var alvo = Math.round(Number(n));
    for (var i = 0; i < t.versoes.length; i++) if (t.versoes[i].versao === alvo) return t.versoes[i];
    return null;
  }
  function atual(id) {
    var t = tema(id);
    return t ? { id: t.id, versao: t.versoes[t.versoes.length - 1].versao } : null;
  }
  function conhecido(id, n) { return !!versaoDe(id, n); }
  function lista() { return CATALOGO.slice(); }

  /* =================================================================
     A ESCOLHA DO PERSONAGEM — ficha.aparencia.dados
     -----------------------------------------------------------------
     Só a forma do id: um tema que saiu do catálogo (ou que ainda não
     chegou a este navegador) NÃO apaga a escolha gravada — a tela usa a
     reserva e diz isso.
     ================================================================= */

  function normalizarSelecao(bruto) {
    var b = obj(bruto);
    var id = b ? String(b.id || "") : "";
    return ID.test(id) ? { id: id } : null;
  }

  /* =================================================================
     O CÓDIGO DE RESGATE
     -----------------------------------------------------------------
     Antes de comparar: forma de compatibilidade Unicode (NFKC), sem
     espaços, hífens, pontos ou sublinhados, e em maiúsculas. Assim
     "neon-2026", " NEON 2026 " e "Neon_2026" são o mesmo código.
     Sobra só A–Z e 0–9, de 4 a 40 caracteres; fora disso, inválido.
     ================================================================= */

  function normalizarCodigo(bruto) {
    var s = String(bruto === undefined || bruto === null ? "" : bruto);
    if (s.length > 200) return "";
    if (typeof s.normalize === "function") s = s.normalize("NFKC");
    s = s.replace(/[\s\-_.]+/g, "").toUpperCase();
    return /^[A-Z0-9]{4,40}$/.test(s) ? s : "";
  }

  /* =================================================================
     A APARÊNCIA DE UMA ROLAGEM — guardada com o resultado
     -----------------------------------------------------------------
       { v: 1, tema: { id, versao }, padrao: { cores… } }

     `tema` só com id e versão do catálogo (nunca caminho, CSS ou URL);
     `padrao` só com as cores conhecidas, em hexadecimal. O servidor
     confere ainda se a conta dona da escolha tem o tema desbloqueado.
     ================================================================= */

  function normalizarAparenciaDaRolagem(bruto) {
    var b = obj(bruto);
    if (!b) return null;
    var saida = { v: VERSAO_CONTRATO };
    var t = obj(b.tema);
    if (t && conhecido(t.id, t.versao)) saida.tema = { id: String(t.id), versao: Math.round(Number(t.versao)) };
    var p = normalizarCores(b.padrao);
    if (Object.keys(p).length) saida.padrao = p;
    return saida.tema || saida.padrao ? saida : null;
  }

  global.RAMATemasDados = {
    VERSAO_CONTRATO: VERSAO_CONTRATO,
    CORES: CORES,
    MAX_CAMADAS: MAX_CAMADAS,
    PROBLEMAS: PROBLEMAS,
    lista: lista,
    tema: tema,
    versao: versaoDe,
    atual: atual,
    conhecido: conhecido,
    normalizarTema: normalizarTema,
    normalizarSelecao: normalizarSelecao,
    normalizarCodigo: normalizarCodigo,
    normalizarAparenciaDaRolagem: normalizarAparenciaDaRolagem,
    cor: cor,
  };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
