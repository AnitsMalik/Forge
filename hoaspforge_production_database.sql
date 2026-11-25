-- HoaspForge Production Database Dump
-- Generated for Hostinger MySQL Deployment
-- Compatibility: MySQL 8.x / MariaDB 10.x

SET FOREIGN_KEY_CHECKS = 0;
SET time_zone = '+00:00';
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `ab_test_experiments`;
CREATE TABLE `ab_test_experiments` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `post_id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'draft',
  `winning_variant_id` char(36) DEFAULT NULL,
  `confidence_score` decimal(5,2) DEFAULT NULL,
  `sample_size_target` int NOT NULL DEFAULT '1000',
  `flight_window_hours` int NOT NULL DEFAULT '6',
  `started_at` timestamp NULL DEFAULT NULL,
  `concluded_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ab_test_experiments_tenant_id_foreign` (`tenant_id`),
  KEY `ab_test_experiments_winning_variant_id_foreign` (`winning_variant_id`),
  KEY `idx_ab_exp_brand_status` (`brand_id`,`status`),
  KEY `idx_ab_exp_post_id` (`post_id`),
  CONSTRAINT `ab_test_experiments_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ab_test_experiments_post_id_foreign` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ab_test_experiments_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ab_test_experiments_winning_variant_id_foreign` FOREIGN KEY (`winning_variant_id`) REFERENCES `post_variants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ab_test_variants`;
CREATE TABLE `ab_test_variants` (
  `id` char(36) NOT NULL,
  `experiment_id` char(36) NOT NULL,
  `post_variant_id` char(36) NOT NULL,
  `variant_label` varchar(50) NOT NULL,
  `traffic_allocation_pct` decimal(5,2) NOT NULL DEFAULT '50.00',
  `impressions` int NOT NULL DEFAULT '0',
  `engagements` int NOT NULL DEFAULT '0',
  `clicks` int NOT NULL DEFAULT '0',
  `shares` int NOT NULL DEFAULT '0',
  `conversion_rate` decimal(7,4) NOT NULL DEFAULT '0.0000',
  `viral_score` decimal(5,2) NOT NULL DEFAULT '0.00',
  `is_winner` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ab_var_exp_id` (`experiment_id`),
  KEY `idx_ab_var_post_variant_id` (`post_variant_id`),
  CONSTRAINT `ab_test_variants_experiment_id_foreign` FOREIGN KEY (`experiment_id`) REFERENCES `ab_test_experiments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ab_test_variants_post_variant_id_foreign` FOREIGN KEY (`post_variant_id`) REFERENCES `post_variants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `active_user_presence_sessions`;
CREATE TABLE `active_user_presence_sessions` (
  `id` varchar(64) NOT NULL,
  `room_id` varchar(64) NOT NULL,
  `user_id` varchar(64) NOT NULL,
  `user_email` varchar(255) NOT NULL,
  `display_name` varchar(128) NOT NULL,
  `cursor_position_x` float(8,2) NOT NULL DEFAULT '0.00',
  `cursor_position_y` float(8,2) NOT NULL DEFAULT '0.00',
  `current_selected_layer_id` varchar(64) DEFAULT NULL,
  `last_heartbeat_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `connection_status` varchar(32) NOT NULL DEFAULT 'connected',
  PRIMARY KEY (`id`),
  KEY `active_user_presence_sessions_room_id_index` (`room_id`),
  KEY `active_user_presence_sessions_user_id_index` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `agent_execution_steps`;
CREATE TABLE `agent_execution_steps` (
  `id` varchar(36) NOT NULL,
  `execution_id` varchar(36) NOT NULL,
  `agent_id` varchar(36) NOT NULL,
  `agent_role` varchar(64) NOT NULL,
  `step_name` varchar(128) NOT NULL,
  `step_index` int NOT NULL DEFAULT '0',
  `input_context_json` json DEFAULT NULL,
  `output_context_json` json DEFAULT NULL,
  `critique_feedback_json` json DEFAULT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'running',
  `tokens_used` int NOT NULL DEFAULT '0',
  `latency_ms` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_step_execution` (`execution_id`),
  KEY `agent_execution_steps_agent_id_foreign` (`agent_id`),
  KEY `idx_step_status` (`status`),
  CONSTRAINT `agent_execution_steps_agent_id_foreign` FOREIGN KEY (`agent_id`) REFERENCES `agent_fleet_definitions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agent_execution_steps_execution_id_foreign` FOREIGN KEY (`execution_id`) REFERENCES `agent_workflow_executions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `agent_fleet_definitions`;
CREATE TABLE `agent_fleet_definitions` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) DEFAULT NULL,
  `name` varchar(128) NOT NULL,
  `slug` varchar(64) NOT NULL,
  `role` varchar(64) NOT NULL,
  `description` text,
  `system_prompt` text NOT NULL,
  `model_name` varchar(64) NOT NULL DEFAULT 'gpt-4o',
  `temperature` decimal(3,2) NOT NULL DEFAULT '0.70',
  `max_tokens_per_turn` int NOT NULL DEFAULT '4096',
  `tool_permissions_json` json NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'idle',
  `concurrency_limit` int NOT NULL DEFAULT '5',
  `is_system` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_agent_fleet_slug` (`slug`),
  KEY `idx_agent_fleet_tenant` (`tenant_id`),
  KEY `idx_agent_fleet_role` (`role`),
  KEY `idx_agent_fleet_status` (`status`),
  CONSTRAINT `agent_fleet_definitions_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `agent_fleet_workflows`;
CREATE TABLE `agent_fleet_workflows` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` text,
  `trigger_type` varchar(32) NOT NULL DEFAULT 'manual',
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `dag_config_json` json NOT NULL,
  `max_budget_tokens` int NOT NULL DEFAULT '50000',
  `timeout_seconds` int NOT NULL DEFAULT '300',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_agent_wf_tenant` (`tenant_id`),
  KEY `idx_agent_wf_status` (`status`),
  CONSTRAINT `agent_fleet_workflows_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `agent_memories`;
CREATE TABLE `agent_memories` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) DEFAULT NULL,
  `memory_type` varchar(64) NOT NULL DEFAULT 'short_term',
  `key` varchar(255) NOT NULL,
  `value` json NOT NULL,
  `confidence` float(8,2) NOT NULL DEFAULT '1.00',
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `agent_memories_brand_id_foreign` (`brand_id`),
  KEY `idx_agent_mem_tenant_brand` (`tenant_id`,`brand_id`),
  KEY `idx_agent_mem_tenant_key` (`tenant_id`,`key`),
  KEY `idx_agent_mem_type` (`memory_type`),
  CONSTRAINT `agent_memories_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agent_memories_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `agent_runs`;
CREATE TABLE `agent_runs` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `agent_type` varchar(64) NOT NULL,
  `prompt` text,
  `status` varchar(32) NOT NULL DEFAULT 'pending',
  `plan` json DEFAULT NULL,
  `tool_calls` json DEFAULT NULL,
  `results` json DEFAULT NULL,
  `error_message` text,
  `tokens_used` int NOT NULL DEFAULT '0',
  `duration_ms` int DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `agent_runs_brand_id_foreign` (`brand_id`),
  KEY `idx_agent_runs_tenant_brand` (`tenant_id`,`brand_id`),
  KEY `idx_agent_runs_type_status` (`agent_type`,`status`),
  KEY `idx_agent_runs_created_at` (`created_at`),
  CONSTRAINT `agent_runs_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agent_runs_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `agent_settings`;
CREATE TABLE `agent_settings` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) DEFAULT NULL,
  `model` varchar(100) NOT NULL DEFAULT 'gpt-4o',
  `temperature` float(8,2) NOT NULL DEFAULT '0.70',
  `autonomous_mode` varchar(32) NOT NULL DEFAULT 'semi',
  `require_approval_before_publish` tinyint(1) NOT NULL DEFAULT '1',
  `max_weekly_auto_posts` int NOT NULL DEFAULT '7',
  `strictness_level` int NOT NULL DEFAULT '90',
  `banned_topics` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `agent_settings_brand_id_foreign` (`brand_id`),
  KEY `idx_agent_settings_tenant_brand` (`tenant_id`,`brand_id`),
  CONSTRAINT `agent_settings_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agent_settings_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `agent_workflow_executions`;
CREATE TABLE `agent_workflow_executions` (
  `id` varchar(36) NOT NULL,
  `workflow_id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `trigger_event` varchar(128) NOT NULL DEFAULT 'manual_dispatch',
  `status` varchar(32) NOT NULL DEFAULT 'running',
  `total_tokens_used` int NOT NULL DEFAULT '0',
  `execution_cost_usd` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `started_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  `duration_ms` int DEFAULT NULL,
  `error_message` text,
  `final_output_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `agent_workflow_executions_workflow_id_foreign` (`workflow_id`),
  KEY `idx_wf_exec_tenant` (`tenant_id`),
  KEY `idx_wf_exec_status` (`status`),
  KEY `idx_wf_exec_created` (`created_at`),
  CONSTRAINT `agent_workflow_executions_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `agent_workflow_executions_workflow_id_foreign` FOREIGN KEY (`workflow_id`) REFERENCES `agent_fleet_workflows` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `analytics_metrics`;
CREATE TABLE `analytics_metrics` (
  `id` char(36) NOT NULL,
  `post_variant_id` char(36) NOT NULL,
  `impressions` int NOT NULL DEFAULT '0',
  `reach` int NOT NULL DEFAULT '0',
  `likes` int NOT NULL DEFAULT '0',
  `comments` int NOT NULL DEFAULT '0',
  `shares` int NOT NULL DEFAULT '0',
  `clicks` int NOT NULL DEFAULT '0',
  `video_views` int NOT NULL DEFAULT '0',
  `engagement_rate` decimal(5,4) NOT NULL DEFAULT '0.0000',
  `recorded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_analytics_post_variant` (`post_variant_id`,`recorded_at`),
  CONSTRAINT `analytics_metrics_post_variant_id_foreign` FOREIGN KEY (`post_variant_id`) REFERENCES `post_variants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `analytics_winners`;
CREATE TABLE `analytics_winners` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `post_id` char(36) NOT NULL,
  `post_variant_id` char(36) NOT NULL,
  `platform` varchar(50) NOT NULL,
  `remote_post_id` varchar(255) DEFAULT NULL,
  `winner_type` varchar(64) NOT NULL,
  `score` decimal(12,4) NOT NULL DEFAULT '0.0000',
  `lift_multiplier` decimal(8,2) NOT NULL DEFAULT '1.00',
  `baseline_benchmark` json DEFAULT NULL,
  `metrics_snapshot` json NOT NULL,
  `winning_attributes` json DEFAULT NULL,
  `automation_dispatched` tinyint(1) NOT NULL DEFAULT '0',
  `automation_run_id` char(36) DEFAULT NULL,
  `detected_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `analytics_winners_brand_id_foreign` (`brand_id`),
  KEY `analytics_winners_post_id_foreign` (`post_id`),
  KEY `idx_analytics_winners_tenant_brand` (`tenant_id`,`brand_id`),
  KEY `idx_analytics_winners_variant` (`post_variant_id`),
  KEY `idx_analytics_winners_type` (`winner_type`),
  KEY `idx_analytics_winners_detected` (`detected_at`),
  CONSTRAINT `analytics_winners_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `analytics_winners_post_id_foreign` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `analytics_winners_post_variant_id_foreign` FOREIGN KEY (`post_variant_id`) REFERENCES `post_variants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `analytics_winners_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `api_gateway_routes`;
CREATE TABLE `api_gateway_routes` (
  `id` varchar(36) NOT NULL,
  `route_path` varchar(160) NOT NULL,
  `service_name` varchar(64) NOT NULL DEFAULT 'content_service',
  `auth_strategy` varchar(32) NOT NULL DEFAULT 'jwt_bearer',
  `rate_limit_tier` varchar(32) NOT NULL DEFAULT 'standard',
  `requests_per_minute` int NOT NULL DEFAULT '60',
  `burst_capacity` int NOT NULL DEFAULT '15',
  `cors_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `timeout_ms` int NOT NULL DEFAULT '10000',
  `description` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_agr_path` (`route_path`),
  KEY `idx_agr_path` (`route_path`),
  KEY `idx_agr_service` (`service_name`),
  KEY `idx_agr_tier` (`rate_limit_tier`),
  KEY `idx_agr_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `api_throttle_audit_logs`;
CREATE TABLE `api_throttle_audit_logs` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) DEFAULT NULL,
  `route_path` varchar(160) NOT NULL,
  `client_ip` varchar(64) NOT NULL DEFAULT '127.0.0.1',
  `requested_tokens` int NOT NULL DEFAULT '1',
  `remaining_tokens` decimal(8,2) NOT NULL DEFAULT '0.00',
  `throttle_reason` varchar(255) NOT NULL,
  `http_status` int NOT NULL DEFAULT '429',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_atal_tenant` (`tenant_id`),
  KEY `idx_atal_route` (`route_path`),
  KEY `idx_atal_status` (`http_status`),
  CONSTRAINT `api_throttle_audit_logs_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `api_token_bucket_quotas`;
CREATE TABLE `api_token_bucket_quotas` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `route_id` varchar(36) NOT NULL,
  `available_tokens` decimal(8,2) NOT NULL DEFAULT '15.00',
  `max_capacity` int NOT NULL DEFAULT '15',
  `refill_rate_per_sec` decimal(8,2) NOT NULL DEFAULT '1.00',
  `last_refill_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `total_requests_allowed` int NOT NULL DEFAULT '0',
  `total_requests_throttled` int NOT NULL DEFAULT '0',
  `is_throttled` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_atbq_tenant_route` (`tenant_id`,`route_id`),
  KEY `idx_atbq_tenant` (`tenant_id`),
  KEY `idx_atbq_route` (`route_id`),
  KEY `idx_atbq_throttled` (`is_throttled`),
  CONSTRAINT `api_token_bucket_quotas_route_id_foreign` FOREIGN KEY (`route_id`) REFERENCES `api_gateway_routes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `api_token_bucket_quotas_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `approval_comments`;
CREATE TABLE `approval_comments` (
  `id` char(36) NOT NULL,
  `approval_request_id` char(36) NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `author_name` varchar(255) NOT NULL,
  `is_external_client` tinyint(1) NOT NULL DEFAULT '0',
  `comment` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `approval_comments_approval_request_id_foreign` (`approval_request_id`),
  KEY `approval_comments_user_id_foreign` (`user_id`),
  CONSTRAINT `approval_comments_approval_request_id_foreign` FOREIGN KEY (`approval_request_id`) REFERENCES `approval_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `approval_comments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `approval_requests`;
CREATE TABLE `approval_requests` (
  `id` char(36) NOT NULL,
  `post_id` char(36) NOT NULL,
  `requested_by` char(36) NOT NULL,
  `reviewer_id` char(36) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `magic_token` varchar(255) DEFAULT NULL,
  `magic_token_expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `tenant_id` char(36) DEFAULT NULL,
  `brand_id` char(36) DEFAULT NULL,
  `entity_type` varchar(64) NOT NULL DEFAULT 'post',
  `entity_id` varchar(128) DEFAULT NULL,
  `review_notes` text,
  `expires_at` timestamp NULL DEFAULT NULL,
  `edit_history` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `reviewed_by` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `approval_requests_magic_token_unique` (`magic_token`),
  KEY `approval_requests_post_id_foreign` (`post_id`),
  KEY `approval_requests_requested_by_foreign` (`requested_by`),
  KEY `approval_requests_reviewer_id_foreign` (`reviewer_id`),
  KEY `approval_requests_tenant_id_foreign` (`tenant_id`),
  KEY `approval_requests_brand_id_foreign` (`brand_id`),
  KEY `approval_requests_reviewed_by_foreign` (`reviewed_by`),
  CONSTRAINT `approval_requests_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `approval_requests_post_id_foreign` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `approval_requests_requested_by_foreign` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `approval_requests_reviewed_by_foreign` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `approval_requests_reviewer_id_foreign` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `approval_requests_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `audit_trail_integrity_checkpoints`;
CREATE TABLE `audit_trail_integrity_checkpoints` (
  `id` varchar(36) NOT NULL,
  `audit_table` varchar(64) NOT NULL,
  `last_audit_id` varchar(36) NOT NULL,
  `record_count` bigint NOT NULL,
  `merkle_root_hash` varchar(64) NOT NULL,
  `signature` varchar(128) NOT NULL,
  `verified_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `audit_trail_integrity_checkpoints_audit_table_index` (`audit_table`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `auth_audit_logs`;
CREATE TABLE `auth_audit_logs` (
  `id` char(36) NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `event` varchar(50) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `auth_audit_logs_user_id_index` (`user_id`),
  KEY `auth_audit_logs_event_index` (`event`),
  KEY `auth_audit_logs_created_at_index` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `automation_dlq`;
CREATE TABLE `automation_dlq` (
  `id` char(36) NOT NULL,
  `run_id` char(36) DEFAULT NULL,
  `automation_id` char(36) DEFAULT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `failure_state` varchar(64) NOT NULL,
  `error_message` text,
  `error_stack` text,
  `retry_count` int NOT NULL DEFAULT '0',
  `idempotency_key` varchar(255) DEFAULT NULL,
  `trigger_event` json DEFAULT NULL,
  `run_context` json DEFAULT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'dead_letter',
  `replayed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `automation_dlq_brand_id_foreign` (`brand_id`),
  KEY `idx_auto_dlq_tenant_status` (`tenant_id`,`status`),
  KEY `idx_auto_dlq_failure_state` (`failure_state`),
  CONSTRAINT `automation_dlq_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `automation_dlq_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `automation_runs`;
CREATE TABLE `automation_runs` (
  `id` char(36) NOT NULL,
  `automation_id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `trigger_event` json DEFAULT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'pending',
  `step_results` json DEFAULT NULL,
  `error_message` text,
  `duration_ms` int DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lifecycle_state` varchar(64) NOT NULL DEFAULT 'DETECTED',
  `idempotency_key` varchar(255) DEFAULT NULL,
  `source_connection_id` varchar(64) DEFAULT NULL,
  `source_record_id` varchar(64) DEFAULT NULL,
  `source_version` varchar(64) DEFAULT NULL,
  `action_type` varchar(64) DEFAULT NULL,
  `template_version` int DEFAULT NULL,
  `retry_count` int NOT NULL DEFAULT '0',
  `max_retries` int NOT NULL DEFAULT '3',
  `next_retry_at` timestamp NULL DEFAULT NULL,
  `lock_token` varchar(64) DEFAULT NULL,
  `locked_until` timestamp NULL DEFAULT NULL,
  `cancellation_reason` text,
  `paused_at` timestamp NULL DEFAULT NULL,
  `run_context` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `automation_runs_brand_id_foreign` (`brand_id`),
  KEY `idx_auto_runs_automation` (`automation_id`),
  KEY `idx_auto_runs_tenant_brand` (`tenant_id`,`brand_id`),
  KEY `idx_auto_runs_status` (`status`),
  KEY `idx_auto_runs_created_at` (`created_at`),
  KEY `idx_auto_runs_lifecycle` (`lifecycle_state`),
  KEY `idx_auto_runs_idempotency` (`idempotency_key`),
  KEY `idx_auto_runs_next_retry` (`next_retry_at`),
  CONSTRAINT `automation_runs_automation_id_foreign` FOREIGN KEY (`automation_id`) REFERENCES `automations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `automation_runs_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `automation_runs_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `automation_step_runs`;
CREATE TABLE `automation_step_runs` (
  `id` char(36) NOT NULL,
  `run_id` char(36) NOT NULL,
  `automation_id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `step_index` int NOT NULL,
  `step_name` varchar(128) NOT NULL,
  `lifecycle_phase` varchar(64) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'pending',
  `input_payload` json DEFAULT NULL,
  `output_payload` json DEFAULT NULL,
  `error_message` text,
  `duration_ms` int DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `automation_step_runs_automation_id_foreign` (`automation_id`),
  KEY `automation_step_runs_brand_id_foreign` (`brand_id`),
  KEY `idx_auto_steps_run` (`run_id`,`step_index`),
  KEY `idx_auto_steps_tenant_phase` (`tenant_id`,`lifecycle_phase`),
  CONSTRAINT `automation_step_runs_automation_id_foreign` FOREIGN KEY (`automation_id`) REFERENCES `automations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `automation_step_runs_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `automation_step_runs_run_id_foreign` FOREIGN KEY (`run_id`) REFERENCES `automation_runs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `automation_step_runs_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `automations`;
CREATE TABLE `automations` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `trigger_type` varchar(64) NOT NULL,
  `trigger_config` json DEFAULT NULL,
  `conditions` json DEFAULT NULL,
  `actions` json NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `execution_count` int NOT NULL DEFAULT '0',
  `last_run_at` timestamp NULL DEFAULT NULL,
  `created_by` char(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `paused_at` timestamp NULL DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `cancellation_reason` text,
  `max_retries` int NOT NULL DEFAULT '3',
  `base_delay_ms` int NOT NULL DEFAULT '1000',
  `is_durable` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `automations_brand_id_foreign` (`brand_id`),
  KEY `automations_created_by_foreign` (`created_by`),
  KEY `idx_automations_tenant_brand` (`tenant_id`,`brand_id`),
  KEY `idx_automations_status` (`status`),
  KEY `idx_automations_trigger_type` (`trigger_type`),
  CONSTRAINT `automations_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `automations_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `automations_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `billing_dunning_events`;
CREATE TABLE `billing_dunning_events` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `subscription_id` varchar(255) DEFAULT NULL,
  `invoice_id` varchar(255) DEFAULT NULL,
  `event_type` varchar(50) NOT NULL,
  `stage` int NOT NULL DEFAULT '1',
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `recipient_email` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `payload` json DEFAULT NULL,
  `error_message` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sent_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_dunning_tenant_status` (`tenant_id`,`status`),
  KEY `idx_dunning_tenant_event` (`tenant_id`,`event_type`),
  KEY `idx_dunning_created_at` (`created_at`),
  CONSTRAINT `billing_dunning_events_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `billing_email_logs`;
CREATE TABLE `billing_email_logs` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `recipient_email` varchar(255) NOT NULL,
  `recipient_name` varchar(255) DEFAULT NULL,
  `template` varchar(50) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `html_body` longtext NOT NULL,
  `text_body` text NOT NULL,
  `status` enum('sent','failed','simulated') NOT NULL DEFAULT 'sent',
  `metadata` text,
  `error_message` text,
  `sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_email_logs_tenant` (`tenant_id`),
  KEY `idx_email_logs_template` (`template`),
  KEY `idx_email_logs_recipient` (`recipient_email`),
  KEY `idx_email_logs_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `billing_events`;
CREATE TABLE `billing_events` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) DEFAULT NULL,
  `event_type` varchar(100) NOT NULL,
  `provider` varchar(50) NOT NULL DEFAULT 'system',
  `provider_event_id` varchar(255) DEFAULT NULL,
  `payload` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_billing_events_tenant` (`tenant_id`),
  KEY `idx_billing_events_type` (`event_type`),
  KEY `idx_billing_events_provider_id` (`provider_event_id`),
  KEY `idx_billing_events_created` (`created_at`),
  CONSTRAINT `billing_events_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `billing_invoices`;
CREATE TABLE `billing_invoices` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `subscription_id` char(36) DEFAULT NULL,
  `invoice_number` varchar(100) NOT NULL,
  `amount_due_cents` int NOT NULL DEFAULT '0',
  `amount_paid_cents` int NOT NULL DEFAULT '0',
  `currency` varchar(10) NOT NULL DEFAULT 'usd',
  `status` enum('draft','open','paid','uncollectible','void','refunded','disputed') NOT NULL DEFAULT 'draft',
  `provider` varchar(50) NOT NULL DEFAULT 'system',
  `provider_invoice_id` varchar(255) DEFAULT NULL,
  `hosted_invoice_url` varchar(512) DEFAULT NULL,
  `invoice_pdf_url` varchar(512) DEFAULT NULL,
  `period_start` timestamp NULL DEFAULT NULL,
  `period_end` timestamp NULL DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `billing_invoices_invoice_number_unique` (`invoice_number`),
  KEY `billing_invoices_subscription_id_foreign` (`subscription_id`),
  KEY `idx_billing_invoices_tenant` (`tenant_id`),
  KEY `idx_billing_invoices_status` (`status`),
  KEY `idx_billing_invoices_number` (`invoice_number`),
  KEY `idx_billing_invoices_provider_id` (`provider_invoice_id`),
  CONSTRAINT `billing_invoices_subscription_id_foreign` FOREIGN KEY (`subscription_id`) REFERENCES `tenant_subscriptions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `billing_invoices_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `billing_notifications`;
CREATE TABLE `billing_notifications` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `severity` varchar(20) NOT NULL DEFAULT 'info',
  `action_url` varchar(255) DEFAULT NULL,
  `action_label` varchar(100) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `is_dismissed` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `billing_notifications_user_id_foreign` (`user_id`),
  KEY `idx_billing_notif_tenant` (`tenant_id`,`is_dismissed`),
  KEY `idx_billing_notif_created` (`created_at`),
  CONSTRAINT `billing_notifications_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `billing_notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `billing_webhook_deliveries`;
CREATE TABLE `billing_webhook_deliveries` (
  `id` char(36) NOT NULL,
  `provider` varchar(50) NOT NULL DEFAULT 'stripe',
  `provider_event_id` varchar(255) DEFAULT NULL,
  `event_type` varchar(100) NOT NULL,
  `tenant_id` char(36) DEFAULT NULL,
  `payload` longtext NOT NULL,
  `signature` text,
  `status` enum('pending','processing','processed','failed','dead_letter','discarded') NOT NULL DEFAULT 'pending',
  `attempts` int NOT NULL DEFAULT '0',
  `max_attempts` int NOT NULL DEFAULT '5',
  `next_retry_at` timestamp NULL DEFAULT NULL,
  `last_attempt_at` timestamp NULL DEFAULT NULL,
  `last_error` text,
  `processing_time_ms` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_webhook_prov_event` (`provider`,`provider_event_id`),
  KEY `idx_webhook_status` (`status`),
  KEY `idx_webhook_next_retry` (`next_retry_at`),
  KEY `idx_webhook_tenant` (`tenant_id`),
  KEY `idx_webhook_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `brand_brains`;
CREATE TABLE `brand_brains` (
  `id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `business_profile` json NOT NULL,
  `products` json NOT NULL,
  `services` json NOT NULL,
  `usps` json NOT NULL,
  `target_audience` json NOT NULL,
  `pain_points` json NOT NULL,
  `brand_values` json NOT NULL,
  `tone` json NOT NULL,
  `writing_style` json NOT NULL,
  `languages` json NOT NULL,
  `cta_preferences` json NOT NULL,
  `emoji_preferences` json NOT NULL,
  `hashtag_preferences` json NOT NULL,
  `topics_to_avoid` json NOT NULL,
  `visual_identity` json NOT NULL,
  `content_pillars` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `brand_brains_brand_id_unique` (`brand_id`),
  CONSTRAINT `brand_brains_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `brand_goals`;
CREATE TABLE `brand_goals` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `metric` varchar(64) NOT NULL,
  `target_value` float(8,2) NOT NULL,
  `period` varchar(32) NOT NULL DEFAULT '30d',
  `start_date` timestamp NULL DEFAULT NULL,
  `end_date` timestamp NULL DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_goal_tenant_brand_metric_period` (`tenant_id`,`brand_id`,`metric`,`period`),
  KEY `idx_goal_tenant_brand` (`tenant_id`,`brand_id`),
  KEY `idx_goal_brand_period` (`brand_id`,`period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `brand_governance_settings`;
CREATE TABLE `brand_governance_settings` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `autonomy_level` varchar(16) NOT NULL DEFAULT 'L2',
  `max_autonomy_level` varchar(16) NOT NULL DEFAULT 'L5',
  `require_approval_for_all_external` tinyint(1) NOT NULL DEFAULT '1',
  `emergency_paused` tinyint(1) NOT NULL DEFAULT '0',
  `paused_at` timestamp NULL DEFAULT NULL,
  `paused_by` char(36) DEFAULT NULL,
  `pause_reason` text,
  `monthly_budget_limit` decimal(10,2) NOT NULL DEFAULT '500.00',
  `current_month_spend` decimal(10,2) NOT NULL DEFAULT '0.00',
  `allowed_domains` json DEFAULT NULL,
  `banned_words` json DEFAULT NULL,
  `mandatory_disclaimers` json DEFAULT NULL,
  `policy_rules` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_brand_gov_tenant_brand` (`tenant_id`,`brand_id`),
  KEY `brand_governance_settings_brand_id_foreign` (`brand_id`),
  KEY `brand_governance_settings_paused_by_foreign` (`paused_by`),
  KEY `idx_brand_gov_tenant` (`tenant_id`),
  KEY `idx_brand_gov_autonomy` (`autonomy_level`),
  KEY `idx_brand_gov_paused` (`emergency_paused`),
  CONSTRAINT `brand_governance_settings_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `brand_governance_settings_paused_by_foreign` FOREIGN KEY (`paused_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `brand_governance_settings_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data for table `brand_governance_settings` (1 rows)
INSERT INTO `brand_governance_settings` (`id`, `tenant_id`, `brand_id`, `autonomy_level`, `max_autonomy_level`, `require_approval_for_all_external`, `emergency_paused`, `paused_at`, `paused_by`, `pause_reason`, `monthly_budget_limit`, `current_month_spend`, `allowed_domains`, `banned_words`, `mandatory_disclaimers`, `policy_rules`, `created_at`, `updated_at`) VALUES ('5e2f10b8-7b7c-4ad2-a748-331834ba2789', '1d9190fa-bd85-4304-8e73-8ef3ca62c342', 'b9c9780e-2ff1-48d8-9b11-67174872f793', 'L2', 'L5', 1, 0, NULL, NULL, NULL, '500.00', '0.00', '["myshopify.com","acme.com","socialforge.ai"]', '["miracle cure","guaranteed returns","risk-free"]', '["#sponsored","#ad","Terms apply"]', '{}', '2026-10-10 21:51:20', '2026-10-10 21:51:20');

DROP TABLE IF EXISTS `brand_kits`;
CREATE TABLE `brand_kits` (
  `id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `tone_of_voice` json NOT NULL,
  `target_audiences` json NOT NULL,
  `primary_colors` json NOT NULL,
  `fonts` json NOT NULL,
  `logo_urls` json NOT NULL,
  `hashtags_default` json NOT NULL,
  `disclaimers` text,
  `taboo_words` json NOT NULL,
  `guidelines` text,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `brand_kits_brand_id_unique` (`brand_id`),
  CONSTRAINT `brand_kits_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `brand_knowledge_edges`;
CREATE TABLE `brand_knowledge_edges` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `brand_id` varchar(36) NOT NULL,
  `source_node_id` varchar(36) NOT NULL,
  `target_node_id` varchar(36) NOT NULL,
  `relation_type` varchar(32) NOT NULL,
  `confidence_score` decimal(3,2) NOT NULL DEFAULT '1.00',
  `is_bidirectional` tinyint(1) NOT NULL DEFAULT '0',
  `metadata_json` json NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bke_tenant` (`tenant_id`),
  KEY `idx_bke_brand` (`brand_id`),
  KEY `idx_bke_source` (`source_node_id`),
  KEY `idx_bke_target` (`target_node_id`),
  KEY `idx_bke_relation` (`relation_type`),
  CONSTRAINT `brand_knowledge_edges_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `brand_knowledge_edges_source_node_id_foreign` FOREIGN KEY (`source_node_id`) REFERENCES `brand_knowledge_nodes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `brand_knowledge_edges_target_node_id_foreign` FOREIGN KEY (`target_node_id`) REFERENCES `brand_knowledge_nodes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `brand_knowledge_edges_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `brand_knowledge_nodes`;
CREATE TABLE `brand_knowledge_nodes` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `brand_id` varchar(36) NOT NULL,
  `entity_type` varchar(32) NOT NULL,
  `name` varchar(128) NOT NULL,
  `slug` varchar(64) NOT NULL,
  `description` text,
  `attributes_json` json NOT NULL,
  `embedding_vector` json DEFAULT NULL,
  `vector_dimensions` int NOT NULL DEFAULT '1536',
  `embedding_status` varchar(32) NOT NULL DEFAULT 'embedded',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bkn_tenant` (`tenant_id`),
  KEY `idx_bkn_brand` (`brand_id`),
  KEY `idx_bkn_entity_type` (`entity_type`),
  KEY `idx_bkn_slug` (`slug`),
  KEY `idx_bkn_emb_status` (`embedding_status`),
  CONSTRAINT `brand_knowledge_nodes_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `brand_knowledge_nodes_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `brand_learning_insights`;
CREATE TABLE `brand_learning_insights` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `insight_type` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `summary` text NOT NULL,
  `confidence` float(8,2) NOT NULL DEFAULT '1.00',
  `sample_size` int NOT NULL DEFAULT '1',
  `performance_lift` decimal(8,2) NOT NULL DEFAULT '0.00',
  `recommended_action` text,
  `metadata` json DEFAULT NULL,
  `applied_to_brand_brain` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `brand_learning_insights_brand_id_foreign` (`brand_id`),
  KEY `idx_brand_learning_tenant_brand` (`tenant_id`,`brand_id`),
  KEY `idx_brand_learning_type` (`insight_type`),
  CONSTRAINT `brand_learning_insights_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `brand_learning_insights_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `brand_performance_baselines`;
CREATE TABLE `brand_performance_baselines` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `platform` varchar(32) NOT NULL DEFAULT 'all',
  `period` varchar(16) NOT NULL,
  `post_count` int NOT NULL DEFAULT '0',
  `avg_impressions` float(8,2) NOT NULL DEFAULT '0.00',
  `avg_reach` float(8,2) NOT NULL DEFAULT '0.00',
  `avg_engagements` float(8,2) NOT NULL DEFAULT '0.00',
  `avg_engagement_rate` float(8,2) NOT NULL DEFAULT '0.00',
  `avg_shares` float(8,2) NOT NULL DEFAULT '0.00',
  `avg_comments` float(8,2) NOT NULL DEFAULT '0.00',
  `avg_saves` float(8,2) NOT NULL DEFAULT '0.00',
  `avg_clicks` float(8,2) NOT NULL DEFAULT '0.00',
  `avg_velocity_score` float(8,2) NOT NULL DEFAULT '0.00',
  `avg_half_life_hours` float(8,2) NOT NULL DEFAULT '0.00',
  `calculated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_baseline_tenant_brand_plat_period` (`tenant_id`,`brand_id`,`platform`,`period`),
  KEY `idx_baseline_tenant_brand` (`tenant_id`,`brand_id`),
  KEY `idx_baseline_brand_period` (`brand_id`,`period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `brand_users`;
CREATE TABLE `brand_users` (
  `id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `brand_role` varchar(50) NOT NULL DEFAULT 'creator',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_brand_user` (`brand_id`,`user_id`),
  KEY `idx_brand_users_user_id` (`user_id`),
  CONSTRAINT `brand_users_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `brand_users_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `brands`;
CREATE TABLE `brands` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `industry` varchar(100) DEFAULT NULL,
  `website_url` text,
  `timezone` varchar(100) NOT NULL DEFAULT 'UTC',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_brand_slug_per_tenant` (`tenant_id`,`slug`),
  KEY `idx_brands_tenant_id` (`tenant_id`),
  CONSTRAINT `brands_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data for table `brands` (3 rows)
INSERT INTO `brands` (`id`, `tenant_id`, `name`, `slug`, `industry`, `website_url`, `timezone`, `created_at`, `updated_at`) VALUES ('05f4c446-4c69-4bd7-b958-13b1f60cf17a', 'e656d363-c1f0-4e0e-bfa2-6bef9bda232c', 'Echo Sound Labs', 'echo-sound', 'Audio & Music Hardware', 'https://echosound.example.com', 'America/Los_Angeles', '2026-11-25 00:47:30', '2026-11-25 00:47:30');
INSERT INTO `brands` (`id`, `tenant_id`, `name`, `slug`, `industry`, `website_url`, `timezone`, `created_at`, `updated_at`) VALUES ('52f09a1e-e490-4c01-9674-4eb729bd5108', '1d9190fa-bd85-4304-8e73-8ef3ca62c342', 'HOASP International', 'hoasp-international', 'Enterprise Software & IT Solutions', 'https://hoaspinternational.com', 'Asia/Kolkata', '2026-09-24 22:18:12', '2026-09-24 22:18:12');
INSERT INTO `brands` (`id`, `tenant_id`, `name`, `slug`, `industry`, `website_url`, `timezone`, `created_at`, `updated_at`) VALUES ('b9c9780e-2ff1-48d8-9b11-67174872f793', '1d9190fa-bd85-4304-8e73-8ef3ca62c342', 'Zubelin', 'zubelin', 'Artificial Jewelery', 'https://zubelin.com', 'Asia/Kolkata', '2026-10-04 09:15:33', '2026-10-04 09:15:33');

DROP TABLE IF EXISTS `campaigns`;
CREATE TABLE `campaigns` (
  `id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `goal` varchar(100) DEFAULT NULL,
  `strategy` json DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `campaigns_brand_id_foreign` (`brand_id`),
  CONSTRAINT `campaigns_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `canvas_document_snapshots`;
CREATE TABLE `canvas_document_snapshots` (
  `id` varchar(64) NOT NULL,
  `room_id` varchar(64) NOT NULL,
  `revision` int NOT NULL DEFAULT '0',
  `elements_payload` longtext NOT NULL,
  `total_elements_count` int NOT NULL DEFAULT '0',
  `checksum_sha256` varchar(128) NOT NULL,
  `compacted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `canvas_document_snapshots_room_id_index` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `chaos_experiments`;
CREATE TABLE `chaos_experiments` (
  `id` varchar(36) NOT NULL,
  `name` varchar(160) NOT NULL,
  `target_subsystem` varchar(48) NOT NULL,
  `fault_type` varchar(48) NOT NULL,
  `blast_radius_percent` int NOT NULL DEFAULT '10',
  `target_tenant_id` varchar(36) DEFAULT NULL,
  `fault_config` json NOT NULL,
  `duration_seconds` int NOT NULL DEFAULT '60',
  `status` varchar(32) NOT NULL DEFAULT 'draft',
  `tripwire_thresholds` json NOT NULL,
  `resilience_score` decimal(5,2) DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ce_subsystem` (`target_subsystem`),
  KEY `idx_ce_fault` (`fault_type`),
  KEY `idx_ce_tenant` (`target_tenant_id`),
  KEY `idx_ce_status` (`status`),
  CONSTRAINT `chaos_experiments_target_tenant_id_foreign` FOREIGN KEY (`target_tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `chaos_fault_executions`;
CREATE TABLE `chaos_fault_executions` (
  `id` varchar(36) NOT NULL,
  `experiment_id` varchar(36) NOT NULL,
  `subsystem` varchar(48) NOT NULL,
  `fault_type` varchar(48) NOT NULL,
  `affected_requests_count` int NOT NULL DEFAULT '0',
  `injected_latency_ms_avg` int NOT NULL DEFAULT '0',
  `tripped_threshold` varchar(160) DEFAULT NULL,
  `emergency_aborted` tinyint(1) NOT NULL DEFAULT '0',
  `recovery_time_seconds` decimal(6,2) NOT NULL DEFAULT '0.00',
  `execution_logs` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cfe_exp` (`experiment_id`),
  KEY `idx_cfe_created` (`created_at`),
  CONSTRAINT `chaos_fault_executions_experiment_id_foreign` FOREIGN KEY (`experiment_id`) REFERENCES `chaos_experiments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `chaos_tripwire_events`;
CREATE TABLE `chaos_tripwire_events` (
  `id` varchar(36) NOT NULL,
  `experiment_id` varchar(36) NOT NULL,
  `metric_name` varchar(64) NOT NULL,
  `observed_value` decimal(10,2) NOT NULL,
  `threshold_value` decimal(10,2) NOT NULL,
  `action_taken` varchar(32) NOT NULL DEFAULT 'emergency_aborted',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cte_exp` (`experiment_id`),
  CONSTRAINT `chaos_tripwire_events_experiment_id_foreign` FOREIGN KEY (`experiment_id`) REFERENCES `chaos_experiments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `cloud_cost_accounts`;
CREATE TABLE `cloud_cost_accounts` (
  `id` varchar(36) NOT NULL,
  `provider` varchar(48) NOT NULL,
  `account_id` varchar(64) NOT NULL,
  `account_name` varchar(120) NOT NULL,
  `currency` varchar(8) NOT NULL DEFAULT 'USD',
  `monthly_budget` decimal(10,2) NOT NULL DEFAULT '5000.00',
  `current_month_spend` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cca_provider` (`provider`),
  KEY `idx_cca_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `collaborative_canvas_rooms`;
CREATE TABLE `collaborative_canvas_rooms` (
  `id` varchar(64) NOT NULL,
  `room_name` varchar(128) NOT NULL,
  `target_brand_id` varchar(64) NOT NULL,
  `template_id` varchar(64) DEFAULT NULL,
  `current_revision` int NOT NULL DEFAULT '0',
  `active_peers_count` int NOT NULL DEFAULT '0',
  `is_locked` tinyint(1) NOT NULL DEFAULT '0',
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `collaborative_canvas_rooms_target_brand_id_index` (`target_brand_id`),
  KEY `collaborative_canvas_rooms_template_id_index` (`template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `compliance_auditor_sessions`;
CREATE TABLE `compliance_auditor_sessions` (
  `id` varchar(64) NOT NULL,
  `auditor_email` varchar(255) NOT NULL,
  `auditor_firm` varchar(255) NOT NULL,
  `access_token` varchar(128) NOT NULL,
  `framework_scope` json NOT NULL,
  `expires_at` timestamp NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `compliance_auditor_sessions_access_token_unique` (`access_token`),
  KEY `compliance_auditor_sessions_auditor_email_index` (`auditor_email`),
  KEY `compliance_auditor_sessions_is_active_index` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `compliance_controls`;
CREATE TABLE `compliance_controls` (
  `id` varchar(64) NOT NULL,
  `control_code` varchar(64) NOT NULL,
  `framework` varchar(32) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `collector_type` varchar(64) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'compliant',
  `automated_check` tinyint(1) NOT NULL DEFAULT '1',
  `last_evaluated_at` timestamp NULL DEFAULT NULL,
  `evidence_count` int NOT NULL DEFAULT '1',
  `pass_percentage` decimal(5,2) NOT NULL DEFAULT '100.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `compliance_controls_control_code_index` (`control_code`),
  KEY `compliance_controls_framework_index` (`framework`),
  KEY `compliance_controls_collector_type_index` (`collector_type`),
  KEY `compliance_controls_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `compliance_evidences`;
CREATE TABLE `compliance_evidences` (
  `id` varchar(64) NOT NULL,
  `control_id` varchar(64) NOT NULL,
  `control_code` varchar(64) NOT NULL,
  `collector_type` varchar(64) NOT NULL,
  `evidence_title` varchar(255) NOT NULL,
  `evidence_payload_hash` varchar(64) NOT NULL,
  `evidence_data` json DEFAULT NULL,
  `evaluation_status` varchar(32) NOT NULL DEFAULT 'passed',
  `collected_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `compliance_evidences_control_id_index` (`control_id`),
  KEY `compliance_evidences_control_code_index` (`control_code`),
  KEY `compliance_evidences_evaluation_status_index` (`evaluation_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `compliance_export_jobs`;
CREATE TABLE `compliance_export_jobs` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `requester_id` varchar(36) NOT NULL,
  `requester_email` varchar(255) NOT NULL,
  `export_type` enum('full_tenant','gdpr_sar','soc2_audit','analytics_raw') NOT NULL,
  `status` enum('pending','processing','completed','failed','expired') DEFAULT 'pending',
  `format` enum('zip_json','zip_csv','json') DEFAULT 'zip_json',
  `artifact_url` text,
  `artifact_sha256` varchar(64) DEFAULT NULL,
  `file_size_bytes` bigint DEFAULT NULL,
  `record_count` int DEFAULT '0',
  `expires_at` timestamp NULL DEFAULT NULL,
  `error_message` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `compliance_export_jobs_tenant_id_index` (`tenant_id`),
  KEY `compliance_export_jobs_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `compliance_purge_certificates`;
CREATE TABLE `compliance_purge_certificates` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `policy_id` varchar(36) DEFAULT NULL,
  `data_category` varchar(64) NOT NULL,
  `records_purged` int NOT NULL,
  `requester_email` varchar(255) NOT NULL,
  `certificate_signature` varchar(128) NOT NULL,
  `purge_timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `compliance_purge_certificates_tenant_id_index` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `compliance_retention_policies`;
CREATE TABLE `compliance_retention_policies` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) DEFAULT NULL,
  `data_category` varchar(64) NOT NULL,
  `retention_days` int NOT NULL,
  `auto_purge_enabled` tinyint(1) DEFAULT '0',
  `grace_period_days` int DEFAULT '14',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `compliance_retention_policies_tenant_id_index` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `conflict_resolution_policies`;
CREATE TABLE `conflict_resolution_policies` (
  `id` varchar(64) NOT NULL,
  `policy_name` varchar(128) NOT NULL,
  `entity_type` varchar(64) NOT NULL,
  `resolution_strategy` varchar(64) NOT NULL DEFAULT 'lww_timestamp',
  `tie_breaker_region` varchar(64) NOT NULL DEFAULT 'us-east-1',
  `auto_resolve` tinyint(1) NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `conflict_resolution_policies_policy_name_unique` (`policy_name`),
  UNIQUE KEY `conflict_resolution_policies_entity_type_unique` (`entity_type`),
  KEY `conflict_resolution_policies_is_active_index` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `connection_credentials`;
CREATE TABLE `connection_credentials` (
  `id` varchar(64) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `connection_id` char(36) NOT NULL,
  `encrypted_data` longtext NOT NULL,
  `iv` varchar(64) NOT NULL,
  `auth_tag` varchar(64) NOT NULL,
  `algorithm` varchar(32) NOT NULL DEFAULT 'aes-256-gcm',
  `key_version` int NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_conn_creds_tenant` (`tenant_id`),
  KEY `idx_conn_creds_connection` (`connection_id`),
  CONSTRAINT `connection_credentials_connection_id_foreign` FOREIGN KEY (`connection_id`) REFERENCES `social_connections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `connection_credentials_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `connection_events`;
CREATE TABLE `connection_events` (
  `id` char(36) NOT NULL,
  `connection_id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) DEFAULT NULL,
  `event_type` varchar(64) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'success',
  `details` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `connection_events_brand_id_foreign` (`brand_id`),
  KEY `idx_conn_events_connection` (`connection_id`),
  KEY `idx_conn_events_tenant_brand` (`tenant_id`,`brand_id`),
  KEY `idx_conn_events_type` (`event_type`),
  KEY `idx_conn_events_created_at` (`created_at`),
  CONSTRAINT `connection_events_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `connection_events_connection_id_foreign` FOREIGN KEY (`connection_id`) REFERENCES `social_connections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `connection_events_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `connector_resources`;
CREATE TABLE `connector_resources` (
  `id` char(36) NOT NULL,
  `connection_id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `resource_type` varchar(64) NOT NULL,
  `external_resource_id` varchar(255) NOT NULL,
  `resource_name` varchar(255) NOT NULL,
  `is_selected` tinyint(1) NOT NULL DEFAULT '0',
  `permissions` json DEFAULT NULL,
  `config` json DEFAULT NULL,
  `sync_cursor` varchar(255) DEFAULT NULL,
  `sync_status` varchar(64) NOT NULL DEFAULT 'idle',
  `last_synced_at` timestamp NULL DEFAULT NULL,
  `webhook_subscription_id` varchar(255) DEFAULT NULL,
  `webhook_expires_at` timestamp NULL DEFAULT NULL,
  `error_message` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `connector_resources_brand_id_foreign` (`brand_id`),
  KEY `idx_connector_res_connection` (`connection_id`),
  KEY `idx_connector_res_tenant_brand` (`tenant_id`,`brand_id`),
  KEY `idx_connector_res_type_selected` (`resource_type`,`is_selected`),
  KEY `idx_cr_conn_type_sel` (`connection_id`,`resource_type`,`is_selected`),
  CONSTRAINT `connector_resources_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `connector_resources_connection_id_foreign` FOREIGN KEY (`connection_id`) REFERENCES `social_connections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `connector_resources_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `copilot_automation_plans`;
CREATE TABLE `copilot_automation_plans` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `prompt` text NOT NULL,
  `extracted_intent` json NOT NULL,
  `structured_plan` json NOT NULL,
  `validation_report` json NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'validated',
  `automation_id` char(36) DEFAULT NULL,
  `tool_calls` json DEFAULT NULL,
  `test_results` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `copilot_automation_plans_brand_id_foreign` (`brand_id`),
  KEY `copilot_automation_plans_user_id_foreign` (`user_id`),
  KEY `copilot_automation_plans_automation_id_foreign` (`automation_id`),
  KEY `idx_copilot_plans_tenant_brand` (`tenant_id`,`brand_id`),
  KEY `idx_copilot_plans_status` (`status`),
  KEY `idx_copilot_plans_created` (`created_at`),
  CONSTRAINT `copilot_automation_plans_automation_id_foreign` FOREIGN KEY (`automation_id`) REFERENCES `automations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `copilot_automation_plans_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `copilot_automation_plans_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `copilot_automation_plans_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `cqrs_materialized_views`;
CREATE TABLE `cqrs_materialized_views` (
  `id` varchar(64) NOT NULL,
  `view_name` varchar(128) NOT NULL,
  `target_entity` varchar(64) NOT NULL,
  `source_tables` json NOT NULL,
  `refresh_mode` varchar(32) NOT NULL DEFAULT 'incremental',
  `refresh_cron` varchar(64) NOT NULL DEFAULT '*/15 * * * *',
  `last_refreshed_at` timestamp NULL DEFAULT NULL,
  `row_count` bigint NOT NULL DEFAULT '0',
  `refresh_duration_ms` int NOT NULL DEFAULT '0',
  `status` varchar(32) NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `cqrs_materialized_views_view_name_unique` (`view_name`),
  KEY `cqrs_materialized_views_target_entity_index` (`target_entity`),
  KEY `cqrs_materialized_views_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `crm_activities`;
CREATE TABLE `crm_activities` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `contact_id` char(36) DEFAULT NULL,
  `deal_id` char(36) DEFAULT NULL,
  `activity_type` varchar(50) NOT NULL,
  `description` text NOT NULL,
  `metadata` json DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `crm_activities_tenant_id_foreign` (`tenant_id`),
  KEY `crm_activities_brand_id_foreign` (`brand_id`),
  KEY `idx_crm_act_contact` (`contact_id`),
  KEY `idx_crm_act_deal` (`deal_id`),
  CONSTRAINT `crm_activities_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `crm_activities_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `crm_contacts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `crm_activities_deal_id_foreign` FOREIGN KEY (`deal_id`) REFERENCES `crm_deals` (`id`) ON DELETE CASCADE,
  CONSTRAINT `crm_activities_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `crm_contacts`;
CREATE TABLE `crm_contacts` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `job_title` varchar(150) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'lead',
  `lead_source` varchar(100) DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `custom_fields` json DEFAULT NULL,
  `last_contacted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `crm_contacts_tenant_id_foreign` (`tenant_id`),
  KEY `idx_crm_contact_brand_status` (`brand_id`,`status`),
  KEY `idx_crm_contact_brand_email` (`brand_id`,`email`),
  CONSTRAINT `crm_contacts_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `crm_contacts_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `crm_deals`;
CREATE TABLE `crm_deals` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `pipeline_id` char(36) NOT NULL,
  `stage_id` char(36) NOT NULL,
  `contact_id` char(36) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `value` decimal(12,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(10) NOT NULL DEFAULT 'USD',
  `expected_close_date` timestamp NULL DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'OPEN',
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `crm_deals_tenant_id_foreign` (`tenant_id`),
  KEY `crm_deals_pipeline_id_foreign` (`pipeline_id`),
  KEY `crm_deals_stage_id_foreign` (`stage_id`),
  KEY `crm_deals_contact_id_foreign` (`contact_id`),
  KEY `idx_crm_deals_brand_stage` (`brand_id`,`pipeline_id`,`stage_id`),
  KEY `idx_crm_deals_status` (`brand_id`,`status`),
  CONSTRAINT `crm_deals_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `crm_deals_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `crm_contacts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `crm_deals_pipeline_id_foreign` FOREIGN KEY (`pipeline_id`) REFERENCES `crm_pipelines` (`id`) ON DELETE CASCADE,
  CONSTRAINT `crm_deals_stage_id_foreign` FOREIGN KEY (`stage_id`) REFERENCES `crm_stages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `crm_deals_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `crm_pipelines`;
CREATE TABLE `crm_pipelines` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `name` varchar(150) NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `crm_pipelines_tenant_id_foreign` (`tenant_id`),
  KEY `idx_crm_pipeline_brand` (`brand_id`,`is_default`),
  CONSTRAINT `crm_pipelines_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `crm_pipelines_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `crm_stages`;
CREATE TABLE `crm_stages` (
  `id` char(36) NOT NULL,
  `pipeline_id` char(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `stage_order` int NOT NULL DEFAULT '0',
  `color` varchar(50) NOT NULL DEFAULT '#3b82f6',
  `win_probability` int NOT NULL DEFAULT '50',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_crm_stage_pipeline_order` (`pipeline_id`,`stage_order`),
  CONSTRAINT `crm_stages_pipeline_id_foreign` FOREIGN KEY (`pipeline_id`) REFERENCES `crm_pipelines` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `cross_channel_repurposings`;
CREATE TABLE `cross_channel_repurposings` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `source_post_id` char(36) NOT NULL,
  `source_variant_id` char(36) NOT NULL,
  `source_platform` varchar(32) NOT NULL,
  `source_format` varchar(32) NOT NULL,
  `target_platform` varchar(32) NOT NULL,
  `target_format` varchar(32) NOT NULL,
  `winning_factor` varchar(255) NOT NULL,
  `adaptation_guide` text NOT NULL,
  `estimated_potential_lift_pct` float(8,2) NOT NULL DEFAULT '0.00',
  `confidence_score` float(8,2) NOT NULL DEFAULT '0.85',
  `status` varchar(32) NOT NULL DEFAULT 'suggested',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_repurposing_tenant_brand` (`tenant_id`,`brand_id`),
  KEY `idx_repurposing_brand_status` (`brand_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `custom_domain_access_logs`;
CREATE TABLE `custom_domain_access_logs` (
  `id` varchar(36) NOT NULL,
  `custom_domain_id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `host_header` varchar(255) NOT NULL,
  `request_path` varchar(512) NOT NULL,
  `client_ip` varchar(64) DEFAULT NULL,
  `user_agent` varchar(512) DEFAULT NULL,
  `status_code` int NOT NULL,
  `response_time_ms` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_domain_logs_tenant` (`tenant_id`),
  KEY `idx_domain_logs_created` (`created_at`),
  KEY `idx_domain_logs_lookup` (`custom_domain_id`,`created_at`),
  CONSTRAINT `custom_domain_access_logs_custom_domain_id_foreign` FOREIGN KEY (`custom_domain_id`) REFERENCES `custom_domains` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `custom_domains`;
CREATE TABLE `custom_domains` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `domain` varchar(255) NOT NULL,
  `portal_type` varchar(32) NOT NULL DEFAULT 'client_review',
  `status` varchar(32) NOT NULL DEFAULT 'pending_dns',
  `verification_token` varchar(64) NOT NULL,
  `verification_method` varchar(16) NOT NULL DEFAULT 'cname',
  `dns_target` varchar(255) NOT NULL DEFAULT 'cname.socialforge.ai',
  `cname_verified` tinyint(1) NOT NULL DEFAULT '0',
  `txt_verified` tinyint(1) NOT NULL DEFAULT '0',
  `ssl_status` varchar(32) NOT NULL DEFAULT 'pending',
  `ssl_auto_renew` tinyint(1) NOT NULL DEFAULT '1',
  `ssl_issued_at` datetime DEFAULT NULL,
  `ssl_expires_at` datetime DEFAULT NULL,
  `ssl_issuer` varchar(128) DEFAULT NULL,
  `branding_json` json NOT NULL,
  `enforce_https` tinyint(1) NOT NULL DEFAULT '1',
  `last_dns_check_at` datetime DEFAULT NULL,
  `dns_error_details` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_custom_domain` (`domain`),
  KEY `idx_custom_domains_tenant` (`tenant_id`),
  KEY `idx_custom_domains_status` (`status`),
  CONSTRAINT `custom_domains_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `custom_roles_and_permissions`;
CREATE TABLE `custom_roles_and_permissions` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) DEFAULT NULL,
  `role_slug` varchar(64) NOT NULL,
  `role_name` varchar(128) NOT NULL,
  `description` text,
  `permissions` json NOT NULL,
  `parent_role_slug` varchar(64) DEFAULT NULL,
  `is_system` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `custom_roles_and_permissions_role_slug_unique` (`role_slug`),
  KEY `custom_roles_and_permissions_tenant_id_index` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `customer_ltv_metrics`;
CREATE TABLE `customer_ltv_metrics` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `current_mrr` decimal(10,2) NOT NULL DEFAULT '0.00',
  `historical_revenue_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `predicted_ltv_months` int NOT NULL DEFAULT '24',
  `projected_ltv_total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `expansion_potential_score` decimal(5,2) NOT NULL DEFAULT '0.00',
  `expansion_tier` varchar(32) NOT NULL DEFAULT 'modest',
  `upsell_recommendations_json` json NOT NULL,
  `evaluated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_clm_tenant` (`tenant_id`),
  KEY `idx_clm_tier` (`expansion_tier`),
  CONSTRAINT `customer_ltv_metrics_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `customer_success_interventions`;
CREATE TABLE `customer_success_interventions` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `churn_score_id` varchar(36) DEFAULT NULL,
  `title` varchar(160) NOT NULL,
  `playbook_type` varchar(40) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `priority` varchar(20) NOT NULL DEFAULT 'medium',
  `assigned_to` varchar(100) NOT NULL,
  `trigger_reason` text NOT NULL,
  `resolution_notes` text,
  `outcome_effectiveness` varchar(30) DEFAULT NULL,
  `due_date` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_csi_tenant` (`tenant_id`),
  KEY `customer_success_interventions_churn_score_id_foreign` (`churn_score_id`),
  KEY `idx_csi_playbook` (`playbook_type`),
  KEY `idx_csi_status` (`status`),
  KEY `idx_csi_priority` (`priority`),
  KEY `idx_csi_outcome` (`outcome_effectiveness`),
  CONSTRAINT `customer_success_interventions_churn_score_id_foreign` FOREIGN KEY (`churn_score_id`) REFERENCES `tenant_churn_scores` (`id`) ON DELETE SET NULL,
  CONSTRAINT `customer_success_interventions_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `database_shards`;
CREATE TABLE `database_shards` (
  `id` varchar(64) NOT NULL,
  `shard_name` varchar(128) NOT NULL,
  `region` varchar(64) NOT NULL,
  `host_endpoint` varchar(255) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'online',
  `allocated_vnodes` int NOT NULL DEFAULT '0',
  `total_keys_count` int NOT NULL DEFAULT '0',
  `storage_size_bytes` bigint NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `database_shards_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `db_archival_policies`;
CREATE TABLE `db_archival_policies` (
  `id` varchar(64) NOT NULL,
  `policy_name` varchar(128) NOT NULL,
  `target_table` varchar(128) NOT NULL,
  `age_threshold_days` int NOT NULL DEFAULT '90',
  `target_storage_tier` varchar(32) NOT NULL DEFAULT 's3_glacier',
  `compression_format` varchar(32) NOT NULL DEFAULT 'parquet_zstd',
  `schedule_cron` varchar(64) NOT NULL DEFAULT '0 2 * * 0',
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `last_run_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `db_archival_policies_policy_name_unique` (`policy_name`),
  KEY `db_archival_policies_target_table_index` (`target_table`),
  KEY `db_archival_policies_target_storage_tier_index` (`target_storage_tier`),
  KEY `db_archival_policies_is_enabled_index` (`is_enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `db_cold_tier_archives`;
CREATE TABLE `db_cold_tier_archives` (
  `id` varchar(64) NOT NULL,
  `policy_id` varchar(64) NOT NULL,
  `table_name` varchar(128) NOT NULL,
  `partition_name` varchar(128) NOT NULL,
  `date_range_start` timestamp NOT NULL,
  `date_range_end` timestamp NOT NULL,
  `row_count` bigint NOT NULL DEFAULT '0',
  `uncompressed_bytes` bigint NOT NULL DEFAULT '0',
  `compressed_bytes` bigint NOT NULL DEFAULT '0',
  `compression_ratio` decimal(6,2) NOT NULL DEFAULT '0.00',
  `storage_uri` varchar(512) NOT NULL,
  `checksum_sha256` varchar(64) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'archived',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `restored_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `db_cold_tier_archives_policy_id_index` (`policy_id`),
  KEY `db_cold_tier_archives_table_name_index` (`table_name`),
  KEY `db_cold_tier_archives_partition_name_index` (`partition_name`),
  KEY `db_cold_tier_archives_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `db_partition_configs`;
CREATE TABLE `db_partition_configs` (
  `id` varchar(64) NOT NULL,
  `table_name` varchar(128) NOT NULL,
  `partition_type` varchar(32) NOT NULL DEFAULT 'range_date',
  `partition_key` varchar(64) NOT NULL,
  `retention_days` int NOT NULL DEFAULT '90',
  `active_partition_count` int NOT NULL DEFAULT '12',
  `total_row_count` bigint NOT NULL DEFAULT '0',
  `total_size_mb` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `last_pruned_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `db_partition_configs_table_name_unique` (`table_name`),
  KEY `db_partition_configs_table_name_index` (`table_name`),
  KEY `db_partition_configs_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `db_partition_maintenance_logs`;
CREATE TABLE `db_partition_maintenance_logs` (
  `id` varchar(64) NOT NULL,
  `action` varchar(64) NOT NULL,
  `table_name` varchar(128) NOT NULL,
  `details` json DEFAULT NULL,
  `duration_ms` int NOT NULL DEFAULT '0',
  `status` varchar(32) NOT NULL DEFAULT 'success',
  `executed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `db_partition_maintenance_logs_action_index` (`action`),
  KEY `db_partition_maintenance_logs_table_name_index` (`table_name`),
  KEY `db_partition_maintenance_logs_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `distributed_convergence_logs`;
CREATE TABLE `distributed_convergence_logs` (
  `id` varchar(64) NOT NULL,
  `conflict_id` varchar(64) NOT NULL,
  `entity_type` varchar(64) NOT NULL,
  `entity_id` varchar(64) NOT NULL,
  `conflicting_regions` json NOT NULL,
  `winning_region` varchar(64) NOT NULL,
  `strategy_applied` varchar(64) NOT NULL,
  `resolution_latency_ms` int NOT NULL DEFAULT '0',
  `convergence_status` varchar(32) NOT NULL DEFAULT 'resolved',
  `details` json DEFAULT NULL,
  `resolved_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `distributed_convergence_logs_conflict_id_index` (`conflict_id`),
  KEY `distributed_convergence_logs_entity_type_index` (`entity_type`),
  KEY `distributed_convergence_logs_entity_id_index` (`entity_id`),
  KEY `distributed_convergence_logs_convergence_status_index` (`convergence_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `distributed_locks`;
CREATE TABLE `distributed_locks` (
  `lock_key` varchar(255) NOT NULL,
  `owner_token` varchar(64) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `acquired_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`lock_key`),
  KEY `idx_locks_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `distributed_transactions`;
CREATE TABLE `distributed_transactions` (
  `id` varchar(64) NOT NULL,
  `coordinator_node_id` varchar(64) NOT NULL,
  `target_tenant_id` varchar(64) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'preparing',
  `participating_shards` json NOT NULL,
  `payload` json NOT NULL,
  `error_message` mediumtext,
  `started_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `distributed_transactions_target_tenant_id_index` (`target_tenant_id`),
  KEY `distributed_transactions_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `dlp_incidents`;
CREATE TABLE `dlp_incidents` (
  `id` varchar(64) NOT NULL,
  `tenant_id` varchar(64) NOT NULL,
  `policy_id` varchar(64) NOT NULL,
  `target_scope` varchar(64) NOT NULL,
  `entity_type` varchar(64) NOT NULL,
  `entity_id` varchar(64) DEFAULT NULL,
  `severity` varchar(16) NOT NULL,
  `action_taken` varchar(32) NOT NULL,
  `match_count` int NOT NULL DEFAULT '1',
  `violation_details` json NOT NULL,
  `masked_content` text NOT NULL,
  `quarantine_status` varchar(32) NOT NULL DEFAULT 'none',
  `reviewed_by` varchar(64) DEFAULT NULL,
  `review_notes` text,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `dlp_incidents_tenant_id_index` (`tenant_id`),
  KEY `dlp_incidents_policy_id_index` (`policy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `dlp_policies`;
CREATE TABLE `dlp_policies` (
  `id` varchar(64) NOT NULL,
  `tenant_id` varchar(64) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `category` varchar(32) NOT NULL,
  `severity` varchar(16) NOT NULL DEFAULT 'warning',
  `action` varchar(32) NOT NULL DEFAULT 'redact_inline',
  `match_patterns` json NOT NULL,
  `target_scopes` json NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `dlp_policies_tenant_id_index` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `dual_authorization_rules`;
CREATE TABLE `dual_authorization_rules` (
  `id` varchar(64) NOT NULL,
  `action_name` varchar(128) NOT NULL,
  `description` varchar(255) NOT NULL,
  `target_resource_type` varchar(64) NOT NULL,
  `required_approvers` int NOT NULL DEFAULT '2',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dual_authorization_rules_action_name_unique` (`action_name`),
  KEY `dual_authorization_rules_is_active_index` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `edge_cache_nodes`;
CREATE TABLE `edge_cache_nodes` (
  `id` varchar(36) NOT NULL,
  `node_code` varchar(32) NOT NULL,
  `name` varchar(128) NOT NULL,
  `region` varchar(64) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'online',
  `ip_address` varchar(64) NOT NULL,
  `latency_ms` int NOT NULL DEFAULT '20',
  `hit_ratio` decimal(5,2) NOT NULL DEFAULT '95.00',
  `uptime_percent` decimal(5,2) NOT NULL DEFAULT '99.99',
  `capacity_gb` int NOT NULL DEFAULT '500',
  `used_gb` int NOT NULL DEFAULT '120',
  `active_connections` int NOT NULL DEFAULT '0',
  `ssl_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_edge_node_code` (`node_code`),
  KEY `idx_edge_node_region` (`region`),
  KEY `idx_edge_node_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `edge_cache_rules`;
CREATE TABLE `edge_cache_rules` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) DEFAULT NULL,
  `rule_name` varchar(128) NOT NULL,
  `priority` int NOT NULL DEFAULT '100',
  `route_pattern` varchar(255) NOT NULL,
  `cache_tier` varchar(32) NOT NULL DEFAULT 'edge_memory',
  `ttl_seconds` int NOT NULL DEFAULT '300',
  `swr_seconds` int NOT NULL DEFAULT '60',
  `cache_tags` json NOT NULL,
  `bypass_on_auth` tinyint(1) NOT NULL DEFAULT '1',
  `bypass_methods` json NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_edge_rule_tenant` (`tenant_id`),
  KEY `idx_edge_rule_priority` (`priority`),
  KEY `idx_edge_rule_enabled` (`is_enabled`),
  CONSTRAINT `edge_cache_rules_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `edge_purge_logs`;
CREATE TABLE `edge_purge_logs` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) DEFAULT NULL,
  `purge_type` varchar(32) NOT NULL,
  `targets` json NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'completed',
  `reason` varchar(255) NOT NULL,
  `requested_by` varchar(36) NOT NULL,
  `nodes_affected` int NOT NULL DEFAULT '0',
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_edge_purge_tenant` (`tenant_id`),
  KEY `idx_edge_purge_type` (`purge_type`),
  KEY `idx_edge_purge_status` (`status`),
  CONSTRAINT `edge_purge_logs_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `edge_traffic_metrics`;
CREATE TABLE `edge_traffic_metrics` (
  `id` varchar(36) NOT NULL,
  `time_bucket` datetime NOT NULL,
  `edge_node_id` varchar(36) DEFAULT NULL,
  `total_requests` int NOT NULL DEFAULT '0',
  `cache_hits` int NOT NULL DEFAULT '0',
  `cache_misses` int NOT NULL DEFAULT '0',
  `cache_bypasses` int NOT NULL DEFAULT '0',
  `bandwidth_bytes` bigint NOT NULL DEFAULT '0',
  `origin_offload_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `p95_latency_ms` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_edge_metric_bucket` (`time_bucket`),
  KEY `idx_edge_metric_node` (`edge_node_id`),
  CONSTRAINT `edge_traffic_metrics_edge_node_id_foreign` FOREIGN KEY (`edge_node_id`) REFERENCES `edge_cache_nodes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `email_campaigns`;
CREATE TABLE `email_campaigns` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `preview_text` varchar(255) DEFAULT NULL,
  `from_name` varchar(100) NOT NULL,
  `from_email` varchar(255) NOT NULL,
  `reply_to` varchar(255) DEFAULT NULL,
  `html_content` longtext NOT NULL,
  `plain_text` longtext,
  `blocks_json` json DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'DRAFT',
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT NULL,
  `recipient_count` int NOT NULL DEFAULT '0',
  `delivered_count` int NOT NULL DEFAULT '0',
  `opened_count` int NOT NULL DEFAULT '0',
  `clicked_count` int NOT NULL DEFAULT '0',
  `bounced_count` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `email_campaigns_tenant_id_foreign` (`tenant_id`),
  KEY `idx_email_camp_brand_status` (`brand_id`,`status`),
  CONSTRAINT `email_campaigns_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `email_campaigns_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `email_deliveries`;
CREATE TABLE `email_deliveries` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `campaign_id` char(36) NOT NULL,
  `subscriber_id` char(36) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'QUEUED',
  `esp_message_id` varchar(255) DEFAULT NULL,
  `opened_at` timestamp NULL DEFAULT NULL,
  `clicked_at` timestamp NULL DEFAULT NULL,
  `error_message` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `email_deliveries_tenant_id_foreign` (`tenant_id`),
  KEY `email_deliveries_brand_id_foreign` (`brand_id`),
  KEY `idx_email_deliv_camp_status` (`campaign_id`,`status`),
  KEY `idx_email_deliv_sub` (`subscriber_id`),
  CONSTRAINT `email_deliveries_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `email_deliveries_campaign_id_foreign` FOREIGN KEY (`campaign_id`) REFERENCES `email_campaigns` (`id`) ON DELETE CASCADE,
  CONSTRAINT `email_deliveries_subscriber_id_foreign` FOREIGN KEY (`subscriber_id`) REFERENCES `email_subscribers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `email_deliveries_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `email_esp_configs`;
CREATE TABLE `email_esp_configs` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `provider` varchar(50) NOT NULL DEFAULT 'sandbox',
  `smtp_host` varchar(255) DEFAULT NULL,
  `smtp_port` int DEFAULT '587',
  `smtp_user` varchar(255) DEFAULT NULL,
  `smtp_pass` text,
  `smtp_secure` tinyint(1) NOT NULL DEFAULT '0',
  `api_key` text,
  `from_name` varchar(100) DEFAULT NULL,
  `from_email` varchar(255) DEFAULT NULL,
  `reply_to` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_tested_at` timestamp NULL DEFAULT NULL,
  `last_test_status` varchar(50) DEFAULT NULL,
  `last_test_error` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `region` varchar(50) DEFAULT NULL,
  `domain` varchar(255) DEFAULT NULL,
  `domain_status` varchar(50) NOT NULL DEFAULT 'NOT_STARTED',
  `spf_status` varchar(50) NOT NULL DEFAULT 'PENDING',
  `dkim_status` varchar(50) NOT NULL DEFAULT 'PENDING',
  `dmarc_status` varchar(50) NOT NULL DEFAULT 'PENDING',
  `sender_verified` tinyint(1) NOT NULL DEFAULT '0',
  `daily_quota` int NOT NULL DEFAULT '500',
  `quota_used_today` int NOT NULL DEFAULT '0',
  `dns_records` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_esp_tenant_brand` (`tenant_id`,`brand_id`),
  KEY `email_esp_configs_brand_id_foreign` (`brand_id`),
  CONSTRAINT `email_esp_configs_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `email_esp_configs_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `email_subscribers`;
CREATE TABLE `email_subscribers` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'SUBSCRIBED',
  `tags` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `source` varchar(100) NOT NULL DEFAULT 'manual',
  `subscribed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `unsubscribed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_sub_brand_email` (`brand_id`,`email`),
  KEY `email_subscribers_tenant_id_foreign` (`tenant_id`),
  KEY `idx_sub_brand_status` (`brand_id`,`status`),
  CONSTRAINT `email_subscribers_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `email_subscribers_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `email_templates`;
CREATE TABLE `email_templates` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(100) NOT NULL DEFAULT 'newsletter',
  `subject` varchar(255) DEFAULT NULL,
  `html_content` longtext NOT NULL,
  `blocks_json` json DEFAULT NULL,
  `thumbnail_url` varchar(500) DEFAULT NULL,
  `is_system` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `email_templates_tenant_id_foreign` (`tenant_id`),
  KEY `idx_email_tpl_brand_cat` (`brand_id`,`category`),
  CONSTRAINT `email_templates_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `email_templates_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `email_verification_tokens`;
CREATE TABLE `email_verification_tokens` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `is_used` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `email_verification_tokens_user_id_foreign` (`user_id`),
  KEY `email_verification_tokens_token_hash_index` (`token_hash`),
  CONSTRAINT `email_verification_tokens_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `enterprise_sso_configs`;
CREATE TABLE `enterprise_sso_configs` (
  `id` varchar(64) NOT NULL,
  `tenant_id` varchar(64) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `provider_type` enum('saml','oidc') NOT NULL DEFAULT 'saml',
  `idp_entity_id` varchar(255) NOT NULL,
  `idp_sso_url` varchar(1024) NOT NULL,
  `idp_certificate` text NOT NULL,
  `idp_metadata_url` varchar(1024) DEFAULT NULL,
  `sp_entity_id` varchar(255) NOT NULL,
  `sp_acs_url` varchar(1024) NOT NULL,
  `attribute_mapping` json NOT NULL,
  `jit_provisioning_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `default_role` varchar(32) NOT NULL DEFAULT 'editor',
  `enforce_sso` tinyint(1) NOT NULL DEFAULT '0',
  `domains` json NOT NULL,
  `status` enum('active','inactive','testing') NOT NULL DEFAULT 'active',
  `created_by` varchar(64) NOT NULL DEFAULT 'superadmin',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `enterprise_sso_configs_tenant_id_index` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `enterprise_sso_login_audits`;
CREATE TABLE `enterprise_sso_login_audits` (
  `id` varchar(64) NOT NULL,
  `config_id` varchar(64) NOT NULL,
  `tenant_id` varchar(64) DEFAULT NULL,
  `user_id` varchar(64) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `idp_name_id` varchar(255) NOT NULL,
  `status` enum('success','failed_signature','failed_domain_unmapped','failed_user_provisioning','blocked_inactive') NOT NULL DEFAULT 'success',
  `ip_address` varchar(64) DEFAULT NULL,
  `user_agent` varchar(512) DEFAULT NULL,
  `error_detail` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `enterprise_sso_login_audits_config_id_index` (`config_id`),
  KEY `enterprise_sso_login_audits_tenant_id_index` (`tenant_id`),
  KEY `enterprise_sso_login_audits_user_id_index` (`user_id`),
  KEY `enterprise_sso_login_audits_email_index` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `entitlement_audit_logs`;
CREATE TABLE `entitlement_audit_logs` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) DEFAULT NULL,
  `resource` varchar(64) NOT NULL,
  `action` varchar(32) NOT NULL,
  `previous_is_enabled` tinyint(1) DEFAULT NULL,
  `new_is_enabled` tinyint(1) DEFAULT NULL,
  `previous_limit_value` bigint DEFAULT NULL,
  `new_limit_value` bigint DEFAULT NULL,
  `previous_config` json DEFAULT NULL,
  `new_config` json DEFAULT NULL,
  `reason` text NOT NULL,
  `effective_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  `admin_user_id` char(36) NOT NULL,
  `admin_email` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `entitlement_audit_logs_brand_id_foreign` (`brand_id`),
  KEY `idx_ent_audit_tenant` (`tenant_id`),
  KEY `idx_ent_audit_resource` (`resource`),
  KEY `idx_ent_audit_admin` (`admin_user_id`),
  KEY `idx_ent_audit_created_at` (`created_at`),
  CONSTRAINT `entitlement_audit_logs_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `entitlement_audit_logs_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `entitlements`;
CREATE TABLE `entitlements` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) DEFAULT NULL,
  `plan_id` varchar(64) DEFAULT NULL,
  `resource` varchar(64) NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `limit_value` bigint DEFAULT NULL,
  `config` json DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `reason` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_entitlement_tenant_brand_resource` (`tenant_id`,`brand_id`,`resource`),
  KEY `entitlements_plan_id_foreign` (`plan_id`),
  KEY `idx_entitlements_tenant` (`tenant_id`),
  KEY `idx_entitlements_brand` (`brand_id`),
  KEY `idx_entitlements_resource` (`resource`),
  KEY `idx_entitlements_tenant_resource` (`tenant_id`,`resource`),
  KEY `idx_entitlements_created_at` (`created_at`),
  KEY `idx_entitlements_expires_at` (`expires_at`),
  CONSTRAINT `entitlements_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `entitlements_plan_id_foreign` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE SET NULL,
  CONSTRAINT `entitlements_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `envelope_data_encryption_keys`;
CREATE TABLE `envelope_data_encryption_keys` (
  `id` varchar(64) NOT NULL,
  `key_ring_id` varchar(64) NOT NULL,
  `key_label` varchar(128) NOT NULL,
  `encrypted_dek_ciphertext` text NOT NULL,
  `algorithm` varchar(32) NOT NULL DEFAULT 'aes_256_gcm',
  `intended_purpose` varchar(64) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `version` int NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `envelope_data_encryption_keys_key_ring_id_index` (`key_ring_id`),
  KEY `envelope_data_encryption_keys_intended_purpose_index` (`intended_purpose`),
  KEY `envelope_data_encryption_keys_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ephemeral_credential_leases`;
CREATE TABLE `ephemeral_credential_leases` (
  `id` varchar(64) NOT NULL,
  `request_id` varchar(64) NOT NULL,
  `operator_email` varchar(255) NOT NULL,
  `elevation_tier` varchar(32) NOT NULL DEFAULT 'elevated_admin',
  `token_signature` varchar(255) NOT NULL,
  `issued_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `revocable` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `ephemeral_credential_leases_request_id_index` (`request_id`),
  KEY `ephemeral_credential_leases_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `event_mesh_dead_letter_queue`;
CREATE TABLE `event_mesh_dead_letter_queue` (
  `id` varchar(64) NOT NULL,
  `subscription_id` varchar(64) NOT NULL,
  `topic_name` varchar(128) NOT NULL,
  `subscriber_name` varchar(128) NOT NULL,
  `event_id` varchar(128) NOT NULL,
  `idempotency_key` varchar(128) NOT NULL,
  `payload` json NOT NULL,
  `headers` json DEFAULT NULL,
  `failure_reason` varchar(512) NOT NULL,
  `retry_count` int NOT NULL DEFAULT '0',
  `status` varchar(32) NOT NULL DEFAULT 'quarantined',
  `last_error` text,
  `first_failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_retried_at` timestamp NULL DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `event_mesh_dead_letter_queue_subscription_id_index` (`subscription_id`),
  KEY `event_mesh_dead_letter_queue_topic_name_index` (`topic_name`),
  KEY `event_mesh_dead_letter_queue_subscriber_name_index` (`subscriber_name`),
  KEY `event_mesh_dead_letter_queue_event_id_index` (`event_id`),
  KEY `event_mesh_dead_letter_queue_idempotency_key_index` (`idempotency_key`),
  KEY `event_mesh_dead_letter_queue_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `event_mesh_idempotency_keys`;
CREATE TABLE `event_mesh_idempotency_keys` (
  `id` varchar(64) NOT NULL,
  `idempotency_key` varchar(128) NOT NULL,
  `topic_name` varchar(128) NOT NULL,
  `event_id` varchar(128) NOT NULL,
  `consumer_id` varchar(128) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'committed',
  `response_digest` varchar(128) DEFAULT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `event_mesh_idempotency_keys_idempotency_key_unique` (`idempotency_key`),
  KEY `event_mesh_idempotency_keys_idempotency_key_index` (`idempotency_key`),
  KEY `event_mesh_idempotency_keys_topic_name_index` (`topic_name`),
  KEY `event_mesh_idempotency_keys_event_id_index` (`event_id`),
  KEY `event_mesh_idempotency_keys_consumer_id_index` (`consumer_id`),
  KEY `event_mesh_idempotency_keys_status_index` (`status`),
  KEY `event_mesh_idempotency_keys_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `event_mesh_subscriptions`;
CREATE TABLE `event_mesh_subscriptions` (
  `id` varchar(64) NOT NULL,
  `topic_id` varchar(64) NOT NULL,
  `topic_name` varchar(128) NOT NULL,
  `subscriber_name` varchar(128) NOT NULL,
  `endpoint_url` varchar(512) NOT NULL,
  `delivery_mode` varchar(32) NOT NULL DEFAULT 'push',
  `circuit_breaker_status` varchar(32) NOT NULL DEFAULT 'closed',
  `max_retries` int NOT NULL DEFAULT '5',
  `concurrency_limit` int NOT NULL DEFAULT '10',
  `ack_timeout_ms` int NOT NULL DEFAULT '5000',
  `delivered_count` bigint NOT NULL DEFAULT '0',
  `failure_count` int NOT NULL DEFAULT '0',
  `dlq_count` int NOT NULL DEFAULT '0',
  `last_delivery_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `event_mesh_subscriptions_topic_id_index` (`topic_id`),
  KEY `event_mesh_subscriptions_topic_name_index` (`topic_name`),
  KEY `event_mesh_subscriptions_subscriber_name_index` (`subscriber_name`),
  KEY `event_mesh_subscriptions_circuit_breaker_status_index` (`circuit_breaker_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `event_mesh_topics`;
CREATE TABLE `event_mesh_topics` (
  `id` varchar(64) NOT NULL,
  `topic_name` varchar(128) NOT NULL,
  `partition_count` int NOT NULL DEFAULT '8',
  `retention_hours` int NOT NULL DEFAULT '72',
  `schema_validation` varchar(32) NOT NULL DEFAULT 'strict',
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `total_published` bigint NOT NULL DEFAULT '0',
  `throughput_per_sec` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `event_mesh_topics_topic_name_unique` (`topic_name`),
  KEY `event_mesh_topics_topic_name_index` (`topic_name`),
  KEY `event_mesh_topics_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `experiment_variants`;
CREATE TABLE `experiment_variants` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `experiment_id` varchar(64) NOT NULL,
  `experiment_name` varchar(255) NOT NULL,
  `hypothesis` text,
  `variant_letter` varchar(8) NOT NULL,
  `variant_type` varchar(32) NOT NULL,
  `post_variant_id` varchar(64) DEFAULT NULL,
  `sample_size` int NOT NULL DEFAULT '0',
  `engagements` int NOT NULL DEFAULT '0',
  `impressions` int NOT NULL DEFAULT '0',
  `conversions` int NOT NULL DEFAULT '0',
  `conversion_rate` float(8,2) NOT NULL DEFAULT '0.00',
  `engagement_rate` float(8,2) NOT NULL DEFAULT '0.00',
  `lift_vs_control_pct` float(8,2) NOT NULL DEFAULT '0.00',
  `p_value` float(8,2) DEFAULT NULL,
  `confidence_level` float(8,2) NOT NULL DEFAULT '0.95',
  `is_winner` tinyint(1) NOT NULL DEFAULT '0',
  `status` varchar(32) NOT NULL DEFAULT 'running',
  `concluded_at` timestamp NULL DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_exp_tenant_brand` (`tenant_id`,`brand_id`),
  KEY `idx_exp_id` (`experiment_id`),
  KEY `idx_exp_brand_status` (`brand_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `failover_quorum_events`;
CREATE TABLE `failover_quorum_events` (
  `id` varchar(36) NOT NULL,
  `incident_id` varchar(64) NOT NULL,
  `triggered_by` varchar(48) NOT NULL DEFAULT 'automated_health_monitor',
  `previous_leader_id` varchar(36) DEFAULT NULL,
  `promoted_leader_id` varchar(36) NOT NULL,
  `quorum_votes_for` int NOT NULL DEFAULT '3',
  `quorum_votes_against` int NOT NULL DEFAULT '0',
  `quorum_nodes_total` int NOT NULL DEFAULT '5',
  `outcome` varchar(32) NOT NULL DEFAULT 'promoted',
  `split_brain_mitigated` tinyint(1) NOT NULL DEFAULT '1',
  `fencing_token` int NOT NULL DEFAULT '1001',
  `details` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fqe_incident` (`incident_id`),
  KEY `failover_quorum_events_previous_leader_id_foreign` (`previous_leader_id`),
  KEY `failover_quorum_events_promoted_leader_id_foreign` (`promoted_leader_id`),
  KEY `idx_fqe_outcome` (`outcome`),
  CONSTRAINT `failover_quorum_events_previous_leader_id_foreign` FOREIGN KEY (`previous_leader_id`) REFERENCES `replication_mesh_nodes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `failover_quorum_events_promoted_leader_id_foreign` FOREIGN KEY (`promoted_leader_id`) REFERENCES `replication_mesh_nodes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `finops_rightsizing_recommendations`;
CREATE TABLE `finops_rightsizing_recommendations` (
  `id` varchar(36) NOT NULL,
  `resource_identifier` varchar(160) NOT NULL,
  `provider` varchar(48) NOT NULL,
  `resource_type` varchar(48) NOT NULL,
  `current_cost_monthly` decimal(10,2) NOT NULL,
  `projected_savings_monthly` decimal(10,2) NOT NULL,
  `recommendation_action` varchar(48) NOT NULL,
  `rationale` text NOT NULL,
  `confidence_score` decimal(5,2) NOT NULL DEFAULT '95.00',
  `status` varchar(32) NOT NULL DEFAULT 'pending',
  `applied_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_frr_provider` (`provider`),
  KEY `idx_frr_type` (`resource_type`),
  KEY `idx_frr_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `governance_audit_logs`;
CREATE TABLE `governance_audit_logs` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) DEFAULT NULL,
  `user_id` char(36) DEFAULT NULL,
  `event_type` varchar(64) NOT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(64) DEFAULT NULL,
  `entity_id` varchar(128) DEFAULT NULL,
  `status` varchar(32) NOT NULL,
  `actor_role` varchar(64) DEFAULT NULL,
  `policy_results` json DEFAULT NULL,
  `tool_call` json DEFAULT NULL,
  `details` json DEFAULT NULL,
  `reason` text,
  `ip_address` varchar(64) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `governance_audit_logs_brand_id_foreign` (`brand_id`),
  KEY `governance_audit_logs_user_id_foreign` (`user_id`),
  KEY `idx_gov_audit_tenant_brand` (`tenant_id`,`brand_id`),
  KEY `idx_gov_audit_event_type` (`event_type`),
  KEY `idx_gov_audit_status` (`status`),
  KEY `idx_gov_audit_created_at` (`created_at`),
  CONSTRAINT `governance_audit_logs_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `governance_audit_logs_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `governance_audit_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `gpu_transcode_nodes`;
CREATE TABLE `gpu_transcode_nodes` (
  `id` varchar(64) NOT NULL,
  `node_name` varchar(128) NOT NULL,
  `provider` varchar(64) NOT NULL,
  `gpu_device_model` varchar(128) NOT NULL,
  `acceleration_type` varchar(64) NOT NULL,
  `total_vram_gb` float(8,2) NOT NULL DEFAULT '16.00',
  `allocated_vram_gb` float(8,2) NOT NULL DEFAULT '0.00',
  `active_jobs_count` int NOT NULL DEFAULT '0',
  `max_concurrent_jobs` int NOT NULL DEFAULT '4',
  `status` varchar(32) NOT NULL DEFAULT 'healthy',
  `last_heartbeat_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `gpu_video_render_jobs`;
CREATE TABLE `gpu_video_render_jobs` (
  `id` varchar(64) NOT NULL,
  `job_name` varchar(128) NOT NULL,
  `target_brand_id` varchar(64) NOT NULL,
  `template_id` varchar(64) DEFAULT NULL,
  `aspect_ratio` varchar(16) NOT NULL DEFAULT '9:16',
  `resolution_width` int NOT NULL DEFAULT '1080',
  `resolution_height` int NOT NULL DEFAULT '1920',
  `fps` int NOT NULL DEFAULT '30',
  `duration_seconds` float(8,2) NOT NULL DEFAULT '15.00',
  `codec` varchar(32) NOT NULL DEFAULT 'h264',
  `gpu_node_id` varchar(64) DEFAULT NULL,
  `progress_percent` int NOT NULL DEFAULT '0',
  `status` varchar(32) NOT NULL DEFAULT 'queued',
  `output_asset_url` mediumtext,
  `file_size_bytes` bigint NOT NULL DEFAULT '0',
  `render_time_ms` int NOT NULL DEFAULT '0',
  `error_message` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `gpu_video_render_jobs_target_brand_id_index` (`target_brand_id`),
  KEY `gpu_video_render_jobs_template_id_index` (`template_id`),
  KEY `gpu_video_render_jobs_gpu_node_id_index` (`gpu_node_id`),
  KEY `gpu_video_render_jobs_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `growth_recommendations`;
CREATE TABLE `growth_recommendations` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `category` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `suggested_action` text NOT NULL,
  `target_type` varchar(32) NOT NULL,
  `target_id` varchar(64) DEFAULT NULL,
  `confidence_score` float(8,2) NOT NULL DEFAULT '0.80',
  `estimated_lift_pct` float(8,2) NOT NULL DEFAULT '0.00',
  `severity` varchar(16) NOT NULL DEFAULT 'moderate',
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `applied_at` timestamp NULL DEFAULT NULL,
  `applied_by_user_id` char(36) DEFAULT NULL,
  `rationale` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rec_tenant_brand` (`tenant_id`,`brand_id`),
  KEY `idx_rec_brand_status` (`brand_id`,`status`),
  KEY `idx_rec_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `hsm_crypto_audit_logs`;
CREATE TABLE `hsm_crypto_audit_logs` (
  `id` varchar(64) NOT NULL,
  `operation` varchar(64) NOT NULL,
  `key_id` varchar(64) NOT NULL,
  `operator_email` varchar(255) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'success',
  `duration_ms` int NOT NULL DEFAULT '1',
  `sha256_proof` varchar(255) NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `hsm_crypto_audit_logs_operation_index` (`operation`),
  KEY `hsm_crypto_audit_logs_key_id_index` (`key_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `hsm_key_rings`;
CREATE TABLE `hsm_key_rings` (
  `id` varchar(64) NOT NULL,
  `ring_name` varchar(128) NOT NULL,
  `provider_type` varchar(64) NOT NULL,
  `hsm_partition_id` varchar(128) NOT NULL,
  `master_key_alias` varchar(128) NOT NULL,
  `algorithm` varchar(32) NOT NULL DEFAULT 'aes_256_gcm',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `rotation_interval_days` int NOT NULL DEFAULT '90',
  `last_rotated_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `hsm_key_rings_is_active_index` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `hybrid_search_query_logs`;
CREATE TABLE `hybrid_search_query_logs` (
  `id` varchar(64) NOT NULL,
  `collection_id` varchar(64) NOT NULL,
  `query_text` text NOT NULL,
  `top_k` int NOT NULL DEFAULT '5',
  `dense_weight` float(8,2) NOT NULL DEFAULT '0.70',
  `sparse_weight` float(8,2) NOT NULL DEFAULT '0.30',
  `latency_ms` int NOT NULL DEFAULT '12',
  `total_results_found` int NOT NULL DEFAULT '0',
  `operator_email` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `hybrid_search_query_logs_collection_id_index` (`collection_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `idempotent_usage_records`;
CREATE TABLE `idempotent_usage_records` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `resource` varchar(64) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `idempotency_key` varchar(255) NOT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_tenant_idempotency` (`tenant_id`,`idempotency_key`),
  KEY `idx_usage_tenant_resource` (`tenant_id`,`resource`),
  KEY `idx_usage_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `immutable_object_locks`;
CREATE TABLE `immutable_object_locks` (
  `id` varchar(64) NOT NULL,
  `bucket_id` varchar(64) NOT NULL,
  `object_key` varchar(255) NOT NULL,
  `lock_mode` varchar(64) NOT NULL DEFAULT 'compliance_strict',
  `retention_until_timestamp` timestamp NOT NULL,
  `legal_hold_active` tinyint(1) NOT NULL DEFAULT '0',
  `sha256_checksum` varchar(128) NOT NULL,
  `locked_by_email` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `immutable_object_locks_bucket_id_index` (`bucket_id`),
  KEY `immutable_object_locks_object_key_index` (`object_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `incident_alert_channels`;
CREATE TABLE `incident_alert_channels` (
  `id` char(36) NOT NULL,
  `name` varchar(128) NOT NULL,
  `channel_type` varchar(32) NOT NULL,
  `target` text NOT NULL,
  `secret_token` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_iac_type` (`channel_type`),
  KEY `idx_iac_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `incident_alert_events`;
CREATE TABLE `incident_alert_events` (
  `id` char(36) NOT NULL,
  `rule_id` char(36) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `severity` varchar(32) NOT NULL,
  `condition_type` varchar(64) NOT NULL,
  `affected_provider` varchar(64) DEFAULT NULL,
  `affected_tenant_id` char(36) DEFAULT NULL,
  `details` json DEFAULT NULL,
  `dispatched_channels` json NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'triggered',
  `acknowledged_by` char(36) DEFAULT NULL,
  `acknowledged_at` timestamp NULL DEFAULT NULL,
  `resolved_by` char(36) DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `resolution_note` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `incident_alert_events_rule_id_foreign` (`rule_id`),
  KEY `incident_alert_events_affected_tenant_id_foreign` (`affected_tenant_id`),
  KEY `incident_alert_events_acknowledged_by_foreign` (`acknowledged_by`),
  KEY `incident_alert_events_resolved_by_foreign` (`resolved_by`),
  KEY `idx_iae_status` (`status`),
  KEY `idx_iae_severity` (`severity`),
  KEY `idx_iae_condition` (`condition_type`),
  KEY `idx_iae_provider` (`affected_provider`),
  KEY `idx_iae_created_at` (`created_at`),
  CONSTRAINT `incident_alert_events_acknowledged_by_foreign` FOREIGN KEY (`acknowledged_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `incident_alert_events_affected_tenant_id_foreign` FOREIGN KEY (`affected_tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL,
  CONSTRAINT `incident_alert_events_resolved_by_foreign` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `incident_alert_events_rule_id_foreign` FOREIGN KEY (`rule_id`) REFERENCES `incident_alert_rules` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `incident_alert_rules`;
CREATE TABLE `incident_alert_rules` (
  `id` char(36) NOT NULL,
  `name` varchar(128) NOT NULL,
  `condition_type` varchar(64) NOT NULL,
  `threshold_value` int NOT NULL DEFAULT '1',
  `time_window_minutes` int NOT NULL DEFAULT '5',
  `cooldown_minutes` int NOT NULL DEFAULT '15',
  `severity` varchar(32) NOT NULL DEFAULT 'high',
  `channel_ids` json NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_triggered_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_iar_condition` (`condition_type`),
  KEY `idx_iar_severity` (`severity`),
  KEY `idx_iar_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `ingestion_audit_logs`;
CREATE TABLE `ingestion_audit_logs` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `source` varchar(64) NOT NULL,
  `resource_id` varchar(255) DEFAULT NULL,
  `batch_id` varchar(255) NOT NULL,
  `action` varchar(64) NOT NULL,
  `total_records` int NOT NULL DEFAULT '0',
  `success_count` int NOT NULL DEFAULT '0',
  `error_count` int NOT NULL DEFAULT '0',
  `errors` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ingestion_audit_logs_brand_id_foreign` (`brand_id`),
  KEY `idx_ingest_audit_tenant_brand` (`tenant_id`,`brand_id`),
  KEY `idx_ingest_audit_batch` (`batch_id`),
  KEY `idx_ingest_audit_source_action` (`source`,`action`),
  CONSTRAINT `ingestion_audit_logs_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ingestion_audit_logs_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `jit_access_requests`;
CREATE TABLE `jit_access_requests` (
  `id` varchar(64) NOT NULL,
  `requester_id` varchar(64) NOT NULL,
  `requester_email` varchar(255) NOT NULL,
  `target_role` varchar(64) NOT NULL,
  `elevation_tier` varchar(32) NOT NULL DEFAULT 'elevated_admin',
  `justification` varchar(512) NOT NULL,
  `requested_duration_minutes` int NOT NULL DEFAULT '60',
  `status` varchar(32) NOT NULL DEFAULT 'pending_approval',
  `approver_id` varchar(64) DEFAULT NULL,
  `approver_email` varchar(255) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `jit_access_requests_requester_id_index` (`requester_id`),
  KEY `jit_access_requests_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `jit_audit_sessions`;
CREATE TABLE `jit_audit_sessions` (
  `id` varchar(64) NOT NULL,
  `lease_id` varchar(64) NOT NULL,
  `operator_email` varchar(255) NOT NULL,
  `action_performed` varchar(128) NOT NULL,
  `resource_affected` varchar(255) NOT NULL,
  `ip_address` varchar(64) NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `signature` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jit_audit_sessions_lease_id_index` (`lease_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `key_derivation_policies`;
CREATE TABLE `key_derivation_policies` (
  `id` varchar(64) NOT NULL,
  `policy_name` varchar(128) NOT NULL,
  `target_resource_type` varchar(64) NOT NULL,
  `key_ring_id` varchar(64) NOT NULL,
  `purpose` varchar(64) NOT NULL,
  `kdf_algorithm` varchar(64) NOT NULL DEFAULT 'hkdf_sha256',
  `is_enforced` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key_derivation_policies_policy_name_unique` (`policy_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `knex_migrations`;
CREATE TABLE `knex_migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `batch` int DEFAULT NULL,
  `migration_time` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=89 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data for table `knex_migrations` (86 rows)
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (1, '20260922000001_create_socialforge_core_schema.ts', 1, '2026-09-21 23:01:32');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (2, '20260924000002_create_brand_brains_table.ts', 2, '2026-09-24 10:51:16');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (3, '20260924000003_add_campaign_strategy_columns.ts', 3, '2026-09-24 11:28:17');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (4, '20260926000004_create_templates_table.ts', 4, '2026-09-26 06:45:37');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (5, '20260926000005_create_video_render_jobs_table.ts', 5, '2026-09-26 07:29:26');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (6, '20260927000006_alter_media_assets_longtext.ts', 6, '2026-09-27 10:38:57');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (7, '20261004000007_create_meta_integration_tables.ts', 7, '2026-10-04 05:00:18');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (8, '20261004000008_enhance_auth_security.ts', 8, '2026-10-04 10:00:49');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (9, '20261005000009_create_real_social_analytics_tables.ts', 9, '2026-10-05 02:47:53');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (10, '20261005000010_add_sync_tracking_columns.ts', 10, '2026-10-05 03:00:05');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (11, '20261005000011_add_saas_workspaces_and_quotas.ts', 11, '2026-10-05 11:24:22');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (12, '20261005000012_create_saas_subscription_database.ts', 12, '2026-10-05 11:33:20');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (13, '20261006000013_configure_commercial_saas_plans.ts', 13, '2026-10-05 19:07:33');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (14, '20261006000014_add_quota_counted_and_posts_published.ts', 14, '2026-10-05 19:20:43');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (15, '20261006000015_add_billing_grace_period.ts', 15, '2026-10-05 20:03:16');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (16, '20261006000016_create_workspace_invites.ts', 16, '2026-10-05 20:20:12');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (17, '20261006000017_create_billing_dunning_and_notifications.ts', 17, '2026-10-05 20:29:17');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (18, '20261008000018_create_social_connections.ts', 18, '2026-10-09 11:39:07');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (19, '20261008000019_create_connector_resources.ts', 18, '2026-10-09 11:39:07');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (20, '20261008000020_create_connection_events.ts', 18, '2026-10-09 11:39:08');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (21, '20261008000021_create_automations.ts', 18, '2026-10-09 11:39:08');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (22, '20261008000022_create_automation_runs.ts', 18, '2026-10-09 11:39:08');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (23, '20261008000023_create_approval_requests.ts', 18, '2026-10-09 11:39:08');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (24, '20261008000024_create_marketing_objects.ts', 18, '2026-10-09 11:39:09');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (25, '20261008000025_create_agent_runs.ts', 18, '2026-10-09 11:39:09');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (26, '20261008000026_create_template_versions.ts', 18, '2026-10-09 11:39:09');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (27, '20261009000027_upgrade_social_connections_connect_hub.ts', 19, '2026-10-09 11:41:11');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (28, '20261009000002_create_agent_memories_and_settings.ts', 20, '2026-10-09 21:32:15');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (29, '20261010000028_enhance_templates_and_flagship_workflow.ts', 20, '2026-10-09 21:32:16');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (30, '20261010000029_enhance_business_data_ingestion.ts', 21, '2026-10-09 22:14:24');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (31, '20261010000031_add_template_subcategories.ts', 22, '2026-10-10 03:34:12');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (32, '20261010000032_stage5_durable_automation_engine.ts', 23, '2026-10-10 04:05:27');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (33, '20261010000033_stage6_unified_analytics_and_brand_learning.ts', 24, '2026-10-10 07:02:23');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (34, '20261010000034_stage7_ai_automation_copilot.ts', 25, '2026-10-10 10:15:43');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (35, '20261010000035_stage8_governance_and_autonomy.ts', 26, '2026-10-10 10:55:56');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (36, '20261011000036_stage9_billing_hardening_and_entitlements.ts', 27, '2026-10-10 19:21:49');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (37, '20261011000037_stage10_growth_intelligence.ts', 28, '2026-10-10 19:54:26');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (38, '20261011000038_stage10_growth_goals_and_intelligence.ts', 29, '2026-10-11 00:30:44');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (40, '20261011000039_create_billing_entitlements_and_usage_counters.ts', 30, '2026-10-11 04:38:00');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (41, '20261011000040_create_superadmin_operations.ts', 31, '2026-10-11 11:05:46');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (42, '20261012000041_create_incident_alerting_and_webhooks.ts', 32, '2026-10-12 08:41:40');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (43, '20261012000042_create_enterprise_compliance_and_rbac.ts', 33, '2026-10-12 09:49:29');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (44, '20261012000043_create_social_webhook_events_and_dlq.ts', 34, '2026-10-12 10:27:36');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (45, '20261012000044_create_sla_telemetry_and_status_page.ts', 35, '2026-10-12 10:48:38');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (46, '20261012000045_create_disaster_recovery_and_backup_vault.ts', 36, '2026-10-12 11:07:41');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (47, '20261013000046_create_outbound_webhook_dispatcher.ts', 37, '2026-10-12 18:57:58');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (48, '20261013000047_create_enterprise_sso_and_saml_federation.ts', 38, '2026-10-12 19:38:09');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (49, '20261013000048_create_scim_directory_sync.ts', 39, '2026-10-12 20:09:22');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (50, '20261014000049_create_siem_streaming_and_security_events.ts', 40, '2026-10-19 01:53:27');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (51, '20261014000050_create_dlp_and_content_guardrails.ts', 41, '2026-10-19 02:32:45');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (52, '20261014000051_create_enterprise_custom_rbac.ts', 42, '2026-10-19 04:01:52');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (54, '20261019000052_create_worm_audit_vault.ts', 43, '2026-10-19 05:25:33');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (55, '20261020000053_create_custom_domains_and_white_label.ts', 44, '2026-10-20 00:31:55');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (56, '20261021000054_create_ai_agent_fleet_orchestration.ts', 45, '2026-10-21 00:42:53');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (57, '20261021000055_create_edge_cache_and_cdn.ts', 46, '2026-10-21 01:02:36');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (58, '20261021000056_create_brand_knowledge_graph_and_vector_memory.ts', 47, '2026-10-21 01:39:31');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (59, '20261021000057_create_predictive_churn_and_ltv_intelligence.ts', 48, '2026-10-21 01:58:28');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (60, '20261021000058_create_api_gateway_and_token_bucket.ts', 49, '2026-10-21 02:19:30');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (61, '20261021000059_create_multi_region_replication_mesh.ts', 50, '2026-10-21 02:31:50');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (62, '20261021000060_create_chaos_engineering_and_resiliency.ts', 51, '2026-10-21 02:45:40');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (63, '20261021000061_create_zero_trust_secret_rotation.ts', 52, '2026-10-21 03:16:09');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (64, '20261021000062_create_multi_cloud_finops_and_cost_attribution.ts', 53, '2026-10-21 03:37:25');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (65, '20261021000063_create_continuous_compliance_and_evidence_locker.ts', 54, '2026-10-21 04:20:56');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (66, '20261021000064_create_global_event_mesh_and_dlq_replay.ts', 55, '2026-10-21 04:49:08');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (67, '20261021000065_create_database_partitioning_and_cold_tier_archival.ts', 56, '2026-10-21 05:10:50');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (68, '20261021000066_create_query_federation_and_cqrs_views.ts', 57, '2026-10-21 05:31:31');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (69, '20261021000067_create_active_active_multi_master_and_vector_clocks.ts', 58, '2026-10-21 05:47:54');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (70, '20261021000068_create_zero_trust_jit_access_and_dual_auth.ts', 59, '2026-10-21 07:33:46');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (71, '20261021000069_create_hsm_key_brokerage_and_envelope_encryption.ts', 60, '2026-10-21 07:50:02');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (72, '20261021000070_create_distributed_object_storage_and_worm_vault.ts', 61, '2026-10-21 08:04:54');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (73, '20261021000071_create_neural_vector_and_hybrid_rag_mesh.ts', 62, '2026-10-21 08:47:23');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (74, '20261021000072_create_collaborative_canvas_and_presence_gateway.ts', 63, '2026-10-21 09:12:54');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (75, '20261021000073_create_video_rendering_and_gpu_transcoding_mesh.ts', 64, '2026-10-21 09:34:49');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (76, '20261021000074_create_distributed_workflow_and_saga_coordinator.ts', 65, '2026-10-21 09:48:37');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (77, '20261021000075_create_cross_region_sharding_and_rebalancing_mesh.ts', 66, '2026-10-21 10:18:24');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (78, '20261022000076_create_viral_prediction_and_ab_testing_engine.ts', 67, '2026-10-22 05:58:14');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (79, '20261031000077_create_native_crm_and_lead_pipelines.ts', 68, '2026-10-31 12:54:31');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (80, '20261031000078_create_email_marketing_suite.ts', 69, '2026-10-31 13:28:20');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (81, '20261031000079_create_whatsapp_marketing_suite.ts', 70, '2026-10-31 13:45:35');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (82, '20261031000080_create_sms_and_voice_marketing.ts', 71, '2026-10-31 13:50:14');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (83, '20261031000081_create_email_esp_configs.ts', 72, '2026-11-04 05:38:54');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (84, '20261031000082_expand_email_esp_configs.ts', 73, '2026-11-04 07:01:32');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (85, '20261106000083_update_hoaspforge_subscription_plans.ts', 74, '2026-11-05 20:43:07');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (86, '20261106000084_update_hoaspforge_59_99_249_pricing.ts', 75, '2026-11-05 20:59:06');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (87, '20261107000085_create_entitlement_audit_logs.ts', 76, '2026-11-07 09:01:24');
INSERT INTO `knex_migrations` (`id`, `name`, `batch`, `migration_time`) VALUES (88, '20261111000086_create_user_onboarding_and_analytics.ts', 77, '2026-11-11 08:03:02');

DROP TABLE IF EXISTS `knex_migrations_lock`;
CREATE TABLE `knex_migrations_lock` (
  `index` int unsigned NOT NULL AUTO_INCREMENT,
  `is_locked` int DEFAULT NULL,
  PRIMARY KEY (`index`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data for table `knex_migrations_lock` (1 rows)
INSERT INTO `knex_migrations_lock` (`index`, `is_locked`) VALUES (1, 0);

DROP TABLE IF EXISTS `marketing_objects`;
CREATE TABLE `marketing_objects` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `source` varchar(64) NOT NULL,
  `object_type` varchar(64) NOT NULL,
  `external_id` varchar(255) DEFAULT NULL,
  `source_record_id` varchar(255) DEFAULT NULL,
  `source_version` varchar(128) DEFAULT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'valid',
  `title` varchar(255) NOT NULL,
  `properties` json NOT NULL,
  `normalized_data` json DEFAULT NULL,
  `validation_errors` json DEFAULT NULL,
  `provenance` json DEFAULT NULL,
  `idempotency_key` varchar(255) DEFAULT NULL,
  `retry_count` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `marketing_objects_brand_id_foreign` (`brand_id`),
  KEY `idx_marketing_objects_tenant_brand` (`tenant_id`,`brand_id`),
  KEY `idx_marketing_objects_source_type` (`source`,`object_type`),
  KEY `idx_marketing_objects_external_id` (`external_id`),
  KEY `idx_mo_tenant_brand_src_rec` (`tenant_id`,`brand_id`,`source`,`source_record_id`),
  KEY `idx_mo_idempotency_key` (`idempotency_key`),
  KEY `idx_mo_status` (`status`),
  CONSTRAINT `marketing_objects_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `marketing_objects_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `materialized_view_refresh_logs`;
CREATE TABLE `materialized_view_refresh_logs` (
  `id` varchar(64) NOT NULL,
  `view_id` varchar(64) NOT NULL,
  `view_name` varchar(128) NOT NULL,
  `refresh_mode` varchar(32) NOT NULL DEFAULT 'incremental',
  `rows_updated` int NOT NULL DEFAULT '0',
  `duration_ms` int NOT NULL DEFAULT '0',
  `status` varchar(32) NOT NULL DEFAULT 'success',
  `executed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `materialized_view_refresh_logs_view_id_index` (`view_id`),
  KEY `materialized_view_refresh_logs_view_name_index` (`view_name`),
  KEY `materialized_view_refresh_logs_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `media_assets`;
CREATE TABLE `media_assets` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `storage_key` longtext,
  `public_url` longtext,
  `thumbnail_url` longtext,
  `file_name` varchar(255) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `file_size_bytes` bigint NOT NULL,
  `media_type` varchar(50) NOT NULL,
  `metadata` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `media_assets_tenant_id_foreign` (`tenant_id`),
  KEY `idx_media_brand_type` (`brand_id`,`media_type`),
  CONSTRAINT `media_assets_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `media_assets_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `meta_connections`;
CREATE TABLE `meta_connections` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `provider` varchar(50) NOT NULL DEFAULT 'meta',
  `meta_user_id` varchar(255) DEFAULT NULL,
  `selected_page_id` varchar(255) DEFAULT NULL,
  `selected_page_name` varchar(255) DEFAULT NULL,
  `instagram_account_id` varchar(255) DEFAULT NULL,
  `instagram_username` varchar(255) DEFAULT NULL,
  `encrypted_user_access_token` text,
  `encrypted_page_access_token` text,
  `credential_expires_at` timestamp NULL DEFAULT NULL,
  `scopes` json DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'connected',
  `require_approval_before_publish` tinyint(1) NOT NULL DEFAULT '1',
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_successful_sync` timestamp NULL DEFAULT NULL,
  `last_attempt` timestamp NULL DEFAULT NULL,
  `last_error` text,
  PRIMARY KEY (`id`),
  KEY `meta_connections_user_id_foreign` (`user_id`),
  KEY `idx_meta_conn_tenant` (`tenant_id`),
  KEY `idx_meta_conn_brand` (`brand_id`),
  KEY `idx_meta_conn_status` (`status`),
  CONSTRAINT `meta_connections_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `meta_connections_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `meta_connections_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `meta_facebook_pages`;
CREATE TABLE `meta_facebook_pages` (
  `id` char(36) NOT NULL,
  `connection_id` char(36) NOT NULL,
  `page_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `picture_url` text,
  `tasks` json DEFAULT NULL,
  `encrypted_access_token` text,
  `instagram_business_account_id` varchar(255) DEFAULT NULL,
  `is_selected` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_meta_conn_page` (`connection_id`,`page_id`),
  CONSTRAINT `meta_facebook_pages_connection_id_foreign` FOREIGN KEY (`connection_id`) REFERENCES `meta_connections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `meta_instagram_accounts`;
CREATE TABLE `meta_instagram_accounts` (
  `id` char(36) NOT NULL,
  `connection_id` char(36) NOT NULL,
  `page_id` varchar(255) NOT NULL,
  `instagram_account_id` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `profile_picture_url` text,
  `followers_count` int NOT NULL DEFAULT '0',
  `is_eligible` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_meta_conn_ig` (`connection_id`,`instagram_account_id`),
  CONSTRAINT `meta_instagram_accounts_connection_id_foreign` FOREIGN KEY (`connection_id`) REFERENCES `meta_connections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `motion_composition_templates`;
CREATE TABLE `motion_composition_templates` (
  `id` varchar(64) NOT NULL,
  `template_name` varchar(128) NOT NULL,
  `target_brand_id` varchar(64) NOT NULL,
  `default_aspect_ratio` varchar(16) NOT NULL DEFAULT '9:16',
  `duration_seconds` float(8,2) NOT NULL DEFAULT '15.00',
  `composition_layers_payload` longtext NOT NULL,
  `total_layers_count` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `motion_composition_templates_target_brand_id_index` (`target_brand_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `multi_master_nodes`;
CREATE TABLE `multi_master_nodes` (
  `id` varchar(64) NOT NULL,
  `node_name` varchar(128) NOT NULL,
  `region` varchar(64) NOT NULL,
  `endpoint_url` varchar(512) NOT NULL,
  `sync_status` varchar(32) NOT NULL DEFAULT 'in_sync',
  `write_capacity_qps` int NOT NULL DEFAULT '10000',
  `vector_clock_version` int NOT NULL DEFAULT '1',
  `quorum_weight` int NOT NULL DEFAULT '1',
  `is_fenced` tinyint(1) NOT NULL DEFAULT '0',
  `last_sync_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `multi_master_nodes_node_name_unique` (`node_name`),
  KEY `multi_master_nodes_is_fenced_index` (`is_fenced`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `neural_embedding_models`;
CREATE TABLE `neural_embedding_models` (
  `id` varchar(64) NOT NULL,
  `model_name` varchar(128) NOT NULL,
  `provider_type` varchar(64) NOT NULL,
  `model_family` varchar(64) NOT NULL,
  `dimension_size` int NOT NULL,
  `max_input_tokens` int NOT NULL DEFAULT '8191',
  `cost_per_million_tokens` float(8,2) NOT NULL DEFAULT '0.13',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `object_storage_lifecycle_rules`;
CREATE TABLE `object_storage_lifecycle_rules` (
  `id` varchar(64) NOT NULL,
  `bucket_id` varchar(64) NOT NULL,
  `rule_name` varchar(128) NOT NULL,
  `prefix_filter` varchar(128) NOT NULL DEFAULT '',
  `transition_cool_days` int NOT NULL DEFAULT '30',
  `transition_archive_days` int NOT NULL DEFAULT '90',
  `expiration_days` int NOT NULL DEFAULT '365',
  `noncurrent_version_expiration_days` int NOT NULL DEFAULT '30',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `object_storage_lifecycle_rules_bucket_id_index` (`bucket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `onboarding_analytics_events`;
CREATE TABLE `onboarding_analytics_events` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `event_name` varchar(64) NOT NULL,
  `step_number` int DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_oae_event_name` (`event_name`),
  KEY `idx_oae_tenant_id` (`tenant_id`),
  KEY `idx_oae_user_id` (`user_id`),
  KEY `idx_oae_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `operational_transformation_ops`;
CREATE TABLE `operational_transformation_ops` (
  `id` varchar(64) NOT NULL,
  `room_id` varchar(64) NOT NULL,
  `client_id` varchar(128) NOT NULL,
  `op_type` varchar(64) NOT NULL,
  `target_layer_id` varchar(64) NOT NULL,
  `base_revision` int NOT NULL DEFAULT '0',
  `applied_revision` int NOT NULL DEFAULT '0',
  `payload` mediumtext NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `operational_transformation_ops_room_id_index` (`room_id`),
  KEY `operational_transformation_ops_target_layer_id_index` (`target_layer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `outbound_webhook_deliveries`;
CREATE TABLE `outbound_webhook_deliveries` (
  `id` varchar(64) NOT NULL,
  `endpoint_id` varchar(64) NOT NULL,
  `tenant_id` varchar(64) DEFAULT NULL,
  `event_type` varchar(64) NOT NULL,
  `payload` json NOT NULL,
  `signature` varchar(255) NOT NULL,
  `status` enum('pending','delivered','failed','retrying') NOT NULL DEFAULT 'pending',
  `status_code` int DEFAULT NULL,
  `attempt_count` int NOT NULL DEFAULT '1',
  `max_attempts` int NOT NULL DEFAULT '4',
  `next_retry_at` timestamp NULL DEFAULT NULL,
  `request_duration_ms` int DEFAULT NULL,
  `response_body` text,
  `error_message` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `outbound_webhook_deliveries_endpoint_id_index` (`endpoint_id`),
  KEY `outbound_webhook_deliveries_tenant_id_index` (`tenant_id`),
  KEY `outbound_webhook_deliveries_event_type_index` (`event_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `outbound_webhook_endpoints`;
CREATE TABLE `outbound_webhook_endpoints` (
  `id` varchar(64) NOT NULL,
  `tenant_id` varchar(64) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `url` varchar(1024) NOT NULL,
  `secret` text NOT NULL,
  `secret_last4` varchar(8) NOT NULL,
  `events` json NOT NULL,
  `status` enum('active','paused','failed_disabled') NOT NULL DEFAULT 'active',
  `failure_count` int NOT NULL DEFAULT '0',
  `last_delivery_at` timestamp NULL DEFAULT NULL,
  `last_status_code` int DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_by` varchar(64) NOT NULL DEFAULT 'superadmin',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `outbound_webhook_endpoints_tenant_id_index` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `password_reset_tokens`;
CREATE TABLE `password_reset_tokens` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `is_used` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `password_reset_tokens_user_id_foreign` (`user_id`),
  KEY `password_reset_tokens_token_hash_index` (`token_hash`),
  CONSTRAINT `password_reset_tokens_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `post_analytics_metrics`;
CREATE TABLE `post_analytics_metrics` (
  `id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `post_id` char(36) NOT NULL,
  `post_variant_id` char(36) NOT NULL,
  `platform` varchar(50) NOT NULL,
  `remote_post_id` varchar(255) NOT NULL,
  `metric` varchar(100) NOT NULL,
  `value` decimal(14,4) NOT NULL,
  `metric_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fetched_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_variant_metric_date` (`post_variant_id`,`metric`,`metric_date`),
  KEY `idx_post_analytics_brand_date` (`brand_id`,`metric_date`),
  KEY `idx_post_analytics_remote_id` (`remote_post_id`),
  KEY `idx_post_analytics_post_id` (`post_id`),
  KEY `idx_post_analytics_platform` (`platform`),
  CONSTRAINT `post_analytics_metrics_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `post_analytics_metrics_post_id_foreign` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `post_analytics_metrics_post_variant_id_foreign` FOREIGN KEY (`post_variant_id`) REFERENCES `post_variants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `post_analytics_snapshots`;
CREATE TABLE `post_analytics_snapshots` (
  `id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `post_id` char(36) NOT NULL,
  `post_variant_id` char(36) NOT NULL,
  `platform` varchar(50) NOT NULL,
  `remote_post_id` varchar(255) NOT NULL,
  `reach` int DEFAULT NULL,
  `impressions` int DEFAULT NULL,
  `reactions` int DEFAULT NULL,
  `likes` int DEFAULT NULL,
  `comments` int DEFAULT NULL,
  `shares` int DEFAULT NULL,
  `saves` int DEFAULT NULL,
  `clicks` int DEFAULT NULL,
  `video_views` int DEFAULT NULL,
  `profile_activity` int DEFAULT NULL,
  `engagement` int DEFAULT NULL,
  `engagement_rate` decimal(7,2) DEFAULT NULL,
  `raw_metrics` json DEFAULT NULL,
  `last_fetched_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_error` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_attempt` timestamp NULL DEFAULT NULL,
  `watch_time_seconds` int DEFAULT NULL,
  `ctr` decimal(7,2) DEFAULT NULL,
  `velocity_score` decimal(10,2) DEFAULT NULL,
  `roi` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `post_analytics_snapshots_post_variant_id_unique` (`post_variant_id`),
  KEY `idx_snapshots_brand_platform` (`brand_id`,`platform`),
  KEY `idx_snapshots_remote_id` (`remote_post_id`),
  KEY `idx_snapshots_post_id` (`post_id`),
  KEY `idx_snapshots_fetched_at` (`last_fetched_at`),
  CONSTRAINT `post_analytics_snapshots_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `post_analytics_snapshots_post_id_foreign` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `post_analytics_snapshots_post_variant_id_foreign` FOREIGN KEY (`post_variant_id`) REFERENCES `post_variants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `post_variants`;
CREATE TABLE `post_variants` (
  `id` char(36) NOT NULL,
  `post_id` char(36) NOT NULL,
  `platform` varchar(50) NOT NULL,
  `content` text NOT NULL,
  `media_asset_ids` json NOT NULL,
  `platform_specific_config` json NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `remote_post_id` varchar(255) DEFAULT NULL,
  `remote_post_url` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_post_platform_variant` (`post_id`,`platform`),
  CONSTRAINT `post_variants_post_id_foreign` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data for table `post_variants` (1 rows)
INSERT INTO `post_variants` (`id`, `post_id`, `platform`, `content`, `media_asset_ids`, `platform_specific_config`, `status`, `remote_post_id`, `remote_post_url`, `created_at`, `updated_at`) VALUES ('bc2051b1-a44a-4a97-8acd-1f3125c70164', 'f6070497-e32c-435c-89c8-ddcba8e2ea13', 'facebook', '🚀 SocialForge AI Social Agent Live Publishing Test\n\nAutomated social publishing integration is officially connected and live on Facebook Page "HOASP International"!\n\nPublished at: Sun, 04 Oct 2026 13:30:30 GMT', '[]', '{}', 'published', '1405588742634526_122100337179498315', 'https://www.facebook.com/122101142949498315/posts/122100337179498315', '2026-10-04 08:00:32', '2026-10-28 13:25:31');

DROP TABLE IF EXISTS `posts`;
CREATE TABLE `posts` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `author_id` char(36) NOT NULL,
  `campaign_id` char(36) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `base_content` text NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'draft',
  `quota_counted` tinyint(1) NOT NULL DEFAULT '0',
  `scheduled_for` timestamp NULL DEFAULT NULL,
  `published_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `source_record_id` varchar(255) DEFAULT NULL,
  `source_version` varchar(64) DEFAULT NULL,
  `automation_id` char(36) DEFAULT NULL,
  `template_id` char(36) DEFAULT NULL,
  `template_version` int DEFAULT NULL,
  `provenance` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `posts_author_id_foreign` (`author_id`),
  KEY `posts_campaign_id_foreign` (`campaign_id`),
  KEY `idx_posts_brand_status` (`brand_id`,`status`),
  KEY `idx_posts_scheduled_for` (`scheduled_for`),
  KEY `idx_posts_tenant_created` (`tenant_id`,`created_at`),
  KEY `idx_posts_tenant_quota_counted` (`tenant_id`,`quota_counted`),
  CONSTRAINT `posts_author_id_foreign` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `posts_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `posts_campaign_id_foreign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE SET NULL,
  CONSTRAINT `posts_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data for table `posts` (2 rows)
INSERT INTO `posts` (`id`, `tenant_id`, `brand_id`, `author_id`, `campaign_id`, `title`, `base_content`, `status`, `quota_counted`, `scheduled_for`, `published_at`, `created_at`, `updated_at`, `source_record_id`, `source_version`, `automation_id`, `template_id`, `template_version`, `provenance`) VALUES ('f6070497-e32c-435c-89c8-ddcba8e2ea13', '1d9190fa-bd85-4304-8e73-8ef3ca62c342', '52f09a1e-e490-4c01-9674-4eb729bd5108', '22c80f70-9562-408a-af1f-12cec24458d1', NULL, 'SocialForge Live Publishing Launch on Facebook', '🚀 SocialForge AI Social Agent Live Publishing Test\n\nAutomated social publishing integration is officially connected and live on Facebook Page "HOASP International"!\n\nPublished at: Sun, 04 Oct 2026 13:30:30 GMT', 'published', 1, NULL, '2026-10-04 08:00:32', '2026-10-04 08:00:32', '2026-11-19 05:04:52', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `posts` (`id`, `tenant_id`, `brand_id`, `author_id`, `campaign_id`, `title`, `base_content`, `status`, `quota_counted`, `scheduled_for`, `published_at`, `created_at`, `updated_at`, `source_record_id`, `source_version`, `automation_id`, `template_id`, `template_version`, `provenance`) VALUES ('fa4f205b-1e25-4c0b-b2da-0318102b059f', 'e656d363-c1f0-4e0e-bfa2-6bef9bda232c', '05f4c446-4c69-4bd7-b958-13b1f60cf17a', 'bbe971f4-7ee8-4fe2-a1e1-3a853993a76a', NULL, 'Echo Pro Wireless Headphone Teaser', 'Studio acoustics in your pocket. The new Echo Pro drops this Friday.', 'draft', 0, NULL, NULL, '2026-11-25 00:47:30', '2026-11-25 00:47:30', NULL, NULL, NULL, NULL, NULL, NULL);

DROP TABLE IF EXISTS `presigned_upload_sessions`;
CREATE TABLE `presigned_upload_sessions` (
  `id` varchar(64) NOT NULL,
  `bucket_id` varchar(64) NOT NULL,
  `object_key` varchar(255) NOT NULL,
  `presigned_url` text NOT NULL,
  `http_method` varchar(16) NOT NULL DEFAULT 'PUT',
  `content_type` varchar(128) NOT NULL,
  `expected_sha256` varchar(128) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'issued',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `presigned_upload_sessions_bucket_id_index` (`bucket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `provider_health_incidents`;
CREATE TABLE `provider_health_incidents` (
  `id` char(36) NOT NULL,
  `provider` varchar(64) NOT NULL,
  `incident_type` varchar(64) NOT NULL,
  `status_code` int DEFAULT NULL,
  `error_code` varchar(128) DEFAULT NULL,
  `error_message` text,
  `affected_tenant_id` char(36) DEFAULT NULL,
  `affected_account_id` varchar(255) DEFAULT NULL,
  `retry_after_seconds` int DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_prov_inc_provider` (`provider`),
  KEY `idx_prov_inc_type` (`incident_type`),
  KEY `idx_prov_inc_tenant` (`affected_tenant_id`),
  KEY `idx_prov_inc_created_at` (`created_at`),
  CONSTRAINT `provider_health_incidents_affected_tenant_id_foreign` FOREIGN KEY (`affected_tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `publish_logs`;
CREATE TABLE `publish_logs` (
  `id` char(36) NOT NULL,
  `post_variant_id` char(36) NOT NULL,
  `attempt_number` int NOT NULL DEFAULT '1',
  `status` varchar(50) NOT NULL,
  `http_status` int DEFAULT NULL,
  `response_payload` json NOT NULL,
  `error_message` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `publish_logs_post_variant_id_foreign` (`post_variant_id`),
  CONSTRAINT `publish_logs_post_variant_id_foreign` FOREIGN KEY (`post_variant_id`) REFERENCES `post_variants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `publishing_audit_logs`;
CREATE TABLE `publishing_audit_logs` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `agent_id` varchar(100) DEFAULT 'ai_social_agent',
  `platform` varchar(50) NOT NULL,
  `account_id` varchar(255) NOT NULL,
  `action` varchar(100) NOT NULL,
  `content_id` varchar(255) DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `result` varchar(50) NOT NULL,
  `external_id` varchar(255) DEFAULT NULL,
  `error` text,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `publishing_audit_logs_tenant_id_foreign` (`tenant_id`),
  KEY `publishing_audit_logs_user_id_foreign` (`user_id`),
  KEY `idx_pub_audit_brand_date` (`brand_id`,`created_at`),
  CONSTRAINT `publishing_audit_logs_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `publishing_audit_logs_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `publishing_audit_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `publishing_jobs`;
CREATE TABLE `publishing_jobs` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `connection_id` char(36) DEFAULT NULL,
  `platform` varchar(50) NOT NULL,
  `account_id` varchar(255) NOT NULL,
  `content_id` char(36) DEFAULT NULL,
  `post_id` char(36) DEFAULT NULL,
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'draft',
  `attempt_count` int NOT NULL DEFAULT '0',
  `max_attempts` int NOT NULL DEFAULT '3',
  `next_retry_at` timestamp NULL DEFAULT NULL,
  `external_post_id` varchar(255) DEFAULT NULL,
  `external_post_url` text,
  `last_error` text,
  `payload` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `publishing_jobs_tenant_id_foreign` (`tenant_id`),
  KEY `publishing_jobs_user_id_foreign` (`user_id`),
  KEY `publishing_jobs_connection_id_foreign` (`connection_id`),
  KEY `publishing_jobs_post_id_foreign` (`post_id`),
  KEY `idx_pub_jobs_sched_status` (`scheduled_at`,`status`),
  KEY `idx_pub_jobs_brand_status` (`brand_id`,`status`),
  KEY `idx_pub_jobs_retry` (`next_retry_at`),
  CONSTRAINT `publishing_jobs_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `publishing_jobs_connection_id_foreign` FOREIGN KEY (`connection_id`) REFERENCES `meta_connections` (`id`) ON DELETE SET NULL,
  CONSTRAINT `publishing_jobs_post_id_foreign` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `publishing_jobs_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `publishing_jobs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data for table `publishing_jobs` (1 rows)
INSERT INTO `publishing_jobs` (`id`, `tenant_id`, `brand_id`, `user_id`, `connection_id`, `platform`, `account_id`, `content_id`, `post_id`, `scheduled_at`, `status`, `attempt_count`, `max_attempts`, `next_retry_at`, `external_post_id`, `external_post_url`, `last_error`, `payload`, `created_at`, `updated_at`) VALUES ('256cf21a-26cd-4032-a7b8-17261d8a81b1', '1d9190fa-bd85-4304-8e73-8ef3ca62c342', '52f09a1e-e490-4c01-9674-4eb729bd5108', '22c80f70-9562-408a-af1f-12cec24458d1', NULL, 'facebook', '1405588742634526', NULL, 'f6070497-e32c-435c-89c8-ddcba8e2ea13', NULL, 'published', 1, 3, NULL, '1405588742634526_122100337179498315', 'https://facebook.com/1405588742634526_122100337179498315', NULL, NULL, '2026-11-19 16:00:14', '2026-11-19 16:00:14');

DROP TABLE IF EXISTS `query_federation_sources`;
CREATE TABLE `query_federation_sources` (
  `id` varchar(64) NOT NULL,
  `source_name` varchar(128) NOT NULL,
  `source_type` varchar(32) NOT NULL DEFAULT 'mysql_replica',
  `connection_uri` varchar(512) NOT NULL,
  `read_weight` int NOT NULL DEFAULT '100',
  `replication_lag_ms` int NOT NULL DEFAULT '0',
  `max_qps` int NOT NULL DEFAULT '5000',
  `status` varchar(32) NOT NULL DEFAULT 'online',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `query_federation_sources_source_name_unique` (`source_name`),
  KEY `query_federation_sources_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `rag_knowledge_collections`;
CREATE TABLE `rag_knowledge_collections` (
  `id` varchar(64) NOT NULL,
  `collection_name` varchar(128) NOT NULL,
  `target_tenant_id` varchar(64) NOT NULL DEFAULT 'global_system',
  `model_id` varchar(64) NOT NULL,
  `distance_metric` varchar(32) NOT NULL DEFAULT 'cosine',
  `index_type` varchar(32) NOT NULL DEFAULT 'hnsw',
  `total_vectors_count` int NOT NULL DEFAULT '0',
  `last_synced_at` timestamp NULL DEFAULT NULL,
  `is_immutable` tinyint(1) NOT NULL DEFAULT '0',
  `status` varchar(32) NOT NULL DEFAULT 'ready',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rag_knowledge_collections_collection_name_unique` (`collection_name`),
  KEY `rag_knowledge_collections_model_id_index` (`model_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `read_replica_clusters`;
CREATE TABLE `read_replica_clusters` (
  `id` varchar(64) NOT NULL,
  `cluster_name` varchar(128) NOT NULL,
  `region` varchar(64) NOT NULL,
  `host` varchar(255) NOT NULL,
  `port` int NOT NULL DEFAULT '3306',
  `replica_role` varchar(32) NOT NULL DEFAULT 'read_only',
  `current_lag_ms` int NOT NULL DEFAULT '2',
  `healthy` tinyint(1) NOT NULL DEFAULT '1',
  `total_queries_served` bigint NOT NULL DEFAULT '0',
  `last_heartbeat_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `read_replica_clusters_cluster_name_unique` (`cluster_name`),
  KEY `read_replica_clusters_healthy_index` (`healthy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `refresh_tokens`;
CREATE TABLE `refresh_tokens` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `family_id` char(36) NOT NULL,
  `is_revoked` tinyint(1) NOT NULL DEFAULT '0',
  `expires_at` timestamp NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `refresh_tokens_user_id_foreign` (`user_id`),
  KEY `refresh_tokens_token_hash_index` (`token_hash`),
  KEY `refresh_tokens_family_id_index` (`family_id`),
  CONSTRAINT `refresh_tokens_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `rendered_video_artifacts`;
CREATE TABLE `rendered_video_artifacts` (
  `id` varchar(64) NOT NULL,
  `render_job_id` varchar(64) NOT NULL,
  `artifact_label` varchar(128) NOT NULL,
  `resolution` varchar(32) NOT NULL,
  `bitrate_kbps` int NOT NULL DEFAULT '5000',
  `format` varchar(32) NOT NULL DEFAULT 'mp4',
  `storage_url` text NOT NULL,
  `checksum_sha256` varchar(128) NOT NULL,
  `size_bytes` bigint NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `rendered_video_artifacts_render_job_id_index` (`render_job_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `replication_heartbeat_events`;
CREATE TABLE `replication_heartbeat_events` (
  `id` varchar(36) NOT NULL,
  `node_id` varchar(36) NOT NULL,
  `region_code` varchar(32) NOT NULL,
  `lag_ms` int NOT NULL DEFAULT '0',
  `commit_throughput_tps` decimal(10,2) NOT NULL DEFAULT '0.00',
  `cpu_utilization_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `network_rtt_ms` decimal(6,2) NOT NULL DEFAULT '0.00',
  `status` varchar(32) NOT NULL DEFAULT 'healthy',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rhe_node` (`node_id`),
  KEY `idx_rhe_region` (`region_code`),
  KEY `idx_rhe_created` (`created_at`),
  CONSTRAINT `replication_heartbeat_events_node_id_foreign` FOREIGN KEY (`node_id`) REFERENCES `replication_mesh_nodes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `replication_mesh_nodes`;
CREATE TABLE `replication_mesh_nodes` (
  `id` varchar(36) NOT NULL,
  `region_code` varchar(32) NOT NULL,
  `node_name` varchar(96) NOT NULL,
  `role` varchar(32) NOT NULL DEFAULT 'read_replica',
  `status` varchar(32) NOT NULL DEFAULT 'healthy',
  `replication_lag_ms` int NOT NULL DEFAULT '0',
  `applied_gtid_set` varchar(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001:1-1000',
  `retrieved_gtid_set` varchar(255) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001:1-1000',
  `ip_address` varchar(64) NOT NULL DEFAULT '10.0.1.10',
  `port` int NOT NULL DEFAULT '3306',
  `is_write_eligible` tinyint(1) NOT NULL DEFAULT '0',
  `heartbeat_interval_sec` int NOT NULL DEFAULT '5',
  `last_heartbeat_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `metadata` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rmn_name` (`node_name`),
  KEY `idx_rmn_region` (`region_code`),
  KEY `idx_rmn_role` (`role`),
  KEY `idx_rmn_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `saga_compensating_transactions`;
CREATE TABLE `saga_compensating_transactions` (
  `id` varchar(64) NOT NULL,
  `instance_id` varchar(64) NOT NULL,
  `step_index` int NOT NULL,
  `step_name` varchar(128) NOT NULL,
  `compensation_action` varchar(255) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'compensated',
  `reason` mediumtext NOT NULL,
  `executed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `saga_compensating_transactions_instance_id_index` (`instance_id`),
  KEY `saga_compensating_transactions_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `saga_workflow_definitions`;
CREATE TABLE `saga_workflow_definitions` (
  `id` varchar(64) NOT NULL,
  `workflow_name` varchar(128) NOT NULL,
  `workflow_type` varchar(64) NOT NULL,
  `description` mediumtext NOT NULL,
  `total_steps_count` int NOT NULL DEFAULT '0',
  `failure_strategy` varchar(64) NOT NULL DEFAULT 'backward_compensation',
  `steps_configuration` longtext NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `scim_api_tokens`;
CREATE TABLE `scim_api_tokens` (
  `id` varchar(64) NOT NULL,
  `tenant_id` varchar(64) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `token_prefix` varchar(32) NOT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `status` enum('active','revoked') NOT NULL DEFAULT 'active',
  `created_by` varchar(64) NOT NULL DEFAULT 'superadmin',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `scim_api_tokens_token_hash_unique` (`token_hash`),
  KEY `scim_api_tokens_tenant_id_index` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `scim_sync_logs`;
CREATE TABLE `scim_sync_logs` (
  `id` varchar(64) NOT NULL,
  `tenant_id` varchar(64) DEFAULT NULL,
  `token_id` varchar(64) DEFAULT NULL,
  `method` varchar(16) NOT NULL,
  `endpoint` varchar(255) NOT NULL,
  `scim_resource_type` varchar(64) DEFAULT NULL,
  `scim_resource_id` varchar(255) DEFAULT NULL,
  `action` varchar(64) NOT NULL,
  `status_code` int NOT NULL,
  `ip_address` varchar(64) DEFAULT NULL,
  `request_payload` longtext,
  `error_detail` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `scim_sync_logs_tenant_id_index` (`tenant_id`),
  KEY `scim_sync_logs_token_id_index` (`token_id`),
  KEY `scim_sync_logs_created_at_index` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `secret_access_audit_logs`;
CREATE TABLE `secret_access_audit_logs` (
  `id` varchar(36) NOT NULL,
  `key_id` varchar(36) NOT NULL,
  `version_number` int NOT NULL,
  `accessor_service` varchar(96) NOT NULL,
  `accessor_user_id` varchar(36) DEFAULT NULL,
  `operation` varchar(48) NOT NULL,
  `ip_address` varchar(45) NOT NULL DEFAULT '127.0.0.1',
  `success` tinyint(1) NOT NULL DEFAULT '1',
  `failure_reason` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_saal_key` (`key_id`),
  KEY `idx_saal_service` (`accessor_service`),
  KEY `idx_saal_op` (`operation`),
  KEY `idx_saal_created` (`created_at`),
  CONSTRAINT `secret_access_audit_logs_key_id_foreign` FOREIGN KEY (`key_id`) REFERENCES `secret_vault_keys` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `secret_key_versions`;
CREATE TABLE `secret_key_versions` (
  `id` varchar(36) NOT NULL,
  `key_id` varchar(36) NOT NULL,
  `version_number` int NOT NULL,
  `encrypted_key_material` text NOT NULL,
  `key_fingerprint` varchar(64) NOT NULL,
  `algorithm` varchar(48) NOT NULL DEFAULT 'aes-256-gcm',
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `activated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deprecated_at` datetime DEFAULT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `rotation_trigger` varchar(48) NOT NULL DEFAULT 'automated_schedule',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_skv_key_version` (`key_id`,`version_number`),
  KEY `idx_skv_key` (`key_id`),
  KEY `idx_skv_status` (`status`),
  CONSTRAINT `secret_key_versions_key_id_foreign` FOREIGN KEY (`key_id`) REFERENCES `secret_vault_keys` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `secret_vault_keys`;
CREATE TABLE `secret_vault_keys` (
  `id` varchar(36) NOT NULL,
  `key_alias` varchar(120) NOT NULL,
  `key_type` varchar(48) NOT NULL,
  `vault_provider` varchar(48) NOT NULL,
  `current_version` int NOT NULL DEFAULT '1',
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `rotation_interval_days` int NOT NULL DEFAULT '90',
  `auto_rotate_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `last_rotated_at` datetime DEFAULT NULL,
  `next_rotation_due` datetime DEFAULT NULL,
  `grace_period_hours` int NOT NULL DEFAULT '72',
  `metadata` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `secret_vault_keys_key_alias_unique` (`key_alias`),
  KEY `idx_svk_type` (`key_type`),
  KEY `idx_svk_provider` (`vault_provider`),
  KEY `idx_svk_status` (`status`),
  KEY `idx_svk_due` (`next_rotation_due`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `semantic_vector_embeddings`;
CREATE TABLE `semantic_vector_embeddings` (
  `id` varchar(64) NOT NULL,
  `collection_id` varchar(64) NOT NULL,
  `document_id` varchar(128) NOT NULL,
  `chunk_index` int NOT NULL DEFAULT '0',
  `content_text` mediumtext NOT NULL,
  `embedding_vector` longtext,
  `metadata` mediumtext,
  `token_count` int NOT NULL DEFAULT '0',
  `sha256_hash` varchar(128) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `semantic_vector_embeddings_collection_id_index` (`collection_id`),
  KEY `semantic_vector_embeddings_document_id_index` (`document_id`),
  KEY `semantic_vector_embeddings_sha256_hash_index` (`sha256_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `semantic_vector_memories`;
CREATE TABLE `semantic_vector_memories` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `brand_id` varchar(36) NOT NULL,
  `memory_type` varchar(32) NOT NULL,
  `content` text NOT NULL,
  `embedding_vector` json DEFAULT NULL,
  `tags` json NOT NULL,
  `relevance_score` decimal(4,3) NOT NULL DEFAULT '1.000',
  `access_count` int NOT NULL DEFAULT '0',
  `last_recalled_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_svm_tenant` (`tenant_id`),
  KEY `idx_svm_brand` (`brand_id`),
  KEY `idx_svm_type` (`memory_type`),
  CONSTRAINT `semantic_vector_memories_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `semantic_vector_memories_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `shard_rebalance_migrations`;
CREATE TABLE `shard_rebalance_migrations` (
  `id` varchar(64) NOT NULL,
  `source_shard_id` varchar(64) NOT NULL,
  `target_shard_id` varchar(64) NOT NULL,
  `vnode_id` varchar(64) NOT NULL,
  `keys_migrated` int NOT NULL DEFAULT '0',
  `total_keys` int NOT NULL DEFAULT '0',
  `progress_percent` int NOT NULL DEFAULT '0',
  `status` varchar(32) NOT NULL DEFAULT 'in_progress',
  `started_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `shard_rebalance_migrations_source_shard_id_index` (`source_shard_id`),
  KEY `shard_rebalance_migrations_target_shard_id_index` (`target_shard_id`),
  KEY `shard_rebalance_migrations_vnode_id_index` (`vnode_id`),
  KEY `shard_rebalance_migrations_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `shard_routing_ranges`;
CREATE TABLE `shard_routing_ranges` (
  `id` varchar(64) NOT NULL,
  `shard_id` varchar(64) NOT NULL,
  `hash_range_start` bigint NOT NULL,
  `hash_range_end` bigint NOT NULL,
  `vnode_id` varchar(64) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `shard_routing_ranges_shard_id_index` (`shard_id`),
  KEY `shard_routing_ranges_vnode_id_index` (`vnode_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `siem_delivery_logs`;
CREATE TABLE `siem_delivery_logs` (
  `id` varchar(64) NOT NULL,
  `destination_id` varchar(64) NOT NULL,
  `events_count` int NOT NULL,
  `status_code` int NOT NULL,
  `latency_ms` int NOT NULL,
  `status` enum('delivered','failed','retrying') NOT NULL DEFAULT 'delivered',
  `error_message` text,
  `digest_sha256` varchar(64) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `siem_delivery_logs_destination_id_index` (`destination_id`),
  KEY `siem_delivery_logs_created_at_index` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `siem_destinations`;
CREATE TABLE `siem_destinations` (
  `id` varchar(64) NOT NULL,
  `tenant_id` varchar(64) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `destination_type` varchar(32) NOT NULL,
  `payload_format` varchar(32) NOT NULL,
  `endpoint_url` varchar(1024) NOT NULL,
  `encrypted_auth_secret` text NOT NULL,
  `secret_prefix` varchar(32) NOT NULL,
  `categories` json NOT NULL,
  `min_severity` varchar(16) NOT NULL DEFAULT 'info',
  `batch_size` int NOT NULL DEFAULT '50',
  `rate_limit_per_min` int NOT NULL DEFAULT '1000',
  `status` enum('active','paused','degraded','failed') NOT NULL DEFAULT 'active',
  `total_events_delivered` bigint DEFAULT '0',
  `total_events_failed` bigint DEFAULT '0',
  `last_success_at` timestamp NULL DEFAULT NULL,
  `last_failure_at` timestamp NULL DEFAULT NULL,
  `last_error_message` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `siem_destinations_tenant_id_index` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `signup_otp_verifications`;
CREATE TABLE `signup_otp_verifications` (
  `id` varchar(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `otp_hash` varchar(64) NOT NULL,
  `attempts` int NOT NULL DEFAULT '0',
  `expires_at` timestamp NOT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `signup_otp_verifications_email_index` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `sms_campaigns`;
CREATE TABLE `sms_campaigns` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `brand_id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `sender_phone` varchar(32) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'DRAFT',
  `recipient_count` int NOT NULL DEFAULT '0',
  `sent_count` int NOT NULL DEFAULT '0',
  `delivered_count` int NOT NULL DEFAULT '0',
  `opt_out_count` int NOT NULL DEFAULT '0',
  `sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `sms_campaigns_tenant_id_index` (`tenant_id`),
  KEY `sms_campaigns_brand_id_index` (`brand_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `sms_messages`;
CREATE TABLE `sms_messages` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `brand_id` varchar(36) NOT NULL,
  `contact_id` varchar(36) DEFAULT NULL,
  `campaign_id` varchar(36) DEFAULT NULL,
  `direction` varchar(16) NOT NULL DEFAULT 'OUTBOUND',
  `from_number` varchar(32) NOT NULL,
  `to_number` varchar(32) NOT NULL,
  `body` text NOT NULL,
  `segments` int NOT NULL DEFAULT '1',
  `status` varchar(32) NOT NULL DEFAULT 'SENT',
  `provider_message_sid` varchar(64) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sms_messages_provider_message_sid_unique` (`provider_message_sid`),
  KEY `sms_messages_tenant_id_index` (`tenant_id`),
  KEY `sms_messages_brand_id_index` (`brand_id`),
  KEY `sms_messages_contact_id_index` (`contact_id`),
  KEY `sms_messages_campaign_id_index` (`campaign_id`),
  KEY `sms_messages_to_number_index` (`to_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `sms_senders`;
CREATE TABLE `sms_senders` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `brand_id` varchar(36) NOT NULL,
  `provider` varchar(32) NOT NULL DEFAULT 'twilio',
  `phone_number` varchar(32) NOT NULL,
  `sender_type` varchar(32) NOT NULL DEFAULT '10DLC',
  `a2p_registration_status` varchar(32) NOT NULL DEFAULT 'APPROVED',
  `brand_name` varchar(128) NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `sms_senders_tenant_id_index` (`tenant_id`),
  KEY `sms_senders_brand_id_index` (`brand_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `social_accounts`;
CREATE TABLE `social_accounts` (
  `id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `tenant_id` char(36) DEFAULT NULL,
  `platform` varchar(50) NOT NULL,
  `account_name` varchar(255) NOT NULL,
  `account_id` varchar(255) NOT NULL,
  `access_token_encrypted` text NOT NULL,
  `refresh_token_encrypted` text,
  `token_expires_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `metadata` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_brand_platform_account` (`brand_id`,`platform`,`account_id`),
  KEY `idx_social_accounts_tenant` (`tenant_id`),
  CONSTRAINT `social_accounts_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `social_connections`;
CREATE TABLE `social_connections` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) DEFAULT NULL,
  `provider` varchar(64) NOT NULL,
  `provider_account_id` varchar(255) NOT NULL,
  `account_name` varchar(255) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'connected',
  `provider_account_metadata` json DEFAULT NULL,
  `health_status` varchar(32) NOT NULL DEFAULT 'healthy',
  `scopes` json DEFAULT NULL,
  `credential_reference` varchar(255) DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `last_health_check_at` timestamp NULL DEFAULT NULL,
  `last_error` text,
  `token_expires_at` timestamp NULL DEFAULT NULL,
  `last_synced_at` timestamp NULL DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `social_connections_brand_id_foreign` (`brand_id`),
  KEY `idx_social_conn_tenant_brand` (`tenant_id`,`brand_id`),
  KEY `idx_social_conn_provider_account` (`provider`,`provider_account_id`),
  KEY `idx_social_conn_status` (`status`),
  CONSTRAINT `social_connections_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `social_connections_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `social_webhook_configs`;
CREATE TABLE `social_webhook_configs` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) DEFAULT NULL,
  `brand_id` char(36) DEFAULT NULL,
  `provider` varchar(50) NOT NULL,
  `endpoint_url` varchar(500) NOT NULL,
  `secret_token` varchar(255) DEFAULT NULL,
  `verify_token` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `auto_retry_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `max_retries` int NOT NULL DEFAULT '5',
  `subscribed_events` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `social_webhook_configs_brand_id_foreign` (`brand_id`),
  KEY `idx_swc_provider` (`provider`),
  KEY `idx_swc_tenant` (`tenant_id`),
  KEY `idx_swc_active` (`is_active`),
  CONSTRAINT `social_webhook_configs_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `social_webhook_configs_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `social_webhook_events`;
CREATE TABLE `social_webhook_events` (
  `id` char(36) NOT NULL,
  `provider` varchar(50) NOT NULL DEFAULT 'meta',
  `provider_event_id` varchar(255) DEFAULT NULL,
  `event_type` varchar(100) NOT NULL,
  `tenant_id` char(36) DEFAULT NULL,
  `brand_id` char(36) DEFAULT NULL,
  `connection_id` char(36) DEFAULT NULL,
  `payload` longtext NOT NULL,
  `headers` longtext,
  `signature` text,
  `signature_verified` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('received','processing','processed','failed','dead_letter','discarded') NOT NULL DEFAULT 'received',
  `attempts` int NOT NULL DEFAULT '0',
  `max_attempts` int NOT NULL DEFAULT '5',
  `next_retry_at` timestamp NULL DEFAULT NULL,
  `last_attempt_at` timestamp NULL DEFAULT NULL,
  `last_error` text,
  `processing_time_ms` int DEFAULT NULL,
  `idempotency_key` varchar(255) NOT NULL,
  `replayed_by_superadmin` tinyint(1) NOT NULL DEFAULT '0',
  `replayed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `social_webhook_events_idempotency_key_unique` (`idempotency_key`),
  KEY `social_webhook_events_brand_id_foreign` (`brand_id`),
  KEY `social_webhook_events_connection_id_foreign` (`connection_id`),
  KEY `idx_swe_prov_type` (`provider`,`event_type`),
  KEY `idx_swe_status` (`status`),
  KEY `idx_swe_retry` (`next_retry_at`),
  KEY `idx_swe_tenant_brand` (`tenant_id`,`brand_id`),
  KEY `idx_swe_created` (`created_at`),
  CONSTRAINT `social_webhook_events_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE SET NULL,
  CONSTRAINT `social_webhook_events_connection_id_foreign` FOREIGN KEY (`connection_id`) REFERENCES `social_connections` (`id`) ON DELETE SET NULL,
  CONSTRAINT `social_webhook_events_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `social_webhook_replay_logs`;
CREATE TABLE `social_webhook_replay_logs` (
  `id` char(36) NOT NULL,
  `event_id` char(36) NOT NULL,
  `admin_user_id` char(36) NOT NULL,
  `admin_email` varchar(255) NOT NULL,
  `support_ticket` varchar(100) DEFAULT NULL,
  `reason` text NOT NULL,
  `replay_status` varchar(32) NOT NULL DEFAULT 'success',
  `response_payload` json DEFAULT NULL,
  `execution_ms` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_swrl_event` (`event_id`),
  KEY `idx_swrl_admin` (`admin_user_id`),
  KEY `idx_swrl_created` (`created_at`),
  CONSTRAINT `social_webhook_replay_logs_admin_user_id_foreign` FOREIGN KEY (`admin_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `social_webhook_replay_logs_event_id_foreign` FOREIGN KEY (`event_id`) REFERENCES `social_webhook_events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `state_machine_instances`;
CREATE TABLE `state_machine_instances` (
  `id` varchar(64) NOT NULL,
  `workflow_definition_id` varchar(64) NOT NULL,
  `target_tenant_id` varchar(64) NOT NULL,
  `correlation_id` varchar(128) NOT NULL,
  `current_step_index` int NOT NULL DEFAULT '0',
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `input_payload` json NOT NULL,
  `state_payload` json NOT NULL,
  `error_details` mediumtext,
  `started_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `state_machine_instances_workflow_definition_id_index` (`workflow_definition_id`),
  KEY `state_machine_instances_target_tenant_id_index` (`target_tenant_id`),
  KEY `state_machine_instances_correlation_id_index` (`correlation_id`),
  KEY `state_machine_instances_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `storage_buckets`;
CREATE TABLE `storage_buckets` (
  `id` varchar(64) NOT NULL,
  `bucket_name` varchar(128) NOT NULL,
  `provider_type` varchar(64) NOT NULL,
  `region` varchar(64) NOT NULL,
  `endpoint_url` varchar(255) NOT NULL,
  `default_storage_class` varchar(64) NOT NULL DEFAULT 'standard_hot',
  `versioning_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `is_immutable_locked` tinyint(1) NOT NULL DEFAULT '0',
  `total_objects_count` int NOT NULL DEFAULT '0',
  `total_size_bytes` bigint NOT NULL DEFAULT '0',
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `storage_buckets_bucket_name_unique` (`bucket_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `subscription_plans`;
CREATE TABLE `subscription_plans` (
  `id` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `slug` varchar(64) DEFAULT NULL,
  `description` text,
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `currency` varchar(10) NOT NULL DEFAULT 'usd',
  `billing_interval` enum('month','year') NOT NULL DEFAULT 'month',
  `monthly_price_cents` int NOT NULL DEFAULT '0',
  `annual_price_cents` int DEFAULT NULL,
  `max_brands` int NOT NULL DEFAULT '1',
  `max_social_accounts` int NOT NULL DEFAULT '3',
  `max_posts_per_month` int NOT NULL DEFAULT '50',
  `max_ai_content` int DEFAULT '100',
  `max_ai_images` int DEFAULT '25',
  `max_ai_videos` int DEFAULT '5',
  `max_active_campaigns` int DEFAULT '5',
  `max_scheduled_posts` int DEFAULT '50',
  `max_users` int NOT NULL DEFAULT '2',
  `ai_tokens_monthly` int NOT NULL DEFAULT '100000',
  `video_render_seconds_monthly` int NOT NULL DEFAULT '300',
  `storage_bytes_limit` bigint NOT NULL DEFAULT '10737418240',
  `features` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_subscription_plans_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data for table `subscription_plans` (12 rows)
INSERT INTO `subscription_plans` (`id`, `name`, `slug`, `description`, `price`, `currency`, `billing_interval`, `monthly_price_cents`, `annual_price_cents`, `max_brands`, `max_social_accounts`, `max_posts_per_month`, `max_ai_content`, `max_ai_images`, `max_ai_videos`, `max_active_campaigns`, `max_scheduled_posts`, `max_users`, `ai_tokens_monthly`, `video_render_seconds_monthly`, `storage_bytes_limit`, `features`, `is_active`, `created_at`, `updated_at`) VALUES ('agency', 'Agency Pro', 'agency-pro', 'For digital agencies: 25 brands, multi-client agency workspaces, advanced Brand Brain & API access.', '249.00', 'usd', 'month', 24900, 238800, 25, 100, 2500, 5000, 1000, 100, 100, 2500, 20, 2500000, 3600, 107374182400, '{"ai_brain":true,"api_access":true,"ffmpeg_video":true,"ads_management":true,"custom_branding":true,"priority_queues":true,"client_approvals":true,"whatsapp_enabled":true,"agency_workspaces":true,"multi_brand_brain":true,"advanced_analytics":true,"max_autonomy_level":"L4","premium_connectors":true,"max_active_automations":50,"analytics_retention_days":365}', 1, '2026-10-05 19:07:33', '2026-11-16 11:04:09');
INSERT INTO `subscription_plans` (`id`, `name`, `slug`, `description`, `price`, `currency`, `billing_interval`, `monthly_price_cents`, `annual_price_cents`, `max_brands`, `max_social_accounts`, `max_posts_per_month`, `max_ai_content`, `max_ai_images`, `max_ai_videos`, `max_active_campaigns`, `max_scheduled_posts`, `max_users`, `ai_tokens_monthly`, `video_render_seconds_monthly`, `storage_bytes_limit`, `features`, `is_active`, `created_at`, `updated_at`) VALUES ('agency_scale', 'Agency Scale Pro', 'agency-scale-pro', 'For digital agencies: 25 brands, multi-client agency workspaces, advanced Brand Brain & API access.', '249.00', 'usd', 'month', 24900, 238800, 25, 100, 2500, 100, 25, 5, 5, 50, 20, 2500000, 3600, 107374182400, '{"ai_brain":true,"api_access":true,"ffmpeg_video":true,"ads_management":true,"custom_branding":true,"priority_queues":true,"client_approvals":true,"whatsapp_enabled":true,"agency_workspaces":true,"multi_brand_brain":true,"advanced_analytics":true,"max_autonomy_level":"L4","max_active_automations":50,"analytics_retention_days":365}', 1, '2026-10-05 11:24:21', '2026-11-05 20:59:06');
INSERT INTO `subscription_plans` (`id`, `name`, `slug`, `description`, `price`, `currency`, `billing_interval`, `monthly_price_cents`, `annual_price_cents`, `max_brands`, `max_social_accounts`, `max_posts_per_month`, `max_ai_content`, `max_ai_images`, `max_ai_videos`, `max_active_campaigns`, `max_scheduled_posts`, `max_users`, `ai_tokens_monthly`, `video_render_seconds_monthly`, `storage_bytes_limit`, `features`, `is_active`, `created_at`, `updated_at`) VALUES ('business', 'Business', 'business', 'Marketing agencies & multi-brand studios: 25 client brands, agency workspaces, white-label branding, approval links, and API access.', '199.00', 'usd', 'month', 19900, 199000, 25, 50, 2500, 5000, 1000, 100, 100, 2500, 25, 2500000, 6000, 214748364800, '{"ai_brain":true,"api_access":true,"ffmpeg_video":true,"ads_management":true,"custom_branding":true,"priority_queues":true,"client_approvals":true,"whatsapp_enabled":true,"agency_workspaces":true,"multi_brand_brain":true,"advanced_analytics":true,"max_autonomy_level":"L4","premium_connectors":true,"max_active_automations":100,"analytics_retention_days":365}', 1, '2026-11-16 11:04:09', '2026-11-16 11:04:09');
INSERT INTO `subscription_plans` (`id`, `name`, `slug`, `description`, `price`, `currency`, `billing_interval`, `monthly_price_cents`, `annual_price_cents`, `max_brands`, `max_social_accounts`, `max_posts_per_month`, `max_ai_content`, `max_ai_images`, `max_ai_videos`, `max_active_campaigns`, `max_scheduled_posts`, `max_users`, `ai_tokens_monthly`, `video_render_seconds_monthly`, `storage_bytes_limit`, `features`, `is_active`, `created_at`, `updated_at`) VALUES ('enterprise', 'Enterprise', 'enterprise', 'Bespoke multi-brand enterprise marketing with dedicated capacity, custom SLA, and unlimited quotas.', '499.00', 'usd', 'month', 49900, 499000, 999999, 999999, 999999, 999999, 999999, 999999, 999999, 999999, 999999, 999999999, 999999, 1099511627776, '{"ai_brain":true,"api_access":true,"ffmpeg_video":true,"ads_management":true,"custom_branding":true,"priority_queues":true,"client_approvals":true,"agency_workspaces":true,"scim_provisioning":true,"advanced_analytics":true,"max_autonomy_level":"L5","premium_connectors":true,"max_active_automations":999999,"analytics_retention_days":3650,"dedicated_account_manager":true}', 1, '2026-10-10 19:21:49', '2026-11-16 11:04:09');
INSERT INTO `subscription_plans` (`id`, `name`, `slug`, `description`, `price`, `currency`, `billing_interval`, `monthly_price_cents`, `annual_price_cents`, `max_brands`, `max_social_accounts`, `max_posts_per_month`, `max_ai_content`, `max_ai_images`, `max_ai_videos`, `max_active_campaigns`, `max_scheduled_posts`, `max_users`, `ai_tokens_monthly`, `video_render_seconds_monthly`, `storage_bytes_limit`, `features`, `is_active`, `created_at`, `updated_at`) VALUES ('free', 'Free', 'free', 'Free forever plan for testing social publishing, basic AI copy, and content scheduling.', '0.00', 'usd', 'month', 0, 0, 1, 2, 20, 25, 5, 1, 1, 10, 1, 25000, 60, 1073741824, '{"ai_brain":true,"ffmpeg_video":true,"ads_management":false,"priority_queues":false,"client_approvals":false,"whatsapp_enabled":false,"agency_workspaces":false,"advanced_analytics":false,"max_autonomy_level":"L1","premium_connectors":false,"max_active_automations":1,"analytics_retention_days":7}', 1, '2026-11-16 11:04:09', '2026-11-16 11:04:09');
INSERT INTO `subscription_plans` (`id`, `name`, `slug`, `description`, `price`, `currency`, `billing_interval`, `monthly_price_cents`, `annual_price_cents`, `max_brands`, `max_social_accounts`, `max_posts_per_month`, `max_ai_content`, `max_ai_images`, `max_ai_videos`, `max_active_campaigns`, `max_scheduled_posts`, `max_users`, `ai_tokens_monthly`, `video_render_seconds_monthly`, `storage_bytes_limit`, `features`, `is_active`, `created_at`, `updated_at`) VALUES ('free_trial', 'Free Trial', 'free-trial', '14-day evaluation with full core capability testing.', '0.00', 'usd', 'month', 0, NULL, 1, 2, 20, 100, 25, 5, 5, 50, 1, 25000, 60, 1073741824, '{"ai_brain":true,"ffmpeg_video":true,"ads_management":false,"priority_queues":false,"client_approvals":true,"agency_workspaces":false,"advanced_analytics":false,"max_autonomy_level":"L2","premium_connectors":false,"max_active_automations":10,"analytics_retention_days":7}', 1, '2026-10-05 11:24:21', '2026-10-10 19:21:49');
INSERT INTO `subscription_plans` (`id`, `name`, `slug`, `description`, `price`, `currency`, `billing_interval`, `monthly_price_cents`, `annual_price_cents`, `max_brands`, `max_social_accounts`, `max_posts_per_month`, `max_ai_content`, `max_ai_images`, `max_ai_videos`, `max_active_campaigns`, `max_scheduled_posts`, `max_users`, `ai_tokens_monthly`, `video_render_seconds_monthly`, `storage_bytes_limit`, `features`, `is_active`, `created_at`, `updated_at`) VALUES ('growth', 'Growth', 'growth', 'High-growth social brand intelligence and automation suite', '99.00', 'usd', 'month', 9900, 94800, 5, 15, 500, 1000, 250, 30, 20, 500, 5, 500000, 1200, 21474836480, '{"ai_brain":true,"ffmpeg_video":true,"ads_management":false,"priority_queues":false,"client_approvals":true,"whatsapp_enabled":true,"agency_workspaces":false,"advanced_analytics":true,"max_autonomy_level":"L3","premium_connectors":true,"max_active_automations":10,"analytics_retention_days":90}', 1, '2026-10-05 11:24:21', '2026-11-16 11:04:09');
INSERT INTO `subscription_plans` (`id`, `name`, `slug`, `description`, `price`, `currency`, `billing_interval`, `monthly_price_cents`, `annual_price_cents`, `max_brands`, `max_social_accounts`, `max_posts_per_month`, `max_ai_content`, `max_ai_images`, `max_ai_videos`, `max_active_campaigns`, `max_scheduled_posts`, `max_users`, `ai_tokens_monthly`, `video_render_seconds_monthly`, `storage_bytes_limit`, `features`, `is_active`, `created_at`, `updated_at`) VALUES ('legacy_agency_grandfathered', 'Agency Grandfathered Lifetime', 'agency-grandfathered-lifetime', 'Safe grandfathered production plan ensuring uninterrupted operations for existing agency tenants.', '0.00', 'usd', 'month', 0, NULL, 50, 250, 10000, 100, 25, 5, 5, 50, 50, 5000000, 7200, 107374182400, '{"ai_brain":true,"ffmpeg_video":true,"grandfathered":true,"priority_queues":true,"client_approvals":true,"advanced_analytics":true}', 1, '2026-10-05 11:33:19', '2026-10-05 11:33:19');
INSERT INTO `subscription_plans` (`id`, `name`, `slug`, `description`, `price`, `currency`, `billing_interval`, `monthly_price_cents`, `annual_price_cents`, `max_brands`, `max_social_accounts`, `max_posts_per_month`, `max_ai_content`, `max_ai_images`, `max_ai_videos`, `max_active_campaigns`, `max_scheduled_posts`, `max_users`, `ai_tokens_monthly`, `video_render_seconds_monthly`, `storage_bytes_limit`, `features`, `is_active`, `created_at`, `updated_at`) VALUES ('professional', 'Professional', 'professional', 'Professional tier with 300 monthly posts, full AI suite, and multi-channel automation.', '79.00', 'usd', 'month', 7900, 79000, 5, 10, 300, 150, 250, 30, 20, 500, 5, 500000, 1800, 21474836480, '{"ai_brain":true,"recommended":true,"ffmpeg_video":true,"ads_management":false,"priority_queues":true,"client_approvals":true,"whatsapp_enabled":true,"agency_workspaces":false,"max_posts_created":300,"advanced_analytics":true,"max_autonomy_level":"L3","premium_connectors":true,"max_scheduled_posts":300,"max_active_automations":20,"analytics_retention_days":90,"ai_video_generations_monthly":30,"ai_content_generations_monthly":150}', 1, '2026-11-16 11:04:09', '2026-11-16 17:26:56');
INSERT INTO `subscription_plans` (`id`, `name`, `slug`, `description`, `price`, `currency`, `billing_interval`, `monthly_price_cents`, `annual_price_cents`, `max_brands`, `max_social_accounts`, `max_posts_per_month`, `max_ai_content`, `max_ai_images`, `max_ai_videos`, `max_active_campaigns`, `max_scheduled_posts`, `max_users`, `ai_tokens_monthly`, `video_render_seconds_monthly`, `storage_bytes_limit`, `features`, `is_active`, `created_at`, `updated_at`) VALUES ('scale', 'Scale', 'scale', 'High-throughput publishing across up to 100 brands, 200 automations, L5 autonomous agent, and SCIM.', '499.00', 'usd', 'month', 49900, 478800, 100, 250, 10000, 10000, 2000, 200, 200, 5000, 50, 10000000, 18000, 536870912000, '{"ai_brain":true,"api_access":true,"ffmpeg_video":true,"ads_management":true,"custom_branding":true,"priority_queues":true,"client_approvals":true,"whatsapp_enabled":true,"agency_workspaces":true,"multi_brand_brain":true,"scim_provisioning":true,"advanced_analytics":true,"max_autonomy_level":"L5","premium_connectors":true,"enterprise_governance":true,"max_active_automations":200,"analytics_retention_days":730}', 1, '2026-10-10 19:21:49', '2026-11-16 11:04:09');
INSERT INTO `subscription_plans` (`id`, `name`, `slug`, `description`, `price`, `currency`, `billing_interval`, `monthly_price_cents`, `annual_price_cents`, `max_brands`, `max_social_accounts`, `max_posts_per_month`, `max_ai_content`, `max_ai_images`, `max_ai_videos`, `max_active_campaigns`, `max_scheduled_posts`, `max_users`, `ai_tokens_monthly`, `video_render_seconds_monthly`, `storage_bytes_limit`, `features`, `is_active`, `created_at`, `updated_at`) VALUES ('starter', 'Starter', 'starter', 'Essential social publishing, basic CRM, design studio, and foundational AI marketing assistance.', '29.00', 'usd', 'month', 2900, 29000, 1, 5, 150, 250, 50, 10, 5, 100, 3, 100000, 600, 10737418240, '{"ai_brain":true,"ffmpeg_video":true,"ads_management":false,"priority_queues":false,"client_approvals":false,"whatsapp_enabled":false,"agency_workspaces":false,"advanced_analytics":false,"max_autonomy_level":"L2","premium_connectors":false,"max_active_automations":5,"analytics_retention_days":30}', 1, '2026-10-05 11:24:21', '2026-11-16 11:18:39');
INSERT INTO `subscription_plans` (`id`, `name`, `slug`, `description`, `price`, `currency`, `billing_interval`, `monthly_price_cents`, `annual_price_cents`, `max_brands`, `max_social_accounts`, `max_posts_per_month`, `max_ai_content`, `max_ai_images`, `max_ai_videos`, `max_active_campaigns`, `max_scheduled_posts`, `max_users`, `ai_tokens_monthly`, `video_render_seconds_monthly`, `storage_bytes_limit`, `features`, `is_active`, `created_at`, `updated_at`) VALUES ('trial', 'Trial', 'trial', '14-day evaluation with full core capability testing.', '0.00', 'usd', 'month', 0, NULL, 1, 2, 20, 100, 25, 5, 5, 50, 1, 25000, 60, 1073741824, '{"ai_brain":true,"ffmpeg_video":true,"ads_management":false,"priority_queues":false,"client_approvals":true,"agency_workspaces":false,"advanced_analytics":false,"max_autonomy_level":"L2","premium_connectors":false,"max_active_automations":1,"analytics_retention_days":7}', 1, '2026-10-10 19:21:28', '2026-10-10 19:21:28');

DROP TABLE IF EXISTS `superadmin_audit_logs`;
CREATE TABLE `superadmin_audit_logs` (
  `id` char(36) NOT NULL,
  `superadmin_id` char(36) NOT NULL,
  `superadmin_email` varchar(255) NOT NULL,
  `action` varchar(128) NOT NULL,
  `target_tenant_id` char(36) DEFAULT NULL,
  `target_resource_type` varchar(64) DEFAULT NULL,
  `target_resource_id` varchar(255) DEFAULT NULL,
  `reason` text,
  `details` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sa_audit_superadmin` (`superadmin_id`),
  KEY `idx_sa_audit_tenant` (`target_tenant_id`),
  KEY `idx_sa_audit_action` (`action`),
  KEY `idx_sa_audit_created_at` (`created_at`),
  CONSTRAINT `superadmin_audit_logs_superadmin_id_foreign` FOREIGN KEY (`superadmin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `superadmin_audit_logs_target_tenant_id_foreign` FOREIGN KEY (`target_tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `superadmin_impersonation_sessions`;
CREATE TABLE `superadmin_impersonation_sessions` (
  `id` char(36) NOT NULL,
  `superadmin_id` char(36) NOT NULL,
  `superadmin_email` varchar(255) NOT NULL,
  `target_tenant_id` char(36) NOT NULL,
  `target_user_id` char(36) DEFAULT NULL,
  `session_token` varchar(255) NOT NULL,
  `reason` text NOT NULL,
  `ticket_reference` varchar(64) NOT NULL,
  `duration_minutes` int NOT NULL DEFAULT '15',
  `expires_at` timestamp NOT NULL,
  `revoked_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `superadmin_impersonation_sessions_session_token_unique` (`session_token`),
  KEY `superadmin_impersonation_sessions_target_user_id_foreign` (`target_user_id`),
  KEY `idx_sa_imp_superadmin` (`superadmin_id`),
  KEY `idx_sa_imp_tenant` (`target_tenant_id`),
  KEY `idx_sa_imp_token` (`session_token`),
  KEY `idx_sa_imp_expires` (`expires_at`),
  CONSTRAINT `superadmin_impersonation_sessions_superadmin_id_foreign` FOREIGN KEY (`superadmin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `superadmin_impersonation_sessions_target_tenant_id_foreign` FOREIGN KEY (`target_tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `superadmin_impersonation_sessions_target_user_id_foreign` FOREIGN KEY (`target_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `system_backup_snapshots`;
CREATE TABLE `system_backup_snapshots` (
  `id` varchar(64) NOT NULL,
  `snapshot_type` enum('automated_daily','automated_hourly','manual_operator','pre_migration') NOT NULL DEFAULT 'automated_daily',
  `storage_tier` enum('hot_s3','cold_glacier','multi_region_replica') NOT NULL DEFAULT 'multi_region_replica',
  `storage_region` varchar(64) NOT NULL DEFAULT 'us-east-1',
  `replica_regions` json NOT NULL,
  `checksum_sha256` varchar(64) NOT NULL,
  `size_bytes` bigint NOT NULL DEFAULT '0',
  `table_count` int NOT NULL DEFAULT '0',
  `record_count` bigint NOT NULL DEFAULT '0',
  `status` enum('creating','available','verifying','verified','failed','purged') NOT NULL DEFAULT 'available',
  `verification_status` enum('untested','drill_passed','drill_failed') NOT NULL DEFAULT 'untested',
  `last_drill_at` timestamp NULL DEFAULT NULL,
  `drill_rto_seconds` int DEFAULT NULL,
  `drill_rpo_seconds` int DEFAULT NULL,
  `created_by` varchar(64) NOT NULL DEFAULT 'system_cron',
  `retention_days` int NOT NULL DEFAULT '30',
  `expires_at` timestamp NOT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `system_dr_drill_logs`;
CREATE TABLE `system_dr_drill_logs` (
  `id` varchar(64) NOT NULL,
  `snapshot_id` varchar(64) NOT NULL,
  `drill_type` enum('automated_synthetic','superadmin_manual') NOT NULL DEFAULT 'automated_synthetic',
  `target_environment` enum('isolated_sandbox','ephemeral_staging') NOT NULL DEFAULT 'isolated_sandbox',
  `status` enum('in_progress','passed','failed') NOT NULL DEFAULT 'passed',
  `rto_seconds` int NOT NULL DEFAULT '0',
  `integrity_check_passed` tinyint(1) NOT NULL DEFAULT '0',
  `table_integrity_summary` json DEFAULT NULL,
  `executed_by` varchar(64) NOT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `system_dr_drill_logs_snapshot_id_index` (`snapshot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `system_maintenance_windows`;
CREATE TABLE `system_maintenance_windows` (
  `id` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `impact_level` enum('none','minor_degradation','expected_downtime') NOT NULL DEFAULT 'minor_degradation',
  `impacted_components` json NOT NULL,
  `scheduled_start_at` timestamp NOT NULL,
  `scheduled_end_at` timestamp NOT NULL,
  `actual_start_at` timestamp NULL DEFAULT NULL,
  `actual_end_at` timestamp NULL DEFAULT NULL,
  `status` enum('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  `created_by` varchar(64) NOT NULL,
  `cancellation_reason` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `system_sla_telemetry`;
CREATE TABLE `system_sla_telemetry` (
  `id` varchar(64) NOT NULL,
  `component_id` varchar(64) NOT NULL,
  `sample_timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `window_type` varchar(32) NOT NULL DEFAULT 'minute_5',
  `status` varchar(32) NOT NULL DEFAULT 'operational',
  `latency_p50_ms` int NOT NULL DEFAULT '15',
  `latency_p95_ms` int NOT NULL DEFAULT '35',
  `latency_p99_ms` int NOT NULL DEFAULT '85',
  `sample_count` int NOT NULL DEFAULT '100',
  `error_count` int NOT NULL DEFAULT '0',
  `error_rate_pct` decimal(5,2) NOT NULL DEFAULT '0.00',
  `is_probe` tinyint(1) NOT NULL DEFAULT '0',
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `system_sla_telemetry_component_id_index` (`component_id`),
  KEY `system_sla_telemetry_sample_timestamp_index` (`sample_timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `system_status_components`;
CREATE TABLE `system_status_components` (
  `id` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `category` varchar(64) NOT NULL DEFAULT 'core',
  `display_order` int NOT NULL DEFAULT '0',
  `status` enum('operational','degraded_performance','partial_outage','major_outage','maintenance') NOT NULL DEFAULT 'operational',
  `manual_override` tinyint(1) NOT NULL DEFAULT '0',
  `override_reason` text,
  `override_by` varchar(64) DEFAULT NULL,
  `override_at` timestamp NULL DEFAULT NULL,
  `uptime_percentage_30d` decimal(5,2) NOT NULL DEFAULT '99.99',
  `uptime_percentage_90d` decimal(5,2) NOT NULL DEFAULT '99.98',
  `current_p95_latency_ms` int NOT NULL DEFAULT '25',
  `last_probe_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `system_status_incidents`;
CREATE TABLE `system_status_incidents` (
  `id` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `severity` enum('minor','major','critical') NOT NULL DEFAULT 'minor',
  `impacted_components` json NOT NULL,
  `current_status` enum('investigating','identified','monitoring','resolved') NOT NULL DEFAULT 'investigating',
  `started_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `updates` json NOT NULL,
  `created_by` varchar(64) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `system_tenant_backup_exports`;
CREATE TABLE `system_tenant_backup_exports` (
  `id` varchar(64) NOT NULL,
  `tenant_id` varchar(64) NOT NULL,
  `format` enum('sql_gz','json_archive') NOT NULL DEFAULT 'sql_gz',
  `checksum_sha256` varchar(64) NOT NULL,
  `size_bytes` bigint NOT NULL DEFAULT '0',
  `download_expires_at` timestamp NOT NULL,
  `created_by` varchar(64) NOT NULL,
  `status` enum('generating','ready','expired') NOT NULL DEFAULT 'ready',
  `reason` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `system_tenant_backup_exports_tenant_id_index` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `template_versions`;
CREATE TABLE `template_versions` (
  `id` char(36) NOT NULL,
  `template_id` char(36) NOT NULL,
  `tenant_id` char(36) DEFAULT NULL,
  `version_number` int NOT NULL DEFAULT '1',
  `layers` json NOT NULL,
  `background` json NOT NULL,
  `platform_variants` json DEFAULT NULL,
  `changelog` text,
  `created_by` char(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_locked` tinyint(1) NOT NULL DEFAULT '0',
  `usage_count` int NOT NULL DEFAULT '0',
  `required_fields` json DEFAULT NULL,
  `optional_fields` json DEFAULT NULL,
  `ai_instructions` text,
  `claim_restrictions` json DEFAULT NULL,
  `cta_rules` json DEFAULT NULL,
  `approval_policy` varchar(64) NOT NULL DEFAULT 'require_approval',
  `brand_tokens` json DEFAULT NULL,
  `subcategory` varchar(64) DEFAULT NULL,
  `dimensions` json DEFAULT NULL,
  `visual_components` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `template_versions_tenant_id_foreign` (`tenant_id`),
  KEY `template_versions_created_by_foreign` (`created_by`),
  KEY `idx_template_versions_lookup` (`template_id`,`version_number`),
  CONSTRAINT `template_versions_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `template_versions_template_id_foreign` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `template_versions_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `templates`;
CREATE TABLE `templates` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) DEFAULT NULL,
  `brand_id` char(36) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `category` varchar(50) NOT NULL,
  `aspect_ratio` varchar(50) NOT NULL DEFAULT '1:1',
  `is_custom` tinyint(1) NOT NULL DEFAULT '0',
  `is_built_in` tinyint(1) NOT NULL DEFAULT '0',
  `background` json NOT NULL,
  `layers` json NOT NULL,
  `tags` json DEFAULT NULL,
  `thumbnail_url` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `scope` varchar(32) NOT NULL DEFAULT 'tenant',
  `supported_platforms` json DEFAULT NULL,
  `required_fields` json DEFAULT NULL,
  `optional_fields` json DEFAULT NULL,
  `brand_tokens` json DEFAULT NULL,
  `ai_instructions` text,
  `claim_restrictions` json DEFAULT NULL,
  `cta_rules` json DEFAULT NULL,
  `approval_policy` varchar(64) NOT NULL DEFAULT 'require_approval',
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `active_version` int NOT NULL DEFAULT '1',
  `subcategory` varchar(64) DEFAULT NULL,
  `dimensions` json DEFAULT NULL,
  `visual_components` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `templates_tenant_id_foreign` (`tenant_id`),
  KEY `idx_templates_brand_category` (`brand_id`,`category`),
  CONSTRAINT `templates_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `templates_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tenant_churn_scores`;
CREATE TABLE `tenant_churn_scores` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `churn_risk_score` decimal(5,2) NOT NULL DEFAULT '0.00',
  `risk_tier` varchar(20) NOT NULL DEFAULT 'low',
  `primary_risk_factor` varchar(40) NOT NULL DEFAULT 'low_usage',
  `usage_velocity_score` decimal(5,2) NOT NULL DEFAULT '50.00',
  `seat_utilization_percent` decimal(5,2) NOT NULL DEFAULT '50.00',
  `billing_health_score` decimal(5,2) NOT NULL DEFAULT '100.00',
  `engagement_trend` varchar(20) NOT NULL DEFAULT 'stable',
  `predicted_churn_date` datetime DEFAULT NULL,
  `confidence_score` decimal(3,2) NOT NULL DEFAULT '0.85',
  `signals_json` json NOT NULL,
  `evaluated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tcs_tenant` (`tenant_id`),
  KEY `idx_tcs_tier` (`risk_tier`),
  KEY `idx_tcs_risk_factor` (`primary_risk_factor`),
  CONSTRAINT `tenant_churn_scores_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tenant_cost_attributions`;
CREATE TABLE `tenant_cost_attributions` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `tenant_name` varchar(120) NOT NULL,
  `reporting_period` varchar(7) NOT NULL,
  `total_spend` decimal(10,2) NOT NULL DEFAULT '0.00',
  `ai_spend` decimal(10,2) NOT NULL DEFAULT '0.00',
  `compute_spend` decimal(10,2) NOT NULL DEFAULT '0.00',
  `storage_spend` decimal(10,2) NOT NULL DEFAULT '0.00',
  `egress_spend` decimal(10,2) NOT NULL DEFAULT '0.00',
  `cost_per_post` decimal(8,4) NOT NULL DEFAULT '0.0500',
  `gross_margin_percent` decimal(5,2) NOT NULL DEFAULT '85.00',
  `cost_trend` varchar(32) NOT NULL DEFAULT 'stable',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_tca_tenant_period` (`tenant_id`,`reporting_period`),
  KEY `idx_tca_tenant` (`tenant_id`),
  KEY `idx_tca_period` (`reporting_period`),
  CONSTRAINT `tenant_cost_attributions_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tenant_subscriptions`;
CREATE TABLE `tenant_subscriptions` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `plan_id` varchar(64) NOT NULL,
  `agreed_price_cents` int DEFAULT NULL,
  `stripe_customer_id` varchar(128) DEFAULT NULL,
  `stripe_subscription_id` varchar(128) DEFAULT NULL,
  `status` enum('trialing','active','past_due','paused','cancelled','expired','disputed') NOT NULL DEFAULT 'active',
  `past_due_since` timestamp NULL DEFAULT NULL,
  `provider` varchar(50) NOT NULL DEFAULT 'system',
  `provider_customer_id` varchar(128) DEFAULT NULL,
  `provider_subscription_id` varchar(128) DEFAULT NULL,
  `provider_metadata` json DEFAULT NULL,
  `current_period_start` timestamp NOT NULL,
  `current_period_end` timestamp NOT NULL,
  `trial_start_at` timestamp NULL DEFAULT NULL,
  `trial_end_at` timestamp NULL DEFAULT NULL,
  `cancel_at_period_end` tinyint(1) DEFAULT '0',
  `canceled_at` timestamp NULL DEFAULT NULL,
  `ended_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_subscriptions_tenant_id_unique` (`tenant_id`),
  KEY `tenant_subscriptions_plan_id_foreign` (`plan_id`),
  KEY `idx_tenant_subscriptions_tenant` (`tenant_id`),
  KEY `idx_tenant_subscriptions_status` (`status`),
  KEY `idx_tenant_subscriptions_provider` (`provider`),
  KEY `idx_tenant_subscriptions_cust_id` (`provider_customer_id`),
  KEY `idx_tenant_subscriptions_sub_id` (`provider_subscription_id`),
  KEY `idx_tenant_subscriptions_grace` (`status`,`past_due_since`),
  CONSTRAINT `tenant_subscriptions_plan_id_foreign` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`),
  CONSTRAINT `tenant_subscriptions_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tenant_usage_alerts`;
CREATE TABLE `tenant_usage_alerts` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `period_month` varchar(7) NOT NULL,
  `resource` varchar(50) NOT NULL,
  `resource_label` varchar(100) NOT NULL,
  `threshold_percent` int NOT NULL,
  `current_usage` bigint NOT NULL,
  `quota_limit` bigint NOT NULL,
  `percent_used` decimal(6,2) NOT NULL,
  `in_app_notification_id` char(36) DEFAULT NULL,
  `email_log_id` char(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_tenant_alert_threshold` (`tenant_id`,`period_month`,`resource`,`threshold_percent`),
  KEY `idx_usage_alerts_tenant_period` (`tenant_id`,`period_month`),
  KEY `idx_usage_alerts_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tenant_usage_counters`;
CREATE TABLE `tenant_usage_counters` (
  `tenant_id` char(36) NOT NULL,
  `period_month` varchar(7) NOT NULL,
  `posts_published` int NOT NULL DEFAULT '0',
  `posts_created` int NOT NULL DEFAULT '0',
  `video_render_seconds` int NOT NULL DEFAULT '0',
  `ai_tokens_consumed` int NOT NULL DEFAULT '0',
  `storage_bytes_used` bigint NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `scheduled_posts` int NOT NULL DEFAULT '0',
  `ai_content_generations` int NOT NULL DEFAULT '0',
  `ai_image_generations` int NOT NULL DEFAULT '0',
  `ai_video_generations` int NOT NULL DEFAULT '0',
  `active_campaigns` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`tenant_id`,`period_month`),
  CONSTRAINT `tenant_usage_counters_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tenant_user_custom_roles`;
CREATE TABLE `tenant_user_custom_roles` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `role_id` varchar(36) NOT NULL,
  `assigned_by` varchar(36) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tenant_user_role` (`tenant_id`,`user_id`,`role_id`),
  KEY `tenant_user_custom_roles_tenant_id_index` (`tenant_id`),
  KEY `tenant_user_custom_roles_user_id_index` (`user_id`),
  KEY `tenant_user_custom_roles_role_id_index` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tenant_user_permission_overrides`;
CREATE TABLE `tenant_user_permission_overrides` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `permission_slug` varchar(64) NOT NULL,
  `effect` enum('allow','deny') NOT NULL DEFAULT 'allow',
  `reason` varchar(255) DEFAULT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_perm_override` (`tenant_id`,`user_id`,`permission_slug`),
  KEY `tenant_user_permission_overrides_tenant_id_index` (`tenant_id`),
  KEY `tenant_user_permission_overrides_user_id_index` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `tenant_users`;
CREATE TABLE `tenant_users` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'creator',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tenant_user` (`tenant_id`,`user_id`),
  KEY `idx_tenant_users_user_id` (`user_id`),
  CONSTRAINT `tenant_users_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tenant_users_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data for table `tenant_users` (2 rows)
INSERT INTO `tenant_users` (`id`, `tenant_id`, `user_id`, `role`, `created_at`, `updated_at`) VALUES ('29342546-9c00-44f4-9c02-2396c519a142', 'e656d363-c1f0-4e0e-bfa2-6bef9bda232c', 'bbe971f4-7ee8-4fe2-a1e1-3a853993a76a', 'agency_admin', '2026-11-25 00:47:30', '2026-11-25 00:47:30');
INSERT INTO `tenant_users` (`id`, `tenant_id`, `user_id`, `role`, `created_at`, `updated_at`) VALUES ('fb9be378-379c-4d5a-a303-1bc7af9c56c1', '1d9190fa-bd85-4304-8e73-8ef3ca62c342', '22c80f70-9562-408a-af1f-12cec24458d1', 'agency_admin', '2026-11-19 05:04:52', '2026-11-19 05:04:52');

DROP TABLE IF EXISTS `tenants`;
CREATE TABLE `tenants` (
  `id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `subscription_tier` varchar(50) NOT NULL DEFAULT 'standard',
  `settings` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenants_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data for table `tenants` (2 rows)
INSERT INTO `tenants` (`id`, `name`, `slug`, `subscription_tier`, `settings`, `created_at`, `updated_at`) VALUES ('1d9190fa-bd85-4304-8e73-8ef3ca62c342', 'Hoasp International', 'hoasp-international', 'Enterprise', '{"timezone":"Asia/Kolkata","require2FA":true,"defaultLanguage":"en"}', '2026-09-24 22:18:12', '2026-11-19 16:02:34');
INSERT INTO `tenants` (`id`, `name`, `slug`, `subscription_tier`, `settings`, `created_at`, `updated_at`) VALUES ('e656d363-c1f0-4e0e-bfa2-6bef9bda232c', 'Nexus Creative Studio', 'nexus-creative', 'agency_pro', '{"primaryLocale":"en-US"}', '2026-11-25 00:47:30', '2026-11-25 00:47:30');

DROP TABLE IF EXISTS `usage_counters`;
CREATE TABLE `usage_counters` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) DEFAULT NULL,
  `metric` varchar(64) NOT NULL,
  `period` varchar(32) NOT NULL,
  `current_usage` decimal(14,2) NOT NULL DEFAULT '0.00',
  `limit_value` decimal(14,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_usage_tenant_brand_metric_period` (`tenant_id`,`brand_id`,`metric`,`period`),
  KEY `idx_usage_counters_tenant` (`tenant_id`),
  KEY `idx_usage_counters_brand` (`brand_id`),
  KEY `idx_usage_counters_metric` (`metric`),
  KEY `idx_usage_counters_period` (`period`),
  KEY `idx_usage_tenant_metric_period` (`tenant_id`,`metric`,`period`),
  KEY `idx_usage_counters_created_at` (`created_at`),
  CONSTRAINT `usage_counters_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `usage_counters_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `user_onboarding_progress`;
CREATE TABLE `user_onboarding_progress` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'NOT_STARTED',
  `selected_role` varchar(64) DEFAULT NULL,
  `primary_objective` varchar(64) DEFAULT NULL,
  `current_step` int NOT NULL DEFAULT '1',
  `completed_steps` json NOT NULL,
  `activities` json NOT NULL,
  `workspace_name` varchar(255) DEFAULT NULL,
  `brand_id` char(36) DEFAULT NULL,
  `first_post_id` char(36) DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `first_value_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_uop_user_tenant` (`user_id`,`tenant_id`),
  KEY `idx_uop_user_id` (`user_id`),
  KEY `idx_uop_tenant_id` (`tenant_id`),
  KEY `idx_uop_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` char(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `is_superadmin` tinyint(1) DEFAULT '0',
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `avatar_url` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `email_verified` tinyint(1) NOT NULL DEFAULT '0',
  `failed_login_attempts` int NOT NULL DEFAULT '0',
  `locked_until` timestamp NULL DEFAULT NULL,
  `token_version` int NOT NULL DEFAULT '1',
  `last_login_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data for table `users` (3 rows)
INSERT INTO `users` (`id`, `email`, `is_superadmin`, `password_hash`, `full_name`, `avatar_url`, `is_active`, `created_at`, `updated_at`, `email_verified`, `failed_login_attempts`, `locked_until`, `token_version`, `last_login_at`) VALUES ('00000000-0000-0000-0000-000000000001', 'system@socialforge.internal', 1, '$2a$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456789', 'SocialForge System Engine', NULL, 1, '2026-11-17 14:09:12', '2026-11-17 14:09:12', 1, 0, NULL, 1, NULL);
INSERT INTO `users` (`id`, `email`, `is_superadmin`, `password_hash`, `full_name`, `avatar_url`, `is_active`, `created_at`, `updated_at`, `email_verified`, `failed_login_attempts`, `locked_until`, `token_version`, `last_login_at`) VALUES ('22c80f70-9562-408a-af1f-12cec24458d1', 'singh.ninex@gmail.com', 1, '$2a$12$KEcX3OwZm9cayJLdSDZ5M.aQ7lNLvS1Z5A3D588mzelYAvgz7C30C', 'Hoasp International', NULL, 1, '2026-11-19 05:04:52', '2026-11-24 05:07:21', 1, 0, NULL, 0, '2026-11-24 05:07:21');
INSERT INTO `users` (`id`, `email`, `is_superadmin`, `password_hash`, `full_name`, `avatar_url`, `is_active`, `created_at`, `updated_at`, `email_verified`, `failed_login_attempts`, `locked_until`, `token_version`, `last_login_at`) VALUES ('bbe971f4-7ee8-4fe2-a1e1-3a853993a76a', 'alex@nexus.com', 0, '$2a$10$jzdBzT62hz7YLAufhnVXXe0Z3CgR1/afZaRNcc9MTCIBXedF84oWa', 'Alex Vance', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 1, '2026-11-25 00:47:30', '2026-11-25 00:47:30', 0, 0, NULL, 1, NULL);

DROP TABLE IF EXISTS `vector_clock_states`;
CREATE TABLE `vector_clock_states` (
  `id` varchar(64) NOT NULL,
  `entity_type` varchar(64) NOT NULL,
  `entity_id` varchar(64) NOT NULL,
  `region_clocks` json NOT NULL,
  `causal_state` varchar(32) NOT NULL DEFAULT 'ordered',
  `last_write_timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `vector_clock_states_entity_type_index` (`entity_type`),
  KEY `vector_clock_states_entity_id_index` (`entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `video_render_jobs`;
CREATE TABLE `video_render_jobs` (
  `id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'queued',
  `progress` int NOT NULL DEFAULT '0',
  `stage` varchar(255) NOT NULL DEFAULT 'Queued in Engine',
  `request_payload` json NOT NULL,
  `result_asset_id` char(36) DEFAULT NULL,
  `public_url` text,
  `thumbnail_url` text,
  `error_message` text,
  `retries` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `video_render_jobs_result_asset_id_foreign` (`result_asset_id`),
  KEY `idx_video_jobs_brand_status` (`brand_id`,`status`),
  KEY `idx_video_jobs_created_at` (`created_at`),
  CONSTRAINT `video_render_jobs_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `video_render_jobs_result_asset_id_foreign` FOREIGN KEY (`result_asset_id`) REFERENCES `media_assets` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `viral_score_predictions`;
CREATE TABLE `viral_score_predictions` (
  `id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `post_variant_id` char(36) NOT NULL,
  `overall_score` decimal(5,2) NOT NULL,
  `tier` varchar(50) NOT NULL,
  `hook_score` decimal(5,2) NOT NULL,
  `readability_score` decimal(5,2) NOT NULL,
  `media_synergy_score` decimal(5,2) NOT NULL,
  `hashtag_score` decimal(5,2) NOT NULL,
  `velocity_multiplier` decimal(5,2) NOT NULL DEFAULT '1.00',
  `recommendations` json NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_viral_pred_brand_id` (`brand_id`),
  KEY `idx_viral_pred_variant_id` (`post_variant_id`),
  CONSTRAINT `viral_score_predictions_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `viral_score_predictions_post_variant_id_foreign` FOREIGN KEY (`post_variant_id`) REFERENCES `post_variants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `voice_agents`;
CREATE TABLE `voice_agents` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `brand_id` varchar(36) NOT NULL,
  `name` varchar(128) NOT NULL,
  `voice_persona` varchar(64) NOT NULL DEFAULT 'Nova - Warm Concierge',
  `system_prompt` text NOT NULL,
  `language` varchar(16) NOT NULL DEFAULT 'en-US',
  `forwarding_phone` varchar(32) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `voice_agents_tenant_id_index` (`tenant_id`),
  KEY `voice_agents_brand_id_index` (`brand_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `voice_calls`;
CREATE TABLE `voice_calls` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `brand_id` varchar(36) NOT NULL,
  `contact_id` varchar(36) DEFAULT NULL,
  `agent_id` varchar(36) DEFAULT NULL,
  `direction` varchar(16) NOT NULL DEFAULT 'OUTBOUND',
  `caller_number` varchar(32) NOT NULL,
  `callee_number` varchar(32) NOT NULL,
  `duration_seconds` int NOT NULL DEFAULT '0',
  `status` varchar(32) NOT NULL DEFAULT 'COMPLETED',
  `outcome` varchar(64) NOT NULL DEFAULT 'INFORMATION_PROVIDED',
  `transcript` text,
  `ai_summary` text,
  `recording_url` varchar(512) DEFAULT NULL,
  `call_sid` varchar(64) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `voice_calls_call_sid_unique` (`call_sid`),
  KEY `voice_calls_tenant_id_index` (`tenant_id`),
  KEY `voice_calls_brand_id_index` (`brand_id`),
  KEY `voice_calls_contact_id_index` (`contact_id`),
  KEY `voice_calls_agent_id_index` (`agent_id`),
  KEY `voice_calls_callee_number_index` (`callee_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `whatsapp_accounts`;
CREATE TABLE `whatsapp_accounts` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `waba_id` varchar(100) NOT NULL,
  `phone_number_id` varchar(100) NOT NULL,
  `display_phone_number` varchar(50) NOT NULL,
  `verified_name` varchar(150) NOT NULL,
  `quality_rating` varchar(50) NOT NULL DEFAULT 'GREEN',
  `status` varchar(50) NOT NULL DEFAULT 'CONNECTED',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `whatsapp_accounts_tenant_id_foreign` (`tenant_id`),
  KEY `idx_wa_acc_brand_status` (`brand_id`,`status`),
  CONSTRAINT `whatsapp_accounts_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `whatsapp_accounts_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `whatsapp_campaigns`;
CREATE TABLE `whatsapp_campaigns` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `template_id` char(36) DEFAULT NULL,
  `template_name` varchar(100) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'DRAFT',
  `recipient_count` int NOT NULL DEFAULT '0',
  `sent_count` int NOT NULL DEFAULT '0',
  `delivered_count` int NOT NULL DEFAULT '0',
  `read_count` int NOT NULL DEFAULT '0',
  `failed_count` int NOT NULL DEFAULT '0',
  `sent_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `whatsapp_campaigns_tenant_id_foreign` (`tenant_id`),
  KEY `whatsapp_campaigns_template_id_foreign` (`template_id`),
  KEY `idx_wa_camp_brand_status` (`brand_id`,`status`),
  CONSTRAINT `whatsapp_campaigns_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `whatsapp_campaigns_template_id_foreign` FOREIGN KEY (`template_id`) REFERENCES `whatsapp_templates` (`id`) ON DELETE SET NULL,
  CONSTRAINT `whatsapp_campaigns_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `whatsapp_messages`;
CREATE TABLE `whatsapp_messages` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `contact_id` char(36) DEFAULT NULL,
  `phone_number` varchar(50) NOT NULL,
  `direction` varchar(20) NOT NULL,
  `message_type` varchar(50) NOT NULL DEFAULT 'text',
  `body` longtext NOT NULL,
  `template_name` varchar(100) DEFAULT NULL,
  `wam_id` varchar(255) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'SENT',
  `error_message` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `idempotency_key` varchar(255) DEFAULT NULL,
  `metadata` longtext,
  `retry_count` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `whatsapp_messages_tenant_id_foreign` (`tenant_id`),
  KEY `whatsapp_messages_contact_id_foreign` (`contact_id`),
  KEY `idx_wa_msg_phone` (`brand_id`,`phone_number`),
  KEY `idx_wa_msg_wam_id` (`wam_id`),
  KEY `idx_wa_msg_idempotency` (`idempotency_key`),
  CONSTRAINT `whatsapp_messages_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `whatsapp_messages_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `crm_contacts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `whatsapp_messages_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `whatsapp_templates`;
CREATE TABLE `whatsapp_templates` (
  `id` char(36) NOT NULL,
  `tenant_id` char(36) NOT NULL,
  `brand_id` char(36) NOT NULL,
  `waba_id` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL,
  `category` varchar(50) NOT NULL DEFAULT 'MARKETING',
  `language` varchar(10) NOT NULL DEFAULT 'en_US',
  `status` varchar(50) NOT NULL DEFAULT 'APPROVED',
  `header_type` varchar(50) NOT NULL DEFAULT 'NONE',
  `body_text` longtext NOT NULL,
  `footer_text` varchar(255) DEFAULT NULL,
  `buttons` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_wa_tpl_name_lang` (`brand_id`,`name`,`language`),
  KEY `whatsapp_templates_tenant_id_foreign` (`tenant_id`),
  CONSTRAINT `whatsapp_templates_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  CONSTRAINT `whatsapp_templates_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `workflow_step_executions`;
CREATE TABLE `workflow_step_executions` (
  `id` varchar(64) NOT NULL,
  `instance_id` varchar(64) NOT NULL,
  `step_index` int NOT NULL,
  `step_name` varchar(128) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'pending',
  `attempt_count` int NOT NULL DEFAULT '1',
  `duration_ms` int NOT NULL DEFAULT '0',
  `input_payload` json NOT NULL,
  `output_payload` json NOT NULL,
  `error_message` mediumtext,
  `started_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `workflow_step_executions_instance_id_index` (`instance_id`),
  KEY `workflow_step_executions_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `workspace_invites`;
CREATE TABLE `workspace_invites` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'editor',
  `token` varchar(255) NOT NULL,
  `invited_by_user_id` varchar(36) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workspace_invites_token_unique` (`token`),
  KEY `workspace_invites_invited_by_user_id_foreign` (`invited_by_user_id`),
  KEY `idx_workspace_invites_tenant_status` (`tenant_id`,`status`),
  KEY `idx_workspace_invites_email_status` (`email`,`status`),
  CONSTRAINT `workspace_invites_invited_by_user_id_foreign` FOREIGN KEY (`invited_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `workspace_invites_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `worm_daily_seals`;
CREATE TABLE `worm_daily_seals` (
  `id` varchar(36) NOT NULL,
  `seal_date` varchar(10) NOT NULL,
  `first_sequence` bigint unsigned NOT NULL,
  `last_sequence` bigint unsigned NOT NULL,
  `record_count` int NOT NULL,
  `merkle_root` varchar(64) NOT NULL,
  `chain_head_hash` varchar(64) NOT NULL,
  `previous_seal_hash` varchar(64) NOT NULL,
  `seal_hash` varchar(64) NOT NULL,
  `signature` varchar(128) NOT NULL,
  `signing_key_id` varchar(32) NOT NULL,
  `algorithm` varchar(16) NOT NULL DEFAULT 'Ed25519',
  `sealed_by` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_worm_seal_last_seq` (`last_sequence`),
  UNIQUE KEY `uq_worm_seal_hash` (`seal_hash`),
  KEY `worm_daily_seals_seal_date_index` (`seal_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `worm_legal_holds`;
CREATE TABLE `worm_legal_holds` (
  `id` varchar(36) NOT NULL,
  `tenant_id` varchar(36) DEFAULT NULL,
  `matter_reference` varchar(128) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `custodian_email` varchar(255) DEFAULT NULL,
  `status` enum('active','released') NOT NULL DEFAULT 'active',
  `placed_by` varchar(255) NOT NULL,
  `released_by` varchar(255) DEFAULT NULL,
  `release_reason` varchar(512) DEFAULT NULL,
  `released_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `worm_legal_holds_tenant_id_index` (`tenant_id`),
  KEY `worm_legal_holds_status_index` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `worm_vault_records`;
CREATE TABLE `worm_vault_records` (
  `id` varchar(36) NOT NULL,
  `sequence_number` bigint unsigned NOT NULL,
  `tenant_id` varchar(36) DEFAULT NULL,
  `source_table` varchar(64) NOT NULL,
  `source_record_id` varchar(64) NOT NULL,
  `event_action` varchar(128) NOT NULL,
  `actor_id` varchar(64) DEFAULT NULL,
  `actor_email` varchar(255) DEFAULT NULL,
  `payload_canonical` longtext NOT NULL,
  `payload_hash` varchar(64) NOT NULL,
  `previous_hash` varchar(64) NOT NULL,
  `chain_hash` varchar(64) NOT NULL,
  `source_created_at` timestamp NULL DEFAULT NULL,
  `retain_until` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_worm_sequence` (`sequence_number`),
  UNIQUE KEY `uq_worm_chain_hash` (`chain_hash`),
  UNIQUE KEY `uq_worm_source_record` (`source_table`,`source_record_id`),
  KEY `worm_vault_records_tenant_id_index` (`tenant_id`),
  KEY `idx_worm_source_cursor` (`source_table`,`source_created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `worm_verification_events`;
CREATE TABLE `worm_verification_events` (
  `id` varchar(36) NOT NULL,
  `token_id` varchar(36) DEFAULT NULL,
  `endpoint` varchar(128) NOT NULL,
  `result` enum('valid','invalid','denied') NOT NULL,
  `seal_id` varchar(36) DEFAULT NULL,
  `ip_address` varchar(64) DEFAULT NULL,
  `details` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `worm_verification_events_token_id_index` (`token_id`),
  KEY `worm_verification_events_created_at_index` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `worm_verification_tokens`;
