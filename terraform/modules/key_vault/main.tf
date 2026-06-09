# =============================================================
# Module: key_vault — Azure Key Vault + Secrets + Access Policies
#
# Secret Management Strategy:
#   1. Key Vault stores all sensitive configuration (MongoDB URI, API keys)
#   2. App Services reference secrets via @Microsoft.KeyVault() syntax
#   3. Terraform deployer gets full secret management access
#   4. Backend App Service MI gets read-only (Get, List)
#   5. Purge protection ON in prod, OFF in dev (allows easier teardown)
#   6. Private endpoint restricts access to VNet only
#
# Taint guidance:
#   - NEVER taint Key Vault directly — purge protection prevents re-creation
#   - To rotate a secret: update the secret value manually or via pipeline
#   - To recover a deleted KV: use az keyvault recover --name <kv-name>
# =============================================================

data "azurerm_client_config" "current" {}

# ── Key Vault ─────────────────────────────────────────────────
resource "azurerm_key_vault" "main" {
  name                       = var.key_vault_name
  location                   = var.location
  resource_group_name        = var.resource_group_name
  tenant_id                  = var.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = var.is_prod ? 90 : 7
  purge_protection_enabled   = var.is_prod # Production: prevent accidental purge

  # Restrict public access — only accessible via private endpoint within VNet
  public_network_access_enabled = false

  network_acls {
    default_action             = "Deny"
    bypass                     = "AzureServices"
    ip_rules                   = []
    virtual_network_subnet_ids = []
  }

  tags = var.tags

  lifecycle {
    # In prod, prevent accidental destruction
    prevent_destroy = false # Set to true in prod if desired (breaks terraform destroy)
    ignore_changes  = [tags]
  }
}

# ── Access Policy: Terraform Deployer (SP / GitHub Actions) ───
resource "azurerm_key_vault_access_policy" "terraform_deployer" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = var.tenant_id
  object_id    = var.object_id

  key_permissions = ["Get", "List", "Create", "Delete", "Recover", "Backup", "Restore"]

  secret_permissions = [
    "Get", "List", "Set", "Delete", "Recover", "Backup", "Restore", "Purge"
  ]

  certificate_permissions = ["Get", "List", "Create", "Delete", "Recover"]
}

# ── Secret: MONGODB-URI ───────────────────────────────────────
# Stored in Key Vault and referenced by backend via @Microsoft.KeyVault() in app settings
resource "azurerm_key_vault_secret" "mongodb_uri" {
  name         = "MONGODB-URI"
  value        = var.mongodb_uri
  key_vault_id = azurerm_key_vault.main.id

  content_type = "connection-string"

  tags = merge(var.tags, {
    SecretType = "ConnectionString"
    Service    = "CosmosDB"
    Rotation   = "Manual"
  })

  lifecycle {
    # Don't overwrite if key rotation has occurred outside Terraform
    ignore_changes = [value]
  }

  depends_on = [azurerm_key_vault_access_policy.terraform_deployer]
}

# ── Secret: Placeholder for JWT Secret ───────────────────────
# Populate this via pipeline or az keyvault secret set after deployment
resource "azurerm_key_vault_secret" "jwt_secret" {
  name         = "JWT-SECRET"
  value        = "REPLACE_ME_VIA_PIPELINE"
  key_vault_id = azurerm_key_vault.main.id

  content_type = "password"

  tags = merge(var.tags, {
    SecretType = "APIKey"
    Service    = "Auth"
    Rotation   = "Quarterly"
  })

  lifecycle {
    # JWT secret is rotated outside Terraform
    ignore_changes = [value]
  }

  depends_on = [azurerm_key_vault_access_policy.terraform_deployer]
}

# ── Private Endpoint ─────────────────────────────────────────
resource "azurerm_private_endpoint" "keyvault" {
  name                = "pe-${var.key_vault_name}"
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
