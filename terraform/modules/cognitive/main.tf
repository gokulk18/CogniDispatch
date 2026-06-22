# Azure OpenAI Account
resource "azurerm_cognitive_account" "openai" {
  name                          = "cogni-openai"
  location                      = "eastus" # Match active location of OpenAI
  resource_group_name           = var.resource_group_name
  kind                          = "OpenAI"
  sku_name                      = "S0"
  public_network_access_enabled = false

  tags = {
    Environment = "Production"
    Project     = "CogniDispatch"
  }
}

# OpenAI Private Endpoint
resource "azurerm_private_endpoint" "pe_openai" {
  name                = "pe-openai"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id

  private_service_connection {
    name                           = "psc-openai"
    private_connection_resource_id = azurerm_cognitive_account.openai.id
    is_manual_connection           = false
    subresource_names              = ["account"]
  }

  private_dns_zone_group {
    name                 = "openai-dns-zone-group"
    private_dns_zone_ids = [var.dns_zone_openai_id]
  }
}


# Azure Speech Services Account
resource "azurerm_cognitive_account" "speech" {
  name                          = "cogni-speech"
  location                      = "eastus" # Match active location of Speech service
  resource_group_name           = var.resource_group_name
  kind                          = "SpeechServices"
  sku_name                      = "S0"
  public_network_access_enabled = false

  tags = {
    Environment = "Production"
    Project     = "CogniDispatch"
  }
}

# Speech Service Private Endpoint
resource "azurerm_private_endpoint" "pe_speech" {
  name                = "pe-speech"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id

  private_service_connection {
    name                           = "psc-speech"
    private_connection_resource_id = azurerm_cognitive_account.speech.id
    is_manual_connection           = false
    subresource_names              = ["account"]
  }

  private_dns_zone_group {
    name                 = "speech-dns-zone-group"
    private_dns_zone_ids = [var.dns_zone_speech_id]
  }
}
