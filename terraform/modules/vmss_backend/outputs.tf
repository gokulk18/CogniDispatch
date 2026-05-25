output "vmss_name" {
  value       = azurerm_linux_virtual_machine_scale_set.backend.name
  description = "Backend VMSS name"
}

output "vmss_id" {
  value       = azurerm_linux_virtual_machine_scale_set.backend.id
  description = "Backend VMSS resource ID"
}
