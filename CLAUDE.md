# R.A.M.A. — instruções para o Claude

Site estático (HTML, CSS e JavaScript puro, sem build) com backend em Google
Apps Script (`backend/*.gs`) e uma planilha como banco. Respostas e relatórios
para a pessoa: **em português**.

## Fluxo de trabalho: a entrega em desenvolvimento

Os pedidos se acumulam numa **entrega aberta** até a pessoa dizer “fecha essa
versão” (ou equivalente: “fecha a versão”, “pode fechar”, “gera a versão”). O
estado da entrega mora em [`docs/ENTREGA.md`](docs/ENTREGA.md) — é dali que uma
conversa nova continua o trabalho, sem depender do histórico do chat.

1. **Antes de trabalhar**: leia `docs/ENTREGA.md` e rode `git status` /
   `git diff --stat`. Confira se as alterações presentes batem com o registro;
   o que não estiver lá pode ser trabalho de outra pessoa ou de outra conversa
   — preserve e pergunte se precisar mexer.
2. **A cada pedido**: implemente, faça as verificações pertinentes (testes do
   terminal, navegador pelo servidor local) e atualize `docs/ENTREGA.md`.
   Diga à pessoa **como testar** (qual conta, qual tela, o que observar).
3. **O registro acumula**: o comportamento implementado, as pendências, o que
   foi verificado, o que depende do teste da pessoa e as mudanças de backend
   (arquivos `.gs` a atualizar no Apps Script, `setupRama`, propriedades).
   Consolide itens repetidos; ideias abandonadas e alterações revertidas saem do
   resumo. Guarde referências a arquivos e decisões, nunca diffs inteiros.
4. **“Fecha essa versão”**:
   - confira o conjunto efetivo (`git status`, `git diff`) contra o registro;
     se não houver mudança nenhuma desde o último fechamento, diga isso e **não**
     crie versão vazia;
   - resolva o que for recuperável (testes quebrados, sobras de depuração,
     documentação desatualizada); o que não der, explique antes de fechar;
   - escolha o nível pela política do comentário de `js/versao.js` — o conjunto
     é classificado pela mudança mais relevante;
   - escreva **um único** registro em `js/versao.js` para a entrega inteira:
     codinome inédito (`grep -c '"NOME"' js/versao.js` tem de dar 0 antes de
     gravar) e a **data real do dia**;
   - a nota da versão no README (seção “Atualizar o backend”, dizendo se só o
     site muda ou quais `.gs` atualizar) e a linha “o que a pessoa vê: vX” na
     seção Versionamento;
   - commit local só com os arquivos e trechos da entrega, mensagem
     `vX.Y.Z CODINOME: resumo` terminando em
     `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`;
   - marque a entrega como fechada em `docs/ENTREGA.md` (versão, commit, data)
     — esse arquivo entra no próprio commit.
5. **O pedido seguinte** abre uma entrega nova: zere `docs/ENTREGA.md` a partir
   do modelo que está nele.

**Durante uma entrega aberta**: nada de commit, nenhum registro em
`js/versao.js`, nenhum codinome — terminar uma tarefa não fecha a entrega. Só
uma instrução explícita da pessoa abre exceção. O fechamento autoriza o commit;
**push, deploy e publicação** precisam de autorização própria.

Mudança de dados (schema da ficha, `versaoFormato`, formato de armazenamento)
acompanha a mudança que a exigiu e fica registrada na entrega. Os números das
versões já publicadas nunca mudam.

## Testar localmente

- **A pessoa**: duplo clique em `Abrir testes.cmd` (raiz). Abre o servidor
  simulado em `http://localhost:8124/__testes`, com contas fictícias (dona,
  editora, leitora, mestre) e dados guardados em `testes/dados-locais/`
  (fora do Git). `Restaurar dados de teste.cmd` volta ao conjunto inicial.
- **O Claude**, para verificar no navegador: `preview_start` com
  **`rama-medicao`** (porta 8125, dados só na memória, recomeça a cada partida
  — não mexe nos dados da pessoa). Entre por
  `http://localhost:8125/__entrar?conta=dona&para=/personagens/` (nunca digite
  senha). A conta `novata` tem o tutorial inicial pendente;
  `/__tutorial?conta=…&estado=pendente` devolve qualquer conta ao tutorial. Use **`rama-testes`** (porta 8124, os dados da pessoa) só quando ela
  pedir para ver algo nos dados dela — e não rode as duas na mesma porta.
- Arquivo do site mudou → atualizar a página basta. Arquivo `.gs` mudou → o
  servidor precisa ser reiniciado (os dados guardados continuam); diga isso à
  pessoa no retorno da tarefa.
- Pare servidores com `preview_stop`; nunca mate todos os processos `deno`.
- Testes do terminal: `deno run --allow-read testes/executar.js` (e os
  `testes/executar-*.js` da área tocada; Ajuda e tutoriais:
  `deno run --allow-read testes/executar-ajuda.js`; exportação em PDF/PNG:
  `deno run --allow-read testes/executar-exportar.js`); módulo compartilhado
  com o backend (perigos, hacking, viagens) mudou → `deno run --allow-read
  --allow-write testes/copiar-modulo-gs.js js/ordem/viagens.js backend/Ordem.gs`;
  o ambiente de testes em si:
  `deno run --allow-run --allow-read --allow-write --allow-net --allow-env testes/executar-servidor-testes.js`.

## Regras do projeto

- Dados de teste sempre **sintéticos**. Nenhum segredo no frontend; nunca
  confie no frontend para autorização; nada de migração destrutiva.
- Preserve as quebras de linha dos arquivos que editar.
- Imagens novas em `assets/rituais`, `assets/criaturas` ou `assets/dados`:
  converter para WebP e regenerar o mapa (`python testes/otimizar-imagens.py
  --aplicar <pasta>` e `deno run --allow-read --allow-write
  testes/gerar-mapa-imagens.js`), sem esperar pedido.
- Git: não apague `.git/packed-refs.lock` (o aviso de `pack-refs` depois do
  commit é inofensivo); evite `git stash`; nunca faça `amend` de commit que não
  seja seu.
