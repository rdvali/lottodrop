# LottoDrop Server Setup for GitHub Actions Auto-Deploy

This guide configures your server to receive automatic deployments from GitHub Actions.

## Architecture

```
GitHub (push to main)
       │
       ▼
GitHub Actions (build images)
       │
       ▼
GitHub Container Registry (ghcr.io)
       │
       ▼
SSH to Server ──► docker pull ──► docker compose up
```

## Prerequisites

- Ubuntu 22.04+ or Debian 11+ server
- Root/sudo access
- Public IP address or domain pointing to server
- Ports 80, 443, 3001 open

---

## Step 1: Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker
sudo systemctl enable docker
sudo systemctl start docker

# Verify
docker --version
docker compose version
```

---

## Step 2: Create Deploy User

```bash
# Create deploy user
sudo adduser --disabled-password --gecos "Deploy User" deploy

# Add to docker group
sudo usermod -aG docker deploy

# Create app directory
sudo mkdir -p /opt/lottodrop
sudo chown deploy:deploy /opt/lottodrop
```

---

## Step 3: Setup SSH Access for GitHub Actions

```bash
# Switch to deploy user
sudo su - deploy

# Create SSH directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Create authorized_keys file
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Exit back to root/sudo user
exit
```

**Generate SSH key pair (on your local machine):**

```bash
# Generate a dedicated deploy key
ssh-keygen -t ed25519 -C "github-actions-lottodrop" -f ~/.ssh/lottodrop_deploy -N ""

# Display public key (add to server)
cat ~/.ssh/lottodrop_deploy.pub

# Display private key (add to GitHub Secrets)
cat ~/.ssh/lottodrop_deploy
```

**Add public key to server:**

```bash
# On server, as root
echo "YOUR_PUBLIC_KEY_HERE" | sudo tee -a /home/deploy/.ssh/authorized_keys
```

---

## Step 4: Copy Production Files to Server

```bash
# On server, as deploy user
sudo su - deploy
cd /opt/lottodrop

# Copy docker-compose.prod.yml (manually or via scp)
# From your local machine:
scp docker-compose.prod.yml deploy@YOUR_SERVER:/opt/lottodrop/

# Create environment file
nano .env
```

**Required .env variables:**

```env
# Database
DB_NAME=lottodrop
DB_USER=lottodrop_user
DB_PASSWORD=<secure-password-here>

# Redis (optional password)
REDIS_PASSWORD=<secure-password-here>
REDIS_DB=0

# JWT & Security
JWT_SECRET=<64-char-random-string>
SESSION_SECRET=<64-char-random-string>
BCRYPT_ROUNDS=12

# CORS
ALLOWED_ORIGINS=https://lottodrop.net,https://www.lottodrop.net

# Admin
ADMIN_EMAIL=admin@lottodrop.net
ADMIN_PASSWORD=<admin-password>

# Platform
PLATFORM_COMMISSION=0.05
```

**Generate secure secrets:**

```bash
# Generate JWT_SECRET
openssl rand -hex 32

# Generate SESSION_SECRET
openssl rand -hex 32

# Generate DB_PASSWORD
openssl rand -base64 24
```

---

## Step 5: Configure GitHub Secrets

Go to: `https://github.com/rdvali/lottodrop/settings/secrets/actions`

Add these repository secrets:

| Secret Name | Description |
|-------------|-------------|
| `SERVER_HOST` | Your server IP or hostname (e.g., `159.65.123.456` or `lottodrop.net`) |
| `SERVER_USER` | SSH username: `deploy` |
| `SERVER_SSH_KEY` | Full private key content (from `~/.ssh/lottodrop_deploy`) |
| `SERVER_PORT` | SSH port (optional, defaults to 22) |
| `GHCR_TOKEN` | GitHub Personal Access Token with `read:packages` scope |

**Create GHCR Token:**

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: `GHCR Pull - LottoDrop Server`
4. Select scopes: `read:packages`
5. Generate and copy the token
6. Add as `GHCR_TOKEN` secret

---

## Step 6: Initial Deployment

**First-time setup on server:**

```bash
# As deploy user
sudo su - deploy
cd /opt/lottodrop

# Login to GitHub Container Registry
echo "YOUR_GHCR_TOKEN" | docker login ghcr.io -u rdvali --password-stdin

# Pull images (first time)
docker pull ghcr.io/rdvali/lottodrop-backend:latest
docker pull ghcr.io/rdvali/lottodrop-frontend:latest
docker pull ghcr.io/rdvali/lottodrop-admin:latest

# Start services
docker compose -f docker-compose.prod.yml up -d

# Check status
docker ps
```

---

## Step 7: Setup Nginx Reverse Proxy

```bash
# Install nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Create nginx config
sudo nano /etc/nginx/sites-available/lottodrop.net
```

**Nginx configuration:**

```nginx
# Main site
server {
    listen 80;
    server_name lottodrop.net www.lottodrop.net;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# API & WebSocket
server {
    listen 80;
    server_name api.lottodrop.net;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Admin panel
server {
    listen 80;
    server_name admin.lottodrop.net;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/lottodrop.net /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Setup SSL
sudo certbot --nginx -d lottodrop.net -d www.lottodrop.net -d api.lottodrop.net -d admin.lottodrop.net
```

---

## Step 8: Test Auto-Deploy

1. Make a small change to any file in `backend/`, `frontend/`, or `frontend-admin/`
2. Commit and push to main:
   ```bash
   git add .
   git commit -m "test: trigger auto-deploy"
   git push origin main
   ```
3. Watch GitHub Actions: https://github.com/rdvali/lottodrop/actions
4. Verify on server:
   ```bash
   docker ps
   curl http://localhost:3001/health
   ```

---

## Manual Deployment

**Deploy all services:**
```bash
cd /opt/lottodrop
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend admin
```

**Deploy single service:**
```bash
docker pull ghcr.io/rdvali/lottodrop-backend:latest
docker compose -f docker-compose.prod.yml up -d --no-deps backend
```

---

## Troubleshooting

### Check container logs
```bash
docker logs lottodrop-backend --tail 100
docker logs lottodrop-frontend --tail 100
```

### Restart services
```bash
docker compose -f docker-compose.prod.yml restart backend
```

### Full restart
```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

### Check GitHub Actions
Go to: https://github.com/rdvali/lottodrop/actions

### Verify GHCR login
```bash
docker login ghcr.io -u rdvali
```

### Check disk space
```bash
df -h
docker system df
docker image prune -af --filter "until=72h"
```

---

## Security Checklist

- [ ] SSH key-based authentication only (disable password auth)
- [ ] Firewall configured (ufw or iptables)
- [ ] SSL/TLS enabled via Let's Encrypt
- [ ] Non-root deploy user
- [ ] Environment secrets in GitHub Secrets
- [ ] GHCR token with minimal permissions (read:packages only)
- [ ] Regular security updates (`unattended-upgrades`)

---

## Quick Reference

| Service | Container | Internal Port | External Port |
|---------|-----------|---------------|---------------|
| Backend | lottodrop-backend | 3001 | 127.0.0.1:3001 |
| Frontend | lottodrop-frontend | 8080 | 127.0.0.1:8080 |
| Admin | lottodrop-admin | 80 | 127.0.0.1:8081 |
| PostgreSQL | lottodrop-postgres | 5432 | - |
| Redis | lottodrop-redis | 6379 | - |

| Domain | Service |
|--------|---------|
| lottodrop.net | Frontend |
| api.lottodrop.net | Backend API + WebSocket |
| admin.lottodrop.net | Admin Panel |
