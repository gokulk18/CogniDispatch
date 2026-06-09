variable "resource_group_name" {
  type        = string
  description = "Resource group name."
}

variable "location" {
  type        = string
  description = "Azure region."
}

variable "cosmos_account_name" {
  type        = string
  description = "Cosmos DB account name (globally unique)."
}

variable "cosmos_database_name" {
  type        = string
  description = "Mongo database name."
}

variable "private_endpoint_subnet_id" {
  type        = string
  description = "Subnet ID for private endpoint."
}

variable "cosmos_private_dns_zone_id" {
  type        = string
  description = "Private DNS zone ID for Cosmos DB."
}

variable "vnet_id" {
  type        = string
  description = "VNet ID."
}

variable "cosmos_max_throughput" {
  type        = number
  default     = 1000
  description = "Max autoscale throughput for MongoDB database."
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
