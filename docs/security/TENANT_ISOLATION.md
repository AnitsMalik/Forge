# Multi-Tenant Isolation Architecture

## Overview
Every data operation within SocialForge is strictly partitioned across tenants (`tenant_id`) and workspaces (`workspace_id`).

## Isolation Guarantees
1. **Database Row-Level Scoping**: Knex queries enforce mandatory `WHERE tenant_id = ?` filters injected by authenticated request context.
2. **Media Storage Partitioning**: Object storage directories are keyed by `/tenants/:tenant_id/brands/:brand_id/`.
3. **Queue Job Scoping**: All BullMQ jobs carry tenant identification tokens; processors validate context before performing work.
4. **Cross-Tenant Prevention**: Automated integration test suites continuously verify that cross-tenant access attempts return HTTP 403 / 404.
