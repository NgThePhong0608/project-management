terraform {
  # Terraform >= 1.7.0 is required for variable expressions inside import blocks
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "pm-terraform-state-ngthephong01"
    key            = "dev/terraform.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "pm-terraform-locks"
    encrypt        = true
  }
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

# Secondary provider required for CloudFront ACM certificates in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "project-management"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
