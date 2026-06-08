output "cosmos_account_id" { value = azurerm_cosmosdb_account.main.id }
output "endpoint"          { value = azurerm_cosmosdb_account.main.endpoint }

output "primary_mongodb_connection_string" {
  description = "Primary MongoDB connection string (sensitive)."
  value       = azurerm_cosmosdb_account.main.connection_strings[0]
  sensitive   = true
}

output "private_endpoint_ip" {
  description = "Private IP of the Cosmos DB private endpoint."
  value       = azurerm_private_endpoint.cosmos.private_service_connection[0].private_ip_address
}
