variable "location" {
  type        = string
  description = "Azure region for the backend VMSS"
}

variable "project_name" {
  type        = string
  description = "Short project name used as resource prefix"
}

variable "app_rg_name" {
  type        = string
  description = "Application resource group name"
}

variable "backend_subnet_id" {
  type        = string
  description = "Subnet ID for the backend VMSS NICs"
}

variable "ssh_public_key" {
  type        = string
  description = "SSH public key for VM access via Bastion"
}

variable "git_repo_url" {
  type        = string
  description = "GitHub repository URL to clone at boot"
}

variable "mongodb_uri" {
  type        = string
  sensitive   = true
  description = "MongoDB/CosmosDB connection string"
}

variable "azure_openai_endpoint" {
  type        = string
  description = "Azure OpenAI endpoint URL"
}

variable "azure_openai_key" {
  type        = string
  sensitive   = true
  description = "Azure OpenAI API key"
}

variable "azure_openai_deployment" {
  type        = string
  description = "Azure OpenAI deployment name"
}

variable "azure_speech_region" {
  type        = string
  description = "Azure Cognitive Services Speech region"
}

variable "azure_speech_key" {
  type        = string
  sensitive   = true
  description = "Azure Cognitive Services Speech API key"
}

variable "appgw_backend_pool_id" {
  type        = string
  description = "Application Gateway backend pool ID"
}
