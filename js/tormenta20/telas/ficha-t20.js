/* =====================================================================
   R.A.M.A. — Tormenta20 · a ficha (v8.0)
   ---------------------------------------------------------------------
   As seções seguem a hierarquia da ficha oficial: identidade,
   atributos, PV/PM, Defesa e ataques sempre à mão; perícias, poderes,
   magias, inventário, parceiros e progressão em abas. Todo número abre
   as parcelas ao toque. Nenhuma regra mora aqui: o motor calcula, e
   cada ação vira UMA operação com id (RAMATormenta20Tela.operar).

     RAMASecaoTormenta20             bloco superior + aba "Personagem"
     RAMASecaoTormenta20Pericias     perícias, usos com CD, ofícios
     RAMASecaoTormenta20Habilidades  habilidades e poderes, com ações
     RAMASecaoTormenta20Magias       fontes, CD, magias e lançamento com
                                     aprimoramentos e efeitos ativos
     RAMASecaoTormenta20Inventario   itens, vestir/empunhar, carga,
                                     compra e venda, fabricação,
                                     engenhocas
     RAMASecaoTormenta20Parceiros    parceiros e montarias
     RAMASecaoTormenta20Progressao   XP, níveis, multiclasse, atributos,
                                     treino pela Inteligência, opções
   Numa campanha, ataques e magias contra ameaças da mesa vão ao
   servidor (RAMATormenta20MesaDaFicha), que rola e aplica uma vez.
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function R() { return global.RAMATormenta20; }
  function D() { return global.RAMATormenta20Dados; }
  function RA() { return global.RAMATormenta20Racas; }
  function CL() { return global.RAMATormenta20Classes; }
  function OR() { return global.RAMATormenta20Origens; }
  function DE() { return global.RAMATormenta20Deuses; }
  function PO() { return global.RAMATormenta20Poderes; }
  function EQ() { return global.RAMATormenta20Equipamento; }
  function MG() { return global.RAMATormenta20Magias; }
  function IM() { return global.RAMATormenta20ItensMagicos; }
  function PA() { return global.RAMATormenta20Parceiros; }
  function T() { return global.RAMATormenta20Tela; }
  function M() { return global.RAMATormenta20MesaDaFicha; }
  function E() { return global.RAMATormenta20Escolhas; }
  function UI() { return global.RAMAUI; }

  function bl(ctx) { return ctx.ficha.tormenta20; }
  function calc(ctx) { try { return R().calcular(R().normalizar(bl(ctx))); } catch (e) { return null; } }
  function op(ctx, fn, x) { return T().operar(ctx, fn, x); }
  function botao(t, f, o) { return T().botao(t, f, o); }
  function pode(ctx) { return ctx.podeEditar(); }
  function linha(t) { return el("p.t-mini", { texto: t }); }
  function ok() { return { ok: true }; }
  function nomeClasse(k) { return CL().CLASSE[k] ? CL().CLASSE[k].nome : k; }
  function nomeCondicao(id) { return D().CONDICAO[id] ? D().CONDICAO[id].nome : id; }
  function janela(titulo, conteudo, botoes, extra) { return UI().modal(Object.assign({ titulo: titulo, conteudo: conteudo, botoes: botoes || [{ rotulo: "Fechar" }] }, extra || {})); }

  /* ================================================ BLOCO SUPERIOR
     A hierarquia da ficha oficial (p. 1): quem é o personagem, os seis
     atributos, PV e PM, Defesa e o que se consulta em jogo, e as ações.
     Tudo à mão; os detalhes abrem no "i" de cada número. */
  var SENTIDOS = { visaoNoEscuro: "Visão no escuro", visaoNaPenumbra: "Visão na penumbra", faro: "Faro", percepcaoAsCegas: "Percepção às cegas", visaoVerdadeira: "Visão verdadeira", sentirVibracoes: "Sentir vibrações" };
  function nomeSentido(k) { return SENTIDOS[k] || humanizar(k); }
  function dadosDeIdentidade(b, c) {
    var r = RA().RACA[b.raca.id];
    var o = b.origem.propria ? b.origem.propria.nome : (OR().ORIGEM[b.origem.id] || {}).nome;
    var classes = Object.keys(c.niveisClasse).map(function (k) { return nomeClasse(k) + " " + c.niveisClasse[k]; }).join(" / ");
    var dv = b.divindade && DE().DEUS[b.divindade.id];
    var variante = r && r.variantes && b.raca.variante ? (r.variantes.filter(function (v) { return v.id === b.raca.variante; })[0] || {}).nome : "";
    return [
      ["Raça", r ? r.nome + (variante ? " (" + variante + ")" : "") : "—"],
      ["Origem", o || "—"],
      ["Classe e nível", classes || "—"],
      ["Divindade", dv ? dv.nome : "Nenhuma"],
    ];
  }
  function linhaIdentidade(b, c) { return dadosDeIdentidade(b, c).map(function (x) { return x[1]; }).join(" · "); }
  function etiquetas(ctx, b, c) {
    var e = [];
    c.condicoes.forEach(function (x) {
      e.push(el("span.r-etiqueta.r-etiqueta--aviso", { title: (D().CONDICAO[x.id] || {}).resumo || "" }, [el("span", { texto: x.nome }), pode(ctx) && b.condicoes.some(function (y) { return y.id === x.id; }) ? el("button.r-icone.t20-tirar", { type: "button", "aria-label": "Tirar " + x.nome, onclick: function () { op(ctx, function (t) { R().removerCondicao(t, x.id); return ok(); }); } }, [UI().simbolo("x")]) : null]));
    });
    if (b.recursos.sangrando) e.push(T().etiqueta("Sangrando", true));
    if (c.carga.sobrecarregado) e.push(T().etiqueta(c.carga.excesso ? "Carga acima do máximo" : "Sobrecarregado", true));
    if (c.podeSubir) e.push(T().etiqueta("Pode subir de nível"));
    b.ativos.filter(function (a) { return a.sustentada; }).forEach(function (a) { e.push(T().etiqueta("Sustentando: " + a.nome)); });
    if (c.minimos.length) e.push(T().etiqueta("Atributo abaixo de −5", true));
    return e;
  }
  function pct(a, m) { return m ? Math.max(0, Math.min(100, Math.round(a / m * 100))) : 0; }
  function recurso(ctx, qual, c) {
    var r = c[qual];
    var pv = qual === "pv";
    var nome = pv ? "Pontos de Vida" : "Pontos de Mana";
    var parcelas = pv ? r.parcelas.concat([{ rotulo: "Morre em", valor: String(r.limiteMorte) }]) : r.parcelas;
    return el("div.t20-recurso.t20-recurso--" + qual, {}, [
      el("div.t20-recurso__topo", {}, [el("span.t20-recurso__nome", { texto: nome }), T().valor(nome + " máximos", r.max, parcelas, { classe: "t20-valor--mini", formato: function (v) { return "máx. " + v; } })]),
      el("p.t20-recurso__numeros", {}, [
        el("span.t20-recurso__atual", { texto: String(r.atual) }),
        el("span.t20-recurso__max", { texto: "/ " + r.max }),
        r.temp ? el("span.t20-recurso__temp", { texto: "+" + r.temp + " temp." }) : null,
      ]),
      el("div.t20-barra", { role: "img", "aria-label": (pv ? "PV " : "PM ") + r.atual + " de " + r.max }, [el("span.t20-barra__cheio", { style: "width:" + pct(r.atual, r.max) + "%" })]),
      pode(ctx) ? el("div.t20-recurso__acoes", {}, pv ? [
        botao("− Dano", function () { dialogoDano(ctx); }, { rotulo: "Sofrer dano" }),
        botao("+ Cura", function () { dialogoCura(ctx); }, { rotulo: "Curar" }),
        botao("Temp.", function () { dialogoTemp(ctx, "pv"); }, { classe: "r-botao--fantasma", rotulo: "PV temporários" }),
      ] : [
        botao("− Gastar", function () { dialogoPM(ctx, -1); }, { rotulo: "Gastar PM" }),
        botao("+ Recuperar", function () { dialogoPM(ctx, 1); }, { rotulo: "Recuperar PM" }),
        botao("Temp.", function () { dialogoTemp(ctx, "pm"); }, { classe: "r-botao--fantasma", rotulo: "PM temporários" }),
      ]) : null,
    ]);
  }
  function blocoSuperior(ctx) {
    var b = bl(ctx);
    if (!b || !R()) return el("p", { texto: "O motor de Tormenta20 não está carregado nesta página." });
    M().naMesa(ctx);
    var c = calc(ctx);
    var geral = global.RAMASecaoGeral;
    if (!c) return el("p.t-erro", { texto: "A ficha tem dados que o motor não entendeu." });
    var semClasse = !b.niveis.length;
    var fontesMagia = Object.keys(c.magias.fontes);
    var xpAnt = D().xpDoNivel(c.nivel), xpProx = c.proximoNivelXp;
    var estados = etiquetas(ctx, b, c);
    var temMagia = R().magiasConhecidas(b, c).length > 0;
    return el("div.t20-bloco", {}, [
      el("div.t20-cab", {}, [
        geral && geral.foto ? geral.foto(ctx) : null,
        el("div.t20-cab__textos", {}, [
          geral && geral.campoNome ? geral.campoNome(ctx) : el("h1.t-titulo", { texto: ctx.ficha.nome }),
          el("dl.t20-cab__dados", {}, dadosDeIdentidade(b, c).map(function (x) { return el("div", {}, [el("dt", { texto: x[0] }), el("dd", { texto: x[1] })]); })),
          el("div.t20-cab__xp", {}, [
            el("span", { texto: "Nível " + c.nivel + " · " + c.patamar.nome }),
            el("span.t-mini", { texto: xpProx ? "XP " + b.xp + " / " + xpProx : "XP " + b.xp + " · nível máximo" }),
            xpProx ? el("span.t20-barra.t20-barra--xp", { role: "img", "aria-label": "Experiência: " + b.xp + " de " + xpProx }, [el("span.t20-barra__cheio", { style: "width:" + pct(b.xp - xpAnt, xpProx - xpAnt) + "%" })]) : null,
          ]),
        ]),
        global.RAMACapaSistema ? el("span.t20-cab__marca", {}, [global.RAMACapaSistema.elemento("tormenta20", { tamanho: "p" })]) : null,
      ]),
      semClasse ? el("div.t20-pendencias", { role: "status" }, [el("p", { texto: "A criação ainda não terminou: falta raça, origem ou classe." }), pode(ctx) && global.RAMATormenta20Criar ? botao("Abrir a criação", function () { global.RAMATormenta20Criar.abrir({ ctx: ctx }); }) : null]) : null,
      estados.length ? el("p.t20-estados", { role: "status" }, estados) : null,
      el("div.t20-atributos", { role: "group", "aria-label": "Atributos (clique para rolar)" }, R().ATR.map(function (a) {
        var x = c.atributos[a];
        return el("div.t20-atr", {}, [
          el("span.t20-atr__sigla", { texto: T().siglaAtr(a), "aria-hidden": "true" }),
          T().rolavel(T().nomeAtr(a), T().sinal(x.total), x.parcelas, function () { T().teste("Teste de " + T().nomeAtr(a), x.total, x.parcelas); }, { classe: "t20-rol--atr", acao: "Rolar teste de" }),
          el("span.t20-atr__nome", { texto: T().nomeAtr(a) }),
        ]);
      })),
      el("div.t20-vitais", {}, [
        recurso(ctx, "pv", c),
        recurso(ctx, "pm", c),
        el("div.t20-defesa", {}, [
          el("span.t20-defesa__nome", { texto: "Defesa" }),
          el("div.t20-defesa__escudo", {}, [T().valor("Defesa", c.defesa.total, c.defesa.parcelas, { classe: "t20-valor--defesa" })]),
          c.defesa.distancia !== undefined && c.defesa.distancia !== c.defesa.total ? el("span.t-mini", { texto: "contra distância " + c.defesa.distancia }) : null,
        ]),
        el("div.t20-dados", {}, [
          T().valor("Deslocamento", c.deslocamento.terrestre + " m", c.deslocamento.parcelas, { classe: "t20-valor--dado", formato: function (v) { return v + Object.keys(c.deslocamento.outros).map(function (k) { return " · " + k + " " + c.deslocamento.outros[k] + " m"; }).join(""); } }),
          T().valor("Penalidade de armadura", c.penalidadeArmadura.total, c.penalidadeArmadura.parcelas, { classe: "t20-valor--dado" }),
          T().valor("Carga (espaços)", c.carga.usada + " / " + c.carga.limite, [{ rotulo: "Limite (10 + 2 × Força)", valor: c.carga.limite }, { rotulo: "Máximo (dobro)", valor: c.carga.maximo }], { classe: "t20-valor--dado" + (c.carga.sobrecarregado ? ".t20-valor--alerta" : "") }),
          T().valor("Tamanho", c.tamanho.nome, [{ rotulo: "Manobras", valor: c.tamanho.manobra || 0 }, { rotulo: "Furtividade", valor: c.tamanho.furtividade || 0 }], { classe: "t20-valor--dado" }),
          fontesMagia.length ? T().valor("CD de magia", fontesMagia.map(function (k) { return c.magias.fontes[k].cd; }).join(" / "), fontesMagia.map(function (k) { var f = c.magias.fontes[k]; return { rotulo: f.nome + ": 10 + ½ nível + " + T().nomeAtr(f.atributo), valor: f.cd }; }), { classe: "t20-valor--dado" }) : null,
        ]),
      ]),
      el("div.t20-acoes", { role: "toolbar", "aria-label": "Ações de jogo" }, [
        el("span.t20-acoes__grupo", {}, [
          botao("Teste", function () { dialogoTeste(ctx); }, { classe: "r-botao--principal" }),
          c.ataques.length ? botao("Atacar", function () { dialogoAtaque(ctx); }, { classe: "r-botao--principal" }) : null,
          temMagia ? botao("Lançar magia", function () { dialogoListaMagias(ctx); }, { classe: "r-botao--principal" }) : null,
          botao("Manobra", function () { dialogoManobra(ctx); }, { dica: "Agarrar, derrubar, desarmar, empurrar ou quebrar (p. 234)" }),
        ]),
        pode(ctx) ? el("span.t20-acoes__grupo.t20-acoes__grupo--turno", {}, [
          b.recursos.sangrando ? botao("Sangrando: Con CD 15", function () { testeSangramento(ctx); }, { classe: "r-botao--principal" }) : null,
          botao("Início do turno", function () { inicioDoTurno(ctx); }, { dica: "Cobra 1 PM de cada efeito sustentado; sem PM, ele termina (p. 224)", classe: "r-botao--fantasma" }),
          botao("Fim de cena", function () { op(ctx, function (t) { var r = R().fimDeCena(t); UI().avisoOk("Fim de cena: " + r.efeitos + " efeito(s) e " + r.condicoes + " condição(ões) terminaram."); return ok(); }); }, { classe: "r-botao--fantasma" }),
          botao("Descansar", function () { dialogoDescanso(ctx); }, { classe: "r-botao--fantasma" }),
          botao("Condição", function () { dialogoCondicao(ctx); }, { classe: "r-botao--fantasma" }),
        ]) : null,
      ]),
    ]);
  }

  /* Manobra de combate (p. 234): teste de ataque corpo a corpo oposto.
     Contra uma ameaça da mesa, o servidor rola e aplica a condição;
     fora da mesa, a ficha rola contra o bônus informado. */
  function dialogoManobra(ctx) {
    var c = calc(ctx);
    if (!c) return;
    var sel = T().selecao("Manobra", D().MANOBRAS.map(function (m) { return { valor: m.id, rotulo: m.nome + " " + T().sinal(c.manobras[m.id].total) }; }), "derrubar");
    var info = el("div.pilha--curta", { class: "pilha" });
    function mostrarInfo() {
      var mb = c.manobras[sel.entrada.value], d = D().MANOBRAS.filter(function (m) { return m.id === sel.entrada.value; })[0];
      U.trocar(info, [T().valor("Teste de manobra", T().sinal(mb.total), mb.parcelas), linha(d.resumo + " (" + T().referencia(234) + ")")]);
    }
    sel.entrada.addEventListener("change", mostrarInfo); mostrarInfo();
    var bonus = T().numero("Bônus do momento (flanquear +2, etc.)", 0);
    var alvos = M().alvos(ctx);
    var alvoSel = alvos.length ? T().selecao("Ameaça da mesa (o servidor rola e aplica a condição)", [{ valor: "", rotulo: "— oponente fora da mesa —" }].concat(alvos.map(function (p) { return { valor: p.id, rotulo: p.nome }; })), alvos[0].id) : null;
    var opo = T().numero("Bônus de manobra do oponente (fora da mesa)", 0);
    janela("Manobra de combate", [sel, info, bonus, alvoSel, opo, linha("Empate: vence o maior bônus; bônus iguais, rola de novo. Só corpo a corpo.")], [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Rolar", classe: "r-botao--principal", aoClicar: function (fechar) {
        var id = sel.entrada.value, extra = T().lerNumero(bonus, 0);
        fechar();
        if (alvoSel && alvoSel.entrada.value) {
          return M().operar(ctx, { tipo: "manobraContraAmeaca", alvo: alvoSel.entrada.value, manobra: id, bonus: extra }).then(function (r) {
            if (!r || !r.ok || !r.dados) return;
            var m = r.dados.resultado.manobra;
            if (m) UI().aviso(m.nome + ": " + m.oposto.totalA + " × " + m.oposto.totalB + " — " + (m.venceu ? m.consequencia : "falhou."), { duracao: 9000 });
          });
        }
        var mb = c.manobras[id];
        var r = R().resolverManobra(T().rolar, id, mb.total + extra, T().lerNumero(opo, 0));
        T().mostrar(r.nome + " (oposto)", { expressao: "1d20" + T().sinal(mb.total + extra), rolagens: [r.oposto.dA], natural: r.oposto.dA, total: r.oposto.totalA, parcelas: mb.parcelas.filter(function (p) { return !p.situacional; }).map(function (p) { return { rotulo: p.rotulo, valor: p.valor }; }), marcas: [(r.venceu ? "venceu " : "perdeu ") + r.oposto.totalA + " × " + r.oposto.totalB + (r.oposto.desempate ? " (desempate pelo bônus)" : "")] });
        UI().aviso(r.venceu ? r.consequencia : "A manobra falhou.", { duracao: 8000 });
      } },
    ]);
  }

  /* ------------------------------------------- diálogos de recursos */
  function dialogoDano(ctx) {
    var v = T().numero("Dano"), tipo = T().selecao("Tipo", [{ valor: "", rotulo: "Sem tipo" }].concat(D().TIPOS_DANO.map(function (x) { return { valor: x[0], rotulo: x[1] }; })), "");
    var marcas = { metade: false, naoLetal: false, perdaDeVida: false };
    function caixa(chave, rotulo) { return el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { marcas[chave] = ev.currentTarget.checked; } }), el("span", { texto: rotulo })]); }
    janela("Sofrer dano", [v, tipo, caixa("metade", "Passou na resistência (metade)"), caixa("naoLetal", "Dano não letal"), caixa("perdaDeVida", "Perda de vida (ignora RD)"), linha("Ordem (p. 226): resistência, RD, vulnerabilidade; PV temporários primeiro. 0 PV ou menos: inconsciente e sangrando.")], [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (fechar) {
        var n = T().lerNumero(v, 0);
        op(ctx, function (t) {
          var r = R().aplicarDano(t, n, tipo.entrada.value || null, marcas);
          var txt = "Dano " + r.dano + (r.absorvido ? " (" + r.absorvido + " nos temporários)" : "") + (r.notas.length ? " · " + r.notas.join(", ") : "") + " · PV " + r.pv;
          if (t.opcoes.parceirosVulneraveis && t.parceiros.length && r.dano > 0) { var ev = PA().testarVulneraveis(t.parceiros, T().rolar); ev.forEach(function (x) { if (x.ferido) txt += " · " + x.nome + " ferido (d" + x.faces + "=1)"; if (x.morreu) txt += " · " + x.nome + " morreu"; }); }
          if (r.estado === "morto") UI().avisoErro(txt + " — chegou ao limite de morte (" + R().calcular(t).pv.limiteMorte + ").");
          else if (r.estado === "sangrando") UI().avisoAtencao(txt + " — inconsciente e sangrando.");
          else UI().aviso(txt);
          return ok();
        });
        fechar();
      } },
    ]);
  }
  function dialogoCura(ctx) {
    var v = UI().campo({ rotulo: "Cura (número ou dados, como 2d8+2)", valor: "" });
    janela("Curar", [v, linha("Qualquer cura de 1 PV ou mais estabiliza quem está sangrando (p. 236).")], [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Curar", classe: "r-botao--principal", aoClicar: function (fechar) {
        var s = String(v.entrada.value).trim();
        var n = /d/.test(s) ? T().rolarExpressao("Cura", s, "teste").total : Math.max(0, Math.floor(Number(s) || 0));
        op(ctx, function (t) { var r = R().curar(t, n); UI().avisoOk("+" + r.curado + " PV (agora " + r.pv + ")."); return ok(); });
        fechar();
      } },
    ]);
  }
  function dialogoTemp(ctx, qual) {
    var v = T().numero(qual === "pv" ? "PV temporários" : "PM temporários");
    janela(qual === "pv" ? "PV temporários" : "PM temporários", [v, linha("Temporários de fontes diferentes não se somam: vale o maior (p. 226). Somem no fim do dia, ou da cena se a fonte disser.")], [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (fechar) { var n = T().lerNumero(v, 0); op(ctx, function (t) { if (qual === "pv") R().receberPvTemp(t, n); else t.recursos.pmTemp = Math.max(t.recursos.pmTemp, Math.max(0, n)); return ok(); }); fechar(); } },
    ]);
  }
  function dialogoPM(ctx, sinal) {
    var v = T().numero(sinal < 0 ? "PM a gastar" : "PM a recuperar", 1);
    janela(sinal < 0 ? "Gastar PM" : "Recuperar PM", [v], [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Confirmar", classe: "r-botao--principal", aoClicar: function (fechar) {
        var n = Math.max(0, T().lerNumero(v, 0));
        op(ctx, function (t) {
          if (sinal < 0) { var g = R().gastarPM(t, n); return g.ok ? ok() : { ok: false, motivo: "PM insuficientes (" + g.disponivel + ")." }; }
          var c = R().calcular(t); t.recursos.pm = Math.min(c.pm.max, c.pm.atual + n); t.recursos.pmRef = c.pm.max; return ok();
        });
        fechar();
      } },
    ]);
  }
  function dialogoDescanso(ctx) {
    var cond = T().selecao("Condição de descanso (p. 106)", D().DESCANSO.map(function (d) { return { valor: d.chave, rotulo: d.nome + " (×" + d.fator + " o nível)" }; }), "normal");
    janela("Descansar uma noite", [cond, linha("Recupera PV e PM iguais ao nível vezes o fator da condição; temporários somem; usos por dia e por cena voltam.")], [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Descansar", classe: "r-botao--principal", aoClicar: function (fechar) { op(ctx, function (t) { var r = R().descansar(t, cond.entrada.value); UI().avisoOk("Descanso " + r.condicao + ": +" + r.pv + " PV, +" + r.pm + " PM."); return ok(); }); fechar(); } },
    ]);
  }
  function dialogoCondicao(ctx) {
    var sel = T().selecao("Condição", D().CONDICOES.map(function (x) { return { valor: x.id, rotulo: x.nome }; }), D().CONDICOES[0].id);
    var rod = T().numero("Rodadas (vazio = até o fim da cena)");
    var res = el("p.t-mini", { role: "status" });
    function mostrarResumo() { var x = D().CONDICAO[sel.entrada.value]; res.textContent = x ? x.resumo : ""; }
    sel.entrada.addEventListener("change", mostrarResumo); mostrarResumo();
    janela("Aplicar condição", [sel, rod, res, linha("Imunidades valem; a mesma condição de novo agrava (abalado → apavorado; fraco → debilitado; fatigado → exausto), p. 394.")], [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (fechar) {
        var r0 = T().lerNumero(rod, null);
        op(ctx, function (t) { var r = R().aplicarCondicao(t, sel.entrada.value, "Manual", { duracao: r0 ? "rodadas" : "cena", rodadas: r0 === null ? undefined : r0 }); if (r.motivo === "imune") return { ok: false, motivo: "Imune (" + r.fonte + ")." }; return ok(); });
        fechar();
      } },
    ]);
  }
  function inicioDoTurno(ctx) {
    op(ctx, function (t) {
      var r = R().inicioDoTurno(t);
      var partes = [];
      if (r.cobradas.length) partes.push("1 PM cada: " + r.cobradas.join(", "));
      if (r.encerradas.length) partes.push("Sem PM, terminaram: " + r.encerradas.join(", "));
      R().calcular(t).condicoes.forEach(function (x) { var cd = D().CONDICAO[x.id]; if (cd && cd.inicioDoTurno) partes.push(x.nome + ": " + cd.inicioDoTurno); });
      if (t.recursos.sangrando) partes.push("Sangrando: teste de Constituição (CD 15)");
      UI().aviso(partes.length ? partes.join(" · ") : "Nada a cobrar no início do turno.");
      return ok();
    });
  }
  function testeSangramento(ctx) {
    op(ctx, function (t) {
      var r = R().testeDeSangramento(t, T().rolar);
      T().mostrar("Sangrando · Constituição CD 15", { expressao: "1d20" + T().sinal(R().calcular(t).atr.con), rolagens: [r.rolagem], natural: r.rolagem, total: r.total, marcas: [r.estabilizou ? "estabilizou" : "falhou"] });
      if (r.estabilizou) UI().avisoOk("Estabilizou."); else UI().avisoAtencao("Perdeu " + r.perda + " PV (agora " + r.pv + ")" + (r.estado === "morto" ? " — morreu." : "."));
      return ok();
    });
  }

  /* -------------------------------------------------- testes */
  function listaDeTestes(c) {
    var l = R().ATR.map(function (a) { return { valor: "atr:" + a, rotulo: "Atributo: " + T().nomeAtr(a), total: c.atributos[a].total, parcelas: c.atributos[a].parcelas }; });
    Object.keys(c.pericias).forEach(function (k) { var p = c.pericias[k]; l.push({ valor: "per:" + k, rotulo: p.nome + (p.somenteTreinada && !p.treinado ? " (só treinada)" : ""), total: p.total, parcelas: p.parcelas, utilizavel: p.utilizavel }); });
    return l;
  }
  function dialogoTeste(ctx, chave) {
    var c = calc(ctx);
    var lista = listaDeTestes(c);
    var sel = T().selecao("Teste", lista.map(function (x) { return { valor: x.valor, rotulo: x.rotulo + " " + T().sinal(x.total) }; }), chave || "per:percepcao");
    var cd = T().numero("CD (opcional)"), bonus = T().numero("Bônus do momento (ajuda, circunstância)", "");
    var dois = { v: false };
    var usos = el("div.t20-usos");
    function mostrarUsos() {
      var k = sel.entrada.value.replace(/^per:/, "").split(":")[0];
      var p = D().PERICIA[k];
      U.trocar(usos, p && p.usos && p.usos.length ? [el("p.t-rotulo", { texto: "Usos (" + T().referencia(p.pagina) + ")" }), el("ul.t20-lista", {}, p.usos.map(function (u) { return el("li", {}, [el("button.t20-link", { type: "button", texto: u.nome + (u.cd ? " · CD " + u.cd : ""), onclick: function () { if (u.cd && /^\d+$/.test(String(u.cd))) cd.entrada.value = u.cd; } }), el("span.t-mini", { texto: " " + (u.treinado ? "(só treinado) " : "") + (u.execucao ? D().NOMES_ACAO[u.execucao] || u.execucao : "") + " — " + u.resumo })]); }))] : []);
    }
    sel.entrada.addEventListener("change", mostrarUsos); mostrarUsos();
    janela("Teste", [sel, cd, bonus, el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { dois.v = ev.currentTarget.checked; } }), el("span", { texto: "Rolar dois dados e usar o melhor (quando uma habilidade permitir)" })]), usos], [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Rolar", classe: "r-botao--principal", aoClicar: function (fechar) {
        var x = lista.filter(function (y) { return y.valor === sel.entrada.value; })[0];
        if (x.utilizavel === false) { UI().avisoAtencao(x.rotulo + " exige treinamento."); return; }
        T().teste(x.rotulo.replace(/^Atributo: /, "Teste de "), x.total, x.parcelas, { cd: T().lerNumero(cd, undefined), bonus: T().lerNumero(bonus, 0), vantagem: dois.v });
        fechar();
      } },
    ]);
  }

  /* ------------------------------------------------ ataques */
  function dialogoAtaque(ctx, ataqueId) {
    var c = calc(ctx);
    var b = bl(ctx);
    var sel = T().selecao("Ataque", c.ataques.map(function (a) { return { valor: a.id, rotulo: a.nome + " " + T().sinal(a.ataque) + " (" + a.dano + T().sinal(a.danoFixo) + ", " + (a.margem < 20 ? a.margem + "/" : "") + "x" + a.mult + ")" }; }), ataqueId || c.ataques[0].id);
    var alvos = M().alvos(ctx);
    var alvo = alvos.length ? T().selecao("Alvo na mesa (o servidor rola e aplica)", [{ valor: "", rotulo: "Nenhum — rolar aqui" }].concat(alvos.map(function (p) { return { valor: p.id, rotulo: p.nome + (p.estado ? " (" + p.estado + ")" : "") }; })), "") : null;
    var def = T().numero("Defesa do alvo (opcional)");
    var marcas = {};
    var sit = el("fieldset.t20-situacoes", {}, [el("legend", { texto: "Situação (p. 233)" })].concat(D().SITUACOES.atacante.map(function (s) { return el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { marcas[s[0]] = ev.currentTarget.checked ? s[2] : 0; } }), el("span", { texto: s[1] + " " + T().sinal(s[2]) })]); })).concat([
      el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { marcas.investida = ev.currentTarget.checked ? 2 : 0; } }), el("span", { texto: "Investida (+2; –2 na sua Defesa até o próximo turno)" })]),
      el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { marcas.naoLetal = ev.currentTarget.checked ? -5 : 0; } }), el("span", { texto: "Dano não letal com arma letal (–5)" })]),
      el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { marcas.distanciaEmCorpo = ev.currentTarget.checked ? -5 : 0; } }), el("span", { texto: "À distância contra alvo em corpo a corpo (–5)" })]),
    ]));
    var extraDano = T().numero("Bônus no dano (opcional)");
    var info = el("div.t20-ataque-info");
    function mostrar() { var a = c.ataques.filter(function (x) { return x.id === sel.entrada.value; })[0]; U.trocar(info, a ? [T().valor("Ataque", T().sinal(a.ataque), a.parcelasAtaque), T().valor("Dano", a.dano + T().sinal(a.danoFixo), a.parcelasDano.map(function (p) { return { rotulo: p.rotulo, valor: p.valor }; }).concat(a.extras.map(function (x) { return { rotulo: x.rotulo + (x.tipo ? " (" + x.tipo + ")" : ""), valor: x.dados }; }))), linha("Crítico " + (a.margem < 20 ? a.margem + "–20" : "20") + ", x" + a.mult + ": multiplica só os dados da arma. Tipo " + (a.tipo || "—") + (a.alcance ? " · alcance " + a.alcance : "") + (a.proficiente ? "" : " · sem proficiência (–5)"))] : []); }
    sel.entrada.addEventListener("change", mostrar); mostrar();
    janela("Atacar", [sel, info, alvo, def, sit, extraDano], [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Rolar o ataque", classe: "r-botao--principal", aoClicar: function (fechar) {
        var a = c.ataques.filter(function (x) { return x.id === sel.entrada.value; })[0];
        var bonus = Object.keys(marcas).reduce(function (s, k) { return s + (Number(marcas[k]) || 0); }, 0);
        if (alvo && alvo.entrada.value) {
          fechar();
          return M().operar(ctx, { tipo: "atacarAmeaca", ataque: a.id, alvo: alvo.entrada.value, bonus: bonus, bonusDano: T().lerNumero(extraDano, 0) }).then(function (r) {
            if (!r.ok) return;
            var at = r.dados.resultado.ataque;
            UI().aviso((at.acertou ? (at.critico ? "Crítico! " : "Acertou! ") : "Errou. ") + "Total " + at.teste.total + " contra Defesa " + at.defesa + (at.dano ? " · dano " + at.dano.total : ""));
          });
        }
        if (a.municao && pode(ctx)) {
          var gasto = op(ctx, function (t) { var m = R().consumirMunicao(t, a); return m.ok ? ok() : { ok: false, motivo: m.motivo }; });
          if (gasto && gasto.ok === false) { fechar(); return; }
        }
        T().ataque(a.nome, a, def.entrada.value === "" ? null : T().lerNumero(def, null), { bonusAtaque: bonus, bonusDano: T().lerNumero(extraDano, 0) });
        if (marcas.investida && pode(ctx)) op(ctx, function (t) { t.ativos.push({ id: R().novoId(), fonte: "investida", nome: "Investida", x: 0, duracao: "ate o proximo turno", sustentada: false, estado: "", efeitos: [{ t: "bonus", alvo: "defesa", valor: -2, categoria: "habilidade" }], categoria: "habilidade", alvo: "", contador: 0 }); return ok(); });
        fechar();
      } },
    ]);
  }

  /* ===================================================== ABA COMBATE
     Ataques como na ficha oficial (teste, dano, crítico, tipo, alcance),
     resistências, defesas especiais, condições e efeitos, e as
     habilidades que se usam em jogo. */
  function abaPersonagem(ctx) {
    var b = bl(ctx);
    var c = calc(ctx);
    if (!c) return el("p.t-erro", { texto: "A ficha tem dados que o motor não entendeu." });
    var acoes = c.fontes.filter(function (f) { return f.def && (f.def.acao || f.def.reacao || f.acaoCaminho); });
    var defesas = [
      Object.keys(c.rd).length ? ["Redução de dano", Object.keys(c.rd).map(function (k) { return (k === "geral" ? "" : humanizar(k) + " ") + c.rd[k]; }).join(", ")] : null,
      Object.keys(c.imunidades).length ? ["Imunidades", Object.keys(c.imunidades).map(humanizar).join(", ")] : null,
      Object.keys(c.vulnerabilidades || {}).length ? ["Vulnerabilidades", Object.keys(c.vulnerabilidades).map(humanizar).join(", ")] : null,
      Object.keys(c.sentidos).length ? ["Sentidos", Object.keys(c.sentidos).map(nomeSentido).join(", ")] : null,
      ["Tipo", humanizar(c.tipoCriatura) + " · " + c.tamanho.nome],
    ].filter(Boolean);
    var situacoes = uniq(c.situacionais.map(function (s) { return s.cond; }));
    return el("div.t20-aba", {}, [
      T().secao("Ataques", c.ataques.length ? [
        el("div.t20-tabela-rolo", {}, [el("table.t20-tabela.t20-ataques", {}, [
          el("thead", {}, [el("tr", {}, ["Ataque", "Teste", "Dano", "Crítico", "Tipo", "Alcance"].map(function (h) { return el("th", { scope: "col", texto: h }); }))]),
          el("tbody", {}, c.ataques.map(function (a) {
            var dano = a.dano + (a.danoFixo ? T().sinal(a.danoFixo) : "") + a.extras.map(function (x) { return " + " + x.dados + (x.tipo ? " " + x.tipo : ""); }).join("");
            return el("tr", {}, [
              el("th", { scope: "row", texto: a.nome.replace(/ \(arremessada\)$/, "") + (a.arremessada ? " (arremesso)" : "") }),
              el("td", {}, [T().rolavel(a.nome, T().sinal(a.ataque), a.parcelasAtaque, function () { dialogoAtaque(ctx, a.id); }, { acao: "Atacar com", dica: "Atacar" })]),
              el("td", { texto: dano }),
              el("td", { texto: (a.margem < 20 ? a.margem + "/" : "") + "x" + a.mult }),
              el("td", { texto: a.tipo || "—" }),
              el("td", { texto: a.alcance ? rotulo(a.alcance) : (a.distancia ? "—" : "Corpo a corpo") }),
            ]);
          })),
        ])]),
      ] : [linha("Nenhuma arma empunhada. O ataque desarmado aparece quando a ficha tem classe.")], { acoes: [botao("Manobra", function () { dialogoManobra(ctx); }, { classe: "r-botao--fantasma", dica: "Agarrar, derrubar, desarmar, empurrar ou quebrar (p. 234)" })] }),
      el("div.t20-colunas", {}, [
        T().secao("Resistências", [
          el("div.t20-resists", {}, ["fortitude", "reflexos", "vontade"].map(function (k) {
            var p = c.pericias[k];
            return el("div.t20-resist", {}, [el("span.t20-resist__nome", { texto: p.nome }), T().rolavel(p.nome, T().sinal(p.total), p.parcelas, function () { T().teste(p.nome, p.total, p.parcelas); })]);
          })),
          el("dl.t20-pares", {}, defesas.map(function (d) { return el("div", {}, [el("dt", { texto: d[0] }), el("dd", { texto: d[1] })]); })),
        ]),
        T().secao("Condições e efeitos", [
          c.condicoes.length ? el("ul.t20-chips", {}, c.condicoes.map(function (x) { return el("li", { title: (D().CONDICAO[x.id] || {}).resumo || "" }, [el("strong", { texto: x.nome }), el("span.t-mini", { texto: " " + ((D().CONDICAO[x.id] || {}).resumo || "") })]); })) : null,
          b.ativos.length ? el("ul.t20-linhas", {}, b.ativos.map(function (a) {
            return el("li", {}, [
              el("span.t20-linhas__principal", {}, [el("strong", { texto: a.nome }), el("span.t-mini", { texto: " · " + (a.sustentada ? "sustentada (1 PM por turno)" : rotulo(a.duracao || "")) })]),
              pode(ctx) ? botao("Encerrar", function () { op(ctx, function (t) { R().encerrarAtivo(t, a.id); return ok(); }); }, { classe: "r-botao--fantasma", rotulo: "Encerrar " + a.nome }) : null,
            ]);
          })) : null,
          !c.condicoes.length && !b.ativos.length ? linha("Nenhuma condição nem efeito ativo.") : null,
        ], { acoes: pode(ctx) ? [botao("+ Condição", function () { dialogoCondicao(ctx); }, { classe: "r-botao--fantasma" })] : null }),
      ]),
      acoes.length ? T().secao("Habilidades de uso", [el("ul.t20-linhas", {}, acoes.map(function (f) { return itemDeAcao(ctx, f, c); }))], { info: "custo em PM e execução" }) : null,
      situacoes.length ? T().secao("Bônus por situação", [linha("Marque quando a situação valer; a ficha recalcula."), el("div.t20-situacoes", {}, situacoes.map(function (k) {
        var desc = c.situacionais.filter(function (s) { return s.cond === k; }).map(function (s) { return s.fonte + " (" + s.valor + ")"; }).join("; ");
        return el("label.r-marca", { title: desc }, [el("input", { type: "checkbox", checked: !!b.situacoes[k], disabled: !pode(ctx), onchange: function (ev) { var v = ev.currentTarget.checked; op(ctx, function (t) { t.situacoes[k] = v; return ok(); }); } }), el("span", { texto: humanizar(k) }), el("span.t-mini", { texto: " " + desc })]);
      }))]) : null,
    ]);
  }
  function uniq(l) { return l.filter(function (x, i) { return l.indexOf(x) === i; }); }
  function humanizar(k) { return String(k).replace(/([A-Z])/g, " $1").replace(/^./, function (x) { return x.toUpperCase(); }).toLowerCase().replace(/^./, function (x) { return x.toUpperCase(); }); }
  function textoEfeito(e) { if (e.t === "bonus") return e.alvo + " " + T().sinal(e.valor); if (e.t === "rd") return "RD " + e.valor; if (e.t === "passoDano") return "dano +" + e.valor + " passo"; if (e.t === "estado") return e.valor; return ""; }
  function itemDeAcao(ctx, f, c) {
    var a = f.def.acao || f.acaoCaminho || f.def.reacao;
    var custo = (a.custo || 0) + (a.escala ? " + " + (a.escala.pm || 1) + " por " + (a.escala.rotulo || "aumento") : "");
    var execucao = D().NOMES_ACAO[a.execucao] || a.execucao || (f.def.reacao ? "Reação" : "");
    return el("li", {}, [
      el("span.t20-linhas__principal", {}, [el("strong", { texto: f.nome }), el("span.t-mini", { texto: " · " + [rotulo(execucao), custo + " PM", a.duracao ? rotulo(a.duracao) : ""].filter(Boolean).join(" · ") })]),
      pode(ctx) ? botao("Usar", function () { usarHabilidade(ctx, f, a, c); }, { rotulo: "Usar " + f.nome }) : null,
      f.def.resumo ? el("p.t20-linhas__texto", { texto: f.def.resumo }) : null,
    ]);
  }
  function usarHabilidade(ctx, f, a, c) {
    var x = a.escala ? T().numero("Aumentos (" + (a.escala.rotulo || "PM extras") + ")", 0) : null;
    var alvo = UI().campo({ rotulo: "Alvo (opcional)", valor: "" });
    var limite = R().limiteDePM(c, f);
    janela(f.nome, [linha(f.def.resumo || ""), x, alvo, linha("Limite de PM por uso desta fonte: " + limite + " (p. 224)." + (c.tem["cond:alquebrado"] ? " Alquebrado: +1 PM." : ""))], [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Usar", classe: "r-botao--principal", aoClicar: function (fechar) {
        var res = null;
        op(ctx, function (t) { res = R().ativar(t, f.id, { x: x ? T().lerNumero(x, 0) : 0, alvo: alvo.entrada.value }); if (!res.ok) return { ok: false, motivo: ({ sem_acao: "Sem ação.", escala: "Máximo de aumentos: " + res.max + ".", limite_pm: "Passa do limite de " + res.limite + " PM.", uma_vez_por_cena: "Só uma vez por cena.", pm_insuficiente: "PM insuficientes." })[res.motivo] || res.motivo }; return res; });
        if (res && res.ok) {
          var partes = [res.nome + ": " + res.custo + " PM"];
          if (res.rolar) partes.push("cura " + T().rolarExpressao(res.nome + " · cura", res.rolar, "teste").total);
          if (res.rolarDano) partes.push("dano " + T().rolarExpressao(res.nome + " · dano", res.rolarDano.dados).total + (res.rolarDano.tipo ? " " + res.rolarDano.tipo : ""));
          if (res.cd) partes.push("CD " + res.cd);
          if (res.pvTemp) partes.push(res.pvTemp + " PV temporários");
          if (res.texto) partes.push(res.texto);
          UI().aviso(partes.join(" · "));
        }
        fechar();
      } },
    ]);
  }

  /* ===================================================== PERÍCIAS
     Como a coluna da ficha oficial: total = ½ nível + atributo + treino +
     outros. O total rola na hora; o nome abre o teste com CD e os usos. */
  function abaPericias(ctx) {
    var c = calc(ctx);
    if (!c) return el("p");
    var chaves = Object.keys(c.pericias).sort(function (a, b) { return c.pericias[a].nome.localeCompare(c.pericias[b].nome); });
    var ofOpcoes = [{ valor: "", rotulo: "—" }].concat(D().OFICIOS.map(function (o) { return { valor: o.chave, rotulo: o.nome }; }));
    function partes(p) {
      var meio = Math.floor(c.nivel / 2);
      var atr = c.atr[p.atributo] || 0;
      var treino = p.treinado ? c.treino : 0;
      return { meio: meio, atr: atr, treino: treino, outros: p.total - meio - atr - treino };
    }
    var linhas = chaves.map(function (k) {
      var p = c.pericias[k];
      var x = partes(p);
      var marcas = (p.somenteTreinada ? "*" : "") + (p.armadura ? "⚔" : "");
      return el("li.t20-per" + (p.treinado ? ".t20-per--treinada" : "") + (p.utilizavel ? "" : ".t20-per--indisponivel"), {}, [
        el("span.t20-per__marca", { "aria-hidden": "true", title: p.treinado ? "Treinada" : "Não treinada" }),
        el("button.t20-per__nome", { type: "button", "aria-label": p.nome + (p.treinado ? ", treinada" : "") + ": abrir o teste com CD e usos", onclick: function () { if (!p.utilizavel) { UI().avisoAtencao(p.nome + " exige treinamento."); return; } dialogoTeste(ctx, "per:" + k); } }, [
          el("span", { texto: p.nome }), marcas ? el("sup.t20-per__sinais", { texto: marcas }) : null,
        ]),
        T().rolavel(p.nome, T().sinal(p.total), p.parcelas, function () { if (!p.utilizavel) { UI().avisoAtencao(p.nome + " exige treinamento."); return; } T().teste(p.nome, p.total, p.parcelas); }, { classe: "t20-rol--per" }),
        el("span.t20-per__conta", { "aria-hidden": "true" }, [
          el("span", { texto: String(x.meio) }), el("span", { texto: T().siglaAtr(p.atributo) + " " + T().sinal(x.atr) }), el("span", { texto: x.treino ? "+" + x.treino : "—" }), el("span", { texto: x.outros ? T().sinal(x.outros) : "—" }),
        ]),
      ]);
    });
    return el("div.t20-aba", {}, [
      c.oficiosPendentes.length ? el("div.t20-pendencias", { role: "status" }, [el("p", { texto: "Ofício sem especialização: o treino só vale depois de escolher qual (p. 121)." })].concat(pode(ctx) ? c.oficiosPendentes.map(function (p) {
        return T().selecao("Ofício de " + p.fonte, ofOpcoes, "", function (v) { if (v) op(ctx, function (t) { return R().definirOficio(t, p, v); }); });
      }) : [])) : null,
      T().secao("Perícias", [
        el("div.t20-per-cabecas", { "aria-hidden": "true" }, [0, 1].map(function () { return el("div.t20-per-cabeca", {}, [el("span"), el("span", { texto: "Perícia" }), el("span", { texto: "Total" }), el("span.t20-per__conta", {}, [el("span", { texto: "½ nív." }), el("span", { texto: "Atrib." }), el("span", { texto: "Treino" }), el("span", { texto: "Outros" })])]); })),
        el("ul.t20-per-lista", {}, linhas),
        el("p.t20-legenda", { texto: "● treinada · * só treinada · ⚔ penalidade de armadura. Clique no total para rolar; no nome, para escolher a CD e ver os usos (p. 114)." }),
      ], { info: "½ nível " + Math.floor(c.nivel / 2) + " · treino +" + c.treino }),
    ]);
  }

  /* =================================================== HABILIDADES
     Como a página 2 da ficha oficial: raça e origem; classe e poderes.
     Treinos e proficiências (sem texto próprio) já aparecem nas perícias
     e no combate, e não repetem aqui. */
  function abaHabilidades(ctx) {
    var b = bl(ctx);
    var c = calc(ctx);
    if (!c) return el("p");
    var visiveis = c.fontes.filter(function (f) {
      if (f.tipoFonte === "int" || f.tipoFonte === "ativo") return false;
      var d = f.def || {};
      return !!(d.resumo || d.acao || d.reacao || f.acaoCaminho);
    });
    /* A escolha feita (caminho, linhagem, elemento…) aparece no nome; o
       caminho do Arcanista mostra só o texto do caminho escolhido. */
    function escolhaFeita(f, d) {
      var esc = f.escolhas || {};
      return (d.escolhas || []).map(function (e) {
        var v = esc[e.id];
        if (!v || !e.opcoes) return "";
        var vs = Array.isArray(v) ? v : [v];
        return vs.map(function (x) { var o = e.opcoes.filter(function (y) { return y[0] === x; })[0]; return o ? o[1] : x; }).join(", ");
      }).filter(Boolean).join(" · ");
    }
    function cartao(f) {
      var d = f.def || {};
      var a = d.acao || f.acaoCaminho || d.reacao;
      var feita = escolhaFeita(f, d);
      var caminho = d.caminhos && f.escolhas && d.caminhos[f.escolhas.caminho];
      var texto = caminho ? caminho.resumo : d.resumo;
      return el("li.t20-hab", {}, [
        el("div.t20-hab__topo", {}, [
          el("strong.t20-hab__nome", { texto: f.nome + (feita ? ": " + feita : "") }),
          el("span.t20-hab__origem", { texto: f.origem + (d.pagina ? " · p. " + d.pagina : "") }),
          a && pode(ctx) ? botao("Usar" + (a.custo ? " · " + a.custo + " PM" : ""), function () { usarHabilidade(ctx, f, a, c); }, { rotulo: "Usar " + f.nome }) : null,
        ]),
        texto ? el("p.t20-hab__texto", { texto: texto }) : null,
      ]);
    }
    var racaOrigem = visiveis.filter(function (f) { return f.tipoFonte === "raca" || f.tipoFonte === "origem"; });
    var classe = visiveis.filter(function (f) { return f.tipoFonte === "classe"; });
    var poderes = visiveis.filter(function (f) { return f.tipoFonte === "geral" || f.tipoFonte === "deus"; });
    var outros = visiveis.filter(function (f) { return f.tipoFonte === "item" || f.tipoFonte === "parceiro"; });
    return el("div.t20-aba", {}, [
      el("div.t20-colunas", {}, [
        T().secao("Raça e origem", racaOrigem.length ? [el("ul.t20-habs", {}, racaOrigem.map(cartao))] : [linha("Nada ainda.")]),
        T().secao("Classe", classe.length ? [el("ul.t20-habs", {}, classe.map(cartao))] : [linha("Nada ainda.")]),
      ]),
      T().secao("Poderes", [
        poderes.length ? el("ul.t20-habs", {}, poderes.map(cartao)) : linha("Nenhum poder geral ou concedido."),
        c.poderesTormenta ? el("p.t20-legenda", { texto: "Poderes da Tormenta: " + c.poderesTormenta + " · perda de Carisma: " + c.perdaCarisma + " (p. 136)." }) : null,
        b.poderes.length && pode(ctx) ? el("ul.t20-linhas", {}, b.poderes.map(function (p, i) { return el("li", {}, [el("span.t20-linhas__principal", { texto: "Avulso: " + R().nomeDoPoder(p.id) + (p.origem ? " · " + p.origem : "") }), botao("Remover", function () { op(ctx, function (t) { t.poderes.splice(i, 1); return ok(); }); }, { classe: "r-botao--fantasma", rotulo: "Remover " + R().nomeDoPoder(p.id) })]); })) : null,
      ], { acoes: pode(ctx) ? [botao("+ Poder avulso", function () { dialogoPoderAvulso(ctx); }, { classe: "r-botao--fantasma", dica: "Poderes ganhos fora da subida de nível (origem, recompensa, mestre). Os requisitos são conferidos." })] : null }),
      outros.length ? T().secao("De itens e parceiros", [el("ul.t20-habs", {}, outros.map(cartao))]) : null,
    ]);
  }
  function dialogoPoderAvulso(ctx) {
    var c = calc(ctx);
    var b = bl(ctx);
    var lista = PO().PODERES.map(function (p) { return { def: p, classe: null }; });
    Object.keys(c.niveisClasse).forEach(function (k) { (CL().CLASSE[k].poderes || []).forEach(function (p) { lista.push({ def: p, classe: k }); }); });
    var sel = T().selecao("Poder", lista.map(function (x, i) { var r = R().cumpreRequisitos(b, x.def, x.classe, c); return { valor: String(i), rotulo: x.def.nome + " (" + (x.def.grupo ? PO().GRUPOS[x.def.grupo] : nomeClasse(x.classe)) + ")" + (r.ok ? "" : " — falta: " + r.falta.join(", ")) }; }), "0");
    var origem = UI().campo({ rotulo: "Origem (de onde veio)", valor: "" });
    janela("Adicionar poder", [sel, origem], [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Adicionar", classe: "r-botao--principal", aoClicar: function (fechar) {
        var x = lista[Number(sel.entrada.value)];
        var r = R().cumpreRequisitos(b, x.def, x.classe, c);
        function adicionar() { op(ctx, function (t) { t.poderes.push({ id: x.def.id, origem: origem.entrada.value, escolhas: {} }); return ok(); }); fechar(); }
        if (!r.ok) return UI().confirmar({ titulo: "Requisitos não cumpridos", texto: "Falta: " + r.falta.join(", ") + ". Adicionar mesmo assim (decisão do mestre)?", rotuloConfirmar: "Adicionar" }).then(function (s) { if (s) adicionar(); });
        adicionar();
      } },
    ]);
  }

  /* ===================================================== MAGIAS
     Como o quadro de magias da ficha oficial: atributo-chave, CD e o
     limite por fonte em cima; as magias por círculo, cada uma com o que
     se consulta na mesa. O nome lança (com a prévia dos aprimoramentos). */
  /* Alcance, duração e execução com acento e maiúscula. */
  function rotulo(v) {
    var t = String(v || "").replace(/medio/g, "médio").replace(/instantanea/g, "instantânea").replace(/ate/g, "até");
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function nomeEscola(k) { var e = D().ESCOLAS.filter(function (x) { return x[0] === k; })[0]; return e ? e[1] : humanizar(k); }
  function abaMagias(ctx) {
    var b = bl(ctx);
    var c = calc(ctx);
    if (!c) return el("p");
    var conhecidas = R().magiasConhecidas(b, c);
    var porCirculo = {};
    conhecidas.forEach(function (m) { var mg = MG().MAGIA[m.id]; (porCirculo[mg.circulo] = porCirculo[mg.circulo] || []).push({ e: m, mg: mg }); });
    var caminho = R().valorDeEscolhaDaClasse(b, "arcanista", "caminho");
    var fontes = Object.keys(c.magias.fontes).map(function (k) {
      var f = c.magias.fontes[k];
      return el("div.t20-fonte-magia", {}, [
        el("strong", { texto: f.nome }),
        el("dl.t20-pares.t20-pares--linha", {}, [["Tipo", humanizar(f.tipo)], ["Atributo-chave", T().nomeAtr(f.atributo)], ["CD", String(f.cd)], ["Limite", f.limitePM + " PM"], ["Círculo", "até " + f.circuloMax + "º"]].map(function (d) { return el("div", {}, [el("dt", { texto: d[0] }), el("dd", { texto: d[1] })]); })),
      ]);
    });
    var memorizadas = b.magias.filter(function (m) { return m.memorizada; }).length;
    var limiteMemo = Math.floor(b.magias.filter(function (m) { return m.fonte === "classe:arcanista"; }).length / 2);
    return el("div.t20-aba", {}, [
      T().secao("Conjuração", [
        fontes.length ? el("div.t20-fontes-magia", {}, fontes) : linha("Nenhuma classe conjuradora."),
        c.magias.concedidas.length ? el("p.t20-legenda", { texto: "Concedidas por raça, poderes ou itens: " + c.magias.concedidas.map(function (x) { return (MG().MAGIA[x.id] || {}).nome + " (" + x.fonte + ")"; }).join(", ") + "." }) : null,
        caminho === "mago" ? el("p.t20-legenda", { texto: "Mago: só lança as memorizadas (" + memorizadas + " de " + limiteMemo + "), estudando o grimório uma hora por dia (p. 37)." }) : null,
        el("p.t20-legenda", { texto: "Custo por círculo: 1, 3, 6, 10, 15 PM. Arcanas de armadura pedem Misticismo CD 20 + PM (p. 172)." }),
      ], { acoes: pode(ctx) && fontes.length ? [botao("+ Aprender magia", function () { dialogoAprender(ctx); }, { classe: "r-botao--fantasma" })] : null }),
    ].concat(Object.keys(porCirculo).sort().map(function (circ) {
      return T().secao(circ + "º círculo", [el("ul.t20-magias", {}, porCirculo[circ].map(function (x) {
        var mg = x.mg, base = mg.base;
        var meta = [nomeEscola(mg.escola), rotulo(MG().nomeExecucao(base.ex)), rotulo(base.al), base.alvo || base.area || base.ef || "", rotulo(base.du), base.res || ""].filter(Boolean);
        return el("li.t20-magia", {}, [
          el("div.t20-magia__topo", {}, [
            el("button.t20-magia__nome", { type: "button", "aria-label": "Lançar " + mg.nome, onclick: function () { dialogoLancar(ctx, x.e); } }, [el("span", { texto: mg.nome }), el("span.t20-magia__custo", { texto: MG().custoBase(mg.circulo) + " PM" })]),
            el("span.t20-magia__tipo", { texto: humanizar(mg.tipo) + " · p. " + mg.pagina }),
          ]),
          el("p.t20-magia__meta", { texto: meta.join(" · ") }),
          el("details.t20-magia__desc", {}, [el("summary", { texto: "Descrição" }), el("p", { texto: mg.resumo })]),
          pode(ctx) && (caminho === "mago" && x.e.fonte === "classe:arcanista" || !x.e.concedida) ? el("div.t20-magia__acoes", {}, [
            caminho === "mago" && x.e.fonte === "classe:arcanista" ? el("label.r-marca", {}, [el("input", { type: "checkbox", checked: !!x.e.memorizada, onchange: function (ev) { var v = ev.currentTarget.checked; op(ctx, function (t) { var m = t.magias.filter(function (y) { return y.id === x.e.id && y.fonte === x.e.fonte; })[0]; if (m) m.memorizada = v; return ok(); }); } }), el("span", { texto: "Memorizada" })]) : null,
            !x.e.concedida ? botao("Esquecer", function () { UI().confirmar({ titulo: "Esquecer " + mg.nome + "?", texto: "A magia sai da lista de conhecidas.", rotuloConfirmar: "Esquecer" }).then(function (s) { if (s) op(ctx, function (t) { t.magias = t.magias.filter(function (y) { return !(y.id === x.e.id && y.fonte === x.e.fonte); }); return ok(); }); }); }, { classe: "r-botao--fantasma", rotulo: "Esquecer " + mg.nome }) : null,
          ]) : null,
        ]);
      }))]);
    })));
  }
  function dialogoAprender(ctx) {
    var c = calc(ctx);
    var b = bl(ctx);
    var fontes = Object.keys(c.magias.fontes);
    if (!fontes.length) { UI().avisoAtencao("Sem classe conjuradora: magias de outras fontes entram pelo poder ou habilidade que as concede."); return; }
    var fonte = T().selecao("Fonte", fontes.map(function (k) { return { valor: k, rotulo: c.magias.fontes[k].nome }; }), fontes[0]);
    var mag = el("div");
    var sel = null;
    function lista() {
      var f = c.magias.fontes[fonte.entrada.value];
      var disp = MG().MAGIAS.filter(function (m) { return MG().disponivel(m, f) && !b.magias.some(function (y) { return y.id === m.id && y.fonte === fonte.entrada.value; }); }).sort(function (a, z) { return a.circulo - z.circulo || a.nome.localeCompare(z.nome); });
      sel = T().selecao("Magia", disp.map(function (m) { return { valor: m.id, rotulo: m.circulo + "º · " + m.nome + " (" + m.escola + ")" }; }), disp[0] ? disp[0].id : "");
      U.trocar(mag, [sel]);
    }
    fonte.entrada.addEventListener("change", lista); lista();
    janela("Aprender magia", [fonte, mag, linha("Disponíveis: do tipo da fonte (universais servem às duas), até o círculo que ela alcança e nas escolas permitidas.")], [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Aprender", classe: "r-botao--principal", aoClicar: function (fechar) { if (!sel.entrada.value) return; var f = fonte.entrada.value, id = sel.entrada.value; op(ctx, function (t) { t.magias.push({ id: id, fonte: f, atributo: "", memorizada: true }); return ok(); }); fechar(); } },
    ]);
  }
  function dialogoListaMagias(ctx) {
    var c = calc(ctx);
    var lista = R().magiasConhecidas(bl(ctx), c);
    var sel = T().selecao("Magia", lista.map(function (m, i) { var mg = MG().MAGIA[m.id]; return { valor: String(i), rotulo: mg.nome + " (" + mg.circulo + "º, " + MG().custoBase(mg.circulo) + " PM)" }; }), "0");
    janela("Lançar magia", [sel], [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Escolher", classe: "r-botao--principal", aoClicar: function (fechar) { fechar(); dialogoLancar(ctx, lista[Number(sel.entrada.value)]); } }]);
  }
  /* Lançar: os aprimoramentos atualizam custo, execução, alcance,
     alvo/área, duração, resistência e efeito antes de confirmar. */
  function dialogoLancar(ctx, entrada) {
    var b = bl(ctx);
    var mg = MG().MAGIA[entrada.id];
    var escolhas = { aprim: {}, opcoes: {} };
    var sit = { condicao: "", dano: 0 };
    var previa = el("div.t20-previa", { role: "status", "aria-live": "polite" });
    var alvosMesa = M().alvos(ctx);
    var alvosMarcados = {};
    function prep() { return R().prepararMagia(b, entrada.id, escolhas, { fonte: entrada.fonte, condicao: sit.condicao, dano: sit.dano }); }
    function desenharPrevia() {
      var r = prep();
      var linhas = [["Custo", r.custo + " PM" + (r.custoAntes !== r.custo ? " (antes de descontos: " + r.custoAntes + ")" : "")], ["Execução", MG().nomeExecucao(r.ex)], ["Alcance", r.al], [r.alvo !== undefined ? "Alvo" : r.area !== undefined ? "Área" : "Efeito", r.alvosTexto], ["Duração", r.du + (r.sustentada ? " (1 PM no início de cada turno)" : "")], ["Resistência", r.res || "—"], ["CD", r.cd]];
      if (r.dano) linhas.push(["Dano", r.dano + (r.tipoDano ? " " + r.tipoDano : "") + (r.metade ? " (resistência: metade)" : "")]);
      if (r.cura) linhas.push(["Cura", r.cura]);
      if (r.pvTemp) linhas.push(["PV temporários", r.pvTemp]);
      if (r.projeteis) linhas.push(["Projéteis", r.projeteis]);
      if (r.condicao) linhas.push(["Condição", nomeCondicao(r.condicao)]);
      if (r.mat) linhas.push(["Componente", r.mat]);
      U.trocar(previa, [
        el("dl.t20-pares", {}, linhas.map(function (l) { return el("div", {}, [el("dt", { texto: l[0] }), el("dd", { texto: String(l[1]) })]); })),
        r.textos.length ? el("ul.t20-lista", {}, r.textos.map(function (t) { return el("li", { texto: t }); })) : null,
        r.testes && r.testes.length ? el("p.t-mini", { texto: "Antes de lançar: " + r.testes.map(function (t) { return R().nomePericia(t.pericia) + " CD " + t.cd + " (" + t.motivo + ")"; }).join("; ") }) : null,
        r.erros.length ? el("ul.t20-erros", {}, r.erros.map(function (e) { return el("li.t-erro", { texto: e }); })) : null,
      ]);
    }
    var aprims = mg.aprimoramentos.map(function (a) {
      var rot = (a.tipo === "T" ? "Truque" : "+" + a.custo + " PM") + (a.requer ? " · requer " + a.requer + "º círculo" : "") + " — " + a.texto;
      var campoOpcao = a.mud.escolha ? T().selecao("Opção", [{ valor: "", rotulo: "—" }].concat(a.mud.escolha.map(function (o) { return { valor: o, rotulo: o }; })), "", function (v) { escolhas.opcoes[a.indice] = v; desenharPrevia(); }) : null;
      if (a.tipo === "a") {
        var n = T().numero(rot, 0);
        n.entrada.addEventListener("input", function () { escolhas.aprim[a.indice] = Math.max(0, T().lerNumero(n, 0)); desenharPrevia(); });
        return el("div.t20-aprim", {}, [n, campoOpcao]);
      }
      return el("div.t20-aprim", {}, [el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { escolhas.aprim[a.indice] = ev.currentTarget.checked ? 1 : 0; desenharPrevia(); } }), el("span", { texto: rot })]), campoOpcao]);
    });
    /* Poderes de magia que viram aprimoramento (Acelerada, Ampliada,
       Discreta, p. 131). */
    var metas = (prep().metamagias || []).map(function (x) {
      var marca = el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) {
        escolhas.metamagias = (escolhas.metamagias || []).filter(function (id) { return id !== x.id; }).concat(ev.currentTarget.checked ? [x.id] : []);
        desenharPrevia();
      } }), el("span", { texto: x.nome + " · +" + x.custo + " PM" })]);
      var amp = x.alcanceOuArea ? T().selecao("Ampliar", [{ valor: "alcance", rotulo: "Alcance +1 passo" }, { valor: "area", rotulo: "Área dobrada" }], "alcance", function (v) { escolhas.ampliada = v; desenharPrevia(); }) : null;
      return el("div.t20-aprim", {}, [marca, amp]);
    });
    var opcaoBase = mg.mec.escolha ? T().selecao("Escolha ao lançar", [{ valor: "", rotulo: "—" }].concat(mg.mec.escolha.map(function (o) { return { valor: o, rotulo: o }; })), "", function (v) { escolhas.opcoes.base = v; desenharPrevia(); }) : null;
    var condicao = T().selecao("Condição para lançar (p. 172)", [{ valor: "", rotulo: "Normal" }, { valor: "ruim", rotulo: "Ruim (Vontade CD 15 + PM)" }, { valor: "terrivel", rotulo: "Terrível (Vontade CD 20 + PM)" }], "", function (v) { sit.condicao = v; desenharPrevia(); });
    var danoSofrido = T().numero("Dano sofrido durante a execução (concentração, CD = dano)");
    danoSofrido.entrada.addEventListener("input", function () { sit.dano = Math.max(0, T().lerNumero(danoSofrido, 0)); desenharPrevia(); });
    var mesa = alvosMesa.length ? el("fieldset.t20-alvos", {}, [el("legend", { texto: "Ameaças da mesa (o servidor rola resistências e aplica)" })].concat(alvosMesa.map(function (p) { return el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { alvosMarcados[p.id] = ev.currentTarget.checked; } }), el("span", { texto: p.nome })]); }))) : null;
    desenharPrevia();
    janela(mg.nome, [linha(mg.resumo + " (" + T().referencia(mg.pagina) + ")"), opcaoBase, el("div.t20-aprims", {}, aprims.concat(metas)), condicao, danoSofrido, mesa, previa], [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Lançar", classe: "r-botao--principal", aoClicar: function (fechar) {
        var r = prep();
        if (!r.ok) { UI().avisoAtencao(r.erros[0]); return; }
        var c = calc(ctx);
        /* Testes para lançar: falhando, a magia se perde e os PM vão. */
        for (var i = 0; i < r.testes.length; i++) {
          var tt = r.testes[i];
          var per = c.pericias[tt.pericia];
          var res = T().teste(R().nomePericia(tt.pericia) + " para lançar " + mg.nome, per ? per.total : 0, per ? per.parcelas : [], { cd: tt.cd });
          if (!res.sucesso) { op(ctx, function (t) { R().gastarPM(t, r.custo); return ok(); }); UI().avisoAtencao("Falhou (" + tt.motivo + "): a magia se perde e os " + r.custo + " PM são gastos."); fechar(); return; }
        }
        var alvos = Object.keys(alvosMarcados).filter(function (k) { return alvosMarcados[k]; });
        if (alvos.length) {
          fechar();
          return M().operar(ctx, { tipo: "magiaAmeaca", magia: entrada.id, fonte: entrada.fonte, escolhas: escolhas, alvos: alvos }).then(function (rr) {
            if (!rr.ok) return;
            var lin = (rr.dados.resultado.alvos || []).map(function (a) { return a.nome + (a.resistencia ? (a.resistencia.passou ? " resistiu" : " falhou") : "") + (a.dano ? ", " + a.dano.dano + " de dano" + (a.dano.derrotado ? " (derrotado)" : "") : ""); });
            UI().aviso(mg.nome + " (" + rr.dados.resultado.custo + " PM): " + lin.join("; "));
          });
        }
        var feito = null;
        op(ctx, function (t) { feito = R().lancarMagia(t, entrada.id, escolhas, { fonte: entrada.fonte, condicao: sit.condicao, dano: sit.dano }); return feito.ok ? feito : { ok: false, motivo: (feito.erros || []).join(" ") }; });
        if (feito && feito.ok) {
          var partes = [mg.nome + ": " + feito.custo + " PM"];
          if (r.dano) partes.push("dano " + T().rolarExpressao(mg.nome + " · dano" + (r.tipoDano ? " (" + r.tipoDano + ")" : ""), r.dano).total);
          if (r.cura) partes.push("cura " + T().rolarExpressao(mg.nome + " · cura", r.cura, "teste").total);
          if (feito.rolarPvTemp) { var pv = T().rolarExpressao(mg.nome + " · PV temporários", feito.rolarPvTemp, "teste").total; op(ctx, function (t) { R().receberPvTemp(t, pv); return ok(); }); partes.push(pv + " PV temporários"); }
          if (r.condicao) partes.push("condição: " + nomeCondicao(r.condicao) + " (CD " + r.cd + ")");
          if (feito.encerradas.length) partes.push("encerrou: " + feito.encerradas.join(", "));
          if (feito.sacrificio) partes.push("sacrificou " + feito.sacrificio + " PM");
          UI().aviso(partes.join(" · "));
        }
        fechar();
      } },
    ], { largo: true });
  }

  /* =================================================== INVENTÁRIO */
  function catalogoDeItens() {
    var l = EQ().TODOS.map(function (x) { return { ref: x.id, nome: x.nome, preco: x.preco, cat: x.categoria || "item" }; });
    IM().ITENS.forEach(function (x) { if (!x.artefato) l.push({ ref: "magico:" + x.id, nome: x.nome + " (mágico)", preco: x.preco, cat: "magico" }); else l.push({ ref: "magico:" + x.id, nome: x.nome + " (artefato)", preco: null, cat: "artefato" }); });
    IM().POCOES.forEach(function (p, i) { l.push({ ref: "pocao:" + i, nome: "Poção: " + p[4], preco: p[3], cat: "pocao" }); });
    return l;
  }
  function itemDoCatalogo(ref) {
    if (/^magico:/.test(ref)) { var m = IM().ITEM[ref.slice(7)]; return { ref: m.base || "", magico: m.id, nome: m.base ? "" : m.nome, personalizado: m.base ? null : m, encantos: [] }; }
    if (/^pocao:/.test(ref)) { var p = IM().POCOES[Number(ref.slice(6))]; return { ref: "", nome: "Poção: " + p[4], personalizado: { nome: "Poção: " + p[4], espacos: 0.5, preco: p[3], pocao: { magia: p[1], aprim: p[2], forma: p[5] || "pocao" } } }; }
    return { ref: ref };
  }
  function precoDe(it) {
    var base = R().itemBase(it) || {};
    var nM = (it.melhorias || []).reduce(function (s, m) { var md = EQ().MELHORIA[m]; return s + (md && (md.id === "pungente" || md.id === "atroz" || md.id === "sobMedida") ? 2 : 1); }, 0);
    var mat = it.material && EQ().MATERIAL[it.material] ? (EQ().MATERIAL[it.material].precos[base.categoria === "arma" ? "arma" : base.categoria === "escudo" ? "escudo" : base.tipoArmadura === "pesada" ? "pesada" : base.categoria === "armadura" ? "leve" : "esoterico"] || 0) : 0;
    var esp = it.magico && IM().ITEM[it.magico];
    if (esp && esp.preco) return esp.preco;
    return IM().precoComEncantos(base.preco || 0, Math.min(4, nM), (it.encantos || []).length) + mat;
  }
  function abaInventario(ctx) {
    var b = bl(ctx);
    var c = calc(ctx);
    if (!c) return el("p");
    var estados = [{ valor: "mochila", rotulo: "Mochila" }, { valor: "vestido", rotulo: "Vestido" }, { valor: "empunhado", rotulo: "Empunhado" }, { valor: "guardado", rotulo: "Guardado" }];
    function mudar(it, campo, v) { op(ctx, function (t) { var x = t.inventario.itens.filter(function (y) { return y.id === it.id; })[0]; if (x) x[campo] = v; return ok(); }); }
    function menuDoItem(it, base) {
      var m = janela(R().nomeDoItem(it), [
        base.resumo ? el("p", { texto: base.resumo }) : null,
        el("p.t-mini", { texto: [base.pagina ? "p. " + base.pagina : "", "preço " + precoDe(it) + " T$", R().espacosDoItem(it) + " espaço(s)"].filter(Boolean).join(" · ") }),
        el("div.t20-menu-item", {}, [
          (base.pocao || base.categoria === "alquimico") ? botao("Usar", function () { m.fechar(); usarConsumivel(ctx, it); }, { classe: "r-botao--principal" }) : null,
          botao("Editar (melhorias, encantos, nome)", function () { m.fechar(); dialogoEditarItem(ctx, it); }),
          botao("Vender", function () { m.fechar(); venderItem(ctx, it); }),
          botao("Remover", function () { m.fechar(); UI().confirmar({ titulo: "Remover " + R().nomeDoItem(it) + "?", texto: "O item sai do inventário sem devolver tibares.", rotuloConfirmar: "Remover" }).then(function (s) { if (s) op(ctx, function (t) { t.inventario.itens = t.inventario.itens.filter(function (y) { return y.id !== it.id; }); return ok(); }); }); }, { classe: "r-botao--fantasma" }),
        ]),
      ], [{ rotulo: "Fechar" }], { fundoFecha: true });
    }
    var cargaPct = pct(c.carga.usada, c.carga.limite);
    return el("div.t20-aba", {}, [
      el("div.t20-inv-resumo", {}, [
        el("div.t20-inv-caixa", {}, [el("span.t20-inv-caixa__nome", { texto: "Tibares" }), el("strong.t20-inv-caixa__valor", { texto: "T$ " + b.inventario.tibar }), pode(ctx) ? botao("Ajustar", function () { dialogoTibar(ctx); }, { classe: "r-botao--fantasma", rotulo: "Ajustar tibares" }) : null]),
        el("div.t20-inv-caixa" + (c.carga.sobrecarregado ? ".t20-inv-caixa--alerta" : ""), {}, [el("span.t20-inv-caixa__nome", { texto: "Carga" }), el("strong.t20-inv-caixa__valor", { texto: c.carga.usada + " / " + c.carga.limite + " espaços" }), el("span.t20-barra", { role: "img", "aria-label": "Carga " + c.carga.usada + " de " + c.carga.limite }, [el("span.t20-barra__cheio", { style: "width:" + cargaPct + "%" })]), el("span.t-mini", { texto: c.carga.sobrecarregado ? "Sobrecarregado: –5 de penalidade e –3 m (máximo " + c.carga.maximo + ")" : "Máximo " + c.carga.maximo + " (10 + 2 × Força, p. 157)" })]),
        el("div.t20-inv-caixa" + (c.vestidos > c.limiteVestidos ? ".t20-inv-caixa--alerta" : ""), {}, [el("span.t20-inv-caixa__nome", { texto: "Itens vestidos" }), el("strong.t20-inv-caixa__valor", { texto: c.vestidos + " / " + c.limiteVestidos }), c.vestidos > c.limiteVestidos ? el("span.t-mini", { texto: "Os excedentes não dão benefícios." }) : null]),
      ]),
      T().secao("Equipamento", [
        b.inventario.itens.length ? el("div.t20-tabela-rolo", {}, [el("table.t20-tabela.t20-inventario", {}, [
          el("thead", {}, [el("tr", {}, ["Item", "Qtd.", "Espaços", "Onde", ""].map(function (h) { return el("th", { scope: "col", texto: h }); }))]),
          el("tbody", {}, b.inventario.itens.map(function (it) {
            var base = R().itemBase(it) || {};
            var extras = [(it.melhorias || []).map(function (m) { return (EQ().MELHORIA[m] || {}).nome || m; }).join(", "), it.material ? (EQ().MATERIAL[it.material] || {}).nome : "", (it.encantos || []).map(function (e) { return (IM().ENCANTO[e] || {}).nome || e; }).join(", ")].filter(Boolean).join(" · ");
            return el("tr" + (it.estado === "guardado" ? ".t20-inv--guardado" : ""), {}, [
              el("th", { scope: "row" }, [el("span.t20-inv__nome", { texto: R().nomeDoItem(it) }), extras ? el("span.t20-inv__extras", { texto: extras }) : null]),
              el("td.t20-num", { texto: String(it.quantidade) }),
              el("td.t20-num", { texto: String(R().espacosDoItem(it)) }),
              el("td", {}, pode(ctx) ? [el("span.t20-inv__onde", {}, [
                el("select.t20-select", { "aria-label": "Onde está " + R().nomeDoItem(it), onchange: function (ev) { mudar(it, "estado", ev.currentTarget.value); } }, estados.map(function (e) { return el("option", { value: e.valor, selected: it.estado === e.valor, texto: e.rotulo }); })),
                it.estado === "empunhado" ? el("select.t20-select", { "aria-label": "Mão de " + R().nomeDoItem(it), onchange: function (ev) { mudar(it, "mao", ev.currentTarget.value); } }, [["principal", "Mão principal"], ["secundaria", "Mão secundária"], ["duas", "Duas mãos"]].map(function (o) { return el("option", { value: o[0], selected: it.mao === o[0], texto: o[1] }); })) : null,
              ])] : [el("span", { texto: (estados.filter(function (e) { return e.valor === it.estado; })[0] || {}).rotulo || it.estado })]),
              el("td", {}, pode(ctx) ? [botao("⋯", function () { menuDoItem(it, base); }, { classe: "r-botao--fantasma", rotulo: "Opções de " + R().nomeDoItem(it) })] : []),
            ]);
          })),
        ])]) : linha("Inventário vazio."),
      ], { acoes: pode(ctx) ? [botao("+ Item", function () { dialogoItem(ctx); }, { classe: "r-botao--fantasma" }), botao("Fabricar", function () { dialogoFabricar(ctx); }, { classe: "r-botao--fantasma" })] : null }),
      engenhocas(ctx, c),
    ]);
  }
  function dialogoItem(ctx) {
    var lista = catalogoDeItens();
    var busca = UI().campo({ rotulo: "Buscar", valor: "", aoDigitar: true, aoMudar: function () { filtrar(); } });
    var area = el("div");
    var sel = null;
    var comprar = { v: true };
    function filtrar() {
      var q = U.chaveDeBusca(busca.entrada.value);
      var vis = lista.filter(function (x) { return !q || U.chaveDeBusca(x.nome).indexOf(q) >= 0; }).slice(0, 300);
      sel = T().selecao("Item", vis.map(function (x) { return { valor: x.ref, rotulo: x.nome + (x.preco !== null && x.preco !== undefined ? " · T$ " + x.preco : "") }; }), vis[0] ? vis[0].ref : "");
      U.trocar(area, [sel]);
    }
    filtrar();
    var qtd = T().numero("Quantidade", 1);
    janela("Adicionar item", [busca, area, qtd, el("label.r-marca", {}, [el("input", { type: "checkbox", checked: true, onchange: function (ev) { comprar.v = ev.currentTarget.checked; } }), el("span", { texto: "Comprar (desconta o preço dos tibares)" })])], [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Adicionar", classe: "r-botao--principal", aoClicar: function (fechar) {
        if (!sel || !sel.entrada.value) return;
        var it = R().normalizarItem(Object.assign({ quantidade: Math.max(1, T().lerNumero(qtd, 1)) }, itemDoCatalogo(sel.entrada.value)));
        var preco = precoDe(it) * it.quantidade;
        op(ctx, function (t) {
          if (comprar.v) { if (t.inventario.tibar < preco) return { ok: false, motivo: "Tibares insuficientes (T$ " + preco + ")." }; t.inventario.tibar = Math.round((t.inventario.tibar - preco) * 10) / 10; }
          t.inventario.itens.push(it); return ok();
        });
        fechar();
      } },
    ], { largo: true });
  }
  function dialogoTibar(ctx) {
    var v = T().numero("Somar (negativo para tirar)", 0);
    var moeda = T().selecao("Moeda", [{ valor: "ts", rotulo: "Tibar (T$)" }, { valor: "to", rotulo: "Tibar de ouro (×10)" }, { valor: "tc", rotulo: "Tibar de cobre (÷10)" }], "ts");
    janela("Tibares", [v, moeda], [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Aplicar", classe: "r-botao--principal", aoClicar: function (fechar) { var n = T().lerNumero(v, 0) * EQ().MOEDAS[moeda.entrada.value]; op(ctx, function (t) { t.inventario.tibar = Math.max(0, Math.round((t.inventario.tibar + n) * 10) / 10); return ok(); }); fechar(); } }]);
  }
  function venderItem(ctx, it) {
    var valor = Math.floor(precoDe(it) * EQ().VENDA * it.quantidade * 10) / 10;
    UI().confirmar({ titulo: "Vender " + R().nomeDoItem(it), texto: "Itens são vendidos pela metade do preço (p. 140): T$ " + valor + ".", rotuloConfirmar: "Vender" }).then(function (s) {
      if (!s) return;
      op(ctx, function (t) { t.inventario.itens = t.inventario.itens.filter(function (y) { return y.id !== it.id; }); t.inventario.tibar = Math.round((t.inventario.tibar + valor) * 10) / 10; return ok(); });
    });
  }
  function usarConsumivel(ctx, it) {
    var base = R().itemBase(it) || {};
    if (base.pocao) {
      var mg = MG().MAGIA[base.pocao.magia];
      var r = MG().preparar(mg, { aprim: base.pocao.aprim || {} }, { circuloMax: 5, deClasse: true });
      var partes = [R().nomeDoItem(it)];
      if (r.cura) partes.push("cura " + T().rolarExpressao(R().nomeDoItem(it), r.cura, "teste").total);
      if (r.dano) partes.push("dano " + T().rolarExpressao(R().nomeDoItem(it), r.dano).total + " (granada: Reflexos/Fortitude conforme a magia; CD com Int, Sab ou Car do usuário)");
      UI().aviso(partes.join(" · ") + ". " + mg.resumo);
    } else UI().aviso(R().nomeDoItem(it) + ": " + (base.resumo || ""));
    op(ctx, function (t) { var x = t.inventario.itens.filter(function (y) { return y.id === it.id; })[0]; if (!x) return ok(); x.quantidade--; if (x.quantidade <= 0) t.inventario.itens = t.inventario.itens.filter(function (y) { return y.id !== it.id; }); return ok(); });
  }
  function dialogoEditarItem(ctx, it) {
    var base = R().itemBase(it) || {};
    var cat = base.categoria === "arma" ? "arma" : (base.categoria === "armadura" || base.categoria === "escudo") ? "armadura" : base.esoterico ? "esoterico" : null;
    var mel = (it.melhorias || []).slice(), enc = (it.encantos || []).slice();
    var nome = UI().campo({ rotulo: "Nome", valor: it.nome || "" });
    var qtd = T().numero("Quantidade", it.quantidade);
    var conteudo = [nome, qtd];
    if (cat) {
      conteudo.push(el("fieldset", {}, [el("legend", { texto: "Melhorias (até 4; p. 164)" })].concat(EQ().MELHORIAS.filter(function (m) { return (m.categorias || []).indexOf(cat) >= 0 || (cat === "armadura" && (m.categorias || []).indexOf("escudo") >= 0 && base.categoria === "escudo"); }).map(function (m) { return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: mel.indexOf(m.id) >= 0, onchange: function (ev) { if (ev.currentTarget.checked) mel.push(m.id); else mel = mel.filter(function (x) { return x !== m.id; }); } }), el("span", { texto: m.nome + " — " + m.resumo })]); }))));
      var mat = T().selecao("Material especial", [{ valor: "", rotulo: "Nenhum" }].concat(EQ().MATERIAIS.map(function (m) { return { valor: m.id, rotulo: m.nome }; })), it.material || "");
      conteudo.push(mat);
      var encs = cat === "arma" ? IM().ENCANTOS_ARMA : IM().ENCANTOS_ARMADURA;
      conteudo.push(el("fieldset", {}, [el("legend", { texto: "Encantos (item mágico; 1 menor, 2 médio, 3 maior; p. 334)" })].concat(encs.map(function (e) { return el("label.r-marca", {}, [el("input", { type: "checkbox", checked: enc.indexOf(e.id) >= 0, onchange: function (ev) { if (ev.currentTarget.checked) enc.push(e.id); else enc = enc.filter(function (x) { return x !== e.id; }); } }), el("span", { texto: e.nome + (e.valor > 1 ? " (conta como 2)" : "") + " — " + e.r })]); }))));
      conteudo.mat = mat;
    }
    if (base.escolhaBonus) conteudo.push(UI().campo({ rotulo: "Perícia do item", valor: it.escolha || "" }));
    var notas = UI().campo({ rotulo: "Notas", tipo: "area", valor: it.notas || "" });
    conteudo.push(notas);
    janela("Editar " + R().nomeDoItem(it), conteudo, [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Salvar", classe: "r-botao--principal", aoClicar: function (fechar) {
        var nMel = mel.reduce(function (s, m) { return s + (m === "pungente" || m === "atroz" || m === "sobMedida" ? 2 : 1); }, 0);
        var nEnc = enc.reduce(function (s, e) { return s + ((IM().ENCANTO[e] || {}).valor || 1); }, 0);
        if (nMel > 4) { UI().avisoAtencao("No máximo quatro melhorias (p. 164)."); return; }
        if (nEnc > 3) { UI().avisoAtencao("No máximo três encantos (item maior, p. 334)."); return; }
        op(ctx, function (t) {
          var x = t.inventario.itens.filter(function (y) { return y.id === it.id; })[0];
          if (!x) return ok();
          x.nome = nome.entrada.value; x.quantidade = Math.max(0, T().lerNumero(qtd, 1)); x.melhorias = mel.slice(0, 4); x.encantos = enc.slice(0, 8); x.notas = notas.entrada.value;
          if (conteudo.mat) x.material = conteudo.mat.entrada.value;
          return ok();
        });
        fechar();
      } },
    ], { largo: true });
  }
  /* Fabricar (Ofício, p. 121): matéria-prima = 1/3 do preço; CD pela
     complexidade, mais melhorias e encantos; tempo pela categoria. */
  function dialogoFabricar(ctx) {
    var c = calc(ctx);
    var b = bl(ctx);
    var oficios = Object.keys(c.pericias).filter(function (k) { return k.indexOf("oficio:") === 0; });
    if (!oficios.length) { UI().avisoAtencao("Fabricar exige um Ofício (aprenda em Progressão)."); return; }
    var lista = catalogoDeItens().filter(function (x) { return x.preco; });
    var sel = T().selecao("Item", lista.map(function (x) { return { valor: x.ref, rotulo: x.nome + " · T$ " + x.preco }; }), lista[0].ref);
    var of = T().selecao("Ofício", oficios.map(function (k) { return { valor: k, rotulo: c.pericias[k].nome + " " + T().sinal(c.pericias[k].total) }; }), oficios[0]);
    var complexo = { v: false };
    var info = el("p.t-mini", { role: "status" });
    function calcular() {
      var it = R().normalizarItem(itemDoCatalogo(sel.entrada.value));
      var preco = precoDe(it), mat = Math.ceil(preco / 3);
      var nM = (it.melhorias || []).length, nE = (it.encantos || []).length;
      var esp = it.magico && IM().ITEM[it.magico];
      var cd = esp ? IM().CATEGORIAS[esp.categoriaMagica] ? IM().CATEGORIAS[esp.categoriaMagica].cdEspecifico : 30 : (complexo.v ? 20 : 15) + (EQ().CD_MELHORIAS[nM] || 0) + (IM().CD_ENCANTOS[nE] || 0);
      var base = R().itemBase(it) || {};
      var tempo = base.categoria === "alquimico" || base.pocao ? "um dia" : (nM || nE || esp) ? "um mês" : "uma semana";
      return { it: it, preco: preco, mat: mat, cd: cd, tempo: tempo };
    }
    function mostrar() { var x = calcular(); info.textContent = "Matéria-prima T$ " + x.mat + " · CD " + x.cd + " · tempo: " + x.tempo + ". Falha por 5 ou mais perde a matéria-prima."; }
    sel.entrada.addEventListener("change", mostrar); mostrar();
    janela("Fabricar", [sel, of, el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { complexo.v = ev.currentTarget.checked; mostrar(); } }), el("span", { texto: "Item complexo (CD 20 em vez de 15)" })]), info, linha("Poções e pergaminhos: T$ 30 × PM², CD 20 + PM (p. 333). Itens mágicos permanentes sacrificam 1, 2 ou 3 PM (menor, médio, maior).")], [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Rolar Ofício", classe: "r-botao--principal", aoClicar: function (fechar) {
        var x = calcular();
        if (b.inventario.tibar < x.mat) { UI().avisoAtencao("Tibares insuficientes para a matéria-prima (T$ " + x.mat + ")."); return; }
        var p = c.pericias[of.entrada.value];
        var t = T().teste(p.nome + " · fabricar " + R().nomeDoItem(x.it), p.total, p.parcelas, { cd: x.cd });
        op(ctx, function (tb) {
          if (t.sucesso) { tb.inventario.tibar = Math.round((tb.inventario.tibar - x.mat) * 10) / 10; x.it.fabricadoPorMim = true; tb.inventario.itens.push(x.it); UI().avisoOk("Fabricado em " + x.tempo + "."); }
          else if (t.margem <= -5) { tb.inventario.tibar = Math.round((tb.inventario.tibar - x.mat) * 10) / 10; UI().avisoAtencao("Falhou por 5 ou mais: a matéria-prima foi perdida."); }
          else UI().avisoAtencao("Falhou: o tempo passou, a matéria-prima continua.");
          return ok();
        });
        fechar();
      } },
    ]);
  }
  /* Engenhocas do inventor (p. 70). */
  function engenhocas(ctx, c) {
    if (!c.tem.engenhoqueiro && !(bl(ctx).engenhocas || []).length) return null;
    var b = bl(ctx);
    var cfg = CL().CLASSE.inventor.engenhocas;
    var circ = R().circuloDeEngenhoca(c);
    return T().painel("Engenhocas", [
      linha(cfg.resumo + " Círculo máximo: " + circ + ". Máximo de engenhocas: " + R().limiteDeEngenhocas(c) + "."),
      el("ul.t20-lista", {}, b.engenhocas.map(function (g) {
        var mg = MG().MAGIA[g.magia];
        return el("li", {}, [el("span", { texto: (g.nome || (mg ? mg.nome : g.magia)) + " · " + g.forma + " · ativações hoje " + g.ativacoesHoje + (g.enguicada ? " · enguiçada" : "") }),
          pode(ctx) ? botao("Ativar", function () { ativarEngenhoca(ctx, g); }, { motivo: g.enguicada ? "Enguiçada: uma hora para consertar." : "" }) : null,
          pode(ctx) && g.enguicada ? botao("Consertar (1 hora)", function () { op(ctx, function (t) { R().consertarEngenhoca(t, g.id); return ok(); }); }, { classe: "r-botao--fantasma" }) : null,
          pode(ctx) ? botao("Remover", function () { op(ctx, function (t) { t.engenhocas = t.engenhocas.filter(function (y) { return y.id !== g.id; }); return ok(); }); }, { classe: "r-botao--fantasma" }) : null]);
      })),
      pode(ctx) && c.tem.engenhoqueiro ? botao("Fabricar engenhoca", function () { fabricarEngenhoca(ctx, c, circ); }) : null,
    ]);
  }
  function fabricarEngenhoca(ctx, c, circ) {
    var lista = MG().MAGIAS.filter(function (m) { return m.circulo <= circ; });
    if (!lista.length) { UI().avisoAtencao("Sem círculo disponível para engenhocas."); return; }
    var sel = T().selecao("Magia simulada", lista.map(function (m) { return { valor: m.id, rotulo: m.nome + " (" + m.circulo + "º, " + MG().custoBase(m.circulo) + " PM)" }; }), lista[0].id);
    var forma = T().selecao("Forma", [{ valor: "empunhada", rotulo: "Empunhada" }, { valor: "vestida", rotulo: "Vestida" }], "empunhada");
    var info = el("p.t-mini", { role: "status" });
    function mostrar() { var k = R().custoDeEngenhoca(sel.entrada.value); info.textContent = k ? "Custo T$ " + k.tibar + " · Ofício (engenhoqueiro) CD " + k.cd + " · " + k.tempo + "." : ""; }
    sel.entrada.addEventListener("change", mostrar); mostrar();
    janela("Fabricar engenhoca", [sel, forma, info], [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Rolar", classe: "r-botao--principal", aoClicar: function (fechar) {
        var opId = T().novaOperacao();
        T().operar(ctx, function (b) {
          var r = R().fabricarEngenhoca(b, sel.entrada.value, forma.entrada.value, T().rolar);
          if (!r.ok) return { ok: false, motivo: r.motivo };
          T().mostrarTeste("Fabricar engenhoca", r.teste, r.parcelas);
          if (r.sucesso) UI().avisoOk("Engenhoca pronta (T$ " + r.custo.tibar + ")."); else UI().avisoAtencao("Falhou: a semana passa e a engenhoca não fica pronta.");
          return ok();
        }, { opId: opId });
        fechar();
      } },
    ]);
  }
  function ativarEngenhoca(ctx, g) {
    var mg = MG().MAGIA[g.magia];
    var escolhas = { aprim: {}, opcoes: {} };
    var previa = el("div.t20-previa", { role: "status", "aria-live": "polite" });
    function desenhar() {
      var r = R().prepararEngenhoca(bl(ctx), g.id, escolhas, { calc: calc(ctx) });
      U.trocar(previa, [
        el("p", { texto: "Ofício (engenhoqueiro) " + T().sinal(r.modificador || 0) + " contra CD " + (r.cdAtivacao || "—") + " · PM dos aprimoramentos: " + (r.custoPM || 0) }),
        r.ex ? el("p.t-mini", { texto: [MG().nomeExecucao(r.ex), r.al, r.alvosTexto, r.du, r.res].filter(Boolean).join(" · ") }) : null,
        r.dano ? el("p.t-mini", { texto: "Dano: " + r.dano }) : null,
        r.erros && r.erros.length ? el("ul.t20-erros", {}, r.erros.map(function (x) { return el("li", { texto: x }); })) : null,
      ]);
    }
    var aprims = (mg.aprimoramentos || []).map(function (a) {
      var rot = (a.tipo === "T" ? "Truque" : "+" + a.custo + " PM") + " — " + a.texto;
      if (a.tipo === "a") {
        var n = T().numero(rot, 0);
        n.entrada.addEventListener("input", function () { escolhas.aprim[a.indice] = Math.max(0, T().lerNumero(n, 0)); desenhar(); });
        return el("div.t20-aprim", {}, [n]);
      }
      return el("div.t20-aprim", {}, [el("label.r-marca", {}, [el("input", { type: "checkbox", onchange: function (ev) { escolhas.aprim[a.indice] = ev.currentTarget.checked ? 1 : 0; desenhar(); } }), el("span", { texto: rot })])]);
    });
    desenhar();
    janela("Ativar " + (g.nome || mg.nome), [linha(mg.resumo + " Efeito mundano (não é mágico); atributo-chave Inteligência (p. 71)."), el("div.t20-aprims", {}, aprims), previa], [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Ativar", classe: "r-botao--principal", aoClicar: function (fechar) {
        var opId = T().novaOperacao();
        T().operar(ctx, function (b) {
          var r = R().ativarEngenhoca(b, g.id, escolhas, T().rolar);
          if (!r.ok) return { ok: false, motivo: (r.erros || []).join(" ") };
          T().mostrarTeste("Ativar engenhoca: " + mg.nome, r.teste, r.preparo.parcelasTeste);
          if (r.sucesso) UI().avisoOk(mg.nome + " ativada" + (r.preparo.dano ? " · dano " + r.preparo.dano : "") + (r.encerradas.length ? " · encerrou " + r.encerradas.join(", ") : "") + ".");
          else UI().avisoAtencao("A engenhoca enguiçou: uma hora para consertar.");
          return ok();
        }, { opId: opId });
        fechar();
      } },
    ]);
  }

  /* ===================================================== PARCEIROS */
  function abaParceiros(ctx) {
    var b = bl(ctx);
    var c = calc(ctx);
    var lim = PA().limite(c.nivel);
    return el("div.t20-aba", {}, [
      T().secao("Parceiros", [
        b.parceiros.length ? el("ul.t20-habs", {}, b.parceiros.map(function (p, i) {
          var tipos = (p.tipos.length ? p.tipos : [p.tipo]).map(function (t) { return PA().TIPOS[t] ? PA().TIPOS[t].nome : t; }).join(" e ");
          var res = (p.tipos.length ? p.tipos : [p.tipo]).map(function (t) { var d = PA().TIPOS[t]; return d ? d.niveis[p.nivel].r : ""; }).join(" ");
          var estado = [p.nivel, p.ferido ? "ferido" : "", p.morto ? "morto" : "", p.ativo ? "" : "fora de ação"].filter(Boolean).join(" · ");
          return el("li.t20-hab" + (p.ativo && !p.morto ? "" : ".t20-hab--inativo"), {}, [
            el("div.t20-hab__topo", {}, [el("strong.t20-hab__nome", { texto: p.nome || tipos }), el("span.t20-hab__origem", { texto: tipos + " · " + estado }),
              pode(ctx) ? el("span.t20-hab__acoes", {}, [botao(p.ativo ? "Dispensar" : "Chamar", function () { op(ctx, function (t) { t.parceiros[i].ativo = !t.parceiros[i].ativo; return ok(); }); }, { classe: "r-botao--fantasma", motivo: p.morto ? "Morto." : "" }), p.ferido ? botao("Curado", function () { op(ctx, function (t) { t.parceiros[i].ferido = false; return ok(); }); }, { classe: "r-botao--fantasma" }) : null, botao("Remover", function () { op(ctx, function (t) { t.parceiros.splice(i, 1); return ok(); }); }, { classe: "r-botao--fantasma", rotulo: "Remover " + (p.nome || tipos) })]) : null]),
            el("p.t20-hab__texto", { texto: res }),
          ]);
        })) : linha("Nenhum parceiro. Parceiros dão um bônus a quem ajudam; não agem nem sofrem ações hostis (p. 260)."),
        el("label.r-marca", {}, [el("input", { type: "checkbox", checked: !!b.opcoes.parceirosVulneraveis, disabled: !pode(ctx), onchange: function (ev) { var v = ev.currentTarget.checked; op(ctx, function (t) { t.opcoes.parceirosVulneraveis = v; return ok(); }); } }), el("span", { texto: "Variante: parceiros vulneráveis (p. 262)" })]),
        UI().recolhivel({ titulo: "Regras de parceiros e montarias", conteudo: [el("p.t-mini", { texto: "Bônus de parceiros não se somam entre si. Vulneráveis: ao sofrer dano, d4/d6/d8 por parceiro; 1 fere, outro 1 mata (p. 262)." }), el("p.t-mini", { texto: PA().REGRAS_MONTARIA.texto + " (p. 261)" })] }),
      ], { info: "limite no seu patamar: " + lim, acoes: pode(ctx) ? [botao("+ Parceiro", function () { dialogoParceiro(ctx); }, { classe: "r-botao--fantasma" })] : null }),
    ]);
  }
  function dialogoParceiro(ctx) {
    var nome = UI().campo({ rotulo: "Nome", valor: "" });
    var tipo = T().selecao("Tipo", Object.keys(PA().TIPOS).map(function (k) { return { valor: k, rotulo: PA().TIPOS[k].nome + (PA().TIPOS[k].montaria ? " (montaria)" : "") }; }), "guardiao");
    var tipo2 = T().selecao("Segundo tipo (opcional, se a fonte der)", [{ valor: "", rotulo: "Nenhum" }].concat(Object.keys(PA().TIPOS).map(function (k) { return { valor: k, rotulo: PA().TIPOS[k].nome }; })), "");
    var nivel = T().selecao("Nível", PA().NIVEIS.map(function (n) { return { valor: n, rotulo: n }; }), "iniciante");
    var pericias = UI().campo({ rotulo: "Perícias do ajudante (chaves, separadas por vírgula)", valor: "" });
    var origem = UI().campo({ rotulo: "Origem (habilidade, magia, contratado…)", valor: "" });
    janela("Adicionar parceiro", [nome, tipo, tipo2, nivel, pericias, origem], [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Adicionar", classe: "r-botao--principal", aoClicar: function (fechar) {
        op(ctx, function (t) { t.parceiros.push({ id: R().novoId(), nome: nome.entrada.value, tipo: tipo.entrada.value, tipos: [tipo.entrada.value].concat(tipo2.entrada.value ? [tipo2.entrada.value] : []), nivel: nivel.entrada.value, origem: origem.entrada.value, pericias: pericias.entrada.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean), ativo: true }); t.parceiros = R().normalizar(t).parceiros; return ok(); });
        fechar();
      } },
    ]);
  }

  /* ==================================================== PROGRESSÃO */
  function abaProgressao(ctx) {
    var b = bl(ctx);
    var c = calc(ctx);
    if (!c) return el("p");
    var proximo = c.proximoNivelXp, anterior = D().xpDoNivel(c.nivel);
    var sobe = R().podeSubir(b);
    return el("div.t20-aba", {}, [
      T().secao("Experiência", [
        el("div.t20-xp", {}, [
          el("strong.t20-xp__nivel", { texto: "Nível " + c.nivel }),
          el("span", { texto: c.patamar.nome }),
          el("span.t-mini", { texto: proximo ? b.xp + " de " + proximo + " XP (faltam " + Math.max(0, proximo - b.xp) + ")" : b.xp + " XP · nível máximo" }),
        ]),
        proximo ? el("span.t20-barra.t20-barra--xp", { role: "img", "aria-label": "Experiência: " + b.xp + " de " + proximo }, [el("span.t20-barra__cheio", { style: "width:" + pct(b.xp - anterior, proximo - anterior) + "%" })]) : null,
      ], { acoes: pode(ctx) ? [
        botao("+ XP", function () { var v = T().numero("XP", 0); janela("Somar XP", [v, linha("Desafio: ND × 1.000 dividido pelo grupo; empate metade, derrota um quarto (p. 326).")], [{ rotulo: "Cancelar", classe: "r-botao--fantasma" }, { rotulo: "Somar", classe: "r-botao--principal", aoClicar: function (f) { op(ctx, function (t) { R().adicionarXp(t, T().lerNumero(v, 0)); return ok(); }); f(); } }]); }, { classe: "r-botao--fantasma" }),
        botao("Subir de nível", function () { dialogoSubir(ctx); }, { classe: sobe.ok ? "r-botao--principal" : "", motivo: sobe.ok ? "" : sobe.motivo }),
      ] : null }),
      T().secao("Níveis", [
        el("ol.t20-niveis", {}, b.niveis.map(function (n, i) {
          var cl = CL().CLASSE[n.classe];
          var nc = b.niveis.slice(0, i + 1).filter(function (x) { return x.classe === n.classe; }).length;
          var hab = cl ? (cl.tabela[nc] || []).map(function (h) { return h === "poder" ? "Poder: " + (n.escolhas.poder && n.escolhas.poder.id ? R().nomeDoPoder(n.escolhas.poder.id, n.classe) : "—") : (cl.habilidades[h] || {}).nome || h; }).join(", ") : "";
          return el("li", {}, [el("span.t20-niveis__n", { texto: String(i + 1) }), el("strong", { texto: nomeClasse(n.classe) + " " + nc }), el("span.t-mini", { texto: hab })]);
        })),
      ], { acoes: pode(ctx) && b.niveis.length > 1 ? [botao("Desfazer o último", function () { UI().confirmar({ titulo: "Desfazer o último nível?", texto: "As escolhas desse nível se perdem; a XP fica.", rotuloConfirmar: "Desfazer" }).then(function (s) { if (s) op(ctx, function (t) { return R().desfazerUltimoNivel(t); }); }); }, { classe: "r-botao--fantasma" })] : null }),
      el("div.t20-colunas", {}, [
        T().secao("Atributos base", [
          el("div.t20-atributos-base", {}, R().ATR.map(function (a) { var n = T().numero(T().siglaAtr(a), b.atributosBase[a], { desabilitado: !(pode(ctx) && ctx.emEdicao()) }); n.entrada.addEventListener("change", function () { var v = T().lerNumero(n, 0); op(ctx, function (t) { t.atributosBase[a] = v; return ok(); }); }); return n; })),
          el("p.t20-legenda", { texto: (b.metodo === "pontos" ? "Compra de pontos" : b.metodo === "rolagem" ? "Rolagem (" + b.rolagens.join(", ") + ")" : "Livre") + ". Sem raça nem aumentos; mudar recalcula PV, PM e perícias, mantendo o dano." + (ctx.emEdicao() ? "" : " Para corrigir, use o modo Edição.") }),
        ]),
        T().secao("Perícias pela Inteligência", [
          el("p.t20-legenda", { texto: "Inteligência " + c.atr["int"] + ": " + Math.max(0, c.atr["int"]) + " perícia(s) treinada(s) a mais (p. 17)." }),
          pode(ctx) ? E().campo({ id: "int", tipo: "pericia", quantidade: Math.max(0, c.atr["int"]) }, b.periciasInt, function (v) { op(ctx, function (t) { t.periciasInt = v; return ok(); }); }, {}) : el("p", { texto: b.periciasInt.map(R().nomePericia).join(", ") || "Nenhuma." }),
        ]),
      ]),
      T().secao("Mais", [
        el("label.r-marca", {}, [el("input", { type: "checkbox", checked: !!b.opcoes.envelhecimento, disabled: !pode(ctx), onchange: function (ev) { var v = ev.currentTarget.checked; op(ctx, function (t) { t.opcoes.envelhecimento = v; return ok(); }); } }), el("span", { texto: "Envelhecimento (p. 106)" })]),
        el("p.t20-legenda", { texto: "Ofícios conhecidos sem treino: " + (b.oficios.join(", ") || "nenhum") + "." }),
        pode(ctx) ? T().selecao("Somar ofício conhecido", [{ valor: "", rotulo: "—" }].concat(D().OFICIOS.map(function (o) { return { valor: o.chave, rotulo: o.nome }; })), "", function (v) { if (v) op(ctx, function (t) { if (t.oficios.indexOf(v) < 0) t.oficios.push(v); return ok(); }); }) : null,
        pode(ctx) && global.RAMATormenta20Criar ? botao("Refazer escolhas da criação", function () { global.RAMATormenta20Criar.abrir({ ctx: ctx }); }, { classe: "r-botao--fantasma" }) : null,
        b.historico.length ? UI().recolhivel({ titulo: "Histórico (" + b.historico.length + ")", conteudo: [el("ol.t20-lista", { reversed: true }, b.historico.slice().reverse().map(function (h) { return el("li", { texto: h.texto + " · " + (h.quando || "").slice(0, 10) }); }))] }) : null,
      ]),
    ]);
  }
  /* Subir de nível: classe (a mesma ou outra), habilidades do novo nível
     na classe com escolhas, e o poder (de classe ou geral) com os
     requisitos conferidos no nível que vai ser alcançado. */
  function dialogoSubir(ctx) {
    var b = bl(ctx);
    var c = calc(ctx);
    var classe = T().selecao("Classe", CL().CLASSES.map(function (x) { return { valor: x.id, rotulo: x.nome + (c.niveisClasse[x.id] ? " (nível " + (c.niveisClasse[x.id] + 1) + ")" : " — multiclasse: sem PV iniciais, perícias nem proficiências") }; }), b.niveis[b.niveis.length - 1] ? b.niveis[b.niveis.length - 1].classe : "guerreiro");
    var area = el("div.pilha");
    var escolhas = {};
    function desenhar() {
      escolhas = {};
      var cl = CL().CLASSE[classe.entrada.value];
      var nc = (c.niveisClasse[cl.id] || 0) + 1;
      var nivelFuturo = c.nivel + 1;
      var itens = [linha(cl.nome + " " + nc + ": PV +" + cl.pv.nivel + " + Constituição, PM +" + cl.pm + ". Personagem nível " + nivelFuturo + ".")];
      (cl.tabela[nc] || []).forEach(function (hid) {
        if (hid === "poder") {
          var lista = (cl.poderes || []).map(function (p) { return { def: p, classe: cl.id }; }).concat(PO().PODERES.filter(function (p) { return p.grupo !== "concedido" || (b.divindade && DE().DEUS[b.divindade.id].poderes.indexOf(p.id) >= 0); }).map(function (p) { return { def: p, classe: null }; }));
          var copia = Object.assign({}, b, { niveis: b.niveis.concat([{ classe: cl.id, escolhas: {} }]) });
          var cFut = R().calcular(R().normalizar(copia));
          var ops = lista.map(function (x, i) { var r = R().cumpreRequisitos(copia, x.def, x.classe, cFut); return { valor: String(i), rotulo: x.def.nome + " (" + (x.classe ? cl.nome : PO().GRUPOS[x.def.grupo]) + ")" + (r.ok ? "" : " — falta: " + r.falta.join(", ")), ok: r.ok }; });
          var selP = T().selecao("Poder de classe ou geral", [{ valor: "", rotulo: "—" }].concat(ops.filter(function (o) { return o.ok; })).concat([{ valor: "x", rotulo: "— sem requisitos (mestre decide) —" }]).concat(ops.filter(function (o) { return !o.ok; })), "", function (v) {
            if (v === "" || v === "x") { delete escolhas.poder; return; }
            var x = lista[Number(v)];
            escolhas.poder = { id: x.def.id, escolhas: {} };
            U.trocar(sub, (x.def.escolhas || []).map(function (e) { return E().campo(e, undefined, function (val) { escolhas.poder.escolhas[e.id] = val; }, { calc: cFut, t20: copia, classe: cl.id }); }).concat(x.def.aumento ? [T().selecao("Atributo (+1)", R().ATR.map(function (a) { return { valor: a, rotulo: T().nomeAtr(a) }; }), "for", function (a) { escolhas.aumento = a; })] : []));
            if (x.def.aumento) escolhas.aumento = "for";
          });
          var sub = el("div.pilha");
          itens.push(selP, sub);
        } else {
          var h = cl.habilidades[hid];
          if (!h) return;
          itens.push(el("div.t20-habilidade", {}, [el("strong", { texto: h.nome }), el("span", { texto: " — " + h.resumo })].concat((h.escolhas || []).filter(function (e) { return !(e.fixa && R().valorDeEscolhaDaClasse(b, cl.id, e.id) !== undefined); }).map(function (e) { return E().campo(e, undefined, function (val) { escolhas[e.id] = val; }, { calc: c, t20: b, classe: cl.id }); }))));
        }
      });
      if (cl.magias && (cl.magias.porNivel || cl.magias.aprendeImpar)) itens.push(linha("Magias: aprenda as novas na aba Magias (" + (cl.magias.porNivel ? cl.magias.porNivel + " por nível" : "") + ")."));
      if (!c.niveisClasse[cl.id] && b.divindade === null && ["clerigo", "druida", "paladino"].indexOf(cl.id) >= 0) itens.push(el("p.t-erro", { texto: cl.nome + " exige ser devoto: escolha a divindade em “Refazer escolhas da criação” antes." }));
      U.trocar(area, itens);
    }
    classe.entrada.addEventListener("change", desenhar); desenhar();
    janela("Subir de nível", [classe, area], [
      { rotulo: "Cancelar", classe: "r-botao--fantasma" },
      { rotulo: "Subir", classe: "r-botao--principal", aoClicar: function (fechar) {
        var res = null;
        op(ctx, function (t) { res = R().subirNivel(t, classe.entrada.value, escolhas, { forcar: true }); return res; });
        if (res && res.ok) { UI().avisoOk("Nível " + res.nivel + "."); fechar(); }
      } },
    ], { largo: true });
  }

  global.RAMASecaoTormenta20 = { blocoSuperior: blocoSuperior, aba: abaPersonagem };
  global.RAMASecaoTormenta20Pericias = { aba: abaPericias };
  global.RAMASecaoTormenta20Habilidades = { aba: abaHabilidades };
  global.RAMASecaoTormenta20Magias = { aba: abaMagias };
  global.RAMASecaoTormenta20Inventario = { aba: abaInventario };
  global.RAMASecaoTormenta20Parceiros = { aba: abaParceiros };
  global.RAMASecaoTormenta20Progressao = { aba: abaProgressao };
  global.RAMATormenta20Ficha = { dialogoTeste: dialogoTeste, dialogoAtaque: dialogoAtaque, dialogoLancar: dialogoLancar, dialogoDano: dialogoDano };
})(window);
