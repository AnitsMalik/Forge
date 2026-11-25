# SocialForge — Deployment & Infrastructure Specification

## 1. Container Topology & Docker Compose Strategy

The SocialForge deployment architecture is containerized across 6 dedicated services orchestrated via Docker Compose:

```
[Docker Compose: socialforge-net]
├── postgres:16-alpine      (Port: 5432, Volume: pgdata)
├── redis:7.2-alpine        (Port: 6379, Volume: redisdata)
├── minio/minio             (Port: 9000 API, 9001 Web Console, Volume: miniodata)
├── apps/api                (Port: 4000, Node.js Express API)
├── apps/worker             (Headless BullMQ Worker + FFmpeg runtime)
└── apps/web                (Port: 5173, Vite/Nginx Frontend SPA)
```

---

## 2. Docker Compose Specification Reference

```yaml
version: '3.8'

networks:
  socialforge-net:
    driver: bridge

volumes:
  pgdata:
  redisdata:
  miniodata:

services:
  postgres:
    image: postgres:16-alpine
    container_name: socialforge-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: socialforge_db
      POSTGRES_USER: socialforge_user
      POSTGRES_PASSWORD: socialforge_secure_password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - socialforge-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U socialforge_user -d socialforge_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7.2-alpine
    container_name: socialforge-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    networks:
      - socialforge-net
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    container_name: socialforge-minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio_admin
      MINIO_ROOT_PASSWORD: minio_secure_password
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - miniodata:/data
    networks:
      - socialforge-net

  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    container_name: socialforge-api
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      NODE_ENV: development
      PORT: 4000
      DATABASE_URL: postgres://socialforge_user:socialforge_secure_password@postgres:5432/socialforge_db
      REDIS_URL: redis://redis:6379
      S3_ENDPOINT: http://minio:9000
      S3_BUCKET: socialforge-media
      S3_ACCESS_KEY: minio_admin
      S3_SECRET_KEY: minio_secure_password
      JWT_SECRET: super_jwt_secret_dev_key_32_bytes_long!
      ENCRYPTION_MASTER_KEY: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - socialforge-net

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    container_name: socialforge-worker
    restart: unless-stopped
    environment:
      NODE_ENV: development
      DATABASE_URL: postgres://socialforge_user:socialforge_secure_password@postgres:5432/socialforge_db
      REDIS_URL: redis://redis:6379
      S3_ENDPOINT: http://minio:9000
      S3_BUCKET: socialforge-media
      S3_ACCESS_KEY: minio_admin
      S3_SECRET_KEY: minio_secure_password
      ENCRYPTION_MASTER_KEY: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - socialforge-net

  web:
    build:
      context: .
      dockerfile: Dockerfile.web
    container_name: socialforge-web
    restart: unless-stopped
    ports:
      - "5173:5173"
    environment:
      VITE_API_BASE_URL: http://localhost:4000/api/v1
    depends_on:
      - api
    networks:
      - socialforge-net
```

---

## 3. Environment Variables Matrix

| Variable | Description | Required In |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `apps/api`, `apps/worker` |
| `REDIS_URL` | Redis broker connection URL | `apps/api`, `apps/worker` |
| `JWT_SECRET` | 256-bit secret for signing user tokens | `apps/api` |
| `ENCRYPTION_MASTER_KEY` | 64-char hex key for AES-256-GCM token encryption | `apps/api`, `apps/worker` |
| `S3_ENDPOINT` | URL of S3 / MinIO storage service | `apps/api`, `apps/worker` |
| `S3_BUCKET` | Main media bucket name (`socialforge-media`) | `apps/api`, `apps/worker` |
| `S3_ACCESS_KEY` | S3 Access Key ID | `apps/api`, `apps/worker` |
| `S3_SECRET_KEY` | S3 Secret Access Key | `apps/api`, `apps/worker` |
| `OPENAI_API_KEY` | OpenAI API key for copy generation | `apps/worker` |
| `VITE_API_BASE_URL` | Public HTTP URL to the Express API | `apps/web` |

---

## 4. Production Deployment Checklist

- [ ] **Database Connection Pooling**: Configure PgBouncer or Knex/Kysely connection pool ceiling ($\le 20$ connections per API instance).
- [ ] **Redis Persistence**: Enable Redis AOF (Append Only File) with `appendfsync everysec` for durable queue recovery.
- [ ] **S3 CORS Configuration**: Configure S3/MinIO bucket CORS policy to permit direct PUT requests from the frontend domain.
- [ ] **Secret Management**: Never commit `.env` files; inject secrets via HashiCorp Vault, AWS Secrets Manager, or Doppler.
- [ ] **Health Check Endpoints**: Implement `/health/liveness` and `/health/readiness` checking DB ping and Redis ping.
- [ ] **Reverse Proxy / SSL**: Deploy Cloudflare / Traefik / Nginx terminating TLS 1.3 with automatic Let's Encrypt certificate renewal.
