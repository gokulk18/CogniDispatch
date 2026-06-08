variable "resource_group_name"       { type = string }
variable "location"                  { type = string }
variable "cosmos_account_name"       { type = string }
variable "cosmos_database_name"      { type = string }
variable "private_endpoint_subnet_id" { type = string }
variable "cosmos_private_dns_zone_id" { type = string }
variable "vnet_id"                   { type = string }
variable "cosmos_max_throughput"     { type = number ; default = 1000 }
variable "tags"                      { type = map(string) ; default = {} }
