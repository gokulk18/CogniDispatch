variable "resource_group_name" {
  type        = string
  description = "Resource group name."
}

variable "location" {
  type        = string
  description = "Azure region."
}

variable "app_plan_name" {
  type        = string
  description = "App Service Plan name."
}

variable "app_service_sku" {
  type        = string
  description = "App Service Plan SKU (e.g. B2, P2v3)."
}

variable "frontend_app_name" {
  type        = string
  description = "Frontend App Service name."
}

variable "backend_app_name" {
  type        = string
  description = "Backend App Service name."
}

variable "frontend_subnet_id" {
  type        = string
  description = "Subnet ID for frontend VNet integration."
}

variable "backend_subnet_id" {
  type        = string
  description = "Subnet ID for backend VNet integration."
}

variable "acr_login_server" {
  type        = string
  description = "ACR login server FQDN."
}

variable "acr_id" {
  type        = string
  description = "ACR resource ID for role assignments."
}

variable "acr_name" {
  type        = string
  description = "ACR short name (used to build image URIs)."
}

variable "frontend_image" {
  type        = string
  description = "Full ACR image path for frontend."
}

variable "backend_image_tag" {
  type        = string
  default     = "v1"
  description = "Image tag for backend microservices."
}

variable "mongodb_uri" {
  type        = string
  sensitive   = true
  description = "MongoDB connection string (from Cosmos DB)."
}

variable "key_vault_id" {
  type        = string
  description = "Key Vault resource ID for Key Vault references."
}

variable "key_vault_uri" {
  type        = string
  description = "Key Vault URI for app setting references."
}

variable "is_prod" {
  type        = bool
  default     = false
  description = "Whether this is the production environment."
}

variable "force_replace" {
  type        = bool
  default     = false
  description = "Force replacement of app services (taint equivalent)."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags."
}
