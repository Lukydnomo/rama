/* =====================================================================
   R.A.M.A. — validação
   ---------------------------------------------------------------------
   Um lugar só para dizer se um valor serve. As telas chamam daqui e
   mostram a mensagem que vem junto; nenhum campo depende apenas de
   min/max no HTML, que o navegador aplica de forma desigual e que
   qualquer pessoa contorna abrindo o console.

   Isto NÃO substitui a validação do servidor. O Apps Script confere de
   novo tudo o que importa, porque o frontend inteiro é território de
   quem usa. O que existe aqui é para avisar cedo e com clareza — não
   para proteger o banco.

   Todo validador devolve a mesma forma:
       { ok: true,  valor: <valor já convertido> }
       { ok: false, erro: "codigo", mensagem: "frase para a tela" }
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var D = global.RAMADados;
  var F = global.RAMAFicha;

  function bom(valor) { return { ok: true, valor: valor }; }
  function ruim(erro, mensagem) { return { ok: false, erro: erro, mensagem: mensagem }; }

  /* =================================================================
     PRIMITIVOS
     ================================================================= */

  function id(valor) {
    var v = U.aparar(valor, 80);
    if (!v) return ruim("vazio", "Identificador em branco.");
    if (!/^[A-Za-z0-9_-]{4,80}$/.test(v)) return ruim("formato", "Identificador com caracteres inesperados.");
    return bom(v);
  }

  function nome(valor, limite) {
    var v = U.aparar(valor, limite || 80);
    if (!v) return ruim("vazio", "Informe um nome.");
    return bom(v);
  }

  function inteiroEntre(valor, minimo, maximo, rotulo) {
    var texto = U.texto(valor).trim();
    if (texto === "") return bom(0);
    if (!/^[+-]?\d+$/.test(texto)) {
      return ruim("nao_inteiro", (rotulo || "O valor") + " precisa ser um número inteiro.");
    }
    var n = parseInt(texto, 10);
    if (n < minimo) return ruim("baixo", (rotulo || "O valor") + " não pode ser menor que " + minimo + ".");
    if (n > maximo) return ruim("alto", (rotulo || "O valor") + " não pode ser maior que " + maximo + ".");
    return bom(n);
  }

  /* =================================================================
     DADOS E COMBATE
     ================================================================= */

  var MOTIVOS_DADO = {
    vazio: "Informe uma expressão de dado, como 2d20.",
    formato: "Formato inválido. Use NdX, por exemplo 1d20, 3d6 ou -2d20.",
    quantidade: "A quantidade de dados precisa ser um inteiro positivo.",
    faces: "O número de faces precisa ser um inteiro positivo.",
    quantidade_alta: "São dados demais numa rolagem só (máximo " + (D ? D.MAX_QUANTIDADE : 100) + ").",
    faces_altas: "São faces demais para um dado (máximo " + (D ? D.MAX_FACES : 1000) + ").",
  };

  function dado(valor) {
    var a = D.analisar(valor);
    if (!a.ok) return ruim(a.erro, MOTIVOS_DADO[a.erro] || MOTIVOS_DADO.formato);
    return bom(a.expressao);
  }

  /* Dado que pode ficar em branco — o dano de um item que ainda não foi
     configurado, por exemplo. Vazio passa; errado, não. */
  function dadoOpcional(valor) {
    if (U.aparar(valor) === "") return bom("");
    return dado(valor);
  }

  /* A margem de crítico é a face a partir da qual o golpe é crítico.
     Zero significa "esta arma não critica" e é um valor legítimo. */
  function critico(valor) {
    return inteiroEntre(valor, 0, 1000, "A margem de crítico");
  }

  function multiplicador(valor) {
    var r = inteiroEntre(valor, 1, 10, "O multiplicador");
    if (!r.ok) return r;
    if (r.valor < 1) return ruim("baixo", "O multiplicador precisa ser pelo menos 1.");
    return r;
  }

  function peso(valor) {
    var texto = U.texto(valor).trim().replace(",", ".");
    if (texto === "") return bom(0);
    if (!/^\d+(\.\d{1,2})?$/.test(texto)) {
      return ruim("formato", "O peso aceita números positivos, com até duas casas.");
    }
    var n = parseFloat(texto);
    if (n < 0) return ruim("negativo", "O peso não pode ser negativo.");
    if (n > 100000) return ruim("alto", "Peso alto demais.");
    return bom(Math.round(n * 100) / 100);
  }

  function bonus(valor) { return inteiroEntre(valor, -999, 999, "O bônus"); }

  function valorDeAtributo(valor) { return inteiroEntre(valor, -99, 999, "O valor"); }

  function valorDeStatus(valor) { return inteiroEntre(valor, -9999, 999999, "O valor"); }

  /* =================================================================
     REGISTROS INTEIROS
     -----------------------------------------------------------------
     Devolvem a lista de problemas em vez de parar no primeiro: quem
     preencheu um formulário quer ver tudo o que falta de uma vez.
     ================================================================= */

  function pericia(p) {
    var problemas = [];
    if (!U.aparar(p && p.nome)) problemas.push("A perícia precisa de um nome.");
    if (!p || !p.atributoId) problemas.push("Escolha o atributo vinculado.");

    var b = bonus(p && p.bonus);
    if (!b.ok) problemas.push(b.mensagem);

    (((p && p.dadosExtras) || [])).forEach(function (m, i) {
      var d = dado(m && m.dado);
      if (!d.ok) problemas.push("Dado extra " + (i + 1) + ": " + d.mensagem);
    });

    return problemas.length ? { ok: false, erro: "invalido", problemas: problemas } : bom(p);
  }

  function arma(a) {
    var problemas = [];
    if (!U.aparar(a && a.nome)) problemas.push("A arma precisa de um nome.");

    var d = dadoOpcional(a && a.dano);
    if (!d.ok) problemas.push("Dano: " + d.mensagem);

    var pe = peso(a && a.peso);
    if (!pe.ok) problemas.push("Peso: " + pe.mensagem);

    var c = critico(a && a.critico);
    if (!c.ok) problemas.push(c.mensagem);

    var m = multiplicador(a && a.multiplicador);
    if (!m.ok) problemas.push(m.mensagem);

    /* Dano extra aceita número ou expressão de dado. Só recusa o que
       não é nenhum dos dois. */
    var extra = U.aparar(a && a.danoExtra);
    if (extra && !/^[+-]?\d+$/.test(extra) && !D.valida(extra)) {
      problemas.push("Dano extra: use um número (como 4) ou uma expressão de dado (como 1d6).");
    }

    return problemas.length ? { ok: false, erro: "invalido", problemas: problemas } : bom(a);
  }

  function item(i) {
    if (!i || typeof i !== "object") return ruim("vazio", "Item sem conteúdo.");
    if (i.tipo === "arma") return arma(i);

    var problemas = [];
    if (!U.aparar(i.nome)) problemas.push("O item precisa de um nome.");

    if (i.tipo === "mochila") {
      var r = peso(i.reducaoPeso);
      if (!r.ok) problemas.push("Redução de peso: " + r.mensagem);
    } else {
      var pe = peso(i.peso);
      if (!pe.ok) problemas.push("Peso: " + pe.mensagem);
    }

    if (i.tipo === "armadura") {
      var d = inteiroEntre(i.defesa, -999, 999, "A defesa");
      if (!d.ok) problemas.push(d.mensagem);
    }

    return problemas.length ? { ok: false, erro: "invalido", problemas: problemas } : bom(i);
  }

  function personagem(f) {
    var problemas = [];
    if (!f || typeof f !== "object") return ruim("vazio", "Ficha sem conteúdo.");
    if (!U.aparar(f.nome)) problemas.push("O personagem precisa de um nome.");
    if (!Array.isArray(f.atributos) || !f.atributos.length) problemas.push("A ficha precisa de pelo menos um atributo.");

    (f.atributos || []).forEach(function (a) {
      var d = dado(a && a.dado);
      if (!d.ok) problemas.push("Atributo " + (a && a.nome ? a.nome : "?") + ": " + d.mensagem);
    });

    (f.pericias || []).forEach(function (p) {
      var r = pericia(p);
      if (!r.ok) problemas.push.apply(problemas, r.problemas);
    });

    ((f.inventario && f.inventario.itens) || []).forEach(function (i) {
      var r = item(i);
      if (!r.ok) problemas.push.apply(problemas, r.problemas || [r.mensagem]);
    });

    return problemas.length ? { ok: false, erro: "invalido", problemas: problemas } : bom(f);
  }

  function homebrew(h) {
    var problemas = [];
    if (!h || typeof h !== "object") return ruim("vazio", "Registro sem conteúdo.");
    if (!U.aparar(h.nome)) problemas.push("O registro precisa de um nome.");
    if (F.TIPOS_ITEM.indexOf(h.tipo) < 0) problemas.push("Tipo desconhecido.");
    var r = item(h);
    if (!r.ok) problemas.push.apply(problemas, r.problemas || []);
    return problemas.length ? { ok: false, erro: "invalido", problemas: problemas } : bom(h);
  }

  /* =================================================================
     IMPORTAÇÃO
     -----------------------------------------------------------------
     O arquivo importado vem de fora e não merece confiança nenhuma.
     Três coisas acontecem aqui, nesta ordem:

       1. conferir que é mesmo um arquivo do R.A.M.A., do tipo certo e
          de uma versão que este sistema entende;
       2. ARRANCAR o que não pode vir de fora — dono, identificadores e
          qualquer coisa parecida com credencial. Um arquivo que
          declara ownerId estaria tentando escrever no arquivo de
          outra pessoa;
       3. deixar a estrutura passar pela normalização, que já sabe
          consertar o que dá e descartar o que não dá.

     O servidor faz a mesma coisa de novo. Isto aqui é para a prévia
     mostrar a verdade, não para ser a barreira.
     ================================================================= */

  var TIPOS_IMPORTACAO = ["personagem", "homebrew-item"];

  /* Nada com estes nomes atravessa a importação, em nenhum nível. */
  var CAMPOS_PROIBIDOS = [
    "ownerId", "userId", "usuarioId", "dono",
    "token", "tokenHash", "sessao", "session",
    "senha", "hashSenha", "salt", "segredo",
    "rev", "id",
  ];

  function limparProibidos(valor, profundidade) {
    if (profundidade > 12) return null;
    if (Array.isArray(valor)) {
      return valor.map(function (v) { return limparProibidos(v, profundidade + 1); });
    }
    if (valor && typeof valor === "object") {
      var saida = {};
      Object.keys(valor).forEach(function (k) {
        if (CAMPOS_PROIBIDOS.indexOf(k) >= 0) return;
        saida[k] = limparProibidos(valor[k], profundidade + 1);
      });
      return saida;
    }
    return valor;
  }

  function importado(pacote) {
    if (!pacote || typeof pacote !== "object") {
      return ruim("formato", "O arquivo não contém um objeto JSON.");
    }
    if (pacote.rama !== true) {
      return ruim("nao_rama", "Este arquivo não foi gerado pelo R.A.M.A.");
    }
    if (TIPOS_IMPORTACAO.indexOf(pacote.tipo) < 0) {
      return ruim("tipo", "Tipo de arquivo desconhecido: " + U.texto(pacote.tipo || "(vazio)") + ".");
    }

    var versao = U.inteiro(pacote.versaoFormato, 0);
    var atual = (global.RAMA_CONFIG && global.RAMA_CONFIG.VERSAO_FORMATO) || 1;
    if (versao < 1) return ruim("versao", "O arquivo não informa a versão do formato.");
    if (versao > atual) {
      return ruim("versao_nova",
        "O arquivo foi gerado por uma versão mais nova do R.A.M.A. (formato " + versao + ").");
    }

    if (!pacote.dados || typeof pacote.dados !== "object" || Array.isArray(pacote.dados)) {
      return ruim("sem_dados", "O arquivo não traz dados para importar.");
    }

    var limpo = limparProibidos(pacote.dados, 0);

    if (pacote.tipo === "personagem") {
      var ficha = F.normalizarFicha(limpo);
      var v = personagem(ficha);
      if (!v.ok) return { ok: false, erro: "invalido", mensagem: "A ficha tem problemas.", problemas: v.problemas };
      return { ok: true, tipo: "personagem", dados: ficha };
    }

    /* homebrew-item */
    var reg = F.normalizarItem(limpo);
    if (!reg) return ruim("invalido", "O item importado não pôde ser lido.");
    delete reg.id;                       // o id nasce aqui, não vem de fora
    reg.origemHomebrewId = null;
    var vh = item(reg);
    if (!vh.ok) return { ok: false, erro: "invalido", mensagem: "O item tem problemas.", problemas: vh.problemas };
    return { ok: true, tipo: "homebrew-item", dados: reg };
  }

  /* Monta o pacote de saída. A contraparte de importado(). */
  function exportar(tipo, dados) {
    return {
      rama: true,
      tipo: tipo,
      versaoFormato: (global.RAMA_CONFIG && global.RAMA_CONFIG.VERSAO_FORMATO) || 1,
      geradoEm: U.agoraISO(),
      dados: limparProibidos(dados, 0),
    };
  }

  global.RAMAValidacao = {
    id: id,
    nome: nome,
    inteiroEntre: inteiroEntre,
    dado: dado,
    dadoOpcional: dadoOpcional,
    critico: critico,
    multiplicador: multiplicador,
    peso: peso,
    bonus: bonus,
    valorDeAtributo: valorDeAtributo,
    valorDeStatus: valorDeStatus,
    pericia: pericia,
    arma: arma,
    item: item,
    personagem: personagem,
    homebrew: homebrew,
    importado: importado,
    exportar: exportar,
    TIPOS_IMPORTACAO: TIPOS_IMPORTACAO,
    CAMPOS_PROIBIDOS: CAMPOS_PROIBIDOS,
  };
})(typeof window !== "undefined" ? window : globalThis);
