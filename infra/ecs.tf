# ==============================================================================
# Amazon Elastic Container Service (ECS)
# ==============================================================================

resource "aws_ecs_cluster" "main" {
  name = var.ecs_cluster_name

  setting {
    name  = "containerInsights"
    value = "disabled"
  }
}

resource "aws_ecs_service" "main" {
  name                               = var.ecs_service_name
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = data.aws_ecs_task_definition.current.arn
  desired_count                      = 1
  launch_type                        = "EC2"
  scheduling_strategy                = "REPLICA"
  deployment_maximum_percent         = 100
  deployment_minimum_healthy_percent = 0
  enable_ecs_managed_tags            = true

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller {
    type = "ECS"
  }

  ordered_placement_strategy {
    type  = "spread"
    field = "attribute:ecs.availability-zone"
  }

  ordered_placement_strategy {
    type  = "spread"
    field = "instanceId"
  }

  lifecycle {
    # Ignore changes to task_definition because CI/CD updates task definitions on push
    ignore_changes = [task_definition]
  }
}

