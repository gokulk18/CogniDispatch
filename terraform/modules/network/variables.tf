variable "location" {
  type        = string
  description = "Azure region for all network resources"
}

variable "project_name" {
  type        = string
  description = "Short project name used as resource prefix"
}

variable "hub_vnet_address_space" {
  type        = list(string)
  description = "Address space for the Hub VNet"
}

variable "spoke_vnet_address_space" {
  type        = list(string)
  description = "Address space for the Spoke VNet"
}

variable "resource_group_name" {
  type        = string
  description = "The single resource group name to deploy all resources in"
}
