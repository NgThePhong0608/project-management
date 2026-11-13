# ==============================================================================
# AWS Systems Manager (SSM) Parameter Store
# ==============================================================================

resource "aws_ssm_parameter" "app_env" {
  name        = var.ssm_env_parameter_name
  description = "Dev environment variables for project management app"
  type        = "SecureString"
  tier        = "Standard"
  data_type   = "text"
  value       = file("${path.module}/${var.app_env_file}")
}

