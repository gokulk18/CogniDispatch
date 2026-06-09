# =============================================================
# Module: acr — Azure Container Registry
#
# Notes:
#   - admin_enabled = false: all pulls use Managed Identity (AcrPull role)
#   - prevent_destroy = true: losing the registry loses all images
#   - SKU is environment-driven: Basic (dev), Standard (prod)
#
# Taint guidance:
#   - Taint only if registry is corrupted and can't be recovered
#   - Command: terraform taint module.acr.azurerm_container_registry.main
#   - After taint, all images must be re-pushed before app services can pull
# =============================================================

resource "azurerm_container_registry" "main" {
  name                = var.acr_name
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = var.acr_sku
  admin_enabled       = false # Managed Identity pull — no admin credentials needed

  # Enable geo-replication for Standard+ SKU (not needed for Basic)
  dynamic "georeplications" {
    for_each = var.acr_sku == "Premium" ? [1] : []
    content {
      location                = "eastasia"
      zone_redundancy_enabled = false
      tags                    = var.tags
    }
  }

  tags = var.tags

  lifecycle {
    prevent_destroy = true # Images would be lost on destroy
    ignore_changes  = [tags]
  }
}
