# SocialForge — Comprehensive Testing Strategy

## 1. Testing Pyramid & Verification Framework

SocialForge implements a four-tiered testing hierarchy using Vitest, Supertest, and Playwright:

```
        / \
       /   \     E2E Acceptance Tests (Playwright)
      /     \    - Magic link approval flow
     /───────\   - Composer creation to calendar schedule
    /         \
   /           \  Integration & API Tests (Supertest + Real Postgres/Redis)
  /             \ - Tenant isolation verification
 /───────────────\- BullMQ queue dispatch & worker processing
/                 \
/───────────────────\ Unit Tests (Vitest)
                      - Zod schema validations, prompt context assembly
                      - Satori template layout math, AES-256 cipher functions
```

---

## 2. Multi-Tenant Isolation Test Suite

A mandatory automated test verifies that Tenant B cannot read or modify Tenant A's records:

```typescript
describe('Multi-Tenant Isolation Enforcement', () => {
  it('should prevent Tenant B from accessing posts created by Tenant A', async () => {
    // Setup Tenant A and Post A
    const tenantA = await createTestTenant('Agency Alpha');
    const brandA = await createTestBrand(tenantA.id, 'Brand Alpha');
    const postA = await createTestPost(tenantA.id, brandA.id, 'Alpha Secret Post');

    // Setup Tenant B
    const tenantB = await createTestTenant('Agency Beta');
    const tokenB = generateTestJWT({ tenantId: tenantB.id, userId: 'user-b' });

    // Attempt to access Post A using Tenant B credentials
    const response = await supertest(app)
      .get(`/api/v1/brands/${brandA.id}/posts/${postA.id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    // Must return 404 Not Found to prevent data existence leaking
    expect(response.status).toBe(404);
  });
});
```

---

## 3. Worker & Queue Verification Strategy

Testing asynchronous BullMQ workers without flakiness:

1. **In-Memory Redis for Unit Tests**: `ioredis-mock` is used for fast unit testing of job submission logic.
2. **Dedicated Test Redis Container for Integration**: Integration test runners use an isolated Redis database index (`redis://localhost:6379/15`) wiped between test suites.
3. **Queue Drain Utilities**:
   ```typescript
   export async function waitForJobCompletion(queue: Queue, jobId: string, timeoutMs = 5000) {
     const job = await queue.getJob(jobId);
     await job?.waitUntilFinished(queueEvents, timeoutMs);
   }
   ```

---

## 4. Media & Template Rendering Verification

1. **Satori/Sharp Image Tests**:
   - Compares rendered output buffer dimensions and mime type.
   - Validates that text content from template slots is embedded in the SVG XML intermediate tree.
2. **FFmpeg Video Pipeline Tests**:
   - Executes test rendering against a 5-second sample video clip (`assets/test-clip.mp4`).
   - Uses `ffprobe` to verify that output dimensions match exactly `1080x1920`, framerate is 30fps, audio codec is AAC, and video codec is H.264.

---

## 5. Social Sandbox Mock Testing

- End-to-end tests run entirely against the built-in **SocialForge Mock Sandbox Provider**.
- Validates the entire flow from:
  1. Post drafted in web composer
  2. Submitted for approval
  3. Approved via magic link
  4. Scheduled 2 seconds into future
  5. BullMQ delayed job fired
  6. Mock publisher sets status to `published`
  7. Publish log recorded in database with simulated remote URL
