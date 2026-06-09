# =============================================================
# drift_check.ps1 — Terraform Drift Detection & Remediation
#
# Usage:
#   .\drift_check.ps1 -Workspace dev
#   .\drift_check.ps1 -Workspace prod
#   .\drift_check.ps1 -Workspace prod -AutoApply
#   .\drift_check.ps1 -Workspace prod -NotifySlack
#
# Exit Codes (terraform plan -detailed-exitcode):
#   0 = No changes (no drift)
#   1 = Error
#   2 = Drift detected
# =============================================================

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "prod")]
    [string]$Workspace,

    [switch]$AutoApply,
    [switch]$NotifySlack,
    [string]$VarFile = ""
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " CogniDispatch — Terraform Drift Check"  -ForegroundColor Cyan
Write-Host " Workspace : $Workspace"                  -ForegroundColor Cyan
Write-Host " Timestamp : $timestamp"                  -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# ── Resolve var-file if not supplied ─────────────────────────
if ([string]::IsNullOrEmpty($VarFile)) {
    $VarFile = "envs/$Workspace.tfvars"
}

if (-not (Test-Path $VarFile)) {
    Write-Error "Var file not found: $VarFile"
    exit 1
}

# ── Step 1: Select / create workspace ────────────────────────
Write-Host "`n[1/4] Selecting workspace: $Workspace" -ForegroundColor Yellow
terraform workspace select $Workspace 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Workspace '$Workspace' not found. Creating..." -ForegroundColor Yellow
    terraform workspace new $Workspace
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

# ── Step 2: Refresh state ─────────────────────────────────────
Write-Host "`n[2/4] Refreshing remote state..." -ForegroundColor Yellow
terraform refresh -var-file=$VarFile
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Refresh failed — check credentials." -ForegroundColor Red
    exit 1
}

# ── Step 3: Plan with detailed exit code ──────────────────────
$planFile = "tfplan-drift-$Workspace.bin"
Write-Host "`n[3/4] Running drift detection plan..." -ForegroundColor Yellow

terraform plan `
    -var-file=$VarFile `
    -detailed-exitcode `
    -refresh=true `
    -out=$planFile

$planExitCode = $LASTEXITCODE

# ── Step 4: Evaluate results ──────────────────────────────────
Write-Host "`n[4/4] Evaluating results..." -ForegroundColor Yellow

switch ($planExitCode) {
    0 {
        Write-Host "`n  ✅ NO DRIFT — Infrastructure matches Terraform state." -ForegroundColor Green
        if (Test-Path $planFile) { Remove-Item $planFile -Force }
        exit 0
    }
    1 {
        Write-Host "`n  ❌ PLAN ERROR — See output above." -ForegroundColor Red
        exit 1
    }
    2 {
        Write-Host "`n  ⚠️  DRIFT DETECTED — Infrastructure has changed outside Terraform!" -ForegroundColor Red
        Write-Host "  Plan file: $planFile" -ForegroundColor Yellow

        # Show a human-readable summary
        Write-Host "`n  Generating drift summary..." -ForegroundColor Yellow
        terraform show -json $planFile | ConvertFrom-Json | Select-Object -ExpandProperty resource_changes |
            Where-Object { $_.change.actions -ne "no-op" } |
            ForEach-Object {
                Write-Host "  $($_.change.actions) — $($_.address)" -ForegroundColor Yellow
            }

        if ($NotifySlack) {
            Write-Host "`n  Sending Slack notification..." -ForegroundColor Cyan
            # Replace SLACK_WEBHOOK_URL with your actual webhook URL or use a secret
            $slackMsg = @{ text = "⚠️ DRIFT DETECTED in CogniDispatch *$Workspace* at $timestamp. Run drift_check.ps1 -AutoApply to remediate." } | ConvertTo-Json
            if ($env:SLACK_WEBHOOK_URL) {
                Invoke-RestMethod -Uri $env:SLACK_WEBHOOK_URL -Method Post -Body $slackMsg -ContentType "application/json"
            }
        }

        if ($AutoApply) {
            Write-Host "`n  Auto-apply enabled. Applying plan to correct drift..." -ForegroundColor Yellow
            terraform apply $planFile
            if ($LASTEXITCODE -eq 0) {
                Write-Host "`n  ✅ Drift corrected successfully." -ForegroundColor Green
                if (Test-Path $planFile) { Remove-Item $planFile -Force }
            } else {
                Write-Host "`n  ❌ Apply failed. Manual intervention required." -ForegroundColor Red
                exit 1
            }
        } else {
            Write-Host "`n  To remediate, run:" -ForegroundColor Cyan
            Write-Host "    .\drift_check.ps1 -Workspace $Workspace -AutoApply" -ForegroundColor White
            Write-Host "  Or manually: terraform apply $planFile" -ForegroundColor White
        }
        exit 2
    }
}
