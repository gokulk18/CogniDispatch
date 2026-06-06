resource "azurerm_resource_group" "app" {
  name     = "rg-${var.project_name}-app"
  location = var.location

  tags = {
    project     = var.project_name
    environment = "production"
    managed_by  = "terraform"
  }
}

module "network" {
  source = "./modules/network"

  location                 = var.location
  project_name             = var.project_name
  hub_vnet_address_space   = var.hub_vnet_address_space
  spoke_vnet_address_space = var.spoke_vnet_address_space
  resource_group_name      = azurerm_resource_group.app.name
}

module "cosmos" {
  source = "./modules/cosmos"

  location      = var.location
  project_name  = var.project_name
  app_rg_name   = azurerm_resource_group.app.name
  nat_public_ip = module.network.nat_public_ip

  depends_on = [module.network]
}

module "app_services" {
  source = "./modules/app_services"

  location                = var.location
  project_name            = var.project_name
  resource_group_name     = azurerm_resource_group.app.name
  frontend_subnet_id      = module.network.frontend_subnet_id
  backend_subnet_id       = module.network.backend_subnet_id
  appgw_subnet_id         = module.network.appgw_subnet_id
  mongodb_uri             = var.mongodb_uri
  azure_openai_endpoint   = var.azure_openai_endpoint
  azure_openai_key        = var.azure_openai_key
  azure_openai_deployment = var.azure_openai_deployment
  azure_speech_region     = var.azure_speech_region
  azure_speech_key        = var.azure_speech_key

  depends_on = [module.network]
}

module "appgw" {
  source = "./modules/appgw"

  location          = var.location
  project_name      = var.project_name
  network_rg_name   = module.network.network_rg_name
  appgw_subnet_id   = module.network.appgw_subnet_id
  appgw_pip_id      = module.network.appgw_pip_id
  frontend_domain   = var.frontend_domain
  app_rg_name       = azurerm_resource_group.app.name
  frontend_hostname = module.app_services.frontend_hostname
  auth_hostname     = module.app_services.auth_hostname
  vendor_hostname   = module.app_services.vendor_hostname
  ai_hostname       = module.app_services.ai_hostname
  admin_hostname    = module.app_services.admin_hostname
  dispatch_hostname = module.app_services.dispatch_hostname

  depends_on = [module.network, module.app_services]
}
