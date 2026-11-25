output "alb_dns_name" {
  description = "Application Load Balancer public DNS address"
  value       = aws_lb.main.dns_name
}

output "rds_proxy_endpoint" {
  description = "AWS RDS Proxy writer endpoint for connection multiplexing"
  value       = aws_db_proxy.main.endpoint
}

output "rds_proxy_readonly_endpoint" {
  description = "AWS RDS Proxy read-only endpoint for background queries"
  value       = aws_db_proxy_endpoint.read_only.endpoint
}

output "aurora_cluster_endpoint" {
  description = "Direct Aurora MySQL primary writer endpoint (internal use only)"
  value       = aws_rds_cluster.aurora.endpoint
  sensitive   = true
}

output "redis_primary_endpoint" {
  description = "ElastiCache Redis primary endpoint address"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "s3_media_bucket" {
  description = "S3 bucket for media assets"
  value       = aws_s3_bucket.media.bucket
}

output "cloudwatch_dashboard_name" {
  description = "CloudWatch capacity monitoring dashboard name"
  value       = aws_cloudwatch_dashboard.capacity_dashboard.dashboard_name
}
