# 🔒 Production Domain Mapping & SSL Certificate Deployment

This guide outlines the production deployment of SSL/TLS certificates and automated renewals for SocialForge on custom domains (e.g. `app.hoasp.com`).

---

## 1. Domain DNS Configuration

Configure DNS records with your registrar or DNS provider (Cloudflare, AWS Route 53, Namecheap, etc.):

| Type | Host / Name | Target / Value | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `app` | `YOUR_SERVER_PUBLIC_IP` | 300 / Auto |
| **A** | `api` (optional) | `YOUR_SERVER_PUBLIC_IP` | 300 / Auto |
| **CNAME** | `www` (optional) | `app.hoasp.com` | 300 / Auto |

---

## 2. Let's Encrypt SSL Provisioning with Certbot

### Step A: Initial Standalone Certificate Issuance
Run Certbot via Docker or host CLI:
```bash
# Host Certbot
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --webroot -w /var/www/certbot -d app.hoasp.com --email admin@hoasp.com --agree-tos --no-eff-email
```

Or via Docker Compose with the Certbot service:
```bash
docker run -it --rm --name certbot \
  -v "/etc/letsencrypt:/etc/letsencrypt" \
  -v "/var/lib/letsencrypt:/var/lib/letsencrypt" \
  -v "/var/www/certbot:/var/www/certbot" \
  certbot/certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  -d app.hoasp.com \
  --email admin@hoasp.com --agree-tos --no-eff-email
```

---

## 3. Nginx HTTPS Activation

Replace the default `nginx.conf` with `nginx.ssl.conf`:
```bash
cp nginx.ssl.conf nginx.conf
docker compose -f docker-compose.prod.yml restart web
```

---

## 4. Automated SSL Renewal Setup

Certificates expire after 90 days. Set up automatic renewal using cron:

```bash
# Add to crontab (runs twice daily at 03:00 and 15:00)
0 3,15 * * * certbot renew --quiet --post-hook "docker compose -f /path/to/SocialForge/docker-compose.prod.yml exec web nginx -s reload"
```

Verify renewal test:
```bash
certbot renew --dry-run
```

---

## 5. Security & SSL Rating Verification

Verify your domain on [SSL Labs Qualys](https://www.ssllabs.com/ssltest/) to achieve an **A+ Rating**:
- TLS 1.2 and TLS 1.3 only
- HTTP Strict Transport Security (HSTS) with 1-year max age and preload
- Perfect Forward Secrecy (PFS) with ECDHE ciphers
- X-Frame-Options DENY & Content-Type-Options nosniff
