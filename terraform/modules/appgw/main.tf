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
  # -------------------------------------------------------------------------
  # Backend Address Pools (Pointing to FQDNs of App Services)
  # -------------------------------------------------------------------------
  backend_address_pool {
    name  = "frontend-pool"
    fqdns = [var.frontend_hostname]
  }

  backend_address_pool {
    name  = "auth-pool"
    fqdns = [var.auth_hostname]
  }

  backend_address_pool {
    name  = "vendor-pool"
    fqdns = [var.vendor_hostname]
  }

  backend_address_pool {
    name  = "ai-pool"
    fqdns = [var.ai_hostname]
  }

  backend_address_pool {
    name  = "admin-pool"
    fqdns = [var.admin_hostname]
  }

  backend_address_pool {
    name  = "dispatch-pool"
    fqdns = [var.dispatch_hostname]
  }

  # -------------------------------------------------------------------------
  # Health Probes for Backend Services
  # -------------------------------------------------------------------------
  probe {
    name                                      = "frontend-health-probe"
    protocol                                  = "Https"
    path                                      = "/"
    interval                                  = 30
    timeout                                   = 30
    unhealthy_threshold                       = 3
    pick_host_name_from_backend_http_settings = true
  }

  probe {
    name                                      = "auth-health-probe"
    protocol                                  = "Https"
    path                                      = "/api/auth/health"
    interval                                  = 30
    timeout                                   = 30
    unhealthy_threshold                       = 3
    pick_host_name_from_backend_http_settings = true
  }

  probe {
    name                                      = "vendor-health-probe"
    protocol                                  = "Https"
    path                                      = "/api/vendors/health"
    interval                                  = 30
    timeout                                   = 30
    unhealthy_threshold                       = 3
    pick_host_name_from_backend_http_settings = true
  }

  probe {
    name                                      = "ai-health-probe"
    protocol                                  = "Https"
    path                                      = "/api/ai/health"
    interval                                  = 30
    timeout                                   = 30
    unhealthy_threshold                       = 3
    pick_host_name_from_backend_http_settings = true
  }

  probe {
    name                                      = "admin-health-probe"
    protocol                                  = "Https"
    path                                      = "/api/admin/health"
    interval                                  = 30
    timeout                                   = 30
    unhealthy_threshold                       = 3
    pick_host_name_from_backend_http_settings = true
  }

  probe {
    name                                      = "dispatch-health-probe"
    protocol                                  = "Https"
    path                                      = "/api/dispatches/health"
    interval                                  = 30
    timeout                                   = 30
    unhealthy_threshold                       = 3
    pick_host_name_from_backend_http_settings = true
  }

  # -------------------------------------------------------------------------
  # Backend HTTP Settings
  # -------------------------------------------------------------------------
  backend_http_settings {
    name                                = "frontend-http-settings"
    cookie_based_affinity               = "Disabled"
    port                                = 443
    protocol                            = "Https"
    request_timeout                     = 60
    pick_host_name_from_backend_address = true
    probe_name                          = "frontend-health-probe"
  }

  backend_http_settings {
    name                                = "auth-http-settings"
    cookie_based_affinity               = "Disabled"
    port                                = 443
    protocol                            = "Https"
    request_timeout                     = 60
    pick_host_name_from_backend_address = true
    probe_name                          = "auth-health-probe"
  }

  backend_http_settings {
    name                                = "vendor-http-settings"
    cookie_based_affinity               = "Disabled"
    port                                = 443
    protocol                            = "Https"
    request_timeout                     = 60
    pick_host_name_from_backend_address = true
    probe_name                          = "vendor-health-probe"
  }

  backend_http_settings {
    name                                = "ai-http-settings"
    cookie_based_affinity               = "Disabled"
    port                                = 443
    protocol                            = "Https"
    request_timeout                     = 120
    pick_host_name_from_backend_address = true
    probe_name                          = "ai-health-probe"
  }

  backend_http_settings {
    name                                = "admin-http-settings"
    cookie_based_affinity               = "Disabled"
    port                                = 443
    protocol                            = "Https"
    request_timeout                     = 60
    pick_host_name_from_backend_address = true
    probe_name                          = "admin-health-probe"
  }

  backend_http_settings {
    name                                = "dispatch-http-settings"
    cookie_based_affinity               = "Disabled"
    port                                = 443
    protocol                            = "Https"
    request_timeout                     = 120
    pick_host_name_from_backend_address = true
    probe_name                          = "dispatch-health-probe"
  }

  backend_http_settings {
    name                                = "dispatch-ws-settings"
    cookie_based_affinity               = "Enabled"
    affinity_cookie_name                = "ARRAffinity"
    port                                = 443
    protocol                            = "Https"
    request_timeout                     = 3600
    pick_host_name_from_backend_address = true
    probe_name                          = "dispatch-health-probe"
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
      backend_address_pool_name  = "auth-pool"
      backend_http_settings_name = "auth-http-settings"
    }

    path_rule {
      name                       = "vendors-rule"
      paths                      = ["/api/vendors/*"]
      backend_address_pool_name  = "vendor-pool"
      backend_http_settings_name = "vendor-http-settings"
    }

    path_rule {
      name                       = "ai-rule"
      paths                      = ["/api/ai/*"]
      backend_address_pool_name  = "ai-pool"
      backend_http_settings_name = "ai-http-settings"
    }

    path_rule {
      name                       = "admin-rule"
      paths                      = ["/api/admin/*"]
      backend_address_pool_name  = "admin-pool"
      backend_http_settings_name = "admin-http-settings"
    }

    path_rule {
      name                       = "dispatches-rule"
      paths                      = ["/api/dispatches/*"]
      backend_address_pool_name  = "dispatch-pool"
      backend_http_settings_name = "dispatch-http-settings"
    }

    path_rule {
      name                       = "socketio-rule"
      paths                      = ["/socket.io/*"]
      backend_address_pool_name  = "dispatch-pool"
      backend_http_settings_name = "dispatch-ws-settings"
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
