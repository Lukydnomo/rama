@echo off
rem R.A.M.A. - volta os dados de teste ao conjunto ficticio inicial (pede confirmacao).
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0testes\restaurar-testes.ps1"
