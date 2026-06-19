output "pod_identity_client_id" {
  description = "The client ID of the user-assigned identity for pod / Workload Identity"
  value       = azurerm_user_assigned_identity.pod_identity.client_id
}

output "pod_identity_id" {
  description = "The resource ID of the user-assigned identity for pod / Workload Identity"
  value       = azurerm_user_assigned_identity.pod_identity.id
}
