variable "resource_group_name" {
  type        = string
  description = "Resource group name."
}

variable "location" {
  type        = string
  description = "Azure region."
}

variable "acr_name" {
  type        = string
  description = "ACR name (globally unique, alphanumeric, 5-50 chars)."
}

variable "acr_sku" {
  type        = string
  description = "ACR SKU (Basic | Standard | Premium)."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags."
}
