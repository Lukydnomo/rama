/* =====================================================================
   R.A.M.A. — os percursos por sistema (Ajuda → Tutoriais por sistema)
   ---------------------------------------------------------------------
   Um percurso por sistema suportado, sobre a ficha pronta daquele
   sistema (js/ajuda/demos.js), rodado por js/tutorial.js na página da
   ficha em modo demonstração (ficha/?demo=<sistema>). Sob demanda: nada
   disto carrega na entrada comum.

   Cada percurso mostra o que MUDA em relação aos controles comuns do
   tutorial inicial: preparação da ficha, recursos principais, como se
   testa, habilidades e a participação na campanha. A etapa de teste é
   prática: avança quando uma rolagem acontece (o cartão no canto ou, em
   Ordem II, o resultado dentro da ficha). Fontes: as mesmas linhas dos
   artigos (js/ajuda/artigos.js).
   ===================================================================== */

(function (global) {
  "use strict";

  var U = global.RAMAUtil;
  var el = U.el;
  function $(s) { return document.querySelector(s); }
  function demo() { return global.RAMAFichaDemo; }
  function aba(chave) { return function () { return $("#aba-" + chave); }; }
  function bloco() { return $('[data-regiao="bloco"]'); }

  /* Linha de fonte no cartão, no mesmo texto da Ajuda. */
  function fonte(id, indice) {
    var A = global.RAMAAjuda;
    var a = A && A.artigo(id);
    var b = a && a.blocos[indice];
    return b ? el("p.ajuda-fonte", {}, [el("span.ajuda-fonte__icone", { "aria-hidden": "true", texto: "§" }), el("span", { texto: A.textoDaFonte(b.fonte) })]) : null;
  }

  /* A etapa prática de teste: vai para a aba indicada (o alvo aponta a
     aba até a pessoa chegar lá) e conclui quando algo for rolado. */
  function etapaDeTeste(o) {
    var rolou = false;
    return {
      id: "teste", titulo: o.titulo || "Fazer um teste",
      texto: o.texto,
      tarefa: o.tarefa,
      feitoTexto: o.feito || "Confira o resultado e de onde veio cada parte.",
      aoEntrar: function () { rolou = false; },
      alvo: function () {
        var d = demo();
        if (!rolou && d && o.aba && d.aba() !== o.aba) return $("#aba-" + o.aba);
        if (rolou) return $("#rolagens .rolagem:last-child") || $(".o2-resultado") || null;
        return (o.alvo && o.alvo()) || $('[data-regiao="conteudo"]');
      },
      esperar: function (api) {
        function feito() { if (rolou) return; rolou = true; api.feito(); setTimeout(function () { api.destacar(); }, 60); }
        api.ouvir("aba", function () { api.destacar(); });
        api.ouvir("rolagem", feito);
        var vigia = new MutationObserver(function (m) {
          for (var i = 0; i < m.length; i++) {
            for (var j = 0; j < m[i].addedNodes.length; j++) {
              var n = m[i].addedNodes[j];
              if (n.nodeType === 1 && (n.matches(".o2-resultado") || n.querySelector(".o2-resultado"))) { feito(); return; }
            }
          }
        });
        vigia.observe(document.body, { childList: true, subtree: true });
        return function () { vigia.disconnect(); };
      },
    };
  }

  function abertura(nome, texto, idArtigo, fontes) {
    return {
      id: "abertura", titulo: nome,
      texto: texto.concat([idArtigo === "tutorial-universal"
        ? "Esta ficha é um exemplo: nada do que você fizer aqui é gravado. As regras vêm do livro do jogo que a sua mesa escolheu."
        : "Esta ficha é um exemplo: nada do que você fizer aqui é gravado. Tenha o livro do sistema por perto — as fontes aparecem abaixo."]),
      conteudo: function () { return el("div.pilha--curta", { class: "pilha" }, (fontes || []).map(function (i) { return fonte(idArtigo, i); })); },
    };
  }

  function campanha(texto) {
    return {
      id: "campanha", titulo: "Na campanha", final: true,
      texto: texto.concat(["Vincular a ficha à campanha e compartilhar com outras pessoas funciona como no tutorial inicial. O guia do sistema na Ajuda tem o resto."]),
      conteudo: function (api) {
        return el("div.tut-atalhos", {}, [
          el("button.r-botao.r-botao--mini.r-botao--principal", { type: "button", texto: "Encerrar percurso", onclick: function () { api.encerrar(); } }),
        ]);
      },
    };
  }

  var PERCURSOS = {
    universal: { nome: "Tutorial: Universal", passos: [
      abertura("Universal: a ficha livre", [
        "A ficha Universal não impõe regra. Você monta atributos, perícias, recursos e seções com os nomes do livro da sua mesa.",
      ], "tutorial-universal", [0]),
      { id: "edicao", titulo: "Configurar no modo Edição",
        texto: ["Configurar a ficha é trabalho do modo Edição. Ao entrar nele, aparecem Configurar módulos (liga e desliga seções), os botões para criar atributos, perícias e status e os campos de nome, valor e dado."],
        tarefa: "entre no modo Edição.",
        alvo: function () { return $(".modo__opcao--edicao"); },
        esperar: function (api) {
          if (demo() && demo().modo() === "edicao") api.feito();
          api.ouvir("modo", function (d) { if (d.modo === "edicao") api.feito(); });
        } },
      { id: "modulos", titulo: "Seções e campos",
        texto: [
          "Configurar módulos escolhe quais abas a ficha tem (Perícias, Rituais, Inventário, Aliados…). Cada atributo tem valor e dado — um atributo 2 pode rolar 3d20, se o seu jogo for assim.",
          "Mude o que quiser: é uma demonstração. Quando terminar, volte ao modo Normal para jogar.",
        ],
        alvo: function () { return Array.prototype.filter.call(document.querySelectorAll(".ficha-topo button"), function (b) { return /Configurar módulos/.test(b.textContent); })[0] || $(".modo"); } },
      etapaDeTeste({ aba: "pericias",
        texto: ["Cada perícia rola o dado do atributo dela, soma o bônus e os dados extras. Uma fórmula própria (como 2d6+3) substitui tudo isso, se o seu sistema pedir."],
        tarefa: "volte ao modo Normal, abra a aba Perícias e role uma perícia.",
        alvo: function () { return $(".pericias .pericia"); } }),
      campanha(["Numa campanha Universal, o mestre tem o Combate com ordem, turnos e rodadas, e vê os status que cada ficha configurou."]),
    ] },

    ordem: { nome: "Tutorial: Ordem Paranormal", passos: [
      abertura("Ordem Paranormal", [
        "Davi Ferraz é um combatente de NEX 5%, origem Atleta. Na ficha de Ordem, quase todo número é calculado pelas regras: classe, atributos, NEX e o que vier das escolhas.",
      ], "tutorial-ordem", [1, 2]),
      { id: "geral", titulo: "Recursos calculados",
        texto: ["PV, PE e Sanidade, Defesa e a carga vêm das regras. Passe o mouse ou toque num número para ver a composição — de onde veio cada parte. No modo Normal você gasta e recupera; os máximos acompanham a ficha."],
        alvo: bloco },
      { id: "progressao", titulo: "Preparação: a Progressão",
        texto: ["Escolhas de classe, trilha, poderes e perícias ficam na aba Progressão, uma vaga para cada etapa de NEX. O que ainda está em aberto aparece como pendência — numa ficha recém-criada é normal ter algumas."],
        tarefa: "abra a aba Progressão.",
        alvo: aba("progressao"),
        esperar: function (api) {
          if (demo() && demo().aba() === "progressao") api.feito();
          api.ouvir("aba", function (d) { if (d.aba === "progressao") api.feito(); });
        } },
      etapaDeTeste({ aba: "pericias",
        texto: ["Na aba Perícias, o dado de cada perícia sai do atributo e do grau de treinamento (destreinado, treinado, veterano, expert). Clique no dado da linha para rolar; no nome, para ver os usos."],
        tarefa: "abra a aba Perícias e role uma perícia (Luta, por exemplo).",
        alvo: function () { return $('[data-regiao="conteudo"] [aria-label^="Rolar "]'); } }),
      { id: "regras", titulo: "Regras opcionais e suplementos",
        texto: ["A aba Regras liga regras opcionais (a maioria do Sobrevivendo ao Horror); Opções da ficha → Suplementos… escolhe os livros. Numa campanha, quem decide os suplementos é o mestre. Companheiro animal e inventário em grade têm guias próprios na Ajuda."],
        alvo: aba("regras") },
      campanha(["Na campanha de Ordem, o mestre conduz o Combate com condições e efeitos contados por turno e pode ligar Hexatombe, Hacking e Perigos complexos."]),
    ] },

    ordem2: { nome: "Tutorial: Ordem Paranormal RPG II (Experimental)", passos: [
      abertura("Ordem Paranormal RPG II", [
        "Um sistema à parte e experimental, montado a partir dos playtests. Esta é uma das fichas prontas do Playtest Beta, que a criação oferece.",
      ], "tutorial-ordem2", [1, 2, 3]),
      { id: "degraus", titulo: "Dados por degrau e PD",
        texto: ["Atributos e perícias são degraus de dado (d4 a d12). Os recursos são PV e PD — os PD pagam as habilidades. Lesões, traumas e pavor aparecem conforme o jogo avança."],
        alvo: bloco },
      etapaDeTeste({ aba: "geral",
        texto: ["O teste junta o dado da perícia com o dado do atributo. O resultado aparece na própria ficha, com cada dado e a fonte dele."],
        tarefa: "na aba Ficha, toque numa perícia e role o teste.",
        alvo: function () { return $(".o2-pericia__rolar"); } }),
      { id: "investigacao", titulo: "Investigação e combate",
        texto: ["As abas Investigação e Combate seguem os procedimentos dos playtests: pontos de interesse e pistas; combate em fases. Onde os playtests divergem, vale a regra unificada do R.A.M.A., registrada na Ajuda."],
        alvo: aba("investigacao") },
      campanha(["Na campanha de Ordem II, a Mesa do Mestre pede testes, conduz a investigação e o combate em fases; as rolagens da mesa são feitas no servidor."]),
    ] },

    oblivio: { nome: "Tutorial: Oblívio", passos: [
      abertura("Oblívio", [
        "Lia Montenegro é uma Quem Sabe. Em vez de PV, o corpo tem cinco regiões, cada uma com o seu limite de Estresse.",
      ], "tutorial-oblivio", [1, 2]),
      { id: "corpo", titulo: "O corpo e o Estresse",
        texto: ["A aba Persona mostra as regiões do corpo. Estresse entra na região atingida; passar do limite traz Mazelas (aba Estado). Coragem e o Farol mudam o que dá para arriscar."],
        alvo: bloco },
      etapaDeTeste({ aba: "testes",
        texto: ["Na aba Testes, cada Conhecimento abre a montagem do teste; especialização soma. Escolha e role."],
        tarefa: "abra a aba Testes e faça um teste de Conhecimento.",
        alvo: function () { return $(".oblivio-conhecimento__rolar"); } }),
      campanha(["Quem conduz é a Testemunha: cenas, Ordem de Ação, Farol, encontros com as Ameaças e os Buracos."]),
    ] },

    vampiro: { nome: "Tutorial: Vampiro: A Máscara (V5)", passos: [
      abertura("Vampiro: A Máscara (V5)", [
        "Rita Valença é uma Brujah neófita. A rolagem é uma parada de d10: Atributo + Habilidade, com dados de Fome no lugar de dados comuns.",
      ], "tutorial-vampiro", [1, 2]),
      { id: "fome", titulo: "Fome, Vitalidade e Força de Vontade",
        texto: ["O topo mostra Vitalidade, Força de Vontade, Humanidade e Fome. Fome alta deixa a Besta mais perto (críticos bestiais, falhas bestiais). As abas Sangue e Humanidade guardam o resto."],
        alvo: bloco },
      etapaDeTeste({ aba: "geral",
        texto: ["Na aba Personagem, clique num Atributo ou numa Habilidade para montar a parada e role. A janela do resultado mostra os dados de Fome, oferece rerrolar com Força de Vontade e julgar a Dificuldade; Concluir fecha a rolagem."],
        tarefa: "monte uma parada, role e clique em Concluir." }),
      { id: "disciplinas", titulo: "Disciplinas",
        texto: ["A aba Disciplinas lista os poderes, com custo (Checagem de Despertar) e efeito. Usar um poder mostra o custo antes."],
        alvo: aba("disciplinas") },
      campanha(["Quem conduz é o Narrador, com a Crônica: noites, cenas, coterie, Domínio e conflitos."]),
    ] },

    goblins: { nome: "Tutorial: Malditos Goblins (3ª ed.)", passos: [
      abertura("Malditos Goblins", [
        "Gnarlo é um mercenário medíocre. Os testes rolam d6 iguais ao atributo; cada 4, 5 ou 6 é um hit.",
      ], "tutorial-goblins", [1, 2]),
      etapaDeTeste({ aba: "geral",
        texto: ["Na aba Goblin, clique no nome de um atributo para testar (Combate abre o ataque). O 6 explode; todos os dados em 1 explodem o goblin (nesta ficha de demonstração, sem consequência)."],
        tarefa: "clique em Habilidade ou Noção, role o teste e feche a janela do resultado.",
        alvo: function () { return $('.gob-atributo__nome[title="Testar Habilidade"]') || $(".gob-atributo__nome"); } }),
      { id: "combate", titulo: "Combate e equipamento",
        texto: ["A aba Combate cuida de ataque, esquiva, bloqueio e munição; Equipamento conta durabilidade. Técnicas e magia ficam na aba própria."],
        alvo: aba("combate") },
      campanha(["Na campanha, o Covil do mestre traz combate com ordem manual, inimigos do livro, sorteios e encontros."]),
    ] },

    brutal: { nome: "Tutorial: BRUTAL (Corte Rápido)", passos: [
      abertura("BRUTAL: Corte Rápido", [
        "Iva Martins é a Cética. Em vez de atributos somados, ela tem pilhas de dados: testar gasta dados, e o que falha é sacrificado ou descartado conforme a cena.",
      ], "tutorial-brutal", [1, 2]),
      { id: "pilhas", titulo: "Pilhas e Pontos de Tensão",
        texto: ["O topo mostra a Pilha Comum, a de Fuga, o Descarte e os Pontos de Tensão. Vantagens custam Pontos de Tensão; os Apegos rendem pontos quando usados no Thriller."],
        alvo: bloco },
      etapaDeTeste({ aba: "geral",
        texto: ["Na aba Sobrevivente, o botão ROLAR abre o teste: escolha o Estilo e quantos dados arriscar. A ficha mostra quais dados passaram e para onde vão os que falharam."],
        tarefa: "clique em ROLAR e faça um teste.",
        alvo: function () { return $(".brt-grande--rolar"); } }),
      campanha(["Quem conduz é a Diretora: cenas Livre, Suspense e Encontro, a Pilha da Diretora e o Assassino."]),
    ] },

    tormenta20: { nome: "Tutorial: Tormenta20 (Jogo do Ano)", passos: [
      abertura("Tormenta20 (Jogo do Ano)", [
        "Tália é uma guerreira humana de 1º nível, soldado. A ficha soma metade do nível, o atributo e o treino em cada perícia, e mostra as parcelas.",
      ], "tutorial-tormenta20", [1, 2]),
      { id: "combate", titulo: "PV, PM, Defesa e ataques",
        texto: ["A aba Combate reúne PV, PM, Defesa (com a armadura vestida) e os ataques da arma empunhada. Passe o mouse ou toque num total para ver as parcelas."],
        alvo: bloco },
      etapaDeTeste({ aba: "pericias",
        texto: ["Na aba Perícias, clique no total para rolar; no nome, para escolher a CD e ver os usos."],
        tarefa: "abra a aba Perícias e clique no total de Atletismo (ou de outra perícia).",
        alvo: function () { return $('[aria-label^="Rolar Atletismo"]') || $(".t20-rol__valor"); } }),
      { id: "progressao", titulo: "Progressão",
        texto: ["Subir de nível segue a tabela da classe: a aba Progressão pede as escolhas de cada nível. Magias ficam na aba Magias, com custo e aprimoramentos."],
        alvo: aba("progressao") },
      campanha(["Na campanha, a Mesa do Mestre traz iniciativa, ameaças por ND, encontros, tesouro e descanso."]),
    ] },
  };

  function percurso(sistema) { return PERCURSOS[sistema] || null; }

  global.RAMAAjudaTutoriaisSistemas = { percurso: percurso, SISTEMAS: Object.keys(PERCURSOS) };
})(window);
