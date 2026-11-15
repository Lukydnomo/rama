/* =====================================================================
   R.A.M.A. — Pacotes de Homebrew · regras puras (v9.6)
   ---------------------------------------------------------------------
   O que a tela precisa saber ANTES de perguntar ao servidor — e que o
   servidor confere de novo (backend/HomebrewPacotes.gs):

     · que criação cabe num pacote de qual sistema
         genéricos (item, arma, armadura, mochila, habilidade): todos;
         ritual: os sistemas cuja ficha tem a aba Rituais (o registro,
                 js/sistemas.js);
         criatura: só o sistema NATIVO dela — nunca convertida;
     · como agrupar o conteúdo por tipo;
     · o formato do código de acesso (16 símbolos, 4 grupos).

   Sem DOM: testes/executar-pacotes.js.
   ===================================================================== */

(function (global) {
  "use strict";

  var LIMITES = { entradas: 40, pacotes: 30, nome: 80, descricao: 1500, importacao: 40, capaLargura: 320, capaAltura: 480 };
  var TIPOS = [
    { chave: "criatura", rotulo: "Criaturas", um: "Criatura" },
    { chave: "arma", rotulo: "Armas", um: "Arma" },
    { chave: "armadura", rotulo: "Armaduras", um: "Armadura" },
    { chave: "item", rotulo: "Itens", um: "Item" },
    { chave: "mochila", rotulo: "Mochilas", um: "Mochila" },
    { chave: "habilidade", rotulo: "Habilidades", um: "Habilidade" },
    { chave: "ritual", rotulo: "Rituais", um: "Ritual" },
    { chave: "classe", rotulo: "Classes", um: "Classe" },
    { chave: "elemento", rotulo: "Elementos", um: "Elemento" },
    { chave: "origem", rotulo: "Origens", um: "Origem" },
    { chave: "trilha", rotulo: "Trilhas", um: "Trilha" },
    { chave: "raca", rotulo: "Raças", um: "Raça" },
    { chave: "divindade", rotulo: "Divindades", um: "Divindade" },
    { chave: "ocupacao", rotulo: "Ocupações", um: "Ocupação" },
    { chave: "descritor", rotulo: "Descritores", um: "Descritor" },
    { chave: "arquetipo", rotulo: "Arquétipos", um: "Arquétipo" },
    { chave: "estilo", rotulo: "Estilos", um: "Estilo" },
    { chave: "papel", rotulo: "Papéis", um: "Papel" },
    { chave: "motivacao", rotulo: "Motivações", um: "Motivação" },
    { chave: "mazela", rotulo: "Mazelas", um: "Mazela" },
    { chave: "fardo", rotulo: "Fardos", um: "Fardo" },
    { chave: "cla", rotulo: "Clãs", um: "Clã" },
    { chave: "predador", rotulo: "Predadores", um: "Predador" },
    { chave: "disciplina", rotulo: "Disciplinas", um: "Disciplina" },
    { chave: "vantagem", rotulo: "Vantagens e Defeitos", um: "Vantagem" },
    { chave: "conhecimento", rotulo: "Fichas de Conhecimento", um: "Ficha de Conhecimento" },
    { chave: "assassino", rotulo: "Assassinos", um: "Assassino" },
    { chave: "pokepraga", rotulo: "PokéPragas", um: "PokéPraga" },
    { chave: "receita", rotulo: "Receitas", um: "Receita" },
    { chave: "ameaca", rotulo: "Ameaças", um: "Ameaça" },
    { chave: "apavoro", rotulo: "Apavoros", um: "Apavoro" },
    { chave: "perfil", rotulo: "Perfis", um: "Perfil" },
  ];
  var GENERICOS = ["item", "arma", "armadura", "mochila", "habilidade"];
  var NATIVOS = ["oblivio", "vampiro", "goblins", "tormenta20", "ordem2"];
  var ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

  function S() { return global.RAMASistemas; }
  function nomeDoSistema(id) {
    var s = S() && S().lista().filter(function (x) { return x.id === id; })[0];
    return s ? s.nome : (id ? String(id) : "Universal");
  }
  function tipo(chave) { return TIPOS.filter(function (t) { return t.chave === chave; })[0] || { chave: chave, rotulo: chave, um: chave }; }

  /* Os sistemas com a aba Rituais, pelo registro (a mesma lista que o
     servidor declara em SISTEMAS_COM_RITUAIS). */
  function sistemasComRituais() {
    if (!S()) return ["ordem", "universal"];
    return S().lista().filter(function (s) {
      return s.ficha && (s.ficha.abas || []).some(function (a) { return a.chave === "rituais"; });
    }).map(function (s) { return s.id; });
  }

  /* O sistema nativo de uma criatura da biblioteca. Um registro da
     listagem com `resumo` já traz `resumo.sistema`. */
  function sistemaNativo(r) {
    if (!r) return "universal";
    if (r.resumo && r.resumo.sistema) return r.resumo.sistema;
    if (r.sistema === "ordem" && r.ordem && typeof r.ordem === "object") return "ordem";
    if (NATIVOS.indexOf(r.sistema) >= 0) return r.sistema;
    return "universal";
  }

  /* { ok, motivo } — o mesmo texto do servidor. */
  function compatibilidade(registro, sistema) {
    /* v9.7: um registro com modelo de sistema (Homebrew nativo) segue o
       adaptador — nativo só no sistema dele, Universal em qualquer um. O
       formato de antes segue a regra abaixo, igual à da v9.6. */
    var A = global.RAMAHomebrewAdaptadores;
    var porAdaptador = A ? A.compativelComPacote(registro, sistema) : null;
    if (porAdaptador) return porAdaptador;
    var t = registro && registro.tipo;
    if (GENERICOS.indexOf(t) >= 0) return { ok: true, motivo: "" };
    if (t === "ritual") {
      return sistemasComRituais().indexOf(sistema) >= 0 ? { ok: true, motivo: "" } : {
        ok: false, motivo: "Rituais entram em pacotes de Ordem Paranormal ou Universal: a ficha de " + nomeDoSistema(sistema) + " não tem a aba Rituais.",
      };
    }
    if (t === "criatura") {
      var n = sistemaNativo(registro);
      return n === sistema ? { ok: true, motivo: "" } : {
        ok: false, motivo: "Criatura de " + nomeDoSistema(n) + ": o pacote é de " + nomeDoSistema(sistema) + ", e o R.A.M.A. não converte fichas entre sistemas.",
      };
    }
    return { ok: false, motivo: "Tipo de criação desconhecido." };
  }

  /* [{ tipo, rotulo, itens }] na ordem de TIPOS; tipo desconhecido no fim. */
  function agrupar(entradas) {
    var grupos = {};
    (entradas || []).forEach(function (e) { (grupos[e.tipo] = grupos[e.tipo] || []).push(e); });
    var saida = TIPOS.filter(function (t) { return grupos[t.chave]; }).map(function (t) { return { tipo: t.chave, rotulo: t.rotulo, itens: grupos[t.chave] }; });
    Object.keys(grupos).forEach(function (k) { if (!TIPOS.some(function (t) { return t.chave === k; })) saida.push({ tipo: k, rotulo: k, itens: grupos[k] }); });
    return saida;
  }
  function resumoDosTipos(tipos) {
    return TIPOS.filter(function (t) { return tipos && tipos[t.chave]; }).map(function (t) {
      var n = tipos[t.chave];
      return n + " " + (n === 1 ? t.um.toLowerCase() : t.rotulo.toLowerCase());
    }).join(" · ");
  }

  function normalizarCodigo(texto) { return String(texto || "").toUpperCase().replace(/[^0-9A-Z]/g, ""); }
  function codigoValido(texto) {
    var n = normalizarCodigo(texto);
    if (n.length !== 16) return false;
    for (var i = 0; i < n.length; i++) if (ALFABETO.indexOf(n.charAt(i)) < 0) return false;
    return true;
  }
  function formatarCodigo(texto) {
    var n = normalizarCodigo(texto).slice(0, 16);
    return n.replace(/(.{4})(?=.)/g, "$1-");
  }

  global.RAMAPacotesHomebrew = {
    LIMITES: LIMITES, TIPOS: TIPOS, tipo: tipo, nomeDoSistema: nomeDoSistema,
    sistemasComRituais: sistemasComRituais, sistemaNativo: sistemaNativo, compatibilidade: compatibilidade,
    agrupar: agrupar, resumoDosTipos: resumoDosTipos,
    normalizarCodigo: normalizarCodigo, codigoValido: codigoValido, formatarCodigo: formatarCodigo,
  };
})(typeof window !== "undefined" ? window : globalThis);
