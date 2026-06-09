# =============================================================
# outputs.tf — Root Outputs (also written to remote state for cross-workspace reference)
# =============================================================

output "environment" {
  description = "Current Terraform workspace / environment."
  value       = terraform.workspace
}

output "resource_group_name" {
  description = "Resource group all resources are deployed into."
  value       = azurerm_resource_group.main.name
}

output "resource_group_id" {
  description = "Resource group ID."
  value       = azurerm_resource_group.main.id
}

# ── Networking ────────────────────────────────────────────────
output "vnet_id" {
  description = "Virtual Network resource ID."
  value       = module.networking.vnet_id
}

# ── Application Gateway ────────────────────────────────────────
output "application_gateway_public_ip" {
  description = "Public IP of the Application Gateway — point your DNS A record here."
  value       = module.app_gateway.public_ip_address
}

output "app_gateway_fqdn" {
  description = "Azure-assigned FQDN of the App Gateway public IP."
  value       = module.app_gateway.public_ip_fqdn
}

# ── App Service ────────────────────────────────────────────────
output "frontend_url" {
  description = "Direct URL of the Frontend App Service (bypasses App Gateway)."
  value       = "https://${module.app_service.frontend_fqdn}"
}

output "backend_url" {
  description = "Direct URL of the Backend App Service (bypasses App Gateway)."
  value       = "https://${module.app_service.backend_fqdn}"
}

output "frontend_app_id" {
  description = "Resource ID of the Frontend App Service."
  value       = module.app_service.frontend_app_id
}

output "backend_app_id" {
  description = "Resource ID of the Backend App Service."
  value       = module.app_service.backend_app_id
}

output "backend_managed_identity_principal_id" {
  description = "Principal ID of the Backend App Service System-Assigned Managed Identity."
  value       = module.app_service.backend_principal_id
}

output "frontend_managed_identity_principal_id" {
  description = "Principal ID of the Frontend App Service System-Assigned Managed Identity."
  value       = module.app_service.frontend_principal_id
}

# ── ACR ────────────────────────────────────────────────────────
output "acr_login_server" {
  description = "ACR login server for docker push/pull (e.g. acrcogniutrawi.azurecr.io)."
  value       = module.acr.login_server
}

output "acr_id" {
  description = "ACR resource ID."
  value       = module.acr.acr_id
}

# ── Cosmos DB ──────────────────────────────────────────────────
output "cosmos_endpoint" {
  description = "Cosmos DB document endpoint URI."
  value       = module.cosmos_db.endpoint
}

output "cosmos_account_name" {
  description = "Cosmos DB account name."
  value       = module.cosmos_db.account_name
}

# ── Key Vault ──────────────────────────────────────────────────
output "key_vault_uri" {
  description = "Key Vault URI (e.g. https://kv-cognidispatch.vault.azure.net/)."
  value       = module.key_vault.vault_uri
}

output "key_vault_id" {
  description = "Key Vault resource ID."
  value       = module.key_vault.vault_id
}

# ── App Service Plan ───────────────────────────────────────────
output "app_service_sku" {
  description = "App Service Plan SKU in this environment."
  value       = local.app_service_sku
}
