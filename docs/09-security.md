# SocialForge — Security, Compliance & Data Governance

## 1. Threat Modeling & Core Defense Vectors

| Threat Vector | Risk Level | Primary Defense Mechanism |
| :--- | :--- | :--- |
| **Cross-Tenant Data Leakage** | Critical | Middleware-enforced `tenant_id` validation on every query; composite foreign keys; automated isolation tests. |
| **Social OAuth Token Exposure** | Critical | AES-256-GCM column encryption at rest; tokens never returned in API responses; restricted DB permissions. |
| **Magic Link Abuse / Replay** | High | Cryptographically random tokens (256-bit entropy); 72-hour hard expiry; IP rate limiting; invalidation upon status change. |
| **Malicious Media File Uploads** | High | Presigned URL size constraints; MIME-type verification; file magic byte inspection; S3 bucket isolation without public execute permissions. |
| **Brute Force Authentication** | Medium | Rate limiting on `/api/v1/auth/*` via Redis sliding window counter; Argon2 password hashing. |
| **SSRF via User-Provided URLs** | Medium | Validation and DNS rebinding protection for custom logo/font URLs; blocking internal network IP ranges (e.g. `127.0.0.1`, `10.0.0.0/8`, `169.254.169.254`). |

---

## 2. Multi-Tenant Isolation Verification Pattern

To guarantee that tenant boundaries cannot be breached, all service layer operations follow strict tenancy scoping:

```typescript
// Enforced Query Scoping Pattern
export async function getBrandPost(
  tenantId: string,
  brandId: string,
  postId: string
): Promise<Post> {
  const post = await db('posts')
    .where({ id: postId, brand_id: brandId, tenant_id: tenantId })
    .first();

  if (!post) {
    // Return 404 rather than 403 to avoid disclosing resource existence across tenants
    throw new NotFoundError('Post not found');
  }

  return post;
}
```

---

## 3. Cryptographic Token Vault (AES-256-GCM)

Social tokens are never stored as plaintext strings in PostgreSQL:

```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

export function encryptSecret(plainText: string, masterKeyHex: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(masterKeyHex, 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptSecret(cipherString: string, masterKeyHex: string): string {
  const [ivHex, authTagHex, encryptedText] = cipherString.split(':');
  const key = Buffer.from(masterKeyHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

---

## 4. Magic Link Security Specification

1. **Token Generation**: High-entropy 32-byte cryptographically secure random string (`crypto.randomBytes(32).toString('hex')`).
2. **Scope Limitation**: The magic link grants strictly read access to the specific post and the ability to submit approval comments. It grants zero access to agency billing, other brands, or platform settings.
3. **Expiration & Invalidation**:
   - Fixed lifetime: 72 hours from creation.
   - Automatically revoked immediately upon post status transitioning to `approved` or `rejected`.
4. **Rate Limiting**: IP rate limited to 20 requests per minute on `/api/v1/approvals/magic/:token`.

---

## 5. Security Checklist

- [ ] **Data at Rest**: PostgreSQL disk encryption enabled; AES-256-GCM encryption for all social tokens.
- [ ] **Data in Transit**: HTTPS / TLS 1.3 enforced for all external API endpoints; strict CORS origins configured.
- [ ] **Authentication**: Passwords hashed with Argon2id (memory cost 64MB, time cost 3); JWT secrets rotated regularly.
- [ ] **Dependency Hygiene**: Regular `npm audit` scanning in CI/CD pipeline.
- [ ] **API Security Headers**: Helmet middleware enabled (Content-Security-Policy, X-Frame-Options: DENY, HSTS).
- [ ] **Input Sanitization**: All incoming request bodies validated with strict Zod schemas rejecting unknown fields.
- [ ] **Audit Logging**: All publishing attempts, state transitions, and user permission changes recorded in immutable log tables.
