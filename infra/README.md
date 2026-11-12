# Infrastructure as Code (Terraform)

AWS infrastructure management for the **Project Management** application.

## Directory Structure

```
infra/
├── main.tf          # Terraform configuration, AWS provider, and backend definition
├── variables.tf     # Input variables (region, environment, app prefix)
├── outputs.tf       # Infrastructure outputs
├── imports.tf       # Config-driven import definitions for existing AWS resources (Terraform 1.5+)
└── .gitignore       # State and cache files ignored from version control
```

## Common Commands

```bash
cd infra

# 1. Initialize AWS provider and modules
terraform init

# 2. Preview planned changes
terraform plan

# 3. Apply changes
terraform apply

# 4. Generate HCL configuration automatically from existing AWS resources (via imports.tf)
terraform plan -generate-config-out=generated_resources.tf
```
