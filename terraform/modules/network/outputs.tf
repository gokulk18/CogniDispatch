output "hub_vnet_id" {
  description = "The ID of the Hub Virtual Network"
  value       = azurerm_virtual_network.hub_vnet.id
}

output "spoke_vnet_id" {
  description = "The ID of the Spoke Virtual Network"
  value       = azurerm_virtual_network.spoke_vnet.id
}

output "snet_appgw_id" {
  description = "The subnet ID for the Application Gateway in Hub VNet"
  value       = azurerm_subnet.snet_appgw.id
}

output "snet_bastion_id" {
  description = "The subnet ID for the Bastion Host in Hub VNet"
  value       = azurerm_subnet.snet_bastion.id
}

output "snet_aks_id" {
  description = "The subnet ID for the AKS cluster nodes/pods in Spoke VNet"
  value       = azurerm_subnet.snet_aks.id
}

output "snet_pe_id" {
  description = "The subnet ID for Private Endpoints in Spoke VNet"
  value       = azurerm_subnet.snet_pe.id
}

output "snet_mgmt_id" {
  description = "The subnet ID for the Management VM (jumpbox) in Spoke VNet"
  value       = azurerm_subnet.snet_mgmt.id
}

output "dns_cosmos_id" {
  description = "The Private DNS Zone ID for Cosmos DB"
  value       = azurerm_private_dns_zone.dns_cosmos.id
}

output "dns_kv_id" {
  description = "The Private DNS Zone ID for Key Vault"
  value       = azurerm_private_dns_zone.dns_kv.id
}

output "dns_acr_id" {
  description = "The Private DNS Zone ID for Azure Container Registry"
  value       = azurerm_private_dns_zone.dns_acr.id
}

output "dns_openai_id" {
  description = "The Private DNS Zone ID for Azure OpenAI"
  value       = azurerm_private_dns_zone.dns_openai.id
}

output "dns_speech_id" {
  description = "The Private DNS Zone ID for Azure Speech"
  value       = azurerm_private_dns_zone.dns_speech.id
}

output "dns_aks_id" {
  description = "The Private DNS Zone ID for the private AKS API server"
  value       = azurerm_private_dns_zone.dns_aks.id
}
