output "bastion_host_name" {
  description = "The name of the Azure Bastion Host"
  value       = azurerm_bastion_host.bastion.name
}

output "jumpbox_private_ip" {
  description = "The private IP address of the Linux Jumpbox VM"
  value       = azurerm_linux_virtual_machine.jumpbox.private_ip_address
}
