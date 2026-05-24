module "network" {
  source              = "./modules/network"
  location            = var.location
  project_name        = var.project_name
  vnet_address_space  = var.vnet_address_space
  appgw_subnet_prefix = var.appgw_subnet_prefix
  aks_subnet_prefix   = var.aks_subnet_prefix
}

module "acr" {
  source       = "./modules/acr"
  location     = var.location
  project_name = var.project_name
}

module "aks" {
  source        = "./modules/aks"
  location      = var.location
  project_name  = var.project_name
  app_rg_name   = module.acr.app_rg_name
  aks_subnet_id = module.network.aks_subnet_id
  acr_id        = module.acr.acr_id
  node_count    = var.aks_node_count
  node_size     = var.aks_node_size

  depends_on = [
    module.network,
    module.acr
  ]
}

module "appgw" {
  source          = "./modules/appgw"
  location        = var.location
  project_name    = var.project_name
  app_rg_name     = module.acr.app_rg_name
  vnet_name       = "vnet-${var.project_name}"
  appgw_subnet_id = module.network.appgw_subnet_id
  appgw_pip_id    = module.network.appgw_pip_id
  frontend_domain = var.frontend_domain
  backend_domain  = var.backend_domain

  depends_on = [
    module.network
  ]
}
