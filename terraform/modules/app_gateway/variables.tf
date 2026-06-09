variable "resource_group_name" {
  type        = string
  description = "Resource group name."
}

variable "location" {
  type        = string
  description = "Azure region."
}

variable "appgw_name" {
  type        = string
  description = "Application Gateway name."
}

variable "appgw_public_ip_name" {
  type        = string
  description = "Public IP name for App Gateway."
}

variable "appgw_subnet_id" {
  type        = string
  description = "Dedicated subnet ID for App Gateway."
}

variable "frontend_fqdn" {
  type        = string
  description = "Frontend App Service FQDN (backend pool)."
}

variable "backend_fqdn" {
  type        = string
  description = "Backend App Service FQDN (backend pool)."
}

variable "appgw_capacity" {
  type        = number
  default     = 1
  description = "App Gateway instance count."
}

variable "waf_mode" {
  type        = string
  default     = "Detection"
  description = "WAF mode: Detection or Prevention."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags."
}
