Write-Host "=== FIFER Clean Start (Windows) ===" -ForegroundColor Cyan

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

Write-Host "1) Deteniendo procesos Node en puerto 3000..." -ForegroundColor Yellow
try {
  $pids = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($pid in $pids) {
    if ($pid) {
      Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
      Write-Host "   - Proceso detenido: $pid"
    }
  }
} catch {
  Write-Host "   - No se encontraron procesos activos en 3000 o no fue necesario detenerlos."
}

Write-Host "2) Limpiando cache/build local (.next, node_modules)..." -ForegroundColor Yellow
if (Test-Path ".next") {
  Remove-Item ".next" -Recurse -Force -ErrorAction SilentlyContinue
  Write-Host "   - .next eliminado"
}
if (Test-Path "node_modules") {
  Remove-Item "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
  Write-Host "   - node_modules eliminado"
}

Write-Host "3) Instalando dependencias..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
  Write-Error "npm install falló. Abortando clean-start."
  exit $LASTEXITCODE
}

Write-Host "4) Lanzando entorno de desarrollo..." -ForegroundColor Yellow
npm run dev

