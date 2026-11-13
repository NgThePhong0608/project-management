# Query current authenticated AWS account and active region dynamically
data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# Query the latest active task definition revision dynamically
data "aws_ecs_task_definition" "current" {
  task_definition = var.ecs_task_family
}

