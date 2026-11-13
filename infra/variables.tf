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

variable "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  type        = string
  default     = "pm-cluster"
}

variable "ecs_service_name" {
  description = "Name of the ECS service"
  type        = string
  default     = "pm-service"
}

variable "ecs_task_family" {
  description = "Family name of the ECS task definition"
  type        = string
  default     = "pm-task"
}

variable "log_group_name" {
  description = "Name of the CloudWatch log group"
  type        = string
  default     = "/pm-app/dev"
}

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table for chat messages"
  type        = string
  default     = "chat_messages"
}

variable "ssm_env_parameter_name" {
  description = "SSM Parameter Store path for application environment variables"
  type        = string
  default     = "/pm-app/dev/env"
}

variable "app_env_file" {
  description = "Local filename (relative to infra/) containing .env secrets to sync to SSM"
  type        = string
  default     = ".env.ssm"
}
