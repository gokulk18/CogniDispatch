variable "resource_group_name" {
  description = "The name of the resource group"
  type        = string
}

variable "location" {
  description = "The Azure region for the AKS cluster"
  type        = string
}

variable "subnet_id" {
  description = "The subnet ID where the AKS cluster nodes/pods should be deployed"
  type        = string
}

variable "private_dns_zone_id" {
  description = "The ID of the Private DNS Zone for the private AKS API server"
  type        = string
}
