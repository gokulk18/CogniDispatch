resource "azurerm_kubernetes_cluster" "aks" {
  name                    = "cogni-aks"
  location                = var.location
  resource_group_name     = var.resource_group_name
  dns_prefix              = "cogniaks"
  private_cluster_enabled = true
  private_dns_zone_id     = var.private_dns_zone_id

  default_node_pool {
    name       = "agentpool"
    node_count = 1
    vm_size    = "Standard_D4ds_v6"
    vnet_subnet_id = var.subnet_id
    os_disk_size_gb = 128
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin      = "azure"
    network_plugin_mode = "Overlay"
    outbound_type       = "loadBalancer"
    ebpf_data_plane     = "cilium"
  }

  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  key_vault_secrets_provider {
    secret_rotation_enabled = true
  }

  tags = {
    Environment = "Production"
    Project     = "CogniDispatch"
  }
}
