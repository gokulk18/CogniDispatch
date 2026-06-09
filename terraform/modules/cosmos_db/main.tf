# =============================================================
# Module: cosmos_db — Cosmos DB (MongoDB API) + Private Endpoint
#
# Taint guidance:
#   - NEVER taint this resource — data loss risk
#   - For recovery: restore from Point-in-Time backup
#   - Connection string rotation: update secret in Key Vault
# =============================================================

resource "azurerm_cosmosdb_account" "main" {
  name                = var.cosmos_account_name
  location            = var.location
  resource_group_name = var.resource_group_name
  offer_type          = "Standard"
  kind                = "MongoDB"

  # Private network only — no public endpoint
  public_network_access_enabled     = false
  is_virtual_network_filter_enabled = false

  mongo_server_version = "4.2"

  capabilities {
    name = "EnableMongo"
  }

  capabilities {
    name = "mongoEnableDocLevelTTL"
  }

  capabilities {
    name = "EnableMongoRetryableWrites"
  }

  consistency_policy {
    consistency_level       = "Session"
    max_interval_in_seconds = 5
    max_staleness_prefix    = 100
  }

  geo_location {
    location          = var.location
    failover_priority = 0
  }

  backup {
    type = "Continuous"
    tier = "Continuous7Days"
  }

  tags = var.tags

  lifecycle {
    # Cosmos DB is stateful — NEVER destroy accidentally
    prevent_destroy = true
    ignore_changes  = [tags]
  }
}

# ── Mongo Database ────────────────────────────────────────────
resource "azurerm_cosmosdb_mongo_database" "main" {
  name                = var.cosmos_database_name
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name

  autoscale_settings {
    max_throughput = var.cosmos_max_throughput
  }
}

# ── Private Endpoint ──────────────────────────────────────────
resource "azurerm_private_endpoint" "cosmos" {
  name                = "pe-cosmosdb-${var.cosmos_account_name}"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id
  tags                = var.tags

  private_service_connection {
    name                           = "psc-cosmosdb"
    private_connection_resource_id = azurerm_cosmosdb_account.main.id
    subresource_names              = ["MongoDB"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "cosmos-dns-group"
    private_dns_zone_ids = [var.cosmos_private_dns_zone_id]
  }
}
