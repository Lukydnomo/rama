# Ajuda e tutoriais

A aba **Ajuda** (`ajuda/`), o **tutorial inicial** obrigatório e os
**tutoriais por sistema**. Entrega em desenvolvimento — ver
[ENTREGA.md](ENTREGA.md).

## Onde mora cada coisa

| Arquivo | O quê |
|---|---|
| `js/ajuda/artigos.js` | Todos os artigos (guias por área, primeiros passos, perguntas frequentes, tutoriais por sistema), as fontes e a busca (`RAMAAjuda.buscar`). Um lugar só: a página Ajuda, o “Ajuda desta tela” e a etapa da Ajuda no tutorial inicial leem daqui. |
| `js/paginas/ajuda.js`, `ajuda/index.html`, `css/ajuda.css`, `css/modern20/ajuda.css` | A página Ajuda. `ajuda/?guia=<id>` abre um artigo; `ajuda/?busca=<texto>`, a busca. |
| `js/tutorial.js` | O motor das etapas (cartão, destaque do controle, trava de links do obrigatório, carregamento sob demanda). Incluído só na página da ficha. |
| `js/ajuda/tutorial-inicial.js` | As oito etapas do tutorial inicial. |
| `js/ajuda/tutoriais-sistemas.js` | Um percurso por sistema. |
| `js/ajuda/demos.js` | As fichas de exemplo: a Universal é montada no código; as dos sistemas vêm de `assets/ajuda/demos/<sistema>.json`. |
| `testes/gerar-demos-ajuda.js` | Gera os JSON das fichas de exemplo com os motores de cada sistema (as receitas dos testes). Rode de novo quando o schema da ficha ou um motor mudar. |

## A demonstração

`ficha/?tutorial=inicial` e `ficha/?demo=<sistema>` abrem a página da ficha de
verdade com uma ficha que só existe na página:

- `RAMAApi.modoDemonstracao(true)`: toda ação que não for leitura, `logout` ou
  `concluir_tutorial` volta com o erro local `demonstracao`, sem viajar;
- o salvador é o de sempre, com um envio que termina na própria página;
- o histórico da mesa não é ligado; Copiar não aparece; Compartilhar…
  aparece nas Opções da ficha só para explicar (não abre a janela);
- a ficha avisa o tutorial pelo evento `rama:demo` (`alterou`, `modo`, `aba`,
  `rolagem`), e expõe `RAMAFichaDemo` (aba, modo, trocar de aba);
- a prévia de aparência usa `definirPrevia` de interface, tema e densidade, e é
  desfeita ao sair da etapa.

Recarregar recomeça da primeira etapa, com ids novos.

## O tutorial obrigatório

- `RAMAApp.iniciar` desvia toda página (menos a ficha embutida, `semCasca`)
  para `ficha/?tutorial=inicial&voltar=<endereço pedido>` enquanto
  `RAMAAuth.tutorialPendente()`.
- Pendente = a sessão trouxe `tutorial.inicial` vazio. Sem o campo (servidor
  anterior), nada é exigido.
- No obrigatório não há Encerrar, Escape nem clique fora; links para outras
  páginas são segurados com uma explicação. Sair da conta continua no menu do
  agente; se a ficha de exemplo não abrir, a página explica e oferece
  recarregar, Feedback e sair.
- **Concluir tutorial** chama `concluir_tutorial`; só depois da confirmação
  aparecem os atalhos (incluindo “Continuar de onde eu vinha”, com o `voltar`
  conferido: só caminhos do próprio site). Falha: a etapa final fica, com
  “Tentar de novo”.
- Outras abas da mesma conta sabem da conclusão pelo `storage`
  (`rama.tutorial.concluido`).
- O aviso de novidades não abre na página do tutorial; abre na página seguinte,
  no fluxo de sempre.

A revisão (`&revisao=1`, Ajuda → Refazer tutorial inicial) tem Encerrar e não
grava nada.

## Fontes

Todo bloco de artigo tem `fonte`:

- `{ rama: true }` → “Funcionamento do RAMA” (interface e comportamento da
  plataforma; a Universal não ganha livro inventado);
- `{ livro, edicao, paginas }` → página **impressa**, conferida no catálogo do
  sistema ou em `docs/` (ORDEM-REGRAS, VAMPIRO, TORMENTA20, GOBLINS, OBLIVIO,
  BRUTAL, ORDEM2);
- sem página verificada: `{ livro, edicao, secao }` — o texto diz “sem página
  verificada”;
- `{ fa: true }` (conteúdo de fã) e `{ interpretacao: true }` (regra unificada
  ou leitura própria do RAMA) aparecem marcados.

Fontes sem página verificada hoje: *Ordem Paranormal — conteúdo oficial
avulso (Extras)* (Inventário em grade; o material não tem página), *Melhor
Amigo da Ordem* (suplemento de fã; citado pelo suplemento inteiro) e as regras
opcionais do *Sobrevivendo ao Horror* citadas em conjunto (cada regra tem a
página dela na aba Regras da ficha). Na busca e no teste
(`testes/executar-ajuda.js`), página estimada é recusada.

## Um sistema novo

1. Um artigo `tutorial-<id>` em `js/ajuda/artigos.js`, com a ação
   `ficha/?demo=<id>` e as fontes.
2. Um percurso em `js/ajuda/tutoriais-sistemas.js`, com uma etapa `teste`.
3. Uma receita em `testes/gerar-demos-ajuda.js` (o id em
   `SISTEMAS_COM_DEMO`, `js/ajuda/demos.js`) e rodar o gerador.
4. `testes/executar-ajuda.js` recusa sistema registrado sem os três.
