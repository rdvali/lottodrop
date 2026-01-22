#!/bin/bash
# LottoDrop Auto-Deploy Installation Script
# Run this on your server as root or with sudo
# Usage: sudo bash install.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "============================================"
echo "  LottoDrop Auto-Deploy Installer"
echo "============================================"
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# Detect script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${YELLOW}Step 1: Creating deploy user...${NC}"
if id "deploy" &>/dev/null; then
    echo "User 'deploy' already exists"
else
    adduser --disabled-password --gecos "Deploy User" deploy
    echo "Created user 'deploy'"
fi
usermod -aG docker deploy 2>/dev/null || true

echo -e "${YELLOW}Step 2: Creating directories...${NC}"
mkdir -p /var/www/lottodrop
mkdir -p /opt/lottodrop-webhook
mkdir -p /etc/lottodrop
touch /var/log/lottodrop-deploy.log
touch /var/log/lottodrop-webhook.log

chown -R deploy:deploy /var/www/lottodrop
chown -R deploy:deploy /opt/lottodrop-webhook
chown deploy:deploy /var/log/lottodrop-*.log

echo -e "${YELLOW}Step 3: Installing deploy script...${NC}"
cp "$SCRIPT_DIR/deploy-lottodrop.sh" /usr/local/bin/
chmod +x /usr/local/bin/deploy-lottodrop.sh
chown deploy:deploy /usr/local/bin/deploy-lottodrop.sh

echo -e "${YELLOW}Step 4: Installing webhook listener...${NC}"
cp -r "$SCRIPT_DIR/webhook-listener/"* /opt/lottodrop-webhook/
chown -R deploy:deploy /opt/lottodrop-webhook

echo -e "${YELLOW}Step 5: Generating webhook secret...${NC}"
if [ -f /etc/lottodrop/webhook.env ]; then
    echo "Webhook config already exists, keeping existing secret"
    source /etc/lottodrop/webhook.env
else
    WEBHOOK_SECRET=$(openssl rand -hex 32)
    cat > /etc/lottodrop/webhook.env << EOF
WEBHOOK_SECRET=$WEBHOOK_SECRET
WEBHOOK_PORT=9001
DEPLOY_SCRIPT=/usr/local/bin/deploy-lottodrop.sh
EOF
    chmod 600 /etc/lottodrop/webhook.env
    chown deploy:deploy /etc/lottodrop/webhook.env
fi

echo -e "${YELLOW}Step 6: Installing systemd service...${NC}"
cp "$SCRIPT_DIR/systemd/lottodrop-webhook.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable lottodrop-webhook

echo -e "${YELLOW}Step 7: Setting up SSH key for deploy user...${NC}"
if [ -f /home/deploy/.ssh/id_ed25519 ]; then
    echo "SSH key already exists"
else
    sudo -u deploy mkdir -p /home/deploy/.ssh
    sudo -u deploy ssh-keygen -t ed25519 -C "deploy@lottodrop.net" -f /home/deploy/.ssh/id_ed25519 -N ""
    chmod 700 /home/deploy/.ssh
    chmod 600 /home/deploy/.ssh/id_ed25519
fi

echo -e "${GREEN}"
echo "============================================"
echo "  Installation Complete!"
echo "============================================"
echo -e "${NC}"

echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo "1. Add this SSH key to GitHub as a deploy key:"
echo "   https://github.com/rdvali/lottodrop/settings/keys"
echo ""
echo -e "${YELLOW}Public Key:${NC}"
cat /home/deploy/.ssh/id_ed25519.pub
echo ""

echo "2. Clone the repository (as deploy user):"
echo "   sudo su - deploy"
echo "   cd /var/www && git clone git@github.com:rdvali/lottodrop.git"
echo ""

echo "3. Configure GitHub webhook:"
echo "   URL: http://YOUR_SERVER_IP:9001/webhook"
echo "   Content-Type: application/json"
echo ""
echo -e "${YELLOW}Webhook Secret:${NC}"
grep WEBHOOK_SECRET /etc/lottodrop/webhook.env | cut -d= -f2
echo ""

echo "4. Open firewall port:"
echo "   sudo ufw allow 9001/tcp"
echo ""

echo "5. Start the webhook service:"
echo "   sudo systemctl start lottodrop-webhook"
echo "   sudo systemctl status lottodrop-webhook"
echo ""

echo "6. Test health endpoint:"
echo "   curl http://localhost:9001/health"
echo ""
