# Meta Integration (Facebook & Instagram)

## Overview
Connects to Meta Graph API (v19.0+) supporting Facebook Pages and Instagram Professional / Business Accounts.

## Authentication & Permissions
- Protocol: OAuth 2.0 with User Token exchanged for Long-Lived System User / Page Tokens.
- Scopes:
  - `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`
  - `instagram_basic`, `instagram_content_publish`

## Publishing Pipelines
- Single image posts, multi-photo carousels, and Reels video container publishing.
- Status polling via container ID until `FINISHED` before calling `media_publish`.
- Automated pre-publish aspect ratio, duration, and codec validation.
