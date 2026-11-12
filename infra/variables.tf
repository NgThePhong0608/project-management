variable "aws_region" {
  description = "AWS region for infrastructure deployment"
  type        = string
  default     = "ap-southeast-1"
}

variable "environment" {
  description = "Target environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "app_name" {
  description = "Application prefix for naming resources"
  type        = string
  default     = "pm"
}
