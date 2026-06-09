# =============================================================
# workspaces.tf — Workspace-Driven Environment Configuration
#
# ONLY 2 environments: dev | prod
# Usage:
#   terraform workspace new dev
#   terraform workspace new prod
#   terraform workspace select prod
# =============================================================

locals {
  env = terraform.workspace # "dev" | "prod" (or "default" during validate)

  # Safely resolve environment — fall back to "dev" during terraform validate
  # (terraform validate uses "default" workspace which is not a real deployment env)
  resolved_env = contains(["dev", "prod"], local.env) ? local.env : "dev"

  # ── Naming suffix per workspace ───────────────────────────────
  # prod has no suffix (clean names), dev gets -dev suffix
  suffix = local.resolved_env == "prod" ? "" : "-${local.resolved_env}"

  # ── App Service Plan SKU per environment ─────────────────────
  # dev: B2 (cost-efficient), prod: P2v3 (production-grade)
  app_service_sku = {
    dev  = "B2"
    prod = "P2v3"
  }[local.resolved_env]

  # ── Cosmos DB max throughput per environment ──────────────────
  cosmos_max_throughput = {
    dev  = 1000
    prod = 4000
  }[local.resolved_env]

  # ── Application Gateway capacity per environment ─────────────
  appgw_capacity = {
    dev  = 1
    prod = 2
  }[local.resolved_env]

  # ── WAF mode per environment ──────────────────────────────────
  waf_mode = {
    dev  = "Detection"
    prod = "Prevention"
  }[local.resolved_env]

  # ── ACR SKU per environment ───────────────────────────────────
  acr_sku_per_env = {
    dev  = "Basic"
    prod = "Standard"
  }[local.resolved_env]

  # ── Is production? (for lifecycle guards, log retention, etc) ─
  is_prod = local.resolved_env == "prod"

  # ── Common resource tags applied to EVERY resource ───────────
  common_tags = merge(var.tags, {
    Environment = local.resolved_env
    ManagedBy   = "Terraform"
    Project     = "CogniDispatch"
    Workspace   = terraform.workspace
    Owner       = "CogniDispatch-Team"
    CostCenter  = "Engineering"
    Repository  = "github.com/gokulk18/Cogni-Dispatch"
  })
}
