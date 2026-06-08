# =============================================================
# Root Outputs
# =============================================================

output "resource_group_name" {
  description = "The resource group all resources are deployed into."
  value       = azurerm_resource_group.main.name
}

output "application_gateway_public_ip" {
  description = "Public IP address of the Application Gateway (point DNS here)."
  value       = module.app_gateway.public_ip_address
}

output "app_gateway_fqdn" {
  description = "Azure-provided FQDN of the App Gateway public IP."
  value       = module.app_gateway.public_ip_fqdn
}

output "frontend_url" {
  description = "Direct URL of the frontend App Service (bypasses App Gateway)."
  value       = "https://${module.app_service.frontend_fqdn}"
}

output "backend_url" {
  description = "Direct URL of the backend App Service (bypasses App Gateway)."
  value       = "https://${module.app_service.backend_fqdn}"
}

output "acr_login_server" {
  description = "ACR login server for docker push/pull commands."
  value       = module.acr.login_server
}

output "cosmos_endpoint" {
  description = "Cosmos DB document endpoint."
  value       = module.cosmos_db.endpoint
}

output "key_vault_uri" {
  description = "Key Vault URI for retrieving secrets."
  value       = module.key_vault.vault_uri
}

output "backend_managed_identity_principal_id" {
  description = "Principal ID of the Backend App Service Managed Identity."
  value       = module.app_service.backend_principal_id
}

output "workspace" {
  description = "Current Terraform workspace (environment)."
  value       = terraform.workspace
}

output "app_service_sku" {
  description = "App Service Plan SKU in use for this workspace."
  value       = local.app_service_sku
}
