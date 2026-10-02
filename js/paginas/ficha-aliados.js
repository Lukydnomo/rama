/* Aliados são ocorrências da criatura existente, salvas com a ficha.
   A biblioteca é apenas fonte da cópia; nenhuma edição publica Homebrew. */
(function (global) {
  "use strict";
  var U = global.RAMAUtil, UI = global.RAMAUI, C = global.RAMACriaturas, el = U.el;

  function atual(ctx, id) { return U.porId(ctx.ficha.aliados || [], id); }
  function permitido(ctx) { return !ctx.podeEditar || ctx.podeEditar(); }

  function editar(ctx, aliado) {
    if (!ctx.emEdicao() || !permitido(ctx)) return;
    var base = aliado ? U.copiar(aliado) : null;
    global.RAMAHomebrewCriatura.editar(aliado ? aliado.criatura : null, null, {
      titulo: aliado ? "Editar aliado" : "Criar aliado", imagem: aliado && aliado.imagem || "",
      destinoImagem: "aliado",
      salvar: async function (criatura, imagem) {
        if (!ctx.emEdicao() || !permitido(ctx)) return false;
        var existente = aliado && atual(ctx, aliado.id);
        if (aliado && !existente) { UI.avisoAtencao("Este aliado foi removido. Feche a edição e confira a ficha."); return false; }
        if (existente) {
          // Concilia também mudanças recebidas enquanto o editor estava aberto.
          var nova = Object.assign({}, base, { criatura: criatura, imagem: imagem });
          var referencia = base;
          while (true) {
            existente = atual(ctx, aliado.id);
            if (!existente || !ctx.emEdicao() || !permitido(ctx)) return false;
            var recebida = U.copiar(existente);
            var mescla = global.RAMASync.mesclar({ aliados: [referencia] }, { aliados: [nova] },
              { aliados: [recebida] }, global.RAMASync.ESQUEMA_FICHA);
            if (!mescla.conflitos.length) { nova = mescla.estado.aliados[0]; break; }
            var escolhas = await new Promise(function (resolver) {
              global.RAMASync.abrirConflito({ conflitos: mescla.conflitos, automaticos: mescla.automaticos,
                aoResolver: resolver, aoCancelar: function () { resolver(null); } });
            });
            if (!escolhas) return false;
            global.RAMASync.aplicarEscolhas(mescla.conflitos, escolhas);
            referencia = recebida;
            nova = mescla.estado.aliados[0];
          }
          ctx.ficha.aliados[ctx.ficha.aliados.indexOf(existente)] = nova;
        } else ctx.ficha.aliados.push(C.criarAliado(criatura, imagem));
        ctx.alterou(); ctx.redesenhar();
      },
    });
  }

  async function remover(ctx, id) {
    if (!ctx.emEdicao() || !permitido(ctx)) return;
    var a = atual(ctx, id);
    if (!a) return;
    var sim = await UI.confirmar({ titulo: "Remover aliado?", texto: "Remover " + a.criatura.nome + " desta ficha? A criatura da biblioteca e outros aliados serão preservados.",
      rotuloConfirmar: "Remover aliado", perigo: true, exigeDecisao: true });
    if (!sim || !ctx.emEdicao() || !permitido(ctx)) return;
    ctx.ficha.aliados = ctx.ficha.aliados.filter(function (x) { return x.id !== id; });
    ctx.alterou(); ctx.redesenhar();
  }

  function consultar(ctx, id) {
    var a = atual(ctx, id);
    if (!a) return;
    var painel = global.RAMACriaturaPainel.criar(a.criatura, {
      nome: a.criatura.nome, rotulo: "Aliado de " + ctx.ficha.nome, resultadosLocais: true,
      permitirRolagem: !ctx.emEdicao() && permitido(ctx),
      aoStatus: function (statusId, valor) {
        var existente = atual(ctx, id);
        var status = existente && U.porId(existente.criatura.status, statusId);
        if (!status || !permitido(ctx)) return;
        status.atual = U.limitar(valor, 0, status.maximo > 0 ? status.maximo : 999999);
        ctx.alterou();
      },
      /* Fase, usos, marcadores, Enigma e anotação DESTE aliado (v2.28):
         a mesma regra do combate, gravada com a ficha. */
      aoInstancia: function (chave, valor) {
        var existente = atual(ctx, id);
        if (!existente || !permitido(ctx)) return;
        if (C.definirNaInstancia(existente.criatura, chave, valor)) ctx.alterou();
      },
      /* A imagem própria do aliado manda; sem ela, o retrato do catálogo. */
      semImagem: !!a.imagem,
    });
    UI.modal({ titulo: a.criatura.nome, largo: true,
      conteudo: [a.imagem ? el("img.aliado-imagem", { src: a.imagem, alt: a.criatura.nome }) : null, painel.raiz],
      botoes: [{ rotulo: "Fechar" }], aoFechar: function () { ctx.redesenhar(); },
    });
  }

  /* A mesma biblioteca do combate (v2.28): catálogo oficial e Homebrew,
     com consulta antes de escolher. A ficha inteira chega já relida no
     servidor (uma permissão pode ter mudado desde a lista). */
  function biblioteca(ctx, botao) {
    if (!ctx.emEdicao() || !permitido(ctx)) return;
    if (botao) botao.blur();
    global.RAMABibliotecaCriaturas.abrir({
      titulo: "Aliado da biblioteca",
      ajuda: "Será criada uma cópia independente, incluindo a imagem. Ela não será publicada nem adicionada a um combate.",
      acoes: [{
        rotulo: "Usar como aliado", principal: true,
        aoEscolher: async function (criatura, origem) {
          var imagem = "";
          if (origem.tipo === "homebrew") {
            var ri = await global.RAMAApi.lerImagemCriatura(origem.id);
            if (!ri.ok) { UI.avisoDeFalha(ri, "leitura da imagem"); return false; }
            imagem = ri.dados.imagem || "";
          }
          if (!ctx.emEdicao() || !permitido(ctx) || criatura.tipo !== "criatura") return false;
          ctx.ficha.aliados.push(C.criarAliado(Object.assign({}, criatura, { id: origem.tipo === "homebrew" ? origem.id : undefined }), imagem));
          ctx.alterou(); ctx.redesenhar();
          return true;
        },
      }],
    });
  }

  /* O retrato do cartão: a imagem do aliado ou, sem ela, a do catálogo. */
  function retratoDoAliado(a) {
    if (a.imagem) return el("img.aliado-imagem", { src: a.imagem, alt: a.criatura.nome, loading: "lazy" });
    var imagens = C.imagensDoCatalogo(a.criatura);
    if (!imagens) return null;
    var img = el("img.aliado-imagem", { src: imagens.retrato, alt: a.criatura.nome, loading: "lazy" });
    img.addEventListener("error", function () { img.hidden = true; });
    return img;
  }

  /* Aliados em Perigo (Arquivos Secretos 2, p. 24 — regra opcional). */
  function A2() { return global.RAMAOrdemArquivo2; }
  function perigoLigado(ctx) {
    var o = ctx.ficha && ctx.ficha.ordem;
    return !!(o && A2() && global.RAMAOrdemOpcionais && global.RAMAOrdemOpcionais.ligada(o, "aliadosEmPerigo"));
  }

  function linhaDePerigo(ctx, a) {
    if (!perigoLigado(ctx)) return null;
    var cena = A2().cenaDe(ctx.ficha.ordem);
    var e = A2().estadoDoPerigo(a, cena);
    var texto = e.morto ? "Morto (Aliados em Perigo)." : e.pendente ? "Segundo ferimento nesta cena: a morte espera a confirmação da mesa."
      : e.feridas ? "Ferido nesta cena: mais um ferimento nesta cena é fatal." : "Sem ferimentos nesta cena.";
    return el("div.pilha--curta", { class: "pilha" }, [
      el("p.t-mini", { texto: texto }),
      el("div.faixa", {}, [
        !e.morto && !e.pendente ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Uso arriscado (1d6)", disabled: !permitido(ctx),
          onclick: function () { arriscar(ctx, a.id); } }) : null,
        e.pendente ? el("button.r-botao.r-botao--mini.r-botao--perigo", { type: "button", texto: "Confirmar morte", disabled: !permitido(ctx),
          onclick: function () { confirmar(ctx, a.id, true); } }) : null,
        e.pendente ? el("button.r-botao.r-botao--mini", { type: "button", texto: "A mesa decidiu que não", disabled: !permitido(ctx),
          onclick: function () { confirmar(ctx, a.id, false); } }) : null,
      ]),
    ]);
  }

  function arriscar(ctx, id) {
    var a = atual(ctx, id);
    if (!a || !permitido(ctx)) return;
    var r = global.RAMADados.total("1d6", { nome: "Aliados em Perigo · " + a.criatura.nome });
    if (!r.ok) return;
    var res = A2().arriscarAliado(a, A2().cenaDe(ctx.ficha.ordem), r.total, "perigo-" + U.uuid(), "");
    if (!res.ok) { UI.avisoAtencao(res.motivo); return; }
    if (global.RAMARolagens) global.RAMARolagens.mostrar(r, { nome: "Aliados em Perigo · " + a.criatura.nome,
      notas: [res.ferido ? (res.pendente ? "Ímpar: segundo ferimento nesta cena — a morte espera a confirmação da mesa." : "Ímpar: o aliado se feriu.") : "Par: o aliado segue intacto."] });
    ctx.alterou(); ctx.redesenhar();
  }

  function confirmar(ctx, id, morreu) {
    var a = atual(ctx, id);
    if (!a || !permitido(ctx)) return;
    var r = A2().confirmarPerigo(a, morreu);
    if (!r.ok) { UI.avisoAtencao(r.motivo); return; }
    ctx.alterou(); ctx.redesenhar();
  }

  function aba(ctx) {
    var aliados = ctx.ficha.aliados || [];
    return UI.painel("Aliados", aliados.length ? el("div.aliados-grade", {}, aliados.map(function (a) {
      return el("article.r-painel", {}, [
        retratoDoAliado(a),
        el("h3.t-secao", { texto: a.criatura.nome }),
        global.RAMAHomebrewCriatura.detalhes(a.criatura),
        linhaDePerigo(ctx, a),
        el("div.faixa", {}, [
          el("button.r-botao.r-botao--mini", { type: "button", texto: "Abrir ficha", onclick: function () { consultar(ctx, a.id); } }),
          ctx.emEdicao() ? el("button.r-botao.r-botao--mini", { type: "button", texto: "Editar aliado", onclick: function () { editar(ctx, a); } }) : null,
          ctx.emEdicao() ? el("button.r-botao.r-botao--mini.r-botao--perigo", { type: "button", texto: "Remover", onclick: function () { remover(ctx, a.id); } }) : null,
        ]),
      ]);
    })) : UI.vazio({ titulo: "Nenhum aliado", texto: "No modo edição, crie um companheiro ou traga uma criatura da biblioteca. O vínculo não aplica regras automáticas." }), {
      acoes: ctx.emEdicao() ? [
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Criar aliado", onclick: function () { editar(ctx); } }),
        el("button.r-botao.r-botao--mini", { type: "button", texto: "Da biblioteca", onclick: function (ev) { biblioteca(ctx, ev.currentTarget); } }),
      ] : [],
    });
  }
  global.RAMASecaoAliados = { aba: aba };
})(window);
