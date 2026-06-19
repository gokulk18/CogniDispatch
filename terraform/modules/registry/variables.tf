variable "resource_group_name" {
  description = "The name of the resource group"
  type        = string
}

variable "location" {
  description = "The Azure region for the registry"
  type        = string
}

variable "subnet_id" {
  description = "The subnet ID for Private Endpoints (snet-private-ep)"
  type        = string
}

variable "dns_zone_acr_id" {
  description = "The Private DNS Zone ID for Azure Container Registry"
  type        = string
}
