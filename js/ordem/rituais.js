/* =====================================================================
   R.A.M.A. — Ordem Paranormal · catálogo de rituais
   =====================================================================
   O que se faz com os dados de js/ordem/rituais-dados.js: carregar sob
   demanda, normalizar, buscar, filtrar, descrever e transformar uma
   entrada num RITUAL DE FICHA. Sem tela: a janela "Da biblioteca" da
   aba Rituais fica em js/paginas/ficha-rituais-biblioteca.js.

   Também é aqui que mora o bloco `ordem` de um ritual da ficha
   (elemento, círculo, custo e a referência do livro) — o mesmo papel que
   js/ordem/inventario.js faz para um item.

   ---------------------------------------------------------------------
   CÓPIA, NUNCA VÍNCULO
   ---------------------------------------------------------------------

   paraFicha() devolve os dados de um ritual NOVO, com os campos e as
   versões preenchidos, e `origemCatalogoId` como rastro. A ficha guarda
   a cópia inteira: o catálogo pode mudar, ser corrigido ou nem estar
   carregado, e o ritual da ficha continua igual. O catálogo carregado é
   congelado (Object.freeze).

   ---------------------------------------------------------------------
   CUSTO ADICIONAL x CUSTO TOTAL
   ---------------------------------------------------------------------

   A forma básica custa o PE do círculo (Tabela 5.2: 1, 3, 6, 10). Uma
   forma avançada AUMENTA esse custo: "Discente (+3 PE)" de um ritual de
   2º círculo custa 3 + 3 = 6 PE no total. O catálogo guarda o
   ACRÉSCIMO, e o total é calculado — nunca somado duas vezes.

   Conjurar não acontece aqui: adicionar um ritual à ficha não gasta PE,
   não rola dado e não aplica efeito nenhum.
   ===================================================================== */

(function (global) {
  "use strict";

  function C() { return global.RAMAOrdemCatalogo; }
  function U() { return global.RAMAUtil; }

  var ARQUIVO_DADOS = "js/ordem/rituais-dados.js";
  var PRAZO_CARGA_MS = 20000;

  /* Os cinco elementos do Outro Lado (OPRPG p. 118). A ordem é a do
     livro, e é a que a biblioteca mostra. */
  var ELEMENTOS = [
    { chave: "conhecimento", nome: "Conhecimento" },
    { chave: "energia", nome: "Energia" },
    { chave: "morte", nome: "Morte" },
    { chave: "sangue", nome: "Sangue" },
    { chave: "medo", nome: "Medo" },
  ];

  var CIRCULOS = [1, 2, 3, 4];

  /* Custo em PE da forma básica, por círculo (OPRPG p. 119, Tabela 5.2).
     Vem do catálogo de regras quando ele está carregado — uma fonte só. */
  var CUSTO_PADRAO = { 1: 1, 2: 3, 3: 6, 4: 10 };

  var ROTULO_FONTE = { OPRPG: "Livro básico", SAH: "Sobrevivendo ao Horror" };
  var NOME_FONTE = { OPRPG: "Ordem Paranormal RPG", SAH: "Sobrevivendo ao Horror" };
  var SIGLA_FONTE = { OPRPG: "LB", SAH: "SAH" };

  var ROTULO_ESCOPO = { alvo: "Alvo", area: "Área", efeito: "Efeito" };

  var TIPOS_DE_ROLAGEM = { dano: "Dano", cura: "Cura", outra: "Rolagem" };

  var ROMANOS = { 1: "1º", 2: "2º", 3: "3º", 4: "4º" };

  /* =================================================================
     UTILITÁRIOS
     ================================================================= */

  function normalizarTexto(texto) {
    return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function custoDoCirculo(circulo) {
    var tabela = (C() && C().CUSTO_RITUAL) || CUSTO_PADRAO;
    return tabela[circulo] || 0;
  }

  function nomeDoElemento(chave) {
    var e = ELEMENTOS.filter(function (x) { return x.chave === chave; })[0];
    return e ? e.nome : String(chave || "");
  }

  function rotuloCirculo(circulo) {
    return (ROMANOS[circulo] || String(circulo)) + " círculo";
  }

  function congelar(obj) {
    if (!obj || typeof obj !== "object" || Object.isFrozen(obj)) return obj;
    Object.keys(obj).forEach(function (k) { congelar(obj[k]); });
    return Object.freeze(obj);
  }

  function copia(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

  /* =================================================================
     NORMALIZAÇÃO DO CATÁLOGO
     ================================================================= */

  function escopoDaEntrada(e) {
    if (e.alvo) return { tipo: "alvo", rotulo: ROTULO_ESCOPO.alvo, texto: e.alvo };
    if (e.area) return { tipo: "area", rotulo: ROTULO_ESCOPO.area, texto: e.area };
    if (e.efeito) return { tipo: "efeito", rotulo: ROTULO_ESCOPO.efeito, texto: e.efeito };
    return null;
  }

  /* As versões de uma entrada, sempre com a Normal na frente e com o
     custo TOTAL calculado a partir do círculo. */
  function normalizarVersoes(e) {
    var base = custoDoCirculo(e.circulo);
    var brutas = Array.isArray(e.versoes) ? e.versoes.slice() : [];
    var normal = brutas.filter(function (v) { return normalizarTexto(v.nome) === "normal"; })[0] || { nome: "Normal" };
    var avancadas = brutas.filter(function (v) { return normalizarTexto(v.nome) !== "normal"; });

    return [normal].concat(avancadas).map(function (v, i) {
      var adicional = i === 0 ? 0 : Math.max(0, Number(v.custo) || 0);
      return {
        nome: v.nome || (i === 0 ? "Normal" : "Versão"),
        basica: i === 0,
        custo: adicional,
        custoTotal: base + adicional,
        requisito: v.requisito || "",
        alteracoes: v.alteracoes || "",
        dano: v.dano || "",
        danoExtra: v.danoExtra || "",
        rolagens: (Array.isArray(v.rolagens) ? v.rolagens : []).map(function (r) {
          return {
            tipo: TIPOS_DE_ROLAGEM[r.tipo] ? r.tipo : "outra",
            rotulo: r.rotulo || TIPOS_DE_ROLAGEM[r.tipo] || "Rolagem",
            expressao: r.expressao || "",
            extra: r.extra || "",
          };
        }),
      };
    });
  }

  function normalizarEntrada(bruto) {
    var e = copia(bruto);
    e.elementos = (Array.isArray(e.elemento) ? e.elemento : [e.elemento]).filter(Boolean);
    e.elemento = e.elementos[0] || "";
    e.circulo = Math.max(1, Math.min(4, Number(e.circulo) || 1));
    e.custo = custoDoCirculo(e.circulo);
    e.efeitos = Array.isArray(e.efeitos) ? e.efeitos : [];
    e.notas = Array.isArray(e.notas) ? e.notas : [];
    e.alias = Array.isArray(e.alias) ? e.alias : [];
    e.escopo = escopoDaEntrada(e);
    e.versoes = normalizarVersoes(e);
    e.nomesDosElementos = e.elementos.map(nomeDoElemento);
    e.classificacao = rotuloCirculo(e.circulo) + " · " + e.nomesDosElementos.join(", ");
    e.chaveBusca = normalizarTexto([e.nome].concat(e.alias).join(" | "));
    return e;
  }

  function normalizarCatalogo(dados) {
    var rituais = (dados && Array.isArray(dados.rituais) ? dados.rituais : []).map(normalizarEntrada);
    var porId = {};
    rituais.forEach(function (e) { porId[e.id] = e; });
    return congelar({ versao: dados && dados.versao, rituais: rituais, porId: porId });
  }

  /* =================================================================
     CARGA SOB DEMANDA
     -----------------------------------------------------------------
     O catálogo não vem com a página: entra na primeira vez que alguém
     abre a biblioteca. Uma falha de rede não fica guardada.
     ================================================================= */

  var pronto = null;
  var emCarga = null;

  function carregar() {
    if (pronto) return Promise.resolve(pronto);
    if (global.RAMAOrdemRituaisDados) {
      pronto = normalizarCatalogo(global.RAMAOrdemRituaisDados);
      return Promise.resolve(pronto);
    }
    if (emCarga) return emCarga;
    if (typeof document === "undefined" || !document.createElement) {
      return Promise.reject(new Error("sem_documento"));
    }

    emCarga = new Promise(function (ok, falha) {
      var script = document.createElement("script");
      var prazo = null;
      function terminar(erro) {
        clearTimeout(prazo);
        script.onload = script.onerror = null;
        if (erro) {
          if (script.parentNode) script.parentNode.removeChild(script);
          falha(erro);
          return;
        }
        if (!global.RAMAOrdemRituaisDados) { falha(new Error("vazio")); return; }
        pronto = normalizarCatalogo(global.RAMAOrdemRituaisDados);
        ok(pronto);
      }
      script.src = U() && U().url ? U().url(ARQUIVO_DADOS) : ARQUIVO_DADOS;
      script.async = true;
      script.onload = function () { terminar(null); };
      script.onerror = function () { terminar(new Error("rede")); };
      prazo = setTimeout(function () { terminar(new Error("prazo")); }, PRAZO_CARGA_MS);
      (document.head || document.body || document.documentElement).appendChild(script);
    });

    emCarga.then(null, function () { emCarga = null; });
    return emCarga.then(function (c) { emCarga = null; return c; });
  }

  function catalogoPronto() { return pronto; }

  /* =================================================================
     BUSCA E FILTROS
     ================================================================= */

  /* filtros: { busca, elemento, circulo, fonte } — cada um vazio quer
     dizer "todos", e eles se combinam. */
  function filtrar(catalogo, filtros) {
    var f = filtros || {};
    var termo = normalizarTexto(f.busca);
    var circulo = f.circulo === "" || f.circulo === undefined || f.circulo === null ? null : Number(f.circulo);
    return (catalogo ? catalogo.rituais : []).filter(function (e) {
      if (termo && e.chaveBusca.indexOf(termo) < 0) return false;
      if (f.elemento && e.elementos.indexOf(f.elemento) < 0) return false;
      if (circulo && e.circulo !== circulo) return false;
      if (f.fonte && e.fonte !== f.fonte) return false;
      return true;
    });
  }

  /* Quantos resultados cada valor de um filtro teria, com os OUTROS
     filtros aplicados — é o que deixa a contagem do chip honesta. */
  function contagens(catalogo, filtros) {
    var f = filtros || {};
    var semElemento = filtrar(catalogo, { busca: f.busca, circulo: f.circulo, fonte: f.fonte });
    var semCirculo = filtrar(catalogo, { busca: f.busca, elemento: f.elemento, fonte: f.fonte });
    var semFonte = filtrar(catalogo, { busca: f.busca, elemento: f.elemento, circulo: f.circulo });

    var elementos = {};
    ELEMENTOS.forEach(function (el) {
      elementos[el.chave] = semElemento.filter(function (e) { return e.elementos.indexOf(el.chave) >= 0; }).length;
    });
    var circulos = {};
    CIRCULOS.forEach(function (n) {
      circulos[n] = semCirculo.filter(function (e) { return e.circulo === n; }).length;
    });
    var fontes = {};
    Object.keys(ROTULO_FONTE).forEach(function (k) {
      fontes[k] = semFonte.filter(function (e) { return e.fonte === k; }).length;
    });

    return {
      elementos: elementos, circulos: circulos, fontes: fontes,
      todosElementos: semElemento.length,
      todosCirculos: semCirculo.length,
      todasFontes: semFonte.length,
      total: filtrar(catalogo, f).length,
    };
  }

  /* As fontes que o catálogo carregado realmente tem — o filtro de livro
     só aparece quando há mais de uma. */
  function fontesDoCatalogo(catalogo) {
    var vistas = {};
    (catalogo ? catalogo.rituais : []).forEach(function (e) { vistas[e.fonte] = true; });
    return Object.keys(vistas);
  }

  function ordenarPorNome(a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); }

  /* Agrupado por círculo, e dentro dele em ordem alfabética: é como o
     livro organiza a lista de rituais. */
  function porCirculo(entradas) {
    return CIRCULOS.map(function (n) {
      return {
        circulo: n,
        titulo: rotuloCirculo(n),
        custo: custoDoCirculo(n),
        entradas: entradas.filter(function (e) { return e.circulo === n; }).sort(ordenarPorNome),
      };
    }).filter(function (g) { return g.entradas.length; });
  }

  /* =================================================================
     APRESENTAÇÃO
     ================================================================= */

  /* O que cabe na linha fechada: nada vazio, e nada repetido — círculo
     e elemento já estão na linha de classificação, acima. */
  function resumoCompacto(e) {
    var pares = [["Custo", e.custo + " PE"]];
    if (e.execucao) pares.push(["Execução", e.execucao]);
    if (e.alcance) pares.push(["Alcance", e.alcance]);
    if (e.duracao) pares.push(["Duração", e.duracao]);
    return pares;
  }

  /* Pares [rótulo, valor] dos detalhes. Só o que existe. */
  function detalhes(e) {
    var p = [];
    function par(r, v) { if (v !== null && v !== undefined && v !== "") p.push([r, String(v)]); }
    par("Elemento", e.nomesDosElementos.join(", "));
    par("Círculo", rotuloCirculo(e.circulo));
    par("Custo", e.custo + " PE (forma básica)");
    par("Execução", e.execucao);
    par("Alcance", e.alcance);
    if (e.escopo) par(e.escopo.rotulo, e.escopo.texto);
    par("Duração", e.duracao);
    par("Resistência", e.resistencia);
    par("Fonte", referencia(e));
    return p;
  }

  function referencia(e) {
    return (NOME_FONTE[e.fonte] || e.fonte) + ", p. " + e.pagina;
  }

  /* Regras que acompanham o tipo de ritual — escritas uma vez aqui, e
     não repetidas em cada entrada do arquivo de dados. */
  function regrasGerais(e) {
    var r = [];
    r.push("Conjurar exige a ação indicada, " + e.custo + " PE, uma mão livre e gesticular; o limite de PE por turno vale para o custo total (OPRPG p. 119).");
    if (e.elemento === "medo") {
      r.push("Rituais de Medo não pedem componentes, mas só Marcados os conjuram. Cada conjuração custa dano mental igual ao custo em PE e 1 ponto de Sanidade permanente — 2 na forma discente, 3 na verdadeira (OPRPG p. 121).");
      r.push("Não existe afinidade com Medo, então ela nunca é pré-requisito aqui.");
    } else {
      r.push("Exige componentes ritualísticos do elemento, e o Custo do Paranormal: Ocultismo contra DT 20 + o custo em PE; falhando, dano mental igual ao custo, e por 5 ou mais também 1 ponto de Sanidade permanente (OPRPG p. 121).");
    }
    if (e.versoes.length > 1) {
      r.push("Só uma forma avançada por conjuração, e o que a linha dela não menciona continua igual (OPRPG p. 121).");
    }
    if (e.resistencia) {
      r.push("A DT da resistência é 10 + nível de exposição + Presença do conjurador (OPRPG p. 121).");
    }
    return r;
  }

  /* O que a entrada exige de quem conjura. */
  function requisitos(e) {
    var r = [];
    r.push("Conjurar " + rotuloCirculo(e.circulo) + " (aprender rituais vem do poder Aprender Ritual ou das habilidades de ocultista).");
    e.versoes.forEach(function (v) {
      if (!v.basica && v.requisito) r.push(v.nome + ": requer " + v.requisito + ".");
    });
    if (e.escolha && e.escolha.tipo === "elemento") {
      r.push("O elemento é escolhido ao aprender o ritual e não muda depois.");
    }
    return r;
  }

  /* O que a ficha faz com o ritual — dito com honestidade. */
  function naFicha(e) {
    var partes = ["Os campos do ritual e as versões entram preenchidos."];
    var temRolagem = e.versoes.some(function (v) { return v.dano || v.rolagens.length; });
    if (temRolagem) partes.push("As versões com expressão de dados ganham botão de rolagem, pelo mesmo motor de dados da ficha.");
    else partes.push("Este ritual não tem expressão de dados: nenhum botão de rolagem é inventado para ele.");
    partes.push("O custo em PE é mostrado (básico e total de cada versão), mas conjurar é da mesa: a ficha não gasta PE, não aplica condição e não faz teste de resistência.");
    return {
      automacao: temRolagem ? "parcial" : "texto",
      texto: partes.join(" "),
    };
  }

  /* Quantas cópias de uma entrada já estão na ficha (pelo rastro). */
  function quantasNaFicha(e, rituais) {
    return (rituais || []).filter(function (r) { return r && r.origemCatalogoId === e.id; }).length;
  }

  /* =================================================================
     A FICHA OLHANDO O RITUAL
     -----------------------------------------------------------------
     Avisos, nunca bloqueios: a mesa decide. Nada aqui muda NEX,
     afinidade, nível ou escolha de progressão.
     ================================================================= */

  function conferencias(e, ordem) {
    var avisos = [];
    var R = global.RAMAOrdemRegras;
    if (!R || !ordem) return avisos;

    var rit = R.rituais(ordem);
    if (!rit.circuloMaximo) {
      avisos.push("Nesta ficha, a classe não conjura rituais por NEX. Registrar o ritual não muda isso — aprender vem de uma escolha de progressão, como o poder Aprender Ritual.");
    } else if (e.circulo > rit.circuloMaximo) {
      avisos.push("Nesta ficha, o círculo máximo é o " + ROMANOS[rit.circuloMaximo] + " (NEX " + ordem.nex + "%): este ritual é de " + rotuloCirculo(e.circulo) + ".");
    }

    var limitePe = R.limiteDeEsforco ? R.limiteDeEsforco(ordem).total : 0;
    if (limitePe) {
      var caras = e.versoes.filter(function (v) { return v.custoTotal > limitePe; });
      if (caras.length) {
        avisos.push("O limite de PE por turno desta ficha é " + limitePe + ": " +
          caras.map(function (v) { return v.nome + " (" + v.custoTotal + " PE)"; }).join(", ") +
          " ficaria fora do alcance.");
      }
    }

    var afinidade = ordem.afinidade && ordem.afinidade.elemento;
    var exigemAfinidade = e.versoes.filter(function (v) { return /afinidade/i.test(v.requisito); });
    if (exigemAfinidade.length && e.elemento !== "medo") {
      if (!afinidade) {
        avisos.push("Formas avançadas deste ritual pedem afinidade, e esta ficha ainda não tem afinidade elemental.");
      } else if (e.elementos.indexOf(afinidade) < 0) {
        avisos.push("A afinidade desta ficha é " + nomeDoElemento(afinidade) + "; as formas que pedem afinidade com " + e.nomesDosElementos.join(" ou ") + " não se aplicam.");
      }
    }

    if (e.elemento === "medo") {
      avisos.push("Ritual de Medo: cada conjuração custa Sanidade permanente (1, 2 na discente, 3 na verdadeira) e dano mental igual ao custo em PE.");
    }
    return avisos;
  }

  /* O que muda num ritual por causa de ONDE ele está guardado. O
     grimório de Graduado não é uma pasta com outro nome: conjurar de lá
     tem condição própria (OPRPG p.35). */
  function condicoesDoDestino(destino) {
    var A = global.RAMAOrdemAprendizado;
    if (!A || destino !== A.DESTINOS.grimorio.chave) return [];
    return [
      "Está no grimório: para conjurar, é preciso empunhá-lo e gastar uma ação completa folheando para relembrar o ritual.",
      "O grimório ocupa 1 espaço no inventário. Perdido, é replicado com duas ações de interlúdio.",
    ];
  }

  /* A DT de resistência dos rituais desta ficha — informação, não
     automação: 10 + nível de exposição + Presença (OPRPG p. 121). O
     "nível de exposição" é o mesmo degrau de progressão que o motor já
     usa em PV, PE e limite de esforço. */
  function dtDeResistencia(ordem) {
    var R = global.RAMAOrdemRegras;
    if (!R || !ordem || !R.trilho) return null;
    var t = R.trilho(ordem);
    if (!t || !t.passos) return null;
    var presenca = R.atributo(ordem, "pre");
    /* Habilidades que sobem a DT de todos os rituais — hoje só Rituais
       Eficientes, de Graduado (OPRPG p.35). Vem da progressão, não de
       uma segunda tabela aqui. */
    var extra = (R.rituais ? (R.rituais(ordem).dtExtra || null) : null) || { total: 0, partes: [] };
    return {
      total: 10 + t.passos + presenca + extra.total,
      nivel: t.passos,
      rotulo: t.rotulo,
      presenca: presenca,
      extra: extra.total,
      partesExtra: extra.partes,
    };
  }

  /* =================================================================
     ESCOLHA AO ADICIONAR
     ================================================================= */

  function opcoesDaEscolha(escolha) {
    if (!escolha) return [];
    if (escolha.tipo === "elemento") {
      var lista = Array.isArray(escolha.opcoes) && escolha.opcoes.length
        ? escolha.opcoes
        : ELEMENTOS.map(function (e) { return e.chave; });
      return lista.map(function (k) { return { valor: k, rotulo: nomeDoElemento(k) }; });
    }
    return [];
  }

  function validarEscolha(escolha, valor) {
    if (!escolha) return { ok: true, valor: null, rotulo: "" };
    var bruto = valor === undefined || valor === null ? "" : String(valor).trim();
    if (!bruto) return { ok: false, mensagem: "Escolha: " + String(escolha.rotulo || "opção").toLowerCase() + "." };
    var opcao = opcoesDaEscolha(escolha).filter(function (o) { return o.valor === bruto; })[0];
    if (!opcao) return { ok: false, mensagem: (escolha.rotulo || "Escolha") + ": opção inválida." };
    return { ok: true, valor: opcao.valor, rotulo: opcao.rotulo };
  }

  /* =================================================================
     ENTRADA → RITUAL DA FICHA
     -----------------------------------------------------------------
     Devolve { ok, dados } para RAMAFicha.criarRitual(dados), ou
     { ok:false, mensagem }. Não toca na ficha: quem chama insere.
     ================================================================= */

  function paraFicha(e, opcoes) {
    var o = opcoes || {};
    if (!e) return { ok: false, mensagem: "Ritual desconhecido." };

    var escolhida = validarEscolha(e.escolha, o.escolha);
    if (!escolhida.ok) return { ok: false, mensagem: escolhida.mensagem };

    var elemento = escolhida.valor || e.elemento;
    var dados = {
      nome: e.nome,
      circulo: rotuloCirculo(e.circulo),
      elemento: nomeDoElemento(elemento),
      execucao: e.execucao || "",
      alcance: e.alcance || "",
      alvo: e.alvo || "",
      area: e.area || "",
      efeito: e.efeito || "",
      duracao: e.duracao || "",
      resistencia: e.resistencia || "",
      descricao: descricaoDaInstancia(e, escolhida),
      origemCatalogoId: e.id,
      ordem: {
        elemento: elemento,
        circulo: e.circulo,
        custo: e.custo,
        referencia: { fonte: e.fonte, pagina: e.pagina },
      },
      versoes: e.versoes.map(function (v) {
        var versao = { nome: v.nome, dano: v.dano, danoExtra: v.danoExtra };
        if (!v.basica && v.custo) versao.custo = v.custo;
        if (v.requisito) versao.requisito = v.requisito;
        if (v.alteracoes) versao.alteracoes = v.alteracoes;
        if (v.rolagens.length) {
          versao.rolagens = v.rolagens.map(function (r) {
            return { tipo: r.tipo, rotulo: r.rotulo, expressao: r.expressao, extra: r.extra };
          });
        }
        return versao;
      }),
    };

    return { ok: true, dados: dados };
  }

  /* A descrição que vai junto com a cópia: resumo, efeitos, versões,
     regras e a fonte. Redação própria, dentro do limite do campo. */
  function descricaoDaInstancia(e, escolhida) {
    var partes = [e.resumo];
    if (escolhida && escolhida.rotulo && e.escolha) partes.push(e.escolha.rotulo + ": " + escolhida.rotulo + ".");
    if (e.efeitos.length) partes.push(e.efeitos.map(function (x) { return "• " + x; }).join("\n"));

    var avancadas = e.versoes.filter(function (v) { return !v.basica; });
    if (avancadas.length) {
      partes.push(avancadas.map(function (v) {
        return "• " + v.nome + " (+" + v.custo + " PE, total " + v.custoTotal + " PE)" +
          (v.requisito ? " — requer " + v.requisito : "") + ": " + (v.alteracoes || "veja o livro") ;
      }).join("\n"));
    }

    var regras = regrasGerais(e);
    if (regras.length) partes.push(regras.map(function (x) { return "• " + x; }).join("\n"));
    if (e.notas.length) partes.push(e.notas.map(function (x) { return "Nota: " + x; }).join("\n"));
    partes.push("Fonte: " + referencia(e) + ".");

    var texto = partes.filter(Boolean).join("\n\n");
    return texto.length <= 8000 ? texto : texto.slice(0, 8000);
  }

  /* =================================================================
     O BLOCO `ordem` DE UM RITUAL DA FICHA
     -----------------------------------------------------------------
     Só os campos que as regras leem como número: elemento, círculo,
     custo em PE da forma básica e a referência do livro. O resto do
     ritual é texto, igual numa ficha universal.
     ================================================================= */

  var FONTES = ["OPRPG", "SAH"];

  function normalizarDados(bruto) {
    if (!bruto || typeof bruto !== "object") return null;
    var saida = {};

    var elemento = String(bruto.elemento || "");
    if (ELEMENTOS.some(function (e) { return e.chave === elemento; })) saida.elemento = elemento;

    var circulo = Math.round(Number(bruto.circulo));
    if (circulo >= 1 && circulo <= 4) saida.circulo = circulo;

    var custo = Math.round(Number(bruto.custo));
    if (Number.isFinite(custo) && custo >= 0 && custo <= 999) saida.custo = custo;

    if (bruto.referencia && typeof bruto.referencia === "object") {
      var fonte = String(bruto.referencia.fonte || "");
      var pagina = Math.round(Number(bruto.referencia.pagina));
      if (FONTES.indexOf(fonte) >= 0 && pagina > 0 && pagina < 2000) {
        saida.referencia = { fonte: fonte, pagina: pagina };
      }
    }

    return Object.keys(saida).length ? saida : null;
  }

  /* Os dados de Ordem de um ritual qualquer, com o custo derivado do
     círculo quando ele não vem gravado. */
  function dadosDoRitual(ritual) {
    var d = (ritual && ritual.ordem && typeof ritual.ordem === "object") ? normalizarDados(ritual.ordem) : null;
    var saida = d || {};
    if (saida.circulo && saida.custo === undefined) saida.custo = custoDoCirculo(saida.circulo);
    return saida;
  }

  /* O custo total de uma versão: o da forma básica mais o acréscimo
     dela. Nunca soma o básico duas vezes. */
  function custoDaVersao(ritual, versao) {
    var d = dadosDoRitual(ritual);
    var base = d.custo !== undefined ? d.custo : (d.circulo ? custoDoCirculo(d.circulo) : null);
    if (base === null || base === undefined) return null;
    var adicional = versao && versao.custo ? Math.max(0, Math.round(Number(versao.custo) || 0)) : 0;
    return { base: base, adicional: adicional, total: base + adicional };
  }

  global.RAMAOrdemRituais = {
    ELEMENTOS: ELEMENTOS,
    CIRCULOS: CIRCULOS,
    ROTULO_FONTE: ROTULO_FONTE,
    NOME_FONTE: NOME_FONTE,
    SIGLA_FONTE: SIGLA_FONTE,
    TIPOS_DE_ROLAGEM: TIPOS_DE_ROLAGEM,

    carregar: carregar,
    catalogoPronto: catalogoPronto,
    normalizarCatalogo: normalizarCatalogo,
    normalizarTexto: normalizarTexto,

    filtrar: filtrar,
    contagens: contagens,
    fontesDoCatalogo: fontesDoCatalogo,
    porCirculo: porCirculo,

    resumoCompacto: resumoCompacto,
    detalhes: detalhes,
    regrasGerais: regrasGerais,
    requisitos: requisitos,
    naFicha: naFicha,
    referencia: referencia,
    rotuloCirculo: rotuloCirculo,
    nomeDoElemento: nomeDoElemento,
    custoDoCirculo: custoDoCirculo,
    quantasNaFicha: quantasNaFicha,

    conferencias: conferencias,
    condicoesDoDestino: condicoesDoDestino,
    dtDeResistencia: dtDeResistencia,

    opcoesDaEscolha: opcoesDaEscolha,
    validarEscolha: validarEscolha,
    paraFicha: paraFicha,

    normalizarDados: normalizarDados,
    dadosDoRitual: dadosDoRitual,
    custoDaVersao: custoDaVersao,

    /* Só para os testes: esquece o que foi carregado. */
    _esquecer: function () { pronto = null; emCarga = null; },
  };
})(typeof window !== "undefined" ? window : globalThis);
