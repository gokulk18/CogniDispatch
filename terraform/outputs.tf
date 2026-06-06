output "appgw_public_ip" {
  description = "Point this IP in GoDaddy DNS for cognidispatch.g0ku1.online (A record)"
  value       = module.network.appgw_pip_address
}

output "nat_public_ip" {
  description = "NAT Gateway public IP — add to Cosmos DB IP allowlist"
  value       = module.network.nat_public_ip
}

output "bastion_public_ip" {
  description = "Azure Bastion public IP (use Azure Portal to connect to VMs)"
  value       = module.network.bastion_public_ip
}

output "cosmos_connection_string" {
  description = "Cosmos DB MongoDB connection string — copy this into terraform.tfvars mongodb_uri after first apply"
  value       = module.cosmos.cosmos_connection_string
  sensitive   = true
}

output "cosmos_account_name" {
  description = "Cosmos DB account name"
  value       = module.cosmos.cosmos_account_name
}

output "frontend_app_url" {
  description = "Public URL of the Next.js Frontend App Service"
  value       = module.app_services.frontend_hostname
}

output "dispatch_service_url" {
  description = "Default domain of the Dispatch socket service"
  value       = module.app_services.dispatch_hostname
}

output "network_rg" {
  description = "Network resource group name"
  value       = module.network.network_rg_name
}

output "app_rg" {
  description = "Application resource group name"
  value       = azurerm_resource_group.app.name
}
