# ---------------------------------------------------------------------------
# App Service Plan (Shared by all 6 Web Apps to minimize costs)
# ---------------------------------------------------------------------------
resource "azurerm_service_plan" "main" {
  name                = "asp-${var.project_name}-linux"
  resource_group_name = var.resource_group_name
  location            = var.location
  os_type             = "Linux"
  sku_name            = "B1" # Basic B1 tier supports VNet integration & custom domains

  tags = {
    project = var.project_name
  }
}

# ---------------------------------------------------------------------------
# 1. Frontend Client Web App (Next.js)
# ---------------------------------------------------------------------------
resource "azurerm_linux_web_app" "frontend" {
  name                = "app-${var.project_name}-frontend"
  resource_group_name = var.resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    application_stack {
      node_version = "20-lts"
    }
    app_command_line = "next start"

    ip_restriction {
      name                      = "allow-appgw"
      priority                  = 100
      action                    = "Allow"
      virtual_network_subnet_id = var.appgw_subnet_id
    }
  }

  app_settings = {
    "NODE_ENV"             = "production"
    "WEBSITES_PORT"        = "3000"
  }

  virtual_network_subnet_id = var.frontend_subnet_id

  tags = {
    project = var.project_name
    role    = "frontend"
  }
}

# ---------------------------------------------------------------------------
# 2. Auth Microservice
# ---------------------------------------------------------------------------
resource "azurerm_linux_web_app" "auth" {
  name                = "app-${var.project_name}-auth"
  resource_group_name = var.resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    application_stack {
      node_version = "20-lts"
    }
    app_command_line = "node auth-service/server.js"

    ip_restriction {
      name                      = "allow-appgw"
      priority                  = 100
      action                    = "Allow"
      virtual_network_subnet_id = var.appgw_subnet_id
    }
  }

  app_settings = {
    "NODE_ENV"            = "production"
    "MONGODB_URI"         = var.mongodb_uri
  }

  virtual_network_subnet_id = var.backend_subnet_id

  tags = {
    project = var.project_name
    role    = "backend"
  }
}

# ---------------------------------------------------------------------------
# 3. Vendor Microservice
# ---------------------------------------------------------------------------
resource "azurerm_linux_web_app" "vendor" {
  name                = "app-${var.project_name}-vendor"
  resource_group_name = var.resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    application_stack {
      node_version = "20-lts"
    }
    app_command_line = "node vendor-service/server.js"

    ip_restriction {
      name                      = "allow-appgw"
      priority                  = 100
      action                    = "Allow"
      virtual_network_subnet_id = var.appgw_subnet_id
    }
  }

  app_settings = {
    "NODE_ENV"            = "production"
    "MONGODB_URI"         = var.mongodb_uri
  }

  virtual_network_subnet_id = var.backend_subnet_id

  tags = {
    project = var.project_name
    role    = "backend"
  }
}

# ---------------------------------------------------------------------------
# 4. AI Microservice
# ---------------------------------------------------------------------------
resource "azurerm_linux_web_app" "ai" {
  name                = "app-${var.project_name}-ai"
  resource_group_name = var.resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    application_stack {
      node_version = "20-lts"
    }
    app_command_line = "node ai-service/server.js"

    ip_restriction {
      name                      = "allow-appgw"
      priority                  = 100
      action                    = "Allow"
      virtual_network_subnet_id = var.appgw_subnet_id
    }
  }

  app_settings = {
    "NODE_ENV"                = "production"
    "MONGODB_URI"             = var.mongodb_uri
    "AZURE_OPENAI_ENDPOINT"   = var.azure_openai_endpoint
    "AZURE_OPENAI_KEY"        = var.azure_openai_key
    "AZURE_OPENAI_DEPLOYMENT" = var.azure_openai_deployment
    "AZURE_SPEECH_REGION"     = var.azure_speech_region
    "AZURE_SPEECH_KEY"        = var.azure_speech_key
  }

  virtual_network_subnet_id = var.backend_subnet_id

  tags = {
    project = var.project_name
    role    = "backend"
  }
}

# ---------------------------------------------------------------------------
# 5. Admin Microservice
# ---------------------------------------------------------------------------
resource "azurerm_linux_web_app" "admin" {
  name                = "app-${var.project_name}-admin"
  resource_group_name = var.resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    application_stack {
      node_version = "20-lts"
    }
    app_command_line = "node admin-service/server.js"

    ip_restriction {
      name                      = "allow-appgw"
      priority                  = 100
      action                    = "Allow"
      virtual_network_subnet_id = var.appgw_subnet_id
    }
  }

  app_settings = {
    "NODE_ENV"            = "production"
    "MONGODB_URI"         = var.mongodb_uri
  }

  virtual_network_subnet_id = var.backend_subnet_id

  tags = {
    project = var.project_name
    role    = "backend"
  }
}

# ---------------------------------------------------------------------------
# 6. Dispatch Microservice (Handles Socket.IO and WebSockets)
# ---------------------------------------------------------------------------
resource "azurerm_linux_web_app" "dispatch" {
  name                = "app-${var.project_name}-dispatch"
  resource_group_name = var.resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    application_stack {
      node_version = "20-lts"
    }
    app_command_line = "node dispatch-service/server.js"
    web_sockets_enabled = true # Crucial for real-time Socket.IO communication

    ip_restriction {
      name                      = "allow-appgw"
      priority                  = 100
      action                    = "Allow"
      virtual_network_subnet_id = var.appgw_subnet_id
    }
  }

  app_settings = {
    "NODE_ENV"            = "production"
    "MONGODB_URI"         = var.mongodb_uri
  }

  # Enable session stickiness so Socket.IO client handshakes hit the same instance
  client_affinity_enabled = true 

  virtual_network_subnet_id = var.backend_subnet_id

  tags = {
    project = var.project_name
    role    = "backend"
  }
}
