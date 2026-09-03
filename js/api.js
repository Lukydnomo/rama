/* =====================================================================
   R.A.M.A. — camada de API
   ---------------------------------------------------------------------
   Uma função por operação do servidor, e o token entrando sozinho em
   todas. Nenhuma tela monta corpo de requisição à mão: se uma ação
   nova aparecer, ela nasce aqui.

   O ponto sensível é `repetir`. Leitura é idempotente e pode ser
   repetida quando o Apps Script tropeça no próprio redirecionamento.
   Gravação NÃO pode: repetir "criar_personagem" cria dois personagens.
   Por isso a lista de leituras é explícita, e não adivinhada por prefixo
   do nome da ação — nome é fácil de errar, lista é fácil de conferir.
   ===================================================================== */

(function (global) {
  "use strict";

  /* Só o que pode ser repetido sem consequência entra nesta lista. */
  var LEITURAS = [
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
  ];

  function ehLeitura(acao) { return LEITURAS.indexOf(acao) >= 0; }

  /* Chamada crua: quem precisa de uma ação que ainda não tem função
     própria usa esta, e o token entra do mesmo jeito. */
  async function post(corpo) {
    var dados = Object.assign({}, corpo);
    if (!dados.token && global.RAMAAuth) {
      var t = global.RAMAAuth.token();
      if (t) dados.token = t;
    }

    var r = await global.RAMARede.postar(dados, { repetir: ehLeitura(dados.acao) });

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

  function listarHomebrew() { return post({ acao: "listar_homebrew" }); }

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
      texto: "A resposta não chegou a tempo. Isso costuma ser passageiro — tente de novo em alguns segundos.",
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
    ehLeitura: ehLeitura,
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

    frase: frase,
    recado: recado,
  };
})(window);
