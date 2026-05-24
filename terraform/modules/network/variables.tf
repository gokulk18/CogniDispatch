variable "location" {
  type = string
}

variable "project_name" {
  type = string
}

variable "vnet_address_space" {
  type = list(string)
}

variable "appgw_subnet_prefix" {
  type = string
}

variable "aks_subnet_prefix" {
  type = string
}
