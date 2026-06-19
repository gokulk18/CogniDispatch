variable "resource_group_name" {
  description = "The name of the Azure resource group to deploy resources into"
  type        = string
  default     = "test-rg"
}

variable "location" {
  description = "The primary Azure region for resource deployments"
  type        = string
  default     = "centralindia"
}

variable "jumpbox_admin_username" {
  description = "The admin username for the Linux Jumpbox VM"
  type        = string
  default     = "azureuser"
}

variable "jumpbox_ssh_public_key" {
  description = "The SSH public key for logging into the Linux Jumpbox VM. If not provided, SSH keys will not be configured."
  type        = string
  default     = ""
}
