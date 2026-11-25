# -----------------------------------------------------------------------------
# CloudWatch Monitoring, Alarms, and Observability Dashboard
# -----------------------------------------------------------------------------

resource "aws_sns_topic" "ops_alerts" {
  name = "${var.project_name}-${var.environment}-ops-alerts"

  tags = {
    Name = "${var.project_name}-${var.environment}-ops-alerts"
  }
}

# 1. Alarm: Aurora Writer CPU Utilization (> 80%)
resource "aws_cloudwatch_metric_alarm" "aurora_cpu_high" {
  alarm_name          = "${var.project_name}-${var.environment}-aurora-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Aurora MySQL writer CPU utilization exceeded 80% under peak load"
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]

  dimensions = {
    DBClusterIdentifier = aws_rds_cluster.aurora.cluster_identifier
    Role                = "WRITER"
  }
}

# 2. Alarm: RDS Proxy Connection Borrow Latency (> 100ms)
resource "aws_cloudwatch_metric_alarm" "rds_proxy_borrow_latency" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-proxy-borrow-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "QueryResponseLatency"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 100
  alarm_description   = "RDS Proxy connection acquisition latency exceeded 100ms (potential connection pool starvation)"
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]

  dimensions = {
    ProxyName = aws_db_proxy.main.name
  }
}

# 3. Alarm: ElastiCache Redis Memory Utilization (> 75%)
resource "aws_cloudwatch_metric_alarm" "redis_memory_high" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 60
  statistic           = "Average"
  threshold           = 75
  alarm_description   = "ElastiCache Redis memory usage exceeded 75%"
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]

  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.redis.replication_group_id}-001"
  }
}

# 4. Alarm: API 5xx HTTP Error Rate (> 1%)
resource "aws_cloudwatch_metric_alarm" "api_5xx_rate" {
  alarm_name          = "${var.project_name}-${var.environment}-alb-5xx-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 50
  alarm_description   = "ALB Target 5xx error count exceeded threshold during peak requests"
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.api.arn_suffix
  }
}

# -----------------------------------------------------------------------------
# CloudWatch Capacity & Telemetry Dashboard
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_dashboard" "capacity_dashboard" {
  dashboard_name = "${var.project_name}-${var.environment}-capacity-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.main.arn_suffix],
            [".", "ActiveConnectionCount", ".", "."]
          ]
          period = 60
          stat   = "Sum"
          region = var.aws_region
          title  = "ALB Traffic & Active Ingest Connections"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/RDS", "ClientConnections", "ProxyName", aws_db_proxy.main.name],
            [".", "DatabaseConnections", ".", "."]
          ]
          period = 60
          stat   = "Average"
          region = var.aws_region
          title  = "RDS Proxy Connection Multiplexing (Pool vs DB)"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.api.name, "ClusterName", aws_ecs_cluster.main.name],
            [".", "MemoryUtilization", ".", ".", ".", "."]
          ]
          period = 60
          stat   = "Average"
          region = var.aws_region
          title  = "API Fleet Utilization (10 -> 30 Tasks)"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.worker.name, "ClusterName", aws_ecs_cluster.main.name],
            [".", "MemoryUtilization", ".", ".", ".", "."]
          ]
          period = 60
          stat   = "Average"
          region = var.aws_region
          title  = "Worker Fleet Utilization (12 -> 25 Tasks)"
        }
      }
    ]
  })
}
