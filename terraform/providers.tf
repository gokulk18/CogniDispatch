# =============================================================
# providers.tf — Azure Provider Configuration
# Authentication: Service Principal via environment variables:
#   ARM_CLIENT_ID, ARM_CLIENT_SECRET, ARM_SUBSCRIPTION_ID, ARM_TENANT_ID
#   (or use OIDC / Managed Identity in CI/CD)
# =============================================================

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = false
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
    virtual_machine {
      delete_os_disk_on_deletion     = true
      graceful_shutdown              = false
      skip_shutdown_and_force_delete = false
    }
    app_configuration {
      purge_soft_delete_on_destroy = true
    }
  }
}

provider "azuread" {}

provider "random" {}

provider "null" {}
