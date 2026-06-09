output "endpoint" {
  description = "Cosmos DB document endpoint URI."
  value       = azurerm_cosmosdb_account.main.endpoint
}

output "account_name" {
  description = "Cosmos DB account name."
  value       = azurerm_cosmosdb_account.main.name
}

output "primary_mongodb_connection_string" {
  description = "Primary MongoDB connection string (sensitive)."
  value       = azurerm_cosmosdb_account.main.primary_mongodb_connection_string
  sensitive   = true
}

output "secondary_mongodb_connection_string" {
  description = "Secondary MongoDB connection string for failover (sensitive)."
  value       = azurerm_cosmosdb_account.main.secondary_mongodb_connection_string
  sensitive   = true
}

output "cosmos_id" {
  description = "Cosmos DB account resource ID."
  value       = azurerm_cosmosdb_account.main.id
}
