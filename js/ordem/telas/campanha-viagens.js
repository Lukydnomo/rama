/* =====================================================================
   R.A.M.A. — aba Viagens da campanha (Arquivos Secretos 11)
   ---------------------------------------------------------------------
   As regras opcionais de viagem do AS11 (Mestrando nas Estradas,
   p. 36–55) e a missão Carcaças Vermelhas (p. 60–91), como mecânica
   OPCIONAL da campanha de Ordem — liga em Configurações → Mecânicas
   opcionais. Ligada, o mestre prepara uma viagem livre ou inicia os
   controles da missão; os jogadores veem o que foi liberado e fazem as
   próprias operações (dados de caçada, Sonnenblume, teste de passageiro,
   pessoa querida).

   O painel do dia a dia é o da viagem atual: etapa, veículos e
   ocupantes, autonomia, encontro pendente e as próximas ações; com a
   missão, os controles da cena atual. Toda operação vai ao servidor com
   um opId (js/ordem/viagens.js aplica lá, com os dados rolados lá):
   repetir não rola nem cobra de novo, e cada linha do histórico pode ser
   desfeita pelo mestre com os efeitos dela.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil, UI = global.RAMAUI, el = U.el;
  function V() { return global.RAMAViagens; }

  function opId() { return "vg-" + U.uuid().replace(/-/g, "").slice(0, 24); }
  function linha(t, classe) { return el("p.t-mini" + (classe ? "." + classe : ""), { texto: t }); }
  function mini(texto, aoClicar, op) {
    var x = op || {};
    return el("button.r-botao.r-botao--mini" + (x.classe ? "." + x.classe : ""), { type: "button", texto: texto, disabled: !!x.desligado, title: x.dica || "", "aria-label": x.rotulo || null, onclick: aoClicar });
  }
  function selecao(opcoes, valor, aoMudar, rotulo) {
    return el("select.r-selecao", { "aria-label": rotulo || "", onchange: function (ev) { aoMudar(ev.target.value); } },
      opcoes.map(function (o) { return el("option", { value: o.valor, texto: o.rotulo, selected: String(o.valor) === String(valor) }); }));
  }
  function numero(rotulo, valor) {
    var c = el("input.r-entrada.r-entrada--numero.vg-numero", { type: "text", inputmode: "numeric", "aria-label": rotulo, placeholder: rotulo, value: valor === undefined || valor === null ? "" : String(valor), maxlength: 4 });
    return c;
  }
  function inteiroDe(entrada) { var n = parseInt(String(entrada.value).trim(), 10); return isFinite(n) ? n : null; }
  function grupo(titulo, filhos) { return el("div.vg-grupo.pilha--curta", { class: "pilha" }, [titulo ? el("h3.vg-grupo__titulo", { texto: titulo }) : null].concat(filhos)); }
  function ref(p) { return "Arquivos Secretos 11, p. " + p; }
  var NOMES_ESTADO = { ok: "rodando", oficina: "na oficina", estrada: "conserto na estrada", perdaTotal: "perda total", consumido: "consumido pelas chamas" };

  function aba(ctx) {
    var alvo = el("div.pilha.vg", {}, [UI.carregando("Consultando as viagens", { forma: "lista", retrato: false, etiquetas: 2, linhas: 2, tamanho: "medio" })]);
    var memoria = { mestre: ctx.ehMestre(), estado: null, vista: null, vinculados: {}, personagens: [], meus: [], veiculosOperacionais: {}, rev: 0, ocupado: false, abertos: {} };

    async function carregar(segundoPlano) {
      var r = await global.RAMAApi.lerViagens(ctx.campanhaId, { segundoPlano: !!segundoPlano, incluirVeiculos: ctx.ehMestre() });
      if (!r.ok) { if (!segundoPlano) U.trocar(alvo, UI.erroDeTela(r, function () { carregar(); })); return; }
      receber(r);
      pintar();
    }
    function receber(r) {
      var d = r.dados || {};
      memoria.rev = U.inteiro(r.rev, 0);
      memoria.mestre = !!d.mestre;
      memoria.estado = d.mestre ? V().normalizar(d.estado) : null;
      memoria.vista = d.mestre ? null : d.vista;
      memoria.vinculados = d.vinculados || {};
      memoria.personagens = d.personagens || [];
      memoria.meus = d.meus || [];
      if (d.veiculosOperacionais) memoria.veiculosOperacionais = d.veiculosOperacionais;
    }

    ctx.aoAtualizar("viagens", function () { if (!memoria.ocupado) carregar(true); });

    /* Uma operação no servidor. O texto do resultado vira aviso. */
    async function operar(op, sucesso) {
      if (memoria.ocupado) return null;
      memoria.ocupado = true;
      try {
        var r = await global.RAMAApi.operarViagem(ctx.campanhaId, opId(), op);
        if (!r.ok) {
          if (r.erro === "operacao_recusada") UI.avisoAtencao(r.motivo || "O servidor recusou a operação.");
          else if (r.erro === "suplemento_desligado") UI.avisoAtencao("O Arquivos Secretos 11 está desligado nos suplementos desta campanha: dá para consultar e desligar, mas não operar.");
          else UI.avisoDeFalha(r, "operação da viagem");
          return null;
        }
        receber(r);
        var res = r.resultado || {};
        if (res.texto) UI.aviso(res.texto, { duracao: 9000 });
        if (sucesso) sucesso(res.resultado || {}, res);
        pintar();
        return r;
      } finally {
        memoria.ocupado = false;
      }
    }

    function pintar() {
      var foco = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.foco : "";
      U.trocar(alvo, memoria.mestre ? vistaDoMestre(memoria.estado) : vistaDoJogador(memoria.vista));
      if (foco) { var f = alvo.querySelector('[data-foco="' + foco + '"]'); if (f) f.focus(); }
    }

    function nome(pid, padrao) {
      var p = memoria.personagens.filter(function (x) { return x.id === pid; })[0];
      return p ? p.nome : (padrao || "Personagem");
    }
    function quem(p) { return p && (p.personagemId ? nome(p.personagemId, p.nome) : p.nome) || "—"; }

    /* =============================================================
       JOGADOR
       ============================================================= */

    function vistaDoJogador(v) {
      if (!v || !v.ativo) return [UI.vazio({ titulo: "Sem viagens", texto: "O mestre não ligou as viagens nesta campanha." })];
      if (!v.viagem) return [UI.vazio({ titulo: "Nenhuma viagem ainda", texto: "Quando o mestre preparar a viagem, o itinerário e os veículos aparecem aqui." })];
      var vg = v.viagem;
      var partes = [painelDoResumo(vg, false)];
      if (vg.carcacas) partes.push(painelDaMissaoJogador(vg));
      partes.push(painelDeEtapas(vg, false));
      partes.push(painelDeVeiculos(vg, false));
      if (vg.encontros.length || vg.acidentes.length || vg.registros.length) partes.push(painelDeEventos(vg, false));
      partes.push(painelDoHistorico(v.historico || [], false));
      return partes;
    }

    function painelDaMissaoJogador(vg) {
      var cv = vg.carcacas;
      var meus = cv.meus || [];
      var corpo = [
        el("div.vg-contador", { role: "status", "aria-live": "polite" }, [el("span.vg-contador__rotulo", { texto: "Contador de perseguição" }), el("strong.vg-contador__valor", { texto: String(cv.perseguicao) }), el("span.t-mini", { texto: "de 1 a 10" })]),
        linha("Cena atual: " + (V().POR_CENA[cv.cena] || {}).nome + "."),
        grupo("Dados de caçada", cv.agentes.map(function (pid) {
          return linha(nome(pid) + (meus.indexOf(pid) >= 0 ? " (seu)" : "") + ": " + (cv.caca[pid] || 0) + " dado(s). Cada um dá +1d4 num teste, ou +1d6 contra um Carcaça Vermelha; gaste no resultado do teste, na sua ficha.");
        })),
      ];
      if (cv.cenasVistas.indexOf(3) >= 0 && !cv.encerrada) corpo.push(cardapio(cv, meus));
      if (cv.confronto) corpo.push(painelDoConfronto(vg, false));
      if (cv.desfecho) corpo.push(linha("Desfecho: " + (cv.desfecho.resultado === "vitoria" ? "vitória" : "derrota") + (cv.desfecho.texto ? " — " + cv.desfecho.texto : "") + "."));
      if (cv.encerrada) corpo.push(linha("A missão terminou: os pontos temporários do Sonnenblume expiraram."));
      return UI.painel("Carcaças Vermelhas", el("div.pilha", {}, corpo));
    }

    function cardapio(cv, podem) {
      var linhas = podem.map(function (pid) {
        var ja = cv.sonnenblume[pid];
        if (ja) {
          var item = V().CARDAPIO.filter(function (c) { return c.chave === ja.item; })[0];
          return linha(nome(pid) + " comeu " + (item ? item.nome : ja.item) + (ja.valor ? " (" + ja.valor + ")" : "") + ".");
        }
        var escolha = V().CARDAPIO[0].chave;
        return el("div.faixa", {}, [
          el("span.t-mini", { texto: nome(pid) + ":" }),
          selecao(V().CARDAPIO.map(function (c) { return { valor: c.chave, rotulo: c.nome + " — " + c.efeito }; }), escolha, function (x) { escolha = x; }, "Prato de " + nome(pid)),
          mini("Alimentar-se", function () { operar({ tipo: "sonnenblume", personagemId: pid, item: escolha }); }),
        ]);
      });
      if (!linhas.length) return null;
      return grupo("Cardápio do Sonnenblume (" + ref(77) + ")", [linha("Uma escolha por agente, como ação de alimentar-se. Os pontos temporários vão para a ficha com a origem e expiram no fim da missão (ou ao serem consumidos).")].concat(linhas));
    }

    /* =============================================================
       MESTRE
       ============================================================= */

    function vistaDoMestre(e) {
      var partes = [painelDeControle(e)];
      if (!e.ativo) return partes;
      var vg = V().viagemAtual(e);
      if (!vg) {
        partes.push(UI.vazio({ titulo: "Nenhuma viagem preparada", texto: "Prepare uma viagem livre (itinerário ou trecho a trecho) ou inicie a missão Carcaças Vermelhas." }));
        return partes;
      }
      partes.push(painelDoResumo(vg, true));
      if (vg.carcacas) partes.push(painelDaMissao(vg));
      partes.push(painelDeEtapas(vg, true));
      partes.push(painelDeVeiculos(vg, true));
      partes.push(painelDeEventos(vg, true));
      partes.push(painelDoHistorico(e.historico.filter(function (h) { return !h.viagem || h.viagem === vg.id; }), true));
      return partes;
    }

    function painelDeControle(e) {
      var corpo = [
        linha("Arquivos Secretos 11, p. 36–55: regras opcionais de viagem — não precisam dos Veículos Operacionais (AS3, p. 125), mas um veículo operacional de uma ficha pode ser vinculado. Liberar o suplemento não liga nada; desligar a ferramenta guarda tudo."),
        el("label.r-marca", {}, [
          el("input", { type: "checkbox", checked: e.ativo, onchange: function (ev) { operar({ tipo: "ligar", ativo: ev.target.checked }).then(function (r) { if (!r) ev.target.checked = !ev.target.checked; else ctx.definirMecanica("viagens", ev.target.checked); }); } }),
          el("span", { texto: "Viagens ligadas nesta campanha" }),
        ]),
      ];
      if (e.ativo) {
        corpo.push(el("div.faixa", {}, [
          mini("Nova viagem livre…", function () { novaViagem(); }),
          mini("Iniciar Carcaças Vermelhas…", function () { iniciarMissao(); }),
          e.viagens.length > 1 ? selecao(e.viagens.slice().reverse().map(function (x) { return { valor: x.id, rotulo: x.nome + (x.carcacas ? " (missão)" : "") + (x.concluida ? " · concluída" : "") }; }), e.atual,
            function (id) { operar({ tipo: "selecionar", viagemId: id }); }, "Viagem atual") : null,
        ]));
      }
      return UI.painel("Viagens nas estradas", el("div.pilha--curta", { class: "pilha" }, corpo));
    }

    function novaViagem() {
      var nomeC = UI.campo({ rotulo: "Nome", valor: "Viagem", limite: 80 });
      var origem = UI.campo({ rotulo: "Origem (partida)", valor: "", limite: 80 });
      var destino = UI.campo({ rotulo: "Destino (chegada)", valor: "", limite: 80 });
      var metodo = "itinerario", modulo = "curta", velocidade = "padrao";
      var dias = numero("Dias (módulos longos)", 1), distancia = numero("Distância total (km)", 300);
      UI.modal({
        titulo: "Nova viagem",
        conteudo: [nomeC, origem, destino,
          el("label.r-campo", {}, [el("span.r-rotulo", { texto: "Condução (p. 39)" }), selecao([{ valor: "itinerario", rotulo: "Por itinerário (testes só quando um encontro pedir)" }, { valor: "granular", rotulo: "Trecho a trecho (teste a cada 100 km)" }], metodo, function (x) { metodo = x; })]),
          el("label.r-campo", {}, [el("span.r-rotulo", { texto: "Módulo (p. 38)" }), selecao(Object.keys(V().MODULOS).map(function (k) { return { valor: k, rotulo: V().MODULOS[k].nome + " — " + V().MODULOS[k].limite }; }), modulo, function (x) { modulo = x; })]),
          el("label.r-campo", {}, [el("span.r-rotulo", { texto: "Velocidade" }), selecao([{ valor: "padrao", rotulo: "Padrão (a da pista)" }, { valor: "imprudente", rotulo: "Imprudente (acima do limite: mais rápido e mais arriscado)" }], velocidade, function (x) { velocidade = x; })]),
          el("label.r-campo", {}, [el("span.r-rotulo", { texto: "Dias (viagem longa de vários dias)" }), dias]),
          el("label.r-campo", {}, [el("span.r-rotulo", { texto: "Distância (só trecho a trecho)" }), distancia]),
          linha("Bicicleta e cavalo andam sempre na velocidade padrão; um dia deles vale um módulo médio (p. 37)."),
        ],
        botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Criar", classe: "r-botao--principal", aoClicar: function (fechar) {
          fechar();
          operar({ tipo: "nova_viagem", nome: nomeC.entrada.value, origem: origem.entrada.value, destino: destino.entrada.value, metodo: metodo, modulo: modulo, velocidade: velocidade, dias: inteiroDe(dias) || 1, distancia: inteiroDe(distancia) || 0 });
        } }],
      });
    }

    function iniciarMissao() {
      var velocidade = "padrao";
      var marcados = {};
      memoria.personagens.forEach(function (p) { marcados[p.id] = true; });
      UI.modal({
        titulo: "Carcaças Vermelhas",
        largo: true,
        conteudo: [
          linha(V().MISSAO.orientacao),
          linha("Contador de perseguição em 6; dados de caçada por agente (p. 62). Os apoios das cenas registram a escolha da mesa e os efeitos uma vez — nenhuma decisão narrativa é imposta."),
          el("label.r-campo", {}, [el("span.r-rotulo", { texto: "Velocidade da perseguição" }), selecao([{ valor: "padrao", rotulo: "Padrão — cenas 1 a 7" }, { valor: "imprudente", rotulo: "Imprudente — cenas 1, 2, 3, 4 e 7" }], velocidade, function (x) { velocidade = x; })]),
          grupo("Agentes", memoria.personagens.length ? memoria.personagens.map(function (p) {
            return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: true, onchange: function (ev) { marcados[p.id] = ev.target.checked; } }), el("span", { texto: p.nome })]);
          }) : [linha("Nenhuma ficha vinculada à campanha ainda.")]),
        ],
        botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Iniciar", classe: "r-botao--principal", aoClicar: function (fechar) {
          fechar();
          operar({ tipo: "carcacas_iniciar", velocidade: velocidade, agentes: Object.keys(marcados).filter(function (k) { return marcados[k]; }) });
        } }],
      });
    }

    /* ---------- resumo: o painel do dia a dia ---------- */

    function painelDoResumo(vg, mestre) {
      var atual = mestre ? V().etapaAtual(vg) : vg.etapas.filter(function (e) { return e.atual; })[0];
      var mod = V().MODULOS[vg.modulo] || {};
      var linhas = [
        linha((vg.origem || "?") + " → " + (vg.destino || "?") + " · " + (vg.metodo === "granular" ? "trecho a trecho" : "itinerário " + (mod.nome || "").toLowerCase() + (vg.dias > 1 ? " × " + vg.dias + " dias" : "")) + " · velocidade " + (vg.velocidade === "imprudente" ? "imprudente" : "padrão") + (vg.concluida ? " · concluída" : "")),
        linha(atual ? "Etapa atual: " + (mestre ? V().rotuloDaEtapa(atual) : (atual.rotulo || V().rotuloDaEtapa(atual))) + "." : "Itinerário percorrido."),
      ];
      if (vg.granular) linhas.push(linha("Trecho a trecho: " + vg.granular.percorrido + " de " + (vg.granular.distancia || "?") + " km; próxima DT " + vg.granular.dt + " (p. 39)."));
      if (vg.pressagios) linhas.push(linha("Presságio ruim: ocupantes abalados até o fim da viagem" + (vg.pressagios > 1 ? " (reincidência: apavorados, salvo Vontade DT 30)" : "") + "."));
      var pend = [];
      vg.encontros.forEach(function (enc) { enc.eventos.forEach(function (ev) { ev.consequencias.forEach(function (c) { if (c.estado === "pendente") pend.push(c); }); ev.testes.forEach(function (t) { if (t.sucesso === null) pend.push(t); }); }); });
      vg.acidentes.forEach(function (a) { if (!a.aplicado && !a.desfeito) pend.push(a); });
      if (pend.length) linhas.push(linha(pend.length + " pendência(s) na estrada: veja Encontros e acidentes.", "t-aviso"));
      var acoes = [];
      if (mestre && !vg.concluida) {
        if (atual) acoes.push(mini("Concluir etapa", function () { operar({ tipo: "avancar", etapaId: atual.id }); }, { dica: "Marca a etapa atual como percorrida" }));
        if (atual && (atual.tipo === "encontro" || atual.tipo === "fixo") && vg.veiculos.length) acoes.push(mini("Rolar encontro aleatório (d100)", function () { escolherVeiculo(vg, function (vid) { operar({ tipo: "encontro", veiculoId: vid, etapaId: atual.id }); }); }));
        else if (vg.veiculos.length) acoes.push(mini("Encontro fora do itinerário", function () { escolherVeiculo(vg, function (vid) { operar({ tipo: "encontro", veiculoId: vid }); }); }, { dica: "O mestre pode pedir um encontro sempre que quiser (p. 44)" }));
        if (vg.granular && vg.veiculos.length) acoes.push(mini("Trecho de 100 km…", function () { trechoGranular(vg); }));
        acoes.push(mini("Preparar…", function () { prepararViagem(vg); }));
        acoes.push(mini("Concluir viagem", function () { operar({ tipo: "concluir" }); }));
      } else if (mestre) acoes.push(mini("Reabrir viagem", function () { operar({ tipo: "concluir", reabrir: true }); }));
      if (acoes.length) linhas.push(el("div.faixa", {}, acoes));
      if (mestre) linhas.push(notasDoMestre(vg.notas, function (t) { operar({ tipo: "notas", texto: t }); }, "Notas do mestre (só você vê)"));
      return UI.painel("Viagem · " + vg.nome, el("div.pilha--curta", { class: "pilha" }, linhas));
    }

    function notasDoMestre(valor, salvar, rotulo) {
      var area = el("textarea.r-area", { rows: 2, maxlength: 2000, "aria-label": rotulo, placeholder: rotulo });
      area.value = valor || "";
      return el("div.faixa", {}, [area, mini("Guardar", function () { salvar(area.value); })]);
    }

    function escolherVeiculo(vg, fn) {
      if (vg.veiculos.length === 1) { fn(vg.veiculos[0].id); return; }
      var escolhido = vg.veiculos[0].id;
      UI.modal({ titulo: "Qual veículo?", conteudo: [selecao(vg.veiculos.map(function (v) { return { valor: v.id, rotulo: v.nome }; }), escolhido, function (x) { escolhido = x; }, "Veículo")],
        botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Seguir", classe: "r-botao--principal", aoClicar: function (fechar) { fechar(); fn(escolhido); } }] });
    }

    function prepararViagem(vg) {
      var nomeC = UI.campo({ rotulo: "Nome", valor: vg.nome, limite: 80 });
      var origem = UI.campo({ rotulo: "Origem", valor: vg.origem, limite: 80 });
      var destino = UI.campo({ rotulo: "Destino", valor: vg.destino, limite: 80 });
      var modulo = vg.modulo, velocidade = vg.velocidade, metodo = vg.metodo, emboscada = vg.emboscada;
      var dias = numero("Dias", vg.dias);
      UI.modal({
        titulo: "Preparar " + vg.nome,
        conteudo: [nomeC, origem, destino,
          vg.carcacas ? null : el("label.r-campo", {}, [el("span.r-rotulo", { texto: "Módulo" }), selecao(Object.keys(V().MODULOS).map(function (k) { return { valor: k, rotulo: V().MODULOS[k].nome }; }), modulo, function (x) { modulo = x; })]),
          el("label.r-campo", {}, [el("span.r-rotulo", { texto: "Velocidade" }), selecao([{ valor: "padrao", rotulo: "Padrão" }, { valor: "imprudente", rotulo: "Imprudente" }], velocidade, function (x) { velocidade = x; })]),
          vg.carcacas ? null : el("label.r-campo", {}, [el("span.r-rotulo", { texto: "Condução" }), selecao([{ valor: "itinerario", rotulo: "Por itinerário" }, { valor: "granular", rotulo: "Trecho a trecho" }], metodo, function (x) { metodo = x; })]),
          vg.carcacas ? null : el("label.r-campo", {}, [el("span.r-rotulo", { texto: "Dias (longa)" }), dias]),
          el("label.r-marca", {}, [el("input", { type: "checkbox", checked: emboscada, onchange: function (ev) { emboscada = ev.target.checked; } }), el("span", { texto: "Escolta: resultado 02–49 no d100 vira a emboscada (p. 42)" })]),
          linha("Trocar módulo, velocidade ou dias remonta as etapas que ainda não aconteceram; as percorridas e os encontros fixos ficam."),
        ],
        botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Salvar", classe: "r-botao--principal", aoClicar: function (fechar) {
          fechar();
          operar({ tipo: "preparar", nome: nomeC.entrada.value, origem: origem.entrada.value, destino: destino.entrada.value, modulo: modulo, velocidade: velocidade, metodo: metodo, dias: inteiroDe(dias) || 1, emboscada: emboscada });
        } }],
      });
    }

    function trechoGranular(vg) {
      var vid = vg.veiculos[0].id;
      var mot = numero("Total do motorista"), nav = numero("Total do navegador"), km = numero("km (até 100)", 100);
      var v0 = vg.veiculos[0];
      UI.modal({
        titulo: "Trecho de 100 km (DT " + vg.granular.dt + ")",
        conteudo: [
          vg.veiculos.length > 1 ? selecao(vg.veiculos.map(function (v) { return { valor: v.id, rotulo: v.nome }; }), vid, function (x) { vid = x; }, "Veículo") : null,
          linha("Motorista e navegador testam a cada 100 km; a DT começa em 10 e sobe 5 por trecho. Falha pede um encontro aleatório; encontro que se confirma devolve a DT a 10 (p. 39)."),
          linha(V().periciaDeNavegacao(v0).nota + " " + V().notasDoMotorista(v0).join(" ")),
          el("div.faixa", {}, [mot, nav, km]),
        ],
        botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Registrar", classe: "r-botao--principal", aoClicar: function (fechar) {
          fechar();
          operar({ tipo: "trecho", veiculoId: vid, motorista: inteiroDe(mot), navegador: inteiroDe(nav), km: inteiroDe(km) || 100 }, function (res) {
            if (res.falhou) UI.avisoAtencao("Alguém falhou no trecho: role um encontro aleatório.", { duracao: 8000 });
          });
        } }],
      });
    }

    /* ---------- etapas ---------- */

    function painelDeEtapas(vg, mestre) {
      var lista = el("ol.vg-etapas", {}, vg.etapas.filter(function (e) { return !e.desfeita; }).map(function (e) {
        var atual = mestre ? e === V().etapaAtual(vg) : e.atual;
        var classes = "vg-etapa" + (e.feita ? " vg-etapa--feita" : "") + (atual ? " vg-etapa--atual" : "");
        var texto = (e.feita ? "✓ " : atual ? "► " : "") + (mestre ? V().rotuloDaEtapa(e) : (e.rotulo || V().rotuloDaEtapa(e)));
        var filhos = [el("span.vg-etapa__nome", { texto: texto })];
        if (mestre && e.tipo === "fixo") filhos.push(el("span.t-mini", { texto: (e.revelada ? " · revelado" : " · escondido dos jogadores") + (e.nota ? " · " + e.nota : "") }));
        if (!mestre && e.nota) filhos.push(el("span.t-mini", { texto: " · " + e.nota }));
        if (mestre && !e.feita && (e.tipo === "fixo" || e.tipo === "cena")) filhos.push(mini(e.revelada ? "Esconder" : "Revelar", function () { operar({ tipo: "revelar", etapaId: e.id, revelada: !e.revelada }); }));
        if (mestre && !e.feita && ["encontro", "fixo", "parada"].indexOf(e.tipo) >= 0) {
          filhos.push(mini("Nota…", function () { UI.pedirTexto({ titulo: "Nota da etapa", rotulo: "Só o mestre vê (até ser revelada, num encontro fixo)", valor: e.nota, limite: 600 }).then(function (t) { if (t !== null && t !== undefined) operar({ tipo: "etapa", acao: "editar", etapaId: e.id, nota: t }); }); }));
          if (e.tipo === "encontro") filhos.push(mini("Tornar fixo", function () { operar({ tipo: "etapa", acao: "editar", etapaId: e.id, etapa: "fixo" }); }, { dica: "Um encontro fixo substitui a rolagem (p. 40)" }));
          filhos.push(mini("Tirar", function () { operar({ tipo: "etapa", acao: "remover", etapaId: e.id }); }, { rotulo: "Tirar a etapa " + V().rotuloDaEtapa(e) }));
        }
        return el("li", { class: classes, "aria-current": atual ? "step" : null }, filhos);
      }));
      var acoes = mestre && !vg.carcacas ? el("div.faixa", {}, [
        mini("Encontro fixo…", function () { inserirEtapa("fixo"); }),
        mini("Parada", function () { operar({ tipo: "etapa", acao: "inserir", etapa: "parada", rotulo: "Parada" }); }),
        mini("Encontro aleatório", function () { operar({ tipo: "etapa", acao: "inserir", etapa: "encontro" }); }),
      ]) : null;
      return UI.painel("Itinerário", el("div.pilha--curta", { class: "pilha" }, [
        linha(mestre ? "Origem > encontro aleatório / encontro fixo / parada > destino (p. 39). Encontros fixos podem substituir ou complementar os aleatórios." : "As etapas já percorridas, a atual e as paradas previstas."),
        lista, acoes,
      ]));
    }

    function inserirEtapa(tipo) {
      var rot = UI.campo({ rotulo: "Nome do encontro fixo", valor: "", limite: 80 });
      var nota = UI.campo({ rotulo: "O que acontece (só o mestre vê até revelar)", valor: "", tipo: "area", limite: 600 });
      UI.modal({ titulo: "Encontro fixo", conteudo: [rot, nota, linha("Entra antes da chegada. Fica escondido dos jogadores até você revelar ou chegar nele.")],
        botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Acrescentar", classe: "r-botao--principal", aoClicar: function (fechar) { fechar(); operar({ tipo: "etapa", acao: "inserir", etapa: tipo, rotulo: rot.entrada.value, nota: nota.entrada.value }); } }] });
    }

    /* ---------- veículos ---------- */

    function painelDeVeiculos(vg, mestre) {
      var cartoes = vg.veiculos.map(function (v) { return cartaoDeVeiculo(vg, v, mestre); });
      if (!cartoes.length) cartoes.push(linha(mestre ? "Nenhum veículo ainda. Escolha um modelo de viagem (p. 37) — ou vincule um veículo operacional de uma ficha, com o AS3." : "Nenhum veículo ainda."));
      if (mestre) cartoes.push(el("div.faixa", {}, [mini("Veículo…", function () { novoVeiculo(vg); })]));
      return UI.painel("Veículos e ocupantes", el("div.pilha", {}, cartoes));
    }

    function cartaoDeVeiculo(vg, v, mestre) {
      var m = V().POR_VEICULO[v.modelo] || {};
      var vin = v.vinculo ? memoria.vinculados[v.vinculo.personagemId + "|" + v.vinculo.veiculoId] : null;
      var maxAuto = V().autonomiaMaxima(v, memoria.vinculados);
      var partes = [
        el("strong", { texto: v.nome + (v.nome !== m.nome ? " · " + m.nome : "") }),
        linha("Proporções " + m.proporcoes + " · " + (m.vagas || m.passageiros + " passageiro(s) além do condutor") + " · categoria de requisição " + (m.categoria || "—") + " · " + NOMES_ESTADO[v.estado] + "."),
        linha(v.combustivelModo === "dados" ? "Combustível: pelos dados do veículo operacional, na ficha (a viagem não dá baixa)." :
          m.porDia ? "Anda " + m.porDia + " km por dia" + (m.porDiaComPassageiro ? " (" + m.porDiaComPassageiro + " com passageiro)" : "") + "; um dia vale um módulo médio." :
          "Autonomia: " + v.autonomiaRestante + " de " + maxAuto + " km" + (v.vazamento ? " (vazamento: metade até a oficina)" : "") + (m.eletrico && V().temItem(v, "paineisSolares", memoria.vinculados) ? " (Painéis Solares: dobrada)" : "") + "."),
      ];
      if (vin) partes.push(linha("Vinculado: " + vin.nome + " (" + vin.modeloNome + ", de " + vin.personagemNome + ") — " + vin.pvAtual + "/" + vin.pvMaximo + " PV, combustível " + vin.combustivel + "d6, regalias: " + (vin.regalias.length ? vin.regalias.join(", ") : "nenhuma") +
        ". Categoria operacional " + vin.categoria + " (" + vin.tamanho + "), categoria de requisição do modelo de viagem " + (m.categoria || "—") + ": são características diferentes. A ficha continua dona desses números."));
      else if (v.vinculo) partes.push(linha("Vinculado a um veículo operacional que não está mais numa ficha da campanha.", "t-aviso"));
      if (!v.vinculo) {
        var regs = {};
        v.equipamentos.forEach(function (k) { regs[k] = (regs[k] || 0) + 1; });
        partes.push(linha("Equipamento: " + (v.equipamentos.length ? Object.keys(regs).map(function (k) { var d = V().REGALIAS_NA_VIAGEM[k]; return (d ? d.nome : k) + (regs[k] > 1 ? " ×" + regs[k] : ""); }).join(", ") : "nenhum") +
          " · reservas: estepe " + v.reservas.estepe + ", extintor " + v.reservas.extintor + "."));
      }
      partes.push(linha("Motorista: " + quem(v.motorista) + " · navegador: " + quem(v.navegador) + " · navegação: " + V().NAVEGACAO[v.navegacao].nome + (v.navegacao === "gps" && !v.sinal ? " (sem sinal)" : "") + (v.semEletronica ? " · sem eletrônicos" : "") + "."));
      partes.push(linha("Ocupantes: " + (v.ocupantes.length ? v.ocupantes.map(quem).join(", ") : "—") + (v.infracoes ? " · infrações do motorista: " + v.infracoes + (v.infracoes >= 3 ? " (–2d20 para evitar a polícia)" : "") : "") + "."));
      var notas = V().notasDoMotorista(v);
      if (notas.length) partes.push(linha(notas.join(" ")));
      if (mestre) {
        var acoes = [mini("Ocupantes e papéis…", function () { editarOcupantes(vg, v); })];
        if (!v.vinculo) acoes.push(mini("Equipamento…", function () { editarEquipamento(vg, v); }));
        if (v.combustivelModo !== "dados" && !m.porDia) {
          acoes.push(mini("Abastecer", function () { operar({ tipo: "abastecer", veiculoId: v.id }); }));
          acoes.push(mini("Registrar km…", function () { UI.pedirTexto({ titulo: "Quilômetros rodados", rotulo: "km (baixa pelo itinerário)", valor: "", limite: 5 }).then(function (t) { if (t) operar({ tipo: "consumo", veiculoId: v.id, km: parseInt(t, 10) || 0, origem: "itinerário" }); }); }));
        }
        if (!v.vinculo) {
          ["estepe", "extintor"].forEach(function (k) {
            if (!v.equipamentos.some(function (x) { return x === k; })) return;
            acoes.push(mini("Usar " + k, function () { operar({ tipo: "reserva", veiculoId: v.id, item: k, delta: -1 }); }, { desligado: !v.reservas[k] }));
            acoes.push(mini("Repor " + k, function () { operar({ tipo: "reserva", veiculoId: v.id, item: k, delta: 1 }); }));
          });
        }
        acoes.push(mini("Estado…", function () { estadoDoVeiculo(v); }));
        acoes.push(mini("Acidente…", function () { abrirAcidente(vg, v); }));
        acoes.push(mini("Tirar", function () { UI.confirmar({ titulo: "Tirar " + v.nome + "?", texto: "O veículo sai da viagem (o registro fica no histórico, e dá para desfazer).", rotuloConfirmar: "Tirar" }).then(function (s) { if (s) operar({ tipo: "veiculo", acao: "remover", veiculoId: v.id }); }); }));
        partes.push(el("div.faixa", {}, acoes));
      }
      return el("div.vg-cartao", {}, partes);
    }

    function novoVeiculo(vg) {
      var modelo = "carroPopular", vinculo = "";
      var nomeC = UI.campo({ rotulo: "Nome (opcional)", valor: "", limite: 80 });
      var operacionais = memoria.veiculosOperacionais || {};
      var chaves = Object.keys(operacionais);
      var modo = "itinerario";
      UI.modal({
        titulo: "Veículo da viagem",
        largo: true,
        conteudo: [
          el("label.r-campo", {}, [el("span.r-rotulo", { texto: "Modelo de viagem (p. 37)" }), selecao(V().VEICULOS.map(function (m) {
            return { valor: m.chave, rotulo: m.nome + " — proporções " + m.proporcoes + ", " + (m.vagas || m.passageiros + " passageiro(s)") + ", " + (m.porDia ? m.porDia + " km/dia" : m.autonomia + " km") + ", categoria " + (m.categoria || "—") };
          }), modelo, function (x) { modelo = x; })]),
          nomeC,
          chaves.length ? el("label.r-campo", {}, [el("span.r-rotulo", { texto: "Vincular a um veículo operacional (AS3) de uma ficha" }), selecao([{ valor: "", rotulo: "Não vincular" }].concat(chaves.map(function (k) {
            var o = operacionais[k]; return { valor: k, rotulo: o.nome + " (" + o.modeloNome + ") — " + o.personagemNome + ", " + o.pvAtual + "/" + o.pvMaximo + " PV" };
          })), vinculo, function (x) { vinculo = x; })]) : linha("Nenhum veículo operacional (AS3) nas fichas da campanha para vincular."),
          chaves.length ? el("label.r-campo", {}, [el("span.r-rotulo", { texto: "Combustível do vinculado" }), selecao([{ valor: "itinerario", rotulo: "Autonomia em km pela viagem" }, { valor: "dados", rotulo: "Dados de combustível do veículo operacional (na ficha)" }], modo, function (x) { modo = x; })]) : null,
          linha("O modelo de viagem dá proporções, vagas, autonomia e categoria de requisição; não dá PV, Defesa nem RD. Vinculado, o veículo operacional continua o mesmo registro da ficha (PV, combustível e regalias) — a viagem só lê."),
        ],
        botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Acrescentar", classe: "r-botao--principal", aoClicar: function (fechar) {
          fechar();
          var o = operacionais[vinculo];
          operar({ tipo: "veiculo", acao: "criar", modelo: modelo, nome: nomeC.entrada.value || (o ? o.nome : ""), vinculo: o ? { personagemId: o.personagemId, veiculoId: o.veiculoId } : null, combustivelModo: o ? modo : "itinerario" });
        } }],
      });
    }

    function editarOcupantes(vg, v) {
      var m = V().POR_VEICULO[v.modelo];
      var marcados = {};
      v.ocupantes.forEach(function (p) { if (p.personagemId) marcados[p.personagemId] = true; });
      var extras = UI.campo({ rotulo: "Outros ocupantes (nomes, separados por vírgula)", valor: v.ocupantes.filter(function (p) { return !p.personagemId; }).map(function (p) { return p.nome; }).join(", "), limite: 400 });
      var pessoas = [{ valor: "", rotulo: "—" }].concat(memoria.personagens.map(function (p) { return { valor: p.id, rotulo: p.nome }; }));
      var motorista = v.motorista.personagemId || "", navegador = v.navegador.personagemId || "", navegacao = v.navegacao, sinal = v.sinal, intox = v.intoxicado;
      UI.modal({
        titulo: "Ocupantes de " + v.nome,
        largo: true,
        conteudo: [
          linha(m.nome + ": " + (m.vagas || m.passageiros + " passageiro(s)") + " além do condutor."),
          grupo("Agentes no veículo", memoria.personagens.map(function (p) {
            return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: !!marcados[p.id], onchange: function (ev) { marcados[p.id] = ev.target.checked; } }), el("span", { texto: p.nome })]);
          })),
          extras,
          el("label.r-campo", {}, [el("span.r-rotulo", { texto: "Motorista (" + (m.pericia ? V().NOMES_PERICIA[m.pericia] : "treinado em Pilotagem") + ")" }), selecao(pessoas, motorista, function (x) { motorista = x; })]),
          el("label.r-campo", {}, [el("span.r-rotulo", { texto: "Navegador" }), selecao(pessoas, navegador, function (x) { navegador = x; })]),
          el("label.r-campo", {}, [el("span.r-rotulo", { texto: "Como navega (p. 41)" }), selecao(Object.keys(V().NAVEGACAO).map(function (k) { return { valor: k, rotulo: V().NAVEGACAO[k].nome + (V().NAVEGACAO[k].pericia ? " — " + V().NOMES_PERICIA[V().NAVEGACAO[k].pericia] : " — sucesso automático") }; }), navegacao, function (x) { navegacao = x; })]),
          el("label.r-marca", {}, [el("input", { type: "checkbox", checked: sinal, onchange: function (ev) { sinal = ev.target.checked; } }), el("span", { texto: "Há sinal de antena ou satélite (sem sinal, o aparelho vira um mapa estático: Sobrevivência)" })]),
          el("label.r-marca", {}, [el("input", { type: "checkbox", checked: intox, onchange: function (ev) { intox = ev.target.checked; } }), el("span", { texto: "O motorista está intoxicado (–1 num acidente)" })]),
          linha("Se o motorista também navegar: –1d20 nos testes de dirigir e de navegar (p. 40). A dificuldade a mais por estrada remota ou mapa ruim é do mestre."),
        ],
        botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Salvar", classe: "r-botao--principal", aoClicar: function (fechar) {
          var oc = Object.keys(marcados).filter(function (k) { return marcados[k]; }).map(function (pid) { return { personagemId: pid, nome: nome(pid) }; })
            .concat(extras.entrada.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean).map(function (n) { return { nome: n }; }));
          fechar();
          operar({ tipo: "veiculo", veiculoId: v.id, dados: { ocupantes: oc, motorista: motorista ? { personagemId: motorista, nome: nome(motorista) } : {}, navegador: navegador ? { personagemId: navegador, nome: nome(navegador) } : {}, navegacao: navegacao, sinal: sinal, intoxicado: intox } });
        } }],
      });
    }

    function editarEquipamento(vg, v) {
      var m = V().POR_VEICULO[v.modelo];
      var escolhidas = v.equipamentos.slice();
      var corpo = el("div.pilha--curta", { class: "pilha" });
      function pintarEq() {
        U.trocar(corpo, [linha("As regalias do AS11 (p. 56–57) como equipamento do veículo de viagem. Três menores valem uma inteira nos Veículos Operacionais; aqui, sem vagas na fonte, a mesa decide o que o veículo tem. Estepe e extintor: até 3 cada, cada um com a sua unidade.")].concat(V().CHAVES_AS11.filter(function (k) {
          return !(V().REGALIAS_NA_VIAGEM[k].soMoto && m.tipo !== "moto");
        }).map(function (k) {
          var d = V().REGALIAS_NA_VIAGEM[k];
          var n = escolhidas.filter(function (x) { return x === k; }).length;
          return el("div.faixa", {}, [
            el("span", { texto: d.nome + (d.menor ? " (menor)" : " (inteira)") + (n ? " ×" + n : "") }),
            mini("+", function () { if (n < (d.maximo || 1)) { escolhidas.push(k); pintarEq(); } }, { desligado: n >= (d.maximo || 1), rotulo: "Acrescentar " + d.nome }),
            n ? mini("−", function () { escolhidas.splice(escolhidas.lastIndexOf(k), 1); pintarEq(); }, { rotulo: "Tirar " + d.nome }) : null,
          ]);
        })));
      }
      pintarEq();
      UI.modal({ titulo: "Equipamento de " + v.nome, largo: true, conteudo: [corpo], botoes: [
        { rotulo: "Cancelar", classe: "r-botao--fantasma" },
        { rotulo: "Salvar", classe: "r-botao--principal", aoClicar: function (fechar) { fechar(); operar({ tipo: "veiculo", veiculoId: v.id, dados: { equipamentos: escolhidas } }); } },
      ] });
    }

    function estadoDoVeiculo(v) {
      var est = v.estado, vaz = v.vazamento, ele = v.semEletronica;
      var pens = v.penalidades.slice();
      UI.modal({ titulo: "Estado de " + v.nome, conteudo: [
        selecao(Object.keys(NOMES_ESTADO).map(function (k) { return { valor: k, rotulo: NOMES_ESTADO[k] }; }), est, function (x) { est = x; }, "Estado"),
        el("label.r-marca", {}, [el("input", { type: "checkbox", checked: vaz, onchange: function (ev) { vaz = ev.target.checked; } }), el("span", { texto: "Vazamento (autonomia pela metade)" })]),
        el("label.r-marca", {}, [el("input", { type: "checkbox", checked: ele, onchange: function (ev) { ele = ev.target.checked; } }), el("span", { texto: "Sem GPS e eletrônicos" })]),
        el("label.r-marca", {}, [el("input", { type: "checkbox", checked: !pens.length, onchange: function (ev) { if (ev.target.checked) pens = []; } }), el("span", { texto: "Sem penalidade de pneu ou freio (consertado)" })]),
      ], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Salvar", classe: "r-botao--principal", aoClicar: function (fechar) { fechar(); operar({ tipo: "veiculo", veiculoId: v.id, dados: { estado: est, vazamento: vaz, semEletronica: ele, penalidades: pens } }); } }] });
    }

    /* ---------- encontros, acidentes e registros ---------- */

    function painelDeEventos(vg, mestre) {
      var partes = [];
      vg.acidentes.filter(function (a) { return !a.desfeito; }).slice().reverse().forEach(function (a) { partes.push(cartaoDeAcidente(vg, a, mestre)); });
      vg.encontros.filter(function (e) { return !e.desfeito; }).slice().reverse().slice(0, 12).forEach(function (enc) { partes.push(cartaoDeEncontro(vg, enc, mestre)); });
      var regs = vg.registros.filter(function (r) { return !r.desfeito; }).slice().reverse().slice(0, 12);
      if (regs.length) partes.push(grupo("Perdas e danos registrados", regs.map(function (r) { return cartaoDeRegistro(vg, r, mestre); })));
      if (!partes.length) partes.push(linha("Nenhum encontro ainda. Na etapa de encontro, role o d100 (p. 44)."));
      return UI.painel("Encontros e acidentes", el("div.pilha", {}, partes));
    }

    function cartaoDeEncontro(vg, enc, mestre) {
      var v = V().veiculo(vg, enc.veiculoId);
      var partes = [el("strong", { texto: "d100 " + enc.d100 + ": " + enc.linha + (v ? " · " + v.nome : "") })];
      enc.eventos.forEach(function (ev, i) {
        if (ev.tabela === "acidente") { partes.push(linha("Acidente: abra a resolução (p. 54).")); ev.consequencias.forEach(function (c) { partes.push(consequencia(c, mestre)); }); return; }
        var def = V().eventoPorChave(ev.chave) || {};
        var cab = V().NOMES_TABELA[ev.tabela] + " (d20 " + ev.d20 + "): " + def.nome + " — " + ref(def.pagina);
        var filhos = [el("span.t-forte", { texto: cab }), linha(def.resumo || "")];
        if (!ev.aplicavel) filhos.push(linha("Não se aplica: " + ev.motivo, "t-aviso"));
        if (ev.substituido) filhos.push(linha("Substituído: " + ev.substituido, "t-aviso"));
        ev.testes.forEach(function (t, k) { filhos.push(testeDoEncontro(enc, i, t, k, mestre, v)); });
        if (mestre && ev.aplicavel && !ev.decisao && !ev.substituido && (def.opcoes || []).length) {
          filhos.push(el("div.faixa", {}, def.opcoes.map(function (o) {
            return mini(o.rotulo, function () { operar({ tipo: "encontro_decisao", encontroId: enc.id, evento: i, decisao: o.chave }); }, { dica: o.nota || "" });
          })));
        } else if (ev.decisao) {
          var esc = (def.opcoes || []).filter(function (o) { return o.chave === ev.decisao; })[0];
          filhos.push(linha("Decisão: " + (esc ? esc.rotulo : ev.decisao) + (esc && esc.nota ? " — " + esc.nota : "") + "."));
        }
        ev.consequencias.forEach(function (c) { filhos.push(consequencia(c, mestre)); });
        ev.estendidos.forEach(function (xid) {
          var x = vg.estendidos.filter(function (y) { return y.id === xid; })[0];
          if (x) filhos.push(cartaoDeEstendido(x, mestre));
        });
        if (mestre && ev.aplicavel && !ev.substituido) filhos.push(el("div.faixa", {}, [
          mini("Substituir / rolar de novo…", function () { UI.pedirTexto({ titulo: "Substituir o evento", rotulo: "O que entra no lugar (outro evento, um combate, nova rolagem)", valor: "", limite: 200 }).then(function (t) { if (t !== null && t !== undefined) operar({ tipo: "encontro_substituir", encontroId: enc.id, evento: i, texto: t }); }); }, { dica: "O mestre pode adaptar, trocar por combate ou rolar o d100 de novo (p. 44)" }),
        ]));
        partes.push(el("div.vg-evento.pilha--curta", { class: "pilha" }, filhos));
      });
      return el("div.vg-cartao", {}, partes);
    }

    function testeDoEncontro(enc, i, t, k, mestre, v) {
      var nomeP = V().NOMES_PERICIA[t.pericia] || t.pericia;
      var cab = (t.rotulo ? t.rotulo + " · " : "") + nomeP + " DT " + t.dt + (t.papel ? " (" + t.papel + ")" : "");
      if (t.sucesso !== null) return linha(cab + ": " + (t.automatico ? "sucesso automático" : t.total + " — " + (t.sucesso ? "sucesso" : "falha")) + ".");
      if (!mestre) return linha(cab + ": aguardando o teste.");
      var total = numero("Total");
      total.dataset.foco = "t-" + enc.id + "-" + i + "-" + k;
      return el("div.faixa", {}, [el("span.t-mini", { texto: cab + (v ? " · " + V().notasDoMotorista(v).filter(function (n) { return /–|penal/.test(n); }).join(" ") : "") }), total,
        mini("Registrar", function () { var n = inteiroDe(total); if (n === null) { UI.avisoAtencao("Digite o total do teste (rolado na ficha)."); return; } operar({ tipo: "encontro_teste", encontroId: enc.id, evento: i, teste: k, total: n }); })]);
    }

    function consequencia(c, mestre) {
      var cls = c.estado === "pendente" ? "vg-consequencia vg-consequencia--pendente" : "vg-consequencia";
      var filhos = [el("span.t-mini", { texto: (c.estado === "aplicada" ? "✓ " : c.estado === "descartada" ? "✗ " : "• ") + c.texto + (c.estado === "aplicada" && c.aplicadaPor ? " (aplicado por " + c.aplicadaPor + ")" : "") })];
      if (mestre && c.estado === "pendente") {
        filhos.push(mini("Aplicar", function () { operar({ tipo: "consequencia", consequenciaId: c.id, acao: "aplicar" }); }));
        filhos.push(mini("Descartar", function () { operar({ tipo: "consequencia", consequenciaId: c.id, acao: "descartar" }); }));
      }
      return el("div.faixa", { class: cls }, filhos);
    }

    function cartaoDeEstendido(x, mestre) {
      var filhos = [el("span.t-forte", { texto: x.rotulo + ": DT " + x.dt + " — " + x.feitos + "/" + x.sucessos + " sucessos, " + x.errados + "/" + x.falhas + " falhas" + (x.fim ? " · " + (x.fim === "vitoria" ? "vitória" : "fracasso") : "") })];
      x.testes.slice(-6).forEach(function (t) { filhos.push(linha((t.por ? t.por + ": " : "") + (V().NOMES_PERICIA[t.pericia] || t.pericia) + " " + t.total + " — " + (t.sucesso ? "sucesso" : "falha"))); });
      if (mestre && !x.fim) {
        var por = el("input.r-entrada", { type: "text", "aria-label": "Quem testa", placeholder: "Quem (e a perícia)", maxlength: 80 });
        var total = numero("Total");
        var semTiros = false;
        filhos.push(el("div.faixa", {}, [por, total,
          x.porFalha === "tiros" ? el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { semTiros = ev.target.checked; } }), el("span.t-mini", { texto: "sem tiros (falha: 1d6 PE em vez de 1d8 PV)" })]) : null,
          mini("Registrar", function () { var n = inteiroDe(total); if (n === null) { UI.avisoAtencao("Digite o total."); return; } operar({ tipo: "estendido_teste", estendidoId: x.id, total: n, por: por.value, semTiros: semTiros }); })]));
      }
      return el("div.vg-estendido.pilha--curta", { class: "pilha" }, filhos);
    }

    function cartaoDeRegistro(vg, r, mestre) {
      var filhos = [el("span.t-forte", { texto: (r.tipo === "dano" ? "Dano" : "Perda") + ": " + r.origem })];
      if (r.resistencia) filhos.push(linha(V().NOMES_PERICIA[r.resistencia.pericia] + " DT " + r.resistencia.dt + " " + r.resistencia.texto + (r.condicao ? " · condição: " + r.condicao : "") + "."));
      else if (r.condicao) filhos.push(linha("Condição: " + r.condicao + "."));
      r.alvos.forEach(function (a, i) {
        var valores = a.partes.map(function (p) {
          var total = r.resistencia && a.passou === true ? Math.floor(p.total / 2) : p.total;
          return total + " " + (p.recurso ? p.recurso.toUpperCase() : p.tipo) + " (" + p.dado + ": " + p.valores.join("+") + (r.resistencia && a.passou === true ? ", metade" : "") + ")";
        }).join(" + ");
        var extra = (a.extra ? " · " + a.extra.total + " " + a.extra.rotulo : "") + (a.duracao ? " · " + a.duracao.total + " " + a.duracao.texto.replace(/^\S+\s*/, "") : "");
        var meu = a.personagemId && memoria.meus.indexOf(a.personagemId) >= 0;
        var l = [el("span.t-mini", { texto: (a.nome || "—") + (meu ? " (seu)" : "") + ": " + valores + extra + (r.resistencia ? (a.passou === true ? " — passou" : a.passou === false ? " — falhou" : " — resistência a conferir") : "") })];
        if (mestre && r.resistencia) {
          l.push(mini("Passou", function () { operar({ tipo: "resistencia", registro: r.id, alvo: i, passou: true }); }, { desligado: a.passou === true }));
          l.push(mini("Falhou", function () { operar({ tipo: "resistencia", registro: r.id, alvo: i, passou: false }); }, { desligado: a.passou === false }));
        }
        filhos.push(el("div.faixa", {}, l));
      });
      filhos.push(linha("Registro: cada um aplica na própria ficha, com a sua confirmação (dano antes de RD e outras reduções)."));
      return el("div.vg-registro.pilha--curta", { class: "pilha" }, filhos);
    }

    function abrirAcidente(vg, v, extra) {
      var outro = "sortear";
      var c = { imprudente: vg.velocidade === "imprudente", intoxicado: v.intoxicado, semFreio: v.penalidades.some(function (p) { return p.chave === "semFreio"; }), paranormal: false };
      UI.modal({
        titulo: "Acidente com " + v.nome,
        conteudo: [
          linha("Novo teste de Pilotagem do motorista com os modificadores (p. 54). O outro envolvido, se houver: conhecido, ou sorteado no d100."),
          el("label.r-campo", {}, [el("span.r-rotulo", { texto: "Outro envolvido" }), selecao([{ valor: "sortear", rotulo: "Sortear no d100" }, { valor: "", rotulo: "Nenhum (saída de pista sozinho)" }].concat(V().OUTROS_ENVOLVIDOS.map(function (x) { return { valor: x[2], rotulo: x[3] + " (" + x[4] + ")" }; })), outro, function (x) { outro = x; })]),
          ["imprudente", "intoxicado", "semFreio", "paranormal"].map(function (k) {
            var nomes = { imprudente: "Velocidade imprudente (−5)", intoxicado: "Motorista intoxicado (−1)", semFreio: "Sem freio (−2)", paranormal: "Origem paranormal (−2)" };
            return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: c[k], onchange: function (ev) { c[k] = ev.target.checked; } }), el("span", { texto: nomes[k] })]);
          }),
        ],
        botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Abrir", classe: "r-botao--principal", aoClicar: function (fechar) { fechar(); operar(Object.assign({ tipo: "acidente", veiculoId: v.id, outro: outro, causa: c }, extra || {})); } }],
      });
    }

    function cartaoDeAcidente(vg, a, mestre) {
      var v = V().veiculo(vg, a.veiculoId);
      var res = a.resultado ? V().RESULTADOS_ACIDENTE.filter(function (r) { return r.chave === a.resultado; })[0] : null;
      var filhos = [el("strong", { texto: "Acidente" + (v ? " · " + v.nome : "") + (a.outro ? " × " + a.outro.nome + " (proporções " + a.outro.proporcoes + (a.outro.d100 ? ", d100 " + a.outro.d100 : "") + ")" : "") })];
      if (a.pilotagem === null) {
        if (mestre) {
          var total = numero("Pilotagem");
          total.dataset.foco = "ac-" + a.id;
          filhos.push(el("div.faixa", {}, [el("span.t-mini", { texto: "Total do novo teste de Pilotagem do motorista:" }), total, mini("Calcular", function () { var n = inteiroDe(total); if (n === null) { UI.avisoAtencao("Digite o total."); return; } operar({ tipo: "acidente_pilotagem", acidenteId: a.id, total: n }); })]));
        } else filhos.push(linha("Aguardando o teste de Pilotagem do motorista."));
      } else {
        var regs = v ? v.equipamentos.concat(V().regaliasDoVinculo(v, memoria.vinculados)) : [];
        var comp = V().composicaoDoAcidente(a.pilotagem, a.causa, v ? V().POR_VEICULO[v.modelo].proporcoes : 0, a.outro, regs);
        filhos.push(linha(comp.partes.map(function (p, i) { return (i && p.valor >= 0 ? "+" : "") + p.valor + " " + p.rotulo; }).join(" ") + " = " + comp.total + "."));
        if (res) filhos.push(linha(res.nome + ": " + res.texto + (res.dano ? " " + res.dano + "d6 de impacto por ocupante (antes das reduções)." : "")));
        if (mestre && !a.aplicado) filhos.push(el("div.faixa", {}, [mini("Aplicar (rolar o dano e o estado do veículo)", function () { operar({ tipo: "acidente_aplicar", acidenteId: a.id }); })]));
        if (a.aplicado) filhos.push(linha("Aplicado: veja o registro de dano."));
      }
      return el("div.vg-cartao.vg-cartao--acidente", {}, filhos);
    }

    /* ---------- Carcaças Vermelhas (mestre) ---------- */

    function painelDaMissao(vg) {
      var cv = vg.carcacas;
      var cena = V().POR_CENA[cv.cena];
      var origem = el("input.r-entrada", { type: "text", "aria-label": "Origem do ajuste", placeholder: "Origem (ex.: decisão da mesa)", maxlength: 120 });
      var corpo = [
        linha(V().MISSAO.orientacao),
        el("div.vg-contador", { role: "status", "aria-live": "polite" }, [
          el("span.vg-contador__rotulo", { texto: "Contador de perseguição (p. 62)" }),
          mini("−1", function () { operar({ tipo: "perseguicao", delta: -1, origem: origem.value }); }, { rotulo: "Reduzir o contador em 1", desligado: cv.perseguicao <= 1 }),
          el("strong.vg-contador__valor", { texto: String(cv.perseguicao) }),
          mini("+1", function () { operar({ tipo: "perseguicao", delta: 1, origem: origem.value }); }, { rotulo: "Aumentar o contador em 1", desligado: cv.perseguicao >= 10 }),
          origem,
        ]),
        grupo("Dados de caçada (p. 62)", cv.agentes.map(function (pid) {
          return el("div.faixa", {}, [el("span.t-mini", { texto: nome(pid) + ": " + (cv.caca[pid] || 0) }),
            mini("+1", function () { operar({ tipo: "caca_conceder", personagemId: pid, quantidade: 1, origem: origem.value || "concedido pelo mestre" }); }, { rotulo: "Dar 1 dado de caçada a " + nome(pid) }),
            mini("−1", function () { operar({ tipo: "caca_conceder", personagemId: pid, quantidade: -1, origem: origem.value || "correção do mestre" }); }, { rotulo: "Tirar 1 dado de caçada de " + nome(pid), desligado: !(cv.caca[pid] > 0) })]);
        }).concat([linha("Cada dado: +1d4 num teste, ou +1d6 contra um Carcaça Vermelha; vários se somam. O jogador gasta no resultado do teste, na ficha — o servidor rola e grava.")])),
        el("div.faixa", {}, [el("span.t-mini", { texto: "Cena atual:" }), selecao(V().MISSAO.roteiro[cv.velocidade].map(function (n) { return { valor: n, rotulo: V().POR_CENA[n].nome }; }), cv.cena, function (x) { operar({ tipo: "cena", cena: parseInt(x, 10) }); }, "Cena atual")]),
        cenaAtual(vg, cena),
      ];
      corpo.push(cardapio(cv, cv.agentes));
      corpo.push(UI.recolhivel({ titulo: "Fichas e remissões da missão (só o mestre)", conteudo: el("ul.pilha--curta", { class: "pilha" }, V().REMISSOES.map(function (r) { return el("li.t-mini", { texto: r.quem + " (" + ref(r.pagina) + "): " + r.como }); })) }));
      corpo.push(el("div.faixa", {}, [
        cv.desfecho ? linha("Desfecho: " + (cv.desfecho.resultado === "vitoria" ? "vitória" : "derrota") + ".") : mini("Desfecho…", function () { desfecho(); }),
        cv.encerrada ? linha("Missão encerrada.") : mini("Encerrar a missão", function () { UI.confirmar({ titulo: "Encerrar a missão?", texto: "Os pontos temporários do Sonnenblume que restarem e o Apfelstrudel expiram nas fichas.", rotuloConfirmar: "Encerrar" }).then(function (s) { if (s) operar({ tipo: "missao_encerrar" }); }); }),
      ]));
      corpo.push(notasDoMestre(cv.notas, function (t) { operar({ tipo: "notas", texto: t, missao: true }); }, "Notas da missão (só você vê)"));
      return UI.painel("Carcaças Vermelhas · " + ref("60–91"), el("div.pilha", {}, corpo));
    }

    function cenaAtual(vg, cena) {
      var cv = vg.carcacas;
      var filhos = [el("span.t-forte", { texto: cena.nome + " — " + ref(cena.paginas) })];
      if (cena.decisoes.length) {
        filhos.push(linha("Registre o que a mesa decidiu ou descobriu; os efeitos entram uma vez e podem ser desfeitos no histórico."));
        filhos.push(el("div.vg-decisoes", {}, cena.decisoes.map(function (d) {
          var feita = !!cv.decisoes["c" + cena.n + "." + d.chave];
          var efeitos = [d.perseguicao ? (d.perseguicao > 0 ? "+" : "") + d.perseguicao + " no contador" : "", d.caca ? "+" + d.caca + " dado(s) de caçada por agente" : "", d.condicao ? d.condicao : ""].filter(Boolean).join("; ");
          return mini((feita ? "✓ " : "") + d.rotulo + (efeitos ? " (" + efeitos + ")" : ""), function () {
            operar({ tipo: "decisao", cena: cena.n, decisao: d.chave }, function (res) { if (res.acidente && vg.veiculos[0]) abrirAcidente(vg, vg.veiculos[0], { cena: cena.n }); });
          }, { desligado: feita, dica: d.nota || "" });
        })));
      }
      if (cena.n === 3) filhos.push(linha("Chuva forte (Pilotagem DT 30) e pneu furado (Pilotagem DT 20): registre o desfecho acima. Fracos e frustrados: condições da mesa."));
      if (cena.estendido) {
        var x = cv.estendidos.filter(function (y) { return y.cena === cena.n && !y.desfeito; })[0];
        if (x) filhos.push(cartaoDeEstendido(x, true));
        else filhos.push(mini(cena.estendido.rotulo + " (DT " + cena.estendido.dt + ", " + cena.estendido.sucessos + " sucessos)", function () { operar({ tipo: "cena_estendido", cena: cena.n }); }));
        if (x && x.fim === "derrota" && x.derrotaAcidente && vg.veiculos[0]) filhos.push(mini("Abrir o acidente contra o caminhão", function () { abrirAcidente(vg, vg.veiculos[0], { cena: cena.n }); }));
      }
      if (cena.n === 4) filhos.push(explosao(vg));
      if (cena.n === 7) filhos.push(painelDoConfronto(vg, true));
      return el("div.vg-cena.pilha--curta", { class: "pilha" }, filhos);
    }

    function explosao(vg) {
      var ex = vg.carcacas.explosao;
      var filhos = [el("span.t-forte", { texto: "Explosão da viatura (p. 79–80)" })];
      if (!ex) { filhos.push(mini("Começar a contagem (10)", function () { operar({ tipo: "explosao" }); })); return el("div.vg-grupo.pilha--curta", { class: "pilha" }, filhos); }
      filhos.push(el("div.vg-contador", {}, [el("span.vg-contador__rotulo", { texto: "Contagem" }), el("strong.vg-contador__valor", { texto: String(ex.contador) })]));
      if (ex.contador > 0) {
        var quemE = el("input.r-entrada", { type: "text", "aria-label": "Quem age", placeholder: "Quem age", maxlength: 80 });
        filhos.push(el("div.faixa", {}, [quemE,
          mini("Ação padrão (−1)", function () { operar({ tipo: "explosao_acao", acao: "padrao", quem: quemE.value }); }),
          mini("Movimento (−1)", function () { operar({ tipo: "explosao_acao", acao: "movimento", quem: quemE.value }); }),
          mini("Completa (−2)", function () { operar({ tipo: "explosao_acao", acao: "completa", quem: quemE.value }); })]));
      } else if (!ex.registro) {
        var marcados = {};
        filhos.push(linha("Explodiu: 12d6 (6d6 de fogo + 6d6 de impacto) e em chamas num raio de 6 m; Reflexos DT 25 reduz à metade e evita a condição. Quem estava no raio?"));
        filhos.push(el("div.faixa", {}, vg.carcacas.agentes.map(function (pid) { return el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { marcados[pid] = ev.target.checked; } }), el("span", { texto: nome(pid) })]); })));
        var outros = el("input.r-entrada", { type: "text", "aria-label": "Outros atingidos", placeholder: "Outros (nomes, vírgula)", maxlength: 200 });
        filhos.push(el("div.faixa", {}, [outros, mini("Rolar o dano", function () {
          operar({ tipo: "explosao_atingidos", personagens: Object.keys(marcados).filter(function (k) { return marcados[k]; }), outros: outros.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean) });
        })]));
      } else filhos.push(linha("Dano rolado: veja o registro em Encontros e acidentes."));
      return el("div.vg-grupo.pilha--curta", { class: "pilha" }, filhos);
    }

    function desfecho() {
      var resultado = "vitoria";
      var texto = UI.campo({ rotulo: "Destinos de personagens e reféns (confirmados pela mesa)", tipo: "area", valor: "", limite: 1200 });
      UI.modal({ titulo: "Desfecho do confronto", conteudo: [
        selecao([{ valor: "vitoria", rotulo: "Vitória — os agentes derrotam os Carcaças Vermelhas (p. 90)" }, { valor: "derrota", rotulo: "Derrota ou incapacidade de continuar — acidente (p. 90–91)" }], resultado, function (x) { resultado = x; }, "Resultado"),
        texto,
        linha("Sobreviventes: orientação de +5% de NEX e prestígio conforme as ações. Nada é aplicado sozinho: cada ficha sobe pelo fluxo de progressão."),
      ], botoes: [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Registrar", classe: "r-botao--principal", aoClicar: function (fechar) { fechar(); operar({ tipo: "desfecho", resultado: resultado, texto: texto.entrada.value }); } }] });
    }

    /* ---------- confronto final (mestre e jogador) ---------- */

    function painelDoConfronto(vg, mestre) {
      var cv = vg.carcacas;
      var cf = cv.confronto;
      var filhos = [el("span.t-forte", { texto: "Confronto final (p. 86–89)" })];
      if (!cf) {
        if (mestre) filhos.push(mini("Preparar o confronto (reféns pelo contador)", function () { UI.confirmar({ titulo: "Preparar o confronto final?", texto: "Com o contador em " + cv.perseguicao + ": " + V().refensPeloContador(cv.perseguicao).vivos + " reféns vivos de 14. Isso acontece uma vez só.", rotuloConfirmar: "Preparar" }).then(function (s) { if (s) operar({ tipo: "confronto_preparar" }); }); }));
        return el("div.vg-grupo.pilha--curta", { class: "pilha" }, filhos);
      }
      var rodada = cf.rodadas.filter(function (r) { return r.n === cf.rodada; })[0] || { passageiros: [], motoristas: [] };
      var anterior = cf.rodadas.filter(function (r) { return r.n === cf.rodada - 1; })[0];
      var sucessos = rodada.passageiros.filter(function (p) { return p.sucesso && !p.desfeito; }).length;
      var dtMot = V().dtDoMotorista(sucessos);
      filhos.push(linha("Reféns: " + cf.refens.vivos + " vivos (" + cf.refens.mortosAntes + " sacrificados antes, contador " + cf.contador + "). Sacrifícios " + (cf.sacrificiosAtivos ? "ATIVOS" : "interrompidos") + " · carroceria " + (cf.carroceriaAberta ? "aberta" : "fechada (+5 para impedir os sacrifícios)") + "."));
      filhos.push(linha("Rodada " + cf.rodada + ": passageiros primeiro (DT 35, perícia justificada, uma vez por rodada, sem repetir a da rodada anterior); cada sucesso tira 5 da DT do motorista nesta rodada. Motorista: DT " + dtMot + (sucessos ? " (25 − " + sucessos * 5 + ")" : "") + ", 7 sucessos antes de 3 falhas."));
      if (mestre) filhos.push(el("div.faixa", {}, [
        mini(cf.carroceriaAberta ? "Fechar a carroceria" : "Abrir a carroceria", function () { operar({ tipo: "carroceria", aberta: !cf.carroceriaAberta }); }),
        cf.sacrificiosAtivos ? mini("Marcar os sacrifícios como impedidos", function () { operar({ tipo: "carroceria", aberta: cf.carroceriaAberta, sacrificios: false }); }) : null,
      ]));
      /* Pessoas queridas. */
      filhos.push(grupo("Pessoa querida de cada agente", Object.keys(cf.querida).map(function (pid) {
        var q = cf.querida[pid];
        var meu = memoria.meus.indexOf(pid) >= 0;
        if (q.estado !== "pendente") return linha(nome(pid) + ": " + (q.estado === "morta" ? "sacrificada" + (q.quando ? " (" + q.quando + ")" : "") : "viva" + (q.rolado ? " (escolheu " + q.escolhido + ", saiu " + q.rolado + " no d" + q.dado + ")" : q.quando ? " — " + q.quando : "")) + ".");
        if (!mestre && !meu) return linha(nome(pid) + ": a verificar.");
        var esc = el("input.r-entrada.r-entrada--numero.vg-numero", { type: "text", inputmode: "numeric", "aria-label": "Número escolhido no d" + q.dado + " por " + nome(pid), placeholder: "1–" + q.dado, maxlength: 2 });
        return el("div.faixa", {}, [el("span.t-mini", { texto: nome(pid) + ": escolha um número do d" + q.dado + "; se sair, ela já foi sacrificada." }), esc,
          mini("Rolar d" + q.dado, function () { var n = inteiroDe(esc); if (!n || n < 1 || n > q.dado) { UI.avisoAtencao("Escolha de 1 a " + q.dado + "."); return; } operar({ tipo: "querida", personagemId: pid, escolhido: n }); })]);
      })));
      /* Passageiros desta rodada. */
      var lp = rodada.passageiros.filter(function (p) { return !p.desfeito; }).map(function (p) {
        return linha(p.nome + " · " + p.pericia + ": " + p.total + " contra DT " + p.dt + (p.impedir ? " (impedir sacrifícios)" : "") + " — " + (p.sucesso ? "sucesso" : "falha" + (p.d12 ? " (d12 " + p.d12 + ", veja o registro)" : "")));
      });
      var podem = cv.agentes.filter(function (pid) { return (mestre || memoria.meus.indexOf(pid) >= 0) && !rodada.passageiros.some(function (p) { return p.personagemId === pid && !p.desfeito; }); });
      if (podem.length && !cv.desfecho) {
        var quemP = podem[0];
        var pericia = el("input.r-entrada", { type: "text", "aria-label": "Perícia e como ajuda", placeholder: "Perícia (e como protege ou ataca)", maxlength: 40 });
        var total = numero("Total");
        var impedir = false;
        var usadas = function (pid) { return anterior ? anterior.passageiros.filter(function (p) { return p.personagemId === pid && !p.desfeito; }).map(function (p) { return p.pericia; }) : []; };
        var aviso = linha(usadas(quemP).length ? "Na rodada anterior, " + nome(quemP) + " usou " + usadas(quemP).join(", ") + ": indisponível agora." : "");
        lp.push(el("div.faixa", {}, [
          podem.length > 1 ? selecao(podem.map(function (pid) { return { valor: pid, rotulo: nome(pid) }; }), quemP, function (x) { quemP = x; aviso.textContent = usadas(x).length ? "Na rodada anterior, " + nome(x) + " usou " + usadas(x).join(", ") + ": indisponível agora." : ""; }, "Passageiro") : el("span.t-mini", { texto: nome(quemP) + ":" }),
          pericia, total,
          cf.sacrificiosAtivos ? el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { impedir = ev.target.checked; } }), el("span.t-mini", { texto: "para impedir os sacrifícios" + (cf.carroceriaAberta ? "" : " (+5)") })]) : null,
          mini("Registrar passageiro", function () { var n = inteiroDe(total); if (n === null) { UI.avisoAtencao("Digite o total do teste (rolado na ficha)."); return; } operar({ tipo: "passageiro", personagemId: quemP, pericia: pericia.value, total: n, impedir: impedir }); }),
        ]));
        lp.push(aviso);
      }
      filhos.push(grupo("Passageiros · rodada " + cf.rodada, lp.length ? lp : [linha("Ninguém agiu ainda nesta rodada.")]));
      /* Motoristas. */
      filhos.push(grupo("Motoristas", vg.veiculos.map(function (v) {
        var p = cf.progresso[v.id] || { sucessos: 0, falhas: 0 };
        var feito = rodada.motoristas.filter(function (m) { return m.veiculoId === v.id && !m.desfeito; })[0];
        var l = [el("span.t-mini", { texto: v.nome + ": " + p.sucessos + "/7 sucessos, " + p.falhas + "/3 falhas" + (feito ? " · nesta rodada: " + feito.total + " contra DT " + feito.dt + " (" + (feito.sucesso ? "sucesso" : "falha") + ")" : "") })];
        if (mestre && !feito && p.sucessos < 7 && p.falhas < 3 && !cv.desfecho) {
          var t = numero("Pilotagem");
          l.push(t, mini("Registrar (DT " + dtMot + ")", function () { var n = inteiroDe(t); if (n === null) { UI.avisoAtencao("Digite o total."); return; } operar({ tipo: "motorista", veiculoId: v.id, total: n }); }));
        }
        return el("div.faixa", {}, l);
      }).concat([linha("Opcional (p. 86): o motorista também pode fazer, uma vez por rodada, um teste de sobrevivência como passageiro, sem deixar de dirigir.")])));
      if (mestre && !cv.desfecho) filhos.push(el("div.faixa", {}, [mini("Fim da rodada " + cf.rodada, function () { operar({ tipo: "rodada_fim", rodada: cf.rodada }); }, { dica: "Com sacrifícios ativos e reféns vivos, um refém morre (1 em 1d4: a pessoa querida de um agente)" })]));
      return el("div.vg-grupo.vg-confronto.pilha--curta", { class: "pilha" }, filhos);
    }

    /* ---------- histórico ---------- */

    function painelDoHistorico(lista, mestre) {
      var itens = lista.slice().reverse().slice(0, 40).map(function (h) {
        var feito = !!h.desfeitoEm;
        return el("li.vg-historico__item" + (feito ? ".vg-historico__item--desfeito" : ""), {}, [
          el("span.t-mini", { texto: (h.em || "").slice(11, 16) + " · " + (h.autorNome || "—") + ": " + h.texto + (feito ? " (desfeito" + (h.desfeitoPor ? " por " + h.desfeitoPor : "") + ")" : "") }),
          mestre && !feito && h.tipo !== "desfazer" && h.tipo !== "ligar" && h.tipo !== "selecionar" ? mini("Desfazer", function () {
            UI.confirmar({ titulo: "Desfazer?", texto: h.texto, detalhe: "Os efeitos desta operação voltam (contadores, estados, registros e o que ela escreveu nas fichas). A linha fica no histórico.", rotuloConfirmar: "Desfazer" }).then(function (s) { if (s) operar({ tipo: "desfazer", alvo: h.id }); });
          }) : null,
        ]);
      });
      return UI.recolhivel({ titulo: "Histórico", extra: lista.length + " registro(s)", conteudo: el("ul.vg-historico", {}, itens.length ? itens : [el("li.t-mini", { texto: "Nada ainda." })]) });
    }

    carregar();
    return alvo;
  }

  /* Ligar ou desligar de fora da aba (Configurações → Mecânicas
     opcionais). Só o mestre: o servidor confere. */
  async function definirAtivo(campanhaId, ativo) {
    return global.RAMAApi.operarViagem(campanhaId, opId(), { tipo: "ligar", ativo: !!ativo });
  }

  global.RAMACampanhaViagens = { aba: aba, definirAtivo: definirAtivo };
})(window);
