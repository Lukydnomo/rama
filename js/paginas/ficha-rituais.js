/* =====================================================================
   R.A.M.A. — ficha · rituais
   ---------------------------------------------------------------------
   Rituais, magias, técnicas, poderes — o NOME da seção é da mesa, e a
   estrutura é a mesma.

   Duas coisas que esta seção faz e que valem a explicação:

   1. O nome da seção e os rótulos dos cinco campos são configuráveis,
      mas as CHAVES internas não mudam nunca. Trocar "Círculo" por
      "Nível" reescreve o que a tela mostra, não o que está gravado —
      então nenhum ritual precisa ser migrado, e nada se perde.

   2. Os rótulos pertencem à SEÇÃO. Um ritual não carrega os próprios
      nomes de campo: se carregasse, dois rituais da mesma ficha
      poderiam chamar a mesma coisa de dois jeitos.

   3. Um ritual pode ser conjurado de mais de um jeito, e cada jeito
      tem o próprio dano. As VERSÕES são uma coleção com id estável, e
      não campos fixos chamados danoDiscente e danoVerdadeiro: o nome
      que aparece é conteúdo, e renomear uma versão não move o dano
      dela para lugar nenhum. Ver o bloco de versões em js/ficha.js.

   O ritual era informação pura até a v2.2: abria, fechava e não rolava
   nada. Desde então ele rola dano — e, com o catálogo de rituais
   (v2.14), qualquer rolagem que a versão tenha, cada uma com o próprio
   tipo e rótulo: dano, cura ou outra. Nada mais: custo de esforço,
   teste de resistência e redução de dano continuam sendo decisão da
   mesa, e o que a ficha faz é MOSTRAR o custo, não gastá-lo.

   Numa ficha de Ordem Paranormal, o botão "Da biblioteca" abre o
   catálogo oficial dos dois livros e a Homebrew da conta
   (js/paginas/ficha-rituais-biblioteca.js). O ritual trazido de lá é uma
   cópia com id próprio; editar a cópia não muda o catálogo.

   ---------------------------------------------------------------------
   DE ONDE CADA RITUAL VEIO
   ---------------------------------------------------------------------

   Numa ficha de Ordem, cada ritual mostra a concessão que ele ocupa: os
   três iniciais, o ritual daquele NEX, Saber Ampliado, o grimório de
   Graduado, Aprender Ritual — ou nenhuma, quando é registro da mesa. A
   informação é DERIVADA do motor de progressão, não gravada no ritual:
   a ficha continua com uma fonte só para "quem concedeu o quê".

   O grimório aparece SEPARADO, e não como uma etiqueta. Conjurar de lá
   tem condição própria (empunhar o grimório e gastar uma ação completa,
   OPRPG p.35), e um ritual do grimório não é "mais um conhecido".
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var F = global.RAMAFicha;
  var D = global.RAMADados;
  var V = global.RAMAValidacao;
  var el = U.el;

  function E() { return global.RAMAOrdemProgressao; }
  function RT() { return global.RAMAOrdemRituais; }
  function OP() { return global.RAMAOrdemOpcionais; }

  function rotulo(ctx) {
    return ctx.ficha.rituais.rotuloSecao || "Rituais";
  }

  /* O aprendizado de rituais desta ficha, quando ela é de Ordem e o
     motor está carregado. Fora disso a aba continua exatamente como
     era — uma ficha universal não ganha regra de Ordem. */
  /* O estado de progressão desta ficha, quando ela é de Ordem e o motor
     está carregado. Fora disso a aba continua exatamente como era — uma
     ficha universal não ganha regra de Ordem. */
  function estadoDe(ctx) {
    if (!F.ehDeOrdem(ctx.ficha) || !E() || !global.RAMAOrdemPoderes) return null;
    return E().estado(ctx.ficha.ordem, { inventario: ctx.ficha.inventario, rituais: rituaisDe(ctx) }) || null;
  }

  function aprendizadoDe(ctx) {
    var est = estadoDe(ctx);
    return (est && est.rituais) ? est.rituais : null;
  }

  function rituaisDe(ctx) {
    return (ctx.ficha.rituais && ctx.ficha.rituais.itens) || [];
  }

  function aba(ctx) {
    return el("div.pilha--larga", { class: "pilha" }, [
      UI.painel(rotulo(ctx), corpo(ctx), {
        acoes: ctx.emEdicao() ? [
          el("button.r-botao.r-botao--mini", {
            type: "button", texto: "+ Novo", onclick: function () { editar(ctx, null); },
          }),
          global.RAMABibliotecaDeRituais ? el("button.r-botao.r-botao--mini", {
            type: "button", texto: "Da biblioteca",
            title: F.ehDeOrdem(ctx.ficha) ? "Adiciona como registro, para consulta. Aprender vem das pendências da Progressão." : "",
            onclick: function () { global.RAMABibliotecaDeRituais.abrir(ctx); },
          }) : null,
          el("button.r-botao.r-botao--mini", {
            type: "button", texto: "Rótulos", onclick: function () { configurar(ctx); },
          }),
        ] : null,
      }),
    ]);
  }

  function corpo(ctx) {
    var rituais = ctx.ficha.rituais;
    var est = estadoDe(ctx);
    var apr = est ? est.rituais : null;

    if (!rituais.itens.length) {
      return el("div.pilha--curta", { class: "pilha" }, [
        painelDeRetencao(ctx),
        painelDoAprendizado(ctx, est),
        UI.vazio({
          titulo: "Nenhum registro em " + rotulo(ctx).toLowerCase(),
          texto: ctx.emEdicao()
            ? "Acrescente o primeiro. Se a sua mesa chama isto de outra coisa, o nome da seção e o de cada campo podem ser trocados em Rótulos."
            : "Entre no modo edição para acrescentar.",
          acao: ctx.emEdicao()
            ? { rotulo: "+ Novo", aoClicar: function () { editar(ctx, null); } }
            : null,
          acaoSecundaria: ctx.emEdicao() && global.RAMABibliotecaDeRituais
            ? { rotulo: "Da biblioteca", aoClicar: function () { global.RAMABibliotecaDeRituais.abrir(ctx); } }
            : null,
        }),
      ]);
    }

    /* Na ficha de Ordem, a lista segue o modo escolhido na barra
       (personalizada, de adição, A–Z, Z–A). Na universal, a guardada. */
    var org = global.RAMAOrdemOrganizacao;
    var modo = org ? org.modo(ctx, "rituais") : "personalizada";
    var lista = U.ordenarLista(rituais.itens, modo);
    var criterios = org && O() ? org.criterios(ctx) : [];
    var arrastar = org ? org.podeArrastar(ctx, "rituais") : ctx.emEdicao();

    var partes = [org ? org.barra(ctx, "rituais") : null, painelDeRetencao(ctx), painelDoAprendizado(ctx, est)];
    var raiz;
    if (!apr) {
      raiz = el("div.pilha--curta", { class: "pilha" }, partes.concat(listaAgrupada(ctx, "rituais", lista, criterios, modo, null, arrastar)));
      return ligarArraste(ctx, raiz, arrastar);
    }

    /* Três lugares, e não três etiquetas: o que o personagem CONHECE, o
       que está no GRIMÓRIO (outra condição de uso, OPRPG p.35) e o que é
       só REGISTRO na ficha, para consulta. Um ritual conta como
       conhecido quando alguma aquisição o reivindica — nunca pelo nome,
       nunca por estar na ficha. Agrupar por círculo e elemento acontece
       DENTRO de cada lugar, e arrastar não troca um ritual de lugar. */
    var conhecidos = [];
    var grimorio = [];
    var registros = [];
    lista.forEach(function (r) {
      var vindo = apr.porRitual[r.id];
      if (!vindo) registros.push(r);
      else if (vindo.destino === "grimorio") grimorio.push(r);
      else conhecidos.push(r);
    });
    var separar = grimorio.length || registros.length;

    if (conhecidos.length && separar) partes.push(tituloDeSecao("Conhecidos", conhecidos.length, "conhecidos"));
    partes = partes.concat(listaAgrupada(ctx, "conhecidos", conhecidos, criterios, modo, apr, arrastar));

    if (grimorio.length) {
      partes.push(tituloDeSecao("Grimório", grimorio.length, "grimorio"));
      partes.push(el("p.rituais-secao__nota", { texto: RT() ? RT().condicoesDoDestino("grimorio").join(" ") : "" }));
      partes = partes.concat(listaAgrupada(ctx, "grimorio", grimorio, criterios, modo, apr, arrastar));
    }

    if (registros.length) {
      partes.push(tituloDeSecao("Registros, sem aquisição", registros.length, "registros"));
      partes.push(el("p.rituais-secao__nota", {
        texto: "Estão na ficha para consulta e não contam como conhecidos. No modo edição, o menu de cada um oferece " +
               "prendê-lo a uma aquisição aberta, sem criar cópia" +
               (apr.emCampo && apr.ocultista ? ", ou registrar o estudo em campo" : "") +
               ", ou registrá-lo como concessão da mesa.",
      }));
      if (OP() && OP().ligada(ctx.ficha.ordem, "rituaisDesconhecidos")) {
        partes.push(el("p.t-mini", {
          texto: "Conjurando Rituais Desconhecidos está ligada: quem é treinado em Ocultismo e tem informação registrada " +
                 "pode tentar um destes seguindo a conjuração complexa, com DT +5 e desastre paranormal na falha " +
                 "(Sobrevivendo ao Horror, p. 117). Tentar não é aprender.",
        }));
      }
      partes = partes.concat(listaAgrupada(ctx, "registros", registros, criterios, modo, apr, arrastar));
    }

    raiz = el("div.pilha--curta", { class: "pilha" }, partes);
    return ligarArraste(ctx, raiz, arrastar);
  }

  /* O título de cada lugar (v2.32): nome, contagem e uma marca de
     borda própria — a diferença não depende só da cor. */
  function tituloDeSecao(nome, n, tipo) {
    return el("h3.rituais-secao.rituais-secao--" + tipo, {}, [
      el("span.rituais-secao__nome", { texto: nome }),
      el("span.rituais-secao__conta", { texto: n + (n === 1 ? " ritual" : " rituais") }),
    ]);
  }

  function O() { return global.RAMAOrganizar || null; }
  function A() { return global.RAMAArrastar || null; }

  /* Uma seção (Conhecidos, Grimório, Registros — ou a lista inteira da
     ficha universal), agrupada pelos critérios. Cada grupo é uma lista
     de arraste separada: o ritual só se move dentro do grupo em que o
     círculo e o elemento dele o puseram. */
  function listaAgrupada(ctx, secao, itens, criterios, modo, apr, arrastar) {
    if (!itens.length) return [];
    var grupos = O() ? O().agruparRituais(itens, criterios) : [{ chave: "", rotulo: "", itens: itens, subgrupos: null }];
    var saida = [];
    grupos.forEach(function (g) {
      if (g.rotulo) saida.push(el("h4.rituais-grupo", { texto: g.rotulo + " (" + g.itens.length + ")" }));
      if (g.subgrupos) {
        g.subgrupos.forEach(function (s) {
          saida.push(el("h5.rituais-subgrupo", { texto: s.rotulo + " (" + s.itens.length + ")" }));
          saida.push(listaDeArraste(ctx, secao + "|" + s.chave, s.itens, modo, apr, arrastar));
        });
      } else {
        saida.push(listaDeArraste(ctx, secao + "|" + g.chave, g.itens, modo, apr, arrastar));
      }
    });
    return saida;
  }

  function listaDeArraste(ctx, chave, itens, modo, apr, arrastar) {
    var ids = itens.map(function (r) { return r.id; });
    return el("div.pilha--curta.rituais-lista", { class: "pilha", dataset: { arrastarLista: chave } }, itens.map(function (r) {
      var c = cartao(ctx, r, modo, apr, { visiveis: ids, arrastar: arrastar });
      c.dataset.arrastarItem = r.id;
      c.dataset.arrastarRotulo = r.nome || "Ritual";
      return c;
    }));
  }

  /* O lugar e o grupo de um ritual vêm do que ele é — aquisição, círculo,
     elemento. Arrastar muda só a ordem entre os vizinhos do mesmo grupo. */
  function ligarArraste(ctx, raiz, arrastar) {
    if (!arrastar || !A() || !O()) return raiz;
    function visiveisDe(chave) {
      var lista = raiz.querySelector('[data-arrastar-lista="' + (global.CSS && CSS.escape ? CSS.escape(chave) : chave) + '"]');
      return lista ? Array.prototype.map.call(lista.children, function (x) { return x.dataset.arrastarItem; }).filter(Boolean) : [];
    }
    function secaoDe(chave) { return String(chave).split("|")[0]; }
    return A().ligar(raiz, {
      podeSoltar: function (item, destino) {
        if (destino.lista === item.lista) return { ok: true };
        if (secaoDe(destino.lista) !== secaoDe(item.lista)) {
          return { ok: false, motivo: "Conhecidos, Grimório e Registros não se trocam arrastando: isso muda o aprendizado, e tem regra própria no menu do ritual." };
        }
        return { ok: false, motivo: "O grupo vem do círculo e do elemento do ritual. Arrastar muda só a ordem dentro do grupo." };
      },
      aoSoltar: function (item, destino) {
        if (!O().reposicionar(ctx.ficha.rituais.itens, item.id, destino.indice, visiveisDe(destino.lista))) return;
        ctx.alterou();
        ctx.redesenhar();
      },
      aoTeclado: function (item, direcao) {
        if (!O().passo(ctx.ficha.rituais.itens, item.id, direcao, visiveisDe(item.lista))) {
          return { ok: false, motivo: direcao < 0 ? "Já é o primeiro do grupo." : "Já é o último do grupo." };
        }
        ctx.alterou();
        ctx.redesenhar();
        return { ok: true };
      },
    });
  }

  /* =================================================================
     O APRENDIZADO, NO TOPO DA ABA
     -----------------------------------------------------------------
     Só o essencial: quantas aquisições faltam, o limite por Intelecto,
     os avisos das regras ligadas e as portas explícitas. A lista inteira
     mora na aba Progressão — repeti-la aqui faria a aba Rituais virar
     outra Progressão.
     ================================================================= */

  function painelDoAprendizado(ctx, est) {
    var apr = est ? est.rituais : null;
    if (!apr) return null;
    var tem = apr.concessoes.length || apr.aprendizados.length || apr.registros.length || apr.avisos.length || (apr.emCampo && apr.ocultista);
    if (!tem) return null;

    var abertas = apr.concessoes.filter(function (c) { return !c.completa; });
    var dt = RT() ? RT().dtDeResistencia(ctx.ficha.ordem) : null;
    var foraDeRitual = (est.fora || []).filter(function (f) { return f.registro && f.registro.tipo === "rituais"; });
    var registrosSemEfeito = apr.registros.filter(function (x) { return !x.valido; });

    var linhas = [];
    if (apr.concessoes.length) {
      linhas.push(el("p.t-mini", {
        texto: abertas.length
          ? "Faltam " + abertas.length + " aquisição(ões) de ritual: " +
            abertas.slice(0, 3).map(function (c) { return c.rotulo + " (" + c.rotuloEtapa + ", faltam " + c.restantes + ")"; }).join("; ") +
            (abertas.length > 3 ? "…" : "") + "."
          : "Todas as aquisições de ritual da progressão estão resolvidas.",
      }));
    }
    linhas.push(el("p.t-mini", {
      texto: "Limite de rituais conhecidos (Intelecto): " + apr.limite.usados + " de " + apr.limite.total +
             " — só Aprender Ritual conta nele." +
             (dt ? " DT para resistir aos seus rituais: " + (dt.total + dtDaAntena(ctx)) + (dt.extra ? " (com +" + dt.extra + " de trilha)" : "") +
               (dtDaAntena(ctx) ? " (com +3 d’A Antena)" : "") + "." : ""),
    }));
    if (apr.limite.excedido) {
      linhas.push(el("p.t-mini.t-aviso", {
        texto: "Aprender Ritual passou do limite: " + apr.limite.usados + " para um Intelecto " + apr.limite.total +
               ". Nada foi apagado — reveja as escolhas na Progressão ou combine a exceção com a mesa.",
      }));
    }
    apr.avisos.forEach(function (a) { linhas.push(el("p.t-mini.t-aviso", { texto: a })); });
    if (foraDeRitual.length) {
      linhas.push(el("p.t-mini", {
        texto: foraDeRitual.length + " escolha(s) de ritual guardada(s) fora da progressão atual — a regra, a trilha, a classe " +
               "ou o NEX mudou. Os rituais continuam aqui; a escolha volta a valer sozinha se a aquisição voltar. Ver Progressão.",
      }));
    }
    registrosSemEfeito.forEach(function (x) {
      linhas.push(el("p.t-mini.t-aviso", {
        texto: (x.registro.tipo === "campo" ? "Estudo em campo" : (x.registro.tipo === "maldicao" ? "Compreensão de Maldições" : "Concessão da mesa")) + " de " + (x.registro.nome || "um ritual") +
               " guardado sem efeito: " + x.motivo,
      }));
    });
    if (apr.semAquisicao.length && abertas.length) {
      linhas.push(el("p.t-mini", {
        texto: apr.semAquisicao.length + " ritual(is) na ficha sem aquisição. Se algum deles veio de uma das aquisições abertas, " +
               "associe explicitamente — o R.A.M.A. não adivinha pelo nome.",
      }));
    }

    var botoes = [];
    if (abertas.length) {
      botoes.push(el("button.r-botao.r-botao--mini.r-botao--principal", {
        type: "button", texto: "Escolher rituais",
        onclick: function () {
          if (!global.RAMAOrdemEscolhas) return;
          global.RAMAOrdemEscolhas.abrirRituais({
            ctx: ctx,
            aoMudarRituais: function () { ctx.redesenhar(); },
          }, { id: abertas[0].id });
        },
      }));
    }
    if (ctx.emEdicao() && apr.semAquisicao.length && abertas.length) {
      botoes.push(el("button.r-botao.r-botao--mini", {
        type: "button", texto: "Associar rituais da ficha",
        onclick: function () { associarExistentes(ctx); },
      }));
    }
    if (ctx.emEdicao() && apr.emCampo && apr.ocultista && global.RAMABibliotecaDeRituais) {
      botoes.push(el("button.r-botao.r-botao--mini", {
        type: "button", texto: "Registrar estudo em campo",
        onclick: function () { global.RAMABibliotecaDeRituais.abrir(ctx, { aquisicao: { tipo: "campo" } }); },
      }));
    }
    if (ctx.emEdicao() && apr.maldicao && global.RAMABibliotecaDeRituais) {
      botoes.push(el("button.r-botao.r-botao--mini", {
        type: "button", texto: "Compreensão de Maldições",
        title: "Registrar o ritual aprendido de um item amaldiçoado (Maledictólogo, Arquivos Secretos 1, p. 45).",
        onclick: function () { global.RAMABibliotecaDeRituais.abrir(ctx, { aquisicao: { tipo: "maldicao" } }); },
      }));
    }

    return el("div.rituais-aprendizado", {}, linhas.concat(botoes.length ? [el("div.faixa", {}, botoes)] : []));
  }

  function cartao(ctx, ritual, modo, apr, lugar) {
    var l = lugar || {};
    var vindo = apr ? apr.porRitual[ritual.id] : null;
    var substituido = apr ? apr.substituidos[ritual.id] : null;

    var acoesDeAprendizado = [];
    if (apr && !vindo) {
      acoesDeAprendizado.push({ rotulo: "Prender a uma aquisição", aoClicar: function () { prender(ctx, ritual); } });
      acoesDeAprendizado.push({ rotulo: "Registrar como concessão da mesa", aoClicar: function () { registrarMesa(ctx, ritual); } });
    }
    if (apr && vindo && !vindo.legado && vindo.regra && vindo.regra.tipo === "concessao" && !vindo.substitui) {
      acoesDeAprendizado.push({ rotulo: "Soltar da concessão", aoClicar: function () { soltar(ctx, ritual, vindo); } });
    }
    if (apr && vindo && vindo.registroDeRitual) {
      acoesDeAprendizado.push({
        rotulo: vindo.origem === "campo" || vindo.origem === "maldicao" ? "Desfazer o registro do estudo" : "Desfazer a concessão da mesa",
        aoClicar: function () { desfazerRegistro(ctx, ritual, vindo); },
      });
    }

    var acoes = ctx.emEdicao() ? [
      UI.menu([
        { rotulo: "Editar", aoClicar: function () { editar(ctx, ritual); } },
        { rotulo: "Duplicar", aoClicar: function () { duplicar(ctx, ritual); } },
        { rotulo: "Enviar à biblioteca", aoClicar: function () { enviarParaHomebrew(ctx, ritual); } },
      ].concat(acoesDeAprendizado)
       .concat(modo && modo !== "personalizada" ? [] : [
        /* Subir e Descer mexem na ordem guardada: com a tela ordenada
           por nome ou por adição, não mudariam nada visível. Entre os
           VIZINHOS DO GRUPO, como o arraste. */
        { rotulo: "Subir", aoClicar: function () { reordenar(ctx, ritual, -1, l.visiveis); } },
        { rotulo: "Descer", aoClicar: function () { reordenar(ctx, ritual, 1, l.visiveis); } },
      ], [
        "separador",
        { rotulo: "Remover", perigo: true, aoClicar: function () { remover(ctx, ritual); } },
      ]), { rotulo: "Opções de " + ritual.nome, icone: "tresPontos" }),
    ] : null;

    var avisos = [];
    var retido = retencaoDe(ctx, ritual);
    if (retido) {
      avisos.push(el("p.ritual-aviso", {
        texto: "Retido: " + retido.pe + " PE presos no máximo" + (retido.versao ? " (" + retido.versao + ")" : "") + " — ver Rituais retidos, no alto da aba.",
      }));
    }

    /* A faixa de rolagens e o "Usar ritual" continuam à vista com o
       ritual fechado — numa sessão essa é a ação mais repetida, e ela
       não pode custar a abertura do cartão. Quem cuida disso é a `faixa`
       do recolhível (ver o comentário de lá). */
    return UI.recolhivel({
      titulo: ritual.nome,
      subtitulo: marcasDoRitual(ctx, ritual),
      classe: "ritual-cartao",
      conteudo: [el("div.ritual-corpo", {}, avisos.concat(apresentacao(ritual, {
        rotulos: ctx.ficha.rituais.rotulos,
        dt: dtDoRitual(ctx, ritual),
        aprendizado: apr ? linhasDeAprendizado(ctx, vindo, substituido) : null,
      })))],
      acoes: acoes,
      alca: l.arrastar && A() ? A().alca({ id: ritual.id, rotulo: ritual.nome }) : null,
      faixa: faixaDeDanos(ctx, ritual),
    });
  }

  /* =================================================================
     A APRESENTAÇÃO DE UM RITUAL (v2.32)
     -----------------------------------------------------------------
     Regiões separadas, nesta ordem: dados de conjuração (grade), efeito
     (texto de leitura), formas avançadas (um bloco por versão) e o
     complemento (aprendizado, regras gerais, notas e fonte, recolhível
     quando é longo). Tudo sai dos campos do próprio ritual — nada é
     consultado no catálogo, e nada que a ficha não tem é inventado.

     Reaproveitada pela consulta da biblioteca e pela Homebrew
     (RAMASecaoRituais.apresentacao).
     ================================================================= */

  var CAMPOS_DE_CONJURACAO = ["execucao", "alcance", "alvo", "area", "efeito", "duracao", "resistencia"];

  /* Círculo e elemento(s) como marcas compactas abaixo do nome. Com
     vários elementos (AS1 p. 49), uma marca por elemento. */
  function marcasDoRitual(ctx, ritual) {
    var rotulos = (ctx && ctx.ficha && ctx.ficha.rituais.rotulos) || F.ROTULOS_RITUAL_PADRAO;
    var marcas = [];
    var circulo = U.texto(ritual.circulo).trim();
    if (circulo) marcas.push(el("span.r-etiqueta.ritual-marca", { texto: /[a-zà-ú]/i.test(circulo) ? circulo : rotulos.circulo + " " + circulo }));
    elementosDoRitual(ritual).forEach(function (x) {
      marcas.push(el("span.r-etiqueta.ritual-marca" + (x.chave ? ".bib-elemento.bib-elemento--" + x.chave : ""), { texto: x.nome }));
    });
    return marcas.length ? el("span.ritual-marcas", {}, marcas) : null;
  }

  function elementosDoRitual(ritual) {
    var lista = RT() ? RT().ELEMENTOS : [];
    var o = ritual.ordem || {};
    if (o.todosOsElementos && Array.isArray(o.elementos) && o.elementos.length) {
      return o.elementos.map(function (k) { var e = lista.filter(function (x) { return x.chave === k; })[0]; return { chave: k, nome: e ? e.nome : k }; });
    }
    var texto = U.texto(ritual.elemento).trim();
    if (!texto) return [];
    /* A chave só quando o texto É o nome do elemento: o que a pessoa
       escreveu não é adivinhado. */
    var igual = lista.filter(function (x) { return U.chaveDeBusca(x.nome) === U.chaveDeBusca(texto); })[0];
    return [{ chave: igual ? igual.chave : "", nome: texto }];
  }

  function apresentacao(ritual, opcoes) {
    var o = opcoes || {};
    var rotulos = o.rotulos || F.ROTULOS_RITUAL_PADRAO;
    var partes = [];

    /* Dados de conjuração: só o que está preenchido, com o rótulo da
       ficha (as universais podem ter renomeado). */
    var dados = [];
    CAMPOS_DE_CONJURACAO.forEach(function (campo) {
      var valor = U.texto(ritual[campo]).trim();
      if (valor) dados.push([rotulos[campo] || F.ROTULOS_RITUAL_PADRAO[campo], valor]);
    });
    var base = RT() ? RT().custoDaVersao(ritual, null) : null;
    if (base) dados.push(["Custo", base.base + " PE"]);
    if (o.dt) dados.push(["DT", o.dt]);
    if (dados.length) {
      partes.push(el("dl.ritual-conjuracao", { "aria-label": "Conjuração" }, dados.map(function (d) {
        return el("div.ritual-conjuracao__campo", {}, [el("dt", { texto: d[0] }), el("dd", { texto: d[1] })]);
      })));
    }

    /* O efeito, como texto de leitura. */
    var descricao = U.texto(ritual.descricao).trim();
    if (descricao) {
      var blocos = blocosDoTexto(descricao, linhasGeradasDasVersoes(ritual));
      if (blocos.length) partes.push(el("div.ritual-texto.ritual-descricao", {}, blocos));
    }

    /* As formas avançadas, uma por bloco — só as que têm o que mostrar. */
    var formas = formasAvancadas(ritual);
    if (formas.length) partes.push(el("div.ritual-formas", { role: "list", "aria-label": "Formas avançadas" }, formas));

    if (!partes.length) partes.push(el("p.t-mini", { texto: "Sem informações preenchidas." }));

    /* Complemento: aprendizado (sempre à vista) e regras, notas e fonte
       (recolhível quando é longo). */
    if (o.aprendizado && o.aprendizado.length) {
      partes.push(el("dl.ritual-aprendizado", {}, o.aprendizado));
    }
    var complemento = U.texto(ritual.complemento).trim();
    if (complemento) {
      partes.push(el("details.ritual-complemento", { open: complemento.length <= 280 }, [
        el("summary.ritual-complemento__topo", { texto: "Regras, notas e fonte" }),
        el("div.ritual-texto.ritual-texto--mini", {}, blocosDoTexto(complemento, null)),
      ]));
    }
    return partes;
  }

  /* Parágrafos (linha em branco), quebras de linha e listas ("• " ou
     "- " no começo de TODAS as linhas do bloco) — o texto inteiro, sem
     cortar nada. Só some um bloco que é, linha por linha, exatamente o
     que a própria ficha geraria para as formas avançadas deste ritual
     (as cópias até a v2.31): isso já aparece nos blocos das formas. */
  function blocosDoTexto(texto, geradas) {
    return String(texto).replace(/\r\n?/g, "\n").split(/\n\s*\n/).map(function (bloco) {
      var linhas = bloco.split("\n").map(function (x) { return x.replace(/\s+$/, ""); }).filter(function (x) { return x.trim(); });
      if (!linhas.length) return null;
      if (geradas && linhas.every(function (x) { return geradas[x.trim()]; })) return null;
      var lista = linhas.every(function (x) { return /^\s*[•\-]\s+/.test(x); });
      if (lista) return el("ul", {}, linhas.map(function (x) { return el("li", { texto: x.replace(/^\s*[•\-]\s+/, "") }); }));
      var p = el("p");
      linhas.forEach(function (x, i) {
        if (i) p.appendChild(el("br"));
        p.appendChild(document.createTextNode(x));
      });
      return p;
    }).filter(Boolean);
  }

  function linhasGeradasDasVersoes(ritual) {
    if (!RT() || !RT().linhaDeVersaoGerada) return null;
    var mapa = {};
    var algum = false;
    (ritual.versoes || []).slice(1).forEach(function (v) {
      var c = RT().custoDaVersao(ritual, v);
      if (!c || !v.custo) return;
      mapa[RT().linhaDeVersaoGerada(v.nome, c.adicional, c.total, v.requisito, v.alteracoes)] = true;
      algum = true;
    });
    return algum ? mapa : null;
  }

  var ROTULO_DO_TIPO = { dano: "Dano", cura: "Cura" };

  function rotuloDaRolagem(r) {
    if (r.tipo === "dano" || r.tipo === "cura") return ROTULO_DO_TIPO[r.tipo];
    return r.rotulo || "Rolagem";
  }

  function expressaoDe(r) {
    return (r.expressao || "") + (r.extra ? (r.expressao ? "+" : "") + r.extra : "");
  }

  function formasAvancadas(ritual) {
    return (ritual.versoes || []).slice(1).map(function (v) {
      var linhas = [];
      var c = v.custo && RT() ? RT().custoDaVersao(ritual, v) : null;
      if (c) linhas.push(el("p.ritual-forma__custo", { texto: "+" + c.adicional + " PE · total " + c.total + " PE" }));
      else if (v.custo) linhas.push(el("p.ritual-forma__custo", { texto: "+" + v.custo + " PE" }));
      if (v.requisito) linhas.push(el("p.ritual-forma__requisito", { texto: "Requer " + v.requisito }));
      if (v.alteracoes) linhas.push(el("div.ritual-texto", {}, blocosDoTexto(v.alteracoes, null)));
      var rolagens = F.rolagensDaVersao(v).filter(function (r) { return expressaoDe(r); });
      if (rolagens.length) {
        linhas.push(el("p.ritual-forma__rolagens", {
          texto: rolagens.map(function (r) { return rotuloDaRolagem(r) + ": " + expressaoDe(r); }).join(" · "),
        }));
      }
      if (!linhas.length) return null;
      return el("section.ritual-forma", { role: "listitem" }, [el("h4.ritual-forma__nome", { texto: v.nome })].concat(linhas));
    }).filter(Boolean);
  }

  function linhasDeAprendizado(ctx, vindo, substituido) {
    var saida = [el("dt", { texto: "Aprendizado" })];
    if (vindo && vindo.importado) {
      /* Ficha importada (v2.34): conhecido, sem a aquisição de origem. */
      saida.push(el("dd", { texto: vindo.nomePoder + ": conhecido na ficha de origem. A aquisição (etapa, poder, se conta no limite por Intelecto) não veio — histórico indisponível." }));
    } else if (vindo) {
      saida.push(el("dd", {
        texto: vindo.nomePoder + " · " + vindo.rotuloEtapa +
               (vindo.destino === "grimorio" ? " · guardado no grimório" : "") +
               (vindo.contaNoLimite ? " · conta no limite por Intelecto" : " · fora do limite de rituais conhecidos") +
               (vindo.substitui ? " · entrou no lugar de " + (vindo.substitui.nome || "outro ritual") + " (" + vindo.viaSubstituicao + ")" : "") +
               (vindo.legado ? " · vínculo guardado só pelo nome, de uma ficha anterior" : "") +
               (vindo.origem === "mesa" ? " · exceção declarada pela mesa" : "") +
               (vindo.excecao && vindo.origem !== "mesa" ? " · mantido pela mesa fora da regra desta aquisição" : ""),
      }));
      var reg = vindo.registroDeRitual ? registroDeRitual(ctx, vindo.registroDeRitual) : null;
      if (reg && (reg.fonte || reg.nota)) {
        saida.push(el("dt", { texto: "Registro" }));
        saida.push(el("dd", { texto: [nomeDaFonte(reg.fonte), reg.nota].filter(Boolean).join(" — ") }));
      }
    } else {
      saida.push(el("dd", { texto: "Registro, sem aquisição: está na ficha para consulta e não conta como conhecido." }));
    }
    if (substituido) {
      saida.push(el("dt", { texto: "Substituído" }));
      saida.push(el("dd", {
        texto: "Trocado por " + (substituido.porNome || "outro ritual") + " em " + substituido.em +
               " (Aprender Ritual, Ordem Paranormal RPG, p. 114). Continua na ficha, sem aquisição.",
      }));
    }
    return saida;
  }

  /* =================================================================
     VERSÕES, NO EDITOR
     -----------------------------------------------------------------
     Uma linha por versão: nome à esquerda, dano à direita, remover no
     fim. Tudo o que é digitado aqui vive numa cópia de trabalho até
     alguém confirmar — cancelar a janela não deixa rastro na ficha.

     A cópia guarda o ID de cada versão. É ele que faz renomear
     "Discente" para "Ampliado" continuar sendo a MESMA versão, com o
     mesmo dano, em vez de virar outra.
     ================================================================= */

  function editorDeVersoes(ritual) {
    /* Cópia de trabalho: mexer aqui não mexe no ritual. As rolagens que
       não são dano (cura, PV temporários, dado de auxílio) vêm do
       catálogo e são PRESERVADAS: o editor as mostra e não as perde. */
    var trabalho = (ritual.versoes || []).map(function (v) {
      return {
        id: v.id, nome: v.nome, dano: v.dano, danoExtra: v.danoExtra || "",
        custo: v.custo ? String(v.custo) : "", requisito: v.requisito || "", alteracoes: v.alteracoes || "",
        rolagens: v.rolagens ? JSON.parse(JSON.stringify(v.rolagens)) : null,
      };
    });
    if (!trabalho.length) trabalho = [{ id: U.uuid(), nome: F.NOME_VERSAO_PADRAO, dano: "" }];

    var lista = el("div.versoes", {});
    var controles = [];

    var acrescentar = el("button.r-botao.r-botao--mini", {
      type: "button", texto: "+ Adicionar versão",
      onclick: function () {
        colher();
        if (trabalho.length >= F.MAX_VERSOES_RITUAL) return;
        trabalho.push({ id: U.uuid(), nome: "", dano: "" });
        pintar();
        var ultimo = controles[controles.length - 1];
        if (ultimo) ultimo.nome.entrada.focus();
      },
    });

    /* Lê o que está nos campos de volta para a cópia. Chamado antes de
       qualquer redesenho: sem isto, acrescentar a terceira versão
       apagaria o que ainda não tinha sido confirmado nas duas
       primeiras. */
    function colher() {
      controles.forEach(function (c, i) {
        if (!trabalho[i]) return;
        trabalho[i].nome = c.nome.entrada.value;
        trabalho[i].dano = c.dano.entrada.value;
        trabalho[i].danoExtra = c.danoExtra.entrada.value;
        trabalho[i].custo = c.custo.entrada.value;
        trabalho[i].requisito = c.requisito.entrada.value;
        trabalho[i].alteracoes = c.alteracoes.entrada.value;
      });
    }

    function pintar() {
      colher();
      controles = [];

      U.trocar(lista, trabalho.map(function (v, i) {
        var nome = UI.campo({
          rotulo: "Versão", valor: v.nome, limite: 40,
          dica: i === 0 ? F.NOME_VERSAO_PADRAO : "Discente",
        });

        var dano = UI.campo({
          rotulo: "Dano", valor: v.dano, limite: 40, dica: "6d8",
          ajuda: i === 0 ? "Deixe em branco se esta versão não causa dano." : "",
        });

        var danoExtra = UI.campo({
          rotulo: "Dano extra", valor: v.danoExtra, limite: 40, dica: "3",
          ajuda: i === 0 ? "A parte fixa de um dano como 3d4+3. Nunca é multiplicada." : "",
        });

        /* O custo é o ACRÉSCIMO desta versão. A forma básica não tem: o
           custo dela é o do círculo do ritual (Tabela 5.2). */
        var custo = UI.campo({
          rotulo: i === 0 ? "Custo adicional (a básica não tem)" : "Custo adicional (PE)",
          tipo: "numero", valor: v.custo, limite: 2,
          ajuda: i === 0 ? "" : "Só o que esta versão SOMA ao custo do círculo.",
        });

        var requisito = UI.campo({
          rotulo: "Requisito", valor: v.requisito, limite: 200, dica: "3º círculo e afinidade",
        });

        var alteracoes = UI.campo({
          rotulo: "O que muda", tipo: "area", linhas: 2, valor: v.alteracoes, limite: 2000,
          ajuda: i === 0 ? "" : "Em relação à forma básica. O que não estiver aqui continua igual.",
        });

        controles.push({ nome: nome, dano: dano, danoExtra: danoExtra, custo: custo, requisito: requisito, alteracoes: alteracoes });

        /* A última versão não some: um ritual sem nenhuma não teria
           onde guardar dano quando alguém quisesse acrescentar um. */
        var remover = el("button.r-icone", {
          type: "button",
          "aria-label": "Remover a versão " + (v.nome || "sem nome"),
          title: "Remover versão",
          disabled: trabalho.length < 2,
          onclick: function () {
            colher();
            trabalho.splice(i, 1);
            pintar();
          },
        }, [UI.simbolo("lixeira", 14)]);

        var rolagens = (v.rolagens || []).map(function (r) {
          return r.rotulo + " " + (r.expressao || "") + (r.extra ? (r.expressao ? "+" : "") + r.extra : "");
        });

        return el("div.pilha--curta.versao-bloco", { class: "pilha" }, [
          el("div.versao", {}, [nome, dano, danoExtra, el("div.versao__acao", {}, [remover])]),
          el("div.editar-grade", {}, [custo, requisito]),
          alteracoes,
          rolagens.length ? el("p.t-mini", { texto: "Outras rolagens desta versão (preservadas): " + rolagens.join("; ") + "." }) : null,
        ]);
      }));

      acrescentar.disabled = trabalho.length >= F.MAX_VERSOES_RITUAL;
    }

    pintar();

    return {
      elemento: el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-secao", { texto: "Versões" }),
        el("p.t-mini", {
          texto: "Cada versão tem o próprio dano. Normal, Discente e Verdadeiro são o costume " +
                 "de Ordem Paranormal, não uma exigência: renomeie, acrescente ou remova à vontade. " +
                 "Versão sem dano não aparece na ficha.",
        }),
        lista,
        el("div.faixa", {}, [acrescentar]),
      ]),

      /* Confere e devolve as versões, ou null quando alguma expressão
         não passa. O que foi digitado NUNCA é apagado: o campo ganha a
         marca de erro e a mensagem, e continua com o texto lá. */
      conferir: function () {
        colher();

        controles.forEach(function (c) { c.nome.marcarErro(""); c.dano.marcarErro(""); c.danoExtra.marcarErro(""); });

        var primeiroRuim = null;

        trabalho.forEach(function (v, i) {
          var c = controles[i];

          if (!U.aparar(v.nome)) {
            c.nome.marcarErro("Dê um nome a esta versão.");
            if (!primeiroRuim) primeiroRuim = c.nome;
          }

          /* dadoOpcional: em branco passa, errado não. É a mesma
             conferência do dano de uma arma, com as mesmas mensagens —
             não existe segundo validador de dado neste sistema. */
          var r = V.dadoOpcional(v.dano);
          if (!r.ok) {
            c.dano.marcarErro(r.mensagem);
            if (!primeiroRuim) primeiroRuim = c.dano;
          }

          /* O dano extra aceita número (3) ou dado (1d6) — como o das
             armas. Vazio passa. */
          var extra = U.aparar(v.danoExtra);
          if (extra && !/^\d{1,4}$/.test(extra) && !V.dadoOpcional(extra).ok) {
            c.danoExtra.marcarErro("Use um número (3) ou um dado (1d6).");
            if (!primeiroRuim) primeiroRuim = c.danoExtra;
          }
        });

        if (primeiroRuim) { primeiroRuim.entrada.focus(); return null; }

        return trabalho.map(function (v) {
          var saida = { id: v.id, nome: v.nome, dano: v.dano, danoExtra: v.danoExtra };
          var custo = parseInt(v.custo, 10);
          if (custo > 0) saida.custo = custo;
          if (U.aparar(v.requisito)) saida.requisito = v.requisito;
          if (U.aparar(v.alteracoes)) saida.alteracoes = v.alteracoes;
          if (v.rolagens && v.rolagens.length) saida.rolagens = v.rolagens;
          return saida;
        });
      },
    };
  }

  /* =================================================================
     ROLAR O DANO
     -----------------------------------------------------------------
     Nada de novo acontece aqui. O motor de dados sorteia, o mostrador
     central exibe, e é o mostrador que entrega a rolagem ao histórico
     da campanha — com a chave de idempotência que impede uma
     retentativa de virar duas linhas.

     O sorteio acontece UMA vez, dentro de D.dano(). Se o envio ao
     histórico falhar, o que é reenviado é este mesmo resultado, e não
     um novo.

     E só isso: nada de custo de PE, teste de resistência ou redução de
     dano. O R.A.M.A. rola o que foi escrito.
     ================================================================= */

  function rolarDano(ctx, ritual, versao) {
    rolar(ctx, ritual, versao, { tipo: "dano", rotulo: "Dano", expressao: versao.dano, extra: versao.danoExtra || "" });
  }

  /* Uma rolagem de uma versão: o mesmo motor de dados e o mesmo
     mostrador da ficha, com o TIPO no nome do resultado — cura não é
     dano, e o histórico da campanha precisa saber a diferença. */
  function rolar(ctx, ritual, versao, rolagem) {
    var r = D.dano({ dano: rolagem.expressao, danoExtra: rolagem.extra, nome: ritual.nome });

    /* Ritual Potente (Int) e Ritual Intenso (Pre, AS1 p. 44): somam nas
       rolagens de dano e de cura dos rituais da ficha. */
    if (r.ok && (rolagem.tipo === "dano" || rolagem.tipo === "cura") && F.ehDeOrdem(ctx.ficha) && global.RAMAOrdemRegras) {
      var extra = global.RAMAOrdemRegras.rituais(ctx.ficha.ordem).rolagemExtra;
      if (extra && extra.total) {
        extra.partes.forEach(function (x) { r.parcelas.push({ rotulo: x.fonte + " (" + x.detalhe + ")", valor: x.valor }); });
        r.total += extra.total;
      }
    }

    if (!r.ok) {
      UI.avisoErro(
        "A rolagem “" + rolagem.rotulo + "” de " + ritual.nome + " · " + versao.nome +
        " não é uma expressão válida: “" + rolagem.expressao + "”. " +
        "Use NdX, como 6d8."
      );
      return;
    }

    global.RAMARolagens.mostrar(r, {
      nome: rolagem.rotulo + " — " + ritual.nome + " · " + versao.nome,
    });
  }

  /* =================================================================
     ARQUIVOS SECRETOS 1 NA ABA RITUAIS (v2.29)
     ================================================================= */

  function dtDoRitual(ctx, ritual) {
    if (!F.ehDeOrdem(ctx.ficha) || !RT() || !U.texto(ritual.resistencia).trim()) return "";
    var base = RT().dtDeResistencia(ctx.ficha.ordem);
    if (!base) return "";
    var R = global.RAMAOrdemRegras;
    var aprim = R && R.dtAprimoradaDe ? R.dtAprimoradaDe(ctx.ficha.ordem, ritual.nome) : null;
    var A2 = global.RAMAOrdemArquivo2;
    var liturgia = A2 ? A2.dtDeFortalecimento(ctx.ficha.ordem, ritual.id) : 0;
    var antena = dtDaAntena(ctx);
    var total = base.total + (aprim ? aprim.valor : 0) + liturgia + antena;
    var partes = [];
    if (aprim) partes.push("+" + aprim.valor + " de Habilidade Aprimorada" + (aprim.vezes > 1 ? ", escolhida duas vezes" : ""));
    if (liturgia) partes.push("+" + liturgia + " de Liturgia, até o próximo interlúdio");
    if (antena) partes.push("+" + antena + " d’A Antena empunhada");
    return String(total) + (partes.length ? " (com " + partes.join("; ") + ")" : "");
  }

  /* A Antena (AS2 p. 67): "a DT de seus rituais aumenta em +3" — com ela
     empunhada (o item marca). */
  function dtDaAntena(ctx) {
    var I = global.RAMAOrdemInventario;
    var itens = (ctx.ficha.inventario && ctx.ficha.inventario.itens) || [];
    return itens.some(function (i) {
      var d = I ? I.dadosDoItem(i) : (i.ordem || {});
      return i.origemCatalogoId === "as2.amaldicoado.a-antena" && d.empunhada;
    }) ? 3 : 0;
  }

  function retencaoDe(ctx, ritual) {
    var o = ctx.ficha.ordem;
    if (!o || !Array.isArray(o.retencoes)) return null;
    return o.retencoes.filter(function (x) { return x && x.ritualId === ritual.id; })[0] || null;
  }

  /* Rituais retidos — regra opcional Reter Ritual (AS1 p. 58-59). O
     painel só aparece quando há retenção; com a regra desligada, avisa
     que elas estão guardadas e não tiram nada do máximo. */
  var CONDICOES_SEM_FOCO = ["atordoado", "exausto", "pasmo"];

  function semFoco(o) {
    var EF = global.RAMAOrdemEfeitos;
    if (!EF || !o.condicoes) return [];
    return EF.condicoesEfetivas(o.condicoes).filter(function (x) {
      return !x.imune && CONDICOES_SEM_FOCO.indexOf(x.chave) >= 0;
    }).map(function (x) { return x.nome; });
  }

  function temPoderDaFicha(ctx, chave) {
    var est = estadoDe(ctx);
    return !!(est && est.adquiridos.some(function (a) { return a.chave === chave && a.valido !== false; }));
  }

  function recursoDeRetencao(ctx) {
    var R = global.RAMAOrdemRegras;
    return R && R.usaDeterminacao(ctx.ficha.ordem) ? "pd" : "pe";
  }

  function painelDeRetencao(ctx) {
    if (!F.ehDeOrdem(ctx.ficha)) return null;
    var o = ctx.ficha.ordem;
    var lista = Array.isArray(o.retencoes) ? o.retencoes : [];
    if (!lista.length) return null;
    var ligada = !!(OP() && OP().ligada(o, "reterRitual"));
    var combate = temPoderDaFicha(ctx, "reterRitualDeCombate");
    var foco = semFoco(o);
    var total = lista.reduce(function (t, x) { return t + (x.pe || 0); }, 0);
    var sigla = recursoDeRetencao(ctx).toUpperCase();
    var linhas = [
      el("h4.t-secao", { texto: "Rituais retidos" }),
      el("p.t-mini", { texto: ligada
        ? total + " " + sigla + " presos no máximo enquanto estes rituais forem mantidos (Reter Ritual, Arquivos Secretos 1, p. 58)."
        : "A regra opcional Reter Ritual está desligada: estas retenções ficam guardadas e não tiram nada do máximo." }),
    ];
    if (ligada && foco.length) {
      linhas.push(el("p.t-mini.t-aviso", { texto: "Pode ter perdido o foco (" + foco.join(", ") + "): o que conta é se o efeito perturba a mente — a fonte importa, e quem decide é o mestre (Inquérito Mensal, Arquivos Secretos 2, p. 104). Se perdeu, deixa de reter todos os rituais na hora e recupera os " +
        sigla + " máximos, não os atuais." + (combate ? " Com Reter Ritual de Combate, pode gastar uma reação e 1 " + sigla + " por ritual para mudar a duração deles para cena." : "") }));
    }
    lista.forEach(function (ret) {
      var botoes = [
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Deixar de reter",
          title: "Ação livre ou reação: volta o máximo, não o atual.",
          onclick: function () { deixarDeReter(ctx, ret, false); } }),
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Liberar com calma",
          title: "Ação padrão e Ocultismo DT " + (20 + (ret.pe || 0)) + ": passando, volta o máximo e o atual.",
          onclick: function () { liberarComCalma(ctx, ret); } }),
        combate ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Mudar para cena",
          title: "Reter Ritual de Combate: reação (1 " + sigla + " quando é para não perder o foco).",
          onclick: function () { mudarParaCena(ctx, ret, foco.length ? 1 : 0); } }) : null,
      ];
      linhas.push(el("div.ritual-retido", {}, [
        el("p.t-mini", { texto: ret.nome + (ret.versao && ret.versao !== "Normal" ? " (" + ret.versao + ")" : "") + " · " + (ret.pe || 0) + " " + sigla +
          (ret.negativo ? " · afeta um alvo: só faz efeito com ele na linha de efeito" : "") }),
        el("div.faixa", {}, botoes),
      ]));
    });
    if (ligada && foco.length && lista.length > 1) {
      linhas.push(el("div.faixa", {}, [
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Deixar de reter todos",
          onclick: function () { lista.slice().forEach(function (ret) { tirarRetencao(ctx.ficha.ordem, ret.id); }); salvarRetencao(ctx, "Os rituais deixaram de ser retidos: os máximos voltaram, os atuais não."); } }),
      ]));
    }
    return el("div.pilha--curta.rituais-retidos", { class: "pilha" }, linhas);
  }

  function tirarRetencao(o, id) {
    o.retencoes = (o.retencoes || []).filter(function (x) { return x.id !== id; });
  }

  function salvarRetencao(ctx, aviso) {
    ctx.alterou();
    ctx.redesenhar();
    if (aviso) UI.avisoOk(aviso, { duracao: 6000 });
  }

  /* Volta os atuais retidos, sem passar do máximo novo. */
  function devolverAtuais(ctx, ret) {
    var R = global.RAMAOrdemRegras;
    var o = ctx.ficha.ordem;
    var qual = recursoDeRetencao(ctx);
    if (!o.recursos || o.recursos[qual] === null || o.recursos[qual] === undefined) return;
    var c = R.calcular(o, ctx.ficha.inventario);
    var maximo = qual === "pd" ? (c.pd ? c.pd.total : 0) : c.pe.total;
    o.recursos[qual] = Math.min(maximo, (Number(o.recursos[qual]) || 0) + (ret.pe || 0));
  }

  function deixarDeReter(ctx, ret) {
    tirarRetencao(ctx.ficha.ordem, ret.id);
    salvarRetencao(ctx, ret.nome + " deixou de ser retido: os " + (ret.pe || 0) + " " + recursoDeRetencao(ctx).toUpperCase() +
      " máximos voltaram; os atuais voltam com descanso ou itens (Arquivos Secretos 1, p. 58).");
  }

  function liberarComCalma(ctx, ret) {
    var dt = 20 + (ret.pe || 0);
    var janela = UI.modal({
      titulo: "Liberar " + ret.nome + " com calma",
      conteudo: [el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", { texto: "Ação padrão e teste de Ocultismo DT " + dt + " (20 + o custo em PE do ritual). Passando, volta o máximo e o atual; falhando, só o máximo (Arquivos Secretos 1, p. 58)." }),
        el("div.faixa", {}, [
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Rolar Ocultismo",
            onclick: function () { if (global.RAMAOrdemRolarPericia) global.RAMAOrdemRolarPericia(ctx, "ocultismo", "Ocultismo · liberar " + ret.nome + " (DT " + dt + ")"); } }),
        ]),
      ])],
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Falhou", aoClicar: function (fechar) {
          tirarRetencao(ctx.ficha.ordem, ret.id);
          salvarRetencao(ctx, ret.nome + " deixou de ser retido: só os máximos voltaram.");
          fechar();
        } },
        { rotulo: "Passou", classe: "r-botao--principal", aoClicar: function (fechar) {
          tirarRetencao(ctx.ficha.ordem, ret.id);
          devolverAtuais(ctx, ret);
          salvarRetencao(ctx, ret.nome + " liberado com calma: voltaram os máximos e os atuais.");
          fechar();
        } },
      ],
    });
    return janela;
  }

  /* Reter Ritual de Combate (AS1 p. 44): a duração vira cena — o ritual
     deixa de ser retido (o máximo volta) e o efeito vai até o fim da
     cena. Quando é para não perder o foco, custa 1 PE por ritual. */
  function mudarParaCena(ctx, ret, custo) {
    var R = global.RAMAOrdemRegras;
    var CD = global.RAMAOrdemCondicoes;
    var o = ctx.ficha.ordem;
    if (custo) {
      var c = R.calcular(o, ctx.ficha.inventario);
      var qual = c.determinacao ? "pd" : "pe";
      var maximo = qual === "pd" ? c.pd.total : c.pe.total;
      var r = CD ? CD.aplicarAcao(qual, "gastar", { cond: o.condicoes, atual: c.atual[qual], maximo: maximo, valor: custo, pd: c.determinacao }) : null;
      if (!r || !r.ok) { UI.avisoAtencao((r && r.motivo) || "Sem " + qual.toUpperCase() + " para mudar a duração."); return; }
      if (!o.recursos) o.recursos = { pv: null, pe: null, san: null, pd: null };
      o.recursos[qual] = r.valor;
    }
    tirarRetencao(o, ret.id);
    salvarRetencao(ctx, ret.nome + ": a duração passou a ser cena (Reter Ritual de Combate). O efeito continua até o fim da cena; os máximos voltaram." +
      (custo ? " Gastou " + custo + "." : ""));
  }

  /* O custo em PE escrito: a forma básica e o total de cada avançada. */
  function custosDoRitual(ritual) {
    var RT = global.RAMAOrdemRituais;
    if (!RT) return "";
    var base = RT.custoDaVersao(ritual, null);
    if (!base) return "";
    var partes = [base.base + " PE"];
    (ritual.versoes || []).forEach(function (v) {
      if (!v.custo) return;
      var c = RT.custoDaVersao(ritual, v);
      partes.push(v.nome + ": +" + c.adicional + " PE (total " + c.total + " PE)");
    });
    return partes.join(" · ");
  }

  /* A faixa compacta de rolagens do cartão, agrupada por versão (v2.32):
     o nome da versão e, dentro dela, cada rolagem com o tipo (dano, cura,
     PV temporários…), a expressão e o dado. Só entram as versões com
     rolagem preenchida; sem nenhuma, fica só o "Usar ritual". */
  function faixaDeDanos(ctx, ritual) {
    var comRolagem = F.versoesComRolagem(ritual);
    var usar = botaoUsarRitual(ctx, ritual);
    if (!comRolagem.length) return usar ? el("div.ritual-danos", {}, [usar]) : null;

    var grupos = usar ? [usar] : [];
    comRolagem.forEach(function (v) {
      var itens = [];
      F.rolagensDaVersao(v).forEach(function (rolagem) {
        var expressao = expressaoDe(rolagem);
        if (!expressao) return;
        itens.push(el("div.ritual-dano", { class: "ritual-dano--" + (rolagem.tipo || "outra") }, [
          el("span.ritual-dano__tipo", { texto: rotuloDaRolagem(rolagem) }),
          el("div.ritual-dano__linha", {}, [
            el("span.ritual-dano__expressao", { texto: expressao }),
            el("button.r-icone.ritual-dano__rolar", {
              type: "button",
              "aria-label": "Rolar " + rotuloDaRolagem(rolagem).toLowerCase() + " de " + ritual.nome + ", versão " + v.nome + ", " + expressao,
              title: "Rolar " + expressao,
              onclick: function (ev) {
                /* O cartão é um <details>. Sem estas duas linhas, rolar
                   fecharia o ritual que a pessoa acabou de abrir. */
                ev.preventDefault();
                ev.stopPropagation();
                rolar(ctx, ritual, v, rolagem);
              },
            }, [UI.simbolo("dado", 14)]),
          ]),
        ]));
      });
      if (itens.length) {
        grupos.push(el("div.ritual-dano-grupo", { role: "group", "aria-label": "Rolagens da versão " + v.nome }, [
          el("span.ritual-dano__versao", { texto: v.nome }),
          el("div.ritual-dano-grupo__itens", {}, itens),
        ]));
      }
    });

    return grupos.length ? el("div.ritual-danos", {}, grupos) : null;
  }

  /* "Usar ritual" (fichas de Ordem): a conjuração com versão, custo e
     componentes revistos antes de confirmar (js/paginas/ficha-consumo.js).
     Rolar o dano pela faixa continua não gastando nada — o gasto é do
     uso, não da rolagem. Vale também para ritual sem rolagem nenhuma. */
  function botaoUsarRitual(ctx, ritual) {
    if (!F.ehDeOrdem(ctx.ficha) || !global.RAMASecaoConsumo) return null;
    return el("button.r-botao.r-botao--mini.ritual-usar", {
      type: "button", texto: "Usar ritual",
      "aria-label": "Usar " + ritual.nome,
      dataset: { foco: "usar-" + ritual.id },
      onclick: function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        global.RAMASecaoConsumo.usarRitual(ctx, ritual);
      },
    });
  }

  /* =================================================================
     CRIAR E EDITAR
     ================================================================= */

  /* Os campos de um ritual, montados uma vez e reaproveitados pelo
     editor da ficha e pelo editor da página Homebrew — para não
     existirem dois formulários de ritual no sistema.

     opcoes: { rotulos, comOrdem } */
  function camposDoRitual(atual, opcoes) {
    var o = opcoes || {};
    var rotulos = o.rotulos || F.ROTULOS_RITUAL_PADRAO;

    var nome = UI.campo({ rotulo: "Nome", valor: atual.nome, limite: 120 });

    var campos = {};
    F.CAMPOS_RITUAL.forEach(function (chave) {
      var longo = chave === F.CAMPO_LONGO_RITUAL;
      campos[chave] = UI.campo({
        /* O rótulo mostrado é o da seção; a chave gravada continua
           sendo `chave`. É aqui que os dois mundos se encontram. */
        rotulo: rotulos[chave],
        valor: atual[chave],
        tipo: longo ? "area" : "text",
        linhas: 8,
        limite: longo ? 8000 : 200,
        ajuda: chave === "alvo" ? "Alvo, Área e Efeito são campos diferentes: preencha o que o ritual usa." : "",
      });
    });

    /* v2.32: regras gerais, notas e fonte, à parte da descrição. */
    var complemento = UI.campo({
      rotulo: "Regras, notas e fonte", valor: atual.complemento || "", tipo: "area", linhas: 4, limite: 8000,
      ajuda: "Opcional. Aparece numa região à parte do cartão, recolhível quando é longa.",
    });

    var curtos = F.CAMPOS_RITUAL.filter(function (c) { return c !== F.CAMPO_LONGO_RITUAL; });
    var ordem = o.comOrdem ? camposDeOrdem(atual) : null;
    var versoes = editorDeVersoes(atual);

    return {
      elementos: [
        nome,
        el("div.editar-grade", {}, curtos.map(function (c) { return campos[c]; })),
        campos[F.CAMPO_LONGO_RITUAL],
        complemento,
        ordem ? el("hr.r-linha") : null,
        ordem ? ordem.elemento : null,
        el("hr.r-linha"),
        versoes.elemento,
      ].filter(Boolean),

      focar: function () { nome.entrada.focus(); },

      coletar: function () {
        var valor = nome.entrada.value.trim();
        if (!valor) { nome.marcarErro("Informe um nome."); nome.entrada.focus(); return null; }

        /* Nada é gravado enquanto houver expressão inválida — e nada do
           que foi digitado é apagado por causa disso. A janela continua
           aberta, com o erro no campo certo. */
        var listaDeVersoes = versoes.conferir();
        if (!listaDeVersoes) return null;

        var dados = { nome: valor, versoes: listaDeVersoes };
        F.CAMPOS_RITUAL.forEach(function (c) { dados[c] = campos[c].entrada.value; });
        dados.complemento = complemento.entrada.value;

        /* O que o editor não mostra continua como estava: o rastro da
           origem e, quando não há bloco de Ordem na tela, o bloco que o
           ritual já tinha. */
        if (atual.origemCatalogoId) dados.origemCatalogoId = atual.origemCatalogoId;
        if (atual.origemHomebrewId) dados.origemHomebrewId = atual.origemHomebrewId;
        dados.ordem = ordem ? ordem.coletar() : (atual.ordem || null);
        if (!dados.ordem) delete dados.ordem;

        return dados;
      },
    };
  }

  /* Os números que as regras de Ordem leem num ritual: elemento,
     círculo e o custo em PE da forma básica. Em branco, o custo vem do
     círculo — a tabela do livro. */
  function camposDeOrdem(atual) {
    var RT = global.RAMAOrdemRituais;
    var d = RT ? RT.dadosDoRitual(atual) : {};

    var elemento = UI.campo({
      rotulo: "Elemento (regras de Ordem)", tipo: "selecao", valor: d.elemento || "",
      opcoes: [{ valor: "", rotulo: "Não informado" }].concat((RT ? RT.ELEMENTOS : []).map(function (e) {
        return { valor: e.chave, rotulo: e.nome };
      })),
      ajuda: "Usado pelos avisos de afinidade e pelo custo em Sanidade dos rituais de Medo.",
    });

    var circulo = UI.campo({
      rotulo: "Círculo (1 a 4)", tipo: "selecao", valor: d.circulo ? String(d.circulo) : "",
      opcoes: [{ valor: "", rotulo: "Não informado" }].concat((RT ? RT.CIRCULOS : []).map(function (n) {
        return { valor: String(n), rotulo: RT.rotuloCirculo(n) + " (" + RT.custoDoCirculo(n) + " PE)" };
      })),
    });

    var custo = UI.campo({
      rotulo: "Custo em PE da forma básica", tipo: "numero",
      valor: d.custo !== undefined && d.circulo && d.custo !== (RT ? RT.custoDoCirculo(d.circulo) : null) ? String(d.custo) : "",
      limite: 3,
      ajuda: "Em branco usa o custo do círculo (1, 3, 6 ou 10 PE).",
    });

    return {
      elemento: el("div.pilha--curta", { class: "pilha" }, [
        el("h4.t-secao", { texto: "Ordem Paranormal" }),
        el("div.editar-grade", {}, [elemento, circulo]),
        custo,
      ]),
      coletar: function () {
        var saida = {};
        if (elemento.entrada.value) saida.elemento = elemento.entrada.value;
        if (circulo.entrada.value) saida.circulo = parseInt(circulo.entrada.value, 10);
        var pe = parseInt(custo.entrada.value, 10);
        if (Number.isFinite(pe) && pe >= 0) saida.custo = pe;
        else if (saida.circulo && RT) saida.custo = RT.custoDoCirculo(saida.circulo);
        /* A referência do livro não é editável: ela é o rastro de onde o
           ritual veio, e continua como estava. */
        if (atual.ordem && atual.ordem.referencia) saida.referencia = atual.ordem.referencia;
        /* Ritual de vários elementos (AS1 p. 49): o editor não mexe na
           lista — ela continua como estava, em vez de sumir ao salvar. */
        if (atual.ordem && atual.ordem.todosOsElementos && Array.isArray(atual.ordem.elementos)) {
          saida.elementos = atual.ordem.elementos.slice();
          saida.todosOsElementos = true;
        }
        return Object.keys(saida).length ? saida : null;
      },
    };
  }

  function novoRitual(ctx) { editar(ctx, null); }

  function editar(ctx, ritual) {
    var criando = !ritual;
    var atual = ritual || F.criarRitual({});
    var campos = camposDoRitual(atual, {
      rotulos: ctx.ficha.rituais.rotulos,
      comOrdem: F.ehDeOrdem(ctx.ficha) && !!global.RAMAOrdemRituais,
    });

    UI.modal({
      titulo: criando ? "Novo registro" : "Editar",
      largo: true,
      conteudo: el("div.pilha", {}, campos.elementos),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: criando ? "Criar" : "Salvar",
          classe: "r-botao--principal",
          aoClicar: function (fechar) {
            var dados = campos.coletar();
            if (!dados) return;
            var listaDeVersoes = dados.versoes;

            if (criando) {
              /* criarRitual gera ids do zero, inclusive das versões — é
                 o que se quer para um registro que está nascendo. */
              var novo = F.criarRitual(dados);
              novo.adicionadoEm = U.agoraISO();
              ctx.ficha.rituais.itens.push(novo);
            } else {
              Object.assign(ritual, F.criarRitual(dados), {
                id: ritual.id,
                /* Os ids vêm das linhas do editor, e não de criarRitual:
                   renomear uma versão não pode trocar a identidade dela
                   nem soltá-la do dano que já tinha. */
                versoes: F.normalizarVersoesRitual(listaDeVersoes),
              });
              /* Esvaziado no editor, o complemento sai. */
              if (!U.aparar(dados.complemento)) delete ritual.complemento;
            }

            ctx.alterou();
            fechar();
            ctx.redesenhar();
          },
        },
      ],
    });

    campos.focar();
  }

  /* Guardar o ritual na biblioteca Homebrew da conta — o mesmo caminho
     que itens e habilidades usam. A ficha continua com a cópia dela. */
  async function enviarParaHomebrew(ctx, ritual) {
    var registro = F.normalizarRitual(ritual) || {};
    registro = JSON.parse(JSON.stringify(registro));
    delete registro.id;
    delete registro.origemHomebrewId;
    registro.tipo = "ritual";

    var r = await UI.ocupar(null, function () {
      return global.RAMAApi.salvarHomebrew(registro);
    }, { rotulo: "Enviando…" });

    if (r && r.ok) UI.avisoOk(ritual.nome + " foi guardado na biblioteca Homebrew.");
    else UI.avisoErro(global.RAMAApi.frase(r).texto);
  }

  function duplicar(ctx, ritual) {
    var copia = F.criarRitual(ritual);
    copia.nome = ritual.nome + " (cópia)";
    /* A cópia é um registro novo: entrou agora. */
    copia.adicionadoEm = U.agoraISO();
    ctx.ficha.rituais.itens.push(copia);
    ctx.alterou();
    ctx.redesenhar();
  }

  /* Com `visiveis` (os vizinhos do mesmo grupo na tela), troca com o
     vizinho visível — a mesma conta do arraste. Sem ela, com o da lista
     guardada, como sempre foi. */
  function reordenar(ctx, ritual, direcao, visiveis) {
    var itens = ctx.ficha.rituais.itens;
    if (visiveis && O()) {
      if (!O().passo(itens, ritual.id, direcao, visiveis)) return;
      ctx.alterou();
      ctx.redesenhar();
      return;
    }
    var i = U.indiceDe(itens, ritual.id);
    var destino = i + direcao;
    if (i < 0 || destino < 0 || destino >= itens.length) return;

    var movido = itens.splice(i, 1)[0];
    itens.splice(destino, 0, movido);
    ctx.alterou();
    ctx.redesenhar();
  }

  /* =================================================================
     PRENDER E SOLTAR
     -----------------------------------------------------------------
     A associação é sempre EXPLÍCITA: a janela lista as concessões
     abertas que aceitam este ritual e diz por que as outras não. Nada
     é escolhido sozinho, e nenhuma cópia é criada.
     ================================================================= */

  function registroDeRitual(ctx, id) {
    return (ctx.ficha.ordem.registrosDeRitual || []).filter(function (r) { return r.id === id; })[0] || null;
  }

  function nomeDaFonte(chave) {
    var A = global.RAMAOrdemAprendizado;
    var f = A ? A.FONTES_DE_ESTUDO.filter(function (x) { return x.chave === chave; })[0] : null;
    return f ? f.nome : "";
  }

  function gravarAquisicao(ctx, operacoes, sucesso) {
    var r = E().confirmarAquisicao(ctx.ficha.ordem, rituaisDe(ctx), operacoes, { inventario: ctx.ficha.inventario });
    if (!r.ok) {
      UI.avisoAtencao("Não foi gravado: " + (r.motivos || []).join(" "));
      return false;
    }
    ctx.alterou();
    ctx.redesenhar();
    if (sucesso) UI.avisoOk(sucesso);
    return true;
  }

  /* Prender um ritual que já está na ficha a uma aquisição aberta. A
     janela lista as que o aceitam e diz por que as outras não; nada é
     escolhido sozinho, e nenhuma cópia é criada. */
  function prender(ctx, ritual) {
    var apr = aprendizadoDe(ctx);
    if (!apr) return;
    var dados = RT() ? RT().dadosDoRitual(ritual) : {};
    var candidato = { ritualId: ritual.id, nome: ritual.nome, circulo: dados.circulo || 0, elemento: dados.elemento || "", catalogo: ritual.origemCatalogoId || "" };
    var contexto = { inventario: ctx.ficha.inventario, rituais: rituaisDe(ctx) };

    var aceitam = [];
    var recusam = [];
    apr.concessoes.forEach(function (c) {
      var aq = E().contextoDeAquisicao(ctx.ficha.ordem, { tipo: "concessao", vaga: c.id }, contexto);
      if (!aq) return;
      var teste = aq.avaliar(candidato);
      if (c.completa) recusam.push({ rotulo: c.rotulo + " (" + c.rotuloEtapa + ")", motivo: "Já está completa." });
      else if (!teste.ok) recusam.push({ rotulo: c.rotulo + " (" + c.rotuloEtapa + ")", motivo: teste.motivo });
      else aceitam.push({ tipo: "concessao", c: c });
    });
    var campo = E().contextoDeAquisicao(ctx.ficha.ordem, { tipo: "campo" }, contexto);
    if (campo) {
      var testeCampo = campo.avaliar(candidato);
      if (testeCampo.ok) aceitam.push({ tipo: "campo", aq: campo });
      else recusam.push({ rotulo: "Estudo em campo", motivo: testeCampo.motivo });
    }

    if (!aceitam.length) {
      UI.avisoAtencao(ritual.nome + " não cabe em nenhuma aquisição aberta. " +
        (recusam.length ? recusam[0].rotulo + ": " + recusam[0].motivo : "Não há aquisição em aberto.") +
        " Se a mesa concedeu o ritual fora das regras, use “Registrar como concessão da mesa”.");
      return;
    }

    var janela;
    janela = UI.modal({
      titulo: "Prender " + ritual.nome + " a uma aquisição",
      conteudo: el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", { texto: "O ritual continua sendo este — nenhuma cópia é criada. Soltar depois também não o apaga." }),
      ].concat(aceitam.map(function (x) {
        if (x.tipo === "campo") {
          return el("button.criacao-opcao", {
            type: "button",
            onclick: function () { if (janela) janela.fechar(); confirmarEstudo(ctx, ritual, x.aq); },
          }, [
            el("span.criacao-opcao__nome", { texto: "Estudo em campo" }),
            el("span.criacao-opcao__texto", { texto: "O personagem achou a fonte deste ritual e passou no teste de Ocultismo. A confirmação vem no próximo passo." }),
            el("span.criacao-opcao__fonte", { texto: "Sobrevivendo ao Horror, p. 113" }),
          ]);
        }
        var c = x.c;
        return el("button.criacao-opcao", {
          type: "button",
          onclick: function () {
            var ids = c.escolhidos.map(function (a) { return a.ritualId; }).concat([ritual.id]);
            if (gravarAquisicao(ctx, { tipo: "concessao", vaga: c.id, rituais: ids },
                ritual.nome + " passou a ocupar " + c.rotulo + " (" + c.rotuloEtapa + ").") && janela) janela.fechar();
          },
        }, [
          el("span.criacao-opcao__nome", { texto: c.rotulo + " · " + c.rotuloEtapa }),
          el("span.criacao-opcao__texto", { texto: c.explicacao }),
          el("span.criacao-opcao__fonte", { texto: "Faltam " + c.restantes + " de " + c.quantidade + "." }),
        ]);
      })).concat(recusam.length ? [
        el("h4.t-rotulo", { texto: "Não aceitam este ritual" }),
        el("ul.bib-lista-textos", {}, recusam.slice(0, 8).map(function (x) {
          return el("li.t-mini", { texto: x.rotulo + ": " + x.motivo });
        })),
      ] : [])),
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }],
    });
  }

  /* O estudo em campo depende de acontecimentos da mesa (SAH p.113): a
     fonte foi achada e o teste passou. A janela pergunta; ter o ritual
     na ficha não prova nenhum dos dois. */
  function confirmarEstudo(ctx, ritual, aq) {
    var A = global.RAMAOrdemAprendizado;
    var dados = RT() ? RT().dadosDoRitual(ritual) : {};
    var dt = A ? A.dtDeEstudo(dados.circulo) : 0;
    var escolha = { fonte: "", nota: "", confirmado: false };
    var idConf = "estudo-" + ritual.id;
    var aviso = el("p.t-mini.t-erro", { role: "alert", hidden: true });
    UI.modal({
      titulo: "Estudo em campo — " + ritual.nome,
      conteudo: el("div.pilha--curta", { class: "pilha" }, [
        el("p.t-mini", { texto: aq.explicacao }),
        el("p", { texto: "Ocultismo DT " + (dt || "—") + (dados.circulo ? " (" + dados.circulo + "º círculo)" : "") + ", numa ação de interlúdio." }),
        el("div.r-campo", {}, [
          el("label.r-rotulo", { for: idConf + "-fonte", texto: "De onde veio o ritual" }),
          el("select.r-selecao", { id: idConf + "-fonte", onchange: function (ev) { escolha.fonte = ev.target.value; } },
            [el("option", { value: "", texto: "Não informar" })].concat((A ? A.FONTES_DE_ESTUDO : []).map(function (f) {
              return el("option", { value: f.chave, texto: f.nome });
            }))),
        ]),
        el("div.r-campo", {}, [
          el("label.r-rotulo", { for: idConf + "-nota", texto: "Nota (opcional)" }),
          el("input.r-entrada", { id: idConf + "-nota", type: "text", maxlength: "300",
            oninput: function (ev) { escolha.nota = ev.target.value; } }),
        ]),
        el("label.bib-alternar", { for: idConf }, [
          el("input", { id: idConf, type: "checkbox", onchange: function (ev) { escolha.confirmado = ev.target.checked; } }),
          el("span", { texto: "Confirmo que o personagem encontrou a fonte e passou no teste de Ocultismo." }),
        ]),
        aviso,
      ]),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Registrar estudo", classe: "r-botao--principal", aoClicar: function (fechar) {
          if (!escolha.confirmado) {
            aviso.hidden = false;
            aviso.textContent = "Falta confirmar o estudo: a fonte achada e o teste de Ocultismo que passou.";
            return;
          }
          if (gravarAquisicao(ctx, { tipo: "campo", ritualId: ritual.id, fonte: escolha.fonte, nota: escolha.nota, confirmado: true },
              ritual.nome + ": estudo registrado, o ritual passou a ser conhecido.")) fechar();
        } },
      ],
    });
  }

  /* A mesa pode conceder um ritual fora das regras. Fica marcado como
     exceção e não resolve pendência nenhuma — é uma ação separada, e
     nunca a saída de uma escolha que a regra recusou. */
  function registrarMesa(ctx, ritual) {
    var nota = "";
    var id = "mesa-" + ritual.id;
    UI.modal({
      titulo: "Concessão da mesa — " + ritual.nome,
      conteudo: el("div.pilha--curta", { class: "pilha" }, [
        el("p", { texto: "O ritual passa a contar como conhecido por decisão da mesa, fora das regras de progressão." }),
        el("p.t-mini", { texto: "Fica marcado como exceção e NÃO resolve nenhuma pendência: as aquisições da progressão continuam pedindo os rituais delas." }),
        el("div.r-campo", {}, [
          el("label.r-rotulo", { for: id, texto: "Nota (opcional)" }),
          el("input.r-entrada", { id: id, type: "text", maxlength: "300", placeholder: "Presente do mestre, missão 4…",
            oninput: function (ev) { nota = ev.target.value; } }),
        ]),
      ]),
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Registrar concessão", classe: "r-botao--principal", aoClicar: function (fechar) {
          if (gravarAquisicao(ctx, { tipo: "mesa", ritualId: ritual.id, nota: nota },
              ritual.nome + " passou a ser conhecido por concessão da mesa.")) fechar();
        } },
      ],
    });
  }

  async function desfazerRegistro(ctx, ritual, vindo) {
    var certeza = await UI.confirmar({
      titulo: vindo.origem === "campo" || vindo.origem === "maldicao" ? "Desfazer o estudo de " + ritual.nome + "?" : "Desfazer a concessão da mesa?",
      texto: "O ritual deixa de contar como conhecido e continua na ficha, como registro.",
      rotuloConfirmar: "Desfazer",
    });
    if (!certeza) return;
    gravarAquisicao(ctx, { tipo: "desfazerRegistro", id: vindo.registroDeRitual }, "Registro desfeito.");
  }

  async function soltar(ctx, ritual, vindo) {
    var certeza = await UI.confirmar({
      titulo: "Soltar " + ritual.nome + " da concessão?",
      texto: "Ele sai de " + vindo.nomePoder + " (" + vindo.rotuloEtapa + ") e a concessão volta a ficar pendente.",
      detalhe: "O ritual continua na ficha, como registro, com tudo o que tem.",
      rotuloConfirmar: "Soltar",
    });
    if (!certeza) return;
    var apr = aprendizadoDe(ctx);
    var c = apr ? apr.concessoes.filter(function (x) { return x.id === vindo.concessao; })[0] : null;
    var ids = c ? c.escolhidos.map(function (a) { return a.ritualId; }).filter(function (x) { return x !== ritual.id; }) : [];
    gravarAquisicao(ctx, { tipo: "concessao", vaga: vindo.concessao, rituais: ids });
  }

  /* Ficha anterior à v2.17, ou personagem criado direto num NEX alto:
     rituais na ficha e aquisições abertas. A janela lista cada ritual
     sem aquisição com as aquisições que o aceitam — e a escolha é de
     quem joga, ritual por ritual. Nada é associado pelo nome. */
  function associarExistentes(ctx) {
    var apr = aprendizadoDe(ctx);
    if (!apr) return;
    var contexto = { inventario: ctx.ficha.inventario, rituais: rituaisDe(ctx) };
    var abertas = apr.concessoes.filter(function (c) { return !c.completa; });
    var escolhas = {};
    var aquisicoes = {};
    abertas.forEach(function (c) {
      aquisicoes[c.id] = E().contextoDeAquisicao(ctx.ficha.ordem, { tipo: "concessao", vaga: c.id }, contexto);
    });
    var corpoJ = el("div.pilha--curta", { class: "pilha" });
    var aviso = el("p.t-mini.t-erro", { role: "alert", hidden: true });

    function restantes(c) {
      var usados = Object.keys(escolhas).filter(function (rid) { return escolhas[rid] === c.id; }).length;
      return c.restantes - usados;
    }

    function pintarJ() {
      U.trocar(corpoJ, [
        el("p.t-mini", { texto: "Para cada ritual, escolha a aquisição de onde ele veio — ou deixe como registro. Só aparecem as aquisições que o aceitam, e nenhuma cópia é criada." }),
      ].concat(apr.semAquisicao.map(function (d) {
        var idSel = "assoc-" + d.id;
        var opcoes = abertas.filter(function (c) {
          var aq = aquisicoes[c.id];
          return aq && aq.avaliar({ ritualId: d.id, circulo: d.circulo, elemento: d.elemento, catalogo: d.catalogo, nome: d.nome }).ok;
        });
        return el("div.r-campo", {}, [
          el("label.r-rotulo", { for: idSel, texto: (d.nome || "(sem nome)") + (d.circulo ? " · " + d.circulo + "º círculo" : " · círculo não informado") }),
          opcoes.length
            ? el("select.r-selecao", {
                id: idSel,
                onchange: function (ev) {
                  if (ev.target.value) escolhas[d.id] = ev.target.value; else delete escolhas[d.id];
                  pintarJ();
                  var volta = document.getElementById(idSel);
                  if (volta) volta.focus();
                },
              }, [el("option", { value: "", texto: "Deixar como registro" })].concat(opcoes.map(function (c) {
                var cheio = restantes(c) <= 0 && escolhas[d.id] !== c.id;
                return el("option", {
                  value: c.id, disabled: cheio, selected: escolhas[d.id] === c.id,
                  texto: c.rotulo + " · " + c.rotuloEtapa + (cheio ? " (completa)" : ""),
                });
              })))
            : el("p.t-mini", { texto: "Nenhuma aquisição aberta aceita este ritual." }),
        ]);
      })).concat([aviso]));
    }

    pintarJ();
    UI.modal({
      titulo: "Associar rituais da ficha",
      largo: true,
      conteudo: corpoJ,
      botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Confirmar", classe: "r-botao--principal", aoClicar: function (fechar) {
          var porVaga = {};
          Object.keys(escolhas).forEach(function (rid) {
            var vaga = escolhas[rid];
            if (!porVaga[vaga]) porVaga[vaga] = [];
            porVaga[vaga].push(rid);
          });
          var ops = Object.keys(porVaga).map(function (vaga) {
            var c = abertas.filter(function (x) { return x.id === vaga; })[0];
            return { tipo: "concessao", vaga: vaga, rituais: c.escolhidos.map(function (a) { return a.ritualId; }).concat(porVaga[vaga]) };
          });
          if (!ops.length) { fechar(); return; }
          /* Todas numa operação só: ou todas entram, ou nenhuma. */
          var r = E().confirmarAquisicao(ctx.ficha.ordem, rituaisDe(ctx), ops, { inventario: ctx.ficha.inventario });
          if (!r.ok) {
            aviso.hidden = false;
            aviso.textContent = "Não foi gravado: " + (r.motivos || []).join(" ");
            return;
          }
          ctx.alterou();
          ctx.redesenhar();
          fechar();
          UI.avisoOk(Object.keys(escolhas).length + " ritual(is) associado(s), sem nenhuma cópia nova.");
        } },
      ],
    });
  }

  async function remover(ctx, ritual) {
    var apr = aprendizadoDe(ctx);
    var vindo = apr ? apr.porRitual[ritual.id] : null;
    var consequencia = "O registro sai desta ficha.";
    if (vindo) {
      if (vindo.registroDeRitual) {
        consequencia = "O registro sai desta ficha, e com ele o " + (vindo.origem === "campo" ? "estudo em campo" : (vindo.origem === "maldicao" ? "registro da Compreensão de Maldições" : "registro da concessão da mesa")) + ".";
      } else if (vindo.regra && vindo.regra.tipo === "concessao" && !vindo.substitui) {
        consequencia = "O registro sai desta ficha, e " + vindo.nomePoder + " (" + vindo.rotuloEtapa + ") volta a ficar pendente na Progressão.";
      } else {
        consequencia = "O registro sai desta ficha. A escolha que o aprendeu — " + vindo.nomePoder + " (" + vindo.rotuloEtapa +
          ") — continua guardada e passa a pedir revisão na Progressão.";
      }
    }
    var certeza = await UI.confirmar({
      titulo: "Remover " + ritual.nome + "?",
      texto: consequencia,
      detalhe: "Esta ação não pode ser desfeita.",
      rotuloConfirmar: "Remover", perigo: true,
    });
    if (!certeza) return;
    /* Os vínculos DIRETOS saem junto: uma concessão apontando para um
       ritual que não existe mais seria uma pendência escondida. */
    if (E() && E().esquecerRitual && F.ehDeOrdem(ctx.ficha)) E().esquecerRitual(ctx.ficha.ordem, ritual.id);

    ctx.ficha.rituais.itens = ctx.ficha.rituais.itens.filter(function (r) { return r.id !== ritual.id; });
    ctx.alterou();
    ctx.redesenhar();
  }

  /* =================================================================
     RÓTULOS DA SEÇÃO
     -----------------------------------------------------------------
     Uma janela só, porque a configuração é UMA e vale para todos os
     registros da ficha.
     ================================================================= */

  function configurar(ctx) {
    var rituais = ctx.ficha.rituais;

    var secao = UI.campo({
      rotulo: "Nome da seção", valor: rituais.rotuloSecao, limite: 40,
      ajuda: "Rituais, Magias, Técnicas, Poderes… A aba passa a usar este nome.",
    });

    var campos = {};
    F.CAMPOS_RITUAL.forEach(function (chave) {
      campos[chave] = UI.campo({
        rotulo: F.ROTULOS_RITUAL_PADRAO[chave],
        valor: rituais.rotulos[chave],
        limite: 40,
      });
    });

    UI.modal({
      titulo: "Rótulos da seção",
      largo: true,
      conteudo: el("div.pilha", {}, [
        secao,
        el("hr.r-linha"),
        el("p.t-mini", {
          texto: "Estes nomes valem para TODOS os registros desta ficha — não existe rótulo por registro. " +
                 "Trocar um nome muda só o que aparece na tela: nada do que já foi escrito se perde.",
        }),
        el("div.editar-grade", {}, F.CAMPOS_RITUAL.map(function (c) { return campos[c]; })),
      ]),
      botoes: [
        {
          rotulo: "Voltar ao padrão", classe: "r-botao--fantasma",
          aoClicar: function (fechar) {
            rituais.rotuloSecao = "Rituais";
            rituais.rotulos = Object.assign({}, F.ROTULOS_RITUAL_PADRAO);
            ctx.alterou();
            fechar();
            ctx.redesenhar();
          },
        },
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        {
          rotulo: "Salvar", classe: "r-botao--principal",
          aoClicar: function (fechar) {
            rituais.rotuloSecao = U.aparar(secao.entrada.value, 40) || "Rituais";
            F.CAMPOS_RITUAL.forEach(function (c) {
              rituais.rotulos[c] = U.aparar(campos[c].entrada.value, 40) || F.ROTULOS_RITUAL_PADRAO[c];
            });
            ctx.alterou();
            fechar();
            /* A aba precisa se redesenhar inteira: o nome dela mudou. */
            ctx.redesenhar();
          },
        },
      ],
    });

    secao.entrada.focus();
  }

  global.RAMASecaoRituais = {
    aba: aba,
    rotulo: rotulo,
    novoRitual: novoRitual,
    camposDoRitual: camposDoRitual,
    editorDeVersoes: editorDeVersoes,
    /* v2.32: a mesma apresentação na Homebrew e na biblioteca. */
    apresentacao: apresentacao,
    marcasDoRitual: marcasDoRitual,
  };
})(window);
