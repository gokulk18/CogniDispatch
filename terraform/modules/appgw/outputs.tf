output "appgw_id" {
  description = "Application Gateway resource ID"
  value       = azurerm_application_gateway.main.id
}

output "frontend_backend_pool_id" {
  description = "Backend address pool ID for the frontend VMSS"
  value       = one([for pool in azurerm_application_gateway.main.backend_address_pool : pool.id if pool.name == "frontend-pool"])
}

output "backend_backend_pool_id" {
  description = "Backend address pool ID for the backend VMSS"
  value       = one([for pool in azurerm_application_gateway.main.backend_address_pool : pool.id if pool.name == "backend-pool"])
}
