# Entrega em desenvolvimento

O estado da entrega aberta — o que já foi feito desde a última versão publicada
e o que falta. O fluxo está no [CLAUDE.md](../CLAUDE.md): os pedidos se acumulam
aqui, sem commit e sem registro em `js/versao.js`, até a pessoa dizer “fecha
essa versão”. No fechamento, este arquivo vira o resumo da versão e entra no
commit; o pedido seguinte recomeça a partir do modelo no fim.

## Situação

- **Estado:** fechada — v9.26.0 TRANSCRITO, 28/11/2026
- **Base:** v9.25.2 SOBREPOSTO (commit `3503497`)
- **Aberta em:** 27/11/2026
- **Nível previsto:** minor — a aba Ajuda, o tutorial inicial, a exportação
  em PDF/PNG e o Arquivos Secretos 11 (suplemento novo, ferramenta de campanha, regra opcional; schema
  38 e aba nova no backend) são funcionalidade nova para quem usa (o pedido 1 é
  infraestrutura de desenvolvimento). Fechada como minor com `destaque: true`.

## Pedidos desta entrega

### 1. Fluxo de versões em desenvolvimento e ambiente de testes de um clique (27/11/2026)

**Comportamento implementado**

- Fluxo de entrega registrado em `CLAUDE.md` (novo, na raiz) e resumido no
  comentário da política em `js/versao.js` e no README (Versionamento).
- `testes/servidor-local.js` ganhou o modo com dados em disco (`--dados`):
  planilha simulada, propriedades e contas num JSON; gravação 300 ms depois de
  cada mudança, atômica (`.tmp` → `.anterior` → principal); recuperação de
  gravação interrompida; arquivo ilegível ou de formato mais novo preservado,
  com diagnóstico e escolha (estado anterior / dados iniciais / sair); uma
  instância por arquivo (trava com a porta); porta ocupada explicada; escuta só
  em `127.0.0.1`; `setupRama` a cada partida (colunas novas entram sozinhas).
  Sem `--dados`, o modo medição de sempre (memória).
- Rotas novas: `/__testes` (escolha de conta + “Restaurar dados de teste” com
  confirmação), `/__rama` (identidade da instância), `/__restaurar` (POST, exige
  cabeçalho `x-rama-testes: restaurar`). `/__entrar` agora abre uma sessão nova
  a cada entrada (a guardada podia ter expirado). O `config.js` servido aponta
  para a origem usada no navegador.
- Iniciadores: `Abrir testes.cmd` e `Restaurar dados de teste.cmd` (raiz) →
  `testes/abrir-testes.ps1` e `testes/restaurar-testes.ps1`. Caminhos
  relativos ao projeto; Deno ausente → instrução de instalação.
- `testes/dados-locais/` no `.gitignore`.
- `.claude/launch.json` (local, fora do Git): `rama-testes` (8124, dados da
  pessoa) e `rama-medicao` (8125, memória); removidas quatro configurações que
  apontavam para arquivos temporários que não existem mais; mantidas `rama`
  (HTTP, backend real) e as duas de comparação com versões antigas, que ainda
  funcionam.
- Testes: `testes/executar-servidor-testes.js` (novo).

**Decisões**

- Arquivo de estado em `testes/dados-locais/estado.json`; formato próprio
  (`rama-testes-locais`, versão 1). Cache do Apps Script não é guardado (é
  descartável também na implantação).
- Claude verifica em `rama-medicao` para não mexer nos dados da pessoa.
- Restaurar guarda uma cópia em `estado.antes-de-restaurar.json`.

**Verificado**

- `testes/executar-servidor-testes.js`: 43 ok — ficha nova, inventário, aliado
  e compartilhamentos sobrevivem a derrubar à força e subir; editora edita e
  leitora só lê depois de reabrir; segunda instância recusada; porta do próprio
  servidor e de outro programa; restaurar pelo navegador (sem cabeçalho recusa)
  e por `--restaurar`; gravação interrompida recuperada; JSON quebrado e formato
  99 recusados com o arquivo intacto; modo medição não grava nada.
- `Abrir testes.cmd` por `Start-Process` (caminho com espaço, “Meu Drive”):
  subiu, criou os dados, abriu o navegador; segunda abertura só abriu o
  navegador (uma instância só); porta 8124 ocupada por outro programa →
  mensagem com o nome e o PID.
- Navegador (preview `rama-testes`): `/__testes`, entrar como Leitora e ver a
  ficha compartilhada como Leitor; cancelar a restauração não mudou nada;
  ficha criada sobreviveu a fechar e abrir o servidor (sessão também);
  restaurar voltou às duas fichas iniciais.

**Depende do teste da pessoa**

- Duplo clique de verdade no `Abrir testes.cmd` e no `Restaurar dados de
  teste.cmd` (o fluxo foi exercitado por linha de comando; a pergunta
  interativa de arquivo ilegível só aparece num console de verdade).
- Fechar a janela pelo X: a gravação acontece 300 ms depois de cada mudança;
  fechar no meio desses 300 ms pode perder a última mudança.
- Retomar a entrega numa conversa nova e pedir “fecha essa versão”.

**Backend**

- Nada muda no Apps Script: só o site de testes e arquivos de apoio.

**Pendências**

- Nenhuma.

### 2. Aba Ajuda e tutorial inicial obrigatório (27/11/2026)

**Comportamento implementado**

- **Tutorial inicial obrigatório por conta.** Toda página (menos a ficha
  embutida no combate) manda para `ficha/?tutorial=inicial&voltar=<pedido>`
  enquanto a conclusão não estiver gravada; conta antiga sem o campo é
  pendente. Oito etapas sobre a ficha Universal de exemplo (Rafa Duarte, foto
  `assets/brutal/arquetipos/cetica.webp`): boas-vindas e leitura do livro,
  áreas, modos + alterar recurso, rolar perícia (resultado e parcelas),
  abrir habilidade e item, campanhas/permissões (situação fictícia Leitor ×
  Editor), personalização com prévia (Legacy/Modern20, tema, densidade,
  desfeita ao sair) e Ajuda/Feedback + **Concluir tutorial**. Práticas
  avançam com a ação; explicativas com Próximo; Voltar sempre. Sem Encerrar,
  Escape ou clique fora; links para outras páginas segurados; Sair continua.
  Recarregar recomeça do zero. Falha ao gravar: fica na etapa final com
  “Tentar de novo”. Depois: atalhos e volta ao destino pedido (só caminho do
  próprio site). Novidades da versão esperam a página seguinte. Outras abas
  sabem da conclusão na hora.
- **Demonstração isolada**: a página da ficha em modo demonstração usa os
  componentes reais com uma ficha só da página; `RAMAApi.modoDemonstracao`
  recusa toda gravação no próprio site (`demonstracao`); histórico da mesa,
  Copiar desligado; Compartilhar… aparece nas Opções da ficha só com uma
  explicação (o tutorial aponta para ele).
- **Aba Ajuda** (navegação principal, `ajuda/`): busca por tarefa, sintoma e
  termos da tela; Primeiros passos (Refazer tutorial inicial, começar como
  jogador e como mestre); guias por área; tutoriais por sistema; perguntas
  frequentes; Feedback. 43 artigos em `js/ajuda/artigos.js`, cada trecho com
  a fonte (Funcionamento do RAMA, livro + edição + página impressa, fã ou
  interpretação). `ajuda/?guia=<id>` abre direto; histórico do navegador.
- **“Ajuda desta tela”** (ícone ? no cabeçalho) em todas as áreas, abrindo o
  guia da seção (na ficha, o dos modos).
- **Tutoriais por sistema** (`ficha/?demo=<id>`): Universal, Ordem
  Paranormal, Ordem Paranormal RPG II (Experimental), Oblívio, Vampiro V5,
  Malditos Goblins 3ª ed., BRUTAL Corte Rápido e Tormenta20 Jogo do Ano, cada
  um com ficha pronta gerada pelo motor do sistema
  (`assets/ajuda/demos/*.json`, `testes/gerar-demos-ajuda.js`) e uma etapa de
  teste que avança com a rolagem.
- Revisão voluntária (`&revisao=1`): Encerrar a qualquer momento, nada gravado.
- Servidor de testes: conta nova **novata** (tutorial pendente); as quatro de
  sempre nascem com ele concluído (roteiros de medição); `/__tutorial` marca
  pendente ou concluído; em dados guardados antes, as quatro ficam pendentes
  (o caso “conta antiga”).

**Decisões**

- Conclusão em `preferenciasJson.tutorial.inicial`, escrita só por
  `concluir_tutorial` (idempotente); `salvar_perfil` recusa a chave e só mexe
  no que foi pedido — aba antiga não apaga. Sem coluna nem `setupRama`.
- Servidor sem o campo `tutorial` na sessão (Apps Script não atualizado): o
  site não exige o tutorial (não haveria como gravar a conclusão).
- O tutorial roda na página da ficha (componentes reais); as etapas de
  campanha e permissão usam situação fictícia no cartão.
- Com uma janela aberta, o cartão vai para baixo do véu dela; no computador
  troca de canto se cobrir o controle; o dado vai para o canto oposto.

**Verificado**

- `testes/tutorial-backend.js` (no `executar-backend.js`, 2235 ok): pendente
  para conta nova e antiga, conclusão no login e na sessão, idempotência,
  `salvar_perfil` recusa a chave e não desfaz, duas abas sem regressão,
  preferências preservadas, conta da sessão.
- `testes/executar-ajuda.js` (81 ok): artigos, fontes (formato de página, fã,
  interpretação, cada trecho com a sua), busca (compartilhar, mestre, não
  consigo editar…), percurso + artigo + ficha de exemplo por sistema
  registrado, fichas normalizando no próprio sistema, Ajuda desta tela,
  `voltar` seguro.
- Navegador (`rama-medicao`, janela de 513 px): desvio de `/campanhas/` para o
  tutorial, links segurados, as 8 etapas por clique e teclado, rolagem visível
  acima da folha, prévia Modern20/claro desfeita, busca, falha de gravação
  com nova tentativa, conclusão, volta a Campanhas com o aviso de novidades
  depois, outro aparelho (armazenamento limpo) entra direto, revisão
  encerrada sem perder a conclusão, duas abas, percursos dos 8 sistemas com a
  etapa de teste concluída, zero chamadas ao servidor durante a demonstração
  e gravações recusadas no site.
- `executar.js` 4436, tema 316 (dois testes do aviso de novidades
  atualizados), grade 43, companheiro 75, ambiente de testes 43.

**Depende do teste da pessoa**

- Percorrer o tutorial inteiro em Legacy e Modern20 no computador largo e no
  celular de verdade, com leitor de tela se possível.
- Contas antigas dos dados de teste (`Abrir testes.cmd`): devem cair no
  tutorial no próximo acesso.
- Conferir o tom e a extensão dos textos (meta de 5 a 8 minutos).

**Backend**

- Atualizar `backend/Codigo.gs` no Apps Script e criar nova versão da
  implantação (ação `concluir_tutorial` e o campo `tutorial` na sessão). Sem
  `setupRama`, sem coluna. Enquanto o Apps Script real não for atualizado, o
  site não exige o tutorial.

**Pendências**

- Nenhuma conhecida. Fontes sem página verificada listadas em `docs/AJUDA.md`.

### 3. Arquivos Secretos 11: viagens, Carcaças Vermelhas e Limite de Dados (28/11/2026)

**Comportamento implementado**

- **Suplemento `ordem.as11`** (fonte AS11, v1.0) nos dois cadastros (site e
  `backend/Sistemas.gs`), no catálogo de livros e nas fontes de criaturas, com
  a capa (`assets/sistemas/ordem-as11-capa.webp` e a pequena, tiradas da
  página 1 do PDF, 320 × 429 e 160 × 215, como as dos outros volumes).
  Liberar o suplemento não liga nada.
- **Gaudério Abutre saiu dos Extras e passou ao AS11, p. 63** (mesmo texto,
  mesma chave; a ficha que já tem a origem continua igual; para escolher de
  novo, o AS11 precisa estar ligado). A Motocicleta dos Gaudérios (AS3)
  continua uma entrada só, com `republicacoes` (AS11 p. 57). O suporte a
  republicações (`C.fontesDe`, abas de livro da criação, referência com as
  duas fontes) fica para conteúdo republicado.
- **Viagens nas estradas** — mecânica opcional da campanha de Ordem
  (Configurações → Mecânicas opcionais → aba Viagens), da ferramenta `viagens`
  do suplemento. Módulo compartilhado `js/ordem/viagens.js` (copiado em
  `Ordem.gs`): 17 veículos de viagem (p. 37) com equipamento de série; módulos
  curta/média/longa (e vários dias) nas duas velocidades; encontros fixos
  (escondidos até revelar) e aleatórios; navegação pelos quatro métodos;
  condução trecho a trecho (DT 10 +5, falha pede encontro, encontro efetivo
  volta a 10) com baixa de autonomia; d100 + subtabelas de d20 com testes,
  decisões e consequências propostas (o mestre aplica ou descarta);
  aplicabilidade (bicicleta/cavalo, elétrico, carro velho, Painéis Solares,
  ar-condicionado); acidentes com a composição (−5, −1, −2, −2, proporções,
  Sensores, Aprimoramentos de Velocidade), o d100 do outro envolvido, as faixas
  (≤ 20 frontal; Gaiola de Proteção na capotagem; airbag como nota) e o dano por
  ocupante; perdas e danos registrados com natureza, tipo e resistência por
  alvo; reservas de estepe e extintor explícitas; escolta (02–49 vira
  emboscada); histórico com autor e **Desfazer** com os efeitos.
- **Veículo operacional vinculado (AS3)**: a viagem lê PV, combustível e
  regalias da ficha (nunca escreve); gestão por dados de combustível na ficha
  sem baixa dupla; categoria operacional × categoria de requisição mostradas.
- **Carcaças Vermelhas**: orientação (4 agentes, NEX 20%, 20 PP); roteiro
  padrão/imprudente; contador de perseguição 1–10 com origem; dados de caçada
  por agente; escolhas de cada cena com efeitos aplicados uma vez; testes
  estendidos das cenas 5 e 6 com o custo de cada falha; explosão da Cena 4;
  cardápio do Sonnenblume (temporários na ficha, com a origem, que expiram no
  fim da missão); confronto final (reféns pelo contador, pessoa querida, DT 35
  dos passageiros sem repetir a perícia da rodada anterior, DT do motorista
  recalculada por rodada, 7 sucessos/3 falhas por veículo, falha de passageiro
  com d12 e alvo sorteado, carroceria, sacrifício no fim da rodada uma vez só);
  desfecho; remissões das fichas só para o mestre.
- **Na ficha**: dados de caçada no resultado de qualquer teste de perícia ou
  atributo (o servidor rola os d4/d6 e grava com a operação); Troca Tiro e Dá
  Porrada (+1d6 por 1 PE em Luta/Pontaria) com Bruna ou Rômulo acompanhando;
  Ajuda Como Dá (1 PE) de Nicole; Apfelstrudel (+1d4 nas resistências); origem
  dos temporários do AS11 na dica do campo Temp.
- **Regalias do AS11 nos Veículos Operacionais** (11, p. 56–57): menores em
  terços de vaga (três = uma), Carrinho Lateral só em moto, estepe/extintor até
  3 com reserva usada e reposta à mão; instalar conserva combustível, PV e
  avarias.
- **Aliados** Bruna Machado, Nicole Oliva da Silva e Rômulo Machado na
  biblioteca de Ordem (com imagens provisórias), com o treinamento que respeita
  o grau original (+1d20 para quem já é treinado).
- **Limite de Dados** (p. 103–104, regra da comunidade de Luna Moth, marcada
  como não oficial): regra opcional da ficha (Combate e sobrevivência) —
  positivo limitado a 5 antes das reduções, ≤ −3 rola cinco, atributo intacto,
  dados acrescentados depois respeitam o limite (Rajada, Dois canos, +1d20 dos
  poderes do AS3/AS4); ameaças com chave da campanha (Configurações) e a Fonte
  do Medo enquanto o Enigma de Medo da ocorrência não for resolvido; aliados
  criatura seguem a regra da ficha.
- **Ajuda**: artigos “Viagens nas estradas”, “Carcaças Vermelhas: os controles
  da missão”, “Limite de Dados” e “Esclarecimentos do Inquérito Mensal (AS11)”,
  cada bloco com a fonte e a página; “Ferramentas do mestre” atualizado.

**Decisões (interpretações registradas na Ajuda e em `docs/ORDEM-REGRAS.md`)**

- Confronto final: a Pilotagem usa DT 25 (p. 86); o exemplo 35 → 20 levou a
  base dos passageiros para a conta. Três sucessos → DT 10.
- Ignorar a fumaça (Cena 4) segue para a Cena 5 (padrão) ou 7 (imprudente); a
  volta à Cena 3 da p. 79 contradiz o itinerário e a p. 82.
- Estepe e extintor: 3 é o limite de cada tipo, contando a primeira aquisição.
- Sem fórmula na fonte (airbag): informação e decisão da mesa.
- Equipamento de série dos veículos de viagem: estepe em todo motorizado que
  não é moto; extintor nesses menos o carro velho.
- Várias pessoas queridas vivas: a do 1 no d4 é sorteada entre elas.
- Expiração do Sonnenblume: sai o menor entre o concedido e os temporários
  daquele recurso que a ficha ainda tem.
- Rolagens das operações da viagem são do servidor (como na mesa de Ordem II):
  a repetição devolve o resultado gravado. Os testes dos personagens continuam
  rolados nas fichas; o total é registrado na viagem.

**Verificado**

- `testes/viagens-backend.js` (no `executar-backend.js`, 2288 ok): cópia do
  módulo idêntica; desligada por padrão; só o mestre liga e conduz (ação do
  mestre enviada direto ao backend recusada); carro popular 600 km só com o
  AS11; veículo do AS3 vinculado lido da ficha, sem tocar nela, sem baixa dupla;
  vista do jogador sem notas, sem encontro fixo futuro, sem encontros futuros;
  d100 gravado e não rolado de novo na repetição; dados de caçada (3, gasta 2
  contra Carcaça: +2d6, sobra 1; retentativa com o mesmo resultado e saldo);
  outro jogador não gasta; Sonnenblume na ficha com a origem, sem duplicar;
  reféns 10 → 9 preservados ao reler; fim de rodada uma vez; fim da missão
  expira o que sobrou sem tocar nos permanentes; desfazer devolve os dados;
  Limite de Dados das ameaças (liga, lê, recusa sem o suplemento); suplemento
  desligado impede operar, permite desligar.
- `testes/executar-as11.js` (89 ok): suplemento, republicações, 17 veículos,
  autonomia 350 → 700, itinerários, d100 98 com bicicleta, imunidades,
  acidente 27 − 5 − 1 = 21 lateral 10d6, regalias menores (três numa vaga,
  reabrir mantém), reservas, aliados (treino × +1d20), Limite de Dados (7 com
  −2 → 3d20; −2 → −4d20; ≤ −3 → −5d20; atributo intacto), ameaça 7d20 → 5d20 e
  Fonte do Medo, Carcaças pelo módulo (DT 10 com três passageiros, perícia
  repetida recusada, DT recalculada, reféns), Sonnenblume e expiração, schema.
- Suítes: `executar.js` 4436, tema 316, as7 152, as9 114, criaturas 188,
  suplementos 48, ajuda 81, ambiente de testes 43 (testes de contagem e de
  schema atualizados para o AS11).
- Navegador (`rama-medicao`): ligar Viagens em Configurações, iniciar a
  missão, veículo, decisão da Cena 1 (+1 e +1 dado), encontro rolado, preparar
  o confronto (contador 7 → 10 vivos, d10), chave do Limite de Dados nas
  Configurações; na ficha do agente, gastar 1 dado de caçada no resultado de
  Atletismo (1d4 rolado pelo servidor, saldo 0); regra Limite de Dados na aba
  Regras; editor de regalias com as menores em terços de vaga.

**Depende do teste da pessoa**

- A viagem livre inteira e a missão em Legacy e Modern20, no computador e no
  celular; a vista de um jogador (conta dona/editora com ficha na mesa).
- O tom dos textos das cenas e se os apoios bastam para conduzir a mesa.

**Backend**

- Atualizar no Apps Script: `Ordem.gs` (módulo de viagens, `ler_viagens`,
  `viagem_operar`), `Dados.gs` (aba `CAMPANHA_VIAGENS`), `Sistemas.gs`
  (suplemento `ordem.as11`, mecânica `viagens`), `Campanhas.gs` (chave
  `limiteDeDados` da campanha; retrato de criatura `as11`) e `Codigo.gs`
  (pré-leitura da aba nova). **Rodar `setupRama()`** (cria
  `CAMPANHA_VIAGENS`) e criar nova versão da implantação.
- Sem `setupRama`, a ferramenta responde `instalacao_incompleta` ao ligar; nada
  existente é convertido.

**Pendências**

- Imagens dos três aliados são provisórias (silhueta com o nome), como as
  demais do catálogo.

### 4. Testes que já falhavam antes desta entrega (28/11/2026)

**Comportamento implementado**

- `testes/executar-pastas.js`: as expectativas ainda tinham a ordem antiga
  dos sistemas; a v9.4.1 VIZINHO pôs Ordem II ao lado de Ordem I de propósito.
  O teste agora segue o registro (`js/sistemas.js`). Nada no site mudou.
- `assets/rituais/`: seis símbolos não eram quadrados (AS1 Passagem de
  Conhecimento Expandido; AS2 Mapa Sanguíneo, Labirinto Mental, Capturar
  Momento, Rajada Caótica; AS7 Vampirismo — 1000 × 824 a 1000 × 1102). Cada um
  foi encaixado num quadrado transparente de 1000 × 1000, reduzido na
  proporção quando passava de 1000 e centralizado, em WebP sem perda (a regra
  do LEIA-ME dos rituais). A arte não foi cortada.

**Verificado**

- Todas as suítes `testes/executar*.js` passam (pastas 57, símbolos 25 e as
  demais sem falha); conferência visual de um símbolo.

### 5. Título do Arquivos Secretos 7 (28/11/2026)

- O suplemento `ordem.as7` passa a se chamar “Arquivos Secretos 7: Vampiros”
  (janela de Suplementos da ficha e da campanha), no padrão dos outros volumes
  com subtítulo. A sigla, a fonte e a lista de livros do catálogo não mudam.
- Verificado: suplementos 47, AS7 152, principal 4436 e Ajuda 81, todos ok.

### 6. Gaudério Abutre só no Arquivos Secretos 11 (28/11/2026)

- A origem saiu dos Extras: fonte AS11, p. 63 (o texto do pacote é o mesmo do
  marca-página). Mesma chave: fichas que já têm a origem continuam iguais e
  funcionando (o que já está em uso nunca some); para novas escolhas, vale o
  AS11 ligado. Ginasta e Dublê continuam nos Extras.
- Verificado: todas as suítes `testes/executar*.js` passam (principal 4437, AS11 88; dois testes da biblioteca de origens atualizados para a seção nova do AS11).


### 7. Forma de progressão na primeira etapa da criação de Ordem (28/11/2026)

**Comportamento implementado**

- A etapa **Conceito** do assistente de Ordem I abre com “Forma de
  progressão”: **Somente NEX**, **Nível + NEX** e **Evolução por Patentes**,
  antes do perfil (agora “Perfil do personagem”: Agente, Mundano,
  Sobrevivente) e dos campos de NEX e nível, que mudam na hora.
- As três opções ligam e desligam as MESMAS chaves de sempre
  (`nexExperiencia`, `evolucaoPatentes`, incompatíveis entre si), com as
  conversões que já existiam (`aplicarRegra`, ex-`alternarRegra`): NEX ↔ nível
  no mesmo degrau, recruta com o NEX como exposição, Mundano/Sobrevivente em
  nível 0. Nome, conceito, campanha e o que está nos campos de NEX/nível são
  guardados antes da troca; com escolhas já feitas, o aviso pede para revisar
  (nada é apagado).
- Forma indisponível **some** do seletor (a pedido: nada de botão bloqueado
  com explicação): suplemento desligado (as duas são do Sobrevivendo ao
  Horror) ou perfil sem patente. Se só sobra Somente NEX, o seletor inteiro
  some e a Revisão não oferece “Alterar”. Trocar para Mundano ou Sobrevivente
  com Patentes ativa volta a Somente NEX, com aviso.
- **Revisão**: o bloco “Regras que mudam a progressão” saiu; fica o resumo
  “Forma de progressão: …” com **Alterar na etapa Conceito** (volta com o foco
  na opção). Textos de ajuda dos campos atualizados.

**Verificado**

- Navegador (`rama-medicao`, janela estreita): escolher Nível + NEX mostra
  nível 1 e NEX por exposição 5% (nome digitado preservado); Patentes mostra só
  a exposição; Mundano desliga Patentes e ela some do seletor; rascunho
  completo → Revisão com o resumo → Alterar → Somente NEX (nível 1 → NEX 5%) →
  atributos, origem, classe e perícias mantidos → Patentes → criar: a ficha
  reabre com Evolução por Patentes ligada e NEX & Experiência desligada.
- `executar.js` 4437, tema 316, Ajuda 81, suplementos 47, AS11 88.

**Depende do teste da pessoa**

- O assistente em Modern20 e no celular de verdade; a criação nos três modos
  com classes diferentes (o ocultista em Patentes escolhe Ocultismo ou
  Vontade na etapa Classe).

### 8. Exportar a ficha em PDF e PNG, no modelo de cada sistema (28/11/2026)

**Comportamento**

- Opções da ficha (⋯) → **Exportar ficha** ganhou, acima do JSON, **Baixar
  PDF** (um arquivo, todas as páginas) e **Baixar PNG** (uma imagem por
  página, `_p01`, `_p02`…). O JSON continua igual (inclusive como saída de
  segurança quando o salvamento falha), com o botão renomeado para “Baixar
  JSON”. Vale em Legacy e Modern20 e em todos os oito sistemas; o modelo não
  depende de tema, densidade ou interface.
- As páginas são desenhadas uma vez em canvas e os dois formatos saem delas:
  a página 2 do PDF é o `_p02.png`. PDF com as páginas como imagem sem perdas
  (FlateDecode via `CompressionStream`; sem ela, JPEG 95%), ~180 dpi; PNG na
  mesma resolução. Nada vai para servidor nenhum.
- Exporta a ficha que a página tem agora (`estado.ficha`, inclusive o que
  ainda não foi salvo), numa cópia: nada muda na ficha, nos recursos, nos ids
  ou no salvamento. Leitor também exporta (é leitura).
- Nome: `{nome}_{sistema}_{AAAA-MM-DD}_{agente}{registro}.pdf|_pNN.png` —
  sistema `Ordem-I`, `Ordem-II`, `Oblivio`, `Vampiro-V5`, `Malditos-Goblins`,
  `BRUTAL`, `Tormenta20`, `Universal`; data local; **agente e registro são os
  códigos da tela** (“Agente // XXXXX” do Perfil e “Registro // XXXXX” da
  ficha, `RAMAUtil.codigoCurto`), a pedido da pessoa. Espaço vira hífen; somem
  `< > : " / \ | ? *`, controle e `_`; acentos ficam; nome reservado do Windows
  vira “ficha”. Demonstração usa `DEMO`.
- **Modelos** (`js/exportar/modelo-*.js`, valores dos motores de regras):
  - *Ordem I*: vertical P&B, faixas pretas e textura gasta; atributos em volta
    do núcleo; PV/PE/SAN (ou PD com Jogando sem Sanidade), Defesa, Bloqueio,
    Esquiva, deslocamento, PE por rodada, proficiências, resistências, carga;
    ataques (`armaEfetiva`); perícias com grau e total à direita; o campo de
    progressão segue a forma (Somente NEX, Nível + NEX, Patentes, Mundano,
    Sobrevivente). Continuação: habilidades das regras (a mesma lista da aba,
    com as personalizadas) e as criadas à mão, rituais com versões,
    inventário, condições, regras opcionais/suplementos, campos, anotações,
    aliados.
  - *Ordem II*: horizontal escura com moldura azul (referência das fichas dos
    playtests): nome, perfil • ocupação • nível, atributos em losango com o
    dado, perícias com o dado do degrau + o do atributo, PV/PD em
    quadradinhos, habilidades em abas azuis; retrato da ficha (ou silhueta).
  - *Oblívio*: horizontal, moldura com volutas, Conhecimentos (especializados
    marcados) e Fora de Ação; nome, retrato, silhueta com atual/máximo por
    região; dez círculos (Carne… Velocidade, com Fôlego); Motivação, Papel e
    habilidades; inventário, mazelas e fardos depois.
  - *Vampiro V5*: identificação 3×3, atributos e habilidades com bolinhas
    (especializações embaixo), Vitalidade/FdV com “/” e “X”, Disciplinas com
    os poderes, Ressonância, Fome, Humanidade com Máculas; página 2 com
    Potência de Sangue (tabela), Experiência, Pilares e Convicções, Perdição e
    Compulsão do clã, Vantagens e Defeitos, rituais, fórmulas, equipamento,
    história.
  - *Malditos Goblins*: um cartão “Ficha do Goblin” grande (não seis cópias),
    com Equipamento, Ferimentos em casas e Técnicas/magias.
  - *BRUTAL*: título de pincel vermelho, marca d'água de rasgos rosados,
    caixas de traço irregular; os cinco Estilos do Corte Rápido no lugar dos
    atributos da referência (é o que o R.A.M.A. usa), Habilidade, Pilha (6),
    PT (10), Iniciativa (no lugar de Enganação, que o Corte Rápido não tem),
    Apegos, Fuga, Sequelas e Dado Marcado nas seis faces. Pilha/PT/fuga/
    marcadores vêm do Thriller de treino da ficha; sem ele, os limites ficam
    para preencher (numa campanha esse estado mora na mesa da Diretora).
  - *Tormenta20*: papel claro, molduras com cantos vermelhos; atributos, PV/PM,
    ataques, Defesa (parcelas), proficiências, tamanho, deslocamento, XP,
    perícias, equipamento com espaços e carga; continuação com raça/origem,
    classe, poderes, magias (com aprimoramentos), parceiros.
  - *Universal*: neutro, organização de D&D; nomes e módulos da ficha (módulo
    desligado não sai; rótulo dos rituais respeitado).
- O que não cabe no modelo vai para páginas de continuação no mesmo estilo,
  partindo o texto entre colunas e páginas sem cortar.
- `js/ordem/telas/ficha-ordem.js`: a montagem da lista de habilidades das
  regras virou `aquisicoesDasRegras(o, est)` (a aba usa igual) e há
  `RAMAOrdemHabilidadesDaFicha(o, inventario)` para a exportação.
- Ajuda: o artigo de importação/exportação cita PDF e PNG.

**Verificado**

- `testes/executar-exportar.js` (novo, 69): nomes (exemplo do pedido,
  caracteres inválidos, acentos, reservado, `_pNN`), um modelo por sistema
  com a cara da referência e os dados, orientações, primeiras páginas
  diferentes entre si, continuação sem perda (30 habilidades, 40 peças,
  todas as anotações, textos inteiros), nenhum texto abaixo de 3,5 pt, ficha
  inalterada, valor não salvo sai no documento, Nível + NEX, Jogando sem
  Sanidade, módulo desligado e nome personalizado na Universal, estrutura do
  PDF (xref, `/Count`, A4).
- Navegador (`rama-medicao`): os oito modelos conferidos em prévia com fichas
  sintéticas (`testes/exportar-amostras.js`) e a ficha do Jeff; o fluxo da
  janela Exportar com o nome `Jeff-(medição)_Ordem-I_2026-11-28_605CB0FE09.pdf`
  (605CB = Agente do Perfil, 0FE09 = Registro da ficha); PDF de 3 páginas em
  0,2 s, aberto no visualizador de PDF; PNG por página.
- `executar.js` 4437, frontend 249, tema 316, Ajuda 81, suplementos 47.

**Depende do teste da pessoa**

- Baixar de verdade nos navegadores dela (no PNG o navegador pode pedir
  permissão para vários downloads), imprimir um PDF, conferir no celular e
  em Modern20; olhar cada modelo com fichas reais e dizer o que ajustar no
  visual. As fontes são as do sistema (Impact, Georgia, Palatino…): em
  aparelhos sem elas, o navegador usa a substituta mais próxima.

## Arquivos tocados

`CLAUDE.md` (novo), `docs/ENTREGA.md` (novo), `testes/servidor-local.js`,
`testes/executar-servidor-testes.js` (novo), `testes/abrir-testes.ps1` (novo),
`testes/restaurar-testes.ps1` (novo), `Abrir testes.cmd` (novo),
`Restaurar dados de teste.cmd` (novo), `.gitignore`, `js/versao.js` (só o
comentário da política), `README.md`, `docs/PERFORMANCE.md`.

Pedido 2: `backend/Codigo.gs`, `js/api.js`, `js/auth.js`, `js/app.js`,
`js/ui.js` (símbolo ?), `js/densidade.js` (prévia), `js/paginas/ficha.js`,
`ficha/index.html`, `js/tutorial.js`, `js/ajuda/` (artigos, demos,
tutorial-inicial, tutoriais-sistemas), `js/paginas/ajuda.js`,
`ajuda/index.html`, `css/ajuda.css`, `css/modern20/ajuda.css`,
`assets/ajuda/demos/` (7 JSON), `testes/gerar-demos-ajuda.js`,
`testes/executar-ajuda.js`, `testes/tutorial-backend.js`,
`testes/executar-backend.js`, `testes/executar-tema.js`,
`testes/servidor-local.js` (novata, `/__tutorial`), `docs/AJUDA.md`,
`docs/API.md`, `CLAUDE.md`.

Pedido 3: `js/ordem/viagens.js` (novo), `js/ordem/telas/campanha-viagens.js`
(novo), `js/ordem/telas/ficha-arquivo11.js` (novo), `css/viagens.css` e
`css/modern20/viagens.css` (novos), `backend/Ordem.gs`, `backend/Dados.gs`,
`backend/Sistemas.gs`, `backend/Campanhas.gs`, `backend/Codigo.gs`,
`js/suplementos.js`, `assets/sistemas/ordem-as11-capa*.webp` (novas), `js/sistemas.js`, `js/api.js`, `js/paginas/campanha.js`,
`campanha/index.html`, `ficha/index.html`, `js/ordem/catalogo.js`,
`js/ordem/arquivo3.js`, `js/ordem/opcionais.js`, `js/ordem/regras.js`,
`js/ordem/criaturas-dados.js`, `js/ordem/criaturas.js`, `js/criaturas.js`,
`js/criatura-painel.js`, `js/paginas/campanha-combate.js`,
`js/paginas/ficha-aliados.js`, `js/ordem/telas/ficha-ordem.js`,
`js/ordem/telas/ficha-arquivo3.js`, `js/ordem/telas/ficha-arquivo4.js`,
`js/ordem/telas/ordem-criar.js`, `js/ordem/telas/ordem-escolhas.js`,
`js/ficha.js` (schema 38), `js/sync.js`, `js/ajuda/artigos.js`,
`assets/ajuda/demos/` (regeradas no schema 38), `assets/criaturas/as11/`
(novas, provisórias) e o LEIA-ME, `testes/viagens-backend.js` (novo),
`testes/executar-as11.js` (novo), `testes/copiar-modulo-gs.js` (novo),
`testes/executar-backend.js`, `testes/casos.js`, `testes/executar-as7.js`,
`testes/executar-as9.js`, `testes/executar-criaturas.js`,
`testes/executar-suplementos.js`, `docs/ORDEM-REGRAS.md`, `docs/API.md`,
`docs/DATABASE.md`, `docs/CHARACTER_SCHEMA.md`, `CLAUDE.md`.

Pedido 4: `testes/executar-pastas.js`, seis `assets/rituais/*/*/simbolo.webp`.

Pedido 5: `js/suplementos.js` (nome do AS7).

Pedido 7: `js/ordem/telas/ordem-criar.js`, `testes/casos.js` (rótulo).

Pedido 8: `js/exportar/` (novos: `motor.js`, `modelo-ordem.js`,
`modelo-oblivio.js`, `modelo-vampiro.js`, `modelo-goblins.js`,
`modelo-brutal.js`, `modelo-tormenta20.js`, `modelo-universal.js`),
`ficha/index.html`, `js/paginas/ficha.js`, `css/ficha.css` (fileira dos
botões), `js/ordem/telas/ficha-ordem.js`, `js/ajuda/artigos.js`,
`testes/executar-exportar.js` (novo),
`testes/exportar-amostras.js` (novo), `CLAUDE.md`.

## Fechamentos

<!-- Ao fechar: “vX.Y.Z CODINOME — commit abc1234 — DD/MM/AAAA”, e a Situação
     passa a “fechada”. Um novo pedido zera as seções acima com o modelo. -->

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
- **Nível previsto:** patch | minor | major — motivo

## Pedidos desta entrega
### 1. Título (DD/MM/AAAA)
**Comportamento implementado** · **Decisões** · **Verificado** ·
**Depende do teste da pessoa** · **Backend** · **Pendências**

## Arquivos tocados
```
