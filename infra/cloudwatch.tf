# ==============================================================================
# Amazon CloudWatch Logs
# ==============================================================================

resource "aws_cloudwatch_log_group" "app_logs" {
  name              = var.log_group_name
  retention_in_days = 7
}

