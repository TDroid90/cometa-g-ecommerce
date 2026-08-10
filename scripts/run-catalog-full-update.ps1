$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LogDir = Join-Path $RepoRoot ".tmp\catalog-cron"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$OutLog = Join-Path $LogDir "$Stamp-full-out.log"
$ErrLog = Join-Path $LogDir "$Stamp-full-err.log"

Set-Location $RepoRoot
$env:CATALOG_QUICK_PUBLISH = "TRUE"
$env:INVID_REFRESH = "TRUE"
$env:CATALOG_REFRESH_FULL = "TRUE"

python "scripts\import-catalogs-to-sheets.py" *> $OutLog

if ($LASTEXITCODE -ne 0) {
  Add-Content -Path $ErrLog -Value "Full catalog update failed with exit code $LASTEXITCODE"
  exit $LASTEXITCODE
}

Get-ChildItem $LogDir -Filter "*.log" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip 80 |
  Remove-Item -Force
