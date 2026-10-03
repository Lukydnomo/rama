/* =====================================================================
   R.A.M.A. — Importar do CRIS: a janela (v2.34)
   ---------------------------------------------------------------------
   Link → consulta (servidor) → conversão (js/importar-cris.js) →
   revisão → "Baixar JSON RAMA" ou "Criar ficha".

   Nada é gravado antes de "Criar ficha": consultar, converter, revisar
   e baixar não criam personagem. Cancelar descarta o rascunho.

   Três cuidados de ordem:
   · resposta atrasada: cada consulta leva um número; a que volta depois
     de outra ter começado (ou depois de o link mudar, ou de a janela
     fechar) é ignorada;
   · clique repetido: o botão de criar trava enquanto trabalha, e a
     criação leva um `operacaoId` fixo para este retrato — repetir depois
     de uma falha devolve a MESMA ficha, se a primeira chegou ao servidor;
   · foto: vem depois de a ficha existir e nunca a desfaz; falhou, a
     ficha fica sem foto e a janela diz.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var UI = global.RAMAUI;
  var el = U.el;

  var PREFIXO_FOTO = "https://firebasestorage.googleapis.com/v0/b/cris-ordem-paranormal.appspot.com/o/";
  var MAX_FOTO = 15 * 1024 * 1024;

  function X() { return global.RAMAImportarCris; }

  function dependencias(catalogoItens, catalogoRituais) {
    return {
      F: global.RAMAFicha, R: global.RAMAOrdemRegras, C: global.RAMAOrdemCatalogo, P: global.RAMAOrdemPoderes,
      E: global.RAMAOrdemProgressao, H: global.RAMAHabilidades, ITM: global.RAMAOrdemItens, RS: global.RAMAOrdemRituais,
      U: U, V: global.RAMAValidacao, catalogoItens: catalogoItens, catalogoRituais: catalogoRituais,
    };
  }

  function nomeDoArquivo(nome) {
    var base = String(nome || "ficha").normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9 _-]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "ficha";
    return base + ".rama.json";
  }

  function baixar(texto, nome) {
    try {
      var blob = new Blob([texto], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = nome;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* abrir({ aoCriar(id, nome) }) */
  function abrir(opcoes) {
    var o = opcoes || {};
    var fechada = false;
    var sequencia = 0;
    var retrato = null;          // o que o servidor devolveu (filtrado)
    var linkDoRetrato = "";
    var decisoes = {};
    var resultado = null;        // a conversão atual
    var operacaoId = null;       // fixo por retrato
    var criando = false;
    var criada = null;           // { id, nome } depois do sucesso
    var catalogos = null;
    var mostrarTudo = false;     // a conferência abre só com o que difere

    var entrada = el("input.r-entrada", {
      type: "url", inputmode: "url", autocomplete: "off", spellcheck: "false",
      placeholder: "https://crisordemparanormal.com/agente/…",
      "aria-label": "Link público da ficha no CRIS", id: "cris-link",
    });
    var botaoConsultar = el("button.r-botao", { type: "button", texto: "Consultar ficha", onclick: consultar });
    var estado = el("p.t-mini", { role: "status", "aria-live": "polite" });
    var area = el("div.pilha", { id: "cris-resultado" });

    entrada.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); consultar(); } });
    entrada.addEventListener("input", function () {
      /* Link mudou: o retrato anterior não vale mais para este link. */
      if (retrato && U.aparar(entrada.value) !== linkDoRetrato && !criando && !criada) {
        sequencia++;
        descartar();
        mostrarEstado("O link mudou. Consulte de novo para ver a prévia.");
      }
    });

    var botaoBaixar = el("button.r-botao.r-botao--fantasma", { type: "button", texto: "Baixar JSON RAMA", disabled: true, onclick: baixarJson });
    var botaoCriar = el("button.r-botao.r-botao--principal", { type: "button", texto: "Criar ficha", disabled: true, onclick: criar });

    var m = UI.modal({
      titulo: "Importar do CRIS",
      largo: true,
      classe: "cris-modal",
      conteudo: [
        el("p", { texto: "Cole o link da ficha no CRIS. Ela precisa estar pública lá (no CRIS, compartilhar como pública). A consulta só lê: nada é criado antes de você conferir a prévia e clicar em Criar ficha." }),
        el("div.r-campo", {}, [
          el("label", { for: "cris-link", texto: "Link da ficha" }),
          el("div.faixa.cris-link", {}, [entrada, botaoConsultar]),
        ]),
        estado,
        area,
        el("p.t-mini", { texto: "Importação pontual: a ficha criada não sincroniza com o CRIS. Só o link vai ao servidor do R.A.M.A., que lê a ficha pública sem levar sua sessão ao CRIS." }),
      ],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }],
      podeFechar: function () { return !criando; },
      aoFechar: function () { fechada = true; sequencia++; retrato = null; resultado = null; },
    });
    var rodape = m.janela.querySelector(".r-modal__rodape");
    rodape.appendChild(botaoBaixar);
    rodape.appendChild(botaoCriar);

    function mostrarEstado(texto, erro) {
      estado.textContent = texto || "";
      estado.className = "t-mini" + (erro ? " t-erro" : "");
    }

    function descartar() {
      retrato = null; resultado = null; decisoes = {}; operacaoId = null; linkDoRetrato = "";
      U.limpar(area);
      atualizarBotoes();
    }

    async function consultar() {
      if (criando || criada) return;
      var link = X().validarLink(entrada.value);
      if (!link.ok) { descartar(); mostrarEstado(link.mensagem, true); entrada.focus(); return; }
      var minha = ++sequencia;
      descartar();
      botaoConsultar.disabled = true;
      botaoConsultar.setAttribute("aria-busy", "true");
      mostrarEstado("Consultando o CRIS…");
      try {
        var r = await global.RAMAApi.lerFichaCris(link.url);
        if (fechada || minha !== sequencia) return;
        if (!r || !r.ok) { mostrarEstado(X().mensagemDeErro(r), true); return; }
        mostrarEstado("Preparando a conversão…");
        if (!catalogos) {
          var cats = await Promise.all([global.RAMAOrdemItens.carregar(), global.RAMAOrdemRituais.carregar()]);
          catalogos = { itens: cats[0], rituais: cats[1] };
        }
        if (fechada || minha !== sequencia) return;
        retrato = r.dados;
        linkDoRetrato = U.aparar(entrada.value);
        operacaoId = global.RAMAApi.novaOperacao();
        converter();
        mostrarEstado(resultado && resultado.ok ? "Prévia pronta. Confira as decisões e diferenças antes de criar." : "A ficha não pôde ser convertida.", !(resultado && resultado.ok));
      } catch (e) {
        if (fechada || minha !== sequencia) return;
        console.error("[R.A.M.A. · CRIS] falha na consulta", e && e.message);
        mostrarEstado(catalogos ? "Não foi possível consultar a ficha agora." : "Os catálogos do R.A.M.A. não carregaram. Recarregue a página e tente de novo.", true);
      } finally {
        if (minha === sequencia) {
          botaoConsultar.disabled = false;
          botaoConsultar.removeAttribute("aria-busy");
        }
      }
    }

    function converter(focoChave) {
      try {
        resultado = X().converter(retrato, decisoes, dependencias(catalogos.itens, catalogos.rituais));
      } catch (e) {
        console.error("[R.A.M.A. · CRIS] falha na conversão", e && e.message);
        resultado = { ok: false, bloqueado: true, avisos: [{ codigo: "conversao", gravidade: "erro", texto: "A conversão falhou. A importação por arquivo continua disponível." }], pendencias: [], comparacao: [], preservadosComoTexto: [] };
      }
      desenhar();
      if (focoChave) {
        var alvo = area.querySelector('[data-chave="' + focoChave.replace(/"/g, "") + '"]');
        if (alvo) alvo.focus();
      }
    }

    function atualizarBotoes() {
      var pronto = !!(resultado && resultado.ok && !resultado.bloqueado);
      var revisou = !area.querySelector("#cris-revisei") || area.querySelector("#cris-revisei").checked;
      botaoBaixar.disabled = !pronto || criando;
      botaoCriar.disabled = !pronto || !revisou || criando || !!criada;
      botaoCriar.hidden = !!criada;
    }

    /* ------------------------------------------------------------ prévia */

    function desenhar() {
      U.limpar(area);
      if (!resultado) return;
      var r = resultado;
      var erros = r.avisos.filter(function (a) { return a.gravidade === "erro"; });
      if (erros.length) {
        area.appendChild(UI.painel("Não dá para importar", el("ul.pilha.pilha--curta", {}, erros.map(function (a) { return el("li.t-erro", { texto: a.texto }); }))));
        atualizarBotoes();
        return;
      }
      area.appendChild(resumo(r));
      if (r.pendencias.length) area.appendChild(revisao(r));
      area.appendChild(comparacao(r));
      var rol = (r.itens || []).filter(function (i) { return i.rolagens; });
      if (rol.length) area.appendChild(UI.painel("Ataques", el("ul.pilha.pilha--curta", {}, rol.map(function (i) {
        return el("li", { texto: i.nome + ": dano " + i.rolagens.normal + " · crítico " + i.rolagens.criticoRama +
          (i.rolagens.criticoCris !== i.rolagens.criticoRama ? " (no CRIS, " + i.rolagens.criticoCris + ")" : "") });
      }))));
      area.appendChild(avisos(r));
      if (r.preservadosComoTexto.length) {
        area.appendChild(el("details.cris-detalhes", {}, [
          el("summary", { texto: "Preservado como texto (" + r.preservadosComoTexto.length + ")" }),
          el("p.t-mini", { texto: "Vai para a pasta “Importado do CRIS” nas Anotações, sem efeito de conta." }),
          el("ul.pilha.pilha--curta", {}, r.preservadosComoTexto.map(function (p) { return el("li", { texto: p.titulo }); })),
        ]));
      }
      area.appendChild(foto());
      area.appendChild(confirmacao(r));
      atualizarBotoes();
    }

    function resumo(r) {
      var s = r.resumo;
      var a = s.atributos;
      function rec(n, v) { return v ? n + " " + (v[0] === null ? "—" : v[0]) + "/" + v[1] : null; }
      var pares = [
        ["Nome", s.nome],
        ["Classe", s.classe],
        ["Origem", s.origem],
        ["Trilha", s.trilha],
        ["Progressão", s.progressao],
        ["Atributos", "FOR " + a.for + " · AGI " + a.agi + " · INT " + a.int + " · PRE " + a.pre + " · VIG " + a.vig],
        ["Recursos", [rec("PV", s.recursos.pv), rec("PE", s.recursos.pe), rec("SAN", s.recursos.san) + (s.semSanidade ? " (guardada; a regra usa PD)" : ""), rec("PD", s.recursos.pd)].filter(Boolean).join(" · ")],
        ["Defesas", "Defesa " + s.defesa + " · bloqueio " + s.bloqueio + " · esquiva " + s.esquiva],
        ["Conteúdo", s.itens + " itens · " + s.poderes + " poderes e habilidades · " + s.rituais + " rituais"],
        ["Leitura", (retrato && retrato.fonte && retrato.fonte.lidoEm ? new Date(retrato.fonte.lidoEm).toLocaleString("pt-BR") : "—") + " · " + X().ADAPTADOR],
      ];
      return UI.painel("Prévia", el("dl.r-dados", {}, pares.reduce(function (saida, p) {
        return saida.concat([el("dt", { texto: p[0] }), el("dd", { texto: String(p[1] === undefined || p[1] === null ? "—" : p[1]) })]);
      }, [])));
    }

    function revisao(r) {
      var lista = el("div.pilha.pilha--curta");
      r.pendencias.forEach(function (p) {
        var id = "cris-dec-" + p.chave.replace(/[^A-Za-z0-9_-]/g, "_");
        var bloco = el("div.r-campo.cris-decisao");
        if (p.reconhecer || p.opcoes.length < 2) {
          bloco.appendChild(el("p.cris-decisao__titulo", { texto: p.rotulo }));
          bloco.appendChild(el("p.t-mini", { texto: p.texto }));
        } else {
          var sel = el("select.r-selecao", { id: id, dataset: { chave: p.chave } }, p.opcoes.map(function (op) {
            return el("option", { value: op.valor, texto: op.rotulo, selected: op.valor === p.valor });
          }));
          sel.value = p.valor;
          sel.addEventListener("change", function () {
            if (criando || criada) return;
            decisoes[p.chave] = sel.value;
            converter(p.chave);
          });
          bloco.appendChild(el("label", { for: id, texto: p.rotulo }));
          bloco.appendChild(el("p.t-mini", { texto: p.texto }));
          bloco.appendChild(sel);
        }
        lista.appendChild(bloco);
      });
      return UI.painel("Decisões para revisar (" + r.pendencias.length + ")", el("div.pilha", {}, [
        el("p.t-mini", { texto: "Cada uma já vem com a opção mais segura. Trocar refaz a prévia; nada é gravado." }),
        lista,
      ]));
    }

    /* A conferência: cada valor que o CRIS mostra, relido na ficha que
       será criada e depois de exportar e importar. Abre só com o que
       difere; "Mostrar tudo" traz também os iguais. */
    var SITUACOES = {
      divergente: { rotulo: "Divergente", classe: "cris-situacao--divergente" },
      regra: { rotulo: "Regra do R.A.M.A.", classe: "cris-situacao--regra" },
      ajustado: { rotulo: "Ajustado", classe: "cris-situacao--ajustado" },
      conferencia: { rotulo: "Para conferir", classe: "cris-situacao--conferir" },
      igual: { rotulo: "Igual", classe: "cris-situacao--igual" },
    };
    var ORDEM_SITUACAO = ["divergente", "regra", "ajustado", "conferencia", "igual"];
    var GRUPOS = ["Identidade", "Atributos", "Recursos", "Defesas", "Perícias", "Carga", "Itens", "Ataques", "Rituais", "Poderes", "Contagens"];

    function comparacao(r) {
      var cf = r.conferencia || {};
      var todas = r.comparacao || [];
      var visiveis = todas.filter(function (l) { return mostrarTudo || l.situacao !== "igual"; });
      var porGrupo = {};
      visiveis.forEach(function (l) { (porGrupo[l.grupo] = porGrupo[l.grupo] || []).push(l); });
      var grupos = GRUPOS.filter(function (g) { return porGrupo[g]; }).concat(Object.keys(porGrupo).filter(function (g) { return GRUPOS.indexOf(g) < 0; }));

      var contagem = el("ul.cris-contagem", { "aria-label": "Resumo da conferência" }, ORDEM_SITUACAO.filter(function (k) { return cf[k]; }).map(function (k) {
        return el("li", { class: "cris-situacao " + SITUACOES[k].classe, texto: SITUACOES[k].rotulo + ": " + cf[k] });
      }));
      var cabecalho = el("p.t-mini", { texto: (cf.total || todas.length) + " valores conferidos na ficha que será criada" +
        (cf.arquivo ? ", e de novo depois de exportar e importar o arquivo." : ".") +
        (cf.divergente ? " Há valores que não saem como o esperado: confira as linhas “Divergente”." : " Nenhum valor diverge.") });
      var alternar = el("button.r-botao.r-botao--mini.r-botao--fantasma", { type: "button", "aria-pressed": mostrarTudo ? "true" : "false",
        texto: mostrarTudo ? "Mostrar só o que difere" : "Mostrar tudo (" + todas.length + ")",
        onclick: function () { mostrarTudo = !mostrarTudo; desenhar(); var b = area.querySelector("[data-alternar-conferencia]"); if (b) b.focus(); } });
      alternar.setAttribute("data-alternar-conferencia", "1");

      var corpo = [];
      grupos.forEach(function (g) {
        var linhas = porGrupo[g].slice().sort(function (a, b) { return ORDEM_SITUACAO.indexOf(a.situacao) - ORDEM_SITUACAO.indexOf(b.situacao); });
        corpo.push(el("tr.cris-tabela__grupo", {}, [el("th", { scope: "colgroup", colspan: "6", texto: g + " (" + linhas.length + ")" })]));
        linhas.forEach(function (l) {
          var sit = SITUACOES[l.situacao] || SITUACOES.conferencia;
          corpo.push(el("tr", { class: l.situacao === "igual" ? "cris-tabela__igual" : (l.situacao === "divergente" ? "cris-tabela__divergente" : "") }, [
            el("th", { scope: "row", texto: l.campo }),
            el("td", { dataset: { rotulo: "CRIS" }, texto: valor(l.cris) }),
            el("td", { dataset: { rotulo: "R.A.M.A. calcula" }, texto: valor(l.rama) }),
            el("td", { dataset: { rotulo: "Na ficha criada" }, texto: valor(l.final) + (l.ajuste ? " (ajuste " + (l.ajuste > 0 ? "+" : "") + l.ajuste + ")" : "") }),
            el("td", { dataset: { rotulo: "Situação" } }, [el("span", { class: "cris-situacao " + sit.classe, texto: sit.rotulo })]),
            el("td", { dataset: { rotulo: "Motivo" }, texto: l.problema ? l.problema + " — " + l.motivo : l.motivo }),
          ]));
        });
      });
      if (!corpo.length) corpo.push(el("tr", {}, [el("td", { colspan: "6", texto: "Todos os valores conferidos batem com o CRIS." })]));

      var tabela = el("table.cris-tabela", {}, [
        el("caption.so-leitor", { texto: "Conferência entre o CRIS e a ficha que será criada no R.A.M.A." }),
        el("thead", {}, [el("tr", {}, ["Campo", "CRIS", "R.A.M.A. calcula", "Na ficha criada", "Situação", "Motivo"].map(function (t) { return el("th", { scope: "col", texto: t }); }))]),
        el("tbody", {}, corpo),
      ]);
      return UI.painel("Conferência CRIS × R.A.M.A.", el("div.pilha.pilha--curta", {}, [
        cabecalho,
        contagem,
        el("div.faixa", {}, [alternar]),
        el("div.cris-tabela__rolagem", { tabindex: "0", role: "region", "aria-label": "Conferência de valores" }, [tabela]),
      ]));
    }

    function valor(v) { return v === null || v === undefined ? "—" : String(v); }

    function avisos(r) {
      var rev = r.avisos.filter(function (a) { return a.gravidade === "revisao"; });
      var info = r.avisos.filter(function (a) { return a.gravidade === "informacao"; });
      var partes = [];
      if (rev.length) partes.push(el("div.pilha.pilha--curta", {}, [
        el("p.cris-decisao__titulo", { texto: "Para conferir (" + rev.length + ")" }),
        el("ul.pilha.pilha--curta", {}, rev.map(function (a) { return el("li", { texto: a.texto }); })),
      ]));
      if (info.length) partes.push(el("details.cris-detalhes", {}, [
        el("summary", { texto: "Informações (" + info.length + ")" }),
        el("ul.pilha.pilha--curta", {}, info.map(function (a) { return el("li.t-mini", { texto: a.texto }); })),
      ]));
      if (!partes.length) partes.push(el("p.t-mini", { texto: "Nenhum aviso." }));
      return UI.painel("Avisos", el("div.pilha", {}, partes));
    }

    function urlDaFoto() {
      var u = retrato && retrato.ficha && retrato.ficha.sheetPictureURL;
      return typeof u === "string" && u.indexOf(PREFIXO_FOTO) === 0 && u.length < 2048 ? u : "";
    }

    function foto() {
      if (!urlDaFoto() || !global.RAMAImagem) return el("span");
      return el("label.cris-check", {}, [
        el("input", { type: "checkbox", id: "cris-foto", checked: true }),
        el("span", { texto: " Trazer a foto da ficha (opcional; se o CRIS não permitir a cópia, a ficha é criada sem foto)." }),
      ]);
    }

    function confirmacao(r) {
      var precisa = r.pendencias.length || r.avisos.some(function (a) { return a.gravidade === "revisao"; });
      if (!precisa) return el("span");
      var caixa = el("input", { type: "checkbox", id: "cris-revisei" });
      caixa.addEventListener("change", atualizarBotoes);
      return el("label.cris-check.cris-check--forte", {}, [
        caixa,
        el("span", { texto: " Revisei as decisões, as diferenças e os avisos acima." }),
      ]);
    }

    /* ------------------------------------------------------------ ações */

    function baixarJson() {
      if (!resultado || !resultado.ok) return;
      var pacote = global.RAMAValidacao.exportar("personagem", resultado.ficha);
      var ok = baixar(JSON.stringify(pacote, null, 2), nomeDoArquivo(resultado.ficha.nome));
      if (ok) UI.avisoOk("Arquivo gerado. Ele importa pelo botão Importar ficha, como qualquer exportação do R.A.M.A.");
      else UI.avisoAtencao("Não foi possível gerar o arquivo neste navegador.");
    }

    async function criar() {
      if (criando || criada || !resultado || !resultado.ok) return;
      criando = true;
      atualizarBotoes();
      area.querySelectorAll("select, input").forEach(function (c) { c.disabled = true; });
      botaoCriar.setAttribute("aria-busy", "true");
      botaoCriar.textContent = "Criando…";
      mostrarEstado("Criando a ficha…");
      var querFoto = !!(area.querySelector("#cris-foto") && area.querySelector("#cris-foto").checked);
      var r;
      try {
        r = await global.RAMAApi.criarPersonagem(resultado.ficha, operacaoId);
      } catch (e) {
        r = { ok: false, erro: "rede" };
      }
      botaoCriar.removeAttribute("aria-busy");
      botaoCriar.textContent = "Criar ficha";
      if (!r || !r.ok) {
        criando = false;
        area.querySelectorAll("select, input").forEach(function (c) { c.disabled = false; });
        atualizarBotoes();
        mostrarEstado("A ficha não foi criada. Tentar de novo usa a mesma operação: se a primeira tentativa chegou ao servidor, nada é duplicado.", true);
        UI.avisoDeFalha(r, "importação do CRIS");
        return;
      }
      criada = { id: r.dados.id, nome: resultado.ficha.nome };
      criando = false;
      atualizarBotoes();
      var abrirFicha = function () { location.href = U.url("ficha/?id=" + encodeURIComponent(criada.id)); };
      U.trocar(area, UI.painel("Ficha criada", el("div.pilha", {}, [
        el("p", { texto: criada.nome + " está na sua conta." }),
        el("p.t-mini", { id: "cris-foto-estado", texto: querFoto ? "Trazendo a foto…" : "" }),
        el("div.faixa", {}, [el("button.r-botao.r-botao--principal", { type: "button", texto: "Abrir ficha", onclick: abrirFicha })]),
      ])));
      mostrarEstado("Ficha criada.");
      botaoBaixar.disabled = false;
      if (o.aoCriar) o.aoCriar(criada.id, criada.nome);
      UI.avisoOk(criada.nome + " foi importado do CRIS.", { acao: { rotulo: "Abrir ficha", aoClicar: abrirFicha } });
      if (querFoto) {
        var texto = await trazerFoto(criada.id);
        var alvo = document.getElementById("cris-foto-estado");
        if (alvo) alvo.textContent = texto;
      }
    }

    /* A foto é opcional e vem depois: falhar aqui não desfaz a ficha nem
       repete a criação. O pedido ao armazenamento do CRIS vai sem
       credenciais e sem referer. */
    async function trazerFoto(id) {
      var url = urlDaFoto();
      if (!url) return "";
      try {
        var resp = await fetch(url, { method: "GET", credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store", redirect: "error", mode: "cors" });
        if (!resp.ok) return "A foto não veio (o CRIS respondeu " + resp.status + "). Adicione pela ficha, se quiser.";
        var blob = await resp.blob();
        if (!blob.size || blob.size > MAX_FOTO || !/^image\//.test(blob.type || "")) return "A foto do CRIS não é uma imagem aceita. Adicione pela ficha, se quiser.";
        var prep = await global.RAMAImagem.preparar(blob);
        if (!prep || !prep.ok) return (prep && prep.mensagem) || "A foto não pôde ser preparada. Adicione pela ficha, se quiser.";
        var s = await global.RAMAApi.salvarFoto(id, prep.imagem);
        return s && s.ok ? "Foto trazida do CRIS." : "A ficha foi criada, mas a foto não foi gravada. Adicione pela ficha, se quiser.";
      } catch (e) {
        return "O CRIS não permite copiar a foto por este navegador. A ficha foi criada sem foto; adicione pela ficha, se quiser.";
      }
    }

    return m;
  }

  global.RAMAImportarCrisTela = { abrir: abrir };
})(typeof window !== "undefined" ? window : globalThis);
