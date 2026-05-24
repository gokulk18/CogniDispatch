resource "azurerm_kubernetes_cluster" "aks" {
  name                = "aks-${var.project_name}"
  location            = var.location
  resource_group_name = var.app_rg_name
  dns_prefix          = "aks-${var.project_name}"

  default_node_pool {
    name           = "default"
    node_count     = var.node_count
    vm_size        = var.node_size
    vnet_subnet_id = var.aks_subnet_id
    
    # Enable auto-scaling
    enable_auto_scaling = true
    min_count           = var.node_count
    max_count           = 5
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin     = "azure"
    service_cidr       = "10.96.0.0/16"
    dns_service_ip     = "10.96.0.10"
    docker_bridge_cidr = "172.17.0.1/16" # required property by Terraform for Azure CNI
  }
}

# Allow AKS to pull images from ACR
resource "azurerm_role_assignment" "aks_acr_pull" {
  principal_id                     = azurerm_kubernetes_cluster.aks.kubelet_identity[0].object_id
  role_definition_name             = "AcrPull"
  scope                            = var.acr_id
  skip_service_principal_aad_check = true
}
