# Azure Container Registry (Premium SKU is required for Private Endpoint)
resource "azurerm_container_registry" "acr" {
  name                  = "cogniregistry"
  resource_group_name   = var.resource_group_name
  location              = var.location
  sku                   = "Premium"
  admin_enabled         = false
  public_network_access_enabled = false

  tags = {
    Environment = "Production"
    Project     = "CogniDispatch"
  }
}

# ACR Private Endpoint
resource "azurerm_private_endpoint" "pe_acr" {
  name                = "pe-registry"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id

  private_service_connection {
    name                           = "psc-acr"
    private_connection_resource_id = azurerm_container_registry.acr.id
    is_manual_connection           = false
    subresource_names              = ["registry"]
  }

  private_dns_zone_group {
    name                 = "acr-dns-zone-group"
    private_dns_zone_ids = [var.dns_zone_acr_id]
  }
}
