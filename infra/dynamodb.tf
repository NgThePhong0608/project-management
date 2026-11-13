# ==============================================================================
# Amazon DynamoDB
# ==============================================================================

resource "aws_dynamodb_table" "chat_messages" {
  name           = var.dynamodb_table_name
  billing_mode   = "PROVISIONED"
  read_capacity  = 5
  write_capacity = 5
  hash_key       = "PK"
  range_key      = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  point_in_time_recovery {
    enabled = false
  }

  lifecycle {
    # Guard stateful chat history against accidental replacement or deletion
    prevent_destroy = true
  }
}

