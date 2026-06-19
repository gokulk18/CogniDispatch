# Resource Group for CogniDispatch infrastructure
resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    Environment = "Production"
    Project     = "CogniDispatch"
  }
}

# Network Module: Hub & Spoke VNets, peerings, subnets, NSGs, and Private DNS Zones
module "network" {
  source              = "./modules/network"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
}

# AKS Module: Private AKS cluster
module "aks" {
  source              = "./modules/aks"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  subnet_id           = module.network.snet_aks_id
  private_dns_zone_id = module.network.dns_aks_id
}

# Application Gateway Module: Load balancer and routing ingress
module "app_gateway" {
  source              = "./modules/app_gateway"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  subnet_id           = module.network.snet_appgw_id
}

# Data Module: Key Vault and Cosmos DB (MongoDB API) with Private Endpoints
module "data" {
  source              = "./modules/data"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  subnet_id           = module.network.snet_pe_id
  dns_zone_cosmos_id  = module.network.dns_cosmos_id
  dns_zone_kv_id      = module.network.dns_kv_id
}

# Cognitive Module: Azure OpenAI and Speech Services with Private Endpoints
module "cognitive" {
  source              = "./modules/cognitive"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  subnet_id           = module.network.snet_pe_id
  dns_zone_openai_id  = module.network.dns_openai_id
  dns_zone_speech_id  = module.network.dns_speech_id
}

# Registry Module: Azure Container Registry Premium SKU with Private Endpoint
module "registry" {
  source              = "./modules/registry"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  subnet_id           = module.network.snet_pe_id
  dns_zone_acr_id     = module.network.dns_acr_id
}

# Bastion Module: Azure Bastion Host and Linux Jumpbox VM for secure shell administration
module "bastion" {
  source              = "./modules/bastion"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  bastion_subnet_id   = module.network.snet_bastion_id
  mgmt_subnet_id      = module.network.snet_mgmt_id
  admin_username      = var.jumpbox_admin_username
  ssh_public_key      = var.jumpbox_ssh_public_key
}

# Security Module: Managed identities, Workload Identity federations, and role integrations
module "security" {
  source                     = "./modules/security"
  resource_group_name        = azurerm_resource_group.rg.name
  location                   = azurerm_resource_group.rg.location
  aks_cluster_id             = module.aks.cluster_id
  aks_oidc_issuer_url        = module.aks.oidc_issuer_url
  key_vault_id               = module.data.key_vault_id
  acr_id                     = module.registry.acr_id
  app_gateway_id             = module.app_gateway.app_gateway_id
  node_resource_group        = module.aks.node_resource_group
  kubelet_identity_object_id = module.aks.kubelet_identity_object_id
}
