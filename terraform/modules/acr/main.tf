# Resource Group for App/ACR/AKS
resource "azurerm_resource_group" "app" {
  name     = "rg-${var.project_name}-app"
  location = var.location
}

# ACR Name must be globally unique and alphanumeric only
locals {
  acr_name = "acr${replace(var.project_name, "-", "")}${random_string.acr_suffix.result}"
}

resource "random_string" "acr_suffix" {
  length  = 6
  special = false
  upper   = false
}

resource "azurerm_container_registry" "acr" {
  name                = local.acr_name
  resource_group_name = azurerm_resource_group.app.name
  location            = azurerm_resource_group.app.location
  sku                 = "Standard"
  admin_enabled       = true
}
