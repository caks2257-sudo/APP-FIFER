<#
.SYNOPSIS
  Crea fifer-landing/.env.local desde .env.example si aún no existe (PowerShell-friendly).

.DESCRIPTION
  Ejecutar desde la raíz del monorepo:
    .\scripts\fifer-landing-env.ps1

  Opcional: forzar copia
    .\scripts\fifer-landing-env.ps1 -Force
#>
param(
    [switch] $Force
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Landing = Join-Path $RepoRoot "fifer-landing"
$Example = Join-Path $Landing ".env.example"
$Local = Join-Path $Landing ".env.local"

if (-not (Test-Path $Example)) {
    Write-Error "No se encontró $Example"
    exit 1
}

if ((Test-Path $Local) -and -not $Force) {
    Write-Host "OK: $Local ya existe (usa -Force para sobrescribir)."
    exit 0
}

Copy-Item -Path $Example -Destination $Local -Force
Write-Host "Creado/actualizado: $Local"
Write-Host "Edita NEXT_PUBLIC_FIFER_API_BASE_URL para que apunte al motor API (puerto real de /api/v1/master/*)."
