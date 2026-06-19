output "public_ip_address" {
  description = "The public IP address of the Application Gateway"
  value       = azurerm_public_ip.appgw_pip.ip_address
}

output "app_gateway_id" {
  description = "The resource ID of the Application Gateway"
  value       = azurerm_application_gateway.appgw.id
}

output "app_gateway_name" {
  description = "The name of the Application Gateway"
  value       = azurerm_application_gateway.appgw.name
}
