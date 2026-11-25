# Credential Vault Architecture

## Overview
SocialForge protects third-party OAuth access tokens, client secrets, and sensitive credentials with envelope encryption.

## Encryption Implementation
- Algorithm: AES-256-GCM with unique initialization vector (IV) and authentication tag per entry.
- Master Key: Loaded from secure environment variable `ENCRYPTION_MASTER_KEY` (32 bytes / 256 bits).
- Tenant Key Derivation: PBKDF2/HMAC-SHA256 salt derivation per tenant/workspace.
- Zero Cleartext: Credentials are never written to disk or logs unencrypted.
