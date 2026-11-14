# A ficha de Ordem Paranormal — composição (v6.4)

A ficha de Ordem foi reorganizada em v6.4 (codinome PENTAGRAMA) pela frequência
de uso. Esta página é o inventário de campos e ações feito **antes** da
mudança. Cada linha diz onde o campo ou a ação ficou depois dela. Cálculos,
regras, schema e manipuladores não mudaram: só o lugar e o peso visual de cada
coisa.

## As três necessidades

| Necessidade | Onde |
|---|---|
| **Durante a sessão**: atributos, recursos, defesa, condições, ataques e perícias | bloco compacto acima das abas (resumo) e aba **Geral** (a visão de jogo) |
| **Consulta do personagem**: identidade, habilidades, rituais, inventário, anotações e aliados | parte de baixo da Geral ("Personagem") e as abas Habilidades, Rituais, Inventário, Anotações e Aliados |
| **Preparação e manutenção**: progressão, regras opcionais, personalizações e ajustes da mesa | abas **Progressão** e **Regras**, no fim da tira e separadas das outras |

A tira de abas ganhou três grupos (`grupo` em `js/sistemas.js`): jogo
(Geral, Perícias), personagem (Habilidades, Rituais, Inventário, Anotações,
Aliados) e preparo (Progressão, Regras). A separação é só visual: cada aba
continua sendo um `role="tab"`, as setas do teclado continuam andando entre
todas e a aba guardada (`rama.ficha.aba`) não muda de chave.

## O bloco acima das abas

Antes, o bloco mostrava a foto, a identidade curta e os painéis completos de
Atributos, Recursos, Condições e Defesa. Era preciso passar por eles toda vez
que se abria Rituais ou Inventário. Agora ele é uma linha:

- foto pequena, classe, origem, NEX ou nível, estágio (sobrevivente) e patente
  (**só com a regra de patente ligada e aplicada**);
- o resumo de sessão: PV, PE e SAN (ou PD) com atual/máximo, Defesa,
  condições críticas ativas (Morrendo, Enlouquecendo, Inconsciente,
  Perturbado), quantos efeitos estão ativos e quantas escolhas da Progressão
  estão pendentes.

O resumo **não tem controle que altere a ficha**. Cada item é um atalho: leva
à Geral e põe o foco no recurso, na Defesa ou nas condições, ou leva à
Progressão no caso das pendências. O ajuste manual de um recurso, que não
redesenha a ficha para não tirar o foco do campo, atualiza o resumo e a barra
no lugar (`sincronizarRecursos`).

## A aba Geral

No desktop (a partir de 1000 px), em duas colunas, como a página 1 da ficha de
papel:

| Coluna da esquerda | Coluna da direita |
|---|---|
| Atributos (o pentagrama) | Condições e efeitos |
| Recursos | Ataques (as armas do inventário) e Munição (regra opcional) |
| Defesa e movimento, com proteção em uso, carga e rituais | Perícias — consulta rápida |
| Proficiências e resistências | |

Com uma condição crítica ativa, o painel de Condições sobe para o topo da
Geral, na largura toda, e não pode ser recolhido.

Embaixo, na largura toda, vem **Personagem**: Identidade (com a foto e o nome
no modo edição), Cicatrizado (quando o poder existe) e Componentes
ritualísticos (regra opcional).

No celular, e no painel lateral da campanha (`?painel=1`), tudo vira uma
coluna, nesta ordem: condições críticas, atributos, recursos, defesa,
proficiências, condições, ataques, perícias e Personagem.

## Verificação

`testes/ficha-ordem-interface.js` confere esta composição no Chrome, contra o
servidor local, com dados sintéticos (ver o README). Ele cobre o bloco sem
controles, a ordem e os grupos das abas, nenhum botão dentro de outro, as
posições do pentagrama, o ajuste manual sem redesenho (mesmo campo, foco e
resumo), a ação de recurso a partir do valor atual, a condição crítica no topo e
o atalho do resumo, os ajustes da mesa só em Regras, as rolagens e as janelas, a
patente desligada, o modo edição, Mundano, Sobrevivente e o celular a 390 px sem
rolagem horizontal.

### Atributos

AGI em cima, FOR à esquerda, INT à direita, PRE embaixo à esquerda e VIG
embaixo à direita, em volta do centro, como na imagem de referência. O desenho
(anel e raios) é um SVG decorativo (`aria-hidden`). Cada atributo é um grupo
com um `<button>` de rolar (sigla, valor e dados) e, quando o valor efetivo é
diferente do da ficha, um botão "conta" ao lado — não mais um botão dentro de
outro. No modo edição o pentagrama vira uma grade de cartões com o controle de
valor. Num espaço menor que 280 px a grade também é usada.

### Recursos

Três camadas separadas, com rótulo escrito:

1. **Atual · ajuste manual**: o número grande é o próprio campo de ajuste (−,
   valor, +). Muda o valor e mais nada.
2. **Máximo**: o calculado, com "=" e a composição no clique.
3. **Aplicar com as regras**: a quantidade e as ações (Dano, Cura, Gastar,
   Dano mental, Recuperar — as de `condicoes.js` para cada recurso). Só elas
   aplicam as consequências das regras.

Uma barra mostra quanto sobrou. Ela é leitura periférica: o número continua lá.

### Condições e efeitos

| Estado | Como aparece |
|---|---|
| Ativo que exige atenção (Morrendo, Enlouquecendo, Inconsciente, Perturbado) | cartão cheio, traço de aviso (ou de erro no limite), painel no topo da Geral e alerta no resumo |
| Sugestão não aplicada (PV ou SAN em 0) | cartão tracejado na cor de aviso, com o botão que aplica |
| Efeito aplicado | cartão com traço paranormal |
| Encerrado ou histórico | dentro de "Terminados", apagado |
| Configuração ou explicação | "Cena, combate e imunidades", recolhível |

Sem nada ativo, Morrendo e Enlouquecendo viram uma linha com os dois botões
de ativar.

## Inventário (antes → depois)

### Bloco superior

| Campo ou ação | Antes | Depois |
|---|---|---|
| Foto | bloco | bloco (pequena); trocar foto: Identidade, no modo edição |
| Nome (edição) | bloco | Identidade (Geral), no modo edição |
| Classe, origem, estágio, NEX/nível, patente | bloco | bloco (linha) e Identidade |
| Aviso de pendências → Ver na Progressão | bloco | bloco (resumo) |
| Atributos: rolar, valor da ficha (edição), conta | bloco | Geral · Atributos |
| Recursos: máximo e composição, ajuste manual, quantidade, ações das regras, nota de determinação | bloco | Geral · Recursos (resumo no bloco) |
| Cena: Nova cena, Novo interlúdio, integrar ao combate | bloco | Geral · Condições (Nova cena à vista; o resto em "Cena, combate e imunidades") |
| Barganha Insana pendente → resolver | bloco | Geral · Condições |
| Morrendo e Enlouquecendo: ativar, +1 início de turno, −1 corrigir, encerrar, sugestão | bloco | Geral · Condições |
| Inconsciente: marcar e encerrar; Perturbado: encerrar | bloco | Geral · Condições |
| Adicionar condição; doenças e venenos (AS6) | bloco | Geral · Condições |
| Debaixo d'água e Pressão, Mentem Corrumpere (AS7, v6.5) | — | Geral · Condições (botões do AS7) |
| Experimento / escarificação do dia, braços, rituais marcados, reação (AS7, v6.5) | — | Habilidades · cartão do marco da trilha Monstruoso |
| O Que Restou (contato da cena) (AS7, v6.5) | — | Habilidades · cartão da origem |
| Sussurros e Vultos (AS7, v6.5) | — | no resultado do teste de perícia |
| Vampirismo (corpos, refeições) e rituais da trilha só hoje (AS7, v6.5) | — | Rituais · painel "Arquivos Secretos 7" (só quando há algo) |
| Carranca, Pé de Coelho, Sal Dourado, Terço Maculado (AS7, v6.5) | — | Inventário · opções do item |
| Efeitos ativos: +1 turno, −1 corrigir, editar, encerrar, inverter (AS5), descrição | bloco | Geral · Condições |
| Automáticas, trazidas por outras, contextuais, "enquanto valerem", rolagens pedidas | bloco | Geral · Condições |
| Terminados: −1 corrigir, reativar, remover da lista | bloco | Geral · Condições ("Terminados") |
| Imunidades: editar | bloco | Geral · Condições ("Cena, combate e imunidades") |
| Defesa, Bloqueio, Esquiva (composição e bônus extra) | bloco | Geral · Defesa e movimento (Defesa também no resumo) |
| Deslocamento, limite de PE/PD por turno, exceções | bloco | Geral · Defesa e movimento |
| Carga (resumo) e círculo de rituais | bloco | Geral · Defesa e movimento |

### Aba Geral (antes)

| Campo ou ação | Antes | Depois |
|---|---|---|
| Identidade completa, campanha (seletor na edição), suplementos em uso, trocar origem | Geral | Geral · Personagem · Identidade |
| Cicatrizado: sacrificar, nova sessão, desfazer, registro | Geral | Geral · Personagem |
| Proficiências e resistências | Geral | Geral, coluna da esquerda |
| Munição (regra opcional) | Geral | Geral, junto dos Ataques |
| Componentes ritualísticos (regra opcional) | Geral | Geral · Personagem |
| Ajustes da mesa: lista, remover, + ajuste manual | Geral | **Regras** (fim da aba); a Defesa avisa quantos há |

### Novos pontos de acesso (os mesmos manipuladores)

| O quê | Onde | Reutiliza |
|---|---|---|
| Ataques | Geral | `SecaoInventarioOrdem.botoesDaArma` (Ataque, Dano, dano alternativo), `R.armaEfetiva` |
| Perícias — consulta rápida | Geral | `botaoDoNome` (consulta dos usos), `rolarPericia`, `abrirComposicao`, a mesma ordem da aba Perícias |
| Proteção em uso | Geral · Defesa | `R.protecaoEmUso` (só leitura; usar e guardar continuam no Inventário) |
| Item em uso | Inventário | `classeDoItem` do perfil de Ordem marca a proteção em uso |

A aba **Perícias** continua sendo onde se edita grau, atributo e extra, onde
se escolhe a ordem e onde se arrasta. As demais abas (Progressão, Habilidades,
Rituais, Inventário, Anotações, Regras, Aliados) têm o mesmo conteúdo de antes.

## Ramificação: futuros do personagem — v9.5

Um planejador de evolução para fichas de **Ordem Paranormal (1ª edição)**. Na
aba Progressão, o painel **Ramificação · futuros do personagem** (só para o
DONO) fica separado dos avanços reais. **Planejar evolução** abre uma janela
com o selo **Simulação** no título o tempo todo e **← Voltar à Progressão**.

### O que é um plano

Um caminho possível: nome, alvo ("Partindo de 35% → Alvo: 50%") e as
decisões de cada marco até lá, guardadas por **vaga estável** da progressão
(`d8.ritualClasse`, `d10.atributo`, `afinidade`…). Até **8 planos por
ficha** (o limite aparece na tela). Criar, duplicar (id novo, sem ficha
nova), renomear, comparar e excluir. Mudanças ficam num rascunho até
**Salvar planos**. Uma falha de rede mantém o rascunho aberto, e duas abas
dão conflito com a lista atual.

| trilho | alvo |
|---|---|
| NEX convencional | NEX acima do atual, até 99% |
| NEX & Experiência | nível e exposição independentes (um eixo ou os dois; "não planejar") |
| Evolução por Patentes | a patente, com o mínimo de PP |
| Sobrevivente | o estágio |
| Mundano | sem marcos (o painel explica) |

O alvo nunca fica abaixo da ficha nem acima do teto. Um alvo já alcançado
aparece como "(já alcançado)", com o aviso.

### Tudo pelo motor de verdade

`js/ordem/ramificacao.js` (`RAMAOrdemRamificacao`) não tem tabela própria. A
**projeção** é uma cópia da ficha no alvo. As vagas novas vêm de
`RAMAOrdemProgressao.vagas` (as da projeção menos as da ficha), em ordem.
Cada decisão é gravada na projeção pela MESMA porta da Progressão
(`confirmarAquisicao`; trilha por `candidatosTrilha`; afinidade). Os recursos
vêm de `RAMAOrdemRegras.calcular`. Os suplementos ligados e as restrições da
campanha valem como na ficha.

"Escolher agora" abre a **mesma janela** da Progressão (e a biblioteca de
rituais, no catálogo oficial e só com o que cabe) em cima da projeção. Nada
da ficha é tocado. Uma decisão que deixou de fechar (requisito, escolha
anterior trocada, ritual de um suplemento desligado) fica em **Revisar**, com
o motivo, sem contar na conta. Ela volta a valer quando fecha de novo.
Reduzir o alvo guarda as decisões além dele como "fora do plano atual", e
aumentar traz de volta.

Estados com texto: **definida**, **a definir**, **revisar** (e, na
aplicação, **conflito** e **bloqueada**).

**Resumo** (à direita no largo; aba no celular): ficha atual → alvo de PV, PE
e SAN (ou PD), limite por turno, Defesa com o mesmo equipamento, atributos,
perícias que mudam, poderes e rituais, com o marco de origem. Também diz
quantas escolhas estão "a definir". **Comparar**: Ficha atual × plano ou
Plano A × Plano B, com "difere" em cada linha e o aviso de alvos diferentes.
No celular cabe numa linha por item, sem rolagem lateral.

**Base alterada**: a assinatura da base (classe, origem, trilha, atributos,
graus, escolhas, regras opcionais, progressão, afinidade, equipamento) não
inclui dano, cargas, condições nem notas. Se mudar, aparece "A ficha mudou
desde este plano" com **Atualizar base** (prévia do que muda). Uma regra de
evolução trocada (por exemplo, Sobrevivente → agente) pede revisão, sem
conversão.

### Aplicação automática

**Ativar aplicação automática** grava na ficha só `ordem.ramificacao`
(`planoId`, `nomePlano`, `tipo`, `processado` = a progressão de partida,
`recibos`, `pendentes`, `ultimoResumo`, `pausado`). Ativar **não concede
nada**. Uma ficha tem um plano ativo por vez. Trocar de plano mostra o que
muda, e desativar, trocar ou excluir cancela só as escolhas futuras.

O gatilho é **só um avanço real** da progressão (NEX, nível, PP, estágio)
pelo caminho normal. As vagas que passaram a existir desde `processado` são
processadas **em ordem**: 40% → 50% faz 45% antes de 50%. Cada uma é
**conferida de novo** pela Progressão (incluindo a aquisição real de
ritual):

- a mesma opção já está na ficha: **atendida**;
- outra opção já está lá: fica a da ficha, como **conflito**;
- não fecha agora: **bloqueada**, com o motivo, sem substituto. As
  independentes entram;
- sem decisão no plano: a vaga fica aberta na Progressão, como sempre.

O que entra recebe `procedencia` ("Plano Mais rituais (aplicação automática,
NEX 40%)"), que aparece na lista de escolhas. Cada vaga tem um **recibo**
`planoId|vaga` (opId `ram:<chave>`): repetir, recarregar, abrir duas abas,
perder a resposta, o NEX cair e voltar ao mesmo marco ou corrigir à mão
nunca concede de novo nem sobrescreve. As escolhas, os recibos e o novo
`processado` sobem numa gravação só da ficha, protegida pela revisão dela.

Roda no navegador do **dono**: depois de `aoMudarOrdem` (com uma folga para
quem digita) e na abertura da ficha. Se o Mestre subiu o NEX, a mudança dele
fica conservada e o plano é aplicado na **primeira abertura do dono**. O
painel mostra o plano ativo, o próximo marco real (com quantas escolhas
estão planejadas), a última aplicação e os pendentes. Há também **Retomar
aplicação**, **Revisar escolhas já liberadas** (plano ativado depois do
marco), **Revisar plano** e **Desativar**. Os dois primeiros mostram antes,
numa cópia, o que entraria.

Um trilho que muda (agente ↔ sobrevivente, regra de patentes) **pausa** o
plano, com as escolhas guardadas.

### Armazenamento e permissões

Os planos ficam no servidor, numa aba própria (`PLANOS_EVOLUCAO`, uma linha
por personagem, `rev` + `opsJson`). Não são fichas e não entram na
sincronia normal: a tela pede a lista ao abrir o planejador e, com um plano
ativo, quando a progressão avança. **Salvar plano não grava a ficha nem muda
a revisão dela.**

As cópias de ritual vão como **referência** (id, id do catálogo, elemento) e
são refeitas pelo catálogo ao abrir, com o mesmo id. Um ritual que saiu do
catálogo ativo (suplemento desligado) fica em Revisar.

Só o **dono** lê e grava (`exigeDono`, conferido no servidor). Mestre,
Editor e Leitor recebem `sem_permissao`, e quem não alcança a ficha recebe
`nao_encontrado`. Excluir a ficha apaga os planos.

### Limites conhecidos

- Os marcos de NEX & Experiência aparecem na ordem do motor (nível, depois
  exposição, no mesmo degrau). Não dá para reordenar à mão; na mesa, cada
  eixo dispara quando sobe.
- O servidor confere a forma dos planos, não as regras: elas são
  conferidas no navegador ao planejar e de novo ao aplicar.

### Validação v9.5

Automática: `testes/executar-ramificacao.js` (novo, 64) cobre:

- o Ocultista de 35% → 50% com "Mais rituais" e "Mais resistente", com a
  projeção igual à ficha real com as mesmas escolhas;
- o Revisar em cadeia e o alvo menor e maior;
- a aplicação a 40% só, o salto a 50%, o repetir, o NEX que cai e volta, o
  conflito, a mesma escolha já feita, o requisito quebrado, a troca de
  plano, a desativação, o plano atrasado e a recarga;
- NEX & Experiência (só nível, só exposição, juntos, ordem inversa);
- patentes (abaixo de 50 PP, cruzar, promoção dupla, perda de PP);
- Sobrevivente e a transição para agente, e Mundano;
- a base alterada e o armazenamento enxuto, com o suplemento desligado e
  religado.

`testes/ramificacao-backend.js`: só o dono, Mestre, Editor e Leitor
recusados, rev, opId repetido, limite, tamanho, campos estranhos e excluir a
ficha.

Na interface (servidor local, contas sintéticas):

- os dois planos criados, uma escolha trocada, comparados, salvos e
  conferidos depois de recarregar, com a ficha intacta (revisão 1);
- a ativação sem conceder nada;
- o NEX a 40% aplicando só o ritual de 40%;
- o Mestre subindo o NEX a 50% sem ver o painel, e o plano aplicado na
  abertura da dona, sem duplicar o ritual;
- a procedência na lista;
- o celular (abas, sem rolagem lateral), Legacy e Modern20.

### Publicar a v9.5

Servidor: troque **`Dados.gs`**, **`Ordem.gs`**, **`Codigo.gs`** e
**`Sistemas.gs`**, **rode `setupRama()`** (cria a aba `PLANOS_EVOLUCAO`) e crie
uma versão nova da implantação. Sem `setupRama`, salvar um plano responde
`instalacao_incompleta`, e a tela avisa sem perder o rascunho. Site:
`js/ordem/ramificacao.js`, `js/ordem/telas/ficha-ramificacao.js`,
`js/ordem/telas/ficha-ordem.js`, `js/ordem/progressao.js`,
`js/ordem/regras.js`, `js/paginas/ficha.js`, `js/api.js`, `ficha/index.html`,
`css/ficha.css`, `css/modern20/ficha.css` e `js/versao.js`.
