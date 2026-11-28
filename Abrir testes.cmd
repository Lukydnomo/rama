@echo off
rem R.A.M.A. - abre o ambiente de testes local (servidor simulado + navegador).
rem Os dados de teste ficam em testes\dados-locais\ e continuam entre aberturas.
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0testes\abrir-testes.ps1"
