# ---------------------------------------------------------------------------
# Frontend VMSS
# ---------------------------------------------------------------------------
resource "azurerm_linux_virtual_machine_scale_set" "frontend" {
  name                = "vmss-frontend-${var.project_name}"
  resource_group_name = var.app_rg_name
  location            = var.location
  sku                 = "Standard_D2s_v5"
  instances           = 1
  admin_username                  = "azure"
  admin_password                  = "Azureuser@123"
  disable_password_authentication = false
  upgrade_mode                    = "Automatic"

  custom_data = base64encode(templatefile("${path.module}/cloud-init-frontend.yaml", {
    git_repo_url    = var.git_repo_url
    frontend_domain = var.frontend_domain
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

  network_interface {
    name    = "nic-frontend"
    primary = true

    ip_configuration {
      name                                         = "ipconfig-frontend"
      primary                                      = true
      subnet_id                                    = var.frontend_subnet_id
      application_gateway_backend_address_pool_ids = [var.appgw_frontend_pool_id]
    }
  }

  tags = {
    project = var.project_name
    role    = "frontend"
  }
}

# ---------------------------------------------------------------------------
# Autoscale Setting for Frontend VMSS
# ---------------------------------------------------------------------------
resource "azurerm_monitor_autoscale_setting" "frontend_autoscale" {
  name                = "autoscale-frontend-${var.project_name}"
  resource_group_name = var.app_rg_name
  location            = var.location
  target_resource_id  = azurerm_linux_virtual_machine_scale_set.frontend.id

  profile {
    name = "default-profile"

    capacity {
      minimum = "1"
      maximum = "2"
      default = "1"
    }

    # Scale out: CPU > 70% for 5 minutes
    rule {
      metric_trigger {
        metric_name        = "Percentage CPU"
        metric_resource_id = azurerm_linux_virtual_machine_scale_set.frontend.id
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

    # Scale in: CPU < 30% for 10 minutes
    rule {
      metric_trigger {
        metric_name        = "Percentage CPU"
        metric_resource_id = azurerm_linux_virtual_machine_scale_set.frontend.id
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

  tags = {
    project = var.project_name
    role    = "frontend"
  }
}
