variable "resource_group_name" {}
variable "location" {}

# Virtual Network
resource "azurerm_virtual_network" "vnet" {
  name                = "vnet-cognidispatch"
  address_space       = ["172.16.0.0/20"]
  location            = var.location
  resource_group_name = var.resource_group_name
}

# Subnets
resource "azurerm_subnet" "snet_appgw" {
  name                 = "snet-appgw"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["172.16.0.0/24"]
}

resource "azurerm_subnet" "snet_front_vnet" {
  name                 = "snet-front-vnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["172.16.1.0/24"]
  delegation {
    name = "app_service_delegation"
    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

resource "azurerm_subnet" "snet_back_vnet" {
  name                 = "snet-back-vnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["172.16.2.0/24"]
  delegation {
    name = "app_service_delegation"
    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

resource "azurerm_subnet" "snet_private_ep" {
  name                 = "snet-private-ep"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["172.16.3.0/24"]
}

resource "azurerm_subnet" "snet_aca" {
  name                 = "snet-aca"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = ["172.16.4.0/23"]

  delegation {
    name = "aca-delegation"

    service_delegation {
      name    = "Microsoft.App/environments"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

# Network Security Groups
resource "azurerm_network_security_group" "nsg_front" {
  name                = "nsg-snet-front-vnet"
  location            = var.location
  resource_group_name = var.resource_group_name
}

resource "azurerm_subnet_network_security_group_association" "nsg_front_assoc" {
  subnet_id                 = azurerm_subnet.snet_front_vnet.id
  network_security_group_id = azurerm_network_security_group.nsg_front.id
}

resource "azurerm_network_security_group" "nsg_back" {
  name                = "nsg-snet-back-vnet"
  location            = var.location
  resource_group_name = var.resource_group_name
}

resource "azurerm_subnet_network_security_group_association" "nsg_back_assoc" {
  subnet_id                 = azurerm_subnet.snet_back_vnet.id
  network_security_group_id = azurerm_network_security_group.nsg_back.id
}

# Private DNS Zones
resource "azurerm_private_dns_zone" "dns_cosmos" {
  name                = "privatelink.mongo.cosmos.azure.com"
  resource_group_name = var.resource_group_name
}

resource "azurerm_private_dns_zone_virtual_network_link" "dns_cosmos_link" {
  name                  = "vnet-link-cosmos"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.dns_cosmos.name
  virtual_network_id    = azurerm_virtual_network.vnet.id
}

resource "azurerm_private_dns_zone" "dns_kv" {
  name                = "privatelink.vaultcore.azure.net"
  resource_group_name = var.resource_group_name
}

resource "azurerm_private_dns_zone_virtual_network_link" "dns_kv_link" {
  name                  = "vnet-link-kv"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.dns_kv.name
  virtual_network_id    = azurerm_virtual_network.vnet.id
}

output "vnet_id" { value = azurerm_virtual_network.vnet.id }
output "snet_appgw_id" { value = azurerm_subnet.snet_appgw.id }
output "snet_front_vnet_id" { value = azurerm_subnet.snet_front_vnet.id }
output "snet_back_vnet_id" { value = azurerm_subnet.snet_back_vnet.id }
output "snet_private_ep_id" { value = azurerm_subnet.snet_private_ep.id }
output "snet_aca_id" { value = azurerm_subnet.snet_aca.id }
output "dns_cosmos_id" { value = azurerm_private_dns_zone.dns_cosmos.id }
output "dns_kv_id" { value = azurerm_private_dns_zone.dns_kv.id }
