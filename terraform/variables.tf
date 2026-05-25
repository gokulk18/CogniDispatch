variable "location" {
  type        = string
  default     = "centralindia"
  description = "Azure region for all resources"
}

variable "project_name" {
  type        = string
  default     = "cogni"
  description = "Short project name used as prefix for all resources"
}

variable "hub_vnet_address_space" {
  type        = list(string)
  default     = ["10.0.0.0/16"]
  description = "Address space for the Hub VNet"
}

variable "spoke_vnet_address_space" {
  type        = list(string)
  default     = ["10.1.0.0/16"]
  description = "Address space for the Spoke VNet"
}



variable "frontend_domain" {
  type        = string
  default     = "cognidispatch.g0ku1.online"
  description = "Public domain name for the application"
}

variable "git_repo_url" {
  type        = string
  default     = "https://github.com/gokulk18/Cogni-Dispatch"
  description = "GitHub repository URL for CogniDispatch"
}

variable "mongodb_uri" {
  type        = string
  sensitive   = true
  description = "MongoDB/CosmosDB connection string"
}

variable "azure_openai_endpoint" {
  type        = string
  default     = ""
  description = "Azure OpenAI endpoint URL"
}

variable "azure_openai_key" {
  type        = string
  sensitive   = true
  default     = ""
  description = "Azure OpenAI API key"
}

variable "azure_openai_deployment" {
  type        = string
  default     = "gpt-4o"
  description = "Azure OpenAI deployment name"
}

variable "azure_speech_region" {
  type        = string
  default     = "centralindia"
  description = "Azure Cognitive Services Speech region"
}

variable "azure_speech_key" {
  type        = string
  sensitive   = true
  default     = ""
  description = "Azure Cognitive Services Speech API key"
}
