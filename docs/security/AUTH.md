# Authentication & Session Security

## Overview
SocialForge implements strict defense-in-depth authentication mechanisms across all endpoints and background workers.

## Standards
- **Tokens**: Dual-token pattern with short-lived JWT access tokens and long-lived httpOnly secure refresh cookies.
- **Password Hashing**: bcrypt with salt work factor 12.
- **Account Protection**: Progressive lockout with Exponential Backoff on repeated failed login attempts.
- **Session Revocation**: Centralized token blacklist allowing immediate single-session or all-sessions logout.
