variable "resource_group_name" {
  type        = string
  description = "Resource group name."
}

variable "location" {
  type        = string
  description = "Azure region."
}

variable "vnet_name" {
  type        = string
  description = "VNet name."
}

variable "vnet_address_space" {
  type        = string
  description = "VNet CIDR block."
}

variable "subnet_appgw_cidr" {
  type        = string
  description = "App Gateway subnet CIDR."
}

variable "subnet_frontend_cidr" {
  type        = string
  description = "Frontend VNet integration subnet CIDR."
}

variable "subnet_backend_cidr" {
  type        = string
  description = "Backend VNet integration subnet CIDR."
}

variable "subnet_private_ep_cidr" {
  type        = string
  description = "Private endpoint subnet CIDR."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags."
}
