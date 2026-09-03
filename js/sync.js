/* =====================================================================
   R.A.M.A. — conciliação
   ---------------------------------------------------------------------
   Duas pessoas — ou a mesma pessoa em dois aparelhos — abrem a mesma
   ficha. Uma salva primeiro e a revisão do servidor muda. Quando a
   segunda tenta salvar, o servidor recusa. É aqui que a conversa
   continua.

   Recarregar a página seria a saída fácil e a pior possível: jogaria
   fora exatamente a alteração que a pessoa acabou de fazer. Em vez
   disso comparamos três versões:

     BASE      o que o servidor confirmou da última vez, nesta aba
     LOCAL     o que está nesta tela agora
     SERVIDOR  o que está lá agora, depois da gravação do outro

   Com as três dá para separar quem mexeu no quê. Campo que só um lado
   tocou entra sozinho. Campo que os dois tocaram, para valores
   diferentes, é o único que precisa de gente para decidir.

   A comparação é canônica: "3" e 3 são o mesmo número. Sem isso o
   sistema acusaria conflito toda vez que um campo de texto devolvesse
   um número como string.

   NADA disto é guardado em disco. A BASE vive na memória da aba.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;

  /* =================================================================
     MESCLA
     -----------------------------------------------------------------
     esquema = {
       listas:  { "pericias": "id", "inventario.itens": "id" },
       ignorar: ["atualizadoEm"],
       rotulos: { "pericias": "Perícia", "bonus": "Bônus" },
     }

     Cada conflito guarda uma referência viva para o objeto do
     resultado. Aplicar a escolha depois é uma atribuição direta, sem
     precisar percorrer caminho nenhum de volta — e caminho percorrido
     de volta é onde esse tipo de código costuma errar.
     ================================================================= */

  function mesclar(base, local, servidor, esquema) {
    var e = esquema || {};
    var estado = {
      listas: e.listas || {},
      ignorar: e.ignorar || [],
      rotulos: e.rotulos || {},
      conflitos: [],
      automaticos: [],
    };

    var saida = mesclarObjeto("", base, local, servidor, estado, "");
    return { estado: saida, conflitos: estado.conflitos, automaticos: estado.automaticos };
  }

  function ehObjeto(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  function caminhoDe(prefixo, chave) {
    return prefixo ? prefixo + "." + chave : chave;
  }

  function mesclarObjeto(caminho, base, local, servidor, ctx, contexto) {
    var saida = U.copiar(servidor);
    if (!ehObjeto(saida)) saida = {};

    var chaves = {};
    [base, local, servidor].forEach(function (o) {
      if (ehObjeto(o)) Object.keys(o).forEach(function (k) { chaves[k] = true; });
    });

    Object.keys(chaves).forEach(function (chave) {
      var sub = caminhoDe(caminho, chave);
      if (ctx.ignorar.indexOf(sub) >= 0 || ctx.ignorar.indexOf(chave) >= 0) return;

      var b = ehObjeto(base) ? base[chave] : undefined;
      var l = ehObjeto(local) ? local[chave] : undefined;
      var s = ehObjeto(servidor) ? servidor[chave] : undefined;

      /* lista de registros com id: casa por id, nunca por posição */
      if (ctx.listas[sub]) {
        saida[chave] = mesclarLista(sub, b, l, s, ctx, ctx.listas[sub], contexto);
        return;
      }

      /* objeto simples (defesa, por exemplo): desce mais um nível */
      if (ehObjeto(b) || ehObjeto(l) || ehObjeto(s)) {
        if (ehObjeto(l) && ehObjeto(s)) {
          saida[chave] = mesclarObjeto(sub, b, l, s, ctx, contexto);
          return;
        }
      }

      saida[chave] = decidirFolha(sub, chave, b, l, s, ctx, contexto, saida);
    });

    return saida;
  }

  function decidirFolha(caminho, chave, b, l, s, ctx, contexto, destino) {
    var mudouAqui = !U.iguais(b, l);
    var mudouLa = !U.iguais(b, s);

    if (!mudouAqui) return U.copiar(s);            // só o servidor mexeu
    if (!mudouLa) {                                 // só nós mexemos
      ctx.automaticos.push({ caminho: caminho, rotulo: rotuloDe(ctx, chave), contexto: contexto, valor: l });
      return U.copiar(l);
    }
    if (U.iguais(l, s)) return U.copiar(s);        // os dois, para o mesmo valor

    /* Os dois mexeram, para valores diferentes. O padrão fica com o
       servidor — o valor já gravado — e a pessoa decide. */
    ctx.conflitos.push({
      caminho: caminho,
      campo: chave,
      rotulo: rotuloDe(ctx, chave),
      contexto: contexto,
      base: U.copiar(b),
      local: U.copiar(l),
      servidor: U.copiar(s),
      destino: destino,
    });

    return U.copiar(s);
  }

  /* Casar por id, e nunca por posição: comparar posição faria o sistema
     achar que a Acrobacia virou Atletismo porque alguém acrescentou uma
     perícia antes dela. */
  function mesclarLista(caminho, base, local, servidor, ctx, chave, contexto) {
    var B = U.indexar(base, chave);
    var L = U.indexar(local, chave);
    var S = U.indexar(servidor, chave);

    var saida = [];
    var vistos = {};

    /* A ordem do servidor manda, e o que só existe aqui vai no fim.
       Assim duas listas reordenadas nos dois lados não brigam por
       ordem — brigariam por algo que ninguém percebeu que mudou. */
    var ordem = (servidor || []).map(function (r) { return String(r[chave]); })
      .concat((local || []).map(function (r) { return String(r[chave]); }));

    ordem.forEach(function (id) {
      if (vistos[id]) return;
      vistos[id] = true;

      var b = B[id], l = L[id], s = S[id];

      /* apagado no servidor, intocado aqui → fica apagado */
      if (!s && b && l && U.iguais(b, l)) {
        ctx.automaticos.push({ caminho: caminho, rotulo: "Removido", contexto: nomeDe(b), valor: null });
        return;
      }

      /* apagado no servidor mas alterado aqui: o trabalho de alguém
         desapareceria em silêncio. Volta, e a pessoa decide depois. */
      if (!s && l) {
        ctx.automaticos.push({ caminho: caminho, rotulo: "Mantido aqui", contexto: nomeDe(l), valor: l });
        saida.push(U.copiar(l));
        return;
      }

      /* apagado aqui, intocado no servidor → some */
      if (!l && b && s && U.iguais(b, s)) return;

      /* novo de um lado só */
      if (!b && !l && s) { saida.push(U.copiar(s)); return; }
      if (!b && !s && l) {
        ctx.automaticos.push({ caminho: caminho, rotulo: "Acrescentado aqui", contexto: nomeDe(l), valor: l });
        saida.push(U.copiar(l));
        return;
      }
      if (!s && !l) return;
      if (!s) { saida.push(U.copiar(l)); return; }
      if (!l) { saida.push(U.copiar(s)); return; }

      /* existe nos dois: compara campo a campo */
      saida.push(mesclarObjeto(caminho, b, l, s, ctx, nomeDe(s) || nomeDe(l)));
    });

    return saida;
  }

  function nomeDe(registro) {
    if (!registro) return "";
    return U.texto(registro.nome || registro.titulo || registro.sigla || "");
  }

  function rotuloDe(ctx, chave) {
    if (ctx.rotulos[chave]) return ctx.rotulos[chave];
    return chave.charAt(0).toUpperCase() + chave.slice(1);
  }

  /* =================================================================
     APLICAR AS ESCOLHAS
     ================================================================= */

  function aplicarEscolhas(conflitos, escolhas) {
    (conflitos || []).forEach(function (c, i) {
      var lado = escolhas[i] === "local" ? "local" : "servidor";
      if (c.destino) c.destino[c.campo] = U.copiar(c[lado]);
    });
  }

  /* =================================================================
     A TELA DO CONFLITO
     -----------------------------------------------------------------
     Não fecha sozinha e não tem "OK". Cada campo em disputa mostra os
     dois valores lado a lado, com o nome de quem é: este aparelho ou o
     servidor. Nada do que a pessoa digitou some sem ela ver.
     ================================================================= */

  function paraGente(valor) {
    if (valor === undefined || valor === null || valor === "") return "(vazio)";
    if (typeof valor === "boolean") return valor ? "sim" : "não";
    if (Array.isArray(valor)) return valor.length + " item(ns)";
    if (typeof valor === "object") return "(estrutura)";
    return String(valor);
  }

  function abrirConflito(opcoes) {
    var o = opcoes || {};
    var conflitos = o.conflitos || [];
    var escolhas = conflitos.map(function () { return "servidor"; });
    var resolvido = false;

    var linhas = conflitos.map(function (c, i) {
      var nomeGrupo = "conflito-" + i;

      function lado(qual, valor, rotuloLado) {
        var idOpcao = nomeGrupo + "-" + qual;
        var entrada = el("input", {
          type: "radio", name: nomeGrupo, id: idOpcao, value: qual,
          checked: escolhas[i] === qual,
          onchange: function () { escolhas[i] = qual; },
        });
        return el("label.r-marca", { for: idOpcao }, [
          entrada,
          el("span", {}, [
            el("span.t-rotulo", { texto: rotuloLado }),
            el("span.t-forte", { texto: " " + paraGente(valor) }),
          ]),
        ]);
      }

      return el("div.linha-editavel", { estilo: { gridTemplateColumns: "1fr" } }, [
        el("p.t-secao", { texto: (c.contexto ? c.contexto + " · " : "") + c.rotulo }),
        el("div.pilha--curta", { class: "pilha" }, [
          lado("local", c.local, "Deste aparelho"),
          lado("servidor", c.servidor, "Do servidor"),
        ]),
      ]);
    });

    var automaticos = (o.automaticos || []).length
      ? el("p.t-mini", {
          texto: o.automaticos.length + " alteração(ões) não se cruzaram e já foram juntadas.",
        })
      : null;

    var m = global.RAMAUI.modal({
      titulo: "Alteração conflitante",
      largo: true,
      exigeDecisao: true,
      semFechar: true,
      conteudo: [
        el("p", {
          texto: o.aviso || "Este registro mudou em outro aparelho enquanto você trabalhava. " +
            "O que não se cruzou já foi juntado; escolha o que fica no que sobrou.",
        }),
        automaticos,
        el("div.pilha", {}, linhas),
      ],
      botoes: [
        {
          rotulo: "Usar tudo do servidor",
          classe: "r-botao--fantasma",
          aoClicar: function (fechar) {
            escolhas = conflitos.map(function () { return "servidor"; });
            resolvido = true; fechar();
            if (o.aoResolver) o.aoResolver(escolhas);
          },
        },
        {
          rotulo: "Usar tudo deste aparelho",
          classe: "r-botao--fantasma",
          aoClicar: function (fechar) {
            escolhas = conflitos.map(function () { return "local"; });
            resolvido = true; fechar();
            if (o.aoResolver) o.aoResolver(escolhas);
          },
        },
        {
          rotulo: "Confirmar escolhas",
          classe: "r-botao--principal",
          aoClicar: function (fechar) {
            resolvido = true; fechar();
            if (o.aoResolver) o.aoResolver(escolhas);
          },
        },
      ],
      aoFechar: function () { if (!resolvido && o.aoCancelar) o.aoCancelar(); },
    });

    return m;
  }

  /* =================================================================
     ESQUEMA DA FICHA
     -----------------------------------------------------------------
     Mora aqui porque é a descrição de como a ficha se concilia, não de
     como ela se desenha.
     ================================================================= */

  var ESQUEMA_FICHA = {
    listas: {
      "atributos": "id",
      "status": "id",
      "pericias": "id",
      "pericias.dadosExtras": "id",
      "inventario.itens": "id",
      "anotacoes.pastas": "id",
      "anotacoes.pastas.notas": "id",
      "anotacoes.soltas": "id",
      "camposCustomizados": "id",
    },
    /* Carimbos de tempo mudam em toda gravação e não são decisão de
       ninguém: perguntar sobre eles seria ruído puro. */
    ignorar: ["atualizadoEm", "schemaVersion"],
    rotulos: {
      nome: "Nome", classe: "Classe", origem: "Origem", campanhaId: "Campanha",
      valor: "Valor", dado: "Dado", sigla: "Sigla",
      atual: "Atual", maximo: "Máximo",
      bonus: "Bônus", bonusTemporario: "Bônus temporário", atributoId: "Atributo vinculado",
      dt: "DT", esquiva: "Esquiva", bloqueio: "Bloqueio", resistencia: "Resistência",
      peso: "Peso", limite: "Limite de peso", dano: "Dano", danoExtra: "Dano extra",
      critico: "Crítico", multiplicador: "Multiplicador", defesa: "Defesa",
      reducaoPeso: "Redução de peso", periciaId: "Perícia de ataque",
      titulo: "Título", conteudo: "Conteúdo", descricao: "Descrição",
    },
  };

  global.RAMASync = {
    mesclar: mesclar,
    aplicarEscolhas: aplicarEscolhas,
    abrirConflito: abrirConflito,
    paraGente: paraGente,
    ESQUEMA_FICHA: ESQUEMA_FICHA,
  };
})(window);
