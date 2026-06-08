output "vnet_id"              { value = azurerm_virtual_network.main.id }
output "vnet_name"            { value = azurerm_virtual_network.main.name }
output "appgw_subnet_id"      { value = azurerm_subnet.appgw.id }
output "frontend_subnet_id"   { value = azurerm_subnet.frontend.id }
output "backend_subnet_id"    { value = azurerm_subnet.backend.id }
output "private_ep_subnet_id" { value = azurerm_subnet.private_ep.id }
output "cosmos_private_dns_zone_id"  { value = azurerm_private_dns_zone.cosmos.id }
output "keyvault_private_dns_zone_id" { value = azurerm_private_dns_zone.keyvault.id }
