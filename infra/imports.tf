# ==============================================================================
# Config-driven Import Blocks (Terraform 1.5+)
# ==============================================================================
# Active import targets for existing AWS resources
# ==============================================================================

# --- ECR Repositories ---
import {
  to = aws_ecr_repository.app
  id = "pm-app"
}

import {
  to = aws_ecr_repository.nginx
  id = "pm-nginx"
}

# --- ECS Cluster & Service ---
import {
  to = aws_ecs_cluster.main
  id = "pm-cluster"
}

import {
  to = aws_ecs_service.main
  id = "pm-cluster/pm-service"
}

# --- CloudWatch Log Group ---
import {
  to = aws_cloudwatch_log_group.app_logs
  id = "/pm-app/dev"
}

# --- DynamoDB Table ---
import {
  to = aws_dynamodb_table.chat_messages
  id = "chat_messages"
}

# --- SSM Parameter Store ---
import {
  to = aws_ssm_parameter.app_env
  id = "/pm-app/dev/env"
}
