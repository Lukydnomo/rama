/* =====================================================================
   R.A.M.A. — configuração pública
   ---------------------------------------------------------------------
   O ÚNICO arquivo do frontend que se edita ao publicar. Nada aqui é
   segredo: este código vai para o GitHub Pages e qualquer pessoa lê.

   Senha, hash, sal, ID da planilha e segredo de sessão ficam TODOS no
   Apps Script, em Script Properties. Se algum dia você sentir vontade
   de colar um deles aqui, a resposta é não — veja docs/API.md.
   ===================================================================== */

window.RAMA_CONFIG = {
   /* Endereço do Apps Script publicado como app da Web, terminando em /exec.
      Sem isto o sistema abre e avisa que não foi configurado. */
   API_URL: "https://script.google.com/macros/s/AKfycbyFwmvGkJY-T9uQftbu0UKw-jaENW3D1BNpYTwa5y1rldpnTsLAYRJdpLcF8FpZ1BUfTw/exec",

   /* Prazo de UMA tentativa ao falar com o servidor.

      O Apps Script hiberna: a primeira chamada depois de um tempo parado
      precisa subir o contêiner de execução e pode passar de meio minuto,
      enquanto as seguintes respondem na hora. É o motivo de "só a
      primeira vez dá erro".

      Leituras repetem sozinhas quando o prazo estoura, e a primeira
      tentativa é curta de propósito — ver o comentário em js/rede.js.
      Então este valor é o teto de CADA tentativa, não da operação
      inteira. Aumente se o seu Apps Script demorar muito a acordar. */
   TEMPO_LIMITE_MS: 30000,

   /* Espera entre alteração e envio. Junta digitação seguida num só POST
      sem a pessoa sentir atraso. */
   DEBOUNCE_MS: 400,

   /* Dias sem uso até esta máquina descartar a sessão por conta própria.
      O servidor conta o mesmo prazo e tem a palavra final — isto aqui só
      evita mandar um token que já sabemos vencido. */
   DIAS_SESSAO: 30,

   /* Lado da miniatura enviada para a planilha, em pixels. A foto original
      nunca sobe: 256 é o suficiente para o avatar e para a ficha. */
   LADO_FOTO: 256,

   /* Versão do formato dos arquivos de importação/exportação. */
   VERSAO_FORMATO: 1,
};
