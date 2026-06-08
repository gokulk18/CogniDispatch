# =============================================================
# Remote State Backend — Azure Blob Storage
# State locking is automatic via blob lease on the azurerm backend.
#
# Bootstrap (one-time, run before terraform init):
#   az group create --name rg-terraform-state --location japanwest
#   az storage account create --name sttfstatecognidispatch \
#     --resource-group rg-terraform-state --sku Standard_LRS
#   az storage container create --name tfstate \
#     --account-name sttfstatecognidispatch
# =============================================================
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "sttfstatecognidispatch"
    container_name       = "tfstate"
    # key is dynamically set per workspace:
    # cognidispatch-dev.tfstate / cognidispatch-staging.tfstate / cognidispatch-prod.tfstate
    key = "cognidispatch-${terraform.workspace}.tfstate"

    # State locking: azurerm backend uses Azure Blob Storage lease-based locking
    # automatically. No extra configuration needed.
    # Lock timeout can be tuned with -lock-timeout flag (default: indefinite).
  }
}
