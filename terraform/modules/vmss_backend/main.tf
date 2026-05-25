# ---------------------------------------------------------------------------
# Backend Network Interface
# ---------------------------------------------------------------------------
resource "azurerm_network_interface" "backend" {
  name                = "nic-backend-${var.project_name}"
  location            = var.location
  resource_group_name = var.app_rg_name

  ip_configuration {
    name                          = "ipconfig-backend"
    subnet_id                     = var.backend_subnet_id
    private_ip_address_allocation = "Dynamic"
  }

  tags = {
    project = var.project_name
    role    = "backend"
  }
}

# ---------------------------------------------------------------------------
# Standalone Backend VM
# ---------------------------------------------------------------------------
resource "azurerm_linux_virtual_machine" "backend" {
  name                            = "vm-backend-${var.project_name}"
  resource_group_name             = var.app_rg_name
  location                        = var.location
  size                            = "Standard_D2s_v5"
  admin_username                  = "azure"
  admin_password                  = "Azureuser@123"
  disable_password_authentication = false

  network_interface_ids = [
    azurerm_network_interface.backend.id
  ]

  custom_data = base64encode(templatefile("${path.module}/cloud-init-backend.yaml", {
    git_repo_url            = var.git_repo_url
    mongodb_uri             = var.mongodb_uri
    azure_openai_endpoint   = var.azure_openai_endpoint
    azure_openai_key        = var.azure_openai_key
    azure_openai_deployment = var.azure_openai_deployment
    azure_speech_region     = var.azure_speech_region
    azure_speech_key        = var.azure_speech_key
  }))

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  tags = {
    project = var.project_name
    role    = "backend"
  }
}

# ---------------------------------------------------------------------------
# Application Gateway Backend Pool Association
# ---------------------------------------------------------------------------
resource "azurerm_network_interface_application_gateway_backend_address_pool_association" "backend" {
  network_interface_id    = azurerm_network_interface.backend.id
  ip_configuration_name   = "ipconfig-backend"
  backend_address_pool_id = var.appgw_backend_pool_id
}
