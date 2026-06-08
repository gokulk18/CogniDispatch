# =============================================================
# Workspace-driven locals
# Usage:
#   terraform workspace new dev
#   terraform workspace new staging
#   terraform workspace new prod
#   terraform workspace select prod
# =============================================================

locals {
  env = terraform.workspace # "dev" | "staging" | "prod"

  # ── Naming suffix per workspace ─────────────────────────────
  suffix = local.env == "prod" ? "" : "-${local.env}"

  # ── App Service Plan SKU per workspace ──────────────────────
  app_service_sku = {
    dev     = "S1"
    staging = "S2"
    prod    = "S3"
  }[local.env]

  # ── Cosmos DB throughput per workspace ──────────────────────
  cosmos_max_throughput = {
    dev     = 1000
    staging = 2000
    prod    = 4000
  }[local.env]

  # ── Application Gateway SKU per workspace ───────────────────
  appgw_capacity = {
    dev     = 1
    staging = 1
    prod    = 2
  }[local.env]

  # ── WAF Mode per workspace ──────────────────────────────────
  waf_mode = {
    dev     = "Detection"
    staging = "Detection"
    prod    = "Prevention"
  }[local.env]

  # ── Tags applied to every resource ──────────────────────────
  common_tags = merge(var.tags, {
    Environment = local.env
    ManagedBy   = "Terraform"
    Project     = "CogniDispatch"
    Workspace   = terraform.workspace
  })
}
