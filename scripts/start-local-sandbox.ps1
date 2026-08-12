param(
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$serviceAccountPath = Join-Path $repoRoot "cometag-444803-c2bdba83753e.json"
$paywayCredentialsPath = Join-Path $repoRoot "payway\CRED.txt"

if (-not (Test-Path -LiteralPath $serviceAccountPath)) {
  throw "Falta la cuenta de servicio de Google para el entorno local."
}

if (-not (Test-Path -LiteralPath $paywayCredentialsPath)) {
  throw "Faltan las credenciales sandbox de Payway en payway\\CRED.txt."
}

$credentialLines = Get-Content -LiteralPath $paywayCredentialsPath |
  ForEach-Object { $_.Trim() } |
  Where-Object { $_ }
$sandboxStart = [Array]::IndexOf([string[]]$credentialLines, "Sand")

if ($sandboxStart -lt 0 -or $credentialLines.Count -lt ($sandboxStart + 5)) {
  throw "No se encontro el bloque sandbox completo de Payway."
}

function Get-CredentialValue([string]$line) {
  return ($line -replace "^[A-Za-z]+\s*-\s*", "").Trim()
}

$env:GOOGLE_SERVICE_ACCOUNT_JSON = Get-Content -LiteralPath $serviceAccountPath -Raw
$env:GOOGLE_SHEETS_PRODUCTOS_ID = "16OubRGr4OtQgo1g5s6xho-H2-yEGEUfB4eywUJ2YjTY"
$env:GOOGLE_SHEETS_ID = $env:GOOGLE_SHEETS_PRODUCTOS_ID
$env:NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:$Port"

# Local payments always use the sandbox block. Production stays configured in Vercel.
$env:PAYWAY_ENVIRONMENT = "developer"
$env:PAYWAY_PUBLIC_KEY = Get-CredentialValue $credentialLines[$sandboxStart + 1]
$env:PAYWAY_PRIVATE_KEY = Get-CredentialValue $credentialLines[$sandboxStart + 2]
$env:PAYWAY_SITE_ID = Get-CredentialValue $credentialLines[$sandboxStart + 3]
$env:PAYWAY_TERMINAL_ID = Get-CredentialValue $credentialLines[$sandboxStart + 4]

Set-Location $repoRoot
npm run dev -- --hostname 127.0.0.1 --port $Port
