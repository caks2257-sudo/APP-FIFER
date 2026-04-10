$ErrorActionPreference = "Stop"

Write-Host "⚠️ PELIGRO: Esto borrará la data local y recreará las tablas con el nuevo orden cronológico de migraciones v4.0" -ForegroundColor Yellow
Write-Host "   Comando: npx supabase db reset"
Write-Host ""

Set-Location $PSScriptRoot

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  Write-Host "❌ npx no está disponible. Instala Node.js/npm." -ForegroundColor Red
  exit 1
}

npx supabase db reset
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
