# Resource Group for Network
resource "azurerm_resource_group" "net" {
  name     = "rg-${var.project_name}-network"
  location = var.location
}

# Virtual Network
resource "azurerm_virtual_network" "vnet" {
  name                = "vnet-${var.project_name}"
  address_space       = var.vnet_address_space
  location            = azurerm_resource_group.net.location
  resource_group_name = azurerm_resource_group.net.name
}

# App Gateway Subnet
resource "azurerm_subnet" "appgw" {
  name                 = "snet-appgw"
  resource_group_name  = azurerm_resource_group.net.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = [var.appgw_subnet_prefix]
}

# AKS Subnet
resource "azurerm_subnet" "aks" {
  name                 = "snet-aks"
  resource_group_name  = azurerm_resource_group.net.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = [var.aks_subnet_prefix]
}

# NAT Gateway Public IP
resource "azurerm_public_ip" "nat_pip" {
  name                = "pip-natgw-${var.project_name}"
  location            = azurerm_resource_group.net.location
  resource_group_name = azurerm_resource_group.net.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

# NAT Gateway
resource "azurerm_nat_gateway" "natgw" {
  name                    = "natgw-${var.project_name}"
  location                = azurerm_resource_group.net.location
  resource_group_name     = azurerm_resource_group.net.name
  sku_name                = "Standard"
  idle_timeout_in_minutes = 10
}

# Associate Public IP to NAT GW
resource "azurerm_nat_gateway_public_ip_association" "nat_assoc" {
  nat_gateway_id       = azurerm_nat_gateway.natgw.id
  public_ip_address_id = azurerm_public_ip.nat_pip.id
}

# Associate NAT GW to AKS Subnet
resource "azurerm_subnet_nat_gateway_association" "aks_nat_assoc" {
  subnet_id      = azurerm_subnet.aks.id
  nat_gateway_id = azurerm_nat_gateway.natgw.id
}

# App Gateway NSG
resource "azurerm_network_security_group" "appgw_nsg" {
  name                = "nsg-appgw"
  location            = azurerm_resource_group.net.location
  resource_group_name = azurerm_resource_group.net.name

  security_rule {
    name                       = "Allow-HTTP-In"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-HTTPS-In"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-GatewayManager"
    priority                   = 120
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "65200-65535"
    source_address_prefix      = "GatewayManager"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-AzureLB"
    priority                   = 200
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "AzureLoadBalancer"
    destination_address_prefix = "*"
  }
}

# Associate AppGW NSG
resource "azurerm_subnet_network_security_group_association" "appgw_nsg_assoc" {
  subnet_id                 = azurerm_subnet.appgw.id
  network_security_group_id = azurerm_network_security_group.appgw_nsg.id
}

# AKS NSG
resource "azurerm_network_security_group" "aks_nsg" {
  name                = "nsg-aks"
  location            = azurerm_resource_group.net.location
  resource_group_name = azurerm_resource_group.net.name

  security_rule {
    name                       = "Allow-AppGW-NodePorts"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_ranges    = ["30080", "30500"]
    source_address_prefix      = var.appgw_subnet_prefix
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-VNet-Internal"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "Allow-AzureLB"
    priority                   = 200
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "AzureLoadBalancer"
    destination_address_prefix = "*"
  }
}

# Associate AKS NSG
resource "azurerm_subnet_network_security_group_association" "aks_nsg_assoc" {
  subnet_id                 = azurerm_subnet.aks.id
  network_security_group_id = azurerm_network_security_group.aks_nsg.id
}

# App Gateway Public IP (Provisioned here so AppGW module can reference it)
resource "azurerm_public_ip" "appgw_pip" {
  name                = "pip-appgw-${var.project_name}"
  location            = azurerm_resource_group.net.location
  resource_group_name = azurerm_resource_group.net.name
  allocation_method   = "Static"
  sku                 = "Standard"
}
