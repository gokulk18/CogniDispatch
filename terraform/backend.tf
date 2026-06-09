# =============================================================
# backend.tf — Remote State Backend (Azure Blob Storage)
#
# State Locking: Azure Blob Storage lease-based locking (built-in).
# Per-workspace state files are automatically named:
#   cognidispatch-dev.tfstate
#   cognidispatch-prod.tfstate
#
# Bootstrap (run ONCE before terraform init):
# --------------------------------------------------
# az group create \
#   --name rg-terraform-state \
#   --location japanwest
#
# az storage account create \
#   --name sttfstatecognidispatch \
#   --resource-group rg-terraform-state \
#   --sku Standard_LRS \
#   --allow-blob-public-access false \
#   --min-tls-version TLS1_2
#
# az storage container create \
#   --name tfstate \
#   --account-name sttfstatecognidispatch
#
# # Enable versioning for state file history
# az storage account blob-service-properties update \
#   --account-name sttfstatecognidispatch \
#   --resource-group rg-terraform-state \
#   --enable-versioning true \
#   --enable-delete-retention true \
#   --delete-retention-days 30
# =============================================================

terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "sttfstatecognidispatch"
    container_name       = "tfstate"

    # Workspace-aware key — each workspace gets its own state file
    # dev  → cognidispatch-dev.tfstate
    # prod → cognidispatch-prod.tfstate
    key = "cognidispatch-${terraform.workspace}.tfstate"

    # State Locking Details:
    # - Azure Blob Storage provides automatic lease-based locking.
    # - No additional backend config required.
    # - Use -lock-timeout=Xm flag if you need a custom lock timeout.
    # - State lock can be force-unlocked with: terraform force-unlock <LOCK_ID>
    use_azuread_auth = true
  }
}
