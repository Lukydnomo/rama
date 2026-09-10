/* =====================================================================
   R.A.M.A. — camada de API
   ---------------------------------------------------------------------
   Uma função por operação do servidor, e o token entrando sozinho em
   todas. Nenhuma tela monta corpo de requisição à mão: se uma ação
   nova aparecer, ela nasce aqui.

   O ponto sensível é `repetir`. Uma operação idempotente pode ser
   repetida quando o Apps Script demora a acordar ou tropeça no próprio
   redirecionamento. Uma que CRIA registro não pode: repetir
   "criar_personagem" cria dois personagens.

   Por isso a lista é explícita, e não adivinhada por prefixo do nome da
   ação — nome é fácil de errar, lista é fácil de conferir.
   ===================================================================== */

(function (global) {
  "use strict";

  /* Só o que pode ser repetido sem consequência entra nesta lista.

     Toda leitura entra, por definição. E entram duas gravações, porque
     as duas SUBSTITUEM um valor em vez de acrescentar um registro:
     gravar a mesma foto duas vezes deixa a mesma foto na mesma célula,
     e gravar o mesmo perfil duas vezes deixa o mesmo perfil. Repetir
     não cria nada.

     O que NÃO pode entrar aqui é qualquer ação que CRIE registro —
     criar_personagem repetida cria dois personagens. Essas são
     tentadas uma vez só, e quem chamou decide o que fazer. */
  var IDEMPOTENTES = [
    "ping",
    "sessao",
    "resumo",
    "listar_personagens",
    "ler_personagem",
    "ler_foto",
    "listar_homebrew",
    "listar_campanhas",
    "ler_campanha",
    "ler_perfil",

    "listar_usuarios",
    "listar_personagens_campanha",
    "listar_rolagens",
    "listar_documentos",
    "ler_imagem_documento",
    "listar_notas_mestre",
    "listar_combates",
    "ler_homebrew",
    "ler_imagem_criatura",

    "salvar_foto",
    "salvar_perfil",
    "salvar_imagem_criatura",
    "salvar_imagem_documento",

    /* registrar_rolagem repete com segurança porque carrega um id
       próprio: o servidor reconhece a segunda chegada e não cria a
       segunda linha. Sem essa chave ela NÃO poderia estar aqui. */
    "registrar_rolagem",
  ];

  function podeRepetir(acao) { return IDEMPOTENTES.indexOf(acao) >= 0; }

  /* Chamada crua: quem precisa de uma ação que ainda não tem função
     própria usa esta, e o token entra do mesmo jeito. */
  async function post(corpo) {
    var dados = Object.assign({}, corpo);
    if (!dados.token && global.RAMAAuth) {
      var t = global.RAMAAuth.token();
      if (t) dados.token = t;
    }

    var r = await global.RAMARede.postar(dados, { repetir: podeRepetir(dados.acao) });

    /* Sessão morta é assunto de autenticação, não de tela: quem
       descobre avisa o RAMAAuth, que limpa e leva ao portão. Sem isto
       cada página precisaria repetir esse tratamento. */
    if (r && !r.ok && ehErroDeSessao(r.erro) && global.RAMAAuth) {
      global.RAMAAuth.aoPerderSessao(r.erro);
    }

    return r || { ok: false, erro: "sem_resposta" };
  }

  function ehErroDeSessao(erro) {
    return erro === "sessao" || erro === "expirada" || erro === "inativo" || erro === "sem_token";
  }

  /* =================================================================
     SESSÃO
     ================================================================= */

  function login(usuario, senha) {
    /* Login pode repetir: uma senha errada volta como resposta de
       verdade e para na primeira tentativa. Só o tropeço do Google —
       que não chega a contar tentativa — é repetido. */
    return global.RAMARede.postar(
      { acao: "login", usuario: usuario, senha: senha },
      { repetir: true }
    );
  }

  function sessao(token) { return post({ acao: "sessao", token: token }); }
  function logout(token) { return post({ acao: "logout", token: token }); }
  function ping() { return post({ acao: "ping" }); }

  /* =================================================================
     PANORAMA
     ================================================================= */

  function resumo() { return post({ acao: "resumo" }); }

  /* =================================================================
     PERSONAGENS
     -----------------------------------------------------------------
     A listagem devolve só o cabeçalho de cada registro (nome, campanha,
     datas) — nunca a ficha inteira. Trinta fichas completas numa
     resposta seria megabytes para desenhar uma lista de nomes.
     ================================================================= */

  function listarPersonagens() { return post({ acao: "listar_personagens" }); }

  function lerPersonagem(id) {
    return post({ acao: "ler_personagem", personagemId: id });
  }

  function criarPersonagem(dados) {
    return post({ acao: "criar_personagem", dados: dados });
  }

  /* A rev é obrigatória: é ela que impede sobrescrever em silêncio o
     que outro aparelho gravou enquanto esta tela estava aberta. */
  function salvarPersonagem(id, rev, dados) {
    return post({ acao: "salvar_personagem", personagemId: id, rev: rev, dados: dados });
  }

  function excluirPersonagem(id) {
    return post({ acao: "excluir_personagem", personagemId: id });
  }

  function duplicarPersonagem(id) {
    return post({ acao: "duplicar_personagem", personagemId: id });
  }

  /* A foto anda fora da ficha, e por um motivo prático: ela é o campo
     mais pesado do registro e o que menos muda. Junto no fichaJson,
     cada tecla digitada numa anotação reenviaria a imagem inteira. */
  function lerFoto(id) { return post({ acao: "ler_foto", personagemId: id }); }

  function salvarFoto(id, imagem) {
    return post({ acao: "salvar_foto", personagemId: id, imagem: imagem });
  }

  /* =================================================================
     HOMEBREW
     ================================================================= */

  /* escopo: "meus" (padrão), "publicos" ou "todos". O padrão é o mais
     restrito de propósito — quem não pediu conteúdo alheio não recebe. */
  function listarHomebrew(opcoes) {
    var o = opcoes || {};
    return post({ acao: "listar_homebrew", escopo: o.escopo || "meus", tipo: o.tipo || "" });
  }

  function salvarHomebrew(registro) {
    return post({ acao: "salvar_homebrew", dados: registro });
  }

  function excluirHomebrew(id) {
    return post({ acao: "excluir_homebrew", homebrewId: id });
  }

  /* =================================================================
     CAMPANHAS
     ================================================================= */

  function listarCampanhas() { return post({ acao: "listar_campanhas" }); }

  function lerCampanha(id) { return post({ acao: "ler_campanha", campanhaId: id }); }

  function criarCampanha(dados) { return post({ acao: "criar_campanha", dados: dados }); }

  function salvarCampanha(id, rev, dados) {
    return post({ acao: "salvar_campanha", campanhaId: id, rev: rev, dados: dados });
  }

  function excluirCampanha(id) { return post({ acao: "excluir_campanha", campanhaId: id }); }

  /* =================================================================
     PERFIL
     ================================================================= */

  function lerPerfil() { return post({ acao: "ler_perfil" }); }

  function salvarPerfil(dados) { return post({ acao: "salvar_perfil", dados: dados }); }

  /* =================================================================
     HOMEBREW — LEITURA AVULSA E IMAGENS
     ================================================================= */

  function lerHomebrew(id) { return post({ acao: "ler_homebrew", homebrewId: id }); }

  function lerImagemCriatura(id) { return post({ acao: "ler_imagem_criatura", criaturaId: id }); }

  function salvarImagemCriatura(id, imagem) {
    return post({ acao: "salvar_imagem_criatura", criaturaId: id, imagem: imagem });
  }

  /* =================================================================
     CAMPANHA — PARTICIPANTES E PERSONAGENS
     ================================================================= */

  function listarUsuarios() { return post({ acao: "listar_usuarios" }); }

  function salvarParticipantes(campanhaId, membros) {
    return post({ acao: "salvar_participantes", campanhaId: campanhaId, membros: membros });
  }

  function listarPersonagensCampanha(campanhaId) {
    return post({ acao: "listar_personagens_campanha", campanhaId: campanhaId });
  }

  function vincularPersonagem(campanhaId, personagemId, vincular) {
    return post({
      acao: "vincular_personagem", campanhaId: campanhaId,
      personagemId: personagemId, vincular: vincular !== false,
    });
  }

  /* O ajuste cirúrgico do painel do mestre: um campo, por id, com a
     revisão conferida. Não é um atalho mais frouxo do que salvar a
     ficha — é o mesmo controle sobre um payload menor. */
  function ajustarPersonagem(personagemId, rev, alvo, itemId, campo, valor) {
    return post({
      acao: "ajustar_personagem", personagemId: personagemId, rev: rev,
      alvo: alvo, itemId: itemId, campo: campo, valor: valor,
    });
  }

  /* =================================================================
     CAMPANHA — ROLAGENS
     ================================================================= */

  function listarRolagens(campanhaId, opcoes) {
    var o = opcoes || {};
    return post({
      acao: "listar_rolagens", campanhaId: campanhaId,
      limite: o.limite, pulo: o.pulo,
    });
  }

  /* A rolagem JÁ aconteceu. O `rolagemId` é gerado por quem rolou e é a
     chave que impede uma retentativa de virar duas linhas no histórico.
     Nunca gere um id novo ao repetir o envio. */
  function registrarRolagem(campanhaId, rolagem) {
    return post({
      acao: "registrar_rolagem", campanhaId: campanhaId,
      rolagemId: rolagem.id, personagemId: rolagem.personagemId || "",
      tipo: rolagem.tipo || "", nome: rolagem.nome || "",
      dados: rolagem.dados,
    });
  }

  function limparRolagens(campanhaId) {
    return post({ acao: "limpar_rolagens", campanhaId: campanhaId });
  }

  /* =================================================================
     CAMPANHA — DOCUMENTOS, NOTAS E COMBATES
     ================================================================= */

  function listarDocumentos(campanhaId) {
    return post({ acao: "listar_documentos", campanhaId: campanhaId });
  }

  function salvarDocumento(campanhaId, dados, rev) {
    return post({ acao: "salvar_documento", campanhaId: campanhaId, dados: dados, rev: rev });
  }

  function excluirDocumento(campanhaId, documentoId) {
    return post({ acao: "excluir_documento", campanhaId: campanhaId, documentoId: documentoId });
  }

  function lerImagemDocumento(campanhaId, documentoId) {
    return post({ acao: "ler_imagem_documento", campanhaId: campanhaId, documentoId: documentoId });
  }

  function salvarImagemDocumento(campanhaId, documentoId, imagem) {
    return post({
      acao: "salvar_imagem_documento", campanhaId: campanhaId,
      documentoId: documentoId, imagem: imagem,
    });
  }

  function listarNotasMestre(campanhaId) {
    return post({ acao: "listar_notas_mestre", campanhaId: campanhaId });
  }

  function salvarNotaMestre(campanhaId, dados) {
    return post({ acao: "salvar_nota_mestre", campanhaId: campanhaId, dados: dados });
  }

  function excluirNotaMestre(campanhaId, notaId) {
    return post({ acao: "excluir_nota_mestre", campanhaId: campanhaId, notaId: notaId });
  }

  function listarCombates(campanhaId) {
    return post({ acao: "listar_combates", campanhaId: campanhaId });
  }

  function salvarCombate(campanhaId, dados, rev) {
    return post({ acao: "salvar_combate", campanhaId: campanhaId, dados: dados, rev: rev });
  }

  function excluirCombate(campanhaId, combateId) {
    return post({ acao: "excluir_combate", campanhaId: campanhaId, combateId: combateId });
  }

  /* =================================================================
     MENSAGENS
     -----------------------------------------------------------------
     Um código de erro do servidor vira uma frase que uma pessoa
     entende. "Error 403 fetch" não ajuda ninguém; o detalhe técnico
     continua no console, onde é útil.
     ================================================================= */

  var FRASES = {
    sem_configuracao: {
      titulo: "R.A.M.A. NÃO CONFIGURADO",
      texto: "O endereço do servidor ainda não foi informado. Preencha API_URL em js/config.js.",
    },
    sem_conexao: {
      titulo: "SEM CONEXÃO",
      texto: "Este aparelho não conseguiu alcançar a rede. O que você digitou continua aqui; assim que a conexão voltar, o envio se repete sozinho.",
    },
    prazo: {
      titulo: "O SERVIDOR DEMOROU DEMAIS",
      texto: "O R.A.M.A. já tentou algumas vezes e a resposta não chegou. " +
             "O servidor entra em repouso quando fica parado e a primeira consulta " +
             "o acorda — se esta foi a primeira do dia, tente de novo: agora costuma ir.",
    },
    servidor_falhou: {
      titulo: "NÃO FOI POSSÍVEL ACESSAR O ARQUIVO",
      texto: "O servidor respondeu de forma inesperada. Tente novamente; se continuar, confira a publicação do Apps Script.",
    },
    sem_permissao: {
      titulo: "ACESSO NEGADO",
      texto: "Este registro não pertence à sua conta.",
    },
    nao_encontrado: {
      titulo: "REGISTRO NÃO ENCONTRADO",
      texto: "Ele pode ter sido excluído de outro aparelho.",
    },
    conflito: {
      titulo: "ALTERAÇÃO CONFLITANTE",
      texto: "Este registro mudou em outro aparelho enquanto você trabalhava.",
    },
    credenciais: {
      titulo: "ENTRADA RECUSADA",
      texto: "Usuário ou senha incorretos.",
    },
    bloqueado: {
      titulo: "ENTRADA BLOQUEADA",
      texto: "Tentativas demais. Espere alguns minutos antes de tentar de novo.",
    },
    expirada: {
      titulo: "SESSÃO EXPIRADA",
      texto: "Entre novamente para continuar.",
    },
    sessao: {
      titulo: "SESSÃO INVÁLIDA",
      texto: "Entre novamente para continuar.",
    },
    inativo: {
      titulo: "CONTA DESATIVADA",
      texto: "Esta conta não está mais ativa. Procure quem administra o R.A.M.A.",
    },
    dados_invalidos: {
      titulo: "DADOS RECUSADOS",
      texto: "O servidor não aceitou o conteúdo enviado. Confira os campos e tente de novo.",
    },
    ocupado: {
      titulo: "ARQUIVO OCUPADO",
      texto: "Outra gravação está acontecendo neste momento. Tente novamente em instantes.",
    },
  };

  function frase(resposta) {
    var codigo = (resposta && resposta.erro) || "servidor_falhou";
    var f = FRASES[codigo];
    if (f) return f;
    return {
      titulo: "ALGO DEU ERRADO",
      texto: "O servidor recusou esta operação (" + codigo + "). Detalhes no console.",
    };
  }

  /* Uma linha só, para avisos passageiros. */
  function recado(resposta) {
    var f = frase(resposta);
    return f.titulo + " — " + f.texto;
  }

  global.RAMAApi = {
    post: post,
    podeRepetir: podeRepetir,
    ehErroDeSessao: ehErroDeSessao,

    login: login,
    sessao: sessao,
    logout: logout,
    ping: ping,
    resumo: resumo,

    listarPersonagens: listarPersonagens,
    lerPersonagem: lerPersonagem,
    criarPersonagem: criarPersonagem,
    salvarPersonagem: salvarPersonagem,
    excluirPersonagem: excluirPersonagem,
    duplicarPersonagem: duplicarPersonagem,
    lerFoto: lerFoto,
    salvarFoto: salvarFoto,

    listarHomebrew: listarHomebrew,
    salvarHomebrew: salvarHomebrew,
    excluirHomebrew: excluirHomebrew,

    listarCampanhas: listarCampanhas,
    lerCampanha: lerCampanha,
    criarCampanha: criarCampanha,
    salvarCampanha: salvarCampanha,
    excluirCampanha: excluirCampanha,

    lerPerfil: lerPerfil,
    salvarPerfil: salvarPerfil,

    lerHomebrew: lerHomebrew,
    lerImagemCriatura: lerImagemCriatura,
    salvarImagemCriatura: salvarImagemCriatura,

    listarUsuarios: listarUsuarios,
    salvarParticipantes: salvarParticipantes,
    listarPersonagensCampanha: listarPersonagensCampanha,
    vincularPersonagem: vincularPersonagem,
    ajustarPersonagem: ajustarPersonagem,

    listarRolagens: listarRolagens,
    registrarRolagem: registrarRolagem,
    limparRolagens: limparRolagens,

    listarDocumentos: listarDocumentos,
    salvarDocumento: salvarDocumento,
    excluirDocumento: excluirDocumento,
    lerImagemDocumento: lerImagemDocumento,
    salvarImagemDocumento: salvarImagemDocumento,

    listarNotasMestre: listarNotasMestre,
    salvarNotaMestre: salvarNotaMestre,
    excluirNotaMestre: excluirNotaMestre,

    listarCombates: listarCombates,
    salvarCombate: salvarCombate,
    excluirCombate: excluirCombate,

    frase: frase,
    recado: recado,
  };
})(window);
