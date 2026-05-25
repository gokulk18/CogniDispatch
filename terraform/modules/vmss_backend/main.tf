resource "azurerm_linux_virtual_machine_scale_set" "backend" {
  name                = "vmss-backend-${var.project_name}"
  resource_group_name = var.app_rg_name
  location            = var.location
  sku                 = "Standard_DS2_v5"
  instances           = 1
  admin_username      = "adminuser"
  upgrade_mode        = "Automatic"

  custom_data = base64encode(templatefile("${path.module}/cloud-init-backend.yaml", {
    git_repo_url            = var.git_repo_url
    mongodb_uri             = var.mongodb_uri
    azure_openai_endpoint   = var.azure_openai_endpoint
    azure_openai_key        = var.azure_openai_key
    azure_openai_deployment = var.azure_openai_deployment
    azure_speech_region     = var.azure_speech_region
    azure_speech_key        = var.azure_speech_key
  }))

  admin_ssh_key {
    username   = "adminuser"
    public_key = var.ssh_public_key
  }

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

  network_interface {
    name    = "nic-backend"
    primary = true

    ip_configuration {
      name                                         = "ipconfig-backend"
      primary                                      = true
      subnet_id                                    = var.backend_subnet_id
      application_gateway_backend_address_pool_ids = [var.appgw_backend_pool_id]
    }
  }

  tags = {
    project = var.project_name
    role    = "backend"
  }
}

resource "azurerm_monitor_autoscale_setting" "backend" {
  name                = "autoscale-backend-${var.project_name}"
  resource_group_name = var.app_rg_name
  location            = var.location
  target_resource_id  = azurerm_linux_virtual_machine_scale_set.backend.id

  profile {
    name = "default-profile"

    capacity {
      minimum = "1"
      maximum = "2"
      default = "1"
    }

    # Scale out when CPU > 70%
    rule {
      metric_trigger {
        metric_name        = "Percentage CPU"
        metric_resource_id = azurerm_linux_virtual_machine_scale_set.backend.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = 70
      }

      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT5M"
      }
    }

    # Scale in when CPU < 30%
    rule {
      metric_trigger {
        metric_name        = "Percentage CPU"
        metric_resource_id = azurerm_linux_virtual_machine_scale_set.backend.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT10M"
        time_aggregation   = "Average"
        operator           = "LessThan"
        threshold          = 30
      }

      scale_action {
        direction = "Decrease"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT10M"
      }
    }
  }
}
