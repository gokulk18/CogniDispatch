output "network_rg_name" {
  description = "Network resource group name"
  value       = var.resource_group_name
}

output "hub_vnet_id" {
  description = "Hub VNet resource ID"
  value       = azurerm_virtual_network.hub.id
}

output "spoke_vnet_id" {
  description = "Spoke VNet resource ID"
  value       = azurerm_virtual_network.spoke.id
}

output "appgw_subnet_id" {
  description = "Application Gateway subnet ID"
  value       = azurerm_subnet.appgw.id
}

output "frontend_subnet_id" {
  description = "Frontend VMSS subnet ID"
  value       = azurerm_subnet.frontend.id
}

output "backend_subnet_id" {
  description = "Backend VMSS subnet ID"
  value       = azurerm_subnet.backend.id
}

output "appgw_pip_id" {
  description = "Application Gateway public IP resource ID"
  value       = azurerm_public_ip.appgw.id
}

output "appgw_pip_address" {
  description = "Application Gateway public IP address"
  value       = azurerm_public_ip.appgw.ip_address
}

output "nat_public_ip" {
  description = "NAT Gateway public IP address"
  value       = azurerm_public_ip.nat.ip_address
}

output "bastion_public_ip" {
  description = "Bastion host public IP address"
  value       = azurerm_public_ip.bastion.ip_address
}
