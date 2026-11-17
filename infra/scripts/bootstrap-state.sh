#!/usr/bin/env bash
# ==============================================================================
# Bootstrap Terraform Remote State (S3 Bucket + DynamoDB Lock Table)
# Usage: AWS_PROFILE=root bash infra/scripts/bootstrap-state.sh
# ==============================================================================
set -euo pipefail

REGION="${AWS_REGION:-ap-southeast-1}"
BUCKET_NAME="${TF_STATE_BUCKET:-pm-terraform-state-ngthephong01}"
LOCK_TABLE="${TF_LOCK_TABLE:-pm-terraform-locks}"

echo "==> Verifying AWS identity..."
aws sts get-caller-identity --output table

echo "==> Ensuring S3 state bucket '${BUCKET_NAME}' exists in ${REGION}..."
if aws s3api head-bucket --bucket "${BUCKET_NAME}" 2>/dev/null; then
  echo "    Bucket '${BUCKET_NAME}' already exists."
else
  aws s3api create-bucket \
    --bucket "${BUCKET_NAME}" \
    --region "${REGION}" \
    --create-bucket-configuration LocationConstraint="${REGION}"
  echo "    Created bucket '${BUCKET_NAME}'."
fi

echo "==> Enabling bucket versioning..."
aws s3api put-bucket-versioning \
  --bucket "${BUCKET_NAME}" \
  --versioning-configuration Status=Enabled

echo "==> Enabling default AES256 server-side encryption..."
aws s3api put-bucket-encryption \
  --bucket "${BUCKET_NAME}" \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        },
        "BucketKeyEnabled": true
      }
    ]
  }'

echo "==> Blocking all public access on state bucket..."
aws s3api put-public-access-block \
  --bucket "${BUCKET_NAME}" \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

echo "==> Ensuring DynamoDB lock table '${LOCK_TABLE}' exists in ${REGION}..."
if aws dynamodb describe-table --table-name "${LOCK_TABLE}" --region "${REGION}" >/dev/null 2>&1; then
  echo "    DynamoDB table '${LOCK_TABLE}' already exists."
else
  aws dynamodb create-table \
    --table-name "${LOCK_TABLE}" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "${REGION}" >/dev/null
  echo "    Waiting for DynamoDB table '${LOCK_TABLE}' to become active..."
  aws dynamodb wait table-exists --table-name "${LOCK_TABLE}" --region "${REGION}"
  echo "    Created DynamoDB table '${LOCK_TABLE}'."
fi

echo "==> Remote state bootstrap completed successfully!"

