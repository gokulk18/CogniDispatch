variable "resource_group_name" {
  description = "The name of the resource group"
  type        = string
}

variable "location" {
  description = "The Azure region for the Application Gateway"
  type        = string
}

variable "subnet_id" {
  description = "The subnet ID of snet-appgw in the Hub VNet"
  type        = string
}
