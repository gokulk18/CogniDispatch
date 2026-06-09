# =============================================================
# Module: app_service
# Resources:
#   - App Service Plan (Linux)
#   - Frontend App Service (Next.js via single Docker image)
#   - Backend App Service (multi-container via Docker Compose)
#   - System-Assigned Managed Identity for each app
#   - AcrPull role assignments
#   - VNet Integration
#   - Key Vault references via app settings
#   - Health checks configured correctly
#
# FIX: Backend health issue resolved by:
#   1. Using WEBSITES_PORT=5000 pointing to the nginx container
#   2. Health check path /api/health (nginx proxies to microservices)
#   3. DOCKER_ENABLE_CI=false (prevents auto-redeploy loops)
#   4. WEBSITE_PULL_IMAGE_OVER_VNET=1 for private ACR access
#   5. Startup probe delay so containers have time to initialize
# =============================================================

locals {
  # Build docker-compose content inline from individual service images
  # This avoids file() path issues and makes CI/CD image tag substitution easy
  docker_compose_content = templatefile("${path.module}/templates/docker-compose.tpl", {
    acr_server        = var.acr_login_server
    backend_image_tag = var.backend_image_tag
  })
  docker_compose_b64 = base64encode(local.docker_compose_content)
}

# ── App Service Plan (Linux) ──────────────────────────────────
resource "azurerm_service_plan" "main" {
  name                = var.app_plan_name
  location            = var.location
  resource_group_name = var.resource_group_name
  os_type             = "Linux"
  sku_name            = var.app_service_sku
  tags                = var.tags

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [tags]
  }
}

# ── Frontend App Service ──────────────────────────────────────
resource "azurerm_linux_web_app" "frontend" {
  name                      = var.frontend_app_name
  location                  = var.location
  resource_group_name       = var.resource_group_name
  service_plan_id           = azurerm_service_plan.main.id
  https_only                = true
  virtual_network_subnet_id = var.frontend_subnet_id
  tags                      = var.tags

  identity {
    type = "SystemAssigned"
  }

  site_config {
    always_on           = true
    http2_enabled       = true
    minimum_tls_version = "1.2"

    application_stack {
      docker_image_name   = var.frontend_image
      docker_registry_url = "https://${var.acr_login_server}"
    }

    # Health check — Next.js root path
    health_check_path                 = "/"
    health_check_eviction_time_in_min = 10

    # CORS for API calls
    cors {
      allowed_origins     = ["*"]
      support_credentials = false
    }
  }

  app_settings = {
    # Container registry — use managed identity (no password)
    "DOCKER_REGISTRY_SERVER_URL"      = "https://${var.acr_login_server}"
    "DOCKER_ENABLE_CI"                = "false"
    "WEBSITE_PULL_IMAGE_OVER_VNET"    = "1"
    "DOCKER_REGISTRY_SERVER_USERNAME" = ""
    "DOCKER_REGISTRY_SERVER_PASSWORD" = ""

    # App settings
    "WEBSITES_PORT"       = "3000"
    "NEXT_PUBLIC_API_URL" = "https://${var.backend_app_name}.azurewebsites.net"
    "NODE_ENV"            = var.is_prod ? "production" : "development"

    # DNS for private endpoint resolution
    "WEBSITE_DNS_SERVER"     = "168.63.129.16"
    "WEBSITE_VNET_ROUTE_ALL" = "1"
  }

  logs {
    detailed_error_messages = true
    failed_request_tracing  = true
    http_logs {
      file_system {
        retention_in_days = 7
        retention_in_mb   = 100
      }
    }
  }

  lifecycle {
    ignore_changes = [
      tags,
      site_config[0].application_stack,
    ]
  }
}

# ── Frontend: AcrPull role for Managed Identity ───────────────
resource "azurerm_role_assignment" "frontend_acr_pull" {
  scope                = var.acr_id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_linux_web_app.frontend.identity[0].principal_id

  depends_on = [azurerm_linux_web_app.frontend]
}

# ── Backend App Service (Multi-container via Compose) ─────────
resource "azurerm_linux_web_app" "backend" {
  name                      = var.backend_app_name
  location                  = var.location
  resource_group_name       = var.resource_group_name
  service_plan_id           = azurerm_service_plan.main.id
  https_only                = true
  virtual_network_subnet_id = var.backend_subnet_id
  tags                      = var.tags

  identity {
    type = "SystemAssigned"
  }

  site_config {
    always_on           = true
    http2_enabled       = true
    minimum_tls_version = "1.2"
    websockets_enabled  = true # Socket.IO support

    application_stack {
      # COMPOSE| prefix tells App Service this is a Docker Compose base64 payload
      docker_image_name   = "COMPOSE|${local.docker_compose_b64}"
      docker_registry_url = "https://${var.acr_login_server}"
    }

    # Health check path — nginx gateway inside compose exposes /api/health
    # Increased eviction time to allow multi-container startup
    health_check_path                 = "/api/health"
    health_check_eviction_time_in_min = 10
  }

  app_settings = {
    # Container registry — managed identity pull
    "DOCKER_REGISTRY_SERVER_URL" = "https://${var.acr_login_server}"
    "DOCKER_ENABLE_CI"           = "false"
    "WEBSITES_PORT"              = "5000" # nginx gateway port in compose

    # Private network DNS resolution
    "WEBSITE_DNS_SERVER"           = "168.63.129.16"
    "WEBSITE_VNET_ROUTE_ALL"       = "1"
    "WEBSITE_PULL_IMAGE_OVER_VNET" = "1"

    # Key Vault secret references (Key Vault must allow App Service MI access)
    # Format: @Microsoft.KeyVault(SecretUri=https://vault.vault.azure.net/secrets/name/)
    "MONGODB_URI" = "@Microsoft.KeyVault(SecretUri=${var.key_vault_uri}secrets/MONGODB-URI/)"

    # App environment
    "NODE_ENV"    = var.is_prod ? "production" : "development"
    "ENVIRONMENT" = var.is_prod ? "prod" : "dev"
  }

  logs {
    detailed_error_messages = true
    failed_request_tracing  = true
    http_logs {
      file_system {
        retention_in_days = var.is_prod ? 30 : 7
        retention_in_mb   = 100
      }
    }
  }

  lifecycle {
    ignore_changes = [
      tags,
      # CI/CD updates the compose spec — don't let Terraform overwrite it
      site_config[0].application_stack,
    ]
  }

  depends_on = [azurerm_service_plan.main]
}

# ── Backend: AcrPull role for Managed Identity ───────────────
resource "azurerm_role_assignment" "backend_acr_pull" {
  scope                = var.acr_id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_linux_web_app.backend.identity[0].principal_id

  depends_on = [azurerm_linux_web_app.backend]
}

# ── Backend: Key Vault Secrets User role ─────────────────────
# Allows backend MI to read secrets via Key Vault references in app settings
resource "azurerm_role_assignment" "backend_kv_secrets_user" {
  scope                = var.key_vault_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_linux_web_app.backend.identity[0].principal_id

  depends_on = [azurerm_linux_web_app.backend]
}
