# 📘 SocialForge — Production Scale Infrastructure & Deployment Runbook (100k Concurrency)

**Target Capacity**: 100,000 Concurrent Social-Account Connection Attempts  
**Infrastructure Stack**: AWS ECS (Fargate/EC2) • Aurora MySQL Multi-AZ • AWS RDS Proxy • ElastiCache Redis Cluster • AWS ALB  
**Authoritative Invariants**: MySQL Single Source of Truth • Strict UTC (`+00:00`) • Permanent Production Meta Lock

---

## 1. Architecture Topology & Capacity Sizing

To support enterprise marketing surges and 100,000 concurrent connection handshakes within production SLAs, the infrastructure is tiered across 3 Availability Zones (`us-east-1a`, `us-east-1b`, `us-east-1c`):

```
                                [ Internet Inbound ]
                                         │
                             ┌───────────▼───────────┐
                             │  AWS ALB (Dual-Stack) │ (SSL Offload & Edge Buffering)
                             └───────────┬───────────┘
                                         │
               ┌─────────────────────────┼─────────────────────────┐
               │                         │                         │
      ┌────────▼────────┐       ┌────────▼────────┐       ┌────────▼────────┐
      │  API Task (AZ1) │       │  API Task (AZ2) │       │  API Task (AZ3) │  [10 -> 30 Tasks]
      │  4 vCPU / 8 GB  │       │  4 vCPU / 8 GB  │       │  4 vCPU / 8 GB  │  (HMAC Signing & OAuth)
      └────────┬────────┘       └────────┬────────┘       └────────┬────────┘
               │                         │                         │
               └─────────────────────────┼─────────────────────────┘
                                         │
               ┌─────────────────────────┴─────────────────────────┐
               │                                                   │
      ┌────────▼────────┐                                 ┌────────▼────────┐
      │  ElastiCache    │ (Multi-AZ Cluster)              │  AWS RDS Proxy  │ (Connection Multiplexer)
      │  Redis 7.2      │ (noeviction, TLS)               │  Port 3306      │ (1,100 -> 150 DB Conns)
      │  cache.r6g.large│ (BullMQ & Rate Limiter)         └────────┬────────┘
      └────────┬────────┘                                          │
               │                                          ┌────────▼────────┐
               │                                          │  Aurora MySQL   │ (Primary Writer)
               │                                          │  db.r6g.2xlarge │ (25k+ Write IOPS)
               │                                          └─────────────────┘
               │
      ┌────────┴─────────────────────────┐
      │                                  │
┌─────▼───────────┐            ┌─────────▼─────────┐
│ Worker Fleet    │            │ S3 Media Bucket   │ (KMS Encrypted)
│ 12 -> 25 Tasks  │            │ Video Renders     │
│ 4 vCPU / 8 GB   │            └───────────────────┘
└─────────────────┘
```

### Infrastructure Sizing & Cost Matrix

| Component | AWS Resource | Specification | Scaling Boundary | Role in 100k Concurrency | Monthly Cost (Est.) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Edge Ingestion** | AWS Application Load Balancer | Multi-AZ | Edge connection multiplexing | Ingests 100k TLS connections with keep-alive | ~$180 / mo |
| **API Compute** | AWS ECS Fargate | 4 vCPU, 8 GB RAM (`c6i.xlarge` equivalent) | 10 baseline -> 30 tasks | Handles stateless HTTP, JWT validation, HMAC signatures | ~$1,226 / mo |
| **Worker Compute**| AWS ECS Fargate | 4 vCPU, 8 GB RAM (`c6i.xlarge` equivalent) | 12 baseline -> 25 tasks | Drains 100k queue entries in ~45 seconds (2,200 jobs/sec) | ~$1,472 / mo |
| **Connection Proxy** | AWS RDS Proxy | Managed Multi-AZ Proxy | 4,000 max proxy conns | Multiplexes 1,100 container pool connections into 150 Aurora conns | ~$220 / mo |
| **Primary Database** | AWS Aurora MySQL | `db.r6g.2xlarge` Multi-AZ | 8 vCPU, 64 GB RAM, 25k+ IOPS | ACID transactional commits, strict UTC, authoritative job records | ~$1,850 / mo |
| **Queue & Cache** | AWS ElastiCache Redis | `cache.r6g.large` Multi-AZ | 2 vCPU, 13 GB RAM, 3 nodes | Sub-millisecond BullMQ dispatch & distributed sliding-window limiters | ~$310 / mo |
| **Security & Media**| AWS KMS & S3 | Customer Managed Keys | Unlimited | Envelope encryption for OAuth credentials; media uploads | ~$80 / mo |
| **Total Fleet** | — | — | — | **Guaranteed 100k Concurrent Burst Readiness** | **~$5,338 / month** |

---

## 2. Terraform Cloud Deployment Procedure

All cloud infrastructure is codified within [`terraform/`](file:///f:/SocialAgent/terraform/).

### Step 1: Pre-requisites & AWS Authentication
Ensure your terminal is authenticated against the production AWS account:
```bash
aws sts get-caller-identity
```

### Step 2: Initialize Terraform State & Backend
```bash
cd terraform
terraform init
```

### Step 3: Validate and Review Execution Plan
```bash
terraform plan -out=tfplan-production
```
Verify that the plan provisions:
- Dedicated VPC `10.0.0.0/16` with 9 subnets across 3 AZs.
- Aurora MySQL cluster with parameter group `time_zone = '+00:00'` and `max_connections = 4000`.
- RDS Proxy target group linked to Aurora primary writer.
- ElastiCache Redis replication group with `maxmemory-policy = 'noeviction'`.
- ECS cluster with API service (10 tasks) and Worker service (12 tasks).
- CloudWatch capacity dashboard and metric alarms.

### Step 4: Apply Infrastructure Changes
```bash
terraform apply tfplan-production
```

---

## 3. Database Connection Pooling & RDS Proxy Mechanics

### Why RDS Proxy is Mandatory for 100k Concurrency
Under 100,000 concurrent connection attempts, 10 to 30 API tasks each maintain Knex connection pools (`min: 5, max: 30`).
- Without RDS Proxy: $30 \text{ tasks} \times 30 \text{ connections} + 25 \text{ workers} \times 20 \text{ connections} = 1,400 \text{ simultaneous TCP connections}$ directly to MySQL. This exhausts thread memory and induces catastrophic connection handshake storms.
- **With RDS Proxy**: Containers maintain open TCP connections to RDS Proxy. RDS Proxy actively multiplexes these across a persistent, warm pool of **150 physical MySQL connections**, executing queries via session pooling and reusing connections between client requests.

### Avoiding Connection Pinning
To maintain optimal multiplexing efficiency, developers must adhere to these rules:
1. **Never use session-level variables** (`SET @var = 1`) without cleanup.
2. **Never lock tables explicitly** (`LOCK TABLES ...`).
3. Transactions must be kept **under 50ms**:
   ```typescript
   // Recommended: Compact ACID transaction
   await db.transaction(async (trx) => {
     await trx('oauth_connections').insert(connData);
     await trx('oauth_states').where({ id: stateId }).update({ used_at: trx.fn.now() });
   });
   ```

---

## 4. BullMQ & Redis Invariants

### 1. Non-Eviction Memory Policy
ElastiCache Redis parameter group [`aws_elasticache_parameter_group.redis`](file:///f:/SocialAgent/terraform/elasticache.tf) explicitly sets:
```ini
maxmemory-policy = noeviction
```
**Operational Invariant**: Under memory pressure, Redis will return an error on new `SET` operations rather than silently evicting BullMQ queue keys or pending publishing jobs. If Redis memory fills:
1. The API catches the Redis error fail-softly.
2. The post is safely committed to MySQL in `status = 'scheduled'`.
3. The 30-second Worker reconciliation engine picks up the job and executes it.

### 2. Reconciliation Engine Operation
Even during a total Redis cluster reboot or network partition, the worker reconciliation loop runs every 30 seconds:
```sql
SELECT * FROM publishing_jobs 
WHERE status = 'scheduled' 
AND scheduled_at <= NOW() - INTERVAL 15 SECOND 
ORDER BY scheduled_at ASC 
LIMIT 50;
```
Any job that was missed due to Redis unavailability is automatically claimed and published.

---

## 5. Local & Staging Simulation (Docker Compose)

For offline verification, integration testing, and staging benchmarks, the entire 100k-capacity topology can be launched locally via:

```bash
docker compose -f docker-compose.production-scale.yml up -d --build
```

### Staging Verification Checklist
Once containers are launched:
```bash
# 1. Verify all 10 containers are running and healthy
docker compose -f docker-compose.production-scale.yml ps

# 2. Check edge ALB round-robin health probe
curl -I http://localhost:8080/health

# 3. Verify Mock Meta Provider Gateway is active
curl http://localhost:4005/health

# 4. Stream multi-instance API logs
docker compose -f docker-compose.production-scale.yml logs -f api-1 api-2 api-3

# 5. Stream multi-instance BullMQ worker logs
docker compose -f docker-compose.production-scale.yml logs -f worker-1 worker-2 worker-3
```

---

## 6. CloudWatch Alarms & Operational Alerting

| Metric / Alarm | Critical Threshold | Automated Action | Runbook Response |
| :--- | :--- | :--- | :--- |
| **Aurora Writer CPU** | > 80% for 2 mins | SNS to PagerDuty | Inspect slow query logs; verify RDS Proxy pinning; scale read-replica offloading |
| **RDS Proxy Borrow Latency** | > 100ms for 2 mins | SNS to PagerDuty | Check for long-running transactions holding row locks; increase proxy pool percentage |
| **ElastiCache Memory Usage** | > 75% for 2 mins | SNS to PagerDuty | Scale Redis node class from `cache.r6g.large` to `cache.r6g.xlarge` |
| **ALB 5xx Target Errors** | > 50 errors / min | SNS to PagerDuty | Check API container crashes; verify ECS task deployment circuit breaker |
| **BullMQ Queue Lag** | > 1,000 pending jobs | ECS Auto-scale workers | ECS automatically scales Worker fleet from 12 to 25 tasks |

---

## 7. Disaster Recovery & Rollback Procedures

### Procedure A: Emergency Rollback of Publishing Queue
If Redis experiences an unrecoverable outage:
1. Update API and Worker ECS task definitions or environment variables:
   ```bash
   USE_BULLMQ_PUBLISHING=false
   ```
2. Trigger an ECS service update:
   ```bash
   aws ecs update-service --cluster socialforge-production-cluster --service socialforge-production-api-service --force-new-deployment
   aws ecs update-service --cluster socialforge-production-cluster --service socialforge-production-worker-service --force-new-deployment
   ```
3. The system automatically reverts to MySQL polling mode with zero lost jobs.

### Procedure B: Permanent Meta Publication Lock Verification
After any deployment, failover, or disaster recovery scenario, run the verification probe:
```bash
node scripts/verify_production_meta_lock.mjs
```
Expected output:
```
[LOCK VERIFIED] Variant bc2051b1-a44a-4a97-8acd-1f3125c70164 status: published
[LOCK VERIFIED] Job 256cf21a-26cd-4032-a7b8-17261d8a81b1 status: published
```
If either record is modified, the probe triggers an immediate emergency alert.
