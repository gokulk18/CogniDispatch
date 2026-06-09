variable "location" {
  description = "The Azure Region to deploy resources"
  type        = string
  default     = "Japan West"
}

variable "compute_location" {
  description = "Azure Region for App Service Plan and Web Apps. Use a different region if Japan West is throttled (429)."
  type        = string
  default     = "East Asia"
}
