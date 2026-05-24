output "vnet_id" {
  value = azurerm_virtual_network.vnet.id
}

output "appgw_subnet_id" {
  value = azurerm_subnet.appgw.id
}

output "aks_subnet_id" {
  value = azurerm_subnet.aks.id
}

output "appgw_pip_id" {
  value = azurerm_public_ip.appgw_pip.id
}

output "appgw_pip_address" {
  value = azurerm_public_ip.appgw_pip.ip_address
}

output "network_rg_name" {
  value = azurerm_resource_group.net.name
}
