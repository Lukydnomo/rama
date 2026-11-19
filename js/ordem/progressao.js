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
                 t2.transcenderItem    Transcender com Itens, 2º
                                       intervalo de NEX (regra opcional
                                       de Arquivos Secretos 1)
                 afinidade             a afinidade elemental
                 d1.rituaisIniciais    os três rituais de 1º círculo do
                                       ocultista
                 d4.ritualClasse       o ritual do avanço de NEX
                 d8.grimorio           o grimório de Graduado
                 d20.conhecendoOMedo   o ritual que a trilha concede
                                       pelo nome

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
  var A = global.RAMAOrdemAprendizado;

  /* As outras camadas são lidas na hora da chamada, não na carga do
     arquivo: regras.js carrega depois deste e é quem decide o trilho. */
  function R() { return global.RAMAOrdemRegras; }
  function OP() { return global.RAMAOrdemOpcionais; }

  var GRAUS = ["destreinado", "treinado", "veterano", "expert"];
  /* OPRPG p.26: veterano a partir de NEX 35%, expert a partir de 70%. */
  var NEX_DO_GRAU = [0, 0, 35, 70];

  var ELEMENTOS_PODER = ["conhecimento", "energia", "morte", "sangue"];
  var PROFUNDIDADE_MAXIMA = 4;

  /* A profundidade do que uma escolha GUARDA é outra conta: o caminho
     mais fundo que as regras produzem é Versatilidade → Transcender →
     Aprender Ritual → substituição → o ritual que entra → id, sete
     níveis abaixo de `opcoes`. Até a v2.17 o limite de limpeza era 4, e
     Versatilidade → Transcender → Aprender Ritual perdia o ritual e o
     elemento na primeira gravação. */
  var PROFUNDIDADE_DE_OPCOES = 8;

  /* =================================================================
     TIPOS DE VAGA
     ================================================================= */

  var TIPOS = {
    trilhaSobrevivente: {
      rotulo: "Trilha de sobrevivente", verbo: "Escolher trilha",
      explicacao: "No 2º estágio, escolha uma das trilhas de sobrevivente: Durão, Esperto ou Esotérico. A primeira habilidade vem agora; a segunda, no 4º estágio (Sobrevivendo ao Horror, p. 31).",
    },
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
    /* Evolução Modular (AS6 p. 80): as vagas modulares são vagas de
       poder de classe (o tipo é o mesmo, para a escolha, a avaliação e a
       tela), com `grupoModular` e ids próprios — d<degrau>.poderCombate e
       d<degrau>.poderUtilidade —, que nunca colidem com d<degrau>.poderClasse. */
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
    transcenderItem: {
      rotulo: "Transcender com item amaldiçoado", verbo: "Resolver",
      explicacao: "Com a regra opcional Transcender com Itens (Arquivos Secretos 1, p. 56-57), um item amaldiçoado pode render um poder paranormal do mesmo elemento: um por intervalo de NEX. O item perde os efeitos e vira mundano.",
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
    trilhaElite: {
      rotulo: "Habilidade de trilha (elite)", verbo: "Escolher habilidade",
      explicacao: "Ao se tornar agente de elite, você recebe mais uma habilidade da trilha, à sua escolha entre a terceira e a quarta (Sobrevivendo ao Horror, p. 110-112).",
    },
    rituais: {
      rotulo: "Rituais", verbo: "Escolher rituais",
      explicacao: "Escolha os rituais que esta etapa concede. A biblioteca abre no contexto desta concessão.",
    },
  };

  /* A posição de cada tipo dentro do mesmo degrau. Aumento de atributo
     vem antes de Versatilidade para um poder escolhido ali já enxergar
     o atributo aumentado. */
  var POSICAO = {
    poderOrigem: 1, trilha: 5, trilhaElite: 6, trilhaAuto: 10, opcoesBeneficio: 11, perito: 15,
    poderClasse: 20, atributo: 30, grauTreinamento: 40, versatilidade: 50,
    /* Depois do aumento de atributo do mesmo degrau: o grimório guarda
       "rituais iguais ao seu Intelecto", e o Intelecto que vale é o
       daquela etapa, já aumentado. */
    rituais: 55,
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

  /* -----------------------------------------------------------------
     EVOLUÇÃO POR PATENTES (regra opcional, SAH p. 108-112)

     Os degraus são os limites de PD de cada patente (1, 3, 6, 10, 15):
     é o "nível" que a p. 109 manda usar em pré-requisitos e efeitos de
     origem e classe. As vagas da patente têm ids próprios —
     p<índice>.<tipo> — e nunca colidem com as do NEX (d<degrau>.<tipo>):
     ligar e desligar a regra não apaga escolha nenhuma. As exceções
     são as do recruta que existem igual nas duas progressões — os
     rituais iniciais (d1.rituaisIniciais) e Perito (d1.perito).

     A trilha: a 1ª habilidade em agente especial, a 2ª em oficial de
     operações e, em agente de elite, a 3ª OU a 4ª, à escolha (vaga
     p4.trilhaElite). A outra nunca chega.
     ----------------------------------------------------------------- */

  var ID_ELITE = "p4.trilhaElite";

  function patenteDoDegrau(d) { return C.patenteDaEvolucao(C.indiceDoDegrauDePatente(d)); }
  function rotuloDaEtapaDePatente(indice) { return C.patenteDaEvolucao(indice).nome; }

  /* A habilidade escolhida na elite (a chave), lida das escolhas. */
  function escolhaDeElite(ordem) {
    var achada = null;
    (ordem && ordem.escolhas || []).forEach(function (r) {
      if (r && r.etapa === ID_ELITE && (!achada || String(r.registradoEm || "") > String(achada.registradoEm || ""))) achada = r;
    });
    return achada ? String(achada.valor || "") : "";
  }

  /* As duas habilidades que a elite oferece (a 3ª e a 4ª, pelo NEX). */
  function opcoesDeElite(chaveTrilha) {
    var habs = P.habilidadesDaTrilha(chaveTrilha).slice().sort(function (a, b) { return a.nex - b.nex; });
    return habs.slice(2, 4);
  }

  /* O degrau em que uma habilidade de trilha chega; Infinity = não chega. */
  function degrauDaHabilidadeDeTrilha(ordem, h, t) {
    if (!t || !t.porPatente) return degrauDoNex(h.nex);
    var habs = P.habilidadesDaTrilha(h.trilha).slice().sort(function (a, b) { return a.nex - b.nex; });
    var i = habs.map(function (x) { return x.chave; }).indexOf(h.chave);
    if (i === 0) return C.degrauDaPatente(2);
    if (i === 1) return C.degrauDaPatente(3);
    if (i === 2 || i === 3) return escolhaDeElite(ordem) === h.chave ? C.degrauDaPatente(4) : Infinity;
    return Infinity;
  }

  /* O degrau equivalente a um NEX de habilidade de trilha (para os
     rituais concedidos por trilha): o da habilidade daquele NEX. */
  function degrauDeTrilhaPorNex(ordem, t, nex) {
    if (!t || !t.porPatente) return nex >= 99 ? 20 : Math.round(nex / 5);
    var tr = ordem && ordem.trilha;
    var h = tr ? P.habilidadesDaTrilha(tr).filter(function (x) { return x.nex === nex; })[0] : null;
    return h ? degrauDaHabilidadeDeTrilha(ordem, h, t) : Infinity;
  }

  /* As vagas da classe numa progressão por patente. */
  function vagasDePatente(ordem, t, classe) {
    var lista = [];
    var tab = C.EVOLUCAO_PATENTES.classes[classe.chave];
    if (!tab) return lista;
    var ref = "Sobrevivendo ao Horror, p. " + tab.pagina;
    tab.patentes.forEach(function (pt, indice) {
      if (indice > t.patente) return;
      var d = C.degrauDaPatente(indice);
      var rotuloEtapa = rotuloDaEtapaDePatente(indice);
      pt.escolhas.forEach(function (tipo) {
        var extra = { degrau: d, ordem: d * 100 + (POSICAO[tipo] || 60), rotuloEtapa: rotuloEtapa, patente: indice, porPatente: true };
        if (tipo === "atributo") {
          extra.maximo = C.EVOLUCAO_PATENTES.maximoDeAtributo;
          extra.fonteTexto = ref;
          extra.explicacao = "Aumente um atributo em +1. Você não pode aumentar um atributo além de 4 desta forma (" + ref + ").";
        }
        if (tipo === "grauTreinamento") {
          extra.explicacao = "Escolha perícias treinadas, tantas quanto " + classe.grauTreinamentoBase + " + Intelecto: o grau sobe um (de treinado para veterano ou de veterano para expert, " + ref + ").";
        }
        if (tipo === "trilha") extra.explicacao = "Escolha uma trilha da sua classe. A 1ª habilidade vem agora; a 2ª em oficial de operações; em agente de elite, a 3ª ou a 4ª, à sua escolha (" + ref + ").";
        if (tipo === "poderClasse") extra.explicacao = "Escolha um poder da sua classe — ou, pelo Sobrevivendo ao Horror, um poder geral (" + ref + ").";
        /* Perito do recruta é a mesma vaga do NEX 5%: o mesmo id. */
        var id = tipo === "perito" ? "d1.perito" : "p" + indice + "." + tipo;
        lista.push(vaga(id, tipo, extra));
      });
    });
    return lista;
  }

  /* =================================================================
     ESTÁGIOS DO SOBREVIVENTE E A TRANSIÇÃO
     -----------------------------------------------------------------
     O Sobrevivente não tem degraus de NEX: tem estágios (SAH p. 30-31).
     As vagas dele ficam ANTES do 1º degrau de agente, na ordem dos
     estágios — depois da origem —, com ids próprios:

       s2.trilha           a trilha de sobrevivente
       s3.atributo         o aumento de atributo do 3º estágio (teto 3)
       b.esperto, b.entendido, b.cicatrizado
                           as habilidades com escolha
       s4.iniciado         o ritual de Iniciado (concessão de ritual)

     Virar agente abre as vagas da transição, entre a fase anterior e o
     1º degrau da classe nova:

       t.atributo          o ponto de atributo do Mundano (teto 3)
       t.treinamento       as perícias da transição

     Um Sobrevivente que virou agente continua com as vagas dos estágios
     que alcançou: "mantém todas as habilidades já recebidas" (SAH p. 32).
     ================================================================= */

  function estagioDaFase(ordem) {
    var f = R().faseDe(ordem);
    if (f.perfil === "sobrevivente") return f.estagio;
    if (f.anterior === "sobrevivente") return f.estagioAnterior;
    return 0;
  }

  /* A posição na ordem das vagas: depois da origem (101) e antes do 1º
     degrau de agente (105 em diante). */
  function ordemDoEstagio(e, pos) { return 101 + e * 0.1 + (pos || 0) * 0.001; }
  var ORDEM_DA_TRANSICAO = 101.9;

  function trilhaSobreviventeDe(ordem) {
    var r = (ordem.escolhas || []).filter(function (x) { return x.etapa === "s2.trilha"; })
      .sort(function (a, b) { return String(b.registradoEm || "").localeCompare(String(a.registradoEm || "")); })[0];
    return r && C.trilhaSobrevivente(r.valor) ? r.valor : "";
  }

  function rotuloDoEstagio(e) { return "Estágio " + e; }

  /* =================================================================
     VAGAS
     ================================================================= */

  /* A tabela "Limite de Poderes Paranormais (por Itens)", AS1 p. 57. */
  var INTERVALOS_DE_TRANSCENDER_ITEM = [
    { de: 0, ate: 25 },
    { de: 26, ate: 50 },
    { de: 51, ate: 75 },
    { de: 76, ate: 99 },
  ];

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
      soTranscender: false,
    }, extra || {});
  }

  /* -----------------------------------------------------------------
     O POSSUÍDO NÃO ESCOLHE PODER DE OCULTISTA

     "Sempre que receber um novo poder de ocultista, em vez disso você
     recebe o poder Transcender" (Poder Não Desejado, SAH p.28). A
     habilidade chega em NEX 10%, antes do primeiro poder de ocultista
     (NEX 15%), então a troca vale para TODAS as vagas de poder de
     ocultista — e para o poder de ocultista da Versatilidade (OPRPG
     p.34), que é a mesma coisa por outra porta.

     Poder geral entra na troca porque o Sobrevivendo ao Horror o define
     como poder de todas as classes (SAH p.33): recebê-lo é receber um
     poder de ocultista.

     O que NÃO é poder de ocultista continua livre: o primeiro poder de
     outra trilha (Versatilidade e Ele Me Ensina), poder de outra classe
     e poder paranormal.

     Com NEX & Experiência ligada, Transcender deixa de ser poder de
     classe (SAH p.98): não há poder para receber no lugar, o livro não
     diz o que acontece, e a vaga fica livre — a troca fica com a mesa.
     ----------------------------------------------------------------- */

  var TRILHA_SO_TRANSCENDE = "possuido";
  var NEX_DA_TROCA = 10;
  var VAGAS_DA_TROCA = { poderClasse: true, versatilidade: true };

  /* -----------------------------------------------------------------
     EVOLUÇÃO MODULAR (Arquivos Secretos 6, p. 80-81 — conteúdo de fã)

     Utilidade em NEX 10% e a cada NEX "par" seguinte (20%, 30%… 90% e
     99%, os degraus pares); combate em 15% e a cada "ímpar" seguinte
     (25%… 95%, os degraus ímpares a partir do 3). Em NEX 55% (degrau 11):
     cinco de cada; em 99% (degrau 20): dez de utilidade e nove de
     combate — o que o próprio livro conta para o nível 20.

     Só para quem tem a progressão comum de agente (a tabela da classe);
     Mundano e Sobrevivente não ganham vaga. Com NEX & Experiência, os
     degraus são os níveis. Ligar não move nada: as escolhas normais
     ficam guardadas até a pessoa associá-las (associarModular).
     ----------------------------------------------------------------- */

  var GRUPOS_MODULARES = { combate: "poderCombate", utilidade: "poderUtilidade" };
  var ROTULO_MODULAR = { combate: "Poder de combate", utilidade: "Poder de utilidade" };

  function modularLigada(ordem) {
    if (!ordem || !(OP() && OP().ligada(ordem, "evolucaoModular"))) return false;
    var classe = C.classe(ordem.classe);
    return !!(classe && C.progressaoDaClasse(classe.chave).length);
  }

  function grupoDoDegrau(d) {
    if (d >= 2 && d % 2 === 0) return "utilidade";
    if (d >= 3 && d % 2 === 1) return "combate";
    return "";
  }

  function ajustesModulares(ordem) {
    var a6 = ordem && ordem.arquivo6;
    return (a6 && a6.modular && a6.modular.grupos) || {};
  }

  function vagasModulares(ordem, t) {
    var lista = [];
    for (var d = 2; d <= Math.min(20, t.passos); d++) {
      var g = grupoDoDegrau(d);
      if (!g) continue;
      var extra = {
        degrau: d,
        ordem: d * 100 + POSICAO.poderClasse,
        rotuloEtapa: rotuloDoDegrau(d, t.separado),
        grupoModular: g,
        rotulo: ROTULO_MODULAR[g] + " (Evolução Modular)",
        explicacao: "Evolução Modular (AS6 p. 80, regra de fã): escolha um poder de " + g + " da sua classe — ou um poder geral (SaH p. 33).",
      };
      if (trocaPorTranscender(ordem, "poderClasse", d)) {
        extra.soTranscender = true;
        extra.rotulo = ROTULO_MODULAR[g] + " → Transcender";
        extra.explicacao = MOTIVO_TROCA + " Escolha o poder paranormal que vem com ele.";
      }
      lista.push(vaga("d" + d + "." + GRUPOS_MODULARES[g], "poderClasse", extra));
    }
    return lista;
  }
  var MOTIVO_TROCA = "Poder Não Desejado (Sobrevivendo ao Horror, p. 28): todo novo poder de ocultista vira Transcender.";

  /* A trilha usa a Progressão de NEX da regra NEX & Experiência mesmo
     sem a regra (AS7 p. 81 e 85). */
  function usaProgressaoDeNex(ordem) {
    var tr = ordem && ordem.trilha ? C.trilha(ordem.trilha) : null;
    return !!(tr && tr.progressaoDeNex && C.trilhaServe(tr, ordem.classe, ordem));
  }

  function soTranscende(ordem) {
    if (!ordem || ordem.trilha !== TRILHA_SO_TRANSCENDE) return false;
    var tr = C.trilha(ordem.trilha);
    if (!tr || tr.classe !== ordem.classe) return false;
    return !(OP() && OP().ligada(ordem, "nexExperiencia"));
  }

  function trocaPorTranscender(ordem, tipo, degrau) {
    return !!VAGAS_DA_TROCA[tipo] && degrau >= degrauDoNex(NEX_DA_TROCA) && soTranscende(ordem);
  }

  function vagas(ordem) {
    var lista = [];
    if (!ordem) return lista;

    var t = R().trilho(ordem);
    var exposicao = R().exposicao(ordem);
    var classe = C.classe(ordem.classe);

    var modular = modularLigada(ordem);

    if (classe && t.porPatente) {
      vagasDePatente(ordem, t, classe).forEach(function (v) { lista.push(v); });
    }
    if (classe && !t.porPatente) {
      C.progressaoDaClasse(classe.chave).forEach(function (etapa) {
        var d = degrauDoNex(etapa.nex);
        if (d > t.passos) return;
        (etapa.escolhas || []).forEach(function (tipo) {
          /* Evolução Modular: as vagas "Poder" saem (entram as modulares,
             abaixo); a Versatilidade muda de texto e de opções. */
          if (modular && tipo === "poderClasse") return;
          var extra = {
            degrau: d,
            ordem: d * 100 + (POSICAO[tipo] || 60),
            rotuloEtapa: rotuloDoDegrau(d, t.separado),
          };
          if (modular && tipo === "versatilidade") {
            extra.modular = true;
            extra.rotulo = "Versatilidade (Evolução Modular)";
            extra.explicacao = "Evolução Modular (AS6 p. 80): em NEX 50%, você recebe o primeiro poder de uma trilha da sua classe que não a sua — a opção do poder de classe sai.";
          }
          if (trocaPorTranscender(ordem, tipo, d)) {
            extra.soTranscender = true;
            if (tipo === "poderClasse") {
              extra.rotulo = "Poder de ocultista → Transcender";
              extra.explicacao = MOTIVO_TROCA + " Escolha o poder paranormal que vem com ele.";
            } else {
              extra.explicacao = "Escolha entre o poder de ocultista — que, para o Possuído, é Transcender — e o primeiro poder de uma trilha de ocultista que não a sua.";
            }
          }
          lista.push(vaga("d" + d + "." + tipo, tipo, extra));
        });
      });
      if (modular) vagasModulares(ordem, t).forEach(function (v) { lista.push(v); });
    }
    if (classe) {
      var trilha = C.trilha(ordem.trilha);
      if (trilha && C.trilhaServe(trilha, classe.chave, ordem)) {
        P.habilidadesDaTrilha(trilha.chave).forEach(function (h) {
          var d = degrauDaHabilidadeDeTrilha(ordem, h, t);
          if (d > t.passos || !h.opcoes.length) return;
          lista.push(vaga("b." + h.chave, "opcoesBeneficio", {
            degrau: d,
            ordem: d * 100 + POSICAO.opcoesBeneficio,
            rotulo: h.nome,
            explicacao: h.resumo,
            beneficio: h.chave,
            rotuloEtapa: t.porPatente ? patenteDoDegrau(d).nome : rotuloDoDegrau(d, t.separado),
          }));
        });
      }
    }

    var origem = C.origem(ordem.origem);
    if (origem && (origem.escolha || (Array.isArray(origem.escolhas) && origem.escolhas.length))) {
      lista.push(vaga("b.origem." + origem.chave, "poderOrigem", {
        degrau: 1,
        ordem: 100 + POSICAO.poderOrigem,
        rotulo: origem.poder,
        explicacao: origem.resumo,
        origem: origem.chave,
        rotuloEtapa: "Origem",
      }));
    }

    /* Os estágios do Sobrevivente — de quem é, ou de quem foi e virou
       agente. */
    var estagio = estagioDaFase(ordem);
    if (estagio) {
      var comum = { degrau: 0, nexEtapa: 0 };
      if (estagio >= 2) {
        lista.push(vaga("s2.trilha", "trilhaSobrevivente", Object.assign({}, comum, {
          estagio: 2, ordem: ordemDoEstagio(2, POSICAO.trilha), rotuloEtapa: rotuloDoEstagio(2),
        })));
      }
      var trilhaS = estagio >= 2 ? trilhaSobreviventeDe(ordem) : "";
      if (trilhaS) {
        P.habilidadesDaTrilhaSobrevivente(trilhaS).forEach(function (h) {
          if (h.estagio > estagio || !h.opcoes.length) return;
          lista.push(vaga("b." + h.chave, "opcoesBeneficio", Object.assign({}, comum, {
            estagio: h.estagio, ordem: ordemDoEstagio(h.estagio, POSICAO.opcoesBeneficio),
            rotulo: h.nome, explicacao: h.resumo, beneficio: h.chave, rotuloEtapa: rotuloDoEstagio(h.estagio),
          })));
        });
      }
      if (estagio >= 3) {
        lista.push(vaga("s3.atributo", "atributo", Object.assign({}, comum, {
          estagio: 3, ordem: ordemDoEstagio(3, POSICAO.atributo), rotuloEtapa: rotuloDoEstagio(3),
          maximo: 3, fonteTexto: "Sobrevivendo ao Horror, p. 31",
          explicacao: "Aumente um atributo em +1, sem passar de 3. Vigor aumentado aumenta os PV; Presença, os PE; Intelecto, treina uma perícia nova (Sobrevivendo ao Horror, p. 31).",
        })));
      }
      if (estagio >= 5) {
        var cic = P.poder("cicatrizado");
        lista.push(vaga("b.cicatrizado", "opcoesBeneficio", Object.assign({}, comum, {
          estagio: 5, ordem: ordemDoEstagio(5, POSICAO.opcoesBeneficio), rotuloEtapa: rotuloDoEstagio(5),
          rotulo: cic ? cic.nome : "Cicatrizado", explicacao: cic ? cic.resumo : "", beneficio: "cicatrizado",
        })));
      }
    }

    /* A transição para agente: o que ela pede para escolher. */
    var fase = R().faseDe(ordem);
    if (fase.transicao) {
      var tr = C.TRANSICOES[fase.anterior];
      var treino = P.treinamento(fase.anterior, ordem.classe);
      if (treino) {
        lista.push(vaga("t.treinamento", "opcoesBeneficio", {
          degrau: 1, ordem: ORDEM_DA_TRANSICAO + POSICAO.opcoesBeneficio * 0.001,
          rotulo: treino.nome, explicacao: treino.resumo, beneficio: treino.chave, rotuloEtapa: tr.titulo,
        }));
      }
      if (tr.atributo) {
        lista.push(vaga("t.atributo", "atributo", {
          degrau: 1, ordem: ORDEM_DA_TRANSICAO + POSICAO.atributo * 0.001, rotuloEtapa: tr.titulo,
          rotulo: "Ponto de atributo do treinamento", maximo: tr.atributo.maximo,
          fonteTexto: "Ordem Paranormal RPG, p. 172",
          explicacao: "Ao fim do treinamento, você recebe 1 ponto de atributo, mas não pode usá-lo para passar um atributo de 3 (Ordem Paranormal RPG, p. 172).",
        }));
      }
    }

    /* Com NEX & Experiência, a exposição abre as próprias vagas. As
       variantes de Monstruoso do Arquivos Secretos 7 (p. 81 e 85) usam a
       Progressão de NEX MESMO com a regra desligada: as alterações por
       NEX vêm pelo NEX da ficha, com os mesmos ids (ligar e desligar a
       regra não perde a escolha). Transcender pela exposição é outra
       coisa — com a regra desligada, ele continua sendo poder de classe —
       e não é aberto aqui. */
    var pelaTrilha = !t.separado && usaProgressaoDeNex(ordem);
    if (t.separado || pelaTrilha) {
      P.ALTERACOES_GERAIS.forEach(function (a) {
        if (exposicao < a.nex) return;
        lista.push(vaga("x" + a.nex + ".alteracao", "alteracao", {
          degrau: a.nex / 5,
          ordem: (a.nex / 5) * 100 + 58,
          rotulo: a.nome,
          explicacao: a.resumo + (pelaTrilha ? " (Progressão de NEX da trilha Monstruoso, Arquivos Secretos 7.)" : ""),
          beneficio: a.chave,
          nexExposicao: a.nex,
          rotuloEtapa: pelaTrilha ? "NEX " + a.nex + "% · Progressão de NEX" : "NEX de exposição " + a.nex + "%",
        }));
      });
    }
    if (t.separado) {
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

    /* Transcender com Itens (regra opcional, AS1 p. 56-57): um poder
       paranormal por item amaldiçoado a cada intervalo de NEX — o limite
       acumulado é 1, 2, 3 e 4. A vaga mora no começo do intervalo, e é
       lá que os requisitos do poder são conferidos. */
    if (OP() && OP().ligada(ordem, "transcenderComItens")) {
      INTERVALOS_DE_TRANSCENDER_ITEM.forEach(function (faixa, i) {
        if (exposicao < faixa.de) return;
        var degrauDaFaixa = Math.max(1, Math.ceil(faixa.de / 5));
        lista.push(vaga("t" + (i + 1) + ".transcenderItem", "transcenderItem", {
          degrau: degrauDaFaixa,
          ordem: degrauDaFaixa * 100 + 57,
          opcional: true,
          nexExposicao: Math.max(5, faixa.de),
          rotuloEtapa: "NEX de exposição " + faixa.de + "–" + faixa.ate + "%",
        }));
      });
    }

    vagasDeRitual(ordem, t).forEach(function (v) { lista.push(v); });

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

  /* -----------------------------------------------------------------
     AS VAGAS DE APRENDIZADO DE RITUAL

     Uma vaga por CONCESSÃO — não uma por ritual e não uma por degrau.
     Classe e trilha aparecem separadas mesmo caindo no mesmo degrau,
     porque são benefícios diferentes, com contagens e círculos
     diferentes (OPRPG p.32 e p.35).
     ----------------------------------------------------------------- */

  function elementoDaMaldicao(ordem) {
    var r = (ordem.escolhas || []).filter(function (x) { return x.etapa === "b.serAmaldicoado"; })[0];
    return (r && r.opcoes && typeof r.opcoes.elemento === "string") ? r.opcoes.elemento : "";
  }

  /* O elemento do ritual que feriu o personagem (Ferido por Ritual, AS1
     p. 43): é a escolha da vaga da origem, e só vale enquanto a origem
     for essa. Sem o elemento, a Mácula ainda não sabe o que conceder. */
  function elementoDaMacula(ordem) {
    if (ordem.origem !== "feridoPorRitual") return "";
    var r = (ordem.escolhas || []).filter(function (x) { return x.etapa === "b.origem.feridoPorRitual"; })[0];
    var el = (r && r.opcoes && typeof r.opcoes.elemento === "string") ? r.opcoes.elemento : "";
    return ELEMENTOS_PODER.indexOf(el) >= 0 ? el : "";
  }

  function contextoDeConcessao(ordem, t) {
    var estagio = estagioDaFase(ordem);
    return {
      /* Iniciado (SAH p. 32): 4º estágio da trilha Esotérico. Vale mesmo
         em NEX 0%, e continua valendo depois de virar agente. */
      iniciado: estagio >= 4 && trilhaSobreviventeDe(ordem) === "esoterico",
      classe: ordem.classe,
      trilha: trilhaValida(ordem) ? ordem.trilha : "",
      passos: t.passos,
      separado: t.separado,
      porPatente: !!t.porPatente,
      patente: t.porPatente ? t.patente : -1,
      /* O degrau de uma habilidade de trilha pelo NEX dela (os rituais
         concedidos pela trilha chegam com a habilidade). */
      degrauDaTrilha: function (nex) { return degrauDeTrilhaPorNex(ordem, t, nex); },
      lento: !!(OP() && A && OP().ligada(ordem, A.REGRA_LENTO)),
      campo: !!(OP() && A && OP().ligada(ordem, A.REGRA_CAMPO)),
      elementoMaldicao: elementoDaMaldicao(ordem),
      macula: elementoDaMacula(ordem),
      dominadas: dominadasDe(ordem),
      /* Paralinguística Ampliada (AS5 p. 57): o degrau em que o poder foi
         escolhido — ele concede Compreensão Paranormal pelo nome. */
      paralinguistica: degrauDoPoder(ordem, "paralinguisticaAmpliada"),
    };
  }

  /* O primeiro degrau em que um poder foi escolhido, lido direto das
     escolhas (sem montar o estado — quem pergunta é a própria montagem). */
  function degrauDoPoder(ordem, chave) {
    var achado = 0;
    (ordem.escolhas || []).forEach(function (r) {
      var m = /^d(\d+)\./.exec(String(r && r.etapa || ""));
      var mp = /^p(\d)\./.exec(String(r && r.etapa || ""));
      if (!m && !mp) return;
      var degrau = m ? Number(m[1]) : C.degrauDaPatente(parseInt(mp[1], 10));
      (function andar(v, prof) {
        if (!v || typeof v !== "object" || prof > 6) return;
        if (v.valor === chave && (!achado || degrau < achado)) achado = degrau;
        Object.keys(v).forEach(function (k) { if (v[k] && typeof v[k] === "object") andar(v[k], prof + 1); });
      })({ valor: r.valor, opcoes: r.opcoes }, 0);
    });
    return achado;
  }

  /* A trilha só concede o que concede quando é uma trilha DA CLASSE da
     ficha — trocar de classe não mantém o grimório de pé sozinho. */
  function trilhaValida(ordem) {
    var tr = C.trilha(ordem.trilha);
    return !!(tr && C.trilhaServe(tr, ordem.classe, ordem));
  }

  /* Uma trilha geral (AS3 p. 119) escolhida fora da classe dela, com a
     regra Trilha Geral desligada: fica guardada, sem efeito. */
  function trilhaSuspensa(ordem) {
    var tr = C.trilha(ordem && ordem.trilha);
    return !!(tr && tr.geral && tr.classe !== ordem.classe && !C.trilhaServe(tr, ordem.classe, ordem));
  }

  function concessoesDeRitual(ordem) {
    if (!A || !ordem) return [];
    return A.concessoes(contextoDeConcessao(ordem, R().trilho(ordem)));
  }

  function vagasDeRitual(ordem, t) {
    if (!A) return [];
    return A.concessoes(contextoDeConcessao(ordem, t)).map(function (c) {
      return vaga(c.id, "rituais", {
        degrau: c.degrau,
        ordem: c.estagio ? ordemDoEstagio(c.estagio, POSICAO.rituais) : c.degrau * 100 + POSICAO.rituais,
        estagio: c.estagio || 0,
        nexEtapa: c.estagio ? 0 : undefined,
        rotulo: A.rotuloDaConcessao(c),
        verbo: c.fixo ? "Trazer ritual" : "Escolher rituais",
        explicacao: A.explicacaoDaConcessao(c),
        rotuloEtapa: c.rotuloEtapa || (c.estagio ? rotuloDoEstagio(c.estagio) : rotuloDoDegrau(c.degrau, t.separado)),
        opcional: c.opcional,
        concessao: c,
      });
    });
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
    if (prof > PROFUNDIDADE_DE_OPCOES) return undefined;
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
    if (!/^[A-Za-z0-9.-]{1,60}$/.test(etapa)) return null; /* v9.16: hífen das chaves Homebrew (b.hbt-…-p10, b.origem.hbo-…) */
    return {
      id: String(bruto.id || uuid()).slice(0, 60),
      etapa: etapa,
      tipo: String(bruto.tipo || "").slice(0, 40),
      valor: bruto.valor === undefined || bruto.valor === null ? "" : String(bruto.valor).slice(0, 80),
      opcoes: limparOpcoes(bruto.opcoes) || {},
      nome: String(bruto.nome || "").slice(0, 160),
      ignorarRequisitos: bruto.ignorarRequisitos === true,
      registradoEm: typeof bruto.registradoEm === "string" ? bruto.registradoEm.slice(0, 40) : "",
      /* Evolução Modular (AS6): a escolha normal de onde esta veio. */
      associadoDe: typeof bruto.associadoDe === "string" && /^[A-Za-z0-9_-]{1,60}$/.test(bruto.associadoDe) ? bruto.associadoDe : undefined,
      /* v9.5: de onde a escolha veio (o plano da Ramificação que a aplicou). */
      procedencia: typeof bruto.procedencia === "string" && bruto.procedencia ? bruto.procedencia.slice(0, 160) : undefined,
    };
  }

  function normalizarEscolhas(bruto) {
    return (Array.isArray(bruto) ? bruto : []).map(normalizarRegistro).filter(Boolean);
  }

  /* Registra uma decisão. Trocar a escolha de uma vaga reaproveita o id
     do registro: para a sincronização é o mesmo registro mudando, e não
     um apagado e outro criado. */
  /* v9.25: um elemento Homebrew de Ordem (registrado ou referência
     pendente: "hbe-…"). */
  function elementoHomebrew(k) {
    var EL = global.RAMAOrdemElementos;
    return !!(EL && EL.ehHomebrew(k));
  }
  /* Os elementos Homebrew que uma escolha usa ganham a cópia na ficha
     (ordem.homebrew.elementos), como a afinidade. */
  function guardarElementosDaEscolha(ordem, opcoes) {
    var EL = global.RAMAOrdemElementos, HO = global.RAMAOrdemHomebrew;
    if (!EL || !HO || !HO.guardarNaFicha) return;
    (function andar(v, prof) {
      if (prof > 8 || v === null || v === undefined) return;
      if (typeof v === "string") {
        if (EL.ehHomebrew(v) && EL.def(v)) HO.guardarNaFicha(ordem, "elemento", EL.def(v));
        /* Um poder paranormal Homebrew escolhido (Transcender…) ganha a cópia. */
        else if (HO.tipoDaChave && (HO.tipoDaChave(v) === "poder" || HO.tipoDaChave(v) === "poderClasse") && HO.embutir) HO.embutir(ordem, v);
        return;
      }
      if (typeof v === "object") Object.keys(v).forEach(function (k) { andar(v[k], prof + 1); });
    })(opcoes, 0);
  }

  function registrar(ordem, v, candidato) {
    if (!ordem.escolhas) ordem.escolhas = [];
    guardarElementosDaEscolha(ordem, [(candidato || {}).valor, (candidato || {}).opcoes]);
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
    if (e.chave === "aprenderRitual") {
      /* O ritual escolhido pelo vínculo; o texto de uma ficha anterior
         quando é só o que existe. */
      var nomeRitual = (o.aprendido && o.aprendido.nome) || (typeof o.ritual === "string" ? o.ritual : "");
      if (nomeRitual) return "Aprender Ritual (" + nomeRitual + ")";
    }
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
      case "trilhaElite": {
        var he = P.poder(r.valor);
        return he ? he.nome : String(r.valor || "");
      }
      case "trilhaSobrevivente": {
        var ts = C.trilhaSobrevivente(r.valor);
        return ts ? "Trilha " + ts.nome : "";
      }
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
      case "transcenderItem":
        if (r.valor === "nao") return "Não transcendeu com item neste intervalo";
        return "Transcender com item" + (o.itemNome ? " (" + o.itemNome + ")" : "") + " → " + descreverPoderAninhado(o.poder);
      case "poderOrigem": {
        if (o.poder) return descreverPoderAninhado(o.poder);
        var partes = [];
        Object.keys(o).forEach(function (k) {
          var v = o[k];
          if (typeof v === "string" && C.pericia(v)) partes.push(nomeDaPericia(v));
          else if (v && typeof v === "object" && v.nome) partes.push(v.nome);
          else if (typeof v === "string" && v.trim()) partes.push(/^\d$/.test(v) ? "número " + v : v.trim());
        });
        return partes.join(" · ");
      }
      case "rituais": {
        var nomes = rituaisDoRegistro(r).map(function (x) { return x.nome || x.id; });
        return nomes.length ? nomes.join(", ") : "";
      }
      default:
        return "";
    }
  }

  /* As entradas de ritual de um registro, já saneadas. Cada uma é o
     VÍNCULO entre uma concessão e um ritual da ficha:

       id         o id do ritual NA FICHA — é ele que diz "este ritual,
                  e não outro com o mesmo nome"
       nome       retrato do nome, para a Progressão continuar legível
                  sem a lista de rituais à mão
       circulo    retrato do círculo, usado só quando a ficha não está
                  por perto; com ela, vale o círculo do ritual de
                  verdade
       catalogo   o id do catálogo oficial, quando veio de lá */
  function rituaisDoRegistro(r) {
    var lista = (r && r.opcoes && Array.isArray(r.opcoes.rituais)) ? r.opcoes.rituais : [];
    return lista.filter(function (x) { return x && typeof x === "object" && x.id; });
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
      /* ritualId → id da concessão que já o reivindicou. Um ritual da
         ficha ocupa UMA vaga de aprendizado, nunca duas: a segunda que
         tentar aparece com o motivo, sem apagar nada. */
      rituaisUsados: {},
      /* O que foi aprendido, em ordem de etapa. É daqui que sai a conta
         do limite por Intelecto e a separação entre conhecido e
         grimório. */
      aprendizados: [],
      /* id da vaga de ritual → quantos ela concede NAQUELE degrau. O
         grimório guarda "rituais iguais ao seu Intelecto", e o Intelecto
         que vale é o da etapa — por isso o número é anotado quando a
         etapa passa, não no fim. */
      quantidades: {},
      ids: {},
      /* id da vaga → true: etapas abaixo do marco de uma importação, sem
         histórico (v2.34). */
      historicas: {},
      /* Aquisições cujos efeitos a mesa desligou numa versão
         personalizada (personalizacao.js). */
      desligadas: desativadasDe(ordem),
    };
  }

  /* Desligadas numa versão personalizada ou excluídas da ficha — as
     duas listas de personalizacao.js. */
  function desativadasDe(ordem) {
    var saida = {};
    (Array.isArray(ordem.personalizacoes) ? ordem.personalizacoes : []).forEach(function (p) {
      if (p && p.efeitos === "desativados" && p.aquisicao) saida[p.aquisicao] = true;
    });
    (Array.isArray(ordem.excluidas) ? ordem.excluidas : []).forEach(function (x) {
      if (x && x.aquisicao) saida[x.aquisicao] = true;
    });
    return saida;
  }

  /* O id estável de uma aquisição: a etapa mais a chave do poder, nunca
     o nome. É a ele que uma versão personalizada se prende. Se a mesma
     chave vier duas vezes na MESMA etapa, a segunda ganha "#2". */
  function idDeAquisicao(percurso, etapaId, chave) {
    var base = String(etapaId || "sem-etapa") + "|" + String(chave || "");
    var n = (percurso.ids[base] || 0) + 1;
    percurso.ids[base] = n;
    return n === 1 ? base : base + "#" + n;
  }

  function copiarPercurso(p) {
    return {
      atributos: Object.assign({}, p.atributos),
      graus: Object.assign({}, p.graus),
      fontesGrau: JSON.parse(JSON.stringify(p.fontesGrau)),
      adquiridos: p.adquiridos.slice(),
      afinidadeAtiva: p.afinidadeAtiva,
      rituaisUsados: Object.assign({}, p.rituaisUsados),
      /* Cópia de CADA aprendizado, não só da lista: uma substituição
         numa etapa posterior marca o aprendizado antigo, e essa marca
         não pode vazar para o retrato de antes dela. */
      aprendizados: p.aprendizados.map(function (a) { return Object.assign({}, a); }),
      quantidades: Object.assign({}, p.quantidades),
      ids: Object.assign({}, p.ids),
      desligadas: p.desligadas,
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

    /* Estágio de Sobrevivente: NEX 0%, e nada de exposição. */
    var nexDaEtapa = v.nexEtapa !== undefined ? v.nexEtapa : nexDoDegrau(Math.max(1, d));

    var exposicao;
    if (v.nexExposicao) exposicao = v.nexExposicao;
    else if (t.separado) exposicao = 0;
    /* Evolução por Patentes: o NEX é só exposição, e é o da ficha. */
    else if (t.porPatente) exposicao = exposicaoAtual;
    else exposicao = nexDaEtapa;

    return {
      id: v.id,
      degrau: d,
      nex: nexDaEtapa,
      exposicao: Math.min(exposicao, t.separado || t.porPatente ? exposicaoAtual : 99),
      separado: t.separado,
      porPatente: !!t.porPatente,
      rotulo: v.rotuloEtapa || (t.porPatente && d ? patenteDoDegrau(d).nome : rotuloDoDegrau(d, t.separado)),
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

  var GRAUS_POR_NUMERO = { 1: "Treinado", 2: "Veterano", 3: "Expert" };

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
        return { ok: etapa.nex >= r.minimo, texto: textoNex(r.minimo, etapa.separado || etapa.porPatente),
          falta: textoNex(r.minimo, etapa.separado || etapa.porPatente) + (etapa.porPatente ? " (com Evolução por Patentes, o nível é o limite de PD da patente — " + etapa.rotulo + " vale nível " + etapa.degrau + ")" : " (esta escolha é de " + etapa.rotulo + ")") };
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
      /* Uma habilidade automática da classe (Ataque Especial, Escolhido
         pelo Outro Lado — AS3 p. 108): ela não é "adquirida" numa etapa;
         vem com a classe a partir do NEX dela. */
      case "habilidadeDeClasse": {
        var ha = P.poder(r.habilidade);
        var inicioHa = P.NEX_INICIAL_AUTOMATICA[r.habilidade];
        var temHa = !!(ha && ordem && ha.classes.indexOf(ordem.classe) >= 0 && (etapa.nex || 0) >= (inicioHa === undefined ? 5 : inicioHa));
        var nomeHa = ha ? ha.nome : r.habilidade;
        return { ok: temHa, texto: "Ter " + nomeHa, falta: "Ter " + nomeHa + " (habilidade de classe)" };
      }
      case "comRegra": {
        var nomeRegra = OP() && OP().regra(r.regra) ? OP().regra(r.regra).nome : r.regra;
        var regraLigada = OP() ? OP().ligada(ordem, r.regra) : false;
        return { ok: regraLigada, texto: "Regra opcional " + nomeRegra + " ligada",
          falta: "Só com a regra opcional " + nomeRegra + " ligada (aba Regras)" };
      }
      /* "Conjurar ritual de Nº círculo [do elemento]" (AS1 p. 44-47): a
         ficha conhece, naquela etapa, um ritual de pelo menos esse
         círculo — e desse elemento, quando pedido. Um ritual de vários
         elementos conta em cada um deles. */
      case "conjurarRitual": {
        var elR = r.elemento || (r.elementoDaOpcao ? (o[r.elementoDaOpcao] || "") : "");
        var conhece = (percurso.aprendizados || []).some(function (a) {
          return !a.substituidoEm && (Number(a.circulo) || 0) >= r.circulo &&
            (!elR || (Array.isArray(a.elementos) && a.elementos.indexOf(elR) >= 0));
        });
        var txtR = "Conjurar ritual de " + r.circulo + "º círculo" +
          (elR ? " de " + nomeDoElemento(elR) : (r.elementoDaOpcao ? " do elemento escolhido" : ""));
        if (r.elemento && r.circulo === 1) txtR = "Conjurar ritual de " + nomeDoElemento(r.elemento);
        if (r.texto) txtR = r.texto;
        return { ok: conhece, texto: txtR, falta: txtR + " (nenhum ritual conhecido assim nesta etapa)" };
      }
      case "declaracao":
        return { ok: true, texto: r.texto, falta: "" };
      /* "For 2 ou Agi 2" (AS2). */
      case "atributoUm": {
        var algumAtr = r.atributos.some(function (a) { return (percurso.atributos[a] || 0) >= r.minimo; });
        var txtAtr = r.atributos.map(function (a) { return nomeDoAtributo(a) + " " + r.minimo; }).join(" ou ");
        return { ok: algumAtr, texto: txtAtr, falta: txtAtr };
      }
      case "grau": {
        var txtG = GRAUS_POR_NUMERO[r.grau] + " em " + nomeDaPericia(r.pericia);
        return { ok: (percurso.graus[r.pericia] || 0) >= r.grau, texto: txtG, falta: txtG };
      }
      case "grauEmUma": {
        var txtGU = GRAUS_POR_NUMERO[r.grau] + " em " + r.pericias.map(nomeDaPericia).join(" ou ");
        var umG = r.pericias.some(function (k) { return (percurso.graus[k] || 0) >= r.grau; });
        return { ok: umG, texto: txtGU, falta: txtGU };
      }
      /* Poderes de Transmissão (AS5 p. 62): a conexão com o Sino de
         Transmissão registrada na ficha E confirmada pela mesa (o mestre,
         na campanha). Registrar sozinho não basta. */
      case "sinoDeTransmissao": {
        var sino = global.RAMAOrdemArquivo5 && ordem ? global.RAMAOrdemArquivo5.sino(ordem) : null;
        var ligado = !!(sino && sino.registrado && sino.confirmado);
        return { ok: ligado, texto: "Conexão com o Sino de Transmissão",
          falta: sino && sino.registrado ? "Conexão com o Sino de Transmissão — falta a confirmação da mesa (aba Habilidades)" : "Conexão com o Sino de Transmissão (registre na aba Habilidades; a mesa confirma)" };
      }
      /* Poderes de Intenção (AS2 p. 94): o contato com a Coroa de
         Espinhos precisa estar registrado na ficha. */
      case "coroaDeEspinhos": {
        var contato = !!(ordem && ordem.intencao && ordem.intencao.contato && ordem.intencao.contato.registrado);
        return { ok: contato, texto: "Contato com a Coroa de Espinhos", falta: "Contato com a Coroa de Espinhos (registre na aba Habilidades)" };
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

  /* "Decadência" e "decadência " são a mesma escolha de texto. */
  function mesmaOpcao(a, b) {
    if (typeof a === "string" && typeof b === "string") return a.trim().toLowerCase() === b.trim().toLowerCase();
    if (a && b && typeof a === "object" && typeof b === "object" && a.valor !== undefined) return a.valor === b.valor;
    return a === b;
  }

  function repeticao(e, percurso, opcoes, etapa, ordem) {
    var o = opcoes || {};
    var iguais = percurso.adquiridos.filter(function (a) {
      if (!vale(a) || a.chave !== e.chave) return false;
      if (e.repeticaoPorOpcao) return mesmaOpcao((a.opcoes || {})[e.repeticaoPorOpcao], o[e.repeticaoPorOpcao]);
      return true;
    });

    /* Dominar Habilidade Ritualística: "até três vezes" (AS2 p. 75) —
       somando todas as escolhas, e cada uma com uma habilidade. */
    if (e.maximoTotal) {
      var todas = percurso.adquiridos.filter(function (a) { return vale(a) && a.chave === e.chave; }).length;
      if (todas >= e.maximoTotal) {
        return { ok: false, afinidade: false, texto: nomeDoPoder(e, o) + " já foi adquirido " + e.maximoTotal + " vezes, o máximo." };
      }
    }
    if (!iguais.length) return { ok: true, afinidade: false, texto: "" };
    if (e.repetivel && !e.repeticaoPorOpcao) return { ok: true, afinidade: false, texto: "" };
    if (e.repeticaoMaxima && e.repeticaoPorOpcao) {
      if (iguais.length < e.repeticaoMaxima) {
        return { ok: true, afinidade: false, texto: "Escolha nº " + (iguais.length + 1) + " para a mesma opção (o máximo é " + e.repeticaoMaxima + ")." };
      }
      return { ok: false, afinidade: false, texto: "Você já escolheu " + nomeDoPoder(e, o) + " " + e.repeticaoMaxima + " vezes para esta mesma opção." };
    }

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

  /* Os rituais da ficha, quando quem chamou os entregou. Sem eles a
     conta continua: o que está gravado no registro é aceito como está,
     como já acontece com os itens do inventário. O que NÃO acontece é o
     contrário — com a lista à mão, é ela que manda, e nunca o número
     que veio guardado junto da escolha. */
  function rituaisDoContexto(contexto) {
    return (contexto && Array.isArray(contexto.rituais)) ? contexto.rituais : null;
  }

  function dadosDoRitualDaFicha(ritual) {
    if (!ritual) return null;
    var RT = global.RAMAOrdemRituais;
    var dados = RT ? RT.dadosDoRitual(ritual) : ((ritual.ordem && typeof ritual.ordem === "object") ? ritual.ordem : {});
    return {
      id: ritual.id,
      nome: ritual.nome || "",
      circulo: Number(dados.circulo) || 0,
      elemento: dados.elemento || "",
      elementos: Array.isArray(dados.elementos) ? dados.elementos.slice() : [],
      todosOsElementos: dados.todosOsElementos === true,
      catalogo: ritual.origemCatalogoId || "",
    };
  }

  /* O que a regra de um ritual precisa saber da ficha NAQUELA etapa
     (Arquivos Secretos 1, p. 49-50): a afinidade já desenvolvida e os
     rituais do catálogo que o personagem já conhece. Sem a aba Rituais à
     mão, os conhecidos ficam de fora — e a exigência deles não é julgada
     por quem não tem como saber. */
  function comConhecimento(dado, ordem, percurso, etapa, contexto) {
    var af = afinidadeNaEtapa(ordem, percurso, etapa || { exposicao: 0 });
    var extra = { afinidade: af.disponivel ? af.elemento : "" };
    var rituais = rituaisDoContexto(contexto);
    if (rituais) {
      var catalogoDe = {};
      rituais.forEach(function (x) { if (x && x.id) catalogoDe[x.id] = x.origemCatalogoId || ""; });
      extra.conhecidos = ativos(percurso).map(function (a) { return catalogoDe[a.ritualId] || ""; }).filter(Boolean);
    }
    return Object.assign({}, dado, extra);
  }

  /* O que se sabe do ritual de uma entrada: o da ficha quando a ficha
     está à mão, o retrato guardado quando não está. */
  function resolverRitual(entrada, rituais) {
    if (!rituais) {
      return {
        id: entrada.id,
        nome: String(entrada.nome || ""),
        circulo: Number(entrada.circulo) || 0,
        elemento: String(entrada.elemento || ""),
        elementos: Array.isArray(entrada.elementos) ? entrada.elementos.map(String) : [],
        todosOsElementos: entrada.todosOsElementos === true,
        catalogo: String(entrada.catalogo || ""),
        naFicha: null,
      };
    }
    var achado = rituais.filter(function (x) { return x && x.id === entrada.id; })[0];
    if (!achado) return { id: entrada.id, nome: String(entrada.nome || ""), circulo: 0, elemento: "", catalogo: "", naFicha: false };
    var d = dadosDoRitualDaFicha(achado);
    d.naFicha = true;
    return d;
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
        /* Ficha anterior a esta versão: Aprender Ritual guardava só o
           NOME do ritual, em texto. Ela continua completa — o que falta
           é o vínculo, e pedi-lo de volta é trabalho da aba Rituais. */
        if (op.tipo === "ritualAprendido" && legadoDeRitual(v)) return;
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
          /* Mutação: "originalmente baseada em Força, Agilidade ou Vigor"
             — o atributo do CATÁLOGO, não o que a ficha trocou à mão. */
          if (op.atributosOriginais && op.atributosOriginais.indexOf(C.pericia(valor).atributo) < 0) {
            saida.problemas.push(op.rotulo + ": " + nomeDaPericia(valor) + " não é originalmente de " +
              op.atributosOriginais.map(nomeDoAtributo).join(", ") + ".");
          }
          /* "Se receber uma perícia que já havia recebido, escolha outra"
             (OPRPG p. 22). */
          if (op.modo === "treinar" && (percurso.graus[valor] || 0) >= 1) saida.problemas.push(op.rotulo + ": " + nomeDaPericia(valor) + " já é treinada — escolha outra.");
          if (op.modo === "treinada" && (percurso.graus[valor] || 0) < 1) saida.problemas.push(op.rotulo + ": " + nomeDaPericia(valor) + " não é treinada.");
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
            if (op.exceto && op.exceto.indexOf(k) >= 0) saida.problemas.push(op.rotulo + ": " + nomeDaPericia(k) + " não pode ser escolhida aqui.");
            if (op.modo === "treinar" && (percurso.graus[k] || 0) >= 1) saida.problemas.push(op.rotulo + ": " + nomeDaPericia(k) + " já é treinada — escolha outra.");
            if (op.modo === "treinada" && (percurso.graus[k] || 0) < 1) saida.problemas.push(op.rotulo + ": " + nomeDaPericia(k) + " não é treinada.");
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
          /* v9.25: um elemento Homebrew de Ordem só onde a regra é
             genérica (op.aceitaHomebrew). Onde o livro dá um efeito por
             elemento (Grão-Mestre, Ser Amaldiçoado…), só os oficiais. */
          var hbOk = op.aceitaHomebrew && elementoHomebrew(valor);
          if (validos.indexOf(valor) < 0 && !hbOk) {
            saida.problemas.push(op.rotulo + (elementoHomebrew(valor) ? ": este poder tem efeitos só para os elementos do livro (um elemento Homebrew não herda nenhum)." : ": elemento inválido."));
            break;
          }

          /* "Este poder conta como um poder do elemento do ritual
             escolhido" (Aprender Ritual, OPRPG p.114). Quando o ritual
             diz o elemento dele, a opção não é livre; um ritual sem
             elemento informado (escrito à mão, Homebrew) deixa a escolha
             com quem joga. */
          var doRitual = op.doRitual && v[op.doRitual] && typeof v[op.doRitual] === "object" && v[op.doRitual].id
            ? resolverRitual(v[op.doRitual], rituaisDoContexto(contexto)) : null;
          var cabeNoRitual = doRitual && doRitual.todosOsElementos && (doRitual.elementos || []).indexOf(valor) >= 0;
          if (doRitual && doRitual.elemento && doRitual.elemento !== valor && !cabeNoRitual) {
            saida.problemas.push(op.rotulo + ": o poder conta como poder do elemento do ritual escolhido, e " +
              (doRitual.nome || "o ritual") + " é de " + nomeDoElemento(doRitual.elemento) + " (Ordem Paranormal RPG, p. 114).");
          }
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

        /* "Você pode substituir um ritual que já conhece por outro"
           (Aprender Ritual, OPRPG p.114). É a ÚNICA substituição que as
           regras concedem — trocar uma escolha na Progressão é corrigir
           a ficha, e não isto.

           O livro não diz que regra o ritual que ENTRA segue. O R.A.M.A.
           lê que ele toma o lugar do que sai: herda a aquisição dele e
           é conferido pela regra dela (o círculo daquela concessão, do
           Aprender Ritual daquela etapa…). Ver docs/ORDEM-REGRAS.md. */
        case "substituicaoDeRitual": {
          var sub = (valor && typeof valor === "object") ? valor : {};
          var sai = sub.sai && sub.sai.id ? sub.sai : null;
          var entra = sub.entra && sub.entra.id ? sub.entra : null;
          if (!sai && !entra) break;
          if (!sai) { saida.faltam.push(op.rotulo + ": o ritual que sai"); break; }
          if (!entra) { saida.faltam.push(op.rotulo + ": o ritual que entra"); break; }

          var velho = aprendizadoAtivo(percurso, String(sai.id));
          if (!velho) {
            saida.problemas.push(op.rotulo + ": " + (sai.nome || "o ritual que sai") + " não é um ritual conhecido nesta etapa.");
            break;
          }
          if (velho.destino === "grimorio") {
            saida.problemas.push(op.rotulo + ": " + (velho.nome || "o ritual") + " está no grimório, que guarda o que a mente não guarda — ele não é um ritual conhecido para trocar.");
            break;
          }
          var novo = resolverRitual(entra, rituaisDoContexto(contexto));
          if (novo.naFicha === false) {
            saida.problemas.push(op.rotulo + ": " + (novo.nome || "o ritual que entra") + " não está mais na aba Rituais.");
            break;
          }
          if (novo.id === velho.ritualId) {
            saida.problemas.push(op.rotulo + ": o ritual que entra é o mesmo que sai.");
            break;
          }
          if (v.aprendido && v.aprendido.id === novo.id) {
            saida.problemas.push(op.rotulo + ": o ritual que entra é o mesmo que este Aprender Ritual ensina.");
            break;
          }
          if (percurso.rituaisUsados[novo.id]) {
            saida.problemas.push(op.rotulo + ": " + (novo.nome || "o ritual que entra") + " já é o ritual de outra aquisição.");
            break;
          }
          var cabe = A ? A.avaliarContraRegra(velho.regra, comConhecimento(novo, ordem, percurso, etapa, contexto)) : { ok: true };
          if (!cabe.ok) {
            saida.problemas.push(op.rotulo + ": " + (novo.nome || "o ritual que entra") + " não cabe no lugar de " +
              (velho.nome || "o que sai") + " (" + velho.nomePoder + ", " + velho.rotuloEtapa + "). " + cabe.motivo);
          }
          break;
        }

        /* Aprender Ritual (OPRPG p.114): o círculo sobe com o NEX de
           EXPOSIÇÃO, não com o nível — é poder paranormal, e com NEX &
           Experiência os poderes paranormais continuam olhando para o
           NEX (SAH p.98). E ele é o único aprendizado sujeito ao limite
           de rituais conhecidos: "um número de rituais dessa forma
           igual ao seu Intelecto" (OPRPG p.119). */
        case "ritualAprendido": {
          if (typeof valor !== "object" || !valor.id) {
            saida.problemas.push(op.rotulo + ": vínculo de ritual inválido.");
            break;
          }
          var dadoAp = resolverRitual(valor, rituaisDoContexto(contexto));
          if (dadoAp.naFicha === false) {
            saida.problemas.push(op.rotulo + ": o ritual escolhido não está mais na aba Rituais.");
            break;
          }
          var regraAp = regraDeAprenderRitual(etapa);
          var testeAp = A ? A.avaliarContraRegra(regraAp, comConhecimento(dadoAp, ordem, percurso, etapa, contexto)) : { ok: true };
          if (!testeAp.ok) {
            saida.problemas.push(op.rotulo + ": " + (dadoAp.nome || "o ritual escolhido") + " — " + testeAp.motivo +
              " (NEX de exposição " + etapa.exposicao + "%).");
          }
          if (percurso.rituaisUsados[dadoAp.id]) {
            saida.problemas.push(op.rotulo + ": " + (dadoAp.nome || "o ritual escolhido") +
              " já é o ritual de outra aquisição, e um ritual não quita duas.");
          }
          var totalInt = percurso.atributos.int || 0;
          var usadosInt = contarNoLimite(percurso);
          if (usadosInt + 1 > totalInt) {
            saida.problemas.push("Limite de rituais aprendidos por Aprender Ritual: é o Intelecto (" + totalInt +
              " nesta etapa), e " + usadosInt + " já " + (usadosInt === 1 ? "foi aprendido" : "foram aprendidos") +
              " assim antes (Ordem Paranormal RPG, p. 119).");
          }
          break;
        }
        case "escolha":
          if ((op.valores || []).indexOf(valor) < 0) saida.problemas.push(op.rotulo + ": opção inválida.");
          break;
        /* Um ritual do catálogo que NÃO é aprendido: fica preso a quem o
           usa (o invento do Inventor Paranormal, SAH p. 10). Não entra na
           aba Rituais, não ocupa concessão e não conta em limite. */
        case "ritualCatalogo": {
          if (typeof valor !== "object" || !valor.catalogo) { saida.faltam.push(op.rotulo); break; }
          if (op.circulo && Number(valor.circulo) !== op.circulo) {
            saida.problemas.push(op.rotulo + ": " + (valor.nome || "o ritual") + " não é de " + op.circulo + "º círculo.");
          }
          break;
        }
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
        case "habilidadeDeTrilha":
          juntar(saida, avaliarHabilidadeDeTrilha(op, valor, percurso, etapa, ordem, contexto, (prof || 0) + 1));
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

  /* O nome em texto que as fichas anteriores guardavam em
     `opcoes.ritual`. Nada é convertido sozinho: o texto fica, e a aba
     Rituais oferece prendê-lo a um ritual de verdade. */
  function legadoDeRitual(valores) {
    var v = (valores || {}).ritual;
    return typeof v === "string" && !!v.trim();
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
    /* Evolução por Patentes: "aumenta em um (de treinado para veterano
       ou de veterano para expert)" — sem degrau mínimo de NEX. */
    if (!etapa.porPatente && etapa.nex < NEX_DO_GRAU[novo]) {
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
    if (C.classeDosPoderes) classe = C.classeDosPoderes(classe);
    /* Os poderes que o Sobrevivendo ao Horror abre a todos (`geral`, como
       Combater com Duas Armas) continuam sendo de outra classe: também
       podem vir pela Expansão de Conhecimento (v2.34.2). */
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

  /* Dominar Habilidade Ritualística (AS2 p. 75): uma habilidade de trilha
     da classe, com o NEX dela e a dependência dela. A habilidade entra
     como aquisição — com os efeitos que tiver. */
  function motivosDaHabilidadeDeTrilha(h, classe, percurso, etapa, ordem) {
    var motivos = [];
    var tr = h ? C.trilha(h.trilha) : null;
    if (!h || h.tipo !== "trilha" || !tr) return ["Habilidade de trilha desconhecida."];
    if (!((tr.classe === classe && !tr.classeHomebrew) || C.trilhaServe(tr, classe, ordem))) motivos.push(h.nome + " não é de uma trilha de " + (C.classe(classe) || { nome: classe }).nome.toLowerCase() + ".");
    if (ordem.trilha === tr.chave) motivos.push(h.nome + " já é da sua trilha.");
    if (etapa.nex < h.nex) motivos.push(h.nome + " pede NEX " + h.nex + "% (esta escolha é de " + etapa.rotulo + ").");
    if (h.dependeDe) {
      var tem = percurso.adquiridos.some(function (a) { return vale(a) && a.chave === h.dependeDe; });
      if (!tem) {
        var base = P.poder(h.dependeDe);
        motivos.push(h.nome + " depende de " + (base ? base.nome : h.dependeDe) + ", que a ficha não tem nesta etapa.");
      }
    }
    if (percurso.adquiridos.some(function (a) { return vale(a) && a.chave === h.chave; })) motivos.push("A ficha já tem " + h.nome + ".");
    return motivos;
  }

  function avaliarHabilidadeDeTrilha(op, valor, percurso, etapa, ordem, contexto, prof) {
    if (!valor || !valor.valor) return { faltam: [op.rotulo || "Habilidade de trilha"], problemas: [], filhos: [] };
    var h = P.poder(valor.valor);
    var motivos = motivosDaHabilidadeDeTrilha(h, op.classe || ordem.classe, percurso, etapa, ordem);
    if (motivos.length) return { faltam: [], problemas: motivos, filhos: [] };
    var sub = avaliarOpcoes(h.opcoes, valor.opcoes || {}, percurso, etapa, ordem, contexto, prof);
    return {
      faltam: sub.faltam,
      problemas: sub.problemas,
      filhos: [{ entrada: h, opcoes: valor.opcoes || {}, afinidade: false }].concat(sub.filhos),
    };
  }

  function candidatosHabilidadeDeTrilha(ordem, idVaga, contexto, classe) {
    var c = contextoDaVaga(ordem, idVaga, contexto);
    var alvo = classe || ordem.classe;
    var lista = [];
    C.trilhasDaClasse(alvo, ordem).forEach(function (tr) {
      P.habilidadesDaTrilha(tr.chave).forEach(function (h) {
        var motivos = c ? motivosDaHabilidadeDeTrilha(h, alvo, c.percurso, c.etapa, ordem) : [];
        if (C.fonteLiberada && !C.fonteLiberada(h.fonte ? h : tr)) motivos = motivos.concat([C.motivoDaFonte(h.fonte ? h : tr)]);
        lista.push({ habilidade: h, trilha: tr, disponivel: !motivos.length, motivos: motivos });
      });
    });
    return lista;
  }

  /* As habilidades de trilha que a ficha dominou, com o degrau — para as
     concessões de ritual delas (js/ordem/aprendizado.js). Lê as escolhas
     como estão, em qualquer profundidade. */
  function dominadasDe(ordem) {
    var saida = [];
    (ordem.escolhas || []).forEach(function (r) {
      var m = /^d(\d+)\./.exec(String(r && r.etapa || ""));
      if (!m) return;
      var degrau = Number(m[1]);
      (function andar(v, prof) {
        if (!v || typeof v !== "object" || prof > 6) return;
        if (v.valor === "dominarHabilidadeRitualistica" && v.opcoes && v.opcoes.habilidade && v.opcoes.habilidade.valor) {
          saida.push({ poder: String(v.opcoes.habilidade.valor), degrau: degrau });
        }
        Object.keys(v).forEach(function (k) { if (v[k] && typeof v[k] === "object") andar(v[k], prof + 1); });
      })({ valor: r.valor, opcoes: r.opcoes }, 0);
    });
    return saida;
  }

  function avaliarTrilhaOutra(valor, percurso, etapa, ordem, contexto, prof) {
    if (!valor || !valor.valor) return { faltam: ["Trilha"], problemas: [], filhos: [] };
    var tr = C.trilha(valor.valor);
    if (!tr) return { faltam: [], problemas: ["Trilha desconhecida."], filhos: [] };
    var problemas = [];
    if (!C.trilhaServe(tr, ordem.classe, ordem)) problemas.push(tr.nome + " não é uma trilha da sua classe" + (tr.geral ? " (com a regra opcional Trilha Geral ligada, é)." : "."));
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
      case "trilhaElite": {
        if (!r.valor) { saida.faltam.push("Habilidade da trilha"); break; }
        var trE = C.trilha(ordem.trilha);
        var opE = trE ? opcoesDeElite(trE.chave) : [];
        if (!trE) saida.problemas.push("Escolha a trilha (agente especial) antes.");
        else if (!opE.some(function (h) { return h.chave === r.valor; })) saida.problemas.push("Esta habilidade não é a 3ª nem a 4ª da trilha " + trE.nome + ".");
        break;
      }
      case "trilhaSobrevivente":
        if (!r.valor) { saida.faltam.push("Trilha"); break; }
        if (!C.trilhaSobrevivente(r.valor)) saida.problemas.push("Trilha de sobrevivente desconhecida.");
        break;

      case "atributo": {
        if (!C.ATRIBUTOS.some(function (a) { return a.chave === r.valor; })) { saida.faltam.push("Atributo"); break; }
        /* O teto é o da regra da vaga: 5 no aumento de agente (OPRPG
           p. 26); 3 no 3º estágio do Sobrevivente (SAH p. 31) e no ponto
           do treinamento do Mundano (OPRPG p. 172). */
        var tetoA = v.maximo || C.GERACAO_ATRIBUTOS.maximoPorAumento;
        if ((percurso.atributos[r.valor] || 0) >= tetoA) {
          saida.problemas.push(nomeDoAtributo(r.valor) + " já está em " + percurso.atributos[r.valor] +
            " nesta etapa; este aumento não passa de " + tetoA + " (" + (v.fonteTexto || "OPRPG p.26") + ").");
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
        if (!r.valor) { saida.faltam.push(v.soTranscender ? "Transcender" : "Poder"); break; }
        var e = P.poder(r.valor);
        if (!e || (e.tipo !== "classe" && e.tipo !== "geral")) { saida.problemas.push("Poder desconhecido: " + (r.nome || r.valor) + "."); break; }
        if (!P.pertenceAClasse(e, ordem.classe)) { saida.problemas.push(e.nome + " não é um poder da sua classe."); break; }
        var mg = motivoDoGrupo(e, v, ordem);
        if (mg) saida.problemas.push(mg);
        if (v.soTranscender && e.chave !== "transcender") {
          saida.problemas.push(MOTIVO_TROCA + " " + e.nome + " não entra no lugar dele.");
        }
        juntar(saida, avaliarPoder(e, o, percurso, etapa, ordem, contexto, 0));
        saida.transcender = e.chave === "transcender";
        break;
      }

      case "versatilidade": {
        if (r.valor === "poderClasse" && v.modular) {
          saida.problemas.push("Com a Evolução Modular, a Versatilidade dá só o primeiro poder de uma trilha da sua classe que não a sua (AS6 p. 80). O poder de classe escolhido aqui fica guardado e volta a valer se a regra for desligada.");
          break;
        }
        if (r.valor === "poderClasse") {
          var val = o.poder || {};
          if (!val.valor) { saida.faltam.push("Poder de classe"); break; }
          var ev = P.poder(val.valor);
          if (!ev || !P.pertenceAClasse(ev, ordem.classe) || (ev.tipo !== "classe" && ev.tipo !== "geral")) {
            saida.problemas.push("Escolha um poder da sua classe.");
            break;
          }
          if (v.soTranscender && ev.chave !== "transcender") {
            saida.problemas.push(MOTIVO_TROCA + " " + ev.nome + " não entra no lugar dele.");
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
        /* As opções valem até o marco alcançado: o tipo de aliado do
           companheiro animal só é pedido em NEX 35% (SAH p. 7). */
        var esquema = C.escolhasDaOrigem(org, R().trilho(ordem).nexEquivalente);
        if (!org || !esquema.length) break;
        var sub2 = avaliarOpcoes(esquema, o, percurso, etapa, ordem, contexto, 0);
        saida.faltam = sub2.faltam;
        saida.problemas = sub2.problemas;
        saida.filhos = sub2.filhos;
        /* Ferido por Ritual (AS1 p. 43): o elemento escolhido decide a
           segunda perícia da origem. Treinada por qualquer caminho, vale. */
        if (org.periciaPorElemento && o.elemento && org.periciaPorElemento[o.elemento]) {
          var peEl = org.periciaPorElemento[o.elemento];
          if ((percurso.graus[peEl] || 0) < 1) {
            saida.problemas.push(org.poder + ": com " + nomeDoElemento(o.elemento) + ", a perícia da origem é " + nomeDaPericia(peEl) +
              ", e ela não está treinada. Troque a perícia escolhida da origem (aba Geral, trocar origem) ou o elemento (Arquivos Secretos 1, p. 43).");
          }
        }
        /* Treinado pela Hell Hunters (AS9 p. 38): a escolha do treino
           exige o par de perícias correspondente treinado. */
        if (org.periciasPorEscolha && o[org.periciasPorEscolha.opcao]) {
          var par = org.periciasPorEscolha.pares[o[org.periciasPorEscolha.opcao]] || [];
          var faltando = par.filter(function (k) { return (percurso.graus[k] || 0) < 1; });
          if (faltando.length) {
            saida.problemas.push(org.poder + ": essa escolha pede " + par.map(nomeDaPericia).join(" e ") + " treinadas pela origem; falta " +
              faltando.map(nomeDaPericia).join(" e ") + ". Troque as perícias da origem (aba Geral, trocar origem) ou a escolha (" + C.referencia(org) + ").");
          }
        }
        var estadoOrg = (ordem.estadoDasOrigens && ordem.estadoDasOrigens[org.chave]) || {};
        C.efeitosDaEscolhaDaOrigem(org).forEach(function (ef) {
          /* "Se ele morrer…": o efeito some enquanto o registro disser. */
          if (ef.seNao && estadoOrg[ef.seNao]) return;
          /* Só com a escolha certa (AS9: PV com Luta, PE com Pontaria). */
          if (ef.seOpcao && Object.keys(ef.seOpcao).some(function (k) { return o[k] !== ef.seOpcao[k]; })) return;
          saida.filhos.push({ efeitoDeOrigem: ef, opcoes: o, origem: org.chave, nome: org.poder });
        });
        break;
      }

      case "transcenderExposicao": {
        if (r.valor === "nao") break;
        if (r.valor !== "transcender") { saida.faltam.push("Transcender ou não"); break; }
        juntar(saida, avaliarParanormal(o.poder, percurso, etapa, ordem, contexto, 0));
        break;
      }

      /* Transcender com Itens (AS1 p. 56-57): o poder tem de ser do
         elemento do item amaldiçoado, e cumprir os próprios requisitos. */
      case "transcenderItem": {
        if (r.valor === "nao") break;
        if (r.valor !== "transcender") { saida.faltam.push("Transcender ou não"); break; }
        var elItem = typeof o.itemElemento === "string" ? o.itemElemento : "";
        if (!o.item) saida.faltam.push("Item amaldiçoado");
        else {
          var itensT = itensDoContexto(contexto);
          if (itensT) {
            var itemT = itensT.filter(function (i) { return i && i.id === o.item; })[0];
            if (!itemT) saida.problemas.push("O item amaldiçoado escolhido não está mais no inventário.");
            else {
              var dT = global.RAMAOrdemInventario ? global.RAMAOrdemInventario.dadosDoItem(itemT) : (itemT.ordem || {});
              if (dT.grupo !== "amaldicoado" && dT.amaldicoado !== true) saida.problemas.push(itemT.nome + " não está marcado como item amaldiçoado.");
              if (dT.elemento) elItem = dT.elemento;
            }
          }
        }
        if (!elItem) saida.faltam.push("Elemento do item");
        juntar(saida, avaliarParanormal(o.poder, percurso, etapa, ordem, contexto, 0));
        var poderT = o.poder && o.poder.valor ? P.poder(o.poder.valor) : null;
        var elPoder = elementoDoPoder(poderT, o.poder && o.poder.opcoes);
        if (poderT && elItem && elPoder !== elItem) {
          saida.problemas.push(poderT.nome + (elPoder ? " é de " + nomeDoElemento(elPoder) : " não é de elemento nenhum") +
            "; com Transcender com Itens, o poder tem de ser do elemento do item (" + nomeDoElemento(elItem) + ").");
        }
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

      /* A concessão de rituais. Cada entrada é conferida sozinha, e o
         resultado de cada uma é guardado em `saida.rituais`: é ele que
         diz ao percurso quais vínculos valem — mesmo quando a concessão
         ainda está pela metade, porque escolher 1 de 3 e voltar depois
         é permitido. */
      case "rituais": {
        var c = v.concessao;
        if (!c || !A) { saida.problemas.push("Esta concessão de rituais não faz mais parte da progressão."); break; }

        var rituaisFicha = rituaisDoContexto(contexto);
        var quantos = A.quantidadeDa(c, percurso.atributos.int || 0);
        var entradas = rituaisDoRegistro(r);
        var vistos = {};
        saida.rituais = [];

        entradas.forEach(function (entrada) {
          var dado = resolverRitual(entrada, rituaisFicha);
          var motivo = "";
          var estrutural = false;

          if (dado.naFicha === false) {
            motivo = (dado.nome || "Um ritual escolhido") + " não está mais na aba Rituais.";
            estrutural = true;
          } else if (vistos[dado.id]) {
            motivo = (dado.nome || "Este ritual") + " foi escolhido duas vezes nesta concessão.";
            estrutural = true;
          } else if (percurso.rituaisUsados[dado.id]) {
            motivo = (dado.nome || "Este ritual") + " já ocupa outra concessão de aprendizado.";
            estrutural = true;
          } else {
            var eleg = A.elegibilidade(c, comConhecimento(dado, ordem, percurso, etapa, contexto));
            if (!eleg.ok) motivo = (dado.nome || "Um ritual escolhido") + ": " + eleg.motivo;
          }

          vistos[dado.id] = true;
          if (motivo) saida.problemas.push(motivo);
          saida.rituais.push({ dado: dado, ok: !motivo, estrutural: estrutural, motivo: motivo });
        });

        if (entradas.length > quantos) {
          saida.problemas.push("Esta concessão dá " + quantos + (quantos === 1 ? " ritual" : " rituais") +
            ", e há " + entradas.length + " escolhido" + (entradas.length === 1 ? "" : "s") + ".");
        } else if (entradas.length < quantos && !v.opcional) {
          saida.faltam.push("Rituais: faltam " + (quantos - entradas.length) + " de " + quantos);
        }
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
        var idOrigem = idDeAquisicao(percurso, info.etapa.id, "origem:" + org.chave);
        var origemDesligada = !!percurso.desligadas[idOrigem];
        percurso.adquiridos.push({
          id: idOrigem,
          chave: "origem:" + org.chave, nome: org.poder + " (" + org.nome + ")", tipo: "origem",
          elemento: "", opcoes: {}, afinidade: false, valido: true, completo: true,
          via: info.via, degrau: info.etapa.degrau, etapaId: info.etapa.id, registroId: info.registroId,
          resumo: org.resumo, automacao: org.automacao, fonteRef: C.referencia(org),
          efeitosDesativados: origemDesligada,
        });
        /* Só o poder: os efeitos fixos dele. Perícias da origem e o que
           depende de uma escolha dela não vêm pelo Flashback. */
        if (!origemDesligada) {
          C.efeitosDaOrigem(org).forEach(function (ef) {
            efeitos.push(Object.assign({}, ef, { tipo: ef.tipo, fonte: org.poder, detalhe: "Flashback: " + org.nome, origemDoEstado: org.chave }));
          });
        }
      }
      return;
    }

    if (filho.efeitoDeOrigem) {
      aplicarEfeito(percurso, efeitos, filho.efeitoDeOrigem, filho.opcoes, { nome: filho.nome, detalhe: "Origem" }, info.etapa);
      return;
    }

    var e = filho.entrada;
    var idReg = idDeAquisicao(percurso, info.etapa.id, e.chave);
    var reg = {
      id: idReg,
      efeitosDesativados: !!percurso.desligadas[idReg],
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
    /* Uma versão personalizada com os efeitos desligados tira da conta
       SÓ o que vem desta aquisição. O poder continua adquirido — conta
       para requisitos e repetição, como antes. */
    var lista = reg.efeitosDesativados ? [] : (filho.afinidade ? (e.efeitosAfinidade || []) : (e.efeitos || []));
    lista.forEach(function (ef) {
      aplicarEfeito(percurso, efeitos, ef, filho.opcoes, { nome: reg.nome, detalhe: info.etapa.rotulo }, info.etapa);
    });

    if (e.tipo === "paranormal" && info.etapa.exposicao >= 50) percurso.afinidadeAtiva = true;

    /* Aprender Ritual é o ÚNICO aprendizado que conta no limite por
       Intelecto (OPRPG p.119). Ele é registrado aqui, junto da
       aquisição do poder, para o limite ser contado uma vez por poder
       escolhido — e não uma vez por leitura da ficha. */
    if (e.chave === "aprenderRitual") anotarAprenderRitual(percurso, filho.opcoes || {}, info);
  }

  function anotarAprenderRitual(percurso, opcoes, info) {
    var escolhido = (opcoes.aprendido && typeof opcoes.aprendido === "object") ? opcoes.aprendido : null;
    var legado = legadoDeRitual(opcoes);
    if (!escolhido && !legado) return;

    var id = escolhido ? String(escolhido.id || "") : "";
    if (id && percurso.rituaisUsados[id]) return;
    if (id) percurso.rituaisUsados[id] = info.etapa.id;

    percurso.aprendizados.push(novoAprendizado({
      concessao: info.etapa.id,
      degrau: info.etapa.degrau,
      rotuloEtapa: info.etapa.rotulo,
      origem: "poder",
      poder: "aprenderRitual",
      nomePoder: "Aprender Ritual",
      fonte: "OPRPG",
      pagina: 114,
      destino: "conhecido",
      contaNoLimite: true,
      ritualId: id,
      nome: escolhido ? String(escolhido.nome || "") : String(opcoes.ritual || ""),
      circulo: escolhido ? (Number(escolhido.circulo) || 0) : 0,
      elementos: escolhido ? elementosDoDado(escolhido) : [],
      legado: !escolhido,
      regra: regraDeAprenderRitual(info.etapa),
    }));

    aplicarSubstituicao(percurso, opcoes.substituicao, info);
  }

  /* A troca que Aprender Ritual permite. O que sai NÃO é apagado: ele
     continua na ficha, deixa de ser conhecido a partir desta etapa e
     pode ser aprendido de novo por outra aquisição. O que entra herda a
     aquisição do que saiu — inclusive se ela conta no limite. */
  function aplicarSubstituicao(percurso, sub, info) {
    if (!sub || !sub.sai || !sub.sai.id || !sub.entra || !sub.entra.id) return;
    var velho = aprendizadoAtivo(percurso, String(sub.sai.id));
    if (!velho || velho.destino === "grimorio") return;
    var entraId = String(sub.entra.id);
    if (entraId === velho.ritualId || percurso.rituaisUsados[entraId]) return;

    velho.substituidoEm = info.etapa.rotulo;
    velho.substituidoPor = entraId;
    delete percurso.rituaisUsados[velho.ritualId];
    percurso.rituaisUsados[entraId] = velho.concessao;

    percurso.aprendizados.push(novoAprendizado(Object.assign({}, velho, {
      ritualId: entraId,
      nome: String(sub.entra.nome || ""),
      circulo: Number(sub.entra.circulo) || 0,
      elementos: elementosDoDado(sub.entra),
      legado: false,
      substituidoEm: "",
      substituidoPor: "",
      substitui: { id: velho.ritualId, nome: velho.nome },
      viaSubstituicao: info.etapa.rotulo,
    })));
  }

  function novoAprendizado(dados) {
    return Object.assign({
      concessao: "", degrau: 0, rotuloEtapa: "", origem: "", poder: "", nomePoder: "",
      fonte: "", pagina: 0, destino: "conhecido", contaNoLimite: false,
      ritualId: "", nome: "", circulo: 0, elementos: [], legado: false, excecao: false, motivoDaExcecao: "",
      regra: null, substituidoEm: "", substituidoPor: "", substitui: null, viaSubstituicao: "",
      registroDeRitual: "",
    }, dados || {});
  }

  /* O que ainda vale: um aprendizado substituído continua na lista (é
     história da ficha), mas não é mais conhecimento. */
  function ativos(percurso) {
    return percurso.aprendizados.filter(function (a) { return !a.substituidoEm; });
  }

  function aprendizadoAtivo(percurso, ritualId) {
    var achado = null;
    percurso.aprendizados.forEach(function (a) {
      if (a.ritualId === ritualId && !a.substituidoEm) achado = a;
    });
    return achado;
  }

  function contarNoLimite(percurso) {
    return ativos(percurso).filter(function (a) { return a.contaNoLimite; }).length;
  }

  function regraDeAprenderRitual(etapa) {
    return { tipo: "aprenderRitual", maximo: A ? A.circuloDeAprenderRitual(etapa.exposicao) : 1 };
  }

  /* Prende à concessão os vínculos que passaram. Acontece mesmo com a
     concessão incompleta: 1 de 3 escolhidos é 1 ritual aprendido.

     "Manter mesmo assim" vale para a ELEGIBILIDADE — um ritual que a
     mesa liberou fora da regra entra marcado como exceção. Não vale
     para o que é estrutural: ritual que sumiu da ficha, repetido na
     mesma concessão ou já preso a outra. */
  function reivindicarRituais(percurso, v, r, aval) {
    var c = v.concessao;
    if (!c) return;
    var excecaoPermitida = r.ignorarRequisitos === true;

    (aval.rituais || []).forEach(function (linha) {
      if (linha.estrutural) return;
      if (!linha.ok && !excecaoPermitida) return;
      if (percurso.rituaisUsados[linha.dado.id]) return;

      percurso.rituaisUsados[linha.dado.id] = c.id;
      percurso.aprendizados.push(novoAprendizado({
        concessao: c.id,
        degrau: c.degrau,
        rotuloEtapa: v.rotuloEtapa,
        origem: c.origem,
        poder: c.poder,
        nomePoder: c.nomePoder,
        fonte: c.fonte,
        pagina: c.pagina,
        destino: c.destino,
        contaNoLimite: !!c.contaNoLimite,
        ritualId: linha.dado.id,
        nome: linha.dado.nome,
        circulo: linha.dado.circulo,
        elementos: elementosDoDado(linha.dado),
        excecao: !linha.ok,
        motivoDaExcecao: linha.motivo,
        regra: { tipo: "concessao", concessao: c },
      }));
    });
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

      /* Treinar: leva a treinado, sem passar disso (Esperto; as perícias
         da transição para agente). */
      case "treinar": {
        var kt = o[ef.opcao];
        if (typeof kt === "string" && C.pericia(kt)) subirGrau(percurso, kt, 1, fonte, detalhe);
        return;
      }
      case "treinarLista":
        (Array.isArray(o[ef.opcao]) ? o[ef.opcao] : []).forEach(function (k) {
          if (C.pericia(k)) subirGrau(percurso, k, 1, fonte, detalhe);
        });
        return;

      case "treinarOuBonus": {
        var k = ef.pericia || o[ef.opcao];
        if (!k || !C.pericia(k)) return;
        if ((percurso.graus[k] || 0) === 0) subirGrau(percurso, k, 1, fonte, detalhe);
        else efeitos.push({ tipo: "bonusPericia", pericias: [k], valor: ef.bonus, fonte: fonte, detalhe: detalhe + " · já era treinado" });
        return;
      }

      /* CQB (AS9 p. 40): treina a primeira da lista que não for
         treinada; já treinado em todas, +bonus em todas. */
      case "treinarCascata": {
        var livre = (ef.pericias || []).filter(function (k) { return C.pericia(k) && (percurso.graus[k] || 0) === 0; })[0];
        if (livre) subirGrau(percurso, livre, 1, fonte, detalhe);
        else efeitos.push({ tipo: "bonusPericia", pericias: (ef.pericias || []).slice(), valor: ef.bonus || 2, fonte: fonte, detalhe: detalhe + " · já era treinado em todas" });
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
          else if (ef.tipo === "dtAprimorada") copia.alvo = String(valor);
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
    var rituais = rituaisDoContexto(contexto);
    return JSON.stringify([
      ordem.classe, ordem.origem, ordem.trilha, ordem.nex, ordem.nivel,
      /* O estágio e a trajetória decidem as vagas do Sobrevivente e da
         transição (v2.21). */
      ordem.estagio, ordem.trajetoria || null,
      /* O estado dos poderes de origem liga e desliga efeitos (o
         companheiro animal que morreu). */
      ordem.estadoDasOrigens || null,
      ordem.atributos, ordem.pericias, ordem.escolhas, ordem.afinidade, ordem.opcionais,
      ordem.registrosDeRitual || null, ordem.prestigio,
      /* O marco de estado importado e as aquisições dele (v2.34). */
      ordem.importacao ? [ordem.importacao.marco, ordem.importacao.aquisicoes, ordem.importacao.reconstrucao || null] : null,
      /* As aquisições extras (v9.16). */
      ordem.extras || null,
      Object.keys(desativadasDe(ordem)).sort(),
      ordem.progressao ? ordem.progressao.length : 0,
      /* Em uso: um extra pode depender do item vestido (v9.16). */
      itens ? itens.map(function (i) { return i ? [i.id, i.tipo, i.nome, i.ordem && i.ordem.grupo, !!(i.ordem && i.ordem.emUso)] : null; }) : null,
      /* O círculo e o elemento de cada ritual entram na assinatura: é
         por eles que a elegibilidade de uma concessão é conferida, e
         mudar um à mão precisa refazer a conta. */
      rituais ? rituais.map(function (x) {
        var d = x ? dadosDoRitualDaFicha(x) : null;
        return d ? [d.id, d.nome, d.circulo, d.elemento, d.catalogo] : null;
      }) : null,
    ]);
  }

  /* =================================================================
     CICLO DE CÁLCULO (v2.46)
     -----------------------------------------------------------------
     Um desenho da ficha pede o estado da progressão centenas de vezes —
     cada atributo, cada perícia, cada modificador —, e cada pedido
     montava a assinatura acima com JSON.stringify de metade da ficha só
     para descobrir que nada tinha mudado desde a pergunta anterior.

     Dentro de um CICLO (aberto pela tela em volta de um desenho, por
     ciclo() do motor de regras), a ficha não muda: o desenho só lê. Então
     o estado já calculado é reaproveitado pela identidade da ficha e uma
     marca BARATA — referências e números, nada serializado. A marca
     confere de novo o que um desenho poderia, por descuido, trocar (uma
     lista substituída, um item a mais); quem mexe na ficha de verdade é a
     ação da pessoa, que acontece fora do ciclo, e o próximo desenho abre
     um ciclo novo, vazio.

     Fora do ciclo, nada muda: a assinatura de sempre decide. Não há
     invalidação para lembrar — o ciclo acaba e a memória vai junto.
     ================================================================= */

  var CICLO = null;

  function abrirCiclo() {
    if (CICLO) { CICLO.nivel++; return; }
    CICLO = { nivel: 1, estados: typeof Map !== "undefined" ? new Map() : null, reaproveitados: 0, calculados: 0 };
  }

  function fecharCiclo() {
    if (!CICLO) return null;
    CICLO.nivel--;
    if (CICLO.nivel > 0) return null;
    var fim = { reaproveitados: CICLO.reaproveitados, calculados: CICLO.calculados };
    CICLO = null;
    return fim;
  }

  function emCiclo() { return !!CICLO; }

  function marcaDoCiclo(ordem, contexto) {
    var itens = itensDoContexto(contexto);
    var rituais = rituaisDoContexto(contexto);
    return [
      itens, itens ? itens.length : -1, rituais, rituais ? rituais.length : -1,
      ordem.classe, ordem.origem, ordem.trilha, ordem.nex, ordem.nivel, ordem.estagio,
      ordem.atributos, ordem.pericias, ordem.escolhas, Array.isArray(ordem.escolhas) ? ordem.escolhas.length : -1,
      ordem.opcionais, ordem.afinidade, ordem.estadoDasOrigens, ordem.trajetoria,
      ordem.registrosDeRitual, Array.isArray(ordem.registrosDeRitual) ? ordem.registrosDeRitual.length : -1,
      ordem.prestigio, ordem.importacao, ordem.personalizacoes, ordem.excluidas, ordem.extras,
      Array.isArray(ordem.extras) ? ordem.extras.length : -1,
      Array.isArray(ordem.progressao) ? ordem.progressao.length : -1,
    ];
  }

  function mesmaMarca(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function doCiclo(ordem, contexto) {
    if (!CICLO || !CICLO.estados) return null;
    var lista = CICLO.estados.get(ordem);
    if (!lista) return null;
    var marca = marcaDoCiclo(ordem, contexto);
    for (var i = 0; i < lista.length; i++) {
      if (mesmaMarca(lista[i].marca, marca)) { CICLO.reaproveitados++; return lista[i]; }
    }
    return null;
  }

  function guardarNoCiclo(ordem, contexto, estado) {
    if (!CICLO || !CICLO.estados) return;
    var lista = CICLO.estados.get(ordem) || [];
    lista.push({ marca: marcaDoCiclo(ordem, contexto), estado: estado });
    CICLO.estados.set(ordem, lista);
    CICLO.calculados++;
  }

  function estado(ordem, contexto) {
    if (!ordem) return null;
    var noCiclo = doCiclo(ordem, contexto);
    if (noCiclo) return noCiclo.estado;
    var e = estadoPelaAssinatura(ordem, contexto);
    guardarNoCiclo(ordem, contexto, e);
    return e;
  }

  function estadoPelaAssinatura(ordem, contexto) {
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

  /* =================================================================
     O MARCO DE ESTADO IMPORTADO (v2.34)
     -----------------------------------------------------------------
     Numa ficha importada, `ordem.atributos` e `ordem.pericias` já são os
     valores do momento da importação, e `importacao.aquisicoes` traz os
     poderes que ela tinha. Então:

       · uma etapa de escolha no marco ou abaixo dele, sem registro, é
         HISTÓRICO INDISPONÍVEL: não vira vaga, não aplica aumento nem
         concessão de novo. Um registro feito nela (ex.: a arma favorita
         confirmada na revisão) vale normalmente;
       · cada poder importado reconhecido entra como aquisição, com os
         efeitos de conta — menos os que já estão nos valores atuais
         (treino e atributo) — e conta nos requisitos futuros;
       · o que a camada oficial já dá (habilidade da classe, da trilha)
         não entra duas vezes: a oficial vale e a importada fica de lado;
       · acima do marco, a evolução é a de sempre.
     ================================================================= */

  var TIPOS_NAO_HISTORICOS = { trilha: true, afinidade: true, trilhaSobrevivente: true };
  /* Efeitos que já estão no retrato importado (o treino e o atributo
     que o poder deu): aplicá-los de novo dobraria o valor. */
  var EFEITOS_DO_RETRATO = { grauPericias: true, treinar: true, treinarLista: true, treinarOuBonus: true, grauMinimo: true, atributo: true };

  function marcoDe(ordem) {
    var imp = ordem && ordem.importacao;
    return imp && imp.marco ? imp.marco : null;
  }

  function vagaHistorica(v, marco) {
    if (!marco || TIPOS_NAO_HISTORICOS[v.tipo]) return false;
    if (marco.modo === "estagio") return !!(v.estagio ? v.estagio <= (marco.estagio || 0) : v.degrau <= 1);
    if (v.nexExposicao) return v.nexExposicao <= (marco.nex || 0);
    return v.degrau <= (marco.degrau || 0);
  }

  /* As chaves que a camada oficial já dá nesta ficha. */
  function providasPelasRegras(ordem, t) {
    var providas = {};
    P.AUTOMATICAS.forEach(function (a) { if (a.classes.indexOf(ordem.classe) >= 0) providas[a.chave] = "classe"; });
    var tr = C.trilha(ordem.trilha);
    if (tr && C.trilhaServe(tr, ordem.classe, ordem)) {
      var registradas = {};
      (ordem.escolhas || []).forEach(function (r) { if (r && r.etapa) registradas[r.etapa] = true; });
      P.habilidadesDaTrilha(tr.chave).forEach(function (h) {
        if (h.nex > t.nexEquivalente) return;
        /* A habilidade com opção (A Favorita) só vem da trilha quando a
           opção foi registrada; sem ela, a importada continua valendo. */
        if (h.opcoes.length && !registradas["b." + h.chave]) return;
        providas[h.chave] = "trilha";
      });
    }
    return providas;
  }

  function adquirirImportadas(ordem, percurso, efeitos, marco, t) {
    var imp = ordem.importacao;
    if (!imp || !Array.isArray(imp.aquisicoes)) return [];
    var providas = providasPelasRegras(ordem, t);
    var deLado = [];
    var etapa = etapaDe(ordem, { id: "importacao", degrau: marco ? marco.degrau : 0, rotuloEtapa: "Estado importado" });
    imp.aquisicoes.forEach(function (aq) {
      if (aq.representacao !== "importada") return;
      var e = P.poder(aq.chave);
      if (!e) return;
      if (providas[e.chave]) { deLado.push({ aquisicao: aq, motivo: providas[e.chave] }); return; }
      var id = "importacao." + aq.ref;
      var desligada = !!percurso.desligadas[id];
      percurso.adquiridos.push({
        id: id, chave: e.chave, nome: e.nome, tipo: e.tipo, elemento: e.elemento || "", opcoes: aq.opcoes || {},
        afinidade: !!aq.afinidade, valido: true, completo: true, via: "importacao", degrau: etapa.degrau,
        etapaId: "importacao", rotuloEtapa: etapa.rotulo, entrada: e, motivos: [], importada: true,
        procedencia: aq.procedencia || "", efeitosDesativados: desligada,
      });
      if (desligada) return;
      (e.efeitos || []).concat(aq.afinidade ? (e.efeitosAfinidade || []) : []).forEach(function (ef) {
        if (EFEITOS_DO_RETRATO[ef.tipo]) return;
        aplicarEfeito(percurso, efeitos, ef, aq.opcoes || {}, { nome: e.nome, detalhe: "estado importado" }, etapa);
      });
    });
    return deLado;
  }


  /* =================================================================
     RECONSTRUÇÃO DO HISTÓRICO IMPORTADO (v9.16)
     -----------------------------------------------------------------
     O marco acima guarda o retrato: as etapas até ele ficam "histórico
     indisponível". Quem sabe a história pode trocá-la pelas escolhas de
     verdade, etapa por etapa, pela MESMA vaga e pelo MESMO registro de
     uma ficha nativa (`ordem.escolhas`). O que muda é só um detalhe de
     contabilidade: o retrato já contém o que aquela escolha deu (o +1
     do atributo, o grau de treino), então registrar a escolha numa
     etapa do retrato DEVOLVE à base de criação o que ela passou a dar —
     o valor final continua o importado, e nada conta duas vezes.

       importacao.reconstrucao = {
         versao: 1,
         retrato:    { atributos, pericias }   valores do momento da importação
         vagas:      { idDaVaga: "desconhecida" | "vazia" }
         absorvidos: { idDaVaga: { atributos: {k: n}, graus: {k: n} } }
       }

     · etapa com registro            → reconstruída: vale como na ficha nativa;
     · "vazia"                        → a vaga não foi preenchida de verdade:
                                         volta a ser pendência normal;
     · "desconhecida" ou sem marca    → continua histórico indisponível.

     `absorvidos` diz quanto a reconstrução daquela etapa tirou da base,
     para desfazer devolver exatamente isso. Depois de reconstruída, a
     etapa é uma etapa nativa: trocar a escolha muda os valores como em
     qualquer ficha. A importação continua registrada (procedência),
     mas não substitui os vínculos reconstruídos.
     ================================================================= */

  var SITUACOES_DE_VAGA = { desconhecida: true, vazia: true };

  function reconstrucaoDe(ordem) {
    var imp = ordem && ordem.importacao;
    var r = imp && imp.reconstrucao;
    return r && typeof r === "object" ? r : null;
  }

  function situacaoMarcada(ordem, idVaga) {
    var r = reconstrucaoDe(ordem);
    var s = r && r.vagas ? r.vagas[idVaga] : "";
    return SITUACOES_DE_VAGA[s] ? s : "";
  }

  function garantirReconstrucao(ordem) {
    var imp = ordem.importacao;
    if (!imp.reconstrucao || typeof imp.reconstrucao !== "object") imp.reconstrucao = { versao: 1 };
    var r = imp.reconstrucao;
    if (!r.vagas || typeof r.vagas !== "object") r.vagas = {};
    if (!r.absorvidos || typeof r.absorvidos !== "object") r.absorvidos = {};
    if (!r.retrato || typeof r.retrato !== "object") {
      r.retrato = { atributos: Object.assign({}, ordem.atributos || {}), pericias: Object.assign({}, ordem.pericias || {}) };
    }
    return r;
  }

  function grauDaBase(ordem, k) {
    var g = GRAUS.indexOf(C.grau(ordem.pericias ? ordem.pericias[k] : "").chave);
    return g < 0 ? 0 : g;
  }
  function definirGrauDaBase(ordem, k, g) {
    if (!ordem.pericias) ordem.pericias = {};
    if (g <= 0) delete ordem.pericias[k];
    else ordem.pericias[k] = GRAUS[Math.min(3, g)];
  }

  /* Os valores finais da ficha agora (atributos e graus em número). */
  function valoresFinais(ordem, contexto) {
    var est = percorrer(ordem, contexto, null);
    var graus = {};
    Object.keys(est.graus).forEach(function (k) { graus[k] = Math.max(0, GRAUS.indexOf(est.graus[k])); });
    return { atributos: Object.assign({}, est.atributos), graus: graus, estado: est };
  }

  /* As chaves de atributo e de perícia que uma escolha menciona, em
     qualquer profundidade (Versatilidade → poder → perícia). */
  function chavesDaEscolha(reg) {
    var saida = { atributos: {}, pericias: {} };
    (function andar(v, prof) {
      if (prof > 9 || v === null || v === undefined) return;
      if (typeof v === "string") {
        if (C.ATRIBUTOS.some(function (a) { return a.chave === v; })) saida.atributos[v] = true;
        else if (C.pericia(v)) saida.pericias[v] = true;
        return;
      }
      if (typeof v === "object") Object.keys(v).forEach(function (k) { andar(v[k], prof + 1); });
    })([reg && reg.valor, reg && reg.opcoes], 0);
    return { atributos: Object.keys(saida.atributos), pericias: Object.keys(saida.pericias) };
  }

  /* A avaliação de uma escolha (registro de etapa) ou de um extra. */
  function avaliacaoDe(est, reg) {
    if (!reg) return null;
    if (reg.extra) {
      var x = (est.extras || []).filter(function (y) { return y.ref === reg.extra; })[0];
      return x ? { valido: x.valido, completo: x.completo, motivos: x.motivos || [], faltam: x.faltam || [] } : null;
    }
    return est.avaliacoes[reg.id] || null;
  }
  function problemasDe(est, reg) {
    var av = avaliacaoDe(est, reg);
    if (!av) return 99;
    return (av.motivos || []).length + (av.valido ? 0 : 1);
  }

  /* Depois de registrar uma escolha numa etapa do retrato: tira da base
     o que a escolha passou a dar, até os valores finais voltarem a ser
     os de antes (`alvo`). Duas situações:
       · a escolha vale e soma por cima do retrato (o atributo vai a 4
         onde o retrato tinha 3) → a base desce a diferença;
       · a escolha não vale porque o retrato já contém o que ela dá (a
         perícia "já é treinada", o atributo "já está em 5") → a base
         desce um passo naquela chave, se isso resolver sem mudar o
         valor final.
     O que não fecha volta como diferença, para a revisão decidir. */
  function absorver(ordem, idVaga, alvo, contexto, opcoesAbs) {
    var mov = { atributos: {}, graus: {} };
    /* "extra.<ref>": a absorção de um extra que veio de um poder
       importado (o retrato já continha o que ele dá). */
    var refExtra = /^extra\./.test(idVaga) ? idVaga.slice(6) : "";
    function reg() {
      if (refExtra) {
        var x = extrasDe(ordem).filter(function (y) { return y.ref === refExtra; })[0];
        return x ? { id: "extra:" + x.ref, extra: x.ref, valor: x.chave, opcoes: x.opcoes } : null;
      }
      return (ordem.escolhas || []).filter(function (r) { return r.etapa === idVaga; })[0] || null;
    }
    function moverAtributo(k, n) {
      var base = inteiro(ordem.atributos[k], 0);
      var novo = Math.max(0, base - n);
      if (novo === base) return false;
      ordem.atributos[k] = novo;
      mov.atributos[k] = (mov.atributos[k] || 0) + (base - novo);
      return true;
    }
    function moverGrau(k, n) {
      var base = grauDaBase(ordem, k);
      var novo = Math.max(0, base - n);
      if (novo === base) return false;
      definirGrauDaBase(ordem, k, novo);
      mov.graus[k] = (mov.graus[k] || 0) + (base - novo);
      return true;
    }
    function desfazerUm(tipo, k) {
      if (tipo === "atributo") { ordem.atributos[k] = inteiro(ordem.atributos[k], 0) + 1; mov.atributos[k]--; if (!mov.atributos[k]) delete mov.atributos[k]; }
      else { definirGrauDaBase(ordem, k, grauDaBase(ordem, k) + 1); mov.graus[k]--; if (!mov.graus[k]) delete mov.graus[k]; }
    }

    var tentadas = [];
    for (var volta = 0; volta < 12; volta++) {
      var agora = valoresFinais(ordem, contexto);
      var mudou = false;
      C.ATRIBUTOS.forEach(function (a) {
        var d = (agora.atributos[a.chave] || 0) - (alvo.atributos[a.chave] || 0);
        if (d > 0 && moverAtributo(a.chave, d)) mudou = true;
      });
      Object.keys(alvo.graus).forEach(function (k) {
        var d = (agora.graus[k] || 0) - (alvo.graus[k] || 0);
        if (d > 0 && moverGrau(k, d)) mudou = true;
      });
      if (mudou) continue;
      var r = reg();
      var antes = problemasDe(agora.estado, r);
      if (!r || antes === 0) break;
      /* A escolha não vale: tenta descer um passo em cada chave que ela
         menciona e fica com o que resolve sem mexer no valor final. */
      var ch = chavesDaEscolha(r);
      var tentativas = ch.atributos.map(function (k) { return ["atributo", k]; }).concat(ch.pericias.map(function (k) { return ["grau", k]; }));
      var achou = false;
      for (var i = 0; i < tentativas.length && !achou; i++) {
        var tp = tentativas[i][0], k = tentativas[i][1];
        var ok = tp === "atributo" ? (alvo.atributos[k] > 0 && moverAtributo(k, 1)) : ((alvo.graus[k] || 0) > 0 && moverGrau(k, 1));
        if (!ok) continue;
        /* Menos problemas é o sinal: a escolha pode precisar de vários
           passos (três perícias de um Grau de Treinamento) até valer; o
           valor final é conferido no fim. */
        var depois = valoresFinais(ordem, contexto);
        if (problemasDe(depois.estado, reg()) < antes) { achou = true; tentadas.push([tp, k]); }
        else desfazerUm(tp, k);
      }
      if (!achou) break;
    }
    /* Se as tentativas não chegaram a uma escolha válida, a base volta
       ao que era: melhor a escolha marcada com o motivo do que um valor
       perdido. */
    var rFim = reg();
    var avFim = rFim ? avaliacaoDe(valoresFinais(ordem, contexto).estado, rFim) : null;
    /* Numa simulação (a janela conferindo uma escolha ainda pela metade)
       as tentativas ficam: o que a tela mostra é o que falta, não o
       problema que a base de antes criaria. */
    if (tentadas.length && rFim && !(avFim && avFim.valido && avFim.completo) && !(opcoesAbs && opcoesAbs.simulacao)) {
      tentadas.reverse().forEach(function (x) { desfazerUm(x[0], x[1]); });
    }

    var rec = garantirReconstrucao(ordem);
    var acumulado = rec.absorvidos[idVaga] || { atributos: {}, graus: {} };
    Object.keys(mov.atributos).forEach(function (k) { acumulado.atributos[k] = (acumulado.atributos[k] || 0) + mov.atributos[k]; });
    Object.keys(mov.graus).forEach(function (k) { acumulado.graus[k] = (acumulado.graus[k] || 0) + mov.graus[k]; });
    if (Object.keys(acumulado.atributos).length || Object.keys(acumulado.graus).length) rec.absorvidos[idVaga] = acumulado;
    else delete rec.absorvidos[idVaga];

    var fim = valoresFinais(ordem, contexto);
    var diferencas = [];
    C.ATRIBUTOS.forEach(function (a) {
      if ((fim.atributos[a.chave] || 0) !== (alvo.atributos[a.chave] || 0)) diferencas.push({ tipo: "atributo", chave: a.chave, nome: a.nome, esperado: alvo.atributos[a.chave] || 0, obtido: fim.atributos[a.chave] || 0 });
    });
    Object.keys(alvo.graus).forEach(function (k) {
      if ((fim.graus[k] || 0) !== (alvo.graus[k] || 0)) diferencas.push({ tipo: "pericia", chave: k, nome: nomeDaPericia(k), esperado: GRAUS[alvo.graus[k] || 0], obtido: GRAUS[fim.graus[k] || 0] });
    });
    var r2 = reg();
    return { movido: mov, diferencas: diferencas, avaliacao: avaliacaoDe(fim.estado, r2), estado: fim.estado };
  }

  function vagaDoHistorico(ordem, idVaga) {
    var marco = marcoDe(ordem);
    if (!marco) return null;
    var v = vagas(ordem).filter(function (x) { return x.id === idVaga; })[0] || null;
    return v && vagaHistorica(v, marco) ? v : null;
  }

  /* As aquisições importadas que uma etapa reconstruída representa
     voltam a valer sozinhas quando a etapa é desfeita. */
  function soltarAquisicoesDaVaga(ordem, idVaga) {
    (ordem.importacao && ordem.importacao.aquisicoes || []).forEach(function (a) {
      if (a.representacao === "progressao" && a.vaga === idVaga) { a.representacao = "importada"; delete a.vaga; }
    });
  }

  /* Registra a escolha de verdade numa etapa do retrato. `candidato` é o
     mesmo { valor, opcoes } da janela de escolha; para uma concessão de
     rituais, { rituais: [vínculos] }. `info.aquisicoes`: refs das
     aquisições importadas que esta escolha passa a representar (saem da
     conta como importadas — uma fonte mecânica só). */
  function reconstruirVaga(ordem, idVaga, candidato, info, contexto) {
    var v = vagaDoHistorico(ordem, idVaga);
    if (!v) return { ok: false, motivo: "Esta etapa não faz parte do histórico importado desta ficha." };
    var i = info || {};
    var rec = garantirReconstrucao(ordem);
    var existente = (ordem.escolhas || []).filter(function (r) { return r.etapa === idVaga; })[0];
    if (existente) desfazerReconstrucao(ordem, idVaga, contexto, { manterMarca: true });
    var alvo = valoresFinais(ordem, contexto);
    var registro;
    if (v.tipo === "rituais") {
      registro = definirRituais(ordem, idVaga, (candidato && candidato.rituais) || []);
      if (!registro) { delete rec.vagas[idVaga]; return { ok: true, registro: null, movido: { atributos: {}, graus: {} }, diferencas: [] }; }
    } else {
      registro = registrar(ordem, v, candidato || {});
    }
    if (i.procedencia) registro.procedencia = String(i.procedencia).slice(0, 160);
    delete rec.vagas[idVaga];
    var refs = {};
    (i.aquisicoes || []).forEach(function (ref) { refs[ref] = true; });
    (ordem.importacao.aquisicoes || []).forEach(function (a) {
      if (refs[a.ref]) { a.representacao = "progressao"; a.vaga = idVaga; }
    });
    var res = absorver(ordem, idVaga, alvo, contexto, { simulacao: !!i.simulacao });
    return { ok: true, registro: registro, movido: res.movido, diferencas: res.diferencas, avaliacao: res.avaliacao };
  }

  /* Volta a etapa ao retrato: a escolha sai, a base recebe de volta o
     que a reconstrução tirou, e as aquisições importadas que ela
     representava voltam a valer. */
  function desfazerReconstrucao(ordem, idVaga, contexto, opcoes) {
    var rec = reconstrucaoDe(ordem);
    var reg = (ordem.escolhas || []).filter(function (r) { return r.etapa === idVaga; })[0];
    if (reg) remover(ordem, reg.id);
    var ab = rec && rec.absorvidos ? rec.absorvidos[idVaga] : null;
    if (ab) {
      Object.keys(ab.atributos || {}).forEach(function (k) { ordem.atributos[k] = inteiro(ordem.atributos[k], 0) + ab.atributos[k]; });
      Object.keys(ab.graus || {}).forEach(function (k) { definirGrauDaBase(ordem, k, grauDaBase(ordem, k) + ab.graus[k]); });
      delete rec.absorvidos[idVaga];
    }
    soltarAquisicoesDaVaga(ordem, idVaga);
    if (rec && !(opcoes && opcoes.manterMarca)) delete rec.vagas[idVaga];
    return { ok: true };
  }

  /* "Etapa desconhecida" (continua histórico) ou "não preenchida" (vira
     pendência normal). Uma etapa com escolha é desfeita antes. */
  function marcarVaga(ordem, idVaga, situacao, contexto) {
    if (!vagaDoHistorico(ordem, idVaga)) return { ok: false, motivo: "Esta etapa não faz parte do histórico importado desta ficha." };
    if (situacao && !SITUACOES_DE_VAGA[situacao]) return { ok: false, motivo: "Situação desconhecida." };
    if ((ordem.escolhas || []).some(function (r) { return r.etapa === idVaga; })) desfazerReconstrucao(ordem, idVaga, contexto, { manterMarca: true });
    var rec = garantirReconstrucao(ordem);
    if (situacao) rec.vagas[idVaga] = situacao; else delete rec.vagas[idVaga];
    return { ok: true };
  }

  /* As etapas do retrato, com a situação de cada uma — a visão da
     progressão da reconstrução (o assistente e a aba Progressão leem
     daqui). */
  function etapasDoHistorico(ordem, contexto) {
    var marco = marcoDe(ordem);
    if (!marco) return [];
    var est = estado(ordem, contexto);
    var porEtapa = {};
    (ordem.escolhas || []).forEach(function (r) { porEtapa[r.etapa] = r; });
    return vagas(ordem).filter(function (v) { return vagaHistorica(v, marco); }).map(function (v) {
      var r = porEtapa[v.id] || null;
      var av = r ? est.avaliacoes[r.id] : null;
      var marca = situacaoMarcada(ordem, v.id);
      var situacao = r ? (av && av.valido && av.completo ? "reconstruida" : (av && !av.valido ? "invalida" : "incompleta")) : (marca === "vazia" ? "vazia" : "desconhecida");
      return {
        id: v.id, vaga: v, tipo: v.tipo, rotulo: v.rotulo, rotuloEtapa: v.rotuloEtapa || etapaDe(ordem, v).rotulo, degrau: v.degrau,
        situacao: situacao, marcada: !!marca, registro: r, avaliacao: av,
        descricao: r ? descrever(ordem, r) : "",
      };
    });
  }

  /* Completa: nenhuma etapa do retrato ficou sem história e nenhuma
     aquisição importada ficou "etapa desconhecida". A partir daí o marco
     não segura mais nada — a ficha é como uma nativa. */
  function reconstrucaoCompleta(ordem, contexto) {
    if (!marcoDe(ordem) || !reconstrucaoDe(ordem)) return false;
    var abertas = etapasDoHistorico(ordem, contexto).filter(function (x) { return x.situacao === "desconhecida"; });
    if (abertas.length) return false;
    /* A importada que a camada oficial já dá (a habilidade da trilha,
       com a opção registrada) não conta: ela fica de lado sozinha. */
    var deLado = {};
    (estado(ordem, contexto).importadasDeLado || []).forEach(function (x) { if (x.aquisicao) deLado[x.aquisicao.ref] = true; });
    return !(ordem.importacao.aquisicoes || []).some(function (a) { return a.representacao === "importada" && !deLado[a.ref]; });
  }

  /* Se um poder cabe numa etapa do retrato, e por qual caminho: direto,
     por Transcender (poder paranormal numa vaga de poder de classe) ou
     pela trilha (Versatilidade). `via: "nao"` = a etapa não concede
     esse tipo de poder. */
  function cabeNaVaga(v, e, ordem) {
    var paranormal = e.tipo === "paranormal";
    switch (v.tipo) {
      case "poderClasse":
        if (paranormal) return { ok: true, via: "transcender" };
        if ((e.tipo === "classe" || e.tipo === "geral") && P.pertenceAClasse(e, ordem.classe)) return { ok: true, via: "direto" };
        if (e.tipo === "classe" || e.tipo === "geral") return { ok: false, via: "direto", motivo: e.nome + " não é um poder da classe da ficha (de outra classe, entra por uma escolha interna, como Expansão de Conhecimento)." };
        return { ok: false, via: "nao", motivo: "Esta etapa concede um poder de classe." };
      case "versatilidade":
        if (e.tipo === "trilha" && P.primeiraDaTrilha(e.trilha) && P.primeiraDaTrilha(e.trilha).chave === e.chave) return { ok: true, via: "trilha" };
        if (paranormal) return { ok: true, via: "transcender" };
        if ((e.tipo === "classe" || e.tipo === "geral") && P.pertenceAClasse(e, ordem.classe)) return { ok: true, via: "direto" };
        return { ok: false, via: "nao", motivo: "Versatilidade dá um poder de classe ou o primeiro poder de outra trilha da classe." };
      case "transcenderExposicao":
      case "transcenderItem":
        return paranormal ? { ok: true, via: "direto" } : { ok: false, via: "nao", motivo: "Esta etapa só concede poder paranormal." };
      case "trilhaElite":
        var trE = C.trilha(ordem.trilha);
        return trE && opcoesDeElite(trE.chave).some(function (h) { return h.chave === e.chave; }) ? { ok: true, via: "direto" } : { ok: false, via: "nao", motivo: "A habilidade de elite é a 3ª ou a 4ª da trilha da ficha." };
      default:
        return { ok: false, via: "nao", motivo: "Esta etapa não concede poder." };
    }
  }

  /* Compatibilidade de vários poderes com uma etapa, conferida no
     personagem de antes dela — sem a própria aquisição importada (um
     poder ainda "etapa desconhecida" não pode barrar a si mesmo). */
  function compatibilidadeNaVaga(ordem, idVaga, itens, contexto) {
    var c = contextoDaVaga(ordem, idVaga, contexto);
    return (itens || []).map(function (it) {
      if (!c) return { ok: false, via: "nao", motivos: ["Etapa inexistente."] };
      var e = P.poder(it.chave);
      if (!e) return { ok: false, via: "nao", motivos: ["Sem poder do catálogo."] };
      var cabe = cabeNaVaga(c.vaga, e, ordem);
      if (!cabe.ok) return { ok: false, via: cabe.via, motivos: [cabe.motivo] };
      var p = c.percurso;
      if (it.ref) {
        p = copiarPercurso(p);
        p.adquiridos = p.adquiridos.filter(function (a) { return a.id !== "importacao." + it.ref; });
      }
      var motivos = candidato(e, p, c.etapa, ordem, it.opcoes || {}).motivos.slice();
      if (cabe.via === "transcender") motivos = candidato(P.poder("transcender"), p, c.etapa, ordem).motivos.concat(motivos);
      var mg = motivoDoGrupo(e, c.vaga, ordem);
      if (mg) motivos.push(mg);
      return { ok: !motivos.length, via: cabe.via, motivos: motivos };
    });
  }

  /* Rituais numa concessão do retrato: quantos ela dá naquela etapa e se
     cada ritual cabe nela. */
  function compatibilidadeDeRituais(ordem, idVaga, rituais, contexto) {
    var c = contextoDaVaga(ordem, idVaga, contexto);
    if (!c || c.vaga.tipo !== "rituais" || !A) return { quantidade: 0, itens: (rituais || []).map(function () { return { ok: false, motivos: ["Esta etapa não concede rituais."] }; }) };
    var quantidade = A.quantidadeDa(c.vaga.concessao, c.percurso.atributos.int || 0);
    return {
      quantidade: quantidade,
      itens: (rituais || []).map(function (rit) {
        var dado = rit ? dadosDoRitualDaFicha(rit) : null;
        if (!dado) return { ok: false, motivos: ["Ritual sem dados."] };
        var eleg = A.elegibilidade(c.vaga.concessao, comConhecimento(dado, ordem, c.percurso, c.etapa, contexto));
        return { ok: eleg.ok, motivos: eleg.ok ? [] : [eleg.motivo] };
      }),
    };
  }

  /* =================================================================
     AQUISIÇÕES EXTRAS (v9.16)
     -----------------------------------------------------------------
     O que o personagem recebeu FORA das vagas normais: recompensa da
     campanha, treinamento especial, concessão do mestre, efeito
     permanente, poder dado por item. Não ocupa vaga e não fica válido
     só por ser extra: os requisitos são conferidos na etapa informada
     (ou no personagem atual, se a etapa não é conhecida). Ignorar um
     requisito é uma EXCEÇÃO, separada da concessão, com motivo escrito.

       ordem.extras = [{
         ref,                      identidade estável (não é `id`: a
                                   exportação apaga todo id)
         tipo: "poder" | "atributo" | "treino",
         chave, opcoes,            o poder e as escolhas internas dele
         atributo, valor,          tipo "atributo": +valor no atributo
         pericia, grau,            tipo "treino": a perícia vai ao grau
         nome,                     retrato do rótulo
         procedencia,              justificativa ("recompensa da missão…")
         quando: { degrau } | null quando foi adquirida, se conhecido
         depende: { tipo: "item", item, emUso } | { tipo: "aquisicao",
                  chave } | { tipo: "condicao", texto, ativa } | null
         excecao: { motivo } | null
         importacao: ref da aquisição importada que ele representa
       }]
     ================================================================= */

  var TIPOS_DE_EXTRA = { poder: true, atributo: true, treino: true };

  function normalizarExtra(b) {
    if (!b || typeof b !== "object") return null;
    var ref = /^[A-Za-z0-9_.:-]{1,60}$/.test(String(b.ref || "")) ? String(b.ref) : "";
    if (!ref) return null;
    var tipo = TIPOS_DE_EXTRA[b.tipo] ? b.tipo : "poder";
    var x = {
      ref: ref, tipo: tipo,
      chave: tipo === "poder" && /^[A-Za-z0-9.:_-]{1,80}$/.test(String(b.chave || "")) ? String(b.chave) : "",
      opcoes: tipo === "poder" ? (limparOpcoes(b.opcoes) || {}) : {},
      nome: String(b.nome || "").replace(/[\u0000-\u001F]/g, " ").slice(0, 160),
      procedencia: String(b.procedencia || "").replace(/[\u0000-\u001F]/g, " ").slice(0, 200),
      quando: b.quando && typeof b.quando === "object" && Number.isFinite(Number(b.quando.degrau)) && b.quando.degrau !== null && b.quando.degrau !== ""
        ? { degrau: Math.max(0, Math.min(40, inteiro(b.quando.degrau, 0))) } : null,
      depende: null,
      excecao: b.excecao && typeof b.excecao === "object" && String(b.excecao.motivo || "").trim()
        ? { motivo: String(b.excecao.motivo).replace(/[\u0000-\u001F]/g, " ").trim().slice(0, 300) } : null,
      registradoEm: typeof b.registradoEm === "string" ? b.registradoEm.slice(0, 40) : "",
    };
    if (tipo === "atributo") {
      x.atributo = C.ATRIBUTOS.some(function (a) { return a.chave === b.atributo; }) ? b.atributo : "";
      x.valor = Math.max(-5, Math.min(5, inteiro(b.valor, 1))) || 1;
    }
    if (tipo === "treino") {
      x.pericia = C.pericia(b.pericia) ? b.pericia : "";
      x.grau = GRAUS.indexOf(b.grau) > 0 ? b.grau : "treinado";
    }
    var d = b.depende && typeof b.depende === "object" ? b.depende : null;
    if (d && d.tipo === "item" && typeof d.item === "string" && d.item) x.depende = { tipo: "item", item: d.item.slice(0, 80), emUso: d.emUso === true };
    else if (d && d.tipo === "aquisicao" && /^[A-Za-z0-9.:_-]{1,80}$/.test(String(d.chave || ""))) x.depende = { tipo: "aquisicao", chave: String(d.chave) };
    else if (d && d.tipo === "condicao" && String(d.texto || "").trim()) x.depende = { tipo: "condicao", texto: String(d.texto).replace(/[\u0000-\u001F]/g, " ").trim().slice(0, 200), ativa: d.ativa !== false };
    if (typeof b.importacao === "string" && /^[A-Za-z0-9_.:-]{1,80}$/.test(b.importacao)) x.importacao = b.importacao;
    return x;
  }

  function normalizarExtras(lista) {
    var vistos = {};
    return (Array.isArray(lista) ? lista : []).map(normalizarExtra).filter(function (x) {
      if (!x || vistos[x.ref]) return false;
      vistos[x.ref] = true;
      return true;
    }).slice(0, 120);
  }

  function extrasDe(ordem) { return Array.isArray(ordem && ordem.extras) ? ordem.extras : []; }

  function nomeDoExtra(x) {
    if (x.tipo === "atributo") return nomeDoAtributo(x.atributo) + " " + (x.valor > 0 ? "+" : "") + x.valor;
    if (x.tipo === "treino") return nomeDaPericia(x.pericia) + " " + (C.grau(x.grau) || {}).nome;
    var e = P.poder(x.chave);
    return e ? nomeDoPoder(e, x.opcoes) : (x.nome || "Poder desconhecido");
  }

  /* A dependência do extra: um item (no inventário; em uso, se pedido),
     outra aquisição ou uma condição que quem joga liga e desliga. */
  function dependenciaDoExtra(x, percurso, contexto) {
    var d = x.depende;
    if (!d) return { ok: true, texto: "" };
    if (d.tipo === "item") {
      var itens = itensDoContexto(contexto);
      if (!itens) return { ok: true, texto: "depende de um item" };
      var it = itens.filter(function (i) { return i && i.id === d.item; })[0];
      if (!it) return { ok: false, texto: "O item de que este benefício depende não está mais no inventário." };
      var emUso = !!(it.ordem && it.ordem.emUso);
      if (d.emUso && !emUso) return { ok: false, texto: it.nome + " não está em uso: o benefício fica suspenso." };
      return { ok: true, texto: "depende de " + it.nome + (d.emUso ? " (em uso)" : "") };
    }
    if (d.tipo === "aquisicao") {
      var tem = percurso.adquiridos.some(function (a) { return vale(a) && !a.efeitosDesativados && a.chave === d.chave; });
      var e = P.poder(d.chave);
      return tem ? { ok: true, texto: "depende de " + (e ? e.nome : d.chave) } : { ok: false, texto: "Depende de " + (e ? e.nome : d.chave) + ", que a ficha não tem agora." };
    }
    if (d.tipo === "condicao") return d.ativa ? { ok: true, texto: "condição: " + d.texto } : { ok: false, texto: "Condição desligada: " + d.texto + "." };
    return { ok: true, texto: "" };
  }

  function etapaDoExtra(ordem, x, t) {
    var conhecido = !!x.quando;
    var d = conhecido ? Math.min(x.quando.degrau, t.passos) : t.passos;
    var base = etapaDe(ordem, { id: "extra:" + x.ref, degrau: d });
    var e = etapaDe(ordem, { id: "extra:" + x.ref, degrau: d, rotuloEtapa: "Extra · " + (conhecido ? base.rotulo : "etapa desconhecida") });
    e.conhecida = conhecido;
    e.rotuloDaEtapa = base.rotulo;
    return e;
  }

  function avaliarExtra(x, percurso, ordem, contexto, t) {
    var etapa = etapaDoExtra(ordem, x, t);
    var saida = { faltam: [], problemas: [], filhos: [] };
    if (x.tipo === "poder") {
      var e = P.poder(x.chave);
      if (!x.chave) saida.faltam.push("O poder recebido");
      else if (!e) saida.problemas.push("Poder desconhecido: " + (x.nome || x.chave) + ".");
      else saida = avaliarPoder(e, x.opcoes || {}, percurso, etapa, ordem, contexto, 0);
    } else if (x.tipo === "atributo") {
      if (!x.atributo) saida.faltam.push("Atributo");
    } else if (x.tipo === "treino") {
      if (!x.pericia) saida.faltam.push("Perícia");
    }
    var dep = dependenciaDoExtra(x, percurso, contexto);
    var completo = !saida.faltam.length;
    var excecao = !!x.excecao;
    var valido = !saida.problemas.length || excecao;
    return {
      etapa: etapa, faltam: saida.faltam, motivos: saida.problemas, filhos: saida.filhos,
      completo: completo, valido: valido, suspenso: !dep.ok, dependencia: dep.texto,
      mantidaPorExcecao: excecao && saida.problemas.length > 0,
    };
  }

  function aplicarExtra(x, aval, percurso, efeitos, ordem) {
    var origem = { nome: nomeDoExtra(x), detalhe: "Aquisição extra" + (x.procedencia ? " · " + x.procedencia : "") };
    if (x.tipo === "poder") {
      aval.filhos.forEach(function (f) { adquirir(percurso, efeitos, f, { via: "extra", etapa: aval.etapa, registroId: "extra:" + x.ref }); });
      percurso.adquiridos.forEach(function (a) { if (a.registroId === "extra:" + x.ref) { a.extra = x.ref; a.procedencia = x.procedencia; } });
    } else if (x.tipo === "atributo") {
      aplicarEfeito(percurso, efeitos, { tipo: "atributo", atributo: x.atributo, valor: x.valor }, {}, origem, aval.etapa);
    } else if (x.tipo === "treino") {
      subirGrau(percurso, x.pericia, GRAUS.indexOf(x.grau), origem.nome, origem.detalhe);
    }
  }

  function novaRef() { return "x" + String(uuid()).replace(/[^A-Za-z0-9]/g, "").slice(0, 20); }

  /* Grava (cria ou troca) um extra. `ordem.extras` é a fonte: a ficha
     recalcula, e remover tira só o que ele dava. */
  function gravarExtra(ordem, bruto) {
    var b = Object.assign({}, bruto || {});
    if (!b.ref) b.ref = novaRef();
    if (!b.registradoEm) b.registradoEm = agora();
    var x = normalizarExtra(b);
    if (!x) return null;
    if (x.tipo === "poder") guardarElementosDaEscolha(ordem, [x.chave, x.opcoes]);
    x.nome = nomeDoExtra(x);
    if (!Array.isArray(ordem.extras)) ordem.extras = [];
    var i = -1;
    ordem.extras.forEach(function (y, n) { if (y.ref === x.ref) i = n; });
    if (i >= 0) ordem.extras[i] = x; else ordem.extras.push(x);
    if (x.importacao && ordem.importacao) {
      (ordem.importacao.aquisicoes || []).forEach(function (a) { if (a.ref === x.importacao) { a.representacao = "extra"; a.extra = x.ref; delete a.vaga; } });
    }
    return x;
  }

  /* Um poder importado ("etapa desconhecida") que vira aquisição extra:
     o retrato já continha o que ele dá, então a base devolve — como na
     etapa reconstruída — e o valor final não muda. */
  function converterEmExtra(ordem, bruto, contexto) {
    var alvo = valoresFinais(ordem, contexto);
    var x = gravarExtra(ordem, bruto);
    if (!x) return { ok: false, motivo: "Extra inválido." };
    var res = ordem.importacao ? absorver(ordem, "extra." + x.ref, alvo, contexto) : { movido: {}, diferencas: [], avaliacao: null };
    return { ok: true, extra: x, movido: res.movido, diferencas: res.diferencas, avaliacao: res.avaliacao };
  }

  function removerExtra(ordem, ref) {
    var x = extrasDe(ordem).filter(function (y) { return y.ref === ref; })[0];
    /* O que a conversão tirou da base volta com ela. */
    var rec = reconstrucaoDe(ordem);
    var ab = rec && rec.absorvidos ? rec.absorvidos["extra." + ref] : null;
    if (ab) {
      Object.keys(ab.atributos || {}).forEach(function (k) { ordem.atributos[k] = inteiro(ordem.atributos[k], 0) + ab.atributos[k]; });
      Object.keys(ab.graus || {}).forEach(function (k) { definirGrauDaBase(ordem, k, grauDaBase(ordem, k) + ab.graus[k]); });
      delete rec.absorvidos["extra." + ref];
    }
    ordem.extras = extrasDe(ordem).filter(function (y) { return y.ref !== ref; });
    if (x && x.importacao && ordem.importacao) {
      (ordem.importacao.aquisicoes || []).forEach(function (a) { if (a.ref === x.importacao && a.representacao === "extra") { a.representacao = "importada"; delete a.extra; } });
    }
    return !!x;
  }

  /* O percurso no momento do extra: o da etapa informada (o personagem
     ali), ou o do fim, para a etapa desconhecida. */
  function contextoDoExtra(ordem, ref, contexto, quando) {
    var t = R().trilho(ordem);
    var x = extrasDe(ordem).filter(function (y) { return y.ref === ref; })[0] || { ref: ref || "novo", quando: quando || null };
    var q = quando !== undefined ? quando : x.quando;
    var copia = JSON.parse(JSON.stringify(ordem));
    copia.extras = extrasDe(copia).filter(function (y) { return y.ref !== ref; });
    var p = percorrer(copia, contexto, null, { degrau: q ? Math.min(q.degrau, t.passos) : null });
    var etapa = etapaDoExtra(ordem, { ref: x.ref, quando: q }, t);
    return { percurso: p.percursoNoDegrau || novoPercurso(ordem), etapa: etapa };
  }

  /* Todos os poderes que podem ser um extra, conferidos na etapa. O que
     não cabe continua visível, com o motivo. */
  function candidatosExtra(ordem, ref, contexto, quando) {
    var c = contextoDoExtra(ordem, ref, contexto, quando);
    var lista = P.TODOS.filter(function (e) { return ["classe", "geral", "paranormal", "trilha"].indexOf(e.tipo) >= 0; });
    if (P.paranormaisDisponiveis) P.paranormaisDisponiveis().forEach(function (e) { if (lista.indexOf(e) < 0) lista.push(e); });
    return lista.map(function (e) { return candidato(e, c.percurso, c.etapa, ordem); });
  }

  function simularExtra(ordem, bruto, contexto) {
    var copia = JSON.parse(JSON.stringify(ordem));
    var x = gravarExtra(copia, bruto);
    var est = percorrer(copia, contexto, null);
    return { extra: x, estado: est, avaliacao: x ? (est.extras.filter(function (y) { return y.ref === x.ref; })[0] || null) : null };
  }

  function percorrer(ordem, contexto, pararEm, parada) {
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
    var marco = marcoDe(ordem);
    var historicos = [];
    var antesHistorico = false;
    var importadasDeLado = marco ? adquirirImportadas(ordem, percurso, efeitos, marco, t) : [];
    /* v9.16: as aquisições extras, conferidas na etapa delas, e o
       percurso num degrau (a tela de um extra confere ali). */
    var extrasAvaliados = [];
    var percursoNoDegrau = null;
    var limiteDaParada = parada && parada.degrau !== null && parada.degrau !== undefined ? parada.degrau * 100 + 96 : Infinity;

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

    /* As habilidades automáticas das trilhas de Sobrevivente, pelo
       estágio alcançado. */
    var estagioF = estagioDaFase(ordem);
    var trilhaS = estagioF >= 2 ? trilhaSobreviventeDe(ordem) : "";
    if (trilhaS) {
      P.habilidadesDaTrilhaSobrevivente(trilhaS).forEach(function (h) {
        if (h.estagio > estagioF || h.opcoes.length) return;
        eventos.push({ ordem: ordemDoEstagio(h.estagio, POSICAO.trilhaAuto), sobreviventeAuto: h });
      });
    }

    var trilhaEscolhida = classe ? C.trilha(ordem.trilha) : null;
    if (trilhaEscolhida && !C.trilhaServe(trilhaEscolhida, ordem.classe, ordem)) trilhaEscolhida = null;
    var suspensa = classe && trilhaSuspensa(ordem) ? C.trilha(ordem.trilha) : null;
    if (trilhaEscolhida) {
      P.habilidadesDaTrilha(trilhaEscolhida.chave).forEach(function (h) {
        var d = degrauDaHabilidadeDeTrilha(ordem, h, t);
        if (d > t.passos || h.opcoes.length) return;
        eventos.push({ ordem: d * 100 + POSICAO.trilhaAuto, trilhaAuto: h, degrau: d });
      });
    }
    extrasDe(ordem).forEach(function (x) {
      var d = x.quando ? Math.min(x.quando.degrau, t.passos) : null;
      eventos.push({ ordem: d === null ? 1e7 : d * 100 + 96, extra: x });
    });
    eventos.sort(function (a, b) { return a.ordem - b.ordem; });

    var trilhaOk = true;
    var motivoTrilha = "";

    eventos.forEach(function (ev) {
      if (pararEm && ev.vaga && ev.vaga.id === pararEm && !antes) antes = copiarPercurso(percurso);
      if (parada && !percursoNoDegrau && ev.ordem > limiteDaParada) percursoNoDegrau = copiarPercurso(percurso);

      if (ev.extra) {
        var avx = avaliarExtra(ev.extra, percurso, ordem, contexto, t);
        if (avx.completo && avx.valido && !avx.suspenso) aplicarExtra(ev.extra, avx, percurso, efeitos, ordem);
        extrasAvaliados.push(Object.assign({ ref: ev.extra.ref, extra: ev.extra, nome: nomeDoExtra(ev.extra), entrada: ev.extra.tipo === "poder" ? P.poder(ev.extra.chave) : null,
          rotuloEtapa: avx.etapa.conhecida ? avx.etapa.rotuloDaEtapa : "etapa desconhecida", vale: avx.completo && avx.valido && !avx.suspenso }, avx, { filhos: undefined }));
        return;
      }

      if (ev.sobreviventeAuto) {
        var hs = ev.sobreviventeAuto;
        var etapaS = etapaDe(ordem, { id: "s." + hs.chave, degrau: 0, nexEtapa: 0, rotuloEtapa: rotuloDoEstagio(hs.estagio) });
        var idS = idDeAquisicao(percurso, "s." + hs.chave, hs.chave);
        var desligadaS = !!percurso.desligadas[idS];
        percurso.adquiridos.push({
          id: idS, chave: hs.chave, nome: hs.nome, tipo: "sobrevivente", elemento: "", opcoes: {},
          afinidade: false, valido: true, completo: true, via: "estagio", degrau: 0, estagio: hs.estagio,
          etapaId: "s." + hs.chave, rotuloEtapa: etapaS.rotulo, entrada: hs, motivos: [],
          efeitosDesativados: desligadaS,
        });
        if (!desligadaS) {
          (hs.efeitos || []).forEach(function (ef) {
            aplicarEfeito(percurso, efeitos, ef, {}, { nome: hs.nome, detalhe: etapaS.rotulo }, etapaS);
          });
          /* Durão: "Quando subir para o 3º estágio, recebe +2 PV." */
          if (hs.chave === "durao" && estagioF >= 3) {
            efeitos.push({ tipo: "pvFixo", valor: 2, fonte: hs.nome, detalhe: rotuloDoEstagio(3), degrau: 0 });
          }
        }
        return;
      }

      if (ev.trilhaAuto) {
        var etapaAuto = etapaDe(ordem, { id: "t." + ev.trilhaAuto.chave, degrau: ev.degrau });
        var idTrilha = idDeAquisicao(percurso, "t." + ev.trilhaAuto.chave, ev.trilhaAuto.chave);
        var trilhaDesligada = !!percurso.desligadas[idTrilha];
        percurso.adquiridos.push({
          id: idTrilha,
          chave: ev.trilhaAuto.chave, nome: ev.trilhaAuto.nome, tipo: "trilha", elemento: "", opcoes: {},
          afinidade: false, valido: trilhaOk, completo: true, via: "trilha", degrau: ev.degrau,
          etapaId: "t." + ev.trilhaAuto.chave, rotuloEtapa: etapaAuto.rotulo, entrada: ev.trilhaAuto,
          motivos: trilhaOk ? [] : [motivoTrilha],
          efeitosDesativados: trilhaDesligada,
        });
        if (trilhaOk && !trilhaDesligada) {
          var ultimo = percurso.adquiridos[percurso.adquiridos.length - 1];
          (ev.trilhaAuto.efeitos || []).forEach(function (ef) {
            aplicarEfeito(percurso, efeitos, ef, {}, { nome: ultimo.nome, detalhe: etapaAuto.rotulo }, etapaAuto);
          });
        }
        return;
      }

      var v = ev.vaga;

      if (v.tipo === "trilha") {
        if (!trilhaEscolhida && suspensa) {
          trilhaOk = false;
          motivoTrilha = C.nomeDaTrilha(suspensa, ordem.classe) + " está guardada sem efeito: a regra opcional Trilha Geral (Arquivos Secretos 3, p. 119) está desligada nesta ficha. Religue a regra para ela voltar a valer, ou troque de trilha.";
          pendencias.push(Object.assign(pendencia(v, "invalida"), { motivos: [motivoTrilha] }));
          return;
        }
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

      /* Marco importado: a etapa sem registro, no marco ou abaixo dele, é
         histórico indisponível — nem vaga, nem efeito (v2.34). */
      /* v9.16: marcada "não preenchida" na reconstrução, a etapa volta a
         ser vaga normal. */
      if (marco && !porEtapa[v.id] && vagaHistorica(v, marco) && situacaoMarcada(ordem, v.id) !== "vazia") {
        historicos.push({ id: v.id, tipo: v.tipo, rotulo: v.rotulo, rotuloEtapa: v.rotuloEtapa, degrau: v.degrau, vaga: v, marcada: situacaoMarcada(ordem, v.id) === "desconhecida" });
        percurso.historicas[v.id] = true;
        if (pararEm === v.id) antesHistorico = true;
        return;
      }

      if (v.tipo === "rituais") {
        percurso.quantidades[v.id] = A ? A.quantidadeDa(v.concessao, percurso.atributos.int || 0) : 0;
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

      /* Antes de decidir se a vaga está completa: os vínculos de ritual
         que passaram valem já, porque uma concessão pela metade continua
         tendo entregado o que entregou. */
      if (v.tipo === "rituais") reivindicarRituais(percurso, v, r, aval);

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
            id: idDeAquisicao(percurso, v.id, "perito:escolha"),
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

    /* Treinamento Especial (SAH p. 31-32): virando combatente, Pancada
       Forte some e Ataque Especial custa 1 PE a menos; virando
       especialista, Entendido some e Perito custa 1 PE a menos. A
       habilidade continua listada, marcada como substituída. */
    var faseAtual = R().faseDe(ordem);
    if (faseAtual.anterior === "sobrevivente") {
      percurso.adquiridos.forEach(function (a) {
        var sub = a.entrada && a.entrada.substituicao;
        if (!sub || sub.classe !== ordem.classe) return;
        a.substituida = sub.texto;
        efeitos.push({ tipo: "custoHabilidade", habilidade: sub.habilidade, valor: sub.custo, fonte: a.nome, detalhe: "Treinamento Especial" });
      });
    }

    /* Toda pendência de ritual diz quantos a concessão permite, quantos
       já foram escolhidos e quantos faltam — é o que o cartão mostra. */
    pendencias.forEach(function (p) {
      if (p.tipo !== "rituais") return;
      var quantidade = percurso.quantidades[p.id] || 0;
      var feitos = ativos(percurso).filter(function (a) { return a.concessao === p.id; }).length;
      p.aprendizado = {
        concessao: p.vaga.concessao,
        quantidade: quantidade,
        escolhidos: feitos,
        restantes: Math.max(0, quantidade - feitos),
      };
      p.explicacao = A ? A.explicacaoDaConcessao(p.vaga.concessao, quantidade) : p.explicacao;
    });

    /* O que foi aprendido FORA da progressão — estudo em campo e
       concessão da mesa — entra depois dela: um ritual que a progressão
       já reivindicou não vira segunda aquisição por um registro. */
    var registrosProcessados = processarRegistros(ordem, contexto, percurso, t);

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
    if (antes && (antesHistorico || !!(marco && pararEm && idsVagas[pararEm] && vagaHistorica(idsVagas[pararEm], marco)))) antes.historicoIndisponivel = true;

    return {
      antes: antes,
      /* A etapa pedida é anterior ao marco importado: o percurso "antes"
         dela é o retrato da importação, não a história real (v2.34). */
      antesHistorico: antesHistorico || !!(marco && pararEm && idsVagas[pararEm] && vagaHistorica(idsVagas[pararEm], marco)),
      marco: marco,
      historicoImportado: historicos,
      importadasDeLado: importadasDeLado,
      extras: extrasAvaliados,
      percursoNoDegrau: parada ? (percursoNoDegrau || copiarPercurso(percurso)) : null,
      trilho: t,
      exposicao: exposicao,
      rituais: resumoDeRituais(ordem, contexto, percurso, vs, t, registrosProcessados),
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
        /* v9.8: "Outro" (nome livre) ou um elemento Homebrew de Ordem: sem
           efeito mecânico nenhum da afinidade. */
        homebrew: af.elemento === "outro" || /^hbe-/.test(String(af.elemento || "")),
        ativa: !!af.elemento && percurso.afinidadeAtiva,
        conflito: conflitoDeAfinidade(ordem, percurso, af),
      },
    };
  }

  /* =================================================================
     O APRENDIZADO DE RITUAIS, VISTO DE FORA
     -----------------------------------------------------------------
     O que a aba Rituais, a Progressão e a biblioteca leem. É DERIVADO:
     nada aqui é gravado, e recalcular não concede nada de novo.
     ================================================================= */

  function resumoDeRituais(ordem, contexto, percurso, todasAsVagas, t, registros) {
    var rituaisFicha = rituaisDoContexto(contexto);
    var porRitual = {};
    var substituidos = {};
    var usadosNoLimite = 0;

    ativos(percurso).forEach(function (a) {
      if (a.contaNoLimite) usadosNoLimite++;
      if (a.ritualId) porRitual[a.ritualId] = a;
    });
    percurso.aprendizados.forEach(function (a) {
      if (a.substituidoEm && a.ritualId && !porRitual[a.ritualId]) {
        var novo = aprendizadoAtivo(percurso, a.substituidoPor);
        substituidos[a.ritualId] = {
          aprendizado: a,
          em: a.substituidoEm,
          porId: a.substituidoPor,
          porNome: novo ? novo.nome : "",
        };
      }
    });

    /* Ficha importada (v2.34): os rituais que vieram na importação são
       conhecidos, sem a aquisição de origem — histórico indisponível. Uma
       aquisição registrada depois tem precedência. */
    var imp = ordem.importacao;
    if (imp && imp.marco && Array.isArray(imp.rituais) && rituaisFicha) {
      var naFicha = {};
      rituaisFicha.forEach(function (x) { if (x && x.id) naFicha[x.id] = true; });
      imp.rituais.forEach(function (id) {
        if (!naFicha[id] || porRitual[id]) return;
        porRitual[id] = {
          importado: true, ritualId: id, origem: "importacao", poder: "",
          nomePoder: imp.sistema === "cris" ? "Importação do CRIS" : "Importação",
          rotuloEtapa: "histórico indisponível", destino: "conhecido", contaNoLimite: false,
        };
      });
    }

    /* A concessão de uma etapa histórica não é listada: ela não tem
       quantidade nem escolhidos, e "0 de 0" mentiria (v2.34). */
    var concessoes = todasAsVagas.filter(function (v) { return v.tipo === "rituais" && !(percurso.historicas && percurso.historicas[v.id]); }).map(function (v) {
      var c = v.concessao;
      var quantidade = percurso.quantidades[v.id] || 0;
      var escolhidos = ativos(percurso).filter(function (a) { return a.concessao === v.id; });
      return {
        id: v.id,
        vaga: v,
        concessao: c,
        rotulo: v.rotulo,
        rotuloEtapa: v.rotuloEtapa,
        explicacao: A ? A.explicacaoDaConcessao(c, quantidade) : "",
        degrau: c.degrau,
        origem: c.origem,
        poder: c.poder,
        nomePoder: c.nomePoder,
        fonte: c.fonte,
        pagina: c.pagina,
        destino: c.destino,
        circulos: c.circulos.slice(),
        elemento: c.elemento,
        fixo: c.fixo,
        opcional: c.opcional,
        quantidade: quantidade,
        escolhidos: escolhidos,
        restantes: Math.max(0, quantidade - escolhidos.length),
        completa: escolhidos.length >= quantidade,
      };
    });

    /* Um ritual da ficha que nenhuma aquisição reivindicou é REGISTRO:
       está na ficha para consulta, e não é conhecido. Ele não é erro —
       pode ser anotação da mesa, fonte achada e ainda não estudada, ou
       ficha anterior à v2.17. O R.A.M.A. diz isso e oferece as saídas;
       nunca adivinha qual é, nem pelo nome. */
    var semAquisicao = [];
    if (rituaisFicha) {
      rituaisFicha.forEach(function (x) {
        if (!x || !x.id || porRitual[x.id]) return;
        var d = dadosDoRitualDaFicha(x);
        d.substituido = substituidos[x.id] || null;
        semAquisicao.push(d);
      });
    }

    var ocultista = C.classe(ordem.classe) && !!A && A.circuloMaximoNoDegrau(ordem.classe, 1) > 0;
    var flags = {
      patentes: !!t.porPatente,
      nexExperiencia: t.separado,
      campo: !!(OP() && A && OP().ligada(ordem, A.REGRA_CAMPO)),
      lento: !!(OP() && A && OP().ligada(ordem, A.REGRA_LENTO)),
      ocultista: !!ocultista,
    };

    return {
      disponivel: concessoes.length > 0 || (registros || []).length > 0,
      temFicha: !!rituaisFicha,
      concessoes: concessoes,
      aprendizados: percurso.aprendizados.slice(),
      porRitual: porRitual,
      substituidos: substituidos,
      registros: registros || [],
      limite: A ? A.limite(percurso.atributos.int || 0, usadosNoLimite)
                : { total: 0, usados: 0, restantes: 0, excedido: false },
      semAquisicao: semAquisicao,
      /* Nome anterior, mantido para quem ainda lê por ele. */
      semOrigem: semAquisicao,
      emCampo: flags.campo,
      lento: flags.lento,
      patentes: flags.patentes,
      ocultista: flags.ocultista,
      avisos: A ? A.avisosDoAprendizado(flags) : [],
      /* O que a regra de um ritual pergunta da ficha HOJE (AS1 p. 49-50):
         a biblioteca confere com isto; a gravação, com a etapa. */
      conhecimento: comConhecimento({}, ordem, percurso, { exposicao: R().exposicao(ordem) }, contexto),
      maldicao: compreensaoDisponivel(ordem, t),
      circuloMaximo: A ? A.circuloMaximoNoDegrau(ordem.classe, t.passos, t.porPatente) : 0,
      degrauAtual: t.passos,
    };
  }

  /* =================================================================
     APRENDIZADO FORA DA PROGRESSÃO
     -----------------------------------------------------------------
     `ordem.registrosDeRitual` guarda duas aquisições que não são vaga
     de progressão:

       campo  o estudo em campo de SAH p.113 (B). Só vale com a regra
              ligada, para ocultista, com a mesa CONFIRMANDO que a fonte
              foi achada e o teste de Ocultismo passou — selecionar um
              ritual na biblioteca não prova nada disso
       mesa   a mesa concedeu o ritual fora das regras. É exceção
              declarada, e não resolve pendência nenhuma

     Um registro que deixou de valer (a regra foi desligada, o ritual
     saiu da ficha, outra aquisição já o reivindica) NÃO é apagado: fica
     guardado, com o motivo, e volta a valer sozinho quando puder.
     ================================================================= */

  var TIPOS_DE_REGISTRO = { campo: true, mesa: true, maldicao: true };

  /* Compreensão de Maldições (Maledictólogo NEX 40%, Arquivos Secretos 1
     p. 45): estudar um item amaldiçoado que contém um ritual ensina o
     ritual, fora do limite. Como o estudo em campo, depende do que
     aconteceu na mesa (o teste de Ocultismo passou e o item foi
     consumido), por isso é um REGISTRO confirmado, não uma vaga. */
  var DEGRAU_COMPREENSAO = 8;

  function compreensaoDisponivel(ordem, t) {
    return ordem.trilha === "maledictologo" && trilhaValida(ordem) && t.passos >= DEGRAU_COMPREENSAO;
  }

  function motivoDaMaldicao(ordem, reg, dado, t) {
    if (!(ordem.trilha === "maledictologo" && trilhaValida(ordem))) {
      return "Compreensão de Maldições é da trilha Maledictólogo (Arquivos Secretos 1, p. 45), e esta ficha não está nela. O registro fica guardado e volta a valer se a trilha voltar.";
    }
    if ((reg.degrau || t.passos) < DEGRAU_COMPREENSAO) {
      return "Compreensão de Maldições chega em " + rotuloDoDegrau(DEGRAU_COMPREENSAO, t.separado) + ".";
    }
    if (!reg.confirmado) return "O estudo do item não foi confirmado: faltou dizer que o teste de Ocultismo passou e o item foi consumido.";
    var teste = A ? A.avaliarContraRegra({ tipo: "maldicao" }, dado) : { ok: true };
    return teste.ok ? "" : teste.motivo;
  }
  var CHAVES_DE_FONTE = { texto: true, objeto: true, selo: true };

  function normalizarRegistroDeRitual(bruto) {
    if (!bruto || typeof bruto !== "object") return null;
    var tipo = String(bruto.tipo || "");
    if (!TIPOS_DE_REGISTRO[tipo]) return null;
    var ritualId = String(bruto.ritualId || "").slice(0, 60);
    if (!ritualId) return null;
    var circulo = Math.round(Number(bruto.circulo));
    var degrau = Math.round(Number(bruto.degrau));
    return {
      id: String(bruto.id || uuid()).slice(0, 60),
      tipo: tipo,
      ritualId: ritualId,
      nome: String(bruto.nome || "").slice(0, 120),
      circulo: circulo >= 1 && circulo <= 4 ? circulo : 0,
      /* v9.25: o ritual de um elemento Homebrew guarda o elemento dele
         (Aprender Ritual conta como poder desse elemento). */
      elemento: ELEMENTOS_PODER.concat(["medo"]).indexOf(bruto.elemento) >= 0 || elementoHomebrew(bruto.elemento) ? bruto.elemento : "",
      elementos: Array.isArray(bruto.elementos) && bruto.todosOsElementos === true
        ? bruto.elementos.filter(function (k) { return ELEMENTOS_PODER.indexOf(k) >= 0 || elementoHomebrew(k); }).slice(0, 4) : [],
      todosOsElementos: bruto.todosOsElementos === true && Array.isArray(bruto.elementos) && bruto.elementos.length > 1,
      degrau: degrau >= 1 && degrau <= 40 ? degrau : 0,
      fonte: CHAVES_DE_FONTE[bruto.fonte] ? bruto.fonte : "",
      nota: String(bruto.nota || "").slice(0, 300),
      confirmado: bruto.confirmado === true,
      registradoEm: typeof bruto.registradoEm === "string" ? bruto.registradoEm.slice(0, 40) : "",
    };
  }

  function normalizarRegistrosDeRitual(bruto) {
    var vistos = {};
    return (Array.isArray(bruto) ? bruto : []).slice(0, 300).map(normalizarRegistroDeRitual).filter(function (r) {
      if (!r || vistos[r.id]) return false;
      vistos[r.id] = true;
      return true;
    });
  }

  function motivoDoEstudo(ordem, reg, dado, t) {
    if (!(OP() && A && OP().ligada(ordem, A.REGRA_CAMPO))) {
      return "O limite por aprendizado em campo está desligado nas regras opcionais. O registro fica guardado e volta a valer se a regra for religada.";
    }
    if (!A || !A.circuloMaximoNoDegrau(ordem.classe, 1)) {
      return "Só ocultistas aprendem rituais em campo (Sobrevivendo ao Horror, p. 113).";
    }
    if (!reg.confirmado) {
      return "O estudo não foi confirmado: faltou dizer que a fonte foi achada e que o teste de Ocultismo passou.";
    }
    var degrau = reg.degrau || t.passos;
    var teste = A.avaliarContraRegra({ tipo: "campo", maximo: A.circuloMaximoNoDegrau(ordem.classe, degrau, R().trilho(ordem).porPatente) }, dado);
    return teste.ok ? "" : teste.motivo;
  }

  function processarRegistros(ordem, contexto, percurso, t) {
    var rituais = rituaisDoContexto(contexto);
    var saida = [];
    var lista = (Array.isArray(ordem.registrosDeRitual) ? ordem.registrosDeRitual : []).slice()
      .sort(function (a, b) { return String(a.registradoEm || "").localeCompare(String(b.registradoEm || "")); });

    lista.forEach(function (reg) {
      if (!reg || !TIPOS_DE_REGISTRO[reg.tipo] || !reg.ritualId) return;
      var dado = resolverRitual({ id: reg.ritualId, nome: reg.nome, circulo: reg.circulo, elemento: reg.elemento,
        elementos: reg.elementos, todosOsElementos: reg.todosOsElementos }, rituais);
      var motivo = "";
      if (dado.naFicha === false) motivo = (reg.nome || "O ritual") + " não está mais na aba Rituais.";
      else if (percurso.rituaisUsados[dado.id]) motivo = (dado.nome || reg.nome || "O ritual") + " já tem outra aquisição.";
      /* Como uma escolha de progressão acima do NEX atual: o registro é
         de uma etapa que a ficha não alcança mais (o NEX foi corrigido
         para baixo). Fica guardado, sem efeito, e volta sozinho. */
      else if (reg.degrau && reg.degrau > t.passos) {
        motivo = "Registrado em " + rotuloDoDegrau(reg.degrau, t.separado) + ", uma etapa que a ficha não alcança agora (" +
          rotuloDoDegrau(t.passos, t.separado) + "). Fica guardado e volta a valer quando ela chegar lá.";
      }
      else if (reg.tipo === "campo") motivo = motivoDoEstudo(ordem, reg, comConhecimento(dado, ordem, percurso, { exposicao: R().exposicao(ordem) }, contexto), t);
      else if (reg.tipo === "maldicao") motivo = motivoDaMaldicao(ordem, reg, comConhecimento(dado, ordem, percurso, { exposicao: R().exposicao(ordem) }, contexto), t);

      var degrau = reg.degrau || t.passos;
      if (motivo) {
        saida.push({ registro: reg, valido: false, motivo: motivo });
        return;
      }

      percurso.rituaisUsados[dado.id] = "r." + reg.id;
      percurso.aprendizados.push(novoAprendizado({
        concessao: "r." + reg.id,
        registroDeRitual: reg.id,
        degrau: degrau,
        rotuloEtapa: rotuloDoDegrau(degrau, t.separado),
        origem: reg.tipo,
        poder: reg.tipo === "campo" ? "estudoEmCampo" : (reg.tipo === "maldicao" ? "compreensaoDeMaldicoes" : "concessaoDaMesa"),
        nomePoder: reg.tipo === "campo" ? "Estudo em campo" : (reg.tipo === "maldicao" ? "Compreensão de Maldições" : "Concessão da mesa"),
        fonte: reg.tipo === "campo" ? "SAH" : (reg.tipo === "maldicao" ? "AS1" : ""),
        pagina: reg.tipo === "campo" ? 113 : (reg.tipo === "maldicao" ? 45 : 0),
        destino: "conhecido",
        contaNoLimite: false,
        ritualId: dado.id,
        nome: dado.nome || reg.nome,
        circulo: dado.circulo || reg.circulo,
        elementos: elementosDoDado(dado.naFicha === null ? reg : dado),
        excecao: reg.tipo === "mesa",
        regra: reg.tipo === "maldicao" ? { tipo: "maldicao" } : reg.tipo === "campo"
          ? { tipo: "campo", maximo: A ? A.circuloMaximoNoDegrau(ordem.classe, degrau, R().trilho(ordem).porPatente) : 0 }
          : { tipo: "mesa" },
      }));
      saida.push({ registro: reg, valido: true, motivo: "" });
    });

    return saida;
  }

  /* =================================================================
     PRENDER E SOLTAR UM RITUAL
     -----------------------------------------------------------------
     A ÚNICA porta para mexer no vínculo entre uma concessão e um ritual
     da ficha. Adicionar um ritual pela biblioteca não passa por aqui —
     e é por isso que registrar um ritual nunca quita uma pendência
     sozinho.
     ================================================================= */

  function vinculoDeRitual(ritual) {
    var d = dadosDoRitualDaFicha(ritual);
    if (!d || !d.id) return null;
    var saida = { id: d.id, nome: d.nome };
    if (d.circulo) saida.circulo = d.circulo;
    if (d.elemento) saida.elemento = d.elemento;
    if (d.todosOsElementos && d.elementos.length > 1) {
      saida.elementos = d.elementos.slice();
      saida.todosOsElementos = true;
    }
    if (d.catalogo) saida.catalogo = d.catalogo;
    return saida;
  }

  /* Os elementos a que um ritual pertence, para quem conta "rituais de
     Sangue" (Transtornado Arrependido, AS1 p. 43): um ritual de vários
     elementos conta em cada um deles. */
  function elementosDoDado(d) {
    if (!d) return [];
    if (d.todosOsElementos === true && Array.isArray(d.elementos) && d.elementos.length > 1) return d.elementos.slice();
    return d.elemento ? [d.elemento] : [];
  }

  function rituaisEscolhidos(ordem, idVaga) {
    var r = (ordem.escolhas || []).filter(function (x) { return x.etapa === idVaga; })[0];
    return rituaisDoRegistro(r).map(function (x) { return JSON.parse(JSON.stringify(x)); });
  }

  function definirRituais(ordem, idVaga, entradas) {
    var v = vagas(ordem).filter(function (x) { return x.id === idVaga; })[0];
    if (!v || v.tipo !== "rituais") return null;

    var existente = (ordem.escolhas || []).filter(function (x) { return x.etapa === idVaga; })[0];
    var mantidaPelaMesa = !!(existente && existente.ignorarRequisitos);
    var limpas = (entradas || []).filter(function (x) { return x && x.id; });

    /* Concessão esvaziada: o registro sai inteiro, em vez de ficar uma
       casca vazia que a Progressão mostraria como decidida. Os rituais
       continuam na ficha — soltar o vínculo não apaga ritual nenhum. */
    if (!limpas.length) {
      if (existente) remover(ordem, existente.id);
      return null;
    }

    var registro = registrar(ordem, v, { valor: "", opcoes: { rituais: limpas } });
    if (mantidaPelaMesa) definirIgnorarRequisitos(ordem, registro.id, true);
    return registro;
  }

  function adicionarRitual(ordem, idVaga, ritual) {
    var vinculo = vinculoDeRitual(ritual);
    if (!vinculo) return null;
    var atuais = rituaisEscolhidos(ordem, idVaga);
    if (atuais.some(function (x) { return x.id === vinculo.id; })) return null;
    return definirRituais(ordem, idVaga, atuais.concat([vinculo]));
  }

  function removerRitual(ordem, idVaga, ritualId) {
    var atuais = rituaisEscolhidos(ordem, idVaga).filter(function (x) { return x.id !== ritualId; });
    return definirRituais(ordem, idVaga, atuais);
  }

  /* =================================================================
     O CONTEXTO DE UMA AQUISIÇÃO
     -----------------------------------------------------------------
     A biblioteca precisa saber POR QUE o personagem está escolhendo um
     ritual. Esta função responde, para uma aquisição só:

       quantos rituais ela dá e quantos já foram escolhidos
       que círculos aceita, e que elemento, quando exige
       que limite vale (o de Intelecto, só para Aprender Ritual)
       se exige confirmação de um acontecimento da mesa (estudo)
       avaliar(ritual) → { ok, estado, motivo }

     alvo = { tipo: "concessao", vaga }        uma vaga de ritual
          | { tipo: "aprenderRitual", vaga }   o poder, dentro de uma escolha
          | { tipo: "substituicao", vaga, sai } a troca de Aprender Ritual
          | { tipo: "campo" }                  estudo em campo, agora
          | { tipo: "mesa" }                   concessão da mesa
          | { tipo: "registro" }               só registrar, sem aquisição

     O marco é sempre o que CONCEDEU: uma concessão de NEX 20% continua
     conferida contra NEX 20%, e Aprender Ritual contra o NEX de exposição
     da etapa em que foi escolhido. O estudo em campo é a exceção
     prevista pela própria regra: ele acontece AGORA, e só aceita círculos
     a que o personagem tem acesso agora (SAH p.113).
     ================================================================= */

  function circulosDaRegra(regra) {
    var r = regra || {};
    if (r.tipo === "concessao" && r.concessao) return r.concessao.circulos.slice();
    if ((r.tipo === "aprenderRitual" || r.tipo === "campo") && A) return A.ate(r.maximo || 0);
    return [1, 2, 3, 4];
  }

  function contextoDeAquisicao(ordem, alvo, contexto) {
    if (!ordem || !A) return null;
    var a = alvo || {};
    var t = R().trilho(ordem);
    var agora = estado(ordem, contexto);
    var donos = agora && agora.rituais ? agora.rituais.porRitual : {};

    function montar(desc) {
      desc.avaliar = function (dados) {
        var d = dados || {};
        var nome = d.nome || "Este ritual";
        if (d.ritualId) {
          var dono = donos[d.ritualId];
          if (dono && dono.concessao === desc.id) return { ok: true, estado: "escolhido", motivo: "" };
          if (dono) {
            return { ok: false, estado: "ocupado",
              motivo: nome + " já é o ritual de " + dono.nomePoder + " (" + dono.rotuloEtapa + "), e um ritual não quita duas aquisições." };
          }
        }
        if (desc.limite && desc.limite.esgotado) return { ok: false, estado: "limite", motivo: desc.limite.motivo };
        var teste = A.avaliarContraRegra(desc.regra, Object.assign({}, d, agora.rituais.conhecimento || {}));
        return teste.ok ? { ok: true, estado: "disponivel", motivo: "" } : { ok: false, estado: "indisponivel", motivo: teste.motivo };
      };
      return desc;
    }

    switch (a.tipo) {
      case "concessao": {
        var c = agora.rituais.concessoes.filter(function (x) { return x.id === a.vaga; })[0];
        if (!c) return null;
        var registro = (ordem.escolhas || []).filter(function (x) { return x.etapa === c.id; })[0];
        return montar({
          tipo: "concessao", id: c.id, vaga: c.id,
          rotulo: c.rotulo, rotuloEtapa: c.rotuloEtapa, origem: c.origem, nomePoder: c.nomePoder,
          fonte: c.fonte, pagina: c.pagina, destino: c.destino,
          quantidade: c.quantidade,
          escolhidos: c.escolhidos.map(function (x) { return x.ritualId; }),
          circulos: c.circulos.slice(), elemento: c.elemento, fixo: c.fixo, opcional: c.opcional,
          contaNoLimite: false, limite: null, exigeConfirmacao: false,
          explicacao: c.explicacao,
          excecaoDaMesa: !!(registro && registro.ignorarRequisitos),
          regra: { tipo: "concessao", concessao: c.concessao },
        });
      }

      case "aprenderRitual": {
        var cv = contextoDaVaga(ordem, a.vaga, contexto);
        if (!cv) return null;
        var regraAp = regraDeAprenderRitual(cv.etapa);
        var total = cv.percurso.atributos.int || 0;
        var usados = contarNoLimite(cv.percurso);
        return montar({
          tipo: "aprenderRitual", id: a.vaga, vaga: a.vaga,
          rotulo: "Aprender Ritual", rotuloEtapa: cv.etapa.rotulo, origem: "poder", nomePoder: "Aprender Ritual",
          fonte: "OPRPG", pagina: 114, destino: "conhecido",
          quantidade: 1, escolhidos: [], circulos: A.ate(regraAp.maximo), elemento: "",
          contaNoLimite: true, exigeConfirmacao: false,
          exposicao: cv.etapa.exposicao,
          limite: {
            total: total, usados: usados, esgotado: usados >= total,
            motivo: "O limite de rituais aprendidos por Aprender Ritual é o Intelecto (" + total +
              " nesta etapa), e " + usados + " já " + (usados === 1 ? "foi aprendido" : "foram aprendidos") +
              " assim (Ordem Paranormal RPG, p. 119).",
          },
          explicacao: "Um ritual de até " + regraAp.maximo + "º círculo — o que Aprender Ritual alcança com NEX de exposição " +
            cv.etapa.exposicao + "% (1º; 2º a partir de 45%; 3º a partir de 75%). Conta no limite de rituais conhecidos: " +
            usados + " de " + total + " antes desta escolha.",
          regra: regraAp,
        });
      }

      case "substituicao": {
        var cs = contextoDaVaga(ordem, a.vaga, contexto);
        if (!cs) return null;
        var velho = aprendizadoAtivo(cs.percurso, String(a.sai || ""));
        if (!velho || !velho.regra) return null;
        return montar({
          tipo: "substituicao", id: velho.concessao, vaga: a.vaga,
          rotulo: "Ritual que entra no lugar de " + (velho.nome || "outro"), rotuloEtapa: cs.etapa.rotulo,
          origem: velho.origem, nomePoder: velho.nomePoder, fonte: "OPRPG", pagina: 114,
          destino: velho.destino, quantidade: 1, escolhidos: [],
          circulos: circulosDaRegra(velho.regra),
          elemento: velho.regra.concessao ? velho.regra.concessao.elemento : "",
          contaNoLimite: velho.contaNoLimite, limite: null, exigeConfirmacao: false,
          sai: { id: velho.ritualId, nome: velho.nome },
          explicacao: "Aprender Ritual permite trocar um ritual conhecido por outro (Ordem Paranormal RPG, p. 114). O que entra " +
            "toma o lugar de " + (velho.nome || "o que sai") + " — " + velho.nomePoder + ", " + velho.rotuloEtapa +
            " — e segue a regra dessa aquisição.",
          regra: velho.regra,
        });
      }

      case "campo": {
        if (!agora.rituais.emCampo || !agora.rituais.ocultista) return null;
        var maximoCampo = A.circuloMaximoNoDegrau(ordem.classe, t.passos, t.porPatente);
        return montar({
          tipo: "campo", id: "campo", vaga: "",
          rotulo: "Estudo em campo", rotuloEtapa: rotuloDoDegrau(t.passos, t.separado),
          origem: "campo", nomePoder: "Estudo em campo", fonte: "SAH", pagina: 113, destino: "conhecido",
          quantidade: null, escolhidos: [], circulos: A.ate(maximoCampo), elemento: "",
          contaNoLimite: false, limite: null,
          exigeConfirmacao: true, degrau: t.passos, dtDeEstudo: A.DT_DE_ESTUDO,
          explicacao: "O ritual precisa ter sido encontrado — uma composição, um objeto amaldiçoado ou um selo — e estudado " +
            "numa ação de interlúdio, com Ocultismo DT 20, 25, 30 ou 35 conforme o círculo. Só círculos a que o personagem " +
            "tem acesso agora (até o " + maximoCampo + "º). Selecionar aqui não prova o estudo: a confirmação vem antes de gravar.",
          regra: { tipo: "campo", maximo: maximoCampo },
        });
      }

      case "maldicao": {
        if (!compreensaoDisponivel(ordem, t)) return null;
        return montar({
          tipo: "maldicao", id: "maldicao", vaga: "",
          rotulo: "Compreensão de Maldições", rotuloEtapa: rotuloDoDegrau(t.passos, t.separado),
          origem: "maldicao", nomePoder: "Compreensão de Maldições", fonte: "AS1", pagina: 45, destino: "conhecido",
          quantidade: null, escolhidos: [], circulos: [1, 2, 3, 4], elemento: "",
          contaNoLimite: false, limite: null,
          exigeConfirmacao: true, degrau: t.passos,
          explicacao: "Uma ação de interlúdio e 3 PE de leituras e rituais de identificação num item amaldiçoado, e um teste de " +
            "Ocultismo DT 10 + 5 por categoria do item. Passando, se o item contém um ritual, você perde 1d4+1 de Sanidade, aprende o " +
            "ritual (fora do limite de rituais) e o item é consumido. Falhando, perde 2d4+2 de Sanidade e não pode tentar de novo com " +
            "o mesmo item. Selecionar aqui não prova o estudo: a confirmação vem antes de gravar.",
          regra: { tipo: "maldicao" },
        });
      }

      case "mesa":
        return montar({
          tipo: "mesa", id: "mesa", vaga: "",
          rotulo: "Concessão da mesa", rotuloEtapa: rotuloDoDegrau(t.passos, t.separado),
          origem: "mesa", nomePoder: "Concessão da mesa", fonte: "", pagina: 0, destino: "conhecido",
          quantidade: null, escolhidos: [], circulos: [1, 2, 3, 4], elemento: "",
          contaNoLimite: false, limite: null, exigeConfirmacao: true,
          explicacao: "A mesa decidiu que o personagem conhece este ritual, fora das regras de progressão. Fica marcado como " +
            "exceção e não resolve pendência nenhuma.",
          regra: { tipo: "mesa" },
        });

      default:
        return montar({
          tipo: "registro", id: "registro", vaga: "",
          rotulo: "Registro na ficha", rotuloEtapa: "", origem: "registro", nomePoder: "Registro", fonte: "", pagina: 0,
          destino: "", quantidade: null, escolhidos: [], circulos: [1, 2, 3, 4], elemento: "",
          contaNoLimite: false, limite: null, exigeConfirmacao: false,
          explicacao: "O ritual entra na ficha para consulta: não é aprendido e não resolve pendência. Aprender vem das " +
            "pendências da Progressão.",
          regra: { tipo: "registro" },
        });
    }
  }

  /* =================================================================
     GRAVAR UMA AQUISIÇÃO
     -----------------------------------------------------------------
     A única porta que escreve o vínculo entre aquisição e ritual. A tela
     monta o que quer — os rituais novos já montados como cópia, e as
     operações — e esta função:

       1. aplica tudo numa CÓPIA do bloco de Ordem;
       2. recalcula a progressão inteira com os rituais que existiriam;
       3. recusa se alguma operação não ficou válida, com o motivo;
       4. só então troca, de uma vez, as escolhas e os registros, e põe
          na ficha os rituais novos que ficaram com aquisição.

     Nada é gravado pela metade: ou todas as operações entram, ou
     nenhuma. Repetir a mesma confirmação não duplica nada — um ritual
     com id que já está na ficha não entra de novo, uma vaga é decidida
     por inteiro, e um segundo registro para o mesmo ritual é recusado
     porque ele já tem aquisição.

     operacao = { tipo: "concessao", vaga, rituais: [ids] }
              | { tipo: "escolha", vaga, candidato }
              | { tipo: "campo", ritualId, fonte, nota, confirmado }
              | { tipo: "mesa", ritualId, nota }
              | { tipo: "desfazerRegistro", id }
              | { tipo: "registro" }            (só põe os novos na ficha)
     e cada uma pode trazer `novos: [ritual]`.
     ================================================================= */

  function falhaDeGravacao(motivos) {
    return { ok: false, motivos: (Array.isArray(motivos) ? motivos : [motivos]).filter(Boolean) };
  }

  function aplicarOperacao(copia, op, virtuais, t) {
    var achar = function (id) { return virtuais.filter(function (x) { return x && x.id === id; })[0] || null; };
    switch (op.tipo) {
      case "concessao": {
        var v = vagas(copia).filter(function (x) { return x.id === op.vaga; })[0];
        if (!v || v.tipo !== "rituais") return falhaDeGravacao("Esta concessão de rituais não faz mais parte da progressão.");
        var vinculos = [];
        var faltou = "";
        (op.rituais || []).forEach(function (id) {
          var r = achar(id);
          if (!r) { faltou = id; return; }
          vinculos.push(vinculoDeRitual(r));
        });
        if (faltou) return falhaDeGravacao("Um dos rituais escolhidos não existe na ficha.");
        definirRituais(copia, op.vaga, vinculos);
        return { ok: true, vaga: op.vaga };
      }
      case "escolha": {
        var ve = vagas(copia).filter(function (x) { return x.id === op.vaga; })[0];
        if (!ve) return falhaDeGravacao("Esta etapa não faz mais parte da progressão.");
        var reg = registrar(copia, ve, op.candidato || {});
        return { ok: true, registroId: reg.id };
      }
      case "campo":
      case "maldicao":
      case "mesa": {
        var ritual = achar(op.ritualId);
        if (!ritual) return falhaDeGravacao("O ritual não existe na ficha.");
        var d = dadosDoRitualDaFicha(ritual);
        var novo = normalizarRegistroDeRitual({
          id: op.id || uuid(), tipo: op.tipo, ritualId: ritual.id, nome: d.nome, circulo: d.circulo,
          elemento: d.elemento, elementos: d.elementos, todosOsElementos: d.todosOsElementos,
          degrau: op.degrau || t.passos, fonte: op.fonte || "", nota: op.nota || "",
          confirmado: op.confirmado === true, registradoEm: agora(),
        });
        if (!Array.isArray(copia.registrosDeRitual)) copia.registrosDeRitual = [];
        copia.registrosDeRitual.push(novo);
        return { ok: true, registroId: novo.id };
      }
      case "desfazerRegistro":
        copia.registrosDeRitual = (copia.registrosDeRitual || []).filter(function (r) { return r.id !== op.id; });
        return { ok: true };
      case "registro":
        return { ok: true };
      default:
        return falhaDeGravacao("Operação desconhecida.");
    }
  }

  function conferirOperacao(depois, op, marca) {
    switch (op.tipo) {
      case "concessao": {
        var reg = null;
        Object.keys(depois.avaliacoes).forEach(function (id) {
          var av = depois.avaliacoes[id];
          if (av && av.vaga && av.vaga.id === op.vaga && !av.duplicado) reg = av;
        });
        if (reg && reg.motivos.length && !reg.mantidaPelaMesa) return reg.motivos.join(" ");
        var fora = (op.rituais || []).filter(function (id) {
          var dono = depois.rituais.porRitual[id];
          return !dono || dono.concessao !== op.vaga;
        });
        if (fora.length) return "Nem todo ritual escolhido coube nesta concessão.";
        return "";
      }
      case "escolha": {
        var a = depois.avaliacoes[marca.registroId];
        if (!a) return "A escolha não ficou registrada.";
        if (!a.completo) return "Falta: " + a.faltam.join("; ") + ".";
        if (!a.valido) return a.motivos.join(" ");
        return "";
      }
      case "campo":
      case "maldicao":
      case "mesa": {
        var r = (depois.rituais.registros || []).filter(function (x) { return x.registro.id === marca.registroId; })[0];
        if (!r) return "O registro não foi aceito.";
        return r.valido ? "" : r.motivo;
      }
      default:
        return "";
    }
  }

  function confirmarAquisicao(ordem, rituaisDaFicha, operacoes, contexto) {
    if (!ordem) return falhaDeGravacao("Ficha sem bloco de Ordem.");
    var ops = (Array.isArray(operacoes) ? operacoes : [operacoes]).filter(Boolean);
    if (!ops.length) return { ok: true, criados: [] };
    var lista = Array.isArray(rituaisDaFicha) ? rituaisDaFicha : [];
    var t = R().trilho(ordem);

    var novos = [];
    ops.forEach(function (op) {
      (Array.isArray(op.novos) ? op.novos : []).forEach(function (r) {
        if (!r || !r.id) return;
        if (lista.some(function (x) { return x && x.id === r.id; })) return;
        if (novos.some(function (x) { return x.id === r.id; })) return;
        novos.push(r);
      });
    });
    var virtuais = lista.concat(novos);

    var copia = JSON.parse(JSON.stringify(ordem));
    if (!Array.isArray(copia.registrosDeRitual)) copia.registrosDeRitual = [];
    var marcas = [];
    for (var i = 0; i < ops.length; i++) {
      var m = aplicarOperacao(copia, ops[i], virtuais, t);
      if (!m.ok) return m;
      marcas.push(m);
    }

    var depois = percorrer(copia, Object.assign({}, contexto || {}, { rituais: virtuais }), null);
    for (var j = 0; j < ops.length; j++) {
      var motivo = conferirOperacao(depois, ops[j], marcas[j]);
      if (motivo) return falhaDeGravacao(motivo);
    }

    /* Ritual novo só entra com aquisição — ou quando a operação pediu,
       explicitamente, só o registro. Uma escolha trocada no meio do
       caminho não deixa cópia órfã na ficha. */
    var soRegistro = ops.some(function (op) { return op.tipo === "registro"; });
    var entram = novos.filter(function (r) { return soRegistro || !!depois.rituais.porRitual[r.id]; });

    ordem.escolhas = copia.escolhas;
    ordem.registrosDeRitual = copia.registrosDeRitual;
    /* v9.25: a cópia de um elemento Homebrew escolhido vem junto. */
    if (copia.homebrew) ordem.homebrew = copia.homebrew;
    entram.forEach(function (r) {
      if (!lista.some(function (x) { return x && x.id === r.id; })) lista.push(r);
    });
    return { ok: true, criados: entram.map(function (r) { return r.id; }), marcas: marcas };
  }

  /* Quando um ritual sai da ficha, os vínculos DIRETOS a ele saem junto
     (o da concessão e o registro de estudo ou da mesa). O de uma escolha
     de poder — Aprender Ritual — fica: a escolha passa a apontar para um
     ritual que não existe, a Progressão mostra isso, e quem joga decide.
     Apagar a escolha junto seria desfazer um poder sem ninguém pedir. */
  function esquecerRitual(ordem, ritualId) {
    if (!ordem || !ritualId) return;
    (ordem.escolhas || []).forEach(function (r) {
      if (r.tipo !== "rituais") return;
      var restantes = rituaisDoRegistro(r).filter(function (x) { return x.id !== ritualId; });
      if (restantes.length !== rituaisDoRegistro(r).length) r.opcoes.rituais = restantes;
    });
    ordem.escolhas = (ordem.escolhas || []).filter(function (r) {
      return r.tipo !== "rituais" || rituaisDoRegistro(r).length > 0;
    });
    ordem.registrosDeRitual = (ordem.registrosDeRitual || []).filter(function (r) { return r.ritualId !== ritualId; });
  }

  /* Os rituais que o personagem CONHECE antes de uma etapa — os que
     Aprender Ritual pode trocar. Grimório fica de fora: ele guarda o que
     a mente não guarda (OPRPG p.35). */
  function conhecidosAntes(ordem, idVaga, contexto) {
    var c = contextoDaVaga(ordem, idVaga, contexto);
    if (!c) return [];
    return ativos(c.percurso).filter(function (a) { return a.ritualId && a.destino !== "grimorio"; }).map(function (a) {
      return { id: a.ritualId, nome: a.nome, circulo: a.circulo, nomePoder: a.nomePoder, rotuloEtapa: a.rotuloEtapa };
    });
  }

  /* Quantos rituais uma concessão dá, conferido contra o personagem
     COMO ELE ESTAVA naquela etapa — é o que a janela de escolha mostra
     em "Escolhidos: 1 de 3". */
  function quantidadeDeRituais(ordem, idVaga, contexto) {
    var c = contextoDaVaga(ordem, idVaga, contexto);
    if (!c || !c.vaga.concessao || !A) return 0;
    return A.quantidadeDa(c.vaga.concessao, c.percurso.atributos.int || 0);
  }

  /* Uma habilidade automática que ainda espera a opção interna aparece
     na ficha — ela JÁ chegou — mas marcada como incompleta, e sem
     efeito até a opção ser escolhida. Ela não satisfaz requisito de
     ninguém enquanto isso. */
  function exibirIncompleta(percurso, v, trilhaOk, ordem) {
    var h = P.poder(v.beneficio);
    if (!h) return;
    percurso.adquiridos.push({
      id: idDeAquisicao(percurso, v.id, h.chave),
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
  /* As variantes do Arquivos Secretos 7 (p. 81 e 85) prendem do mesmo
     jeito, pelo elemento de Ser Experimentado e de Ser Escarificado. */
  var ELEMENTO_DO_MONSTRUOSO = [
    { chave: "serAmaldicoado", nome: "Ser Amaldiçoado", ref: "Sobrevivendo ao Horror, p. 17" },
    { chave: "serExperimentado", nome: "Ser Experimentado", ref: "Arquivos Secretos 7, p. 81" },
    { chave: "serEscarificado", nome: "Ser Escarificado", ref: "Arquivos Secretos 7, p. 85" },
  ];

  function conflitoDeAfinidade(ordem, percurso, af) {
    if (!af.elemento) return "";
    for (var i = 0; i < ELEMENTO_DO_MONSTRUOSO.length; i++) {
      var m = ELEMENTO_DO_MONSTRUOSO[i];
      var base = percurso.adquiridos.filter(function (a) { return vale(a) && a.chave === m.chave; })[0];
      if (!base || !base.opcoes || !base.opcoes.elemento || base.opcoes.elemento === af.elemento) continue;
      return "A trilha Monstruoso exige afinidade com " + nomeDoElemento(base.opcoes.elemento) +
        ", o elemento de " + m.nome + " (" + m.ref + ").";
    }
    return "";
  }

  function motivoFora(ordem, r, t) {
    if (/^s\d\./.test(r.etapa) || r.etapa === "b.cicatrizado" || /^b\.(esperto|entendido)$/.test(r.etapa)) {
      return "Esta escolha é de um estágio de Sobrevivente que a ficha não alcança agora (o estágio baixou, a trilha ou a classe mudou). Ela fica guardada e volta a valer se o estágio voltar.";
    }
    if (/^t\./.test(r.etapa)) {
      return "Esta escolha é da transição para agente, que não vale mais (a classe mudou depois). Ela fica guardada.";
    }
    if (/^p\d\./.test(r.etapa)) {
      if (!t.porPatente) return "Esta escolha é de uma patente da Evolução por Patentes, que está desligada nesta ficha (aba Regras). Ela fica guardada e volta a valer ao religar.";
      return "Esta escolha é de uma patente acima de " + t.rotulo + " (ou de uma classe que a ficha não tem mais). Ela fica guardada e volta a valer quando a patente for conquistada.";
    }
    if (t.porPatente && /^d\d+\./.test(r.etapa) && !/^d1\.(rituaisIniciais|perito)$/.test(r.etapa)) {
      return "Esta escolha é da progressão por NEX. Com a Evolução por Patentes ligada, as vagas são as das patentes: a escolha fica guardada e volta a valer ao desligar a regra.";
    }
    if (/^d\d+\.(rituaisIniciais|ritualClasse|saberAmpliado|grimorio)$/.test(r.etapa)) {
      return "Esta concessão de rituais não existe mais — a classe, a trilha, o degrau ou uma regra " +
        "opcional mudou. Os rituais continuam na aba Rituais, agora sem concessão, e o vínculo volta " +
        "sozinho se a concessão voltar.";
    }
    if (/^d\d+\.(poderCombate|poderUtilidade)$/.test(r.etapa) && !modularLigada(ordem)) {
      return "Esta escolha é de uma vaga da Evolução Modular, que está desligada (aba Regras). Ela fica guardada e volta a valer ao religar.";
    }
    if (/^d\d+\.poderClasse$/.test(r.etapa) && modularLigada(ordem)) {
      return "Com a Evolução Modular ligada, a vaga “Poder de classe” não existe: a escolha fica guardada. Associe-a a uma vaga de combate ou de utilidade no cartão da regra (aba Regras).";
    }
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
    /* Suplemento desligado: fica à vista, mas não entra como escolha nova. */
    if (C.fonteLiberada && !C.fonteLiberada(e)) motivos.push(C.motivoDaFonte(e));
    return {
      entrada: e,
      requisitos: reqs,
      repeticao: rep,
      disponivel: !motivos.length,
      motivos: motivos,
    };
  }

  function contextoDaVaga(ordem, idVaga, contexto) {
    /* v9.16: a janela de uma aquisição extra usa "extra:<ref>@<degrau>"
       como vaga: as opções internas (Transcender → poder…) são
       conferidas no personagem daquela etapa. */
    var mx = /^extra:([A-Za-z0-9_.:-]+?)@(\d*)$/.exec(String(idVaga || ""));
    if (mx) {
      var cx = contextoDoExtra(ordem, mx[1], contexto, mx[2] === "" ? null : { degrau: parseInt(mx[2], 10) });
      return { vaga: vaga(idVaga, "extra", { rotulo: "Aquisição extra", degrau: cx.etapa.degrau, rotuloEtapa: cx.etapa.rotulo }), percurso: cx.percurso, etapa: cx.etapa };
    }
    var v = vagas(ordem).filter(function (x) { return x.id === idVaga; })[0] || null;
    if (!v) return null;
    var p = estadoAntes(ordem, idVaga, contexto) || novoPercurso(ordem);
    /* v9.16: reconstruindo uma etapa do retrato, os poderes importados
       ("etapa desconhecida") não entram na conta da lista — o poder que
       a pessoa está ligando à etapa não pode barrar a si mesmo. */
    if (contexto && contexto.semImportadas) {
      p = copiarPercurso(p);
      p.adquiridos = p.adquiridos.filter(function (a) { return a.via !== "importacao"; });
    }
    return { vaga: v, percurso: p, etapa: etapaDe(ordem, v) };
  }

  function candidatosPoderClasse(ordem, idVaga, contexto) {
    var c = contextoDaVaga(ordem, idVaga, contexto);
    if (!c) return [];
    var oferta = P.poderesDeClasse(ordem.classe);
    /* O Possuído não escolhe: a vaga só aceita Transcender. */
    if (c.vaga.soTranscender) oferta = oferta.filter(function (e) { return e.chave === "transcender"; });
    return oferta.map(function (e) {
      var cand = candidato(e, c.percurso, c.etapa, ordem);
      cand.viaGeral = e.tipo === "geral" || (e.classes.indexOf(C.classeDosPoderes ? C.classeDosPoderes(ordem.classe) : ordem.classe) < 0 && !!e.geral);
      /* Evolução Modular: o poder do outro grupo fica à vista, com o motivo. */
      var mg = motivoDoGrupo(e, c.vaga, ordem);
      if (mg) { cand.disponivel = false; cand.motivos = cand.motivos.concat([mg]); }
      if (c.vaga.grupoModular) cand.grupoModular = P.grupoModular(e, ajustesModulares(ordem));
      return cand;
    });
  }

  /* O poder cabe no grupo da vaga modular? Poder geral cabe em qualquer. */
  function motivoDoGrupo(e, v, ordem) {
    if (!v || !v.grupoModular || !P.grupoModular) return "";
    var g = P.grupoModular(e, ajustesModulares(ordem));
    if (!g || g === "geral" || g === v.grupoModular) return "";
    return e.nome + " é um poder de " + g + "; esta vaga da Evolução Modular é de " + v.grupoModular + " (AS6 p. 80).";
  }

  /* =================================================================
     EVOLUÇÃO MODULAR — associar as escolhas que já existiam
     -----------------------------------------------------------------
     Ligar a regra deixa as escolhas de "Poder de classe" (d<n>.poderClasse)
     guardadas, fora da progressão. `associacoesModulares` diz, para
     cada uma, a vaga modular sugerida (a do mesmo degrau, se o grupo
     couber e ela estiver livre; senão a primeira livre do grupo dali
     para a frente; senão a livre mais próxima antes). `associarModular` faz uma CÓPIA da escolha na vaga
     modular, com `associadoDe` apontando o registro de origem: o
     original continua guardado e volta a valer se a regra for
     desligada — nada é concedido duas vezes, porque uma vaga só existe
     com a regra ligada e a outra só com ela desligada.
     ================================================================= */

  function associacoesModulares(ordem) {
    if (!modularLigada(ordem)) return [];
    var vs = vagas(ordem).filter(function (v) { return v.grupoModular; });
    var ocupadas = {};
    (ordem.escolhas || []).forEach(function (r) { ocupadas[r.etapa] = true; });
    var jaAssociadas = {};
    (ordem.escolhas || []).forEach(function (r) { if (r.associadoDe) jaAssociadas[r.associadoDe] = true; });
    var reservadas = {};
    return (ordem.escolhas || []).filter(function (r) {
      return /^d\d+\.poderClasse$/.test(r.etapa) && r.valor && !jaAssociadas[r.id];
    }).map(function (r) {
      var e = P.poder(r.valor);
      var g = e ? P.grupoModular(e, ajustesModulares(ordem)) : "";
      var d = parseInt(r.etapa.slice(1), 10);
      var cabe = function (v) { return !ocupadas[v.id] && !reservadas[v.id] && (g === "geral" || !g || v.grupoModular === g); };
      var mesma = vs.filter(function (v) { return v.degrau === d && cabe(v); })[0];
      var depois = vs.filter(function (v) { return v.degrau >= d && cabe(v); })[0];
      /* Sem vaga do grupo dali para a frente (NEX 75%: a próxima de
         utilidade seria 80%), a livre mais próxima antes — os requisitos
         são conferidos lá, como em qualquer escolha. */
      var antes = vs.filter(function (v) { return v.degrau < d && cabe(v); }).slice(-1)[0];
      var sugerida = mesma || depois || antes || null;
      if (sugerida) reservadas[sugerida.id] = true;
      return { registro: r, poder: e, grupo: g, sugerida: sugerida, livres: vs.filter(function (v) { return !ocupadas[v.id] && (g === "geral" || !g || v.grupoModular === g); }) };
    });
  }

  function associarModular(ordem, registroId, idVaga) {
    if (!modularLigada(ordem)) return { ok: false, motivo: "A Evolução Modular está desligada nesta ficha." };
    var r = (ordem.escolhas || []).filter(function (x) { return x.id === registroId; })[0];
    if (!r || !/^d\d+\.poderClasse$/.test(r.etapa)) return { ok: false, motivo: "Escolha de poder de classe não encontrada." };
    var v = vagas(ordem).filter(function (x) { return x.id === idVaga && x.grupoModular; })[0];
    if (!v) return { ok: false, motivo: "Essa vaga da Evolução Modular não existe nesta ficha." };
    if ((ordem.escolhas || []).some(function (x) { return x.etapa === idVaga; })) return { ok: false, motivo: "Essa vaga já tem uma escolha." };
    if ((ordem.escolhas || []).some(function (x) { return x.associadoDe === r.id; })) return { ok: false, motivo: "Esta escolha já foi associada a uma vaga modular." };
    var e = P.poder(r.valor);
    var mg = e ? motivoDoGrupo(e, v, ordem) : "";
    if (mg) return { ok: false, motivo: mg };
    var copia = normalizarRegistro({
      id: uuid(), etapa: v.id, tipo: "poderClasse", valor: r.valor, opcoes: JSON.parse(JSON.stringify(r.opcoes || {})),
      nome: r.nome, ignorarRequisitos: false, registradoEm: agora(), associadoDe: r.id,
    });
    ordem.escolhas.push(copia);
    return { ok: true, registro: copia, vaga: v };
  }

  function candidatosParanormais(ordem, idVaga, contexto) {
    var c = contextoDaVaga(ordem, idVaga, contexto);
    if (!c) return [];
    return (P.paranormaisDisponiveis ? P.paranormaisDisponiveis() : P.PODERES_PARANORMAIS).map(function (e) {
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
    return C.trilhasDaClasse(classeAlvo, ordem).filter(function (tr) {
      return !excluirPropria || tr.chave !== ordem.trilha;
    }).map(function (tr) {
      var reqs = (tr.requisitos || []).map(function (r) {
        return c ? requisito(r, c.percurso, c.etapa, {}, ordem) : { ok: true, texto: "", falta: "" };
      });
      var motivos = reqs.filter(function (r) { return !r.ok; }).map(function (r) { return "Requisito: " + r.falta + "."; });
      if (C.fonteLiberada && !C.fonteLiberada(tr)) motivos.push(C.motivoDaFonte(tr));
      return { trilha: tr, requisitos: reqs, disponivel: !motivos.length, motivos: motivos, primeira: P.primeiraDaTrilha(tr.chave) };
    });
  }

  function candidatosAtributo(ordem, idVaga, contexto) {
    var c = contextoDaVaga(ordem, idVaga, contexto);
    if (!c) return [];
    var teto = c.vaga.maximo || C.GERACAO_ATRIBUTOS.maximoPorAumento;
    /* v9.16: reconstruindo uma etapa do retrato, o valor importado já
       contém o aumento que veio aqui — a conta é a de antes dele. */
    var hist = !!(contexto && contexto.semImportadas);
    return C.ATRIBUTOS.map(function (a) {
      var atual = c.percurso.atributos[a.chave] || 0;
      var antes = hist ? Math.max(0, atual - 1) : atual;
      return {
        atributo: a,
        atual: antes,
        novo: antes + 1,
        disponivel: antes < teto,
        motivos: antes < teto ? [] : [a.nome + " já está em " + atual + ". O aumento de atributo não passa de " + teto + "."],
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
    /* v9.16: reconstruindo uma etapa do retrato, o grau importado pode
       ser justamente o que veio aqui — a regra é conferida um passo
       antes (a reconstrução devolve o passo à base). */
    var hist = !!(contexto && contexto.semImportadas) && (modo === "grau" || modo === "treinamento" || modo === "treinar");

    return C.PERICIAS.filter(function (pe) {
      if (f.entre && f.entre.indexOf(pe.chave) < 0) return false;
      return true;
    }).map(function (pe) {
      var atual = p.graus[pe.chave] || 0;
      if (hist && atual > 0) atual--;
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
    var fase = R().faseDe(ordem);
    /* O Sobrevivente que virou agente "mantém todas as habilidades já
       recebidas" (SAH p. 32) — o Empenho também. A transição do Mundano
       não diz isso (OPRPG p. 172), e ele não fica. */
    var preservada = fase.anterior === "sobrevivente" ? "sobrevivente" : "";
    var custos = {};
    var est = estado(ordem);
    (est ? est.efeitos : []).forEach(function (ef) {
      if (ef.tipo === "custoHabilidade") (custos[ef.habilidade] = custos[ef.habilidade] || []).push(ef);
    });
    var EP = C.EVOLUCAO_PATENTES;
    return P.AUTOMATICAS.filter(function (a) {
      if (a.classes.indexOf(classe.chave) >= 0) {
        /* Evolução por Patentes: só as habilidades das tabelas 2.7 a 2.9
           (sem Engenhosidade), todas desde recruta. */
        if (t.porPatente) return EP.automaticas.indexOf(a.chave) >= 0;
        var inicio = P.NEX_INICIAL_AUTOMATICA[a.chave];
        return t.nexEquivalente >= (inicio === undefined ? 5 : inicio);
      }
      return !!preservada && a.classes.indexOf(preservada) >= 0;
    }).map(function (a) {
      var atual = null;
      if (t.porPatente && EP.estagios[a.chave]) {
        EP.estagios[a.chave].forEach(function (s) { if (t.patente >= s.patente) atual = s; });
      } else {
        (P.ESTAGIOS[a.chave] || []).forEach(function (s) { if (t.nexEquivalente >= s.nex) atual = s; });
      }
      var texto = atual ? atual.texto : "";
      (custos[a.chave] || []).forEach(function (ef) {
        texto += (texto ? " · " : "") + "custo " + (ef.valor > 0 ? "+" : "") + ef.valor + " PE (" + ef.fonte + ", Treinamento Especial)";
      });
      return { id: "auto|" + a.chave, entrada: a, estagio: texto, preservada: a.classes.indexOf(classe.chave) < 0 };
    });
  }

  /* =================================================================
     VIRAR AGENTE — o fluxo explícito
     -----------------------------------------------------------------
     `planoDeTransicao` não mexe em nada: mostra o que muda, o que fica e
     o que vai faltar decidir. `transicionar` aplica, de uma vez:

       · a trajetória { id, de, para, estágio, em } — a única coisa que a
         transição GRAVA; os ganhos são recalculados dela a cada leitura,
         e por isso reabrir ou salvar de novo não os concede outra vez;
       · a classe nova, sem trilha de agente, em NEX 5% (ou nível 1);
       · os recursos atuais "cheios" congelados no valor de antes: o
         máximo sobe, o atual NÃO é restaurado sozinho.

     Nada é apagado: escolhas, rituais, inventário, notas, condições e
     personalizações ficam. As escolhas da transição (perícias, o ponto
     de atributo do Mundano) aparecem em "Falta decidir".
     ================================================================= */

  var RECURSOS_DA_TRANSICAO = ["pv", "pe", "san", "pd"];

  function simularTransicao(ordem, para, quando, id) {
    var copia = JSON.parse(JSON.stringify(ordem));
    var fase = R().faseDe(ordem);
    copia.trajetoria = [{
      id: id || "tr-previa", de: fase.perfil, para: para,
      estagio: fase.perfil === "sobrevivente" ? fase.estagio : 0,
      em: quando || agora(), nota: "",
    }];
    copia.classe = para;
    copia.trilha = "";
    if (OP() && OP().ligada(copia, "nexExperiencia")) {
      copia.nivel = 1;
      copia.nivelDefinido = true;
    } else {
      copia.nex = 5;
    }
    return copia;
  }

  function recursosDe(ordem) {
    var saida = {};
    var comPd = R().usaDeterminacao ? R().usaDeterminacao(ordem) : !!(ordem.opcionais && ordem.opcionais.semSanidade);
    saida.pv = R().pontosDeVida(ordem).total;
    saida.pe = R().pontosDeEsforco(ordem).total;
    saida.san = R().sanidade(ordem).total;
    saida.pd = comPd ? R().determinacao(ordem).total : null;
    return saida;
  }

  function planoDeTransicao(ordem, para, contexto) {
    var fase = R().faseDe(ordem);
    if (!fase.comum) return { ok: false, motivo: "Só um Mundano ou um Sobrevivente vira agente por treinamento. Esta ficha já é de " + ((C.classe(ordem.classe) || {}).nome || "outra classe") + "." };
    if (!C.ehAgente(para)) return { ok: false, motivo: "Escolha combatente, especialista ou ocultista." };
    var de = fase.perfil;
    var tr = C.TRANSICOES[de];
    var g = tr.classes[para];
    var depois = simularTransicao(ordem, para);
    var antesR = recursosDe(ordem);
    var depoisR = recursosDe(depois);
    var atuais = ordem.recursos || {};
    var recursos = {};
    RECURSOS_DA_TRANSICAO.forEach(function (q) {
      if (antesR[q] === null && depoisR[q] === null) return;
      var guardado = atuais[q];
      var atual = guardado === null || guardado === undefined ? antesR[q] : Math.min(guardado, antesR[q] === null ? guardado : antesR[q]);
      recursos[q] = { maximoAntes: antesR[q], maximoDepois: depoisR[q], atual: atual };
    });
    var estDepois = estado(depois, contexto || null);
    var novas = estDepois.pendencias.filter(function (p) {
      return /^t\./.test(p.id) || /^d1\./.test(p.id);
    });
    var substituicoes = [];
    if (de === "sobrevivente") {
      estDepois.adquiridos.forEach(function (a) { if (a.substituida) substituicoes.push(a.nome + ": " + a.substituida); });
    }
    var avisos = [
      "Os máximos mudam; os valores atuais não são restaurados — quem estava ferido continua ferido.",
    ];
    if (de === "sobrevivente") {
      avisos.push((fase.estagio < C.ESTAGIO_MAXIMO
        ? "A transição toma o lugar da subida para o " + (fase.estagio + 1) + "º estágio: esse estágio não é concedido (Sobrevivendo ao Horror, p. 32)."
        : "O Sobrevivente já está no último estágio: a transição toma o lugar da próxima subida, e não há estágio a perder (Sobrevivendo ao Horror, p. 32).") +
        " Daqui em diante, a ficha sobe de NEX como " + C.classe(para).nome.toLowerCase() + ".");
      avisos.push("Tudo o que o Sobrevivente já tinha continua: Empenho, a trilha e o que ela deu" + (fase.estagio >= 5 ? ", Cicatrizado" : "") + ".");
      if (fase.estagio < 5) avisos.push("O Sobrevivente não chega mais aos estágios seguintes.");
      if (para === "ocultista" && estDepois.vagas.some(function (v) { return v.id === "s4.iniciado"; })) {
        avisos.push("O ritual de Iniciado se soma aos três rituais iniciais de Escolhido pelo Outro Lado (Sobrevivendo ao Horror, p. 32).");
      }
    } else {
      avisos.push("O Empenho é do Mundano: o texto de \u201cAtingindo NEX 5%\u201d (Ordem Paranormal RPG, p. 172) lista o que o agente recebe e não diz que ele fica. A ficha não o mantém; a mesa pode anotá-lo.");
    }
    if (de === "mundano" && R().usaDeterminacao && R().usaDeterminacao(ordem)) {
      avisos.push("Pontos de determinação: o livro não tem tabela para o Mundano; depois da transição, valem os da classe nova, como num agente novato.");
    }
    if (OP() && OP().ligada(ordem, "nexExperiencia")) {
      avisos.push("Com NEX & Experiência, o personagem passa ao nível 1; o NEX de exposição (" + R().exposicao(ordem) + "%) não muda.");
    }
    return {
      ok: true,
      de: de,
      para: para,
      titulo: tr.titulo,
      referencia: global.RAMAOrdemCatalogo.nomeDoLivro(tr.fonte) + ", p. " + tr.pagina,
      ganhos: g,
      atributo: tr.atributo,
      estagio: fase.estagio,
      recursos: recursos,
      pendencias: novas,
      substituicoes: substituicoes,
      avisos: avisos,
      rotuloDepois: R().rotuloDeProgressao(depois),
    };
  }

  /* Aplica a transição. `opcoes.id` identifica a operação: o mesmo id
     repetido (clique duplo, outra aba) não aplica duas vezes. */
  function transicionar(ordem, para, opcoes) {
    var o = opcoes || {};
    var ja = Array.isArray(ordem.trajetoria) ? ordem.trajetoria[0] : null;
    if (ja && o.id && ja.id === o.id && ordem.classe === ja.para) return { ok: true, repetida: true, trajetoria: ja };
    if (ja && ordem.classe === ja.para) return { ok: false, motivo: "Esta ficha já fez a transição para " + ((C.classe(ja.para) || {}).nome || ja.para) + "." };
    var plano = planoDeTransicao(ordem, para, o.contexto);
    if (!plano.ok) return plano;
    var antes = recursosDe(ordem);
    var nova = simularTransicao(ordem, para, o.quando, o.id || ("tr-" + uuid()));
    if (o.nota) nova.trajetoria[0].nota = String(o.nota).slice(0, 200);
    /* O que estava "cheio" (nulo) fica no máximo de antes. */
    if (!ordem.recursos) ordem.recursos = { pv: null, pe: null, san: null, pd: null };
    RECURSOS_DA_TRANSICAO.forEach(function (q) {
      if ((ordem.recursos[q] === null || ordem.recursos[q] === undefined) && antes[q] !== null && antes[q] !== undefined) {
        ordem.recursos[q] = antes[q];
      }
    });
    ordem.trajetoria = nova.trajetoria;
    ordem.classe = nova.classe;
    ordem.trilha = "";
    ordem.nex = nova.nex;
    ordem.nivel = nova.nivel;
    ordem.nivelDefinido = nova.nivelDefinido;
    return { ok: true, plano: plano, trajetoria: ordem.trajetoria[0] };
  }

  /* Os itens amaldiçoados que viraram mundanos em Transcender com Itens
     (AS1 p. 57): derivado das escolhas — desfazer a escolha devolve o
     item. Só conta enquanto a regra está ligada. */
  function itensTranscendidos(ordem) {
    var saida = {};
    if (!ordem || !(OP() && OP().ligada(ordem, "transcenderComItens"))) return saida;
    (ordem.escolhas || []).forEach(function (r) {
      if (!r || !/^t[1-4]\.transcenderItem$/.test(String(r.etapa || "")) || r.valor !== "transcender") return;
      var o = r.opcoes || {};
      if (typeof o.item !== "string" || !o.item) return;
      var poder = o.poder && o.poder.valor ? P.poder(o.poder.valor) : null;
      saida[o.item] = { poder: poder ? poder.nome : "", etapa: r.etapa };
    });
    return saida;
  }

  global.RAMAOrdemProgressao = {
    itensTranscendidos: itensTranscendidos,
    TIPOS: TIPOS,
    GRAUS: GRAUS,
    ELEMENTOS_PODER: ELEMENTOS_PODER,

    degrauDoNex: degrauDoNex,
    nexDoDegrau: nexDoDegrau,
    degrauDeExposicao: degrauDeExposicao,
    usaProgressaoDeNex: usaProgressaoDeNex,
    rotuloDoDegrau: rotuloDoDegrau,

    vagas: vagas,
    estado: estado,
    abrirCiclo: abrirCiclo,
    fecharCiclo: fecharCiclo,
    emCiclo: emCiclo,
    estadoAntes: estadoAntes,

    normalizarEscolhas: normalizarEscolhas,
    registrar: registrar,
    remover: remover,
    definirIgnorarRequisitos: definirIgnorarRequisitos,
    descrever: descrever,
    nomeDoPoder: nomeDoPoder,

    concessoesDeRitual: concessoesDeRitual,
    contextoDeAquisicao: contextoDeAquisicao,
    conhecidosAntes: conhecidosAntes,
    confirmarAquisicao: confirmarAquisicao,
    esquecerRitual: esquecerRitual,
    normalizarRegistrosDeRitual: normalizarRegistrosDeRitual,
    quantidadeDeRituais: quantidadeDeRituais,
    rituaisEscolhidos: rituaisEscolhidos,
    vinculoDeRitual: vinculoDeRitual,
    definirRituais: definirRituais,
    adicionarRitual: adicionarRitual,
    removerRitual: removerRitual,

    candidatosPoderClasse: candidatosPoderClasse,
    modularLigada: modularLigada,
    grupoDoDegrau: grupoDoDegrau,
    opcoesDeElite: opcoesDeElite,
    escolhaDeElite: escolhaDeElite,
    degrauDaHabilidadeDeTrilha: degrauDaHabilidadeDeTrilha,
    associacoesModulares: associacoesModulares,
    associarModular: associarModular,
    candidatosParanormais: candidatosParanormais,
    candidatosOutraClasse: candidatosOutraClasse,
    candidatosTrilha: candidatosTrilha,
    candidatosHabilidadeDeTrilha: candidatosHabilidadeDeTrilha,
    dominadasDe: dominadasDe,
    candidatosAtributo: candidatosAtributo,
    candidatosPericia: candidatosPericia,
    quantasNoGrau: quantasNoGrau,

    simular: simular,
    impacto: impacto,
    automaticas: automaticas,
    textosDosRequisitos: textosDosRequisitos,
    estagioDaFase: estagioDaFase,
    trilhaSobreviventeDe: trilhaSobreviventeDe,
    planoDeTransicao: planoDeTransicao,
    transicionar: transicionar,

    /* v9.16: reconstrução do histórico importado e aquisições extras. */
    reconstrucaoDe: reconstrucaoDe,
    etapasDoHistorico: etapasDoHistorico,
    reconstruirVaga: reconstruirVaga,
    desfazerReconstrucao: desfazerReconstrucao,
    marcarVaga: marcarVaga,
    reconstrucaoCompleta: reconstrucaoCompleta,
    absorver: absorver,
    valoresFinais: valoresFinais,
    compatibilidadeNaVaga: compatibilidadeNaVaga,
    compatibilidadeDeRituais: compatibilidadeDeRituais,
    normalizarExtras: normalizarExtras,
    gravarExtra: gravarExtra,
    converterEmExtra: converterEmExtra,
    removerExtra: removerExtra,
    candidatosExtra: candidatosExtra,
    contextoDoExtra: contextoDoExtra,
    simularExtra: simularExtra,
    nomeDoExtra: nomeDoExtra,
  };
})(typeof window !== "undefined" ? window : globalThis);
