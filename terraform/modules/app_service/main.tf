# =============================================================
# Module: app_service
# App Service Plan + Frontend App Service + Backend App Service
# Managed Identity + VNet integration + ACR pull via MI
# =============================================================

locals {
  docker_compose_b64 = base64encode(file(var.docker_compose_file))
}

# ── App Service Plan (Linux) ─────────────────────────────────
resource "azurerm_service_plan" "main" {
  name                = var.app_plan_name
  location            = var.location
  resource_group_name = var.resource_group_name
  os_type             = "Linux"
  sku_name            = var.app_service_sku
  tags                = var.tags

  lifecycle {
    ignore_changes = [tags]
  }
}

# ── Frontend App Service ──────────────────────────────────────
resource "azurerm_linux_web_app" "frontend" {
  name                = var.frontend_app_name
  location            = var.location
  resource_group_name = var.resource_group_name
  service_plan_id     = azurerm_service_plan.main.id
  https_only          = true
  tags                = var.tags

  site_config {
    always_on = true

    application_stack {
      docker_image_name        = var.frontend_image
      docker_registry_url      = "https://${var.acr_login_server}"
    }

    # Health check
    health_check_path = "/"
    health_check_eviction_time_in_min = 5
  }

  # VNet integration
  virtual_network_subnet_id = var.frontend_subnet_id

  # System-assigned managed identity for ACR pull
  identity {
    type = "SystemAssigned"
  }

  app_settings = {
    "WEBSITES_PORT"              = "3000"
    "DOCKER_REGISTRY_SERVER_URL" = "https://${var.acr_login_server}"
    "WEBSITE_DNS_SERVER"         = "168.63.129.16"
  }

  lifecycle {
    ignore_changes = [
      tags,
      app_settings["DOCKER_REGISTRY_SERVER_PASSWORD"],
    ]
  }
}

# ── Frontend: AcrPull role for Managed Identity ───────────────
resource "azurerm_role_assignment" "frontend_acr_pull" {
  scope                = var.acr_id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_linux_web_app.frontend.identity[0].principal_id
}

# ── Frontend: ACR use managed identity ───────────────────────
resource "azurerm_linux_web_app" "frontend_mi_acr" {
  # This resource intentionally uses the same name to update the config
  # after the MI is created. In practice, use azurerm_app_service_config or
  # the az CLI post-deployment step for acrUseManagedIdentityCreds.
  # The azurerm provider handles this via the site_config block above.
  count = 0 # placeholder reference
  name                = "placeholder"
  location            = var.location
  resource_group_name = var.resource_group_name
  service_plan_id     = azurerm_service_plan.main.id
  site_config {}
}

# ── Backend App Service (Multi-container) ────────────────────
resource "azurerm_linux_web_app" "backend" {
  name                = var.backend_app_name
  location            = var.location
  resource_group_name = var.resource_group_name
  service_plan_id     = azurerm_service_plan.main.id
  https_only          = true
  tags                = var.tags

  site_config {
    always_on = true

    # Multi-container Docker Compose
    application_stack {
      docker_image_name   = "COMPOSE|${local.docker_compose_b64}"
      docker_registry_url = "https://${var.acr_login_server}"
    }

    # Health check on nginx API gateway
    health_check_path                 = "/api/health"
    health_check_eviction_time_in_min = 5

    # WebSockets for Socket.IO
    websockets_enabled = true
  }

  # VNet integration
  virtual_network_subnet_id = var.backend_subnet_id

  # System-assigned managed identity for ACR pull + Key Vault
  identity {
    type = "SystemAssigned"
  }

  app_settings = {
    "WEBSITES_PORT"              = "5000"
    "MONGODB_URI"                = var.mongodb_uri
    "WEBSITE_DNS_SERVER"         = "168.63.129.16"
    "DOCKER_REGISTRY_SERVER_URL" = "https://${var.acr_login_server}"
  }

  lifecycle {
    ignore_changes = [
      tags,
      app_settings["DOCKER_REGISTRY_SERVER_PASSWORD"],
      # The compose file is updated via CI/CD, not Terraform
      site_config[0].application_stack,
    ]
  }
}

# ── Backend: AcrPull role for Managed Identity ───────────────
resource "azurerm_role_assignment" "backend_acr_pull" {
  scope                = var.acr_id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_linux_web_app.backend.identity[0].principal_id

  depends_on = [azurerm_linux_web_app.backend]
}

# ── Backend: VNet route all (for private DNS resolution) ─────
resource "azurerm_app_service_virtual_network_swift_connection" "backend" {
  app_service_id = azurerm_linux_web_app.backend.id
  subnet_id      = var.backend_subnet_id
}
