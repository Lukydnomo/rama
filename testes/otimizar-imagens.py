"""R.A.M.A. — PNG → WebP das imagens estáticas (v7.2)
-----------------------------------------------------------------------
    python testes/otimizar-imagens.py              mede e só relata
    python testes/otimizar-imagens.py --aplicar    grava os .webp e apaga os .png trocados
    python testes/otimizar-imagens.py --aplicar assets/rituais/op/cicatrizacao

Precisa de Pillow com WebP (pip install pillow). Depois de --aplicar,
rode `deno run --allow-read --allow-write testes/gerar-mapa-imagens.js`
para o código saber quais imagens continuam em PNG.

AS REGRAS
  Símbolos de ritual, máscaras e camadas/prévias dos temas de dados:
    WebP SEM PERDA (dimensões, transparência, cores e até o RGB sob o
    alfa zero idênticos — conferido pixel a pixel). Fica o PNG se o WebP
    não sair menor.
  Retratos e corpo inteiro das criaturas e fundos decorativos dos temas:
    começa pelo WebP sem perda. Se ele economizar menos de 30%, tenta
    qualidade 90 e depois 85 (alfa sem perda), comparando com o original
    no tamanho de exibição em tela de alta densidade (retrato 64 px →
    256 px; corpo inteiro e fundo na resolução da arte, até 500 px de
    altura no fundo), sobre fundo escuro e claro: PSNR >= 42 dB,
    99,9% dos pixels com diferença <= 14, média nas áreas escuras <= 1,5,
    99% das bordas <= 12 e alfa quase idêntico. Fica o menor arquivo que
    passa e que seja pelo menos 10% menor que o melhor arquivo sem perda
    (PNG ou WebP); senão fica o sem perda (o PNG, se ele for o menor).
"""
import io, os, sys, json, glob
from multiprocessing import Pool
import numpy as np
from PIL import Image

RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
PASTAS = ("assets/rituais", "assets/criaturas", "assets/dados")
GANHO_MINIMO_SEM_PERDA = 0.30
# Perda só vale a pena se o arquivo cair pelo menos 10% em relação ao melhor sem perda.
GANHO_MINIMO_COM_PERDA = 0.90


def categoria(rel):
    if rel.startswith("assets/criaturas/"):
        return "decorativa"
    nome = os.path.basename(rel)
    if rel.startswith("assets/dados/") and (nome == "fundo.png" or nome.startswith("fundo-")):
        return "decorativa"
    return "sem_perda"


def exibicao(rel, w, h):
    if rel.endswith("/retrato.png"):
        return ("lado", min(max(w, h), 256))
    if "fundo" in os.path.basename(rel):
        return ("altura", min(h, 500))
    return ("altura", h)


def rgba(im):
    return np.asarray(im.convert("RGBA"), dtype=np.uint8)


def codificar(im, **kw):
    b = io.BytesIO()
    im.save(b, "WEBP", **kw)
    return b.getvalue()


def reduzir(arr, modo, alvo):
    im = Image.fromarray(arr, "RGBA")
    w, h = im.size
    f = alvo / (max(w, h) if modo == "lado" else h)
    if f >= 1:
        return arr
    return np.asarray(im.resize((max(1, round(w * f)), max(1, round(h * f))), Image.LANCZOS), dtype=np.uint8)


def sobre(arr, fundo):
    a = arr[..., 3:4].astype(np.float32) / 255
    return arr[..., :3].astype(np.float32) * a + np.array(fundo, np.float32) * (1 - a)


def qualidade(orig, cand, rel):
    modo, alvo = exibicao(rel, orig.shape[1], orig.shape[0])
    o, c = reduzir(orig, modo, alvo), reduzir(cand, modo, alvo)
    medidas = {"comparado": [modo, alvo]}
    aceita = True
    for nome, fundo in (("escuro", (24, 24, 28)), ("claro", (240, 240, 236))):
        A, B = sobre(o, fundo), sobre(c, fundo)
        d = np.abs(A - B)
        mse = float((d ** 2).mean())
        psnr = 99.0 if mse == 0 else 10 * np.log10(255 ** 2 / mse)
        luma = A @ np.array([0.299, 0.587, 0.114], np.float32)
        escuro = luma < 48
        gy, gx = np.gradient(luma)
        borda = np.hypot(gx, gy) > 24
        dm = d.max(axis=2)
        m = {
            "psnr": round(float(psnr), 2),
            "p999": float(np.percentile(dm, 99.9)),
            "escuro_media": round(float(dm[escuro].mean()), 3) if escuro.any() else 0.0,
            "borda_p99": float(np.percentile(dm[borda], 99)) if borda.any() else 0.0,
        }
        medidas[nome] = m
        aceita = aceita and m["psnr"] >= 42 and m["p999"] <= 14 and m["escuro_media"] <= 1.5 and m["borda_p99"] <= 12
    alfa = float(np.abs(o[..., 3].astype(int) - c[..., 3].astype(int)).max())
    medidas["alfa_max"] = alfa
    return aceita and alfa <= 2, medidas


def processar(caminho):
    rel = os.path.relpath(caminho, RAIZ).replace("\\", "/")
    png = os.path.getsize(caminho)
    im = Image.open(caminho)
    im.load()
    icc = im.info.get("icc_profile")
    extra = {"icc_profile": icc} if icc else {}
    orig = rgba(im)
    cat = categoria(rel)
    fonte = Image.fromarray(orig, "RGBA")
    sem_perda = codificar(fonte, lossless=True, quality=100, method=6, exact=True, **extra)
    identico = bool(np.array_equal(rgba(Image.open(io.BytesIO(sem_perda))), orig))
    item = {"arquivo": rel, "categoria": cat, "largura": orig.shape[1], "altura": orig.shape[0], "png": png,
            "sem_perda": len(sem_perda), "sem_perda_identico": identico}
    escolha, dados = "png", None
    if identico and len(sem_perda) < png:
        escolha, dados = "sem_perda", sem_perda
    if cat == "decorativa":
        ganho = 1 - len(sem_perda) / png
        item["ganho_sem_perda"] = round(ganho, 3)
        if ganho < GANHO_MINIMO_SEM_PERDA:
            for q in (90, 85):
                b = codificar(fonte, quality=q, alpha_quality=100, method=6, **extra)
                ok, med = qualidade(orig, rgba(Image.open(io.BytesIO(b))), rel)
                item["q%d" % q] = dict(bytes=len(b), aceita=ok, **med)
                if not ok:
                    break
                if len(b) <= GANHO_MINIMO_COM_PERDA * (len(dados) if dados else png):
                    escolha, dados = "q%d" % q, b
    item["escolha"] = escolha
    item["final"] = len(dados) if dados else png
    return item, dados


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    aplicar = "--aplicar" in sys.argv
    alvos = [a for a in sys.argv[1:] if not a.startswith("--")] or list(PASTAS)
    arquivos = []
    for a in alvos:
        base = os.path.join(RAIZ, a)
        arquivos += [base] if base.endswith(".png") else sorted(glob.glob(os.path.join(base, "**", "*.png"), recursive=True))
    relatorio = []
    with Pool() as pool:
        for n, (item, dados) in enumerate(pool.imap_unordered(processar, arquivos, chunksize=2)):
            relatorio.append(item)
            if aplicar and dados:
                destino = os.path.join(RAIZ, item["arquivo"][:-4] + ".webp")
                with open(destino, "wb") as f:
                    f.write(dados)
                os.remove(os.path.join(RAIZ, item["arquivo"]))
            if n % 50 == 0:
                print("%d/%d" % (n, len(arquivos)), flush=True)
    relatorio.sort(key=lambda r: r["arquivo"])
    saida = os.environ.get("RAMA_RELATORIO_IMAGENS")
    if saida:
        with open(saida, "w", encoding="utf-8") as f:
            json.dump(relatorio, f, ensure_ascii=False, indent=1)
    antes = sum(r["png"] for r in relatorio)
    depois = sum(r["final"] for r in relatorio)
    contagem = {}
    for r in relatorio:
        contagem[r["escolha"]] = contagem.get(r["escolha"], 0) + 1
    print("%d PNG · %s · %.2f MB → %.2f MB (−%.2f MB)%s" % (len(relatorio), contagem, antes / 1e6, depois / 1e6, (antes - depois) / 1e6, "" if aplicar else " · só medição; use --aplicar para gravar"))
    ruins = [r["arquivo"] for r in relatorio if not r["sem_perda_identico"]]
    if ruins:
        print("sem perda NÃO idêntico (ficaram em PNG ou com perda conferida):", ruins[:10])


if __name__ == "__main__":
    main()
