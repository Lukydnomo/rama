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
       somaveis: ["inventario.itens.ordem.contagem.retiradas"],
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
      somaveis: e.somaveis || [],
      ignorar: e.ignorar || [],
      rotulos: e.rotulos || {},
      conflitos: [],
      automaticos: [],
    };

    var saida = mesclarObjeto("", base, local, servidor, estado, "");
    (e.movimentos || []).forEach(function (m) {
      repararMovimentos(m, saida, base, local, servidor, estado);
    });
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
    /* Contador de gasto (v2.20): munição carregada, retirada da
       reserva, componentes da mesa. Dois aparelhos gastando ao mesmo
       tempo gastaram os DOIS — a diferença de cada lado se soma, sem
       pergunta e sem ninguém perder um disparo. Nunca abaixo de zero. */
    if ((ctx.somaveis || []).indexOf(caminho) >= 0 && numero(b) && numero(l) && numero(s)) {
      var soma = Math.max(0, s + (l - b));
      ctx.automaticos.push({ caminho: caminho, rotulo: rotuloDe(ctx, chave) + " (somado)", contexto: contexto, valor: soma });
      return soma;
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

  function numero(v) { return typeof v === "number" && isFinite(v); }

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
       ordem — brigariam por algo que ninguém percebeu que mudou.

       A exceção (v2.19): só ESTE aparelho reordenou — arrastou um item —
       e o servidor não mexeu na ordem. Aí a ordem daqui vale, e o que
       só existe no servidor vai no fim. Sem isso, qualquer gravação de
       outra pessoa (um PV ajustado pelo mestre) desfaria em silêncio a
       reordenação de quem arrastou. */
    var idsB = idsDe(base, chave);
    var idsL = idsDe(local, chave);
    var idsS = idsDe(servidor, chave);
    var soAqui = !mesmaOrdem(idsB, idsL) && mesmaOrdem(idsB, idsS);
    if (soAqui) {
      ctx.automaticos.push({ caminho: caminho, rotulo: "Ordem deste aparelho", contexto: contexto, valor: null });
    }
    var ordem = soAqui ? idsL.concat(idsS) : idsS.concat(idsL);

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

  function idsDe(lista, chave) {
    return (Array.isArray(lista) ? lista : [])
      .filter(function (r) { return r && r[chave] !== undefined && r[chave] !== null; })
      .map(function (r) { return String(r[chave]); });
  }

  /* As duas listas põem os ids que têm em comum na mesma ordem? Entrar
     ou sair um item não é reordenar. */
  function mesmaOrdem(a, b) {
    var emB = {};
    b.forEach(function (id) { emB[id] = true; });
    var emA = {};
    a.forEach(function (id) { emA[id] = true; });
    var x = a.filter(function (id) { return emB[id]; });
    var y = b.filter(function (id) { return emA[id]; });
    if (x.length !== y.length) return false;
    for (var i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
    return true;
  }

  /* =================================================================
     ITEM QUE MUDOU DE CONTÊINER
     -----------------------------------------------------------------
     Uma nota arrastada de "sem pasta" para uma pasta, aqui, enquanto
     outra pessoa editava o texto dela no servidor: casando lista a
     lista, ela ficaria nas DUAS — a versão do servidor onde estava e a
     daqui onde entrou. É o mesmo id em dois lugares, e a próxima
     edição iria para um deles só.

     movimento = { conteineres: [ "anotacoes.soltas", "anotacoes.pastas.notas" ] }
     Depois da mescla comum, cada id que aparecer em mais de um lugar
     fica num só: onde ESTE aparelho o pôs, se só ele mudou o lugar;
     onde o servidor o pôs, nos outros casos. O conteúdo é a mescla das
     três versões, campo a campo, como sempre.
     ================================================================= */

  function lugaresDe(raiz, movimento) {
    var mapa = {};
    if (!ehObjeto(raiz)) return mapa;
    movimento.conteineres.forEach(function (caminho) {
      pegarListas(raiz, caminho).forEach(function (par) {
        par.lista.forEach(function (item, i) {
          if (!item || item.id === undefined) return;
          var id = String(item.id);
          if (!mapa[id]) mapa[id] = [];
          mapa[id].push({ conteiner: par.chave, lista: par.lista, indice: i, item: item });
        });
      });
    });
    return mapa;
  }

  /* As listas de um caminho, descendo por listas de objetos com id:
     "anotacoes.pastas.notas" são as notas de cada pasta, cada uma com a
     chave "anotacoes.pastas.notas#<idDaPasta>". */
  function pegarListas(raiz, caminho) {
    var partes = caminho.split(".");
    var atuais = [{ valor: raiz, chave: "" }];
    partes.forEach(function (parte) {
      var proximos = [];
      atuais.forEach(function (a) {
        if (Array.isArray(a.valor)) {
          a.valor.forEach(function (x) {
            if (ehObjeto(x) && x[parte] !== undefined) {
              proximos.push({ valor: x[parte], chave: a.chave + "#" + String(x.id) + "." + parte });
            }
          });
        } else if (ehObjeto(a.valor) && a.valor[parte] !== undefined) {
          proximos.push({ valor: a.valor[parte], chave: (a.chave ? a.chave + "." : "") + parte });
        }
      });
      atuais = proximos;
    });
    return atuais.filter(function (a) { return Array.isArray(a.valor); }).map(function (a) {
      return { chave: a.chave, lista: a.valor };
    });
  }

  function repararMovimentos(movimento, saida, base, local, servidor, ctx) {
    var S = lugaresDe(saida, movimento);
    var B = lugaresDe(base, movimento);
    var L = lugaresDe(local, movimento);
    var V = lugaresDe(servidor, movimento);

    Object.keys(S).forEach(function (id) {
      var ocorrencias = S[id];
      if (ocorrencias.length < 2) return;
      var lugarB = B[id] && B[id][0] ? B[id][0].conteiner : null;
      var lugarL = L[id] && L[id][0] ? L[id][0].conteiner : null;
      var lugarV = V[id] && V[id][0] ? V[id][0].conteiner : null;

      var destino = (lugarL && lugarL !== lugarB && lugarV === lugarB) ? lugarL : (lugarV || lugarL);
      var fica = ocorrencias.filter(function (o) { return o.conteiner === destino; })[0] || ocorrencias[0];

      var conteudo = mesclarObjeto("", B[id] ? B[id][0].item : undefined,
        L[id] ? L[id][0].item : undefined, V[id] ? V[id][0].item : undefined, ctx, nomeDe(fica.item));
      fica.lista[fica.lista.indexOf(fica.item)] = conteudo;

      ocorrencias.forEach(function (o) {
        if (o === fica) return;
        var i = o.lista.indexOf(o.item);
        if (i >= 0) o.lista.splice(i, 1);
      });
      ctx.automaticos.push({ caminho: fica.conteiner, rotulo: "Movido", contexto: nomeDe(conteudo), valor: null });
    });
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
      /* Sem estas duas linhas, dois aparelhos mexendo em rituais
         diferentes brigariam pela LISTA inteira em vez de casarem
         ritual a ritual — e o mesmo dentro de um ritual, versão a
         versão. É o id que casa, nunca a posição nem o nome. */
      "rituais.itens": "id",
      "rituais.itens.versoes": "id",
      /* As decisões de progressão de Ordem casam registro a registro:
         dois aparelhos resolvendo etapas diferentes não brigam pela
         lista inteira. */
      "ordem.escolhas": "id",
      /* Estudo em campo e concessão da mesa (v2.18): cada registro casa
         pelo id, como as escolhas. */
      "ordem.registrosDeRitual": "id",
      "ordem.ajustes": "id",
      "ordem.progressao": "id",
      "ordem.personalizacoes": "id",
      "ordem.excluidas": "id",
      /* Inícios de turno das condições (v2.19): cada evento casa pelo id.
         O mesmo turno contado pelo combate no servidor e aqui é UM
         evento — e dois eventos diferentes somam, sem briga. */
      "ordem.condicoes.morrendo.eventos": "id",
      "ordem.condicoes.enlouquecendo.eventos": "id",
      /* Condições e efeitos aplicados (v2.20): cada aplicação é uma
         instância com id, e os turnos que ela contou também. O mestre
         aplicando pelo combate e o jogador encerrando outra, ao mesmo
         tempo, não brigam. */
      "ordem.condicoes.efeitos": "id",
      "ordem.condicoes.efeitos.eventos": "id",
      /* O registro do que foi gasto: é por ele que o mesmo uso não gasta
         duas vezes, então as duas abas precisam ver os dois lados. */
      "ordem.consumos": "id",
      "ordem.componentes.extras": "id",
    },
    /* Contadores de gasto: a diferença de cada lado se soma. */
    somaveis: [
      "inventario.itens.ordem.contagem.carregada",
      "inventario.itens.ordem.contagem.retiradas",
      "ordem.componentes.elementos.sangue.quantidade",
      "ordem.componentes.elementos.morte.quantidade",
      "ordem.componentes.elementos.conhecimento.quantidade",
      "ordem.componentes.elementos.energia.quantidade",
      "ordem.componentes.extras.quantidade",
    ],
    /* Uma nota pode mudar de pasta: ver repararMovimentos. */
    movimentos: [
      { conteineres: ["anotacoes.soltas", "anotacoes.pastas.notas"] },
    ],
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
      circulo: "Círculo", alcance: "Alcance", duracao: "Duração",
      alvo: "Alvo", efeito: "Efeito", versoes: "Versões",
      quantidade: "Quantidade", espacos: "Espaços", capacidade: "Capacidade",
      escolhas: "Escolhas de progressão", afinidade: "Afinidade", elemento: "Elemento",
      registrosDeRitual: "Rituais aprendidos fora da progressão", ritualId: "Ritual", nota: "Nota",
      confirmado: "Estudo confirmado",
      nomeOutro: "Elemento Homebrew", adiada: "Afinidade adiada", aplicar: "Aplicar regras de patente",
      limites: "Limites por categoria", opcoes: "Opções da escolha", etapa: "Etapa",
      personalizacoes: "Habilidades personalizadas", excluidas: "Habilidades oficiais excluídas",
      organizacao: "Ordem das listas", modo: "Ordem de exibição", regras: "Ordem das habilidades das regras",
      bonusExtra: "Bônus extra", bloqueio: "Bloqueio", esquiva: "Esquiva",
      periciasAjustes: "Ajustes das perícias", extra: "Bônus extra", atributo: "Atributo",
      adicionadoEm: "Adicionado em", aquisicao: "Aquisição", efeitos: "Efeitos automáticos",
      etiqueta: "Etiqueta", texto: "Texto", cor: "Cor", negrito: "Negrito",
      condicoes: "Condições", morrendo: "Morrendo", enlouquecendo: "Enlouquecendo", inconsciente: "Inconsciente",
      perturbado: "Perturbado", ativa: "Condição ativa",
      eventos: "Turnos contados", descartados: "Turnos descartados", cena: "Cena",
      integrarCombate: "Contar pelos turnos do combate",
      encerrado: "Encerramento", imunidades: "Imunidades", modificadores: "Modificadores", restricoes: "Restrições",
      contagem: "Contagem de munição", carregada: "Munição carregada", retiradas: "Munição gasta da reserva",
      porPacote: "Ataques por pacote", municao: "Munição associada", consumos: "Registro de consumo",
      componentes: "Componentes ritualísticos", tem: "Tem componentes", porUso: "Gasto por uso", unidade: "Unidade",
      consequencia: "Consequência combinada", pd: "Pontos de determinação", criterios: "Critérios dos rituais",
      lugares: "Pastas das habilidades das regras", pericias: "Perícias",
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
