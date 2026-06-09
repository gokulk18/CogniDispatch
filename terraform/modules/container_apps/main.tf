variable "resource_group_name" {}
variable "location" {}
variable "snet_aca_id" {}
variable "acr_login_server" {}
variable "acr_admin_username" {}
variable "acr_admin_password" {}
variable "mongodb_uri" {}

# Azure Container Apps Environment
resource "azurerm_container_app_environment" "aca_env" {
  name                           = "cae-cognidispatch"
  location                       = var.location
  resource_group_name            = var.resource_group_name
  infrastructure_subnet_id       = var.snet_aca_id
  internal_load_balancer_enabled = false
}

# Helper local for registry config
locals {
  registry_server = var.acr_login_server
  registry_user   = var.acr_admin_username
  registry_pass   = var.acr_admin_password
}

# 1. Auth Service
resource "azurerm_container_app" "auth" {
  name                         = "auth-service"
  container_app_environment_id = azurerm_container_app_environment.aca_env.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"

  registry {
    server               = local.registry_server
    username             = local.registry_user
    password_secret_name = "acr-password"
  }

  secret {
    name  = "acr-password"
    value = local.registry_pass
  }

  secret {
    name  = "mongodb-uri"
    value = var.mongodb_uri
  }

  ingress {
    external_enabled = false
    target_port      = 5001
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    container {
      name   = "auth-service"
      image  = "${local.registry_server}/cogni-auth-service:v1"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name        = "MONGODB_URI"
        secret_name = "mongodb-uri"
      }
    }
  }
}

# 2. Vendor Service
resource "azurerm_container_app" "vendor" {
  name                         = "vendor-service"
  container_app_environment_id = azurerm_container_app_environment.aca_env.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"

  registry {
    server               = local.registry_server
    username             = local.registry_user
    password_secret_name = "acr-password"
  }

  secret {
    name  = "acr-password"
    value = local.registry_pass
  }

  secret {
    name  = "mongodb-uri"
    value = var.mongodb_uri
  }

  ingress {
    external_enabled = false
    target_port      = 5002
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    container {
      name   = "vendor-service"
      image  = "${local.registry_server}/cogni-vendor-service:v1"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name        = "MONGODB_URI"
        secret_name = "mongodb-uri"
      }
    }
  }
}

# 3. AI Service
resource "azurerm_container_app" "ai" {
  name                         = "ai-service"
  container_app_environment_id = azurerm_container_app_environment.aca_env.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"

  registry {
    server               = local.registry_server
    username             = local.registry_user
    password_secret_name = "acr-password"
  }

  secret {
    name  = "acr-password"
    value = local.registry_pass
  }

  secret {
    name  = "mongodb-uri"
    value = var.mongodb_uri
  }

  ingress {
    external_enabled = false
    target_port      = 5003
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    container {
      name   = "ai-service"
      image  = "${local.registry_server}/cogni-ai-service:v1"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name        = "MONGODB_URI"
        secret_name = "mongodb-uri"
      }

      env {
        name  = "AZURE_OPENAI_ENDPOINT"
        value = ""
      }
      env {
        name  = "AZURE_OPENAI_KEY"
        value = ""
      }
      env {
        name  = "AZURE_OPENAI_DEPLOYMENT"
        value = ""
      }
      env {
        name  = "AZURE_SPEECH_REGION"
        value = ""
      }
      env {
        name  = "AZURE_SPEECH_KEY"
        value = ""
      }
    }
  }
}

# 4. Admin Service
resource "azurerm_container_app" "admin" {
  name                         = "admin-service"
  container_app_environment_id = azurerm_container_app_environment.aca_env.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"

  registry {
    server               = local.registry_server
    username             = local.registry_user
    password_secret_name = "acr-password"
  }

  secret {
    name  = "acr-password"
    value = local.registry_pass
  }

  secret {
    name  = "mongodb-uri"
    value = var.mongodb_uri
  }

  ingress {
    external_enabled = false
    target_port      = 5004
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    container {
      name   = "admin-service"
      image  = "${local.registry_server}/cogni-admin-service:v1"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name        = "MONGODB_URI"
        secret_name = "mongodb-uri"
      }
    }
  }
}

# 5. Dispatch Service
resource "azurerm_container_app" "dispatch" {
  name                         = "dispatch-service"
  container_app_environment_id = azurerm_container_app_environment.aca_env.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"

  registry {
    server               = local.registry_server
    username             = local.registry_user
    password_secret_name = "acr-password"
  }

  secret {
    name  = "acr-password"
    value = local.registry_pass
  }

  secret {
    name  = "mongodb-uri"
    value = var.mongodb_uri
  }

  ingress {
    external_enabled = false
    target_port      = 5005
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    container {
      name   = "dispatch-service"
      image  = "${local.registry_server}/cogni-dispatch-service:v1"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name        = "MONGODB_URI"
        secret_name = "mongodb-uri"
      }
    }
  }
}

# 6. Nginx Reverse Proxy
locals {
  nginx_conf = templatefile("${path.module}/nginx-prod.conf.tpl", {
    auth_fqdn     = azurerm_container_app.auth.ingress[0].fqdn
    vendor_fqdn   = azurerm_container_app.vendor.ingress[0].fqdn
    ai_fqdn       = azurerm_container_app.ai.ingress[0].fqdn
    admin_fqdn    = azurerm_container_app.admin.ingress[0].fqdn
    dispatch_fqdn = azurerm_container_app.dispatch.ingress[0].fqdn
  })
}

resource "azurerm_container_app" "nginx" {
  name                         = "nginx"
  container_app_environment_id = azurerm_container_app_environment.aca_env.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"

  ingress {
    external_enabled           = true
    target_port                = 5000
    allow_insecure_connections = true
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  secret {
    name  = "nginx-conf"
    value = local.nginx_conf
  }

  template {
    container {
      name    = "nginx"
      image   = "nginx:alpine"
      cpu     = 0.25
      memory  = "0.5Gi"
      command = ["nginx", "-g", "daemon off;", "-c", "/etc/nginx/custom-conf/nginx-conf"]

      env {
        name  = "CONFIG_VERSION"
        value = "2"
      }

      volume_mounts {
        name = "config-volume"
        path = "/etc/nginx/custom-conf"
      }
    }

    volume {
      name         = "config-volume"
      storage_type = "Secret"
    }
  }
}

output "nginx_fqdn" {
  value = azurerm_container_app.nginx.ingress[0].fqdn
}
