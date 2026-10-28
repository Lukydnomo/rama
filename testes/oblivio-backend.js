/* =====================================================================
   R.A.M.A. — testes do backend: Oblívio (Oblivio.gs, v3.0)
   Dados sintéticos. Chamado por executar-backend.js.
   ===================================================================== */

export async function testarOblivioBackend({ t, preparar, novaConta, comoFn, chamar }) {
  const ler = (c) => Deno.readTextFile(new URL("../" + c, import.meta.url)).then((s) => s.replace(/\r\n/g, "\n"));
  const R = globalThis.RAMAOblivio, C = globalThis.RAMAOblivioCatalogo;

  t.grupo("Oblívio · o motor do servidor é o mesmo do navegador");
  const gs = await ler("backend/Oblivio.gs");
  for (const n of ["catalogo", "ameacas-dados", "buraco-dados", "regras", "combate", "ameacas", "mesa", "buraco", "habilidades"]) {
    const caminho = "js/oblivio/" + n + ".js";
    const ini = gs.indexOf("/* >>> " + caminho + " */\n") + ("/* >>> " + caminho + " */\n").length;
    const fim = gs.indexOf("/* <<< " + caminho + " */");
    const copia = gs.slice(ini, fim).replace(/\n$/, "");
    const original = (await ler(caminho)).replace(/\n$/, "");
    t.ok("cópia de " + caminho + " idêntica (rode testes/gerar-oblivio-gs.js ao mudar)", copia === original);
  }

  /* Uma Persona pronta, do jeito que a ficha cria. */
  function ficha(nome, papel, atr) {
    const o = R.fichaVazia();
    o.papel = papel; Object.assign(o.atributos, atr);
    C.papel[papel].lista.slice(0, 3).forEach((k) => o.especializacoes.push({ id: R.novoId("es"), conhecimento: k, origem: "papel" }));
    const lim = R.limiteTotal(o).total;
    o.corpo.regioes.forEach((r) => { r.limite = r.chave === "torso" ? lim - 4 : 1; });
    R.concluirCriacao(o);
    return { schemaVersion: 24, tipoFicha: "oblivio", nome, campanhaId: null, oblivio: o, atributos: [], status: [], pericias: [], inventario: { itens: [] }, anotacoes: { pastas: [], soltas: [] } };
  }

  t.grupo("Oblívio · a ficha atravessa o servidor como Oblívio");
  preparar();
  const mestre = novaConta("obl_mestre"), joana = novaConta("obl_joana"), paulo = novaConta("obl_paulo"), fora = novaConta("obl_fora");
  const M = comoFn(mestre), J = comoFn(joana), P = comoFn(paulo), F = comoFn(fora);
  const camp = M({ acao: "criar_campanha", dados: { sistema: "oblivio", nome: "Vila Abandonada", visibilidade: "privado" } }).dados.id;
  M({ acao: "salvar_participantes", campanhaId: camp, membros: [{ userId: joana.id, papel: "jogador" }, { userId: paulo.id, papel: "jogador" }] });
  const cuida = ficha("Irmã Clara", "cuida", { carne: 2, forca: 0, fuga: 0, determinacao: 0, mente: 8 });
  const age = ficha("Arthur", "age", { carne: 0, forca: 2, fuga: 6, determinacao: 2, mente: 0 });
  const rc = J({ acao: "criar_personagem", dados: cuida });
  t.ok("criar Persona de Oblívio", rc.ok);
  const idCuida = rc.dados.id;
  const idAge = P({ acao: "criar_personagem", dados: age }).dados.id;
  J({ acao: "vincular_personagem", campanhaId: camp, personagemId: idCuida });
  P({ acao: "vincular_personagem", campanhaId: camp, personagemId: idAge });
  const lida = J({ acao: "ler_personagem", personagemId: idCuida });
  t.ok("lida de volta com tipoFicha e o bloco oblivio inteiros", lida.ok && lida.dados.tipoFicha === "oblivio" && lida.dados.oblivio.papel === "cuida" && lida.dados.oblivio.atributos.mente === 8);
  const lista = J({ acao: "listar_personagens" });
  t.ok("na lista, o sistema é oblivio (não universal)", lista.ok && lista.dados.some((p) => p.id === idCuida && p.sistema === "oblivio"));
  const mesaLista = M({ acao: "listar_personagens_campanha", campanhaId: camp });
  const card = mesaLista.ok && mesaLista.dados.filter((p) => p.id === idCuida)[0];
  t.ok("no painel da campanha: tipoFicha oblivio com Estresse e Coragem (projeção)", card && card.tipoFicha === "oblivio" && card.oblivio && card.oblivio.limite === 10 + 2 && card.oblivio.coragem === 4);
  const dup = J({ acao: "duplicar_personagem", personagemId: idCuida, operacaoId: "op-dup-obl-1" });
  t.ok("duplicar mantém o bloco de Oblívio", dup.ok && J({ acao: "ler_personagem", personagemId: dup.dados.id }).dados.oblivio.papel === "cuida");

  t.grupo("Oblívio · estado da mesa (ler/salvar)");
  const l0 = J({ acao: "ler_oblivio", campanhaId: camp });
  t.ok("jogador lê a vista (sem ser mestre)", l0.ok && l0.dados.mestre === false && l0.dados.vista);
  t.recusa("quem não é da campanha não lê", F({ acao: "ler_oblivio", campanhaId: camp }), "nao_encontrado");
  const estado = globalThis.RAMAOblivioMesa.estadoVazio();
  globalThis.RAMAOblivioMesa.iniciarMissao(estado, "Vila");
  estado.fileiras.personas = [idAge, idCuida, "intruso"];
  t.recusa("jogador não salva a mesa", J({ acao: "salvar_oblivio", campanhaId: camp, rev: 0, opId: "op-obl-s0", estado }), "sem_permissao");
  const s1 = M({ acao: "salvar_oblivio", campanhaId: camp, rev: 0, opId: "op-obl-s1", estado });
  t.ok("Testemunha salva (rev 1)", s1.ok && s1.rev === 1);
  t.ok("  Persona de fora da campanha some da fileira", s1.dados.estado.fileiras.personas.indexOf("intruso") < 0);
  t.ok("  a mesma operação de novo: repetida, sem rev nova", M({ acao: "salvar_oblivio", campanhaId: camp, rev: 0, opId: "op-obl-s1", estado }).repetida);
  t.recusa("revisão velha: conflito, nada sobrescrito", M({ acao: "salvar_oblivio", campanhaId: camp, rev: 0, opId: "op-obl-s2", estado }), "conflito");

  t.grupo("Oblívio · operações entre fichas");
  t.recusa("jogador não aplica Estresse direto", J({ acao: "oblivio_operar", campanhaId: camp, opId: "op-obl-e0", operacao: { tipo: "estresse", persona: idAge, valor: 3 } }), "sem_permissao");
  const e1 = M({ acao: "oblivio_operar", campanhaId: camp, opId: "op-obl-e1", operacao: { tipo: "estresse", persona: idAge, valor: 6, regiao: "torso" } });
  t.ok("Testemunha aplica 6 de Estresse (ataque de Ameaça)", e1.ok && P({ acao: "ler_personagem", personagemId: idAge }).dados.oblivio.corpo.regioes[0].estresse === 6);
  M({ acao: "oblivio_operar", campanhaId: camp, opId: "op-obl-e1", operacao: { tipo: "estresse", persona: idAge, valor: 6, regiao: "torso" } });
  t.igual("  repetida: não aplica de novo", P({ acao: "ler_personagem", personagemId: idAge }).dados.oblivio.corpo.regioes[0].estresse, 6);
  /* Ajudar os Necessitados: Joana (dona de Clara) cura Arthur, de Paulo. */
  const h1 = J({ acao: "oblivio_operar", campanhaId: camp, opId: "op-obl-h1", operacao: { tipo: "habilidade", quem: idCuida, chave: "ajudarOsNecessitados", alvos: [idAge], param: { forcar: true } } });
  t.ok("habilidade de Joana cura a Persona de Paulo (só o efeito)", h1.ok && P({ acao: "ler_personagem", personagemId: idAge }).dados.oblivio.corpo.regioes[0].estresse === 2);
  t.recusa("Paulo não usa a habilidade da Persona de Joana (nem descobre que ela existe)", P({ acao: "oblivio_operar", campanhaId: camp, opId: "op-obl-h2", operacao: { tipo: "habilidade", quem: idCuida, chave: "ajudarOsNecessitados", alvos: [idAge], param: { forcar: true } } }), "nao_encontrado");
  const outra = P({ acao: "criar_personagem", dados: ficha("Sem mesa", "age", { carne: 2, forca: 2, fuga: 2, determinacao: 2, mente: 2 }) }).dados.id;
  t.recusa("alvo fora da campanha: recusado", J({ acao: "oblivio_operar", campanhaId: camp, opId: "op-obl-h3", operacao: { tipo: "habilidade", quem: idCuida, chave: "ajudarOsNecessitados", alvos: [outra], param: { forcar: true } } }), "nao_encontrado");
  t.recusa("habilidade que a Persona não tem: recusada", J({ acao: "oblivio_operar", campanhaId: camp, opId: "op-obl-h4", operacao: { tipo: "habilidade", quem: idCuida, chave: "ultimaEsperanca", alvos: [] } }), "dados_invalidos");

  t.grupo("Oblívio · ataque contra uma Ameaça na mesa");
  const lido = M({ acao: "ler_oblivio", campanhaId: camp });
  const est2 = lido.dados.estado;
  globalThis.RAMAOblivioMesa.adicionarAmeaca(est2, "carcaca", () => 1);
  const idCarcaca = est2.encontro.ameacas[0].id;
  M({ acao: "salvar_oblivio", campanhaId: camp, rev: lido.rev, opId: "op-obl-s3", estado: est2 });
  const a1 = P({ acao: "oblivio_operar", campanhaId: camp, opId: "op-obl-a1", operacao: { tipo: "ataqueAmeaca", quem: idAge, alvo: idCarcaca, sucessos: 1, dano: 6 } });
  t.ok("1 sucesso contra Proteção 2: desgasta, não acerta", a1.ok && a1.dados.acerto && a1.dados.acerto.acertou === false);
  const a2 = J({ acao: "oblivio_operar", campanhaId: camp, opId: "op-obl-a2", operacao: { tipo: "ataqueAmeaca", quem: idCuida, alvo: idCarcaca, sucessos: 1, dano: 5 } });
  t.ok("o sucesso de OUTRA Persona fecha o desgaste e o dano entra", a2.ok && a2.dados.acerto.acertou === true);
  const depois = M({ acao: "ler_oblivio", campanhaId: camp }).dados.estado;
  t.igual("  Estresse na instância da Carcaça", depois.encontro.ameacas[0].estresse, 5);
  t.ok("  vista do jogador: sem ficha da Ameaça", J({ acao: "ler_oblivio", campanhaId: camp }).dados.vista.encontro.ameacas[0].limite === undefined);
  const a3 = P({ acao: "oblivio_operar", campanhaId: camp, opId: "op-obl-a1", operacao: { tipo: "ataqueAmeaca", quem: idAge, alvo: idCarcaca, sucessos: 1, dano: 6 } });
  t.ok("  ataque repetido (mesmo opId): não conta de novo", a3.repetida && M({ acao: "ler_oblivio", campanhaId: camp }).dados.estado.encontro.ameacas[0].estresse === 5);

  t.grupo("Oblívio · momentos da mesa nas fichas");
  t.recusa("jogador não avança o tempo da mesa", J({ acao: "oblivio_operar", campanhaId: camp, opId: "op-obl-m0", operacao: { tipo: "momentos", momentos: [{ tipo: "fimDaRodada" }] } }), "sem_permissao");
  M({ acao: "oblivio_operar", campanhaId: camp, opId: "op-obl-f0", operacao: { tipo: "estresse", persona: idCuida, valor: 6, regiao: "torso" } });
  const fc = J({ acao: "ler_personagem", personagemId: idCuida }).dados;
  t.ok("Estresse de 6 (metade do limite 12) deu Ferida", fc.oblivio.mazelas.some((m) => m.chave === "ferida"));
  M({ acao: "oblivio_operar", campanhaId: camp, opId: "op-obl-m1", operacao: { tipo: "momentos", momentos: [{ tipo: "fimDaRodada", rodada: 1 }] } });
  const fc2 = J({ acao: "ler_personagem", personagemId: idCuida }).dados;
  t.igual("fim da rodada: a Ferida repete o dano (6 + 6, até o limite do Torso, 8)", fc2.oblivio.corpo.regioes[0].estresse, 8);
  M({ acao: "oblivio_operar", campanhaId: camp, opId: "op-obl-m1", operacao: { tipo: "momentos", momentos: [{ tipo: "fimDaRodada", rodada: 1 }] } });
  t.igual("  o mesmo momento repetido não dobra", J({ acao: "ler_personagem", personagemId: idCuida }).dados.oblivio.corpo.regioes[0].estresse, fc2.oblivio.corpo.regioes[0].estresse);

  t.grupo("Oblívio · a ficha numa campanha: aliados e bônus de grupo");
  const lg = J({ acao: "ler_oblivio", campanhaId: camp, personagemId: idCuida });
  t.ok("ler_oblivio traz as Personas de Oblívio da campanha (a cópia duplicada também está nela) — só id e nome", lg.ok && lg.dados.personas.length === 3 &&
    [idCuida, idAge, dup.dados.id].every((id) => lg.dados.personas.some((p) => p.id === id)) &&
    lg.dados.personas.every((p) => Object.keys(p).sort().join() === "id,nome"));
  t.ok("  bônus de grupo vazio sem Escudo Humano à frente", lg.dados.grupo && lg.dados.grupo.bonus.length === 0);
  const idProt = P({ acao: "criar_personagem", dados: ficha("Bruno", "protege", { carne: 6, forca: 2, fuga: 0, determinacao: 2, mente: 0 }) }).dados.id;
  P({ acao: "vincular_personagem", campanhaId: camp, personagemId: idProt });
  const lf = M({ acao: "ler_oblivio", campanhaId: camp });
  const ef = lf.dados.estado;
  ef.fileiras.personas = [idProt, idCuida, idAge];
  M({ acao: "salvar_oblivio", campanhaId: camp, rev: lf.rev, opId: "op-obl-fil1", estado: ef });
  const lg2 = J({ acao: "ler_oblivio", campanhaId: camp, personagemId: idCuida });
  t.ok("atrás de Quem Protege: Escudo Humano +3 (metade de Carne 6), calculado no servidor", lg2.dados.grupo.bonus.length === 1 &&
    lg2.dados.grupo.bonus[0].fonte === "Escudo Humano" && lg2.dados.grupo.bonus[0].valor === 3);
  t.ok("  só fonte e valor: nada da ficha de Bruno", Object.keys(lg2.dados.grupo.bonus[0]).sort().join() === "fonte,valor");
  t.ok("  vista do jogador sem operações nem registro privado", lg2.dados.vista.operacoes === undefined);

  t.grupo("Oblívio · a mesa é do sistema da campanha (v4.0)");
  t.ok("campanha de Oblívio: ler_campanha diz sistema oblivio", M({ acao: "ler_campanha", campanhaId: camp }).dados.sistema === "oblivio");
  t.ok("  e a mesa da Testemunha está lá, sem chave para ligar", J({ acao: "ler_campanha", campanhaId: camp }).dados.oblivio === true);
  t.ok("  sem as ferramentas de Ordem", M({ acao: "ler_campanha", campanhaId: camp }).dados.hexatombe === undefined);

  t.grupo("Oblívio · acerto de Ameaça: quem recebe escolhe a região");
  const lr = M({ acao: "ler_oblivio", campanhaId: camp });
  const e3 = lr.dados.estado;
  e3.encontro.ataquesPendentes.push({ id: "ap-teste-1", ameaca: idCarcaca, nome: "Carcaça", persona: idAge, dano: 3, corpoACorpo: true });
  M({ acao: "salvar_oblivio", campanhaId: camp, rev: lr.rev, opId: "op-obl-s4", estado: e3 });
  t.recusa("Joana não resolve o acerto da Persona de Paulo", J({ acao: "oblivio_operar", campanhaId: camp, opId: "op-obl-r0", operacao: { tipo: "receberAtaque", quem: idAge, pendente: "ap-teste-1", regiao: "pernaD" } }), "nao_encontrado");
  const soma = (id) => P({ acao: "ler_personagem", personagemId: id }).dados.oblivio.corpo.regioes.reduce((s, r) => s + r.estresse, 0);
  const antesR = soma(idAge);
  const r1 = P({ acao: "oblivio_operar", campanhaId: camp, opId: "op-obl-r1", operacao: { tipo: "receberAtaque", quem: idAge, pendente: "ap-teste-1", regiao: "pernaD", dano: 99 } });
  t.ok("Paulo recebe na região que escolheu; o valor é o da mesa (3), não o do pedido", r1.ok && soma(idAge) === antesR + 3);
  t.ok("  o acerto sai da lista de pendentes", M({ acao: "ler_oblivio", campanhaId: camp }).dados.estado.encontro.ataquesPendentes.length === 0);
  P({ acao: "oblivio_operar", campanhaId: camp, opId: "op-obl-r1", operacao: { tipo: "receberAtaque", quem: idAge, pendente: "ap-teste-1", regiao: "pernaD" } });
  t.igual("  repetido (mesmo opId): não aplica de novo", soma(idAge), antesR + 3);
  t.recusa("  outro pedido para o mesmo acerto: já não existe", P({ acao: "oblivio_operar", campanhaId: camp, opId: "op-obl-r2", operacao: { tipo: "receberAtaque", quem: idAge, pendente: "ap-teste-1", regiao: "pernaD" } }), "nao_encontrado");
}
