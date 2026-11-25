# SocialForge — System Architecture & Topology

## 1. Architectural Pattern: Modular Monorepo

SocialForge utilizes a modular monorepo pattern partitioned into specialized applications and shared packages:

```
f:/SocialAgent/
├── packages/
│   └── shared/         # Universal TypeScript types, Zod schemas, validation contracts
├── apps/
│   ├── api/            # Express.js REST API service (stateless, horizontally scalable)
│   ├── worker/         # BullMQ queue worker service (CPU/IO-intensive processing)
│   └── web/            # React + Vite client-side single page application
└── docker-compose.yml  # Unified multi-container environment
```

### Why Modular Monorepo?
1. **Zero Type Drift**: The frontend, backend API, and worker processors share the exact same TypeScript domain interfaces and Zod validation schemas.
2. **Unified Versioning**: Database migration contracts and shared constants (platform limits, role names, queue keys) are synchronized across git commits.
3. **Decoupled Scaling**: The API container handles low-latency HTTP requests, while the worker container is dedicated to long-running CPU workloads (video rendering, image synthesis, OpenAI streaming).

---

## 2. Infrastructure & Container Topology

```mermaid
graph TB
    subgraph "Public Internet"
        UserBrowser["User Web Browser\n(Admin / Creator)"]
        ClientBrowser["Client Web Browser\n(Magic Link Reviewer)"]
    end

    subgraph "Docker Compose Infrastructure Network (socialforge-net)"
        subgraph "Frontend Container"
            ViteWeb["apps/web\n(React + TypeScript SPA)\nPort: 5173"]
        end

        subgraph "Backend API Container"
            ExpressAPI["apps/api\n(Node.js + Express)\nPort: 4000"]
        end

        subgraph "Asynchronous Worker Container"
            BullWorker["apps/worker\n(BullMQ Worker Pool)\nFFmpeg + Satori/Sharp"]
        end

        subgraph "Data & Queue Services"
            MySQLDB[("MySQL 9.x / 8.4\nDatabase: socialforge_db\nPort: 3308 / 3306")]
            RedisCache[("Redis 7.2\nBroker & Cache\nPort: 6379")]
            MinIOStore[("MinIO (S3 Compatible)\nBuckets: socialforge-media\nPort: 9000 / 9001")]
        end
    end

    subgraph "External Cloud APIs"
        OpenAIAPI["OpenAI API\n(GPT-4o)"]
        MetaAPI["Meta Graph API\n(IG & FB)"]
        TwitterAPI["X / Twitter API v2"]
        LinkedInAPI["LinkedIn Marketing API"]
    end

    UserBrowser -->|HTTP :5173| ViteWeb
    ClientBrowser -->|HTTP :5173| ViteWeb
    ViteWeb -->|REST API :4000| ExpressAPI
    ViteWeb -->|Direct Upload Presigned URL| MinIOStore

    ExpressAPI -->|SQL Queries| MySQLDB
    ExpressAPI -->|Enqueue Jobs & Cache| RedisCache
    ExpressAPI -->|Presigned URL Signing| MinIOStore

    BullWorker -->|Consume Jobs| RedisCache
    BullWorker -->|Read/Write Records| MySQLDB
    BullWorker -->|Store Rendered Media| MinIOStore
    BullWorker -->|AI Prompt Calls| OpenAIAPI
    BullWorker -->|Publish Content| MetaAPI
    BullWorker -->|Publish Content| TwitterAPI
    BullWorker -->|Publish Content| LinkedInAPI
```

---

## 3. Data Flow Lifecycles

### 3.1 Content Generation & Adaptation Flow

```mermaid
sequenceDiagram
    autonumber
    actor Creator as Creator / Copywriter
    participant Web as React Web App
    participant API as Express API
    participant DB as PostgreSQL
    participant Redis as Redis / BullMQ
    participant Worker as Background Worker
    participant OpenAI as OpenAI API

    Creator->>Web: Enters seed topic, selects brand & target platforms
    Web->>API: POST /api/v1/brands/:brandId/ai/generate
    API->>DB: Fetch Brand Kit (Tone, Colors, Taboo list, Disclaimers)
    API->>Redis: Enqueue job on 'queue:content-ai'
    API-->>Web: 202 Accepted (jobId)
    
    Worker->>Redis: Pops 'queue:content-ai' job
    Worker->>OpenAI: Sends structured prompt + Brand Kit constraints
    OpenAI-->>Worker: Returns JSON multi-platform post variations
    Worker->>DB: Persists Post & PostVariants (status: 'draft')
    Worker->>Redis: Marks job complete with results
    
    Web->>API: Polls GET /api/v1/jobs/:jobId (or WebSocket event)
    API-->>Web: Returns completed Post with platform variants
```

---

### 3.2 Dynamic Template Image Rendering Flow

```mermaid
sequenceDiagram
    autonumber
    actor Creator as Creator
    participant Web as React Web App
    participant API as Express API
    participant Worker as Worker (Satori/Sharp)
    participant S3 as MinIO / S3 Storage
    participant DB as PostgreSQL

    Creator->>Web: Selects template "Quote Card", edits text, clicks "Render Graphic"
    Web->>API: POST /api/v1/brands/:brandId/templates/render
    API->>Worker: Enqueue job on 'queue:render-image'
    Worker->>DB: Fetch Brand Kit fonts, logo SVG, palette hex values
    Worker->>Worker: Satori compiles JSX/HTML to SVG with brand fonts
    Worker->>Worker: Sharp converts SVG to high-res PNG / WebP
    Worker->>S3: Uploads rendered image to /brands/:id/images/:uuid.png
    Worker->>DB: Inserts MediaAsset record (storage_key, mime_type, dimensions)
    Worker-->>API: Job complete (mediaAssetId, publicUrl)
    API-->>Web: Returns rendered image preview URL
```

---

### 3.3 Scheduling & Resilient Dispatch Flow

```mermaid
sequenceDiagram
    autonumber
    actor Mgr as Brand Manager
    participant Web as React Web App
    participant API as Express API
    participant DB as PostgreSQL
    participant Redis as Redis / BullMQ
    participant Worker as Worker Dispatcher
    participant Social as Social Platform (or Mock)

    Mgr->>Web: Schedules approved post for 2026-10-01 14:00:00 (EDT)
    Web->>API: POST /api/v1/posts/:id/schedule
    API->>API: Converts EDT to UTC timestamp
    API->>DB: Updates post status to 'scheduled'
    API->>Redis: Enqueues delayed job on 'queue:publish-dispatcher' (delay = targetUtc - nowUtc)
    
    Note over Redis,Worker: Delay elapses at scheduled UTC timestamp
    
    Worker->>Redis: Pops ready job
    Worker->>DB: Acquires advisory lock & checks post status is still 'approved'/'scheduled'
    Worker->>DB: Updates status to 'publishing'
    Worker->>Social: Calls platform adapter: publish(content, media)
    
    alt Publishing Succeeded
        Social-->>Worker: HTTP 200 OK (remote_id, remote_url)
        Worker->>DB: Updates PostVariant status to 'published', inserts publish_logs
    else Transient Error (HTTP 429 / 5xx)
        Social-->>Worker: HTTP 429 Rate Limit
        Worker->>Redis: Retries with exponential backoff (attempt 1 of 3)
    else Permanent Failure (Auth Revoked / Invalid Payload)
        Social-->>Worker: HTTP 401 Unauthorized
        Worker->>DB: Updates status to 'failed', records error payload in publish_logs
    end
```

---

## 4. Multi-Tenant Data Isolation Strategy

1. **Row-Level Tenancy with Tenant Context Middleware**:
   - Every database query in `apps/api` executes through a tenant-scoping middleware.
   - The verified JWT token contains `tenantId` and authorized `brandIds`.
   - All critical domain tables (`brands`, `posts`, `media_assets`) have non-nullable `tenant_id` foreign keys indexed alongside primary keys (`tenant_id, id`).
2. **Database Queries Enforcement**:
   ```sql
   -- Standard tenant-scoped query pattern
   SELECT * FROM posts 
   WHERE id = $1 AND tenant_id = $2;
   ```
3. **Storage Isolation**:
   - Assets in S3/MinIO are strictly partitioned by path:
     `s3://socialforge-media/{tenant_id}/{brand_id}/{asset_type}/{year}/{month}/{file_uuid}.{ext}`
   - Presigned upload and download URLs are signed server-side only after verifying tenant ownership.

---

## 5. Storage Architecture (S3 / MinIO)

### Bucket Structure
```
socialforge-media/
├── {tenant_id}/
│   ├── {brand_id}/
│   │   ├── logos/              # Persistent Brand Kit vector/raster logos
│   │   ├── raw/                # User uploaded source images/videos
│   │   ├── rendered-images/    # Automated Satori/Sharp output images
│   │   ├── rendered-videos/    # Automated FFmpeg output 9:16 MP4s
│   │   └── thumbnails/         # Scaled down preview images (400x400)
```

### Direct Upload Lifecycle:
1. Web client initiates upload by sending file metadata (`file_name`, `mime_type`, `file_size_bytes`) to `POST /api/v1/brands/:id/media/presigned-url`.
2. API validates file type and quota, generates a UUID-based S3 key, and issues a 15-minute presigned PUT URL.
3. Web client directly PUTs the binary stream to MinIO/S3.
4. Web client notifies API `POST /api/v1/brands/:id/media/confirm-upload` to register the database record and trigger worker thumbnail generation.

---

## 6. Queue & Worker Architecture (BullMQ)

```mermaid
graph LR
    subgraph BullMQ Queue Namespaces
        Q1["queue:content-ai\n(Concurrency: 5, Rate-limit: 20/min)"]
        Q2["queue:render-image\n(Concurrency: 8, CPU-bound)"]
        Q3["queue:render-video\n(Concurrency: 2, Heavy FFmpeg)"]
        Q4["queue:publish-dispatcher\n(Delayed jobs, Exact firing)"]
        Q5["queue:analytics-sync\n(Cron: Every 6 hours)"]
    end

    RedisBroker[("Redis 7.2 Broker")]
    RedisBroker --> Q1
    RedisBroker --> Q2
    RedisBroker --> Q3
    RedisBroker --> Q4
    RedisBroker --> Q5
```

- **Backoff Strategy**: Failed publishing jobs use exponential backoff (`attempts: 3`, `backoff: { type: 'exponential', delay: 10000 }`).
- **Dead Letter Handling**: Permanently failed jobs are moved to BullMQ's failed set and logged with stack traces in the PostgreSQL `publish_logs` table.
