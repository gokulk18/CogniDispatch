output "vault_id"  { value = azurerm_key_vault.main.id }
output "vault_uri" { value = azurerm_key_vault.main.vault_uri }

output "mongodb_uri_secret_id" {
  description = "Key Vault secret URI for MONGODB-URI (use in App Service appsettings)."
  value       = "${azurerm_key_vault.main.vault_uri}secrets/MONGODB-URI/"
}
