variable "resource_group_name" { type = string }
variable "location"            { type = string }
variable "vnet_name"           { type = string }
variable "vnet_address_space"  { type = string }
variable "subnet_appgw_cidr"   { type = string }
variable "subnet_frontend_cidr"    { type = string }
variable "subnet_backend_cidr"     { type = string }
variable "subnet_private_ep_cidr"  { type = string }
variable "tags"                { type = map(string) ; default = {} }
