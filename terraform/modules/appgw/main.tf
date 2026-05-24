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

resource "azurerm_web_application_firewall_policy" "waf" {
  name                = "wafpolicy-${var.project_name}"
  resource_group_name = var.app_rg_name
  location            = var.location

  policy_settings {
    enabled                     = true
    mode                        = "Prevention"
    request_body_check          = true
    file_upload_limit_in_mb     = 100
    max_request_body_size_in_kb = 128
  }

  managed_rules {
    managed_rule_set {
      type    = "OWASP"
      version = "3.2"
    }
  }
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

  # Link the separate WAF Policy
  firewall_policy_id = azurerm_web_application_firewall_policy.waf.id

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
    name                                = local.backend_http_setting_name
    cookie_based_affinity               = "Disabled"
    port                                = 30500
    protocol                            = "Http"
    request_timeout                     = 300 # Long timeout for WebSockets
    probe_name                          = local.backend_probe_name
    pick_host_name_from_backend_address = true
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

  # LISTENER: Frontend (MultiSite)
  http_listener {
    name                           = "frontendListener"
    frontend_ip_configuration_name = local.frontend_ip_configuration_name
    frontend_port_name             = local.frontend_port_name
    protocol                       = "Http"
    host_name                      = var.frontend_domain
  }

  # LISTENER: Backend API (MultiSite)
  http_listener {
    name                           = "backendListener"
    frontend_ip_configuration_name = local.frontend_ip_configuration_name
    frontend_port_name             = local.frontend_port_name
    protocol                       = "Http"
    host_name                      = var.backend_domain
  }

  # ROUTING RULE: Frontend
  request_routing_rule {
    name                       = "frontendRoutingRule"
    rule_type                  = "Basic"
    http_listener_name         = "frontendListener"
    backend_address_pool_name  = local.frontend_backend_address_pool_name
    backend_http_settings_name = local.frontend_http_setting_name
    priority                   = 100
  }

  # ROUTING RULE: Backend API
  request_routing_rule {
    name                       = "backendRoutingRule"
    rule_type                  = "Basic"
    http_listener_name         = "backendListener"
    backend_address_pool_name  = local.backend_address_pool_name
    backend_http_settings_name = local.backend_http_setting_name
    priority                   = 110
  }
}
