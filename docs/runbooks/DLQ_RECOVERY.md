# Dead-Letter Queue (DLQ) Recovery Runbook

## Overview
Procedures to investigate, replay, and clear failed jobs in the BullMQ / Redis DLQ and MySQL `webhook_dlq` table.

## Inspection
- Query DLQ records:
  ```bash
  node scripts/diagnostics/check_dlq_status.mjs
  ```
- Review error trace and payload context stored in database.

## Replay Actions
1. Correct root issue (e.g. restore database connectivity or refresh expired API keys).
2. Trigger bulk replay via API or CLI script:
   ```bash
   node scripts/testing/replay_dlq_jobs.mjs --queue=all
   ```
3. Verify processed count matches replay count.
