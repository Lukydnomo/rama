/* =====================================================================
   R.A.M.A. — Ordem Paranormal · progressão e escolhas
   =====================================================================
   Transforma o que a classe CONCEDE em cada etapa nas decisões que
   quem joga precisa tomar, e as decisões tomadas nos EFEITOS que elas
   produzem.

   ---------------------------------------------------------------------
   O MODELO
   ---------------------------------------------------------------------

   VAGA        uma decisão que a progressão abre. Tem um id ESTÁVEL que
               diz de onde ela veio, nunca o texto mostrado:

                 d3.poderClasse        3º degrau, poder de classe
                 d10.atributo          10º degrau, aumento de atributo
                 d10.versatilidade     10º degrau, versatilidade
                 d2.trilha             a escolha da trilha
                 b.aFavorita           a opção interna de uma
                                       habilidade automática
                 b.origem.engenheiro   a opção interna de um poder
                                       de origem
                 x25.transcender       NEX de exposição 25%, só com
                                       NEX & Experiência
                 afinidade             a afinidade elemental

               "Degrau" é o passo de progressão: NEX 5% é o 1º, NEX 99%
               é o 20º — ou, com NEX & Experiência, o nível. Por isso o
               id não fala em NEX: ligar e desligar a regra não
               renomeia nenhuma escolha.

   REGISTRO    uma decisão tomada, guardada em `ordem.escolhas`:

                 { id, etapa, tipo, valor, opcoes, nome,
                   ignorarRequisitos, registradoEm }

               `etapa` é o id da vaga. `valor` é a chave do que foi
               escolhido. `opcoes` guarda as decisões internas.
               `nome` é só um retrato do rótulo, para a ficha continuar
               legível se uma entrada do catálogo mudar de nome.

   ESTADO      o que sai da conta: atributos e graus efetivos, poderes
               adquiridos, efeitos para a camada de cálculo, pendências
               e problemas. É uma função PURA do que está gravado.

   ---------------------------------------------------------------------
   POR QUE NADA DISSO É GRAVADO NA FICHA
   ---------------------------------------------------------------------

   O aumento de atributo NÃO soma 1 em `ordem.atributos`. O Grau de
   Treinamento NÃO troca "treinado" por "veterano" em `ordem.pericias`.
   Os dois campos continuam guardando o que foi escolhido na CRIAÇÃO (e
   o que a mesa ajustou à mão); o que as escolhas de progressão fazem é
   recalculado toda vez, na ordem das etapas.

   É isso que garante as três promessas desta camada:

     · recarregar ou recalcular nunca concede de novo o mesmo
       benefício, porque não há nada acumulado para acumular outra vez;
     · trocar uma escolha tira SÓ o que ela dava, porque o que ela dava
       nunca foi misturado com o resto;
     · resolver uma etapa não quita outra parecida, porque cada
       registro aponta para uma vaga só.

   ---------------------------------------------------------------------
   REQUISITO É CONFERIDO NA ETAPA
   ---------------------------------------------------------------------

   Um poder escolhido em NEX 15% é conferido contra o personagem de NEX
   15% — atributos, perícias e poderes que ele tinha ali. Uma escolha
   que deixou de cumprir o requisito (a mesa mudou um atributo, uma
   escolha anterior foi trocada) NÃO é apagada: fica marcada, com o
   motivo, e os efeitos dela ficam suspensos até alguém decidir. A
   mesa pode mantê-la mesmo assim.
   ===================================================================== */

(function (global) {
  "use strict";

  var C = global.RAMAOrdemCatalogo;
  var P = global.RAMAOrdemPoderes;

  /* As outras camadas são lidas na hora da chamada, não na carga do
     arquivo: regras.js carrega depois deste e é quem decide o trilho. */
  function R() { return global.RAMAOrdemRegras; }
  function OP() { return global.RAMAOrdemOpcionais; }

  var GRAUS = ["destreinado", "treinado", "veterano", "expert"];
  /* OPRPG p.26: veterano a partir de NEX 35%, expert a partir de 70%. */
  var NEX_DO_GRAU = [0, 0, 35, 70];

  var ELEMENTOS_PODER = ["conhecimento", "energia", "morte", "sangue"];
  var PROFUNDIDADE_MAXIMA = 4;

  /* =================================================================
     TIPOS DE VAGA
     ================================================================= */

  var TIPOS = {
    trilha: {
      rotulo: "Trilha", verbo: "Escolher trilha",
      explicacao: "Escolha uma trilha da sua classe. Os poderes dela chegam sozinhos nas etapas seguintes.",
    },
    poderClasse: {
      rotulo: "Poder de classe", verbo: "Escolher poder",
      explicacao: "Escolha um poder da sua classe — ou, pelo Sobrevivendo ao Horror, um poder geral.",
    },
    atributo: {
      rotulo: "Aumento de atributo", verbo: "Escolher atributo",
      explicacao: "Aumente um atributo em +1. Esse aumento não passa de 5.",
    },
    grauTreinamento: {
      rotulo: "Grau de treinamento", verbo: "Escolher perícias",
      explicacao: "Suba um grau em perícias em que você já é treinado.",
    },
    versatilidade: {
      rotulo: "Versatilidade", verbo: "Resolver",
      explicacao: "Escolha entre um poder de classe e o primeiro poder de outra trilha da sua classe.",
    },
    perito: {
      rotulo: "Perito", verbo: "Escolher perícias",
      explicacao: "Escolha duas perícias treinadas (exceto Luta e Pontaria) para usar com Perito.",
    },
    opcoesBeneficio: {
      rotulo: "Opção de habilidade", verbo: "Completar",
      explicacao: "Esta habilidade chegou sozinha, mas só fica completa depois desta decisão.",
    },
    poderOrigem: {
      rotulo: "Opção do poder de origem", verbo: "Completar",
      explicacao: "O poder da sua origem pede uma decisão para ficar completo.",
    },
    transcenderExposicao: {
      rotulo: "Transcender", verbo: "Resolver",
      explicacao: "Com NEX & Experiência, este valor de NEX permite transcender e receber um poder paranormal. É uma oportunidade: dá para recusar.",
    },
    alteracao: {
      rotulo: "Alteração por NEX", verbo: "Escolher",
      explicacao: "Com NEX & Experiência, a exposição muda o personagem. Esta alteração tem uma escolha.",
    },
    afinidade: {
      rotulo: "Afinidade elemental", verbo: "Escolher elemento",
      explicacao: "Com NEX 50% você se conecta a um elemento. A afinidade em si vem na próxima vez que transcender.",
    },
  };

  /* A posição de cada tipo dentro do mesmo degrau. Aumento de atributo
     vem antes de Versatilidade para um poder escolhido ali já enxergar
     o atributo aumentado. */
  var POSICAO = {
    poderOrigem: 1, trilha: 5, trilhaAuto: 10, opcoesBeneficio: 11, perito: 15,
    poderClasse: 20, atributo: 30, grauTreinamento: 40, versatilidade: 50,
  };

  function degrauDoNex(nex) {
    var n = Number(nex) || 0;
    if (n >= 99) return 20;
    return Math.max(0, Math.round(n / 5));
  }

  function nexDoDegrau(d) {
    return d >= 20 ? 99 : d * 5;
  }

  /* O degrau de EXPOSIÇÃO: "+1 PE por NEX" em poder paranormal conta
     degraus de 5% do NEX de exposição. NEX 99% vale 20, como no trilho
     padrão; fora dele, arredonda para baixo — 7% ainda é 1. */
  function degrauDeExposicao(nex) {
    var n = Number(nex) || 0;
    if (n >= 99) return 20;
    return Math.max(0, Math.floor(n / 5));
  }

  function rotuloDoDegrau(d, separado) {
    return separado ? "Nível " + d : "NEX " + nexDoDegrau(d) + "%";
  }

  /* =================================================================
     VAGAS
     ================================================================= */

  function vaga(id, tipo, extra) {
    var info = TIPOS[tipo] || { rotulo: tipo, verbo: "Resolver", explicacao: "" };
    return Object.assign({
      id: id,
      tipo: tipo,
      degrau: 0,
      ordem: 0,
      rotulo: info.rotulo,
      verbo: info.verbo,
      explicacao: info.explicacao,
      rotuloEtapa: "",
      opcional: false,
      beneficio: "",
      origem: "",
      nexExposicao: 0,
    }, extra || {});
  }

  function vagas(ordem) {
    var lista = [];
    if (!ordem) return lista;

    var t = R().trilho(ordem);
    var exposicao = R().exposicao(ordem);
    var classe = C.classe(ordem.classe);

    if (classe) {
      C.progressaoDaClasse(classe.chave).forEach(function (etapa) {
        var d = degrauDoNex(etapa.nex);
        if (d > t.passos) return;
        (etapa.escolhas || []).forEach(function (tipo) {
          lista.push(vaga("d" + d + "." + tipo, tipo, {
            degrau: d,
            ordem: d * 100 + (POSICAO[tipo] || 60),
            rotuloEtapa: rotuloDoDegrau(d, t.separado),
          }));
        });
      });

      var trilha = C.trilha(ordem.trilha);
      if (trilha && trilha.classe === classe.chave) {
        P.habilidadesDaTrilha(trilha.chave).forEach(function (h) {
          var d = degrauDoNex(h.nex);
          if (d > t.passos || !h.opcoes.length) return;
          lista.push(vaga("b." + h.chave, "opcoesBeneficio", {
            degrau: d,
            ordem: d * 100 + POSICAO.opcoesBeneficio,
            rotulo: h.nome,
            explicacao: h.resumo,
            beneficio: h.chave,
            rotuloEtapa: rotuloDoDegrau(d, t.separado),
          }));
        });
      }
    }

    var origem = C.origem(ordem.origem);
    if (origem && origem.escolha) {
      lista.push(vaga("b.origem." + origem.chave, "poderOrigem", {
        degrau: 1,
        ordem: 100 + POSICAO.poderOrigem,
        rotulo: origem.poder,
        explicacao: origem.resumo,
        origem: origem.chave,
        rotuloEtapa: "Origem",
      }));
    }

    /* Com NEX & Experiência, a exposição abre as próprias vagas. */
    if (t.separado) {
      P.ALTERACOES_GERAIS.forEach(function (a) {
        if (exposicao < a.nex) return;
        lista.push(vaga("x" + a.nex + ".alteracao", "alteracao", {
          degrau: a.nex / 5,
          ordem: (a.nex / 5) * 100 + 58,
          rotulo: a.nome,
          explicacao: a.resumo,
          beneficio: a.chave,
          nexExposicao: a.nex,
          rotuloEtapa: "NEX de exposição " + a.nex + "%",
        }));
      });
      P.NEX_DE_ALTERACAO.forEach(function (n) {
        if (exposicao < n) return;
        lista.push(vaga("x" + n + ".transcender", "transcenderExposicao", {
          degrau: n / 5,
          ordem: (n / 5) * 100 + 59,
          opcional: true,
          nexExposicao: n,
          rotuloEtapa: "NEX de exposição " + n + "%",
        }));
      });
    }

    /* A afinidade olha o NEX de EXPOSIÇÃO nos dois modos: com a regra
       separada, "o NEX continua sendo usado para afinidade elemental"
       (SAH p.98). */
    if (exposicao >= 50) {
      lista.push(vaga("afinidade", "afinidade", {
        degrau: 10,
        ordem: 100000,
        rotuloEtapa: "NEX " + (t.separado ? "de exposição " : "") + "50%",
      }));
    }

    return lista.sort(function (a, b) { return a.ordem - b.ordem; });
  }

  /* =================================================================
     REGISTROS
     ================================================================= */

  function uuid() {
    return global.RAMAUtil ? global.RAMAUtil.uuid() : ("e" + Math.random().toString(36).slice(2));
  }

  function agora() {
    return new Date().toISOString();
  }

  /* Limpa o que veio de fora: só textos, listas e objetos rasos, com
     tamanho e profundidade limitados. Nada que não seja dado sobrevive. */
  function limparOpcoes(valor, profundidade) {
    var prof = profundidade || 0;
    if (prof > PROFUNDIDADE_MAXIMA) return undefined;
    if (valor === null || valor === undefined) return undefined;
    if (typeof valor === "string") return valor.slice(0, 120);
    if (typeof valor === "number" && Number.isFinite(valor)) return valor;
    if (typeof valor === "boolean") return valor;
    if (Array.isArray(valor)) {
      return valor.slice(0, 24).map(function (v) { return limparOpcoes(v, prof + 1); })
        .filter(function (v) { return v !== undefined; });
    }
    if (typeof valor === "object") {
      var saida = {};
      Object.keys(valor).slice(0, 12).forEach(function (k) {
        if (!/^[A-Za-z0-9_]{1,40}$/.test(k)) return;
        var v = limparOpcoes(valor[k], prof + 1);
        if (v !== undefined) saida[k] = v;
      });
      return saida;
    }
    return undefined;
  }

  function normalizarRegistro(bruto) {
    if (!bruto || typeof bruto !== "object") return null;
    var etapa = String(bruto.etapa || "");
    if (!/^[A-Za-z0-9.]{1,60}$/.test(etapa)) return null;
    return {
      id: String(bruto.id || uuid()).slice(0, 60),
      etapa: etapa,
      tipo: String(bruto.tipo || "").slice(0, 40),
      valor: bruto.valor === undefined || bruto.valor === null ? "" : String(bruto.valor).slice(0, 80),
      opcoes: limparOpcoes(bruto.opcoes) || {},
      nome: String(bruto.nome || "").slice(0, 160),
      ignorarRequisitos: bruto.ignorarRequisitos === true,
      registradoEm: typeof bruto.registradoEm === "string" ? bruto.registradoEm.slice(0, 40) : "",
    };
  }

  function normalizarEscolhas(bruto) {
    return (Array.isArray(bruto) ? bruto : []).map(normalizarRegistro).filter(Boolean);
  }

  /* Registra uma decisão. Trocar a escolha de uma vaga reaproveita o id
     do registro: para a sincronização é o mesmo registro mudando, e não
     um apagado e outro criado. */
  function registrar(ordem, v, candidato) {
    if (!ordem.escolhas) ordem.escolhas = [];
    var c = candidato || {};
    var existente = ordem.escolhas.filter(function (r) { return r.etapa === v.id; })[0];

    var registro = normalizarRegistro({
      id: existente ? existente.id : uuid(),
      etapa: v.id,
      tipo: v.tipo,
      valor: c.valor,
      opcoes: c.opcoes,
      nome: descrever(ordem, { tipo: v.tipo, valor: c.valor, opcoes: c.opcoes, etapa: v.id }),
      ignorarRequisitos: false,
      registradoEm: agora(),
    });

    if (existente) {
      /* Os duplicados da mesma vaga — dois aparelhos que resolveram a
         mesma coisa ao mesmo tempo — somem aqui, porque quem registra
         agora está decidindo a vaga inteira. */
      ordem.escolhas = ordem.escolhas.filter(function (r) { return r.etapa !== v.id || r.id === existente.id; });
      var i = ordem.escolhas.indexOf(existente);
      ordem.escolhas[i] = registro;
    } else {
      ordem.escolhas.push(registro);
    }
    return registro;
  }

  function remover(ordem, idRegistro) {
    ordem.escolhas = (ordem.escolhas || []).filter(function (r) { return r.id !== idRegistro; });
  }

  function definirIgnorarRequisitos(ordem, idRegistro, ignorar) {
    (ordem.escolhas || []).forEach(function (r) {
      if (r.id === idRegistro) r.ignorarRequisitos = !!ignorar;
    });
  }

  /* =================================================================
     DESCRIÇÃO
     ================================================================= */

  function nomeDaPericia(k) { var p = C.pericia(k); return p ? p.nome : k; }
  function nomeDoAtributo(k) {
    var a = C.ATRIBUTOS.filter(function (x) { return x.chave === k; })[0];
    return a ? a.nome : k;
  }
  function nomeDoElemento(k) {
    var e = C.elemento(k);
    return e ? e.nome : k;
  }

  /* O nome de um poder com a opção que o distingue: "Resistir a Morte",
     não "Resistir a Elemento". */
  function nomeDoPoder(e, opcoes) {
    if (!e) return "";
    var o = opcoes || {};
    if (e.chave === "resistirAElemento" && o.elemento) return "Resistir a " + nomeDoElemento(o.elemento);
    if (e.chave === "especialistaEmElemento" && o.elemento) return "Especialista em " + nomeDoElemento(o.elemento);
    if (e.chave === "mestreEmElemento" && o.elemento) return "Mestre em " + nomeDoElemento(o.elemento);
    if (e.chave === "focoEmPericia" && o.pericia) return "Foco em Perícia (" + nomeDaPericia(o.pericia) + ")";
    if (e.chave === "aprenderRitual" && o.ritual) return "Aprender Ritual (" + o.ritual + ")";
    return e.nome;
  }

  function descreverPoderAninhado(valor) {
    if (!valor || !valor.valor) return "";
    var e = P.poder(valor.valor);
    return e ? nomeDoPoder(e, valor.opcoes) : valor.valor;
  }

  function descrever(ordem, r) {
    var o = r.opcoes || {};
    switch (r.tipo) {
      case "atributo":
        return "+1 em " + nomeDoAtributo(r.valor) + (r.valor === "int" && o.pericia ? " (treina " + nomeDaPericia(o.pericia) + ")" : "");
      case "grauTreinamento":
      case "perito":
        return (o.pericias || []).map(nomeDaPericia).join(", ");
      case "poderClasse": {
        var e = P.poder(r.valor);
        var nome = nomeDoPoder(e, o) || r.valor;
        if (r.valor === "transcender" && o.poder) nome += " → " + descreverPoderAninhado(o.poder);
        if (e && e.chave === "especialistaDiletante" && o.poder) nome += " → " + descreverPoderAninhado(o.poder);
        if (e && e.chave === "flashback" && o.origem) nome += " → " + ((C.origem(o.origem) || {}).poder || o.origem);
        return nome;
      }
      case "versatilidade":
        if (r.valor === "trilha" && o.trilha) {
          var tr = C.trilha(o.trilha.valor);
          var h = tr ? P.primeiraDaTrilha(tr.chave) : null;
          return "Primeiro poder de " + (tr ? tr.nome : o.trilha.valor) + (h ? " (" + h.nome + ")" : "");
        }
        if (r.valor === "poderClasse" && o.poder) {
          var ep = P.poder(o.poder.valor);
          var n2 = nomeDoPoder(ep, o.poder.opcoes);
          if (o.poder.valor === "transcender" && o.poder.opcoes && o.poder.opcoes.poder) {
            n2 += " → " + descreverPoderAninhado(o.poder.opcoes.poder);
          }
          return "Poder de classe: " + n2;
        }
        return "";
      case "transcenderExposicao":
        if (r.valor === "nao") return "Não transcendeu neste NEX";
        return "Transcender → " + descreverPoderAninhado(o.poder);
      case "poderOrigem":
        if (o.poder) return descreverPoderAninhado(o.poder);
        return "";
      default:
        return "";
    }
  }

  /* =================================================================
     O MOTOR
     -----------------------------------------------------------------
     Percorre as etapas em ordem, mantendo o "personagem até aqui".
     ================================================================= */

  function novoPercurso(ordem) {
    var atributos = {};
    C.ATRIBUTOS.forEach(function (a) {
      atributos[a.chave] = inteiro(ordem.atributos ? ordem.atributos[a.chave] : 1, 1);
    });

    var graus = {};
    var fontesGrau = {};
    C.PERICIAS.forEach(function (p) {
      var g = GRAUS.indexOf(C.grau(ordem.pericias ? ordem.pericias[p.chave] : "").chave);
      graus[p.chave] = g < 0 ? 0 : g;
      fontesGrau[p.chave] = [];
    });

    return {
      atributos: atributos,
      graus: graus,
      fontesGrau: fontesGrau,
      adquiridos: [],
      afinidadeAtiva: false,
    };
  }

  function copiarPercurso(p) {
    return {
      atributos: Object.assign({}, p.atributos),
      graus: Object.assign({}, p.graus),
      fontesGrau: JSON.parse(JSON.stringify(p.fontesGrau)),
      adquiridos: p.adquiridos.slice(),
      afinidadeAtiva: p.afinidadeAtiva,
    };
  }

  function inteiro(valor, padrao) {
    var n = parseInt(valor, 10);
    return Number.isFinite(n) ? n : padrao;
  }

  /* A etapa, com o NEX que vale para requisitos de classe e o NEX de
     exposição que vale para poderes paranormais. */
  function etapaDe(ordem, v) {
    var t = R().trilho(ordem);
    var exposicaoAtual = R().exposicao(ordem);
    var d = v.degrau || 0;

    var exposicao;
    if (v.nexExposicao) exposicao = v.nexExposicao;
    else if (t.separado) exposicao = 0;
    else exposicao = nexDoDegrau(Math.max(1, d));

    return {
      id: v.id,
      degrau: d,
      nex: nexDoDegrau(Math.max(1, d)),
      exposicao: Math.min(exposicao, t.separado ? exposicaoAtual : 99),
      separado: t.separado,
      rotulo: v.rotuloEtapa || rotuloDoDegrau(d, t.separado),
    };
  }

  function afinidadeDe(ordem) {
    var a = ordem.afinidade || {};
    return {
      elemento: typeof a.elemento === "string" ? a.elemento : "",
      nomeOutro: typeof a.nomeOutro === "string" ? a.nomeOutro : "",
      adiada: a.adiada === true,
    };
  }

  /* Se, nesta etapa, um poder paranormal do elemento da afinidade pode
     ser escolhido uma segunda vez.

     A afinidade "se desenvolve na primeira vez que transcender" depois
     de NEX 50% (OPRPG p.114). O R.A.M.A. aceita que essa mesma vez já
     seja a segunda escolha do poder — o livro não proíbe, e proibir
     seria inventar requisito. Ver docs/ORDEM-REGRAS.md. */
  function afinidadeNaEtapa(ordem, percurso, etapa) {
    var a = afinidadeDe(ordem);
    var mecanica = ELEMENTOS_PODER.indexOf(a.elemento) >= 0;
    return {
      elemento: a.elemento,
      mecanica: mecanica,
      disponivel: mecanica && (percurso.afinidadeAtiva || etapa.exposicao >= 50),
    };
  }

  /* ---------------- requisitos ---------------- */

  function elementoDoPoder(e, opcoes) {
    if (!e) return "";
    if (e.elemento) return e.elemento;
    var o = opcoes || {};
    if ((e.chave === "aprenderRitual" || e.chave === "resistirAElemento") && o.elemento) return o.elemento;
    return "";
  }

  function textoNex(n, separado) {
    return separado ? "nível " + Math.ceil(n / 5) : "NEX " + n + "%";
  }

  function requisito(r, percurso, etapa, opcoes, ordem) {
    var o = opcoes || {};
    switch (r.tipo) {
      case "atributo": {
        var tem = percurso.atributos[r.atributo] || 0;
        return { ok: tem >= r.minimo, texto: nomeDoAtributo(r.atributo) + " " + r.minimo,
          falta: nomeDoAtributo(r.atributo) + " " + r.minimo + " (nesta etapa: " + tem + ")" };
      }
      case "treinado":
        return { ok: (percurso.graus[r.pericia] || 0) >= 1, texto: "Treinado em " + nomeDaPericia(r.pericia),
          falta: "Treinado em " + nomeDaPericia(r.pericia) };
      case "treinadoEmUma": {
        var algum = r.pericias.some(function (k) { return (percurso.graus[k] || 0) >= 1; });
        var nomes = r.pericias.map(nomeDaPericia).join(" ou ");
        return { ok: algum, texto: "Treinado em " + nomes, falta: "Treinado em " + nomes };
      }
      case "nex":
        return { ok: etapa.nex >= r.minimo, texto: textoNex(r.minimo, etapa.separado),
          falta: textoNex(r.minimo, etapa.separado) + " (esta escolha é de " + etapa.rotulo + ")" };
      case "poder": {
        var alvo = P.poder(r.poder);
        var ok = percurso.adquiridos.some(function (a) { return vale(a) && a.chave === r.poder; });
        return { ok: ok, texto: "Ter " + (alvo ? alvo.nome : r.poder), falta: "Ter " + (alvo ? alvo.nome : r.poder) };
      }
      case "poderElemento": {
        var base = P.poder(r.poder);
        var mesmo = percurso.adquiridos.some(function (a) {
          return vale(a) && a.chave === r.poder && o.elemento && a.opcoes && a.opcoes.elemento === o.elemento;
        });
        var nomeBase = base ? base.nome : r.poder;
        return { ok: mesmo, texto: nomeBase + " no mesmo elemento",
          falta: o.elemento ? nomeBase + " em " + nomeDoElemento(o.elemento) : nomeBase + " no elemento escolhido" };
      }
      case "elemento": {
        var quantos = percurso.adquiridos.filter(function (a) { return vale(a) && a.elemento === r.elemento && a.tipo === "paranormal"; }).length;
        var nomeEl = nomeDoElemento(r.elemento);
        return { ok: quantos >= r.quantidade, texto: nomeEl + " " + r.quantidade,
          falta: nomeEl + " " + r.quantidade + " (" + r.quantidade + " poder" + (r.quantidade > 1 ? "es" : "") +
            " de " + nomeEl + "; nesta etapa: " + quantos + ")" };
      }
      case "treinadoNaOpcao": {
        var k = o[r.opcao];
        if (!k) return { ok: true, texto: "Treinado na perícia escolhida", falta: "" };
        return { ok: (percurso.graus[k] || 0) >= 1, texto: "Treinado na perícia escolhida",
          falta: "Treinado em " + nomeDaPericia(k) };
      }
      case "semRegra": {
        var ligada = OP() ? OP().ligada(ordem, r.regra) : false;
        return { ok: !ligada, texto: "Sem a regra opcional " + (OP() && OP().regra(r.regra) ? OP().regra(r.regra).nome : r.regra),
          falta: r.motivo || "Uma regra opcional ligada impede esta escolha." };
      }
      default:
        return { ok: true, texto: "", falta: "" };
    }
  }

  function requisitosDe(e, percurso, etapa, opcoes, ordem) {
    return (e.requisitos || []).map(function (r) { return requisito(r, percurso, etapa, opcoes, ordem); });
  }

  /* Os requisitos só como texto, fora de qualquer ficha — para consulta
     (a biblioteca oficial). Nada é avaliado: o `ok` é descartado. */
  function textosDosRequisitos(e) {
    var vazio = { atributos: {}, graus: {}, adquiridos: [] };
    return (e.requisitos || []).map(function (r) {
      return requisito(r, vazio, { nex: 0, separado: false, rotulo: "" }, {}, null).texto;
    }).filter(Boolean);
  }

  /* ---------------- repetição ---------------- */

  function repeticao(e, percurso, opcoes, etapa, ordem) {
    var o = opcoes || {};
    var iguais = percurso.adquiridos.filter(function (a) {
      if (!vale(a) || a.chave !== e.chave) return false;
      if (e.repeticaoPorOpcao) return (a.opcoes || {})[e.repeticaoPorOpcao] === o[e.repeticaoPorOpcao];
      return true;
    });

    if (!iguais.length) return { ok: true, afinidade: false, texto: "" };
    if (e.repetivel && !e.repeticaoPorOpcao) return { ok: true, afinidade: false, texto: "" };

    if (e.tipo === "paranormal") {
      var el = elementoDoPoder(e, o);
      var af = afinidadeNaEtapa(ordem, percurso, etapa);
      var jaComAfinidade = iguais.some(function (a) { return a.afinidade; });
      if (iguais.length === 1 && !jaComAfinidade && af.disponivel && el && el === af.elemento) {
        return { ok: true, afinidade: true, texto: "Segunda escolha: recebe o benefício da afinidade." };
      }
      var motivo;
      if (iguais.length > 1 || jaComAfinidade) motivo = "Você já escolheu " + nomeDoPoder(e, o) + " duas vezes.";
      else if (!af.mecanica) motivo = "Você já tem " + nomeDoPoder(e, o) + ". Só com afinidade um poder do seu elemento pode ser escolhido uma segunda vez.";
      else if (el !== af.elemento) motivo = "Você já tem " + nomeDoPoder(e, o) + ". A segunda escolha só vale para poderes de " + nomeDoElemento(af.elemento) + ", o elemento da sua afinidade.";
      else motivo = "Você já tem " + nomeDoPoder(e, o) + ". A afinidade ainda não se desenvolveu: ela vem na primeira vez que você transcende a partir de NEX 50%.";
      return { ok: false, afinidade: false, texto: motivo };
    }

    return { ok: false, afinidade: false, texto: "Você já tem " + nomeDoPoder(e, o) + ", e ele não pode ser escolhido de novo." };
  }

  /* ---------------- opções ---------------- */

  function vazio(v) {
    return v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
  }

  function itensDoContexto(contexto) {
    return (contexto && contexto.inventario && Array.isArray(contexto.inventario.itens)) ? contexto.inventario.itens : null;
  }

  function grupoDoItem(item) {
    var I = global.RAMAOrdemInventario;
    return I ? I.dadosDoItem(item).grupo : (item.tipo === "arma" ? "arma" : "geral");
  }

  /* Avalia as opções internas de uma entrada. Devolve o que falta, o que
     está errado e os poderes aninhados que a escolha concede. */
  function avaliarOpcoes(schema, valores, percurso, etapa, ordem, contexto, prof) {
    var saida = { faltam: [], problemas: [], filhos: [] };
    var v = valores || {};
    if ((prof || 0) > PROFUNDIDADE_MAXIMA) {
      saida.problemas.push("Escolhas aninhadas demais.");
      return saida;
    }

    (schema || []).forEach(function (op) {
      var valor = v[op.chave];

      if (vazio(valor)) {
        if (!op.opcional) {
          if (op.tipo === "item" && !itensDoContexto(contexto)) {
            saida.faltam.push(op.rotulo + ": adicione o item ao inventário e escolha depois");
          } else {
            saida.faltam.push(op.rotulo);
          }
        }
        return;
      }

      switch (op.tipo) {
        case "pericia": {
          if (!C.pericia(valor)) { saida.problemas.push(op.rotulo + ": perícia desconhecida."); break; }
          if (op.entre && op.entre.indexOf(valor) < 0) saida.problemas.push(op.rotulo + ": escolha entre " + op.entre.map(nomeDaPericia).join(", ") + ".");
          if (op.exceto && op.exceto.indexOf(valor) >= 0) saida.problemas.push(op.rotulo + ": " + nomeDaPericia(valor) + " não pode ser escolhida aqui.");
          break;
        }
        case "pericias": {
          var lista = Array.isArray(valor) ? valor : [];
          var unicas = lista.filter(function (k, i) { return lista.indexOf(k) === i; });
          if (unicas.length !== lista.length) saida.problemas.push(op.rotulo + ": a mesma perícia foi escolhida duas vezes.");
          unicas.forEach(function (k) {
            if (!C.pericia(k)) { saida.problemas.push("Perícia desconhecida: " + k + "."); return; }
            if (op.modo === "treinamento") {
              var motivo = motivoParaSubir(percurso.graus[k] || 0, etapa, k, true);
              if (motivo) saida.problemas.push(motivo);
            }
          });
          if (op.quantidade && unicas.length < op.quantidade) {
            saida.faltam.push(op.rotulo + ": faltam " + (op.quantidade - unicas.length));
          }
          if (op.quantidade && unicas.length > op.quantidade) {
            saida.problemas.push(op.rotulo + ": escolha no máximo " + op.quantidade + ".");
          }
          break;
        }
        case "atributo":
          if (!C.ATRIBUTOS.some(function (a) { return a.chave === valor; })) saida.problemas.push(op.rotulo + ": atributo desconhecido.");
          else if (op.exceto && op.exceto.indexOf(valor) >= 0) saida.problemas.push(op.rotulo + ": " + nomeDoAtributo(valor) + " não pode ser escolhido aqui.");
          break;
        case "elemento": {
          var validos = op.comMedo ? ELEMENTOS_PODER.concat(["medo"]) : ELEMENTOS_PODER;
          if (validos.indexOf(valor) < 0) saida.problemas.push(op.rotulo + ": elemento inválido.");
          break;
        }
        case "item": {
          var itens = itensDoContexto(contexto);
          /* Sem inventário à mão (uma conta que não mexe em item), o
             vínculo já escolhido é aceito como está: conferir se o item
             existe é trabalho de quem tem o inventário. */
          if (!itens) break;
          var item = itens.filter(function (i) { return i && i.id === valor; })[0];
          if (!item) { saida.problemas.push(op.rotulo + ": o item escolhido não está mais no inventário."); break; }
          if (op.excetoArmas && item.tipo === "arma") saida.problemas.push(op.rotulo + ": armas não podem ser escolhidas aqui.");
          if (op.grupo && grupoDoItem(item) !== op.grupo) saida.problemas.push(op.rotulo + ": " + item.nome + " não está marcado como item paranormal.");
          break;
        }
        case "itens": {
          var todos = itensDoContexto(contexto);
          if (!todos) break;
          (Array.isArray(valor) ? valor : []).forEach(function (id) {
            var achado = todos.filter(function (i) { return i && i.id === id; })[0];
            if (!achado) saida.problemas.push(op.rotulo + ": um dos itens escolhidos não está mais no inventário.");
            else if (op.apenasArmas && achado.tipo !== "arma") saida.problemas.push(op.rotulo + ": " + achado.nome + " não é uma arma.");
          });
          break;
        }
        case "ritual":
        case "texto":
          if (typeof valor !== "string" || !valor.trim()) saida.faltam.push(op.rotulo);
          break;
        case "escolha":
          if ((op.valores || []).indexOf(valor) < 0) saida.problemas.push(op.rotulo + ": opção inválida.");
          break;
        case "origem":
          if (!C.origem(valor)) saida.problemas.push(op.rotulo + ": origem desconhecida.");
          else if (valor === ordem.origem) saida.problemas.push(op.rotulo + ": escolha uma origem que não seja a sua.");
          else saida.filhos.push({ origem: valor });
          break;
        case "poderParanormal":
          juntar(saida, avaliarParanormal(valor, percurso, etapa, ordem, contexto, (prof || 0) + 1));
          break;
        case "poderOutraClasse":
          juntar(saida, avaliarOutraClasse(valor, percurso, etapa, ordem, contexto, (prof || 0) + 1));
          break;
        case "trilhaOutra":
          juntar(saida, avaliarTrilhaOutra(valor, percurso, etapa, ordem, contexto, (prof || 0) + 1));
          break;
        case "caminho": {
          var cam = (op.caminhos || []).filter(function (c) { return valor && c.valor === valor.valor; })[0];
          if (!cam) { saida.faltam.push(op.rotulo); break; }
          var sub = {};
          sub[cam.opcao.chave] = valor.sub;
          juntar(saida, avaliarOpcoes([cam.opcao], sub, percurso, etapa, ordem, contexto, (prof || 0) + 1));
          break;
        }
        default:
          break;
      }
    });

    return saida;
  }

  function juntar(saida, parte) {
    saida.faltam = saida.faltam.concat(parte.faltam);
    saida.problemas = saida.problemas.concat(parte.problemas);
    saida.filhos = saida.filhos.concat(parte.filhos);
  }

  /* Se uma perícia pode subir um grau nesta etapa. */
  function motivoParaSubir(atual, etapa, chave, podeTreinar) {
    var nome = nomeDaPericia(chave);
    if (atual >= 3) return nome + " já é expert.";
    if (atual === 0 && !podeTreinar) return nome + " não é treinada.";
    var novo = atual + 1;
    if (etapa.nex < NEX_DO_GRAU[novo]) {
      return nome + " só pode ir a " + GRAUS[novo] + " a partir de " + textoNex(NEX_DO_GRAU[novo], etapa.separado) + ".";
    }
    return "";
  }

  /* Os requisitos são sempre conferidos e sempre listados. "Manter
     mesmo assim" não os esconde: só decide, lá no percurso, que a
     escolha vale apesar deles. */
  function avaliarPoder(e, opcoes, percurso, etapa, ordem, contexto, prof) {
    var saida = { faltam: [], problemas: [], filhos: [] };
    requisitosDe(e, percurso, etapa, opcoes, ordem).forEach(function (r) {
      if (!r.ok) saida.problemas.push("Requisito: " + r.falta + ".");
    });
    var rep = repeticao(e, percurso, opcoes, etapa, ordem);
    if (!rep.ok) saida.problemas.push(rep.texto);
    var sub = avaliarOpcoes(e.opcoes, opcoes, percurso, etapa, ordem, contexto, prof);
    saida.faltam = sub.faltam;
    saida.problemas = saida.problemas.concat(sub.problemas);
    saida.filhos = [{ entrada: e, opcoes: opcoes || {}, afinidade: rep.afinidade }].concat(sub.filhos);
    return saida;
  }

  function avaliarParanormal(valor, percurso, etapa, ordem, contexto, prof) {
    if (!valor || !valor.valor) return { faltam: ["Poder paranormal"], problemas: [], filhos: [] };
    var e = P.poder(valor.valor);
    if (!e || e.tipo !== "paranormal") return { faltam: [], problemas: ["Poder paranormal desconhecido: " + valor.valor + "."], filhos: [] };
    return avaliarPoder(e, valor.opcoes || {}, percurso, etapa, ordem, contexto, prof);
  }

  function ehDeOutraClasse(e, classe) {
    if (!e || e.tipo !== "classe") return false;
    if (e.geral) return false;
    return e.classes.indexOf(classe) < 0;
  }

  function avaliarOutraClasse(valor, percurso, etapa, ordem, contexto, prof) {
    if (!valor || !valor.valor) return { faltam: ["Poder de outra classe"], problemas: [], filhos: [] };
    var e = P.poder(valor.valor);
    if (!e) return { faltam: [], problemas: ["Poder desconhecido: " + valor.valor + "."], filhos: [] };
    if (!ehDeOutraClasse(e, ordem.classe)) {
      return { faltam: [], problemas: [e.nome + " pertence à sua classe (ou a todas) e não pode ser escolhido aqui."], filhos: [] };
    }
    return avaliarPoder(e, valor.opcoes || {}, percurso, etapa, ordem, contexto, prof);
  }

  function avaliarTrilhaOutra(valor, percurso, etapa, ordem, contexto, prof) {
    if (!valor || !valor.valor) return { faltam: ["Trilha"], problemas: [], filhos: [] };
    var tr = C.trilha(valor.valor);
    if (!tr) return { faltam: [], problemas: ["Trilha desconhecida."], filhos: [] };
    var problemas = [];
    if (tr.classe !== ordem.classe) problemas.push(tr.nome + " não é uma trilha da sua classe.");
    if (tr.chave === ordem.trilha) problemas.push(tr.nome + " já é a sua trilha.");
    (tr.requisitos || []).forEach(function (r) {
      var res = requisito(r, percurso, etapa, {}, ordem);
      if (!res.ok) problemas.push("Requisito da trilha: " + res.falta + ".");
    });
    var h = P.primeiraDaTrilha(tr.chave);
    if (!h) return { faltam: [], problemas: problemas.concat(["A trilha não tem poderes catalogados."]), filhos: [] };
    var sub = avaliarOpcoes(h.opcoes, valor.opcoes || {}, percurso, etapa, ordem, contexto, prof);
    return {
      faltam: sub.faltam,
      problemas: problemas.concat(sub.problemas),
      filhos: [{ entrada: h, opcoes: valor.opcoes || {}, afinidade: false }].concat(sub.filhos),
    };
  }

  /* ---------------- avaliação de um registro ---------------- */

  function avaliarRegistro(r, v, percurso, ordem, contexto) {
    var etapa = etapaDe(ordem, v);
    var o = r.opcoes || {};
    var saida = { faltam: [], problemas: [], filhos: [], transcender: false };

    switch (v.tipo) {
      case "atributo": {
        if (!C.ATRIBUTOS.some(function (a) { return a.chave === r.valor; })) { saida.faltam.push("Atributo"); break; }
        if ((percurso.atributos[r.valor] || 0) >= C.GERACAO_ATRIBUTOS.maximoPorAumento) {
          saida.problemas.push(nomeDoAtributo(r.valor) + " já está em " + percurso.atributos[r.valor] +
            " nesta etapa; o aumento de atributo não passa de " + C.GERACAO_ATRIBUTOS.maximoPorAumento + " (OPRPG p.26).");
        }
        /* OPRPG p.15: "Caso seu Intelecto aumente, você aprende uma
           perícia adicional para cada ponto." */
        if (r.valor === "int") {
          if (!o.pericia) saida.faltam.push("Perícia treinada pelo ponto de Intelecto");
          else if (!C.pericia(o.pericia)) saida.problemas.push("Perícia desconhecida.");
          else if ((percurso.graus[o.pericia] || 0) >= 1) saida.problemas.push(nomeDaPericia(o.pericia) + " já é treinada nesta etapa.");
        }
        break;
      }

      case "grauTreinamento": {
        var classe = C.classe(ordem.classe);
        var base = classe && classe.grauTreinamentoBase !== undefined ? classe.grauTreinamentoBase : 0;
        var quantas = Math.max(0, base + (percurso.atributos.int || 0));
        var lista = Array.isArray(o.pericias) ? o.pericias : [];
        var unicas = lista.filter(function (k, i) { return lista.indexOf(k) === i; });
        if (unicas.length !== lista.length) saida.problemas.push("A mesma perícia foi escolhida duas vezes.");
        unicas.forEach(function (k) {
          if (!C.pericia(k)) { saida.problemas.push("Perícia desconhecida."); return; }
          var m = motivoParaSubir(percurso.graus[k] || 0, etapa, k, false);
          if (m) saida.problemas.push(m);
        });
        if (unicas.length < quantas) saida.faltam.push("Perícias: faltam " + (quantas - unicas.length) + " de " + quantas);
        if (unicas.length > quantas) saida.problemas.push("Escolha no máximo " + quantas + " perícias (" + base + " + Intelecto " + (percurso.atributos.int || 0) + ").");
        break;
      }

      case "perito": {
        var escolhidas = Array.isArray(o.pericias) ? o.pericias : [];
        var sem = escolhidas.filter(function (k, i) { return escolhidas.indexOf(k) === i; });
        if (sem.length !== escolhidas.length) saida.problemas.push("A mesma perícia foi escolhida duas vezes.");
        sem.forEach(function (k) {
          if (!C.pericia(k)) { saida.problemas.push("Perícia desconhecida."); return; }
          if (k === "luta" || k === "pontaria") saida.problemas.push("Perito não vale para Luta nem Pontaria.");
          else if ((percurso.graus[k] || 0) < 1) saida.problemas.push("Perito exige perícias treinadas: " + nomeDaPericia(k) + " não é.");
        });
        if (sem.length < 2) saida.faltam.push("Perícias: faltam " + (2 - sem.length) + " de 2");
        if (sem.length > 2) saida.problemas.push("Perito usa exatamente duas perícias.");
        break;
      }

      case "poderClasse": {
        if (!r.valor) { saida.faltam.push("Poder"); break; }
        var e = P.poder(r.valor);
        if (!e || (e.tipo !== "classe" && e.tipo !== "geral")) { saida.problemas.push("Poder desconhecido: " + (r.nome || r.valor) + "."); break; }
        if (!P.pertenceAClasse(e, ordem.classe)) { saida.problemas.push(e.nome + " não é um poder da sua classe."); break; }
        juntar(saida, avaliarPoder(e, o, percurso, etapa, ordem, contexto, 0));
        saida.transcender = e.chave === "transcender";
        break;
      }

      case "versatilidade": {
        if (r.valor === "poderClasse") {
          var val = o.poder || {};
          if (!val.valor) { saida.faltam.push("Poder de classe"); break; }
          var ev = P.poder(val.valor);
          if (!ev || !P.pertenceAClasse(ev, ordem.classe) || (ev.tipo !== "classe" && ev.tipo !== "geral")) {
            saida.problemas.push("Escolha um poder da sua classe.");
            break;
          }
          juntar(saida, avaliarPoder(ev, val.opcoes || {}, percurso, etapa, ordem, contexto, 0));
          saida.transcender = ev.chave === "transcender";
        } else if (r.valor === "trilha") {
          juntar(saida, avaliarTrilhaOutra(o.trilha, percurso, etapa, ordem, contexto, 0));
        } else {
          saida.faltam.push("Poder de classe ou primeiro poder de outra trilha");
        }
        break;
      }

      case "opcoesBeneficio": {
        var h = P.poder(v.beneficio);
        if (!h) { saida.problemas.push("Habilidade desconhecida."); break; }
        var sub = avaliarOpcoes(h.opcoes, o, percurso, etapa, ordem, contexto, 0);
        saida.faltam = sub.faltam;
        saida.problemas = sub.problemas;
        saida.filhos = [{ entrada: h, opcoes: o, afinidade: false }].concat(sub.filhos);
        break;
      }

      case "poderOrigem": {
        var org = C.origem(v.origem);
        if (!org || !org.escolha) break;
        var sub2 = avaliarOpcoes([org.escolha], o, percurso, etapa, ordem, contexto, 0);
        saida.faltam = sub2.faltam;
        saida.problemas = sub2.problemas;
        saida.filhos = sub2.filhos;
        if (org.efeitoEscolha) saida.filhos.push({ efeitoDeOrigem: org.efeitoEscolha, opcoes: o, origem: org.chave, nome: org.poder });
        break;
      }

      case "transcenderExposicao": {
        if (r.valor === "nao") break;
        if (r.valor !== "transcender") { saida.faltam.push("Transcender ou não"); break; }
        juntar(saida, avaliarParanormal(o.poder, percurso, etapa, ordem, contexto, 0));
        break;
      }

      case "alteracao": {
        var alt = P.poder(v.beneficio);
        if (!alt) break;
        var sub3 = avaliarOpcoes(alt.opcoes, o, percurso, etapa, ordem, contexto, 0);
        saida.faltam = sub3.faltam;
        saida.problemas = sub3.problemas;
        saida.filhos = [{ entrada: alt, opcoes: o, afinidade: false }].concat(sub3.filhos);
        break;
      }

      default:
        break;
    }

    return saida;
  }

  /* ---------------- aplicação ---------------- */

  function adquirir(percurso, efeitos, filho, info) {
    if (filho.origem && !filho.entrada && !filho.efeitoDeOrigem) {
      /* Flashback: o poder de outra origem. O efeito numérico dela, se
         houver, entra pela camada de cálculo como o de qualquer origem. */
      var org = C.origem(filho.origem);
      if (org) {
        percurso.adquiridos.push({
          chave: "origem:" + org.chave, nome: org.poder + " (" + org.nome + ")", tipo: "origem",
          elemento: "", opcoes: {}, afinidade: false, valido: true, completo: true,
          via: info.via, degrau: info.etapa.degrau, etapaId: info.etapa.id, registroId: info.registroId,
          resumo: org.resumo, automacao: org.automacao, fonteRef: C.referencia(org),
        });
        if (org.efeito) efeitos.push(Object.assign({}, org.efeito, { tipo: org.efeito.tipo, fonte: org.poder, detalhe: "Flashback: " + org.nome }));
      }
      return;
    }

    if (filho.efeitoDeOrigem) {
      aplicarEfeito(percurso, efeitos, filho.efeitoDeOrigem, filho.opcoes, { nome: filho.nome, detalhe: "Origem" }, info.etapa);
      return;
    }

    var e = filho.entrada;
    var reg = {
      chave: e.chave,
      nome: nomeDoPoder(e, filho.opcoes) + (filho.afinidade ? " (afinidade)" : ""),
      tipo: e.tipo,
      elemento: elementoDoPoder(e, filho.opcoes),
      opcoes: filho.opcoes || {},
      afinidade: !!filho.afinidade,
      valido: true,
      completo: true,
      via: info.via,
      degrau: info.etapa.degrau,
      etapaId: info.etapa.id,
      rotuloEtapa: info.etapa.rotulo,
      registroId: info.registroId,
      entrada: e,
    };
    percurso.adquiridos.push(reg);

    /* A segunda escolha de um poder, pela afinidade, dá SÓ o que a linha
       "Afinidade" acrescenta: "o bônus em Furtividade aumenta para +10"
       é +5 sobre o +5 que a primeira escolha já dá, não +15. */
    var lista = filho.afinidade ? (e.efeitosAfinidade || []) : (e.efeitos || []);
    lista.forEach(function (ef) {
      aplicarEfeito(percurso, efeitos, ef, filho.opcoes, { nome: reg.nome, detalhe: info.etapa.rotulo }, info.etapa);
    });

    if (e.tipo === "paranormal" && info.etapa.exposicao >= 50) percurso.afinidadeAtiva = true;
  }

  function subirGrau(percurso, chave, para, fonte, detalhe) {
    var atual = percurso.graus[chave] || 0;
    if (para <= atual) return;
    percurso.graus[chave] = Math.min(3, para);
    percurso.fontesGrau[chave].push({ de: GRAUS[atual], para: GRAUS[percurso.graus[chave]], fonte: fonte, detalhe: detalhe });
  }

  function aplicarEfeito(percurso, efeitos, ef, opcoes, origem, etapa) {
    var o = opcoes || {};
    var fonte = origem.nome;
    var detalhe = origem.detalhe || "";

    switch (ef.tipo) {
      case "grauPericias":
        (o[ef.opcao] || []).forEach(function (k) {
          if (!C.pericia(k)) return;
          subirGrau(percurso, k, (percurso.graus[k] || 0) + 1, fonte, detalhe);
        });
        return;

      case "treinarOuBonus": {
        var k = ef.pericia || o[ef.opcao];
        if (!k || !C.pericia(k)) return;
        if ((percurso.graus[k] || 0) === 0) subirGrau(percurso, k, 1, fonte, detalhe);
        else efeitos.push({ tipo: "bonusPericia", pericias: [k], valor: ef.bonus, fonte: fonte, detalhe: detalhe + " · já era treinado" });
        return;
      }

      case "grauMinimo": {
        var alvo = GRAUS.indexOf(ef.grau);
        subirGrau(percurso, ef.pericia, alvo, fonte, detalhe);
        return;
      }

      case "atributo":
        percurso.atributos[ef.atributo] = (percurso.atributos[ef.atributo] || 0) + ef.valor;
        efeitos.push({ tipo: "atributo", atributo: ef.atributo, valor: ef.valor, fonte: fonte, detalhe: detalhe });
        return;

      case "atributosPorElemento": {
        var base = percurso.adquiridos.filter(function (a) { return vale(a) && a.chave === ef.opcaoDe; })[0];
        var el = base && base.opcoes ? base.opcoes.elemento : "";
        (ef.mapa[el] || []).forEach(function (m) {
          percurso.atributos[m.atributo] = (percurso.atributos[m.atributo] || 0) + m.valor;
          efeitos.push({ tipo: "atributo", atributo: m.atributo, valor: m.valor, fonte: fonte, detalhe: detalhe + " · " + nomeDoElemento(el) });
        });
        return;
      }

      default: {
        var copia = Object.assign({}, ef, { fonte: fonte, detalhe: detalhe, degrau: etapa.degrau });
        if (ef.opcao) {
          var valor = o[ef.opcao];
          if (vazio(valor)) return;
          if (ef.tipo === "bonusPericia") copia.pericias = [valor];
          else if (ef.tipo === "resistenciaDano") copia.dano = valor;
          else if (ef.tipo === "categoriaItem" || ef.tipo === "espacoItem") copia.itens = [valor];
          else if (ef.tipo === "categoriaFavorita") copia.itens = Array.isArray(valor) ? valor : [valor];
          else if (ef.tipo === "peAtributo") copia.atributo = valor;
          else if (ef.tipo === "atributoBasePericia") copia.pericia = valor;
          delete copia.opcao;
        } else if (ef.tipo === "categoriaFavorita") {
          copia.itens = [];
        }
        efeitos.push(copia);
      }
    }
  }

  /* =================================================================
     ESTADO
     ================================================================= */

  /* Uma ficha é calculada muitas vezes por desenho (cada perícia, cada
     recurso). O cache guarda os últimos estados de cada ficha pela
     assinatura do que importa; mudou qualquer coisa, a assinatura muda
     e a conta é refeita. */
  var CACHE = typeof WeakMap !== "undefined" ? new WeakMap() : null;
  var ENTRADAS_POR_FICHA = 4;

  function assinatura(ordem, contexto) {
    var itens = itensDoContexto(contexto);
    return JSON.stringify([
      ordem.classe, ordem.origem, ordem.trilha, ordem.nex, ordem.nivel,
      ordem.atributos, ordem.pericias, ordem.escolhas, ordem.afinidade, ordem.opcionais,
      ordem.progressao ? ordem.progressao.length : 0,
      itens ? itens.map(function (i) { return i ? [i.id, i.tipo, i.nome, i.ordem && i.ordem.grupo] : null; }) : null,
    ]);
  }

  function estado(ordem, contexto) {
    if (!ordem) return null;
    var chave = assinatura(ordem, contexto);
    var lista = CACHE ? (CACHE.get(ordem) || []) : [];
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].chave === chave) return lista[i].estado;
    }
    var e = percorrer(ordem, contexto, null);
    if (CACHE) {
      lista.unshift({ chave: chave, estado: e });
      CACHE.set(ordem, lista.slice(0, ENTRADAS_POR_FICHA));
    }
    return e;
  }

  /* O personagem como estava ANTES de uma vaga — é contra ele que as
     opções dessa vaga são conferidas na tela de escolha. */
  function estadoAntes(ordem, idVaga, contexto) {
    return percorrer(ordem, contexto, idVaga).antes;
  }

  function legadoDe(ordem) {
    var mapa = {};
    (ordem.progressao || []).forEach(function (e) {
      if (!e || !e.valor || !e.tipo || e.tipo === "trilha") return;
      var d = degrauDoNex(e.nex);
      var id = "d" + d + "." + e.tipo;
      if (!mapa[id]) mapa[id] = { id: id, tipo: e.tipo, nex: e.nex, texto: String(e.valor), rotulo: e.rotulo || e.tipo };
    });
    return mapa;
  }

  function percorrer(ordem, contexto, pararEm) {
    var t = R().trilho(ordem);
    var exposicao = R().exposicao(ordem);
    var classe = C.classe(ordem.classe);
    var vs = vagas(ordem);
    var percurso = novoPercurso(ordem);
    var efeitos = [];
    var avaliacoes = {};
    var pendencias = [];
    var problemas = [];
    var antes = null;
    var legado = legadoDe(ordem);
    var legadoUsado = [];

    /* Um registro por vaga. Dois para a mesma — a sincronização juntou
       duas decisões de aparelhos diferentes — valem pelo mais recente, e
       o outro aparece como problema, sem sumir. */
    var porEtapa = {};
    (ordem.escolhas || []).forEach(function (r) {
      var atual = porEtapa[r.etapa];
      if (!atual) { porEtapa[r.etapa] = r; return; }
      var novo = String(r.registradoEm || "") > String(atual.registradoEm || "") ? r : atual;
      var velho = novo === r ? atual : r;
      porEtapa[r.etapa] = novo;
      avaliacoes[velho.id] = { valido: false, completo: false, motivos: ["Outra escolha foi registrada para esta mesma etapa (provavelmente em outro aparelho)."], faltam: [], vaga: null, duplicado: true };
      problemas.push({ registro: velho, motivos: avaliacoes[velho.id].motivos, tipo: "duplicado" });
    });

    var idsVagas = {};
    vs.forEach(function (v) { idsVagas[v.id] = v; });

    /* Os eventos em ordem: vagas e habilidades automáticas de trilha. */
    var eventos = vs.map(function (v) { return { ordem: v.ordem, vaga: v }; });

    var trilhaEscolhida = classe ? C.trilha(ordem.trilha) : null;
    if (trilhaEscolhida && trilhaEscolhida.classe !== ordem.classe) trilhaEscolhida = null;
    if (trilhaEscolhida) {
      P.habilidadesDaTrilha(trilhaEscolhida.chave).forEach(function (h) {
        var d = degrauDoNex(h.nex);
        if (d > t.passos || h.opcoes.length) return;
        eventos.push({ ordem: d * 100 + POSICAO.trilhaAuto, trilhaAuto: h, degrau: d });
      });
    }
    eventos.sort(function (a, b) { return a.ordem - b.ordem; });

    var trilhaOk = true;
    var motivoTrilha = "";

    eventos.forEach(function (ev) {
      if (pararEm && ev.vaga && ev.vaga.id === pararEm && !antes) antes = copiarPercurso(percurso);

      if (ev.trilhaAuto) {
        var etapaAuto = etapaDe(ordem, { id: "t." + ev.trilhaAuto.chave, degrau: ev.degrau });
        percurso.adquiridos.push({
          chave: ev.trilhaAuto.chave, nome: ev.trilhaAuto.nome, tipo: "trilha", elemento: "", opcoes: {},
          afinidade: false, valido: trilhaOk, completo: true, via: "trilha", degrau: ev.degrau,
          etapaId: "t." + ev.trilhaAuto.chave, rotuloEtapa: etapaAuto.rotulo, entrada: ev.trilhaAuto,
          motivos: trilhaOk ? [] : [motivoTrilha],
        });
        if (trilhaOk) {
          var ultimo = percurso.adquiridos[percurso.adquiridos.length - 1];
          (ev.trilhaAuto.efeitos || []).forEach(function (ef) {
            aplicarEfeito(percurso, efeitos, ef, {}, { nome: ultimo.nome, detalhe: etapaAuto.rotulo }, etapaAuto);
          });
        }
        return;
      }

      var v = ev.vaga;

      if (v.tipo === "trilha") {
        if (!trilhaEscolhida) {
          pendencias.push(pendencia(v, "aberta"));
          return;
        }
        var etapaTrilha = etapaDe(ordem, v);
        var falhas = (trilhaEscolhida.requisitos || []).map(function (r) {
          return requisito(r, percurso, etapaTrilha, {}, ordem);
        }).filter(function (r) { return !r.ok; });
        if (falhas.length) {
          trilhaOk = false;
          motivoTrilha = "Requisito da trilha " + trilhaEscolhida.nome + ": " + falhas.map(function (f) { return f.falta; }).join("; ") + ".";
          pendencias.push(Object.assign(pendencia(v, "invalida"), { motivos: [motivoTrilha] }));
        }
        return;
      }

      if (v.tipo === "afinidade") {
        var af = afinidadeDe(ordem);
        var escolhida = !!af.elemento && (af.elemento !== "outro" || !!af.nomeOutro.trim());
        if (!escolhida) pendencias.push(Object.assign(pendencia(v, "aberta"), { adiada: af.adiada }));
        return;
      }

      var r = porEtapa[v.id];
      if (!r) {
        if (legado[v.id]) {
          legadoUsado.push(legado[v.id]);
          return;
        }
        pendencias.push(pendencia(v, "aberta"));
        if (v.tipo === "opcoesBeneficio") exibirIncompleta(percurso, v, trilhaOk, ordem);
        return;
      }

      var aval = avaliarRegistro(r, v, percurso, ordem, contexto);

      if (v.tipo === "opcoesBeneficio" && !trilhaOk) aval.problemas.unshift(motivoTrilha);

      var completo = !aval.faltam.length;
      /* "Manter mesmo assim" é decisão da mesa: a escolha completa vale
         apesar dos problemas, que continuam listados. */
      var mantida = r.ignorarRequisitos && completo && aval.problemas.length > 0;
      var valido = !aval.problemas.length || mantida;

      avaliacoes[r.id] = { valido: valido, completo: completo, motivos: aval.problemas, faltam: aval.faltam, vaga: v, mantidaPelaMesa: mantida };

      if (!completo) {
        pendencias.push(Object.assign(pendencia(v, valido ? "incompleta" : "invalida"), { registro: r, faltam: aval.faltam, motivos: aval.problemas }));
        if (v.tipo === "opcoesBeneficio") exibirIncompleta(percurso, v, trilhaOk, ordem);
      } else if (!valido) {
        pendencias.push(Object.assign(pendencia(v, "invalida"), { registro: r, faltam: [], motivos: aval.problemas }));
        problemas.push({ registro: r, motivos: aval.problemas, tipo: "requisito", vaga: v });
      }

      if (completo && valido) {
        var etapa = etapaDe(ordem, v);
        aval.filhos.forEach(function (f) {
          adquirir(percurso, efeitos, f, { via: v.tipo, etapa: etapa, registroId: r.id });
        });
        if (v.tipo === "atributo") {
          percurso.atributos[r.valor] = (percurso.atributos[r.valor] || 0) + 1;
          efeitos.push({ tipo: "aumentoAtributo", atributo: r.valor, valor: 1, fonte: "Aumento de atributo", detalhe: etapa.rotulo });
          if (r.valor === "int" && r.opcoes && r.opcoes.pericia) {
            subirGrau(percurso, r.opcoes.pericia, 1, "Intelecto aumentado", etapa.rotulo);
          }
        }
        if (v.tipo === "grauTreinamento") {
          (r.opcoes.pericias || []).forEach(function (k) {
            subirGrau(percurso, k, (percurso.graus[k] || 0) + 1, "Grau de treinamento", etapa.rotulo);
          });
        }
        if (v.tipo === "perito") {
          percurso.adquiridos.push({
            chave: "perito:escolha", nome: "Perito: " + (r.opcoes.pericias || []).map(nomeDaPericia).join(" e "),
            tipo: "escolhaPerito", elemento: "", opcoes: r.opcoes, afinidade: false, valido: true, completo: true,
            via: "perito", degrau: v.degrau, etapaId: v.id, rotuloEtapa: etapa.rotulo, registroId: r.id,
          });
        }
        /* Transcender como poder de classe custa a Sanidade daquele
           aumento de NEX (OPRPG p.26). No 1º degrau não há aumento. */
        if (aval.transcender && !t.separado && v.degrau >= 2) {
          efeitos.push({ tipo: "sanPerdidaTranscender", degrau: v.degrau, fonte: "Transcender", detalhe: etapa.rotulo });
        }
      }
    });

    /* Registros de etapas que não existem mais: o NEX baixou, a classe
       mudou, a regra foi desligada. Ficam guardados e voltam a valer
       sozinhos se a etapa voltar a existir. */
    var fora = [];
    (ordem.escolhas || []).forEach(function (r) {
      if (idsVagas[r.etapa] || avaliacoes[r.id]) return;
      var motivo = motivoFora(ordem, r, t);
      avaliacoes[r.id] = { valido: false, completo: false, motivos: [motivo], faltam: [], vaga: null, fora: true };
      fora.push({ registro: r, motivos: [motivo] });
    });

    var af = afinidadeDe(ordem);

    return {
      antes: antes,
      trilho: t,
      exposicao: exposicao,
      vagas: vs,
      atributos: percurso.atributos,
      graus: mapaDeGraus(percurso.graus),
      fontesGrau: percurso.fontesGrau,
      adquiridos: percurso.adquiridos,
      efeitos: efeitos,
      avaliacoes: avaliacoes,
      pendencias: pendencias,
      problemas: problemas,
      fora: fora,
      legado: legadoUsado,
      afinidade: {
        gatilho: exposicao >= 50,
        elemento: af.elemento,
        nomeOutro: af.nomeOutro,
        adiada: af.adiada,
        escolhida: !!af.elemento && (af.elemento !== "outro" || !!af.nomeOutro.trim()),
        homebrew: af.elemento === "outro",
        ativa: !!af.elemento && percurso.afinidadeAtiva,
        conflito: conflitoDeAfinidade(ordem, percurso, af),
      },
    };
  }

  /* Uma habilidade automática que ainda espera a opção interna aparece
     na ficha — ela JÁ chegou — mas marcada como incompleta, e sem
     efeito até a opção ser escolhida. Ela não satisfaz requisito de
     ninguém enquanto isso. */
  function exibirIncompleta(percurso, v, trilhaOk, ordem) {
    var h = P.poder(v.beneficio);
    if (!h) return;
    percurso.adquiridos.push({
      chave: h.chave, nome: h.nome, tipo: h.tipo, elemento: "", opcoes: {}, afinidade: false,
      valido: trilhaOk, completo: false, via: v.tipo, degrau: v.degrau, etapaId: v.id,
      rotuloEtapa: v.rotuloEtapa, entrada: h, motivos: ["Falta escolher a opção desta habilidade."],
    });
  }

  function vale(a) {
    return !!a && a.valido && a.completo !== false;
  }

  function mapaDeGraus(graus) {
    var saida = {};
    Object.keys(graus).forEach(function (k) { saida[k] = GRAUS[graus[k]] || "destreinado"; });
    return saida;
  }

  /* A trilha Monstruoso prende a afinidade ao elemento da maldição
     (SAH p.17). O R.A.M.A. avisa; não troca nada sozinho. */
  function conflitoDeAfinidade(ordem, percurso, af) {
    if (!af.elemento) return "";
    var maldicao = percurso.adquiridos.filter(function (a) { return vale(a) && a.chave === "serAmaldicoado"; })[0];
    if (!maldicao || !maldicao.opcoes || !maldicao.opcoes.elemento) return "";
    if (maldicao.opcoes.elemento === af.elemento) return "";
    return "A trilha Monstruoso exige afinidade com " + nomeDoElemento(maldicao.opcoes.elemento) +
      ", o elemento de Ser Amaldiçoado (Sobrevivendo ao Horror, p. 17).";
  }

  function motivoFora(ordem, r, t) {
    var m = /^d(\d+)\./.exec(r.etapa);
    if (m) {
      var d = parseInt(m[1], 10);
      if (d > t.passos) {
        return "Esta escolha é de " + rotuloDoDegrau(d, t.separado) + ", acima de " + t.rotulo +
          ". Ela fica guardada e volta a valer se o personagem chegar lá de novo.";
      }
      return "Esta etapa não existe na progressão da classe atual. A escolha fica guardada.";
    }
    if (/^x\d+\./.test(r.etapa)) {
      return "Esta escolha depende da regra NEX & Experiência e do NEX de exposição. Ela fica guardada.";
    }
    if (/^b\./.test(r.etapa)) {
      return "A habilidade desta opção não faz mais parte da ficha (trilha ou origem mudou). A escolha fica guardada.";
    }
    return "Esta escolha não corresponde a nenhuma etapa atual. Ela fica guardada.";
  }

  function pendencia(v, situacao) {
    return {
      id: v.id,
      vaga: v,
      tipo: v.tipo,
      rotulo: v.rotulo,
      rotuloEtapa: v.rotuloEtapa,
      explicacao: v.explicacao,
      verbo: situacao === "aberta" ? v.verbo : (situacao === "incompleta" ? "Completar" : "Revisar"),
      situacao: situacao,
      opcional: v.opcional,
      faltam: [],
      motivos: [],
      registro: null,
    };
  }

  /* =================================================================
     CANDIDATOS — o que a tela de escolha mostra
     -----------------------------------------------------------------
     Cada candidato vem com os requisitos conferidos um a um e, quando
     não pode ser escolhido, o motivo por extenso.
     ================================================================= */

  function candidato(e, percurso, etapa, ordem, opcoesParciais) {
    var reqs = requisitosDe(e, percurso, etapa, opcoesParciais || {}, ordem);
    var rep = repeticao(e, percurso, opcoesParciais || {}, etapa, ordem);
    /* Poder que se repete por opção (Foco em Perícia, Resistir a
       Elemento) só é barrado de verdade quando a opção for escolhida. */
    var repOk = rep.ok || !!e.repeticaoPorOpcao;
    var motivos = reqs.filter(function (r) { return !r.ok; }).map(function (r) { return "Requisito: " + r.falta + "."; });
    if (!repOk) motivos.push(rep.texto);
    return {
      entrada: e,
      requisitos: reqs,
      repeticao: rep,
      disponivel: !motivos.length,
      motivos: motivos,
    };
  }

  function contextoDaVaga(ordem, idVaga, contexto) {
    var v = vagas(ordem).filter(function (x) { return x.id === idVaga; })[0] || null;
    if (!v) return null;
    var p = estadoAntes(ordem, idVaga, contexto) || novoPercurso(ordem);
    return { vaga: v, percurso: p, etapa: etapaDe(ordem, v) };
  }

  function candidatosPoderClasse(ordem, idVaga, contexto) {
    var c = contextoDaVaga(ordem, idVaga, contexto);
    if (!c) return [];
    return P.poderesDeClasse(ordem.classe).map(function (e) {
      var cand = candidato(e, c.percurso, c.etapa, ordem);
      cand.viaGeral = e.tipo === "geral" || (e.classes.indexOf(ordem.classe) < 0 && !!e.geral);
      return cand;
    });
  }

  function candidatosParanormais(ordem, idVaga, contexto) {
    var c = contextoDaVaga(ordem, idVaga, contexto);
    if (!c) return [];
    return P.PODERES_PARANORMAIS.map(function (e) {
      var cand = candidato(e, c.percurso, c.etapa, ordem);
      var el = e.elemento;
      var af = afinidadeNaEtapa(ordem, c.percurso, c.etapa);
      cand.segundaComAfinidade = cand.repeticao.ok && cand.repeticao.afinidade;
      cand.elementoAfinidade = af.elemento === el && !!el;
      return cand;
    });
  }

  function candidatosOutraClasse(ordem, idVaga, contexto) {
    var c = contextoDaVaga(ordem, idVaga, contexto);
    if (!c) return [];
    return P.PODERES_CLASSE.filter(function (e) { return ehDeOutraClasse(e, ordem.classe); }).map(function (e) {
      return candidato(e, c.percurso, c.etapa, ordem);
    });
  }

  function candidatosTrilha(ordem, idVaga, contexto, excluirPropria) {
    var c = contextoDaVaga(ordem, idVaga, contexto);
    var classeAlvo = ordem.classe;
    return C.trilhasDaClasse(classeAlvo).filter(function (tr) {
      return !excluirPropria || tr.chave !== ordem.trilha;
    }).map(function (tr) {
      var reqs = (tr.requisitos || []).map(function (r) {
        return c ? requisito(r, c.percurso, c.etapa, {}, ordem) : { ok: true, texto: "", falta: "" };
      });
      var motivos = reqs.filter(function (r) { return !r.ok; }).map(function (r) { return "Requisito: " + r.falta + "."; });
      return { trilha: tr, requisitos: reqs, disponivel: !motivos.length, motivos: motivos, primeira: P.primeiraDaTrilha(tr.chave) };
    });
  }

  function candidatosAtributo(ordem, idVaga, contexto) {
    var c = contextoDaVaga(ordem, idVaga, contexto);
    if (!c) return [];
    var teto = C.GERACAO_ATRIBUTOS.maximoPorAumento;
    return C.ATRIBUTOS.map(function (a) {
      var atual = c.percurso.atributos[a.chave] || 0;
      return {
        atributo: a,
        atual: atual,
        novo: atual + 1,
        disponivel: atual < teto,
        motivos: atual < teto ? [] : [a.nome + " já está em " + atual + ". O aumento de atributo não passa de " + teto + "."],
      };
    });
  }

  /* modo: "grau" (Grau de Treinamento), "treinamento" (Treinamento em
     Perícia), "perito", "treinar" (ponto de Intelecto), "livre". */
  function candidatosPericia(ordem, idVaga, contexto, modo, filtro) {
    var c = contextoDaVaga(ordem, idVaga, contexto);
    var f = filtro || {};
    var p = c ? c.percurso : novoPercurso(ordem);
    var etapa = c ? c.etapa : { nex: 5, separado: false, rotulo: "" };

    return C.PERICIAS.filter(function (pe) {
      if (f.entre && f.entre.indexOf(pe.chave) < 0) return false;
      return true;
    }).map(function (pe) {
      var atual = p.graus[pe.chave] || 0;
      var motivo = "";
      if (f.exceto && f.exceto.indexOf(pe.chave) >= 0) motivo = pe.nome + " não pode ser escolhida aqui.";
      else if (modo === "grau") motivo = motivoParaSubir(atual, etapa, pe.chave, false);
      else if (modo === "treinamento") motivo = motivoParaSubir(atual, etapa, pe.chave, true);
      else if (modo === "perito") {
        if (pe.chave === "luta" || pe.chave === "pontaria") motivo = "Perito não vale para Luta nem Pontaria.";
        else if (atual < 1) motivo = pe.nome + " não é treinada.";
      } else if (modo === "treinar") {
        if (atual >= 1) motivo = pe.nome + " já é treinada.";
      } else if (modo === "treinada") {
        if (atual < 1) motivo = pe.nome + " não é treinada.";
      }
      return {
        pericia: pe,
        grau: GRAUS[atual],
        novoGrau: (modo === "grau" || modo === "treinamento" || modo === "treinar") && !motivo ? GRAUS[Math.min(3, atual + 1)] : "",
        disponivel: !motivo,
        motivos: motivo ? [motivo] : [],
      };
    });
  }

  function quantasNoGrau(ordem, idVaga, contexto) {
    var c = contextoDaVaga(ordem, idVaga, contexto);
    var classe = C.classe(ordem.classe);
    var base = classe && classe.grauTreinamentoBase !== undefined ? classe.grauTreinamentoBase : 0;
    var intelecto = c ? (c.percurso.atributos.int || 0) : 0;
    return { total: Math.max(0, base + intelecto), base: base, intelecto: intelecto };
  }

  /* Avalia um candidato completo SEM mexer na ficha: a mesma conta do
     estado, numa cópia com o registro no lugar. É o que a tela usa para
     dizer "faltam 2" e "isto vai invalidar aquilo". */
  function simular(ordem, v, candidatoRegistro, contexto) {
    var copia = JSON.parse(JSON.stringify(ordem));
    var reg = registrar(copia, v, candidatoRegistro);
    var depois = percorrer(copia, contexto, null);
    var aval = depois.avaliacoes[reg.id] || { valido: false, completo: false, motivos: [], faltam: [] };
    return { ordem: copia, registro: reg, estado: depois, avaliacao: aval };
  }

  /* O que muda ao trocar uma escolha: poderes que saem, poderes que
     entram e escolhas que deixam de cumprir requisito por causa disso. */
  function impacto(ordem, v, candidatoRegistro, contexto) {
    var antes = percorrer(ordem, contexto, null);
    var sim = simular(ordem, v, candidatoRegistro, contexto);
    var depois = sim.estado;

    function nomesDe(est, idRegistro) {
      return est.adquiridos.filter(function (a) { return vale(a) && a.registroId === idRegistro; })
        .map(function (a) { return a.nome; });
    }

    var existente = (ordem.escolhas || []).filter(function (r) { return r.etapa === v.id; })[0];
    var saem = existente ? nomesDe(antes, existente.id) : [];
    var entram = nomesDe(depois, sim.registro.id);

    var invalidados = [];
    Object.keys(depois.avaliacoes).forEach(function (id) {
      if (id === sim.registro.id) return;
      var a = antes.avaliacoes[id];
      var d = depois.avaliacoes[id];
      if (a && vale(a) && a.completo && d && !d.valido) {
        var r = (ordem.escolhas || []).filter(function (x) { return x.id === id; })[0];
        invalidados.push({ registro: r, motivos: d.motivos });
      }
    });

    return {
      saem: saem.filter(function (n) { return entram.indexOf(n) < 0; }),
      entram: entram.filter(function (n) { return saem.indexOf(n) < 0; }),
      invalidados: invalidados,
      avaliacao: sim.avaliacao,
    };
  }

  /* =================================================================
     HABILIDADES AUTOMÁTICAS VISÍVEIS
     ================================================================= */

  function automaticas(ordem) {
    var classe = C.classe(ordem.classe);
    if (!classe) return [];
    var t = R().trilho(ordem);
    return P.AUTOMATICAS.filter(function (a) {
      return a.classes.indexOf(classe.chave) >= 0 && t.nexEquivalente >= (P.NEX_INICIAL_AUTOMATICA[a.chave] || 5);
    }).map(function (a) {
      var estagios = P.ESTAGIOS[a.chave] || [];
      var atual = null;
      estagios.forEach(function (s) { if (t.nexEquivalente >= s.nex) atual = s; });
      return { entrada: a, estagio: atual ? atual.texto : "" };
    });
  }

  global.RAMAOrdemProgressao = {
    TIPOS: TIPOS,
    GRAUS: GRAUS,
    ELEMENTOS_PODER: ELEMENTOS_PODER,

    degrauDoNex: degrauDoNex,
    nexDoDegrau: nexDoDegrau,
    degrauDeExposicao: degrauDeExposicao,
    rotuloDoDegrau: rotuloDoDegrau,

    vagas: vagas,
    estado: estado,
    estadoAntes: estadoAntes,

    normalizarEscolhas: normalizarEscolhas,
    registrar: registrar,
    remover: remover,
    definirIgnorarRequisitos: definirIgnorarRequisitos,
    descrever: descrever,
    nomeDoPoder: nomeDoPoder,

    candidatosPoderClasse: candidatosPoderClasse,
    candidatosParanormais: candidatosParanormais,
    candidatosOutraClasse: candidatosOutraClasse,
    candidatosTrilha: candidatosTrilha,
    candidatosAtributo: candidatosAtributo,
    candidatosPericia: candidatosPericia,
    quantasNoGrau: quantasNoGrau,

    simular: simular,
    impacto: impacto,
    automaticas: automaticas,
    textosDosRequisitos: textosDosRequisitos,
  };
})(typeof window !== "undefined" ? window : globalThis);
