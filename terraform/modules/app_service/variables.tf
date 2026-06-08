variable "resource_group_name"   { type = string }
variable "location"              { type = string }
variable "app_plan_name"         { type = string }
variable "app_service_sku"       { type = string }
variable "frontend_app_name"     { type = string }
variable "backend_app_name"      { type = string }
variable "frontend_subnet_id"    { type = string }
variable "backend_subnet_id"     { type = string }
variable "acr_login_server"      { type = string }
variable "acr_id"                { type = string }
variable "docker_compose_file"   { type = string }
variable "frontend_image"        { type = string }
variable "mongodb_uri"           { type = string ; sensitive = true }
variable "tags"                  { type = map(string) ; default = {} }
