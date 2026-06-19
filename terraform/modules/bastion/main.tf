# Public IP for Azure Bastion
resource "azurerm_public_ip" "bastion_pip" {
  name                = "pip-cogni-bastion"
  location            = var.location
  resource_group_name = var.resource_group_name
  allocation_method   = "Static"
  sku                 = "Standard"
}

# Azure Bastion Host
resource "azurerm_bastion_host" "bastion" {
  name                = "cogni-bastion"
  location            = var.location
  resource_group_name = var.resource_group_name

  ip_configuration {
    name                 = "configuration"
    subnet_id            = var.bastion_subnet_id
    public_ip_address_id = azurerm_public_ip.bastion_pip.id
  }

  tags = {
    Environment = "Production"
    Project     = "CogniDispatch"
  }
}

# Generate secure SSH key pair if none is provided
resource "tls_private_key" "jumpbox_key" {
  count     = var.ssh_public_key == "" ? 1 : 0
  algorithm = "RSA"
  rsa_bits  = 4096
}

locals {
  ssh_key = var.ssh_public_key != "" ? var.ssh_public_key : tls_private_key.jumpbox_key[0].public_key_openssh
}

# Network Interface for Jumpbox VM
resource "azurerm_network_interface" "jumpbox_nic" {
  name                = "nic-cogni-jumpbox"
  location            = var.location
  resource_group_name = var.resource_group_name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = var.mgmt_subnet_id
    private_ip_address_allocation = "Dynamic"
  }
}

# Linux Jumpbox VM for cluster management
resource "azurerm_linux_virtual_machine" "jumpbox" {
  name                = "cogni-jumpbox"
  resource_group_name = var.resource_group_name
  location            = var.location
  size                = "Standard_B2s"
  admin_username      = var.admin_username

  network_interface_ids = [
    azurerm_network_interface.jumpbox_nic.id,
  ]

  admin_ssh_key {
    username   = var.admin_username
    public_key = local.ssh_key
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
    disk_size_gb         = 30
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  # Bootstrap script to install kubectl, kubelogin, and Azure CLI
  user_data = base64encode(<<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release git unzip

              # Install Azure CLI
              curl -sL https://aka.ms/InstallAzureCLIDeb | bash

              # Install kubectl
              curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
              chmod 644 /etc/apt/keyrings/kubernetes-apt-keyring.gpg
              echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | tee /etc/apt/sources.list.d/kubernetes.list
              apt-get update -y
              apt-get install -y kubectl

              # Install kubelogin
              az aks install-cli
              EOF
  )

  tags = {
    Environment = "Production"
    Project     = "CogniDispatch"
  }
}
