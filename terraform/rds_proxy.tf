# -----------------------------------------------------------------------------
# AWS RDS Proxy Configuration (Connection Multiplexing for 100k Concurrency)
# -----------------------------------------------------------------------------

# IAM Role for RDS Proxy Secrets Manager Access
resource "aws_iam_role" "rds_proxy" {
  name = "${var.project_name}-${var.environment}-rds-proxy-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_policy" "rds_proxy_secrets" {
  name        = "${var.project_name}-${var.environment}-rds-proxy-secrets-policy"
  description = "Allows RDS Proxy to read Aurora database credentials from Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [aws_secretsmanager_secret.db_credentials.arn]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = [aws_kms_key.secrets.arn]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_proxy_secrets" {
  role       = aws_iam_role.rds_proxy.name
  policy_arn = aws_iam_policy.rds_proxy_secrets.arn
}

# AWS RDS Proxy Instance
resource "aws_db_proxy" "main" {
  name                   = "${var.project_name}-${var.environment}-rds-proxy"
  debug_logging          = false
  engine_family          = "MYSQL"
  idle_client_timeout    = 1800
  require_tls            = false
  role_arn               = aws_iam_role.rds_proxy.arn
  vpc_security_group_ids = [aws_security_group.rds_proxy.id]
  vpc_subnet_ids         = aws_subnet.data_private[*].id

  auth {
    auth_scheme = "SECRETS"
    description = "Master database authentication via Secrets Manager"
    iam_auth    = "DISABLED"
    secret_arn  = aws_secretsmanager_secret.db_credentials.arn
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-proxy"
  }

  depends_on = [
    aws_secretsmanager_secret_version.db_credentials
  ]
}

# RDS Proxy Default Target Group (Connection Multiplexing Configuration)
resource "aws_db_proxy_default_target_group" "main" {
  db_proxy_name = aws_db_proxy.main.name

  connection_pool_config {
    connection_borrow_timeout    = 120
    init_query                   = "SET time_zone = '+00:00';"
    max_connections_percent      = 90
    max_idle_connections_percent = 50
    session_pinning_filters      = ["EXCLUDE_VARIABLE_SETS"]
  }
}

# Link RDS Proxy to Aurora Cluster
resource "aws_db_proxy_target" "cluster" {
  db_proxy_name         = aws_db_proxy.main.name
  target_group_name     = aws_db_proxy_default_target_group.main.name
  db_cluster_identifier = aws_rds_cluster.aurora.id
}

# Dedicated Read-Only Endpoint for Analytical Queries / Read Replicas
resource "aws_db_proxy_endpoint" "read_only" {
  db_proxy_name          = aws_db_proxy.main.name
  db_proxy_endpoint_name = "${var.project_name}-${var.environment}-ro-endpoint"
  vpc_subnet_ids         = aws_subnet.data_private[*].id
  vpc_security_group_ids = [aws_security_group.rds_proxy.id]
  target_role            = "READ_ONLY"

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-proxy-ro"
  }
}
