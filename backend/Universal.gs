/* =====================================================================
   R.A.M.A. — Universal no servidor (v4.0)
   =====================================================================
   O módulo do modelo flexível do R.A.M.A.: a ficha de atributos, status
   e perícias livres, para jogar qualquer sistema sem regra imposta. Ele
   é um sistema como os outros — não o "resto" de quem não é de Ordem.

   O que muda no servidor por uma ficha ser Universal é pouco, e mora
   aqui: o recorte que a projeção guarda (atributos e status) e o que o
   cartão do painel da mesa e a lista do combate mostram dele. O ajuste
   rápido de status e atributo é do núcleo (Campanhas.gs), porque todo
   modelo de ficha tem essas listas.

   Ganchos: ver Sistemas.gs.
   ===================================================================== */

function sistemaUniversal() {
  return {
    id: 'universal',
    projecao: projecaoUniversal,
    painel: painelUniversal,
    recursosNoCombate: recursosUniversaisNoCombate,
  };
}

/* O painel precisa de status e atributos para os controles rápidos, mas
   não da ficha inteira: perícias, inventário e anotações ficam para
   quando alguém abrir a ficha de verdade. */
function projecaoUniversal(ficha) {
  return {
    atributos: (Array.isArray(ficha.atributos) ? ficha.atributos : [])
      .filter(function (a) { return a && typeof a === 'object'; })
      .map(function (a) { return { id: a.id, nome: a.nome, sigla: a.sigla, valor: a.valor, dado: a.dado }; }),
    status: (Array.isArray(ficha.status) ? ficha.status : [])
      .filter(function (s) { return s && typeof s === 'object'; })
      .map(function (s) { return { id: s.id, nome: s.nome, atual: s.atual, maximo: s.maximo }; }),
  };
}

function painelUniversal(proj, o) {
  var saida = { atributos: proj.atributos || [] };
  if (o.recursosVisiveis) saida.status = proj.status || [];
  return saida;
}

function recursosUniversaisNoCombate(proj) {
  return {
    pendente: false,
    lista: (Array.isArray(proj.status) ? proj.status : []).map(function (s) {
      return { chave: String(s.id), rotulo: String(s.nome || ''), atual: Number(s.atual) || 0, maximo: Number(s.maximo) || 0 };
    }),
  };
}
