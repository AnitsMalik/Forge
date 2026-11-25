#!/usr/bin/env bash
# =============================================================================
# SocialForge Commercial SaaS — Production Let's Encrypt SSL & Domain Setup
# =============================================================================

set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root or with sudo:"
  echo "sudo bash setup-ssl.sh yourdomain.com"
  exit 1
fi

DOMAIN="${1:-}"

if [ -z "$DOMAIN" ]; then
  echo "Usage: sudo bash setup-ssl.sh <your-domain.com>"
  echo "Example: sudo bash setup-ssl.sh app.mysocialforge.com"
  exit 1
fi

echo "Setting up SSL certificate for domain: $DOMAIN..."

# 1. Install Certbot
apt-get update -y
apt-get install -y certbot

# 2. Stop frontend container temporarily to bind port 80 for standalone ACME challenge
echo "Pausing web container for SSL verification..."
docker compose -f docker-compose.prod.yml stop web || true

# 3. Obtain Certificate
certbot certonly --standalone -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" || {
  echo "SSL certificate issuance failed. Please make sure your DNS A-record points to this server IP."
  docker compose -f docker-compose.prod.yml start web
  exit 1
}

echo "SSL Certificate issued successfully!"
echo "Certificate location: /etc/letsencrypt/live/$DOMAIN/"

# 4. Restart web container
docker compose -f docker-compose.prod.yml start web

echo "Domain $DOMAIN is configured for HTTPS."
