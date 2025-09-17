#!/bin/bash

# LottoDrop Quick Deployment Script for Ubuntu
# This script automates the initial server setup and deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN=""
EMAIL=""
DB_PASSWORD=""
REDIS_PASSWORD=""
ADMIN_PASSWORD=""

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}LottoDrop Quick Deployment Script${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""

# Get user inputs
read -p "Enter your domain name (e.g., example.com): " DOMAIN
read -p "Enter your email for SSL certificate: " EMAIL
read -sp "Enter a strong database password: " DB_PASSWORD
echo ""
read -sp "Enter a strong Redis password: " REDIS_PASSWORD
echo ""
read -sp "Enter admin panel password: " ADMIN_PASSWORD
echo ""

# Confirm inputs
echo ""
echo -e "${YELLOW}Please confirm your settings:${NC}"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""
read -p "Continue with deployment? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 1
fi

echo -e "${GREEN}Starting deployment...${NC}"

# Step 1: Update system
echo -e "${YELLOW}Step 1: Updating system...${NC}"
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git vim htop net-tools software-properties-common

# Step 2: Install Docker
echo -e "${YELLOW}Step 2: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
else
    echo "Docker already installed"
fi

# Step 3: Install Docker Compose
echo -e "${YELLOW}Step 3: Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
else
    echo "Docker Compose already installed"
fi

# Step 4: Setup firewall
echo -e "${YELLOW}Step 4: Configuring firewall...${NC}"
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Step 5: Install Nginx
echo -e "${YELLOW}Step 5: Installing Nginx...${NC}"
sudo apt install -y nginx
sudo systemctl enable nginx

# Step 6: Install Certbot
echo -e "${YELLOW}Step 6: Installing Certbot...${NC}"
sudo apt install -y certbot python3-certbot-nginx

# Step 7: Create project directory
echo -e "${YELLOW}Step 7: Setting up project directory...${NC}"
sudo mkdir -p /var/www/lottodrop
sudo chown -R $USER:$USER /var/www/lottodrop

# Step 8: Generate secure secrets
echo -e "${YELLOW}Step 8: Generating secure secrets...${NC}"
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
SESSION_SECRET=$(openssl rand -base64 32 | tr -d '\n')

# Step 9: Create environment file
echo -e "${YELLOW}Step 9: Creating environment configuration...${NC}"
cat > /var/www/lottodrop/.env << EOF
# Production Environment Configuration
NODE_ENV=production

# Database
DB_NAME=lottodrop
DB_USER=lottodrop_user
DB_PASSWORD=$DB_PASSWORD
DB_PORT=5432

# Redis
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_DB=0

# Security
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET
BCRYPT_ROUNDS=12

# Admin
ADMIN_EMAIL=admin@$DOMAIN
ADMIN_PASSWORD=$ADMIN_PASSWORD

# Application
FRONTEND_PORT=8080
ADMIN_PORT=8081
BACKEND_PORT=3001

# API URLs
VITE_API_URL=https://$DOMAIN/api
VITE_SOCKET_URL=https://$DOMAIN
REACT_APP_API_URL=https://$DOMAIN

# CORS
ALLOWED_ORIGINS=https://$DOMAIN,https://www.$DOMAIN

# Platform
PLATFORM_COMMISSION=0.05
EOF

# Step 10: Create Nginx configuration
echo -e "${YELLOW}Step 10: Configuring Nginx...${NC}"
sudo tee /etc/nginx/sites-available/lottodrop > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /admin {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/lottodrop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Step 11: Note about project files
echo ""
echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}Initial setup complete!${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Transfer your project files to /var/www/lottodrop/"
echo "   From your local machine, run:"
echo -e "${GREEN}   scp -r /path/to/LottoDrop/* $USER@$(curl -s ifconfig.me):/var/www/lottodrop/${NC}"
echo ""
echo "2. After transferring files, run on the server:"
echo -e "${GREEN}   cd /var/www/lottodrop${NC}"
echo -e "${GREEN}   ./deploy.sh${NC}"
echo ""
echo "3. Get SSL certificate:"
echo -e "${GREEN}   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive${NC}"
echo ""
echo -e "${YELLOW}Important files:${NC}"
echo "- Environment config: /var/www/lottodrop/.env"
echo "- Nginx config: /etc/nginx/sites-available/lottodrop"
echo ""
echo -e "${GREEN}Your server IP: $(curl -s ifconfig.me)${NC}"
echo -e "${GREEN}Domain: https://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}Security Note:${NC}"
echo "Remember to:"
echo "- Setup SSH key authentication"
echo "- Disable password authentication"
echo "- Configure automated backups"
echo "- Setup monitoring"
echo ""
echo -e "${GREEN}Deployment preparation complete!${NC}"