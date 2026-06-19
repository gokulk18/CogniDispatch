output "key_vault_id" {
  description = "The resource ID of the Azure Key Vault"
  value       = azurerm_key_vault.kv.id
}

output "key_vault_uri" {
  description = "The vault URI of the Azure Key Vault"
  value       = azurerm_key_vault.kv.vault_uri
}

output "cosmos_db_id" {
  description = "The resource ID of the Cosmos DB Account"
  value       = azurerm_cosmosdb_account.cosmos.id
}

output "cosmos_db_endpoint" {
  description = "The endpoint of the Cosmos DB MongoDB account"
  value       = azurerm_cosmosdb_account.cosmos.endpoint
}

output "mongodb_uri" {
  description = "The MongoDB connection string for Cosmos DB"
  value       = azurerm_cosmosdb_account.cosmos.primary_mongodb_connection_string
  sensitive   = true
}
