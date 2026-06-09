output "vnet_id" {
  description = "VNet resource ID."
  value       = azurerm_virtual_network.main.id
}

output "vnet_name" {
  description = "VNet name."
  value       = azurerm_virtual_network.main.name
}

output "appgw_subnet_id" {
  description = "Application Gateway subnet ID."
  value       = azurerm_subnet.appgw.id
}

output "frontend_subnet_id" {
  description = "Frontend VNet integration subnet ID."
  value       = azurerm_subnet.frontend.id
}

output "backend_subnet_id" {
  description = "Backend VNet integration subnet ID."
  value       = azurerm_subnet.backend.id
}

output "private_ep_subnet_id" {
  description = "Private endpoint subnet ID."
  value       = azurerm_subnet.private_ep.id
}

output "cosmos_private_dns_zone_id" {
  description = "Private DNS zone ID for Cosmos DB (MongoDB API)."
  value       = azurerm_private_dns_zone.cosmos.id
}

output "keyvault_private_dns_zone_id" {
  description = "Private DNS zone ID for Key Vault."
  value       = azurerm_private_dns_zone.keyvault.id
}

output "acr_private_dns_zone_id" {
  description = "Private DNS zone ID for Azure Container Registry."
  value       = azurerm_private_dns_zone.acr.id
}
