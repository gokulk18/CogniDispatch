# =============================================================
# terraform.tfvars — Base Defaults
# NOTE: Do NOT use this file directly for deployments.
# Use environment-specific var files instead:
#   terraform apply -var-file=envs/dev.tfvars
#   terraform apply -var-file=envs/prod.tfvars
#
# This file is kept for terraform fmt / validate compatibility.
# Values here are the absolute fallback defaults.
# =============================================================

location            = "japanwest"
resource_group_name = "rg-cognidispatch"

vnet_name              = "vnet-cognidispatch"
vnet_address_space     = "172.16.0.0/20"
subnet_appgw_cidr      = "172.16.0.0/24"
subnet_frontend_cidr   = "172.16.1.0/24"
subnet_backend_cidr    = "172.16.2.0/24"
subnet_private_ep_cidr = "172.16.3.0/24"

acr_name = "acrcogniutrawi"

cosmos_account_name  = "cosmos-cognidispatch-db"
cosmos_database_name = "cognidispatch"

key_vault_name = "kv-cognidispatch"

app_plan_name     = "plan-cognidispatch"
frontend_app_name = "web-cogni-frontend-99"
backend_app_name  = "web-cogni-backend-99"
frontend_image    = "acrcogniutrawi.azurecr.io/cogni-frontend:v1"
backend_image_tag = "v1"

appgw_name           = "appgw-cognidispatch"
appgw_public_ip_name = "pip-appgw-cognidispatch"

force_replace_app_service = false

tags = {
  Owner      = "CogniDispatch-Team"
  CostCenter = "Engineering"
}
