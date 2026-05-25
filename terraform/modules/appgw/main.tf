# ---------------------------------------------------------------------------
# WAF Policy
# ---------------------------------------------------------------------------
resource "azurerm_web_application_firewall_policy" "waf_policy" {
  name                = "wafpolicy-${var.project_name}"
  resource_group_name = var.app_rg_name
  location            = var.location

  policy_settings {
    enabled                     = true
    mode                        = "Prevention"
    request_body_check          = true
    max_request_body_size_in_kb = 128
    file_upload_limit_in_mb     = 100
  }

  managed_rules {
    managed_rule_set {
      type    = "OWASP"
      version = "3.2"
    }
  }

  tags = {
    project = var.project_name
  }
}

# ---------------------------------------------------------------------------
# Application Gateway (WAF_v2, autoscale)
# ---------------------------------------------------------------------------
resource "azurerm_application_gateway" "main" {
  name                = "appgw-${var.project_name}"
  resource_group_name = var.app_rg_name
  location            = var.location
  firewall_policy_id  = azurerm_web_application_firewall_policy.waf_policy.id

  sku {
    name = "WAF_v2"
    tier = "WAF_v2"
  }

  autoscale_configuration {
    min_capacity = 1
    max_capacity = 2
  }

  ssl_policy {
    policy_type = "Predefined"
    policy_name = "AppGwSslPolicy20220101"
  }

  gateway_ip_configuration {
    name      = "appgw-ip-config"
    subnet_id = var.appgw_subnet_id
  }

  frontend_port {
    name = "port-80"
    port = 80
  }

  frontend_port {
    name = "port-443"
    port = 443
  }

  frontend_ip_configuration {
    name                 = "appgw-frontend-ip"
    public_ip_address_id = var.appgw_pip_id
  }

  ssl_certificate {
    name     = "cogni-ssl-cert"
    data     = filebase64("${path.module}/../../cert.pfx")
    password = "Azureuser@123"
  }

  redirect_configuration {
    name                 = "http-to-https-redirect"
    redirect_type        = "Permanent"
    target_listener_name = "cogni-https-listener"
    include_path         = true
    include_query_string = true
  }

  # -------------------------------------------------------------------------
  # Backend Address Pools (empty — VMSS registers automatically)
  # -------------------------------------------------------------------------
  backend_address_pool {
    name = "frontend-pool"
  }

  backend_address_pool {
    name = "backend-pool"
  }

  # -------------------------------------------------------------------------
  # Health Probe for backend services
  # -------------------------------------------------------------------------
  probe {
    name                                      = "backend-health-probe"
    protocol                                  = "Http"
    path                                      = "/api/health"
    host                                      = "127.0.0.1"
    interval                                  = 30
    timeout                                   = 30
    unhealthy_threshold                       = 3
    pick_host_name_from_backend_http_settings = false

    match {
      body        = ""
      status_code = ["200-399"]
    }
  }

  # -------------------------------------------------------------------------
  # Backend HTTP Settings
  # -------------------------------------------------------------------------
  backend_http_settings {
    name                                = "frontend-http-settings"
    cookie_based_affinity               = "Disabled"
    port                                = 80
    protocol                            = "Http"
    request_timeout                     = 60
    pick_host_name_from_backend_address = false
  }

  backend_http_settings {
    name                                = "backend-api-settings"
    cookie_based_affinity               = "Disabled"
    port                                = 80
    protocol                            = "Http"
    request_timeout                     = 120
    pick_host_name_from_backend_address = false
    probe_name                          = "backend-health-probe"
  }

  backend_http_settings {
    name                                = "backend-ws-settings"
    cookie_based_affinity               = "Disabled"
    port                                = 80
    protocol                            = "Http"
    request_timeout                     = 3600
    pick_host_name_from_backend_address = false
    probe_name                          = "backend-health-probe"
  }

  # -------------------------------------------------------------------------
  # HTTP & HTTPS Listeners
  # -------------------------------------------------------------------------
  http_listener {
    name                           = "cogni-http-listener"
    frontend_ip_configuration_name = "appgw-frontend-ip"
    frontend_port_name             = "port-80"
    protocol                       = "Http"
    host_name                      = var.frontend_domain
  }

  http_listener {
    name                           = "cogni-https-listener"
    frontend_ip_configuration_name = "appgw-frontend-ip"
    frontend_port_name             = "port-443"
    protocol                       = "Https"
    host_name                      = var.frontend_domain
    ssl_certificate_name           = "cogni-ssl-cert"
  }

  # -------------------------------------------------------------------------
  # URL Path Map (path-based routing)
  # -------------------------------------------------------------------------
  url_path_map {
    name                               = "cogni-path-map"
    default_backend_address_pool_name  = "frontend-pool"
    default_backend_http_settings_name = "frontend-http-settings"

    path_rule {
      name                       = "auth-rule"
      paths                      = ["/api/auth/*"]
      backend_address_pool_name  = "backend-pool"
      backend_http_settings_name = "backend-api-settings"
    }

    path_rule {
      name                       = "vendors-rule"
      paths                      = ["/api/vendors/*"]
      backend_address_pool_name  = "backend-pool"
      backend_http_settings_name = "backend-api-settings"
    }

    path_rule {
      name                       = "ai-rule"
      paths                      = ["/api/ai/*"]
      backend_address_pool_name  = "backend-pool"
      backend_http_settings_name = "backend-api-settings"
    }

    path_rule {
      name                       = "admin-rule"
      paths                      = ["/api/admin/*"]
      backend_address_pool_name  = "backend-pool"
      backend_http_settings_name = "backend-api-settings"
    }

    path_rule {
      name                       = "dispatches-rule"
      paths                      = ["/api/dispatches/*"]
      backend_address_pool_name  = "backend-pool"
      backend_http_settings_name = "backend-api-settings"
    }

    path_rule {
      name                       = "socketio-rule"
      paths                      = ["/socket.io/*"]
      backend_address_pool_name  = "backend-pool"
      backend_http_settings_name = "backend-ws-settings"
    }

    path_rule {
      name                       = "health-rule"
      paths                      = ["/api/health"]
      backend_address_pool_name  = "backend-pool"
      backend_http_settings_name = "backend-api-settings"
    }
  }

  # -------------------------------------------------------------------------
  # Request Routing Rules (HTTP Redirect & HTTPS Routing)
  # -------------------------------------------------------------------------
  request_routing_rule {
    name                        = "cogni-http-routing-rule"
    rule_type                   = "Basic"
    http_listener_name          = "cogni-http-listener"
    redirect_configuration_name = "http-to-https-redirect"
    priority                    = 110
  }

  request_routing_rule {
    name                       = "cogni-https-routing-rule"
    rule_type                  = "PathBasedRouting"
    http_listener_name         = "cogni-https-listener"
    url_path_map_name          = "cogni-path-map"
    priority                   = 100
  }

  tags = {
    project = var.project_name
  }
}
