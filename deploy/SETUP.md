# LottoDrop Auto-Deploy Setup Guide

This guide sets up automatic deployment from GitHub to your server using webhooks.

## Architecture
```
GitHub (push to main)
       │
       ▼
GitHub Webhook ──────► Server:9001 (webhook listener)
                              │
                              ▼
                       deploy-lottodrop.sh
                              │
                              ▼
                       Docker containers restart
```

## Prerequisites
- Server with root/sudo access
- Docker and Docker Compose installed
- Node.js 18+ installed
- Git installed
- Port 9001 available (or configure nginx reverse proxy)

---

## Step 1: Create Deploy User

SSH into your server and run:

```bash
# Create deploy user
sudo adduser --disabled-password --gecos "Deploy User" deploy

# Add to docker group (to run docker commands)
sudo usermod -aG docker deploy

# Create directories
sudo mkdir -p /var/www/lottodrop
sudo mkdir -p /opt/lottodrop-webhook
sudo mkdir -p /etc/lottodrop
sudo mkdir -p /var/log

# Set ownership
sudo chown -R deploy:deploy /var/www/lottodrop
sudo chown -R deploy:deploy /opt/lottodrop-webhook
sudo chown -R deploy:deploy /var/log/lottodrop*.log 2>/dev/null || true

# Create log files
sudo touch /var/log/lottodrop-deploy.log
sudo touch /var/log/lottodrop-webhook.log
sudo chown deploy:deploy /var/log/lottodrop-*.log
```

---

## Step 2: Setup SSH Deploy Key on Server

```bash
# Switch to deploy user
sudo su - deploy

# Generate SSH key for GitHub
ssh-keygen -t ed25519 -C "deploy@lottodrop.net" -f ~/.ssh/id_ed25519 -N ""

# Display public key (copy this for GitHub)
cat ~/.ssh/id_ed25519.pub
```

**Add to GitHub:**
1. Go to: https://github.com/rdvali/lottodrop/settings/keys
2. Click "Add deploy key"
3. Title: `LottoDrop Server Deploy Key`
4. Paste the public key
5. Check "Allow write access" (optional, not needed for pull-only)
6. Click "Add key"

**Test connection:**
```bash
ssh -T git@github.com
# Should see: "Hi rdvali! You've successfully authenticated..."
```

---

## Step 3: Clone Repository

```bash
# As deploy user
cd /var/www
git clone git@github.com:rdvali/lottodrop.git
cd lottodrop

# Verify
git status
```

---

## Step 4: Install Deploy Script

```bash
# Copy deploy script (run as root or with sudo)
sudo cp /var/www/lottodrop/deploy/deploy-lottodrop.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/deploy-lottodrop.sh
sudo chown deploy:deploy /usr/local/bin/deploy-lottodrop.sh

# Test deploy script
sudo -u deploy /usr/local/bin/deploy-lottodrop.sh
```

---

## Step 5: Install Webhook Listener

```bash
# Copy webhook listener files
sudo cp -r /var/www/lottodrop/deploy/webhook-listener/* /opt/lottodrop-webhook/
sudo chown -R deploy:deploy /opt/lottodrop-webhook

# No npm install needed - uses only Node.js built-in modules
```

---

## Step 6: Configure Webhook Secret

Generate a secure webhook secret:
```bash
# Generate random secret
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "Your webhook secret: $WEBHOOK_SECRET"

# Save to environment file
sudo bash -c "cat > /etc/lottodrop/webhook.env << EOF
WEBHOOK_SECRET=$WEBHOOK_SECRET
WEBHOOK_PORT=9001
DEPLOY_SCRIPT=/usr/local/bin/deploy-lottodrop.sh
EOF"

sudo chmod 600 /etc/lottodrop/webhook.env
sudo chown deploy:deploy /etc/lottodrop/webhook.env
```

**Save this secret!** You'll need it for GitHub webhook configuration.

---

## Step 7: Install Systemd Service

```bash
# Copy service file
sudo cp /var/www/lottodrop/deploy/systemd/lottodrop-webhook.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable lottodrop-webhook

# Start service
sudo systemctl start lottodrop-webhook

# Check status
sudo systemctl status lottodrop-webhook
```

---

## Step 8: Configure Firewall

```bash
# Allow webhook port (UFW)
sudo ufw allow 9001/tcp comment "LottoDrop Webhook"

# OR with iptables
sudo iptables -A INPUT -p tcp --dport 9001 -j ACCEPT

# Verify
sudo ufw status
# or
sudo iptables -L -n | grep 9001
```

---

## Step 9: Configure GitHub Webhook

1. Go to: https://github.com/rdvali/lottodrop/settings/hooks
2. Click "Add webhook"
3. Configure:
   - **Payload URL:** `http://YOUR_SERVER_IP:9001/webhook`
   - **Content type:** `application/json`
   - **Secret:** (paste the WEBHOOK_SECRET from Step 6)
   - **SSL verification:** Disable if not using HTTPS
   - **Which events:** Just the push event
   - **Active:** Check this box
4. Click "Add webhook"

---

## Step 10: Test End-to-End

### Test 1: Health Check
```bash
curl http://YOUR_SERVER_IP:9001/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Test 2: Manual Deploy
```bash
sudo -u deploy /usr/local/bin/deploy-lottodrop.sh
```

### Test 3: Webhook Trigger
Make a small commit and push:
```bash
# On your local machine
cd /path/to/lottodrop
echo "# Test deploy $(date)" >> README.md
git add README.md
git commit -m "test: trigger auto-deploy"
git push origin main
```

Then check:
```bash
# On server - check webhook logs
sudo journalctl -u lottodrop-webhook -f

# Check deploy logs
tail -f /var/log/lottodrop-deploy.log
```

---

## Optional: Nginx Reverse Proxy with HTTPS

If you want to use HTTPS for the webhook (recommended):

```nginx
# /etc/nginx/sites-available/webhook.lottodrop.net
server {
    listen 443 ssl http2;
    server_name webhook.lottodrop.net;

    ssl_certificate /etc/letsencrypt/live/webhook.lottodrop.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/webhook.lottodrop.net/privkey.pem;

    location /webhook {
        proxy_pass http://127.0.0.1:9001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # GitHub webhooks timeout
        proxy_read_timeout 300s;
    }

    location /health {
        proxy_pass http://127.0.0.1:9001;
    }
}
```

Then update GitHub webhook URL to: `https://webhook.lottodrop.net/webhook`

---

## Troubleshooting

### Check service status
```bash
sudo systemctl status lottodrop-webhook
```

### View webhook logs
```bash
sudo journalctl -u lottodrop-webhook -n 100
# or
tail -f /var/log/lottodrop-webhook.log
```

### View deploy logs
```bash
tail -f /var/log/lottodrop-deploy.log
```

### Test webhook manually
```bash
curl -X POST http://localhost:9001/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d '{"ref":"refs/heads/main","commits":[]}'
```

### Restart webhook service
```bash
sudo systemctl restart lottodrop-webhook
```

### Check if port is listening
```bash
netstat -tlnp | grep 9001
# or
ss -tlnp | grep 9001
```

---

## Security Checklist

- [x] Webhook secret configured and stored securely
- [x] Service runs as non-root user (deploy)
- [x] Systemd security hardening enabled
- [x] Firewall allows only necessary port
- [x] SSH key has minimal permissions (deploy key, not personal key)
- [ ] Consider using HTTPS via nginx reverse proxy
- [ ] Consider IP allowlist for GitHub webhook IPs

### GitHub Webhook IPs (for firewall allowlist)
See: https://api.github.com/meta (hooks key)

---

## Files Reference

| File | Location | Purpose |
|------|----------|---------|
| deploy-lottodrop.sh | /usr/local/bin/ | Main deploy script |
| index.js | /opt/lottodrop-webhook/ | Webhook listener |
| webhook.env | /etc/lottodrop/ | Environment variables |
| lottodrop-webhook.service | /etc/systemd/system/ | Systemd service |
| lottodrop-deploy.log | /var/log/ | Deploy logs |
| lottodrop-webhook.log | /var/log/ | Webhook logs |

---

## Quick Commands Reference

```bash
# Start/stop webhook service
sudo systemctl start lottodrop-webhook
sudo systemctl stop lottodrop-webhook
sudo systemctl restart lottodrop-webhook

# View logs
sudo journalctl -u lottodrop-webhook -f
tail -f /var/log/lottodrop-deploy.log

# Manual deploy
sudo -u deploy /usr/local/bin/deploy-lottodrop.sh

# Check health
curl http://localhost:9001/health
```
