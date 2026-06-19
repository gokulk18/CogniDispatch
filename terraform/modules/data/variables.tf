variable "resource_group_name" {
  description = "The name of the resource group"
  type        = string
}

variable "location" {
  description = "The Azure region for the resources"
  type        = string
}

variable "subnet_id" {
  description = "The subnet ID for Private Endpoints (snet-private-ep)"
  type        = string
}

variable "dns_zone_cosmos_id" {
  description = "The Private DNS Zone ID for Cosmos DB"
  type        = string
}

variable "dns_zone_kv_id" {
  description = "The Private DNS Zone ID for Key Vault"
  type        = string
}
