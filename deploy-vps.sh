#!/usr/bin/env bash
# =============================================================================
# SocialForge Commercial SaaS — One-Click Production VPS Deploy Script
# Supported OS: Ubuntu 20.04 / 22.04 / 24.04 LTS, Debian 11 / 12
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===================================================================${NC}"
echo -e "${GREEN}       SocialForge Commercial SaaS — Production Deployer           ${NC}"
echo -e "${BLUE}===================================================================${NC}"

# 1. Root Check
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run this script as root or with sudo:${NC}"
  echo "sudo bash deploy-vps.sh"
  exit 1
fi

# 2. System Package Updates & Prerequisites
echo -e "\n${YELLOW}[1/6] Updating system packages & installing prerequisites...${NC}"
apt-get update -y && apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg lsb-release ufw git fail2ban

# 3. Docker & Docker Compose Plugin Installation
echo -e "\n${YELLOW}[2/6] Checking / Installing Docker Engine...${NC}"
if ! command -v docker &> /dev/null; then
  echo "Installing official Docker Engine..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable docker
  systemctl start docker
  echo -e "${GREEN}[OK] Docker installed successfully.${NC}"
else
  echo -e "${GREEN}[OK] Docker is already installed: $(docker --version)${NC}"
fi

# 4. Firewall Configuration (UFW)
echo -e "\n${YELLOW}[3/6] Configuring UFW Firewall...${NC}"
ufw --force enable
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
echo -e "${GREEN}[OK] Firewall configured (Ports 22, 80, 443 open).${NC}"

# 5. Environment File Validation
echo -e "\n${YELLOW}[4/6] Validating production .env configuration...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f .env ]; then
  if [ -f .env.production.example ]; then
    echo -e "${YELLOW}[!] No .env file found. Copying from .env.production.example...${NC}"
    cp .env.production.example .env
    
    # Auto-generate secure JWT secret and Encryption Key if placeholder exists
    RANDOM_JWT=$(openssl rand -base64 32 | tr -d '\n')
    RANDOM_ENC=$(openssl rand -hex 32 | tr -d '\n')
    RANDOM_DB_PASS=$(openssl rand -hex 16 | tr -d '\n')
    
    sed -i "s|GENERATE_32_CHAR_CRYPTOGRAPHIC_JWT_SECRET_HERE|${RANDOM_JWT}|g" .env
    sed -i "s|GENERATE_64_HEX_CHARACTERS_MASTER_KEY_0123456789abcdef0123456789|${RANDOM_ENC}|g" .env
    sed -i "s|GENERATE_STRONG_RANDOM_PASSWORD_HERE|${RANDOM_DB_PASS}|g" .env
    
    echo -e "${GREEN}[OK] Created .env with auto-generated cryptographic secrets.${NC}"
    echo -e "${YELLOW}[!] Please review .env to add your Stripe, OpenAI, and Meta keys:${NC}"
    echo "    nano .env"
  else
    echo -e "${RED}[ERROR] Neither .env nor .env.production.example was found in $SCRIPT_DIR.${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}[OK] Existing .env file found.${NC}"
fi

# 6. Build and Spin Up Docker Production Stack
echo -e "\n${YELLOW}[5/6] Building and starting SocialForge production containers...${NC}"
docker compose -f docker-compose.prod.yml down --remove-orphans || true
docker compose -f docker-compose.prod.yml up -d --build

# 7. Health Check Verification
echo -e "\n${YELLOW}[6/6] Verifying services health status...${NC}"
sleep 15

RETRIES=10
HEALTHY=false

for i in $(seq 1 $RETRIES); do
  echo "Checking container status (attempt $i/$RETRIES)..."
  if docker ps | grep -q "socialforge-prod-web"; then
    HEALTHY=true
    break
  fi
  sleep 5
done

echo -e "\n${BLUE}===================================================================${NC}"
if [ "$HEALTHY" = true ]; then
  echo -e "${GREEN}   SocialForge Production Stack Deployed & Running Successfully!   ${NC}"
  echo -e "${BLUE}===================================================================${NC}"
  echo -e "Web Application: http://$(curl -s ifconfig.me || echo 'YOUR_SERVER_IP')"
  echo -e "Health Endpoint: http://localhost/health"
  echo ""
  echo "Active Containers:"
  docker compose -f docker-compose.prod.yml ps
  echo ""
  echo "Useful commands:"
  echo "  - View live logs: docker compose -f docker-compose.prod.yml logs -f"
  echo "  - Restart stack:  docker compose -f docker-compose.prod.yml restart"
  echo "  - Stop stack:     docker compose -f docker-compose.prod.yml down"
else
  echo -e "${RED}[!] Some containers may still be initializing or failed to start.${NC}"
  echo "Check logs with: docker compose -f docker-compose.prod.yml logs"
fi
