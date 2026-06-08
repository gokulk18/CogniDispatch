output "service_plan_id"     { value = azurerm_service_plan.main.id }
output "frontend_fqdn"       { value = azurerm_linux_web_app.frontend.default_hostname }
output "backend_fqdn"        { value = azurerm_linux_web_app.backend.default_hostname }
output "frontend_app_id"     { value = azurerm_linux_web_app.frontend.id }
output "backend_app_id"      { value = azurerm_linux_web_app.backend.id }

output "backend_principal_id" {
  description = "System-assigned Managed Identity principal ID of the Backend App Service."
  value       = azurerm_linux_web_app.backend.identity[0].principal_id
}

output "frontend_principal_id" {
  description = "System-assigned Managed Identity principal ID of the Frontend App Service."
  value       = azurerm_linux_web_app.frontend.identity[0].principal_id
}
