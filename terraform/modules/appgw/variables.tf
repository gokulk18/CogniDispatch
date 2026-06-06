variable "location" {
  type        = string
  description = "Azure region for the Application Gateway"
}

variable "project_name" {
  type        = string
  description = "Short project name used as resource prefix"
}

variable "network_rg_name" {
  type        = string
  description = "Network resource group name (for reference only)"
}

variable "appgw_subnet_id" {
  type        = string
  description = "Subnet ID for the Application Gateway"
}

variable "appgw_pip_id" {
  type        = string
  description = "Public IP resource ID for the Application Gateway"
}

variable "frontend_domain" {
  type        = string
  description = "Public domain name for the HTTP listener host header"
}

variable "app_rg_name" {
  type        = string
  description = "Application resource group name where AppGW is deployed"
}

variable "frontend_hostname" {
  type        = string
  description = "Default hostname of the frontend app service"
}

variable "auth_hostname" {
  type        = string
  description = "Default hostname of the auth microservice"
}

variable "vendor_hostname" {
  type        = string
  description = "Default hostname of the vendor microservice"
}

variable "ai_hostname" {
  type        = string
  description = "Default hostname of the ai microservice"
}

variable "admin_hostname" {
  type        = string
  description = "Default hostname of the admin microservice"
}

variable "dispatch_hostname" {
  type        = string
  description = "Default hostname of the dispatch microservice"
}
