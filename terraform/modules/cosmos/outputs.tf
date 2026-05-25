output "cosmos_account_name" {
  value       = azurerm_cosmosdb_account.main.name
  description = "Cosmos DB Account Name"
}

output "cosmos_endpoint" {
  value       = azurerm_cosmosdb_account.main.endpoint
  description = "Cosmos DB Endpoint"
}

output "cosmos_primary_key" {
  value       = azurerm_cosmosdb_account.main.primary_key
  description = "Cosmos DB Primary Key"
  sensitive   = true
}

output "cosmos_connection_string" {
  value       = "mongodb://${azurerm_cosmosdb_account.main.name}:${azurerm_cosmosdb_account.main.primary_key}@${azurerm_cosmosdb_account.main.name}.mongo.cosmos.azure.com:10255/cognidispatch?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000"
  description = "Cosmos DB Connection String"
  sensitive   = true
}
