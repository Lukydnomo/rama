/* =====================================================================
   R.A.M.A. — Ordem Paranormal RPG II · evolução e paranormal (v9.2)
   Experimental — regra do R.A.M.A.
   ---------------------------------------------------------------------
   As telas dos dois módulos opcionais (motor em js/ordem2/evolucao.js e
   js/ordem2/paranormal.js):

     na ficha     o painel "Nível e evolução" (escolha pendente com antes
                  e depois, registros com procedência, NEX como
                  metadado) e a aba "Paranormal" (rituais conhecidos,
                  conjurar com prévia, etapas do elaborado, efeitos
                  ativos, histórico); sem campanha, a própria ficha é a
                  mesa: liga o módulo e cria rituais
     na campanha  configuração (evolução e módulo paranormal), a
                  biblioteca do Mestre (editor completo, ensinar),
                  pendências, e por personagem: subir/definir nível,
                  aprovar habilidade, desfazer, encerrar efeitos

   Nada aqui decide regra: toda ação é UMA operação da mesa (opId). O
   selo "Experimental — regra do R.A.M.A." acompanha tudo que não está
   publicado nos playtests.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function UI() { return global.RAMAUI; }
  function K() { return global.RAMAOrdem2Catalogo; }
  function R() { return global.RAMAOrdem2; }
  function T() { return global.RAMAOrdem2Tela; }
  function J() { return global.RAMAOrdem2Jogo; }
  function EV() { return global.RAMAOrdem2Evolucao; }
  function P() { return global.RAMAOrdem2Paranormal; }
  function botao(t, fn, o) { return T().botao(t, fn, o); }
  function linha(t) { return el("p.t-mini", { texto: t }); }
  function selo(t) { return el("p.o2-selo", {}, [el("strong", { texto: P().SELO }), t ? el("span", { texto: " · " + t }) : null]); }
  function marca(rotulo, marcado, aoMudar, desab) { return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: !!marcado, disabled: !!desab, onchange: function (ev) { aoMudar(ev.currentTarget.checked); } }), el("span", { texto: rotulo })]); }
  function opcoes(mapa) { return Object.keys(mapa).map(function (k) { return { valor: k, rotulo: mapa[k] }; }); }
  function copiar(v) { return JSON.parse(JSON.stringify(v)); }
  function data(q) { return String(q || "").slice(0, 16).replace("T", " "); }

  /* =================================================================
     COMUM: o resumo de um ritual e o editor
     ================================================================= */
  var NOMES_RES = { normal: "Sucesso", critico: "Crítico", falha: "Falha", falhaCritica: "Falha crítica" };
  function descreverEfeito(f) {
    var quem = f.quem === "proprio" ? " (em quem conjura)" : "";
    if (f.tipo === "dano") return "Dano " + (f.danoTipo === "emocional" ? "emocional " : "") + (f.valor || "?") + quem;
    if (f.tipo === "cura") return "Recupera " + (f.valor || "?") + " " + f.recurso.toUpperCase() + quem;
    if (f.tipo === "condicao") return (R().NOMES_CONDICAO[f.condicao] || "condição") + quem;
    if (f.tipo === "passo" || f.tipo === "marcador") return (f.n > 0 ? "+" : "") + f.n + " passo " + ({ pericia: "na perícia", atributo: "no atributo", todos: "em todos os testes" }[f.alvoDado]) + (f.chave ? " " + f.chave : "") + (f.d20 ? " (pode chegar a d20)" : "") + (f.duracao ? " · " + P().DURACOES[f.duracao].toLowerCase() : "") + quem;
    if (f.tipo === "dado") return "+d" + (f.faces || "?") + " guardado" + (f.texto ? " (" + f.texto + ")" : "") + quem;
    return "O Mestre decide" + (f.texto ? ": " + f.texto : "");
  }
  function fichaDoRitual(r, cfg, extra) {
    var dt = r.dt !== null ? r.dt : cfg.dts[r.complexidade];
    var custo = r.custoPd !== null ? r.custoPd : cfg.custos[r.complexidade];
    var classe = r.classe === "experimental" ? "experimental" : r.classe === "procedimento" ? "procedimento de missão" : "consulta";
    return el("article.o2-ritual" + (r.classe !== "experimental" ? ".o2-ritual--fora" : ""), { dataset: { ritual: r.id } }, [
      el("header.o2-ritual__topo", {}, [
        el("h3.o2-tag-titulo", { texto: r.nome }),
        el("span.r-etiqueta", { texto: P().TIPOS[r.tipo] }),
        el("span.r-etiqueta" + (r.classe === "experimental" ? "" : ".r-etiqueta--aviso"), { texto: classe }),
        r.elementos.length ? el("span.o2-ritual__elementos", { texto: r.elementos.join(" · "), title: "O elemento descreve; não concede efeito sozinho." }) : null,
      ]),
      r.classe === "experimental" ? el("dl.o2-pares.o2-pares--linha", {}, [
        par("Modo", P().MODOS[r.modo] + " · " + P().COMPLEXIDADES[r.complexidade]),
        par("Ação", r.modo === "elaborado" ? (r.etapas.length || 1) + " etapa(s)" : r.acao),
        par("Teste", "DT " + dt + (r.dt === null ? " (pela complexidade)" : "")),
        par("Custo", custo + " PD" + (r.custoPv ? " + " + r.custoPv + " PV" : "")),
        par("Alvo", P().ALVOS[r.alvo]),
        par("Duração", P().DURACOES[r.duracao]),
        r.alcance ? par("Alcance", r.alcance) : null,
        r.tempo ? par("Tempo", r.tempo) : null,
      ]) : linha(r.classe === "procedimento" ? "Procedimento de missão: joga-se pelo desafio da cena (não pela conjuração livre)." : "Só para consulta: sem automação."),
      r.escopo ? linha("Escopo: " + r.escopo) : null,
      r.gatilho ? linha("Gatilho: " + r.gatilho) : null,
      r.componentes.length ? linha("Componentes: " + r.componentes.map(function (c) { return c.nome + (c.etapa ? " (etapa " + c.etapa + ")" : "") + (c.consome ? ", consumido" : ""); }).join("; ")) : null,
      r.modo === "elaborado" && r.etapas.length ? el("ol.o2-etapas", {}, r.etapas.map(function (t) { return el("li", { texto: t.nome + (t.acao ? " — " + t.acao : "") }); })) : null,
      r.classe === "experimental" ? el("ul.o2-ritual__efeitos", {}, P().RESULTADOS.map(function (k) {
        var l = r.efeitos[k];
        return el("li", {}, [el("strong", { texto: NOMES_RES[k] + ": " }), el("span", { texto: l.length ? l.map(descreverEfeito).join("; ") : k === "critico" ? "sem efeito próprio (vale o de sucesso; o Mestre é avisado)" : "não configurado — vai para o Mestre" })]);
      })) : null,
      r.notas ? el("p.o2-ritual__notas", { texto: r.notas }) : null,
      r.referencias.length ? linha("Referências: " + r.referencias.map(function (f) { return f.fonte + (f.pagina ? " p. " + f.pagina : "") + (f.nota ? " (" + f.nota + ")" : ""); }).join("; ")) : null,
      extra || null,
    ]);
  }
  function par(dt, dd) { return el("div", {}, [el("dt", { texto: dt }), el("dd", { texto: dd })]); }

  /* O editor de uma entrada (biblioteca do Mestre ou ficha local). */
  function abrirEditor(entrada, aoSalvar) {
    var st = P().normalizarEntrada(entrada ? copiar(entrada) : { nome: "Novo ritual" });
    var corpo = el("div.pilha.o2-editor-ritual");
    function campo(rot, chave, o) {
      o = o || {};
      return UI().campo(Object.assign({ rotulo: rot, valor: st[chave] === null || st[chave] === undefined ? "" : String(st[chave]), aoDigitar: !o.opcoes, aoMudar: function (v) { st[chave] = o.numero ? (String(v).trim() === "" ? (o.nulo ? null : 0) : U.inteiro(v, 0)) : v; if (o.redesenhar) desenhar(); } }, o.opcoes ? { tipo: "selecao", opcoes: o.opcoes } : o.numero ? { tipo: "numero" } : o.area ? { tipo: "area", linhas: 3 } : {}, o.limite ? { limite: o.limite } : {}, o.ajuda ? { ajuda: o.ajuda } : {}));
    }
    function listaDeLinhas(titulo, chave, novo, desenharLinha) {
      return el("fieldset.o2-editor__lista", {}, [
        el("legend", { texto: titulo }),
        el("div.pilha.pilha--curta", {}, st[chave].map(function (item, i) {
          return el("div.o2-criar__campos.o2-editor__linha", {}, desenharLinha(item, i).concat([botao("Remover", function () { st[chave].splice(i, 1); desenhar(); }, { classe: "r-botao--perigo" })]));
        })),
        st[chave].length < 10 ? botao("+ " + titulo.replace(/s$/, "").toLowerCase(), function () { st[chave].push(novo()); desenhar(); }) : null,
      ]);
    }
    function sub(item, chave, rot, o) {
      o = o || {};
      return UI().campo(Object.assign({ rotulo: rot, valor: item[chave] === null || item[chave] === undefined ? "" : String(item[chave]), aoDigitar: !o.opcoes, aoMudar: function (v) { item[chave] = o.numero ? U.inteiro(v, 0) : v; if (o.redesenhar) desenhar(); } }, o.opcoes ? { tipo: "selecao", opcoes: o.opcoes } : o.numero ? { tipo: "numero" } : {}));
    }
    function linhaEfeito(f) {
      var l = [sub(f, "tipo", "Tipo", { opcoes: opcoes(P().TIPOS_EFEITO), redesenhar: true })];
      if (f.tipo === "dano" || f.tipo === "cura") l.push(sub(f, "valor", "Valor (ex.: 1d6+1)"));
      if (f.tipo === "dano") l.push(sub(f, "danoTipo", "Dano", { opcoes: [{ valor: "fisico", rotulo: "Físico (PV)" }, { valor: "emocional", rotulo: "Emocional (PD)" }] }));
      if (f.tipo === "cura") l.push(sub(f, "recurso", "Recurso", { opcoes: [{ valor: "pv", rotulo: "PV" }, { valor: "pd", rotulo: "PD" }] }));
      if (f.tipo === "condicao") l.push(sub(f, "condicao", "Condição", { opcoes: P().CONDICOES.map(function (c) { return { valor: c, rotulo: R().NOMES_CONDICAO[c] || c }; }) }));
      if (f.tipo === "passo" || f.tipo === "marcador") {
        l.push(sub(f, "alvoDado", "Em", { opcoes: [{ valor: "pericia", rotulo: "Perícia" }, { valor: "atributo", rotulo: "Atributo" }, { valor: "todos", rotulo: "Todos os testes" }] }));
        l.push(sub(f, "chave", "Qual (chave)"));
        l.push(sub(f, "n", "Passos", { numero: true }));
        l.push(marca("Pode chegar a d20 (efeito paranormal)", f.d20, function (v) { f.d20 = v; }));
      }
      if (f.tipo === "dado" && !f.faces) f.faces = 4;
      if (f.tipo === "dado") { l.push(sub(f, "faces", "Dado", { opcoes: [4, 6, 8, 10, 12].map(function (n) { return { valor: String(n), rotulo: "d" + n }; }) })); }
      if (["passo", "marcador", "dado"].indexOf(f.tipo) >= 0) l.push(sub(f, "duracao", "Dura", { opcoes: [{ valor: "", rotulo: "A do ritual" }].concat(opcoes(P().DURACOES)) }));
      if (f.tipo !== "mestre") l.push(sub(f, "quem", "Em quem", { opcoes: [{ valor: "alvo", rotulo: "Alvo(s)" }, { valor: "proprio", rotulo: "Quem conjura" }] }));
      if (f.tipo === "mestre" || f.tipo === "dado" || f.tipo === "marcador") l.push(sub(f, "texto", f.tipo === "mestre" ? "O que o Mestre narra" : "Nota"));
      return l;
    }
    function desenhar() {
      var exp = st.classe === "experimental";
      U.trocar(corpo, [
        selo("entradas criadas pelo Mestre; nada vem de Ordem I."),
        el("div.o2-criar__campos", {}, [
          campo("Nome", "nome", { limite: 120 }),
          campo("Tipo", "tipo", { opcoes: opcoes(P().TIPOS) }),
          campo("Classe", "classe", { opcoes: opcoes(P().CLASSES), redesenhar: true }),
        ]),
        el("fieldset.o2-editor__lista", {}, [el("legend", { texto: "Elementos (descrevem; não concedem efeito)" }), el("div.faixa", {}, P().ELEMENTOS.map(function (x) { return marca(x, st.elementos.indexOf(x) >= 0, function (v) { st.elementos = st.elementos.filter(function (y) { return y !== x; }); if (v) st.elementos.push(x); }); }))]),
        exp ? el("div.o2-criar__campos", {}, [
          campo("Modo", "modo", { opcoes: opcoes(P().MODOS), redesenhar: true }),
          campo("Complexidade", "complexidade", { opcoes: opcoes(P().COMPLEXIDADES) }),
          st.modo === "imediato" ? campo("Ação", "acao", { limite: 60 }) : null,
          campo("Alvo", "alvo", { opcoes: opcoes(P().ALVOS) }),
          campo("Duração", "duracao", { opcoes: opcoes(P().DURACOES) }),
        ]) : null,
        el("div.o2-criar__campos", {}, [
          campo("Escopo", "escopo", { limite: 120 }), campo("Tempo", "tempo", { limite: 60 }), campo("Alcance", "alcance", { limite: 60 }), campo("Gatilho", "gatilho", { limite: 200 }),
        ]),
        exp ? el("div.o2-criar__campos", {}, [
          campo("DT (vazio = pela complexidade)", "dt", { numero: true, nulo: true }),
          campo("Custo em PD (vazio = pela complexidade)", "custoPd", { numero: true, nulo: true }),
          campo("Custo em PV", "custoPv", { numero: true }),
        ]) : null,
        exp && st.modo === "elaborado" ? listaDeLinhas("Etapas", "etapas", function () { return { nome: "Etapa", acao: "" }; }, function (t) { return [sub(t, "nome", "Etapa"), sub(t, "acao", "Ação")]; }) : null,
        exp && st.modo === "elaborado" ? el("div.faixa", {}, [marca("Teste em cada etapa (padrão: só na execução final)", st.testePorEtapa, function (v) { st.testePorEtapa = v; }), marca("Dano em quem conduz interrompe", st.interrompeComDano, function (v) { st.interrompeComDano = v; })]) : null,
        listaDeLinhas("Componentes", "componentes", function () { return { nome: "Componente", consome: false, etapa: 0, item: "" }; }, function (c) { return [sub(c, "nome", "Nome"), sub(c, "item", "Item da ficha (nome; vazio = narrativo)"), exp && st.modo === "elaborado" ? sub(c, "etapa", "Etapa (0 = execução)", { numero: true }) : null, marca("Consumido", c.consome, function (v) { c.consome = v; })].filter(Boolean); }),
        exp ? el("div.pilha", {}, P().RESULTADOS.map(function (k) {
          var l = st.efeitos[k];
          return el("fieldset.o2-editor__lista", {}, [
            el("legend", { texto: "Efeitos — " + NOMES_RES[k] + (k === "critico" ? " (vazio: vale o de sucesso e o Mestre é avisado)" : " (vazio: vai para o Mestre)") }),
            el("div.pilha.pilha--curta", {}, l.map(function (f, i) { return el("div.o2-criar__campos.o2-editor__linha", {}, linhaEfeito(f).concat([botao("Remover", function () { l.splice(i, 1); desenhar(); }, { classe: "r-botao--perigo" })])); })),
            l.length < 6 ? botao("+ efeito", function () { l.push(P().normalizarEfeito({ tipo: "mestre" })); desenhar(); }) : null,
          ]);
        })) : null,
        exp ? el("fieldset.o2-editor__lista", {}, [
          el("legend", { texto: "Forçar a conjuração (opcional, só neste ritual)" }),
          marca("Regra própria deste ritual (senão vale a da campanha)", !!st.forcar, function (v) { st.forcar = v ? { pv: 2, passos: 1, alternativa: "pv" } : null; desenhar(); }),
          st.forcar ? el("div.o2-criar__campos", {}, [
            sub(st.forcar, "alternativa", "Preço", { opcoes: [{ valor: "pv", rotulo: "Pagar PV" }, { valor: "pavor", rotulo: "Risco de pavor na falha" }, { valor: "componente", rotulo: "Consumir um componente" }] }),
            sub(st.forcar, "pv", "PV", { numero: true }),
            sub(st.forcar, "passos", "Passos (1–2)", { numero: true }),
          ]) : null,
        ]) : null,
        listaDeLinhas("Referências", "referencias", function () { return { fonte: "", pagina: "", nota: "" }; }, function (f) { return [sub(f, "fonte", "Fonte"), sub(f, "pagina", "Página"), sub(f, "nota", "Nota")]; }),
        campo("Notas", "notas", { area: true, limite: 2000 }),
      ]);
    }
    desenhar();
    UI().modal({ titulo: entrada ? "Editar — " + st.nome : "Nova entrada paranormal", classe: "o2-janela", largo: true, conteudo: [corpo], botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Salvar", classe: "r-botao--principal", aoClicar: function (f) { var n = P().normalizarEntrada(st); if (!n) { UI().avisoAtencao("Dê um nome."); return; } f(); aoSalvar(n); } },
    ] });
  }

  /* =================================================================
     A PRÉVIA DE CONJURAR (ficha)
     ================================================================= */
  function abrirConjuracao(ctx, ritual, final) {
    var x = ctx.ficha.ordem2;
    var e = J().estado(ctx);
    var cfg = P().configDaMesa(e);
    var st = { forcar: false, dado: "pericia", alvos: [] };
    var alvos = alvosPossiveis(ctx, e);
    if (ritual.alvo === "um" && alvos.length) st.alvos = [alvos[0].valor];
    var em = x.paranormal.emAndamento;
    var corpo = el("div.pilha");
    function desenhar() {
      var pv = P().previa(e, x, ritual, { forcar: st.forcar });
      U.trocar(corpo, [
        selo(),
        el("dl.o2-pares", {}, [
          par("Ação", final ? "Execução final (etapa " + Math.max(1, ritual.etapas.length) + ")" : pv.acao),
          par("Teste", pv.teste + " · DT " + pv.dt),
          par("Custo", pv.custoPd + " PD" + (pv.custoPv ? " + " + pv.custoPv + " PV" : "") + (ritual.modo === "elaborado" && !final ? " — cobrado só na execução final" : " — cobrado uma vez ao confirmar, também na falha")),
          par("Alvo", pv.alvo), par("Duração", pv.duracao),
          pv.componentes.length ? par("Componentes", pv.componentes.join("; ")) : null,
        ]),
        ritual.alvo === "um" && !(final && em) ? UI().campo({ rotulo: "Alvo", tipo: "selecao", valor: st.alvos[0] || "", opcoes: alvos, aoMudar: function (v) { st.alvos = [v]; } }) : null,
        ritual.alvo === "varios" && !(final && em) ? el("fieldset.o2-editor__lista", {}, [el("legend", { texto: "Alvos" })].concat(alvos.map(function (a) { return marca(a.rotulo, st.alvos.indexOf(a.valor) >= 0, function (v) { st.alvos = st.alvos.filter(function (y) { return y !== a.valor; }); if (v) st.alvos.push(a.valor); }); }))) : null,
        ritual.alvo === "area" ? linha("Área: o Mestre decide quem é afetado.") : null,
        (ritual.forcar || cfg.forcar.permitido) && (ritual.modo === "imediato" || final) ? el("fieldset.o2-editor__lista", {}, [
          el("legend", { texto: "Forçar (antes da rolagem, uma vez)" }),
          marca(rotuloForcar(ritual.forcar || cfg.forcar), st.forcar, function (v) { st.forcar = v; desenhar(); }),
          st.forcar ? UI().campo({ rotulo: "O passo vai para", tipo: "selecao", valor: st.dado, opcoes: [{ valor: "pericia", rotulo: "o dado da perícia" }, { valor: "atributo", rotulo: "o dado do atributo" }], aoMudar: function (v) { st.dado = v; } }) : null,
        ]) : null,
        pv.problemas.length ? el("ul.o2-erros", {}, pv.problemas.map(function (t) { return el("li", { texto: t }); })) : el("p.o2-ok", { texto: "Pré-requisitos atendidos." }),
      ]);
      return pv;
    }
    desenhar();
    UI().modal({ titulo: (final ? "Execução final — " : ritual.modo === "elaborado" ? "Começar — " : "Conjurar — ") + ritual.nome, classe: "o2-janela", conteudo: [corpo], botoes: [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: final ? "Executar" : ritual.modo === "elaborado" ? "Começar o ritual" : "Conjurar", classe: "r-botao--principal", aoClicar: function (f) {
        var pv = P().previa(e, x, ritual, { forcar: st.forcar });
        if (!pv.ok) { UI().avisoAtencao(pv.problemas[0]); return; }
        if (ritual.alvo === "varios" && !st.alvos.length && !final) { UI().avisoAtencao("Escolha os alvos."); return; }
        f();
        var o = final ? { tipo: "ritualEtapa", etapa: em.etapa, confirmar: true } : { tipo: "conjurar", ritual: ritual.id, alvos: ritual.alvo === "proprio" ? [] : st.alvos, confirmar: true };
        if (st.forcar) o.forcar = { dado: st.dado };
        J().operar(ctx, o);
      } },
    ] });
  }
  function rotuloForcar(fz) { return "Forçar: +" + fz.passos + " passo " + (fz.alternativa === "pv" ? "por " + fz.pv + " PV" : fz.alternativa === "pavor" ? "com risco de pavor na falha" : "consumindo um componente"); }
  function alvosPossiveis(ctx, e) {
    var l = [{ valor: J().pid(ctx), rotulo: (ctx.ficha.nome || "Este personagem") + " (você)" }];
    var d = J().dados();
    if (J().modo(ctx) === "campanha" && d && d.personagens) d.personagens.forEach(function (p) { if (p.id !== J().pid(ctx)) l.push({ valor: p.id, rotulo: p.nome }); });
    if (e && e.combate && e.combate.ativo) e.combate.participantes.filter(function (p) { return p.tipo === "npc"; }).forEach(function (p) { l.push({ valor: p.id, rotulo: p.nome + (p.situacao ? " (" + p.situacao + ")" : "") }); });
    return l;
  }

  /* =================================================================
     A ABA "PARANORMAL" DA FICHA
     ================================================================= */
  function abaFicha(ctx) {
    var x = ctx.ficha.ordem2;
    var m = J().modo(ctx);
    if (m === "carregando") return UI().carregando("Abrindo a mesa");
    var e = J().estado(ctx);
    var cfg = P().configDaMesa(e);
    var local = m !== "campanha";
    var pode = ctx.podeEditar() || J().ehMestre(ctx);
    var p = x.paranormal;
    var em = p.emAndamento;
    var ritEm = em ? p.rituais.filter(function (r) { return r.id === em.ritual; })[0] : null;
    var partes = [];
    partes.push(el("div.o2-paranormal-cab", {}, [
      selo(cfg.ativo ? "módulo LIGADO " + (local ? "nesta ficha" : "pelo Mestre") : "módulo DESLIGADO"),
      linha("Os playtests anunciam rituais, poderes e objetos amaldiçoados, mas não os publicam (Beta p. 2). Procedimentos de missão, como as runas de uma gruta, jogam-se pela cena e não pela conjuração livre. Este módulo é uma proposta da mesa: teste de " + K().ATRIBUTOS[cfg.atributo].nome + " + " + K().nomeDaPericia(x.perfilRegras, cfg.pericia, x.ambientacao) + ", DT/custo " + cfg.dts.simples + "/" + cfg.custos.simples + ", " + cfg.dts.intermediario + "/" + cfg.custos.intermediario + " e " + cfg.dts.complexo + "/" + cfg.custos.complexo + " PD (simples, intermediário, complexo)."),
    ]));
    if (em) {
      var total = ritEm ? Math.max(1, ritEm.etapas.length) : 1;
      var ultima = em.etapa >= total - 1;
      partes.push(UI().painel("Ritual em andamento", el("div.pilha", {}, [
        el("p", {}, [el("strong", { texto: (ritEm ? ritEm.nome : "?") + " — " }), el("span", { texto: em.interrompido ? "INTERROMPIDO (" + em.motivo + ")" : "etapa " + (em.etapa + 1) + " de " + total + ": " + (((ritEm && ritEm.etapas[em.etapa]) || {}).nome || "execução") })]),
        el("ol.o2-etapas", {}, (ritEm ? ritEm.etapas : []).map(function (t, i) { return el("li" + (i < em.etapa ? ".o2-etapas__feita" : i === em.etapa ? ".o2-etapas__atual" : ""), { "aria-current": i === em.etapa ? "step" : null, texto: (i < em.etapa ? "✓ " : i === em.etapa ? "▶ " : "") + t.nome + (t.acao ? " (" + t.acao + ")" : "") }); })),
        em.consumidos.length ? linha("Componentes já gastos: " + em.consumidos.join(", ")) : null,
        pode && !em.interrompido ? el("div.faixa", {}, [
          ultima ? botao("Execução final…", function () { abrirConjuracao(ctx, ritEm, true); }, { classe: "r-botao--principal", motivo: !cfg.ativo ? "Módulo desligado: o Mestre decide." : "" })
            : botao("Fazer a etapa " + (em.etapa + 1), function () { J().operar(ctx, { tipo: "ritualEtapa", etapa: em.etapa }); }, { classe: "r-botao--principal", motivo: !cfg.ativo ? "Módulo desligado: o Mestre decide." : "" }),
          botao("Interromper", function () { UI().confirmar({ titulo: "Interromper o ritual", texto: "Nenhum custo de execução é cobrado; componentes já gastos não voltam.", rotuloConfirmar: "Interromper" }).then(function (s) { if (s) J().operar(ctx, { tipo: "ritualInterromper" }); }); }),
        ]) : null,
        pode && em.interrompido ? botao("Descartar o ritual interrompido", function () { J().operar(ctx, { tipo: "ritualInterromper", descartar: true }); }) : null,
      ]), { classe: "o2-ritual-andamento" }));
    }
    partes.push(UI().painel("Rituais conhecidos", p.rituais.length ? el("div.o2-rituais", {}, p.rituais.map(function (r) {
      var acoes = el("div.faixa", {}, [
        r.classe === "experimental" && pode ? botao(r.modo === "elaborado" ? "Começar…" : "Conjurar…", function () { abrirConjuracao(ctx, r, false); }, { classe: "r-botao--principal", motivo: !cfg.ativo ? "O módulo experimental está desligado." : em && !em.interrompido ? "Há um ritual em andamento." : "" }) : null,
        local && ctx.podeEditar() ? botao("Editar", function () { abrirEditor(r, function (n) { n.id = r.id; n.origem = r.origem; x.paranormal.rituais = x.paranormal.rituais.map(function (y) { return y.id === r.id ? n : y; }); ctx.alterou(); ctx.atualizar(["bloco", "conteudo"]); }); }) : null,
        local && ctx.podeEditar() ? botao("Remover", function () { UI().confirmar({ titulo: "Remover " + r.nome, texto: "Tira a entrada desta ficha (o histórico fica).", rotuloConfirmar: "Remover", perigo: true }).then(function (s) { if (s) { x.paranormal.rituais = x.paranormal.rituais.filter(function (y) { return y.id !== r.id; }); ctx.alterou(); ctx.atualizar(["bloco", "conteudo"]); } }); }, { classe: "r-botao--perigo" }) : null,
      ]);
      return fichaDoRitual(r, cfg, acoes);
    })) : linha(local ? "Nenhum. Ligue o módulo e crie um ritual abaixo." : "Nenhum. O Mestre ensina rituais da biblioteca da campanha.")));
    if (p.ativos.length) partes.push(UI().painel("Efeitos ativos", el("ul.pilha.pilha--curta", {}, p.ativos.map(function (a) {
      return el("li", {}, [el("span", { texto: a.ritual + " · " + P().DURACOES[a.duracao].toLowerCase() + (a.efeitos.length ? " — " + a.efeitos.map(function (z) { return z.descricao; }).join("; ") : "") }), local && ctx.podeEditar() ? botao("Encerrar", function () { J().operar(ctx, { tipo: "efeitoRitualEncerrar", personagem: J().pid(ctx), efeito: a.id }); }) : el("span.t-mini", { texto: " (o Mestre finaliza ou encerra)" })]);
    }))));
    if (local && ctx.podeEditar()) partes.push(configuracaoLocal(ctx, e, cfg));
    var pend = (e.paranormal && e.paranormal.pendentes || []).filter(function (q) { return q.estado === "pendente" || q.resposta; });
    if (pend.length) partes.push(UI().painel("Com o Mestre", el("ul.pilha.pilha--curta", {}, pend.slice(-8).reverse().map(function (q) {
      return el("li", {}, [el("span", { texto: q.ritual + (q.resultado ? " (" + (NOMES_RES[q.resultado] || q.resultado).toLowerCase() + ")" : "") + ": " + (q.estado === "resolvido" ? q.resposta : q.texto || "aguardando o Mestre") }), local && q.estado === "pendente" ? botao("Resolver", function () { pedirResposta(function (t) { J().operar(ctx, { tipo: "pendenteRitual", id: q.id, resposta: t }); }); }) : null]);
    }))));
    if (p.historico.length) partes.push(UI().recolhivel({ titulo: "Histórico paranormal (" + p.historico.length + ")", conteudo: el("ol.o2-historico", {}, p.historico.slice().reverse().map(function (h) { return el("li", {}, [el("span.t-mini", { texto: data(h.quando) + " · " }), el("span", { texto: h.texto })]); })) }));
    return el("div.o2-aba", {}, partes);
  }
  function configuracaoLocal(ctx, e, cfg) {
    return UI().recolhivel({ titulo: "Configurar nesta ficha (sem campanha)", aberto: !cfg.ativo, conteudo: el("div.pilha", {}, [
      linha("Sem campanha, a ficha é a própria mesa: você liga o módulo e cria as entradas. Numa campanha, quem faz isso é o Mestre."),
      formConfigParanormal(cfg, function (c) { return J().operar(ctx, { tipo: "paranormalConfigurar", config: c }); }),
      botao("+ Nova entrada (ritual, poder ou objeto)", function () {
        abrirEditor(null, function (n) {
          J().operar(ctx, { tipo: "ritualSalvar", ritual: n }).then(function (r) {
            if (r && r.ok !== false) J().operar(ctx, { tipo: "ritualEnsinar", ritual: (r.resultado && r.resultado.ritual) || n.id, para: [J().pid(ctx)] }, { silencioso: true });
          });
        });
      }, { classe: "r-botao--principal" }),
    ]) });
  }
  function pedirResposta(fn) {
    var st = { t: "" };
    UI().modal({ titulo: "Resolver a pendência", classe: "o2-janela", conteudo: [UI().campo({ rotulo: "O que acontece", tipo: "area", linhas: 3, limite: 600, aoDigitar: true, aoMudar: function (v) { st.t = v; } })],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Resolver", classe: "r-botao--principal", aoClicar: function (f) { f(); fn(st.t); } }] });
  }

  /* O formulário da configuração do módulo (Mestre e ficha local). */
  function formConfigParanormal(cfg, salvar) {
    var st = copiar(cfg);
    var corpo = el("div.pilha");
    function desenhar() {
      U.trocar(corpo, [
        marca("Ligar o módulo paranormal experimental", st.ativo, function (v) { st.ativo = v; }),
        el("div.o2-criar__campos", {}, [
          UI().campo({ rotulo: "Atributo do teste", tipo: "selecao", valor: st.atributo, opcoes: K().ORDEM_ATRIBUTOS.map(function (k) { return { valor: k, rotulo: K().ATRIBUTOS[k].nome }; }), aoMudar: function (v) { st.atributo = v; } }),
          UI().campo({ rotulo: "Perícia do teste (chave)", valor: st.pericia, limite: 40, ajuda: "ocultismo = Ocultismo (Alpha) / Bruxaria (Beta)", aoDigitar: true, aoMudar: function (v) { st.pericia = v; } }),
        ]),
        el("div.o2-criar__campos", {}, ["simples", "intermediario", "complexo"].map(function (k) {
          return el("div.o2-criar__campos", {}, [
            UI().campo({ rotulo: P().COMPLEXIDADES[k] + ": DT", tipo: "numero", valor: String(st.dts[k]), aoDigitar: true, aoMudar: function (v) { st.dts[k] = U.inteiro(v, st.dts[k]); } }),
            UI().campo({ rotulo: P().COMPLEXIDADES[k] + ": PD", tipo: "numero", valor: String(st.custos[k]), aoDigitar: true, aoMudar: function (v) { st.custos[k] = U.inteiro(v, st.custos[k]); } }),
          ]);
        })),
        el("fieldset.o2-editor__lista", {}, [
          el("legend", { texto: "Forçar a conjuração (opcional)" }),
          marca("Permitir", st.forcar.permitido, function (v) { st.forcar.permitido = v; desenhar(); }),
          st.forcar.permitido ? el("div.o2-criar__campos", {}, [
            UI().campo({ rotulo: "Preço (um só, nunca dois por padrão)", tipo: "selecao", valor: st.forcar.alternativa, opcoes: [{ valor: "pv", rotulo: "Pagar PV" }, { valor: "pavor", rotulo: "Risco de pavor na falha" }, { valor: "componente", rotulo: "Consumir um componente" }], aoMudar: function (v) { st.forcar.alternativa = v; } }),
            UI().campo({ rotulo: "PV", tipo: "numero", valor: String(st.forcar.pv), aoDigitar: true, aoMudar: function (v) { st.forcar.pv = U.inteiro(v, 2); } }),
            UI().campo({ rotulo: "Passos (1–2)", tipo: "numero", valor: String(st.forcar.passos), aoDigitar: true, aoMudar: function (v) { st.forcar.passos = U.inteiro(v, 1); } }),
          ]) : null,
          linha("Antes da rolagem, uma vez; recusado se não puder pagar. d20 só vem de um efeito que o permita."),
        ]),
        botao("Salvar configuração", function () { salvar(st); }, { classe: "r-botao--principal" }),
      ]);
    }
    desenhar();
    return corpo;
  }

  /* =================================================================
     NÍVEL E EVOLUÇÃO (ficha)
     ================================================================= */
  function painelEvolucao(ctx) {
    var x = ctx.ficha.ordem2;
    var m = J().modo(ctx);
    var e = m === "carregando" ? null : J().estado(ctx);
    var cfg = EV().configDaMesa(e || {});
    var local = m !== "campanha";
    var pode = ctx.podeEditar() || J().ehMestre(ctx);
    var evo = x.evolucao;
    var pid = J().pid(ctx);
    var partes = [
      el("p.t-mini", { texto: "Nível 1 a 10 (Alpha p. 15; Beta p. 8). Os playtests não trazem tabela de evolução: " + (cfg.modo === "marcos" ? "esta mesa usa \"por marcos\" (" + P().SELO + ")." : "modo livre — o Mestre define nível e mudanças.") }),
    ];
    if (evo.pendente) partes.push(escolhaPendente(ctx, x, evo.pendente, local));
    if (local && ctx.podeEditar()) partes.push(el("div.o2-criar__campos", {}, [
      UI().campo({ rotulo: "Modo de evolução desta ficha", tipo: "selecao", valor: cfg.modo, opcoes: opcoes(EV().MODOS), aoMudar: function (v) { J().operar(ctx, { tipo: "evolucaoConfigurar", config: { modo: v } }); } }),
      cfg.modo === "marcos" ? botao("Subir de nível (marco)", function () { J().operar(ctx, { tipo: "subirNivel", personagem: pid, local: true }); }, { classe: "r-botao--principal", motivo: x.nivel >= 10 ? "Nível 10 é o máximo." : evo.pendente ? "Escolha a melhoria pendente." : "" })
        : UI().campo({ rotulo: "Definir nível (registra a mudança)", tipo: "selecao", valor: String(x.nivel), opcoes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return { valor: String(n), rotulo: String(n) }; }), aoMudar: function (v) { J().operar(ctx, { tipo: "definirNivel", personagem: pid, nivel: Number(v) }); } }),
    ]));
    partes.push(UI().campo({ rotulo: "NEX (só anotação; sem efeito nas regras)", valor: evo.nex, limite: 20, desabilitado: !pode, aoMudar: function (v) { J().operar(ctx, { tipo: "nex", valor: v }, { silencioso: true }); } }));
    if (evo.registros.length) partes.push(el("ol.o2-registros", {}, evo.registros.slice().reverse().map(function (r) {
      return el("li.o2-registro" + (r.desfeito ? ".o2-registro--desfeito" : ""), {}, [
        el("strong", { texto: "Nível " + r.nivelAntes + " → " + r.nivelDepois + (r.desfeito ? " (desfeito)" : "") }),
        el("span", { texto: " · " + (r.ganhos.map(function (g) { return EV().rotuloGanho(g, x); }).join("; ") || r.nota || "sem ganhos registrados") }),
        el("span.t-mini", { texto: " · " + (r.modo === "marcos" ? "por marcos" : "livre") + (r.procedencia && r.procedencia !== "marcos" ? " · " + r.procedencia : "") + " · " + data(r.quando) }),
        local && ctx.podeEditar() && !r.desfeito ? botao("Desfazer", function () { desfazer(ctx, pid, r); }) : null,
      ]);
    })));
    if (R().presetDesatualizado(x) && ctx.podeEditar()) partes.push(botao("Ver a atualização da ficha pronta…", function () { abrirAtualizacao(ctx); }));
    return UI().recolhivel({ titulo: "Nível e evolução" + (evo.pendente ? " · escolha pendente" : ""), aberto: !!evo.pendente, conteudo: el("div.pilha", {}, partes) });
  }
  function desfazer(ctx, pid, r) {
    UI().confirmar({ titulo: "Desfazer nível " + r.nivelAntes + " → " + r.nivelDepois, texto: "Tira só os ganhos deste registro. Dano antigo não volta; se os máximos caírem, os pontos atuais param no novo máximo.", rotuloConfirmar: "Desfazer" }).then(function (s) { if (s) J().operar(ctx, { tipo: "desfazerEvolucao", personagem: pid, registro: r.id }); });
  }
  function escolhaPendente(ctx, x, pend, local) {
    var pode = ctx.podeEditar() || J().ehMestre(ctx);
    if (pend.proposta) return el("div.o2-pendente", { role: "status" }, [el("span", { texto: "Nível " + pend.nivelDepois + ": você propôs " + pend.proposta.rotulo + " — aguardando o Mestre." })]);
    var st = { tipo: "pericia", chave: "", habilidade: { ref: "", nome: "", texto: "" } };
    var area = el("div.pilha");
    function desenhar() {
      var pv = EV().previa(x, { tipo: st.tipo, chave: st.chave, habilidade: st.habilidade }, pend.config);
      var versao = x.perfilRegras === "beta-vigilia" ? "beta" : "alpha";
      U.trocar(area, [
        el("p", {}, [el("strong", { texto: "Sobe ao nível " + pend.nivelDepois + "." }), el("span", { texto: " Escolha UMA melhoria (" + P().SELO + ")." })]),
        UI().campo({ rotulo: "Melhoria", tipo: "selecao", valor: st.tipo, opcoes: Object.keys(EV().TIPOS).map(function (k) { return { valor: k, rotulo: k === "pv" ? "+" + pend.config.pvPorEscolha + " PV máximos" : k === "pd" ? "+" + pend.config.pdPorEscolha + " PD máximos" : EV().TIPOS[k].replace("d12", "d" + pend.config.teto) }; }), aoMudar: function (v) { st.tipo = v; st.chave = ""; desenhar(); } }),
        st.tipo === "atributo" ? UI().campo({ rotulo: "Atributo", tipo: "selecao", valor: st.chave, opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(K().ORDEM_ATRIBUTOS.map(function (k) { return { valor: k, rotulo: K().ATRIBUTOS[k].nome + " d" + EV().permanenteAtributo(x, k) }; })), aoMudar: function (v) { st.chave = v; desenhar(); } }) : null,
        st.tipo === "pericia" ? UI().campo({ rotulo: "Perícia", tipo: "selecao", valor: st.chave, opcoes: [{ valor: "", rotulo: "Escolha…" }].concat(x.base.pericias.map(function (p) { return { valor: EV().chaveDaPericia(p), rotulo: R().nomeDaPericia(x, p) + " d" + EV().permanentePericia(x, p) }; })), aoMudar: function (v) { st.chave = v; desenhar(); } }) : null,
        st.tipo === "habilidade" ? el("div.o2-criar__campos", {}, [
          UI().campo({ rotulo: "Do catálogo", tipo: "selecao", valor: st.habilidade.ref, opcoes: [{ valor: "", rotulo: "Uma própria…" }].concat(Object.keys(K().HABILIDADES).filter(function (k) { var h = K().HABILIDADES[k]; return h.versao === versao || h.versao === "ambas"; }).map(function (k) { return { valor: k, rotulo: K().HABILIDADES[k].nome }; })), aoMudar: function (v) { st.habilidade.ref = v; desenhar(); } }),
          !st.habilidade.ref ? UI().campo({ rotulo: "Nome", valor: st.habilidade.nome, limite: 80, aoDigitar: true, aoMudar: function (v) { st.habilidade.nome = v; } }) : null,
          !st.habilidade.ref ? UI().campo({ rotulo: "Efeito", valor: st.habilidade.texto, limite: 1200, aoDigitar: true, aoMudar: function (v) { st.habilidade.texto = v; } }) : null,
        ]) : null,
        pv.ok ? el("p.o2-antes-depois", { texto: "Antes → depois: " + pv.rotulo + (pv.precisaAprovar && !local ? " (o Mestre aprova)" : "") }) : (st.chave || st.tipo === "habilidade" ? el("p.o2-motivo", { texto: pv.motivo }) : null),
        pode ? botao(st.tipo === "habilidade" && !local ? "Propor ao Mestre" : "Confirmar a melhoria", function () {
          var v = EV().previa(x, { tipo: st.tipo, chave: st.chave, habilidade: st.habilidade }, pend.config);
          if (!v.ok) { UI().avisoAtencao(v.motivo); return; }
          J().operar(ctx, { tipo: "escolherMelhoria", escolha: { tipo: st.tipo, chave: st.chave, habilidade: st.habilidade } });
        }, { classe: "r-botao--principal" }) : null,
      ]);
    }
    desenhar();
    return el("div.o2-pendente.o2-pendente--pedido", { role: "region", "aria-label": "Subida de nível pendente" }, [area]);
  }
  function abrirAtualizacao(ctx) {
    var x = ctx.ficha.ordem2;
    var p = EV().previaAtualizacao(x);
    if (!p.ok) { UI().avisoAtencao(p.motivo); return; }
    UI().modal({ titulo: "Atualizar da ficha pronta", classe: "o2-janela", conteudo: [el("div.pilha", {}, [
      linha("Os valores impressos passam para a versão nova. Registros de evolução, histórico, dano, lesões e itens ficam como estão; a mudança vai para o histórico."),
      p.diferencas.length ? el("ul", {}, p.diferencas.map(function (t) { return el("li", { texto: t }); })) : linha("Sem diferenças nos números."),
    ])], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Atualizar", classe: "r-botao--principal", aoClicar: function (f) { var r = EV().aplicarAtualizacao(x, true); f(); if (!r.ok) { UI().avisoAtencao(r.motivo); return; } ctx.alterou(); ctx.redesenhar(); UI().avisoOk("Ficha atualizada; registros preservados."); } }] });
  }

  /* =================================================================
     NA CAMPANHA (o Mestre)
     m = { estado, mestre, pcs, operar }
     ================================================================= */
  function mestreConfig(m) {
    var e = m.estado;
    var cfgE = EV().configDaMesa(e);
    var stE = copiar(cfgE);
    return el("div.pilha", {}, [
      UI().painel("Evolução", el("div.pilha", {}, [
        linha("Nível 1 a 10 e patamar à parte (campo da ficha); NEX é só anotação. Os playtests não trazem tabela de evolução."),
        el("div.o2-criar__campos", {}, [
          UI().campo({ rotulo: "Modo", tipo: "selecao", valor: stE.modo, opcoes: opcoes(EV().MODOS), aoMudar: function (v) { stE.modo = v; } }),
          UI().campo({ rotulo: "PV por escolha", tipo: "numero", valor: String(stE.pvPorEscolha), aoDigitar: true, aoMudar: function (v) { stE.pvPorEscolha = U.inteiro(v, 2); } }),
          UI().campo({ rotulo: "PD por escolha", tipo: "numero", valor: String(stE.pdPorEscolha), aoDigitar: true, aoMudar: function (v) { stE.pdPorEscolha = U.inteiro(v, 2); } }),
          UI().campo({ rotulo: "Teto do passo", tipo: "selecao", valor: String(stE.teto), opcoes: [8, 10, 12].map(function (n) { return { valor: String(n), rotulo: "d" + n }; }), aoMudar: function (v) { stE.teto = Number(v); } }),
        ]),
        selo("\"por marcos\": o Mestre confirma um nível; quem joga escolhe uma melhoria. Nada é inferido dos presets."),
        botao("Salvar evolução", function () { m.operar({ tipo: "evolucaoConfigurar", config: stE }); }, { classe: "r-botao--principal" }),
      ])),
      UI().painel("Módulo paranormal", el("div.pilha", {}, [
        selo("desligado por padrão. Desligar bloqueia conjurações novas e preserva rituais, histórico e efeitos ativos."),
        formConfigParanormal(P().configDaMesa(e), function (c) { m.operar({ tipo: "paranormalConfigurar", config: c }); }),
      ])),
    ]);
  }
  function mestreBiblioteca(m) {
    var e = m.estado;
    var par = e.paranormal || { biblioteca: [], pendentes: [], historico: [] };
    var cfg = P().configDaMesa(e);
    var pend = par.pendentes.filter(function (q) { return q.estado === "pendente"; });
    function nomePc(id) { var p = m.pcs.filter(function (x) { return x.id === id; })[0]; return p ? p.nome : "?"; }
    return el("div.pilha", {}, [
      selo(cfg.ativo ? "módulo ligado" : "módulo desligado (a biblioteca e as cópias nas fichas ficam)"),
      pend.length ? UI().painel("Pendências de rituais (" + pend.length + ")", el("ul.pilha.pilha--curta", {}, pend.map(function (q) {
        return el("li.o2-pendente", {}, [el("span", { texto: nomePc(q.quem) + " · " + q.ritual + " (" + (NOMES_RES[q.resultado] || q.resultado) + "): " + q.texto + (q.alvos.length ? " Alvos: " + q.alvos.map(nomePc).join(", ") + "." : "") }), botao("Resolver…", function () { pedirResposta(function (t) { m.operar({ tipo: "pendenteRitual", id: q.id, resposta: t }); }); }, { classe: "r-botao--principal" })]);
      }))) : null,
      UI().painel("Biblioteca da campanha (só o Mestre vê)", el("div.pilha", {}, [
        botao("+ Nova entrada", function () { abrirEditor(null, function (n) { m.operar({ tipo: "ritualSalvar", ritual: n }); }); }, { classe: "r-botao--principal" }),
        par.biblioteca.length ? el("div.o2-rituais", {}, par.biblioteca.map(function (r) {
          return fichaDoRitual(r, cfg, el("div.faixa", {}, [
            el("span.t-mini", { texto: "v" + r.versao }),
            botao("Editar", function () { abrirEditor(r, function (n) { n.id = r.id; m.operar({ tipo: "ritualSalvar", ritual: n }); }); }),
            botao("Ensinar…", function () { ensinar(m, r); }, { motivo: m.pcs.length ? "" : "Nenhum personagem na campanha." }),
            botao("Remover", function () { UI().confirmar({ titulo: "Remover " + r.nome, texto: "Sai da biblioteca; as cópias já ensinadas ficam nas fichas.", rotuloConfirmar: "Remover", perigo: true }).then(function (s) { if (s) m.operar({ tipo: "ritualRemover", id: r.id }); }); }, { classe: "r-botao--perigo" }),
          ]));
        })) : linha("Vazia. Procedimentos de missão (runas, chamas, objetos) podem entrar como \"procedimento\" ou \"consulta\": ficam registrados sem virar conjuração."),
      ])),
      par.historico.length ? UI().recolhivel({ titulo: "Histórico paranormal da mesa", conteudo: el("ol.o2-historico", {}, par.historico.slice().reverse().map(function (h) { return el("li", {}, [el("span.t-mini", { texto: data(h.quando) + " · " }), el("span", { texto: h.texto })]); })) }) : null,
    ]);
  }
  function ensinar(m, r) {
    var st = { para: [] };
    UI().modal({ titulo: "Ensinar " + r.nome, classe: "o2-janela", conteudo: [el("div.pilha", {}, [linha("Uma CÓPIA vai para cada ficha (exporta junto); mudar a biblioteca depois não muda a cópia — ensine de novo para atualizar.")].concat(m.pcs.map(function (p) { return marca(p.nome, false, function (v) { st.para = st.para.filter(function (y) { return y !== p.id; }); if (v) st.para.push(p.id); }); })))],
      botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Ensinar", classe: "r-botao--principal", aoClicar: function (f) { if (!st.para.length) { UI().avisoAtencao("Para quem?"); return; } f(); m.operar({ tipo: "ritualEnsinar", ritual: r.id, para: st.para }); } }] });
  }
  /* O bloco de cada personagem na aba Personagens do Mestre. */
  function mestrePersonagem(m, p) {
    var x = p.resumo || {};
    var evo = x.evolucao || { registros: [] };
    var par = x.paranormal || { rituais: [], ativos: [] };
    var cfg = EV().configDaMesa(m.estado);
    var partes = [];
    partes.push(el("div.faixa", {}, [
      cfg.modo === "marcos" ? botao("Subir nível (marco)", function () { m.operar({ tipo: "subirNivel", personagem: p.id }); }, { motivo: x.nivel >= 10 ? "Nível 10 é o máximo." : evo.pendente ? "Escolha pendente." : "" })
        : botao("Definir nível…", function () { definirNivel(m, p, x.nivel || 1); }),
      evo.pendente ? el("span.r-etiqueta.r-etiqueta--aviso", { texto: "nível " + evo.pendente.nivelDepois + ": " + (evo.pendente.proposta ? "propõe " + evo.pendente.proposta : "escolhendo") }) : null,
      evo.pendente && evo.pendente.proposta ? botao("Aprovar", function () { m.operar({ tipo: "aprovarHabilidade", personagem: p.id }); }, { classe: "r-botao--principal" }) : null,
      evo.pendente && evo.pendente.proposta ? botao("Recusar", function () { m.operar({ tipo: "aprovarHabilidade", personagem: p.id, aprovar: false }); }) : null,
      evo.pendente ? botao("Cancelar subida", function () { m.operar({ tipo: "cancelarSubida", personagem: p.id }); }) : null,
    ]));
    var vivos = (evo.registros || []).filter(function (r) { return !r.desfeito; });
    if (vivos.length) partes.push(UI().recolhivel({ titulo: "Evolução (" + vivos.length + " registro(s))", conteudo: el("ul.pilha.pilha--curta", {}, vivos.slice().reverse().map(function (r) {
      return el("li", {}, [el("span", { texto: "Nível " + r.nivelAntes + " → " + r.nivelDepois + ": " + (r.ganhos || "—") + " · " + r.quando }), botao("Desfazer", function () { UI().confirmar({ titulo: "Desfazer", texto: "Tira só os ganhos deste registro; se outro depender dele, o motor pede para desfazer aquele antes. Dano antigo não volta.", rotuloConfirmar: "Desfazer" }).then(function (s) { if (s) m.operar({ tipo: "desfazerEvolucao", personagem: p.id, registro: r.id }); }); })]);
    })) }));
    if (par.emAndamento) partes.push(el("p.t-mini", {}, [el("span", { texto: "Ritual em andamento: " + par.emAndamento.ritual + (par.emAndamento.interrompido ? " (interrompido: " + par.emAndamento.motivo + ")" : " · etapa " + (par.emAndamento.etapa + 1) + "/" + par.emAndamento.total) + " " }), !par.emAndamento.interrompido ? botao("Interromper", function () { m.operar({ tipo: "ritualInterromper", personagem: p.id }); }) : botao("Descartar", function () { m.operar({ tipo: "ritualInterromper", personagem: p.id, descartar: true }); })]));
    if (par.ativos && par.ativos.length) partes.push(el("ul.pilha.pilha--curta", {}, par.ativos.map(function (a) {
      return el("li", {}, [el("span", { texto: "Efeito ativo: " + a.ritual + (a.descricao ? " — " + a.descricao : "") + " " }), botao("Finalizar", function () { m.operar({ tipo: "efeitoRitualEncerrar", personagem: p.id, efeito: a.id, como: "finalizar" }); }), botao("Encerrar", function () { m.operar({ tipo: "efeitoRitualEncerrar", personagem: p.id, efeito: a.id }); })]);
    })));
    if (par.rituais && par.rituais.length) partes.push(linha("Rituais: " + par.rituais.map(function (r) { return r.nome; }).join(", ")));
    return el("div.pilha.pilha--curta.o2-mesa__evolucao", {}, partes);
  }
  function definirNivel(m, p, atual) {
    var st = { n: atual, nota: "" };
    UI().modal({ titulo: "Nível de " + p.nome + " (modo livre)", classe: "o2-janela", conteudo: [el("div.pilha", {}, [
      UI().campo({ rotulo: "Nível", tipo: "selecao", valor: String(atual), opcoes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return { valor: String(n), rotulo: String(n) }; }), aoMudar: function (v) { st.n = Number(v); } }),
      UI().campo({ rotulo: "Nota (o que muda na ficha)", limite: 300, aoDigitar: true, aoMudar: function (v) { st.nota = v; } }),
      linha("Modo livre: só o nível e a nota são registrados; as mudanças na ficha você faz à mão."),
    ])], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Definir", classe: "r-botao--principal", aoClicar: function (f) { f(); m.operar({ tipo: "definirNivel", personagem: p.id, nivel: st.n, nota: st.nota }); } }] });
  }

  global.RAMAOrdem2ParanormalTela = {
    abrirEditor: abrirEditor, fichaDoRitual: fichaDoRitual,
    ficha: { aba: abaFicha, evolucao: painelEvolucao },
    mestre: { config: mestreConfig, biblioteca: mestreBiblioteca, personagem: mestrePersonagem },
  };
  global.RAMASecaoOrdem2Paranormal = { aba: abaFicha };
})(window);
