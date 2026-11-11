/* =====================================================================
   R.A.M.A. — medidas de uma imagem estática, sem dependência (v7.2)
   ---------------------------------------------------------------------
   Lê só o cabeçalho de um PNG (IHDR), de um WebP (VP8, VP8L ou VP8X) ou
   de um SVG (viewBox) e devolve { formato, largura, altura, alfa }, ou
   null quando o arquivo não é nenhum dos três. Usado pelos testes dos
   símbolos dos rituais, das criaturas e dos temas de dados.
   ===================================================================== */

export function medirImagem(bytes) {
  const b = bytes;
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const texto = (i, n) => String.fromCharCode(...b.subarray(i, i + n));
  if (b.length > 25 && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v) && texto(12, 4) === "IHDR") {
    return { formato: "png", largura: dv.getUint32(16), altura: dv.getUint32(20), alfa: b[25] === 6 || b[25] === 4 };
  }
  if (b.length > 30 && texto(0, 4) === "RIFF" && texto(8, 4) === "WEBP") {
    const pedaco = texto(12, 4);
    if (pedaco === "VP8X") {
      return { formato: "webp", largura: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), altura: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)), alfa: (b[20] & 0x10) !== 0 };
    }
    if (pedaco === "VP8L" && b[20] === 0x2f) {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { formato: "webp", largura: (bits & 0x3fff) + 1, altura: ((bits >>> 14) & 0x3fff) + 1, alfa: ((bits >>> 28) & 1) === 1 };
    }
    if (pedaco === "VP8 ") {
      return { formato: "webp", largura: dv.getUint16(26, true) & 0x3fff, altura: dv.getUint16(28, true) & 0x3fff, alfa: false };
    }
    return null;
  }
  const s = new TextDecoder().decode(b.subarray(0, Math.min(b.length, 4096)));
  const m = /<svg[\s\S]*?viewBox="\s*0\s+0\s+([\d.]+)\s+([\d.]+)"/.exec(s);
  if (m) return { formato: "svg", largura: +m[1], altura: +m[2], alfa: true, svg: new TextDecoder().decode(b) };
  return null;
}
