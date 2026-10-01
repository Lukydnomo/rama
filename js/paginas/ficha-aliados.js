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
    });
    UI.modal({ titulo: a.criatura.nome, largo: true,
      conteudo: [a.imagem ? el("img.aliado-imagem", { src: a.imagem, alt: a.criatura.nome }) : null, painel.raiz],
      botoes: [{ rotulo: "Fechar" }], aoFechar: function () { ctx.redesenhar(); },
    });
  }

  async function biblioteca(ctx, botao) {
    if (!ctx.emEdicao() || !permitido(ctx)) return;
    var r = await UI.ocupar(botao, function () { return global.RAMAApi.listarHomebrew({ escopo: "todos", tipo: "criatura" }); });
    if (!r || r.ignorado) return;
    if (!r.ok) { UI.avisoDeFalha(r, "leitura das criaturas"); return; }
    var modelos = (r.dados || []).filter(function (m) { return m.tipo === "criatura"; });
    var aberta = true;
    var lista = el("div.pilha");
    var busca = UI.campo({ rotulo: "Buscar criatura", valor: "", aoDigitar: true, aoMudar: pintar });
    function pintar() {
      var termo = U.chaveDeBusca(busca.entrada.value);
      var visiveis = modelos.filter(function (m) { return U.chaveDeBusca(m.nome).indexOf(termo) >= 0; });
      U.trocar(lista, visiveis.length ? visiveis.map(function (m) {
        return el("button.r-botao", { type: "button", texto: m.nome, onclick: async function (ev) {
          await UI.ocupar(ev.currentTarget, async function () {
            // Busca novamente no servidor: uma permissão pode ter mudado desde a lista.
            var respostas = await Promise.all([global.RAMAApi.lerHomebrew(m.id), global.RAMAApi.lerImagemCriatura(m.id)]);
            var criatura = respostas[0], imagem = respostas[1];
            if (!criatura.ok) { UI.avisoDeFalha(criatura, "leitura da criatura"); return; }
            if (!imagem.ok) { UI.avisoDeFalha(imagem, "leitura da imagem"); return; }
            if (!aberta || !ctx.emEdicao() || !permitido(ctx) || criatura.dados.tipo !== "criatura") return;
            ctx.ficha.aliados.push(C.criarAliado(criatura.dados, imagem.dados.imagem));
            ctx.alterou(); janela.fechar(); ctx.redesenhar();
          });
        } });
      }) : UI.vazio({ titulo: "Nenhuma criatura disponível", texto: "Aqui aparecem suas criaturas e as públicas que você pode acessar." }));
    }
    var janela = UI.modal({ titulo: "Aliado da biblioteca", conteudo: [
      el("p", { texto: "Será criada uma cópia independente, incluindo a imagem. Ela não será publicada nem adicionada a um combate." }), busca, lista,
    ], botoes: [{ rotulo: "Cancelar" }], aoFechar: function () { aberta = false; } });
    pintar();
  }

  function aba(ctx) {
    var aliados = ctx.ficha.aliados || [];
    return UI.painel("Aliados", aliados.length ? el("div.aliados-grade", {}, aliados.map(function (a) {
      return el("article.r-painel", {}, [
        a.imagem ? el("img.aliado-imagem", { src: a.imagem, alt: a.criatura.nome, loading: "lazy" }) : null,
        el("h3.t-secao", { texto: a.criatura.nome }),
        global.RAMAHomebrewCriatura.detalhes(a.criatura),
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
