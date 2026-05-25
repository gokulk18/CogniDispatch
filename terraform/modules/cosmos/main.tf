resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

resource "azurerm_cosmosdb_account" "main" {
  name                = "cosmos-${var.project_name}-${random_string.suffix.result}"
  resource_group_name = var.app_rg_name
  location            = var.location
  offer_type          = "Standard"
  kind                = "MongoDB"
  mongo_server_version = "4.2"

  # Enable MongoDB API + Serverless
  capabilities {
    name = "EnableMongo"
  }

  capabilities {
    name = "EnableServerless"
  }

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = var.location
    failover_priority = 0
  }

  # Allow NAT Gateway IP (VMs outbound) + Azure Portal access (0.0.0.0)
  ip_range_filter = "${var.nat_public_ip},0.0.0.0"

  is_virtual_network_filter_enabled = false
  automatic_failover_enabled         = false

  backup {
    type = "Continuous"
    tier = "Continuous7Days"
  }

  tags = {
    project = var.project_name
    role    = "database"
  }
}

resource "azurerm_cosmosdb_mongo_database" "cognidispatch" {
  name                = "cognidispatch"
  resource_group_name = var.app_rg_name
  account_name        = azurerm_cosmosdb_account.main.name
}

# Users collection
resource "azurerm_cosmosdb_mongo_collection" "users" {
  name                = "users"
  resource_group_name = var.app_rg_name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_mongo_database.cognidispatch.name

  index {
    keys   = ["_id"]
    unique = true
  }

  index {
    keys   = ["email"]
    unique = false
  }
}

# Vendors collection
resource "azurerm_cosmosdb_mongo_collection" "vendors" {
  name                = "vendors"
  resource_group_name = var.app_rg_name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_mongo_database.cognidispatch.name

  index {
    keys   = ["_id"]
    unique = true
  }

  index {
    keys   = ["category"]
    unique = false
  }

  index {
    keys   = ["busy"]
    unique = false
  }
}

# Dispatches collection
resource "azurerm_cosmosdb_mongo_collection" "dispatches" {
  name                = "dispatches"
  resource_group_name = var.app_rg_name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_mongo_database.cognidispatch.name

  index {
    keys   = ["_id"]
    unique = true
  }

  index {
    keys   = ["socketId"]
    unique = false
  }

  index {
    keys   = ["userId"]
    unique = false
  }
}
