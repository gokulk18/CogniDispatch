# =============================================================
# main.tf — Root Orchestrator: Calls all modules
# Dependency graph:
#   networking → (acr, cosmos_db) → key_vault → app_service → app_gateway
# =============================================================

# ── Current Azure Identity (for Key Vault access policies) ───
data "azurerm_client_config" "current" {}

# ── Resource Group ────────────────────────────────────────────
resource "azurerm_resource_group" "main" {
  name     = "${var.resource_group_name}${local.suffix}"
  location = var.location
  tags     = local.common_tags
}

# ── Remote State Data Sources ─────────────────────────────────
# Read outputs from the shared state (used for cross-workspace dependencies)
# Uncomment when you need to reference prod state from dev, or vice versa.
# data "terraform_remote_state" "prod" {
#   backend = "azurerm"
#   config = {
#     resource_group_name  = "rg-terraform-state"
#     storage_account_name = "sttfstatecognidispatch"
#     container_name       = "tfstate"
#     key                  = "cognidispatch-prod.tfstate"
#   }
# }

# ── Networking Module ─────────────────────────────────────────
module "networking" {
  source = "./modules/networking"

  resource_group_name    = azurerm_resource_group.main.name
  location               = var.location
  vnet_name              = "${var.vnet_name}${local.suffix}"
  vnet_address_space     = var.vnet_address_space
  subnet_appgw_cidr      = var.subnet_appgw_cidr
  subnet_frontend_cidr   = var.subnet_frontend_cidr
  subnet_backend_cidr    = var.subnet_backend_cidr
  subnet_private_ep_cidr = var.subnet_private_ep_cidr
  tags                   = local.common_tags
}

# ── ACR Module ────────────────────────────────────────────────
module "acr" {
  source = "./modules/acr"

  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  acr_name            = var.acr_name
  acr_sku             = local.acr_sku_per_env
  tags                = local.common_tags
}

# ── Cosmos DB Module ──────────────────────────────────────────
module "cosmos_db" {
  source = "./modules/cosmos_db"

  resource_group_name        = azurerm_resource_group.main.name
  location                   = var.location
  cosmos_account_name        = "${var.cosmos_account_name}${local.suffix}"
  cosmos_database_name       = var.cosmos_database_name
  private_endpoint_subnet_id = module.networking.private_ep_subnet_id
  cosmos_private_dns_zone_id = module.networking.cosmos_private_dns_zone_id
  vnet_id                    = module.networking.vnet_id
  cosmos_max_throughput      = local.cosmos_max_throughput
  is_prod                    = local.is_prod
  tags                       = local.common_tags

  depends_on = [module.networking]
}

# ── App Service Module ────────────────────────────────────────
# IMPORTANT: App Service is deployed BEFORE Key Vault so we can
# capture the Managed Identity principal_id for Key Vault access policies.
module "app_service" {
  source = "./modules/app_service"

  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  app_plan_name       = "${var.app_plan_name}${local.suffix}"
  app_service_sku     = local.app_service_sku
  frontend_app_name   = "${var.frontend_app_name}${local.suffix}"
  backend_app_name    = "${var.backend_app_name}${local.suffix}"
  frontend_subnet_id  = module.networking.frontend_subnet_id
  backend_subnet_id   = module.networking.backend_subnet_id
  acr_login_server    = module.acr.login_server
  acr_id              = module.acr.acr_id
  frontend_image      = var.frontend_image
  backend_image_tag   = var.backend_image_tag
  acr_name            = var.acr_name
  mongodb_uri         = module.cosmos_db.primary_mongodb_connection_string
  key_vault_id        = module.key_vault.vault_id
  key_vault_uri       = module.key_vault.vault_uri
  is_prod             = local.is_prod
  force_replace       = var.force_replace_app_service
  tags                = local.common_tags

  depends_on = [module.networking, module.acr, module.key_vault]
}

# ── Key Vault Module ──────────────────────────────────────────
module "key_vault" {
  source = "./modules/key_vault"

  resource_group_name          = azurerm_resource_group.main.name
  location                     = var.location
  key_vault_name               = "${var.key_vault_name}${local.suffix}"
  tenant_id                    = var.tenant_id
  object_id                    = data.azurerm_client_config.current.object_id
  private_endpoint_subnet_id   = module.networking.private_ep_subnet_id
  keyvault_private_dns_zone_id = module.networking.keyvault_private_dns_zone_id
  vnet_id                      = module.networking.vnet_id
  mongodb_uri                  = module.cosmos_db.primary_mongodb_connection_string
  is_prod                      = local.is_prod
  tags                         = local.common_tags

  depends_on = [module.networking, module.cosmos_db]
}

# ── Application Gateway Module ────────────────────────────────
module "app_gateway" {
  source = "./modules/app_gateway"

  resource_group_name  = azurerm_resource_group.main.name
  location             = var.location
  appgw_name           = "${var.appgw_name}${local.suffix}"
  appgw_public_ip_name = "${var.appgw_public_ip_name}${local.suffix}"
  appgw_subnet_id      = module.networking.appgw_subnet_id
  frontend_fqdn        = module.app_service.frontend_fqdn
  backend_fqdn         = module.app_service.backend_fqdn
  appgw_capacity       = local.appgw_capacity
  waf_mode             = local.waf_mode
  tags                 = local.common_tags

  depends_on = [module.app_service]
}
