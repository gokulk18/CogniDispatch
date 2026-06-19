output "resource_group_name" {
  description = "The name of the resource group"
  value       = azurerm_resource_group.rg.name
}

output "aks_cluster_name" {
  description = "The name of the AKS cluster"
  value       = module.aks.cluster_name
}

output "aks_oidc_issuer_url" {
  description = "The OIDC issuer URL of the AKS cluster"
  value       = module.aks.oidc_issuer_url
}

output "app_gateway_public_ip" {
  description = "The public IP of the Application Gateway"
  value       = module.app_gateway.public_ip_address
}

output "bastion_host_name" {
  description = "The name of the Azure Bastion Host"
  value       = module.bastion.bastion_host_name
}

output "jumpbox_private_ip" {
  description = "The private IP address of the Linux Jumpbox VM"
  value       = module.bastion.jumpbox_private_ip
}

output "key_vault_uri" {
  description = "The URI of the Azure Key Vault"
  value       = module.data.key_vault_uri
}

output "cosmos_db_endpoint" {
  description = "The endpoint of the Cosmos DB MongoDB account"
  value       = module.data.cosmos_db_endpoint
}

output "acr_login_server" {
  description = "The login server for the Azure Container Registry"
  value       = module.registry.acr_login_server
}
