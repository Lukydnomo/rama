# Estilo da interface: Legacy e Modern20 (v2.49)

O R.A.M.A. tem dois estilos de interface, à escolha de cada conta:

- **Modern20** — a identidade nova, à escolha no Perfil.
  Ferramenta de mesa: letra de leitura (a sem serifa do sistema), números com
  algarismos de largura fixa, cantos leves, superfícies separadas por traço
  discreto, sombra só no que flutua, cor com função (recurso, estado, destaque).
- **Legacy** — a aparência da v2.48.4, exatamente: fonte pixel, caixa-alta,
  traço fino, seleção invertida e o véu de tela antiga. É o padrão de quem
  ainda não escolheu (desde a v2.49.2; na v2.49.0 e na v2.49.1 era o Modern20).

O estilo é **linguagem visual**, não cor. Claro, Escuro, Sistema, os temas
personalizados da conta e o tema próprio de uma ficha continuam definindo as
cores nos dois estilos, pela mesma hierarquia de sempre (js/tema.js). A aparência
dos dados (temas de dados) é outra configuração, separada.

## Como trocar

Perfil → lápis ao lado do avatar ("Tema e estilo do site") → seção **Estilo da
interface**, no alto do editor. É o único lugar: a aparência inteira (tema,
estilo e efeito) mora no editor, sem botão repetido em Exibição (v2.49.1). Cada
opção tem uma miniatura que desenha o próprio estilo e o selo "Selecionado".

Debaixo do Legacy fica o interruptor **Efeito de tela antiga** (linhas e
vinheta). É deste aparelho, não da conta (`rama.pref.efeitos`), e só aparece no
Legacy; a miniatura do Legacy acompanha. Ele segue o editor como o resto: mostra
na hora, **Salvar tema** guarda, **Cancelar** desfaz. Mudar só o efeito não faz
pedido nenhum ao servidor. O atalho "Ligar/Desligar efeitos" do menu da conta
continua.

Escolher mostra a **prévia** na página inteira, com o editor aberto. **Salvar
tema** grava a preferência na conta; **Cancelar**, Esc ou o X devolvem o estilo
confirmado. Só o que mudou é gravado: trocar apenas o estilo não regrava tema
nem lista de temas.

## Onde a preferência mora

| Onde | O quê |
|---|---|
| Planilha | `PERFIS.preferenciasJson.estiloInterface`: `"legacy"` ou `"modern20"`; ausente vale `"legacy"` |
| Sessão | `login`, `sessao` e `ler_perfil` devolvem `preferencias.estiloInterface` |
| Navegador | `rama.interface.<userId>`: cópia **por conta**, só para pintar antes da sessão responder |

- `js/interface.js` roda no `<head>` de toda página, logo depois de `tema.js`
  e antes das folhas: lê a conta guardada e o cache dela e põe
  `data-interface` no `<html>` antes da primeira pintura. Sem conta, sem cache
  ou com valor desconhecido, vale Legacy.
- `auth.js` sincroniza a cada login e retomada; sair volta ao padrão sem apagar
  o cache da conta. Trocar de conta nunca herda o estilo da anterior.
- Cada pessoa vê o **próprio** estilo: abrir a ficha ou a campanha de outra
  conta (editor, leitor, mestre, a ficha embutida no combate) não troca nada.
- Salvar segue o desenho das outras preferências: otimista na tela, um pedido
  por vez, só a última escolha vai, resposta antiga não passa por cima da nova,
  falha não vira "salvo" (a tela e o cache voltam ao estilo que a conta tem).
  Servidor anterior à v2.49 recusa a chave (`dados_invalidos`): a escolha fica
  no aparelho e o estado diz `local`.
- Outra aba da mesma conta acompanha pelo evento `storage`.

## Como os estilos convivem sem vazar

1. **O Legacy não foi tocado.** `css/tokens.css`, `base.css`, `componentes.css`,
   `layout.css`, `home.css`, `ficha.css` e `campanha.css` são os da v2.48.4. Um
   teste confere que nenhuma delas menciona `data-interface` nem `modern20`.
2. **O Modern20 é uma camada.** `css/modern20/` tem uma folha par para cada
   folha do Legacy, carregada **logo depois dela** em cada página. Toda regra
   mora dentro de `:root[data-interface="modern20"]` — com `:where()`, sem peso
   de especificidade, nas folhas de componente. Fora disso, só `@keyframes`
   com prefixo `m20-`. Um teste lê as folhas e recusa qualquer regra solta e
   qualquer `!important`.
3. **Por que a ordem e o `:where()` importam.** A regra do Modern20 empata em
   especificidade com a do Legacy que ela redesenha e vence por vir depois. Um
   modificador do Legacy numa folha seguinte (o traço vermelho de
   `.ordem-poder--suspensa`, em ficha.css, sobre o `.recolhivel` de
   componentes.css) continua vencendo o componente de base do Modern20 — a
   forma de cada estado é a mesma nos dois estilos.
4. **Regra de escrita:** num componente que tem modificadores de borda ou de
   fundo no Legacy (`.recolhivel`, `.r-etiqueta`, `.bib-item`, `.condicao`,
   `.efeito`…), o Modern20 não usa o atalho `border:` e não troca a cor da
   borda; muda canto, espaçamento e letra. Quando troca uma propriedade que um
   modificador da MESMA folha também usa, ele declara o modificador de novo,
   logo abaixo (`.r-botao--perigo`, `.rolagem--critico`, `.tema-opcao--marcada`).
5. **Cores derivadas por contexto.** Os tons `--m20-*` (borda suave, realce,
   seleção suave, sombras) são misturas dos papéis do tema, declaradas no
   `<html>` e em todo `[data-tema-contexto]` (a janela do editor, a caixa de
   prévia) — para a mistura sair das cores daquele contexto. `--fundo-*` (que
   pode ser gradiente) só entra em `background`, nunca em `color-mix`.
6. **A estrutura é uma só.** O HTML que js/ui.js e as páginas montam é o mesmo
   nos dois estilos; o Modern20 não depende de classe nova. Única adição:
   `data-recurso` no recurso da ficha de Ordem (pv, pe, san, pd), que o Legacy
   não lê.

### O cabeçalho no Modern20

No desktop é uma barra só — marca, seções, espaço, agente e menu —, sem mudar o
HTML: a faixa interna vira `display: contents` e os filhos dela, junto da
`<nav>`, ficam na mesma linha. No celular a lista de seções volta a ser o painel
que o botão ☰ abre.

### Trocar com a página aberta

Só o atributo do `<html>` muda: nada é redesenhado, nenhuma consulta é feita,
nenhuma ficha é marcada como alterada. Antes de trocar, `interface.js` guarda o
que está no alto da página (ignorando janelas e avisos fixos) e, se o foco está
numa janela que rola, a posição dele; depois corrige as duas rolagens. Janelas,
avisos e notificações abertos recebem `.interface-entrou` e não repetem a
animação de entrada.

## Densidade — Confortável ou Compacta (v5.2)

Uma preferência à parte do estilo, das cores e do tamanho: **Perfil → Exibição →
Densidade**. Confortável é a apresentação de sempre e o padrão de quem nunca
escolheu; Compacta aproxima painéis, listas e seções para caber mais informação.

| | Estilo (Legacy/Modern20) | Densidade |
|---|---|---|
| o que muda | a linguagem visual | o espaço entre as coisas |
| onde mora | na conta (cache por conta) | só neste aparelho (`rama.pref.densidade`) |
| atributo | `data-interface` | `data-densidade` |
| quem aplica | `js/interface.js`, no `<head>` | `js/densidade.js`, no `<head>`, logo depois |
| folhas | `css/modern20/*.css` | `css/densidade.css` + `css/modern20/densidade.css`, por último |

- **Antes da primeira pintura**: o atributo entra no `<html>` antes das folhas,
  em todas as páginas; nada abre numa densidade e salta para a outra.
- **Trocar é só o atributo**: nenhum pedido ao servidor, nenhuma gravação de
  ficha, nada redesenhado. Campos preenchidos, alterações não salvas, filtros,
  abas, seções abertas e o foco ficam; o lugar na página é devolvido como na
  troca de estilo (`RAMAInterface.guardarLugar` / `voltarAoLugar`). Outra aba do
  mesmo navegador acompanha.
- **O que compacta**: margens internas de painéis, cartões, recolhíveis e
  janelas; distância entre seções (`.pilha`, `.grade`, corpo da página); altura
  das linhas (perícias, tabela de perícias de Ordem, registros da lista,
  rolagens, combate); cabeçalhos, abas, filtros, botões e campos; e os
  componentes de cada sistema (Ordem, Oblívio, Vampiro, mesa da campanha).
- **O que não muda**: letra (nada de `zoom`, `transform` ou fonte menor), a
  entrelinha dos textos longos, os tokens de espaço `--e1…--e8` e nenhuma função
  some ou passa a pedir um clique a mais.
- **Alvo de toque**: `--alvo-toque` cai de 40 para 32 px **só com ponteiro fino**
  (`@media (pointer: fine)`); no celular e em telas de toque continua 40.
- **Modern20**: a mesma base, mais o que ele desenha diferente (título do painel
  dentro da grade, folga maior das janelas) em `css/modern20/densidade.css`.
- **Conferência no navegador**: `testes/medir-densidade.js` percorre as abas da
  página aberta nas duas densidades e nos dois estilos e devolve a altura de cada
  aba, elementos que passam da largura e margens indevidas em grades.

## Movimento no Modern20 (v9.17)

Uma linguagem só de movimento, com a mesma família de durações e curvas em
toda a camada. O Legacy não muda: tudo abaixo vale com
`data-interface="modern20"`, e com `prefers-reduced-motion` todo estado chega
na hora (inclusive se a preferência mudar com a página aberta).

### Tokens (`css/modern20/tokens.css`)

| Token | Valor | Uso |
|---|---|---|
| `--m20-mov-toque` | 100 ms | pressionar, marcar, responder a um controle |
| `--m20-mov-estado` | 150 ms | hover, foco, mudança pequena de estado, saída de janela e aviso |
| `--m20-mov-navegar` | 200 ms | abas, menus, recolhíveis, indicadores, troca de etapa |
| `--m20-mov-janela` | 240 ms | entrada de janela, folha, aviso |
| `--m20-mov-especial` | 340 ms | apresentação (novidades da versão, abertura da Home) |
| `--m20-curva-sair` | `cubic-bezier(0.16, 1, 0.3, 1)` | entrada (desacelera, chega macio) |
| `--m20-curva-mover` | `cubic-bezier(0.3, 0, 0, 1)` | deslocamento e indicadores |
| `--m20-curva-fechar` | `cubic-bezier(0.4, 0, 1, 1)` | saída (acelera, sai sem pedir atenção) |
| `--m20-desloc-curto` / `--m20-desloc` / `--m20-desloc-folha` | 4 / 8 / 32 px | distâncias |
| `--m20-pressao` | 0.97 | a escala ao pressionar (propriedade `scale`) |
| `--m20-inclinacao` | 6 | graus máximos da capa sob o mouse |

`--tempo-seco`, `--tempo-curto`, `--tempo-medio` e `--curva` (os do Legacy,
usados em toda transição antiga) apontam para os degraus acima no Modern20. Com
movimento reduzido, os cinco degraus valem 0, a pressão vale 1 e a inclinação
0 — dentro do próprio bloco do Modern20, porque a regra do Legacy (em `:root`)
perderia para ele.

### Regras de escrita

- Só `transform`, `scale`, `translate`, `rotate` e `opacity` no que se move
  (a altura dos recolhíveis e a largura das barras são as exceções medidas).
- A pressão e a inclinação usam as propriedades individuais `scale` e
  `rotate`: compõem com o `transform` que o elemento já tem (capas, arraste,
  indicadores) em vez de sobrescrevê-lo.
- Keyframes novos com prefixo `m20-`, regras dentro de
  `:where(:root[data-interface="modern20"])` (o teste de tema confere).
- Nada contínuo e decorativo: o que pulsa é estado (salvando, sincronizando,
  carregando). Nada de balanço em controle de formulário, zoom grande ou texto
  animado durante a leitura.
- Hover só com `(hover: hover) and (pointer: fine)`; no toque, a pressão.

### O módulo (`js/movimento.js`, `RAMAMovimento`)

Carregado em toda página antes de `js/ui.js`. Todas as funções aplicam o estado
final na hora (e devolvem promessa resolvida) no Legacy, com movimento reduzido
ou sem a Web Animations API.

| Função | Para quê |
|---|---|
| `entrar(el, { de })` | o conteúdo que acabou de ser trocado (`de`: baixo, direita, esquerda, nada) |
| `altura(el, abrir, { ate, aoFim })` | abrir e fechar medindo a altura; nenhuma altura fixa fica no fim |
| `sair(el)` | saída antes de remover |
| `destacar(el)` | um valor que mudou (fundo breve; o número já está certo) |
| `lembrar(raiz)` / `continuar(raiz, foto)` | barras e números que atravessam um redesenho, da largura antiga à nova |
| `flip(itens, mudar)` | reposicionar poucos itens (até 40) |
| `rearranjar(raiz, mudar, { seletor, chave, pilula })` | trocar o arranjo da tela inteira (v9.18.9, exibição de Personagens): cada elemento com a mesma chave desliza com mola do lugar antigo ao novo; o novo surge; a pílula do seletor segmentado corre |
| `apresentar(lista)` | primeira apresentação: os 8 primeiros em escada de no máximo 160 ms, uma vez por lista |
| `animar(el, canal, quadros, opcoes)` | o núcleo: um canal por propósito |
| `pararTudo()` | estado final em tudo (troca de estilo, preferência mudando) |

**Interrompível:** cada elemento tem canais (`entrada`, `altura`, `abas`…); um
movimento novo no mesmo canal cancela o anterior e parte do estado de agora.
**Uma vez só:** toda promessa resolve uma vez — no fim, no cancelamento ou num
prazo (duração + 120 ms) — e nenhuma função depende de um evento que talvez não
venha (`animationend`, `onfinish`). **Apresentação, nunca dado:** o módulo não
grava, não pede ao servidor e não decide sucesso; um teste confere.

### Sem pedir nada à tela (delegação de evento)

Três comportamentos ouvem o gesto da pessoa no documento — sem observar
mutações — e só agem no Modern20 com movimento liberado:

- **Abas** (`.r-abas`, `[role=tablist]`): no clique, guarda onde estava a aba
  selecionada; no fim da propagação (a tela já trocou — às vezes redesenhando a
  lista inteira, achada pelo lugar), um traço desliza da posição antiga à nova
  e o painel da aba (`aria-controls`) entra. Clicar de novo no meio parte de
  onde o traço está. O Perfil e as pastas laterais têm indicador próprio,
  persistente, com transição CSS (interrompível por natureza); a troca de pasta
  agora parte da posição visual do indicador, não do último destino.
- **`<details>`**: abrir cresce a altura (open na hora); fechar encolhe e o
  `open` cai no fim; clicar no meio inverte. `aria-expanded` acompanha a
  intenção, na hora, e a seta segue ele. Desligar num trecho:
  `data-sem-movimento`. Restaurar o estado depois de um redesenho
  (`devolverTela` da ficha) muda `open` direto, sem animar.
- **Capas** (`.capa-sistema`): inclinação leve sob o mouse, em `rotate`, com a
  perspectiva no pai; volta ao repouso ao sair.

### Pontos de integração nas telas

| Onde | O quê |
|---|---|
| `RAMAUI.modal` | entrada de fundo e janela juntos; saída de toda janela (fundo `.r-fundo--saindo` sem clique na hora, removido por prazo). Pilha, foco, rolagem e `aoFechar` seguem imediatos e únicos; janelas empilhadas e a confirmação de clique fora continuam iguais |
| `RAMAUI.aviso` | entrada e saída curtas (remoção por prazo, fechar duas vezes é inofensivo) |
| `RAMAUI.menu` | surge do gatilho (`transform-origin` no canto do lado aberto) |
| `RAMAUI.ocupar` | largura segura (já existia), a esteira aparece com fade; depois da resposta, `.r-botao--concluido` ou `--falhou` por 900 ms, só se a resposta disser `ok` |
| barra de atividade e selo | a barra continua acendendo na hora; o selo de segundo plano e a tela de carregamento só aparecem depois de ~200 ms (sem pisca-pisca) |
| Perfil | troca de seção e blocos que abrem pelo `entrar` |
| Personagens / Campanhas | troca de pasta pelo `entrar`; primeira apresentação da lista pelo `apresentar` |
| Ficha | `atualizar` lembra e continua barras e números; o ajuste manual destaca o número do resumo; as barras deslizam por transição de largura |
| Criação de Ordem e importação do CRIS | só a troca de etapa (e de seção, no CRIS) anima: avançar entra da direita, voltar da esquerda; recalcular não anima |
| Home e novidades | abertura em escada curta; o aviso de versão nova usa `--m20-mov-especial` |
| Troca de estilo | `interface.js` chama `pararTudo()` e marca só o que está à vista com `.interface-entrou` |

Para uma tela nova: use os componentes de `js/ui.js` (já animam), chame
`RAMAMovimento.entrar(area)` só na navegação explícita e nunca numa atualização
de dados ou de segundo plano, e use os tokens em qualquer transição CSS.

## Skeleton Loading exclusivo do Modern20 (v9.19.0)

Enquanto o conteúdo de uma área ainda não chegou, o Modern20 mostra um
esqueleto da tela que vai ocupá-la — retratos, capas, títulos, linhas,
cartões, recursos e seções — em vez de marca, mensagem e barra. **O Legacy não
muda:** `RAMAUI.carregando` devolve lá exatamente a estrutura de sempre, com ou
sem opções, e o mesmo vale enquanto a interface ainda não foi identificada.

### A chamada

`RAMAUI.carregando(mensagem, opcoes)` — a mensagem continua sendo a de antes
(no Modern20 ela vira o texto do `role="status"`, só para leitor de tela). A
forma vem SEMPRE das opções, nunca do texto:

| Forma | Para quê | Opções úteis |
|---|---|---|
| `lista` | personagens, catálogos, bibliotecas, histórico, acessos | `retrato` (`true`, `false`, `"quadrado"`), `linhas`, `etiquetas`, `plana` (linhas sem cartão), `faixa` (pastas em abas), `lateral` (pastas laterais), `filtros`, `lado` |
| `cartoes` | campanhas, pacotes | `capa` (`true`, `false`, `"livro"`), `proporcao` |
| `icones` | Personagens em Ícones, no celular | — |
| `ficha` | a ficha de um personagem | `sistema` (recursos e atributos dele; sem sistema, neutra), `recursos`, `atributos`, `abas`, `secoes` |
| `painel` | página de campanha, painéis de mesa dentro da ficha, ficha de criatura | `abas`, `secoes`, `linhas` |
| `mesa` | mesas dos sistemas e combate | `recursos` (barras por participante), `abas` |
| `retratos` | biblioteca de retratos e imagens | `proporcao` |
| `relatorio` | Perfil (identificação e grupos de configuração) | `cabeca`, `linhas` |
| `imagem` | uma imagem que chega depois (capa, documento) | — |
| `blocos` | o padrão sem forma: linhas neutras | — |

Comuns a todas: `quantidade` ou `tamanho` (`"curto"`, `"medio"`, `"grande"`),
com no máximo 12 repetições. `legado: function () { return elemento; }` mantém,
no Legacy, o placeholder próprio de uma tela (o texto "Carregando capa…", por
exemplo) — ele só ganha a classe-marcador `.r-pendente`, sem estilo.

As primitivas ficam em `RAMAUI.esqueleto` (`linha`, `bloco`, `retrato`, `capa`,
`etiqueta`, `cartao`, `compor`); as formas são composições delas. As formas de
ficha por sistema estão em `RAMAUI.esqueleto.ficha`.

### Ciclo de vida

- **Aparece sem piscar:** o `.r-carregando` do Modern20 já entra com ~160 ms de
  atraso; uma resposta mais rápida nem mostra o esqueleto. Nada espera a
  animação para mostrar dados.
- **Chega com transição curta:** quando o conteúdo entra por `U.trocar` no pai
  do esqueleto (o caminho de todas as telas), o que ocupou o lugar dele aparece
  com opacidade (`RAMAMovimento`, `--m20-mov-estado`) — só se o esqueleto chegou
  a aparecer. `U.trocar` continua síncrono.
- **Troca de estilo com a tela carregando:** `interface.js` chama
  `RAMAUI.readaptarCarregamentos()`; o MESMO nó troca de apresentação (a
  consulta segue, referências continuam válidas, nada é ouvido de novo). O
  placeholder próprio (`legado`) é trocado no lugar. A abertura protegida faz o
  mesmo.
- **Sem timers nem ouvintes:** o brilho é uma animação de CSS (`transform`,
  `m20-esq-brilho`); o esqueleto sai junto com o nó. Vazio e erro substituem o
  esqueleto como antes; a resposta antiga que não vale mais continua sendo
  descartada pelas telas.
- **Acessibilidade:** `role="status"` e `aria-busy="true"` no esqueleto, uma
  mensagem curta por região, desenhos com `aria-hidden` e `inert` (nada
  recebe foco nem clique).
- **Movimento reduzido:** esqueleto parado, sem brilho nem entrada.

### Onde está

Abertura protegida (neutra: nada da conta antes da sessão conferida),
Personagens (Abas com a faixa de pastas, Pastas laterais e Ícones),
compartilhados, Campanhas, página da campanha e as seções dela (histórico,
documentos com imagem, notas, agentes, mesa, combate), fichas (com o sistema
que a lista deixou de dica em `sessionStorage`, só a forma; sem dica, neutra),
mesas de Ordem, Ordem II, Oblívio, Vampiro, Goblins, BRUTAL e Tormenta20,
painéis de mesa dentro das fichas, Catálogo, biblioteca de criaturas,
Homebrew e pacotes, bibliotecas das fichas (habilidades, rituais, itens,
Homebrew, classes e trilhas), Perfil (e a coleção, cujo esqueleto já existia e
ganhou o brilho), compartilhamento, temas da conta, biblioteca de retratos e
as imagens que chegam depois.

**Imagens que chegam depois** (`RAMAImagens.aplicar`): a caixa ganha
`.r-imagem--carregando` (o espaço reservado brilha, depois de ~160 ms),
nenhuma classe quando a imagem é ausente (as iniciais de sempre) e
`.r-imagem--falhou` quando ela não abre (moldura tracejada). Só o Modern20
desenha essas classes; o carregamento sob demanda continua igual.

**O que não vira esqueleto:** `RAMAUI.ocupar` (salvar, criar, excluir,
enviar, importar continuam dizendo a ação no botão, com largura segura),
uploads com progresso, a barra de atividade e o selo de sincronização, e as
atualizações em segundo plano — conteúdo válido fica na tela.

## Inventário de telas e componentes

Levantado antes do redesenho, a partir das páginas (`js/paginas/*`) e das seções
das folhas. Cada linha diz onde o Modern20 a trata.

| Área | Componentes | Modern20 |
|---|---|---|
| Entrada e sessão | portão (usuário, senha com olho), tela cheia de carregamento | layout.css |
| Home | abertura, seções com miniaturas, "como começar", aviso | home.css |
| Casca | cabeçalho, marca, navegação (desktop e celular), agente, menu da conta (com ícones; Feedback desde a v2.50), rodapé, versão, histórico de versões | layout.css |
| Feedback (v2.50) | janela do menu da conta: três tipos em cartões (uma coluna no celular), campos com contador, detalhes do bug, nome opcional, faixa de falha com "Tentar novamente", confirmação de sucesso | componentes.css |
| Personagens | título e trilha, abas Meus/Compartilhados, pastas em abas e em ícones, painel da pasta, filtros, busca, sistema, agrupar, lista de registros, alça de arrastar, estados (pasta, compartilhado, papel) | layout.css, componentes.css |
| Criação de ficha | tipo de ficha (cartões com a capa do sistema, v3.0), criação guiada de Ordem (trilha de passos, atributos, opções, perícias), revisão | componentes.css |
| Sistema da campanha (v4.0) | escolha do sistema na criação da campanha (rádios com a capa e o que a mesa oferece, `.escolha-sistema`), painel "Sistema da campanha" em Configurações (o atual com a capa, a troca e a janela de impactos, `.sistema-atual`, `.impacto-troca`), sistema na lista de campanhas, no topo da campanha e no seletor de campanha da ficha | componentes.css |
| Oblívio (v3.0) | capa do sistema (`js/capa-sistema.js`: volume com lombada, três tamanhos, lombada desenhada sem capa), criação guiada em 8 etapas (Papéis em cartões, atributos, especializações, corpo, catálogo de equipamentos, Motivação, revisão), bloco da Persona (fixos, mutáveis, Coragem, pendências, faixa "Na mesa"), diagrama do corpo (figura `aria-hidden` + lista de botões com tudo em texto), Conhecimentos, ataque com resolução pendente e dados por resultado, inventário, habilidades, Mazelas, aba Oblívio da campanha (Ordem de Ação, fileiras, Farol, Ameaças, mapa do Buraco) | oblivio.css |
| Vampiro (v5.0) | criação guiada em 12 etapas (trilha de passos com ✓ e "pendente", cartões de clã, idade e Predador, pontos ●○ clicáveis, contadores ao vivo, pendências por etapa), bloco superior (trilhas de Vitalidade e Força de Vontade com "/" e "X", Fome em losangos, Humanidade com Máculas tracejadas, Potência), atributos e Habilidades com composição, janela da rolagem pendente (dado de Fome em losango com símbolo ◆ ☠ ✶ e rótulo de leitor; seleção de até 3 dados para rerrolar), Disciplinas e poderes em cartões, Sangue, Humanidade, Vantagens, Experiência, Equipamento, aba Crônica da campanha (tempo, fichas, coterie e Domínio, PNs, Mapa de Relacionamentos em lista, conflitos, testes estendidos, Memoriam, favores, registro) | vampiro.css |
| Ficha (todas) | topo fixo, modo Normal/Edição, estado do salvamento, avisos (edição, mestre, acesso, leitura), foto, abas | ficha.css |
| Ficha universal | atributos, status com barra, defesa, perícias, edição de perícia, inventário, anotações (árvore e editor), habilidades (árvore e pastas) | ficha.css, componentes.css |
| Ficha de Ordem (v6.4: ver FICHA-ORDEM.md) | bloco compacto com resumo de sessão, tira em grupos, Geral em duas colunas, pentagrama de atributos, ataques e perícias rápidas na Geral, condições críticas no topo, atributos, recursos (PV, PE, SAN, PD com cor), calculados e composição, perícias em tabela (desktop e celular), progressão, pendências e escolhas, poderes, condições e efeitos, consumo, carga, aba Regras (categorias, busca, filtro, interruptor), Arquivos Secretos 2–5, aliados | ficha.css, componentes.css |
| Rituais e inventário | cartões de ritual (marcas, conjuração, formas, complemento), danos, versões, itens e armas, biblioteca "Da biblioteca" | componentes.css, ficha.css |
| Campanhas | lista, capa (com e sem imagem), mesa (participantes), personagens da mesa (cartões, recursos, estatísticas, condições, ocultação), rolagens (histórico, rolagem livre), documentos, notas, configurações | campanha.css |
| Combate | turno e rodada, pendências, linhas de iniciativa (vez, selecionada, pendente), recursos, condições, painel da ficha (iframe) e da criatura, gaveta no celular, Hexatombe, Hacking, Perigos (quando ligados) | campanha.css, componentes.css |
| Homebrew e catálogos | biblioteca, ficha de criatura; o catálogo oficial mora na página Criaturas (v6.6) | componentes.css |
| Ficha de criatura por sistema (v6.7) | Ordem (criatura-painel.js): destaques, colunas números × ações, forma vista na consulta; Oblívio, Vampiro (compacto e completo) e Goblins (js/fichas-nativas.js); Universal inalterada | componentes.css |
| Criaturas (v6.6) | seletor de sistema, Catálogo (a biblioteca embutida em Ordem; catálogos nativos em Oblívio, Vampiro e Goblins) e Geradores (js/geradores-criaturas.js) | componentes.css |
| Portão: pedido de acesso (v6.6) | link abaixo do login, janela com campos e prévia (lado a lado no PC, embaixo no celular) | componentes.css |
| Perfil | identidade, recompensas e resgate, exibição (tema, estilo, tamanho, efeito), importação, sessão | componentes.css |
| Editores | editor de temas (escolhas, estilo da interface, personalizar, gradiente, contraste, prévia, exportar/importar), editor de imagem (palco, controles, GIF), importação do CRIS (tabela) | componentes.css, interface.css |
| Janelas e avisos | modal (e folha no celular), confirmação, pedir texto, menu suspenso, aviso passageiro, notificação de rolagem, barra de atividade, selo de sincronia, botão ocupado | componentes.css |
| Estados | vazio, carregando, erro de tela, leitura, desabilitado, foco, arraste (alvo, recusado) | componentes.css, base.css |

## Verificação

- `deno run --allow-read testes/executar-tema.js` — a preferência (padrão,
  cache por conta, sessão, salvar, falha, servidor antigo, escolhas rápidas,
  prévia, troca de conta, outra aba) e o isolamento das folhas (ordem nas
  páginas, folhas do Legacy intocadas, regras do Modern20 presas ao atributo,
  nenhum `!important`).
- `deno run --allow-read testes/executar-movimento.js` — o movimento (v9.17):
  nada anima no Legacy nem com movimento reduzido (também mudando no meio),
  interromper cancela o anterior no mesmo canal, cada fim roda uma vez (no
  fim, no cancelamento ou no prazo, sem depender do evento), parar tudo limpa o
  registro, a altura não deixa valor fixo, a primeira apresentação é limitada e
  única, e as folhas e telas usam os tokens, `scale` na pressão e prazos em vez
  de `animationend`. No navegador, `testes/janelas.html` roda a bateria de
  janelas nos dois estilos e confere a saída com movimento (uma vez, sem
  bloquear, removida por prazo). Desde a v9.19.0, também confere na fonte o
  Skeleton Loading: o Legacy montando marca, mensagem e barra, a forma vinda
  das opções em todo carregamento das telas, a abertura neutra, os estados de
  imagem e o movimento reduzido.
- `testes/esqueleto.html` (navegador) — Skeleton Loading no DOM real: a
  estrutura do Legacy idêntica à de antes (com e sem opções, e sem interface
  identificada), o esqueleto acessível e limitado do Modern20, todas as formas
  sem texto decorativo, a ficha neutra e por sistema, a troca de estilo no
  mesmo nó, a concorrência entre regiões, vazio e erro substituindo o
  esqueleto e a transição só depois do esqueleto à vista. Embaixo, uma galeria
  das formas para conferir tema e densidade.
- `testes/tema-backend.js` (dentro de `executar-backend.js`) — o servidor
  aceita, devolve e recusa `estiloInterface`.
- `deno run --allow-read testes/executar-feedback.js` — a janela de Feedback
  tem estilo no Legacy sem regra de Modern20, o ajuste do Modern20 fica no escopo
  dele e as cores vêm só dos papéis do tema (claro, escuro e personalizados).
- **Sistema da campanha (v4.0):** criação e troca revisadas no navegador no
  Legacy e no Modern20, e a 375 px sem rolagem horizontal. A opção marcada se diz
  pelo rádio e pelo traço do cartão, nunca só pela cor.
- **Oblívio (v3.0):** `css/oblivio.css` (Legacy) e `css/modern20/oblivio.css`,
  revisados no navegador nos dois estilos e a 375 px (sem rolagem horizontal).
  Estado nunca só por cor: região esgotada riscada, prótese tracejada, ausente
  pontilhada, resultado do dado escrito e com traço lateral próprio.
- **Vampiro (v5.0):** `css/vampiro.css` (Legacy) e `css/modern20/vampiro.css`,
  revisados no navegador nos dois estilos e a 375 px (sem rolagem horizontal na
  ficha e na crônica). As cores vêm só dos tokens do tema (`--cor-elemento-sangue`
  na Fome, `--cor-vida`, `--cor-sanidade`); o vermelho fica reservado à Fome.
  Estado nunca só por cor: "/" Superficial, "X" Agravado, Mácula tracejada, dado
  de Fome em losango com símbolo e texto ("dado de Fome: 10, crítico de Fome"),
  `forced-colors` respeitado.
- **Densidade (v5.2):** `testes/executar-tema.js` confere o padrão, a escolha
  guardada já na abertura, valor desconhecido, troca sem pedido ao servidor, a
  outra aba, o carregamento no `<head>` e por último em toda página, e que a
  folha não usa zoom, transform, fonte nem tokens de espaço. No navegador
  (`testes/medir-densidade.js`): fichas de Ordem, Oblívio e Vampiro e as
  campanhas dos três, nos dois estilos — de 9% a 20% menos altura por aba na
  Compacta, sem transbordo nem margem indevida —, também a 375 px (toque: alvo
  de 40 px) e com escala 150%.
- **Regressão do Legacy:** a v2.48.4 servida lado a lado
  (`testes/servidor-local.js --site <pasta da v2.48.4>`) e, em cada página, a
  comparação dos estilos calculados de todos os elementos (55 propriedades e os
  pseudo-elementos) entre a versão nova em Legacy e a original.

## Limitações conhecidas

- O Modern20 usa as fontes do sistema (Inter, se instalada; senão Segoe UI,
  San Francisco, Roboto…). Nenhuma fonte é baixada: a letra muda um pouco de um
  aparelho para outro.
- O efeito de tela antiga (no editor, debaixo do Legacy) só aparece no Legacy.
- A ficha embutida no combate (iframe) acompanha a troca feita em outra aba pelo
  evento `storage`; a prévia do editor vale só na página do Perfil.
