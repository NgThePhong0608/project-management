terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # ponytail: Start with local state; migrate to remote S3 backend once team/CI-CD workflows expand
  # backend "s3" {
  #   bucket         = "pm-app-terraform-state"
  #   key            = "dev/terraform.tfstate"
  #   region         = "ap-southeast-1"
  #   dynamodb_table = "pm-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "project-management"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
