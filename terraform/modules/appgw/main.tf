variable "resource_group_name" {}
variable "location" {}
variable "snet_appgw_id" {}
variable "frontend_fqdn" {}
variable "backend_fqdn" {}

# Public IP for App Gateway
resource "azurerm_public_ip" "pip_appgw" {
  name                = "pip-appgw-cognidispatch"
  resource_group_name = var.resource_group_name
  location            = var.location
  allocation_method   = "Static"
  sku                 = "Standard"
}

# WAF Policy
resource "azurerm_web_application_firewall_policy" "waf" {
  name                = "waf-cognidispatch"
  resource_group_name = var.resource_group_name
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

# Application Gateway
resource "azurerm_application_gateway" "appgw" {
  name                = "appgw-cognidispatch"
  resource_group_name = var.resource_group_name
  location            = var.location
  
  sku {
    name     = "WAF_v2"
    tier     = "WAF_v2"
    capacity = 1
  }

  ssl_policy {
    policy_type = "Predefined"
    policy_name = "AppGwSslPolicy20220101"
  }

  gateway_ip_configuration {
    name      = "appGatewayIpConfig"
    subnet_id = var.snet_appgw_id
  }

  frontend_port {
    name = "frontendPort"
    port = 80
  }

  frontend_ip_configuration {
    name                 = "appGwPublicFrontendIp"
    public_ip_address_id = azurerm_public_ip.pip_appgw.id
  }

  backend_address_pool {
    name  = "frontendPool"
    fqdns = [var.frontend_fqdn]
  }

  backend_address_pool {
    name  = "backendPool"
    fqdns = [var.backend_fqdn]
  }

  backend_http_settings {
    name                                = "httpSettingsFront"
    cookie_based_affinity               = "Disabled"
    path                                = "/"
    port                                = 80
    protocol                            = "Http"
    request_timeout                     = 60
    pick_host_name_from_backend_address = true
  }

  backend_http_settings {
    name                                = "httpSettingsBack"
    cookie_based_affinity               = "Disabled"
    port                                = 80
    protocol                            = "Http"
    request_timeout                     = 60
    pick_host_name_from_backend_address = true
  }

  http_listener {
    name                           = "listener"
    frontend_ip_configuration_name = "appGwPublicFrontendIp"
    frontend_port_name             = "frontendPort"
    protocol                       = "Http"
  }

  request_routing_rule {
    name               = "routingRule"
    rule_type          = "PathBasedRouting"
    http_listener_name = "listener"
    url_path_map_name  = "urlPathMap"
    priority           = 100
  }

  url_path_map {
    name                               = "urlPathMap"
    default_backend_address_pool_name  = "frontendPool"
    default_backend_http_settings_name = "httpSettingsFront"

    path_rule {
      name                       = "apiRule"
      paths                      = ["/api/*", "/socket.io/*"]
      backend_address_pool_name  = "backendPool"
      backend_http_settings_name = "httpSettingsBack"
    }
  }

  firewall_policy_id = azurerm_web_application_firewall_policy.waf.id
}
