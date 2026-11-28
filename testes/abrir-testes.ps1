# =====================================================================
# R.A.M.A. — Abrir testes (chamado por "Abrir testes.cmd", na raiz)
# ---------------------------------------------------------------------
# Sobe o servidor de testes local com os dados guardados em
# testes\dados-locais\ e abre o navegador na escolha de conta.
#   - Já aberto (esta pasta)? Só abre o navegador.
#   - Porta tomada por outro programa? Explica e para.
#   - Falta o Deno? Diz como instalar.
# A janela fica aberta enquanto o servidor roda: fechá-la encerra.
# =====================================================================

$ErrorActionPreference = 'Stop'
$Host.UI.RawUI.WindowTitle = 'R.A.M.A. - testes locais'
$porta = 8124
$raiz = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path.TrimEnd('\')
$pastaDados = Join-Path $raiz 'testes\dados-locais'
$dados = Join-Path $pastaDados 'estado.json'
$endereco = "http://localhost:$porta/__testes"

function Pausar { Write-Host ''; Read-Host 'Pressione Enter para fechar esta janela' | Out-Null }

# --- Deno ---
$deno = (Get-Command deno -ErrorAction SilentlyContinue | Select-Object -First 1).Source
if (-not $deno) {
  $candidato = Join-Path $env:USERPROFILE '.deno\bin\deno.exe'
  if (Test-Path -LiteralPath $candidato) { $deno = $candidato }
}
if (-not $deno) {
  Write-Host 'Falta o Deno, que roda o servidor de testes.' -ForegroundColor Yellow
  Write-Host 'Instale com um destes comandos (no PowerShell) e abra de novo:'
  Write-Host '  winget install DenoLand.Deno'
  Write-Host '  irm https://deno.land/install.ps1 | iex'
  Pausar
  exit 1
}

# --- Já tem alguém na porta? ---
$instancia = $null
try { $instancia = Invoke-RestMethod -Uri "http://127.0.0.1:$porta/__rama" -TimeoutSec 2 } catch { $instancia = $null }
if ($instancia -and $instancia.rama) {
  if ([string]::Equals(([string]$instancia.raiz).TrimEnd('\'), $raiz, [StringComparison]::OrdinalIgnoreCase)) {
    Write-Host "O servidor de testes já está aberto. Abrindo $endereco"
    Start-Process $endereco
    Start-Sleep -Seconds 2
    exit 0
  }
  Write-Host "A porta $porta está com o servidor de testes de OUTRA pasta do RAMA:" -ForegroundColor Yellow
  Write-Host "  $($instancia.raiz)"
  Write-Host 'Feche a janela daquele servidor e abra este de novo.'
  Pausar
  exit 1
}
$ocupada = Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($ocupada) {
  $nome = (Get-Process -Id $ocupada.OwningProcess -ErrorAction SilentlyContinue).ProcessName
  Write-Host "A porta $porta já está em uso por outro programa: $nome (PID $($ocupada.OwningProcess))." -ForegroundColor Yellow
  Write-Host 'Feche esse programa e abra os testes de novo.'
  Write-Host "Se for um servidor de testes travado, encerre-o com:  Stop-Process -Id $($ocupada.OwningProcess)"
  Pausar
  exit 1
}

# --- Subir ---
New-Item -ItemType Directory -Force -Path $pastaDados | Out-Null
Write-Host 'Abrindo o servidor de testes do R.A.M.A...'
Write-Host 'O navegador abre sozinho quando estiver pronto. Para encerrar, feche esta janela (ou Ctrl+C).'
Write-Host ''
$permissaoDeEscrita = "--allow-write=$pastaDados"
& $deno run --allow-read $permissaoDeEscrita --allow-net=127.0.0.1 --allow-env --allow-run=cmd `
  (Join-Path $raiz 'testes\servidor-local.js') --porta $porta --dados $dados --abrir
$codigo = $LASTEXITCODE
if ($codigo -ne 0) {
  Write-Host ''
  Write-Host "O servidor parou (código $codigo). A mensagem acima explica o motivo." -ForegroundColor Yellow
  Pausar
}
exit $codigo
