# ==============================================================================
# AWS Systems Manager (SSM) Parameter Store
# ==============================================================================

locals {
  ssm_env_file_path = "${path.module}/${var.app_env_file}"
  has_local_env     = fileexists(local.ssm_env_file_path)
}

data "aws_ssm_parameter" "current_app_env" {
  count           = (!local.has_local_env && var.app_env_content == "") ? 1 : 0
  name            = var.ssm_env_parameter_name
  with_decryption = true
}

resource "aws_ssm_parameter" "app_env" {
  name        = var.ssm_env_parameter_name
  description = "Dev environment variables for project management app"
  type        = "SecureString"
  tier        = "Standard"
  data_type   = "text"
  value = (
    local.has_local_env
    ? file(local.ssm_env_file_path)
    : (var.app_env_content != "" ? var.app_env_content : data.aws_ssm_parameter.current_app_env[0].value)
  )
}
