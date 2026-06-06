output "frontend_hostname" {
  description = "Default hostname of the frontend app service"
  value       = azurerm_linux_web_app.frontend.default_hostname
}

output "auth_hostname" {
  description = "Default hostname of the auth microservice"
  value       = azurerm_linux_web_app.auth.default_hostname
}

output "vendor_hostname" {
  description = "Default hostname of the vendor microservice"
  value       = azurerm_linux_web_app.vendor.default_hostname
}

output "ai_hostname" {
  description = "Default hostname of the ai microservice"
  value       = azurerm_linux_web_app.ai.default_hostname
}

output "admin_hostname" {
  description = "Default hostname of the admin microservice"
  value       = azurerm_linux_web_app.admin.default_hostname
}

output "dispatch_hostname" {
  description = "Default hostname of the dispatch microservice"
  value       = azurerm_linux_web_app.dispatch.default_hostname
}
