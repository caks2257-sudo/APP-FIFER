param(
  [switch]$Execute,
  [string]$ProjectRef = ""
)

$ErrorActionPreference = "Stop"

$pairs = @(
  @{ old = "20260406120000"; new = "20260406090000"; name = "tag_center_schema" },
  @{ old = "20260407120000"; new = "20260406100000"; name = "tag_center_phase1_catalog" },
  @{ old = "20260408100000"; new = "20260406110000"; name = "app_marketing_scaffold" },
  @{ old = "20260412150000"; new = "20260406115000"; name = "user_api_keys_vault" },
  @{ old = "20260410120000"; new = "20260406130000"; name = "campaign_drafts" },
  @{ old = "20260407190000"; new = "20260406140000"; name = "campaign_drafts_add_paused_status" },
  @{ old = "20260407213000"; new = "20260406150000"; name = "ad_mapping" },
  @{ old = "20260407224500"; new = "20260406160000"; name = "ad_mapping_system" },
  @{ old = "20260409120000"; new = "20260406170000"; name = "master_pipeline_publish_log" },
  @{ old = "20260411120000"; new = "20260406180000"; name = "financial_bunker_wallets" },
  @{ old = "20260412120000"; new = "20260406190000"; name = "exchange_rates" }
)

function Invoke-Supa([string]$args) {
  $cmd = "npx supabase $args"
  Write-Host ">> $cmd" -ForegroundColor Cyan
  Invoke-Expression $cmd
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $cmd"
  }
}

if (-not $Execute) {
  Write-Host "DRY RUN: no changes applied. Use -Execute to run." -ForegroundColor Yellow
}

if ($ProjectRef) {
  Write-Host "Linking project ref: $ProjectRef" -ForegroundColor Green
  if ($Execute) {
    Invoke-Supa "link --project-ref $ProjectRef"
  } else {
    Write-Host ">> npx supabase link --project-ref $ProjectRef"
  }
}

Write-Host "Reconciling migration history (legacy -> canonical)..." -ForegroundColor Green
foreach ($p in $pairs) {
  Write-Host ("- {0}: {1} -> {2}" -f $p.name, $p.old, $p.new)
  if ($Execute) {
    Invoke-Supa ("migration repair --status reverted {0}" -f $p.old)
    Invoke-Supa ("migration repair --status applied {0}" -f $p.new)
  } else {
    Write-Host ("  >> npx supabase migration repair --status reverted {0}" -f $p.old)
    Write-Host ("  >> npx supabase migration repair --status applied {0}" -f $p.new)
  }
}

Write-Host ""
Write-Host "IMPORTANT: run pending canonical migrations after reconciliation:" -ForegroundColor Yellow
Write-Host "  npx supabase db push"
Write-Host ""
Write-Host "Recommended verification:"
Write-Host "  npx supabase migration list"
