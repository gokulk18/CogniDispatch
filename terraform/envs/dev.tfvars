# =============================================================
# envs/dev.tfvars — Dev Environment Variable Overrides
# Usage: terraform apply -var-file=envs/dev.tfvars
# Workspace: terraform workspace select dev
# =============================================================

location            = "japanwest"
resource_group_name = "rg-cognidispatch"

# Networking — same CIDR as prod but isolated by workspace
vnet_name              = "vnet-cognidispatch"
vnet_address_space     = "172.16.0.0/20"
subnet_appgw_cidr      = "172.16.0.0/24"
subnet_frontend_cidr   = "172.16.1.0/24"
subnet_backend_cidr    = "172.16.2.0/24"
subnet_private_ep_cidr = "172.16.3.0/24"

# ACR — shared registry (same for dev and prod, suffix differentiates in workspace)
acr_name = "acrcogniutrawi"

# Cosmos DB
cosmos_account_name  = "cosmos-cognidispatch-db"
cosmos_database_name = "cognidispatch"

# Key Vault
key_vault_name = "kv-cognidispatch"
# tenant_id is sensitive — pass via:
#   $env:TF_VAR_tenant_id = "your-tenant-id"

# App Service
app_plan_name     = "plan-cognidispatch"
frontend_app_name = "web-cogni-frontend-99"
backend_app_name  = "web-cogni-backend-99"
frontend_image    = "acrcogniutrawi.azurecr.io/cogni-frontend:latest"
backend_image_tag = "latest"

# Application Gateway
appgw_name           = "appgw-cognidispatch"
appgw_public_ip_name = "pip-appgw-cognidispatch"

# Dev: no forced replacement by default
force_replace_app_service = false

# Cost tracking tags (merged with workspace tags)
tags = {
  Owner      = "CogniDispatch-Team"
  CostCenter = "Engineering"
  Env        = "dev"
  BudgetCode = "CD-DEV-001"
}
