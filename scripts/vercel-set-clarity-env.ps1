#Requires -Version 5.1
<#
.SYNOPSIS
  Define envs Clarity (Production only) no projeto Vercel imediato-seguros.

.DESCRIPTION
  Pré-requisitos: `npx vercel login` (ou VERCEL_TOKEN) e Project ID Clarity.

  Uso:
    .\scripts\vercel-set-clarity-env.ps1 -ClarityId "xxxxxxxxxx"
    .\scripts\vercel-set-clarity-env.ps1 -ClarityId "xxxxxxxxxx" -Redeploy

  Sample: 5% até RAMP_UNTIL (agora+48h); depois 20% para novos sorteios.
#>
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-zA-Z0-9]+$')]
  [string]$ClarityId,

  [string]$Project = "imediato-seguros",
  [string]$Scope = "production",
  [switch]$Redeploy
)

$ErrorActionPreference = "Stop"
$rampUntil = (Get-Date).ToUniversalTime().AddHours(48).ToString("yyyy-MM-ddTHH:mm:ss.000Z")

Write-Host "ClarityId=$ClarityId"
Write-Host "RAMP_UNTIL=$rampUntil (5% sample)"
Write-Host "Scope=$Scope Project=$Project"

function Set-VercelEnv([string]$Name, [string]$Value) {
  # Remove se existir (idempotente) — ignora erro se não existir
  npx --yes vercel@latest env rm $Name $Scope --yes 2>$null | Out-Null
  $Value | npx --yes vercel@latest env add $Name $Scope --sensitive=false
  if ($LASTEXITCODE -ne 0) { throw "Falha ao setar $Name" }
}

Set-VercelEnv "NEXT_PUBLIC_CLARITY_ID" $ClarityId
Set-VercelEnv "NEXT_PUBLIC_CLARITY_RAMP_UNTIL" $rampUntil

Write-Host "OK — envs Production definidas."
Write-Host "Lembrete: código Fase 2 precisa estar em main (commit/push) antes do redeploy."

if ($Redeploy) {
  Write-Host "Disparando redeploy Production..."
  npx --yes vercel@latest --prod --yes
}
