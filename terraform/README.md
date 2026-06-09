# CogniDispatch — Terraform Infrastructure

> **Azure cloud infrastructure for CogniDispatch** — fully managed via Terraform with 2 environments (dev / prod), modular design, remote state with state locking, Azure Key Vault secret management, drift detection, and GitHub Actions CI/CD.

---

## 📐 Architecture Overview

```
                          ┌─────────────────────────────────────┐
                          │         Azure Subscription           │
                          │                                      │
                          │  ┌─────────────────────────────────┐│
                          │  │   rg-cognidispatch[-dev]         ││
                          │  │                                  ││
Internet ──► AppGW WAF ──►│  │  ┌──────────┐  ┌─────────────┐ ││
                          │  │  │ Frontend  │  │  Backend    │ ││
                          │  │  │ App Svc  │  │  App Svc    │ ││
                          │  │  │ (Next.js)│  │ (Compose:   │ ││
                          │  │  └────┬─────┘  │  nginx+svcs)│ ││
                          │  │       │         └──────┬──────┘ ││
                          │  │  VNet Integration      │        ││
                          │  │  ┌────▼─────────────────▼────┐  ││
                          │  │  │  Private Subnet / VNet    │  ││
                          │  │  └────────────┬──────────────┘  ││
                          │  │               │ Private Endpoint ││
                          │  │  ┌────────────▼───┐  ┌────────┐ ││
                          │  │  │  Cosmos DB     │  │  ACR   │ ││
                          │  │  │  (MongoDB API) │  │        │ ││
                          │  │  └────────────────┘  └────────┘ ││
                          │  │               │                  ││
                          │  │  ┌────────────▼───┐             ││
                          │  │  │   Key Vault    │             ││
                          │  │  │ (Secrets Store)│             ││
                          │  │  └────────────────┘             ││
                          │  └─────────────────────────────────┘│
                          └─────────────────────────────────────┘
```

---

## 📁 Directory Structure

```
terraform/
├── backend.tf              # Remote state (Azure Blob Storage + state locking)
├── main.tf                 # Root orchestrator — calls all modules
├── providers.tf            # Azure RM + Azure AD provider config
├── versions.tf             # Terraform & provider version constraints
├── variables.tf            # All input variables with validation
├── outputs.tf              # Root outputs (written to remote state)
├── workspaces.tf           # Workspace-driven locals (dev | prod)
├── terraform.tfvars        # Base defaults (do not use directly)
│
├── envs/
│   ├── dev.tfvars          # Development environment overrides
│   └── prod.tfvars         # Production environment overrides
│
├── modules/
│   ├── networking/         # VNet, Subnets, NSGs, Private DNS Zones
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── acr/                # Azure Container Registry
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── cosmos_db/          # Cosmos DB (MongoDB API) + Private Endpoint
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── key_vault/          # Key Vault + Secrets + Access Policies
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── app_service/        # App Service Plan + Frontend + Backend
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── templates/
│   │       └── docker-compose.tpl
│   └── app_gateway/        # Application Gateway WAF v2
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
│
├── drift_check.ps1         # Drift detection & remediation script
└── taint_guide.ps1         # Terraform taint helper with safety guards
```

---

## 🌍 Environments (Workspaces)

| Feature | dev | prod |
|---|---|---|
| App Service SKU | B2 | P2v3 |
| Cosmos DB Throughput | 1,000 RU/s | 4,000 RU/s |
| App Gateway Capacity | 1 | 2 |
| WAF Mode | Detection | Prevention |
| ACR SKU | Basic | Standard |
| KV Soft-Delete Retention | 7 days | 90 days |
| KV Purge Protection | ❌ | ✅ |
| Resource Suffix | `-dev` | *(none)* |
| Image Tag | `latest` | `v1` |

---

## 🚀 Quick Start

### Prerequisites
- [Terraform >= 1.6.0](https://developer.hashicorp.com/terraform/downloads)
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)
- Azure subscription with Contributor access
- GitHub repository with secrets configured (for CI/CD)

### 1. Bootstrap Remote State (One-Time Only)

```powershell
# Login to Azure
az login

# Create the state storage resources
az group create --name rg-terraform-state --location japanwest

az storage account create `
  --name sttfstatecognidispatch `
  --resource-group rg-terraform-state `
  --sku Standard_LRS `
  --allow-blob-public-access false `
  --min-tls-version TLS1_2

az storage container create `
  --name tfstate `
  --account-name sttfstatecognidispatch

# Enable blob versioning (state history + accidental delete recovery)
az storage account blob-service-properties update `
  --account-name sttfstatecognidispatch `
  --resource-group rg-terraform-state `
  --enable-versioning true `
  --enable-delete-retention true `
  --delete-retention-days 30
```

### 2. Set Required Secrets

```powershell
# Required environment variable (sensitive — never put in .tfvars)
$env:TF_VAR_tenant_id = "your-azure-tenant-id"

# Azure authentication (for Service Principal)
$env:ARM_CLIENT_ID       = "your-sp-client-id"
$env:ARM_CLIENT_SECRET   = "your-sp-client-secret"
$env:ARM_SUBSCRIPTION_ID = "your-subscription-id"
$env:ARM_TENANT_ID       = "your-tenant-id"
```

### 3. Initialize Terraform

```powershell
cd terraform
terraform init
```

### 4. Deploy Dev Environment

```powershell
# Create and select dev workspace
terraform workspace new dev
terraform workspace select dev

# Plan
terraform plan -var-file=envs/dev.tfvars -out=tfplan-dev.bin

# Apply
terraform apply tfplan-dev.bin
```

### 5. Deploy Production

```powershell
terraform workspace new prod
terraform workspace select prod

terraform plan -var-file=envs/prod.tfvars -out=tfplan-prod.bin
terraform apply tfplan-prod.bin
```

---

## 🔒 Secret Management (Azure Key Vault)

Secrets are stored in Azure Key Vault and referenced by App Services using the `@Microsoft.KeyVault()` syntax — **no secrets in environment variables or code**.

### Secrets Stored

| Secret Name | Description | Rotation |
|---|---|---|
| `MONGODB-URI` | Cosmos DB connection string | Manual (after Cosmos key rotation) |
| `JWT-SECRET` | JWT signing key for auth service | Quarterly |

### Adding a New Secret

```powershell
# Add via Azure CLI (after Terraform deploys the vault)
az keyvault secret set \
  --vault-name kv-cognidispatch \
  --name "MY-NEW-SECRET" \
  --value "secret-value"

# Reference in App Service app_settings (add to app_service module):
# "MY_NEW_SECRET" = "@Microsoft.KeyVault(SecretUri=${var.key_vault_uri}secrets/MY-NEW-SECRET/)"
```

### Secret Rotation

```powershell
# Rotate MongoDB URI (after Cosmos DB key rotation)
az keyvault secret set \
  --vault-name kv-cognidispatch \
  --name "MONGODB-URI" \
  --value "mongodb://new-connection-string"

# App Service automatically picks up new version (no restart needed)
```

---

## 📊 Resource Tagging (Cost Tracking)

Every resource is tagged with:

| Tag | Value | Purpose |
|---|---|---|
| `Environment` | `dev` / `prod` | Cost allocation by environment |
| `ManagedBy` | `Terraform` | Identify Terraform-managed resources |
| `Project` | `CogniDispatch` | Project-level cost grouping |
| `Workspace` | `dev` / `prod` | Terraform workspace identifier |
| `Owner` | `CogniDispatch-Team` | Resource ownership |
| `CostCenter` | `Engineering` | Finance allocation code |
| `Repository` | `github.com/gokulk18/Cogni-Dispatch` | Source of truth link |
| `BudgetCode` | `CD-DEV-001` / `CD-PROD-001` | Budget tracking |
| `Criticality` | `High` (prod only) | SLA classification |
| `DataClass` | `Internal` (prod only) | Data governance |

### Cost Analysis

Use Azure Cost Management with tag filters:
```
Filter: Project = CogniDispatch AND Environment = prod
```

---

## 🔄 Remote State & State Locking

| Item | Details |
|---|---|
| **Backend** | Azure Blob Storage (`azurerm`) |
| **Storage Account** | `sttfstatecognidispatch` |
| **Container** | `tfstate` |
| **Dev State Key** | `cognidispatch-dev.tfstate` |
| **Prod State Key** | `cognidispatch-prod.tfstate` |
| **State Locking** | Azure Blob lease (automatic) |
| **Auth** | Azure AD RBAC (`use_azuread_auth = true`) |
| **Versioning** | Enabled (30-day soft delete) |

### Force-Unlock Stuck State

```powershell
# If a lock is stuck (e.g., pipeline crashed)
terraform force-unlock <LOCK_ID>
# Lock ID is shown in the error message
```

---

## 🕵️ Drift Detection

```powershell
# Check for drift in prod (no auto-apply)
.\terraform\drift_check.ps1 -Workspace prod

# Check and auto-remediate drift in dev
.\terraform\drift_check.ps1 -Workspace dev -AutoApply

# Check with Slack notification
$env:SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/xxx"
.\terraform\drift_check.ps1 -Workspace prod -NotifySlack
```

GitHub Actions also runs a **daily drift check** at 2AM UTC on the prod environment.

---

## 🔨 Terraform Taint (Forced Recreation)

Use `taint_guide.ps1` for safe resource replacement:

```powershell
# Fix unhealthy backend App Service
.\terraform\taint_guide.ps1 -Workspace prod -Resource backend-app-service

# Fix frontend
.\terraform\taint_guide.ps1 -Workspace prod -Resource frontend-app-service

# Dry run (preview without executing)
.\terraform\taint_guide.ps1 -Workspace prod -Resource backend-nsg -DryRun
```

### Taint Decision Matrix

| Resource | Taint OK? | Risk | Alternative |
|---|---|---|---|
| Backend App Service | ✅ Yes | Low | Restart container |
| Frontend App Service | ✅ Yes | Low | Restart container |
| App Service Plan | ✅ Yes | Medium | Downtime during replacement |
| Application Gateway | ✅ Yes | Medium | Brief traffic interruption |
| NSG | ✅ Yes | Low | Security rules reset |
| ACR | ⚠️ Careful | HIGH — image loss | Re-push all images first |
| Key Vault | ❌ Never | Purge protection | Use `az keyvault recover` |
| Cosmos DB Account | ❌ Never | DATA LOSS | Restore from backup |
| Cosmos DB Database | ❌ Never | DATA LOSS | Restore from backup |

---

## 🔧 Backend Health Fix

The backend App Service was previously unhealthy due to:

1. **Wrong health probe** — App Gateway probed too early before compose initialized
2. **Missing `WEBSITE_PULL_IMAGE_OVER_VNET`** — caused ACR pull failures over private VNet
3. **No healthcheck in docker-compose** — nginx started before microservices were ready

**Fixes applied:**
- ✅ `health_check_eviction_time_in_min = 10` (was 5 — too short for multi-container startup)
- ✅ `WEBSITE_PULL_IMAGE_OVER_VNET = 1` — enables ACR pull over VNet
- ✅ `DOCKER_ENABLE_CI = false` — prevents auto-redeploy loops
- ✅ Docker Compose template with `healthcheck` on every service
- ✅ nginx `depends_on: condition: service_healthy` — waits for all microservices
- ✅ `MONGODB_URI` via Key Vault reference (`@Microsoft.KeyVault()`) — no plaintext secrets

---

## 🔁 Module Dependency Graph

```
networking
    ├─→ cosmos_db
    │       └─→ key_vault
    │               └─→ app_service
    │                       └─→ app_gateway
    └─→ acr
            └─→ app_service
```

---

## 🛡️ GitHub Repository Setup

### Required GitHub Secrets

Go to **Settings → Secrets and Variables → Actions** and add:

| Secret | Description |
|---|---|
| `ARM_CLIENT_ID` | Service Principal Client ID |
| `ARM_CLIENT_SECRET` | Service Principal Client Secret |
| `ARM_SUBSCRIPTION_ID` | Azure Subscription ID |
| `ARM_TENANT_ID` | Azure AD Tenant ID |

### Required GitHub Environments

Go to **Settings → Environments** and create:

| Environment | Protection Rules |
|---|---|
| `dev` | None (auto-deploy from `develop` branch) |
| `prod` | Required reviewers + deployment branch `main` only |

### Branch Strategy

```
main      → deploys to prod (requires PR approval)
develop   → deploys to dev (auto-apply)
feature/* → creates plan only on PR (no apply)
```

---

## 📋 Common Commands

```powershell
# Switch workspace
terraform workspace select dev
terraform workspace select prod

# Plan with env-specific vars
terraform plan -var-file=envs/dev.tfvars
terraform plan -var-file=envs/prod.tfvars

# Apply saved plan
terraform apply tfplan-dev.bin

# See all outputs
terraform output

# Show state
terraform state list
terraform state show module.app_service.azurerm_linux_web_app.backend

# Import existing resource
terraform import module.acr.azurerm_container_registry.main /subscriptions/xxx/resourceGroups/rg/providers/...

# Destroy dev only (NEVER destroy prod without explicit approval)
terraform workspace select dev
terraform destroy -var-file=envs/dev.tfvars
```

---

## 🏷️ Version History

| Version | Date | Changes |
|---|---|---|
| v2.0 | 2026-06-09 | Removed staging env, modular rewrite, backend health fix, KV secret references, drift detection, taint guide, GitHub Actions CI/CD |
| v1.0 | 2026-06-01 | Initial Terraform infrastructure |
