# ==============================================================================
# Config-driven Import Blocks (Terraform >= 1.7.0)
# ==============================================================================
# Import IDs are derived from variables to prevent mismatched imports from
# replacing/destroying existing resources when overriding names for new envs.
# For a brand-new environment with no pre-existing AWS resources, remove or
# comment out this file before applying.
# ==============================================================================

# --- ECR Repositories ---
import {
  to = aws_ecr_repository.app
  id = "${var.app_name}-app"
}

import {
  to = aws_ecr_repository.nginx
  id = "${var.app_name}-nginx"
}

# --- ECS Cluster & Service ---
import {
  to = aws_ecs_cluster.main
  id = var.ecs_cluster_name
}

import {
  to = aws_ecs_service.main
  id = "${var.ecs_cluster_name}/${var.ecs_service_name}"
}

# --- CloudWatch Log Group ---
import {
  to = aws_cloudwatch_log_group.app_logs
  id = var.log_group_name
}

# --- DynamoDB Table ---
import {
  to = aws_dynamodb_table.chat_messages
  id = var.dynamodb_table_name
}

# --- SSM Parameter Store ---
import {
  to = aws_ssm_parameter.app_env
  id = var.ssm_env_parameter_name
}
