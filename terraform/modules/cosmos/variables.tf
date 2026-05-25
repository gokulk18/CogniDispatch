variable "location" {
  type        = string
  description = "Azure region"
}

variable "project_name" {
  type        = string
  description = "Base project name"
}

variable "app_rg_name" {
  type        = string
  description = "Application resource group name"
}

variable "nat_public_ip" {
  type        = string
  description = "NAT Gateway public IP — added to Cosmos DB IP firewall so VMs can connect"
}
