output "openai_endpoint" {
  description = "The endpoint of the Azure OpenAI account"
  value       = azurerm_cognitive_account.openai.endpoint
}

output "openai_id" {
  description = "The resource ID of the Azure OpenAI account"
  value       = azurerm_cognitive_account.openai.id
}

output "speech_id" {
  description = "The resource ID of the Azure Speech account"
  value       = azurerm_cognitive_account.speech.id
}
