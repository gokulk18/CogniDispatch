output "public_ip_address" {
  description = "Public IP address of the Application Gateway."
  value       = azurerm_public_ip.appgw.ip_address
}

output "public_ip_fqdn" {
  description = "Azure-assigned FQDN of the App Gateway public IP."
  value       = azurerm_public_ip.appgw.fqdn
}

output "appgw_id" {
  description = "Application Gateway resource ID."
  value       = azurerm_application_gateway.main.id
}

output "appgw_name" {
  description = "Application Gateway name."
  value       = azurerm_application_gateway.main.name
}
