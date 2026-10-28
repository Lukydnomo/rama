/* =====================================================================
   R.A.M.A. — aba Perigos da campanha (v2.48, Arquivos Secretos 5)
   ---------------------------------------------------------------------
   Os perigos complexos (AS5 p. 66–69): mecânica OPCIONAL da campanha,
   desligada por padrão — liga em Configurações → Mecânicas opcionais.
   Os cinco exemplos do livro são modelos; cada perigo aberto aqui é uma
   instância própria, com rodada, participantes, sucessos e falhas, que
   fica guardada entre as sessões.

   O mestre conduz: abre o perigo (a duração e o elemento são rolados
   aqui, uma vez), põe os participantes, começa cada rodada (no navio, a
   DT da rodada é rolada uma vez para todos), registra a ação de cada um
   (uma por rodada) com o resultado do teste rolado na ficha, rola o
   efeito do perigo e encerra. Soluções criativas aprovadas pelo mestre
   ficam como "solução da mesa" — nunca como ação oficial.

   DANO NÃO É PERDA: o registro diz qual é qual e marca o irredutível.
   Nada daqui é aplicado numa ficha — cada um aplica com a própria
   confirmação. As regras moram em js/ordem/perigos.js; esta tela aplica
   UMA operação por vez sobre uma cópia e grava o estado (rev + opId).
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil, UI = global.RAMAUI, el = U.el;
  function P() { return global.RAMAPerigos; }
  function D() { return global.RAMADados; }

  /* `total` lê expressões com modificador ("1d6+6"); `somar`, só dados. */
  function rolar(expr) { var r = D().total ? D().total(expr) : D().somar(expr); return r && r.ok !== false ? r : { total: 0, rolagens: [] }; }
  function linha(t, classe) { return el("p.t-mini" + (classe ? "." + classe : ""), { texto: t }); }
  function mini(texto, aoClicar, op) {
    var x = op || {};
    return el("button.r-botao.r-botao--mini" + (x.classe ? "." + x.classe : ""), { type: "button", texto: texto, disabled: !!x.desligado, title: x.dica || "", onclick: aoClicar });
  }
  function select(opcoes, valor, aoMudar, rotulo) {
    return el("select.r-selecao", { "aria-label": rotulo || "", onchange: function (ev) { aoMudar(ev.target.value); } },
      opcoes.map(function (o) { return el("option", { value: o.valor, texto: o.rotulo, selected: o.valor === valor }); }));
  }
  function rotulado(r, c) { return el("label.r-campo", {}, [el("span.r-rotulo", { texto: r }), c]); }
  function opId() { return "pg-" + U.uuid().replace(/-/g, "").slice(0, 20); }

  var NOMES_DO_ESTADO = { ativo: "no perigo", escapou: "escapou", preso: "preso", soterrado: "soterrado", caido: "caído" };

  function aba(ctx) {
    var alvo = el("div.pilha", {}, [UI.carregando("Consultando os perigos")]);
    var memoria = { estado: null, rev: 0, vista: null, mestre: ctx.ehMestre(), ocupado: false, aberto: "" };

    async function carregar(segundoPlano) {
      var r = await global.RAMAApi.lerPerigos(ctx.campanhaId, { segundoPlano: !!segundoPlano });
      if (!r.ok) { if (!segundoPlano) U.trocar(alvo, UI.erroDeTela(r, function () { carregar(); })); return; }
      receber(r);
      pintar();
    }
    function receber(r) {
      memoria.rev = U.inteiro(r.rev, 0);
      memoria.mestre = !!(r.dados && r.dados.mestre);
      memoria.estado = memoria.mestre ? P().normalizar(r.dados.estado) : null;
      memoria.vista = memoria.mestre ? null : r.dados.vista;
    }

    ctx.aoAtualizar("perigos", function () { if (!memoria.ocupado) carregar(true); });

    /* Uma operação: cópia → regra → gravação. */
    async function operar(perigoId, fn, sucesso) {
      if (memoria.ocupado) return false;
      var copia = P().normalizar(U.copiar(memoria.estado));
      var inst = perigoId ? P().perigo(copia, perigoId) : null;
      if (perigoId && !inst) { UI.avisoAtencao("O perigo não existe mais."); return false; }
      var r = fn(copia, inst);
      if (!r || !r.ok) { UI.avisoAtencao((r && r.motivo) || "Não deu para aplicar."); return false; }
      memoria.ocupado = true;
      try {
        var g = await global.RAMAApi.salvarPerigos(ctx.campanhaId, memoria.rev, opId(), copia);
        if (!g.ok) {
          if (g.erro === "conflito" && g.dados) {
            receber(g); pintar();
            UI.avisoAtencao("Outra janela mudou os perigos antes. A tela foi atualizada: confira e refaça.");
            return false;
          }
          UI.avisoDeFalha(g, "gravação dos perigos");
          return false;
        }
        receber(g);
        (r.avisos || []).forEach(function (a) { UI.aviso(a, { duracao: 9000 }); });
        if (sucesso) sucesso(r);
        pintar();
        return true;
      } finally {
        memoria.ocupado = false;
      }
    }

    function pintar() {
      U.trocar(alvo, memoria.mestre ? vistaDoMestre(memoria.estado) : vistaDoJogador(memoria.vista));
    }

    /* ---------------- jogador ---------------- */

    function vistaDoJogador(v) {
      if (!v || !v.ativo) return [UI.vazio({ titulo: "Sem perigos complexos", texto: "O mestre não ligou os perigos complexos nesta campanha." })];
      if (!v.perigos.length) return [UI.vazio({ titulo: "Nenhum perigo com você", texto: "Quando um personagem seu entrar num perigo complexo, ele aparece aqui." })];
      return v.perigos.map(function (i) {
        var m = P().modelo(i.modelo);
        return UI.painel(i.nome + " (VD " + m.vd + ")", el("div.pilha--curta", { class: "pilha" }, [
          linha("Objetivo: " + i.objetivo),
          linha(cabecalho(i)),
          el("ul.pilha--curta", { class: "pilha" }, i.participantes.map(function (p) {
            return el("li.t-mini", { texto: p.nome + (p.meu ? " (seu)" : "") + ": " + p.sucessos + " sucesso(s), " + NOMES_DO_ESTADO[p.estado] + (p.zona ? " · " + p.zona : "") });
          })),
          i.registro.length ? UI.recolhivel({ titulo: "Registro (" + i.registro.length + ")", conteudo: [el("ul.pilha--curta", { class: "pilha" }, i.registro.slice().reverse().map(function (r) {
            return el("li.t-mini", { texto: (r.rodada ? "R" + r.rodada + " · " : "") + r.texto });
          }))] }) : null,
          linha("Dano e perda são aplicados por você, na sua ficha, com a sua confirmação."),
        ].filter(Boolean)));
      });
    }

    function cabecalho(i) {
      var partes = [];
      if (i.encerrado) partes.push("Encerrado" + (i.encerrado.motivo ? " (" + i.encerrado.motivo + ")" : ""));
      else partes.push(i.rodada ? "Rodada " + i.rodada + (i.rodadasTotal ? " de " + i.rodadasTotal : "") : "Ainda não começou");
      if (i.modelo === "navio" && i.dtRodada) partes.push("DT de Reflexos da rodada: " + i.dtRodada);
      if (i.modelo === "predio") partes.push("Horda de " + P().NOMES_ELEMENTO[i.elemento] + ": " + i.pvHorda + " PV");
      if (i.modelo === "chuva") partes.push((P().AREAS_DA_CHUVA[i.area] || {}).nome + " — " + i.sucessosDoGrupo + "/" + (P().AREAS_DA_CHUVA[i.area] || {}).testes + " sucessos, " + i.falhasDoGrupo + "/3 falhas");
      if (i.modelo === "explosao" && i.desarmes) partes.push(i.desarmes + "/3 sucessos de desarme");
      return partes.join(" · ");
    }

    /* ---------------- mestre ---------------- */

    function vistaDoMestre(e) {
      var partes = [UI.painel("Perigos complexos", el("div.pilha--curta", { class: "pilha" }, [
        linha("Arquivos Secretos 5, p. 66–69. Uma cena por si só, resolvida com testes estendidos (OPRPG p. 77): cada personagem faz UMA ação por rodada; as ações são sugestões, e soluções criativas valem a critério do mestre. As ações pertencem ao perigo — não são usos novos de perícia."),
        el("label.r-marca", {}, [
          el("input", { type: "checkbox", checked: e.ativo, onchange: function (ev) {
            var sim = ev.target.checked;
            operar("", function (c) { return P().ligar(c, sim); }).then(function (ok) {
              if (!ok) { ev.target.checked = !sim; return; }
              if (!sim) UI.aviso("Perigos complexos desligados: a aba saiu da campanha. Nada foi apagado — para ligar de novo, Configurações → Mecânicas opcionais.", { duracao: 9000 });
              if (ctx.definirMecanica) ctx.definirMecanica("perigos", sim);
            });
          } }),
          el("span", { texto: "Usar perigos complexos nesta campanha" }),
        ]),
        e.ativo ? el("div.faixa", {}, [mini("Novo perigo complexo…", novoPerigo, { classe: "r-botao--principal" })]) : null,
      ].filter(Boolean)))];
      if (!e.ativo) return partes;
      if (!e.perigos.length) partes.push(UI.vazio({ titulo: "Nenhum perigo", texto: "Abra um dos cinco exemplos do livro: cada um vira um perigo próprio desta campanha." }));
      e.perigos.slice().reverse().forEach(function (i) { partes.push(painelDoPerigo(i)); });
      return partes;
    }

    function novoPerigo() {
      var chave = P().MODELOS[0].chave;
      var area = "pequena";
      var info = el("div.pilha--curta", { class: "pilha" });
      function pintarInfo() {
        var m = P().modelo(chave);
        U.trocar(info, [linha("VD " + m.vd + " · p. " + m.pagina + ". " + m.resumo), linha("Objetivo: " + m.objetivo), linha("Efeito: " + m.efeito),
          m.chave === "chuva" ? rotulado("Tamanho da área", select(Object.keys(P().AREAS_DA_CHUVA).map(function (k) { return { valor: k, rotulo: P().AREAS_DA_CHUVA[k].nome + " — " + P().AREAS_DA_CHUVA[k].testes + " testes" }; }), area, function (v) { area = v; })) : null,
          m.duracao || m.chave === "predio" ? linha("Ao abrir, a ficha rola " + [m.duracao ? "a duração (" + m.duracao + ")" : "", m.chave === "predio" ? "o elemento da horda (1d4)" : ""].filter(Boolean).join(" e ") + " — uma vez só.") : null]);
      }
      pintarInfo();
      UI.modal({ titulo: "Novo perigo complexo", conteudo: [el("div.pilha--curta", { class: "pilha" }, [
        rotulado("Exemplo do livro", select(P().MODELOS.map(function (m) { return { valor: m.chave, rotulo: m.nome + " (VD " + m.vd + ")" }; }), chave, function (v) { chave = v; pintarInfo(); })),
        info,
      ])], botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Abrir", classe: "r-botao--principal", aoClicar: function (fechar) {
          var m = P().modelo(chave);
          var sorteios = {};
          var notas = [];
          if (m.duracao) { var d = rolar(m.duracao); sorteios.duracao = d.total; notas.push("Duração: " + m.duracao + " = " + d.total + " rodadas."); }
          if (m.chave === "predio") { var e1 = rolar("1d4"); sorteios.elemento = e1.total; notas.push("Elemento (1d4 = " + e1.total + "): " + P().NOMES_ELEMENTO[P().ELEMENTOS_DA_HORDA[e1.total - 1]] + "."); }
          fechar();
          operar("", function (c) { var r = P().criar(c, chave, m.nome, sorteios, area); if (r.ok) r.avisos = notas; return r; }, function (r) { memoria.aberto = r.perigo.id; });
        } },
      ] });
    }

    function painelDoPerigo(i) {
      var m = P().modelo(i.modelo);
      var corpo = [
        linha(cabecalho(i) + (i.sorteioDuracao ? " · duração " + i.sorteioDuracao : "")),
        linha("Objetivo: " + m.objetivo),
        UI.recolhivel({ titulo: "Efeito e ações sugeridas", conteudo: [el("div.pilha--curta", { class: "pilha" }, [linha(m.efeito)].concat(m.acoes.map(function (a) {
          return linha(a.nome + " (" + a.teste + "): " + a.texto);
        })))] }),
        tabelaDeParticipantes(i),
        i.encerrado ? linha(i.encerrado.texto || "Perigo encerrado.", "t-aviso") : controlesDoPerigo(i),
        i.encerrado ? efeitosFinais(i) : null,
        UI.recolhivel({ titulo: "Registro (" + i.registro.length + ")", conteudo: [el("ul.pilha--curta", { class: "pilha" }, i.registro.slice().reverse().map(function (r) {
          return el("li.t-mini", { texto: (r.rodada ? "R" + r.rodada + " · " : "") + r.texto + (r.natureza ? " [" + r.natureza + (r.irredutivel ? ", irredutível" : "") + "]" : "") });
        }))] }),
      ];
      return UI.recolhivel({
        titulo: i.nome, extra: "VD " + m.vd + (i.encerrado ? " · encerrado" : i.rodada ? " · rodada " + i.rodada : ""),
        aberto: memoria.aberto === i.id || (!i.encerrado && !!i.rodada),
        aoAlternar: function (a) { if (a) memoria.aberto = i.id; },
        conteudo: [el("div.pilha--curta", { class: "pilha" }, corpo.filter(Boolean))],
      });
    }

    function tabelaDeParticipantes(i) {
      if (!i.participantes.length) return linha("Nenhum participante.");
      return el("ul.pilha--curta", { class: "pilha" }, i.participantes.map(function (p) {
        var marcas = [p.sucessos + " sucesso(s)", NOMES_DO_ESTADO[p.estado]];
        if (p.ultimaRodada === i.rodada && i.rodada) marcas.push("já agiu nesta rodada");
        if (p.caminho) marcas.push("+5 em correr e carregar (caminho)");
        if (p.protegidoAte >= i.rodada && i.rodada) marcas.push("protegido nesta rodada");
        if (p.metadeProximo) marcas.push("metade no próximo dano");
        if (p.dobroProximo) marcas.push("dobro no próximo dano");
        if (p.falhaAutomatica) marcas.push("falha automática no próximo Reflexos");
        if (p.protegido) marcas.push("protegido (Reflexos DT 20)");
        if (p.perdaAcumulada) marcas.push(p.perdaAcumulada + " PV perdidos — só curam depois do perigo");
        if (p.zona) marcas.push({ explosao: "zona de explosão", onda: "onda de choque", ileso: "ileso" }[p.zona]);
        return el("li.faixa", {}, [
          el("span.t-mini", { texto: p.nome + ": " + marcas.join(" · ") }),
          !i.encerrado ? mini("Ação…", function () { registrarAcao(i, p); }, { desligado: !i.rodada || p.ultimaRodada === i.rodada || p.estado === "escapou" }) : null,
          !i.encerrado && i.rodada ? mini("Efeito do perigo", function () { efeitoDoPerigo(i, p); }, { desligado: p.estado === "escapou" }) : null,
          !i.encerrado && !i.rodada ? mini("Tirar", function () { operar(i.id, function (c, ii) { return P().removerParticipante(ii, p.id); }); }) : null,
        ]);
      }));
    }

    function controlesDoPerigo(i) {
      var m = P().modelo(i.modelo);
      return el("div.faixa", {}, [
        mini("Participantes…", function () { adicionarParticipantes(i); }),
        mini(i.rodada ? "Próxima rodada" : "Começar (rodada 1)", function () {
          var d6 = 0;
          if (m.chave === "navio") { var r = rolar("1d6"); d6 = r.total; }
          operar(i.id, function (c, ii) { return P().novaRodada(ii, d6); });
        }, { desligado: !i.participantes.length || (i.rodadasTotal && i.rodada >= i.rodadasTotal) }),
        mini("Solução da mesa…", function () { solucao(i); }, { desligado: !i.rodada }),
        i.modelo === "predio" ? mini("Tempo esgotado: virar fuga", function () {
          var d = rolar("1d10+4");
          operar("", function (c) { var ii = P().perigo(c, i.id); var r = P().transicaoParaFuga(c, ii, d.total); if (r.ok) r.avisos = ["Fuga de Horda: duração 1d10+4 = " + d.total + " rodadas, com os mesmos participantes."]; return r; },
            function (r) { memoria.aberto = r.perigo.id; });
        }) : null,
        mini("Encerrar", function () {
          UI.confirmar({ titulo: "Encerrar " + i.nome + "?", texto: "O estado fica guardado; o efeito final (se o livro der um) aparece para rolar.", rotuloConfirmar: "Encerrar" }).then(function (sim) {
            if (sim) operar(i.id, function (c, ii) { return P().encerrar(ii, "fim"); });
          });
        }),
      ]);
    }

    function adicionarParticipantes(i) {
      var nome = UI.campo({ rotulo: "Participante sem ficha (opcional)", limite: 80 });
      var marcados = {};
      var daMesa = (ctx.personagens || []).filter(function (p) { return !i.participantes.some(function (q) { return q.personagemId === p.id; }); });
      UI.modal({ titulo: "Participantes de " + i.nome, conteudo: [el("div.pilha--curta", { class: "pilha" }, daMesa.map(function (p) {
        return el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { marcados[p.id] = ev.target.checked ? p : null; } }), el("span", { texto: p.nome })]);
      }).concat([nome]))], botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Adicionar", classe: "r-botao--principal", aoClicar: function (fechar) {
          fechar();
          operar(i.id, function (c, ii) {
            var ok = { ok: true, avisos: [] };
            Object.keys(marcados).forEach(function (k) { if (marcados[k]) { var r = P().adicionarParticipante(ii, marcados[k].nome, marcados[k].id); if (!r.ok) ok.avisos.push(r.motivo); } });
            if (nome.entrada.value.trim()) { var r2 = P().adicionarParticipante(ii, nome.entrada.value.trim(), ""); if (!r2.ok) ok.avisos.push(r2.motivo); }
            return ok;
          });
        } },
      ] });
    }

    function registrarAcao(i, p) {
      var m = P().modelo(i.modelo);
      var acao = m.acoes[0].chave;
      var passou = true, natural20 = false, porDez = false, area = false, doElemento = false;
      var aliado = "";
      var total = UI.campo({ rotulo: "Total do teste (rolado na ficha)", limite: 4 });
      var pericia = UI.campo({ rotulo: "Perícia usada (Chuva de Sangue)", limite: 40, valor: "Fortitude" });
      var dano = UI.campo({ rotulo: "Dano causado (Exterminar ou Usar Ritual)", limite: 4 });
      var corpo = el("div.pilha--curta", { class: "pilha" });
      function pintar() {
        var a = m.acoes.filter(function (x) { return x.chave === acao; })[0];
        var outros = i.participantes.filter(function (q) { return q.id !== p.id; });
        if (!aliado && outros.length) aliado = outros[0].id;
        U.trocar(corpo, [
          rotulado("Ação", select(m.acoes.map(function (x) { return { valor: x.chave, rotulo: x.nome + " — " + x.teste }; }), acao, function (v) { acao = v; pintar(); })),
          linha(a.texto),
          !P().semTeste(a) ? el("label.r-marca", {}, [el("input", { type: "checkbox", checked: passou, onchange: function (ev) { passou = ev.target.checked; } }), el("span", { texto: "Passou no teste" })]) : null,
          !P().semTeste(a) ? total : null,
          a.dobra ? el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { porDez = ev.target.checked; } }), el("span", { texto: "Passou por 10 ou mais, ou 20 natural (conta dois)" })]) : null,
          ["carregar", "libertar", "protegerAliado"].indexOf(a.conta) >= 0 && outros.length ? rotulado("Aliado", select(outros.map(function (q) { return { valor: q.id, rotulo: q.nome + " (" + q.sucessos + ")" }; }), aliado, function (v) { aliado = v; })) : null,
          i.modelo === "chuva" ? pericia : null,
          a.conta === "danoNaHorda" ? dano : null,
          a.conta === "danoNaHorda" ? el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { area = ev.target.checked; } }), el("span", { texto: "Efeito de área (+50%)" })]) : null,
          a.conta === "danoNaHorda" ? el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { doElemento = ev.target.checked; } }), el("span", { texto: "Dano do elemento da horda (imune)" })]) : null,
        ].filter(Boolean));
      }
      pintar();
      UI.modal({ titulo: p.nome + " — ação da rodada " + i.rodada, conteudo: [corpo], botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Registrar", classe: "r-botao--principal", aoClicar: function (fechar) {
          fechar();
          operar(i.id, function (c, ii) {
            return P().registrarAcao(ii, p.id, acao, { passou: passou, total: parseInt(total.entrada.value, 10) || 0, porDez: porDez, natural20: false,
              aliadoId: aliado, pericia: pericia.entrada.value, dano: parseInt(dano.entrada.value, 10) || 0, area: area, doElemento: doElemento });
          });
        } },
      ] });
    }

    /* O efeito do perigo: rola o que o plano pede e REGISTRA — quem
       aplica na ficha é o dono dela. */
    function efeitoDoPerigo(i, p) {
      var plano = P().planoDoEfeito(i, p.id);
      if (!plano.ok) { UI.avisoAtencao(plano.motivo); return; }
      var rolados = [];
      var falhouPorDez = false;
      var corpo = el("div.pilha--curta", { class: "pilha" }, plano.partes.map(function (x) {
        if (!x.rolar) return linha(x.texto);
        var r = rolar(x.rolar);
        var v = r.total;
        if (x.metade) v = Math.floor(v / 2);
        if (x.dobro) v = v * 2;
        rolados.push({ natureza: x.natureza, recurso: x.recurso, tipoDano: x.tipoDano, valor: v, expressao: x.rolar, irredutivel: !!x.irredutivel });
        return linha(x.texto + " → " + x.rolar + " = " + r.total + (x.metade ? " → metade " + v : "") + (x.dobro ? " → dobro " + v : "") + " (" + (x.natureza === "perda" ? "PERDA" : "dano") + ")");
      }).concat(i.modelo === "navio" ? [el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { falhouPorDez = ev.target.checked; } }), el("span", { texto: "Falhou no Reflexos por 10 ou mais: fica preso" })])] : []));
      UI.modal({ titulo: "Efeito do perigo — " + p.nome, conteudo: [corpo, linha("Registrado aqui; aplicado na ficha pelo dono dela (ou pelo mestre), com confirmação. Dano passa pelas resistências; perda, não.")], botoes: [
        { rotulo: "Fechar", classe: "r-botao--fantasma" },
        { rotulo: "Registrar", classe: "r-botao--principal", aoClicar: function (fechar) {
          fechar();
          if (falhouPorDez) rolados.push({ natureza: "", valor: 0, falhouPorDez: true });
          operar(i.id, function (c, ii) { return P().registrarEfeito(ii, p.id, rolados); });
        } },
      ] });
    }

    function efeitosFinais(i) {
      var partes = [];
      i.participantes.forEach(function (p) {
        var l = P().efeitoFinal(i, p.id);
        if (!l.length) return;
        partes.push(el("div.faixa", {}, [linha(p.nome + ": " + l.map(function (x) { return x.rolar + " " + (x.natureza === "perda" ? "de " + x.recurso + " (perda)" : "de " + x.tipoDano) + (x.irredutivel ? ", irredutível" : ""); }).join("; ")),
          mini("Rolar e registrar", function () {
            var rolados = l.map(function (x) { var r = rolar(x.rolar); return { natureza: x.natureza, recurso: x.recurso, tipoDano: x.tipoDano, valor: r.total, expressao: x.rolar, irredutivel: !!x.irredutivel }; });
            UI.aviso(p.nome + ": " + rolados.map(function (x) { return x.valor + (x.natureza === "perda" ? " " + x.recurso + " perdidos" : " de " + x.tipoDano); }).join(", ") + ".", { duracao: 9000 });
            operar(i.id, function (c, ii) { return P().registrarEfeito(ii, p.id, rolados); });
          })]));
      });
      return partes.length ? el("div.pilha--curta", { class: "pilha" }, [linha("Efeito final do livro, por participante:")].concat(partes)) : null;
    }

    function solucao(i) {
      var texto = UI.campo({ rotulo: "A solução criativa (aprovada pelo mestre)", tipo: "area", linhas: 3, limite: 300 });
      var sucessos = UI.campo({ rotulo: "Sucessos que a mesa decidiu (0 a 5)", limite: 1, valor: "0" });
      var quem = "";
      UI.modal({ titulo: "Solução da mesa", conteudo: [el("div.pilha--curta", { class: "pilha" }, [
        linha("Fica registrada como solução da mesa — não é uma ação oficial do perigo."),
        rotulado("Quem", select([{ valor: "", rotulo: "O grupo" }].concat(i.participantes.map(function (p) { return { valor: p.id, rotulo: p.nome }; })), quem, function (v) { quem = v; })),
        texto, sucessos,
      ])], botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Registrar", classe: "r-botao--principal", aoClicar: function (fechar) {
          fechar();
          operar(i.id, function (c, ii) { return P().solucaoAlternativa(ii, quem, texto.entrada.value, parseInt(sucessos.entrada.value, 10) || 0); });
        } },
      ] });
    }

    carregar();
    return alvo;
  }

  /* Ligar ou desligar de fora da aba (Configurações → Mecânicas
     opcionais). Lê, aplica e grava pelo caminho de sempre; um conflito
     relê e tenta mais uma vez. Só o mestre grava: o servidor confere. */
  async function definirAtivo(campanhaId, ativo) {
    var g = null;
    for (var tentativa = 0; tentativa < 2; tentativa++) {
      var r = await global.RAMAApi.lerPerigos(campanhaId);
      if (!r.ok) return r;
      if (!r.dados || !r.dados.mestre) return { ok: false, erro: "sem_permissao" };
      var estado = P().normalizar(r.dados.estado);
      if (!!estado.ativo === !!ativo) return { ok: true };
      P().ligar(estado, ativo);
      g = await global.RAMAApi.salvarPerigos(campanhaId, U.inteiro(r.rev, 0), opId(), estado);
      if (g.ok || g.erro !== "conflito") return g;
    }
    return g;
  }

  global.RAMACampanhaPerigos = { aba: aba, definirAtivo: definirAtivo };
})(window);
