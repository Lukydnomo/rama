/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II · telas dos procedimentos (v9.1)
   ---------------------------------------------------------------------
   As peças de tela do quadro de investigação, dos desafios, das
   ferramentas, das tabelas por rodada e dos encontros — as do Mestre
   (na mesa da campanha) e as de quem joga (na ficha e na mesa). Cada
   botão chama `operar(op)`: a MESMA porta de sempre (ordem2_operar no
   servidor, com opId). Nada aqui decide regra: o motor decide.

     RAMAOrdem2ProcTela.mestre.cena(m)       pacote, cena, rodada, presentes
     RAMAOrdem2ProcTela.mestre.quadro(m)     pontos, pistas, anexos, itens, flags
     RAMAOrdem2ProcTela.mestre.desafios(m)   cada desafio com o segredo à vista
     RAMAOrdem2ProcTela.mestre.encontro(m)   tabelas, ferramentas, ondas,
                                             perseguição, esconderijo, efeitos
     RAMAOrdem2ProcTela.jogador(m)           pontos com desafios, ferramentas,
                                             laboratório, compêndio, anexos,
                                             itens, perseguição, esconderijo

   m = { estado, mestre, pcs: [{id, nome, meu}], meus: [pid], operar,
         cena (só o Mestre), pacotes (só o Mestre), redesenhar }
   ===================================================================== */
(function (global) {
  "use strict";
  var U = global.RAMAUtil, UI = global.RAMAUI, el = U.el;
  function K() { return global.RAMAOrdem2Catalogo; }
  function R() { return global.RAMAOrdem2; }
  function A() { return global.RAMAOrdem2Ameacas; }
  function T() { return global.RAMAOrdem2Tela; }
  function lista(v) { return Array.isArray(v) ? v : []; }
  function botao(t, fn, o) { return T().botao(t, fn, o); }
  function linha(t) { return el("p.t-mini", { texto: t }); }
  function etiqueta(t, tipo) { return el("span.r-etiqueta" + (tipo ? ".r-etiqueta--" + tipo : ""), { texto: t }); }
  function nomePc(m, pid) { var p = m.pcs.filter(function (x) { return x.id === pid; })[0]; return p ? p.nome : (pid ? "?" : "—"); }
  function opcoesPcs(m, vazio) { return (vazio ? [{ valor: "", rotulo: vazio }] : []).concat(m.pcs.map(function (p) { return { valor: p.id, rotulo: p.nome }; })); }
  function nomePericia(e, k) { if (k === "mestre") return "Revelação do Mestre"; var c = String(k).split(":"); return K().nomeDaPericia(e.perfil, c[0], e.ambientacao) + (c[1] ? " (" + c[1] + ")" : ""); }
  function proc(e) { return e.proc || {}; }
  function rodada(e) { return e.combate && e.combate.ativo && e.perfil !== "alpha-contemporaneo" ? e.combate.rodada : proc(e).rodada || 1; }
  function nomeFerramenta(f) { return (K().FERRAMENTAS[f] || { nome: f }).nome; }
  function desafiosDoPonto(e, p) { return lista(proc(e).desafios).filter(function (d) { return d.ponto === p.id || lista(p.desafios).indexOf(d.id) >= 0; }); }
  function pontoNome(e, pid) { var p = lista(e.investigacao.pontos).filter(function (x) { return x.id === pid; })[0]; return p ? (p.numero ? p.numero + ". " : "") + p.nome : pid; }

  /* ===================================================================
     MESTRE · cena, rodada e pacote
     =================================================================== */
  function cenaDoMestre(m) {
    var e = m.estado, p = proc(e);
    var atual = p.pacote && p.pacote.id && m.pacotes.some(function (q) { return q.id === p.pacote.id; }) ? p.pacote : null;
    var st = { pacote: atual ? atual.id : (m.pacotes[0] || {}).id || "", cena: "", jogadores: p.jogadores || "", presentes: lista(p.presentes).slice() };
    function cenasDe(id) { var x = m.pacotes.filter(function (q) { return q.id === id; })[0]; return x ? x.cenas : []; }
    st.cena = atual && atual.cena ? atual.cena : (cenasDe(st.pacote)[0] || {}).id || "";
    var seletorCena = el("span");
    function pintarCenas() {
      U.trocar(seletorCena, [UI.campo({ rotulo: "Cena", tipo: "selecao", valor: st.cena, opcoes: cenasDe(st.pacote).map(function (c) { return { valor: c.id, rotulo: c.nome }; }), aoMudar: function (v) { st.cena = v; } })]);
    }
    pintarCenas();
    return UI.painel("Cena da missão" + (p.pacote && p.pacote.nome ? ": " + p.pacote.nome : ""), el("div.pilha", {}, [
      m.pacotes.length ? el("div.o2-criar__campos", {}, [
        UI.campo({ rotulo: "Pacote (conteúdo do Mestre, no servidor)", tipo: "selecao", valor: st.pacote, opcoes: m.pacotes.map(function (x) { return { valor: x.id, rotulo: x.nome }; }), aoMudar: function (v) { st.pacote = v; st.cena = (cenasDe(v)[0] || {}).id || ""; pintarCenas(); } }),
        seletorCena,
        botao("Carregar a cena", function () {
          UI.confirmar({ titulo: "Carregar a cena do pacote", texto: "Começa a cena do zero: desafios, itens, tabelas e ferramentas da cena; os pontos chegam ocultos ou anunciados conforme o pacote. Descobertas já dadas continuam. Marque se é um ato que herda os desafios resolvidos do anterior.", rotuloConfirmar: "Carregar" }).then(function (s) { if (s) m.operar({ tipo: "carregarCena", pacote: st.pacote, cena: st.cena, jogadores: st.jogadores ? Number(st.jogadores) : 0, manterFlags: !!st.manter }); });
        }, { classe: "r-botao--principal" }),
        el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { st.manter = ev.currentTarget.checked; } }), el("span", { texto: "Herdar flags do ato anterior (Alpha p. 81)" })]),
      ]) : linha("Nenhum pacote de missão neste servidor (o arquivo Ordem2Pacotes é do Apps Script e não vem com o site). Use os pontos próprios no quadro."),
      p.pacote && p.pacote.cena ? el("div.faixa", {}, [
        etiqueta("Rodada " + rodada(e) + " da cena"),
        botao("Encerrar a rodada " + rodada(e), function () { m.operar({ tipo: "encerrarRodada", rodada: rodada(e) }); }, { classe: "r-botao--principal", rotulo: "Encerrar a rodada " + rodada(e) + ": aplica sobrecarga, sustentar, perseguição e esconderijo uma vez" }),
        botao("Descarregar a cena", function () { m.operar({ tipo: "descarregarCena" }); }, { classe: "r-botao--fantasma" }),
      ]) : el("div.faixa", {}, [etiqueta("Rodada " + rodada(e)), botao("Encerrar a rodada " + rodada(e), function () { m.operar({ tipo: "encerrarRodada", rodada: rodada(e) }); })]),
      el("div.o2-criar__campos", {}, [
        UI.campo({ rotulo: "Jogadores na mesa (3, 4, 5…) — muda as pistas por número", tipo: "numero", valor: String(st.jogadores || ""), aoMudar: function (v) { st.jogadores = v; } }),
        botao("Salvar", function () { m.operar({ tipo: "configurarCena", jogadores: st.jogadores ? Number(st.jogadores) : 0, presentes: st.presentes }); }),
      ]),
      el("div.faixa", { "aria-label": "Quem está na cena (efeitos em grupo e tabelas)" }, m.pcs.map(function (pc) {
        return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: !st.presentes.length || st.presentes.indexOf(pc.id) >= 0, onchange: function (ev) { st.presentes = (st.presentes.length ? st.presentes : m.pcs.map(function (x) { return x.id; })).filter(function (x) { return x !== pc.id; }); if (ev.currentTarget.checked) st.presentes.push(pc.id); } }), el("span", { texto: pc.nome })]);
      })),
      roteiro(m),
    ]));
  }
  function roteiro(m) {
    var c = m.cena;
    if (!c || !lista(c.roteiro).length) return null;
    return UI.recolhivel({ titulo: "Roteiro da cena (só o Mestre)", conteudo: el("ul.pilha.pilha--curta", {}, c.roteiro.map(function (x) { return el("li.t-mini" + (x.rodada === rodada(m.estado) ? ".o2-destaque" : ""), { texto: (x.etapa ? "[" + x.etapa + "] " : "") + "Rodada " + x.rodada + ": " + x.texto }); })) });
  }

  /* ===================================================================
     MESTRE · o quadro
     =================================================================== */
  function quadroDoMestre(m, editar) {
    var e = m.estado, p = proc(e);
    var desc = e.investigacao.descobertas || {};
    var pontos = e.investigacao.pontos.slice().sort(function (a, b) { return (parseFloat(a.numero) || 999) - (parseFloat(b.numero) || 999); });
    var areas = m.cena ? m.cena.areas : [];
    var grupos = areas.length ? areas.map(function (a) { return { id: a.id, nome: a.nome, pontos: pontos.filter(function (x) { return x.area === a.id; }) }; }).concat([{ id: "", nome: "Sem área", pontos: pontos.filter(function (x) { return !areas.some(function (a) { return a.id === x.area; }); }) }]) : [{ id: "", nome: "", pontos: pontos }];
    return el("div.pilha", {}, [
      solicitacoesComPista(m),
      el("div.pilha.o2-quadro", {}, grupos.filter(function (g) { return g.pontos.length; }).map(function (g) {
        return el("section.pilha", {}, [g.nome ? el("h3.t-secao", { texto: g.nome }) : null].concat(g.pontos.map(function (pt) { return pontoDoQuadro(m, pt, desc, editar); })));
      })),
      grupoEanexos(m),
      itensEflags(m),
    ]);
  }
  function pontoDoQuadro(m, pt, desc, editar) {
    var e = m.estado;
    var st = { para: (m.pcs[0] || {}).id || "" };
    var pistas = pt.pistas.slice().sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); });
    return el("article.o2-ponto" + (pt.revelado ? "" : ".o2-ponto--oculto"), { "aria-label": pt.nome }, [
      el("header.o2-ponto__cab", {}, [
        el("h4.o2-ponto__nome", { texto: (pt.numero ? pt.numero + ". " : "") + pt.nome }),
        etiqueta(pt.revelado ? "anunciado" : "oculto", pt.revelado ? "ok" : "aviso"),
        pt.origem === "pacote" ? etiqueta(pt.editado ? "pacote (editado)" : "pacote") : null,
        botao(pt.revelado ? "Ocultar" : "Anunciar", function () { m.operar({ tipo: "revelarPonto", id: pt.id, revelado: !pt.revelado }); }, { classe: pt.revelado ? "" : "r-botao--principal" }),
        editar ? botao("Editar", function () { editar(pt); }) : null,
      ]),
      el("p", { texto: pt.descricao }),
      pistas.length ? el("div.o2-tabela-rolagem", {}, [el("table.o2-pistas", {}, [el("thead", {}, [el("tr", {}, ["Perícia", "DT", "Informação", "Quem tem", ""].map(function (h) { return el("th", { texto: h }); }))]), el("tbody", {}, pistas.map(function (q) {
        var quem = Object.keys(desc).filter(function (pid) { return desc[pid].some(function (d) { return d.pista === q.id; }); }).map(function (pid) { return nomePc(m, pid); });
        var doGrupo = lista(proc(e).grupo).some(function (d) { return d.pista === q.id; });
        var marcas = [q.requer && q.requer.length ? "requer: " + q.requer.join(", ") : "", q.restricao ? "só " + q.restricao : "", q.jogadores && q.jogadores.length ? q.jogadores.join("/") + " jogadores" : "", q.anexo ? "anexo" : "", q.dtSe ? "DT " + q.dtSe.dt + " se " + q.dtSe.flag : "", lista(q.concede).length ? "→ " + q.concede.join(", ") : ""].filter(Boolean).join(" · ");
        return el("tr", {}, [
          el("td", { texto: q.pericias.map(function (k) { return nomePericia(e, k); }).join(" ou ") }),
          el("td", { texto: q.pericias[0] === "mestre" ? "—" : String(q.dt) }),
          el("td", {}, [el("span", { texto: q.texto }), marcas ? el("span.t-mini.o2-pista__marcas", { texto: " (" + marcas + ")" }) : null]),
          el("td", { texto: doGrupo ? "grupo" : (quem.join(", ") || "—") }),
          el("td", {}, [botao("Revelar…", function () { revelarPista(m, pt, q); }, { rotulo: "Revelar esta pista" })]),
        ]);
      }))])]) : linha("Sem quadro de informações."),
      ferramentasDoPonto(pt),
      desafiosDoPonto(e, pt).length ? el("p.t-mini", { texto: "Desafios: " + desafiosDoPonto(e, pt).map(function (d) { return d.nome + " (" + d.estado + ")"; }).join(" · ") }) : null,
      pt.contextual ? el("p.o2-privado", { texto: "Contexto (só o Mestre): " + pt.contextual }) : null,
      pt.notaPrivada ? el("p.o2-privado", { texto: "Nota privada: " + pt.notaPrivada }) : null,
    ]);
  }
  function ferramentasDoPonto(pt) {
    var f = pt.ferramentas || {};
    var ks = Object.keys(f);
    if (!ks.length && !pt.normal) return null;
    return UI.recolhivel({ titulo: "Ferramentas" + (pt.normal ? " (todas: leitura normal)" : ""), conteudo: el("ul.pilha.pilha--curta", {}, ks.map(function (k) {
      var x = f[k] || {};
      var partes = [x.texto, x.sequencia ? "sequência " + x.sequencia : (k === "laboratorio" && x.sequencia === null ? "sequência não impressa" : ""), x.padrao ? "bips " + x.padrao : "", x.anexo ? "anexo " + x.anexo : "", x.solucao ? "solução: " + x.solucao : "", x.falsos ? "falsos: " + x.falsos.join(", ") : "", x.requer ? "requer " + [].concat(x.requer).join(", ") : "", x.nota || ""].filter(Boolean);
      return el("li.t-mini", {}, [el("strong", { texto: nomeFerramenta(k) + ": " }), el("span", { texto: partes.join(" · ") })]);
    })) });
  }
  function revelarPista(m, pt, q) {
    var st = { para: [], grupo: false };
    UI.modal({ titulo: "Revelar: " + pt.nome, classe: "o2-janela", conteudo: [el("div.pilha", {}, [
      el("p", { texto: q.texto }),
      q.anexo ? linha("Com o anexo " + q.anexo + " (liberado só para quem receber).") : null,
      el("div.faixa", {}, m.pcs.map(function (p) { return el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { st.para = st.para.filter(function (x) { return x !== p.id; }); if (ev.currentTarget.checked) st.para.push(p.id); } }), el("span", { texto: p.nome })]); }).concat([el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { st.grupo = ev.currentTarget.checked; } }), el("span", { texto: "Para o grupo todo" })])])),
    ])], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Revelar", classe: "r-botao--principal", aoClicar: function (f) { f(); m.operar({ tipo: "revelarPista", ponto: pt.id, pista: q.id, para: st.grupo ? "grupo" : st.para, como: "Mestre" }); } }] });
  }
  /* Recapitular, Compartilhar, Interagir: o Mestre escolhe a pista NOVA. */
  function solicitacoesComPista(m) {
    var e = m.estado;
    var prontas = e.investigacao.solicitacoes.filter(function (s) { return !s.concedida && (s.estado === "sucesso" || (s.tipo === "interagir" && ["pendente", "resolvida"].indexOf(s.estado) >= 0)); });
    if (!prontas.length) return null;
    return UI.painel("Escolher a pista nova", el("ul.o2-solicitacoes", {}, prontas.map(function (s) {
      var quem = s.tipo === "compartilhar" ? s.aliado : s.quem;
      var st = { chave: "", texto: "" };
      var opcoes = [{ valor: "", rotulo: "— pista livre (escreva abaixo) —" }];
      e.investigacao.pontos.forEach(function (pt) { pt.pistas.forEach(function (q) { var ja = lista((e.investigacao.descobertas || {})[quem]).some(function (d) { return d.pista === q.id; }) || lista(proc(e).grupo).some(function (d) { return d.pista === q.id; }); if (!ja) opcoes.push({ valor: pt.id + "|" + q.id, rotulo: (pt.numero ? pt.numero + ". " : "") + pt.nome + " — " + q.texto.slice(0, 70) }); }); });
      return el("li.o2-solicitacao", {}, [
        el("strong", { texto: { recapitular: "Recapitular", compartilhar: "Compartilhar", interagir: "Interagir" }[s.tipo] + " — " + nomePc(m, quem) + (s.descricao ? ": " + s.descricao.slice(0, 160) : "") }),
        UI.campo({ rotulo: "Pista do quadro (só as que " + nomePc(m, quem) + " ainda não tem)", tipo: "selecao", valor: "", opcoes: opcoes, aoMudar: function (v) { st.chave = v; } }),
        UI.campo({ rotulo: "Ou uma pista livre", tipo: "area", linhas: 2, limite: 1200, aoMudar: function (v) { st.texto = v; } }),
        botao("Dar a pista (confirma a coerência)", function () { var c = st.chave.split("|"); m.operar({ tipo: "concederPista", solicitacao: s.id, ponto: c[0] || "", pista: c[1] || "", texto: st.texto }); }, { classe: "r-botao--principal" }),
      ]);
    })));
  }
  function grupoEanexos(m) {
    var e = m.estado, p = proc(e), c = m.cena;
    var anexos = c ? lista(c.anexos) : [];
    return el("div.pilha", {}, [
      lista(p.grupo).length ? UI.recolhivel({ titulo: "Pistas do grupo (" + p.grupo.length + ")", conteudo: el("ul.pilha.pilha--curta", {}, p.grupo.map(function (d) { return el("li.t-mini", { texto: d.texto + " — " + d.como }); })) }) : null,
      anexos.length ? UI.recolhivel({ titulo: "Anexos e handouts (" + anexos.length + ")", conteudo: el("div.pilha", {}, [
        linha("O arquivo não vem com o site: ligue cada anexo a um documento da campanha (aba Documentos, visível a ninguém) ou a um link seu. Quando alguém receber a pista com o anexo, o documento passa a aparecer para essa pessoa."),
        el("ul.pilha.pilha--curta", {}, anexos.map(function (a) {
          var lig = p.anexos[a.id] || {};
          var st = { documentoId: lig.documentoId || "", url: lig.url || "", descricao: lig.descricao || "" };
          return el("li.o2-anexo", {}, [
            el("strong", { texto: a.nome }), " ", etiqueta(a.veio === false ? "não veio nos arquivos" : (a.arquivo ? "no ZIP: " + a.arquivo.split("/").pop() : "referência"), a.veio === false ? "aviso" : ""),
            a.alternativa ? linha("Sem o arquivo: " + a.alternativa) : null,
            el("div.o2-criar__campos", {}, [
              UI.campo({ rotulo: "Id do documento da campanha", valor: st.documentoId, limite: 80, aoMudar: function (v) { st.documentoId = v.trim(); } }),
              UI.campo({ rotulo: "Ou link (https://…)", valor: st.url, limite: 600, aoMudar: function (v) { st.url = v.trim(); } }),
              botao("Ligar", function () { m.operar({ tipo: "anexo", id: a.id, documentoId: st.documentoId, url: st.url, descricao: st.descricao }); }),
            ]),
          ]);
        })),
      ]) }) : null,
    ]);
  }
  function itensEflags(m) {
    var e = m.estado, p = proc(e);
    var st = { chave: "", personagem: "" };
    return el("div.pilha", {}, [
      lista(p.itens).length ? UI.recolhivel({ titulo: "Itens da cena (" + p.itens.length + ")", conteudo: el("ul.pilha.pilha--curta", {}, p.itens.map(function (it) {
        return el("li.o2-linha", {}, [el("span", { texto: it.nome + (it.usado ? " (usado)" : "") }), UI.campo({ rotulo: "Com", tipo: "selecao", valor: it.com || "", opcoes: opcoesPcs(m, "ninguém"), aoMudar: function (v) { m.operar({ tipo: "item", id: it.id, com: v }); } })]);
      })) }) : null,
      UI.recolhivel({ titulo: "Flags da cena (pré-requisitos)", conteudo: el("div.pilha", {}, [
        el("ul.pilha.pilha--curta", {}, Object.keys(p.flags || {}).map(function (k) { var f = p.flags[k]; return el("li.t-mini", {}, [el("span", { texto: k + ": " + (f.grupo ? "grupo" : f.pids.map(function (x) { return nomePc(m, x); }).join(", ")) }), botao("Desligar", function () { m.operar({ tipo: "flag", chave: k, valor: false }); }, { classe: "r-botao--fantasma" })]); })),
        el("div.o2-criar__campos", {}, [
          UI.campo({ rotulo: "Ligar flag", limite: 120, dica: "acesso:freezer", aoMudar: function (v) { st.chave = v.trim(); } }),
          UI.campo({ rotulo: "Para", tipo: "selecao", valor: "", opcoes: opcoesPcs(m, "o grupo"), aoMudar: function (v) { st.personagem = v; } }),
          botao("Ligar", function () { m.operar({ tipo: "flag", chave: st.chave, personagem: st.personagem || undefined }); }),
        ]),
      ]) }),
    ]);
  }

  /* ===================================================================
     MESTRE · desafios (com o segredo à vista)
     =================================================================== */
  function segredoTexto(d) {
    var s = d.segredo || {};
    if (s.senha) return "senha " + s.senha.join("-");
    if (s.resposta) return "resposta " + [].concat(s.resposta).join(" · ");
    if (s.respostas) return "respostas: " + s.respostas.map(function (r) { return [].concat(r)[0]; }).join(" · ");
    if (s.ordem) return "ordem " + s.ordem.join(" → ");
    return "";
  }
  function desafiosDoMestre(m) {
    var e = m.estado, ds = lista(proc(e).desafios);
    if (!ds.length) return UI.painel("Desafios", linha("Nenhum desafio nesta cena (carregue uma cena do pacote ou crie à mão)."));
    return el("div.pilha", {}, ds.map(function (d) {
      var st = { max: "", dt: "", pa: "", personagem: (m.pcs[0] || {}).id || "" };
      var porPc = Object.keys(d.por || {}).map(function (pid) { var x = d.por[pid]; return nomePc(m, pid) + ": " + JSON.stringify(x).replace(/["{}]/g, "").slice(0, 160); });
      return el("article.o2-desafio", { "aria-label": d.nome }, [
        el("header.o2-ponto__cab", {}, [el("h4", { texto: d.nome }), etiqueta(K().MINIJOGOS[d.tipo] ? K().MINIJOGOS[d.tipo].nome : d.tipo), etiqueta(d.estado, d.estado === "vencido" ? "ok" : d.estado === "danificado" ? "erro" : ""), etiqueta(d.publico ? "visível" : "oculto", d.publico ? "" : "aviso")]),
        d.ponto ? linha("Ponto: " + pontoNome(e, d.ponto)) : null,
        segredoTexto(d) ? el("p.o2-privado", { texto: "Segredo (só o Mestre): " + segredoTexto(d) }) : null,
        linha(resumoConfig(d)),
        porPc.length ? el("ul.pilha.pilha--curta", {}, porPc.map(function (t) { return el("li.t-mini", { texto: t }); })) : null,
        d.historico.length ? UI.recolhivel({ titulo: "Histórico (" + d.historico.length + ")", conteudo: el("ol.o2-historico", {}, d.historico.slice().reverse().map(function (h) { return el("li.t-mini", { texto: h }); })) }) : null,
        el("div.faixa", {}, [
          botao(d.publico ? "Ocultar" : "Anunciar", function () { m.operar({ tipo: "desafioMestre", id: d.id, acao: "anunciar", valor: !d.publico }); }),
          d.estado !== "vencido" ? botao("Resolver", function () { m.operar({ tipo: "desafioMestre", id: d.id, acao: "resolver" }); }) : botao("Reabrir", function () { m.operar({ tipo: "desafioMestre", id: d.id, acao: "reabrir" }); }),
          d.estado !== "danificado" && d.tipo === "destrancar" ? botao("Danificar", function () { m.operar({ tipo: "desafioMestre", id: d.id, acao: "danificar" }); }, { classe: "r-botao--fantasma" }) : null,
        ]),
        UI.recolhivel({ titulo: "Ajustar (o texto não imprime? defina aqui)", conteudo: el("div.o2-criar__campos", {}, [
          UI.campo({ rotulo: "Máx. de tentativas", tipo: "numero", aoMudar: function (v) { st.max = v; } }),
          UI.campo({ rotulo: "DT", tipo: "numero", aoMudar: function (v) { st.dt = v; } }),
          UI.campo({ rotulo: "PA / meta", tipo: "numero", aoMudar: function (v) { st.pa = v; } }),
          botao("Ajustar", function () { m.operar({ tipo: "desafioMestre", id: d.id, acao: "ajustar", config: { max: st.max, dt: st.dt, pa: d.tipo === "arrombar" ? st.pa : "", meta: d.tipo === "acumular" ? st.pa : "" } }); }),
          d.tipo === "hackSocial" ? UI.campo({ rotulo: "Aceitar uma resposta de", tipo: "selecao", valor: st.personagem, opcoes: opcoesPcs(m), aoMudar: function (v) { st.personagem = v; } }) : null,
          d.tipo === "hackSocial" ? botao("Aceitar resposta", function () { m.operar({ tipo: "desafioMestre", id: d.id, acao: "aceitarResposta", personagem: st.personagem }); }) : null,
        ]) }),
      ]);
    }));
  }
  function resumoConfig(d) {
    var c = d.config || {}, x = d.dados || {};
    if (d.tipo === "destrancar") return c.dados + "d" + c.faces + " · " + (c.max === null || c.max === undefined ? "tentativas sem limite impresso" : "máx. " + c.max) + " · usadas " + (x.total || 0) + (c.chave ? " · chave: " + c.chave : "");
    if (d.tipo === "senha") return c.digitos + " dígitos · " + (c.bloqueio ? c.bloqueio.erros + " erros bloqueiam " + c.bloqueio.rodadas + " rodada(s)" : "") + " · erros " + (x.erros || 0);
    if (d.tipo === "arrombar") return "DT " + c.dt + " · PA " + (x.pa || 0) + "/" + c.pa + " · 1 PV por tentativa" + (c.consequencia ? " · " + c.consequencia : "");
    if (d.tipo === "alcancar") return "seguro: " + ((c.seguro && c.seguro.pericia) || c.pericia || "acrobacia") + " DT " + ((c.seguro && c.seguro.dt) || c.dt) + " (duas ações) · arriscado: DT " + ((c.arriscado && c.arriscado.dt) || (Number(c.dt || 7) + 3));
    if (d.tipo === "sustentar") return "Atletismo DT " + c.dt + " · " + (x.sustentador ? "sustentando há " + (x.rodadas || 0) + " rodada(s)" : "ninguém sustentando") + (c.porRodada ? " · " + c.porRodada + " por rodada" : "");
    if (d.tipo === "equilibrio") return (c.sucessos >= 99 ? "por avanço" : c.sucessos + " sucesso(s)") + (c.falha && c.falha.dano ? " · falha: " + c.falha.dano : "");
    if (d.tipo === "acumular") return "meta " + c.meta + " · " + lista(c.modos).map(function (mo) { return mo.nome + " DT " + mo.dt; }).join(" / ");
    if (d.tipo === "travessia") return lista(c.areas).map(function (a, i) { return (i === (x.area || 0) ? "▶ " : "") + a.nome + " (" + a.meta + ")"; }).join(" → ");
    if (d.tipo === "hackTecnico") return lista(c.faixas).map(function (f) { return (f.min > -99 ? f.min : "≤" + f.max) + (f.max && f.min > -99 ? "–" + f.max : f.min > -99 ? "+" : "") + ": " + f.problema + " (" + f.segundos + " s)"; }).join(" · ");
    if (d.tipo === "hackSocial") return "DT " + (c.dt || 7) + " · " + c.necessarias + " certas de " + lista(c.perguntas).length + " perguntas";
    if (d.tipo === "runas") return c.nichos + " nichos · " + lista(x.slots).map(function (s) { return s || "—"; }).join(" | ");
    if (d.tipo === "acao") return [c.pericia || lista(c.pericias).join("/") ? "teste " + (c.pericia || lista(c.pericias).join(" ou ")) + " DT " + c.dt : "sem teste", c.custoPv ? c.custoPv + " PV" : "", c.requer ? "requer " + c.requer.join(", ") : "", c.ataque ? "ataque RA+" + c.ataque.dano : ""].filter(Boolean).join(" · ");
    if (d.tipo === "laboratorio") return lista(c.faces).map(function (f) { return "d" + f; }).join(", ") + " · " + lista(x.valores).join(", ") + " · " + (x.rerrolagens || 0) + " nova(s)";
    return "";
  }

  /* ===================================================================
     MESTRE · encontro, tabelas, ferramentas, perseguição, esconderijo
     =================================================================== */
  function encontroDoMestre(m) {
    var e = m.estado, p = proc(e), en = p.encontro, c = m.cena || {};
    var partes = [];
    /* Tabelas por rodada. */
    if (lista(p.tabelas).length) partes.push(UI.painel("Tabelas por rodada", el("ul.pilha", {}, p.tabelas.map(function (t) {
      return el("li.o2-tabela", {}, [
        el("strong", { texto: t.nome }), " ", etiqueta(t.ativa ? (t.suspensa ? "suspensa" : "ativa desde a rodada " + t.inicio) : "desligada", t.ativa && !t.suspensa ? "aviso" : ""),
        el("p.t-mini", { texto: t.linhas.map(function (l) { return (l.de === l.ate ? l.de : l.de + (l.ate >= 999 ? "+" : "–" + l.ate)) + ": " + [l.pd && l.pd !== "0" ? l.pd + " PD" : l.pd === "0" ? "0" : "", l.pv ? l.pv + " PV" : "", l.condicional ? "(a menos que fira outro)" : ""].filter(Boolean).join(" ") || l.texto.slice(0, 40); }).join(" · ") }),
        el("div.faixa", {}, [
          !t.ativa ? botao("Ativar a partir da próxima rodada", function () { m.operar({ tipo: "tabela", id: t.id, acao: "ativar", inicio: rodada(e) + 1 }); }, { classe: "r-botao--principal" }) : botao("Desligar", function () { m.operar({ tipo: "tabela", id: t.id, acao: "ativar", valor: false }); }),
          t.ativa ? botao(t.suspensa ? "Retomar" : "Suspender", function () { m.operar({ tipo: "tabela", id: t.id, acao: "suspender", valor: !t.suspensa }); }) : null,
        ]),
        t.ativa ? el("div.faixa", { "aria-label": "Isentar nesta rodada" }, m.pcs.map(function (pc) { var r = String(rodada(e)); var is = lista((t.isentos || {})[r]).indexOf(pc.id) >= 0; return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: is, onchange: function (ev) { m.operar({ tipo: "tabela", id: t.id, acao: "isentar", rodada: rodada(e), personagem: pc.id, valor: ev.currentTarget.checked }); } }), el("span", { texto: "Isentar " + pc.nome + " (rodada " + r + ")" })]); })) : null,
      ]);
    }))));
    /* Efeitos em grupo da cena. */
    var efeitos = Object.keys(c.efeitos || {});
    if (efeitos.length) partes.push(UI.painel("Efeitos da cena (todos testam ao mesmo tempo)", el("div.faixa", {}, efeitos.map(function (k) {
      var ef = c.efeitos[k];
      return botao(ef.nome, function () { escolherAlvosEfeito(m, k, ef); }, { rotulo: "Aplicar " + ef.nome });
    }))));
    /* Ferramentas. */
    var disp = lista(p.ferramentas && p.ferramentas.disponiveis);
    partes.push(UI.recolhivel({ titulo: "Ferramentas da Ordem (" + disp.length + ")", conteudo: el("div.pilha", {}, [
      linha("Quem leva cada ferramenta (pode emprestar). UV tem 3 cargas, pó 5."),
      el("ul.pilha.pilha--curta", {}, K().ORDEM_FERRAMENTAS.map(function (f) {
        return el("li.o2-linha", {}, [el("span", { texto: nomeFerramenta(f) + (p.ferramentas && p.ferramentas.cargas[f] !== undefined ? " (" + p.ferramentas.cargas[f] + ")" : "") }), UI.campo({ rotulo: "Com", tipo: "selecao", valor: (p.ferramentas && p.ferramentas.posse[f]) || "", opcoes: opcoesPcs(m, "ninguém"), aoMudar: function (v) { m.operar({ tipo: "ferramentaPosse", ferramenta: f, personagem: v }); } })]);
      })),
    ]) }));
    /* Encontro. */
    if (en && en.config) {
      var cfg = en.config;
      var st = { etapa: (lista(cfg.etapas)[0] || {}).id || "", bloq: [] };
      partes.push(UI.painel("Encontro: " + (cfg.nome || ""), el("div.pilha", {}, [
        !en.ativo ? botao("Iniciar o encontro", function () { m.operar({ tipo: "encontro", acao: "iniciar" }); }, { classe: "r-botao--principal" }) : el("div.faixa", {}, [etiqueta("Etapa: " + ((lista(cfg.etapas).filter(function (x) { return x.id === en.etapa; })[0] || {}).nome || "—")), botao("Encerrar o encontro", function () { m.operar({ tipo: "encontro", acao: "encerrar" }); }, { classe: "r-botao--fantasma" })]),
        lista(cfg.etapas).length > 1 ? el("div.o2-criar__campos", {}, [UI.campo({ rotulo: "Etapa", tipo: "selecao", valor: en.etapa || st.etapa, opcoes: cfg.etapas.map(function (x) { return { valor: x.id, rotulo: x.nome }; }), aoMudar: function (v) { st.etapa = v; } }), botao("Ir para a etapa", function () { m.operar({ tipo: "encontro", acao: "etapa", etapa: st.etapa }); })]) : null,
        en.ondas ? el("div.faixa", {}, [etiqueta("Ondas: " + lista(en.ondas.geradas).length + (en.ondas.paradas ? " (paradas)" : "")), botao(en.ondas.paradas ? "Retomar ondas" : "Parar ondas", function () { m.operar({ tipo: "encontro", acao: "ondas", valor: !!en.ondas.paradas }); }), botao("Onda agora", function () { m.operar({ tipo: "encontro", acao: "ondaAgora" }); })]) : null,
        cfg.bloqueio ? el("div.pilha", {}, [
          linha(en.bloqueio ? "Entrada bloqueada por " + en.bloqueio.pcs.map(function (x) { var pa = (e.combate.participantes || []).filter(function (y) { return y.id === x; })[0]; return pa ? pa.nome : x; }).join(" e ") + "." : "Bloquear a entrada: exatamente " + cfg.bloqueio.exatos + " personagens."),
          el("div.faixa", {}, (e.combate.participantes || []).filter(function (x) { return x.tipo === "pc"; }).map(function (pa) { return el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { st.bloq = st.bloq.filter(function (z) { return z !== pa.id; }); if (ev.currentTarget.checked) st.bloq.push(pa.id); } }), el("span", { texto: pa.nome })]); })),
          el("div.faixa", {}, [botao("Bloquear", function () { m.operar({ tipo: "encontro", acao: "bloqueio", pcs: st.bloq }); }), en.bloqueio ? botao("Desfazer bloqueio", function () { m.operar({ tipo: "encontro", acao: "bloqueio", valor: false }); }) : null]),
        ]) : null,
        lista(cfg.etapas).filter(function (x) { return x.perseguicao; }).map(function (x) { return botao("Iniciar a perseguição: " + x.nome, function () { m.operar({ tipo: "perseguicao", acao: "iniciar", ref: x.id }); }); }),
        cfg.perseguicao ? el("div.faixa", {}, [botao("Iniciar a perseguição", function () { m.operar({ tipo: "perseguicao", acao: "iniciar" }); }, { classe: "r-botao--principal" }), botao("Iniciar facilitada (máx. 3 mortes, 1d4)", function () { m.operar({ tipo: "perseguicao", acao: "iniciar", facilitado: true }); })]) : null,
      ])));
    }
    partes.push(perseguicaoDoMestre(m), esconderijoDoMestre(m), ameacasNoCombate(m));
    return el("div.pilha", {}, partes.filter(Boolean));
  }
  function escolherAlvosEfeito(m, k, ef) {
    var st = { alvos: [] };
    UI.modal({ titulo: ef.nome, classe: "o2-janela", conteudo: [el("div.pilha", {}, [
      linha([ef.pericia ? nomePericia(m.estado, ef.pericia) + " DT " + ef.dt : "Sem teste", ef.dano ? "dano " + ef.dano : ""].filter(Boolean).join(" · ") + ". Sem marcar ninguém: todos na cena."),
      el("div.faixa", {}, m.pcs.map(function (p) { return el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { st.alvos = st.alvos.filter(function (x) { return x !== p.id; }); if (ev.currentTarget.checked) st.alvos.push(p.id); } }), el("span", { texto: p.nome })]); })),
    ])], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (f) { f(); m.operar({ tipo: "efeitoEmGrupo", efeito: k, alvos: st.alvos }); } }] });
  }
  function perseguicaoDoMestre(m) {
    var p = proc(m.estado).perseguicao;
    if (!p) return null;
    var st = { perde: "" };
    var cfg = p.config || {};
    return UI.painel("Perseguição — rodada " + (proc(m.estado).rodada - p.inicio + 1) + "/" + cfg.rodadas + (p.ativa ? "" : " (encerrada)"), el("div.pilha", {}, [
      linha("Limiares: " + lista(cfg.limiares).map(function (l) { return "fim da " + l.rodada + "ª: " + l.minimo + " PA"; }).join(" · ") + " — " + (cfg.efeito === "devorado" ? "só o de menor PA é devorado" : "quem está abaixo é arrastado(a)") + "."),
      el("table.o2-pistas", {}, [el("thead", {}, [el("tr", {}, ["Personagem", "PA", "Fôlego", "Esforços", "Estado"].map(function (h) { return el("th", { texto: h }); }))]), el("tbody", {}, Object.keys(p.por).map(function (pid) { var x = p.por[pid]; return el("tr", {}, [el("td", { texto: nomePc(m, pid) }), el("td", { texto: String(x.pa) }), el("td", { texto: x.folego + "d6" }), el("td", { texto: String(x.esforcos) }), el("td", { texto: x.morto ? "devorado(a)" : x.arrastado ? "arrastado(a) desde a " + x.arrastado + "ª" : "correndo" })]); }))]),
      p.empate ? el("div.o2-criar__campos", {}, [UI.campo({ rotulo: "Empate: quem perde o teste oposto?", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "—" }].concat(p.empate.pids.map(function (x) { return { valor: x, rotulo: nomePc(m, x) }; })), aoMudar: function (v) { st.perde = v; } }), botao("Decidir", function () { m.operar({ tipo: "desempatePerseguicao", perde: st.perde }); }, { classe: "r-botao--perigo" })]) : null,
      p.ativa ? botao("Encerrar a perseguição", function () { m.operar({ tipo: "perseguicao", acao: "encerrar" }); }, { classe: "r-botao--fantasma" }) : null,
    ]));
  }
  function esconderijoDoMestre(m) {
    var h = proc(m.estado).esconderijo;
    var st = { n1: "", n2: "" };
    if (!h) return UI.recolhivel({ titulo: "Furtividade (esconderijo)", conteudo: botao("Iniciar a cena de furtividade", function () { m.operar({ tipo: "esconderijo", acao: "iniciar" }); }) });
    return UI.painel("Esconderijo" + (h.ativo ? "" : " (encerrado)"), el("div.pilha", {}, [
      el("table.o2-pistas", {}, [el("thead", {}, [el("tr", {}, ["Personagem", "Dados de esconderijo", "Estado"].map(function (x) { return el("th", { texto: x }); }))]), el("tbody", {}, Object.keys(h.por).map(function (pid) { var x = h.por[pid]; return el("tr", {}, [el("td", { texto: nomePc(m, pid) }), el("td", { texto: x.dados.map(function (d) { return "d" + d.faces + "=" + d.valor; }).join(", ") || (x.inicial ? "nenhum" : "falta o teste") }), el("td", { texto: x.chegou ? "a salvo" : x.descoberto ? "ENCONTRADO" : x.parado ? "parado" : "escondido" }), el("td", {}, [botao(x.chegou ? "Ainda não chegou" : "Chegou", function () { m.operar({ tipo: "esconderijo", acao: "chegou", personagem: pid, valor: !x.chegou }); })])]); }))]),
      el("div.faixa", {}, [botao("Fase das criaturas (rolar d10)", function () { m.operar({ tipo: "esconderijo", acao: "criaturas" }); }, { classe: "r-botao--principal" })]),
      lista(h.rolagens).length && lista(h.rolagens).slice(-1)[0].pendente === "numeros" ? el("div.o2-criar__campos", {}, [
        UI.campo({ rotulo: "Número 1", tipo: "numero", aoMudar: function (v) { st.n1 = v; } }), UI.campo({ rotulo: "Número 2", tipo: "numero", aoMudar: function (v) { st.n2 = v; } }),
        botao("Falar os dois números", function () { m.operar({ tipo: "esconderijo", acao: "criaturas", d10: 1, numeros: [st.n1, st.n2], repetir: true }); }),
      ]) : null,
      h.ativo ? botao("Encerrar a furtividade", function () { m.operar({ tipo: "esconderijo", acao: "encerrar" }); }, { classe: "r-botao--fantasma" }) : null,
    ]));
  }
  function ameacasNoCombate(m) {
    var e = m.estado;
    var st = { ameaca: (A().LISTA.filter(function (x) { return !x.ordem2.semFicha; })[0] || {}).id, quantidade: 1, rd: "", oculto: false, obj: { nome: "", pv: 5, rd: 5, aoDestruir: "" } };
    var npcs = (e.combate.participantes || []).filter(function (p) { return p.tipo === "npc" && lista(p.especiais).length; });
    return el("div.pilha", {}, [
      e.combate.ativo ? UI.painel("Ameaças de Ordem II (catálogo e Homebrew)", el("div.pilha", {}, [
        el("div.o2-criar__campos", {}, [
          UI.campo({ rotulo: "Ameaça", tipo: "selecao", valor: st.ameaca, opcoes: A().LISTA.filter(function (x) { return !x.ordem2.semFicha; }).map(function (x) { return { valor: x.id, rotulo: x.nome + " — " + A().linha(x.ordem2) }; }), aoMudar: function (v) { st.ameaca = v; } }),
          UI.campo({ rotulo: "Quantas (cada uma com PV e ações próprios)", tipo: "numero", valor: "1", aoMudar: function (v) { st.quantidade = U.inteiro(v, 1); } }),
          UI.campo({ rotulo: "RD (vazio = a da ficha; aughisk: lacuna)", tipo: "numero", aoMudar: function (v) { st.rd = v; } }),
          botao("Adicionar", function () { m.operar({ tipo: "adicionarAmeaca", ameaca: st.ameaca, quantidade: st.quantidade, rd: st.rd === "" ? undefined : Number(st.rd) }); }, { classe: "r-botao--principal" }),
          botao("Do Homebrew…", function () { doHomebrew(m, st); }),
        ]),
        UI.recolhivel({ titulo: "+ Objeto atacável (ex.: o crânio — PV 5, RD 5)", conteudo: el("div.o2-criar__campos", {}, [
          UI.campo({ rotulo: "Nome", limite: 80, aoMudar: function (v) { st.obj.nome = v; } }),
          UI.campo({ rotulo: "PV", tipo: "numero", valor: "5", aoMudar: function (v) { st.obj.pv = U.inteiro(v, 5); } }),
          UI.campo({ rotulo: "RD", tipo: "numero", valor: "5", aoMudar: function (v) { st.obj.rd = U.inteiro(v, 0); } }),
          UI.campo({ rotulo: "Ao destruir (ex.: atordoar:aughisk, tirarRd:aughisk, grupo:cranioDestruido)", limite: 200, aoMudar: function (v) { st.obj.aoDestruir = v; } }),
          botao("Adicionar objeto", function () { m.operar({ tipo: "adicionarObjeto", nome: st.obj.nome, pv: st.obj.pv, rd: st.obj.rd, aoDestruir: st.obj.aoDestruir.split(",").map(function (s) { return s.trim(); }).filter(Boolean) }); }),
        ]) }),
      ])) : null,
      npcs.length ? UI.painel("Ações especiais das ameaças", el("ul.pilha", {}, npcs.map(function (pa) {
        var sx = { alvo: "", esquivou: false };
        return el("li.pilha.pilha--curta", {}, [el("strong", { texto: pa.nome + (pa.preparando ? " (preparando " + pa.preparando.especial + ")" : "") }),
          UI.campo({ rotulo: "Alvo", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "—" }].concat(e.combate.participantes.filter(function (p) { return p.tipo === "pc"; }).map(function (p) { return { valor: p.id, rotulo: p.nome }; })), aoMudar: function (v) { sx.alvo = v; } }),
          el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { sx.esquivou = ev.currentTarget.checked; } }), el("span", { texto: "O alvo gastou a ação para esquivar" })]),
          el("div.faixa", {}, pa.especiais.filter(function (x) { return x.motor.tipo === "oposto" || x.motor.tipo === "area"; }).map(function (x) {
            var segunda = x.motor.acoes === 2 && pa.preparando && pa.preparando.especial === x.id;
            return botao(x.nome + (x.motor.acoes === 2 ? (segunda ? " (concluir)" : " (começar)") : ""), function () { m.operar({ tipo: "acaoEspecial", ator: pa.id, especial: x.id, alvo: sx.alvo, esquivou: sx.esquivou, concluir: segunda || (x.motor.acoes !== 2) }); });
          })),
        ]);
      }))) : null,
    ]);
  }

  function doHomebrew(m, st) {
    global.RAMAApi.listarHomebrew({ tipo: "criatura" }).then(function (r) {
      if (!r.ok) { UI.avisoDeFalha(r, "leitura do Homebrew"); return; }
      var l = (r.dados || []).filter(function (h) { return ((h.resumo && h.resumo.sistema) || h.sistema) === "ordem2"; });
      if (!l.length) { UI.aviso("Nenhuma ameaça de Ordem II no seu Homebrew. No Catálogo, abra uma ameaça de Ordem II e use “Copiar para o Homebrew”."); return; }
      var sx = { id: l[0].id };
      UI.modal({ titulo: "Ameaça do Homebrew", classe: "o2-janela", conteudo: [UI.campo({ rotulo: "Ameaça", tipo: "selecao", valor: sx.id, opcoes: l.map(function (h) { return { valor: h.id, rotulo: h.nome }; }), aoMudar: function (v) { sx.id = v; } })], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Adicionar", classe: "r-botao--principal", aoClicar: function (f) {
        global.RAMAApi.lerHomebrew(sx.id).then(function (h) {
          if (!h.ok || !h.dados || !h.dados.ordem2) { UI.avisoAtencao("A ficha não tem o bloco de Ordem II."); return; }
          f();
          m.operar({ tipo: "adicionarAmeaca", ficha: h.dados.ordem2, nome: h.dados.nome, homebrewId: sx.id, quantidade: st.quantidade, rd: st.rd === "" ? undefined : Number(st.rd) });
        });
      } }] });
    });
  }

  /* ===================================================================
     QUEM JOGA
     =================================================================== */
  function jogador(m) {
    var e = m.estado, p = proc(e);
    if (!e.proc) return null;
    var eu = m.meus[0];
    var partes = [];
    var anunciados = e.investigacao.pontos;
    var comDesafio = anunciados.filter(function (pt) { return lista(pt.desafios).length; });
    if (lista(p.desafios).length) partes.push(UI.painel("Desafios de acesso", el("div.pilha", {}, p.desafios.map(function (d) { return desafioDoJogador(m, d, eu); }))));
    void comDesafio;
    partes.push(ferramentasDoJogador(m, eu));
    if (p.compendium && p.compendium.acesso) partes.push(compendioDoJogador(m, eu));
    if (lista(p.anexos).length) partes.push(UI.painel("Anexos recebidos", el("ul.pilha.pilha--curta", {}, p.anexos.map(function (a) {
      return el("li", {}, [el("strong", { texto: a.nome }), a.url ? el("a", { href: a.url, target: "_blank", rel: "noopener noreferrer", texto: " abrir" }) : null, a.documentoId ? el("span.t-mini", { texto: " — está na aba Documentos da campanha" }) : null, !a.url && !a.documentoId && a.descricao ? el("p.t-mini", { texto: a.descricao }) : null, !a.url && !a.documentoId && !a.descricao ? el("span.t-mini", { texto: " — o Mestre mostra" }) : null]);
    }))));
    if (lista(p.grupo).length) partes.push(UI.painel("Pistas do grupo", el("ul.pilha.pilha--curta", {}, p.grupo.map(function (d) { return el("li", { texto: d.texto }); }))));
    var meusItens = lista(p.itens).filter(function (i) { return m.meus.indexOf(i.com) >= 0; });
    if (meusItens.length) partes.push(UI.painel("Itens da cena com você", el("ul.pilha.pilha--curta", {}, meusItens.map(function (it) {
      return el("li.o2-linha", {}, [el("span", { texto: it.nome }), UI.campo({ rotulo: "Passar para", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "—" }].concat(m.pcs.filter(function (x) { return x.id !== it.com; }).map(function (x) { return { valor: x.id, rotulo: x.nome }; })), aoMudar: function (v) { if (v) m.operar({ tipo: "passarItem", item: it.id, para: v }); } })]);
    }))));
    if (p.perseguicao) partes.push(perseguicaoDoJogador(m, eu));
    if (p.esconderijo) partes.push(esconderijoDoJogador(m, eu));
    Object.keys(p.recursos || {}).forEach(function (k) {
      var rc = p.recursos[k];
      if (rc.usados.indexOf(eu) >= 0) return;
      partes.push(UI.painel(rc.nome, el("div.faixa", {}, rc.opcoes.map(function (op) { return botao(op.nome, function () { m.operar({ tipo: "usarRecurso", quem: eu, recurso: k, opcao: op.id }); }); }))));
    });
    lista(p.tabelas).forEach(function (t) { partes.push(linha(t.nome + (t.suspensa ? " (suspensa)" : "") + " · rodada " + t.rodadaNaTabela + (t.linhaAtual ? " · nesta rodada: " + (t.linhaAtual.pd || t.linhaAtual.pv || "0") : "") + (t.passadas.length ? " · " + t.passadas.slice(-1)[0] : ""))); });
    return el("div.pilha", {}, partes.filter(Boolean));
  }
  function campoDados(n, faces, valores) {
    return el("div.faixa", {}, Array.from({ length: n }).map(function (_, i) {
      return UI.campo({ rotulo: "Dado " + (i + 1), tipo: "selecao", valor: String(valores[i] || 1), opcoes: Array.from({ length: faces }).map(function (__, j) { return { valor: String(j + 1), rotulo: String(j + 1) }; }), aoMudar: function (v) { valores[i] = Number(v); } });
    }));
  }
  function desafioDoJogador(m, d, eu) {
    var c = d.config || {}, x = (d.por || {})[eu] || {};
    var op = function (acao, extra) { return m.operar(Object.assign({ tipo: "desafioAgir", id: d.id, acao: acao, quem: eu }, extra || {})); };
    var corpo = [];
    var st = { valores: [], texto: "", resposta: "", pergunta: 0, item: "", nicho: 0, modo: (lista(c.modos)[0] || {}).id, acaoArea: "", escolhas: [], pericia: (lista(c.pericias)[0] || ""), alvo: "" };
    if (d.estado === "vencido") corpo.push(linha("Resolvido."));
    else if (d.estado === "danificado") corpo.push(linha("Danificado: só na força ou com a chave."));
    else if (d.tipo === "destrancar") {
      corpo.push(linha("Ponha " + (c.dados || "?") + " dados de d" + (c.faces || "?") + "; a resposta diz onde está a senha (baixo, exato, alto)." + (c.max ? " Tentativas da fechadura: " + ((d.dados && d.dados.total) || 0) + "/" + c.max + "." : "")));
      corpo.push(campoDados(c.dados || 3, c.faces || 6, st.valores));
      corpo.push(el("div.faixa", {}, [botao("Tentar", function () { op("tentar", { valores: st.valores.length ? st.valores : Array(c.dados || 3).fill(1) }); }, { classe: "r-botao--principal" }), c.chave ? botao("Usar a chave", function () { op("chave"); }) : null]));
      if (x.ultimas) corpo.push(el("ul.pilha.pilha--curta", {}, x.ultimas.slice().reverse().map(function (u) { return el("li.t-mini", { texto: u.t.join("-") + " → " + u.r.join(", ") }); })));
    } else if (d.tipo === "senha") {
      corpo.push(UI.campo({ rotulo: "Senha (" + (c.digitos || "?") + " dígitos)", limite: 20, aoMudar: function (v) { st.texto = v; } }));
      corpo.push(botao("Digitar", function () { op("tentar", { texto: st.texto }); }, { classe: "r-botao--principal" }));
    } else if (d.tipo === "arrombar") {
      corpo.push(linha("1 PV por tentativa; " + (c.pericia || "Atletismo") + (c.dt ? " DT " + c.dt : "") + "; cada sucesso soma a RA" + (c.pa ? " até " + c.pa : "") + ". Agora: " + ((d.dados && d.dados.pa) || 0) + "."));
      corpo.push(botao("Arrombar (1 PV)", function () { op("tentar"); }, { classe: "r-botao--principal" }));
    } else if (d.tipo === "alcancar") {
      corpo.push(linha(x.alcancou ? "Você alcançou." : "Seguro: duas ações seguidas (falha: dano = RB, recomeça). Arriscado: uma ação, DT maior (falha: dano = RA)." + (x.etapa ? " Falta a 2ª ação." : "")));
      if (!x.alcancou) corpo.push(el("div.faixa", {}, [botao("Jeito seguro", function () { op("seguro"); }, { classe: "r-botao--principal" }), botao("Jeito arriscado", function () { op("arriscado"); })]));
    } else if (d.tipo === "sustentar") {
      var sus = d.dados || {};
      corpo.push(linha(sus.sustentador ? nomePc(m, sus.sustentador) + " está sustentando (há " + (sus.rodadas || 0) + " rodada(s))." : "Erguer custa 1 PV e um teste; no fim de cada rodada, novo teste com −1 passo por rodada."));
      corpo.push(el("div.faixa", {}, [!sus.sustentador ? botao("Erguer (1 PV)", function () { op("erguer"); }, { classe: "r-botao--principal" }) : null, sus.sustentador === eu ? botao("Soltar", function () { op("soltar"); }) : null, sus.sustentador && sus.sustentador !== eu ? botao("Passar por baixo / pela abertura", function () { op("passar"); }) : null]));
    } else if (d.tipo === "equilibrio") {
      corpo.push(linha("2d10 sem somar: iguais ou 1 de diferença, equilibra. Dados de equilíbrio: " + (x.reserva === undefined ? "metade da Acrobacia" : x.reserva + "d4") + "." + (x.d10 ? " Última: " + x.d10.join(" e ") + (x.caindo ? " — CAINDO" : "") : "") + (c.sucessos && c.sucessos < 99 ? " Sucessos: " + (x.sucessos || 0) + "/" + c.sucessos : "")));
      corpo.push(el("div.faixa", {}, x.caindo ? [botao("Gastar d4 no 1º dado", function () { op("gastar", { dado: 0 }); }), botao("Gastar d4 no 2º dado", function () { op("gastar", { dado: 1 }); }), botao("Cair", function () { op("cair"); }, { classe: "r-botao--perigo" })] : [botao("Rolar 2d10", function () { op("rolar"); }, { classe: "r-botao--principal" })]));
    } else if (d.tipo === "acumular") {
      corpo.push(linha((x.chegou ? "Você chegou." : "Acumulado: " + (x.pontos || 0) + (c.meta ? "/" + c.meta : "")) + ". Falhando, cai com dano igual ao acumulado."));
      if (!x.chegou) corpo.push(el("div.faixa", {}, lista(c.modos).map(function (mo) { return botao(mo.nome + (mo.dt ? " (DT " + mo.dt + ")" : ""), function () { op("acao", { modo: mo.id }); }); })));
    } else if (d.tipo === "travessia") {
      var area = lista(c.areas)[(d.dados && d.dados.area) || 0];
      if (area) {
        corpo.push(linha(area.nome + ": " + (x.area === ((d.dados && d.dados.area) || 0) ? (x.avancos || 0) : 0) + "/" + area.meta + " avanços" + (x.feito ? " — você cruzou." : "")));
        corpo.push(el("div.faixa", {}, area.acoes.map(function (a) { return botao(a.nome, function () { op("agir", { acaoArea: a.id }); }, { rotulo: a.nome + (a.pericia ? ": " + nomePericia(m.estado, a.pericia) + " DT " + a.dt : "") }); })));
      }
    } else if (d.tipo === "hackTecnico") {
      if (x.problema && !x.respondido) {
        corpo.push(el("p.o2-desafio__problema", { texto: x.problema + " — " + x.segundos + " segundos!" }));
        corpo.push(UI.campo({ rotulo: "Resposta", limite: 20, aoMudar: function (v) { st.resposta = v; } }));
        corpo.push(botao("Responder", function () { op("responder", { resposta: st.resposta }); }, { classe: "r-botao--principal" }));
      } else corpo.push(botao("Testar " + nomePericia(m.estado, c.pericia || "tecnologia"), function () { op("testar"); }, { classe: "r-botao--principal" }));
    } else if (d.tipo === "hackSocial") {
      if (x.liberado) {
        corpo.push(linha("Precisa de " + c.necessarias + " certas; pode errar " + (x.chancesExtras || 0) + " vez(es). Certas: " + (x.acertos || 0) + "."));
        corpo.push(UI.campo({ rotulo: "Pergunta", tipo: "selecao", valor: "0", opcoes: lista(c.perguntas).map(function (q, i) { return { valor: String(i), rotulo: q + (lista(x.respondidas).indexOf(i) >= 0 ? " (respondida)" : "") }; }), aoMudar: function (v) { st.pergunta = Number(v); } }));
        corpo.push(UI.campo({ rotulo: "Resposta", limite: 80, aoMudar: function (v) { st.resposta = v; } }));
        corpo.push(botao("Responder", function () { op("responder", { pergunta: st.pergunta, resposta: st.resposta }); }, { classe: "r-botao--principal" }));
      } else corpo.push(botao("Testar Intuição", function () { op("testar"); }, { classe: "r-botao--principal" }));
    } else if (d.tipo === "enigma") {
      corpo.push(el("div.faixa", {}, lista(c.opcoes).map(function (o) { return el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { st.escolhas = st.escolhas.filter(function (z) { return z !== o; }); if (ev.currentTarget.checked) st.escolhas.push(o); } }), el("span", { texto: o })]); })));
      corpo.push(botao("Tentar", function () { op("responder", { resposta: st.escolhas }); }, { classe: "r-botao--principal" }));
    } else if (d.tipo === "runas") {
      var slots = lista(d.dados && d.dados.slots);
      var pedras = lista(proc(m.estado).itens).filter(function (i) { return i.com === eu && i.runa; });
      corpo.push(el("ol.o2-nichos", {}, Array.from({ length: c.nichos || 6 }).map(function (_, i) { return el("li", {}, [el("span", { texto: (i + 1) + ": " + (slots[i] || "vazio") }), slots[i] ? botao("Retirar", function () { op("retirar", { nicho: i }); }, { classe: "r-botao--fantasma" }) : null]); })));
      if (pedras.length) corpo.push(el("div.o2-criar__campos", {}, [UI.campo({ rotulo: "Pedra", tipo: "selecao", valor: pedras[0].id, opcoes: pedras.map(function (i) { return { valor: i.id, rotulo: i.nome }; }), aoMudar: function (v) { st.item = v; } }), UI.campo({ rotulo: "Nicho", tipo: "selecao", valor: "0", opcoes: Array.from({ length: c.nichos || 6 }).map(function (_, i) { return { valor: String(i), rotulo: String(i + 1) }; }), aoMudar: function (v) { st.nicho = Number(v); } }), botao("Encaixar", function () { op("encaixar", { item: st.item || pedras[0].id, nicho: st.nicho }); }, { classe: "r-botao--principal" })]));
    } else if (d.tipo === "acao") {
      var alvos = (m.estado.combate.participantes || []).filter(function (pa) { return pa.tipo === "npc"; });
      if (lista(c.pericias).length) corpo.push(UI.campo({ rotulo: "Perícia", tipo: "selecao", valor: st.pericia, opcoes: c.pericias.map(function (k) { return { valor: k, rotulo: nomePericia(m.estado, k) }; }), aoMudar: function (v) { st.pericia = v; } }));
      if (c.ataque) corpo.push(UI.campo({ rotulo: "Alvo", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "—" }].concat(alvos.map(function (pa) { return { valor: pa.id, rotulo: pa.nome }; })), aoMudar: function (v) { st.alvo = v; } }));
      corpo.push(botao("Fazer", function () { op("fazer", { pericia: st.pericia || undefined, alvo: st.alvo || undefined }); }, { classe: "r-botao--principal" }));
    } else if (d.tipo === "laboratorio") {
      var v = lista(d.dados && d.dados.valores), fs = lista(c.faces);
      corpo.push(el("p.o2-lab", { texto: fs.map(function (f, i) { return "d" + f + (v[i] !== undefined ? "=" + v[i] : ""); }).join(" · ") + " · novas rolagens: " + ((d.dados && d.dados.rerrolagens) || 0) }));
      if (d.dados && d.dados.quem === eu && d.estado === "aberto") corpo.push(el("div.faixa", {}, [v.length < fs.length ? botao("Rolar o próximo (d" + fs[v.length] + ")", function () { m.operar({ tipo: "laboratorio", id: d.id, acao: "rolar" }); }, { classe: "r-botao--principal" }) : botao("Concluir a análise", function () { m.operar({ tipo: "laboratorio", id: d.id, acao: "concluir" }); }, { classe: "r-botao--principal" })].concat(v.map(function (val, i) { return (d.dados.rerrolagens || 0) > 0 ? botao("Rolar de novo o " + (i + 1) + "º (" + val + ")", function () { m.operar({ tipo: "laboratorio", id: d.id, acao: "rerrolar", indice: i }); }) : null; }))));
    }
    return el("article.o2-desafio", { "aria-label": d.nome }, [el("header.o2-ponto__cab", {}, [el("h4", { texto: d.nome }), d.ponto ? el("span.t-mini", { texto: pontoNome(m.estado, d.ponto) }) : null])].concat(corpo).concat(d.historico && d.historico.length ? [UI.recolhivel({ titulo: "Últimas tentativas", conteudo: el("ol.o2-historico", {}, d.historico.slice().reverse().map(function (h) { return el("li.t-mini", { texto: h }); })) })] : []));
  }
  function ferramentasDoJogador(m, eu) {
    var e = m.estado, p = proc(e), f = p.ferramentas || {};
    var minhas = Object.keys(f.posse || {}).filter(function (k) { return m.meus.indexOf(f.posse[k]) >= 0 && k !== "compendium"; });
    var outras = lista(f.disponiveis).filter(function (k) { return minhas.indexOf(k) < 0; });
    if (!minhas.length && !outras.length) return null;
    var pontos = e.investigacao.pontos;
    var st = { ponto: (pontos[0] || {}).id || "", area: "" };
    return UI.painel("Ferramentas da Ordem", el("div.pilha", {}, [
      minhas.length ? el("div.o2-criar__campos", {}, [UI.campo({ rotulo: "Em qual ponto", tipo: "selecao", valor: st.ponto, opcoes: pontos.map(function (pt) { return { valor: pt.id, rotulo: (pt.numero ? pt.numero + ". " : "") + pt.nome }; }), aoMudar: function (v) { st.ponto = v; } })]) : null,
      el("ul.pilha.pilha--curta", {}, minhas.map(function (k) {
        var def = K().FERRAMENTAS[k];
        return el("li.o2-linha", {}, [
          el("strong", { texto: def.nome + (f.cargas && f.cargas[k] !== undefined ? " (" + f.cargas[k] + " carga(s))" : "") }),
          k === "laser" ? UI.campo({ rotulo: "Ambiente", limite: 60, dica: "porao", aoMudar: function (v) { st.area = v.trim(); } }) : null,
          botao("Usar", function () { m.operar(k === "laser" ? { tipo: "usarFerramenta", quem: f.posse[k], ferramenta: k, area: st.area || (pontos[0] || {}).area } : { tipo: "usarFerramenta", quem: f.posse[k], ferramenta: k, ponto: st.ponto }); }, { classe: "r-botao--principal", rotulo: "Usar " + def.nome }),
          UI.campo({ rotulo: "Emprestar para", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "—" }].concat(m.pcs.filter(function (x) { return x.id !== f.posse[k]; }).map(function (x) { return { valor: x.id, rotulo: x.nome }; })), aoMudar: function (v) { if (v) m.operar({ tipo: "passarFerramenta", ferramenta: k, para: v }); } }),
        ]);
      })),
      outras.length ? linha("Com outros: " + outras.map(function (k) { return nomeFerramenta(k) + (f.posse && f.posse[k] ? " (" + nomePc(m, f.posse[k]) + ")" : " (sem dono)"); }).join(" · ")) : null,
      evidencias(m),
    ]));
  }
  /* Evidências comparáveis: as leituras dos meus personagens, por ferramenta. */
  function evidencias(m) {
    var e = m.estado;
    var leituras = [];
    m.meus.forEach(function (pid) { lista((e.investigacao.descobertas || {})[pid]).forEach(function (d) { if (d.ferramenta) leituras.push(d); }); });
    if (!leituras.length) return null;
    var por = {};
    leituras.forEach(function (d) { (por[d.ferramenta] = por[d.ferramenta] || []).push(d); });
    return UI.recolhivel({ titulo: "Evidências das ferramentas (" + leituras.length + ")", conteudo: el("div.pilha", {}, Object.keys(por).map(function (k) { return el("section", {}, [el("h5.t-secao", { texto: nomeFerramenta(k) }), el("ul.pilha.pilha--curta", {}, por[k].map(function (d) { return el("li.t-mini", { texto: (d.ponto ? pontoNome(e, d.ponto) + ": " : "") + d.texto }); }))]); })) });
  }
  function compendioDoJogador(m, eu) {
    var c = proc(m.estado).compendium, ct = c.conteudo || {};
    var marcas = lista(c.marcas[eu]);
    var ehPortador = m.meus.indexOf(c.portador) >= 0;
    return UI.painel("Compêndio da Ordem" + (ehPortador ? " (com você)" : " (consulta permitida)"), el("div.pilha", {}, [
      ct.texto ? linha(ct.texto) : null,
      el("div.o2-compendio", {}, lista(ct.manifestacoes).map(function (mf) { return el("article.o2-compendio__item", {}, [el("h5", { texto: mf.nome + " · " + mf.codigo }), el("p.t-mini", { texto: lista(mf.elementos).join(", ") }), el("ul", {}, lista(mf.tracos).map(function (t) { return el("li.t-mini", { texto: t }); }))]); })),
      UI.recolhivel({ titulo: "Sinais por elemento (marque o que já viu)", conteudo: el("div.pilha", {}, Object.keys(ct.sinais || {}).map(function (elem) {
        return el("section", {}, [el("h5.t-secao", { texto: elem })].concat(Object.keys(ct.sinais[elem]).map(function (fk) {
          return el("div", {}, [el("span.t-mini", { texto: (fk === "todas" ? "Todas" : nomeFerramenta(fk)) + ": " })].concat(ct.sinais[elem][fk].map(function (sinal) { var chave = elem + ":" + fk + ":" + sinal; return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: marcas.indexOf(chave) >= 0, onchange: function (ev) { m.operar({ tipo: "compendium", acao: "marcar", quem: eu, sinal: chave, valor: ev.currentTarget.checked }); } }), el("span", { texto: sinal })]); })));
        })));
      })) }),
      ehPortador ? el("div.faixa", {}, m.pcs.filter(function (x) { return x.id !== c.portador; }).map(function (x) { var tem = c.permitidos.indexOf(x.id) >= 0; return botao((tem ? "Tirar a consulta de " : "Deixar consultar: ") + x.nome, function () { m.operar({ tipo: "compendium", acao: "permitir", personagem: x.id, valor: !tem }); }); })) : null,
    ]));
  }
  function perseguicaoDoJogador(m, eu) {
    var p = proc(m.estado).perseguicao, x = p.por[eu];
    var st = { folego: 0, esforco: false, alvo: "", pericia: "" };
    return UI.painel("Perseguição — rodada " + p.rodada + "/" + p.rodadas, el("div.pilha", {}, [
      linha("Limiares: " + lista(p.limiares).map(function (l) { return "fim da " + l.rodada + "ª: " + l.minimo; }).join(" · ") + (p.chegada ? " · chega com " + p.chegada : "")),
      el("ul.pilha.pilha--curta", {}, Object.keys(p.por).map(function (pid) { var y = p.por[pid]; return el("li.t-mini", { texto: nomePc(m, pid) + ": " + y.pa + " PA" + (y.morto ? " — devorado(a)" : y.arrastado ? " — arrastado(a)" : "") }); })),
      x && !x.morto && !x.arrastado && p.ativa ? el("div.pilha", {}, [
        linha("Fôlego: " + x.folego + "d6 (dados bônus; o teto de quatro dados vale)."),
        el("div.o2-criar__campos", {}, [
          UI.campo({ rotulo: "Fôlego a usar", tipo: "numero", valor: "0", aoMudar: function (v) { st.folego = U.inteiro(v, 0); } }),
          UI.campo({ rotulo: "Perícia (outra só uma vez)", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "Atletismo" }].concat(K().listaDePericias(m.estado.perfil).filter(function (q) { return q.chave !== "atletismo"; }).map(function (q) { return { valor: q.chave, rotulo: nomePericia(m.estado, q.chave) }; })), aoMudar: function (v) { st.pericia = v; } }),
          el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { st.esforco = ev.currentTarget.checked; } }), el("span", { texto: "Esforço extra (+1 passo; " + (x.esforcos + 1) + "d4 PV)" })]),
          UI.campo({ rotulo: "Carregar (opcional)", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "Ninguém" }].concat(Object.keys(p.por).filter(function (q) { return q !== eu && !p.por[q].morto; }).map(function (q) { return { valor: q, rotulo: nomePc(m, q) }; })), aoMudar: function (v) { st.alvo = v; } }),
        ]),
        el("div.faixa", {}, [
          botao("Avançar", function () { m.operar({ tipo: "perseguir", quem: eu, acao: st.alvo ? "carregar" : "avancar", alvo: st.alvo || undefined, folego: st.folego, esforco: st.esforco, pericia: st.pericia || undefined }); }, { classe: "r-botao--principal" }),
          p.recuperarFolego ? botao("Recuperar fôlego (+2)", function () { m.operar({ tipo: "perseguir", quem: eu, acao: "recuperar" }); }) : null,
          p.sacrificio ? botao("Sacrifício (+d6 aos aliados)", function () { m.operar({ tipo: "perseguir", quem: eu, acao: "sacrificio" }); }) : null,
          botao("Outra ação (não avança)", function () { m.operar({ tipo: "perseguir", quem: eu, acao: "outra" }); }, { classe: "r-botao--fantasma" }),
        ]),
      ]) : null,
    ]));
  }
  function esconderijoDoJogador(m, eu) {
    var h = proc(m.estado).esconderijo, x = h.por[eu];
    if (!x) return null;
    var st = { pericia: "", para: "", dado: 0 };
    return UI.painel("Esconderijo", el("div.pilha", {}, [
      linha(x.dados ? (x.dados.length ? "Seus dados: " + x.dados.map(function (d) { return "d" + d.faces + "=" + d.valor; }).join(", ") : "Sem dados") + (x.descoberto ? " — ENCONTRADO(A)" : x.chegou ? " — a salvo" : "") : ""),
      h.ultima ? linha("Última procura (d10 " + h.ultima.d10 + "): " + (h.ultima.valores.join(", ") || "—")) : null,
      !x.inicial ? el("div.o2-criar__campos", {}, [UI.campo({ rotulo: "Perícia (pela descrição)", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "Furtividade" }, { valor: "acrobacia", rotulo: "Acrobacia (pelas árvores)" }, { valor: "vigor", rotulo: "Vigor (se arrastando)" }, { valor: "sobrevivencia", rotulo: "Sobrevivência (camuflado)" }], aoMudar: function (v) { st.pericia = v; } }), botao("Teste de esconderijo", function () { m.operar({ tipo: "esconder", quem: eu, acao: "inicial", pericia: st.pericia || undefined }); }, { classe: "r-botao--principal" })]) : el("div.pilha", {}, [
        el("div.faixa", {}, [
          botao("Esconder-se (DT " + (7 + 3 * (x.esconderUsos || 0)) + ")", function () { m.operar({ tipo: "esconder", quem: eu, acao: "esconderSe" }); }),
          botao("Distrair (DT " + (7 + 3 * (h.distrair || 0)) + ")", function () { m.operar({ tipo: "esconder", quem: eu, acao: "distrair", para: st.para || eu }); }),
          botao("Ação chamativa (−1 dado)", function () { m.operar({ tipo: "esconder", quem: eu, acao: "chamativa" }); }, { classe: "r-botao--fantasma" }),
          botao(x.parado ? "Voltar a agir" : "Ficar parado em segurança", function () { m.operar({ tipo: "esconder", quem: eu, acao: "parar", valor: !x.parado }); }),
        ]),
        UI.campo({ rotulo: "Aliado (distrair ou chamar atenção)", tipo: "selecao", valor: "", opcoes: [{ valor: "", rotulo: "—" }].concat(Object.keys(h.por).filter(function (q) { return q !== eu; }).map(function (q) { return { valor: q, rotulo: nomePc(m, q) }; })), aoMudar: function (v) { st.para = v; } }),
        botao("Chamar atenção para si (o aliado ganha um dado; você perde dois)", function () { m.operar({ tipo: "esconder", quem: eu, acao: "chamarAtencao", para: st.para }); }),
        x.sopro ? el("div.faixa", { role: "alert" }, [el("strong", { texto: "Sopro na nuca!" }), botao("Ficar parado (2d6 PD)", function () { m.operar({ tipo: "esconder", quem: eu, acao: "sopro", escolha: "parado" }); }), botao("Sair de perto (perde um dado)", function () { m.operar({ tipo: "esconder", quem: eu, acao: "sopro", escolha: "sair" }); })]) : null,
      ]),
    ]));
  }

  global.RAMAOrdem2ProcTela = {
    mestre: { cena: cenaDoMestre, quadro: quadroDoMestre, desafios: desafiosDoMestre, encontro: encontroDoMestre },
    jogador: jogador, resumoConfig: resumoConfig,
  };
})(window);
