# ==============================================================================
# Amazon Elastic Container Registry (ECR)
# ==============================================================================

resource "aws_ecr_repository" "app" {
  name                 = "${var.app_name}-app"
  image_tag_mutability = "MUTABLE"

  encryption_configuration {
    encryption_type = "AES256"
  }

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "nginx" {
  name                 = "${var.app_name}-nginx"
  image_tag_mutability = "MUTABLE"

  encryption_configuration {
    encryption_type = "AES256"
  }

  image_scanning_configuration {
    scan_on_push = true
  }
}

