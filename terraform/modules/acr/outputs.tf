output "acr_id" {
  value = azurerm_container_registry.acr.id
}

output "acr_login_server" {
  value = azurerm_container_registry.acr.login_server
}

output "app_rg_name" {
  value = azurerm_resource_group.app.name
}

output "app_rg_location" {
  value = azurerm_resource_group.app.location
}
