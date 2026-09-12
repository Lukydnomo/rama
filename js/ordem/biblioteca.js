/* =====================================================================
   R.A.M.A. — Ordem Paranormal · biblioteca oficial de habilidades
   =====================================================================
   O catálogo de poderes.js arrumado para CONSULTA: a janela "Da
   biblioteca" da aba Habilidades mostra, além da Homebrew, o que os
   livros trazem — por classe, poderes gerais e poderes paranormais.

   Trazer uma habilidade daqui faz o mesmo que trazer uma da Homebrew:
   entra na ficha uma CÓPIA DE TEXTO (nome, origem, resumo, requisitos e
   página). Nenhum efeito entra na conta por esse caminho. Os efeitos
   são da aba Progressão, que sabe em que etapa o poder foi escolhido,
   se os requisitos valiam ali e se já foi escolhido antes — uma cópia
   de texto não sabe nada disso, e fingir que sabe daria bônus em dobro.

   Só dados: a tela fica em js/paginas/ficha-habilidades.js.
   ===================================================================== */

(function (global) {
  "use strict";

  var C = global.RAMAOrdemCatalogo;
  var P = global.RAMAOrdemPoderes;
  var E = global.RAMAOrdemProgressao;

  var ABAS = [
    { chave: "combatente",   rotulo: "Combatente" },
    { chave: "especialista", rotulo: "Especialista" },
    { chave: "ocultista",    rotulo: "Ocultista" },
    { chave: "gerais",       rotulo: "Poderes gerais" },
    { chave: "paranormais",  rotulo: "Poderes paranormais" },
  ];

  var ROTULO_FONTE = { OPRPG: "Livro básico", SAH: "Sobrevivendo ao Horror" };

  function porNome(a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); }

  function nomeDaClasse(k) { var c = C.classe(k); return c ? c.nome : k; }

  /* Uma seção é { chave, titulo, entradas: [{ entrada, classe }] }. A
     classe acompanha a entrada porque a página muda com ela (Artista
     Marcial está numa página no combatente e noutra no especialista). */
  function secoes(aba) {
    if (aba === "gerais") {
      var gerais = P.PODERES_GERAIS.concat(P.PODERES_CLASSE.filter(function (p) { return !!p.geral; }));
      return [{
        chave: "gerais",
        titulo: "Poderes gerais",
        nota: "Do Sobrevivendo ao Horror. Qualquer classe pode escolher no lugar de um poder de classe.",
        entradas: gerais.slice().sort(porNome).map(function (p) { return { entrada: p, classe: "" }; }),
      }];
    }

    if (aba === "paranormais") {
      var grupos = C.ELEMENTOS_AFINIDADE.map(function (k) {
        return { chave: k, titulo: (C.elemento(k) || {}).nome || k, filtro: function (p) { return p.elemento === k; } };
      }).concat([{ chave: "sem", titulo: "Sem elemento fixo", filtro: function (p) { return !p.elemento; } }]);

      return grupos.map(function (g) {
        return {
          chave: g.chave,
          titulo: g.titulo,
          entradas: P.PODERES_PARANORMAIS.filter(g.filtro).sort(porNome).map(function (p) { return { entrada: p, classe: "" }; }),
        };
      }).filter(function (s) { return s.entradas.length; });
    }

    if (!C.classe(aba)) return [];

    var lista = [
      {
        chave: "automaticas",
        titulo: "Habilidades de classe",
        nota: "O que a classe dá sem escolha, conforme o NEX.",
        entradas: P.AUTOMATICAS.filter(function (p) { return p.classes.indexOf(aba) >= 0; })
          .map(function (p) { return { entrada: p, classe: aba }; }),
      },
      {
        chave: "poderes",
        titulo: "Poderes de " + nomeDaClasse(aba).toLowerCase(),
        entradas: P.PODERES_CLASSE.filter(function (p) { return p.classes.indexOf(aba) >= 0; })
          .sort(porNome).map(function (p) { return { entrada: p, classe: aba }; }),
      },
    ];

    C.trilhasDaClasse(aba).forEach(function (t) {
      lista.push({
        chave: "trilha." + t.chave,
        titulo: "Trilha · " + t.nome,
        nota: t.resumo || "",
        entradas: P.habilidadesDaTrilha(t.chave).map(function (p) { return { entrada: p, classe: aba }; }),
      });
    });

    return lista.filter(function (s) { return s.entradas.length; });
  }

  /* De onde a habilidade vem, curto (o campo origem tem 60 caracteres). */
  function origem(p, classe) {
    if (p.tipo === "automatica") return nomeDaClasse(p.classes[0]) + " · Habilidade de classe";
    if (p.tipo === "trilha") {
      var t = C.trilha(p.trilha);
      return (t ? t.nome : "Trilha") + " · NEX " + p.nex + "%";
    }
    if (p.tipo === "paranormal") {
      var el = p.elemento ? C.elemento(p.elemento) : null;
      return "Poder paranormal" + (el ? " · " + el.nome : "");
    }
    if (p.tipo === "geral") return "Poder geral";
    if (p.tipo === "classe") {
      if (classe && p.classes.indexOf(classe) >= 0) return "Poder de " + nomeDaClasse(classe).toLowerCase();
      if (p.geral) return "Poder geral";
      return "Poder de " + p.classes.map(nomeDaClasse).join(" e ").toLowerCase();
    }
    return "Ordem Paranormal";
  }

  function estagios(p) {
    return (P.ESTAGIOS[p.chave] || []).map(function (s) { return "NEX " + s.nex + "%: " + s.texto; });
  }

  function requisitos(p) {
    return E && E.textosDosRequisitos ? E.textosDosRequisitos(p) : [];
  }

  /* A cópia que entra na árvore de habilidades. A `nota` do catálogo
     fica de fora: ela explica o que a ficha automatiza ("o +5 entra na
     conta"), e numa cópia de texto nada entra na conta. */
  function modelo(p, classe) {
    var partes = [p.resumo];
    var niveis = estagios(p);
    if (niveis.length) partes.push(niveis.join(" · "));
    if (p.afinidade) partes.push("Afinidade: " + p.afinidade);
    var reqs = requisitos(p);
    if (reqs.length) partes.push("Pré-requisitos: " + reqs.join("; ") + ".");
    partes.push(P.referencia(p, classe));

    return {
      nome: p.nome,
      origem: origem(p, classe),
      texto: partes.filter(Boolean).join("\n\n"),
    };
  }

  /* Busca por nome e resumo, sem acento e sem caixa. */
  function filtrar(lista, termo) {
    var chave = normalizar(termo);
    if (!chave) return lista;
    return lista.map(function (s) {
      return Object.assign({}, s, {
        entradas: s.entradas.filter(function (x) {
          return normalizar(x.entrada.nome + " " + x.entrada.resumo + " " + (x.entrada.afinidade || "")).indexOf(chave) >= 0;
        }),
      });
    }).filter(function (s) { return s.entradas.length; });
  }

  function normalizar(texto) {
    return String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  }

  /* A aba que abre primeiro: a da classe da ficha, se houver. */
  function abaInicial(classe) {
    return C.classe(classe) ? classe : ABAS[0].chave;
  }

  global.RAMAOrdemBiblioteca = {
    ABAS: ABAS,
    ROTULO_FONTE: ROTULO_FONTE,
    secoes: secoes,
    origem: origem,
    requisitos: requisitos,
    estagios: estagios,
    modelo: modelo,
    filtrar: filtrar,
    abaInicial: abaInicial,
  };
})(typeof window !== "undefined" ? window : globalThis);
