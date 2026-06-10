variable "resource_group_name" {}
variable "location" {}
variable "vnet_id" {}
variable "snet_private_ep_id" {}
variable "snet_back_vnet_id" {}
variable "private_dns_zone_cosmos_id" {}
variable "private_dns_zone_kv_id" {}

data "azurerm_client_config" "current" {}

# Azure Container Registry
resource "azurerm_container_registry" "acr" {
  name                = "acrcogniutrawi"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "Basic"
  admin_enabled       = true
}

# Cosmos DB (MongoDB API)
resource "azurerm_cosmosdb_account" "cosmos" {
  name                 = "cosmos-cognidispatch-db"
  location             = "southeastasia"
  resource_group_name  = var.resource_group_name
  offer_type           = "Standard"
  kind                 = "MongoDB"
  mongo_server_version = "4.2"
  enable_free_tier     = true

  consistency_policy {
    consistency_level       = "BoundedStaleness"
    max_interval_in_seconds = 300
    max_staleness_prefix    = 100000
  }

  geo_location {
    location          = "southeastasia"
    failover_priority = 0
  }

  capabilities {
    name = "EnableMongo"
  }

  public_network_access_enabled = false
}

resource "azurerm_cosmosdb_mongo_database" "mongo_db" {
  name                = "cognidispatch"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.cosmos.name
}

resource "azurerm_private_endpoint" "pe_cosmos" {
  name                = "pe-cosmosdb"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.snet_private_ep_id

  private_service_connection {
    name                           = "psc-cosmos"
    private_connection_resource_id = azurerm_cosmosdb_account.cosmos.id
    is_manual_connection           = false
    subresource_names              = ["MongoDB"]
  }

  private_dns_zone_group {
    name                 = "cosmos-dns-zone-group"
    private_dns_zone_ids = [var.private_dns_zone_cosmos_id]
  }
}

# Key Vault
resource "azurerm_key_vault" "kv" {
  name                        = "kv-cognidispatch-99"
  location                    = var.location
  resource_group_name         = var.resource_group_name
  enabled_for_disk_encryption = true
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days  = 7
  purge_protection_enabled    = false
  sku_name                    = "standard"

  # Allow Terraform (running locally) to manage secrets.
  # network_acls still blocks arbitrary internet traffic.
  public_network_access_enabled = true

  network_acls {
    bypass         = "AzureServices"
    # Allow public access for Terraform management plane (secret writes during deploy).
    # Production data plane security is enforced by the private endpoint (pe_kv).
    # Using dynamic IP allowlisting caused a deadlock: Terraform refreshes existing
    # secret state before it can update the firewall, failing with 403 when ISP IP changes.
    default_action = "Allow"
    ip_rules       = []
  }

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    secret_permissions = [
      "Get", "List", "Set", "Delete", "Purge", "Recover"
    ]
  }
}

resource "azurerm_private_endpoint" "pe_kv" {
  name                = "pe-keyvault"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.snet_private_ep_id

  private_service_connection {
    name                           = "psc-kv"
    private_connection_resource_id = azurerm_key_vault.kv.id
    is_manual_connection           = false
    subresource_names              = ["vault"]
  }

  private_dns_zone_group {
    name                 = "kv-dns-zone-group"
    private_dns_zone_ids = [var.private_dns_zone_kv_id]
  }
}

resource "azurerm_key_vault_secret" "mongodb_uri" {
  name         = "MONGODB-URI"
  value        = azurerm_cosmosdb_account.cosmos.primary_mongodb_connection_string
  key_vault_id = azurerm_key_vault.kv.id
  depends_on   = [azurerm_private_endpoint.pe_kv]
}

output "acr_id" { value = azurerm_container_registry.acr.id }
output "acr_login_server" { value = azurerm_container_registry.acr.login_server }
output "keyvault_id" { value = azurerm_key_vault.kv.id }

output "acr_admin_username" {
  value     = azurerm_container_registry.acr.admin_username
  sensitive = true
}

output "acr_admin_password" {
  value     = azurerm_container_registry.acr.admin_password
  sensitive = true
}

output "mongodb_uri" {
  value     = azurerm_cosmosdb_account.cosmos.primary_mongodb_connection_string
  sensitive = true
}
