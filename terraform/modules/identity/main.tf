variable "resource_group_name" {}
variable "location" {}

data "azuread_client_config" "current" {}

# Azure AD Application Registration for CogniDispatch
resource "azuread_application" "cognidispatch_app" {
  display_name     = "CogniDispatch"
  sign_in_audience = "AzureADMyOrg"

  web {
    redirect_uris = [
      "https://cognidispatch.g0ku1.online/.auth/login/aad/callback",
      "https://web-cogni-frontend-99.azurewebsites.net/.auth/login/aad/callback"
    ]
    implicit_grant {
      access_token_issuance_enabled = true
      id_token_issuance_enabled     = true
    }
  }
}

# Service Principal for the App
resource "azuread_service_principal" "cognidispatch_sp" {
  client_id                    = azuread_application.cognidispatch_app.client_id
  app_role_assignment_required = false
}

# Generate a Client Secret
resource "azuread_application_password" "cognidispatch_secret" {
  application_id = azuread_application.cognidispatch_app.id
  display_name   = "NextAuthClientSecret"
}

output "client_id" {
  value = azuread_application.cognidispatch_app.client_id
}

output "tenant_id" {
  value = data.azuread_client_config.current.tenant_id
}

output "client_secret" {
  value     = azuread_application_password.cognidispatch_secret.value
  sensitive = true
}
