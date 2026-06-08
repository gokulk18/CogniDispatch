# =============================================================
# Root Variables — CogniDispatch Infrastructure
# =============================================================

# ── General ─────────────────────────────────────────────────
variable "location" {
  description = "Azure region for all resources."
  type        = string
  default     = "japanwest"
}

variable "resource_group_name" {
  description = "Name of the main resource group."
  type        = string
  default     = "rg-cognidispatch"
}

variable "tags" {
  description = "Extra tags to merge onto every resource."
  type        = map(string)
  default     = {}
}

# ── Networking ───────────────────────────────────────────────
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

# ── ACR ──────────────────────────────────────────────────────
variable "acr_name" {
  description = "Name of the Azure Container Registry (globally unique, alphanumeric only)."
  type        = string
  default     = "acrcogniutrawi"

  validation {
    condition     = can(regex("^[a-zA-Z0-9]{5,50}$", var.acr_name))
    error_message = "ACR name must be 5-50 alphanumeric characters."
  }
}

variable "acr_sku" {
  description = "ACR SKU (Basic | Standard | Premium)."
  type        = string
  default     = "Standard"

  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.acr_sku)
    error_message = "ACR SKU must be Basic, Standard, or Premium."
  }
}

# ── Cosmos DB ────────────────────────────────────────────────
variable "cosmos_account_name" {
  description = "Name of the Cosmos DB account (globally unique)."
  type        = string
  default     = "cosmos-cognidispatch-db"
}

variable "cosmos_database_name" {
  description = "Name of the Mongo database inside Cosmos DB."
  type        = string
  default     = "cognidispatch"
}

# ── Key Vault ────────────────────────────────────────────────
variable "key_vault_name" {
  description = "Name of the Azure Key Vault (globally unique, 3-24 chars)."
  type        = string
  default     = "kv-cognidispatch"
}

variable "tenant_id" {
  description = "Azure AD Tenant ID for Key Vault access policies."
  type        = string
  sensitive   = true
}

# ── App Service ──────────────────────────────────────────────
variable "app_plan_name" {
  description = "Name of the App Service Plan."
  type        = string
  default     = "plan-cognidispatch"
}

variable "frontend_app_name" {
  description = "Name of the Frontend App Service."
  type        = string
  default     = "web-cogni-frontend-99"
}

variable "backend_app_name" {
  description = "Name of the Backend App Service."
  type        = string
  default     = "web-cogni-backend-99"
}

variable "docker_compose_file" {
  description = "Path to the docker-compose.prod.yml for the backend multi-container app."
  type        = string
  default     = "../services/docker-compose.prod.yml"
}

variable "frontend_image" {
  description = "Full ACR image reference for the frontend (e.g. acr.azurecr.io/cogni-frontend:v1)."
  type        = string
  default     = "acrcogniutrawi.azurecr.io/cogni-frontend:v1"
}

# ── Application Gateway ──────────────────────────────────────
variable "appgw_name" {
  description = "Name of the Application Gateway."
  type        = string
  default     = "appgw-cognidispatch"
}

variable "appgw_public_ip_name" {
  description = "Name of the public IP for the Application Gateway."
  type        = string
  default     = "pip-appgw-cognidispatch"
}
