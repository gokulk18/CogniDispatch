# CogniDispatch — Terraform Infrastructure

Modular Terraform for the complete CogniDispatch Azure infrastructure.

---

## Prerequisites

- Terraform >= 1.6.0
- Azure CLI (`az login`)
- Docker (for image builds)

---

## One-time Bootstrap (State Backend)

Create the storage account for remote state **before** running `terraform init`:

```powershell
az group create --name rg-terraform-state --location japanwest
az storage account create --name sttfstatecognidispatch --resource-group rg-terraform-state --sku Standard_LRS
az storage container create --name tfstate --account-name sttfstatecognidispatch
```

---

## Workspaces

This project uses Terraform workspaces to manage **dev / staging / prod** environments from the same codebase.

| Workspace | App Plan SKU | Cosmos Throughput | WAF Mode |
|-----------|-------------|-------------------|----------|
| `dev`     | S1 (1.75 GB) | 1,000 RU | Detection |
| `staging` | S2 (3.5 GB)  | 2,000 RU | Detection |
| `prod`    | S3 (7 GB)    | 4,000 RU | Prevention |

```powershell
# Create & select a workspace
terraform workspace new prod
terraform workspace select prod
terraform workspace list
```

---

## Usage

```powershell
# Initialize (downloads providers, configures backend)
terraform init

# Select workspace
terraform workspace select prod

# Plan (preview changes)
terraform plan -var="tenant_id=YOUR_TENANT_ID"

# Apply
terraform apply -var="tenant_id=YOUR_TENANT_ID"

# Destroy (note: Cosmos DB and Key Vault have prevent_destroy)
terraform destroy
```

### Sensitive Variables

Never commit `tenant_id` to git. Pass via env var:

```powershell
$env:TF_VAR_tenant_id = "your-tenant-id"
terraform plan
```

---

## State Locking

State locking is **automatic** using Azure Blob Storage lease. If a lock gets stuck:

```powershell
terraform force-unlock <LOCK_ID>
```

---

## Drift Detection

Run the drift detection script to check if real Azure state matches Terraform:

```powershell
# Check for drift only
.\drift_check.ps1 -Workspace prod

# Check and auto-correct drift
.\drift_check.ps1 -Workspace prod -AutoApply
```

Exit codes:
- `0` = No drift ✅
- `1` = Error ❌  
- `2` = Drift detected ⚠️

---

## Module Structure

```
modules/
├── networking/    VNet, 4 subnets, NSGs, Private DNS Zones
├── acr/           Azure Container Registry
├── cosmos_db/     Cosmos DB (MongoDB API) + Private Endpoint
├── key_vault/     Key Vault + Secrets + Access Policies + Private Endpoint
├── app_service/   App Service Plan + Frontend + Backend + Managed Identity
└── app_gateway/   Application Gateway WAF v2 + Path-based routing
```

---

## Environment-specific tfvars

To further customize per-env, create override files:

```
envs/
├── dev.tfvars
├── staging.tfvars
└── prod.tfvars
```

Then apply with:
```powershell
terraform apply -var-file="terraform.tfvars" -var-file="envs/prod.tfvars"
```
