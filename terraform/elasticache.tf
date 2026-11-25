# -----------------------------------------------------------------------------
# AWS ElastiCache Redis Cluster (Multi-AZ Replication Group)
# -----------------------------------------------------------------------------

resource "aws_elasticache_subnet_group" "redis" {
  name        = "${var.project_name}-${var.environment}-redis-subnet-group"
  description = "Subnet group for Redis cluster across private data tiers"
  subnet_ids  = aws_subnet.data_private[*].id

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-subnet-group"
  }
}

# Redis Auth Token Secret
resource "random_password" "redis_auth_token" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "redis_auth" {
  name        = "${var.project_name}/${var.environment}/redis-auth-token"
  description = "ElastiCache Redis AUTH token"
  kms_key_id  = aws_kms_key.secrets.arn

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-auth"
  }
}

resource "aws_secretsmanager_secret_version" "redis_auth" {
  secret_id     = aws_secretsmanager_secret.redis_auth.id
  secret_string = random_password.redis_auth_token.result
}

# Parameter Group (Strict 'noeviction' for BullMQ Queue Protection)
resource "aws_elasticache_parameter_group" "redis" {
  name        = "${var.project_name}-${var.environment}-redis-pg"
  family      = "redis7"
  description = "Redis parameter group optimized for BullMQ queue safety and rate limiting"

  # BullMQ invariant: Jobs must never be dropped via LRU/LFU eviction
  parameter {
    name  = "maxmemory-policy"
    value = "noeviction"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-pg"
  }
}

# Redis Replication Group (Multi-AZ with In-Transit & At-Rest Encryption)
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "${var.project_name}-${var.environment}-redis"
  description                = "SocialForge Redis replication group for rate limiting and BullMQ"
  node_type                  = var.redis_node_type
  num_cache_clusters         = var.redis_num_cache_clusters
  port                       = 6379
  parameter_group_name       = aws_elasticache_parameter_group.redis.name
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  security_group_ids         = [aws_security_group.redis.id]
  automatic_failover_enabled = true
  multi_az_enabled           = true

  at_rest_encryption_enabled = true
  kms_key_id                 = aws_kms_key.secrets.arn
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result

  snapshot_retention_limit = 7
  snapshot_window          = "02:00-03:00"
  maintenance_window       = "sun:03:30-sun:04:30"

  apply_immediately = false

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-cluster"
  }
}
