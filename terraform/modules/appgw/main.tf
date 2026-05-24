locals {
  frontend_port_name             = "frontendPort"
  frontend_ip_configuration_name = "appGwPublicFrontendIp"
  
  frontend_backend_address_pool_name  = "frontend-pool"
  frontend_http_setting_name          = "frontend-http-settings"
  
  backend_address_pool_name      = "backend-api-pool"
  backend_http_setting_name      = "backend-api-settings"
  backend_probe_name             = "backend-probe"
  
  listener_name                  = "appGwListener"
  routing_rule_name              = "appGwRoutingRule"
  url_path_map_name              = "appGwUrlPathMap"
}

resource "azurerm_application_gateway" "appgw" {
  name                = "appgw-${var.project_name}"
  resource_group_name = var.app_rg_name
  location            = var.location

  sku {
    name     = "WAF_v2"
    tier     = "WAF_v2"
    capacity = 2
  }

  gateway_ip_configuration {
    name      = "appGatewayIpConfig"
    subnet_id = var.appgw_subnet_id
  }

  frontend_port {
    name = local.frontend_port_name
    port = 80
  }

  frontend_ip_configuration {
    name                 = local.frontend_ip_configuration_name
    public_ip_address_id = var.appgw_pip_id
  }

  # DEFAULT POOL (Frontend Next.js)
  backend_address_pool {
    name = local.frontend_backend_address_pool_name
    # IPs will be populated automatically by AKS/ingress or manual configuration later
  }

  # API POOL (Backend Node.js)
  backend_address_pool {
    name = local.backend_address_pool_name
  }

  # HTTP SETTINGS: Frontend
  backend_http_settings {
    name                  = local.frontend_http_setting_name
    cookie_based_affinity = "Disabled"
    port                  = 30080
    protocol              = "Http"
    request_timeout       = 60
  }

  # HTTP SETTINGS: Backend API
  backend_http_settings {
    name                  = local.backend_http_setting_name
    cookie_based_affinity = "Disabled"
    port                  = 30500
    protocol              = "Http"
    request_timeout       = 300 # Long timeout for WebSockets
    probe_name            = local.backend_probe_name
  }

  # PROBE: Backend API Health
  probe {
    name                                      = local.backend_probe_name
    protocol                                  = "Http"
    path                                      = "/api/health"
    interval                                  = 30
    timeout                                   = 30
    unhealthy_threshold                       = 3
    pick_host_name_from_backend_http_settings = true
  }

  http_listener {
    name                           = local.listener_name
    frontend_ip_configuration_name = local.frontend_ip_configuration_name
    frontend_port_name             = local.frontend_port_name
    protocol                       = "Http"
  }

  # ROUTING RULE (Path-Based)
  request_routing_rule {
    name                       = local.routing_rule_name
    rule_type                  = "PathBasedRouting"
    http_listener_name         = local.listener_name
    url_path_map_name          = local.url_path_map_name
    priority                   = 100
  }

  url_path_map {
    name                               = local.url_path_map_name
    default_backend_address_pool_name  = local.frontend_backend_address_pool_name
    default_backend_http_settings_name = local.frontend_http_setting_name

    path_rule {
      name                       = "api-rule"
      paths                      = ["/api/*", "/socket.io/*"]
      backend_address_pool_name  = local.backend_address_pool_name
      backend_http_settings_name = local.backend_http_setting_name
    }
  }

  waf_configuration {
    enabled          = true
    firewall_mode    = "Prevention"
    rule_set_type    = "OWASP"
    rule_set_version = "3.2"
  }
}
