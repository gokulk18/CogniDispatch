variable "location" {
  type        = string
  description = "Azure region for deployment"
}

variable "project_name" {
  type        = string
  description = "Base project name (used for naming resources)"
  default     = "cognidispatch"
}

variable "vnet_address_space" {
  type        = list(string)
  description = "VNet address space"
}

variable "appgw_subnet_prefix" {
  type        = string
  description = "Address prefix for App Gateway subnet"
}

variable "aks_subnet_prefix" {
  type        = string
  description = "Address prefix for AKS subnet"
}

variable "aks_node_count" {
  type        = number
  description = "Number of nodes in the default AKS node pool"
}

variable "aks_node_size" {
  type        = string
  description = "VM size for AKS nodes"
}

variable "frontend_domain" {
  type        = string
  description = "Domain name for the frontend application"
}

variable "backend_domain" {
  type        = string
  description = "Domain name for the backend API"
}
