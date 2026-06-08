# =============================================================
# drift_check.ps1 — Terraform Drift Detection
#
# Usage:
#   .\drift_check.ps1 -Workspace prod
#   .\drift_check.ps1 -Workspace dev -AutoApply
#
# Exit Codes (from terraform plan -detailed-exitcode):
#   0 = No changes (no drift)
#   1 = Error
#   2 = Drift detected (changes pending)
# =============================================================

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Workspace,

    [switch]$AutoApply
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " CogniDispatch Terraform Drift Check" -ForegroundColor Cyan
Write-Host " Workspace: $Workspace" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Select workspace
Write-Host "`n[1/3] Selecting workspace: $Workspace" -ForegroundColor Yellow
terraform workspace select $Workspace
if ($LASTEXITCODE -ne 0) {
    Write-Host "Workspace '$Workspace' not found. Creating..." -ForegroundColor Yellow
    terraform workspace new $Workspace
}

# Run plan with detailed exit code
Write-Host "`n[2/3] Running terraform plan (drift detection)..." -ForegroundColor Yellow
terraform plan `
    -var-file="terraform.tfvars" `
    -detailed-exitcode `
    -out="tfplan-$Workspace.bin" `
    -refresh=true

$planExitCode = $LASTEXITCODE

switch ($planExitCode) {
    0 {
        Write-Host "`n[3/3] ✅ NO DRIFT — Infrastructure matches Terraform state." -ForegroundColor Green
        exit 0
    }
    1 {
        Write-Host "`n[3/3] ❌ PLAN ERROR — Check Terraform output above." -ForegroundColor Red
        exit 1
    }
    2 {
        Write-Host "`n[3/3] ⚠️  DRIFT DETECTED — Infrastructure has changed outside Terraform." -ForegroundColor Red
        Write-Host "  Plan saved to: tfplan-$Workspace.bin" -ForegroundColor Yellow

        if ($AutoApply) {
            Write-Host "`n  Auto-apply enabled. Applying plan to correct drift..." -ForegroundColor Yellow
            terraform apply "tfplan-$Workspace.bin"
            if ($LASTEXITCODE -eq 0) {
                Write-Host "`n  ✅ Drift corrected successfully." -ForegroundColor Green
            } else {
                Write-Host "`n  ❌ Apply failed. Manual intervention required." -ForegroundColor Red
                exit 1
            }
        } else {
            Write-Host "`n  Run with -AutoApply to correct drift automatically." -ForegroundColor Cyan
            Write-Host "  Or run: terraform apply tfplan-$Workspace.bin" -ForegroundColor Cyan
        }
        exit 2
    }
}
