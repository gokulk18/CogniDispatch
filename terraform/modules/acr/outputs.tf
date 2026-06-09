output "login_server" {
  description = "ACR login server FQDN (e.g. acrcogniutrawi.azurecr.io)."
  value       = azurerm_container_registry.main.login_server
}

output "acr_id" {
  description = "ACR resource ID."
  value       = azurerm_container_registry.main.id
}

output "acr_name" {
  description = "ACR name."
  value       = azurerm_container_registry.main.name
}
