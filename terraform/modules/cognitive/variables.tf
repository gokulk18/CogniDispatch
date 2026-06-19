variable "resource_group_name" {
  description = "The name of the resource group"
  type        = string
}

variable "location" {
  description = "The primary Azure region"
  type        = string
}

variable "subnet_id" {
  description = "The subnet ID for Private Endpoints (snet-private-ep)"
  type        = string
}

variable "dns_zone_openai_id" {
  description = "The Private DNS Zone ID for Azure OpenAI"
  type        = string
}

variable "dns_zone_speech_id" {
  description = "The Private DNS Zone ID for Azure Speech"
  type        = string
}
