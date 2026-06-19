variable "resource_group_name" {
  description = "The name of the resource group"
  type        = string
}

variable "location" {
  description = "The Azure region for the resources"
  type        = string
}

variable "bastion_subnet_id" {
  description = "The subnet ID of AzureBastionSubnet in the Hub VNet"
  type        = string
}

variable "mgmt_subnet_id" {
  description = "The subnet ID of snet-mgmt in the Spoke VNet"
  type        = string
}

variable "admin_username" {
  description = "The admin username for the Linux Jumpbox VM"
  type        = string
  default     = "azureuser"
}

variable "ssh_public_key" {
  description = "The SSH public key for the jumpbox. If empty, a password or dynamic ssh setup should be used"
  type        = string
  default     = ""
}
