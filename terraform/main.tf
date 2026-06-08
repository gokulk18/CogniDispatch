# =============================================================
# Root main.tf — Orchestrates all modules
# =============================================================

# ── Resource Group ───────────────────────────────────────────
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
  tags     = local.common_tags
}

# ── Networking Module ────────────────────────────────────────
module "networking" {
  source = "./modules/networking"

  resource_group_name    = azurerm_resource_group.main.name
  location               = var.location
  vnet_name              = var.vnet_name
  vnet_address_space     = var.vnet_address_space
  subnet_appgw_cidr      = var.subnet_appgw_cidr
  subnet_frontend_cidr   = var.subnet_frontend_cidr
  subnet_backend_cidr    = var.subnet_backend_cidr
  subnet_private_ep_cidr = var.subnet_private_ep_cidr
  tags                   = local.common_tags
}

# ── ACR Module ───────────────────────────────────────────────
module "acr" {
  source = "./modules/acr"

  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  acr_name            = var.acr_name
  acr_sku             = var.acr_sku
  tags                = local.common_tags
}

# ── Cosmos DB Module ─────────────────────────────────────────
module "cosmos_db" {
  source = "./modules/cosmos_db"

  resource_group_name        = azurerm_resource_group.main.name
  location                   = var.location
  cosmos_account_name        = var.cosmos_account_name
  cosmos_database_name       = var.cosmos_database_name
  private_endpoint_subnet_id = module.networking.private_ep_subnet_id
  cosmos_private_dns_zone_id = module.networking.cosmos_private_dns_zone_id
  vnet_id                    = module.networking.vnet_id
  cosmos_max_throughput      = local.cosmos_max_throughput
  tags                       = local.common_tags
}

# ── Key Vault Module ─────────────────────────────────────────
module "key_vault" {
  source = "./modules/key_vault"

  resource_group_name          = azurerm_resource_group.main.name
  location                     = var.location
  key_vault_name               = var.key_vault_name
  tenant_id                    = var.tenant_id
  private_endpoint_subnet_id   = module.networking.private_ep_subnet_id
  keyvault_private_dns_zone_id = module.networking.keyvault_private_dns_zone_id
  vnet_id                      = module.networking.vnet_id
  mongodb_uri                  = module.cosmos_db.primary_mongodb_connection_string
  backend_app_principal_id     = module.app_service.backend_principal_id
  tags                         = local.common_tags

  depends_on = [module.cosmos_db, module.app_service]
}

# ── App Service Module ───────────────────────────────────────
module "app_service" {
  source = "./modules/app_service"

  resource_group_name  = azurerm_resource_group.main.name
  location             = var.location
  app_plan_name        = var.app_plan_name
  app_service_sku      = local.app_service_sku
  frontend_app_name    = var.frontend_app_name
  backend_app_name     = var.backend_app_name
  frontend_subnet_id   = module.networking.frontend_subnet_id
  backend_subnet_id    = module.networking.backend_subnet_id
  acr_login_server     = module.acr.login_server
  acr_id               = module.acr.acr_id
  docker_compose_file  = var.docker_compose_file
  frontend_image       = var.frontend_image
  mongodb_uri          = module.cosmos_db.primary_mongodb_connection_string
  tags                 = local.common_tags
}

# ── Application Gateway Module ───────────────────────────────
module "app_gateway" {
  source = "./modules/app_gateway"

  resource_group_name    = azurerm_resource_group.main.name
  location               = var.location
  appgw_name             = var.appgw_name
  appgw_public_ip_name   = var.appgw_public_ip_name
  appgw_subnet_id        = module.networking.appgw_subnet_id
  frontend_fqdn          = module.app_service.frontend_fqdn
  backend_fqdn           = module.app_service.backend_fqdn
  appgw_capacity         = local.appgw_capacity
  waf_mode               = local.waf_mode
  tags                   = local.common_tags

  depends_on = [module.app_service]
}
