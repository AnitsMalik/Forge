# -----------------------------------------------------------------------------
# AWS Aurora MySQL Multi-AZ Cluster (Production High-Throughput Specification)
# -----------------------------------------------------------------------------

resource "aws_db_subnet_group" "aurora" {
  name        = "${var.project_name}-${var.environment}-aurora-subnet-group"
  description = "Subnet group for Aurora MySQL cluster across private data tiers"
  subnet_ids  = aws_subnet.data_private[*].id

  tags = {
    Name = "${var.project_name}-${var.environment}-aurora-subnet-group"
  }
}

# Cluster Parameter Group (Strict UTC & Performance Tuning)
resource "aws_rds_cluster_parameter_group" "aurora" {
  name        = "${var.project_name}-${var.environment}-aurora-pg"
  family      = "aurora-mysql8.0"
  description = "Aurora MySQL 8.0 cluster parameter group optimized for 100k concurrency"

  parameter {
    name  = "time_zone"
    value = "+00:00"
  }

  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }

  parameter {
    name  = "collation_server"
    value = "utf8mb4_unicode_ci"
  }

  parameter {
    name  = "max_connections"
    value = "4000"
  }

  parameter {
    name  = "innodb_lock_wait_timeout"
    value = "10"
  }

  parameter {
    name  = "wait_timeout"
    value = "120"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-aurora-pg"
  }
}

# Primary Aurora Cluster
resource "aws_rds_cluster" "aurora" {
  cluster_identifier              = "${var.project_name}-${var.environment}-aurora-cluster"
  engine                          = "aurora-mysql"
  engine_version                  = "8.0.mysql_aurora.3.05.2"
  database_name                   = var.db_name
  master_username                 = var.db_master_username
  master_password                 = random_password.db_password.result
  backup_retention_period         = 30
  preferred_backup_window         = "03:00-05:00"
  preferred_maintenance_window    = "sun:05:00-sun:07:00"
  db_subnet_group_name            = aws_db_subnet_group.aurora.name
  vpc_security_group_ids          = [aws_security_group.aurora.id]
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.aurora.name
  kms_key_id                      = aws_kms_key.database.arn
  storage_encrypted               = true
  deletion_protection             = true
  apply_immediately               = false

  enabled_cloudwatch_logs_exports = ["error", "slowquery"]

  tags = {
    Name = "${var.project_name}-${var.environment}-aurora-cluster"
  }
}

# Aurora Primary Writer Instance (db.r6g.2xlarge: 8 vCPU, 64 GB RAM, 25k+ Write IOPS)
resource "aws_rds_cluster_instance" "writer" {
  identifier           = "${var.project_name}-${var.environment}-aurora-writer"
  cluster_identifier   = aws_rds_cluster.aurora.id
  instance_class       = var.aurora_instance_class
  engine               = aws_rds_cluster.aurora.engine
  engine_version       = aws_rds_cluster.aurora.engine_version
  db_subnet_group_name = aws_db_subnet_group.aurora.name
  publicly_accessible  = false

  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.database.arn
  monitoring_interval             = 10
  monitoring_role_arn             = aws_iam_role.rds_enhanced_monitoring.arn

  tags = {
    Name = "${var.project_name}-${var.environment}-aurora-writer"
    Role = "PrimaryWriter"
  }
}

# Aurora Read Replica Instance (Multi-AZ failover & read scaling)
resource "aws_rds_cluster_instance" "reader" {
  count                = var.aurora_instance_count - 1
  identifier           = "${var.project_name}-${var.environment}-aurora-reader-${count.index + 1}"
  cluster_identifier   = aws_rds_cluster.aurora.id
  instance_class       = var.aurora_instance_class
  engine               = aws_rds_cluster.aurora.engine
  engine_version       = aws_rds_cluster.aurora.engine_version
  db_subnet_group_name = aws_db_subnet_group.aurora.name
  publicly_accessible  = false

  performance_insights_enabled    = true
  performance_insights_kms_key_id = aws_kms_key.database.arn
  monitoring_interval             = 10
  monitoring_role_arn             = aws_iam_role.rds_enhanced_monitoring.arn

  tags = {
    Name = "${var.project_name}-${var.environment}-aurora-reader-${count.index + 1}"
    Role = "ReadReplica"
  }
}

# IAM Role for RDS Enhanced Monitoring
resource "aws_iam_role" "rds_enhanced_monitoring" {
  name = "${var.project_name}-${var.environment}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
