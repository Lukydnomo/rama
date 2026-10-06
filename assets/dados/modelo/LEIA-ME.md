# Modelo de dados — R.A.M.A.

Kit técnico para preparar os assets de um **tema de dados** (o dado e o fundo das
notificações de rolagem). Ele não muda a organização das notificações: o cartão
continua sendo o do R.A.M.A., com o dado ao lado do resultado.

Todos os arquivos do dado têm tela de **1024 × 1024 px**, proporção 1:1, mesma
origem e alinhamento. Outras resoluções quadradas funcionam, desde que **todas as
camadas de uma versão tenham o mesmo tamanho**.

## Arquivos do kit

| Arquivo | Para quê |
|---|---|
| `base-dado.png` | a arte de baixo. Pode preencher o quadrado inteiro: o site aplica a máscara. |
| `mascara-d20.png` / `mascara-d20.svg` | branco opaco na silhueta, transparente fora. É máscara **alfa**: recorta, não aparece. A do site é `assets/dados/mascaras/d20-v1.svg`. |
| `camada-facetas.png` | detalhe transparente opcional (as arestas). Tire do tema se quiser só a silhueta. |
| `camada-detalhes-vazia.png` | camada 100% transparente para desenhar símbolos, brilhos e ornamentos. Parece vazia de propósito. |
| `guia-alinhamento.png` | contorno, eixos e área central. **Não entra na composição final.** |
| `modelo-editavel.svg` | os grupos (base, facetas, detalhes, guia) para editar. Oculte o guia e exporte a **página inteira**, nunca só o conteúdo selecionado. |
| `previa-dado.png` | a composição recortada, para conferência. Sem número. |
| `fundo-notificacao-exemplo.png` | exemplo de fundo (3200 × 1000). O fundo não precisa ser quadrado. |
| `tema-exemplo.json` | um tema no contrato do catálogo (`js/temas-dados.js`). |

## Ordem das camadas no site

Base → camadas com `recortar: true` (no mesmo grupo) → **máscara alfa no grupo** →
camadas com `recortar: false` por cima. As de fora do recorte continuam presas à
mesma tela quadrada: não vazam da caixa do ícone e não cobrem números nem botões.

## Fundo da notificação: zoom pela altura

Uma imagem inteira e contínua. Fator de escala = altura do cartão ÷ altura da
imagem: o topo da imagem fica no topo do cartão e a base na base; a largura segue
o mesmo fator. É `background-size: auto 100%`, sem repetir, com o alinhamento
horizontal do manifesto (`alinhamentoHorizontal`: 0 = esquerda, 0.5 = centro, 1 =
direita). Mais larga que o cartão, o excedente lateral some; mais estreita, a
cor `superficie` do tema aparece nas laterais. Nunca corta topo ou base, nunca
deforma, e a imagem não decide a altura do cartão — quando o cartão cresce
(parcelas, notas, botões), o zoom acompanha.

`veu` (opcional) é uma película de cor sobre o fundo, para o texto continuar
legível.

## Passo a passo

1. **Criar a arte a partir do modelo.** Abra `modelo-editavel.svg` (ou use as
   PNGs) e pinte base e detalhes em 1024 × 1024.
2. **Exportar mantendo proporção e alinhamento.** Cada camada como PNG (ou WebP)
   com transparência verdadeira, na tela inteira, sem recortar ao conteúdo — é o
   que mantém os detalhes no lugar. Sem números, rótulos ou o guia na arte.
3. **Adicionar ao projeto.** Uma pasta por tema e versão:
   `assets/dados/temas/<id>/v<versão>/` com `base.png`, as camadas, `fundo.png` e
   `previa.png` (a composição recortada, para listas). Versões são imutáveis: arte
   nova vai numa pasta `v2/`, e as rolagens antigas continuam com a `v1`.
4. **Registrar no catálogo.** Acrescente o tema em `BRUTO`, em
   `js/temas-dados.js`, no formato de `tema-exemplo.json` (id estável em
   minúsculas e hífen, versão, nome, descrição, prévia, base, máscara, camadas com
   `recortar` e `opacidade`, fundo, `ajusteFundo`, cores e véu). Rode
   `deno run --allow-read testes/executar-dados.js`: ele confere os arquivos e as
   telas.
5. **Cadastrar um código.** No editor do Apps Script, rode
   `cadastrarCodigo('MEU-CODIGO', ['<id>'], 'uma nota')`. O código não fica em
   texto em lugar nenhum: a planilha guarda o hash com o `RAMA_PEPPER` e um rótulo.
   Espaços, hífens, pontos, sublinhados e maiúsculas não importam
   (`meu codigo` = `MEU-CODIGO`); sobram de 4 a 40 letras e números.
6. **Atualizar frontend e backend.** Publique o site com o catálogo e os assets.
   No Apps Script, troque o `Codigo.gs` (ele leva uma cópia de
   `js/temas-dados.js` entre os marcadores `>>> js/temas-dados.js` e
   `<<< js/temas-dados.js`; o teste do backend confere que é idêntica) e crie uma
   nova versão da implantação. Um código só pode apontar para um tema que o
   `Codigo.gs` publicado conhece.
7. **Desativar um código.** `desativarCodigo('MEU-CODIGO')` para novos resgates;
   quem já resgatou continua com o tema. `reativarCodigo` volta atrás;
   `listarCodigos()` mostra rótulos, recompensas, estado e quantos resgates.

Os códigos reais moram só na configuração privada do backend — nunca no
repositório, no catálogo ou no site.
