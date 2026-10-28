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
| Oblívio (v3.0) | capa do sistema (`js/capa-sistema.js`: volume com lombada, três tamanhos, lombada desenhada sem capa), criação guiada em 8 etapas (Papéis em cartões, atributos, especializações, corpo, catálogo de equipamentos, Motivação, revisão), bloco da Persona (fixos, mutáveis, Coragem, pendências, faixa "Na mesa"), diagrama do corpo (figura `aria-hidden` + lista de botões com tudo em texto), Conhecimentos, ataque com resolução pendente e dados por resultado, inventário, habilidades, Mazelas, aba Oblívio da campanha (Ordem de Ação, fileiras, Farol, Ameaças, mapa do Buraco) | oblivio.css |
| Ficha (todas) | topo fixo, modo Normal/Edição, estado do salvamento, avisos (edição, mestre, acesso, leitura), foto, abas | ficha.css |
| Ficha universal | atributos, status com barra, defesa, perícias, edição de perícia, inventário, anotações (árvore e editor), habilidades (árvore e pastas) | ficha.css, componentes.css |
| Ficha de Ordem | atributos, recursos (PV, PE, SAN, PD com cor), calculados e composição, perícias em tabela (desktop e celular), progressão, pendências e escolhas, poderes, condições e efeitos, consumo, carga, aba Regras (categorias, busca, filtro, interruptor), Arquivos Secretos 2–5, aliados | ficha.css, componentes.css |
| Rituais e inventário | cartões de ritual (marcas, conjuração, formas, complemento), danos, versões, itens e armas, biblioteca "Da biblioteca" | componentes.css, ficha.css |
| Campanhas | lista, capa (com e sem imagem), mesa (participantes), personagens da mesa (cartões, recursos, estatísticas, condições, ocultação), rolagens (histórico, rolagem livre), documentos, notas, configurações | campanha.css |
| Combate | turno e rodada, pendências, linhas de iniciativa (vez, selecionada, pendente), recursos, condições, painel da ficha (iframe) e da criatura, gaveta no celular, Hexatombe, Hacking, Perigos (quando ligados) | campanha.css, componentes.css |
| Homebrew e catálogos | biblioteca, catálogo de criaturas (origens, filtros por elemento, retratos), ficha de criatura | componentes.css |
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
- `testes/tema-backend.js` (dentro de `executar-backend.js`) — o servidor
  aceita, devolve e recusa `estiloInterface`.
- `deno run --allow-read testes/executar-feedback.js` — a janela de Feedback
  tem estilo no Legacy sem regra de Modern20, o ajuste do Modern20 fica no escopo
  dele e as cores vêm só dos papéis do tema (claro, escuro e personalizados).
- **Oblívio (v3.0):** `css/oblivio.css` (Legacy) e `css/modern20/oblivio.css`,
  revisados no navegador nos dois estilos e a 375 px (sem rolagem horizontal).
  Estado nunca só por cor: região esgotada riscada, prótese tracejada, ausente
  pontilhada, resultado do dado escrito e com traço lateral próprio.
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
