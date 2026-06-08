# =============================================================
# Module: key_vault — Azure Key Vault + Secrets + Access Policies
# =============================================================

data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "main" {
  name                        = var.key_vault_name
  location                    = var.location
  resource_group_name         = var.resource_group_name
  tenant_id                   = var.tenant_id
  sku_name                    = "standard"
  soft_delete_retention_days  = 90
  purge_protection_enabled    = true  # Prevents accidental purge in prod

  # Disable public network access — only private endpoint
  public_network_access_enabled = false

  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"
  }

  tags = var.tags

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [tags]
  }
}

# ── Secret: MONGODB-URI ───────────────────────────────────────
resource "azurerm_key_vault_secret" "mongodb_uri" {
  name         = "MONGODB-URI"
  value        = var.mongodb_uri
  key_vault_id = azurerm_key_vault.main.id

  lifecycle {
    # Don't re-create the secret if the connection string value drifts
    # (Cosmos DB may rotate keys). Manage rotation separately.
    ignore_changes = [value]
  }

  depends_on = [azurerm_key_vault_access_policy.terraform_deployer]
}

# ── Access Policy: Terraform Deployer (current SP/user) ───────
resource "azurerm_key_vault_access_policy" "terraform_deployer" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = var.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  secret_permissions = [
    "Get", "List", "Set", "Delete", "Recover", "Purge"
  ]
}

# ── Access Policy: Backend App Service Managed Identity ───────
resource "azurerm_key_vault_access_policy" "backend_app" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = var.tenant_id
  object_id    = var.backend_app_principal_id

  secret_permissions = ["Get", "List"]
}

# ── Private Endpoint ─────────────────────────────────────────
resource "azurerm_private_endpoint" "keyvault" {
  name                = "pe-keyvault"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id
  tags                = var.tags

  private_service_connection {
    name                           = "psc-keyvault"
    private_connection_resource_id = azurerm_key_vault.main.id
    subresource_names              = ["vault"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "keyvault-dns-group"
    private_dns_zone_ids = [var.keyvault_private_dns_zone_id]
  }
}
