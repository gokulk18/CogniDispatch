variable "resource_group_name" {
  description = "The name of the resource group"
  type        = string
}

variable "location" {
  description = "The Azure region for security resources"
  type        = string
}

variable "aks_cluster_id" {
  description = "The resource ID of the AKS cluster"
  type        = string
}

variable "aks_oidc_issuer_url" {
  description = "The OIDC issuer URL of the AKS cluster"
  type        = string
}

variable "key_vault_id" {
  description = "The resource ID of the Azure Key Vault"
  type        = string
}

variable "acr_id" {
  description = "The resource ID of the Azure Container Registry"
  type        = string
}

variable "app_gateway_id" {
  description = "The resource ID of the Application Gateway"
  type        = string
}

variable "node_resource_group" {
  description = "The name of the AKS node resource group"
  type        = string
}

variable "kubelet_identity_object_id" {
  description = "The object ID of the AKS kubelet identity"
  type        = string
}
