# =============================================================
# taint_guide.ps1 — Terraform Taint Helper Script
#
# Purpose: Identify and taint specific resources that need forced
#          recreation for CogniDispatch infrastructure.
#
# Terraform Taint (Forced Recreation) Use Cases:
# ─────────────────────────────────────────────
# 1. APP SERVICE (Backend unhealthy / stuck container)
#    - Symptom: Backend App Service shows "Unhealthy" in portal
#    - Fix: Taint the backend app service to force recreation
#    - Command: terraform taint module.app_service.azurerm_linux_web_app.backend
#
# 2. APP SERVICE (Frontend stuck / wrong image)
#    - Symptom: Frontend showing old image or 503 errors
#    - Fix: Taint frontend app service
#    - Command: terraform taint module.app_service.azurerm_linux_web_app.frontend
#
# 3. ACR (Registry corrupted / auth issues)
#    - Symptom: docker pull fails with auth errors that can't be fixed
#    - Risk: ALL images in the registry will be LOST
#    - Fix: After confirming images are backed up elsewhere
#    - Command: terraform taint module.acr.azurerm_container_registry.main
#    - NOTE: lifecycle.prevent_destroy must be temporarily set to false
#
# 4. KEY VAULT (Soft-deleted vault blocking recreation)
#    - Symptom: "A resource with the ID already exists" error on plan
#    - Fix: Use az keyvault recover (not taint — purge protection prevents taint)
#    - az keyvault recover --name <kv-name>
#
# 5. NETWORKING (NSG rule drift)
#    - Symptom: NSG rules changed outside Terraform
#    - Fix: Taint the specific NSG
#    - Command: terraform taint module.networking.azurerm_network_security_group.backend
#
# NEVER TAINT:
#   - module.cosmos_db.azurerm_cosmosdb_account.main  → DATA LOSS
#   - module.cosmos_db.azurerm_cosmosdb_mongo_database.main → DATA LOSS
# =============================================================

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "prod")]
    [string]$Workspace,

    [Parameter(Mandatory=$true)]
    [ValidateSet(
        "backend-app-service",
        "frontend-app-service",
        "app-service-plan",
        "app-gateway",
        "backend-nsg",
        "frontend-nsg",
        "acr"
    )]
    [string]$Resource,

    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# Resource address map
$resourceMap = @{
    "backend-app-service"  = "module.app_service.azurerm_linux_web_app.backend"
    "frontend-app-service" = "module.app_service.azurerm_linux_web_app.frontend"
    "app-service-plan"     = "module.app_service.azurerm_service_plan.main"
    "app-gateway"          = "module.app_gateway.azurerm_application_gateway.main"
    "backend-nsg"          = "module.networking.azurerm_network_security_group.backend"
    "frontend-nsg"         = "module.networking.azurerm_network_security_group.frontend"
    "acr"                  = "module.acr.azurerm_container_registry.main"
}

$resourceAddress = $resourceMap[$Resource]

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " CogniDispatch — Terraform Taint Helper" -ForegroundColor Cyan
Write-Host " Workspace: $Workspace"                  -ForegroundColor Cyan
Write-Host " Resource : $Resource"                   -ForegroundColor Cyan
Write-Host " Address  : $resourceAddress"            -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($Resource -eq "acr") {
    Write-Host "`n  ⚠️  WARNING: Tainting ACR will DESTROY all container images!" -ForegroundColor Red
    Write-Host "  Ensure all images are backed up or can be rebuilt from CI/CD." -ForegroundColor Red
    $confirm = Read-Host "  Type 'DELETE-IMAGES' to confirm"
    if ($confirm -ne "DELETE-IMAGES") {
        Write-Host "  Aborted." -ForegroundColor Green
        exit 0
    }
}

# Select workspace
Write-Host "`n[1/3] Selecting workspace: $Workspace" -ForegroundColor Yellow
terraform workspace select $Workspace
if ($LASTEXITCODE -ne 0) { exit 1 }

if ($DryRun) {
    Write-Host "`n[DRY RUN] Would taint: $resourceAddress" -ForegroundColor Cyan
    Write-Host "  Run without -DryRun to execute." -ForegroundColor White
    exit 0
}

# Apply taint (Terraform 1.x uses -replace flag in plan/apply, but taint still works)
Write-Host "`n[2/3] Tainting resource: $resourceAddress" -ForegroundColor Yellow
terraform taint $resourceAddress
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Failed to taint. Check resource address." -ForegroundColor Red
    exit 1
}

Write-Host "`n[3/3] Resource marked for replacement." -ForegroundColor Green
Write-Host "  Next step — run plan to preview replacement:" -ForegroundColor Cyan
Write-Host "  terraform plan -var-file=envs/$Workspace.tfvars" -ForegroundColor White
Write-Host "  Then apply:" -ForegroundColor Cyan
Write-Host "  terraform apply -var-file=envs/$Workspace.tfvars" -ForegroundColor White
Write-Host "`n  Alternative (Terraform 1.x): use -replace flag instead of taint:" -ForegroundColor Cyan
Write-Host "  terraform plan -replace='$resourceAddress' -var-file=envs/$Workspace.tfvars" -ForegroundColor White
