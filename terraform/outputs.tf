output "application_gateway_public_ip" {
  value       = module.network.appgw_pip_address
  description = "The Public IP address of the Application Gateway"
}

output "acr_login_server" {
  value       = module.acr.acr_login_server
  description = "Login server for the Azure Container Registry"
}

output "aks_cluster_name" {
  value       = module.aks.aks_name
  description = "Name of the AKS cluster"
}

output "resource_group_app" {
  value       = module.acr.app_rg_name
  description = "Resource group containing the AKS cluster and ACR"
}

output "resource_group_network" {
  value       = module.network.network_rg_name
  description = "Resource group containing the Virtual Network and App Gateway"
}

output "aks_kube_config" {
  value       = module.aks.kube_config_raw
  sensitive   = true
  description = "Kubeconfig for the AKS cluster"
}
