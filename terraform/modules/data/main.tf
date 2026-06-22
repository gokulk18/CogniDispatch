data "azurerm_client_config" "current" {}

# Cosmos DB Account (MongoDB API)
resource "azurerm_cosmosdb_account" "cosmos" {
  name                 = "cosmos-cognidispatch-db"
  location             = "eastus2" # Match active location of CosmosDB
  resource_group_name  = var.resource_group_name
  offer_type           = "Standard"
  kind                 = "MongoDB"
  mongo_server_version = "4.2"

  consistency_policy {
    consistency_level       = "BoundedStaleness"
    max_interval_in_seconds = 300
    max_staleness_prefix    = 100000
  }

  geo_location {
    location          = "eastus2"
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

# Cosmos DB Private Endpoint
resource "azurerm_private_endpoint" "pe_cosmos" {
  name                = "pe-cosmosdb"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id

  private_service_connection {
    name                           = "psc-cosmos"
    private_connection_resource_id = azurerm_cosmosdb_account.cosmos.id
    is_manual_connection           = false
    subresource_names              = ["MongoDB"]
  }

  private_dns_zone_group {
    name                 = "cosmos-dns-zone-group"
    private_dns_zone_ids = [var.dns_zone_cosmos_id]
  }
}


# Key Vault
resource "azurerm_key_vault" "kv" {
  name                       = "cognidispatch-kv"
  location                   = var.location
  resource_group_name        = var.resource_group_name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days = 7
  purge_protection_enabled   = false
  sku_name                   = "standard"

  public_network_access_enabled = true

  # Secure Network ACLs: restrict public access, allow private traffic
  network_acls {
    bypass         = "AzureServices"
    default_action = "Deny"
    ip_rules       = []
  }

  # Grant Terraform Service Principal access
  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    secret_permissions = [
      "Get", "List", "Set", "Delete", "Purge", "Recover"
    ]
  }
}

# Key Vault Private Endpoint
resource "azurerm_private_endpoint" "pe_kv" {
  name                = "pe-keyvault"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id

  private_service_connection {
    name                           = "psc-kv"
    private_connection_resource_id = azurerm_key_vault.kv.id
    is_manual_connection           = false
    subresource_names              = ["vault"]
  }

  private_dns_zone_group {
    name                 = "kv-dns-zone-group"
    private_dns_zone_ids = [var.dns_zone_kv_id]
  }
}
