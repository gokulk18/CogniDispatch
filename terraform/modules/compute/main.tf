variable "resource_group_name" {}
variable "location" {}
variable "snet_front_vnet_id" {}
variable "snet_back_vnet_id" {}
variable "acr_login_server" {}
variable "acr_id" {}
variable "keyvault_id" {}

data "azurerm_client_config" "current" {}

resource "azurerm_service_plan" "plan" {
  name                = "plan-cognidispatch"
  resource_group_name = var.resource_group_name
  location            = var.location
  os_type             = "Linux"
  sku_name            = "B1"

  # Azure throttles App Service Plan creation per subscription (Error 429).
  # Extending the timeout lets the provider retry until the throttle window resets.
  timeouts {
    create = "60m"
    update = "30m"
    delete = "30m"
  }
}

# Frontend App Service
resource "azurerm_linux_web_app" "frontend" {
  name                = "web-cogni-frontend-99"
  resource_group_name = var.resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.plan.id

  site_config {
    always_on                               = true
    container_registry_use_managed_identity = true
    application_stack {
      docker_image_name   = "cogni-frontend:v6"
      docker_registry_url = "https://${var.acr_login_server}"
    }
  }

  app_settings = {
    "WEBSITES_PORT" = "3000"
  }

  identity {
    type = "SystemAssigned"
  }

  # VNet integration removed: subnets are in Japan West but App Service is in
  # East Asia. Azure does not support cross-region VNet integration.
  # Restore virtual_network_subnet_id once the service plan is back in Japan West.
}

# Backend App Service — runs cogni-nginx reverse proxy which routes to microservices
resource "azurerm_linux_web_app" "backend" {
  name                = "web-cogni-backend-99"
  resource_group_name = var.resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.plan.id

  site_config {
    always_on                               = true
    container_registry_use_managed_identity = true
    application_stack {
      docker_image_name   = "cogni-nginx:v2"
      docker_registry_url = "https://${var.acr_login_server}"
    }
  }

  app_settings = {
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE" = "false"
    "DOCKER_REGISTRY_SERVER_URL"          = "https://${var.acr_login_server}"
    # nginx listens on port 5000 — tell App Service to route traffic there
    "WEBSITES_PORT"                       = "5000"
  }

  identity {
    type = "SystemAssigned"
  }

  # VNet integration removed: subnets are in Japan West but App Service is in
  # East Asia. Azure does not support cross-region VNet integration.
  # Restore virtual_network_subnet_id once the service plan is back in Japan West.
}

# Role Assignment: AcrPull for Backend MI
resource "azurerm_role_assignment" "acr_pull" {
  scope                = var.acr_id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_linux_web_app.backend.identity[0].principal_id
}

# Role Assignment: Key Vault Secrets User
resource "azurerm_role_assignment" "kv_secrets_user" {
  scope                = var.keyvault_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_linux_web_app.backend.identity[0].principal_id
}

# Role Assignment: AcrPull for Frontend MI
resource "azurerm_role_assignment" "frontend_acr_pull" {
  scope                = var.acr_id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_linux_web_app.frontend.identity[0].principal_id
}

output "frontend_default_hostname" { value = azurerm_linux_web_app.frontend.default_hostname }
output "backend_default_hostname" { value = azurerm_linux_web_app.backend.default_hostname }
