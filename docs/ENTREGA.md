# Entrega em desenvolvimento

O estado da entrega aberta — o que já foi feito desde a última versão publicada
e o que falta. O fluxo está no [CLAUDE.md](../CLAUDE.md): os pedidos se acumulam
aqui, sem commit e sem registro em `js/versao.js`, até a pessoa dizer “fecha
essa versão”. No fechamento, este arquivo vira o resumo da versão e entra no
commit; o pedido seguinte recomeça a partir do modelo no fim.

## Situação

- **Estado:** fechada — v9.27 MOLDE, 28/11/2026
- **Base:** v9.26.0 TRANSCRITO (+ a correção avulsa da Ajuda desta tela, sem registro no changelog)
- **Aberta em:** 28/11/2026
- **Classe:** minor — pelo efeito conjunto: a automação das habilidades
  características abre uma capacidade nova no fluxo de classes Homebrew
  (configurar e usar na ficha o que antes era só texto); o formato da versão
  é organização, e nada transforma a experiência central.

## Pedidos desta entrega

### 1. Versionamento público X.Y + revisão em letras, classificação pelo conjunto (28/11/2026)

**Comportamento implementado**

- `js/versao.js`: política reescrita (único lugar dela). Formato `X.Y`, revisão
  em letras minúsculas coladas (`10.2a` … `10.2z`, `10.2aa`); major `(X+1).0`,
  minor `X.(Y+1)`, revisão = próxima letra; nada avança por quantidade de
  entregas. Classe automática pelo efeito coletivo das mudanças efetivas (não
  pela maior isolada, não pelo volume, não pela quantidade de sistemas),
  escolhida no fechamento com justificativa curta, sem perguntar o nível. Só a
  versão pública: identificadores de dev são da pessoa.
- Compatibilidade: registros antigos intactos; `X.Y.Z` vale como posição da
  revisão (0 = sem letra, 1 = a, 2 = b…) — `partes`, `comparar`, `tipo`
  (`major`/`minor`/`revisao`), `destaque`, `valida` e `proxima(numero, classe)`
  entendem os dois formatos (9.25.2 = 9.25b; z antes de aa; 10.10 depois de 10.9z).
- `js/app.js`: “revisão ·” no lugar de “manutenção ·” no histórico; legenda
  nova; a versão já vista no navegador aceita os dois formatos (uma 9.26.0
  gravada não faz versões antigas reaparecerem; 9.26a seria novidade).
- `backend/Feedback.gs`: a versão enviada com o Feedback aceita `X.Y` e
  `X.Y + letras` (antes viraria “não informada”).
- Instruções persistentes: `CLAUDE.md` (passo do fechamento e escopo só
  público), README (Versionamento), memória do assistente.

**Verificado**

- `executar.js` 4475 (formato, ordem antigos + novos, `proxima` com os
  exemplos do pedido, `tipo`/`destaque`), tema 321 (aviso de novidade na
  transição: 9.26.0 vista não reaparece, 9.26a é novidade, 9.25.2 = 9.25b,
  10.2z → 10.2aa), backend 2291 (Feedback com 9.26a e 10.2).

**Depende do teste da pessoa**

- Abrir o histórico (rodapé) em Legacy e Modern20.

**Backend**

- Atualizar `backend/Feedback.gs` no Apps Script (nova versão da implantação)
  antes de publicar a primeira versão no formato novo.

### 2. Habilidades características nas classes Homebrew de Ordem I (28/11/2026)

**Comportamento implementado**

- Editor da classe (`js/paginas/homebrew-classe.js`): etapa nova **4.
  Habilidades** com cartões editáveis (nome, descrição, escolha de perícias,
  aquisição e melhorias por NEX/nível e por Patente com custos próprios,
  efeitos por controles), selos Passiva / Com uso / Só texto / Pede escolha,
  prévia da evolução e predefinições (Ataque Especial, Eclético, Perito,
  Engenhosidade — ligada ao Eclético —, Escolhido pelo Outro Lado). "Começar
  de" uma oficial traz as dela. A habilidade de conjuração trava a caixa de
  Rituais da etapa 3 (a mesma tabela, sem contradição).
- O campo "Habilidades iniciais" (texto) saiu: uma habilidade característica
  sem efeito É a habilidade só de texto (cartão na ficha, a mesa aplica). Ao
  abrir uma classe antiga no editor, cada linha vira um cartão sem efeito no
  1º marco, com aviso; a biblioteca só muda ao salvar, e a ficha só com a
  atualização explícita da versão. A definição antiga continua válida (o
  normalizador preserva `habilidadesIniciais`). Antes, esse texto só aparecia
  na tela de transição para agente; agora a transição cita as só de texto e
  as características do 1º marco.
- Regras puras em `js/ordem/habilidades-classe.js`; definição normalizada em
  `homebrew-ordem.js` (só existe quando há habilidades: classes antigas
  mantêm a chave); entradas no catálogo de poderes (`poderes.js`,
  `catalogo.js`).
- Progressão (`progressao.js`): concessão nos marcos sem vaga de poder,
  escolha numa vaga `opcoesBeneficio` com chave estável, efeitos passivos do
  estágio vigente, cartões nas automáticas (com estágio e escolha). Na aba,
  um cartão só (`ficha-ordem.js`). Criação: o cartão da classe lista as
  habilidades; a escolha aparece em "Falta decidir".
- Uso nas rolagens (`js/ordem/telas/ficha-habilidades-classe.js`, ganchos em
  `ficha-ordem.js`): teste de perícia (bônus, dado, benefícios de grau, com a
  opção melhorada de Engenhosidade), ataque e dano. Confirmação com custo e
  efeito; cancelar não gasta; sem saldo, não aplica; acima do limite de PE por
  rodada, só no custo mínimo da habilidade (com aviso); uma vez por
  resultado; a ficha não muda.
- Exportar/importar: a habilidade usa `chave` (não `id`, que a importação
  apaga).

**Verificado**

- `testes/executar-habilidades-classe.js` (novo, 55, com a transição): definição, classes
  antigas e versões, predefinições, concessão sem vaga, escolha validada,
  estágios sem somar (NEX, nível, Patentes), passivo estável, Eclético +
  Engenhosidade, Ataque Especial adaptado, exportação/importação, versão nova
  só com atualização explícita, oficiais intactas. Principal 4475, homebrew de
  Ordem 165, backend 2291, frontend 249, exportação 69, tema 321, servidor de
  testes 43 e as demais `executar*.js` sem falha.
- Navegador (`rama-medicao`): classe "Começar do Especialista" + habilidade
  própria (+2 Defesa em NEX 15%) criada e salva; personagem criado com ela; a
  Revisão pediu a escolha do Perito (Luta/Pontaria e não treinadas
  recusadas); cartões certos em NEX 5% e 40%; Perito no teste de Diplomacia:
  cancelar não gastou, confirmar gastou 2 PE e mostrou a parcela, repetir não
  gastou de novo, sem saldo bloqueou; Defesa 11 → 13 com Guarda Alta;
  Acrobacia ofereceu Eclético (2 PE) e Eclético + Engenhosidade (4 PE);
  Modern20 com os mesmos cartões.

**Depende do teste da pessoa**

- O bônus de ataque/dano numa rolagem real de arma (coberto nos testes do
  motor, não clicado no navegador); o editor no celular; classes reais.

## Arquivos tocados

`js/versao.js` (só o comentário da política e as funções do fim), `js/app.js`,
`backend/Feedback.gs`, `testes/casos.js`, `testes/executar-tema.js`,
`testes/feedback-backend.js`, `CLAUDE.md`, `README.md`, `docs/ENTREGA.md`.

Pedido 2: `js/ordem/habilidades-classe.js` (novo),
`js/ordem/telas/ficha-habilidades-classe.js` (novo), `js/ordem/homebrew-ordem.js`,
`js/ordem/catalogo.js`, `js/ordem/poderes.js`, `js/ordem/progressao.js`,
`js/ordem/telas/ficha-ordem.js`, `js/ordem/telas/ordem-criar.js`,
`js/paginas/homebrew-classe.js`, `css/homebrew.css`, `css/modern20/homebrew.css`,
as páginas que carregam `homebrew-ordem.js` (o script novo),
`testes/executar-habilidades-classe.js` (novo), `testes/executar-homebrew-ordem.js`,
`docs/HOMEBREW-SISTEMAS.md`.

## Fechamentos

<!-- Ao fechar: “vX.Y.Z CODINOME — commit abc1234 — DD/MM/AAAA”, e a Situação
     passa a “fechada”. Um novo pedido zera as seções acima com o modelo. -->

- v9.27 MOLDE — commit `v9.27 MOLDE` (o próprio commit que traz este
  arquivo; o hash está no `git log`) — 28/11/2026. Pedidos 1 e 2. Backend:
  `Feedback.gs` e nova versão da implantação. Todas as suítes
  `testes/executar*.js` passaram no fechamento (inclusive o servidor de testes).

- v9.26.0 TRANSCRITO — commit `v9.26.0 TRANSCRITO` (o próprio commit que traz
  este arquivo; o hash está no `git log`) — 28/11/2026. Pedidos 1 a 8.
  Backend: `Ordem.gs`, `Dados.gs`, `Sistemas.gs`, `Campanhas.gs`, `Codigo.gs`,
  `setupRama()` e nova versão da implantação. Todas as suítes
  `testes/executar*.js` passaram no fechamento (inclusive o servidor de testes).

---

## Modelo (para abrir a próxima entrega)

```
## Situação
- **Estado:** aberta
- **Base:** vX.Y.Z CODINOME (commit `abc1234`)
- **Aberta em:** DD/MM/AAAA
- **Classe prevista:** revisão | minor | major — efeito conjunto (decidida no fechamento)

## Pedidos desta entrega
### 1. Título (DD/MM/AAAA)
**Comportamento implementado** · **Decisões** · **Verificado** ·
**Depende do teste da pessoa** · **Backend** · **Pendências**

## Arquivos tocados
```
