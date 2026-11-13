# Infrastructure as Code (Terraform)

AWS infrastructure management for the **Project Management** application.

## Security & Sensitive Data Protection

- **No Hardcoded Account IDs/ARNs**: Account IDs, active regions, and task definition ARNs are dynamically discovered at runtime using `data.tf` (`aws_caller_identity`, `aws_region`, `aws_ecs_task_definition`).
- **Git-Ignored State & Vars**: `*.tfstate`, `*.tfvars`, and `.terraform/` cache directories are excluded from git.
- **Configuring Environment Variables**:
  
  **Option A: Using `.env` (Recommended)**
  Terraform automatically picks up any environment variable with the `TF_VAR_` prefix:
  ```bash
  export TF_VAR_aws_region="ap-southeast-1"
  export TF_VAR_environment="dev"
  export TF_VAR_app_name="pm"
  ```

  **Option B: Using `terraform.tfvars`**
  Copy the template file:
  ```bash
  cp terraform.tfvars.example terraform.tfvars
  ```
  Edit your custom values inside `terraform.tfvars` (safe from git commits).

## Directory Structure

```
infra/
├── main.tf                    # Terraform & AWS provider configuration, default tags
├── data.tf                    # Dynamic data sources (Caller Identity, Region, Task Def)
├── variables.tf               # Configurable variables with sensible defaults
├── outputs.tf                 # Output values
├── ecr.tf                     # ECR repositories (pm-app, pm-nginx)
├── ecs.tf                     # ECS cluster and service configuration
├── cloudwatch.tf              # CloudWatch log group
├── dynamodb.tf                # DynamoDB table for chat messages
├── imports.tf                 # Config-driven import definitions for existing resources
├── terraform.tfvars.example   # Example template for local variable overrides
├── README.md                  # Infrastructure guide and security practices
└── .gitignore                 # State and secret exclusions
```

## Common Commands

```bash
cd infra

# 1. Initialize AWS provider
terraform init

# 2. Preview changes
terraform plan

# 3. Apply infrastructure updates
terraform apply
```
