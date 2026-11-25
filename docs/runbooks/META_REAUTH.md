# Meta Re-Authentication Runbook

## Overview
Steps to diagnose and recover from expired, revoked, or invalid Facebook/Instagram access tokens.

## Detection
- Connection Health status indicates `degraded` or `expired`.
- API publishing errors with code `OAuthException` (Subcode 463 or 467).

## Resolution Steps
1. Navigate to `/connections` in SocialForge Web UI.
2. Click **Reconnect** on the degraded Meta provider card.
3. Complete Facebook OAuth dialog ensuring all requested Page and Instagram permissions remain checked.
4. SocialForge exchanges user token for long-lived system token and updates the Credential Vault.
5. Inbound health heartbeat updates status back to `healthy`.
