# =====================================================================
# R.A.M.A. — Restaurar dados de teste (chamado por
# "Restaurar dados de teste.cmd", na raiz)
# ---------------------------------------------------------------------
# Troca as fichas, campanhas, aliados e compartilhamentos de teste pelos
# dados fictícios iniciais, depois de confirmar. Uma cópia do estado de
# antes fica em testes\dados-locais\estado.antes-de-restaurar.json.
# Com o servidor aberto, restaura nele; fechado, direto no arquivo.
# =====================================================================

$ErrorActionPreference = 'Stop'
$Host.UI.RawUI.WindowTitle = 'R.A.M.A. - restaurar dados de teste'
$porta = 8124
$raiz = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path.TrimEnd('\')
$pastaDados = Join-Path $raiz 'testes\dados-locais'
$dados = Join-Path $pastaDados 'estado.json'

function Pausar { Write-Host ''; Read-Host 'Pressione Enter para fechar esta janela' | Out-Null }

Write-Host 'Restaurar os dados de teste do R.A.M.A.' -ForegroundColor Cyan
Write-Host 'Todas as fichas, campanhas, aliados e compartilhamentos de teste voltam ao conjunto fictício inicial.'
Write-Host 'Uma cópia do estado atual fica em testes\dados-locais\estado.antes-de-restaurar.json.'
Write-Host ''
$resposta = Read-Host 'Digite SIM para restaurar (qualquer outra coisa cancela)'
if ($resposta -ne 'SIM' -and $resposta -ne 'sim') {
  Write-Host 'Cancelado. Nada mudou.'
  Pausar
  exit 0
}

$instancia = $null
try { $instancia = Invoke-RestMethod -Uri "http://127.0.0.1:$porta/__rama" -TimeoutSec 2 } catch { $instancia = $null }
if ($instancia -and $instancia.rama) {
  if (-not [string]::Equals(([string]$instancia.raiz).TrimEnd('\'), $raiz, [StringComparison]::OrdinalIgnoreCase)) {
    Write-Host "A porta $porta está com o servidor de testes de outra pasta ($($instancia.raiz)). Nada foi mudado." -ForegroundColor Yellow
    Pausar
    exit 1
  }
  try {
    $r = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:$porta/__restaurar" -Headers @{ 'x-rama-testes' = 'restaurar' } -TimeoutSec 60
  } catch { $r = $null }
  if ($r -and $r.ok) { Write-Host 'Dados de teste restaurados no servidor aberto. Atualize a página e entre de novo.' -ForegroundColor Green }
  else { Write-Host 'Não consegui restaurar pelo servidor aberto. Veja a janela dele.' -ForegroundColor Yellow }
  Pausar
  exit 0
}

$deno = (Get-Command deno -ErrorAction SilentlyContinue | Select-Object -First 1).Source
if (-not $deno) {
  $candidato = Join-Path $env:USERPROFILE '.deno\bin\deno.exe'
  if (Test-Path -LiteralPath $candidato) { $deno = $candidato }
}
if (-not $deno) {
  Write-Host 'Falta o Deno. Instale com:  winget install DenoLand.Deno' -ForegroundColor Yellow
  Pausar
  exit 1
}
New-Item -ItemType Directory -Force -Path $pastaDados | Out-Null
$permissaoDeEscrita = "--allow-write=$pastaDados"
& $deno run --allow-read $permissaoDeEscrita --allow-net=127.0.0.1 --allow-env `
  (Join-Path $raiz 'testes\servidor-local.js') --porta $porta --dados $dados --restaurar
Pausar
exit $LASTEXITCODE
