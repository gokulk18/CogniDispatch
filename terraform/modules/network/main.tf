# virtual Networks

# Hub virtual Network
resource "azurerm_virtual_network" "hub_vnet" {
  name                = "vnet-cogni-hub"
  address_space       = ["10.220.0.0/16"]
  location            = var.location
  resource_group_name = var.resource_group_name
}

# Spoke virtual Network
resource "azurerm_virtual_network" "spoke_vnet" {
  name                = "vnet-cogni-spoke"
  address_space       = ["10.224.0.0/16"]
  location            = var.location
  resource_group_name = var.resource_group_name
}

# VNet Peering: Hub to Spoke
resource "azurerm_virtual_network_peering" "hub_to_spoke" {
  name                      = "peer-hub-to-spoke"
  resource_group_name       = var.resource_group_name
  virtual_network_name      = azurerm_virtual_network.hub_vnet.name
  remote_virtual_network_id = azurerm_virtual_network.spoke_vnet.id
  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
}

# VNet Peering: Spoke to Hub
resource "azurerm_virtual_network_peering" "spoke_to_hub" {
  name                      = "peer-spoke-to-hub"
  resource_group_name       = var.resource_group_name
  virtual_network_name      = azurerm_virtual_network.spoke_vnet.name
  remote_virtual_network_id = azurerm_virtual_network.hub_vnet.id
  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
}

# Hub Subnets
resource "azurerm_subnet" "snet_appgw" {
  name                 = "snet-appgw"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.hub_vnet.name
  address_prefixes     = ["10.220.1.0/24"]
}

resource "azurerm_subnet" "snet_bastion" {
  name                 = "AzureBastionSubnet" # Must be exactly this name
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.hub_vnet.name
  address_prefixes     = ["10.220.2.0/26"]
}

# Spoke Subnets
resource "azurerm_subnet" "snet_aks" {
  name                 = "snet-aks"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.spoke_vnet.name
  address_prefixes     = ["10.224.0.0/20"]
}

resource "azurerm_subnet" "snet_pe" {
  name                 = "snet-private-ep"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.spoke_vnet.name
  address_prefixes     = ["10.224.16.0/24"]
}

resource "azurerm_subnet" "snet_mgmt" {
  name                 = "snet-mgmt"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.spoke_vnet.name
  address_prefixes     = ["10.224.17.0/24"]
}

# Network Security Groups

# NSG for Application Gateway Subnet
resource "azurerm_network_security_group" "nsg_appgw" {
  name                = "nsg-snet-appgw"
  location            = var.location
  resource_group_name = var.resource_group_name

  security_rule {
    name                       = "Allow-HTTPS-Inbound"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_ranges    = ["80", "443"]
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-Gateway-Manager-Inbound"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "65200-65535"
    source_address_prefix      = "GatewayManager"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "appgw" {
  subnet_id                 = azurerm_subnet.snet_appgw.id
  network_security_group_id = azurerm_network_security_group.nsg_appgw.id
}

# NSG for AKS Subnet
resource "azurerm_network_security_group" "nsg_aks" {
  name                = "nsg-snet-aks"
  location            = var.location
  resource_group_name = var.resource_group_name

  # Allow Inbound from Application Gateway Subnet
  security_rule {
    name                       = "Allow-AppGW-Inbound"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "10.220.1.0/24"
    destination_address_prefix = "10.224.0.0/20"
  }

  # Allow Inbound from Management Subnet (SSH/kubectl)
  security_rule {
    name                       = "Allow-Mgmt-Inbound"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_ranges    = ["22", "443", "6443"]
    source_address_prefix      = "10.224.17.0/24"
    destination_address_prefix = "10.224.0.0/20"
  }

  # Deny all direct internet inbound
  security_rule {
    name                       = "Deny-Internet-Inbound"
    priority                   = 200
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "aks" {
  subnet_id                 = azurerm_subnet.snet_aks.id
  network_security_group_id = azurerm_network_security_group.nsg_aks.id
}

# NSG for Private Endpoints Subnet
resource "azurerm_network_security_group" "nsg_pe" {
  name                = "nsg-snet-pe"
  location            = var.location
  resource_group_name = var.resource_group_name

  # Allow inbound only from AKS and Mgmt Subnets
  security_rule {
    name                       = "Allow-AKS-Inbound"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "10.224.0.0/20"
    destination_address_prefix = "10.224.16.0/24"
  }

  security_rule {
    name                       = "Allow-Mgmt-Inbound"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "10.224.17.0/24"
    destination_address_prefix = "10.224.16.0/24"
  }

  # Deny all other inbound
  security_rule {
    name                       = "Deny-PE-Access"
    priority                   = 200
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "pe" {
  subnet_id                 = azurerm_subnet.snet_pe.id
  network_security_group_id = azurerm_network_security_group.nsg_pe.id
}

# NSG for Management (Jumpbox) Subnet
resource "azurerm_network_security_group" "nsg_mgmt" {
  name                = "nsg-snet-mgmt"
  location            = var.location
  resource_group_name = var.resource_group_name

  # Allow SSH/HTTPS from Bastion subnet only
  security_rule {
    name                       = "Allow-Bastion-Inbound"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_ranges    = ["22", "443"]
    source_address_prefix      = "10.220.2.0/26"
    destination_address_prefix = "10.224.17.0/24"
  }

  # Deny direct internet access
  security_rule {
    name                       = "Deny-Internet-Inbound"
    priority                   = 200
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "mgmt" {
  subnet_id                 = azurerm_subnet.snet_mgmt.id
  network_security_group_id = azurerm_network_security_group.nsg_mgmt.id
}


# Private DNS Zones and Virtual Network Links

locals {
  dns_zones = {
    cosmos  = "privatelink.mongo.cosmos.azure.com"
    kv      = "privatelink.vaultcore.azure.net"
    acr     = "privatelink.azurecr.io"
    openai  = "privatelink.openai.azure.com"
    speech  = "privatelink.cognitiveservices.azure.com"
  }
}

resource "azurerm_private_dns_zone" "dns_cosmos" {
  name                = local.dns_zones.cosmos
  resource_group_name = var.resource_group_name
}

resource "azurerm_private_dns_zone_virtual_network_link" "dns_cosmos_hub" {
  name                  = "link-cosmos-hub"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.dns_cosmos.name
  virtual_network_id    = azurerm_virtual_network.hub_vnet.id
}

resource "azurerm_private_dns_zone_virtual_network_link" "dns_cosmos_spoke" {
  name                  = "link-cosmos-spoke"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.dns_cosmos.name
  virtual_network_id    = azurerm_virtual_network.spoke_vnet.id
}

resource "azurerm_private_dns_zone" "dns_kv" {
  name                = local.dns_zones.kv
  resource_group_name = var.resource_group_name
}

resource "azurerm_private_dns_zone_virtual_network_link" "dns_kv_hub" {
  name                  = "link-kv-hub"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.dns_kv.name
  virtual_network_id    = azurerm_virtual_network.hub_vnet.id
}

resource "azurerm_private_dns_zone_virtual_network_link" "dns_kv_spoke" {
  name                  = "link-kv-spoke"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.dns_kv.name
  virtual_network_id    = azurerm_virtual_network.spoke_vnet.id
}

resource "azurerm_private_dns_zone" "dns_acr" {
  name                = local.dns_zones.acr
  resource_group_name = var.resource_group_name
}

resource "azurerm_private_dns_zone_virtual_network_link" "dns_acr_hub" {
  name                  = "link-acr-hub"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.dns_acr.name
  virtual_network_id    = azurerm_virtual_network.hub_vnet.id
}

resource "azurerm_private_dns_zone_virtual_network_link" "dns_acr_spoke" {
  name                  = "link-acr-spoke"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.dns_acr.name
  virtual_network_id    = azurerm_virtual_network.spoke_vnet.id
}

resource "azurerm_private_dns_zone" "dns_openai" {
  name                = local.dns_zones.openai
  resource_group_name = var.resource_group_name
}

resource "azurerm_private_dns_zone_virtual_network_link" "dns_openai_hub" {
  name                  = "link-openai-hub"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.dns_openai.name
  virtual_network_id    = azurerm_virtual_network.hub_vnet.id
}

resource "azurerm_private_dns_zone_virtual_network_link" "dns_openai_spoke" {
  name                  = "link-openai-spoke"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.dns_openai.name
  virtual_network_id    = azurerm_virtual_network.spoke_vnet.id
}

resource "azurerm_private_dns_zone" "dns_speech" {
  name                = local.dns_zones.speech
  resource_group_name = var.resource_group_name
}

resource "azurerm_private_dns_zone_virtual_network_link" "dns_speech_hub" {
  name                  = "link-speech-hub"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.dns_speech.name
  virtual_network_id    = azurerm_virtual_network.hub_vnet.id
}

resource "azurerm_private_dns_zone_virtual_network_link" "dns_speech_spoke" {
  name                  = "link-speech-spoke"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.dns_speech.name
  virtual_network_id    = azurerm_virtual_network.spoke_vnet.id
}

# Private DNS Zone for AKS Control Plane API Server
resource "azurerm_private_dns_zone" "dns_aks" {
  name                = "privatelink.${var.location}.azmk8s.io"
  resource_group_name = var.resource_group_name
}

resource "azurerm_private_dns_zone_virtual_network_link" "dns_aks_hub" {
  name                  = "link-aks-hub"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.dns_aks.name
  virtual_network_id    = azurerm_virtual_network.hub_vnet.id
}

resource "azurerm_private_dns_zone_virtual_network_link" "dns_aks_spoke" {
  name                  = "link-aks-spoke"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.dns_aks.name
  virtual_network_id    = azurerm_virtual_network.spoke_vnet.id
}
