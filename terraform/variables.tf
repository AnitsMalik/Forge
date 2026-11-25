variable "aws_region" {
  description = "AWS deployment region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment identifier (e.g. production, staging)"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name prefix for all resources"
  type        = string
  default     = "socialforge"
}

variable "vpc_cidr" {
  description = "CIDR block for the dedicated VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of Availability Zones to span"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# --- Database & RDS Proxy ---
variable "db_name" {
  description = "Primary Aurora MySQL database name"
  type        = string
  default     = "socialforge_db"
}

variable "db_master_username" {
  description = "Primary Aurora MySQL administrator username"
  type        = string
  default     = "sf_admin"
}

variable "aurora_instance_class" {
  description = "Aurora MySQL instance class (db.r6g.2xlarge provides 8 vCPU, 64 GB RAM, 25k+ Write IOPS)"
  type        = string
  default     = "db.r6g.2xlarge"
}

variable "aurora_instance_count" {
  description = "Total Aurora instances (1 Writer + N Read Replicas)"
  type        = number
  default     = 2
}

# --- Redis & BullMQ ---
variable "redis_node_type" {
  description = "ElastiCache Redis node type for distributed rate limiting & BullMQ queues"
  type        = string
  default     = "cache.r6g.large"
}

variable "redis_num_cache_clusters" {
  description = "Number of Redis cache clusters in replication group (Multi-AZ)"
  type        = number
  default     = 3
}

# --- ECS Compute Fleet ---
variable "api_desired_count" {
  description = "Baseline API container task count (scaled to 10 for 100k concurrency surges)"
  type        = number
  default     = 10
}

variable "api_min_count" {
  description = "Minimum API container task count"
  type        = number
  default     = 5
}

variable "api_max_count" {
  description = "Maximum API container task count under burst load"
  type        = number
  default     = 30
}

variable "worker_desired_count" {
  description = "Baseline Worker container task count for parallel BullMQ queue clearance"
  type        = number
  default     = 12
}

variable "worker_min_count" {
  description = "Minimum Worker container task count"
  type        = number
  default     = 6
}

variable "worker_max_count" {
  description = "Maximum Worker container task count during scheduled surges"
  type        = number
  default     = 25
}

# --- Domain & Certificates ---
variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
  default     = "app.socialforge.ai"
}

variable "certificate_arn" {
  description = "AWS ACM Certificate ARN for HTTPS listener (optional in staging)"
  type        = string
  default     = ""
}
