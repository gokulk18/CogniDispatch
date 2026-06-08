# =============================================================
# Module: app_gateway — Application Gateway WAF v2
# Path-based routing: /api/* + /socket.io/* → Backend
#                     Default                → Frontend
# =============================================================

# ── Public IP ────────────────────────────────────────────────
resource "azurerm_public_ip" "appgw" {
  name                = var.appgw_public_ip_name
  location            = var.location
  resource_group_name = var.resource_group_name
  allocation_method   = "Static"
  sku                 = "Standard"
  zones               = [] # No AZ for japanwest (not AZ-supported)
  tags                = var.tags
}

# ── Application Gateway ───────────────────────────────────────
resource "azurerm_application_gateway" "main" {
  name                = var.appgw_name
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = var.tags

  sku {
    name     = "WAF_v2"
    tier     = "WAF_v2"
    capacity = var.appgw_capacity
  }

  waf_configuration {
    enabled          = true
    firewall_mode    = var.waf_mode
    rule_set_type    = "OWASP"
    rule_set_version = "3.2"
  }

  gateway_ip_configuration {
    name      = "appgw-ip-config"
    subnet_id = var.appgw_subnet_id
  }

  # ── Frontend IP ─────────────────────────────────────────────
  frontend_ip_configuration {
    name                 = "appgw-frontend-ip"
    public_ip_address_id = azurerm_public_ip.appgw.id
  }

  frontend_port {
    name = "port-80"
    port = 80
  }

  frontend_port {
    name = "port-443"
    port = 443
  }

  # ── Backend Address Pools ────────────────────────────────────
  backend_address_pool {
    name  = "pool-frontend"
    fqdns = [var.frontend_fqdn]
  }

  backend_address_pool {
    name  = "pool-backend"
    fqdns = [var.backend_fqdn]
  }

  # ── HTTP Settings — Frontend ─────────────────────────────────
  backend_http_settings {
    name                                = "http-settings-frontend"
    cookie_based_affinity               = "Disabled"
    port                                = 443
    protocol                            = "Https"
    request_timeout                     = 30
    pick_host_name_from_backend_address = true
    probe_name                          = "probe-frontend"
  }

  # ── HTTP Settings — Backend ──────────────────────────────────
  backend_http_settings {
    name                                = "http-settings-backend"
    cookie_based_affinity               = "Disabled"
    port                                = 443
    protocol                            = "Https"
    request_timeout                     = 60
    pick_host_name_from_backend_address = true
    probe_name                          = "probe-backend"
  }

  # ── Health Probes ────────────────────────────────────────────
  probe {
    name                                      = "probe-frontend"
    protocol                                  = "Https"
    path                                      = "/"
    interval                                  = 30
    timeout                                   = 30
    unhealthy_threshold                       = 3
    pick_host_name_from_backend_http_settings = true

    match {
      status_code = ["200-399"]
    }
  }

  probe {
    name                                      = "probe-backend"
    protocol                                  = "Https"
    path                                      = "/api/health"
    interval                                  = 30
    timeout                                   = 30
    unhealthy_threshold                       = 3
    pick_host_name_from_backend_http_settings = true

    match {
      status_code = ["200-399"]
    }
  }

  # ── HTTP Listener (port 80) ──────────────────────────────────
  http_listener {
    name                           = "listener-http"
    frontend_ip_configuration_name = "appgw-frontend-ip"
    frontend_port_name             = "port-80"
    protocol                       = "Http"
  }

  # ── Request Routing Rule — HTTP (redirect or route) ──────────
  request_routing_rule {
    name                       = "rule-http"
    rule_type                  = "PathBasedRouting"
    http_listener_name         = "listener-http"
    url_path_map_name          = "pathmap-main"
    priority                   = 100
  }

  # ── URL Path Map ─────────────────────────────────────────────
  url_path_map {
    name                               = "pathmap-main"
    default_backend_address_pool_name  = "pool-frontend"
    default_backend_http_settings_name = "http-settings-frontend"

    path_rule {
      name                       = "api-rule"
      paths                      = ["/api/*"]
      backend_address_pool_name  = "pool-backend"
      backend_http_settings_name = "http-settings-backend"
    }

    path_rule {
      name                       = "socketio-rule"
      paths                      = ["/socket.io/*"]
      backend_address_pool_name  = "pool-backend"
      backend_http_settings_name = "http-settings-backend"
    }
  }

  lifecycle {
    ignore_changes = [tags]
  }

  depends_on = [azurerm_public_ip.appgw]
}
