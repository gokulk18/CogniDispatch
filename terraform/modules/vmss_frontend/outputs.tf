output "vmss_name" {
  description = "Frontend VMSS name"
  value       = azurerm_linux_virtual_machine_scale_set.frontend.name
}

output "vmss_id" {
  description = "Frontend VMSS resource ID"
  value       = azurerm_linux_virtual_machine_scale_set.frontend.id
}
