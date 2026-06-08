variable "resource_group_name"        { type = string }
variable "location"                   { type = string }
variable "key_vault_name"             { type = string }
variable "tenant_id"                  { type = string ; sensitive = true }
variable "private_endpoint_subnet_id" { type = string }
variable "keyvault_private_dns_zone_id" { type = string }
variable "vnet_id"                    { type = string }
variable "mongodb_uri"                { type = string ; sensitive = true }
variable "backend_app_principal_id"   { type = string }
variable "tags"                       { type = map(string) ; default = {} }
