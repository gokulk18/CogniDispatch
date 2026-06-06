variable "resource_group_name" {
  type        = string
  description = "Name of the resource group"
}

variable "location" {
  type        = string
  description = "Azure location for deployment"
}

variable "project_name" {
  type        = string
  description = "Project name prefix"
}

variable "frontend_subnet_id" {
  type        = string
  description = "Subnet ID for frontend outbound VNet integration"
}

variable "backend_subnet_id" {
  type        = string
  description = "Subnet ID for backend outbound VNet integration"
}

variable "appgw_subnet_id" {
  type        = string
  description = "Subnet ID of the Application Gateway for IP restrictions"
}

variable "mongodb_uri" {
  type        = string
  description = "MongoDB Connection String"
}

variable "azure_openai_endpoint" {
  type        = string
  description = "Azure OpenAI Service Endpoint"
}

variable "azure_openai_key" {
  type        = string
  description = "Azure OpenAI API Key"
}

variable "azure_openai_deployment" {
  type        = string
  description = "Azure OpenAI model deployment name"
}

variable "azure_speech_region" {
  type        = string
  description = "Azure Cognitive Services Speech region"
}

variable "azure_speech_key" {
  type        = string
  description = "Azure Cognitive Services Speech key"
}
