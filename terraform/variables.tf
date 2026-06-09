# =============================================================
# variables.tf — Root Input Variables
# =============================================================

# ── General ──────────────────────────────────────────────────
variable "location" {
  description = "Azure region for all resources."
  type        = string
  default     = "japanwest"
}

variable "resource_group_name" {
  description = "Base name of the main resource group (workspace suffix appended automatically)."
  type        = string
  default     = "rg-cognidispatch"
}

variable "tags" {
  description = "Extra tags to merge onto every resource (cost tracking, ownership, etc.)."
  type        = map(string)
  default     = {}
}

# ── Networking ────────────────────────────────────────────────
variable "vnet_name" {
  description = "Name of the Virtual Network."
  type        = string
  default     = "vnet-cognidispatch"
}

variable "vnet_address_space" {
  description = "CIDR block for the VNet."
  type        = string
  default     = "172.16.0.0/20"
}

variable "subnet_appgw_cidr" {
  description = "CIDR for the Application Gateway subnet."
  type        = string
  default     = "172.16.0.0/24"
}

variable "subnet_frontend_cidr" {
  description = "CIDR for the Frontend App Service VNet integration subnet."
  type        = string
  default     = "172.16.1.0/24"
}

variable "subnet_backend_cidr" {
  description = "CIDR for the Backend App Service VNet integration subnet."
  type        = string
  default     = "172.16.2.0/24"
}

variable "subnet_private_ep_cidr" {
  description = "CIDR for the Private Endpoints subnet."
  type        = string
  default     = "172.16.3.0/24"
}

# ── ACR ────────────────────────────────────────────────────────
variable "acr_name" {
  description = "Azure Container Registry name (globally unique, alphanumeric only, 5-50 chars)."
  type        = string
  default     = "acrcogniutrawi"

  validation {
    condition     = can(regex("^[a-zA-Z0-9]{5,50}$", var.acr_name))
    error_message = "ACR name must be 5-50 alphanumeric characters (no dashes or underscores)."
  }
}

# ── Cosmos DB ──────────────────────────────────────────────────
variable "cosmos_account_name" {
  description = "Cosmos DB account name (globally unique)."
  type        = string
  default     = "cosmos-cognidispatch-db"
}

variable "cosmos_database_name" {
  description = "Mongo database name inside Cosmos DB."
  type        = string
  default     = "cognidispatch"
}

# ── Key Vault ──────────────────────────────────────────────────
variable "key_vault_name" {
  description = "Azure Key Vault name (globally unique, 3-24 alphanumeric + dash)."
  type        = string
  default     = "kv-cognidispatch"

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9-]{2,23}$", var.key_vault_name))
    error_message = "Key Vault name must be 3-24 chars, start with a letter, and contain only letters, digits, and dashes."
  }
}

variable "tenant_id" {
  description = "Azure AD Tenant ID for Key Vault access policies. Pass via TF_VAR_tenant_id env var."
  type        = string
  sensitive   = true
}

# ── App Service ────────────────────────────────────────────────
variable "app_plan_name" {
  description = "App Service Plan name."
  type        = string
  default     = "plan-cognidispatch"
}

variable "frontend_app_name" {
  description = "Frontend App Service name (must be globally unique)."
  type        = string
  default     = "web-cogni-frontend-99"
}

variable "backend_app_name" {
  description = "Backend App Service name (must be globally unique)."
  type        = string
  default     = "web-cogni-backend-99"
}

variable "frontend_image" {
  description = "Full ACR image reference for the frontend (e.g. acr.azurecr.io/cogni-frontend:latest)."
  type        = string
  default     = "acrcogniutrawi.azurecr.io/cogni-frontend:v1"
}

variable "backend_image_tag" {
  description = "Docker image tag for all backend microservices."
  type        = string
  default     = "v1"
}

# ── Application Gateway ────────────────────────────────────────
variable "appgw_name" {
  description = "Application Gateway resource name."
  type        = string
  default     = "appgw-cognidispatch"
}

variable "appgw_public_ip_name" {
  description = "Public IP resource name for the Application Gateway."
  type        = string
  default     = "pip-appgw-cognidispatch"
}

# ── Taints — resources that need forced recreation ─────────────
# Taint a resource: terraform taint module.<mod>.resource.<name>
# Taint use-cases for CogniDispatch:
#   1. ACR: taint when registry becomes corrupted
#   2. App Service: taint when container is stuck in unhealthy state
#   3. Key Vault: taint ONLY after backup restore (purge protection must be off first)
#   4. Cosmos DB: NEVER taint (data loss risk; restore from backup instead)
variable "force_replace_app_service" {
  description = "Set to true to mark app services for forced replacement (taint equivalent via lifecycle). Reset to false after apply."
  type        = bool
  default     = false
}

# ── GitHub Actions / CI Variables ─────────────────────────────
variable "github_repo" {
  description = "GitHub repository URL for Terraform state tracking."
  type        = string
  default     = "https://github.com/gokulk18/Cogni-Dispatch"
}
