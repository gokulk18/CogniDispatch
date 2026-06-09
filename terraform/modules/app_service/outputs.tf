output "service_plan_id" {
  description = "App Service Plan resource ID."
  value       = azurerm_service_plan.main.id
}

output "frontend_fqdn" {
  description = "Frontend App Service default hostname (FQDN)."
  value       = azurerm_linux_web_app.frontend.default_hostname
}

output "backend_fqdn" {
  description = "Backend App Service default hostname (FQDN)."
  value       = azurerm_linux_web_app.backend.default_hostname
}

output "frontend_app_id" {
  description = "Frontend App Service resource ID."
  value       = azurerm_linux_web_app.frontend.id
}

output "backend_app_id" {
  description = "Backend App Service resource ID."
  value       = azurerm_linux_web_app.backend.id
}

output "backend_principal_id" {
  description = "System-Assigned Managed Identity principal ID of the Backend App Service."
  value       = azurerm_linux_web_app.backend.identity[0].principal_id
}

output "frontend_principal_id" {
  description = "System-Assigned Managed Identity principal ID of the Frontend App Service."
  value       = azurerm_linux_web_app.frontend.identity[0].principal_id
}
