<#
.SYNOPSIS
  Etapa 2 do teste de fidelidade RPA - executa o motor local para os 50 casos.

.DESCRIPTION
  Le o manifesto selecao_50.json e roda, SEQUENCIALMENTE (mesmo login do To
  Segurado), o motor executar_rpa_imediato_playwright.py para cada
  parametros.json, com --session ren_<id> e --progress-tracker json.
  Ao final, chama consolidate_local_results.py para gerar resultado_local.json/csv.

.PARAMETER MaxCases
  Limita a quantidade de casos (util para um smoke test). Padrao: todos.

.PARAMETER Only
  Roda apenas o caso com este id (ex.: ren-001-...).

.PARAMETER SkipRun
  Pula a execucao e apenas reconsolida os resultados ja existentes em rpa_data/.

.EXAMPLE
  ./scripts/run_rpa_local_batch.ps1 -MaxCases 2   # smoke test com 2 casos
  ./scripts/run_rpa_local_batch.ps1               # bateria completa (50)
#>
param(
    [int]$MaxCases = 0,
    [string]$Only = "",
    [switch]$SkipRun
)

$ErrorActionPreference = "Stop"

$SiteRoot = Split-Path -Parent $PSScriptRoot
$RpaRoot = Join-Path (Split-Path -Parent $SiteRoot) "imediatoseguros-rpa-playwright"
$Manifest = Join-Path $RpaRoot "data\renovacao_teste_site_luciano\selecao_50.json"
$Entrypoint = Join-Path $RpaRoot "executar_rpa_imediato_playwright.py"

if (-not (Test-Path $Manifest)) {
    throw "Manifesto nao encontrado: $Manifest. Rode build_parametros_from_testdata.py antes."
}
if (-not (Test-Path $Entrypoint)) {
    throw "Entrypoint do RPA nao encontrado: $Entrypoint"
}

# Ativa venv do projeto RPA, se existir.
$Venv = Join-Path $RpaRoot "venv\Scripts\Activate.ps1"
if (Test-Path $Venv) {
    Write-Host "[INFO] Ativando venv do RPA..." -ForegroundColor Cyan
    . $Venv
}

$casos = (Get-Content -Raw -Encoding UTF8 $Manifest | ConvertFrom-Json).casos
if ($Only -ne "") {
    $casos = $casos | Where-Object { $_.id -eq $Only }
}
if ($MaxCases -gt 0) {
    $casos = $casos | Select-Object -First $MaxCases
}

Write-Host "[INFO] Casos a executar: $($casos.Count)" -ForegroundColor Green

if (-not $SkipRun) {
    Push-Location $RpaRoot
    try {
        $i = 0
        foreach ($caso in $casos) {
            $i++
            $id = $caso.id
            $session = $caso.session_id
            $config = $caso.parametros_file
            Write-Host ""
            Write-Host "===== [$i/$($casos.Count)] $id (session=$session) =====" -ForegroundColor Yellow

            $started = Get-Date
            try {
                python $Entrypoint --config $config --session $session --progress-tracker json --modo-silencioso
            }
            catch {
                Write-Warning "Execucao falhou para $id : $_"
            }
            $elapsed = (Get-Date) - $started
            Write-Host ("[INFO] $id concluido em {0:N1} min" -f $elapsed.TotalMinutes) -ForegroundColor Cyan
        }
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Host "[INFO] SkipRun ativo - apenas consolidando." -ForegroundColor Cyan
}

# Consolida resultados.
$Consolidator = Join-Path $SiteRoot "scripts\consolidate_local_results.py"
Write-Host ""
Write-Host "[INFO] Consolidando resultados..." -ForegroundColor Green
python $Consolidator
