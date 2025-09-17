# LottoDrop Production Deployment Guide for Ubuntu Server

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Server Preparation](#server-preparation)
3. [Security Setup](#security-setup)
4. [Project Transfer](#project-transfer)
5. [Docker Installation](#docker-installation)
6. [SSL/HTTPS Setup](#sslhttps-setup)
7. [Environment Configuration](#environment-configuration)
8. [Database Backup & Restore](#database-backup--restore)
9. [Deployment](#deployment)
10. [Monitoring & Maintenance](#monitoring--maintenance)
11. [Troubleshooting](#troubleshooting)

## Prerequisites

### Server Requirements
- Ubuntu 20.04 LTS or 22.04 LTS
- Minimum 2GB RAM (4GB recommended)
- 20GB+ storage
- Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 5432 (PostgreSQL - optional), 6379 (Redis - optional)
- Domain name pointing to your server IP

### Local Requirements
- SSH access to your server
- Git installed locally
- Docker and Docker Compose on the server

## Step 1: Server Preparation

### 1.1 Connect to Your Server
```bash
ssh your_user@your_server_ip
```

### 1.2 Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git vim htop net-tools software-properties-common
```

### 1.3 Create Deploy User (Optional but recommended)
```bash
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo usermod -aG docker deploy  # We'll create docker group later
```

### 1.4 Setup SSH Key for Deploy User
```bash
# On your local machine
ssh-copy-id deploy@your_server_ip

# On the server, disable password authentication
sudo vim /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

## Step 2: Security Setup

### 2.1 Configure Firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

### 2.2 Install Fail2ban
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 2.3 Secure Shared Memory
```bash
echo "tmpfs /run/shm tmpfs defaults,noexec,nosuid 0 0" | sudo tee -a /etc/fstab
```

## Step 3: Install Docker & Docker Compose

### 3.1 Install Docker
```bash
# Remove old versions
sudo apt remove docker docker-engine docker.io containerd runc

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
sudo usermod -aG docker deploy  # if using deploy user

# Start Docker
sudo systemctl enable docker
sudo systemctl start docker

# Verify installation
docker --version
```

### 3.2 Install Docker Compose
```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Create symbolic link
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# Verify installation
docker-compose --version
```

## Step 4: Project Transfer

### 4.1 Create Project Directory
```bash
sudo mkdir -p /var/www/lottodrop
sudo chown -R $USER:$USER /var/www/lottodrop
cd /var/www/lottodrop
```

### 4.2 Clone or Transfer Project
```bash
# Option 1: Clone from Git repository
git clone https://github.com/your-username/lottodrop.git .

# Option 2: Transfer via SCP (from your local machine)
# Run this on your LOCAL machine:
scp -r /Users/rd/Documents/Projects/LottoDrop/* deploy@your_server_ip:/var/www/lottodrop/
```

### 4.3 Create Required Directories
```bash
mkdir -p backend/uploads
mkdir -p postgres_data
mkdir -p redis_data
```

## Step 5: SSL/HTTPS Setup with Nginx and Certbot

### 5.1 Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 5.2 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 5.3 Create Nginx Configuration
```bash
sudo vim /etc/nginx/sites-available/lottodrop
```

Add this configuration:
```nginx
# HTTP redirect to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend
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
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket proxy
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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
}
```

### 5.4 Enable Site and Get SSL Certificate
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/lottodrop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Step 6: Environment Configuration

### 6.1 Create Production Environment File
```bash
cd /var/www/lottodrop
cp .env.example .env  # or create new
vim .env
```

Update with production values:
```bash
# Production Environment Configuration
NODE_ENV=production

# Database
DB_NAME=lottodrop
DB_USER=lottodrop_user
DB_PASSWORD=CHANGE_THIS_STRONG_PASSWORD_123!@#
DB_PORT=5432

# Redis
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD_456!@#
REDIS_DB=0

# Security - GENERATE NEW SECRETS!
JWT_SECRET=GENERATE_NEW_64_CHAR_SECRET_HERE
SESSION_SECRET=GENERATE_NEW_32_CHAR_SECRET_HERE
BCRYPT_ROUNDS=12

# Admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=CHANGE_THIS_ADMIN_PASSWORD_789!@#

# Application
FRONTEND_PORT=8080
ADMIN_PORT=8081
BACKEND_PORT=3001

# API URLs (update with your domain)
VITE_API_URL=https://yourdomain.com/api
VITE_SOCKET_URL=https://yourdomain.com
REACT_APP_API_URL=https://yourdomain.com

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Platform
PLATFORM_COMMISSION=0.05
```

### 6.2 Generate Secure Secrets
```bash
# Generate JWT Secret
openssl rand -base64 64

# Generate Session Secret
openssl rand -base64 32

# Generate strong passwords
openssl rand -base64 32
```

### 6.3 Update Backend .env
```bash
cp backend/.env.example backend/.env  # or create new
vim backend/.env
```

Update with same production values.

## Step 7: Production Docker Compose

### 7.1 Create Production Docker Compose
```bash
vim docker-compose.prod.yml
```

Add this configuration:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: lottodrop-postgres
    restart: always
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - ./postgres_data:/var/lib/postgresql/data
      - ./backend/migrations:/docker-entrypoint-initdb.d:ro
    networks:
      - lottodrop-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: lottodrop-redis
    restart: always
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - ./redis_data:/data
    networks:
      - lottodrop-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: lottodrop-backend
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      SESSION_SECRET: ${SESSION_SECRET}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS}
    ports:
      - "127.0.0.1:3001:3001"
    networks:
      - lottodrop-network
    volumes:
      - ./backend/uploads:/app/uploads

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL}
        VITE_SOCKET_URL: ${VITE_SOCKET_URL}
    container_name: lottodrop-frontend
    restart: always
    ports:
      - "127.0.0.1:8080:8080"
    networks:
      - lottodrop-network

  frontend-admin:
    build:
      context: ./frontend-admin
      dockerfile: Dockerfile
      args:
        REACT_APP_API_URL: ${REACT_APP_API_URL}
    container_name: lottodrop-admin
    restart: always
    ports:
      - "127.0.0.1:8081:80"
    networks:
      - lottodrop-network

networks:
  lottodrop-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

## Step 8: Deployment Scripts

### 8.1 Create Deploy Script
```bash
vim deploy.sh
```

Add:
```bash
#!/bin/bash

# LottoDrop Production Deployment Script

set -e

echo "Starting LottoDrop deployment..."

# Pull latest changes (if using Git)
# git pull origin main

# Stop existing containers
docker-compose -f docker-compose.prod.yml down

# Build and start containers
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 10

# Run migrations
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U $DB_USER -d $DB_NAME < backend/migrations/complete_schema.sql

# Create admin user
docker-compose -f docker-compose.prod.yml exec -T backend node dist/scripts/createAdmin.js

echo "Deployment complete!"
echo "Services status:"
docker-compose -f docker-compose.prod.yml ps
```

Make executable:
```bash
chmod +x deploy.sh
```

### 8.2 Create Backup Script
```bash
vim backup.sh
```

Add:
```bash
#!/bin/bash

# LottoDrop Backup Script

BACKUP_DIR="/var/backups/lottodrop"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U lottodrop_user lottodrop > $BACKUP_DIR/db_backup_$DATE.sql

# Backup uploads
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz backend/uploads/

# Backup environment files
tar -czf $BACKUP_DIR/env_backup_$DATE.tar.gz .env backend/.env

# Keep only last 7 days of backups
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR"
```

Make executable:
```bash
chmod +x backup.sh
```

### 8.3 Create Monitoring Script
```bash
vim monitor.sh
```

Add:
```bash
#!/bin/bash

# LottoDrop Health Check Script

echo "=== LottoDrop Health Status ==="
echo ""

# Check Docker containers
echo "Container Status:"
docker-compose -f docker-compose.prod.yml ps
echo ""

# Check backend health
echo "Backend Health:"
curl -s http://localhost:3001/health | jq '.' || echo "Backend not responding"
echo ""

# Check database
echo "Database Status:"
docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready || echo "Database not ready"
echo ""

# Check Redis
echo "Redis Status:"
docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping || echo "Redis not responding"
echo ""

# Check disk usage
echo "Disk Usage:"
df -h | grep -E "^/dev/"
echo ""

# Check memory
echo "Memory Usage:"
free -h
echo ""

# Check Docker stats
echo "Container Resources:"
docker stats --no-stream
```

Make executable:
```bash
chmod +x monitor.sh
```

## Step 9: Deploy the Application

### 9.1 Initial Deployment
```bash
cd /var/www/lottodrop

# Set correct permissions
sudo chown -R $USER:$USER .

# Run deployment
./deploy.sh
```

### 9.2 Verify Deployment
```bash
# Check all services are running
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs --tail=50

# Test endpoints
curl https://yourdomain.com
curl https://yourdomain.com/api/health
```

## Step 10: Setup Automated Backups

### 10.1 Add Cron Job
```bash
crontab -e
```

Add:
```bash
# Daily backup at 2 AM
0 2 * * * /var/www/lottodrop/backup.sh >> /var/log/lottodrop-backup.log 2>&1

# Health check every 5 minutes
*/5 * * * * /var/www/lottodrop/monitor.sh >> /var/log/lottodrop-monitor.log 2>&1
```

## Step 11: Setup Monitoring

### 11.1 Install Monitoring Tools
```bash
# Install htop for system monitoring
sudo apt install -y htop

# Install netdata for comprehensive monitoring (optional)
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```

### 11.2 Setup Log Rotation
```bash
sudo vim /etc/logrotate.d/lottodrop
```

Add:
```
/var/log/lottodrop-*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
```

## Step 12: Security Hardening

### 12.1 Database Security
```bash
# Connect to database
docker-compose -f docker-compose.prod.yml exec postgres psql -U lottodrop_user -d lottodrop

-- Revoke unnecessary permissions
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- Create read-only user for backups
CREATE USER backup_user WITH PASSWORD 'backup_password';
GRANT CONNECT ON DATABASE lottodrop TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
```

### 12.2 Redis Security
```bash
# Edit Redis configuration in docker-compose.prod.yml
# Add these to redis command:
command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD} --maxmemory 512mb --maxmemory-policy allkeys-lru
```

## Step 13: Performance Optimization

### 13.1 Enable Swap (if needed)
```bash
# Check if swap exists
free -h

# Create swap file (2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 13.2 Optimize Docker
```bash
# Clean up unused Docker resources
docker system prune -a --volumes

# Set Docker logging limits
sudo vim /etc/docker/daemon.json
```

Add:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Restart Docker:
```bash
sudo systemctl restart docker
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Port Already in Use
```bash
# Find process using port
sudo lsof -i :3001
# Kill process
sudo kill -9 <PID>
```

#### 2. Database Connection Issues
```bash
# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Restart database
docker-compose -f docker-compose.prod.yml restart postgres
```

#### 3. Memory Issues
```bash
# Check memory usage
free -h
docker stats

# Restart containers to free memory
docker-compose -f docker-compose.prod.yml restart
```

#### 4. SSL Certificate Renewal
```bash
# Renew certificate
sudo certbot renew

# Setup auto-renewal
sudo crontab -e
# Add: 0 0 * * 0 certbot renew --quiet
```

## Maintenance Commands

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Restart Services
```bash
# All services
docker-compose -f docker-compose.prod.yml restart

# Specific service
docker-compose -f docker-compose.prod.yml restart backend
```

### Update Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and deploy
./deploy.sh
```

### Database Maintenance
```bash
# Backup database
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U lottodrop_user lottodrop > backup.sql

# Restore database
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U lottodrop_user lottodrop < backup.sql
```

## Security Checklist

- [ ] Changed all default passwords
- [ ] SSL certificates installed
- [ ] Firewall configured
- [ ] SSH key authentication only
- [ ] Regular backups configured
- [ ] Monitoring in place
- [ ] Log rotation configured
- [ ] Docker logging limits set
- [ ] Database user permissions restricted
- [ ] Redis password set
- [ ] Environment files secured (chmod 600)

## Support & Monitoring URLs

After deployment, access your services at:
- Main Application: https://yourdomain.com
- Admin Panel: https://yourdomain.com/admin
- API Health: https://yourdomain.com/api/health
- Monitoring (if installed): http://yourdomain.com:19999 (Netdata)

## Important Notes

1. **Always backup before updates**
2. **Monitor disk space regularly**
3. **Check logs for suspicious activity**
4. **Keep Ubuntu and Docker updated**
5. **Test on staging before production updates**
6. **Document any custom changes**

---

## Quick Deployment Checklist

1. [ ] Server updated and secured
2. [ ] Docker & Docker Compose installed
3. [ ] Project files transferred
4. [ ] Environment variables configured
5. [ ] SSL certificates obtained
6. [ ] Database initialized
7. [ ] Admin user created
8. [ ] Backups configured
9. [ ] Monitoring setup
10. [ ] Application tested and working

---

*Last Updated: September 2025*
*Version: 1.0.0*