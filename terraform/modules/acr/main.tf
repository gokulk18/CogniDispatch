# =============================================================
# Module: acr — Azure Container Registry
# =============================================================

resource "azurerm_container_registry" "main" {
  name                = var.acr_name
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = var.acr_sku
  admin_enabled       = false # Use Managed Identity pull — no admin password needed

  tags = var.tags

  lifecycle {
    # Prevent accidental deletion of the registry (images would be lost)
    prevent_destroy = true
    ignore_changes  = [tags]
  }
}

# ── AcrPull role for Backend App Service ─────────────────────
# This is granted in the app_service module after MI is created.
# Kept here as a data reference for documentation.
