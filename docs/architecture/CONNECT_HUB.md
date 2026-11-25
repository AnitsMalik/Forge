# Connect Hub Architecture & Specification (Stage 1)

Source of Truth: **SocialForge Final HLD v3.0**

---

## 1. Executive Summary & Objective

Connect Hub provides a provider-neutral, secure connection architecture allowing business users to link third-party external services (cloud drives, spreadsheets, social networks, and ecommerce stores) without manually handling tokens, client IDs, or API secrets.

### Core Architectural Guarantees
1. **Zero Credential Exposure**: Provider credentials (access tokens, refresh tokens, client secrets) are envelope-encrypted at rest using AES-256-GCM. Raw credentials are **never returned from APIs**, **never sent to the frontend**, and **never exposed to AI agents**.
2. **Strict Multi-Tenant Boundary**: All operations enforce strict tenant scoping (`WHERE tenant_id = req.user.tenantId`). Any cross-tenant access attempt returns HTTP 404.
3. **Canonical 7-State Lifecycle Engine**: Standardized status progression across all external providers.
4. **Provider-Neutral Connector Contract**: All connectors implement a uniform 10-method interface.
5. **Full Lifecycle Auditability**: Every state change, authorization event, and health check is permanently logged in `connection_events`.

---

## 2. Data Model & Database Schema

### 2.1 `social_connections`
Stores high-level connection metadata, provider identifier, ownership, and health status.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PK | Unique connection ID |
| `tenant_id` | UUID | FK -> `tenants.id`, NOT NULL | Multi-tenant isolation boundary |
| `brand_id` | UUID | FK -> `brands.id`, NULLABLE | Associated brand (null for workspace-level) |
| `provider` | VARCHAR(64) | NOT NULL, INDEX | Provider slug (e.g. `google-drive`, `linkedin`) |
| `status` | VARCHAR(32) | NOT NULL, INDEX | One of 7 canonical connection states |
| `provider_account_metadata` | JSON | NULLABLE | Non-sensitive profile metadata (email, display name) |
| `scopes` | JSON | NULLABLE | Granted OAuth scopes |
| `credential_reference` | VARCHAR(255) | NULLABLE, INDEX | Reference key (`cred_<uuid>`) into credential vault |
| `expires_at` | TIMESTAMP | NULLABLE | Token expiration timestamp |
| `last_health_check_at` | TIMESTAMP | NULLABLE | Timestamp of most recent health probe |
| `last_error` | TEXT | NULLABLE | Sanitized error message from last failed operation |
| `created_at` | TIMESTAMP | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Last update timestamp |

### 2.2 `connection_credentials`
Dedicated vault table for cryptographic envelope storage.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | VARCHAR(64) | PK | Credential reference token (`cred_<uuid>`) |
| `tenant_id` | UUID | FK -> `tenants.id`, NOT NULL | Tenant boundary enforcement |
| `connection_id` | UUID | FK -> `social_connections.id`, NOT NULL | Associated connection |
| `encrypted_data` | LONGTEXT | NOT NULL | AES-256-GCM ciphertext |
| `iv` | VARCHAR(64) | NOT NULL | 16-byte initialization vector (hex) |
| `auth_tag` | VARCHAR(64) | NOT NULL | 16-byte GCM authentication tag (hex) |
| `algorithm` | VARCHAR(32) | NOT NULL | Default `aes-256-gcm` |
| `key_version` | INT | NOT NULL | Master key rotation version (default 1) |
| `created_at` | TIMESTAMP | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Last update timestamp |

---

## 3. Secure Credential Storage & Cryptographic Vault

- **Algorithm**: `AES-256-GCM` authenticated symmetric encryption.
- **Key Resolution**: Derived from 256-bit environment secret (`ENCRYPTION_MASTER_KEY`).
- **Decoupled Vault**: Credentials are never stored in the same row or table as public connection metadata. `social_connections` stores only an opaque reference string `credential_reference: cred_<uuid>`.
- **API Redaction**: All API responses pass through `credentialVaultService.maskCredentials()`, masking access tokens to `••••••••••••••••<suffix>` and redacting client secrets to `••••••••`.
- **AI Safety**: Prompts sent to LLMs or AI agents never receive credential references, tokens, or raw secrets.

---

## 4. Connection State Machine

Connect Hub implements a 7-state canonical state machine:

```
              ┌─────────────────┐
              │    CHECKING     │◄─────────────┐
              └────────┬────────┘              │
                       │                       │
                       ▼                       │
    ┌───────────► CONNECTED ────────────┐      │
    │                  │                │      │
    │                  ▼                ▼      │
    │           NEEDS_ATTENTION    RATE_LIMITED│
    │                  │                │      │
    │                  ▼                │      │
    │           REAUTH_REQUIRED         │      │
    │                  │                │      │
    │                  ▼                │      │
    │         PERMISSION_MISSING        │      │
    │                  │                │      │
    │                  ▼                ▼      │
    │            DISCONNECTED ─────────────────┘
    └──────────────────┘
```

### States
1. **`CONNECTED`**: Credentials active, health probe passed, resources accessible.
2. **`CHECKING`**: Verification or re-authorization handoff in progress.
3. **`NEEDS_ATTENTION`**: Degraded performance, impending expiration (within 7 days), or partial failure.
4. **`REAUTH_REQUIRED`**: OAuth token expired or revoked by user at provider.
5. **`PERMISSION_MISSING`**: Required scopes missing or revoked.
6. **`RATE_LIMITED`**: Provider API quota exceeded; throttled.
7. **`DISCONNECTED`**: Intentionally disconnected by user; access revoked.

---

## 5. Provider-Neutral Connector Interface

Every connector class implements the 10-method contract defined in `apps/api/src/connectors/core/Connector.ts`:

1. `getAuthorizationUrl(params)`: Generates provider OAuth 2.0 authorization URL with state, redirect URI, and scopes.
2. `handleCallback(params)`: Exchanges authorization code for access/refresh tokens and account identity.
3. `refreshCredential(params)`: Refreshes access tokens using stored refresh tokens.
4. `testConnection(params)`: Probes connectivity and verifies token validity.
5. `discoverResources(params)`: Discovers external assets (folders, sheets, accounts, pages).
6. `fetch(params)`: Executes server-side HTTP request resolving vault credentials.
7. `normalize(params)`: Transforms provider payloads into canonical SocialForge schemas.
8. `subscribe(params)`: Registers real-time webhooks or event subscriptions.
9. `healthCheck(params)`: Performs latency and health probes.
10. `disconnect(params)`: Revokes remote provider token and cleans up sessions.

---

## 6. Connect Hub Backend REST API

Base Route: `/api/connections` (Requires Bearer JWT with tenant context)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/connections` | List all connections for the active workspace (`?brandId`, `?status`, `?provider`) |
| `GET` | `/api/connections/registered` | List registered connectors and supported capabilities |
| `GET` | `/api/connections/health-summary` | Aggregated workspace connection health summary |
| `GET` | `/api/connections/:id` | Get connection detail (masked credentials only) |
| `POST` | `/api/connections/auth-url` | Generate OAuth authorization URL |
| `POST` | `/api/connections/callback` | Exchange OAuth code and create connection |
| `POST` | `/api/connections/:id/test` | Test active connection connectivity |
| `POST` | `/api/connections/:id/health` | Run on-demand active health probe |
| `POST` | `/api/connections/:id/reconnect` | Re-authenticate or refresh connection |
| `POST` | `/api/connections/:id/disconnect` | Disconnect and revoke connection |
| `DELETE` | `/api/connections/:id` | Remove connection and vault credentials |
| `GET` | `/api/connections/:id/resources` | List discovered resources for connection |
| `POST` | `/api/connections/:id/discover` | Discover and synchronize remote resources |
| `POST` | `/api/connections/:id/resources/select` | Toggle selected resources for content studio |

---

## 7. Migration & Rollback Runbook

### Migration File
- `apps/api/src/db/migrations/20261009000027_upgrade_social_connections_connect_hub.ts`
- Mirrored in: `packages/database/migrations/20261009000027_upgrade_social_connections_connect_hub.ts`

### Execute Migration
```bash
npm run db:migrate --workspace=apps/api
```

### Rollback Migration
```bash
npm run db:rollback --workspace=apps/api
```

### Automated Verification
```bash
node scripts/test_connect_hub_stage1.mjs
```
Expected result: **78 tests passing, 0 failures**.
