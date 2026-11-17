# Infrastructure as Code (Terraform)

AWS infrastructure management for the **Project Management** application using Terraform with an S3 remote state backend, DynamoDB state locking, and GitOps CI/CD integration.

## Remote State & GitOps Architecture

- **State Bucket:** `pm-terraform-state-ngthephong01` (`ap-southeast-1`, versioned & AES256 encrypted)
- **Lock Table:** `pm-terraform-locks` (`ap-southeast-1`, `LockID` partition key)
- **Bootstrap (Run Once):**
  ```bash
  AWS_PROFILE=root bash infra/scripts/bootstrap-state.sh
  ```
- **CI/CD Workflow (`.github/workflows/infra.yml`):**
  - **Pull Requests:** Runs `terraform fmt -check`, `terraform validate`, and `terraform plan`, posting the plan summary directly as a PR comment.
  - **Main / Master Push:** Automatically runs `terraform apply -auto-approve` after PR approval and merge.

## Security & Sensitive Data Protection

- **No Hardcoded Account IDs/ARNs**: Account IDs, active regions, and task definition ARNs are dynamically discovered at runtime using `data.tf` (`aws_caller_identity`, `aws_region`, `aws_ecs_task_definition`).
- **Git-Ignored State & Vars**: `*.tfstate`, `*.tfvars`, `.env.ssm`, and `.terraform/` cache directories are excluded from git.
- **SSM Parameter Dual Mode (`ssm.tf`)**:
  - **Local:** Reads `infra/.env.ssm` automatically when present.
  - **CI:** Reads `TF_VAR_app_env_content` if provided, or preserves the live SSM value via `data "aws_ssm_parameter"` so PR plans never fail on missing local `.env.ssm`.
- **Configuring Environment Variables**:

  **Option A: Using `.env` (`TF_VAR_` prefix)**
  ```bash
  export TF_VAR_aws_region="ap-southeast-1"
  export TF_VAR_environment="dev"
  export TF_VAR_app_name="pm"
  ```

  **Option B: Using `terraform.tfvars`**
  ```bash
  cp terraform.tfvars.example terraform.tfvars
  ```

## Directory Structure

```
infra/
├── main.tf                    # Terraform S3 backend, AWS providers (ap-southeast-1 & us-east-1)
├── data.tf                    # Dynamic data sources (Caller Identity, Region, Task Def)
├── variables.tf               # Configurable variables with sensible defaults
├── outputs.tf                 # Output values
├── ecr.tf                     # ECR repositories (pm-app, pm-nginx)
├── ecs.tf                     # ECS cluster and service configuration
├── cloudwatch.tf              # CloudWatch log group
├── dynamodb.tf                # DynamoDB table for chat messages
├── ssm.tf                     # SSM Parameter Store dual-mode configuration
├── imports.tf                 # Config-driven import definitions for existing resources
├── scripts/
│   └── bootstrap-state.sh     # One-time S3 state bucket & DynamoDB lock bootstrap script
├── terraform.tfvars.example   # Example template for local variable overrides
├── README.md                  # Infrastructure guide and security practices
└── .gitignore                 # State and secret exclusions
```

## Common Commands

```bash
# Re-authenticate AWS session if expired
aws login --profile root

# Bootstrap remote state storage (first time only)
AWS_PROFILE=root bash infra/scripts/bootstrap-state.sh

cd infra

# 1. Initialize AWS provider and S3 remote backend
AWS_PROFILE=root terraform init -migrate-state

# 2. Preview changes
AWS_PROFILE=root terraform plan

# 3. Apply infrastructure updates
AWS_PROFILE=root terraform apply
```
