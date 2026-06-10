terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.90.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.47.0"
    }
  }
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "stcognitfstate589b4"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}

provider "azuread" {
}

# Resource Group
resource "azurerm_resource_group" "rg" {
  name     = "rg-cognidispatch"
  location = var.location
}

# Network Module
module "network" {
  source              = "./modules/network"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
}

# Identity Module
module "identity" {
  source              = "./modules/identity"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
}

# Data Module (ACR, Cosmos DB, Key Vault)
module "data" {
  source                     = "./modules/data"
  resource_group_name        = azurerm_resource_group.rg.name
  location                   = azurerm_resource_group.rg.location
  vnet_id                    = module.network.vnet_id
  snet_private_ep_id         = module.network.snet_private_ep_id
  snet_back_vnet_id          = module.network.snet_back_vnet_id
  private_dns_zone_cosmos_id = module.network.dns_cosmos_id
  private_dns_zone_kv_id     = module.network.dns_kv_id
}

# Compute Module (App Services)
module "compute" {
  source              = "./modules/compute"
  resource_group_name = azurerm_resource_group.rg.name
  location            = var.compute_location        # East Asia to bypass 429 throttle in Japan West
  snet_front_vnet_id  = module.network.snet_front_vnet_id
  snet_back_vnet_id   = module.network.snet_back_vnet_id
  acr_login_server    = module.data.acr_login_server
  acr_id              = module.data.acr_id
  keyvault_id         = module.data.keyvault_id

  client_id     = module.identity.client_id
  client_secret = module.identity.client_secret
  tenant_id     = module.identity.tenant_id
}

# Container Apps Module
module "container_apps" {
  source              = "./modules/container_apps"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  snet_aca_id         = module.network.snet_aca_id
  acr_login_server    = module.data.acr_login_server
  acr_admin_username  = module.data.acr_admin_username
  acr_admin_password  = module.data.acr_admin_password
  mongodb_uri         = module.data.mongodb_uri
}

# App Gateway Module
module "appgw" {
  source              = "./modules/appgw"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  snet_appgw_id       = module.network.snet_appgw_id
  frontend_fqdn       = module.compute.frontend_default_hostname
  backend_fqdn        = module.container_apps.nginx_fqdn
}
