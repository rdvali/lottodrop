#!/bin/bash

# LottoDrop Initial Server Setup Script
# This script sets up a fresh Ubuntu server for the first deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DOMAIN="lottodrop.net"
APP_DIR="/var/www/lottodrop"
BACKUP_DIR="/var/backups/lottodrop"
USER=$(whoami)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   LottoDrop Initial Server Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: System Update
echo -e "${GREEN}Step 1: Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Step 2: Install Required Software
echo -e "${GREEN}Step 2: Installing required software...${NC}"
sudo apt install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    ufw \
    nginx \
    certbot \
    python3-certbot-nginx \
    fail2ban \
    net-tools \
    jq

# Step 3: Install Docker
echo -e "${GREEN}Step 3: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo -e "${YELLOW}Note: You'll need to log out and back in for docker group to take effect${NC}"
else
    echo "Docker already installed"
fi

# Step 4: Install Docker Compose
echo -e "${GREEN}Step 4: Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose already installed"
fi

# Step 5: Create Application Directory
echo -e "${GREEN}Step 5: Creating application directories...${NC}"
sudo mkdir -p $APP_DIR
sudo mkdir -p $BACKUP_DIR
sudo chown -R $USER:$USER $APP_DIR
sudo chown -R $USER:$USER $BACKUP_DIR

# Step 6: Configure Firewall
echo -e "${GREEN}Step 6: Configuring firewall...${NC}"
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw --force enable

# Step 7: Configure Nginx
echo -e "${GREEN}Step 7: Setting up Nginx configuration...${NC}"
sudo tee /etc/nginx/sites-available/lottodrop > /dev/null << 'EOF'
# HTTP redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name lottodrop.net www.lottodrop.net;
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name lottodrop.net www.lottodrop.net;
    
    # SSL certificates (will be added by certbot)
    # ssl_certificate /etc/letsencrypt/live/lottodrop.net/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/lottodrop.net/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Logging
    access_log /var/log/nginx/lottodrop.access.log;
    error_log /var/log/nginx/lottodrop.error.log;
    
    # Frontend (main app)
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Admin panel
    location /admin {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase body size for file uploads
        client_max_body_size 10M;
    }
    
    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket specific
        proxy_buffering off;
        proxy_redirect off;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Static file caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml application/atom+xml image/svg+xml text/javascript application/vnd.ms-fontobject application/x-font-ttf font/opentype;
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/lottodrop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Step 8: Setup fail2ban
echo -e "${GREEN}Step 8: Configuring fail2ban...${NC}"
sudo tee /etc/fail2ban/jail.local > /dev/null << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-badbots]
enabled = true
port = http,https
filter = nginx-badbots
logpath = /var/log/nginx/access.log
maxretry = 2

[nginx-noproxy]
enabled = true
port = http,https
filter = nginx-noproxy
logpath = /var/log/nginx/error.log
maxretry = 2
EOF

sudo systemctl restart fail2ban

# Step 9: Create deployment user SSH directory
echo -e "${GREEN}Step 9: Setting up SSH for deployments...${NC}"
mkdir -p ~/.ssh
chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

echo -e "${YELLOW}Add your deployment key to ~/.ssh/authorized_keys${NC}"

# Step 10: Create cron jobs
echo -e "${GREEN}Step 10: Setting up cron jobs...${NC}"
(crontab -l 2>/dev/null || true; echo "0 2 * * * $APP_DIR/backup.sh") | crontab -
(crontab -l 2>/dev/null || true; echo "*/5 * * * * $APP_DIR/monitor.sh > /dev/null 2>&1") | crontab -

# Step 11: System optimization
echo -e "${GREEN}Step 11: Optimizing system settings...${NC}"
sudo tee -a /etc/sysctl.conf > /dev/null << 'EOF'

# Network optimizations for gaming platform
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_keepalive_intvl = 15

# File descriptor limits
fs.file-max = 2097152
fs.nr_open = 1048576
EOF

sudo sysctl -p

# Step 12: Create environment template
echo -e "${GREEN}Step 12: Creating environment template...${NC}"
cat > $APP_DIR/.env.template << 'EOF'
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USER=lottodrop_user
DB_PASSWORD=CHANGE_ME
DB_NAME=lottodrop

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_ME

# JWT and Session
JWT_SECRET=CHANGE_ME
JWT_EXPIRES_IN=7d
SESSION_SECRET=CHANGE_ME
SESSION_EXPIRES_IN=86400000

# Admin Configuration
ADMIN_EMAIL=admin@lottodrop.net
ADMIN_PASSWORD=CHANGE_ME

# Application URLs
DOMAIN=lottodrop.net
FRONTEND_URL=https://lottodrop.net
ADMIN_URL=https://lottodrop.net/admin
BACKEND_URL=https://lottodrop.net
ALLOWED_ORIGINS=https://lottodrop.net,https://www.lottodrop.net

# Service Ports
BACKEND_PORT=3001
FRONTEND_PORT=8080
ADMIN_PORT=8081

# Node Environment
NODE_ENV=production
EOF

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Initial Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Add your SSH public key to ~/.ssh/authorized_keys"
echo "2. Copy your project files to $APP_DIR"
echo "3. Configure .env file in $APP_DIR"
echo "4. Run SSL certificate setup:"
echo "   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo "5. Deploy application:"
echo "   cd $APP_DIR && ./deploy.sh"
echo ""
echo -e "${RED}Important Security Steps:${NC}"
echo "1. Change default passwords in .env"
echo "2. Disable password authentication in SSH"
echo "3. Configure GitHub secrets for CI/CD"
echo ""