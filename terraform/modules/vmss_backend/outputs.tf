output "vmss_name" {
  value       = azurerm_linux_virtual_machine.backend.name
  description = "Backend VM name"
}

output "vmss_id" {
  value       = azurerm_linux_virtual_machine.backend.id
  description = "Backend VM resource ID"
}
