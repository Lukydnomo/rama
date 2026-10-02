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
    { chave: "mundano",      rotulo: "Mundano" },
    { chave: "sobrevivente", rotulo: "Sobrevivente" },
    { chave: "origens",      rotulo: "Origens" },
    { chave: "gerais",       rotulo: "Poderes gerais" },
    { chave: "paranormais",  rotulo: "Poderes paranormais" },
    /* v2.31: os poderes de Intenção (AS2 p. 94-95), da MESMA fonte que a
       seção Intenção da aba Habilidades usa (PODERES_INTENCAO). */
    { chave: "intencao",     rotulo: "Poderes de Intenção" },
  ];

  /* O nome curto de cada livro sai do registro único (C.LIVROS). */
  var ROTULO_FONTE = C.mapaDosLivros ? C.mapaDosLivros("curto") : { OPRPG: "Livro básico", SAH: "Sobrevivendo ao Horror", AS1: "Arquivos Secretos 1", AS2: "Arquivos Secretos 2" };

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

    if (aba === "intencao") {
      return [{
        chave: "intencao",
        titulo: "Poderes de Intenção",
        nota: "Arquivos Secretos 2, p. 94-95. Consultar e copiar o texto não concede o poder nem registra contato com a Coroa de Espinhos: " +
          "o poder com efeito vem da seção Intenção da aba Habilidades, com a regra opcional Poderes de Intenção ligada.",
        entradas: (P.PODERES_INTENCAO || []).slice().sort(porNome).map(function (p) { return { entrada: p, classe: "" }; }),
      }];
    }

    if (aba === "origens") return secoesDeOrigens();
    if (!C.classe(aba)) return [];
    if (!C.ehAgente(aba)) return secoesDeComum(aba);

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

  /* Os poderes de origem (v2.22), do catálogo de origens, por livro. Uma
     entrada é só texto: trazê-la não troca a origem da ficha nem dá o
     benefício — o da origem de verdade vem das regras. */
  function entradaDeOrigem(org) {
    return {
      chave: "origem." + org.chave, nome: org.poder, tipo: "origem", origemNome: org.nome,
      classes: [], requisitos: [], opcoes: [], efeitos: [], resumo: org.resumo || "",
      fonte: org.fonte || "OPRPG", pagina: org.pagina || 0, automacao: org.automacao || "informacao",
    };
  }

  function secoesDeOrigens() {
    var fontes = C.LIVROS.map(function (l) { return { chave: l.sigla, titulo: l.curto }; });
    return fontes.map(function (f) {
      return {
        chave: "origens." + f.chave,
        titulo: "Origens · " + f.titulo,
        nota: "O poder de cada origem. Trazer um daqui copia o texto; não troca a origem do personagem nem dá o benefício.",
        entradas: C.ORIGENS.filter(function (o) { return (o.fonte || "OPRPG") === f.chave; })
          .map(entradaDeOrigem).sort(porNome).map(function (p) { return { entrada: p, classe: "" }; }),
      };
    }).filter(function (s) { return s.entradas.length; });
  }

  /* Mundano e Sobrevivente: Empenho, as trilhas por estágio, Cicatrizado
     e o treinamento que transforma em agente. */
  function secoesDeComum(aba) {
    var lista = [{
      chave: "automaticas",
      titulo: "Habilidades de classe",
      nota: aba === "sobrevivente" ? "Empenho no 1º estágio e Cicatrizado no 5º (Sobrevivendo ao Horror, p. 31)." : "Ordem Paranormal RPG, p. 172.",
      entradas: P.AUTOMATICAS.filter(function (p) { return p.classes.indexOf(aba) >= 0; })
        .concat(aba === "sobrevivente" ? [P.poder("cicatrizado")] : [])
        .map(function (p) { return { entrada: p, classe: aba }; }),
    }];
    if (aba === "sobrevivente") {
      C.TRILHAS_SOBREVIVENTE.forEach(function (t) {
        lista.push({
          chave: "trilha." + t.chave,
          titulo: "Trilha · " + t.nome,
          nota: t.resumo,
          entradas: P.habilidadesDaTrilhaSobrevivente(t.chave).map(function (p) { return { entrada: p, classe: aba }; }),
        });
      });
    }
    lista.push({
      chave: "transicao",
      titulo: "Virar agente · " + (C.TRANSICOES[aba] ? C.TRANSICOES[aba].titulo : ""),
      nota: aba === "sobrevivente"
        ? "No lugar da próxima subida de estágio, depois do treinamento da Ordem. Mantém tudo o que já tinha (Sobrevivendo ao Horror, p. 32)."
        : "Ao atingir NEX 5%, depois do treinamento com um agente experiente, com 1 ponto de atributo (Ordem Paranormal RPG, p. 172).",
      entradas: P.TREINAMENTOS.filter(function (p) { return p.chave.indexOf("treinamento." + aba + ".") === 0; })
        .map(function (p) { return { entrada: p, classe: p.classes[0] }; }),
    });
    return lista.filter(function (s) { return s.entradas.length; });
  }

  /* De onde a habilidade vem, curto (o campo origem tem 60 caracteres). */
  function origem(p, classe) {
    if (p.tipo === "automatica") return nomeDaClasse(classe && p.classes.indexOf(classe) >= 0 ? classe : p.classes[0]) + " · Habilidade de classe";
    if (p.tipo === "sobrevivente") {
      var ts = C.trilhaSobrevivente(p.trilhaSobrevivente);
      return ("Sobrevivente" + (ts ? " · " + ts.nome : "") + " · Estágio " + p.estagio).slice(0, 60);
    }
    if (p.tipo === "treinamento") return p.nome.slice(0, 60);
    if (p.tipo === "origem") return ("Origem · " + p.origemNome).slice(0, 60);
    if (p.tipo === "trilha") {
      var t = C.trilha(p.trilha);
      return (t ? t.nome : "Trilha") + " · NEX " + p.nex + "%";
    }
    if (p.tipo === "paranormal") {
      var el = p.elemento ? C.elemento(p.elemento) : null;
      return "Poder paranormal" + (el ? " · " + el.nome : "");
    }
    if (p.tipo === "geral") return "Poder geral";
    if (p.tipo === "intencao") return "Poder de Intenção";
    if (p.tipo === "classe") {
      if (classe && p.classes.indexOf(classe) >= 0) return "Poder de " + nomeDaClasse(classe).toLowerCase();
      if (p.geral) return "Poder geral";
      return "Poder de " + p.classes.map(nomeDaClasse).join(" e ").toLowerCase();
    }
    return "Ordem Paranormal";
  }

  /* Gatilho, uso, efeito, duração e limites de um poder de Intenção,
     lidos do bloco `intencao` da entrada. */
  function detalhesDeIntencao(p) {
    var it = p && p.intencao;
    if (!it) return [];
    var linhas = ["Gatilho: " + it.gatilho];
    if (it.uso) linhas.push("Uso: " + it.uso + ".");
    linhas.push("Efeito: " + (it.efeito === "ativo" ? "fica ativo até ser desligado" + (it.duracao === "cena" ? " ou a cena acabar" : "") : "instantâneo") + ".");
    if (it.duracao === "cena") linhas.push("Duração: até o fim da cena.");
    var limites = [];
    if (it.porCena) limites.push(it.porCena + " vez(es) por cena");
    if (it.mesmaCena) limites.push("na mesma cena em que o gatilho foi atendido");
    if (it.tipo === "ferimentos") limites.push(it.ferimentos + " ferimentos de " + it.danoMinimo + "+ de dano para cada uso");
    limites.push("o gatilho é atendido de novo a cada uso");
    linhas.push("Limites: " + limites.join("; ") + ".");
    if (it.rd) linhas.push("Enquanto ativo: RD " + it.rd + (it.perdaPorTurno ? ", e perde " + it.perdaPorTurno + " PV no início de cada turno" : "") + ".");
    (it.versoesNpc || []).forEach(function (v) { linhas.push("Ficha de NPC — " + v.ficha + ": " + v.texto); });
    return linhas;
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
    if (p.intencao) partes.push(detalhesDeIntencao(p).join("\n"));
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

  /* =================================================================
     FILTROS (v2.31)
     -----------------------------------------------------------------
     Sobre os DADOS da entrada, nunca sobre o nome: livro (fonte),
     elemento (o `elemento` da entrada; "intencao" nos poderes de
     Intenção; sem o campo, "sem" — nada é deduzido), tipo e trilha (a
     seção da aba de classe). Combinam com a busca e entre si.
     ================================================================= */

  var NOMES_TIPO = {
    automatica: "Habilidade de classe", classe: "Poder de classe", geral: "Poder geral", paranormal: "Poder paranormal",
    trilha: "Habilidade de trilha", sobrevivente: "Habilidade de trilha (sobrevivente)", treinamento: "Treinamento",
    origem: "Poder de origem", intencao: "Poder de Intenção",
  };

  function tipoDe(x) {
    var p = x.entrada;
    if (p.tipo === "classe" && p.geral && !x.classe) return "geral";
    return p.tipo || "";
  }

  function metadados(x, secao) {
    var p = x.entrada;
    return {
      livro: p.fonte || "OPRPG",
      elemento: p.elemento || "sem",
      tipo: tipoDe(x),
      trilha: secao && /^trilha\./.test(secao.chave) ? secao.chave.slice(7) : "",
    };
  }

  function nomeDoElemento(k) {
    if (k === "sem") return "Sem elemento";
    if (k === "intencao") return "Intenção";
    var e = C.elemento(k);
    return e ? e.nome : k;
  }

  /* As opções que fazem sentido NESTA aba: só os valores presentes. */
  function opcoesDeFiltro(lista) {
    var achados = { livro: {}, elemento: {}, tipo: {}, trilha: {} };
    var titulosDeTrilha = {};
    (lista || []).forEach(function (s) {
      s.entradas.forEach(function (x) {
        var m = metadados(x, s);
        achados.livro[m.livro] = true;
        achados.elemento[m.elemento] = true;
        achados.tipo[m.tipo] = true;
        if (m.trilha) { achados.trilha[m.trilha] = true; titulosDeTrilha[m.trilha] = s.titulo.replace(/^Trilha · /, ""); }
        else achados.trilha.sem = true;
      });
    });
    var ordemEl = (C.ELEMENTOS_AFINIDADE || []).concat(["medo", "intencao", "sem"]);
    return {
      livro: C.LIVROS.filter(function (l) { return achados.livro[l.sigla]; }).map(function (l) { return { valor: l.sigla, rotulo: l.curto }; }),
      elemento: ordemEl.filter(function (k, i) { return achados.elemento[k] && ordemEl.indexOf(k) === i; })
        .map(function (k) { return { valor: k, rotulo: nomeDoElemento(k) }; }),
      tipo: Object.keys(NOMES_TIPO).filter(function (k) { return achados.tipo[k]; }).map(function (k) { return { valor: k, rotulo: NOMES_TIPO[k] }; }),
      trilha: Object.keys(achados.trilha).filter(function (k) { return k !== "sem"; }).length
        ? [{ valor: "sem", rotulo: "Fora das trilhas" }].concat(Object.keys(titulosDeTrilha).map(function (k) { return { valor: k, rotulo: titulosDeTrilha[k] }; }))
        : [],
    };
  }

  /* Um filtro só vale se a opção existe nesta aba: trocar de aba mantém
     as seleções compatíveis e larga as que não fazem sentido. */
  function filtrosCompativeis(filtros, opcoes) {
    var saida = {};
    ["livro", "elemento", "tipo", "trilha"].forEach(function (k) {
      var v = filtros && filtros[k];
      if (v && (opcoes[k] || []).some(function (o) { return o.valor === v; })) saida[k] = v;
    });
    return saida;
  }

  /* Busca por nome e resumo, sem acento e sem caixa, combinada com os
     filtros. Seções que ficam vazias saem. */
  function filtrar(lista, termo, filtros) {
    var chave = normalizar(termo);
    var f = filtros || {};
    return lista.map(function (s) {
      return Object.assign({}, s, {
        entradas: s.entradas.filter(function (x) {
          var m = metadados(x, s);
          if (f.livro && m.livro !== f.livro) return false;
          if (f.elemento && m.elemento !== f.elemento) return false;
          if (f.tipo && m.tipo !== f.tipo) return false;
          if (f.trilha && (f.trilha === "sem" ? !!m.trilha : m.trilha !== f.trilha)) return false;
          if (!chave) return true;
          return normalizar(x.entrada.nome + " " + x.entrada.resumo + " " + (x.entrada.afinidade || "") + " " + (x.entrada.origemNome || "") +
            " " + (x.entrada.intencao ? x.entrada.intencao.gatilho : "")).indexOf(chave) >= 0;
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
    metadados: metadados,
    opcoesDeFiltro: opcoesDeFiltro,
    filtrosCompativeis: filtrosCompativeis,
    detalhesDeIntencao: detalhesDeIntencao,
    NOMES_TIPO: NOMES_TIPO,
    abaInicial: abaInicial,
  };
})(typeof window !== "undefined" ? window : globalThis);
