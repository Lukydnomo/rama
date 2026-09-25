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

  /* Um tipo por FORMA de dado. Criatura e habilidade não cabem em
     "homebrew-item": passá-las pela normalização de item transformaria
     uma criatura num item com nome e peso, perdendo status, atributos,
     perícias e ataques em silêncio. */
  var TIPOS_IMPORTACAO = ["personagem", "homebrew-item", "homebrew-criatura", "homebrew-habilidade"];

  /* Descobre o tipo de exportação a partir do registro. */
  function tipoDeExportacao(registro) {
    if (!registro || !registro.tipo) return "homebrew-item";
    if (registro.tipo === "criatura") return "homebrew-criatura";
    if (registro.tipo === "habilidade") return "homebrew-habilidade";
    return "homebrew-item";
  }

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

  /* =================================================================
     O VÍNCULO DE RITUAL ATRAVESSANDO A IMPORTAÇÃO
     -----------------------------------------------------------------
     Uma concessão de progressão aponta para um ritual da ficha pelo ID
     dele, e exportar apaga todos os ids — ninguém leva a identidade de
     uma ficha para outra. Sem a travessia abaixo, um ocultista
     importado abriria com os rituais na ficha e todas as concessões
     pendentes, como se nunca tivesse aprendido nada.

     A travessia é por POSIÇÃO: ao exportar, cada vínculo anota em que
     lugar da lista o ritual está; ao importar, a posição vira o id novo
     daquele ritual.

     E ela só é aceita quando o ritual daquela posição AINDA é o mesmo:
     mesma origem de catálogo e mesmo nome. Um arquivo editado à mão que
     embaralhe a lista não ganha um vínculo errado — ganha nenhum, e a
     concessão volta a ficar pendente, com os rituais do lado. Vínculo
     faltando quem joga resolve; vínculo errado mentiria sobre de onde o
     ritual veio.
     ================================================================= */

  var MARCA_POSICAO = "_pos";

  /* Uma cópia da ficha com cada vínculo de ritual marcado com a posição
     dele na lista. Só é chamada ao exportar. */
  function comPosicoesDeRitual(ficha) {
    return comApresentacaoPortavel(comPosicoesDosRituais(ficha));
  }

  /* =================================================================
     O QUE MAIS PRECISA ATRAVESSAR (v2.19)
     -----------------------------------------------------------------
     · As habilidades das regras que a pessoa pôs numa pasta guardam o
       id da pasta (`organizacao.habilidades.lugares` e `ordem`). A
       importação troca o id de toda pasta — então a pasta vai como
       CAMINHO na árvore ("#arv:0.2": a terceira coisa da primeira), que
       a importação refaz com o id novo. A árvore atravessa com a mesma
       forma, e o caminho continua certo.
     · Os inícios de turno das condições têm `id`, e `id` não atravessa.
       Eles vão como `evento` e voltam a ser `id` antes da normalização —
       sem isso, um personagem importado morrendo "2 de 3" voltaria "0
       de 3".
     ================================================================= */

  var PREFIXO_ARVORE = "#arv:";

  function caminhosDaArvore(arvore) {
    var porId = {};
    var porCaminho = {};
    (function andar(filhos, prefixo, prof) {
      if (prof > 12) return;
      (Array.isArray(filhos) ? filhos : []).forEach(function (no, i) {
        if (!no || typeof no !== "object") return;
        var caminho = prefixo ? prefixo + "." + i : String(i);
        if (typeof no.id === "string" && no.id) {
          porId[no.id] = caminho;
          porCaminho[caminho] = no.id;
        }
        if (Array.isArray(no.filhos)) andar(no.filhos, caminho, prof + 1);
      });
    })(arvore && arvore.filhos, "", 0);
    return { porId: porId, porCaminho: porCaminho };
  }

  function trocarIdsDaApresentacao(org, trocar) {
    if (!org || typeof org !== "object") return;
    if (org.lugares && typeof org.lugares === "object") {
      Object.keys(org.lugares).forEach(function (aq) {
        var novo = trocar(org.lugares[aq]);
        if (novo) org.lugares[aq] = novo; else delete org.lugares[aq];
      });
    }
    if (org.ordem && typeof org.ordem === "object") {
      var nova = {};
      Object.keys(org.ordem).forEach(function (conteiner) {
        var chave = conteiner === "*" ? "*" : trocar(conteiner);
        if (!chave || !Array.isArray(org.ordem[conteiner])) return;
        nova[chave] = org.ordem[conteiner].map(function (k) {
          if (typeof k !== "string" || k.indexOf("n:") !== 0) return k;
          var id = trocar(k.slice(2));
          return id ? "n:" + id : null;
        }).filter(Boolean);
      });
      org.ordem = nova;
    }
  }

  function comApresentacaoPortavel(ficha) {
    var org = ficha && ficha.ordem && ficha.ordem.organizacao ? ficha.ordem.organizacao.habilidades : null;
    var cond = ficha && ficha.ordem ? ficha.ordem.condicoes : null;
    var temLugares = org && ((org.lugares && Object.keys(org.lugares).length) || (org.ordem && Object.keys(org.ordem).length));
    if (!temLugares && !(cond && typeof cond === "object")) return ficha;

    var copia = JSON.parse(JSON.stringify(ficha));
    if (temLugares) {
      var mapa = caminhosDaArvore(copia.habilidades).porId;
      trocarIdsDaApresentacao(copia.ordem.organizacao.habilidades, function (id) {
        return mapa[id] !== undefined ? PREFIXO_ARVORE + mapa[id] : "";
      });
    }
    percorrerEventos(copia.ordem.condicoes, function (e) {
      if (typeof e.id === "string") { e.evento = e.id; delete e.id; }
    });
    return copia;
  }

  function percorrerEventos(cond, fn) {
    if (!cond || typeof cond !== "object") return;
    var listas = [cond.morrendo, cond.enlouquecendo];
    if (cond.mesa && typeof cond.mesa === "object") listas.push(cond.mesa.exaustao, cond.mesa.desmaio);
    listas.forEach(function (r) {
      if (r && Array.isArray(r.eventos)) r.eventos.forEach(function (e) { if (e && typeof e === "object") fn(e); });
    });
  }

  /* Antes de normalizar o que veio do arquivo: `evento` volta a ser `id`. */
  function devolverIdsDosEventos(dados) {
    percorrerEventos(dados && dados.ordem ? dados.ordem.condicoes : null, function (e) {
      if (typeof e.evento === "string") { e.id = e.evento; delete e.evento; }
    });
  }

  /* Depois de normalizar: o caminho na árvore vira o id novo da pasta. */
  function refazerApresentacao(ficha) {
    var org = ficha && ficha.ordem && ficha.ordem.organizacao ? ficha.ordem.organizacao.habilidades : null;
    if (!org) return;
    var mapa = caminhosDaArvore(ficha.habilidades).porCaminho;
    trocarIdsDaApresentacao(org, function (valor) {
      if (typeof valor !== "string" || valor.indexOf(PREFIXO_ARVORE) !== 0) return valor;
      return mapa[valor.slice(PREFIXO_ARVORE.length)] || "";
    });
  }

  function comPosicoesDosRituais(ficha) {
    var itens = (ficha && ficha.rituais && Array.isArray(ficha.rituais.itens)) ? ficha.rituais.itens : [];
    var escolhas = (ficha && ficha.ordem && Array.isArray(ficha.ordem.escolhas)) ? ficha.ordem.escolhas : [];
    var registros = (ficha && ficha.ordem && Array.isArray(ficha.ordem.registrosDeRitual)) ? ficha.ordem.registrosDeRitual : [];
    if (!itens.length || (!escolhas.length && !registros.length)) return ficha;

    var mapa = {};
    itens.forEach(function (r, i) {
      if (r && typeof r === "object" && typeof r.id === "string" && r.id) mapa[r.id] = i;
    });

    var copia = JSON.parse(JSON.stringify(ficha));
    if (Array.isArray(copia.ordem.escolhas)) marcarPosicoes(copia.ordem.escolhas, mapa, 0);
    /* Os registros de estudo e da mesa apontam para o ritual por
       `ritualId`, e a normalização deles não guarda campo de fora — a
       posição vai no próprio `ritualId`, como "#pos:N". */
    (Array.isArray(copia.ordem.registrosDeRitual) ? copia.ordem.registrosDeRitual : []).forEach(function (r) {
      if (r && typeof r.ritualId === "string" && mapa[r.ritualId] !== undefined) r.ritualId = PREFIXO_POSICAO + mapa[r.ritualId];
    });
    return copia;
  }

  var PREFIXO_POSICAO = "#pos:";

  function marcarPosicoes(valor, mapa, profundidade) {
    if (profundidade > 12 || !valor || typeof valor !== "object") return;
    if (Array.isArray(valor)) {
      valor.forEach(function (v) { marcarPosicoes(v, mapa, profundidade + 1); });
      return;
    }
    if (typeof valor.id === "string" && mapa[valor.id] !== undefined) valor[MARCA_POSICAO] = mapa[valor.id];
    Object.keys(valor).forEach(function (k) {
      if (k === "id") return;
      marcarPosicoes(valor[k], mapa, profundidade + 1);
    });
  }

  function refazerVinculos(ficha) {
    var itens = (ficha.rituais && Array.isArray(ficha.rituais.itens)) ? ficha.rituais.itens : [];
    var escolhas = (ficha.ordem && Array.isArray(ficha.ordem.escolhas)) ? ficha.ordem.escolhas : [];
    aplicarPosicoes(escolhas, itens, 0);
    /* Registro que não acha o ritual continua guardado, apontando para
       lugar nenhum: a ficha mostra o registro sem efeito, com o motivo,
       e quem joga decide. */
    ((ficha.ordem && Array.isArray(ficha.ordem.registrosDeRitual)) ? ficha.ordem.registrosDeRitual : []).forEach(function (r) {
      if (!r || typeof r.ritualId !== "string" || r.ritualId.indexOf(PREFIXO_POSICAO) !== 0) return;
      var pos = parseInt(r.ritualId.slice(PREFIXO_POSICAO.length), 10);
      if (mesmoRitual(itens[pos], { nome: r.nome })) r.ritualId = itens[pos].id;
    });
  }

  /* O ritual daquela posição ainda é o que o vínculo descrevia? */
  function mesmoRitual(ritual, vinculo) {
    if (!ritual || !ritual.id) return false;
    var catalogo = typeof vinculo.catalogo === "string" ? vinculo.catalogo : "";
    if (catalogo && String(ritual.origemCatalogoId || "") !== catalogo) return false;
    var nome = typeof vinculo.nome === "string" ? vinculo.nome : "";
    if (nome && String(ritual.nome || "") !== nome) return false;
    return !!(catalogo || nome);
  }

  function aplicarPosicoes(valor, itens, profundidade) {
    if (profundidade > 12 || !valor || typeof valor !== "object") return;
    if (Array.isArray(valor)) {
      valor.forEach(function (v) { aplicarPosicoes(v, itens, profundidade + 1); });
      return;
    }
    var pos = valor[MARCA_POSICAO];
    if (typeof pos === "number" && pos >= 0) {
      if (mesmoRitual(itens[pos], valor)) valor.id = itens[pos].id;
      delete valor[MARCA_POSICAO];
    }
    Object.keys(valor).forEach(function (k) {
      aplicarPosicoes(valor[k], itens, profundidade + 1);
    });
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
      /* O vínculo entre uma concessão de progressão e um ritual da ficha
         é por id, e a importação apaga TODOS os ids — ninguém importa a
         identidade de outra ficha. Sem a travessia abaixo, um ocultista
         importado abriria com os rituais na ficha e todas as concessões
         pendentes, como se nunca tivesse aprendido nada. */
      devolverIdsDosEventos(limpo);
      var ficha = F.normalizarFicha(limpo);
      var v = personagem(ficha);
      if (!v.ok) return { ok: false, erro: "invalido", mensagem: "A ficha tem problemas.", problemas: v.problemas };

      refazerVinculos(ficha);
      refazerApresentacao(ficha);
      return { ok: true, tipo: "personagem", dados: ficha };
    }

    if (pacote.tipo === "homebrew-criatura") {
      /* A tela do Perfil não carrega o modelo de criatura — ela importa
         fichas e itens. Sem esta guarda, um arquivo de criatura colado
         ali estouraria com um erro que não explica nada. */
      if (!global.RAMACriaturas) {
        return ruim("tipo", "Este arquivo é uma criatura. Importe-o pela tela Homebrew.");
      }
      var criatura = global.RAMACriaturas.normalizar(limpo);
      delete criatura.id;
      /* Nasce privada, sempre. Um arquivo não publica nada na conta de
         quem importou. */
      criatura.visibilidade = "privado";
      if (!U.aparar(criatura.nome)) return ruim("invalido", "A criatura precisa de um nome.");
      return { ok: true, tipo: "homebrew-criatura", dados: criatura };
    }

    if (pacote.tipo === "homebrew-habilidade") {
      var hab = global.RAMAHabilidades.normalizarHabilidade(limpo);
      if (!hab) return ruim("invalido", "A habilidade importada não pôde ser lida.");
      delete hab.id;
      hab.tipo = "habilidade";
      hab.visibilidade = "privado";
      hab.origemHabilidadeId = null;
      return { ok: true, tipo: "homebrew-habilidade", dados: hab };
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
    /* Numa ficha, o vínculo entre concessão e ritual vira posição antes
       de os ids irem embora. Ver "O VÍNCULO DE RITUAL ATRAVESSANDO A
       IMPORTAÇÃO", acima. */
    var preparado = tipo === "personagem" ? comPosicoesDeRitual(dados) : dados;
    return {
      rama: true,
      tipo: tipo,
      versaoFormato: (global.RAMA_CONFIG && global.RAMA_CONFIG.VERSAO_FORMATO) || 1,
      geradoEm: U.agoraISO(),
      dados: limparProibidos(preparado, 0),
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
