variable "resource_group_name" { type = string }
variable "location"            { type = string }
variable "appgw_name"          { type = string }
variable "appgw_public_ip_name" { type = string }
variable "appgw_subnet_id"     { type = string }
variable "frontend_fqdn"       { type = string }
variable "backend_fqdn"        { type = string }
variable "appgw_capacity"      { type = number ; default = 1 }
variable "waf_mode"            { type = string ; default = "Prevention" }
variable "tags"                { type = map(string) ; default = {} }
