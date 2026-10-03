/* =====================================================================
   R.A.M.A. — conversão de ficha pública do CRIS (v2.34)
   ---------------------------------------------------------------------
   O CONVERSOR. Recebe o retrato que `ler_ficha_cris` devolveu (adaptador
   cris-firestore-v1: fonte, ficha, resumo, avisos) e monta uma ficha de
   Ordem do R.A.M.A. com as fábricas, os catálogos e o motor de regras
   do próprio R.A.M.A. Não toca no DOM, não faz pedido ao servidor e não
   grava nada: quem cria a ficha é a tela (js/importar-cris-tela.js),
   pela criação de sempre.

     converter(retrato, decisoes, dependencias)
       → { ok, ficha, avisos, pendencias, comparacao, preservadosComoTexto,
           resumo, bloqueado }

   ---------------------------------------------------------------------
   AS DECISÕES QUE ESTE ARQUIVO TOMA
   ---------------------------------------------------------------------
   1. O ESTADO ATUAL É A BASE. O CRIS diz como a ficha está, não como ela
      chegou lá. Atributos e graus viram os valores do marco de
      importação (`ordem.importacao.marco`); as etapas até ali ficam como
      histórico indisponível na progressão — nada é inventado.
   2. CALCULAR, COMPARAR, AJUSTAR SÓ O RESÍDUO. Item reconhecido nasce
      da base do catálogo com as modificações reconhecidas; o motor
      calcula; só a diferença para o valor observado vira ajuste, com
      motivo. Nunca o valor final como base nova.
   3. AMBIGUIDADE VIRA REVISÃO, NÃO PALPITE. Trilha inferida, arma
      favorita, procedência de um poder, identificação parcial de item,
      elemento de ritual: a prévia mostra, a pessoa decide (em grupo,
      sem uma confirmação por linha).
   4. TEXTO DE FORA É TEXTO. HTML vira texto puro, por um analisador
      restrito; expressão de dano passa por um analisador de termos —
      sem eval, sem innerHTML.
   ===================================================================== */

(function (global) {
  "use strict";

  var ADAPTADOR = "cris-firestore-v1";
  var LINK = /^https:\/\/crisordemparanormal\.com\/agente\/([A-Za-z0-9_-]{1,128})\/?(?:[?#][^\s]*)?$/i;

  /* ---------------------------------------------------------------- link */

  function validarLink(texto) {
    var t = typeof texto === "string" ? texto.trim() : "";
    if (!t || t.length > 2048) return { ok: false, erro: "cris_url_invalida", mensagem: MENSAGENS.cris_url_invalida };
    var m = LINK.exec(t);
    if (!m) return { ok: false, erro: "cris_url_invalida", mensagem: MENSAGENS.cris_url_invalida };
    return { ok: true, documentId: m[1], url: "https://crisordemparanormal.com/agente/" + m[1] };
  }

  var MENSAGENS = {
    cris_url_invalida: "Use o link público da ficha, no formato https://crisordemparanormal.com/agente/ID.",
    cris_nao_encontrada: "Não existe ficha com esse link no CRIS. Confira o endereço.",
    cris_acesso_negado: "O CRIS negou o acesso a essa ficha. Ela precisa estar pública.",
    cris_nao_publica: "Essa ficha não está pública no CRIS. Torne-a pública lá e tente de novo.",
    cris_limite_temporario: "Muitas consultas em pouco tempo. Espere alguns minutos e tente de novo.",
    cris_indisponivel: "O CRIS não respondeu agora. Tente de novo em instantes.",
    cris_resposta_invalida: "O CRIS respondeu algo que não é uma ficha. Tente de novo mais tarde.",
    cris_formato_incompativel: "O formato da ficha no CRIS mudou ou está incompleto. A importação por arquivo continua disponível.",
    cris_sem_autorizacao: "O servidor do R.A.M.A. ainda não tem permissão para acessar sites externos. Quem administra precisa abrir o Apps Script, executar uma função qualquer (ex.: ping) para autorizar e criar uma nova versão da implantação.",
    cris_limite_excedido: "A ficha passa dos limites de leitura (tamanho, quantidade ou profundidade).",
    acao_desconhecida: "O servidor do R.A.M.A. ainda não tem a leitura do CRIS. Peça para quem administra atualizar o Apps Script (Cris.gs e Codigo.gs).",
    sessao_invalida: "Sua sessão expirou. Entre de novo.",
  };

  function mensagemDeErro(r) {
    var codigo = r && r.erro;
    if (codigo && MENSAGENS[codigo]) return MENSAGENS[codigo];
    if (r && r.mensagem) return String(r.mensagem);
    return "Não foi possível consultar a ficha agora.";
  }

  /* ---------------------------------------------------------------- texto */

  var ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»" };

  /* HTML → texto, sem DOM e sem executar nada: scripts e estilos somem
     com o conteúdo; parágrafos, quebras e itens de lista viram linhas. */
  function textoSeguro(html, limite) {
    var s = String(html === undefined || html === null ? "" : html);
    s = s.replace(/<(script|style|iframe|object|embed|noscript|template)\b[\s\S]*?<\/\1\s*>/gi, " ");
    s = s.replace(/<!--[\s\S]*?-->/g, " ");
    s = s.replace(/<\s*br\s*\/?>/gi, "\n");
    s = s.replace(/<\s*li\b[^>]*>/gi, "\n• ");
    s = s.replace(/<\/\s*li\s*>/gi, "");
    s = s.replace(/<\/\s*(p|div|ul|ol|h[1-6]|blockquote|tr|table|section)\s*>/gi, "\n\n");
    s = s.replace(/<[^>]*>/g, "");
    s = s.replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi, function (m, c) {
      if (c[0] === "#") {
        var n = c[1] === "x" || c[1] === "X" ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10);
        return isFinite(n) && n > 31 && n < 0x110000 && !(n >= 0xD800 && n <= 0xDFFF) ? String.fromCodePoint(n) : " ";
      }
      return ENTIDADES[c.toLowerCase()] !== undefined ? ENTIDADES[c.toLowerCase()] : m;
    });
    s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ");
    s = s.split("\n").map(function (l) { return l.replace(/[ \t ]+/g, " ").trim(); }).join("\n");
    s = s.replace(/\n{3,}/g, "\n\n").trim();
    if (limite && s.length > limite) s = s.slice(0, limite - 1).trimEnd() + "…";
    return s;
  }

  /* ---------------------------------------------------------------- expressões */

  /* Só dados, constantes, + e −. "2d4+1d8+2" → termos. Nada é avaliado. */
  function analisarExpressao(texto) {
    var t = String(texto === undefined || texto === null ? "" : texto).toLowerCase().replace(/\s+/g, "");
    if (!t) return { ok: true, texto: "", termos: [] };
    if (t.length > 200 || !/^[+-]?(?:\d+d\d+|\d+)(?:[+-](?:\d+d\d+|\d+))*$/.test(t)) return { ok: false, texto: t, termos: [] };
    var partes = t.match(/[+-]?(?:\d+d\d+|\d+)/g) || [];
    if (partes.length > 30) return { ok: false, texto: t, termos: [] };
    var termos = [];
    for (var i = 0; i < partes.length; i++) {
      var m = /^([+-]?)(\d+)d(\d+)$/.exec(partes[i]);
      if (m) {
        var q = Number(m[2]), f = Number(m[3]);
        if (q < 1 || q > 100 || f < 2 || f > 1000) return { ok: false, texto: t, termos: [] };
        termos.push({ tipo: "dados", quantidade: q, faces: f, negativo: m[1] === "-" });
      } else {
        var n = Number(partes[i]);
        if (!isFinite(n) || Math.abs(n) > 100000) return { ok: false, texto: t, termos: [] };
        termos.push({ tipo: "constante", valor: n });
      }
    }
    return { ok: true, texto: t, termos: termos };
  }

  function montarExpressao(dados, constante) {
    var s = dados.filter(function (d) { return d.quantidade > 0; }).map(function (d) { return d.quantidade + "d" + d.faces; }).join("+");
    if (constante) s += (constante > 0 ? (s ? "+" : "") : "-") + Math.abs(constante);
    return s || "0";
  }

  /* ---------------------------------------------------------------- busca */

  function chaveDeTexto(s) {
    var t = String(s === undefined || s === null ? "" : s);
    if (t.normalize) t = t.normalize("NFD").replace(/[̀-ͯ]/g, "");
    t = t.toLowerCase().replace(/^\s*nex\s*\d{1,2}\s*%?\s*[-–—:]\s*/, "");
    return t.replace(/[^a-z0-9]+/g, " ").trim();
  }

  var ATRIBUTO_POR_TEXTO = {
    "for": "for", "forca": "for", "str": "for", "agi": "agi", "agilidade": "agi", "dex": "agi",
    "int": "int", "intelecto": "int", "pre": "pre", "presenca": "pre", "vig": "vig", "vigor": "vig", "con": "vig",
  };
  function atributoDeTexto(s) { return ATRIBUTO_POR_TEXTO[chaveDeTexto(s)] || ""; }

  var GRAU_POR_TREINO = { "0": "destreinado", "5": "treinado", "10": "veterano", "15": "expert" };
  var ROMANOS = { "0": 0, "i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6, "vii": 7 };
  var ELEMENTO_POR_TEXTO = { sangue: "sangue", morte: "morte", conhecimento: "conhecimento", energia: "energia", medo: "medo", varia: "varia" };

  function numeroOuNulo(v) {
    if (v === undefined || v === null) return null;
    if (typeof v === "number") return isFinite(v) ? v : null;
    if (typeof v === "string" && v.trim() !== "" && isFinite(Number(v))) return Number(v);
    return null;
  }
  function romanoOuNulo(v) {
    if (v === undefined || v === null) return null;
    var k = String(v).trim().toLowerCase();
    if (ROMANOS[k] !== undefined) return ROMANOS[k];
    var n = numeroOuNulo(v);
    return n === null ? null : Math.round(n);
  }
  function rotuloRomano(n) { return ["0", "I", "II", "III", "IV", "V", "VI", "VII"][n] || String(n); }

  /* ---------------------------------------------------------------- o conversor */

  /* dependencias: { F, R, C, P, E, H, ITM, RS, catalogoItens, catalogoRituais, U } */
  function converter(retrato, decisoesBrutas, deps) {
    var d = deps || {};
    var F = d.F, R = d.R, C = d.C, P = d.P, E = d.E, H = d.H, ITM = d.ITM, RS = d.RS, U = d.U;
    var catItens = d.catalogoItens, catRituais = d.catalogoRituais;
    var decisoes = decisoesBrutas && typeof decisoesBrutas === "object" ? decisoesBrutas : {};

    var avisos = [];
    var revisoes = [];
    var comparacao = [];
    var preservados = [];
    var observacoes = [];
    var ajustesDoc = [];
    var criticos = [];

    function aviso(codigo, gravidade, campo, texto) { avisos.push({ codigo: codigo, gravidade: gravidade, campo: campo, texto: texto }); }
    function revisao(chave, rotulo, texto, opcoes, padrao, extra) {
      var escolhido = decisoes[chave] !== undefined && opcoes.some(function (o) { return o.valor === decisoes[chave]; }) ? decisoes[chave] : padrao;
      var r = Object.assign({ chave: chave, rotulo: rotulo, texto: texto, opcoes: opcoes, padrao: padrao, valor: escolhido }, extra || {});
      revisoes.push(r);
      return escolhido;
    }
    function falhar(codigo, texto) {
      aviso(codigo, "erro", "", texto);
      return { ok: false, avisos: avisos, pendencias: revisoes, comparacao: comparacao, preservadosComoTexto: preservados, bloqueado: true };
    }

    if (!F || !R || !C || !P || !E || !ITM || !RS || !catItens || !catRituais) return falhar("dependencias", "Os catálogos do R.A.M.A. ainda não carregaram.");
    if (!retrato || typeof retrato !== "object" || retrato.adaptador !== ADAPTADOR) return falhar("cris_formato_incompativel", MENSAGENS.cris_formato_incompativel);
    var src = retrato.ficha;
    var fonte = retrato.fonte || {};
    if (!src || typeof src !== "object") return falhar("cris_formato_incompativel", MENSAGENS.cris_formato_incompativel);
    if (src.private !== false) return falhar("cris_nao_publica", MENSAGENS.cris_nao_publica);
    var ref = validarLink(fonte.url || "");
    if (!ref.ok || ref.documentId !== fonte.documentId) return falhar("cris_formato_incompativel", "A leitura não corresponde ao link pedido.");
    var attrs = src.attributes && typeof src.attributes === "object" ? src.attributes : null;
    if (!attrs) return falhar("cris_formato_incompativel", "A ficha não traz os atributos.");

    /* ---------- identidade ---------- */
    var nomeOriginal = String(src.name || "").trim() || "Personagem do CRIS";
    var ficha = F.criarFicha({ tipoFicha: "ordem", nome: nomeOriginal });
    if (nomeOriginal.length > 80) aviso("nome_cortado", "informacao", "name", "O nome tem mais de 80 caracteres: a ficha guarda os 80 primeiros e o nome inteiro vai nas anotações.");
    var o = ficha.ordem;

    /* ---------- classe e origem ---------- */
    var classeAchada = C.CLASSES.filter(function (c) { return chaveDeTexto(c.nome) === chaveDeTexto(src.className); })[0];
    var opcoesClasse = C.CLASSES.map(function (c) { return { valor: c.chave, rotulo: c.nome }; });
    var classe = classeAchada ? classeAchada.chave : "";
    if (!classeAchada || (src.statsClass && chaveDeTexto(src.statsClass) !== chaveDeTexto(src.className))) {
      classe = revisao("classe", "Classe", !classeAchada
        ? "A classe “" + (src.className || "—") + "” não existe no catálogo. Escolha a classe que a ficha usa."
        : "A classe é " + src.className + ", mas a tabela de estatísticas do CRIS é " + src.statsClass + ". Confirme a classe.",
        opcoesClasse, classe || opcoesClasse[0].valor);
    } else if (decisoes.classe && opcoesClasse.some(function (x) { return x.valor === decisoes.classe; })) classe = decisoes.classe;
    o.classe = classe;
    ficha.classe = (C.classe(classe) || {}).nome || "";

    var origemAchada = C.ORIGENS.filter(function (x) { return chaveDeTexto(x.nome) === chaveDeTexto(src.backgroundName) || x.chave === chaveDeTexto(src.backgroundName).replace(/ /g, ""); })[0];
    var origem = origemAchada ? origemAchada.chave : "";
    if (!origemAchada) {
      var opcoesOrigem = [{ valor: "", rotulo: "Sem origem do catálogo (manter só o nome em anotação)" }].concat(C.ORIGENS.map(function (x) { return { valor: x.chave, rotulo: x.nome }; }));
      origem = revisao("origem", "Origem", "A origem “" + (src.backgroundName || "—") + "” não está no catálogo. Escolha a correspondente ou mantenha só o nome.", opcoesOrigem, "");
      if (src.backgroundName) preservados.push({ titulo: "Origem no CRIS", texto: String(src.backgroundName) });
    }
    o.origem = origem;
    ficha.origem = origem ? C.origem(origem).nome : String(src.backgroundName || "").slice(0, 60);

    /* ---------- regras opcionais: só as que a ficha liga explicitamente ---------- */
    o.opcionais = {};
    if (src.isPdOn === true) o.opcionais.semSanidade = true;
    var porNivel = src.isNexLevelOn === true;
    if (porNivel) o.opcionais.nexExperiencia = true;
    if (src.isSobrevivendoAoHorror === true) aviso("sah_contexto", "informacao", "isSobrevivendoAoHorror", "A ficha usa conteúdo do Sobrevivendo ao Horror. Isso não liga nenhuma regra opcional: só “Jogando sem Sanidade” e “NEX & Experiência” vêm dos campos explícitos.");

    /* ---------- NEX, nível e estágio ---------- */
    var marco = { modo: "nex", nex: 0, nivel: null, estagio: null, degrau: 0 };
    var perfil = C.perfilDaClasse(classe);
    var nexTexto = String(src.nex === undefined || src.nex === null ? "" : src.nex);
    if (!porNivel) {
      var mNex = /^(\d{1,2})%?$/.exec(nexTexto.trim());
      if (!mNex) return falhar("cris_formato_incompativel", "O NEX da ficha (“" + nexTexto + "”) não é um número.");
      var nex = Number(mNex[1]);
      if (!R.nexValido || R.nexValido(nex) !== nex) {
        aviso("nex_fora_do_trilho", "revisao", "nex", "O NEX " + nex + "% não é um degrau do R.A.M.A.; a ficha usa " + R.nexValido(nex) + "%.");
        nex = R.nexValido(nex);
      }
      o.nex = perfil === "agente" ? nex : 0;
      marco.nex = o.nex;
      if (src.nexString !== undefined && String(src.nexString) !== nexTexto) observacoes.push("nexString do CRIS (" + src.nexString + ") é diferente do NEX atual; vale o NEX atual (" + nexTexto + ").");
    } else {
      var nivel = numeroOuNulo(src.nex);
      if (nivel === null) return falhar("cris_formato_incompativel", "O nível da ficha não é um número.");
      o.nivel = Math.max(1, Math.min(20, Math.round(nivel)));
      o.nivelDefinido = true;
      marco.modo = "nivel";
      marco.nivel = o.nivel;
      var exp = /^(\d{1,2})%$/.exec(String(src.nexString || "").trim());
      var nexExp = exp ? R.nexValido(Number(exp[1])) : null;
      if (nexExp === null) {
        nexExp = Number(revisao("exposicao", "NEX de exposição", "Com NEX & Experiência, o CRIS informa o nível (" + o.nivel + "), e o NEX de exposição não veio. Nível não é porcentagem: escolha a exposição.",
          [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 99].map(function (n) { return { valor: String(n), rotulo: n + "%" }; }), "5"));
      }
      o.nex = nexExp;
      marco.nex = nexExp;
    }
    if (perfil === "sobrevivente") {
      var est = Number(revisao("estagio", "Estágio do Sobrevivente", "O CRIS não informa o estágio do Sobrevivente. Escolha o estágio atual.",
        [1, 2, 3, 4, 5].map(function (n) { return { valor: String(n), rotulo: n + "º estágio" }; }), "1"));
      o.estagio = est;
      marco.modo = "estagio";
      marco.estagio = est;
    }

    /* ---------- atributos ---------- */
    [["for", "str"], ["agi", "dex"], ["int", "int"], ["pre", "pre"], ["vig", "con"]].forEach(function (p) {
      var v = numeroOuNulo(attrs[p[1]]);
      if (v === null) { aviso("atributo_ausente", "erro", "attributes." + p[1], "Atributo " + p[0].toUpperCase() + " ausente ou inválido."); return; }
      var n = Math.round(v);
      if (n < 0 || n > 5) aviso("atributo_fora", "revisao", "attributes." + p[1], p[0].toUpperCase() + " " + n + " passa do limite do R.A.M.A. (0 a 5): fica " + Math.max(0, Math.min(5, n)) + ".");
      o.atributos[p[0]] = Math.max(0, Math.min(5, n));
    });
    if (avisos.some(function (a) { return a.gravidade === "erro"; })) return falhar("atributos", "Atributos essenciais estão corrompidos.");

    /* ---------- poderes: reconhecimento ---------- */
    var poderes = Array.isArray(src.powers) ? src.powers : [];
    var nomesDePoderes = poderes.map(function (p) { return chaveDeTexto(p.name); });
    var porNome = {};
    P.TODOS.forEach(function (e) {
      if (["classe", "geral", "paranormal", "trilha", "automatica", "sacrificio", "intencao"].indexOf(e.tipo) < 0) return;
      (porNome[chaveDeTexto(e.nome)] = porNome[chaveDeTexto(e.nome)] || []).push(e);
    });

    /* ---------- trilha: sugestão pelas habilidades, nunca imposta ---------- */
    var trilhas = classe ? C.trilhasDaClasse(classe) : [];
    var evidencias = trilhas.map(function (tr) {
      var achadas = P.habilidadesDaTrilha(tr.chave).filter(function (h) { return nomesDePoderes.indexOf(chaveDeTexto(h.nome)) >= 0; });
      return { trilha: tr, achadas: achadas };
    }).filter(function (x) { return x.achadas.length; }).sort(function (a, b) { return b.achadas.length - a.achadas.length; });
    var sugerida = evidencias.length && (evidencias.length === 1 || evidencias[0].achadas.length > evidencias[1].achadas.length) ? evidencias[0].trilha : null;
    if (trilhas.length && perfil === "agente" && o.nex >= 10) {
      var opcoesTrilha = [{ valor: "", rotulo: "Sem trilha por enquanto (decidir na Progressão)" }].concat(trilhas.map(function (tr) { return { valor: tr.chave, rotulo: tr.nome }; }));
      o.trilha = revisao("trilha", "Trilha", sugerida
        ? "O CRIS não guarda a trilha. " + evidencias.map(function (x) { return x.trilha.nome + " (" + x.achadas.map(function (h) { return h.nome; }).join(", ") + ")"; }).join("; ") + ". Sugestão: " + sugerida.nome + "."
        : "O CRIS não guarda a trilha e nenhuma habilidade de trilha foi reconhecida. Escolha a trilha ou decida depois.",
        opcoesTrilha, sugerida ? sugerida.chave : "", { evidencias: evidencias.map(function (x) { return x.trilha.nome + ": " + x.achadas.map(function (h) { return h.nome; }).join(", "); }) });
    }

    marco.degrau = R.trilho(o).passos || 0;
    o.importacao = { versao: 1, sistema: "cris", marco: marco, aquisicoes: [] };

    /* ---------- perícias ---------- */
    var periciasCris = {};
    var vistasPericia = {};
    (Array.isArray(src.skills) ? src.skills : []).forEach(function (s, i) {
      var pe = C.PERICIAS.filter(function (p) { return chaveDeTexto(p.nome) === chaveDeTexto(s.name); })[0];
      if (!pe) {
        preservados.push({ titulo: "Perícia personalizada: " + String(s.name || "?"), texto: "Atributo " + (s.attribute || "—") + ", treino " + (s.trainingDegree === undefined ? "—" : s.trainingDegree) + ", bônus " + (s.bonus === undefined ? "—" : s.bonus) + "." });
        aviso("pericia_personalizada", "informacao", "skills." + i, "A perícia “" + s.name + "” não existe no R.A.M.A. e ficou registrada como texto.");
        return;
      }
      if (vistasPericia[pe.chave]) { aviso("pericia_duplicada", "revisao", "skills." + i, "A perícia " + pe.nome + " aparece duas vezes; vale a primeira."); return; }
      vistasPericia[pe.chave] = true;
      var grau = GRAU_POR_TREINO[String(s.trainingDegree === undefined ? "" : s.trainingDegree).trim()];
      if (!grau) {
        aviso("grau_desconhecido", "revisao", "skills." + i, pe.nome + ": grau de treino “" + s.trainingDegree + "” desconhecido; ficou destreinada, e o bônus observado entra como ajuste.");
        grau = "destreinado";
      }
      if (grau !== "destreinado") o.pericias[pe.chave] = grau;
      var at = atributoDeTexto(s.attribute);
      if (at && at !== pe.atributo) o.periciasAjustes[pe.chave] = { atributo: at };
      var b = numeroOuNulo(s.bonus);
      if (b !== null) periciasCris[pe.chave] = { bonus: b, outros: numeroOuNulo(s.otherBonus), nome: pe.nome };
    });

    /* ---------- inventário ---------- */
    ficha.inventario.itens = [];
    var porIdCris = {};
    var infoItens = [];
    (Array.isArray(src.inventory) ? src.inventory : []).forEach(function (it, i) {
      var r = montarItem(it, i);
      if (!r) return;
      ficha.inventario.itens.push(r.item);
      if (it.id) porIdCris[String(it.id)] = r;
      infoItens.push(r);
    });

    function familiaCompativel(e, it) {
      var t = chaveDeTexto(it.itemType);
      if (t === "weapon") return e.tipoItem === "arma";
      if (t === "protection") return e.tipoItem === "armadura";
      if (t === "curseditem") return e.aba === "amaldicoados" && e.natureza === "item";
      if (t === "ammo" || t === "ammunition") return e.aba === "municoes";
      return e.natureza === "item" && e.tipoItem !== "arma" && e.tipoItem !== "armadura";
    }

    function candidatosDeNome(nome) {
      var n = String(nome || "");
      var lista = [{ texto: n, parte: "nome" }];
      var par = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(n);
      if (par) { lista.push({ texto: par[1], parte: "antes dos parênteses" }); lista.push({ texto: par[2], parte: "entre parênteses" }); }
      var hif = /^(.*?)\s+[-–—]\s+(.*)$/.exec(par ? par[1] : n);
      if (hif) { lista.push({ texto: hif[2], parte: "depois do hífen" }); lista.push({ texto: hif[1], parte: "antes do hífen" }); }
      return lista;
    }

    function identificar(it) {
      var cands = candidatosDeNome(it.name);
      for (var c = 0; c < cands.length; c++) {
        var k = chaveDeTexto(cands[c].texto);
        if (!k) continue;
        var achados = catItens.itens.filter(function (e) {
          return e.natureza === "item" && familiaCompativel(e, it) &&
            (chaveDeTexto(e.nome) === k || (e.alias || []).some(function (a) { return chaveDeTexto(a) === k; }));
        });
        if (achados.length === 1) return { entrada: achados[0], exata: c === 0, parte: cands[c].parte, texto: cands[c].texto };
        if (achados.length > 1) return { ambigua: achados, parte: cands[c].parte };
      }
      return null;
    }

    function escolhaPara(e, it) {
      var es = e.escolha;
      if (!es) return undefined;
      if (es.tipo === "elemento" || es.defineElemento) {
        var el = ELEMENTO_POR_TEXTO[chaveDeTexto(it.element)];
        return el && el !== "varia" ? el : undefined;
      }
      if (es.tipo === "texto") {
        var par = /\(([^)]*)\)\s*$/.exec(String(it.name || ""));
        return par ? par[1].trim() : undefined;
      }
      return undefined;
    }

    function itemPersonalizado(it, tipoItem) {
      var dados = {
        nome: String(it.name || "Item do CRIS").slice(0, 80),
        categoria: "Importado do CRIS",
        descricao: textoSeguro(it.description, 2000),
        ordem: { quantidade: Math.max(1, Math.round(numeroOuNulo(it.quantity !== undefined ? it.quantity : it.amount) || 1)) },
      };
      var cat = romanoOuNulo(it.category);
      if (cat !== null) dados.ordem.categoria = Math.max(0, Math.min(4, cat));
      var esp = numeroOuNulo(it.slots);
      if (esp !== null) dados.ordem.espacos = Math.max(0, esp);
      if (esp !== null && esp < 0) observacoes.push("“" + it.name + "”: o CRIS usa " + esp + " espaços (a mochila representada como espaço negativo); no R.A.M.A. o item ocupa 0.");
      if (ELEMENTO_POR_TEXTO[chaveDeTexto(it.element)]) dados.ordem.elemento = ELEMENTO_POR_TEXTO[chaveDeTexto(it.element)];
      if (chaveDeTexto(it.itemType) === "curseditem") dados.ordem.amaldicoado = true;
      if (tipoItem === "arma") {
        dados.ordem.arma = { tipo: chaveDeTexto(it.type) === "corpo a corpo" ? "corpoACorpo" : "distancia",
          empunhadura: chaveDeTexto(it.handling) === "leve" ? "leve" : (chaveDeTexto(it.handling) === "duas maos" ? "duasMaos" : "umaMao"),
          proficiencia: /tatica/.test(chaveDeTexto(it.proficiencie)) ? "tatica" : (/pesada/.test(chaveDeTexto(it.proficiencie)) ? "pesada" : "simples"),
          tipoDano: String(it.damageType || "").slice(0, 20) };
        dados.ordem.pericia = dados.ordem.arma.tipo === "corpoACorpo" ? "luta" : "pontaria";
        dados.critico = 20;
        dados.multiplicador = 2;
      }
      if (tipoItem === "armadura") {
        var def = numeroOuNulo(it.defense);
        dados.defesa = def === null ? 0 : def;
        dados.ordem.protecao = { tipo: "leve" };
      }
      return F.criarItem(tipoItem, dados);
    }

    function montarItem(it, i) {
      if (!it || typeof it !== "object") return null;
      var t = chaveDeTexto(it.itemType);
      var tipoItem = t === "weapon" ? "arma" : (t === "protection" ? "armadura" : "item");
      var id = identificar(it);
      var item = null, entrada = null, identificacao = "personalizado";
      var chaveRev = "item:" + (it.id || i);

      if (id && id.ambigua) {
        var opAmb = [{ valor: "", rotulo: "Item personalizado (valores observados)" }].concat(id.ambigua.map(function (e) { return { valor: e.id, rotulo: e.nome + " (" + (ITM.ROTULO_FONTE[e.fonte] || e.fonte) + ")" }; }));
        var escolhaAmb = revisao(chaveRev, "Item “" + it.name + "”", "O nome corresponde a mais de um item do catálogo. Escolha qual.", opAmb, "");
        entrada = escolhaAmb ? catItens.porId[escolhaAmb] : null;
      } else if (id && !id.exata) {
        var aceitar = revisao(chaveRev, "Item “" + it.name + "”", "Identificado como " + id.entrada.nome + " pela parte “" + id.texto + "” (" + id.parte + "). O nome personalizado é mantido.",
          [{ valor: "catalogo", rotulo: "Usar " + id.entrada.nome + " do catálogo" }, { valor: "personalizado", rotulo: "Item personalizado (valores observados)" }], "catalogo");
        entrada = aceitar === "catalogo" ? id.entrada : null;
      } else if (id) entrada = id.entrada;

      if (entrada) {
        var montado = ITM.paraInventario(entrada, { escolha: escolhaPara(entrada, it), quantidade: numeroOuNulo(it.quantity !== undefined ? it.quantity : it.amount) || 1, catalogo: catItens });
        if (!montado.ok && entrada.escolha) montado = ITM.paraInventario(entrada, { escolha: undefined, quantidade: 1, catalogo: catItens });
        if (montado.ok) {
          item = F.criarItem(montado.tipo, montado.dados);
          item.nome = String(it.name || item.nome).slice(0, 80);
          identificacao = "catalogo";
        } else {
          aviso("item_escolha", "revisao", "inventory." + i, "“" + it.name + "”: " + (montado.mensagem || "o catálogo pede uma escolha que o CRIS não informa") + " Entrou como item personalizado.");
        }
      }
      if (!item) {
        item = itemPersonalizado(it, tipoItem);
        if (!entrada) aviso("item_personalizado", "informacao", "inventory." + i, "“" + it.name + "” não foi identificado no catálogo e entrou como item personalizado, com os valores observados (composição desconhecida).");
      }
      if (!item.ordem) item.ordem = {};
      var equip = it.equipped === true;
      if (item.tipo === "armadura") { if (equip) item.ordem.emUso = true; }
      else if (entrada && entrada.vestimenta && equip) item.ordem.vestida = true;
      else if (it.equipped === true || it.equipped === false) item.ordem.equipadoNaOrigem = equip;
      if (!entrada && tipoItem === "arma") {
        /* A arma personalizada leva o que o CRIS diz dela; a reconciliação
           de dano vem com o ataque. */
        var crit = numeroOuNulo(it.criticalRange);
        if (crit !== null) item.critico = Math.max(1, Math.min(20, Math.round(crit)));
        var mult = numeroOuNulo(it.criticalMult);
        if (mult !== null) item.multiplicador = Math.max(1, Math.min(10, Math.round(mult)));
      }

      /* modificações e maldições */
      var modsNaoReconhecidos = [];
      (Array.isArray(it.mods) ? it.mods : []).forEach(function (m) {
        var k = chaveDeTexto(m.name);
        var cands = catItens.itens.filter(function (e) { return (e.natureza === "modificacao" || e.natureza === "maldicao") && chaveDeTexto(e.nome) === k; });
        if (cands.length > 1) {
          var natureza = chaveDeTexto(m.modType) === "curse" ? "maldicao" : "modificacao";
          var filtrados = cands.filter(function (e) { return e.natureza === natureza && ITM.podeAplicar(e, item).ok; });
          if (!filtrados.length) filtrados = cands.filter(function (e) { return ITM.podeAplicar(e, item).ok; });
          if (filtrados.length) cands = filtrados;
        }
        var e = cands[0];
        if (!e) { modsNaoReconhecidos.push(m); return; }
        var esc = undefined;
        if (e.escolha && (e.escolha.tipo === "elemento" || e.escolha.defineElemento)) {
          var el = ELEMENTO_POR_TEXTO[chaveDeTexto(m.element)];
          if (el && el !== "varia") esc = el;
        }
        var r = ITM.aplicar(e, item, { escolha: esc });
        if (!r.ok) {
          /* O catálogo pede uma escolha que o CRIS não guarda (a perícia da
             Função Adicional) ou a conferência recusou: o retrato entra
             mesmo assim — a categoria precisa dele —, com o aviso. */
          if (!Array.isArray(item.ordem.modificacoes)) item.ordem.modificacoes = [];
          var reg = { id: U.uuid(), catalogoId: e.id, nome: e.nome.slice(0, 80), natureza: e.natureza,
            resumo: (e.efeitos && e.efeitos.length ? e.efeitos.join(" ") : e.resumo || "").slice(0, 300), referencia: { fonte: e.fonte, pagina: e.pagina } };
          if (e.elemento) reg.elemento = e.elemento;
          if (e.calculo) reg.calculo = JSON.parse(JSON.stringify(e.calculo));
          if (e.semAcrescimoDeCategoria) reg.semAcrescimoDeCategoria = true;
          item.ordem.modificacoes.push(reg);
          var faltaEscolha = !!(e.escolha && esc === undefined);
          aviso(faltaEscolha ? "mod_sem_escolha" : "mod_fora_da_regra", "revisao", "inventory." + i, "“" + it.name + "” · " + e.nome + ": " + (faltaEscolha
            ? "o CRIS não guarda a escolha da modificação; ela entrou sem a escolha, e o efeito que depende dela fica para a mesa."
            : "o R.A.M.A. não aceitaria essa combinação (" + String(r.motivo || "conferência do catálogo").replace(/\.+$/, "") + "); a modificação foi mantida como está no CRIS."));
        }
      });
      if (modsNaoReconhecidos.length) {
        var textoMods = modsNaoReconhecidos.map(function (m) { return "• " + m.name + (m.description ? ": " + textoSeguro(m.description, 400) : ""); }).join("\n");
        item.descricao = ((item.descricao ? item.descricao + "\n\n" : "") + "Modificações do CRIS sem correspondência no catálogo:\n" + textoMods).slice(0, 2000);
        aviso("mod_desconhecida", "revisao", "inventory." + i, "“" + it.name + "”: " + modsNaoReconhecidos.map(function (m) { return m.name; }).join(", ") + " não existem no catálogo; ficaram no texto do item, sem efeito de conta.");
      }
      return { item: item, cris: it, entrada: entrada, identificacao: identificacao, indice: i, chave: "item:" + (it.id || i) };
    }

    /* ---------- poderes: aquisições ---------- */
    var aquisicoes = o.importacao.aquisicoes;
    var origemEntrada = origem ? C.origem(origem) : null;
    var trilhaAtual = o.trilha ? C.trilha(o.trilha) : null;
    var habTrilha = {};
    if (trilhaAtual) P.habilidadesDaTrilha(trilhaAtual.chave).forEach(function (h) { if (h.nex <= R.trilho(o).nexEquivalente) habTrilha[h.chave] = h; });
    var automaticas = {};
    P.AUTOMATICAS.forEach(function (a) { if (a.classes.indexOf(classe) >= 0) automaticas[a.chave] = a; });
    var pastaHabilidades = null;
    var contagemPorChave = {};

    poderes.forEach(function (p, i) {
      var k = chaveDeTexto(p.name);
      var refAq = "imp-" + String(U.uuid()).replace(/[^A-Za-z0-9]/g, "").slice(0, 20);
      if (origemEntrada && k === chaveDeTexto(origemEntrada.poder)) {
        aquisicoes.push({ ref: refAq, chave: "origem:" + origemEntrada.chave, nome: origemEntrada.poder, nomeOriginal: p.name, tipo: "origem", representacao: "regras", procedencia: "origem " + origemEntrada.nome });
        return;
      }
      var cands = (porNome[k] || []).slice();
      var el = ELEMENTO_POR_TEXTO[chaveDeTexto(p.element)];
      if (cands.length > 1 && el) {
        var mesmoEl = cands.filter(function (e) { return e.elemento === el; });
        if (mesmoEl.length) cands = mesmoEl;
      }
      if (cands.length > 1) {
        var daClasse = cands.filter(function (e) { return (e.classes || []).indexOf(classe) >= 0 || e.tipo === "paranormal" || e.tipo === "geral"; });
        if (daClasse.length) cands = daClasse;
      }
      var e = null;
      if (cands.length > 1) {
        var escolha = revisao("poder:" + (p.id || i), "Poder “" + p.name + "”", "Há mais de uma habilidade com esse nome no catálogo. Escolha qual é (ou mantenha só o texto).",
          [{ valor: "", rotulo: "Manter como texto (sem efeito)" }].concat(cands.map(function (x) { return { valor: x.chave, rotulo: x.nome + " · " + x.tipo + (x.fonte ? " · " + x.fonte : "") }; })), "");
        e = escolha ? P.poder(escolha) : null;
      } else e = cands[0] || null;

      if (!e) {
        var habilidade = H.criarHabilidade({ nome: String(p.name || "Poder do CRIS").slice(0, 120), texto: textoSeguro(p.description, 8000), origem: "CRIS" });
        if (!pastaHabilidades) { pastaHabilidades = H.criarPasta("Importado do CRIS"); H.inserir(ficha.habilidades, pastaHabilidades); }
        H.inserir(ficha.habilidades, habilidade, pastaHabilidades.id);
        aquisicoes.push({ ref: refAq, chave: "", nome: String(p.name || "").slice(0, 120), nomeOriginal: p.name, tipo: "personalizado", representacao: "texto", procedencia: "desconhecida" });
        aviso("poder_personalizado", "informacao", "powers." + i, "“" + p.name + "” não está no catálogo e entrou como habilidade de texto (pasta Importado do CRIS), sem efeito de conta.");
        return;
      }
      if (automaticas[e.chave] || habTrilha[e.chave] && !habTrilha[e.chave].opcoes.length) {
        aquisicoes.push({ ref: refAq, chave: e.chave, nome: e.nome, nomeOriginal: p.name, tipo: e.tipo, representacao: "regras", procedencia: automaticas[e.chave] ? "classe" : "trilha " + trilhaAtual.nome });
        return;
      }
      contagemPorChave[e.chave] = (contagemPorChave[e.chave] || 0) + 1;
      var repetida = contagemPorChave[e.chave] > 1;
      if (repetida && !e.repetivel && e.tipo !== "paranormal") {
        aviso("poder_repetido", "revisao", "powers." + i, e.nome + " aparece mais de uma vez e não é repetível: a segunda ficou de fora.");
        return;
      }
      var aq = { ref: refAq, chave: e.chave, nome: e.nome, nomeOriginal: p.name, tipo: e.tipo, elemento: e.elemento || "", afinidade: repetida && e.tipo === "paranormal", representacao: "importada", procedencia: "desconhecida" };
      if (habTrilha[e.chave]) aq.procedencia = "trilha " + trilhaAtual.nome + " (opção não informada)";
      else if (e.tipo === "classe" && (e.classes || []).indexOf(classe) < 0) {
        aq.procedencia = nomesDePoderes.indexOf(chaveDeTexto("Expansão de Conhecimento")) >= 0
          ? "poder de outra classe (provavelmente Expansão de Conhecimento)" : "poder de outra classe (procedência desconhecida)";
      }
      else if (e.tipo === "trilha") aq.procedencia = "habilidade de trilha fora da trilha da ficha (procedência desconhecida)";

      /* Procedência: um item com o nome do poder (Dedo Decepado (X)). */
      var itemDoPoder = infoItens.filter(function (x) { var par = /\(([^)]*)\)\s*$/.exec(x.cris.name || ""); return par && chaveDeTexto(par[1]) === k; })[0];
      if (itemDoPoder) {
        var proc = revisao("procedencia:" + (p.id || i), "Procedência de " + e.nome, "O inventário tem “" + itemDoPoder.cris.name + "” (" + (itemDoPoder.cris.equipped === true ? "em uso" : "guardado") + "). O CRIS não diz se o poder vem do item.",
          [{ valor: "ficha", rotulo: "Poder da ficha (procedência desconhecida)" }, { valor: "item", rotulo: "Concedido pelo item: sem efeito fora dele" }], "ficha");
        if (proc === "item") {
          aq.representacao = "item";
          aq.procedencia = "concedido por " + itemDoPoder.cris.name;
        }
      }
      aquisicoes.push(aq);
    });

    /* Origem com poder à escolha (Traços do Outro Lado): de onde veio é
       procedência anotada, sem registro fictício na progressão. */
    if (origemEntrada && origemEntrada.escolha && origemEntrada.escolha.tipo === "poderParanormal") {
      var paranormais = aquisicoes.filter(function (a) { return a.tipo === "paranormal" && a.representacao === "importada"; });
      if (paranormais.length) {
        var deOrigem = revisao("origem:poder", origemEntrada.poder, "A origem dá um poder paranormal, e o CRIS não diz qual. Indicar não muda a conta (cada poder entra uma vez só); fica anotado como procedência.",
          [{ valor: "", rotulo: "Não informado" }].concat(paranormais.map(function (a) { return { valor: a.ref, rotulo: a.nome }; })), "");
        paranormais.forEach(function (a) { if (a.ref === deOrigem) a.procedencia = "origem " + origemEntrada.nome + " (" + origemEntrada.poder + ")"; });
      }
    }

    /* ---------- ataques ---------- */
    var ataquesPorItem = {};
    (Array.isArray(src.attacks) ? src.attacks : []).forEach(function (a, i) {
      var alvo = a.itemId ? porIdCris[String(a.itemId)] : null;
      if (alvo && alvo.item.tipo === "arma") {
        (ataquesPorItem[alvo.item.id] = ataquesPorItem[alvo.item.id] || []).push(a);
        return;
      }
      /* Ataque sem item (ou com item que não é arma): uma arma de 0
         espaço, identificada, para a rolagem continuar existindo — sem
         inventar um exemplar do item. */
      var semItem = F.criarItem("arma", {
        nome: ("Ataque: " + String(a.name || "sem nome")).slice(0, 80), categoria: "Importado do CRIS",
        descricao: "Ataque do CRIS sem item correspondente no inventário" + (a.itemId ? " (o item ligado não existe ou não é arma)" : "") + ". Não ocupa espaço nem conta na patente.",
        critico: 20, multiplicador: 2,
        ordem: { espacos: 0, quantidade: 1, arma: { tipo: /dist|curto|medio|longo/.test(chaveDeTexto(a.range)) ? "distancia" : "corpoACorpo", tipoDano: String(a.damageType || "").slice(0, 20) } },
      });
      semItem.ordem.categoria = null;
      ficha.inventario.itens.push(semItem);
      (ataquesPorItem[semItem.id] = ataquesPorItem[semItem.id] || []).push(a);
      infoItens.push({ item: semItem, cris: { name: a.name, damage: a.damage, criticalRange: a.criticalRange, criticalMult: a.criticalMult }, entrada: null, identificacao: "ataqueSemItem", indice: -1, chave: "ataque:" + (a.id || i) });
      aviso("ataque_sem_item", "revisao", "attacks." + i, "O ataque “" + a.name + "” não tem item no inventário: virou uma arma de 0 espaço com os valores observados.");
    });

    /* ---------- arma favorita (A Favorita): só se a trilha a dá ---------- */
    var favoritaVaga = null;
    if (o.trilha === "aniquilador" && R.trilho(o).nexEquivalente >= 10) {
      var armas = infoItens.filter(function (x) { return x.item.tipo === "arma" && x.identificacao !== "ataqueSemItem"; });
      if (armas.length) {
        var fav = revisao("favorita", "Arma favorita (A Favorita)", "A trilha Aniquilador escolhe uma arma favorita, e o CRIS não guarda qual. Escolher reduz a categoria dela pela regra (I, II em NEX 40%); sem escolher, a categoria observada fica como ajuste de composição desconhecida.",
          [{ valor: "", rotulo: "Não informada (decidir depois)" }].concat(armas.map(function (x) { return { valor: x.chave, rotulo: x.item.nome }; })), "");
        var armaFav = armas.filter(function (x) { return x.chave === fav; })[0];
        if (armaFav) favoritaVaga = { itemId: armaFav.item.id, nome: armaFav.item.nome };
      }
    }
    if (favoritaVaga) {
      var vaga = E.vagas(o).filter(function (v) { return v.id === "b.aFavorita"; })[0];
      if (vaga) E.registrar(o, vaga, { valor: "aFavorita", opcoes: { arma: favoritaVaga.nome, itens: [favoritaVaga.itemId] } });
    }

    /* ---------- reconciliação dos itens ---------- */
    function calc() { return R.calcular(o, ficha.inventario); }

    infoItens.forEach(function (info) { reconciliarItem(info); });

    function ajustarItem(item, chave, valor, motivo) {
      if (!valor) return;
      if (!item.ordem.ajustesImportados) item.ordem.ajustesImportados = {};
      item.ordem.ajustesImportados[chave] = (item.ordem.ajustesImportados[chave] || 0) + valor;
      item.ordem.ajustesImportados.motivo = ((item.ordem.ajustesImportados.motivo ? item.ordem.ajustesImportados.motivo + " · " : "") + motivo).slice(0, 300);
    }

    function valorDoAtributoDeDano(arma, chave) {
      if (chave === "melhor") return Math.max(R.atributo(o, "for"), R.atributo(o, "agi"));
      if (["for", "agi", "int", "pre", "vig"].indexOf(chave) >= 0) return R.atributo(o, chave);
      return 0;
    }

    function reconciliarItem(info) {
      var item = info.item, it = info.cris;
      var nomeVisivel = item.nome;
      var ataques = ataquesPorItem[item.id] || [];

      if (item.tipo === "arma") {
        var at = ataques[0] || null;
        if (ataques.length > 1) {
          var outros = ataques.slice(1).map(function (a) { return "• " + (a.name || "Ataque") + ": " + (a.damage || "—") + " (" + (a.damageType || "") + "), crítico " + (a.criticalRange || "—") + "/x" + (a.criticalMult || "—") + ", perícia " + (a.skillUsed || "—") + ", atributo " + (a.damageAttribute || "—"); }).join("\n");
          item.descricao = ((item.descricao ? item.descricao + "\n\n" : "") + "Outras configurações de ataque no CRIS (rolar à mão):\n" + outros).slice(0, 2000);
          aviso("varios_ataques", "revisao", "attacks", "“" + nomeVisivel + "” tem " + ataques.length + " ataques no CRIS: o primeiro configura a arma; os outros ficaram descritos no item.");
        }
        var pericia = at && at.skillUsed ? C.PERICIAS.filter(function (p) { return chaveDeTexto(p.nome) === chaveDeTexto(at.skillUsed); })[0] : null;
        if (pericia) item.ordem.pericia = pericia.chave;
        if (!item.ordem.arma) item.ordem.arma = {};
        var atrDano = at && at.damageAttribute !== undefined ? atributoDeTexto(at.damageAttribute) || (chaveDeTexto(at.damageAttribute) === "" || /nenhum/.test(chaveDeTexto(at.damageAttribute)) ? "nenhum" : "") : "";
        if (atrDano) item.ordem.arma.atributoDano = atrDano;

        var expr = analisarExpressao(at ? at.damage : it.damage);
        if (!expr.ok) {
          aviso("expressao_nao_suportada", "revisao", "attacks", "“" + nomeVisivel + "”: o dano “" + (at ? at.damage : it.damage) + "” não cabe no formato do R.A.M.A.; ficou descrito no item, para rolar à mão.");
          item.descricao = ((item.descricao ? item.descricao + "\n\n" : "") + "Dano no CRIS: " + (at ? at.damage : it.damage)).slice(0, 2000);
        } else if (expr.termos.length) {
          var dados = expr.termos.filter(function (t) { return t.tipo === "dados" && !t.negativo; });
          var constObs = expr.termos.filter(function (t) { return t.tipo === "constante"; }).reduce(function (s, t) { return s + t.valor; }, 0);
          if (expr.termos.some(function (t) { return t.negativo; })) aviso("dado_negativo", "revisao", "attacks", "“" + nomeVisivel + "”: o dano tem dados subtraídos, que o R.A.M.A. não representa; foram ignorados na conta.");
          var ef = R.armaEfetiva(o, ficha.inventario, item, ficha.pericias);
          var principalRama = /^(\d+)d(\d+)$/.exec(String(ef.dano || ""));
          var principal = dados[0];
          if (principal && principalRama && Number(principalRama[2]) === principal.faces) {
            var dif = principal.quantidade - Number(principalRama[1]);
            if (dif) {
              var golpe = aquisicoes.some(function (a) { return a.chave === "golpePesado"; }) && (item.ordem.arma.tipo === "corpoACorpo");
              ajustarItem(item, "dadosDano", dif, golpe ? "Golpe Pesado no CRIS (+1 dado); no R.A.M.A. ele é só descrito" : "dados de dano observados no CRIS");
            }
          } else if (principal && !info.entrada) {
            item.dano = principal.quantidade + "d" + principal.faces;
          } else if (principal) {
            item.dano = principal.quantidade + "d" + principal.faces;
            aviso("dano_base_diferente", "revisao", "attacks", "“" + nomeVisivel + "”: o dado principal do CRIS (" + principal.quantidade + "d" + principal.faces + ") não é o do catálogo; ficou o observado, com composição desconhecida.");
          }
          var extras = dados.slice(1);
          var lancinante = (item.ordem.modificacoes || []).some(function (m) { return m.catalogoId === "op.maldicao.arma.lancinante"; });
          var extraAtual = analisarExpressao(item.danoExtra);
          var extraRama = extraAtual.ok ? extraAtual.termos.filter(function (t) { return t.tipo === "dados"; }) : [];
          var faltam = extras.filter(function (x) { return !extraRama.some(function (y) { return y.faces === x.faces && y.quantidade === x.quantidade; }); });
          if (faltam.length && !extraRama.length) {
            item.danoExtra = faltam[0].quantidade + "d" + faltam[0].faces;
            if (lancinante && faltam[0].faces === 8 && faltam[0].quantidade === 1) {
              item.ordem.arma.tipoDanoExtra = "Sangue";
              item.ordem.arma.extraMultiplica = true;
            } else if (at && at.damageType) item.ordem.arma.tipoDanoExtra = String(at.damageType).slice(0, 20);
            faltam = faltam.slice(1);
          }
          if (faltam.length) {
            item.descricao = ((item.descricao ? item.descricao + "\n\n" : "") + "Dados extras do CRIS sem lugar na arma: " + faltam.map(function (x) { return x.quantidade + "d" + x.faces; }).join(" + ") + " (rolar à mão).").slice(0, 2000);
            aviso("dano_composto", "revisao", "attacks", "“" + nomeVisivel + "”: o dano tem mais parcelas de dados do que a arma do R.A.M.A. guarda; as que sobraram ficaram descritas no item.");
          }
          var adicionais = at && Array.isArray(at.aditionalDamage) ? at.aditionalDamage.filter(function (x) { return x && x.value; }) : [];
          if (adicionais.length) {
            item.descricao = ((item.descricao ? item.descricao + "\n\n" : "") + "Dano adicional no CRIS (não automatizado): " + adicionais.map(function (x) { return x.value + (x.damageType ? " " + x.damageType : ""); }).join("; ") + ".").slice(0, 2000);
            aviso("dano_adicional", "revisao", "attacks", "“" + nomeVisivel + "”: " + adicionais.length + " parcela(s) de dano adicional (" + adicionais.map(function (x) { return x.value; }).join(", ") + ") ficaram descritas no item, sem rolagem automática.");
          }
          if (at && numeroOuNulo(at.extraDamage)) aviso("extra_legado", "revisao", "attacks", "“" + nomeVisivel + "”: o campo extraDamage (" + at.extraDamage + ") não é usado na rolagem do CRIS analisada; não foi somado.");

          ef = R.armaEfetiva(o, ficha.inventario, item, ficha.pericias);
          var atrVal = valorDoAtributoDeDano(item, ef.atributoDano || item.ordem.arma.atributoDano || "");
          var constRama = (ef.extra ? ef.extra.total : 0) - (ef.extra && ef.extra.parcelas.some(function (x) { return /^(Força|Agilidade|Intelecto|Presença|Vigor)$/.test(x.rotulo); }) ? atrVal : 0);
          ajustarItem(item, "dano", constObs - constRama, "parte fixa do dano observada no CRIS");

          if (at && numeroOuNulo(at.attackBonus)) ajustarItem(item, "ataque", numeroOuNulo(at.attackBonus), "bônus de ataque do CRIS");
          ef = R.armaEfetiva(o, ficha.inventario, item, ficha.pericias);
          var margemObs = numeroOuNulo(at ? at.criticalRange : it.criticalRange);
          if (margemObs !== null && ef.margem) ajustarItem(item, "margem", ef.margem - Math.round(margemObs), "margem de ameaça observada no CRIS");
          var multObs = numeroOuNulo(at ? at.criticalMult : it.criticalMult);
          if (multObs !== null) ajustarItem(item, "multiplicador", Math.round(multObs) - ef.multiplicador, "multiplicador observado no CRIS");

          /* As duas rolagens, lado a lado: normal e crítico. */
          ef = R.armaEfetiva(o, ficha.inventario, item, ficha.pericias);
          var mult = ef.multiplicador || 2;
          var atrFinal = ef.extra && ef.extra.parcelas.some(function (x) { return /^(Força|Agilidade|Intelecto|Presença|Vigor)$/.test(x.rotulo); }) ? atrVal : 0;
          var normal = montarExpressao(dados, constObs + atrFinal);
          var critCris = montarExpressao(dados.map(function (x) { return { quantidade: x.quantidade * mult, faces: x.faces }; }), constObs * mult + atrFinal);
          var pr = /^(\d+)d(\d+)$/.exec(String(ef.dano || ""));
          var dadosRama = [];
          if (pr) dadosRama.push({ quantidade: Number(pr[1]) * mult, faces: Number(pr[2]) });
          var exRama = analisarExpressao(item.danoExtra);
          (exRama.ok ? exRama.termos.filter(function (t) { return t.tipo === "dados"; }) : []).forEach(function (x) {
            dadosRama.push({ quantidade: x.quantidade * (ef.extraMultiplica ? mult : 1), faces: x.faces });
          });
          var critRama = montarExpressao(dadosRama, ef.extra ? ef.extra.total : 0);
          if (critCris !== critRama) {
            criticos.push({ item: nomeVisivel, origem: critCris, rama: critRama });
            revisao("critico:" + info.chave, "Crítico de " + nomeVisivel, "No crítico, o CRIS repete a expressão inteira (" + critCris + "); o R.A.M.A. multiplica só os dados (" + critRama + "). A ficha segue a regra do R.A.M.A.; a fórmula do CRIS fica anotada.",
              [{ valor: "rama", rotulo: "Entendi: usar a regra do R.A.M.A." }], "rama", { reconhecer: true });
          }
          info.rolagens = { normal: normal, criticoCris: critCris, criticoRama: critRama };
        }
      }

      if (item.tipo === "armadura") {
        var defObs = numeroOuNulo(it.defense);
        if (defObs !== null) {
          var defRama = R.defesaDaProtecao(item).total;
          ajustarItem(item, "defesa", Math.round(defObs) - defRama, "Defesa observada no CRIS");
        }
      }

      /* categoria e espaços: depois de tudo o que muda o item */
      var catObs = romanoOuNulo(it.category);
      function registroDeCategoria() {
        var uso = R.usoPorCategoria(o, ficha.inventario);
        var achado = null;
        Object.keys(uso.categorias).forEach(function (n) { uso.categorias[n].itens.forEach(function (x) { if (x.id === item.id) achado = x; }); });
        uso.acimaDeIV.forEach(function (x) { if (x.id === item.id) achado = x; });
        return achado;
      }
      if (catObs !== null) {
        var regCat = registroDeCategoria();
        /* Item personalizado: a categoria observada já inclui as
           modificações, então a base é o que sobra delas. */
        if (regCat && !info.entrada && regCat.efetiva !== catObs && typeof item.ordem.categoria === "number") {
          item.ordem.categoria = Math.max(0, item.ordem.categoria + catObs - regCat.efetiva);
          regCat = registroDeCategoria();
        }
        if (regCat && regCat.efetiva !== catObs) {
          var motivoCat = "categoria observada no CRIS (" + rotuloRomano(catObs) + "); composição desconhecida";
          if (regCat.efetiva > catObs && o.trilha === "aniquilador" && item.tipo === "arma" && !favoritaVaga) motivoCat += " — uma arma favorita explicaria a redução";
          ajustarItem(item, "categoria", catObs - regCat.efetiva, motivoCat);
        }
      }
      var espObs = numeroOuNulo(it.slots);
      if (espObs !== null && espObs >= 0) {
        var ocup = R.ocupacaoDoInventario ? R.ocupacaoDoInventario(o, ficha.inventario) : null;
        var regEsp = ocup && ocup.itens ? ocup.itens.filter(function (x) { return x.id === item.id; })[0] : null;
        var espRama = regEsp ? regEsp.unitarioEfetivo : null;
        if (typeof espRama === "number" && !info.entrada && Math.abs(espObs - espRama) >= 0.01) {
          item.ordem.espacos = Math.max(0, (numeroOuNulo(item.ordem.espacos) || 0) + espObs - espRama);
          espRama = espObs;
        }
        if (typeof espRama === "number" && Math.abs(espObs - espRama) >= 0.5) ajustarItem(item, "espacos", Math.round(espObs - espRama), "espaços observados no CRIS");
      }
    }

    /* ---------- rituais ---------- */
    ficha.rituais.itens = [];
    (Array.isArray(src.rituals) ? src.rituals : []).forEach(function (r, i) {
      var k = chaveDeTexto(r.name);
      var cands = catRituais.rituais.filter(function (e) { return chaveDeTexto(e.nome) === k; });
      var circ = numeroOuNulo(r.circle);
      if (cands.length > 1 && circ !== null) {
        var mesmoCirc = cands.filter(function (e) { return e.circulo === circ; });
        if (mesmoCirc.length) cands = mesmoCirc;
      }
      var e = cands.length === 1 ? cands[0] : null;
      if (cands.length > 1) {
        var esc = revisao("ritual:" + (r.id || i), "Ritual “" + r.name + "”", "Há mais de um ritual com esse nome no catálogo.",
          [{ valor: "", rotulo: "Ritual personalizado (valores do CRIS)" }].concat(cands.map(function (x) { return { valor: x.id, rotulo: x.nome + " · " + x.circulo + "º · " + x.fonte }; })), "");
        e = esc ? catRituais.porId[esc] : null;
      }
      if (e && circ !== null && e.circulo !== circ) aviso("ritual_circulo", "revisao", "rituals." + i, r.name + ": o CRIS diz " + circ + "º círculo e o catálogo, " + e.circulo + "º. Vale o catálogo.");
      var ritual = null;
      if (e) {
        var elemento = undefined;
        if (e.escolha && e.escolha.tipo === "elemento") {
          var elCris = ELEMENTO_POR_TEXTO[chaveDeTexto(r.element)];
          if (elCris && elCris !== "varia" && e.escolha.opcoes.indexOf(elCris) >= 0) elemento = elCris;
          else {
            elemento = revisao("ritual-elemento:" + (r.id || i), "Elemento de " + e.nome, "O ritual é do elemento escolhido ao aprender, e o CRIS guarda “" + (r.element || "—") + "”. Escolha o elemento ou deixe para depois (o ritual entra sem elemento definido).",
              [{ valor: "", rotulo: "Não informado" }].concat(e.escolha.opcoes.map(function (x) { return { valor: x, rotulo: RS.nomeDoElemento ? RS.nomeDoElemento(x) : x }; })), "") || undefined;
          }
        } else {
          var elC = ELEMENTO_POR_TEXTO[chaveDeTexto(r.element)];
          if (elC && e.elemento && elC !== e.elemento && !e.todosOsElementos) aviso("ritual_elemento", "revisao", "rituals." + i, r.name + ": o CRIS diz " + r.element + " e o catálogo, " + e.elemento + ". Vale o catálogo.");
        }
        var montado = RS.paraFicha(e, { escolha: elemento });
        if (!montado.ok) montado = e.escolha ? RS.paraFicha(e, { escolha: e.escolha.opcoes[0] }) : montado;
        if (montado.ok && !elemento && e.escolha) {
          montado.dados.elemento = "Varia";
          if (montado.dados.ordem) delete montado.dados.ordem.elemento;
        }
        if (montado.ok) ritual = F.criarRitual(montado.dados);
      }
      if (!ritual) {
        var resist = String(r.save || r.resistance || "");
        ritual = F.criarRitual({
          nome: String(r.name || "Ritual do CRIS").slice(0, 120),
          circulo: circ !== null ? circ + "º círculo" : "",
          elemento: String(r.element || ""),
          execucao: String(r.execution || ""), alcance: String(r.range || ""), alvo: String(r.target || ""), area: String(r.area || ""),
          duracao: String(r.duration || ""), resistencia: resist,
          descricao: textoSeguro(r.description, 8000),
          complemento: "Ritual do CRIS sem correspondência no catálogo do R.A.M.A." + (r.cost ? " Custo no CRIS: " + r.cost + "." : ""),
        });
        aviso("ritual_personalizado", "informacao", "rituals." + i, "“" + r.name + "” não está no catálogo e entrou como ritual personalizado, com os campos do CRIS e a descrição em texto.");
      }
      ritual.adicionadoEm = U.agoraISO();
      ficha.rituais.itens.push(ritual);
    });

    /* ---------- conferência numérica ----------
       Cada linha: o que o CRIS mostra, o que o R.A.M.A. calcula com o que
       foi reconhecido, o valor final e o porquê. Ajuste só onde a
       diferença ficou sem fonte reconhecida (ou a pessoa escolheu manter
       o número do CRIS). */
    function ajusteDaOrdem(alvo, valor, motivo) {
      if (!valor) return;
      o.ajustes.push({ id: U.uuid(), alvo: alvo, valor: valor, motivo: ("Importação CRIS: " + motivo).slice(0, 120), manual: true });
      ajustesDoc.push({ alvo: alvo, valor: valor, motivo: motivo });
    }
    function linha(campo, cris, rama, final, motivo, ajuste) {
      comparacao.push({ campo: campo, cris: cris, rama: rama, final: final, motivo: motivo, ajuste: ajuste || null, igual: cris === final });
    }
    function sinal(n) { return (n > 0 ? "+" : "−") + Math.abs(n); }
    function nomesDasParcelas(lista) {
      var vistos = {};
      return lista.filter(function (x) { if (vistos[x.rotulo]) return false; vistos[x.rotulo] = true; return true; })
        .map(function (x) { return x.rotulo + " (" + sinal(x.valor) + ")"; }).join(", ");
    }

    var c = calc();

    /* perícias: o bônus do CRIS já inclui o treino; um poder que o
       R.A.M.A. automatiza e o CRIS não somava não vira ajuste negativo
       sem a pessoa pedir. */
    var automatizadas = [];
    Object.keys(periciasCris).forEach(function (k) {
      var pc = periciasCris[k];
      var conta = R.bonusDePericia(o, k, ficha.inventario);
      if (pc.bonus === conta.total) return;
      var efeitos = conta.parcelas.slice(1).filter(function (x) { return x.valor; });
      var x = { chave: k, nome: pc.nome, cris: pc.bonus, rama: conta.total, efeitos: efeitos };
      if (efeitos.length && conta.total > pc.bonus && !pc.outros) { automatizadas.push(x); return; }
      ajusteDaOrdem("pericia:" + k, pc.bonus - conta.total, "bônus de " + pc.nome + " observado no CRIS");
      linha("Perícia " + pc.nome, pc.bonus, conta.total, pc.bonus,
        (pc.outros ? "outros bônus do CRIS (" + sinal(pc.outros) + ")" : "diferença sem fonte reconhecida") + "; ajuste importado", pc.bonus - conta.total);
    });
    if (automatizadas.length) {
      var segue = revisao("pericias:automaticas", "Perícias com efeito automático", "O R.A.M.A. soma efeitos que o CRIS não somava: " +
        automatizadas.map(function (x) { return x.nome + " " + x.cris + " → " + x.rama + " (" + nomesDasParcelas(x.efeitos) + ")"; }).join("; ") + ".",
        [{ valor: "rama", rotulo: "Seguir o R.A.M.A. (o efeito vale)" }, { valor: "cris", rotulo: "Manter os totais do CRIS (ajuste negativo)" }], "rama");
      automatizadas.forEach(function (x) {
        if (segue === "cris") ajusteDaOrdem("pericia:" + x.chave, x.cris - x.rama, "total de " + x.nome + " mantido como no CRIS");
        linha("Perícia " + x.nome, x.cris, x.rama, segue === "cris" ? x.cris : x.rama,
          segue === "cris" ? "total do CRIS mantido por decisão" : "o R.A.M.A. soma " + nomesDasParcelas(x.efeitos) + "; o CRIS não somava", segue === "cris" ? x.cris - x.rama : null);
      });
    }

    /* máximos de recursos (PD só com a regra ligada) */
    var recursosPelaRegra = {};
    var pdLigada = src.isPdOn === true;
    c = calc();
    [["pv", "Pv", "PV"], ["pe", "Pe", "PE"], ["san", "San", "SAN"], ["pd", "Pd", "PD"]].forEach(function (r) {
      if (r[0] === "pd" && !pdLigada) return;
      var obs = numeroOuNulo(src["max" + r[1]]);
      if (obs === null || !c[r[0]]) return;
      var rama = c[r[0]].total;
      if (obs === rama) { linha(r[2] + " máximo", obs, rama, rama, "igual", null); return; }
      var motivo = r[0] === "san" && origem === "cultistaarrependido" && obs > rama
        ? "o R.A.M.A. aplica a metade da Sanidade da classe (Traços do Outro Lado); o CRIS não"
        : "máximo observado no CRIS; composição desconhecida";
      var escolha = revisao("maximo:" + r[0], r[2] + " máximo", "O CRIS mostra " + obs + "; o R.A.M.A. calcula " + rama + " (" + motivo + ").",
        [{ valor: "cris", rotulo: "Manter " + obs + " (ajuste importado " + sinal(obs - rama) + ")" }, { valor: "rama", rotulo: "Usar o cálculo do R.A.M.A. (" + rama + ")" }], "cris");
      if (escolha === "cris") ajusteDaOrdem(r[0], obs - rama, motivo);
      else recursosPelaRegra[r[0]] = true;
      linha(r[2] + " máximo", obs, rama, escolha === "cris" ? obs : rama, motivo, escolha === "cris" ? obs - rama : null);
      c = calc();
    });
    if (!pdLigada && numeroOuNulo(src.maxPd) !== null) observacoes.push("PD no CRIS: " + src.currentPd + "/" + src.maxPd + " (regra desligada; o valor atual fica guardado para quando ela for ligada).");

    /* defesa, bloqueio, esquiva — nessa ordem (bloqueio e esquiva leem a Defesa) */
    var protDef = numeroOuNulo(src.protectionDefense) || 0;
    var bonusDef = numeroOuNulo(src.bonusDefense) || 0;
    var defObs = 10 + o.atributos.agi + protDef + bonusDef;
    c = calc();
    var defRama = c.defesa.total;
    if (defObs !== defRama) {
      var diffDef = defObs - defRama;
      /* A maldição Defesa de acessório (+5) é descrita, não automatizada,
         no R.A.M.A.: quando ela explica a diferença, o motivo diz isso. */
      var sigilo = infoItens.filter(function (x) { return (x.item.ordem.modificacoes || []).some(function (m) { return m.catalogoId === "op.maldicao.acessorio.defesa"; }); })[0];
      var motivoDef = sigilo && diffDef === 5
        ? "provavelmente a maldição Defesa de “" + sigilo.item.nome + "” (+5), que o R.A.M.A. descreve sem automatizar; bônus extra importado"
        : "bônus de Defesa do CRIS sem fonte reconhecida; bônus extra importado";
      o.bonusExtra.defesa = (o.bonusExtra.defesa || 0) + diffDef;
      ajustesDoc.push({ alvo: "bonusExtra.defesa", valor: diffDef, motivo: "Defesa observada no CRIS (proteção " + protDef + ", bônus " + bonusDef + ")" + (sigilo && diffDef === 5 ? "; provável maldição Defesa de " + sigilo.item.nome : "") });
      linha("Defesa", defObs, defRama, defObs, motivoDef, diffDef);
    } else linha("Defesa", defObs, defRama, defRama, "igual", null);
    [["bloqueio", "block", "Bloqueio"], ["esquiva", "evade", "Esquiva"]].forEach(function (x) {
      var obs = numeroOuNulo(src[x[1]]);
      if (obs === null) return;
      var rama = calc()[x[0]].total;
      if (obs !== rama) {
        o.bonusExtra[x[0]] = (o.bonusExtra[x[0]] || 0) + (obs - rama);
        ajustesDoc.push({ alvo: "bonusExtra." + x[0], valor: obs - rama, motivo: x[2] + " observado no CRIS" });
      }
      linha(x[2], obs, rama, obs, obs === rama ? "igual" : "diferença sem fonte reconhecida; bônus extra importado", obs === rama ? null : obs - rama);
    });

    c = calc();
    var desl = numeroOuNulo(src.movement);
    if (desl !== null && c.deslocamento) {
      var deslRama = c.deslocamento.total;
      if (desl !== deslRama) ajusteDaOrdem("deslocamento", desl - deslRama, "deslocamento observado no CRIS");
      linha("Deslocamento", desl, deslRama, desl, desl === deslRama ? "igual" : "diferença sem fonte reconhecida; ajuste importado", desl === deslRama ? null : desl - deslRama);
    }
    c = calc();
    var limPe = numeroOuNulo(src.peTurn);
    if (limPe !== null && c.limitePe) {
      var limRama = c.limitePe.total;
      if (limPe !== limRama) ajusteDaOrdem("limitePe", limPe - limRama, "limite de PE observado no CRIS");
      linha("Limite de PE por turno", limPe, limRama, limPe, limPe === limRama ? "igual" : "diferença sem fonte reconhecida; ajuste importado", limPe === limRama ? null : limPe - limRama);
    }
    c = calc();
    var cap = numeroOuNulo(src.maxLoad);
    if (cap !== null && c.carga) linha("Capacidade de carga", cap, c.carga.limite, c.carga.limite, cap === c.carga.limite ? "igual" : "conferência: no CRIS a mochila pode entrar como espaço negativo; vale a conta do R.A.M.A.", null);
    var cargaObs = numeroOuNulo(src.currentLoad);
    if (cargaObs !== null && c.carga) linha("Carga ocupada", cargaObs, c.carga.ocupado, c.carga.ocupado, cargaObs === c.carga.ocupado ? "igual" : "conferência: vale a soma dos itens no R.A.M.A.", null);
    var dtObs = numeroOuNulo(src.ritualsDc);
    var dtRama = RS.dtDeResistencia ? RS.dtDeResistencia(o) : null;
    if (dtObs !== null && ficha.rituais.itens.length && dtRama) {
      linha("DT dos rituais", dtObs, dtRama.total, dtRama.total, dtObs === dtRama.total ? "igual" : "conferência: a DT é calculada pelo R.A.M.A.", null);
      if (dtObs !== dtRama.total) observacoes.push("DT dos rituais no CRIS: " + dtObs + "; no R.A.M.A.: " + dtRama.total + ".");
    }
    o.prestigio = Math.max(0, Math.round(numeroOuNulo(src.prestigePoints) || 0));
    c = calc();
    if (src.patent && c.patente && c.patente.patente) {
      var mesmaPatente = chaveDeTexto(src.patent) === chaveDeTexto(c.patente.patente.nome);
      linha("Patente", String(src.patent), c.patente.patente.nome, c.patente.patente.nome, mesmaPatente ? "igual" : "a patente do R.A.M.A. sai dos pontos de prestígio; a do CRIS pode ser manual", null);
      if (!mesmaPatente) observacoes.push("Patente no CRIS: " + src.patent + ".");
    }

    /* Limites de categoria da patente: o R.A.M.A. avisa, o CRIS não
       confere. Nada é removido; a ficha mostra o aviso no inventário. */
    var usoFinal = R.usoPorCategoria(o, ficha.inventario);
    var excedidas = Object.keys(usoFinal.categorias).filter(function (n) { return usoFinal.categorias[n].excedido; });
    if (excedidas.length || usoFinal.acimaDeIV.length) {
      aviso("limite_da_patente", "revisao", "inventory", "Pela patente " + (c.patente && c.patente.patente ? c.patente.patente.nome : "atual") +
        ", o R.A.M.A. aponta itens acima do limite" + (excedidas.length ? " nas categorias " + excedidas.map(function (n) { return rotuloRomano(Number(n)); }).join(", ") : "") +
        (usoFinal.acimaDeIV.length ? " e " + usoFinal.acimaDeIV.length + " item(ns) acima da categoria IV" : "") + ". O CRIS não confere isso; nada foi removido.");
    }

    /* ---------- recursos atuais: depois dos máximos finais ----------
       Sem descanso e sem preencher: o atual do CRIS, zero incluído. Só
       quando a pessoa escolheu o máximo do R.A.M.A. o atual cabe nele. */
    c = calc();
    o.recursos = { pv: null, pe: null, san: null, pd: null };
    [["pv", "currentPv"], ["pe", "currentPe"], ["san", "currentSan"], ["pd", "currentPd"]].forEach(function (x) {
      var v = numeroOuNulo(src[x[1]]);
      if (v === null) return;
      v = Math.round(v);
      if (recursosPelaRegra[x[0]] && c[x[0]] && v > c[x[0]].total) {
        observacoes.push(x[0].toUpperCase() + " atual no CRIS era " + v + "; ficou " + c[x[0]].total + " para caber no máximo do R.A.M.A.");
        v = c[x[0]].total;
      }
      o.recursos[x[0]] = v;
    });

    /* ---------- texto preservado ---------- */
    if (src.player) preservados.push({ titulo: "Jogador", texto: String(src.player).slice(0, 200) });
    if (src.proficiencies) preservados.push({ titulo: "Proficiências no CRIS", texto: String(src.proficiencies).slice(0, 2000) });
    if (src.resistances) preservados.push({ titulo: "Resistências no CRIS", texto: String(src.resistances).slice(0, 2000) });
    if (src.resistencias && Object.keys(src.resistencias).length) preservados.push({ titulo: "Resistências (lista) no CRIS", texto: Object.keys(src.resistencias).map(function (k) { return k + ": " + src.resistencias[k]; }).join("\n").slice(0, 2000) });
    if (Array.isArray(src.imunidades) && src.imunidades.length) preservados.push({ titulo: "Imunidades no CRIS", texto: src.imunidades.join(", ").slice(0, 2000) });
    if (Array.isArray(src.vulnerabilidades) && src.vulnerabilidades.length) preservados.push({ titulo: "Vulnerabilidades no CRIS", texto: src.vulnerabilidades.join(", ").slice(0, 2000) });
    if (nomeOriginal.length > 80) preservados.push({ titulo: "Nome completo", texto: nomeOriginal });
    var desc = src.description || {};
    [["personal", "Personalidade"], ["goal", "Objetivo"], ["physical", "Aparência"], ["history", "História"], ["anotation", "Anotações do CRIS"]].forEach(function (x) {
      var t = textoSeguro(desc[x[0]]);
      if (t) preservados.push({ titulo: x[1], texto: t });
    });

    var pasta = F.criarPasta("Importado do CRIS");
    var notaOrigem = F.criarNota("Origem da importação");
    notaOrigem.conteudo = ["Importado do CRIS em " + (fonte.lidoEm || "") + " (" + ADAPTADOR + ").", "Link: " + ref.url,
      "Importação pontual: mudanças posteriores no CRIS não sincronizam.",
      "Marco: " + (marco.modo === "nivel" ? "nível " + marco.nivel + ", exposição " + marco.nex + "%" : marco.modo === "estagio" ? "estágio " + marco.estagio : "NEX " + marco.nex + "%") + ". As etapas até ele aparecem como histórico indisponível na Progressão."]
      .concat(ajustesDoc.length ? ["", "Ajustes importados:"].concat(ajustesDoc.map(function (a) { return "• " + a.alvo + " " + (a.valor > 0 ? "+" : "") + a.valor + " — " + a.motivo; })) : [])
      .concat(observacoes.length ? ["", "Observações:"].concat(observacoes.map(function (t) { return "• " + t; })) : [])
      .concat(criticos.length ? ["", "Críticos (CRIS × R.A.M.A.):"].concat(criticos.map(function (x) { return "• " + x.item + ": CRIS " + x.origem + "; R.A.M.A. " + x.rama; })) : [])
      .join("\n").slice(0, 20000);
    pasta.notas.push(notaOrigem);
    preservados.forEach(function (p) {
      var partes = [];
      for (var i = 0; i < p.texto.length; i += 19000) partes.push(p.texto.slice(i, i + 19000));
      if (partes.length > 1) aviso("texto_dividido", "informacao", p.titulo, "“" + p.titulo + "” passou de 20 000 caracteres e foi dividido em " + partes.length + " anotações.");
      partes.forEach(function (t, n) {
        var nota = F.criarNota(p.titulo + (partes.length > 1 ? " (" + (n + 1) + "/" + partes.length + ")" : ""));
        nota.conteudo = t;
        pasta.notas.push(nota);
      });
    });
    ficha.anotacoes.pastas.push(pasta);

    /* ---------- o marco, completo ---------- */
    o.importacao = {
      versao: 1, sistema: "cris",
      fonte: { url: ref.url, documentId: ref.documentId, lidoEm: fonte.lidoEm || U.agoraISO(), updateTime: fonte.updateTime || "", adaptador: ADAPTADOR },
      marco: marco,
      estadoAtualComoBase: true,
      aquisicoes: aquisicoes,
      revisoes: revisoes.map(function (r) { return { codigo: r.chave, campo: r.rotulo, valor: String(r.valor === undefined ? "" : r.valor), texto: r.texto }; }),
      observacoes: observacoes,
      ajustes: ajustesDoc,
      criticos: criticos,
      rituais: ficha.rituais.itens.map(function (r) { return r.id; }),
    };

    /* A ficha passa pela normalização de sempre: o que sair daqui é o que
       o R.A.M.A. grava, abre e exporta. */
    var normal = F.normalizarFicha(JSON.parse(JSON.stringify(ficha)));
    var cf = R.calcular(normal.ordem, normal.inventario);

    var bloqueado = avisos.some(function (a) { return a.gravidade === "erro"; });
    return {
      ok: !bloqueado,
      ficha: normal,
      avisos: avisos,
      pendencias: revisoes,
      comparacao: comparacao,
      preservadosComoTexto: preservados,
      bloqueado: bloqueado,
      itens: infoItens.map(function (x) { return { nome: x.item.nome, identificacao: x.identificacao, catalogoId: x.entrada ? x.entrada.id : "", rolagens: x.rolagens || null }; }),
      resumo: {
        nome: normal.nome, classe: (C.classe(normal.ordem.classe) || {}).nome || "—", origem: (C.origem(normal.ordem.origem) || {}).nome || String(src.backgroundName || "—"),
        trilha: normal.ordem.trilha ? (C.trilha(normal.ordem.trilha) || {}).nome : "—",
        progressao: cf.trilho ? cf.trilho.rotulo : "",
        atributos: normal.ordem.atributos,
        recursos: { pv: [normal.ordem.recursos.pv, cf.pv.total], pe: [normal.ordem.recursos.pe, cf.pe.total], san: [normal.ordem.recursos.san, cf.san.total], pd: cf.determinacao ? [normal.ordem.recursos.pd, cf.pd.total] : null },
        defesa: cf.defesa.total, bloqueio: cf.bloqueio.total, esquiva: cf.esquiva.total,
        itens: normal.inventario.itens.length, poderes: aquisicoes.length, rituais: normal.rituais.itens.length,
        semSanidade: !!normal.ordem.opcionais.semSanidade,
      },
    };
  }

  global.RAMAImportarCris = {
    ADAPTADOR: ADAPTADOR,
    MENSAGENS: MENSAGENS,
    validarLink: validarLink,
    mensagemDeErro: mensagemDeErro,
    textoSeguro: textoSeguro,
    analisarExpressao: analisarExpressao,
    chaveDeTexto: chaveDeTexto,
    converter: converter,
  };
})(typeof window !== "undefined" ? window : globalThis);
