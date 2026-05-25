variable "location" {
  type        = string
  description = "Azure region for the frontend VMSS"
}

variable "project_name" {
  type        = string
  description = "Short project name used as resource prefix"
}

variable "app_rg_name" {
  type        = string
  description = "Application resource group name"
}

variable "frontend_subnet_id" {
  type        = string
  description = "Subnet ID for the frontend VMSS NICs"
}

variable "ssh_public_key" {
  type        = string
  default     = ""
  description = "SSH public key for VM access via Bastion (optional)"
}

variable "git_repo_url" {
  type        = string
  description = "GitHub repository URL to clone at boot"
}

variable "frontend_domain" {
  type        = string
  description = "Public domain name for Next.js environment variable"
}

variable "appgw_frontend_pool_id" {
  type        = string
  description = "Application Gateway frontend backend pool ID"
}
