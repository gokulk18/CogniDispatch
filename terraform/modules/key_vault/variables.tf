variable "resource_group_name" {
  type        = string
  description = "Resource group name."
}

variable "location" {
  type        = string
  description = "Azure region."
}

variable "key_vault_name" {
  type        = string
  description = "Key Vault name (globally unique, 3-24 chars)."
}

variable "tenant_id" {
  type        = string
  sensitive   = true
  description = "Azure AD tenant ID."
}

variable "object_id" {
  type        = string
  description = "Object ID of the Terraform deployer (SP or user)."
}

variable "private_endpoint_subnet_id" {
  type        = string
  description = "Subnet ID for the Key Vault private endpoint."
}

variable "keyvault_private_dns_zone_id" {
  type        = string
  description = "Private DNS zone ID for Key Vault."
}

variable "vnet_id" {
  type        = string
  description = "VNet ID for DNS zone link."
}

variable "mongodb_uri" {
  type        = string
  sensitive   = true
  description = "MongoDB connection string to store as secret."
}

variable "is_prod" {
  type        = bool
  default     = false
  description = "Whether this is the production environment."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags."
}
